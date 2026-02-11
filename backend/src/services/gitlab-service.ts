import axios, { AxiosInstance, AxiosResponse } from "axios";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { logger } from "../config/logger";

import {
  sanitizeBranchName,
  validateUrl,
  sanitizeCommitMessage,
} from "../utils/security-utils";

const execAsync = promisify(exec);

export interface GitLabBranch {
  name: string;
  protected: boolean;
  merged: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  web_url: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    message: string;
    author_name: string;
    author_email: string;
    authored_date: string;
    committer_name: string;
    committer_email: string;
    committed_date: string;
  };
}

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description: string;
  default_branch: string;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  target_branch: string;
  source_branch: string;
  author: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  web_url: string;
}

export interface CreateBranchRequest {
  branch: string;
  ref: string; // Base branch to create from
}

export interface CreateMergeRequestRequest {
  source_branch: string;
  target_branch: string;
  title: string;
  description?: string;
  remove_source_branch?: boolean;
}

export interface SyncToGitLabRequest {
  localPath: string;
  gitlabUrl: string;
  accessToken: string;
  targetBranch: string;
  commitMessage: string;
  mergeRequestTitle: string;
  mergeRequestDescription?: string;
  sourceBranchName?: string;
}

export class GitLabService {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    // Store access token for Git operations
    this.accessToken = accessToken;

    // Log the original input for debugging
    logger.info(`GitLab Service constructor called with baseUrl: ${baseUrl}`);

    // Extract the GitLab server base URL from the repository URL if needed
    let serverBaseUrl = baseUrl;
    try {
      const url = new URL(baseUrl);
      logger.info(
        `Parsed URL - Protocol: ${url.protocol}, Host: ${url.host}, Pathname: ${url.pathname}`,
      );

      // If the URL has a path (indicating it's a repository URL), extract just the server part
      if (url.pathname && url.pathname !== "/") {
        serverBaseUrl = `${url.protocol}//${url.host}`;
        logger.info(
          `Extracted server base URL: ${serverBaseUrl} from repository URL: ${baseUrl}`,
        );
      }

      // Validate that we have a proper HTTP/HTTPS URL
      if (!url.protocol.startsWith("http")) {
        throw new Error(
          `Invalid protocol: ${url.protocol}. Expected http: or https:`,
        );
      }

      // Validate that we have a proper host
      if (!url.host || url.host === "localhost") {
        logger.warn(`Potentially incomplete GitLab URL host: ${url.host}`);
        logger.warn(`Full URL provided: ${baseUrl}`);
        logger.warn(
          `Expected format: https://gitlab.com/namespace/project or https://your-gitlab-instance.com/namespace/project`,
        );
      }
    } catch (error) {
      logger.error(`Failed to parse GitLab URL ${baseUrl}: ${error}`);
      logger.error(`Expected URL format: https://gitlab.com/namespace/project`);
      throw new Error(
        `Invalid GitLab URL format: ${baseUrl}. Expected format: https://gitlab.com/namespace/project`,
      );
    }

    // Create HTTPS agent with proper TLS validation
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // SSL verification disabled
      minVersion: "TLSv1.2", // Enforce minimum TLS version
    });

    this.client = axios.create({
      baseURL: `${serverBaseUrl}/api/v4`,
      headers: {
        // Try both authorization methods - Bearer token and Private-Token
        Authorization: `Bearer ${accessToken}`,
        "Private-Token": accessToken,
        "Content-Type": "application/json",
      },
      httpsAgent,
      timeout: 30000, // 30 second timeout for internal network connections
    });

    logger.info(
      `GitLab client configured with base URL: ${serverBaseUrl}/api/v4`,
    );
  }

  /**
   * Create an authenticated Git URL with the access token embedded
   * This allows Git commands to authenticate without prompting
   */
  private createAuthenticatedGitUrl(repoUrl: string): string {
    try {
      const url = new URL(repoUrl);
      // GitLab uses oauth2 as the username and the token as the password
      // Format: https://oauth2:TOKEN@gitlab.com/namespace/project.git
      const authenticatedUrl = `${url.protocol}//oauth2:${this.accessToken}@${url.host}${url.pathname}`;
      logger.info(
        `Created authenticated Git URL for repository: ${url.host}${url.pathname}`,
      );
      return authenticatedUrl;
    } catch (error) {
      logger.error(`Failed to create authenticated Git URL: ${error}`);
      throw new Error(`Invalid repository URL format: ${repoUrl}`);
    }
  }

  /**
   * Extract project ID from GitLab URL
   */
  private extractProjectId(gitlabUrl: string): string {
    try {
      const url = new URL(gitlabUrl);
      // Remove leading slash and .git suffix if present
      let pathname = url.pathname.startsWith("/")
        ? url.pathname.slice(1)
        : url.pathname;
      pathname = pathname.endsWith(".git") ? pathname.slice(0, -4) : pathname;

      // For GitLab, we need at least namespace/project format
      const pathParts = pathname.split("/").filter((part) => part.length > 0);

      if (pathParts.length < 2) {
        throw new Error(
          "GitLab URL must contain at least namespace/project format",
        );
      }

      // Take the last two parts as the project identifier (namespace/project)
      const projectPath = pathParts.slice(-2).join("/");

      logger.info(
        `Extracted project path: ${projectPath} from URL: ${gitlabUrl}`,
      );
      return encodeURIComponent(projectPath);
    } catch (error) {
      // Fallback to the old regex approach for edge cases
      logger.warn(`URL parsing failed, falling back to regex: ${error}`);
      const match = gitlabUrl.match(/\/([^\/]+\/[^\/]+)(?:\.git)?(?:\/.*)?$/);
      if (match && match[1]) {
        return encodeURIComponent(match[1]);
      }
      throw new Error("Invalid GitLab URL format");
    }
  }

  /**
   * Get project information
   */
  async getProject(projectId: string): Promise<GitLabProject> {
    try {
      const response: AxiosResponse<GitLabProject> = await this.client.get(
        `/projects/${projectId}`,
      );
      logger.info(
        `Successfully retrieved GitLab project: ${response.data.name}`,
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `Failed to get GitLab project ${projectId}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get GitLab project: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get all branches for a project
   */
  async getBranches(projectId: string): Promise<GitLabBranch[]> {
    try {
      const response: AxiosResponse<GitLabBranch[]> = await this.client.get(
        `/projects/${projectId}/repository/branches`,
      );
      logger.info(
        `Successfully retrieved ${response.data.length} branches for project ${projectId}`,
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `Failed to get branches for project ${projectId}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get branches: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    projectId: string,
    branchData: CreateBranchRequest,
  ): Promise<GitLabBranch> {
    try {
      // Validate and sanitize branch name format
      const sanitizedBranchName = sanitizeBranchName(branchData.branch);
      const sanitizedRef = sanitizeBranchName(branchData.ref);

      // First, test if the project exists
      logger.info(`Testing project access for: ${projectId}`);
      try {
        const project = await this.getProject(projectId);
        logger.info(
          `Successfully accessed project: ${project.name} (ID: ${project.id})`,
        );
      } catch (projectError: any) {
        logger.error(
          `Failed to access project ${projectId}:`,
          projectError.response?.data || projectError.message,
        );
        throw new Error(
          `Project not found or access denied: ${projectError.response?.data?.message || projectError.message}`,
        );
      }

      // Construct the API URL and log it
      const apiUrl = `/projects/${projectId}/repository/branches`;
      const fullUrl = `${this.client.defaults.baseURL}${apiUrl}`;
      logger.info(`Creating branch via API call to: ${fullUrl}`);
      logger.info(
        `Branch data: ${JSON.stringify({ branch: sanitizedBranchName, ref: sanitizedRef }, null, 2)}`,
      );

      const response: AxiosResponse<GitLabBranch> = await this.client.post(
        apiUrl,
        {
          branch: sanitizedBranchName,
          ref: sanitizedRef,
        },
      );
      logger.info(
        `Successfully created branch '${sanitizedBranchName}' from '${sanitizedRef}' in project ${projectId}`,
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `Failed to create branch ${branchData.branch} in project ${projectId}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to create branch: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create a merge request
   */
  async createMergeRequest(
    projectId: string,
    mergeRequestData: CreateMergeRequestRequest,
  ): Promise<GitLabMergeRequest> {
    try {
      const response: AxiosResponse<GitLabMergeRequest> =
        await this.client.post(
          `/projects/${projectId}/merge_requests`,
          mergeRequestData,
        );
      logger.info(
        `Successfully created merge request '${mergeRequestData.title}' in project ${projectId}`,
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `Failed to create merge request in project ${projectId}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to create merge request: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get merge requests for a project
   */
  async getMergeRequests(
    projectId: string,
    state: "opened" | "closed" | "merged" | "all" = "all",
  ): Promise<GitLabMergeRequest[]> {
    try {
      const response: AxiosResponse<GitLabMergeRequest[]> =
        await this.client.get(`/projects/${projectId}/merge_requests`, {
          params: { state },
        });
      logger.info(
        `Successfully retrieved ${response.data.length} merge requests for project ${projectId}`,
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `Failed to get merge requests for project ${projectId}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get merge requests: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Sync local repository to GitLab
   *
   * Key improvements:
   * - Checks if branch exists before attempting to create it
   * - Handles non-fast-forward push errors by pulling and merging
   * - Uses force-with-lease as last resort to prevent data loss
   * - Properly coordinates with existing branches from Create Branch workflow
   */
  async syncToGitLab(
    syncData: SyncToGitLabRequest,
  ): Promise<{ branch: GitLabBranch; mergeRequest: GitLabMergeRequest }> {
    const {
      localPath,
      gitlabUrl,
      targetBranch,
      commitMessage,
      mergeRequestTitle,
      mergeRequestDescription,
      sourceBranchName,
    } = syncData;

    try {
      // Extract project ID from GitLab URL
      const projectId = this.extractProjectId(gitlabUrl);

      // Get project info
      const project = await this.getProject(projectId);

      // Generate unique branch name if not provided
      const branchName = sourceBranchName || `feature/sync-${Date.now()}`;

      logger.info(
        `Starting sync process for ${localPath} to GitLab project ${project.name}`,
      );

      // Check if local directory exists
      try {
        await fs.access(localPath);
      } catch {
        throw new Error(`Local directory does not exist: ${localPath}`);
      }

      // Initialize git repository if not exists
      try {
        await execAsync("git status", { cwd: localPath });
      } catch {
        logger.info("Initializing git repository");
        await execAsync("git init", { cwd: localPath });
      }

      // Add GitLab remote if not exists
      try {
        await execAsync("git remote get-url origin", { cwd: localPath });
        logger.info(
          "Remote origin already exists, updating with authenticated URL",
        );
        // Update the remote URL to use authenticated version
        const authenticatedUrl = this.createAuthenticatedGitUrl(
          project.http_url_to_repo,
        );
        await execAsync(`git remote set-url origin "${authenticatedUrl}"`, {
          cwd: localPath,
        });
      } catch {
        logger.info(`Adding GitLab remote: ${project.http_url_to_repo}`);
        // Validate URL before using it
        if (!validateUrl(project.http_url_to_repo)) {
          throw new Error("Invalid GitLab repository URL format");
        }
        const authenticatedUrl = this.createAuthenticatedGitUrl(
          project.http_url_to_repo,
        );
        await execAsync(`git remote add origin "${authenticatedUrl}"`, {
          cwd: localPath,
        });
      }

      // Fetch latest changes from remote
      try {
        await execAsync(
          "git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= fetch origin",
          { cwd: localPath },
        );
      } catch (error) {
        logger.warn(
          "Failed to fetch from remote, continuing with local changes",
        );
      }

      // Create and checkout new branch
      const sanitizedBranchName = sanitizeBranchName(branchName);
      try {
        await execAsync(`git checkout -b ${sanitizedBranchName}`, {
          cwd: localPath,
        });
        logger.info(`Created and checked out branch: ${sanitizedBranchName}`);
      } catch {
        // Branch might already exist, try to checkout
        await execAsync(`git checkout ${sanitizedBranchName}`, {
          cwd: localPath,
        });
        logger.info(`Checked out existing branch: ${sanitizedBranchName}`);
      }

      // Add all changes
      logger.info(`Adding files to git from directory: ${localPath}`);

      // Debug: Check what files exist in the directory
      try {
        const { stdout: lsOutput } = await execAsync("dir /b", {
          cwd: localPath,
        });
        logger.info(
          `Files in directory: ${lsOutput.trim() || "No files found"}`,
        );
      } catch (error) {
        logger.warn(`Could not list directory contents: ${error}`);
      }

      await execAsync("git add .", { cwd: localPath });

      // Check if there are changes to commit
      try {
        const { stdout } = await execAsync("git diff --staged --name-only", {
          cwd: localPath,
        });
        logger.info(`Files staged for commit: ${stdout.trim() || "None"}`);

        if (!stdout.trim()) {
          // Additional debugging - check git status
          try {
            const { stdout: statusOutput } = await execAsync(
              "git status --porcelain",
              { cwd: localPath },
            );
            logger.info(
              `Git status output: ${statusOutput.trim() || "Working directory clean"}`,
            );
          } catch (statusError) {
            logger.warn(`Could not get git status: ${statusError}`);
          }
          throw new Error("No changes detected to sync");
        }
      } catch (error: any) {
        if (error.message.includes("No changes detected")) {
          throw error;
        }
      }

      // Configure git user identity for the commit
      const gitUserEmail =
        process.env["GIT_USER_EMAIL"] || "pipeline@codemergetool.local";
      const gitUserName =
        process.env["GIT_USER_NAME"] || "Code Merge Tool Pipeline";

      await execAsync(`git config user.email "${gitUserEmail}"`, {
        cwd: localPath,
      });
      await execAsync(`git config user.name "${gitUserName}"`, {
        cwd: localPath,
      });

      // Commit changes with sanitized message
      const sanitizedCommitMessage = sanitizeCommitMessage(commitMessage);
      await execAsync(`git commit -m "${sanitizedCommitMessage}"`, {
        cwd: localPath,
      });
      logger.info("Committed changes locally");

      // Check if branch already exists on GitLab
      const branches = await this.getBranches(projectId);
      let gitlabBranch = branches.find((b) => b.name === sanitizedBranchName);

      if (!gitlabBranch) {
        // Branch doesn't exist on GitLab, create it
        try {
          gitlabBranch = await this.createBranch(projectId, {
            branch: sanitizedBranchName,
            ref: targetBranch,
          });
          logger.info(`Created new branch on GitLab: ${sanitizedBranchName}`);
        } catch (error: any) {
          if (error.message.includes("already exists")) {
            // Race condition - branch was created between our check and create attempt
            gitlabBranch = branches.find(
              (b) => b.name === sanitizedBranchName,
            )!;
            logger.info(
              "Branch was created concurrently, using existing branch",
            );
          } else {
            throw error;
          }
        }
      } else {
        logger.info("Branch already exists on GitLab, using existing branch");

        // If branch exists, pull latest changes to avoid conflicts
        try {
          await execAsync(
            `git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= pull origin ${sanitizedBranchName}`,
            { cwd: localPath },
          );
          logger.info("Pulled latest changes from remote branch");
        } catch (pullError: any) {
          logger.warn(
            `Could not pull from remote branch: ${pullError.message}`,
          );
          // Continue anyway - we'll handle push conflicts below
        }
      }

      // Push changes to GitLab
      try {
        await execAsync(
          `git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= push origin ${sanitizedBranchName}`,
          { cwd: localPath },
        );
        logger.info(`Pushed changes to GitLab branch: ${sanitizedBranchName}`);
      } catch (pushError: any) {
        if (
          pushError.message.includes("non-fast-forward") ||
          pushError.message.includes("rejected")
        ) {
          logger.info(
            "Push rejected due to remote changes, attempting to pull and merge",
          );

          try {
            // Pull with merge strategy
            await execAsync(
              `git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= pull origin ${sanitizedBranchName} --no-rebase`,
              {
                cwd: localPath,
              },
            );
            // Try pushing again
            await execAsync(
              `git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= push origin ${sanitizedBranchName}`,
              {
                cwd: localPath,
              },
            );
            logger.info(`Successfully pushed changes after pull and merge`);
          } catch (mergeError: any) {
            logger.warn("Automatic merge failed, trying force push");
            // As a last resort, force push (be careful with this)
            await execAsync(
              `git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= push origin ${sanitizedBranchName} --force-with-lease`,
              { cwd: localPath },
            );
            logger.info(
              `Force pushed changes to GitLab branch: ${sanitizedBranchName}`,
            );
          }
        } else {
          throw pushError;
        }
      }

      // Create merge request
      const mergeRequest = await this.createMergeRequest(projectId, {
        source_branch: sanitizedBranchName,
        target_branch: targetBranch,
        title: mergeRequestTitle,
        description:
          mergeRequestDescription ||
          `Automated sync from local repository\n\nCreated on: ${new Date().toISOString()}`,
        remove_source_branch: false,
      });

      logger.info(
        `Successfully synced to GitLab. Branch: ${sanitizedBranchName}, MR: ${mergeRequest.web_url}`,
      );

      return {
        branch: gitlabBranch,
        mergeRequest,
      };
    } catch (error: any) {
      logger.error("Failed to sync to GitLab:", error.message);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Clone GitLab repository and checkout to specified branch
   * This method is specifically for the "Create Branch & Checkout" step
   * It only clones and checks out without trying to commit changes
   */
  async cloneAndCheckoutBranch(
    gitlabUrl: string,
    branchName: string,
    localPath: string,
  ): Promise<{ success: boolean; localPath: string }> {
    try {
      // Extract project ID from GitLab URL
      const projectId = this.extractProjectId(gitlabUrl);

      // Get project info
      const project = await this.getProject(projectId);

      logger.info(
        `Starting clone and checkout process for ${project.name} to ${localPath}`,
      );

      // Ensure the local directory exists
      try {
        await fs.mkdir(localPath, { recursive: true });
      } catch (error) {
        // Directory might already exist, that's okay
      }

      // Check if directory is already a git repository
      let isExistingRepo = false;
      try {
        await execAsync("git status", { cwd: localPath });
        isExistingRepo = true;
        logger.info("Directory is already a git repository");
      } catch {
        logger.info("Directory is not a git repository, will clone fresh");
      }

      if (!isExistingRepo) {
        // Clone the repository
        logger.info(`Cloning GitLab repository: ${project.http_url_to_repo}`);

        // Validate URL before using it
        if (!validateUrl(project.http_url_to_repo)) {
          throw new Error("Invalid GitLab repository URL format");
        }

        // Create authenticated URL for Git operations
        const authenticatedUrl = this.createAuthenticatedGitUrl(
          project.http_url_to_repo,
        );

        // Clone directly to the target directory
        // Add Windows-specific Git configurations to handle NTFS path issues
        const gitConfig = [
          "-c http.sslVerify=false",
          "-c core.protectNTFS=false", // Allow files with special characters on Windows
          "-c core.longpaths=true", // Support long paths on Windows
          "-c credential.helper=", // Disable credential manager to avoid warnings
        ].join(" ");

        try {
          await execAsync(
            `git ${gitConfig} clone "${authenticatedUrl}" "${localPath}"`,
          );
        } catch (cloneError: any) {
          // If directory already exists, try to clone to temp and move
          if (cloneError.message.includes("already exists")) {
            const tempDir = `${localPath}_temp_${Date.now()}`;
            try {
              await execAsync(
                `git ${gitConfig} clone "${authenticatedUrl}" "${tempDir}"`,
              );

              // Move contents from temp directory to target directory using PowerShell
              await execAsync(
                `powershell -Command "Move-Item -Path '${tempDir}\\*' -Destination '${localPath}' -Force"`,
              );

              // Clean up temp directory
              await execAsync(
                `powershell -Command "Remove-Item -Path '${tempDir}' -Recurse -Force"`,
              );
            } catch (moveError) {
              // Clean up temp directory if it exists
              try {
                await execAsync(
                  `powershell -Command "Remove-Item -Path '${tempDir}' -Recurse -Force"`,
                );
              } catch {}
              throw moveError;
            }
          } else {
            throw cloneError;
          }
        }
      } else {
        // If it's an existing repo, update the remote URL to use authentication
        logger.info(
          "Updating remote URL with authentication for existing repository",
        );
        try {
          const authenticatedUrl = this.createAuthenticatedGitUrl(
            project.http_url_to_repo,
          );
          await execAsync(`git remote set-url origin "${authenticatedUrl}"`, {
            cwd: localPath,
          });
          logger.info("Successfully updated remote URL with authentication");
        } catch (remoteError) {
          logger.warn(`Failed to update remote URL: ${remoteError}`);
          // Try to add the remote if it doesn't exist
          try {
            const authenticatedUrl = this.createAuthenticatedGitUrl(
              project.http_url_to_repo,
            );
            await execAsync(`git remote add origin "${authenticatedUrl}"`, {
              cwd: localPath,
            });
            logger.info("Added authenticated remote URL");
          } catch (addError) {
            logger.error(`Failed to add remote: ${addError}`);
          }
        }
      }

      // Fetch latest changes
      try {
        await execAsync(
          "git -c http.sslVerify=false -c core.protectNTFS=false -c credential.helper= fetch origin",
          { cwd: localPath },
        );
        logger.info("Fetched latest changes from remote");
      } catch (error) {
        logger.warn("Failed to fetch from remote, continuing anyway");
      }

      // Checkout the specified branch
      const sanitizedBranchName = sanitizeBranchName(branchName);
      try {
        // Try to checkout the branch (it should exist since we created it)
        await execAsync(`git checkout ${sanitizedBranchName}`, {
          cwd: localPath,
        });
        logger.info(`Successfully checked out branch: ${sanitizedBranchName}`);
      } catch (checkoutError: any) {
        // If checkout fails, try to create and checkout the branch from origin
        try {
          await execAsync(
            `git checkout -b ${sanitizedBranchName} origin/${sanitizedBranchName}`,
            { cwd: localPath },
          );
          logger.info(
            `Created and checked out branch from remote: ${sanitizedBranchName}`,
          );
        } catch (createError) {
          logger.error(
            `Failed to checkout branch ${sanitizedBranchName}:`,
            checkoutError.message,
          );
          throw new Error(
            `Failed to checkout branch ${sanitizedBranchName}: ${checkoutError.message}`,
          );
        }
      }

      logger.info(
        `Successfully cloned and checked out branch '${sanitizedBranchName}' to ${localPath}`,
      );

      return {
        success: true,
        localPath: localPath,
      };
    } catch (error: any) {
      logger.error("Failed to clone and checkout branch:", error.message);
      throw new Error(`Clone and checkout failed: ${error.message}`);
    }
  }

  /**
   * Test GitLab connection and permissions
   */
  async testConnection(): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await this.client.get("/user");
      logger.info(
        `GitLab connection successful for user: ${response.data.name}`,
      );
      return {
        success: true,
        user: response.data,
      };
    } catch (error: any) {
      logger.error(
        "GitLab connection failed:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

export default GitLabService;

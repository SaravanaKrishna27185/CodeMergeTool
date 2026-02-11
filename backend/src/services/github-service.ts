import axios, { AxiosInstance } from "axios";
import { logger } from "../config/logger";
import { AppError, ErrorType } from "../middleware/error-handler";

/**
 * GitHub Integration Service
 * Handles GitHub API interactions, OAuth, and repository management
 */

// Types and Interfaces
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  language: string | null;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed" | "merged";
  html_url: string;
  mergeable?: boolean | null;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
    repo: {
      full_name: string;
    };
  };
  base: {
    ref: string;
    sha: string;
    repo: {
      full_name: string;
    };
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface CreatePullRequestData {
  title: string;
  body?: string;
  head: string;
  base: string;
  maintainer_can_modify?: boolean;
  draft?: boolean;
}

export interface MergePullRequestData {
  commit_title?: string;
  commit_message?: string;
  merge_method?: "merge" | "squash" | "rebase";
}

export class GitHubService {
  private client: AxiosInstance;
  private baseURL = "https://api.github.com";

  constructor(accessToken?: string) {
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CodeMergeTool/1.0.0",
        ...(accessToken && { Authorization: `token ${accessToken}` }),
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug("GitHub API Request", {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error("GitHub API Request Error", this.safeErrorInfo(error));
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug("GitHub API Response", {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error("GitHub API Response Error", {
          status: error.response?.status,
          message: error.response?.data?.message,
          url: error.config?.url,
        });

        // Transform GitHub API errors to our AppError format
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || "GitHub API error";

        if (status === 401) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            "GitHub authentication failed",
            401,
            error
          );
        } else if (status === 403) {
          throw new AppError(
            ErrorType.AUTHORIZATION_ERROR,
            "GitHub API rate limit exceeded or insufficient permissions",
            403,
            error
          );
        } else if (status === 404) {
          throw new AppError(
            ErrorType.NOT_FOUND_ERROR,
            `GitHub resource not found: ${message}`,
            404,
            error
          );
        }

        throw new AppError(
          ErrorType.INTEGRATION_ERROR,
          `GitHub API error: ${message}`,
          status,
          error
        );
      }
    );
  }

  /**
   * Safely extract error information to avoid circular references
   */
  private safeErrorInfo(error: any): any {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }
    return { message: String(error) };
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    try {
      const response = await this.client.get<GitHubUser>("/user");
      return response.data;
    } catch (error) {
      logger.error(
        "Failed to get authenticated user",
        this.safeErrorInfo(error)
      );
      throw error;
    }
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(
    username?: string,
    options: {
      type?: "all" | "owner" | "public" | "private" | "member";
      sort?: "created" | "updated" | "pushed" | "full_name";
      direction?: "asc" | "desc";
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubRepository[]> {
    try {
      const {
        type = "owner",
        sort = "updated",
        direction = "desc",
        per_page = 30,
        page = 1,
      } = options;

      const endpoint = username ? `/users/${username}/repos` : "/user/repos";

      const response = await this.client.get<GitHubRepository[]>(endpoint, {
        params: {
          type,
          sort,
          direction,
          per_page,
          page,
        },
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to get user repositories", error);
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.client.get<GitHubRepository>(
        `/repos/${owner}/${repo}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get repository ${owner}/${repo}`, error);
      throw error;
    }
  }

  /**
   * Get repository branches
   */
  async getRepositoryBranches(
    owner: string,
    repo: string,
    options: {
      protected?: boolean;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubBranch[]> {
    try {
      const { per_page = 30, page = 1 } = options;

      const response = await this.client.get<GitHubBranch[]>(
        `/repos/${owner}/${repo}/branches`,
        {
          params: {
            per_page,
            page,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get repository branches ${owner}/${repo}`, error);
      throw error;
    }
  }

  /**
   * Get repository pull requests
   */
  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: "open" | "closed" | "all";
      head?: string;
      base?: string;
      sort?: "created" | "updated" | "popularity" | "long-running";
      direction?: "asc" | "desc";
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubPullRequest[]> {
    try {
      const {
        state = "open",
        sort = "created",
        direction = "desc",
        per_page = 30,
        page = 1,
      } = options;

      const response = await this.client.get<GitHubPullRequest[]>(
        `/repos/${owner}/${repo}/pulls`,
        {
          params: {
            state,
            head: options.head,
            base: options.base,
            sort,
            direction,
            per_page,
            page,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(
        `Failed to get repository pull requests ${owner}/${repo}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get a specific pull request
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pull_number: number
  ): Promise<GitHubPullRequest> {
    try {
      const response = await this.client.get<GitHubPullRequest>(
        `/repos/${owner}/${repo}/pulls/${pull_number}`
      );
      return response.data;
    } catch (error) {
      logger.error(
        `Failed to get pull request ${owner}/${repo}#${pull_number}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    data: CreatePullRequestData
  ): Promise<GitHubPullRequest> {
    try {
      const response = await this.client.post<GitHubPullRequest>(
        `/repos/${owner}/${repo}/pulls`,
        data
      );

      logger.info(
        `Created pull request ${owner}/${repo}#${response.data.number}`,
        {
          title: data.title,
          head: data.head,
          base: data.base,
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to create pull request ${owner}/${repo}`, error);
      throw error;
    }
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pull_number: number,
    data: MergePullRequestData = {}
  ): Promise<{ sha: string; merged: boolean; message: string }> {
    try {
      const { merge_method = "merge" } = data;

      const response = await this.client.put(
        `/repos/${owner}/${repo}/pulls/${pull_number}/merge`,
        {
          commit_title: data.commit_title,
          commit_message: data.commit_message,
          merge_method,
        }
      );

      logger.info(`Merged pull request ${owner}/${repo}#${pull_number}`, {
        method: merge_method,
        sha: response.data.sha,
      });

      return response.data;
    } catch (error) {
      logger.error(
        `Failed to merge pull request ${owner}/${repo}#${pull_number}`,
        error
      );
      throw error;
    }
  }

  /**
   * Close a pull request
   */
  async closePullRequest(
    owner: string,
    repo: string,
    pull_number: number
  ): Promise<GitHubPullRequest> {
    try {
      const response = await this.client.patch<GitHubPullRequest>(
        `/repos/${owner}/${repo}/pulls/${pull_number}`,
        {
          state: "closed",
        }
      );

      logger.info(`Closed pull request ${owner}/${repo}#${pull_number}`);

      return response.data;
    } catch (error) {
      logger.error(
        `Failed to close pull request ${owner}/${repo}#${pull_number}`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if a pull request can be merged
   */
  async checkPullRequestMergeable(
    owner: string,
    repo: string,
    pull_number: number
  ): Promise<boolean> {
    try {
      const pullRequest = await this.getPullRequest(owner, repo, pull_number);

      // GitHub might return null for mergeable if it's still being calculated
      // In that case, we should wait and try again
      if (pullRequest.mergeable === null) {
        // Wait a bit and try again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const retryPullRequest = await this.getPullRequest(
          owner,
          repo,
          pull_number
        );
        return retryPullRequest.mergeable || false;
      }

      return pullRequest.mergeable || false;
    } catch (error) {
      logger.error(
        `Failed to check if pull request is mergeable ${owner}/${repo}#${pull_number}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scopes: string[] = ["repo", "user:email"],
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      ...(state && { state }),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (response.data.error) {
        throw new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          `GitHub OAuth error: ${response.data.error_description || response.data.error}`,
          400
        );
      }

      return response.data;
    } catch (error) {
      logger.error("Failed to exchange code for token", error);
      throw error;
    }
  }

  /**
   * Validate repository access with PAT
   */
  async validateRepository(
    repositoryUrl: string,
    personalAccessToken: string
  ): Promise<boolean> {
    try {
      // Extract owner and repo from URL
      const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

      // Create a temporary client with the provided PAT
      const tempClient = axios.create({
        baseURL: this.baseURL,
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${personalAccessToken}`,
          "User-Agent": "CodeMergeTool/1.0.0",
        },
        timeout: 30000,
      });

      // Try to access the repository
      const response = await tempClient.get(`/repos/${owner}/${repo}`);
      return response.status === 200;
    } catch (error) {
      logger.error(
        `Failed to validate repository access: ${repositoryUrl}`,
        error
      );
      return false;
    }
  }

  /**
   * Clone repository using URL and PAT, optionally checkout specific commit
   */
  async cloneRepository(
    repositoryUrl: string,
    personalAccessToken: string,
    customDownloadLocation?: string,
    targetCommitId?: string
  ): Promise<{
    success: boolean;
    localPath: string;
    repositoryInfo: any;
    checkedOutCommit?: string;
  }> {
    try {
      // First validate access
      const isValid = await this.validateRepository(
        repositoryUrl,
        personalAccessToken
      );
      if (!isValid) {
        throw new AppError(
          ErrorType.AUTHORIZATION_ERROR,
          "Invalid repository URL or insufficient permissions with provided PAT",
          403
        );
      }

      // Extract owner and repo from URL
      const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);

      // Get repository information
      const tempClient = axios.create({
        baseURL: this.baseURL,
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${personalAccessToken}`,
          "User-Agent": "CodeMergeTool/1.0.0",
        },
        timeout: 30000,
      });

      const repoResponse = await tempClient.get(`/repos/${owner}/${repo}`);
      const repositoryInfo = repoResponse.data;

      // Clone repository using git command
      const path = require("path");
      const fs = require("fs").promises;
      const { execSync } = require("child_process");

      // Determine the base directory for repositories
      let repositoriesDir;
      if (customDownloadLocation) {
        // Use the custom download location
        repositoriesDir = customDownloadLocation;
        console.log("Using custom download location:", repositoriesDir);
      } else {
        // Use default repositories directory
        repositoriesDir = path.join(process.cwd(), "repositories");
        console.log("Using default repositories directory:", repositoriesDir);
      }

      // Ensure target directory exists
      await fs.mkdir(repositoriesDir, { recursive: true });

      // Create local path for the repository
      const localPath = path.join(repositoriesDir, `${owner}-${repo}`);
      console.log("Final local path for repository:", localPath);

      // Check if directory exists and is already a git repository
      let isExistingRepo = false;
      try {
        const stats = await fs.stat(localPath);
        if (stats.isDirectory()) {
          // Check if it's a git repository
          try {
            const gitDir = path.join(localPath, ".git");
            const gitStats = await fs.stat(gitDir);
            if (gitStats.isDirectory()) {
              isExistingRepo = true;
              console.log(`✅ Found existing git repository at: ${localPath}`);
            }
          } catch (gitError) {
            console.log(
              `Directory exists but is not a git repository: ${localPath}`
            );
            // Remove non-git directory and proceed with clone
            await fs.rm(localPath, { recursive: true, force: true });
            console.log("Removed non-git directory, will clone fresh");
          }
        }
      } catch (error: any) {
        if (error.code === "ENOENT") {
          console.log("Directory doesn't exist, proceeding with clone");
        } else {
          console.log("Error checking directory:", error.message);
        }
      }

      // Construct the authenticated clone URL with PAT
      const authenticatedUrl = `https://${personalAccessToken}@github.com/${owner}/${repo}.git`;

      let checkedOutCommit: string | undefined;

      try {
        if (isExistingRepo) {
          // Repository already exists, update and optionally checkout specific commit
          console.log("🔄 Updating existing repository...");

          // First, fetch the latest changes
          execSync(`git fetch origin`, {
            cwd: localPath,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          console.log("✅ Fetched latest changes from remote");

          if (targetCommitId) {
            // Checkout specific commit
            console.log(`🎯 Checking out specific commit: ${targetCommitId}`);
            try {
              // Validate commit exists
              execSync(`git cat-file -t ${targetCommitId}`, {
                cwd: localPath,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              });

              // Checkout the specific commit
              execSync(`git checkout ${targetCommitId}`, {
                cwd: localPath,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              });

              checkedOutCommit = targetCommitId;
              console.log(
                `✅ Successfully checked out commit: ${targetCommitId}`
              );
            } catch (commitError: any) {
              console.error(
                `Failed to checkout commit ${targetCommitId}:`,
                commitError.stderr || commitError.message
              );
              throw new AppError(
                ErrorType.VALIDATION_ERROR,
                `Invalid commit ID or commit not found: ${targetCommitId}`,
                400
              );
            }
          } else {
            // Pull the default branch
            execSync(`git pull origin ${repositoryInfo.default_branch}`, {
              cwd: localPath,
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
            });
            console.log("✅ Successfully pulled latest changes");
          }

          logger.info(
            `Repository updated successfully: ${repositoryUrl} -> ${localPath}${targetCommitId ? ` @ ${targetCommitId}` : ""}`
          );
        } else {
          // Execute git clone command synchronously with better error handling
          console.log("📥 Cloning repository for the first time...");
          execSync(`git clone "${authenticatedUrl}" "${localPath}"`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          console.log("✅ Repository cloned successfully");

          if (targetCommitId) {
            // Checkout specific commit after cloning
            console.log(`🎯 Checking out specific commit: ${targetCommitId}`);
            try {
              // Validate commit exists
              execSync(`git cat-file -t ${targetCommitId}`, {
                cwd: localPath,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              });

              // Checkout the specific commit
              execSync(`git checkout ${targetCommitId}`, {
                cwd: localPath,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              });

              checkedOutCommit = targetCommitId;
              console.log(
                `✅ Successfully checked out commit: ${targetCommitId}`
              );
            } catch (commitError: any) {
              console.error(
                `Failed to checkout commit ${targetCommitId}:`,
                commitError.stderr || commitError.message
              );
              throw new AppError(
                ErrorType.VALIDATION_ERROR,
                `Invalid commit ID or commit not found: ${targetCommitId}`,
                400
              );
            }
          }

          logger.info(
            `Repository cloned successfully: ${repositoryUrl} -> ${localPath}${targetCommitId ? ` @ ${targetCommitId}` : ""}`
          );
        }

        const result: {
          success: boolean;
          localPath: string;
          repositoryInfo: any;
          checkedOutCommit?: string;
        } = {
          success: true,
          localPath,
          repositoryInfo: {
            name: repositoryInfo.name,
            fullName: repositoryInfo.full_name,
            description: repositoryInfo.description,
            defaultBranch: repositoryInfo.default_branch,
            cloneUrl: repositoryInfo.clone_url,
            htmlUrl: repositoryInfo.html_url,
          },
        };

        if (checkedOutCommit) {
          result.checkedOutCommit = checkedOutCommit;
        }

        return result;
      } catch (cloneError: any) {
        const errorMessage =
          cloneError.stderr || cloneError.message || "Unknown git clone error";
        logger.error(`Git clone failed: ${errorMessage}`);
        throw new AppError(
          ErrorType.INTEGRATION_ERROR,
          `Error cloning repository: ${errorMessage}`,
          500
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      // Safely extract error information to avoid circular references
      const errorInfo =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : { message: String(error) };

      logger.error(`Failed to clone repository: ${repositoryUrl}`, errorInfo);
      throw new AppError(
        ErrorType.INTEGRATION_ERROR,
        `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        500
      );
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  private parseRepositoryUrl(repositoryUrl: string): {
    owner: string;
    repo: string;
  } {
    try {
      // Handle both HTTPS and SSH URLs
      let match;

      // HTTPS URL: https://github.com/owner/repo or https://github.com/owner/repo.git
      if (repositoryUrl.startsWith("https://github.com/")) {
        match = repositoryUrl.match(
          /https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/
        );
      }
      // SSH URL: git@github.com:owner/repo.git
      else if (repositoryUrl.startsWith("git@github.com:")) {
        match = repositoryUrl.match(
          /git@github\.com:([^\/]+)\/(.+?)(?:\.git)?$/
        );
      }

      if (!match || !match[1] || !match[2]) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          "Invalid GitHub repository URL format",
          400
        );
      }

      return {
        owner: match[1],
        repo: match[2],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Failed to parse repository URL",
        400
      );
    }
  }
}

// Factory function to create authenticated GitHub service
export const createGitHubService = (accessToken: string): GitHubService => {
  return new GitHubService(accessToken);
};

import { createGitHubService } from "./github-service";
import GitLabService from "./gitlab-service";
import { PipelineRunService } from "./pipeline-run-service";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { logger } from "../config/logger";
import {
  sanitizeBranchName,
  sanitizeCommitMessage,
  sanitizeFilePath,
} from "../utils/security-utils";

const execAsync = promisify(exec);

// Helper function to copy directory recursively
async function copyDirectory(src: string, dest: string): Promise<void> {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to copy directory from ${src} to ${dest}: ${error}`,
    );
  }
}

// Enhanced helper function to copy directory recursively with detailed logging
async function copyDirectoryWithLogging(
  src: string,
  dest: string,
): Promise<void> {
  try {
    logger.info(`  📁 Creating directory: ${dest}`);
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });
    logger.info(`  📂 Found ${entries.length} entries in source directory`);

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        logger.info(`  📁 Processing subdirectory: ${entry.name}`);
        await copyDirectoryWithLogging(srcPath, destPath);
      } else {
        logger.info(`  📄 Copying file: ${entry.name}`);
        await fs.copyFile(srcPath, destPath);

        // Verify file was copied
        try {
          const stats = await fs.stat(destPath);
          logger.info(`    ✅ File copied successfully (${stats.size} bytes)`);
        } catch (verifyErr) {
          logger.info(`    ❌ File copy verification failed`);
        }
      }
    }
  } catch (error) {
    logger.error(
      `  💥 Failed to copy directory from ${src} to ${dest}:`,
      error,
    );
    throw new Error(
      `Failed to copy directory from ${src} to ${dest}: ${error}`,
    );
  }
}

export interface PipelineInputs {
  githubRepoUrl: string;
  githubAccessToken: string;
  githubDownloadLocation?: string;
  githubTargetCommitId?: string;
  gitlabRepoUrl: string;
  gitlabAccessToken: string;
  gitlabBranchName: string;
  gitlabBaseBranch: string;
  gitlabCheckoutLocation?: string;
  sourcePath: string;
  destinationPath: string;
  files: string[];
  copyMode: "files" | "folders" | "mixed";
  includeFolders: string[];
  excludePatterns: string[];
  preserveFolderStructure: boolean;
  mergeRequest: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
    checkoutLocation?: string;
    commitMessage?: string;
    changesDescription?: string;
  };
  enabledSteps?: {
    "clone-github": boolean;
    "create-gitlab-branch": boolean;
    "copy-files": boolean;
    "commit-changes": boolean;
    "create-merge-request": boolean;
  };
}
// Utility to extract GitLab project ID from URL
function extractGitLabProjectId(gitlabUrl: string): string {
  // Example: https://gitlab.com/group/project.git -> group%2Fproject (URL-encoded)
  try {
    const url = new URL(gitlabUrl);
    let path = url.pathname;
    if (path.endsWith(".git")) path = path.slice(1, -4);
    else path = path.slice(1);
    // URL-encode the path to handle forward slashes and special characters
    return encodeURIComponent(path);
  } catch {
    throw new Error("Invalid GitLab URL");
  }
}

export interface PipelineStepResult {
  step: string;
  status: "success" | "error";
  message?: string;
  data?: any;
}

export async function runPipeline(
  inputs: PipelineInputs,
  pipelineRunId?: string,
): Promise<PipelineStepResult[]> {
  logger.info(
    "🚀 Starting pipeline execution with inputs:",
    JSON.stringify(inputs, null, 2),
  );

  const results: PipelineStepResult[] = [];
  let githubLocalPath = "";

  // Validate required inputs
  if (
    !inputs.githubRepoUrl ||
    !inputs.githubAccessToken ||
    !inputs.gitlabRepoUrl ||
    !inputs.gitlabAccessToken
  ) {
    throw new Error(
      "Missing required pipeline inputs: GitHub repo URL, GitHub access token, GitLab repo URL, or GitLab access token",
    );
  }

  logger.info("📋 All pipeline steps will be executed (conditions removed)");

  // Step 1: Clone GitHub repo to selected path
  try {
    logger.info("Step 1: Cloning GitHub repository to selected path");

    // Update step status to in progress
    if (pipelineRunId) {
      logger.info(
        "🔄 Updating clone-github step to in_progress for run:",
        pipelineRunId,
      );
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "clone-github",
        status: "in_progress",
        message: "Cloning GitHub repository...",
      });
      logger.info("✅ Successfully updated step status to in_progress");
    }
    const githubAccessToken = inputs.githubAccessToken;
    const githubService = createGitHubService(githubAccessToken);

    // Use user-specified GitHub download location - required field
    if (
      !inputs.githubDownloadLocation ||
      inputs.githubDownloadLocation.trim() === ""
    ) {
      throw new Error(
        "GitHub download location is required. Please specify where to clone the repository.",
      );
    }
    const cloneLocation = inputs.githubDownloadLocation;

    const cloneResult = await githubService.cloneRepository(
      inputs.githubRepoUrl,
      githubAccessToken,
      cloneLocation,
      inputs.githubTargetCommitId,
    );
    githubLocalPath = cloneResult.localPath;
    logger.info("GitHub clone completed successfully to:", githubLocalPath);

    if (cloneResult.checkedOutCommit) {
      logger.info(
        "✅ Checked out specific commit:",
        cloneResult.checkedOutCommit,
      );
    }

    const successMessage = `GitHub repository cloned to ${githubLocalPath}${cloneResult.checkedOutCommit ? ` @ commit ${cloneResult.checkedOutCommit}` : ""}`;

    results.push({
      step: "clone-github",
      status: "success",
      message: successMessage,
      data: {
        localRepoPath: githubLocalPath,
        checkedOutCommit: cloneResult.checkedOutCommit,
        repositoryInfo: cloneResult.repositoryInfo,
      },
    });

    // Update step status to success
    if (pipelineRunId) {
      logger.info(
        "🎉 Updating clone-github step to success for run:",
        pipelineRunId,
      );
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "clone-github",
        status: "success",
        message: successMessage,
      });
      logger.info("✅ Successfully updated clone-github step to success");
    }
  } catch (err) {
    logger.error("GitHub clone failed:", err);
    const errorMessage = `GitHub clone failed: ${String(err)}`;

    results.push({
      step: "clone-github",
      status: "error",
      message: errorMessage,
    });

    // Update step status to failed
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "clone-github",
        status: "failed",
        message: "GitHub clone failed",
        errorMessage: String(err),
      });
    }

    return results;
  }

  let gitlabService;
  // Step 2: Create branch with given branch name in GitLab
  try {
    logger.info("Step 2: Creating GitLab branch");

    // Update step status to in progress
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-gitlab-branch",
        status: "in_progress",
        message: "Creating GitLab branch...",
      });
    }

    const gitlabAccessToken = inputs.gitlabAccessToken;
    gitlabService = new GitLabService(inputs.gitlabRepoUrl, gitlabAccessToken);

    // Validate GitLab checkout location - required for later steps
    if (
      !inputs.gitlabCheckoutLocation ||
      inputs.gitlabCheckoutLocation.trim() === ""
    ) {
      throw new Error(
        "GitLab checkout location is required. Please specify where to checkout the branch for later steps.",
      );
    }

    // Use user-specified GitLab base branch - required field
    if (!inputs.gitlabBaseBranch || inputs.gitlabBaseBranch.trim() === "") {
      throw new Error(
        "GitLab base branch is required. Please specify the base branch to create the new branch from.",
      );
    }
    const baseBranch = inputs.gitlabBaseBranch;

    // Create the branch in GitLab
    await gitlabService.createBranch(
      extractGitLabProjectId(inputs.gitlabRepoUrl),
      {
        branch: inputs.gitlabBranchName,
        ref: baseBranch,
      },
    );

    logger.info(
      `GitLab branch '${inputs.gitlabBranchName}' created successfully`,
    );

    // Setup local GitLab repository - avoid cloning if already exists
    logger.info(
      "Setting up local GitLab repository and checking out branch...",
    );

    // Check if GitLab repository already exists locally
    let repositoryExists = false;
    try {
      const gitlabStats = await fs.stat(inputs.gitlabCheckoutLocation);
      if (gitlabStats.isDirectory()) {
        // Check if it's a git repository
        const gitDir = path.join(inputs.gitlabCheckoutLocation, ".git");
        const gitStats = await fs.stat(gitDir);
        if (gitStats.isDirectory()) {
          logger.info(
            "✅ GitLab repository already exists locally - skipping clone",
          );
          repositoryExists = true;
        } else {
          logger.info(
            "⚠️  Directory exists but is not a Git repository - will clean and clone",
          );
        }
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.info(
          "📂 GitLab checkout location doesn't exist - will clone fresh",
        );
      } else {
        logger.info(
          "Warning: Error checking GitLab checkout location:",
          error.message,
        );
      }
    }

    if (repositoryExists) {
      // Repository exists - just fetch and checkout the branch
      logger.info("🔄 Updating existing repository and checking out branch...");

      try {
        // Update the remote URL to use authentication
        const authenticatedGitlabUrl = inputs.gitlabRepoUrl.replace(
          "https://",
          `https://oauth2:${inputs.gitlabAccessToken}@`,
        );

        await execAsync(
          `git remote set-url origin "${authenticatedGitlabUrl}"`,
          {
            cwd: inputs.gitlabCheckoutLocation,
          },
        );
        logger.info("✅ Updated remote URL with authentication");

        // Fetch latest changes from all remotes with credential.helper disabled
        await execAsync(
          "git -c http.sslVerify=false -c credential.helper= fetch origin",
          {
            cwd: inputs.gitlabCheckoutLocation,
          },
        );
        logger.info("✅ Fetched latest changes from GitLab");

        // Check if branch already exists locally and delete it
        const sanitizedBranchName = sanitizeBranchName(inputs.gitlabBranchName);
        try {
          await execAsync(`git branch -D ${sanitizedBranchName}`, {
            cwd: inputs.gitlabCheckoutLocation,
          });
          logger.info(
            `🗑️  Deleted existing local branch '${sanitizedBranchName}'`,
          );
        } catch (branchDeleteErr) {
          // Branch doesn't exist locally, which is fine
          logger.info(
            `📝 Local branch '${sanitizedBranchName}' doesn't exist (expected)`,
          );
        }

        // Create and checkout the new branch from remote
        await execAsync(
          `git checkout -b ${sanitizedBranchName} origin/${sanitizedBranchName}`,
          {
            cwd: inputs.gitlabCheckoutLocation,
          },
        );

        logger.info(
          `✅ Successfully checked out branch '${sanitizedBranchName}' without cloning`,
        );
      } catch (gitError: any) {
        logger.error("Git operations failed on existing repository:", gitError);
        throw new Error(
          `Failed to setup branch in existing repository: ${gitError.message}`,
        );
      }
    } else {
      // Repository doesn't exist - need to clone
      logger.info(
        "📥 Repository not found locally - cloning GitLab repository...",
      );

      // Clean up any existing non-git directory
      if (await fs.stat(inputs.gitlabCheckoutLocation).catch(() => null)) {
        logger.info("🧹 Cleaning existing non-git directory");
        await fs.rm(inputs.gitlabCheckoutLocation, {
          recursive: true,
          force: true,
        });
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(inputs.gitlabCheckoutLocation), {
        recursive: true,
      });

      // Clone the GitLab repository with authentication
      const authenticatedGitlabUrl = inputs.gitlabRepoUrl.replace(
        "https://",
        `https://oauth2:${inputs.gitlabAccessToken}@`,
      );

      await execAsync(
        `git -c http.sslVerify=false -c credential.helper= clone "${authenticatedGitlabUrl}" "${inputs.gitlabCheckoutLocation}"`,
      );
      logger.info("✅ GitLab repository cloned successfully");

      //Fetch and checkout the newly created branch
      const sanitizedBranchName = sanitizeBranchName(inputs.gitlabBranchName);
      await execAsync(
        "git -c http.sslVerify=false -c credential.helper= fetch origin",
        {
          cwd: inputs.gitlabCheckoutLocation,
        },
      );
      await execAsync(
        `git checkout -b ${sanitizedBranchName} origin/${sanitizedBranchName}`,
        {
          cwd: inputs.gitlabCheckoutLocation,
        },
      );

      logger.info(
        `✅ Checked out branch '${sanitizedBranchName}' in new clone`,
      );
    }

    const successMessage = `Branch '${inputs.gitlabBranchName}' created and checked out successfully from '${baseBranch}'`;

    results.push({
      step: "create-gitlab-branch",
      status: "success",
      message: successMessage,
      data: {
        branchName: inputs.gitlabBranchName,
        baseBranch: baseBranch,
        checkoutLocation: inputs.gitlabCheckoutLocation,
      },
    });

    // Update step status to success
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-gitlab-branch",
        status: "success",
        message: successMessage,
      });
    }
  } catch (err) {
    logger.error("GitLab branch creation failed:", err);
    const errorMessage = `GitLab branch creation failed: ${String(err)}`;

    results.push({
      step: "create-gitlab-branch",
      status: "error",
      message: errorMessage,
    });

    // Update step status to failed
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-gitlab-branch",
        status: "failed",
        message: "GitLab branch creation failed",
        errorMessage: String(err),
      });
    }

    return results;
  }

  try {
    // Step 3: Copy folders/files from GitHub source to GitLab target as specified
    logger.info(
      "Step 3: Copying files/folders from GitHub source to GitLab checkout location",
    );

    // Update step status to in_progress
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "copy-files",
        status: "in_progress",
        message: "Copying files/folders to target location",
      });
    }

    // Debug input paths
    logger.info("Path construction debug:");
    logger.info("- githubLocalPath:", githubLocalPath);
    logger.info("- inputs.sourcePath:", inputs.sourcePath);
    logger.info(
      "- inputs.gitlabCheckoutLocation:",
      inputs.gitlabCheckoutLocation,
    );
    logger.info("- inputs.destinationPath:", inputs.destinationPath);

    // Determine source path - handle absolute vs relative source paths
    const sourcePath = path.isAbsolute(inputs.sourcePath || "")
      ? inputs.sourcePath
      : path.join(githubLocalPath, inputs.sourcePath || "");

    // Determine destination path - handle absolute vs relative destination paths
    const destinationPath = path.isAbsolute(inputs.destinationPath || "")
      ? inputs.destinationPath
      : path.join(
          inputs.gitlabCheckoutLocation || "",
          inputs.destinationPath || "",
        );

    // Debug final paths
    logger.info("Final paths:");
    logger.info("- sourcePath:", sourcePath);
    logger.info("- destinationPath:", destinationPath);

    // Ensure destination directory exists
    await fs.mkdir(destinationPath, { recursive: true });

    // Copy files/folders based on copyMode specification
    logger.info("Copy mode configuration:");
    logger.info("- copyMode:", inputs.copyMode);
    logger.info("- inputs.files:", inputs.files);
    logger.info("- inputs.includeFolders:", inputs.includeFolders);
    logger.info("- inputs.excludePatterns:", inputs.excludePatterns);
    logger.info(
      "- inputs.preserveFolderStructure:",
      inputs.preserveFolderStructure,
    );

    // Determine which input field to use based on copyMode
    let patterns: string[] = [];
    let modeDescription = "";

    switch (inputs.copyMode) {
      case "files":
        patterns = inputs.files || [];
        modeDescription = "specific files";
        logger.info("Using files mode - processing inputs.files");
        break;
      case "folders":
        patterns = inputs.includeFolders || [];
        modeDescription = "specific folders";
        logger.info("Using folders mode - processing inputs.includeFolders");
        break;
      case "mixed":
        patterns = [...(inputs.files || []), ...(inputs.includeFolders || [])];
        modeDescription = "mixed files and folders";
        logger.info(
          "Using mixed mode - processing both inputs.files and inputs.includeFolders",
        );
        break;
      default:
        throw new Error(`Invalid copyMode: ${inputs.copyMode}`);
    }

    logger.info(
      `Processing ${patterns.length} patterns for ${modeDescription}:`,
      patterns,
    );

    if (patterns && patterns.length > 0) {
      for (const filePattern of patterns) {
        logger.info(`Processing pattern: "${filePattern}"`);
        const trimmedPattern = filePattern.trim();

        // Sanitize file paths to prevent directory traversal attacks
        const sourceFile = sanitizeFilePath(sourcePath, trimmedPattern);

        // Determine destination path based on preserveFolderStructure setting
        let destFile: string;
        if (inputs.preserveFolderStructure) {
          // Preserve the folder structure - keep the relative path
          destFile = sanitizeFilePath(destinationPath, trimmedPattern);
        } else {
          // Flatten structure - just use the folder/file name
          const baseName = path.basename(trimmedPattern);
          destFile = sanitizeFilePath(destinationPath, baseName);
        }

        logger.info(`- Trimmed pattern: "${trimmedPattern}"`);
        logger.info(`- Source file path: "${sourceFile}"`);
        logger.info(`- Dest file path: "${destFile}"`);
        logger.info(`- Preserve structure: ${inputs.preserveFolderStructure}`);

        try {
          // Check if source exists
          const sourceStats = await fs.stat(sourceFile);
          logger.info(
            `- Source exists: ${sourceStats.isDirectory() ? "directory" : "file"}`,
          );

          // Remove destination if it exists to avoid conflicts
          try {
            await fs.access(destFile);
            logger.info(`- Removing existing destination: "${destFile}"`);
            await fs.rm(destFile, { recursive: true, force: true });
            logger.info(`- Successfully removed existing destination`);
          } catch (accessErr) {
            // Destination doesn't exist, which is fine
            logger.info(`- Destination doesn't exist, proceeding with copy`);
          }

          if (sourceStats.isDirectory()) {
            // Ensure destination directory exists
            await fs.mkdir(path.dirname(destFile), { recursive: true });

            // Copy directory recursively with enhanced logging
            logger.info(
              `- Starting directory copy from "${sourceFile}" to "${destFile}"`,
            );
            await copyDirectoryWithLogging(sourceFile, destFile);
            logger.info(`✅ Copied directory: ${filePattern}`);

            // Verify the copy was successful
            try {
              const destStats = await fs.stat(destFile);
              logger.info(
                `- Verification: Destination exists and is ${destStats.isDirectory() ? "directory" : "file"}`,
              );

              // Count items in destination to verify copy
              const destEntries = await fs.readdir(destFile);
              logger.info(
                `- Verification: ${destEntries.length} items in destination directory`,
              );
            } catch (verifyErr) {
              logger.error(
                `- Verification failed: Destination not found after copy`,
                verifyErr,
              );
            }
          } else {
            // Copy single file
            await fs.mkdir(path.dirname(destFile), { recursive: true });
            await fs.copyFile(sourceFile, destFile);
            logger.info(`✅ Copied file: ${filePattern}`);

            // Verify the copy was successful
            try {
              const destStats = await fs.stat(destFile);
              logger.info(
                `- Verification: File exists, size: ${destStats.size} bytes`,
              );
            } catch (verifyErr) {
              logger.error(`- Verification failed: File not found after copy`);
            }
          }
        } catch (copyErr: any) {
          logger.error(`Error: Could not copy ${filePattern}:`, copyErr);
          throw new Error(
            `Failed to copy ${filePattern}: ${copyErr.message || copyErr}`,
          );
        }
      }
    } else {
      // Copy entire source to destination
      await copyDirectory(sourcePath, destinationPath);
      logger.info("Copied entire source directory to destination");
    }

    // Update step status to success
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "copy-files",
        status: "success",
        message: `Files copied from ${sourcePath} to ${destinationPath}`,
      });
    }

    results.push({
      step: "copy-files",
      status: "success",
      message: `Files copied from ${sourcePath} to ${destinationPath} using ${inputs.copyMode} mode`,
      data: {
        sourcePath,
        destinationPath,
        copyMode: inputs.copyMode,
        patternsCopied: patterns?.length || "all",
        modeDescription,
      },
    });
  } catch (err) {
    logger.error("File copy failed:", err);
    const errorMessage = `File copy failed: ${String(err)}`;

    results.push({
      step: "copy-files",
      status: "error",
      message: errorMessage,
    });

    // Update step status to failed
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "copy-files",
        status: "failed",
        message: "File copy failed",
        errorMessage: String(err),
      });
    }

    return results;
  }

  // Prepare data needed for Steps 4 and 5
  const commitMessage = inputs.mergeRequest.commitMessage;
  const enhancedDescription = inputs.mergeRequest.changesDescription
    ? `${inputs.mergeRequest.description}\n\n## Changes Made\n${inputs.mergeRequest.changesDescription}`
    : inputs.mergeRequest.description;

  // Step 4: Commit changes and push to remote
  try {
    logger.info(
      "Step 4: Adding changes, committing, and pushing to remote branch",
    );

    // Update step status to in_progress
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "commit-changes",
        status: "in_progress",
        message: "Adding and committing changes",
      });
    }

    // Use user-specified commit message - required field
    if (
      !inputs.mergeRequest.commitMessage ||
      inputs.mergeRequest.commitMessage.trim() === ""
    ) {
      throw new Error(
        "Commit message is required. Please specify a commit message for the changes.",
      );
    }

    // Navigate to GitLab checkout location and commit changes
    try {
      // Add all changes
      await execAsync("git add .", { cwd: inputs.gitlabCheckoutLocation });
      logger.info("Added all changes to git staging");

      // Check if there are changes to commit
      const { stdout: statusOutput } = await execAsync(
        "git status --porcelain",
        { cwd: inputs.gitlabCheckoutLocation },
      );

      if (statusOutput.trim()) {
        // Configure git user identity for this repository
        const gitUserEmail =
          process.env["GIT_USER_EMAIL"] || "pipeline@codemergetool.local";
        const gitUserName =
          process.env["GIT_USER_NAME"] || "Code Merge Tool Pipeline";

        await execAsync(`git config user.email "${gitUserEmail}"`, {
          cwd: inputs.gitlabCheckoutLocation,
        });
        await execAsync(`git config user.name "${gitUserName}"`, {
          cwd: inputs.gitlabCheckoutLocation,
        });
        logger.info("Configured git user identity for commit");

        // Commit changes with sanitized message
        const sanitizedCommitMessage = sanitizeCommitMessage(
          commitMessage || "Automated commit from pipeline",
        );
        const sanitizedBranchName = sanitizeBranchName(
          inputs.gitlabBranchName || "main",
        );
        await execAsync(`git commit -m "${sanitizedCommitMessage}"`, {
          cwd: inputs.gitlabCheckoutLocation,
        });
        logger.info("Committed changes with message:", sanitizedCommitMessage);

        // Push changes to GitLab with conflict handling
        try {
          await execAsync(
            `git -c http.sslVerify=false -c credential.helper= push origin ${sanitizedBranchName}`,
            {
              cwd: inputs.gitlabCheckoutLocation,
            },
          );
          logger.info(
            "✅ Pushed changes to GitLab branch:",
            sanitizedBranchName,
          );
        } catch (pushErr: any) {
          logger.info("Push failed, attempting to resolve conflicts...");
          logger.info("Push error:", pushErr.stderr || pushErr.message);

          // If push failed due to non-fast-forward, try to pull and merge
          if (
            pushErr.stderr?.includes("non-fast-forward") ||
            pushErr.stderr?.includes("rejected")
          ) {
            try {
              logger.info("Attempting to pull and merge remote changes...");

              // Pull with merge strategy
              await execAsync(
                `git -c http.sslVerify=false -c credential.helper= pull origin ${sanitizedBranchName} --no-edit`,
                {
                  cwd: inputs.gitlabCheckoutLocation,
                },
              );
              logger.info("✅ Successfully pulled and merged remote changes");

              // Try push again after merge
              await execAsync(
                `git -c http.sslVerify=false -c credential.helper= push origin ${sanitizedBranchName}`,
                {
                  cwd: inputs.gitlabCheckoutLocation,
                },
              );
              logger.info("✅ Successfully pushed after merge");
            } catch (mergeErr: any) {
              logger.info("Merge failed, attempting force push...");
              logger.info("Merge error:", mergeErr.stderr || mergeErr.message);

              // If merge fails, force push to overwrite remote branch
              try {
                await execAsync(
                  `git -c http.sslVerify=false -c credential.helper= push --force origin ${sanitizedBranchName}`,
                  {
                    cwd: inputs.gitlabCheckoutLocation,
                  },
                );
                logger.info(
                  "⚠️  Force pushed changes to GitLab branch (overwrote remote changes)",
                );
              } catch (forceErr: any) {
                throw new Error(
                  `Failed to push even with force: ${forceErr.stderr || forceErr.message}`,
                );
              }
            }
          } else {
            // Re-throw if it's not a conflict issue
            throw pushErr;
          }
        }
      } else {
        logger.info("No changes to commit");
      }

      // Step 4 completed successfully
      results.push({
        step: "commit-changes",
        status: "success",
        message: "Changes committed and pushed to remote branch successfully",
        data: {
          commitMessage,
          branch: inputs.gitlabBranchName,
        },
      });

      // Update step status to success
      if (pipelineRunId) {
        await PipelineRunService.updateStepStatus(pipelineRunId, {
          stepName: "commit-changes",
          status: "success",
          message: "Changes committed and pushed successfully",
        });
      }
    } catch (gitErr) {
      logger.error("Git operations failed:", gitErr);

      // Update step status to failed
      if (pipelineRunId) {
        await PipelineRunService.updateStepStatus(pipelineRunId, {
          stepName: "commit-changes",
          status: "failed",
          message: "Failed to commit and push changes",
          errorMessage: String(gitErr),
        });
      }

      results.push({
        step: "commit-changes",
        status: "error",
        message: `Failed to commit and push changes: ${gitErr}`,
      });
      return results;
    }
  } catch (gitErr) {
    logger.error("Git operations failed:", gitErr);

    // Update step status to failed
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "commit-changes",
        status: "failed",
        message: "Failed to commit and push changes",
        errorMessage: String(gitErr),
      });
    }

    results.push({
      step: "commit-changes",
      status: "error",
      message: `Failed to commit and push changes: ${gitErr}`,
    });
    return results;
  }

  // Step 5: Create merge request
  try {
    // Step 5: Create merge request
    logger.info("✅ Step 5: Creating merge request (step is enabled)");

    // Update step status to in_progress
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-merge-request",
        status: "in_progress",
        message: "Creating merge request",
      });
    }
    // Ensure gitlabService is initialized (in case Step 2 was skipped)
    if (!gitlabService) {
      const gitlabAccessToken = inputs.gitlabAccessToken;
      gitlabService = new GitLabService(
        inputs.gitlabRepoUrl,
        gitlabAccessToken,
      );
    }

    const mr = await gitlabService.createMergeRequest(
      extractGitLabProjectId(inputs.gitlabRepoUrl),
      {
        source_branch: inputs.gitlabBranchName,
        target_branch: inputs.mergeRequest.targetBranch,
        title: inputs.mergeRequest.title,
        description: enhancedDescription,
        remove_source_branch: false,
      },
    );

    results.push({
      step: "create-merge-request",
      status: "success",
      message: `Merge request created successfully: '${inputs.mergeRequest.title}'`,
      data: {
        mergeRequest: mr,
        title: inputs.mergeRequest.title,
        sourceBranch: inputs.gitlabBranchName,
        targetBranch: inputs.mergeRequest.targetBranch,
      },
    });

    // Update step status to success
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-merge-request",
        status: "success",
        message: "Merge request created successfully",
      });
    }
  } catch (err) {
    logger.error("Merge request creation failed:", err);

    // Update step status to failed
    if (pipelineRunId) {
      await PipelineRunService.updateStepStatus(pipelineRunId, {
        stepName: "create-merge-request",
        status: "failed",
        message: "Failed to create merge request",
        errorMessage: String(err),
      });
    }

    results.push({
      step: "create-merge-request",
      status: "error",
      message: `Failed to create merge request: ${String(err)}`,
    });
    return results;
  }

  logger.info(
    "✅ Pipeline execution completed successfully with",
    results.length,
    "steps",
  );
  logger.info(
    "📊 Final results:",
    results.map((r: any) => `${r.step}: ${r.status}`),
  );

  return results;
}

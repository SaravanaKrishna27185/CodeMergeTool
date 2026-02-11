import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { EventEmitter } from "events";
import { config } from "../config/config";
import { AppError, ErrorType } from "../middleware/error-handler";
import { logger } from "../config/logger";

const execAsync = promisify(exec);

// Store active clone processes for cancellation
const activeCloneProcesses = new Map<string, ChildProcess>();

// Store progress event emitters for each operation
const progressEmitters = new Map<string, EventEmitter>();

export interface CloneResult {
  success: boolean;
  localPath: string;
  message: string;
}

export interface ProgressEvent {
  operationId: string;
  type: "progress" | "status" | "complete" | "error";
  message: string;
  percentage?: number;
  phase?: "initializing" | "cloning" | "receiving" | "resolving" | "complete";
}

export class GitHubService {
  /**
   * Get progress emitter for an operation
   */
  public static getProgressEmitter(operationId: string): EventEmitter {
    if (!progressEmitters.has(operationId)) {
      progressEmitters.set(operationId, new EventEmitter());
    }
    return progressEmitters.get(operationId)!;
  }

  /**
   * Clean up progress emitter
   */
  public static cleanupProgressEmitter(operationId: string): void {
    const emitter = progressEmitters.get(operationId);
    if (emitter) {
      emitter.removeAllListeners();
      progressEmitters.delete(operationId);
    }
  }

  /**
   * Emit progress event
   */
  private static emitProgress(operationId: string, event: ProgressEvent): void {
    const emitter = progressEmitters.get(operationId);
    if (emitter) {
      emitter.emit("progress", event);
    }
  }
  /**
   * Clone repository using URL and Personal Access Token (PAT)
   */
  public async cloneRepository(
    repoUrl: string,
    pat: string,
    targetDirectory?: string,
    operationId?: string,
  ): Promise<CloneResult> {
    try {
      // Validate inputs
      if (!repoUrl || !pat) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          "Repository URL and Personal Access Token are required",
          400,
        );
      }

      // Parse repository URL to extract owner and repo name
      const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!urlMatch) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          "Invalid GitHub repository URL. Expected format: https://github.com/owner/repo",
          400,
        );
      }

      const [, owner, repoName] = urlMatch;

      // Determine the target path
      let fullTargetPath: string;

      if (targetDirectory) {
        // If targetDirectory is provided, treat it as the full path where we want to clone
        // Create the repository folder inside the specified directory
        fullTargetPath = path.join(targetDirectory, `${owner}-${repoName}`);
      } else {
        // Use the default repositories path
        const dirName = `${owner}-${repoName}-${Date.now()}`;
        fullTargetPath = path.join(
          config.REPOS_PATH || "./repositories",
          dirName,
        );
      }

      // Ensure the parent directory exists
      await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });

      // Check if the target directory already exists and remove it
      try {
        await fs.access(fullTargetPath);
        logger.info(
          `Directory ${fullTargetPath} already exists. Removing it before cloning.`,
        );

        // Notify about directory removal
        if (operationId) {
          GitHubService.emitProgress(operationId, {
            operationId,
            type: "status",
            message: "Removing existing directory...",
            phase: "initializing",
            percentage: 5,
          });
        }

        try {
          // Remove the existing directory recursively
          await fs.rm(fullTargetPath, { recursive: true, force: true });
          logger.info(
            `Successfully removed existing directory: ${fullTargetPath}`,
          );
        } catch (rmError: any) {
          logger.error(
            `Failed to remove existing directory: ${rmError.message}`,
          );
          throw new AppError(
            ErrorType.INTEGRATION_ERROR,
            `Cannot remove existing directory ${path.basename(fullTargetPath)}. Please check file permissions or close any applications using files in this directory.`,
            500,
          );
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          // Re-throw AppError (from directory removal failure)
          throw error;
        }
        if (error.code !== "ENOENT") {
          // If it's not a "directory doesn't exist" error, log it but continue
          logger.warn(
            `Warning while checking existing directory: ${error.message}`,
          );
        }
        // Directory doesn't exist, which is fine - we can proceed with cloning
      }

      // Create authenticated clone URL
      const authenticatedUrl = `https://${pat}@github.com/${owner}/${repoName}.git`;

      // Execute git clone command using spawn for better control
      logger.info(
        `Cloning repository: ${owner}/${repoName} to ${fullTargetPath}`,
      );

      return new Promise<CloneResult>((resolve, reject) => {
        // Initialize progress tracking
        if (operationId) {
          GitHubService.emitProgress(operationId, {
            operationId,
            type: "status",
            message: "Initializing clone operation...",
            phase: "initializing",
            percentage: 10,
          });
        }

        const gitProcess = spawn(
          "git",
          [
            "-c",
            "http.sslVerify=false",
            "clone",
            "--progress",
            authenticatedUrl,
            fullTargetPath,
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        );

        // Store the process for cancellation if operationId provided
        if (operationId) {
          activeCloneProcesses.set(operationId, gitProcess);
        }

        let errorOutput = "";
        let stdoutData = "";

        // Parse progress from stderr (git outputs progress to stderr)
        gitProcess.stderr.on("data", (data) => {
          const output = data.toString();
          errorOutput += output;

          if (operationId) {
            // Parse git progress output
            const lines = output.split("\n");
            for (const line of lines) {
              if (line.includes("Cloning into")) {
                GitHubService.emitProgress(operationId, {
                  operationId,
                  type: "status",
                  message: "Starting to clone repository...",
                  phase: "cloning",
                  percentage: 15,
                });
              } else if (line.includes("remote: Counting objects")) {
                GitHubService.emitProgress(operationId, {
                  operationId,
                  type: "progress",
                  message: "Counting objects on remote repository...",
                  phase: "receiving",
                  percentage: 25,
                });
              } else if (line.includes("Receiving objects")) {
                // Extract percentage from "Receiving objects: XX% (XXX/XXX)"
                const match = line.match(/Receiving objects:\s*(\d+)%/);
                if (match) {
                  const percentage = Math.min(
                    90,
                    35 + parseInt(match[1]) * 0.5,
                  ); // Scale to 35-85%
                  GitHubService.emitProgress(operationId, {
                    operationId,
                    type: "progress",
                    message: `Receiving objects: ${match[1]}%`,
                    phase: "receiving",
                    percentage: Math.round(percentage),
                  });
                }
              } else if (line.includes("Resolving deltas")) {
                // Extract percentage from "Resolving deltas: XX% (XXX/XXX)"
                const match = line.match(/Resolving deltas:\s*(\d+)%/);
                if (match) {
                  const percentage = Math.min(
                    95,
                    85 + parseInt(match[1]) * 0.1,
                  ); // Scale to 85-95%
                  GitHubService.emitProgress(operationId, {
                    operationId,
                    type: "progress",
                    message: `Resolving deltas: ${match[1]}%`,
                    phase: "resolving",
                    percentage: Math.round(percentage),
                  });
                }
              }
            }
          }
        });

        gitProcess.stdout.on("data", (data) => {
          stdoutData += data.toString();
        });

        gitProcess.on("close", async (code) => {
          // Clean up the process from active list
          if (operationId) {
            activeCloneProcesses.delete(operationId);
          }

          if (code === 0) {
            try {
              // Verify the clone was successful
              await fs.access(path.join(fullTargetPath, ".git"));

              logger.info(
                `Repository successfully cloned to: ${fullTargetPath}`,
              );

              if (operationId) {
                GitHubService.emitProgress(operationId, {
                  operationId,
                  type: "complete",
                  message: `Repository ${owner}/${repoName} successfully cloned`,
                  phase: "complete",
                  percentage: 100,
                });

                // Clean up after a short delay to allow final event to be sent
                setTimeout(() => {
                  GitHubService.cleanupProgressEmitter(operationId);
                }, 1000);
              }

              resolve({
                success: true,
                localPath: fullTargetPath,
                message: `Repository ${owner}/${repoName} successfully cloned`,
              });
            } catch {
              const error = new AppError(
                ErrorType.INTEGRATION_ERROR,
                "Repository cloned but .git directory not found",
                500,
              );

              if (operationId) {
                GitHubService.emitProgress(operationId, {
                  operationId,
                  type: "error",
                  message: error.message,
                  percentage: 0,
                });
                GitHubService.cleanupProgressEmitter(operationId);
              }

              reject(error);
            }
          } else {
            logger.error(`Git clone failed with code ${code}: ${errorOutput}`);

            let error: AppError;

            // Handle specific git errors
            if (
              errorOutput.includes("Authentication failed") ||
              errorOutput.includes("401")
            ) {
              error = new AppError(
                ErrorType.AUTHENTICATION_ERROR,
                "Invalid Personal Access Token or insufficient permissions",
                401,
              );
            } else if (
              errorOutput.includes("Repository not found") ||
              errorOutput.includes("404")
            ) {
              error = new AppError(
                ErrorType.NOT_FOUND_ERROR,
                "Repository not found or not accessible",
                404,
              );
            } else {
              error = new AppError(
                ErrorType.INTEGRATION_ERROR,
                `Failed to clone repository: ${errorOutput}`,
                500,
              );
            }

            if (operationId) {
              GitHubService.emitProgress(operationId, {
                operationId,
                type: "error",
                message: error.message,
                percentage: 0,
              });
              GitHubService.cleanupProgressEmitter(operationId);
            }

            reject(error);
          }
        });

        gitProcess.on("error", (error) => {
          // Clean up the process from active list
          if (operationId) {
            activeCloneProcesses.delete(operationId);
          }

          logger.error("Git process error:", error);

          const appError = new AppError(
            ErrorType.INTEGRATION_ERROR,
            `Git process failed: ${error.message}`,
            500,
          );

          if (operationId) {
            GitHubService.emitProgress(operationId, {
              operationId,
              type: "error",
              message: appError.message,
              percentage: 0,
            });
            GitHubService.cleanupProgressEmitter(operationId);
          }

          reject(appError);
        });

        // Handle process cancellation
        gitProcess.on("exit", (_code, signal) => {
          if (signal === "SIGTERM" || signal === "SIGKILL") {
            logger.info(`Clone operation cancelled for ${owner}/${repoName}`);

            if (operationId) {
              GitHubService.emitProgress(operationId, {
                operationId,
                type: "error",
                message: "Clone operation was cancelled",
                percentage: 0,
              });
              GitHubService.cleanupProgressEmitter(operationId);
            }

            reject(
              new AppError(
                ErrorType.INTEGRATION_ERROR,
                "Clone operation was cancelled",
                499,
              ),
            );
          }
        });

        // Set a timeout as fallback
        setTimeout(() => {
          if (!gitProcess.killed) {
            gitProcess.kill("SIGTERM");
            if (operationId) {
              activeCloneProcesses.delete(operationId);
              GitHubService.emitProgress(operationId, {
                operationId,
                type: "error",
                message:
                  "Clone operation timed out. Repository might be too large",
                percentage: 0,
              });
              GitHubService.cleanupProgressEmitter(operationId);
            }
            reject(
              new AppError(
                ErrorType.INTEGRATION_ERROR,
                "Clone operation timed out. Repository might be too large",
                408,
              ),
            );
          }
        }, 300000); // 5 minute timeout
      });
    } catch (error) {
      logger.error("Failed to clone repository:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ErrorType.INTEGRATION_ERROR,
        `Failed to clone repository: ${(error as any).message}`,
        500,
      );
    }
  }

  /**
   * Cancel an active clone operation
   */
  public cancelCloneOperation(operationId: string): boolean {
    const process = activeCloneProcesses.get(operationId);
    if (process && !process.killed) {
      logger.info(`Cancelling clone operation: ${operationId}`);
      process.kill("SIGTERM");
      activeCloneProcesses.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Validate if a GitHub URL is accessible with the given PAT
   */
  public async validateRepository(
    repoUrl: string,
    pat: string,
  ): Promise<boolean> {
    try {
      const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!urlMatch) {
        return false;
      }

      const [, owner, repoName] = urlMatch;

      // Validate repository access without logging the token
      // Note: Token is not logged, only used for authentication
      const authenticatedUrl = `https://oauth2:${pat}@github.com/${owner}/${repoName}.git`;

      await execAsync(`git ls-remote "${authenticatedUrl}" HEAD`, {
        timeout: 30000,
      });

      logger.info(`Repository validated successfully: ${owner}/${repoName}`);
      return true;
    } catch (error) {
      logger.warn(`Repository validation failed: ${error}`);
      return false;
    }
  }

  /**
   * Get repository size information (requires git to be available)
   */
  public async getRepositorySize(
    localPath: string,
  ): Promise<{ size: string; files: number }> {
    try {
      const { stdout: sizeOutput } = await execAsync(`du -sh "${localPath}"`, {
        timeout: 30000,
      });

      const { stdout: fileCountOutput } = await execAsync(
        `find "${localPath}" -type f | wc -l`,
        { timeout: 30000 },
      );

      return {
        size:
          sizeOutput && sizeOutput.includes("\t")
            ? sizeOutput.split("\t")[0]?.trim() || "unknown"
            : sizeOutput?.trim() || "unknown",
        files: fileCountOutput ? parseInt(fileCountOutput.trim(), 10) : 0,
      };
    } catch (error) {
      logger.warn("Failed to get repository size:", error);
      return {
        size: "unknown",
        files: 0,
      };
    }
  }
}

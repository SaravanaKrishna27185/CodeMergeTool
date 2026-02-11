import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import GitLabService from "../services/gitlab-service";
import path from "path";
import fs from "fs/promises";

const router = Router();

// Security validation helpers
const validatePath = (inputPath: string): boolean => {
  // Ensure the path is within allowed directories and doesn't contain dangerous patterns
  const normalizedPath = path.normalize(inputPath);
  return (
    !normalizedPath.includes("..") &&
    path.isAbsolute(normalizedPath) &&
    !normalizedPath.includes("|") &&
    !normalizedPath.includes("&") &&
    !normalizedPath.includes(";")
  );
};

const validateBranchName = (branchName: string): boolean => {
  // Allow alphanumeric characters, hyphens, underscores, forward slashes, and dots
  // Common Git branch naming patterns: feature/branch-name, bugfix/issue-123, v1.0.1, etc.
  return /^[a-zA-Z0-9_/.-]+$/.test(branchName);
};

// Custom GitLab URL validator for internal/enterprise instances
const validateGitLabUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Allow http/https protocols and ensure hostname exists
    const protocolValid = ["http:", "https:"].includes(parsed.protocol);
    const hostnameValid =
      Boolean(parsed.hostname) && parsed.hostname.length > 0;
    return protocolValid && hostnameValid;
  } catch {
    return false;
  }
};

// Validation middlewares
const createBranchValidation = [
  body("gitlabUrl")
    .custom(validateGitLabUrl)
    .withMessage("Valid GitLab URL is required (http/https protocol)"),
  body("newBranchName")
    .isLength({ min: 1 })
    .withMessage("Branch name is required"),
  body("baseBranch")
    .isLength({ min: 1 })
    .withMessage("Base branch is required"),
];

const syncToGitLabValidation = [
  body("localPath").notEmpty().withMessage("Local repository path is required"),
  body("gitlabUrl")
    .custom(validateGitLabUrl)
    .withMessage("Valid GitLab URL is required (http/https protocol)"),
  body("targetBranch").notEmpty().withMessage("Target branch is required"),
  body("commitMessage").notEmpty().withMessage("Commit message is required"),
  body("mergeRequestTitle")
    .notEmpty()
    .withMessage("Merge request title is required"),
];

const testConnectionValidation = [
  body("gitlabUrl")
    .custom(validateGitLabUrl)
    .withMessage("Valid GitLab URL is required (http/https protocol)"),
];

/**
 * Test GitLab connection
 */
router.post(
  "/test-connection",
  testConnectionValidation,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { gitlabUrl, accessToken } = req.body;
      const gitlabService = new GitLabService(gitlabUrl, accessToken);

      const result = await gitlabService.testConnection();

      if (result.success) {
        return res.json({
          success: true,
          message: "GitLab connection successful",
          data: {
            user: result.user,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "GitLab connection failed",
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("GitLab connection test failed:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

/**
 * Get GitLab project information
 */
router.post("/project-info", async (req: Request, res: Response) => {
  try {
    const { gitlabUrl, accessToken } = req.body;

    if (!gitlabUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "GitLab URL and access token are required",
      });
    }

    const gitlabService = new GitLabService(gitlabUrl, accessToken);
    const projectId = gitlabService["extractProjectId"](gitlabUrl); // Access private method for project ID
    const project = await gitlabService.getProject(projectId);

    return res.json({
      success: true,
      message: "Project information retrieved successfully",
      data: { project },
    });
  } catch (error: any) {
    console.error("Failed to get GitLab project info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get project information",
      error: error.message,
    });
  }
});

/**
 * Get branches for a GitLab project
 */
router.post("/branches", async (req: Request, res: Response) => {
  try {
    const { gitlabUrl, accessToken } = req.body;

    if (!gitlabUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "GitLab URL and access token are required",
      });
    }

    const gitlabService = new GitLabService(gitlabUrl, accessToken);
    const projectId = gitlabService["extractProjectId"](gitlabUrl);
    const branches = await gitlabService.getBranches(projectId);

    return res.json({
      success: true,
      message: "Branches retrieved successfully",
      data: { branches },
    });
  } catch (error: any) {
    console.error("Failed to get GitLab branches:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get branches",
      error: error.message,
    });
  }
});

/**
 * Create a new branch in GitLab
 */
router.post(
  "/create-branch",
  createBranchValidation,
  async (req: Request, res: Response) => {
    try {
      console.log("GitLab create-branch request received:", {
        body: req.body,
        hasAuth: !!req.user,
        userEmail: req.user?.email,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { gitlabUrl, accessToken, newBranchName, baseBranch } = req.body;

      console.log("Attempting to create GitLab service with:", {
        gitlabUrl,
        accessToken: accessToken
          ? `${accessToken.substring(0, 8)}...`
          : "undefined",
        newBranchName,
        baseBranch,
      });

      const gitlabService = new GitLabService(gitlabUrl, accessToken);
      const projectId = gitlabService["extractProjectId"](gitlabUrl);

      console.log("Extracted project ID:", projectId);

      const branch = await gitlabService.createBranch(projectId, {
        branch: newBranchName,
        ref: baseBranch,
      });

      return res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data: { branch },
      });
    } catch (error: any) {
      console.error("Failed to create GitLab branch:", error);

      // More detailed error logging
      if (error.response) {
        console.error("GitLab API Response Error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create branch",
        error: error.message,
        details: error.response?.data || "No additional details available",
      });
    }
  },
);

/**
 * Sync local repository to GitLab
 */
router.post(
  "/sync",
  syncToGitLabValidation,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        localPath,
        gitlabUrl,
        accessToken,
        targetBranch,
        commitMessage,
        mergeRequestTitle,
        mergeRequestDescription,
        sourceBranchName,
      } = req.body;

      console.log(`[GitLab Route] Using local repository path: ${localPath}`);

      // Check if local path exists
      try {
        await fs.access(localPath);
        console.log(`[GitLab Route] Local path exists and is accessible`);
      } catch (error) {
        console.error(`[GitLab Route] Local path not accessible: ${error}`);
        return res.status(400).json({
          success: false,
          message: `Local repository path does not exist or is not accessible: ${localPath}`,
        });
      }

      // Enhanced input sanitization for command injection prevention
      if (!validatePath(localPath)) {
        return res.status(400).json({
          success: false,
          message: "Invalid local path provided",
        });
      }

      if (targetBranch && !validateBranchName(targetBranch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid target branch name",
        });
      }

      if (sourceBranchName && !validateBranchName(sourceBranchName)) {
        return res.status(400).json({
          success: false,
          message: "Invalid source branch name",
        });
      }

      const gitlabService = new GitLabService(gitlabUrl, accessToken);

      const result = await gitlabService.syncToGitLab({
        localPath,
        gitlabUrl,
        accessToken: accessToken,
        targetBranch,
        commitMessage,
        mergeRequestTitle,
        mergeRequestDescription,
        sourceBranchName,
      });

      return res.status(201).json({
        success: true,
        message: "Repository synced successfully",
        data: {
          branch: result.branch,
          mergeRequest: result.mergeRequest,
        },
      });
    } catch (error: any) {
      console.error("Failed to sync to GitLab:", error);

      // Log detailed error information
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      });

      // Return more specific error messages based on error type
      let errorMessage = "Failed to sync repository";
      let statusCode = 500;

      if (error.message?.includes("No changes detected")) {
        errorMessage = "No changes detected to sync";
        statusCode = 400;
      } else if (error.message?.includes("Local directory does not exist")) {
        errorMessage = "Local directory does not exist";
        statusCode = 400;
      } else if (error.message?.includes("authentication")) {
        errorMessage =
          "Authentication failed. Please check your GitLab access token";
        statusCode = 401;
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("connection")
      ) {
        errorMessage =
          "Network error: Failed to connect to GitLab. Please check your connection and GitLab URL";
        statusCode = 503;
      } else if (error.message?.includes("permission")) {
        errorMessage =
          "Permission denied. Please check your GitLab access permissions";
        statusCode = 403;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details:
          process.env["NODE_ENV"] === "development" ? error.stack : undefined,
      });
    }
  },
);

/**
 * Get merge requests for a project
 */
router.post("/merge-requests", async (req: Request, res: Response) => {
  try {
    const { gitlabUrl, accessToken, state = "all" } = req.body;

    if (!gitlabUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "GitLab URL and access token are required",
      });
    }

    const gitlabService = new GitLabService(gitlabUrl, accessToken);
    const projectId = gitlabService["extractProjectId"](gitlabUrl);
    const mergeRequests = await gitlabService.getMergeRequests(
      projectId,
      state,
    );

    return res.json({
      success: true,
      message: "Merge requests retrieved successfully",
      data: { mergeRequests },
    });
  } catch (error: any) {
    console.error("Failed to get merge requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get merge requests",
      error: error.message,
    });
  }
});

export default router;

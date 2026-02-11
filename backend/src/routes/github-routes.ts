import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";
import { AppError, ErrorType } from "../middleware/error-handler";
import { GitHubService as GitHubCloneService } from "../services/github-clone-service";
import { JWTUtil } from "../utils/jwt";

const router = Router();

/**
 * @route   GET /api/github/clone-progress/:operationId
 * @desc    Stream clone progress updates via Server-Sent Events
 * @access  Private (custom auth)
 */
router.get(
  "/clone-progress/:operationId",
  async (req: Request, res: Response) => {
    try {
      // Custom auth check for SSE endpoint
      const authHeader = req.header("Authorization");
      const token = req.query["token"] as string;

      let authToken: string | undefined;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        authToken = authHeader.substring(7);
      } else if (token) {
        authToken = token;
      }

      if (!authToken) {
        res.status(401).json({ error: "Access token is required" });
        return;
      }

      // Verify the token (similar to auth middleware logic)
      try {
        JWTUtil.verifyAccessToken(authToken);
        // We don't need to set req.user for SSE, just verify the token is valid
      } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      const { operationId } = req.params;

      if (!operationId) {
        res.status(400).json({ error: "Operation ID is required" });
        return;
      }

      // Set up Server-Sent Events headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Cache-Control, Authorization"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");

      // Send initial connection message
      res.write(
        `data: ${JSON.stringify({ type: "connected", operationId })}\n\n`
      );

      // Get the progress emitter for this operation
      const progressEmitter =
        GitHubCloneService.getProgressEmitter(operationId);

      // Set up progress listener
      const progressListener = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      progressEmitter.on("progress", progressListener);

      // Handle client disconnect
      req.on("close", () => {
        progressEmitter.removeListener("progress", progressListener);
      });

      // Handle connection errors
      req.on("error", (err) => {
        console.error("SSE connection error:", err);
        progressEmitter.removeListener("progress", progressListener);
      });
    } catch (error) {
      console.error("SSE setup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Apply auth middleware to all OTHER routes (after SSE route)
router.use(authMiddleware);

/**
 * @route   POST /api/github/clone
 * @desc    Clone a GitHub repository using URL and PAT
 * @access  Private
 */
router.post(
  "/clone",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "User not authenticated",
        401
      );
    }

    const {
      repositoryUrl,
      personalAccessToken,
      downloadLocation,
      operationId,
    } = req.body;

    console.log("Clone request received:", {
      repositoryUrl,
      personalAccessToken: personalAccessToken ? "***PROVIDED***" : "MISSING",
      downloadLocation,
      operationId,
    });

    if (!repositoryUrl || !personalAccessToken) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Repository URL and Personal Access Token are required",
        400
      );
    }

    const githubCloneService = new GitHubCloneService();
    const result = await githubCloneService.cloneRepository(
      repositoryUrl,
      personalAccessToken,
      downloadLocation,
      operationId
    );

    res.json({
      success: true,
      message: "Repository cloned successfully",
      data: result,
    });
  })
);

/**
 * @route   POST /api/github/cancel-clone
 * @desc    Cancel an active clone operation
 * @access  Private
 */
router.post(
  "/cancel-clone",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "User not authenticated",
        401
      );
    }

    const { operationId } = req.body;

    if (!operationId) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Operation ID is required",
        400
      );
    }

    const githubCloneService = new GitHubCloneService();
    const cancelled = githubCloneService.cancelCloneOperation(operationId);

    res.json({
      success: true,
      message: cancelled
        ? "Clone operation cancelled successfully"
        : "No active clone operation found",
      data: { cancelled },
    });
  })
);

/**
 * @route   POST /api/github/validate
 * @desc    Validate GitHub repository access with PAT
 * @access  Private
 */
router.post(
  "/validate",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "User not authenticated",
        401
      );
    }

    const { repositoryUrl, personalAccessToken } = req.body;

    if (!repositoryUrl || !personalAccessToken) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Repository URL and Personal Access Token are required",
        400
      );
    }

    const githubCloneService = new GitHubCloneService();
    const isValid = await githubCloneService.validateRepository(
      repositoryUrl,
      personalAccessToken
    );

    res.json({
      success: true,
      message: isValid
        ? "Repository access validated successfully"
        : "Repository access validation failed",
      data: { isValid },
    });
  })
);

export default router;

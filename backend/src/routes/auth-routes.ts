import { Router } from "express";
import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  AuthService,
  RegisterUserData,
  LoginCredentials,
} from "../services/auth-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";
import { AppError, ErrorType } from "../middleware/error-handler";

const router = Router();

// Strict rate limiting for sensitive authentication operations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More lenient rate limiting for token refresh
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 refresh requests per windowMs
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: "Too many token refresh attempts. Please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Email and password are required",
        400,
      );
    }

    // Validate password strength
    const passwordErrors = AuthService.validatePassword(password);
    if (passwordErrors.length > 0) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Password does not meet requirements",
        400,
        { errors: passwordErrors },
      );
    }

    // Register user
    const userData: RegisterUserData = {
      email,
      password,
      firstName,
      lastName,
    };

    const result = await AuthService.register(userData);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }),
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Email and password are required",
        400,
      );
    }

    // Login user
    const credentials: LoginCredentials = { email, password };
    const result = await AuthService.login(credentials);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  }),
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Refresh token is required",
        400,
      );
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: { tokens },
    });
  }),
);

/**
 * @route   DELETE /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.delete(
  "/logout",
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    // For now, logout is handled client-side by removing tokens
    // In a more advanced implementation, we could maintain a blacklist of revoked tokens

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }),
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await AuthService.getUserById(req.user!.userId);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: { user },
    });
  }),
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  "/change-password",
  authLimiter,
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Current password and new password are required",
        400,
      );
    }

    await AuthService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword,
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  }),
);

/**
 * @route   GET /api/auth/github
 * @desc    Start GitHub OAuth flow
 * @access  Public
 */
router.get(
  "/github",
  asyncHandler(async (_req, res) => {
    // TODO: Implement GitHub OAuth
    res.status(501).json({
      success: false,
      message: "GitHub OAuth not yet implemented",
    });
  }),
);

/**
 * @route   GET /api/auth/gitlab
 * @desc    Start GitLab OAuth flow
 * @access  Public
 */
router.get(
  "/gitlab",
  asyncHandler(async (_req, res) => {
    // TODO: Implement GitLab OAuth
    res.status(501).json({
      success: false,
      message: "GitLab OAuth not yet implemented",
    });
  }),
);

export default router;

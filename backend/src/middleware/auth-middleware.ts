import { Request, Response, NextFunction } from "express";
import { JWTUtil } from "../utils/jwt";
import { AuthService } from "../services/auth-service";
import { AppError, ErrorType } from "./error-handler";
import { logger } from "../config/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "Access token is required",
        401
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = JWTUtil.verifyAccessToken(token);

      // Verify user still exists and is active
      await AuthService.getUserById(decoded.userId);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || "user",
      };

      next();
    } catch (jwtError: any) {
      // Log the specific JWT error for debugging
      logger.warn("JWT verification failed", {
        error: jwtError.message,
        tokenLength: token?.length || 0,
      });

      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "Invalid or expired access token",
        401
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = JWTUtil.verifyAccessToken(token);

        // Verify user still exists and is active
        await AuthService.getUserById(decoded.userId);

        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role || "user",
        };
      } catch (jwtError) {
        // Silently ignore invalid tokens for optional auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          "Authentication required",
          401
        )
      );
    }

    const userRole = req.user.role || "user";

    if (!roles.includes(userRole)) {
      return next(
        new AppError(
          ErrorType.AUTHORIZATION_ERROR,
          "Insufficient permissions",
          403
        )
      );
    }

    next();
  };
};

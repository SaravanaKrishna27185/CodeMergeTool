import bcrypt from "bcryptjs";
import { User } from "../models/user-model";
import { JWTUtil, JWTPayload, TokenPair } from "../utils/jwt";
import { AppError, ErrorType } from "../middleware/error-handler";

export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  };
  tokens: TokenPair;
}

/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        email: userData.email.toLowerCase(),
      });

      if (existingUser) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          "User with this email already exists",
          409
        );
      }

      // Create user (password will be hashed by User model middleware)
      const user = new User({
        email: userData.email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: "user",
        isActive: true,
      });

      await user.save();

      // Generate tokens
      const jwtPayload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const tokens = JWTUtil.generateTokenPair(jwtPayload);

      // Return user data and tokens (excluding sensitive information)
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.INTERNAL_ERROR,
        "Failed to register user",
        500,
        error
      );
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await User.findOne({
        email: credentials.email.toLowerCase(),
        isActive: true,
      }).select("+password");

      if (!user) {
        throw new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          "Invalid email or password",
          401
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password
      );
      if (!isPasswordValid) {
        throw new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          "Invalid email or password",
          401
        );
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const jwtPayload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const tokens = JWTUtil.generateTokenPair(jwtPayload);

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.INTERNAL_ERROR,
        "Failed to login user",
        500,
        error
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = JWTUtil.verifyRefreshToken(refreshToken);

      // Find user to ensure they still exist and are active
      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          "User not found or inactive",
          401
        );
      }

      // Generate new token pair
      const jwtPayload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      return JWTUtil.generateTokenPair(jwtPayload);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        "Invalid or expired refresh token",
        401,
        error
      );
    }
  }

  /**
   * Get user by ID (for middleware authentication)
   */
  static async getUserById(userId: string) {
    try {
      const user = await User.findById(userId).select("-password");
      if (!user || !user.isActive) {
        throw new AppError(
          ErrorType.NOT_FOUND_ERROR,
          "User not found or inactive",
          404
        );
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.INTERNAL_ERROR,
        "Failed to fetch user",
        500,
        error
      );
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): string[] {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return errors;
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Validate new password
      const passwordErrors = this.validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          "Password validation failed",
          400,
          { errors: passwordErrors }
        );
      }

      // Find user
      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new AppError(ErrorType.NOT_FOUND_ERROR, "User not found", 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw new AppError(
          ErrorType.AUTHENTICATION_ERROR,
          "Current password is incorrect",
          400
        );
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.password = hashedNewPassword;
      await user.save();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorType.INTERNAL_ERROR,
        "Failed to change password",
        500,
        error
      );
    }
  }
}

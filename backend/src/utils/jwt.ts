import jwt from "jsonwebtoken";
import { config } from "../config/config";

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT Utility class for token generation and validation
 */
export class JWTUtil {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = "24h"; // Increased from 15m for development
  private static readonly REFRESH_TOKEN_EXPIRES_IN = "7d";

  /**
   * Generate access token
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role || "user",
      },
      config.JWT_SECRET,
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: "code-merge-tool",
        audience: "code-merge-tool-users",
      }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        type: "refresh",
      },
      config.JWT_REFRESH_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: "code-merge-tool",
        audience: "code-merge-tool-users",
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: JWTPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: "code-merge-tool",
        audience: "code-merge-tool-users",
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: "code-merge-tool",
        audience: "code-merge-tool-users",
      }) as JWTPayload & { type: string };

      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get token expiration time
   */
  static getTokenExpirationTime(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) return true;
    return expirationTime <= new Date();
  }
}

import path from "path";
import { AppError, ErrorType } from "../middleware/error-handler";

/**
 * Validate branch name format to prevent command injection
 */
export function validateBranchName(branchName: string): boolean {
  // Allow alphanumeric characters, hyphens, underscores, forward slashes, and dots
  // Common Git branch naming patterns: feature/branch-name, bugfix/issue-123, v1.0.1, etc.
  return /^[a-zA-Z0-9_/.-]+$/.test(branchName);
}

/**
 * Validate and sanitize branch name, throwing error if invalid
 */
export function sanitizeBranchName(branchName: string): string {
  if (!branchName || typeof branchName !== "string") {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      "Branch name is required",
      400,
    );
  }

  const trimmed = branchName.trim();

  if (!validateBranchName(trimmed)) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      "Invalid branch name format. Only alphanumeric characters, hyphens, underscores, forward slashes, and dots are allowed.",
      400,
    );
  }

  return trimmed;
}

/**
 * Validate URL format to prevent injection
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !!parsed.hostname &&
      !url.includes(";") &&
      !url.includes("|") &&
      !url.includes("&") &&
      !url.includes("`")
    );
  } catch {
    return false;
  }
}

/**
 * Sanitize file path to prevent directory traversal attacks
 */
export function sanitizeFilePath(basePath: string, userPath: string): string {
  // Resolve to absolute paths
  const resolvedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(basePath, userPath);

  // Check if resolved path starts with base path (prevents ../ attacks)
  if (
    !resolvedPath.startsWith(resolvedBase + path.sep) &&
    resolvedPath !== resolvedBase
  ) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      "Path traversal detected - access denied",
      403,
    );
  }

  return resolvedPath;
}

/**
 * Sanitize commit message to prevent command injection
 */
export function sanitizeCommitMessage(message: string): string {
  if (!message || typeof message !== "string") {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      "Commit message is required",
      400,
    );
  }

  // Remove any shell metacharacters that could be used for injection
  const sanitized = message
    .replace(/[`$();&|<>]/g, "") // Remove shell metacharacters
    .trim();

  if (!sanitized) {
    throw new AppError(
      ErrorType.VALIDATION_ERROR,
      "Commit message cannot be empty after sanitization",
      400,
    );
  }

  return sanitized;
}

/**
 * Redact sensitive tokens from URLs for logging
 */
export function redactToken(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = "***";
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, attempt basic token redaction
    return url
      .replace(/:[^@]+@/, ":***@")
      .replace(/oauth2:[^@]+@/, "oauth2:***@");
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
  return emailRegex.test(email);
}

/**
 * Calculate Shannon entropy of a string (for password strength validation)
 */
export function calculateEntropy(str: string): number {
  const charFreq = new Map<string, number>();

  for (const char of str) {
    charFreq.set(char, (charFreq.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const freq of charFreq.values()) {
    const p = freq / str.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Validate secret has sufficient entropy
 */
export function validateSecretEntropy(
  secret: string,
  minEntropy: number = 4,
): boolean {
  return calculateEntropy(secret) >= minEntropy;
}

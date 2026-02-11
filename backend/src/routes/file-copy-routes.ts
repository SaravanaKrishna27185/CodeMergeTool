import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import { asyncHandler } from "../utils/async-handler";
import { AppError, ErrorType } from "../middleware/error-handler";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

interface FileCopyRequest {
  sourceDirectory: string;
  targetDirectory: string;
  selectedFiles: Array<{
    name: string;
    path: string;
    type: "file" | "folder";
    size?: number;
  }>;
}

interface FileCopyResponse {
  success: boolean;
  copiedFiles: number;
  skippedFiles: number;
  errors: string[];
}

/**
 * @route   POST /api/files/copy
 * @desc    Copy selected files from source to target directory
 * @access  Private
 */
router.post(
  "/copy",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceDirectory, targetDirectory, selectedFiles }: FileCopyRequest =
      req.body;

    // Validate required fields
    if (
      !sourceDirectory ||
      !targetDirectory ||
      !selectedFiles ||
      selectedFiles.length === 0
    ) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Source directory, target directory, and selected files are required",
        400
      );
    }

    // Validate paths for security
    const normalizedSource = path.normalize(sourceDirectory);
    const normalizedTarget = path.normalize(targetDirectory);

    if (normalizedSource.includes("..") || normalizedTarget.includes("..")) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Invalid directory paths",
        400
      );
    }

    let copiedFiles = 0;
    let skippedFiles = 0;
    const errors: string[] = [];

    try {
      // Ensure target directory exists
      await fs.mkdir(normalizedTarget, { recursive: true });

      // Copy each selected file
      for (const file of selectedFiles) {
        try {
          const sourcePath = path.join(normalizedSource, file.path);
          const targetPath = path.join(normalizedTarget, file.path);

          console.log(`[File Copy] Processing: ${file.name} (${file.type})`);
          console.log(`[File Copy] Source: ${sourcePath}`);
          console.log(`[File Copy] Target: ${targetPath}`);

          // Check if source file exists
          try {
            await fs.access(sourcePath);
          } catch (error) {
            console.error(`[File Copy] Source not found: ${sourcePath}`);
            errors.push(`Source file not found: ${file.path}`);
            skippedFiles++;
            continue;
          }

          // Ensure target directory structure exists
          const targetDir = path.dirname(targetPath);
          console.log(`[File Copy] Creating target directory: ${targetDir}`);
          await fs.mkdir(targetDir, { recursive: true });

          // Delete existing file/folder at target location if it exists
          try {
            await fs.access(targetPath);
            // Target exists, delete it first
            const targetStat = await fs.stat(targetPath);
            if (targetStat.isDirectory()) {
              await fs.rm(targetPath, { recursive: true, force: true });
            } else {
              await fs.unlink(targetPath);
            }
          } catch (error) {
            // Target doesn't exist, which is fine - we'll create it
          }

          if (file.type === "file") {
            // Copy file
            await fs.copyFile(sourcePath, targetPath);
            console.log(`[File Copy] Successfully copied file: ${file.path}`);
            copiedFiles++;
          } else if (file.type === "folder") {
            // Copy directory recursively
            await copyDirectoryRecursive(sourcePath, targetPath);
            console.log(
              `[File Copy] Successfully copied directory: ${file.path}`
            );
            copiedFiles++;
          }
        } catch (error: any) {
          errors.push(`Failed to copy ${file.path}: ${error.message}`);
          skippedFiles++;
        }
      }

      const response: FileCopyResponse = {
        success: errors.length === 0,
        copiedFiles,
        skippedFiles,
        errors,
      };

      res.status(200).json({
        success: true,
        message: `Copy operation completed. ${copiedFiles} files copied, ${skippedFiles} files skipped.`,
        data: response,
      });
    } catch (error: any) {
      throw new AppError(
        ErrorType.FILE_ERROR,
        `File copy operation failed: ${error.message}`,
        500,
        error
      );
    }
  })
);

/**
 * @route   GET /api/files/browse
 * @desc    Browse files in a directory
 * @access  Private
 */
router.get(
  "/browse",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { directory } = req.query;

    if (!directory || typeof directory !== "string") {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Directory path is required",
        400
      );
    }

    const normalizedPath = path.normalize(directory);

    if (normalizedPath.includes("..")) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Invalid directory path",
        400
      );
    }

    try {
      const files = await getDirectoryContents(normalizedPath);

      res.status(200).json({
        success: true,
        message: "Directory contents retrieved successfully",
        data: { files },
      });
    } catch (error: any) {
      throw new AppError(
        ErrorType.FILE_ERROR,
        `Failed to browse directory: ${error.message}`,
        500,
        error
      );
    }
  })
);

// Helper function to copy directory recursively
async function copyDirectoryRecursive(
  source: string,
  target: string
): Promise<void> {
  await fs.mkdir(target, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

// Helper function to get directory contents
async function getDirectoryContents(
  directoryPath: string,
  basePath: string = directoryPath
) {
  const files: Array<{
    name: string;
    path: string;
    type: "file" | "folder";
    size?: number;
  }> = [];

  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      // Convert Windows backslashes to forward slashes for consistency
      const normalizedPath = relativePath.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: normalizedPath,
          type: "folder",
        });

        // Recursively get subdirectory contents
        const subFiles = await getDirectoryContents(fullPath, basePath);
        files.push(...subFiles);
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: normalizedPath,
          type: "file",
          size: stats.size,
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to read directory: ${error}`);
  }

  return files;
}

export default router;

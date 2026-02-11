import { Request, Response } from "express";
import { PipelineRunService } from "../services/pipeline-run-service";
import { asyncHandler } from "../utils/async-handler";
import { logger } from "../config/logger";

/**
 * @route   GET /api/pipeline/stats
 * @desc    Get user's pipeline statistics
 * @access  Private
 */
export const getUserPipelineStats = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    try {
      const stats = await PipelineRunService.getUserPipelineStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get user pipeline stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve pipeline statistics",
      });
    }
  }
);

/**
 * @route   GET /api/pipeline/stats/global
 * @desc    Get global pipeline statistics (admin only)
 * @access  Private (Admin)
 */
export const getGlobalPipelineStats = asyncHandler(
  async (_req: Request, res: Response) => {
    // Note: Add admin check middleware here if needed

    try {
      const stats = await PipelineRunService.getGlobalPipelineStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get global pipeline stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve global statistics",
      });
    }
  }
);

/**
 * @route   GET /api/pipeline/runs
 * @desc    Get user's pipeline runs with pagination
 * @access  Private
 */
export const getUserPipelineRuns = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 10;

    try {
      const result = await PipelineRunService.getUserPipelineRuns(
        userId,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to get user pipeline runs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve pipeline runs",
      });
    }
  }
);

/**
 * @route   GET /api/pipeline/runs/:id
 * @desc    Get specific pipeline run details
 * @access  Private
 */
export const getPipelineRunDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const runId = req.params["id"];

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    if (!runId) {
      res.status(400).json({
        success: false,
        error: "Pipeline run ID is required",
      });
      return;
    }

    try {
      const pipelineRun = await PipelineRunService.getPipelineRun(runId);

      if (!pipelineRun) {
        res.status(404).json({
          success: false,
          error: "Pipeline run not found",
        });
        return;
      }

      // Check if the pipeline run belongs to the authenticated user
      if (pipelineRun.userId.toString() !== userId) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }

      console.log("📊 Sending pipeline run details:", {
        id: pipelineRun._id,
        status: pipelineRun.status,
        stepsCount: pipelineRun.steps.length,
        steps: pipelineRun.steps.map((s) => ({
          name: s.stepName,
          status: s.status,
        })),
      });

      res.status(200).json({
        success: true,
        data: pipelineRun,
      });
    } catch (error) {
      logger.error("Failed to get pipeline run details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve pipeline run details",
      });
    }
  }
);

/**
 * @route   POST /api/pipeline/cleanup
 * @desc    Cleanup old pipeline runs (admin only)
 * @access  Private (Admin)
 */
export const cleanupOldPipelineRuns = asyncHandler(
  async (req: Request, res: Response) => {
    // Note: Add admin check middleware here if needed

    const daysOld = parseInt(req.body.daysOld) || 30;

    try {
      const deletedCount = await PipelineRunService.cleanupOldRuns(daysOld);

      res.status(200).json({
        success: true,
        data: {
          deletedCount,
          message: `Successfully cleaned up ${deletedCount} old pipeline runs`,
        },
      });
    } catch (error) {
      logger.error("Failed to cleanup old pipeline runs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cleanup old pipeline runs",
      });
    }
  }
);

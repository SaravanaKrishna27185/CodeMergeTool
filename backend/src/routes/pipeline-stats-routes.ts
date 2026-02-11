import express from "express";
import {
  getUserPipelineStats,
  getGlobalPipelineStats,
  getUserPipelineRuns,
  getPipelineRunDetails,
  cleanupOldPipelineRuns,
} from "../controllers/pipeline-stats-controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/pipeline/stats
 * @desc    Get user's pipeline statistics
 * @access  Private
 */
router.get("/stats", getUserPipelineStats);

/**
 * @route   GET /api/pipeline/stats/global
 * @desc    Get global pipeline statistics (admin only)
 * @access  Private (Admin)
 */
router.get("/stats/global", getGlobalPipelineStats);

/**
 * @route   GET /api/pipeline/runs
 * @desc    Get user's pipeline runs with pagination
 * @access  Private
 */
router.get("/runs", getUserPipelineRuns);

/**
 * @route   GET /api/pipeline/runs/:id
 * @desc    Get specific pipeline run details
 * @access  Private
 */
router.get("/runs/:id", getPipelineRunDetails);

/**
 * @route   GET /api/pipeline/runs/:id/status
 * @desc    Get current status of a running pipeline
 * @access  Private
 */
router.get("/runs/:id/status", getPipelineRunDetails); // Same handler, lighter response

/**
 * @route   POST /api/pipeline/cleanup
 * @desc    Cleanup old pipeline runs (admin only)
 * @access  Private (Admin)
 */
router.post("/cleanup", cleanupOldPipelineRuns);

export default router;

import { Router } from "express";
import { Request, Response } from "express";
import { getDatabaseHealth, getDatabaseStats } from "../config/database";
import { asyncHandler } from "../utils/async-handler";
import { config } from "../config/config";

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Get application health status
 * @access  Public
 */
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const dbHealth = await getDatabaseHealth();

    const healthStatus = {
      status: dbHealth.status === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      version: "1.0.0",
      services: {
        database: dbHealth,
      },
    };

    // Set appropriate HTTP status based on health
    const statusCode = dbHealth.status === "healthy" ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  })
);

/**
 * @route   GET /api/health/database
 * @desc    Get detailed database health and statistics
 * @access  Private (for admin monitoring)
 */
router.get(
  "/database",
  asyncHandler(async (_req: Request, res: Response) => {
    const [dbHealth, dbStats] = await Promise.all([
      getDatabaseHealth(),
      getDatabaseStats(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        health: dbHealth,
        statistics: dbStats,
      },
    });
  })
);

export default router;

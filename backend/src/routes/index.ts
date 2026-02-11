import { Router } from "express";
import settingsRoutes from "./settings-routes";
import pipelineStatsRoutes from "./pipeline-stats-routes";

const router = Router();

router.use("/settings", settingsRoutes);
router.use("/pipeline-stats", pipelineStatsRoutes);

export default router;

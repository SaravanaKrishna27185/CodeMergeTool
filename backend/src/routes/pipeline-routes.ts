import { Router } from "express";
import { automatePipeline } from "../controllers/pipeline-controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

router.post("/automate", authMiddleware, automatePipeline);

export default router;

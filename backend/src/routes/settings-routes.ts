import { Router } from "express";
import {
  saveSettings,
  loadSettings,
} from "../controllers/pipeline-settings-controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

router.post("/pipeline", authMiddleware, saveSettings);
router.get("/pipeline", authMiddleware, loadSettings);

export default router;

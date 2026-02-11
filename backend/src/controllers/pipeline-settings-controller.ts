import { Request, Response } from "express";
import {
  savePipelineSettings,
  getPipelineSettings,
} from "../services/pipeline-settings-service";

export async function saveSettings(req: Request, res: Response) {
  try {
    // Type guard for req.user
    if (!req.user || !("userId" in req.user)) {
      res.status(401).json({ error: "Unauthorized: user not found" });
      return;
    }
    const userId = (req.user as any).userId;
    const settings = req.body;
    const savedSettings = await savePipelineSettings(userId, settings);

    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      data: savedSettings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    return;
  }
}

export async function loadSettings(req: Request, res: Response) {
  try {
    if (!req.user || !("userId" in req.user)) {
      res.status(401).json({ error: "Unauthorized: user not found" });
      return;
    }
    const userId = (req.user as any).userId;
    const settings = await getPipelineSettings(userId);

    // Return the settings directly, or null if none exist
    res.status(200).json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    return;
  }
}

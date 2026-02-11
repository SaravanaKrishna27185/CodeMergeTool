import mongoose from "mongoose";
import { PipelineRun, IPipelineRun } from "../models/pipeline-run-model";
import { logger } from "../config/logger";

export interface PipelineRunInput {
  userId: mongoose.Types.ObjectId;
  configuration: {
    githubRepoUrl: string;
    gitlabRepoUrl: string;
    gitlabBranchName: string;
    sourcePath: string;
    destinationPath: string;
    copyMode: string;
    mergeRequestTitle: string;
  };
}

export interface PipelineStepUpdate {
  stepName: string;
  status: "success" | "failed" | "in_progress" | "idle";
  message?: string;
  errorMessage?: string;
}

export interface PipelineStats {
  successful: number;
  failed: number;
  inProgress: number;
  total: number;
  avgDuration: number;
  recentRuns: Array<{
    id: string;
    status: string;
    startTime: Date;
    duration: number | undefined;
    configuration: {
      githubRepoUrl: string;
      gitlabBranchName: string;
      mergeRequestTitle: string;
    };
  }>;
}

export class PipelineRunService {
  /**
   * Create a new pipeline run
   */
  static async createPipelineRun(
    input: PipelineRunInput
  ): Promise<IPipelineRun> {
    try {
      const pipelineRun = new PipelineRun({
        userId: input.userId,
        status: "in_progress",
        startTime: new Date(),
        configuration: input.configuration,
        steps: [
          { stepName: "clone-github", status: "idle" },
          { stepName: "create-gitlab-branch", status: "idle" },
          { stepName: "copy-files", status: "idle" },
          { stepName: "commit-changes", status: "idle" },
          { stepName: "create-merge-request", status: "idle" },
        ],
      });

      await pipelineRun.save();
      logger.info(`Created new pipeline run: ${pipelineRun._id}`);
      return pipelineRun;
    } catch (error) {
      logger.error("Failed to create pipeline run:", error);
      throw error;
    }
  }

  /**
   * Update pipeline run status
   */
  static async updatePipelineRunStatus(
    runId: string,
    status: "success" | "failed" | "in_progress",
    errorDetails?: { step: string; message: string; stack?: string }
  ): Promise<IPipelineRun> {
    try {
      const updateData: any = { status };

      if (status === "success" || status === "failed") {
        updateData.endTime = new Date();
      }

      if (errorDetails) {
        updateData.errorDetails = errorDetails;
      }

      const pipelineRun = await PipelineRun.findByIdAndUpdate(
        runId,
        updateData,
        { new: true }
      );

      if (!pipelineRun) {
        throw new Error(`Pipeline run not found: ${runId}`);
      }

      // Calculate duration if completed
      if (pipelineRun.endTime && pipelineRun.startTime) {
        pipelineRun.duration =
          pipelineRun.endTime.getTime() - pipelineRun.startTime.getTime();
        await pipelineRun.save();
      }

      logger.info(`Updated pipeline run ${runId} status to: ${status}`);
      return pipelineRun;
    } catch (error) {
      logger.error(`Failed to update pipeline run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Update specific step status
   */
  static async updateStepStatus(
    runId: string,
    stepUpdate: PipelineStepUpdate
  ): Promise<IPipelineRun> {
    try {
      const pipelineRun = await PipelineRun.findById(runId);

      if (!pipelineRun) {
        throw new Error(`Pipeline run not found: ${runId}`);
      }

      // Update step status directly
      const step = pipelineRun.steps.find(
        (s) => s.stepName === stepUpdate.stepName
      );
      if (step) {
        const now = new Date();

        if (stepUpdate.status === "in_progress" && !step.startTime) {
          step.startTime = now;
        } else if (
          (stepUpdate.status === "success" || stepUpdate.status === "failed") &&
          step.startTime &&
          !step.endTime
        ) {
          step.endTime = now;
          step.duration = now.getTime() - step.startTime.getTime();
        }

        step.status = stepUpdate.status;
        if (stepUpdate.message) step.message = stepUpdate.message;
        if (stepUpdate.errorMessage)
          step.errorMessage = stepUpdate.errorMessage;
      }

      await pipelineRun.save();
      logger.info(
        `Updated step ${stepUpdate.stepName} to ${stepUpdate.status} for run ${runId}`
      );
      return pipelineRun;
    } catch (error) {
      logger.error(`Failed to update step status for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Update pipeline results
   */
  static async updatePipelineResults(
    runId: string,
    results: {
      filesProcessed?: number;
      directoriesCopied?: number;
      mergeRequestId?: string;
      mergeRequestUrl?: string;
    }
  ): Promise<IPipelineRun> {
    try {
      const pipelineRun = await PipelineRun.findByIdAndUpdate(
        runId,
        { $set: { results } },
        { new: true }
      );

      if (!pipelineRun) {
        throw new Error(`Pipeline run not found: ${runId}`);
      }

      logger.info(`Updated results for pipeline run ${runId}`);
      return pipelineRun;
    } catch (error) {
      logger.error(`Failed to update results for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Get pipeline run by ID
   */
  static async getPipelineRun(runId: string): Promise<IPipelineRun | null> {
    try {
      return await PipelineRun.findById(runId);
    } catch (error) {
      logger.error(`Failed to get pipeline run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's pipeline runs with pagination
   */
  static async getUserPipelineRuns(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ runs: IPipelineRun[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [runs, total] = await Promise.all([
        PipelineRun.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PipelineRun.countDocuments({ userId }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return { runs, total, totalPages };
    } catch (error) {
      logger.error(`Failed to get pipeline runs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's pipeline statistics
   */
  static async getUserPipelineStats(userId: string): Promise<PipelineStats> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Get basic stats
      const basicStats = await (PipelineRun as any).getUserStats(userObjectId);

      // Get recent runs (last 5)
      const recentRuns = await PipelineRun.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "_id status startTime duration configuration.githubRepoUrl configuration.gitlabBranchName configuration.mergeRequestTitle"
        )
        .lean();

      const formattedRecentRuns = recentRuns.map((run) => ({
        id: run._id.toString(),
        status: run.status,
        startTime: run.startTime,
        duration: run.duration,
        configuration: {
          githubRepoUrl: run.configuration.githubRepoUrl,
          gitlabBranchName: run.configuration.gitlabBranchName,
          mergeRequestTitle: run.configuration.mergeRequestTitle,
        },
      }));

      return {
        successful: basicStats.successful,
        failed: basicStats.failed,
        inProgress: basicStats.inProgress,
        total: basicStats.total,
        avgDuration: Math.round(basicStats.avgDuration || 0),
        recentRuns: formattedRecentRuns,
      };
    } catch (error) {
      logger.error(`Failed to get pipeline stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get global pipeline statistics (admin only)
   */
  static async getGlobalPipelineStats(): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    inProgressRuns: number;
    avgDuration: number;
    totalUsers: number;
  }> {
    try {
      const stats = await PipelineRun.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgDuration: { $avg: "$duration" },
          },
        },
      ]);

      const userCount = await PipelineRun.distinct("userId").then(
        (users) => users.length
      );

      const result = {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        inProgressRuns: 0,
        avgDuration: 0,
        totalUsers: userCount,
      };

      stats.forEach((stat) => {
        switch (stat._id) {
          case "success":
            result.successfulRuns = stat.count;
            result.avgDuration = Math.round(stat.avgDuration || 0);
            break;
          case "failed":
            result.failedRuns = stat.count;
            break;
          case "in_progress":
            result.inProgressRuns = stat.count;
            break;
        }
      });

      result.totalRuns =
        result.successfulRuns + result.failedRuns + result.inProgressRuns;

      return result;
    } catch (error) {
      logger.error("Failed to get global pipeline stats:", error);
      throw error;
    }
  }

  /**
   * Delete old pipeline runs (cleanup)
   */
  static async cleanupOldRuns(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await PipelineRun.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ["success", "failed"] }, // Keep in-progress runs
      });

      logger.info(`Cleaned up ${result.deletedCount} old pipeline runs`);
      return result.deletedCount;
    } catch (error) {
      logger.error("Failed to cleanup old pipeline runs:", error);
      throw error;
    }
  }
}

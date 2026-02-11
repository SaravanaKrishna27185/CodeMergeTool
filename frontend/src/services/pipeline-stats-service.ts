import apiClient from "../lib/api";

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

export interface PipelineRun {
  id: string;
  userId: string;
  status: "success" | "failed" | "in_progress" | "idle";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  configuration: {
    githubRepoUrl: string;
    gitlabBranchName: string;
    mergeRequestTitle: string;
  };
  steps: Array<{
    stepName: string;
    status: "idle" | "failed" | "success" | "in_progress";
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    message?: string;
    errorMessage?: string;
  }>;
  results?: {
    filesProcessed?: number;
    directoriesCopied?: number;
    mergeRequestId?: number;
    mergeRequestUrl?: string;
  };
  error?: {
    step: string;
    message: string;
    stack?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completionPercentage: number;
}

export interface PaginatedPipelineRuns {
  runs: PipelineRun[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class PipelineStatsService {
  /**
   * Get user's pipeline statistics
   */
  static async getUserPipelineStats(): Promise<PipelineStats> {
    try {
      const response = await apiClient.get("/pipeline-stats/stats");
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch user pipeline stats:", error);
      throw error;
    }
  }

  /**
   * Get global pipeline statistics (admin only)
   */
  static async getGlobalPipelineStats(): Promise<PipelineStats> {
    try {
      const response = await apiClient.get("/pipeline-stats/stats/global");
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch global pipeline stats:", error);
      throw error;
    }
  }

  /**
   * Get user's pipeline runs with pagination
   */
  static async getUserPipelineRuns(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedPipelineRuns> {
    try {
      const response = await apiClient.get("/pipeline-stats/runs", {
        params: { page, limit },
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch user pipeline runs:", error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific pipeline run
   */
  static async getPipelineRunDetails(runId: string): Promise<PipelineRun> {
    try {
      const response = await apiClient.get(`/pipeline-stats/runs/${runId}`);
      console.log("🔍 Raw API response for pipeline run:", response.data);

      // Handle the response structure: { success: true, data: pipelineRun }
      const pipelineRunData = response.data.data;

      // Transform the data to match our PipelineRun interface
      const transformedRun: PipelineRun = {
        id: pipelineRunData._id,
        userId: pipelineRunData.userId,
        status: pipelineRunData.status,
        startTime: new Date(
          pipelineRunData.startTime || pipelineRunData.createdAt
        ),
        endTime: pipelineRunData.endTime
          ? new Date(pipelineRunData.endTime)
          : undefined,
        duration: pipelineRunData.duration,
        configuration: pipelineRunData.configuration || {},
        steps: pipelineRunData.steps || [],
        results: pipelineRunData.results,
        error: pipelineRunData.error,
        createdAt: new Date(pipelineRunData.createdAt),
        updatedAt: new Date(pipelineRunData.updatedAt),
        completionPercentage: pipelineRunData.completionPercentage || 0,
      };

      console.log("🔄 Transformed pipeline run data:", transformedRun);
      return transformedRun;
    } catch (error) {
      console.error("Failed to fetch pipeline run details:", error);
      throw error;
    }
  }

  /**
   * Format duration from milliseconds to human readable format
   */
  static formatDuration(duration?: number): string {
    if (!duration) return "N/A";

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Poll for pipeline run status updates
   */
  static async pollPipelineStatus(
    runId: string,
    onUpdate: (run: PipelineRun) => void,
    onComplete: (run: PipelineRun) => void,
    onError: (error: any) => void
  ): Promise<() => void> {
    let polling = true;

    const poll = async () => {
      try {
        if (!polling) return;

        const run = await this.getPipelineRunDetails(runId);
        console.log(
          "🔍 Raw pipeline run data from API:",
          JSON.stringify(run, null, 2)
        );

        // Always update with current status
        onUpdate(run);

        // Check if pipeline is complete
        // A pipeline is complete when:
        // 1. Overall status is success or failed, OR
        // 2. All steps have completed (either success or failed)
        const allStepsCompleted = run.steps.every(
          (step) => step.status === "success" || step.status === "failed"
        );
        const pipelineCompleted =
          run.status === "success" ||
          run.status === "failed" ||
          allStepsCompleted;

        console.log("🔍 Completion check:", {
          pipelineStatus: run.status,
          allStepsCompleted,
          pipelineCompleted,
          stepStatuses: run.steps.map((s) => ({
            name: s.stepName,
            status: s.status,
          })),
        });

        if (pipelineCompleted) {
          console.log("🎉 Pipeline completed with status:", run.status);
          console.log(
            "🔍 Final step statuses:",
            run.steps.map((s) => ({ name: s.stepName, status: s.status }))
          );

          // Do one final update to ensure UI reflects final state
          onUpdate(run);

          // Stop polling and call completion after ensuring the final update is processed
          setTimeout(() => {
            polling = false;
            onComplete(run);
          }, 100);
          return;
        }

        // Continue polling if still in progress
        if (polling) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        if (polling) {
          onError(error);
          polling = false;
        }
      }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      polling = false;
    };
  }

  /**
   * Get status color for UI display
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "idle":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }

  /**
   * Get status icon for UI display
   */
  static getStatusIcon(status: string): string {
    switch (status) {
      case "success":
        return "✓";
      case "failed":
        return "✗";
      case "in_progress":
        return "⏳";
      case "idle":
        return "⏸";
      default:
        return "?";
    }
  }
}

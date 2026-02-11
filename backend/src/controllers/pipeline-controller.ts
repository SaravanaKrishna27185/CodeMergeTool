import { Request, Response } from "express";
import { runPipeline } from "../services/pipeline-service";
import { PipelineRunService } from "../services/pipeline-run-service";
import mongoose from "mongoose";

export async function automatePipeline(
  req: Request,
  res: Response
): Promise<void> {
  let pipelineRunId: string | null = null;

  try {
    console.log("Pipeline automation request received:", {
      hasAuth: !!req.user,
      userEmail: req.user?.email,
    });

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Create pipeline run record
    const pipelineRun = await PipelineRunService.createPipelineRun({
      userId: new mongoose.Types.ObjectId(userId),
      configuration: {
        githubRepoUrl: req.body.githubRepoUrl,
        gitlabRepoUrl: req.body.gitlabRepoUrl,
        gitlabBranchName: req.body.gitlabBranchName,
        sourcePath: req.body.sourcePath,
        destinationPath: req.body.destinationPath,
        copyMode: req.body.copyMode,
        mergeRequestTitle: req.body.mergeRequest?.title || "Automated Pipeline",
      },
    });

    pipelineRunId = pipelineRun._id.toString();

    // Return pipeline run ID immediately for frontend polling
    res.status(202).json({
      pipelineRunId,
      message: "Pipeline execution started",
      status: "in_progress",
    });

    // Execute pipeline asynchronously
    try {
      console.log("🚀 Starting pipeline execution for run ID:", pipelineRunId);
      const result = await runPipeline(req.body, pipelineRunId);
      console.log(
        "✅ Pipeline execution completed with",
        result.length,
        "steps"
      );
      console.log(
        "📊 Step results summary:",
        result.map((step) => ({ step: step.step, status: step.status }))
      );

      // Update pipeline run status based on results
      const hasErrors = result.some((step) => step.status === "error");
      const finalStatus = hasErrors ? "failed" : "success";

      console.log("🔍 Error check results:", { hasErrors, finalStatus });
      console.log(
        "📋 All step statuses:",
        result.map((r) => `${r.step}: ${r.status}`)
      );

      // Extract results data
      const resultsData: any = {};
      const copyStep = result.find((step) => step.step === "copy-files");
      const mrStep = result.find(
        (step) => step.step === "create-merge-request"
      );

      if (copyStep && copyStep.data) {
        resultsData.filesProcessed = copyStep.data.filesProcessed;
        resultsData.directoriesCopied = copyStep.data.directoriesCopied;
      }

      if (mrStep && mrStep.data) {
        resultsData.mergeRequestId = mrStep.data.mergeRequest?.id;
        resultsData.mergeRequestUrl = mrStep.data.mergeRequest?.web_url;
      }

      console.log("🔄 Updating pipeline run status to:", finalStatus);

      // Update final status and results
      await PipelineRunService.updatePipelineRunStatus(
        pipelineRunId,
        finalStatus,
        hasErrors
          ? {
              step:
                result.find((step) => step.status === "error")?.step ||
                "unknown",
              message:
                result.find((step) => step.status === "error")?.message ||
                "Unknown error",
            }
          : undefined
      );

      console.log(
        "✅ Pipeline run status updated successfully to:",
        finalStatus
      );

      if (Object.keys(resultsData).length > 0) {
        await PipelineRunService.updatePipelineResults(
          pipelineRunId,
          resultsData
        );
        console.log(
          "📊 Pipeline results updated with:",
          Object.keys(resultsData)
        );
      }
    } catch (pipelineError) {
      console.error("Background pipeline execution failed:", pipelineError);

      // Update pipeline as failed
      if (pipelineRunId) {
        try {
          await PipelineRunService.updatePipelineRunStatus(
            pipelineRunId,
            "failed",
            {
              step: "pipeline-execution",
              message: String(pipelineError),
              ...(pipelineError instanceof Error &&
                pipelineError.stack && { stack: pipelineError.stack }),
            }
          );
        } catch (updateError) {
          console.error("Failed to update pipeline run status:", updateError);
        }
      }
    }
  } catch (err: any) {
    console.error("Pipeline automation error:", err);

    // If we haven't sent a response yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

import mongoose, { Document, Schema } from "mongoose";

export interface IPipelineRun extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: "success" | "failed" | "in_progress";
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  steps: {
    stepName: string;
    status: "success" | "failed" | "in_progress" | "idle";
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    message?: string;
    errorMessage?: string;
  }[];
  configuration: {
    githubRepoUrl: string;
    gitlabRepoUrl: string;
    gitlabBranchName: string;
    sourcePath: string;
    destinationPath: string;
    copyMode: string;
    mergeRequestTitle: string;
  };
  results?: {
    filesProcessed?: number;
    directoriesCopied?: number;
    mergeRequestId?: string;
    mergeRequestUrl?: string;
  };
  errorDetails?: {
    step: string;
    message: string;
    stack?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const pipelineStepSchema = new Schema({
  stepName: {
    type: String,
    required: true,
    enum: [
      "clone-github",
      "create-gitlab-branch",
      "copy-files",
      "commit-changes",
      "create-merge-request",
    ],
  },
  status: {
    type: String,
    required: true,
    enum: ["success", "failed", "in_progress", "idle"],
    default: "idle",
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // milliseconds
  },
  message: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
});

const pipelineRunSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "failed", "in_progress"],
      default: "in_progress",
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },
    steps: [pipelineStepSchema],
    configuration: {
      githubRepoUrl: {
        type: String,
        required: true,
      },
      gitlabRepoUrl: {
        type: String,
        required: true,
      },
      gitlabBranchName: {
        type: String,
        required: true,
      },
      sourcePath: {
        type: String,
        required: true,
      },
      destinationPath: {
        type: String,
        required: true,
      },
      copyMode: {
        type: String,
        required: true,
      },
      mergeRequestTitle: {
        type: String,
        required: true,
      },
    },
    results: {
      filesProcessed: {
        type: Number,
        default: 0,
      },
      directoriesCopied: {
        type: Number,
        default: 0,
      },
      mergeRequestId: {
        type: String,
      },
      mergeRequestUrl: {
        type: String,
      },
    },
    errorDetails: {
      step: {
        type: String,
      },
      message: {
        type: String,
      },
      stack: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        delete ret["__v"];
        return ret;
      },
    },
  }
);

// Indexes for performance
pipelineRunSchema.index({ userId: 1, status: 1 });
pipelineRunSchema.index({ userId: 1, createdAt: -1 });
pipelineRunSchema.index({ status: 1, createdAt: -1 });
pipelineRunSchema.index({ "steps.status": 1 });

// Virtual for completion percentage
pipelineRunSchema.virtual("completionPercentage").get(function () {
  const totalSteps = this.steps.length;
  if (totalSteps === 0) return 0;

  const completedSteps = this.steps.filter(
    (step) => step.status === "success"
  ).length;
  return Math.round((completedSteps / totalSteps) * 100);
});

// Method to calculate duration
pipelineRunSchema.methods["calculateDuration"] = function (this: IPipelineRun) {
  if (this.endTime && this.startTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }
  return this.duration;
};

// Method to update step status
pipelineRunSchema.methods["updateStepStatus"] = function (
  this: IPipelineRun,
  stepName: string,
  status: "idle" | "failed" | "success" | "in_progress",
  message?: string,
  errorMessage?: string
) {
  const step = this.steps.find((s: any) => s.stepName === stepName);
  if (step) {
    const now = new Date();

    if (status === "in_progress" && !step.startTime) {
      step.startTime = now;
    } else if (
      (status === "success" || status === "failed") &&
      step.startTime &&
      !step.endTime
    ) {
      step.endTime = now;
      step.duration = now.getTime() - step.startTime.getTime();
    }

    step.status = status;
    if (message) step.message = message;
    if (errorMessage) step.errorMessage = errorMessage;
  }
};

// Static method to get user statistics
pipelineRunSchema.statics["getUserStats"] = async function (
  this: mongoose.Model<IPipelineRun>,
  userId: mongoose.Types.ObjectId
) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgDuration: { $avg: "$duration" },
      },
    },
  ]);

  const result = {
    successful: 0,
    failed: 0,
    inProgress: 0,
    total: 0,
    avgDuration: 0,
  };

  stats.forEach((stat) => {
    switch (stat._id) {
      case "success":
        result.successful = stat.count;
        result.avgDuration = stat.avgDuration || 0;
        break;
      case "failed":
        result.failed = stat.count;
        break;
      case "in_progress":
        result.inProgress = stat.count;
        break;
    }
  });

  result.total = result.successful + result.failed + result.inProgress;

  return result;
};

export const PipelineRun = mongoose.model<IPipelineRun>(
  "PipelineRun",
  pipelineRunSchema
);

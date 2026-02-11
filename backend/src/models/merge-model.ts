import mongoose, { Schema, Document } from "mongoose";

// File operation interface
export interface IFileOperation {
  path: string;
  action: "add" | "modify" | "delete" | "rename";
  content?: string;
  encoding?: string;
  oldPath?: string; // For rename operations
  size?: number;
  hash?: string;
}

// Conflict interface
export interface IConflict {
  path: string;
  type: "content" | "rename" | "delete";
  status: "pending" | "resolved" | "ignored";
  sourceContent?: string;
  targetContent?: string;
  resolvedContent?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
}

// Merge interface
export interface IMerge extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceRepositoryId: mongoose.Types.ObjectId;
  targetRepositoryId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  status:
    | "draft"
    | "ready"
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled";
  fileOperations: IFileOperation[];
  conflicts: IConflict[];
  mergeRequestId?: string; // External merge request ID (GitHub PR, GitLab MR)
  mergeRequestUrl?: string;
  statistics: {
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
    conflictsCount: number;
    resolvedConflictsCount: number;
  };
  completedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// File operation schema
const fileOperationSchema = new Schema<IFileOperation>(
  {
    path: {
      type: String,
      required: [true, "File path is required"],
    },
    action: {
      type: String,
      enum: ["add", "modify", "delete", "rename"],
      required: [true, "File action is required"],
    },
    content: {
      type: String,
    },
    encoding: {
      type: String,
      default: "utf8",
    },
    oldPath: {
      type: String,
    },
    size: {
      type: Number,
      min: 0,
    },
    hash: {
      type: String,
    },
  },
  { _id: false }
);

// Conflict schema
const conflictSchema = new Schema<IConflict>(
  {
    path: {
      type: String,
      required: [true, "Conflict path is required"],
    },
    type: {
      type: String,
      enum: ["content", "rename", "delete"],
      required: [true, "Conflict type is required"],
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "ignored"],
      default: "pending",
    },
    sourceContent: {
      type: String,
    },
    targetContent: {
      type: String,
    },
    resolvedContent: {
      type: String,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Statistics schema
const statisticsSchema = new Schema(
  {
    filesChanged: {
      type: Number,
      default: 0,
      min: 0,
    },
    linesAdded: {
      type: Number,
      default: 0,
      min: 0,
    },
    linesDeleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    conflictsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    resolvedConflictsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// Merge schema
const mergeSchema = new Schema<IMerge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    sourceRepositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: [true, "Source repository ID is required"],
    },
    targetRepositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: [true, "Target repository ID is required"],
    },
    title: {
      type: String,
      required: [true, "Merge title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    sourceBranch: {
      type: String,
      required: [true, "Source branch is required"],
      default: "main",
    },
    targetBranch: {
      type: String,
      required: [true, "Target branch is required"],
      default: "main",
    },
    status: {
      type: String,
      enum: [
        "draft",
        "ready",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "draft",
    },
    fileOperations: [fileOperationSchema],
    conflicts: [conflictSchema],
    mergeRequestId: {
      type: String,
    },
    mergeRequestUrl: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Please provide a valid URL",
      },
    },
    statistics: {
      type: statisticsSchema,
      default: () => ({}),
    },
    completedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      maxlength: [1000, "Failure reason cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret["__v"];
        return ret;
      },
    },
  }
);

// Indexes
mergeSchema.index({ userId: 1, status: 1 });
mergeSchema.index({ sourceRepositoryId: 1 });
mergeSchema.index({ targetRepositoryId: 1 });
mergeSchema.index({ status: 1 });
mergeSchema.index({ createdAt: -1 });
mergeSchema.index({ completedAt: -1 });

// Virtual for completion percentage
mergeSchema.virtual("completionPercentage").get(function () {
  if (this.statistics.conflictsCount === 0) return 100;
  return Math.round(
    (this.statistics.resolvedConflictsCount / this.statistics.conflictsCount) *
      100
  );
});

// Virtual for pending conflicts
mergeSchema.virtual("pendingConflicts").get(function () {
  return this.conflicts.filter(
    (conflict: IConflict) => conflict.status === "pending"
  );
});

// Ensure virtual fields are serialized
mergeSchema.set("toJSON", { virtuals: true });

export const Merge = mongoose.model<IMerge>("Merge", mergeSchema);

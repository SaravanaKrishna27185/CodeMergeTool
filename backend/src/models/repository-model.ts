import mongoose, { Schema, Document } from "mongoose";

// Repository interface
export interface IRepository extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  platform: "github" | "gitlab";
  url: string;
  cloneUrl: string;
  localPath?: string;
  branch: string;
  description?: string;
  isPrivate: boolean;
  lastSyncAt?: Date;
  syncStatus: "idle" | "syncing" | "failed" | "success";
  metadata: {
    owner: string;
    fullName: string;
    language?: string;
    stars?: number;
    forks?: number;
    size?: number;
    lastPush?: Date;
  };
  webhookId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Repository metadata schema
const repositoryMetadataSchema = new Schema(
  {
    owner: {
      type: String,
      required: [true, "Repository owner is required"],
    },
    fullName: {
      type: String,
      required: [true, "Repository full name is required"],
    },
    language: {
      type: String,
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 0,
    },
    lastPush: {
      type: Date,
    },
  },
  { _id: false }
);

// Repository schema
const repositorySchema = new Schema<IRepository>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Repository name is required"],
      trim: true,
      maxlength: [100, "Repository name cannot exceed 100 characters"],
    },
    platform: {
      type: String,
      enum: ["github", "gitlab"],
      required: [true, "Platform is required"],
    },
    url: {
      type: String,
      required: [true, "Repository URL is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please provide a valid URL",
      },
    },
    cloneUrl: {
      type: String,
      required: [true, "Clone URL is required"],
    },
    localPath: {
      type: String,
    },
    branch: {
      type: String,
      required: [true, "Branch is required"],
      default: "main",
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ["idle", "syncing", "failed", "success"],
      default: "idle",
    },
    metadata: {
      type: repositoryMetadataSchema,
      required: true,
    },
    webhookId: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
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
repositorySchema.index({ userId: 1, platform: 1 });
repositorySchema.index({ "metadata.fullName": 1 }, { unique: true });
repositorySchema.index({ syncStatus: 1 });
repositorySchema.index({ lastSyncAt: -1 });
repositorySchema.index({ createdAt: -1 });

// Virtual for display name
repositorySchema.virtual("displayName").get(function () {
  return this.metadata.fullName || this.name;
});

// Ensure virtual fields are serialized
repositorySchema.set("toJSON", { virtuals: true });

export const Repository = mongoose.model<IRepository>(
  "Repository",
  repositorySchema
);

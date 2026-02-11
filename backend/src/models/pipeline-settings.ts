import mongoose, { Schema, Document } from "mongoose";

export interface PipelineSettings extends Document {
  userId: string;
  githubRepoUrl: string;
  githubAccessToken: string;
  githubDownloadLocation: string;
  gitlabRepoUrl: string;
  gitlabAccessToken: string;
  gitlabBranchName: string;
  gitlabBaseBranch: string;
  gitlabCheckoutLocation: string;
  sourcePath: string;
  destinationPath: string;
  files: string;
  copyMode: string; // "files" | "folders" | "mixed"
  preserveFolderStructure: boolean;
  includeFolders: string;
  excludePatterns: string;
  mergeRequestSourceBranch: string;
  mergeRequestTargetBranch: string;
  mergeRequestTitle: string;
  mergeRequestDescription: string;
  mergeRequestCheckoutLocation: string;
  commitMessage: string;
  changesDescription: string;
}

const PipelineSettingsSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  githubRepoUrl: { type: String },
  githubAccessToken: { type: String },
  githubDownloadLocation: {
    type: String,
    default:
      process.env["NODE_ENV"] === "production"
        ? "/app/repositories/github"
        : process.platform === "win32"
          ? `${process.env["USERPROFILE"] || "C:\\Users\\Default"}\\Downloads\\GitRepos`
          : `${process.env["HOME"] || "/tmp"}/Downloads/GitRepos`,
  },
  gitlabRepoUrl: { type: String },
  gitlabAccessToken: { type: String },
  gitlabBranchName: { type: String },
  gitlabBaseBranch: { type: String },
  gitlabCheckoutLocation: {
    type: String,
    default:
      process.env["NODE_ENV"] === "production"
        ? "/app/repositories/gitlab"
        : process.platform === "win32"
          ? `${process.env["USERPROFILE"] || "C:\\Users\\Default"}\\Documents\\GitLab`
          : `${process.env["HOME"] || "/tmp"}/Documents/GitLab`,
  },
  sourcePath: { type: String },
  destinationPath: { type: String },
  files: { type: String },
  copyMode: { type: String, default: "files" },
  preserveFolderStructure: { type: Boolean, default: true },
  includeFolders: { type: String },
  excludePatterns: {
    type: String,
    default: "node_modules,.git,.DS_Store,*.log",
  },
  mergeRequestSourceBranch: { type: String },
  mergeRequestTargetBranch: { type: String },
  mergeRequestTitle: { type: String },
  mergeRequestDescription: { type: String },
  mergeRequestCheckoutLocation: {
    type: String,
    default:
      process.platform === "win32"
        ? `${process.env["USERPROFILE"] || "C:\\Users\\Default"}\\Documents\\MergeRequests\\GitLab`
        : `${process.env["HOME"] || "/tmp"}/Documents/MergeRequests/GitLab`,
  },
  commitMessage: {
    type: String,
    default: "feat: Update from automated pipeline",
  },
  changesDescription: {
    type: String,
    default: "Automated changes from pipeline",
  },
});

export default mongoose.model<PipelineSettings>(
  "PipelineSettings",
  PipelineSettingsSchema
);

import apiClient, { API_ENDPOINTS } from "@/lib/api";

export interface PipelineSettings {
  githubRepoUrl: string;
  githubAccessToken: string;
  githubDownloadLocation: string; // New: Local path where GitHub repo should be downloaded
  gitlabRepoUrl: string;
  gitlabAccessToken: string;
  gitlabBranchName: string;
  gitlabBaseBranch: string;
  gitlabCheckoutLocation: string; // New: Local path where GitLab branch should be checked out
  sourcePath: string;
  destinationPath: string;
  files: string;
  copyMode: "files" | "folders" | "mixed"; // New: Copy mode selection
  preserveFolderStructure: boolean; // New: Whether to preserve folder structure
  includeFolders: string; // New: Comma-separated list of folders to include
  excludePatterns: string; // New: Patterns to exclude (e.g., node_modules, .git)
  mergeRequestSourceBranch: string;
  mergeRequestTargetBranch: string;
  mergeRequestTitle: string;
  mergeRequestDescription: string;
  mergeRequestCheckoutLocation: string; // New: Local path where merge request changes are managed
  commitMessage: string; // New: Commit message for changes
  changesDescription: string; // New: Description of changes made
}

export const settingsService = {
  /**
   * Load pipeline settings for the current user
   */
  async loadPipelineSettings(): Promise<PipelineSettings | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SETTINGS.PIPELINE);
      return response.data;
    } catch (error) {
      console.error("Failed to load pipeline settings:", error);
      throw error;
    }
  },

  /**
   * Save pipeline settings for the current user
   */
  async savePipelineSettings(
    settings: PipelineSettings
  ): Promise<{ success: boolean; message: string; data: PipelineSettings }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.SETTINGS.PIPELINE,
        settings
      );
      return response.data;
    } catch (error) {
      console.error("Failed to save pipeline settings:", error);
      throw error;
    }
  },
};

export default settingsService;

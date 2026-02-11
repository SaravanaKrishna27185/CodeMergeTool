import apiClient from "@/lib/api";

interface GitLabBranchRequest {
  gitlabUrl: string;
  accessToken: string;
  newBranchName: string;
  baseBranch: string;
  checkoutAfterCreation: boolean;
  localDirectory: string;
}

interface GitLabSyncRequest {
  localPath: string;
  gitlabUrl: string;
  accessToken: string;
  targetBranch: string;
  commitMessage: string;
  mergeRequestTitle: string;
  mergeRequestDescription: string;
  sourceBranchName: string;
}

interface GitLabTestConnectionRequest {
  gitlabUrl: string;
  accessToken: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class GitLabService {
  // Use main API client which already has auth configured
  private async makeRequest<T>(
    endpoint: string,
    data: any = {},
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST"
  ): Promise<ApiResponse<T>> {
    try {
      console.log(
        `[GitLab Service] Making ${method} request to: /gitlab${endpoint}`
      );
      console.log(`[GitLab Service] Request data:`, data);

      const response =
        method === "GET"
          ? await apiClient.get(`/gitlab${endpoint}`)
          : await apiClient.post(`/gitlab${endpoint}`, data);

      console.log(`[GitLab Service] Response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`GitLab API Error [${endpoint}]:`, error);

      // Enhanced error handling
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);

        // Return more specific error message
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `API Error: ${error.response.status}`;

        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
        };
      } else if (error.request) {
        console.error("Network error - no response received:", error.request);
        return {
          success: false,
          message:
            "Network error: Failed to connect to server. Please check your connection and try again.",
          error: "Network error",
        };
      } else {
        console.error("Request setup error:", error.message);
        return {
          success: false,
          message:
            error.message ||
            "Failed to sync repository. Please check your connection and try again.",
          error: error.message,
        };
      }
    }
  }

  /**
   * Test GitLab connection
   */
  async testConnection(
    data: GitLabTestConnectionRequest
  ): Promise<ApiResponse> {
    return this.makeRequest("/test-connection", data);
  }

  /**
   * Create a new branch in GitLab
   */
  async createBranch(data: GitLabBranchRequest): Promise<ApiResponse> {
    return this.makeRequest("/create-branch", data);
  }

  /**
   * Sync local repository to GitLab
   */
  async syncToGitLab(data: GitLabSyncRequest): Promise<ApiResponse> {
    return this.makeRequest("/sync", data);
  }

  /**
   * Create a merge request
   */
  async createMergeRequest(data: {
    gitlabUrl: string;
    accessToken: string;
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/merge-requests", data);
  }

  /**
   * Get GitLab projects (for project selection)
   */
  async getProjects(
    gitlabUrl: string,
    accessToken: string
  ): Promise<ApiResponse> {
    return this.makeRequest("/projects", { gitlabUrl, accessToken });
  }

  /**
   * Get branches for a project
   */
  async getBranches(data: {
    gitlabUrl: string;
    accessToken: string;
    projectId: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/branches", data);
  }
}

// Export singleton instance
export const gitlabService = new GitLabService();
export default gitlabService;

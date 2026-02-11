import apiClient, { API_ENDPOINTS } from "../lib/api";
import Cookies from "js-cookie";

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  language: string | null;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
}

export interface CloneRequest {
  repositoryUrl: string;
  personalAccessToken: string;
  downloadLocation?: string;
  operationId?: string;
}

export interface CloneResult {
  success: boolean;
  localPath: string;
  message: string;
}

export interface ValidateRequest {
  repositoryUrl: string;
  personalAccessToken: string;
}

export interface ValidateResult {
  success: boolean;
  message: string;
  data: {
    isValid: boolean;
  };
}

export interface ProgressEvent {
  operationId: string;
  type: "progress" | "status" | "complete" | "error" | "connected";
  message: string;
  percentage?: number;
  phase?: "initializing" | "cloning" | "receiving" | "resolving" | "complete";
}

export class GitHubService {
  static async validateRepository(
    request: ValidateRequest
  ): Promise<ValidateResult> {
    const response = await apiClient.post(
      API_ENDPOINTS.GITHUB.VALIDATE,
      request
    );
    return response.data;
  }

  static async cloneRepository(request: CloneRequest): Promise<CloneResult> {
    const response = await apiClient.post(API_ENDPOINTS.GITHUB.CLONE, request);
    return response.data.data;
  }

  static async cancelCloneOperation(
    operationId: string
  ): Promise<{ cancelled: boolean }> {
    const response = await apiClient.post(API_ENDPOINTS.GITHUB.CANCEL_CLONE, {
      operationId,
    });
    return response.data.data;
  }

  static subscribeToProgress(
    operationId: string,
    onProgress: (event: ProgressEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): EventSource {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:1021/api";

    // Get the auth token from cookies
    const authToken = Cookies.get("authToken");

    // Build the URL with token as query parameter since EventSource doesn't support custom headers
    const url = `${API_BASE_URL}${API_ENDPOINTS.GITHUB.CLONE_PROGRESS}/${operationId}${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        onProgress(data);

        if (data.type === "complete" || data.type === "error") {
          eventSource.close();
          if (onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error("Error parsing progress event:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      if (onError) {
        onError(new Error("Connection to progress stream failed"));
      }
    };

    return eventSource;
  }

  static async getRepositories(pat: string): Promise<GitHubRepository[]> {
    const response = await apiClient.get(API_ENDPOINTS.GITHUB.REPOSITORIES, {
      headers: {
        "X-GitHub-Token": pat,
      },
    });
    return response.data.data.repositories;
  }

  static async getBranches(
    repositoryUrl: string,
    pat: string
  ): Promise<string[]> {
    const response = await apiClient.post(API_ENDPOINTS.GITHUB.BRANCHES, {
      repositoryUrl,
      personalAccessToken: pat,
    });
    return response.data.data.branches;
  }

  static async getPullRequests(
    repositoryUrl: string,
    pat: string
  ): Promise<any[]> {
    const response = await apiClient.post(API_ENDPOINTS.GITHUB.PULL_REQUESTS, {
      repositoryUrl,
      personalAccessToken: pat,
    });
    return response.data.data.pullRequests;
  }
}

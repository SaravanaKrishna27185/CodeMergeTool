import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:1021/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      Cookies.remove("authToken");
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  // GitHub
  GITHUB: {
    VALIDATE: "/github/validate",
    CLONE: "/github/clone",
    CANCEL_CLONE: "/github/cancel-clone",
    CLONE_PROGRESS: "/github/clone-progress",
    REPOSITORIES: "/github/repositories",
    BRANCHES: "/github/branches",
    PULL_REQUESTS: "/github/pull-requests",
  },
  // GitLab
  GITLAB: {
    TEST_CONNECTION: "/gitlab/test-connection",
    CREATE_BRANCH: "/gitlab/create-branch",
    SYNC: "/gitlab/sync",
    MERGE_REQUESTS: "/gitlab/merge-requests",
    PROJECTS: "/gitlab/projects",
    BRANCHES: "/gitlab/branches",
  },
  // Settings
  SETTINGS: {
    PIPELINE: "/settings/pipeline",
  },
  // Health
  HEALTH: "/health",
} as const;

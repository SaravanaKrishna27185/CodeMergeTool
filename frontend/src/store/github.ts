import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { GitHubService, GitHubRepository, CloneResult } from "../lib/github";

interface GitHubState {
  repositories: GitHubRepository[];
  currentRepository: GitHubRepository | null;
  branches: string[];
  pullRequests: any[];
  cloneResults: CloneResult[];
  isLoading: boolean;
  error: string | null;
  currentOperationId: string | null;

  // Actions
  validateRepository: (repositoryUrl: string, pat: string) => Promise<boolean>;
  cloneRepository: (
    repositoryUrl: string,
    pat: string,
    downloadLocation?: string
  ) => Promise<CloneResult>;
  cancelClone: () => Promise<boolean>;
  loadRepositories: (pat: string) => Promise<void>;
  loadBranches: (repositoryUrl: string, pat: string) => Promise<void>;
  loadPullRequests: (repositoryUrl: string, pat: string) => Promise<void>;
  setCurrentRepository: (repository: GitHubRepository | null) => void;
  clearError: () => void;
  clearCloneResults: () => void;
}

export const useGitHubStore = create<GitHubState>()(
  devtools(
    (set, get) => ({
      repositories: [],
      currentRepository: null,
      branches: [],
      pullRequests: [],
      cloneResults: [],
      isLoading: false,
      error: null,
      currentOperationId: null,

      validateRepository: async (repositoryUrl: string, pat: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await GitHubService.validateRepository({
            repositoryUrl,
            personalAccessToken: pat,
          });
          set({ isLoading: false });
          return response.data.isValid;
        } catch (error: any) {
          set({
            error:
              error.response?.data?.message || "Repository validation failed",
            isLoading: false,
          });
          return false;
        }
      },

      cloneRepository: async (
        repositoryUrl: string,
        pat: string,
        downloadLocation?: string
      ) => {
        console.log("Store cloneRepository called with:", {
          repositoryUrl,
          pat: pat ? "[REDACTED]" : "undefined",
          downloadLocation,
        });

        const operationId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        set({
          isLoading: true,
          error: null,
          currentOperationId: operationId,
        });

        try {
          const result = await GitHubService.cloneRepository({
            repositoryUrl,
            personalAccessToken: pat,
            downloadLocation,
            operationId,
          });

          set((state) => ({
            cloneResults: [...state.cloneResults, result],
            isLoading: false,
            currentOperationId: null,
          }));

          return result;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || "Repository cloning failed";
          set({
            error: errorMessage,
            isLoading: false,
            currentOperationId: null,
          });
          throw new Error(errorMessage);
        }
      },

      cancelClone: async () => {
        const { currentOperationId } = get();
        if (!currentOperationId) {
          return false;
        }

        try {
          const result =
            await GitHubService.cancelCloneOperation(currentOperationId);
          set({
            isLoading: false,
            currentOperationId: null,
            error: "Clone operation was cancelled",
          });
          return result.cancelled;
        } catch (error: any) {
          console.error("Failed to cancel clone operation:", error);
          return false;
        }
      },

      loadRepositories: async (pat: string) => {
        set({ isLoading: true, error: null });
        try {
          const repositories = await GitHubService.getRepositories(pat);
          set({
            repositories,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error:
              error.response?.data?.message || "Failed to load repositories",
            isLoading: false,
          });
        }
      },

      loadBranches: async (repositoryUrl: string, pat: string) => {
        set({ isLoading: true, error: null });
        try {
          const branches = await GitHubService.getBranches(repositoryUrl, pat);
          set({
            branches,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || "Failed to load branches",
            isLoading: false,
          });
        }
      },

      loadPullRequests: async (repositoryUrl: string, pat: string) => {
        set({ isLoading: true, error: null });
        try {
          const pullRequests = await GitHubService.getPullRequests(
            repositoryUrl,
            pat
          );
          set({
            pullRequests,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error:
              error.response?.data?.message || "Failed to load pull requests",
            isLoading: false,
          });
        }
      },

      setCurrentRepository: (repository: GitHubRepository | null) => {
        set({ currentRepository: repository });
      },

      clearError: () => set({ error: null }),

      clearCloneResults: () => set({ cloneResults: [] }),
    }),
    {
      name: "github-store",
    }
  )
);

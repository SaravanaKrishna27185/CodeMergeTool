import React, { useState, useEffect } from "react";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Edit3,
  Save,
  X,
  Folder,
  File,
  HelpCircle,
  FolderOpen,
  Github,
  GitMerge,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import settingsService from "@/services/settings-service";
import { useGitHubStore } from "@/store/github";
import apiClient from "@/lib/api";
import {
  PipelineStatsService,
  PipelineRun,
} from "@/services/pipeline-stats-service";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type PipelineStepKey =
  | "clone-github"
  | "create-gitlab-branch"
  | "copy-files"
  | "commit-changes"
  | "create-merge-request";
type PipelineStepStatus = "idle" | "inprogress" | "success" | "error";
interface PipelineStep {
  key: PipelineStepKey;
  label: string;
}
const pipelineSteps: PipelineStep[] = [
  { key: "clone-github", label: "Clone GitHub Repo to Path" },
  { key: "create-gitlab-branch", label: "Create Branch & Checkout" },
  { key: "copy-files", label: "Copy Files/Folders to Target" },
  { key: "commit-changes", label: "Add, Commit & Push Changes" },
  { key: "create-merge-request", label: "Create Merge Request" },
];
const initialStatus: Record<PipelineStepKey, PipelineStepStatus> = {
  "clone-github": "idle",
  "create-gitlab-branch": "idle",
  "copy-files": "idle",
  "commit-changes": "idle",
  "create-merge-request": "idle",
};

export default function PipelineAutomationCard() {
  const [expanded, setExpanded] = useState(false); // Collapsed by default
  const [isEditMode, setIsEditMode] = useState(false); // Edit mode state
  const [editInputs, setEditInputs] = useState({
    githubRepoUrl: "",
    githubAccessToken: "",
    githubDownloadLocation: "",
    githubTargetCommitId: "",
    gitlabRepoUrl: "",
    gitlabAccessToken: "",
    gitlabBranchName: "",
    gitlabBaseBranch: "",
    gitlabCheckoutLocation: "",
    sourcePath: "",
    destinationPath: "",
    files: "",
    copyMode: "files" as "files" | "folders" | "mixed",
    preserveFolderStructure: true,
    includeFolders: "",
    excludePatterns: "node_modules,.git,.DS_Store,*.log",
    mergeRequestSourceBranch: "",
    mergeRequestTargetBranch: "",
    mergeRequestTitle: "",
    mergeRequestDescription: "",
    mergeRequestCheckoutLocation: "",
    commitMessage: "",
    changesDescription: "",
  });
  const [inputs, setInputs] = useState({
    githubRepoUrl: "",
    githubAccessToken: "",
    githubDownloadLocation: "",
    githubTargetCommitId: "",
    gitlabRepoUrl: "",
    gitlabAccessToken: "",
    gitlabBranchName: "",
    gitlabBaseBranch: "",
    gitlabCheckoutLocation: "",
    sourcePath: "",
    destinationPath: "",
    files: "",
    copyMode: "files" as "files" | "folders" | "mixed",
    preserveFolderStructure: true,
    includeFolders: "",
    excludePatterns: "node_modules,.git,.DS_Store,*.log",
    mergeRequestSourceBranch: "",
    mergeRequestTargetBranch: "",
    mergeRequestTitle: "",
    mergeRequestDescription: "",
    mergeRequestCheckoutLocation: "",
    commitMessage: "",
    changesDescription: "",
  });

  // Load pipeline settings from backend and pre-fill inputs
  const fetchSettings = async () => {
    try {
      const settingsData = await settingsService.loadPipelineSettings();
      if (settingsData) {
        const newData = {
          ...settingsData,
        };

        // Ensure branch names are synchronized when loading settings
        // If only one field has a value, sync it to the other
        if (newData.gitlabBranchName && !newData.mergeRequestSourceBranch) {
          newData.mergeRequestSourceBranch = newData.gitlabBranchName;
        } else if (
          newData.mergeRequestSourceBranch &&
          !newData.gitlabBranchName
        ) {
          newData.gitlabBranchName = newData.mergeRequestSourceBranch;
        }

        // Ensure merge request fields are synchronized when loading settings
        // If only the title has a value, sync it to other fields that are empty
        if (newData.mergeRequestTitle) {
          if (!newData.mergeRequestDescription) {
            newData.mergeRequestDescription = newData.mergeRequestTitle;
          }
          if (!newData.commitMessage) {
            newData.commitMessage = newData.mergeRequestTitle;
          }
          if (!newData.changesDescription) {
            newData.changesDescription = newData.mergeRequestTitle;
          }
        }

        setInputs((prev) => ({
          ...prev,
          ...newData,
        }));
        setEditInputs((prev) => ({
          ...prev,
          ...newData,
        }));
      }
    } catch (err) {
      console.error("Failed to load pipeline settings:", err);
      // Optionally handle error - maybe show a toast notification
    }
  };
  useEffect(() => {
    fetchSettings();
    // Listen for settings update event
    const handler = () => fetchSettings();
    window.addEventListener("pipeline-settings-updated", handler);
    return () => {
      window.removeEventListener("pipeline-settings-updated", handler);
    };
  }, []);
  const [status, setStatus] =
    useState<Record<PipelineStepKey, PipelineStepStatus>>(initialStatus);
  const [result, setResult] = useState<Array<{
    step: PipelineStepKey;
    status: PipelineStepStatus;
    message?: string;
  }> | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<PipelineStepKey, string>>(
    {
      "clone-github": "",
      "create-gitlab-branch": "",
      "copy-files": "",
      "commit-changes": "",
      "create-merge-request": "",
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [showCancelButton, setShowCancelButton] = useState(false);

  // New state for reset, cancel, and confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "start" | "reset" | "cancel" | null
  >(null);
  const [cancelController, setCancelController] =
    useState<AbortController | null>(null);

  // Pipeline tracking state
  const [currentPipelineRunId, setCurrentPipelineRunId] = useState<
    string | null
  >(null);
  const [pollingCleanup, setPollingCleanup] = useState<(() => void) | null>(
    null
  );

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingCleanup) {
        pollingCleanup();
      }
      if (cancelController) {
        cancelController.abort();
      }
    };
  }, [pollingCleanup, cancelController]);

  // GitHub store for repository validation and cloning
  const { validateRepository } = useGitHubStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let updatedInputs = { ...editInputs, [name]: value };

    // Synchronize branch names: when one changes, update the other
    if (name === "gitlabBranchName") {
      updatedInputs.mergeRequestSourceBranch = value;
    } else if (name === "mergeRequestSourceBranch") {
      updatedInputs.gitlabBranchName = value;
    }

    // Synchronize merge request fields: when title changes, update related fields
    if (name === "mergeRequestTitle") {
      updatedInputs.mergeRequestDescription = value;
      updatedInputs.commitMessage = value;
      updatedInputs.changesDescription = value;
    }

    setEditInputs(updatedInputs);
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditInputs({ ...editInputs, [name]: value });
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setEditInputs({ ...editInputs, [name]: checked });
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit - reset editInputs to current inputs
      setEditInputs({ ...inputs });
      setEditMessage("");
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditMessage("");
    try {
      const response = await settingsService.savePipelineSettings(editInputs);
      if (response.success) {
        setInputs({ ...editInputs });
        setEditMessage("Settings saved successfully!");
        setIsEditMode(false);
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new Event("pipeline-settings-updated"));
        // Clear success message after 3 seconds
        setTimeout(() => setEditMessage(""), 3000);
      }
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      const errorMessage =
        err.response?.data?.error || "Error saving settings. Please try again.";
      setEditMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // GitHub repository validation
  const handleValidateRepository = async () => {
    if (!editInputs.githubRepoUrl || !editInputs.githubAccessToken) {
      setEditMessage(
        "Please enter both GitHub repository URL and access token"
      );
      return;
    }

    try {
      setEditMessage("Validating repository...");
      const isValid = await validateRepository(
        editInputs.githubRepoUrl,
        editInputs.githubAccessToken
      );
      if (isValid) {
        setEditMessage("✅ Repository validated successfully!");
        setTimeout(() => setEditMessage(""), 3000);
      } else {
        setEditMessage(
          "❌ Repository validation failed. Please check your URL and token."
        );
      }
    } catch (error) {
      console.error("Repository validation error:", error);
      setEditMessage(
        "❌ Error validating repository. Please check your credentials."
      );
    }
  };

  // Browse for download location
  const browseDownloadLocation = async () => {
    try {
      // Check if we're in an Electron environment
      if ((window as any).electronAPI?.selectDirectory) {
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setEditInputs({
              ...editInputs,
              githubDownloadLocation: result.filePaths[0],
            });
            setEditMessage("Download location selected!");
            setTimeout(() => setEditMessage(""), 2000);
            return;
          }
        } catch (error) {
          console.error("Electron directory selection error:", error);
        }
      }

      // Check if the File System Access API is supported (Chrome 86+)
      if ("showDirectoryPicker" in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite",
          });

          // Since we can't get the full path directly, ask user to provide it
          const directoryName = directoryHandle.name || "selected folder";
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\Documents\\GitRepos\n" +
                "• Mac: /Users/YourName/Documents/GitRepos\n" +
                "• Linux: /home/username/Documents/GitRepos",
              // Pre-fill with a common pattern
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\Documents\\GitRepos`
                : `/Users/${process.env.USER || "username"}/Documents/GitRepos`
            );

            if (fullPath && fullPath.trim()) {
              setEditInputs({
                ...editInputs,
                githubDownloadLocation: fullPath.trim(),
              });
              setEditMessage("Download location set successfully!");
              setTimeout(() => setEditMessage(""), 2000);
            }
          }, 500);
          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path where you want to download GitHub repositories:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\Documents\\GitRepos\n" +
          "• Mac: /Users/username/Documents/GitRepos\n" +
          "• Linux: /home/username/Documents/GitRepos",
        editInputs.githubDownloadLocation ||
          (navigator.platform.toLowerCase().includes("win")
            ? "C:\\Users\\Downloads\\GitRepos"
            : "/Users/Downloads/GitRepos")
      );

      if (userPath && userPath.trim()) {
        setEditInputs({
          ...editInputs,
          githubDownloadLocation: userPath.trim(),
        });
        setEditMessage("Download location set!");
        setTimeout(() => setEditMessage(""), 2000);
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
      setEditMessage("Error selecting directory. Please enter path manually.");
    }
  };

  // Browse for GitLab checkout location
  const browseGitLabLocation = async () => {
    try {
      // Check if we're in an Electron environment
      if ((window as any).electronAPI?.selectDirectory) {
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setEditInputs({
              ...editInputs,
              gitlabCheckoutLocation: result.filePaths[0],
            });
            setEditMessage("GitLab checkout location selected!");
            setTimeout(() => setEditMessage(""), 2000);
            return;
          }
        } catch (error) {
          console.error("Electron directory selection error:", error);
        }
      }

      // Check if the File System Access API is supported (Chrome 86+)
      if ("showDirectoryPicker" in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite",
          });

          // Since we can't get the full path directly, ask user to provide it
          const directoryName = directoryHandle.name || "selected folder";
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\Projects\\GitLab\n" +
                "• Mac: /Users/YourName/Projects/GitLab\n" +
                "• Linux: /home/username/Projects/GitLab",
              // Pre-fill with a common pattern
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\Projects\\GitLab`
                : `/Users/${process.env.USER || "username"}/Projects/GitLab`
            );

            if (fullPath && fullPath.trim()) {
              setEditInputs({
                ...editInputs,
                gitlabCheckoutLocation: fullPath.trim(),
              });
              setEditMessage("GitLab checkout location set successfully!");
              setTimeout(() => setEditMessage(""), 2000);
            }
          }, 500);
          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path where you want to checkout GitLab branches:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\Projects\\GitLab\n" +
          "• Mac: /Users/username/Projects/GitLab\n" +
          "• Linux: /home/username/Projects/GitLab",
        editInputs.gitlabCheckoutLocation ||
          (navigator.platform.toLowerCase().includes("win")
            ? "C:\\Users\\Projects\\GitLab"
            : "/Users/Projects/GitLab")
      );

      if (userPath && userPath.trim()) {
        setEditInputs({
          ...editInputs,
          gitlabCheckoutLocation: userPath.trim(),
        });
        setEditMessage("GitLab checkout location set!");
        setTimeout(() => setEditMessage(""), 2000);
      }
    } catch (error) {
      console.error("Error selecting GitLab directory:", error);
      setEditMessage("Error selecting directory. Please enter path manually.");
    }
  };

  // Browse for merge request checkout location
  const browseMergeRequestLocation = async () => {
    try {
      // Check if we're in an Electron environment
      if ((window as any).electronAPI?.selectDirectory) {
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setEditInputs({
              ...editInputs,
              mergeRequestCheckoutLocation: result.filePaths[0],
            });
            setEditMessage("Merge request location selected!");
            setTimeout(() => setEditMessage(""), 2000);
            return;
          }
        } catch (error) {
          console.error("Electron directory selection error:", error);
        }
      }

      // Check if the File System Access API is supported (Chrome 86+)
      if ("showDirectoryPicker" in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite",
          });

          const directoryName = directoryHandle.name || "selected folder";
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\MergeRequests\\GitLab\n" +
                "• Mac: /Users/YourName/MergeRequests/GitLab\n" +
                "• Linux: /home/username/MergeRequests/GitLab",
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\MergeRequests\\GitLab`
                : `/Users/${process.env.USER || "username"}/MergeRequests/GitLab`
            );

            if (fullPath && fullPath.trim()) {
              setEditInputs({
                ...editInputs,
                mergeRequestCheckoutLocation: fullPath.trim(),
              });
              setEditMessage("Merge request location set successfully!");
              setTimeout(() => setEditMessage(""), 2000);
            }
          }, 500);
          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path where you want to manage merge request changes:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\MergeRequests\\GitLab\n" +
          "• Mac: /Users/username/MergeRequests/GitLab\n" +
          "• Linux: /home/username/MergeRequests/GitLab",
        editInputs.mergeRequestCheckoutLocation ||
          (navigator.platform.toLowerCase().includes("win")
            ? "C:\\Users\\MergeRequests\\GitLab"
            : "/Users/MergeRequests/GitLab")
      );

      if (userPath && userPath.trim()) {
        setEditInputs({
          ...editInputs,
          mergeRequestCheckoutLocation: userPath.trim(),
        });
        setEditMessage("Merge request location set!");
        setTimeout(() => setEditMessage(""), 2000);
      }
    } catch (error) {
      console.error("Error selecting merge request directory:", error);
      setEditMessage("Error selecting directory. Please enter path manually.");
    }
  };

  const executePipeline = async () => {
    console.log("🚀 Starting pipeline, setting loading = true");

    // Set both loading and cancel button visibility immediately
    setLoading(true);
    setShowCancelButton(true);
    setError("");
    setStepErrors({
      "clone-github": "",
      "create-gitlab-branch": "",
      "copy-files": "",
      "commit-changes": "",
      "create-merge-request": "",
    });
    // Set all steps to idle at start
    // Only first step is inprogress, others idle
    setStatus({
      "clone-github": "inprogress",
      "create-gitlab-branch": "idle",
      "copy-files": "idle",
      "commit-changes": "idle",
      "create-merge-request": "idle",
    });
    setResult(null);

    // Validate required fields before submitting
    const requiredFields = [
      { field: inputs.githubRepoUrl, name: "GitHub Repository URL" },
      { field: inputs.githubAccessToken, name: "GitHub Access Token" },
      {
        field: inputs.githubDownloadLocation,
        name: "GitHub Download Location",
      },
      { field: inputs.gitlabRepoUrl, name: "GitLab Repository URL" },
      { field: inputs.gitlabAccessToken, name: "GitLab Access Token" },
      { field: inputs.gitlabBranchName, name: "GitLab Branch Name" },
      { field: inputs.gitlabBaseBranch, name: "GitLab Base Branch" },
      {
        field: inputs.gitlabCheckoutLocation,
        name: "GitLab Checkout Location",
      },
      { field: inputs.sourcePath, name: "Source Path" },
      { field: inputs.destinationPath, name: "Destination Path" },
      { field: inputs.commitMessage, name: "Commit Message" },
      { field: inputs.mergeRequestTitle, name: "Merge Request Title" },
    ];

    // Add conditional validation for files/folders based on copyMode
    if (inputs.copyMode === "files" || inputs.copyMode === "mixed") {
      if (!inputs.files || inputs.files.trim() === "") {
        setError(
          "Files to Copy is required. Please fill in all required fields."
        );
        setLoading(false);
        return;
      }
    }

    if (inputs.copyMode === "folders" || inputs.copyMode === "mixed") {
      if (!inputs.includeFolders || inputs.includeFolders.trim() === "") {
        setError(
          "Folders to Include is required. Please fill in all required fields."
        );
        setLoading(false);
        return;
      }
    }

    for (const { field, name } of requiredFields) {
      if (!field || field.trim() === "") {
        setError(`${name} is required. Please fill in all required fields.`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        githubRepoUrl: inputs.githubRepoUrl,
        githubAccessToken: inputs.githubAccessToken,
        githubDownloadLocation: inputs.githubDownloadLocation,
        githubTargetCommitId: inputs.githubTargetCommitId || undefined,
        gitlabRepoUrl: inputs.gitlabRepoUrl,
        gitlabAccessToken: inputs.gitlabAccessToken,
        gitlabBranchName: inputs.gitlabBranchName,
        gitlabBaseBranch: inputs.gitlabBaseBranch,
        gitlabCheckoutLocation: inputs.gitlabCheckoutLocation,
        sourcePath: inputs.sourcePath,
        destinationPath: inputs.destinationPath,
        files: inputs.files.split(",").map((f) => f.trim()),
        copyMode: inputs.copyMode,
        includeFolders: inputs.includeFolders.split(",").map((f) => f.trim()),
        excludePatterns: inputs.excludePatterns
          .split(",")
          .map((f) => f.trim())
          .filter((p) => p.length > 0),
        preserveFolderStructure: inputs.preserveFolderStructure,
        mergeRequest: {
          sourceBranch: inputs.mergeRequestSourceBranch,
          targetBranch: inputs.mergeRequestTargetBranch,
          title: inputs.mergeRequestTitle,
          description: inputs.mergeRequestDescription,
          checkoutLocation: inputs.mergeRequestCheckoutLocation,
          commitMessage: inputs.commitMessage,
          changesDescription: inputs.changesDescription,
        },
      };
      console.log("🚀 Starting pipeline automation...");
      console.log("📋 All steps will be executed (conditions removed)");

      // Create a promise that simulates step progression based on API response timing
      const simulateStepProgression = async (apiPromise: Promise<any>) => {
        const updateStepProgress = (stepIndex: number) => {
          const newStatus = { ...status }; // Use current status instead of initialStatus

          // Set current step to inprogress if not already completed
          if (
            stepIndex < pipelineSteps.length &&
            newStatus[pipelineSteps[stepIndex].key] === "idle"
          ) {
            newStatus[pipelineSteps[stepIndex].key] = "inprogress";
          }

          setStatus(newStatus);
        };

        // Start with first step
        updateStepProgress(0);

        // Progression timing based on realistic backend execution
        const stepProgressions = [
          { step: "clone-github", delay: 3500 }, // GitHub clone usually takes 3-5 seconds
          { step: "create-gitlab-branch", delay: 6500 }, // Branch creation after GitHub clone
          { step: "copy-files", delay: 9500 }, // File copying starts after branch setup - will run until API completes
          { step: "create-merge-request", delay: 0 }, // Final step waits for API completion
        ];

        const timeouts: NodeJS.Timeout[] = [];
        let currentStepIndex = 0;

        // Schedule step progressions, but the copy-files step will wait for API completion
        stepProgressions.forEach((progression, index) => {
          if (progression.delay > 0) {
            const timeout = setTimeout(() => {
              currentStepIndex = index + 1;
              if (index + 1 < pipelineSteps.length) {
                updateStepProgress(index + 1);

                // Special logging for file copy step
                if (progression.step === "copy-files") {
                  console.log(
                    "🔄 File copying in progress - processing directories and files..."
                  );
                  console.log(
                    "⏳ Waiting for directory verification and file count validation..."
                  );
                }
              }
            }, progression.delay);
            timeouts.push(timeout);
          }
        });

        // Wait for API completion - let the main response handler update step statuses
        try {
          await apiPromise;
          console.log(
            "✅ API completed - response will be processed by main handler"
          );
        } catch (error) {
          // API failed, cleanup will be handled by the calling code
          console.error("❌ API failed during pipeline execution:", error);
        }

        // Return cleanup function
        return () => {
          timeouts.forEach((timeout) => clearTimeout(timeout));
        };
      };

      // Create abort controller for cancellation
      const controller = new AbortController();
      setCancelController(controller);

      // Make the API call with abort signal - this will return a pipeline run ID immediately
      console.log("📤 Making API call to /pipeline/automate");
      const response = await apiClient.post("/pipeline/automate", payload, {
        signal: controller.signal,
      });

      console.log("📥 API response received:", response.data);
      const { pipelineRunId } = response.data;

      if (!pipelineRunId) {
        throw new Error("No pipeline run ID returned from server");
      }

      console.log("🎯 Got pipeline run ID:", pipelineRunId);
      setCurrentPipelineRunId(pipelineRunId);

      // Start polling for real-time status updates instead of simulation
      const cleanup = await PipelineStatsService.pollPipelineStatus(
        pipelineRunId,
        (pipelineRun: PipelineRun) => {
          // Update step status based on real backend data
          console.log("📊 Polling update received:", {
            pipelineStatus: pipelineRun.status,
            steps: pipelineRun.steps.map((s) => ({
              name: s.stepName,
              status: s.status,
              startTime: s.startTime,
              endTime: s.endTime,
              message: s.message,
              errorMessage: s.errorMessage,
            })),
          });

          // Use functional state updates to avoid closure issues
          setStatus((currentStatus) => {
            console.log(
              "🔄 Current frontend status before mapping:",
              currentStatus
            );
            console.log("📥 Pipeline run received:", {
              status: pipelineRun.status,
              steps: pipelineRun.steps.map((s) => ({
                stepName: s.stepName,
                status: s.status,
                message: s.message,
                errorMessage: s.errorMessage,
              })),
            });

            const newStatus = { ...currentStatus }; // Use current status from state

            // Map backend steps to frontend step keys using stepName
            pipelineRun.steps.forEach((step: any) => {
              const stepKey = step.stepName as PipelineStepKey;

              // Map backend status to frontend status
              console.log(
                `🔄 Mapping step ${stepKey}: backend="${step.status}" -> frontend status`
              );

              let frontendStatus: PipelineStepStatus;
              switch (step.status) {
                case "idle":
                  frontendStatus = "idle";
                  break;
                case "in_progress":
                  frontendStatus = "inprogress";
                  break;
                case "success":
                  frontendStatus = "success";
                  break;
                case "failed":
                  frontendStatus = "error";
                  break;
                default:
                  console.warn(
                    `⚠️ Unknown step status: ${step.status} for step ${stepKey}`
                  );
                  frontendStatus = "idle";
                  break;
              }

              console.log(
                `✅ Setting ${stepKey} status: ${currentStatus[stepKey]} -> ${frontendStatus}`
              );
              newStatus[stepKey] = frontendStatus;
            });

            console.log("🎯 Setting new status:", newStatus);
            console.log("📋 Previous status was:", currentStatus);
            console.log(
              "🔍 Status comparison:",
              Object.keys(newStatus).map((key) => ({
                step: key,
                old: currentStatus[key as PipelineStepKey],
                new: newStatus[key as PipelineStepKey],
                changed:
                  currentStatus[key as PipelineStepKey] !==
                  newStatus[key as PipelineStepKey],
              }))
            );

            return newStatus;
          });

          // Update step errors using functional update as well
          setStepErrors((currentStepErrors) => {
            const newStepErrors = { ...currentStepErrors };

            pipelineRun.steps.forEach((step: any) => {
              const stepKey = step.stepName as PipelineStepKey;
              console.log(`🔍 Processing errors for step ${stepKey}:`, {
                status: step.status,
                error: step.error,
                errorMessage: step.errorMessage,
                message: step.message,
              });

              if (step.status === "failed") {
                const errorMsg =
                  step.errorMessage ||
                  step.error ||
                  step.message ||
                  "Step failed";
                console.log(`❌ Setting error for ${stepKey}: ${errorMsg}`);
                newStepErrors[stepKey] = errorMsg;
              } else if (step.status === "success") {
                // Clear error message when step succeeds
                newStepErrors[stepKey] = "";
              }
            });

            console.log("🔍 Final step errors:", newStepErrors);
            return newStepErrors;
          });
        },
        (pipelineRun: PipelineRun) => {
          // Pipeline completed
          console.log("🎉 Pipeline completed, stopping loading state");
          console.log("🔍 Final pipeline status:", pipelineRun.status);
          console.log(
            "🔍 Final step statuses:",
            pipelineRun.steps.map((s) => ({
              stepName: s.stepName,
              status: s.status,
              message: s.message,
              errorMessage: s.errorMessage,
            }))
          );

          // Force one final status update to ensure UI reflects final state
          setStatus((currentStatus) => {
            const finalStatus = { ...currentStatus };
            pipelineRun.steps.forEach((step: any) => {
              const stepKey = step.stepName as PipelineStepKey;
              const frontendStatus =
                step.status === "failed"
                  ? "error"
                  : step.status === "success"
                    ? "success"
                    : step.status === "in_progress"
                      ? "inprogress"
                      : "idle";
              console.log(
                `🔄 Final status update - ${stepKey}: ${finalStatus[stepKey]} -> ${frontendStatus}`
              );
              finalStatus[stepKey] = frontendStatus;
            });
            return finalStatus;
          });

          // Force final error update
          setStepErrors((currentErrors) => {
            const finalErrors = { ...currentErrors };
            pipelineRun.steps.forEach((step: any) => {
              const stepKey = step.stepName as PipelineStepKey;
              if (step.status === "failed") {
                finalErrors[stepKey] =
                  step.errorMessage ||
                  step.error ||
                  step.message ||
                  "Step failed";
              }
            });
            return finalErrors;
          });

          const data = pipelineRun.steps.map((step: any) => ({
            step: step.stepName,
            status:
              step.status === "success"
                ? ("success" as PipelineStepStatus)
                : ("error" as PipelineStepStatus),
            message:
              step.error ||
              step.errorMessage ||
              (step.status === "success"
                ? "Step completed successfully"
                : "Step failed"),
            result: step.result,
          }));

          console.log("📊 Setting final result data:", data);
          setResult(data);
          setCurrentPipelineRunId(null);
          setLoading(false); // Stop loading when pipeline completes
          setShowCancelButton(false); // Hide cancel button
        },
        (error: any) => {
          console.error("Pipeline polling error:", error);
          setCurrentPipelineRunId(null);
          setLoading(false); // Stop loading on polling error
          setShowCancelButton(false); // Hide cancel button
          setError(`Pipeline polling failed: ${error.message || error}`);
        }
      );

      // Store the cleanup function in state
      setPollingCleanup(() => cleanup);

      // Pipeline polling will handle the rest - no need for manual step processing
    } catch (err: any) {
      console.error("Pipeline request failed:", err);

      // Clear any running polling
      if (pollingCleanup) {
        pollingCleanup();
        setPollingCleanup(null);
      }
      setCurrentPipelineRunId(null);

      setStatus({
        "clone-github": "error",
        "create-gitlab-branch": "idle",
        "copy-files": "idle",
        "commit-changes": "idle",
        "create-merge-request": "idle",
      });

      // Handle different types of errors
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
        // Request was cancelled
        setError("Pipeline execution was cancelled");
        setStatus(initialStatus); // Reset to initial state
        setShowCancelButton(false); // Hide cancel button immediately
      } else if (err.response) {
        // Server responded with error status
        setError(
          `Pipeline failed: ${err.response.data?.error || err.response.statusText || "Server error"}`
        );
      } else if (err.request) {
        // Request was made but no response received
        setError("Pipeline failed: No response from server");
      } else if (err instanceof Error) {
        // Something else happened
        setError(`Pipeline failed: ${err.message}`);
      } else {
        setError("Pipeline failed: Unknown error");
      }
    } finally {
      // Ensure polling is cleaned up
      if (pollingCleanup) {
        pollingCleanup();
        setPollingCleanup(null);
      }
      setCurrentPipelineRunId(null);
      console.log("🔄 Finally block: setting loading = false");
      setLoading(false);
      setShowCancelButton(false); // Ensure cancel button is hidden
      setCancelController(null); // Clear the cancel controller
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    showConfirmation("start");
  };

  // Reset function to clear all states and return to initial state
  const handleReset = () => {
    setStatus(initialStatus);
    setResult(null);
    setStepErrors({
      "clone-github": "",
      "create-gitlab-branch": "",
      "copy-files": "",
      "commit-changes": "",
      "create-merge-request": "",
    });
    setError("");
    setLoading(false);
    // Note: We don't reset the input values or enabled steps to preserve user's configuration
  };

  // Cancel function to abort current execution
  const handleCancel = () => {
    if (cancelController) {
      cancelController.abort();
      console.log("Pipeline execution cancelled by user");
    }

    // Stop polling if active
    if (pollingCleanup) {
      pollingCleanup();
      setPollingCleanup(null);
    }

    setCurrentPipelineRunId(null);
    setLoading(false);
    setShowCancelButton(false);
    setError("Pipeline execution cancelled");

    // Reset status to initial state
    setStatus(initialStatus);
  };

  // Confirmation dialog handlers
  const showConfirmation = (action: "start" | "reset" | "cancel") => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    setShowConfirmDialog(false);

    switch (confirmAction) {
      case "start":
        executePipeline();
        break;
      case "reset":
        handleReset();
        break;
      case "cancel":
        handleCancel();
        break;
    }

    setConfirmAction(null);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  return (
    <div className="p-6 bg-white rounded shadow">
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg mr-3">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold">Pipeline Automation</h2>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          className="ml-2"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            {expanded ? (
              <path
                d="M6 15l6-6 6 6"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M6 9l6 6 6-6"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>
      <hr className="mb-6 border-t border-gray-200" />
      {expanded && (
        <>
          {/* Control buttons */}
          <div className="flex justify-between items-center mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={fetchSettings}
              className="bg-gray-100 hover:bg-gray-200"
            >
              Load from DB
            </Button>

            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditToggle}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditToggle}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Settings
                </Button>
              )}
            </div>
          </div>

          {/* Status message */}
          {editMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                editMessage.includes("successfully")
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : "text-red-700 bg-red-50 border border-red-200"
              }`}
            >
              {editMessage}
            </div>
          )}

          {/* Settings Display/Edit Form */}
          <div className="mb-6 space-y-6">
            {/* GitHub Settings Section */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Github className="h-5 w-5 text-blue-600" />
                <h3 className="text-md font-medium text-gray-700">
                  GitHub Configuration
                </h3>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>

              <div className="space-y-4">
                {/* Repository URL and Token */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      GitHub Repo URL
                    </label>
                    {isEditMode ? (
                      <Input
                        name="githubRepoUrl"
                        value={editInputs.githubRepoUrl}
                        onChange={handleEditChange}
                        placeholder="https://github.com/owner/repo"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm">
                        {inputs.githubRepoUrl || "Not set"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      GitHub Access Token
                    </label>
                    {isEditMode ? (
                      <Input
                        type="password"
                        name="githubAccessToken"
                        value={editInputs.githubAccessToken}
                        onChange={handleEditChange}
                        placeholder="Enter GitHub access token"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm">
                        {inputs.githubAccessToken ? "••••••••••••" : "Not set"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Download Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Download Location
                    <span className="text-xs text-gray-500 ml-1">
                      (where repository will be cloned)
                    </span>
                  </label>
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <Input
                        name="githubDownloadLocation"
                        value={editInputs.githubDownloadLocation}
                        onChange={handleEditChange}
                        placeholder="C:\Users\YourName\Documents\GitRepos or /Users/username/Documents/GitRepos"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={browseDownloadLocation}
                        className="flex items-center gap-2"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Browse
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.githubDownloadLocation || "Not set"}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    This path will be used by the GitHub Repository Downloader
                    API
                  </div>
                </div>

                {/* GitHub Target Commit ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Commit ID (Optional)
                  </label>
                  {isEditMode ? (
                    <Input
                      name="githubTargetCommitId"
                      value={editInputs.githubTargetCommitId}
                      onChange={handleEditChange}
                      placeholder="e.g., a1b2c3d4e5f6789... (full commit hash or short hash)"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.githubTargetCommitId || "Latest commit (HEAD)"}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Leave empty to pull the latest commit. Specify a commit hash
                    to checkout a specific version.
                  </div>
                </div>

                {/* Repository Validation (only in edit mode) */}
                {isEditMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">
                          Repository Validation
                        </h4>
                        <p className="text-xs text-blue-600 mt-1">
                          Validate your repository URL and access token before
                          saving
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleValidateRepository}
                        disabled={
                          !editInputs.githubRepoUrl ||
                          !editInputs.githubAccessToken
                        }
                        className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        <Github className="h-4 w-4" />
                        Validate
                      </Button>
                    </div>
                  </div>
                )}

                {/* Configuration Summary (display mode only) */}
                {!isEditMode &&
                  (inputs.githubRepoUrl || inputs.githubDownloadLocation) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        GitHub Configuration Summary
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                          • Repository:{" "}
                          {inputs.githubRepoUrl
                            ? "✅ Configured"
                            : "❌ Not set"}
                        </li>
                        <li>
                          • Access Token:{" "}
                          {inputs.githubAccessToken
                            ? "✅ Configured"
                            : "❌ Not set"}
                        </li>
                        <li>
                          • Download Location:{" "}
                          {inputs.githubDownloadLocation ||
                            "Default system location"}
                        </li>
                        <li>
                          • Target Commit:{" "}
                          {inputs.githubTargetCommitId || "Latest (HEAD)"}
                        </li>
                        <li>• API Integration: GitHub Repository Downloader</li>
                      </ul>
                    </div>
                  )}
              </div>
            </div>

            {/* GitLab Settings Section */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                GitLab Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    GitLab Repo URL
                  </label>
                  {isEditMode ? (
                    <Input
                      name="gitlabRepoUrl"
                      value={editInputs.gitlabRepoUrl}
                      onChange={handleEditChange}
                      placeholder="https://gitlab.com/owner/repo"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.gitlabRepoUrl || "Not set"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    GitLab Access Token
                  </label>
                  {isEditMode ? (
                    <Input
                      type="password"
                      name="gitlabAccessToken"
                      value={editInputs.gitlabAccessToken}
                      onChange={handleEditChange}
                      placeholder="Enter GitLab access token"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.gitlabAccessToken ? "••••••••••••" : "Not set"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    New Branch Name
                    <span className="text-xs text-blue-600 ml-1">
                      (synced with Source Branch)
                    </span>
                  </label>
                  {isEditMode ? (
                    <Input
                      name="gitlabBranchName"
                      value={editInputs.gitlabBranchName}
                      onChange={handleEditChange}
                      placeholder="feature-branch"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.gitlabBranchName || "Not set"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Base Branch
                  </label>
                  {isEditMode ? (
                    <Input
                      name="gitlabBaseBranch"
                      value={editInputs.gitlabBaseBranch}
                      onChange={handleEditChange}
                      placeholder="main"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.gitlabBaseBranch || "Not set"}
                    </div>
                  )}
                </div>
              </div>

              {/* GitLab Checkout Location - Full width */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Checkout Location
                </label>
                {isEditMode ? (
                  <div className="flex gap-2">
                    <Input
                      name="gitlabCheckoutLocation"
                      value={editInputs.gitlabCheckoutLocation}
                      onChange={handleEditChange}
                      placeholder={`Default: ${typeof navigator !== "undefined" && navigator.platform.includes("Win") ? "C:\\Users\\Projects\\GitLab" : "/Users/Projects/GitLab"}`}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => browseGitLabLocation()}
                      className="px-3"
                      title="Browse for location"
                    >
                      📁
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 bg-gray-50 rounded border text-sm">
                    {inputs.gitlabCheckoutLocation ||
                      "Default location will be used"}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Local directory where GitLab repository will be cloned and
                  branches checked out
                </p>
              </div>
            </div>

            {/* File Copy Settings Section */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-5 w-5 text-green-600" />
                <h3 className="text-md font-medium text-gray-700">
                  File Copy Configuration
                </h3>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </div>

              <div className="space-y-4">
                {/* Copy Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Copy Mode
                  </label>
                  {isEditMode ? (
                    <Select
                      value={editInputs.copyMode}
                      onValueChange={(value) =>
                        handleSelectChange("copyMode", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select copy mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="files">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            <span>Files Only - Copy individual files</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="folders">
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span>
                              Folders - Copy entire folders with structure
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="mixed">
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <File className="h-4 w-4" />
                            <span>Mixed - Copy both files and folders</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm flex items-center gap-2">
                      {inputs.copyMode === "files" && (
                        <File className="h-4 w-4 text-blue-500" />
                      )}
                      {inputs.copyMode === "folders" && (
                        <Folder className="h-4 w-4 text-green-500" />
                      )}
                      {inputs.copyMode === "mixed" && (
                        <>
                          <Folder className="h-4 w-4 text-green-500" />
                          <File className="h-4 w-4 text-blue-500" />
                        </>
                      )}
                      <span>
                        {inputs.copyMode === "files"
                          ? "Files Only"
                          : inputs.copyMode === "folders"
                            ? "Folders with Structure"
                            : inputs.copyMode === "mixed"
                              ? "Mixed (Files + Folders)"
                              : "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Source and Destination Paths */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Source Path
                    </label>
                    {isEditMode ? (
                      <Input
                        name="sourcePath"
                        value={editInputs.sourcePath}
                        onChange={handleEditChange}
                        placeholder="/src or /src/components"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm">
                        {inputs.sourcePath || "Not set"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Destination Path
                    </label>
                    {isEditMode ? (
                      <Input
                        name="destinationPath"
                        value={editInputs.destinationPath}
                        onChange={handleEditChange}
                        placeholder="/dest or /target/components"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm">
                        {inputs.destinationPath || "Not set"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Preserve Folder Structure Option */}
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Preserve Folder Structure
                  </label>
                  {isEditMode ? (
                    <Checkbox
                      checked={editInputs.preserveFolderStructure}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "preserveFolderStructure",
                          checked as boolean
                        )
                      }
                    />
                  ) : (
                    <div className="p-1 bg-gray-50 rounded border text-sm">
                      {inputs.preserveFolderStructure ? "✅" : "❌"}
                    </div>
                  )}
                  {!isEditMode && (
                    <span className="text-sm text-gray-600">
                      {inputs.preserveFolderStructure ? "Enabled" : "Disabled"}
                    </span>
                  )}
                </div>

                {/* Files to Copy (for files or mixed mode) */}
                {(inputs.copyMode === "files" ||
                  inputs.copyMode === "mixed") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Files to Copy
                      <span className="text-xs text-gray-500 ml-1">
                        (comma-separated patterns)
                      </span>
                    </label>
                    {isEditMode ? (
                      <Input
                        name="files"
                        value={editInputs.files}
                        onChange={handleEditChange}
                        placeholder="file1.js, file2.js, *.ts, **/*.jsx, src/utils/*.js"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm min-h-[60px]">
                        {inputs.files || "Not set"}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Examples: *.js, **/*.ts, src/components/*.jsx,
                      specific-file.txt
                    </div>
                  </div>
                )}

                {/* Folders to Include (for folders or mixed mode) */}
                {(inputs.copyMode === "folders" ||
                  inputs.copyMode === "mixed") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Folders to Include
                      <span className="text-xs text-gray-500 ml-1">
                        (comma-separated paths)
                      </span>
                    </label>
                    {isEditMode ? (
                      <Input
                        name="includeFolders"
                        value={editInputs.includeFolders}
                        onChange={handleEditChange}
                        placeholder="src/components, src/utils, docs, assets"
                        className="w-full"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border text-sm min-h-[60px]">
                        {inputs.includeFolders || "Not set"}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Examples: src/components, docs, assets/images, lib
                    </div>
                  </div>
                )}

                {/* Exclude Patterns */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Exclude Patterns
                    <span className="text-xs text-gray-500 ml-1">
                      (patterns to ignore)
                    </span>
                  </label>
                  {isEditMode ? (
                    <Input
                      name="excludePatterns"
                      value={editInputs.excludePatterns}
                      onChange={handleEditChange}
                      placeholder="node_modules, .git, .DS_Store, *.log, dist, build"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm min-h-[60px]">
                      {inputs.excludePatterns || "None"}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Common: node_modules, .git, .DS_Store, *.log, dist, build,
                    coverage
                  </div>
                </div>

                {/* Copy Preview/Summary */}
                {!isEditMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      Copy Configuration Summary
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>
                        • Mode:{" "}
                        {inputs.copyMode === "files"
                          ? "Files only"
                          : inputs.copyMode === "folders"
                            ? "Folders with structure"
                            : "Mixed mode"}
                      </li>
                      <li>
                        • Structure:{" "}
                        {inputs.preserveFolderStructure
                          ? "Preserved"
                          : "Flattened"}
                      </li>
                      <li>• Source: {inputs.sourcePath || "Not configured"}</li>
                      <li>
                        • Destination:{" "}
                        {inputs.destinationPath || "Not configured"}
                      </li>
                      {inputs.copyMode !== "folders" && inputs.files && (
                        <li>
                          • Files: {inputs.files.split(",").length} pattern(s)
                        </li>
                      )}
                      {inputs.copyMode !== "files" && inputs.includeFolders && (
                        <li>
                          • Folders: {inputs.includeFolders.split(",").length}{" "}
                          folder(s)
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Merge Request Settings Section */}
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <GitMerge className="h-5 w-5 text-purple-600" />
                <h3 className="text-md font-medium text-gray-700">
                  Merge Request Configuration
                </h3>
                <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-orange-50 rounded text-xs text-orange-700">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.65 14.39L12 22.13 1.35 14.39a1.12 1.12.0 0 1 0-1.58l9.4-9.4c.44-.44 1.15-.44 1.59 0l9.4 9.4c.44.44.44 1.15 0 1.59z" />
                  </svg>
                  <span>GitLab</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Source Branch
                    <span className="text-xs text-blue-600 ml-1">
                      (synced with New Branch Name)
                    </span>
                  </label>
                  {isEditMode ? (
                    <Input
                      name="mergeRequestSourceBranch"
                      value={editInputs.mergeRequestSourceBranch}
                      onChange={handleEditChange}
                      placeholder="feature-branch"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.mergeRequestSourceBranch || "Not set"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Target Branch
                  </label>
                  {isEditMode ? (
                    <Input
                      name="mergeRequestTargetBranch"
                      value={editInputs.mergeRequestTargetBranch}
                      onChange={handleEditChange}
                      placeholder="main"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.mergeRequestTargetBranch || "Not set"}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Merge Request Title
                  </label>
                  {isEditMode ? (
                    <Input
                      name="mergeRequestTitle"
                      value={editInputs.mergeRequestTitle}
                      onChange={handleEditChange}
                      placeholder="feat: Add new feature"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.mergeRequestTitle || "Not set"}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Merge Request Description
                    <span className="text-xs text-blue-600 ml-1">
                      (synced with Title)
                    </span>
                  </label>
                  {isEditMode ? (
                    <Input
                      name="mergeRequestDescription"
                      value={editInputs.mergeRequestDescription}
                      onChange={handleEditChange}
                      placeholder="Description of the changes"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.mergeRequestDescription || "Not set"}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Merge Request Configuration Fields */}
              <div className="mt-4 space-y-4">
                {/* Checkout Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Checkout Location
                  </label>
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <Input
                        name="mergeRequestCheckoutLocation"
                        value={editInputs.mergeRequestCheckoutLocation}
                        onChange={handleEditChange}
                        placeholder={`Default: ${typeof navigator !== "undefined" && navigator.platform.includes("Win") ? "C:\\Users\\MergeRequests\\GitLab" : "/Users/MergeRequests/GitLab"}`}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => browseMergeRequestLocation()}
                        className="px-3"
                        title="Browse for location"
                      >
                        📁
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.mergeRequestCheckoutLocation ||
                        "Default location will be used"}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Local directory where merge request changes will be managed
                  </p>
                </div>

                {/* Commit Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Commit Message
                    <span className="text-xs text-blue-600 ml-1">
                      (synced with Title)
                    </span>
                  </label>
                  {isEditMode ? (
                    <Input
                      name="commitMessage"
                      value={editInputs.commitMessage}
                      onChange={handleEditChange}
                      placeholder="feat: Update from automated pipeline"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm">
                      {inputs.commitMessage ||
                        "Default commit message will be used"}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Message for committing changes to the branch
                  </p>
                </div>

                {/* Changes Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Changes Description
                    <span className="text-xs text-blue-600 ml-1">
                      (synced with Title)
                    </span>
                  </label>
                  {isEditMode ? (
                    <textarea
                      name="changesDescription"
                      value={editInputs.changesDescription}
                      onChange={(e) =>
                        handleEditChange({
                          target: {
                            name: "changesDescription",
                            value: e.target.value,
                          },
                        } as any)
                      }
                      placeholder="Detailed description of changes made during the pipeline..."
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border text-sm min-h-[60px]">
                      {inputs.changesDescription ||
                        "No changes description provided"}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Detailed description of what changes were made during this
                    pipeline execution
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Settings Controls - Duplicate */}
          <div className="border-t pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-700">
                  {isEditMode
                    ? "Editing Configuration"
                    : "Need to modify settings?"}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {isEditMode
                    ? "Save your changes or cancel to continue"
                    : "Edit pipeline configuration before execution"}
                </p>
              </div>
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEditToggle}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditToggle}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Settings
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Execution Form */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Execute Pipeline {loading && "(RUNNING)"}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Reset Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => showConfirmation("reset")}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Reset
                  </Button>

                  {/* Run Pipeline Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running Pipeline...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Run Pipeline
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
          <div className="w-full overflow-x-auto flex justify-center">
            <div className="flex flex-row items-center gap-2 mb-4 w-full">
              {/* Debug: Log current status state */}
              {(() => {
                console.log("🎯 Current status state:", status);
                return null;
              })()}
              {pipelineSteps.map((step, index) => (
                <React.Fragment key={step.key}>
                  <div
                    className={`rounded-lg border shadow-sm p-3 flex flex-col items-start transition-all duration-300 flex-1 ${
                      status[step.key] === "success"
                        ? "bg-green-50 border-green-300 shadow-green-100 hover:shadow-md"
                        : status[step.key] === "error"
                          ? "bg-red-50 border-red-300 shadow-red-100 hover:shadow-md"
                          : status[step.key] === "inprogress"
                            ? "bg-blue-50 border-blue-300 shadow-blue-100 ring-2 ring-blue-200 ring-opacity-50 hover:shadow-md"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium leading-tight text-gray-900">
                          {step.label}
                        </span>
                      </div>
                    </div>
                    <hr className="w-full mb-2 border-t border-gray-200" />
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white transition-all duration-200 ${
                          status[step.key] === "success"
                            ? "bg-green-500 shadow-sm"
                            : status[step.key] === "error"
                              ? "bg-red-500 shadow-sm"
                              : status[step.key] === "inprogress"
                                ? "bg-blue-500 shadow-sm ring-2 ring-blue-200"
                                : "bg-gray-400"
                        }`}
                      >
                        {status[step.key] === "success" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : status[step.key] === "error" ? (
                          <XCircle className="w-3 h-3" />
                        ) : status[step.key] === "inprogress" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </span>
                      <span
                        className={`text-xs font-medium capitalize transition-colors duration-200 ${
                          status[step.key] === "success"
                            ? "text-green-700"
                            : status[step.key] === "error"
                              ? "text-red-700"
                              : status[step.key] === "inprogress"
                                ? "text-blue-700"
                                : "text-gray-500"
                        }`}
                      >
                        {status[step.key] === "inprogress"
                          ? "Running..."
                          : status[step.key]}
                      </span>
                    </div>

                    {/* Error message display */}
                    {status[step.key] === "error" && stepErrors[step.key] && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <div className="flex items-start gap-1">
                          <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div className="break-words">
                            <div className="font-medium mb-1">Error:</div>
                            <div className="mb-2">{stepErrors[step.key]}</div>
                            {step.key === "create-gitlab-branch" && (
                              <div className="text-xs text-red-600 border-t border-red-200 pt-2 mt-2">
                                <div className="font-medium mb-1">
                                  Troubleshooting:
                                </div>
                                {stepErrors[step.key].includes("404") ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>
                                      Verify GitLab URL format:
                                      https://gitlab.com/namespace/project
                                    </li>
                                    <li>
                                      Check if project exists and is accessible
                                    </li>
                                    <li>
                                      Ensure access token has API and repository
                                      permissions
                                    </li>
                                    <li>
                                      Confirm project is not private without
                                      proper access
                                    </li>
                                  </ul>
                                ) : stepErrors[step.key].includes(
                                    "invalid reference name"
                                  ) ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>
                                      Check if base branch name exists (common:
                                      main, master, develop)
                                    </li>
                                    <li>
                                      Base branch names are case-sensitive
                                    </li>
                                    <li>
                                      Try using 'main' or 'master' as base
                                      branch
                                    </li>
                                    <li>
                                      Verify the branch exists in your GitLab
                                      repository
                                    </li>
                                    <li>Check for typos in branch name</li>
                                  </ul>
                                ) : (
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>Check GitLab URL and access token</li>
                                    <li>
                                      Verify branch names don't already exist
                                    </li>
                                    <li>
                                      Ensure proper permissions for branch
                                      creation
                                    </li>
                                    <li>
                                      Check network connectivity to GitLab
                                    </li>
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Arrow between steps */}
                  {index < pipelineSteps.length - 1 && (
                    <div className="flex items-center justify-center px-1">
                      <div
                        className={`flex items-center transition-all duration-300 ${
                          status[step.key] === "success"
                            ? "animate-pulse"
                            : status[step.key] === "inprogress"
                              ? "animate-bounce"
                              : ""
                        }`}
                      >
                        <ArrowRight
                          className={`w-6 h-6 transition-colors duration-300 ${
                            status[step.key] === "success"
                              ? "text-green-500 drop-shadow-sm"
                              : status[step.key] === "inprogress"
                                ? "text-blue-500 drop-shadow-sm"
                                : status[step.key] === "error"
                                  ? "text-red-400"
                                  : "text-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {result && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <HelpCircle className="h-6 w-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold">Confirm Action</h3>
            </div>

            <p className="text-gray-600 mb-6">
              {confirmAction === "start" &&
                "Are you sure you want to start the pipeline automation? This will execute all configured steps."}
              {confirmAction === "reset" &&
                "Are you sure you want to reset the pipeline? This will clear all progress and results."}
              {confirmAction === "cancel" &&
                "Are you sure you want to cancel the running pipeline? This will stop all ongoing operations."}
            </p>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelConfirmation}
              >
                No, Cancel
              </Button>
              <Button
                type="button"
                variant={confirmAction === "cancel" ? "destructive" : "default"}
                onClick={handleConfirmAction}
              >
                {confirmAction === "start" && "Yes, Start Pipeline"}
                {confirmAction === "reset" && "Yes, Reset"}
                {confirmAction === "cancel" && "Yes, Cancel Pipeline"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

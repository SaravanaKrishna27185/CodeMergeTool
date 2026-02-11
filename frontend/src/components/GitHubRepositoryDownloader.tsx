"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGitHubStore } from "@/store/github";
import {
  Download,
  Folder,
  Github,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  History,
  FolderOpen,
  ArrowLeft,
} from "lucide-react";

interface GitHubDownloadForm {
  repositoryUrl: string;
  personalAccessToken: string;
  downloadLocation: string;
}

interface RecentRepository {
  url: string;
  name: string;
  lastUsed: Date;
}

export default function GitHubRepositoryDownloader() {
  const [showToken, setShowToken] = useState(false);
  const [recentRepositories, setRecentRepositories] = useState<
    RecentRepository[]
  >([
    {
      url: "https://github.com/POC-LLMs/document-reader.git",
      name: "document-reader",
      lastUsed: new Date(),
    },
  ]);

  const {
    validateRepository,
    cloneRepository,
    cancelClone,
    cloneResults,
    isLoading,
    error,
    clearError,
    clearCloneResults,
    currentOperationId,
  } = useGitHubStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GitHubDownloadForm>({
    defaultValues: {
      downloadLocation: "C:\\Users\\skrishna1-d\\Downloads",
    },
  });

  const repositoryUrl = watch("repositoryUrl");
  const personalAccessToken = watch("personalAccessToken");

  const selectRecentRepository = (recentRepo: RecentRepository) => {
    setValue("repositoryUrl", recentRepo.url);
  };

  const browseDownloadLocation = async () => {
    try {
      // Check if we're in an Electron environment or have extended file system access
      if ((window as any).electronAPI?.selectDirectory) {
        // Electron app - use native directory dialog
        try {
          const result = await (window as any).electronAPI.selectDirectory();
          if (result && !result.canceled && result.filePaths?.length > 0) {
            setValue("downloadLocation", result.filePaths[0]);
            toast.success("Download location selected!");
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

          // Since we can't get the full path, we'll ask user to provide it
          const directoryName = directoryHandle.name || "selected folder";

          // Show a prompt for the user to enter the full path
          setTimeout(() => {
            const fullPath = prompt(
              `You selected the folder "${directoryName}".\n\n` +
                "Please enter the complete path to this folder:\n\n" +
                "Examples:\n" +
                "• Windows: C:\\Users\\YourName\\Documents\\MyFolder\n" +
                "• Mac: /Users/YourName/Documents/MyFolder\n" +
                "• Linux: /home/username/Documents/MyFolder",
              // Pre-fill with a common pattern
              navigator.platform.toLowerCase().includes("win")
                ? `C:\\Users\\${process.env.USERNAME || "YourName"}\\Documents\\${directoryName}`
                : `/Users/${process.env.USER || "username"}/Documents/${directoryName}`
            );

            if (fullPath && fullPath.trim()) {
              setValue("downloadLocation", fullPath.trim());
              toast.success("Download location set successfully!");
            }
          }, 500);

          return;
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error("Directory picker error:", error);
            toast.error("Directory picker failed. Please enter path manually.");
          } else {
            // User cancelled
            return;
          }
        }
      }

      // Fallback: Direct prompt for manual entry
      const userPath = prompt(
        "Enter the full path where you want to download repositories:\n\n" +
          "Examples:\n" +
          "• Windows: C:\\Users\\YourName\\Documents\\Repos\n" +
          "• Mac: /Users/username/Documents/Repos\n" +
          "• Linux: /home/username/Documents/Repos"
      );

      if (userPath && userPath.trim()) {
        setValue("downloadLocation", userPath.trim());
        toast.success("Download location set!");
      }
    } catch (error: any) {
      console.error("Browse location error:", error);
      toast.error(
        "Unable to open directory browser. Please enter the path manually."
      );

      // Focus on the input field
      const inputElement = document.querySelector(
        'input[name="downloadLocation"]'
      ) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }
  };

  const onCloneRepository = async (data: GitHubDownloadForm) => {
    try {
      clearError();

      // Debug logging
      console.log("Clone repository called with data:", data);

      // Extract repository name from URL for better UX
      const repoName =
        data.repositoryUrl.split("/").pop()?.replace(".git", "") ||
        "repository";

      console.log("Calling cloneRepository with:", {
        repositoryUrl: data.repositoryUrl,
        personalAccessToken: data.personalAccessToken
          ? "[REDACTED]"
          : "undefined",
        downloadLocation: data.downloadLocation,
      });

      const result = await cloneRepository(
        data.repositoryUrl,
        data.personalAccessToken,
        data.downloadLocation
      );

      toast.success(
        `${repoName} cloned successfully to ${data.downloadLocation}!`
      );

      // Add to recent repositories
      const newRecent: RecentRepository = {
        url: data.repositoryUrl,
        name: repoName,
        lastUsed: new Date(),
      };

      setRecentRepositories((prev) => {
        const filtered = prev.filter((repo) => repo.url !== data.repositoryUrl);
        return [newRecent, ...filtered].slice(0, 5); // Keep only 5 recent
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to clone repository");
    }
  };

  const onCancelClone = async () => {
    try {
      const cancelled = await cancelClone();
      if (cancelled) {
        toast.success("Clone operation cancelled successfully");
      } else {
        toast.error("Failed to cancel clone operation");
      }
    } catch (error) {
      toast.error("Failed to cancel clone operation");
    }
  };

  const validateAccess = async () => {
    if (!repositoryUrl || !personalAccessToken) {
      toast.error("Please enter both repository URL and Personal Access Token");
      return;
    }

    try {
      clearError();
      const isValid = await validateRepository(
        repositoryUrl,
        personalAccessToken
      );
      if (isValid) {
        toast.success("Repository access validated successfully!");
      } else {
        toast.error("Repository access validation failed");
      }
    } catch (error) {
      toast.error("Validation failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Github className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                GitHub Repository Downloader
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GitHub Repository Downloader
          </h1>
          <p className="text-gray-600">
            Clone GitHub repositories using URL and Personal Access Token
          </p>
        </div>

        <Card className="p-6 bg-white shadow-sm">
          <form
            onSubmit={handleSubmit(onCloneRepository)}
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Repository URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Repository URL:
              </label>
              <div className="space-y-2">
                <input
                  {...register("repositoryUrl", {
                    required: "Repository URL is required",
                    pattern: {
                      value: /^https:\/\/github\.com\/[^\/]+\/[^\/]+/,
                      message: "Please enter a valid GitHub repository URL",
                    },
                  })}
                  type="url"
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.repositoryUrl && (
                  <p className="text-sm text-red-600">
                    {errors.repositoryUrl.message}
                  </p>
                )}
              </div>
            </div>

            {/* Download Location */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Download Location:
              </label>
              <div className="flex space-x-2">
                <input
                  {...register("downloadLocation", {
                    required: "Download location is required",
                  })}
                  type="text"
                  placeholder="C:\Users\YourName\Documents\Repos or /home/username/repos"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={browseDownloadLocation}
                  className="px-4 flex-shrink-0"
                  title="Browse for download location"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse...
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Enter the parent directory where you want to download the
                repository. A new folder will be created inside this location
                with the repository name.
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                ⚠️ If a folder with the same repository name already exists, it
                will be automatically removed before cloning.
              </p>
              {errors.downloadLocation && (
                <p className="text-sm text-red-600">
                  {errors.downloadLocation.message}
                </p>
              )}
            </div>

            {/* Personal Access Token */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Personal Access Token:
              </label>
              <div className="relative">
                <input
                  {...register("personalAccessToken", {
                    required: "Personal Access Token is required",
                  })}
                  type={showToken ? "text" : "password"}
                  placeholder="Enter your GitHub Personal Access Token"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.personalAccessToken && (
                <p className="text-sm text-red-600">
                  {errors.personalAccessToken.message}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Cloning Repository...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Clone Repository
                  </>
                )}
              </Button>

              {/* Cancel Button - only show when operation is in progress */}
              {isLoading && currentOperationId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelClone}
                  className="px-6 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={validateAccess}
                disabled={isLoading || !repositoryUrl || !personalAccessToken}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Recent Repositories */}
        {recentRepositories.length > 0 && (
          <Card className="mt-6 p-4 bg-white shadow-sm">
            <div className="flex items-center mb-3">
              <History className="h-4 w-4 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">
                Recent Repositories:
              </h3>
            </div>
            <div className="space-y-2">
              {recentRepositories.map((repo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => selectRecentRepository(repo)}
                >
                  <div className="flex items-center space-x-2">
                    <Github className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{repo.name}</span>
                    <span className="text-xs text-gray-500">-</span>
                    <span className="text-xs text-gray-500">{repo.url}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Clone Results */}
        {cloneResults.length > 0 && (
          <Card className="mt-6 p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Clone Results:</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCloneResults}
                className="text-gray-500"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-3">
              {cloneResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center mb-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        result.success ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {result.success ? "Successfully Cloned" : "Clone Failed"}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${
                      result.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.success && result.localPath && (
                    <div className="mt-2 flex items-center">
                      <Folder className="h-3 w-3 text-gray-500 mr-1" />
                      <p className="text-xs text-gray-600 font-mono">
                        {result.localPath}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

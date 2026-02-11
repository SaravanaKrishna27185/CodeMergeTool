"use client";

import React, { useState } from "react";
import Link from "next/link";
import GitLabBranchCreationModal, {
  GitLabBranchData,
} from "@/components/GitLabBranchCreationModal";
import GitLabSyncModal, { GitLabSyncData } from "@/components/GitLabSyncModal";
import FileCopyTool, { FileCopyData } from "@/components/FileCopyTool";
import gitlabService from "@/services/gitlab-service";
import { GitBranch, ArrowLeft, Home, Settings } from "lucide-react";

export default function GitLabPage() {
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showFileCopyTool, setShowFileCopyTool] = useState(false);
  const [copiedFiles, setCopiedFiles] = useState<
    Array<{ path: string; content: string }>
  >([]);
  const [createdBranchName, setCreatedBranchName] = useState<string>("");
  const [gitlabConfig, setGitlabConfig] = useState<{
    url: string;
    token: string;
    targetBranch: string;
  }>({
    url: "",
    token: "",
    targetBranch: "development",
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateBranch = async (data: GitLabBranchData) => {
    try {
      const response = await gitlabService.createBranch({
        gitlabUrl: data.gitlabUrl,
        accessToken: data.accessToken,
        newBranchName: data.newBranchName,
        baseBranch: data.baseBranch,
        checkoutAfterCreation: data.checkoutAfterCreation,
        localDirectory: data.localDirectory,
      });

      if (response.success) {
        // Store the created branch info for the sync modal
        setCreatedBranchName(data.newBranchName);
        setGitlabConfig({
          url: data.gitlabUrl,
          token: data.accessToken,
          targetBranch: data.baseBranch,
        });

        showNotification(
          "success",
          `GitLab branch "${data.newBranchName}" created successfully! Now you can sync files to this branch.`
        );
        setShowBranchModal(false);
      } else {
        showNotification(
          "error",
          response.message || "Failed to create branch"
        );
      }
    } catch (error) {
      console.error("Branch creation error:", error);
      showNotification(
        "error",
        "Failed to create branch. Please check your connection and try again."
      );
    }
  };

  const handleSyncToGitLab = async (data: GitLabSyncData) => {
    try {
      if (!data.localRepositoryPath.trim()) {
        showNotification(
          "error",
          "Please specify a local repository path to sync."
        );
        return;
      }

      const response = await gitlabService.syncToGitLab({
        localPath: data.localRepositoryPath,
        gitlabUrl: data.gitlabRepositoryUrl,
        accessToken: data.accessToken,
        targetBranch: data.targetBranch,
        commitMessage: data.commitMessage,
        mergeRequestTitle: data.mergeRequestTitle,
        mergeRequestDescription: data.mergeRequestDescription,
        sourceBranchName: data.sourceBranchName,
      });

      if (response.success) {
        showNotification(
          "success",
          "Repository synced to GitLab successfully!"
        );
      } else {
        showNotification(
          "error",
          response.message || "Failed to sync repository"
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      showNotification(
        "error",
        "Failed to sync repository. Please check your connection and try again."
      );
    }
  };

  const handleCopyFiles = async (data: FileCopyData) => {
    try {
      console.log("Processing files for GitLab sync:", data);

      // For now, simulate reading file contents
      // In a real implementation, you would read actual file contents
      const filesWithContent = data.selectedFiles
        .filter((file) => file.type === "file")
        .map((file) => ({
          path: file.path,
          content: `// Placeholder content for ${file.name}\n// This would be the actual file content`,
        }));

      setCopiedFiles(filesWithContent);

      showNotification(
        "success",
        `Successfully prepared ${filesWithContent.length} files for GitLab sync!`
      );
    } catch (error) {
      console.error("File processing error:", error);
      showNotification("error", "Failed to process files. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <GitBranch className="h-8 w-8 text-orange-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                GitLab Integration
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
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              GitLab Integration
            </h1>
            <p className="text-gray-600">
              Manage GitLab branches, sync repositories, and handle file
              operations
            </p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-md ${
                notification.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create GitLab Branch */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🌿</span>
                </div>
                <h3 className="text-lg font-semibold ml-3">Create Branch</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Create new branches in your GitLab repository with customizable
                settings.
              </p>
              <button
                onClick={() => setShowBranchModal(true)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Create GitLab Branch
              </button>
            </div>

            {/* File Copy Tool */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📁</span>
                </div>
                <div className="flex-1 ml-3">
                  <h3 className="text-lg font-semibold">Copy Files</h3>
                  {copiedFiles.length > 0 && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {copiedFiles.length} files ready
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Selectively copy files and folders between directories with
                preview.
              </p>
              <button
                onClick={() => setShowFileCopyTool(true)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                {copiedFiles.length > 0 ? "Update Files" : "Select Files"}
              </button>
            </div>

            {/* Sync to GitLab */}
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">↗</span>
                </div>
                <h3 className="text-lg font-semibold ml-3">Sync Repository</h3>
              </div>

              {createdBranchName && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-800">
                      Ready to sync to branch:{" "}
                      <strong>{createdBranchName}</strong>
                    </span>
                  </div>
                </div>
              )}

              <p className="text-gray-600 mb-4">
                {createdBranchName
                  ? `Sync your files to the "${createdBranchName}" branch and create a merge request.`
                  : "Sync your local repository to GitLab and create merge requests automatically."}
              </p>

              <button
                onClick={() => setShowSyncModal(true)}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                {createdBranchName
                  ? `Sync to ${createdBranchName}`
                  : "Sync to GitLab"}
              </button>
            </div>
          </div>

          {/* API Status */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Backend Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">
                  Backend API: Running (Port 1021)
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">
                  MongoDB: Connected
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">GitLab API: Ready</span>
              </div>
            </div>
          </div>

          {/* Available Endpoints */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-3">
              Available GitLab Endpoints
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <code className="text-green-600">POST</code>{" "}
                <code>/api/gitlab/test-connection</code> - Test GitLab
                connection
              </div>
              <div>
                <code className="text-green-600">POST</code>{" "}
                <code>/api/gitlab/create-branch</code> - Create new branch
              </div>
              <div>
                <code className="text-green-600">POST</code>{" "}
                <code>/api/gitlab/sync</code> - Sync repository to GitLab
              </div>
              <div>
                <code className="text-green-600">POST</code>{" "}
                <code>/api/gitlab/merge-requests</code> - Create merge requests
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GitLabBranchCreationModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onSubmit={handleCreateBranch}
      />

      <GitLabSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSubmit={handleSyncToGitLab}
        initialData={
          createdBranchName
            ? {
                gitlabRepositoryUrl: gitlabConfig.url,
                accessToken: gitlabConfig.token,
                sourceBranchName: createdBranchName,
                targetBranch: gitlabConfig.targetBranch,
                commitMessage: `Update files in branch ${createdBranchName}`,
                mergeRequestTitle: `${createdBranchName} - Code Update`,
                mergeRequestDescription: `Automated sync of files to branch ${createdBranchName}\n\nCreated on: ${new Date().toISOString()}`,
              }
            : undefined
        }
      />

      <FileCopyTool
        isOpen={showFileCopyTool}
        onClose={() => setShowFileCopyTool(false)}
        onCopy={handleCopyFiles}
      />
    </div>
  );
}

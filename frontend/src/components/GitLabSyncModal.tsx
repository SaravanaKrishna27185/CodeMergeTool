"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface GitLabSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GitLabSyncData) => void;
  initialData?: Partial<GitLabSyncData>;
}

export interface GitLabSyncData {
  localRepositoryPath: string;
  gitlabRepositoryUrl: string;
  accessToken: string;
  sourceBranchName: string;
  targetBranch: string;
  commitMessage: string;
  mergeRequestTitle: string;
  mergeRequestDescription: string;
}

const GitLabSyncModal: React.FC<GitLabSyncModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<GitLabSyncData>({
    localRepositoryPath: "C:/Users/skrishna1-d/Documents/GitLab/idp-solution",
    gitlabRepositoryUrl:
      "https://radcab/intelligent-document-processing/idp-solution.git",
    accessToken: "••••••••••••••••••••••••",
    sourceBranchName: "",
    targetBranch: "development",
    commitMessage: "Updated code with new changes",
    mergeRequestTitle: "New feature - 20250915",
    mergeRequestDescription:
      "Implemented new feature\nCreated on: 2025-09-15 16:24:02",
    ...initialData, // Override with initial data if provided
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof GitLabSyncData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error syncing to GitLab:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseLocalPath = () => {
    // In a real application, this would open a directory picker
    const input = document.querySelector(
      'input[name="localRepositoryPath"]'
    ) as HTMLInputElement;
    if (input) input.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">📋</span>
            </div>
            <h2 className="text-lg font-medium">
              Sync Local Repository to GitLab
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Local Repository Path */}
          <div className="space-y-2">
            <label
              htmlFor="localRepositoryPath"
              className="block text-sm font-medium"
            >
              Local Repository Path:
            </label>
            <div className="flex gap-2">
              <input
                id="localRepositoryPath"
                name="localRepositoryPath"
                type="text"
                value={formData.localRepositoryPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("localRepositoryPath", e.target.value)
                }
                placeholder="Select local repository path"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleBrowseLocalPath}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* GitLab Repository URL */}
          <div className="space-y-2">
            <label
              htmlFor="gitlabRepositoryUrl"
              className="block text-sm font-medium"
            >
              GitLab Repository URL:
            </label>
            <input
              id="gitlabRepositoryUrl"
              name="gitlabRepositoryUrl"
              type="text"
              value={formData.gitlabRepositoryUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("gitlabRepositoryUrl", e.target.value)
              }
              placeholder="https://gitlab.com/username/repository.git"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* GitLab Access Token */}
          <div className="space-y-2">
            <label htmlFor="accessToken" className="block text-sm font-medium">
              GitLab Access Token:
            </label>
            <input
              id="accessToken"
              name="accessToken"
              type="password"
              value={formData.accessToken}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("accessToken", e.target.value)
              }
              placeholder="Enter your GitLab access token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Source Branch Name */}
          <div className="space-y-2">
            <label
              htmlFor="sourceBranchName"
              className="block text-sm font-medium"
            >
              Source Branch Name:
            </label>
            <input
              id="sourceBranchName"
              name="sourceBranchName"
              type="text"
              value={formData.sourceBranchName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("sourceBranchName", e.target.value)
              }
              placeholder="feature/new-feature"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Target Branch */}
          <div className="space-y-2">
            <label htmlFor="targetBranch" className="block text-sm font-medium">
              Target Branch:
            </label>
            <select
              id="targetBranch"
              value={formData.targetBranch}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleInputChange("targetBranch", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="main">main</option>
              <option value="master">master</option>
              <option value="development">development</option>
              <option value="develop">develop</option>
            </select>
          </div>

          {/* Commit Message */}
          <div className="space-y-2">
            <label
              htmlFor="commitMessage"
              className="block text-sm font-medium"
            >
              Commit Message:
            </label>
            <textarea
              id="commitMessage"
              name="commitMessage"
              value={formData.commitMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange("commitMessage", e.target.value)
              }
              placeholder="Enter commit message"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          {/* Merge Request Title */}
          <div className="space-y-2">
            <label
              htmlFor="mergeRequestTitle"
              className="block text-sm font-medium"
            >
              Merge Request Title:
            </label>
            <input
              id="mergeRequestTitle"
              name="mergeRequestTitle"
              type="text"
              value={formData.mergeRequestTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("mergeRequestTitle", e.target.value)
              }
              placeholder="Enter merge request title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Merge Request Description */}
          <div className="space-y-2">
            <label
              htmlFor="mergeRequestDescription"
              className="block text-sm font-medium"
            >
              Merge Request Description:
            </label>
            <textarea
              id="mergeRequestDescription"
              name="mergeRequestDescription"
              value={formData.mergeRequestDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange("mergeRequestDescription", e.target.value)
              }
              placeholder="Enter merge request description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Syncing..." : "Commit, Push, and Create MR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GitLabSyncModal;

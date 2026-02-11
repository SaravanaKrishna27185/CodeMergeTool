"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface GitLabBranchCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GitLabBranchData) => void;
}

export interface GitLabBranchData {
  gitlabUrl: string;
  accessToken: string;
  newBranchName: string;
  baseBranch: string;
  checkoutAfterCreation: boolean;
  localDirectory: string;
}

const GitLabBranchCreationModal: React.FC<GitLabBranchCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<GitLabBranchData>({
    gitlabUrl:
      "https://radcab/intelligent-document-processing/idp-solution.git",
    accessToken: "",
    newBranchName: "feature/new-branch",
    baseBranch: "development",
    checkoutAfterCreation: false,
    localDirectory: "C:/Users/skrishna1-d/Documents/GitLab",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    field: keyof GitLabBranchData,
    value: string | boolean
  ) => {
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
      console.error("Error creating GitLab branch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseDirectory = () => {
    // In a real application, this would open a directory picker
    // For now, we'll just focus on the input field
    const input = document.querySelector(
      'input[name="localDirectory"]'
    ) as HTMLInputElement;
    if (input) input.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">📝</span>
            </div>
            <h2 className="text-lg font-medium">Create GitLab Branch</h2>
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
          {/* GitLab Repository URL */}
          <div className="space-y-2">
            <label htmlFor="gitlabUrl" className="block text-sm font-medium">
              GitLab Repository URL:
            </label>
            <input
              id="gitlabUrl"
              name="gitlabUrl"
              type="text"
              value={formData.gitlabUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("gitlabUrl", e.target.value)
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

          {/* New Branch Name */}
          <div className="space-y-2">
            <label
              htmlFor="newBranchName"
              className="block text-sm font-medium"
            >
              New Branch Name:
            </label>
            <input
              id="newBranchName"
              name="newBranchName"
              type="text"
              value={formData.newBranchName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("newBranchName", e.target.value)
              }
              placeholder="feature/new-branch"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Base Branch */}
          <div className="space-y-2">
            <label htmlFor="baseBranch" className="block text-sm font-medium">
              Base Branch:
            </label>
            <select
              id="baseBranch"
              value={formData.baseBranch}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleInputChange("baseBranch", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="main">main</option>
              <option value="master">master</option>
              <option value="development">development</option>
              <option value="develop">develop</option>
            </select>
          </div>

          {/* Checkout Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Checkout Options
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="checkoutAfterCreation"
                type="checkbox"
                checked={formData.checkoutAfterCreation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("checkoutAfterCreation", e.target.checked)
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="checkoutAfterCreation"
                className="text-sm font-normal cursor-pointer"
              >
                Checkout branch after creation
              </label>
            </div>
          </div>

          {/* Local Directory */}
          <div className="space-y-2">
            <label
              htmlFor="localDirectory"
              className="block text-sm font-medium"
            >
              Local Directory:
            </label>
            <div className="flex gap-2">
              <input
                id="localDirectory"
                name="localDirectory"
                type="text"
                value={formData.localDirectory}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("localDirectory", e.target.value)
                }
                placeholder="C:/Users/username/Documents/GitLab"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleBrowseDirectory}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse...
              </button>
            </div>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Creating Branch..." : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GitLabBranchCreationModal;

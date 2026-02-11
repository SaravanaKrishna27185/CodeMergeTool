import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Folder, File, HelpCircle } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import settingsService, {
  PipelineSettings as IPipelineSettings,
} from "@/services/settings-service";
// import { useSession } from 'next-auth/react';

// Use the interface from the service for consistency
type PipelineSettings = IPipelineSettings;

const defaultSettings: PipelineSettings = {
  githubRepoUrl: "",
  githubAccessToken: "",
  githubDownloadLocation: "",
  gitlabRepoUrl: "",
  gitlabAccessToken: "",
  gitlabBranchName: "",
  gitlabBaseBranch: "",
  gitlabCheckoutLocation: "",
  sourcePath: "",
  destinationPath: "",
  files: "",
  copyMode: "files",
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
};

export default function PipelineSettingsCard({
  onSave,
}: {
  onSave?: (settings: PipelineSettings) => void;
}) {
  const [settings, setSettings] = useState<PipelineSettings>(defaultSettings);
  const [loading, setLoading] = useState(true); // Start with loading = true
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // const { data: session } = useSession();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsData = await settingsService.loadPipelineSettings();
        if (settingsData) {
          setSettings(settingsData);
        } else {
          // No settings found, use defaults
          setSettings(defaultSettings);
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        setMessage("Failed to load settings. Please try again.");
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings({ ...settings, [name]: value });
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setSettings({ ...settings, [name]: checked });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await settingsService.savePipelineSettings(settings);
      if (response.success) {
        setMessage("Settings saved successfully!");
        if (onSave) onSave(settings);
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new Event("pipeline-settings-updated"));
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      const errorMessage =
        err.response?.data?.error || "Error saving settings. Please try again.";
      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 max-w-xl mx-auto my-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading settings...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 w-full mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">
        Pipeline Default Settings
      </h2>

      <form className="space-y-6">
        {/* GitHub Settings Section */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-md font-medium text-gray-700 mb-3">
            GitHub Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="githubRepoUrl"
              >
                GitHub Repo URL
              </label>
              <Input
                id="githubRepoUrl"
                name="githubRepoUrl"
                value={settings.githubRepoUrl}
                onChange={handleChange}
                placeholder="https://github.com/owner/repo"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="githubAccessToken"
              >
                GitHub Access Token
              </label>
              <Input
                type="password"
                id="githubAccessToken"
                name="githubAccessToken"
                value={settings.githubAccessToken}
                onChange={handleChange}
                placeholder="Enter GitHub access token"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="githubDownloadLocation"
              >
                Download Location
              </label>
              <div className="flex gap-2">
                <Input
                  id="githubDownloadLocation"
                  name="githubDownloadLocation"
                  value={settings.githubDownloadLocation}
                  onChange={handleChange}
                  placeholder={`Default: ${typeof navigator !== "undefined" && navigator.platform.includes("Win") ? "C:\\Users\\" + (process.env.USERNAME || "user") + "\\Downloads" : "/home/user/Downloads"}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const path = prompt("Enter download location path:");
                    if (path) {
                      setSettings((prev) => ({
                        ...prev,
                        githubDownloadLocation: path,
                      }));
                    }
                  }}
                  className="px-3"
                  title="Browse for location"
                >
                  📁
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* GitLab Settings Section */}
        <div className="border-l-4 border-orange-500 pl-4">
          <h3 className="text-md font-medium text-gray-700 mb-3">
            GitLab Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="gitlabRepoUrl"
              >
                GitLab Repo URL
              </label>
              <Input
                id="gitlabRepoUrl"
                name="gitlabRepoUrl"
                value={settings.gitlabRepoUrl}
                onChange={handleChange}
                placeholder="https://gitlab.com/owner/repo"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="gitlabAccessToken"
              >
                GitLab Access Token
              </label>
              <Input
                type="password"
                id="gitlabAccessToken"
                name="gitlabAccessToken"
                value={settings.gitlabAccessToken}
                onChange={handleChange}
                placeholder="Enter GitLab access token"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="gitlabBranchName"
                >
                  New Branch Name
                </label>
                <Input
                  id="gitlabBranchName"
                  name="gitlabBranchName"
                  value={settings.gitlabBranchName}
                  onChange={handleChange}
                  placeholder="feature-branch"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="gitlabBaseBranch"
                >
                  Base Branch
                </label>
                <Input
                  id="gitlabBaseBranch"
                  name="gitlabBaseBranch"
                  value={settings.gitlabBaseBranch}
                  onChange={handleChange}
                  placeholder="main"
                />
              </div>
            </div>

            {/* GitLab Checkout Location */}
            <div className="mt-4">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="gitlabCheckoutLocation"
              >
                Checkout Location
              </label>
              <div className="flex gap-2">
                <Input
                  id="gitlabCheckoutLocation"
                  name="gitlabCheckoutLocation"
                  value={settings.gitlabCheckoutLocation}
                  onChange={handleChange}
                  placeholder={`Default: ${typeof navigator !== "undefined" && navigator.platform.includes("Win") ? "C:\\Users\\Projects\\GitLab" : "/Users/Projects/GitLab"}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const path = prompt("Enter GitLab checkout location path:");
                    if (path) {
                      setSettings((prev) => ({
                        ...prev,
                        gitlabCheckoutLocation: path,
                      }));
                    }
                  }}
                  className="px-3"
                  title="Browse for location"
                >
                  📁
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Local directory where GitLab repository will be cloned and
                branches checked out
              </p>
            </div>
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
              <label className="block text-sm font-medium mb-2">
                Copy Mode
              </label>
              <Select
                value={settings.copyMode}
                onValueChange={(value) => handleSelectChange("copyMode", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select copy mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="files">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      <span>Files Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="folders">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>Folders with Structure</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <File className="h-4 w-4" />
                      <span>Mixed (Files + Folders)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source and Destination Paths */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="sourcePath"
                >
                  Source Path
                </label>
                <Input
                  id="sourcePath"
                  name="sourcePath"
                  value={settings.sourcePath}
                  onChange={handleChange}
                  placeholder="/src or /src/components"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="destinationPath"
                >
                  Destination Path
                </label>
                <Input
                  id="destinationPath"
                  name="destinationPath"
                  value={settings.destinationPath}
                  onChange={handleChange}
                  placeholder="/dest or /target/components"
                />
              </div>
            </div>

            {/* Preserve Folder Structure */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserveFolderStructure"
                checked={settings.preserveFolderStructure}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(
                    "preserveFolderStructure",
                    checked as boolean
                  )
                }
              />
              <label
                htmlFor="preserveFolderStructure"
                className="text-sm font-medium"
              >
                Preserve Folder Structure
              </label>
            </div>

            {/* Files to Copy (conditional) */}
            {(settings.copyMode === "files" ||
              settings.copyMode === "mixed") && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="files"
                >
                  Files to Copy
                  <span className="text-xs text-gray-500 ml-1">
                    (comma-separated patterns)
                  </span>
                </label>
                <Input
                  id="files"
                  name="files"
                  value={settings.files}
                  onChange={handleChange}
                  placeholder="file1.js, file2.js, *.ts, **/*.jsx"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Examples: *.js, **/*.ts, src/components/*.jsx
                </div>
              </div>
            )}

            {/* Folders to Include (conditional) */}
            {(settings.copyMode === "folders" ||
              settings.copyMode === "mixed") && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="includeFolders"
                >
                  Folders to Include
                  <span className="text-xs text-gray-500 ml-1">
                    (comma-separated paths)
                  </span>
                </label>
                <Input
                  id="includeFolders"
                  name="includeFolders"
                  value={settings.includeFolders}
                  onChange={handleChange}
                  placeholder="src/components, src/utils, docs, assets"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Examples: src/components, docs, assets/images
                </div>
              </div>
            )}

            {/* Exclude Patterns */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="excludePatterns"
              >
                Exclude Patterns
                <span className="text-xs text-gray-500 ml-1">
                  (patterns to ignore)
                </span>
              </label>
              <Input
                id="excludePatterns"
                name="excludePatterns"
                value={settings.excludePatterns}
                onChange={handleChange}
                placeholder="node_modules, .git, .DS_Store, *.log"
              />
              <div className="text-xs text-gray-500 mt-1">
                Common: node_modules, .git, .DS_Store, *.log, dist, build
              </div>
            </div>
          </div>
        </div>

        {/* Merge Request Settings Section */}
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-md font-medium text-gray-700 mb-3">
            Merge Request Configuration
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="mergeRequestSourceBranch"
                >
                  Source Branch
                </label>
                <Input
                  id="mergeRequestSourceBranch"
                  name="mergeRequestSourceBranch"
                  value={settings.mergeRequestSourceBranch}
                  onChange={handleChange}
                  placeholder="feature-branch"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="mergeRequestTargetBranch"
                >
                  Target Branch
                </label>
                <Input
                  id="mergeRequestTargetBranch"
                  name="mergeRequestTargetBranch"
                  value={settings.mergeRequestTargetBranch}
                  onChange={handleChange}
                  placeholder="main"
                />
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="mergeRequestTitle"
              >
                Merge Request Title
              </label>
              <Input
                id="mergeRequestTitle"
                name="mergeRequestTitle"
                value={settings.mergeRequestTitle}
                onChange={handleChange}
                placeholder="feat: Add new feature"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="mergeRequestDescription"
              >
                Merge Request Description
              </label>
              <Input
                id="mergeRequestDescription"
                name="mergeRequestDescription"
                value={settings.mergeRequestDescription}
                onChange={handleChange}
                placeholder="Description of the changes"
              />
            </div>
          </div>

          {/* Additional Merge Request Fields */}
          <div className="mt-4 space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="mergeRequestCheckoutLocation"
              >
                Checkout Location
              </label>
              <div className="flex gap-2">
                <Input
                  id="mergeRequestCheckoutLocation"
                  name="mergeRequestCheckoutLocation"
                  value={settings.mergeRequestCheckoutLocation}
                  onChange={handleChange}
                  placeholder={`Default: ${typeof navigator !== "undefined" && navigator.platform.includes("Win") ? "C:\\Users\\MergeRequests\\GitLab" : "/Users/MergeRequests/GitLab"}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const path = prompt(
                      "Enter merge request checkout location path:"
                    );
                    if (path) {
                      setSettings((prev) => ({
                        ...prev,
                        mergeRequestCheckoutLocation: path,
                      }));
                    }
                  }}
                  className="px-3"
                  title="Browse for location"
                >
                  📁
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Local directory where merge request changes will be managed
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="commitMessage"
              >
                Commit Message
              </label>
              <Input
                id="commitMessage"
                name="commitMessage"
                value={settings.commitMessage}
                onChange={handleChange}
                placeholder="feat: Update from automated pipeline"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default commit message for pipeline changes
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="changesDescription"
              >
                Changes Description
              </label>
              <textarea
                id="changesDescription"
                name="changesDescription"
                value={settings.changesDescription}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    changesDescription: e.target.value,
                  }))
                }
                placeholder="Detailed description of changes made during the pipeline..."
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              />
              <p className="text-xs text-gray-500 mt-1">
                Template for describing pipeline changes
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Settings...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>

          {message && (
            <div
              className={`text-sm mt-3 p-3 rounded-md ${
                message.includes("successfully")
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : "text-red-700 bg-red-50 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}

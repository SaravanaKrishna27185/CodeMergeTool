"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useGitHubStore } from "@/store/github";
import {
  GitBranch,
  GitMerge,
  LogOut,
  User,
  Github,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  ArrowRight,
  Zap,
  Settings,
  Home,
} from "lucide-react";
import PipelineAutomationCard from "@/components/PipelineAutomationCard";
import PipelineSettingsCard from "@/components/PipelineSettingsCard";
import QuickStats from "@/components/QuickStats";

export default function DashboardPage() {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    router.push("/");
  };
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    logout,
    loadUser,
    isLoading: authLoading,
  } = useAuthStore();
  const { cloneResults, clearCloneResults } = useGitHubStore();

  <Link href="/settings">
    <Card
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
      role="button"
      tabIndex={0}
      aria-label="Open Settings"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
      <p className="text-gray-600 text-sm">
        Configure default download locations, tokens, and repository preferences
      </p>
    </Card>
  </Link>;
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <GitMerge className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Code Merge Tool
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span>
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your GitHub repositories and perform code merge operations
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* GitHub Repository Downloader Card */}
            <Link href="/github">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Github className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  GitHub Repository Downloader
                </h3>
                <p className="text-gray-600 text-sm">
                  Clone GitHub repositories using URL and Personal Access Token
                  with a dedicated interface
                </p>
              </Card>
            </Link>

            {/* GitLab Integration Card */}
            <Link href="/gitlab">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <GitBranch className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  GitLab Integration
                </h3>
                <p className="text-gray-600 text-sm">
                  Create branches, sync repositories, and manage file operations
                  with GitLab integration
                </p>
              </Card>
            </Link>

            {/* Settings Card (click to navigate to settings page) */}
            <Link href="/settings">
              <Card
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label="Open Settings"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Settings
                </h3>
                <p className="text-gray-600 text-sm">
                  Configure default download locations, tokens, and repository
                  preferences
                </p>
              </Card>
            </Link>
          </div>

          {/* Settings Card (click to open settings form) */}
          {/* The PipelineSettingsCard will be shown only when the user clicks the Settings card below */}

          {/* Pipeline Automation Card */}
          <div className="mb-8">
            <Card className="p-6">
              <PipelineAutomationCard />
            </Card>
          </div>

          {/* Pipeline Quick Stats */}
          {isAuthenticated && (
            <div className="mb-8">
              <QuickStats />
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Clone Results */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Clone Results
                </h3>
                {cloneResults.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCloneResults}
                    className="text-gray-500"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {cloneResults.length === 0 ? (
                <div className="text-center py-8">
                  <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    No repositories cloned yet. Use the GitHub Repository
                    Downloader to get started.
                  </p>
                  <Link href="/github">
                    <Button className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Start Cloning
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cloneResults.slice(0, 3).map((result, index) => (
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
                          {result.success
                            ? "Successfully Cloned"
                            : "Clone Failed"}
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
                        <p className="text-xs text-gray-600 mt-1 font-mono truncate">
                          {result.localPath}
                        </p>
                      )}
                    </div>
                  ))}
                  {cloneResults.length > 3 && (
                    <p className="text-sm text-gray-500 text-center">
                      And {cloneResults.length - 3} more results...
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">
                      Successful Clones
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {cloneResults.filter((r) => r.success).length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">
                      Failed Attempts
                    </span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {cloneResults.filter((r) => !r.success).length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Github className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">
                      Total Operations
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {cloneResults.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

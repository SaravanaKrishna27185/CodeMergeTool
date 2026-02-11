"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PipelineStatsService,
  PipelineStats,
} from "@/services/pipeline-stats-service";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface QuickStatsProps {
  className?: string;
}

export default function QuickStats({ className = "" }: QuickStatsProps) {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const pipelineStats = await PipelineStatsService.getUserPipelineStats();
      setStats(pipelineStats);
    } catch (err: any) {
      console.error("Failed to load pipeline stats:", err);

      // Handle different error types
      let errorMessage = "Failed to load statistics";

      if (err.response?.data?.error) {
        // Handle API error responses
        if (typeof err.response.data.error === "string") {
          errorMessage = err.response.data.error;
        } else if (
          typeof err.response.data.error === "object" &&
          err.response.data.error.message
        ) {
          errorMessage = err.response.data.error.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      // Only show toast for non-auth errors to avoid spam
      if (!err.response || err.response.status !== 401) {
        toast.error("Failed to load pipeline statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Loading pipeline statistics...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to Load Statistics
          </h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!stats || typeof stats !== "object") {
    return null;
  }

  // Ensure stats has required properties with defaults
  const safeStats = {
    total: stats.total || 0,
    successful: stats.successful || 0,
    failed: stats.failed || 0,
    inProgress: stats.inProgress || 0,
    avgDuration: stats.avgDuration || 0,
    recentRuns: Array.isArray(stats.recentRuns) ? stats.recentRuns : [],
  };

  const successRate =
    safeStats.total > 0
      ? Math.round((safeStats.successful / safeStats.total) * 100)
      : 0;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Pipeline Quick Stats
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Your automation activity at a glance
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          size="sm"
          variant="ghost"
          className="text-gray-500 hover:text-gray-700"
        >
          <Activity className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Runs */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {safeStats.total}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Runs</div>
        </div>

        {/* Success Rate */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {successRate}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Success Rate</div>
        </div>

        {/* Successful */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-2xl font-bold text-green-600">
              {safeStats.successful}
            </span>
          </div>
          <div className="text-xs text-gray-500">Successful</div>
        </div>

        {/* Failed */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="h-4 w-4 text-red-600 mr-1" />
            <span className="text-2xl font-bold text-red-600">
              {safeStats.failed}
            </span>
          </div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span>
            Avg Duration:{" "}
            {PipelineStatsService.formatDuration(safeStats.avgDuration)}
          </span>
        </div>
        {safeStats.inProgress > 0 && (
          <div className="flex items-center text-sm text-blue-600">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>{safeStats.inProgress} in progress</span>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {safeStats.recentRuns && safeStats.recentRuns.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              Recent Pipeline Runs
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View All
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            {safeStats.recentRuns.slice(0, 3).map((run, index) => {
              // Ensure run object has required properties
              const safeRun = {
                id: run?.id || `run-${index}`,
                status: run?.status || "idle",
                startTime: run?.startTime,
                duration: run?.duration,
                configuration: {
                  ...run?.configuration,
                  mergeRequestTitle:
                    run?.configuration?.mergeRequestTitle ||
                    "Untitled Pipeline",
                },
              };

              return (
                <div
                  key={safeRun.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div
                      className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-3
                      ${PipelineStatsService.getStatusColor(safeRun.status)}
                    `}
                    >
                      <span className="mr-1">
                        {PipelineStatsService.getStatusIcon(safeRun.status)}
                      </span>
                      {safeRun.status.replace("_", " ")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {safeRun.configuration.mergeRequestTitle}
                      </div>
                      <div className="text-xs text-gray-500">
                        {safeRun.startTime
                          ? new Date(safeRun.startTime).toLocaleDateString()
                          : "Unknown date"}{" "}
                        •{" "}
                        {PipelineStatsService.formatDuration(safeRun.duration)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    {safeRun.startTime
                      ? new Date(safeRun.startTime).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )
                      : "N/A"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeStats.total === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Pipeline Runs Yet
          </h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Start your first pipeline automation to see statistics and insights
            here.
          </p>
        </div>
      )}
    </Card>
  );
}

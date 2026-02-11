import React from "react";

interface ProgressBarProps {
  percentage: number;
  message?: string;
  phase?: string;
  className?: string;
}

export default function ProgressBar({
  percentage,
  message,
  phase,
  className = "",
}: ProgressBarProps) {
  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Progress message */}
      {(message || phase) && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700">
            {message || (phase && `Phase: ${phase}`)}
          </span>
          <span className="text-gray-500 font-medium">{percentage}%</span>
        </div>
      )}

      {/* Progress bar container */}
      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
          }}
        >
          {/* Animated shine effect */}
          <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}

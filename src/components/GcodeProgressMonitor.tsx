"use client";

import { useState, useEffect } from "react";
import { useWebSocketContext } from "./WebSocketProvider";

interface GcodeProgress {
  progress: number;
  status: string;
  machineId?: string;
}

export function GcodeProgressMonitor() {
  const { lastMessage } = useWebSocketContext();
  const [progress, setProgress] = useState<GcodeProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastMessage?.type === "gcode_progress") {
      const progressData = lastMessage.data as GcodeProgress;
      setProgress(progressData);
      setIsVisible(true);

      // Auto-hide after completion
      if (progressData.progress >= 100) {
        setTimeout(() => {
          setIsVisible(false);
          setProgress(null);
        }, 3000);
      }
    } else if (lastMessage?.type === "error") {
      setIsVisible(false);
      setProgress(null);
    }
  }, [lastMessage]);

  if (!isVisible || !progress) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-80 z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">G-code Execution</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {progress.machineId && (
        <p className="text-sm text-gray-600 mb-2">
          Machine: {progress.machineId}
        </p>
      )}

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{progress.status}</span>
          <span className="font-medium">{progress.progress}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {progress.progress >= 100 && (
        <div className="text-green-600 text-sm font-medium">
          ✓ Completed successfully!
        </div>
      )}
    </div>
  );
}

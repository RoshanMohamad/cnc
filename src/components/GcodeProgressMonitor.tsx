"use client";

import { useState } from "react";

interface GcodeProgress {
  progress: number;
  status: string;
  machineId?: string;
}

export function GcodeProgressMonitor() {
  const [progress, setProgress] = useState<GcodeProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Function to manually update progress (can be called from parent components)
  // const updateProgress = (progressData: GcodeProgress) => {
  //   setProgress(progressData);
  //   setIsVisible(true);

  //   // Auto-hide after completion
  //   if (progressData.progress >= 100) {
  //     setTimeout(() => {
  //       setIsVisible(false);
  //       setProgress(null);
  //     }, 3000);
  //   }
  // };

  // // Function to hide the monitor
  // const hideMonitor = () => {
  //   setIsVisible(false);
  //   setProgress(null);
  // };

  // Function to simulate progress (for testing purposes)
  const simulateProgress = () => {
    let currentProgress = 0;
    setIsVisible(true);

    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress({
        progress: currentProgress,
        status: currentProgress < 100 ? "Executing G-code..." : "Completed",
        machineId: "192.168.1.100",
      });

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsVisible(false);
          setProgress(null);
        }, 3000);
      }
    }, 500);
  };

  if (!isVisible || !progress) {
    return (
      // Optional: Show a button to test the progress monitor
      <button
        onClick={simulateProgress}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
      >
        Test Progress
      </button>
    );
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

// Export the component and helper functions
export default GcodeProgressMonitor;

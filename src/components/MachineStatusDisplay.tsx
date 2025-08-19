"use client";

import { useMachineStatus, MachineStatus } from "@/hooks/useMachineStatus";
import { Wifi, WifiOff, Zap, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface MachineStatusDisplayProps {
  className?: string;
}

export function MachineStatusDisplay({
  className = "",
}: MachineStatusDisplayProps) {
  const { machines } = useMachineStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStatusColor = (status: MachineStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-50 border-green-200 text-green-700";
      case "standby":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "error":
        return "bg-red-50 border-red-200 text-red-700";
      case "offline":
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getStatusDot = (status: MachineStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "standby":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "offline":
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (machine: MachineStatus) => {
    if (machine.esp32Connected) {
      return <Wifi className="w-4 h-4 text-green-600" />;
    } else if (machine.status === "error") {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: MachineStatus["status"]) => {
    switch (status) {
      case "online":
        return "Online";
      case "standby":
        return "Standby";
      case "error":
        return "Error";
      case "offline":
      default:
        return "Offline";
    }
  };

  const formatLastSeen = (lastSeen: Date) => {
    // Prevent hydration mismatch by only calculating time on client
    if (!mounted) {
      return "...";
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffSec < 3600) {
      return `${Math.floor(diffSec / 60)}m ago`;
    } else {
      return lastSeen.toLocaleTimeString();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {machines.map((machine) => (
        <div
          key={machine.id}
          className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${getStatusColor(
            machine.status
          )}`}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${getStatusDot(
                  machine.status
                )} ${machine.status === "online" ? "animate-pulse" : ""}`}
              ></div>
              {getStatusIcon(machine)}
            </div>
            <div>
              <span className="font-medium">{machine.name}</span>
              {machine.esp32Connected && (
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <Zap className="w-3 h-3" />
                  <span>ESP32 Connected</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-sm px-2 py-1 rounded ${getStatusColor(
                machine.status
              )
                .replace("border-", "bg-")
                .replace("text-", "text-")}`}
            >
              {getStatusBadge(machine.status)}
            </span>
            <div className="text-xs text-gray-500 mt-1">
              {formatLastSeen(machine.lastSeen)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

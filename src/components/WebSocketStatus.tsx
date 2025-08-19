"use client";

import { useWebSocket } from "@/contexts/WebSocketContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wifi, WifiOff, Activity, Users } from "lucide-react";

export function WebSocketStatus() {
  const { isConnected, machines } = useWebSocket();

  const machineArray = Object.values(machines);
  const onlineMachines = machineArray.filter(
    (m) => m.status === "online"
  ).length;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                WebSocket {isConnected ? "Connected" : "Disconnected"}
              </span>
              <span className="text-xs text-muted-foreground">
                {isConnected
                  ? "Real-time communication active"
                  : "Attempting to reconnect..."}
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className="text-xs"
            >
              <Activity className="h-3 w-3 mr-1" />
              {isConnected ? "Live" : "Offline"}
            </Badge>

            {isConnected && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {onlineMachines}/{machineArray.length} Online
              </Badge>
            )}
          </div>
        </div>

        {/* WebSocket URL for debugging */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Endpoint:{" "}
              {process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080"}
            </span>
            <a
              href="http://localhost:8080/stats"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 underline"
            >
              View Stats →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

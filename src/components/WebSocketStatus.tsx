"use client";

import { useWebSocketContext } from "./WebSocketProvider";

export function WebSocketStatus() {
  const { isConnected, reconnect } = useWebSocketContext();

  const getStatusColor = () => {
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  const getStatusText = () => {
    return isConnected ? "Connected" : "Disconnected";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <span className="text-sm font-medium text-white">
        WebSocket: {getStatusText()}
      </span>
      {!isConnected && (
        <button
          onClick={reconnect}
          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

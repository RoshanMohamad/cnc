"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

interface WebSocketMessage {
  type:
    | "cnc_status"
    | "gcode_progress"
    | "machine_connect"
    | "machine_disconnect"
    | "error"
    | "heartbeat";
  data?: unknown;
  machineId?: string;
  timestamp?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: unknown) => void;
  lastMessage: WebSocketMessage | null;
  reconnect: () => void;
  disconnect: () => void;
  broadcastMachineStatus: (
    machineId: string,
    status: "connected" | "disconnected"
  ) => void;
  broadcastGcodeProgress: (
    machineId: string,
    progress: number,
    status: string
  ) => void;
  broadcastError: (error: string, machineId?: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export function WebSocketProvider({
  children,
  url = "ws://localhost:8080",
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Check if we're in browser environment
      if (typeof window === "undefined") {
        console.log(
          "⚠️ WebSocket connection skipped - not in browser environment"
        );
        return;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("🔗 WebSocket already connected");
        return;
      }

      console.log("🔄 Attempting to connect to WebSocket:", url);
      console.log("🌐 Current environment:", {
        userAgent: navigator.userAgent.substring(0, 50) + "...",
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        isSecure: window.location.protocol === "https:",
      });
      console.info(
        "💡 If connection fails, make sure the WebSocket server is running: npm run websocket"
      );

      const ws = new WebSocket(url);
      console.log(
        "🔌 WebSocket object created successfully, readyState:",
        ws.readyState
      );

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn("⏱️ WebSocket connection timeout after 10 seconds");
          console.warn(
            "🔍 Debug info: WebSocket still connecting, forcing close"
          );
          ws.close(1000, "Connection timeout");
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: "heartbeat", timestamp: Date.now() })
            );
          } else {
            clearInterval(heartbeat);
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          console.log("📨 WebSocket message received:", message);
        } catch (error) {
          console.warn("❌ Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect if not manually closed
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const timeout = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          console.log(
            `🔄 Reconnecting in ${timeout}ms (attempt ${
              reconnectAttempts.current + 1
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log("❌ Max reconnection attempts reached. Giving up.");
          setLastMessage({
            type: "error",
            data: "WebSocket connection failed after multiple attempts",
            timestamp: Date.now(),
          });
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);

        // Extract meaningful error information
        let errorDetails = "Unknown WebSocket error";
        try {
          if (error instanceof ErrorEvent) {
            errorDetails =
              error.message ||
              error.error?.message ||
              "WebSocket connection failed";
          } else if (error instanceof Event) {
            errorDetails = `WebSocket connection failed to ${url}`;
          } else if (typeof error === "string") {
            errorDetails = error;
          }
        } catch {
          errorDetails = "Failed to parse WebSocket error";
        }

        // Only log if we have a real message
        if (errorDetails && errorDetails !== "{}") {
          console.warn("❌ WebSocket error occurred:", errorDetails);
          console.warn("🔍 WebSocket error details:", {
            url: url,
            readyState: ws.readyState,
            errorType: error?.constructor?.name || "Unknown",
            timestamp: new Date().toISOString(),
            reconnectAttempt: reconnectAttempts.current,
          });
        }
        console.warn("⚠️ Make sure the WebSocket server is running on", url);
        console.info(
          "💡 To start the WebSocket server, run: npm run websocket"
        );
      };

      wsRef.current = ws;
    } catch (error) {
      console.warn(
        "❌ Failed to create WebSocket connection:",
        error instanceof Error ? error.message : String(error)
      );
      console.warn("🔍 Connection error details:", {
        url: url,
        timestamp: new Date().toISOString(),
      });
      setLastMessage({
        type: "error",
        data: `Failed to create WebSocket connection: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: Date.now(),
      });
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setLastMessage(null);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.warn("❌ Failed to send WebSocket message:", error);
      }
    } else {
      console.warn("⚠️ WebSocket not connected. Cannot send message:", message);
    }
  }, []);

  const broadcastMachineStatus = useCallback(
    (machineId: string, status: "connected" | "disconnected") => {
      sendMessage({
        type: "machine_connect",
        machineId,
        data: { status },
        timestamp: Date.now(),
      });
    },
    [sendMessage]
  );

  const broadcastGcodeProgress = useCallback(
    (machineId: string, progress: number, status: string) => {
      sendMessage({
        type: "gcode_progress",
        machineId,
        data: { progress, status },
        timestamp: Date.now(),
      });
    },
    [sendMessage]
  );

  const broadcastError = useCallback(
    (error: string, machineId?: string) => {
      sendMessage({
        type: "error",
        machineId,
        data: error,
        timestamp: Date.now(),
      });
    },
    [sendMessage]
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    lastMessage,
    reconnect: connect,
    disconnect,
    broadcastMachineStatus,
    broadcastGcodeProgress,
    broadcastError,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { toast } from "sonner";

interface MachineStatus {
  id: string;
  name: string;
  status: "online" | "offline" | "standby" | "error";
  lastSeen: Date;
  type: "cnc" | "plasma" | "laser" | "router";
  esp32Connected: boolean;
}

interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>; // More flexible typing for message data
}

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  machines: Record<string, MachineStatus>;
  sendMessage: (message: WebSocketMessage) => void;
  sendGcode: (
    machineId: string,
    gcode: string,
    lineNumber?: number,
    jobId?: string
  ) => void;
  sendGcodeLines: (
    machineId: string,
    lines: string[],
    options?: {
      waitForOk?: boolean;
      onProgress?: (progress: {
        currentLine: number;
        totalLines: number;
        gcode: string;
        status: 'sending' | 'ok' | 'error';
        response?: string;
      }) => void;
      onComplete?: (summary: {
        successful: number;
        failed: number;
        totalTime: number;
      }) => void;
    }
  ) => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [machines, setMachines] = useState<Record<string, MachineStatus>>({});
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const connectionQualityRef = useRef(5); // Start with decent connection quality

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log("📨 Received WebSocket message:", message.type);

    switch (message.type) {
      case "connection_established":
        console.log("✅ Connection established:", message.data);
        break;

      case "initial_machine_status":
        if (message.data && typeof message.data === "object") {
          const machinesData = message.data as Record<string, MachineStatus>;
          const machinesWithDates = Object.entries(machinesData).reduce(
            (acc, [key, machine]) => {
              acc[key] = {
                ...machine,
                lastSeen: new Date(machine.lastSeen),
              };
              return acc;
            },
            {} as Record<string, MachineStatus>
          );

          setMachines(machinesWithDates);
          console.log("📊 Initial machine status received:", machinesWithDates);
        }
        break;

      case "machine_status_update":
        if (
          message.data.machineId &&
          message.data.status &&
          typeof message.data.machineId === "string"
        ) {
          const machineId = message.data.machineId;
          const status = message.data.status as MachineStatus;

          setMachines((prev) => ({
            ...prev,
            [machineId]: {
              ...prev[machineId],
              ...status,
              lastSeen: new Date(status.lastSeen),
            },
          }));

          // Show status change notification
          setMachines((prev) => {
            const machine = prev[machineId];
            if (machine && machine.status !== status.status) {
              const statusEmoji =
                status.status === "online"
                  ? "🟢"
                  : status.status === "offline"
                  ? "🔴"
                  : "🟡";
              toast.info(`${statusEmoji} ${status.name}`, {
                description: `Status changed to ${status.status}`,
              });
            }
            return prev;
          });
        }
        break;

      case "gcode_progress":
        console.log("📈 G-code progress:", message.data);
        break;

      case "gcode_response":
        console.log("✅ G-code response:", message.data);
        // Show OK responses or errors from ESP32
        if (message.data.response === "OK") {
          const lineInfo = message.data.line_number
            ? `Line ${message.data.line_number}`
            : "G-code";
          const execTimeMs =
            typeof message.data.execution_time_ms === "number"
              ? message.data.execution_time_ms
              : 0;
          const execTime =
            execTimeMs > 0 ? `(${Math.round(execTimeMs)}ms)` : "";
          toast.success(`${lineInfo} - OK ${execTime}`, {
            description: `ESP32 confirmed: ${message.data.gcode}`,
            duration: 2000, // Auto-dismiss in 2 seconds
          });
        } else if (message.data.response === "ERROR") {
          const lineInfo = message.data.line_number
            ? `Line ${message.data.line_number}`
            : "G-code";
          toast.error(`${lineInfo} - ERROR`, {
            description: `ESP32 error: ${message.data.gcode}`,
          });
        }
        break;

      case "gcode_sent":
        if (message.data.success && message.data.message) {
          toast.success("G-code Sent", {
            description: String(message.data.message),
          });
        }
        break;

      case "gcode_error":
        if (message.data.error) {
          toast.error("G-code Error", {
            description: String(message.data.error),
          });
        }
        break;

      case "pong":
        console.log("🏓 Pong received");
        connectionQualityRef.current = Math.min(
          connectionQualityRef.current + 1,
          10
        );
        break;

      case "health_check_response":
        console.log("💓 Health check response received");
        connectionQualityRef.current = Math.min(
          connectionQualityRef.current + 1,
          10
        );
        break;

      case "error":
        console.error("❌ Server error:", message.data);
        if (message.data.message) {
          toast.error("Server Error", {
            description: String(message.data.message),
          });
        }
        break;

      default:
        console.log("❓ Unknown message type:", message.type);
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isReconnectingRef.current) {
      console.log("🔄 Connection attempt already in progress, skipping...");
      return;
    }

    try {
      isReconnectingRef.current = true;
      const wsUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8081";
      console.log("🔄 Attempting to connect to WebSocket:", wsUrl);

      const ws = new WebSocket(`${wsUrl}?type=web&id=web-${Date.now()}`);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log("⏰ Connection timeout, closing...");
          ws.close();
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("🔌 WebSocket connected successfully");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        connectionQualityRef.current = Math.min(
          connectionQualityRef.current + 1,
          10
        );
        isReconnectingRef.current = false;

        // Only show success toast if page is visible to avoid spam
        if (isPageVisibleRef.current) {
          toast.success("Connected to CNC Server", {
            description: "Real-time communication established",
          });
        }

        // Start enhanced keep-alive mechanism
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        keepAliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && isPageVisibleRef.current) {
            ws.send(
              JSON.stringify({
                type: "ping",
                data: { timestamp: new Date().toISOString() },
              })
            );
          }
        }, 15000); // More frequent pings for stability
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);

          // Reset connection quality on successful message
          if (message.type === "pong") {
            connectionQualityRef.current = Math.min(
              connectionQualityRef.current + 1,
              10
            );
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
          connectionQualityRef.current = Math.max(
            connectionQualityRef.current - 1,
            0
          );
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }

        console.log("❌ WebSocket disconnected", {
          code: event.code,
          reason: event.reason,
        });
        setIsConnected(false);
        setSocket(null);
        isReconnectingRef.current = false;
        connectionQualityRef.current = Math.max(
          connectionQualityRef.current - 1,
          0
        );

        // Don't reconnect if page is hidden (browser tab switching)
        if (!isPageVisibleRef.current && event.code === 1006) {
          console.log("📱 Page hidden, delaying reconnection...");
          return;
        }

        // Smart reconnection based on disconnection reason and connection quality
        const shouldReconnect =
          reconnectAttempts.current < maxReconnectAttempts;

        if (shouldReconnect) {
          // Exponential backoff with jitter and connection quality consideration
          const baseDelay =
            Math.pow(2, Math.min(reconnectAttempts.current, 6)) * 1000;
          const qualityMultiplier = Math.max(
            1,
            (11 - connectionQualityRef.current) * 0.5
          );
          const jitter = Math.random() * 1000;
          const delay = Math.min(baseDelay * qualityMultiplier + jitter, 30000);

          reconnectAttempts.current++;

          console.log(
            `🔄 Attempting to reconnect (${
              reconnectAttempts.current
            }/${maxReconnectAttempts}) in ${Math.round(delay)}ms (quality: ${
              connectionQualityRef.current
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            // Check if page is still visible before reconnecting
            if (isPageVisibleRef.current || reconnectAttempts.current > 3) {
              connect();
            } else {
              console.log("📱 Page still hidden, retrying later...");
              reconnectAttempts.current--;
              setTimeout(() => connect(), 5000);
            }
          }, delay);
        } else {
          if (isPageVisibleRef.current) {
            toast.error("Connection Lost", {
              description:
                "Unable to reconnect to CNC server. Please refresh the page.",
            });
          }
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.log("🔄 WebSocket connection issue detected", error);
        isReconnectingRef.current = false;
        connectionQualityRef.current = Math.max(
          connectionQualityRef.current - 2,
          0
        );

        console.log("Connection details:", {
          url: wsUrl,
          readyState: ws.readyState,
          timestamp: new Date().toISOString(),
          quality: connectionQualityRef.current,
        });

        // Only show error toasts if page is visible
        if (isPageVisibleRef.current) {
          if (ws.readyState === WebSocket.CONNECTING) {
            toast.error("WebSocket Connection Failed", {
              description:
                "Unable to connect to CNC server. Retrying automatically...",
            });
          } else {
            toast.error("WebSocket Error", {
              description: "Connection error occurred, reconnecting...",
            });
          }
        }
      };

      setSocket(ws);
    } catch (error) {
      console.error("❌ Error creating WebSocket connection:", error);
      isReconnectingRef.current = false;
      connectionQualityRef.current = 0;

      if (isPageVisibleRef.current) {
        toast.error("Connection Failed", {
          description: "Could not connect to CNC server",
        });
      }
    }
  }, [handleMessage]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        console.log("📤 Sent WebSocket message:", message.type);
      } else {
        console.warn(
          "⚠️ WebSocket not connected, message not sent:",
          message.type
        );
        toast.warning("Connection Issue", {
          description: "Message not sent - WebSocket disconnected",
        });
      }
    },
    [socket]
  );

  const sendGcode = useCallback(
    (machineId: string, gcode: string, lineNumber?: number, jobId?: string) => {
      sendMessage({
        type: "gcode_send",
        data: {
          machineId,
          gcode,
          lineNumber,
          jobId,
        },
      });
    },
    [sendMessage]
  );

  // Advanced line-by-line G-code sender that waits for OK responses
  const sendGcodeLines = useCallback(
    async (
      machineId: string,
      lines: string[],
      options?: {
        waitForOk?: boolean;
        onProgress?: (progress: {
          currentLine: number;
          totalLines: number;
          gcode: string;
          status: 'sending' | 'ok' | 'error';
          response?: string;
        }) => void;
        onComplete?: (summary: {
          successful: number;
          failed: number;
          totalTime: number;
        }) => void;
      }
    ) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast.error("Cannot send G-code", {
          description: "WebSocket not connected",
        });
        return;
      }

      const { waitForOk = true, onProgress, onComplete } = options || {};
      const startTime = Date.now();
      let successful = 0;
      let failed = 0;
      const jobId = `job_${Date.now()}`;

      console.log(`🚀 Starting line-by-line G-code transmission (${lines.length} lines, waitForOk: ${waitForOk})`);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        if (!line || line.startsWith(';')) {
          continue; // Skip empty lines and comments
        }

        try {
          console.log(`📤 Sending line ${lineNumber}/${lines.length}: ${line}`);
          
          // Notify progress - sending
          onProgress?.({
            currentLine: lineNumber,
            totalLines: lines.length,
            gcode: line,
            status: 'sending'
          });

          if (waitForOk) {
            // Send line and wait for OK response
            const okReceived = await new Promise<boolean>((resolve) => {
              let responseHandler: ((event: MessageEvent) => void) | null = null;
              let timeoutId: NodeJS.Timeout | null = null;

              // Set up response listener
              responseHandler = (event) => {
                try {
                  const message = JSON.parse(event.data);
                  if (message.type === 'gcode_response' && 
                      message.data.line_number === lineNumber &&
                      message.data.machine_id === machineId) {
                    
                    if (responseHandler && timeoutId) {
                      socket.removeEventListener('message', responseHandler);
                      clearTimeout(timeoutId);
                      
                      if (message.data.response === 'OK') {
                        console.log(`✅ Line ${lineNumber} confirmed: OK`);
                        onProgress?.({
                          currentLine: lineNumber,
                          totalLines: lines.length,
                          gcode: line,
                          status: 'ok',
                          response: message.data.response
                        });
                        resolve(true);
                      } else {
                        console.log(`❌ Line ${lineNumber} error: ${message.data.response}`);
                        onProgress?.({
                          currentLine: lineNumber,
                          totalLines: lines.length,
                          gcode: line,
                          status: 'error',
                          response: message.data.response
                        });
                        resolve(false);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error parsing response:', error);
                }
              };

              // Set up timeout (10 seconds per line)
              timeoutId = setTimeout(() => {
                if (responseHandler && socket) {
                  socket.removeEventListener('message', responseHandler);
                  console.log(`⏰ Timeout waiting for OK response on line ${lineNumber}`);
                  onProgress?.({
                    currentLine: lineNumber,
                    totalLines: lines.length,
                    gcode: line,
                    status: 'error',
                    response: 'TIMEOUT'
                  });
                  resolve(false);
                }
              }, 10000);

              // Add listener and send the G-code
              socket.addEventListener('message', responseHandler);
              sendMessage({
                type: "gcode_send",
                data: {
                  machineId,
                  gcode: line,
                  lineNumber,
                  jobId,
                },
              });
            });

            if (okReceived) {
              successful++;
            } else {
              failed++;
              // Optionally stop on error
              // break;
            }

          } else {
            // Send without waiting for OK
            sendMessage({
              type: "gcode_send",
              data: {
                machineId,
                gcode: line,
                lineNumber,
                jobId,
              },
            });
            successful++;
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          console.error(`❌ Error sending line ${lineNumber}:`, error);
          failed++;
          onProgress?.({
            currentLine: lineNumber,
            totalLines: lines.length,
            gcode: line,
            status: 'error',
            response: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const totalTime = Date.now() - startTime;
      const summary = { successful, failed, totalTime };
      
      console.log(`🏁 G-code transmission completed: ${successful} successful, ${failed} failed (${totalTime}ms)`);
      
      onComplete?.(summary);

      // Show completion toast
      if (failed === 0) {
        toast.success(`G-code Completed Successfully`, {
          description: `All ${successful} lines executed successfully in ${Math.round(totalTime/1000)}s`,
        });
      } else {
        toast.warning(`G-code Completed with Errors`, {
          description: `${successful} successful, ${failed} failed in ${Math.round(totalTime/1000)}s`,
        });
      }
    },
    [socket, sendMessage]
  );

  useEffect(() => {
    // Handle browser tab visibility changes
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isPageVisibleRef.current = isVisible;

      console.log(
        `👁️ Page visibility changed: ${isVisible ? "visible" : "hidden"}`
      );

      if (isVisible) {
        // Page became visible - reconnect if not connected
        if (!isConnected && !isReconnectingRef.current) {
          console.log("📱 Page visible again, attempting to reconnect...");
          setTimeout(() => connect(), 1000); // Short delay to allow for stabilization
        }
      } else {
        // Page became hidden - reduce activity but don't disconnect immediately
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      }
    };

    // Handle page unload/reload (development hot reload)
    const handleBeforeUnload = () => {
      console.log("🔄 Page unloading, cleaning up WebSocket...");
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Send graceful disconnect message
        socket.send(
          JSON.stringify({
            type: "disconnect",
            data: { reason: "page_unload" },
          })
        );
        socket.close(1000, "page_unload");
      }

      // Clear all timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };

    // Handle network online/offline events
    const handleOnline = () => {
      console.log("🌐 Network back online");
      if (!isConnected && !isReconnectingRef.current) {
        setTimeout(() => connect(), 2000);
      }
    };

    const handleOffline = () => {
      console.log("📡 Network went offline");
      connectionQualityRef.current = 0;
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial connection
    connect();

    return () => {
      // Cleanup event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      // Clear timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }

      // Close socket gracefully
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "disconnect",
            data: { reason: "component_unmount" },
          })
        );
        socket.close(1000, "component_unmount");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remove the old ping interval effect and replace with connection monitoring
  useEffect(() => {
    if (!isConnected || !socket) return;

    let missedPings = 0;
    const maxMissedPings = 5; // Increased tolerance

    const connectionMonitor = setInterval(() => {
      if (!isPageVisibleRef.current) return; // Skip monitoring when page is hidden

      if (socket.readyState !== WebSocket.OPEN) {
        console.log("🔍 Connection monitor detected closed socket");
        clearInterval(connectionMonitor);
        return;
      }

      // Check connection health - be less aggressive
      if (connectionQualityRef.current <= 0) {
        missedPings++;
        console.log(
          `⚠️ Poor connection quality (${connectionQualityRef.current}), missed pings: ${missedPings}/${maxMissedPings}`
        );

        if (missedPings >= maxMissedPings) {
          console.log(
            "🔌 Proactively reconnecting due to consistently poor connection quality"
          );
          socket.close(1006, "poor_connection_quality");
          clearInterval(connectionMonitor);
          return;
        }
      } else {
        missedPings = 0; // Reset on any positive quality
      }

      // Send health check ping
      try {
        socket.send(
          JSON.stringify({
            type: "health_check",
            data: {
              timestamp: new Date().toISOString(),
              quality: connectionQualityRef.current,
            },
          })
        );
      } catch (error) {
        console.error("❌ Failed to send health check:", error);
        clearInterval(connectionMonitor);
      }
    }, 20000); // Health check every 20 seconds

    return () => clearInterval(connectionMonitor);
  }, [isConnected, socket]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    machines,
    sendMessage,
    sendGcode,
    sendGcodeLines,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { toast } from "sonner";
import { Play, Square, Wifi, WifiOff, Activity } from "lucide-react";

interface GcodeProgress {
  currentLine: number;
  totalLines: number;
  isRunning: boolean;
  machineId: string;
}

export function WebSocketGcodeSender() {
  const { isConnected, machines, sendGcode, sendMessage } = useWebSocket();
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [gcodeText, setGcodeText] = useState<string>("");
  const [progress, setProgress] = useState<GcodeProgress | null>(null);
  const [jobId, setJobId] = useState<string>("");

  // Auto-select first online machine
  useEffect(() => {
    if (!selectedMachine) {
      const onlineMachine = Object.values(machines).find(
        (m) => m.status === "online"
      );
      if (onlineMachine) {
        setSelectedMachine(onlineMachine.id);
      }
    }
  }, [machines, selectedMachine]);

  const handleSendGcode = async () => {
    if (!selectedMachine) {
      toast.error("No Machine Selected", {
        description: "Please select a machine first",
      });
      return;
    }

    if (!gcodeText.trim()) {
      toast.error("No G-code", {
        description: "Please enter G-code commands",
      });
      return;
    }

    const machine = machines[selectedMachine];
    if (!machine || machine.status !== "online") {
      toast.error("Machine Not Available", {
        description: "Selected machine is not online",
      });
      return;
    }

    const lines = gcodeText
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const newJobId = jobId || `job-${Date.now()}`;
    setJobId(newJobId);

    setProgress({
      currentLine: 0,
      totalLines: lines.length,
      isRunning: true,
      machineId: selectedMachine,
    });

    toast.info("Starting G-code Transmission", {
      description: `Sending ${lines.length} lines to ${machine.name}`,
    });

    // Send G-code line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith(";")) {
        // Skip empty lines and comments
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout waiting for response"));
            }, 10000);

            sendGcode(selectedMachine, line, i + 1, newJobId);

            // Update progress
            setProgress((prev) =>
              prev
                ? {
                    ...prev,
                    currentLine: i + 1,
                  }
                : null
            );

            // Small delay between lines
            setTimeout(() => {
              clearTimeout(timeout);
              resolve();
            }, 100);
          });
        } catch (error) {
          console.error(`Error sending line ${i + 1}:`, error);
          toast.error(`Line ${i + 1} Failed`, {
            description: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
          // Continue with next line
        }
      }
    }

    // Job complete
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            isRunning: false,
          }
        : null
    );

    toast.success("G-code Transmission Complete", {
      description: `Successfully sent ${lines.length} lines to ${machine.name}`,
    });
  };

  const handleStopJob = () => {
    if (progress && selectedMachine) {
      sendMessage({
        type: "gcode_stop",
        data: {
          machineId: selectedMachine,
          jobId: jobId,
        },
      });

      setProgress((prev) =>
        prev
          ? {
              ...prev,
              isRunning: false,
            }
          : null
      );

      toast.info("G-code Job Stopped", {
        description: "Transmission halted by user",
      });
    }
  };

  const handleTestConnection = () => {
    if (selectedMachine) {
      sendMessage({
        type: "ping",
        data: {
          machineId: selectedMachine,
          timestamp: new Date().toISOString(),
        },
      });

      toast.info("Testing Connection", {
        description: `Pinging ${
          machines[selectedMachine]?.name || selectedMachine
        }`,
      });
    }
  };

  const machineArray = Object.values(machines);
  const selectedMachineData = selectedMachine
    ? machines[selectedMachine]
    : null;
  const progressPercentage = progress
    ? Math.round((progress.currentLine / progress.totalLines) * 100)
    : 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          WebSocket G-code Sender
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
        <CardDescription>
          Send G-code commands to CNC machines via WebSocket connection
          {!isConnected && (
            <span className="block text-red-500 mt-1">
              ⚠️ WebSocket disconnected - Connect to send commands
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Machine Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="machine-select">Target Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger id="machine-select">
                <SelectValue placeholder="Select a machine..." />
              </SelectTrigger>
              <SelectContent>
                {machineArray.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          machine.status === "online"
                            ? "bg-green-500"
                            : machine.status === "error"
                            ? "bg-red-500"
                            : "bg-gray-400"
                        }`}
                      />
                      {machine.name} ({machine.status})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-id">Job ID (Optional)</Label>
            <Input
              id="job-id"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>

        {/* Machine Status */}
        {selectedMachineData && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedMachineData.status === "online"
                      ? "bg-green-500"
                      : selectedMachineData.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="font-medium">{selectedMachineData.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({selectedMachineData.type.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedMachineData.esp32Connected && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ESP32 Connected
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Last seen: {selectedMachineData.lastSeen.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* G-code Input */}
        <div className="space-y-2">
          <Label htmlFor="gcode-input">G-code Commands</Label>
          <Textarea
            id="gcode-input"
            value={gcodeText}
            onChange={(e) => setGcodeText(e.target.value)}
            placeholder="Enter G-code commands here...&#10;G28 ; Home all axes&#10;G1 X10 Y10 F1000 ; Move to position&#10;M3 S1000 ; Start spindle"
            className="h-64 font-mono text-sm"
          />
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Progress: Line {progress.currentLine} of {progress.totalLines}
              </span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSendGcode}
            disabled={
              !isConnected ||
              !selectedMachine ||
              !gcodeText.trim() ||
              progress?.isRunning
            }
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            {progress?.isRunning ? "Sending..." : "Send G-code"}
          </Button>

          {progress?.isRunning && (
            <Button onClick={handleStopJob} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          <Button
            onClick={handleTestConnection}
            disabled={!isConnected || !selectedMachine}
            variant="outline"
          >
            Test Connection
          </Button>
        </div>

        {/* Connection Status */}
        <div className="text-sm text-muted-foreground">
          WebSocket Status:
          <span
            className={`ml-1 ${
              isConnected ? "text-green-600" : "text-red-600"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {isConnected && (
            <span className="ml-2">
              • {machineArray.filter((m) => m.status === "online").length}{" "}
              machines online
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

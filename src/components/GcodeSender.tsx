"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, FileText } from "lucide-react";
import { toast } from "sonner";

interface GcodeSenderProps {
  className?: string;
}

export function GcodeSender({ className = "" }: GcodeSenderProps) {
  const [selectedMachine, setSelectedMachine] = useState("cnc-01");
  const [gcode, setGcode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [waitingForOk, setWaitingForOk] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const machines = [
    { id: "cnc-01", name: "CNC Router 01" },
    { id: "plasma-01", name: "Plasma Cutter 01" },
    { id: "laser-01", name: "Laser Engraver 01" },
  ];

  const sampleGcode = `G21 ; Set units to millimeters
G90 ; Use absolute positioning
G28 ; Home all axes
G1 F1500 ; Set feedrate to 1500 mm/min
G1 X10 Y10 ; Move to position (10,10)
G1 X20 Y10 ; Move to position (20,10)
G1 X20 Y20 ; Move to position (20,20)
G1 X10 Y20 ; Move to position (10,20)
G1 X10 Y10 ; Move back to start
G28 ; Home all axes
M30 ; Program end`;

  const sendApiRequest = async (action: string, extraData = {}) => {
    try {
      const response = await fetch("/api/machines/send-gcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          machine_id: selectedMachine,
          action,
          ...extraData,
        }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  };

  const startGcodeJob = async () => {
    if (!gcode.trim()) {
      toast.error("Please enter G-code first");
      return;
    }

    try {
      const newJobId = `job_${Date.now()}`;
      const result = await sendApiRequest("start_job", {
        gcode: gcode.trim(),
        job_id: newJobId,
      });

      if (result.success) {
        setJobId(newJobId);
        setTotalLines(result.total_lines);
        setCurrentLine(0);
        setIsRunning(true);
        setWaitingForOk(false);

        toast.success(`G-code job started with ${result.total_lines} lines`);

        // Start the polling loop
        startPolling();
      }
    } catch {
      toast.error("Failed to start G-code job");
    }
  };

  const stopGcodeJob = async () => {
    try {
      await sendApiRequest("stop_job");
      stopPolling();
      setIsRunning(false);
      setJobId(null);
      setCurrentLine(0);
      setTotalLines(0);
      setWaitingForOk(false);
      toast.success("G-code job stopped");
    } catch {
      toast.error("Failed to stop G-code job");
    }
  };

  const getNextLine = async () => {
    try {
      const result = await sendApiRequest("get_next_line");

      if (result.completed) {
        // Job completed
        stopPolling();
        setIsRunning(false);
        setJobId(null);
        setCurrentLine(0);
        setTotalLines(0);
        setWaitingForOk(false);
        toast.success("G-code job completed!");
        return;
      }

      if (result.success && result.line) {
        setCurrentLine(result.line_number);
        setWaitingForOk(true);

        // Send the line to ESP32
        console.log(`Sending to ESP32: ${result.line}`);
        toast.info(`Sent line ${result.line_number}: ${result.line}`);

        try {
          // Send G-code line to ESP32 via HTTP
          const esp32Response = await fetch(`http://192.168.8.121/api/gcode`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gcode: result.line,
              machine_id: selectedMachine,
              line_number: result.line_number,
            }),
          });

          if (esp32Response.ok) {
            console.log("✅ G-code sent to ESP32 successfully");
            // ESP32 will send OK back automatically when Arduino responds
          } else {
            throw new Error(
              `ESP32 responded with status ${esp32Response.status}`
            );
          }
        } catch (error) {
          console.error("❌ Failed to send G-code to ESP32:", error);
          toast.error("Failed to send G-code to ESP32");

          // Stop the job on communication error
          stopGcodeJob();
        }
      }
    } catch (error) {
      console.error("Failed to get next line:", error);
      toast.error("Failed to get next G-code line");
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;

    // Start with first line
    setTimeout(() => {
      getNextLine();
    }, 1000);

    // Set up polling for OK responses
    intervalRef.current = setInterval(async () => {
      if (waitingForOk) {
        // Check if we received OK from server
        try {
          const statusResult = await sendApiRequest("get_status");
          if (!statusResult.waiting_for_ok && statusResult.has_active_job) {
            // OK was received, get next line
            setTimeout(() => {
              getNextLine();
            }, 500);
          }
        } catch (error) {
          console.error("Failed to check status:", error);
        }
      }
    }, 1000); // Check every second
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const loadSampleGcode = () => {
    setGcode(sampleGcode);
    toast.success("Sample G-code loaded");
  };

  const progress = totalLines > 0 ? (currentLine / totalLines) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-600" />
          G-code Sender (with OK Handshake)
        </CardTitle>
        <CardDescription>
          Send G-code line by line, waiting for OK response from Arduino
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Machine:</label>
          <Select
            value={selectedMachine}
            onValueChange={setSelectedMachine}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {machines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">G-code:</label>
            <Button
              onClick={loadSampleGcode}
              size="sm"
              variant="outline"
              disabled={isRunning}
            >
              Load Sample
            </Button>
          </div>
          <Textarea
            value={gcode}
            onChange={(e) => setGcode(e.target.value)}
            placeholder="Enter G-code here..."
            className="min-h-[200px] font-mono text-sm"
            disabled={isRunning}
          />
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={startGcodeJob}
              disabled={isRunning || !gcode.trim()}
              className="flex-1"
              variant="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Job
            </Button>
            <Button
              onClick={stopGcodeJob}
              disabled={!isRunning}
              className="flex-1"
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Job
            </Button>
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Job Progress:</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600">
              Line {currentLine} of {totalLines} ({progress.toFixed(1)}%)
            </div>
            <div className="text-sm">
              Status:{" "}
              {waitingForOk
                ? "⏳ Waiting for OK response..."
                : "✅ Ready for next line"}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <strong>Communication Flow:</strong>
          <br />
          1. App sends G-code line to ESP32
          <br />
          2. ESP32 forwards to Arduino
          <br />
          3. Arduino processes and sends &quot;OK&quot;
          <br />
          4. ESP32 forwards &quot;OK&quot; to App
          <br />
          5. App sends next line only after receiving &quot;OK&quot;
          {jobId && (
            <>
              <br />
              <strong>Current Job ID:</strong> {jobId}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

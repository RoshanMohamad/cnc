"use client";

import { useState } from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { Button } from "@/components/ui/button";
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
import { Power, PowerOff, Cpu, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ESP32Simulator() {
  const { isConnected, publish } = useMqtt();
  const [selectedMachine, setSelectedMachine] = useState("cnc-01");

  const machines = [
    { id: "cnc-01", name: "CNC Router 01" },
    { id: "plasma-01", name: "Plasma Cutter 01" },
    { id: "laser-01", name: "Laser Engraver 01" },
  ];

  const simulateESP32Power = (action: "on" | "off") => {
    if (!isConnected) {
      toast.error("MQTT not connected");
      return;
    }

    const topic = `esp32/${selectedMachine}/${
      action === "on" ? "online" : "offline"
    }`;
    const message =
      action === "on"
        ? `ESP32 powered on - ${new Date().toISOString()}`
        : `ESP32 powered off - ${new Date().toISOString()}`;

    publish(topic, message);

    // Also send machine status
    const statusTopic = `machines/${selectedMachine}/status`;
    const statusMessage = action === "on" ? "ready" : "offline";
    publish(statusTopic, statusMessage);

    toast.success(
      `ESP32 ${action === "on" ? "powered on" : "powered off"} for ${
        machines.find((m) => m.id === selectedMachine)?.name
      }`
    );
  };

  const simulateHeartbeat = () => {
    if (!isConnected) {
      toast.error("MQTT not connected");
      return;
    }

    const topic = `machines/${selectedMachine}/heartbeat`;
    const message = `heartbeat-${Date.now()}`;
    publish(topic, message);
    toast.success("Heartbeat sent");
  };

  const simulateStatus = (status: "idle" | "working" | "error") => {
    if (!isConnected) {
      toast.error("MQTT not connected");
      return;
    }

    const topic = `cnc/${selectedMachine}/status`;
    const message = status;
    publish(topic, message);
    toast.success(`Status set to ${status}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-blue-600" />
          ESP32 Simulator
        </CardTitle>
        <CardDescription>
          Simulate ESP32 power states and machine communication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Machine:</label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
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
          <label className="text-sm font-medium">ESP32 Power Control:</label>
          <div className="flex gap-2">
            <Button
              onClick={() => simulateESP32Power("on")}
              disabled={!isConnected}
              className="flex-1"
              variant="default"
            >
              <Power className="w-4 h-4 mr-2" />
              Power On
            </Button>
            <Button
              onClick={() => simulateESP32Power("off")}
              disabled={!isConnected}
              className="flex-1"
              variant="destructive"
            >
              <PowerOff className="w-4 h-4 mr-2" />
              Power Off
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Machine Status:</label>
          <div className="flex gap-2">
            <Button
              onClick={() => simulateStatus("idle")}
              disabled={!isConnected}
              size="sm"
              variant="outline"
            >
              Idle
            </Button>
            <Button
              onClick={() => simulateStatus("working")}
              disabled={!isConnected}
              size="sm"
              variant="outline"
            >
              Working
            </Button>
            <Button
              onClick={() => simulateStatus("error")}
              disabled={!isConnected}
              size="sm"
              variant="outline"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Error
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={simulateHeartbeat}
            disabled={!isConnected}
            className="w-full"
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            Send Heartbeat
          </Button>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <strong>MQTT Topics being used:</strong>
          <br />• esp32/{selectedMachine}/online
          <br />• esp32/{selectedMachine}/offline
          <br />• machines/{selectedMachine}/status
          <br />• machines/{selectedMachine}/heartbeat
          <br />• cnc/{selectedMachine}/status
        </div>
      </CardContent>
    </Card>
  );
}

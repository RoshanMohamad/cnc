"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MachineStatusDisplay } from "@/components/MachineStatusDisplay";
import { WebSocketGcodeSender } from "@/components/WebSocketGcodeSender";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Activity, Wifi, WifiOff, Zap, Users, Clock } from "lucide-react";
import Link from "next/link";

export default function MonitorPage() {
  const { isConnected, machines } = useWebSocket();

  const machineArray = Object.values(machines);
  const onlineMachines = machineArray.filter(
    (m) => m.status === "online"
  ).length;
  const totalMachines = machineArray.length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            CNC Monitor Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time machine monitoring and G-code control via WebSocket
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Connection Status */}
      <Card
        className={`border-l-4 ${
          isConnected ? "border-l-green-500" : "border-l-red-500"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">WebSocket Connection</CardTitle>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span>Status: </span>
              <span className={isConnected ? "text-green-600" : "text-red-600"}>
                {isConnected
                  ? "Real-time monitoring active"
                  : "Connection lost"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Machines Online: </span>
              <span className="font-semibold">
                {onlineMachines}/{totalMachines}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>Last Update: </span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Tabs defaultValue="machines" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="machines" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Machine Status
          </TabsTrigger>
          <TabsTrigger value="gcode" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            G-code Sender
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* Machine Status Tab */}
        <TabsContent value="machines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Machine Status</CardTitle>
              <CardDescription>
                Real-time status updates from connected CNC machines via
                WebSocket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MachineStatusDisplay />
            </CardContent>
          </Card>

          {/* Machine Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machineArray.map((machine) => (
              <Card
                key={machine.id}
                className={`border-l-4 ${
                  machine.status === "online"
                    ? "border-l-green-500"
                    : machine.status === "error"
                    ? "border-l-red-500"
                    : machine.status === "standby"
                    ? "border-l-yellow-500"
                    : "border-l-gray-400"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{machine.name}</CardTitle>
                    <Badge
                      variant={
                        machine.status === "online"
                          ? "default"
                          : machine.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {machine.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {machine.type.toUpperCase()} • ID: {machine.id}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>ESP32 Connected:</span>
                      <span
                        className={
                          machine.esp32Connected
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {machine.esp32Connected ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Seen:</span>
                      <span>{machine.lastSeen.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection:</span>
                      <span
                        className={
                          isConnected ? "text-green-600" : "text-red-600"
                        }
                      >
                        {isConnected ? "WebSocket" : "Offline"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* G-code Sender Tab */}
        <TabsContent value="gcode" className="space-y-6">
          <WebSocketGcodeSender />
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                WebSocket communication and machine activity logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                <div className="text-green-600">
                  {new Date().toLocaleString()} - WebSocket connection{" "}
                  {isConnected ? "established" : "lost"}
                </div>
                {machineArray.map((machine) => (
                  <div
                    key={machine.id}
                    className={
                      machine.status === "online"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }
                  >
                    {machine.lastSeen.toLocaleString()} - {machine.name}:{" "}
                    {machine.status}
                  </div>
                ))}
                <div className="text-gray-500">
                  {new Date().toLocaleString()} - Dashboard initialized
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wifi className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{isConnected ? "1" : "0"}</p>
                <p className="text-sm text-muted-foreground">WebSocket</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{onlineMachines}</p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalMachines}</p>
                <p className="text-sm text-muted-foreground">Total Machines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">Real-time</p>
                <p className="text-sm text-muted-foreground">Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

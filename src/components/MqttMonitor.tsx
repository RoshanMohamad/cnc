"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/hooks/useMqtt";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Wifi,
  WifiOff,
  Send,
  Trash2,
  Settings,
  Activity,
  MessageSquare,
} from "lucide-react";

// CNC-specific MQTT topics
const CNC_TOPICS = {
  GCODE: "cnc/gcode",
  STATUS: "cnc/status",
  POSITION: "cnc/position",
  COMMANDS: "cnc/commands",
  EMERGENCY: "cnc/emergency",
} as const;

interface MqttMonitorProps {
  className?: string;
}

export function MqttMonitor({ className = "" }: MqttMonitorProps) {
  const {
    isConnected,
    isConnecting,
    messages,
    error,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    clearMessages,
  } = useMqtt();

  const [publishTopic, setPublishTopic] = useState<string>(CNC_TOPICS.COMMANDS);
  const [publishMessage, setPublishMessage] = useState("");
  const [subscribeTopic, setSubscribeTopic] = useState("");
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);

  // Auto-subscribe to CNC topics when connected
  useEffect(() => {
    if (isConnected) {
      Object.values(CNC_TOPICS).forEach((topic) => {
        subscribe(topic);
        setActiveSubscriptions((prev) =>
          prev.includes(topic) ? prev : [...prev, topic]
        );
      });
      toast.success("Connected to MQTT broker");
    }
  }, [isConnected, subscribe]);

  const handlePublish = () => {
    if (!publishTopic.trim() || !publishMessage.trim()) {
      toast.error("Please enter both topic and message");
      return;
    }

    publish(publishTopic, publishMessage);
    setPublishMessage("");
    toast.success(`Message sent to ${publishTopic}`);
  };

  const handleSubscribe = () => {
    if (!subscribeTopic.trim()) {
      toast.error("Please enter a topic to subscribe");
      return;
    }

    if (activeSubscriptions.includes(subscribeTopic)) {
      toast.warning("Already subscribed to this topic");
      return;
    }

    subscribe(subscribeTopic);
    setActiveSubscriptions((prev) => [...prev, subscribeTopic]);
    setSubscribeTopic("");
    toast.success(`Subscribed to ${subscribeTopic}`);
  };

  const handleUnsubscribe = (topic: string) => {
    unsubscribe(topic);
    setActiveSubscriptions((prev) => prev.filter((t) => t !== topic));
    toast.success(`Unsubscribed from ${topic}`);
  };

  const sendGcode = (gcode: string) => {
    publish(CNC_TOPICS.GCODE, gcode);
    toast.success(`G-code sent: ${gcode}`);
  };

  const sendCommand = (command: string) => {
    publish(CNC_TOPICS.COMMANDS, command);
    toast.success(`Command sent: ${command}`);
  };

  const connectionStatus = isConnecting
    ? "connecting"
    : isConnected
    ? "connected"
    : "disconnected";

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            MQTT Connection
          </CardTitle>
          <CardDescription>
            Status:{" "}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {connectionStatus}
            </Badge>
            {error && (
              <div className="text-sm text-red-500 mt-1">Error: {error}</div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            ) : (
              <Button onClick={disconnect} variant="outline">
                Disconnect
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <div>Broker: {process.env.NEXT_PUBLIC_MQTT_BROKER_URL}</div>
            <div>Username: {process.env.NEXT_PUBLIC_MQTT_USERNAME}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="publish" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="publish">Publish</TabsTrigger>
          <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
          <TabsTrigger value="cnc">CNC Control</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Publish Tab */}
        <TabsContent value="publish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Publish Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publish-topic">Topic</Label>
                <Input
                  id="publish-topic"
                  value={publishTopic}
                  onChange={(e) => setPublishTopic(e.target.value)}
                  placeholder="cnc/commands"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publish-message">Message</Label>
                <Textarea
                  id="publish-message"
                  value={publishMessage}
                  onChange={(e) => setPublishMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handlePublish}
                disabled={!isConnected}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Publish Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribe Tab */}
        <TabsContent value="subscribe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={subscribeTopic}
                  onChange={(e) => setSubscribeTopic(e.target.value)}
                  placeholder="Topic to subscribe to..."
                />
                <Button onClick={handleSubscribe} disabled={!isConnected}>
                  Subscribe
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Active Subscriptions:</Label>
                <div className="space-y-1">
                  {activeSubscriptions.map((topic) => (
                    <div
                      key={topic}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm font-mono">{topic}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsubscribe(topic)}
                      >
                        Unsubscribe
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CNC Control Tab */}
        <TabsContent value="cnc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                CNC Quick Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => sendCommand("HOME")}
                  disabled={!isConnected}
                  variant="outline"
                >
                  Home All Axes
                </Button>
                <Button
                  onClick={() => sendCommand("STOP")}
                  disabled={!isConnected}
                  variant="destructive"
                >
                  Emergency Stop
                </Button>
                <Button
                  onClick={() => sendGcode("G28")}
                  disabled={!isConnected}
                  variant="outline"
                >
                  G28 (Home)
                </Button>
                <Button
                  onClick={() => sendGcode("M112")}
                  disabled={!isConnected}
                  variant="destructive"
                >
                  M112 (Emergency)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Quick G-codes:</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["G90", "G91", "G0 X0 Y0", "G1 F100", "M3", "M5"].map(
                    (gcode) => (
                      <Button
                        key={gcode}
                        size="sm"
                        variant="outline"
                        onClick={() => sendGcode(gcode)}
                        disabled={!isConnected}
                      >
                        {gcode}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  MQTT Messages ({messages.length})
                </div>
                <Button size="sm" variant="outline" onClick={clearMessages}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No messages received yet
                    </div>
                  ) : (
                    messages
                      .slice()
                      .reverse()
                      .map((msg, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-mono">
                              {msg.topic}
                            </Badge>
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="text-sm font-mono bg-muted p-2 rounded">
                            {msg.message}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

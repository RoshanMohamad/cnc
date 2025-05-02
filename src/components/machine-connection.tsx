"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner" // Updated import
import { Loader2, WifiOff } from "lucide-react"

interface MachineConnectionProps {
  onConnect: (machineDetails: any) => void
}

export function MachineConnection({ onConnect }: MachineConnectionProps) {
  const [connectionType, setConnectionType] = useState("usb")
  const [port, setPort] = useState("/dev/ttyUSB0")
  const [address, setAddress] = useState("192.168.1.100")
  const [networkPort, setNetworkPort] = useState("8080")
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)

    try {
      // Simulate connection
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const machineDetails = {
        id: "machine-1",
        name: connectionType === "usb" ? `USB Machine (${port})` : `Network Machine (${address})`,
        connectionType,
        port: connectionType === "usb" ? port : networkPort,
        address: connectionType === "network" ? address : undefined,
        status: "connected",
      }

      // Updated Sonner toast
      toast.success(`Successfully connected to ${machineDetails.name}`, {
        description: "Machine is now ready for operation",
      })

      onConnect(machineDetails)
    } catch (error) {
      // Updated error toast
      toast.error("Connection Failed", {
        description: "Could not connect to the machine. Please check your settings.",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to Machine</CardTitle>
        <CardDescription>Configure your connection settings to connect to your cloth cutting machine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6">
          <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">No machine is currently connected</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="connection-type">Connection Type</Label>
          <Select value={connectionType} onValueChange={setConnectionType}>
            <SelectTrigger id="connection-type">
              <SelectValue placeholder="Select connection type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usb">USB Serial</SelectItem>
              <SelectItem value="network">Network</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {connectionType === "usb" ? (
          <div className="space-y-2">
            <Label htmlFor="port">Serial Port</Label>
            <Input
              id="port"
              placeholder="/dev/ttyUSB0 or COM3"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">IP Address</Label>
              <Input
                id="address"
                placeholder="192.168.1.100"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="network-port">Port</Label>
              <Input
                id="network-port"
                placeholder="8080"
                value={networkPort}
                onChange={(e) => setNetworkPort(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect to Machine"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}


"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Send, Settings, Trash2, Wifi } from "lucide-react"

export default function MachinesPage() {
  const [machines, setMachines] = useState([
    {
      id: 1,
      name: "Cutter",
      type: "Network",
      address: "192.168.8.130",
      port: "8080",
      status: "disconnected",
      lastConnected: "Apr 1, 2025",
    },
  ])

  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)

  const connectMachine = (id: number) => {
    setMachines(
      machines.map((machine) =>
        machine.id === id
          ? { ...machine, status: "connected", lastConnected: new Date().toLocaleDateString() }
          : machine,
      ),
    )
    setSelectedMachine(id)
  }

  const disconnectMachine = (id: number) => {
    setMachines(machines.map((machine) => (machine.id === id ? { ...machine, status: "disconnected" } : machine)))
    if (selectedMachine === id) {
      setSelectedMachine(null)
    }
  }

  const deleteMachine = (id: number) => {
    setMachines(machines.filter((machine) => machine.id !== id))
    if (selectedMachine === id) {
      setSelectedMachine(null)
    }
  }

  

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Machine Management</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Machine</DialogTitle>
              <DialogDescription>Configure your cloth cutting machine connection details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Machine Name</Label>
                <Input id="name" placeholder="My Cutter" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Connection Type</Label>
                <Select defaultValue="usb">
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usb">USB Serial</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" placeholder="/dev/ttyUSB0 or COM3" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baudrate">Baud Rate</Label>
                <Select defaultValue="115200">
                  <SelectTrigger id="baudrate">
                    <SelectValue placeholder="Select baud rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9600">9600</SelectItem>
                    <SelectItem value="19200">19200</SelectItem>
                    <SelectItem value="38400">38400</SelectItem>
                    <SelectItem value="57600">57600</SelectItem>
                    <SelectItem value="115200">115200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Add Machine</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Machines</h2>
          <div className="space-y-4">
            {machines.map((machine) => (
              <Card key={machine.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{machine.name}</CardTitle>
                      <CardDescription>
                        {machine.type} • Last connected: {machine.lastConnected}
                      </CardDescription>
                    </div>
                    <div className="flex items-center">
                      {machine.status === "connected" ? (
                        <span className="flex items-center text-green-500 text-sm">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Connected
                        </span>
                      ) : (
                        <span className="flex items-center text-muted-foreground text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Disconnected
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm space-y-1">
                    {machine.type === "USB Serial" ? (
                      <p>Port: {machine.port}</p>
                    ) : (
                      <p>
                        Address: {machine.address}:{machine.port}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMachine(machine.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  {machine.status === "connected" ? (
                    <Button variant="destructive" size="sm" onClick={() => disconnectMachine(machine.id)}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => connectMachine(machine.id)}>
                      Connect
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}

            {machines.length === 0 && (
              <div className="text-center p-8 border rounded-lg bg-muted/50">
                <p className="text-muted-foreground">No machines configured yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {`Click "Add Machine" to configure your first cutting machine.`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Machine Control</h2>
          {selectedMachine ? (
            <Tabs defaultValue="control">
              <TabsList className="w-full">
                <TabsTrigger value="control" className="flex-1">
                  Control
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  Settings
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex-1">
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="control" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Status</CardTitle>
                    <CardDescription>
                      {machines.find((m) => m.id === selectedMachine)?.name} is ready for operation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Position X</Label>
                        <div className="flex items-center">
                          <Input value="0.00" readOnly className="text-right" />
                          <span className="ml-2">mm</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Position Y</Label>
                        <div className="flex items-center">
                          <Input value="0.00" readOnly className="text-right" />
                          <span className="ml-2">mm</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Current Status</Label>
                      <div className="flex items-center text-green-500">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Idle - Ready for job
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Machine Controls</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline">Home Machine</Button>
                        <Button variant="outline">Reset</Button>
                        <Button variant="outline">Test Cut</Button>
                        <Button variant="outline">Emergency Stop</Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Send Job to Machine
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Settings</CardTitle>
                    <CardDescription>Configure operational parameters for your cutting machine</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="machine-name">Machine Name</Label>
                      <Input id="machine-name" defaultValue={machines.find((m) => m.id === selectedMachine)?.name} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="connection-type">Connection Type</Label>
                      <Select
                        defaultValue={
                          machines.find((m) => m.id === selectedMachine)?.type === "USB Serial" ? "usb" : "network"
                        }
                      >
                        <SelectTrigger id="connection-type">
                          <SelectValue placeholder="Select connection type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usb">USB Serial</SelectItem>
                          <SelectItem value="network">Network</SelectItem>
                          <SelectItem value="bluetooth">Bluetooth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-speed">Default Cutting Speed (mm/min)</Label>
                      <Input id="default-speed" type="number" defaultValue="1000" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-depth">Default Cutting Depth (mm)</Label>
                      <Input id="default-depth" type="number" defaultValue="2.0" step="0.1" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Settings</Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Machine Logs</CardTitle>
                      <CardDescription>Communication history with the machine</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] overflow-auto border rounded-md bg-muted p-2">
                      <pre className="text-xs">
                        {`[${new Date().toLocaleTimeString()}] Connected to machine
[${new Date().toLocaleTimeString()}] Firmware version: 1.1.8
[${new Date().toLocaleTimeString()}] Machine status: Idle
[${new Date().toLocaleTimeString()}] Position: X:0.00 Y:0.00
[${new Date().toLocaleTimeString()}] Ready for commands`}
                      </pre>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex w-full gap-2">
                      <Input placeholder="Send command..." className="flex-1" />
                      <Button>Send</Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Machine Connected</CardTitle>
                <CardDescription>Connect to a machine to access control panel</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Wifi className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  {`Select a machine from the list and click "Connect" to begin controlling your cutting machine.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}


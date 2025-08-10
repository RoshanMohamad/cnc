"use client";

import { useState, useEffect } from 'react';
import { useMqtt } from './useMqtt';

export interface MachineStatus {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'standby' | 'error';
    lastSeen: Date;
    type: 'cnc' | 'plasma' | 'laser' | 'router';
    esp32Connected: boolean;
}

interface UseMachineStatusReturn {
    machines: MachineStatus[];
    updateMachineStatus: (machineId: string, status: Partial<MachineStatus>) => void;
}

// Default machine configurations
const DEFAULT_MACHINES: MachineStatus[] = [
    {
        id: 'cnc-01',
        name: 'CNC Router 01',
        status: 'offline',
        lastSeen: new Date(),
        type: 'cnc',
        esp32Connected: false,
    },
    {
        id: 'plasma-01',
        name: 'Plasma Cutter 01',
        status: 'offline',
        lastSeen: new Date(),
        type: 'plasma',
        esp32Connected: false,
    },
    {
        id: 'laser-01',
        name: 'Laser Engraver 01',
        status: 'offline',
        lastSeen: new Date(),
        type: 'laser',
        esp32Connected: false,
    },
];

export const useMachineStatus = (): UseMachineStatusReturn => {
    const [machines, setMachines] = useState<MachineStatus[]>(DEFAULT_MACHINES);
    const { isConnected, subscribe, messages } = useMqtt();

    // Subscribe to machine status topics when MQTT is connected
    useEffect(() => {
        if (isConnected) {
            // Subscribe to all machine status topics
            subscribe('machines/+/status');
            subscribe('machines/+/heartbeat');
            subscribe('esp32/+/online');
            subscribe('esp32/+/offline');
            subscribe('cnc/+/status');

            console.log('Subscribed to machine status topics');
        }
    }, [isConnected, subscribe]);

    // Process incoming MQTT messages
    useEffect(() => {
        if (messages.length === 0) return;

        const latestMessage = messages[messages.length - 1];
        const { topic, message } = latestMessage;

        console.log('Processing machine status message:', { topic, message });

        // Parse ESP32 online/offline messages
        if (topic.includes('esp32') && topic.includes('online')) {
            const machineId = extractMachineId(topic);
            if (machineId) {
                updateMachineFromESP32(machineId, 'online', message);
            }
        }

        if (topic.includes('esp32') && topic.includes('offline')) {
            const machineId = extractMachineId(topic);
            if (machineId) {
                updateMachineFromESP32(machineId, 'offline', message);
            }
        }

        // Parse machine status messages
        if (topic.includes('machines') && topic.includes('status')) {
            const machineId = extractMachineId(topic);
            if (machineId) {
                updateMachineFromStatus(machineId, message);
            }
        }

        // Parse CNC specific status messages
        if (topic.includes('cnc') && topic.includes('status')) {
            const machineId = extractMachineId(topic) || 'cnc-01';
            updateMachineFromStatus(machineId, message);
        }

        // Parse heartbeat messages
        if (topic.includes('heartbeat')) {
            const machineId = extractMachineId(topic);
            if (machineId) {
                updateMachineHeartbeat(machineId);
            }
        }

    }, [messages]);

    const extractMachineId = (topic: string): string | null => {
        // Extract machine ID from topics like "esp32/cnc-01/online" or "machines/cnc-01/status"
        const parts = topic.split('/');
        if (parts.length >= 2) {
            return parts[1]; // Assumes format: prefix/machineId/suffix
        }
        return null;
    };

    const updateMachineFromESP32 = (machineId: string, espStatus: 'online' | 'offline', message: string) => {
        setMachines(prev => prev.map(machine => {
            if (machine.id === machineId || machine.name.toLowerCase().includes(machineId.toLowerCase())) {
                const newStatus = espStatus === 'online' ? 'online' : 'offline';
                console.log(`ESP32 ${espStatus} for ${machine.name}: ${message}`);

                return {
                    ...machine,
                    status: newStatus,
                    esp32Connected: espStatus === 'online',
                    lastSeen: new Date(),
                };
            }
            return machine;
        }));
    };

    const updateMachineFromStatus = (machineId: string, statusMessage: string) => {
        let status: MachineStatus['status'] = 'offline';

        // Parse status message
        const msg = statusMessage.toLowerCase();
        if (msg.includes('online') || msg.includes('ready') || msg.includes('idle')) {
            status = 'online';
        } else if (msg.includes('standby') || msg.includes('waiting')) {
            status = 'standby';
        } else if (msg.includes('error') || msg.includes('fault')) {
            status = 'error';
        } else if (msg.includes('offline') || msg.includes('disconnected')) {
            status = 'offline';
        }

        setMachines(prev => prev.map(machine => {
            if (machine.id === machineId || machine.name.toLowerCase().includes(machineId.toLowerCase())) {
                console.log(`Status update for ${machine.name}: ${statusMessage} -> ${status}`);

                return {
                    ...machine,
                    status,
                    lastSeen: new Date(),
                    esp32Connected: status === 'online' || status === 'standby',
                };
            }
            return machine;
        }));
    };

    const updateMachineHeartbeat = (machineId: string) => {
        setMachines(prev => prev.map(machine => {
            if (machine.id === machineId || machine.name.toLowerCase().includes(machineId.toLowerCase())) {
                return {
                    ...machine,
                    lastSeen: new Date(),
                    // If we receive a heartbeat, the ESP32 is definitely connected
                    esp32Connected: true,
                    // Keep machine online if it was already online
                    status: machine.status === 'offline' ? 'online' : machine.status,
                };
            }
            return machine;
        }));
    };

    const updateMachineStatus = (machineId: string, updates: Partial<MachineStatus>) => {
        setMachines(prev => prev.map(machine =>
            machine.id === machineId
                ? { ...machine, ...updates, lastSeen: new Date() }
                : machine
        ));
    };

    // Auto-offline machines that haven't been seen for 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setMachines(prev => prev.map(machine => {
                const timeSinceLastSeen = now.getTime() - machine.lastSeen.getTime();
                if (timeSinceLastSeen > 30000 && machine.status !== 'offline') { // 30 seconds
                    console.log(`Machine ${machine.name} offline due to timeout`);
                    return {
                        ...machine,
                        status: 'offline',
                        esp32Connected: false,
                    };
                }
                return machine;
            }));
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return {
        machines,
        updateMachineStatus,
    };
};

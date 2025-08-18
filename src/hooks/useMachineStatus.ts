"use client";

import { useState, useEffect } from 'react';

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
    updateMachineFromHTTP: (machineId: string, data: { status?: string; timestamp?: number }) => void;
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

    const updateMachineFromHTTP = (machineId: string, data: { status?: string; timestamp?: number }) => {
        setMachines(prev => prev.map(machine => {
            if (machine.id === machineId) {
                let status: MachineStatus['status'] = 'offline';

                // Parse HTTP data
                if (data.status) {
                    const statusMsg = data.status.toLowerCase();
                    if (statusMsg.includes('online') || statusMsg.includes('ready') || statusMsg.includes('idle')) {
                        status = 'online';
                    } else if (statusMsg.includes('standby') || statusMsg.includes('waiting')) {
                        status = 'standby';
                    } else if (statusMsg.includes('error') || statusMsg.includes('fault')) {
                        status = 'error';
                    } else if (statusMsg.includes('offline') || statusMsg.includes('disconnected')) {
                        status = 'offline';
                    }
                }

                console.log(`HTTP update for ${machine.name}: ${data.status} -> ${status}`);

                return {
                    ...machine,
                    status,
                    esp32Connected: status === 'online' || status === 'standby',
                    lastSeen: new Date(),
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
        updateMachineFromHTTP,
    };
};

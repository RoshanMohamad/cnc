"use client";

import { useWebSocket } from '@/contexts/WebSocketContext';

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
    isWebSocketConnected: boolean;
    sendGcode: (machineId: string, gcode: string, lineNumber?: number, jobId?: string) => void;
}

export const useMachineStatus = (): UseMachineStatusReturn => {
    const { machines: wsMachines, isConnected, sendGcode } = useWebSocket();

    // Convert WebSocket machines object to array for backward compatibility
    const machines = Object.values(wsMachines);

    // These functions are kept for backward compatibility but now just log
    const updateMachineStatus = (machineId: string, status: Partial<MachineStatus>) => {
        console.log('⚠️ Direct machine status updates are now handled via WebSocket');
        console.log(`Attempted update for ${machineId}:`, status);
    };

    const updateMachineFromHTTP = (machineId: string, data: { status?: string; timestamp?: number }) => {
        console.log('⚠️ HTTP machine updates are now handled via WebSocket');
        console.log(`HTTP update for ${machineId}:`, data);
    };

    return {
        machines,
        updateMachineStatus,
        updateMachineFromHTTP,
        isWebSocketConnected: isConnected,
        sendGcode,
    };
};

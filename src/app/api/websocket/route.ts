import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';

// Global WebSocket server instance
let wss: WebSocketServer | null = null;
let isInitializing = false;
const clients = new Set<WebSocket>();

// WebSocket message types
export interface WebSocketMessage {
    type: 'cnc_status' | 'gcode_progress' | 'machine_connect' | 'machine_disconnect' | 'error' | 'heartbeat';
    data?: unknown;
    machineId?: string;
    timestamp?: number;
}

// Initialize WebSocket server
function initializeWebSocketServer() {
    if (wss || isInitializing) return wss;

    isInitializing = true;

    try {
        wss = new WebSocketServer({
            port: 8080,
            perMessageDeflate: false
        });

        wss.on('connection', (ws: WebSocket) => {
            console.log('New WebSocket connection established');
            clients.add(ws);

            // Send welcome message
            const welcomeMessage: WebSocketMessage = {
                type: 'cnc_status',
                data: { status: 'connected', message: 'WebSocket connection established' },
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(welcomeMessage));

            // Handle incoming messages
            ws.on('message', (data: Buffer) => {
                try {
                    const message: WebSocketMessage = JSON.parse(data.toString());
                    console.log('Received WebSocket message:', message);

                    // Handle different message types
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: { message: 'Invalid message format' },
                        timestamp: Date.now()
                    }));
                }
            });

            // Handle client disconnect
            ws.on('close', () => {
                console.log('WebSocket connection closed');
                clients.delete(ws);
            });

            // Handle WebSocket errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                clients.delete(ws);
            });

            // Send periodic heartbeat
            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: Date.now()
                    }));
                } else {
                    clearInterval(heartbeatInterval);
                }
            }, 30000); // Send heartbeat every 30 seconds
        });

        console.log('WebSocket server started on port 8080');
        isInitializing = false;
        return wss;
    } catch (error) {
        console.error('Failed to initialize WebSocket server:', error);
        isInitializing = false;
        return null;
    }
}

// Handle different types of WebSocket messages
function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
        case 'machine_connect':
            // Broadcast machine connection to all clients
            broadcastToAllClients({
                type: 'machine_connect',
                data: { machineId: message.machineId, status: 'connected' },
                timestamp: Date.now()
            });
            break;

        case 'machine_disconnect':
            // Broadcast machine disconnection to all clients
            broadcastToAllClients({
                type: 'machine_disconnect',
                data: { machineId: message.machineId, status: 'disconnected' },
                timestamp: Date.now()
            });
            break;

        case 'gcode_progress':
            // Broadcast G-code execution progress
            broadcastToAllClients({
                type: 'gcode_progress',
                data: message.data,
                machineId: message.machineId,
                timestamp: Date.now()
            });
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

// Broadcast message to all connected clients
export function broadcastToAllClients(message: WebSocketMessage) {
    const messageString = JSON.stringify(message);

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        } else {
            // Remove closed connections
            clients.delete(client);
        }
    });
}

// Send message to specific client (if needed in the future)
export function sendToClient(clientId: string, message: WebSocketMessage) {
    // Implementation for sending to specific client would go here
    // For now, we'll broadcast to all clients
    broadcastToAllClients(message);
}

// HTTP endpoints for WebSocket management
export async function GET() {
    try {
        // Initialize WebSocket server if not already done
        if (!wss) {
            initializeWebSocketServer();
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'WebSocket server is running',
            port: 8080,
            connectedClients: clients.size
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Initialize WebSocket server if not already done
        if (!wss) {
            initializeWebSocketServer();
        }

        // Broadcast the message to all connected clients
        broadcastToAllClients({
            type: body.type || 'cnc_status',
            data: body.data,
            machineId: body.machineId,
            timestamp: Date.now()
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Message broadcasted to all clients',
            connectedClients: clients.size
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Initialize WebSocket server when the module loads
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // Only run on server side and in production to avoid development hot reload issues
    initializeWebSocketServer();
}

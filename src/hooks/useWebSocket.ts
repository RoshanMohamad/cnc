import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
    type: 'cnc_status' | 'gcode_progress' | 'machine_connect' | 'machine_disconnect' | 'error' | 'heartbeat';
    data?: unknown;
    machineId?: string;
    timestamp?: number;
}

export interface UseWebSocketOptions {
    url?: string;
    onMessage?: (message: WebSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
    isConnected: boolean;
    sendMessage: (message: WebSocketMessage) => void;
    lastMessage: WebSocketMessage | null;
    reconnect: () => void;
    disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        url = 'ws://localhost:8080',
        onMessage,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                setIsConnected(true);
                onConnect?.();
            };

            ws.current.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);
                    onMessage?.(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                onDisconnect?.();
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError?.(error);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            setIsConnected(false);
        }
    }, [url, onMessage, onConnect, onDisconnect, onError]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                ...message,
                timestamp: Date.now()
            }));
        } else {
            console.warn('WebSocket is not connected. Cannot send message:', message);
        }
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        setTimeout(() => connect(), 100);
    }, [connect, disconnect]);

    // Simplified useEffect - only connect when explicitly enabled to avoid dev mode issues
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true') {
            const timer = setTimeout(connect, 1000);
            return () => {
                clearTimeout(timer);
                disconnect();
            };
        }
        // Return empty cleanup for dev mode
        return () => { };
    }, [connect, disconnect]);

    return {
        isConnected,
        sendMessage,
        lastMessage,
        reconnect,
        disconnect
    };
}
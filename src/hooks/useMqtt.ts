"use client";

import { useEffect, useState, useCallback } from 'react';

interface MqttMessage {
    topic: string;
    message: string;
    timestamp: Date;
}

interface UseMqttOptions {
    brokerUrl?: string;
    username?: string;
    password?: string;
    clientId?: string;
    autoConnect?: boolean;
}

interface MqttClient {
    connected: boolean;
    publish: (topic: string, message: string, callback?: (error?: Error) => void) => void;
    subscribe: (topic: string, callback?: (error?: Error) => void) => void;
    unsubscribe: (topic: string, callback?: (error?: Error) => void) => void;
    end: () => void;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
}

interface UseMqttReturn {
    client: MqttClient | null;
    isConnected: boolean;
    isConnecting: boolean;
    messages: MqttMessage[];
    error: string | null;
    connect: () => void;
    disconnect: () => void;
    publish: (topic: string, message: string) => void;
    subscribe: (topic: string) => void;
    unsubscribe: (topic: string) => void;
    clearMessages: () => void;
}

export const useMqtt = (options: UseMqttOptions = {}): UseMqttReturn => {
    const {
        brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || '',
        username = process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
        password = process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
        clientId = `cnc-client-${Math.random().toString(16).substr(2, 8)}`,
        autoConnect = true,
    } = options;

    const [client, setClient] = useState<MqttClient | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [messages, setMessages] = useState<MqttMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        if (!brokerUrl) {
            setError('MQTT broker URL not configured');
            return;
        }

        if (isConnected) {
            console.log('Already connected');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Dynamic import to avoid SSR issues
            const { default: mqtt } = await import('mqtt');

            const mqttClient = mqtt.connect(brokerUrl, {
                clientId,
                username: username || undefined,
                password: password || undefined,
                clean: true,
                connectTimeout: 30000,
                reconnectPeriod: 1000,
                keepalive: 60,
            }) as MqttClient;

            mqttClient.on('connect', () => {
                console.log('MQTT connected to:', brokerUrl);
                setIsConnected(true);
                setIsConnecting(false);
                setError(null);
                setClient(mqttClient);
            });

            mqttClient.on('error', (...args: unknown[]) => {
                const err = args[0] as Error;
                console.error('MQTT connection error:', err);
                setError(err.message || 'Connection failed');
                setIsConnecting(false);
                setIsConnected(false);
            });

            mqttClient.on('close', () => {
                console.log('MQTT connection closed');
                setIsConnected(false);
                setIsConnecting(false);
            });

            mqttClient.on('message', (...args: unknown[]) => {
                const topic = args[0] as string;
                const payload = args[1] as Buffer;
                const message = {
                    topic,
                    message: payload.toString(),
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev.slice(-99), message]);
            });

        } catch (err) {
            console.error('Failed to create MQTT client:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect');
            setIsConnecting(false);
        }
    }, [brokerUrl, clientId, username, password, isConnected]);

    const disconnect = useCallback(() => {
        if (client) {
            client.end();
            setClient(null);
            setIsConnected(false);
            setIsConnecting(false);
        }
    }, [client]);

    const publish = useCallback((topic: string, message: string) => {
        if (!client?.connected) {
            setError('Not connected to MQTT broker');
            return;
        }

        client.publish(topic, message, (err?: Error) => {
            if (err) {
                console.error('Failed to publish message:', err);
                setError(`Failed to publish: ${err.message}`);
            } else {
                console.log(`Published to ${topic}:`, message);
                // Add published message to local messages for feedback
                setMessages(prev => [...prev.slice(-99), {
                    topic: `${topic} (sent)`,
                    message,
                    timestamp: new Date(),
                }]);
            }
        });
    }, [client]);

    const subscribe = useCallback((topic: string) => {
        if (!client?.connected) {
            setError('Not connected to MQTT broker');
            return;
        }

        client.subscribe(topic, (err?: Error) => {
            if (err) {
                console.error(`Failed to subscribe to ${topic}:`, err);
                setError(`Failed to subscribe: ${err.message}`);
            } else {
                console.log(`Subscribed to ${topic}`);
            }
        });
    }, [client]);

    const unsubscribe = useCallback((topic: string) => {
        if (!client?.connected) {
            return;
        }

        client.unsubscribe(topic, (err?: Error) => {
            if (err) {
                console.error(`Failed to unsubscribe from ${topic}:`, err);
            } else {
                console.log(`Unsubscribed from ${topic}`);
            }
        });
    }, [client]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    // Auto-connect effect
    useEffect(() => {
        if (autoConnect && !client && !isConnecting) {
            connect();
        }

        // Cleanup on unmount
        return () => {
            if (client) {
                client.end();
            }
        };
    }, [autoConnect, client, isConnecting, connect]);

    return {
        client,
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
    };
};

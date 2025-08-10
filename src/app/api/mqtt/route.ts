import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';

// Server-side MQTT client for backend operations
let client: mqtt.MqttClient | null = null;

const connectToMqtt = () => {
    if (client?.connected) return client;

    const brokerUrl = process.env.MQTT_BROKER_URL;
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    if (!brokerUrl) {
        throw new Error('MQTT_BROKER_URL not configured');
    }

    client = mqtt.connect(brokerUrl, {
        username: username || undefined,
        password: password || undefined,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 1000,
    });

    return client;
};

export async function POST(request: NextRequest) {
    try {
        const { topic, message, action } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const mqttClient = connectToMqtt();

        return new Promise<Response>((resolve) => {
            mqttClient.on('connect', () => {
                if (action === 'publish') {
                    if (!message) {
                        resolve(NextResponse.json({ error: 'Message is required for publish' }, { status: 400 }));
                        return;
                    }

                    mqttClient.publish(topic, message, (err: Error | undefined) => {
                        if (err) {
                            resolve(NextResponse.json({ error: `Failed to publish: ${err.message}` }, { status: 500 }));
                        } else {
                            resolve(NextResponse.json({
                                success: true,
                                message: `Published to ${topic}`,
                                data: { topic, message }
                            }));
                        }
                    });
                } else if (action === 'subscribe') {
                    mqttClient.subscribe(topic, (err) => {
                        if (err) {
                            resolve(NextResponse.json({ error: `Failed to subscribe: ${err.message}` }, { status: 500 }));
                        } else {
                            resolve(NextResponse.json({
                                success: true,
                                message: `Subscribed to ${topic}`,
                                data: { topic }
                            }));
                        }
                    });
                } else {
                    resolve(NextResponse.json({ error: 'Invalid action. Use "publish" or "subscribe"' }, { status: 400 }));
                }
            });

            mqttClient.on('error', (err) => {
                resolve(NextResponse.json({ error: `MQTT error: ${err.message}` }, { status: 500 }));
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                resolve(NextResponse.json({ error: 'Connection timeout' }, { status: 408 }));
            }, 10000);
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    try {
        return NextResponse.json({
            mqtt: {
                brokerUrl: process.env.MQTT_BROKER_URL ? 'configured' : 'not configured',
                username: process.env.MQTT_USERNAME ? 'configured' : 'not configured',
                connected: client?.connected || false,
            },
            topics: {
                gcode: process.env.NEXT_PUBLIC_MQTT_TOPIC_GCODE,
                status: process.env.NEXT_PUBLIC_MQTT_TOPIC_STATUS,
                position: process.env.NEXT_PUBLIC_MQTT_TOPIC_POSITION,
                commands: process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMANDS,
                emergency: process.env.NEXT_PUBLIC_MQTT_TOPIC_EMERGENCY,
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, position, machineIp } = body;

        // Validate input
        if (!action || !['on', 'off'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use "on" or "off"' },
                { status: 400 }
            );
        }

        // Set servo positions
        const servoPosition = action === 'on' ? (position || 90) : 0;

        // Send HTTP request to ESP32
        const esp32Url = `http://${machineIp}/servo`;
        const esp32Response = await fetch(esp32Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: servoPosition })
        });

        if (!esp32Response.ok) {
            return NextResponse.json(
                { error: 'ESP32 did not respond OK' },
                { status: 502 }
            );
        }

        const esp32Data = await esp32Response.json();

        return NextResponse.json({
            success: true,
            action,
            position: servoPosition,
            esp32: esp32Data,
            message: `Servo turned ${action} (position: ${servoPosition}°)`
        });

    } catch (error) {
        console.error('Servo API error:', error);
        return NextResponse.json(
            { error: 'Failed to control servo' },
            { status: 500 }
        );
    }
}
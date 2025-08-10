import { NextRequest, NextResponse } from "next/server";

interface SendToESP32Request {
    gcode: string;
    esp32Ip: string;
    command?: "upload" | "start" | "stop" | "pause" | "resume";
}

export async function POST(request: NextRequest) {
    try {
        const body: SendToESP32Request = await request.json();

        if (!body.gcode && body.command !== "stop" && body.command !== "pause" && body.command !== "resume") {
            return NextResponse.json(
                { error: "G-code is required" },
                { status: 400 }
            );
        }

        if (!body.esp32Ip) {
            return NextResponse.json(
                { error: "ESP32 IP address is required" },
                { status: 400 }
            );
        }

        const command = body.command || "upload";
        let endpoint = "";
        let requestBody: Record<string, unknown> = {};

        switch (command) {
            case "upload":
                endpoint = "/upload-gcode";
                requestBody = {
                    gcode: body.gcode,
                    timestamp: new Date().toISOString()
                };
                break;
            case "start":
                endpoint = "/start";
                requestBody = { gcode: body.gcode };
                break;
            case "stop":
                endpoint = "/stop";
                break;
            case "pause":
                endpoint = "/pause";
                break;
            case "resume":
                endpoint = "/resume";
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid command" },
                    { status: 400 }
                );
        }

        const response = await fetch(`http://${body.esp32Ip}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`ESP32 responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            message: data.message || `Command '${command}' sent to ESP32 successfully`,
            data: data
        });

    } catch (error) {
        console.error("ESP32 communication error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to communicate with ESP32",
                success: false
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check ESP32 status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const esp32Ip = searchParams.get('ip');

        if (!esp32Ip) {
            return NextResponse.json(
                { error: "ESP32 IP address is required" },
                { status: 400 }
            );
        }

        const response = await fetch(`http://${esp32Ip}/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
            throw new Error(`ESP32 responded with status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            status: data
        });

    } catch (error) {
        console.error("ESP32 status check error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to get ESP32 status",
                success: false
            },
            { status: 500 }
        );
    }
}
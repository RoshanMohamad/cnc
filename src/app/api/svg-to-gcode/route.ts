import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

interface SVGConversionRequest {
    svgContent: string;
    params: {
        dpi?: number;
        feed_rate?: number;
        seek_rate?: number;
        cut_depth?: number;
        safe_height?: number;
        tool_diameter?: number;
        tolerance?: number;
        passes?: number;
    };
}

interface SendToESP32Request {
    gcode: string;
    esp32Ip: string;
    command?: "upload" | "start" | "stop" | "pause" | "resume";
}

export async function POST(request: NextRequest) {
    try {
        const body: SVGConversionRequest = await request.json();

        if (!body.svgContent) {
            return NextResponse.json(
                { error: "SVG content is required" },
                { status: 400 }
            );
        }

        // Convert SVG to G-code using Python script
        const result = await convertSVGToGcode(body.svgContent, body.params || {});

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            gcode: result.gcode,
            message: "SVG converted to G-code successfully"
        });

    } catch (error) {
        console.error("SVG conversion error:", error);
        return NextResponse.json(
            { error: "Failed to convert SVG to G-code" },
            { status: 500 }
        );
    }
}

function convertSVGToGcode(
    svgContent: string,
    params: SVGConversionRequest["params"]
): Promise<{ success: boolean; gcode?: string; error?: string }> {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(process.cwd(), 'scripts', 'svg_converter.py');
        const python = spawn('python', [pythonScript]);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script failed: ${stderr}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch {
                reject(new Error(`Failed to parse Python output: ${stdout}`));
            }
        });

        // Send input to Python script
        const input = JSON.stringify({
            svg_content: svgContent,
            params: params
        });

        python.stdin.write(input);
        python.stdin.end();
    });
}

// ESP32 communication
export async function sendToESP32(request: NextRequest) {
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
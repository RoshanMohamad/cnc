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

export async function POST(request: NextRequest) {
    try {
        let body: SVGConversionRequest;

        try {
            body = await request.json();
        } catch (jsonError) {
            console.error("❌ JSON parsing failed in /api/svg-to-gcode:", jsonError);
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

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
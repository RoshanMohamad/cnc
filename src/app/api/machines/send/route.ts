import { type NextRequest, NextResponse } from "next/server"

interface SendGcodeRequest {
  machineId: string;
  gcode: string;
}

export async function POST(request: NextRequest) {
  try {
    const { machineId, gcode }: SendGcodeRequest = await request.json();

    // Validate input
    if (!machineId || !gcode) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const esp32Response = await sendGcodeToESP32(machineId, gcode);

    if (!esp32Response.success) {
      throw new Error(esp32Response.error || "Failed to send G-code to ESP32");
    }

    return NextResponse.json(
      {
        success: true,
        message: "G-code sent to machine successfully",
        esp32Response: esp32Response.message, // Include ESP32 response message
      }
    );
  } catch (error: unknown) {
    console.error("Send error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Send failed",
      }),
      {
        status: 500,
      }
    );
  }
}

async function sendGcodeToESP32(machineId: string, gcode: string) {
  const esp32Endpoint = `http://${machineId}/send-gcode`; // Adjust if needed

  try {
    const response = await fetch(esp32Endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: gcode,
    });

    if (!response.ok) {
      return { success: false, error: `ESP32 returned ${response.status}` };
    }

    return { success: true, message: "G-code sent to ESP32" };
  } catch (error) {
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

import { type NextRequest, NextResponse } from "next/server";

// types/gcode.ts
export interface GcodeRequest {
  machineId: string;
  pieceType: 'front' | 'back' | 'sleeve'; // Add pieceType
  tshirtSize?: string;
  tshirtStyle?: string;
  textContent?: string;
  textPosition?: { x: number; y: number };
  textScale?: number;
  textRotation?: number;
  textFont?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textAlign?: string;
  textColor?: string;
  material?: string;
  thickness?: number;
  speed?: number;
}

interface TShirtSpecs {
  pieceType:  'front' | 'back' | 'sleeve'; // Add pieceType
  tshirtSize: string;
  tshirtStyle: string;
  textContent: string;
  textPosition: { x: number; y: number };
  textScale: number;
  textRotation: number;
  textFont: string;
  textBold: boolean;
  textItalic: boolean;
  textAlign: string;
  textColor: string;
  material: string;
  thickness: number;
  speed: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GcodeRequest = await request.json();

    // Validate required fields
    if (!body.machineId) {
      return NextResponse.json(
        { error: "machineId is required" },
        { status: 400 }
      );
    }

    if (!body.pieceType) {
      return NextResponse.json(
        { error: "pieceType is required" },
        { status: 400 }
      );
    }

    // Generate G-code with proper typing
    const gcode = generateTshirtGcode({
      pieceType: body.pieceType,
      tshirtSize: body.tshirtSize ?? "M",
      tshirtStyle: body.tshirtStyle ?? "classic",
      textContent: body.textContent ?? "TEXT",
      textPosition: body.textPosition ?? { x: 4, y: 2.5 },
      textScale: body.textScale ?? 1,
      textRotation: body.textRotation ?? 0,
      textFont: body.textFont ?? "Arial",
      textBold: body.textBold ?? false,
      textItalic: body.textItalic ?? false,
      textAlign: body.textAlign ?? "center",
      textColor: body.textColor ?? "#000000",
      material: body.material ?? "cotton",
      thickness: body.thickness ?? 0.5,
      speed: body.speed ?? 1000,
    });

    const esp32Response = await sendGcodeToESP32(body.machineId, gcode);

    if (!esp32Response.success) {
      throw new Error(esp32Response.error || "Failed to send G-code to ESP32");
    }

    return NextResponse.json({
      success: true,
      pieceType: body.pieceType,
      gcode,
      esp32Response: esp32Response.message,
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function sendGcodeToESP32(machineId: string, gcode: string) {
  const esp32Endpoint = `http://${machineId}/api/gcode`; // Replace with ESP32 IP

  try {
    const response = await fetch(esp32Endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: gcode,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `ESP32 returned ${response.status}`,
      };
    }

    return {
      success: true,
      message: "G-code sent to ESP32",
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function generateTshirtGcode(data: TShirtSpecs): string {
  const {
    pieceType,
  } = data;

  const frontGcodeContent: string = `
G21
G0 X5 Y5
G1 X35 Y5 F1000
G1 X35 Y40
G2 X25 Y55 R18
G1 X15 Y55
G2 X5 Y40 R18
G1 X5 Y5
`;

  const backGcodeContent: string = `
G21
G0 X5 Y5
G1 X35 Y5 F1000
G1 X35 Y40
G2 X25 Y55 R18
G1 X15 Y55
G2 X5 Y40 R18
G1 X5 Y5
`;

  const sleeveGcodeContent: string = `
G21
G0 X10 Y10
G1 X20 Y10
G1 X20 Y20
G1 X5 Y20
G3 X10 Y10 R12.168

`;

  // Return the appropriate G-code based on piece type
  switch (pieceType) {
    case 'front':
      return frontGcodeContent;
    case 'back':
      return backGcodeContent;
    case 'sleeve':
      return sleeveGcodeContent;
    default:
      throw new Error(`Unknown piece type: ${pieceType}`);
  }
}

import { type NextRequest, NextResponse } from "next/server";

// types/gcode.ts
export interface GcodeRequest {
  machineId: string;
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

    // Generate G-code with proper typing
    const gcode = generateTshirtGcode({
      tshirtSize: body.tshirtSize ?? "M",
      tshirtStyle: body.tshirtStyle ?? "classic",
      textContent: body.textContent ?? "SAMPLE TEXT",
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
    tshirtSize,
    tshirtStyle,
    thickness,
    speed,
  } = data;

  const sizeMultipliers: { [key: string]: number } = {
    XS: 0.85,
    S: 0.92,
    M: 1,
    L: 1.08,
    XL: 1.16,
    XXL: 1.24,
  };
  const styleMultipliers: { [key: string]: number } = {
    classic: 1,
    slim: 0.95,
    oversized: 1.1,
  };
  const sizeMultiplier = sizeMultipliers[tshirtSize] || 1;
  const styleMultiplier = styleMultipliers[tshirtStyle] || 1;

  const dims = {
    width: 460 * sizeMultiplier * styleMultiplier,
    length: 600 * sizeMultiplier * styleMultiplier,
    neckWidth: 160 * sizeMultiplier * styleMultiplier,
    frontNeckDrop: 80 * sizeMultiplier * styleMultiplier,
    backNeckDrop: 20 * sizeMultiplier * styleMultiplier,
    sleeveLength: 200 * sizeMultiplier * styleMultiplier,
    sleeveWidth: 220 * sizeMultiplier * styleMultiplier,
  };

  const zSafe = (thickness ?? 1) + 5;
  const zCut = -(thickness ?? 1);

  let
    gcodeContent = `G21\n`;
  gcodeContent += `G90\n`;
  gcodeContent += `F2000\n`;

  // --- INIT ---
  gcodeContent += `M3 S255\n`;
  gcodeContent += `G4 P1\n`;

  // --- FRONT PIECE ---
  gcodeContent += `M3 S200\n`; // Servo 2 on D10
  gcodeContent += `M3 S0\n`;
  gcodeContent += `G4 P1\n`;
  gcodeContent += `G0 X300 Y350\n`;
  gcodeContent += `G1 Z${Math.round(zCut)} F${speed}\n`;
  gcodeContent += `G0 Z${Math.round(zSafe)}\n`;
  gcodeContent += `M3 S255\n`;
  gcodeContent += `M3 S128\n`;
  gcodeContent += `G4 P1\n`;
  // --- MOVE MATERIAL FOR BACK PIECE  ---
  gcodeContent += `G91\n`;
  gcodeContent += `G1 Z100 F1500\n`;
  gcodeContent += `G90\n`;
  gcodeContent += `M3 S0\n`;
  gcodeContent += `G4 P1\n`;
  gcodeContent += generatePieceGcodeAPI(
    { x: 300 + dims.width + 50, y: 350 },
    zCut,
    zSafe,
    speed ?? 800
  );
  gcodeContent += `M3 S255\n`;
  gcodeContent += `G4 P1\n`;
  gcodeContent += `G91\n`;
  gcodeContent += `G1 Y100 F1000\n`;
  gcodeContent += `G90\n`;

  // --- LEFT SLEEVE ---
  gcodeContent += `M3 S0\n`;
  gcodeContent += `G4 P1\n`;
  gcodeContent += generatePieceGcodeAPI(
    { x: 300, y: 350 + dims.length + 50 },
    zCut,
    zSafe,
    speed ?? 800
  );
  gcodeContent += `M3 S255\n`;
  gcodeContent += `G4 P1\n`;

  // --- RIGHT SLEEVE ---
  gcodeContent += `M3 S0\n`;
  gcodeContent += `G4 P1\n`;
  gcodeContent += generatePieceGcodeAPI(
    { x: 300 + dims.sleeveWidth + 50, y: 350 + dims.length + 50 },
    zCut,
    zSafe,
    speed ?? 800
  );
  gcodeContent += `M3 S255\n`;
  gcodeContent += `G4 P1\n`;

  // --- END OF PROGRAM ---
  gcodeContent += `G0 Z${Math.round(zSafe)}\n`;
  gcodeContent += `G0 X0 Y0\n`;
  gcodeContent += `M30\n`;

  return gcodeContent;
}

// Helper function to match the placeholder in page.tsx
function generatePieceGcodeAPI(
  position: { x: number; y: number },
  zCut: number,
  zSafe: number,
  speed: number
) {
  let 
  g = `G0 X${Math.round(position.x)} Y${Math.round(position.y)}\n`;
  g += `G1 Z${Math.round(zCut)} F${Math.round(speed / 2)}\n`; // Plunge
  g += `G0 Z${Math.round(zSafe)}\n`; // Retract
  return g;
}


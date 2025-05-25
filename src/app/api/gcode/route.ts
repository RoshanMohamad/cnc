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
      textPosition: body.textPosition ?? { x: 400, y: 250 },
      textScale: body.textScale ?? 100,
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
    textContent,
    textPosition,
    textScale,
    textRotation,
    textFont,
    textBold,
    textItalic,
    textAlign,
    textColor,
    speed,
  } = data;

  // Size multipliers
  const sizeMultipliers: Record<string, number> = {
    XS: 0.9,
    S: 0.95,
    M: 1,
    L: 1.05,
    XL: 1.1,
    XXL: 1.15,
  };

  const multiplier = sizeMultipliers[tshirtSize] ?? 1;

  // Style adjustments
  const styleAdjustments: Record<string, { width: number; length: number }> = {
    classic: { width: 1, length: 1 },
    slim: { width: 0.9, length: 1.05 },
    oversized: { width: 1.2, length: 0.95 },
  };

  const styleAdj = styleAdjustments[tshirtStyle] ?? styleAdjustments.classic;

  // Base dimensions in mm
  const baseWidth = 600 * multiplier * styleAdj.width;
  const baseLength = 700 * multiplier * styleAdj.length;
  const neckSize = 100 * multiplier;

  return `
Generated on ${new Date().toLocaleString()}
G21 ;
G90 ; 
G92 X0 Y0 Z0 ;
F${speed} ; 
Z5 ; 
G0 X400 Y100 ; 
Z0 ; 
G2 X${400 - neckSize} Y100 I-${neckSize} J0 ;
G1 X${400 - baseWidth / 2} Y150 ; 
G1 X${400 - baseWidth / 2} Y${100 + baseLength} ;
G1 X${400 + baseWidth / 2} Y${100 + baseLength} ;
G1 X${400 + baseWidth / 2} Y150 ;
G1 X${400 + neckSize} Y100 ;
G2 X400 Y100 I-${neckSize} J0 ;
G0 X${400 - baseWidth / 2} Y150 ;
Z0 ; 
G1 X${400 - baseWidth / 2 - 200} Y250 ;
G1 X${400 - baseWidth / 2 - 100} Y250 ; 
G1 X${400 - baseWidth / 2} Y200 ; 
G0 X${400 + baseWidth / 2} Y150 ; 
Z0 ;
G1 X${400 + baseWidth / 2 + 200} Y250 ; 
G1 X${400 + baseWidth / 2 + 100} Y250 ;
G1 X${400 + baseWidth / 2} Y200 ; 
G0 Z5 ;
G0 X${textPosition.x} Y${textPosition.y} ;
Z1 ; 
; Text: "${textContent}"
; Position: X${textPosition.x} Y${textPosition.y}
; Scale: ${textScale}%
; Rotation: ${textRotation}°
; Font: ${textFont} ${textBold ? "Bold" : ""} ${textItalic ? "Italic" : ""}
; Color: ${textColor}
; Alignment: ${textAlign}
G0 Z10 ; 
G0 X0 Y0 ; 
M2 ; `;
}
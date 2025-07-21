import { type NextRequest, NextResponse } from "next/server";

// WebSocket integration
async function broadcastWebSocketMessage(type: string, data: unknown, machineId?: string) {
  try {
    await fetch('http://localhost:3000/api/websocket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        data,
        machineId
      })
    });
  } catch (error) {
    console.error('Failed to broadcast WebSocket message:', error);
  }
}

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

    // Broadcast G-code generation start
    await broadcastWebSocketMessage('gcode_progress', {
      progress: 0,
      status: 'Generating G-code...'
    }, body.machineId);

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

    // Broadcast G-code generation complete
    await broadcastWebSocketMessage('gcode_progress', {
      progress: 50,
      status: 'G-code generated, sending to machine...'
    }, body.machineId);

    const esp32Response = await sendGcodeToESP32(body.machineId, gcode);

    if (!esp32Response.success) {
      // Broadcast error
      await broadcastWebSocketMessage('error', {
        error: esp32Response.error || "Failed to send G-code to ESP32"
      }, body.machineId);

      throw new Error(esp32Response.error || "Failed to send G-code to ESP32");
    }

    // Broadcast success
    await broadcastWebSocketMessage('gcode_progress', {
      progress: 100,
      status: 'G-code sent successfully!'
    }, body.machineId);

    return NextResponse.json({
      success: true,
      gcode,
      esp32Response: esp32Response.message,
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Broadcast error via WebSocket
    await broadcastWebSocketMessage('error', {
      error: errorMessage
    });

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
    // tshirtSize,
    // tshirtStyle,
    // thickness,
    // speed,
  } = data;

  // const sizeMultipliers: { [key: string]: number } = {
  //   XS: 0.85,
  //   S: 0.92,
  //   M: 1,
  //   L: 1.08,
  //   XL: 1.16,
  //   XXL: 1.24,
  // };
  // const styleMultipliers: { [key: string]: number } = {
  //   classic: 1,
  //   slim: 0.95,
  //   oversized: 1.1,
  // };
  // const sizeMultiplier = sizeMultipliers[tshirtSize] || 1;
  // const styleMultiplier = styleMultipliers[tshirtStyle] || 1;

  // const dims = {
  //   width: 460 * sizeMultiplier * styleMultiplier,
  //   length: 600 * sizeMultiplier * styleMultiplier,
  //   neckWidth: 160 * sizeMultiplier * styleMultiplier,
  //   frontNeckDrop: 80 * sizeMultiplier * styleMultiplier,
  //   backNeckDrop: 20 * sizeMultiplier * styleMultiplier,
  //   sleeveLength: 200 * sizeMultiplier * styleMultiplier,
  //   sleeveWidth: 220 * sizeMultiplier * styleMultiplier,
  // };

  // const zSafe = (thickness ?? 1) + 5;
  // const zCut = -(thickness ?? 1);

  const gcodeContent: string = `
G21
G90
M3
G4 P0.5
G0 Z5.000000
G4 P0.2
G0 X4.072693 Y21.205520
G4 P0.1
G0 Z-1.000000
G4 P0.2
G0 X4.072693 Y38.856500 Z-1.000000
G4 P0.1
G0 X4.695617 Y39.540320 Z-1.000000 F1000
G4 P0.1
G03 X5.878618 Y41.439324 Z-1.000000 I-4.576622 J4.169029
G4 P0.1
G03 X7.377932 Y46.346030 Z-1.000000 I-30.288257 J11.937433
G4 P0.1
G03 X7.973030 Y50.850601 Z-1.000000 I-25.728173 J5.690536
G4 P0.1
G03 X7.786562 Y55.415830 Z-1.000000 I-26.617587 J1.199225
G4 P0.1
G0 X7.630898 Y56.638150 Z-1.000000
G4 P0.1
G0 X11.408047 Y56.638150 Z-1.000000
G4 P0.1
G02 X15.072711 Y56.525610 Z-1.000000 I-0.000000 J-59.722766
G4 P0.1
G02 X15.185193 Y56.406000 Z-1.000000 I-0.007353 J-0.119610
G4 P0.1
G03 X15.612080 Y55.331096 Z-1.000000 I1.566751 J0.000000
G4 P0.1
G03 X17.592308 Y53.853420 Z-1.000000 I5.202115 J4.905648
G4 P0.1
G03 X21.026223 Y53.529826 Z-1.000000 I2.129853 J4.219771
G4 P0.1
G03 X23.811355 Y55.638440 Z-1.000000 I-1.337691 J4.660527
G4 P0.1
G0 X24.412537 Y56.609700 Z-1.000000
G4 P0.1
G0 X28.155771 Y56.623900 Z-1.000000
G4 P0.1
G0 X31.899007 Y56.638100 Z-1.000000
G4 P0.1
G0 X31.782677 Y55.648600 Z-1.000000
G4 P0.1
G03 X31.605993 Y50.469583 Z-1.000000 I31.067539 J-3.652403
G4 P0.1
G03 X32.268787 Y45.699650 Z-1.000000 I26.983759 J1.318445
G4 P0.1
G03 X33.656107 Y41.350977 Z-1.000000 I27.313873 J6.318084
G4 P0.1
G03 X34.802895 Y39.540270 Z-1.000000 I5.716181 J2.351763
G4 P0.1
G0 X35.425818 Y38.856450 Z-1.000000
G4 P0.1
G0 X35.425818 Y21.205470 Z-1.000000
G4 P0.1
G0 X35.425818 Y3.554490 Z-1.000000
G4 P0.1
G0 X19.749256 Y3.554490 Z-1.000000
G4 P0.1
G0 X4.072693 Y3.554490 Z-1.000000
G4 P0.1
G0 X4.072693 Y21.205470 Z-1.000000
G4 P0.1
G0 X4.072693 Y21.205520 Z-1.000000
G4 P0.2
G0 Z5.000000
G4 P0.5
M5
M2
`

  // let
  //   gcodeContent = G21\n;
  //   gcodeContent += G90\n;
  //   gcodeContent += G94\n;
  //   gcodeContent+= M03 S50\n; // Set spindle speed to 127 (50%)
  //   gcodeContent += G4 P1\n;
  //   //gcodeContent+= M03 S0\n; // Turn off spindle    
  //   gcodeContent += G0 X0 Y0 F5000\n; // Move to start position
  //   gcodeContent += G1 Y20\n; // Move to safe height
  //   gcodeContent += G1 X1\n;
  //gcodeContent += G0 Y0; // Move to safe height
  //gcodeContent += G0 X0\n;
  // gcodeContent+= M03 S50\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent += M03 S75\n; // Set spindle speed to 255
  // gcodeContent += G4 P1\n;
  // gcodeContent+= M03 S100\n;
  // gcodeContent += G4 P1\n;
  //   gcodeContent += M03 S0\n;
  //   gcodeContent += G4 P1\n;
  // gcodeContent += M4\n;
  // gcodeContent += G90\n;
  // gcodeContent += F2000\n;6

  // // --- INIT ---
  // gcodeContent += M3 S255\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent+= M03 S0\n; // Turn off spindle

  // // --- FRONT PIECE ---
  // gcodeContent += M3 S200\n; // Servo 2 on D10
  // gcodeContent += M3 S0\n;
  // gcodeContent += G4 P1\n;
  //gcodeContent += G0 X300 Y350\n;
  // gcodeContent += G1 Z${Math.round(zCut)} F${speed}\n;
  // gcodeContent += G0 Z${Math.round(zSafe)}\n;
  // gcodeContent += M3 S255\n;
  // gcodeContent += M3 S128\n;
  // gcodeContent += G4 P1\n;
  // // --- MOVE MATERIAL FOR BACK PIECE  ---
  // gcodeContent += G91\n;
  // gcodeContent += G1 Z100 F1500\n;
  // gcodeContent += G90\n;
  // gcodeContent += M3 S0\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent += generatePieceGcodeAPI(
  //   { x: 300 + dims.width + 50, y: 350 },
  //   zCut,
  //   zSafe,
  //   speed ?? 800
  // );
  // gcodeContent += M3 S255\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent += G91\n;
  // gcodeContent += G1 Y100 F1000\n;
  // gcodeContent += G90\n;

  // // --- LEFT SLEEVE ---
  // gcodeContent += M3 S0\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent += generatePieceGcodeAPI(
  //   { x: 300, y: 350 + dims.length + 50 },
  //   zCut,
  //   zSafe,
  //   speed ?? 800
  // );
  // gcodeContent += M3 S255\n;
  // gcodeContent += G4 P1\n;

  // // --- RIGHT SLEEVE ---
  // gcodeContent += M3 S0\n;
  // gcodeContent += G4 P1\n;
  // gcodeContent += generatePieceGcodeAPI(
  //   { x: 300 + dims.sleeveWidth + 50, y: 350 + dims.length + 50 },
  //   zCut,
  //   zSafe,
  //   speed ?? 800
  // );
  // gcodeContent += M3 S255\n;
  // gcodeContent += G4 P1\n;

  // // --- END OF PROGRAM ---
  // gcodeContent += G0 Z${Math.round(zSafe)}\n;
  // gcodeContent += G0 X0 Y0\n;


  return gcodeContent;
}

// For testing purposes, you can log the generated G-code

// Helper function to match the placeholder in page.tsx
// function generatePieceGcodeAPI(
//   position: { x: number; y: number },
//   zCut: number,
//   zSafe: number,
//   speed: number
// ) {
//   let 
//   g = G0 X${Math.round(position.x)} Y${Math.round(position.y)}\n;
//   g += G1 Z${Math.round(zCut)} F${Math.round(speed / 2)}\n; // Plunge
//   g += G0 Z${Math.round(zSafe)}\n; // Retract
//   return g;
// }
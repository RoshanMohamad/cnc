import { type NextRequest, NextResponse } from "next/server";

// types/gcode.ts
export interface GcodeRequest {
  machineId: string;
  pieceType: 'front' | 'back' | 'sleeve'; // Add pieceType
  packetSize?: number; // Add packet size option
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

export interface GcodePacket {
  packet_id: number;
  packet_lines: string[];
  lines_in_packet: number;
  is_last_packet: boolean;
}

interface TShirtSpecs {
  pieceType: 'front' | 'back' | 'sleeve'; // Add pieceType
  packetSize: number; // Add packet size
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
    const packetSize = body.packetSize ?? 20; // Default to 20 lines per packet

    const gcode = generateTshirtGcode({
      pieceType: body.pieceType,
      packetSize: packetSize,
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

    // Return G-code for use with GcodeSender component (handshake system)
    const lines = gcode
      .split('\n')
      .map(line => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith(';'));

    // Create packets of specified size (default 20 lines)
    const packets: GcodePacket[] = [];
    for (let i = 0; i < lines.length; i += packetSize) {
      const packetLines = lines.slice(i, i + packetSize);
      packets.push({
        packet_id: Math.floor(i / packetSize) + 1,
        packet_lines: packetLines,
        lines_in_packet: packetLines.length,
        is_last_packet: i + packetSize >= lines.length
      });
    }

    return NextResponse.json({
      success: true,
      pieceType: body.pieceType,
      gcode: lines.join('\n'), // Full G-code without empty lines
      gcode_lines: lines,
      total_lines: lines.length,
      packet_size: packetSize,
      total_packets: packets.length,
      packets: packets, // Array of G-code packets
      machine_id: body.machineId,
      message: `G-code generated successfully with ${packets.length} packets of ${packetSize} lines each. Use GcodeSender component for transmission.`,
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

function generateTshirtGcode(data: TShirtSpecs): string {
  const {
    pieceType,
    // packetSize is not used in this function but kept for consistency
  } = data;

  const frontGcodeContent: string = `; Front T-Shirt Piece - Valid GRBL Commands
G21
F500
G92 X0 Y0 Z0
G1 Z0
G1 X5 Y5
M3 S10
G1 Z0
G1 X5 Y35
G1 Z0
M3 S30
G1 Z0
G3 X10 Y55 R37
G1 Z0
M3 S55
G1 Z0
G1 X15 Y55
G1 Z0
M3 S60
G1 Z0
G3 X20 Y54 R8
G1 Z0
M3 S45
G1 Z0
G3 X25 Y55 R8
G1 Z0
M3 S55
G1 Z0
G1 X30 Y55
G1 Z0
M3 S90
G1 Z0
G3 X35 Y35 R37
G1 Z0
M3 S10
G1 Z0
G1 X35 Y5
G1 Z0
M3 S55
G1 Z0
G1 X5 Y5
G1 Z0
G1 X0 Y0`;

  const backGcodeContent: string = `; Back T-Shirt Piece - Valid GRBL Commands
G21
G90
G92 X0 Y0 Z0
F1000
G0 X5 Y5
G1 Z-1 F500
G1 X35 Y5
G1 X35 Y40
G2 X25 Y55 I-10 J0
G1 X15 Y55
G2 X5 Y40 I0 J-15
G1 X5 Y5
G0 Z5
G0 X0 Y0`;

  const sleeveGcodeContent: string = `; Sleeve Piece - Valid GRBL Commands
G21
G90
G92 X0 Y0 Z0
F1000
G0 X10 Y10
G1 Z-1 F500
G1 X20 Y10
G1 X20 Y20
G1 X5 Y20
G3 X10 Y10 I5 J-10
G0 Z5
G0 X0 Y0`;

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

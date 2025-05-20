import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { machineId } = await request.json()
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Machine connected successfully",
      status: "connected",
      machineDetails: {
        id: machineId,
        firmwareVersion: "1.1.8",
        position: { x: 0, y: 0 },
        status: "idle",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
    });
  }
}


import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { machine_id, status, timestamp } = data

    console.log('Machine heartbeat received:', {
      machine_id,
      status,
      timestamp,
      received_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Heartbeat received from ${machine_id}`,
      data: {
        machine_id,
        status,
        timestamp: new Date().toISOString(),
        received_at: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Heartbeat failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
    });
  }
}

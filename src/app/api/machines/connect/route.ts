import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    let data;

    try {
      data = await request.json();
    } catch (jsonError) {
      console.error("❌ JSON parsing failed in /api/machines/connect:", jsonError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { machine_id, machine_name, status, timestamp, ip_address } = data

    console.log('Machine connection received:', {
      machine_id,
      machine_name,
      status,
      timestamp,
      ip_address
    })

    return NextResponse.json({
      success: true,
      message: `Machine ${machine_id} ${status} successfully`,
      data: {
        machine_id,
        machine_name,
        status,
        timestamp: new Date().toISOString(),
        received_at: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
    });
  }
}


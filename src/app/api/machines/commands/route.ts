import { type NextRequest, NextResponse } from "next/server"

// In-memory command queue for machine commands
const commandQueue: { [machineId: string]: string[] } = {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machine_id = searchParams.get('machine_id')

    if (!machine_id) {
      return new Response(JSON.stringify({ error: 'machine_id is required' }), {
        status: 400,
      });
    }

    // Get the next command for this machine
    const commands = commandQueue[machine_id] || []
    const nextCommand = commands.shift() // Remove and return the first command

    if (nextCommand) {
      commandQueue[machine_id] = commands // Update the queue
      console.log(`Sending command to ${machine_id}:`, nextCommand)
    }

    return NextResponse.json({
      command: nextCommand || null,
      machine_id,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get commands';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { machine_id, command } = data

    if (!machine_id || !command) {
      return new Response(JSON.stringify({ error: 'machine_id and command are required' }), {
        status: 400,
      });
    }

    // Add command to the queue
    if (!commandQueue[machine_id]) {
      commandQueue[machine_id] = []
    }
    commandQueue[machine_id].push(command)

    console.log(`Command queued for ${machine_id}:`, command)

    return NextResponse.json({
      success: true,
      message: `Command queued for ${machine_id}`,
      command,
      queue_length: commandQueue[machine_id].length
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to queue command';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}

import { type NextRequest, NextResponse } from "next/server"

// Store current G-code job state for each machine
const machineStates: {
    [machineId: string]: {
        currentJob: string[] | null;
        currentLine: number;
        waitingForOk: boolean;
        jobId: string | null;
    }
} = {}

export async function POST(request: NextRequest) {
    try {
        let data;

        try {
            data = await request.json();
        } catch (jsonError) {
            console.error("❌ JSON parsing failed in /api/machines/send-gcode:", jsonError);
            return NextResponse.json(
                { success: false, error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { machine_id, action, gcode, job_id } = data

        if (!machine_id) {
            return new Response(JSON.stringify({ error: 'machine_id is required' }), {
                status: 400,
            });
        }

        // Initialize machine state if not exists
        if (!machineStates[machine_id]) {
            machineStates[machine_id] = {
                currentJob: null,
                currentLine: 0,
                waitingForOk: false,
                jobId: null
            }
        }

        const state = machineStates[machine_id]

        switch (action) {
            case 'start_job':
                if (!gcode || !job_id) {
                    return new Response(JSON.stringify({ error: 'gcode and job_id are required for start_job' }), {
                        status: 400,
                    });
                }

                // Split G-code into lines
                const lines = gcode.split('\n').filter((line: string) => line.trim() !== '')

                state.currentJob = lines
                state.currentLine = 0
                state.waitingForOk = false
                state.jobId = job_id

                console.log(`Starting G-code job ${job_id} for ${machine_id} with ${lines.length} lines`)

                return NextResponse.json({
                    success: true,
                    message: `G-code job ${job_id} started`,
                    total_lines: lines.length,
                    job_id
                })

            case 'get_next_line':
                if (!state.currentJob) {
                    return NextResponse.json({
                        success: false,
                        message: 'No active job',
                        line: null,
                        line_number: 0,
                        total_lines: 0,
                        completed: true
                    })
                }

                if (state.waitingForOk) {
                    return NextResponse.json({
                        success: false,
                        message: 'Waiting for OK response',
                        line: null,
                        waiting_for_ok: true
                    })
                }

                if (state.currentLine >= state.currentJob.length) {
                    // Job completed
                    state.currentJob = null
                    state.currentLine = 0
                    state.jobId = null

                    return NextResponse.json({
                        success: true,
                        message: 'Job completed',
                        line: null,
                        completed: true
                    })
                }

                const currentLine = state.currentJob[state.currentLine]
                state.waitingForOk = true

                console.log(`Sending line ${state.currentLine + 1}/${state.currentJob.length} to ${machine_id}: ${currentLine}`)

                return NextResponse.json({
                    success: true,
                    line: currentLine,
                    line_number: state.currentLine + 1,
                    total_lines: state.currentJob.length,
                    job_id: state.jobId,
                    waiting_for_ok: true
                })

            case 'confirm_ok':
                if (!state.waitingForOk) {
                    return NextResponse.json({
                        success: false,
                        message: 'Not waiting for OK response'
                    })
                }

                state.waitingForOk = false
                state.currentLine++

                console.log(`Received OK from ${machine_id}, advancing to line ${state.currentLine + 1}`)

                return NextResponse.json({
                    success: true,
                    message: 'OK received, ready for next line',
                    next_line_number: state.currentLine + 1,
                    total_lines: state.currentJob?.length || 0
                })

            case 'error':
                if (state.waitingForOk) {
                    state.waitingForOk = false
                    console.log(`Received error from ${machine_id}: ${data.error}`)
                }

                return NextResponse.json({
                    success: false,
                    message: 'GRBL Error received',
                    error: data.error || 'Unknown error',
                    line_number: state.currentLine,
                    total_lines: state.currentJob?.length || 0
                })

            case 'stop_job':
                state.currentJob = null
                state.currentLine = 0
                state.waitingForOk = false
                state.jobId = null

                console.log(`Stopping job for ${machine_id}`)

                return NextResponse.json({
                    success: true,
                    message: 'Job stopped'
                })

            case 'get_status':
                return NextResponse.json({
                    success: true,
                    machine_id,
                    job_id: state.jobId,
                    current_line: state.currentLine,
                    total_lines: state.currentJob?.length || 0,
                    waiting_for_ok: state.waitingForOk,
                    has_active_job: state.currentJob !== null
                })

            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), {
                    status: 400,
                });
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to process G-code';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
        });
    }
}

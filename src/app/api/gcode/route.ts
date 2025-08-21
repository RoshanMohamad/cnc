import { type NextRequest, NextResponse } from "next/server";

// HTTP-to-WebSocket G-code sender (fixes bufferUtil.mask error)
// Instead of direct WebSocket connection, we use HTTP to communicate with WebSocket server
interface GcodeResponse {
  response: string;
  execution_time_ms?: number;
  timestamp: string;
  error?: string;
}

interface GcodeSendResult {
  line: number;
  gcode: string;
  status: 'success' | 'error';
  response?: string;
  execution_time_ms?: number;
  timestamp: string;
  error?: string;
}

interface GcodeSummary {
  total_lines: number;
  successful: number;
  failed: number;
  time_ms: number;
  mode: 'sequential' | 'batch';
}

// Real WebSocket G-code sender inspired by WebSocketExporter
class GcodeWebSocketSender {
  private ws: WebSocket | null = null;
  private currentLineIndex = 0;
  private linesPending: string[] = [];
  private results: GcodeSendResult[] = [];
  private handshakeSent = false;
  private readyToSend = false;
  private isHoming = false;
  private retryCount = 0;
  private maxRetries = 5;
  private jobId = '';
  private machineId = '';
  private startTime = 0;

  // Timeout prevention
  private lastCommandTime: number | null = null;
  private commandTimeout = 12000; // 12 seconds before timeout
  private pingInterval: NodeJS.Timeout | null = null;

  // Promise resolution
  private resolveTransmission: ((result: { success: boolean, results: GcodeSendResult[], summary: GcodeSummary }) => void) | null = null;
  private rejectTransmission: ((error: Error) => void) | null = null;

  constructor() {
    // Import WebSocket in Node.js environment
    if (typeof WebSocket === 'undefined') {
      // We'll use the existing WebSocket server HTTP interface instead
      console.log('📡 Using HTTP-to-WebSocket bridge for G-code transmission');
    }
  }

  // Start timeout monitoring like WebSocketExporter
  private startTimeoutMonitoring() {
    this.lastCommandTime = Date.now();

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.lastCommandTime && this.readyToSend) {
        const timeSinceLastCommand = Date.now() - this.lastCommandTime;

        if (timeSinceLastCommand >= this.commandTimeout) {
          console.log(`⏰ ${timeSinceLastCommand}ms since last command, sending ping to prevent timeout...`);
          this.sendHttpGcodeLine(';ping', 0).catch(console.error);
          this.lastCommandTime = Date.now();
        }
      }
    }, 2000);
  }

  private stopTimeoutMonitoring() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastCommandTime = null;
  }

  private updateCommandTime() {
    this.lastCommandTime = Date.now();
  }

  // Send G-code via HTTP to WebSocket server (since direct WebSocket from API route is complex)
  private async sendHttpGcodeLine(gcode: string, lineNumber: number): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8081/send-gcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: this.machineId,
          gcode,
          lineNumber,
          jobId: this.jobId,
          timestamp: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        console.log(`📤 Sent to ESP32 via WebSocket: ${gcode} (Line ${lineNumber})`);
        return true;
      } else {
        console.error(`❌ HTTP send failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('HTTP send error:', error);
      return false;
    }
  }

  // Real-time WebSocket message handling with faster polling
  private async waitForResponse(lineNumber: number, timeout = 10000): Promise<GcodeResponse> {
    const startTime = Date.now();
    const pollInterval = 100; // Poll every 100ms for faster response

    console.log(`⏳ Waiting for Arduino OK response for line ${lineNumber}...`);

    while (Date.now() - startTime < timeout) {
      try {
        // Check for response from WebSocket server
        const response = await fetch(`http://localhost:8081/check-gcode-status?machineId=${this.machineId}&lineNumber=${lineNumber}&jobId=${this.jobId}`, {
          signal: AbortSignal.timeout(500) // Faster timeout per poll
        });

        if (response.ok) {
          const data = await response.json();

          if (data.completed && data.response) {
            const executionTime = Date.now() - startTime;
            console.log(`📥 Arduino OK response for line ${lineNumber}: ${data.response} (${executionTime}ms)`);

            // Handle different response types like WebSocketExporter
            const responseStr = data.response.toLowerCase().trim();

            if (responseStr === 'ok') {
              return {
                response: 'OK',
                execution_time_ms: executionTime,
                timestamp: data.timestamp || new Date().toISOString()
              };
            } else if (responseStr.startsWith('error:')) {
              throw new Error(`Arduino GRBL Error: ${responseStr.substring(6)}`);
            } else if (responseStr.startsWith('alarm:')) {
              throw new Error(`Arduino GRBL Alarm: ${responseStr.substring(6)}`);
            } else if (responseStr.startsWith('<') && responseStr.endsWith('>')) {
              // Handle GRBL status messages like <Hold,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000>
              console.log(`📊 GRBL Status: ${responseStr}`);

              const statusMatch = responseStr.match(/<([^,]+)/);
              const machineStatus = statusMatch ? statusMatch[1] : 'Unknown';

              if (machineStatus === 'Hold') {
                console.log(`⏸️  GRBL is in HOLD state - sending resume command (~)`);
                // Send resume command to continue operation
                await this.sendHttpGcodeLine('~', 0);
                // Continue waiting for OK response
                continue;
              } else if (machineStatus === 'Alarm') {
                throw new Error('GRBL Alarm state detected - check machine safety');
              } else if (machineStatus === 'Door') {
                throw new Error('GRBL Door state - safety door is open');
              }

              // For Idle, Run, Jog states, continue waiting for OK
              console.log(`📍 GRBL Status: ${machineStatus}`);
              continue;
            } else if (responseStr === 'busy') {
              // Handle busy response with retry logic
              this.retryCount++;
              if (this.retryCount > this.maxRetries) {
                throw new Error('Arduino too busy - max retries exceeded');
              }

              console.log(`⏳ Arduino busy, retry ${this.retryCount}/${this.maxRetries}`);

              // Exponential backoff
              const retryDelay = Math.min(1000 * this.retryCount, 5000);
              await new Promise(resolve => setTimeout(resolve, retryDelay));

              // Retry the same line
              const sent = await this.sendHttpGcodeLine(this.linesPending[lineNumber - 1], lineNumber);
              if (!sent) {
                throw new Error('Failed to retry G-code line');
              }

              // Continue waiting
              continue;
            }
          }
        }

        // Wait before next poll (100ms for real-time feel)
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          // Timeout on this poll, continue to next iteration
          continue;
        }
        // Re-throw other errors
        throw fetchError;
      }
    }

    // If we get here, we timed out
    throw new Error(`Timeout waiting for Arduino OK response (line ${lineNumber})`);
  }

  private async sendNextLine(): Promise<void> {
    if (this.currentLineIndex >= this.linesPending.length) {
      console.log("✅ All G-code lines sent successfully. Arduino motion complete!");
      this.completeTransmission(true);
      return;
    }

    const line = this.linesPending[this.currentLineIndex];
    const lineNumber = this.currentLineIndex + 1;

    try {
      console.log(`📤 Sending line ${lineNumber}/${this.linesPending.length}: ${line}`);
      console.log(`🎯 Current movement: ${line} → ESP32 → Arduino`);

      // Send the G-code line
      const sent = await this.sendHttpGcodeLine(line, lineNumber);
      if (!sent) {
        throw new Error('Failed to send G-code via HTTP');
      }

      this.updateCommandTime();

      // Wait for Arduino OK response (REAL-TIME BLOCKING)
      const response = await this.waitForResponse(lineNumber);

      // Success - add to results
      this.results.push({
        line: lineNumber,
        gcode: line,
        status: 'success',
        response: response.response,
        execution_time_ms: response.execution_time_ms,
        timestamp: response.timestamp
      });

      console.log(`✅ Line ${lineNumber} Arduino OK: ${response.response} (${response.execution_time_ms}ms)`);
      console.log(`🔄 Movement completed, sending next line...`);

      this.retryCount = 0; // Reset retry count on success
      this.currentLineIndex++;

      // Send next line immediately (NO delay for real-time)
      setTimeout(() => this.sendNextLine(), 50); // Minimal 50ms delay

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.results.push({
        line: lineNumber,
        gcode: line,
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      console.error(`❌ Line ${lineNumber} Arduino error: ${errorMessage}`);
      console.error(`🛑 Stopping all movement for safety!`);

      // Stop on error for safety
      this.completeTransmission(false);
    }
  } private completeTransmission(isSuccess: boolean) {
    this.stopTimeoutMonitoring();

    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'error').length;

    const summary: GcodeSummary = {
      total_lines: this.linesPending.length,
      successful,
      failed,
      time_ms: totalTime,
      mode: 'sequential'
    };

    console.log(`🏁 G-code transmission completed:`, summary);

    if (this.resolveTransmission) {
      this.resolveTransmission({
        success: successful > 0 && isSuccess,
        results: this.results,
        summary
      });
    }
  }

  async sendGcodeLines(machineId: string, lines: string[]): Promise<{ success: boolean, results: GcodeSendResult[], summary: GcodeSummary }> {
    // Reset state completely like WebSocketExporter
    this.stopTimeoutMonitoring();
    this.machineId = machineId;
    this.jobId = `job-${Date.now()}`;
    this.linesPending = [...lines]; // Clone to avoid reference issues
    this.currentLineIndex = 0;
    this.results = [];
    this.handshakeSent = false;
    this.readyToSend = true; // We skip handshake for HTTP bridge
    this.isHoming = false;
    this.retryCount = 0;
    this.startTime = Date.now();

    console.log(`🎯 Starting WebSocket G-code transmission (${lines.length} lines)`);
    console.log(`📋 Job ID: ${this.jobId}, Machine: ${machineId}`);

    return new Promise(async (resolve, reject) => {
      this.resolveTransmission = resolve;
      this.rejectTransmission = reject;

      try {
        // Initialize GRBL state before sending G-code
        await this.initializeGRBL();

        // Start timeout monitoring and begin transmission
        this.startTimeoutMonitoring();
        this.sendNextLine().catch(reject);

        // Set overall timeout for the entire job
        setTimeout(() => {
          if (this.resolveTransmission) {
            this.completeTransmission(false);
            reject(new Error('Overall transmission timeout'));
          }
        }, 300000); // 5 minute total timeout

      } catch (error) {
        reject(error);
      }
    });
  }

  // Initialize GRBL to proper state
  private async initializeGRBL(): Promise<void> {
    console.log('🔧 Initializing GRBL state...');

    try {
      // Send soft reset to clear any errors
      console.log('🔄 Sending GRBL soft reset...');
      await this.sendHttpGcodeLine('\x18', 0); // Ctrl+X soft reset
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for reset

      // Check status and resume if in hold
      console.log('▶️  Sending resume command to clear HOLD state...');
      await this.sendHttpGcodeLine('~', 0); // Resume command
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear any alarms with unlock command
      console.log('🔓 Sending unlock command...');
      await this.sendHttpGcodeLine('$X', 0); // Unlock command
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set to metric units
      console.log('📏 Setting units to millimeters...');
      await this.sendHttpGcodeLine('G21', 0); // Metric units
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set absolute positioning
      console.log('🎯 Setting absolute positioning...');
      await this.sendHttpGcodeLine('G90', 0); // Absolute positioning
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ GRBL initialization complete');

    } catch (error) {
      console.error('❌ GRBL initialization failed:', error);
      // Don't throw error, continue with G-code transmission
    }
  }

  disconnect() {
    this.stopTimeoutMonitoring();
    this.readyToSend = false;
    console.log('🧹 WebSocket G-code sender disconnected');
  }
}

// types/gcode.ts
export interface GcodeRequest {
  machineId: string;
  pieceType: 'text' | 'front' | 'back' | 'sleeve';
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
  pieceType: 'text' | 'front' | 'back' | 'sleeve';
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
  console.log("🚀 G-code API POST request received");

  try {
    let body: GcodeRequest;

    try {
      body = await request.json();
      console.log("📋 Request body:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("❌ JSON parsing failed:", jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    console.log("🎯 Mode: SEQUENTIAL ONLY (line-by-line with OK waiting) - FORCED FOR SAFETY");

    // Validate required fields
    if (!body.machineId) {
      console.log("❌ Missing machineId");
      return NextResponse.json(
        { error: "machineId is required" },
        { status: 400 }
      );
    }

    if (!body.pieceType) {
      console.log("❌ Missing pieceType");
      return NextResponse.json(
        { error: "pieceType is required" },
        { status: 400 }
      );
    }

    console.log("✅ Validation passed, generating G-code...");

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

    // Process G-code lines
    const lines = gcode
      .split('\n')
      .map(line => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith(';'));

    console.log("Generated G-code lines:", lines);
    console.log(`✅ Generated ${lines.length} lines of G-code for ${body.pieceType} piece`);

    // Always use sequential mode with OK-response waiting
    console.log(`🤝 Starting WebSocket G-code transmission to ${body.machineId}`);

    const gcodeWebSocketSender = new GcodeWebSocketSender();

    try {
      const transmissionResult = await gcodeWebSocketSender.sendGcodeLines(
        body.machineId,
        lines // Always sequential with OK waiting
      );

      console.log(`✅ WebSocket transmission completed:`, transmissionResult.summary);

      return NextResponse.json({
        success: transmissionResult.success,
        mode: "websocket-sequential",
        results: transmissionResult.results,
        summary: transmissionResult.summary,
        machine_id: body.machineId,
        gcode_preview: lines.slice(0, 5),
        timestamp: new Date().toISOString(),
        note: "✨ WEBSOCKET MODE - Real ESP32 OK responses with timeout handling!"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'WebSocket transmission failed';
      console.error(`❌ WebSocket transmission error:`, errorMessage);

      return NextResponse.json({
        success: false,
        mode: "websocket-sequential",
        error: errorMessage,
        machine_id: body.machineId,
        timestamp: new Date().toISOString()
      }, { status: 500 });

    } finally {
      // Clean up WebSocket connection
      gcodeWebSocketSender.disconnect();
    }

  } catch (error: unknown) {
    console.error("❌ G-code processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for diagnostics and testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const machineId = searchParams.get('machineId');

  if (action === 'test' && machineId) {
    console.log(`🔍 Testing WebSocket connectivity to ${machineId}...`);

    const gcodeWebSocketSender = new GcodeWebSocketSender();

    try {
      // Test WebSocket connection by sending a simple G21 command
      const transmissionResult = await gcodeWebSocketSender.sendGcodeLines(
        machineId,
        ['G21'] // Simple G21 command as test
      ); return NextResponse.json({
        success: transmissionResult.success,
        message: transmissionResult.success
          ? `WebSocket connection to ${machineId} successful! ESP32 OK response received.`
          : `WebSocket connection failed`,
        timestamp: new Date().toISOString(),
        machine_id: machineId,
        test_command: 'G21',
        results: transmissionResult.results,
        summary: transmissionResult.summary,
        diagnostics: {
          websocket_server: "ws://localhost:8081",
          connection_test: transmissionResult.success ? "✅ PASSED" : "❌ FAILED",
          ok_response_waiting: "✅ ENABLED"
        }
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    } finally {
      gcodeWebSocketSender.disconnect();
    }
  }

  // Default GET response
  return NextResponse.json({
    message: "G-code API v5.0 - WEBSOCKET MODE! ✨",
    version: "5.0",
    websocket_server: "ws://localhost:8081",
    features: [
      "✅ WEBSOCKET MODE - Real ESP32 OK responses with timeout handling",
      "✅ Line-by-line G-code transmission with retry logic",
      "✅ Timeout prevention with ping system",
      "✅ Real-time execution timing feedback",
      "✅ Exponential backoff on busy responses",
      "✅ GRBL alarm and error handling",
      "✅ Stops immediately on first error for safety"
    ],
    endpoints: {
      "POST /api/gcode": "Send G-code via WebSocket (line-by-line with OK waiting)",
      "GET /api/gcode?action=test&machineId=ID": "Test WebSocket connectivity with machine"
    },
    examples: {
      "WebSocket_test": "GET /api/gcode?action=test&machineId=cnc-01",
      "WebSocket_gcode": "POST /api/gcode (WebSocket mode with real ESP32 responses)"
    },
    safety_note: "🔒 WEBSOCKET MODE with real ESP32 communication and timeout handling"
  });
}



function generateTshirtGcode(data: TShirtSpecs): string {
  const {
    pieceType,
    // packetSize is not used in this function but kept for consistency
  } = data;

  const m = 1;

  const frontGcodeContent: string = `G21
F500
G92 X0 Y0 Z0
G1 Z0
G1 X5 Y5
M3 S10
G1 Z${m}
G1 X5 Y35
G1 Z0
M3 S20
G1 Z${m}
G3 X9 Y45 R38
G1 Z0
M3 S15
G1 Z${m}
G3 X10 Y55 R35
G1 Z0
M3 S55
G1 Z${m}
G1 X15 Y55
G1 Z0
M3 S60
G1 Z${m}
G3 X20 Y54 R8
G1 Z0
M3 S45
G1 Z${m}
G3 X25 Y55 R8
G1 Z0
M3 S55
G1 Z${m}
G1 X30 Y55
G1 Z0
M3 S90
G1 Z${m}
G3 X31 Y45 R35
G1 Z0
M3 S80
G1 Z${m}
G3 X35 Y35 R35
G1 Z0
M3 S10
G1 Z${m}
G1 X35 Y5
G1 Z0
M3 S55
G1 Z${m}
G1 X5 Y5
G1 Z0
G1 X0 Y0 Z0`;

  const backGcodeContent: string = `
G21
G90
G92 X0 Y0 Z0
F1000
G0 Z5
G0 X5 Y5
G1 Z-${m} F500
G1 X35 Y5 F1000
G1 X35 Y40 F1000
G2 X25 Y55 I-10 J0 F800
G1 X15 Y55 F1000
G2 X5 Y40 I0 J-15 F800
G1 X5 Y5 F1000
G0 Z5
G0 X0 Y0`;

  const sleeveGcodeContent: string = `
G21
G90
G92 X0 Y0 Z0
F1000
G0 Z5
G0 X10 Y10
G1 Z-${m} F500
G1 X20 Y10 F1000
G1 X20 Y20 F1000
G1 X5 Y20 F1000
G2 X10 Y10 I5 J-10 F800
G0 Z5
G0 X0 Y0`;

  const textGcodeContent: string = `
G21
G90
G92 X0 Y0 Z0
F1000
G0 Z5
G0 X10 Y10
G1 Z-${m} F500
G1 X20 Y10 F1000
G1 X20 Y15 F1000
G1 X10 Y15 F1000
G1 X10 Y10 F1000
G0 Z5
G0 X0 Y0`;

  // Return the appropriate G-code based on piece type
  switch (pieceType) {
    case 'text':
      return textGcodeContent;
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
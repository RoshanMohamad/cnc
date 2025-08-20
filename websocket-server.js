#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import http from 'http';

// Create HTTP server
const server = http.createServer();
const wss = new WebSocketServer({ server });

// Store connected clients and machines
const clients = new Map();

// G-code job status tracking for sequential execution
const gcodeJobStatus = new Map(); // jobId -> { machineId, lineNumber, response, completed, timestamp }

// Machine status tracking with IP address mapping
const machineStatus = {
  'cnc-01': { id: 'cnc-01', name: 'CNC Router 01', status: 'offline', lastSeen: new Date(), type: 'cnc', esp32Connected: false, ipAddress: '192.168.8.121' },
  'plasma-01': { id: 'plasma-01', name: 'Plasma Cutter 01', status: 'offline', lastSeen: new Date(), type: 'plasma', esp32Connected: false, ipAddress: '192.168.8.122' },
  'laser-01': { id: 'laser-01', name: 'Laser Engraver 01', status: 'offline', lastSeen: new Date(), type: 'laser', esp32Connected: false, ipAddress: '192.168.8.123' }
};

// Create IP to machine ID mapping for easy lookup
const ipToMachineId = {};
Object.values(machineStatus).forEach(machine => {
  if (machine.ipAddress) {
    ipToMachineId[machine.ipAddress] = machine.id;
  }
});

// Broadcast message to all connected clients
// (Removed unused broadcast function)

// Broadcast message to specific client type
function broadcastToType(message, clientType) {
  const data = JSON.stringify(message);
  clients.forEach((client, ws) => {
    if (client.type === clientType && ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
}

// Update machine status and broadcast
function updateMachineStatus(machineId, updates) {
  if (machineStatus[machineId]) {
    machineStatus[machineId] = {
      ...machineStatus[machineId],
      ...updates,
      lastSeen: new Date()
    };

    // Broadcast updated status to all web clients
    broadcastToType({
      type: 'machine_status_update',
      data: {
        machineId,
        status: machineStatus[machineId]
      }
    }, 'web');

    console.log(`📡 Machine ${machineId} status updated:`, machineStatus[machineId].status);
  }
}

// Auto-offline machines that haven't been seen for 30 seconds
setInterval(() => {
  const now = new Date();
  Object.keys(machineStatus).forEach(machineId => {
    const machine = machineStatus[machineId];
    const timeSinceLastSeen = now.getTime() - machine.lastSeen.getTime();
    
    if (timeSinceLastSeen > 30000 && machine.status !== 'offline') {
      console.log(`⏰ Machine ${machine.name} offline due to timeout`);
      updateMachineStatus(machineId, {
        status: 'offline',
        esp32Connected: false
      });
    }
  });
}, 5000);

wss.on('connection', function connection(ws, request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const clientType = url.searchParams.get('type') || 'web';
  const clientId = url.searchParams.get('id') || `client-${Date.now()}`;

  // Store client info
  clients.set(ws, { id: clientId, type: clientType, connectedAt: new Date() });

  console.log(`🔌 New ${clientType} client connected: ${clientId}`);
  console.log(`👥 Total clients: ${clients.size}`);

  // Send current machine status to new web clients
  if (clientType === 'web') {
    ws.send(JSON.stringify({
      type: 'initial_machine_status',
      data: machineStatus
    }));
  }

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: {
      clientId,
      clientType,
      timestamp: new Date().toISOString(),
      message: `Connected to CNC WebSocket Server as ${clientType}`
    }
  }));

  ws.on('message', function message(data) {
    try {
      const parsed = JSON.parse(data.toString());
      const { type, data: messageData } = parsed;

      console.log(`📨 Message from ${clientId} (${clientType}):`, type);

      switch (type) {
        case 'machine_heartbeat':
          // Handle ESP32 heartbeat
          if (clientType === 'esp32' && messageData.machine_id) {
            updateMachineStatus(messageData.machine_id, {
              status: messageData.status || 'online',
              esp32Connected: true
            });
          }
          break;

        case 'machine_connection':
          // Handle machine connection updates
          if (messageData.machine_id) {
            updateMachineStatus(messageData.machine_id, {
              status: messageData.status,
              esp32Connected: messageData.status === 'connected' || messageData.status === 'online'
            });
          }
          break;

        case 'gcode_progress':
          // Broadcast G-code progress to web clients
          broadcastToType({
            type: 'gcode_progress',
            data: messageData
          }, 'web');
          break;

        case 'gcode_response':
          // Broadcast G-code OK/ERROR responses to web clients
          console.log(`📥 G-code response from ${clientId}: ${messageData.response} (Line ${messageData.line_number || 'N/A'})`);
          
          // Track the response for sequential execution
          if (messageData.jobId && messageData.line_number) {
            const statusKey = `${messageData.jobId}-${messageData.line_number}`;
            gcodeJobStatus.set(statusKey, {
              machineId: clientId,
              lineNumber: messageData.line_number,
              response: messageData.response,
              completed: true,
              timestamp: new Date().toISOString(),
              jobId: messageData.jobId
            });
            
            // Clean up old entries after 60 seconds
            setTimeout(() => {
              gcodeJobStatus.delete(statusKey);
            }, 60000);
          }
          
          broadcastToType({
            type: 'gcode_response',
            data: messageData
          }, 'web');
          break;

        case 'gcode_send':
          // Handle G-code sending from web clients
          if (clientType === 'web' && messageData.machineId && messageData.gcode) {
            // Find ESP32 client for the target machine
            let targetESP32 = null;
            clients.forEach((client, clientWs) => {
              if (client.type === 'esp32' && client.id === messageData.machineId) {
                targetESP32 = clientWs;
              }
            });

            if (targetESP32 && targetESP32.readyState === targetESP32.OPEN) {
              targetESP32.send(JSON.stringify({
                type: 'gcode_command',
                data: {
                  gcode: messageData.gcode,
                  lineNumber: messageData.lineNumber || 0,
                  jobId: messageData.jobId || 'job-' + Date.now()
                }
              }));
              
              // Send confirmation to web client
              ws.send(JSON.stringify({
                type: 'gcode_sent',
                data: {
                  success: true,
                  message: `G-code sent to ${messageData.machineId}`
                }
              }));
            } else {
              // ESP32 not connected
              ws.send(JSON.stringify({
                type: 'gcode_error',
                data: {
                  success: false,
                  error: `ESP32 ${messageData.machineId} not connected`
                }
              }));
            }
          }
          break;

        case 'ping':
          // Handle ping requests
          ws.send(JSON.stringify({
            type: 'pong',
            data: { timestamp: new Date().toISOString() }
          }));
          break;

        case 'health_check':
          // Handle health check requests
          ws.send(JSON.stringify({
            type: 'health_check_response',
            data: { 
              timestamp: new Date().toISOString(),
              server_status: 'healthy',
              connected_machines: Object.values(machineStatus).filter(m => m.status === 'online').length
            }
          }));
          break;

        case 'disconnect':
          // Handle graceful disconnect
          console.log(`👋 Client ${clientId} requesting graceful disconnect:`, message.data?.reason || 'no reason');
          ws.close(1000, 'graceful_disconnect');
          break;

        default:
          console.log(`❓ Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
      console.error('Raw message data:', data.toString());
      console.error('Client info:', { clientId, clientType });
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  });

  ws.on('close', function close() {
    console.log(`❌ Client ${clientId} (${clientType}) disconnected`);
    clients.delete(ws);
    console.log(`👥 Remaining clients: ${clients.size}`);

    // If it was an ESP32, mark corresponding machine as offline
    if (clientType === 'esp32') {
      updateMachineStatus(clientId, {
        status: 'offline',
        esp32Connected: false
      });
    }
  });

  ws.on('error', function error(err) {
    console.error(`❌ WebSocket error for client ${clientId}:`, err);
  });
});

// Server statistics and G-code endpoint via HTTP
server.on('request', (req, res) => {
  try {
    console.log(`🌐 HTTP request: ${req.method} ${req.url}`);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders);
      res.end();
      return;
    }

    if (req.url === '/stats' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        connectedClients: clients.size,
        machineStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }, null, 2));
      
    } else if (req.url?.startsWith('/check-gcode-status') && req.method === 'GET') {
      // Handle G-code status checking for sequential execution
      const url = new URL(req.url, `http://${req.headers.host}`);
      const machineId = url.searchParams.get('machineId');
      const lineNumber = url.searchParams.get('lineNumber');
      const jobId = url.searchParams.get('jobId');
      
      if (!machineId || !lineNumber || !jobId) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({
          error: 'machineId, lineNumber, and jobId are required'
        }));
        return;
      }
      
      const statusKey = `${jobId}-${lineNumber}`;
      const status = gcodeJobStatus.get(statusKey);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        completed: status ? status.completed : false,
        response: status ? status.response : null,
        timestamp: status ? status.timestamp : null,
        machineId: status ? status.machineId : machineId,
        lineNumber: parseInt(lineNumber),
        jobId: jobId
      }));
      
    } else if (req.url === '/send-gcode' && req.method === 'POST') {
      // Handle G-code sending via HTTP
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { machineId, gcode, lineNumber, jobId, timestamp } = JSON.parse(body);
          
          if (!machineId || !gcode) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({
              success: false,
              error: 'machineId and gcode are required'
            }));
            return;
          }

          console.log(`🎯 HTTP G-code request for machine: ${machineId} (Job: ${jobId}, Line: ${lineNumber})`);
          console.log(`📝 G-code: ${gcode.substring(0, 100)}${gcode.length > 100 ? '...' : ''}`);

          // Handle IP address to machine ID mapping
          let actualMachineId = machineId;
          if (ipToMachineId[machineId]) {
            actualMachineId = ipToMachineId[machineId];
            console.log(`🔄 Mapped IP ${machineId} to machine ID: ${actualMachineId}`);
          }

          // Find ESP32 client for the target machine
          let targetESP32 = null;
          clients.forEach((client, clientWs) => {
            if (client.type === 'esp32' && client.id === actualMachineId) {
              targetESP32 = clientWs;
            }
          });

          if (targetESP32 && targetESP32.readyState === targetESP32.OPEN) {
            // Send G-code to ESP32
            targetESP32.send(JSON.stringify({
              type: 'gcode_command',
              data: {
                gcode: gcode,
                lineNumber: lineNumber || 0,
                jobId: jobId || 'http-job-' + Date.now(),
                timestamp: timestamp || new Date().toISOString()
              }
            }));
            
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              success: true,
              message: `G-code sent to ${actualMachineId} (${machineId})`,
              jobId: jobId,
              lineNumber: lineNumber,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`✅ G-code successfully sent to ${actualMachineId} (IP: ${machineId}) via HTTP`);
            
          } else {
            res.writeHead(503, corsHeaders);
            res.end(JSON.stringify({
              success: false,
              error: `ESP32 ${actualMachineId} (${machineId}) not connected or not ready`,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`❌ ESP32 ${actualMachineId} (IP: ${machineId}) not available for G-code transmission`);
          }
          
        } catch (error) {
          console.error('❌ JSON parsing error:', error);
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body'
          }));
        }
      });

      req.on('error', (error) => {
        console.error('❌ HTTP request error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          success: false,
          error: 'Request processing error'
        }));
      });

    } else {
      res.writeHead(404, corsHeaders);
      res.end(JSON.stringify({
        message: 'WebSocket Server',
        endpoints: {
          '/stats': 'GET - Server statistics',
          '/send-gcode': 'POST - Send G-code to machine'
        }
      }));
    }
  } catch (error) {
    console.error('❌ HTTP request error:', error);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = process.env.WEBSOCKET_PORT || 8081;

server.listen(PORT, function listening() {
  console.log('🚀 CNC WebSocket Server started');
  console.log(`📡 WebSocket listening on ws://localhost:${PORT}`);
  console.log(`📊 HTTP stats available at http://localhost:${PORT}/stats`);
  console.log('🔧 Ready for CNC machine connections...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down WebSocket server...');
  server.close();
});

process.on('SIGINT', () => {
  console.log('📴 Shutting down WebSocket server...');
  server.close();
});

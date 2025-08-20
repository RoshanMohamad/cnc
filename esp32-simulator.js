#!/usr/bin/env node

import WebSocket from 'ws';

const WEBSOCKET_URL = 'ws://127.0.0.1:8081';
const MACHINE_ID = 'cnc-01';
const MACHINE_NAME = 'CNC Router 01';

console.log('🤖 ESP32 Simulator Starting...');
console.log(`📡 Connecting to: ${WEBSOCKET_URL}`);

const ws = new WebSocket(`${WEBSOCKET_URL}?type=esp32&id=${MACHINE_ID}`);

ws.on('open', () => {
  console.log('✅ WebSocket connected as ESP32');
  
  // Send initial connection message
  const connectionMessage = {
    type: 'machine_connection',
    data: {
      machine_id: MACHINE_ID,
      machine_name: MACHINE_NAME,
      status: 'connected',
      timestamp: Date.now(),
      ip_address: '192.168.8.123'
    }
  };
  
  ws.send(JSON.stringify(connectionMessage));
  console.log('📤 Sent connection message');
  
  // Send periodic heartbeat every 5 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const heartbeat = {
        type: 'machine_heartbeat',
        data: {
          machine_id: MACHINE_ID,
          machine_name: MACHINE_NAME,
          status: 'online',
          timestamp: Date.now(),
          free_heap: Math.floor(Math.random() * 100000) + 200000,
          wifi_rssi: Math.floor(Math.random() * 40) - 80
        }
      };
      
      ws.send(JSON.stringify(heartbeat));
      console.log('💓 Sent heartbeat');
    }
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received:', message.type);
    
    if (message.type === 'gcode_command') {
      const { gcode, lineNumber, jobId } = message.data;
      console.log(`🎯 G-code command: ${gcode} (Line ${lineNumber || 'N/A'}, Job: ${jobId || 'N/A'})`);
      
      // Simulate G-code execution with proper responses
      setTimeout(() => {
        // 1. Send immediate "received" acknowledgment
        const progressReceived = {
          type: 'gcode_progress',
          data: {
            machine_id: MACHINE_ID,
            gcode,
            line_number: lineNumber,
            status: 'received',
            response: 'RECEIVED',
            timestamp: Date.now(),
            jobId
          }
        };
        ws.send(JSON.stringify(progressReceived));
        
        // Simulate execution time (1-3 seconds)
        setTimeout(() => {
          // 2. Send "OK" response (what you're looking for!)
          const okResponse = {
            type: 'gcode_response',
            data: {
              machine_id: MACHINE_ID,
              gcode,
              line_number: lineNumber,
              status: 'ok',
              response: 'OK',
              timestamp: Date.now(),
              jobId,
              execution_time_ms: 1000 + Math.random() * 2000
            }
          };
          ws.send(JSON.stringify(okResponse));
          console.log(`✅ G-code line ${lineNumber || 'N/A'} -> OK (Job: ${jobId})`);
          
          // 3. Send final progress update - completed
          const progressCompleted = {
            type: 'gcode_progress',
            data: {
              machine_id: MACHINE_ID,
              gcode,
              line_number: lineNumber,
              status: 'completed',
              response: 'COMPLETED',
              timestamp: Date.now(),
              jobId
            }
          };
          ws.send(JSON.stringify(progressCompleted));
          console.log(`🏁 G-code line ${lineNumber || 'N/A'} completed (Job: ${jobId})`);
          
        }, 1000 + Math.random() * 2000); // 1-3 second execution time
        
      }, 100);
    }
    
    if (message.type === 'ping') {
      // Respond with pong
      const pong = {
        type: 'pong',
        data: {
          timestamp: Date.now(),
          machine_id: MACHINE_ID
        }
      };
      ws.send(JSON.stringify(pong));
      console.log('🏓 Sent pong');
    }
    
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('❌ WebSocket disconnected');
  process.exit(1);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down ESP32 simulator...');
  ws.close();
  process.exit(0);
});

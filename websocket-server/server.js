
// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

console.log('🚀 CNC WebSocket Server starting...');

// Store connected clients
const clients = new Set();

wss.on('connection', function connection(ws, req) {
  console.log('🔌 New client connected from:', req.socket.remoteAddress);
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'cnc_status',
    data: { message: 'Connected to CNC Pro Studio WebSocket Server' },
    timestamp: Date.now()
  }));

  // Handle incoming messages
  ws.on('message', function incoming(data) {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message);

      // Handle different message types
      switch (message.type) {
        case 'heartbeat':
          ws.send(JSON.stringify({
            type: 'heartbeat',
            data: { pong: true },
            timestamp: Date.now()
          }));
          break;

        case 'machine_connect':
          // Broadcast machine status to all clients
          broadcast({
            type: 'machine_connect',
            machineId: message.machineId,
            data: message.data,
            timestamp: Date.now()
          });
          break;

        case 'gcode_progress':
          // Broadcast G-code progress to all clients
          broadcast({
            type: 'gcode_progress',
            machineId: message.machineId,
            data: message.data,
            timestamp: Date.now()
          });
          break;

        default:
          console.log('🤷 Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', function close() {
    console.log('🔌 Client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err);
    clients.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
  console.log('📡 Broadcasted message to', clients.size, 'clients:', message);
}

// Demo: Send periodic G-code progress updates
setInterval(() => {
  if (clients.size > 0) {
    const progress = Math.floor(Math.random() * 100);
    const status = progress < 100 ? 'cutting' : 'completed';
    
    broadcast({
      type: 'gcode_progress',
      machineId: 'cnc-router-01',
      data: {
        progress: progress,
        status: status
      },
      timestamp: Date.now()
    });
  }
}, 5000); // Every 5 seconds

// Demo: Send periodic machine status updates
setInterval(() => {
  if (clients.size > 0) {
    const machines = ['cnc-router-01', 'plasma-cutter-01', 'laser-engraver-01'];
    const statuses = ['connected', 'disconnected'];
    
    const randomMachine = machines[Math.floor(Math.random() * machines.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    broadcast({
      type: 'machine_connect',
      machineId: randomMachine,
      data: { status: randomStatus },
      timestamp: Date.now()
    });
  }
}, 10000); // Every 10 seconds

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🎯 CNC WebSocket Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log('🔄 Demo mode: Sending periodic updates every 5-10 seconds');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

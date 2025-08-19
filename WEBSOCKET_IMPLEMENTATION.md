# WebSocket Implementation Guide

## 🚀 Overview

Your CNC application has been successfully upgraded with **WebSocket real-time communication**! This eliminates polling and provides instant bidirectional communication between the web app, server, and ESP32 devices.

## ✨ New Features

### 🔄 Real-time Communication
- **Instant machine status updates** - No more 5-second polling delays
- **Live G-code progress tracking** - Line-by-line execution status
- **Bidirectional messaging** - Server and clients can initiate communication
- **Automatic reconnection** - Handles connection drops gracefully
- **WebSocket heartbeat** - Keeps connections alive

### 🎯 WebSocket Message Types

#### From ESP32 → Server:
- `machine_connection` - ESP32 connects/disconnects
- `machine_heartbeat` - Periodic status updates (every 5 seconds)
- `gcode_progress` - G-code execution progress updates
- `pong` - Response to ping messages

#### From Web App → Server:
- `gcode_send` - Send G-code to specific machine
- `ping` - Connection health check

#### From Server → Clients:
- `initial_machine_status` - Current status of all machines
- `machine_status_update` - Real-time status changes
- `gcode_sent` - Confirmation of G-code transmission
- `gcode_error` - G-code transmission errors
- `connection_established` - Welcome message

## 🛠 Getting Started

### 1. Start the WebSocket Server

```bash
# Terminal 1: Start WebSocket server
npm run websocket

# Terminal 2: Start Next.js app
npm run dev

# Or start both together:
npm run dev:all
```

### 2. Configure ESP32

1. **Flash the new Arduino code**: Use `esp32-websocket.ino` 
2. **Update IP address**: Change `websocket_server` to your computer's IP
3. **Set machine ID**: Change `MACHINE_ID` for different machines:
   - `cnc-01` → CNC Router 01
   - `plasma-01` → Plasma Cutter 01  
   - `laser-01` → Laser Engraver 01

### 3. Monitor WebSocket Activity

- **Web Dashboard**: http://localhost:3000/monitor
- **Server Stats**: http://localhost:8080/stats
- **Browser Console**: Real-time message logs

## 📡 WebSocket Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Web Client    │ ←──────────────→ │  Node.js WS     │ ←──────────────→ │     ESP32       │
│   (React App)   │   Port 3000      │     Server      │   Port 8080      │   (Arduino)     │
│                 │                  │   Port 8080     │                  │                 │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
         │                                     │                                     │
         │                                     │                                     │
    ┌────▼────┐                           ┌────▼────┐                           ┌────▼────┐
    │ Browser │                           │ Machine │                           │  GRBL   │
    │   UI    │                           │ Status  │                           │ Shield  │
    └─────────┘                           │ Manager │                           └─────────┘
                                          └─────────┘
```

## 🔧 Configuration

### Environment Variables (.env.local)

```bash
# WebSocket server URL (default: ws://localhost:8080)
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080

# Enable WebSocket features
NEXT_PUBLIC_ENABLE_WEBSOCKET=true

# Next.js server URL for ESP32 HTTP fallback
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### ESP32 Configuration

```cpp
// Update these in esp32-websocket.ino:
const char* websocket_server = "192.168.1.100"; // Your computer's IP
const String MACHINE_ID = "cnc-01";             // Unique machine ID
const String MACHINE_NAME = "CNC Router 01";    // Display name
```

## 🎮 Using the WebSocket Features

### 1. Monitor Dashboard

Navigate to `/monitor` to see:
- **Live machine status** with real-time updates
- **WebSocket G-code sender** for direct communication
- **Activity logs** showing all WebSocket events
- **Connection health** monitoring

### 2. WebSocket G-code Sender

- **Select target machine** from connected ESP32 devices
- **Send G-code** line-by-line with progress tracking
- **Real-time feedback** from GRBL execution
- **Error handling** with automatic retries

### 3. Machine Status Tracking

- **Instant updates** when machines connect/disconnect
- **ESP32 heartbeat** monitoring (every 5 seconds)
- **Automatic offline detection** (30-second timeout)
- **Status change notifications** with toast messages

## 📊 Monitoring & Debugging

### WebSocket Server Stats

Visit http://localhost:8080/stats to see:

```json
{
  "connectedClients": 3,
  "machineStatus": {
    "cnc-01": {
      "id": "cnc-01",
      "name": "CNC Router 01", 
      "status": "online",
      "esp32Connected": true
    }
  },
  "uptime": 1247,
  "timestamp": "2025-08-18T10:30:45.123Z"
}
```

### Browser Console Logs

Enable detailed logging in browser console:
- `📨 Received WebSocket message: machine_status_update`
- `📤 Sent WebSocket message: gcode_send`
- `🔌 WebSocket connected`
- `❌ WebSocket disconnected`

### ESP32 Serial Monitor

```
🚀 ESP32 CNC WebSocket Client Starting...
🌐 WiFi connected!
📡 ESP32 IP address: 192.168.1.123
✅ WebSocket Connected to: /
🤝 Connection established with server
📤 Sent WebSocket message: machine_heartbeat
🎯 Received G-code command: G1 X10 Y10 F1000
📡 GRBL response: 'ok'
✅ GRBL OK received!
```

## 🔄 Migration from HTTP Polling

### Before (HTTP Polling):
- Frontend polled `/api/machines/status` every 5 seconds
- High server load with repeated requests
- 5-second delay for status updates
- No real-time G-code feedback

### After (WebSocket):
- Instant bidirectional communication
- Minimal server load
- Real-time updates (< 100ms)
- Live G-code progress tracking
- Automatic reconnection handling

## 🚨 Troubleshooting

### WebSocket Connection Issues

1. **Check WebSocket server is running**:
   ```bash
   npm run websocket
   # Should see: 🚀 CNC WebSocket Server started
   ```

2. **Verify environment variables**:
   ```bash
   # .env.local should contain:
   NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
   ```

3. **Check browser console** for connection errors

4. **Firewall settings**: Ensure port 8080 is not blocked

### ESP32 Connection Issues

1. **Update WebSocket server IP** in Arduino code
2. **Check WiFi connection** on ESP32
3. **Verify serial monitor output** for connection logs
4. **Test HTTP endpoints** first: http://ESP32_IP/status

### Machine Status Not Updating

1. **Check WebSocket connection** in `/monitor` dashboard
2. **Verify ESP32 heartbeat messages** (every 5 seconds)
3. **Look for timeout messages** (30-second offline detection)
4. **Check server logs** for WebSocket events

## 📈 Performance Benefits

| Feature | HTTP Polling | WebSocket |
|---------|-------------|-----------|
| Status Updates | 5 second delay | Instant (< 100ms) |
| Server Load | High (constant requests) | Low (event-driven) |
| Bandwidth | High (HTTP headers) | Low (minimal frames) |
| Real-time | No | Yes |
| Bidirectional | Limited | Full |
| Reconnection | Manual | Automatic |

## 🎯 Next Steps

1. **Deploy to production** with proper WebSocket proxy (nginx/Apache)
2. **Add authentication** for WebSocket connections
3. **Implement job queuing** for multiple G-code files
4. **Add file upload** for direct G-code file transmission
5. **Create mobile app** using the same WebSocket API

## 🤝 API Reference

### WebSocket Events

#### Client → Server

```javascript
// Send G-code to machine
{
  "type": "gcode_send",
  "data": {
    "machineId": "cnc-01",
    "gcode": "G1 X10 Y10 F1000",
    "lineNumber": 1,
    "jobId": "job-12345"
  }
}

// Ping server
{
  "type": "ping", 
  "data": {
    "timestamp": "2025-08-18T10:30:45.123Z"
  }
}
```

#### Server → Client

```javascript
// Machine status update
{
  "type": "machine_status_update",
  "data": {
    "machineId": "cnc-01",
    "status": {
      "id": "cnc-01",
      "name": "CNC Router 01",
      "status": "online",
      "esp32Connected": true,
      "lastSeen": "2025-08-18T10:30:45.123Z"
    }
  }
}

// G-code progress update
{
  "type": "gcode_progress",
  "data": {
    "machineId": "cnc-01",
    "lineNumber": 1,
    "status": "completed",
    "gcode": "G1 X10 Y10 F1000",
    "jobId": "job-12345"
  }
}
```

---

## 🎉 Congratulations!

Your CNC application now has **real-time WebSocket communication** providing:
- ⚡ **Instant updates** 
- 🔄 **Bidirectional communication**
- 📈 **Better performance**
- 🛡️ **Automatic reconnection**
- 📊 **Live monitoring**

The app maintains backward compatibility with HTTP endpoints while adding powerful real-time features via WebSocket!

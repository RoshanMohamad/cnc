# ESP32 CNC Machine Status Monitoring

Your CNC application now has **real-time ESP32 machine status monitoring**! 🎉

## ✅ What's Working

### Real-time Machine Status Display

- **Live ESP32 Connection Status** - Shows when ESP32 is powered on/off
- **Machine Status Updates** - Online, Standby, Error, Offline states
- **Heartbeat Monitoring** - Automatically detects if machines go offline
- **Visual Indicators** - Color-coded status with ESP32 connection icons

### MQTT Topics for ESP32 Communication

```
esp32/cnc-01/online      - ESP32 powered on
esp32/cnc-01/offline     - ESP32 powered off
machines/cnc-01/status   - Machine status updates
machines/cnc-01/heartbeat - Keep-alive messages
cnc/cnc-01/commands      - Commands to ESP32
```

## 🚀 How to Test

### Option 1: Using the Web Simulator

1. **Open**: http://localhost:3000/monitor
2. **Go to**: ESP32 Simulator section
3. **Select**: CNC Router 01 (or any machine)
4. **Click**: "Power On" button
5. **Watch**: Machine status change to "Online" with ESP32 connected indicator

### Option 2: Using Real ESP32 Hardware

1. **Upload**: `ESP32_CNC_Client.ino` to your ESP32
2. **Configure**: WiFi credentials in the code
3. **Power on**: ESP32 board
4. **Watch**: Your web app automatically show "CNC Router 01 - Online"

## 📱 Where to See the Status

### Home Page (`/`)

- **Real-time machine cards** showing ESP32 connection status
- **Live updates** when ESP32 powers on/off

### Monitor Page (`/monitor`)

- **Detailed machine status** with timestamps
- **ESP32 Simulator** for testing
- **MQTT message monitoring**

## 🔧 ESP32 Setup Instructions

### 1. Hardware Requirements

- ESP32 Development Board
- WiFi connection
- USB cable for programming

### 2. Arduino IDE Setup

```bash
# Install these libraries:
- PubSubClient (by Nick O'Leary)
- ArduinoJson (by Benoit Blanchon)
```

### 3. Configure the Code

Update these lines in `ESP32_CNC_Client.ino`:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* machine_id = "cnc-01";  // For different machines use: plasma-01, laser-01
```

### 4. Upload and Power On

1. Connect ESP32 to computer
2. Upload the Arduino code
3. Open Serial Monitor (115200 baud)
4. Watch your web app show the machine as "Online"

## 🎯 Machine Status States

| Status      | Description                       | ESP32 State     |
| ----------- | --------------------------------- | --------------- |
| **Online**  | ESP32 connected, machine ready    | ✅ Connected    |
| **Standby** | ESP32 connected, machine waiting  | ✅ Connected    |
| **Error**   | ESP32 connected, machine error    | ✅ Connected    |
| **Offline** | ESP32 disconnected or powered off | ❌ Disconnected |

## 📊 Features

### Automatic Detection

- **Power On**: ESP32 sends "online" message → Status changes to "Online"
- **Power Off**: No heartbeat for 30 seconds → Status changes to "Offline"
- **Commands**: Web app can send G-code commands to ESP32

### Visual Indicators

- **🟢 Green dot**: Machine online and ESP32 connected
- **🟡 Yellow dot**: Machine in standby mode
- **🔴 Red dot**: Machine error or offline
- **📶 WiFi icon**: ESP32 connection status
- **⚡ Lightning**: ESP32 connected indicator

### Real-time Updates

- **Instant status changes** when ESP32 powers on/off
- **Live timestamps** showing last communication
- **Heartbeat monitoring** every 10 seconds

## 🔌 Multiple Machines

To add more machines:

1. **Update machine_id** in ESP32 code:

   ```cpp
   const char* machine_id = "plasma-01";  // or "laser-01"
   ```

2. **Each ESP32** will appear as a separate machine in your web app

3. **Supported machine IDs**:
   - `cnc-01` → CNC Router 01
   - `plasma-01` → Plasma Cutter 01
   - `laser-01` → Laser Engraver 01

## 🚨 Testing Commands

Use the simulator or send MQTT messages:

```bash
# Power on CNC Router 01
Topic: esp32/cnc-01/online
Message: "ESP32 powered on"

# Send status update
Topic: machines/cnc-01/status
Message: "ready"

# Send heartbeat
Topic: machines/cnc-01/heartbeat
Message: "1234567890"
```

Your CNC machine monitoring system is now fully operational! When you power on an ESP32, you'll see the machine status change to "Online" in real-time. 🎉

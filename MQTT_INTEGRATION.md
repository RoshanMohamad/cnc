# CNC MQTT Integration

Your CNC application is now **fully configured for MQTT**! 🎉

## ✅ What's Been Set Up

### 1. **MQTT Client Hook** (`src/hooks/useMqtt.ts`)

- React hook for MQTT WebSocket connections
- Auto-connect to your HiveMQ Cloud broker
- Message publishing and subscribing
- Real-time message handling

### 2. **MQTT Monitor Component** (`src/components/MqttMonitor.tsx`)

- Complete MQTT control panel
- Publish/Subscribe interface
- CNC-specific quick controls
- Real-time message monitoring
- Emergency stop functionality

### 3. **API Routes** (`src/app/api/mqtt/route.ts`)

- Server-side MQTT operations
- Backend publish/subscribe support
- Configuration status endpoint

### 4. **Environment Configuration** (`.env.local`)

```bash
# Your HiveMQ Cloud Configuration
MQTT_BROKER_URL=ssl://59b7b3711a1343a2b73390b324772f17.s1.eu.hivemq.cloud:8883
NEXT_PUBLIC_MQTT_BROKER_URL=wss://59b7b3711a1343a2b73390b324772f17.s1.eu.hivemq.cloud:8884/mqtt

# Predefined CNC Topics
cnc/gcode     - Send G-code commands
cnc/status    - Machine status updates
cnc/position  - Position tracking
cnc/commands  - General commands
cnc/emergency - Emergency controls
```

## 🚀 How to Use

### 1. **Access the MQTT Monitor**

- Open http://localhost:3001/monitor
- Scroll down to see the **MQTT Communication Panel**
- Watch the connection status indicator

### 2. **Quick CNC Controls**

The monitor includes ready-to-use buttons for:

- **Home All Axes** - Send HOME command
- **Emergency Stop** - Send STOP command
- **G28** - Home axes G-code
- **M112** - Emergency stop G-code
- **Quick G-codes** - G90, G91, G0 X0 Y0, etc.

### 3. **Custom Messages**

- **Publish**: Send custom messages to any topic
- **Subscribe**: Listen to additional topics
- **Monitor**: View all incoming messages in real-time

### 4. **API Usage**

```javascript
// Publish a message via API
fetch("/api/mqtt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "publish",
    topic: "cnc/gcode",
    message: "G28",
  }),
});

// Check MQTT status
fetch("/api/mqtt").then((res) => res.json());
```

## 🔧 Programming Integration

### Use the Hook in Your Components

```tsx
import { useMqtt } from "@/hooks/useMqtt";

function MyComponent() {
  const { isConnected, publish, subscribe, messages } = useMqtt();

  const sendGcode = (code) => {
    publish("cnc/gcode", code);
  };

  useEffect(() => {
    subscribe("cnc/status");
  }, [subscribe]);

  return (
    <div>
      <button onClick={() => sendGcode("G28")}>Home Machine</button>
      {messages.map((msg) => (
        <div key={msg.timestamp}>
          {msg.topic}: {msg.message}
        </div>
      ))}
    </div>
  );
}
```

## 🎯 Next Steps

1. **Connect Your ESP32/Arduino**

   - Use the same HiveMQ credentials
   - Subscribe to `cnc/gcode` and `cnc/commands`
   - Publish status to `cnc/status` and `cnc/position`

2. **Add More CNC Features**

   - Position monitoring
   - Temperature sensors
   - Tool change notifications
   - Job progress updates

3. **Security (Production)**
   - Create dedicated credentials for each device
   - Use SSL certificates
   - Implement access control

## 🔗 Your MQTT Broker

- **URL**: `59b7b3711a1343a2b73390b324772f17.s1.eu.hivemq.cloud`
- **WebSocket**: Port 8884
- **MQTT**: Port 8883
- **Username**: `hivemq.webclient.1754834728453`

Your CNC application is now ready for real-time machine communication! 🚀

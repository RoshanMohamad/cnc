# MQTT Server Setup for CNC Project

## Option 1: Local Mosquitto MQTT Broker (Recommended for Development)

### Installation on Windows

1. **Download Mosquitto:**

   - Go to https://mosquitto.org/download/
   - Download the Windows installer
   - Install Mosquitto

2. **Configure Mosquitto for WebSocket support:**

   Create a configuration file `mosquitto.conf` in the Mosquitto installation directory:

   ```
   # Default listener for MQTT
   listener 1883
   protocol mqtt

   # WebSocket listener for browser clients
   listener 9001
   protocol websockets

   # Allow anonymous connections (for development only)
   allow_anonymous true

   # Logging
   log_type all
   log_dest file C:/Program Files/mosquitto/mosquitto.log
   ```

3. **Start Mosquitto:**

   ```cmd
   # Navigate to Mosquitto installation directory
   cd "C:\Program Files\mosquitto"

   # Start with configuration file
   mosquitto.exe -c mosquitto.conf -v
   ```

4. **Test the connection:**

   ```cmd
   # Subscribe to a test topic (in one terminal)
   mosquitto_sub -h localhost -t test/topic

   # Publish to the test topic (in another terminal)
   mosquitto_pub -h localhost -t test/topic -m "Hello MQTT!"
   ```

### Your Current Configuration

Your `.env.local` is now configured for:

- **MQTT Protocol:** `mqtt://localhost:1883` (for backend/server-side connections)
- **WebSocket Protocol:** `ws://localhost:9001` (for browser/frontend connections)
- **No authentication** (suitable for local development)

## Option 2: HiveMQ Cloud (Free Tier)

If you prefer a cloud solution:

### Step-by-Step Setup:

1. **Sign up for HiveMQ Cloud:**

   - Go to https://www.hivemq.com/mqtt-cloud-broker/
   - Click "Get started for free"
   - Create an account with your email

2. **Create a free cluster:**

   - After logging in, click "Create Cluster"
   - Select "Serverless" (free tier)
   - Choose a cluster name (e.g., "cnc-cluster")
   - Select the closest region to you
   - Click "Create"

3. **Get your connection details:**

   - Once the cluster is created, click on it
   - Go to the "Overview" tab
   - You'll see:
     - **Cluster URL:** Something like `your-cluster-name.s1.eu.hivemq.cloud`
     - **Port 8883:** For secure MQTT connections
     - **Port 8884:** For secure WebSocket connections

4. **Create credentials (Username & Password):**

   - In your cluster dashboard, go to "Access Management" tab
   - Click "Add Credentials" or "Manage Credentials"
   - Click "Add" to create new credentials
   - Enter:
     - **Username:** Choose any username (e.g., `cnc-user`)
     - **Password:** Choose a strong password (e.g., `CNC@2025!Secure`)
   - Set permissions (for development, you can use `#` for all topics)
   - Click "Add"

5. **Update your `.env.local` with the actual credentials:**

   ```env
   # Replace with your actual cluster details
   MQTT_BROKER_URL=ssl://your-cluster-name.s1.eu.hivemq.cloud:8883
   MQTT_USERNAME=cnc-user
   MQTT_PASSWORD=CNC@2025!Secure

   NEXT_PUBLIC_MQTT_BROKER_URL=wss://your-cluster-name.s1.eu.hivemq.cloud:8884/mqtt
   NEXT_PUBLIC_MQTT_USERNAME=cnc-user
   NEXT_PUBLIC_MQTT_PASSWORD=CNC@2025!Secure
   ```

### Example with real values:

If your cluster URL is `my-cnc-cluster.s1.eu.hivemq.cloud` and you created username `cncapp` with password `MySecure123!`, your config would be:

```env
MQTT_BROKER_URL=ssl://my-cnc-cluster.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=cncapp
MQTT_PASSWORD=MySecure123!

NEXT_PUBLIC_MQTT_BROKER_URL=wss://my-cnc-cluster.s1.eu.hivemq.cloud:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=cncapp
NEXT_PUBLIC_MQTT_PASSWORD=MySecure123!
```

### Test your connection:

You can test using an online MQTT client like http://www.hivemq.com/demos/websocket-client/ with your WebSocket URL and credentials.

## Option 3: Docker Setup (Alternative Local Setup)

If you prefer Docker:

```yaml
# docker-compose.yml
version: "3.8"
services:
  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
    restart: unless-stopped
```

## MQTT Topics for Your CNC Project

Your environment now includes these predefined topics:

- `cnc/gcode` - For sending G-code commands
- `cnc/status` - For machine status updates
- `cnc/position` - For position updates
- `cnc/commands` - For general commands

## Next Steps

1. Install and start your MQTT broker
2. Test the connection
3. Update your application code to use the new MQTT configuration
4. Consider implementing MQTT client code for your CNC communication

## Security Notes

- The current setup allows anonymous connections (good for development)
- For production, enable authentication and use SSL/TLS
- Consider using certificate-based authentication for ESP32 devices

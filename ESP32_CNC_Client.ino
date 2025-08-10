/*
 * ESP32 CNC Machine MQTT Client
 * 
 * This code connects your ESP32 to the CNC monitoring system.
 * When the ESP32 powers on, it will show "CNC Cutter 01 Online" in your web app.
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - WiFi Connection
 * 
 * Libraries Required:
 * - WiFi (built-in)
 * - PubSubClient (install via Library Manager)
 * - ArduinoJson (install via Library Manager)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT broker settings (your HiveMQ Cloud credentials)
const char* mqtt_server = "59b7b3711a1343a2b73390b324772f17.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;  // SSL port
const char* mqtt_username = "hivemq.webclient.1754834728453";
const char* mqtt_password = "G9n<ofBhJq530t,X.OT:";

// Machine identification
const char* machine_id = "cnc-01";  // Change this for different machines
const char* machine_name = "CNC Router 01";

// MQTT topics
String online_topic = "esp32/" + String(machine_id) + "/online";
String offline_topic = "esp32/" + String(machine_id) + "/offline";
String status_topic = "machines/" + String(machine_id) + "/status";
String heartbeat_topic = "machines/" + String(machine_id) + "/heartbeat";
String command_topic = "cnc/" + String(machine_id) + "/commands";

WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 10000; // Send heartbeat every 10 seconds

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32 CNC Machine Monitor ===");
  Serial.print("Machine ID: ");
  Serial.println(machine_id);
  Serial.print("Machine Name: ");
  Serial.println(machine_name);
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  espClient.setInsecure(); // For simplicity - use proper certificates in production
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Connect to MQTT and announce we're online
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Send periodic heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat > heartbeatInterval) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  // Add your CNC control logic here
  // For example, read sensors, control motors, etc.
  
  delay(100);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32-" + String(machine_id) + "-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println(" connected!");
      
      // Announce that we're online
      publishOnlineStatus();
      
      // Subscribe to command topics
      client.subscribe(command_topic.c_str());
      Serial.print("Subscribed to: ");
      Serial.println(command_topic);
      
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

void publishOnlineStatus() {
  // Create JSON message with machine info
  StaticJsonDocument<200> doc;
  doc["machine_id"] = machine_id;
  doc["machine_name"] = machine_name;
  doc["timestamp"] = millis();
  doc["ip_address"] = WiFi.localIP().toString();
  
  String message;
  serializeJson(doc, message);
  
  // Publish online status
  client.publish(online_topic.c_str(), message.c_str(), true); // Retained message
  client.publish(status_topic.c_str(), "ready", true);
  
  Serial.println("Published online status");
  Serial.print("Topic: ");
  Serial.println(online_topic);
  Serial.print("Message: ");
  Serial.println(message);
}

void sendHeartbeat() {
  String heartbeat = String(millis());
  client.publish(heartbeat_topic.c_str(), heartbeat.c_str());
  
  Serial.print("Heartbeat sent: ");
  Serial.println(heartbeat);
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message: ");
  Serial.println(message);
  
  // Handle commands
  if (String(topic) == command_topic) {
    handleCommand(message);
  }
}

void handleCommand(String command) {
  Serial.print("Processing command: ");
  Serial.println(command);
  
  if (command == "HOME") {
    Serial.println("Executing HOME command");
    client.publish(status_topic.c_str(), "homing");
    // Add your homing logic here
    delay(2000); // Simulate homing time
    client.publish(status_topic.c_str(), "ready");
    
  } else if (command == "STOP") {
    Serial.println("Executing STOP command");
    client.publish(status_topic.c_str(), "stopped");
    // Add your stop logic here
    
  } else if (command.startsWith("G")) {
    Serial.println("Executing G-code: " + command);
    client.publish(status_topic.c_str(), "working");
    // Add your G-code execution logic here
    delay(1000); // Simulate work time
    client.publish(status_topic.c_str(), "ready");
    
  } else {
    Serial.println("Unknown command: " + command);
  }
}

// This function runs when ESP32 is powering down (if you can detect it)
void publishOfflineStatus() {
  client.publish(offline_topic.c_str(), "ESP32 powering down", true);
  client.publish(status_topic.c_str(), "offline", true);
  Serial.println("Published offline status");
}

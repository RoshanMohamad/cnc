#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Dialog 4G 003";
const char* password = "8e6F8AbF";

WebServer server(80);

#define STEP_PIN 25
#define DIR_PIN 26
#define STEPS_PER_MM 80  // Define based on your mechanics

#define RXD1 16
#define TXD1 17

String gcodeBuffer[100];  // Stores up to 100 G-code lines
int bufferIndex = 0;
int currentLine = 0; 
bool sending = false;
String response = "";

void feedCloth(float mm) {
  Serial.println("Feeding cloth...");
  int steps = mm * STEPS_PER_MM;

  digitalWrite(DIR_PIN, HIGH);  // Set direction forward

  for (int i = 0; i < steps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(800);  // adjust for speed
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(800);
  }
}

void handleGcode() {
  if (server.method() == HTTP_OPTIONS) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
    return;
  }

  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String gcode_data = server.arg("plain");
  Serial.println("\nReceived G-code:\n" + gcode_data);

  // ✅ Clear buffer manually
  for (int i = 0; i < 100; i++) {
    gcodeBuffer[i] = "";
  }
  bufferIndex = 0;
  currentLine = 0;
  sending = true;

  int lastIndex = 0;
  for (int i = 0; i < gcode_data.length(); i++) {
    if (gcode_data[i] == '\n') {
      String line = gcode_data.substring(lastIndex, i);
      line.trim();
      if (line.length() > 0 && bufferIndex < 100) {
        gcodeBuffer[bufferIndex++] = line;
      }
      lastIndex = i + 1;
    }
  }

  if (lastIndex < gcode_data.length() && bufferIndex < 100) {
    String line = gcode_data.substring(lastIndex);
    line.trim();
    if (line.length() > 0) {
      gcodeBuffer[bufferIndex++] = line;
    }
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "G-code received and sending started.");
}

void setup() {
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);

  Serial.begin(115200);
  Serial1.begin(115200, SERIAL_8N1, RXD1, TXD1);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  Serial.print("📡 ESP32 IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/api/gcode", HTTP_ANY, handleGcode);
  server.begin();
  Serial.println("Server started");
}

void loop() {
  server.handleClient();

  if (sending && currentLine < bufferIndex) {
    if (response == "") {
      String lineToSend = gcodeBuffer[currentLine];
      Serial.print("Sending: ");
      Serial.println(lineToSend);
      Serial1.println(lineToSend);
      response = "waiting";
      delay(50); // Allow GRBL time to respond
    }

    while (Serial1.available()) {
      char c = Serial1.read();
      if (c == '\r') continue;
      if (c == '\n') {
        if (response.indexOf("ok") >= 0 || response.indexOf("error") >= 0) {
          currentLine++;
        }
        response = "";
      } else {
        if (response == "waiting") response = "";
        response += c; 
      }
    }
  }

  if (sending && currentLine >= bufferIndex) {
    Serial.println("All G-code lines sent.");
    feedCloth(10);
    sending = false;
    response = "";
    currentLine = 0;
  }
}
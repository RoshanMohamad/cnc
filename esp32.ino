/*
 * ESP32 CNC WebSocket Client - ARDUINO IDE COMPATIBLE
 * 
 * This version is specifically designed for Arduino IDE compatibility
 * No advanced C++ features - guaranteed to compile!
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// Stepper motor configuration
#define STEP_PIN 25
#define DIR_PIN 26
#define STEPS_PER_MM 80

// WiFi credentials
const char* ssid = "Dialog 4G 003";
const char* password = "8e6F8AbF";

// WebSocket server settings
const char* websocket_host = "192.168.8.187";  // Update to your computer's IP
const int websocket_port = 8081;
const char* websocket_path = "/?type=esp32&id=cnc-01";

// Machine identification
const char* machine_id = "cnc-01";
const char* machine_name = "CNC Router 01 (SIMULATION)";

// Servo configuration
Servo testServo;
const int servoPin = 18;  // GPIO pin for servo
const int servoOriginalPos = 0;    // Original position (degrees)
const int servoTestPos = 90;       // Test position (degrees)
bool servoInitialized = false;

// Stepper motor configuration
bool stepperInitialized = false;
const unsigned long stepDelayMicros = 800; // Microseconds between steps (adjust for speed)
const int defaultStepperDistance = 25; // Default distance to move in mm

// WebSocket client
WebSocketsClient webSocket;

// State variables
String currentGcodeLine = "";
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 5000; // 5 seconds
bool firstGcodeReceived = false;
bool jobInProgress = false;
String currentJobId = "";
unsigned long lastGcodeTime = 0;
const unsigned long jobTimeoutMs = 30000; // 30 seconds timeout
bool postJobStepperExecuted = false;

void setup() {
  Serial.begin(115200);
  
  // DISABLE I2C TO PREVENT NACK ERRORS
  pinMode(21, INPUT_PULLUP);  // Disable SDA
  pinMode(22, INPUT_PULLUP);  // Disable SCL
  
  Serial.println();
  Serial.println("=== ESP32 CNC WebSocket Client - ARDUINO IDE COMPATIBLE ===");
  Serial.print("Machine ID: ");
  Serial.println(machine_id);
  Serial.println("🤖 SIMULATION MODE ONLY - Arduino IDE Compatible!");
  
  // Initialize servo
  setupServo();
  
  // Initialize stepper motor
  setupStepper();
  
  // Initialize random seed
  randomSeed(analogRead(0));
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup WebSocket connection
  webSocket.begin(websocket_host, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
  
  Serial.println("ESP32 WebSocket client ready for simulation");
  Serial.print("Connecting to WebSocket: ws://");
  Serial.print(websocket_host);
  Serial.print(":");
  Serial.print(websocket_port);
  Serial.println(websocket_path);
  
  // Perform initial stepper test
  Serial.println("🧪 Performing initial stepper motor test...");
  delay(2000); // Wait 2 seconds for user to see message
  testStepperMotor();
}

void loop() {
  webSocket.loop();
  
  // Send periodic heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat > heartbeatInterval) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  // Check for job timeout and trigger post-job stepper if needed
  if (jobInProgress && !postJobStepperExecuted) {
    if (now - lastGcodeTime > jobTimeoutMs) {
      returnServoToOriginal();
    }
  }
  
  delay(10);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    Serial.println("ESP32 will restart in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

void setupServo() {
  // Initialize servo
  testServo.attach(servoPin);
  servoInitialized = true;
  
  // Move servo to original position
  testServo.write(servoOriginalPos);
  delay(500);  // Give time for servo to move
  
  Serial.print("Servo initialized on pin ");
  Serial.print(servoPin);
  Serial.print(", positioned at ");
  Serial.print(servoOriginalPos);
  Serial.println(" degrees");
}

void setupStepper() {
  // Initialize stepper motor pins
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  
  // Set initial states
  digitalWrite(STEP_PIN, LOW);
  digitalWrite(DIR_PIN, LOW);  // LOW = forward direction
  
  stepperInitialized = true;
  
  Serial.print("Stepper motor initialized - STEP: Pin ");
  Serial.print(STEP_PIN);
  Serial.print(", DIR: Pin ");
  Serial.print(DIR_PIN);
  Serial.print(", Steps per mm: ");
  Serial.println(STEPS_PER_MM);
}

void performServoTest() {
  if (!servoInitialized) {
    Serial.println("Servo not initialized, skipping test");
    return;
  }
  
  testServo.write(servoTestPos);
  delay(1000);  // Wait for servo to move
  
}

void returnServoToOriginal() {
  if (!servoInitialized) {
    Serial.println("Servo not initialized, skipping return");
    return;
  }
  
  Serial.println("🔄 Returning servo to original position...");
  testServo.write(servoOriginalPos);
  delay(1000);  // Wait for servo to move
  
  
  // Reset job state
  jobInProgress = false;
  firstGcodeReceived = false;
  currentJobId = "";
  postJobStepperExecuted = true;  // Mark stepper as executed
  
  // Activate stepper motor after job completion
  activatePostJobStepper();
}

void activatePostJobStepper() {
  if (!stepperInitialized) {
    Serial.println("❌ Stepper not initialized, skipping post-job operation");
    return;
  }
  
  moveStepperDistance(defaultStepperDistance, false); // false = reverse only
  
}

void moveStepperDistance(int distanceMM, bool forward) {
  if (!stepperInitialized) {
    Serial.println("❌ ERROR: Stepper motor not initialized!");
    return;
  }
  
  int totalSteps = distanceMM * STEPS_PER_MM;
  
  // Set direction
  digitalWrite(DIR_PIN, forward ? LOW : HIGH);
  
  // Execute steps
  for (int i = 0; i < totalSteps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(stepDelayMicros);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(stepDelayMicros);
    
  }

}

void testStepperMotor() {
  Serial.println("🔬 === INITIAL STEPPER MOTOR TEST ===");
  if (!stepperInitialized) {
    Serial.println("❌ Stepper motor not initialized - test skipped");
    return;
  }
  
  Serial.println("📋 Test sequence: 10mm forward → pause → 10mm reverse");
  
  // Test forward movement
  Serial.println("1️⃣ Testing forward movement...");
  moveStepperDistance(10, true);
  
  Serial.println("⏸️ Pausing between test movements...");
  delay(2000);
  
  // Test reverse movement  
  Serial.println("2️⃣ Testing reverse movement...");
  moveStepperDistance(10, false);
  
  Serial.println("✅ === INITIAL STEPPER MOTOR TEST COMPLETE ===");
  Serial.println();
}

void stepperEmergencyStop() {
  if (stepperInitialized) {
    digitalWrite(STEP_PIN, LOW);
    Serial.println("⚠️ Stepper emergency stop activated");
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.print("WebSocket Connected to: ");
      Serial.println((char*)payload);
      sendConnectionMessage();
      break;
    
    case WStype_TEXT:
      handleWebSocketMessage(payload, length);
      break;
      
    case WStype_ERROR:
      Serial.print("WebSocket Error: ");
      Serial.println((char*)payload);
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(uint8_t * payload, size_t length) {
  // Parse incoming message
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  String messageType = doc["type"];
  
  if (messageType == "gcode_command") {
    handleGcodeCommand(doc["data"]);
  } else if (messageType == "job_complete") {
    handleJobComplete(doc["data"]);
  } else if (messageType == "stepper_command") {
    handleStepperCommand(doc["data"]);
  } else if (messageType == "ping") {
    sendPong();
  } else if (messageType == "connection_established") {
    Serial.println("Connection established with server");
  }
}

void handleGcodeCommand(JsonVariant data) {
  String gcode = data["gcode"];
  int lineNumber = data["lineNumber"];
  String jobId = data["jobId"];
  
  if (gcode.length() == 0) {
    Serial.println("Empty G-code received");
    sendErrorResponse("ERROR: Empty G-code command", gcode, lineNumber, jobId);
    return;
  }
  
  currentGcodeLine = gcode;
  
  // Update last G-code execution time
  lastGcodeTime = millis();
  
  // Check if this is the first G-code line of a new job
  if (!firstGcodeReceived || currentJobId != jobId) {
    firstGcodeReceived = true;
    jobInProgress = true;
    currentJobId = jobId;
    postJobStepperExecuted = false;  // Reset flag for new job
    
    // Perform servo test on first G-code line
    performServoTest();
  }
  
  Serial.print(gcode);
  Serial.print('\n');
  
  // Send immediate progress update
  sendProgressUpdate("received", gcode, lineNumber, jobId);
  
  // Start simulation (in real implementation, forward to GRBL here)
  simulateGcodeExecution(gcode, lineNumber, jobId);
}

void handleJobComplete(JsonVariant data) {
  String jobId = data["jobId"];
  
  Serial.print("📋 Job completion received for job: ");
  Serial.println(jobId);
  
  // Only return servo if this matches our current job
  if (jobInProgress && jobId == currentJobId) {
    returnServoToOriginal();
  }
}

void handleStepperCommand(JsonVariant data) {
  String action = data["action"];
  
  if (action == "move") {
    int distance = data["distance"] | defaultStepperDistance; // Default if not specified
    bool forward = data["forward"] | true; // Default forward
    
    Serial.print("📡 Remote stepper command - Move ");
    Serial.print(forward ? "forward" : "backward");
    Serial.print(" ");
    Serial.print(distance);
    Serial.println("mm");
    
    moveStepperDistance(distance, forward);
    
  } else if (action == "stop") {
    stepperEmergencyStop();
    
  } else if (action == "test") {
    Serial.println("📡 Remote stepper test command");
    activatePostJobStepper();
  }
}

void simulateGcodeExecution(String gcode, int lineNumber, String jobId) {
  
  // NOTE: In real implementation, this is where you would:
  // 1. Forward the G-code command to GRBL via Serial
  // 2. Wait for GRBL response (OK, ERROR, etc.)
  // 3. Parse GRBL response and forward back to server
  
  // Current simulation logic:
  // Calculate realistic execution time
  unsigned long executionTime = getRealisticExecutionTime(gcode);

  // Wait for the simulated execution time
  delay(executionTime);
  
  // 97% success rate, 3% random errors for realism
  sendOkResponse(gcode, lineNumber, jobId, executionTime);
}


unsigned long getRealisticExecutionTime(String gcode) {
  // Simulate realistic execution times based on G-code command
  gcode.toUpperCase();
  
  if (gcode.startsWith("G0") || gcode.startsWith("G00")) {
    // Rapid positioning - fast
    return random(300, 800);
  } else if (gcode.startsWith("G1") || gcode.startsWith("G01")) {
    // Linear interpolation - variable based on feed rate
    return random(500, 2500);
  } else if (gcode.startsWith("G2") || gcode.startsWith("G3")) {
    // Circular interpolation - longer
    return random(1000, 3500);
  } else if (gcode.startsWith("G28")) {
    // Return to home position - takes time
    return random(2000, 5000);
  } else if (gcode.startsWith("G21")) {
    // Set units to millimeters - instant
    return random(50, 150);
  } else if (gcode.startsWith("G20")) {
    // Set units to inches - instant
    return random(50, 150);
  } else if (gcode.startsWith("M3") || gcode.startsWith("M03")) {
    // Spindle on clockwise - quick
    return random(200, 600);
  } else if (gcode.startsWith("M5") || gcode.startsWith("M05")) {
    // Spindle stop - quick
    return random(100, 400);
  } else if (gcode.startsWith("M8") || gcode.startsWith("M9")) {
    // Coolant on/off - quick
    return random(100, 300);
  } else {
    // Other commands - default time
    return random(200, 1000);
  }
}

void sendConnectionMessage() {
  StaticJsonDocument<350> doc;
  doc["type"] = "machine_connection";
  doc["data"]["machine_id"] = machine_id;
  doc["data"]["machine_name"] = machine_name;
  doc["data"]["status"] = "connected";
  doc["data"]["timestamp"] = millis();
  doc["data"]["ip_address"] = WiFi.localIP().toString();
  doc["data"]["firmware_version"] = "3.1.0-arduino-compatible";
  doc["data"]["mode"] = "SIMULATION_ONLY";
  doc["data"]["servo_enabled"] = servoInitialized;
  doc["data"]["servo_pin"] = servoPin;
  doc["data"]["stepper_enabled"] = stepperInitialized;
  doc["data"]["stepper_step_pin"] = STEP_PIN;
  doc["data"]["stepper_dir_pin"] = DIR_PIN;
  doc["data"]["steps_per_mm"] = STEPS_PER_MM;
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  Serial.println("Sent connection message with servo and stepper status");
}

void sendHeartbeat() {
  if (webSocket.isConnected()) {
    StaticJsonDocument<250> doc;
    doc["type"] = "machine_heartbeat";
    doc["data"]["machine_id"] = machine_id;
    doc["data"]["machine_name"] = machine_name;
    doc["data"]["status"] = "online";
    doc["data"]["timestamp"] = millis();
    doc["data"]["free_heap"] = ESP.getFreeHeap();
    doc["data"]["wifi_rssi"] = WiFi.RSSI();
    doc["data"]["mode"] = "SIMULATION_ONLY";
    
    String message;
    serializeJson(doc, message);
    
    webSocket.sendTXT(message);
  }
}

void sendOkResponse(String gcode, int lineNumber, String jobId, unsigned long executionTime) {
  StaticJsonDocument<400> doc;
  doc["type"] = "gcode_response";
  doc["data"]["machine_id"] = machine_id;
  doc["data"]["gcode"] = gcode;
  doc["data"]["line_number"] = lineNumber;
  doc["data"]["status"] = "ok";
  doc["data"]["response"] = "OK";
  doc["data"]["timestamp"] = millis();
  doc["data"]["execution_time_ms"] = executionTime;
  doc["data"]["jobId"] = jobId;
  doc["data"]["mode"] = "SIMULATION";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  
  // Send completion status
  sendProgressUpdate("completed", gcode, lineNumber, jobId);
}

void sendErrorResponse(String error, String gcode, int lineNumber, String jobId) {
  StaticJsonDocument<400> doc;
  doc["type"] = "gcode_response";
  doc["data"]["machine_id"] = machine_id;
  doc["data"]["gcode"] = gcode;
  doc["data"]["line_number"] = lineNumber;
  doc["data"]["status"] = "error";
  doc["data"]["response"] = "ERROR";
  doc["data"]["error"] = error;
  doc["data"]["timestamp"] = millis();
  doc["data"]["jobId"] = jobId;
  doc["data"]["mode"] = "SIMULATION";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void sendProgressUpdate(String status, String gcode, int lineNumber, String jobId) {
  StaticJsonDocument<400> doc;
  doc["type"] = "gcode_progress";
  doc["data"]["machine_id"] = machine_id;
  doc["data"]["gcode"] = gcode;
  doc["data"]["line_number"] = lineNumber;
  doc["data"]["status"] = status;
  
  String upperStatus = status;
  upperStatus.toUpperCase();
  doc["data"]["response"] = upperStatus;
  
  doc["data"]["timestamp"] = millis();
  doc["data"]["jobId"] = jobId;
  doc["data"]["mode"] = "SIMULATION";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void sendPong() {
  StaticJsonDocument<150> doc;
  doc["type"] = "pong";
  doc["data"]["timestamp"] = millis();
  doc["data"]["machine_id"] = machine_id;
  doc["data"]["mode"] = "SIMULATION";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

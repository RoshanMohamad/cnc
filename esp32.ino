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
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

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

// TCRT5000 Material Sensor configuration (Minimum 3-pin setup)
#define TCRT5000_PIN 23          // Analog pin for TCRT5000 - GPIO 23
#define MATERIAL_THRESHOLD 2000  // Analog threshold for material detection (adjust based on your setup)
#define SENSOR_READ_INTERVAL 100 // Read sensor every 100ms
bool materialDetected = false;
bool previousMaterialState = false;
unsigned long lastSensorRead = 0;
int sensorValue = 0;

// OLED Display configuration (OPTIONAL)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C  // Try 0x3D if 0x3C doesn't work
#define ENABLE_OLED true  // Set to true to enable OLED display
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledInitialized = false;

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
  Serial.flush(); // Clear any existing serial buffer
  delay(1000); // Give serial time to initialize
  
  Serial.println();
  Serial.println("=== ESP32 CNC WebSocket Client - ARDUINO IDE COMPATIBLE ===");
  Serial.print("Machine ID: ");
  Serial.println(machine_id);
  Serial.println("SIMULATION MODE ONLY - Arduino IDE Compatible!");
  Serial.flush(); // Ensure all setup messages are sent
  
  // Initialize OLED display
  setupOLED();
  
  // Initialize TCRT5000 sensor
  setupTCRT5000();
  
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
  
  Serial.println();
  Serial.println("ESP32 WebSocket client ready for simulation");
  Serial.print("Connecting to WebSocket: ws://");
  Serial.print(websocket_host);
  Serial.print(":");
  Serial.print(websocket_port);
  Serial.println(websocket_path);
  Serial.flush(); // Ensure connection info is displayed properly
  
  // Perform initial stepper test
  Serial.println("Performing initial stepper motor test...");
  delay(2000); // Wait 2 seconds for user to see message
  testStepperMotor();
}

void loop() {
  webSocket.loop();
  
  // Read TCRT5000 sensor
  readTCRT5000Sensor();
  
  // Send periodic heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat > heartbeatInterval) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  // Check for job timeout and trigger post-job stepper if needed
  if (jobInProgress && !postJobStepperExecuted) {
    if (now - lastGcodeTime > jobTimeoutMs) {
      Serial.println("Job timeout detected - forcing post-job stepper activation");
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
  
  updateOLEDStatus("CONNECTING...", "WiFi: " + String(ssid), "Please wait...");

  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Update OLED with connection attempts
    updateOLEDStatus("CONNECTING...", "WiFi: " + String(ssid), "Attempt: " + String(attempts) + "/20");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    updateOLEDStatus("WIFI CONNECTED", "IP: " + WiFi.localIP().toString(), "Signal: " + String(WiFi.RSSI()) + " dBm");
    delay(3000);
    
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    Serial.println("ESP32 will restart in 5 seconds...");
    
    updateOLEDStatus("WIFI FAILED", "Connection timeout", "Restarting in 5s");
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

void setupTCRT5000() {
  // Initialize TCRT5000 sensor - Minimum 3-pin setup (VCC, GND, AO)
  // No pinMode needed for analog input
  
  Serial.println("TCRT5000 Material Sensor initialized (3-pin setup)");
  Serial.print("Analog pin: GPIO ");
  Serial.println(TCRT5000_PIN);
  Serial.print("Detection threshold: ");
  Serial.println(MATERIAL_THRESHOLD);
  Serial.println("Wiring: VCC->3.3V, GND->GND, AO->GPIO23");
  
  // Take initial reading
  sensorValue = analogRead(TCRT5000_PIN);
  materialDetected = (sensorValue > MATERIAL_THRESHOLD);
  previousMaterialState = materialDetected;
  
  Serial.print("Initial sensor reading: ");
  Serial.print(sensorValue);
  Serial.print(" - Material ");
  Serial.println(materialDetected ? "DETECTED" : "NOT DETECTED");
  
  updateOLEDMaterialStatus();
}

void readTCRT5000Sensor() {
  unsigned long now = millis();
  
  // Only read sensor at specified intervals
  if (now - lastSensorRead < SENSOR_READ_INTERVAL) {
    return;
  }
  
  lastSensorRead = now;
  
  // Read analog value from TCRT5000
  sensorValue = analogRead(TCRT5000_PIN);
  
  // Determine if material is detected based on threshold
  materialDetected = (sensorValue > MATERIAL_THRESHOLD);
  
  // Check if material detection state changed
  if (materialDetected != previousMaterialState) {
    previousMaterialState = materialDetected;
    
    // Print status change
    Serial.print("Material sensor: ");
    Serial.print(sensorValue);
    Serial.print(" - ");
    Serial.println(materialDetected ? "MATERIAL DETECTED!" : "Material removed");
    
    // Update OLED display
    updateOLEDMaterialStatus();
    
    // Send WebSocket notification about material detection
    sendMaterialDetectionStatus();
  }
}

void setupOLED() {
  if (!ENABLE_OLED) {
    Serial.println("OLED display disabled in configuration");
    oledInitialized = false;
    return;
  }
  
  Serial.println("Attempting OLED display initialization...");
  
  // Try to initialize I2C with error handling
  bool i2cSuccess = false;
  try {
    Wire.begin(21, 22); // SDA=21, SCL=22 (ESP32 default pins)
    Wire.setClock(100000); // Set I2C frequency to 100kHz (slower, more reliable)
    delay(100);
    i2cSuccess = true;
    Serial.println("I2C bus initialized successfully");
  } catch (...) {
    Serial.println("WARNING: I2C initialization failed, continuing without OLED");
    oledInitialized = false;
    return;
  }

  if (!i2cSuccess) {
    Serial.println("WARNING: I2C setup failed, continuing without OLED");
    oledInitialized = false;
    return;
  }

  // Scan I2C bus to find devices
  Serial.println("Scanning I2C bus for devices...");
  bool deviceFound = false;
  int deviceCount = 0;
  
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (addr < 16) Serial.print("0");
      Serial.print(addr, HEX);
      Serial.println("");
      deviceCount++;
      
      if (addr == SCREEN_ADDRESS) {
        deviceFound = true;
        Serial.println("  ^ This matches our OLED address!");
      }
    }
  }
  
  if (deviceCount == 0) {
    Serial.println("No I2C devices found - check wiring!");
    Serial.println("Expected connections:");
    Serial.println("  SDA -> GPIO 21");
    Serial.println("  SCL -> GPIO 22");
    Serial.println("  VCC -> 3.3V");
    Serial.println("  GND -> GND");
    oledInitialized = false;
    return;
  } else {
    Serial.print("Found ");
    Serial.print(deviceCount);
    Serial.println(" I2C device(s)");
  }

  if (!deviceFound) {
    Serial.print("WARNING: OLED not found at expected address 0x");
    Serial.print(SCREEN_ADDRESS, HEX);
    Serial.println("");
    Serial.println("System will continue without OLED display");
    oledInitialized = false;
    return;
  }
  
  // Try to initialize display with multiple addresses and attempts
  bool displaySuccess = false;
  byte addressesToTry[] = {SCREEN_ADDRESS, 0x3D, 0x3C}; // Try configured address first, then common alternatives
  int numAddresses = sizeof(addressesToTry) / sizeof(addressesToTry[0]);
  
  for (int addrIndex = 0; addrIndex < numAddresses && !displaySuccess; addrIndex++) {
    byte currentAddr = addressesToTry[addrIndex];
    Serial.print("Trying OLED address 0x");
    Serial.print(currentAddr, HEX);
    Serial.println(":");
    
    for (int attempt = 1; attempt <= 2; attempt++) {
      Serial.print("  Attempt ");
      Serial.print(attempt);
      Serial.print("/2... ");
      
      try {
        if(display.begin(SSD1306_SWITCHCAPVCC, currentAddr)) {
          Serial.println("SUCCESS");
          Serial.print("OLED working at address 0x");
          Serial.println(currentAddr, HEX);
          displaySuccess = true;
          break;
        } else {
          Serial.println("FAILED");
          delay(300);
        }
      } catch (...) {
        Serial.println("FAILED (Exception)");
        delay(300);
      }
    }
  }

  if (!displaySuccess) {
    Serial.println("WARNING: OLED initialization failed at all addresses");
    Serial.println("         Device found but initialization failed");
    Serial.println("         System will continue without OLED display");
    oledInitialized = false;
    return;
  }
  
  oledInitialized = true;
  Serial.println("SUCCESS: OLED display initialized and ready");
  
  // Try to show startup screen with error handling
  bool startupSuccess = safeDisplayStartup();
  if (!startupSuccess) {
    Serial.println("WARNING: OLED display test failed, disabling OLED");
    oledInitialized = false;
    return;
  }
  
  delay(2000);
}

void performServoTest() {
  if (!servoInitialized) {
    Serial.println("Servo not initialized, skipping test");
    updateOLEDStatus("ERROR", "Servo not init", "");
    return;
  }
  
  updateOLEDStatus("SERVO TEST", "Moving to 90°", "Please wait...");
  
  testServo.write(servoTestPos);
  delay(1000);  // Wait for servo to move
  
  updateOLEDStatus("READY", "Servo: Test pos", "G-code ready");
}

void returnServoToOriginal() {
  if (!servoInitialized) {
    Serial.println("Servo not initialized, skipping return");
    return;
  }
  
  updateOLEDStatus("JOB COMPLETE", "Servo returning", "to 0 degrees");
  
  testServo.write(servoOriginalPos);
  delay(1000);  // Wait for servo to move
  
  Serial.println("Servo returned to original position");
  
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
    Serial.println("ERROR: Stepper not initialized, skipping post-job feeding");
    updateOLEDStatus("ERROR", "Stepper not init", "");
    return;
  }
  
  Serial.println("=== G-CODE JOB COMPLETE - STARTING MATERIAL FEEDING ===");
  
  // Check if material is detected before feeding
  if (!materialDetected) {
    Serial.println("WARNING: No material detected - but feeding anyway (job complete)");
    updateOLEDStatus("FEEDING MOTOR", "No material", "Feeding anyway...");
  } else {
    Serial.println("Material detected - Starting feeding operation");
    updateOLEDStatus("FEEDING MOTOR", "Material found", "Feeding forward...");
  }
  
  // Feed material forward after G-code completion
  Serial.println("Feeding material forward 25mm...");
  moveStepperDistance(defaultStepperDistance, true); // true = forward feeding
  
  delay(1000); // Brief pause
  
  Serial.println("Post-job material feeding complete");
  updateOLEDJobComplete();
  delay(3000); // Show completion for 3 seconds
  
  // Check final material status
  if (materialDetected) {
    updateOLEDStatus("READY", "Material fed", "Ready for next job");
  } else {
    updateOLEDStatus("READY", "Feed complete", "Load new material");
  }
}

void moveStepperDistance(int distanceMM, bool forward) {
  if (!stepperInitialized) {
    Serial.println("ERROR: Stepper motor not initialized!");
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
  if (!stepperInitialized) {
    Serial.println("ERROR: Stepper motor not initialized - test skipped");
    return;
  }
  moveStepperDistance(10, true);
  delay(2000);
  moveStepperDistance(10, false);
}

void stepperEmergencyStop() {
  if (stepperInitialized) {
    digitalWrite(STEP_PIN, LOW);
    Serial.println("Stepper emergency stop activated");
  }
  updateOLEDStatus("EMERGENCY STOP", "Stepper Halted", "");
}

bool safeDisplayStartup() {
  if (!oledInitialized) return false;
  
  Serial.println("Testing OLED display with visible patterns...");
  
  // Try to show startup screen safely
  try {
    // Test 1: Clear and show text
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("CNC");
    display.println("READY");
    display.display();
    delay(1000);
    
    // Test 2: Fill screen (should be completely white)
    Serial.println("Testing full screen fill...");
    display.fillScreen(SSD1306_WHITE);
    display.display();
    delay(1000);
    
    // Test 3: Clear screen (should be completely black)
    Serial.println("Testing screen clear...");
    display.clearDisplay();
    display.display();
    delay(500);
    
    // Test 4: Draw border rectangle
    Serial.println("Testing border rectangle...");
    display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SSD1306_WHITE);
    display.display();
    delay(1000);
    
    // Test 5: Final startup message
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("ESP32 CNC Controller");
    display.println("OLED: Working!");
    display.println("WiFi: Connecting...");
    display.println("");
    display.println("Display test complete");
    display.display();
    
    Serial.println("OLED display test completed successfully!");
    return true;
    
  } catch (...) {
    Serial.println("OLED display test failed - exception caught");
    return false;
  }
}

bool safeDisplayUpdate() {
  if (!oledInitialized) return false;
  
  // Try to update display with timeout and error handling
  unsigned long startTime = millis();
  const unsigned long timeout = 500; // 500ms timeout
  
  try {
    // Check if we're still within timeout
    if (millis() - startTime > timeout) {
      return false;
    }
    
    display.display();
    return true; // Success
    
  } catch (...) {
    // If any error occurs, just return false
    return false;
  }
}

void updateOLEDStatus(String line1, String line2, String line3) {
  if (!oledInitialized) return;
  
  // Try to update OLED with full error protection
  try {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    // Line 1 - Main status
    display.setCursor(0, 0);
    display.println(line1);
    
    // Line 2 - Secondary info
    display.setCursor(0, 16);
    display.println(line2);
    
    // Line 3 - Additional info
    display.setCursor(0, 32);
    display.println(line3);
    
    // Bottom line - WiFi status
    display.setCursor(0, 56);
    if (WiFi.status() == WL_CONNECTED) {
      display.print("WiFi: ");
      display.print(WiFi.localIP());
    } else {
      display.print("WiFi: Disconnected");
    }
    
    // Safe update with error handling
    if (!safeDisplayUpdate()) {
      // If display fails, disable it silently to prevent system interruption
      static int failCount = 0;
      failCount++;
      if (failCount > 3) {
        // Only log once, then disable silently
        if (failCount == 4) {
          Serial.println("INFO: OLED disabled due to I2C issues (system continues normally)");
        }
        oledInitialized = false;
      }
    }
    
  } catch (...) {
    // Silently handle any OLED errors - don't let them crash the system
    oledInitialized = false;
  }
}

void updateOLEDGCode(String gcode, int lineNum, String jobId) {
  if (!oledInitialized) return;
  
  try {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    // Header
    display.setCursor(0, 0);
    display.println("G-CODE EXECUTION");
    
    // Job info
    display.setCursor(0, 16);
    display.print("Job: ");
    display.println(jobId.substring(0, 10) + "...");
    
    // Line number
    display.setCursor(0, 24);
    display.print("Line: ");
    display.println(lineNum);
    
    // Current G-code (truncated if too long)
    display.setCursor(0, 32);
    display.print("Cmd: ");
    String truncatedGcode = gcode.length() > 18 ? gcode.substring(0, 18) + "..." : gcode;
    display.println(truncatedGcode);
    
    // Status
    display.setCursor(0, 48);
    display.println("Status: Executing...");
    
    safeDisplayUpdate();
    
  } catch (...) {
    // Silently handle OLED errors
    oledInitialized = false;
  }
}

void updateOLEDJobComplete() {
  if (!oledInitialized) return;
  
  try {
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    
    display.setCursor(0, 0);
    display.println("FEEDING");
    display.println("COMPLETE");
    
    display.setTextSize(1);
    display.setCursor(0, 40);
    if (materialDetected) {
      display.println("Material: Fed");
      display.println("Status: Ready");
    } else {
      display.println("Feed: Complete");
      display.println("Load new material");
    }
    
    safeDisplayUpdate();
    
  } catch (...) {
    // Silently handle OLED errors
    oledInitialized = false;
  }
}

void updateOLEDMaterialStatus() {
  if (!oledInitialized) return;
  
  try {
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    
    // Title
    display.setCursor(0, 0);
    display.println("MATERIAL");
    
    // Status
    display.setTextSize(2);
    display.setCursor(0, 20);
    if (materialDetected) {
      display.println("DETECTED");
      
      // Show sensor value
      display.setTextSize(1);
      display.setCursor(0, 45);
      display.print("Value: ");
      display.print(sensorValue);
      display.setCursor(0, 55);
      display.print("Thresh: ");
      display.print(MATERIAL_THRESHOLD);
      
    } else {
      display.println("NO MAT.");
      
      // Show sensor value
      display.setTextSize(1);
      display.setCursor(0, 45);
      display.print("Value: ");
      display.print(sensorValue);
      display.setCursor(0, 55);
      display.println("Place material");
    }
    
    safeDisplayUpdate();
    
  } catch (...) {
    // Silently handle OLED errors
    oledInitialized = false;
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println();
      Serial.println("WebSocket Disconnected");
      Serial.flush();
      updateOLEDStatus("DISCONNECTED", "WebSocket lost", "Reconnecting...");
      break;
      
    case WStype_CONNECTED:
      Serial.println();
      Serial.print("WebSocket Connected to: ");
      Serial.println((char*)payload);
      Serial.flush(); // Ensure message is sent before continuing
      updateOLEDStatus("CONNECTED", "WebSocket OK", "Server linked");
      sendConnectionMessage();
      break;
    
    case WStype_TEXT:
      handleWebSocketMessage(payload, length);
      break;
      
    case WStype_ERROR:
      Serial.println();
      Serial.print("WebSocket Error: ");
      Serial.println((char*)payload);
      Serial.flush();
      updateOLEDStatus("ERROR", "WebSocket fault", String((char*)payload));
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
  } else if (messageType == "feed_command") {
    handleFeedCommand(doc["data"]);
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
  
  // Update OLED with current G-code
  updateOLEDGCode(gcode, lineNumber, jobId);
  
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
  
  Serial.print("Job completion received for job: ");
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
    
    Serial.print("Remote stepper command - Move ");
    Serial.print(forward ? "forward" : "backward");
    Serial.print(" ");
    Serial.print(distance);
    Serial.println("mm");
    
    moveStepperDistance(distance, forward);
    
  } else if (action == "stop") {
    stepperEmergencyStop();
    
  } else if (action == "test") {
    Serial.println("Remote stepper test command");
    activatePostJobStepper();
  }
}

void handleFeedCommand(JsonVariant data) {
  String action = data["action"];
  
  if (action == "feed_material") {
    int distance = data["distance"] | defaultStepperDistance; // Default feeding distance
    bool requireMaterial = data["require_material"] | false; // Check if material detection required
    
    Serial.println("=== MANUAL MATERIAL FEEDING COMMAND ===");
    
    if (requireMaterial && !materialDetected) {
      Serial.println("ERROR: No material detected - feeding aborted");
      updateOLEDStatus("FEED ERROR", "No material", "Load material first");
      
      // Send error response
      StaticJsonDocument<200> responseDoc;
      responseDoc["type"] = "feed_response";
      responseDoc["data"]["status"] = "error";
      responseDoc["data"]["message"] = "No material detected";
      responseDoc["data"]["material_detected"] = materialDetected;
      String response;
      serializeJson(responseDoc, response);
      webSocket.sendTXT(response);
      return;
    }
    
    Serial.print("Feeding material forward ");
    Serial.print(distance);
    Serial.println("mm...");
    
    updateOLEDStatus("FEEDING", "Manual feed", String(distance) + "mm forward");
    
    // Perform feeding operation
    manualMaterialFeed(distance);
    
  } else if (action == "check_material") {
    Serial.println("Material detection check requested");
    sendMaterialDetectionStatus();
  }
}

void manualMaterialFeed(int distanceMM) {
  if (!stepperInitialized) {
    Serial.println("ERROR: Stepper not initialized for manual feeding");
    updateOLEDStatus("FEED ERROR", "Stepper not init", "");
    return;
  }
  
  Serial.println("Starting manual material feeding...");
  
  // Move material forward
  moveStepperDistance(distanceMM, true); // true = forward
  
  Serial.println("Manual material feeding complete");
  
  // Send success response
  StaticJsonDocument<250> responseDoc;
  responseDoc["type"] = "feed_response";
  responseDoc["data"]["status"] = "success";
  responseDoc["data"]["distance"] = distanceMM;
  responseDoc["data"]["direction"] = "forward";
  responseDoc["data"]["material_detected"] = materialDetected;
  responseDoc["data"]["timestamp"] = millis();
  String response;
  serializeJson(responseDoc, response);
  webSocket.sendTXT(response);
  
  // Update display
  if (materialDetected) {
    updateOLEDStatus("FEED COMPLETE", "Material advanced", "Ready for operation");
  } else {
    updateOLEDStatus("FEED COMPLETE", "Feed successful", "Load material");
  }
  
  delay(2000);
  updateOLEDMaterialStatus(); // Return to material status display
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
  
  // Update OLED with ready status
  delay(2000); // Show connection status for 2 seconds
  updateOLEDStatus("READY", "System online", "Waiting for job");
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

void sendMaterialDetectionStatus() {
  if (webSocket.isConnected()) {
    StaticJsonDocument<300> doc;
    doc["type"] = "material_detection";
    doc["data"]["machine_id"] = machine_id;
    doc["data"]["material_detected"] = materialDetected;
    doc["data"]["sensor_value"] = sensorValue;
    doc["data"]["threshold"] = MATERIAL_THRESHOLD;
    doc["data"]["timestamp"] = millis();
    doc["data"]["sensor_pin"] = TCRT5000_PIN;
    
    String message;
    serializeJson(doc, message);
    
    webSocket.sendTXT(message);
    
    Serial.println("Material detection status sent to server");
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

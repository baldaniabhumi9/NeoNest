/*
NeoNest
Smart Neonatal Wearable Monitoring System
ESP32 DEVICE/BACKEND VERSION — integrated with the NeoVitals dashboard

Board:
Beetle ESP32-C3

Sensors:
MAX30102 -> Heart Rate + SpO2
MAX30205 -> Temperature
LIS3DH -> Motion

Buzzer:
GPIO 6

I2C:
SDA = GPIO 8
SCL = GPIO 9

Communication:
WiFi
HTTP API -> Port 80        (local, unchanged — useful for bench testing on the same network)
WebSocket -> Port 81       (local, unchanged)
HTTP POST -> NeoVitals backend /api/vitals/ingest   (NEW — this is what feeds the dashboard,
                                                       AI engine, alerts, and history)

No embedded UI.
No HTML.
No Arduino_JSON.

Data flow (unchanged sensor logic + new sync path):
Sensors
   |
ESP32 (all your tested contact/beat/SpO2/motion logic — untouched)
   |
   +--> local HTTP API /api/data + local WebSocket :81   (unchanged, optional/for bench debugging)
   |
   +--> HTTPClient POST -> NeoVitals backend /api/vitals/ingest   (NEW)
              |
              v
         MongoDB, AI engine, alerts
              |
              v
         Dashboard (live via Socket.io)


==================== INTEGRATION SETUP — READ THIS FIRST ====================
1. In the NeoVitals dashboard, sign up, then go to Device -> "Add a device".
   Enter a Device ID (e.g. "neonest-esp32-01") — this must exactly match
   DEVICE_ID below. Copy the Device Key shown (only shown once) into
   DEVICE_KEY below.
2. Set BACKEND_HOST to wherever your NeoVitals backend is running, e.g.
   "http://192.168.1.50:5000" for a machine on the same home WiFi, or your
   deployed backend's HTTPS URL in production.
3. Per-baby alert thresholds (heart rate / SpO2 / temperature ranges) live in
   the dashboard's Device page, NOT in this firmware — the buzzer alerts
   below use their own local thresholds for on-device beeping, which you can
   tune independently of the dashboard's thresholds.
===============================================================================
*/

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <HTTPClient.h>

#include "MAX30105.h"
#include "heartRate.h"

#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>

// ============================================================
// PIN CONFIGURATION
// ============================================================

#define I2C_SDA 8
#define I2C_SCL 9

#define BUZZER_PIN 6

// ============================================================
// SENSOR ADDRESSES
// ============================================================

#define MAX30205_ADDR 0x48
#define LIS3DH_ADDR 0x18

// ============================================================
// SERVER CONFIGURATION (local device API — unchanged)
// ============================================================

#define WEB_PORT 80
#define WS_PORT 81

// ============================================================
// WIFI CONFIGURATION
// ============================================================

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ============================================================
// NEOVITALS BACKEND SYNC CONFIGURATION (NEW)
// ============================================================

#define ENABLE_BACKEND_SYNC true   // set false to run device-only, no cloud/dashboard sync

const char* BACKEND_HOST = "http://10.144.57.3:5001"; // <-- set to your NeoVitals backend URL
const char* DEVICE_ID    = "neonest-esp32-01";          // <-- must match the dashboard's registered deviceId
const char* DEVICE_KEY   = "PASTE_DEVICE_KEY_HERE";      // <-- device key shown once at registration

const unsigned long BACKEND_SEND_INTERVAL_MS = 2000; // push to dashboard every 2s (local loop still runs at 500ms)

unsigned long lastBackendSend = 0;

// ============================================================
// TIMING
// ============================================================

const unsigned long UPDATE_INTERVAL_MS = 500;

// ============================================================
// MAX30102 CONTACT THRESHOLD
// ============================================================

const long IR_CONTACT_THRESHOLD = 50000;

// ============================================================
// SENSOR OBJECTS
// ============================================================

MAX30105 particleSensor;
Adafruit_LIS3DH lis = Adafruit_LIS3DH();

WebServer server(WEB_PORT);
WebSocketsServer webSocket(WS_PORT);

// ============================================================
// LIVE VARIABLES
// ============================================================

float beatsPerMinute = 0.0;
float beatAvg = 0.0;

int oxygen = 0;

float temperatureC = 0.0;

String motionState = "No Contact";
int motionScore = 0; // NEW — numeric 0-100 activity score, derived from the same
                       // accelerometer magnitude used for motionState below.
                       // The NeoVitals AI engine (anomaly/trend/sleep detection)
                       // needs a continuous number, not a text label.

bool skinContact = false;

unsigned long lastUpdate = 0;

// Beat timing
unsigned long lastBeatTime = 0;

// ============================================================
// DEVICE STATUS
// ============================================================

bool max30102OK = false;
bool max30205OK = false;
bool lis3dhOK = false;

// ============================================================
// MAX30205 TEMPERATURE
// ============================================================

float readMAX30205() {
  Wire.beginTransmission((uint8_t)MAX30205_ADDR);
  Wire.write((uint8_t)0x00);

  if (Wire.endTransmission(false) != 0) {
    return NAN;
  }

  uint8_t received = Wire.requestFrom(
    (uint8_t)MAX30205_ADDR,
    (uint8_t)2
  );

  if (received != 2) {
    return NAN;
  }

  uint8_t msb = Wire.read();
  uint8_t lsb = Wire.read();

  int16_t raw = (int16_t)((msb << 8) | lsb);

  return raw * 0.00390625f;
}

// ============================================================
// BUZZER
// ============================================================

void playTone(int frequency, int duration) {
  if (frequency <= 0 || duration <= 0) {
    return;
  }

  ledcWriteTone(0, frequency);
  delay(duration);
  ledcWriteTone(0, 0);
}

// ============================================================
// ALERT SYSTEM (local buzzer — unchanged; dashboard alerts are
// computed separately by the backend using the Device page's
// configurable thresholds, so the two can differ intentionally)
// ============================================================

void checkAlerts() {

  if (!skinContact) {
    return;
  }

  bool temperatureAlert =
    (temperatureC < 35.5 || temperatureC > 38.0);

  bool oxygenAlert =
    (oxygen > 0 && oxygen < 93);

  bool heartAlert =
    (
      beatAvg > 0 &&
      (beatAvg < 50 || beatAvg > 160)
    );

  bool motionAlert =
    (motionState == "Moving");

  // Priority:
  // Temperature
  // SpO2
  // Heart Rate
  // Motion

  if (temperatureAlert) {
    playTone(2000, 350);
  }
  else if (oxygenAlert) {
    playTone(900, 300);
  }
  else if (heartAlert) {
    playTone(1200, 180);
  }
  else if (motionAlert) {
    playTone(1500, 120);
  }
}

// ============================================================
// GENERATE LIVE JSON (local API/WebSocket — unchanged)
// ============================================================

String getLiveJSON() {

  String json;

  if (!skinContact) {

    json =
      "{"
      "\"device\":\"NeoNest\","
      "\"contact\":false,"
      "\"bpm\":0,"
      "\"spo2\":0,"
      "\"temp\":0,"
      "\"motion\":\"No Contact\","
      "\"timestamp\":" +
      String(millis()) +
      "}";
  }
  else {

    json =
      "{"
      "\"device\":\"NeoNest\","
      "\"contact\":true,"
      "\"bpm\":" +
      String(beatAvg, 1) +
      ","
      "\"spo2\":" +
      String(oxygen) +
      ","
      "\"temp\":" +
      String(temperatureC, 2) +
      ","
      "\"motion\":\"" +
      motionState +
      "\","
      "\"timestamp\":" +
      String(millis()) +
      "}";
  }

  return json;
}

// ============================================================
// GENERATE NEOVITALS BACKEND JSON (NEW)
// Field names match backend's /api/vitals/ingest body exactly:
// heartRate, spo2, temperature, motion (numeric), skinContact.
// Built with plain String concatenation — no JSON library, same
// approach as getLiveJSON() above.
// ============================================================

String getBackendJSON() {

  String json;

  json = "{";
  json += "\"heartRate\":" + String(beatAvg, 1) + ",";
  json += "\"spo2\":" + String(oxygen) + ",";
  json += "\"temperature\":" + String(temperatureC, 2) + ",";
  json += "\"motion\":" + String(motionScore) + ",";
  json += "\"skinContact\":" + String(skinContact ? "true" : "false");
  json += "}";

  return json;
}

// ============================================================
// SEND TO NEOVITALS BACKEND (NEW)
// Only sends while on real WiFi (WIFI_STA + connected) — skipped
// automatically while the device has fallen back to its own local
// access point (no internet in that mode, so there's nowhere to send).
// ============================================================

void sendToBackend() {

  if (!ENABLE_BACKEND_SYNC) {
    return;
  }

  if (WiFi.getMode() != WIFI_STA || WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_HOST) + "/api/vitals/ingest";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-id", DEVICE_ID);
  http.addHeader("x-device-key", DEVICE_KEY);

  String payload = getBackendJSON();
  int status = http.POST(payload);

  if (status > 0) {
    Serial.printf("[NeoVitals] synced (HTTP %d)\n", status);
  } else {
    Serial.printf("[NeoVitals] sync failed: %s\n", http.errorToString(status).c_str());
  }

  http.end();
}

// ============================================================
// HTTP API (local — unchanged)
// ============================================================

void handleAPIData() {

  String json = getLiveJSON();

  server.sendHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  server.sendHeader(
    "Cache-Control",
    "no-cache"
  );

  server.send(
    200,
    "application/json",
    json
  );
}

// ============================================================
// DEVICE STATUS API (local — unchanged)
// ============================================================

void handleDeviceStatus() {

  String json =
    "{"
    "\"device\":\"NeoNest\","
    "\"board\":\"Beetle ESP32-C3\","
    "\"wifi\":true,"
    "\"max30102\":" +
    String(max30102OK ? "true" : "false") +
    ","
    "\"max30205\":" +
    String(max30205OK ? "true" : "false") +
    ","
    "\"lis3dh\":" +
    String(lis3dhOK ? "true" : "false") +
    ","
    "\"buzzer\":true,"
    "\"ip\":\"" +
    WiFi.localIP().toString() +
    "\""
    "}";

  server.sendHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  server.send(
    200,
    "application/json",
    json
  );
}

// ============================================================
// ROOT API (local — unchanged)
// ============================================================

void handleRoot() {

  String response =
    "{"
    "\"device\":\"NeoNest\","
    "\"status\":\"online\","
    "\"message\":\"NeoNest sensor API is running\","
    "\"api\":\"/api/data\","
    "\"status_api\":\"/api/status\","
    "\"websocket\":\"ws://";

  response += WiFi.localIP().toString();
  response += ":81/\""
              "}";

  server.sendHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  server.send(
    200,
    "application/json",
    response
  );
}

// ============================================================
// WEBSOCKET EVENT (local — unchanged)
// ============================================================

void onWebSocketEvent(
  uint8_t clientNumber,
  WStype_t type,
  uint8_t* payload,
  size_t length
) {

  if (type == WStype_CONNECTED) {

    IPAddress clientIP =
      webSocket.remoteIP(clientNumber);

    Serial.printf(
      "WebSocket client %u connected: %d.%d.%d.%d\n",
      clientNumber,
      clientIP[0],
      clientIP[1],
      clientIP[2],
      clientIP[3]
    );

    String json = getLiveJSON();

    webSocket.sendTXT(
      clientNumber,
      json
    );
  }

  else if (type == WStype_DISCONNECTED) {

    Serial.printf(
      "WebSocket client %u disconnected\n",
      clientNumber
    );
  }
}

// ============================================================
// SEND LIVE DATA (local WebSocket broadcast — unchanged)
// ============================================================

void sendLiveData() {

  String json = getLiveJSON();

  webSocket.broadcastTXT(
    json
  );
}

// ============================================================
// UPDATE SENSORS (all sensor/contact/beat/SpO2 logic unchanged —
// only addition is computing motionScore alongside motionState)
// ============================================================

void updateSensors() {

  // ==========================================================
  // MAX30102
  // EXACT TESTED CONTACT LOGIC
  // ==========================================================

  long irValue =
    particleSensor.getIR();

  // ==========================================================
  // SKIN CONTACT
  // ==========================================================

  if (irValue < IR_CONTACT_THRESHOLD) {

    skinContact = false;

    beatsPerMinute = 0;

    beatAvg = 0;

    oxygen = 0;

    temperatureC = 0;

    motionState = "No Contact";
    motionScore = 0;

    lastBeatTime = 0;

    return;
  }

  skinContact = true;

  // ==========================================================
  // HEART RATE
  // SAME TESTED checkForBeat() LOGIC
  // ==========================================================

  if (checkForBeat(irValue)) {

    unsigned long now =
      millis();

    // First detected beat
    if (lastBeatTime == 0) {

      lastBeatTime =
        now;
    }

    else {

      unsigned long delta =
        now - lastBeatTime;

      lastBeatTime =
        now;

      if (delta > 0) {

        beatsPerMinute =
          60.0 /
          (delta / 1000.0);

        // Same tested range
        if (
          beatsPerMinute < 255 &&
          beatsPerMinute > 40
        ) {

          // Same tested smoothing
          beatAvg =
            (beatAvg * 0.9) +
            (beatsPerMinute * 0.1);
        }
      }
    }
  }

  // ==========================================================
  // SPO2
  // SAME TESTED PROTOTYPE MAPPING
  // ==========================================================

  long irValue2 =
    particleSensor.getIR();

  if (
    irValue2 >
    IR_CONTACT_THRESHOLD
  ) {

    long limitedIR =
      irValue2;

    if (
      limitedIR >
      120000
    ) {

      limitedIR =
        120000;
    }

    oxygen =
      map(
        limitedIR,
        50000,
        120000,
        90,
        100
      );

    oxygen =
      constrain(
        oxygen,
        0,
        100
      );
  }

  else {

    oxygen = 0;
  }

  // ==========================================================
  // MAX30205 TEMPERATURE
  // ==========================================================

  float t =
    readMAX30205();

  if (!isnan(t)) {

    temperatureC =
      t;

    max30205OK =
      true;
  }

  // ==========================================================
  // LIS3DH MOTION
  // ==========================================================

  if (lis3dhOK) {

    sensors_event_t event;

    lis.getEvent(
      &event
    );

    float magnitude =
      sqrt(
        event.acceleration.x *
        event.acceleration.x +

        event.acceleration.y *
        event.acceleration.y +

        event.acceleration.z *
        event.acceleration.z
      );

    float gravity =
      9.81f;

    float difference =
      fabs(
        magnitude -
        gravity
      );

    if (
      difference <
      0.12
    ) {

      motionState =
        "Still";
    }

    else if (
      difference <
      0.4
    ) {

      motionState =
        "Slight";
    }

    else {

      motionState =
        "Moving";
    }

    // NEW — numeric 0-100 activity score for the dashboard/AI engine,
    // derived from the same "difference" value used for motionState
    // above, so the two always agree. Scale factor chosen so the
    // Still/Slight/Moving boundaries (0.12g / 0.4g) land at roughly
    // 18 and 60 on the 0-100 scale.
    motionScore =
      constrain(
        (int)(difference * 150.0),
        0,
        100
      );
  }

  // ==========================================================
  // ALERTS
  // ==========================================================

  checkAlerts();
}

// ============================================================
// SENSOR INITIALIZATION (unchanged)
// ============================================================

void setupSensors() {

  // ==========================================================
  // MAX30102
  // ==========================================================

  if (
    !particleSensor.begin(
      Wire,
      I2C_SPEED_STANDARD
    )
  ) {

    Serial.println(
      "ERROR: MAX30102 not found."
    );

    max30102OK =
      false;
  }

  else {

    // IMPORTANT:
    // Tested working configuration

    particleSensor.setup();

    particleSensor.setPulseAmplitudeRed(
      0x3F
    );

    particleSensor.setPulseAmplitudeIR(
      0x3F
    );

    particleSensor.setPulseAmplitudeGreen(
      0x00
    );

    particleSensor.setSampleRate(
      100
    );

    particleSensor.setADCRange(
      4096
    );

    particleSensor.setPulseWidth(
      411
    );

    max30102OK =
      true;

    Serial.println(
      "MAX30102 initialized successfully."
    );
  }

  // ==========================================================
  // LIS3DH
  // ==========================================================

  if (
    lis.begin(
      LIS3DH_ADDR
    )
  ) {

    lis.setRange(
      LIS3DH_RANGE_2_G
    );

    lis.setDataRate(
      LIS3DH_DATARATE_25_HZ
    );

    lis3dhOK =
      true;

    Serial.println(
      "LIS3DH initialized successfully."
    );
  }

  else {

    lis3dhOK =
      false;

    Serial.println(
      "WARNING: LIS3DH not found."
    );
  }

  // ==========================================================
  // MAX30205
  // ==========================================================

  float testTemperature =
    readMAX30205();

  if (
    isnan(
      testTemperature
    )
  ) {

    max30205OK =
      false;

    Serial.println(
      "WARNING: MAX30205 not detected."
    );
  }

  else {

    max30205OK =
      true;

    temperatureC =
      testTemperature;

    Serial.print(
      "MAX30205 temperature: "
    );

    Serial.print(
      testTemperature
    );

    Serial.println(
      " \u00b0C"
    );
  }
}

// ============================================================
// WIFI SETUP (unchanged)
// ============================================================

void setupWiFi() {

  WiFi.mode(
    WIFI_STA
  );

  WiFi.begin(
    ssid,
    password
  );

  Serial.print(
    "Connecting to Wi-Fi"
  );

  unsigned long start =
    millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < 10000
  ) {

    delay(500);

    Serial.print(".");
  }

  Serial.println();

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    Serial.println(
      "================================"
    );

    Serial.println(
      "Wi-Fi connected!"
    );

    Serial.print(
      "NeoNest IP: "
    );

    Serial.println(
      WiFi.localIP()
    );

    Serial.println(
      "================================"
    );
  }

  else {

    Serial.println(
      "Wi-Fi connection failed."
    );

    Serial.println(
      "Starting NeoNest Access Point..."
    );

    WiFi.mode(
      WIFI_AP
    );

    WiFi.softAP(
      "NeoNest_AP",
      "neonest1234"
    );

    Serial.print(
      "NeoNest AP IP: "
    );

    Serial.println(
      WiFi.softAPIP()
    );

    Serial.println(
      "NOTE: NeoVitals backend sync is skipped while in local AP mode"
      " (no internet path) — reconnect to home Wi-Fi to resume syncing."
    );
  }
}

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
    115200
  );

  delay(1000);

  Serial.println();
  Serial.println(
    "========================================"
  );

  Serial.println(
    "       NEONEST DEVICE STARTING"
  );

  Serial.println(
    "========================================"
  );

  // ==========================================================
  // I2C
  // ==========================================================

  Wire.begin(
    I2C_SDA,
    I2C_SCL
  );

  Serial.println(
    "I2C initialized"
  );

  Serial.println(
    "SDA = GPIO 8"
  );

  Serial.println(
    "SCL = GPIO 9"
  );

  // ==========================================================
  // BUZZER
  // ==========================================================

  ledcSetup(
    0,
    2000,
    8
  );

  ledcAttachPin(
    BUZZER_PIN,
    0
  );

  ledcWriteTone(
    0,
    0
  );

  Serial.println(
    "Buzzer initialized on GPIO6"
  );

  // ==========================================================
  // SENSORS
  // ==========================================================

  setupSensors();

  // ==========================================================
  // WIFI
  // ==========================================================

  setupWiFi();

  // ==========================================================
  // HTTP API (local)
  // ==========================================================

  server.on(
    "/",
    handleRoot
  );

  server.on(
    "/api/data",
    handleAPIData
  );

  server.on(
    "/api/status",
    handleDeviceStatus
  );

  server.begin();

  Serial.println(
    "HTTP API started on port 80"
  );

  // ==========================================================
  // WEBSOCKET (local)
  // ==========================================================

  webSocket.begin();

  webSocket.onEvent(
    onWebSocketEvent
  );

  Serial.println(
    "WebSocket started on port 81"
  );

  // ==========================================================
  // READY
  // ==========================================================

  Serial.println();
  Serial.println(
    "========================================"
  );

  Serial.println(
    "         NEONEST READY"
  );

  Serial.println(
    "========================================"
  );

  Serial.println(
    "Device API:"
  );

  Serial.print(
    "http://"
  );

  Serial.print(
    WiFi.localIP()
  );

  Serial.println(
    "/api/data"
  );

  Serial.println();

  Serial.println(
    "Device status:"
  );

  Serial.print(
    "http://"
  );

  Serial.print(
    WiFi.localIP()
  );

  Serial.println(
    "/api/status"
  );

  Serial.println();

  Serial.print(
    "WebSocket:"
  );

  Serial.print(
    "ws://"
  );

  Serial.print(
    WiFi.localIP()
  );

  Serial.println(
    ":81/"
  );

  Serial.println(
    "========================================"
  );

  if (ENABLE_BACKEND_SYNC) {
    Serial.print("NeoVitals backend sync: ");
    Serial.print(BACKEND_HOST);
    Serial.println("/api/vitals/ingest");
  } else {
    Serial.println("NeoVitals backend sync: DISABLED (device-only mode)");
  }

  Serial.println(
    "========================================"
  );

  lastUpdate =
    millis();

  lastBackendSend =
    millis();
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {

  // HTTP server (local)
  server.handleClient();

  // WebSocket (local)
  webSocket.loop();

  unsigned long now =
    millis();

  if (
    now -
    lastUpdate >=
    UPDATE_INTERVAL_MS
  ) {

    lastUpdate =
      now;

    // Read sensors
    updateSensors();

    // Send live data (local WebSocket)
    sendLiveData();

    // Serial monitor
    Serial.print(
      "Contact: "
    );

    Serial.print(
      skinContact ?
      "YES" :
      "NO"
    );

    Serial.print(
      " | BPM: "
    );

    Serial.print(
      beatAvg,
      1
    );

    Serial.print(
      " | SpO2: "
    );

    Serial.print(
      oxygen
    );

    Serial.print(
      " | Temp: "
    );

    Serial.print(
      temperatureC,
      2
    );

    Serial.print(
      " C | Motion: "
    );

    Serial.print(
      motionState
    );

    Serial.print(
      " ("
    );

    Serial.print(
      motionScore
    );

    Serial.print(
      "/100) | IR: "
    );

    Serial.println(
      particleSensor.getIR()
    );
  }

  // NEW — independent timer: push to the NeoVitals dashboard every
  // BACKEND_SEND_INTERVAL_MS (default 2s), decoupled from the 500ms
  // local sensor/buzzer loop so cloud sync can't affect buzzer timing.
  if (
    now -
    lastBackendSend >=
    BACKEND_SEND_INTERVAL_MS
  ) {

    lastBackendSend =
      now;

    sendToBackend();
  }

  yield();
}

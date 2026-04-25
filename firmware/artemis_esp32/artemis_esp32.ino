/*
 * ═══════════════════════════════════════════════════════════════
 * Artemis ESP32 Firmware — Smart Home Sensor & Relay Controller
 * ═══════════════════════════════════════════════════════════════
 *
 * REST API endpoints:
 *   GET  /api/sensors       → all sensor readings (JSON)
 *   GET  /api/status        → device health + uptime
 *   POST /api/relay/{pin}   → control relay (body: {"state": "on"|"off"})
 *   GET  /api/relays        → current state of all relays
 *
 * Hardware wiring:
 *   DHT22  → GPIO 4  (temperature + humidity)
 *   LDR    → GPIO 34 (analog light level)
 *   PIR    → GPIO 27 (motion detection)
 *   Relay1 → GPIO 26 (Fan)
 *   Relay2 → GPIO 25 (LED Strip)
 *   Relay3 → GPIO 33 (Spare)
 *
 * Dependencies (install via Arduino Library Manager):
 *   - WiFi (built-in)
 *   - WebServer (built-in)
 *   - ArduinoJson v7+
 *   - DHT sensor library by Adafruit
 *   - ESPmDNS (built-in)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESPmDNS.h>

// ═══════════════════════════════════════════════
// Configuration — UPDATE THESE
// ═══════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* DEVICE_NAME   = "artemis-hub";  // mDNS: http://artemis-hub.local
const char* AUTH_TOKEN     = "";            // Optional: set to match ESP32_AUTH_TOKEN in backend .env

// ═══════════════════════════════════════════════
// Pin Definitions
// ═══════════════════════════════════════════════
#define DHT_PIN       4
#define DHT_TYPE      DHT22
#define LDR_PIN       34
#define PIR_PIN       27

// Relay pins (active LOW for most relay modules)
#define RELAY_FAN     26
#define RELAY_LED     25
#define RELAY_SPARE   33

const int RELAY_PINS[] = { RELAY_FAN, RELAY_LED, RELAY_SPARE };
const char* RELAY_NAMES[] = { "fan", "led_strip", "spare" };
const int NUM_RELAYS = 3;

// ═══════════════════════════════════════════════
// Globals
// ═══════════════════════════════════════════════
WebServer server(80);
DHT dht(DHT_PIN, DHT_TYPE);

float lastTemperature = 0.0;
float lastHumidity    = 0.0;
int   lastLightLevel  = 0;
bool  lastMotion      = false;
unsigned long bootTime = 0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000; // Read sensors every 2s


// ═══════════════════════════════════════════════
// Utility: CORS Headers
// ═══════════════════════════════════════════════
void setCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ═══════════════════════════════════════════════
// Utility: Auth Check (optional)
// ═══════════════════════════════════════════════
bool checkAuth() {
  if (strlen(AUTH_TOKEN) == 0) return true; // No auth configured
  
  String authHeader = server.header("Authorization");
  if (authHeader.startsWith("Bearer ")) {
    String token = authHeader.substring(7);
    return token == AUTH_TOKEN;
  }
  return false;
}

void sendUnauthorized() {
  setCORSHeaders();
  server.send(401, "application/json", "{\"error\": \"Unauthorized\"}");
}

// ═══════════════════════════════════════════════
// Sensor Reading
// ═══════════════════════════════════════════════
void readSensors() {
  if (millis() - lastSensorRead < SENSOR_INTERVAL) return;
  lastSensorRead = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  
  if (!isnan(t)) lastTemperature = t;
  if (!isnan(h)) lastHumidity = h;
  
  lastLightLevel = analogRead(LDR_PIN);
  lastMotion = digitalRead(PIR_PIN) == HIGH;
}

// ═══════════════════════════════════════════════
// GET /api/sensors
// ═══════════════════════════════════════════════
void handleGetSensors() {
  setCORSHeaders();
  if (!checkAuth()) { sendUnauthorized(); return; }

  JsonDocument doc;
  
  JsonObject temp = doc["temperature"].to<JsonObject>();
  temp["value"] = lastTemperature;
  temp["unit"]  = "°C";

  JsonObject hum = doc["humidity"].to<JsonObject>();
  hum["value"] = lastHumidity;
  hum["unit"]  = "%";

  JsonObject light = doc["light_level"].to<JsonObject>();
  light["value"] = map(lastLightLevel, 0, 4095, 0, 100); // Normalize to 0-100%
  light["unit"]  = "%";

  JsonObject motion = doc["motion"].to<JsonObject>();
  motion["value"]    = lastMotion;
  motion["detected"] = lastMotion ? "yes" : "no";

  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

// ═══════════════════════════════════════════════
// GET /api/status
// ═══════════════════════════════════════════════
void handleGetStatus() {
  setCORSHeaders();
  if (!checkAuth()) { sendUnauthorized(); return; }

  JsonDocument doc;
  doc["device"]       = DEVICE_NAME;
  doc["uptime_ms"]    = millis() - bootTime;
  doc["uptime_min"]   = (millis() - bootTime) / 60000;
  doc["free_heap"]    = ESP.getFreeHeap();
  doc["wifi_rssi"]    = WiFi.RSSI();
  doc["wifi_ssid"]    = WiFi.SSID();
  doc["ip_address"]   = WiFi.localIP().toString();
  doc["mac_address"]  = WiFi.macAddress();
  doc["firmware"]     = "1.0.0";
  doc["status"]       = "online";

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

// ═══════════════════════════════════════════════
// GET /api/relays — current state of all relays
// ═══════════════════════════════════════════════
void handleGetRelays() {
  setCORSHeaders();
  if (!checkAuth()) { sendUnauthorized(); return; }

  JsonDocument doc;
  JsonArray relays = doc["relays"].to<JsonArray>();
  
  for (int i = 0; i < NUM_RELAYS; i++) {
    JsonObject relay = relays.add<JsonObject>();
    relay["pin"]   = RELAY_PINS[i];
    relay["name"]  = RELAY_NAMES[i];
    relay["state"] = (digitalRead(RELAY_PINS[i]) == LOW) ? "on" : "off"; // Active LOW
  }

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

// ═══════════════════════════════════════════════
// POST /api/relay/{pin} — body: {"state": "on"|"off"}
// ═══════════════════════════════════════════════
void handlePostRelay() {
  setCORSHeaders();
  if (!checkAuth()) { sendUnauthorized(); return; }

  // Extract pin from URI: /api/relay/26
  String uri = server.uri();
  int lastSlash = uri.lastIndexOf('/');
  int pin = uri.substring(lastSlash + 1).toInt();

  // Validate pin
  bool validPin = false;
  String pinName = "";
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (RELAY_PINS[i] == pin) {
      validPin = true;
      pinName = RELAY_NAMES[i];
      break;
    }
  }

  if (!validPin) {
    server.send(400, "application/json", "{\"error\": \"Invalid relay pin\"}");
    return;
  }

  // Parse body
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\": \"Invalid JSON body\"}");
    return;
  }

  String state = doc["state"] | "";
  if (state != "on" && state != "off") {
    server.send(400, "application/json", "{\"error\": \"state must be 'on' or 'off'\"}");
    return;
  }

  // Execute: Active LOW relay
  digitalWrite(pin, (state == "on") ? LOW : HIGH);

  // Response
  JsonDocument resp;
  resp["pin"]    = pin;
  resp["name"]   = pinName;
  resp["state"]  = state;
  resp["result"] = "success";

  String output;
  serializeJson(resp, output);
  server.send(200, "application/json", output);
}

// ═══════════════════════════════════════════════
// OPTIONS handler for CORS preflight
// ═══════════════════════════════════════════════
void handleOptions() {
  setCORSHeaders();
  server.send(204);
}

// ═══════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  bootTime = millis();

  // Initialize sensor pins
  dht.begin();
  pinMode(LDR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);

  // Initialize relay pins (HIGH = OFF for active-LOW relays)
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH);
  }

  // Connect to WiFi
  Serial.printf("\n[Artemis] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[Artemis] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  // Start mDNS
  if (MDNS.begin(DEVICE_NAME)) {
    Serial.printf("[Artemis] mDNS started: http://%s.local\n", DEVICE_NAME);
    MDNS.addService("http", "tcp", 80);
  }

  // Collect auth headers
  const char* headerKeys[] = { "Authorization" };
  server.collectHeaders(headerKeys, 1);

  // Register routes
  server.on("/api/sensors",    HTTP_GET,     handleGetSensors);
  server.on("/api/status",     HTTP_GET,     handleGetStatus);
  server.on("/api/relays",     HTTP_GET,     handleGetRelays);
  server.on("/api/sensors",    HTTP_OPTIONS, handleOptions);
  server.on("/api/status",     HTTP_OPTIONS, handleOptions);
  server.on("/api/relays",     HTTP_OPTIONS, handleOptions);

  // Relay route uses onNotFound for dynamic pin paths
  server.onNotFound([]() {
    if (server.uri().startsWith("/api/relay/")) {
      if (server.method() == HTTP_POST) {
        handlePostRelay();
      } else if (server.method() == HTTP_OPTIONS) {
        handleOptions();
      } else {
        server.send(405, "application/json", "{\"error\": \"Method not allowed\"}");
      }
    } else {
      server.send(404, "application/json", "{\"error\": \"Not found\"}");
    }
  });

  server.begin();
  Serial.println("[Artemis] HTTP server started on port 80");
  Serial.println("[Artemis] Endpoints:");
  Serial.println("  GET  /api/sensors");
  Serial.println("  GET  /api/status");
  Serial.println("  GET  /api/relays");
  Serial.println("  POST /api/relay/{pin}");
}

// ═══════════════════════════════════════════════
// Loop
// ═══════════════════════════════════════════════
void loop() {
  server.handleClient();
  readSensors();
}

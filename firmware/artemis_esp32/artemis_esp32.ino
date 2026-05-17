/*
 * Artemis ESP32 Firmware - Smart Home Sensor & Device Controller
 *
 * REST API endpoints:
 *   GET  /api/sensors       -> sensor readings used by the backend poller
 *   GET  /api/status        -> device health + uptime
 *   GET  /api/relays        -> logical Artemis devices keyed by logical pin
 *   GET  /api/devices       -> backend-like device payloads
 *   POST /api/relay/{pin}   -> power and capability commands
 *
 * Command body examples:
 *   {"state": "on"}
 *   {"action": "set", "payload": {"brightness": 80, "color_temp": 4000}}
 *   {"action": "set", "payload": {"speed": 65}}
 *
 * Physical relays:
 *   Relay1 -> GPIO 26 (logical pin 40, Studio Fan)
 *   Relay2 -> GPIO 25 (logical pin 41, Desk RGB Strip)
 *   Relay3 -> GPIO 33 (logical pin 42, Spare Relay)
 *
 * Other logical devices are state-only on this board. They let the backend use
 * the same device/capability contract against real firmware and the simulator.
 */

#include <ArduinoJson.h>
#include <DHT.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <WiFi.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

// Configuration - update these before flashing.
const char *WIFI_SSID =
    "Twilight Techie ✨👑✨"; // Note: if your SSID has emoji, add them here
const char *WIFI_PASSWORD = "excalibur7";
const char *DEVICE_NAME = "artemis-hub"; // mDNS: http://artemis-hub.local
const char *AUTH_TOKEN =
    ""; // Optional: set to match ESP32_AUTH_TOKEN in backend .env
const char *BACKEND_URL =
    "https://nondepreciatively-lancelike-berneice.ngrok-free.dev/api/v1/"
    "sensors/ingest";

// Sensor pins.
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define LDR_PIN 34
#define PIR_PIN 27

// Physical relay GPIO pins. Most relay modules are active LOW.
#define GPIO_NONE -1
#define RELAY_FAN 26
#define RELAY_LED 25
#define RELAY_SPARE 33

struct DeviceConfig {
  int logicalPin;
  int gpioPin;
  const char *name;
  const char *room;
  const char *roomId;
  const char *deviceType;
  const char *icon;
};

struct DeviceState {
  bool isOn;
  int brightness;
  int colorTemp;
  String color;
  int speed;
  int temperature;
  int volume;
  String mode;
  bool armed;
};

const DeviceConfig DEVICES[] = {
    {10, GPIO_NONE, "Ceiling Light", "Living Room", "room-living", "light",
     "fa-lightbulb"},
    {11, GPIO_NONE, "Ambient LED Strip", "Living Room", "room-living", "light",
     "fa-wand-magic-sparkles"},
    {12, GPIO_NONE, "AC Unit", "Living Room", "room-living", "climate",
     "fa-snowflake"},
    {13, GPIO_NONE, "Smart TV", "Living Room", "room-living", "media", "fa-tv"},
    {20, GPIO_NONE, "Bedside Lamp", "Bedroom", "room-bedroom", "light",
     "fa-lightbulb"},
    {21, GPIO_NONE, "Ceiling Fan", "Bedroom", "room-bedroom", "fan", "fa-fan"},
    {22, GPIO_NONE, "Security Camera", "Bedroom", "room-bedroom", "security",
     "fa-video"},
    {30, GPIO_NONE, "Kitchen Downlights", "Kitchen", "room-kitchen", "light",
     "fa-lightbulb"},
    {31, GPIO_NONE, "Coffee Maker Plug", "Kitchen", "room-kitchen", "switch",
     "fa-plug"},
    {40, RELAY_FAN, "Studio Fan", "Studio", "room-studio", "fan", "fa-fan"},
    {41, RELAY_LED, "Desk RGB Strip", "Studio", "room-studio", "light",
     "fa-wand-magic-sparkles"},
    {42, RELAY_SPARE, "Spare Relay", "Studio", "room-studio", "switch",
     "fa-plug"},
};

const int NUM_DEVICES = sizeof(DEVICES) / sizeof(DEVICES[0]);

WebServer server(80);
DHT dht(DHT_PIN, DHT_TYPE);
DeviceState deviceStates[NUM_DEVICES];

float lastTemperature = 0.0;
float lastHumidity = 0.0;
int lastLightLevel = 0;
bool lastMotion = false;
int lastSmokePpm = 0;
unsigned long bootTime = 0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000;

void setCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers",
                    "Content-Type, Authorization");
}

bool checkAuth() {
  if (strlen(AUTH_TOKEN) == 0)
    return true;

  String authHeader = server.header("Authorization");
  if (authHeader.startsWith("Bearer ")) {
    String token = authHeader.substring(7);
    return token == AUTH_TOKEN;
  }
  return false;
}

void sendUnauthorized() {
  setCORSHeaders();
  server.send(401, "application/json", "{\"error\":\"Unauthorized\"}");
}

bool isType(int index, const char *type) {
  return strcmp(DEVICES[index].deviceType, type) == 0;
}

int clampInt(int value, int minimum, int maximum) {
  if (value < minimum)
    return minimum;
  if (value > maximum)
    return maximum;
  return value;
}

int findDeviceByPin(int pin) {
  for (int i = 0; i < NUM_DEVICES; i++) {
    if (DEVICES[i].logicalPin == pin)
      return i;
  }

  // Backward compatibility for old direct-GPIO calls such as /api/relay/26.
  for (int i = 0; i < NUM_DEVICES; i++) {
    if (DEVICES[i].gpioPin == pin)
      return i;
  }

  return -1;
}

String powerState(int index) { return deviceStates[index].isOn ? "on" : "off"; }

bool jsonToBool(JsonVariantConst value, bool fallback) {
  if (value.is<bool>())
    return value.as<bool>();
  if (value.is<int>())
    return value.as<int>() != 0;

  String text = value.as<String>();
  text.toLowerCase();
  if (text == "true" || text == "on" || text == "1" || text == "activate")
    return true;
  if (text == "false" || text == "off" || text == "0" || text == "deactivate")
    return false;
  return fallback;
}

int jsonToInt(JsonVariantConst value, int fallback) {
  if (value.is<int>())
    return value.as<int>();
  if (value.is<float>())
    return (int)round(value.as<float>());

  String text = value.as<String>();
  if (text.length() == 0)
    return fallback;
  return text.toInt();
}

String jsonToString(JsonVariantConst value, const String &fallback) {
  if (value.isNull())
    return fallback;
  return value.as<String>();
}

void syncPhysicalRelay(int index) {
  int gpio = DEVICES[index].gpioPin;
  if (gpio == GPIO_NONE)
    return;
  digitalWrite(gpio, deviceStates[index].isOn ? LOW : HIGH);
}

void initializeDeviceStates() {
  for (int i = 0; i < NUM_DEVICES; i++) {
    deviceStates[i].isOn = false;
    deviceStates[i].brightness = 100;
    deviceStates[i].colorTemp = 4000;
    deviceStates[i].color = "#FFFFFF";
    deviceStates[i].speed = 1;
    deviceStates[i].temperature = 22;
    deviceStates[i].volume = 50;
    deviceStates[i].mode = "";
    deviceStates[i].armed = false;
  }

  deviceStates[0].isOn = true;
  deviceStates[0].brightness = 80;
  deviceStates[0].colorTemp = 4000;
  deviceStates[1].isOn = true;
  deviceStates[1].brightness = 60;
  deviceStates[1].color = "#74b1ff";
  deviceStates[2].isOn = true;
  deviceStates[2].temperature = 22;
  deviceStates[2].mode = "cool";
  deviceStates[3].isOn = false;
  deviceStates[3].volume = 35;
  deviceStates[4].isOn = false;
  deviceStates[4].brightness = 40;
  deviceStates[4].color = "#FF716C";
  deviceStates[5].isOn = true;
  deviceStates[5].speed = 2;
  deviceStates[6].isOn = true;
  deviceStates[6].armed = true;
  deviceStates[7].isOn = true;
  deviceStates[7].brightness = 2;
  deviceStates[8].isOn = false;
  deviceStates[9].isOn = false;
  deviceStates[9].speed = 35;
  deviceStates[10].isOn = true;
  deviceStates[10].brightness = 75;
  deviceStates[10].color = "#b884ff";
  deviceStates[10].colorTemp = 4000;
  deviceStates[11].isOn = false;
}

void writeCapabilities(JsonObject caps, int index) {
  caps["power"] = true;

  if (isType(index, "light")) {
    if (DEVICES[index].logicalPin == 30) {
      JsonObject brightness = caps["brightness"].to<JsonObject>();
      brightness["mode"] = "steps";
      brightness["count"] = 3;
      JsonArray labels = brightness["labels"].to<JsonArray>();
      labels.add("Low");
      labels.add("Med");
      labels.add("High");
    } else {
      caps["brightness"] = true;
    }

    if (DEVICES[index].logicalPin == 10 || DEVICES[index].logicalPin == 41) {
      caps["color_temp"] = true;
    }
    if (DEVICES[index].logicalPin == 11 || DEVICES[index].logicalPin == 20 ||
        DEVICES[index].logicalPin == 41) {
      caps["rgb_color"] = true;
    }
    return;
  }

  if (isType(index, "fan")) {
    JsonObject speed = caps["speed"].to<JsonObject>();
    if (DEVICES[index].logicalPin == 40) {
      speed["mode"] = "percentage";
      speed["min"] = 0;
      speed["max"] = 100;
    } else {
      speed["mode"] = "steps";
      speed["count"] = 3;
      caps["speed_steps"] = 3;
    }
    return;
  }

  if (isType(index, "climate")) {
    JsonObject temp = caps["temperature"].to<JsonObject>();
    temp["min"] = 16;
    temp["max"] = 30;
    temp["step"] = 1;
    JsonArray modes = caps["modes"].to<JsonArray>();
    modes.add("cool");
    modes.add("heat");
    modes.add("auto");
    return;
  }

  if (isType(index, "media")) {
    JsonObject volume = caps["volume"].to<JsonObject>();
    volume["mode"] = "percentage";
    volume["min"] = 0;
    volume["max"] = 100;
    return;
  }

  if (isType(index, "security")) {
    caps["motion_detection"] = true;
    caps["night_vision"] = true;
  }
}

void writeDeviceState(JsonObject state, int index) {
  state["is_on"] = deviceStates[index].isOn;

  if (isType(index, "light")) {
    state["brightness"] = deviceStates[index].brightness;
    if (DEVICES[index].logicalPin == 10 || DEVICES[index].logicalPin == 41) {
      state["color_temp"] = deviceStates[index].colorTemp;
    }
    if (DEVICES[index].logicalPin == 11 || DEVICES[index].logicalPin == 20 ||
        DEVICES[index].logicalPin == 41) {
      state["color"] = deviceStates[index].color;
    }
    return;
  }

  if (isType(index, "fan")) {
    state["speed"] = deviceStates[index].speed;
    return;
  }

  if (isType(index, "climate")) {
    state["temperature"] = deviceStates[index].temperature;
    state["mode"] = deviceStates[index].mode;
    return;
  }

  if (isType(index, "media")) {
    state["volume"] = deviceStates[index].volume;
    return;
  }

  if (isType(index, "security")) {
    state["armed"] = deviceStates[index].armed;
  }
}

void writeRelayPayload(JsonObject target, int index) {
  const DeviceConfig &device = DEVICES[index];
  target["pin"] = device.logicalPin;
  target["name"] = device.name;
  target["room"] = device.room;
  target["room_id"] = device.roomId;
  target["state"] = powerState(index);
  target["device_type"] = device.deviceType;
  target["type"] = device.deviceType;
  target["icon"] = device.icon;
  target["wired"] = device.gpioPin != GPIO_NONE;
  if (device.gpioPin != GPIO_NONE)
    target["gpio_pin"] = device.gpioPin;

  JsonObject caps = target["capabilities"].to<JsonObject>();
  writeCapabilities(caps, index);

  JsonObject state = target["device_state"].to<JsonObject>();
  writeDeviceState(state, index);
}

void writeBackendDevice(JsonObject target, int index) {
  const DeviceConfig &device = DEVICES[index];
  target["id"] = String("esp32-") + String(device.logicalPin);
  target["name"] = device.name;
  target["device_type"] = device.deviceType;
  target["protocol"] = "http";
  target["endpoint"] = String("/api/relay/") + String(device.logicalPin);
  target["is_online"] = true;
  target["room_id"] = device.roomId;
  target["pin"] = device.logicalPin;
  target["wired"] = device.gpioPin != GPIO_NONE;

  JsonObject caps = target["capabilities"].to<JsonObject>();
  writeCapabilities(caps, index);

  JsonObject state = target["state"].to<JsonObject>();
  writeDeviceState(state, index);
}

void writeSensorBackendDevice(JsonObject target, const char *id,
                              const char *name, const char *roomId,
                              float reading, const char *unit,
                              const char *readingType) {
  target["id"] = id;
  target["name"] = name;
  target["device_type"] = "sensor";
  target["protocol"] = "http";
  target["endpoint"] = nullptr;
  target["is_online"] = true;
  target["room_id"] = roomId;
  target["pin"] = nullptr;
  target["wired"] = true;

  JsonObject caps = target["capabilities"].to<JsonObject>();
  JsonArray readings = caps["reading_types"].to<JsonArray>();
  readings.add(readingType);

  JsonObject state = target["state"].to<JsonObject>();
  state["is_on"] = true;
  state["reading"] = reading;
  state["unit"] = unit;
}

void applyPayloadValue(int index, const char *key, JsonVariantConst value) {
  if (strcmp(key, "is_on") == 0) {
    deviceStates[index].isOn = jsonToBool(value, deviceStates[index].isOn);
    return;
  }

  if (strcmp(key, "brightness") == 0 && isType(index, "light")) {
    int maxBrightness = DEVICES[index].logicalPin == 30 ? 3 : 100;
    int minBrightness = DEVICES[index].logicalPin == 30 ? 1 : 0;
    deviceStates[index].brightness =
        clampInt(jsonToInt(value, deviceStates[index].brightness),
                 minBrightness, maxBrightness);
    return;
  }

  if (strcmp(key, "color_temp") == 0 && isType(index, "light")) {
    deviceStates[index].colorTemp =
        clampInt(jsonToInt(value, deviceStates[index].colorTemp), 2700, 6500);
    return;
  }

  if (strcmp(key, "color") == 0 && isType(index, "light")) {
    deviceStates[index].color = jsonToString(value, deviceStates[index].color);
    return;
  }

  if (strcmp(key, "speed") == 0 && isType(index, "fan")) {
    int maxSpeed = DEVICES[index].logicalPin == 40 ? 100 : 3;
    int minSpeed = DEVICES[index].logicalPin == 40 ? 0 : 1;
    deviceStates[index].speed = clampInt(
        jsonToInt(value, deviceStates[index].speed), minSpeed, maxSpeed);
    return;
  }

  if (strcmp(key, "temperature") == 0 && isType(index, "climate")) {
    deviceStates[index].temperature =
        clampInt(jsonToInt(value, deviceStates[index].temperature), 16, 30);
    return;
  }

  if (strcmp(key, "volume") == 0 && isType(index, "media")) {
    deviceStates[index].volume =
        clampInt(jsonToInt(value, deviceStates[index].volume), 0, 100);
    return;
  }

  if (strcmp(key, "mode") == 0 && isType(index, "climate")) {
    deviceStates[index].mode = jsonToString(value, deviceStates[index].mode);
    return;
  }

  if (strcmp(key, "armed") == 0 && isType(index, "security")) {
    deviceStates[index].armed = jsonToBool(value, deviceStates[index].armed);
  }
}

void applyPayloadObject(int index, JsonObjectConst payload) {
  for (JsonPairConst kv : payload) {
    applyPayloadValue(index, kv.key().c_str(), kv.value());
  }
}

void applyScalarValue(int index, const String &action, JsonVariantConst value) {
  if (action == "set_brightness") {
    applyPayloadValue(index, "brightness", value);
  } else if (action == "set_color") {
    applyPayloadValue(index, "color", value);
  } else if (action == "set_speed") {
    applyPayloadValue(index, "speed", value);
  } else if (action == "set_temperature") {
    applyPayloadValue(index, "temperature", value);
  } else if (action == "set_volume") {
    applyPayloadValue(index, "volume", value);
  } else if (action == "set") {
    if (isType(index, "light")) {
      applyPayloadValue(index, "brightness", value);
    } else if (isType(index, "fan")) {
      applyPayloadValue(index, "speed", value);
    } else if (isType(index, "climate")) {
      applyPayloadValue(index, "temperature", value);
    } else if (isType(index, "media")) {
      applyPayloadValue(index, "volume", value);
    }
  }
}

void pushSensorData(float t, float h, int light, bool motion) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.setInsecure(); // Skip cert validation for ngrok HTTPS (dev only)
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["temperature"] = t;
    doc["humidity"] = h;
    doc["light_level"] = map(light, 0, 4095, 0, 100);
    doc["motion"] = motion;

    String payload;
    serializeJson(doc, payload);

    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      Serial.printf("[Artemis] Pushed sensor data. Response: %d\n",
                    httpResponseCode);
    } else {
      Serial.printf("[Artemis] Error pushing sensor data: %s\n",
                    http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
}

void readSensors() {
  if (millis() - lastSensorRead < SENSOR_INTERVAL)
    return;
  lastSensorRead = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int l = analogRead(LDR_PIN);
  bool m = digitalRead(PIR_PIN) == HIGH;

  bool changed = false;

  if (!isnan(t) && abs(t - lastTemperature) >= 0.5) {
    lastTemperature = t;
    changed = true;
  }
  if (!isnan(h) && abs(h - lastHumidity) >= 5.0) {
    lastHumidity = h;
    changed = true;
  }
  if (abs(l - lastLightLevel) >= 400) { // Approx 10% change
    lastLightLevel = l;
    changed = true;
  }
  if (m != lastMotion) {
    lastMotion = m;
    changed = true;
  }

  if (changed) {
    pushSensorData(lastTemperature, lastHumidity, lastLightLevel, lastMotion);
  }
}

void handleGetSensors() {
  setCORSHeaders();
  if (!checkAuth()) {
    sendUnauthorized();
    return;
  }

  JsonDocument doc;

  JsonObject temp = doc["temperature"].to<JsonObject>();
  temp["value"] = lastTemperature;
  temp["unit"] = "deg C";

  JsonObject hum = doc["humidity"].to<JsonObject>();
  hum["value"] = lastHumidity;
  hum["unit"] = "%";

  JsonObject light = doc["light_level"].to<JsonObject>();
  light["value"] = map(lastLightLevel, 0, 4095, 0, 100);
  light["unit"] = "%";

  JsonObject motion = doc["motion"].to<JsonObject>();
  motion["value"] = lastMotion;
  motion["detected"] = lastMotion ? "yes" : "no";

  JsonObject smoke = doc["smoke"].to<JsonObject>();
  smoke["value"] = lastSmokePpm;
  smoke["unit"] = "ppm";

  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handleGetStatus() {
  setCORSHeaders();
  if (!checkAuth()) {
    sendUnauthorized();
    return;
  }

  JsonDocument doc;
  doc["device"] = DEVICE_NAME;
  doc["uptime_ms"] = millis() - bootTime;
  doc["uptime_min"] = (millis() - bootTime) / 60000;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["wifi_ssid"] = WiFi.SSID();
  doc["ip_address"] = WiFi.localIP().toString();
  doc["mac_address"] = WiFi.macAddress();
  doc["firmware"] = "1.1.0";
  doc["status"] = "online";
  doc["capability_contract"] = "device_type/capabilities/state";
  doc["logical_devices"] = NUM_DEVICES;

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handleGetRelays() {
  setCORSHeaders();
  if (!checkAuth()) {
    sendUnauthorized();
    return;
  }

  JsonDocument doc;
  for (int i = 0; i < NUM_DEVICES; i++) {
    char key[8];
    snprintf(key, sizeof(key), "%d", DEVICES[i].logicalPin);
    JsonObject relay = doc[key].to<JsonObject>();
    writeRelayPayload(relay, i);
  }

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handleGetDevices() {
  setCORSHeaders();
  if (!checkAuth()) {
    sendUnauthorized();
    return;
  }

  JsonDocument doc;
  JsonArray devices = doc.to<JsonArray>();
  for (int i = 0; i < NUM_DEVICES; i++) {
    JsonObject item = devices.add<JsonObject>();
    writeBackendDevice(item, i);
  }

  JsonObject tempSensor = devices.add<JsonObject>();
  writeSensorBackendDevice(tempSensor, "esp32-temp-sensor", "Temp Sensor",
                           "room-living", lastTemperature, "deg C",
                           "temperature");
  JsonObject tempCaps = tempSensor["capabilities"].as<JsonObject>();
  JsonArray tempReadings = tempCaps["reading_types"].as<JsonArray>();
  tempReadings.add("humidity");
  JsonObject tempSensorState = tempSensor["state"].as<JsonObject>();
  tempSensorState["humidity"] = lastHumidity;

  JsonObject smokeSensor = devices.add<JsonObject>();
  writeSensorBackendDevice(smokeSensor, "esp32-smoke-detector",
                           "Smoke Detector", "room-kitchen", lastSmokePpm,
                           "ppm", "smoke");

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handlePostRelay() {
  setCORSHeaders();
  if (!checkAuth()) {
    sendUnauthorized();
    return;
  }

  String uri = server.uri();
  int lastSlash = uri.lastIndexOf('/');
  int requestedPin = uri.substring(lastSlash + 1).toInt();
  int index = findDeviceByPin(requestedPin);

  if (index < 0) {
    server.send(400, "application/json",
                "{\"error\":\"Invalid Artemis logical pin\"}");
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON body\"}");
    return;
  }

  String action = doc["action"] | "";
  action.toLowerCase();

  JsonVariantConst state = doc["state"];
  if (!state.isNull()) {
    deviceStates[index].isOn = jsonToBool(state, deviceStates[index].isOn);
  }

  if (action == "on" || action == "activate") {
    deviceStates[index].isOn = true;
  } else if (action == "off" || action == "deactivate") {
    deviceStates[index].isOn = false;
  }

  JsonObjectConst payload = doc["payload"].as<JsonObjectConst>();
  if (!payload.isNull()) {
    applyPayloadObject(index, payload);
  } else {
    JsonVariantConst value = doc["value"];
    if (!value.isNull()) {
      applyScalarValue(index, action, value);
    }
  }

  syncPhysicalRelay(index);

  JsonDocument resp;
  JsonObject root = resp.to<JsonObject>();
  writeRelayPayload(root, index);
  root["result"] = "success";

  String output;
  serializeJson(resp, output);
  server.send(200, "application/json", output);
}

void handleOptions() {
  setCORSHeaders();
  server.send(204);
}

void setup() {
  Serial.begin(115200);
  bootTime = millis();

  dht.begin();
  pinMode(LDR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);

  initializeDeviceStates();
  for (int i = 0; i < NUM_DEVICES; i++) {
    if (DEVICES[i].gpioPin == GPIO_NONE)
      continue;
    pinMode(DEVICES[i].gpioPin, OUTPUT);
    syncPhysicalRelay(i);
  }

  Serial.printf("\n[Artemis] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[Artemis] Connected! IP: %s\n",
                WiFi.localIP().toString().c_str());

  if (MDNS.begin(DEVICE_NAME)) {
    Serial.printf("[Artemis] mDNS started: http://%s.local\n", DEVICE_NAME);
    MDNS.addService("http", "tcp", 80);
  }

  const char *headerKeys[] = {"Authorization"};
  server.collectHeaders(headerKeys, 1);

  server.on("/api/sensors", HTTP_GET, handleGetSensors);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/relays", HTTP_GET, handleGetRelays);
  server.on("/api/devices", HTTP_GET, handleGetDevices);
  server.on("/api/sensors", HTTP_OPTIONS, handleOptions);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/relays", HTTP_OPTIONS, handleOptions);
  server.on("/api/devices", HTTP_OPTIONS, handleOptions);

  server.onNotFound([]() {
    if (server.uri().startsWith("/api/relay/")) {
      if (server.method() == HTTP_POST) {
        handlePostRelay();
      } else if (server.method() == HTTP_OPTIONS) {
        handleOptions();
      } else {
        setCORSHeaders();
        server.send(405, "application/json",
                    "{\"error\":\"Method not allowed\"}");
      }
    } else {
      setCORSHeaders();
      server.send(404, "application/json", "{\"error\":\"Not found\"}");
    }
  });

  readSensors();

  server.begin();
  Serial.println("[Artemis] HTTP server started on port 80");
  Serial.println("[Artemis] Endpoints:");
  Serial.println("  GET  /api/sensors");
  Serial.println("  GET  /api/status");
  Serial.println("  GET  /api/relays");
  Serial.println("  GET  /api/devices");
  Serial.println("  POST /api/relay/{logical_pin}");
}

void loop() {
  server.handleClient();
  readSensors();
}

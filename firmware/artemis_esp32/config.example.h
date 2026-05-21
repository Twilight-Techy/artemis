#pragma once

// Copy this file to config.local.h and fill in local values before flashing.
// config.local.h is ignored by git.

#define ARTEMIS_WIFI_SSID "YOUR_WIFI_SSID"
#define ARTEMIS_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define ARTEMIS_DEVICE_NAME "artemis-hub"
#define ARTEMIS_AUTH_TOKEN "your-shared-esp32-token"
#define ARTEMIS_BACKEND_URL "http://YOUR_BACKEND_HOST:8000/api/v1/sensors/ingest"
#define ARTEMIS_COMMANDS_URL "http://YOUR_BACKEND_HOST:8000/api/v1/bridge/commands"
#define ARTEMIS_COMMAND_POLL_INTERVAL_MS 2000

// MQTT Configuration
#define ARTEMIS_MQTT_BROKER "YOUR_MQTT_BROKER_URL"
#define ARTEMIS_MQTT_PORT 8883 // Use 1883 for non-TLS, 8883 for TLS
#define ARTEMIS_MQTT_USER "YOUR_MQTT_USER"
#define ARTEMIS_MQTT_PASS "YOUR_MQTT_PASS"
#define ARTEMIS_MQTT_CLIENT_ID "artemis-esp32-1"

// Set to 1 only for temporary development tunnels with untrusted certificates.
#define ARTEMIS_TLS_INSECURE 0

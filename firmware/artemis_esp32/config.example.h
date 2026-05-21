#pragma once

// Copy this file to config.local.h and fill in local values before flashing.
// config.local.h is ignored by git.

#define ARTEMIS_WIFI_SSID "YOUR_WIFI_SSID"
#define ARTEMIS_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define ARTEMIS_DEVICE_NAME "artemis-hub"
#define ARTEMIS_AUTH_TOKEN "your-shared-esp32-token"
#define ARTEMIS_BACKEND_URL "http://YOUR_BACKEND_HOST:8000/api/v1/sensors/ingest"

// Set to 1 only for temporary development tunnels with untrusted certificates.
#define ARTEMIS_TLS_INSECURE 0

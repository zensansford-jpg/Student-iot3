/*
  StudentIoT — ESP32 + DHT11
  Wiring:
    DHT11 VCC  -> ESP32 3V3
    DHT11 GND  -> ESP32 GND
    DHT11 DATA -> ESP32 GPIO 4
  Install Arduino libraries:
    - DHT sensor library by Adafruit
    - Adafruit Unified Sensor

  Configure WIFI_SSID and WIFI_PASSWORD before uploading.
  Uses the Supabase publishable/anon key and the existing validated
  public INSERT policy. Never put a service_role/secret key in firmware.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHT_PIN 4
#define DHT_TYPE DHT11

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SUPABASE_URL = "https://bbnvfbjkzjexcfyprkbl.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_LVBYcxg9tXCvag0DVPjumQ_uBoGI451";
const char* DEVICE_NAME = "ESP32-01";

const unsigned long SEND_INTERVAL_MS = 10000;
unsigned long lastSend = 0;

DHT dht(DHT_PIN, DHT_TYPE);

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed; will retry.");
  }
}

bool sendReading(const char* type, float value, const char* unit) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure secureClient;
  // Prototype note: this encrypts traffic but does not validate the server certificate.
  // For a production installation, replace setInsecure() with Supabase's trusted CA bundle.
  secureClient.setInsecure();

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  if (!http.begin(secureClient, endpoint)) {
    Serial.println("Could not start HTTPS request.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  String body = "{\"sensor_name\":\"" + String(DEVICE_NAME) +
    "\",\"sensor_type\":\"" + String(type) +
    "\",\"sensor_value\":" + String(value, 1) +
    ",\"unit\":\"" + String(unit) + "\"}";

  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("%s %.1f %s -> HTTP %d\n", type, value, unit, code);
  if (code < 200 || code >= 300) {
    Serial.println(response);
    return false;
  }
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  dht.begin();
  connectWiFi();
}

void loop() {
  connectWiFi();

  if (WiFi.status() == WL_CONNECTED && millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("DHT11 read failed. Check VCC, GND and DATA wiring.");
    } else {
      Serial.printf("DHT11: %.1f C, %.1f %%\n", temperature, humidity);
      bool tOk = sendReading("temperature", temperature, "°C");
      bool hOk = sendReading("humidity", humidity, "%");
      if (tOk && hOk) Serial.println("Both readings saved to Supabase.");
    }
  }
  delay(100);
}

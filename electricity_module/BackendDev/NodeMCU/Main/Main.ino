//AWS 
#include <WiFi.h>
#include <NetworkClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <sys/time.h>
#include "secrets.h"
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_ADS1115 ads;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
bool displayReady = false;

enum DisplayPage {
    DISPLAY_DEVICE,
    DISPLAY_WIFI,
    DISPLAY_MQTT,
    DISPLAY_CURRENT,
    DISPLAY_PAGE_COUNT
};

DisplayPage currentDisplayPage = DISPLAY_DEVICE;
bool displayPageInitialized = false;
unsigned long lastDisplayPageChange = 0;
const unsigned long DISPLAY_PAGE_DURATION_MS = 3000;

const float FACTOR = 30; //20A/1V from teh CT

const float multiplier = 0.00005;

uint8_t findDisplayAddress() {
    bool foundDisplayAddress = false;
    uint8_t displayAddress = 0x3C;

    Serial.println("Scanning I2C bus...");
    for (uint8_t address = 0x08; address <= 0x77; ++address) {
        Wire.beginTransmission(address);
        const uint8_t error = Wire.endTransmission();
        if (error == 0) {
            Serial.print("I2C device found at 0x");
            Serial.println(address, HEX);
            if (address == 0x3C || address == 0x3D) {
                displayAddress = address;
                foundDisplayAddress = true;
            }
        }
    }

    if (!foundDisplayAddress) {
        Serial.println("No OLED detected at 0x3C or 0x3D; trying 0x3C anyway");
    }
    return displayAddress;
}

#define AWS_IOT_PUBLISH_TOPIC   "ESP32_AWSDB/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "ESP32_AWSDB/sub"

#ifdef LOCAL_MQTT
WiFiClient net;
#else
NetworkClientSecure net;
#endif

PubSubClient client(net);

time_t now;
time_t nowish = 1510592825;
struct tm timeinfo;
#define TIME_ZONE 5.3

void drawCenteredText(const char *text, int y, uint8_t textSize, int horizontalOffset) {
    display.setTextSize(textSize);
    int16_t x1;
    int16_t y1;
    uint16_t textWidth;
    uint16_t textHeight;
    display.getTextBounds(text, 0, y, &x1, &y1, &textWidth, &textHeight);
    const int x = (128 - static_cast<int>(textWidth)) / 2 + horizontalOffset - x1;
    display.setCursor(x, y);
    display.print(text);
}

void renderDisplayPage(DisplayPage page, float currentRMS, bool hasCurrentReading, int horizontalOffset) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    const char *title;
    const char *value;
    char currentText[20];

    switch (page) {
        case DISPLAY_DEVICE:
            title = "DEVICE";
            value = DEVICE_NAME;
            break;
        case DISPLAY_WIFI:
            title = "WI-FI";
            value = WiFi.status() == WL_CONNECTED ? "Online" : "Offline";
            break;
        case DISPLAY_MQTT:
            title = "MQTT";
            value = client.connected() ? "Online" : "Offline";
            break;
        case DISPLAY_CURRENT:
            title = "CURRENT";
#if CURRENT_SENSOR_ENABLED
            if (hasCurrentReading) {
                snprintf(currentText, sizeof(currentText), "%.3f A", currentRMS);
            } else {
                snprintf(currentText, sizeof(currentText), "-- A");
            }
#else
            snprintf(currentText, sizeof(currentText), "Disabled");
#endif
            value = currentText;
            break;
        default:
            title = "DEVICE";
            value = DEVICE_NAME;
            break;
    }

    drawCenteredText(title, 4, 1, horizontalOffset);
    display.drawFastHLine(horizontalOffset, 17, 128, SSD1306_WHITE);

    int16_t x1;
    int16_t y1;
    uint16_t textWidth;
    uint16_t textHeight;
    display.setTextSize(2);
    display.getTextBounds(value, 0, 0, &x1, &y1, &textWidth, &textHeight);
    const uint8_t valueTextSize = textWidth > 120 ? 1 : 2;
    drawCenteredText(value, 30, valueTextSize, horizontalOffset);
    display.display();
}

void updateDisplay(float currentRMS, bool hasCurrentReading) {
    if (!displayReady) {
        return;
    }

    const unsigned long currentTime = millis();
    if (!displayPageInitialized) {
        displayPageInitialized = true;
        lastDisplayPageChange = currentTime;
        renderDisplayPage(currentDisplayPage, currentRMS, hasCurrentReading, 0);
        return;
    }

    if (currentTime - lastDisplayPageChange >= DISPLAY_PAGE_DURATION_MS) {
        currentDisplayPage = static_cast<DisplayPage>(
            (currentDisplayPage + 1) % DISPLAY_PAGE_COUNT
        );
        lastDisplayPageChange = currentTime;

        for (int step = 1; step <= 4; ++step) {
            const int horizontalOffset = 128 - (step * 32);
            renderDisplayPage(currentDisplayPage, currentRMS, hasCurrentReading, horizontalOffset);
            delay(10);
        }
        return;
    }

    renderDisplayPage(currentDisplayPage, currentRMS, hasCurrentReading, 0);
}

void NTPConnect(void) {
    Serial.print("Setting time using SNTP");
    Serial.println(TIME_ZONE);
    configTime(TIME_ZONE * 3600, 0 * 3600, "pool.ntp.org", "time.nist.gov");
    now = time(nullptr);
    while (now < nowish) {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
    }
    Serial.println("done!");

    gmtime_r(&now, &timeinfo);
    timeinfo.tm_hour = (timeinfo.tm_hour + 5) % 24;
    timeinfo.tm_min = (timeinfo.tm_min + 30) % 60;

    
    Serial.print("Current time SL: ");
    Serial.print(asctime(&timeinfo));
    
}

void setDateTime(){
    gmtime_r(&now, &timeinfo);
    timeinfo.tm_hour = (timeinfo.tm_hour + 5) % 24;
    timeinfo.tm_min = (timeinfo.tm_min + 30) % 60;

}


void messageReceived(char *topic, byte *payload, unsigned int length) {
    Serial.print("Received [");
    Serial.print(topic);
    Serial.print("]: ");
    for (int i = 0; i < length; i++) {
        Serial.print((char)payload[i]);
    }
    Serial.println();
}

void connectAWS() {
    delay(3000);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.println(String("Attempting to connect to SSID: ") + String(WIFI_SSID));
    updateDisplay(0, false);

    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(1000);
        updateDisplay(0, false);
    }

    NTPConnect();

    // Configure transport security when using AWS IoT Core.
#ifndef LOCAL_MQTT
    net.setCACert(cacert);          // Root CA certificate
    net.setCertificate(client_cert); // Client certificate
    net.setPrivateKey(privkey);      // Private key
#endif

    client.setServer(MQTT_HOST, MQTT_PORT);
    client.setCallback(messageReceived);

#ifdef LOCAL_MQTT
    Serial.println("Connecting to local MQTT broker");
#else
    Serial.println("Connecting to AWS IoT"); 
#endif

    while (!client.connect(THINGNAME)) {
        Serial.print(".");
        delay(1000);
        updateDisplay(0, false);
    }

    if (!client.connected()) {
        Serial.println("AWS IoT Timeout!"); 
        return;
    }

    client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);
#ifdef LOCAL_MQTT
    Serial.println("Local MQTT connected!");
#else
    Serial.println("AWS IoT Connected!");
#endif
}

void publishMessage(float currentRMS) {
    StaticJsonDocument<200> doc;
    doc["DeviceId"] = THINGNAME;
    doc["DeviceName"] = DEVICE_NAME;
    struct timeval timestamp;
    gettimeofday(&timestamp, nullptr);
    doc["TS"] = static_cast<uint64_t>(timestamp.tv_sec) * 1000ULL
        + static_cast<uint64_t>(timestamp.tv_usec / 1000); 
#if CURRENT_SENSOR_ENABLED
    doc["Current-A"] = currentRMS; 
#endif
    char jsonBuffer[512];
    serializeJson(doc, jsonBuffer);

    if (!client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer)) {
        Serial.println("Failed to publish sensor reading");
    }
}



//Current
float getcurrent()
{
  float voltage;
  float current;
  float sum = 0;
  unsigned long time_check = millis();
  int counter = 0;

  while (millis() - time_check < 1000)
  {
    voltage = ads.readADC_Differential_0_1() * multiplier;
    current = voltage * FACTOR;
    //current /= 1000.0;

    sum += sq(current);
    counter = counter + 1;
  }

  current = counter > 0 ? sqrt(sum / counter) : 0;
  return (current);
}







void setup() {
    Serial.begin(115200);
  Wire.begin();
  const uint8_t displayAddress = findDisplayAddress();
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, displayAddress);
  if (displayReady) {
    Serial.print("SSD1306 initialized at 0x");
    Serial.println(displayAddress, HEX);
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("SparkSense OLED");
    display.println("I2C initialization OK");
    display.display();
    delay(1000);
    updateDisplay(0, false);
  } else {
    Serial.println("SSD1306 initialization failed; check memory and library");
  }
#if CURRENT_SENSOR_ENABLED
  ads.setGain(GAIN_FOUR);      // +/- 1.024V 1bit = 0.5mV
  if (!ads.begin()) {
    Serial.println("ADS1115 not found; check sensor wiring"); 
    if (displayReady) {
      display.clearDisplay();
      display.setCursor(0, 0);
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.println("ADS1115 not found");
      display.println("Check I2C wiring");
      display.display();
    }
    while (true) {
      delay(1000);
    }
  }
#endif
  connectAWS();
}

void loop() {
#if CURRENT_SENSOR_ENABLED
    const float currentRMS = getcurrent();
    Serial.print("Current RMS: ");
    Serial.print(currentRMS);
    Serial.println(" A");
#else
    const float currentRMS = 0;
    Serial.println("Current sensor disabled; publishing device heartbeat only");
#endif

    if (!client.connected()) { 
        connectAWS();
        return;
    }

    client.loop();
    updateDisplay(currentRMS, true); 
    publishMessage(currentRMS);
#if !CURRENT_SENSOR_ENABLED
    delay(1000);
#endif
}

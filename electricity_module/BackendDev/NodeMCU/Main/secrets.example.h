#include <pgmspace.h>

#define SECRET

const char WIFI_SSID[] = "YOUR_WIFI_SSID";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

#define THINGNAME "sparksense-1"
const char DEVICE_NAME[] = "Bulb";
#define CURRENT_SENSOR_ENABLED 0
const char MQTT_HOST[] = "YOUR_AWS_IOT_ENDPOINT";
#define MQTT_PORT 8883

#ifndef LOCAL_MQTT
static const char cacert[] PROGMEM = R"EOF(
PASTE_AMAZON_ROOT_CA_CERTIFICATE_HERE
)EOF";

static const char client_cert[] PROGMEM = R"KEY(
PASTE_DEVICE_CERTIFICATE_HERE
)KEY";

static const char privkey[] PROGMEM = R"KEY(
PASTE_DEVICE_PRIVATE_KEY_HERE
)KEY";
#endif
# Electricity monitoring module

This directory contains the SparkSense electricity backend and device code:

- `BackendDev/PythonFlask/` — Flask API and tests
- `BackendDev/LocalDev/` — local DynamoDB, Mosquitto, and MQTT bridge setup
- `BackendDev/NodeMCU/` — ESP32 firmware
- `BackendDev/AWS/` — CloudFormation infrastructure
- `docker-compose.yml` — local development services

The SHUM mobile application is separate in [`../mobile app`](../mobile%20app/). Start services from this directory.

## Local backend with Docker

```powershell
docker compose up --build
```

This starts DynamoDB Local, Mosquitto, the MQTT-to-DynamoDB bridge, and Flask without creating AWS resources. The API is available at `http://localhost:5000`. Stop the services with `docker compose down`; adding `-v` also deletes the local database and broker data.

To send a test reading through the local pipeline:

```powershell
$reading = '{"DeviceId":"sparksense-1","DeviceName":"Bulb","TS":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"Current-A":0.42}'
docker compose exec -T mosquitto mosquitto_pub -h localhost -t ESP32_AWSDB/pub -m $reading
```

The live API endpoint is `http://localhost:5000/api/live`. Mosquitto permits anonymous access and is exposed for ESP32 development; use this only on a trusted LAN and never expose it to the public internet.

## Flask environment and tests

For running Flask outside Docker, use `BackendDev/PythonFlask/.env.example` as a starting point for a local `.env`. AWS-backed operation requires AWS CLI credentials or an IAM role with the required DynamoDB access; do not put AWS keys in source files.

On Windows, from this directory:

```powershell
cd BackendDev\PythonFlask
if (-not (Test-Path .venv)) { py -3 -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## ESP32 firmware

Open `BackendDev/NodeMCU/Main/Main.ino` in Arduino IDE. Install ESP32 board support and PubSubClient, ArduinoJson, Adafruit ADS1X15, Adafruit SSD1306, and Adafruit GFX (including their prompted dependencies).

The local `BackendDev/NodeMCU/Main/secrets.h` is ignored by Git. Create it from `secrets.example.h` on a fresh clone. For local Docker MQTT, define `LOCAL_MQTT`, set `MQTT_HOST` to the development computer's LAN IPv4 address and `MQTT_PORT` to `1883`, then configure the device Wi-Fi. Enable `CURRENT_SENSOR_ENABLED` only after wiring and calibrating the CT sensor.

The 128x64 I2C SSD1306 OLED shares the I2C bus with the ADS1115. Connect VCC to 3.3V, GND to GND, SDA/SCL to the board's I2C pins, and check address `0x3C` or `0x3D`. The display rotates through one item per screen. This CT/ADS1115 setup measures current only; it does not measure voltage, real power, energy, frequency, or power factor. Never connect mains voltage directly to the ESP32 or ADS1115; use properly isolated measurement hardware installed by a qualified person.

## AWS deployment

The CloudFormation template is at `BackendDev/AWS/sparksense-infrastructure.yaml`. Deploy it with an AWS profile that can create the required resources:

```powershell
aws cloudformation deploy --template-file BackendDev/AWS/sparksense-infrastructure.yaml --stack-name sparksense-dev --capabilities CAPABILITY_IAM --region eu-north-1
```

Follow the AWS IoT certificate, policy, and IAM setup in the template outputs before enabling AWS-backed firmware or Flask. Keep certificates, private keys, Wi-Fi credentials, local `.env`, and `secrets.h` out of Git.

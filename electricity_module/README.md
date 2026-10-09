# SparkSense 💡

**SparkSense** is a comprehensive IoT-based electrical energy monitoring system that tracks real-time power consumption and provides detailed analytics. Perfect for home energy management and cost optimization.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Mobile Application
- 📊 **Real-time Power Monitoring** - Track current electricity consumption in real-time
- 💰 **Billing screen** - Ready to show estimates once the electricity tariff is configured
- 📈 **Historical Analytics** - View usage statistics and trends over time
- 🎨 **Interactive Charts** - Visualize energy consumption with intuitive charts
- ⚙️ **Customizable Settings** - Configure monitoring preferences and alerts
- 🔔 **Usage Alerts** - Get notified when consumption exceeds thresholds

### Backend System
- 🗄️ **Cloud Database** - AWS DynamoDB for scalable data storage
- 📅 **Data Aggregation** - Hourly and monthly energy consumption summaries
- 🔌 **REST API** - RESTful endpoints for data access and management
- 🔐 **Secure Communication** - AWS IoT integration for device authentication

### Hardware Device
- 🔋 **Current Measurement** - Adafruit ADS1115 ADC for accurate electrical current sensing
- 📡 **WiFi Connectivity** - ESP32/NodeMCU microcontroller with WiFi capabilities
- 🔌 **MQTT Protocol** - Reliable device-to-cloud communication
- ⚡ **Low Power** - Optimized for continuous monitoring with minimal power consumption

## 📁 Project Structure

```
SparkSense/
├── Screens/                    # React Native screen components
│   ├── Home.js                # Home screen with current status
│   ├── Bill.js                # Bill management screen
│   ├── Statistics.js          # Statistics and analytics screen
│   ├── Settings.js            # App settings and configuration
│   ├── api.js                 # Flask API base URL and JSON client
│   └── Components/            # Reusable UI components
│       ├── CurrentStatus.tsx  # Current power consumption display
│       └── StatisticsData.tsx # Statistics visualizations
├── BackendDev/                # Backend and hardware code
│   ├── PythonFlask/           # Flask API server
│   │   ├── backendServer.py   # Main Flask application
│   │   ├── requirements.txt   # Python dependencies
│   │   └── .env.example       # Safe local configuration defaults
│   ├── AWS/                   # CloudFormation for AWS resources
│   └── NodeMCU/               # Arduino firmware
│       └── Main/
│           └── Main.ino       # ESP32/NodeMCU firmware
├── android/                   # Android native code
├── ios/                       # iOS native code
├── App.tsx                    # Main React Native app component
├── app.json                   # React Native configuration
├── package.json               # JavaScript dependencies
└── README.md                  # This file
```

## 🛠 Tech Stack

### Frontend
- **React Native** (0.74.3) - Cross-platform mobile development
- **TypeScript** (5.0.4) - Type-safe JavaScript
- **React Navigation** - App routing and navigation
- **React Native Chart Kit** - Data visualization
- **Axios** - HTTP client

### Backend
- **Python Flask** - Lightweight web framework
- **AWS DynamoDB** - NoSQL database
- **AWS IoT Core** - Device management and MQTT broker
- **Boto3** - AWS SDK for Python

### Hardware
- **Arduino** - Device firmware development
- **NodeMCU/ESP32** - Microcontroller platform
- **Adafruit ADS1115** - 16-bit ADC for current sensing
- **PubSubClient** - MQTT client library

### Device Messaging
- **MQTT** - Lightweight device-to-cloud messaging through AWS IoT Core

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (3.10 or higher) for backend
- **Android Studio and JDK 17** (only for an Android emulator or native development build)
- **Xcode** (only for an iOS simulator or native development build on macOS)
- **Arduino IDE** (for hardware development)
- **Expo Go** on a physical iOS or Android device for QR-code development

### Installation

#### 1. Open the module directory
Open a terminal in `electricity_module` before running the commands below. When working from the parent repository, run `cd electricity_module` first.

#### 2. Install Frontend Dependencies
```bash
npm ci
```

#### 3. Install Backend Dependencies
```powershell
cd BackendDev/PythonFlask
if (-not (Test-Path .venv)) { py -3 -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
cd ../..
```

When migrating an existing local checkout, its ignored `BackendDev/PythonFlask/.env` and `BackendDev/NodeMCU/Main/secrets.h` settings are local-only files and are not included in Git. Recreate them from their example files on a fresh clone; on the migrated workstation, the existing local copies have been carried into this module.

#### 4. Configure the Flask environment and AWS credentials
The Flask backend reads its local settings from `BackendDev/PythonFlask/.env`. Copy `.env.example` to `.env` for the starter settings: Flask binds to `0.0.0.0:5000`, uses AWS region `eu-north-1`, disables debug mode, and leaves background jobs disabled. Adjust these values locally if needed; `.env` is ignored by Git.

Use an AWS profile or IAM role with access to the DynamoDB tables. Credentials should be configured through the AWS CLI or IAM role, not stored in `.env` or source files. For a named profile, set:
```powershell
$env:AWS_PROFILE = "your-profile"
```
Do not put access keys in source files. The backend uses boto3's standard credential chain.

#### Local development without AWS
Docker Compose runs DynamoDB Local, a local Mosquitto MQTT broker, a bridge that stores MQTT messages in DynamoDB Local, and Flask. It does not use AWS credentials or create cloud resources:
```powershell
docker compose up --build
```
When all containers are ready, the Flask API is at `http://localhost:5000`. Publish a sample sensor reading from another terminal:
```powershell
$reading = '{"DeviceId":"sparksense-1","DeviceName":"FAN","TS":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"Current-A":0.42}'
docker compose exec -T mosquitto mosquitto_pub -h localhost -t ESP32_AWSDB/pub -m $reading
```
The live dashboard API is `http://localhost:5000/api/live`; it returns the latest measurement and marks the device offline if no reading arrived in the last five seconds. The mobile app can connect from an Android emulator using its configured `http://10.0.2.2:5000` base URL. Mosquitto allows anonymous connections and is exposed on the host network for ESP32 development; use this only on a trusted network, and do not expose it to the internet. `docker compose down` stops the services; `docker compose down -v` also deletes the local database and broker data.
To send ESP32 readings through this stack, configure `secrets.h` with `LOCAL_MQTT`, the PC's LAN IPv4 address as `MQTT_HOST`, port `1883`, and your Wi-Fi credentials. Set `DEVICE_NAME` to the load name shown in the app (for example, `FAN`). `CURRENT_SENSOR_ENABLED` defaults to `0`, so the ESP32 sends a heartbeat but no current measurement until the CT is wired and calibrated. Set it to `1` in `secrets.h` only after connecting the CT to the ADS1115 and verifying its calibration. The app polls the latest reading every second. Sending at this rate to AWS also creates roughly 86,400 sensor writes per device per day; review AWS costs before using one-second cloud ingestion. Keep the ESP32 and PC on the same network; if Windows Firewall prompts, allow the Docker/Mosquitto port on that trusted private network only. Do not use this mode on untrusted Wi-Fi.
The current sensor does not measure voltage, real power, energy, frequency, or power factor; the dashboard shows these as unavailable rather than inventing estimates. To obtain them, use a suitable AC power/energy meter with isolated interfaces (for example, a properly enclosed PZEM-004T installation) and have mains wiring installed by a qualified person. Never connect mains voltage directly to the ESP32 or ADS1115.
This publisher can still test the complete local MQTT-to-DynamoDB-to-Flask path without the ESP32.
If Compose stays at `init-dynamodb`, inspect startup output with `docker compose logs init-dynamodb dynamodb-local`. The initializer now logs each retry and fails within about 90 seconds if DynamoDB Local cannot be reached.

#### 5. Provision AWS resources
With AWS CLI credentials that can create CloudFormation stacks, IAM roles, DynamoDB tables, and AWS IoT rules/policies, deploy the included template:
```powershell
aws cloudformation deploy --template-file BackendDev/AWS/sparksense-infrastructure.yaml --stack-name sparksense-dev --capabilities CAPABILITY_IAM --region eu-north-1
```
The template defaults to the table names in `.env`; deploying into an AWS account/region where tables with these names already exist requires importing/migrating them rather than creating this stack over them. The table names are parameters if you need a separate deployment. Do not delete an existing table containing data.

The stack creates the tables, an AWS IoT rule for `ESP32_AWSDB/pub`, the rule's least-privilege DynamoDB write role, a Thing, and a device IoT policy. It does **not** generate a device private key or TLS certificate. Create and activate a device certificate in AWS IoT Core, attach it to the created Thing, and attach the stack output `DevicePolicyName` to that certificate. Keep the private key and certificate out of source control.
For the default stack name and Thing name, the certificate setup can be done with AWS CLI:
```powershell
$certificateArn = aws iot create-keys-and-certificate --set-as-active --certificate-pem-outfile device-certificate.pem.crt --public-key-outfile device-public.pem --private-key-outfile device-private.pem --query certificateArn --output text --region eu-north-1
aws iot attach-thing-principal --thing-name sparksense-1 --principal $certificateArn --region eu-north-1
aws iot attach-policy --policy-name sparksense-dev-DevicePolicy --target $certificateArn --region eu-north-1
aws iot describe-endpoint --endpoint-type iot:Data-ATS --query endpointAddress --output text --region eu-north-1
```
Use the returned endpoint as `MQTT_HOST` in `secrets.h`; copy the certificate and private key from the generated files and the Amazon Root CA into that local header.

Configure an AWS CLI profile with read/query access to `SensorData` and the summary tables, and write access to the hourly and monthly tables:
```powershell
aws configure --profile sparksense
$env:AWS_PROFILE = "sparksense"
```
Attach the stack output `BackendAccessPolicyArn` to the IAM user or role whose credentials the Flask backend uses. In `BackendDev/PythonFlask/.env`, `DEVICE_ID` must match the Thing name / firmware `THINGNAME`; table names must match the deployed names. Enable `RUN_BACKGROUND_JOBS=1` only after device readings are reaching DynamoDB.

#### 6. Hardware setup
- Install ESP32 board support and the libraries used by `Main.ino` in Arduino IDE: PubSubClient, ArduinoJson, Adafruit ADS1X15, and Adafruit SSD1306 (including Adafruit GFX Library and Adafruit BusIO dependencies when prompted).
- Copy `BackendDev/NodeMCU/Main/secrets.example.h` to `secrets.h` in the same folder. For the local Docker stack, define `LOCAL_MQTT`, set `MQTT_HOST` to the PC's LAN IPv4 address and `MQTT_PORT` to `1883`, then set Wi-Fi credentials. For AWS IoT, leave `LOCAL_MQTT` undefined, set the AWS IoT data endpoint and port `8883`, and provide the certificate, private key, and root CA. Set `THINGNAME` to the CloudFormation `DeviceThingName`.
- For a 128x64 I2C SSD1306 OLED, connect VCC to 3.3V, GND to GND, SDA to the ESP32's SDA pin (commonly GPIO 21), and SCL to its SCL pin (commonly GPIO 22). The OLED and ADS1115 share the I2C bus; the sketch scans for the common OLED addresses `0x3C` and `0x3D` at startup. Check the module's address and your board pinout if it does not appear. The display shows one screen at a time—device name, Wi-Fi status, MQTT status, and current—then slides to the next screen about every three seconds. Only measurements supported by the connected sensors are shown.
- Never commit `secrets.h`; it is ignored by Git. Rotate any AWS, AWS IoT, and Wi-Fi credentials that were previously stored in source files.

### Running the Application

#### Run with Expo Go
```bash
npm start
```
Install Expo Go on your phone and scan the QR code shown by Expo CLI. Keep the phone and development computer on the same network. To run on an Android emulator:
```bash
npm run android
```
To run on an iOS simulator (macOS only):
```bash
npm run ios
```
This app targets Expo SDK 57; update Expo Go to a compatible version if it reports an SDK mismatch.
After dependency updates, stop the existing Expo server and restart with `npx expo start --clear` if the phone still displays an old bundle or render error.

When using a physical phone with a local Flask server, set the API host before starting Expo. Replace the address with the computer's LAN IP:
```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.20:5000"
npm start
```

#### Start Backend Server
```bash
cd BackendDev/PythonFlask
python backendServer.py
```
The server reads `.env` from its own folder. The starter `.env.example` binds Flask to `0.0.0.0:5000` so an emulator or phone can reach it; the API requires AWS credentials and the configured DynamoDB tables. The homepage endpoint reads current sensor data on request. Background hourly/monthly aggregation workers are disabled by default; set `RUN_BACKGROUND_JOBS=1` only after AWS access and IoT ingestion are configured.
Android emulator builds use `http://10.0.2.2:5000`. For a physical phone, set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN URL before starting Expo; put both devices on the same network. Do not expose the development server to the public internet.

The existing `android/` and `ios/` folders are retained from the original React Native CLI project. Expo Go does not build from them; native configuration in `app.json` is for a future Expo prebuild workflow.

## 🏗 Architecture

At a high level, the firmware sends measurements to AWS over MQTT. An AWS IoT rule routes them into DynamoDB. Flask reads and aggregates those records, and the mobile app requests the results over HTTP:

```
ESP32 -- MQTT --> AWS IoT Core -- rule --> SensorData
                                            ↑
                                            | Boto3
Mobile app <-- HTTP/JSON --> Flask API -----+----> Hourly and monthly tables
```

The infrastructure is defined in `BackendDev/AWS/sparksense-infrastructure.yaml`. The firmware publishes `{ "DeviceId": "...", "TS": 0, "Watt-Hour": 0 }` to `ESP32_AWSDB/pub`; the IoT rule writes these fields to `SensorData`, whose keys are `DeviceId` and numeric epoch-millisecond `TS`. The summary tables use `Period` and `DateTime` keys, supporting efficient hourly/daily queries. The IoT rule role can only write sensor records; Flask's IAM identity needs query access and summary-table write access.

## ⚙️ Configuration

### Mobile App Configuration
Edit `app.json` to configure:
- App name and display settings
- Bundle identifier
- Version number

### Backend Configuration
Configure backend values in `BackendDev/PythonFlask/.env`, AWS credentials through the AWS CLI/IAM, and the mobile API host in `Screens/api.js`. Device Wi-Fi, certificate, key, and IoT endpoint values belong in the ignored local `secrets.h`.

### Hardware Configuration
Edit `BackendDev/NodeMCU/Main/secrets.h`:
- WiFi SSID and password
- AWS IoT endpoint
- Device certificate and keys
- Current sensor calibration factor

## 📝 Testing

Run the JavaScript tests and backend unit tests with:
```powershell
npm test
cd BackendDev/PythonFlask
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Sithum W** - [GitHub](https://github.com/SithumW)

## 📞 Support

For support, email or open an issue on the GitHub repository.

---

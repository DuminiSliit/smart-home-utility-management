# SHUM mobile app

**SHUM** means **Smart Home Utility Management**. This Expo / React Native application provides the mobile interface for the project. The electricity API, local Docker services, ESP32 firmware, and AWS infrastructure are kept separately in [`../electricity_module`](../electricity_module/).

## Requirements

- Node.js 18 or newer and npm
- Expo Go on an Android or iOS phone
- The API running from `electricity_module` for live readings

## Install and start

Run from this directory:

```powershell
npm ci
npm start
```

Scan the Expo CLI QR code with Expo Go. Keep the phone and computer on the same Wi-Fi network.

To start the local backend, open another terminal in the repository root and run:

```powershell
cd electricity_module
docker compose up --build
```

For an Android emulator, the app defaults to `http://10.0.2.2:5000`. For a physical phone, set the API URL to the computer's LAN IP before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.20:5000"
npm start
```

Replace the example address with the computer's actual LAN IPv4 address. Keep both devices on the same network and allow the API port through the private-network firewall if prompted. Do not expose the development API to the public internet.

## Other commands

```powershell
npm test
npm run android
npm run ios
```

The iOS simulator requires macOS. Physical devices can use Expo Go. After dependency changes, restart Expo with `npx expo start --clear` if the app loads a stale bundle.

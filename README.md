# smart-home-utility-management
AI and IoT-based smart home system for electricity and water monitoring, utility prediction, and intelligent plant watering.

## Project modules

The project is split into two independently runnable parts:

- [`mobile app`](./mobile%20app/) — **SHUM (Smart Home Utility Management)** Expo / React Native client. See its [README](./mobile%20app/README.md) for Expo Go setup.
- [`electricity_module`](./electricity_module/) — Flask API, MQTT bridge, Docker stack, ESP32 firmware, and AWS infrastructure. See its [README](./electricity_module/README.md) for backend and hardware setup.

Run each component's commands from its respective folder. Start the backend in `electricity_module` before launching the app in `mobile app`.

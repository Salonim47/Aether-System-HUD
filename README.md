# Aether System HUD - Interactive Python & CSS Telemetry Deck

A futuristic, high-tech web-based system telemetry dashboard and command deck. The project combines a local Python server (FastAPI, WebSockets, and `psutil`) and a stunning glassmorphic CSS/HTML frontend with real-time dial updates and process controls.

![Aether System HUD Mockup](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800) *(Visual representation of futuristic hardware analytics)*

## ✨ Key Features
- **Real-Time Telemetry Dials**: Glowing circular SVG/CSS utilization rings for CPU load, RAM in-use, and Storage space. Dials slide smoothly utilizing CSS transitions.
- **WebSocket Streaming**: Open a low-latency WebSockets connection to the local Python daemon. Telemetry statistics (cores, GB metrics, Network speeds, uptime) refresh every 500ms.
- **Live Utilization Charts**: Dynamic Chart.js historical logging line-charts that overlay CPU and RAM load percentages with custom neon gradients.
- **Interactive Process Manager**: View top system processes, sorted dynamically. Features a **KILL** button that fires POST requests to Python to immediately terminate runaway background threads.
- **Voice-Commanded Console**: Speak commands (e.g. *"system summary"*, *"scan network"*, *"disk check"*) directly to the browser. The Web Speech API transcripts are sent to the Python API runner, which executes secure local diagnostics and returns the terminal logs.
- **Single-Click Startup (`run.bat`)**: Double-click `run.bat` to automatically verify your Python configuration, install dependencies (`fastapi`, `uvicorn`, `psutil`) via `pip`, and start the backend service.

## 🛠️ System Architecture
1. **Low-Level Telemetry (Python)**:
   - Queries hardware metrics via `psutil`.
   - Spawns a WebSocket broadcast loop `/ws` on FastAPI.
   - Restricts commands inside `/run-command` to safe predefined diagnostics to prevent shell injection.
2. **Presentation Deck (HTML5 / Vanilla CSS / JavaScript)**:
   - Uses HSL tailored palettes with frosted glassmorphism layers.
   - Smoothly feeds raw statistics into SVG path dimensions ($Circumference \approx 439.8$).
   - Communicates updates asynchronously to maintain low CPU overhead.

## 🚀 Easy Setup & Launch
1. Open the [Aether-System-HUD](file:///c:/Users/mail2/OneDrive/Documents/Aether-System-HUD/) directory.
2. Double-click the **`run.bat`** file to install Python dependencies and boot the server.
3. Once the server starts on `http://127.0.0.1:8000`, open **`index.html`** in your browser.
4. Allow browser microphone access if you want to use the Voice Terminal. Enjoy monitoring your computer!

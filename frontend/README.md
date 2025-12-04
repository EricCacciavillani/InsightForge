# Research Insight - Desktop App

Electron + React + Tailwind frontend for the Research Insight orchestrator.

## Development

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the Python backend (in another terminal):
```bash
cd ..
python api/server.py
```

3. Start the Electron app in dev mode:
```bash
npm run electron:dev
```

## Building for Production

```bash
npm run electron:build
```

This creates a Windows installer in `dist-electron/`.

## Project Structure

```
frontend/
├── electron/           # Electron main process
│   ├── main.js        # Main entry point
│   └── preload.js     # Preload script for IPC
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # React hooks (API, WebSocket)
│   └── types/         # TypeScript types
├── package.json
└── tailwind.config.js
```

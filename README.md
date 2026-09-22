# Protegey FaceTec Web SDK

A mobile-first React application for biometric face verification using FaceTec 3D Liveness technology.

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm

### Install
```bash
pnpm install
```

### Development
```bash
pnpm dev
```
The app runs at `http://localhost:3700`.

### Build
```bash
pnpm build
```

### Environment Variables
```env
VITE_API_BASE=/api/v1
VITE_FACE_TEC_DEVICE_KEY=dlrL00OosNJyky981KCeSVtVW63vPvtM
```

## Architecture

- **FaceTec Browser SDK** loaded from `core-sdk/`
- **Proxy Service** (`src/services/facetecProxy.ts`) communicates with Protegey Laravel backend
- **React Hooks** (`src/hooks/useFaceTec.ts`) manage SDK lifecycle
- **Mobile-first** responsive design with TailwindCSS v4

## Flow

1. User lands on WelcomeScreen
2. Clicks "Start Face Scan" → FaceTec SDK initializes
3. `sessionRequestBlob` sent to Laravel backend
4. Backend calls FaceTec Testing API `/process-request`
5. `responseBlob` returned → SDK processes result
6. Result displayed on ResultScreen

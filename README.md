# POC Video Blur & Virtual Background (React)

A proof-of-concept web application for real-time **background blur** and **virtual background replacement** using webcam video, with built-in **audio noise suppression** and **video recording**.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-green)
![WebGL2](https://img.shields.io/badge/WebGL2-Shaders-orange)

## Features

- **Background Blur** — Gaussian blur on background with configurable intensity
- **Virtual Background** — Replace background with image, solid color, or gradient
- **Dual-Model Segmentation** — Automatically selects the best MediaPipe model per effect mode
- **Anti-Flicker Pipeline** — Temporal smoothing, spatial blur, asymmetric stickiness, and mode-specific blending
- **Real-Time Config Tuning** — UI sliders for all shader/segmentation parameters with collapsible sections
- **Model Selection** — Switch between segmentation models from the UI
- **JSON Config Export** — Copy current configuration as JSON from the Advanced Settings panel
- **Audio Noise Suppression** — WebRTC constraints + Web Audio API EQ chain (high-pass, low-pass, compressor)
- **Mic Level Meter** — Real-time visual mic level indicator
- **Video Recording** — Record processed video + filtered audio as WebM (VP9/Opus)
- **Sticky Video Preview** — Video stays visible while scrolling through controls
- **Modular Architecture** — SOLID-principled React components and custom hooks

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript 5.9](https://www.typescriptlang.org/) | Type-safe development |
| [Vite 7](https://vite.dev/) | Build tool and dev server |
| [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter) | Person segmentation (TFLite models via WASM) |
| [WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext) | GPU-accelerated shader rendering |
| [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Audio filtering and noise suppression |
| [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) | Video/audio recording |
| [MediaStreamTrackProcessor](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor) | Real-time video frame processing |
| [worker-timers](https://www.npmjs.com/package/worker-timers) | Accurate timers in background tabs |

## Project Structure

```
src/
├── config/                    # Configuration system
│   ├── types.ts               # AppConfig, EffectType, ModelKey types
│   ├── defaults.ts            # Default config values (JSON-driven)
│   └── index.ts               # Barrel exports
├── hooks/                     # Custom React hooks
│   ├── useWebcam.ts           # Camera stream management
│   ├── useAudioFilter.ts      # Audio processing + mic level
│   ├── useVideoEffect.ts      # Effect state, config sync, model switching
│   ├── useRecording.ts        # MediaRecorder lifecycle
│   └── index.ts               # Barrel exports
├── components/                # UI components
│   ├── VideoRecorder.tsx      # Main orchestrator (~170 lines)
│   ├── VideoPreview.tsx       # Video element + overlays
│   ├── EffectControls.tsx     # Effect type buttons + basic settings
│   ├── AdvancedSettings.tsx   # Collapsible config sliders + JSON display
│   ├── AudioControls.tsx      # Noise suppression toggle + mic meter
│   └── RecordingControls.tsx  # Record/stop/download buttons
├── lib/virtualBackground/     # Core video processing
│   ├── index.ts               # API: processVideoTrack() + options proxy
│   ├── segmenter.ts           # MediaPipe ImageSegmenter wrapper
│   ├── renderer.ts            # WebGL2 shaders (state update + blend)
│   ├── processor.ts           # Video frame pipeline
│   ├── filter.ts              # Optional video filters
│   ├── graph.ts               # Stats visualization
│   └── worker.ts              # Web Worker (optional)
├── utils/
│   └── audioFilters.ts        # Audio stream processing utilities
├── App.tsx                    # Root component
├── App.css                    # Application styles
└── main.tsx                   # Entry point

public/
├── mediapipe/wasm/            # MediaPipe WASM runtime
└── models/                    # TFLite segmentation models
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Download MediaPipe Assets

#### WASM Runtime

```bash
mkdir -p public/mediapipe/wasm
curl -o public/mediapipe/wasm/vision_wasm_internal.js \
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js"
curl -o public/mediapipe/wasm/vision_wasm_internal.wasm \
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm"
```

#### Segmentation Models

```bash
mkdir -p public/models
```

| Model | Download | Use Case |
|-------|----------|----------|
| **selfie_segmenter.tflite** | [Download](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite) | Virtual background (binary person/bg mask, cleaner cutout) |
| **selfie_multiclass_256x256.tflite** | [Download](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass/tflite/float16/latest/selfie_multiclass.tflite) | Blur mode (multiclass: hair, body, face, clothing — more natural transitions) |

```bash
curl -o public/models/selfie_segmenter.tflite \
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"

curl -o public/models/selfie_multiclass_256x256.tflite \
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass/tflite/float16/latest/selfie_multiclass.tflite"
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm run preview
```

## How It Works

### Dual-Model Strategy

| Effect | Model | Why |
|--------|-------|-----|
| **Blur** | `selfie_multiclass_256x256` | Better detail for hair, clothing, accessories — softer transitions |
| **Virtual BG** | `selfie_segmenter` | Clean binary mask — decisive cutout with minimal artifacts |

### WebGL Rendering Pipeline

1. **State Update Shader** — Spatial blur (Gaussian 3×3) + asymmetric temporal smoothing + smoothstep edge cleanup
2. **Blend Shader** — Mode-specific spatial blur + background compositing (blur or image replacement)

### Anti-Flicker Techniques

- Spatial blur on segmentation mask (configurable radius)
- Asymmetric temporal smoothing (graduated stickiness for person→background transitions)
- Mode-specific blending thresholds (soft for blur, tight for virtual BG)

### Audio Processing

- WebRTC constraints (echo cancellation, noise suppression, auto gain)
- Web Audio API chain: High-Pass (80Hz) → Low-Pass (12kHz) → Compressor
- Real-time mic level monitoring via AnalyserNode

## Configuration

All parameters are tunable from the **Advanced Settings** panel in the UI. The panel includes:

- **Segmentation (shared)** — Temporal smoothing, smoothstep thresholds, border smooth, state blur radius
- **Blur Mode** — Model selector, blur amount, blur radius factor, blend spatial blur
- **Virtual Background Mode** — Model selector, blend spatial blur, blend smoothstep thresholds

A **JSON config** viewer with **Copy** button is available at the bottom of Advanced Settings for easy export/sharing of tuned values.

Default configuration values live in `src/config/defaults.ts`.

## Browser Compatibility

| Browser | Video Effects | Audio Filters | Recording |
|---------|--------------|---------------|-----------|
| Chrome/Edge | ✅ Full support | ✅ Excellent | ✅ VP9/Opus |
| Firefox | ✅ Full support | ✅ Good | ✅ VP9/Opus |
| Safari | ⚠️ Limited | ⚠️ Basic | ⚠️ Limited codec support |

**Recommended:** Chrome or Edge for best performance and audio quality.

## Documentation

- [Virtual Background Guide](docs/VIRTUAL_BACKGROUND_GUIDE.md) — Detailed WebGL pipeline, shader uniforms, and configuration reference
- [Audio Filters Guide](docs/AUDIO_FILTERS_GUIDE.md) — Audio processing architecture and API reference

## Credits

Virtual background engine based on [vpalmisano/virtual-background](https://github.com/vpalmisano/virtual-background), with significant enhancements for React integration, dual-model strategy, configurable anti-flicker pipeline, and UI-driven parameter tuning.

## License

Private — proof of concept.

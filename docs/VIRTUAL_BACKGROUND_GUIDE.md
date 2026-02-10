# Virtual Background & Blur Implementation Guide

Real-time virtual background and background blur effects using MediaPipe Tasks Vision segmentation and WebGL2 rendering.

## Overview

The implementation uses:
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) for person segmentation
- **WebGL2** for GPU-accelerated rendering, temporal smoothing, spatial blur, and compositing
- **MediaStreamTrackProcessor** for real-time video frame processing
- **Dual-model strategy** — different TFLite models for blur vs virtual background modes

## Project Structure

```
src/
├── config/
│   ├── types.ts              # AppConfig, EffectType, ModelKey, mode configs
│   ├── defaults.ts           # Default configuration values (JSON-driven)
│   └── index.ts              # Barrel exports
├── hooks/
│   ├── useVideoEffect.ts     # Effect state, config management, vbOptions sync
│   └── ...
├── components/
│   ├── EffectControls.tsx     # Effect type buttons, basic blur/bg settings
│   ├── AdvancedSettings.tsx   # Collapsible sliders for all parameters + JSON display
│   └── ...
└── lib/virtualBackground/
    ├── index.ts              # Main API — processVideoTrack() and options proxy
    ├── segmenter.ts          # MediaPipe ImageSegmenter wrapper
    ├── renderer.ts           # WebGL2 shaders (state update + blend)
    ├── processor.ts          # Video frame processing pipeline
    ├── filter.ts             # Optional video filters (brightness, contrast, gamma)
    ├── graph.ts              # Stats visualization (optional)
    └── worker.ts             # Web Worker for offloading (optional)

public/
├── mediapipe/
│   └── wasm/
│       ├── vision_wasm_internal.js
│       └── vision_wasm_internal.wasm
└── models/
    ├── selfie_segmenter.tflite
    └── selfie_multiclass_256x256.tflite
```

## Download Required Assets

### WASM Runtime

Download MediaPipe Vision WASM files to your `public/` folder:

```bash
mkdir -p public/mediapipe/wasm
curl -o public/mediapipe/wasm/vision_wasm_internal.js \
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js"
curl -o public/mediapipe/wasm/vision_wasm_internal.wasm \
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm"
```

### Segmentation Models

```bash
mkdir -p public/models

# Binary selfie segmenter (used for virtual background — cleaner person/bg split)
curl -o public/models/selfie_segmenter.tflite \
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"

# Multiclass selfie segmenter (used for blur — better detail on hair, clothing, accessories)
curl -o public/models/selfie_multiclass_256x256.tflite \
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass/tflite/float16/latest/selfie_multiclass.tflite"
```

**Model download links:**

| Model | URL | Use Case |
|-------|-----|----------|
| `selfie_segmenter.tflite` | [Download](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite) | Virtual background (binary person/bg mask) |
| `selfie_multiclass_256x256.tflite` | [Download](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass/tflite/float16/latest/selfie_multiclass.tflite) | Blur mode (multiclass: hair, body, face, clothing) |

## Dual-Model Strategy

The application dynamically selects the segmentation model based on the active effect:

| Effect | Model | Reason |
|--------|-------|--------|
| **Blur** | `selfie_multiclass_256x256` | Better detail segmentation for hair, clothing, accessories — softer, more natural blur transitions |
| **Virtual BG** | `selfie_segmenter` | Clean binary person/background split — decisive cutout with minimal artifacts |

Models are configured per-mode in `src/config/defaults.ts` and selectable via the UI.

## Configuration System

All tunable parameters are managed through a typed `AppConfig` object defined in `src/config/types.ts`:

```typescript
interface AppConfig {
    segmentation: {
        smoothing: number;       // Temporal smoothing factor (0.1–1.0)
        smoothstepMin: number;   // Mask edge lower threshold
        smoothstepMax: number;   // Mask edge upper threshold
        borderSmooth: number;    // Additional border feathering
        stateBlurRadius: number; // Spatial blur radius in state update pass
    };
    blur: {
        model: ModelKey;           // Which model to use for blur
        blurAmount: number;        // Background blur intensity (5–100)
        bgBlurRadiusFactor: number; // Multiplier for blur kernel radius
        blendSpatialBlur: number;  // Spatial blur in blend pass (smooths edges)
    };
    virtualBg: {
        model: ModelKey;             // Which model for virtual bg
        blendSpatialBlur: number;    // Spatial blur in blend pass
        blendSmoothstepMin: number;  // Blend mask lower threshold
        blendSmoothstepMax: number;  // Blend mask upper threshold
    };
}
```

Default values are in `src/config/defaults.ts`. All values can be tuned in real-time via the Advanced Settings UI panel.

## WebGL Rendering Pipeline

### Shader Pass 1: State Update

- Receives raw segmentation mask from MediaPipe
- Applies configurable spatial blur (Gaussian-weighted 3×3 kernel, radius via `u_stateBlurRadius`)
- Temporal smoothing with asymmetric graduated stickiness (person→background transitions are slower to reduce flicker)
- `smoothstep()` for clean edge transitions
- Output: smoothed binary mask stored in framebuffer for next frame

### Shader Pass 2: Blend

- Reads smoothed mask from state texture
- Applies mode-specific spatial blur on mask (`u_blendSpatialBlur`)
- **Blur mode:** Gaussian blur on background pixels, soft smoothstep blending
- **Virtual BG mode:** Background image/color replacement with tight smoothstep thresholds (`u_vbgSmoothstepMin` / `u_vbgSmoothstepMax`)
- Composites final output: `mix(background, foreground, softMask)`

### Configurable Uniforms

| Uniform | Shader | Purpose |
|---------|--------|---------|
| `u_stateBlurRadius` | State Update | Spatial blur radius for mask preprocessing |
| `u_blendSpatialBlur` | Blend | Per-mode spatial blur on final mask |
| `u_vbgSmoothstepMin` | Blend | Virtual BG blend lower threshold |
| `u_vbgSmoothstepMax` | Blend | Virtual BG blend upper threshold |

## Anti-Flicker Techniques

1. **Spatial blur on state update** — Gaussian 3×3 kernel smooths noisy mask edges
2. **Asymmetric temporal smoothing** — Graduated stickiness makes person→background transitions slower
3. **Mode-specific blend** — Blur uses wide soft smoothstep; virtual BG uses tight thresholds
4. **Spatial blur in blend** — 8px for blur mode, 14px for virtual BG (both configurable)

## Usage

### React Hook API

```typescript
import { useVideoEffect } from '../hooks';

const {
    effectType,         // 'none' | 'blur' | 'background'
    config,             // AppConfig — current config state
    bgType,             // 'image' | 'green' | 'blue' | 'gradient'
    updateConfig,       // (path: string, value: number | string) => void
    applyEffect,        // (effect, webcamStream, playVideo) => Promise<void>
    stopEffect,         // () => void
    getActiveConfigJson, // () => Record<string, unknown> — for copy/export
} = useVideoEffect();

// Update a config value (syncs to vbOptions in real-time)
updateConfig('blur.blurAmount', 35);
updateConfig('segmentation.smoothing', 0.8);
```

### Low-Level API

```typescript
import { processVideoTrack, options as vbOptions } from '../lib/virtualBackground';

// Configure
vbOptions.enabled = true;
vbOptions.modelPath = '/models/selfie_multiclass_256x256.tflite';
vbOptions.bgBlur = 20;
vbOptions.bgBlurRadius = 30;

// Process track (always clone first)
const clonedTrack = videoTrack.clone();
const processedTrack = await processVideoTrack(clonedTrack);
videoElement.srcObject = new MediaStream([processedTrack]);
```

## ProcessVideoTrackOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable effects |
| `modelPath` | string | `'/models/selfie_segmenter.tflite'` | Path to TFLite model |
| `bgBlur` | number | `0` | Background blur amount (0 = off) |
| `bgBlurRadius` | number | `30` | Blur kernel radius |
| `backgroundUrl` | string | `''` | URL/data URI for virtual background |
| `smoothing` | number | `0.7` | Temporal smoothing (0–1) |
| `smoothstepMin` | number | `0.25` | Mask edge lower bound |
| `smoothstepMax` | number | `0.85` | Mask edge upper bound |
| `borderSmooth` | number | `0.6` | Border feathering |
| `stateBlurRadius` | number | `6.0` | Spatial blur radius in state update |
| `blendSpatialBlurBlur` | number | `8.0` | Spatial blur for blur mode blend |
| `blendSpatialBlurVbg` | number | `14.0` | Spatial blur for virtual BG blend |
| `vbgSmoothstepMin` | number | `0.4` | Virtual BG blend lower threshold |
| `vbgSmoothstepMax` | number | `0.6` | Virtual BG blend upper threshold |

## Performance Tips

1. **GPU acceleration** — MediaPipe segmenter uses WebGL delegate by default
2. **Clone tracks** — Always clone the original video track before processing
3. **Temporal smoothing** — Higher values reduce flickering but add perceived latency
4. **Resolution** — Default is 1280×720@30fps; lower resolution = faster processing
5. **Model selection** — Binary model is faster; multiclass provides finer detail

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Track ended" error | Always clone the video track before `processVideoTrack()` |
| WASM files not loading | Ensure files are in `public/mediapipe/wasm/` with correct paths |
| Poor segmentation quality | Ensure good lighting; try adjusting `smoothstepMin`/`smoothstepMax` |
| Flickering on chair/clothing | Increase `stateBlurRadius` and `blendSpatialBlur`; tighten smoothstep thresholds |
| Virtual BG has edge artifacts | Increase `blendSpatialBlurVbg` and tighten `vbgSmoothstepMin`/`vbgSmoothstepMax` |

## Credits

Based on [vpalmisano/virtual-background](https://github.com/vpalmisano/virtual-background) with significant enhancements for React integration, dual-model strategy, configurable anti-flicker pipeline, and UI-driven parameter tuning.

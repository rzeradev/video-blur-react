# Audio Noise Suppression Guide

Audio filtering and noise suppression implementation for the recording feature.

## Overview

The application provides optional audio processing during recording to improve microphone audio quality by reducing background noise, echo, and applying EQ enhancements.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Microphone    │────▶│  Browser Constraints │────▶│  Web Audio API  │
│                 │     │  (WebRTC processing) │     │  (EQ & Compress)│
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │  Output Stream  │
                                                     │  (to recorder)  │
                                                     └─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `src/utils/audioFilters.ts` | Core audio filtering utility (createFilteredAudioStream, getRawMicrophoneStream) |
| `src/hooks/useAudioFilter.ts` | React hook managing audio state, mic level monitoring, and noise suppression toggle |
| `src/components/AudioControls.tsx` | UI component with noise suppression toggle and mic level meter |

## How It Works

### 1. Browser-Level Processing (WebRTC Constraints)

When requesting microphone access, we use MediaStream constraints to enable browser's built-in audio processing:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
    },
});
```

**What each constraint does:**

| Constraint | Effect |
|------------|--------|
| `echoCancellation` | Removes echo from speakers playing back into mic |
| `noiseSuppression` | ML-based noise reduction (fan noise, AC, etc.) |
| `autoGainControl` | Normalizes volume levels automatically |

### 2. Web Audio API Enhancement

After browser processing, we apply additional EQ using Web Audio API:

```
Source ──▶ High-Pass (80Hz) ──▶ Low-Pass (12kHz) ──▶ Compressor ──▶ Output
```

**Filter Chain:**

1. **High-Pass Filter (80Hz)** — Removes low-frequency rumble, AC hum (50/60Hz), keyboard/desk thumps
2. **Low-Pass Filter (12kHz)** — Removes high-frequency hiss and sibilance artifacts
3. **Dynamics Compressor** — Threshold: -20dB, Ratio: 3:1, provides consistent volume levels

### 3. Mic Level Monitoring

The `useAudioFilter` hook sets up a real-time mic level meter using an `AnalyserNode` with `requestAnimationFrame` for smooth updates. The level is displayed as a visual bar in the `AudioControls` component.

## Usage

### React Hook API

```typescript
import { useAudioFilter } from '../hooks';

const {
    audioFilterResult,   // AudioFilterResult | null
    noiseSuppression,    // boolean — toggle state
    setNoiseSuppression, // (value: boolean) => void
    micLevel,            // number 0-100 — real-time mic level
    startAudio,          // () => Promise<AudioFilterResult>
    stopAudio,           // () => void — cleanup all resources
} = useAudioFilter();
```

### Low-Level API

```typescript
import { createFilteredAudioStream, getRawMicrophoneStream } from '../utils/audioFilters';

// With filters
const result = await createFilteredAudioStream(deviceId, {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    highPassFilter: true,
    highPassFrequency: 80,
});

// Use result.stream for recording
// Call result.destroy() when done

// Without filters (raw audio)
const rawStream = await getRawMicrophoneStream(deviceId);
```

### AudioFilterResult Interface

```typescript
interface AudioFilterResult {
    stream: MediaStream;              // Processed audio stream
    audioContext: AudioContext | null; // Web Audio context (for cleanup)
    destroy: () => void;              // Cleanup function
}
```

## Integration with Recording

The `useRecording` hook accepts a video stream and audio stream. In `VideoRecorder.tsx`, the orchestrator connects them:

```typescript
const handleStartRecording = useCallback(() => {
    if (!videoRef.current?.srcObject || !audioFilterResult) return;
    const videoStream = videoRef.current.srcObject as MediaStream;
    startRecording(videoStream, audioFilterResult.stream);
}, [videoRef, audioFilterResult, startRecording]);
```

Recording uses `MediaRecorder` with `video/webm;codecs=vp9,opus` mimeType.

## Browser Compatibility

| Browser | Noise Suppression | Echo Cancellation |
|---------|-------------------|-------------------|
| Chrome/Edge | ✅ Excellent | ✅ Excellent |
| Firefox | ✅ Good | ✅ Good |
| Safari | ⚠️ Basic | ⚠️ Basic |

**Note:** Chrome/Edge have the best noise suppression due to their ML-based audio processing pipeline.

## Limitations

1. **Speaker Echo** — Software echo cancellation works best with headphones. When speakers are near the microphone, some echo may persist.
2. **Loud Background Noise** — Very loud continuous noise (construction, traffic) may not be fully suppressed.
3. **Latency** — Audio processing adds minimal latency (~10-20ms), which is imperceptible for recording.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No difference with filter enabled | Check browser console for errors; use Chrome/Edge for best results |
| Audio sounds muffled | Adjust `highPassFrequency` (try 60Hz instead of 80Hz) |
| Echo persists | Use headphones; move mic away from speakers |
| Audio cuts out | Check AudioContext state (should be "running") |

/**
 * Audio Filters Utility
 * Uses browser's built-in noise suppression + optional enhancements
 */

export interface AudioFilterOptions {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    highPassFilter?: boolean;
    highPassFrequency?: number;
}

export interface AudioFilterResult {
    stream: MediaStream;
    audioContext: AudioContext | null;
    destroy: () => void;
}

/**
 * Create a microphone stream with noise suppression
 * Uses browser's built-in WebRTC noise suppression which is quite good
 */
export async function createFilteredAudioStream(
    deviceId?: string,
    options: AudioFilterOptions = {}
): Promise<AudioFilterResult> {
    const opts = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        highPassFilter: true,
        highPassFrequency: 80,
        ...options
    };
    
    // Get mic with browser's built-in processing
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: deviceId || undefined,
            echoCancellation: opts.echoCancellation,
            noiseSuppression: opts.noiseSuppression,
            autoGainControl: opts.autoGainControl,
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
        },
    });
    
    // Apply high-pass filter if enabled
    let audioContext: AudioContext | null = null;
    let outputStream = stream;
    
    if (opts.highPassFilter) {
        audioContext = new AudioContext({ sampleRate: 48000 });
        const source = audioContext.createMediaStreamSource(stream);
        const destination = audioContext.createMediaStreamDestination();
        
        // High-pass filter removes low rumble (AC hum, keyboard thumps, etc)
        const highPass = audioContext.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = opts.highPassFrequency || 80;
        highPass.Q.value = 0.7;
        
        // Low-pass filter to reduce high frequency hiss
        const lowPass = audioContext.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 12000;
        lowPass.Q.value = 0.7;
        
        // Gentle compressor for consistent levels
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 40;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.01;
        compressor.release.value = 0.1;
        
        source.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(compressor);
        compressor.connect(destination);
        
        outputStream = destination.stream;
    }
    
    const destroy = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
        }
    };
    
    return {
        stream: outputStream,
        audioContext,
        destroy,
    };
}

/**
 * Get raw microphone without any processing
 */
export async function getRawMicrophoneStream(deviceId?: string): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: deviceId || undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: { ideal: 48000 },
        },
    });
}

import { useState, useRef, useCallback } from 'react';
import { createFilteredAudioStream, getRawMicrophoneStream, type AudioFilterResult } from '../utils/audioFilters';

export interface UseAudioFilterResult {
    audioFilterResult: AudioFilterResult | null;
    noiseSuppression: boolean;
    setNoiseSuppression: (value: boolean) => void;
    micLevel: number;
    startAudio: () => Promise<AudioFilterResult>;
    stopAudio: () => void;
}

export function useAudioFilter(): UseAudioFilterResult {
    const [audioFilterResult, setAudioFilterResult] = useState<AudioFilterResult | null>(null);
    const [noiseSuppression, setNoiseSuppression] = useState(true);
    const [micLevel, setMicLevel] = useState(0);

    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const micAudioContextRef = useRef<AudioContext | null>(null);

    const updateMicLevel = useCallback(() => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, average * 1.5));
        animationFrameRef.current = requestAnimationFrame(updateMicLevel);
    }, []);

    const startAudio = useCallback(async (): Promise<AudioFilterResult> => {
        let audioResult: AudioFilterResult;
        if (noiseSuppression) {
            audioResult = await createFilteredAudioStream(undefined, {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                highPassFilter: true,
                highPassFrequency: 80,
            });
        } else {
            const rawStream = await getRawMicrophoneStream();
            audioResult = {
                stream: rawStream,
                audioContext: null,
                destroy: () => rawStream.getTracks().forEach(t => t.stop()),
            };
        }
        setAudioFilterResult(audioResult);

        // Mic level monitoring
        const micAudioContext = new AudioContext();
        micAudioContextRef.current = micAudioContext;
        const source = micAudioContext.createMediaStreamSource(audioResult.stream);
        const analyser = micAudioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        updateMicLevel();

        return audioResult;
    }, [noiseSuppression, updateMicLevel]);

    const stopAudio = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioFilterResult) {
            try { audioFilterResult.destroy(); } catch { /* already closed */ }
            setAudioFilterResult(null);
        }
        if (micAudioContextRef.current && micAudioContextRef.current.state !== 'closed') {
            micAudioContextRef.current.close().catch(() => {});
            micAudioContextRef.current = null;
        }
        setMicLevel(0);
        analyserRef.current = null;
    }, [audioFilterResult]);

    return {
        audioFilterResult,
        noiseSuppression,
        setNoiseSuppression,
        micLevel,
        startAudio,
        stopAudio,
    };
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { processVideoTrack, options as vbOptions } from '../lib/virtualBackground';
import { defaultConfig, AVAILABLE_MODELS } from '../config';
import type { AppConfig, EffectType, BackgroundType } from '../config';
import industrialBg from '../assets/industrial.png';

export interface UseVideoEffectResult {
    effectType: EffectType;
    config: AppConfig;
    bgType: BackgroundType;
    customBgUrl: string;
    processedTrack: MediaStreamTrack | null;
    setBgType: (type: BackgroundType) => void;
    setCustomBgUrl: (url: string) => void;
    updateConfig: (path: string, value: number | string) => void;
    applyEffect: (
        effect: EffectType,
        webcamStream: MediaStream,
        playVideo: (stream: MediaStream) => Promise<void>,
    ) => Promise<void>;
    stopEffect: () => void;
    handleBgImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    getActiveConfigJson: () => Record<string, unknown>;
}

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function useVideoEffect(): UseVideoEffectResult {
    const [effectType, setEffectType] = useState<EffectType>('none');
    const [config, setConfig] = useState<AppConfig>(deepClone(defaultConfig));
    const [bgType, setBgType] = useState<BackgroundType>('image');
    const [customBgUrl, setCustomBgUrl] = useState<string>(industrialBg);
    const [processedTrack, setProcessedTrack] = useState<MediaStreamTrack | null>(null);
    const processedTrackRef = useRef<MediaStreamTrack | null>(null);

    const updateConfig = useCallback((path: string, value: number | string) => {
        setConfig(prev => {
            const next = deepClone(prev);
            const keys = path.split('.');
            let target: Record<string, unknown> = next as unknown as Record<string, unknown>;
            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]] as Record<string, unknown>;
            }
            target[keys[keys.length - 1]] = value;
            return next;
        });
    }, []);

    // Sync config changes to vbOptions in real-time
    useEffect(() => {
        vbOptions.borderSmooth = config.segmentation.borderSmooth;
        vbOptions.smoothing = config.segmentation.smoothing;
        vbOptions.smoothstepMin = config.segmentation.smoothstepMin;
        vbOptions.smoothstepMax = config.segmentation.smoothstepMax;
        vbOptions.stateBlurRadius = config.segmentation.stateBlurRadius;
        vbOptions.vbgSmoothstepMin = config.virtualBg.blendSmoothstepMin;
        vbOptions.vbgSmoothstepMax = config.virtualBg.blendSmoothstepMax;

        if (effectType === 'blur') {
            vbOptions.bgBlur = config.blur.blurAmount;
            vbOptions.bgBlurRadius = Math.max(30, config.blur.blurAmount * config.blur.bgBlurRadiusFactor);
            vbOptions.blendSpatialBlurBlur = config.blur.blendSpatialBlur;
        } else if (effectType === 'background') {
            vbOptions.blendSpatialBlurVbg = config.virtualBg.blendSpatialBlur;
        }
    }, [config, effectType]);

    const stopEffect = useCallback(() => {
        if (processedTrackRef.current) {
            processedTrackRef.current.stop();
            processedTrackRef.current = null;
            setProcessedTrack(null);
        }
    }, []);

    const applyEffect = useCallback(async (
        effect: EffectType,
        webcamStream: MediaStream,
        playVideo: (stream: MediaStream) => Promise<void>,
    ) => {
        // Stop previous
        stopEffect();

        const videoTrack = webcamStream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState === 'ended') {
            throw new Error('Video track not available');
        }

        if (effect === 'none') {
            await playVideo(webcamStream);
            vbOptions.enabled = false;
        } else if (effect === 'blur') {
            const modelKey = config.blur.model;
            vbOptions.modelPath = AVAILABLE_MODELS[modelKey];
            vbOptions.enabled = true;
            vbOptions.bgBlur = config.blur.blurAmount;
            vbOptions.bgBlurRadius = Math.max(30, config.blur.blurAmount * config.blur.bgBlurRadiusFactor);
            vbOptions.borderSmooth = config.segmentation.borderSmooth;
            vbOptions.blendSpatialBlurBlur = config.blur.blendSpatialBlur;
            vbOptions.backgroundUrl = '';

            const clonedTrack = videoTrack.clone();
            const processed = await processVideoTrack(clonedTrack);
            processedTrackRef.current = processed;
            setProcessedTrack(processed);
            await playVideo(new MediaStream([processed]));
        } else if (effect === 'background') {
            let backgroundUrl: string;

            if (bgType === 'image') {
                backgroundUrl = customBgUrl;
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 1280;
                canvas.height = 720;
                const ctx = canvas.getContext('2d')!;
                if (bgType === 'green') {
                    ctx.fillStyle = '#00ff00';
                } else if (bgType === 'blue') {
                    ctx.fillStyle = '#0066ff';
                } else {
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#667eea');
                    gradient.addColorStop(1, '#764ba2');
                    ctx.fillStyle = gradient;
                }
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                backgroundUrl = canvas.toDataURL('image/png');
            }

            const modelKey = config.virtualBg.model;
            vbOptions.modelPath = AVAILABLE_MODELS[modelKey];
            vbOptions.enabled = true;
            vbOptions.bgBlur = 0;
            vbOptions.borderSmooth = config.segmentation.borderSmooth;
            vbOptions.blendSpatialBlurVbg = config.virtualBg.blendSpatialBlur;
            vbOptions.vbgSmoothstepMin = config.virtualBg.blendSmoothstepMin;
            vbOptions.vbgSmoothstepMax = config.virtualBg.blendSmoothstepMax;
            vbOptions.backgroundUrl = backgroundUrl;

            const clonedTrack = videoTrack.clone();
            const processed = await processVideoTrack(clonedTrack);
            processedTrackRef.current = processed;
            setProcessedTrack(processed);
            await playVideo(new MediaStream([processed]));
        }

        setEffectType(effect);
    }, [config, bgType, customBgUrl, stopEffect]);

    const handleBgImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomBgUrl(url);
            setBgType('image');
            if (effectType === 'background') {
                vbOptions.backgroundUrl = url;
            }
        }
    }, [effectType]);

    const getActiveConfigJson = useCallback((): Record<string, unknown> => {
        const activeMode = effectType === 'blur' ? 'blur' : effectType === 'background' ? 'virtualBg' : 'none';
        return {
            activeMode,
            segmentation: config.segmentation,
            blur: config.blur,
            virtualBg: config.virtualBg,
        };
    }, [config, effectType]);

    return {
        effectType,
        config,
        bgType,
        customBgUrl,
        processedTrack,
        setBgType,
        setCustomBgUrl,
        updateConfig,
        applyEffect,
        stopEffect,
        handleBgImageUpload,
        getActiveConfigJson,
    };
}

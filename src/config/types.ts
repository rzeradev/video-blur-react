export type EffectType = 'none' | 'blur' | 'background';
export type BackgroundType = 'image' | 'green' | 'blue' | 'gradient';

export const AVAILABLE_MODELS = {
    selfie_segmenter: '/models/selfie_segmenter.tflite',
    selfie_multiclass_256x256: '/models/selfie_multiclass_256x256.tflite',
} as const;

export type ModelKey = keyof typeof AVAILABLE_MODELS;

export interface SegmentationConfig {
    smoothing: number;
    smoothstepMin: number;
    smoothstepMax: number;
    borderSmooth: number;
    stateBlurRadius: number;
}

export interface BlurModeConfig {
    model: ModelKey;
    blurAmount: number;
    bgBlurRadiusFactor: number;
    blendSpatialBlur: number;
}

export interface VirtualBgModeConfig {
    model: ModelKey;
    blendSpatialBlur: number;
    blendSmoothstepMin: number;
    blendSmoothstepMax: number;
}

export interface AppConfig {
    segmentation: SegmentationConfig;
    blur: BlurModeConfig;
    virtualBg: VirtualBgModeConfig;
}

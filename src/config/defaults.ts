import type { AppConfig } from './types';

export const defaultConfig: AppConfig = {
    segmentation: {
        smoothing: 0.7,
        smoothstepMin: 0.25,
        smoothstepMax: 0.85,
        borderSmooth: 0.6,
        stateBlurRadius: 6.0,
    },
    blur: {
        model: 'selfie_multiclass_256x256',
        blurAmount: 20,
        bgBlurRadiusFactor: 1.5,
        blendSpatialBlur: 8.0,
    },
    virtualBg: {
        model: 'selfie_segmenter',
        blendSpatialBlur: 14.0,
        blendSmoothstepMin: 0.4,
        blendSmoothstepMax: 0.6,
    },
};

import { Graph } from './graph';
import { runSegmenter } from './segmenter';
import type { SegmenterStats } from './segmenter';
import { TrackProcessor } from './processor';

declare global {
    interface HTMLVideoElement {
        captureStream: (frameRate: number) => MediaStream;
    }
}

export type BackgroundSource = {
    type: string;
    media?: ImageBitmap | ReadableStream;
    url: string;
    video?: HTMLVideoElement;
    track?: MediaStreamTrack;
};

export type ProcessVideoTrackOptions = {
    wasmLoaderPath: string;
    wasmBinaryPath: string;
    modelPath: string;
    runWorker: boolean;
    enabled: boolean;
    backgroundUrl: string;
    backgroundSource?: BackgroundSource | null;
    showStats: boolean;
    borderSmooth: number;
    smoothing: number;
    smoothstepMin: number;
    smoothstepMax: number;
    restartEvery: number;
    bgBlur: number;
    bgBlurRadius: number;
    stateBlurRadius: number;
    blendSpatialBlurBlur: number;
    blendSpatialBlurVbg: number;
    vbgSmoothstepMin: number;
    vbgSmoothstepMax: number;
    enableFilters: boolean;
    blur: number;
    brightness: number;
    contrast: number;
    gamma: number;
};

const opts = {
    wasmLoaderPath: '/mediapipe/wasm/vision_wasm_internal.js',
    wasmBinaryPath: '/mediapipe/wasm/vision_wasm_internal.wasm',
    modelPath: '/models/selfie_multiclass_256x256.tflite',
    runWorker: false,
    enabled: true,
    backgroundUrl: '',
    showStats: false,
    borderSmooth: 0.6,
    smoothing: 0.7,
    smoothstepMin: 0.25,
    smoothstepMax: 0.85,
    restartEvery: 0,
    bgBlur: 0.0,
    bgBlurRadius: 30,
    stateBlurRadius: 6.0,
    blendSpatialBlurBlur: 8.0,
    blendSpatialBlurVbg: 14.0,
    vbgSmoothstepMin: 0.4,
    vbgSmoothstepMax: 0.6,
    enableFilters: false,
    blur: 0,
    brightness: 0,
    contrast: 1,
    gamma: 1,
} as ProcessVideoTrackOptions;

let worker: Worker | null = null;

function getWorkerOptions() {
    const workerOpts = { ...options };
    const transferables: Transferable[] = [];
    if (workerOpts.backgroundSource?.media) {
        const { type, media, url } = workerOpts.backgroundSource;
        workerOpts.backgroundSource = { type, media, url };
        transferables.push(media as Transferable);
    } else {
        delete workerOpts.backgroundSource;
    }
    if (options.backgroundSource) {
        options.backgroundSource.media = undefined;
    }
    return { options: workerOpts, transferables };
}

export const options = new Proxy(opts, {
    get: function (target, prop) {
        return Reflect.get(target, prop);
    },
    set: function (target, prop, value) {
        if (prop === 'backgroundUrl' && target.backgroundUrl.startsWith('blob:')) {
            URL.revokeObjectURL(target.backgroundUrl);
        }
        const ret = Reflect.set(target, prop, value);
        if (prop === 'backgroundUrl') {
            unloadBackground();
            loadBackground()
                .then(() => {
                    if (worker) {
                        const { options: workerOpts, transferables } = getWorkerOptions();
                        worker.postMessage({ name: 'options', options: workerOpts }, transferables);
                    }
                })
                .catch((err) => {
                    console.error(`Failed to load background: ${err}`);
                });
        } else if (prop !== 'backgroundSource') {
            if (worker) {
                const { options: workerOpts, transferables } = getWorkerOptions();
                worker.postMessage({ name: 'options', options: workerOpts }, transferables);
            }
        }
        return ret;
    },
});

function unloadBackground() {
    if (options.backgroundSource) {
        options.backgroundSource.track?.stop();
        if (options.backgroundSource.video) {
            options.backgroundSource.video.pause();
            options.backgroundSource.video.src = '';
        }
        options.backgroundSource = null;
    }
}

async function loadBackground() {
    const url = options.backgroundUrl;
    if (!url) {
        return;
    }

    const response = await fetch(url);
    if (!response.ok) {
        console.error(`[virtual-background] Failed to fetch background source ${url} (status: ${response.status})`);
        return;
    }
    const contentType = response.headers.get('Content-Type');
    const blob = await response.blob();

    if (contentType?.startsWith('image/')) {
        const imageBitmap = await createImageBitmap(blob);
        options.backgroundSource = { type: 'image', media: imageBitmap, url };
    } else if (contentType?.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(blob);
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        await video.play();

        await new Promise<void>((resolve, reject) => {
            video.addEventListener('timeupdate', () => { resolve(); }, { once: true });
            video.addEventListener('error', () => { reject(new Error('Video load error')); }, { once: true });
        });
        const track = video.captureStream(30).getVideoTracks()[0];
        if (!track) {
            console.error(`Failed to capture stream for video ${url} (no video track)`);
            video.pause();
            URL.revokeObjectURL(video.src);
            video.src = '';
            return;
        }
        const { readable } = new TrackProcessor({ track });
        options.backgroundSource = { type: 'video', media: readable, url, video, track };
    } else {
        console.warn(`[virtual-background] Unsupported background source type: ${contentType} for ${url}`);
        return;
    }
}

export async function saveBackground(file: File) {
    const storageRoot = await navigator.storage.getDirectory();
    {
        const handle = await storageRoot.getFileHandle(`background`, { create: true });
        const fd = await handle.createWritable();
        const blob = new Blob([file], { type: file.type });
        await fd.write(blob);
        await fd.close();
    }
    {
        const handle = await storageRoot.getFileHandle(`background_type`, { create: true });
        const fd = await handle.createWritable();
        await fd.write(file.type);
        await fd.close();
    }
}

export async function loadBackgroundFromStorage() {
    try {
        const storageRoot = await navigator.storage.getDirectory();
        const handle = await storageRoot.getFileHandle(`background`);
        const file = await handle.getFile();
        const handleType = await storageRoot.getFileHandle(`background_type`);
        const type = await (await handleType.getFile()).text();
        const newFile = new File([file], 'background', { type });
        const url = URL.createObjectURL(newFile);
        options.backgroundUrl = url;
    } catch {
        // If the file does not exist, we simply ignore the error.
    }
}

export function updateBackground(url?: string) {
    if (!url) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = async () => {
            const files = input.files;
            if (files && files.length > 0) {
                const file = files[0];
                const blobUrl = URL.createObjectURL(file);
                options.backgroundUrl = blobUrl;
                await saveBackground(file);
            }
        };
        input.click();
    } else {
        options.backgroundUrl = url;
    }
}

let refcount = 0;

export async function processVideoTrack(track: MediaStreamTrack, opts?: Partial<ProcessVideoTrackOptions>) {
    Object.assign(options, opts);

    refcount++;

    const trackCapabilities = track.getCapabilities();
    const trackSettings = track.getSettings();
    const trackConstraints = track.getConstraints();
    const { frameRate } = trackSettings;

    const { readable } = new TrackProcessor({ track });

    const canvas = document.createElement('canvas');
    const outputTrack = canvas.captureStream(frameRate).getVideoTracks()[0];
    const offscreen = canvas.transferControlToOffscreen();
    let graph: Graph | null = null;

    function onStats(stats: SegmenterStats) {
        if (options.showStats) {
            const { fps } = stats;
            if (!graph) {
                graph = new Graph();
            }
            graph.push(fps, 'fps');
        } else {
            if (graph) {
                graph.remove();
                graph = null;
            }
        }
    }

    await loadBackgroundFromStorage();

    const outputTrackStop = outputTrack.stop.bind(outputTrack);
    outputTrack.stop = () => {
        outputTrackStop();
        track.stop();
        refcount--;
        if (!refcount) {
            unloadBackground();
            if (worker) {
                worker.terminate();
                worker = null;
            }
        }
        if (graph) {
            graph.remove();
            graph = null;
        }
    };
    outputTrack.getCapabilities = () => trackCapabilities;
    outputTrack.getSettings = () => trackSettings;
    outputTrack.getConstraints = () => trackConstraints;
    track.addEventListener('ended', () => outputTrack.stop());

    if (options.runWorker) {
        if (!worker) {
            worker = new Worker(new URL('./worker.ts', import.meta.url));
        }
        const { options: workerOptions, transferables } = getWorkerOptions();
        transferables.push(offscreen, readable);
        worker.postMessage(
            { name: 'runSegmenter', canvas: offscreen, readable, options: workerOptions },
            transferables
        );
        worker.addEventListener('message', ({ data }) => {
            const { name, stats } = data as { name: string; stats: SegmenterStats };
            if (name === 'stats') {
                onStats(stats);
            }
        });
    } else {
        await runSegmenter(offscreen, readable, options, onStats);
    }

    return outputTrack;
}

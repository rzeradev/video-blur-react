import { runSegmenter, options } from './segmenter';
import type { ProcessVideoTrackOptions } from './index';
import type { SegmenterStats } from './segmenter';

self.onmessage = async ({ data }) => {
    const { name, canvas, readable, options: opts } = data as {
        name: string;
        canvas: OffscreenCanvas;
        readable: ReadableStream;
        options: ProcessVideoTrackOptions;
    };
    if (name === 'runSegmenter') {
        Object.assign(options, opts);
        await runSegmenter(canvas, readable, options, (stats: SegmenterStats) => {
            self.postMessage({ name: 'stats', stats });
        });
    } else if (name === 'options') {
        Object.assign(options, opts);
    }
};

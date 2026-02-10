/**
 * RNNoise AudioWorklet Processor
 * Uses RNNoise WASM for real-time noise suppression
 */

// RNNoise processes 480 samples at a time (10ms at 48kHz)
const RNNOISE_FRAME_SIZE = 480;
const RNNOISE_SAMPLE_RATE = 48000;

class RNNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rnnoise = null;
        this.rnnoiseState = null;
        this.inputBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.outputBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.inputBufferFill = 0;
        this.outputBufferRead = 0;
        this.outputBufferFill = 0;
        this.enabled = true;
        
        this.port.onmessage = (event) => {
            if (event.data.type === 'init') {
                this.initRNNoise(event.data.wasmModule);
            } else if (event.data.type === 'enable') {
                this.enabled = event.data.enabled;
            }
        };
    }
    
    async initRNNoise(wasmModule) {
        try {
            this.rnnoise = wasmModule;
            this.rnnoiseState = this.rnnoise._rnnoise_create();
            this.pcmInputPtr = this.rnnoise._malloc(RNNOISE_FRAME_SIZE * 4);
            this.pcmOutputPtr = this.rnnoise._malloc(RNNOISE_FRAME_SIZE * 4);
            this.port.postMessage({ type: 'ready' });
        } catch (e) {
            this.port.postMessage({ type: 'error', error: e.message });
        }
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        
        if (!input || !input[0] || !output || !output[0]) {
            return true;
        }
        
        const inputChannel = input[0];
        const outputChannel = output[0];
        
        // If RNNoise not ready or disabled, pass through
        if (!this.rnnoise || !this.rnnoiseState || !this.enabled) {
            outputChannel.set(inputChannel);
            return true;
        }
        
        // Process samples
        for (let i = 0; i < inputChannel.length; i++) {
            // Add to input buffer
            this.inputBuffer[this.inputBufferFill++] = inputChannel[i] * 32768; // Convert to int16 range
            
            // When input buffer is full, process with RNNoise
            if (this.inputBufferFill >= RNNOISE_FRAME_SIZE) {
                this.processRNNoiseFrame();
                this.inputBufferFill = 0;
            }
            
            // Output from output buffer
            if (this.outputBufferRead < this.outputBufferFill) {
                outputChannel[i] = this.outputBuffer[this.outputBufferRead++] / 32768; // Convert back to float
            } else {
                outputChannel[i] = 0;
            }
        }
        
        return true;
    }
    
    processRNNoiseFrame() {
        // Copy input to WASM memory
        const inputHeap = new Float32Array(
            this.rnnoise.HEAPF32.buffer,
            this.pcmInputPtr,
            RNNOISE_FRAME_SIZE
        );
        inputHeap.set(this.inputBuffer);
        
        // Process with RNNoise
        this.rnnoise._rnnoise_process_frame(
            this.rnnoiseState,
            this.pcmOutputPtr,
            this.pcmInputPtr
        );
        
        // Copy output from WASM memory
        const outputHeap = new Float32Array(
            this.rnnoise.HEAPF32.buffer,
            this.pcmOutputPtr,
            RNNOISE_FRAME_SIZE
        );
        this.outputBuffer.set(outputHeap);
        this.outputBufferRead = 0;
        this.outputBufferFill = RNNOISE_FRAME_SIZE;
    }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);

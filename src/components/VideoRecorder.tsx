import { useEffect, useRef, useCallback } from 'react';
import { useWebcam, useAudioFilter, useVideoEffect, useRecording } from '../hooks';
import { VideoPreview } from './VideoPreview';
import { EffectControls } from './EffectControls';
import { AdvancedSettings } from './AdvancedSettings';
import { AudioControls } from './AudioControls';
import { RecordingControls } from './RecordingControls';
import type { EffectType } from '../config';

export function VideoRecorder() {
    const {
        videoRef,
        webcamStream,
        isLoading,
        error,
        setError,
        setIsLoading,
        startWebcam,
        stopWebcam,
        playVideo,
    } = useWebcam();

    const {
        audioFilterResult,
        noiseSuppression,
        setNoiseSuppression,
        micLevel,
        startAudio,
        stopAudio,
    } = useAudioFilter();

    const {
        effectType,
        config,
        bgType,
        customBgUrl,
        setBgType,
        updateConfig,
        applyEffect,
        stopEffect,
        handleBgImageUpload,
        getActiveConfigJson,
    } = useVideoEffect();

    const {
        isRecording,
        recordingDuration,
        recordedBlob,
        startRecording,
        stopRecording,
        downloadRecording,
        formatDuration,
    } = useRecording();

    const handleStartWebcam = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const stream = await startWebcam();
            await startAudio();
            await playVideo(stream);
        } catch (err) {
            setError(`Failed to access camera/microphone: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [startWebcam, startAudio, playVideo, setIsLoading, setError]);

    const handleStopWebcam = useCallback(() => {
        stopEffect();
        stopAudio();
        stopWebcam();
    }, [stopEffect, stopAudio, stopWebcam]);

    const handleApplyEffect = useCallback(async (effect: EffectType) => {
        if (!webcamStream) return;
        setIsLoading(true);
        setError(null);
        try {
            await applyEffect(effect, webcamStream, playVideo);
        } catch (err) {
            setError(`Failed to apply effect: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [webcamStream, applyEffect, playVideo, setIsLoading, setError]);

    const handleStartRecording = useCallback(() => {
        if (!videoRef.current?.srcObject || !audioFilterResult) return;
        const videoStream = videoRef.current.srcObject as MediaStream;
        startRecording(videoStream, audioFilterResult.stream);
    }, [videoRef, audioFilterResult, startRecording]);

    // Cleanup on unmount
    const handleStopRef = useRef(handleStopWebcam);
    handleStopRef.current = handleStopWebcam;
    useEffect(() => {
        return () => { handleStopRef.current(); };
    }, []);

    return (
        <div className="video-recorder">
            <VideoPreview
                videoRef={videoRef}
                isLoading={isLoading}
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                formatDuration={formatDuration}
            />

            {error && <div className="error-message">{error}</div>}

            <div className="controls">
                <section className="control-section">
                    <h3>Camera</h3>
                    <div className="button-group">
                        {!webcamStream ? (
                            <button onClick={handleStartWebcam} disabled={isLoading}>
                                Start Camera
                            </button>
                        ) : (
                            <button onClick={handleStopWebcam} className="danger">
                                Stop Camera
                            </button>
                        )}
                    </div>
                </section>

                {webcamStream && (
                    <>
                        <EffectControls
                            effectType={effectType}
                            config={config}
                            bgType={bgType}
                            customBgUrl={customBgUrl}
                            isLoading={isLoading}
                            onApplyEffect={handleApplyEffect}
                            onBgTypeChange={setBgType}
                            onBgImageUpload={handleBgImageUpload}
                            onConfigChange={updateConfig}
                        />

                        <AdvancedSettings
                            config={config}
                            effectType={effectType}
                            onConfigChange={updateConfig}
                            onApplyEffect={handleApplyEffect}
                            getActiveConfigJson={getActiveConfigJson}
                        />

                        <AudioControls
                            noiseSuppression={noiseSuppression}
                            setNoiseSuppression={setNoiseSuppression}
                            micLevel={micLevel}
                        />

                        <RecordingControls
                            isRecording={isRecording}
                            recordedBlob={recordedBlob}
                            onStartRecording={handleStartRecording}
                            onStopRecording={stopRecording}
                            onDownload={downloadRecording}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

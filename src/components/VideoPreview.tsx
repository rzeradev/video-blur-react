import type { RefObject } from 'react';

interface VideoPreviewProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    isLoading: boolean;
    isRecording: boolean;
    recordingDuration: number;
    formatDuration: (seconds: number) => string;
}

export function VideoPreview({
    videoRef,
    isLoading,
    isRecording,
    recordingDuration,
    formatDuration,
}: VideoPreviewProps) {
    return (
        <div className="video-container">
            <video ref={videoRef} autoPlay muted playsInline />
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner" />
                    <p>Processing...</p>
                </div>
            )}
            {isRecording && (
                <div className="recording-indicator">
                    <span className="rec-dot" />
                    <span>REC {formatDuration(recordingDuration)}</span>
                </div>
            )}
        </div>
    );
}

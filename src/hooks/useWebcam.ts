import { useState, useRef, useCallback } from 'react';

export interface UseWebcamResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    webcamStream: MediaStream | null;
    isLoading: boolean;
    error: string | null;
    setError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    startWebcam: () => Promise<MediaStream>;
    stopWebcam: () => void;
    playVideo: (stream: MediaStream) => Promise<void>;
}

export function useWebcam(): UseWebcamResult {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const playVideo = useCallback(async (stream: MediaStream) => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
            const onLoaded = () => {
                video.play().then(() => resolve()).catch(reject);
            };
            if (video.readyState >= 1) {
                onLoaded();
            } else {
                video.onloadedmetadata = onLoaded;
            }
            video.onerror = () => reject(new Error('Video load error'));
        });
    }, []);

    const startWebcam = useCallback(async (): Promise<MediaStream> => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, frameRate: 30 },
            audio: false,
        });
        setWebcamStream(stream);
        return stream;
    }, []);

    const stopWebcam = useCallback(() => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            setWebcamStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [webcamStream]);

    return {
        videoRef,
        webcamStream,
        isLoading,
        error,
        setError,
        setIsLoading,
        startWebcam,
        stopWebcam,
        playVideo,
    };
}

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseRecordingResult {
    isRecording: boolean;
    recordingDuration: number;
    recordedBlob: Blob | null;
    startRecording: (videoStream: MediaStream, audioStream: MediaStream) => void;
    stopRecording: () => void;
    downloadRecording: () => void;
    formatDuration: (seconds: number) => string;
}

export function useRecording(): UseRecordingResult {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const startRecording = useCallback((videoStream: MediaStream, audioStream: MediaStream) => {
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
        ]);

        const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus',
        });

        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setIsRecording(false);
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        setRecordingDuration(0);
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const downloadRecording = useCallback(() => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    }, [recordedBlob]);

    const formatDuration = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Duration timer
    useEffect(() => {
        let interval: number | undefined;
        if (isRecording) {
            interval = window.setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRecording]);

    return {
        isRecording,
        recordingDuration,
        recordedBlob,
        startRecording,
        stopRecording,
        downloadRecording,
        formatDuration,
    };
}

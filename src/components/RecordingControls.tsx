interface RecordingControlsProps {
    isRecording: boolean;
    recordedBlob: Blob | null;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onDownload: () => void;
}

export function RecordingControls({
    isRecording,
    recordedBlob,
    onStartRecording,
    onStopRecording,
    onDownload,
}: RecordingControlsProps) {
    return (
        <section className="control-section">
            <h3>Recording</h3>
            <div className="button-group">
                {!isRecording ? (
                    <button onClick={onStartRecording} className="record-btn">
                        Start Recording
                    </button>
                ) : (
                    <button onClick={onStopRecording} className="danger">
                        Stop Recording
                    </button>
                )}
                {recordedBlob && !isRecording && (
                    <button onClick={onDownload}>
                        Download Recording
                    </button>
                )}
            </div>
        </section>
    );
}

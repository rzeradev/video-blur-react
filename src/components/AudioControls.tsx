interface AudioControlsProps {
    noiseSuppression: boolean;
    setNoiseSuppression: (value: boolean) => void;
    micLevel: number;
}

export function AudioControls({
    noiseSuppression,
    setNoiseSuppression,
    micLevel,
}: AudioControlsProps) {
    return (
        <section className="control-section">
            <h3>Audio</h3>
            <div className="audio-controls">
                <label className="toggle-label">
                    <input
                        type="checkbox"
                        checked={noiseSuppression}
                        onChange={(e) => setNoiseSuppression(e.target.checked)}
                    />
                    <span>Noise Suppression</span>
                </label>
                <div className="mic-level">
                    <span>Mic Level:</span>
                    <div className="level-bar">
                        <div className="level-fill" style={{ width: `${micLevel}%` }} />
                    </div>
                </div>
            </div>
        </section>
    );
}

import type { AppConfig, EffectType, BackgroundType } from '../config';

interface EffectControlsProps {
    effectType: EffectType;
    config: AppConfig;
    bgType: BackgroundType;
    customBgUrl: string;
    isLoading: boolean;
    onApplyEffect: (effect: EffectType) => void;
    onBgTypeChange: (type: BackgroundType) => void;
    onBgImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onConfigChange: (path: string, value: number | string) => void;
}

export function EffectControls({
    effectType,
    config,
    bgType,
    customBgUrl,
    isLoading,
    onApplyEffect,
    onBgTypeChange,
    onBgImageUpload,
    onConfigChange,
}: EffectControlsProps) {
    return (
        <section className="control-section">
            <h3>Video Effects</h3>
            <div className="button-group">
                <button
                    onClick={() => onApplyEffect('none')}
                    className={effectType === 'none' ? 'active' : ''}
                    disabled={isLoading}
                >
                    None
                </button>
                <button
                    onClick={() => onApplyEffect('blur')}
                    className={effectType === 'blur' ? 'active' : ''}
                    disabled={isLoading}
                >
                    Blur Background
                </button>
                <button
                    onClick={() => onApplyEffect('background')}
                    className={effectType === 'background' ? 'active' : ''}
                    disabled={isLoading}
                >
                    Virtual Background
                </button>
            </div>

            {effectType === 'blur' && (
                <div className="slider-control">
                    <label>Blur Amount: {config.blur.blurAmount}</label>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={config.blur.blurAmount}
                        onChange={(e) => onConfigChange('blur.blurAmount', Number(e.target.value))}
                    />
                </div>
            )}

            {effectType === 'background' && (
                <div className="background-options">
                    <div className="bg-image-section">
                        <label>Background Image:</label>
                        <div className="bg-image-preview">
                            {bgType === 'image' && (
                                <img src={customBgUrl} alt="Background" />
                            )}
                        </div>
                        <div className="bg-image-actions">
                            <button
                                className={bgType === 'image' ? 'active' : ''}
                                onClick={() => { onBgTypeChange('image'); onApplyEffect('background'); }}
                            >
                                Use Image
                            </button>
                            <label className="upload-btn">
                                Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={onBgImageUpload}
                                    hidden
                                />
                            </label>
                        </div>
                    </div>
                    <div className="color-picker">
                        <label>Or use color:</label>
                        <div className="color-options">
                            <button
                                className={`color-btn green ${bgType === 'green' ? 'active' : ''}`}
                                onClick={() => { onBgTypeChange('green'); onApplyEffect('background'); }}
                            />
                            <button
                                className={`color-btn blue ${bgType === 'blue' ? 'active' : ''}`}
                                onClick={() => { onBgTypeChange('blue'); onApplyEffect('background'); }}
                            />
                            <button
                                className={`color-btn gradient ${bgType === 'gradient' ? 'active' : ''}`}
                                onClick={() => { onBgTypeChange('gradient'); onApplyEffect('background'); }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

import { useState, useCallback } from 'react';
import type { AppConfig, EffectType } from '../config';
import { AVAILABLE_MODELS } from '../config';
import type { ModelKey } from '../config';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
    return (
        <div className="slider-control">
            <label>{label}: {typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}

interface AdvancedSettingsProps {
    config: AppConfig;
    effectType: EffectType;
    onConfigChange: (path: string, value: number | string) => void;
    onApplyEffect: (effect: EffectType) => void;
    getActiveConfigJson: () => Record<string, unknown>;
}

function CollapsibleGroup({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="settings-group">
            <h4 className="group-header" onClick={() => setOpen(!open)}>
                {title} {open ? '▲' : '▼'}
            </h4>
            {open && <div className="group-content">{children}</div>}
        </div>
    );
}

export function AdvancedSettings({
    config,
    effectType,
    onConfigChange,
    onApplyEffect,
    getActiveConfigJson,
}: AdvancedSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const modelKeys = Object.keys(AVAILABLE_MODELS) as ModelKey[];

    const copyConfig = useCallback(() => {
        const json = JSON.stringify(getActiveConfigJson(), null, 2);
        navigator.clipboard.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [getActiveConfigJson]);

    const needsReapply = effectType !== 'none';

    return (
        <section className="control-section advanced-settings">
            <h3
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                Advanced Settings {isOpen ? '▲' : '▼'}
            </h3>

            {isOpen && (
                <div className="advanced-content">
                    {/* Segmentation Settings (shared) */}
                    <CollapsibleGroup title="Segmentation (shared)" defaultOpen>
                        <Slider
                            label="Temporal Smoothing"
                            value={config.segmentation.smoothing}
                            min={0.1} max={1.0} step={0.05}
                            onChange={(v) => onConfigChange('segmentation.smoothing', v)}
                        />
                        <Slider
                            label="Smoothstep Min"
                            value={config.segmentation.smoothstepMin}
                            min={0.0} max={0.9} step={0.05}
                            onChange={(v) => onConfigChange('segmentation.smoothstepMin', v)}
                        />
                        <Slider
                            label="Smoothstep Max"
                            value={config.segmentation.smoothstepMax}
                            min={0.1} max={1.0} step={0.05}
                            onChange={(v) => onConfigChange('segmentation.smoothstepMax', v)}
                        />
                        <Slider
                            label="Border Smooth"
                            value={config.segmentation.borderSmooth}
                            min={0.0} max={1.0} step={0.05}
                            onChange={(v) => onConfigChange('segmentation.borderSmooth', v)}
                        />
                        <Slider
                            label="State Blur Radius"
                            value={config.segmentation.stateBlurRadius}
                            min={0.0} max={20.0} step={0.5}
                            onChange={(v) => onConfigChange('segmentation.stateBlurRadius', v)}
                        />
                    </CollapsibleGroup>

                    {/* Blur Mode Settings */}
                    <CollapsibleGroup title="Blur Mode">
                        <div className="model-selector">
                            <label>Model:</label>
                            <select
                                value={config.blur.model}
                                onChange={(e) => onConfigChange('blur.model', e.target.value)}
                            >
                                {modelKeys.map((key) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>
                        <Slider
                            label="Blur Amount"
                            value={config.blur.blurAmount}
                            min={5} max={100} step={1}
                            onChange={(v) => onConfigChange('blur.blurAmount', v)}
                        />
                        <Slider
                            label="Blur Radius Factor"
                            value={config.blur.bgBlurRadiusFactor}
                            min={0.5} max={3.0} step={0.1}
                            onChange={(v) => onConfigChange('blur.bgBlurRadiusFactor', v)}
                        />
                        <Slider
                            label="Blend Spatial Blur"
                            value={config.blur.blendSpatialBlur}
                            min={0.0} max={30.0} step={0.5}
                            onChange={(v) => onConfigChange('blur.blendSpatialBlur', v)}
                        />
                    </CollapsibleGroup>

                    {/* Virtual BG Mode Settings */}
                    <CollapsibleGroup title="Virtual Background Mode">
                        <div className="model-selector">
                            <label>Model:</label>
                            <select
                                value={config.virtualBg.model}
                                onChange={(e) => onConfigChange('virtualBg.model', e.target.value)}
                            >
                                {modelKeys.map((key) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>
                        <Slider
                            label="Blend Spatial Blur"
                            value={config.virtualBg.blendSpatialBlur}
                            min={0.0} max={30.0} step={0.5}
                            onChange={(v) => onConfigChange('virtualBg.blendSpatialBlur', v)}
                        />
                        <Slider
                            label="Blend Smoothstep Min"
                            value={config.virtualBg.blendSmoothstepMin}
                            min={0.0} max={0.9} step={0.05}
                            onChange={(v) => onConfigChange('virtualBg.blendSmoothstepMin', v)}
                        />
                        <Slider
                            label="Blend Smoothstep Max"
                            value={config.virtualBg.blendSmoothstepMax}
                            min={0.1} max={1.0} step={0.05}
                            onChange={(v) => onConfigChange('virtualBg.blendSmoothstepMax', v)}
                        />
                    </CollapsibleGroup>

                    {/* Apply button when model changes require re-init */}
                    {needsReapply && (
                        <button
                            className="apply-btn"
                            onClick={() => onApplyEffect(effectType)}
                        >
                            Re-apply Effect (required after model change)
                        </button>
                    )}

                    {/* JSON Config Display */}
                    <div className="config-json">
                        <div className="config-json-header">
                            <h4>Current Config (JSON)</h4>
                            <button className="copy-btn" onClick={copyConfig}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                        <pre className="config-json-content">
                            {JSON.stringify(getActiveConfigJson(), null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </section>
    );
}

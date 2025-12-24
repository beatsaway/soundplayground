/**
 * Two-Stage Decay Settings UI Module
 * Provides popup interface for adjusting two-stage decay parameters
 */

// Two-stage decay settings state
let twoStageDecaySettings = {
    baseDecay1: 0.05, // Base fast decay time constant in seconds (default: 0.05s = 50ms)
    baseDecay2: 2.0, // Base slow decay time constant in seconds (default: 2.0s)
    velocityMultiplier1: 0.5, // Velocity multiplier for stage 1 (default: 0.5)
    velocityMultiplier2: 0.2, // Velocity multiplier for stage 2 (default: 0.2)
    amplitudeRatioBase: 0.7, // Base amplitude ratio A₁/A₂ (default: 0.7)
    targetSustainLevel: 0.21 // Target sustain level (0-1, default: 0.21 = -13.5 dB). If set, overrides amplitudeRatioBase calculation
};

/**
 * Initialize two-stage decay settings popup
 * Creates and manages the popup UI for two-stage decay adjustments
 */
function initTwoStageDecaySettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('two-stage-decay-popup');
    if (!popup) {
        popup = createTwoStageDecayPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupTwoStageDecayControls();
}

/**
 * Create the two-stage decay settings popup HTML
 */
function createTwoStageDecayPopup() {
    const popup = document.createElement('div');
    popup.id = 'two-stage-decay-popup';
    popup.className = 'two-stage-decay-popup';
    popup.innerHTML = `
        <div class="two-stage-decay-popup-content">
            <div class="two-stage-decay-popup-header">
                <h2>Two-Stage Decay Settings</h2>
                <button class="two-stage-decay-popup-close">×</button>
            </div>
            <div class="two-stage-decay-popup-body">
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Stage 1 Decay Time</span>
                        <input type="range" id="two-stage-decay-base-decay1" min="0.01" max="0.2" value="0.05" step="0.01">
                        <span class="two-stage-decay-value" id="two-stage-decay-base-decay1-value">0.05 s</span>
                    </label>
                    <div class="two-stage-decay-description">Base fast decay time constant for Stage 1 (0.01 to 0.2 seconds). Lower = faster initial decay. Default: 0.05s (50ms)</div>
                </div>
                
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Stage 2 Decay Time</span>
                        <input type="range" id="two-stage-decay-base-decay2" min="0.5" max="5.0" value="2.0" step="0.1">
                        <span class="two-stage-decay-value" id="two-stage-decay-base-decay2-value">2.0 s</span>
                    </label>
                    <div class="two-stage-decay-description">Base slow decay time constant for Stage 2 (0.5 to 5.0 seconds). Higher = slower long decay. Default: 2.0s</div>
                </div>
                
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Stage 1 Velocity Sensitivity</span>
                        <input type="range" id="two-stage-decay-velocity-mult1" min="0.0" max="1.0" value="0.5" step="0.1">
                        <span class="two-stage-decay-value" id="two-stage-decay-velocity-mult1-value">0.5</span>
                    </label>
                    <div class="two-stage-decay-description">How much velocity affects Stage 1 decay (0.0 to 1.0). Higher = louder notes decay faster initially. Default: 0.5</div>
                </div>
                
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Stage 2 Velocity Sensitivity</span>
                        <input type="range" id="two-stage-decay-velocity-mult2" min="0.0" max="1.0" value="0.2" step="0.1">
                        <span class="two-stage-decay-value" id="two-stage-decay-velocity-mult2-value">0.2</span>
                    </label>
                    <div class="two-stage-decay-description">How much velocity affects Stage 2 decay (0.0 to 1.0). Higher = louder notes have faster long decay. Default: 0.2</div>
                </div>
                
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Amplitude Ratio Base</span>
                        <input type="range" id="two-stage-decay-amplitude-ratio" min="0.3" max="1.0" value="0.7" step="0.1">
                        <span class="two-stage-decay-value" id="two-stage-decay-amplitude-ratio-value">0.7</span>
                    </label>
                    <div class="two-stage-decay-description">Base ratio of Stage 1 to Stage 2 amplitude (0.3 to 1.0). Higher = more initial transient energy. Default: 0.7</div>
                </div>
                
                <div class="two-stage-decay-setting">
                    <label>
                        <span>Target Sustain Level</span>
                        <input type="range" id="two-stage-decay-target-sustain" min="0.05" max="1.0" value="0.21" step="0.01">
                        <span class="two-stage-decay-value" id="two-stage-decay-target-sustain-value">21% (-13.5 dB)</span>
                    </label>
                    <div class="two-stage-decay-description">Target sustain level after decay (5% to 100%). This is the percentage of the original note volume that the note decays to and sustains at. Lower = more obvious decay. Default: 21% (-13.5 dB). If set, this overrides the amplitude ratio calculation.</div>
                </div>
                
                <div class="two-stage-decay-info">
                    <h3>How It Works</h3>
                    <p>Two-stage decay models realistic piano behavior: a fast initial decay (Stage 1) followed by a slower long decay (Stage 2). This creates the characteristic piano sound where notes start bright and energetic, then settle into a sustained tone.</p>
                    <p>Louder notes (higher velocity) have faster decay rates and more initial transient energy, matching how real piano strings behave when struck harder.</p>
                    <p><strong>Formula:</strong> x(t) = A₁(v) × exp(-δ₁(v)×t) + A₂(v) × exp(-δ₂(v)×t)</p>
                </div>
                
                <div class="two-stage-decay-popup-footer">
                    <button class="two-stage-decay-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles (reuse similar styles from other settings modules)
    if (!document.getElementById('two-stage-decay-styles')) {
        const style = document.createElement('style');
        style.id = 'two-stage-decay-styles';
        style.textContent = `
            .two-stage-decay-popup {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                z-index: 3000;
                align-items: center;
                justify-content: center;
            }
            .two-stage-decay-popup.active {
                display: flex;
            }
            .two-stage-decay-popup-content {
                background: rgba(30, 30, 45, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                position: relative;
            }
            .two-stage-decay-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .two-stage-decay-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .two-stage-decay-popup-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .two-stage-decay-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .two-stage-decay-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .two-stage-decay-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .two-stage-decay-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .two-stage-decay-setting label span:first-child {
                min-width: 180px;
                font-weight: 500;
            }
            .two-stage-decay-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .two-stage-decay-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .two-stage-decay-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .two-stage-decay-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .two-stage-decay-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 192px;
                line-height: 1.4;
            }
            .two-stage-decay-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 16px;
                margin-top: 10px;
            }
            .two-stage-decay-info h3 {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            .two-stage-decay-info p {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
            }
            .two-stage-decay-info p:last-child {
                margin-bottom: 0;
            }
            .two-stage-decay-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .two-stage-decay-reset {
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .two-stage-decay-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for two-stage decay controls
 */
function setupTwoStageDecayControls() {
    let popup = document.getElementById('two-stage-decay-popup');
    if (!popup) {
        // If popup doesn't exist, create it
        popup = createTwoStageDecayPopup();
        document.body.appendChild(popup);
    }

    const closeBtn = popup.querySelector('.two-stage-decay-popup-close');
    const resetBtn = popup.querySelector('.two-stage-decay-reset');

    // Close popup
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
        }
    });

    // Reset to defaults
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetTwoStageDecayToDefaults();
        });
    }

    // Stage 1 Decay Time
    const baseDecay1Slider = document.getElementById('two-stage-decay-base-decay1');
    const baseDecay1Value = document.getElementById('two-stage-decay-base-decay1-value');
    if (baseDecay1Slider && baseDecay1Value) {
        const currentBaseDecay1 = twoStageDecaySettings.baseDecay1;
        baseDecay1Slider.value = currentBaseDecay1;
        baseDecay1Value.textContent = currentBaseDecay1.toFixed(2) + ' s';
        
        baseDecay1Slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            baseDecay1Value.textContent = value.toFixed(2) + ' s';
            setTwoStageDecaySettings({ baseDecay1: value });
        });
    }

    // Stage 2 Decay Time
    const baseDecay2Slider = document.getElementById('two-stage-decay-base-decay2');
    const baseDecay2Value = document.getElementById('two-stage-decay-base-decay2-value');
    if (baseDecay2Slider && baseDecay2Value) {
        const currentBaseDecay2 = twoStageDecaySettings.baseDecay2;
        baseDecay2Slider.value = currentBaseDecay2;
        baseDecay2Value.textContent = currentBaseDecay2.toFixed(1) + ' s';
        
        baseDecay2Slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            baseDecay2Value.textContent = value.toFixed(1) + ' s';
            setTwoStageDecaySettings({ baseDecay2: value });
        });
    }

    // Stage 1 Velocity Multiplier
    const velocityMult1Slider = document.getElementById('two-stage-decay-velocity-mult1');
    const velocityMult1Value = document.getElementById('two-stage-decay-velocity-mult1-value');
    if (velocityMult1Slider && velocityMult1Value) {
        const currentVelocityMult1 = twoStageDecaySettings.velocityMultiplier1;
        velocityMult1Slider.value = currentVelocityMult1;
        velocityMult1Value.textContent = currentVelocityMult1.toFixed(1);
        
        velocityMult1Slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            velocityMult1Value.textContent = value.toFixed(1);
            setTwoStageDecaySettings({ velocityMultiplier1: value });
        });
    }

    // Stage 2 Velocity Multiplier
    const velocityMult2Slider = document.getElementById('two-stage-decay-velocity-mult2');
    const velocityMult2Value = document.getElementById('two-stage-decay-velocity-mult2-value');
    if (velocityMult2Slider && velocityMult2Value) {
        const currentVelocityMult2 = twoStageDecaySettings.velocityMultiplier2;
        velocityMult2Slider.value = currentVelocityMult2;
        velocityMult2Value.textContent = currentVelocityMult2.toFixed(1);
        
        velocityMult2Slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            velocityMult2Value.textContent = value.toFixed(1);
            setTwoStageDecaySettings({ velocityMultiplier2: value });
        });
    }

    // Amplitude Ratio Base
    const amplitudeRatioSlider = document.getElementById('two-stage-decay-amplitude-ratio');
    const amplitudeRatioValue = document.getElementById('two-stage-decay-amplitude-ratio-value');
    if (amplitudeRatioSlider && amplitudeRatioValue) {
        const currentAmplitudeRatio = twoStageDecaySettings.amplitudeRatioBase;
        amplitudeRatioSlider.value = currentAmplitudeRatio;
        amplitudeRatioValue.textContent = currentAmplitudeRatio.toFixed(1);
        
        amplitudeRatioSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            amplitudeRatioValue.textContent = value.toFixed(1);
            setTwoStageDecaySettings({ amplitudeRatioBase: value });
        });
    }

    // Target Sustain Level
    const targetSustainSlider = document.getElementById('two-stage-decay-target-sustain');
    const targetSustainValue = document.getElementById('two-stage-decay-target-sustain-value');
    if (targetSustainSlider && targetSustainValue) {
        const currentTargetSustain = twoStageDecaySettings.targetSustainLevel !== undefined ? twoStageDecaySettings.targetSustainLevel : 0.21;
        targetSustainSlider.value = currentTargetSustain;
        const percentValue = Math.round(currentTargetSustain * 100);
        const dbValue = 20 * Math.log10(currentTargetSustain);
        targetSustainValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
        
        targetSustainSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const percentValue = Math.round(value * 100);
            const dbValue = 20 * Math.log10(value);
            targetSustainValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
            setTwoStageDecaySettings({ targetSustainLevel: value });
        });
    }
}

/**
 * Set two-stage decay settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setTwoStageDecaySettings(newSettings) {
    Object.assign(twoStageDecaySettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.twoStageDecaySettings = twoStageDecaySettings;
    }
}

/**
 * Get two-stage decay settings
 * @returns {Object} Current two-stage decay settings
 */
function getTwoStageDecaySettings() {
    return { ...twoStageDecaySettings };
}

/**
 * Reset two-stage decay settings to defaults
 */
function resetTwoStageDecayToDefaults() {
    const defaults = {
        baseDecay1: 0.05,
        baseDecay2: 2.0,
        velocityMultiplier1: 0.5,
        velocityMultiplier2: 0.2,
        amplitudeRatioBase: 0.7,
        targetSustainLevel: 0.21
    };

    setTwoStageDecaySettings(defaults);

    // Update UI sliders
    const baseDecay1Slider = document.getElementById('two-stage-decay-base-decay1');
    const baseDecay1Value = document.getElementById('two-stage-decay-base-decay1-value');
    const baseDecay2Slider = document.getElementById('two-stage-decay-base-decay2');
    const baseDecay2Value = document.getElementById('two-stage-decay-base-decay2-value');
    const velocityMult1Slider = document.getElementById('two-stage-decay-velocity-mult1');
    const velocityMult1Value = document.getElementById('two-stage-decay-velocity-mult1-value');
    const velocityMult2Slider = document.getElementById('two-stage-decay-velocity-mult2');
    const velocityMult2Value = document.getElementById('two-stage-decay-velocity-mult2-value');
    const amplitudeRatioSlider = document.getElementById('two-stage-decay-amplitude-ratio');
    const amplitudeRatioValue = document.getElementById('two-stage-decay-amplitude-ratio-value');

    if (baseDecay1Slider) baseDecay1Slider.value = 0.05;
    if (baseDecay1Value) baseDecay1Value.textContent = '0.05 s';
    if (baseDecay2Slider) baseDecay2Slider.value = 2.0;
    if (baseDecay2Value) baseDecay2Value.textContent = '2.0 s';
    if (velocityMult1Slider) velocityMult1Slider.value = 0.5;
    if (velocityMult1Value) velocityMult1Value.textContent = '0.5';
    if (velocityMult2Slider) velocityMult2Slider.value = 0.2;
    if (velocityMult2Value) velocityMult2Value.textContent = '0.2';
    if (amplitudeRatioSlider) amplitudeRatioSlider.value = 0.7;
    if (amplitudeRatioValue) amplitudeRatioValue.textContent = '0.7';
    const targetSustainSlider = document.getElementById('two-stage-decay-target-sustain');
    const targetSustainValue = document.getElementById('two-stage-decay-target-sustain-value');
    if (targetSustainSlider) targetSustainSlider.value = 0.21;
    if (targetSustainValue) targetSustainValue.textContent = '21% (-13.5 dB)';
}

/**
 * Open the two-stage decay settings popup
 */
function openTwoStageDecaySettings() {
    // Ensure popup is initialized
    if (typeof window !== 'undefined' && window.initTwoStageDecaySettings) {
        window.initTwoStageDecaySettings();
    }
    
    let popup = document.getElementById('two-stage-decay-popup');
    
    // If popup doesn't exist, create it
    if (!popup) {
        if (typeof window !== 'undefined' && window.initTwoStageDecaySettings) {
            window.initTwoStageDecaySettings();
            popup = document.getElementById('two-stage-decay-popup');
        }
    }
    
    if (popup) {
        // Sync sliders with current settings
        const baseDecay1Slider = document.getElementById('two-stage-decay-base-decay1');
        const baseDecay1Value = document.getElementById('two-stage-decay-base-decay1-value');
        const baseDecay2Slider = document.getElementById('two-stage-decay-base-decay2');
        const baseDecay2Value = document.getElementById('two-stage-decay-base-decay2-value');
        const velocityMult1Slider = document.getElementById('two-stage-decay-velocity-mult1');
        const velocityMult1Value = document.getElementById('two-stage-decay-velocity-mult1-value');
        const velocityMult2Slider = document.getElementById('two-stage-decay-velocity-mult2');
        const velocityMult2Value = document.getElementById('two-stage-decay-velocity-mult2-value');
        const amplitudeRatioSlider = document.getElementById('two-stage-decay-amplitude-ratio');
        const amplitudeRatioValue = document.getElementById('two-stage-decay-amplitude-ratio-value');
        const targetSustainSlider = document.getElementById('two-stage-decay-target-sustain');
        const targetSustainValue = document.getElementById('two-stage-decay-target-sustain-value');
        
        if (baseDecay1Slider && baseDecay1Value) {
            const currentBaseDecay1 = twoStageDecaySettings.baseDecay1;
            baseDecay1Slider.value = currentBaseDecay1;
            baseDecay1Value.textContent = currentBaseDecay1.toFixed(2) + ' s';
        }
        
        if (baseDecay2Slider && baseDecay2Value) {
            const currentBaseDecay2 = twoStageDecaySettings.baseDecay2;
            baseDecay2Slider.value = currentBaseDecay2;
            baseDecay2Value.textContent = currentBaseDecay2.toFixed(1) + ' s';
        }
        
        if (velocityMult1Slider && velocityMult1Value) {
            const currentVelocityMult1 = twoStageDecaySettings.velocityMultiplier1;
            velocityMult1Slider.value = currentVelocityMult1;
            velocityMult1Value.textContent = currentVelocityMult1.toFixed(1);
        }
        
        if (velocityMult2Slider && velocityMult2Value) {
            const currentVelocityMult2 = twoStageDecaySettings.velocityMultiplier2;
            velocityMult2Slider.value = currentVelocityMult2;
            velocityMult2Value.textContent = currentVelocityMult2.toFixed(1);
        }
        
        if (amplitudeRatioSlider && amplitudeRatioValue) {
            const currentAmplitudeRatio = twoStageDecaySettings.amplitudeRatioBase;
            amplitudeRatioSlider.value = currentAmplitudeRatio;
            amplitudeRatioValue.textContent = currentAmplitudeRatio.toFixed(1);
        }
        
        if (targetSustainSlider && targetSustainValue) {
            const currentTargetSustain = twoStageDecaySettings.targetSustainLevel !== undefined ? twoStageDecaySettings.targetSustainLevel : 0.21;
            targetSustainSlider.value = currentTargetSustain;
            const percentValue = Math.round(currentTargetSustain * 100);
            const dbValue = 20 * Math.log10(currentTargetSustain);
            targetSustainValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
        }
        
        popup.classList.add('active');
    } else {
        console.error('Two-stage decay popup not found. Make sure initTwoStageDecaySettings() has been called.');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.twoStageDecaySettings = twoStageDecaySettings;
    window.initTwoStageDecaySettings = initTwoStageDecaySettings;
    window.openTwoStageDecaySettings = openTwoStageDecaySettings;
    window.setTwoStageDecaySettings = setTwoStageDecaySettings;
    window.getTwoStageDecaySettings = getTwoStageDecaySettings;
    window.resetTwoStageDecayToDefaults = resetTwoStageDecayToDefaults;
}


/**
 * Sustain Decay Settings UI Module
 * Provides popup interface for adjusting sustain decay parameters
 */

// Sustain decay settings state
let sustainDecaySettings = {
    baseTime: 12.0, // Base sustain decay time in seconds for A0 (default: 12.0s)
    decayFactor: 2.5, // Decay factor k (default: 2.5) - halving roughly every 5 semitones
    pedalMultiplier: 2.5, // Pedal extension multiplier (default: 2.5x) - extends sustain time with pedal
    targetVolumeLevel: 0.05 // Target volume level to decay to during sustain (0.01 to 1.0, default: 0.05 = 5% = -26 dB). Lower = more obvious decay
};

/**
 * Initialize sustain decay settings popup
 * Creates and manages the popup UI for sustain decay adjustments
 */
function initSustainDecaySettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('sustain-decay-popup');
    if (!popup) {
        popup = createSustainDecayPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupSustainDecayControls();
}

/**
 * Create the sustain decay settings popup HTML
 */
function createSustainDecayPopup() {
    const popup = document.createElement('div');
    popup.id = 'sustain-decay-popup';
    popup.className = 'sustain-decay-popup';
    popup.innerHTML = `
        <div class="sustain-decay-popup-content">
            <div class="sustain-decay-popup-header">
                <h2>Sustain Decay Settings</h2>
                <button class="sustain-decay-popup-close">×</button>
            </div>
            <div class="sustain-decay-popup-body">
                <div class="sustain-decay-setting">
                    <label>
                        <span>Base Time (A0)</span>
                        <input type="range" id="sustain-decay-base-time" min="5" max="30" value="12" step="0.5">
                        <span class="sustain-decay-value" id="sustain-decay-base-time-value">12.0 s</span>
                    </label>
                    <div class="sustain-decay-description">Base sustain decay time for A0 (lowest note) in seconds (5.0 to 30.0s). Lower notes decay slower, higher notes decay faster. Default: 12.0s</div>
                </div>
                
                <div class="sustain-decay-setting">
                    <label>
                        <span>Decay Factor (k)</span>
                        <input type="range" id="sustain-decay-factor" min="1.0" max="5.0" value="2.5" step="0.1">
                        <span class="sustain-decay-value" id="sustain-decay-factor-value">2.5</span>
                    </label>
                    <div class="sustain-decay-description">Decay factor controlling how quickly higher notes decay relative to lower notes (1.0 to 5.0). Higher = faster decay for high notes. Default: 2.5</div>
                </div>
                
                <div class="sustain-decay-setting">
                    <label>
                        <span>Pedal Multiplier</span>
                        <input type="range" id="sustain-decay-pedal-mult" min="1.0" max="5.0" value="2.5" step="0.1">
                        <span class="sustain-decay-value" id="sustain-decay-pedal-mult-value">2.5x</span>
                    </label>
                    <div class="sustain-decay-description">Multiplier for sustain time when pedal is active (1.0 to 5.0x). Higher = longer sustain with pedal. Default: 2.5x</div>
                </div>
                
                <div class="sustain-decay-setting">
                    <label>
                        <span>Target Volume Level</span>
                        <input type="range" id="sustain-decay-target-volume" min="0.01" max="1.0" value="0.05" step="0.01">
                        <span class="sustain-decay-value" id="sustain-decay-target-volume-value">5% (-26.0 dB)</span>
                    </label>
                    <div class="sustain-decay-description">Target volume level to decay to during sustain (1% to 100%). This setting is available for future implementation. Currently, notes release after the decay time rather than gradually fading to this level, due to Tone.js PolySynth limitations with per-voice volume control. Default: 5% (-26 dB).</div>
                </div>
                
                <div class="sustain-decay-info">
                    <h3>How It Works</h3>
                    <p>Real pianos have slow decay even with sustain pedal active - notes don't sustain forever. This module implements pitch-dependent time-based release for sustained notes.</p>
                    <p><strong>Current Implementation:</strong> Notes stay at sustain level, then release after a pitch-dependent decay time and fade out via the release envelope. Lower notes (bass) sustain longer, higher notes (treble) sustain shorter.</p>
                    <p><strong>Note:</strong> The module is named "Sustain Decay" to reflect the intended behavior (gradual volume decay during sustain), but due to Tone.js PolySynth limitations with per-voice volume control, it currently implements time-based release rather than gradual volume decay. The "Target Volume Level" setting exists for future implementation.</p>
                </div>
                
                <div class="sustain-decay-popup-footer">
                    <button class="sustain-decay-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles (reuse similar styles from other settings modules)
    if (!document.getElementById('sustain-decay-styles')) {
        const style = document.createElement('style');
        style.id = 'sustain-decay-styles';
        style.textContent = `
            .sustain-decay-popup {
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
            .sustain-decay-popup.active {
                display: flex;
            }
            .sustain-decay-popup-content {
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
            .sustain-decay-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .sustain-decay-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .sustain-decay-popup-close {
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
            .sustain-decay-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .sustain-decay-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .sustain-decay-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .sustain-decay-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .sustain-decay-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .sustain-decay-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .sustain-decay-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .sustain-decay-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .sustain-decay-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .sustain-decay-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .sustain-decay-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 16px;
                margin-top: 10px;
            }
            .sustain-decay-info h3 {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            .sustain-decay-info p {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
            }
            .sustain-decay-info p:last-child {
                margin-bottom: 0;
            }
            .sustain-decay-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .sustain-decay-reset {
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
            .sustain-decay-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for sustain decay controls
 */
function setupSustainDecayControls() {
    const popup = document.getElementById('sustain-decay-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.sustain-decay-popup-close');
    const resetBtn = popup.querySelector('.sustain-decay-reset');

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
            resetSustainDecayToDefaults();
        });
    }

    // Base Time
    const baseTimeSlider = document.getElementById('sustain-decay-base-time');
    const baseTimeValue = document.getElementById('sustain-decay-base-time-value');
    if (baseTimeSlider && baseTimeValue) {
        const currentBaseTime = sustainDecaySettings.baseTime;
        baseTimeSlider.value = Math.round(currentBaseTime * 2) / 2; // Round to 0.5 steps
        baseTimeValue.textContent = currentBaseTime.toFixed(1) + ' s';
        
        baseTimeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            baseTimeValue.textContent = value.toFixed(1) + ' s';
            setSustainDecaySettings({ baseTime: value });
        });
    }

    // Decay Factor
    const factorSlider = document.getElementById('sustain-decay-factor');
    const factorValue = document.getElementById('sustain-decay-factor-value');
    if (factorSlider && factorValue) {
        const currentFactor = sustainDecaySettings.decayFactor;
        factorSlider.value = Math.round(currentFactor * 10) / 10; // Round to 0.1 steps
        factorValue.textContent = currentFactor.toFixed(1);
        
        factorSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            factorValue.textContent = value.toFixed(1);
            setSustainDecaySettings({ decayFactor: value });
        });
    }

    // Pedal Multiplier
    const pedalMultSlider = document.getElementById('sustain-decay-pedal-mult');
    const pedalMultValue = document.getElementById('sustain-decay-pedal-mult-value');
    if (pedalMultSlider && pedalMultValue) {
        const currentPedalMult = sustainDecaySettings.pedalMultiplier;
        pedalMultSlider.value = Math.round(currentPedalMult * 10) / 10; // Round to 0.1 steps
        pedalMultValue.textContent = currentPedalMult.toFixed(1) + 'x';
        
        pedalMultSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pedalMultValue.textContent = value.toFixed(1) + 'x';
            setSustainDecaySettings({ pedalMultiplier: value });
        });
    }

    // Target Volume Level
    const targetVolumeSlider = document.getElementById('sustain-decay-target-volume');
    const targetVolumeValue = document.getElementById('sustain-decay-target-volume-value');
    if (targetVolumeSlider && targetVolumeValue) {
        const currentTargetVolume = sustainDecaySettings.targetVolumeLevel !== undefined ? sustainDecaySettings.targetVolumeLevel : 0.05;
        targetVolumeSlider.value = currentTargetVolume;
        const percentValue = Math.round(currentTargetVolume * 100);
        const dbValue = 20 * Math.log10(currentTargetVolume);
        targetVolumeValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
        
        targetVolumeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const percentValue = Math.round(value * 100);
            const dbValue = 20 * Math.log10(value);
            targetVolumeValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
            setSustainDecaySettings({ targetVolumeLevel: value });
        });
    }
}

/**
 * Set sustain decay settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setSustainDecaySettings(newSettings) {
    Object.assign(sustainDecaySettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.sustainDecaySettings = sustainDecaySettings;
    }
}

/**
 * Get sustain decay settings
 * @returns {Object} Current sustain decay settings
 */
function getSustainDecaySettings() {
    return { ...sustainDecaySettings };
}

/**
 * Reset sustain decay settings to defaults
 */
function resetSustainDecayToDefaults() {
    const defaults = {
        baseTime: 12.0,
        decayFactor: 2.5,
        pedalMultiplier: 2.5,
        targetVolumeLevel: 0.05
    };

    setSustainDecaySettings(defaults);

    // Update UI sliders
    const baseTimeSlider = document.getElementById('sustain-decay-base-time');
    const baseTimeValue = document.getElementById('sustain-decay-base-time-value');
    const factorSlider = document.getElementById('sustain-decay-factor');
    const factorValue = document.getElementById('sustain-decay-factor-value');
    const pedalMultSlider = document.getElementById('sustain-decay-pedal-mult');
    const pedalMultValue = document.getElementById('sustain-decay-pedal-mult-value');
    const targetVolumeSlider = document.getElementById('sustain-decay-target-volume');
    const targetVolumeValue = document.getElementById('sustain-decay-target-volume-value');

    if (baseTimeSlider) baseTimeSlider.value = 12;
    if (baseTimeValue) baseTimeValue.textContent = '12.0 s';
    if (factorSlider) factorSlider.value = 2.5;
    if (factorValue) factorValue.textContent = '2.5';
    if (pedalMultSlider) pedalMultSlider.value = 2.5;
    if (pedalMultValue) pedalMultValue.textContent = '2.5x';
    if (targetVolumeSlider) targetVolumeSlider.value = 0.05;
    if (targetVolumeValue) targetVolumeValue.textContent = '5% (-26.0 dB)';
}

/**
 * Open the sustain decay settings popup
 */
function openSustainDecaySettings() {
    const popup = document.getElementById('sustain-decay-popup');
    if (popup) {
        // Sync sliders with current settings
        const baseTimeSlider = document.getElementById('sustain-decay-base-time');
        const baseTimeValue = document.getElementById('sustain-decay-base-time-value');
        const factorSlider = document.getElementById('sustain-decay-factor');
        const factorValue = document.getElementById('sustain-decay-factor-value');
        const pedalMultSlider = document.getElementById('sustain-decay-pedal-mult');
        const pedalMultValue = document.getElementById('sustain-decay-pedal-mult-value');
        
        if (baseTimeSlider && baseTimeValue) {
            const currentBaseTime = sustainDecaySettings.baseTime;
            baseTimeSlider.value = Math.round(currentBaseTime * 2) / 2;
            baseTimeValue.textContent = currentBaseTime.toFixed(1) + ' s';
        }
        
        if (factorSlider && factorValue) {
            const currentFactor = sustainDecaySettings.decayFactor;
            factorSlider.value = Math.round(currentFactor * 10) / 10;
            factorValue.textContent = currentFactor.toFixed(1);
        }
        
        if (pedalMultSlider && pedalMultValue) {
            const currentPedalMult = sustainDecaySettings.pedalMultiplier;
            pedalMultSlider.value = Math.round(currentPedalMult * 10) / 10;
            pedalMultValue.textContent = currentPedalMult.toFixed(1) + 'x';
        }
        
        const targetVolumeSlider = document.getElementById('sustain-decay-target-volume');
        const targetVolumeValue = document.getElementById('sustain-decay-target-volume-value');
        if (targetVolumeSlider && targetVolumeValue) {
            const currentTargetVolume = sustainDecaySettings.targetVolumeLevel !== undefined ? sustainDecaySettings.targetVolumeLevel : 0.05;
            targetVolumeSlider.value = currentTargetVolume;
            const percentValue = Math.round(currentTargetVolume * 100);
            const dbValue = 20 * Math.log10(currentTargetVolume);
            targetVolumeValue.textContent = percentValue + '% (' + dbValue.toFixed(1) + ' dB)';
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.sustainDecaySettings = sustainDecaySettings;
    window.initSustainDecaySettings = initSustainDecaySettings;
    window.openSustainDecaySettings = openSustainDecaySettings;
    window.setSustainDecaySettings = setSustainDecaySettings;
    window.getSustainDecaySettings = getSustainDecaySettings;
    window.resetSustainDecayToDefaults = resetSustainDecayToDefaults;
}


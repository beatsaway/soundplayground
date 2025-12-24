/**
 * Spectral Balance Settings UI Module
 * Provides popup interface for adjusting spectral balance (pink-noise-like EQ) parameters
 */

// Spectral balance settings state
let spectralBalanceSettings = {
    enabled: true, // Default: ON
    frequency: 2000, // Cutoff frequency in Hz (default: 2kHz)
    gain: -20, // Gain reduction in dB (default: -20dB)
    Q: 0.7, // Filter Q (default: 0.7 for gentle slope)
    sustainPedalGainReduction: true, // Default: ON - Reduce gain to 0dB when sustain pedal is pressed
    gainReductionDuration: 16.0, // Duration to reach 0dB when pedal pressed (default 16s, min 1s, max 32s)
    gainRestoreDuration: 0.2 // Duration to restore gain when pedal released (default 0.2s, min 0.1s, max 5s)
};

/**
 * Initialize spectral balance settings popup
 * Creates and manages the popup UI for spectral balance adjustments
 */
function initSpectralBalanceSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('spectral-balance-popup');
    if (!popup) {
        popup = createSpectralBalancePopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupSpectralBalanceControls();
}

/**
 * Create the spectral balance settings popup HTML
 */
function createSpectralBalancePopup() {
    const popup = document.createElement('div');
    popup.id = 'spectral-balance-popup';
    popup.className = 'spectral-balance-popup';
    popup.innerHTML = `
        <div class="spectral-balance-popup-content">
            <div class="spectral-balance-popup-header">
                <h2>Spectral Balance Settings</h2>
                <button class="spectral-balance-popup-close">×</button>
            </div>
            <div class="spectral-balance-popup-body">
                <div class="spectral-balance-setting">
                    <label>
                        <span>Cutoff Frequency</span>
                        <input type="range" id="spectral-balance-frequency" min="500" max="8000" value="2000" step="50">
                        <span class="spectral-balance-value" id="spectral-balance-frequency-value">2000 Hz</span>
                    </label>
                    <div class="spectral-balance-description">Frequency where the high-frequency rolloff begins (500 Hz to 8 kHz). Lower = more mid-range dimming. Default: 2000 Hz</div>
                </div>
                
                <div class="spectral-balance-setting">
                    <label>
                        <span>Gain Reduction</span>
                        <input type="range" id="spectral-balance-gain" min="-40" max="0" value="-20" step="0.5">
                        <span class="spectral-balance-value" id="spectral-balance-gain-value">-20.0 dB</span>
                    </label>
                    <div class="spectral-balance-description">Amount of high-frequency reduction in dB (-40 to 0 dB). More negative = more dimming. Default: -20 dB</div>
                </div>
                
                <div class="spectral-balance-setting">
                    <label>
                        <span>Filter Q</span>
                        <input type="range" id="spectral-balance-q" min="0.1" max="2.0" value="0.7" step="0.1">
                        <span class="spectral-balance-value" id="spectral-balance-q-value">0.7</span>
                    </label>
                    <div class="spectral-balance-description">Filter resonance/steepness (0.1 to 2.0). Lower = gentler slope (more pink-noise-like). Default: 0.7</div>
                </div>
                
                <div class="spectral-balance-setting">
                    <label style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" id="spectral-balance-sustain-pedal-gain" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>Sustain Pedal Gain Reduction</span>
                    </label>
                    <div class="spectral-balance-description" style="margin-left: 30px;">When enabled, gain gradually reduces to 0dB when sustain pedal is pressed, then returns to set value over 2 seconds when released. The displayed gain value remains unchanged.</div>
                </div>
                
                <div class="spectral-balance-setting" id="spectral-balance-gain-reduction-duration-container" style="margin-left: 30px;">
                    <label>
                        <span>Gain Reduction Duration</span>
                        <input type="range" id="spectral-balance-gain-reduction-duration" min="1" max="32" value="16" step="0.5">
                        <span class="spectral-balance-value" id="spectral-balance-gain-reduction-duration-value">16.0 s</span>
                    </label>
                    <div class="spectral-balance-description">Time for gain to reach 0dB when sustain pedal is pressed. Range: 1-32 seconds. Default: 16 seconds</div>
                </div>
                
                <div class="spectral-balance-setting" id="spectral-balance-gain-restore-duration-container" style="margin-left: 30px;">
                    <label>
                        <span>Gain Restore Duration</span>
                        <input type="range" id="spectral-balance-gain-restore-duration" min="0.1" max="5" value="0.2" step="0.1">
                        <span class="spectral-balance-value" id="spectral-balance-gain-restore-duration-value">0.2 s</span>
                    </label>
                    <div class="spectral-balance-description">Time for gain to restore to set value when sustain pedal is released. Range: 0.1-5 seconds. Default: 0.2 seconds</div>
                </div>
                
                <div class="spectral-balance-info">
                    <h3>How It Works</h3>
                    <p>This filter applies a gentle high-frequency rolloff to create a pink-noise-like spectral balance. Pink noise has equal energy per octave (-3dB/octave), which sounds more natural and warm compared to white noise.</p>
                    <p>By dimming the mid-high frequencies slightly, the piano sound becomes warmer and less harsh, similar to how real acoustic instruments naturally roll off at higher frequencies.</p>
                </div>
                
                <div class="spectral-balance-popup-footer">
                    <button class="spectral-balance-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('spectral-balance-styles')) {
        const style = document.createElement('style');
        style.id = 'spectral-balance-styles';
        style.textContent = `
            .spectral-balance-popup {
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
            .spectral-balance-popup.active {
                display: flex;
            }
            .spectral-balance-popup-content {
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
            .spectral-balance-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .spectral-balance-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .spectral-balance-popup-close {
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
            .spectral-balance-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .spectral-balance-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .spectral-balance-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .spectral-balance-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .spectral-balance-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .spectral-balance-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .spectral-balance-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .spectral-balance-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .spectral-balance-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .spectral-balance-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .spectral-balance-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 16px;
                margin-top: 10px;
            }
            .spectral-balance-info h3 {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            .spectral-balance-info p {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
            }
            .spectral-balance-info p:last-child {
                margin-bottom: 0;
            }
            .spectral-balance-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .spectral-balance-reset {
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
            .spectral-balance-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for spectral balance controls
 */
function setupSpectralBalanceControls() {
    const popup = document.getElementById('spectral-balance-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.spectral-balance-popup-close');
    const resetBtn = popup.querySelector('.spectral-balance-reset');

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
            resetSpectralBalanceToDefaults();
        });
    }

    // Cutoff Frequency
    const frequencySlider = document.getElementById('spectral-balance-frequency');
    const frequencyValue = document.getElementById('spectral-balance-frequency-value');
    if (frequencySlider && frequencyValue) {
        const currentFreq = spectralBalanceSettings.frequency;
        frequencySlider.value = Math.round(currentFreq);
        frequencyValue.textContent = Math.round(currentFreq) + ' Hz';
        
        frequencySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            frequencyValue.textContent = Math.round(value) + ' Hz';
            setSpectralBalanceSettings({ frequency: value });
            // Update filter immediately
            if (window.updateSpectralBalance) {
                window.updateSpectralBalance({ frequency: value });
            }
        });
    }

    // Gain Reduction
    const gainSlider = document.getElementById('spectral-balance-gain');
    const gainValue = document.getElementById('spectral-balance-gain-value');
    if (gainSlider && gainValue) {
        const currentGain = spectralBalanceSettings.gain;
        gainSlider.value = Math.round(currentGain * 2) / 2; // Round to 0.5 steps
        gainValue.textContent = currentGain.toFixed(1) + ' dB';
        
        gainSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            gainValue.textContent = value.toFixed(1) + ' dB';
            setSpectralBalanceSettings({ gain: value });
            // Update filter immediately
            if (window.updateSpectralBalance) {
                window.updateSpectralBalance({ gain: value });
            }
        });
    }

    // Filter Q
    const qSlider = document.getElementById('spectral-balance-q');
    const qValue = document.getElementById('spectral-balance-q-value');
    if (qSlider && qValue) {
        const currentQ = spectralBalanceSettings.Q;
        qSlider.value = Math.round(currentQ * 10) / 10; // Round to 0.1 steps
        qValue.textContent = currentQ.toFixed(1);
        
        qSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            qValue.textContent = value.toFixed(1);
            setSpectralBalanceSettings({ Q: value });
            // Update filter immediately
            if (window.updateSpectralBalance) {
                window.updateSpectralBalance({ Q: value });
            }
        });
    }

    // Sustain Pedal Gain Reduction checkbox
    const sustainPedalGainCheckbox = document.getElementById('spectral-balance-sustain-pedal-gain');
    if (sustainPedalGainCheckbox) {
        sustainPedalGainCheckbox.checked = spectralBalanceSettings.sustainPedalGainReduction !== false; // Default to true
        
        sustainPedalGainCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            setSpectralBalanceSettings({ sustainPedalGainReduction: enabled });
        });
    }

    // Gain Reduction Duration slider
    const gainReductionDurationSlider = document.getElementById('spectral-balance-gain-reduction-duration');
    const gainReductionDurationValue = document.getElementById('spectral-balance-gain-reduction-duration-value');
    if (gainReductionDurationSlider && gainReductionDurationValue) {
        const currentDuration = spectralBalanceSettings.gainReductionDuration !== undefined ? spectralBalanceSettings.gainReductionDuration : 16.0;
        gainReductionDurationSlider.value = currentDuration;
        gainReductionDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        
        gainReductionDurationSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            gainReductionDurationValue.textContent = value.toFixed(1) + ' s';
            setSpectralBalanceSettings({ gainReductionDuration: value });
        });
    }

    // Gain Restore Duration slider
    const gainRestoreDurationSlider = document.getElementById('spectral-balance-gain-restore-duration');
    const gainRestoreDurationValue = document.getElementById('spectral-balance-gain-restore-duration-value');
    if (gainRestoreDurationSlider && gainRestoreDurationValue) {
        const currentDuration = spectralBalanceSettings.gainRestoreDuration !== undefined ? spectralBalanceSettings.gainRestoreDuration : 0.2;
        gainRestoreDurationSlider.value = currentDuration;
        gainRestoreDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        
        gainRestoreDurationSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            gainRestoreDurationValue.textContent = value.toFixed(1) + ' s';
            setSpectralBalanceSettings({ gainRestoreDuration: value });
        });
    }
}

/**
 * Set spectral balance settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setSpectralBalanceSettings(newSettings) {
    Object.assign(spectralBalanceSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.spectralBalanceSettings = spectralBalanceSettings;
    }
    
    // Reconnect audio chain if enabled state changed
    if (newSettings.enabled !== undefined && window.reconnectAudioChain) {
        window.reconnectAudioChain();
    }
}

/**
 * Get spectral balance settings
 * @returns {Object} Current spectral balance settings
 */
function getSpectralBalanceSettings() {
    return { ...spectralBalanceSettings };
}

/**
 * Reset spectral balance settings to defaults
 */
function resetSpectralBalanceToDefaults() {
    const defaults = {
        enabled: true,
        frequency: 2000,
        gain: -20,
        Q: 0.7,
        sustainPedalGainReduction: true,
        gainReductionDuration: 16.0, // 16 seconds
        gainRestoreDuration: 0.2 // 0.2 seconds
    };

    setSpectralBalanceSettings(defaults);

    // Update UI sliders
    const frequencySlider = document.getElementById('spectral-balance-frequency');
    const frequencyValue = document.getElementById('spectral-balance-frequency-value');
    const gainSlider = document.getElementById('spectral-balance-gain');
    const gainValue = document.getElementById('spectral-balance-gain-value');
    const qSlider = document.getElementById('spectral-balance-q');
    const qValue = document.getElementById('spectral-balance-q-value');

    if (frequencySlider) frequencySlider.value = 2000;
    if (frequencyValue) frequencyValue.textContent = '2000 Hz';
    if (gainSlider) gainSlider.value = -20;
    if (gainValue) gainValue.textContent = '-20.0 dB';
    if (qSlider) qSlider.value = 0.7;
    if (qValue) qValue.textContent = '0.7';
}

/**
 * Open the spectral balance settings popup
 */
function openSpectralBalanceSettings() {
    const popup = document.getElementById('spectral-balance-popup');
    if (popup) {
        // Sync sliders with current settings
        const frequencySlider = document.getElementById('spectral-balance-frequency');
        const frequencyValue = document.getElementById('spectral-balance-frequency-value');
        const gainSlider = document.getElementById('spectral-balance-gain');
        const gainValue = document.getElementById('spectral-balance-gain-value');
        const qSlider = document.getElementById('spectral-balance-q');
        const qValue = document.getElementById('spectral-balance-q-value');
        
        if (frequencySlider && frequencyValue) {
            const currentFreq = spectralBalanceSettings.frequency;
            frequencySlider.value = Math.round(currentFreq);
            frequencyValue.textContent = Math.round(currentFreq) + ' Hz';
        }
        
        if (gainSlider && gainValue) {
            const currentGain = spectralBalanceSettings.gain;
            gainSlider.value = Math.round(currentGain * 2) / 2;
            gainValue.textContent = currentGain.toFixed(1) + ' dB';
        }
        
        if (qSlider && qValue) {
            const currentQ = spectralBalanceSettings.Q;
            qSlider.value = Math.round(currentQ * 10) / 10;
            qValue.textContent = currentQ.toFixed(1);
        }
        
        const sustainPedalGainCheckbox = document.getElementById('spectral-balance-sustain-pedal-gain');
        if (sustainPedalGainCheckbox) {
            sustainPedalGainCheckbox.checked = spectralBalanceSettings.sustainPedalGainReduction !== false;
        }
        
        const gainReductionDurationSlider = document.getElementById('spectral-balance-gain-reduction-duration');
        const gainReductionDurationValue = document.getElementById('spectral-balance-gain-reduction-duration-value');
        if (gainReductionDurationSlider && gainReductionDurationValue) {
            const currentDuration = spectralBalanceSettings.gainReductionDuration !== undefined ? spectralBalanceSettings.gainReductionDuration : 16.0;
            gainReductionDurationSlider.value = currentDuration;
            gainReductionDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        }
        
        const gainRestoreDurationSlider = document.getElementById('spectral-balance-gain-restore-duration');
        const gainRestoreDurationValue = document.getElementById('spectral-balance-gain-restore-duration-value');
        if (gainRestoreDurationSlider && gainRestoreDurationValue) {
            const currentDuration = spectralBalanceSettings.gainRestoreDuration !== undefined ? spectralBalanceSettings.gainRestoreDuration : 0.2;
            gainRestoreDurationSlider.value = currentDuration;
            gainRestoreDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.spectralBalanceSettings = spectralBalanceSettings;
    window.initSpectralBalanceSettings = initSpectralBalanceSettings;
    window.openSpectralBalanceSettings = openSpectralBalanceSettings;
    window.setSpectralBalanceSettings = setSpectralBalanceSettings;
    window.getSpectralBalanceSettings = getSpectralBalanceSettings;
    window.resetSpectralBalanceToDefaults = resetSpectralBalanceToDefaults;
}


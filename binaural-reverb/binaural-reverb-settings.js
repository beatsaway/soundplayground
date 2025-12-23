/**
 * Binaural Reverb Settings UI Module
 * Provides popup interface for adjusting binaural reverb parameters
 */

/**
 * Initialize binaural reverb settings popup
 * Creates and manages the popup UI for advanced reverb adjustments
 */
function initBinauralReverbSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('binaural-reverb-popup');
    if (!popup) {
        popup = createBinauralReverbPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupBinauralReverbControls();
}

/**
 * Create the binaural reverb settings popup HTML
 */
function createBinauralReverbPopup() {
    const popup = document.createElement('div');
    popup.id = 'binaural-reverb-popup';
    popup.className = 'binaural-reverb-popup';
    popup.innerHTML = `
        <div class="binaural-reverb-popup-content">
            <div class="binaural-reverb-popup-header">
                <h2>Binaural Reverb Settings</h2>
                <button class="binaural-reverb-popup-close">×</button>
            </div>
            <div class="binaural-reverb-popup-body">
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Reverb Mode</span>
                        <div class="binaural-reverb-mode-toggle">
                            <label class="binaural-reverb-radio">
                                <input type="radio" name="reverb-mode" value="binaural" id="reverb-mode-binaural" checked>
                                <span>Binaural (3D Spatial)</span>
                            </label>
                            <label class="binaural-reverb-radio">
                                <input type="radio" name="reverb-mode" value="regular" id="reverb-mode-regular">
                                <span>Regular (CPU Efficient)</span>
                            </label>
                        </div>
                    </label>
                    <div class="binaural-reverb-description">Binaural mode uses dual reverb engines for 3D spatial effects (~2x CPU). Regular mode uses a single reverb engine (~50% CPU savings).</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Room Size</span>
                        <input type="range" id="binaural-room-size" min="0" max="100" value="70" step="1">
                        <span class="binaural-reverb-value" id="binaural-room-size-value">0.70</span>
                    </label>
                    <div class="binaural-reverb-description">Size of the virtual room (0.0 = small, 1.0 = large)</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Reverb Time (RT60)</span>
                        <input type="range" id="binaural-reverb-time" min="5" max="50" value="20" step="1">
                        <span class="binaural-reverb-value" id="binaural-reverb-time-value">2.0s</span>
                    </label>
                    <div class="binaural-reverb-description">Time for reverb to decay by 60dB (0.5s to 5.0s)</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Early Reflections</span>
                        <input type="range" id="binaural-early-reflections" min="0" max="100" value="60" step="1">
                        <span class="binaural-reverb-value" id="binaural-early-reflections-value">0.60</span>
                    </label>
                    <div class="binaural-reverb-description">Level of early reflections (0.0 to 1.0)</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Late Reverb</span>
                        <input type="range" id="binaural-late-reverb" min="0" max="100" value="60" step="1">
                        <span class="binaural-reverb-value" id="binaural-late-reverb-value">0.60</span>
                    </label>
                    <div class="binaural-reverb-description">Level of late reverb tail (0.0 to 1.0)</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Dry Level</span>
                        <input type="range" id="binaural-dry" min="0" max="100" value="6" step="1">
                        <span class="binaural-reverb-value" id="binaural-dry-value">0.06</span>
                    </label>
                    <div class="binaural-reverb-description">Level of dry (unprocessed) signal (0.0 to 1.0)</div>
                </div>
                
                <div class="binaural-reverb-setting">
                    <label>
                        <span>Wet Level</span>
                        <input type="range" id="binaural-wet" min="0" max="100" value="50" step="1">
                        <span class="binaural-reverb-value" id="binaural-wet-value">0.50</span>
                    </label>
                    <div class="binaural-reverb-description">Level of wet (reverb) signal (0.0 to 1.0)</div>
                </div>
                
                <div class="binaural-reverb-setting binaural-only-setting">
                    <label>
                        <span>ITD Intensity</span>
                        <input type="range" id="binaural-itd-intensity" min="0" max="100" value="80" step="1">
                        <span class="binaural-reverb-value" id="binaural-itd-intensity-value">0.80</span>
                    </label>
                    <div class="binaural-reverb-description">Interaural Time Difference intensity (spatial width) - Binaural mode only</div>
                </div>
                
                <div class="binaural-reverb-setting binaural-only-setting">
                    <label>
                        <span>ILD Intensity</span>
                        <input type="range" id="binaural-ild-intensity" min="0" max="100" value="60" step="1">
                        <span class="binaural-reverb-value" id="binaural-ild-intensity-value">0.60</span>
                    </label>
                    <div class="binaural-reverb-description">Interaural Level Difference intensity (head shadow effect) - Binaural mode only</div>
                </div>
                
                <div class="binaural-reverb-setting binaural-only-setting">
                    <label>
                        <span>Piano Lid Position</span>
                        <input type="range" id="binaural-piano-lid" min="0" max="100" value="50" step="1">
                        <span class="binaural-reverb-value" id="binaural-piano-lid-value">0.50</span>
                    </label>
                    <div class="binaural-reverb-description">Piano lid position (0.0 = closed, 1.0 = fully open) - Binaural mode only</div>
                </div>
                
                <div class="binaural-reverb-setting binaural-only-setting">
                    <label>
                        <span>Binaural Quality</span>
                        <input type="range" id="binaural-quality" min="0" max="100" value="70" step="1">
                        <span class="binaural-reverb-value" id="binaural-quality-value">0.70</span>
                    </label>
                    <div class="binaural-reverb-description">Overall binaural processing quality (0.0 to 1.0) - Binaural mode only</div>
                </div>
                
                <div class="binaural-reverb-setting binaural-only-setting">
                    <label class="binaural-reverb-checkbox">
                        <input type="checkbox" id="binaural-frequency-dependent" checked>
                        <span>Frequency-Dependent Effects</span>
                    </label>
                    <div class="binaural-reverb-description">Enable frequency-dependent binaural processing (head shadow) - Binaural mode only</div>
                </div>
                
                <div class="binaural-reverb-popup-footer">
                    <button class="binaural-reverb-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('binaural-reverb-styles')) {
        const style = document.createElement('style');
        style.id = 'binaural-reverb-styles';
        style.textContent = `
            .binaural-reverb-popup {
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
            .binaural-reverb-popup.active {
                display: flex;
            }
            .binaural-reverb-popup-content {
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
            .binaural-reverb-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .binaural-reverb-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .binaural-reverb-popup-close {
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
            .binaural-reverb-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .binaural-reverb-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .binaural-reverb-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .binaural-reverb-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .binaural-reverb-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .binaural-reverb-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .binaural-reverb-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .binaural-reverb-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .binaural-reverb-value {
                min-width: 50px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .binaural-reverb-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .binaural-reverb-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .binaural-reverb-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .binaural-reverb-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .binaural-reverb-reset {
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
            .binaural-reverb-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
            .binaural-reverb-button {
                background: none;
                border: none;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 11px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                transition: background 0.2s;
                margin-left: 8px;
            }
            .binaural-reverb-button:hover {
                background: rgba(74, 158, 255, 0.1);
            }
            .binaural-reverb-mode-toggle {
                display: flex;
                gap: 16px;
                flex: 1;
            }
            .binaural-reverb-radio {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .binaural-reverb-radio:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            .binaural-reverb-radio input[type="radio"] {
                margin: 0;
                cursor: pointer;
            }
            .binaural-reverb-radio span {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
            }
            .binaural-reverb-radio input[type="radio"]:checked + span {
                color: #4a9eff;
                font-weight: 500;
            }
            .binaural-only-setting {
                display: flex;
            }
            .binaural-only-setting.hidden {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup slider with delayed update (updates UI during drag, applies audio on release)
 * @param {HTMLElement} slider - The slider element
 * @param {HTMLElement} valueDisplay - The element to display the value
 * @param {Function} valueFormatter - Function to format the value for display
 * @param {Function} valueConverter - Function to convert slider value (0-100) to actual value
 * @param {Function} updateFunction - Function to call when slider is released
 */
function setupSliderWithDelayedUpdate(slider, valueDisplay, valueFormatter, valueConverter, updateFunction) {
    if (!slider || !valueDisplay) return;
    
    // Initialize display with current slider value
    const rawValue = parseFloat(slider.value);
    const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
    valueDisplay.textContent = valueFormatter ? valueFormatter(actualValue) : actualValue.toFixed(2);
    
    // Update UI during drag (input event)
    slider.addEventListener('input', (e) => {
        const rawValue = parseFloat(e.target.value);
        const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
        valueDisplay.textContent = valueFormatter ? valueFormatter(actualValue) : actualValue.toFixed(2);
    });
    
    // Apply audio changes only on release (mouseup/touchend)
    const applyUpdate = (e) => {
        const rawValue = parseFloat(slider.value);
        const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
        updateFunction(actualValue);
    };
    
    slider.addEventListener('mouseup', applyUpdate);
    slider.addEventListener('touchend', applyUpdate);
}

/**
 * Setup event listeners for binaural reverb controls
 */
function setupBinauralReverbControls() {
    const popup = document.getElementById('binaural-reverb-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.binaural-reverb-popup-close');
    const resetBtn = popup.querySelector('.binaural-reverb-reset');

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
            resetBinauralReverbToDefaults();
        });
    }

    // Reverb Mode Toggle
    const binauralModeRadio = document.getElementById('reverb-mode-binaural');
    const regularModeRadio = document.getElementById('reverb-mode-regular');
    const binauralOnlySettings = popup.querySelectorAll('.binaural-only-setting');
    
    function updateModeVisibility() {
        const isBinaural = binauralModeRadio && binauralModeRadio.checked;
        binauralOnlySettings.forEach(setting => {
            if (isBinaural) {
                setting.classList.remove('hidden');
            } else {
                setting.classList.add('hidden');
            }
        });
    }
    
    if (binauralModeRadio && regularModeRadio) {
        // Set initial state based on current settings
        const currentMode = window.binauralReverbSettings?.reverbMode || 'binaural';
        if (currentMode === 'regular') {
            regularModeRadio.checked = true;
            binauralModeRadio.checked = false;
        } else {
            binauralModeRadio.checked = true;
            regularModeRadio.checked = false;
        }
        updateModeVisibility();
        
        // Handle mode changes
        binauralModeRadio.addEventListener('change', () => {
            if (binauralModeRadio.checked) {
                if (window.setBinauralReverbSettings) {
                    window.setBinauralReverbSettings({ reverbMode: 'binaural' });
                }
                updateModeVisibility();
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
        
        regularModeRadio.addEventListener('change', () => {
            if (regularModeRadio.checked) {
                if (window.setBinauralReverbSettings) {
                    window.setBinauralReverbSettings({ reverbMode: 'regular' });
                }
                updateModeVisibility();
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    // Room Size
    const roomSizeSlider = document.getElementById('binaural-room-size');
    const roomSizeValue = document.getElementById('binaural-room-size-value');
    setupSliderWithDelayedUpdate(
        roomSizeSlider,
        roomSizeValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ roomSize: value });
            }
        }
    );

    // Reverb Time
    const reverbTimeSlider = document.getElementById('binaural-reverb-time');
    const reverbTimeValue = document.getElementById('binaural-reverb-time-value');
    setupSliderWithDelayedUpdate(
        reverbTimeSlider,
        reverbTimeValue,
        (v) => v.toFixed(1) + 's',
        (v) => 0.5 + (v / 100) * 4.5, // 0.5 to 5.0
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ reverbTime: value });
            }
        }
    );

    // Early Reflections
    const earlyReflectionsSlider = document.getElementById('binaural-early-reflections');
    const earlyReflectionsValue = document.getElementById('binaural-early-reflections-value');
    setupSliderWithDelayedUpdate(
        earlyReflectionsSlider,
        earlyReflectionsValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ earlyReflections: value });
            }
        }
    );

    // Late Reverb
    const lateReverbSlider = document.getElementById('binaural-late-reverb');
    const lateReverbValue = document.getElementById('binaural-late-reverb-value');
    setupSliderWithDelayedUpdate(
        lateReverbSlider,
        lateReverbValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ lateReverb: value });
            }
        }
    );

    // Dry Level
    const drySlider = document.getElementById('binaural-dry');
    const dryValue = document.getElementById('binaural-dry-value');
    setupSliderWithDelayedUpdate(
        drySlider,
        dryValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ dry: value });
            }
        }
    );

    // Wet Level
    const wetSlider = document.getElementById('binaural-wet');
    const wetValue = document.getElementById('binaural-wet-value');
    setupSliderWithDelayedUpdate(
        wetSlider,
        wetValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ wet: value });
            }
        }
    );

    // ITD Intensity
    const itdIntensitySlider = document.getElementById('binaural-itd-intensity');
    const itdIntensityValue = document.getElementById('binaural-itd-intensity-value');
    setupSliderWithDelayedUpdate(
        itdIntensitySlider,
        itdIntensityValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ itdIntensity: value });
            }
        }
    );

    // ILD Intensity
    const ildIntensitySlider = document.getElementById('binaural-ild-intensity');
    const ildIntensityValue = document.getElementById('binaural-ild-intensity-value');
    setupSliderWithDelayedUpdate(
        ildIntensitySlider,
        ildIntensityValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ ildIntensity: value });
            }
        }
    );

    // Piano Lid Position
    const pianoLidSlider = document.getElementById('binaural-piano-lid');
    const pianoLidValue = document.getElementById('binaural-piano-lid-value');
    setupSliderWithDelayedUpdate(
        pianoLidSlider,
        pianoLidValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ pianoLidPosition: value });
            }
        }
    );

    // Binaural Quality
    const qualitySlider = document.getElementById('binaural-quality');
    const qualityValue = document.getElementById('binaural-quality-value');
    setupSliderWithDelayedUpdate(
        qualitySlider,
        qualityValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ binauralQuality: value });
            }
        }
    );

    // Frequency Dependent
    const freqDependentCheckbox = document.getElementById('binaural-frequency-dependent');
    if (freqDependentCheckbox) {
        freqDependentCheckbox.addEventListener('change', (e) => {
            if (window.setBinauralReverbSettings) {
                window.setBinauralReverbSettings({ frequencyDependent: e.target.checked });
            }
        });
    }
}

/**
 * Reset binaural reverb settings to defaults
 */
function resetBinauralReverbToDefaults() {
    const defaults = {
        reverbMode: 'binaural',
        roomSize: 0.7,
        reverbTime: 2.0,
        earlyReflections: 0.6,
        lateReverb: 0.6,
        dry: 0.06,
        wet: 0.5,
        itdIntensity: 0.8,
        ildIntensity: 0.6,
        frequencyDependent: true,
        pianoLidPosition: 0.5,
        binauralQuality: 0.7
    };

    if (window.setBinauralReverbSettings) {
        window.setBinauralReverbSettings(defaults);
    }

    // Update UI sliders
    const roomSizeSlider = document.getElementById('binaural-room-size');
    const reverbTimeSlider = document.getElementById('binaural-reverb-time');
    const earlyReflectionsSlider = document.getElementById('binaural-early-reflections');
    const lateReverbSlider = document.getElementById('binaural-late-reverb');
    const drySlider = document.getElementById('binaural-dry');
    const wetSlider = document.getElementById('binaural-wet');
    const itdIntensitySlider = document.getElementById('binaural-itd-intensity');
    const ildIntensitySlider = document.getElementById('binaural-ild-intensity');
    const pianoLidSlider = document.getElementById('binaural-piano-lid');
    const qualitySlider = document.getElementById('binaural-quality');
    const freqDependentCheckbox = document.getElementById('binaural-frequency-dependent');

    // Update mode radio buttons
    const binauralModeRadio = document.getElementById('reverb-mode-binaural');
    const regularModeRadio = document.getElementById('reverb-mode-regular');
    if (binauralModeRadio) binauralModeRadio.checked = true;
    if (regularModeRadio) regularModeRadio.checked = false;
    
    if (roomSizeSlider) roomSizeSlider.value = 70;
    if (reverbTimeSlider) reverbTimeSlider.value = 20;
    if (earlyReflectionsSlider) earlyReflectionsSlider.value = 60;
    if (lateReverbSlider) lateReverbSlider.value = 60;
    if (drySlider) drySlider.value = 6;
    if (wetSlider) wetSlider.value = 50;
    if (itdIntensitySlider) itdIntensitySlider.value = 80;
    if (ildIntensitySlider) ildIntensitySlider.value = 60;
    if (pianoLidSlider) pianoLidSlider.value = 50;
    if (qualitySlider) qualitySlider.value = 70;
    if (freqDependentCheckbox) freqDependentCheckbox.checked = true;
    
    // Update mode visibility
    const popup = document.getElementById('binaural-reverb-popup');
    if (popup) {
        const binauralOnlySettings = popup.querySelectorAll('.binaural-only-setting');
        binauralOnlySettings.forEach(setting => {
            setting.classList.remove('hidden');
        });
    }

    // Trigger input events to update value displays
    if (roomSizeSlider) roomSizeSlider.dispatchEvent(new Event('input'));
    if (reverbTimeSlider) reverbTimeSlider.dispatchEvent(new Event('input'));
    if (earlyReflectionsSlider) earlyReflectionsSlider.dispatchEvent(new Event('input'));
    if (lateReverbSlider) lateReverbSlider.dispatchEvent(new Event('input'));
    if (drySlider) drySlider.dispatchEvent(new Event('input'));
    if (wetSlider) wetSlider.dispatchEvent(new Event('input'));
    if (itdIntensitySlider) itdIntensitySlider.dispatchEvent(new Event('input'));
    if (ildIntensitySlider) ildIntensitySlider.dispatchEvent(new Event('input'));
    if (pianoLidSlider) pianoLidSlider.dispatchEvent(new Event('input'));
    if (qualitySlider) qualitySlider.dispatchEvent(new Event('input'));
}

/**
 * Open the binaural reverb settings popup
 */
function openBinauralReverbSettings() {
    const popup = document.getElementById('binaural-reverb-popup');
    if (popup) {
        // Sync mode radio buttons with current settings
        const currentMode = window.binauralReverbSettings?.reverbMode || 'binaural';
        const binauralModeRadio = document.getElementById('reverb-mode-binaural');
        const regularModeRadio = document.getElementById('reverb-mode-regular');
        const binauralOnlySettings = popup.querySelectorAll('.binaural-only-setting');
        
        if (binauralModeRadio && regularModeRadio) {
            if (currentMode === 'regular') {
                regularModeRadio.checked = true;
                binauralModeRadio.checked = false;
                binauralOnlySettings.forEach(setting => {
                    setting.classList.add('hidden');
                });
            } else {
                binauralModeRadio.checked = true;
                regularModeRadio.checked = false;
                binauralOnlySettings.forEach(setting => {
                    setting.classList.remove('hidden');
                });
            }
        }
        
        // Sync dry and wet sliders with current settings
        const currentDry = window.binauralReverbSettings?.dry !== undefined ? window.binauralReverbSettings.dry : 0.06;
        const currentWet = window.binauralReverbSettings?.wet !== undefined ? window.binauralReverbSettings.wet : 0.5;
        const drySlider = document.getElementById('binaural-dry');
        const wetSlider = document.getElementById('binaural-wet');
        const dryValue = document.getElementById('binaural-dry-value');
        const wetValue = document.getElementById('binaural-wet-value');
        
        if (drySlider) {
            drySlider.value = Math.round(currentDry * 100);
            if (dryValue) dryValue.textContent = currentDry.toFixed(2);
        }
        if (wetSlider) {
            wetSlider.value = Math.round(currentWet * 100);
            if (wetValue) wetValue.textContent = currentWet.toFixed(2);
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initBinauralReverbSettings = initBinauralReverbSettings;
    window.openBinauralReverbSettings = openBinauralReverbSettings;
    window.resetBinauralReverbToDefaults = resetBinauralReverbToDefaults;
}


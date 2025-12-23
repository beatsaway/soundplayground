/**
 * Inharmonicity Settings UI Module
 * Provides popup interface for adjusting inharmonicity parameters
 * Allows fine-tuning of inharmonicity coefficient ranges and bass boost
 */

// Default inharmonicity settings
const inharmonicitySettings = {
    // B coefficient range (pitch-dependent)
    bMin: 0.0001,  // Minimum B for bass (A0)
    bMax: 0.02,    // Maximum B for treble (C8)
    
    // Bass boost multiplier (to make lower notes more present)
    bassBoost: 1.0,  // 1.0 = no boost, >1.0 = boost lower notes
    
    // Bass boost frequency threshold (notes below this get boost)
    bassBoostThreshold: 262,  // C4 (middle C) - boost notes below this
    
    // Inharmonicity curve shape (exponent for interpolation)
    curveExponent: 1.5,  // Higher = more exponential curve
    
    // Enable/disable
    enabled: true
};

// Store settings globally
if (typeof window !== 'undefined') {
    window.inharmonicitySettings = inharmonicitySettings;
}

/**
 * Initialize inharmonicity settings popup
 * Creates and manages the popup UI for advanced inharmonicity adjustments
 */
function initInharmonicitySettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('inharmonicity-popup');
    if (!popup) {
        popup = createInharmonicityPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupInharmonicityControls();
}

/**
 * Create the inharmonicity settings popup HTML
 */
function createInharmonicityPopup() {
    const popup = document.createElement('div');
    popup.id = 'inharmonicity-popup';
    popup.className = 'inharmonicity-popup';
    popup.innerHTML = `
        <div class="inharmonicity-popup-content">
            <div class="inharmonicity-popup-header">
                <h2>Inharmonicity Settings</h2>
                <button class="inharmonicity-popup-close">×</button>
            </div>
            <div class="inharmonicity-popup-body">
                <div class="inharmonicity-setting">
                    <label>
                        <span>Bass Inharmonicity (B min)</span>
                        <input type="range" id="inharmonicity-b-min" min="0" max="100" value="1" step="1">
                        <span class="inharmonicity-value" id="inharmonicity-b-min-value">0.0001</span>
                    </label>
                    <div class="inharmonicity-description">Minimum inharmonicity coefficient for bass notes (A0). Lower values = more harmonic, higher = more inharmonic.</div>
                </div>
                
                <div class="inharmonicity-setting">
                    <label>
                        <span>Treble Inharmonicity (B max)</span>
                        <input type="range" id="inharmonicity-b-max" min="0" max="200" value="20" step="1">
                        <span class="inharmonicity-value" id="inharmonicity-b-max-value">0.0200</span>
                    </label>
                    <div class="inharmonicity-description">Maximum inharmonicity coefficient for treble notes (C8). Higher values = more sharp partials in treble.</div>
                </div>
                
                <div class="inharmonicity-setting">
                    <label>
                        <span>Bass Boost</span>
                        <input type="range" id="inharmonicity-bass-boost" min="0" max="200" value="100" step="1">
                        <span class="inharmonicity-value" id="inharmonicity-bass-boost-value">1.00x</span>
                    </label>
                    <div class="inharmonicity-description">Boost inharmonicity for lower notes to increase perceived loudness and presence. 1.0x = no boost, 2.0x = double.</div>
                </div>
                
                <div class="inharmonicity-setting">
                    <label>
                        <span>Bass Boost Threshold</span>
                        <input type="range" id="inharmonicity-bass-threshold" min="50" max="500" value="262" step="1">
                        <span class="inharmonicity-value" id="inharmonicity-bass-threshold-value">262 Hz (C4)</span>
                    </label>
                    <div class="inharmonicity-description">Frequency threshold below which bass boost applies. Notes below this frequency get boosted inharmonicity.</div>
                </div>
                
                <div class="inharmonicity-setting">
                    <label>
                        <span>Curve Shape</span>
                        <input type="range" id="inharmonicity-curve-exponent" min="50" max="300" value="150" step="5">
                        <span class="inharmonicity-value" id="inharmonicity-curve-exponent-value">1.50</span>
                    </label>
                    <div class="inharmonicity-description">Exponent for inharmonicity curve interpolation. Higher = more exponential (more change in treble), lower = more linear.</div>
                </div>
                
                <div class="inharmonicity-popup-footer">
                    <button class="inharmonicity-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('inharmonicity-styles')) {
        const style = document.createElement('style');
        style.id = 'inharmonicity-styles';
        style.textContent = `
            .inharmonicity-popup {
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
            .inharmonicity-popup.active {
                display: flex;
            }
            .inharmonicity-popup-content {
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
            .inharmonicity-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .inharmonicity-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .inharmonicity-popup-close {
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
            .inharmonicity-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .inharmonicity-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .inharmonicity-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .inharmonicity-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .inharmonicity-setting label span:first-child {
                min-width: 180px;
                font-weight: 500;
            }
            .inharmonicity-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .inharmonicity-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .inharmonicity-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .inharmonicity-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .inharmonicity-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 192px;
                line-height: 1.4;
            }
            .inharmonicity-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .inharmonicity-reset {
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
            .inharmonicity-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup slider with delayed update (updates UI during drag, applies audio on release)
 */
function setupInharmonicitySlider(slider, valueDisplay, valueFormatter, valueConverter, updateFunction) {
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
 * Setup event listeners for inharmonicity controls
 */
function setupInharmonicityControls() {
    const popup = document.getElementById('inharmonicity-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.inharmonicity-popup-close');
    const resetBtn = popup.querySelector('.inharmonicity-reset');

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
            resetInharmonicityToDefaults();
        });
    }

    // B Min (0.0001 = slider value 1)
    const bMinSlider = document.getElementById('inharmonicity-b-min');
    const bMinValue = document.getElementById('inharmonicity-b-min-value');
    setupInharmonicitySlider(
        bMinSlider,
        bMinValue,
        (v) => v.toFixed(4),
        (v) => v * 0.0001, // 0-100 maps to 0-0.01
        (value) => {
            if (window.setInharmonicitySettings) {
                window.setInharmonicitySettings({ bMin: value });
            }
        }
    );

    // B Max (0.02 = slider value 20)
    const bMaxSlider = document.getElementById('inharmonicity-b-max');
    const bMaxValue = document.getElementById('inharmonicity-b-max-value');
    setupInharmonicitySlider(
        bMaxSlider,
        bMaxValue,
        (v) => v.toFixed(4),
        (v) => v * 0.001, // 0-200 maps to 0-0.2
        (value) => {
            if (window.setInharmonicitySettings) {
                window.setInharmonicitySettings({ bMax: value });
            }
        }
    );

    // Bass Boost (1.0 = slider value 100)
    const bassBoostSlider = document.getElementById('inharmonicity-bass-boost');
    const bassBoostValue = document.getElementById('inharmonicity-bass-boost-value');
    setupInharmonicitySlider(
        bassBoostSlider,
        bassBoostValue,
        (v) => v.toFixed(2) + 'x',
        (v) => v / 100, // 0-200 maps to 0-2.0
        (value) => {
            if (window.setInharmonicitySettings) {
                window.setInharmonicitySettings({ bassBoost: value });
            }
        }
    );

    // Bass Boost Threshold
    const bassThresholdSlider = document.getElementById('inharmonicity-bass-threshold');
    const bassThresholdValue = document.getElementById('inharmonicity-bass-threshold-value');
    setupInharmonicitySlider(
        bassThresholdSlider,
        bassThresholdValue,
        (v) => {
            const note = getNoteNameFromFrequency(v);
            return `${Math.round(v)} Hz (${note})`;
        },
        (v) => v, // Direct mapping
        (value) => {
            if (window.setInharmonicitySettings) {
                window.setInharmonicitySettings({ bassBoostThreshold: value });
            }
        }
    );

    // Curve Exponent (1.5 = slider value 150)
    const curveExponentSlider = document.getElementById('inharmonicity-curve-exponent');
    const curveExponentValue = document.getElementById('inharmonicity-curve-exponent-value');
    setupInharmonicitySlider(
        curveExponentSlider,
        curveExponentValue,
        (v) => v.toFixed(2),
        (v) => v / 100, // 50-300 maps to 0.5-3.0
        (value) => {
            if (window.setInharmonicitySettings) {
                window.setInharmonicitySettings({ curveExponent: value });
            }
        }
    );
}

/**
 * Get note name from frequency (approximate)
 */
function getNoteNameFromFrequency(freq) {
    const A4 = 440;
    const semitones = Math.round(12 * Math.log2(freq / A4));
    const noteNumber = 69 + semitones; // A4 = MIDI 69
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = notes[noteNumber % 12];
    return `${note}${octave}`;
}

/**
 * Set inharmonicity settings
 */
function setInharmonicitySettings(newSettings) {
    if (!window.inharmonicitySettings) return;
    
    Object.assign(window.inharmonicitySettings, newSettings);
    
    // Settings are applied in real-time through the calculateInharmonicityCoefficient function
    // No need to reconnect audio chain since inharmonicity is calculated per note
}

/**
 * Reset inharmonicity settings to defaults
 */
function resetInharmonicityToDefaults() {
    const defaults = {
        bMin: 0.0001,
        bMax: 0.02,
        bassBoost: 1.0,
        bassBoostThreshold: 262,
        curveExponent: 1.5
    };

    if (window.setInharmonicitySettings) {
        window.setInharmonicitySettings(defaults);
    }

    // Update UI sliders
    const bMinSlider = document.getElementById('inharmonicity-b-min');
    const bMaxSlider = document.getElementById('inharmonicity-b-max');
    const bassBoostSlider = document.getElementById('inharmonicity-bass-boost');
    const bassThresholdSlider = document.getElementById('inharmonicity-bass-threshold');
    const curveExponentSlider = document.getElementById('inharmonicity-curve-exponent');
    
    if (bMinSlider) bMinSlider.value = 1; // 0.0001
    if (bMaxSlider) bMaxSlider.value = 20; // 0.02
    if (bassBoostSlider) bassBoostSlider.value = 100; // 1.0
    if (bassThresholdSlider) bassThresholdSlider.value = 262;
    if (curveExponentSlider) curveExponentSlider.value = 150; // 1.5

    // Trigger input events to update value displays
    if (bMinSlider) bMinSlider.dispatchEvent(new Event('input'));
    if (bMaxSlider) bMaxSlider.dispatchEvent(new Event('input'));
    if (bassBoostSlider) bassBoostSlider.dispatchEvent(new Event('input'));
    if (bassThresholdSlider) bassThresholdSlider.dispatchEvent(new Event('input'));
    if (curveExponentSlider) curveExponentSlider.dispatchEvent(new Event('input'));
}

/**
 * Open the inharmonicity settings popup
 */
function openInharmonicitySettings() {
    const popup = document.getElementById('inharmonicity-popup');
    if (popup) {
        // Sync sliders with current settings
        const settings = window.inharmonicitySettings || {};
        const bMinSlider = document.getElementById('inharmonicity-b-min');
        const bMaxSlider = document.getElementById('inharmonicity-b-max');
        const bassBoostSlider = document.getElementById('inharmonicity-bass-boost');
        const bassThresholdSlider = document.getElementById('inharmonicity-bass-threshold');
        const curveExponentSlider = document.getElementById('inharmonicity-curve-exponent');
        
        if (bMinSlider) {
            bMinSlider.value = Math.round((settings.bMin || 0.0001) / 0.0001);
            bMinSlider.dispatchEvent(new Event('input'));
        }
        if (bMaxSlider) {
            bMaxSlider.value = Math.round((settings.bMax || 0.02) / 0.001);
            bMaxSlider.dispatchEvent(new Event('input'));
        }
        if (bassBoostSlider) {
            bassBoostSlider.value = Math.round((settings.bassBoost || 1.0) * 100);
            bassBoostSlider.dispatchEvent(new Event('input'));
        }
        if (bassThresholdSlider) {
            bassThresholdSlider.value = settings.bassBoostThreshold || 262;
            bassThresholdSlider.dispatchEvent(new Event('input'));
        }
        if (curveExponentSlider) {
            curveExponentSlider.value = Math.round((settings.curveExponent || 1.5) * 100);
            curveExponentSlider.dispatchEvent(new Event('input'));
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initInharmonicitySettings = initInharmonicitySettings;
    window.openInharmonicitySettings = openInharmonicitySettings;
    window.resetInharmonicityToDefaults = resetInharmonicityToDefaults;
    window.setInharmonicitySettings = setInharmonicitySettings;
}


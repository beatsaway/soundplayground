/**
 * Pitch Harmonic Rolloff Settings UI Module
 * Provides popup interface for adjusting pitch-dependent harmonic rolloff parameters
 * Allows fine-tuning of harmonic content across the piano range
 */

// Default pitch harmonic rolloff settings
const pitchHarmonicRolloffSettings = {
    // Rolloff rates by frequency range
    bassRolloff: 0.10,      // Bass (< 100 Hz)
    lowerMidRolloff: 0.12,  // Lower mid (100-500 Hz)
    upperMidRolloff: 0.18,  // Upper mid (500-1000 Hz)
    lowerTrebleRolloff: 0.25, // Lower treble (1000-2000 Hz)
    upperTrebleRolloff: 0.30, // Upper treble (> 2000 Hz)
    
    // Maximum harmonics by frequency range
    bassMaxHarmonics: 15,    // Bass
    lowerMidMaxHarmonics: 12, // Lower mid
    upperMidMaxHarmonics: 10, // Upper mid
    lowerTrebleMaxHarmonics: 6, // Lower treble
    upperTrebleMaxHarmonics: 3, // Upper treble
    
    // Velocity boost multiplier
    velocityBoost: 0.3,     // How much velocity affects harmonic content
    
    // Enable/disable
    enabled: true
};

// Store settings globally
if (typeof window !== 'undefined') {
    window.pitchHarmonicRolloffSettings = pitchHarmonicRolloffSettings;
}

/**
 * Initialize pitch harmonic rolloff settings popup
 */
function initPitchHarmonicRolloffSettings() {
    let popup = document.getElementById('pitch-harmonic-rolloff-popup');
    if (!popup) {
        popup = createPitchHarmonicRolloffPopup();
        document.body.appendChild(popup);
    }
    setupPitchHarmonicRolloffControls();
}

/**
 * Create the pitch harmonic rolloff settings popup HTML
 */
function createPitchHarmonicRolloffPopup() {
    const popup = document.createElement('div');
    popup.id = 'pitch-harmonic-rolloff-popup';
    popup.className = 'pitch-harmonic-rolloff-popup';
    popup.innerHTML = `
        <div class="pitch-harmonic-rolloff-popup-content">
            <div class="pitch-harmonic-rolloff-popup-header">
                <h2>Pitch Harmonic Rolloff Settings</h2>
                <button class="pitch-harmonic-rolloff-popup-close">×</button>
            </div>
            <div class="pitch-harmonic-rolloff-popup-body">
                <div class="pitch-harmonic-rolloff-section">
                    <h3>Rolloff Rates (Higher = Steeper Decay)</h3>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Bass Rolloff (< 100 Hz)</span>
                            <input type="range" id="pitch-rolloff-bass" min="0" max="50" value="10" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-rolloff-bass-value">0.10</span>
                        </label>
                        <div class="pitch-harmonic-rolloff-description">Rolloff rate for bass notes. Lower = more harmonics, higher = fewer harmonics.</div>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Lower Mid Rolloff (100-500 Hz)</span>
                            <input type="range" id="pitch-rolloff-lower-mid" min="0" max="50" value="12" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-rolloff-lower-mid-value">0.12</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Upper Mid Rolloff (500-1000 Hz)</span>
                            <input type="range" id="pitch-rolloff-upper-mid" min="0" max="50" value="18" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-rolloff-upper-mid-value">0.18</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Lower Treble Rolloff (1000-2000 Hz)</span>
                            <input type="range" id="pitch-rolloff-lower-treble" min="0" max="50" value="25" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-rolloff-lower-treble-value">0.25</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Upper Treble Rolloff (> 2000 Hz)</span>
                            <input type="range" id="pitch-rolloff-upper-treble" min="0" max="50" value="30" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-rolloff-upper-treble-value">0.30</span>
                        </label>
                    </div>
                </div>
                
                <div class="pitch-harmonic-rolloff-section">
                    <h3>Maximum Harmonics (Per Frequency Range)</h3>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Bass Max Harmonics</span>
                            <input type="range" id="pitch-max-bass" min="5" max="25" value="15" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-max-bass-value">15</span>
                        </label>
                        <div class="pitch-harmonic-rolloff-description">Maximum number of audible harmonics for bass notes. More harmonics = richer, louder sound.</div>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Lower Mid Max Harmonics</span>
                            <input type="range" id="pitch-max-lower-mid" min="5" max="20" value="12" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-max-lower-mid-value">12</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Upper Mid Max Harmonics</span>
                            <input type="range" id="pitch-max-upper-mid" min="3" max="15" value="10" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-max-upper-mid-value">10</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Lower Treble Max Harmonics</span>
                            <input type="range" id="pitch-max-lower-treble" min="2" max="10" value="6" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-max-lower-treble-value">6</span>
                        </label>
                    </div>
                    
                    <div class="pitch-harmonic-rolloff-setting">
                        <label>
                            <span>Upper Treble Max Harmonics</span>
                            <input type="range" id="pitch-max-upper-treble" min="1" max="5" value="3" step="1">
                            <span class="pitch-harmonic-rolloff-value" id="pitch-max-upper-treble-value">3</span>
                        </label>
                    </div>
                </div>
                
                <div class="pitch-harmonic-rolloff-setting">
                    <label>
                        <span>Velocity Boost</span>
                        <input type="range" id="pitch-velocity-boost" min="0" max="100" value="30" step="1">
                        <span class="pitch-harmonic-rolloff-value" id="pitch-velocity-boost-value">0.30</span>
                    </label>
                    <div class="pitch-harmonic-rolloff-description">How much velocity affects harmonic content. Higher = louder notes have more harmonics.</div>
                </div>
                
                <div class="pitch-harmonic-rolloff-popup-footer">
                    <button class="pitch-harmonic-rolloff-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('pitch-harmonic-rolloff-styles')) {
        const style = document.createElement('style');
        style.id = 'pitch-harmonic-rolloff-styles';
        style.textContent = `
            .pitch-harmonic-rolloff-popup {
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
            .pitch-harmonic-rolloff-popup.active {
                display: flex;
            }
            .pitch-harmonic-rolloff-popup-content {
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
            .pitch-harmonic-rolloff-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .pitch-harmonic-rolloff-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .pitch-harmonic-rolloff-popup-close {
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
            .pitch-harmonic-rolloff-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .pitch-harmonic-rolloff-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .pitch-harmonic-rolloff-section {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
            }
            .pitch-harmonic-rolloff-section h3 {
                margin: 0 0 8px 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            .pitch-harmonic-rolloff-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .pitch-harmonic-rolloff-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .pitch-harmonic-rolloff-setting label span:first-child {
                min-width: 180px;
                font-weight: 500;
            }
            .pitch-harmonic-rolloff-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .pitch-harmonic-rolloff-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .pitch-harmonic-rolloff-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .pitch-harmonic-rolloff-value {
                min-width: 60px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .pitch-harmonic-rolloff-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 192px;
                line-height: 1.4;
            }
            .pitch-harmonic-rolloff-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .pitch-harmonic-rolloff-reset {
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
            .pitch-harmonic-rolloff-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup slider with delayed update
 */
function setupPitchHarmonicRolloffSlider(slider, valueDisplay, valueFormatter, valueConverter, updateFunction) {
    if (!slider || !valueDisplay) return;
    
    const rawValue = parseFloat(slider.value);
    const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
    valueDisplay.textContent = valueFormatter ? valueFormatter(actualValue) : actualValue.toFixed(2);
    
    slider.addEventListener('input', (e) => {
        const rawValue = parseFloat(e.target.value);
        const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
        valueDisplay.textContent = valueFormatter ? valueFormatter(actualValue) : actualValue.toFixed(2);
    });
    
    const applyUpdate = (e) => {
        const rawValue = parseFloat(slider.value);
        const actualValue = valueConverter ? valueConverter(rawValue) : rawValue / 100;
        updateFunction(actualValue);
    };
    
    slider.addEventListener('mouseup', applyUpdate);
    slider.addEventListener('touchend', applyUpdate);
}

/**
 * Setup event listeners for pitch harmonic rolloff controls
 */
function setupPitchHarmonicRolloffControls() {
    const popup = document.getElementById('pitch-harmonic-rolloff-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.pitch-harmonic-rolloff-popup-close');
    const resetBtn = popup.querySelector('.pitch-harmonic-rolloff-reset');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
        }
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetPitchHarmonicRolloffToDefaults();
        });
    }

    // Rolloff sliders (0-50 maps to 0.00-0.50)
    const rolloffSliders = [
        { id: 'pitch-rolloff-bass', key: 'bassRolloff', valueId: 'pitch-rolloff-bass-value' },
        { id: 'pitch-rolloff-lower-mid', key: 'lowerMidRolloff', valueId: 'pitch-rolloff-lower-mid-value' },
        { id: 'pitch-rolloff-upper-mid', key: 'upperMidRolloff', valueId: 'pitch-rolloff-upper-mid-value' },
        { id: 'pitch-rolloff-lower-treble', key: 'lowerTrebleRolloff', valueId: 'pitch-rolloff-lower-treble-value' },
        { id: 'pitch-rolloff-upper-treble', key: 'upperTrebleRolloff', valueId: 'pitch-rolloff-upper-treble-value' }
    ];

    rolloffSliders.forEach(({ id, key, valueId }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(valueId);
        setupPitchHarmonicRolloffSlider(
            slider,
            valueDisplay,
            (v) => v.toFixed(2),
            (v) => v / 100,
            (value) => {
                if (window.setPitchHarmonicRolloffSettings) {
                    window.setPitchHarmonicRolloffSettings({ [key]: value });
                }
            }
        );
    });

    // Max harmonics sliders (direct mapping)
    const maxHarmonicsSliders = [
        { id: 'pitch-max-bass', key: 'bassMaxHarmonics', valueId: 'pitch-max-bass-value' },
        { id: 'pitch-max-lower-mid', key: 'lowerMidMaxHarmonics', valueId: 'pitch-max-lower-mid-value' },
        { id: 'pitch-max-upper-mid', key: 'upperMidMaxHarmonics', valueId: 'pitch-max-upper-mid-value' },
        { id: 'pitch-max-lower-treble', key: 'lowerTrebleMaxHarmonics', valueId: 'pitch-max-lower-treble-value' },
        { id: 'pitch-max-upper-treble', key: 'upperTrebleMaxHarmonics', valueId: 'pitch-max-upper-treble-value' }
    ];

    maxHarmonicsSliders.forEach(({ id, key, valueId }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(valueId);
        setupPitchHarmonicRolloffSlider(
            slider,
            valueDisplay,
            (v) => Math.round(v).toString(),
            (v) => v,
            (value) => {
                if (window.setPitchHarmonicRolloffSettings) {
                    window.setPitchHarmonicRolloffSettings({ [key]: value });
                }
            }
        );
    });

    // Velocity boost slider
    const velocityBoostSlider = document.getElementById('pitch-velocity-boost');
    const velocityBoostValue = document.getElementById('pitch-velocity-boost-value');
    setupPitchHarmonicRolloffSlider(
        velocityBoostSlider,
        velocityBoostValue,
        (v) => v.toFixed(2),
        (v) => v / 100,
        (value) => {
            if (window.setPitchHarmonicRolloffSettings) {
                window.setPitchHarmonicRolloffSettings({ velocityBoost: value });
            }
        }
    );
}

/**
 * Set pitch harmonic rolloff settings
 */
function setPitchHarmonicRolloffSettings(newSettings) {
    if (!window.pitchHarmonicRolloffSettings) return;
    Object.assign(window.pitchHarmonicRolloffSettings, newSettings);
}

/**
 * Reset to defaults
 */
function resetPitchHarmonicRolloffToDefaults() {
    const defaults = {
        bassRolloff: 0.10,
        lowerMidRolloff: 0.12,
        upperMidRolloff: 0.18,
        lowerTrebleRolloff: 0.25,
        upperTrebleRolloff: 0.30,
        bassMaxHarmonics: 15,
        lowerMidMaxHarmonics: 12,
        upperMidMaxHarmonics: 10,
        lowerTrebleMaxHarmonics: 6,
        upperTrebleMaxHarmonics: 3,
        velocityBoost: 0.3
    };

    if (window.setPitchHarmonicRolloffSettings) {
        window.setPitchHarmonicRolloffSettings(defaults);
    }

    // Update UI
    const sliders = [
        { id: 'pitch-rolloff-bass', value: 10 },
        { id: 'pitch-rolloff-lower-mid', value: 12 },
        { id: 'pitch-rolloff-upper-mid', value: 18 },
        { id: 'pitch-rolloff-lower-treble', value: 25 },
        { id: 'pitch-rolloff-upper-treble', value: 30 },
        { id: 'pitch-max-bass', value: 15 },
        { id: 'pitch-max-lower-mid', value: 12 },
        { id: 'pitch-max-upper-mid', value: 10 },
        { id: 'pitch-max-lower-treble', value: 6 },
        { id: 'pitch-max-upper-treble', value: 3 },
        { id: 'pitch-velocity-boost', value: 30 }
    ];

    sliders.forEach(({ id, value }) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = value;
            slider.dispatchEvent(new Event('input'));
        }
    });
}

/**
 * Open the popup
 */
function openPitchHarmonicRolloffSettings() {
    const popup = document.getElementById('pitch-harmonic-rolloff-popup');
    if (popup) {
        const settings = window.pitchHarmonicRolloffSettings || {};
        
        // Sync all sliders
        const syncSlider = (id, value, converter = (v) => v) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = converter(value);
                slider.dispatchEvent(new Event('input'));
            }
        };
        
        syncSlider('pitch-rolloff-bass', settings.bassRolloff || 0.10, v => v * 100);
        syncSlider('pitch-rolloff-lower-mid', settings.lowerMidRolloff || 0.12, v => v * 100);
        syncSlider('pitch-rolloff-upper-mid', settings.upperMidRolloff || 0.18, v => v * 100);
        syncSlider('pitch-rolloff-lower-treble', settings.lowerTrebleRolloff || 0.25, v => v * 100);
        syncSlider('pitch-rolloff-upper-treble', settings.upperTrebleRolloff || 0.30, v => v * 100);
        syncSlider('pitch-max-bass', settings.bassMaxHarmonics || 15);
        syncSlider('pitch-max-lower-mid', settings.lowerMidMaxHarmonics || 12);
        syncSlider('pitch-max-upper-mid', settings.upperMidMaxHarmonics || 10);
        syncSlider('pitch-max-lower-treble', settings.lowerTrebleMaxHarmonics || 6);
        syncSlider('pitch-max-upper-treble', settings.upperTrebleMaxHarmonics || 3);
        syncSlider('pitch-velocity-boost', settings.velocityBoost || 0.3, v => v * 100);
        
        popup.classList.add('active');
    }
}

// Export
if (typeof window !== 'undefined') {
    window.initPitchHarmonicRolloffSettings = initPitchHarmonicRolloffSettings;
    window.openPitchHarmonicRolloffSettings = openPitchHarmonicRolloffSettings;
    window.resetPitchHarmonicRolloffToDefaults = resetPitchHarmonicRolloffToDefaults;
    window.setPitchHarmonicRolloffSettings = setPitchHarmonicRolloffSettings;
}


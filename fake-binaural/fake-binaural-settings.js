/**
 * Fake Binaural Settings UI Module
 * Provides popup interface for adjusting fake binaural parameters
 */

/**
 * Initialize fake binaural settings popup
 * Creates and manages the popup UI for fake binaural adjustments
 */
function initFakeBinauralSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('fake-binaural-popup');
    if (!popup) {
        popup = createFakeBinauralPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupFakeBinauralControls();
}

/**
 * Create the fake binaural settings popup HTML
 */
function createFakeBinauralPopup() {
    const popup = document.createElement('div');
    popup.id = 'fake-binaural-popup';
    popup.className = 'fake-binaural-popup';
    popup.innerHTML = `
        <div class="fake-binaural-popup-content">
            <div class="fake-binaural-popup-header">
                <h2>Fake Binaural Settings</h2>
                <button class="fake-binaural-popup-close">×</button>
            </div>
            <div class="fake-binaural-popup-body">
                <div class="fake-binaural-setting">
                    <label>
                        <span>Pan Intensity</span>
                        <input type="range" id="fake-binaural-pan-intensity" min="0" max="100" value="40" step="1">
                        <span class="fake-binaural-value" id="fake-binaural-pan-intensity-value">0.40</span>
                    </label>
                    <div class="fake-binaural-description">Intensity of frequency-based panning (0.0 = no panning, 1.0 = full panning)</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label>
                        <span>ITD Delay</span>
                        <input type="range" id="fake-binaural-itd-amount" min="0" max="100" value="20" step="1">
                        <span class="fake-binaural-value" id="fake-binaural-itd-amount-value">200μs</span>
                    </label>
                    <div class="fake-binaural-description">Interaural Time Difference delay (0-500μs) - creates spatial width</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label>
                        <span>EQ Intensity</span>
                        <input type="range" id="fake-binaural-eq-intensity" min="0" max="100" value="50" step="1">
                        <span class="fake-binaural-value" id="fake-binaural-eq-intensity-value">0.50</span>
                    </label>
                    <div class="fake-binaural-description">Intensity of per-channel EQ differences (simulates head shadowing)</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label class="fake-binaural-checkbox">
                        <input type="checkbox" id="fake-binaural-player-perspective" checked>
                        <span>Player Perspective</span>
                    </label>
                    <div class="fake-binaural-description">Bass notes pan left, treble notes pan right (simulates sitting at piano)</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label class="fake-binaural-checkbox">
                        <input type="checkbox" id="fake-binaural-frequency-panning" checked>
                        <span>Frequency Panning</span>
                    </label>
                    <div class="fake-binaural-description">Apply frequency-based panning to create stereo width</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label class="fake-binaural-checkbox">
                        <input type="checkbox" id="fake-binaural-itd-delay" checked>
                        <span>ITD Delay</span>
                    </label>
                    <div class="fake-binaural-description">Apply micro-delays between channels for spatial perception</div>
                </div>
                
                <div class="fake-binaural-setting">
                    <label class="fake-binaural-checkbox">
                        <input type="checkbox" id="fake-binaural-eq-differences" checked>
                        <span>EQ Differences</span>
                    </label>
                    <div class="fake-binaural-description">Apply per-channel EQ differences to simulate head shadowing</div>
                </div>
                
                <div class="fake-binaural-popup-footer">
                    <button class="fake-binaural-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('fake-binaural-styles')) {
        const style = document.createElement('style');
        style.id = 'fake-binaural-styles';
        style.textContent = `
            .fake-binaural-popup {
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
            .fake-binaural-popup.active {
                display: flex;
            }
            .fake-binaural-popup-content {
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
            .fake-binaural-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .fake-binaural-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .fake-binaural-popup-close {
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
            .fake-binaural-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .fake-binaural-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .fake-binaural-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .fake-binaural-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .fake-binaural-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .fake-binaural-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .fake-binaural-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .fake-binaural-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .fake-binaural-value {
                min-width: 50px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .fake-binaural-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .fake-binaural-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .fake-binaural-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .fake-binaural-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .fake-binaural-reset {
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
            .fake-binaural-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
            .fake-binaural-button {
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
            .fake-binaural-button:hover {
                background: rgba(74, 158, 255, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for fake binaural controls
 */
function setupFakeBinauralControls() {
    const popup = document.getElementById('fake-binaural-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.fake-binaural-popup-close');
    const resetBtn = popup.querySelector('.fake-binaural-reset');

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
            resetFakeBinauralToDefaults();
        });
    }

    // Pan Intensity
    const panIntensitySlider = document.getElementById('fake-binaural-pan-intensity');
    const panIntensityValue = document.getElementById('fake-binaural-pan-intensity-value');
    if (panIntensitySlider && panIntensityValue) {
        panIntensitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            panIntensityValue.textContent = value.toFixed(2);
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ panIntensity: value });
            }
        });
    }

    // ITD Amount
    const itdAmountSlider = document.getElementById('fake-binaural-itd-amount');
    const itdAmountValue = document.getElementById('fake-binaural-itd-amount-value');
    if (itdAmountSlider && itdAmountValue) {
        itdAmountSlider.addEventListener('input', (e) => {
            const value = (parseFloat(e.target.value) / 100) * 0.0005; // 0 to 500μs
            itdAmountValue.textContent = Math.round(value * 1000000) + 'μs';
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ itdAmount: value });
            }
        });
    }

    // EQ Intensity
    const eqIntensitySlider = document.getElementById('fake-binaural-eq-intensity');
    const eqIntensityValue = document.getElementById('fake-binaural-eq-intensity-value');
    if (eqIntensitySlider && eqIntensityValue) {
        eqIntensitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            eqIntensityValue.textContent = value.toFixed(2);
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ eqIntensity: value });
            }
        });
    }

    // Player Perspective
    const playerPerspectiveCheckbox = document.getElementById('fake-binaural-player-perspective');
    if (playerPerspectiveCheckbox) {
        playerPerspectiveCheckbox.addEventListener('change', (e) => {
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ playerPerspective: e.target.checked });
            }
        });
    }

    // Frequency Panning
    const frequencyPanningCheckbox = document.getElementById('fake-binaural-frequency-panning');
    if (frequencyPanningCheckbox) {
        frequencyPanningCheckbox.addEventListener('change', (e) => {
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ frequencyPanning: e.target.checked });
            }
        });
    }

    // ITD Delay
    const itdDelayCheckbox = document.getElementById('fake-binaural-itd-delay');
    if (itdDelayCheckbox) {
        itdDelayCheckbox.addEventListener('change', (e) => {
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ itdDelay: e.target.checked });
            }
        });
    }

    // EQ Differences
    const eqDifferencesCheckbox = document.getElementById('fake-binaural-eq-differences');
    if (eqDifferencesCheckbox) {
        eqDifferencesCheckbox.addEventListener('change', (e) => {
            if (window.setFakeBinauralSettings) {
                window.setFakeBinauralSettings({ eqDifferences: e.target.checked });
            }
        });
    }
}

/**
 * Reset fake binaural settings to defaults
 */
function resetFakeBinauralToDefaults() {
    const defaults = {
        playerPerspective: true,
        frequencyPanning: true,
        itdDelay: true,
        eqDifferences: true,
        panIntensity: 0.7,
        itdAmount: 0.0004,
        eqIntensity: 0.8
    };

    if (window.setFakeBinauralSettings) {
        window.setFakeBinauralSettings(defaults);
    }

    // Update UI sliders
    const panIntensitySlider = document.getElementById('fake-binaural-pan-intensity');
    const itdAmountSlider = document.getElementById('fake-binaural-itd-amount');
    const eqIntensitySlider = document.getElementById('fake-binaural-eq-intensity');
    const playerPerspectiveCheckbox = document.getElementById('fake-binaural-player-perspective');
    const frequencyPanningCheckbox = document.getElementById('fake-binaural-frequency-panning');
    const itdDelayCheckbox = document.getElementById('fake-binaural-itd-delay');
    const eqDifferencesCheckbox = document.getElementById('fake-binaural-eq-differences');

    if (panIntensitySlider) panIntensitySlider.value = 70;
    if (itdAmountSlider) itdAmountSlider.value = 40;
    if (eqIntensitySlider) eqIntensitySlider.value = 80;
    if (playerPerspectiveCheckbox) playerPerspectiveCheckbox.checked = true;
    if (frequencyPanningCheckbox) frequencyPanningCheckbox.checked = true;
    if (itdDelayCheckbox) itdDelayCheckbox.checked = true;
    if (eqDifferencesCheckbox) eqDifferencesCheckbox.checked = true;

    // Trigger input events to update value displays
    if (panIntensitySlider) panIntensitySlider.dispatchEvent(new Event('input'));
    if (itdAmountSlider) itdAmountSlider.dispatchEvent(new Event('input'));
    if (eqIntensitySlider) eqIntensitySlider.dispatchEvent(new Event('input'));
}

/**
 * Open the fake binaural settings popup
 */
function openFakeBinauralSettings() {
    const popup = document.getElementById('fake-binaural-popup');
    if (popup) {
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initFakeBinauralSettings = initFakeBinauralSettings;
    window.openFakeBinauralSettings = openFakeBinauralSettings;
    window.resetFakeBinauralToDefaults = resetFakeBinauralToDefaults;
}


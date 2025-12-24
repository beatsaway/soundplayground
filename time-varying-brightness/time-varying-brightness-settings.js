/**
 * Time-Varying Brightness Settings UI Module
 * Provides popup interface for adjusting time-varying brightness parameters
 */

// Time-varying brightness settings state
let timeVaryingBrightnessSettings = {
    attackBrightnessPeak: 0.3, // Brightness peak during attack (default: 0.3 = +30%)
    decayBrightness: 0.2, // Brightness during decay phase (default: 0.2 = +20%)
    baseDecayTime: 0.5, // Base decay time in seconds (default: 0.5s)
    decayTimeRange: 1.0 // Decay time range in seconds (default: 1.0s)
};

/**
 * Initialize time-varying brightness settings popup
 * Creates and manages the popup UI for time-varying brightness adjustments
 */
function initTimeVaryingBrightnessSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('time-varying-brightness-popup');
    if (!popup) {
        popup = createTimeVaryingBrightnessPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupTimeVaryingBrightnessControls();
}

/**
 * Create the time-varying brightness settings popup HTML
 */
function createTimeVaryingBrightnessPopup() {
    const popup = document.createElement('div');
    popup.id = 'time-varying-brightness-popup';
    popup.className = 'time-varying-brightness-popup';
    popup.innerHTML = `
        <div class="time-varying-brightness-popup-content">
            <div class="time-varying-brightness-popup-header">
                <h2>Time-Varying Brightness Settings</h2>
                <button class="time-varying-brightness-popup-close">×</button>
            </div>
            <div class="time-varying-brightness-popup-body">
                <div class="time-varying-brightness-setting">
                    <label>
                        <span>Attack Brightness Peak</span>
                        <input type="range" id="time-varying-brightness-attack-peak" min="0.0" max="1.0" value="0.3" step="0.05">
                        <span class="time-varying-brightness-value" id="time-varying-brightness-attack-peak-value">+30%</span>
                    </label>
                    <div class="time-varying-brightness-description">Brightness peak during attack phase (0% to +100%). Higher = brighter attack. Default: +30%</div>
                </div>
                
                <div class="time-varying-brightness-setting">
                    <label>
                        <span>Decay Brightness</span>
                        <input type="range" id="time-varying-brightness-decay" min="0.0" max="0.5" value="0.2" step="0.05">
                        <span class="time-varying-brightness-value" id="time-varying-brightness-decay-value">+20%</span>
                    </label>
                    <div class="time-varying-brightness-description">Brightness during decay phase (0% to +50%). Higher = brighter sustained sound. Default: +20%</div>
                </div>
                
                <div class="time-varying-brightness-setting">
                    <label>
                        <span>Base Decay Time</span>
                        <input type="range" id="time-varying-brightness-base-decay" min="0.1" max="1.0" value="0.5" step="0.1">
                        <span class="time-varying-brightness-value" id="time-varying-brightness-base-decay-value">0.5 s</span>
                    </label>
                    <div class="time-varying-brightness-description">Base decay time for brightness (0.1 to 1.0 seconds). Lower = faster brightness decay. Default: 0.5s</div>
                </div>
                
                <div class="time-varying-brightness-setting">
                    <label>
                        <span>Decay Time Range</span>
                        <input type="range" id="time-varying-brightness-decay-range" min="0.5" max="4.0" value="1.0" step="0.1">
                        <span class="time-varying-brightness-value" id="time-varying-brightness-decay-range-value">1.0 s</span>
                    </label>
                    <div class="time-varying-brightness-description">Decay time range (0.5 to 4.0 seconds). Louder notes have longer decay (base + range). Default: 1.0s</div>
                </div>
                
                <div class="time-varying-brightness-info">
                    <h3>How It Works</h3>
                    <p>Time-varying brightness models how harmonic content evolves during a note. The sound is brightest during the attack phase, then gradually becomes less bright as the note sustains.</p>
                    <p>Louder notes (higher velocity) have longer brightness decay times, matching how real piano strings behave when struck harder.</p>
                    <p><strong>Formula:</strong> brightness(t) = 1.0 + peak × sin(attackProgress × π) during attack, then decays to 1.0 + decayBrightness × (1 - decayProgress)</p>
                </div>
                
                <div class="time-varying-brightness-popup-footer">
                    <button class="time-varying-brightness-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles (reuse similar styles from other settings modules)
    if (!document.getElementById('time-varying-brightness-styles')) {
        const style = document.createElement('style');
        style.id = 'time-varying-brightness-styles';
        style.textContent = `
            .time-varying-brightness-popup {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                justify-content: center;
                align-items: center;
            }
            
            .time-varying-brightness-popup.active {
                display: flex;
            }
            
            .time-varying-brightness-popup-content {
                background: #1a1a1a;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            
            .time-varying-brightness-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #333;
            }
            
            .time-varying-brightness-popup-header h2 {
                margin: 0;
                color: #fff;
                font-size: 20px;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-popup-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                line-height: 30px;
            }
            
            .time-varying-brightness-popup-close:hover {
                color: #ff6b6b;
            }
            
            .time-varying-brightness-popup-body {
                padding: 20px;
            }
            
            .time-varying-brightness-setting {
                margin-bottom: 25px;
            }
            
            .time-varying-brightness-setting label {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 8px;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-setting label span:first-child {
                min-width: 180px;
                color: #fff;
                font-weight: 500;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: #333;
                border-radius: 3px;
                outline: none;
            }
            
            .time-varying-brightness-setting input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .time-varying-brightness-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            
            .time-varying-brightness-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-weight: 600;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-description {
                color: #aaa;
                font-size: 12px;
                margin-top: 5px;
                padding-left: 195px;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-info {
                background: #252525;
                padding: 15px;
                border-radius: 6px;
                margin-top: 20px;
            }
            
            .time-varying-brightness-info h3 {
                color: #fff;
                margin-top: 0;
                margin-bottom: 10px;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-info p {
                color: #ccc;
                font-size: 13px;
                line-height: 1.6;
                margin: 8px 0;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-popup-footer {
                padding: 20px;
                border-top: 1px solid #333;
                text-align: center;
            }
            
            .time-varying-brightness-reset {
                background: #4a9eff;
                color: #fff;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                font-family: 'Inter', sans-serif;
            }
            
            .time-varying-brightness-reset:hover {
                background: #3a8eef;
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for time-varying brightness controls
 */
function setupTimeVaryingBrightnessControls() {
    const popup = document.getElementById('time-varying-brightness-popup');
    if (!popup) return;
    
    const closeBtn = popup.querySelector('.time-varying-brightness-popup-close');
    const resetBtn = popup.querySelector('.time-varying-brightness-reset');
    
    // Close button
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
            resetTimeVaryingBrightnessToDefaults();
        });
    }
    
    // Attack Brightness Peak
    const attackPeakSlider = document.getElementById('time-varying-brightness-attack-peak');
    const attackPeakValue = document.getElementById('time-varying-brightness-attack-peak-value');
    if (attackPeakSlider && attackPeakValue) {
        const currentAttackPeak = timeVaryingBrightnessSettings.attackBrightnessPeak;
        attackPeakSlider.value = currentAttackPeak;
        attackPeakValue.textContent = '+' + Math.round(currentAttackPeak * 100) + '%';
        
        attackPeakSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            attackPeakValue.textContent = '+' + Math.round(value * 100) + '%';
            setTimeVaryingBrightnessSettings({ attackBrightnessPeak: value });
        });
    }
    
    // Decay Brightness
    const decayBrightnessSlider = document.getElementById('time-varying-brightness-decay');
    const decayBrightnessValue = document.getElementById('time-varying-brightness-decay-value');
    if (decayBrightnessSlider && decayBrightnessValue) {
        const currentDecayBrightness = timeVaryingBrightnessSettings.decayBrightness;
        decayBrightnessSlider.value = currentDecayBrightness;
        decayBrightnessValue.textContent = '+' + Math.round(currentDecayBrightness * 100) + '%';
        
        decayBrightnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            decayBrightnessValue.textContent = '+' + Math.round(value * 100) + '%';
            setTimeVaryingBrightnessSettings({ decayBrightness: value });
        });
    }
    
    // Base Decay Time
    const baseDecayTimeSlider = document.getElementById('time-varying-brightness-base-decay');
    const baseDecayTimeValue = document.getElementById('time-varying-brightness-base-decay-value');
    if (baseDecayTimeSlider && baseDecayTimeValue) {
        const currentBaseDecayTime = timeVaryingBrightnessSettings.baseDecayTime;
        baseDecayTimeSlider.value = currentBaseDecayTime;
        baseDecayTimeValue.textContent = currentBaseDecayTime.toFixed(1) + ' s';
        
        baseDecayTimeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            baseDecayTimeValue.textContent = value.toFixed(1) + ' s';
            setTimeVaryingBrightnessSettings({ baseDecayTime: value });
        });
    }
    
    // Decay Time Range
    const decayTimeRangeSlider = document.getElementById('time-varying-brightness-decay-range');
    const decayTimeRangeValue = document.getElementById('time-varying-brightness-decay-range-value');
    if (decayTimeRangeSlider && decayTimeRangeValue) {
        const currentDecayTimeRange = timeVaryingBrightnessSettings.decayTimeRange;
        decayTimeRangeSlider.value = currentDecayTimeRange;
        decayTimeRangeValue.textContent = currentDecayTimeRange.toFixed(1) + ' s';
        
        decayTimeRangeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            decayTimeRangeValue.textContent = value.toFixed(1) + ' s';
            setTimeVaryingBrightnessSettings({ decayTimeRange: value });
        });
    }
}

/**
 * Set time-varying brightness settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setTimeVaryingBrightnessSettings(newSettings) {
    Object.assign(timeVaryingBrightnessSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.timeVaryingBrightnessSettings = timeVaryingBrightnessSettings;
    }
}

/**
 * Get time-varying brightness settings
 * @returns {Object} - Current settings
 */
function getTimeVaryingBrightnessSettings() {
    return timeVaryingBrightnessSettings;
}

/**
 * Reset time-varying brightness settings to defaults
 */
function resetTimeVaryingBrightnessToDefaults() {
    const defaults = {
        attackBrightnessPeak: 0.3,
        decayBrightness: 0.2,
        baseDecayTime: 0.5,
        decayTimeRange: 1.0
    };
    
    setTimeVaryingBrightnessSettings(defaults);
    
    // Update UI sliders
    const attackPeakSlider = document.getElementById('time-varying-brightness-attack-peak');
    const attackPeakValue = document.getElementById('time-varying-brightness-attack-peak-value');
    const decayBrightnessSlider = document.getElementById('time-varying-brightness-decay');
    const decayBrightnessValue = document.getElementById('time-varying-brightness-decay-value');
    const baseDecayTimeSlider = document.getElementById('time-varying-brightness-base-decay');
    const baseDecayTimeValue = document.getElementById('time-varying-brightness-base-decay-value');
    const decayTimeRangeSlider = document.getElementById('time-varying-brightness-decay-range');
    const decayTimeRangeValue = document.getElementById('time-varying-brightness-decay-range-value');
    
    if (attackPeakSlider) attackPeakSlider.value = 0.3;
    if (attackPeakValue) attackPeakValue.textContent = '+30%';
    if (decayBrightnessSlider) decayBrightnessSlider.value = 0.2;
    if (decayBrightnessValue) decayBrightnessValue.textContent = '+20%';
    if (baseDecayTimeSlider) baseDecayTimeSlider.value = 0.5;
    if (baseDecayTimeValue) baseDecayTimeValue.textContent = '0.5 s';
    if (decayTimeRangeSlider) decayTimeRangeSlider.value = 1.0;
    if (decayTimeRangeValue) decayTimeRangeValue.textContent = '1.0 s';
}

/**
 * Open the time-varying brightness settings popup
 */
function openTimeVaryingBrightnessSettings() {
    const popup = document.getElementById('time-varying-brightness-popup');
    if (!popup) {
        initTimeVaryingBrightnessSettings();
    } else {
        setupTimeVaryingBrightnessControls();
    }
    
    const popupFinal = document.getElementById('time-varying-brightness-popup');
    if (popupFinal) {
        // Sync slider values
        const attackPeakSlider = document.getElementById('time-varying-brightness-attack-peak');
        const attackPeakValue = document.getElementById('time-varying-brightness-attack-peak-value');
        const decayBrightnessSlider = document.getElementById('time-varying-brightness-decay');
        const decayBrightnessValue = document.getElementById('time-varying-brightness-decay-value');
        const baseDecayTimeSlider = document.getElementById('time-varying-brightness-base-decay');
        const baseDecayTimeValue = document.getElementById('time-varying-brightness-base-decay-value');
        const decayTimeRangeSlider = document.getElementById('time-varying-brightness-decay-range');
        const decayTimeRangeValue = document.getElementById('time-varying-brightness-decay-range-value');
        
        if (attackPeakSlider && attackPeakValue) {
            const currentAttackPeak = timeVaryingBrightnessSettings.attackBrightnessPeak;
            attackPeakSlider.value = currentAttackPeak;
            attackPeakValue.textContent = '+' + Math.round(currentAttackPeak * 100) + '%';
        }
        
        if (decayBrightnessSlider && decayBrightnessValue) {
            const currentDecayBrightness = timeVaryingBrightnessSettings.decayBrightness;
            decayBrightnessSlider.value = currentDecayBrightness;
            decayBrightnessValue.textContent = '+' + Math.round(currentDecayBrightness * 100) + '%';
        }
        
        if (baseDecayTimeSlider && baseDecayTimeValue) {
            const currentBaseDecayTime = timeVaryingBrightnessSettings.baseDecayTime;
            baseDecayTimeSlider.value = currentBaseDecayTime;
            baseDecayTimeValue.textContent = currentBaseDecayTime.toFixed(1) + ' s';
        }
        
        if (decayTimeRangeSlider && decayTimeRangeValue) {
            const currentDecayTimeRange = timeVaryingBrightnessSettings.decayTimeRange;
            decayTimeRangeSlider.value = currentDecayTimeRange;
            decayTimeRangeValue.textContent = currentDecayTimeRange.toFixed(1) + ' s';
        }
        
        popupFinal.classList.add('active');
    }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.timeVaryingBrightnessSettings = timeVaryingBrightnessSettings;
    window.initTimeVaryingBrightnessSettings = initTimeVaryingBrightnessSettings;
    window.openTimeVaryingBrightnessSettings = openTimeVaryingBrightnessSettings;
    window.setTimeVaryingBrightnessSettings = setTimeVaryingBrightnessSettings;
    window.getTimeVaryingBrightnessSettings = getTimeVaryingBrightnessSettings;
    window.resetTimeVaryingBrightnessToDefaults = resetTimeVaryingBrightnessToDefaults;
}


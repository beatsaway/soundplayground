/**
 * Dynamic Filter Settings UI Module
 * Provides popup interface for adjusting dynamic filter parameters
 */

// Dynamic filter settings state
let dynamicFilterSettings = {
    baseDecayTime: 0.5, // Base decay time in seconds (default: 0.5s)
    keytrackedMultiplier: 20, // Multiplier for keytracked base cutoff (default: 20x frequency)
    velocityMinMultiplier: 0.3, // Minimum velocity multiplier (default: 0.3)
    velocityMaxMultiplier: 1.0, // Maximum velocity multiplier (default: 1.0)
    targetCutoffMultiplier: 2.0, // Target cutoff as multiple of fundamental (default: 2x)
    Q: 1.0 // Filter Q/resonance (default: 1.0)
};

/**
 * Initialize dynamic filter settings popup
 * Creates and manages the popup UI for dynamic filter adjustments
 */
function initDynamicFilterSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('dynamic-filter-popup');
    if (!popup) {
        popup = createDynamicFilterPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupDynamicFilterControls();
}

/**
 * Create the dynamic filter settings popup HTML
 */
function createDynamicFilterPopup() {
    const popup = document.createElement('div');
    popup.id = 'dynamic-filter-popup';
    popup.className = 'dynamic-filter-popup';
    popup.innerHTML = `
        <div class="dynamic-filter-popup-content">
            <div class="dynamic-filter-popup-header">
                <h2>Dynamic Low-Pass Filter Settings</h2>
                <button class="dynamic-filter-popup-close">×</button>
            </div>
            <div class="dynamic-filter-popup-body">
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Base Decay Time</span>
                        <input type="range" id="dynamic-filter-base-decay-time" min="0.1" max="2.0" value="0.5" step="0.1">
                        <span class="dynamic-filter-value" id="dynamic-filter-base-decay-time-value">0.5 s</span>
                    </label>
                    <div class="dynamic-filter-description">Base decay time for filter cutoff (0.1 to 2.0 seconds). Lower = faster filter closing. Higher notes decay faster than this base. Default: 0.5s</div>
                </div>
                
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Keytracked Multiplier</span>
                        <input type="range" id="dynamic-filter-keytracked-mult" min="5" max="40" value="20" step="1">
                        <span class="dynamic-filter-value" id="dynamic-filter-keytracked-mult-value">20x</span>
                    </label>
                    <div class="dynamic-filter-description">Multiplier for keytracked base cutoff frequency (5x to 40x note frequency). Higher = brighter initial sound for higher notes. Default: 20x</div>
                </div>
                
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Velocity Min Multiplier</span>
                        <input type="range" id="dynamic-filter-velocity-min" min="0.1" max="0.8" value="0.3" step="0.1">
                        <span class="dynamic-filter-value" id="dynamic-filter-velocity-min-value">0.3x</span>
                    </label>
                    <div class="dynamic-filter-description">Minimum velocity multiplier for cutoff (0.1x to 0.8x). Lower = softer notes are darker. Default: 0.3x</div>
                </div>
                
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Velocity Max Multiplier</span>
                        <input type="range" id="dynamic-filter-velocity-max" min="0.5" max="1.5" value="1.0" step="0.1">
                        <span class="dynamic-filter-value" id="dynamic-filter-velocity-max-value">1.0x</span>
                    </label>
                    <div class="dynamic-filter-description">Maximum velocity multiplier for cutoff (0.5x to 1.5x). Higher = louder notes are brighter. Default: 1.0x</div>
                </div>
                
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Target Cutoff Multiplier</span>
                        <input type="range" id="dynamic-filter-target-cutoff" min="1.0" max="5.0" value="2.0" step="0.1">
                        <span class="dynamic-filter-value" id="dynamic-filter-target-cutoff-value">2.0x</span>
                    </label>
                    <div class="dynamic-filter-description">Target cutoff as multiple of fundamental frequency (1.0x to 5.0x). Lower = filter closes more. Default: 2.0x (filter closes to 2x fundamental)</div>
                </div>
                
                <div class="dynamic-filter-setting">
                    <label>
                        <span>Filter Q (Resonance)</span>
                        <input type="range" id="dynamic-filter-q" min="0.5" max="3.0" value="1.0" step="0.1">
                        <span class="dynamic-filter-value" id="dynamic-filter-q-value">1.0</span>
                    </label>
                    <div class="dynamic-filter-description">Filter Q/resonance (0.5 to 3.0). Higher = more resonance/peak at cutoff. Default: 1.0</div>
                </div>
                
                <div class="dynamic-filter-info">
                    <h3>How It Works</h3>
                    <p>The dynamic filter mimics harmonic damping in real piano strings. Higher harmonics decay faster than lower ones, making the sound gradually darker over time.</p>
                    <p>The filter starts open (bright) and gradually closes (dark) as the note decays. Higher notes decay faster, and louder notes start brighter.</p>
                    <p><strong>Formula:</strong> cutoff(t) = target + (initial - target) × exp(-t/decayTime)</p>
                </div>
                
                <div class="dynamic-filter-popup-footer">
                    <button class="dynamic-filter-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles (reuse similar styles from other settings modules)
    if (!document.getElementById('dynamic-filter-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-filter-styles';
        style.textContent = `
            .dynamic-filter-popup {
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
            
            .dynamic-filter-popup.active {
                display: flex;
            }
            
            .dynamic-filter-popup-content {
                background: #1a1a1a;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            
            .dynamic-filter-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #333;
            }
            
            .dynamic-filter-popup-header h2 {
                margin: 0;
                color: #fff;
                font-size: 20px;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-popup-close {
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
            
            .dynamic-filter-popup-close:hover {
                color: #ff6b6b;
            }
            
            .dynamic-filter-popup-body {
                padding: 20px;
            }
            
            .dynamic-filter-setting {
                margin-bottom: 25px;
            }
            
            .dynamic-filter-setting label {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 8px;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-setting label span:first-child {
                min-width: 180px;
                color: #fff;
                font-weight: 500;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: #333;
                border-radius: 3px;
                outline: none;
            }
            
            .dynamic-filter-setting input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .dynamic-filter-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            
            .dynamic-filter-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-weight: 600;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-description {
                color: #aaa;
                font-size: 12px;
                margin-top: 5px;
                padding-left: 195px;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-info {
                background: #252525;
                padding: 15px;
                border-radius: 6px;
                margin-top: 20px;
            }
            
            .dynamic-filter-info h3 {
                color: #fff;
                margin-top: 0;
                margin-bottom: 10px;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-info p {
                color: #ccc;
                font-size: 13px;
                line-height: 1.6;
                margin: 8px 0;
                font-family: 'Inter', sans-serif;
            }
            
            .dynamic-filter-popup-footer {
                padding: 20px;
                border-top: 1px solid #333;
                text-align: center;
            }
            
            .dynamic-filter-reset {
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
            
            .dynamic-filter-reset:hover {
                background: #3a8eef;
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for dynamic filter controls
 */
function setupDynamicFilterControls() {
    const popup = document.getElementById('dynamic-filter-popup');
    if (!popup) return;
    
    const closeBtn = popup.querySelector('.dynamic-filter-popup-close');
    const resetBtn = popup.querySelector('.dynamic-filter-reset');
    
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
            resetDynamicFilterToDefaults();
        });
    }
    
    // Base Decay Time
    const baseDecayTimeSlider = document.getElementById('dynamic-filter-base-decay-time');
    const baseDecayTimeValue = document.getElementById('dynamic-filter-base-decay-time-value');
    if (baseDecayTimeSlider && baseDecayTimeValue) {
        const currentBaseDecayTime = dynamicFilterSettings.baseDecayTime;
        baseDecayTimeSlider.value = currentBaseDecayTime;
        baseDecayTimeValue.textContent = currentBaseDecayTime.toFixed(1) + ' s';
        
        baseDecayTimeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            baseDecayTimeValue.textContent = value.toFixed(1) + ' s';
            setDynamicFilterSettings({ baseDecayTime: value });
        });
    }
    
    // Keytracked Multiplier
    const keytrackedMultSlider = document.getElementById('dynamic-filter-keytracked-mult');
    const keytrackedMultValue = document.getElementById('dynamic-filter-keytracked-mult-value');
    if (keytrackedMultSlider && keytrackedMultValue) {
        const currentKeytrackedMult = dynamicFilterSettings.keytrackedMultiplier;
        keytrackedMultSlider.value = currentKeytrackedMult;
        keytrackedMultValue.textContent = currentKeytrackedMult.toFixed(0) + 'x';
        
        keytrackedMultSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            keytrackedMultValue.textContent = value.toFixed(0) + 'x';
            setDynamicFilterSettings({ keytrackedMultiplier: value });
        });
    }
    
    // Velocity Min Multiplier
    const velocityMinSlider = document.getElementById('dynamic-filter-velocity-min');
    const velocityMinValue = document.getElementById('dynamic-filter-velocity-min-value');
    if (velocityMinSlider && velocityMinValue) {
        const currentVelocityMin = dynamicFilterSettings.velocityMinMultiplier;
        velocityMinSlider.value = currentVelocityMin;
        velocityMinValue.textContent = currentVelocityMin.toFixed(1) + 'x';
        
        velocityMinSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            velocityMinValue.textContent = value.toFixed(1) + 'x';
            setDynamicFilterSettings({ velocityMinMultiplier: value });
        });
    }
    
    // Velocity Max Multiplier
    const velocityMaxSlider = document.getElementById('dynamic-filter-velocity-max');
    const velocityMaxValue = document.getElementById('dynamic-filter-velocity-max-value');
    if (velocityMaxSlider && velocityMaxValue) {
        const currentVelocityMax = dynamicFilterSettings.velocityMaxMultiplier;
        velocityMaxSlider.value = currentVelocityMax;
        velocityMaxValue.textContent = currentVelocityMax.toFixed(1) + 'x';
        
        velocityMaxSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            velocityMaxValue.textContent = value.toFixed(1) + 'x';
            setDynamicFilterSettings({ velocityMaxMultiplier: value });
        });
    }
    
    // Target Cutoff Multiplier
    const targetCutoffSlider = document.getElementById('dynamic-filter-target-cutoff');
    const targetCutoffValue = document.getElementById('dynamic-filter-target-cutoff-value');
    if (targetCutoffSlider && targetCutoffValue) {
        const currentTargetCutoff = dynamicFilterSettings.targetCutoffMultiplier;
        targetCutoffSlider.value = currentTargetCutoff;
        targetCutoffValue.textContent = currentTargetCutoff.toFixed(1) + 'x';
        
        targetCutoffSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            targetCutoffValue.textContent = value.toFixed(1) + 'x';
            setDynamicFilterSettings({ targetCutoffMultiplier: value });
        });
    }
    
    // Filter Q
    const qSlider = document.getElementById('dynamic-filter-q');
    const qValue = document.getElementById('dynamic-filter-q-value');
    if (qSlider && qValue) {
        const currentQ = dynamicFilterSettings.Q;
        qSlider.value = currentQ;
        qValue.textContent = currentQ.toFixed(1);
        
        qSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            qValue.textContent = value.toFixed(1);
            setDynamicFilterSettings({ Q: value });
        });
    }
}

/**
 * Set dynamic filter settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setDynamicFilterSettings(newSettings) {
    Object.assign(dynamicFilterSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.dynamicFilterSettings = dynamicFilterSettings;
    }
}

/**
 * Get dynamic filter settings
 * @returns {Object} - Current settings
 */
function getDynamicFilterSettings() {
    return dynamicFilterSettings;
}

/**
 * Reset dynamic filter settings to defaults
 */
function resetDynamicFilterToDefaults() {
    const defaults = {
        baseDecayTime: 0.5,
        keytrackedMultiplier: 20,
        velocityMinMultiplier: 0.3,
        velocityMaxMultiplier: 1.0,
        targetCutoffMultiplier: 2.0,
        Q: 1.0
    };
    
    setDynamicFilterSettings(defaults);
    
    // Update UI sliders
    const baseDecayTimeSlider = document.getElementById('dynamic-filter-base-decay-time');
    const baseDecayTimeValue = document.getElementById('dynamic-filter-base-decay-time-value');
    const keytrackedMultSlider = document.getElementById('dynamic-filter-keytracked-mult');
    const keytrackedMultValue = document.getElementById('dynamic-filter-keytracked-mult-value');
    const velocityMinSlider = document.getElementById('dynamic-filter-velocity-min');
    const velocityMinValue = document.getElementById('dynamic-filter-velocity-min-value');
    const velocityMaxSlider = document.getElementById('dynamic-filter-velocity-max');
    const velocityMaxValue = document.getElementById('dynamic-filter-velocity-max-value');
    const targetCutoffSlider = document.getElementById('dynamic-filter-target-cutoff');
    const targetCutoffValue = document.getElementById('dynamic-filter-target-cutoff-value');
    const qSlider = document.getElementById('dynamic-filter-q');
    const qValue = document.getElementById('dynamic-filter-q-value');
    
    if (baseDecayTimeSlider) baseDecayTimeSlider.value = 0.5;
    if (baseDecayTimeValue) baseDecayTimeValue.textContent = '0.5 s';
    if (keytrackedMultSlider) keytrackedMultSlider.value = 20;
    if (keytrackedMultValue) keytrackedMultValue.textContent = '20x';
    if (velocityMinSlider) velocityMinSlider.value = 0.3;
    if (velocityMinValue) velocityMinValue.textContent = '0.3x';
    if (velocityMaxSlider) velocityMaxSlider.value = 1.0;
    if (velocityMaxValue) velocityMaxValue.textContent = '1.0x';
    if (targetCutoffSlider) targetCutoffSlider.value = 2.0;
    if (targetCutoffValue) targetCutoffValue.textContent = '2.0x';
    if (qSlider) qSlider.value = 1.0;
    if (qValue) qValue.textContent = '1.0';
}

/**
 * Open the dynamic filter settings popup
 */
function openDynamicFilterSettings() {
    const popup = document.getElementById('dynamic-filter-popup');
    if (!popup) {
        initDynamicFilterSettings();
    } else {
        setupDynamicFilterControls();
    }
    
    const popupFinal = document.getElementById('dynamic-filter-popup');
    if (popupFinal) {
        // Sync slider values
        const baseDecayTimeSlider = document.getElementById('dynamic-filter-base-decay-time');
        const baseDecayTimeValue = document.getElementById('dynamic-filter-base-decay-time-value');
        const keytrackedMultSlider = document.getElementById('dynamic-filter-keytracked-mult');
        const keytrackedMultValue = document.getElementById('dynamic-filter-keytracked-mult-value');
        const velocityMinSlider = document.getElementById('dynamic-filter-velocity-min');
        const velocityMinValue = document.getElementById('dynamic-filter-velocity-min-value');
        const velocityMaxSlider = document.getElementById('dynamic-filter-velocity-max');
        const velocityMaxValue = document.getElementById('dynamic-filter-velocity-max-value');
        const targetCutoffSlider = document.getElementById('dynamic-filter-target-cutoff');
        const targetCutoffValue = document.getElementById('dynamic-filter-target-cutoff-value');
        const qSlider = document.getElementById('dynamic-filter-q');
        const qValue = document.getElementById('dynamic-filter-q-value');
        
        if (baseDecayTimeSlider && baseDecayTimeValue) {
            const currentBaseDecayTime = dynamicFilterSettings.baseDecayTime;
            baseDecayTimeSlider.value = currentBaseDecayTime;
            baseDecayTimeValue.textContent = currentBaseDecayTime.toFixed(1) + ' s';
        }
        
        if (keytrackedMultSlider && keytrackedMultValue) {
            const currentKeytrackedMult = dynamicFilterSettings.keytrackedMultiplier;
            keytrackedMultSlider.value = currentKeytrackedMult;
            keytrackedMultValue.textContent = currentKeytrackedMult.toFixed(0) + 'x';
        }
        
        if (velocityMinSlider && velocityMinValue) {
            const currentVelocityMin = dynamicFilterSettings.velocityMinMultiplier;
            velocityMinSlider.value = currentVelocityMin;
            velocityMinValue.textContent = currentVelocityMin.toFixed(1) + 'x';
        }
        
        if (velocityMaxSlider && velocityMaxValue) {
            const currentVelocityMax = dynamicFilterSettings.velocityMaxMultiplier;
            velocityMaxSlider.value = currentVelocityMax;
            velocityMaxValue.textContent = currentVelocityMax.toFixed(1) + 'x';
        }
        
        if (targetCutoffSlider && targetCutoffValue) {
            const currentTargetCutoff = dynamicFilterSettings.targetCutoffMultiplier;
            targetCutoffSlider.value = currentTargetCutoff;
            targetCutoffValue.textContent = currentTargetCutoff.toFixed(1) + 'x';
        }
        
        if (qSlider && qValue) {
            const currentQ = dynamicFilterSettings.Q;
            qSlider.value = currentQ;
            qValue.textContent = currentQ.toFixed(1);
        }
        
        popupFinal.classList.add('active');
    }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.dynamicFilterSettings = dynamicFilterSettings;
    window.initDynamicFilterSettings = initDynamicFilterSettings;
    window.openDynamicFilterSettings = openDynamicFilterSettings;
    window.setDynamicFilterSettings = setDynamicFilterSettings;
    window.getDynamicFilterSettings = getDynamicFilterSettings;
    window.resetDynamicFilterToDefaults = resetDynamicFilterToDefaults;
}


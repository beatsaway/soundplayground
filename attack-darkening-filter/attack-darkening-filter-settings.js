/**
 * Attack Darkening Filter Settings UI Module
 * Provides popup interface for adjusting attack darkening filter parameters
 */

// Attack darkening filter settings state
let attackDarkeningSettings = {
    enabled: true, // Default: ON
    openingTime: 0.1 // Time in seconds for filter to open from dark to bright (default: 100ms, min: 0.01s, max: 1.0s)
};

/**
 * Initialize attack darkening filter settings popup
 * Creates and manages the popup UI for attack darkening adjustments
 */
function initAttackDarkeningFilterSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('attack-darkening-filter-popup');
    if (!popup) {
        popup = createAttackDarkeningFilterPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupAttackDarkeningFilterControls();
}

/**
 * Create the attack darkening filter settings popup HTML
 */
function createAttackDarkeningFilterPopup() {
    const popup = document.createElement('div');
    popup.id = 'attack-darkening-filter-popup';
    popup.className = 'attack-darkening-filter-popup';
    popup.innerHTML = `
        <div class="attack-darkening-filter-popup-content">
            <div class="attack-darkening-filter-popup-header">
                <h2>Attack Darkening Filter Settings</h2>
                <button class="attack-darkening-filter-popup-close">×</button>
            </div>
            <div class="attack-darkening-filter-popup-body">
                <div class="attack-darkening-filter-setting">
                    <label style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" id="attack-darkening-filter-enabled" style="width: 18px; height: 18px; cursor: pointer;" checked>
                        <span>Enable Attack Darkening Filter</span>
                    </label>
                    <div class="attack-darkening-filter-description" style="margin-left: 30px;">When enabled, notes start darker (low-pass filtered) and gradually brighten over time, creating a natural attack character.</div>
                </div>
                
                <div class="attack-darkening-filter-setting">
                    <label>
                        <span>Opening Time</span>
                        <input type="range" id="attack-darkening-filter-opening-time" min="0.01" max="1.0" value="0.1" step="0.01">
                        <span class="attack-darkening-filter-value" id="attack-darkening-filter-opening-time-value">0.10 s</span>
                    </label>
                    <div class="attack-darkening-filter-description">Time for filter to open from dark to bright (0.01 to 1.0 seconds). Shorter = faster brightening. Default: 0.1 seconds (100ms)</div>
                </div>
                
                <div class="attack-darkening-filter-info">
                    <h3>How It Works</h3>
                    <p>This filter applies a per-note low-pass filter that starts with a low cutoff frequency (darker sound) when a note begins playing, then gradually opens up (higher cutoff, brighter sound) over time.</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                        <li>Per-note filtering: Each note has its own filter that tracks its age</li>
                        <li>Velocity-dependent: Louder notes start brighter than quieter notes</li>
                        <li>Keytracked: Higher notes naturally have higher cutoff frequencies</li>
                        <li>Works alongside spectral balance filter and dynamic filter</li>
                    </ul>
                    <p><strong>Relationship to Other Filters:</strong></p>
                    <ul>
                        <li><strong>Spectral Balance:</strong> Global high-shelf filter for overall spectral shaping (can be weakened by sustain pedal)</li>
                        <li><strong>Dynamic Filter:</strong> Global filter that closes as notes decay (opposite direction)</li>
                        <li><strong>Attack Darkening:</strong> Per-note filter that opens as notes age (this filter)</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .attack-darkening-filter-popup {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .attack-darkening-filter-popup.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .attack-darkening-filter-popup-content {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            color: #e0e0e0;
            font-family: 'Inter', sans-serif;
        }
        
        .attack-darkening-filter-popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .attack-darkening-filter-popup-header h2 {
            margin: 0;
            color: #fff;
            font-size: 24px;
        }
        
        .attack-darkening-filter-popup-close {
            background: none;
            border: none;
            color: #fff;
            font-size: 32px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            line-height: 32px;
            transition: color 0.2s;
        }
        
        .attack-darkening-filter-popup-close:hover {
            color: #ff6b6b;
        }
        
        .attack-darkening-filter-popup-body {
            padding: 20px;
        }
        
        .attack-darkening-filter-setting {
            margin-bottom: 24px;
        }
        
        .attack-darkening-filter-setting label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            color: #fff;
            font-weight: 500;
        }
        
        .attack-darkening-filter-setting label span:first-child {
            flex: 1;
        }
        
        .attack-darkening-filter-setting input[type="range"] {
            flex: 2;
            margin: 0 12px;
            accent-color: #4a9eff;
        }
        
        .attack-darkening-filter-value {
            min-width: 80px;
            text-align: right;
            color: #4a9eff;
            font-weight: 600;
        }
        
        .attack-darkening-filter-description {
            color: #b0b0b0;
            font-size: 13px;
            line-height: 1.5;
            margin-top: 4px;
        }
        
        .attack-darkening-filter-info {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .attack-darkening-filter-info h3 {
            color: #fff;
            margin-top: 0;
            margin-bottom: 12px;
        }
        
        .attack-darkening-filter-info p {
            color: #b0b0b0;
            line-height: 1.6;
            margin-bottom: 12px;
        }
        
        .attack-darkening-filter-info ul {
            color: #b0b0b0;
            line-height: 1.8;
            margin-left: 20px;
            margin-bottom: 12px;
        }
        
        .attack-darkening-filter-info li {
            margin-bottom: 6px;
        }
        
        .attack-darkening-filter-info strong {
            color: #fff;
        }
    `;
    document.head.appendChild(style);
    
    return popup;
}

/**
 * Setup event listeners for attack darkening filter controls
 */
function setupAttackDarkeningFilterControls() {
    const popup = document.getElementById('attack-darkening-filter-popup');
    if (!popup) return;
    
    // Close button
    const closeBtn = popup.querySelector('.attack-darkening-filter-popup-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }
    
    // Click outside to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
        }
    });
    
    // Enabled checkbox
    const enabledCheckbox = document.getElementById('attack-darkening-filter-enabled');
    if (enabledCheckbox) {
        enabledCheckbox.addEventListener('change', (e) => {
            attackDarkeningSettings.enabled = e.target.checked;
            updateAttackDarkeningFilterSettings();
        });
    }
    
    // Opening time slider
    const openingTimeSlider = document.getElementById('attack-darkening-filter-opening-time');
    const openingTimeValue = document.getElementById('attack-darkening-filter-opening-time-value');
    if (openingTimeSlider && openingTimeValue) {
        openingTimeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            attackDarkeningSettings.openingTime = value;
            openingTimeValue.textContent = value.toFixed(2) + ' s';
            updateAttackDarkeningFilterSettings();
        });
    }
}

/**
 * Update attack darkening filter settings and apply to filter
 */
function updateAttackDarkeningFilterSettings() {
    // Settings are already updated in attackDarkeningSettings object
    // The filter will read from window.attackDarkeningSettings when updating
    // No need to recreate filters, they'll pick up the new settings on next update
}

/**
 * Show attack darkening filter settings popup
 */
function showAttackDarkeningFilterSettings() {
    const popup = document.getElementById('attack-darkening-filter-popup');
    if (popup) {
        // Update UI to reflect current settings
        const enabledCheckbox = document.getElementById('attack-darkening-filter-enabled');
        const openingTimeSlider = document.getElementById('attack-darkening-filter-opening-time');
        const openingTimeValue = document.getElementById('attack-darkening-filter-opening-time-value');
        
        if (enabledCheckbox) {
            enabledCheckbox.checked = attackDarkeningSettings.enabled;
        }
        if (openingTimeSlider && openingTimeValue) {
            openingTimeSlider.value = attackDarkeningSettings.openingTime;
            openingTimeValue.textContent = attackDarkeningSettings.openingTime.toFixed(2) + ' s';
        }
        
        popup.classList.add('active');
    }
}

// Export settings to window
if (typeof window !== 'undefined') {
    window.attackDarkeningSettings = attackDarkeningSettings;
    window.initAttackDarkeningFilterSettings = initAttackDarkeningFilterSettings;
    window.showAttackDarkeningFilterSettings = showAttackDarkeningFilterSettings;
}

// Initialize on load
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAttackDarkeningFilterSettings);
} else {
    initAttackDarkeningFilterSettings();
}


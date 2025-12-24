/**
 * Attack Darkening Filter Settings UI Module
 * Provides popup interface for adjusting attack darkening filter parameters
 */

// Attack darkening filter settings state
let attackDarkeningSettings = {
    enabled: true, // Always enabled (checkbox removed)
    darkeningAmount: 0.7, // Cutoff multiplier (0.0-1.0): lower = darker. 0.7 means cutoff is 70% of normal (default: 0.7 = 70%)
    holdDuration: 0.2, // Duration in seconds before darkening starts - note plays normally during this time (default: 0.2s, min: 0.0s, max: 2.0s)
    darkeningDuration: 4.0 // Duration in seconds for transition from bright to dark (attack time) (default: 4.0s, min: 0.2s, max: 10.0s)
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
                    <label>
                        <span>Darkening Amount</span>
                        <input type="range" id="attack-darkening-filter-amount" min="0.1" max="1.0" value="0.7" step="0.05">
                        <span class="attack-darkening-filter-value" id="attack-darkening-filter-amount-value">70%</span>
                    </label>
                    <div class="attack-darkening-filter-description">Cutoff frequency multiplier (0.1 to 1.0). Lower = darker. 0.7 means cutoff is 70% of normal brightness. Default: 0.7 (70%)</div>
                </div>
                
                <div class="attack-darkening-filter-setting">
                    <label>
                        <span>Hold Duration</span>
                        <input type="range" id="attack-darkening-filter-hold" min="0.0" max="2.0" value="0.2" step="0.01">
                        <span class="attack-darkening-filter-value" id="attack-darkening-filter-hold-value">0.20 s</span>
                    </label>
                    <div class="attack-darkening-filter-description">Time before darkening starts (0.0 to 2.0 seconds). Note plays normally (bright) during this time, then darkens. Default: 0.2 seconds (200ms)</div>
                </div>
                
                <div class="attack-darkening-filter-setting">
                    <label>
                        <span>Darkening Attack Time</span>
                        <input type="range" id="attack-darkening-filter-duration" min="0.2" max="10.0" value="4.0" step="0.1">
                        <span class="attack-darkening-filter-value" id="attack-darkening-filter-duration-value">4.0 s</span>
                    </label>
                    <div class="attack-darkening-filter-description">Time to transition from bright to dark (0.2 to 10.0 seconds). Shorter = faster darkening. After transition completes, note stays dark. Default: 4.0 seconds</div>
                </div>
                
                <div class="attack-darkening-filter-info">
                    <h3>How It Works</h3>
                    <p>This filter applies a per-note low-pass filter with transitioning darkening. The note plays normally (bright) for the hold duration, then smoothly transitions to dark over the darkening attack time. Once dark, it stays dark for the note's duration.</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                        <li>Per-note filtering: Each note has its own filter that keeps it dark</li>
                        <li>Velocity-dependent: Louder notes start brighter than quieter notes (but still darker than unfiltered)</li>
                        <li>Keytracked: Higher notes naturally have higher cutoff frequencies</li>
                        <li>Works alongside spectral balance filter and dynamic filter</li>
                    </ul>
                    <p><strong>Relationship to Other Filters:</strong></p>
                    <ul>
                        <li><strong>Spectral Balance:</strong> Global high-shelf filter for overall spectral shaping (can be weakened by sustain pedal)</li>
                        <li><strong>Dynamic Filter:</strong> Global filter that closes as notes decay</li>
                        <li><strong>Attack Darkening:</strong> Per-note filter that darkens notes at attack and keeps them dark for a configurable duration (this filter)</li>
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
    
    // Darkening amount slider
    const amountSlider = document.getElementById('attack-darkening-filter-amount');
    const amountValue = document.getElementById('attack-darkening-filter-amount-value');
    if (amountSlider && amountValue) {
        amountSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            attackDarkeningSettings.darkeningAmount = value;
            amountValue.textContent = Math.round(value * 100) + '%';
            updateAttackDarkeningFilterSettings();
        });
    }
    
    // Hold duration slider
    const holdSlider = document.getElementById('attack-darkening-filter-hold');
    const holdValue = document.getElementById('attack-darkening-filter-hold-value');
    if (holdSlider && holdValue) {
        holdSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            attackDarkeningSettings.holdDuration = value;
            holdValue.textContent = value.toFixed(2) + ' s';
            updateAttackDarkeningFilterSettings();
        });
    }
    
    // Darkening duration slider
    const durationSlider = document.getElementById('attack-darkening-filter-duration');
    const durationValue = document.getElementById('attack-darkening-filter-duration-value');
    if (durationSlider && durationValue) {
        durationSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            attackDarkeningSettings.darkeningDuration = value;
            durationValue.textContent = value.toFixed(2) + ' s';
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
        const amountSlider = document.getElementById('attack-darkening-filter-amount');
        const amountValue = document.getElementById('attack-darkening-filter-amount-value');
        const holdSlider = document.getElementById('attack-darkening-filter-hold');
        const holdValue = document.getElementById('attack-darkening-filter-hold-value');
        const durationSlider = document.getElementById('attack-darkening-filter-duration');
        const durationValue = document.getElementById('attack-darkening-filter-duration-value');
        
        if (amountSlider && amountValue) {
            amountSlider.value = attackDarkeningSettings.darkeningAmount;
            amountValue.textContent = Math.round(attackDarkeningSettings.darkeningAmount * 100) + '%';
        }
        if (holdSlider && holdValue) {
            holdSlider.value = attackDarkeningSettings.holdDuration;
            holdValue.textContent = attackDarkeningSettings.holdDuration.toFixed(2) + ' s';
        }
        if (durationSlider && durationValue) {
            durationSlider.value = attackDarkeningSettings.darkeningDuration;
            durationValue.textContent = attackDarkeningSettings.darkeningDuration.toFixed(2) + ' s';
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


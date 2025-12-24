/**
 * Keyboard Visual Settings Module
 * Manages the settings UI for keyboard visual effects
 */

(function() {
    'use strict';
    
    let settingsModal = null;
    let settingsPanel = null;
    
    /**
     * Initialize the keyboard visual settings UI
     */
    window.initKeyboardVisualSettings = function() {
        // Create modal and panel if they don't exist
        if (!document.getElementById('keyboard-visual-modal')) {
            createSettingsUI();
        }
        
        setupEventListeners();
        updateUI();
        
        // Initialize sub-popups
        initKeyMovementSettings();
        initKeyLabelsSettings();
    };
    
    /**
     * Create the settings UI elements
     */
    function createSettingsUI() {
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'keyboard-visual-modal';
        modal.className = 'keyboard-visual-modal';
        modal.style.display = 'none';
        
        // Create panel
        const panel = document.createElement('div');
        panel.id = 'keyboard-visual-panel';
        panel.className = 'keyboard-visual-panel';
        
        panel.innerHTML = `
            <button class="keyboard-visual-close" id="keyboard-visual-close">×</button>
            <h2>🎹 Keyboard Visual Settings</h2>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-highlight">
                    <div>
                        <strong>Yellow Highlight on Press</strong>
                        <div class="setting-description">
                            Tint keys yellow when pressed for visual feedback.
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-movement" checked>
                    <div>
                        <strong>Key Up/Down Movement</strong>
                        <button class="keyboard-visual-settings-btn" id="key-movement-settings-btn">[...]</button>
                        <div class="setting-description">
                            Move keys down when pressed, up when released.
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-labels" checked>
                    <div>
                        <strong>Key Labels</strong>
                        <button class="keyboard-visual-settings-btn" id="key-labels-settings-btn">[...]</button>
                        <div class="setting-description">
                            Show note names on keys (A0, C4, etc.).
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-midi-input" checked>
                    <div>
                        <strong>MIDI Input</strong>
                        <div class="setting-description">
                            Enable/disable MIDI controller input. When disabled, MIDI controllers won't trigger notes.
                        </div>
                    </div>
                </label>
            </div>
        `;
        
        modal.appendChild(panel);
        document.body.appendChild(modal);
        
        settingsModal = modal;
        settingsPanel = panel;
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('keyboard-visual-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                    settingsModal.classList.remove('active');
                }
            });
        }
        
        // Close on modal background click
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                    settingsModal.classList.remove('active');
                }
            });
        }
        
        // Key highlight toggle
        const highlightCheckbox = document.getElementById('enable-key-highlight');
        if (highlightCheckbox) {
            highlightCheckbox.addEventListener('change', (e) => {
                window.keyHighlightSettings.enabled = e.target.checked;
                updateUI();
            });
        }
        
        // Key movement toggle
        const movementCheckbox = document.getElementById('enable-key-movement');
        if (movementCheckbox) {
            movementCheckbox.addEventListener('change', (e) => {
                window.keyMovementSettings.enabled = e.target.checked;
                updateUI();
            });
        }
        
        // Key movement settings button
        const movementSettingsBtn = document.getElementById('key-movement-settings-btn');
        if (movementSettingsBtn) {
            movementSettingsBtn.addEventListener('click', () => {
                openKeyMovementSettings();
            });
        }
        
        // Key labels toggle
        const labelsCheckbox = document.getElementById('enable-key-labels');
        if (labelsCheckbox) {
            labelsCheckbox.addEventListener('change', (e) => {
                window.keyLabelSettings.enabled = e.target.checked;
                if (window.updateAllKeyLabels) {
                    window.updateAllKeyLabels();
                }
                updateUI();
            });
        }
        
        // Key labels settings button
        const labelsSettingsBtn = document.getElementById('key-labels-settings-btn');
        if (labelsSettingsBtn) {
            labelsSettingsBtn.addEventListener('click', () => {
                openKeyLabelsSettings();
            });
        }
        
        // MIDI input toggle
        const midiInputCheckbox = document.getElementById('enable-midi-input');
        if (midiInputCheckbox) {
            midiInputCheckbox.addEventListener('change', (e) => {
                if (window.enableMidiInput && window.disableMidiInput) {
                    if (e.target.checked) {
                        window.enableMidiInput();
                    } else {
                        window.disableMidiInput();
                    }
                }
                updateUI();
            });
        }
    }
    
    /**
     * Initialize key movement settings popup
     */
    function initKeyMovementSettings() {
        let popup = document.getElementById('key-movement-popup');
        if (!popup) {
            popup = createKeyMovementPopup();
            document.body.appendChild(popup);
        }
        setupKeyMovementControls();
    }
    
    /**
     * Create key movement settings popup
     */
    function createKeyMovementPopup() {
        const popup = document.createElement('div');
        popup.id = 'key-movement-popup';
        popup.className = 'key-movement-popup';
        popup.innerHTML = `
            <div class="key-movement-popup-content">
                <div class="key-movement-popup-header">
                    <h2>Key Movement Settings</h2>
                    <button class="key-movement-popup-close">×</button>
                </div>
                <div class="key-movement-popup-body">
                    <div class="key-movement-setting">
                        <label>
                            <span>Animation Style</span>
                            <select id="key-movement-style">
                                <option value="none">No Movement</option>
                                <option value="instant" selected>Instant Position Change</option>
                                <option value="animated">Animated Movement</option>
                            </select>
                        </label>
                        <div class="key-movement-description">Choose how keys move when pressed/released. Instant = immediate movement, Animated = smooth transition.</div>
                    </div>
                    
                    <div class="key-movement-setting">
                        <label>
                            <span>Press Depth (%)</span>
                            <input type="range" id="key-movement-depth" min="0" max="100" value="70" step="1">
                            <span class="key-movement-value" id="key-movement-depth-value">70%</span>
                        </label>
                        <div class="key-movement-description">How far down keys move when pressed (percentage of key height). Default: 70%</div>
                    </div>
                    
                    <div class="key-movement-setting" id="key-movement-animation-duration-container" style="display: none;">
                        <label>
                            <span>Animation Duration (ms)</span>
                            <input type="range" id="key-movement-duration" min="10" max="500" value="100" step="10">
                            <span class="key-movement-value" id="key-movement-duration-value">100 ms</span>
                        </label>
                        <div class="key-movement-description">Duration of smooth animation when keys move. Only applies to "Animated Movement" style.</div>
                    </div>
                    
                    <div class="key-movement-popup-footer">
                        <button class="key-movement-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('key-movement-styles')) {
            const style = document.createElement('style');
            style.id = 'key-movement-styles';
            style.textContent = `
                .key-movement-popup {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    z-index: 3001;
                    align-items: center;
                    justify-content: center;
                }
                .key-movement-popup.active {
                    display: flex;
                }
                .key-movement-popup-content {
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
                .key-movement-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .key-movement-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .key-movement-popup-close {
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
                .key-movement-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .key-movement-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .key-movement-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .key-movement-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .key-movement-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .key-movement-setting select {
                    flex: 1;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    cursor: pointer;
                }
                .key-movement-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                .key-movement-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .key-movement-setting input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                .key-movement-value {
                    min-width: 60px;
                    text-align: right;
                    color: #4a9eff;
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                }
                .key-movement-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
                .key-movement-popup-footer {
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .key-movement-reset {
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
                .key-movement-reset:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `;
            document.head.appendChild(style);
        }
        
        return popup;
    }
    
    /**
     * Setup key movement controls
     */
    function setupKeyMovementControls() {
        const popup = document.getElementById('key-movement-popup');
        if (!popup) return;
        
        const closeBtn = popup.querySelector('.key-movement-popup-close');
        const resetBtn = popup.querySelector('.key-movement-reset');
        const styleSelect = document.getElementById('key-movement-style');
        const depthSlider = document.getElementById('key-movement-depth');
        const depthValue = document.getElementById('key-movement-depth-value');
        const durationSlider = document.getElementById('key-movement-duration');
        const durationValue = document.getElementById('key-movement-duration-value');
        const durationContainer = document.getElementById('key-movement-animation-duration-container');
        
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
                resetKeyMovementToDefaults();
            });
        }
        
        // Animation style select
        if (styleSelect) {
            styleSelect.addEventListener('change', (e) => {
                window.keyMovementSettings.animationStyle = e.target.value;
                // Show/hide duration slider based on style
                if (durationContainer) {
                    durationContainer.style.display = e.target.value === 'animated' ? 'flex' : 'none';
                }
            });
        }
        
        // Press depth slider
        if (depthSlider && depthValue) {
            const currentDepth = (window.keyMovementSettings.pressDepth || 0.7) * 100;
            depthSlider.value = Math.round(currentDepth);
            depthValue.textContent = Math.round(currentDepth) + '%';
            
            depthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                depthValue.textContent = Math.round(value) + '%';
                window.keyMovementSettings.pressDepth = value / 100;
            });
        }
        
        // Animation duration slider
        if (durationSlider && durationValue) {
            const currentDuration = (window.keyMovementSettings.animationDuration || 0.1) * 1000;
            durationSlider.value = Math.round(currentDuration);
            durationValue.textContent = Math.round(currentDuration) + ' ms';
            
            durationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                durationValue.textContent = Math.round(value) + ' ms';
                window.keyMovementSettings.animationDuration = value / 1000;
            });
        }
    }
    
    /**
     * Open key movement settings
     */
    function openKeyMovementSettings() {
        const popup = document.getElementById('key-movement-popup');
        if (popup) {
            // Sync UI with current settings
            const styleSelect = document.getElementById('key-movement-style');
            const depthSlider = document.getElementById('key-movement-depth');
            const depthValue = document.getElementById('key-movement-depth-value');
            const durationSlider = document.getElementById('key-movement-duration');
            const durationValue = document.getElementById('key-movement-duration-value');
            const durationContainer = document.getElementById('key-movement-animation-duration-container');
            
            if (styleSelect) {
                styleSelect.value = window.keyMovementSettings.animationStyle || 'instant';
                if (durationContainer) {
                    durationContainer.style.display = styleSelect.value === 'animated' ? 'flex' : 'none';
                }
            }
            
            if (depthSlider && depthValue) {
                const depth = (window.keyMovementSettings.pressDepth || 0.7) * 100;
                depthSlider.value = Math.round(depth);
                depthValue.textContent = Math.round(depth) + '%';
            }
            
            if (durationSlider && durationValue) {
                const duration = (window.keyMovementSettings.animationDuration || 0.1) * 1000;
                durationSlider.value = Math.round(duration);
                durationValue.textContent = Math.round(duration) + ' ms';
            }
            
            popup.classList.add('active');
        }
    }
    
    /**
     * Reset key movement to defaults
     */
    function resetKeyMovementToDefaults() {
        window.keyMovementSettings.animationStyle = 'instant';
        window.keyMovementSettings.pressDepth = 0.7;
        window.keyMovementSettings.animationDuration = 0.1;
        
        // Update UI
        const styleSelect = document.getElementById('key-movement-style');
        const depthSlider = document.getElementById('key-movement-depth');
        const depthValue = document.getElementById('key-movement-depth-value');
        const durationSlider = document.getElementById('key-movement-duration');
        const durationValue = document.getElementById('key-movement-duration-value');
        const durationContainer = document.getElementById('key-movement-animation-duration-container');
        
        if (styleSelect) styleSelect.value = 'instant';
        if (depthSlider) depthSlider.value = 70;
        if (depthValue) depthValue.textContent = '70%';
        if (durationSlider) durationSlider.value = 100;
        if (durationValue) durationValue.textContent = '100 ms';
        if (durationContainer) durationContainer.style.display = 'none';
    }
    
    /**
     * Initialize key labels settings popup
     */
    function initKeyLabelsSettings() {
        let popup = document.getElementById('key-labels-popup');
        if (!popup) {
            popup = createKeyLabelsPopup();
            document.body.appendChild(popup);
        }
        setupKeyLabelsControls();
    }
    
    /**
     * Create key labels settings popup
     */
    function createKeyLabelsPopup() {
        const popup = document.createElement('div');
        popup.id = 'key-labels-popup';
        popup.className = 'key-labels-popup';
        popup.innerHTML = `
            <div class="key-labels-popup-content">
                <div class="key-labels-popup-header">
                    <h2>Key Labels Settings</h2>
                    <button class="key-labels-popup-close">×</button>
                </div>
                <div class="key-labels-popup-body">
                    <div class="key-labels-setting">
                        <label>
                            <span>Visibility Mode</span>
                            <select id="key-labels-visibility">
                                <option value="pressed" selected>Show Only When Pressed</option>
                                <option value="always">Always Visible</option>
                            </select>
                        </label>
                        <div class="key-labels-description">Choose when labels are visible. "Show Only When Pressed" = labels appear when keys are pressed (default). "Always Visible" = labels always shown.</div>
                    </div>
                    
                    <div class="key-labels-popup-footer">
                        <button class="key-labels-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles (reuse similar styles from key-movement)
        if (!document.getElementById('key-labels-styles')) {
            const style = document.createElement('style');
            style.id = 'key-labels-styles';
            style.textContent = `
                .key-labels-popup {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    z-index: 3001;
                    align-items: center;
                    justify-content: center;
                }
                .key-labels-popup.active {
                    display: flex;
                }
                .key-labels-popup-content {
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
                .key-labels-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .key-labels-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .key-labels-popup-close {
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
                .key-labels-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .key-labels-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .key-labels-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .key-labels-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .key-labels-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .key-labels-setting select {
                    flex: 1;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    cursor: pointer;
                }
                .key-labels-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
                .key-labels-popup-footer {
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .key-labels-reset {
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
                .key-labels-reset:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `;
            document.head.appendChild(style);
        }
        
        return popup;
    }
    
    /**
     * Setup key labels controls
     */
    function setupKeyLabelsControls() {
        const popup = document.getElementById('key-labels-popup');
        if (!popup) return;
        
        const closeBtn = popup.querySelector('.key-labels-popup-close');
        const resetBtn = popup.querySelector('.key-labels-reset');
        const visibilitySelect = document.getElementById('key-labels-visibility');
        
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
                resetKeyLabelsToDefaults();
            });
        }
        
        // Visibility mode select
        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                window.keyLabelSettings.showOnlyWhenPressed = (mode === 'pressed');
                window.keyLabelSettings.alwaysVisible = (mode === 'always');
                
                if (window.updateAllKeyLabels) {
                    window.updateAllKeyLabels();
                }
            });
        }
    }
    
    /**
     * Open key labels settings
     */
    function openKeyLabelsSettings() {
        const popup = document.getElementById('key-labels-popup');
        if (popup) {
            // Sync UI with current settings
            const visibilitySelect = document.getElementById('key-labels-visibility');
            
            if (visibilitySelect) {
                const mode = window.keyLabelSettings.showOnlyWhenPressed ? 'pressed' : 'always';
                visibilitySelect.value = mode;
            }
            
            popup.classList.add('active');
        }
    }
    
    /**
     * Reset key labels to defaults
     */
    function resetKeyLabelsToDefaults() {
        window.keyLabelSettings.showOnlyWhenPressed = true;
        window.keyLabelSettings.alwaysVisible = false;
        
        // Update UI
        const visibilitySelect = document.getElementById('key-labels-visibility');
        if (visibilitySelect) {
            visibilitySelect.value = 'pressed';
        }
        
        if (window.updateAllKeyLabels) {
            window.updateAllKeyLabels();
        }
    }
    
    /**
     * Update UI to reflect current settings
     */
    function updateUI() {
        const highlightCheckbox = document.getElementById('enable-key-highlight');
        const movementCheckbox = document.getElementById('enable-key-movement');
        const labelsCheckbox = document.getElementById('enable-key-labels');
        const midiInputCheckbox = document.getElementById('enable-midi-input');
        
        if (highlightCheckbox) {
            highlightCheckbox.checked = window.keyHighlightSettings.enabled;
        }
        if (movementCheckbox) {
            movementCheckbox.checked = window.keyMovementSettings.enabled;
        }
        if (labelsCheckbox) {
            labelsCheckbox.checked = window.keyLabelSettings.enabled;
        }
        if (midiInputCheckbox && window.isMidiInputEnabled) {
            midiInputCheckbox.checked = window.isMidiInputEnabled();
        }
    }
    
    /**
     * Show the settings modal
     */
    window.showKeyboardVisualSettings = function() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            settingsModal.classList.add('active');
            updateUI();
        } else {
            // Initialize if not already done
            createSettingsUI();
            setupEventListeners();
            if (settingsModal) {
                settingsModal.style.display = 'flex';
                settingsModal.classList.add('active');
                updateUI();
            }
        }
    };
    
    console.log('Keyboard Visual Settings module loaded');
})();

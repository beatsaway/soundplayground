/**
 * Physics Settings Module
 * Manages the settings UI and state for physics-based features
 * Based on research4 findings
 */

// Physics settings state (global)
const physicsSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: false,
    sustainDecay: true,
    advancedTimbre: false, // Custom waveform generation (more CPU intensive)
    velocityAttack: true, // Velocity-dependent attack time
    timeVaryingBrightness: false, // Time-varying harmonic content
    dynamicFilter: true, // Dynamic low-pass filter that closes as notes decay
    frequencyCompensation: true, // Equal-loudness contour compensation (CPU: Medium impact)
    frequencyEnvelope: false // Pitch modulation (initial drift, vibrato, release drift) - CPU: Medium impact
};

// Default settings (for reset)
const defaultSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: false,
    sustainDecay: true,
    advancedTimbre: false,
    velocityAttack: true,
    timeVaryingBrightness: false,
    dynamicFilter: true,
    frequencyCompensation: true,
    frequencyEnvelope: false
};

// Preset configurations
const settingsPresets = {
    defaults: defaultSettings,
    all: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: true,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true
    },
    none: {
        velocityTimbre: false,
        twoStageDecay: false,
        pedalCoupling: false,
        sustainDecay: false,
        advancedTimbre: false,
        velocityAttack: false,
        timeVaryingBrightness: false,
        dynamicFilter: false,
        frequencyCompensation: false,
        frequencyEnvelope: false
    },
    essential: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: false,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: false,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: false
    },
    performance: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: false,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: false,
        dynamicFilter: true,
        frequencyCompensation: false, // Disabled for performance
        frequencyEnvelope: false // Disabled for performance
    },
    realistic: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true
    }
};

/**
 * Initialize the settings modal UI
 * Sets up event listeners and syncs UI with settings state
 */
function initPhysicsSettings() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const settingsClose = document.getElementById('settings-close');
    
    // Setup navbar/tab switching
    const navTabs = document.querySelectorAll('.nav-tab');
    const categories = document.querySelectorAll('.settings-category');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const categoryId = tab.getAttribute('data-category');
            
            // Remove active class from all tabs and categories
            navTabs.forEach(t => t.classList.remove('active'));
            categories.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding category
            tab.classList.add('active');
            const category = document.getElementById(`category-${categoryId}`);
            if (category) {
                category.classList.add('active');
            }
        });
    });
    
    // Setup preset dropdown
    const presetButton = document.getElementById('preset-button');
    const presetMenu = document.getElementById('preset-menu');
    const presetItems = document.querySelectorAll('.settings-preset-item[data-preset]');
    
    if (presetButton && presetMenu) {
        // Toggle menu on button click
        presetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            presetMenu.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!presetButton.contains(e.target) && !presetMenu.contains(e.target)) {
                presetMenu.classList.remove('show');
            }
        });
        
        // Handle preset selection
        presetItems.forEach(item => {
            item.addEventListener('click', () => {
                const presetName = item.getAttribute('data-preset');
                applyPreset(presetName);
                presetMenu.classList.remove('show');
            });
        });
    }
    
    const enableVelocityTimbre = document.getElementById('enable-velocity-timbre');
    const enableTwoStageDecay = document.getElementById('enable-two-stage-decay');
    const enablePedalCoupling = document.getElementById('enable-pedal-coupling');
    const enableSustainDecay = document.getElementById('enable-sustain-decay');
    const enableAdvancedTimbre = document.getElementById('enable-advanced-timbre');
    const enableVelocityAttack = document.getElementById('enable-velocity-attack');
    const enableTimeVaryingBrightness = document.getElementById('enable-time-varying-brightness');
    const enableDynamicFilter = document.getElementById('enable-dynamic-filter');
    const enableFrequencyCompensation = document.getElementById('enable-frequency-compensation');
    const enableFrequencyEnvelope = document.getElementById('enable-frequency-envelope');
    
    /**
     * Sync checkboxes with current settings state
     */
    function syncCheckboxes() {
        if (enableVelocityTimbre) enableVelocityTimbre.checked = physicsSettings.velocityTimbre;
        if (enableTwoStageDecay) enableTwoStageDecay.checked = physicsSettings.twoStageDecay;
        if (enablePedalCoupling) enablePedalCoupling.checked = physicsSettings.pedalCoupling;
        if (enableSustainDecay) enableSustainDecay.checked = physicsSettings.sustainDecay;
        if (enableAdvancedTimbre) enableAdvancedTimbre.checked = physicsSettings.advancedTimbre;
        if (enableVelocityAttack) enableVelocityAttack.checked = physicsSettings.velocityAttack;
        if (enableTimeVaryingBrightness) enableTimeVaryingBrightness.checked = physicsSettings.timeVaryingBrightness;
        if (enableDynamicFilter) enableDynamicFilter.checked = physicsSettings.dynamicFilter;
        if (enableFrequencyCompensation) enableFrequencyCompensation.checked = physicsSettings.frequencyCompensation;
        if (enableFrequencyEnvelope) enableFrequencyEnvelope.checked = physicsSettings.frequencyEnvelope;
    }
    
    /**
     * Apply a preset configuration
     */
    function applyPreset(presetName) {
        const preset = settingsPresets[presetName];
        if (!preset) return;
        
        // Apply preset to settings
        Object.keys(preset).forEach(key => {
            physicsSettings[key] = preset[key];
        });
        
        // Update UI checkboxes
        syncCheckboxes();
    }

    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            settingsModal.classList.add('active');
            // Sync checkboxes with current settings
            syncCheckboxes();
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
    }

    if (enableVelocityTimbre) {
        enableVelocityTimbre.addEventListener('change', (e) => {
            physicsSettings.velocityTimbre = e.target.checked;
        });
    }

    if (enableTwoStageDecay) {
        enableTwoStageDecay.addEventListener('change', (e) => {
            physicsSettings.twoStageDecay = e.target.checked;
        });
    }

    if (enablePedalCoupling) {
        enablePedalCoupling.addEventListener('change', (e) => {
            physicsSettings.pedalCoupling = e.target.checked;
        });
    }

    if (enableSustainDecay) {
        enableSustainDecay.addEventListener('change', (e) => {
            physicsSettings.sustainDecay = e.target.checked;
        });
    }

    if (enableAdvancedTimbre) {
        enableAdvancedTimbre.addEventListener('change', (e) => {
            physicsSettings.advancedTimbre = e.target.checked;
        });
    }

    if (enableVelocityAttack) {
        enableVelocityAttack.addEventListener('change', (e) => {
            physicsSettings.velocityAttack = e.target.checked;
        });
    }

    if (enableTimeVaryingBrightness) {
        enableTimeVaryingBrightness.addEventListener('change', (e) => {
            physicsSettings.timeVaryingBrightness = e.target.checked;
        });
    }

    if (enableDynamicFilter) {
        enableDynamicFilter.addEventListener('change', (e) => {
            physicsSettings.dynamicFilter = e.target.checked;
        });
    }

    if (enableFrequencyCompensation) {
        enableFrequencyCompensation.addEventListener('change', (e) => {
            physicsSettings.frequencyCompensation = e.target.checked;
        });
    }

    if (enableFrequencyEnvelope) {
        enableFrequencyEnvelope.addEventListener('change', (e) => {
            physicsSettings.frequencyEnvelope = e.target.checked;
            // Note: Full per-voice frequency modulation requires synth reinitialization
            // For now, modulation is tracked but requires custom architecture for full implementation
        });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.physicsSettings = physicsSettings;
    window.initPhysicsSettings = initPhysicsSettings;
}


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
    dynamicFilter: true // Dynamic low-pass filter that closes as notes decay
};

/**
 * Initialize the settings modal UI
 * Sets up event listeners and syncs UI with settings state
 */
function initPhysicsSettings() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const settingsClose = document.getElementById('settings-close');
    const enableVelocityTimbre = document.getElementById('enable-velocity-timbre');
    const enableTwoStageDecay = document.getElementById('enable-two-stage-decay');
    const enablePedalCoupling = document.getElementById('enable-pedal-coupling');
    const enableSustainDecay = document.getElementById('enable-sustain-decay');
    const enableAdvancedTimbre = document.getElementById('enable-advanced-timbre');
    const enableVelocityAttack = document.getElementById('enable-velocity-attack');
    const enableTimeVaryingBrightness = document.getElementById('enable-time-varying-brightness');
    const enableDynamicFilter = document.getElementById('enable-dynamic-filter');

    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            settingsModal.classList.add('active');
            // Sync checkboxes with current settings
            enableVelocityTimbre.checked = physicsSettings.velocityTimbre;
            enableTwoStageDecay.checked = physicsSettings.twoStageDecay;
            enablePedalCoupling.checked = physicsSettings.pedalCoupling;
            enableSustainDecay.checked = physicsSettings.sustainDecay;
            enableAdvancedTimbre.checked = physicsSettings.advancedTimbre;
            enableVelocityAttack.checked = physicsSettings.velocityAttack;
            enableTimeVaryingBrightness.checked = physicsSettings.timeVaryingBrightness;
            if (enableDynamicFilter) enableDynamicFilter.checked = physicsSettings.dynamicFilter;
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
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.physicsSettings = physicsSettings;
    window.initPhysicsSettings = initPhysicsSettings;
}


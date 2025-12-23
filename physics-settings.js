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
    sustainDecay: true
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

    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            settingsModal.classList.add('active');
            // Sync checkboxes with current settings
            enableVelocityTimbre.checked = physicsSettings.velocityTimbre;
            enableTwoStageDecay.checked = physicsSettings.twoStageDecay;
            enablePedalCoupling.checked = physicsSettings.pedalCoupling;
            enableSustainDecay.checked = physicsSettings.sustainDecay;
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
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.physicsSettings = physicsSettings;
    window.initPhysicsSettings = initPhysicsSettings;
}


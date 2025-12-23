/**
 * Physics Settings Module
 * Manages the settings UI and state for physics-based features
 * Based on research4 findings
 */

// Physics settings state (global)
const physicsSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: true,
    sustainDecay: true,
    advancedTimbre: true, // Custom waveform generation (more CPU intensive)
    velocityAttack: true, // Velocity-dependent attack time
    timeVaryingBrightness: true, // Time-varying harmonic content
    dynamicFilter: true, // Dynamic low-pass filter that closes as notes decay
    frequencyCompensation: true, // Equal-loudness contour compensation (CPU: Medium impact)
    frequencyEnvelope: true, // Pitch modulation (initial drift, vibrato, release drift) - CPU: Medium impact
    binauralReverb: true, // Binaural 3D spatial reverb - CPU: High impact
    fakeBinaural: true, // Fake binaural mono-to-stereo processing - CPU: Low-Medium impact
    spectralBalance: false, // Pink-noise-like EQ filter for final output - CPU: Low impact
    // Priority 1: Critical Realism
    inharmonicity: true, // Pitch-dependent partial sharpening - CRITICAL for realism
    multiStringUnison: true, // Multiple detuned oscillators per note - HIGH impact (ON by default)
    // Priority 2: High Impact
    attackNoise: false, // Hammer strike noise component (OFF by default)
    oddEvenHarmonicBalance: true, // Explicit 2:1 ratio for odd:even harmonics
    pitchHarmonicRolloff: true, // Pitch-dependent harmonic content (bass has more harmonics)
    // Priority 3: Polish & Detail
    perPartialDecay: true, // Higher partials decay faster
    releaseTransient: false // Key-off sound (damper lift-off) (OFF by default)
};

// Default settings (for reset)
const defaultSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: true,
    sustainDecay: true,
    advancedTimbre: true,
    velocityAttack: true,
    timeVaryingBrightness: true,
    dynamicFilter: true,
    frequencyCompensation: true,
    frequencyEnvelope: true,
    binauralReverb: true, // Binaural (3D Spatial) mode enabled
    fakeBinaural: true,
    spectralBalance: false, // OFF by default
    inharmonicity: true,
    multiStringUnison: true, // ON by default
    attackNoise: false, // OFF by default
    oddEvenHarmonicBalance: true,
    pitchHarmonicRolloff: true,
    perPartialDecay: true,
    releaseTransient: false // OFF by default
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
        frequencyEnvelope: true,
        binauralReverb: true,
        fakeBinaural: true,
        spectralBalance: true,
        inharmonicity: true,
        multiStringUnison: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
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
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: false,
        multiStringUnison: false,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
    },
    // CPU-based presets (5 options)
    maximum: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: true,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true,
        binauralReverb: true,
        fakeBinaural: true,
        spectralBalance: true,
        inharmonicity: true,
        multiStringUnison: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
    },
    high: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true,
        binauralReverb: false,
        fakeBinaural: true,
        spectralBalance: true,
        inharmonicity: true,
        multiStringUnison: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
    },
    default: defaultSettings, // Uses the default settings defined above
    low: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: false,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: false,
        dynamicFilter: true,
        frequencyCompensation: false,
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: true,
        multiStringUnison: false,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
    },
    minimal: {
        velocityTimbre: true,
        twoStageDecay: false,
        pedalCoupling: false,
        sustainDecay: false,
        advancedTimbre: false,
        velocityAttack: false,
        timeVaryingBrightness: false,
        dynamicFilter: false,
        frequencyCompensation: false,
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: false,
        multiStringUnison: false,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
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
    const presetSelect = document.getElementById('preset-select');
    
    if (presetSelect) {
        // Handle preset selection
        presetSelect.addEventListener('change', (e) => {
            const presetName = e.target.value;
            if (presetName) {
                applyPreset(presetName);
                // Reset select to show placeholder
                e.target.value = '';
            }
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
    const enableBinauralReverb = document.getElementById('enable-binaural-reverb');
    const enableFakeBinaural = document.getElementById('enable-fake-binaural');
    const enableSpectralBalance = document.getElementById('enable-spectral-balance');
    // Priority 1: Critical Realism
    const enableInharmonicity = document.getElementById('enable-inharmonicity');
    const enableMultiStringUnison = document.getElementById('enable-multi-string-unison');
    // Priority 2: High Impact
    const enableAttackNoise = document.getElementById('enable-attack-noise');
    const enableOddEvenHarmonicBalance = document.getElementById('enable-odd-even-harmonic-balance');
    const enablePitchHarmonicRolloff = document.getElementById('enable-pitch-harmonic-rolloff');
    // Priority 3: Polish & Detail
    const enablePerPartialDecay = document.getElementById('enable-per-partial-decay');
    const enableReleaseTransient = document.getElementById('enable-release-transient');
    
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
        if (enableBinauralReverb) enableBinauralReverb.checked = physicsSettings.binauralReverb;
        if (enableFakeBinaural) enableFakeBinaural.checked = physicsSettings.fakeBinaural;
        if (enableSpectralBalance) enableSpectralBalance.checked = physicsSettings.spectralBalance;
        if (enableInharmonicity) enableInharmonicity.checked = physicsSettings.inharmonicity;
        if (enableMultiStringUnison) enableMultiStringUnison.checked = physicsSettings.multiStringUnison;
        if (enableAttackNoise) enableAttackNoise.checked = physicsSettings.attackNoise;
        if (enableOddEvenHarmonicBalance) enableOddEvenHarmonicBalance.checked = physicsSettings.oddEvenHarmonicBalance;
        if (enablePitchHarmonicRolloff) enablePitchHarmonicRolloff.checked = physicsSettings.pitchHarmonicRolloff;
        if (enablePerPartialDecay) enablePerPartialDecay.checked = physicsSettings.perPartialDecay;
        if (enableReleaseTransient) enableReleaseTransient.checked = physicsSettings.releaseTransient;
    }
    
    /**
     * Apply a preset configuration
     */
    function applyPreset(presetName) {
        const preset = settingsPresets[presetName];
        if (!preset) return;
        
        // Store old values to detect changes
        const oldBinauralReverb = physicsSettings.binauralReverb;
        const oldFakeBinaural = physicsSettings.fakeBinaural;
        
        // Apply preset to settings
        Object.keys(preset).forEach(key => {
            physicsSettings[key] = preset[key];
        });
        
        // Update UI checkboxes
        syncCheckboxes();
        
        // Trigger activation for binaural reverb if it was enabled
        if (physicsSettings.binauralReverb && !oldBinauralReverb) {
            // Update binaural reverb enabled state
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = true;
                // Initialize reverb if enabling
                if (window.initializeBinauralReverb) {
                    window.initializeBinauralReverb();
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        } else if (!physicsSettings.binauralReverb && oldBinauralReverb) {
            // Disconnect reverb if disabling
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        }
        
        // Trigger activation for fake binaural if it was enabled
        if (physicsSettings.fakeBinaural && !oldFakeBinaural) {
            // Update fake binaural enabled state
            if (window.fakeBinauralSettings) {
                window.fakeBinauralSettings.enabled = true;
                // Initialize fake binaural if enabling
                if (window.initializeFakeBinaural) {
                    window.initializeFakeBinaural();
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        } else if (!physicsSettings.fakeBinaural && oldFakeBinaural) {
            // Reconnect audio chain if disabling
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        }
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

    if (enableBinauralReverb) {
        enableBinauralReverb.addEventListener('change', (e) => {
            physicsSettings.binauralReverb = e.target.checked;
            // Update binaural reverb enabled state
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = e.target.checked;
                if (e.target.checked) {
                    // Initialize reverb if enabling
                    if (window.initializeBinauralReverb) {
                        window.initializeBinauralReverb();
                    }
                    // Reconnect audio chain
                    if (window.reconnectAudioChain) {
                        window.reconnectAudioChain();
                    }
                } else {
                    // Disconnect reverb if disabling
                    if (window.reconnectAudioChain) {
                        window.reconnectAudioChain();
                    }
                }
            }
        });
    }

    if (enableFakeBinaural) {
        enableFakeBinaural.addEventListener('change', (e) => {
            physicsSettings.fakeBinaural = e.target.checked;
            // Update fake binaural enabled state
            if (window.fakeBinauralSettings) {
                window.fakeBinauralSettings.enabled = e.target.checked;
                if (e.target.checked) {
                    // Initialize fake binaural if enabling
                    if (window.initializeFakeBinaural) {
                        window.initializeFakeBinaural();
                    }
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    if (enableSpectralBalance) {
        enableSpectralBalance.addEventListener('change', (e) => {
            physicsSettings.spectralBalance = e.target.checked;
            // Update spectral balance enabled state
            if (window.spectralBalanceSettings) {
                window.spectralBalanceSettings.enabled = e.target.checked;
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    // Priority 1: Critical Realism
    if (enableInharmonicity) {
        enableInharmonicity.addEventListener('change', (e) => {
            physicsSettings.inharmonicity = e.target.checked;
        });
    }

    if (enableMultiStringUnison) {
        enableMultiStringUnison.addEventListener('change', (e) => {
            physicsSettings.multiStringUnison = e.target.checked;
        });
    }

    // Priority 2: High Impact
    if (enableAttackNoise) {
        enableAttackNoise.addEventListener('change', (e) => {
            physicsSettings.attackNoise = e.target.checked;
        });
    }

    if (enableOddEvenHarmonicBalance) {
        enableOddEvenHarmonicBalance.addEventListener('change', (e) => {
            physicsSettings.oddEvenHarmonicBalance = e.target.checked;
        });
    }

    if (enablePitchHarmonicRolloff) {
        enablePitchHarmonicRolloff.addEventListener('change', (e) => {
            physicsSettings.pitchHarmonicRolloff = e.target.checked;
        });
    }

    // Priority 3: Polish & Detail
    if (enablePerPartialDecay) {
        enablePerPartialDecay.addEventListener('change', (e) => {
            physicsSettings.perPartialDecay = e.target.checked;
        });
    }

    if (enableReleaseTransient) {
        enableReleaseTransient.addEventListener('change', (e) => {
            physicsSettings.releaseTransient = e.target.checked;
        });
    }

    // Setup binaural reverb settings button
    const binauralReverbSettingsBtn = document.getElementById('binaural-reverb-settings-btn');
    if (binauralReverbSettingsBtn) {
        binauralReverbSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openBinauralReverbSettings) {
                window.openBinauralReverbSettings();
            }
        });
    }

    // Initialize binaural reverb settings popup
    if (window.initBinauralReverbSettings) {
        window.initBinauralReverbSettings();
    }

    // Setup fake binaural settings button
    const fakeBinauralSettingsBtn = document.getElementById('fake-binaural-settings-btn');
    if (fakeBinauralSettingsBtn) {
        fakeBinauralSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openFakeBinauralSettings) {
                window.openFakeBinauralSettings();
            }
        });
    }

    // Initialize fake binaural settings popup
    if (window.initFakeBinauralSettings) {
        window.initFakeBinauralSettings();
    }

    // Setup velocity mapping settings button
    const velocityMappingSettingsBtn = document.getElementById('velocity-mapping-settings-btn');
    if (velocityMappingSettingsBtn) {
        velocityMappingSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openVelocityMappingSettings) {
                window.openVelocityMappingSettings();
            }
        });
    }

    // Initialize velocity mapping settings popup
    if (window.initVelocityMappingSettings) {
        window.initVelocityMappingSettings();
    }

    // Setup inharmonicity settings button
    const inharmonicitySettingsBtn = document.getElementById('inharmonicity-settings-btn');
    if (inharmonicitySettingsBtn) {
        inharmonicitySettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openInharmonicitySettings) {
                window.openInharmonicitySettings();
            }
        });
    }

    // Initialize inharmonicity settings popup
    if (window.initInharmonicitySettings) {
        window.initInharmonicitySettings();
    }

    // Setup frequency compensation settings button
    const frequencyCompensationSettingsBtn = document.getElementById('frequency-compensation-settings-btn');
    if (frequencyCompensationSettingsBtn) {
        frequencyCompensationSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openFrequencyCompensationSettings) {
                window.openFrequencyCompensationSettings();
            }
        });
    }

    // Initialize frequency compensation settings popup
    if (window.initFrequencyCompensationSettings) {
        window.initFrequencyCompensationSettings();
    }

    // Setup spectral balance settings button
    const spectralBalanceSettingsBtn = document.getElementById('spectral-balance-settings-btn');
    if (spectralBalanceSettingsBtn) {
        spectralBalanceSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openSpectralBalanceSettings) {
                window.openSpectralBalanceSettings();
            }
        });
    }

    // Initialize spectral balance settings popup
    if (window.initSpectralBalanceSettings) {
        window.initSpectralBalanceSettings();
    }

    // Setup pitch harmonic rolloff settings button
    const pitchHarmonicRolloffSettingsBtn = document.getElementById('pitch-harmonic-rolloff-settings-btn');
    if (pitchHarmonicRolloffSettingsBtn) {
        pitchHarmonicRolloffSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openPitchHarmonicRolloffSettings) {
                window.openPitchHarmonicRolloffSettings();
            }
        });
    }

    // Initialize pitch harmonic rolloff settings popup
    if (window.initPitchHarmonicRolloffSettings) {
        window.initPitchHarmonicRolloffSettings();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.physicsSettings = physicsSettings;
    window.initPhysicsSettings = initPhysicsSettings;
}


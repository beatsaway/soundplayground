/**
 * Spectral Balance Module (Pink-Noise-Like EQ)
 * 
 * Applies a gentle high-frequency rolloff to the final output to create
 * a pink-noise-like spectral balance, dimming mid-high frequencies slightly.
 * This creates a warmer, more natural sound similar to how pink noise
 * has equal energy per octave (-3dB/octave rolloff).
 * 
 * CPU Impact: Low - Single filter on final output
 */

// Spectral balance filter node
let spectralBalanceFilter = null;

// Track effective gain (user gain + sustain pedal reduction)
// This allows the displayed gain to stay unchanged while the actual gain reduces
let effectiveGain = null; // Will be set to user gain initially
let sustainPedalGainAutomation = null; // Tone.js automation for smooth transitions

/**
 * Initialize the spectral balance filter
 */
function initializeSpectralBalance() {
    if (spectralBalanceFilter) {
        return true;
    }
    
    if (typeof Tone === 'undefined') {
        console.warn('Tone.js not available for spectral balance filter');
        return false;
    }
    
    try {
        // Use a high-shelf filter for gentle high-frequency rolloff
        // This creates a pink-noise-like response (-3dB/octave)
        spectralBalanceFilter = new Tone.Filter({
            type: 'highshelf',
            frequency: 2000, // Default cutoff: 2kHz
            gain: -20, // Default: -20dB gain reduction above cutoff
            Q: 0.7 // Default Q: gentle slope
        });
        
        return true;
    } catch (e) {
        console.warn('Failed to initialize spectral balance filter:', e);
        return false;
    }
}

/**
 * Update spectral balance filter parameters
 * @param {Object} settings - Settings object with frequency, gain, and Q
 */
function updateSpectralBalance(settings) {
    if (!spectralBalanceFilter) {
        if (!initializeSpectralBalance()) {
            return;
        }
    }
    
    if (settings.frequency !== undefined) {
        spectralBalanceFilter.frequency.value = settings.frequency;
    }
    
    if (settings.gain !== undefined) {
        // Update user-set gain, but use effective gain for actual filter
        // Effective gain will be set if sustain pedal is active
        if (effectiveGain === null) {
            effectiveGain = settings.gain;
        }
        // If sustain pedal reduction is not active, update effective gain too
        // Otherwise, keep the current effective gain (which may be reduced by sustain pedal)
        if (!sustainPedalGainAutomation || !sustainPedalGainAutomation.isActive) {
            effectiveGain = settings.gain;
            spectralBalanceFilter.gain.value = effectiveGain;
        } else {
            // Sustain pedal automation is active - don't change effective gain yet
            // The automation will complete and then we can update
            // But we should update the target for when pedal is released
            // This is handled in handleSustainPedalChange
        }
    }
    
    if (settings.Q !== undefined) {
        spectralBalanceFilter.Q.value = settings.Q;
    }
}

/**
 * Handle sustain pedal state change
 * Gradually reduces gain to 0dB when pedal is pressed (configurable duration, default 16s), restores when released (2s)
 * If pedal is pressed/released again during transition, cancels current transition and starts new one from current gain value
 * @param {boolean} pedalActive - Whether sustain pedal is active
 */
function handleSustainPedalChange(pedalActive) {
    // Check if feature is enabled
    if (!window.spectralBalanceSettings || !window.spectralBalanceSettings.sustainPedalGainReduction) {
        // Feature disabled - ensure effective gain matches user gain
        if (spectralBalanceFilter && effectiveGain !== null) {
            const userGain = (window.spectralBalanceSettings && window.spectralBalanceSettings.gain !== undefined) 
                ? window.spectralBalanceSettings.gain 
                : -20;
            effectiveGain = userGain;
            spectralBalanceFilter.gain.value = effectiveGain;
        }
        return; // Feature disabled
    }
    
    if (!spectralBalanceFilter) {
        if (!initializeSpectralBalance()) {
            return;
        }
    }
    
    // Cancel any existing automation
    if (sustainPedalGainAutomation && sustainPedalGainAutomation.isActive) {
        sustainPedalGainAutomation.cancel();
        sustainPedalGainAutomation = null;
    }
    
    // Get current user-set gain (from settings)
    const userGain = (window.spectralBalanceSettings && window.spectralBalanceSettings.gain !== undefined) 
        ? window.spectralBalanceSettings.gain 
        : -20; // Default
    
    // Initialize effective gain if needed
    if (effectiveGain === null) {
        effectiveGain = userGain;
    }
    
    // Get current gain value from filter (may be mid-transition)
    const currentGain = spectralBalanceFilter.gain.value;
    const targetGain = pedalActive ? 0 : userGain; // 0dB when pedal active, user gain when released
    // Get duration from settings (default 16s for reduction, 0.2s for restore)
    const reductionDuration = (window.spectralBalanceSettings && window.spectralBalanceSettings.frequencyIncreaseDuration !== undefined) 
        ? window.spectralBalanceSettings.frequencyIncreaseDuration 
        : 16.0;
    const restoreDuration = (window.spectralBalanceSettings && window.spectralBalanceSettings.frequencyRestoreDuration !== undefined)
        ? window.spectralBalanceSettings.frequencyRestoreDuration
        : 0.2;
    const transitionDuration = pedalActive ? reductionDuration : restoreDuration; // Configurable durations for both directions
    
    // Create smooth automation
    const startTime = Tone.now();
    const endTime = startTime + transitionDuration;
    
    // Use Tone.js automation for smooth transition
    spectralBalanceFilter.gain.cancelScheduledValues(startTime);
    spectralBalanceFilter.gain.setValueAtTime(currentGain, startTime);
    spectralBalanceFilter.gain.linearRampToValueAtTime(targetGain, endTime);
    
    // Track automation state
    sustainPedalGainAutomation = {
        isActive: true,
        targetGain: targetGain,
        pedalActive: pedalActive,
        cancel: () => {
            if (sustainPedalGainAutomation && sustainPedalGainAutomation.isActive) {
                const now = Tone.now();
                const currentValue = spectralBalanceFilter.gain.value;
                spectralBalanceFilter.gain.cancelScheduledValues(now);
                spectralBalanceFilter.gain.setValueAtTime(currentValue, now);
                sustainPedalGainAutomation.isActive = false;
            }
        }
    };
    
    // Update effective gain after transition completes
    setTimeout(() => {
        effectiveGain = targetGain;
        if (sustainPedalGainAutomation) {
            sustainPedalGainAutomation.isActive = false;
        }
    }, transitionDuration * 1000);
}

/**
 * Connect spectral balance filter to the audio chain
 * Should be called at the very end, after reverb but before destination
 * 
 * @param {Tone.ToneAudioNode} inputNode - Input node (usually reverb output)
 * @returns {Tone.ToneAudioNode} - Output node with spectral balance applied
 */
function connectSpectralBalance(inputNode) {
    if (!window.spectralBalanceSettings || !window.spectralBalanceSettings.enabled) {
        // If disabled, create a pass-through to avoid connection issues
        // This ensures we always return a new node that can be safely connected
        const passThrough = new Tone.Gain(1.0);
        inputNode.connect(passThrough);
        return passThrough;
    }
    
    if (!spectralBalanceFilter) {
        if (!initializeSpectralBalance()) {
            // Fallback: pass-through if initialization fails
            const passThrough = new Tone.Gain(1.0);
            inputNode.connect(passThrough);
            return passThrough;
        }
    }
    
    // Disconnect any existing connections to avoid double-connection issues
    if (spectralBalanceFilter) {
        spectralBalanceFilter.disconnect();
    }
    
    // Update filter with current settings
    if (window.spectralBalanceSettings) {
        const userGain = window.spectralBalanceSettings.gain || -20;
        // Initialize effective gain to user gain
        if (effectiveGain === null) {
            effectiveGain = userGain;
        }
        updateSpectralBalance({
            frequency: window.spectralBalanceSettings.frequency || 2000,
            gain: userGain,
            Q: window.spectralBalanceSettings.Q || 0.7
        });
    }
    
    // Connect input to filter
    inputNode.connect(spectralBalanceFilter);
    
    return spectralBalanceFilter;
}

/**
 * Disconnect spectral balance filter
 */
function disconnectSpectralBalance() {
    if (spectralBalanceFilter) {
        spectralBalanceFilter.disconnect();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initializeSpectralBalance = initializeSpectralBalance;
    window.updateSpectralBalance = updateSpectralBalance;
    window.connectSpectralBalance = connectSpectralBalance;
    window.disconnectSpectralBalance = disconnectSpectralBalance;
    window.handleSustainPedalChangeSpectralBalance = handleSustainPedalChange;
}


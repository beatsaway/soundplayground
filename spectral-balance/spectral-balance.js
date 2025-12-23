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
            gain: -6, // Default: -6dB gain reduction above cutoff
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
        spectralBalanceFilter.gain.value = settings.gain;
    }
    
    if (settings.Q !== undefined) {
        spectralBalanceFilter.Q.value = settings.Q;
    }
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
        updateSpectralBalance({
            frequency: window.spectralBalanceSettings.frequency || 2000,
            gain: window.spectralBalanceSettings.gain || -6,
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
}


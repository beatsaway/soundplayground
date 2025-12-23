/**
 * Fake Binaural Mono-to-Stereo Processing Module
 * Implements "fake binaural" techniques to make mono piano sources sound spacious
 * Based on fake-binaural-mono-to-stereo-techniques.md
 * 
 * This module applies frequency-based panning, ITD delays, phase manipulation,
 * and player perspective simulation to create a natural stereo image from mono sources.
 * 
 * Key features:
 * - Frequency-based panning (bass left, treble right)
 * - Player perspective simulation (note-dependent positioning)
 * - Micro-delays (ITD) between channels
 * - Per-channel EQ differences (head shadow simulation)
 * - Simple all-in-one processing chain
 * 
 * CPU Impact: Low-Medium - Lightweight processing with filters, delays, and panning
 */

// Default fake binaural settings
const fakeBinauralSettings = {
    enabled: false,
    playerPerspective: true,      // Bass left, treble right based on note frequency
    frequencyPanning: true,       // Frequency-based panning
    itdDelay: true,              // Interaural Time Difference (micro-delays)
    eqDifferences: true,          // Per-channel EQ differences (head shadow)
    panIntensity: 0.7,           // Panning intensity (0.0 to 1.0) - increased for stronger effect
    itdAmount: 0.0004,           // ITD delay in seconds (400μs) - increased for stronger effect
    eqIntensity: 0.8              // EQ difference intensity (0.0 to 1.0) - increased for stronger effect
};

// Processing nodes (lazy initialization)
let fakeBinauralProcessor = null;
let inputGain = null;
let outputMerger = null;

/**
 * Initialize fake binaural processing system
 * Creates the audio processing chain
 */
function initializeFakeBinaural() {
    if (typeof Tone === 'undefined') {
        console.warn('Tone.js not available for fake binaural processing');
        return false;
    }

    try {
        // Create input gain node
        inputGain = new Tone.Gain(1.0);
        
        // Create output merger (mono to stereo)
        outputMerger = new Tone.Merge();
        
        // Create processing chain
        setupFakeBinauralChain();
        
        return true;
    } catch (error) {
        console.error('Failed to initialize fake binaural:', error);
        return false;
    }
}

/**
 * Setup the fake binaural processing chain
 * Combines multiple techniques for natural stereo width
 */
function setupFakeBinauralChain() {
    if (!inputGain || !outputMerger) return;
    
    // Disconnect any existing connections
    inputGain.disconnect();
    
    // If disabled, just pass through (mono to stereo)
    if (!fakeBinauralSettings.enabled) {
        inputGain.connect(outputMerger, 0, 0); // Left channel
        inputGain.connect(outputMerger, 0, 1); // Right channel
        return;
    }
    
    // Create left and right processing chains
    const leftChain = createLeftChannelChain();
    const rightChain = createRightChannelChain();
    
    // Connect input to both chains
    inputGain.connect(leftChain);
    inputGain.connect(rightChain);
    
    // Connect chains to output
    leftChain.connect(outputMerger, 0, 0);
    rightChain.connect(outputMerger, 0, 1);
}

/**
 * Create left channel processing chain
 */
function createLeftChannelChain() {
    // Apply EQ differences (head shadow simulation)
    if (fakeBinauralSettings.eqDifferences) {
        const leftEQ = new Tone.Filter({
            type: 'peaking',
            frequency: 2800,
            Q: 1.5,
            gain: -2 * fakeBinauralSettings.eqIntensity
        });
        return leftEQ;
    }
    
    // No processing, just pass through
    return new Tone.Gain(1.0);
}

/**
 * Create right channel processing chain
 */
function createRightChannelChain() {
    let chain = null;
    
    // Apply ITD delay (micro-delay for spatial perception)
    if (fakeBinauralSettings.itdDelay) {
        chain = new Tone.Delay(fakeBinauralSettings.itdAmount);
    } else {
        chain = new Tone.Gain(1.0);
    }
    
    // Apply EQ differences (head shadow simulation)
    if (fakeBinauralSettings.eqDifferences) {
        const rightEQ = new Tone.Filter({
            type: 'peaking',
            frequency: 3200,
            Q: 1.5,
            gain: -1 * fakeBinauralSettings.eqIntensity
        });
        chain.connect(rightEQ);
        return rightEQ;
    }
    
    return chain;
}

/**
 * Apply fake binaural processing to a note
 * This is called per-note to apply frequency-dependent panning
 * 
 * @param {Tone.ToneAudioNode} noteNode - The audio node for a specific note
 * @param {number} frequency - Note frequency in Hz
 * @returns {Tone.ToneAudioNode} - Processed note node
 */
function applyFakeBinauralToNote(noteNode, frequency) {
    if (!fakeBinauralSettings.enabled || !noteNode) {
        return noteNode;
    }
    
    // Player perspective panning (bass left, treble right)
    if (fakeBinauralSettings.playerPerspective) {
        const middleC = 261.63; // C4 frequency
        const panValue = Math.tanh((frequency - middleC) / middleC) * fakeBinauralSettings.panIntensity;
        
        // Create stereo panner
        const panner = new Tone.Panner(panValue);
        noteNode.connect(panner);
        return panner;
    }
    
    return noteNode;
}

/**
 * Connect fake binaural processing to the main audio chain
 * Should be called after synth initialization, before binaural reverb
 * 
 * @param {Tone.ToneAudioNode} inputNode - Input node (usually synth or filter)
 * @returns {Tone.ToneAudioNode} - Output node with fake binaural processing applied
 */
function connectFakeBinaural(inputNode) {
    if (!fakeBinauralSettings.enabled) {
        // If disabled, just create a stereo pass-through
        const merger = new Tone.Merge();
        inputNode.connect(merger, 0, 0);
        inputNode.connect(merger, 0, 1);
        return merger;
    }
    
    if (!inputGain || !outputMerger) {
        if (!initializeFakeBinaural()) {
            // Fallback: stereo pass-through
            const merger = new Tone.Merge();
            inputNode.connect(merger, 0, 0);
            inputNode.connect(merger, 0, 1);
            return merger;
        }
    }
    
    // Connect input to processing chain
    inputNode.connect(inputGain);
    
    return outputMerger;
}

/**
 * Update fake binaural parameters
 * Call this when settings change
 */
function updateFakeBinauralSettings() {
    if (!fakeBinauralSettings.enabled) {
        setupFakeBinauralChain();
        return;
    }
    
    // Rebuild the processing chain with new settings
    setupFakeBinauralChain();
}

/**
 * Get current fake binaural settings
 * @returns {Object} - Copy of current settings
 */
function getFakeBinauralSettings() {
    return { ...fakeBinauralSettings };
}

/**
 * Set fake binaural settings
 * @param {Object} newSettings - Settings to update
 */
function setFakeBinauralSettings(newSettings) {
    const wasEnabled = fakeBinauralSettings.enabled;
    Object.assign(fakeBinauralSettings, newSettings);
    
    // If enabling/disabling, rebuild the chain
    if (wasEnabled !== fakeBinauralSettings.enabled) {
        setupFakeBinauralChain();
    } else {
        updateFakeBinauralSettings();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.fakeBinauralSettings = fakeBinauralSettings;
    window.initializeFakeBinaural = initializeFakeBinaural;
    window.applyFakeBinauralToNote = applyFakeBinauralToNote;
    window.connectFakeBinaural = connectFakeBinaural;
    window.getFakeBinauralSettings = getFakeBinauralSettings;
    window.setFakeBinauralSettings = setFakeBinauralSettings;
    window.updateFakeBinauralSettings = updateFakeBinauralSettings;
}


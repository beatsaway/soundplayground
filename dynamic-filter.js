/**
 * Dynamic Low-Pass Filter Module
 * Implements keytracked, time-varying low-pass filter that closes as note decays
 * This mimics the damping of high harmonics in real piano strings
 * 
 * Key insight: Real piano strings lose high-frequency harmonics faster than low-frequency ones
 * This is what makes a static waveform sound "piano-like"
 */

/**
 * Calculate initial filter cutoff frequency based on velocity and note frequency
 * Higher velocity = brighter = higher initial cutoff
 * Higher notes naturally have less low-frequency content (keytracked)
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Initial cutoff frequency in Hz
 */
function getInitialFilterCutoff(velocity, frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.dynamicFilter) {
        return 20000; // No filtering when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base cutoff: keytracked (higher notes = higher base cutoff)
    // This accounts for natural frequency-dependent harmonic content
    const keytrackedBase = Math.min(20000, frequency * 20); // Higher notes naturally brighter
    
    // Velocity effect: louder = brighter = higher cutoff
    // Range: 0.3x to 1.0x of keytracked base
    const velocityMultiplier = 0.3 + 0.7 * vNorm;
    
    // Final cutoff: combine keytracking and velocity
    const initialCutoff = keytrackedBase * velocityMultiplier;
    
    // Clamp to reasonable range (200 Hz to 20 kHz)
    return Math.max(200, Math.min(20000, initialCutoff));
}

/**
 * Calculate filter cutoff frequency at a given time after note attack
 * Filter closes (cutoff decreases) as the note decays, mimicking harmonic damping
 * 
 * @param {number} initialCutoff - Initial cutoff frequency in Hz
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} frequency - Note frequency in Hz (for keytracked decay rate)
 * @returns {number} - Current cutoff frequency in Hz
 */
function getFilterCutoffAtTime(initialCutoff, timeSinceAttack, frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.dynamicFilter) {
        return initialCutoff; // No filtering when disabled
    }
    
    // Decay rate: higher notes decay faster (lose harmonics faster)
    // Lower notes maintain harmonics longer
    // Formula: decay time scales inversely with frequency
    const baseDecayTime = 0.5; // Base decay time in seconds
    const freqRatio = frequency / 440; // Relative to A4
    const decayTime = baseDecayTime / Math.sqrt(freqRatio); // Faster decay for higher notes
    
    // Exponential decay of cutoff frequency
    // Cutoff closes from initialCutoff down to ~2x fundamental frequency
    const targetCutoff = Math.max(200, frequency * 2); // Don't go below 2x fundamental
    const cutoffRange = initialCutoff - targetCutoff;
    
    // Exponential decay: cutoff = target + range * exp(-t/decayTime)
    const currentCutoff = targetCutoff + cutoffRange * Math.exp(-timeSinceAttack / decayTime);
    
    return Math.max(targetCutoff, Math.min(initialCutoff, currentCutoff));
}

/**
 * Create and configure a dynamic filter for a note
 * Returns filter settings that can be applied to Tone.js synth
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @returns {Object} - Filter settings for Tone.js
 */
function getDynamicFilterSettings(velocity, frequency, timeSinceAttack) {
    const initialCutoff = getInitialFilterCutoff(velocity, frequency);
    const currentCutoff = getFilterCutoffAtTime(initialCutoff, timeSinceAttack, frequency);
    
    return {
        type: 'lowpass',
        frequency: currentCutoff,
        Q: 1.0, // Moderate resonance
        gain: 0
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getInitialFilterCutoff = getInitialFilterCutoff;
    window.getFilterCutoffAtTime = getFilterCutoffAtTime;
    window.getDynamicFilterSettings = getDynamicFilterSettings;
}


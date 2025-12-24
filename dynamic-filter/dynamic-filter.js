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
    
    // Use settings if available, otherwise use defaults
    const settings = (typeof window !== 'undefined' && window.dynamicFilterSettings) ? window.dynamicFilterSettings : {};
    const keytrackedMult = settings.keytrackedMultiplier !== undefined ? settings.keytrackedMultiplier : 20;
    const velocityMin = settings.velocityMinMultiplier !== undefined ? settings.velocityMinMultiplier : 0.3;
    const velocityMax = settings.velocityMaxMultiplier !== undefined ? settings.velocityMaxMultiplier : 1.0;
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base cutoff: keytracked (higher notes = higher base cutoff)
    // This accounts for natural frequency-dependent harmonic content
    const keytrackedBase = Math.min(20000, frequency * keytrackedMult); // Higher notes naturally brighter
    
    // Velocity effect: louder = brighter = higher cutoff
    // Range: velocityMin to velocityMax of keytracked base
    const velocityMultiplier = velocityMin + (velocityMax - velocityMin) * vNorm;
    
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
    
    // Use settings if available, otherwise use defaults
    const settings = (typeof window !== 'undefined' && window.dynamicFilterSettings) ? window.dynamicFilterSettings : {};
    const baseDecayTime = settings.baseDecayTime !== undefined ? settings.baseDecayTime : 0.5;
    const targetCutoffMult = settings.targetCutoffMultiplier !== undefined ? settings.targetCutoffMultiplier : 2.0;
    
    // Decay rate: higher notes decay faster (lose harmonics faster)
    // Lower notes maintain harmonics longer
    // Formula: decay time scales inversely with frequency
    const freqRatio = frequency / 440; // Relative to A4
    const decayTime = baseDecayTime / Math.sqrt(freqRatio); // Faster decay for higher notes
    
    // Exponential decay of cutoff frequency
    // Cutoff closes from initialCutoff down to targetCutoffMult x fundamental frequency
    const targetCutoff = Math.max(200, frequency * targetCutoffMult); // Don't go below targetCutoffMult x fundamental
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
    
    // Use settings if available, otherwise use defaults
    const settings = (typeof window !== 'undefined' && window.dynamicFilterSettings) ? window.dynamicFilterSettings : {};
    const Q = settings.Q !== undefined ? settings.Q : 1.0;
    
    return {
        type: 'lowpass',
        frequency: currentCutoff,
        Q: Q, // Filter resonance from settings
        gain: 0
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getInitialFilterCutoff = getInitialFilterCutoff;
    window.getFilterCutoffAtTime = getFilterCutoffAtTime;
    window.getDynamicFilterSettings = getDynamicFilterSettings;
}


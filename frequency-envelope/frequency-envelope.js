/**
 * Frequency Envelope Module (Pitch Modulation)
 * Based on frequency-envelope-pitch-modulation.md research
 * 
 * Implements pitch modulation over time to make sounds more "organic" and "alive":
 * 1. Initial Transient Drift - Pitch starts slightly sharp/flat and settles to nominal frequency
 * 2. Vibrato - Periodic pitch modulation (5-7 Hz) during sustain
 * 3. Release Drift - Pitch drops slightly as note ends
 * 
 * CPU Impact: Medium - Requires real-time frequency modulation per note
 * 
 * Formula: f(t) = f₀ + Δf·e^(-t/τ_drift) + A_v·sin(2πf_v·t)
 */

/**
 * Calculate initial pitch drift (transient)
 * Pitch starts slightly offset and settles to nominal frequency
 * 
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} driftTime - Time constant for drift decay (default 0.05s = 50ms)
 * @param {number} driftAmount - Initial frequency offset in Hz (default ±2 Hz for piano)
 * @returns {number} - Frequency offset in Hz
 */
function getInitialPitchDrift(timeSinceAttack, driftTime = 0.05, driftAmount = 2.0) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyEnvelope) {
        return 0; // No drift when disabled
    }
    
    // Exponential decay: drift starts at driftAmount and decays to 0
    // For piano: slight initial sharpness (positive) that settles quickly
    return driftAmount * Math.exp(-timeSinceAttack / driftTime);
}

/**
 * Calculate vibrato (periodic pitch modulation)
 * Applied during sustain phase to add expressiveness
 * 
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} attackTime - Attack time in seconds (vibrato starts after attack)
 * @param {number} vibratoRate - Vibrato frequency in Hz (default 5-7 Hz)
 * @param {number} vibratoDepth - Vibrato amplitude in Hz (default ±5 Hz)
 * @returns {number} - Frequency offset in Hz
 */
function getVibrato(timeSinceAttack, attackTime, vibratoRate = 6.0, vibratoDepth = 5.0) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyEnvelope) {
        return 0; // No vibrato when disabled
    }
    
    // Vibrato only starts after attack phase
    if (timeSinceAttack < attackTime) {
        return 0;
    }
    
    // Smooth vibrato onset (fade in over 0.1 seconds after attack)
    const vibratoStartTime = attackTime;
    const vibratoFadeTime = 0.1;
    const timeInVibrato = timeSinceAttack - vibratoStartTime;
    
    let vibratoGain = 1.0;
    if (timeInVibrato < vibratoFadeTime) {
        // Fade in vibrato gradually
        vibratoGain = timeInVibrato / vibratoFadeTime;
    }
    
    // Periodic modulation: sin(2π·f_v·t)
    return vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * timeSinceAttack) * vibratoGain;
}

/**
 * Calculate release pitch drift
 * Pitch drops slightly as note ends (energy dissipates)
 * 
 * @param {number} timeSinceRelease - Time since note release in seconds
 * @param {number} releaseDriftTime - Time constant for release drift (default 0.1s)
 * @param {number} releaseDriftAmount - Frequency drop in Hz (default -3 Hz for piano)
 * @returns {number} - Frequency offset in Hz
 */
function getReleasePitchDrift(timeSinceRelease, releaseDriftTime = 0.1, releaseDriftAmount = -3.0) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyEnvelope) {
        return 0; // No drift when disabled
    }
    
    if (timeSinceRelease <= 0) {
        return 0; // Not released yet
    }
    
    // Exponential decay: pitch drops from 0 to releaseDriftAmount
    // For piano: pitch drops slightly as string tension relaxes
    return releaseDriftAmount * (1 - Math.exp(-timeSinceRelease / releaseDriftTime));
}

/**
 * Calculate total frequency modulation at a given time
 * Combines initial drift, vibrato, and release drift
 * 
 * @param {number} baseFrequency - Nominal frequency in Hz
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} timeSinceRelease - Time since note release in seconds (0 if still held)
 * @param {number} attackTime - Attack time in seconds
 * @param {Object} options - Optional parameters
 * @returns {number} - Modulated frequency in Hz
 */
function getModulatedFrequency(baseFrequency, timeSinceAttack, timeSinceRelease, attackTime, options = {}) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyEnvelope) {
        return baseFrequency; // No modulation when disabled
    }
    
    const {
        initialDriftAmount = 2.0,
        initialDriftTime = 0.05,
        vibratoRate = 6.0,
        vibratoDepth = 5.0,
        releaseDriftAmount = -3.0,
        releaseDriftTime = 0.1
    } = options;
    
    let frequency = baseFrequency;
    
    // 1. Initial transient drift (always applies during attack)
    const initialDrift = getInitialPitchDrift(timeSinceAttack, initialDriftTime, initialDriftAmount);
    frequency += initialDrift;
    
    // 2. Vibrato (during sustain, before release)
    if (timeSinceRelease <= 0) {
        const vibrato = getVibrato(timeSinceAttack, attackTime, vibratoRate, vibratoDepth);
        frequency += vibrato;
    }
    
    // 3. Release drift (after release)
    if (timeSinceRelease > 0) {
        const releaseDrift = getReleasePitchDrift(timeSinceRelease, releaseDriftTime, releaseDriftAmount);
        frequency += releaseDrift;
    }
    
    return frequency;
}

/**
 * Create a frequency modulation automation for a note
 * Returns an object with methods to update frequency over time
 * 
 * @param {number} baseFrequency - Nominal frequency in Hz
 * @param {number} attackTime - Attack time in seconds
 * @param {Object} options - Optional parameters
 * @returns {Object} - Modulation controller with update() method
 */
function createFrequencyModulation(baseFrequency, attackTime, options = {}) {
    const startTime = Tone.now();
    let releaseTime = null;
    
    return {
        /**
         * Update frequency modulation at current time
         * @returns {number} - Current modulated frequency
         */
        update: function() {
            const now = Tone.now();
            const timeSinceAttack = now - startTime;
            const timeSinceRelease = releaseTime ? (now - releaseTime) : 0;
            
            return getModulatedFrequency(
                baseFrequency,
                timeSinceAttack,
                timeSinceRelease,
                attackTime,
                options
            );
        },
        
        /**
         * Mark note as released
         */
        release: function() {
            if (!releaseTime) {
                releaseTime = Tone.now();
            }
        },
        
        /**
         * Get current time since attack
         */
        getTimeSinceAttack: function() {
            return Tone.now() - startTime;
        },
        
        /**
         * Get current time since release (0 if not released)
         */
        getTimeSinceRelease: function() {
            return releaseTime ? (Tone.now() - releaseTime) : 0;
        }
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getInitialPitchDrift = getInitialPitchDrift;
    window.getVibrato = getVibrato;
    window.getReleasePitchDrift = getReleasePitchDrift;
    window.getModulatedFrequency = getModulatedFrequency;
    window.createFrequencyModulation = createFrequencyModulation;
}


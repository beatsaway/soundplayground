/**
 * Per-Partial Decay Rates Module
 * Implements different decay rates for each harmonic partial
 * 
 * Research: Higher partials decay faster than lower partials
 * Formula: τₖ = τ₁ × exp(-δ × (k-1)) where δ ≈ 0.2-0.3
 * 
 * This creates more realistic spectral evolution over time
 */

/**
 * Calculate decay time constant for a specific partial
 * Higher partials decay faster
 * 
 * @param {number} partialNumber - Partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} fundamentalDecayTime - Decay time for fundamental (τ₁) in seconds
 * @returns {number} - Decay time constant for this partial (τₖ) in seconds
 */
function calculatePartialDecayTime(partialNumber, fundamentalDecayTime) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.perPartialDecay) {
        return fundamentalDecayTime; // Same decay for all partials when disabled
    }
    
    // Decay factor: δ ≈ 0.2-0.3
    const delta = 0.25; // Average value
    
    // Formula: τₖ = τ₁ × exp(-δ × (k-1))
    const partialDecayTime = fundamentalDecayTime * Math.exp(-delta * (partialNumber - 1));
    
    // Clamp to minimum (very high partials shouldn't decay instantly)
    const minDecayTime = fundamentalDecayTime * 0.1; // At least 10% of fundamental
    return Math.max(minDecayTime, partialDecayTime);
}

/**
 * Calculate amplitude multiplier for a partial at a given time
 * Uses exponential decay with per-partial decay rates
 * 
 * @param {number} partialNumber - Partial number (1 = fundamental, etc.)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} fundamentalDecayTime - Decay time for fundamental in seconds
 * @param {number} initialAmplitude - Initial amplitude of this partial
 * @returns {number} - Current amplitude multiplier (0-1)
 */
function calculatePartialAmplitudeAtTime(partialNumber, timeSinceAttack, fundamentalDecayTime, initialAmplitude = 1.0) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.perPartialDecay) {
        // Standard exponential decay when disabled
        const decayFactor = Math.exp(-timeSinceAttack / fundamentalDecayTime);
        return initialAmplitude * decayFactor;
    }
    
    // Calculate per-partial decay time
    const partialDecayTime = calculatePartialDecayTime(partialNumber, fundamentalDecayTime);
    
    // Exponential decay: A(t) = A₀ × exp(-t/τₖ)
    const decayFactor = Math.exp(-timeSinceAttack / partialDecayTime);
    
    return initialAmplitude * decayFactor;
}

/**
 * Create envelope settings for per-partial decay
 * Returns envelope parameters that approximate per-partial behavior
 * 
 * Note: Tone.js envelopes don't support per-partial control directly
 * This provides decay time that represents the average behavior
 * 
 * @param {number} fundamentalDecayTime - Decay time for fundamental in seconds
 * @param {number} maxPartials - Maximum number of partials to consider
 * @returns {Object} - Envelope settings
 */
function getPerPartialDecayEnvelope(fundamentalDecayTime, maxPartials = 10) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.perPartialDecay) {
        return {
            decay: fundamentalDecayTime,
            sustain: 0.3
        };
    }
    
    // Calculate average decay time across all partials
    let totalDecayTime = 0;
    for (let k = 1; k <= maxPartials; k++) {
        totalDecayTime += calculatePartialDecayTime(k, fundamentalDecayTime);
    }
    const averageDecayTime = totalDecayTime / maxPartials;
    
    // Use average decay time (weighted toward fundamental since it's louder)
    // Weight: fundamental gets 50% weight, others share 50%
    const weightedDecayTime = fundamentalDecayTime * 0.5 + averageDecayTime * 0.5;
    
    return {
        decay: weightedDecayTime,
        sustain: 0.3 // Sustain level (unchanged)
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculatePartialDecayTime = calculatePartialDecayTime;
    window.calculatePartialAmplitudeAtTime = calculatePartialAmplitudeAtTime;
    window.getPerPartialDecayEnvelope = getPerPartialDecayEnvelope;
}


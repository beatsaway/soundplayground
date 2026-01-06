/**
 * Pitch-Dependent Harmonic Rolloff Module
 * Implements frequency-dependent harmonic content
 * 
 * Research: Lower notes have more audible harmonics than higher notes
 * Formula: aₖ(f₀) = g(f₀) × exp(-k × α(f₀))
 * 
 * Bass (A0): 10-15 harmonics clearly audible
 * Treble (C8): Only 2-3 harmonics audible
 */

/**
 * Calculate harmonic rolloff rate based on pitch
 * Higher notes have steeper rolloff (fewer harmonics)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Rolloff rate α (higher = steeper rolloff)
 */
function calculatePitchDependentRolloffRate(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.pitchHarmonicRolloff) {
        return 0.15; // Default rolloff when disabled
    }
    
    // Get settings from pitchHarmonicRolloffSettings if available
    const settings = (typeof window !== 'undefined' && window.pitchHarmonicRolloffSettings) ? window.pitchHarmonicRolloffSettings : {};
    
    // Rolloff rate increases with frequency
    // Bass (A0 ~27Hz): α ≈ 0.10 (gentle rolloff, many harmonics)
    // Mid (C4 ~262Hz): α ≈ 0.15 (moderate rolloff)
    // Treble (C8 ~4186Hz): α ≈ 0.30 (steep rolloff, few harmonics)
    
    if (frequency < 100) {
        return settings.bassRolloff !== undefined ? settings.bassRolloff : 0.10;
    } else if (frequency < 500) {
        return settings.lowerMidRolloff !== undefined ? settings.lowerMidRolloff : 0.12;
    } else if (frequency < 1000) {
        return settings.upperMidRolloff !== undefined ? settings.upperMidRolloff : 0.18;
    } else if (frequency < 2000) {
        return settings.lowerTrebleRolloff !== undefined ? settings.lowerTrebleRolloff : 0.25;
    } else {
        return settings.upperTrebleRolloff !== undefined ? settings.upperTrebleRolloff : 0.30;
    }
}

/**
 * Calculate maximum number of audible harmonics for a given pitch
 * Based on research: Bass has more harmonics than treble
 * 
 * @param {number} frequency - Note frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127) - affects harmonic count
 * @returns {number} - Maximum number of audible harmonics
 */
function calculateMaxAudibleHarmonics(frequency, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.pitchHarmonicRolloff) {
        return 20; // Default when disabled
    }
    
    // Get settings from pitchHarmonicRolloffSettings if available
    const settings = (typeof window !== 'undefined' && window.pitchHarmonicRolloffSettings) ? window.pitchHarmonicRolloffSettings : {};
    const velocityBoost = settings.velocityBoost !== undefined ? settings.velocityBoost : 0.3;
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base harmonic count by frequency (from settings or defaults)
    let maxHarmonics;
    if (frequency < 100) {
        maxHarmonics = settings.bassMaxHarmonics !== undefined ? settings.bassMaxHarmonics : 15;
    } else if (frequency < 500) {
        maxHarmonics = settings.lowerMidMaxHarmonics !== undefined ? settings.lowerMidMaxHarmonics : 12;
    } else if (frequency < 1000) {
        maxHarmonics = settings.upperMidMaxHarmonics !== undefined ? settings.upperMidMaxHarmonics : 10;
    } else if (frequency < 2000) {
        maxHarmonics = settings.lowerTrebleMaxHarmonics !== undefined ? settings.lowerTrebleMaxHarmonics : 6;
    } else {
        maxHarmonics = settings.upperTrebleMaxHarmonics !== undefined ? settings.upperTrebleMaxHarmonics : 3;
    }
    
    // Apply velocity boost
    const baseHarmonics = Math.floor(maxHarmonics * (1.0 - velocityBoost * 0.5));
    const boostedHarmonics = baseHarmonics + Math.floor(vNorm * velocityBoost * maxHarmonics);
    
    return Math.min(maxHarmonics, boostedHarmonics);
}

/**
 * Calculate harmonic amplitude with pitch-dependent rolloff
 * Applies frequency-dependent rolloff rate
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, etc.)
 * @param {number} frequency - Note frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Harmonic amplitude (0-1)
 */
function calculatePitchDependentHarmonicAmplitude(harmonicNumber, frequency, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.pitchHarmonicRolloff) {
        // Default rolloff when disabled
        const alpha = 0.15;
        return Math.exp(-harmonicNumber * alpha);
    }
    
    // Get pitch-dependent rolloff rate
    const alpha = calculatePitchDependentRolloffRate(frequency);
    
    // Calculate base amplitude with pitch-dependent rolloff
    // Formula: aₖ(f₀) = exp(-k × α(f₀))
    let amplitude = Math.exp(-harmonicNumber * alpha);
    
    // Apply velocity boost (higher velocity = more harmonics)
    const settings = (typeof window !== 'undefined' && window.pitchHarmonicRolloffSettings) ? window.pitchHarmonicRolloffSettings : {};
    const velocityBoostAmount = settings.velocityBoost !== undefined ? settings.velocityBoost : 0.3;
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const velocityBoost = 1.0 + (vNorm * velocityBoostAmount * Math.exp(-harmonicNumber / 8));
    amplitude *= velocityBoost;
    
    // Check if harmonic is audible (above threshold)
    const maxHarmonics = calculateMaxAudibleHarmonics(frequency, velocity);
    if (harmonicNumber > maxHarmonics) {
        // Very steep rolloff for harmonics beyond audible range
        amplitude *= Math.exp(-(harmonicNumber - maxHarmonics) * 2);
    }
    
    return Math.min(1.0, amplitude);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculatePitchDependentRolloffRate = calculatePitchDependentRolloffRate;
    window.calculateMaxAudibleHarmonics = calculateMaxAudibleHarmonics;
    window.calculatePitchDependentHarmonicAmplitude = calculatePitchDependentHarmonicAmplitude;
}


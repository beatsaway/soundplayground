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
    
    // Rolloff rate increases with frequency
    // Bass (A0 ~27Hz): α ≈ 0.10 (gentle rolloff, many harmonics)
    // Mid (C4 ~262Hz): α ≈ 0.15 (moderate rolloff)
    // Treble (C8 ~4186Hz): α ≈ 0.30 (steep rolloff, few harmonics)
    
    if (frequency < 100) {
        // Bass register: gentle rolloff
        return 0.10;
    } else if (frequency < 500) {
        // Lower mid: moderate rolloff
        return 0.12;
    } else if (frequency < 1000) {
        // Upper mid: moderate-steep rolloff
        return 0.18;
    } else if (frequency < 2000) {
        // Lower treble: steep rolloff
        return 0.25;
    } else {
        // Upper treble: very steep rolloff
        return 0.30;
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
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base harmonic count by frequency
    let baseHarmonics;
    if (frequency < 100) {
        // Bass: 10-15 harmonics
        baseHarmonics = 10 + Math.floor(vNorm * 5);
    } else if (frequency < 500) {
        // Lower mid: 8-12 harmonics
        baseHarmonics = 8 + Math.floor(vNorm * 4);
    } else if (frequency < 1000) {
        // Upper mid: 6-10 harmonics
        baseHarmonics = 6 + Math.floor(vNorm * 4);
    } else if (frequency < 2000) {
        // Lower treble: 4-6 harmonics
        baseHarmonics = 4 + Math.floor(vNorm * 2);
    } else {
        // Upper treble: 2-3 harmonics
        baseHarmonics = 2 + Math.floor(vNorm * 1);
    }
    
    return baseHarmonics;
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
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const velocityBoost = 1.0 + (vNorm * 0.3 * Math.exp(-harmonicNumber / 8));
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


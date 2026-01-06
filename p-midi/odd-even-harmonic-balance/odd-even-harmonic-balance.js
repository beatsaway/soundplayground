/**
 * Odd/Even Harmonic Balance Module
 * Implements explicit 2:1 ratio for odd:even harmonics (characteristic "woody" piano tone)
 * 
 * Research: Pianos emphasize odd harmonics
 * Formula: aₖ ratio = odd:even ≈ 2:1 for k ≤ 6
 * 
 * This creates the characteristic "woody" piano timbre
 */

/**
 * Apply odd/even harmonic balance to harmonic amplitude
 * Odd harmonics: full amplitude
 * Even harmonics: reduced by 2:1 ratio (50% of odd)
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} baseAmplitude - Base amplitude before balance adjustment
 * @returns {number} - Adjusted amplitude with odd/even balance applied
 */
function applyOddEvenHarmonicBalance(harmonicNumber, baseAmplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.oddEvenHarmonicBalance) {
        return baseAmplitude; // No adjustment when disabled
    }
    
    // Fundamental (k=1) is always full amplitude
    if (harmonicNumber === 1) {
        return baseAmplitude;
    }
    
    // For harmonics k ≤ 6: apply 2:1 ratio
    // For k > 6: gradually reduce even harmonics less (they're already weak)
    if (harmonicNumber <= 6) {
        if (harmonicNumber % 2 === 0) {
            // Even harmonics: reduce by 2:1 ratio (50% of odd)
            return baseAmplitude * 0.5;
        } else {
            // Odd harmonics: full amplitude
            return baseAmplitude;
        }
    } else {
        // For k > 6: less aggressive reduction (even harmonics are already weak)
        if (harmonicNumber % 2 === 0) {
            // Even harmonics: reduce by 1.5:1 ratio (67% of odd)
            return baseAmplitude * 0.67;
        } else {
            // Odd harmonics: full amplitude
            return baseAmplitude;
        }
    }
}

/**
 * Create waveform with odd/even harmonic balance
 * Modifies existing waveform generation to apply balance
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @param {AudioContext} context - Web Audio API context
 * @param {number} maxHarmonics - Maximum number of harmonics
 * @returns {PeriodicWave|null} - Custom periodic wave with odd/even balance
 */
function createOddEvenBalancedWaveform(velocity, frequency, context, maxHarmonics = 20) {
    if (!context || !context.createPeriodicWave) {
        return null;
    }
    
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.oddEvenHarmonicBalance) {
        return null; // Use standard waveform when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const real = new Float32Array(4096);
    const imag = new Float32Array(4096);
    
    // Calculate number of harmonics based on frequency
    let numHarmonics = maxHarmonics;
    if (frequency < 100) {
        numHarmonics = Math.min(20, Math.floor(1 + vNorm * 15));
    } else if (frequency < 1000) {
        numHarmonics = Math.min(15, Math.floor(1 + vNorm * 10));
    } else {
        numHarmonics = Math.min(8, Math.floor(1 + vNorm * 4));
    }
    
    // Calculate amplitude for each harmonic
    for (let k = 1; k <= numHarmonics && k < 4096; k++) {
        // Base harmonic rolloff
        const alpha = frequency < 100 ? 0.12 : (frequency < 1000 ? 0.15 : 0.25);
        let amplitude = Math.exp(-k * alpha);
        
        // Velocity boost
        const velocityBoost = 1.0 + (vNorm * 0.4 * Math.exp(-k / 8));
        amplitude *= velocityBoost;
        
        // Apply odd/even balance
        amplitude = applyOddEvenHarmonicBalance(k, amplitude);
        
        // Clamp amplitude
        amplitude = Math.min(1.0, amplitude);
        
        real[k] = amplitude;
    }
    
    try {
        const wave = context.createPeriodicWave(real, imag, {disableNormalization: true});
        return wave;
    } catch (e) {
        console.warn('Failed to create odd/even balanced periodic wave:', e);
        return null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.applyOddEvenHarmonicBalance = applyOddEvenHarmonicBalance;
    window.createOddEvenBalancedWaveform = createOddEvenBalancedWaveform;
}


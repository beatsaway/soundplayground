/**
 * Inharmonicity Module
 * Implements pitch-dependent partial sharpening based on piano acoustics research
 * 
 * Research: Real piano strings are stiff, causing partials to be sharp
 * Formula: fₖ = k × f₀ × √(1 + B × k²)
 * 
 * Where:
 * - B = inharmonicity coefficient (pitch-dependent)
 * - B ≈ 0.0001 for bass strings (A0)
 * - B ≈ 0.02 for treble strings (C8)
 * 
 * This is CRITICAL for realism - research says this + velocity brightness = 80% of realism improvement
 */

/**
 * Calculate inharmonicity coefficient B based on MIDI note number
 * B increases with pitch (higher notes have more inharmonicity)
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Inharmonicity coefficient B
 */
function calculateInharmonicityCoefficient(midiNote) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        return 0; // No inharmonicity when disabled
    }
    
    const A0_MIDI = 21; // A0 MIDI note number
    const C8_MIDI = 108; // C8 MIDI note number
    
    // Get settings from inharmonicitySettings if available
    const settings = (typeof window !== 'undefined' && window.inharmonicitySettings) ? window.inharmonicitySettings : {};
    const B_min = settings.bMin !== undefined ? settings.bMin : 0.0001;
    const B_max = settings.bMax !== undefined ? settings.bMax : 0.02;
    const curveExponent = settings.curveExponent !== undefined ? settings.curveExponent : 1.5;
    const bassBoost = settings.bassBoost !== undefined ? settings.bassBoost : 1.0;
    const bassBoostThreshold = settings.bassBoostThreshold !== undefined ? settings.bassBoostThreshold : 262;
    
    // Normalize MIDI note to 0-1 range (A0 to C8)
    const normalized = Math.max(0, Math.min(1, (midiNote - A0_MIDI) / (C8_MIDI - A0_MIDI)));
    
    // Exponential interpolation (inharmonicity increases faster in treble)
    let B = B_min * Math.pow(B_max / B_min, Math.pow(normalized, curveExponent));
    
    // Apply bass boost if note frequency is below threshold
    const noteFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
    if (noteFreq < bassBoostThreshold && bassBoost > 1.0) {
        // Apply boost that decreases as we approach the threshold
        const boostFactor = 1.0 + (bassBoost - 1.0) * (1.0 - noteFreq / bassBoostThreshold);
        B *= boostFactor;
    }
    
    return B;
}

/**
 * Calculate inharmonic partial frequency
 * Formula: fₖ = k × f₀ × √(1 + B × k²)
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} partialNumber - Partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} B - Inharmonicity coefficient (optional, will calculate if not provided)
 * @param {number} midiNote - MIDI note number (required if B not provided)
 * @returns {number} - Inharmonic partial frequency in Hz
 */
function calculateInharmonicPartialFrequency(fundamentalFreq, partialNumber, B = null, midiNote = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        // No inharmonicity: return perfect harmonic
        return fundamentalFreq * partialNumber;
    }
    
    // Calculate B if not provided
    if (B === null) {
        if (midiNote === null) {
            // Fallback: estimate midiNote from frequency
            midiNote = Math.round(69 + 12 * Math.log2(fundamentalFreq / 440));
        }
        B = calculateInharmonicityCoefficient(midiNote);
    }
    
    // If B is 0, return perfect harmonic
    if (B === 0) {
        return fundamentalFreq * partialNumber;
    }
    
    // Calculate inharmonic frequency: fₖ = k × f₀ × √(1 + B × k²)
    const inharmonicFreq = fundamentalFreq * partialNumber * Math.sqrt(1 + B * partialNumber * partialNumber);
    
    return inharmonicFreq;
}

/**
 * Create a custom waveform with inharmonic partials
 * Uses Web Audio API PeriodicWave for additive synthesis with inharmonicity
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} midiNote - MIDI note number
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {AudioContext} context - Web Audio API context
 * @param {number} maxPartials - Maximum number of partials to include (default: 20)
 * @returns {PeriodicWave|null} - Custom periodic wave with inharmonic partials, or null if not available
 */
function createInharmonicWaveform(fundamentalFreq, midiNote, velocity, context, maxPartials = 20) {
    if (!context || !context.createPeriodicWave) {
        return null;
    }
    
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        return null; // Use standard waveform when disabled
    }
    
    const B = calculateInharmonicityCoefficient(midiNote);
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Create arrays for PeriodicWave (real and imaginary parts)
    const real = new Float32Array(4096);
    const imag = new Float32Array(4096);
    
    // Calculate number of partials based on pitch and velocity
    // Bass: more partials, Treble: fewer partials
    const noteFreq = fundamentalFreq;
    let numPartials = maxPartials;
    if (noteFreq < 100) {
        numPartials = Math.min(20, Math.floor(1 + vNorm * 15)); // Bass: up to 20 partials
    } else if (noteFreq < 1000) {
        numPartials = Math.min(15, Math.floor(1 + vNorm * 10)); // Mid: up to 15 partials
    } else {
        numPartials = Math.min(8, Math.floor(1 + vNorm * 4)); // Treble: up to 8 partials
    }
    
    // Calculate amplitude for each partial
    for (let k = 1; k <= numPartials && k < 4096; k++) {
        // Calculate inharmonic frequency ratio (relative to fundamental)
        const inharmonicRatio = calculateInharmonicPartialFrequency(fundamentalFreq, k, B, midiNote) / fundamentalFreq;
        
        // Find the nearest bin in the FFT array (4096 bins = up to 2048 harmonics)
        const binIndex = Math.round(inharmonicRatio);
        
        if (binIndex >= 1 && binIndex < 4096) {
            // Calculate amplitude using harmonic rolloff model
            // Base rolloff: exp(-k * α)
            const alpha = noteFreq < 100 ? 0.12 : (noteFreq < 1000 ? 0.15 : 0.25);
            let amplitude = Math.exp(-k * alpha);
            
            // Velocity boost: higher velocity = more high partials
            const velocityBoost = 1.0 + (vNorm * 0.4 * Math.exp(-k / 8));
            amplitude *= velocityBoost;
            
            // Apply odd/even harmonic balance if enabled
            if (window.physicsSettings && window.physicsSettings.oddEvenHarmonicBalance) {
                if (k % 2 === 0) {
                    // Even harmonics: reduce by 2:1 ratio
                    amplitude *= 0.5;
                }
            }
            
            // Clamp amplitude
            amplitude = Math.min(1.0, amplitude);
            
            // Store in real array (imaginary is 0 for cosine phase)
            real[binIndex] += amplitude;
        }
    }
    
    try {
        const wave = context.createPeriodicWave(real, imag, {disableNormalization: true});
        return wave;
    } catch (e) {
        console.warn('Failed to create inharmonic periodic wave:', e);
        return null;
    }
}

/**
 * Get oscillator frequency with inharmonicity applied
 * For use with standard oscillators (modifies fundamental frequency slightly)
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} midiNote - MIDI note number
 * @returns {number} - Adjusted frequency (slight sharpening for realism)
 */
function getInharmonicFundamentalFrequency(fundamentalFreq, midiNote) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        return fundamentalFreq;
    }
    
    // For standard oscillators, apply slight sharpening to fundamental
    // This is a simplified approach - full inharmonicity requires custom waveforms
    const B = calculateInharmonicityCoefficient(midiNote);
    const sharpening = 1.0 + B * 0.1; // Slight sharpening
    return fundamentalFreq * sharpening;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateInharmonicityCoefficient = calculateInharmonicityCoefficient;
    window.calculateInharmonicPartialFrequency = calculateInharmonicPartialFrequency;
    window.createInharmonicWaveform = createInharmonicWaveform;
    window.getInharmonicFundamentalFrequency = getInharmonicFundamentalFrequency;
}


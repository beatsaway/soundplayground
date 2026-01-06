/**
 * Velocity-Dependent Timbre Module (Improved)
 * Based on research4: Attack Transient Timbre - Velocity-to-Spectral Content
 * 
 * Implements improved velocity-dependent harmonic brightness with:
 * - Better harmonic rolloff model based on piano string research
 * - Velocity-dependent boost for higher harmonics
 * - Proper odd/even harmonic handling for square waves
 */

/**
 * Calculate velocity-dependent brightness index
 * Based on research4: brightness_index(v) = 1.0 + 0.5*(v/127)^0.7
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Brightness index (1.0 to 1.5)
 */
function calculateBrightnessIndex(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 1.0;
    }
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    return 1.0 + 0.5 * Math.pow(vNorm, 0.7);
}

/**
 * Improved harmonic rolloff based on real piano string research
 * Models: 
 * - Base rolloff: exp(-n * α)
 * - Velocity effect: increases high harmonic content for higher velocities
 * - Odd/even harmonic differences (for square wave simulation)
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Amplitude multiplier for this harmonic (0-1)
 */
function calculateHarmonicRolloff(harmonicNumber, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return Math.exp(-harmonicNumber * 0.15); // Gentler rolloff when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // More realistic model based on piano string research:
    // 1. Base exponential decay (gentler than before)
    const baseRolloff = Math.exp(-harmonicNumber * 0.15);
    
    // 2. Velocity-dependent boost for higher harmonics (research shows this happens)
    const velocityBoost = 1.0 + (vNorm * 0.3 * Math.exp(-harmonicNumber / 10));
    
    // 3. Account for oscillator type (odd harmonics for square waves)
    const oscillatorType = getOscillatorTypeForVelocity(velocity);
    let harmonicFactor = 1.0;
    
    if (oscillatorType === 'square') {
        // Square waves: only odd harmonics, stronger rolloff
        if (harmonicNumber % 2 === 0) return 0; // Even harmonics = 0
        harmonicFactor = 1.0 / harmonicNumber; // 1/n rolloff for square waves
    }
    
    return baseRolloff * velocityBoost * harmonicFactor * (1.0 + vNorm * 0.2);
}

/**
 * Get oscillator type based on velocity (simplified timbre simulation)
 * Higher velocity = brighter sound (more harmonics)
 * 
 * This is a practical approximation for real-time synthesis:
 * - Sine = pure tone (soft velocities)
 * - Triangle = some harmonics (medium velocities)
 * - Square = moderate harmonics (loud velocities) - less harsh than sawtooth
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {string} - Tone.js oscillator type
 */
function getOscillatorTypeForVelocity(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 'sine';
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Use different oscillator types to simulate harmonic content
    // Sine = pure, Triangle = some harmonics, Square = moderate harmonics (less harsh than sawtooth)
    // More gradual transitions for smoother timbre changes
    if (vNorm < 0.4) {
        return 'sine'; // Soft = pure tone
    } else if (vNorm < 0.75) {
        return 'triangle'; // Medium = some harmonics
    } else {
        return 'square'; // Loud = moderate harmonics (square is less harsh than sawtooth)
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateBrightnessIndex = calculateBrightnessIndex;
    window.calculateHarmonicRolloff = calculateHarmonicRolloff;
    window.getOscillatorTypeForVelocity = getOscillatorTypeForVelocity;
}

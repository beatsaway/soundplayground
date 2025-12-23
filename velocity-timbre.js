/**
 * Velocity-Dependent Timbre Module
 * Based on research4: Attack Transient Timbre - Velocity-to-Spectral Content
 * 
 * Implements velocity-dependent harmonic brightness using simplified models:
 * - brightness_index(v) = 1.0 + 0.5*(v/127)^0.7
 * - harmonic_rolloff(n, v) = exp(-n / (brightness_index(v) * 6))
 * 
 * Uses oscillator type switching as a practical approximation for real-time synthesis
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
 * Calculate harmonic rolloff based on velocity
 * Based on research4: harmonic_rolloff(n, v) = exp(-n / (brightness_index(v) * 6))
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Amplitude multiplier for this harmonic (0-1)
 */
function calculateHarmonicRolloff(harmonicNumber, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        // Default: exponential rolloff
        return Math.exp(-harmonicNumber / 6);
    }
    const brightness = calculateBrightnessIndex(velocity);
    return Math.exp(-harmonicNumber / (brightness * 6));
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


/**
 * Advanced Timbre Module
 * Implements smooth timbre transitions using custom waveform generation
 * Based on feedback1 improvements for more natural, musical timbre changes
 * 
 * Features:
 * - Custom dynamic waveforms that evolve with velocity
 * - Smooth transitions instead of abrupt oscillator switching
 * - Waveform caching for performance
 * - Proper harmonic modeling based on piano string research
 */

/**
 * Create dynamic waveform that evolves with velocity
 * Uses additive synthesis principles to build realistic harmonic spectra
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {AudioContext} context - Web Audio API context
 * @returns {PeriodicWave} - Custom periodic wave
 */
function createDynamicWaveform(velocity, context) {
    if (!context || !context.createPeriodicWave) {
        return null; // Fallback if not available
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const real = new Float32Array(4096);
    const imag = new Float32Array(4096);
    
    // Start with sine wave (fundamental)
    real[1] = 1.0; // Fundamental at bin 1
    
    // Add harmonics based on velocity
    const maxHarmonics = Math.floor(1 + vNorm * 20); // Up to 21 harmonics for loudest
    
    for (let n = 2; n <= maxHarmonics && n < 4096; n++) {
        // Realistic harmonic amplitude model
        let amplitude;
        
        if (vNorm < 0.3) {
            // Soft: gentle rolloff
            amplitude = Math.exp(-n * 0.25);
        } else if (vNorm < 0.7) {
            // Medium: piano-like spectrum
            amplitude = Math.exp(-n * 0.15) * (1.0 + 0.3 * vNorm);
        } else {
            // Loud: brighter with some inharmonicity simulation
            const inharmonicity = 1.0 + 0.001 * n * n * vNorm;
            amplitude = Math.exp(-n * 0.12) * (1.0 + 0.5 * vNorm) / inharmonicity;
        }
        
        // Apply velocity brightness
        amplitude *= (1.0 + 0.4 * Math.pow(vNorm, 0.8));
        
        // Clamp amplitude
        amplitude = Math.min(1.0, amplitude);
        
        real[n] = amplitude;
    }
    
    try {
        const wave = context.createPeriodicWave(real, imag, {disableNormalization: true});
        return wave;
    } catch (e) {
        console.warn('Failed to create periodic wave:', e);
        return null;
    }
}

/**
 * Velocity Timbre Manager class
 * Manages dynamic waveforms with caching for performance
 */
class VelocityTimbreManager {
    constructor(audioContext) {
        this.context = audioContext;
        this.sampleRate = audioContext ? audioContext.sampleRate : 44100;
        this.waveCache = new Map(); // Cache dynamic waveforms
    }
    
    /**
     * Get dynamic oscillator for given velocity and frequency
     * Uses cached waveforms for performance
     * 
     * @param {number} velocity - MIDI velocity (0-127)
     * @param {number} frequency - Frequency in Hz
     * @returns {OscillatorNode|null} - Configured oscillator or null if not available
     */
    getDynamicOscillator(velocity, frequency) {
        if (!this.context || !this.context.createOscillator) {
            return null;
        }
        
        const vNorm = velocity / 127.0;
        const key = `${Math.round(vNorm * 10)}-${Math.round(frequency)}`;
        
        // Get or create waveform
        if (!this.waveCache.has(key)) {
            const wave = createDynamicWaveform(velocity, this.context);
            if (wave) {
                this.waveCache.set(key, wave);
            } else {
                return null; // Fallback to standard oscillator
            }
        }
        
        const osc = this.context.createOscillator();
        try {
            osc.setPeriodicWave(this.waveCache.get(key));
            osc.frequency.value = frequency;
            return osc;
        } catch (e) {
            console.warn('Failed to set periodic wave:', e);
            return null;
        }
    }
    
    /**
     * Get filter settings based on velocity
     * Brighter sounds = higher cutoff frequency
     * 
     * @param {number} velocity - MIDI velocity (0-127)
     * @returns {Object} - Filter settings
     */
    getFilterSettings(velocity) {
        const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
        return {
            type: 'lowpass',
            frequency: 20000 * (0.3 + 0.7 * vNorm), // Brighter = higher cutoff
            Q: 1.0,
            gain: 0
        };
    }
    
    /**
     * Clear waveform cache (useful for memory management)
     */
    clearCache() {
        this.waveCache.clear();
    }
}

/**
 * Get oscillator type with smoother transitions
 * Uses blending zones instead of hard switches
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {string} - Tone.js oscillator type
 */
function getOscillatorTypeSmooth(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 'sine';
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Smoother transitions with blending zones
    if (vNorm < 0.3) {
        return 'sine';
    } else if (vNorm < 0.5) {
        // Blend sine -> triangle in this range
        return Math.random() < (vNorm - 0.3) / 0.2 ? 'triangle' : 'sine';
    } else if (vNorm < 0.8) {
        return 'triangle';
    } else if (vNorm < 0.95) {
        // Blend triangle -> square in this range
        return Math.random() < (vNorm - 0.8) / 0.15 ? 'square' : 'triangle';
    } else {
        return 'square';
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.createDynamicWaveform = createDynamicWaveform;
    window.VelocityTimbreManager = VelocityTimbreManager;
    window.getOscillatorTypeSmooth = getOscillatorTypeSmooth;
}


/**
 * Attack Noise Module
 * Implements hammer strike noise component for realistic piano attack transients
 * 
 * Research: Hammer noise is proportional to velocity^1.5
 * Adds filtered noise burst during attack phase (0-20ms)
 * 
 * Formula: N(v, f₀, t) = noise_amplitude(v) × filter(f₀, t)
 * Where noise_amplitude(v) ∝ velocity^1.5
 */

/**
 * Calculate attack noise amplitude based on velocity
 * Research: Hammer noise proportional to velocity^1.5
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Noise amplitude (0-1)
 */
function calculateAttackNoiseAmplitude(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return 0; // No noise when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Noise amplitude ∝ velocity^1.5
    // Range: 0 to 0.15 (15% of note amplitude)
    const maxNoiseAmplitude = 0.15;
    const noiseAmplitude = maxNoiseAmplitude * Math.pow(vNorm, 1.5);
    
    return noiseAmplitude;
}

/**
 * Calculate attack noise duration based on velocity and frequency
 * Higher velocity = longer noise, higher frequency = shorter noise
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Noise duration in seconds
 */
function calculateAttackNoiseDuration(velocity, frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return 0;
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base duration: 5-20ms depending on velocity
    const baseDuration = 0.005 + vNorm * 0.015; // 5-20ms
    
    // Higher frequencies have shorter noise (treble: 5-10ms, bass: 10-20ms)
    const freqFactor = frequency < 200 ? 1.0 : (frequency < 1000 ? 0.8 : 0.6);
    
    return baseDuration * freqFactor;
}

/**
 * Create attack noise filter settings
 * Noise is filtered to match note frequency (brighter notes = brighter noise)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object} - Filter settings for noise
 */
function getAttackNoiseFilterSettings(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return null;
    }
    
    // Noise filter cutoff: 2-5x fundamental frequency
    // Higher notes = higher cutoff (brighter noise)
    const cutoffMultiplier = frequency < 200 ? 2.0 : (frequency < 1000 ? 3.0 : 5.0);
    const cutoffFreq = frequency * cutoffMultiplier;
    
    return {
        type: 'lowpass',
        frequency: Math.min(20000, cutoffFreq), // Cap at 20kHz
        Q: 1.0
    };
}

/**
 * Create attack noise node for a note
 * Returns a Tone.js noise generator with envelope and filter
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object|null} - Noise configuration object, or null if disabled
 */
function createAttackNoiseNode(velocity, frequency) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return null;
    }
    
    if (window.physicsSettings && !window.physicsSettings.attackNoise) {
        return null;
    }
    
    const noiseAmplitude = calculateAttackNoiseAmplitude(velocity);
    const noiseDuration = calculateAttackNoiseDuration(velocity, frequency);
    const filterSettings = getAttackNoiseFilterSettings(frequency);
    
    if (noiseAmplitude <= 0 || noiseDuration <= 0) {
        return null;
    }
    
    // Create noise generator
    const noise = new Tone.Noise('pink'); // Pink noise (more natural than white)
    
    // Create envelope for noise (fast attack, exponential decay)
    const noiseEnvelope = new Tone.AmplitudeEnvelope({
        attack: 0.001, // Very fast attack (1ms)
        decay: noiseDuration * 0.7, // 70% of duration
        sustain: 0.0,
        release: noiseDuration * 0.3 // 30% of duration
    });
    
    // Create filter for noise
    let filter = null;
    if (filterSettings) {
        filter = new Tone.Filter({
            type: filterSettings.type,
            frequency: filterSettings.frequency,
            Q: filterSettings.Q
        });
    }
    
    // Create gain node for amplitude control
    const noiseGain = new Tone.Gain(noiseAmplitude);
    
    // Connect: noise -> filter -> envelope -> gain
    noise.connect(filter || noiseEnvelope);
    if (filter) {
        filter.connect(noiseEnvelope);
    }
    noiseEnvelope.connect(noiseGain);
    
    return {
        noise: noise,
        envelope: noiseEnvelope,
        filter: filter,
        gain: noiseGain,
        start: () => {
            noise.start();
            noiseEnvelope.triggerAttack();
        },
        stop: () => {
            noiseEnvelope.triggerRelease();
            // Stop noise after release
            setTimeout(() => {
                noise.stop();
            }, noiseDuration * 1000 + 100);
        }
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateAttackNoiseAmplitude = calculateAttackNoiseAmplitude;
    window.calculateAttackNoiseDuration = calculateAttackNoiseDuration;
    window.getAttackNoiseFilterSettings = getAttackNoiseFilterSettings;
    window.createAttackNoiseNode = createAttackNoiseNode;
}


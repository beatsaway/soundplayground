/**
 * Release Transient Module
 * Implements key-off sound (damper lift-off) for realistic piano release
 * 
 * Research: Key release creates a transient sound
 * Formula: R(t_rel) - release transient component
 * 
 * This adds realism when keys are released
 */

/**
 * Calculate release transient amplitude
 * Based on current note amplitude and release velocity
 * 
 * @param {number} currentAmplitude - Current note amplitude (0-1)
 * @param {number} releaseVelocity - Release velocity (if available, otherwise use default)
 * @returns {number} - Release transient amplitude (0-1)
 */
function calculateReleaseTransientAmplitude(currentAmplitude, releaseVelocity = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.releaseTransient) {
        return 0; // No transient when disabled
    }
    
    // Release transient is proportional to current amplitude
    // Range: 5-15% of current amplitude
    const baseTransientAmplitude = currentAmplitude * 0.1; // 10% of current
    
    // If release velocity is available, scale by it
    if (releaseVelocity !== null) {
        const vNorm = Math.max(0, Math.min(127, releaseVelocity)) / 127.0;
        return baseTransientAmplitude * (0.5 + 0.5 * vNorm); // 5-15% range
    }
    
    return baseTransientAmplitude;
}

/**
 * Calculate release transient duration
 * Short burst: 10-50ms depending on note frequency
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Transient duration in seconds
 */
function calculateReleaseTransientDuration(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.releaseTransient) {
        return 0;
    }
    
    // Base duration: 20-40ms
    // Higher frequencies = shorter transient
    const baseDuration = 0.03; // 30ms
    
    // Frequency factor: treble = shorter, bass = longer
    const freqFactor = frequency < 200 ? 1.2 : (frequency < 1000 ? 1.0 : 0.7);
    
    return baseDuration * freqFactor;
}

/**
 * Create release transient filter settings
 * Transient is filtered to match note frequency
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object} - Filter settings for transient
 */
function getReleaseTransientFilterSettings(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.releaseTransient) {
        return null;
    }
    
    // Transient filter: bandpass around note frequency
    // Q factor: moderate (2-3) for natural sound
    return {
        type: 'bandpass',
        frequency: frequency,
        Q: 2.5
    };
}

/**
 * Create release transient node
 * Returns a Tone.js oscillator with envelope for key-off sound
 * 
 * @param {number} frequency - Note frequency in Hz
 * @param {number} amplitude - Transient amplitude (0-1)
 * @returns {Object|null} - Transient configuration, or null if disabled
 */
function createReleaseTransientNode(frequency, amplitude) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return null;
    }
    
    if (window.physicsSettings && !window.physicsSettings.releaseTransient) {
        return null;
    }
    
    if (amplitude <= 0) {
        return null;
    }
    
    const duration = calculateReleaseTransientDuration(frequency);
    const filterSettings = getReleaseTransientFilterSettings(frequency);
    
    // Create oscillator for transient (sine wave, filtered)
    const oscillator = new Tone.Oscillator({
        type: 'sine',
        frequency: frequency
    });
    
    // Create envelope (very fast attack, exponential decay)
    const envelope = new Tone.AmplitudeEnvelope({
        attack: 0.001, // 1ms attack
        decay: duration * 0.8, // 80% of duration
        sustain: 0.0,
        release: duration * 0.2 // 20% of duration
    });
    
    // Create filter
    let filter = null;
    if (filterSettings) {
        filter = new Tone.Filter({
            type: filterSettings.type,
            frequency: filterSettings.frequency,
            Q: filterSettings.Q
        });
    }
    
    // Create gain node
    const gain = new Tone.Gain(amplitude);
    
    // Connect: oscillator -> filter -> envelope -> gain
    oscillator.connect(filter || envelope);
    if (filter) {
        filter.connect(envelope);
    }
    envelope.connect(gain);
    
    return {
        oscillator: oscillator,
        envelope: envelope,
        filter: filter,
        gain: gain,
        start: () => {
            oscillator.start();
            envelope.triggerAttack();
        },
        stop: () => {
            envelope.triggerRelease();
            // Stop oscillator after release
            setTimeout(() => {
                oscillator.stop();
            }, duration * 1000 + 100);
        }
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateReleaseTransientAmplitude = calculateReleaseTransientAmplitude;
    window.calculateReleaseTransientDuration = calculateReleaseTransientDuration;
    window.getReleaseTransientFilterSettings = getReleaseTransientFilterSettings;
    window.createReleaseTransientNode = createReleaseTransientNode;
}


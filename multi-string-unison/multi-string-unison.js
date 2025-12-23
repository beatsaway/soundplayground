/**
 * Multi-String Unison Module
 * Implements multiple detuned oscillators per note to simulate piano's multiple strings
 * 
 * Research: Most piano notes have 2-3 strings (except bass which has 1)
 * - Bass (A0-B1): 1 string
 * - Mid (C2-C6): 2-3 strings
 * - Treble (C#6-C8): 3 strings
 * 
 * Each string is slightly detuned: f_string = f_nominal × (1 + ε_j)
 * Where ε_j are small detunings (±0.1-0.3%) creating beating
 * 
 * Beat frequency: |f_string₁ - f_string₂|
 */

/**
 * Get number of strings for a given MIDI note
 * Based on piano acoustics research
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Number of strings (1, 2, or 3)
 */
function getStringCountForNote(midiNote) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.multiStringUnison) {
        return 1; // Single string when disabled
    }
    
    // A0 = 21, B1 = 35, C2 = 36, C6 = 96, C#6 = 97, C8 = 108
    const B1_MIDI = 35;
    const C2_MIDI = 36;
    const C6_MIDI = 96;
    const CSharp6_MIDI = 97;
    
    if (midiNote <= B1_MIDI) {
        // Bass register: 1 string
        return 1;
    } else if (midiNote >= C2_MIDI && midiNote < CSharp6_MIDI) {
        // Mid register: 2-3 strings (transition around C4)
        const C4_MIDI = 60;
        if (midiNote < C4_MIDI) {
            return 2; // Lower mid: 2 strings
        } else {
            return 3; // Upper mid: 3 strings
        }
    } else {
        // Treble register: 3 strings
        return 3;
    }
}

/**
 * Calculate detuning amount for a string in a unison group
 * Creates slight frequency differences (±0.1-0.3%) for natural beating
 * 
 * @param {number} stringIndex - Index of string in unison (0, 1, 2)
 * @param {number} totalStrings - Total number of strings in unison
 * @returns {number} - Detuning factor (1.0 = no detuning, 1.002 = +0.2% sharp)
 */
function calculateStringDetuning(stringIndex, totalStrings) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.multiStringUnison) {
        return 1.0; // No detuning when disabled
    }
    
    if (totalStrings === 1) {
        return 1.0; // Single string: no detuning
    }
    
    // Detuning range: ±0.1% to ±0.3%
    const maxDetuning = 0.003; // 0.3%
    
    // Create symmetric detuning pattern
    // For 2 strings: -0.15%, +0.15%
    // For 3 strings: -0.2%, 0%, +0.2%
    let detuning;
    if (totalStrings === 2) {
        detuning = stringIndex === 0 ? -0.0015 : 0.0015; // -0.15%, +0.15%
    } else if (totalStrings === 3) {
        if (stringIndex === 0) {
            detuning = -0.002; // -0.2%
        } else if (stringIndex === 1) {
            detuning = 0.0; // Perfect tuning (middle string)
        } else {
            detuning = 0.002; // +0.2%
        }
    } else {
        // Fallback: linear distribution
        detuning = (stringIndex - (totalStrings - 1) / 2) * (maxDetuning / (totalStrings - 1));
    }
    
    // Add slight random variation for realism (±0.05%)
    const randomVariation = (Math.random() - 0.5) * 0.0005;
    detuning += randomVariation;
    
    return 1.0 + detuning;
}

/**
 * Create multiple detuned oscillators for a note
 * Returns array of frequency multipliers for unison strings
 * 
 * @param {number} midiNote - MIDI note number
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {Array<number>} - Array of frequency multipliers (one per string)
 */
function createUnisonFrequencies(midiNote, fundamentalFreq) {
    const stringCount = getStringCountForNote(midiNote);
    const frequencies = [];
    
    for (let i = 0; i < stringCount; i++) {
        const detuning = calculateStringDetuning(i, stringCount);
        frequencies.push(fundamentalFreq * detuning);
    }
    
    return frequencies;
}

/**
 * Calculate beat frequency between two detuned strings
 * Beat frequency = |f₁ - f₂|
 * 
 * @param {number} freq1 - First string frequency in Hz
 * @param {number} freq2 - Second string frequency in Hz
 * @returns {number} - Beat frequency in Hz
 */
function calculateBeatFrequency(freq1, freq2) {
    return Math.abs(freq1 - freq2);
}

/**
 * Apply multi-string unison to a Tone.js synth note
 * Creates multiple voices with slight detuning
 * 
 * Note: Tone.js PolySynth doesn't easily support per-voice frequency modulation
 * This function provides the detuning values that would need to be applied
 * via custom synth architecture or multiple synth instances
 * 
 * @param {number} midiNote - MIDI note number
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {Object} - Unison configuration with frequencies and amplitudes
 */
function createUnisonConfiguration(midiNote, fundamentalFreq, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.multiStringUnison) {
        // Single string when disabled
        return {
            stringCount: 1,
            frequencies: [fundamentalFreq],
            amplitudes: [1.0]
        };
    }
    
    const stringCount = getStringCountForNote(midiNote);
    const frequencies = createUnisonFrequencies(midiNote, fundamentalFreq);
    
    // Calculate amplitudes (slightly different per string for realism)
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const baseAmplitude = 1.0 / Math.sqrt(stringCount); // Normalize for constant total energy
    
    const amplitudes = [];
    for (let i = 0; i < stringCount; i++) {
        // Slight amplitude variation (±5%)
        const amplitudeVariation = 1.0 + (Math.random() - 0.5) * 0.1;
        amplitudes.push(baseAmplitude * amplitudeVariation);
    }
    
    return {
        stringCount: stringCount,
        frequencies: frequencies,
        amplitudes: amplitudes
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getStringCountForNote = getStringCountForNote;
    window.calculateStringDetuning = calculateStringDetuning;
    window.createUnisonFrequencies = createUnisonFrequencies;
    window.calculateBeatFrequency = calculateBeatFrequency;
    window.createUnisonConfiguration = createUnisonConfiguration;
}


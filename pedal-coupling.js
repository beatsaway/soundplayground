/**
 * Pedal Coupling Module
 * Based on research4: The "Sustain" Illusion - Pedal Physics
 * 
 * Simulates sympathetic vibrations between strings when sustain pedal is active.
 * Implements simplified coupling model with CPU optimizations:
 * - Limits coupling to 8 nearest notes to prevent performance issues
 * - Uses frequency matching function: C(f_i, f_j) = exp(-|f_i - f_j|/f_band)
 * - Detects harmonic relationships for enhanced coupling
 * 
 * Formula:
 * τ_pedal(v) = τ_natural * (1 + 2.5*pedal_position*(1 + 0.1*(v/127)^0.3))
 */

/**
 * Calculate simplified pedal coupling gain between two frequencies
 * @param {number} freq - Frequency of the note
 * @param {number} otherFreq - Frequency of another active note
 * @param {number} pedalPosition - Pedal position (0-1)
 * @returns {number} - Coupling gain (0-1)
 */
function calculatePedalCoupling(freq, otherFreq, pedalPosition) {
    if (typeof window !== 'undefined' && window.physicsSettings && (!window.physicsSettings.pedalCoupling || pedalPosition < 0.5)) {
        return 0;
    }
    
    // Frequency matching function: C(f_i, f_j) = exp(-|f_i - f_j|/f_band)
    const freqDiff = Math.abs(freq - otherFreq);
    const fBand = 100; // Bandwidth for coupling (Hz)
    const coupling = Math.exp(-freqDiff / fBand);
    
    // Check for harmonic relationships (1:1, 2:1, 3:2, etc.)
    const ratio = Math.max(freq, otherFreq) / Math.min(freq, otherFreq);
    const harmonicBoost = (ratio <= 1.1 || (ratio >= 1.9 && ratio <= 2.1) || (ratio >= 2.9 && ratio <= 3.1)) ? 1.5 : 1.0;
    
    return coupling * harmonicBoost * pedalPosition * 0.1; // Scale down for subtlety
}

/**
 * Apply pedal coupling to active notes (CPU-optimized)
 * Limits coupling to 8 nearest notes to prevent performance issues
 * 
 * Note: This function requires access to activeNotes and midiNoteToFrequency
 * which should be provided by the main application
 * 
 * @param {number} freq - Frequency of the newly struck note
 * @param {number} velocity - Velocity of the newly struck note
 * @param {number} pedalPosition - Pedal position (0-1)
 * @param {Map|Set} activeNotes - Map/Set of currently active MIDI notes
 * @param {Function} midiNoteToFrequency - Function to convert MIDI note to frequency
 * @returns {number} - Additional amplitude from coupling
 */
function applyPedalCoupling(freq, velocity, pedalPosition, activeNotes, midiNoteToFrequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && (!window.physicsSettings.pedalCoupling || pedalPosition < 0.5)) {
        return 0;
    }
    
    if (!activeNotes || activeNotes.size === 0) {
        return 0;
    }
    
    if (!midiNoteToFrequency) {
        console.warn('midiNoteToFrequency function not provided to applyPedalCoupling');
        return 0;
    }
    
    // CPU optimization: Only check up to 8 nearest notes
    const maxCouplingChecks = 8;
    let couplingGain = 0;
    
    // Get active notes sorted by frequency proximity
    const activeFreqs = Array.from(activeNotes.keys()).map(midiNote => ({
        midiNote,
        freq: midiNoteToFrequency(midiNote)
    })).sort((a, b) => Math.abs(a.freq - freq) - Math.abs(b.freq - freq));
    
    // Apply coupling to nearest notes
    for (let i = 0; i < Math.min(maxCouplingChecks, activeFreqs.length); i++) {
        const otherFreq = activeFreqs[i].freq;
        if (Math.abs(otherFreq - freq) < 2000) { // Only couple within 2kHz
            const coupling = calculatePedalCoupling(freq, otherFreq, pedalPosition);
            couplingGain += coupling;
        }
    }
    
    // Scale based on number of active notes (more notes = more coupling)
    const scaleFactor = Math.min(1.0, activeNotes.size / 10);
    return couplingGain * scaleFactor * 0.3; // Final scaling for subtlety
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculatePedalCoupling = calculatePedalCoupling;
    window.applyPedalCoupling = applyPedalCoupling;
}


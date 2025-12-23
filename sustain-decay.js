/**
 * Sustain Decay Module
 * Based on research4: The "Sustain" Illusion - Pedal Physics
 * 
 * Implements pitch-dependent gradual decay for sustained notes when sustain pedal is active.
 * Real pianos have slow decay even with sustain pedal - notes don't sustain forever.
 * 
 * Research indicates: τ_life ≈ 1-10 seconds depending on note (research4, line 132)
 * With pedal: τ_pedal = τ_natural * (1 + 2.5*pedal_position)
 * 
 * Lower notes decay slower (longer sustain), higher notes decay faster (shorter sustain)
 */

/**
 * Calculate sustain decay time constant based on MIDI note number
 * Formula: T_sustain(n) = T0 * 2^(-n/12 * k)
 * This is the time to decay to ~37% of amplitude (1/e) while holding
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Sustain decay time constant in seconds
 */
function calculateSustainDecayTime(midiNote) {
    const A0_MIDI = 21; // A0 MIDI note number
    const T0 = 12.0; // Base sustain decay time in seconds for A0
    const k = 3.0; // Decay factor (halving roughly every 4 semitones)
    
    const semitoneOffset = midiNote - A0_MIDI;
    const sustainDecayTime = T0 * Math.pow(2, -semitoneOffset / 12 * k);
    
    // Clamp to reasonable range: 0.06s (60ms) to 15.0s
    return Math.max(0.06, Math.min(15.0, sustainDecayTime));
}

/**
 * Start gradual decay for a sustained note
 * Real pianos have slow decay even with sustain pedal active
 * Uses Tone.js Transport scheduling to release notes after decay time
 * 
 * @param {number} midiNote - MIDI note number
 * @param {string} noteName - Note name (e.g., "C4")
 * @param {Object} dependencies - Required dependencies from main.js
 * @param {Map} dependencies.sustainedNotes - Set of sustained notes
 * @param {Set} dependencies.physicallyHeldNotes - Set of physically held notes
 * @param {Map} dependencies.activeNotes - Map of active notes
 * @param {Map} dependencies.sustainDecayAutomations - Map to store automations
 * @param {Map} dependencies.noteVolumeNodes - Map to store volume nodes
 * @param {Object} dependencies.synth - Tone.js PolySynth instance
 */
function startSustainDecay(midiNote, noteName, dependencies) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.sustainDecay) {
        // Feature disabled - notes will sustain forever (original behavior)
        return;
    }
    
    const { sustainedNotes, physicallyHeldNotes, activeNotes, sustainDecayAutomations, noteVolumeNodes, synth } = dependencies;
    
    // Calculate decay time based on note frequency (lower notes decay slower)
    // Research indicates: τ_life ≈ 1-10 seconds depending on note (research4, line 132)
    // With pedal, sustain time is extended but still pitch-dependent
    const baseSustainDecayTime = calculateSustainDecayTime(midiNote);
    // With pedal, sustain is extended (research4: κ ≈ 2-4x extension)
    // Using 2.5x multiplier as per research formula: τ_pedal = τ_natural * (1 + 2.5*pedal_position)
    const sustainDecayTime = baseSustainDecayTime * 2.5; // Extended sustain with pedal, still pitch-dependent
    
    // Cancel any existing decay automation for this note
    if (sustainDecayAutomations.has(midiNote)) {
        const existing = sustainDecayAutomations.get(midiNote);
        if (existing && existing.cancel) {
            existing.cancel();
        }
        // Clean up volume node if it exists
        if (existing && existing.volumeNode) {
            existing.volumeNode.dispose();
            noteVolumeNodes.delete(noteName);
        }
    }
    
    // Calculate exponential decay parameters
    const startTime = Tone.now();
    const timeConstant = sustainDecayTime / 3; // Time to decay to ~37% (1/e)
    
    // Store the automation info
    const automation = {
        startTime: startTime,
        decayTime: sustainDecayTime,
        timeConstant: timeConstant,
        volumeNode: null,
        cancel: null
    };
    
    // Set a longer release time for this sustained note when it eventually releases
    // This ensures a smooth, gradual fade-out that matches the sustain decay time
    const longReleaseTime = Math.min(8.0, sustainDecayTime * 0.5); // Release phase is 50% of total decay, max 8s
    
    // Update the synth's release time for sustained notes
    // Note: This affects all voices, but it's the best we can do with PolySynth
    synth.set({
        envelope: {
            release: longReleaseTime
        }
    });
    
    // Schedule the release after the sustain decay time
    // The long release envelope will handle a smooth fade-out
    const releaseSchedule = Tone.Transport.scheduleOnce(() => {
        if (sustainedNotes.has(midiNote) && !physicallyHeldNotes.has(midiNote)) {
            // Only release if still sustained and not physically held
            try {
                synth.triggerRelease(noteName);
            } catch (e) {
                // Ignore errors
            }
            activeNotes.delete(midiNote);
            sustainedNotes.delete(midiNote);
            sustainDecayAutomations.delete(midiNote);
            // Clean up volume node if it exists
            if (noteVolumeNodes.has(noteName)) {
                const volNode = noteVolumeNodes.get(noteName);
                volNode.dispose();
                noteVolumeNodes.delete(noteName);
            }
        }
    }, startTime + sustainDecayTime);
    
    automation.cancel = () => {
        Tone.Transport.clear(releaseSchedule);
        if (automation.volumeNode) {
            automation.volumeNode.dispose();
            noteVolumeNodes.delete(noteName);
        }
    };
    
    sustainDecayAutomations.set(midiNote, automation);
    
    // Note: Since Tone.js PolySynth doesn't allow per-voice volume control,
    // we schedule the release after the decay time. The note will stay at sustain level
    // until release, then fade out smoothly with the long release envelope.
    // This approximates real piano behavior where notes sustain for a long time
    // before gradually fading away.
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateSustainDecayTime = calculateSustainDecayTime;
    window.startSustainDecay = startSustainDecay;
}


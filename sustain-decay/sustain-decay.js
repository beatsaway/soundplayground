/**
 * Sustain Decay Module
 * Based on research4: The "Sustain" Illusion - Pedal Physics
 * 
 * Implements pitch-dependent time-based release for sustained notes when sustain pedal is active.
 * Real pianos have slow decay even with sustain pedal - notes don't sustain forever.
 * 
 * NOTE: This module currently implements time-based release (releases after decay time) rather than
 * gradual volume decay during sustain, due to Tone.js PolySynth limitations with per-voice volume control.
 * The name "Sustain Decay" reflects the intended behavior, but the current implementation schedules
 * a release after the calculated decay time, then uses the release envelope for fade-out.
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
    // Use settings if available, otherwise use defaults
    const T0 = (window.sustainDecaySettings && window.sustainDecaySettings.baseTime) ? window.sustainDecaySettings.baseTime : 12.0;
    const k = (window.sustainDecaySettings && window.sustainDecaySettings.decayFactor) ? window.sustainDecaySettings.decayFactor : 2.5;
    
    const semitoneOffset = midiNote - A0_MIDI;
    const sustainDecayTime = T0 * Math.pow(2, -semitoneOffset / 12 * k);
    
    // Clamp to reasonable range: 0.5s (500ms) to 15.0s
    // Increased minimum from 0.06s to 0.5s so high notes still sustain for a noticeable time
    return Math.max(0.5, Math.min(15.0, sustainDecayTime));
}

/**
 * Start time-based release for a sustained note
 * Real pianos have slow decay even with sustain pedal active
 * Uses Tone.js Transport scheduling to release notes after decay time
 * 
 * NOTE: Currently implements time-based release rather than gradual volume decay during sustain.
 * The note stays at sustain level, then releases after the decay time and fades out via release envelope.
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
    // Use settings if available, otherwise use default 2.5x multiplier
    const pedalMultiplier = (window.sustainDecaySettings && window.sustainDecaySettings.pedalMultiplier) ? window.sustainDecaySettings.pedalMultiplier : 2.5;
    const sustainDecayTime = baseSustainDecayTime * pedalMultiplier; // Extended sustain with pedal, still pitch-dependent
    
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
    
    // Ensure Tone.Transport is started (required for scheduled events)
    if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
    }
    
    // Get target volume level from settings (default: 0.05 = 5%)
    const targetVolumeLevel = (window.sustainDecaySettings && window.sustainDecaySettings.targetVolumeLevel !== undefined) 
        ? window.sustainDecaySettings.targetVolumeLevel 
        : 0.05;
    
    // Calculate exponential decay parameters
    const startTime = Tone.now();
    const endTime = startTime + sustainDecayTime;
    
    // Store the automation info
    const automation = {
        startTime: startTime,
        decayTime: sustainDecayTime,
        endTime: endTime,
        targetVolumeLevel: targetVolumeLevel,
        volumeNode: null,
        cancel: null
    };
    
    // Set a longer release time for this sustained note when it eventually releases
    const longReleaseTime = Math.min(8.0, Math.max(1.0, sustainDecayTime * 0.5)); // Release phase is 50% of total decay, min 1s, max 8s
    
    // Update the synth's release time for sustained notes
    synth.set({
        envelope: {
            release: longReleaseTime
        }
    });
    
    // Schedule the release after the sustain decay time
    // The note will stay at sustain level until release, then fade out smoothly via release envelope
    // 
    // LIMITATION: Per-note gradual volume decay during sustain is not easily achievable with Tone.js PolySynth
    // as it doesn't support per-voice volume control. The target volume level setting exists but is not
    // currently used. The note releases after the decay time, and the release envelope fades from
    // current sustain level to 0. This is why the module is named "Sustain Decay" (intended behavior)
    // but currently only implements time-based release (actual behavior).
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
    }, endTime);
    
    automation.cancel = () => {
        Tone.Transport.clear(releaseSchedule);
        if (automation.volumeNode) {
            automation.volumeNode.dispose();
            noteVolumeNodes.delete(noteName);
        }
    };
    
    sustainDecayAutomations.set(midiNote, automation);
    
    // Note: The target volume level setting is stored but not yet used for gradual decay
    // due to Tone.js PolySynth limitations with per-voice volume control.
    // The note will release after the decay time, and the release envelope handles the fade-out.
    // 
    // The module name "Sustain Decay" reflects the intended behavior (gradual decay during sustain),
    // but the current implementation is time-based release (releases after decay time, then fades out).
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateSustainDecayTime = calculateSustainDecayTime;
    window.startSustainDecay = startSustainDecay;
}


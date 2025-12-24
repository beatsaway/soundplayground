/**
 * Attack Darkening Filter Module
 * Implements per-note low-pass filter that starts dark (low cutoff) when note attacks
 * and stays dark, creating a natural attack character
 * 
 * This works alongside the spectral balance filter and dynamic filter:
 * - Spectral balance: Global high-shelf filter for overall spectral shaping
 * - Dynamic filter: Global filter that closes as notes decay
 * - Attack darkening: Per-note filter that keeps notes dark at attack
 */

// Global attack darkening filter (shared by all notes since PolySynth output is shared)
let attackDarkeningFilter = null;

// Track per-note attack darkening data (for calculating filter cutoff)
const attackDarkeningData = new Map(); // midiNote -> { attackTimestamp: number, initialCutoff: number, targetCutoff: number, frequency: number }

/**
 * Calculate normal (bright) cutoff based on velocity and note frequency
 * This is what the cutoff would be without darkening
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Normal cutoff frequency in Hz
 */
function getNormalCutoff(velocity, frequency) {
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base cutoff: keytracked (higher notes = higher base cutoff)
    const keytrackedBase = Math.min(20000, frequency * 20);
    
    // Velocity effect: louder = brighter = higher cutoff
    // Range: 0.8x to 1.0x of keytracked base
    const velocityMultiplier = 0.8 + 0.2 * vNorm;
    
    const normalCutoff = keytrackedBase * velocityMultiplier;
    
    // Clamp to reasonable range (200 Hz to 20 kHz)
    return Math.max(200, Math.min(20000, normalCutoff));
}

/**
 * Calculate initial filter cutoff (dark) based on velocity, note frequency, and darkening amount
 * Applies darkening amount multiplier to normal cutoff
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Initial cutoff frequency in Hz (dark)
 */
function getInitialAttackDarkeningCutoff(velocity, frequency) {
    if (typeof window !== 'undefined' && window.attackDarkeningSettings && !window.attackDarkeningSettings.enabled) {
        return 20000; // No filtering when disabled
    }
    
    const normalCutoff = getNormalCutoff(velocity, frequency);
    
    // Apply darkening amount multiplier (from settings, default 0.3 = 30%)
    const darkeningAmount = (window.attackDarkeningSettings && window.attackDarkeningSettings.darkeningAmount !== undefined)
        ? window.attackDarkeningSettings.darkeningAmount
        : 0.3; // Default: 30%
    
    const initialCutoff = normalCutoff * darkeningAmount;
    
    // Clamp to reasonable range (100 Hz to 20 kHz)
    return Math.max(100, Math.min(20000, initialCutoff));
}

/**
 * Calculate target filter cutoff (bright) that filter returns to after darkening duration
 * This is the normal cutoff (without darkening)
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Target cutoff frequency in Hz (bright/normal)
 */
function getTargetAttackDarkeningCutoff(velocity, frequency) {
    if (typeof window !== 'undefined' && window.attackDarkeningSettings && !window.attackDarkeningSettings.enabled) {
        return 20000; // No filtering when disabled
    }
    
    // Return normal cutoff (bright)
    return getNormalCutoff(velocity, frequency);
}

/**
 * Calculate filter cutoff at a given time after note attack
 * Filter plays normally (bright) during hold duration, then transitions to dark over attack time, then stays dark
 * 
 * @param {number} initialCutoff - Initial cutoff frequency in Hz (dark)
 * @param {number} targetCutoff - Target cutoff frequency in Hz (bright/normal)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} frequency - Note frequency in Hz (not used, kept for compatibility)
 * @returns {number} - Current cutoff frequency in Hz
 */
function getAttackDarkeningCutoffAtTime(initialCutoff, targetCutoff, timeSinceAttack, frequency) {
    if (typeof window !== 'undefined' && window.attackDarkeningSettings && !window.attackDarkeningSettings.enabled) {
        return 20000; // No filtering when disabled
    }
    
    // Get hold duration from settings (default: 0.2 seconds)
    const holdDuration = (window.attackDarkeningSettings && window.attackDarkeningSettings.holdDuration !== undefined)
        ? window.attackDarkeningSettings.holdDuration
        : 0.2; // Default: 200ms
    
    // Get darkening attack time from settings (default: 0.1 seconds)
    const darkeningAttackTime = (window.attackDarkeningSettings && window.attackDarkeningSettings.darkeningDuration !== undefined)
        ? window.attackDarkeningSettings.darkeningDuration
        : 0.1; // Default: 100ms
    
    // During hold duration: play normally (bright)
    if (timeSinceAttack < holdDuration) {
        return targetCutoff;
    }
    
    // After hold duration: transition from bright to dark over attack time
    const timeSinceDarkeningStarted = timeSinceAttack - holdDuration;
    
    if (timeSinceDarkeningStarted < darkeningAttackTime) {
        // During transition: interpolate from bright to dark
        const transitionProgress = timeSinceDarkeningStarted / darkeningAttackTime;
        // Exponential transition for smooth fade
        const easedProgress = 1 - Math.exp(-transitionProgress * 5);
        const cutoffRange = targetCutoff - initialCutoff;
        const currentCutoff = targetCutoff - (cutoffRange * easedProgress);
        return Math.max(initialCutoff, Math.min(targetCutoff, currentCutoff));
    }
    
    // After transition completes: stay dark
    return initialCutoff;
}

/**
 * Create and configure an attack darkening filter for a note
 * Returns filter settings that can be applied to a Tone.js filter
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @returns {Object} - Filter settings for Tone.js
 */
function getAttackDarkeningFilterSettings(velocity, frequency, timeSinceAttack) {
    const initialCutoff = getInitialAttackDarkeningCutoff(velocity, frequency);
    const targetCutoff = getTargetAttackDarkeningCutoff(velocity, frequency);
    const currentCutoff = getAttackDarkeningCutoffAtTime(initialCutoff, targetCutoff, timeSinceAttack, frequency);
    
    return {
        type: 'lowpass',
        frequency: currentCutoff,
        Q: 1.0, // Moderate resonance
        gain: 0
    };
}

/**
 * Initialize global attack darkening filter
 * This is a shared filter for all notes (since PolySynth output is shared)
 * 
 * @returns {Tone.Filter|null} - Filter node, or null if disabled/error
 */
function initializeAttackDarkeningFilter() {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return null;
    }
    
    if (window.attackDarkeningSettings && !window.attackDarkeningSettings.enabled) {
        return null;
    }
    
    if (attackDarkeningFilter) {
        return attackDarkeningFilter;
    }
    
    try {
        // Create filter starting fully open (will be darkened when notes attack)
        attackDarkeningFilter = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000, // Start fully open
            Q: 1.0
        });
        
        return attackDarkeningFilter;
    } catch (e) {
        console.warn('Failed to initialize attack darkening filter:', e);
        return null;
    }
}

/**
 * Track attack darkening data for a specific note
 * This stores metadata used to calculate the filter cutoff
 * 
 * @param {number} midiNote - MIDI note number (0-127)
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 */
function trackAttackDarkeningNote(midiNote, velocity, frequency) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    if (window.attackDarkeningSettings && !window.attackDarkeningSettings.enabled) {
        return;
    }
    
    const initialCutoff = getInitialAttackDarkeningCutoff(velocity, frequency);
    const targetCutoff = getTargetAttackDarkeningCutoff(velocity, frequency);
    
    // Store attack data for this note
    attackDarkeningData.set(midiNote, {
        attackTimestamp: Tone.now(),
        initialCutoff: initialCutoff,
        targetCutoff: targetCutoff,
        frequency: frequency
    });
}

/**
 * Update global attack darkening filter based on all active notes
 * Applies the darkest cutoff needed (from all active notes)
 * Notes start dark, then transition to normal after darkening duration
 * Should be called periodically (e.g., in animation loop)
 */
function updateAttackDarkeningFilter() {
    if (typeof window === 'undefined' || typeof window.attackDarkeningSettings === 'undefined' || !window.attackDarkeningSettings.enabled) {
        return;
    }
    
    const filter = initializeAttackDarkeningFilter();
    if (!filter || attackDarkeningData.size === 0) {
        // No active notes - open filter fully
        if (filter) {
            filter.frequency.rampTo(20000, 0.1);
        }
        return;
    }
    
    const now = Tone.now();
    let minCutoff = 20000; // Start with fully open
    
    // Find the darkest cutoff needed (minimum cutoff from all active notes)
    // Each note transitions from dark to bright based on its age and darkening duration
    attackDarkeningData.forEach((noteData, midiNote) => {
        const timeSinceAttack = now - noteData.attackTimestamp;
        const currentCutoff = getAttackDarkeningCutoffAtTime(
            noteData.initialCutoff,
            noteData.targetCutoff,
            timeSinceAttack,
            noteData.frequency
        );
        minCutoff = Math.min(minCutoff, currentCutoff);
    });
    
    // Smoothly update filter to darkest needed cutoff
    filter.frequency.rampTo(minCutoff, 0.01);
}

/**
 * Remove attack darkening data for a specific note
 * Should be called when note is released
 * 
 * @param {number} midiNote - MIDI note number (0-127)
 */
function removeAttackDarkeningNote(midiNote) {
    attackDarkeningData.delete(midiNote);
}

/**
 * Get the global attack darkening filter
 * @returns {Tone.Filter|null} - The global filter node
 */
function getAttackDarkeningFilter() {
    return initializeAttackDarkeningFilter();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getInitialAttackDarkeningCutoff = getInitialAttackDarkeningCutoff;
    window.getTargetAttackDarkeningCutoff = getTargetAttackDarkeningCutoff;
    window.getAttackDarkeningCutoffAtTime = getAttackDarkeningCutoffAtTime;
    window.getAttackDarkeningFilterSettings = getAttackDarkeningFilterSettings;
    window.initializeAttackDarkeningFilter = initializeAttackDarkeningFilter;
    window.getAttackDarkeningFilter = getAttackDarkeningFilter;
    window.trackAttackDarkeningNote = trackAttackDarkeningNote;
    window.updateAttackDarkeningFilter = updateAttackDarkeningFilter;
    window.removeAttackDarkeningNote = removeAttackDarkeningNote;
}


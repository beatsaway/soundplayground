/**
 * Time-Varying Brightness Module
 * Based on feedback1: Real instruments have harmonic content that evolves during the note
 * 
 * Features:
 * - Brightness peaks during attack phase
 * - Gradual decay of brightness after attack
 * - Velocity-dependent brightness evolution
 */

/**
 * Calculate time-varying brightness (harmonic content evolves during note)
 * Brightness peaks during attack, then gradually decays
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @returns {number} - Brightness multiplier (1.0 = normal, >1.0 = brighter)
 */
function getTimeVaryingBrightness(velocity, timeSinceAttack) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.timeVaryingBrightness) {
        return 1.0; // No brightness variation when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Get attack time (velocity-dependent)
    const attackTime = window.getAttackTimeForVelocity ? 
        window.getAttackTimeForVelocity(velocity) : 0.01;
    
    if (timeSinceAttack < attackTime) {
        // During attack: brightness peaks
        const attackProgress = timeSinceAttack / attackTime;
        return 1.0 + 0.3 * Math.sin(attackProgress * Math.PI) * vNorm;
    } else {
        // After attack: gradual decay of brightness
        const decayTime = 0.5 + (1.0 - vNorm) * 2.0; // Louder = longer decay
        const decayProgress = Math.min(1.0, (timeSinceAttack - attackTime) / decayTime);
        return 1.0 + 0.2 * (1.0 - decayProgress) * vNorm;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getTimeVaryingBrightness = getTimeVaryingBrightness;
}


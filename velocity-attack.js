/**
 * Velocity-Dependent Attack Time Module
 * Based on feedback1: Real instruments have velocity-dependent attack characteristics
 * 
 * Research: Higher velocity = faster attack
 * This module calculates attack time based on velocity for more realistic piano response
 */

/**
 * Calculate velocity-dependent attack time
 * Research: higher velocity = faster attack
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Attack time in seconds
 */
function getAttackTimeForVelocity(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityAttack) {
        return 0.005; // Default attack time
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    // Higher velocity = faster attack (0.01s to 0.2s range)
    // Soft notes have slower attack, loud notes have faster attack
    return 0.01 + (1.0 - vNorm) * 0.19;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getAttackTimeForVelocity = getAttackTimeForVelocity;
}


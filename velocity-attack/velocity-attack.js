/**
 * Velocity-Dependent Attack Time Module
 * Based on feedback1: Real instruments have velocity-dependent attack characteristics
 * 
 * Research: Higher velocity = faster attack
 * This module calculates attack time based on velocity for more realistic piano response
 */

/**
 * Calculate velocity-dependent attack time
 * Piano research: Attack is VERY fast (1-5ms), with slight variation by velocity
 * Higher velocity = slightly faster attack (but still very fast overall)
 * 
 * Real piano: Attack is 1-3ms typically, never slower than 5ms
 * The "soft" sound comes from amplitude, not slow attack
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Attack time in seconds
 */
function getAttackTimeForVelocity(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityAttack) {
        return 0.002; // Default piano-like attack (2ms)
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    // Piano attack: 1-5ms range (very fast!)
    // Higher velocity = slightly faster attack (1-3ms), lower velocity = slightly slower (3-5ms)
    // But all are very fast - the "softness" comes from amplitude, not attack time
    return 0.001 + (1.0 - vNorm) * 0.004; // Range: 1ms to 5ms
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getAttackTimeForVelocity = getAttackTimeForVelocity;
}


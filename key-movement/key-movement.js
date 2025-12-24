/**
 * Key Movement Module
 * Handles key up/down movement effects with animation options
 */

(function() {
    'use strict';
    
    // Settings
    window.keyMovementSettings = {
        enabled: true, // Default: ON
        animationStyle: 'instant', // 'none', 'instant', 'animated' - Default: 'instant' for immediate movement
        pressDepth: 0.7, // 70% of key height
        animationDuration: 0.1 // seconds for animated style
    };
    
    // Animation state tracking
    const keyAnimations = new Map(); // midiNote -> { startTime, startY, targetY, easing }
    
    /**
     * Initialize the key movement module
     */
    window.initKeyMovement = function() {
        // Module initialized
    };
    
    /**
     * Easing function for smooth animation (ease-out)
     * @param {number} t - Time (0 to 1)
     * @returns {number} - Eased value
     */
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Update key animations (call this in animation loop)
     * @param {number} currentTime - Current time in seconds
     */
    window.updateKeyAnimations = function(currentTime) {
        if (window.keyMovementSettings.animationStyle !== 'animated') {
            return;
        }
        
        keyAnimations.forEach((anim, midiNote) => {
            const elapsed = currentTime - anim.startTime;
            const progress = Math.min(elapsed / window.keyMovementSettings.animationDuration, 1);
            const eased = easeOut(progress);
            
            const currentY = anim.startY + (anim.targetY - anim.startY) * eased;
            anim.keyData.mesh.position.y = currentY;
            
            if (progress >= 1) {
                // Animation complete
                keyAnimations.delete(midiNote);
            }
        });
    };
    
    /**
     * Move key down (press effect)
     * @param {Object} keyData - Key data from keyMap
     * @param {number} keyHeight - Height of the key
     */
    window.pressKeyMovement = function(keyData, keyHeight) {
        if (!window.keyMovementSettings.enabled || !keyData) return;
        
        // If key is already pressed, reset it first
        if (keyData.isPressed) {
            window.releaseKeyMovement(keyData, keyHeight);
        }
        
        // Ensure we have originalY
        if (keyData.originalY === undefined) {
            keyData.originalY = keyData.mesh.position.y;
        }
        
        // Get midiNote from keyData
        const midiNote = keyData.midiNote;
        if (midiNote === undefined || midiNote === null) return;
        
        const pressDepth = keyHeight * window.keyMovementSettings.pressDepth;
        const targetY = keyData.originalY - pressDepth;
        
        // Cancel any existing animation
        keyAnimations.delete(midiNote);
        
        switch (window.keyMovementSettings.animationStyle) {
            case 'none':
                // No movement
                break;
            case 'instant':
                // Instant position change
                keyData.mesh.position.y = targetY;
                break;
            case 'animated':
                // Animated movement
                const startTime = performance.now() / 1000; // Convert to seconds
                keyAnimations.set(midiNote, {
                    startTime: startTime,
                    startY: keyData.mesh.position.y,
                    targetY: targetY,
                    keyData: keyData
                });
                break;
            default:
                // Fallback to instant
                keyData.mesh.position.y = targetY;
                break;
        }
    };
    
    /**
     * Move key up (release effect)
     * @param {Object} keyData - Key data from keyMap
     * @param {number} keyHeight - Height of the key
     */
    window.releaseKeyMovement = function(keyData, keyHeight) {
        if (!keyData) return;
        
        // Get midiNote from keyData
        const midiNote = keyData.midiNote;
        if (midiNote !== undefined && midiNote !== null) {
            // Cancel any existing animation
            keyAnimations.delete(midiNote);
        }
        
        if (keyData.originalY === undefined) {
            // Fallback: calculate original position
            if (keyData.isBlack) {
                keyData.originalY = keyHeight + (keyHeight * 0.7) / 2; // Approximate
            } else {
                keyData.originalY = keyHeight / 2;
            }
        }
        
        const targetY = keyData.originalY;
        
        switch (window.keyMovementSettings.animationStyle) {
            case 'none':
                // No movement
                break;
            case 'instant':
                // Instant position change
                keyData.mesh.position.y = targetY;
                break;
            case 'animated':
                // Animated movement
                if (midiNote !== undefined && midiNote !== null) {
                    const startTime = performance.now() / 1000; // Convert to seconds
                    keyAnimations.set(midiNote, {
                        startTime: startTime,
                        startY: keyData.mesh.position.y,
                        targetY: targetY,
                        keyData: keyData
                    });
                } else {
                    // Fallback to instant if no midiNote
                    keyData.mesh.position.y = targetY;
                }
                break;
        }
    };
    
    console.log('Key Movement module loaded');
})();


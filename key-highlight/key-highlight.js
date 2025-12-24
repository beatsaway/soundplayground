/**
 * Key Highlight Module
 * Handles yellow tint highlighting when keys are pressed
 */

(function() {
    'use strict';
    
    // Settings
    window.keyHighlightSettings = {
        enabled: false, // Default: OFF
        whiteKeyColor: 0xffff88, // Yellowish glow
        blackKeyColor: 0x888844, // Lighter grey with glow
        emissiveIntensity: 0.3
    };
    
    // Create pressed materials
    let whiteKeyPressedMaterial = null;
    let blackKeyPressedMaterial = null;
    
    /**
     * Initialize the key highlight module
     * @param {THREE.MeshPhysicalMaterial} whiteKeyMaterial - Base white key material
     * @param {THREE.MeshPhysicalMaterial} blackKeyMaterial - Base black key material
     */
    window.initKeyHighlight = function(whiteKeyMaterial, blackKeyMaterial) {
        // Check if THREE is available and fully loaded
        if (typeof THREE === 'undefined' || !THREE.MeshPhysicalMaterial) {
            // Silently return - initialization will be retried by the caller
            return;
        }
        
        whiteKeyPressedMaterial = new THREE.MeshPhysicalMaterial({
            color: window.keyHighlightSettings.whiteKeyColor,
            metalness: 0.0,
            roughness: 0.3,
            clearcoat: 0.5,
            clearcoatRoughness: 0.2,
            reflectivity: 0.5,
            emissive: 0x444422,
            emissiveIntensity: window.keyHighlightSettings.emissiveIntensity
        });
        
        blackKeyPressedMaterial = new THREE.MeshPhysicalMaterial({
            color: window.keyHighlightSettings.blackKeyColor,
            metalness: 0.0,
            roughness: 0.4,
            clearcoat: 0.3,
            clearcoatRoughness: 0.3,
            reflectivity: 0.3,
            emissive: 0x222211,
            emissiveIntensity: window.keyHighlightSettings.emissiveIntensity
        });
    };
    
    /**
     * Get pressed material for a key
     * @param {boolean} isBlack - Whether the key is black
     * @returns {THREE.MeshPhysicalMaterial} - Pressed material (cloned) or null if not initialized
     */
    window.getKeyPressedMaterial = function(isBlack) {
        // If not initialized yet, try to initialize if THREE.js is available
        if (!whiteKeyPressedMaterial || !blackKeyPressedMaterial) {
            if (typeof THREE !== 'undefined' && window.initKeyHighlight) {
                // Try to initialize if we have the materials available
                // Note: This requires whiteKeyMaterial and blackKeyMaterial to be passed
                // For now, just return null and let the caller handle it
                return null;
            }
            return null;
        }
        return (isBlack ? blackKeyPressedMaterial : whiteKeyPressedMaterial).clone();
    };
    
    /**
     * Check if key highlight is initialized
     * @returns {boolean} Whether the module is initialized
     */
    window.isKeyHighlightInitialized = function() {
        return whiteKeyPressedMaterial !== null && blackKeyPressedMaterial !== null;
    };
    
    /**
     * Apply highlight to a key (change material to pressed material)
     * @param {Object} keyData - Key data from keyMap
     */
    window.applyKeyHighlight = function(keyData) {
        if (!window.keyHighlightSettings.enabled || !keyData) return;
        
        if (keyData.pressedMaterial) {
            keyData.mesh.material = keyData.pressedMaterial;
        }
    };
    
    /**
     * Remove highlight from a key (restore original material)
     * @param {Object} keyData - Key data from keyMap
     */
    window.removeKeyHighlight = function(keyData) {
        if (!keyData) return;
        
        if (keyData.originalMaterial) {
            keyData.mesh.material = keyData.originalMaterial;
        }
    };
    
    console.log('Key Highlight module loaded');
})();


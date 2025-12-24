/**
 * Key Labels Module
 * Handles key label visibility and appearance
 */

(function() {
    'use strict';
    
    // Settings
    window.keyLabelSettings = {
        enabled: true, // Default: ON
        showOnlyWhenPressed: true, // Default: only show when pressed
        alwaysVisible: false // Alternative: always show labels
    };
    
    // Store label meshes per MIDI note
    const keyLabelMeshes = new Map(); // midiNote -> THREE.Mesh
    
    /**
     * Initialize the key labels module
     */
    window.initKeyLabels = function() {
        // Module initialized
    };
    
    /**
     * Register a label mesh for a key
     * @param {number} midiNote - MIDI note number
     * @param {THREE.Mesh} labelMesh - Label mesh
     */
    window.registerKeyLabel = function(midiNote, labelMesh) {
        keyLabelMeshes.set(midiNote, labelMesh);
        
        // Set initial visibility based on settings
        if (window.keyLabelSettings.enabled) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false; // Hidden by default
            } else {
                labelMesh.visible = true; // Always visible
            }
        } else {
            labelMesh.visible = false; // Module disabled
        }
    };
    
    /**
     * Show label for a key (when pressed)
     * @param {number} midiNote - MIDI note number
     */
    window.showKeyLabel = function(midiNote) {
        if (!window.keyLabelSettings.enabled) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = true;
            }
            // If alwaysVisible is true, label is already visible
        }
    };
    
    /**
     * Hide label for a key (when released)
     * @param {number} midiNote - MIDI note number
     */
    window.hideKeyLabel = function(midiNote) {
        if (!window.keyLabelSettings.enabled) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false;
            }
            // If alwaysVisible is true, keep label visible
        }
    };
    
    /**
     * Update all label visibility based on current settings
     */
    window.updateAllKeyLabels = function() {
        keyLabelMeshes.forEach((labelMesh, midiNote) => {
            if (!window.keyLabelSettings.enabled) {
                labelMesh.visible = false;
            } else if (window.keyLabelSettings.alwaysVisible) {
                labelMesh.visible = true;
            }
            // If showOnlyWhenPressed, visibility is controlled by press/release
        });
    };
    
    /**
     * Get all registered label meshes (for cleanup)
     * @returns {Map} - Map of midiNote -> labelMesh
     */
    window.getAllKeyLabels = function() {
        return keyLabelMeshes;
    };
    
    console.log('Key Labels module loaded');
})();


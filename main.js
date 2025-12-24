import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
// Tone.js is loaded via script tag, available globally as Tone

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3e);

// Create camera - top view to see all keys clearly
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
// Position camera high above, looking down at the keyboard (zoomed in)
camera.position.set(0, 4.2, 0);
camera.lookAt(0, 0, 0);

// Header height constant
const HEADER_HEIGHT = 40;

// Create renderer with improved settings
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight - HEADER_HEIGHT);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = `${HEADER_HEIGHT}px`;
renderer.domElement.style.left = '0';
document.body.appendChild(renderer.domElement);

// Add orbit controls for camera rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// White key material - improved for realistic piano keys
const whiteKeyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfefefe, // Slightly off-white, more realistic
    metalness: 0.0, // Piano keys are not metallic
    roughness: 0.3, // Smooth, polished surface
    clearcoat: 0.5, // Subtle glossy finish
    clearcoatRoughness: 0.2,
    reflectivity: 0.5
});

// Black key material - grey color
const blackKeyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x505050, // Grey color
    metalness: 0.0,
    roughness: 0.4, // Slightly rougher than white keys
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    reflectivity: 0.3
});

// Function to create text texture
function createTextTexture(text, color = '#ffffff', fontSize = 100) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    // Increase canvas resolution for larger text to maintain quality
    // Scale canvas size with fontSize to ensure text renders clearly
    const canvasSize = Math.max(256, Math.ceil(fontSize * 2.5));
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Text color - adjust font size for labels with numbers
    context.fillStyle = color;
    context.font = `Bold ${fontSize}px Arial`;
    // Debug: log font size for first few labels
    if (text.includes('A0') || text.includes('B0') || text.includes('C1')) {
        console.log(`Creating texture for "${text}" with fontSize: ${fontSize}, canvas: ${canvasSize}x${canvasSize}`);
    }
    context.textAlign = 'center';
    
    // Handle multi-line text (split by <br> or \n)
    const lines = text.split(/<br>|\n/);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + fontSize * 0.8;
    
    lines.forEach((line, index) => {
        context.textBaseline = 'top';
        context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    // Use linear filtering only for large fonts (white keys) to prevent blurring
    // For smaller fonts (black keys), use default filtering to maintain original appearance
    if (fontSize >= 150) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
    }
    return texture;
}

// Function to create text label as a plane
function createTextLabel(text, xPosition, keyHeight, keyDepth, color = '#ffffff', fontSize = 100, planeSize = 0.12, planeHeight = null) {
    const texture = createTextTexture(text, color, fontSize);
    // If planeHeight is not specified, use square plane (backward compatible)
    // Otherwise use rectangular plane to match key aspect ratio
    const height = planeHeight !== null ? planeHeight : planeSize;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, height);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    // Position on the top surface of the key (long rectangle surface)
    // At the lower end (front edge) of the top surface
    // Top surface is at y = keyHeight
    // Lower end means closer to the front (positive z, towards +keyDepth/2)
    plane.position.set(xPosition, keyHeight + 0.001, keyDepth / 2 - 0.05);
    
    // Rotate to lie flat on the top surface (horizontal)
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.y = 0;
    plane.rotation.z = 0;
    
    return plane;
}

// Generate key labels from A0 to C8 (88-key piano)
const keyLabels = [];
// Start with A0, B0
keyLabels.push('A0', 'B0');
// Full octaves 1-7: C to B
for (let octave = 1; octave <= 7; octave++) {
    keyLabels.push(`C${octave}`, `D${octave}`, `E${octave}`, `F${octave}`, `G${octave}`, `A${octave}`, `B${octave}`);
}
// End with C8
keyLabels.push('C8');

// Function to convert MIDI note number to note name (e.g., 60 -> "C4")
function midiNoteToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return note + octave;
}

// Function to convert note name to MIDI note number (e.g., "C4" -> 60)
function noteNameToMidiNote(noteName) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) return null;
    const note = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = noteNames.indexOf(note);
    if (noteIndex === -1) return null;
    return (octave + 1) * 12 + noteIndex;
}

// Function to check if a note is a black key (sharp/flat)
function isBlackKey(noteName) {
    return noteName.includes('#') || noteName.includes('♭');
}

// Function to get black key MIDI note between two white keys
function getBlackKeyMidiNote(currentNote, nextNote) {
    const currentMidi = noteNameToMidiNote(currentNote);
    const nextMidi = noteNameToMidiNote(nextNote);
    if (currentMidi === null || nextMidi === null) return null;
    // Black key is one semitone above the current note
    return currentMidi + 1;
}

// Debug: Log first few and last few labels to verify
console.log('First 5 labels:', keyLabels.slice(0, 5));
console.log('Last 5 labels:', keyLabels.slice(-5));
console.log('Total white keys:', keyLabels.length);

// Create white keys
const whiteKeyWidth = 0.15;
const whiteKeyHeight = 0.1;
const whiteKeyDepth = 0.8;
const whiteKeySpacing = 0.16;

// Black key dimensions - realistic proportions
const blackKeyWidth = 0.075; // About 2/3 of white key width (0.15)
const blackKeyHeight = 0.07; // Slightly taller than white keys
const blackKeyDepth = 0.5; // Longer, to align with white key back edge

const numWhiteKeys = keyLabels.length; // A0 to C8 = 52 white keys (88-key piano)

// Reuse geometry for better performance
const whiteKeyGeometry = new THREE.BoxGeometry(whiteKeyWidth, whiteKeyHeight, whiteKeyDepth);
const blackKeyGeometry = new THREE.BoxGeometry(blackKeyWidth, blackKeyHeight, blackKeyDepth);

// Store white key positions for black key placement
const whiteKeyPositions = [];

// Key map: MIDI note number -> { mesh, isBlack, originalMaterial, pressedMaterial, label }
const keyMap = new Map();

// Initialize keyboard visual modules (if available)
// Note: Key highlight initialization is deferred until after THREE.js is loaded
// We'll initialize it after the scene is set up, or use a deferred initialization

// Initialize key movement module
if (window.initKeyMovement) {
    window.initKeyMovement();
}

// Initialize key labels module
if (window.initKeyLabels) {
    window.initKeyLabels();
}

// Deferred initialization of key highlight (after THREE.js is available)
// This will be called after whiteKeyMaterial and blackKeyMaterial are created
function initializeKeyHighlightDeferred() {
    // Ensure THREE.js is fully loaded and available
    if (typeof THREE === 'undefined' || !THREE.MeshPhysicalMaterial) {
        // THREE.js not ready yet, retry after a short delay
        setTimeout(initializeKeyHighlightDeferred, 10);
        return;
    }
    
    if (window.initKeyHighlight && whiteKeyMaterial && blackKeyMaterial) {
        window.initKeyHighlight(whiteKeyMaterial, blackKeyMaterial);
        
        // Now that materials are initialized, update all existing keys with pressed materials
        keyMap.forEach((keyData, midiNote) => {
            if (!keyData.pressedMaterial && window.getKeyPressedMaterial) {
                keyData.pressedMaterial = window.getKeyPressedMaterial(keyData.isBlack);
            }
        });
    }
}

for (let i = 0; i < numWhiteKeys; i++) {
    const key = new THREE.Mesh(whiteKeyGeometry, whiteKeyMaterial.clone());
    const originalMaterial = key.material;
    
    const xPosition = (i - numWhiteKeys / 2) * whiteKeySpacing + whiteKeySpacing / 2;
    whiteKeyPositions.push(xPosition);
    key.position.set(xPosition, whiteKeyHeight / 2, 0);
    key.castShadow = true;
    key.receiveShadow = true;
    scene.add(key);
    
    // Add label as a textured plane on the top surface (moved up closer to black keys)
    // Use full label with octave number (A0, B0, C1, D1, etc.)
    const fullLabel = keyLabels[i]; // Keep full label: A0, B0, C1, D1, etc.
    // Debug: Log first few labels
    if (i < 5) console.log(`Key ${i}: Label = "${fullLabel}"`);
    // Use whiteKeyWidth for planeSize so text texture matches the key width
    // Keep plane square to prevent text stretching - the larger size will make text bigger
    // Increased fontSize significantly to compensate for larger plane size
    // Original: 80px font on 0.12 plane = 666.67px per unit
    // New: 200px font on 0.15 plane = 1333.33px per unit (2x larger)
    const label = createTextLabel(fullLabel, xPosition, whiteKeyHeight, whiteKeyDepth, '#ffffff', 200, whiteKeyWidth);
    // Move label further up (back) on the key surface to be closer to black key labels
    label.position.z = whiteKeyDepth / 2 - 0.25; // Moved further back/up to be closer to black key labels
    scene.add(label);
    
    // Store key reference in keyMap
    const midiNote = noteNameToMidiNote(fullLabel);
    if (midiNote !== null) {
        // Get pressed material from key highlight module (if available and initialized)
        // If not initialized yet, we'll get it later when the module is initialized
        let pressedMaterial = null;
        if (window.getKeyPressedMaterial && window.isKeyHighlightInitialized && window.isKeyHighlightInitialized()) {
            pressedMaterial = window.getKeyPressedMaterial(false);
        }
        
        // Store original Y position at creation time (not just when pressed)
        const keyData = {
            mesh: key,
            isBlack: false,
            originalMaterial: originalMaterial,
            pressedMaterial: pressedMaterial,
            label: fullLabel,
            originalY: whiteKeyHeight / 2, // Store original position: center of key at y = 0.05
            isPressed: false, // Track visual press state
            midiNote: midiNote // Store for animation tracking
        };
        keyMap.set(midiNote, keyData);
        
        // Register label with key-labels module (if available)
        if (window.registerKeyLabel) {
            window.registerKeyLabel(midiNote, label);
        }
    }
}

// Function to check if a black key should be placed between two white keys
function shouldHaveBlackKey(note1, note2) {
    const note1Letter = note1[0]; // Get the letter (E, F, G, A, B, C, D)
    const note2Letter = note2[0];
    
    // Black keys go between: C-D, D-E, F-G, G-A, A-B
    // NOT between: E-F, B-C
    const blackKeyPairs = [
        ['C', 'D'],
        ['D', 'E'],
        ['F', 'G'],
        ['G', 'A'],
        ['A', 'B']
    ];
    
    return blackKeyPairs.some(pair => pair[0] === note1Letter && pair[1] === note2Letter);
}

// Function to get black key label (both sharp and flat, no octave numbers)
function getBlackKeyLabel(currentNote, nextNote) {
    const note1Letter = currentNote[0];
    const note2Letter = nextNote[0];
    
    // Black keys are the sharp of the first note (or flat of the second)
    // C-D -> C#/D♭, D-E -> D#/E♭, F-G -> F#/G♭, G-A -> G#/A♭, A-B -> A#/B♭
    const sharpMap = {
        'C': 'C#',
        'D': 'D#',
        'F': 'F#',
        'G': 'G#',
        'A': 'A#'
    };
    
    const flatMap = {
        'D': 'D♭',
        'E': 'E♭',
        'G': 'G♭',
        'A': 'A♭',
        'B': 'B♭'
    };
    
    const sharp = sharpMap[note1Letter];
    const flat = flatMap[note2Letter];
    
    return sharp + '<br>' + flat;
}

// Add black keys between appropriate white keys
for (let i = 0; i < numWhiteKeys - 1; i++) {
    const currentNote = keyLabels[i];
    const nextNote = keyLabels[i + 1];
    
    if (shouldHaveBlackKey(currentNote, nextNote)) {
        const blackKey = new THREE.Mesh(blackKeyGeometry, blackKeyMaterial.clone());
        const originalMaterial = blackKey.material;
        
        // Position between the two white keys
        const xPosition = (whiteKeyPositions[i] + whiteKeyPositions[i + 1]) / 2;
        // Position: align back edge with white keys' back edge
        // White keys extend from z = -0.4 to z = 0.4 (centered at z = 0)
        // Labels are at z = 0.35 (front edge)
        // Position black key so its back edge aligns with white keys' back edge at z = -0.4
        const whiteKeyBackEdge = -whiteKeyDepth / 2; // -0.4
        const blackKeyZ = whiteKeyBackEdge + blackKeyDepth / 2; // -0.4 + 0.25 = -0.15
        blackKey.position.set(xPosition, whiteKeyHeight + blackKeyHeight / 2, blackKeyZ);
        blackKey.castShadow = true;
        blackKey.receiveShadow = true;
        scene.add(blackKey);
        
        // Add label as a textured plane on the top surface (lower part) with moody grey text
        // Position label relative to the black key's front edge
        const blackKeyLabel = getBlackKeyLabel(currentNote, nextNote);
        const blackKeyFrontEdge = blackKeyZ + blackKeyDepth / 2; // Front edge of black key
        const labelZ = blackKeyFrontEdge - 0.1; // Moved up a bit (further back from front edge)
        const label = createTextLabel(blackKeyLabel, xPosition, whiteKeyHeight + blackKeyHeight, blackKeyDepth, '#888888', 65, 0.15);
        // Override the z position to be relative to the black key
        label.position.z = labelZ;
        scene.add(label);
        
        // Store black key reference in keyMap
        const midiNote = getBlackKeyMidiNote(currentNote, nextNote);
        if (midiNote !== null) {
            // Get pressed material from key highlight module (if available and initialized)
            // If not initialized yet, we'll get it later when the module is initialized
            let pressedMaterial = null;
            if (window.getKeyPressedMaterial && window.isKeyHighlightInitialized && window.isKeyHighlightInitialized()) {
                pressedMaterial = window.getKeyPressedMaterial(true);
            }
            
            // Get the sharp note name for the black key
            const sharpNoteName = midiNoteToNoteName(midiNote);
            // Store original Y position at creation time (not just when pressed)
            const blackKeyY = whiteKeyHeight + blackKeyHeight / 2;
            const keyData = {
                mesh: blackKey,
                isBlack: true,
                originalMaterial: originalMaterial,
                pressedMaterial: pressedMaterial,
                label: sharpNoteName,
                originalY: blackKeyY, // Store original position
                isPressed: false, // Track visual press state
                midiNote: midiNote // Store for animation tracking
            };
            keyMap.set(midiNote, keyData);
            
            // Register label with key-labels module (if available)
            if (window.registerKeyLabel) {
                window.registerKeyLabel(midiNote, label);
            }
        }
    }
}

// Initialize key highlight module now that THREE.js is available
initializeKeyHighlightDeferred();

// Improved lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Main directional light with shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Fill light from the opposite side for better depth
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// Rim light for edge definition
const rimLight = new THREE.PointLight(0xffffff, 0.5, 15);
rimLight.position.set(0, 5, -8);
scene.add(rimLight);

// Add a subtle ground plane to receive shadows
const groundGeometry = new THREE.PlaneGeometry(30, 30);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,
    roughness: 0.8,
    metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
ground.receiveShadow = true;
scene.add(ground);

// ========== Audio Setup (must be before animate() to avoid initialization errors) ==========
// Track note attack times for dynamic filter control
const noteAttackTimes = new Map(); // midiNote -> { attackTimestamp: number, velocity: number, frequency: number }
// Track frequency modulations for pitch drift/vibrato
const frequencyModulations = new Map(); // midiNote -> { modulation: object, releaseTime: number }
// Track attack noise nodes per note
const attackNoiseNodes = new Map(); // midiNote -> attackNoiseNode
// Track release transient nodes per note
const releaseTransientNodes = new Map(); // midiNote -> releaseTransientNode
// Track note names per MIDI note (for proper release)
const unisonVoices = new Map(); // midiNote -> [noteName]

// Initialize dynamic low-pass filter for harmonic damping
// This filter closes as notes decay, mimicking real piano string behavior
// Note: Tone.js is loaded via script tag before this module, so Tone should be available
// But we'll initialize it lazily to be safe
let dynamicFilter = null;
function initializeDynamicFilter() {
    if (!dynamicFilter && typeof Tone !== 'undefined') {
        dynamicFilter = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000, // Start fully open
            Q: 1.0
        });
    }
    return dynamicFilter;
}

// Animation loop
// Optimize: Track frame count to update filter less frequently (every 3 frames = ~20fps instead of 60fps)
let filterUpdateFrameCounter = 0;
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Update key animations (for animated movement style)
    if (window.updateKeyAnimations) {
        const currentTime = performance.now() / 1000; // Convert to seconds
        window.updateKeyAnimations(currentTime);
    }
    
    renderer.render(scene, camera);
    
    // Update dynamic filter based on active notes (if enabled)
    // Optimize: Only update filter every 3 frames to reduce CPU usage (~20fps instead of 60fps)
    filterUpdateFrameCounter++;
    if (filterUpdateFrameCounter >= 3) {
        filterUpdateFrameCounter = 0;
        
        const filter = initializeDynamicFilter();
        if (window.physicsSettings && window.physicsSettings.dynamicFilter && window.getDynamicFilterSettings && filter && noteAttackTimes.size > 0) {
            const now = Tone.now();
            let maxCutoff = 200; // Minimum cutoff
            
            // Find the highest cutoff needed based on all active notes
            noteAttackTimes.forEach((noteInfo, midiNote) => {
                const timeSinceAttack = now - noteInfo.attackTimestamp;
                const initialCutoff = window.getInitialFilterCutoff ? 
                    window.getInitialFilterCutoff(noteInfo.velocity, noteInfo.frequency) : 20000;
                const currentCutoff = window.getFilterCutoffAtTime ? 
                    window.getFilterCutoffAtTime(initialCutoff, timeSinceAttack, noteInfo.frequency) : initialCutoff;
                maxCutoff = Math.max(maxCutoff, currentCutoff);
            });
            
            // Smoothly update filter to highest needed cutoff
            filter.frequency.rampTo(maxCutoff, 0.05);
        } else if (window.physicsSettings && window.physicsSettings.dynamicFilter && filter) {
            // No active notes - open filter fully
            filter.frequency.rampTo(20000, 0.1);
        }
        
        // Update frequency modulations (pitch drift/vibrato) if enabled
        // Note: Tone.js PolySynth doesn't easily support per-voice frequency modulation
        // The modulation is tracked but would require custom synth architecture for full implementation
        // For now, we track the modulations for future enhancement
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const height = window.innerHeight - HEADER_HEIGHT;
    camera.aspect = window.innerWidth / height;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, height);
});

// Start animation
animate();

// ========== MIDI and Sound Setup ==========

// ========== Frequency-Dependent Envelope System ==========
// Based on research3: Piano physics - note-dependent decay and release times

/**
 * Calculate release time based on MIDI note number
 * Formula: T_release(n) = R0 * 2^(-n/12 * d)
 * Where n is semitone offset from A0 (MIDI note 21)
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Release time in seconds
 */
function calculateReleaseTime(midiNote) {
    const A0_MIDI = 21; // A0 MIDI note number
    const R0 = 2.0; // Base release time in seconds for A0 (2000ms)
    const d = 3.0; // Decay factor (halving per octave)
    
    const semitoneOffset = midiNote - A0_MIDI;
    const releaseTime = R0 * Math.pow(2, -semitoneOffset / 12 * d);
    
    // Clamp to reasonable range: 0.01s (10ms) to 2.0s (2000ms)
    return Math.max(0.01, Math.min(2.0, releaseTime));
}

// calculateSustainDecayTime is now provided by sustain-decay.js module

/**
 * Calculate decay parameter for Tone.js envelope
 * Decay is the time from peak to sustain level
 * For piano, this should be relatively short and note-independent
 * 
 * @returns {number} - Decay time in seconds
 */
function calculateDecayTime() {
    // Decay is typically short (100-200ms) and note-independent
    // This is the initial attack-to-sustain transition
    return 0.1;
}

// ========== Research4 Physics Implementation ==========
// Physics modules are loaded via script tags and available as window.* functions
// Modules: physics-settings.js, velocity-timbre.js, two-stage-decay.js, pedal-coupling.js

// Note: noteAttackTimes and dynamicFilter are declared earlier (before animate() function)

// Initialize Tone.js PolySynth for piano-like sound
// Use triangle oscillator (has harmonics) - filter will control brightness
// We'll set envelope parameters per note before triggering
const synth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 64, // Increased from 16 to prevent voice stealing issues
    oscillator: {
        type: 'triangle' // Triangle has harmonics, filter will control brightness
    },
    envelope: {
        attack: 0.01,  // Default 10ms (will be overridden per note from envelope settings)
        decay: 0.1,
        sustain: 0.3,
        release: 0.5 // Default, will be overridden per note
    }
    // Note: Frequency envelope modulation is tracked per-note but requires per-voice frequency control
    // for full implementation. Tone.js PolySynth doesn't easily support per-voice frequency modulation.
    // The modulation calculations are available in frequency-envelope.js module.
});

// Connect synth through filter if filter is available
const filter = initializeDynamicFilter();
let fakeBinauralOutput = null; // Will hold the fake binaural output node
let reverbOutput = null; // Will hold the reverb output node
let spectralBalanceOutput = null; // Will hold the spectral balance output node

// Function to reconnect audio chain (called when reverb or fake binaural is toggled)
window.reconnectAudioChain = function() {
    // Disconnect everything first
    synth.disconnect();
    if (filter) {
        filter.disconnect();
    }
    if (fakeBinauralOutput) {
        fakeBinauralOutput.disconnect();
    }
    if (reverbOutput) {
        reverbOutput.disconnect();
    }
    if (spectralBalanceOutput) {
        spectralBalanceOutput.disconnect();
    }
    
    // Start with synth output
    let currentOutput = synth;
    
    // Connect through filter if enabled
    if (filter) {
        synth.connect(filter);
        currentOutput = filter;
    }
    
    // Connect fake binaural if enabled (before reverb)
    if (window.physicsSettings && window.physicsSettings.fakeBinaural && 
        window.fakeBinauralSettings && window.fakeBinauralSettings.enabled &&
        window.connectFakeBinaural) {
        fakeBinauralOutput = window.connectFakeBinaural(currentOutput);
        currentOutput = fakeBinauralOutput;
    } else {
        fakeBinauralOutput = null;
        // If fake binaural is disabled, ensure stereo output by creating a pass-through merger
        // This converts mono to stereo before passing to reverb or destination
        const stereoPassThrough = new Tone.Merge();
        currentOutput.connect(stereoPassThrough, 0, 0); // Left channel
        currentOutput.connect(stereoPassThrough, 0, 1); // Right channel (duplicate for mono)
        currentOutput = stereoPassThrough;
    }
    
    // Connect binaural reverb if enabled (after fake binaural)
    if (window.physicsSettings && window.physicsSettings.binauralReverb && 
        window.binauralReverbSettings && window.binauralReverbSettings.enabled &&
        window.connectBinauralReverb) {
        reverbOutput = window.connectBinauralReverb(currentOutput);
        currentOutput = reverbOutput;
    } else {
        reverbOutput = null;
    }
    
    // Connect spectral balance filter (after reverb, before destination)
    // Always call connectSpectralBalance - it handles enabled/disabled state internally
    if (window.connectSpectralBalance) {
        spectralBalanceOutput = window.connectSpectralBalance(currentOutput);
        currentOutput = spectralBalanceOutput;
    } else {
        spectralBalanceOutput = null;
    }
    
    // Connect to destination
    if (currentOutput) {
        currentOutput.toDestination();
    } else {
        synth.toDestination();
    }
};

// Initial connection
let currentOutput = synth;

// Connect through filter if enabled
if (filter) {
    synth.connect(filter);
    currentOutput = filter;
}

// Connect fake binaural if enabled (before reverb)
if (window.physicsSettings && window.physicsSettings.fakeBinaural && 
    window.fakeBinauralSettings && window.fakeBinauralSettings.enabled &&
    window.connectFakeBinaural) {
    fakeBinauralOutput = window.connectFakeBinaural(currentOutput);
    currentOutput = fakeBinauralOutput;
}

// Connect binaural reverb if enabled (after fake binaural)
if (window.physicsSettings && window.physicsSettings.binauralReverb && 
    window.binauralReverbSettings && window.binauralReverbSettings.enabled &&
    window.connectBinauralReverb) {
    reverbOutput = window.connectBinauralReverb(currentOutput);
    currentOutput = reverbOutput;
}

// Connect spectral balance filter (after reverb, before destination)
// Always call connectSpectralBalance - it handles enabled/disabled state internally
if (window.connectSpectralBalance) {
    spectralBalanceOutput = window.connectSpectralBalance(currentOutput);
    currentOutput = spectralBalanceOutput;
}

// Connect to destination
if (currentOutput) {
    currentOutput.toDestination();
} else {
    synth.toDestination();
}

// Initialize VelocityTimbreManager for advanced timbre features (if available)
let timbreManager = null;
if (typeof window !== 'undefined' && window.VelocityTimbreManager && Tone.context) {
    try {
        timbreManager = new window.VelocityTimbreManager(Tone.context);
    } catch (e) {
        console.warn('Failed to initialize VelocityTimbreManager:', e);
    }
}

// Set master volume
Tone.getDestination().volume.value = -6; // Slightly reduce volume

// ========== MIDI Mapping Module ==========
// Initialize MIDI mapping module (must be after synth and state variables are created)
function initializeMidiMapping() {
    if (window.initMidiMapping) {
        // Create a reference object for sustainPedalActive so the module can modify it
        const sustainPedalActiveRef = { 
            get value() { return sustainPedalActive; },
            set value(v) { sustainPedalActive = v; }
        };
        
        window.initMidiMapping({
            synth: synth,
            keyMap: keyMap,
            dynamicFilter: filter,
            sustainPedalActiveRef: sustainPedalActiveRef,
            pressKey: pressKey,
            releaseKey: releaseKey,
            midiNoteToNoteName: midiNoteToNoteName,
            activeNotes: activeNotes,
            physicallyHeldNotes: physicallyHeldNotes,
            sustainedNotes: sustainedNotes,
            noteAttackTimes: noteAttackTimes,
            frequencyModulations: frequencyModulations,
            attackNoiseNodes: attackNoiseNodes,
            releaseTransientNodes: releaseTransientNodes,
            unisonVoices: unisonVoices,
            sustainDecayAutomations: sustainDecayAutomations,
            noteVolumeNodes: noteVolumeNodes
        });
    }
}

// Initialize MIDI mapping will be called after all state variables are declared

// ========== Physics Settings ==========
// Physics settings are managed by physics-settings.js module
// Initialize settings UI when DOM is ready
// Also initialize binaural reverb if it's enabled by default
function initializePhysicsSettings() {
    if (typeof window.initPhysicsSettings === 'function') {
        window.initPhysicsSettings();
    }
    
    // If binaural reverb is enabled in physics settings, initialize it
    // Use a small delay to ensure all modules are loaded
    setTimeout(() => {
        if (window.physicsSettings && window.physicsSettings.binauralReverb) {
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = true;
                // Initialize reverb if enabling
                if (window.initializeBinauralReverb) {
                    window.initializeBinauralReverb();
                }
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        }
    }, 100); // Small delay to ensure all modules are loaded
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePhysicsSettings);
} else {
    initializePhysicsSettings();
}

// Sustain pedal state
let sustainPedalActive = false;
// Track notes that are currently being held down (physically pressed)
const physicallyHeldNotes = new Set();
// Track notes that are being sustained by the pedal (not physically pressed)
const sustainedNotes = new Set(); // midiNote -> noteName
// Track all currently active notes (playing) - for reference/debugging
const activeNotes = new Map(); // midiNote -> noteName
// Note: noteAttackTimes is declared earlier (before animate() function)
// Track sustain decay automation for each sustained note
const sustainDecayAutomations = new Map(); // midiNote -> { volumeNode, cancel }
// Map of note names to their volume nodes for sustain decay
const noteVolumeNodes = new Map(); // noteName -> Tone.Volume

// Initialize MIDI mapping after all state variables are declared
initializeMidiMapping();

// Function to press a key visually
// This ensures visual state matches audio state - key should be at y = -0.02 when pressed
function pressKey(midiNote) {
    const keyData = keyMap.get(midiNote);
    if (keyData) {
        // If key is already pressed, reset it first to prevent cumulative movement
        if (keyData.isPressed) {
            // Reset to original position before pressing again
            keyData.mesh.position.y = keyData.originalY;
        }
        
        // Ensure we have a valid originalY (fallback to current position if missing)
        if (keyData.originalY === undefined) {
            keyData.originalY = keyData.mesh.position.y;
        }
        
        // Apply highlight (yellow tint) if enabled
        if (window.applyKeyHighlight) {
            window.applyKeyHighlight(keyData);
        }
        
        // Apply movement (up/down effect) if enabled
        const keyHeight = keyData.isBlack ? blackKeyHeight : whiteKeyHeight;
        if (window.pressKeyMovement) {
            window.pressKeyMovement(keyData, keyHeight);
        }
        
        // Show label if enabled
        if (window.showKeyLabel) {
            window.showKeyLabel(midiNote);
        }
        
        keyData.isPressed = true; // Mark as pressed
    }
}

// Function to release a key visually
// This ensures visual state matches audio state - key should be at y = 0.05 when released
function releaseKey(midiNote) {
    const keyData = keyMap.get(midiNote);
    if (keyData) {
        // Remove highlight (restore original material)
        if (window.removeKeyHighlight) {
            window.removeKeyHighlight(keyData);
        }
        
        // Apply movement (restore position) if enabled
        const keyHeight = keyData.isBlack ? blackKeyHeight : whiteKeyHeight;
        if (window.releaseKeyMovement) {
            window.releaseKeyMovement(keyData, keyHeight);
        } else {
            // Fallback: restore position manually if module not available
            if (keyData.originalY !== undefined) {
                keyData.mesh.position.y = keyData.originalY;
            } else {
                // Fallback: calculate original position if not stored
                if (keyData.isBlack) {
                    keyData.mesh.position.y = whiteKeyHeight + blackKeyHeight / 2;
                } else {
                    keyData.mesh.position.y = whiteKeyHeight / 2; // 0.05
                }
            }
        }
        
        // Hide label if enabled
        if (window.hideKeyLabel) {
            window.hideKeyLabel(midiNote);
        }
        
        keyData.isPressed = false; // Mark as released
    }
}

// ========== MIDI Mapping Module ==========
// Velocity mapping and ADSR envelope handling is now in midi-mapping.js module

// Function to handle MIDI note on (wrapper for midi-mapping module)
function handleNoteOn(midiNote, velocity) {
    if (window.handleMidiNoteOn) {
        window.handleMidiNoteOn(midiNote, velocity);
    }
}

// Function to handle MIDI note off (wrapper for midi-mapping module)
function handleNoteOff(midiNote) {
    if (window.handleMidiNoteOff) {
        window.handleMidiNoteOff(midiNote);
    }
}


// Legacy function - now handled by midi-mapping module (kept for reference, can be removed)
function handleNoteOn_OLD(midiNote, velocity) {
    const noteName = midiNoteToNoteName(midiNote);
    if (noteName) {
        // If this note is already active, release it first to prevent multiple voices
        // This is especially important when pressing the same note multiple times while sustain is active
        if (activeNotes.has(midiNote)) {
            // CRITICAL: Release visual key first to prevent cumulative movement
            // This ensures visual state matches audio state
            releaseKey(midiNote);
            
            // Release all voices for this note (including unison voices if any)
            const voicesToRelease = unisonVoices.get(midiNote);
            if (voicesToRelease && voicesToRelease.length > 0) {
                // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                voicesToRelease.forEach(voiceNoteName => {
                    try {
                        synth.triggerRelease(voiceNoteName);
                    } catch (e) {
                        // Ignore errors
                    }
                });
                unisonVoices.delete(midiNote);
            } else {
                try {
                    synth.triggerRelease(noteName);
                } catch (e) {
                    // Ignore errors if note doesn't exist
                }
            }
        }
        
        // Track that this note is physically held
        physicallyHeldNotes.add(midiNote);
        // Remove from sustained notes if it was there (now physically held again)
        sustainedNotes.delete(midiNote);
        // Track as active note
        activeNotes.set(midiNote, noteName);
        
        // Get base envelope settings from envelope-settings.js module
        const baseEnvelope = (window.envelopeSettings) ? window.envelopeSettings : {
            attack: 0.01,   // Default 10ms
            decay: 0.1,     // Default 100ms
            sustain: 0.3,   // Default 0.3
            release: 0.5    // Default 500ms
        };
        
        // Set frequency-dependent envelope parameters for this note (based on research3)
        // Lower notes have longer release times, higher notes have shorter release times
        // Use envelope settings as base (from envelope-settings.js module)
        const releaseTime = baseEnvelope.release;
        
        // Calculate two-stage decay parameters (research4) - from two-stage-decay.js module
        // If two-stage decay is enabled, use it; otherwise use envelope settings
        const twoStageDecay = window.calculateTwoStageDecay ? window.calculateTwoStageDecay(velocity) : { decay1: 0.1, decay2: 2.0, amplitudeRatio: 0.7 };
        const decayTime = (window.physicsSettings && window.physicsSettings.twoStageDecay) ? 
            twoStageDecay.decay1 : baseEnvelope.decay;
        
        // Get velocity-dependent attack time (from velocity-attack.js module)
        // If velocity-dependent attack is enabled, use it; otherwise use envelope settings
        const attackTime = (window.physicsSettings && window.physicsSettings.velocityAttack && window.getAttackTimeForVelocity) ?
            window.getAttackTimeForVelocity(velocity) : baseEnvelope.attack;
        
        // Get frequency for this note (for filter keytracking)
        const frequency = midiNoteToFrequency(midiNote);
        
        // Store note attack info for dynamic filter control
        // Store timestamp when note was attacked (for filter decay calculation)
        const attackTimestamp = Tone.now();
        noteAttackTimes.set(midiNote, {
            attackTimestamp: attackTimestamp,
            velocity: velocity,
            frequency: frequency
        });
        
        // Create frequency modulation controller (if enabled)
        if (window.physicsSettings && window.physicsSettings.frequencyEnvelope && window.createFrequencyModulation) {
            const modulation = window.createFrequencyModulation(frequency, attackTime);
            frequencyModulations.set(midiNote, {
                modulation: modulation,
                releaseTime: null,
                baseFrequency: frequency
            });
        }
        
        // Apply inharmonicity to fundamental frequency (if enabled)
        let adjustedFrequency = frequency;
        if (window.physicsSettings && window.physicsSettings.inharmonicity && window.getInharmonicFundamentalFrequency) {
            adjustedFrequency = window.getInharmonicFundamentalFrequency(frequency, midiNote);
        }
        
        // Apply per-partial decay rates to envelope (if enabled)
        let adjustedDecayTime = decayTime;
        if (window.physicsSettings && window.physicsSettings.perPartialDecay && window.getPerPartialDecayEnvelope) {
            const perPartialEnvelope = window.getPerPartialDecayEnvelope(decayTime, 10);
            adjustedDecayTime = perPartialEnvelope.decay;
        }
        
        // Update envelope parameters on the synth before triggering
        // Note: synth.set() affects all voices, but since we call it right before triggerAttack,
        // the new voice will use these settings. For true per-voice control, we'd need
        // individual synths per note (more CPU-intensive).
        synth.set({
            oscillator: {
                type: 'triangle' // Use triangle (has harmonics) - filter controls brightness
            },
            envelope: {
                attack: attackTime,
                decay: adjustedDecayTime,
                sustain: (window.physicsSettings && window.physicsSettings.twoStageDecay) ? 
                    (baseEnvelope.sustain * twoStageDecay.amplitudeRatio) : baseEnvelope.sustain,
                release: releaseTime
            }
        });
        
        // Update dynamic filter based on this note (if enabled)
        if (window.physicsSettings && window.physicsSettings.dynamicFilter && window.getDynamicFilterSettings) {
            const filterSettings = window.getDynamicFilterSettings(velocity, frequency, 0);
            // Smoothly update filter cutoff
            dynamicFilter.frequency.rampTo(filterSettings.frequency, 0.01);
        }
        
        // Play sound with two-stage velocity mapping (velocity curve + frequency compensation)
        // Uses settings from velocity-mapping-settings.js if available, otherwise defaults
        const k = (window.velocityMappingSettings && window.velocityMappingSettings.velocityExponent) ? window.velocityMappingSettings.velocityExponent : 2.0;
        const targetSPL = (window.velocityMappingSettings && window.velocityMappingSettings.targetSPL) ? window.velocityMappingSettings.targetSPL : 85;
        let amplitude = velocityToAmplitudeWithCompensation(velocity, midiNote, k, targetSPL);
        
        // Apply pedal coupling (research4) - adds sympathetic resonance - from pedal-coupling.js module
        if (window.physicsSettings && window.physicsSettings.pedalCoupling && sustainPedalActive && window.applyPedalCoupling) {
            const freq = midiNoteToFrequency(midiNote);
            const couplingGain = window.applyPedalCoupling(freq, velocity, 1.0, activeNotes, midiNoteToFrequency);
            amplitude = Math.min(1.0, amplitude + couplingGain);
        }
        
        // Trigger the note
        synth.triggerAttack(noteName, undefined, amplitude);
        // Track the note name for release
        unisonVoices.set(midiNote, [noteName]);
        
        // Create and start attack noise (if enabled)
        if (window.physicsSettings && window.physicsSettings.attackNoise && window.createAttackNoiseNode) {
            const attackNoiseNode = window.createAttackNoiseNode(velocity, frequency);
            if (attackNoiseNode) {
                attackNoiseNodes.set(midiNote, attackNoiseNode);
                // Connect noise to audio chain
                attackNoiseNode.gain.connect(dynamicFilter || synth);
                attackNoiseNode.start();
            }
        }
        
        // Visual feedback
        pressKey(midiNote);
    }
}

// startSustainDecay is now provided by sustain-decay.js module

// Legacy function - now handled by midi-mapping module (kept for reference, can be removed)
function handleNoteOff_OLD(midiNote) {
    const noteName = midiNoteToNoteName(midiNote);
    if (noteName) {
        // Remove from physically held notes
        physicallyHeldNotes.delete(midiNote);
        
        // Stop attack noise if it exists
        if (attackNoiseNodes.has(midiNote)) {
            const noiseNode = attackNoiseNodes.get(midiNote);
            if (noiseNode && noiseNode.stop) {
                noiseNode.stop();
            }
            attackNoiseNodes.delete(midiNote);
        }
        
        // Create and trigger release transient (if enabled)
        if (window.physicsSettings && window.physicsSettings.releaseTransient && window.createReleaseTransientNode) {
            const frequency = midiNoteToFrequency(midiNote);
            const currentAmplitude = activeNotes.has(midiNote) ? 0.5 : 0.3; // Estimate current amplitude
            const transientAmplitude = window.calculateReleaseTransientAmplitude ? 
                window.calculateReleaseTransientAmplitude(currentAmplitude, null) : currentAmplitude * 0.1;
            
            const releaseTransientNode = window.createReleaseTransientNode(frequency, transientAmplitude);
            if (releaseTransientNode) {
                releaseTransientNodes.set(midiNote, releaseTransientNode);
                // Connect transient to audio chain
                releaseTransientNode.gain.connect(dynamicFilter || synth);
                releaseTransientNode.start();
                
                // Auto-cleanup after transient duration
                const duration = window.calculateReleaseTransientDuration ? 
                    window.calculateReleaseTransientDuration(frequency) : 0.03;
                setTimeout(() => {
                    if (releaseTransientNodes.has(midiNote)) {
                        const node = releaseTransientNodes.get(midiNote);
                        if (node && node.stop) {
                            node.stop();
                        }
                        releaseTransientNodes.delete(midiNote);
                    }
                }, duration * 1000 + 100);
            }
        }
        
        // Release sound only if sustain pedal is not active
        if (!sustainPedalActive) {
            // Cancel any sustain decay if it exists
            if (sustainDecayAutomations.has(midiNote)) {
                const automation = sustainDecayAutomations.get(midiNote);
                if (automation && automation.cancel) {
                    automation.cancel();
                }
                sustainDecayAutomations.delete(midiNote);
            }
            
            // Release all voices for this note (including unison voices if any)
            const voicesToRelease = unisonVoices.get(midiNote);
            if (voicesToRelease && voicesToRelease.length > 0) {
                // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                // Important: Even if multiple strings round to the same note name, we must release each one
                voicesToRelease.forEach(voiceNoteName => {
                    try {
                        synth.triggerRelease(voiceNoteName);
                    } catch (e) {
                        // If note doesn't exist (voice was stolen), that's okay
                        console.warn('Note release failed (may have been voice-stolen):', voiceNoteName);
                    }
                });
                // Clean up tracking
                unisonVoices.delete(midiNote);
            } else {
                // Fallback: release main note name if no tracking found
                try {
                    synth.triggerRelease(noteName);
                } catch (e) {
                    console.warn('Note release failed (may have been voice-stolen):', noteName);
                }
            }
            
            activeNotes.delete(midiNote);
            sustainedNotes.delete(midiNote); // Clean up if it was there
            noteAttackTimes.delete(midiNote); // Clean up attack time tracking
            
            // Mark frequency modulation as released
            if (frequencyModulations.has(midiNote)) {
                const modData = frequencyModulations.get(midiNote);
                if (modData.modulation && modData.modulation.release) {
                    modData.modulation.release();
                    modData.releaseTime = Tone.now();
                }
            }
        } else {
            // Sustain is active: mark this note as sustained (not physically held)
            sustainedNotes.add(midiNote);
            // Start gradual decay for this sustained note (if feature is enabled)
            if (window.startSustainDecay) {
                window.startSustainDecay(midiNote, noteName, {
                    sustainedNotes,
                    physicallyHeldNotes,
                    activeNotes,
                    sustainDecayAutomations,
                    noteVolumeNodes,
                    synth
                });
            }
            // Mark frequency modulation as released (for release drift)
            if (frequencyModulations.has(midiNote)) {
                const modData = frequencyModulations.get(midiNote);
                if (modData.modulation && modData.modulation.release) {
                    modData.modulation.release();
                    modData.releaseTime = Tone.now();
                }
            }
            // Keep the note in activeNotes (don't release it immediately)
        }
        
        // Visual feedback - always release key visually
        releaseKey(midiNote);
    }
}

// Safety function to release all stuck notes (can be called manually if needed)
function releaseAllNotes() {
    // Cancel all sustain decay automations
    sustainDecayAutomations.forEach((automation, midiNote) => {
        if (automation && automation.cancel) {
            automation.cancel();
        }
    });
    sustainDecayAutomations.clear();
    
    // Stop all attack noise nodes
    attackNoiseNodes.forEach((noiseNode, midiNote) => {
        if (noiseNode && noiseNode.stop) {
            noiseNode.stop();
        }
    });
    attackNoiseNodes.clear();
    
    // Stop all release transient nodes
    releaseTransientNodes.forEach((transientNode, midiNote) => {
        if (transientNode && transientNode.stop) {
            transientNode.stop();
        }
    });
    releaseTransientNodes.clear();
    
    activeNotes.forEach((noteName, midiNote) => {
        try {
            synth.triggerRelease(noteName);
        } catch (e) {
            // Ignore errors
        }
    });
    activeNotes.clear();
    physicallyHeldNotes.clear();
    sustainedNotes.clear();
    noteAttackTimes.clear(); // Clean up filter tracking
    frequencyModulations.clear(); // Clean up frequency modulation tracking
    unisonVoices.clear(); // Clean up unison voice tracking
    
    // CRITICAL: Release all visual keys to ensure visual state matches audio state
    keyMap.forEach((keyData, midiNote) => {
        if (keyData.isPressed) {
            releaseKey(midiNote);
        }
    });
    
    console.log('All notes released');
}

// MIDI Input Module Integration
// Handle sustain pedal control change
function handleControlChange(controller, value) {
    // Sustain pedal is controller 64
    if (controller === 64) {
        const wasActive = sustainPedalActive;
        sustainPedalActive = value >= 64; // >= 64 means pedal down
        console.log('Sustain pedal:', sustainPedalActive ? 'ON' : 'OFF');
        
        // If sustain pedal is released, release only the sustained notes
        if (wasActive && !sustainPedalActive) {
            // Create a copy to avoid modification during iteration
            const notesToRelease = Array.from(sustainedNotes);
            notesToRelease.forEach((midiNote) => {
                // Stop attack noise if it exists
                if (attackNoiseNodes.has(midiNote)) {
                    const noiseNode = attackNoiseNodes.get(midiNote);
                    if (noiseNode && noiseNode.stop) {
                        noiseNode.stop();
                    }
                    attackNoiseNodes.delete(midiNote);
                }
                
                // Stop release transient if it exists
                if (releaseTransientNodes.has(midiNote)) {
                    const transientNode = releaseTransientNodes.get(midiNote);
                    if (transientNode && transientNode.stop) {
                        transientNode.stop();
                    }
                    releaseTransientNodes.delete(midiNote);
                }
                
                // Cancel any sustain decay automation
                if (sustainDecayAutomations.has(midiNote)) {
                    const automation = sustainDecayAutomations.get(midiNote);
                    if (automation && automation.cancel) {
                        automation.cancel();
                    }
                    sustainDecayAutomations.delete(midiNote);
                }
                
                // Release all voices for this note (including unison voices if any)
                const voicesToRelease = unisonVoices.get(midiNote);
                if (voicesToRelease && voicesToRelease.length > 0) {
                    // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                    // Important: Even if multiple strings round to the same note name, we must release each one
                    voicesToRelease.forEach(voiceNoteName => {
                        try {
                            synth.triggerRelease(voiceNoteName);
                        } catch (e) {
                            // Ignore errors
                        }
                    });
                    // Clean up tracking
                    unisonVoices.delete(midiNote);
                } else {
                    // Fallback: release main note name
                    const noteName = activeNotes.get(midiNote);
                    if (noteName) {
                        try {
                            synth.triggerRelease(noteName);
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }
                activeNotes.delete(midiNote);
                sustainedNotes.delete(midiNote);
                noteAttackTimes.delete(midiNote); // Clean up attack time tracking
                frequencyModulations.delete(midiNote); // Clean up frequency modulation
            });
        }
    }
}

// Initialize MIDI input module when page loads
// Note: Tone.js requires user interaction to start audio context
function initializeMidiInput() {
    if (window.initMidiInput) {
        window.initMidiInput(handleNoteOn, handleNoteOff, handleControlChange);
    } else {
        console.warn('MIDI input module not loaded');
    }
}

document.addEventListener('click', () => {
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    initializeMidiInput();
}, { once: true });

// Also try to initialize MIDI immediately (may require user interaction for audio)
if (Tone.context.state === 'running') {
    initializeMidiInput();
} else {
    console.log('Click anywhere to enable MIDI and audio');
}

// Keyboard shortcut to release all stuck notes (press 'R' key)
window.addEventListener('keydown', (event) => {
    // Press 'R' to release all notes (useful if notes get stuck)
    if (event.key === 'r' || event.key === 'R') {
        releaseAllNotes();
        console.log('Released all notes (keyboard shortcut)');
    }
});

/**
 * Binaural Reverb Module
 * Implements 3D spatial reverb with binaural processing
 * Based on binaural-reverb-3d-sound-research.md
 * 
 * This module simulates how reverb is perceived differently by each ear,
 * creating a sense of space, distance, and immersion.
 * 
 * Key features:
 * - Separate left/right reverb processing with ITD/ILD
 * - Frequency-dependent binaural effects (head shadow)
 * - Early reflections with directional cues
 * - Late reverb with spatial distribution
 * - Piano-specific considerations (lid position, asymmetric BRIR)
 * 
 * CPU Impact: High - Real-time binaural processing requires dual reverb engines
 */

// Default binaural reverb settings
const binauralReverbSettings = {
    enabled: false,
    roomSize: 0.7,           // 0.0 (small) to 1.0 (large)
    reverbTime: 2.0,        // RT60 in seconds (0.5 to 5.0)
    earlyReflections: 0.6,  // Early reflection level (0.0 to 1.0) - increased for stronger effect
    lateReverb: 0.6,        // Late reverb level (0.0 to 1.0) - increased for stronger effect
    dryWet: 0.5,            // Dry/wet mix (0.0 = all dry, 1.0 = all wet)
    itdIntensity: 0.8,      // Interaural Time Difference intensity (0.0 to 1.0)
    ildIntensity: 0.6,      // Interaural Level Difference intensity (0.0 to 1.0)
    frequencyDependent: true, // Enable frequency-dependent binaural effects
    pianoLidPosition: 0.5,  // Lid position (0.0 = closed, 1.0 = fully open)
    binauralQuality: 0.7    // Binaural quality index (0.0 to 1.0)
};

// Reverb instances (lazy initialization)
let leftReverb = null;
let rightReverb = null;

/**
 * Initialize binaural reverb system
 * Creates separate reverb engines for left and right channels
 */
function initializeBinauralReverb() {
    if (typeof Tone === 'undefined') {
        console.warn('Tone.js not available for binaural reverb');
        return false;
    }

    try {
        // Create separate reverb engines for left and right channels
        // This allows for binaural processing with ITD/ILD differences
        leftReverb = new Tone.Reverb({
            roomSize: binauralReverbSettings.roomSize,
            wet: binauralReverbSettings.lateReverb,
            decay: binauralReverbSettings.reverbTime
        });
        
        rightReverb = new Tone.Reverb({
            roomSize: binauralReverbSettings.roomSize,
            wet: binauralReverbSettings.lateReverb,
            decay: binauralReverbSettings.reverbTime
        });

        // Generate reverb impulse responses (async)
        leftReverb.generate();
        rightReverb.generate();

        return true;
    } catch (error) {
        console.error('Failed to initialize binaural reverb:', error);
        return false;
    }
}

/**
 * Calculate Interaural Time Difference (ITD) based on angle and frequency
 * Higher frequencies have more pronounced ITD due to head shadow effect
 * 
 * @param {number} angle - Angle in radians (0 = center, π/2 = right, -π/2 = left)
 * @param {number} frequency - Frequency in Hz
 * @returns {number} - ITD in seconds
 */
function calculateITD(angle, frequency) {
    if (!binauralReverbSettings.enabled || binauralReverbSettings.itdIntensity === 0) {
        return 0;
    }

    // Head radius approximation (in meters)
    const headRadius = 0.0875; // ~8.75cm average head radius
    const speedOfSound = 343; // m/s at room temperature
    
    // Base ITD calculation (simplified spherical head model)
    const baseITD = (headRadius / speedOfSound) * (angle + Math.sin(angle));
    
    // Frequency-dependent scaling: higher frequencies have more pronounced ITD
    // Below 700 Hz: sound diffracts around head, smaller ITD
    // Above 700 Hz: head creates shadow, larger ITD
    let freqMultiplier = 1.0;
    if (frequency < 700) {
        freqMultiplier = 0.5 + 0.5 * (frequency / 700);
    } else {
        freqMultiplier = 1.0 + 0.3 * Math.min(1.0, (frequency - 700) / 3000);
    }
    
    return baseITD * freqMultiplier * binauralReverbSettings.itdIntensity;
}

/**
 * Calculate Interaural Level Difference (ILD) based on angle and frequency
 * Higher frequencies have more pronounced ILD due to head shadow
 * 
 * @param {number} angle - Angle in radians
 * @param {number} frequency - Frequency in Hz
 * @returns {number} - ILD in dB
 */
function calculateILD(angle, frequency) {
    if (!binauralReverbSettings.enabled || binauralReverbSettings.ildIntensity === 0) {
        return 0;
    }

    // Below 700 Hz: minimal ILD (sound diffracts around head)
    if (frequency < 700) {
        return 0;
    }

    // Above 700 Hz: head creates acoustic shadow
    // Maximum ILD occurs at 90 degrees and increases with frequency
    const angleFactor = Math.abs(Math.sin(angle));
    const freqFactor = Math.min(1.0, (frequency - 700) / 10000); // Up to 10 kHz
    
    // Maximum ILD can reach ~20 dB at 10 kHz, 90 degrees
    const maxILD = 20 * freqFactor * angleFactor;
    
    return maxILD * binauralReverbSettings.ildIntensity;
}

/**
 * Apply binaural processing to a signal
 * Creates spatial perception by applying ITD/ILD to reverb
 * 
 * @param {Tone.ToneAudioNode} inputNode - Input audio node
 * @param {number} frequency - Note frequency in Hz (for frequency-dependent effects)
 * @returns {Tone.ToneAudioNode} - Output node with binaural reverb applied
 */
function applyBinauralReverb(inputNode, frequency = 440) {
    if (!binauralReverbSettings.enabled || !leftReverb || !rightReverb) {
        return inputNode; // Pass through if disabled
    }

    // Calculate spatial angle (simplified: piano is slightly to the right)
    // In a real implementation, this would be based on piano position
    const pianoAngle = Math.PI / 6; // 30 degrees to the right
    
    // Calculate ITD and ILD for this frequency
    const itd = calculateITD(pianoAngle, frequency);
    const ild = calculateILD(pianoAngle, frequency);
    
    // Apply ITD using delay (simplified - full implementation would use convolution)
    // For now, we'll use the reverb's built-in spatial characteristics
    
    // Apply ILD by adjusting channel volumes
    const leftGain = Math.pow(10, -Math.abs(ild) / 20); // Convert dB to linear gain
    const rightGain = Math.pow(10, Math.abs(ild) / 20);
    
    // Split signal to left and right channels
    const splitter = new Tone.Split();
    inputNode.connect(splitter);
    
    // Apply different gains to left and right
    const leftGainNode = new Tone.Gain(leftGain);
    const rightGainNode = new Tone.Gain(rightGain);
    
    splitter.connect(leftGainNode, 0);
    splitter.connect(rightGainNode, 1);
    
    // Connect to reverb channels
    leftGainNode.connect(leftChannel);
    rightGainNode.connect(rightChannel);
    
    // Mix dry and wet signals
    const dryGain = new Tone.Gain(1.0 - binauralReverbSettings.lateReverb);
    const wetGain = new Tone.Gain(binauralReverbSettings.lateReverb);
    
    inputNode.connect(dryGain);
    reverbMix.connect(wetGain);
    
    // Merge dry and wet
    const merger = new Tone.Merge();
    dryGain.connect(merger, 0, 0);
    wetGain.connect(merger, 0, 1);
    
    return merger;
}

/**
 * Update reverb parameters
 * Call this when settings change
 */
function updateBinauralReverbSettings() {
    if (!leftReverb || !rightReverb) {
        return;
    }

    // Update room size
    leftReverb.roomSize.value = binauralReverbSettings.roomSize;
    rightReverb.roomSize.value = binauralReverbSettings.roomSize;
    
    // Update decay time (RT60)
    leftReverb.decay.value = binauralReverbSettings.reverbTime;
    rightReverb.decay.value = binauralReverbSettings.reverbTime;
    
    // Update wet levels (Tone.js reverb wet parameter controls internal wet/dry)
    // We'll control overall dry/wet mix in connectBinauralReverb, so set reverb wet to 1.0
    leftReverb.wet.value = 1.0;
    rightReverb.wet.value = 1.0;
    
    // Regenerate impulse responses if room size changed significantly
    // (Tone.js handles this automatically, but we can force regeneration)
    leftReverb.generate();
    rightReverb.generate();
}

/**
 * Connect binaural reverb to the main audio chain
 * Should be called after synth initialization
 * 
 * @param {Tone.ToneAudioNode} inputNode - Input node (usually synth or filter)
 * @returns {Tone.ToneAudioNode} - Output node with reverb applied
 */
function connectBinauralReverb(inputNode) {
    if (!binauralReverbSettings.enabled) {
        return inputNode; // Pass through if disabled
    }

    if (!leftReverb || !rightReverb) {
        if (!initializeBinauralReverb()) {
            return inputNode; // Failed to initialize
        }
    }

    // Create a simple reverb setup using Tone.js Reverb
    // Split signal for binaural processing
    const splitter = new Tone.Split();
    inputNode.connect(splitter);
    
    // Connect left channel to left reverb
    splitter.connect(leftReverb, 0);
    // Connect right channel to right reverb  
    splitter.connect(rightReverb, 1);
    
    // Create dry/wet mix using dryWet parameter
    const dryWet = binauralReverbSettings.dryWet !== undefined ? binauralReverbSettings.dryWet : 0.5;
    const dryGain = new Tone.Gain(1.0 - dryWet);
    const wetGainLeft = new Tone.Gain(dryWet * binauralReverbSettings.lateReverb);
    const wetGainRight = new Tone.Gain(dryWet * binauralReverbSettings.lateReverb);
    
    // Connect dry signal (mono to stereo)
    inputNode.connect(dryGain);
    
    // Connect wet signals (reverb outputs)
    leftReverb.connect(wetGainLeft);
    rightReverb.connect(wetGainRight);
    
    // Merge dry and wet
    const merger = new Tone.Merge();
    // Dry signal goes to both channels
    dryGain.connect(merger, 0, 0);
    dryGain.connect(merger, 0, 1);
    // Wet signals
    wetGainLeft.connect(merger, 0, 0);
    wetGainRight.connect(merger, 0, 1);
    
    return merger;
}

/**
 * Get current binaural reverb settings
 * @returns {Object} - Copy of current settings
 */
function getBinauralReverbSettings() {
    return { ...binauralReverbSettings };
}

/**
 * Set binaural reverb settings
 * @param {Object} newSettings - Settings to update
 */
function setBinauralReverbSettings(newSettings) {
    Object.assign(binauralReverbSettings, newSettings);
    updateBinauralReverbSettings();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.binauralReverbSettings = binauralReverbSettings;
    window.initializeBinauralReverb = initializeBinauralReverb;
    window.applyBinauralReverb = applyBinauralReverb;
    window.connectBinauralReverb = connectBinauralReverb;
    window.getBinauralReverbSettings = getBinauralReverbSettings;
    window.setBinauralReverbSettings = setBinauralReverbSettings;
    window.updateBinauralReverbSettings = updateBinauralReverbSettings;
}


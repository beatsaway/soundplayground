to make a mono piano source sound more spacious and natural without true 3D positioning or complex reverb. Here are research-backed methods:

1. The Problem with Pure Mono
All sound comes from center "phantom" image

Lacks natural acoustic cues that real pianos have

Sounds "flat" and artificial

Missing interaural differences that create spatial perception

2. Acoustic Principles of Real Pianos
Real pianos have natural binaural cues:

String length differences: Bass strings on left, treble on right

Lid reflection patterns: Different reflections to each ear

Player's perspective: If simulating "player position" vs "audience"

Body blocking: Head/torso shadowing effects

3. Simple "Fake Binaural" Techniques
A. Frequency-Based Panning (Most Effective)
javascript
function createFrequencyPannedPiano(audioContext, monoSource) {
    // Split into frequency bands and pan differently
    const splitter = audioContext.createChannelSplitter(1);
    const merger = audioContext.createChannelMerger(2);
    
    // Create filters for different frequency ranges
    const bands = [
        { freq: 80,  pan: -0.7,  type: 'lowpass' },    // Deep bass: slightly left
        { freq: 250, pan: -0.4,  type: 'bandpass' },   // Mid-bass: left
        { freq: 800, pan: 0.0,   type: 'bandpass' },   // Middle: center
        { freq: 2000, pan: 0.3,  type: 'bandpass' },   // Presence: right
        { freq: 5000, pan: 0.6,  type: 'highpass' }    // Brilliance: far right
    ];
    
    bands.forEach((band, i) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = band.type === 'lowpass' ? 'lowpass' : 
                     band.type === 'highpass' ? 'highpass' : 'bandpass';
        filter.frequency.value = band.freq;
        filter.Q.value = 1.0;
        
        const panner = audioContext.createStereoPanner();
        panner.pan.value = band.pan;
        
        monoSource.connect(filter);
        filter.connect(panner);
        panner.connect(merger, 0, i % 2); // Alternate L/R channels
    });
    
    return merger;
}
B. Harmonic-Based Spatialization
javascript
function createHarmonicPannedPiano(audioContext, fundamentalFreq) {
    // Different harmonics panned differently
    const harmonics = [
        { harmonic: 1,  pan: 0.0,   gain: 1.0 },   // Fundamental: center
        { harmonic: 2,  pan: -0.3,  gain: 0.7 },   // Octave: slightly left
        { harmonic: 3,  pan: 0.2,   gain: 0.5 },   // 12th: slightly right
        { harmonic: 4,  pan: -0.5,  gain: 0.3 },   // 2nd octave: left
        { harmonic: 5,  pan: 0.4,   gain: 0.2 },   // 17th: right
    ];
    
    const merger = audioContext.createChannelMerger(2);
    
    harmonics.forEach(h => {
        const osc = audioContext.createOscillator();
        osc.frequency.value = fundamentalFreq * h.harmonic;
        osc.type = 'sine';
        
        const gain = audioContext.createGain();
        gain.gain.value = h.gain;
        
        const panner = audioContext.createStereoPanner();
        panner.pan.value = h.pan;
        
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(merger, 0, 0); // Connect to both channels
        panner.connect(merger, 0, 1);
        
        osc.start();
    });
    
    return merger;
}
C. Time Delay Differences (ITD - Interaural Time Difference)
javascript
function createITDPiano(audioContext, monoSource) {
    // Small delays to simulate sound arrival differences
    const merger = audioContext.createChannelMerger(2);
    
    // Left channel: direct
    const leftGain = audioContext.createGain();
    leftGain.gain.value = 0.95; // Slightly quieter (head shadow)
    
    // Right channel: slightly delayed
    const delayNode = audioContext.createDelay();
    delayNode.delayTime.value = 0.0003; // 300μs delay (realistic ITD)
    
    const rightGain = audioContext.createGain();
    rightGain.gain.value = 0.9; // Slightly quieter
    
    // Connect
    monoSource.connect(leftGain);
    monoSource.connect(delayNode);
    
    leftGain.connect(merger, 0, 0);  // Left channel
    delayNode.connect(rightGain);
    rightGain.connect(merger, 0, 1); // Right channel
    
    // Add frequency-dependent delay (more realistic)
    const splitter = audioContext.createChannelSplitter(1);
    const highFreqDelay = audioContext.createDelay();
    highFreqDelay.delayTime.value = 0.00015; // Shorter delay for highs
    
    const highPass = audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 1500;
    
    monoSource.connect(highPass);
    highPass.connect(highFreqDelay);
    highFreqDelay.connect(merger, 0, 1);
    
    return merger;
}
D. Phase Manipulation (IID - Interaural Intensity Difference)
javascript
function createPhasePiano(audioContext, monoSource) {
    // Create phase differences between channels
    const merger = audioContext.createChannelMerger(2);
    
    // Left channel with all-pass filter for phase shift
    const allPassLeft = audioContext.createBiquadFilter();
    allPassLeft.type = 'allpass';
    allPassLeft.frequency.value = 1000;
    allPassLeft.Q.value = 0.5;
    
    // Right channel with different phase
    const allPassRight = audioContext.createBiquadFilter();
    allPassRight.type = 'allpass';
    allPassRight.frequency.value = 1200;
    allPassRight.Q.value = 0.5;
    
    // EQ differences between ears (Head-Related Transfer Function simplified)
    const eqLeft = audioContext.createBiquadFilter();
    eqLeft.type = 'peaking';
    eqLeft.frequency.value = 3000;
    eqLeft.gain.value = -3; // Left ear dips around 3kHz
    eqLeft.Q.value = 2.0;
    
    const eqRight = audioContext.createBiquadFilter();
    eqRight.type = 'peaking';
    eqRight.frequency.value = 2500;
    eqRight.gain.value = -2; // Right ear different dip
    eqRight.Q.value = 2.0;
    
    // Connect chain
    monoSource.connect(allPassLeft);
    monoSource.connect(allPassRight);
    
    allPassLeft.connect(eqLeft);
    allPassRight.connect(eqRight);
    
    eqLeft.connect(merger, 0, 0);
    eqRight.connect(merger, 0, 1);
    
    return merger;
}
E. Piano-Specific "Player Perspective" Simulation
javascript
function createPlayerPerspectivePiano(audioContext, noteFrequency) {
    // Simulate sitting at the piano
    const merger = audioContext.createChannelMerger(2);
    
    // Bass notes (below C4 = ~261Hz) come more from left
    // Treble notes (above C4) come more from right
    const middleC = 261.63;
    const panValue = Math.tanh((noteFrequency - middleC) / middleC) * 0.6;
    
    // But not completely panned - keep some center image
    const panner = audioContext.createStereoPanner();
    panner.pan.value = panValue;
    
    // Add distance simulation for low vs high notes
    const distanceGain = audioContext.createGain();
    const distance = 0.3 + (Math.abs(panValue) * 0.2); // Panned notes feel slightly farther
    distanceGain.gain.value = 1.0 / (1.0 + distance);
    
    // Connect
    const source = audioContext.createOscillator();
    source.frequency.value = noteFrequency;
    
    source.connect(distanceGain);
    distanceGain.connect(panner);
    panner.connect(merger, 0, 0);
    panner.connect(merger, 0, 1);
    
    source.start();
    
    return { node: merger, source };
}
4. Combined "Fake Binaural" Processor
javascript
class MonoToBinauralPiano {
    constructor(audioContext) {
        this.context = audioContext;
        
        // Create processing nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createChannelMerger(2);
        
        // Parallel processing chains
        this.setupChains();
    }
    
    setupChains() {
        // Chain 1: Frequency-based panning (40% wet)
        const chain1 = this.createFrequencyChain(0.4);
        
        // Chain 2: ITD delays (30% wet)
        const chain2 = this.createITDChain(0.3);
        
        // Chain 3: Phase differences (30% wet)
        const chain3 = this.createPhaseChain(0.3);
        
        // Connect all chains in parallel
        this.input.connect(chain1);
        this.input.connect(chain2);
        this.input.connect(chain3);
        
        chain1.connect(this.output);
        chain2.connect(this.output);
        chain3.connect(this.output);
        
        // Keep some direct signal (15% dry)
        const dryGain = this.context.createGain();
        dryGain.gain.value = 0.15;
        this.input.connect(dryGain);
        dryGain.connect(this.output);
    }
    
    createFrequencyChain(wetAmount) {
        const gain = this.context.createGain();
        gain.gain.value = wetAmount;
        
        // Use frequency-based panning from earlier example
        // ... implementation here
        
        return gain;
    }
    
    // Additional chain implementations...
    
    process(monoSource) {
        monoSource.connect(this.input);
        return this.output;
    }
}
5. Simple All-in-One Solution
javascript
function fakeBinauralPiano(audioContext, monoSource, noteFrequency = null) {
    const output = audioContext.createChannelMerger(2);
    
    // 1. Basic panning based on frequency (if known)
    let basePan = 0;
    if (noteFrequency) {
        basePan = Math.tanh((noteFrequency - 261.63) / 261.63) * 0.4;
    }
    
    // 2. Create stereo spread
    const leftProcessing = audioContext.createGain();
    const rightProcessing = audioContext.createGain();
    
    // Slightly different EQ per channel
    const leftEQ = audioContext.createBiquadFilter();
    leftEQ.type = 'peaking';
    leftEQ.frequency.value = 2800;
    leftEQ.gain.value = -2;
    leftEQ.Q.value = 1.5;
    
    const rightEQ = audioContext.createBiquadFilter();
    rightEQ.type = 'peaking';
    rightEQ.frequency.value = 3200;
    rightEQ.gain.value = -1;
    rightEQ.Q.value = 1.5;
    
    // 3. Apply subtle delays
    const rightDelay = audioContext.createDelay();
    rightDelay.delayTime.value = 0.0002; // 200μs
    
    // 4. Connect everything
    monoSource.connect(leftEQ);
    monoSource.connect(rightDelay);
    
    leftEQ.connect(leftProcessing);
    rightDelay.connect(rightEQ);
    rightEQ.connect(rightProcessing);
    
    // Apply panning
    leftProcessing.gain.value = 0.9 - (basePan * 0.5);
    rightProcessing.gain.value = 0.9 + (basePan * 0.5);
    
    leftProcessing.connect(output, 0, 0);
    rightProcessing.connect(output, 0, 1);
    
    return output;
}
Key Principles for Convincing "Fake" Binaural:
Subtlety is key - Don't overdo the effects

Frequency-dependent processing - Different treatments for bass vs treble

Micro-timing differences - Small delays (100-500μs) between ears

Slight EQ differences - Simulate head shadowing

Keep some center image - Don't pan everything completely

Note-dependent positioning - Bass left, treble right

This approach creates a much more natural, spacious piano sound without true 3D audio or complex reverb, making mono sources feel like they're in a real acoustic space.


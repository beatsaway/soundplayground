# Primary Envelope Attack Parameter Analysis

## Overview
This document analyzes the extent to which the primary envelope attack parameter (from `envelope-settings.js`) shapes the attack phase of the sound, and identifies modules that operate during attack but are NOT affected by this parameter.

## Primary Envelope Attack Parameter

**Location**: `envelope-settings/envelope-settings.js`
**Default Value**: 0.01 seconds (10ms)
**Range**: 1-100ms (0.001-0.1 seconds)

**What it controls**: 
- The ADSR envelope attack time for the main synth oscillator
- Applied via `synth.set({ envelope: { attack: attackTime } })` in `midi-mapping.js` (line 221)
- This controls how quickly the **amplitude** of the main oscillator reaches full volume

**Important Note**: When `velocityAttack` is enabled, the primary envelope attack is **overridden** by `velocity-attack.js`, which calculates velocity-dependent attack times (1-5ms range).

---

## Modules That Affect Attack Phase

### ✅ AFFECTED by Primary Envelope Attack

1. **Main Synth Envelope** (Primary)
   - **Module**: Tone.js PolySynth ADSR envelope
   - **Location**: `midi-mapping.js` line 220-226
   - **Effect**: Controls amplitude rise time of the main oscillator
   - **Status**: ✅ **DIRECTLY CONTROLLED** by primary envelope attack parameter
   - **Note**: Only applies when `velocityAttack` is disabled; otherwise overridden

---

### ❌ NOT AFFECTED by Primary Envelope Attack

#### 1. **Attack Noise Module**
   - **File**: `attack-noise/attack-noise.js`
   - **What it does**: Adds hammer strike noise component during attack
   - **Timing**: Has its own envelope with **fixed 1ms attack** (line 112)
   - **Duration**: 5-20ms depending on velocity and frequency
   - **Status**: ❌ **NOT AFFECTED** - Uses independent envelope timing
   - **Impact**: Adds noise burst that starts immediately, independent of main envelope

#### 2. **Frequency Envelope (Initial Pitch Drift)**
   - **File**: `frequency-envelope/frequency-envelope.js`
   - **What it does**: Applies initial pitch drift during attack (pitch starts sharp and settles)
   - **Timing**: Uses fixed `initialDriftTime = 0.05s` (50ms) - line 24
   - **Status**: ❌ **NOT AFFECTED** - Uses its own timing constant
   - **Impact**: Pitch modulation happens independently of amplitude envelope
   - **Note**: The `attackTime` parameter is passed to this module but only used for vibrato timing (which starts AFTER attack), not for initial drift

#### 3. **Dynamic Filter**
   - **File**: `dynamic-filter/dynamic-filter.js`
   - **What it does**: Starts at high cutoff, then closes over time (mimics harmonic damping)
   - **Timing**: Uses `timeSinceAttack` directly, not envelope attack parameter
   - **Status**: ❌ **NOT AFFECTED** - Filter evolution is time-based, not envelope-based
   - **Impact**: Filter brightness changes independently of amplitude envelope shape

#### 4. **Velocity Timbre**
   - **File**: `velocity-timbre/velocity-timbre.js`
   - **What it does**: Determines oscillator type and harmonic content based on velocity
   - **Timing**: Applied at note start, not time-dependent
   - **Status**: ❌ **NOT AFFECTED** - Determines spectral content, not timing
   - **Impact**: Harmonic richness is set at attack, independent of envelope timing

#### 5. **Time-Varying Brightness**
   - **File**: `time-varying-brightness/time-varying-brightness.js`
   - **What it does**: Brightness peaks during attack, then decays
   - **Timing**: Uses `attackTime` from `velocity-attack.js` (line 27-28), NOT primary envelope
   - **Status**: ❌ **NOT AFFECTED** - Uses velocity-dependent attack time, not primary envelope
   - **Impact**: Brightness evolution is tied to velocity attack, not primary envelope

#### 6. **Inharmonicity**
   - **File**: `inharmonicity/inharmonicity.js`
   - **What it does**: Modifies partial frequencies to be slightly sharp (realistic piano behavior)
   - **Timing**: Applied at note start, not time-dependent
   - **Status**: ❌ **NOT AFFECTED** - Frequency modification, not timing
   - **Impact**: Spectral content is modified, but timing is independent

#### 7. **Velocity Attack Override**
   - **File**: `velocity-attack/velocity-attack.js`
   - **What it does**: Calculates velocity-dependent attack times (1-5ms)
   - **Timing**: **OVERRIDES** primary envelope attack when enabled
   - **Status**: ❌ **NOT AFFECTED** - Actually **REPLACES** primary envelope attack
   - **Impact**: When enabled, primary envelope attack is completely ignored

#### 8. **Velocity Mapping & Frequency Compensation**
   - **Files**: `velocity-mapping-two-stage/velocity-mapping-two-stage.js`, `frequency-compensation/frequency-compensation.js`
   - **What it does**: Maps velocity to amplitude with frequency compensation
   - **Timing**: Applied at note start, determines initial amplitude
   - **Status**: ❌ **NOT AFFECTED** - Determines amplitude level, not timing
   - **Impact**: Sets the target amplitude, but envelope still controls the rise time

#### 9. **Advanced Timbre / Custom Waveforms**
   - **File**: `advanced-timbre/advanced-timbre.js`
   - **What it does**: Creates custom waveforms with velocity-dependent harmonic content
   - **Timing**: Applied at note start
   - **Status**: ❌ **NOT AFFECTED** - Determines waveform shape, not timing
   - **Impact**: Spectral content is set, but envelope timing is independent

---

## Summary Statistics

### Total Modules Affecting Attack Phase: **10 modules**

### Directly Controlled by Primary Envelope Attack: **1 module** (10%)
- Main Synth Envelope (amplitude rise)

### NOT Affected by Primary Envelope Attack: **9 modules** (90%)

1. Attack Noise (independent envelope)
2. Frequency Envelope - Initial Pitch Drift (fixed timing)
3. Dynamic Filter (time-based evolution)
4. Velocity Timbre (spectral content)
5. Time-Varying Brightness (uses velocity attack, not primary)
6. Inharmonicity (frequency modification)
7. Velocity Attack Override (replaces primary when enabled)
8. Velocity Mapping (amplitude level, not timing)
9. Advanced Timbre (waveform shape)

---

## Key Findings

1. **Limited Control**: The primary envelope attack parameter only controls the amplitude rise time of the main oscillator. It does NOT control:
   - Attack noise timing
   - Pitch drift timing
   - Filter evolution
   - Brightness evolution
   - Spectral content

2. **Override Behavior**: When `velocityAttack` is enabled, the primary envelope attack is completely overridden by velocity-dependent calculations (1-5ms range).

3. **Independent Systems**: Most attack-phase effects operate with their own timing systems:
   - Attack noise: Fixed 1ms attack, 5-20ms duration
   - Pitch drift: Fixed 50ms decay time
   - Filter: Time-based exponential decay
   - Brightness: Uses velocity attack time (not primary envelope)

4. **Impact on Sound**: The primary envelope attack has **limited influence** on the overall attack character because:
   - Attack noise starts immediately (independent)
   - Pitch drift happens independently
   - Filter brightness evolves independently
   - Spectral content is determined by velocity, not envelope timing

---

## Recommendations

1. **Consider Unified Attack Control**: If you want the primary envelope attack to have more influence, consider:
   - Making attack noise duration scale with envelope attack
   - Making pitch drift timing scale with envelope attack
   - Making brightness peak timing use primary envelope attack instead of velocity attack

2. **Documentation**: The primary envelope attack should be documented as controlling "amplitude rise time" specifically, not "attack phase character" in general.

3. **User Interface**: Consider renaming or clarifying that this parameter only affects amplitude envelope, not the full attack transient.


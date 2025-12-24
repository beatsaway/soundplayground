# Velocity-Dependent Sound Analysis

## Problem Statement
Users report that the velocity-dependent aspect of the default preset is not strong enough. The sound should change more noticeably based on MIDI velocity.

## Current Velocity-Dependent Modules

### 1. **Velocity-to-Amplitude Mapping** ✅ Working
- **Location**: `velocity-mapping-two-stage/velocity-mapping-two-stage.js`
- **Status**: Active and working
- **Current Settings**:
  - Velocity exponent (k): 2.0 (default)
  - Target SPL: 85 dB
- **Impact**: Controls overall loudness based on velocity
- **Issue**: k=2.0 might be too conservative (makes velocity response less sensitive)

### 2. **Velocity-Dependent Attack Time** ✅ Working
- **Location**: `velocity-attack/velocity-attack.js`
- **Status**: Enabled by default, working
- **Range**: 1ms (high velocity) to 5ms (low velocity)
- **Impact**: Very subtle - attack times are all very fast (1-5ms)
- **Issue**: Range is too small to be perceptually significant

### 3. **Velocity-Dependent Timbre (Oscillator Type)** ❌ **NOT WORKING**
- **Location**: `velocity-timbre/velocity-timbre.js`
- **Status**: Module exists but **NOT APPLIED**
- **Problem**: In `midi-mapping.js` line 216-219, oscillator type is **hardcoded to 'triangle'**
- **Expected Behavior**: 
  - Soft (v<40): sine wave (pure tone)
  - Medium (40-75): triangle wave
  - Loud (75+): square wave (brighter)
- **Impact**: **CRITICAL** - This is the most noticeable velocity-dependent timbre change, but it's completely disabled!

### 4. **Dynamic Filter (Velocity-Dependent Brightness)** ⚠️ Working but Weak
- **Location**: `dynamic-filter/dynamic-filter.js`
- **Status**: Enabled by default, working
- **Current Range**: 0.3x to 1.0x of keytracked base cutoff
- **Issue**: The velocity multiplier range (0.3-1.0) might not be strong enough
- **Example**: For C4 (261.6 Hz), base cutoff = 5232 Hz
  - Soft (v=20): 1569 Hz cutoff
  - Loud (v=127): 5232 Hz cutoff
- **Impact**: Moderate - filter does change, but range might be too conservative

### 5. **Advanced Timbre (Custom Waveforms)** ❌ **NOT WORKING**
- **Location**: `advanced-timbre/advanced-timbre.js`
- **Status**: Enabled by default, but **NOT USED**
- **Problem**: `VelocityTimbreManager` is initialized but never called to generate waveforms
- **Impact**: High - could provide smooth timbre transitions

## Root Causes

### Primary Issue: Oscillator Type Not Changing
The biggest problem is that `getOscillatorTypeForVelocity()` is never called. The synth always uses 'triangle' regardless of velocity. This removes the most perceptible velocity-dependent timbre change.

### Secondary Issues:
1. **Velocity exponent too conservative**: k=2.0 makes the velocity curve less sensitive
2. **Dynamic filter range too narrow**: 0.3x-1.0x multiplier might not be strong enough
3. **Attack time range too small**: 1-5ms difference is barely perceptible
4. **Advanced timbre not integrated**: Custom waveform generation exists but isn't used

## Proposed Solutions

### Solution 1: Enable Velocity-Dependent Oscillator Type (HIGH PRIORITY)
**Impact**: Very High - Most noticeable change
**Effort**: Low - Just need to call the existing function

Modify `midi-mapping.js` to use `getOscillatorTypeForVelocity(velocity)` instead of hardcoded 'triangle'.

### Solution 2: Increase Dynamic Filter Velocity Range (MEDIUM PRIORITY)
**Impact**: High - Makes brightness changes more noticeable
**Effort**: Low - Adjust multiplier range

Change from `0.3 + 0.7 * vNorm` to `0.2 + 1.0 * vNorm` or even `0.1 + 1.2 * vNorm` for stronger effect.

### Solution 3: Lower Velocity Exponent (MEDIUM PRIORITY)
**Impact**: Medium - Makes velocity response more sensitive
**Effort**: Low - Change default k value

Change default k from 2.0 to 1.7-1.8 for more sensitive velocity response.

### Solution 4: Increase Attack Time Range (LOW PRIORITY)
**Impact**: Low - Attack times are already very fast
**Effort**: Low - Adjust range

Increase range from 1-5ms to 1-10ms (though this might make piano sound less realistic).

### Solution 5: Integrate Advanced Timbre (FUTURE ENHANCEMENT)
**Impact**: Very High - Smooth timbre transitions
**Effort**: High - Requires significant refactoring

Integrate `VelocityTimbreManager` to use custom waveforms instead of standard oscillator types.

## Recommended Implementation Order

1. **Fix oscillator type** (Solution 1) - Biggest impact, easiest fix ✅ **IMPLEMENTED**
2. **Increase filter range** (Solution 2) - High impact, easy fix ✅ **IMPLEMENTED**
3. **Lower velocity exponent** (Solution 3) - Medium impact, easy fix ✅ **IMPLEMENTED**
4. **Consider advanced timbre** (Solution 5) - Future enhancement

## Implementation Summary

### ✅ Changes Made:

1. **Enabled Velocity-Dependent Oscillator Type** (`midi-mapping.js`)
   - Changed from hardcoded 'triangle' to using `getOscillatorTypeForVelocity(velocity)`
   - Now: Soft (v<40) = sine, Medium (40-75) = triangle, Loud (75+) = square
   - **Impact**: Most noticeable velocity-dependent timbre change is now active

2. **Increased Dynamic Filter Range** (`dynamic-filter.js`)
   - Changed velocity multiplier from `0.3 + 0.7 * vNorm` to `0.2 + 1.0 * vNorm`
   - **Impact**: Stronger brightness difference between soft and loud notes
   - Filter cutoff now ranges from 0.2x to 1.2x of keytracked base (was 0.3x to 1.0x)

3. **Lowered Default Velocity Exponent** (`velocity-mapping-settings.js` and `midi-mapping.js`)
   - Changed default k from 2.0 to 1.7
   - **Impact**: More sensitive velocity response - same velocity input produces louder output
   - Makes the velocity curve feel more responsive

## Testing Recommendations

After implementing fixes, test with:
- Very soft notes (velocity 20-40): Should sound pure/soft (sine wave)
- Medium notes (velocity 60-80): Should sound balanced (triangle wave)
- Very loud notes (velocity 100-127): Should sound bright/harsh (square wave)

The difference between soft and loud should be immediately noticeable:
- **Timbre**: Sine → Triangle → Square (most noticeable)
- **Brightness**: Filter cutoff changes more dramatically
- **Loudness**: More sensitive to velocity changes


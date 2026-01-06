# Piano Acoustics Implementation Analysis

## ✅ ALREADY IMPLEMENTED

### 1. Velocity-Dependent Timbre ✅
- **Module**: `velocity-timbre.js`
- **Status**: Implemented
- **Research Match**: Section 5a - Nonlinear String Excitation
- **Notes**: Uses velocity-dependent brightness, but could be enhanced with per-partial exponents (βₖ)

### 2. Dynamic Filter (Spectral Evolution) ✅
- **Module**: `dynamic-filter.js`
- **Status**: Implemented
- **Research Match**: Section 6 - Spectral Evolution Over Time
- **Notes**: Simulates harmonic damping, but doesn't implement per-partial decay rates (τₖ)

### 3. Frequency Compensation ✅
- **Module**: `frequency-compensation.js`
- **Status**: Implemented
- **Research Match**: Section 5b - Velocity-to-Amplitude Mapping (psychoacoustic)
- **Notes**: Uses ISO 226 equal-loudness contours

### 4. Two-Stage Decay ✅
- **Module**: `two-stage-decay.js`
- **Status**: Implemented
- **Research Match**: Section 6 - Decay Rates per Partial (simplified)
- **Notes**: Implements fast/slow decay but not per-partial decay rates

### 5. Velocity-Dependent Attack ✅
- **Module**: `velocity-attack.js`
- **Status**: Implemented
- **Research Match**: Section 6 - Attack Phase
- **Notes**: Implements velocity-dependent attack times

### 6. Advanced Timbre (Custom Waveforms) ✅
- **Module**: `advanced-timbre.js`
- **Status**: **CODE EXISTS BUT NOT USED!**
- **Research Match**: Section 2 - Partial Structure
- **Notes**: Creates custom waveforms but synth still uses hardcoded 'triangle'

### 7. Pedal Coupling ✅
- **Module**: `pedal-coupling.js`
- **Status**: Implemented
- **Research Match**: Section 7 - Multi-String Effects (sympathetic resonance)
- **Notes**: Simulates string coupling but not unison detuning

### 8. Frequency Envelope (Pitch Modulation) ⚠️
- **Module**: `frequency-envelope.js`
- **Status**: **PARTIALLY IMPLEMENTED**
- **Research Match**: Section 3 - Inharmonicity (related)
- **Notes**: Code exists but not fully connected to synth voices

---

## ❌ MISSING CRITICAL FEATURES

### 1. **INHARMONICITY** ❌ CRITICAL!
- **Research Section**: 3
- **Formula**: `fₖ = k × f₀ × √(1 + B × k²)`
- **Impact**: **HIGHEST PRIORITY** - Research says this + velocity brightness = 80% of realism
- **Status**: Not implemented at all
- **Why Critical**: Real piano partials are sharp, not perfect harmonics

### 2. **Multi-String Unison Detuning** ❌
- **Research Section**: 7
- **Formula**: `f_string = f_nominal × (1 + ε_j)` where ε = ±0.1-0.3%
- **Impact**: HIGH - Creates natural beating/chorus effect
- **Status**: Not implemented
- **Why Important**: Most piano notes have 2-3 strings (except bass)

### 3. **Attack Noise Component** ❌
- **Research Section**: 8 (N(v, f₀, t))
- **Formula**: Proportional to `velocity^1.5`
- **Impact**: MEDIUM-HIGH - Adds realism to attack transients
- **Status**: Not implemented
- **Why Important**: Simulates hammer strike noise

### 4. **Release Transient** ❌
- **Research Section**: 8 (R(t_rel))
- **Impact**: MEDIUM - Adds realism to key release
- **Status**: Not implemented
- **Why Important**: Simulates damper lift-off sound

### 5. **Odd/Even Harmonic Balance** ⚠️
- **Research Section**: 4b
- **Formula**: `odd:even ≈ 2:1 for k ≤ 6`
- **Impact**: MEDIUM - Characteristic "woody" piano tone
- **Status**: Partially in advanced-timbre.js but not explicit
- **Why Important**: Pianos emphasize odd harmonics

### 6. **Pitch-Dependent String Count** ❌
- **Research Section**: 9
- **Impact**: MEDIUM - Affects unison detuning behavior
- **Status**: Not implemented
- **Rules**: 
  - Bass (A0-B1): 1 string
  - Mid (C2-C6): 2-3 strings
  - Treble (C#6-C8): 3 strings

### 7. **Per-Partial Decay Rates** ❌
- **Research Section**: 6
- **Formula**: `τₖ = τ₁ × exp(-δ × (k-1))` where δ ≈ 0.2-0.3
- **Impact**: MEDIUM - Higher partials decay faster
- **Status**: Not implemented (only overall decay)
- **Why Important**: More realistic spectral evolution

### 8. **Pitch-Dependent Harmonic Rolloff** ⚠️
- **Research Section**: 4a
- **Formula**: `aₖ(f₀) = g(f₀) × exp(-k × α(f₀))`
- **Impact**: MEDIUM - Bass has more harmonics than treble
- **Status**: Partially implemented in dynamic-filter, but not explicit rolloff
- **Why Important**: Bass: 10-15 harmonics, Treble: 2-3 harmonics

---

## 🎯 RECOMMENDED NEW FEATURES (Settings Options)

Based on the research, here are features to add as on/off options:

### Priority 1: Critical Realism (80% improvement)
1. **Inharmonicity** - Pitch-dependent partial sharpening
2. **Multi-String Unison** - Multiple detuned oscillators per note

### Priority 2: High Impact
3. **Attack Noise** - Hammer strike noise component
4. **Odd/Even Harmonic Balance** - Explicit 2:1 ratio
5. **Pitch-Dependent String Count** - Bass=1, Mid=2-3, Treble=3

### Priority 3: Polish & Detail
6. **Per-Partial Decay Rates** - Higher partials decay faster
7. **Release Transient** - Key-off sound
8. **Pitch-Dependent Harmonic Rolloff** - More harmonics in bass

### Priority 4: Integration
9. **Use Advanced Timbre Module** - Replace hardcoded triangle oscillator
10. **Connect Frequency Envelope** - Full per-voice pitch modulation

---

## 📊 IMPLEMENTATION STATUS SUMMARY

| Feature | Status | Priority | Research Section |
|---------|--------|----------|------------------|
| Velocity Timbre | ✅ Done | - | 5a |
| Dynamic Filter | ✅ Done | - | 6 |
| Frequency Compensation | ✅ Done | - | 5b |
| Two-Stage Decay | ✅ Done | - | 6 |
| Velocity Attack | ✅ Done | - | 6 |
| Advanced Timbre | ⚠️ Not Used | High | 2 |
| Pedal Coupling | ✅ Done | - | 7 |
| Frequency Envelope | ⚠️ Partial | Medium | 3 |
| **Inharmonicity** | ❌ Missing | **CRITICAL** | 3 |
| **Multi-String Unison** | ❌ Missing | **HIGH** | 7 |
| **Attack Noise** | ❌ Missing | High | 8 |
| **Release Transient** | ❌ Missing | Medium | 8 |
| Odd/Even Balance | ⚠️ Partial | Medium | 4b |
| Pitch String Count | ❌ Missing | Medium | 9 |
| Per-Partial Decay | ❌ Missing | Medium | 6 |
| Pitch Harmonic Rolloff | ⚠️ Partial | Medium | 4a |

---

## 💡 KEY INSIGHT FROM RESEARCH

> **"Start simple: Implement pitch-dependent inharmonicity and velocity-dependent brightness first. These two will give you 80% of the realism improvement."**

**Current Status**: 
- ✅ Velocity-dependent brightness: DONE
- ❌ Pitch-dependent inharmonicity: MISSING

**Action**: Implement inharmonicity next for maximum realism gain!


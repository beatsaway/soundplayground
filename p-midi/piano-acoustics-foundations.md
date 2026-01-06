Piano Acoustics: Mathematical Foundations
1. FUNDAMENTAL FREQUENCIES (Pitch Dependence)
The piano scale follows equal temperament tuning:

Formula for note frequency:

text
f(n) = 440 × 2^((n - 49)/12) Hz
Where:

n = key number (A0 = 1, A4 = 49, C8 = 88)

440 Hz = A4 reference

12 = semitones per octave

Example frequencies:

A0 (n=1): 27.5 Hz

C4 (Middle C, n=40): 261.63 Hz

A4 (n=49): 440 Hz

C8 (n=88): 4186 Hz

2. PARTIAL STRUCTURE (Harmonic Series)
A piano note isn't just the fundamental - it's a sum of partials:

Ideal harmonic series (simplified):

text
y(t) = ∑ [aₖ × sin(2π × k × f₀ × t + φₖ)]
Where:

k = partial number (1 = fundamental, 2 = 2nd harmonic, etc.)

aₖ = amplitude of k-th partial (varies with pitch and velocity)

f₀ = fundamental frequency

φₖ = phase of partial

3. INHARMONICITY (Crucial Piano Physics)
Real piano strings are stiff, causing partials to be sharp:

Inharmonicity formula:

text
fₖ = k × f₀ × √(1 + B × k²)
Where:

B = inharmonicity coefficient (pitch-dependent)

B ≈ 0.0001 for bass strings (A0)

B ≈ 0.02 for treble strings (C8)

Example (C4, k=4):

Ideal: 4 × 261.63 = 1046.52 Hz

Real: ≈ 4 × 261.63 × √(1 + 0.001 × 16) ≈ 1050.2 Hz

4th partial is ~3.7 Hz sharp!

4. AMPLITUDE SPECTRUM vs PITCH (Timbre Changes)
a) Harmonic Rolloff (Pitch Dependent):
Lower notes have more audible harmonics than higher notes:

text
aₖ(f₀) = g(f₀) × exp(-k × α(f₀))
Where:

α(f₀) = rolloff rate (increases with pitch)

Bass (A0): 10-15 harmonics clearly audible

Treble (C8): Only 2-3 harmonics audible

b) Odd/Even Harmonic Balance:
Pianos emphasize odd harmonics (characteristic "woody" tone):

text
aₖ ratio = odd:even ≈ 2:1 for k ≤ 6
5. VELOCITY DEPENDENCE (Volume → Timbre)
a) Nonlinear String Excitation:
Louder playing excites higher partials disproportionately:

text
aₖ(v) = v^βₖ × aₖ₀
Where:

v = normalized velocity (0-1)

βₖ = velocity exponent for partial k

β₁ (fundamental) ≈ 0.8

βₖ (higher partials) ≈ 1.2-1.5

Meaning: Forte playing has brighter timbre relative to fundamental.

b) Velocity-to-Amplitude Mapping:

text
A(v) = A_max × (v^γ)
Typical: γ ≈ 0.6-0.7 (psychoacoustic compensation)

6. SPECTRAL EVOLUTION OVER TIME
Attack Phase (0-50ms):

Higher partials attack faster than fundamental

Bass notes: Fundamental builds over ~100ms

Treble notes: Full spectrum in ~20ms

Decay Rates per Partial:

text
τₖ = τ₁ × exp(-δ × (k-1))
Where δ ≈ 0.2-0.3 → higher partials decay faster

7. MULTI-STRING EFFECTS (Unison Detuning)
For notes with 2-3 strings:

text
f_string = f_nominal × (1 + ε_j)
Where ε_j are small detunings (±0.1-0.3%) creating beating:

text
Beat_frequency = |f_string₁ - f_string₂|
Example: Two strings at 440 Hz ± 0.2% → beat at ~1.76 Hz

8. COMPLETE MATHEMATICAL MODEL
Full piano oscillation equation:

text
y(t) = ∑[∑ aₖₛ(v, f₀) × exp(-t/τₖ) × sin(2π × fₖₛ × t + φₖₛ)]
        + N(v, f₀, t)   ← Attack noise
        + R(t_rel)       ← Release transient
Where:

Outer sum: over strings (s = 1, 2, or 3)

Inner sum: over partials (k = 1 to ~20)

fₖₛ = inharmonic partial frequencies

N() = hammer noise component

R() = key-release sound

9. PRACTICAL IMPLEMENTATION GUIDELINES
For your synthesizer:

Bass Register (A0-B1, ~27-62 Hz):

Single string, strong fundamental

Slow attack, long decay

Minimal inharmonicity (B ≈ 0.0001)

Mid Register (C2-C6, ~65-1047 Hz):

2-3 strings, significant beating

Moderate inharmonicity (B ≈ 0.001-0.005)

Rich harmonic structure (6-10 partials)

Treble Register (C#6-C8, ~1109-4186 Hz):

3 strings, rapid beating

High inharmonicity (B ≈ 0.01-0.02)

Few audible partials (2-4)

Velocity Mapping:

Piano (p): Emphasize fundamental, fewer partials

Forte (f): Boost higher partials by +6-12 dB

Hammer noise: Proportional to velocity^1.5

10. KEY TAKEAWAYS FOR YOUR SYNTH
Pitch changes EVERYTHING:

Number of strings

Harmonic content

Inharmonicity

Attack/decay times

Volume changes TIMBRE:

Not just amplitude scaling

Spectral tilt changes with velocity

Hammer noise proportional to velocity^1.5

Realism requires 3D thinking:

Dimension 1: Pitch → fundamental frequency

Dimension 2: Time → amplitude envelopes per partial

Dimension 3: Velocity → spectral balance

Start simple: Implement pitch-dependent inharmonicity and velocity-dependent brightness first. These two will give you 80% of the realism improvement your teacher mentioned.

Would you like me to elaborate on implementing any specific mathematical aspect in JavaScript?



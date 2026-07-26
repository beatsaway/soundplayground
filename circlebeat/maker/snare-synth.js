(function () {
  'use strict';

  /**
   * Acoustic-ish snare: low head thump + sharp stick crack + wire buzz.
   * Params stay compatible with the Circle Beat sound editor.
   */

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** White noise. */
  function makeNoiseBuffer(ctx, duration, seed) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const rnd = seed != null ? mulberry32(seed) : function () { return Math.random(); };
    for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
    return buf;
  }

  /** Pink-ish noise (better for snare wires than pure white). */
  function makePinkNoiseBuffer(ctx, duration, seed) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const rnd = seed != null ? mulberry32(seed) : function () { return Math.random(); };
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = rnd() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      d[i] = pink * 0.11;
    }
    return buf;
  }

  function playSnareTest(ctx, destination, params, atTime) {
    atTime = atTime || 0;
    const p = {
      bodyF: 185,
      bodyFEnd: 95,
      decayT: 0.16,
      toneLevel: 0.55,
      fmAmount: 0.25,
      fmRatio: 2.2,
      decayN: 0.22,
      noiseLevel: 0.95,
      noiseFilterType: 'highpass',
      noiseFilterFreq: 2800,
      noiseFilterQ: 0.85,
      crackLevel: 1.15,
      crackDecay: 0.028,
      crackFreq: 6500,
      crackQ: 1.1,
      ...params
    };
    const t = atTime;
    const v = 1.05;

    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(1, t);
    outNorm.connect(destination);

    const bodyF = Math.max(40, p.bodyF);
    const bodyFEnd = Math.max(30, Math.min(bodyF - 5, p.bodyFEnd));
    const pitchTime = Math.min(0.09, Math.max(0.03, p.decayT * 0.45));
    const toneDecay = Math.max(0.04, p.decayT);
    const wireDecay = Math.max(0.06, p.decayN);
    const crackDecay = Math.max(0.008, Math.min(0.08, p.crackDecay));

    // --- 1) Stick crack: very short bright burst ---
    if (p.crackLevel > 0.01) {
      const crackNoise = makeNoiseBuffer(ctx, 0.06, 10000);
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackNoise;

      const crackHp = ctx.createBiquadFilter();
      crackHp.type = 'highpass';
      crackHp.frequency.value = Math.min(10000, Math.max(2500, p.crackFreq * 0.55));
      crackHp.Q.value = 0.7;

      const crackBp = ctx.createBiquadFilter();
      crackBp.type = 'bandpass';
      crackBp.frequency.value = Math.min(12000, Math.max(1800, p.crackFreq));
      crackBp.Q.value = Math.max(0.4, p.crackQ);

      const crackG = ctx.createGain();
      crackG.gain.setValueAtTime(0.0001, t);
      crackG.gain.exponentialRampToValueAtTime(v * p.crackLevel * 1.15, t + 0.0015);
      crackG.gain.exponentialRampToValueAtTime(0.001, t + crackDecay);

      crackSrc.connect(crackHp).connect(crackBp).connect(crackG).connect(outNorm);
      crackSrc.start(t);
      crackSrc.stop(t + 0.06);
    }

    // --- 2) Drumhead thump: triangle + sine, light FM, quick pitch drop ---
    if (p.toneLevel > 0.01) {
      const bodyBus = ctx.createGain();
      bodyBus.gain.value = 1;
      bodyBus.connect(outNorm);

      const bodyLp = ctx.createBiquadFilter();
      bodyLp.type = 'lowpass';
      bodyLp.frequency.value = Math.min(4200, bodyF * 8);
      bodyLp.Q.value = 0.7;
      bodyLp.connect(bodyBus);

      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, t);
      tg.gain.exponentialRampToValueAtTime(p.toneLevel * v, t + 0.002);
      tg.gain.exponentialRampToValueAtTime(0.001, t + toneDecay);
      tg.connect(bodyLp);

      // Fundamental (triangle = more shell / head character than pure sine)
      const fund = ctx.createOscillator();
      fund.type = 'triangle';
      fund.frequency.setValueAtTime(bodyF, t);
      fund.frequency.exponentialRampToValueAtTime(bodyFEnd, t + pitchTime);

      // Mild FM for a bit of “crack into tone” without video-game wobble
      if (p.fmAmount > 0.02) {
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        const ratio = Math.max(1, p.fmRatio);
        mod.frequency.setValueAtTime(bodyF * ratio, t);
        mod.frequency.exponentialRampToValueAtTime(bodyFEnd * ratio, t + pitchTime);
        const modGain = ctx.createGain();
        // Keep FM subtle — real snares are mostly noise + short tone
        modGain.gain.setValueAtTime(bodyF * p.fmAmount * 0.35, t);
        modGain.gain.exponentialRampToValueAtTime(0.001, t + pitchTime * 1.2);
        mod.connect(modGain);
        modGain.connect(fund.frequency);
        mod.start(t);
        mod.stop(t + toneDecay + 0.02);
      }

      const fundG = ctx.createGain();
      fundG.gain.value = 0.72;
      fund.connect(fundG).connect(tg);

      // Soft 2nd harmonic (shell)
      const harm = ctx.createOscillator();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(bodyF * 2.05, t);
      harm.frequency.exponentialRampToValueAtTime(bodyFEnd * 2.05, t + pitchTime);
      const harmG = ctx.createGain();
      harmG.gain.setValueAtTime(0.22 * p.toneLevel * v, t);
      harmG.gain.exponentialRampToValueAtTime(0.001, t + toneDecay * 0.7);
      harm.connect(harmG).connect(bodyLp);

      fund.start(t);
      fund.stop(t + toneDecay + 0.03);
      harm.start(t);
      harm.stop(t + toneDecay + 0.03);
    }

    // --- 3) Snare wires: pink buzz (main body of the sound) ---
    if (p.noiseLevel > 0.01) {
      const wireDur = Math.max(wireDecay + 0.05, 0.28);
      const wireNoise = makePinkNoiseBuffer(ctx, wireDur, 20001);
      const wireSrc = ctx.createBufferSource();
      wireSrc.buffer = wireNoise;

      const useBp = p.noiseFilterType === 'bandpass';
      const wireFilter = ctx.createBiquadFilter();
      wireFilter.type = useBp ? 'bandpass' : 'highpass';
      wireFilter.frequency.value = Math.min(10000, Math.max(600, p.noiseFilterFreq));
      wireFilter.Q.value = useBp
        ? Math.max(0.3, p.noiseFilterQ)
        : Math.max(0.5, Math.min(1.4, p.noiseFilterQ));

      // Mid “snap” layer on the wires
      const wireMid = ctx.createBiquadFilter();
      wireMid.type = 'bandpass';
      wireMid.frequency.value = Math.min(4500, Math.max(900, p.noiseFilterFreq * 0.7));
      wireMid.Q.value = 0.9;

      const ng = ctx.createGain();
      // Fast attack, quick drop, then longer wire buzz tail
      const peak = v * p.noiseLevel;
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(peak, t + 0.002);
      ng.gain.exponentialRampToValueAtTime(peak * 0.35, t + Math.min(0.05, wireDecay * 0.25));
      ng.gain.exponentialRampToValueAtTime(0.001, t + wireDecay);

      const midG = ctx.createGain();
      midG.gain.setValueAtTime(0.0001, t);
      midG.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.002);
      midG.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.12, wireDecay * 0.55));

      wireSrc.connect(wireFilter).connect(ng).connect(outNorm);
      wireSrc.connect(wireMid).connect(midG).connect(outNorm);
      wireSrc.start(t);
      wireSrc.stop(t + wireDur);
    }
  }

  window.playSnareTest = playSnareTest;
})();

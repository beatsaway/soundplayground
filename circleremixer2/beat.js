/**
 * Circle Remixer 2 — second wheel.
 * Concentric Euclidean drum rings (Circle Beat style) locked to the remix transport.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var CX = 500;
  var CY = 500;
  var OUTER = 470;
  var INNER_HUB = 118;
  var RING_GAP = 5;
  var SEG_GAP = 0.018;
  var BEATS_PER_BAR = 4;
  var BANK_SR = 44100;
  var BANK_DUR = 1.15;
  var GOLDEN = (Math.sqrt(5) - 1) / 2;
  var EMPTY_A = '#1e1e24';
  var EMPTY_B = '#222228';

  var RINGS = [
    { id: 'r48a', segments: 48 },
    { id: 'r48b', segments: 48 },
    { id: 'r32a', segments: 32 },
    { id: 'r32b', segments: 32 },
    { id: 'r24a', segments: 24 },
    { id: 'r24b', segments: 24 },
    { id: 'r16a', segments: 16 },
    { id: 'r16b', segments: 16 }
  ];

  var DRUMS = [
    { id: 'kick', label: 'Kick', maker: 'kick', color: '#3b82f6' },
    { id: 'snare', label: 'Snare', maker: 'snare', color: '#67b7ef' },
    { id: 'hatClosed', label: 'Hat', maker: 'hat', open: false, color: '#d7f3ff' },
    { id: 'hatOpen', label: 'Open', maker: 'hat', open: true, color: '#8fd4ff' },
    { id: 'clap', label: 'Clap', maker: 'clap', color: '#4f8fe8' },
    { id: 'ride', label: 'Ride', maker: 'ride', color: '#2563eb' },
    { id: 'tom', label: 'Tom', maker: 'tom', color: '#1d4ed8' },
    { id: 'cowbell', label: 'Cow', maker: 'cowbell', color: '#93c5fd' }
  ];

  var MAKER_DEFAULTS = {
    kick: { f0: 150, f1: 42, pitchRampTime: 0.055, decayBase: 0.45, bodyLevel: 0.75, bodyPunchHold: 0.012, bodyPunchTime: 0.045, bodyTailLevel: 0.12, bodyHighpassHz: 32, bodyShape: 0.7, clickNoiseLevel: 0.3, clickOscLevel: 0.22, clickFreq: 3800, clickDecay: 0.005, clickFilterQ: 2, fmAmount: 0.35, fmDecay: 0.06, fmFreqMult: 1.6 },
    snare: { bodyF: 185, bodyFEnd: 95, decayT: 0.18, toneLevel: 0.72, fmAmount: 0.25, fmRatio: 2.2, decayN: 0.26, noiseLevel: 1.2, noiseFilterFreq: 2400, noiseFilterQ: 0.85, noiseFilterType: 'highpass', crackLevel: 1.4, crackDecay: 0.03, crackFreq: 6200, crackQ: 1.1 },
    clap: { decay: 0.08, level: 0.85, attack: 0, bpF: 4000, bpQ: 1.2, crackLevel: 0.2, crackFreq: 4500, crackDecay: 0.008, addTone: false, toneFreq: 280, toneDecay: 0.028, toneLevel: 0.18, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 },
    hat: { durClosed: 0.05, durOpen: 0.2, hpF: 6500, levelClosed: 0.58, levelOpen: 0.58, noiseType: 'pink', filterType: 'highpass', bpQ: 0.7, addOscillators: false, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.2, bodyLevel: 0.3, bodyFreq: 1400, bodyDecay: 0.022, attack: 0, stickLevel: 0.28, stickDecay: 0.006, stickFreq: 5500, resonantLevel: 0.15, resonantFreq: 10000, resonantQ: 4, resonantDecay: 0.025, hatOpen: false },
    tom: { level: 0.6, decay: 0.4, f0: 155, f1: 78, sweepTime: 0.18, bodyOscType: 'sine', attack: 0, stickLevel: 0.2, stickDecay: 0.02, stickFreq: 1800, stickQ: 1.2 },
    ride: { decay: 0.35, level: 0.4, stickDip: 0.7, attack: 0, hpF: 8000, bpF: 10000, bpQ: 0.8, addOscillators: false, oscFreq1: 8000, oscFreq2: 11000, oscLevel: 0.2 },
    cowbell: { level: 0.6, decay1: 0.15, decay2: 0.08, f1: 800, level1: 0.6, f2: 1200, level2: 0.4, osc1Type: 'sine', osc2Type: 'sine', addSecondPair: false, secondF1: 600, secondF2: 900, secondLevel: 0.2, secondDecay: 0.06, stickLevel: 0.2, stickDecay: 0.02, stickFreq: 3500, stickQ: 1.5 }
  };

  var MAKER_RANGES = {
    kick: { f0: [48, 220], f1: [28, 58], pitchRampTime: [0.02, 0.22], decayBase: [0.22, 0.85], bodyLevel: [0.55, 1], bodyPunchHold: [0.004, 0.028], bodyPunchTime: [0.02, 0.1], bodyTailLevel: [0.06, 0.28], bodyHighpassHz: [18, 70], bodyShape: [0.25, 0.9], clickNoiseLevel: [0.12, 0.55], clickOscLevel: [0.08, 0.4], clickFreq: [1400, 6200], clickDecay: [0.002, 0.02], clickFilterQ: [0.6, 4], fmAmount: [0.05, 0.8], fmDecay: [0.02, 0.12], fmFreqMult: [1, 2.4] },
    snare: { bodyF: [120, 280], bodyFEnd: [70, 160], decayT: [0.1, 0.28], toneLevel: [0.5, 0.95], fmAmount: [0, 0.7], fmRatio: [1.4, 3.5], decayN: [0.14, 0.36], noiseLevel: [0.9, 1.4], noiseFilterFreq: [1400, 4200], noiseFilterQ: [0.4, 2.2], crackLevel: [1, 1.7], crackDecay: [0.016, 0.08], crackFreq: [3200, 9000], crackQ: [0.6, 2.4] },
    clap: { decay: [0.045, 0.16], level: [0.55, 1], attack: [0, 0.008], bpF: [2400, 5600], bpQ: [0.5, 2], crackLevel: [0.05, 0.4], crackFreq: [2800, 6400], crackDecay: [0.005, 0.014], toneFreq: [180, 420], toneDecay: [0.016, 0.04], toneLevel: [0.04, 0.28], clapCount: [2, 6], clapSpacingMs: [7, 18], lastDecayMul: [1.3, 2.6] },
    hat: { durClosed: [0.02, 0.09], durOpen: [0.1, 0.42], levelClosed: [0.28, 0.78], levelOpen: [0.28, 0.78], attack: [0, 0.012], stickLevel: [0.08, 0.42], stickDecay: [0.003, 0.012], bodyLevel: [0.05, 0.45], bodyFreq: [700, 3200], bodyDecay: [0.008, 0.05], resonantLevel: [0, 0.28], resonantFreq: [8000, 12000], resonantQ: [2, 7], resonantDecay: [0.01, 0.04], hpF: [4000, 12000], bpQ: [0.4, 2.4], oscFreq1: [5000, 12000], oscFreq2: [7000, 15000], oscLevel: [0.06, 0.4] },
    tom: { level: [0.4, 0.85], decay: [0.2, 0.6], f0: [90, 180], f1: [52, 100], sweepTime: [0.08, 0.22], attack: [0, 0.016], stickLevel: [0.05, 0.35], stickDecay: [0.01, 0.03], stickFreq: [1100, 2400], stickQ: [0.7, 2] },
    ride: { decay: [0.18, 0.6], level: [0.2, 0.62], stickDip: [0.45, 0.9], attack: [0, 0.012], hpF: [5000, 11000], bpF: [7000, 13000], bpQ: [0.4, 1.5], oscFreq1: [5000, 11000], oscFreq2: [7000, 13000], oscLevel: [0.08, 0.35] },
    cowbell: { level: [0.3, 0.8], decay1: [0.06, 0.24], decay2: [0.03, 0.14], f1: [520, 1400], f2: [800, 2200], level1: [0.4, 0.9], level2: [0.2, 0.7], secondF1: [450, 1200], secondF2: [700, 1800], secondLevel: [0.08, 0.4], secondDecay: [0.03, 0.1], stickLevel: [0.05, 0.4], stickDecay: [0.01, 0.03], stickFreq: [2400, 4800], stickQ: [0.7, 2.6] }
  };

  var ROUND_KEYS = {
    kick: ['f0', 'f1', 'clickFreq'],
    snare: ['bodyF', 'bodyFEnd', 'noiseFilterFreq', 'crackFreq'],
    clap: ['bpF', 'clapCount', 'clapSpacingMs', 'crackFreq', 'toneFreq'],
    hat: ['hpF', 'oscFreq1', 'oscFreq2', 'bodyFreq', 'resonantFreq'],
    tom: ['f0', 'f1', 'stickFreq'],
    ride: ['hpF', 'bpF', 'oscFreq1', 'oscFreq2'],
    cowbell: ['f1', 'f2', 'secondF1', 'secondF2', 'stickFreq']
  };

  var svg = document.getElementById('beatSvg');
  var voiceRow = document.getElementById('beatVoices');
  var rollBtn = document.getElementById('beatRollBtn');
  var clearBtn = document.getElementById('beatClearBtn');
  var swingEl = document.getElementById('beatSwing');
  var levelEl = document.getElementById('beatLevel');
  var hubBtn = document.getElementById('beatHubBtn');
  var hubIcon = document.getElementById('beatHubIcon');

  var pattern = {};
  var segEls = {};
  var needleEl = null;
  var paintId = 'kick';
  var makerParams = {};
  var bank = {};
  var ctx = null;
  var master = null;
  var beatGain = null;
  var playing = false;
  var anchorAudio = null;
  var anchorBeat = 0;
  var secPerBeat = 0.5;
  var raf = 0;
  var flashTimers = [];
  var activeVoices = [];
  var renderToken = 0;

  function drumById(id) {
    for (var i = 0; i < DRUMS.length; i++) {
      if (DRUMS[i].id === id) return DRUMS[i];
    }
    return null;
  }

  function emptyPattern() {
    var p = {};
    RINGS.forEach(function (ring) {
      p[ring.id] = Array(ring.segments).fill(null);
    });
    return p;
  }

  function resetMakerParams() {
    Object.keys(MAKER_DEFAULTS).forEach(function (id) {
      makerParams[id] = Object.assign({}, MAKER_DEFAULTS[id]);
    });
  }

  function randomInRange(lo, hi, round) {
    var r = lo + Math.random() * (hi - lo);
    return round ? Math.round(r) : parseFloat(r.toFixed(3));
  }

  function rollMaker(id) {
    var ranges = MAKER_RANGES[id];
    var base = Object.assign({}, makerParams[id] || MAKER_DEFAULTS[id]);
    var rounds = ROUND_KEYS[id] || [];
    if (!ranges) return base;
    Object.keys(ranges).forEach(function (key) {
      var pair = ranges[key];
      base[key] = randomInRange(pair[0], pair[1], rounds.indexOf(key) !== -1);
    });
    if (id === 'snare' && Math.random() > 0.5) base.noiseFilterType = Math.random() > 0.5 ? 'bandpass' : 'highpass';
    if (id === 'clap') base.addTone = Math.random() > 0.45;
    if (id === 'hat') {
      base.noiseType = Math.random() > 0.5 ? 'pink' : 'white';
      base.filterType = Math.random() > 0.5 ? 'bandpass' : 'highpass';
      base.addOscillators = Math.random() > 0.55;
    }
    if (id === 'tom') base.bodyOscType = Math.random() > 0.5 ? 'triangle' : 'sine';
    if (id === 'ride') base.addOscillators = Math.random() > 0.5;
    if (id === 'cowbell') {
      base.osc1Type = ['sine', 'triangle', 'square'][Math.floor(Math.random() * 3)];
      base.osc2Type = ['sine', 'triangle', 'square'][Math.floor(Math.random() * 3)];
      base.addSecondPair = Math.random() > 0.6;
    }
    if (id === 'kick') {
      if (base.bodyLevel < 0.68) base.bodyLevel = 0.68;
      if (base.decayBase < 0.28) base.decayBase = 0.28;
    }
    if (id === 'snare') {
      if (base.noiseLevel < 0.95) base.noiseLevel = 0.95;
      if (base.crackLevel < 1.1) base.crackLevel = 1.1;
    }
    makerParams[id] = base;
  }

  function polar(r, a) {
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  }

  function arcPath(inner, outer, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var p0 = polar(outer, a0);
    var p1 = polar(outer, a1);
    var p2 = polar(inner, a1);
    var p3 = polar(inner, a0);
    return [
      'M', p0.x, p0.y,
      'A', outer, outer, 0, large, 1, p1.x, p1.y,
      'L', p2.x, p2.y,
      'A', inner, inner, 0, large, 0, p3.x, p3.y,
      'Z'
    ].join(' ');
  }

  function ringRadii(index) {
    var n = RINGS.length;
    var span = OUTER - INNER_HUB;
    var band = (span - RING_GAP * (n - 1)) / n;
    var outer = OUTER - index * (band + RING_GAP);
    var inner = outer - band;
    return { inner: inner, outer: outer };
  }

  function emptyFill(i) {
    return (i % 2 === 0) ? EMPTY_A : EMPTY_B;
  }

  function segFill(soundId, i) {
    if (!soundId) return emptyFill(i);
    var d = drumById(soundId);
    return d ? d.color : '#4f9ad4';
  }

  function paintSeg(ringId, i) {
    var el = segEls[ringId + ':' + i];
    if (!el) return;
    el.setAttribute('fill', segFill(pattern[ringId][i], i));
  }

  function paintAll() {
    RINGS.forEach(function (ring) {
      for (var i = 0; i < ring.segments; i++) paintSeg(ring.id, i);
    });
  }

  function buildSvg() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    segEls = {};
    var start = -Math.PI / 2;
    RINGS.forEach(function (ring, ri) {
      var rr = ringRadii(ri);
      var n = ring.segments;
      var sweep = (Math.PI * 2) / n;
      for (var i = 0; i < n; i++) {
        var a0 = start + i * sweep + SEG_GAP;
        var a1 = start + (i + 1) * sweep - SEG_GAP;
        if (a1 <= a0) a1 = a0 + 0.01;
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', arcPath(rr.inner, rr.outer, a0, a1));
        path.setAttribute('fill', segFill(pattern[ring.id][i], i));
        path.setAttribute('stroke', 'none');
        path.setAttribute('data-ring', ring.id);
        path.setAttribute('data-seg', String(i));
        path.style.cursor = 'pointer';
        path.addEventListener('pointerdown', onSegPointerDown);
        svg.appendChild(path);
        segEls[ring.id + ':' + i] = path;
      }
    });

    needleEl = document.createElementNS(NS, 'g');
    needleEl.setAttribute('pointer-events', 'none');
    var beam = document.createElementNS(NS, 'rect');
    beam.setAttribute('x', String(CX - 2));
    beam.setAttribute('y', String(CY - OUTER));
    beam.setAttribute('width', '4');
    beam.setAttribute('height', String(OUTER - INNER_HUB + 8));
    beam.setAttribute('rx', '2');
    beam.setAttribute('fill', '#c8ff00');
    beam.setAttribute('opacity', '0.9');
    needleEl.appendChild(beam);
    svg.appendChild(needleEl);
    needleEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
  }

  function onSegPointerDown(e) {
    e.preventDefault();
    var ringId = e.currentTarget.getAttribute('data-ring');
    var i = parseInt(e.currentTarget.getAttribute('data-seg'), 10);
    if (!pattern[ringId] || !Number.isFinite(i)) return;
    if (pattern[ringId][i] === paintId) pattern[ringId][i] = null;
    else {
      pattern[ringId][i] = paintId;
      preview(paintId);
    }
    paintSeg(ringId, i);
    if (window.RemixerBridge) window.RemixerBridge.requestEnable();
  }

  function renderVoices() {
    if (!voiceRow) return;
    voiceRow.innerHTML = '';
    DRUMS.forEach(function (d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'beat-voice' + (d.id === paintId ? ' is-active' : '');
      btn.textContent = d.label;
      btn.style.setProperty('--voice', d.color);
      btn.title = 'Paint ' + d.label;
      btn.addEventListener('click', function () {
        paintId = d.id;
        renderVoices();
        preview(d.id);
      });
      voiceRow.appendChild(btn);
    });
  }

  function hasHits() {
    for (var r = 0; r < RINGS.length; r++) {
      var steps = pattern[RINGS[r].id];
      if (!steps) continue;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i]) return true;
      }
    }
    return false;
  }

  function euclidHits(steps, pulses) {
    steps = Math.max(0, steps | 0);
    pulses = Math.max(0, Math.min(steps, pulses | 0));
    if (!steps) return [];
    if (!pulses) return Array(steps).fill(false);
    if (pulses === steps) return Array(steps).fill(true);
    var out = [];
    var counts = [];
    var remainders = [];
    var divisor = steps - pulses;
    remainders.push(pulses);
    var level = 0;
    while (true) {
      counts.push(Math.floor(divisor / remainders[level]));
      remainders.push(divisor % remainders[level]);
      divisor = remainders[level];
      level += 1;
      if (remainders[level] <= 1) break;
    }
    counts.push(divisor);
    function build(lvl) {
      if (lvl === -1) { out.push(false); return; }
      if (lvl === -2) { out.push(true); return; }
      var c;
      for (c = 0; c < counts[lvl]; c++) build(lvl - 1);
      if (remainders[lvl] !== 0) build(lvl - 2);
    }
    build(level);
    return out.reverse();
  }

  function rotateBools(arr, rot) {
    var n = arr.length;
    if (!n) return arr;
    rot = ((rot % n) + n) % n;
    return arr.slice(rot).concat(arr.slice(0, rot));
  }

  function randomPulses(n, core) {
    if (n <= 1) return n;
    var maxDens = 0.55;
    var max = Math.max(1, Math.floor(n * maxDens));
    if (core) {
      var minP = Math.min(max, Math.max(2, Math.round(n / 8)));
      var lo = Math.min(max, Math.max(minP, Math.round(n / 4)));
      var hi = Math.min(max, Math.max(lo, Math.round(n / 3)));
      if (Math.random() < 0.6) {
        var g = Math.max(minP, Math.min(max, Math.round(n * GOLDEN)));
        return g;
      }
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    }
    var cap = Math.max(1, max);
    if (Math.random() < 0.55) {
      var spread = Math.max(1, Math.round(cap * 0.22));
      var target = Math.max(1, Math.min(cap, Math.round(n * GOLDEN)));
      var a = Math.max(1, target - spread);
      var b = Math.min(cap, target + spread);
      return a + Math.floor(Math.random() * (b - a + 1));
    }
    return 1 + Math.floor(Math.random() * cap);
  }

  function applyEuclid(arr, soundId, pulses, rot) {
    var n = arr.length;
    if (!n || pulses <= 0) return;
    var hits = rotateBools(euclidHits(n, Math.min(pulses, n)), rot || 0);
    var ratio = Math.min(1, pulses / n);
    var skip = (ratio * GOLDEN + Math.abs(ratio - GOLDEN) * (1 - GOLDEN)) * 0.42;
    skip = Math.max(0.04, Math.min(0.62, skip));
    if (soundId === 'kick' || soundId === 'snare') skip *= 0.15;
    var placed = 0;
    var i;
    for (i = 0; i < n; i++) {
      if (!hits[i]) continue;
      if (Math.random() < skip) continue;
      arr[i] = soundId;
      placed += 1;
    }
    if ((soundId === 'kick' || soundId === 'snare') && placed < 2 && n >= 8) {
      for (i = 0; i < n && placed < 2; i++) {
        if (!hits[i] || arr[i] === soundId) continue;
        arr[i] = soundId;
        placed += 1;
      }
    }
  }

  function ringSteps(id) {
    for (var i = 0; i < RINGS.length; i++) {
      if (RINGS[i].id === id) return RINGS[i].segments;
    }
    return 16;
  }

  function takeRing(remaining, mode) {
    if (!remaining.length) return null;
    var best = remaining[0];
    var bestScore = -1;
    if (mode === 'any') {
      return remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
    }
    for (var i = 0; i < remaining.length; i++) {
      var steps = ringSteps(remaining[i]);
      var score = mode === 'few' ? 1 / (steps * steps) : steps * steps;
      score *= 0.75 + Math.random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = remaining[i];
      }
    }
    remaining.splice(remaining.indexOf(best), 1);
    return best;
  }

  function randomizePattern() {
    pattern = emptyPattern();
    var remaining = RINGS.map(function (r) { return r.id; });
    var used = [];
    var target = 4 + Math.floor(Math.random() * 3);

    function place(soundId, mode) {
      var ringId = takeRing(remaining, mode);
      if (!ringId) return;
      var n = ringSteps(ringId);
      var core = soundId === 'kick' || soundId === 'snare';
      applyEuclid(pattern[ringId], soundId, randomPulses(n, core), Math.floor(Math.random() * n));
      if (used.indexOf(soundId) === -1) used.push(soundId);
    }

    place('kick', 'few');
    place('snare', 'few');
    place('hatClosed', 'many');

    var pool = ['hatOpen', 'clap', 'ride', 'tom', 'cowbell', 'hatClosed', 'kick', 'snare'];
    while (used.length < target && remaining.length && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      var id = pool.splice(idx, 1)[0];
      var mode = id === 'kick' || id === 'snare' ? 'few' : (id.indexOf('hat') === 0 ? 'many' : 'any');
      place(id, mode);
    }
    paintAll();
  }

  function clearPattern() {
    pattern = emptyPattern();
    paintAll();
    if (window.RemixerBridge) window.RemixerBridge.requestEnable();
  }

  function attach(audioCtx, dest) {
    if (!audioCtx) return;
    ctx = audioCtx;
    master = dest;
    if (!beatGain || beatGain.context !== ctx) {
      beatGain = ctx.createGain();
      beatGain.gain.value = levelValue();
      if (master) beatGain.connect(master);
    }
  }

  function levelValue() {
    var n = levelEl ? Number(levelEl.value) : 72;
    if (!Number.isFinite(n)) n = 72;
    return Math.max(0, Math.min(1, n / 100)) * 0.85;
  }

  function applyLevel() {
    if (!beatGain || !ctx) return;
    beatGain.gain.setTargetAtTime(levelValue(), ctx.currentTime, 0.02);
  }

  function renderVoice(drum) {
    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var len = Math.ceil(BANK_SR * BANK_DUR);
    var offline = new OfflineCtx(1, len, BANK_SR);
    var params = Object.assign({}, makerParams[drum.maker] || MAKER_DEFAULTS[drum.maker]);
    var dest = offline.destination;
    var at = 0;
    if (drum.maker === 'kick') window.playKickTest(offline, dest, params, at);
    else if (drum.maker === 'snare') window.playSnareTest(offline, dest, params, at);
    else if (drum.maker === 'clap') window.playClapTest(offline, dest, params, at);
    else if (drum.maker === 'hat') window.playHatTest(offline, dest, params, at, !!drum.open);
    else if (drum.maker === 'ride') window.playRideTest(offline, dest, params, at);
    else if (drum.maker === 'cowbell') window.playCowbellTest(offline, dest, params, at);
    else if (drum.maker === 'tom') window.playTomTest(offline, dest, params, at);
    return offline.startRendering();
  }

  function renderBank() {
    var token = ++renderToken;
    return Promise.all(DRUMS.map(function (d) {
      return renderVoice(d).then(function (buf) {
        return { id: d.id, buf: buf };
      });
    })).then(function (list) {
      if (token !== renderToken) return;
      var next = {};
      list.forEach(function (item) { next[item.id] = item.buf; });
      bank = next;
    });
  }

  function prepare() {
    if (window.RemixerBridge) window.RemixerBridge.ensureAudio();
    return renderBank();
  }

  function playBuf(sampleId, when, gainMul) {
    var buf = bank[sampleId];
    if (!buf || !ctx || !beatGain) return;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    var mul = (gainMul || 1) * voiceGain(sampleId);
    g.gain.value = mul;
    src.connect(g);
    g.connect(beatGain);
    var startAt = Math.max(when, ctx.currentTime);
    try { src.start(startAt); } catch (err) { return; }
    activeVoices.push(src);
    src.onended = function () {
      var i = activeVoices.indexOf(src);
      if (i !== -1) activeVoices.splice(i, 1);
    };
  }

  function preview(id) {
    var go = function () { playBuf(id, ctx.currentTime + 0.02, 1); };
    if (bank[id] && ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      go();
      return;
    }
    prepare().then(function () {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      go();
    }).catch(function (err) { console.error(err); });
  }

  function stopVoices() {
    activeVoices.slice().forEach(function (src) {
      try { src.stop(0); } catch (err) { /* already stopped */ }
    });
    activeVoices = [];
    flashTimers.forEach(function (id) { clearTimeout(id); });
    flashTimers = [];
  }

  function swingAmount() {
    var v = swingEl ? swingEl.value : '0';
    if (v === 'deep') return 0.85;
    if (v === 'light') return 0.4;
    return 0;
  }

  function flashLater(ringId, i, when) {
    if (!ctx) return;
    var delay = Math.max(0, (when - ctx.currentTime) * 1000);
    var tid = setTimeout(function () {
      if (!playing) return;
      var el = segEls[ringId + ':' + i];
      if (!el) return;
      var prev = el.getAttribute('fill');
      el.setAttribute('fill', '#f4fff0');
      el.setAttribute('stroke', '#c8ff00');
      el.setAttribute('stroke-width', '2');
      setTimeout(function () {
        el.setAttribute('fill', prev || segFill(pattern[ringId][i], i));
        el.setAttribute('stroke', 'none');
      }, 90);
    }, delay);
    flashTimers.push(tid);
    if (flashTimers.length > 80) {
      clearTimeout(flashTimers.shift());
    }
  }

  function voiceGain(sampleId) {
    if (sampleId === 'snare') return 1.15;
    if (sampleId === 'kick') return 1.05;
    return 1;
  }

  /**
   * Drum hits whose beat position falls in [beatStart, beatStart + beatLen).
   * audioStart/audioDur is the same window the remixer is scheduling.
   */
  function forEachHit(audioStart, audioDur, beatStart, beatLen, fn) {
    if (!(beatLen > 0) || !(audioDur > 0)) return;
    var spb = audioDur / beatLen;
    var beatEnd = beatStart + beatLen;
    var swing = swingAmount();
    var swingDelay = swing * spb * 0.5 * 0.12;
    RINGS.forEach(function (ring) {
      var steps = pattern[ring.id];
      if (!steps) return;
      var n = ring.segments;
      var i;
      for (i = 0; i < n; i++) {
        if (!steps[i]) continue;
        var local = (i / n) * BEATS_PER_BAR;
        var k = Math.floor((beatStart - local) / BEATS_PER_BAR);
        if (k < 0) k = 0;
        for (; ; k++) {
          var hb = k * BEATS_PER_BAR + local;
          if (hb >= beatEnd - 1e-8) break;
          if (hb < beatStart - 1e-8) continue;
          var frac = (hb - beatStart) / beatLen;
          var when = audioStart + audioDur * frac;
          var eighth = Math.round(local / 0.5);
          if (swing > 0 && eighth % 2 === 1) when += swingDelay;
          fn(steps[i], when, ring.id, i);
        }
      }
    });
  }

  function scheduleBeats(audioStart, audioDur, beatStart, beatLen) {
    if (!playing || !ctx || !(beatLen > 0) || !(audioDur > 0)) return;
    var spb = audioDur / beatLen;
    if (anchorAudio == null || Math.abs(spb - secPerBeat) > 1e-4) {
      anchorAudio = audioStart;
      anchorBeat = beatStart;
      secPerBeat = spb;
    }
    forEachHit(audioStart, audioDur, beatStart, beatLen, function (id, when, ringId, i) {
      playBuf(id, when, 1);
      flashLater(ringId, i, when);
    });
  }

  function copyBank(octx) {
    var out = {};
    DRUMS.forEach(function (d) {
      var buf = bank[d.id];
      if (!buf) return;
      var copy = octx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
      for (var c = 0; c < buf.numberOfChannels; c++) {
        copy.getChannelData(c).set(buf.getChannelData(c));
      }
      out[d.id] = copy;
    });
    return out;
  }

  /** Same hit grid as live playback, rendered into an offline mix bus. */
  function scheduleOffline(octx, dest, buffers, audioStart, audioDur, beatStart, beatLen) {
    if (!octx || !dest || !buffers) return;
    forEachHit(audioStart, audioDur, beatStart, beatLen, function (id, when) {
      var buf = buffers[id];
      if (!buf || when < -0.001) return;
      var src = octx.createBufferSource();
      src.buffer = buf;
      var g = octx.createGain();
      g.gain.value = voiceGain(id);
      src.connect(g);
      g.connect(dest);
      try { src.start(Math.max(0, when)); } catch (err) { /* skip */ }
    });
  }

  function updateNeedle() {
    if (!needleEl) return;
    if (!playing || anchorAudio == null || !ctx || !(secPerBeat > 0)) {
      needleEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
      return;
    }
    var beat = anchorBeat + (ctx.currentTime - anchorAudio) / secPerBeat;
    var phase = ((beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    var deg = (phase / BEATS_PER_BAR) * 360;
    needleEl.setAttribute('transform', 'rotate(' + deg + ' ' + CX + ' ' + CY + ')');
  }

  function loop() {
    updateNeedle();
    if (playing) raf = requestAnimationFrame(loop);
  }

  function setHubPlaying(on) {
    if (!hubBtn) return;
    hubBtn.classList.toggle('is-playing', !!on);
    if (hubIcon) {
      hubIcon.innerHTML = on
        ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
        : '<path d="M8 5v14l11-7z"/>';
    }
  }

  function onTransportStart() {
    playing = true;
    anchorAudio = null;
    stopVoices();
    setHubPlaying(true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function onTransportStop() {
    playing = false;
    anchorAudio = null;
    cancelAnimationFrame(raf);
    raf = 0;
    stopVoices();
    setHubPlaying(false);
    updateNeedle();
    RINGS.forEach(function (ring) {
      for (var i = 0; i < ring.segments; i++) paintSeg(ring.id, i);
    });
  }

  function syncHub(enabled) {
    if (!hubBtn) return;
    hubBtn.disabled = !enabled;
  }

  function setRollBusy(on) {
    if (!rollBtn) return;
    rollBtn.disabled = !!on;
    rollBtn.classList.toggle('is-busy', !!on);
  }

  function rollAll() {
    setRollBusy(true);
    Object.keys(MAKER_DEFAULTS).forEach(rollMaker);
    randomizePattern();
    prepare().then(function () {
      setRollBusy(false);
      if (window.RemixerBridge) window.RemixerBridge.requestEnable();
      if (!playing) preview(paintId);
    }).catch(function (err) {
      setRollBusy(false);
      console.error(err);
    });
  }

  resetMakerParams();
  pattern = emptyPattern();
  randomizePattern();
  buildSvg();
  renderVoices();

  if (rollBtn) rollBtn.addEventListener('click', rollAll);
  if (clearBtn) clearBtn.addEventListener('click', clearPattern);
  if (levelEl) levelEl.addEventListener('input', applyLevel);
  if (hubBtn) {
    hubBtn.addEventListener('click', function () {
      if (window.RemixerBridge) window.RemixerBridge.togglePlay();
    });
  }

  window.BeatWheel = {
    attach: attach,
    prepare: prepare,
    hasHits: hasHits,
    levelGain: levelValue,
    copyBank: copyBank,
    scheduleOffline: scheduleOffline,
    scheduleBeats: scheduleBeats,
    onTransportStart: onTransportStart,
    onTransportStop: onTransportStop,
    syncHub: syncHub
  };
})();

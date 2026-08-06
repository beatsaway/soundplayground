/**
 * Circle Beat — up to 20 wheels (layers). Edit one at a time.
 * Play starts at current layer, then loops through next enabled circles.
 * Human / Swing capped at 10% of step.
 */
(function () {
  'use strict';

  var MAX_CIRCLES = 20;
  /** Two thin rings per subdivision (48 / 32 / 24 / 16). */
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

  /** Warm / magenta / green — no blues (blues reserved for drums). */
  var SAY_COLORS = [
    '#ff6a00', '#c43dff', '#ff2d8a', '#1eea4a', '#ffd000',
    '#ff3b1a', '#a34dff', '#e85d04', '#7b2cbf'
  ];
  var SAMPLE_COLORS = [
    '#d4894a', '#9a6cbc', '#c46a8e', '#5aaa6a', '#c4a84a',
    '#c4745a', '#8a6aaa', '#d4a574', '#b56576'
  ];
  var SAY_PATTERN = 'dots';
  var SAMPLE_PATTERN = 'diag';
  // Blue-family drums + distinct overlays so they stay readable.
  var DRUM_META = {
    kick: { color: '#0b1f4a', pattern: 'dotsBig' },
    tom: { color: '#123a7a', pattern: 'stripesH' },
    ride: { color: '#1a4f9c', pattern: 'stripesV' },
    clap: { color: '#2563b8', pattern: 'cross' },
    cowbell: { color: '#3b82c4', pattern: 'checkers' },
    snare: { color: '#4f9ad4', pattern: 'rings' },
    hatOpen: { color: '#7ec8f0', pattern: 'dash' },
    hatClosed: { color: '#b8e0ff', pattern: 'grid' }
  };

  var SAMPLES = [
    { id: 'say1', label: 'Word 1', type: 'text', color: SAY_COLORS[0], pattern: SAY_PATTERN },
    { id: 'say2', label: 'Word 2', type: 'text', color: SAY_COLORS[1], pattern: SAY_PATTERN },
    { id: 'say3', label: 'Word 3', type: 'text', color: SAY_COLORS[2], pattern: SAY_PATTERN },
    { id: 'say4', label: 'Word 4', type: 'text', color: SAY_COLORS[3], pattern: SAY_PATTERN },
    { id: 'say5', label: 'Word 5', type: 'text', color: SAY_COLORS[4], pattern: SAY_PATTERN },
    { id: 'say6', label: 'Word 6', type: 'text', color: SAY_COLORS[5], pattern: SAY_PATTERN },
    { id: 'say7', label: 'Word 7', type: 'text', color: SAY_COLORS[6], pattern: SAY_PATTERN },
    { id: 'say8', label: 'Word 8', type: 'text', color: SAY_COLORS[7], pattern: SAY_PATTERN },
    { id: 'say9', label: 'Word 9', type: 'text', color: SAY_COLORS[8], pattern: SAY_PATTERN },
    { id: 'kick', label: 'Kick', type: 'maker', maker: 'kick', open: false, color: DRUM_META.kick.color, pattern: DRUM_META.kick.pattern },
    { id: 'snare', label: 'Snare', type: 'maker', maker: 'snare', open: false, color: DRUM_META.snare.color, pattern: DRUM_META.snare.pattern },
    { id: 'clap', label: 'Clap', type: 'maker', maker: 'clap', open: false, color: DRUM_META.clap.color, pattern: DRUM_META.clap.pattern },
    { id: 'hatClosed', label: 'Hat', type: 'maker', maker: 'hat', open: false, color: DRUM_META.hatClosed.color, pattern: DRUM_META.hatClosed.pattern },
    { id: 'hatOpen', label: 'Open', type: 'maker', maker: 'hat', open: true, color: DRUM_META.hatOpen.color, pattern: DRUM_META.hatOpen.pattern },
    { id: 'ride', label: 'Ride', type: 'maker', maker: 'ride', open: false, color: DRUM_META.ride.color, pattern: DRUM_META.ride.pattern },
    { id: 'cowbell', label: 'Cow', type: 'maker', maker: 'cowbell', open: false, color: DRUM_META.cowbell.color, pattern: DRUM_META.cowbell.pattern },
    { id: 'tom', label: 'Tom', type: 'maker', maker: 'tom', open: false, color: DRUM_META.tom.color, pattern: DRUM_META.tom.pattern },
    { id: 'sample1', label: 'Sample 1', type: 'sample', color: SAMPLE_COLORS[0], pattern: SAMPLE_PATTERN },
    { id: 'sample2', label: 'Sample 2', type: 'sample', color: SAMPLE_COLORS[1], pattern: SAMPLE_PATTERN },
    { id: 'sample3', label: 'Sample 3', type: 'sample', color: SAMPLE_COLORS[2], pattern: SAMPLE_PATTERN },
    { id: 'sample4', label: 'Sample 4', type: 'sample', color: SAMPLE_COLORS[3], pattern: SAMPLE_PATTERN },
    { id: 'sample5', label: 'Sample 5', type: 'sample', color: SAMPLE_COLORS[4], pattern: SAMPLE_PATTERN },
    { id: 'sample6', label: 'Sample 6', type: 'sample', color: SAMPLE_COLORS[5], pattern: SAMPLE_PATTERN },
    { id: 'sample7', label: 'Sample 7', type: 'sample', color: SAMPLE_COLORS[6], pattern: SAMPLE_PATTERN },
    { id: 'sample8', label: 'Sample 8', type: 'sample', color: SAMPLE_COLORS[7], pattern: SAMPLE_PATTERN },
    { id: 'sample9', label: 'Sample 9', type: 'sample', color: SAMPLE_COLORS[8], pattern: SAMPLE_PATTERN }
  ];

  var CORE_DRUM_IDS = ['kick', 'snare', 'hatClosed'];

  var EMPTY_COLOR = '#1e1e24';
  var NS = 'http://www.w3.org/2000/svg';
  var HOLD_MS = 450;
  var sayTexts = {
    say1: '', say2: '', say3: '', say4: '', say5: '',
    say6: '', say7: '', say8: '', say9: ''
  };
  /** Per-word: browser voice + pseudo-random pitch/volume variation amounts (0–1). */
  var sayVoiceParams = {
    say1: null, say2: null, say3: null, say4: null, say5: null,
    say6: null, say7: null, say8: null, say9: null
  };
  var sampleNames = {
    sample1: '', sample2: '', sample3: '', sample4: '', sample5: '',
    sample6: '', sample7: '', sample8: '', sample9: ''
  };
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
    kick: { f0: [48, 250], f1: [20, 62], pitchRampTime: [0.012, 0.48], decayBase: [0.1, 1.4], bodyLevel: [0.2, 1.02], bodyPunchHold: [0.003, 0.035], bodyPunchTime: [0.02, 0.14], bodyTailLevel: [0.05, 0.4], bodyHighpassHz: [0, 78], bodyShape: [0, 1], clickNoiseLevel: [0, 0.82], clickOscLevel: [0, 0.68], clickFreq: [600, 7200], clickDecay: [0.0015, 0.036], clickFilterQ: [0.4, 7], fmAmount: [0, 1.25], fmDecay: [0.018, 0.2], fmFreqMult: [0.6, 3] },
    snare: { bodyF: [75, 500], bodyFEnd: [50, 280], decayT: [0.08, 0.42], toneLevel: [0.45, 1.05], fmAmount: [0, 1.5], fmRatio: [1, 6.5], decayN: [0.12, 0.55], noiseLevel: [0.85, 1.55], noiseFilterFreq: [900, 5200], noiseFilterQ: [0.3, 4], crackLevel: [0.9, 1.9], crackDecay: [0.012, 0.26], crackFreq: [2200, 12000], crackQ: [0.4, 4.2] },
    clap: { decay: [0.035, 0.2], level: [0.45, 1.05], attack: [0, 0.011], bpF: [2000, 6000], bpQ: [0.28, 2.4], crackLevel: [0, 0.52], crackFreq: [2200, 7200], crackDecay: [0.004, 0.018], toneFreq: [130, 520], toneDecay: [0.014, 0.052], toneLevel: [0.02, 0.38], clapCount: [1, 8], clapSpacingMs: [6, 26], lastDecayMul: [1.1, 2.9] },
    hat: { durClosed: [0.01, 0.21], durOpen: [0.06, 0.82], levelClosed: [0.08, 0.98], levelOpen: [0.08, 0.98], attack: [0, 0.024], stickLevel: [0, 0.58], stickDecay: [0.002, 0.018], bodyLevel: [0, 0.82], bodyFreq: [300, 5400], bodyDecay: [0.006, 0.115], resonantLevel: [0, 0.48], resonantFreq: [8000, 12000], resonantQ: [2, 9.5], resonantDecay: [0.008, 0.058], hpF: [2000, 15800], bpQ: [0.25, 4.8], oscFreq1: [3600, 14800], oscFreq2: [4600, 17800], oscLevel: [0.04, 0.72] },
    tom: { level: [0.35, 0.95], decay: [0.18, 0.85], f0: [70, 200], f1: [48, 110], sweepTime: [0.06, 0.28], attack: [0, 0.028], stickLevel: [0, 0.48], stickDecay: [0.01, 0.045], stickFreq: [900, 2800], stickQ: [0.6, 2.8] },
    ride: { decay: [0.14, 0.82], level: [0.12, 0.82], stickDip: [0.38, 0.98], attack: [0, 0.019], hpF: [3800, 11800], bpF: [5800, 13800], bpQ: [0.25, 1.9], oscFreq1: [4200, 11800], oscFreq2: [5800, 13800], oscLevel: [0.06, 0.48] },
    cowbell: { level: [0.2, 0.95], decay1: [0.05, 0.32], decay2: [0.025, 0.18], f1: [450, 2100], f2: [700, 3000], level1: [0.3, 1], level2: [0.15, 0.85], secondF1: [400, 1700], secondF2: [600, 2300], secondLevel: [0.08, 0.55], secondDecay: [0.025, 0.14], stickLevel: [0, 0.58], stickDecay: [0.008, 0.038], stickFreq: [2000, 5500], stickQ: [0.6, 3.8] }
  };
  var MAKER_ROUND_KEYS = {
    kick: ['f0', 'f1', 'clickFreq'],
    snare: ['bodyF', 'bodyFEnd', 'noiseFilterFreq', 'crackFreq'],
    clap: ['bpF', 'clapCount', 'clapSpacingMs', 'crackFreq', 'toneFreq'],
    hat: ['hpF', 'oscFreq1', 'oscFreq2', 'bodyFreq', 'resonantFreq'],
    tom: ['f0', 'f1', 'stickFreq'],
    ride: ['hpF', 'bpF', 'oscFreq1', 'oscFreq2'],
    cowbell: ['f1', 'f2', 'secondF1', 'secondF2', 'stickFreq']
  };
  var MAKER_BOOLS = {
    snare: [{ key: 'noiseFilterType', options: ['highpass', 'bandpass'], label: 'Noise filter' }],
    clap: [{ key: 'addTone', type: 'bool', label: 'Add tone' }],
    hat: [
      { key: 'noiseType', options: ['white', 'pink'], label: 'Noise' },
      { key: 'filterType', options: ['highpass', 'bandpass'], label: 'Filter' },
      { key: 'addOscillators', type: 'bool', label: 'Oscillators' }
    ],
    tom: [{ key: 'bodyOscType', options: ['sine', 'triangle'], label: 'Body osc' }],
    ride: [{ key: 'addOscillators', type: 'bool', label: 'Oscillators' }],
    cowbell: [
      { key: 'osc1Type', options: ['sine', 'triangle', 'square'], label: 'Osc 1' },
      { key: 'osc2Type', options: ['sine', 'triangle', 'sawtooth', 'square'], label: 'Osc 2' },
      { key: 'addSecondPair', type: 'bool', label: 'Second pair' }
    ]
  };
  var makerIds = ['kick', 'snare', 'clap', 'hat', 'tom', 'ride', 'cowbell'];
  var makerSoundParams = {};
  makerIds.forEach(function (id) {
    makerSoundParams[id] = Object.assign({}, MAKER_DEFAULTS[id]);
  });

  var BANK_DUR = 0.55;
  var BANK_SR = 44100;
  var LOOK_AHEAD = 0.12;
  var SCHEDULE_MS = 25;
  var MAX_DELAY_FRAC = 0.10;
  /** Max offbeat delay as a fraction of the swing-note unit (1.0 ≈ full shuffle). */
  var SWING_MAX_DELAY_FRAC = 0.42;
  var REVERB_HP_HZ = 267;
  var STEREO_CROSSOVER_HZ = 267;
  var MASTER_GAIN = 0.85;
  /** Sidechain duck (envelope, not a compressor — no ratio).
   *  Depth = residual gain while ducked; shorter atk/rel = snappier pump. */
  var DUCK_DEPTH = 0.12;
  var DUCK_ATTACK = 0.002;
  var DUCK_HOLD = 0.04;
  var DUCK_RELEASE = 0.09;
  var CX = 500;
  var CY = 500;
  var OUTER = 470;
  var INNER_HUB = 140;
  var RING_GAP = 3;
  var SEG_GAP_DEG = 1.8;
  var START_ANGLE = -Math.PI / 2;

  var layers = [];
  var viewLayer = 0;
  var pattern = null;
  var soundBank = {};
  var paintSample = 'say1';
  var ctx = null;
  var master = null;
  var punchBus = null;
  var duckGain = null;
  var mixBus = null;
  var analyser = null;
  var analyserData = null;
  var fftCanvas = document.getElementById('fftRing');
  var fftCtx2d = fftCanvas ? fftCanvas.getContext('2d') : null;
  var fftSmooth = null;
  var fftParticles = [];
  var FFT_POINTS_MAX = 28;
  var FFT_PARTICLE_COUNT = 10;
  var starCanvas = document.getElementById('starField');
  var starCtx2d = starCanvas ? starCanvas.getContext('2d') : null;
  var stageEl = document.getElementById('stage');
  var starParticles = [];
  var STAR_COUNT = 22;
  var galaxyParticles = [];
  var GALAXY_COUNT = 200; // low-cost slow white star undertone
  var FLOCK_TRAIL = 6;
  var glitchLines = [];
  var nextGlitchAt = 0;
  var reverbConvolver = null;
  var reverbWetGain = null;
  var stereoMidHighGain = null;
  var activeVoices = [];
  var playing = false;
  var nextBarTime = 0;
  var barOrigin = 0;
  var scheduleTimer = 0;
  var playheadRaf = 0;
  var audioReady = false;
  var playCursor = 0;
  var barEvents = [];
  var shownPlayLayer = -1;
  var viewLocked = false;
  /** Stop rewind: { fromDeg, t0, durMs } — spins disc back to 0°. */
  var discRewind = null;
  /** Painted segment hit flashes: key "ring:i" → audio time of hit. */
  var segHitFlashes = {};

  /** DJ platter / vinyl rub — variable-rate music clock while scratching. */
  var PLATTER_BRAKE_RATE = 0.1;
  var PLATTER_MAX_RATE = 4.8;
  var PLATTER_MIN_RATE = -3.6;
  var PLATTER_DRAG_PX = 5;
  var playOriginLayer = 0;
  var transport = {
    free: false,
    rate: 1,
    target: 1,
    musicTime: 0,
    lastMusicTime: 0,
    lastCtx: 0,
    easing: false
  };
  var platterGesture = null;
  var scrubHitCache = {};
  var scrubCacheBarDur = 0;

  var svg = document.getElementById('ringSvg');
  var hubBtn = document.getElementById('hubBtn');
  var hubIcon = document.getElementById('hubIcon');
  var hubProducerImg = document.getElementById('hubProducerImg');
  /** Producer face on pause hub only after first Lucky Roll. */
  var hubProducerFaceOn = false;
  /** Producer id locked onto the hub — updates only when Lucky Roll is pressed. */
  var hubProducerFaceId = null;
  var hubPauseFadeTimer = null;
  var playStartedAt = 0;
  var circleWrap = document.getElementById('circleWrap');
  var bpmEl = document.getElementById('bpm');
  var bpmVal = document.getElementById('bpmVal');
  var humanEl = document.getElementById('humanize');
  var humanVal = document.getElementById('humanVal');
  var swingEl = document.getElementById('swing');
  var swingVal = document.getElementById('swingVal');
  var swingNoteEl = document.getElementById('swingNote');
  var reverbEl = document.getElementById('reverb');
  var reverbVal = document.getElementById('reverbVal');
  var reverbDurEl = document.getElementById('reverbDuration');
  var reverbDurVal = document.getElementById('reverbDurationVal');
  var stereoEl = document.getElementById('stereo');
  var stereoVal = document.getElementById('stereoVal');
  var panelBurger = document.getElementById('panelBurger');
  var panelMenu = document.getElementById('panelMenu');
  var panelMenuWrap = document.getElementById('panelMenuWrap');
  var appRoot = document.getElementById('appRoot');
  var launchOverlay = document.getElementById('launchOverlay');
  var launchProducerFace = document.getElementById('launchProducerFace');
  var launchProducerName = document.getElementById('launchProducerName');
  var launchProducerBlurb = document.getElementById('launchProducerBlurb');
  var launchProducerPrev = document.getElementById('launchProducerPrev');
  var launchProducerNext = document.getElementById('launchProducerNext');
  var topCloseBtn = document.getElementById('topCloseBtn');
  var activePanel = 'edit';
  var visualFxOn = true;
  var visualFxBtn = document.getElementById('visualFxBtn');
  var appStarted = false;
  var energyBursts = [];
  var baseHaloWings = [];
  var shootingStars = [];
  var nextShootAt = 0;
  var pendingKickBursts = [];
  var kickBurstCooldownUntil = 0;
  var layerTrigger = document.getElementById('layerTrigger');
  var layerMenu = document.getElementById('layerMenu');
  var layerLab = document.getElementById('layerLab');
  var paintWordTrigger = document.getElementById('paintWordTrigger');
  var paintDrumTrigger = document.getElementById('paintDrumTrigger');
  var paintSampleTrigger = document.getElementById('paintSampleTrigger');
  var paintWordDot = document.getElementById('paintWordDot');
  var paintDrumDot = document.getElementById('paintDrumDot');
  var paintSampleDot = document.getElementById('paintSampleDot');
  var paintWordLab = document.getElementById('paintWordLab');
  var paintDrumLab = document.getElementById('paintDrumLab');
  var paintSampleLab = document.getElementById('paintSampleLab');
  var paintGroup = 'word';
  var paintByGroup = { word: 'say1', drum: 'kick', sample: 'sample1' };
  var paintGroupMenu = null;
  var paintMenuOpenGroup = null;
  var randBtn = document.getElementById('randBtn');
  var randProducerFaceImg = document.getElementById('randProducerFaceImg');
  var randOptsBtn = document.getElementById('randOptsBtn');
  var randOptsMenu = document.getElementById('randOptsMenu');
  var randLayersList = document.getElementById('randLayersList');
  var randOptLive = document.getElementById('randOptLive');
  var randOptProducer = document.getElementById('randOptProducer');
  var randOptPatterns = document.getElementById('randOptPatterns');
  var randOptSounds = document.getElementById('randOptSounds');
  var randOptWords = document.getElementById('randOptWords');
  var randOptVoices = document.getElementById('randOptVoices');
  var randOptBpm = document.getElementById('randOptBpm');
  var randOptSpace = document.getElementById('randOptSpace');
  var nudgeBtn = document.getElementById('nudgeBtn');
  var nudgeOptsBtn = document.getElementById('nudgeOptsBtn');
  var nudgeOptsMenu = document.getElementById('nudgeOptsMenu');
  var nudgeLayersList = document.getElementById('nudgeLayersList');
  var nudgeOptPatterns = document.getElementById('nudgeOptPatterns');
  var nudgeOptSounds = document.getElementById('nudgeOptSounds');
  var nudgeOptWords = document.getElementById('nudgeOptWords');
  var nudgeOptVoices = document.getElementById('nudgeOptVoices');
  var nudgeOptBpm = document.getElementById('nudgeOptBpm');
  var nudgeOptSpace = document.getElementById('nudgeOptSpace');
  /**
   * Live Lucky Roll queue — nothing here touches the current wheel until the
   * next bar is scheduled. Shape:
   * { patterns, makerParams, buffers, sayTexts, sayVoices, bpm, space, globalsApplied }
   */
  var livePendingRoll = null;
  /** Audio-time when the view should rebuild after a Live pattern swap. */
  var liveRedrawAt = null;
  /** Deferred tempo/space from a Live roll, applied at bar start. */
  var liveTempoAt = null;
  var liveTempoBpm = null;
  var liveTempoSpace = null;
  var luckyEuclidDensEl = document.getElementById('luckyEuclidDens');
  var luckyEuclidDensVal = document.getElementById('luckyEuclidDensVal');
  var luckyEuclidGoldenEl = document.getElementById('luckyEuclidGolden');
  var luckyEuclidGoldenVal = document.getElementById('luckyEuclidGoldenVal');
  var luckySkipEl = document.getElementById('luckySkip');
  var luckySkipVal = document.getElementById('luckySkipVal');
  var luckySoundsEl = document.getElementById('luckySounds');
  var luckySoundsVal = document.getElementById('luckySoundsVal');
  var luckyReuseEl = document.getElementById('luckyReuse');
  var luckyReuseVal = document.getElementById('luckyReuseVal');
  var luckyConsistencyEl = document.getElementById('luckyConsistency');
  var luckyConsistencyVal = document.getElementById('luckyConsistencyVal');
  var luckyWordsVolEl = document.getElementById('luckyWordsVol');
  var luckyWordsVolVal = document.getElementById('luckyWordsVolVal');
  var luckyHumanityEl = document.getElementById('luckyHumanity');
  var luckyHumanityVal = document.getElementById('luckyHumanityVal');
  var luckySpeedEl = document.getElementById('luckySpeed');
  var luckySpeedVal = document.getElementById('luckySpeedVal');
  var luckyProducerBtn = document.getElementById('luckyProducerBtn');
  var luckyProducerFaceImg = document.getElementById('luckyProducerFaceImg');
  var luckyProducerLab = document.getElementById('luckyProducerLab');
  var luckyProducerMenu = document.getElementById('luckyProducerMenu');
  var appProducerFaceBtn = document.getElementById('appProducerFaceBtn');
  var appProducerFaceImg = document.getElementById('appProducerFaceImg');
  var currentProducerPickId = 'default';
  var luckyTipEl = document.getElementById('luckyTip');
  var luckyTipTitleEl = document.getElementById('luckyTipTitle');
  var luckyTipBodyEl = document.getElementById('luckyTipBody');
  var luckyTipCloseEl = document.getElementById('luckyTipClose');
  var soundSheet = document.getElementById('soundSheet');
  var soundBody = document.getElementById('soundBody');
  var soundTitle = document.getElementById('soundTitle');
  var soundDot = document.getElementById('soundDot');
  var soundClose = document.getElementById('soundClose');
  var fileMenuBtn = document.getElementById('fileMenuBtn');
  var fileMenuSub = document.getElementById('fileMenuSub');
  var codeSheet = document.getElementById('codeSheet');
  var codeTitle = document.getElementById('codeTitle');
  var codeHint = document.getElementById('codeHint');
  var codeText = document.getElementById('codeText');
  var codeCancelBtn = document.getElementById('codeCancelBtn');
  var codeCopyBtn = document.getElementById('codeCopyBtn');
  var codeActionBtn = document.getElementById('codeActionBtn');
  var codeSheetMode = 'load';
  var wavInput = document.getElementById('wavInput');
  var playheadEl = null;
  var discGroupEl = null;
  var needleEl = null;
  var segEls = {};
  var editMakerId = null;
  var rebuildTimer = 0;
  var sayBusy = false;

  var ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  var ICON_PAUSE = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';

  function sampleById(id) {
    for (var i = 0; i < SAMPLES.length; i++) {
      if (SAMPLES[i].id === id) return SAMPLES[i];
    }
    return null;
  }

  function getHumanize() {
    return Math.max(0, Math.min(1, (parseFloat(humanEl.value) || 0) / 100));
  }

  /** Lucky Roll producer presets. */
  var LUCKY_PRODUCERS = [
    { id: 'default', name: 'David', emoji: '🤖', thumb: 'producer-thumbs/david.webp', blurb: 'Me artistic groover.', dens: 32, golden: 25, skip: 27, sounds: 7, reuse: 94, words: 34, humanity: 27, speed: 35 },
    { id: 'jacky', name: 'Jacky', emoji: '🦊', thumb: 'producer-thumbs/jacky.webp', blurb: 'Something of a DJ myself.', dens: 36, golden: 32, skip: 42, sounds: 7, reuse: 90, words: 34, humanity: 27, speed: 35 },
    { id: 'maisie', name: 'Maisie', emoji: '🌸', thumb: 'producer-thumbs/maisie.webp', blurb: ' More yap!', dens: 28, golden: 55, skip: 45, sounds: 6, reuse: 20, words: 90, humanity: 95, speed: 32 },
    { id: 'dense', name: 'Dennis', emoji: '🤖', thumb: 'producer-thumbs/dense.webp', blurb: 'Some say I\'m dense. I don\'t deny it.', dens: 72, golden: 35, skip: 18, sounds: 8, reuse: 55, words: 85, humanity: 40, speed: 72 },
    { id: 'ghost', name: 'Ghost', emoji: '👻', thumb: 'producer-thumbs/ghost.webp', blurb: ' Hello  . . . ?  ', dens: 20, golden: 70, skip: 78, sounds: 6, reuse: 40, words: 19, humanity: 85, speed: 44 },
    { id: 'custom', name: 'Custom', emoji: '👾', thumb: 'producer-thumbs/custom.webp', blurb: 'Wait. This beat is yours. I\'m just watching.', dens: null, golden: null, skip: null, sounds: null, reuse: null, words: null, humanity: null, speed: null }
  ];
  var CUSTOM_PRODUCER_EMOJI = '❓';
  var CUSTOM_PRODUCER_THUMB = 'producer-thumbs/custom.webp';

  var LUCKY_HELP = {
    dens: {
      title: 'Dens',
      body: 'Max Euclidean density (how many hits per ring before skip). Higher = busier patterns. Sets the ceiling; Golden picks inside that range.'
    },
    golden: {
      title: 'Golden',
      body: 'How often pulse counts lean toward the golden-ratio density (~61.8%), still capped by Dens. Complements Dens — not the same as Skip.'
    },
    skip: {
      title: 'Skip',
      body: 'After Euclidean hits are placed, chance to drop some. Second stage only. Kick/snare stay mostly protected.'
    },
    sounds: {
      title: 'Sounds',
      body: 'How many distinct sounds to place first (kick/snare/hat, then extras). Reuse only applies to rings left after this.'
    },
    reuse: {
      title: 'Reuse',
      body: 'For leftover rings only (after Sounds are filled), chance to copy an already-used sound. If Sounds fills every ring, Reuse does nothing.'
    },
    consistency: {
      title: 'Match',
      body: 'When several wheels Lucky Roll together, how similar their structures are. 100% = same rings/sounds/pulse plans (Skip can still differ). 0% = each wheel independent.'
    },
    words: {
      title: 'Words',
      body: 'Overall loudness of word (SAM) hits in the mix. 100% is normal; producers who like vocal hooks go higher.'
    },
    humanity: {
      title: 'Humanity',
      body: 'How likely this producer uses word sounds in a Lucky Roll. 0% = drums/samples only; 100% = words always eligible for free slots.'
    },
    speed: {
      title: 'Speed',
      body: 'How fast this producer usually goes when Lucky Roll sets BPM. Lower = slower tempos; higher = faster.'
    }
  };

  function producerById(id) {
    for (var i = 0; i < LUCKY_PRODUCERS.length; i++) {
      if (LUCKY_PRODUCERS[i].id === id) return LUCKY_PRODUCERS[i];
    }
    return LUCKY_PRODUCERS[0];
  }

  function producerEmoji(id) {
    if (!id || id === 'custom') return CUSTOM_PRODUCER_EMOJI;
    var p = producerById(id);
    if (!p || p.id === 'custom' || !p.emoji) return CUSTOM_PRODUCER_EMOJI;
    return p.emoji;
  }

  function producerThumbSrc(idOrProducer) {
    var p = typeof idOrProducer === 'string' ? producerById(idOrProducer) : idOrProducer;
    if (!p || !p.thumb) return CUSTOM_PRODUCER_THUMB;
    return p.thumb;
  }

  function setProducerFaceImg(imgEl, id) {
    if (!imgEl) return;
    var p = producerById(id || 'custom');
    if (!p || p.id === 'custom') p = producerById('custom');
    var src = producerThumbSrc(p);
    var cur = imgEl.getAttribute('src') || '';
    if (cur === src) {
      imgEl.alt = p.name || 'Producer';
      return;
    }
    // Decode first so launch/hub faces never flash empty (or a browser tap tint).
    var probe = new Image();
    probe.decoding = 'async';
    probe.onload = function () {
      if (imgEl.getAttribute('data-face-src') !== src) return;
      imgEl.src = src;
      imgEl.alt = p.name || 'Producer';
    };
    probe.onerror = function () {
      if (imgEl.getAttribute('data-face-src') !== src) return;
      imgEl.src = src;
      imgEl.alt = p.name || 'Producer';
    };
    imgEl.setAttribute('data-face-src', src);
    probe.src = src;
  }

  function preloadProducerThumbs() {
    namedLuckyProducers().concat([producerById('custom')]).forEach(function (p) {
      if (!p || !p.thumb) return;
      var img = new Image();
      img.decoding = 'async';
      img.src = p.thumb;
    });
  }

  function producerOptionLabel(p) {
    if (!p) return CUSTOM_PRODUCER_EMOJI + ' Custom';
    return (p.emoji || CUSTOM_PRODUCER_EMOJI) + ' ' + p.name;
  }

  function syncLuckyRollBtnEmoji(id) {
    var pid = id || matchLuckyProducerId();
    setProducerFaceImg(randProducerFaceImg, pid);
    // Hub face stays on last Lucky Roll producer — do not follow panel changes.
    syncHubProducerFace();
  }

  function clearHubPauseFade() {
    if (hubPauseFadeTimer) {
      clearTimeout(hubPauseFadeTimer);
      hubPauseFadeTimer = null;
    }
    if (hubBtn) hubBtn.classList.remove('hub-pause-fade');
  }

  /** After 1s of play with producer face, hide the pause glyph. */
  function scheduleHubPauseFade() {
    clearHubPauseFade();
    if (!hubBtn || !playing || !hubProducerFaceOn) return;
    var elapsed = playStartedAt ? (performance.now() - playStartedAt) : 0;
    var wait = Math.max(0, 1000 - elapsed);
    if (wait <= 0) {
      hubBtn.classList.add('hub-pause-fade');
      return;
    }
    hubPauseFadeTimer = setTimeout(function () {
      hubPauseFadeTimer = null;
      if (playing && hubProducerFaceOn && hubBtn) hubBtn.classList.add('hub-pause-fade');
    }, wait);
  }

  function syncHubProducerFace() {
    if (!hubBtn || !hubProducerImg) return;
    if (!hubProducerFaceOn || !hubProducerFaceId) {
      hubBtn.classList.remove('hub-has-producer');
      hubProducerImg.style.transform = '';
      hubProducerImg.style.filter = '';
      clearHubPauseFade();
      return;
    }
    setProducerFaceImg(hubProducerImg, hubProducerFaceId);
    hubBtn.classList.add('hub-has-producer');
    if (playing) scheduleHubPauseFade();
  }

  /** Call from Lucky Roll only — unlocks hub face and stamps current producer. */
  function unlockHubProducerFace() {
    var pid = currentProducerPickId || matchLuckyProducerId();
    if (!pid) pid = matchLuckyProducerId();
    if (!pid) pid = 'default';
    // Keep Custom as Custom (do not fall back to David).
    hubProducerFaceId = pid;
    hubProducerFaceOn = true;
    syncHubProducerFace();
  }

  /** Named presets only (no Custom) for launch picker + cycling. */
  function namedLuckyProducers() {
    return LUCKY_PRODUCERS.filter(function (p) { return p.id !== 'custom' && p.dens != null; });
  }

  var launchProducerId = null;

  function pickRandomNamedProducerId() {
    var list = namedLuckyProducers();
    if (!list.length) return 'default';
    return list[Math.floor(Math.random() * list.length)].id;
  }

  function syncLaunchProducerUi(id) {
    var p = producerById(id);
    if (!p || p.id === 'custom') p = producerById(pickRandomNamedProducerId());
    launchProducerId = p.id;
    setProducerFaceImg(launchProducerFace, p.id);
    if (launchProducerName) launchProducerName.textContent = p.name;
    if (launchProducerBlurb) {
      launchProducerBlurb.textContent = p.blurb || '';
      launchProducerBlurb.classList.remove('is-in');
      // Retrigger quick fade-in on producer swap.
      void launchProducerBlurb.offsetWidth;
      launchProducerBlurb.classList.add('is-in');
    }
  }

  async function playLaunchUiSwift() {
    try {
      await ensureAudio();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
    } catch (e) {
      console.error(e);
      return;
    }
    playDjSwiftSound(0.28);
  }

  function stepLaunchProducer(dir) {
    var list = namedLuckyProducers();
    if (!list.length) return;
    var i = 0;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === launchProducerId) break;
    }
    if (i >= list.length) i = 0;
    i = (i + dir + list.length) % list.length;
    // Launch picker only — apply preset on startApp to avoid UI thrash / flash.
    syncLaunchProducerUi(list[i].id);
    playLaunchUiSwift().catch(function (err) { console.error(err); });
  }

  function readLuckySettings() {
    return {
      dens: Math.round(getLuckyEuclidMaxDens() * 100),
      golden: Math.round(getLuckyEuclidGoldenBias() * 100),
      skip: Math.round(getLuckySkipStrength() * 100),
      sounds: getLuckySoundCount(),
      reuse: Math.round(getLuckyReuseChance() * 100),
      words: Math.round(getLuckyWordsVol() * 100),
      humanity: Math.round(getLuckyHumanity() * 100),
      speed: Math.round(getLuckySpeed() * 100)
    };
  }

  function settingsMatchProducer(p, s) {
    if (!p || p.dens == null) return false;
    return p.dens === s.dens && p.golden === s.golden && p.skip === s.skip &&
      p.sounds === s.sounds && p.reuse === s.reuse &&
      p.words === s.words && p.humanity === s.humanity && p.speed === s.speed;
  }

  function matchLuckyProducerId() {
    var s = readLuckySettings();
    var i;
    for (i = 0; i < LUCKY_PRODUCERS.length; i++) {
      var p = LUCKY_PRODUCERS[i];
      if (p.id === 'custom') continue;
      if (settingsMatchProducer(p, s)) return p.id;
    }
    return 'custom';
  }

  function applyLuckyProducer(id, opts) {
    opts = opts || {};
    var p = producerById(id);
    if (!p || p.dens == null) {
      syncProducerSelects('custom');
      return;
    }
    if (luckyEuclidDensEl) luckyEuclidDensEl.value = String(p.dens);
    if (luckyEuclidGoldenEl) luckyEuclidGoldenEl.value = String(p.golden);
    if (luckySkipEl) luckySkipEl.value = String(p.skip);
    if (luckySoundsEl) luckySoundsEl.value = String(p.sounds);
    if (luckyReuseEl) luckyReuseEl.value = String(p.reuse);
    if (luckyWordsVolEl && p.words != null) luckyWordsVolEl.value = String(p.words);
    if (luckyHumanityEl && p.humanity != null) luckyHumanityEl.value = String(p.humanity);
    if (luckySpeedEl && p.speed != null) luckySpeedEl.value = String(p.speed);
    syncLuckyRollUi({ skipMatch: true, producerId: p.id });
  }

  /** Named producers only; Custom appears solely when sliders don't match a preset. */
  function closeProducerPickMenus() {
    if (luckyProducerMenu) {
      luckyProducerMenu.hidden = true;
      if (luckyProducerBtn) luckyProducerBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function syncProducerPickTrigger(faceImg, labEl, id) {
    var p = producerById(id);
    if (!p) p = producerById('custom');
    setProducerFaceImg(faceImg, p.id);
    if (labEl) labEl.textContent = p.name;
  }

  function fillProducerPickMenu(menuEl, currentId) {
    if (!menuEl) return;
    menuEl.innerHTML = '';
    var ids = [];
    if (currentId === 'custom') ids.push('custom');
    LUCKY_PRODUCERS.forEach(function (p) {
      if (p.id === 'custom') return;
      ids.push(p.id);
    });
    ids.forEach(function (pid) {
      var p = producerById(pid);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'producer-pick-opt' + (pid === currentId ? ' active' : '');
      btn.setAttribute('role', 'option');
      btn.setAttribute('data-producer-id', pid);
      var img = document.createElement('img');
      img.src = producerThumbSrc(p);
      img.alt = '';
      img.width = 22;
      img.height = 22;
      img.decoding = 'async';
      var span = document.createElement('span');
      span.textContent = p.name;
      btn.appendChild(img);
      btn.appendChild(span);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (pid === 'custom') {
          closeProducerPickMenus();
          return;
        }
        applyLuckyProducer(pid);
        closeProducerPickMenus();
      });
      menuEl.appendChild(btn);
    });
  }

  function syncProducerSelects(forcedId) {
    var id = forcedId || matchLuckyProducerId();
    currentProducerPickId = id;
    fillProducerPickMenu(luckyProducerMenu, id);
    syncProducerPickTrigger(luckyProducerFaceImg, luckyProducerLab, id);
    syncLuckyRollBtnEmoji(id);
    setProducerFaceImg(appProducerFaceImg, id);
  }

  function buildLuckyProducerSelect() {
    syncProducerSelects(matchLuckyProducerId());
  }

  function toggleProducerPickMenu(btn, menu) {
    if (!btn || !menu) return;
    var open = !menu.hidden;
    closeProducerPickMenus();
    if (!open) {
      fillProducerPickMenu(menu, currentProducerPickId || matchLuckyProducerId());
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  function hideLuckyTip() {
    if (!luckyTipEl) return;
    luckyTipEl.classList.remove('open');
    luckyTipEl.hidden = true;
  }

  function showLuckyHelp(key, anchorEl) {
    var info = LUCKY_HELP[key];
    if (!luckyTipEl || !info) return;
    if (luckyTipTitleEl) luckyTipTitleEl.textContent = info.title;
    if (luckyTipBodyEl) luckyTipBodyEl.textContent = info.body;
    luckyTipEl.hidden = false;
    luckyTipEl.classList.add('open');

    var pad = 10;
    var tipW = luckyTipEl.offsetWidth || 280;
    var tipH = luckyTipEl.offsetHeight || 80;
    var left = pad;
    var top = pad + 48;
    if (anchorEl && anchorEl.getBoundingClientRect) {
      var r = anchorEl.getBoundingClientRect();
      left = Math.min(window.innerWidth - tipW - pad, Math.max(pad, r.left));
      top = r.bottom + 8;
      if (top + tipH > window.innerHeight - pad) {
        top = Math.max(pad, r.top - tipH - 8);
      }
    }
    luckyTipEl.style.left = Math.round(left) + 'px';
    luckyTipEl.style.top = Math.round(top) + 'px';
  }

  /** Parse slider number; 0 is valid (do not use `|| default`). */
  function readSliderNumber(el, fallback) {
    if (!el) return fallback;
    var raw = parseFloat(el.value);
    return Number.isFinite(raw) ? raw : fallback;
  }

  function getLuckyEuclidMaxDens() {
    return Math.max(0.1, Math.min(0.8, readSliderNumber(luckyEuclidDensEl, 32) / 100));
  }

  function getLuckyEuclidGoldenBias() {
    return Math.max(0, Math.min(1, readSliderNumber(luckyEuclidGoldenEl, 25) / 100));
  }

  function getLuckySkipStrength() {
    return Math.max(0, Math.min(1, readSliderNumber(luckySkipEl, 27) / 100));
  }

  function getLuckySoundCount() {
    var n = Math.round(readSliderNumber(luckySoundsEl, 7));
    return Math.max(3, Math.min(RINGS.length, n));
  }

  function getLuckyReuseChance() {
    return Math.max(0, Math.min(1, readSliderNumber(luckyReuseEl, 94) / 100));
  }

  function getLuckyConsistency() {
    return Math.max(0, Math.min(1, readSliderNumber(luckyConsistencyEl, 100) / 100));
  }

  function getLuckyWordsVol() {
    return Math.max(0, Math.min(2, readSliderNumber(luckyWordsVolEl, 34) / 100));
  }

  function getLuckyHumanity() {
    return Math.max(0, Math.min(1, readSliderNumber(luckyHumanityEl, 27) / 100));
  }

  function getLuckySpeed() {
    return Math.max(0, Math.min(1, readSliderNumber(luckySpeedEl, 35) / 100));
  }

  function syncLuckyRollUi(opts) {
    opts = opts || {};
    // Label from raw slider values so 0% never snaps via falsy checks.
    if (luckyEuclidDensVal) luckyEuclidDensVal.textContent = Math.round(readSliderNumber(luckyEuclidDensEl, 32)) + '%';
    if (luckyEuclidGoldenVal) luckyEuclidGoldenVal.textContent = Math.round(readSliderNumber(luckyEuclidGoldenEl, 25)) + '%';
    if (luckySkipVal) luckySkipVal.textContent = Math.round(readSliderNumber(luckySkipEl, 27)) + '%';
    if (luckySoundsVal) luckySoundsVal.textContent = String(getLuckySoundCount());
    if (luckyReuseVal) luckyReuseVal.textContent = Math.round(readSliderNumber(luckyReuseEl, 94)) + '%';
    if (luckyConsistencyVal) luckyConsistencyVal.textContent = Math.round(readSliderNumber(luckyConsistencyEl, 100)) + '%';
    if (luckyWordsVolVal) luckyWordsVolVal.textContent = Math.round(readSliderNumber(luckyWordsVolEl, 34)) + '%';
    if (luckyHumanityVal) luckyHumanityVal.textContent = Math.round(readSliderNumber(luckyHumanityEl, 27)) + '%';
    if (luckySpeedVal) luckySpeedVal.textContent = Math.round(readSliderNumber(luckySpeedEl, 35)) + '%';
    if (!opts.skipMatch) {
      syncProducerSelects();
    } else if (opts.producerId) {
      syncProducerSelects(opts.producerId);
    }
  }

  /** Seeded 0..1 RNG (Mulberry32) for Lucky Roll structure — Skip stays Math.random. */
  function createStructRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(a, b) {
    var x = (a ^ Math.imul(b + 0x9E3779B9, 0x85EBCA6B)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x7FEB352D) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x846CA68B) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }

  function getSwing() {
    return Math.max(0, Math.min(1, (parseFloat(swingEl.value) || 0) / 100));
  }

  /** Swing subdivision: notes per bar (4 = 1/4, 8 = 1/8, 16 = 1/16, 32 = 1/32). */
  function getSwingNoteDiv() {
    var v = swingNoteEl ? String(swingNoteEl.value) : '16';
    if (v === '4') return 4;
    if (v === '8') return 8;
    if (v === '32') return 32;
    return 16;
  }

  /** True when this ring step lands on a swung offbeat of the chosen note grid. */
  function stepIsSwingOffbeat(stepIdx, ringSegments, swingDiv) {
    if (!(ringSegments > 0) || !(swingDiv > 0)) return false;
    var phase = stepIdx / ringSegments;
    var slot = Math.floor(phase * swingDiv + 1e-9) % swingDiv;
    return (slot % 2) === 1;
  }

  function getReverb() {
    return Math.max(0, Math.min(1, (parseFloat(reverbEl.value) || 50) / 100));
  }

  function getReverbDurationSec() {
    var bpm = getBpm();
    var minSec = bpm / 240;
    var maxSec = bpm / 60;
    var pct = Math.max(0, Math.min(100, parseFloat(reverbDurEl.value) || 50) / 100);
    return minSec + (maxSec - minSec) * pct;
  }

  function getStereo() {
    return Math.max(0, Math.min(100, parseFloat(stereoEl.value) || 0));
  }

  function getStereoMidHighAmount() {
    var pct = getStereo() / 100;
    var db = -36 * pct;
    return Math.pow(10, db / 20);
  }

  function createReverbIR(audioCtx, durationSec, decaySec) {
    var sr = audioCtx.sampleRate;
    var len = Math.ceil(sr * durationSec);
    var buf = audioCtx.createBuffer(2, len, sr);
    var L = buf.getChannelData(0);
    var R = buf.getChannelData(1);
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var decay = Math.exp(-t / decaySec);
      L[i] = (Math.random() * 2 - 1) * decay;
      R[i] = (Math.random() * 2 - 1) * decay;
    }
    return buf;
  }

  function updateReverbIR() {
    var durationSec = getReverbDurationSec();
    reverbDurVal.textContent = durationSec.toFixed(2) + ' s';
    if (!ctx || !reverbConvolver) return;
    reverbConvolver.buffer = createReverbIR(ctx, durationSec, durationSec * 0.55);
  }

  function applySpaceSettings() {
    if (reverbWetGain) reverbWetGain.gain.value = getReverb();
    if (stereoMidHighGain) stereoMidHighGain.gain.value = getStereoMidHighAmount();
  }

  function buildAudioGraph() {
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;

    punchBus = ctx.createGain();
    punchBus.gain.value = 1;
    punchBus.connect(master);

    duckGain = ctx.createGain();
    duckGain.gain.value = 1;
    duckGain.connect(master);

    mixBus = ctx.createGain();
    mixBus.gain.value = 1;
    master.connect(mixBus);

    var reverbSend = ctx.createBiquadFilter();
    reverbSend.type = 'highpass';
    reverbSend.frequency.value = REVERB_HP_HZ;
    reverbSend.Q.value = 0.7;
    master.connect(reverbSend);

    reverbConvolver = ctx.createConvolver();
    reverbConvolver.normalize = true;
    var durationSec = getReverbDurationSec();
    reverbConvolver.buffer = createReverbIR(ctx, durationSec, durationSec * 0.55);
    reverbSend.connect(reverbConvolver);

    reverbWetGain = ctx.createGain();
    reverbWetGain.gain.value = getReverb();
    reverbConvolver.connect(reverbWetGain);
    reverbWetGain.connect(mixBus);

    var widthSplit = ctx.createChannelSplitter(2);
    var midSum = ctx.createGain();
    var sideSum = ctx.createGain();
    var invGain = ctx.createGain();
    invGain.gain.value = -1;
    widthSplit.connect(midSum, 0);
    widthSplit.connect(midSum, 1);
    widthSplit.connect(sideSum, 0);
    widthSplit.connect(invGain, 1);
    invGain.connect(sideSum);

    var midLowLP = ctx.createBiquadFilter();
    midLowLP.type = 'lowpass';
    midLowLP.frequency.value = STEREO_CROSSOVER_HZ;
    midLowLP.Q.value = 0.7;
    var midHighHP = ctx.createBiquadFilter();
    midHighHP.type = 'highpass';
    midHighHP.frequency.value = STEREO_CROSSOVER_HZ;
    midHighHP.Q.value = 0.7;
    var midLowGain = ctx.createGain();
    midLowGain.gain.value = 1;
    stereoMidHighGain = ctx.createGain();
    stereoMidHighGain.gain.value = getStereoMidHighAmount();
    var midMerge = ctx.createGain();
    midMerge.gain.value = 1;
    midSum.connect(midLowLP);
    midLowLP.connect(midLowGain);
    midLowGain.connect(midMerge);
    midSum.connect(midHighHP);
    midHighHP.connect(stereoMidHighGain);
    stereoMidHighGain.connect(midMerge);

    var sideGain = ctx.createGain();
    sideGain.gain.value = 1;
    var sideGainInv = ctx.createGain();
    sideGainInv.gain.value = -1;
    sideSum.connect(sideGain);
    sideSum.connect(sideGainInv);

    var widthMerge = ctx.createChannelMerger(2);
    midMerge.connect(widthMerge, 0, 0);
    midMerge.connect(widthMerge, 0, 1);
    sideGain.connect(widthMerge, 0, 0);
    sideGainInv.connect(widthMerge, 0, 1);

    mixBus.connect(widthSplit);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -18;
    analyserData = new Uint8Array(analyser.frequencyBinCount);
    fftSmooth = new Float32Array(FFT_POINTS_MAX);
    initFftParticles();
    initStarParticles();
    initGalaxyParticles();
    widthMerge.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function lfo01(t, periodSec, phase) {
    return 0.5 + 0.5 * Math.sin((t / Math.max(0.001, periodSec)) * Math.PI * 2 + (phase || 0));
  }

  /** Blend several sine cycles (incommensurate periods) → slow-drifting aesthetic params. */
  function getVfxAesthetics(t) {
    var a = lfo01(t, 11.3, 0.2);
    var b = lfo01(t, 17.7, 1.1);
    var c = lfo01(t, 29.1, 2.4);
    var d = lfo01(t, 7.4, 0.7);
    var e = lfo01(t, 41.0, 3.0);
    var f = lfo01(t, 23.5, 4.2);
    var g = lfo01(t, 13.9, 5.5);
    var h = lfo01(t, 53.0, 1.8);
    var i = lfo01(t, 19.6, 0.9);
    var j = lfo01(t, 37.2, 2.1);
    var k = lfo01(t, 8.8, 3.7);

    // Slow hue wander + occasional faster secondary wash
    var hue = (a * 200 + b * 95 + c * 55 + i * 30) % 360;
    var hue2 = (hue + 35 + d * 70 + j * 25) % 360;
    var spinDir = e > 0.52 ? 1 : (e < 0.48 ? -1 : 0);
    return {
      hue: hue,
      hue2: hue2,
      sat: 0.42 + a * 0.45,
      lit: 0.42 + b * 0.28,
      facets: Math.round(11 + c * 17),
      morphScale: 0.65 + d * 1.05,
      ringSpin: spinDir,
      ringSpinSpeed: 0.0015 + f * 0.028 + k * 0.008,
      orbitSpread: 0.5 + g * 0.65,
      ringPartCount: Math.round(3 + a * 6),
      starActive: Math.round(8 + b * 12),
      starSpeed: 0.55 + c * 1.2 + k * 0.25,
      trailFade: 0.22 + d * 0.32,
      ringTrail: 0.55 + i * 0.4,
      swirl: (f - 0.5) * 0.14 + (j - 0.5) * 0.05,
      coverage: 0.75 + g * 0.55,
      spokeAlpha: 0.03 + h * 0.2,
      strokeWide: 1.1 + a * 3.0,
      particleSize: 0.65 + e * 1.2,
      reverseChance: f,
      partDirFlip: i > 0.62 ? -1 : 1,
      flockHeading: (a * 2.1 + c * 1.4 + t * 0.08) % (Math.PI * 2),
      flockSpread: 0.55 + g * 0.7,
      // Sparse bg dots — no trails
      galaxyActive: Math.round(6 + h * 10),
      galaxySpeed: 0.25 + i * 0.35,
      galaxyTrail: 0.1 + k * 0.1,
      galaxySize: 0.55 + g * 0.55,
      // Larger outer morph shell
      outerScale: 1.55 + b * 0.35,
      outerFacets: Math.round(9 + e * 14),
      outerAmp: 0.55 + f * 0.7,
      outerAlpha: 0.18 + g * 0.28,
      outerSpin: (h - 0.5) * 1.4
    };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0;
    var g = 0;
    var b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbaStr(rgb, a) {
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
  }

  function initFftParticles() {
    fftParticles = [];
    var i;
    for (i = 0; i < FFT_PARTICLE_COUNT; i++) {
      fftParticles.push({
        ang: (i / FFT_PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5,
        // Keep near outer ring — not crowding the center
        orbit: 0.92 + Math.random() * 0.35,
        size: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        spin: (0.12 + Math.random() * 0.45) * (Math.random() < 0.5 ? 1 : -1),
        wobble: 0.25 + Math.random() * 0.8
      });
    }
  }

  /** Spawn flock agents away from center; varied personal heading. */
  function resetFlock(p, w, h, flockHeading) {
    var cx = w * 0.5;
    var cy = h * 0.5;
    var minDim = Math.min(w, h);
    var keepOut = minDim * 0.28;
    var tries = 0;
    do {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      tries++;
    } while (tries < 12 && Math.hypot(p.x - cx, p.y - cy) < keepOut);

    var head = (flockHeading != null ? flockHeading : Math.random() * Math.PI * 2)
      + (Math.random() - 0.5) * 1.2;
    p.vx = Math.cos(head);
    p.vy = Math.sin(head);
    p.speed = 0.55 + Math.random() * 1.1;
    p.size = 0.7 + Math.random() * 1.6;
    p.phase = Math.random() * Math.PI * 2;
    p.turnBias = (Math.random() - 0.5) * 0.08;
    p.trailLen = 4 + Math.floor(Math.random() * (FLOCK_TRAIL - 3));
    p.hueOff = (Math.random() - 0.5) * 50;
    p.trail = [];
  }

  function initStarParticles() {
    starParticles = [];
    var i;
    for (i = 0; i < STAR_COUNT; i++) {
      var p = {};
      resetFlock(p, 800, 600, i * 0.37);
      starParticles.push(p);
    }
  }

  /** Sparse distant dots — slow white star undertone (~200, cheap). */
  function resetGalaxyStar(p, w, h) {
    p.x = Math.random() * (w || 800);
    p.y = Math.random() * (h || 600);
    p.phase = Math.random() * Math.PI * 2;
    p.twinkle = 0.25 + Math.random() * 0.75;
    p.drift = (Math.random() - 0.5) * 0.08;
    p.size = 0.35 + Math.random() * 0.95;
  }

  function initGalaxyParticles() {
    galaxyParticles = [];
    var i;
    for (i = 0; i < GALAXY_COUNT; i++) {
      var p = {};
      resetGalaxyStar(p, 800, 600);
      galaxyParticles.push(p);
    }
  }

  function sizeStarCanvas() {
    if (!starCanvas || !stageEl) return;
    var rect = stageEl.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(rect.width * dpr));
    var h = Math.max(1, Math.floor(rect.height * dpr));
    if (starCanvas.width !== w || starCanvas.height !== h) {
      starCanvas.width = w;
      starCanvas.height = h;
    }
  }

  function clearStarField() {
    if (starCtx2d && starCanvas) starCtx2d.clearRect(0, 0, starCanvas.width, starCanvas.height);
    if (stageEl) stageEl.classList.remove('is-playing');
    shootingStars = [];
    glitchLines = [];
    nextGlitchAt = 0;
  }

  function clearFftRing() {
    if (!fftCtx2d || !fftCanvas) return;
    fftCtx2d.clearRect(0, 0, fftCanvas.width, fftCanvas.height);
    energyBursts = [];
    baseHaloWings = [];
    pendingKickBursts = [];
  }

  /** Quiet white star field undertone — no shadows, slow drift, low CPU. */
  function drawGalaxyStars(bass, midEnergy, aes, time) {
    if (!galaxyParticles.length) initGalaxyParticles();
    var w = starCanvas.width;
    var h = starCanvas.height;
    var energy = Math.max(bass, midEnergy * 0.35);
    var i;
    // Single path batch of tiny fills
    for (i = 0; i < galaxyParticles.length; i++) {
      var g = galaxyParticles[i];
      g.x += g.drift * 0.35;
      g.y += Math.sin(time * 0.07 + g.phase) * 0.12;
      if (g.x < 0) g.x += w;
      if (g.x > w) g.x -= w;
      if (g.y < 0) g.y += h;
      if (g.y > h) g.y -= h;

      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (0.6 + g.twinkle) + g.phase));
      var alpha = (0.1 + g.twinkle * 0.22 + energy * 0.08) * tw;
      var sz = g.size * (0.75 + energy * 0.15);
      starCtx2d.fillStyle = 'rgba(235,240,255,' + Math.min(0.72, alpha).toFixed(3) + ')';
      starCtx2d.fillRect(g.x, g.y, Math.max(0.6, sz), Math.max(0.6, sz));
    }
  }

  /** Subtle H/V glitch slices — rare, thin, just a bit clearer. */
  function maybeSpawnGlitchLines(time, bass, mid, vol, w, h) {
    if (time < nextGlitchAt) return;
    var energy = Math.max(bass, vol * 0.8, mid * 0.4);
    // Mostly quiet — only occasional single lines
    if (Math.random() > 0.08 + energy * 0.12) {
      nextGlitchAt = time + 0.35 + Math.random() * 0.7;
      return;
    }
    var horiz = Math.random() < 0.55;
    var len = (horiz ? w : h) * (0.18 + Math.random() * 0.35);
    var pos = Math.random() * (horiz ? h : w);
    var start = Math.random() * ((horiz ? w : h) - len);
    glitchLines.push({
      horiz: horiz,
      pos: pos,
      start: start,
      len: len,
      thick: 0.7 + Math.random() * 0.9,
      life: 1,
      decay: 0.14 + Math.random() * 0.1,
      bright: 0.22 + energy * 0.18,
      twin: false,
      hue: Math.random() < 0.5 ? 200 : 280
    });
    nextGlitchAt = time + 0.55 + Math.random() * 1.2;
  }

  function drawGlitchLines(vol, bass) {
    if (!starCtx2d || !glitchLines.length) return;
    var i;
    var energy = Math.max(bass, vol);
    starCtx2d.save();
    starCtx2d.globalCompositeOperation = 'lighter';
    for (i = glitchLines.length - 1; i >= 0; i--) {
      var g = glitchLines[i];
      g.life -= g.decay;
      if (g.life <= 0) {
        glitchLines.splice(i, 1);
        continue;
      }
      var a = g.life * g.bright * (0.45 + energy * 0.25);
      var rgb = hslToRgb(g.hue, 0.35, 0.72);
      starCtx2d.fillStyle = rgbaStr(rgb, Math.min(0.38, a));
      if (g.horiz) {
        starCtx2d.fillRect(g.start, g.pos, g.len, g.thick);
      } else {
        starCtx2d.fillRect(g.pos, g.start, g.thick, g.len);
      }
    }
    starCtx2d.restore();
  }

  function spawnShootingStar(w, h, aes) {
    var fromTop = Math.random() > 0.35;
    var x = Math.random() * w * 0.85;
    var y = fromTop ? (-10 - Math.random() * 40) : (Math.random() * h * 0.35);
    var ang = 0.55 + Math.random() * 0.55; // down-right-ish
    var spd = 7 + Math.random() * 14;
    shootingStars.push({
      x: x,
      y: y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      decay: 0.012 + Math.random() * 0.018,
      len: 18 + Math.random() * 34,
      hue: (aes.hue2 + Math.random() * 40) % 360,
      width: 1 + Math.random() * 1.6
    });
  }

  function spawnEnergyBurst(cx, cy, circleR, aes, bass, vol) {
    var neonHues = [aes.hue, aes.hue2, (aes.hue + 160) % 360, (aes.hue2 + 90) % 360, 190, 310];
    var blurry = Math.random() < 0.42;
    var wide = Math.random() < 0.48;
    var fast = Math.random() < 0.4;
    var v = vol != null ? vol : 0.5;
    // Intensity from music volume + occasional quieter flashes
    var intensity = (0.2 + v * 0.85) * (Math.random() < 0.45 ? (0.45 + Math.random() * 0.35) : (0.75 + Math.random() * 0.25));
    var hue = neonHues[Math.floor(Math.random() * neonHues.length)];
    var startR = circleR * (0.55 + Math.random() * 0.25);
    var maxR = circleR * (wide ? (2.6 + Math.random() * 2.2) : (1.45 + Math.random() * 0.9));
    var parts = [];
    var partN = Math.random() < 0.55 ? 0 : (4 + Math.floor(Math.random() * 6));
    var pi;
    for (pi = 0; pi < partN; pi++) {
      parts.push({
        ang: (pi / Math.max(1, partN)) * Math.PI * 2 + Math.random() * 0.4,
        drift: (Math.random() - 0.5) * 0.035,
        size: 1.4 + Math.random() * (blurry ? 3.2 : 2.2),
        phase: Math.random() * Math.PI * 2
      });
    }
    energyBursts.push({
      x: cx,
      y: cy,
      r: startR,
      maxR: maxR,
      life: 1,
      decay: fast ? (0.022 + Math.random() * 0.02) : (0.01 + Math.random() * 0.012),
      expand: fast ? (0.1 + Math.random() * 0.12) : (0.035 + Math.random() * 0.05),
      width: blurry ? (12 + Math.random() * 18) : (2.2 + Math.random() * 5),
      blur: blurry ? (22 + Math.random() * 28) : (4 + Math.random() * 10),
      blurry: blurry,
      intensity: intensity,
      hue: hue,
      sat: 0.65 + Math.random() * 0.25,
      particles: parts
    });
  }

  function maybeSpawnShootingStars(time, bass, midEnergy, aes, w, h) {
    var energy = Math.max(bass, midEnergy * 0.5);
    if (time < nextShootAt) return;
    nextShootAt = time + 1.8 + Math.random() * 4.5;
    if (Math.random() < 0.55 + energy * 0.35) {
      spawnShootingStar(w, h, aes);
      if (Math.random() < 0.35) spawnShootingStar(w, h, aes);
    }
  }

  function noteKickForBurst(when) {
    if (!playing || !ctx) return;
    var t = Math.max(when || 0, ctx.currentTime);
    if (t < kickBurstCooldownUntil) return;
    // Occasional — not every kick
    if (Math.random() > 0.36) return;
    pendingKickBursts.push(t);
    kickBurstCooldownUntil = t + 0.55 + Math.random() * 2.4;
  }

  function drawShootingStars(dtScale) {
    var i;
    for (i = shootingStars.length - 1; i >= 0; i--) {
      var s = shootingStars[i];
      s.x += s.vx * dtScale;
      s.y += s.vy * dtScale;
      s.life -= s.decay * dtScale;
      if (s.life <= 0 || s.x > starCanvas.width + 80 || s.y > starCanvas.height + 80) {
        shootingStars.splice(i, 1);
        continue;
      }
      var rgb = hslToRgb(s.hue, 0.55, 0.78);
      var alpha = Math.max(0, s.life) * 0.85;
      var tx = s.x - s.vx * s.len * 0.12;
      var ty = s.y - s.vy * s.len * 0.12;
      starCtx2d.strokeStyle = rgbaStr(rgb, alpha);
      starCtx2d.lineWidth = s.width;
      starCtx2d.lineCap = 'round';
      starCtx2d.beginPath();
      starCtx2d.moveTo(tx, ty);
      starCtx2d.lineTo(s.x, s.y);
      starCtx2d.stroke();
      starCtx2d.fillStyle = rgbaStr(rgb, Math.min(1, alpha + 0.15));
      starCtx2d.beginPath();
      starCtx2d.arc(s.x, s.y, Math.max(0.8, s.width * 0.7), 0, Math.PI * 2);
      starCtx2d.fill();
    }
  }

  /** Soft morph halo rings — same look as the old pair, slowly push out; new one from inside. */
  function spawnBaseHaloWing(circleR, aes, startScale) {
    var hue = aes.hue;
    var hue2 = aes.hue2;
    baseHaloWings.push({
      // Start near the drum; expand slowly to outer halo size
      r: circleR * (startScale != null ? startScale : 0.94),
      maxR: circleR * (2.15 + Math.random() * 0.35),
      // Very slow outward push
      expand: 0.0032 + Math.random() * 0.0018,
      width: 5.5 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      hue: hue,
      hue2: hue2,
      sat: Math.min(0.65, aes.sat * 0.65),
      strength: 0.95 + Math.random() * 0.2
    });
  }

  function maybeSpawnBaseHaloWing(circleR, aes) {
    var maxAlive = 3;
    var n = baseHaloWings.length;
    if (n >= maxAlive) return;

    // Seed first two so it reads like the old dual rings
    if (n === 0) {
      spawnBaseHaloWing(circleR, aes, 0.94);
      spawnBaseHaloWing(circleR, aes, 1.28);
      return;
    }

    // Don't stack another until the newest has pushed out a bit
    var i;
    var minR = Infinity;
    var maxRNow = 0;
    for (i = 0; i < n; i++) {
      if (baseHaloWings[i].r < minR) minR = baseHaloWings[i].r;
      if (baseHaloWings[i].r > maxRNow) maxRNow = baseHaloWings[i].r;
    }
    if (minR < circleR * 1.1) return;

    // New ring from inside as the biggest one is on its way out
    var outerLeaving = maxRNow > circleR * 1.55;
    if (n < 2 || outerLeaving) {
      spawnBaseHaloWing(circleR, aes, 0.92);
    }
  }

  function drawBaseHaloWings(c2d, cx, cy, circleR, ring, points, spinOff, bass, vol, bright, blurScale, time, aes) {
    if (!c2d) return;
    var midRgb = hslToRgb(aes.hue, Math.min(0.65, aes.sat * 0.65), 0.74);
    var outerRgb = hslToRgb(aes.hue + 35, aes.sat * 0.5, 0.66);
    var coreRgb = hslToRgb(aes.hue2, Math.min(0.5, aes.sat * 0.4), 0.9);
    var i;

    c2d.save();
    c2d.globalCompositeOperation = 'lighter';
    for (i = baseHaloWings.length - 1; i >= 0; i--) {
      var wing = baseHaloWings[i];
      // Keep max tied to current drum size
      wing.maxR = Math.max(wing.maxR, circleR * 2.1);
      wing.r += (wing.maxR - wing.r) * wing.expand + 0.18;
      var grow = (wing.r - circleR * 0.9) / Math.max(1, wing.maxR - circleR * 0.9);
      grow = Math.max(0, Math.min(1, grow));

      // Fade as it becomes the outgoing biggest ring
      var fadeOut = grow > 0.72 ? (1 - (grow - 0.72) / 0.28) : 1;
      fadeOut = Math.max(0, fadeOut);
      // Soft fade-in while emerging from inside
      var fadeIn = grow < 0.12 ? grow / 0.12 : 1;
      // Stronger music pulse on halo rings
      var pulse = 0.55 + bass * 0.9 + vol * 0.75 + 0.1 * Math.sin(time * 4.2 + wing.phase);
      var a = fadeIn * fadeOut * pulse * (0.1 + vol * 1.05) * bright * wing.strength;

      if (fadeOut <= 0.02 || wing.r >= wing.maxR * 0.98) {
        baseHaloWings.splice(i, 1);
        continue;
      }

      // Radius and thickness also breathe with the music
      var musicPulse = 1 + bass * 0.12 + vol * 0.1;
      var amp = circleR * (0.08 + grow * 0.06) * (0.55 + bass * 0.55) * musicPulse;
      var verts = buildMorphVerts(cx, cy, wing.r * musicPulse, amp, ring, points, spinOff * (0.4 + grow * 0.4), bass, time);
      var rgb = grow > 0.45 ? outerRgb : midRgb;
      var thick = wing.width * (1.05 - grow * 0.25) * (0.85 + bass * 0.55 + vol * 0.25);
      // Inner / early rings: much softer blurred edges
      var innerSoft = 1 + (1 - grow) * 1.8;

      c2d.shadowColor = rgbaStr(rgb, Math.min(1, 0.85 * a));
      c2d.shadowBlur = blurScale * (1.05 + grow * 0.35) * innerSoft;
      c2d.strokeStyle = rgbaStr(rgb, Math.min(0.75, 0.42 * a));
      c2d.lineWidth = thick * (grow < 0.35 ? 1.35 : 1);
      c2d.beginPath();
      traceSmoothClosedPath(c2d, verts, 1.0);
      c2d.stroke();

      // Soft core — dimmer/blurrier when still inside
      c2d.shadowBlur = blurScale * (grow < 0.35 ? 1.1 : 0.45);
      c2d.strokeStyle = rgbaStr(coreRgb, Math.min(0.9, (grow < 0.35 ? 0.35 : 0.65) * a));
      c2d.lineWidth = Math.max(1.4, thick * (grow < 0.35 ? 0.45 : 0.32));
      c2d.beginPath();
      traceSmoothClosedPath(c2d, verts, 1.0);
      c2d.stroke();
    }
    c2d.shadowBlur = 0;
    c2d.restore();
  }

  function drawEnergyBursts(c2d, brightScale) {
    if (!c2d) return;
    var i;
    var j;
    c2d.save();
    c2d.globalCompositeOperation = 'lighter';
    for (i = energyBursts.length - 1; i >= 0; i--) {
      var b = energyBursts[i];
      var expand = b.expand != null ? b.expand : 0.08;
      b.r += (b.maxR - b.r) * expand + (1.2 + expand * 18);
      b.life -= b.decay;
      if (b.life <= 0 || b.r > b.maxR * 1.12) {
        energyBursts.splice(i, 1);
        continue;
      }
      var intensity = b.intensity != null ? b.intensity : 0.75;
      var rgb = hslToRgb(b.hue, b.sat, b.blurry ? 0.55 : 0.64);
      var core = hslToRgb(b.hue, 0.28, 0.88);
      // Live music volume scales ring opacity while it expands
      var volLive = (typeof musicVolume === 'function') ? musicVolume() : 0.5;
      var a = Math.max(0, b.life) * intensity * (0.2 + volLive * 0.95) *
        (0.4 + (brightScale || 0.5) * 0.35);
      var blur = (b.blur != null ? b.blur : 12) * (0.55 + intensity * 0.45);

      c2d.shadowColor = rgbaStr(rgb, Math.min(0.85, a * (b.blurry ? 0.55 : 0.8)));
      c2d.shadowBlur = blur * (0.55 + b.life * 0.4);
      c2d.strokeStyle = rgbaStr(rgb, Math.min(0.7, a * (b.blurry ? 0.28 : 0.62)));
      c2d.lineWidth = b.width * (b.blurry ? (0.85 + b.life * 0.4) : (0.5 + b.life * 0.5));
      c2d.beginPath();
      c2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      c2d.stroke();

      if (!b.blurry && intensity > 0.45) {
        c2d.shadowBlur = blur * 0.28;
        c2d.strokeStyle = rgbaStr(core, Math.min(0.75, a * 0.7));
        c2d.lineWidth = Math.max(1, b.width * 0.22);
        c2d.beginPath();
        c2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c2d.stroke();
      }

      if (b.particles && b.particles.length && intensity > 0.35) {
        for (j = 0; j < b.particles.length; j++) {
          var p = b.particles[j];
          p.ang += p.drift;
          var pr = b.r + Math.sin(b.life * 8 + p.phase) * (b.blurry ? 8 : 3);
          var px = b.x + Math.cos(p.ang) * pr;
          var py = b.y + Math.sin(p.ang) * pr;
          var psz = p.size * (0.55 + b.life * 0.55) * intensity;
          c2d.shadowBlur = b.blurry ? 10 : 5;
          c2d.fillStyle = rgbaStr(core, Math.min(0.8, a * 0.65));
          c2d.beginPath();
          c2d.arc(px, py, Math.max(0.45, psz), 0, Math.PI * 2);
          c2d.fill();
        }
      }
    }
    c2d.shadowBlur = 0;
    c2d.restore();
  }

  /** Flocking trails — shared heading, personal variance, avoid radiating from center. */
  function drawStarField(bass, midEnergy, aes, time) {
    if (!starCtx2d || !starCanvas) return;
    sizeStarCanvas();
    if (!starParticles.length) initStarParticles();
    var w = starCanvas.width;
    var h = starCanvas.height;
    var cx = w * 0.5;
    var cy = h * 0.5;
    var keepOut = Math.min(w, h) * (0.22 + aes.flockSpread * 0.08);
    var energy = Math.max(bass, midEnergy * 0.45);
    var active = Math.max(6, Math.min(STAR_COUNT, aes.starActive));
    var trail = Math.max(0.2, Math.min(0.55, aes.trailFade));
    var flockHead = aes.flockHeading + aes.swirl * 8;
    var baseSpeed = (0.9 + energy * 3.2) * aes.starSpeed;
    var i;
    var j;

    starCtx2d.fillStyle = 'rgba(17, 17, 20, ' + trail + ')';
    starCtx2d.fillRect(0, 0, w, h);

    // Slow white star undertone (~200 dots, cheap fillRect)
    drawGalaxyStars(bass, midEnergy, aes, time);

    var volNow = (typeof musicVolume === 'function') ? musicVolume() : energy;
    maybeSpawnGlitchLines(time, bass, midEnergy, volNow, w, h);
    drawGlitchLines(volNow, bass);

    // Neighbor alignment sample (cheap flocking)
    var alignX = 0;
    var alignY = 0;
    var alignN = Math.min(active, 12);
    for (i = 0; i < alignN; i++) {
      alignX += starParticles[i].vx;
      alignY += starParticles[i].vy;
    }
    alignX /= alignN || 1;
    alignY /= alignN || 1;
    var alignLen = Math.hypot(alignX, alignY) || 1;
    alignX /= alignLen;
    alignY /= alignLen;

    for (i = 0; i < active; i++) {
      var s = starParticles[i];
      var flockX = Math.cos(flockHead + s.turnBias * 4);
      var flockY = Math.sin(flockHead + s.turnBias * 4);

      // Blend personal dir + flock + neighbor alignment (not radial)
      var tx = s.vx * 0.55 + flockX * 0.28 + alignX * 0.17;
      var ty = s.vy * 0.55 + flockY * 0.28 + alignY * 0.17;
      var tLen = Math.hypot(tx, ty) || 1;
      tx /= tLen;
      ty /= tLen;

      // Soft steer away from center — no radiating out of hub
      var dx = s.x - cx;
      var dy = s.y - cy;
      var dist = Math.hypot(dx, dy) || 1;
      if (dist < keepOut * 1.35) {
        var push = (keepOut * 1.35 - dist) / keepOut;
        tx += (dx / dist) * push * 0.9;
        ty += (dy / dist) * push * 0.9;
        var pLen = Math.hypot(tx, ty) || 1;
        tx /= pLen;
        ty /= pLen;
      }

      // Gentle personal wander so trails aren't identical
      var wand = 0.04 + energy * 0.05;
      tx += Math.cos(time * (1.1 + s.phase) + s.phase) * wand;
      ty += Math.sin(time * (0.9 + s.phase * 0.7) + s.phase) * wand;
      var wLen = Math.hypot(tx, ty) || 1;
      s.vx = tx / wLen;
      s.vy = ty / wLen;

      var spd = baseSpeed * s.speed * (0.75 + 0.35 * Math.sin(time * 2.4 + s.phase));
      s.x += s.vx * spd;
      s.y += s.vy * spd;

      // Edge wrap — keep flock flowing, not respawning from center
      var margin = 8;
      if (s.x < -margin) s.x = w + margin;
      if (s.x > w + margin) s.x = -margin;
      if (s.y < -margin) s.y = h + margin;
      if (s.y > h + margin) s.y = -margin;

      if (!s.trail) s.trail = [];
      s.trail.push({ x: s.x, y: s.y });
      while (s.trail.length > s.trailLen) s.trail.shift();

      // Skip drawing if still too close to center (clear hub)
      if (dist < keepOut * 0.75) continue;

      var rgb = hslToRgb(aes.hue2 + s.hueOff, aes.sat * 0.65, 0.7);
      var pulse = 0.55 + energy * 0.55 + 0.2 * Math.sin(time * 5 + s.phase);
      var tw = Math.max(0.45, s.size * aes.particleSize * pulse * 0.85);
      var alpha = 0.12 + energy * 0.28 + (i % 5) * 0.03;

      if (s.trail.length > 1) {
        starCtx2d.beginPath();
        starCtx2d.moveTo(s.trail[0].x, s.trail[0].y);
        for (j = 1; j < s.trail.length; j++) {
          starCtx2d.lineTo(s.trail[j].x, s.trail[j].y);
        }
        starCtx2d.strokeStyle = rgbaStr(rgb, alpha * 0.55);
        starCtx2d.lineWidth = Math.max(0.4, tw * 0.55);
        starCtx2d.lineCap = 'round';
        starCtx2d.lineJoin = 'round';
        starCtx2d.stroke();
      }

      starCtx2d.fillStyle = rgbaStr(rgb, Math.min(0.9, alpha + 0.18));
      starCtx2d.beginPath();
      starCtx2d.arc(s.x, s.y, tw, 0, Math.PI * 2);
      starCtx2d.fill();
    }

    // Occasional shooting stars across the background
    maybeSpawnShootingStars(time, bass, midEnergy, aes, w, h);
    drawShootingStars(1);
  }

  function pseudo01(ringId, stepIdx, channel) {
    var seed = 0;
    for (var i = 0; i < ringId.length; i++) seed = (seed * 31 + ringId.charCodeAt(i)) | 0;
    var x = Math.sin((seed + stepIdx * 31 + channel * 17) * 9999.123) * 43758.5453;
    return x - Math.floor(x);
  }

  function emptyPattern() {
    var p = {};
    RINGS.forEach(function (ring) {
      p[ring.id] = Array(ring.segments).fill(null);
    });
    return p;
  }

  function initLayers() {
    layers = [];
    for (var i = 0; i < MAX_CIRCLES; i++) {
      layers.push({ enabled: i < 2, pattern: emptyPattern() });
    }
  }

  function layerLabel(i) {
    return 'Wheel ' + (i + 1);
  }

  function closeLayerMenus() {
    layerMenu.classList.remove('open');
    layerTrigger.setAttribute('aria-expanded', 'false');
  }

  function buildLayerMenu() {
    layerMenu.innerHTML = '';
    for (var i = 0; i < MAX_CIRCLES; i++) {
      (function (idx) {
        var row = document.createElement('div');
        row.className = 'layer-opt' + (idx === viewLayer ? ' active' : '') + (layers[idx].enabled ? '' : ' off');
        row.setAttribute('role', 'option');

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!layers[idx].enabled;
        cb.title = layers[idx].enabled ? 'On' : 'Off';
        cb.addEventListener('click', function (e) {
          e.stopPropagation();
        });
        cb.addEventListener('change', function (e) {
          e.stopPropagation();
          layers[idx].enabled = !!cb.checked;
          setViewLayer(idx);
          syncLayerUi();
        });

        var name = document.createElement('button');
        name.type = 'button';
        name.className = 'name';
        name.textContent = layerLabel(idx);
        name.style.cssText = 'border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer;text-align:left;width:100%';
        name.addEventListener('click', function (e) {
          e.stopPropagation();
          setViewLayer(idx);
          closeLayerMenus();
        });

        row.appendChild(cb);
        row.appendChild(name);
        row.addEventListener('click', function (e) {
          if (e.target === cb) return;
          setViewLayer(idx);
          closeLayerMenus();
        });
        layerMenu.appendChild(row);
      })(i);
    }

    var actions = document.createElement('div');
    actions.className = 'layer-menu-actions';
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      layers.forEach(function (layer) { layer.enabled = true; });
      buildLayerMenu();
      syncLayerUi();
    });
    var thisBtn = document.createElement('button');
    thisBtn.type = 'button';
    thisBtn.textContent = 'This';
    thisBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      layers.forEach(function (layer, idx) { layer.enabled = (idx === viewLayer); });
      buildLayerMenu();
      syncLayerUi();
    });
    var noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.textContent = 'None';
    noneBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      layers.forEach(function (layer) { layer.enabled = false; });
      buildLayerMenu();
      syncLayerUi();
    });
    actions.appendChild(allBtn);
    actions.appendChild(thisBtn);
    actions.appendChild(noneBtn);
    layerMenu.appendChild(actions);
  }

  function openLayerMenu() {
    closeLayerMenus();
    closeRandMenus();
    buildLayerMenu();
    layerMenu.classList.add('open');
    layerTrigger.setAttribute('aria-expanded', 'true');
  }

  var randLayerChecked = {};
  var nudgeLayerChecked = {};
  /** Round-robin cursor into selectedNudgeLayers() — one wheel per Nudge click. */
  var nudgeLayerCursor = 0;
  var iRand;
  for (iRand = 0; iRand < MAX_CIRCLES; iRand++) {
    randLayerChecked[iRand] = (iRand < 2);
    nudgeLayerChecked[iRand] = (iRand < 2);
  }

  function syncLayerUi() {
    var on = !!(layers[viewLayer] && layers[viewLayer].enabled);
    layerLab.textContent = layerLabel(viewLayer) + (on ? '' : ' · off');
    circleWrap.classList.toggle('disabled', !on);
    if (layerMenu.classList.contains('open')) buildLayerMenu();
  }

  function setViewLayer(idx, opts) {
    opts = opts || {};
    idx = Math.max(0, Math.min(MAX_CIRCLES - 1, idx | 0));
    viewLayer = idx;
    pattern = layers[viewLayer].pattern;
    if (!opts.fromPlayhead) viewLocked = true;
    syncLayerUi();
    if (!opts.skipPaint) {
      if (opts.fromPlayhead) refreshSegFills();
      else {
        buildSvg();
        refreshSegFills();
      }
    }
  }

  function nextEnabled(from) {
    for (var i = 1; i <= MAX_CIRCLES; i++) {
      var j = (from + i) % MAX_CIRCLES;
      if (layers[j].enabled) return j;
    }
    return -1;
  }

  function resolveStart(from) {
    from = Math.max(0, Math.min(MAX_CIRCLES - 1, from | 0));
    if (layers[from].enabled) return from;
    return nextEnabled(from);
  }

  function ringRadii(layerIndex) {
    var n = RINGS.length;
    var span = OUTER - INNER_HUB;
    var band = (span - RING_GAP * (n - 1)) / n;
    var outer = OUTER - layerIndex * (band + RING_GAP);
    var inner = outer - band;
    return { inner: inner, outer: outer };
  }

  function polar(cx, cy, r, a) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(inner, outer, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    var p0 = polar(CX, CY, outer, a0);
    var p1 = polar(CX, CY, outer, a1);
    var p2 = polar(CX, CY, inner, a1);
    var p3 = polar(CX, CY, inner, a0);
    return [
      'M', p0.x, p0.y,
      'A', outer, outer, 0, large, 1, p1.x, p1.y,
      'L', p2.x, p2.y,
      'A', inner, inner, 0, large, 0, p3.x, p3.y,
      'Z'
    ].join(' ');
  }

  function darkenHex(hex, amount) {
    var h = String(hex || '#888888').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) * (1 - amount)));
    var g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) * (1 - amount)));
    var b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) * (1 - amount)));
    return '#' + [r, g, b].map(function (n) {
      var s = Math.round(n).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  function appendPatternMarks(pat, kind, color) {
    var bg = darkenHex(color, 0.55);
    pat.appendChild(svgEl('rect', { width: '100%', height: '100%', fill: bg }));
    if (kind === 'solid') {
      pat.setAttribute('width', '8');
      pat.setAttribute('height', '8');
      pat.appendChild(svgEl('rect', { width: '100%', height: '100%', fill: color }));
      return;
    }
    if (kind === 'dots') {
      pat.setAttribute('width', '10');
      pat.setAttribute('height', '10');
      pat.appendChild(svgEl('circle', { cx: '2.5', cy: '2.5', r: '1.6', fill: color }));
      pat.appendChild(svgEl('circle', { cx: '7.5', cy: '7.5', r: '1.6', fill: color }));
      return;
    }
    if (kind === 'dotsBig') {
      pat.setAttribute('width', '14');
      pat.setAttribute('height', '14');
      pat.appendChild(svgEl('circle', { cx: '7', cy: '7', r: '3.2', fill: color }));
      return;
    }
    if (kind === 'stripesH') {
      pat.setAttribute('width', '8');
      pat.setAttribute('height', '8');
      pat.appendChild(svgEl('rect', { y: '0', width: '8', height: '3.2', fill: color }));
      return;
    }
    if (kind === 'stripesV') {
      pat.setAttribute('width', '8');
      pat.setAttribute('height', '8');
      pat.appendChild(svgEl('rect', { x: '0', width: '3.2', height: '8', fill: color }));
      return;
    }
    if (kind === 'diag') {
      pat.setAttribute('width', '10');
      pat.setAttribute('height', '10');
      pat.appendChild(svgEl('path', {
        d: 'M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8',
        stroke: color,
        'stroke-width': '2.4',
        fill: 'none'
      }));
      return;
    }
    if (kind === 'diag2') {
      pat.setAttribute('width', '10');
      pat.setAttribute('height', '10');
      pat.appendChild(svgEl('path', {
        d: 'M0 0 L10 10 M-2 8 L2 12 M8 -2 L12 2',
        stroke: color,
        'stroke-width': '2.4',
        fill: 'none'
      }));
      return;
    }
    if (kind === 'cross') {
      pat.setAttribute('width', '10');
      pat.setAttribute('height', '10');
      pat.appendChild(svgEl('path', {
        d: 'M0 10 L10 0 M0 0 L10 10',
        stroke: color,
        'stroke-width': '1.8',
        fill: 'none'
      }));
      return;
    }
    if (kind === 'checkers') {
      pat.setAttribute('width', '12');
      pat.setAttribute('height', '12');
      pat.appendChild(svgEl('rect', { width: '6', height: '6', fill: color }));
      pat.appendChild(svgEl('rect', { x: '6', y: '6', width: '6', height: '6', fill: color }));
      return;
    }
    if (kind === 'rings') {
      pat.setAttribute('width', '12');
      pat.setAttribute('height', '12');
      pat.appendChild(svgEl('circle', {
        cx: '6', cy: '6', r: '3.4', fill: 'none', stroke: color, 'stroke-width': '2'
      }));
      return;
    }
    if (kind === 'dash') {
      pat.setAttribute('width', '12');
      pat.setAttribute('height', '8');
      pat.appendChild(svgEl('rect', { x: '0', y: '2.4', width: '7', height: '3.2', fill: color }));
      return;
    }
    if (kind === 'grid') {
      pat.setAttribute('width', '10');
      pat.setAttribute('height', '10');
      pat.appendChild(svgEl('path', {
        d: 'M0 5 H10 M5 0 V10',
        stroke: color,
        'stroke-width': '2',
        fill: 'none'
      }));
      return;
    }
    pat.setAttribute('width', '8');
    pat.setAttribute('height', '8');
    pat.appendChild(svgEl('rect', { width: '100%', height: '100%', fill: color }));
  }

  function buildFillDefs(parent) {
    var defs = svgEl('defs');
    SAMPLES.forEach(function (s) {
      if (!s.pattern || s.pattern === 'solid') return;
      var pat = svgEl('pattern', {
        id: 'fill-' + s.id,
        patternUnits: 'userSpaceOnUse',
        width: '10',
        height: '10'
      });
      appendPatternMarks(pat, s.pattern, s.color);
      defs.appendChild(pat);
    });

    // Needle light-strike glow
    var glow = svgEl('filter', {
      id: 'needleGlow',
      x: '-120%',
      y: '-40%',
      width: '340%',
      height: '180%'
    });
    glow.appendChild(svgEl('feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: '6',
      result: 'blur'
    }));
    var merge = svgEl('feMerge');
    merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
    merge.appendChild(svgEl('feMergeNode', { in: 'blur' }));
    merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    glow.appendChild(merge);
    defs.appendChild(glow);

    var softGlow = svgEl('filter', {
      id: 'needleSoftGlow',
      x: '-200%',
      y: '-60%',
      width: '500%',
      height: '220%'
    });
    softGlow.appendChild(svgEl('feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: '14'
    }));
    defs.appendChild(softGlow);

    var grad = svgEl('linearGradient', {
      id: 'needleStrikeGrad',
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%'
    });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.95' }));
    grad.appendChild(svgEl('stop', { offset: '35%', 'stop-color': '#f2f6ff', 'stop-opacity': '0.75' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': '0' }));
    defs.appendChild(grad);

    parent.appendChild(defs);
  }

  function segFill(sampleId) {
    if (!sampleId) return EMPTY_COLOR;
    var s = sampleById(sampleId);
    if (!s) return EMPTY_COLOR;
    if (!s.pattern || s.pattern === 'solid') return s.color;
    return 'url(#fill-' + s.id + ')';
  }

  function cssSwatch(s) {
    var c = s.color;
    var bg = darkenHex(c, 0.45);
    var kind = s.pattern || 'solid';
    if (kind === 'solid') return c;
    if (kind === 'dots' || kind === 'dotsBig') {
      var sz = kind === 'dotsBig' ? '7px 7px' : '5px 5px';
      return 'radial-gradient(circle, ' + c + ' 28%, transparent 30%) 0 0 / ' + sz + ', ' + bg;
    }
    if (kind === 'stripesH') {
      return 'repeating-linear-gradient(0deg, ' + c + ' 0 3px, ' + bg + ' 3px 6px)';
    }
    if (kind === 'stripesV') {
      return 'repeating-linear-gradient(90deg, ' + c + ' 0 3px, ' + bg + ' 3px 6px)';
    }
    if (kind === 'diag') {
      return 'repeating-linear-gradient(45deg, ' + c + ' 0 3px, ' + bg + ' 3px 6px)';
    }
    if (kind === 'diag2') {
      return 'repeating-linear-gradient(-45deg, ' + c + ' 0 3px, ' + bg + ' 3px 6px)';
    }
    if (kind === 'cross') {
      return 'repeating-linear-gradient(45deg, ' + c + ' 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, ' + c + ' 0 2px, ' + bg + ' 2px 5px)';
    }
    if (kind === 'checkers') {
      return 'repeating-conic-gradient(' + c + ' 0 25%, ' + bg + ' 0 50%) 0 0 / 8px 8px';
    }
    if (kind === 'rings') {
      return 'radial-gradient(circle, transparent 35%, ' + c + ' 36% 55%, transparent 56%), ' + bg;
    }
    if (kind === 'dash') {
      return 'repeating-linear-gradient(90deg, ' + c + ' 0 5px, ' + bg + ' 5px 9px)';
    }
    if (kind === 'grid') {
      return 'linear-gradient(' + c + ' 2px, transparent 2px) 0 0 / 8px 8px, linear-gradient(90deg, ' + c + ' 2px, transparent 2px) 0 0 / 8px 8px, ' + bg;
    }
    return c;
  }

  function applySwatchStyle(el, sample) {
    if (!el) return;
    if (!sample) {
      el.style.background = EMPTY_COLOR;
      return;
    }
    el.style.background = cssSwatch(sample);
  }

  function paintOptionLabel(s) {
    if (s.type === 'sample' && sampleNames[s.id]) return truncateName(sampleNames[s.id], 12);
    if (s.type === 'text') {
      var w = String(sayTexts[s.id] || '').trim();
      return w ? (s.label + ': ' + truncateName(w, 10)) : s.label;
    }
    return s.label;
  }

  function paintGroupForSample(id) {
    var s = sampleById(id);
    if (!s) return 'word';
    if (s.type === 'maker') return 'drum';
    if (s.type === 'sample') return 'sample';
    return 'word';
  }

  function paintTriggerForGroup(group) {
    if (group === 'drum') return paintDrumTrigger;
    if (group === 'sample') return paintSampleTrigger;
    return paintWordTrigger;
  }

  function paintDotForGroup(group) {
    if (group === 'drum') return paintDrumDot;
    if (group === 'sample') return paintSampleDot;
    return paintWordDot;
  }

  function paintLabForGroup(group) {
    if (group === 'drum') return paintDrumLab;
    if (group === 'sample') return paintSampleLab;
    return paintWordLab;
  }

  function samplesForPaintGroup(group) {
    return SAMPLES.filter(function (s) {
      if (group === 'drum') return s.type === 'maker';
      if (group === 'sample') return s.type === 'sample';
      return s.type === 'text';
    });
  }

  function ensurePaintGroupMenu() {
    if (paintGroupMenu) return paintGroupMenu;
    paintGroupMenu = document.createElement('div');
    paintGroupMenu.className = 'paint-menu';
    paintGroupMenu.setAttribute('role', 'listbox');
    document.body.appendChild(paintGroupMenu);
    return paintGroupMenu;
  }

  function closePaintGroupMenu() {
    if (!paintGroupMenu) return;
    paintGroupMenu.classList.remove('open');
    paintMenuOpenGroup = null;
    ['word', 'drum', 'sample'].forEach(function (g) {
      var t = paintTriggerForGroup(g);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  function openPaintGroupMenu(group) {
    setPaintGroup(group);
    var menu = ensurePaintGroupMenu();
    var trigger = paintTriggerForGroup(group);
    if (!trigger) return;
    if (paintMenuOpenGroup === group && menu.classList.contains('open')) {
      closePaintGroupMenu();
      return;
    }
    menu.innerHTML = '';
    samplesForPaintGroup(group).forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'paint-opt' + (s.id === paintByGroup[group] ? ' active' : '');
      row.dataset.id = s.id;
      row.setAttribute('role', 'option');

      var dot = document.createElement('i');
      dot.className = 'dot';
      applySwatchStyle(dot, s);

      var nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'paint-name';
      nameBtn.textContent = paintOptionLabel(s);
      nameBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        setPaintSample(s.id);
        closePaintGroupMenu();
        listenSample(s.id).catch(function (err) { console.error(err); });
      });

      var playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'paint-play';
      playBtn.title = 'Listen';
      playBtn.setAttribute('aria-label', 'Listen ' + s.label);
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        listenSample(s.id).catch(function (err) { console.error(err); });
      });

      row.appendChild(dot);
      row.appendChild(nameBtn);
      row.appendChild(playBtn);
      menu.appendChild(row);
    });

    menu.classList.add('open');
    paintMenuOpenGroup = group;
    trigger.setAttribute('aria-expanded', 'true');
    var rect = trigger.getBoundingClientRect();
    var pad = 8;
    var menuW = Math.max(168, menu.offsetWidth || 168);
    var left = rect.left;
    if (left + menuW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - menuW);
    }
    menu.style.left = Math.round(left) + 'px';
    menu.style.top = Math.round(rect.bottom + 4) + 'px';
  }

  function buildPaintMenus() {
    syncPaintSwatch();
    syncPaintGroupUi();
  }

  function refreshPaintLabels() {
    syncPaintSwatch();
    syncPaintGroupUi();
    if (paintMenuOpenGroup) openPaintGroupMenu(paintMenuOpenGroup);
  }

  function setPaintGroup(group, opts) {
    opts = opts || {};
    if (group !== 'word' && group !== 'drum' && group !== 'sample') return;
    paintGroup = group;
    var list = samplesForPaintGroup(group);
    var id = paintByGroup[group] || (list[0] && list[0].id);
    if (!id) return;
    paintSample = id;
    paintByGroup[group] = id;
    syncPaintGroupUi();
    syncPaintSwatch();
    if (opts.preview) {
      listenSample(id).catch(function (err) { console.error(err); });
    }
  }

  function syncPaintGroupUi() {
    document.querySelectorAll('.paint-chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-paint-group') === paintGroup);
    });
  }

  function setPaintSample(id) {
    var s = sampleById(id);
    if (!s) return;
    var group = paintGroupForSample(id);
    paintByGroup[group] = id;
    paintGroup = group;
    paintSample = id;
    syncPaintGroupUi();
    syncPaintSwatch();
  }

  function syncPaintSwatch() {
    ['word', 'drum', 'sample'].forEach(function (group) {
      var id = paintByGroup[group];
      var s = sampleById(id);
      applySwatchStyle(paintDotForGroup(group), s);
      var lab = paintLabForGroup(group);
      if (lab) lab.textContent = s ? paintOptionLabel(s) : '—';
    });
    syncPaintExtras();
  }

  function syncPaintExtras() {
    /* Word / sample editors live in the sound dialog now. */
  }

  function truncateName(name, n) {
    var t = String(name || '').replace(/\.[^.]+$/, '');
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function randomInRange(lo, hi, round) {
    var r = lo + Math.random() * (hi - lo);
    return round ? Math.round(r) : parseFloat(r.toFixed(3));
  }

  /** Floor punch keys so randomized kick/snare never whisper. */
  function enforceCoreDrumEnergyFloor(id, params) {
    if (!params) return params;
    function floorKey(key, minVal) {
      if (params[key] == null || params[key] < minVal) params[key] = minVal;
    }
    if (id === 'kick') {
      floorKey('bodyLevel', 0.68);
      floorKey('clickNoiseLevel', 0.22);
      floorKey('clickOscLevel', 0.16);
      floorKey('decayBase', 0.28);
    } else if (id === 'snare') {
      // Keep snares punchy — thin random HPF / low crack was making them disappear.
      floorKey('noiseLevel', 0.95);
      floorKey('crackLevel', 1.1);
      floorKey('toneLevel', 0.55);
      floorKey('decayN', 0.18);
      floorKey('decayT', 0.1);
      if (params.noiseFilterType === 'highpass' && params.noiseFilterFreq > 4200) {
        params.noiseFilterFreq = 4200;
      }
    }
    return params;
  }

  /** Roll new maker params without writing them into live state. */
  function rollMakerSoundParams(id) {
    var ranges = MAKER_RANGES[id];
    var roundKeys = MAKER_ROUND_KEYS[id] || [];
    if (!ranges) return null;
    var params = Object.assign({}, makerSoundParams[id] || MAKER_DEFAULTS[id]);
    Object.keys(ranges).forEach(function (key) {
      var pair = ranges[key];
      params[key] = randomInRange(pair[0], pair[1], roundKeys.indexOf(key) !== -1);
    });
    if (id === 'snare' && Math.random() > 0.5) params.noiseFilterType = Math.random() > 0.5 ? 'bandpass' : 'highpass';
    if (id === 'clap') params.addTone = Math.random() > 0.5;
    if (id === 'hat') {
      if (Math.random() > 0.5) params.noiseType = Math.random() > 0.5 ? 'pink' : 'white';
      if (Math.random() > 0.5) params.filterType = Math.random() > 0.5 ? 'bandpass' : 'highpass';
      if (Math.random() > 0.5) params.addOscillators = Math.random() > 0.5;
    }
    if (id === 'tom' && Math.random() > 0.5) params.bodyOscType = Math.random() > 0.5 ? 'triangle' : 'sine';
    if (id === 'ride') params.addOscillators = Math.random() > 0.5;
    if (id === 'cowbell') {
      if (Math.random() > 0.5) params.osc1Type = ['sine', 'triangle', 'square'][Math.floor(Math.random() * 3)];
      if (Math.random() > 0.5) params.osc2Type = ['sine', 'triangle', 'sawtooth', 'square'][Math.floor(Math.random() * 4)];
      if (Math.random() > 0.5) params.addSecondPair = Math.random() > 0.5;
    }
    if (id === 'kick' || id === 'snare') enforceCoreDrumEnergyFloor(id, params);
    return params;
  }

  function randomizeMakerSound(id) {
    var params = rollMakerSoundParams(id);
    if (params) makerSoundParams[id] = params;
  }

  async function randomizeAllSounds() {
    makerIds.forEach(randomizeMakerSound);
    await ensureAudio();
    await buildBank();
    previewSample(paintSample);
  }

  function makersUsedInPattern(pat) {
    var used = {};
    if (!pat) return [];
    RINGS.forEach(function (ring) {
      var steps = pat[ring.id] || [];
      for (var i = 0; i < steps.length; i++) {
        var s = sampleById(steps[i]);
        if (s && s.type === 'maker' && s.maker) used[s.maker] = true;
      }
    });
    return Object.keys(used);
  }

  var WORD_BANK = [
    'triple', 'tung', 'type', 'mog', 'cap', 'rizz', 'sigma', 'gyatt',
    'ohio', 'aura', 'mew', 'edge', 'glaze', 'yap', 'mid', 'apple', 'banana',
    'cooked', 'locked', 'floss', 'drip', 'sus', 'bussin', 'nocap', 'fr',
    'ong', 'twin', 'chat', 'ratio', 'based', 'cringe', 'delulu', 'slay',
    'ate', 'bruh', 'brainrot', 'goon', 'grimace', 'chill', 'max', 'w',
   
    'yeah', 'yo', 'uh', 'ay', 'hey', 'whoa', 'woo', 'boom', 'bang', 'pop',
    'bass', 'drop', 'beat', 'vibe', 'flow', 'rhyme', 'hook', 'verse', 'bar', 'mic',
    'fire', 'hot', 'lit', 'go', 'run', 'move', 'jump', 'bounce', 'slide', 'spin',
    'clap', 'snap', 'stomp', 'kick', 'snare', 'hat', 'ride', 'tom', 'loop', 'mix',
    'low', 'high', 'loud', 'soft', 'slow', 'fast', 'hard', 'softly', 'deep', 'thick',
    'money', 'cash', 'flex', 'ice', 'gold', 'shine', 'glow', 'night', 'city', 'street',
    'love', 'hate', 'pain', 'dream', 'real', 'fake', 'truth', 'lie', 'win', 'lose',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'check', 'ready', 'set', 'push', 'pull', 'stop', 'play', 'pause', 'rewind', 'skip',
    'echo', 'reverb', 'delay', 'filter', 'crush', 'dist', 'noise', 'static', 'glitch', 'wave'
  ];

  async function randomizeSoundsForPattern(pat) {
    var used = makersUsedInPattern(pat);
    if (!used.length) used = makerIds.slice();
    used.forEach(randomizeMakerSound);
    await ensureAudio();
    await buildBank();
    previewSample(paintSample);
  }

  async function randomizeSoundsForLayers(layerIndices) {
    var usedMap = {};
    layerIndices.forEach(function (idx) {
      makersUsedInPattern(layers[idx].pattern).forEach(function (m) {
        usedMap[m] = true;
      });
    });
    var used = Object.keys(usedMap);
    if (!used.length) used = makerIds.slice();
    used.forEach(randomizeMakerSound);
    await ensureAudio();
    await buildBank();
    previewSample(paintSample);
  }

  /** Assign Word 1–9 texts immediately (no audio). */
  function seedWordTextsSync() {
    var words = WORD_BANK.slice();
    shuffleInPlace(words);
    var n = 0;
    SAMPLES.forEach(function (s) {
      if (s.type !== 'text') return;
      getSayVoiceParams(s.id);
      if (!String(sayTexts[s.id] || '').trim()) {
        sayTexts[s.id] = words[n % words.length];
        n += 1;
      }
    });
  }

  /** Prerender seeded Word buffers when audio is allowed. */
  async function seedWordBuffers() {
    var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
    try {
      await ensureAudio();
      var i;
      for (i = 0; i < textIds.length; i++) {
        var id = textIds[i];
        if (soundBank[id] || !String(sayTexts[id] || '').trim()) continue;
        try {
          soundBank[id] = await prerenderSpeechToBuffer(sayTexts[id], id);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e) {
      /* Audio may wait for a user gesture; texts are already set. */
    }
  }

  /** Fill empty Word slots from WORD_BANK so they can be painted. */
  async function ensureWordsForRandom() {
    var emptyIds = [];
    SAMPLES.forEach(function (s) {
      if (s.type === 'text' && !String(sayTexts[s.id] || '').trim()) emptyIds.push(s.id);
    });
    if (!emptyIds.length) return;
    await ensureAudio();
    var words = WORD_BANK.slice();
    shuffleInPlace(words);
    var i;
    for (i = 0; i < emptyIds.length; i++) {
      var id = emptyIds[i];
      var text = words[i % words.length];
      sayTexts[id] = text;
      getSayVoiceParams(id);
      try {
        soundBank[id] = await prerenderSpeechToBuffer(text, id);
      } catch (e) {
        console.error(e);
      }
    }
    refreshPaintLabels();
    syncPaintExtras();
  }

  function closeRandMenus() {
    if (randOptsMenu) randOptsMenu.classList.remove('open');
    if (randOptsBtn) randOptsBtn.setAttribute('aria-expanded', 'false');
    if (nudgeOptsMenu) nudgeOptsMenu.classList.remove('open');
    if (nudgeOptsBtn) nudgeOptsBtn.setAttribute('aria-expanded', 'false');
  }

  function buildRandLayersList() {
    if (!randLayersList) return;
    randLayersList.innerHTML = '';
    var i;
    for (i = 0; i < MAX_CIRCLES; i++) {
      (function (idx) {
        var lab = document.createElement('label');
        lab.className = 'rand-opt';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!randLayerChecked[idx];
        cb.addEventListener('change', function () {
          randLayerChecked[idx] = !!cb.checked;
        });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(layerLabel(idx)));
        randLayersList.appendChild(lab);
      })(i);
    }
  }

  function buildNudgeLayersList() {
    if (!nudgeLayersList) return;
    nudgeLayersList.innerHTML = '';
    var i;
    for (i = 0; i < MAX_CIRCLES; i++) {
      (function (idx) {
        var lab = document.createElement('label');
        lab.className = 'rand-opt';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!nudgeLayerChecked[idx];
        cb.addEventListener('change', function () {
          nudgeLayerChecked[idx] = !!cb.checked;
          resetNudgeLayerCursor();
        });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(layerLabel(idx)));
        nudgeLayersList.appendChild(lab);
      })(i);
    }
  }

  function selectedRandLayers() {
    var out = [];
    var i;
    for (i = 0; i < MAX_CIRCLES; i++) if (randLayerChecked[i]) out.push(i);
    return out;
  }

  function selectedNudgeLayers() {
    var out = [];
    var i;
    for (i = 0; i < MAX_CIRCLES; i++) if (nudgeLayerChecked[i]) out.push(i);
    return out;
  }

  function resetNudgeLayerCursor() {
    nudgeLayerCursor = 0;
  }

  /** Next selected wheel for this Nudge click; advances the cursor. */
  function takeNextNudgeLayer() {
    var indices = selectedNudgeLayers();
    if (!indices.length) return null;
    if (nudgeLayerCursor >= indices.length) nudgeLayerCursor = 0;
    var idx = indices[nudgeLayerCursor];
    nudgeLayerCursor = (nudgeLayerCursor + 1) % indices.length;
    return idx;
  }

  /** Reshuffle Word 1–9 texts from WORD_BANK and prerender. */
  async function randomizeWords() {
    var words = WORD_BANK.slice();
    shuffleInPlace(words);
    var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
    var i;
    for (i = 0; i < textIds.length; i++) {
      sayTexts[textIds[i]] = words[i % words.length];
      getSayVoiceParams(textIds[i]);
    }
    refreshPaintLabels();
    syncPaintExtras();
    await ensureAudio();
    for (i = 0; i < textIds.length; i++) {
      var id = textIds[i];
      try {
        soundBank[id] = await prerenderSpeechToBuffer(sayTexts[id], id);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /** Reroll SAM voice colour per word slot and re-render buffers. */
  async function randomizeVoices() {
    var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
    var i;
    for (i = 0; i < textIds.length; i++) {
      var p = getSayVoiceParams(textIds[i]);
      p.engine = 'sam';
      p.voiceSeed = 'sam-' + Math.floor(Math.random() * 1e9);
    }
    await ensureAudio();
    for (i = 0; i < textIds.length; i++) {
      var id = textIds[i];
      var text = String(sayTexts[id] || '').trim();
      if (!text) continue;
      try {
        soundBank[id] = await prerenderSpeechToBuffer(text, id);
      } catch (e) {
        console.error(e);
      }
    }
    if (soundSheet.classList.contains('open')) {
      var cur = sampleById(paintSample);
      if (cur && cur.type === 'text') openSoundEditor();
    }
  }

  function pickRandomBpm() {
    // Producer Speed biases the usual tempo band (50–130 BPM).
    var speed = getLuckySpeed();
    var minBpm = 50;
    var maxBpm = 130;
    var target = minBpm + speed * (maxBpm - minBpm);
    var spread = 16 + (1 - Math.abs(speed - 0.5) * 2) * 6;
    var lo = Math.max(minBpm, Math.round(target - spread));
    var hi = Math.min(maxBpm, Math.round(target + spread));
    if (hi < lo) hi = lo;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function applyBpmValue(v) {
    bpmEl.value = String(v);
    bpmVal.textContent = String(v);
    updateReverbIR();
  }

  function randomizeBpm() {
    applyBpmValue(pickRandomBpm());
  }

  /** Random in [min,max], biased toward lower values (power > 1). */
  function lowBiasInt(min, max, power) {
    var t = Math.pow(Math.random(), power || 2);
    return Math.round(min + t * (max - min));
  }

  function pickRandomSpace() {
    // Prefer shorter / less wet; stereo always stays under 10 when randomised.
    return {
      reverb: lowBiasInt(5, 100, 2.2),
      reverbDur: lowBiasInt(5, 100, 2.5),
      stereo: lowBiasInt(0, 9, 1.4)
    };
  }

  function applySpaceValues(space) {
    if (!space) return;
    reverbEl.value = String(space.reverb);
    reverbDurEl.value = String(space.reverbDur);
    stereoEl.value = String(space.stereo);
    reverbVal.textContent = Math.round(getReverb() * 100) + '%';
    stereoVal.textContent = Math.round(getStereo()) + '%';
    applySpaceSettings();
    updateReverbIR();
  }

  function randomizeSpace() {
    applySpaceValues(pickRandomSpace());
  }

  function liveRollHasWork(roll) {
    if (!roll) return false;
    if (!roll.globalsApplied) {
      if (roll.makerParams || roll.buffers || roll.sayTexts || roll.sayVoices ||
          roll.bpm != null || roll.space) return true;
    }
    if (roll.patterns && Object.keys(roll.patterns).length) return true;
    return false;
  }

  function pendingLiveBarDur() {
    if (livePendingRoll && !livePendingRoll.globalsApplied && livePendingRoll.bpm != null) {
      return (60 / livePendingRoll.bpm) * 4;
    }
    if (liveTempoAt != null && liveTempoBpm != null) {
      return (60 / liveTempoBpm) * 4;
    }
    return getBarDur();
  }

  /**
   * Apply queued Live roll for the wheel about to be scheduled.
   * Patterns for other wheels stay queued. View / tempo wait until bar start
   * so the currently playing wheel is not replaced early.
   */
  function applyLivePendingForLayer(layerIdx, opts) {
    opts = opts || {};
    if (!livePendingRoll) return;
    var roll = livePendingRoll;
    var touchedView = false;
    var barStart = opts.barStart;

    if (!roll.globalsApplied) {
      if (roll.makerParams) {
        Object.keys(roll.makerParams).forEach(function (id) {
          makerSoundParams[id] = roll.makerParams[id];
        });
      }
      if (roll.buffers) {
        Object.keys(roll.buffers).forEach(function (id) {
          soundBank[id] = roll.buffers[id];
        });
      }
      if (roll.sayTexts) {
        Object.keys(roll.sayTexts).forEach(function (id) {
          sayTexts[id] = roll.sayTexts[id];
        });
        refreshPaintLabels();
        syncPaintExtras();
      }
      if (roll.sayVoices) {
        Object.keys(roll.sayVoices).forEach(function (id) {
          sayVoiceParams[id] = roll.sayVoices[id];
        });
      }
      // Defer tempo/space to exact bar start (keeps current wheel's clock stable).
      if (barStart != null && (roll.bpm != null || roll.space)) {
        liveTempoAt = barStart;
        liveTempoBpm = roll.bpm;
        liveTempoSpace = roll.space;
      } else {
        if (roll.bpm != null) applyBpmValue(roll.bpm);
        if (roll.space) applySpaceValues(roll.space);
      }
      roll.globalsApplied = true;
      roll.makerParams = null;
      roll.buffers = null;
      roll.sayTexts = null;
      roll.sayVoices = null;
      roll.bpm = null;
      roll.space = null;
    }

    if (roll.patterns && Object.prototype.hasOwnProperty.call(roll.patterns, layerIdx)) {
      if (layers[layerIdx]) layers[layerIdx].pattern = roll.patterns[layerIdx];
      delete roll.patterns[layerIdx];
      if (layerIdx === viewLayer) touchedView = true;
    }

    if (opts.applyAllPatterns && roll.patterns) {
      Object.keys(roll.patterns).forEach(function (key) {
        var idx = +key;
        if (layers[idx]) layers[idx].pattern = roll.patterns[key];
        if (idx === viewLayer) touchedView = true;
      });
      roll.patterns = {};
    }

    if (opts.forceRedraw) {
      liveRedrawAt = null;
      if (liveTempoBpm != null) applyBpmValue(liveTempoBpm);
      if (liveTempoSpace) applySpaceValues(liveTempoSpace);
      liveTempoAt = null;
      liveTempoBpm = null;
      liveTempoSpace = null;
      pattern = layers[viewLayer].pattern;
      buildSvg();
      refreshSegFills();
    } else if (touchedView && barStart != null) {
      // Rebuild when this bar becomes active — keeps current wheel looking intact.
      liveRedrawAt = barStart;
    }

    clearScrubHitCache();
    if (!liveRollHasWork(roll)) {
      var postNudge = roll.postNudgeLayers;
      livePendingRoll = null;
      if (postNudge && postNudge.length) {
        nudgeLayersAfterLucky(postNudge).catch(function (err) { console.error(err); });
      }
    }
  }

  function flushLivePendingRoll() {
    if (!livePendingRoll && liveRedrawAt == null && liveTempoAt == null) return;
    if (livePendingRoll) {
      applyLivePendingForLayer(viewLayer, { applyAllPatterns: true, forceRedraw: true });
    } else {
      if (liveTempoBpm != null) applyBpmValue(liveTempoBpm);
      if (liveTempoSpace) applySpaceValues(liveTempoSpace);
      liveTempoAt = null;
      liveTempoBpm = null;
      liveTempoSpace = null;
      if (liveRedrawAt != null) {
        liveRedrawAt = null;
        pattern = layers[viewLayer].pattern;
        buildSvg();
        refreshSegFills();
      }
    }
  }

  function tickLiveRedraw(now) {
    if (liveTempoAt != null && now >= liveTempoAt) {
      if (liveTempoBpm != null) applyBpmValue(liveTempoBpm);
      if (liveTempoSpace) applySpaceValues(liveTempoSpace);
      liveTempoAt = null;
      liveTempoBpm = null;
      liveTempoSpace = null;
    }
    if (liveRedrawAt == null || now < liveRedrawAt) return;
    liveRedrawAt = null;
    pattern = layers[viewLayer].pattern;
    buildSvg();
    refreshSegFills();
  }

  async function buildLiveRollBuffers(makerParamsById) {
    var buffers = {};
    if (!makerParamsById) return buffers;
    await ensureAudio();
    await Promise.all(SAMPLES.filter(function (s) {
      return s.type === 'maker' && makerParamsById[s.maker];
    }).map(function (s) {
      return renderVoice(s.maker, s.open, makerParamsById[s.maker]).then(function (buf) {
        buffers[s.id] = buf;
      });
    }));
    return buffers;
  }

  async function runRandomise() {
    var indices = selectedRandLayers();
    var doProducer = !!(randOptProducer && randOptProducer.checked);
    var doPatterns = !!(randOptPatterns && randOptPatterns.checked);
    var doSounds = !!(randOptSounds && randOptSounds.checked);
    var doWords = !!(randOptWords && randOptWords.checked);
    var doVoices = !!(randOptVoices && randOptVoices.checked);
    var doBpm = !!(randOptBpm && randOptBpm.checked);
    var doSpace = !!(randOptSpace && randOptSpace.checked);
    if (!doProducer && !doPatterns && !doSounds && !doWords && !doVoices && !doBpm && !doSpace) return;

    // Optional: pick a named producer first so dens/skip/etc. feed the rest of the roll.
    if (doProducer) applyLuckyProducer(pickRandomNamedProducerId());
    unlockHubProducerFace();

    var wasPlaying = playing;
    var live = !!(randOptLive && randOptLive.checked);
    var deferAll = live && wasPlaying;

    if (deferAll) {
      var roll = {
        patterns: null,
        makerParams: null,
        buffers: null,
        sayTexts: null,
        sayVoices: null,
        bpm: null,
        space: null,
        globalsApplied: false
      };

      if (doBpm) roll.bpm = pickRandomBpm();
      if (doSpace) roll.space = pickRandomSpace();

      if (doWords) {
        var words = WORD_BANK.slice();
        shuffleInPlace(words);
        var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
        roll.sayTexts = {};
        var wi;
        for (wi = 0; wi < textIds.length; wi++) {
          roll.sayTexts[textIds[wi]] = words[wi % words.length];
        }
      }

      if (doVoices) {
        roll.sayVoices = {};
        SAMPLES.forEach(function (s) {
          if (s.type !== 'text') return;
          var prev = getSayVoiceParams(s.id);
          roll.sayVoices[s.id] = {
            engine: 'sam',
            voiceSeed: 'sam-' + Math.floor(Math.random() * 1e9),
            pitchVar: prev.pitchVar || 0,
            volVar: prev.volVar || 0
          };
        });
      }

      if (doPatterns && indices.length) {
        if (!doWords) await ensureWordsForRandom();
        var baseSeed = (Date.now() ^ ((Math.random() * 0x100000000) >>> 0)) >>> 0;
        var consistency = getLuckyConsistency();
        var masterPlan = consistency > 0
          ? buildLuckyFillPlan(createStructRng(baseSeed))
          : null;
        roll.patterns = {};
        indices.forEach(function (idx) {
          var plan;
          if (consistency >= 0.999 && masterPlan) {
            plan = masterPlan;
          } else if (consistency <= 0.001 || !masterPlan) {
            plan = buildLuckyFillPlan(createStructRng(hashSeed(baseSeed, idx + 1)));
          } else {
            var alt = buildLuckyFillPlan(createStructRng(hashSeed(baseSeed, idx + 1)));
            plan = blendLuckyFillPlans(
              masterPlan,
              alt,
              consistency,
              createStructRng(hashSeed(baseSeed, idx + 99))
            );
          }
          var nextPat = emptyPattern();
          applyLuckyFillPlan(nextPat, plan);
          roll.patterns[idx] = nextPat;
        });
      }

      if (doSounds && indices.length) {
        var usedMap = {};
        indices.forEach(function (idx) {
          var pat = (roll.patterns && roll.patterns[idx]) || layers[idx].pattern;
          makersUsedInPattern(pat).forEach(function (m) { usedMap[m] = true; });
        });
        var used = Object.keys(usedMap);
        if (!used.length) used = makerIds.slice();
        roll.makerParams = {};
        used.forEach(function (id) {
          var p = rollMakerSoundParams(id);
          if (p) roll.makerParams[id] = p;
        });
        roll.buffers = await buildLiveRollBuffers(roll.makerParams);
      }

      roll.postNudgeLayers = indices.slice();

      // Pre-render word buffers using pending voice seeds / texts without touching live bank.
      if ((doWords || doVoices) && (roll.sayTexts || roll.sayVoices)) {
        await ensureAudio();
        if (!roll.buffers) roll.buffers = {};
        var sayIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
        var si;
        for (si = 0; si < sayIds.length; si++) {
          var sid = sayIds[si];
          var text = roll.sayTexts
            ? roll.sayTexts[sid]
            : String(sayTexts[sid] || '').trim();
          if (!text) continue;
          var savedVoice = sayVoiceParams[sid];
          if (roll.sayVoices && roll.sayVoices[sid]) {
            sayVoiceParams[sid] = Object.assign({}, roll.sayVoices[sid]);
          }
          try {
            roll.buffers[sid] = await prerenderSpeechToBuffer(text, sid);
          } catch (e) {
            console.error(e);
          }
          sayVoiceParams[sid] = savedVoice;
        }
      }

      livePendingRoll = roll;
      return;
    }

    if (doBpm) randomizeBpm();
    if (doSpace) randomizeSpace();

    if (doWords) await randomizeWords();
    if (doVoices) await randomizeVoices();

    if (doPatterns && indices.length) {
      if (!doWords) await ensureWordsForRandom();
      var baseSeed2 = (Date.now() ^ ((Math.random() * 0x100000000) >>> 0)) >>> 0;
      var consistency2 = getLuckyConsistency();
      var masterPlan2 = consistency2 > 0
        ? buildLuckyFillPlan(createStructRng(baseSeed2))
        : null;
      indices.forEach(function (idx) {
        var plan;
        if (consistency2 >= 0.999 && masterPlan2) {
          plan = masterPlan2;
        } else if (consistency2 <= 0.001 || !masterPlan2) {
          plan = buildLuckyFillPlan(createStructRng(hashSeed(baseSeed2, idx + 1)));
        } else {
          var alt2 = buildLuckyFillPlan(createStructRng(hashSeed(baseSeed2, idx + 1)));
          plan = blendLuckyFillPlans(
            masterPlan2,
            alt2,
            consistency2,
            createStructRng(hashSeed(baseSeed2, idx + 99))
          );
        }
        applyLuckyFillPlan(layers[idx].pattern, plan);
      });
      pattern = layers[viewLayer].pattern;
      buildSvg();
      refreshSegFills();
    }

    if (doSounds && indices.length) {
      await randomizeSoundsForLayers(indices);
    }

    if (indices.length) await nudgeLayersAfterLucky(indices);

    if (wasPlaying) pause();
    await play();
  }

  /** Fraction of each maker range used as a single nudge step (~weak Lucky Roll). */
  var NUDGE_PARAM_FRAC = 0.12;
  var NUDGE_BPM_MAX = 6;
  var NUDGE_SPACE_MAX = 10;

  function clampNum(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rotateRingSteps(arr, rot) {
    var n = arr.length;
    if (!n) return;
    rot = ((rot % n) + n) % n;
    if (!rot) return;
    var rotated = arr.slice(rot).concat(arr.slice(0, rot));
    var i;
    for (i = 0; i < n; i++) arr[i] = rotated[i];
  }

  /** Lightly mutate an existing pattern — rotate / move / add / drop a few hits. */
  function nudgePattern(pat) {
    if (!pat) return;
    RINGS.forEach(function (ring) {
      var arr = pat[ring.id];
      if (!arr || !arr.length) return;
      var sounds = [];
      var hitIdx = [];
      var i;
      for (i = 0; i < arr.length; i++) {
        if (arr[i]) {
          hitIdx.push(i);
          if (sounds.indexOf(arr[i]) === -1) sounds.push(arr[i]);
        }
      }
      if (!hitIdx.length) return;

      if (Math.random() < 0.45) {
        var rot = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
        rotateRingSteps(arr, rot);
        hitIdx = [];
        for (i = 0; i < arr.length; i++) if (arr[i]) hitIdx.push(i);
      }

      var edits = 1 + Math.floor(Math.random() * 3);
      var e;
      for (e = 0; e < edits; e++) {
        var roll = Math.random();
        if (roll < 0.34 && hitIdx.length) {
          var dropAt = hitIdx[Math.floor(Math.random() * hitIdx.length)];
          arr[dropAt] = null;
        } else if (roll < 0.67 && hitIdx.length) {
          var from = hitIdx[Math.floor(Math.random() * hitIdx.length)];
          var sound = arr[from];
          var to = Math.floor(Math.random() * arr.length);
          if (to === from) to = (to + 1) % arr.length;
          arr[from] = null;
          arr[to] = sound;
        } else if (sounds.length) {
          var empty = [];
          for (i = 0; i < arr.length; i++) if (!arr[i]) empty.push(i);
          if (empty.length) {
            var addAt = empty[Math.floor(Math.random() * empty.length)];
            arr[addAt] = sounds[Math.floor(Math.random() * sounds.length)];
          }
        }
        hitIdx = [];
        for (i = 0; i < arr.length; i++) if (arr[i]) hitIdx.push(i);
        if (!hitIdx.length) break;
      }
    });
    clearScrubHitCache();
  }

  /** Nudge maker params toward nearby values in their allowed ranges. */
  function nudgeMakerSoundParams(id) {
    var ranges = MAKER_RANGES[id];
    var roundKeys = MAKER_ROUND_KEYS[id] || [];
    if (!ranges) return null;
    var params = Object.assign({}, makerSoundParams[id] || MAKER_DEFAULTS[id]);
    Object.keys(ranges).forEach(function (key) {
      var pair = ranges[key];
      var lo = pair[0];
      var hi = pair[1];
      var span = hi - lo;
      if (!(span > 0)) return;
      var delta = (Math.random() * 2 - 1) * span * NUDGE_PARAM_FRAC;
      var next = clampNum(params[key] + delta, lo, hi);
      params[key] = roundKeys.indexOf(key) !== -1 ? Math.round(next) : next;
    });
    var bools = MAKER_BOOLS[id] || [];
    bools.forEach(function (b) {
      if (Math.random() > 0.12) return;
      if (b.type === 'bool') {
        params[b.key] = !params[b.key];
      } else if (b.options && b.options.length) {
        params[b.key] = b.options[Math.floor(Math.random() * b.options.length)];
      }
    });
    if (id === 'kick' || id === 'snare') enforceCoreDrumEnergyFloor(id, params);
    return params;
  }

  function nudgeMakerSound(id) {
    var params = nudgeMakerSoundParams(id);
    if (params) makerSoundParams[id] = params;
  }

  async function nudgeSoundsForLayers(layerIndices) {
    var usedMap = {};
    layerIndices.forEach(function (idx) {
      makersUsedInPattern(layers[idx].pattern).forEach(function (m) {
        usedMap[m] = true;
      });
    });
    var used = Object.keys(usedMap);
    if (!used.length) used = makerIds.slice();
    used.forEach(nudgeMakerSound);
    await ensureAudio();
    await buildBank();
  }

  /** Replace a few word slots; keep most of the current bank. */
  async function nudgeWords() {
    var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
    if (!textIds.length) return;
    var changeN = Math.max(1, Math.round(textIds.length * 0.3));
    var order = textIds.slice();
    shuffleInPlace(order);
    var words = WORD_BANK.slice();
    shuffleInPlace(words);
    var i;
    for (i = 0; i < changeN; i++) {
      sayTexts[order[i]] = words[i % words.length];
      getSayVoiceParams(order[i]);
    }
    refreshPaintLabels();
    syncPaintExtras();
    await ensureAudio();
    for (i = 0; i < changeN; i++) {
      var id = order[i];
      try {
        soundBank[id] = await prerenderSpeechToBuffer(sayTexts[id], id);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /** Reseed SAM colour on a minority of word slots. */
  async function nudgeVoices() {
    var textIds = SAMPLES.filter(function (s) { return s.type === 'text'; }).map(function (s) { return s.id; });
    if (!textIds.length) return;
    var changeN = Math.max(1, Math.round(textIds.length * 0.3));
    var order = textIds.slice();
    shuffleInPlace(order);
    var i;
    for (i = 0; i < changeN; i++) {
      var p = getSayVoiceParams(order[i]);
      p.engine = 'sam';
      p.voiceSeed = 'sam-' + Math.floor(Math.random() * 1e9);
    }
    await ensureAudio();
    for (i = 0; i < changeN; i++) {
      var id = order[i];
      var text = String(sayTexts[id] || '').trim();
      if (!text) continue;
      try {
        soundBank[id] = await prerenderSpeechToBuffer(text, id);
      } catch (e) {
        console.error(e);
      }
    }
    if (soundSheet.classList.contains('open')) {
      var cur = sampleById(paintSample);
      if (cur && cur.type === 'text') openSoundEditor();
    }
  }

  function nudgeBpm() {
    var cur = Math.round(readSliderNumber(bpmEl, 120));
    var delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * NUDGE_BPM_MAX));
    applyBpmValue(clampNum(cur + delta, 50, 130));
  }

  function nudgeSpace() {
    function step(el, fallback) {
      var cur = Math.round(readSliderNumber(el, fallback));
      var delta = Math.round((Math.random() * 2 - 1) * NUDGE_SPACE_MAX);
      return clampNum(cur + delta, 0, 100);
    }
    var stereoCur = Math.round(readSliderNumber(stereoEl, 20));
    var stereoDelta = Math.round((Math.random() * 2 - 1) * 4);
    applySpaceValues({
      reverb: step(reverbEl, 50),
      reverbDur: step(reverbDurEl, 50),
      stereo: clampNum(stereoCur + stereoDelta, 0, 100)
    });
  }

  /** Weaker Lucky Roll — one selected wheel per click (round-robin), light tweaks. */
  async function runNudge() {
    var doPatterns = !!(nudgeOptPatterns && nudgeOptPatterns.checked);
    var doSounds = !!(nudgeOptSounds && nudgeOptSounds.checked);
    var doWords = !!(nudgeOptWords && nudgeOptWords.checked);
    var doVoices = !!(nudgeOptVoices && nudgeOptVoices.checked);
    var doBpm = !!(nudgeOptBpm && nudgeOptBpm.checked);
    var doSpace = !!(nudgeOptSpace && nudgeOptSpace.checked);
    if (!doPatterns && !doSounds && !doWords && !doVoices && !doBpm && !doSpace) return;

    var needLayer = doPatterns || doSounds;
    var layerIdx = needLayer ? takeNextNudgeLayer() : null;
    if (needLayer && layerIdx == null && !doWords && !doVoices && !doBpm && !doSpace) return;

    var wasPlaying = playing;

    if (doBpm) nudgeBpm();
    if (doSpace) nudgeSpace();
    if (doWords) await nudgeWords();
    if (doVoices) await nudgeVoices();

    if (layerIdx != null) {
      if (doPatterns) nudgePattern(layers[layerIdx].pattern);
      if (doSounds) await nudgeSoundsForLayers([layerIdx]);
      setViewLayer(layerIdx);
    }

    if (wasPlaying) pause();
    await play();
  }

  /**
   * After Lucky Roll: lightly nudge each rolled wheel separately (patterns +
   * sounds). Globals (BPM/space/words/voices) stay as the roll set them.
   */
  async function nudgeLayersAfterLucky(indices) {
    if (!indices || !indices.length) return;
    var i;
    for (i = 0; i < indices.length; i++) {
      var layerIdx = indices[i];
      if (!layers[layerIdx]) continue;
      nudgePattern(layers[layerIdx].pattern);
      await nudgeSoundsForLayers([layerIdx]);
    }
    pattern = layers[viewLayer].pattern;
    buildSvg();
    refreshSegFills();
    clearScrubHitCache();
  }

  function prettyKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function openSoundEditor() {
    var sample = sampleById(paintSample);
    if (!sample) return;
    soundTitle.textContent = sample.label;
    soundDot.style.background = cssSwatch(sample);
    soundBody.innerHTML = '';
    editMakerId = null;
    if (sample.type === 'maker') {
      editMakerId = sample.maker;
      buildSoundForm(editMakerId);
    } else if (sample.type === 'sample') {
      buildSampleForm(sample.id);
    } else if (sample.type === 'text') {
      buildTextForm(sample.id);
    }
    soundSheet.classList.add('open');
    soundSheet.setAttribute('aria-hidden', 'false');
  }

  function closeSoundEditor() {
    soundSheet.classList.remove('open');
    soundSheet.setAttribute('aria-hidden', 'true');
    editMakerId = null;
  }

  function buildSampleForm(sampleId) {
    var note = document.createElement('div');
    note.className = 'param';
    note.innerHTML = '<div class="row"><span>File</span><span>' +
      (sampleNames[sampleId] ? truncateName(sampleNames[sampleId], 18) : 'none') +
      '</span></div>';
    soundBody.appendChild(note);
    var actions = document.createElement('div');
    actions.className = 'param-actions';
    var loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', function () { triggerLoadSample(sampleId); });
    var previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.textContent = 'Listen';
    previewBtn.addEventListener('click', function () {
      listenSample(sampleId).catch(function (e) { console.error(e); });
    });
    actions.appendChild(loadBtn);
    actions.appendChild(previewBtn);
    soundBody.appendChild(actions);
  }

  function defaultSayVoiceParams() {
    return {
      engine: 'sam',
      voiceSeed: 'sam-' + Math.floor(Math.random() * 1e9),
      pitchVar: 0,
      volVar: 0
    };
  }

  function getSayVoiceParams(sampleId) {
    if (!sayVoiceParams[sampleId]) sayVoiceParams[sampleId] = defaultSayVoiceParams();
    var p = sayVoiceParams[sampleId];
    p.engine = 'sam';
    if (!p.voiceSeed) p.voiceSeed = p.voiceURI || ('sam-' + sampleId);
    return p;
  }

  function randomSayPlayMods(sampleId) {
    // Overall word loudness comes from Lucky Roll → Words (producer panel).
    var base = getLuckyWordsVol();
    return {
      playbackRate: 1,
      gain: Math.max(0, Math.min(2.4, base)),
      semitones: 0
    };
  }

  function buildTextForm(sampleId) {
    getSayVoiceParams(sampleId);
    var word = String(sayTexts[sampleId] || '').trim();

    var wordWrap = document.createElement('div');
    wordWrap.className = 'param';
    var wordRow = document.createElement('div');
    wordRow.className = 'row';
    wordRow.innerHTML = '<span>Word</span><span>max 20</span>';
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Type a word…';
    input.value = word;
    input.setAttribute('aria-label', 'Word text');
    wordWrap.appendChild(wordRow);
    wordWrap.appendChild(input);
    soundBody.appendChild(wordWrap);

    var styleHint = document.createElement('div');
    styleHint.className = 'param';
    styleHint.innerHTML = '<div class="row"><span>Style</span><span>SAM (robot)</span></div>';
    soundBody.appendChild(styleHint);

    var actions = document.createElement('div');
    actions.className = 'param-actions';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    function saveAndClose() {
      applySayText(sampleId, input.value, { skipReopen: true })
        .then(function () { closeSoundEditor(); })
        .catch(function (e) { console.error(e); });
    }
    saveBtn.addEventListener('click', saveAndClose);
    var previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.textContent = 'Listen';
    previewBtn.addEventListener('click', function () {
      var draft = String(input.value || '').trim();
      listenSample(sampleId, draft || undefined).catch(function (e) { console.error(e); });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAndClose();
      }
    });
    actions.appendChild(saveBtn);
    actions.appendChild(previewBtn);
    soundBody.appendChild(actions);
    setTimeout(function () { try { input.focus(); input.select(); } catch (e) { /* ignore */ } }, 0);
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () {
      ensureAudio().then(function () {
        return buildBank();
      }).then(function () {
        previewSample(paintSample);
      }).catch(function (e) { console.error(e); });
    }, 120);
  }

  function previewSample(sampleId) {
    if (!ctx || !soundBank[sampleId]) return;
    playBuf(sampleId, ctx.currentTime + 0.01);
  }

  function isSidechainKey(sampleId) {
    return sampleId === 'kick' || sampleId === 'snare';
  }

  function busForSample(sampleId) {
    if (isSidechainKey(sampleId)) return punchBus || master;
    return duckGain || master;
  }

  function triggerSidechainDuck(when) {
    if (!duckGain || !ctx || !playing) return;
    var g = duckGain.gain;
    var t0 = Math.max(when, ctx.currentTime);
    var depth = DUCK_DEPTH;
    var atk = DUCK_ATTACK;
    var hold = DUCK_HOLD;
    var rel = DUCK_RELEASE;
    try {
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t0);
      else {
        g.cancelScheduledValues(t0);
        g.setValueAtTime(Math.min(g.value, 1), t0);
      }
    } catch (e) {
      g.cancelScheduledValues(t0);
      g.setValueAtTime(1, t0);
    }
    g.linearRampToValueAtTime(depth, t0 + atk);
    g.linearRampToValueAtTime(depth, t0 + atk + hold);
    g.linearRampToValueAtTime(1, t0 + atk + hold + rel);
  }

  function playRawBuffer(buf, sampleId) {
    if (!buf || !ctx || !master) return;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    var mods = sampleId ? randomSayPlayMods(sampleId) : { playbackRate: 1, gain: 1 };
    src.playbackRate.value = mods.playbackRate;
    g.gain.value = mods.gain;
    src.connect(g);
    g.connect(busForSample(sampleId));
    src.start(ctx.currentTime + 0.01);
    activeVoices.push(src);
    src.onended = function () {
      var i = activeVoices.indexOf(src);
      if (i !== -1) activeVoices.splice(i, 1);
    };
  }

  async function listenSample(sampleId, draftText) {
    await ensureAudio();
    var s = sampleById(sampleId);
    if (!s) return;
    if (s.type === 'text') {
      var text = String(draftText != null ? draftText : (sayTexts[sampleId] || '')).trim().slice(0, 20);
      if (!text) return;
      if ((draftText == null || sayTexts[sampleId] === text) && soundBank[sampleId] &&
          typeof soundBank[sampleId].getChannelData === 'function') {
        playBuf(sampleId, ctx.currentTime + 0.01);
        return;
      }
      var buf = await prerenderSpeechToBuffer(text, sampleId);
      playRawBuffer(buf, sampleId);
      return;
    }
    if (s.type === 'maker' && !soundBank[sampleId]) await buildBank();
    previewSample(sampleId);
  }

  function buildSoundForm(makerId) {
    soundBody.innerHTML = '';
    var params = makerSoundParams[makerId] || Object.assign({}, MAKER_DEFAULTS[makerId]);
    makerSoundParams[makerId] = params;
    var ranges = MAKER_RANGES[makerId] || {};

    var actions = document.createElement('div');
    actions.className = 'param-actions';
    var tryBtn = document.createElement('button');
    tryBtn.type = 'button';
    tryBtn.textContent = 'Try new sound';
    tryBtn.title = 'Randomize this drum’s parameters';
    tryBtn.addEventListener('click', function () {
      randomizeMakerSound(makerId);
      buildSoundForm(makerId);
      ensureAudio().then(function () {
        return buildBank();
      }).then(function () {
        listenSample(paintSample).catch(function (e) { console.error(e); });
      }).catch(function (e) { console.error(e); });
    });
    var listenBtn = document.createElement('button');
    listenBtn.type = 'button';
    listenBtn.textContent = 'Listen';
    listenBtn.addEventListener('click', function () {
      listenSample(paintSample).catch(function (e) { console.error(e); });
    });
    actions.appendChild(tryBtn);
    actions.appendChild(listenBtn);
    soundBody.appendChild(actions);

    Object.keys(ranges).forEach(function (key) {
      var pair = ranges[key];
      var wrap = document.createElement('div');
      wrap.className = 'param';
      var row = document.createElement('div');
      row.className = 'row';
      var lab = document.createElement('span');
      lab.textContent = prettyKey(key);
      var val = document.createElement('span');
      var cur = params[key];
      if (!Number.isFinite(cur)) cur = pair[0];
      val.textContent = String(cur);
      row.appendChild(lab);
      row.appendChild(val);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = String(pair[0]);
      input.max = String(pair[1]);
      var span = pair[1] - pair[0];
      input.step = span > 20 ? '1' : (span > 2 ? '0.01' : '0.001');
      input.value = String(cur);
      input.addEventListener('input', function () {
        var n = parseFloat(input.value);
        params[key] = n;
        val.textContent = String(n);
        scheduleRebuild();
      });
      wrap.appendChild(row);
      wrap.appendChild(input);
      soundBody.appendChild(wrap);
    });

    (MAKER_BOOLS[makerId] || []).forEach(function (meta) {
      if (meta.type === 'bool') {
        var row = document.createElement('label');
        row.className = 'param-check';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!params[meta.key];
        cb.addEventListener('change', function () {
          params[meta.key] = cb.checked;
          scheduleRebuild();
        });
        row.appendChild(cb);
        row.appendChild(document.createTextNode(meta.label));
        soundBody.appendChild(row);
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'param';
      var lab = document.createElement('div');
      lab.className = 'row';
      lab.innerHTML = '<span>' + meta.label + '</span><span></span>';
      var sel = document.createElement('select');
      meta.options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      sel.value = params[meta.key] || meta.options[0];
      sel.addEventListener('change', function () {
        params[meta.key] = sel.value;
        scheduleRebuild();
      });
      wrap.appendChild(lab);
      wrap.appendChild(sel);
      soundBody.appendChild(wrap);
    });
  }

  function segmentAngles(n, swingAmt, swingDiv) {
    var s = Math.max(0, Math.min(1, swingAmt));
    var div = swingDiv || getSwingNoteDiv();
    var base = (Math.PI * 2) / n;
    var skew = base * s * 0.55;
    var widths = [];
    var i;
    for (i = 0; i < n; i++) {
      if (!stepIsSwingOffbeat(i, n, div)) widths.push(base + skew);
      else widths.push(Math.max(base * 0.12, base - skew));
    }
    var sum = 0;
    for (i = 0; i < n; i++) sum += widths[i];
    var scale = (Math.PI * 2) / sum;
    var starts = [];
    var a = START_ANGLE;
    for (i = 0; i < n; i++) {
      starts.push(a);
      a += widths[i] * scale;
    }
    return { starts: starts, widths: widths.map(function (w) { return w * scale; }) };
  }

  function buildSvg() {
    svg.innerHTML = '';
    segEls = {};
    discGroupEl = null;
    needleEl = null;
    playheadEl = null;

    buildFillDefs(svg);

    var bg = document.createElementNS(NS, 'circle');
    bg.setAttribute('id', 'discBg');
    bg.setAttribute('cx', CX);
    bg.setAttribute('cy', CY);
    bg.setAttribute('r', OUTER + 8);
    bg.setAttribute('fill', '#16161a');
    bg.setAttribute('stroke', 'none');
    svg.appendChild(bg);

    discGroupEl = document.createElementNS(NS, 'g');
    discGroupEl.setAttribute('class', 'disc');
    discGroupEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');

    var swingAmt = getSwing();
    var swingDiv = getSwingNoteDiv();
    var gap = (SEG_GAP_DEG * Math.PI) / 180;
    var pat = pattern || emptyPattern();

    RINGS.forEach(function (ring, li) {
      var rr = ringRadii(li);
      var n = ring.segments;
      var angles = segmentAngles(n, swingAmt, swingDiv);
      for (var i = 0; i < n; i++) {
        var a0 = angles.starts[i] + gap / 2;
        var a1 = angles.starts[i] + angles.widths[i] - gap / 2;
        if (a1 <= a0) a1 = a0 + 0.01;
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', arcPath(rr.inner, rr.outer, a0, a1));
        path.setAttribute('class', 'seg');
        path.dataset.ring = ring.id;
        path.dataset.seg = String(i);
        path.setAttribute('fill', segFill(pat[ring.id][i]));
        path.addEventListener('pointerdown', onSegPointerDown);
        path.addEventListener('pointermove', onSegPointerMove);
        path.addEventListener('pointerup', onSegPointerUp);
        path.addEventListener('pointercancel', onSegPointerCancel);
        discGroupEl.appendChild(path);
        segEls[ring.id + ':' + i] = path;
      }
    });
    svg.appendChild(discGroupEl);

    // Fixed light-strike at 12 o'clock (does not rotate with the disc).
    needleEl = document.createElementNS(NS, 'g');
    needleEl.setAttribute('class', 'needle');
    var tipY = INNER_HUB + 8;
    var topY = 18;
    // Soft wide bloom
    var bloom = document.createElementNS(NS, 'rect');
    bloom.setAttribute('class', 'needle-bloom');
    bloom.setAttribute('x', String(CX - 18));
    bloom.setAttribute('y', String(topY));
    bloom.setAttribute('width', '36');
    bloom.setAttribute('height', String(tipY - topY));
    bloom.setAttribute('rx', '10');
    bloom.setAttribute('fill', 'rgba(255,255,255,0.22)');
    bloom.setAttribute('filter', 'url(#needleSoftGlow)');
    needleEl.appendChild(bloom);
    // Mid glow beam
    var beam = document.createElementNS(NS, 'rect');
    beam.setAttribute('class', 'needle-beam');
    beam.setAttribute('x', String(CX - 5));
    beam.setAttribute('y', String(topY));
    beam.setAttribute('width', '10');
    beam.setAttribute('height', String(tipY - topY));
    beam.setAttribute('rx', '4');
    beam.setAttribute('fill', 'url(#needleStrikeGrad)');
    beam.setAttribute('filter', 'url(#needleGlow)');
    needleEl.appendChild(beam);
    // Hot core strike
    var core = document.createElementNS(NS, 'rect');
    core.setAttribute('class', 'needle-core');
    core.setAttribute('x', String(CX - 1.4));
    core.setAttribute('y', String(topY + 4));
    core.setAttribute('width', '2.8');
    core.setAttribute('height', String(tipY - topY - 6));
    core.setAttribute('rx', '1.4');
    core.setAttribute('fill', 'rgba(255,255,255,0.95)');
    needleEl.appendChild(core);
    // Bright tip spark
    var spark = document.createElementNS(NS, 'circle');
    spark.setAttribute('class', 'needle-spark');
    spark.setAttribute('cx', String(CX));
    spark.setAttribute('cy', String(tipY));
    spark.setAttribute('r', '5');
    spark.setAttribute('fill', 'rgba(255,255,255,0.85)');
    spark.setAttribute('filter', 'url(#needleGlow)');
    needleEl.appendChild(spark);
    svg.appendChild(needleEl);
  }

  function refreshSegFills() {
    if (!pattern) return;
    RINGS.forEach(function (ring) {
      for (var i = 0; i < ring.segments; i++) paintSeg(ring.id, i);
    });
  }

  function litIndexAtPhase(n, phase, swingAmt) {
    var angles = segmentAngles(n, swingAmt, getSwingNoteDiv());
    var target = phase * Math.PI * 2;
    var acc = 0;
    for (var i = 0; i < n; i++) {
      acc += angles.widths[i];
      if (target < acc) return i;
    }
    return n - 1;
  }

  function paintSeg(ringId, i) {
    var el = segEls[ringId + ':' + i];
    if (!el || !pattern) return;
    el.setAttribute('fill', segFill(pattern[ringId][i]));
  }

  var segPress = null;

  function clearSegPress() {
    if (segPress && segPress.timer) clearTimeout(segPress.timer);
    segPress = null;
  }

  function onSegPointerDown(e) {
    e.preventDefault();
    if (!layers[viewLayer].enabled) return;
    var ringId = e.currentTarget.dataset.ring;
    var i = parseInt(e.currentTarget.dataset.seg, 10);
    if (!pattern[ringId] || !Number.isFinite(i)) return;
    clearSegPress();
    segPress = {
      ringId: ringId,
      i: i,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      existing: pattern[ringId][i],
      held: false,
      moved: false,
      scratched: false,
      el: e.currentTarget,
      timer: null
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    if (playing) {
      // Hold or drag engages the platter; a quick tap still paints.
      segPress.timer = setTimeout(function () {
        if (!segPress || segPress.moved) return;
        segPress.held = true;
        beginPlatterGesture({
          pointerId: segPress.pointerId,
          clientX: segPress.startX,
          clientY: segPress.startY
        });
        if (platterGesture) platterGesture.mode = 'brake';
        transport.target = PLATTER_BRAKE_RATE;
      }, 160);
      return;
    }

    segPress.timer = setTimeout(function () {
      if (!segPress) return;
      segPress.held = true;
      if (segPress.existing) {
        setPaintSample(segPress.existing);
        listenSample(segPress.existing).catch(function (err) { console.error(err); });
      }
    }, HOLD_MS);
  }

  function onSegPointerMove(e) {
    if (!segPress || e.pointerId !== segPress.pointerId) return;
    var dist = Math.hypot(e.clientX - segPress.startX, e.clientY - segPress.startY);
    if (playing) {
      if (!platterGesture && dist > PLATTER_DRAG_PX) {
        if (segPress.timer) {
          clearTimeout(segPress.timer);
          segPress.timer = null;
        }
        beginPlatterGesture(e);
        segPress.moved = true;
        segPress.scratched = true;
      }
      if (platterGesture) {
        updatePlatterGesture(e);
        if (platterGesture.dragged) {
          segPress.moved = true;
          segPress.scratched = true;
        }
      }
      return;
    }
    if (dist > 14) segPress.moved = true;
  }

  function onSegPointerUp(e) {
    if (playing) endPlatterGesture(e);
    if (!segPress || e.pointerId !== segPress.pointerId) return;
    var press = segPress;
    if (press.timer) clearTimeout(press.timer);
    segPress = null;
    try { press.el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    var moved = press.moved || Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > 14;
    if (press.held || moved || press.scratched) return;
    if (!layers[viewLayer].enabled) return;
    // While playing, quick tap still paints; hold/drag is platter.
    var ringId = press.ringId;
    var i = press.i;
    if (pattern[ringId][i] === paintSample) {
      pattern[ringId][i] = null;
      paintSeg(ringId, i);
      clearScrubHitCache();
      return;
    }
    pattern[ringId][i] = paintSample;
    paintSeg(ringId, i);
    clearScrubHitCache();
    listenSample(paintSample).catch(function (err) { console.error(err); });
  }

  function onSegPointerCancel(e) {
    if (playing) endPlatterGesture(e);
    if (!segPress || e.pointerId !== segPress.pointerId) return;
    clearSegPress();
  }

  function pickRingPreferFewerSegments(availableIds, rand) {
    rand = rand || Math.random;
    if (!availableIds.length) return null;
    var weights = [];
    var total = 0;
    var i;
    for (i = 0; i < availableIds.length; i++) {
      var ring = null;
      var j;
      for (j = 0; j < RINGS.length; j++) {
        if (RINGS[j].id === availableIds[i]) { ring = RINGS[j]; break; }
      }
      // Fewer segments → higher weight (squared for a stronger bias).
      var w = ring ? 1 / (ring.segments * ring.segments) : 1;
      weights.push(w);
      total += w;
    }
    var r = rand() * total;
    var acc = 0;
    for (i = 0; i < availableIds.length; i++) {
      acc += weights[i];
      if (r <= acc) return availableIds[i];
    }
    return availableIds[availableIds.length - 1];
  }

  /**
   * Build structural Lucky Roll plan (rings / sounds / pulses / rot).
   * Skip is applied later via Math.random so Match=100% wheels can still vary slightly.
   */
  function buildLuckyFillPlan(rand) {
    rand = rand || Math.random;
    var plan = [];
    var remaining = RINGS.map(function (r) { return r.id; });
    var usedOrder = [];
    var usedSet = {};
    var soundTarget = getLuckySoundCount();
    var reuseChance = getLuckyReuseChance();

    function ringSteps(ringId) {
      for (var i = 0; i < RINGS.length; i++) {
        if (RINGS[i].id === ringId) return RINGS[i].segments;
      }
      return 16;
    }

    function placeOnRing(ringId, soundId) {
      var steps = ringSteps(ringId);
      var pulses = (soundId === 'kick' || soundId === 'snare')
        ? randomPulsesCore(steps, rand)
        : randomPulses(steps, rand);
      var rot = Math.floor(rand() * steps);
      plan.push({ ringId: ringId, soundId: soundId, pulses: pulses, rot: rot });
      if (!usedSet[soundId]) {
        usedSet[soundId] = true;
        usedOrder.push(soundId);
      }
    }

    function takeRing(preferFew) {
      if (!remaining.length) return null;
      var ringId = preferFew
        ? pickRingPreferFewerSegments(remaining, rand)
        : remaining[Math.floor(rand() * remaining.length)];
      var ri = remaining.indexOf(ringId);
      if (ri !== -1) remaining.splice(ri, 1);
      return ringId;
    }

    var coreOrder = CORE_DRUM_IDS.slice();
    var c;
    for (c = 0; c < coreOrder.length && remaining.length && usedOrder.length < soundTarget; c++) {
      var coreId = coreOrder[c];
      var coreRingId = takeRing(coreId === 'kick' || coreId === 'snare');
      if (!coreRingId) break;
      placeOnRing(coreRingId, coreId);
    }

    var fillPool = [];
    var wordPool = [];
    var humanity = getLuckyHumanity();
    SAMPLES.forEach(function (s) {
      if (usedSet[s.id]) return;
      if (s.type === 'text') {
        if (!String(sayTexts[s.id] || '').trim()) return;
        // Humanity: how likely this producer picks word sounds for free slots.
        if (rand() >= humanity) return;
        wordPool.push(s.id);
        return;
      }
      if (s.type === 'sample' && !soundBank[s.id]) return;
      fillPool.push(s.id);
    });
    shuffleInPlace(wordPool, rand);
    shuffleInPlace(fillPool, rand);
    // Prefer words first when Humanity is high so vocal producers actually land on the wheel.
    if (humanity >= 0.55) fillPool = wordPool.concat(fillPool);
    else fillPool = fillPool.concat(wordPool);

    while (remaining.length && usedOrder.length < soundTarget && fillPool.length) {
      var freshId = fillPool.shift();
      var freshRing = takeRing(false);
      if (!freshRing) break;
      placeOnRing(freshRing, freshId);
    }

    while (remaining.length && usedOrder.length) {
      var leftRing = takeRing(false);
      if (!leftRing) break;
      if (rand() >= reuseChance) continue;
      var reuseId = usedOrder[Math.floor(rand() * usedOrder.length)];
      placeOnRing(leftRing, reuseId);
    }

    return plan;
  }

  function applyLuckyFillPlan(pat, plan) {
    RINGS.forEach(function (ring) {
      pat[ring.id] = Array(ring.segments).fill(null);
    });
    if (!plan || !plan.length) return;
    var i;
    for (i = 0; i < plan.length; i++) {
      var item = plan[i];
      if (!pat[item.ringId]) continue;
      applyEuclid(pat[item.ringId], item.soundId, item.pulses, item.rot);
    }
    clearScrubHitCache();
  }

  /** Per-ring blend of master vs alternate plan by Match (consistency). */
  function blendLuckyFillPlans(master, alt, consistency, rand) {
    rand = rand || Math.random;
    var byMaster = {};
    var byAlt = {};
    (master || []).forEach(function (p) { byMaster[p.ringId] = p; });
    (alt || []).forEach(function (p) { byAlt[p.ringId] = p; });
    var out = [];
    RINGS.forEach(function (ring) {
      var keepMaster = rand() < consistency;
      var pick = keepMaster ? byMaster[ring.id] : byAlt[ring.id];
      if (!pick) pick = byMaster[ring.id] || byAlt[ring.id];
      if (pick) out.push(pick);
    });
    return out;
  }

  function randomFillPattern(pat, structRng) {
    applyLuckyFillPlan(pat, buildLuckyFillPlan(structRng || Math.random));
  }

  /** Bjorklund Euclidean rhythm → boolean hits length = steps. */
  function euclidHits(steps, pulses) {
    steps = Math.max(0, steps | 0);
    pulses = Math.max(0, Math.min(steps, pulses | 0));
    if (steps === 0) return [];
    if (pulses === 0) {
      var z = [];
      for (var zi = 0; zi < steps; zi++) z.push(false);
      return z;
    }
    if (pulses === steps) {
      var f = [];
      for (var fi = 0; fi < steps; fi++) f.push(true);
      return f;
    }
    var pattern = [];
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
      if (lvl === -1) {
        pattern.push(false);
        return;
      }
      if (lvl === -2) {
        pattern.push(true);
        return;
      }
      var c;
      for (c = 0; c < counts[lvl]; c++) build(lvl - 1);
      if (remainders[lvl] !== 0) build(lvl - 2);
    }
    build(level);
    return pattern.reverse();
  }

  function rotateBools(arr, rot) {
    var n = arr.length;
    if (!n) return arr;
    rot = ((rot % n) + n) % n;
    return arr.slice(rot).concat(arr.slice(0, rot));
  }

  /** φ⁻¹ ≈ 0.618 — Euclidean density + skip approach. */
  var GOLDEN_CONJ = (Math.sqrt(5) - 1) / 2;
  var CORE_SKIP_SCALE = 0.15;
  var CORE_PLAY_GAIN = 1.2;
  /** Extra lift so snare reads clearly against words / hats. */
  var SNARE_PLAY_GAIN = 1.65;

  function isCoreBackbone(soundId) {
    return soundId === 'kick' || soundId === 'snare';
  }

  function playGainForSample(sampleId) {
    if (sampleId === 'snare') return SNARE_PLAY_GAIN;
    if (isCoreBackbone(sampleId)) return CORE_PLAY_GAIN;
    return 1;
  }

  function coreMinPulses(n) {
    if (n <= 1) return n;
    return Math.max(2, Math.round(n / 8));
  }

  function randomPulses(n, rand) {
    rand = rand || Math.random;
    if (n <= 1) return n;
    var maxDens = getLuckyEuclidMaxDens();
    var max = Math.max(1, Math.floor(n * maxDens));
    var bias = getLuckyEuclidGoldenBias();
    var goldenTarget = Math.max(1, Math.min(max, Math.round(n * GOLDEN_CONJ)));
    if (bias > 0 && rand() < bias) {
      var spread = Math.max(1, Math.round(max * 0.22));
      var lo = Math.max(1, goldenTarget - spread);
      var hi = Math.min(max, goldenTarget + spread);
      return lo + Math.floor(rand() * (hi - lo + 1));
    }
    return 1 + Math.floor(rand() * max);
  }

  /** Kick/snare pulse counts — denser floor around quarter/backbeat band. */
  function randomPulsesCore(n, rand) {
    rand = rand || Math.random;
    if (n <= 1) return n;
    var maxDens = getLuckyEuclidMaxDens();
    var max = Math.max(1, Math.floor(n * maxDens));
    var minP = Math.min(max, coreMinPulses(n));
    var loBand = Math.max(minP, Math.round(n / 4));
    var hiBand = Math.max(loBand, Math.round(n / 3));
    loBand = Math.min(max, loBand);
    hiBand = Math.min(max, Math.max(loBand, hiBand));
    var bias = getLuckyEuclidGoldenBias();
    var goldenTarget = Math.max(minP, Math.min(max, Math.round(n * GOLDEN_CONJ)));
    if (bias > 0 && rand() < bias) {
      var spread = Math.max(1, Math.round((hiBand - loBand + 1) * 0.35));
      var lo = Math.max(minP, goldenTarget - spread);
      var hi = Math.min(max, goldenTarget + spread);
      if (hi < lo) hi = lo;
      return lo + Math.floor(rand() * (hi - lo + 1));
    }
    return loBand + Math.floor(rand() * (hiBand - loBand + 1));
  }

  /**
   * Skip probability for each Euclidean hit (Lucky Roll second stage).
   * Base: density×φ⁻¹ + |density − φ⁻¹|×(1 − φ⁻¹), then × Skip strength.
   */
  function euclidSkipChance(pulses, steps) {
    var strength = getLuckySkipStrength();
    if (strength <= 0 || steps <= 0 || pulses <= 0) return 0;
    var ratio = Math.min(1, pulses / steps);
    var n = ratio * GOLDEN_CONJ + Math.abs(ratio - GOLDEN_CONJ) * (1 - GOLDEN_CONJ);
    n = Math.max(0.05, Math.min(0.72, n)) * strength;
    return Math.max(0, Math.min(0.85, n));
  }

  /** Place Euclidean hits, then randomly drop some (golden/ratio skip stage). */
  function applyEuclid(arr, soundId, pulses, rot) {
    var n = arr.length;
    if (!n || pulses <= 0) return;
    pulses = Math.min(pulses, n);
    var hits = rotateBools(euclidHits(n, pulses), rot || 0);
    var skipP = euclidSkipChance(pulses, n);
    var backbone = isCoreBackbone(soundId);
    if (backbone) skipP *= CORE_SKIP_SCALE;
    var i;
    var placed = 0;
    for (i = 0; i < n; i++) {
      if (!hits[i]) continue;
      if (Math.random() < skipP) continue;
      arr[i] = soundId;
      placed += 1;
    }
    // Kick/snare: restore Euclidean slots if skip thinned below the floor.
    if (backbone) {
      var minKeep = Math.min(pulses, coreMinPulses(n));
      if (placed < minKeep) {
        var need = minKeep - placed;
        for (i = 0; i < n && need > 0; i++) {
          if (!hits[i] || arr[i] === soundId) continue;
          arr[i] = soundId;
          need -= 1;
        }
      }
    }
  }

  function shuffleInPlace(list, rand) {
    rand = rand || Math.random;
    var i;
    for (i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function getBpm() {
    return Math.max(50, Math.min(130, parseInt(bpmEl.value, 10) || 120));
  }

  function getBarDur() {
    return (60 / getBpm()) * 4;
  }

  async function ensureAudio() {
    if (audioReady && ctx) {
      if (ctx.state === 'suspended') await ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    buildAudioGraph();
    await buildBank();
    audioReady = true;
  }

  function renderVoice(makerId, openHat, paramsOverride) {
    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var len = Math.ceil(BANK_SR * BANK_DUR);
    var offline = new OfflineCtx(1, len, BANK_SR);
    var params = Object.assign({}, paramsOverride || makerSoundParams[makerId] || MAKER_DEFAULTS[makerId]);
    var dest = offline.destination;
    if (makerId === 'kick') window.playKickTest(offline, dest, params, 0);
    else if (makerId === 'snare') window.playSnareTest(offline, dest, params, 0);
    else if (makerId === 'clap') window.playClapTest(offline, dest, params, 0);
    else if (makerId === 'hat') window.playHatTest(offline, dest, Object.assign({}, params, { hatOpen: !!openHat }), 0, !!openHat);
    else if (makerId === 'ride') window.playRideTest(offline, dest, params, 0);
    else if (makerId === 'cowbell') window.playCowbellTest(offline, dest, params, 0);
    else if (makerId === 'tom') window.playTomTest(offline, dest, params, 0);
    return offline.startRendering();
  }

  async function buildBank() {
    await Promise.all(SAMPLES.filter(function (s) {
      return s.type === 'maker';
    }).map(function (s) {
      return renderVoice(s.maker, s.open).then(function (buf) {
        soundBank[s.id] = buf;
      });
    }));
  }

  function floatsToAudioBuffer(floats, sampleRate) {
    if (!floats || !floats.length) throw new Error('Empty speech buffer');
    var rate = sampleRate || 22050;
    var buf = ctx.createBuffer(1, floats.length, rate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < floats.length; i++) ch[i] = floats[i];
    return buf;
  }

  /** Peak-normalise an AudioBuffer in place to targetPeakDb (e.g. -3). */
  var WORD_PEAK_DB = -3;
  function normalizeAudioBufferPeak(buf, targetPeakDb) {
    if (!buf || typeof buf.getChannelData !== 'function') return buf;
    var target = Math.pow(10, (targetPeakDb != null ? targetPeakDb : WORD_PEAK_DB) / 20);
    var peak = 0;
    var ch;
    var i;
    var n;
    var data;
    for (ch = 0; ch < buf.numberOfChannels; ch++) {
      data = buf.getChannelData(ch);
      for (i = 0, n = data.length; i < n; i++) {
        var a = Math.abs(data[i]);
        if (a > peak) peak = a;
      }
    }
    if (peak < 1e-8) return buf;
    var scale = target / peak;
    for (ch = 0; ch < buf.numberOfChannels; ch++) {
      data = buf.getChannelData(ch);
      for (i = 0, n = data.length; i < n; i++) data[i] *= scale;
    }
    return buf;
  }

  function samParamsForSample(sampleId) {
    // Mild voice colour only — keep speed near default so words stay clear.
    var seed = sampleId || 'say';
    if (sampleId) {
      var vp = getSayVoiceParams(sampleId);
      if (vp.voiceSeed) seed = String(vp.voiceSeed);
      else if (vp.voiceURI) seed = String(vp.voiceURI);
    }
    var h = 2166136261;
    var i;
    for (i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h = h >>> 0;
    return {
      speed: 70 + (h % 8),
      pitch: 58 + ((h >>> 6) % 12),
      throat: 110 + ((h >>> 12) % 36),
      mouth: 110 + ((h >>> 18) % 36)
    };
  }

  function prerenderSpeechWithSam(text, sampleId) {
    if (typeof SamJs !== 'function') throw new Error('SAM missing');
    var p = samParamsForSample(sampleId);
    var sam = new SamJs({ speed: p.speed, pitch: p.pitch, throat: p.throat, mouth: p.mouth });
    var floats = sam.buf32(String(text).slice(0, 20));
    if (!floats || !floats.length) throw new Error('SAM empty');
    return normalizeAudioBufferPeak(floatsToAudioBuffer(floats, 22050), WORD_PEAK_DB);
  }

  async function prerenderSpeechToBuffer(text, sampleId) {
    if (!text) throw new Error('Empty text');
    return prerenderSpeechWithSam(text, sampleId);
  }

  async function applySayText(sampleId, raw, opts) {
    opts = opts || {};
    if (sayBusy) return;
    var text = String(raw || '').trim().slice(0, 20);
    sayBusy = true;
    try {
      await ensureAudio();
      if (!text) {
        sayTexts[sampleId] = '';
        delete soundBank[sampleId];
        refreshPaintLabels();
        if (!opts.skipReopen && soundSheet.classList.contains('open') && paintSample === sampleId) {
          openSoundEditor();
        }
        return;
      }
      sayTexts[sampleId] = text;
      soundBank[sampleId] = await prerenderSpeechToBuffer(text, sampleId);
      refreshPaintLabels();
      previewSample(sampleId);
      if (!opts.skipReopen && soundSheet.classList.contains('open') && paintSample === sampleId) {
        openSoundEditor();
      }
    } finally {
      sayBusy = false;
    }
  }

  function triggerLoadSample(forId) {
    wavInput.dataset.target = forId || paintSample;
    wavInput.value = '';
    wavInput.click();
  }

  async function loadWavFile(sampleId, file) {
    if (!file || !sampleId) return;
    await ensureAudio();
    var arr = await file.arrayBuffer();
    var buffer = await ctx.decodeAudioData(arr.slice(0));
    soundBank[sampleId] = buffer;
    sampleNames[sampleId] = file.name || 'sample.wav';
    refreshPaintLabels();
    previewSample(sampleId);
    if (soundSheet.classList.contains('open') && paintSample === sampleId) openSoundEditor();
  }

  function noteSegHit(ringId, segIdx, when) {
    segHitFlashes[ringId + ':' + segIdx] = when;
  }

  function positiveMod(a, b) {
    if (!(b > 0)) return 0;
    return ((a % b) + b) % b;
  }

  function clearScrubHitCache() {
    scrubHitCache = {};
    scrubCacheBarDur = 0;
  }

  function layerForBarIndex(barIndex) {
    var seq = [];
    var cur = resolveStart(playOriginLayer);
    if (cur < 0) return 0;
    var guard = 0;
    do {
      seq.push(cur);
      cur = nextEnabled(cur);
      guard += 1;
    } while (cur >= 0 && cur !== seq[0] && guard < MAX_CIRCLES);
    if (!seq.length) return 0;
    var n = seq.length;
    var idx = ((barIndex % n) + n) % n;
    return seq[idx];
  }

  function buildBarHits(layerIdx, barMusicStart, barDur) {
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    var hits = [];
    if (!pat) return hits;
    var human = getHumanize();
    var swing = getSwing();
    var swingDiv = getSwingNoteDiv();
    var swingUnitDur = barDur / swingDiv;
    var swingMaxDelay = swingUnitDur * SWING_MAX_DELAY_FRAC;
    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      var n = ring.segments;
      var stepDur = barDur / n;
      var humanMaxDelay = stepDur * MAX_DELAY_FRAC;
      for (var i = 0; i < n; i++) {
        if (!steps[i]) continue;
        var offset = 0;
        if (swing > 0 && stepIsSwingOffbeat(i, n, swingDiv)) offset += swing * swingMaxDelay;
        if (human > 0) offset += human * humanMaxDelay * pseudo01(ring.id, i, layerIdx + 1);
        var cap = swingMaxDelay + humanMaxDelay;
        if (offset > cap) offset = cap;
        hits.push({
          mt: barMusicStart + i * stepDur + offset,
          sampleId: steps[i],
          ringId: ring.id,
          seg: i,
          layer: layerIdx
        });
      }
    });
    hits.sort(function (a, b) { return a.mt - b.mt; });
    return hits;
  }

  function hitsForBarIndex(barIndex) {
    var barDur = getBarDur();
    if (scrubCacheBarDur && Math.abs(scrubCacheBarDur - barDur) > 1e-6) clearScrubHitCache();
    scrubCacheBarDur = barDur;
    var key = String(barIndex);
    if (!scrubHitCache[key]) {
      var layer = layerForBarIndex(barIndex);
      scrubHitCache[key] = buildBarHits(layer, barIndex * barDur, barDur);
      var keys = Object.keys(scrubHitCache);
      if (keys.length > 24) {
        keys.sort(function (a, b) { return (+a) - (+b); });
        var i;
        for (i = 0; i < keys.length - 16; i++) delete scrubHitCache[keys[i]];
      }
    }
    return scrubHitCache[key];
  }

  function triggerHitsBetween(fromMt, toMt) {
    if (!ctx || fromMt === toMt) return;
    var barDur = getBarDur();
    if (!(barDur > 0)) return;
    var lo = Math.min(fromMt, toMt);
    var hi = Math.max(fromMt, toMt);
    var b0 = Math.floor(lo / barDur) - 1;
    var b1 = Math.floor(hi / barDur) + 1;
    var rateAbs = Math.max(0.08, Math.min(3.5, Math.abs(transport.rate) || 1));
    var b;
    for (b = b0; b <= b1; b++) {
      var hits = hitsForBarIndex(b);
      var i;
      for (i = 0; i < hits.length; i++) {
        var h = hits[i];
        var crossed = toMt > fromMt
          ? (h.mt > fromMt && h.mt <= toMt)
          : (h.mt < fromMt && h.mt >= toMt);
        if (!crossed) continue;
        playBuf(h.sampleId, ctx.currentTime + 0.005, { rate: rateAbs });
        noteSegHit(h.ringId, h.seg, ctx.currentTime);
      }
    }
  }

  function stopScheduler() {
    if (scheduleTimer) {
      clearTimeout(scheduleTimer);
      scheduleTimer = 0;
    }
  }

  function pointerAngleAt(clientX, clientY) {
    var rect = svg.getBoundingClientRect();
    var cx = rect.left + rect.width * 0.5;
    var cy = rect.top + rect.height * 0.5;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  function enterFreeTransport() {
    if (!playing || !ctx || transport.free) return;
    var now = ctx.currentTime;
    // Normal play runs at rate 1, so music time matches wall clock since barOrigin.
    transport.musicTime = Math.max(0, now - barOrigin);
    transport.lastMusicTime = transport.musicTime;
    transport.lastCtx = now;
    transport.rate = 1;
    transport.target = 1;
    transport.free = true;
    transport.easing = false;
    stopScheduler();
    stopAllVoices();
    clearScrubHitCache();
    if (circleWrap) circleWrap.classList.add('is-scratching');
  }

  function handOffFreeTransport() {
    if (!transport.free || !ctx || !playing) return;
    var barDur = getBarDur();
    if (!(barDur > 0)) return;
    var mt = transport.musicTime;
    var phase = positiveMod(mt, barDur);
    var barIndex = Math.floor(mt / barDur);
    if (mt < 0 && phase > 1e-9) barIndex -= 1;
    var layer = layerForBarIndex(barIndex);
    var now = ctx.currentTime;
    var barStartCtx = now - phase;
    barOrigin = barStartCtx - barIndex * barDur;
    barEvents = [{ start: barStartCtx, layer: layer }];
    playCursor = layer;
    shownPlayLayer = layer;
    if (!viewLocked) setViewLayer(layer, { fromPlayhead: true });

    // Schedule remaining hits in this bar, then resume lookahead.
    var hits = hitsForBarIndex(barIndex);
    var i;
    for (i = 0; i < hits.length; i++) {
      if (hits[i].mt + 1e-4 < mt) continue;
      var when = barStartCtx + (hits[i].mt - barIndex * barDur);
      if (when < now - 0.01) continue;
      playBuf(hits[i].sampleId, when);
      noteSegHit(hits[i].ringId, hits[i].seg, when);
    }
    nextBarTime = barStartCtx + barDur;
    var nxt = nextEnabled(layer);
    playCursor = nxt < 0 ? layer : nxt;
    transport.free = false;
    transport.rate = 1;
    transport.target = 1;
    transport.easing = false;
    if (circleWrap) circleWrap.classList.remove('is-scratching');
    scheduler();
  }

  function tickFreeTransport(now) {
    if (!transport.free || !ctx) return getTransportPhase(now);
    var dt = Math.max(0, Math.min(0.08, now - (transport.lastCtx || now)));
    transport.lastCtx = now;

    if (platterGesture && platterGesture.mode === 'drag') {
      // Drag owns the playhead (updated in pointermove). Don't apply hold-brake.
      transport.lastCtx = now;
      var barDurDrag = getBarDur();
      var phaseDrag = barDurDrag > 0 ? positiveMod(transport.musicTime, barDurDrag) / barDurDrag : 0;
      var barIndexDrag = barDurDrag > 0 ? Math.floor(transport.musicTime / barDurDrag) : 0;
      if (transport.musicTime < 0 && positiveMod(transport.musicTime, barDurDrag) > 1e-9) barIndexDrag -= 1;
      var layerDrag = layerForBarIndex(barIndexDrag);
      if (layerDrag !== shownPlayLayer) {
        shownPlayLayer = layerDrag;
        if (!viewLocked) setViewLayer(layerDrag, { fromPlayhead: true });
      }
      return phaseDrag;
    } else if (platterGesture) {
      // Hold only (no drag yet) — slow the platter.
      transport.target = PLATTER_BRAKE_RATE;
      transport.rate += (transport.target - transport.rate) * Math.min(1, dt * 10);
    } else {
      // Released — snap back to normal quickly, then hand off to scheduler.
      transport.target = 1;
      transport.easing = true;
      transport.rate += (transport.target - transport.rate) * Math.min(1, dt * 14);
      if (Math.abs(transport.rate - 1) < 0.08) {
        transport.rate = 1;
        transport.lastMusicTime = transport.musicTime;
        handOffFreeTransport();
        return getTransportPhase(now);
      }
    }

    transport.lastMusicTime = transport.musicTime;
    transport.musicTime += dt * transport.rate;
    triggerHitsBetween(transport.lastMusicTime, transport.musicTime);

    var barDur = getBarDur();
    var phase = barDur > 0 ? positiveMod(transport.musicTime, barDur) / barDur : 0;
    var barIndex = barDur > 0 ? Math.floor(transport.musicTime / barDur) : 0;
    if (transport.musicTime < 0 && positiveMod(transport.musicTime, barDur) > 1e-9) barIndex -= 1;
    var layer = layerForBarIndex(barIndex);
    if (layer !== shownPlayLayer) {
      shownPlayLayer = layer;
      if (!viewLocked) setViewLayer(layer, { fromPlayhead: true });
    }
    return phase;
  }

  function getTransportPhase(now) {
    if (transport.free) {
      var barDur = getBarDur();
      return barDur > 0 ? positiveMod(transport.musicTime, barDur) / barDur : 0;
    }
    var ev = activeLayerAt(now);
    var barDurN = getBarDur();
    var start = ev ? ev.start : barOrigin;
    var elapsed = barDurN > 0 ? positiveMod(now - start, barDurN) : 0;
    return barDurN > 0 ? elapsed / barDurN : 0;
  }

  function beginPlatterGesture(e) {
    if (!playing || !ctx) return;
    enterFreeTransport();
    var ang = pointerAngleAt(e.clientX, e.clientY);
    platterGesture = {
      pointerId: e.pointerId,
      mode: 'hold',
      angle: ang,
      lastAngle: ang,
      lastT: performance.now(),
      startX: e.clientX,
      startY: e.clientY,
      dragged: false
    };
    transport.target = PLATTER_BRAKE_RATE;
    if (circleWrap) circleWrap.classList.add('is-scratching');
  }

  function updatePlatterGesture(e) {
    if (!platterGesture || e.pointerId !== platterGesture.pointerId) return;
    if (!transport.free) enterFreeTransport();
    var now = performance.now();
    var ang = pointerAngleAt(e.clientX, e.clientY);
    var dist = Math.hypot(e.clientX - platterGesture.startX, e.clientY - platterGesture.startY);
    var dAng = ang - platterGesture.lastAngle;
    while (dAng > Math.PI) dAng -= Math.PI * 2;
    while (dAng < -Math.PI) dAng += Math.PI * 2;
    var dt = Math.max(0.006, (now - platterGesture.lastT) / 1000);

    // Any real rub overrides hold-brake immediately for a responsive vinyl feel.
    if (dist > PLATTER_DRAG_PX || Math.abs(dAng) > 0.018 || platterGesture.mode === 'drag') {
      if (Math.abs(dAng) > 0.0005 || dist > PLATTER_DRAG_PX) {
        platterGesture.dragged = true;
        platterGesture.mode = 'drag';
        var barDur = getBarDur();
        var naturalOmega = barDur > 0 ? (Math.PI * 2) / barDur : 1;
        var omega = dAng / dt; // rad/s, CW+
        var speedNorm = naturalOmega > 0 ? Math.abs(omega) / naturalOmega : 0;
        // Faster / farther drag → more extreme scrub (nonlinear).
        var speedGain = 1 + Math.min(3.2, Math.pow(speedNorm, 1.15) * 1.15);
        var distGain = 1 + Math.min(2.2, dist / 110);
        var scrubGain = speedGain * distGain;
        var fromMt = transport.musicTime;
        if (barDur > 0) {
          transport.musicTime -= (dAng / (Math.PI * 2)) * barDur * scrubGain;
          triggerHitsBetween(fromMt, transport.musicTime);
          transport.lastMusicTime = transport.musicTime;
        }
        var rate = (-omega / naturalOmega) * speedGain;
        transport.rate = Math.max(PLATTER_MIN_RATE, Math.min(PLATTER_MAX_RATE, rate));
        transport.target = transport.rate;
      }
    }

    platterGesture.lastAngle = ang;
    platterGesture.lastT = now;
    platterGesture.angle = ang;
  }

  function endPlatterGesture(e) {
    if (!platterGesture) return;
    if (e && e.pointerId !== platterGesture.pointerId) return;
    platterGesture = null;
    transport.target = 1;
    transport.easing = true;
  }

  function playBuf(sampleId, when, opts) {
    opts = opts || {};
    var buf = soundBank[sampleId];
    if (!buf || !ctx || !master) return;
    if (typeof buf.getChannelData !== 'function') return;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    var s = sampleById(sampleId);
    var rateMul = opts.rate != null ? opts.rate : 1;
    if (s && s.type === 'text') {
      var mods = randomSayPlayMods(sampleId);
      src.playbackRate.value = mods.playbackRate * rateMul;
      g.gain.value = mods.gain;
    } else {
      src.playbackRate.value = rateMul;
      g.gain.value = playGainForSample(sampleId);
    }
    src.connect(g);
    g.connect(busForSample(sampleId));
    var startAt = Math.max(when, ctx.currentTime);
    try {
      src.start(startAt);
    } catch (e) {
      return;
    }
    if (isSidechainKey(sampleId)) triggerSidechainDuck(startAt);
    if (sampleId === 'kick') noteKickForBurst(startAt);
    activeVoices.push(src);
    src.onended = function () {
      var i = activeVoices.indexOf(src);
      if (i !== -1) activeVoices.splice(i, 1);
    };
  }

  function stopAllVoices() {
    var now = ctx ? ctx.currentTime : 0;
    activeVoices.slice().forEach(function (src) {
      try { src.stop(0); } catch (e) { /* already stopped */ }
    });
    activeVoices = [];
    if (master) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.setValueAtTime(MASTER_GAIN, now + 0.02);
    }
    if (duckGain) {
      duckGain.gain.cancelScheduledValues(now);
      duckGain.gain.setValueAtTime(1, now);
    }
    if (reverbWetGain) {
      var wet = getReverb();
      reverbWetGain.gain.cancelScheduledValues(now);
      reverbWetGain.gain.setValueAtTime(0, now);
      reverbWetGain.gain.setValueAtTime(wet, now + 0.05);
    }
  }

  function scheduleBar(barStart, layerIdx, barDurOverride) {
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    if (!pat) return;
    var barDur = barDurOverride != null ? barDurOverride : getBarDur();
    var human = getHumanize();
    var swing = getSwing();
    var swingDiv = getSwingNoteDiv();
    var swingUnitDur = barDur / swingDiv;
    var swingMaxDelay = swingUnitDur * SWING_MAX_DELAY_FRAC;
    barEvents.push({ start: barStart, layer: layerIdx });
    if (barEvents.length > 64) barEvents.splice(0, barEvents.length - 32);

    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      var n = ring.segments;
      var stepDur = barDur / n;
      var humanMaxDelay = stepDur * MAX_DELAY_FRAC;
      for (var i = 0; i < n; i++) {
        if (!steps[i]) continue;
        var offset = 0;
        if (swing > 0 && stepIsSwingOffbeat(i, n, swingDiv)) offset += swing * swingMaxDelay;
        if (human > 0) offset += human * humanMaxDelay * pseudo01(ring.id, i, layerIdx + 1);
        var cap = swingMaxDelay + humanMaxDelay;
        if (offset > cap) offset = cap;
        var hitAt = barStart + i * stepDur + offset;
        playBuf(steps[i], hitAt);
        noteSegHit(ring.id, i, hitAt);
      }
    });
  }

  function scheduler() {
    if (!playing || !ctx || transport.free) return;
    var end = ctx.currentTime + LOOK_AHEAD;
    while (nextBarTime < end) {
      if (!layers[playCursor] || !layers[playCursor].enabled) {
        var n = nextEnabled(playCursor);
        if (n < 0) {
          pause();
          return;
        }
        playCursor = n;
      }
      // Live Lucky Roll: install next-wheel content just before it is scheduled.
      var barDur = pendingLiveBarDur();
      applyLivePendingForLayer(playCursor, { barStart: nextBarTime });
      scheduleBar(nextBarTime, playCursor, barDur);
      nextBarTime += barDur;
      var nxt = nextEnabled(playCursor);
      playCursor = nxt < 0 ? playCursor : nxt;
    }
    scheduleTimer = setTimeout(scheduler, SCHEDULE_MS);
  }

  function activeLayerAt(time) {
    var best = null;
    for (var i = 0; i < barEvents.length; i++) {
      if (barEvents[i].start <= time) best = barEvents[i];
    }
    return best;
  }

  function clearSegNeedleGlow() {
    segHitFlashes = {};
    Object.keys(segEls).forEach(function (k) {
      var el = segEls[k];
      el.classList.remove('lit', 'near-needle', 'hit-glow');
      el.style.filter = '';
      el.style.stroke = '';
      el.style.strokeWidth = '';
      el.removeAttribute('stroke');
      el.removeAttribute('stroke-width');
    });
    clearHubStrikeGlow();
  }

  var hubHue = 75; // neon lime start
  var hubHueLastT = 0;

  function clearHubStrikeGlow() {
    if (!hubBtn) return;
    hubBtn.classList.remove('strike-lit');
    hubBtn.style.removeProperty('--hub-strike');
    hubBtn.style.removeProperty('--hub-hue');
    hubBtn.style.filter = '';
    hubBtn.style.boxShadow = '';
    hubBtn.style.background = '';
    hubBtn.style.color = '';
    if (hubProducerImg) {
      hubProducerImg.style.transform = '';
      hubProducerImg.style.filter = '';
    }
    var strikeEl = document.getElementById('hubStrike');
    if (strikeEl) strikeEl.style.background = '';
    hubHueLastT = 0;
  }

  function sampleMusicForHub() {
    if (analyser && analyserData) {
      analyser.getByteFrequencyData(analyserData);
    }
    var bass = (typeof bassEnergy === 'function') ? bassEnergy() : 0;
    var vol = (typeof musicVolume === 'function') ? musicVolume() : 0;
    var mid = (typeof midEnergy === 'function') ? midEnergy() : 0;
    return {
      bass: bass,
      vol: vol,
      mid: mid,
      energy: Math.max(bass, vol * 0.9, mid * 0.45)
    };
  }

  function hslNeon(h, s, l, a) {
    var base = 'hsl(' + (Math.round(h) % 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
    if (a == null || a >= 1) return base + ')';
    return base + ' / ' + a + ')';
  }

  /** Advance neon hue from music; returns current music snapshot. */
  function tickHubHue() {
    var music = sampleMusicForHub();
    var now = (ctx && ctx.currentTime != null) ? ctx.currentTime : performance.now() * 0.001;
    if (!hubHueLastT) hubHueLastT = now;
    var dt = Math.max(0, Math.min(0.05, now - hubHueLastT));
    hubHueLastT = now;
    var rate = 18 + music.energy * 140 + music.bass * 90;
    hubHue = (hubHue + rate * dt) % 360;
    return music;
  }

  function setSegNeonBorder(el, strength) {
    if (!el) return;
    var s = Math.max(0, Math.min(1, strength || 0));
    if (s < 0.05) {
      el.style.stroke = 'none';
      el.style.strokeWidth = '0';
      return;
    }
    el.style.stroke = hslNeon(hubHue, 1, 0.62, 0.55 + s * 0.45);
    el.style.strokeWidth = String((2.2 + s * 3.5).toFixed(1));
  }

  function applyHubNeonAndStrike(hitFlash, nearBoost, music) {
    if (!hubBtn || !playing) return;
    music = music || sampleMusicForHub();
    var flash = Math.max(0, Math.min(1, hitFlash || 0));
    var near = Math.max(0, Math.min(1, nearBoost || 0));
    var strike = Math.max(flash, near * 0.55, music.energy * 0.25);
    var lit = 0.52 + music.energy * 0.12 + flash * 0.1;
    var sat = 0.92 + music.energy * 0.08;
    var showFace = !!(hubProducerFaceOn && hubBtn.classList.contains('hub-has-producer'));

    // Neon always stays — producer thumbs are transparent, so color shows through.
    hubBtn.style.background = hslNeon(hubHue, sat, lit);
    // Keep pause glyph one stable color (avoid black/white flicker with lit).
    hubBtn.style.color = '#0a0a12';
    if (hubProducerImg) {
      if (showFace) {
        var pulse = 1 + music.bass * 0.07 + music.vol * 0.05 + flash * 0.05;
        pulse = Math.max(1, Math.min(1.12, pulse));
        hubProducerImg.style.transform = 'translate(-50%, -50%) scale(' + pulse.toFixed(3) + ')';
        hubProducerImg.style.filter = '';
      } else {
        hubProducerImg.style.transform = '';
        hubProducerImg.style.filter = '';
      }
    }
    hubBtn.style.setProperty('--hub-hue', String(Math.round(hubHue)));
    hubBtn.style.boxShadow =
      '0 -6px 22px hsla(' + Math.round(hubHue) + ' 100% 60% / 0.5), ' +
      '0 0 28px hsla(' + Math.round(hubHue) + ' 100% 55% / 0.35)';

    if (strike < 0.04) {
      hubBtn.classList.remove('strike-lit');
      hubBtn.style.removeProperty('--hub-strike');
      return;
    }
    hubBtn.classList.add('strike-lit');
    hubBtn.style.setProperty('--hub-strike', (0.22 + strike * 0.85).toFixed(3));
    var strikeEl = document.getElementById('hubStrike');
    if (strikeEl) {
      strikeEl.style.background =
        'radial-gradient(ellipse 95% 80% at 50% -10%, ' +
        'hsla(' + Math.round(hubHue) + ' 100% 92% / 0.95) 0%, ' +
        'hsla(' + Math.round((hubHue + 40) % 360) + ' 100% 70% / 0.55) 35%, ' +
        'transparent 70%)';
    }
  }

  function sizeFftCanvas() {
    if (!fftCanvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(window.innerWidth * dpr));
    var h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (fftCanvas.width !== w || fftCanvas.height !== h) {
      fftCanvas.width = w;
      fftCanvas.height = h;
    }
  }

  /** Morph rings center on the drum; drawn on full viewport (no crop box). */
  function getMorphLayout(dpr) {
    var wrapRect = circleWrap
      ? circleWrap.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    var scale = dpr || Math.min(window.devicePixelRatio || 1, 2);
    return {
      cx: (wrapRect.left + wrapRect.width * 0.5) * scale,
      cy: (wrapRect.top + wrapRect.height * 0.5) * scale,
      circleR: (Math.min(wrapRect.width, wrapRect.height) * 0.5) * scale
    };
  }

  function sampleSpectrumRing(pointCount) {
    var bins = analyserData.length;
    var useBins = Math.min(64, Math.floor(bins * 0.45));
    if (!fftSmooth || fftSmooth.length < pointCount) fftSmooth = new Float32Array(FFT_POINTS_MAX);
    var out = fftSmooth;
    var i;
    for (i = 0; i < pointCount; i++) {
      var t = i / pointCount;
      var bi = Math.min(useBins - 1, Math.floor(t * useBins));
      var v = (analyserData[bi] || 0) / 255;
      var target = Math.pow(v, 0.95);
      out[i] = out[i] * 0.35 + target * 0.65;
    }
    return out;
  }

  function bassEnergy() {
    var n = Math.min(6, analyserData.length);
    var sum = 0;
    var i;
    for (i = 1; i < n; i++) sum += analyserData[i];
    return Math.pow(sum / ((n - 1) * 255), 1.1);
  }

  function midEnergy() {
    var start = 8;
    var end = Math.min(28, analyserData.length);
    if (end <= start) return 0;
    var sum = 0;
    var i;
    for (i = start; i < end; i++) sum += analyserData[i];
    return sum / ((end - start) * 255);
  }

  /** Overall music loudness 0–1 from spectrum (drives halo opacity). */
  function musicVolume() {
    if (!analyserData || !analyserData.length) return 0;
    var n = Math.min(analyserData.length, 96);
    var sum = 0;
    var i;
    for (i = 0; i < n; i++) sum += analyserData[i];
    var avg = sum / (n * 255);
    // Soft floor so quiet passages dim, loud passages open up
    return Math.max(0, Math.min(1, Math.pow(avg, 0.8)));
  }

  /** Closed Catmull-Rom → cubic beziers (soft morph outline). */
  function traceSmoothClosedPath(c2d, verts, tension) {
    var n = verts.length;
    if (n < 3) return;
    var t = tension == null ? 0.85 : tension;
    c2d.moveTo(verts[0].x, verts[0].y);
    var i;
    for (i = 0; i < n; i++) {
      var p0 = verts[(i - 1 + n) % n];
      var p1 = verts[i];
      var p2 = verts[(i + 1) % n];
      var p3 = verts[(i + 2) % n];
      c2d.bezierCurveTo(
        p1.x + (p2.x - p0.x) * (t / 6),
        p1.y + (p2.y - p0.y) * (t / 6),
        p2.x - (p3.x - p1.x) * (t / 6),
        p2.y - (p3.y - p1.y) * (t / 6),
        p2.x,
        p2.y
      );
    }
    c2d.closePath();
  }

  function buildMorphVerts(cx, cy, baseR, amp, ring, points, spinOff, bass, time) {
    var verts = [];
    var i;
    for (i = 0; i < points; i++) {
      var ang = -Math.PI / 2 + (i / points) * Math.PI * 2 + spinOff;
      var prev = ring[(i - 1 + points) % points];
      var next = ring[(i + 1) % points];
      var blend = ring[i] * 0.5 + prev * 0.25 + next * 0.25;
      var breathe = 0.02 * bass * Math.sin(time * 4.2 + i * 0.7);
      var r = baseR + blend * amp * (0.75 + bass * 0.55) + breathe * amp;
      verts.push({
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r
      });
    }
    return verts;
  }

  /** Soft morph halo rings that slowly push out; new inner replaces fading outer. */
  function drawFftRing() {
    if (!fftCtx2d || !fftCanvas || !analyser || !analyserData) return;
    sizeFftCanvas();
    analyser.getByteFrequencyData(analyserData);
    if (!fftParticles.length) initFftParticles();

    var time = (ctx && ctx.currentTime) ? ctx.currentTime : performance.now() * 0.001;
    var aes = getVfxAesthetics(time);
    var bass = bassEnergy();
    var mid = midEnergy();
    var vol = musicVolume();

    if (stageEl) stageEl.classList.add('is-playing');
    drawStarField(bass, mid, aes, time);

    var w = fftCanvas.width;
    var h = fftCanvas.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var layout = getMorphLayout(dpr);
    var cx = layout.cx;
    var cy = layout.cy;
    var circleR = Math.max(40, layout.circleR);
    var points = Math.max(14, Math.min(FFT_POINTS_MAX, aes.facets + 2));
    var ring = sampleSpectrumRing(points);
    var avg = 0;
    var i;
    for (i = 0; i < points; i++) avg += ring[i];
    avg /= points;

    var coreRgb = hslToRgb(aes.hue2, Math.min(0.5, aes.sat * 0.4), 0.9);
    var midRgb = hslToRgb(aes.hue, Math.min(0.65, aes.sat * 0.65), 0.74);
    var partRgb = hslToRgb(aes.hue2, 0.35, 0.92);

    var fade = Math.max(0.45, Math.min(0.88, aes.ringTrail));
    fftCtx2d.fillStyle = 'rgba(0, 0, 0, ' + fade + ')';
    fftCtx2d.globalCompositeOperation = 'destination-out';
    fftCtx2d.fillRect(0, 0, w, h);
    fftCtx2d.globalCompositeOperation = 'lighter';
    fftCtx2d.save();
    fftCtx2d.lineJoin = 'round';
    fftCtx2d.lineCap = 'round';

    var pulse = 1 + bass * 0.28 + avg * 0.14 + vol * 0.18 + 0.04 * Math.sin(time * 2.8);
    var bright = (0.06 + vol * 1.25) * (0.55 + bass * 0.7 + mid * 0.2 + aes.lit * 0.08);
    var blurScale = (5.5 + aes.strokeWide * 3.2 + bass * 12 + vol * 6) * (dpr > 1.4 ? 1.12 : 1);
    var spinSign = aes.ringSpin === 0 ? 0 : (aes.ringSpin > 0 ? 1 : -1);
    var spinOff = time * aes.ringSpinSpeed * 40 * spinSign;

    // Soft FFT wash under the expanding rings — wide inner glow with blurred edges
    var washBase = circleR * 0.94 * pulse;
    var washAmp = circleR * (0.08 + aes.morphScale * 0.08) * (0.7 + avg * 0.5);
    var washVerts = buildMorphVerts(cx, cy, washBase, washAmp, ring, points, spinOff, bass, time);
    fftCtx2d.shadowColor = rgbaStr(midRgb, Math.min(0.85, 0.55 * bright * (0.7 + bass * 0.6)));
    fftCtx2d.shadowBlur = blurScale * (2.4 + bass * 1.2);
    fftCtx2d.beginPath();
    traceSmoothClosedPath(fftCtx2d, washVerts, 1.0);
    fftCtx2d.fillStyle = rgbaStr(midRgb, Math.min(0.28, 0.12 * bright * (0.7 + bass * 0.8 + vol * 0.4)));
    fftCtx2d.fill();
    // Extra soft rim so the edge dissolves
    fftCtx2d.shadowBlur = blurScale * (3.2 + bass * 1.4);
    fftCtx2d.strokeStyle = rgbaStr(midRgb, Math.min(0.5, 0.28 * bright * (0.8 + bass)));
    fftCtx2d.lineWidth = 10 + bass * 14 + vol * 6;
    fftCtx2d.beginPath();
    traceSmoothClosedPath(fftCtx2d, washVerts, 1.0);
    fftCtx2d.stroke();
    fftCtx2d.shadowBlur = 0;

    // Slow morph rings: outer fades away, new one emerges inside (~2–3 at once)
    maybeSpawnBaseHaloWing(circleR, aes);
    drawBaseHaloWings(
      fftCtx2d, cx, cy, circleR, ring, points, spinOff,
      bass, vol, bright, blurScale, time, aes
    );

    // Sparse motes near the drum edge
    var partN = Math.max(2, Math.min(FFT_PARTICLE_COUNT, aes.ringPartCount));
    var mainBase = circleR * 0.94 * pulse;
    for (i = 0; i < partN; i++) {
      var p = fftParticles[i];
      p.ang += p.spin * aes.partDirFlip * (0.002 + bass * 0.012 + aes.ringSpinSpeed * 7);
      var sample = ring[i % points];
      var orbit = Math.max(0.9, p.orbit * 0.95);
      var pr = mainBase * orbit * (1 + sample * 0.12 + bass * 0.04 * Math.sin(time * 4 + p.phase));
      var px = cx + Math.cos(p.ang) * pr;
      var py = cy + Math.sin(p.ang) * pr;
      var sz = p.size * aes.particleSize * (0.7 + bass * 0.75);
      fftCtx2d.fillStyle = rgbaStr(partRgb, (0.08 + vol * 0.35) * (0.7 + bass * 0.5));
      fftCtx2d.beginPath();
      fftCtx2d.arc(px, py, Math.max(0.55, sz), 0, Math.PI * 2);
      fftCtx2d.fill();
    }

    // Kick-synced neon energy ring (occasional, varied)
    if (ctx && pendingKickBursts.length) {
      var nowT = ctx.currentTime;
      while (pendingKickBursts.length && pendingKickBursts[0] <= nowT + 0.03) {
        pendingKickBursts.shift();
        spawnEnergyBurst(cx, cy, circleR, aes, bass, vol);
      }
    }
    drawEnergyBursts(fftCtx2d, bright);

    fftCtx2d.shadowBlur = 0;
    fftCtx2d.restore();
    fftCtx2d.globalCompositeOperation = 'source-over';
  }

  function currentDiscAngleDeg() {
    if (!ctx) return 0;
    return -getTransportPhase(ctx.currentTime) * 360;
  }

  function cancelDiscRewind() {
    discRewind = null;
  }

  function startDiscRewind(fromDeg) {
    // Normalize into (-360, 0] — play spins CCW (negative degrees).
    var ang = fromDeg % 360;
    if (ang > 0) ang -= 360;
    if (ang === 0) {
      discRewind = null;
      if (discGroupEl) discGroupEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
      return 0;
    }
    var durMs = 160 + (Math.abs(ang) / 360) * 320;
    discRewind = { fromDeg: ang, t0: performance.now(), durMs: durMs };
    return durMs / 1000;
  }

  /** Vinyl-style DJ scratch / rewind whoosh. */
  function playDjSwiftSound(durSec) {
    if (!ctx || !master) return;
    durSec = Math.max(0.14, Math.min(0.55, durSec || 0.28));
    var t0 = ctx.currentTime + 0.02;
    var sr = ctx.sampleRate;
    var len = Math.max(1, Math.ceil(sr * durSec));
    var buf = ctx.createBuffer(1, len, sr);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) {
      var env = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * env);
    }

    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(3.2, t0);
    src.playbackRate.exponentialRampToValueAtTime(0.28, t0 + durSec);

    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    bp.frequency.setValueAtTime(3200, t0);
    bp.frequency.exponentialRampToValueAtTime(280, t0 + durSec);

    var tone = ctx.createOscillator();
    tone.type = 'sawtooth';
    tone.frequency.setValueAtTime(420, t0);
    tone.frequency.exponentialRampToValueAtTime(70, t0 + durSec);

    var toneF = ctx.createBiquadFilter();
    toneF.type = 'lowpass';
    toneF.frequency.setValueAtTime(1800, t0);
    toneF.frequency.exponentialRampToValueAtTime(400, t0 + durSec);

    var gNoise = ctx.createGain();
    var gTone = ctx.createGain();
    var gOut = ctx.createGain();
    gNoise.gain.setValueAtTime(0.0001, t0);
    gNoise.gain.exponentialRampToValueAtTime(0.28, t0 + 0.015);
    gNoise.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
    gTone.gain.setValueAtTime(0.0001, t0);
    gTone.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
    gTone.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
    gOut.gain.value = 1;

    src.connect(bp);
    bp.connect(gNoise);
    tone.connect(toneF);
    toneF.connect(gTone);
    gNoise.connect(gOut);
    gTone.connect(gOut);
    gOut.connect(master);

    src.start(t0);
    src.stop(t0 + durSec + 0.03);
    tone.start(t0);
    tone.stop(t0 + durSec + 0.03);
  }

  function tickDiscRewind() {
    if (!discGroupEl || !discRewind) return false;
    var u = (performance.now() - discRewind.t0) / discRewind.durMs;
    if (u >= 1) {
      discGroupEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
      discRewind = null;
      return false;
    }
    // Ease-out cubic — fast rewind that settles on home.
    var ease = 1 - Math.pow(1 - u, 3);
    var ang = discRewind.fromDeg * (1 - ease);
    discGroupEl.setAttribute('transform', 'rotate(' + ang + ' ' + CX + ' ' + CY + ')');
    return true;
  }

  function updatePlayhead() {
    if (!discGroupEl) {
      playheadRaf = requestAnimationFrame(updatePlayhead);
      return;
    }
    if (!playing || !ctx) {
      if (!tickDiscRewind()) {
        discGroupEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
      }
      if (circleWrap) circleWrap.classList.remove('is-playing');
      clearSegNeedleGlow();
      clearFftRing();
      clearStarField();
      shownPlayLayer = -1;
      playheadRaf = requestAnimationFrame(updatePlayhead);
      return;
    }

    if (circleWrap) circleWrap.classList.add('is-playing');
    if (visualFxOn) {
      drawFftRing();
    } else {
      clearFftRing();
      clearStarField();
      if (stageEl) stageEl.classList.remove('is-playing');
    }

    var now = ctx.currentTime;
    tickLiveRedraw(now);
    var phase;
    if (transport.free) {
      phase = tickFreeTransport(now);
    } else {
      transport.musicTime = Math.max(0, now - barOrigin);
      transport.lastMusicTime = transport.musicTime;
      var ev = activeLayerAt(now);
      if (ev && ev.layer !== shownPlayLayer) {
        shownPlayLayer = ev.layer;
        if (!viewLocked) setViewLayer(ev.layer, { fromPlayhead: true });
      }
      phase = getTransportPhase(now);
    }
    // Disc spins under a fixed needle (CCW so current beat stays at 12 o'clock).
    discGroupEl.setAttribute('transform', 'rotate(' + (-phase * 360) + ' ' + CX + ' ' + CY + ')');

    var swingAmt = getSwing();
    var swingDiv = getSwingNoteDiv();
    var needleAng = START_ANGLE + phase * Math.PI * 2;
    var glowSpan = (50 * Math.PI) / 180;
    var HIT_GLOW_SEC = 0.28;
    var hubHitFlash = 0;
    var hubNearBoost = 0;
    var music = tickHubHue();

    RINGS.forEach(function (ring) {
      var n = ring.segments;
      var angles = segmentAngles(n, swingAmt, swingDiv);
      var i;
      for (i = 0; i < n; i++) {
        var key = ring.id + ':' + i;
        var el = segEls[key];
        if (!el) continue;
        var mid = angles.starts[i] + angles.widths[i] * 0.5;
        var delta = mid - needleAng;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        var proxim = 1 - Math.min(1, Math.abs(delta) / glowSpan);
        var filled = !!(pattern && pattern[ring.id][i]);

        // Glow only when this painted segment actually plays (no pre-glow)
        var hitAt = segHitFlashes[key];
        var hitFlash = 0;
        if (hitAt != null && filled) {
          var age = now - hitAt;
          if (age >= 0 && age < HIT_GLOW_SEC) {
            hitFlash = 1 - age / HIT_GLOW_SEC;
            hitFlash = hitFlash * hitFlash;
          } else if (age >= HIT_GLOW_SEC) {
            delete segHitFlashes[key];
          }
        }

        if (hitFlash > hubHitFlash) hubHitFlash = hitFlash;
        if (filled && proxim > hubNearBoost) hubNearBoost = proxim;

        if (hitFlash > 0.02) {
          el.classList.add('lit', 'hit-glow');
          el.classList.remove('near-needle');
          var glowPx = 4 + hitFlash * 14;
          var glowA = 0.35 + hitFlash * 0.55;
          el.style.filter =
            'brightness(' + (1.45 + hitFlash * 1.1).toFixed(3) + ') ' +
            'drop-shadow(0 0 ' + glowPx.toFixed(1) + 'px ' + hslNeon(hubHue, 1, 0.7, glowA) + ') ' +
            'drop-shadow(0 0 ' + (glowPx * 1.8).toFixed(1) + 'px ' + hslNeon(hubHue, 1, 0.6, glowA * 0.55) + ')';
          setSegNeonBorder(el, 0.75 + hitFlash * 0.25);
        } else {
          el.classList.remove('near-needle', 'lit', 'hit-glow');
          el.style.filter = '';
          setSegNeonBorder(el, 0);
        }
      }
    });

    applyHubNeonAndStrike(hubHitFlash, hubNearBoost, music);
    playheadRaf = requestAnimationFrame(updatePlayhead);
  }

  async function play() {
    var start = resolveStart(viewLayer);
    if (start < 0) return;
    await ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    cancelDiscRewind();
    playing = true;
    hubBtn.classList.add('playing');
    hubHue = 75;
    hubHueLastT = 0;
    hubIcon.innerHTML = ICON_PAUSE;
    playStartedAt = performance.now();
    clearHubPauseFade();
    scheduleHubPauseFade();
    playCursor = start;
    playOriginLayer = start;
    barEvents = [];
    shownPlayLayer = -1;
    viewLocked = false;
    platterGesture = null;
    transport.free = false;
    transport.rate = 1;
    transport.target = 1;
    transport.musicTime = 0;
    transport.lastMusicTime = 0;
    transport.easing = false;
    clearScrubHitCache();
    if (circleWrap) circleWrap.classList.remove('is-scratching');
    var t = ctx.currentTime + 0.06;
    barOrigin = t;
    nextBarTime = t;
    setViewLayer(start, { fromPlayhead: true });
    scheduler();
  }

  function pause() {
    var fromDeg = currentDiscAngleDeg();
    playing = false;
    viewLocked = false;
    hubBtn.classList.remove('playing');
    clearHubStrikeGlow();
    clearHubPauseFade();
    hubIcon.innerHTML = ICON_PLAY;
    playStartedAt = 0;
    platterGesture = null;
    transport.free = false;
    transport.rate = 1;
    transport.target = 1;
    transport.easing = false;
    if (circleWrap) circleWrap.classList.remove('is-scratching');
    stopScheduler();
    // Apply any queued Live roll so the stopped view matches what was coming next.
    flushLivePendingRoll();
    stopAllVoices();
    barEvents = [];
    shownPlayLayer = -1;
    clearScrubHitCache();
    syncLayerUi();
    var rewindSec = startDiscRewind(fromDeg);
    if (rewindSec > 0) playDjSwiftSound(rewindSec);
  }

  async function togglePlay() {
    if (playing) pause();
    else await play();
  }

  function layerHasHits(layerIdx) {
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    if (!pat) return false;
    for (var r = 0; r < RINGS.length; r++) {
      var steps = pat[RINGS[r].id];
      if (!steps) continue;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i]) return true;
      }
    }
    return false;
  }

  /** Words painted on this wheel, in first-appearance order (outer→inner, then step). */
  function wordsUsedInLayer(layerIdx) {
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    var seen = {};
    var words = [];
    if (!pat) return words;
    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      for (var i = 0; i < steps.length; i++) {
        var id = steps[i];
        if (!id || seen[id]) continue;
        var s = sampleById(id);
        if (!s || s.type !== 'text') continue;
        seen[id] = true;
        var w = String(sayTexts[id] || '').trim();
        if (w) words.push(w);
      }
    });
    return words;
  }

  function sanitizeFilenamePart(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24);
  }

  /** Default download stem: ProducerName_120bpm */
  function exportBasename() {
    var p = producerById(currentProducerPickId || matchLuckyProducerId()) || producerById('custom');
    var name = sanitizeFilenamePart(p && p.name) || 'custom';
    return name + '_' + getBpm() + 'bpm';
  }

  function wavFilenameForViewLayer() {
    return exportBasename() + '.wav';
  }

  function midiFilenameForViewLayer() {
    return exportBasename() + '.mid';
  }

  var GM_DRUM_NOTES = {
    kick: 36,
    snare: 38,
    clap: 39,
    hatClosed: 42,
    hatOpen: 46,
    ride: 51,
    cowbell: 56,
    tom: 45
  };

  function midiNoteForSampleId(id) {
    var s = sampleById(id);
    if (!s) return null;
    if (s.type === 'maker') {
      var key = s.maker === 'hat' ? (s.open ? 'hatOpen' : 'hatClosed') : s.maker;
      return { ch: 9, note: GM_DRUM_NOTES[key] != null ? GM_DRUM_NOTES[key] : 37 };
    }
    // Words / samples → melodic channel so they still export
    if (s.type === 'text') {
      var ti = parseInt(String(s.id).replace(/\D/g, ''), 10) || 1;
      return { ch: 0, note: 59 + Math.max(1, Math.min(9, ti)) };
    }
    var si = parseInt(String(s.id).replace(/\D/g, ''), 10) || 1;
    return { ch: 0, note: 71 + Math.max(1, Math.min(9, si)) };
  }

  function midiWriteVarLen(n) {
    var buf = [n & 0x7f];
    n >>= 7;
    while (n > 0) {
      buf.unshift((n & 0x7f) | 0x80);
      n >>= 7;
    }
    return buf;
  }

  function midiConcat(chunks) {
    var len = 0;
    var i;
    for (i = 0; i < chunks.length; i++) len += chunks[i].length;
    var out = new Uint8Array(len);
    var o = 0;
    for (i = 0; i < chunks.length; i++) {
      out.set(chunks[i], o);
      o += chunks[i].length;
    }
    return out;
  }

  function midiU16(n) {
    return [(n >> 8) & 0xff, n & 0xff];
  }

  function midiU32(n) {
    return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  function buildViewWheelMidiBlob() {
    var pat = layers[viewLayer] && layers[viewLayer].pattern;
    if (!pat) return null;
    var TPQ = 480;
    var ticksPerBar = TPQ * 4;
    var bpm = getBpm();
    var events = [];

    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      var n = steps.length;
      var i;
      for (i = 0; i < n; i++) {
        var id = steps[i];
        if (!id) continue;
        var map = midiNoteForSampleId(id);
        if (!map || map.note == null) continue;
        var tick = Math.round((i / n) * ticksPerBar);
        var dur = Math.max(1, Math.round(ticksPerBar / n * 0.85));
        events.push({ tick: tick, type: 'on', ch: map.ch, note: map.note, vel: 100 });
        events.push({ tick: tick + dur, type: 'off', ch: map.ch, note: map.note, vel: 0 });
      }
    });

    events.sort(function (a, b) {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === b.type) return 0;
      return a.type === 'off' ? -1 : 1;
    });

    var track = [];
    // Tempo meta
    var usPerBeat = Math.round(60000000 / Math.max(1, bpm));
    track.push.apply(track, midiWriteVarLen(0));
    track.push(0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff);

    var last = 0;
    var ei;
    for (ei = 0; ei < events.length; ei++) {
      var ev = events[ei];
      var delta = Math.max(0, ev.tick - last);
      track.push.apply(track, midiWriteVarLen(delta));
      if (ev.type === 'on') track.push(0x90 | (ev.ch & 0x0f), ev.note & 0x7f, ev.vel & 0x7f);
      else track.push(0x80 | (ev.ch & 0x0f), ev.note & 0x7f, 0x40);
      last = ev.tick;
    }
    // End of track
    track.push.apply(track, midiWriteVarLen(0));
    track.push(0xff, 0x2f, 0x00);

    var trackBytes = new Uint8Array(track);
    var header = midiConcat([
      new Uint8Array([0x4d, 0x54, 0x68, 0x64]),
      new Uint8Array(midiU32(6)),
      new Uint8Array(midiU16(0)), // format 0
      new Uint8Array(midiU16(1)), // one track
      new Uint8Array(midiU16(TPQ))
    ]);
    var trackChunk = midiConcat([
      new Uint8Array([0x4d, 0x54, 0x72, 0x6b]),
      new Uint8Array(midiU32(trackBytes.length)),
      trackBytes
    ]);
    return new Blob([midiConcat([header, trackChunk])], { type: 'audio/midi' });
  }

  function saveViewWheelMidi() {
    if (!layerHasHits(viewLayer)) {
      alert('This wheel has no hits to save.');
      return;
    }
    try {
      var blob = buildViewWheelMidiBlob();
      if (!blob) {
        alert('Could not save MIDI.');
        return;
      }
      downloadBlob(blob, midiFilenameForViewLayer());
    } catch (err) {
      console.error(err);
      alert('Could not save MIDI.');
    }
  }

  function copyBufferToContext(srcBuffer, dstCtx) {
    var numCh = srcBuffer.numberOfChannels;
    var len = srcBuffer.length;
    var sr = srcBuffer.sampleRate;
    var dst = dstCtx.createBuffer(numCh, len, sr);
    for (var ch = 0; ch < numCh; ch++) {
      dst.copyToChannel(srcBuffer.getChannelData(ch), ch, 0);
    }
    return dst;
  }

  function encodeWavFromBuffer(buffer) {
    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var numFrames = buffer.length;
    var bytesPerSample = 2;
    var blockAlign = numChannels * bytesPerSample;
    var dataSize = numFrames * blockAlign;
    var arrayBuffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(arrayBuffer);
    function writeString(offset, text) {
      for (var i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    }
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    var offset = 44;
    for (var i = 0; i < numFrames; i++) {
      for (var ch = 0; ch < numChannels; ch++) {
        var s = buffer.getChannelData(ch)[i];
        s = Math.max(-1, Math.min(1, s));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function escapeCodeToken(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  function unescapeCodeToken(s) {
    var out = '';
    var i;
    for (i = 0; i < s.length; i++) {
      if (s[i] === '\\' && i + 1 < s.length) {
        var n = s[i + 1];
        if (n === 'n') { out += '\n'; i += 1; continue; }
        if (n === '|' || n === '\\') { out += n; i += 1; continue; }
      }
      out += s[i];
    }
    return out;
  }

  /** Serialize full project to pasteable Circle Beat code. */
  function encodeProjectCode() {
    var lines = [];
    lines.push('CIRCLEBEAT 1');
    lines.push('BPM ' + Math.round(getBpm()));
    lines.push('HUMAN ' + Math.round(getHumanize() * 100));
    lines.push('SWING ' + Math.round(getSwing() * 100));
    lines.push('SWINGTO ' + getSwingNoteDiv());
    lines.push('REVERB ' + Math.round(getReverb() * 100));
    lines.push('REVDUR ' + Math.round((parseFloat(reverbDurEl.value) || 50)));
    lines.push('STEREO ' + Math.round(getStereo()));
    lines.push('VIEW ' + viewLayer);
    lines.push('PAINT ' + paintSample);
    lines.push(
      'LUCKY ' +
      Math.round(readSliderNumber(luckyEuclidDensEl, 32)) + ' ' +
      Math.round(readSliderNumber(luckyEuclidGoldenEl, 25)) + ' ' +
      Math.round(readSliderNumber(luckySkipEl, 27)) + ' ' +
      Math.round(readSliderNumber(luckySoundsEl, 7)) + ' ' +
      Math.round(readSliderNumber(luckyReuseEl, 94)) + ' ' +
      Math.round(readSliderNumber(luckyConsistencyEl, 100)) + ' ' +
      Math.round(readSliderNumber(luckyWordsVolEl, 34)) + ' ' +
      Math.round(readSliderNumber(luckyHumanityEl, 27)) + ' ' +
      Math.round(readSliderNumber(luckySpeedEl, 35))
    );

    SAMPLES.forEach(function (s) {
      if (s.type !== 'text') return;
      var text = String(sayTexts[s.id] || '').trim();
      if (text) lines.push('SAY ' + s.id + '|' + escapeCodeToken(text));
      var vp = sayVoiceParams[s.id];
      if (vp && vp.voiceSeed) lines.push('VOICE ' + s.id + '|' + escapeCodeToken(String(vp.voiceSeed)));
    });

    SAMPLES.forEach(function (s) {
      if (s.type !== 'sample') return;
      var name = String(sampleNames[s.id] || '').trim();
      if (name) lines.push('FILE ' + s.id + '|' + escapeCodeToken(name));
    });

    makerIds.forEach(function (id) {
      var params = makerSoundParams[id] || MAKER_DEFAULTS[id];
      if (!params) return;
      var parts = [];
      Object.keys(params).forEach(function (key) {
        var v = params[key];
        if (typeof v === 'boolean') parts.push(key + '=' + (v ? 1 : 0));
        else if (typeof v === 'number' && Number.isFinite(v)) parts.push(key + '=' + v);
        else if (v != null) parts.push(key + '=' + escapeCodeToken(String(v)));
      });
      if (parts.length) lines.push('MAKER ' + id + ' ' + parts.join(' '));
    });

    layers.forEach(function (layer, idx) {
      lines.push('WHEEL ' + idx + ' ' + (layer.enabled ? 1 : 0));
      RINGS.forEach(function (ring) {
        var steps = (layer.pattern && layer.pattern[ring.id]) || [];
        var cells = [];
        var i;
        for (i = 0; i < ring.segments; i++) {
          cells.push(steps[i] ? steps[i] : '_');
        }
        lines.push('RING ' + ring.id + ' ' + cells.join(','));
      });
    });

    lines.push('END');
    return lines.join('\n');
  }

  function parseMakerParamValue(raw) {
    if (raw === '1' || raw === '0') {
      // keep as number; bools restored by known keys below
    }
    var n = parseFloat(raw);
    if (String(n) === raw || /^-?\d+(\.\d+)?$/.test(raw)) return n;
    return unescapeCodeToken(raw);
  }

  async function applyProjectCode(text) {
    var raw = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!raw) throw new Error('Empty code');
    var lines = raw.split(/\r?\n/);
    if (!/^CIRCLEBEAT\b/i.test(lines[0] || '')) {
      throw new Error('Not a Circle Beat code (missing CIRCLEBEAT header).');
    }

    var nextLayers = [];
    var i;
    for (i = 0; i < MAX_CIRCLES; i++) {
      nextLayers.push({ enabled: false, pattern: emptyPattern() });
    }
    var nextSays = {};
    var nextVoices = {};
    var nextFiles = {};
    var nextMakers = {};
    var meta = {
      bpm: null, human: null, swing: null, swingTo: null,
      reverb: null, revDur: null, stereo: null,
      view: 0, paint: 'say1', lucky: null
    };
    var curWheel = -1;

    for (i = 1; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line || line === 'END') continue;
      var sp = line.indexOf(' ');
      var tag = (sp < 0 ? line : line.slice(0, sp)).toUpperCase();
      var rest = sp < 0 ? '' : line.slice(sp + 1).trim();

      if (tag === 'BPM') meta.bpm = parseInt(rest, 10);
      else if (tag === 'HUMAN') meta.human = parseInt(rest, 10);
      else if (tag === 'SWING') meta.swing = parseInt(rest, 10);
      else if (tag === 'SWINGTO') meta.swingTo = parseInt(rest, 10);
      else if (tag === 'REVERB') meta.reverb = parseInt(rest, 10);
      else if (tag === 'REVDUR') meta.revDur = parseInt(rest, 10);
      else if (tag === 'STEREO') meta.stereo = parseInt(rest, 10);
      else if (tag === 'VIEW') meta.view = parseInt(rest, 10) || 0;
      else if (tag === 'PAINT') meta.paint = rest || 'say1';
      else if (tag === 'LUCKY') {
        var lp = rest.split(/\s+/).map(function (x) { return parseInt(x, 10); });
        meta.lucky = lp;
      } else if (tag === 'SAY') {
        var pipe = rest.indexOf('|');
        if (pipe > 0) nextSays[rest.slice(0, pipe)] = unescapeCodeToken(rest.slice(pipe + 1));
      } else if (tag === 'VOICE') {
        var vp = rest.indexOf('|');
        if (vp > 0) nextVoices[rest.slice(0, vp)] = unescapeCodeToken(rest.slice(vp + 1));
      } else if (tag === 'FILE') {
        var fp = rest.indexOf('|');
        if (fp > 0) nextFiles[rest.slice(0, fp)] = unescapeCodeToken(rest.slice(fp + 1));
      } else if (tag === 'MAKER') {
        var msp = rest.indexOf(' ');
        if (msp > 0) {
          var mid = rest.slice(0, msp);
          var obj = Object.assign({}, MAKER_DEFAULTS[mid] || {});
          rest.slice(msp + 1).split(/\s+/).forEach(function (pair) {
            var eq = pair.indexOf('=');
            if (eq < 1) return;
            var k = pair.slice(0, eq);
            var rawV = pair.slice(eq + 1);
            var val = parseMakerParamValue(rawV);
            if (MAKER_BOOLS[mid]) {
              var boolMeta = MAKER_BOOLS[mid].filter(function (m) {
                return m.key === k && m.type === 'bool';
              })[0];
              if (boolMeta) val = !!Number(rawV);
            }
            obj[k] = val;
          });
          nextMakers[mid] = obj;
        }
      } else if (tag === 'WHEEL') {
        var wp = rest.split(/\s+/);
        curWheel = parseInt(wp[0], 10);
        if (curWheel >= 0 && curWheel < MAX_CIRCLES) {
          nextLayers[curWheel].enabled = wp[1] === '1';
        }
      } else if (tag === 'RING' && curWheel >= 0 && curWheel < MAX_CIRCLES) {
        var rsp = rest.indexOf(' ');
        if (rsp > 0) {
          var rid = rest.slice(0, rsp);
          var cells = rest.slice(rsp + 1).split(',');
          var ring = null;
          RINGS.forEach(function (r) { if (r.id === rid) ring = r; });
          if (ring) {
            var arr = Array(ring.segments).fill(null);
            var c;
            for (c = 0; c < ring.segments && c < cells.length; c++) {
              var cell = cells[c];
              arr[c] = (!cell || cell === '_') ? null : cell;
            }
            nextLayers[curWheel].pattern[rid] = arr;
          }
        }
      }
    }

    if (playing) pause();

    layers = nextLayers;
    if (!layers.some(function (l) { return l.enabled; })) {
      layers[0].enabled = true;
    }

    SAMPLES.forEach(function (s) {
      if (s.type === 'text') {
        sayTexts[s.id] = nextSays[s.id] != null ? nextSays[s.id] : '';
        if (nextVoices[s.id]) {
          sayVoiceParams[s.id] = {
            engine: 'sam',
            voiceSeed: nextVoices[s.id],
            pitchVar: 0,
            volVar: 0
          };
        }
        delete soundBank[s.id];
      }
      if (s.type === 'sample') {
        sampleNames[s.id] = nextFiles[s.id] != null ? nextFiles[s.id] : '';
        // Sample audio is not embedded in code — clear buffers so user can reload files.
        delete soundBank[s.id];
      }
    });

    Object.keys(nextMakers).forEach(function (id) {
      makerSoundParams[id] = nextMakers[id];
      if (id === 'kick' || id === 'snare') enforceCoreDrumEnergyFloor(id, makerSoundParams[id]);
    });

    if (meta.bpm != null && Number.isFinite(meta.bpm)) {
      bpmEl.value = String(Math.max(50, Math.min(130, meta.bpm)));
      bpmVal.textContent = String(getBpm());
    }
    if (meta.human != null && Number.isFinite(meta.human)) {
      humanEl.value = String(Math.max(0, Math.min(100, meta.human)));
      humanVal.textContent = Math.round(getHumanize() * 100) + '%';
    }
    if (meta.swing != null && Number.isFinite(meta.swing)) {
      swingEl.value = String(Math.max(0, Math.min(100, meta.swing)));
      swingVal.textContent = Math.round(getSwing() * 100) + '%';
    }
    if (swingNoteEl && meta.swingTo != null && Number.isFinite(meta.swingTo)) {
      swingNoteEl.value = String(meta.swingTo);
    }
    if (meta.reverb != null && Number.isFinite(meta.reverb)) {
      reverbEl.value = String(Math.max(0, Math.min(100, meta.reverb)));
      reverbVal.textContent = Math.round(getReverb() * 100) + '%';
    }
    if (meta.revDur != null && Number.isFinite(meta.revDur) && reverbDurEl) {
      reverbDurEl.value = String(Math.max(0, Math.min(100, meta.revDur)));
      if (reverbDurVal) {
        reverbDurVal.textContent = getReverbDurationSec().toFixed(2) + ' s';
      }
    }
    if (meta.stereo != null && Number.isFinite(meta.stereo) && stereoEl) {
      stereoEl.value = String(Math.max(0, Math.min(100, meta.stereo)));
      stereoVal.textContent = Math.round(getStereo()) + '%';
    }
    applySpaceSettings();
    updateReverbIR();

    if (meta.lucky && meta.lucky.length >= 9) {
      if (luckyEuclidDensEl) luckyEuclidDensEl.value = String(meta.lucky[0]);
      if (luckyEuclidGoldenEl) luckyEuclidGoldenEl.value = String(meta.lucky[1]);
      if (luckySkipEl) luckySkipEl.value = String(meta.lucky[2]);
      if (luckySoundsEl) luckySoundsEl.value = String(meta.lucky[3]);
      if (luckyReuseEl) luckyReuseEl.value = String(meta.lucky[4]);
      if (luckyConsistencyEl) luckyConsistencyEl.value = String(meta.lucky[5]);
      if (luckyWordsVolEl) luckyWordsVolEl.value = String(meta.lucky[6]);
      if (luckyHumanityEl) luckyHumanityEl.value = String(meta.lucky[7]);
      if (luckySpeedEl) luckySpeedEl.value = String(meta.lucky[8]);
      syncLuckyRollUi({ skipMatch: true });
    }

    if (sampleById(meta.paint)) setPaintSample(meta.paint);
    setViewLayer(Math.max(0, Math.min(MAX_CIRCLES - 1, meta.view | 0)), { fromPlayhead: true });
    viewLocked = false;
    clearScrubHitCache();
    livePendingRoll = null;

    try {
      await ensureAudio();
      await buildBank();
      await seedWordBuffers();
    } catch (e) {
      console.error(e);
    }

    buildSvg();
    refreshSegFills();
    refreshPaintLabels();
    syncLayerUi();

    var missing = [];
    SAMPLES.forEach(function (s) {
      if (s.type !== 'sample') return;
      var fname = String(sampleNames[s.id] || '').trim();
      if (!fname) return;
      if (!soundBank[s.id]) {
        missing.push(s.label + ' needs file: ' + fname);
      }
    });
    return missing;
  }

  function setFileMenuOpen(open) {
    if (!fileMenuBtn || !fileMenuSub) return;
    fileMenuBtn.classList.toggle('is-open', !!open);
    fileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      fileMenuSub.hidden = false;
      fileMenuSub.classList.add('open');
    } else {
      fileMenuSub.classList.remove('open');
      fileMenuSub.hidden = true;
    }
  }

  function openCodeSheet(mode, presetText) {
    codeSheetMode = mode === 'save' ? 'save' : 'load';
    if (!codeSheet) return;
    if (codeTitle) codeTitle.textContent = codeSheetMode === 'save' ? 'Save as code' : 'Load code';
    if (codeHint) {
      codeHint.textContent = codeSheetMode === 'save'
        ? 'Copy or download this code. Sample audio is not embedded — only file names are stored.'
        : 'Paste a Circle Beat code, then Load. Missing sample files will be listed.';
    }
    if (codeText) codeText.value = presetText || '';
    if (codeCopyBtn) codeCopyBtn.hidden = codeSheetMode !== 'save';
    if (codeActionBtn) {
      codeActionBtn.textContent = codeSheetMode === 'save' ? 'Download' : 'Load';
      codeActionBtn.classList.add('primary');
    }
    codeSheet.classList.add('open');
    codeSheet.setAttribute('aria-hidden', 'false');
    if (codeText && codeSheetMode === 'load') {
      setTimeout(function () { try { codeText.focus(); } catch (e) { /* ignore */ } }, 0);
    }
  }

  function closeCodeSheet() {
    if (!codeSheet) return;
    codeSheet.classList.remove('open');
    codeSheet.setAttribute('aria-hidden', 'true');
  }

  function saveProjectCode() {
    var code = encodeProjectCode();
    openCodeSheet('save', code);
  }

  async function loadProjectCodeFromUi() {
    try {
      var missing = await applyProjectCode(codeText ? codeText.value : '');
      closeCodeSheet();
      if (missing && missing.length) {
        alert('Project loaded, but these sample files are missing:\n\n' + missing.join('\n') +
          '\n\nUse Sample → Load to add each file.');
      }
    } catch (err) {
      console.error(err);
      alert(err && err.message ? err.message : 'Could not load code.');
    }
  }

  async function ensureLayerSampleBuffers(layerIdx) {
    await ensureAudio();
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    if (!pat) return;
    var needMaker = false;
    var textIds = [];
    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      for (var i = 0; i < steps.length; i++) {
        var id = steps[i];
        if (!id || soundBank[id]) continue;
        var s = sampleById(id);
        if (!s) continue;
        if (s.type === 'maker') needMaker = true;
        else if (s.type === 'text') textIds.push(id);
      }
    });
    if (needMaker) await buildBank();
    for (var t = 0; t < textIds.length; t++) {
      var tid = textIds[t];
      if (soundBank[tid]) continue;
      var text = String(sayTexts[tid] || '').trim();
      if (text) soundBank[tid] = await prerenderSpeechToBuffer(text, tid);
    }
  }

  function buildOfflineExportGraph(octx) {
    var oMaster = octx.createGain();
    oMaster.gain.value = MASTER_GAIN;
    var oPunch = octx.createGain();
    oPunch.gain.value = 1;
    oPunch.connect(oMaster);
    var oDuck = octx.createGain();
    oDuck.gain.value = 1;
    oDuck.connect(oMaster);

    var oMix = octx.createGain();
    oMix.gain.value = 1;
    oMaster.connect(oMix);

    var reverbSend = octx.createBiquadFilter();
    reverbSend.type = 'highpass';
    reverbSend.frequency.value = REVERB_HP_HZ;
    reverbSend.Q.value = 0.7;
    oMaster.connect(reverbSend);

    var oConvolver = octx.createConvolver();
    oConvolver.normalize = true;
    var durationSec = getReverbDurationSec();
    oConvolver.buffer = createReverbIR(octx, durationSec, durationSec * 0.55);
    reverbSend.connect(oConvolver);

    var oWet = octx.createGain();
    oWet.gain.value = getReverb();
    oConvolver.connect(oWet);
    oWet.connect(oMix);

    oMix.connect(octx.destination);
    return { punchBus: oPunch, duckGain: oDuck };
  }

  function scheduleOfflineDuck(duckNode, when) {
    var g = duckNode.gain;
    var t0 = Math.max(0, when);
    try {
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t0);
      else {
        g.cancelScheduledValues(t0);
        g.setValueAtTime(Math.min(g.value, 1), t0);
      }
    } catch (e) {
      g.cancelScheduledValues(t0);
      g.setValueAtTime(1, t0);
    }
    g.linearRampToValueAtTime(DUCK_DEPTH, t0 + DUCK_ATTACK);
    g.linearRampToValueAtTime(DUCK_DEPTH, t0 + DUCK_ATTACK + DUCK_HOLD);
    g.linearRampToValueAtTime(1, t0 + DUCK_ATTACK + DUCK_HOLD + DUCK_RELEASE);
  }

  function scheduleOfflineLayerBar(octx, bank, buses, barStart, layerIdx) {
    var pat = layers[layerIdx] && layers[layerIdx].pattern;
    if (!pat) return;
    var barDur = getBarDur();
    var human = getHumanize();
    var swing = getSwing();
    var swingDiv = getSwingNoteDiv();
    var swingUnitDur = barDur / swingDiv;
    var swingMaxDelay = swingUnitDur * SWING_MAX_DELAY_FRAC;

    RINGS.forEach(function (ring) {
      var steps = pat[ring.id];
      if (!steps) return;
      var n = ring.segments;
      var stepDur = barDur / n;
      var humanMaxDelay = stepDur * MAX_DELAY_FRAC;
      for (var i = 0; i < n; i++) {
        if (!steps[i]) continue;
        var sampleId = steps[i];
        var buf = bank[sampleId];
        if (!buf) continue;
        var offset = 0;
        if (swing > 0 && stepIsSwingOffbeat(i, n, swingDiv)) offset += swing * swingMaxDelay;
        if (human > 0) offset += human * humanMaxDelay * pseudo01(ring.id, i, layerIdx + 1);
        var cap = swingMaxDelay + humanMaxDelay;
        if (offset > cap) offset = cap;
        var hitAt = barStart + i * stepDur + offset;

        var src = octx.createBufferSource();
        src.buffer = buf;
        var g = octx.createGain();
        var s = sampleById(sampleId);
        if (s && s.type === 'text') {
          var mods = randomSayPlayMods(sampleId);
          src.playbackRate.value = mods.playbackRate;
          g.gain.value = mods.gain;
        } else {
          g.gain.value = playGainForSample(sampleId);
        }
        src.connect(g);
        g.connect(isSidechainKey(sampleId) ? buses.punchBus : buses.duckGain);
        try {
          src.start(Math.max(0, hitAt));
        } catch (e) { /* skip */ }
        if (isSidechainKey(sampleId)) scheduleOfflineDuck(buses.duckGain, hitAt);
      }
    });
  }

  var savingWav = false;

  async function saveViewWheelWav() {
    if (savingWav) return;
    if (!layerHasHits(viewLayer)) {
      alert('This wheel has no hits to save.');
      return;
    }
    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) {
      alert('WAV export is not supported in this browser.');
      return;
    }

    savingWav = true;
    try {
      await ensureLayerSampleBuffers(viewLayer);

      var barDur = getBarDur();
      var tail = Math.min(1.6, getReverbDurationSec() + 0.35);
      var durationSec = barDur + tail;
      var sampleRate = 44100;
      var numFrames = Math.ceil(durationSec * sampleRate);
      var octx = new OfflineCtx(2, numFrames, sampleRate);
      var buses = buildOfflineExportGraph(octx);

      var bank = {};
      Object.keys(soundBank).forEach(function (id) {
        var src = soundBank[id];
        if (!src || typeof src.getChannelData !== 'function') return;
        bank[id] = copyBufferToContext(src, octx);
      });

      scheduleOfflineLayerBar(octx, bank, buses, 0, viewLayer);
      var rendered = await octx.startRendering();
      var blob = encodeWavFromBuffer(rendered);
      downloadBlob(blob, wavFilenameForViewLayer());
    } catch (err) {
      console.error(err);
      alert('Could not save WAV.');
    } finally {
      savingWav = false;
    }
  }

  function closePanelMenu() {
    if (!panelMenu) return;
    panelMenu.classList.remove('open');
    if (panelBurger) panelBurger.setAttribute('aria-expanded', 'false');
    setFileMenuOpen(false);
  }

  function setVisualFx(on) {
    visualFxOn = !!on;
    if (appRoot) appRoot.classList.toggle('visual-off', !visualFxOn);
    if (visualFxBtn) {
      visualFxBtn.classList.toggle('active', visualFxOn);
      visualFxBtn.setAttribute('aria-pressed', visualFxOn ? 'true' : 'false');
    }
    if (!visualFxOn) {
      clearFftRing();
      clearStarField();
      if (stageEl) stageEl.classList.remove('is-playing');
    }
  }

  function syncPanelMenuHighlight() {
    if (!panelMenu) return;
    // Hamburger visible = top panel closed → no menu item highlighted
    var collapsed = !!(appRoot && appRoot.classList.contains('top-collapsed'));
    panelMenu.querySelectorAll('.panel-opt').forEach(function (btn) {
      btn.classList.toggle('active', !collapsed && btn.dataset.panel === activePanel);
    });
  }

  function setTopCollapsed(collapsed) {
    if (!appRoot) return;
    appRoot.classList.toggle('top-collapsed', !!collapsed);
    if (collapsed) closePanelMenu();
    syncPanelMenuHighlight();
  }

  function setPanel(name) {
    activePanel = name || 'edit';
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.panel === activePanel);
    });
    setTopCollapsed(false);
    syncPanelMenuHighlight();
    closePanelMenu();
  }

  if (panelBurger && panelMenu) {
    panelBurger.addEventListener('click', function (e) {
      e.stopPropagation();
      syncPanelMenuHighlight();
      var open = panelMenu.classList.toggle('open');
      panelBurger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) setFileMenuOpen(false);
    });
    if (fileMenuBtn) {
      fileMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !(fileMenuSub && fileMenuSub.classList.contains('open'));
        setFileMenuOpen(open);
      });
    }
    panelMenu.addEventListener('click', function (e) {
      var btn = e.target.closest('.panel-opt');
      if (!btn) return;
      e.stopPropagation();
      if (btn === fileMenuBtn || btn.classList.contains('panel-opt-file')) return;
      if (btn.dataset.action === 'save-wav') {
        closePanelMenu();
        saveViewWheelWav().catch(function (err) { console.error(err); });
        return;
      }
      if (btn.dataset.action === 'save-midi') {
        closePanelMenu();
        saveViewWheelMidi();
        return;
      }
      if (btn.dataset.action === 'save-code') {
        closePanelMenu();
        saveProjectCode();
        return;
      }
      if (btn.dataset.action === 'load-code') {
        closePanelMenu();
        openCodeSheet('load', '');
        return;
      }
      if (!btn.dataset.panel) return;
      setPanel(btn.dataset.panel);
    });
  }

  if (codeCancelBtn) {
    codeCancelBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeCodeSheet();
    });
  }
  if (codeCopyBtn) {
    codeCopyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var text = codeText ? codeText.value : '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          codeCopyBtn.textContent = 'Copied';
          setTimeout(function () { codeCopyBtn.textContent = 'Copy'; }, 1200);
        }).catch(function () {
          if (codeText) { codeText.focus(); codeText.select(); }
        });
      } else if (codeText) {
        codeText.focus();
        codeText.select();
      }
    });
  }
  if (codeActionBtn) {
    codeActionBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (codeSheetMode === 'save') {
        var blob = new Blob([codeText ? codeText.value : ''], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, 'circlebeat-project.txt');
      } else {
        loadProjectCodeFromUi().catch(function (err) { console.error(err); });
      }
    });
  }
  if (codeSheet) {
    codeSheet.addEventListener('click', function (e) {
      if (e.target === codeSheet) closeCodeSheet();
    });
  }

  if (topCloseBtn) {
    topCloseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setTopCollapsed(true);
    });
  }

  if (visualFxBtn) {
    visualFxBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setVisualFx(!visualFxOn);
    });
  }

  hubBtn.addEventListener('click', function () {
    togglePlay().catch(function (err) { console.error(err); });
  });

  layerTrigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (layerMenu.classList.contains('open')) closeLayerMenus();
    else openLayerMenu();
  });

  function bindPaintGroupTrigger(trigger, group) {
    if (!trigger) return;
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      openPaintGroupMenu(group);
    });
  }
  bindPaintGroupTrigger(paintWordTrigger, 'word');
  bindPaintGroupTrigger(paintDrumTrigger, 'drum');
  bindPaintGroupTrigger(paintSampleTrigger, 'sample');

  document.querySelectorAll('[data-paint-edit]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var group = btn.getAttribute('data-paint-edit');
      setPaintGroup(group);
      closePaintGroupMenu();
      openSoundEditor();
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.paint-chip') && !(paintGroupMenu && paintGroupMenu.contains(e.target))) {
      closePaintGroupMenu();
    }
    if (!e.target.closest('.layer-pick')) closeLayerMenus();
    if (!e.target.closest('.rand-group')) closeRandMenus();
    if (!e.target.closest('.panel-menu-wrap')) closePanelMenu();
    if (!e.target.closest('.producer-pick')) closeProducerPickMenus();
  });

  wavInput.addEventListener('change', function () {
    var file = wavInput.files && wavInput.files[0];
    var id = wavInput.dataset.target || paintSample;
    if (file) loadWavFile(id, file).catch(function (err) { console.error(err); });
  });

  randBtn.addEventListener('click', function () {
    closeRandMenus();
    runRandomise().catch(function (err) { console.error(err); });
  });

  function toggleProducerPanelFromFace() {
    closeRandMenus();
    closeProducerPickMenus();
    var open = !!(appRoot && !appRoot.classList.contains('top-collapsed'));
    if (open) setTopCollapsed(true);
    else setPanel('lucky');
  }

  if (nudgeBtn) {
    nudgeBtn.addEventListener('click', function () {
      closeRandMenus();
      runNudge().catch(function (err) { console.error(err); });
    });
  }

  if (randOptsBtn) {
    randOptsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLayerMenus();
      var open = randOptsMenu.classList.contains('open');
      closeRandMenus();
      if (!open) {
        buildRandLayersList();
        randOptsMenu.classList.add('open');
        randOptsBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }
  if (randOptsMenu) {
    randOptsMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (nudgeOptsBtn) {
    nudgeOptsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLayerMenus();
      var open = nudgeOptsMenu.classList.contains('open');
      closeRandMenus();
      if (!open) {
        buildNudgeLayersList();
        nudgeOptsMenu.classList.add('open');
        nudgeOptsBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }
  if (nudgeOptsMenu) {
    nudgeOptsMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  var randLayersAll = document.getElementById('randLayersAll');
  var randLayersThis = document.getElementById('randLayersThis');
  var randLayersNone = document.getElementById('randLayersNone');
  if (randLayersAll) {
    randLayersAll.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) randLayerChecked[j] = true;
      buildRandLayersList();
    });
  }
  if (randLayersThis) {
    randLayersThis.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) randLayerChecked[j] = (j === viewLayer);
      buildRandLayersList();
    });
  }
  if (randLayersNone) {
    randLayersNone.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) randLayerChecked[j] = false;
      buildRandLayersList();
    });
  }
  var nudgeLayersAll = document.getElementById('nudgeLayersAll');
  var nudgeLayersThis = document.getElementById('nudgeLayersThis');
  var nudgeLayersNone = document.getElementById('nudgeLayersNone');
  if (nudgeLayersAll) {
    nudgeLayersAll.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) nudgeLayerChecked[j] = true;
      resetNudgeLayerCursor();
      buildNudgeLayersList();
    });
  }
  if (nudgeLayersThis) {
    nudgeLayersThis.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) nudgeLayerChecked[j] = (j === viewLayer);
      resetNudgeLayerCursor();
      buildNudgeLayersList();
    });
  }
  if (nudgeLayersNone) {
    nudgeLayersNone.addEventListener('click', function (e) {
      e.stopPropagation();
      for (var j = 0; j < MAX_CIRCLES; j++) nudgeLayerChecked[j] = false;
      resetNudgeLayerCursor();
      buildNudgeLayersList();
    });
  }

  soundClose.addEventListener('click', closeSoundEditor);
  soundSheet.addEventListener('click', function (e) {
    if (e.target === soundSheet) closeSoundEditor();
  });

  (function initSoundBodyDrag() {
    var dragging = false;
    var startY = 0;
    var startScroll = 0;
    var pointerId = null;

    function isInteractive(el) {
      return !!(el && el.closest && el.closest('input, select, button, textarea, a, label.param-check'));
    }

    soundBody.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (isInteractive(e.target)) return;
      dragging = true;
      pointerId = e.pointerId;
      startY = e.clientY;
      startScroll = soundBody.scrollTop;
      soundBody.classList.add('is-dragging');
      try { soundBody.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    soundBody.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pointerId) return;
      e.preventDefault();
      soundBody.scrollTop = startScroll + (startY - e.clientY);
    }, { passive: false });

    function endDrag(e) {
      if (!dragging) return;
      if (e && pointerId != null && e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      soundBody.classList.remove('is-dragging');
    }

    soundBody.addEventListener('pointerup', endDrag);
    soundBody.addEventListener('pointercancel', endDrag);
    soundBody.addEventListener('lostpointercapture', endDrag);

    soundBody.addEventListener('wheel', function (e) {
      if (soundBody.scrollHeight <= soundBody.clientHeight) return;
      soundBody.scrollTop += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  })();

  bpmEl.addEventListener('input', function () {
    bpmVal.textContent = String(getBpm());
    updateReverbIR();
  });

  humanEl.addEventListener('input', function () {
    humanVal.textContent = Math.round(getHumanize() * 100) + '%';
  });

  swingEl.addEventListener('input', function () {
    swingVal.textContent = Math.round(getSwing() * 100) + '%';
    buildSvg();
  });

  if (swingNoteEl) {
    swingNoteEl.addEventListener('change', function () {
      buildSvg();
    });
  }

  reverbEl.addEventListener('input', function () {
    reverbVal.textContent = Math.round(getReverb() * 100) + '%';
    applySpaceSettings();
  });

  reverbDurEl.addEventListener('input', function () {
    updateReverbIR();
  });

  stereoEl.addEventListener('input', function () {
    stereoVal.textContent = Math.round(getStereo()) + '%';
    applySpaceSettings();
  });

  function bindLuckySlider(el) {
    if (!el) return;
    el.addEventListener('input', function () { syncLuckyRollUi(); });
  }
  bindLuckySlider(luckyEuclidDensEl);
  bindLuckySlider(luckyEuclidGoldenEl);
  bindLuckySlider(luckySkipEl);
  bindLuckySlider(luckySoundsEl);
  bindLuckySlider(luckyReuseEl);
  bindLuckySlider(luckyConsistencyEl);
  bindLuckySlider(luckyWordsVolEl);
  bindLuckySlider(luckyHumanityEl);
  bindLuckySlider(luckySpeedEl);

  buildLuckyProducerSelect();
  if (luckyProducerBtn) {
    luckyProducerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleProducerPickMenu(luckyProducerBtn, luckyProducerMenu);
    });
  }
  if (luckyProducerMenu) {
    luckyProducerMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (appProducerFaceBtn) {
    appProducerFaceBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleProducerPanelFromFace();
    });
  }
  document.querySelectorAll('[data-lucky-help]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showLuckyHelp(btn.getAttribute('data-lucky-help'), btn);
    });
  });
  if (luckyTipCloseEl) {
    luckyTipCloseEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      hideLuckyTip();
    });
  }
  document.addEventListener('click', function (e) {
    if (!luckyTipEl || !luckyTipEl.classList.contains('open')) return;
    if (luckyTipEl.contains(e.target)) return;
    if (e.target && e.target.closest && e.target.closest('[data-lucky-help]')) return;
    hideLuckyTip();
  });
  window.addEventListener('resize', hideLuckyTip);
  var bootProducerId = pickRandomNamedProducerId();
  preloadProducerThumbs();
  applyLuckyProducer(bootProducerId, { silent: true });
  syncLaunchProducerUi(bootProducerId);

  initLayers();
  setViewLayer(0, { skipPaint: true, fromPlayhead: true });
  viewLocked = false;
  seedWordTextsSync();
  buildPaintMenus();
  setPaintGroup('word');
  syncPaintSwatch();
  buildSvg();
  syncLayerUi();
  syncPanelMenuHighlight();
  syncLuckyRollUi({ skipMatch: true, producerId: bootProducerId });
  humanVal.textContent = Math.round(getHumanize() * 100) + '%';
  reverbVal.textContent = Math.round(getReverb() * 100) + '%';
  stereoVal.textContent = Math.round(getStereo()) + '%';
  updateReverbIR();
  updatePlayhead();
  sizeFftCanvas();
  sizeStarCanvas();
  initStarParticles();
  window.addEventListener('resize', function () {
    sizeFftCanvas();
    sizeStarCanvas();
  });
  async function startApp() {
    if (appStarted) return;
    appStarted = true;
    applyLuckyProducer(launchProducerId || pickRandomNamedProducerId(), { silent: true });
    if (launchOverlay) launchOverlay.classList.add('hidden');
    try {
      await ensureAudio();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
      playDjSwiftSound(0.28);
    } catch (e) {
      console.error(e);
    }
  }

  if (launchProducerPrev) {
    launchProducerPrev.addEventListener('click', function (e) {
      e.stopPropagation();
      stepLaunchProducer(-1);
    });
  }
  if (launchProducerNext) {
    launchProducerNext.addEventListener('click', function (e) {
      e.stopPropagation();
      stepLaunchProducer(1);
    });
  }

  if (launchOverlay) {
    launchOverlay.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.launch-producer')) return;
      startApp().catch(function (err) { console.error(err); });
    });
    launchOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLaunchProducer(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLaunchProducer(1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startApp().catch(function (err) { console.error(err); });
      }
    });
  }

  seedWordBuffers().catch(function (err) { console.error(err); });
})();

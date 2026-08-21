/**
 * Circle Slicer — upload up to 3 samples, chop ≤20s windows by BPM, sprinkle onto rings.
 * Per-ring (or all-rings) attack / release / duration shape playback.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var CX = 500;
  var CY = 500;
  var OUTER = 470;
  var INNER_HUB = 130;
  var RING_GAP = 4;
  var SEG_GAP_DEG = 1.6;
  var START_ANGLE = -Math.PI / 2;
  var LOOK_AHEAD = 0.12;
  var SCHEDULE_MS = 25;
  var BEATS_PER_BAR = 4;
  var WINDOW_MAX = 20;
  var SLOT_COUNT = 3;

  /** Available slice durations (beats). Priority 1 = most likely when enabled. */
  var DURATION_DEFS = [
    { beats: 4, label: '4b', on: false, priority: 4 },
    { beats: 3, label: '3b', on: false, priority: 4 },
    { beats: 2, label: '2b', on: false, priority: 3 },
    { beats: 1, label: '1b', on: true, priority: 2 },
    { beats: 0.5, label: '½b', on: true, priority: 2 },
    { beats: 0.25, label: '¼b', on: true, priority: 1 },
    { beats: 0.125, label: '⅛b', on: false, priority: 3 }
  ];

  var SLOT_COLORS = ['#c8ff00', '#ff6a00', '#4f9ad4'];
  var SLICE_COLORS = [
    '#ff6a00', '#c43dff', '#ff2d8a', '#1eea4a', '#ffd000',
    '#ff3b1a', '#a34dff', '#e85d04', '#7b2cbf', '#4f9ad4',
    '#c8ff00', '#ff8fab', '#00c2a8', '#f4a261', '#9b5de5'
  ];
  var EMPTY_A = '#1e1e24';
  var EMPTY_B = '#222228';
  var DEFAULT_ENV = { attackMs: 4, releaseMs: 35, durationPct: 100 };

  var launchOverlay = document.getElementById('launchOverlay');
  var launchGo = document.getElementById('launchGo');
  var appRoot = document.getElementById('appRoot');
  var svg = document.getElementById('ringSvg');
  var hubBtn = document.getElementById('hubBtn');
  var hubIcon = document.getElementById('hubIcon');
  var circleWrap = document.getElementById('circleWrap');
  var bpmEl = document.getElementById('bpm');
  var bpmVal = document.getElementById('bpmVal');
  var sliceDursEl = document.getElementById('sliceDurs');
  var sprinkleModeEl = document.getElementById('sprinkleMode');
  var seqSwapEl = document.getElementById('seqSwap');
  var seqSwapVal = document.getElementById('seqSwapVal');
  var seqSwapWrap = document.getElementById('seqSwapWrap');
  var breakerPanel = document.getElementById('breakerPanel');
  var breakerPresetsEl = document.getElementById('breakerPresets');
  var breakerPresetHint = document.getElementById('breakerPresetHint');
  var breakSkipEl = document.getElementById('breakSkip');
  var breakStutterEl = document.getElementById('breakStutter');
  var breakIntensityEl = document.getElementById('breakIntensity');
  var breakSkipVal = document.getElementById('breakSkipVal');
  var breakStutterVal = document.getElementById('breakStutterVal');
  var breakIntensityVal = document.getElementById('breakIntensityVal');

  var BREAKER_PRESETS = [
    { id: 'balanced', label: 'Balanced', skip: 28, stutter: 32, intensity: 3 },
    { id: 'airy', label: 'More Break', skip: 52, stutter: 16, intensity: 2 },
    { id: 'chop', label: 'More Stutter', skip: 12, stutter: 58, intensity: 4 },
    { id: 'glitch', label: 'Heavy Glitch', skip: 36, stutter: 62, intensity: 5 },
    { id: 'sparse', label: 'Sparse', skip: 58, stutter: 28, intensity: 3 },
    { id: 'soft', label: 'Soft Chop', skip: 18, stutter: 42, intensity: 2 }
  ];
  var activeBreakerPreset = 'balanced';
  var breakerPresetLocked = true;

  var ringCountEl = document.getElementById('ringCount');
  var ringCountVal = document.getElementById('ringCountVal');
  var fileInput = document.getElementById('fileInput');
  var resliceBtn = document.getElementById('resliceBtn');
  var sliceMeta = document.getElementById('sliceMeta');
  var playMeta = document.getElementById('playMeta');
  var waveCanvas = document.getElementById('waveCanvas');
  var specCanvas = document.getElementById('specCanvas');
  var overviewCanvas = document.getElementById('overviewCanvas');
  var waveWrap = document.getElementById('waveWrap');
  var overviewWrap = document.getElementById('overviewWrap');
  var waveEmpty = document.getElementById('waveEmpty');
  var waveHint = document.getElementById('waveHint');
  var windowStartEl = document.getElementById('windowStart');
  var windowStartVal = document.getElementById('windowStartVal');
  var windowRangeLab = document.getElementById('windowRangeLab');
  var ringPicks = document.getElementById('ringPicks');
  var ringAttackEl = document.getElementById('ringAttack');
  var ringReleaseEl = document.getElementById('ringRelease');
  var ringDurEl = document.getElementById('ringDur');
  var ringAttackVal = document.getElementById('ringAttackVal');
  var ringReleaseVal = document.getElementById('ringReleaseVal');
  var ringDurVal = document.getElementById('ringDurVal');
  var ringEnvHint = document.getElementById('ringEnvHint');
  var sampleSlotsEl = document.getElementById('sampleSlots');
  var weightSlidersEl = document.getElementById('weightSliders');
  var mixModeEl = document.getElementById('mixMode');
  var mixModeWrap = document.getElementById('mixModeWrap');
  var samplesBar = document.getElementById('samplesBar');
  var activeSampleLab = document.getElementById('activeSampleLab');

  var waveCtx2d = waveCanvas ? waveCanvas.getContext('2d') : null;
  var specCtx2d = specCanvas ? specCanvas.getContext('2d') : null;
  var overviewCtx2d = overviewCanvas ? overviewCanvas.getContext('2d') : null;

  var ctx = null;
  var master = null;
  var analyser = null;
  var analyserData = null;

  var slots = [
    { buffer: null, name: '', weight: 50, windowStart: 0 },
    { buffer: null, name: '', weight: 50, windowStart: 0 },
    { buffer: null, name: '', weight: 50, windowStart: 0 }
  ];
  var activeSlot = 0;
  var slices = [];
  var slicesBySlot = [[], [], []];
  var slicesBySlotBeats = [{}, {}, {}]; // slot -> { '0.25': [indices], ... }
  var playTimeline = []; // flat { ringIdx, segIdx, beats }
  var rings = [];
  var ringEnvs = [];
  var editRing = -1;
  var segEls = {};
  var playheadEl = null;
  var fullPeaksBySlot = [null, null, null];
  var windowPeaksBySlot = [null, null, null];
  var highlightSlice = -1;
  var vizRaf = 0;
  var overviewDrag = false;

  var playing = false;
  var scheduleTimer = 0;
  var playheadRaf = 0;
  var nextStepTime = 0;
  var stepCursor = 0;
  var activeSources = [];

  function loadedSlots() {
    var out = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (slots[i].buffer) out.push(i);
    }
    return out;
  }

  function getMixMode() {
    var v = mixModeEl ? mixModeEl.value : 'weighted';
    return v === 'equal' ? 'equal' : 'weighted';
  }

  function getSlotWeight(i) {
    var w = slots[i] ? Number(slots[i].weight) : 50;
    return Math.max(1, Math.min(100, w || 50));
  }

  function activeSample() {
    return slots[activeSlot];
  }

  function hasSamples() {
    return loadedSlots().length > 0;
  }

  function getBpm() {
    return Math.max(50, Math.min(180, Number(bpmEl.value) || 120));
  }

  function beatKey(beats) {
    return String(beats);
  }

  function beatsToSec(beats) {
    return (60 / getBpm()) * beats;
  }

  function getEnabledDurations() {
    return DURATION_DEFS.filter(function (d) { return d.on; })
      .map(function (d) {
        return {
          beats: d.beats,
          priority: Math.max(1, Math.min(9, Number(d.priority) || 1)),
          label: d.label
        };
      });
  }

  /** Weight: priority 1 heaviest. */
  function priorityWeight(p) {
    return 1 / Math.max(1, p);
  }

  function pickDurationFitting(options, remaining) {
    var fit = options.filter(function (o) {
      return o.beats <= remaining + 1e-9;
    });
    if (!fit.length) return null;
    var total = 0;
    var weights = [];
    for (var i = 0; i < fit.length; i++) {
      var w = priorityWeight(fit[i].priority);
      weights.push(w);
      total += w;
    }
    var r = Math.random() * total;
    for (var j = 0; j < fit.length; j++) {
      r -= weights[j];
      if (r <= 0) return fit[j];
    }
    return fit[fit.length - 1];
  }

  /** Random segment durations summing to ≤ 4 beats. */
  function buildBeatPlan() {
    var opts = getEnabledDurations();
    if (!opts.length) {
      opts = [{ beats: 0.25, priority: 1, label: '¼b' }];
    }
    var rem = BEATS_PER_BAR;
    var plan = [];
    var guard = 0;
    while (rem > 1e-6 && guard++ < 64) {
      var pick = pickDurationFitting(opts, rem);
      if (!pick) break;
      plan.push(pick.beats);
      rem -= pick.beats;
      if (Math.abs(rem) < 1e-6) rem = 0;
    }
    if (!plan.length) plan.push(Math.min(BEATS_PER_BAR, opts[0].beats));
    return plan;
  }

  function renderDurationOptions() {
    if (!sliceDursEl) return;
    var lab = sliceDursEl.querySelector('.dur-lab');
    sliceDursEl.innerHTML = '';
    if (lab) sliceDursEl.appendChild(lab);
    else {
      var span = document.createElement('span');
      span.className = 'dur-lab';
      span.textContent = 'Slice';
      sliceDursEl.appendChild(span);
    }

    DURATION_DEFS.forEach(function (def, idx) {
      var label = document.createElement('label');
      label.className = 'dur-opt' + (def.on ? ' is-on' : '');
      label.title = def.label + ' · priority 1 = most likely';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!def.on;
      cb.setAttribute('data-idx', String(idx));

      var name = document.createElement('span');
      name.textContent = def.label;

      var prio = document.createElement('input');
      prio.type = 'number';
      prio.className = 'prio';
      prio.min = '1';
      prio.max = '9';
      prio.step = '1';
      prio.value = String(def.priority);
      prio.disabled = !def.on;
      prio.title = 'Priority (1 = most likely)';
      prio.setAttribute('data-idx', String(idx));

      cb.addEventListener('change', function () {
        def.on = cb.checked;
        prio.disabled = !cb.checked;
        label.classList.toggle('is-on', def.on);
        ensureAtLeastOneDuration();
        onDurationsChanged();
      });
      prio.addEventListener('change', function () {
        def.priority = Math.max(1, Math.min(9, Number(prio.value) || 1));
        prio.value = String(def.priority);
        onDurationsChanged();
      });

      label.appendChild(cb);
      label.appendChild(name);
      label.appendChild(prio);
      sliceDursEl.appendChild(label);
    });
  }

  function ensureAtLeastOneDuration() {
    if (getEnabledDurations().length) return;
    var d = DURATION_DEFS[5] || DURATION_DEFS[0]; // ¼b default
    d.on = true;
    d.priority = 1;
    renderDurationOptions();
  }

  function onDurationsChanged() {
    if (playing) stopPlay();
    resliceAndDraw();
  }

  function getRingCount() {
    return Math.max(2, Math.min(8, Number(ringCountEl.value) || 4));
  }

  function getSprinkleMode() {
    var v = sprinkleModeEl.value;
    if (v === 'random' || v === 'breaker') return v;
    return 'sequential';
  }

  function getSeqSwapAmount() {
    return Math.max(0, Math.min(100, Number(seqSwapEl && seqSwapEl.value) || 0));
  }

  function getBreakSkipChance() {
    return Math.max(0, Math.min(0.8, (Number(breakSkipEl && breakSkipEl.value) || 0) / 100));
  }

  function getBreakStutterChance() {
    return Math.max(0, Math.min(0.9, (Number(breakStutterEl && breakStutterEl.value) || 0) / 100));
  }

  function getBreakIntensity() {
    return Math.max(2, Math.min(5, Number(breakIntensityEl && breakIntensityEl.value) || 3));
  }

  function pickStutterReps() {
    var maxR = getBreakIntensity();
    return 2 + Math.floor(Math.random() * (maxR - 1));
  }

  function syncBreakerSliderLabels() {
    if (breakSkipVal) breakSkipVal.textContent = (breakSkipEl ? breakSkipEl.value : '0') + '%';
    if (breakStutterVal) breakStutterVal.textContent = (breakStutterEl ? breakStutterEl.value : '0') + '%';
    if (breakIntensityVal) breakIntensityVal.textContent = '×' + getBreakIntensity();
  }

  function applyBreakerPreset(id, resprinkle) {
    var p = null;
    for (var i = 0; i < BREAKER_PRESETS.length; i++) {
      if (BREAKER_PRESETS[i].id === id) { p = BREAKER_PRESETS[i]; break; }
    }
    if (!p) return;
    activeBreakerPreset = p.id;
    breakerPresetLocked = true;
    if (breakSkipEl) breakSkipEl.value = String(p.skip);
    if (breakStutterEl) breakStutterEl.value = String(p.stutter);
    if (breakIntensityEl) breakIntensityEl.value = String(p.intensity);
    syncBreakerSliderLabels();
    renderBreakerPresets();
    if (breakerPresetHint) breakerPresetHint.textContent = p.label;
    if (resprinkle && getSprinkleMode() === 'breaker' && hasSamples()) {
      if (playing) stopPlay();
      sprinkle();
      drawRings();
      updateMeta();
    }
  }

  function markBreakerCustom() {
    breakerPresetLocked = false;
    activeBreakerPreset = 'custom';
    renderBreakerPresets();
    if (breakerPresetHint) breakerPresetHint.textContent = 'Custom';
  }

  function renderBreakerPresets() {
    if (!breakerPresetsEl) return;
    breakerPresetsEl.innerHTML = '';
    BREAKER_PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'breaker-preset' + (breakerPresetLocked && activeBreakerPreset === p.id ? ' is-active' : '');
      btn.textContent = p.label;
      btn.title =
        'Skip ' + p.skip + '% · Stutter ' + p.stutter + '% · Intensity ×' + p.intensity;
      btn.addEventListener('click', function () {
        applyBreakerPreset(p.id, true);
      });
      breakerPresetsEl.appendChild(btn);
    });
  }

  function syncModePanels() {
    var mode = getSprinkleMode();
    var seq = mode === 'sequential';
    var brk = mode === 'breaker';
    if (seqSwapWrap) seqSwapWrap.style.display = seq ? '' : 'none';
    if (seqSwapEl) seqSwapEl.disabled = !seq;
    if (seqSwapVal) seqSwapVal.textContent = getSeqSwapAmount() + '%';
    if (breakerPanel) breakerPanel.hidden = !brk;
    syncMixUi();
  }

  function syncMixUi() {
    var weighted = getMixMode() === 'weighted';
    if (mixModeWrap) mixModeWrap.style.display = '';
    renderWeightSliders();
    if (weightSlidersEl) {
      weightSlidersEl.style.display = weighted ? '' : 'none';
    }
  }

  function renderSampleSlots() {
    if (!sampleSlotsEl) return;
    sampleSlotsEl.innerHTML = '';
    for (var i = 0; i < SLOT_COUNT; i++) {
      (function (idx) {
        var slot = slots[idx];
        var el = document.createElement('div');
        el.className = 'slot' +
          (idx === activeSlot ? ' is-active' : '') +
          (!slot.buffer ? ' is-empty' : '');
        el.title = slot.buffer ? slot.name : 'Empty slot ' + (idx + 1);

        var dot = document.createElement('span');
        dot.className = 'slot-dot';
        dot.style.background = SLOT_COLORS[idx];
        el.appendChild(dot);

        var name = document.createElement('span');
        name.className = 'slot-name';
        name.textContent = slot.buffer ? slot.name : 'Slot ' + (idx + 1);
        el.appendChild(name);

        if (slot.buffer) {
          var clearBtn = document.createElement('button');
          clearBtn.type = 'button';
          clearBtn.className = 'slot-clear';
          clearBtn.textContent = '×';
          clearBtn.title = 'Clear slot';
          clearBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            clearSlot(idx);
          });
          el.appendChild(clearBtn);
        }

        el.addEventListener('click', function () {
          setActiveSlot(idx);
        });
        sampleSlotsEl.appendChild(el);
      })(i);
    }
  }

  function renderWeightSliders() {
    if (!weightSlidersEl) return;
    weightSlidersEl.innerHTML = '';
    if (getMixMode() !== 'weighted') return;
    loadedSlots().forEach(function (idx) {
      var slot = slots[idx];
      var lab = document.createElement('label');
      lab.className = 'chip slide weight-slide';
      lab.title = 'Weight for ' + (slot.name || 'slot ' + (idx + 1));

      var dot = document.createElement('span');
      dot.className = 'slot-dot';
      dot.style.background = SLOT_COLORS[idx];
      lab.appendChild(dot);

      var slideLab = document.createElement('span');
      slideLab.className = 'slide-lab';
      slideLab.textContent = 'S' + (idx + 1);
      lab.appendChild(slideLab);

      var input = document.createElement('input');
      input.type = 'range';
      input.min = '1';
      input.max = '100';
      input.step = '1';
      input.value = String(getSlotWeight(idx));
      input.addEventListener('input', function () {
        slot.weight = Number(input.value) || 50;
        val.textContent = String(getSlotWeight(idx));
        if (hasSamples()) resprinkleOnly();
      });
      lab.appendChild(input);

      var val = document.createElement('span');
      val.className = 'slide-val';
      val.textContent = String(getSlotWeight(idx));
      lab.appendChild(val);

      weightSlidersEl.appendChild(lab);
    });
  }

  function updateActiveSampleLab() {
    if (!activeSampleLab) return;
    var slot = activeSample();
    if (!slot || !slot.buffer) {
      activeSampleLab.textContent = '';
      return;
    }
    activeSampleLab.textContent = '· ' + slot.name;
  }

  function setActiveSlot(idx) {
    if (idx < 0 || idx >= SLOT_COUNT) return;
    activeSlot = idx;
    renderSampleSlots();
    updateActiveSampleLab();
    syncWindowSlider();
    rebuildWindowPeaksForSlot(activeSlot);
    drawWaveform();
  }

  function clearSlot(idx) {
    if (playing) stopPlay();
    slots[idx].buffer = null;
    slots[idx].name = '';
    slots[idx].windowStart = 0;
    fullPeaksBySlot[idx] = null;
    windowPeaksBySlot[idx] = null;
    if (activeSlot === idx && !slots[idx].buffer) {
      var loaded = loadedSlots();
      if (loaded.length) activeSlot = loaded[0];
    }
    renderSampleSlots();
    renderWeightSliders();
    updateActiveSampleLab();
    resliceAndDraw();
  }

  function targetSlotForUpload() {
    if (!slots[activeSlot].buffer) return activeSlot;
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (!slots[i].buffer) return i;
    }
    return activeSlot;
  }

  function applyNeighborSwaps(cells, amount, segBeats) {
    if (!cells || cells.length < 2 || !(amount > 0)) return;
    var n = cells.length;
    var passes = 1 + Math.floor(amount / 40);
    var chance = 0.12 + (amount / 100) * 0.72;
    var maxDist = amount < 28 ? 1 : (amount < 62 ? 2 : 3);

    for (var p = 0; p < passes; p++) {
      var i = 0;
      while (i < n - 1) {
        if (Math.random() > chance) {
          i += 1;
          continue;
        }
        var dist = 1 + Math.floor(Math.random() * maxDist);
        dist = Math.min(dist, n - 1 - i);
        var j = i + dist;
        // Only swap equal-duration segments so audio length still matches the arc
        if (segBeats && Math.abs((segBeats[i] || 0) - (segBeats[j] || 0)) > 1e-9) {
          i += 1;
          continue;
        }
        var tmp = cells[i];
        cells[i] = cells[j];
        cells[j] = tmp;
        i = j + 1;
      }
    }
  }

  function cellSi(cell) {
    if (cell == null) return null;
    if (typeof cell === 'number') return cell;
    return cell.si;
  }

  function cellReps(cell) {
    if (cell == null) return 0;
    if (typeof cell === 'number') return 1;
    return Math.max(1, cell.reps || 1);
  }

  function makeCell(si, reps) {
    return { si: si, reps: reps == null ? 1 : reps };
  }

  function segFillForCell(cell, i) {
    var si = cellSi(cell);
    if (si == null) return emptyFill(i);
    var sl = slices[si];
    return sl ? sl.color : emptyFill(i);
  }

  function segmentsForSlice(sliceBeats) {
    var steps = BEATS_PER_BAR / sliceBeats;
    return Math.max(4, Math.min(64, Math.round(steps)));
  }

  function sliceDurationSec() {
    var opts = getEnabledDurations();
    var b = opts.length ? opts[0].beats : 0.25;
    return beatsToSec(b);
  }

  function barDurationSec() {
    return beatsToSec(BEATS_PER_BAR);
  }

  function rebuildPlayTimeline() {
    playTimeline = [];
    rings.forEach(function (ring, ri) {
      var beatsArr = ring.segBeats || [];
      for (var i = 0; i < beatsArr.length; i++) {
        playTimeline.push({
          ringIdx: ri,
          segIdx: i,
          beats: beatsArr[i]
        });
      }
    });
  }

  function slotDuration(slotIdx) {
    var slot = slots[slotIdx];
    return slot && slot.buffer ? slot.buffer.duration : 0;
  }

  function windowDurationForSlot(slotIdx) {
    var d = slotDuration(slotIdx);
    if (!(d > 0)) return 0;
    return Math.min(WINDOW_MAX, d);
  }

  function maxWindowStartForSlot(slotIdx) {
    return Math.max(0, slotDuration(slotIdx) - windowDurationForSlot(slotIdx));
  }

  function clampWindowStartForSlot(slotIdx, v) {
    return Math.max(0, Math.min(maxWindowStartForSlot(slotIdx), v));
  }

  function primaryBeatsForDisplay() {
    var opts = getEnabledDurations().slice();
    if (!opts.length) return 0.25;
    opts.sort(function (a, b) {
      return a.priority - b.priority || a.beats - b.beats;
    });
    return opts[0].beats;
  }

  function activeSlotSlices() {
    var out = [];
    var want = primaryBeatsForDisplay();
    for (var i = 0; i < slices.length; i++) {
      if (slices[i].slot === activeSlot && Math.abs(slices[i].beats - want) < 1e-9) {
        out.push(slices[i]);
      }
    }
    // Fallback if none (shouldn't happen)
    if (!out.length) {
      for (var j = 0; j < slices.length; j++) {
        if (slices[j].slot === activeSlot) out.push(slices[j]);
      }
    }
    return out;
  }

  function ensureAudio() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    analyserData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser);
    analyser.connect(ctx.destination);
    return ctx;
  }

  function polar(cx, cy, r, a) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(inner, outer, a0, a1) {
    var p0 = polar(CX, CY, outer, a0);
    var p1 = polar(CX, CY, outer, a1);
    var p2 = polar(CX, CY, inner, a1);
    var p3 = polar(CX, CY, inner, a0);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return [
      'M', p0.x, p0.y,
      'A', outer, outer, 0, large, 1, p1.x, p1.y,
      'L', p2.x, p2.y,
      'A', inner, inner, 0, large, 0, p3.x, p3.y,
      'Z'
    ].join(' ');
  }

  function ringRadii(li, n) {
    var span = OUTER - INNER_HUB;
    var band = (span - RING_GAP * (n - 1)) / n;
    var outer = OUTER - li * (band + RING_GAP);
    return { outer: outer, inner: outer - band };
  }

  function emptyFill(i) {
    return (i % 2 === 0) ? EMPTY_A : EMPTY_B;
  }

  function colorForSlice(i) {
    return SLICE_COLORS[i % SLICE_COLORS.length];
  }

  function sliceColorForSlot(slotIdx, localIndex) {
    var base = SLOT_COLORS[slotIdx] || colorForSlice(localIndex);
    if (localIndex === 0) return base;
    return colorForSlice(localIndex + slotIdx * 3);
  }

  function defaultEnv() {
    return {
      attackMs: DEFAULT_ENV.attackMs,
      releaseMs: DEFAULT_ENV.releaseMs,
      durationPct: DEFAULT_ENV.durationPct
    };
  }

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    segEls = {};
    playheadEl = null;
  }

  function buildRingsGeometry() {
    var nRings = getRingCount();
    var prev = ringEnvs.slice();
    rings = [];
    ringEnvs = [];
    for (var i = 0; i < nRings; i++) {
      var env = prev[i] ? Object.assign({}, prev[i]) : defaultEnv();
      ringEnvs.push(env);
      var plan = buildBeatPlan();
      rings.push({
        id: 'r' + i,
        segBeats: plan,
        segments: plan.length,
        cells: Array(plan.length).fill(null),
        attackMs: env.attackMs,
        releaseMs: env.releaseMs,
        durationPct: env.durationPct
      });
    }
    if (editRing >= nRings && editRing !== -1) editRing = -1;
    rebuildPlayTimeline();
    renderRingPicks();
    syncRingEnvUi();
  }

  function renderRingPicks() {
    if (!ringPicks) return;
    ringPicks.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'ring-pick' + (editRing === -1 ? ' is-active' : '');
    allBtn.textContent = 'All';
    allBtn.title = 'Edit all rings';
    allBtn.addEventListener('click', function () {
      editRing = -1;
      renderRingPicks();
      syncRingEnvUi();
    });
    ringPicks.appendChild(allBtn);

    rings.forEach(function (ring, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ring-pick' + (i === editRing ? ' is-active' : '');
      btn.textContent = String(i + 1);
      btn.title = 'Edit ring ' + (i + 1) + ' envelope';
      btn.addEventListener('click', function () {
        editRing = i;
        renderRingPicks();
        syncRingEnvUi();
      });
      ringPicks.appendChild(btn);
    });
  }

  function syncRingEnvUi() {
    var ringIdx = editRing === -1 ? 0 : editRing;
    var ring = rings[ringIdx];
    if (!ring) return;
    ringAttackEl.value = String(ring.attackMs);
    ringReleaseEl.value = String(ring.releaseMs);
    ringDurEl.value = String(ring.durationPct);
    ringAttackVal.textContent = ring.attackMs + ' ms';
    ringReleaseVal.textContent = ring.releaseMs + ' ms';
    ringDurVal.textContent = ring.durationPct + '%';
    if (ringEnvHint) {
      ringEnvHint.textContent = editRing === -1
        ? 'All rings'
        : 'Ring ' + (editRing + 1) + ' · outer=1';
    }
  }

  function applyEnvFromUi() {
    var attack = Number(ringAttackEl.value) || 0;
    var release = Number(ringReleaseEl.value) || 0;
    var dur = Number(ringDurEl.value) || 100;
    ringAttackVal.textContent = attack + ' ms';
    ringReleaseVal.textContent = release + ' ms';
    ringDurVal.textContent = dur + '%';

    if (editRing === -1) {
      rings.forEach(function (ring, i) {
        ring.attackMs = attack;
        ring.releaseMs = release;
        ring.durationPct = dur;
        ringEnvs[i] = { attackMs: attack, releaseMs: release, durationPct: dur };
      });
      return;
    }

    var ring = rings[editRing];
    if (!ring) return;
    ring.attackMs = attack;
    ring.releaseMs = release;
    ring.durationPct = dur;
    ringEnvs[editRing] = { attackMs: attack, releaseMs: release, durationPct: dur };
  }

  function drawRings() {
    clearSvg();
    var n = rings.length;
    if (!n) return;

    var disc = document.createElementNS(NS, 'circle');
    disc.setAttribute('cx', String(CX));
    disc.setAttribute('cy', String(CY));
    disc.setAttribute('r', String(OUTER + 2));
    disc.setAttribute('fill', '#16161a');
    svg.appendChild(disc);

    rings.forEach(function (ring, li) {
      var rr = ringRadii(li, n);
      var beatsArr = ring.segBeats || [];
      var gap = (SEG_GAP_DEG * Math.PI) / 180;
      var angle = START_ANGLE;
      for (var i = 0; i < beatsArr.length; i++) {
        var sweep = (beatsArr[i] / BEATS_PER_BAR) * Math.PI * 2;
        var a0 = angle + gap / 2;
        var a1 = angle + sweep - gap / 2;
        if (a1 <= a0) a1 = a0 + sweep * 0.5;
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', arcPath(rr.inner, rr.outer, a0, a1));
        var cell = ring.cells[i];
        path.setAttribute('fill', segFillForCell(cell, i));
        if (cellReps(cell) > 1) {
          path.setAttribute('stroke', '#f5ffe0');
          path.setAttribute('stroke-width', '2.2');
          path.setAttribute('stroke-opacity', '0.85');
        } else {
          path.setAttribute('stroke', 'none');
        }
        path.dataset.ring = ring.id;
        path.dataset.seg = String(i);
        path.style.cursor = cellSi(cell) == null ? 'default' : 'pointer';
        path.addEventListener('click', onSegClick);
        svg.appendChild(path);
        segEls[ring.id + ':' + i] = path;
        angle += sweep;
      }
    });

    var g = document.createElementNS(NS, 'g');
    g.setAttribute('id', 'playhead');
    var beam = document.createElementNS(NS, 'rect');
    beam.setAttribute('x', String(CX - 1.5));
    beam.setAttribute('y', String(CY - OUTER));
    beam.setAttribute('width', '3');
    beam.setAttribute('height', String(OUTER - INNER_HUB + 8));
    beam.setAttribute('rx', '1.5');
    beam.setAttribute('fill', '#c8ff00');
    beam.setAttribute('opacity', '0.85');
    g.appendChild(beam);
    svg.appendChild(g);
    playheadEl = g;
  }

  function onSegClick(e) {
    var ringId = e.currentTarget.dataset.ring;
    var i = Number(e.currentTarget.dataset.seg);
    var ring = rings.find(function (r) { return r.id === ringId; });
    if (!ring || !slices.length) return;
    var cell = ring.cells[i];
    var si = cellSi(cell);
    if (si == null) return;
    var ringIdx = rings.indexOf(ring);
    if (ringIdx >= 0) {
      editRing = ringIdx;
      renderRingPicks();
      syncRingEnvUi();
    }
    var beats = (ring.segBeats && ring.segBeats[i]) || 0.25;
    previewSlice(si, ring, cellReps(cell), beats);
  }

  function stopActiveSources() {
    activeSources.forEach(function (s) {
      try { s.stop(); } catch (err) { /* ignore */ }
    });
    activeSources = [];
  }

  function playSliceAt(buffer, when, env, opts) {
    if (!ctx || !buffer || !master) return null;
    env = env || defaultEnv();
    opts = opts || {};
    var attack = Math.max(0, (env.attackMs || 0) / 1000);
    var release = Math.max(0, (env.releaseMs || 0) / 1000);
    var pct = Math.max(0.1, Math.min(1, (env.durationPct || 100) / 100));
    var playDur = Math.max(0.01, buffer.duration * pct);
    if (opts.maxDur != null) playDur = Math.min(playDur, Math.max(0.012, opts.maxDur));
    if (opts.stutter) {
      attack = Math.min(attack, 0.004);
      release = Math.min(Math.max(release * 0.35, 0.008), playDur * 0.4);
    }
    var t0 = Math.max(when, ctx.currentTime);

    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var g = ctx.createGain();
    src.connect(g);
    g.connect(master);

    var peak = opts.stutter ? 0.92 : 1;
    var atk = Math.min(attack, playDur * 0.45);
    var rel = Math.min(release, Math.max(0.001, playDur - atk));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + atk);
    var relStart = t0 + playDur - rel;
    if (relStart > t0 + atk) {
      g.gain.setValueAtTime(peak, relStart);
    }
    g.gain.linearRampToValueAtTime(0.0001, t0 + playDur);

    src.start(t0, 0, playDur + 0.02);
    activeSources.push(src);
    src.onended = function () {
      var idx = activeSources.indexOf(src);
      if (idx >= 0) activeSources.splice(idx, 1);
    };
    return src;
  }

  function playCellHits(buffer, when, env, stepDur, reps) {
    reps = Math.max(1, Math.min(5, reps || 1));
    if (reps === 1) {
      playSliceAt(buffer, when, env, { maxDur: stepDur * 0.98 });
      return;
    }
    var slot = stepDur / reps;
    for (var r = 0; r < reps; r++) {
      playSliceAt(buffer, when + r * slot, env, {
        maxDur: slot * 0.88,
        stutter: true
      });
    }
  }

  function previewSlice(si, ring, reps, segBeats) {
    ensureAudio();
    if (ctx.state === 'suspended') ctx.resume();
    var slice = slices[si];
    if (!slice) return;
    if (slice.slot !== activeSlot) {
      setActiveSlot(slice.slot);
    }
    highlightSlice = si;
    drawWaveform();
    var env = ring || rings[editRing >= 0 ? editRing : 0] || defaultEnv();
    var step = beatsToSec(segBeats != null ? segBeats : (slice.beats || 0.25));
    playCellHits(slice.buffer, ctx.currentTime, env, step, reps || 1);
    startVizLoop();
    var ms = Math.max(80, step * 1000);
    setTimeout(function () {
      if (highlightSlice === si && !playing) {
        highlightSlice = -1;
        drawWaveform();
      }
    }, ms);
  }

  function buildPeaks(buffer, fromSec, toSec, cols) {
    if (!buffer) return null;
    var data = buffer.getChannelData(0);
    var sr = buffer.sampleRate;
    var start = Math.max(0, Math.floor(fromSec * sr));
    var end = Math.min(data.length, Math.floor(toSec * sr));
    var len = Math.max(1, end - start);
    var peaks = new Float32Array(cols);
    var block = Math.max(1, Math.floor(len / cols));
    for (var i = 0; i < cols; i++) {
      var a = start + i * block;
      var b = Math.min(end, a + block);
      var peak = 0;
      for (var j = a; j < b; j++) {
        var v = Math.abs(data[j]);
        if (v > peak) peak = v;
      }
      peaks[i] = peak;
    }
    return peaks;
  }

  function rebuildPeaksForSlot(slotIdx) {
    var slot = slots[slotIdx];
    fullPeaksBySlot[slotIdx] = null;
    windowPeaksBySlot[slotIdx] = null;
    if (!slot || !slot.buffer) return;
    fullPeaksBySlot[slotIdx] = buildPeaks(slot.buffer, 0, slotDuration(slotIdx), 900);
    rebuildWindowPeaksForSlot(slotIdx);
  }

  function rebuildWindowPeaksForSlot(slotIdx) {
    var slot = slots[slotIdx];
    if (!slot || !slot.buffer) return;
    var w0 = slot.windowStart;
    var w1 = w0 + windowDurationForSlot(slotIdx);
    windowPeaksBySlot[slotIdx] = buildPeaks(slot.buffer, w0, w1, 1000);
  }

  function rebuildAllPeaks() {
    for (var i = 0; i < SLOT_COUNT; i++) {
      rebuildPeaksForSlot(i);
    }
  }

  function sizeCanvas(canvas, wrap) {
    if (!canvas || !wrap) return false;
    var rect = wrap.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.floor(rect.width * dpr));
    var h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  function sizeCanvases() {
    sizeCanvas(waveCanvas, waveWrap);
    if (specCanvas && waveCanvas) {
      specCanvas.width = waveCanvas.width;
      specCanvas.height = waveCanvas.height;
    }
    sizeCanvas(overviewCanvas, overviewWrap);
  }

  function drawOverview() {
    if (!overviewCtx2d || !overviewCanvas) return;
    sizeCanvas(overviewCanvas, overviewWrap);
    var w = overviewCanvas.width;
    var h = overviewCanvas.height;
    overviewCtx2d.clearRect(0, 0, w, h);
    overviewCtx2d.fillStyle = '#0c0c10';
    overviewCtx2d.fillRect(0, 0, w, h);

    var slot = activeSample();
    var fullPeaks = fullPeaksBySlot[activeSlot];
    if (!slot || !slot.buffer || !fullPeaks) return;

    var mid = h * 0.5;
    var amp = h * 0.38;
    overviewCtx2d.beginPath();
    for (var i = 0; i < fullPeaks.length; i++) {
      var x = (i / (fullPeaks.length - 1)) * w;
      var y = fullPeaks[i] * amp;
      if (i === 0) overviewCtx2d.moveTo(x, mid - y);
      else overviewCtx2d.lineTo(x, mid - y);
    }
    for (var k = fullPeaks.length - 1; k >= 0; k--) {
      overviewCtx2d.lineTo((k / (fullPeaks.length - 1)) * w, mid + fullPeaks[k] * amp);
    }
    overviewCtx2d.closePath();
    overviewCtx2d.fillStyle = 'rgba(180, 180, 190, 0.35)';
    overviewCtx2d.fill();

    var total = slotDuration(activeSlot);
    if (!(total > 0)) return;
    var w0 = slot.windowStart;
    var x0 = (w0 / total) * w;
    var x1 = ((w0 + windowDurationForSlot(activeSlot)) / total) * w;
    overviewCtx2d.fillStyle = 'rgba(200, 255, 0, 0.18)';
    overviewCtx2d.fillRect(x0, 0, Math.max(2, x1 - x0), h);
    overviewCtx2d.strokeStyle = SLOT_COLORS[activeSlot] || '#c8ff00';
    overviewCtx2d.lineWidth = Math.max(1, w *  0.002);
    overviewCtx2d.strokeRect(x0 + 0.5, 0.5, Math.max(2, x1 - x0 - 1), h - 1);
  }

  function drawWaveform() {
    sizeCanvases();
    if (!waveCtx2d || !waveCanvas) return;
    var w = waveCanvas.width;
    var h = waveCanvas.height;
    waveCtx2d.clearRect(0, 0, w, h);
    waveCtx2d.fillStyle = '#0c0c10';
    waveCtx2d.fillRect(0, 0, w, h);

    var slot = activeSample();
    var windowPeaks = windowPeaksBySlot[activeSlot];
    var activeSlices = activeSlotSlices();

    if (!slot || !slot.buffer || !windowPeaks) {
      if (waveEmpty) waveEmpty.hidden = false;
      drawOverview();
      return;
    }
    if (waveEmpty) waveEmpty.hidden = activeSlices.length > 0;

    var winDur = windowDurationForSlot(activeSlot);
    if (!(winDur > 0)) return;
    var mid = h * 0.5;
    var amp = h * 0.42;

    for (var s = 0; s < activeSlices.length; s++) {
      var sl = activeSlices[s];
      var x0 = (sl.relStart / winDur) * w;
      var x1 = (sl.relEnd / winDur) * w;
      waveCtx2d.fillStyle = sl.color;
      waveCtx2d.globalAlpha = (sl.index === highlightSlice) ? 0.4 : 0.18;
      waveCtx2d.fillRect(x0, 0, Math.max(1, x1 - x0), h);
    }
    waveCtx2d.globalAlpha = 1;

    var peaks = windowPeaks;
    waveCtx2d.beginPath();
    for (var i = 0; i < peaks.length; i++) {
      var x = (i / (peaks.length - 1)) * w;
      var y = peaks[i] * amp;
      if (i === 0) waveCtx2d.moveTo(x, mid - y);
      else waveCtx2d.lineTo(x, mid - y);
    }
    for (var k = peaks.length - 1; k >= 0; k--) {
      waveCtx2d.lineTo((k / (peaks.length - 1)) * w, mid + peaks[k] * amp);
    }
    waveCtx2d.closePath();
    waveCtx2d.fillStyle = 'rgba(232, 232, 240, 0.62)';
    waveCtx2d.fill();

    var labelEvery = activeSlices.length > 32 ? 4 : (activeSlices.length > 16 ? 2 : 1);
    for (var c = 0; c < activeSlices.length; c++) {
      var cut = activeSlices[c];
      var cx = (cut.relStart / winDur) * w;
      waveCtx2d.strokeStyle = cut.color;
      waveCtx2d.globalAlpha = 0.95;
      waveCtx2d.lineWidth = Math.max(1.5, w * 0.0018);
      waveCtx2d.beginPath();
      waveCtx2d.moveTo(cx, 0);
      waveCtx2d.lineTo(cx, h);
      waveCtx2d.stroke();
      if (c % labelEvery === 0) {
        waveCtx2d.fillStyle = cut.color;
        waveCtx2d.font = 'bold ' + Math.max(10, Math.floor(h * 0.13)) + 'px IBM Plex Sans, sans-serif';
        waveCtx2d.fillText(String(cut.localIndex + 1), cx + 4, 14 * (window.devicePixelRatio || 1));
      }
    }
    waveCtx2d.globalAlpha = 1;
    drawOverview();
  }

  function drawSpectrum() {
    if (!specCtx2d || !specCanvas || !analyser || !analyserData) return;
    var w = specCanvas.width;
    var h = specCanvas.height;
    specCtx2d.clearRect(0, 0, w, h);
    if (!playing && highlightSlice < 0) return;
    analyser.getByteFrequencyData(analyserData);
    var bars = Math.min(64, analyserData.length);
    var gap = 2;
    var bw = Math.max(1, (w / bars) - gap);
    for (var i = 0; i < bars; i++) {
      var v = analyserData[i] / 255;
      var bh = v * h * 0.85;
      var color = highlightSlice >= 0 && slices[highlightSlice]
        ? slices[highlightSlice].color
        : SLICE_COLORS[i % SLICE_COLORS.length];
      specCtx2d.fillStyle = color;
      specCtx2d.globalAlpha = 0.28 + v * 0.4;
      specCtx2d.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
    specCtx2d.globalAlpha = 1;
  }

  function vizLoop() {
    drawSpectrum();
    if (playing || highlightSlice >= 0) {
      vizRaf = requestAnimationFrame(vizLoop);
    } else {
      vizRaf = 0;
      if (specCtx2d && specCanvas) specCtx2d.clearRect(0, 0, specCanvas.width, specCanvas.height);
    }
  }

  function startVizLoop() {
    if (vizRaf) return;
    vizRaf = requestAnimationFrame(vizLoop);
  }

  function sliceIndexAtClientX(clientX) {
    var activeSlices = activeSlotSlices();
    if (!activeSample() || !activeSample().buffer || !activeSlices.length || !waveWrap) return -1;
    var rect = waveWrap.getBoundingClientRect();
    var t = (clientX - rect.left) / Math.max(1, rect.width);
    t = Math.max(0, Math.min(0.9999, t));
    var rel = t * windowDurationForSlot(activeSlot);
    for (var i = 0; i < activeSlices.length; i++) {
      if (rel >= activeSlices[i].relStart && rel < activeSlices[i].relEnd) {
        return activeSlices[i].index;
      }
    }
    return activeSlices[activeSlices.length - 1].index;
  }

  function setWindowStart(sec, reslice) {
    var slot = activeSample();
    if (!slot || !slot.buffer) return;
    slot.windowStart = clampWindowStartForSlot(activeSlot, sec);
    if (windowStartEl) {
      windowStartEl.value = String(slot.windowStart);
      windowStartVal.textContent = slot.windowStart.toFixed(1) + 's';
    }
    updateWindowLabels();
    rebuildWindowPeaksForSlot(activeSlot);
    if (reslice) {
      chopAllSlots();
      sprinkle();
      drawRings();
    }
    drawWaveform();
    updateMeta();
  }

  function syncWindowSlider() {
    if (!windowStartEl) return;
    var slot = activeSample();
    var max = slot && slot.buffer ? maxWindowStartForSlot(activeSlot) : 0;
    windowStartEl.min = '0';
    windowStartEl.max = String(max);
    windowStartEl.step = max > 60 ? '0.1' : '0.01';
    windowStartEl.disabled = !slot || !slot.buffer || max <= 0;
    if (slot && slot.buffer) {
      slot.windowStart = clampWindowStartForSlot(activeSlot, slot.windowStart);
      windowStartEl.value = String(slot.windowStart);
      windowStartVal.textContent = slot.windowStart.toFixed(1) + 's';
    } else {
      windowStartVal.textContent = '0.0s';
    }
    updateWindowLabels();
  }

  function updateWindowLabels() {
    if (!windowRangeLab) return;
    var slot = activeSample();
    if (!slot || !slot.buffer) {
      windowRangeLab.textContent = 'Window —';
      return;
    }
    var w0 = slot.windowStart;
    var w1 = w0 + windowDurationForSlot(activeSlot);
    windowRangeLab.textContent =
      'Window ' + w0.toFixed(1) + '–' + w1.toFixed(1) + 's' +
      ' / ' + slotDuration(activeSlot).toFixed(1) + 's file';
  }

  function chopSlotAtBeats(slotIdx, beats) {
    var slot = slots[slotIdx];
    if (!slot || !slot.buffer) return;
    ensureAudio();
    var dur = beatsToSec(beats);
    if (!(dur > 0)) return;
    var w0 = slot.windowStart;
    var wDur = windowDurationForSlot(slotIdx);
    var w1 = w0 + wDur;
    var n = Math.floor(wDur / dur);
    if (n < 1) {
      n = 1;
      dur = wDur;
    }
    var sr = slot.buffer.sampleRate;
    var channels = slot.buffer.numberOfChannels;
    var key = beatKey(beats);
    if (!slicesBySlotBeats[slotIdx][key]) slicesBySlotBeats[slotIdx][key] = [];
    var localIndex = slicesBySlotBeats[slotIdx][key].length;

    for (var i = 0; i < n; i++) {
      var absStart = w0 + i * dur;
      var absEnd = Math.min(w1, w0 + (i + 1) * dur);
      var startSample = Math.floor(absStart * sr);
      var endSample = Math.min(slot.buffer.length, Math.floor(absEnd * sr));
      var len = Math.max(1, endSample - startSample);
      var buf = ctx.createBuffer(channels, len, sr);
      for (var c = 0; c < channels; c++) {
        var src = slot.buffer.getChannelData(c);
        var dst = buf.getChannelData(c);
        dst.set(src.subarray(startSample, startSample + len));
      }
      var relStart = absStart - w0;
      var globalIndex = slices.length;
      slices.push({
        buffer: buf,
        index: globalIndex,
        localIndex: localIndex,
        slot: slotIdx,
        beats: beats,
        color: sliceColorForSlot(slotIdx, localIndex),
        relStart: relStart,
        relEnd: relStart + len / sr,
        absStart: absStart,
        absEnd: absStart + len / sr
      });
      slicesBySlot[slotIdx].push(globalIndex);
      slicesBySlotBeats[slotIdx][key].push(globalIndex);
      localIndex += 1;
    }
  }

  function chopSlot(slotIdx) {
    var opts = getEnabledDurations();
    if (!opts.length) opts = [{ beats: 0.25, priority: 1 }];
    opts.forEach(function (o) {
      chopSlotAtBeats(slotIdx, o.beats);
    });
  }

  function chopAllSlots() {
    slices = [];
    slicesBySlot = [[], [], []];
    slicesBySlotBeats = [{}, {}, {}];
    loadedSlots().forEach(function (slotIdx) {
      chopSlot(slotIdx);
    });
  }

  function poolForSlotBeats(slotIdx, beats) {
    var map = slicesBySlotBeats[slotIdx] || {};
    return map[beatKey(beats)] || [];
  }

  function pickWeightedSlot(loaded) {
    var total = 0;
    var weights = [];
    for (var i = 0; i < loaded.length; i++) {
      var w = getSlotWeight(loaded[i]);
      weights.push(w);
      total += w;
    }
    if (!(total > 0)) return loaded[0];
    var r = Math.random() * total;
    for (var j = 0; j < loaded.length; j++) {
      r -= weights[j];
      if (r <= 0) return loaded[j];
    }
    return loaded[loaded.length - 1];
  }

  function assignSlotsToCells(flat, loaded) {
    var result = [];
    var mix = getMixMode();
    if (mix === 'equal') {
      var n = flat.length;
      var k = loaded.length;
      var per = Math.floor(n / k);
      var rem = n % k;
      var fi = 0;
      for (var li = 0; li < k; li++) {
        var count = per + (li < rem ? 1 : 0);
        for (var c = 0; c < count; c++) {
          result[fi++] = loaded[li];
        }
      }
    } else {
      for (var i = 0; i < flat.length; i++) {
        result[i] = pickWeightedSlot(loaded);
      }
    }
    return result;
  }

  function pickSliceFromPool(pool, mode, seqCursor) {
    if (!pool || !pool.length) return null;
    if (mode === 'random' || mode === 'breaker') {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    var idx = seqCursor % pool.length;
    return pool[idx];
  }

  function sprinkle() {
    if (!rings.length) return;
    var loaded = loadedSlots();
    rings.forEach(function (ring) {
      ring.cells = Array(ring.segments).fill(null);
    });
    if (!loaded.length) return;

    var mode = getSprinkleMode();
    var flat = [];
    rings.forEach(function (ring, ri) {
      for (var i = 0; i < ring.segments; i++) {
        flat.push({ ringIdx: ri, segIdx: i });
      }
    });

    var slotForCell = assignSlotsToCells(flat, loaded);
    var seqCursors = {};

    flat.forEach(function (pos, fi) {
      var slotIdx = slotForCell[fi];
      var ring = rings[pos.ringIdx];
      var beats = (ring.segBeats && ring.segBeats[pos.segIdx]) || 0.25;
      var pool = poolForSlotBeats(slotIdx, beats);
      if (!pool.length) pool = slicesBySlot[slotIdx] || [];
      if (!pool.length) return;

      var cursorKey = slotIdx + ':' + beatKey(beats);
      if (seqCursors[cursorKey] == null) seqCursors[cursorKey] = 0;

      if (mode === 'breaker') {
        if (Math.random() < getBreakSkipChance()) return;
        var si = pickSliceFromPool(pool, 'random', 0);
        var reps = 1;
        if (Math.random() < getBreakStutterChance()) {
          reps = pickStutterReps();
        }
        rings[pos.ringIdx].cells[pos.segIdx] = makeCell(si, reps);
        return;
      }

      if (mode === 'random') {
        var siRand = pickSliceFromPool(pool, 'random', 0);
        rings[pos.ringIdx].cells[pos.segIdx] = makeCell(siRand, 1);
        return;
      }

      var cursor = seqCursors[cursorKey];
      var siSeq = pickSliceFromPool(pool, 'sequential', cursor);
      seqCursors[cursorKey] = cursor + 1;
      rings[pos.ringIdx].cells[pos.segIdx] = makeCell(siSeq, 1);
    });

    if (mode === 'sequential') {
      var swapAmt = getSeqSwapAmount();
      rings.forEach(function (ring) {
        applyNeighborSwaps(ring.cells, swapAmt, ring.segBeats);
      });
    }
    rebuildPlayTimeline();
  }

  function syncControlsEnabled() {
    var ok = hasSamples() && slices.length > 0;
    hubBtn.disabled = !ok;
    resliceBtn.disabled = !hasSamples();
  }

  function updateMeta() {
    if (!hasSamples()) {
      sliceMeta.textContent = 'Upload samples to begin';
      playMeta.textContent = 'Idle';
      if (waveHint) waveHint.textContent = 'Max 20s — pick part to slice';
      syncControlsEnabled();
      return;
    }

    var opts = getEnabledDurations();
    var label = opts.map(function (o) {
      return o.label + '(p' + o.priority + ')';
    }).join('+') || '¼b';
    var need = 0;
    rings.forEach(function (r) { need += r.segments; });
    var reuse = need > slices.length;
    var mode = getSprinkleMode();
    var modeLab = mode;
    var loaded = loadedSlots();

    if (mode === 'sequential' && getSeqSwapAmount() > 0) {
      modeLab = 'sequential · neighbor ' + getSeqSwapAmount() + '%';
    }
    if (mode === 'breaker') {
      var skips = 0;
      var stutters = 0;
      rings.forEach(function (ring) {
        ring.cells.forEach(function (cell) {
          if (cellSi(cell) == null) skips += 1;
          else if (cellReps(cell) > 1) stutters += 1;
        });
      });
      modeLab =
        'breaker · skip ' + Math.round(getBreakSkipChance() * 100) +
        '% · stutter ' + Math.round(getBreakStutterChance() * 100) +
        '% · ×' + getBreakIntensity() +
        ' · ' + skips + '/' + stutters;
    }

    var mixLab = getMixMode() === 'equal' ? 'equal split' : 'weighted';
    sliceMeta.textContent =
      slices.length + ' chops · ' + loaded.length + ' sample' + (loaded.length > 1 ? 's' : '') +
      (reuse ? ' (reuse)' : '') +
      ' · ' + label + ' @ ' + getBpm() + ' BPM · ' + mixLab + ' · ' + modeLab;

    var segs = rings[0] ? rings[0].segments : 0;
    var beatSum = 0;
    if (rings[0] && rings[0].segBeats) {
      rings[0].segBeats.forEach(function (b) { beatSum += b; });
    }
    playMeta.textContent =
      rings.length + ' rings · ~' + segs + ' segs · ring ≤4 beats (' +
      beatSum.toFixed(2) + 'b outer) · bar ' + barDurationSec().toFixed(2) + 's';

    if (waveHint) {
      var activeSlices = activeSlotSlices();
      waveHint.textContent =
        activeSlices.length + ' cuts in window · click band to audition · drag overview to move';
    }
    syncControlsEnabled();
  }

  function resliceAndDraw() {
    if (!hasSamples()) {
      slices = [];
      slicesBySlot = [[], [], []];
      slicesBySlotBeats = [{}, {}, {}];
      buildRingsGeometry();
      drawRings();
      drawWaveform();
      updateMeta();
      return;
    }
    ensureAudio();
    loadedSlots().forEach(function (idx) {
      slots[idx].windowStart = clampWindowStartForSlot(idx, slots[idx].windowStart);
    });
    syncWindowSlider();
    rebuildAllPeaks();
    chopAllSlots();
    buildRingsGeometry();
    sprinkle();
    drawRings();
    drawWaveform();
    updateMeta();
  }

  function resprinkleOnly() {
    if (playing) stopPlay();
    if (!hasSamples()) {
      updateMeta();
      return;
    }
    sprinkle();
    drawRings();
    updateMeta();
  }

  async function loadFile(file, slotIdx) {
    if (!file) return;
    ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    var arr = await file.arrayBuffer();
    var buf = await ctx.decodeAudioData(arr.slice(0));
    if (slotIdx == null) slotIdx = targetSlotForUpload();
    slots[slotIdx].buffer = buf;
    slots[slotIdx].name = file.name || 'sample';
    slots[slotIdx].windowStart = 0;
    activeSlot = slotIdx;
    renderSampleSlots();
    renderWeightSliders();
    updateActiveSampleLab();
    rebuildPeaksForSlot(slotIdx);
    syncWindowSlider();
    resliceAndDraw();
  }

  function flatStep(step) {
    if (!playTimeline.length || !rings.length) return null;
    var item = playTimeline[step % playTimeline.length];
    var ring = rings[item.ringIdx];
    var cell = ring.cells[item.segIdx];
    return {
      ring: ring,
      ringIdx: item.ringIdx,
      segIdx: item.segIdx,
      beats: item.beats,
      cell: cell,
      si: cellSi(cell),
      reps: cellReps(cell)
    };
  }

  function schedule() {
    if (!playing || !ctx) return;
    while (nextStepTime < ctx.currentTime + LOOK_AHEAD) {
      var info = flatStep(stepCursor);
      var stepDur = beatsToSec(info && info.beats ? info.beats : 0.25);
      if (info && info.si != null && slices[info.si]) {
        playCellHits(slices[info.si].buffer, nextStepTime, info.ring, stepDur, info.reps);
        flashSeg(info.ring.id, info.segIdx, info.reps);
        highlightSlice = info.si;
        drawWaveform();
      }
      nextStepTime += stepDur;
      stepCursor += 1;
    }
  }

  function flashSeg(ringId, i, reps) {
    var el = segEls[ringId + ':' + i];
    if (!el) return;
    el.style.filter = reps > 1 ? 'brightness(1.7)' : 'brightness(1.45)';
    setTimeout(function () {
      el.style.filter = '';
    }, reps > 1 ? 120 : 90);
  }

  function updatePlayhead() {
    if (!playheadEl || !ctx) return;
    if (!playing || !playTimeline.length) {
      playheadEl.setAttribute('transform', 'rotate(0 ' + CX + ' ' + CY + ')');
      return;
    }
    // Progress within current ring as fraction of 4 beats
    var idx = Math.max(0, stepCursor - 1) % playTimeline.length;
    var item = playTimeline[idx];
    var ring = rings[item.ringIdx];
    var beatsBefore = 0;
    for (var i = 0; i < item.segIdx; i++) {
      beatsBefore += ring.segBeats[i] || 0;
    }
    var stepDur = beatsToSec(item.beats);
    var elapsedInStep = stepDur - Math.max(0, nextStepTime - ctx.currentTime);
    var fracInSeg = Math.max(0, Math.min(1, elapsedInStep / Math.max(0.001, stepDur)));
    var beatsPos = beatsBefore + item.beats * fracInSeg;
    var deg = (beatsPos / BEATS_PER_BAR) * 360;
    playheadEl.setAttribute('transform', 'rotate(' + deg + ' ' + CX + ' ' + CY + ')');
  }

  function playheadLoop() {
    updatePlayhead();
    if (playing) playheadRaf = requestAnimationFrame(playheadLoop);
  }

  function setHubPlaying(on) {
    hubBtn.classList.toggle('is-playing', on);
    circleWrap.classList.toggle('is-playing', on);
    hubIcon.innerHTML = on
      ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
      : '<path d="M8 5v14l11-7z"/>';
  }

  function startPlay() {
    if (!slices.length) return;
    ensureAudio();
    if (ctx.state === 'suspended') ctx.resume();
    stopActiveSources();
    playing = true;
    stepCursor = 0;
    rebuildPlayTimeline();
    nextStepTime = ctx.currentTime + 0.06;
    setHubPlaying(true);
    schedule();
    scheduleTimer = setInterval(schedule, SCHEDULE_MS);
    cancelAnimationFrame(playheadRaf);
    playheadRaf = requestAnimationFrame(playheadLoop);
    startVizLoop();
    playMeta.textContent = 'Playing';
  }

  function stopPlay() {
    playing = false;
    clearInterval(scheduleTimer);
    scheduleTimer = 0;
    cancelAnimationFrame(playheadRaf);
    playheadRaf = 0;
    stopActiveSources();
    highlightSlice = -1;
    setHubPlaying(false);
    updatePlayhead();
    drawWaveform();
    updateMeta();
  }

  function togglePlay() {
    if (playing) stopPlay();
    else startPlay();
  }

  function startApp() {
    launchOverlay.classList.add('hidden');
    appRoot.hidden = false;
    ensureAudio();
    renderSampleSlots();
    renderWeightSliders();
    updateActiveSampleLab();
    buildRingsGeometry();
    drawRings();
    drawWaveform();
    updateMeta();
    requestAnimationFrame(drawWaveform);
  }

  function overviewSecFromClientX(clientX) {
    var slot = activeSample();
    if (!overviewWrap || !slot || !slot.buffer) return 0;
    var rect = overviewWrap.getBoundingClientRect();
    var t = (clientX - rect.left) / Math.max(1, rect.width);
    t = Math.max(0, Math.min(1, t));
    return clampWindowStartForSlot(activeSlot, t * slotDuration(activeSlot) - windowDurationForSlot(activeSlot) / 2);
  }

  // —— Events ——
  launchGo.addEventListener('click', startApp);
  launchOverlay.addEventListener('click', function (e) {
    if (e.target === launchOverlay || e.target === launchGo) startApp();
  });

  bpmEl.addEventListener('input', function () {
    bpmVal.textContent = String(getBpm());
    if (playing) stopPlay();
    resliceAndDraw();
  });

  sprinkleModeEl.addEventListener('change', function () {
    if (playing) stopPlay();
    syncModePanels();
    if (!hasSamples()) {
      updateMeta();
      return;
    }
    sprinkle();
    drawRings();
    updateMeta();
  });

  if (seqSwapEl) {
    seqSwapEl.addEventListener('input', function () {
      syncModePanels();
      if (getSprinkleMode() !== 'sequential') return;
      resprinkleOnly();
    });
  }

  function onBreakerParamInput() {
    markBreakerCustom();
    syncBreakerSliderLabels();
    if (getSprinkleMode() !== 'breaker') return;
    resprinkleOnly();
  }

  if (breakSkipEl) breakSkipEl.addEventListener('input', onBreakerParamInput);
  if (breakStutterEl) breakStutterEl.addEventListener('input', onBreakerParamInput);
  if (breakIntensityEl) breakIntensityEl.addEventListener('input', onBreakerParamInput);

  if (mixModeEl) {
    mixModeEl.addEventListener('change', function () {
      syncMixUi();
      resprinkleOnly();
    });
  }

  ringCountEl.addEventListener('input', function () {
    ringCountVal.textContent = String(getRingCount());
    if (playing) stopPlay();
    resliceAndDraw();
  });

  resliceBtn.addEventListener('click', function () {
    if (playing) stopPlay();
    resliceAndDraw();
  });

  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    if (playing) stopPlay();
    loadFile(f).catch(function (err) {
      console.error(err);
      sliceMeta.textContent = 'Could not decode that file';
    });
    fileInput.value = '';
  });

  hubBtn.addEventListener('click', togglePlay);

  if (windowStartEl) {
    windowStartEl.addEventListener('input', function () {
      if (playing) stopPlay();
      setWindowStart(Number(windowStartEl.value) || 0, true);
    });
  }

  [ringAttackEl, ringReleaseEl, ringDurEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', applyEnvFromUi);
  });

  if (waveWrap) {
    waveWrap.addEventListener('click', function (e) {
      var si = sliceIndexAtClientX(e.clientX);
      if (si < 0) return;
      var ring = rings[editRing >= 0 ? editRing : 0];
      var slice = slices[si];
      previewSlice(si, ring, 1, slice && slice.beats);
    });
  }

  if (overviewWrap) {
    overviewWrap.addEventListener('pointerdown', function (e) {
      overviewDrag = true;
      overviewWrap.setPointerCapture(e.pointerId);
      if (playing) stopPlay();
      setWindowStart(overviewSecFromClientX(e.clientX), true);
    });
    overviewWrap.addEventListener('pointermove', function (e) {
      if (!overviewDrag) return;
      setWindowStart(overviewSecFromClientX(e.clientX), true);
    });
    overviewWrap.addEventListener('pointerup', function () {
      overviewDrag = false;
    });
    overviewWrap.addEventListener('pointercancel', function () {
      overviewDrag = false;
    });
  }

  window.addEventListener('resize', function () {
    drawWaveform();
  });

  buildRingsGeometry();
  drawRings();
  renderDurationOptions();
  renderSampleSlots();
  renderWeightSliders();
  renderBreakerPresets();
  applyBreakerPreset('balanced', false);
  syncModePanels();
})();

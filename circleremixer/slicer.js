/**
 * Circle Remixer — upload up to 3 samples, chop ≤20s windows by BPM, sprinkle onto rings.
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
  var LOOK_AHEAD = 0.28;
  var SCHEDULE_MS = 25;
  var BEATS_PER_BAR = 4;
  var WINDOW_MAX = 20;
  var SLOT_COUNT = 3;

  /** Available slice durations (beats). Array order = priority (top / first = most likely). */
  var DURATION_DEFS = [
    { beats: 0.25, label: '1/4', on: true },
    { beats: 0.5, label: '1/2', on: true },
    { beats: 1, label: '1', on: true },
    { beats: 0.125, label: '1/8', on: false },
    { beats: 2, label: '2', on: false },
    { beats: 3, label: '3', on: false },
    { beats: 4, label: '4', on: false }
  ];
  var durDragFrom = -1;

  var SLOT_COLORS = ['#c8ff00', '#ff6a00', '#4f9ad4'];
  var SLICE_COLORS = [
    '#ff6a00', '#c43dff', '#ff2d8a', '#1eea4a', '#ffd000',
    '#ff3b1a', '#a34dff', '#e85d04', '#7b2cbf', '#4f9ad4',
    '#c8ff00', '#ff8fab', '#00c2a8', '#f4a261', '#9b5de5'
  ];
  var EMPTY_A = '#1e1e24';
  var EMPTY_B = '#222228';
  var DEFAULT_ENV = { attackMs: 4, releaseMs: 35, durationPct: 100, reversePct: 0 };
  var RELEASE_MAX_MS = 120;

  function clampReleaseMs(v) {
    return Math.max(0, Math.min(RELEASE_MAX_MS, Number(v) || 0));
  }
  var PCT_OPTIONS = [0, 12, 34, 67, 89, 100];
  var DUR_PCT_OPTIONS = [12, 34, 67, 89, 100];
  var revBufferCache = new WeakMap();

  var launchOverlay = document.getElementById('launchOverlay');
  var launchGo = document.getElementById('launchGo');
  var appTitleBtn = document.getElementById('appTitleBtn');
  var aboutModal = document.getElementById('aboutModal');
  var aboutModalClose = document.getElementById('aboutModalClose');
  var stageVideoStack = document.getElementById('stageVideoStack');
  var preloadOverlay = document.getElementById('preloadOverlay');
  var preloadBarFill = document.getElementById('preloadBarFill');
  var preloadPct = document.getElementById('preloadPct');
  var preloadTitle = document.getElementById('preloadTitle');
  var videoCueTimers = [];
  var liveVideoSlot = -1;
  var appRoot = document.getElementById('appRoot');
  var svg = document.getElementById('ringSvg');
  var hubBtn = document.getElementById('hubBtn');
  var hubIcon = document.getElementById('hubIcon');
  var circleWrap = document.getElementById('circleWrap');
  var bpmEl = document.getElementById('bpm');
  var bpmVal = document.getElementById('bpmVal');
  var sliceDursEl = document.getElementById('sliceDurs');
  var durDropBtn = document.getElementById('durDropBtn');
  var durDropSummary = document.getElementById('durDropSummary');
  var durMenu = document.getElementById('durMenu');
  var durMenuRows = document.getElementById('durMenuRows');
  var durMenuApply = document.getElementById('durMenuApply');
  var durMenuCancel = document.getElementById('durMenuCancel');
  var orderModeEl = document.getElementById('orderMode');
  var durMenuOpen = false;
  var settingsPending = false;
  var settingsSnapshot = null;
  var menuBtn = document.getElementById('menuBtn');
  var appMenu = document.getElementById('appMenu');
  var menuFileBtn = document.getElementById('menuFileBtn');
  var menuFileSub = document.getElementById('menuFileSub');
  var menuUploadBtn = document.getElementById('menuUploadBtn');
  var menuSaveBtn = document.getElementById('menuSaveBtn');
  var menuSettingsBtn = document.getElementById('menuSettingsBtn');
  var settingsModal = document.getElementById('settingsModal');
  var settingsCancel = document.getElementById('settingsCancel');
  var settingsApply = document.getElementById('settingsApply');
  var seqSwapEl = document.getElementById('seqSwap');
  var seqSwapVal = document.getElementById('seqSwapVal');
  var seqSwapWrap = document.getElementById('seqSwapWrap');
  var breakerPanel = document.getElementById('breakerPanel');
  var breakerPresetsEl = document.getElementById('breakerPresets');
  var breakerPresetHint = document.getElementById('breakerPresetHint');
  var macroModeEl = document.getElementById('macroMode');
  var diceBtn = document.getElementById('diceBtn');
  var breakSkipEl = document.getElementById('breakSkip');
  var breakStutterEl = document.getElementById('breakStutter');
  var breakIntensityEl = document.getElementById('breakIntensity');
  var breakSkipVal = document.getElementById('breakSkipVal');
  var breakStutterVal = document.getElementById('breakStutterVal');
  var breakIntensityVal = document.getElementById('breakIntensityVal');
  var applyToAllBtn = document.getElementById('applyToAllBtn');

  /** Macro presets: skip/stutter/intensity + order + ring play shape + reverse. */
  var BREAKER_PRESETS = [
    { id: 'balanced', label: 'Balance', skip: 0, stutter: 34, intensity: 3, order: 'random', neighbor: 34, reverse: 0, attackMs: 4, releaseMs: 90, durationPct: 100 },
    { id: 'airy', label: 'Break', skip: 12, stutter: 12, intensity: 2, order: 'random', neighbor: 12, reverse: 0, attackMs: 8, releaseMs: 110, durationPct: 89 },
    { id: 'chop', label: 'Stutter', skip: 0, stutter: 67, intensity: 4, order: 'random', neighbor: 34, reverse: 12, attackMs: 2, releaseMs: 55, durationPct: 89 },
    { id: 'glitch', label: 'Glitch', skip: 12, stutter: 67, intensity: 5, order: 'random', neighbor: 34, reverse: 34, attackMs: 1, releaseMs: 48, durationPct: 67 },
    { id: 'sparse', label: 'Sparse', skip: 12, stutter: 34, intensity: 3, order: 'random', neighbor: 12, reverse: 0, attackMs: 12, releaseMs: 120, durationPct: 89 },
    { id: 'soft', label: 'Soft', skip: 0, stutter: 34, intensity: 2, order: 'sequential', neighbor: 34, reverse: 0, attackMs: 18, releaseMs: 120, durationPct: 100 },
    { id: 'straight', label: 'Straight', skip: 0, stutter: 12, intensity: 2, order: 'sequential', neighbor: 0, reverse: 0, attackMs: 4, releaseMs: 100, durationPct: 100 },
    { id: 'march', label: 'March', skip: 0, stutter: 12, intensity: 2, order: 'sequential', neighbor: 67, reverse: 0, attackMs: 6, releaseMs: 100, durationPct: 100 },
    { id: 'ghost', label: 'Ghost', skip: 12, stutter: 12, intensity: 2, order: 'sequential', neighbor: 12, reverse: 34, attackMs: 24, releaseMs: 120, durationPct: 67 },
    { id: 'flip', label: 'Flip', skip: 0, stutter: 34, intensity: 3, order: 'random', neighbor: 34, reverse: 67, attackMs: 6, releaseMs: 100, durationPct: 89 },
    { id: 'tape', label: 'Tape', skip: 0, stutter: 34, intensity: 4, order: 'random', neighbor: 34, reverse: 89, attackMs: 12, releaseMs: 120, durationPct: 89 },
    { id: 'mirror', label: 'Mirror', skip: 0, stutter: 12, intensity: 3, order: 'sequential', neighbor: 12, reverse: 100, attackMs: 6, releaseMs: 100, durationPct: 100 },
    { id: 'snap', label: 'Snap', skip: 0, stutter: 67, intensity: 5, order: 'sequential', neighbor: 34, reverse: 12, attackMs: 0, releaseMs: 28, durationPct: 67 },
    { id: 'haze', label: 'Haze', skip: 0, stutter: 12, intensity: 2, order: 'sequential', neighbor: 12, reverse: 12, attackMs: 36, releaseMs: 120, durationPct: 100 },
    { id: 'chaos', label: 'Chaos', skip: 12, stutter: 67, intensity: 5, order: 'random', neighbor: 67, reverse: 100, attackMs: 0, releaseMs: 70, durationPct: 67 }
  ];
  var activeBreakerPreset = 'balanced';
  var breakerPresetLocked = true;

  var ringCountEl = document.getElementById('ringCount');
  var ringCountVal = document.getElementById('ringCountVal');
  var uploadBtn = document.getElementById('uploadBtn') || document.getElementById('menuUploadBtn');
  var samplesModal = document.getElementById('samplesModal');
  var samplesModalClose = document.getElementById('samplesModalClose');
  var samplesModalDone = document.getElementById('samplesModalDone');
  var resliceBtn = document.getElementById('resliceBtn');
  var resliceBtnLabel = resliceBtn ? resliceBtn.querySelector('span') : null;
  var breathBtn = document.getElementById('breathBtn');
  var reslicing = false;
  var wheelToggleBtn = document.getElementById('wheelToggleBtn');
  var sliceWindowOpenBtn = document.getElementById('sliceWindowOpenBtn');
  var wheelHidden = false;
  var hubFadeTimer = 0;
  var sliceMeta = document.getElementById('sliceMeta');
  var playMeta = document.getElementById('playMeta');
  var savingWav = false;
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
  var ringReverseEl = document.getElementById('ringReverse');
  var ringAttackVal = document.getElementById('ringAttackVal');
  var ringReleaseVal = document.getElementById('ringReleaseVal');
  var ringDurVal = document.getElementById('ringDurVal');
  var ringEnvHint = document.getElementById('ringEnvHint');
  var sampleSlotsEl = document.getElementById('sampleSlots');
  var viewSampleSelect = document.getElementById('viewSampleSelect');
  var activeSampleLab = document.getElementById('activeSampleLab');

  var waveCtx2d = waveCanvas ? waveCanvas.getContext('2d') : null;
  var specCtx2d = specCanvas ? specCanvas.getContext('2d') : null;
  var overviewCtx2d = overviewCanvas ? overviewCanvas.getContext('2d') : null;

  var ctx = null;
  var master = null;
  var analyser = null;
  var analyserData = null;

  var slots = [
    { buffer: null, name: '', weight: 100, windowStart: 0, videoUrl: null, videoEl: null, videoReady: false },
    { buffer: null, name: '', weight: 0, windowStart: 0, videoUrl: null, videoEl: null, videoReady: false },
    { buffer: null, name: '', weight: 0, windowStart: 0, videoUrl: null, videoEl: null, videoReady: false }
  ];
  var activeSlot = 0;
  var slices = [];
  var slicesBySlot = [[], [], []];
  var slicesBySlotBeats = [{}, {}, {}]; // slot -> { '0.25': [indices], ... }
  var playTimeline = []; // flat { ringIdx, segIdx, beats }
  var rings = [];
  var ringEnvs = [];
  var editRing = 0;
  var showApplyToAll = false;
  var segEls = {};
  var playheadEl = null;
  var liveRingIdx = -1;
  var lastWaveDrawMs = 0;
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
  var activeVoices = [];
  var breathing = false;
  var breathSource = null;
  var breathGain = null;
  var lastBreathSlice = null;
  var BREATH_FADE_SEC = 0.005;

  function loadedSlots() {
    var out = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (slots[i].buffer) out.push(i);
    }
    return out;
  }

  function getSlotWeight(i) {
    var w = slots[i] ? Number(slots[i].weight) : 0;
    return Math.max(0, Math.min(100, w || 0));
  }

  /** Keep three mix sliders summing to 100 when one moves. */
  function setLinkedWeight(idx, newVal) {
    newVal = Math.max(0, Math.min(100, Number(newVal) || 0));
    var others = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (i !== idx) others.push(i);
    }
    var othersSum = 0;
    for (var o = 0; o < others.length; o++) {
      othersSum += getSlotWeight(others[o]);
    }
    var remaining = 100 - newVal;
    if (othersSum <= 0.0001) {
      var share = remaining / others.length;
      for (var a = 0; a < others.length; a++) {
        slots[others[a]].weight = share;
      }
    } else {
      for (var b = 0; b < others.length; b++) {
        var j = others[b];
        slots[j].weight = remaining * (getSlotWeight(j) / othersSum);
      }
    }
    slots[idx].weight = newVal;
    normalizeWeights();
  }

  function normalizeWeights() {
    var total = 0;
    for (var i = 0; i < SLOT_COUNT; i++) total += getSlotWeight(i);
    if (!(total > 0)) {
      slots[0].weight = 100;
      slots[1].weight = 0;
      slots[2].weight = 0;
      return;
    }
    for (var j = 0; j < SLOT_COUNT; j++) {
      slots[j].weight = (getSlotWeight(j) / total) * 100;
    }
  }

  function syncSlotMixSliders(exceptIdx) {
    if (!sampleSlotsEl) return;
    var inputs = sampleSlotsEl.querySelectorAll('.slot-mix-input');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var idx = Number(el.getAttribute('data-slot'));
      if (idx === exceptIdx) continue;
      el.value = String(Math.round(getSlotWeight(idx)));
    }
  }

  function activeSample() {
    return slots[activeSlot];
  }

  function hasSamples() {
    return loadedSlots().length > 0;
  }

  function getBpm() {
    return Math.max(50, Math.min(180, Number(bpmEl.value) || 110));
  }

  function beatKey(beats) {
    return String(beats);
  }

  function beatsToSec(beats) {
    return (60 / getBpm()) * beats;
  }

  function getEnabledDurations() {
    var rank = 0;
    return DURATION_DEFS.filter(function (d) { return d.on; })
      .map(function (d) {
        rank += 1;
        return {
          beats: d.beats,
          priority: rank,
          label: d.label
        };
      });
  }

  /** Weight: priority 1 (top) heaviest. */
  function priorityWeight(p) {
    return 1 / Math.max(1, p);
  }

  function durationProbabilities() {
    var total = 0;
    var weights = [];
    var rank = 0;
    for (var i = 0; i < DURATION_DEFS.length; i++) {
      if (!DURATION_DEFS[i].on) {
        weights[i] = 0;
        continue;
      }
      rank += 1;
      weights[i] = priorityWeight(rank);
      total += weights[i];
    }
    return weights.map(function (w) {
      if (!(total > 0) || !(w > 0)) return null;
      return Math.round((w / total) * 100);
    });
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
      opts = [{ beats: 0.25, priority: 1, label: '1/4' }];
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

  function durationSummaryText() {
    var opts = getEnabledDurations();
    if (!opts.length) return 'none';
    return opts.map(function (o) { return o.label; }).join(', ');
  }

  function markSettingsPending() {
    settingsPending = true;
    if (resliceBtn && hasSamples() && !reslicing) {
      resliceBtn.disabled = false;
      resliceBtn.classList.add('is-pending');
    }
  }

  function clearSettingsPending() {
    settingsPending = false;
    if (resliceBtn) {
      resliceBtn.classList.remove('is-pending');
    }
  }

  function positionDurMenu() { /* slice list lives in settings modal */ }

  function syncDurationSummary() {
    if (durDropSummary) durDropSummary.textContent = durationSummaryText();
  }

  function setDurMenuOpen() { /* no floating slice menu */ }

  function captureSettingsSnapshot() {
    return {
      bpm: bpmEl ? bpmEl.value : '110',
      ringCount: ringCountEl ? ringCountEl.value : '8',
      durations: DURATION_DEFS.map(function (d) {
        return { beats: d.beats, label: d.label, on: !!d.on };
      })
    };
  }

  function restoreSettingsSnapshot(snap) {
    if (!snap) return;
    if (bpmEl) bpmEl.value = snap.bpm;
    if (bpmVal) bpmVal.textContent = String(getBpm());
    if (ringCountEl) ringCountEl.value = snap.ringCount;
    if (ringCountVal) ringCountVal.textContent = String(getRingCount());
    if (snap.durations && snap.durations.length === DURATION_DEFS.length) {
      for (var i = 0; i < DURATION_DEFS.length; i++) {
        DURATION_DEFS[i].beats = snap.durations[i].beats;
        DURATION_DEFS[i].label = snap.durations[i].label;
        DURATION_DEFS[i].on = !!snap.durations[i].on;
      }
    }
    renderDurationOptions();
    syncDurationSummary();
  }

  function moveDurationRow(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= DURATION_DEFS.length || toIdx >= DURATION_DEFS.length) return;
    var item = DURATION_DEFS.splice(fromIdx, 1)[0];
    DURATION_DEFS.splice(toIdx, 0, item);
    renderDurationOptions();
    syncDurationSummary();
    markSettingsPending();
  }

  function renderDurationOptions() {
    if (!durMenuRows) return;
    durMenuRows.innerHTML = '';
    var pcts = durationProbabilities();

    DURATION_DEFS.forEach(function (def, idx) {
      var row = document.createElement('div');
      row.className = 'dur-row';
      row.draggable = true;
      row.dataset.index = String(idx);

      var handle = document.createElement('span');
      handle.className = 'dur-row-handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-hidden', 'true');

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'durCb' + idx;
      cb.checked = !!def.on;

      var lab = document.createElement('label');
      lab.className = 'dur-row-lab';
      lab.htmlFor = 'durCb' + idx;
      lab.textContent = def.label;

      var pct = document.createElement('span');
      pct.className = 'dur-row-pct' + (def.on ? ' is-on' : '');
      pct.textContent = pcts[idx] == null ? '—' : pcts[idx] + '%';

      cb.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      cb.addEventListener('change', function () {
        def.on = !!cb.checked;
        if (!getEnabledDurations().length) {
          def.on = true;
          cb.checked = true;
        }
        renderDurationOptions();
        syncDurationSummary();
        markSettingsPending();
      });

      row.addEventListener('dragstart', function (e) {
        durDragFrom = idx;
        row.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(idx));
        }
      });
      row.addEventListener('dragend', function () {
        durDragFrom = -1;
        row.classList.remove('is-dragging');
        Array.prototype.forEach.call(durMenuRows.querySelectorAll('.dur-row'), function (el) {
          el.classList.remove('is-drag-over');
        });
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        row.classList.add('is-drag-over');
      });
      row.addEventListener('dragleave', function () {
        row.classList.remove('is-drag-over');
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('is-drag-over');
        var from = durDragFrom;
        if (from < 0 && e.dataTransfer) {
          from = Number(e.dataTransfer.getData('text/plain'));
        }
        moveDurationRow(from, idx);
      });

      row.appendChild(handle);
      row.appendChild(cb);
      row.appendChild(lab);
      row.appendChild(pct);
      durMenuRows.appendChild(row);
    });

    syncDurationSummary();
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function randomizeSliceDurations() {
    shuffleInPlace(DURATION_DEFS);
    var count = 1 + Math.floor(Math.random() * 3); // 1–3 enabled
    for (var i = 0; i < DURATION_DEFS.length; i++) {
      DURATION_DEFS[i].on = i < count;
    }
    renderDurationOptions();
    syncDurationSummary();
  }

  function rollDice() {
    if (reslicing) return;
    if (!BREAKER_PRESETS.length) return;
    var pick = BREAKER_PRESETS[Math.floor(Math.random() * BREAKER_PRESETS.length)];
    applyBreakerPreset(pick.id, false);
    randomizeSliceDurations();
    if (playing) stopPlay();
    resliceAndDraw();
    if (slices.length) startPlay();
  }

  function ensureAtLeastOneDuration() {
    if (getEnabledDurations().length) return;
    var d = DURATION_DEFS[0];
    d.on = true;
  }

  function getRingCount() {
    return Math.max(2, Math.min(16, Number(ringCountEl.value) || 8));
  }

  function getOrderMode() {
    var v = orderModeEl ? orderModeEl.value : 'sequential';
    return v === 'random' ? 'random' : 'sequential';
  }

  function getSeqSwapAmount() {
    return nearestPctOption(seqSwapEl && seqSwapEl.value);
  }

  function getBreakSkipChance() {
    return nearestPctOption(breakSkipEl && breakSkipEl.value) / 100;
  }

  function getBreakStutterChance() {
    return nearestPctOption(breakStutterEl && breakStutterEl.value) / 100;
  }

  function getBreakIntensity() {
    return Math.max(1, Math.min(5, Number(breakIntensityEl && breakIntensityEl.value) || 3));
  }

  function pickStutterReps() {
    var maxR = getBreakIntensity();
    if (maxR <= 1) return 1;
    return 1 + Math.floor(Math.random() * maxR);
  }

  function syncBreakerSliderLabels() {
    /* intensity is a bare × dropdown now */
  }

  function nearestPctOption(v, options) {
    var list = options || PCT_OPTIONS;
    var n = Math.max(0, Math.min(100, Number(v) || 0));
    var best = list[0];
    var bestD = Math.abs(best - n);
    for (var i = 1; i < list.length; i++) {
      var d = Math.abs(list[i] - n);
      if (d < bestD) {
        best = list[i];
        bestD = d;
      }
    }
    return best;
  }

  function nearestReverseOption(v) {
    return nearestPctOption(v, PCT_OPTIONS);
  }

  function nearestDurPctOption(v) {
    return nearestPctOption(v, DUR_PCT_OPTIONS);
  }

  function applyBreakerPreset(id, resprinkle) {
    var p = null;
    for (var i = 0; i < BREAKER_PRESETS.length; i++) {
      if (BREAKER_PRESETS[i].id === id) { p = BREAKER_PRESETS[i]; break; }
    }
    if (!p) return;
    activeBreakerPreset = p.id;
    breakerPresetLocked = true;

    if (breakSkipEl) breakSkipEl.value = String(nearestPctOption(p.skip));
    if (breakStutterEl) breakStutterEl.value = String(nearestPctOption(p.stutter));
    if (breakIntensityEl) breakIntensityEl.value = String(p.intensity);
    syncBreakerSliderLabels();

    if (orderModeEl) orderModeEl.value = p.order === 'sequential' ? 'sequential' : 'random';
    if (seqSwapEl && p.neighbor != null) seqSwapEl.value = String(nearestPctOption(p.neighbor));
    syncModePanels();

    var env = {
      attackMs: p.attackMs != null ? p.attackMs : DEFAULT_ENV.attackMs,
      releaseMs: clampReleaseMs(p.releaseMs != null ? p.releaseMs : DEFAULT_ENV.releaseMs),
      durationPct: nearestDurPctOption(p.durationPct != null ? p.durationPct : DEFAULT_ENV.durationPct),
      reversePct: nearestReverseOption(p.reverse != null ? p.reverse : 0)
    };
    rings.forEach(function (ring, ri) {
      ring.attackMs = env.attackMs;
      ring.releaseMs = env.releaseMs;
      ring.durationPct = env.durationPct;
      ring.reversePct = env.reversePct;
      ringEnvs[ri] = {
        attackMs: env.attackMs,
        releaseMs: env.releaseMs,
        durationPct: env.durationPct,
        reversePct: env.reversePct
      };
    });
    if (ringAttackEl) ringAttackEl.value = String(env.attackMs);
    if (ringReleaseEl) ringReleaseEl.value = String(env.releaseMs);
    if (ringDurEl) ringDurEl.value = String(env.durationPct);
    if (ringReverseEl) ringReverseEl.value = String(env.reversePct);
    showApplyToAll = false;
    syncRingEnvUi();

    renderBreakerPresets();
    if (resprinkle) markSettingsPending();
  }

  function markBreakerCustom() {
    breakerPresetLocked = false;
    activeBreakerPreset = 'custom';
    renderBreakerPresets();
  }

  function renderBreakerPresets() {
    if (!macroModeEl) return;
    var prev = macroModeEl.value;
    macroModeEl.innerHTML = '';
    BREAKER_PRESETS.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      macroModeEl.appendChild(opt);
    });
    var custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Custom';
    macroModeEl.appendChild(custom);

    if (breakerPresetLocked && activeBreakerPreset !== 'custom') {
      macroModeEl.value = activeBreakerPreset;
    } else {
      macroModeEl.value = 'custom';
    }
    if (!macroModeEl.value && prev) macroModeEl.value = prev;
  }

  function syncModePanels() {
    var seq = getOrderMode() === 'sequential';
    if (seqSwapWrap) seqSwapWrap.style.display = seq ? '' : 'none';
    if (seqSwapEl) seqSwapEl.disabled = !seq;
    if (breakerPanel) breakerPanel.hidden = false;
    syncMixUi();
  }

  function syncMixUi() {
    /* mix sliders live inside each sample slot */
  }

  function renderSampleSlots() {
    if (!sampleSlotsEl) return;
    sampleSlotsEl.innerHTML = '';
    for (var i = 0; i < SLOT_COUNT; i++) {
      (function (idx) {
        var slot = slots[idx];
        var card = document.createElement('div');
        card.className = 'slot-card' +
          (idx === activeSlot ? ' is-active' : '') +
          (!slot.buffer ? ' is-empty' : '');
        card.style.setProperty('--slot-accent', SLOT_COLORS[idx]);

        var head = document.createElement('div');
        head.className = 'slot-card-head';

        var dot = document.createElement('span');
        dot.className = 'slot-dot';
        dot.style.background = SLOT_COLORS[idx];
        head.appendChild(dot);

        var title = document.createElement('span');
        title.className = 'slot-card-title';
        title.textContent = 'Slot ' + (idx + 1);
        head.appendChild(title);

        var name = document.createElement('span');
        name.className = 'slot-card-name';
        name.textContent = slot.buffer ? slot.name : 'Empty';
        head.appendChild(name);

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
          head.appendChild(clearBtn);
        }
        card.appendChild(head);

        var drop = document.createElement('div');
        drop.className = 'slot-drop';
        drop.innerHTML = slot.buffer
          ? '<strong>Replace</strong><br>Drop a new file or click to browse'
          : 'Drop audio / mp4<br>or click to upload';

        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*,video/mp4,video/webm,video/*,.wav,.mp3,.ogg,.m4a,.flac,.mp4,.webm,.mov';
        input.setAttribute('aria-label', 'Upload sample for slot ' + (idx + 1));
        input.addEventListener('click', function (e) {
          e.stopPropagation();
        });
        input.addEventListener('change', function () {
          var f = input.files && input.files[0];
          if (!f) return;
          if (playing) stopPlay();
          loadFile(f, idx).catch(function (err) {
            console.error(err);
            if (sliceMeta) sliceMeta.textContent = 'Could not decode that file';
          });
          input.value = '';
        });
        drop.appendChild(input);

        function setDrag(on) {
          card.classList.toggle('is-drag', !!on);
        }
        drop.addEventListener('dragenter', function (e) {
          e.preventDefault();
          e.stopPropagation();
          setDrag(true);
        });
        drop.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.stopPropagation();
          setDrag(true);
        });
        drop.addEventListener('dragleave', function (e) {
          e.preventDefault();
          e.stopPropagation();
          setDrag(false);
        });
        drop.addEventListener('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          setDrag(false);
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (!f) return;
          if (playing) stopPlay();
          loadFile(f, idx).catch(function (err) {
            console.error(err);
            if (sliceMeta) sliceMeta.textContent = 'Could not decode that file';
          });
        });

        card.appendChild(drop);

        var mixRow = document.createElement('div');
        mixRow.className = 'slot-mix';
        mixRow.title = 'How often this slot is used (sliders stay balanced)';
        var mixInput = document.createElement('input');
        mixInput.type = 'range';
        mixInput.className = 'slot-mix-input';
        mixInput.min = '0';
        mixInput.max = '100';
        mixInput.step = '1';
        mixInput.value = String(Math.round(getSlotWeight(idx)));
        mixInput.setAttribute('data-slot', String(idx));
        mixInput.setAttribute('aria-label', 'Mix amount for slot ' + (idx + 1));
        mixInput.addEventListener('click', function (e) { e.stopPropagation(); });
        mixInput.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        mixInput.addEventListener('input', function () {
          setLinkedWeight(idx, Number(mixInput.value) || 0);
          syncSlotMixSliders(idx);
          markSettingsPending();
        });
        mixRow.appendChild(mixInput);
        card.appendChild(mixRow);

        card.addEventListener('click', function (e) {
          if (e.target === input || e.target.closest('.slot-clear') || e.target.closest('.slot-mix')) return;
          setActiveSlot(idx);
        });
        sampleSlotsEl.appendChild(card);
      })(i);
    }
  }

  function clearHubFade() {
    if (hubFadeTimer) {
      clearTimeout(hubFadeTimer);
      hubFadeTimer = 0;
    }
    if (hubBtn) hubBtn.classList.remove('is-faded');
  }

  function scheduleHubFade() {
    clearHubFade();
    if (!playing || !hubBtn) return;
    hubFadeTimer = setTimeout(function () {
      hubFadeTimer = 0;
      if (playing && hubBtn) hubBtn.classList.add('is-faded');
    }, 1000);
  }

  function pokeHubVisible() {
    if (!playing) return;
    scheduleHubFade();
  }

  function syncWheelVisibility() {
    if (circleWrap) circleWrap.classList.toggle('wheel-hidden', wheelHidden);
    if (wheelToggleBtn) {
      wheelToggleBtn.textContent = wheelHidden ? 'Show wheel' : 'Hide wheel';
      wheelToggleBtn.setAttribute('aria-pressed', wheelHidden ? 'true' : 'false');
    }
    if (playing) scheduleHubFade();
    else clearHubFade();
  }

  function openSamplesModal() {
    if (!samplesModal) return;
    renderSampleSlots();
    samplesModal.hidden = false;
  }

  function closeSamplesModal() {
    if (!samplesModal) return;
    samplesModal.hidden = true;
  }

  function updateActiveSampleLab() {
    if (!viewSampleSelect) return;
    var loaded = loadedSlots();
    var prev = viewSampleSelect.value;
    viewSampleSelect.innerHTML = '';
    if (!loaded.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No sample';
      viewSampleSelect.appendChild(empty);
      viewSampleSelect.disabled = true;
      viewSampleSelect.value = '';
      return;
    }
    loaded.forEach(function (idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = slots[idx].name || ('Slot ' + (idx + 1));
      viewSampleSelect.appendChild(opt);
    });
    viewSampleSelect.disabled = false;
    if (slots[activeSlot] && slots[activeSlot].buffer) {
      viewSampleSelect.value = String(activeSlot);
    } else if (prev !== '' && slots[Number(prev)] && slots[Number(prev)].buffer) {
      viewSampleSelect.value = prev;
    } else {
      viewSampleSelect.value = String(loaded[0]);
      activeSlot = loaded[0];
    }
  }

  function setActiveSlot(idx) {
    if (idx < 0 || idx >= SLOT_COUNT) return;
    if (!slots[idx] || !slots[idx].buffer) return;
    activeSlot = idx;
    renderSampleSlots();
    updateActiveSampleLab();
    syncWindowSlider();
    rebuildWindowPeaksForSlot(activeSlot);
    drawWaveform();
  }

  function clearSlot(idx) {
    if (playing) stopPlay();
    clearSlotVideo(idx);
    slots[idx].buffer = null;
    slots[idx].name = '';
    slots[idx].windowStart = 0;
    slots[idx].weight = 0;
    fullPeaksBySlot[idx] = null;
    windowPeaksBySlot[idx] = null;
    if (activeSlot === idx && !slots[idx].buffer) {
      var loaded = loadedSlots();
      if (loaded.length) activeSlot = loaded[0];
    }
    rebalanceLoadedWeights();
    renderSampleSlots();
    updateActiveSampleLab();
    resliceAndDraw();
  }

  /** After clear: empty slots 0; loaded slots keep relative mix, renormalized to 100. */
  function rebalanceLoadedWeights() {
    var loaded = loadedSlots();
    if (!loaded.length) {
      slots[0].weight = 100;
      slots[1].weight = 0;
      slots[2].weight = 0;
      return;
    }
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (!slots[i].buffer) slots[i].weight = 0;
    }
    var sum = 0;
    for (var j = 0; j < loaded.length; j++) sum += getSlotWeight(loaded[j]);
    if (sum <= 0.0001) {
      var share = 100 / loaded.length;
      for (var k = 0; k < loaded.length; k++) slots[loaded[k]].weight = share;
      return;
    }
    for (var m = 0; m < loaded.length; m++) {
      var idx = loaded[m];
      slots[idx].weight = (getSlotWeight(idx) / sum) * 100;
    }
  }

  function ensureSlotMixOnLoad(slotIdx) {
    if (getSlotWeight(slotIdx) > 0.5) return;
    var loaded = loadedSlots();
    if (loaded.length <= 1) {
      for (var i = 0; i < SLOT_COUNT; i++) {
        slots[i].weight = i === slotIdx ? 100 : 0;
      }
      return;
    }
    var share = 100 / loaded.length;
    for (var j = 0; j < SLOT_COUNT; j++) {
      slots[j].weight = slots[j].buffer ? share : 0;
    }
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
    if (!sl) return emptyFill(i);
    if (hasVideoReady()) return colorWithAlpha(sl.color, 0.52);
    return sl.color;
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
    ctx = new AC({ latencyHint: 'interactive' });
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

  function isVideoFile(file) {
    if (!file) return false;
    if (file.type && file.type.indexOf('video/') === 0) return true;
    return /\.(mp4|webm|mov|m4v)$/i.test(file.name || '');
  }

  function hasVideoReady() {
    for (var i = 0; i < SLOT_COUNT; i++) {
      if (slots[i].videoReady && slots[i].videoEl) return true;
    }
    return false;
  }

  function colorWithAlpha(hex, a) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var h = hex.slice(1);
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    if (h.length !== 6) return hex;
    var n = parseInt(h, 16);
    if (!Number.isFinite(n)) return hex;
    var r = (n >> 16) & 255;
    var g = (n >> 8) & 255;
    var b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function setPreloadLock(on, pct, label) {
    if (on) {
      document.body.classList.add('is-preloading');
      if (preloadOverlay) preloadOverlay.hidden = false;
      if (preloadTitle && label) preloadTitle.textContent = label;
      setPreloadProgress(pct == null ? 0 : pct);
    } else {
      document.body.classList.remove('is-preloading');
      if (preloadOverlay) preloadOverlay.hidden = true;
      setPreloadProgress(0);
    }
  }

  function setPreloadProgress(pct) {
    var n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    if (preloadBarFill) preloadBarFill.style.width = n + '%';
    if (preloadPct) preloadPct.textContent = n + '%';
  }

  function waitMediaEvent(el, ev, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var to = setTimeout(function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('timeout:' + ev));
      }, timeoutMs || 20000);
      function ok() {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      }
      function fail() {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('media error'));
      }
      function cleanup() {
        clearTimeout(to);
        el.removeEventListener(ev, ok);
        el.removeEventListener('error', fail);
      }
      el.addEventListener(ev, ok);
      el.addEventListener('error', fail);
    });
  }

  function sleepMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function videoBufferedPct(video) {
    if (!video || !(video.duration > 0) || !isFinite(video.duration)) return 0;
    var end = 0;
    try {
      for (var i = 0; i < video.buffered.length; i++) {
        end = Math.max(end, video.buffered.end(i));
      }
    } catch (err) { /* ignore */ }
    return Math.min(100, Math.round((end / video.duration) * 100));
  }

  async function forcePreloadVideo(video, onProgress) {
    if (typeof onProgress === 'function') onProgress(0);
    video.load();
    await waitMediaEvent(video, 'loadedmetadata', 45000);
    var dur = video.duration;
    if (!(dur > 0) || !isFinite(dur)) throw new Error('Invalid video duration');

    var checkpoints = [0, 0.2, 0.4, 0.6, 0.8, 0.95];
    for (var i = 0; i < checkpoints.length; i++) {
      var t = Math.min(Math.max(0, dur * checkpoints[i]), Math.max(0, dur - 0.05));
      try {
        video.currentTime = t;
        await waitMediaEvent(video, 'seeked', 20000);
      } catch (err) { /* keep going */ }
      await sleepMs(70);
      var scrubPct = Math.round(((i + 1) / checkpoints.length) * 88);
      var bp = videoBufferedPct(video);
      if (typeof onProgress === 'function') onProgress(Math.max(bp, scrubPct));
      if (bp >= 98) break;
    }

    await new Promise(function (resolve) {
      var start = Date.now();
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        video.removeEventListener('progress', onProg);
        video.removeEventListener('canplaythrough', onReady);
        clearInterval(iv);
        resolve();
      }
      function report() {
        var bp = videoBufferedPct(video);
        if (typeof onProgress === 'function') onProgress(Math.max(bp, 90));
        if (bp >= 97 || video.readyState >= 4 || Date.now() - start > 14000) {
          finish();
        }
      }
      function onProg() { report(); }
      function onReady() {
        if (typeof onProgress === 'function') onProgress(100);
        finish();
      }
      video.addEventListener('progress', onProg);
      video.addEventListener('canplaythrough', onReady);
      var iv = setInterval(report, 200);
      report();
    });

    try {
      video.currentTime = 0;
      await waitMediaEvent(video, 'seeked', 10000);
    } catch (err) { /* ignore */ }
    if (typeof onProgress === 'function') onProgress(100);
  }

  function clearSlotVideo(idx) {
    var slot = slots[idx];
    if (!slot) return;
    if (slot.videoEl) {
      try { slot.videoEl.pause(); } catch (err) { /* ignore */ }
      if (slot.videoEl.parentNode) slot.videoEl.parentNode.removeChild(slot.videoEl);
      slot.videoEl = null;
    }
    if (slot.videoUrl) {
      try { URL.revokeObjectURL(slot.videoUrl); } catch (err) { /* ignore */ }
      slot.videoUrl = null;
    }
    slot.videoReady = false;
    if (liveVideoSlot === idx) liveVideoSlot = -1;
    syncVideoStageClass();
  }

  async function attachAndPreloadVideo(slotIdx, file) {
    var url = URL.createObjectURL(file);
    var video = document.createElement('video');
    video.className = 'stage-video';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.loop = true;
    video.src = url;
    if (stageVideoStack) stageVideoStack.appendChild(video);

    setPreloadLock(true, 0, 'Preloading video');
    try {
      await forcePreloadVideo(video, function (pct) {
        setPreloadProgress(pct);
      });
      slots[slotIdx].videoUrl = url;
      slots[slotIdx].videoEl = video;
      slots[slotIdx].videoReady = true;
      syncVideoStageClass();
      keepStageVideoRolling();
      if (rings.length) drawRings();
    } catch (err) {
      if (video.parentNode) video.parentNode.removeChild(video);
      try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ }
      throw err;
    } finally {
      setPreloadLock(false);
    }
  }

  function syncVideoStageClass() {
    if (!circleWrap) return;
    circleWrap.classList.toggle('has-video', hasVideoReady());
  }

  function clearVideoCueTimers() {
    videoCueTimers.forEach(function (id) {
      clearTimeout(id);
    });
    videoCueTimers = [];
  }

  function showLiveVideo(slotIdx) {
    for (var i = 0; i < SLOT_COUNT; i++) {
      var v = slots[i].videoEl;
      if (!v) continue;
      if (i === slotIdx) v.classList.add('is-live');
      else v.classList.remove('is-live');
    }
    liveVideoSlot = slotIdx;
  }

  /** Keep footage visible and rolling at normal speed (no fade-to-dark). */
  function keepStageVideoRolling() {
    if (!hasVideoReady()) return;
    var idx = liveVideoSlot;
    if (idx < 0 || !slots[idx] || !slots[idx].videoEl) {
      idx = -1;
      for (var i = 0; i < SLOT_COUNT; i++) {
        if (slots[i].videoReady && slots[i].videoEl) {
          idx = i;
          break;
        }
      }
    }
    if (idx < 0) return;
    showLiveVideo(idx);
    var v = slots[idx].videoEl;
    if (!v) return;
    try {
      if (v.paused) {
        var p = v.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* ignore */ });
      }
    } catch (err) { /* ignore */ }
  }

  function scheduleVideoHit(slotIdx, absStart, when, playDur, opts) {
    var slot = slots[slotIdx];
    if (!slot || !slot.videoReady || !slot.videoEl || !ctx) return;
    opts = opts || {};
    // Start slightly early so seek finishes before the audio hit
    var delayMs = Math.max(0, (when - ctx.currentTime) * 1000 - 40);
    var tid = setTimeout(function () {
      var v = slot.videoEl;
      if (!v) return;
      showLiveVideo(slotIdx);
      try {
        var t = Math.max(0, Number(absStart) || 0);
        // Skip tiny seeks — they stall the main thread and make audio feel late
        if (Math.abs(v.currentTime - t) > 0.08) {
          v.currentTime = t;
        }
        if (v.paused) {
          var p = v.play();
          if (p && typeof p.catch === 'function') p.catch(function () { /* ignore */ });
        }
      } catch (err) { /* ignore */ }
      // After the hit, footage keeps rolling at normal speed (no fade / freeze)
    }, delayMs);
    videoCueTimers.push(tid);
  }

  function playUiClick() {
    var ac = ensureAudio();
    if (ac.state === 'suspended') {
      ac.resume().catch(function () { /* ignore */ });
    }
    var t0 = ac.currentTime;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(980, t0);
    o.frequency.exponentialRampToValueAtTime(360, t0 + 0.07);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + 0.11);
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
    if (hasVideoReady()) {
      return (i % 2 === 0) ? 'rgba(30,30,36,0.35)' : 'rgba(34,34,40,0.35)';
    }
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
      durationPct: DEFAULT_ENV.durationPct,
      reversePct: DEFAULT_ENV.reversePct
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
      var env = prev[i]
        ? Object.assign({}, defaultEnv(), prev[i], { releaseMs: clampReleaseMs(prev[i].releaseMs) })
        : defaultEnv();
      ringEnvs.push(env);
      var plan = buildBeatPlan();
      rings.push({
        id: 'r' + i,
        segBeats: plan,
        segments: plan.length,
        cells: Array(plan.length).fill(null),
        attackMs: env.attackMs,
        releaseMs: env.releaseMs,
        durationPct: env.durationPct,
        reversePct: env.reversePct != null ? env.reversePct : 0
      });
    }
    if (editRing < 0 || editRing >= nRings) editRing = 0;
    rebuildPlayTimeline();
    renderRingPicks();
    syncRingEnvUi();
  }

  function syncApplyToAllBtn() {
    if (!applyToAllBtn) return;
    applyToAllBtn.hidden = !showApplyToAll || rings.length < 2;
  }

  function renderRingPicks() {
    if (!ringPicks) return;
    ringPicks.innerHTML = '';
    if (editRing < 0 || editRing >= rings.length) editRing = 0;

    rings.forEach(function (ring, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ring-pick' + (i === editRing ? ' is-active' : '');
      btn.textContent = String(i + 1);
      btn.title = 'Edit ring ' + (i + 1) + ' envelope';
      btn.addEventListener('click', function () {
        editRing = i;
        showApplyToAll = false;
        renderRingPicks();
        syncRingEnvUi();
      });
      ringPicks.appendChild(btn);
    });
    syncApplyToAllBtn();
  }

  function syncRingEnvUi() {
    var ringIdx = editRing < 0 ? 0 : editRing;
    var ring = rings[ringIdx];
    if (!ring) return;
    ringAttackEl.value = String(ring.attackMs);
    ringReleaseEl.value = String(clampReleaseMs(ring.releaseMs));
    ringAttackVal.textContent = ring.attackMs + ' ms';
    ringReleaseVal.textContent = clampReleaseMs(ring.releaseMs) + ' ms';
    if (ringDurEl) ringDurEl.value = String(nearestDurPctOption(ring.durationPct));
    if (ringDurVal) ringDurVal.textContent = nearestDurPctOption(ring.durationPct) + '%';
    if (ringReverseEl) {
      ringReverseEl.value = String(nearestReverseOption(ring.reversePct));
    }
    if (ringEnvHint) {
      ringEnvHint.textContent = 'Ring ' + (ringIdx + 1) + ' · outer=1';
    }
    syncApplyToAllBtn();
  }

  function applyEnvFromUi() {
    var attack = Number(ringAttackEl.value) || 0;
    var release = clampReleaseMs(ringReleaseEl.value);
    var dur = nearestDurPctOption(ringDurEl ? ringDurEl.value : 100);
    var rev = nearestReverseOption(ringReverseEl ? ringReverseEl.value : 0);
    ringAttackVal.textContent = attack + ' ms';
    ringReleaseVal.textContent = release + ' ms';
    if (ringReleaseEl) ringReleaseEl.value = String(release);
    if (ringDurVal) ringDurVal.textContent = dur + '%';

    var ring = rings[editRing];
    if (!ring) return;
    ring.attackMs = attack;
    ring.releaseMs = release;
    ring.durationPct = dur;
    ring.reversePct = rev;
    ringEnvs[editRing] = {
      attackMs: attack,
      releaseMs: release,
      durationPct: dur,
      reversePct: rev
    };
    showApplyToAll = rings.length > 1;
    syncApplyToAllBtn();
    markBreakerCustom();
  }

  function applyEnvToAllRings() {
    var ring = rings[editRing];
    if (!ring) return;
    var env = {
      attackMs: ring.attackMs,
      releaseMs: ring.releaseMs,
      durationPct: ring.durationPct,
      reversePct: ring.reversePct
    };
    rings.forEach(function (r, i) {
      r.attackMs = env.attackMs;
      r.releaseMs = env.releaseMs;
      r.durationPct = env.durationPct;
      r.reversePct = env.reversePct;
      ringEnvs[i] = {
        attackMs: env.attackMs,
        releaseMs: env.releaseMs,
        durationPct: env.durationPct,
        reversePct: env.reversePct
      };
    });
    showApplyToAll = false;
    syncApplyToAllBtn();
    markBreakerCustom();
  }

  function drawRings() {
    clearSvg();
    var n = rings.length;
    if (!n) return;

    var disc = document.createElementNS(NS, 'circle');
    disc.setAttribute('cx', String(CX));
    disc.setAttribute('cy', String(CY));
    disc.setAttribute('r', String(OUTER + 2));
    disc.setAttribute('fill', hasVideoReady() ? 'rgba(10,10,14,0.28)' : '#16161a');
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
        path.setAttribute('stroke', 'none');
        path.dataset.ring = ring.id;
        path.dataset.ringIdx = String(li);
        path.dataset.seg = String(i);
        // Stutter cells: thin lime edge (not white) so they stay readable without looking “selected”
        if (cellReps(cell) > 1) {
          path.setAttribute('stroke', '#c8ff00');
          path.setAttribute('stroke-width', '1.4');
          path.setAttribute('stroke-opacity', '0.55');
        }
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
      showApplyToAll = false;
      renderRingPicks();
      syncRingEnvUi();
    }
    var beats = (ring.segBeats && ring.segBeats[i]) || 0.25;
    previewSlice(si, ring, cellReps(cell), beats);
  }

  function stopBreathVoice(fadeSec) {
    if (!ctx) {
      breathSource = null;
      breathGain = null;
      return;
    }
    var t = ctx.currentTime;
    var fade = fadeSec == null ? BREATH_FADE_SEC : fadeSec;
    if (breathGain) {
      try {
        var cur = Math.max(0.0001, breathGain.gain.value);
        breathGain.gain.cancelScheduledValues(t);
        breathGain.gain.setValueAtTime(cur, t);
        breathGain.gain.linearRampToValueAtTime(0.0001, t + fade);
      } catch (err) { /* ignore */ }
    }
    if (breathSource) {
      try { breathSource.stop(t + fade + 0.02); } catch (err2) { /* ignore */ }
    }
    breathSource = null;
    breathGain = null;
  }

  function fadeOutWheelVoices(fadeSec) {
    if (!ctx) {
      activeVoices = [];
      activeSources = [];
      return;
    }
    var t = ctx.currentTime;
    var fade = fadeSec == null ? BREATH_FADE_SEC : fadeSec;
    activeVoices.forEach(function (v) {
      try {
        var cur = Math.max(0.0001, v.gain.gain.value);
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(cur, t);
        v.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
        v.src.stop(t + fade + 0.02);
      } catch (err) { /* ignore */ }
    });
    activeVoices = [];
    activeSources = [];
  }

  function pickBreathOrigin() {
    var now = ctx ? ctx.currentTime : 0;
    var best = null;
    for (var i = 0; i < activeVoices.length; i++) {
      var v = activeVoices[i];
      if (!v || !v.slice) continue;
      if (v.startAt <= now + 0.08) best = v;
    }
    if (best) {
      return {
        slotIdx: best.slice.slot,
        filePos: best.fileOffset + Math.max(0, now - best.startAt),
        slice: best.slice
      };
    }
    var slice = lastBreathSlice;
    if (!slice && highlightSlice >= 0) slice = slices[highlightSlice];
    if (slice && slots[slice.slot] && slots[slice.slot].buffer) {
      return { slotIdx: slice.slot, filePos: slice.absStart || 0, slice: slice };
    }
    var slotIdx = activeSlot;
    if (!slots[slotIdx] || !slots[slotIdx].buffer) {
      var loaded = loadedSlots();
      if (!loaded.length) return null;
      slotIdx = loaded[0];
    }
    return {
      slotIdx: slotIdx,
      filePos: slots[slotIdx].windowStart || 0,
      slice: null
    };
  }

  function startBreathContinuous(slotIdx, filePos) {
    var slot = slots[slotIdx];
    if (!ctx || !master || !slot || !slot.buffer) return;
    stopBreathVoice(0);
    var buffer = slot.buffer;
    var offset = Math.max(0, Math.min(Math.max(0, buffer.duration - 0.02), Number(filePos) || 0));
    var t0 = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var g = ctx.createGain();
    src.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(1, t0 + BREATH_FADE_SEC);
    var remain = Math.max(0.05, buffer.duration - offset);
    try {
      src.start(t0, offset, remain);
    } catch (err) {
      return;
    }
    breathSource = src;
    breathGain = g;
    src.onended = function () {
      if (breathSource === src) {
        breathSource = null;
        breathGain = null;
      }
    };
    if (slot.videoReady && slot.videoEl) {
      showLiveVideo(slotIdx);
      try {
        if (Math.abs(slot.videoEl.currentTime - offset) > 0.05) {
          slot.videoEl.currentTime = offset;
        }
        if (slot.videoEl.paused) {
          var p = slot.videoEl.play();
          if (p && typeof p.catch === 'function') p.catch(function () { /* ignore */ });
        }
      } catch (e2) { /* ignore */ }
    }
  }

  function beginBreath() {
    if (breathing) return;
    if (!hasSamples()) return;
    ensureAudio();
    if (ctx.state === 'suspended') ctx.resume();
    breathing = true;
    if (breathBtn) breathBtn.classList.add('is-held');
    clearVideoCueTimers();
    var origin = pickBreathOrigin();
    fadeOutWheelVoices(BREATH_FADE_SEC);
    if (!origin) {
      breathing = false;
      if (breathBtn) breathBtn.classList.remove('is-held');
      return;
    }
    var waitMs = Math.max(0, BREATH_FADE_SEC * 1000 - 1);
    setTimeout(function () {
      if (!breathing) return;
      startBreathContinuous(origin.slotIdx, origin.filePos);
    }, waitMs);
  }

  function endBreath() {
    if (!breathing && !breathSource) {
      if (breathBtn) breathBtn.classList.remove('is-held');
      return;
    }
    breathing = false;
    if (breathBtn) breathBtn.classList.remove('is-held');
    stopBreathVoice(BREATH_FADE_SEC);
    if (playing && ctx) {
      if (nextStepTime < ctx.currentTime) nextStepTime = ctx.currentTime + 0.03;
      schedule();
    }
  }

  function stopActiveSources() {
    // Hard-stop breath + chops (transport stop / reslice) — keep video rolling
    breathing = false;
    if (breathBtn) breathBtn.classList.remove('is-held');
    if (breathSource) {
      try { breathSource.stop(); } catch (err) { /* ignore */ }
    }
    breathSource = null;
    breathGain = null;
    activeVoices.forEach(function (v) {
      try { v.src.stop(); } catch (err2) { /* ignore */ }
    });
    activeVoices = [];
    activeSources.forEach(function (s) {
      try { s.stop(); } catch (err3) { /* ignore */ }
    });
    activeSources = [];
    clearVideoCueTimers();
  }

  function getReversedBuffer(buffer) {
    if (!buffer || !ctx) return buffer;
    var cached = revBufferCache.get(buffer);
    if (cached) return cached;
    var channels = buffer.numberOfChannels;
    var length = buffer.length;
    var rev = ctx.createBuffer(channels, length, buffer.sampleRate);
    for (var c = 0; c < channels; c++) {
      var src = buffer.getChannelData(c);
      var dst = rev.getChannelData(c);
      for (var i = 0; i < length; i++) {
        dst[i] = src[length - 1 - i];
      }
    }
    revBufferCache.set(buffer, rev);
    return rev;
  }

  function extendBufferWithReleaseTail(buffer, bodyDur, rel) {
    if (!ctx || !buffer) return { buffer: buffer, bodySec: buffer ? buffer.duration : 0 };
    var sr = buffer.sampleRate;
    var bodySec = Math.max(0.01, Math.min(buffer.duration, bodyDur));
    var bodySamples = Math.min(buffer.length, Math.max(1, Math.round(bodySec * sr)));
    bodySec = bodySamples / sr;
    if (!(rel > 0.0008)) return { buffer: buffer, bodySec: bodySec };

    var relSamples = Math.max(1, Math.round(rel * sr));
    var total = bodySamples + relSamples;
    var out = ctx.createBuffer(buffer.numberOfChannels, total, sr);
    for (var c = 0; c < buffer.numberOfChannels; c++) {
      var srcCh = buffer.getChannelData(c);
      var dst = out.getChannelData(c);
      dst.set(srcCh.subarray(0, bodySamples));
      // Decaying hold of last sample so post-body release fade stays audible
      var last = srcCh[bodySamples - 1] || 0;
      for (var i = 0; i < relSamples; i++) {
        var e = 1 - (i + 1) / relSamples;
        dst[bodySamples + i] = last * e * e;
      }
    }
    return { buffer: out, bodySec: bodySec };
  }

  function playSliceAt(buffer, when, env, opts) {
    if (breathing) return null;
    if (!ctx || !buffer || !master) return null;
    env = env || defaultEnv();
    opts = opts || {};
    var reversePct = Math.max(0, Math.min(100, Number(env.reversePct) || 0));
    var playBuf = buffer;
    var reversed = false;
    if (reversePct > 0 && Math.random() * 100 < reversePct) {
      playBuf = getReversedBuffer(buffer);
      reversed = true;
    }
    var attack = Math.max(0, (env.attackMs || 0) / 1000);
    var release = clampReleaseMs(env.releaseMs) / 1000;
    var pct = Math.max(0.1, Math.min(1, (env.durationPct || 100) / 100));
    // Body = segment content. Release fades AFTER body and may extend past the
    // ring step; the next hit still starts on step time so voices overlap.
    var bodyDur = Math.max(0.01, playBuf.duration * pct);
    if (opts.maxDur != null) bodyDur = Math.min(bodyDur, Math.max(0.012, opts.maxDur));
    if (opts.stutter) {
      attack = Math.min(attack, 0.004);
      release = Math.min(Math.max(release * 0.35, 0.008), 0.04);
    }
    var ext = extendBufferWithReleaseTail(playBuf, bodyDur, release);
    playBuf = ext.buffer;
    bodyDur = ext.bodySec;
    var rel = Math.max(0, release);
    var totalDur = bodyDur + rel;

    // Stay on the grid when possible so overlaps stay continuous
    var t0 = when;
    if (when < ctx.currentTime - 0.001) t0 = ctx.currentTime;

    var src = ctx.createBufferSource();
    src.buffer = playBuf;
    var g = ctx.createGain();
    src.connect(g);
    g.connect(master);

    var peak = opts.stutter ? 0.92 : 1;
    var atk = Math.min(attack, bodyDur * 0.45);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + atk);
    g.gain.setValueAtTime(peak, t0 + bodyDur);
    g.gain.linearRampToValueAtTime(0.0001, t0 + totalDur);

    src.start(t0, 0, totalDur + 0.02);
    activeSources.push(src);
    var fileOffset = opts.slice ? (Number(opts.slice.absStart) || 0) : 0;
    if (reversed && opts.slice) {
      fileOffset = Math.max(0, (Number(opts.slice.absEnd) || fileOffset) - 0.001);
    }
    var voice = { src: src, gain: g, slice: opts.slice || null, startAt: t0, fileOffset: fileOffset };
    activeVoices.push(voice);
    src.onended = function () {
      var idx = activeSources.indexOf(src);
      if (idx >= 0) activeSources.splice(idx, 1);
      var vi = activeVoices.indexOf(voice);
      if (vi >= 0) activeVoices.splice(vi, 1);
    };
    if (opts.slice && opts.slice.slot != null && slots[opts.slice.slot] && slots[opts.slice.slot].videoReady) {
      scheduleVideoHit(opts.slice.slot, opts.slice.absStart, t0, bodyDur, { stutter: !!opts.stutter });
    }
    return src;
  }

  function playCellHits(slice, when, env, stepDur, reps) {
    if (!slice || !slice.buffer) return;
    reps = Math.max(1, Math.min(5, reps || 1));
    if (reps === 1) {
      // No step-length cap — play the full slice (honors Dur %), even if it overlaps the next hit
      playSliceAt(slice.buffer, when, env, { slice: slice });
      return;
    }
    var slot = stepDur / reps;
    for (var r = 0; r < reps; r++) {
      playSliceAt(slice.buffer, when + r * slot, env, {
        maxDur: slot * 0.88,
        stutter: true,
        slice: slice
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
    playCellHits(slice, ctx.currentTime, env, step, reps || 1);
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
    for (var i = 0; i < flat.length; i++) {
      result[i] = pickWeightedSlot(loaded);
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

    var order = getOrderMode();
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

      if (Math.random() < getBreakSkipChance()) return;

      var cursorKey = slotIdx + ':' + beatKey(beats);
      if (seqCursors[cursorKey] == null) seqCursors[cursorKey] = 0;

      var si;
      if (order === 'random') {
        si = pickSliceFromPool(pool, 'random', 0);
      } else {
        var cursor = seqCursors[cursorKey];
        si = pickSliceFromPool(pool, 'sequential', cursor);
        seqCursors[cursorKey] = cursor + 1;
      }

      var reps = 1;
      if (Math.random() < getBreakStutterChance()) {
        reps = pickStutterReps();
      }
      rings[pos.ringIdx].cells[pos.segIdx] = makeCell(si, reps);
    });

    if (order === 'sequential') {
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
    if (breathBtn) breathBtn.disabled = !hasSamples();
    if (!reslicing) resliceBtn.disabled = !hasSamples();
  }

  function updateMeta() {
    if (!hasSamples()) {
      if (waveHint) {
        waveHint.hidden = false;
        waveHint.textContent = 'Upload a sample to begin';
        waveHint.classList.add('is-cta');
        waveHint.disabled = false;
      }
      syncControlsEnabled();
      return;
    }

    if (waveHint) {
      waveHint.hidden = true;
      waveHint.textContent = '';
      waveHint.classList.remove('is-cta');
      waveHint.disabled = true;
    }
    syncControlsEnabled();
  }

  function setResliceProgress(pct) {
    if (!resliceBtn || !resliceBtnLabel) return;
    var n = Math.max(0, Math.min(100, Math.round(pct)));
    resliceBtnLabel.textContent = n + '%';
    resliceBtn.classList.add('is-busy');
    resliceBtn.classList.remove('is-pending');
    resliceBtn.disabled = true;
  }

  function clearResliceProgress() {
    if (!resliceBtn || !resliceBtnLabel) return;
    resliceBtnLabel.textContent = 'Reslice';
    resliceBtn.classList.remove('is-busy');
    resliceBtn.disabled = !hasSamples();
  }

  function yieldFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  }

  async function resliceAndDraw() {
    if (reslicing) return;
    reslicing = true;
    ensureAtLeastOneDuration();
    syncDurationSummary();
    try {
      if (!hasSamples()) {
        slices = [];
        slicesBySlot = [[], [], []];
        slicesBySlotBeats = [{}, {}, {}];
        buildRingsGeometry();
        drawRings();
        drawWaveform();
        updateMeta();
        clearSettingsPending();
        return;
      }

      setResliceProgress(8);
      await yieldFrame();
      ensureAudio();
      loadedSlots().forEach(function (idx) {
        slots[idx].windowStart = clampWindowStartForSlot(idx, slots[idx].windowStart);
      });
      syncWindowSlider();

      setResliceProgress(28);
      await yieldFrame();
      rebuildAllPeaks();

      setResliceProgress(48);
      await yieldFrame();
      chopAllSlots();

      setResliceProgress(68);
      await yieldFrame();
      buildRingsGeometry();

      setResliceProgress(84);
      await yieldFrame();
      sprinkle();

      setResliceProgress(94);
      await yieldFrame();
      drawRings();
      drawWaveform();
      updateMeta();
      clearSettingsPending();

      setResliceProgress(100);
      await yieldFrame();
    } finally {
      reslicing = false;
      clearResliceProgress();
    }
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
    if (slotIdx == null) slotIdx = targetSlotForUpload();
    var wantVideo = isVideoFile(file);
    var arr = await file.arrayBuffer();
    var buf;
    try {
      buf = await ctx.decodeAudioData(arr.slice(0));
    } catch (err) {
      if (sliceMeta) {
        sliceMeta.textContent = wantVideo
          ? 'Could not decode audio from that video'
          : 'Could not decode that file';
      }
      throw err;
    }

    if (playing) stopPlay();
    clearSlotVideo(slotIdx);
    slots[slotIdx].buffer = buf;
    slots[slotIdx].name = file.name || (wantVideo ? 'video' : 'sample');
    slots[slotIdx].windowStart = 0;
    activeSlot = slotIdx;
    ensureSlotMixOnLoad(slotIdx);
    renderSampleSlots();
    updateActiveSampleLab();
    rebuildPeaksForSlot(slotIdx);
    syncWindowSlider();

    if (wantVideo) {
      try {
        await attachAndPreloadVideo(slotIdx, file);
      } catch (err) {
        console.error(err);
        if (sliceMeta) sliceMeta.textContent = 'Video preload failed — audio still loaded';
      }
    }

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
    if (!playing || !ctx || breathing) return;
    while (nextStepTime < ctx.currentTime + LOOK_AHEAD) {
      var info = flatStep(stepCursor);
      var stepDur = beatsToSec(info && info.beats ? info.beats : 0.25);
      var hitTime = nextStepTime;
      if (info && info.si != null && slices[info.si]) {
        lastBreathSlice = slices[info.si];
        playCellHits(slices[info.si], hitTime, info.ring, stepDur, info.reps);
        scheduleLiveHitVisual(info.ringIdx, info.ring.id, info.segIdx, info.reps, hitTime, info.si);
      } else {
        // Skipped / empty — leave video rolling at normal speed
        scheduleLiveHitVisual(info ? info.ringIdx : -1, null, -1, 1, hitTime, -1);
      }
      nextStepTime += stepDur;
      stepCursor += 1;
    }
  }

  function setLiveRing(ringIdx) {
    liveRingIdx = ringIdx;
    var keys = Object.keys(segEls);
    for (var k = 0; k < keys.length; k++) {
      var el = segEls[keys[k]];
      if (!el) continue;
      var ri = Number(el.dataset.ringIdx);
      if (!playing || liveRingIdx < 0) {
        el.style.opacity = '';
        el.classList.remove('is-live-seg');
        continue;
      }
      el.style.opacity = ri === liveRingIdx ? '1' : '0.22';
    }
  }

  function scheduleLiveHitVisual(ringIdx, ringId, segIdx, reps, when, si) {
    if (!ctx) return;
    var delayMs = Math.max(0, (when - ctx.currentTime) * 1000);
    var tid = setTimeout(function () {
      if (!playing) return;
      if (ringIdx >= 0) setLiveRing(ringIdx);
      if (ringId != null && segIdx >= 0) flashSeg(ringId, segIdx, reps);
      if (si >= 0) {
        highlightSlice = si;
        var now = performance.now();
        if (now - lastWaveDrawMs > 90) {
          lastWaveDrawMs = now;
          drawWaveform();
        }
      }
    }, delayMs);
    videoCueTimers.push(tid);
  }

  function flashSeg(ringId, i, reps) {
    var el = segEls[ringId + ':' + i];
    if (!el) return;
    var prevFill = el.getAttribute('fill');
    var prevStroke = el.getAttribute('stroke');
    var prevWidth = el.getAttribute('stroke-width');
    var prevOp = el.getAttribute('stroke-opacity');
    el.classList.add('is-live-seg');
    el.setAttribute('fill', reps > 1 ? '#f2ff9a' : '#e8ff66');
    el.setAttribute('stroke', '#c8ff00');
    el.setAttribute('stroke-width', reps > 1 ? '3' : '2.4');
    el.setAttribute('stroke-opacity', '1');
    setTimeout(function () {
      el.classList.remove('is-live-seg');
      if (prevFill != null) el.setAttribute('fill', prevFill);
      if (prevStroke != null) el.setAttribute('stroke', prevStroke);
      else el.setAttribute('stroke', 'none');
      if (prevWidth != null) el.setAttribute('stroke-width', prevWidth);
      if (prevOp != null) el.setAttribute('stroke-opacity', prevOp);
    }, reps > 1 ? 140 : 110);
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
    if (!ring) return;
    // Clip playhead beam to the live ring band so the active ring is obvious
    var rr = ringRadii(item.ringIdx, rings.length);
    var beam = playheadEl.querySelector('rect');
    if (beam) {
      beam.setAttribute('y', String(CY - rr.outer));
      beam.setAttribute('height', String(Math.max(8, rr.outer - rr.inner)));
      beam.setAttribute('opacity', '1');
    }
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
    liveRingIdx = -1;
    stepCursor = 0;
    rebuildPlayTimeline();
    nextStepTime = ctx.currentTime + 0.08;
    setHubPlaying(true);
    scheduleHubFade();
    keepStageVideoRolling();
    schedule();
    scheduleTimer = setInterval(schedule, SCHEDULE_MS);
    cancelAnimationFrame(playheadRaf);
    playheadRaf = requestAnimationFrame(playheadLoop);
    startVizLoop();
    if (playMeta) playMeta.textContent = 'Playing';
  }

  function stopPlay() {
    playing = false;
    clearInterval(scheduleTimer);
    scheduleTimer = 0;
    cancelAnimationFrame(playheadRaf);
    playheadRaf = 0;
    stopActiveSources();
    highlightSlice = -1;
    liveRingIdx = -1;
    setLiveRing(-1);
    clearHubFade();
    setHubPlaying(false);
    keepStageVideoRolling();
    updatePlayhead();
    drawWaveform();
    updateMeta();
  }

  function togglePlay() {
    if (playing) stopPlay();
    else startPlay();
  }

  function openAboutModal() {
    if (!aboutModal) return;
    aboutModal.hidden = false;
  }

  function closeAboutModal() {
    if (!aboutModal) return;
    aboutModal.hidden = true;
  }

  function startApp() {
    playUiClick();
    launchOverlay.classList.add('hidden');
    appRoot.hidden = false;
    ensureAudio();
    renderSampleSlots();
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

  function setAppMenuOpen(open) {
    if (!appMenu || !menuBtn) return;
    appMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open && menuFileSub) menuFileSub.hidden = true;
  }

  function openSettingsModal() {
    setAppMenuOpen(false);
    if (!settingsModal) return;
    settingsSnapshot = captureSettingsSnapshot();
    renderDurationOptions();
    syncDurationSummary();
    if (bpmVal) bpmVal.textContent = String(getBpm());
    if (ringCountVal) ringCountVal.textContent = String(getRingCount());
    settingsModal.hidden = false;
  }

  function closeSettingsModal(opts) {
    opts = opts || {};
    if (!settingsModal) return;
    if (opts.restore && settingsSnapshot) {
      restoreSettingsSnapshot(settingsSnapshot);
      // Pending state may still come from macro bar — leave as-is unless only settings changed
    }
    settingsModal.hidden = true;
    settingsSnapshot = null;
  }

  function applySettingsFromModal() {
    if (playing) stopPlay();
    resliceAndDraw();
    closeSettingsModal({ restore: false });
  }

  function tryCloseSettings() {
    if (!settingsModal || settingsModal.hidden) return;
    if (settingsPending) {
      var ok = window.confirm('Apply your settings changes to the wheel?');
      if (ok) {
        applySettingsFromModal();
      } else {
        closeSettingsModal({ restore: true });
      }
      return;
    }
    closeSettingsModal({ restore: false });
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
    for (var f = 0; f < numFrames; f++) {
      for (var ch = 0; ch < numChannels; ch++) {
        var s = buffer.getChannelData(ch)[f];
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

  function copyBufferToContext(buffer, octx) {
    var out = octx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (var c = 0; c < buffer.numberOfChannels; c++) {
      out.getChannelData(c).set(buffer.getChannelData(c));
    }
    return out;
  }

  function reverseCopiedBuffer(buffer, octx) {
    var out = octx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (var c = 0; c < buffer.numberOfChannels; c++) {
      var src = buffer.getChannelData(c);
      var dst = out.getChannelData(c);
      for (var i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    }
    return out;
  }

  function scheduleOfflineSlice(octx, dest, buffer, when, env, opts) {
    if (!buffer || !dest) return;
    env = env || defaultEnv();
    opts = opts || {};
    var reversePct = Math.max(0, Math.min(100, Number(env.reversePct) || 0));
    var playBuf = buffer;
    if (reversePct > 0 && Math.random() * 100 < reversePct) {
      playBuf = reverseCopiedBuffer(buffer, octx);
    }
    var attack = Math.max(0, (env.attackMs || 0) / 1000);
    var release = clampReleaseMs(env.releaseMs) / 1000;
    var pct = Math.max(0.1, Math.min(1, (env.durationPct || 100) / 100));
    var bodyDur = Math.max(0.01, playBuf.duration * pct);
    if (opts.maxDur != null) bodyDur = Math.min(bodyDur, Math.max(0.012, opts.maxDur));
    if (opts.stutter) {
      attack = Math.min(attack, 0.004);
      release = Math.min(Math.max(release * 0.35, 0.008), 0.04);
    }
    var sr = playBuf.sampleRate;
    var bodySamples = Math.min(playBuf.length, Math.max(1, Math.round(bodyDur * sr)));
    bodyDur = bodySamples / sr;
    var rel = Math.max(0, release);
    var relSamples = rel > 0.0008 ? Math.max(1, Math.round(rel * sr)) : 0;
    var useBuf = playBuf;
    if (relSamples > 0) {
      useBuf = octx.createBuffer(playBuf.numberOfChannels, bodySamples + relSamples, sr);
      for (var c = 0; c < playBuf.numberOfChannels; c++) {
        var srcCh = playBuf.getChannelData(c);
        var dst = useBuf.getChannelData(c);
        dst.set(srcCh.subarray(0, bodySamples));
        var last = srcCh[bodySamples - 1] || 0;
        for (var i = 0; i < relSamples; i++) {
          var e = 1 - (i + 1) / relSamples;
          dst[bodySamples + i] = last * e * e;
        }
      }
    }
    var src = octx.createBufferSource();
    src.buffer = useBuf;
    var g = octx.createGain();
    src.connect(g);
    g.connect(dest);
    var peak = opts.stutter ? 0.92 : 1;
    var atk = Math.min(attack, bodyDur * 0.45);
    var totalDur = bodyDur + rel;
    var t0 = Math.max(0, when);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + atk);
    g.gain.setValueAtTime(peak, t0 + bodyDur);
    g.gain.linearRampToValueAtTime(0.0001, t0 + totalDur);
    try { src.start(t0, 0, totalDur + 0.02); } catch (err) { /* skip */ }
  }

  function scheduleOfflineCellHits(octx, dest, buffer, when, env, stepDur, reps) {
    reps = Math.max(1, Math.min(5, reps || 1));
    if (reps === 1) {
      scheduleOfflineSlice(octx, dest, buffer, when, env, {});
      return;
    }
    var slot = stepDur / reps;
    for (var r = 0; r < reps; r++) {
      scheduleOfflineSlice(octx, dest, buffer, when + r * slot, env, {
        maxDur: slot * 0.88,
        stutter: true
      });
    }
  }

  async function saveWheelWav() {
    setAppMenuOpen(false);
    if (savingWav) return;
    if (!hasSamples() || !playTimeline.length || !slices.length) {
      window.alert('Load samples and Reslice before saving.');
      return;
    }
    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) {
      window.alert('WAV export is not supported in this browser.');
      return;
    }
    savingWav = true;
    if (menuSaveBtn) menuSaveBtn.textContent = 'Saving…';
    try {
      ensureAudio();
      var loopSec = 0;
      for (var i = 0; i < playTimeline.length; i++) {
        loopSec += beatsToSec(playTimeline[i].beats || 0.25);
      }
      if (!(loopSec > 0)) loopSec = barDurationSec();
      var maxSliceSec = 0;
      for (var ms = 0; ms < slices.length; ms++) {
        if (slices[ms] && slices[ms].buffer) {
          maxSliceSec = Math.max(maxSliceSec, slices[ms].buffer.duration);
        }
      }
      var tail = Math.max(0.2, maxSliceSec + RELEASE_MAX_MS / 1000 + 0.05);
      var durationSec = loopSec + tail;
      var sampleRate = (ctx && ctx.sampleRate) || 44100;
      var octx = new OfflineCtx(2, Math.ceil(durationSec * sampleRate), sampleRate);
      var dest = octx.createGain();
      dest.gain.value = 0.9;
      dest.connect(octx.destination);

      var copied = [];
      for (var s = 0; s < slices.length; s++) {
        copied[s] = slices[s] && slices[s].buffer
          ? copyBufferToContext(slices[s].buffer, octx)
          : null;
      }

      var t = 0;
      for (var step = 0; step < playTimeline.length; step++) {
        var info = flatStep(step);
        var stepDur = beatsToSec(info && info.beats ? info.beats : 0.25);
        if (info && info.si != null && copied[info.si]) {
          scheduleOfflineCellHits(
            octx,
            dest,
            copied[info.si],
            t,
            info.ring,
            stepDur,
            info.reps
          );
        }
        t += stepDur;
      }

      var rendered = await octx.startRendering();
      var blob = encodeWavFromBuffer(rendered);
      downloadBlob(blob, 'circle-remixer-' + getBpm() + 'bpm.wav');
    } catch (err) {
      console.error(err);
      window.alert('Could not save WAV.');
    } finally {
      savingWav = false;
      if (menuSaveBtn) menuSaveBtn.textContent = 'Save WAV';
    }
  }

  // —— Events ——
  launchGo.addEventListener('click', startApp);
  launchOverlay.addEventListener('click', function (e) {
    if (e.target === launchOverlay || e.target === launchGo) startApp();
  });

  if (menuBtn) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setAppMenuOpen(appMenu && appMenu.hidden);
    });
  }
  if (menuFileBtn) {
    menuFileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menuFileSub) menuFileSub.hidden = !menuFileSub.hidden;
    });
  }
  if (menuUploadBtn) {
    menuUploadBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setAppMenuOpen(false);
      openSamplesModal();
    });
  }
  if (menuSaveBtn) {
    menuSaveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      saveWheelWav();
    });
  }
  if (menuSettingsBtn) {
    menuSettingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openSettingsModal();
    });
  }
  document.addEventListener('click', function () {
    setAppMenuOpen(false);
  });
  if (appMenu) {
    appMenu.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (settingsApply) {
    settingsApply.addEventListener('click', applySettingsFromModal);
  }
  if (settingsCancel) {
    settingsCancel.addEventListener('click', function () {
      closeSettingsModal({ restore: true });
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', function (e) {
      if (e.target === settingsModal) tryCloseSettings();
    });
  }
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) {
      if (e.key !== 'Escape') return;
    }

    if (e.key === 'Escape') {
      if (aboutModal && !aboutModal.hidden) {
        closeAboutModal();
        return;
      }
      if (samplesModal && !samplesModal.hidden) {
        closeSamplesModal();
        return;
      }
      if (settingsModal && !settingsModal.hidden) {
        tryCloseSettings();
        return;
      }
      setAppMenuOpen(false);
      return;
    }

    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      wheelHidden = !wheelHidden;
      syncWheelVisibility();
    }
  });

  if (appTitleBtn) {
    appTitleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openAboutModal();
    });
  }
  if (aboutModalClose) {
    aboutModalClose.addEventListener('click', closeAboutModal);
  }
  if (aboutModal) {
    aboutModal.addEventListener('click', function (e) {
      if (e.target === aboutModal) closeAboutModal();
    });
  }

  if (waveHint) {
    waveHint.addEventListener('click', function () {
      if (!waveHint.classList.contains('is-cta')) return;
      openSamplesModal();
    });
  }

  bpmEl.addEventListener('input', function () {
    bpmVal.textContent = String(getBpm());
    markSettingsPending();
  });

  if (orderModeEl) {
    orderModeEl.addEventListener('change', function () {
      syncModePanels();
      markBreakerCustom();
      markSettingsPending();
    });
  }

  if (macroModeEl) {
    macroModeEl.addEventListener('change', function () {
      var id = macroModeEl.value;
      if (!id || id === 'custom') {
        markBreakerCustom();
        return;
      }
      applyBreakerPreset(id, true);
    });
  }

  if (diceBtn) {
    diceBtn.addEventListener('click', function () {
      rollDice();
    });
  }

  if (seqSwapEl) {
    seqSwapEl.addEventListener('change', function () {
      markBreakerCustom();
      markSettingsPending();
    });
  }

  function onBreakerParamInput() {
    markBreakerCustom();
    syncBreakerSliderLabels();
    markSettingsPending();
  }

  if (breakSkipEl) breakSkipEl.addEventListener('change', onBreakerParamInput);
  if (breakStutterEl) breakStutterEl.addEventListener('change', onBreakerParamInput);
  if (breakIntensityEl) breakIntensityEl.addEventListener('change', onBreakerParamInput);

  if (applyToAllBtn) {
    applyToAllBtn.addEventListener('click', function () {
      applyEnvToAllRings();
    });
  }

  ringCountEl.addEventListener('input', function () {
    ringCountVal.textContent = String(getRingCount());
    markSettingsPending();
  });

  resliceBtn.addEventListener('click', function () {
    if (playing) stopPlay();
    resliceAndDraw();
  });

  if (breathBtn) {
    var breathPtr = -1;
    function onBreathDown(e) {
      if (breathBtn.disabled) return;
      if (e.type === 'mousedown' && e.button !== 0) return;
      e.preventDefault();
      if (e.pointerId != null) {
        breathPtr = e.pointerId;
        try { breathBtn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      beginBreath();
    }
    function onBreathUp(e) {
      if (e.pointerId != null && breathPtr >= 0 && e.pointerId !== breathPtr) return;
      breathPtr = -1;
      endBreath();
    }
    breathBtn.addEventListener('pointerdown', onBreathDown);
    breathBtn.addEventListener('pointerup', onBreathUp);
    breathBtn.addEventListener('pointercancel', onBreathUp);
    breathBtn.addEventListener('lostpointercapture', onBreathUp);
    breathBtn.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }

  if (wheelToggleBtn) {
    wheelToggleBtn.addEventListener('click', function () {
      wheelHidden = !wheelHidden;
      syncWheelVisibility();
    });
  }

  if (sliceWindowOpenBtn) {
    sliceWindowOpenBtn.addEventListener('click', function () {
      openSamplesModal();
    });
  }

  if (samplesModalClose) {
    samplesModalClose.addEventListener('click', closeSamplesModal);
  }
  if (samplesModalDone) {
    samplesModalDone.addEventListener('click', closeSamplesModal);
  }
  if (samplesModal) {
    samplesModal.addEventListener('click', function (e) {
      if (e.target === samplesModal) closeSamplesModal();
    });
  }

  if (viewSampleSelect) {
    viewSampleSelect.addEventListener('change', function () {
      var idx = Number(viewSampleSelect.value);
      if (!Number.isFinite(idx)) return;
      setActiveSlot(idx);
    });
  }

  hubBtn.addEventListener('click', togglePlay);

  if (circleWrap) {
    circleWrap.addEventListener('pointermove', function () {
      pokeHubVisible();
    });
    circleWrap.addEventListener('pointerdown', function () {
      pokeHubVisible();
    });
    circleWrap.addEventListener('click', function (e) {
      if (!wheelHidden) return;
      if (e.target.closest('#hubBtn')) return;
      if (hubBtn.disabled) return;
      togglePlay();
    });
  }

  if (windowStartEl) {
    windowStartEl.addEventListener('input', function () {
      // Move window preview only — chop/sprinkle waits for Reslice
      setWindowStart(Number(windowStartEl.value) || 0, false);
      markSettingsPending();
    });
  }

  [ringAttackEl, ringReleaseEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', applyEnvFromUi);
  });
  if (ringDurEl) {
    ringDurEl.addEventListener('change', applyEnvFromUi);
  }
  if (ringReverseEl) {
    ringReverseEl.addEventListener('change', applyEnvFromUi);
  }

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
      setWindowStart(overviewSecFromClientX(e.clientX), false);
      markSettingsPending();
    });
    overviewWrap.addEventListener('pointermove', function (e) {
      if (!overviewDrag) return;
      setWindowStart(overviewSecFromClientX(e.clientX), false);
      markSettingsPending();
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
  syncDurationSummary();
  renderSampleSlots();
  renderBreakerPresets();
  applyBreakerPreset('balanced', false);
  syncModePanels();
  syncWheelVisibility();
})();

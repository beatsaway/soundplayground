/**
 * Circle Beat NPC dancers — 1–3 Free NPC Maker characters.
 * Auto-orbit; bass drives FX; swap any two on strong lows; 180° flips.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  randomConfig,
  resolveConfig,
  autoRigAvatar,
  loadHumanAnimationClips,
  getAdaptedClips,
} from "/freenpc/index.js";
import {
  attachMeshOutline,
  tickMeshOutline,
  HAND_FPS,
} from "/freenpc/materials/glitchWire.js";
import { setPaintFrame, setBassEnergy } from "/freenpc/materials/imperfectFill.js";

const HAND_DT = 1 / HAND_FPS;
const FADE_SEC = 0.28;
const MIN_SWAP_SEC = 0.55;
const SIDE_GAP = 0.68;
const SKIP_CLIP =
  /death|sleeping|crawl|flying|glide|levitat|swim|push.?up|lay\s*to|slide|dodge|sit|kneel|fall|prone/i;

const _camOffset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _focusTarget = new THREE.Vector3(0, 0.95, 0);
const _midTarget = new THREE.Vector3(0, 0.95, 0);
const _tmpColor = new THREE.Color();
const _baseCamPos = new THREE.Vector3();
const _shakeLook = new THREE.Vector3();
const _camShake = new THREE.Vector3();
const NEON_A = new THREE.Color(0x22ffcc);
const NEON_B = new THREE.Color(0xff33dd);
const NEON_C = new THREE.Color(0xaaee22);

const BASS_FX_FLOOR = 0.18;
const BASS_FX_TOP = 0.75;

let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let clock = null;
/** @type {ReturnType<typeof makeDancer>[]} */
let dancers = [];
let sourceClips = null;
/** False until the first Lucky Roll NPC spawn finishes (cold path = neon countdown). */
let hasSpawnedOnce = false;
let enabled = true;
let visible = false;
/** Music transport — hide dancers while paused/stopped. */
let musicPlaying = false;
let handAcc = 0;
let handFrame = 0;
let swapGeneration = 0;
let bassSmooth = 0;
let bassPrev = 0;
let userRadius = 4.6;
let draggingOrbit = false;
/** True while a gesture began on the drum wheel — orbit stays off for that gesture. */
let orbitBlockedByWheel = false;
let lastPosSwapAt = 0;
let lastFlipAt = 0;
let focusIndex = 0;
let lastFocusAt = 0;
let glitchMode = 0;
/** Decaying / held camera pitch — strong high (look down) or low (look up). */
let pitchTargetPhi = null;
let pitchHoldUntil = 0;
let lastPitchAt = 0;
let pitchDir = 1;
/** Playback rate multiplier — ramps toward boost on strong lows (up to 3×). */
let speedMul = 1;
let speedMulTarget = 1;
let speedBoostUntil = 0;
const NEON_BASS_FLOOR = 0.6;
const SPEED_BOOST_FLOOR = 0.55;
const SPEED_BOOST_MAX = 3.0;
const SPEED_BOOST_HOLD = 0.55;
const PITCH_BASS_FLOOR = 0.62;

let readyResolve;
const ready = new Promise((r) => {
  readyResolve = r;
});

function effectBass(b) {
  return THREE.MathUtils.smoothstep(b, BASS_FX_FLOOR, BASS_FX_TOP);
}

/** Lane X positions for n dancers (1–3), centered. */
function laneXs(n) {
  if (n <= 1) return [0];
  if (n === 2) return [-SIDE_GAP * 0.85, SIDE_GAP * 0.85];
  return [-SIDE_GAP, 0, SIDE_GAP];
}

function pickDanceClips(clips) {
  const ok = clips.filter((c) => c && c.name && !SKIP_CLIP.test(c.name));
  return ok.length ? ok : clips.slice();
}

function disposeMeshTree(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.();
    const mats = o.material
      ? Array.isArray(o.material)
        ? o.material
        : [o.material]
      : [];
    for (const m of mats) {
      m?.map?.dispose?.();
      m?.dispose?.();
    }
  });
}

function disposeAllDancers() {
  for (const d of dancers) {
    if (d.group && scene) scene.remove(d.group);
    disposeMeshTree(d.group);
  }
  dancers = [];
}

function makeDancer() {
  return {
    group: null,
    mixer: null,
    outlineMats: [],
    danceClips: [],
    currentAction: null,
    currentClipName: "",
    lastClipName: "",
    lastSwapAt: 0,
    slot: 0,
    targetX: 0,
    yaw: 0,
    targetYaw: 0,
    /** @type {{ mat: THREE.Material, base: THREE.Color }[]} */
    colorTargets: [],
  };
}

function captureMeshColors(d) {
  d.colorTargets = [];
  d.group?.traverse((o) => {
    if (!o.isMesh || o.userData.isOutline) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat?.color) continue;
      if (!mat.userData._baseColor) mat.userData._baseColor = mat.color.clone();
      d.colorTargets.push({ mat, base: mat.userData._baseColor });
    }
  });
}

function applyMeshColorGlitch(d, eBass, frame) {
  if (!d.colorTargets?.length) return;
  if (eBass < NEON_BASS_FLOOR) {
    restoreMeshColors(d);
    return;
  }
  // Mid strength: readable neon punches, no dark/bright strobe
  const amt = THREE.MathUtils.smoothstep(eBass, NEON_BASS_FLOOR, 0.94) * 0.72;
  const t = ((Math.floor(frame / 2) * 17 + d.slot * 91) % 1000) / 1000;
  const neon = t < 0.33 ? NEON_A : t < 0.66 ? NEON_B : NEON_C;
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.35 + d.slot);

  for (const { mat, base } of d.colorTargets) {
    _tmpColor.copy(base);
    _tmpColor.lerp(neon, amt * (0.4 + 0.45 * pulse));
    if (amt > 0.55 && pulse > 0.75) _tmpColor.lerp(neon, 0.35);
    mat.color.copy(_tmpColor);
    mat.needsUpdate = true;
  }
}

function restoreMeshColors(d) {
  for (const { mat, base } of d.colorTargets || []) mat.color.copy(base);
}

/** Circular hit-test for the drum wheel (SVG disc), not the square wrap. */
function isOverWheel(clientX, clientY) {
  const wrap = document.getElementById("circleWrap");
  if (!wrap) return false;
  const r = wrap.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cx = r.left + r.width * 0.5;
  const cy = r.top + r.height * 0.5;
  // OUTER=470 in viewBox 1000 → ~0.94 of half-size; slight pad for halo/glow.
  const rad = Math.min(r.width, r.height) * 0.5 * 0.96;
  const dx = clientX - cx;
  const dy = clientY - cy;
  return dx * dx + dy * dy <= rad * rad;
}

function isOverHub(clientX, clientY) {
  const hub = document.getElementById("hubBtn");
  if (!hub) return false;
  const r = hub.getBoundingClientRect();
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

/** Wheel disc or play/stop hub — orbit must not steal these. */
function isOverWheelUi(clientX, clientY) {
  return isOverHub(clientX, clientY) || isOverWheel(clientX, clientY);
}

/**
 * Keep orbit off the wheel/hub: pointer-events pass through when over them.
 * Mid-orbit drag keeps the canvas live even if the pointer crosses the wheel.
 */
function syncWheelPassthrough(clientX, clientY) {
  if (!canvas || !visible || !enabled || !musicPlaying) return;
  if (draggingOrbit) {
    canvas.style.pointerEvents = "auto";
    return;
  }
  const over = isOverWheelUi(clientX, clientY);
  canvas.style.pointerEvents = over ? "none" : "auto";
  if (controls) controls.enabled = !over && !orbitBlockedByWheel;
}

function retargetPointerDown(e, under) {
  if (!under || under === canvas) return;
  try {
    under.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        button: e.button,
        buttons: e.buttons,
        pressure: e.pressure,
      })
    );
  } catch (_) {
    /* ignore */
  }
}

function onCanvasPointerDown(e) {
  if (!visible || !enabled || !musicPlaying) return;
  if (isOverWheelUi(e.clientX, e.clientY)) {
    orbitBlockedByWheel = true;
    draggingOrbit = false;
    if (controls) controls.enabled = false;
    canvas.style.pointerEvents = "none";
    e.stopImmediatePropagation();
    // Prefer hub so play/stop gets the gesture; else whatever is under the canvas.
    const hub = document.getElementById("hubBtn");
    const under = isOverHub(e.clientX, e.clientY)
      ? hub
      : document.elementFromPoint(e.clientX, e.clientY);
    retargetPointerDown(e, under);
    return;
  }
  orbitBlockedByWheel = false;
  if (controls) controls.enabled = true;
  draggingOrbit = true;
  if (controls) controls.autoRotate = false;
}

function onPointerUp(e) {
  if (draggingOrbit && camera && controls) {
    userRadius = camera.position.distanceTo(controls.target);
  }
  draggingOrbit = false;
  orbitBlockedByWheel = false;
  if (controls) {
    controls.enabled = true;
    if (visible && enabled && musicPlaying) controls.autoRotate = true;
  }
  if (!canvas || !visible || !enabled || !musicPlaying) return;
  // Keep PE none over wheel/hub so the following `click` reaches play/stop & segments.
  const x = e && typeof e.clientX === "number" ? e.clientX : null;
  const y = e && typeof e.clientY === "number" ? e.clientY : null;
  if (x != null && y != null && isOverWheelUi(x, y)) {
    canvas.style.pointerEvents = "none";
  } else {
    canvas.style.pointerEvents = "auto";
  }
}

/** Subtle handheld micro-shake — layered sines, barely-there unless bass breathes. */
function applyHandShake(now, eBass) {
  if (!camera || draggingOrbit) {
    _camShake.set(0, 0, 0);
    return;
  }
  const amp = 0.008 + eBass * 0.014;
  const t = now;
  const sx =
    Math.sin(t * 1.15) * 0.52 +
    Math.sin(t * 2.85 + 0.7) * 0.28 +
    Math.sin(t * 6.4 + 1.4) * 0.12;
  const sy =
    Math.sin(t * 1.4 + 1.1) * 0.48 +
    Math.sin(t * 3.35 + 0.3) * 0.26 +
    Math.sin(t * 7.1 + 2.0) * 0.1;
  const sz =
    Math.sin(t * 0.95 + 0.4) * 0.4 +
    Math.sin(t * 4.2 + 1.8) * 0.22 +
    Math.sin(t * 8.5) * 0.08;
  _camShake.set(sx * amp, sy * amp * 0.62, sz * amp * 0.85);
  camera.position.add(_camShake);
  _shakeLook.copy(controls.target);
  _shakeLook.x += Math.sin(t * 1.9 + 0.5) * amp * 0.22;
  _shakeLook.y += Math.cos(t * 1.55) * amp * 0.16;
  camera.lookAt(_shakeLook);
}

function ensureRenderer() {
  if (renderer) return;
  canvas = document.getElementById("npcCanvas");
  if (!canvas) return;
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.05, 50);
  camera.position.set(0, 1.4, 4.6);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.95, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 2.0;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.15;
  controls.update();
  userRadius = camera.position.distanceTo(controls.target);

  // Capture runs before OrbitControls — block orbit when down starts on the wheel.
  canvas.addEventListener("pointerdown", onCanvasPointerDown, true);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  controls.addEventListener("end", () => {
    if (camera && controls) userRadius = camera.position.distanceTo(controls.target);
  });

  canvas.addEventListener("pointermove", (e) => syncWheelPassthrough(e.clientX, e.clientY));
  window.addEventListener("pointermove", (e) => {
    if (!canvas || !visible) return;
    if (canvas.style.pointerEvents === "none" || isOverWheelUi(e.clientX, e.clientY)) {
      syncWheelPassthrough(e.clientX, e.clientY);
    }
  });

  scene.add(new THREE.AmbientLight(0xfff6e0, 0.7));
  scene.add(new THREE.HemisphereLight(0xfff4d6, 0xe8d090, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(1.6, 3.2, 2.4);
  scene.add(key);

  clock = new THREE.Clock();
  resize();
}

function resize() {
  if (!renderer || !canvas || !camera) return;
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || innerWidth;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || innerHeight;
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

async function ensureClips() {
  if (sourceClips) return sourceClips;
  sourceClips = await loadHumanAnimationClips();
  return sourceClips;
}

function speedFromBass(b) {
  return (0.55 + effectBass(b) * 0.55) * speedMul;
}

/** Kick a ramp toward up to 300% speed for a short hold. */
function maybeSpeedBoost(now) {
  const e = effectBass(bassSmooth);
  const rise = bassSmooth - bassPrev;
  if (e < SPEED_BOOST_FLOOR || rise < 0.05) return;
  if (now < speedBoostUntil - 0.15) return; // already boosting
  speedMulTarget = 2.2 + Math.random() * (SPEED_BOOST_MAX - 2.2); // ~220–300%
  speedBoostUntil = now + SPEED_BOOST_HOLD;
}

function tickSpeedMul(now) {
  if (now < speedBoostUntil) {
    speedMul = THREE.MathUtils.lerp(speedMul, speedMulTarget, 0.18);
  } else {
    speedMulTarget = 1;
    speedMul = THREE.MathUtils.lerp(speedMul, 1, 0.07);
    if (speedMul < 1.02) speedMul = 1;
  }
}

/**
 * Crane angle swap — same rare pace as lane position swaps.
 * Sometimes high (look down), sometimes low (look up).
 */
function maybePitchKick(now) {
  if (now - lastPitchAt < 3.2) return;
  const e = effectBass(bassSmooth);
  const rise = bassSmooth - bassPrev;
  if (e < PITCH_BASS_FLOOR) return;
  if (rise < 0.055) return;
  if (Math.random() > 0.45) return;
  // Random up or down (bias slightly against repeating the same angle)
  const goHigh = Math.random() < 0.5;
  const nextPhi = goHigh ? 0.38 : 1.28;
  if (pitchTargetPhi != null && Math.abs(pitchTargetPhi - nextPhi) < 0.05 && Math.random() < 0.65) {
    pitchTargetPhi = goHigh ? 1.28 : 0.38;
  } else {
    pitchTargetPhi = nextPhi;
  }
  pitchDir = pitchTargetPhi < 1 ? 1 : -1;
  pitchHoldUntil = now + 1.1 + e * 0.35;
  lastPitchAt = now;
}

function swapGapFromBass(b) {
  return MIN_SWAP_SEC / (0.7 + effectBass(b) * 1.2);
}

function playClip(d, clip, { fade = FADE_SEC, forceRestart = false } = {}) {
  if (!d?.mixer || !clip) return;
  let useClip = clip;
  if (forceRestart || (d.currentAction && d.currentClipName === clip.name)) {
    useClip = clip.clone();
    useClip.name = `${clip.name}__hop_${swapGeneration++}`;
  }
  const next = d.mixer.clipAction(useClip);
  next.enabled = true;
  next.setLoop(THREE.LoopOnce, 1);
  next.clampWhenFinished = true;
  next.reset();
  next.setEffectiveWeight(1);
  next.timeScale = speedFromBass(bassSmooth);
  next.play();

  if (d.currentAction && d.currentAction !== next) {
    d.currentAction.crossFadeTo(next, fade, false);
    const prev = d.currentAction;
    window.setTimeout(() => {
      try {
        prev.stop();
      } catch (_) {
        /* ignore */
      }
    }, (fade + 0.05) * 1000);
  }

  d.lastClipName = d.currentClipName || clip.name;
  d.currentAction = next;
  d.currentClipName = clip.name;
  d.lastSwapAt = performance.now() / 1000;
}

function pickNextClip(d) {
  const clips = d.danceClips;
  if (!clips.length) return null;
  const prev = d.currentClipName || d.lastClipName;
  const canRepeat = prev && clips.some((c) => c.name === prev);
  if (canRepeat && Math.random() < 0.5) {
    return clips.find((c) => c.name === prev) || clips[0];
  }
  if (clips.length === 1) return clips[0];
  let pick = clips[Math.floor(Math.random() * clips.length)];
  let guard = 0;
  while (pick.name === d.currentClipName && guard++ < 8) {
    pick = clips[Math.floor(Math.random() * clips.length)];
  }
  return pick;
}

function changeDance(d, reason) {
  if (!visible || !enabled || !d?.mixer || !d.danceClips.length) return;
  const now = performance.now() / 1000;
  if (reason !== "finished" && now - d.lastSwapAt < swapGapFromBass(bassSmooth)) return;
  const clip = pickNextClip(d);
  if (!clip) return;
  const isRepeat = clip.name === d.currentClipName;
  playClip(d, clip, { fade: FADE_SEC, forceRestart: isRepeat || reason === "finished" });
}

function maybeBassDanceChange(reason) {
  if (!visible || !enabled) return;
  const e = effectBass(bassSmooth);
  if (reason !== "finished" && e < 0.15) return;
  const chance = 0.12 + e * 0.7;
  if (reason === "finished" || Math.random() < chance) {
    for (const d of dancers) changeDance(d, reason);
  }
}

function applyLaneMotion() {
  for (const d of dancers) {
    if (!d.group) continue;
    d.group.position.x = THREE.MathUtils.lerp(d.group.position.x, d.targetX, 0.2);
    d.yaw = THREE.MathUtils.lerp(d.yaw, d.targetYaw, 0.14);
    d.group.rotation.y = d.yaw;
  }
}

/**
 * Swap lane positions of two random dancers (any count ≥ 2).
 * Strong low-band onset only — not easy.
 */
function maybeSwapPositions(now) {
  if (dancers.length < 2) return;
  if (now - lastPosSwapAt < 3.2) return;
  const e = effectBass(bassSmooth);
  const rise = bassSmooth - bassPrev;
  if (e < 0.62) return;
  if (rise < 0.055) return;
  if (Math.random() > 0.45) return;

  let i = Math.floor(Math.random() * dancers.length);
  let j = Math.floor(Math.random() * dancers.length);
  let guard = 0;
  while (j === i && guard++ < 8) j = Math.floor(Math.random() * dancers.length);
  if (i === j) return;

  const tx = dancers[i].targetX;
  dancers[i].targetX = dancers[j].targetX;
  dancers[j].targetX = tx;
  lastPosSwapAt = now;
}

/**
 * Strong low-band → turn some dancers 180°.
 * Likely 1, sometimes 2, occasionally all present.
 */
function maybeFlipOrientation(now) {
  if (!dancers.length) return;
  if (now - lastFlipAt < 2.8) return;
  const e = effectBass(bassSmooth);
  const rise = bassSmooth - bassPrev;
  if (e < 0.58) return;
  if (rise < 0.05) return;

  const n = dancers.length;
  const r = Math.random();
  let howMany = 1;
  if (n >= 3 && r > 0.92) howMany = 3;
  else if (n >= 2 && r > 0.7) howMany = 2;
  howMany = Math.min(howMany, n);

  const idx = dancers.map((_, i) => i);
  for (let a = idx.length - 1; a > 0; a--) {
    const b = Math.floor(Math.random() * (a + 1));
    const t = idx[a];
    idx[a] = idx[b];
    idx[b] = t;
  }
  for (let k = 0; k < howMany; k++) {
    dancers[idx[k]].targetYaw += Math.PI;
  }
  lastFlipAt = now;
}

function maybeSwitchFocus(now) {
  if (dancers.length < 1) return;
  const e = effectBass(bassSmooth);
  const gap = THREE.MathUtils.lerp(6.5, 2.8, e);
  if (now - lastFocusAt < gap) return;
  if (dancers.length === 1) focusIndex = 0;
  else {
    let next = Math.floor(Math.random() * dancers.length);
    if (next === focusIndex) next = (focusIndex + 1) % dancers.length;
    focusIndex = next;
  }
  lastFocusAt = now;
  glitchMode = (glitchMode + 1) % 3;
}

function focusedWorldPos(out) {
  const d = dancers[focusIndex] || dancers[0];
  if (!d?.group) {
    out.set(0, 0.95, 0);
    return out;
  }
  out.set(d.group.position.x, 0.95, d.group.position.z);
  return out;
}

async function buildOneDancer(slot, x) {
  const d = makeDancer();
  d.slot = slot;
  d.targetX = x;
  const config = resolveConfig(randomConfig(Date.now() + Math.random() * 1e9 + slot * 7919));
  const result = await autoRigAvatar(config);
  d.group = result.group;
  d.group.position.set(x, 0, 0);
  // Unique random facing per NPC
  const yaw = (Math.random() * 2 - 1) * Math.PI;
  d.yaw = yaw;
  d.targetYaw = yaw;
  d.group.rotation.y = yaw;
  d.group.scale.setScalar(0.82);
  scene.add(d.group);

  d.outlineMats = attachMeshOutline(d.group);
  captureMeshColors(d);
  const adapted = getAdaptedClips(sourceClips, result.meta?.totalHeight);
  d.danceClips = pickDanceClips(adapted);

  d.mixer = new THREE.AnimationMixer(d.group);
  d.mixer.addEventListener("finished", (e) => {
    if (e.action !== d.currentAction) return;
    changeDance(d, "finished");
  });

  const first = pickNextClip(d);
  if (first) playClip(d, first, { fade: 0.01, forceRestart: false });
  return d;
}

async function spawnRandom(opts = {}) {
  const deferShow = !!opts.deferShow;
  ensureRenderer();
  if (!renderer) throw new Error("npcCanvas missing");
  await ensureClips();
  disposeAllDancers();

  const count = 1 + Math.floor(Math.random() * 3); // 1..3
  const xs = laneXs(count);
  const scale = count === 1 ? 0.9 : count === 2 ? 0.82 : 0.74;

  lastPosSwapAt = performance.now() / 1000;
  lastFlipAt = performance.now() / 1000;
  lastPitchAt = performance.now() / 1000;
  pitchTargetPhi = null;
  pitchHoldUntil = 0;
  focusIndex = Math.floor(Math.random() * count);
  lastFocusAt = performance.now() / 1000;
  glitchMode = 0;

  const built = [];
  for (let i = 0; i < count; i++) {
    const d = await buildOneDancer(i, xs[i]);
    d.group.scale.setScalar(scale);
    built.push(d);
  }
  dancers = built;
  hasSpawnedOnce = true;

  visible = true;
  if (controls) {
    controls.target.set(0, 0.95, 0);
    camera.position.set(0, 1.4, count >= 3 ? 5.1 : 4.6);
    controls.update();
    userRadius = camera.position.distanceTo(controls.target);
  }
  resize();
  if (deferShow) {
    // Built but hidden until countdown / caller reveals.
    if (canvas) {
      canvas.classList.remove("is-on");
      canvas.style.pointerEvents = "none";
    }
    if (controls) controls.autoRotate = false;
  } else {
    syncCanvasShown();
  }
}

/** True for the first NPC spawn (cold GLBs / first mesh build). Later rolls are fast. */
function willSpawnBeSlow() {
  return !hasSpawnedOnce || !sourceClips;
}

function revealNpc() {
  syncCanvasShown();
}

function syncCanvasShown() {
  const show = visible && enabled && musicPlaying && dancers.length > 0;
  if (canvas) {
    canvas.classList.toggle("is-on", show);
    canvas.style.pointerEvents = show ? "auto" : "none";
  }
  if (controls) controls.autoRotate = show;
  if (!show && renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }
}

function setMusicPlaying(on) {
  musicPlaying = !!on;
  syncCanvasShown();
}

function clearNpc() {
  for (const d of dancers) restoreMeshColors(d);
  disposeAllDancers();
  visible = false;
  bassSmooth = 0;
  bassPrev = 0;
  speedMul = 1;
  speedMulTarget = 1;
  speedBoostUntil = 0;
  pitchTargetPhi = null;
  pitchHoldUntil = 0;
  lastPitchAt = 0;
  if (controls) controls.autoRotate = false;
  if (canvas) {
    canvas.classList.remove("is-on");
    canvas.style.pointerEvents = "none";
  }
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }
}

function setEnabled(on) {
  enabled = !!on;
  // Hide without disposing — Visual menu can turn NPCs back on mid-session.
  syncCanvasShown();
}

function onBeat(sampleId) {
  if (!visible || !enabled) return;
  if (sampleId === "kick" || sampleId === "snare") {
    maybeBassDanceChange(sampleId);
    if (sampleId === "kick" && effectBass(bassSmooth) > NEON_BASS_FLOOR && Math.random() < 0.25) {
      glitchMode = (glitchMode + 1) % 3;
    }
  }
}

function tick(bass) {
  if (!renderer || !scene || !camera) return;
  if (!visible || !enabled || !musicPlaying || !dancers.length) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    return;
  }

  const now = performance.now() / 1000;
  if (typeof bass === "number" && Number.isFinite(bass)) {
    const b = Math.max(0, Math.min(1, bass));
    bassSmooth = bassSmooth * 0.8 + b * 0.2;
    const rise = bassSmooth - bassPrev;
    if (effectBass(bassSmooth) > 0.28 && rise > 0.05) {
      maybeBassDanceChange("bass");
      if (effectBass(bassSmooth) > NEON_BASS_FLOOR && Math.random() < 0.12) {
        glitchMode = (glitchMode + 1) % 3;
      }
    }
    maybeSpeedBoost(now);
    maybePitchKick(now);
    maybeSwapPositions(now);
    maybeFlipOrientation(now);
    bassPrev = bassSmooth;
  }

  tickSpeedMul(now);
  maybeSwitchFocus(now);
  applyLaneMotion();

  const eBass = effectBass(bassSmooth);
  const speed = speedFromBass(bassSmooth);
  for (const d of dancers) {
    if (d.currentAction) d.currentAction.timeScale = speed;
  }

  setBassEnergy(eBass > NEON_BASS_FLOOR ? eBass * 0.55 : 0);

  focusedWorldPos(_focusTarget);
  _focusTarget.lerp(_midTarget, dancers.length === 1 ? 0.15 : 0.35);
  controls.target.lerp(_focusTarget, 0.06);

  const focusDist = userRadius * (0.72 - eBass * eBass * 0.08);
  if (!draggingOrbit) {
    // Auto-rotate first, then force a clear high/low crane angle
    if (controls) {
      controls.autoRotateSpeed = 0.85 + eBass * 1.1;
      controls.update();
    }
    _camOffset.copy(camera.position).sub(controls.target);
    _spherical.setFromVector3(_camOffset);
    const nowPitch = performance.now() / 1000;
    const restingPhi = 1.05; // comfortable 3/4 view
    let wantPhi = restingPhi;
    if (pitchTargetPhi != null && nowPitch < pitchHoldUntil) {
      wantPhi = pitchTargetPhi;
    } else {
      pitchTargetPhi = null;
    }
    _spherical.phi = THREE.MathUtils.lerp(
      _spherical.phi,
      THREE.MathUtils.clamp(wantPhi, 0.32, Math.min(controls.maxPolarAngle - 0.04, 1.35)),
      wantPhi === restingPhi ? 0.045 : 0.14
    );
    const cur = _spherical.radius;
    const next = THREE.MathUtils.lerp(cur, Math.max(controls.minDistance, focusDist), 0.05);
    _spherical.radius = next > 1e-4 ? next : cur;
    _camOffset.setFromSpherical(_spherical);
    camera.position.copy(controls.target).add(_camOffset);
    camera.lookAt(controls.target);
  } else if (controls) {
    controls.update();
  }

  // Snapshot clean orbit pose, then add subtle handheld shake for render only.
  _baseCamPos.copy(camera.position);
  applyHandShake(now, eBass);

  const dt = Math.min(clock.getDelta(), HAND_DT * 2);
  handAcc += dt;
  if (handAcc < HAND_DT) {
    renderer.render(scene, camera);
    camera.position.copy(_baseCamPos);
    return;
  }
  handAcc -= HAND_DT;
  if (handAcc > HAND_DT) handAcc = 0;
  handFrame += 1;
  for (const d of dancers) {
    if (d.mixer) d.mixer.update(HAND_DT);
    tickMeshOutline(d.outlineMats, handFrame, eBass > NEON_BASS_FLOOR ? eBass * 0.5 : 0.03);
    applyMeshColorGlitch(d, eBass, handFrame);
  }
  setPaintFrame(handFrame);
  renderer.render(scene, camera);
  camera.position.copy(_baseCamPos);
}

window.CircleNpc = {
  ready,
  spawnRandom,
  willSpawnBeSlow,
  revealNpc,
  clearNpc,
  setEnabled,
  setMusicPlaying,
  isEnabled: () => enabled,
  isVisible: () => visible,
  onBeat,
  tick,
  resize,
};

ensureRenderer();
ensureClips()
  .then(() => readyResolve())
  .catch((err) => {
    console.warn("[CircleNpc] warmup failed", err);
    readyResolve();
  });

window.addEventListener("resize", () => resize());

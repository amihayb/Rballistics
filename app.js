'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  AMMO:  'bc_ammo',
  RANGE: 'bc_range',
  ROLL:  'bc_roll',
  VY:    'bc_vy',
  VZ:    'bc_vz',
  THEME: 'bc_theme',
};

const DEG2RAD = Math.PI / 180;

// Long-press threshold in ms
const HOLD_DELAY    = 400;   // ms before fine-step kicks in
const HOLD_INTERVAL = 80;    // ms between repeat steps while held

// ─── State ────────────────────────────────────────────────────────────────────
let ballisticData = {};
let selectedAmmo  = null;
let _lastResult   = null;

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyStoredTheme();
  await loadBallisticTable();
  buildAmmoDropdown();
  restoreInputs();
  bindEvents();
  bindSteppers();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyStoredTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(_theme) {
  // no icon element; theme is visible via CSS data-theme attribute
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  updateThemeIcon(next);
  if (_lastResult) drawReticle(_lastResult);
}

// ─── CSV loader ───────────────────────────────────────────────────────────────
async function loadBallisticTable() {
  try {
    const resp = await fetch('ballistic-table.csv');
    if (!resp.ok) throw new Error('fetch failed');
    const text = await resp.text();
    parseCSV(text);
  } catch (e) {
    console.error('Could not load ballistic-table.csv:', e);
  }
}

function parseCSV(text) {
  const lines   = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const idxAmmo  = headers.indexOf('Ammo');
  const idxRange = headers.indexOf('fRange');
  const idxSE    = headers.indexOf('fSE');
  const idxTOF   = headers.indexOf('fTOF');
  const idxDrift = headers.indexOf('fDrift');

  ballisticData = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols  = line.split(',');
    const ammo  = cols[idxAmmo]?.trim();
    const range = parseFloat(cols[idxRange]);
    const SE    = parseFloat(cols[idxSE]);
    const TOF   = parseFloat(cols[idxTOF]);
    const drift = parseFloat(cols[idxDrift]);
    if (!ammo || isNaN(range)) continue;
    if (!ballisticData[ammo]) ballisticData[ammo] = [];
    ballisticData[ammo].push({ range, SE, TOF, drift });
  }

  Object.values(ballisticData).forEach(arr => arr.sort((a, b) => a.range - b.range));
}

// ─── Ammo dropdown ────────────────────────────────────────────────────────────
function buildAmmoDropdown() {
  const sel     = document.getElementById('ammoSelect');
  const ammoKeys = Object.keys(ballisticData);

  if (!ammoKeys.length) {
    const opt = document.createElement('option');
    opt.textContent = '⚠ ballistic-table.csv not found';
    sel.appendChild(opt);
    return;
  }

  const stored = localStorage.getItem(STORAGE_KEYS.AMMO);
  selectedAmmo = ammoKeys.includes(stored) ? stored : ammoKeys[0];

  ammoKeys.forEach(key => {
    const opt = document.createElement('option');
    opt.value       = key;
    opt.textContent = key.replace(/_/g, '  ·  ');
    opt.selected    = key === selectedAmmo;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    selectedAmmo = sel.value;
    localStorage.setItem(STORAGE_KEYS.AMMO, selectedAmmo);
  });
}

// ─── Input persistence ────────────────────────────────────────────────────────
function restoreInputs() {
  [['Range','inputRange'], ['Roll','inputRoll'], ['Vy','inputVy'], ['Vz','inputVz']].forEach(([key, id]) => {
    const val = localStorage.getItem(STORAGE_KEYS[key]);
    if (val !== null) document.getElementById(id).value = val;
  });
}

function saveInputs() {
  [['RANGE','inputRange'], ['ROLL','inputRoll'], ['VY','inputVy'], ['VZ','inputVz']].forEach(([key, id]) => {
    localStorage.setItem(STORAGE_KEYS[key], document.getElementById(id).value);
  });
}

// ─── Stepper buttons (tap = coarse, hold = fine) ──────────────────────────────
function bindSteppers() {
  document.querySelectorAll('.step-btn').forEach(btn => {
    let holdTimer   = null;
    let repeatTimer = null;

    function applyStep(fine) {
      const targetId = btn.dataset.target;
      const input    = document.getElementById(targetId);
      const step     = parseFloat(fine ? btn.dataset.fine : btn.dataset.step);
      let   val      = parseFloat(input.value) || 0;

      // Determine decimal places from the step to avoid float drift
      const decimals = (step.toString().split('.')[1] || '').length;
      val = parseFloat((val + step).toFixed(decimals));

      // Clamp if min/max defined
      if (input.min !== '') val = Math.max(parseFloat(input.min), val);
      if (input.max !== '') val = Math.min(parseFloat(input.max), val);

      input.value = val;
      // Dispatch change so any listeners fire
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function startHold() {
      btn.classList.add('held');
      repeatTimer = setInterval(() => applyStep(true), HOLD_INTERVAL);
    }

    function endHold() {
      btn.classList.remove('held');
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = repeatTimer = null;
    }

    // Pointer events (covers both mouse and touch uniformly)
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      applyStep(false);                          // immediate coarse step on tap
      holdTimer = setTimeout(startHold, HOLD_DELAY);
    });

    btn.addEventListener('pointerup',     endHold);
    btn.addEventListener('pointerleave',  endHold);
    btn.addEventListener('pointercancel', endHold);
  });
}

// ─── General events ───────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('calcBtn').addEventListener('click', calculate);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  let autoCalcTimer = null;
  function scheduleCalc() {
    clearTimeout(autoCalcTimer);
    autoCalcTimer = setTimeout(() => {
      if (document.getElementById('inputRange').value !== '') calculate();
    }, 300);
  }

  ['inputRange', 'inputRoll', 'inputVy', 'inputVz'].forEach(id => {
    const inp = document.getElementById(id);
    inp.addEventListener('input', scheduleCalc);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
  });
}

// ─── Linear interpolation ─────────────────────────────────────────────────────
function interpolate(table, range) {
  if (!table || !table.length) return null;
  const minR = table[0].range;
  const maxR = table[table.length - 1].range;
  if (range <= minR) return { ...table[0] };
  if (range >= maxR) return { ...table[table.length - 1] };

  let lo = 0;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i].range <= range && range <= table[i + 1].range) { lo = i; break; }
  }
  const hi = lo + 1;
  const t  = (range - table[lo].range) / (table[hi].range - table[lo].range);
  return {
    range,
    SE:    table[lo].SE    + t * (table[hi].SE    - table[lo].SE),
    TOF:   table[lo].TOF   + t * (table[hi].TOF   - table[lo].TOF),
    drift: table[lo].drift + t * (table[hi].drift  - table[lo].drift),
  };
}

// ─── Core calculation ─────────────────────────────────────────────────────────
function calculate() {
  saveInputs();

  const rangeVal = parseFloat(document.getElementById('inputRange').value);
  const rollDeg  = parseFloat(document.getElementById('inputRoll').value) || 0;
  const Vy       = parseFloat(document.getElementById('inputVy').value)   || 0;
  const Vz       = parseFloat(document.getElementById('inputVz').value)   || 0;

  if (isNaN(rangeVal) || rangeVal < 0) {
    alert('Please enter a valid range (≥ 0 m).');
    return;
  }
  if (!selectedAmmo || !ballisticData[selectedAmmo]) {
    alert('No ammo selected or ballistic table not loaded.');
    return;
  }

  const interp = interpolate(ballisticData[selectedAmmo], rangeVal);
  if (!interp) return;

  const rollRad = rollDeg * DEG2RAD;
  const cosR    = Math.cos(rollRad);
  const sinR    = Math.sin(rollRad);

  const SE_pure    = interp.SE;
  const Drift_pure = interp.drift;
  const TOF        = interp.TOF;

  // TOF lead
  const pitchLead = Vy * TOF;
  const yawLead   = Vz * TOF;

  // Roll-compensated ballistic
  const pitchAfterRoll = SE_pure * cosR    - Drift_pure * sinR;
  const yawAfterRoll   = SE_pure * sinR    + Drift_pure * cosR;
  const pitchRollDelta = pitchAfterRoll - SE_pure;
  const yawRollDelta   = yawAfterRoll   - Drift_pure;

  // Total
  const pitchTotal = pitchAfterRoll + pitchLead;
  const yawTotal   = yawAfterRoll   + yawLead;

  const result = {
    SE_pure, Drift_pure, TOF,
    pitchLead, yawLead,
    pitchRollDelta, yawRollDelta,
    pitchAfterRoll, yawAfterRoll,
    pitchTotal, yawTotal,
    range: rangeVal, rollDeg,
  };

  _lastResult = result;
  displayResults(result);
  drawReticle(result);
  document.getElementById('resultsCard').classList.add('visible');
  document.getElementById('noResultHint').style.display = 'none';
}

// ─── Display ──────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(2);
}

function displayResults(r) {
  document.getElementById('resPitchBallistic').textContent = fmt(r.SE_pure);
  document.getElementById('resYawBallistic').textContent   = fmt(r.Drift_pure);
  document.getElementById('resPitchTOF').textContent       = fmt(r.pitchLead);
  document.getElementById('resYawTOF').textContent         = fmt(r.yawLead);
  document.getElementById('resPitchRoll').textContent      = fmt(r.pitchRollDelta);
  document.getElementById('resYawRoll').textContent        = fmt(r.yawRollDelta);
  document.getElementById('resPitchTotal').textContent     = fmt(r.pitchTotal);
  document.getElementById('resYawTotal').textContent       = fmt(r.yawTotal);
  document.getElementById('resTOF').textContent            = r.TOF.toFixed(3);
  document.getElementById('resRangeInterp').textContent    = r.range;
}

// ─── Reticle canvas ───────────────────────────────────────────────────────────
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawReticle(r) {
  const canvas = document.getElementById('reticleCanvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  const bgColor     = getCSSVar('--color-app-bg');
  const borderColor = getCSSVar('--color-border');
  const mutedColor  = getCSSVar('--color-text-muted');
  const balCol      = getCSSVar('--color-ballistic');
  const tofCol      = getCSSVar('--color-tof');
  const totCol      = getCSSVar('--color-total');

  // Background circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, W / 2 - 3, 0, Math.PI * 2);
  ctx.clip();

  // Grid rings
  [0.25, 0.5, 0.75, 1.0].forEach(f => {
    ctx.beginPath();
    ctx.arc(cx, cy, f * (W / 2 - 3), 0, Math.PI * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Crosshair
  ctx.strokeStyle = mutedColor;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(cx, 4);   ctx.lineTo(cx, H - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, cy);   ctx.lineTo(W - 4, cy); ctx.stroke();
  ctx.setLineDash([]);

  // Axis labels
  ctx.fillStyle = mutedColor;
  ctx.font = '10px Lato, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('UP', cx, 14);
  ctx.fillText('DN', cx, H - 4);
  ctx.textAlign = 'left';   ctx.fillText('R', W - 16, cy + 4);
  ctx.textAlign = 'right';  ctx.fillText('L', 16, cy + 4);

  // Scale
  const maxVal = Math.max(
    Math.abs(r.pitchTotal), Math.abs(r.yawTotal),
    Math.abs(r.SE_pure),    Math.abs(r.Drift_pure),
    2
  );
  const scale = (W / 2 - 20) / maxVal;

  const toX = yaw   =>  cx + yaw   * scale;
  const toY = pitch =>  cy - pitch  * scale;

  function drawLine(px, py, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.restore();
  }

  function drawMarker(px, py, color, size, shape) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 2.5;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(px, py, size / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(px,           py - size / 2);
      ctx.lineTo(px + size / 2, py);
      ctx.lineTo(px,           py + size / 2);
      ctx.lineTo(px - size / 2, py);
      ctx.closePath(); ctx.stroke();
    } else { // cross
      const h = size / 2;
      ctx.beginPath(); ctx.moveTo(px - h, py); ctx.lineTo(px + h, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py - h); ctx.lineTo(px, py + h); ctx.stroke();
    }
    ctx.restore();
  }

  // Pure ballistic (circle)
  const bx = toX(r.Drift_pure), by = toY(r.SE_pure);
  drawLine(bx, by, balCol);
  drawMarker(bx, by, balCol, 11, 'circle');

  // TOF lead point (diamond) — ballistic + lead, no roll applied
  const tx = toX(r.Drift_pure + r.yawLead), ty = toY(r.SE_pure + r.pitchLead);
  drawLine(tx, ty, tofCol);
  drawMarker(tx, ty, tofCol, 10, 'diamond');

  // Total solution (cross)
  const ox = toX(r.yawTotal), oy = toY(r.pitchTotal);
  drawLine(ox, oy, totCol);
  drawMarker(ox, oy, totCol, 13, 'cross');

  // Origin dot
  ctx.save();
  ctx.fillStyle = mutedColor;
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore(); // end clip
}

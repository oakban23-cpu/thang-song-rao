(() => {
'use strict';
const { T, COLS, ROWS, VW, VH, DT, LIFT_H } = Phys;
const $ = s => document.querySelector(s);
const TH = '๐๑๒๓๔๕๖๗๘๙';
const th = n => String(n).replace(/\d/g, d => TH[d]);
const C = {
  pink: '#ff6f9c', pinkD: '#c94372', mint: '#4fe0bf', mintD: '#22a184', gold: '#ffcf5a', ink: '#1a1530', paper: '#f5edff',
  sky0: '#181436', sky1: '#35225b', sky2: '#77395f', far: '#3a2556', near: '#2a1b42',
  stone: '#b5835a', stone2: '#a8774f', stone3: '#bd8c61', mortar: '#5e3d2a', moss: '#7bb65b', mossD: '#4c853d',
  water: '#1c6676', waterL: '#5cc3c9', door: '#2b2350', spike: '#e2dcf0', spikeD: '#6c6390', leaf: '#3f8f4a', leafL: '#6cc06a'
};
const IDC = ['', '#ffcf5a', '#ff8a5c', '#b38cff', '#5ec8ff', '#a6e05a', '#ff7ad1'];
const FONT = '"IBM Plex Sans Thai", "Leelawadee UI", Thonburi, sans-serif';
const FONT_D = 'Chonburi, "Leelawadee UI", Thonburi, serif';

const store = {
  get(k, d) { try { const v = localStorage.getItem('thangsongrao:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('thangsongrao:' + k, JSON.stringify(v)); } catch (e) {} }
};
const ALL = [LEVELS, LEVELS2, LEVELS3].flatMap((set, c) => set.map((l, i) => Object.assign({ ch: c + 1, n: i + 1 }, l)));
const CHAPTERS = [1, 2, 3];
const CH_NAME = { 1: 'ฝึกมือ', 2: 'ใช้หัว', 3: 'โลกแปลก' };
const CH_NEXT = { 1: 'บทที่ ๒ แต่ละด่านมีทางผ่านทางเดียว ต้องวางแผนลำดับก่อนลงมือ', 2: 'บทที่ ๓ โลกเริ่มแปลก มีด้ายแดงผูกกันไว้ เงาย้อนเวลา และหินสลับร่าง' };
let prog = store.get('prog2', null);
if (!prog || !prog.u) {
  prog = { u: { 1: 0, 2: 0 }, h: {} };
  const old = store.get('prog', null);
  if (old && typeof old.unlocked === 'number') {
    prog.u[1] = Math.min(old.unlocked, LEVELS.length);
    for (const k in (old.hearts || {})) if (LEVELS[k]) prog.h[LEVELS[k].name] = old.hearts[k];
  }
}
const heartsIn = i => (ALL[i].map.join('').match(/\*/g) || []).length;
const isOpen = i => ALL[i].n - 1 <= (prog.u[ALL[i].ch] || 0);
const lvLabel = i => `ด่าน ${th(ALL[i].ch)}-${th(ALL[i].n)}`;
const firstOf = ch => ALL.findIndex(l => l.ch === ch);

/* ---------- DOM ---------- */
const app = $('#app'), stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const scr = { title: $('#sTitle'), pause: $('#sPause'), clear: $('#sClear'), online: $('#sOnline') };
const nPink = $('#nPink'), nMint = $('#nMint'), snd = $('#snd');
const isTouch = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !window.matchMedia('(pointer: fine)').matches;
app.classList.toggle('touch', isTouch);

/* ---------- State ---------- */
const S = { mode: 'menu', li: 0, W: null, deathT: 0, winT: 0, flash: 0, banner: 0, deaths: 0, elapsed: 0, parts: [], time: 0, deadId: null, shake: 0, gates: [], names: { pink: 'เค้า', mint: 'ตัวเอง' }, sound: true };
const KB = { pink: { left: false, right: false, jump: false }, mint: { left: false, right: false, jump: false } };
const TC = { pink: { left: false, right: false, jump: false }, mint: { left: false, right: false, jump: false } };
const JP = { pink: false, mint: false };
const input = id => ({ left: KB[id].left || TC[id].left, right: KB[id].right || TC[id].right, jump: KB[id].jump || TC[id].jump, jp: JP[id] });

/* ---------- Sound ---------- */
let ac = null;
function audio() {
  if (!S.sound) return null;
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
  return ac;
}
function tone(f, d = .08, type = 'sine', v = .08, slide = 0, delay = 0) {
  const a = audio(); if (!a) return;
  try {
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const sfx = {
  jump(id) { tone(id === 'pink' ? 540 : 430, .1, 'square', .04, id === 'pink' ? 860 : 690); },
  land() { tone(150, .06, 'triangle', .05); },
  plate() { tone(320, .05, 'square', .04); },
  door() { tone(120, .2, 'sawtooth', .04, 80); },
  heart() { tone(880, .08, 'triangle', .07); tone(1320, .12, 'triangle', .07, 0, .07); },
  die() { tone(440, .4, 'sawtooth', .06, 90); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .2, 'triangle', .07, 0, i * .09)); },
  bell() { tone(1318, .9, 'sine', .07); tone(1975, .6, 'sine', .03, 0, .01); tone(659, 1.1, 'sine', .04); },
  ghost() { tone(880, .5, 'sine', .05, 330); tone(1320, .4, 'triangle', .02, 440, .05); },
  swap() { tone(300, .18, 'sawtooth', .05, 900); tone(900, .18, 'sawtooth', .04, 300, .12); }
};

/* ---------- Helpers ---------- */
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function heartPath(g, cx, cy, s) {
  g.beginPath(); g.moveTo(cx, cy + s * .85);
  g.bezierCurveTo(cx - s * 1.25, cy + s * .05, cx - s * .85, cy - s * .95, cx, cy - s * .35);
  g.bezierCurveTo(cx + s * .85, cy - s * .95, cx + s * 1.25, cy + s * .05, cx, cy + s * .85);
  g.closePath();
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const fmt = s => { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };

/* ---------- Canvas fit ---------- */
let scale = 1;
const bg = document.createElement('canvas');
function fit() {
  const r = stage.getBoundingClientRect();
  const s = Math.max(.1, Math.min(r.width / VW, r.height / VH));
  const cw = Math.floor(VW * s), ch = Math.floor(VH * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
  scale = cv.width / VW;
  buildBg();
}

/* ---------- Background + static tiles ---------- */
function prang(g, cx, base, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w * .75, base - h * .1, w * 1.5, h * .1);
  g.fillRect(cx - w * .6, base - h * .18, w * 1.2, h * .09);
  g.beginPath();
  g.moveTo(cx - w / 2, base - h * .18);
  g.lineTo(cx - w / 2, base - h * .42);
  g.bezierCurveTo(cx - w / 2, base - h * .82, cx - w * .14, base - h * .9, cx, base - h * .94);
  g.bezierCurveTo(cx + w * .14, base - h * .9, cx + w / 2, base - h * .82, cx + w / 2, base - h * .42);
  g.lineTo(cx + w / 2, base - h * .18); g.closePath(); g.fill();
  g.fillRect(cx - 1.5, base - h * 1.08, 3, h * .16);
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 2;
  for (let k = 1; k <= 4; k++) {
    const yy = base - h * (.42 + k * .1), ww = w * (.5 - k * .07);
    g.beginPath(); g.moveTo(cx - ww, yy); g.quadraticCurveTo(cx, yy + 4, cx + ww, yy); g.stroke();
  }
}
function drawStone(g, L, x, y) {
  const px = x * T, py = y * T;
  const solid = (xx, yy) => yy < 0 || yy >= ROWS || xx < 0 || xx >= COLS || L.grid[yy][xx] === '#';
  const h = hash(x, y);
  g.fillStyle = [C.stone, C.stone2, C.stone3][h % 3];
  g.fillRect(px, py, T, T);
  g.fillStyle = C.mortar;
  g.fillRect(px, py + 15, T, 2);
  g.fillRect(px + (y % 2 ? 7 : 23), py, 2, 15);
  g.fillRect(px + (y % 2 ? 23 : 7), py + 17, 2, 15);
  g.fillStyle = 'rgba(255,232,196,.14)';
  g.fillRect(px, py, T, 1.5); g.fillRect(px, py + 17, T, 1.5);
  if (h % 7 === 0) { g.fillStyle = 'rgba(60,35,25,.35)'; g.fillRect(px + 12, py + 4, 6, 2); g.fillRect(px + 16, py + 6, 2, 5); }
  const all = solid(x, y - 1) && solid(x, y + 1) && solid(x - 1, y) && solid(x + 1, y);
  if (all) { g.fillStyle = 'rgba(24,12,30,.32)'; g.fillRect(px, py, T, T); return; }
  if (!solid(x, y + 1)) { g.fillStyle = 'rgba(20,10,25,.3)'; g.fillRect(px, py + T - 4, T, 4); }
  if (!solid(x - 1, y)) { g.fillStyle = 'rgba(255,232,196,.12)'; g.fillRect(px, py, 2, T); }
  if (!solid(x + 1, y)) { g.fillStyle = 'rgba(20,10,25,.22)'; g.fillRect(px + T - 3, py, 3, T); }
  if (!solid(x, y - 1)) {
    g.fillStyle = C.mossD; g.fillRect(px, py, T, 6);
    g.fillStyle = C.moss; g.fillRect(px, py, T, 4);
    g.beginPath();
    for (let k = 0; k < 3; k++) { const tx = px + 4 + ((h >> (k * 3)) % 24); g.moveTo(tx, py); g.lineTo(tx + 2, py - 4 - (h >> k) % 3); g.lineTo(tx + 4, py); }
    g.fill();
  }
}
function buildBg() {
  if (!S.W) return;
  bg.width = cv.width; bg.height = cv.height;
  const g = bg.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const L = S.W.L, R = rng(S.li * 7919 + 13);
  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, C.sky0); sky.addColorStop(.62, C.sky1); sky.addColorStop(1, C.sky2);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = `rgba(255,244,220,${.25 + R() * .6})`;
    const s = R() < .12 ? 2 : 1.2;
    g.fillRect(R() * VW, R() * VH * .6, s, s);
  }
  const mx = VW * (.7 + R() * .2), my = 70 + R() * 30;
  const glow = g.createRadialGradient(mx, my, 10, mx, my, 90);
  glow.addColorStop(0, 'rgba(255,226,170,.35)'); glow.addColorStop(1, 'rgba(255,226,170,0)');
  g.fillStyle = glow; g.fillRect(mx - 90, my - 90, 180, 180);
  g.fillStyle = '#ffeccc'; g.beginPath(); g.arc(mx, my, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.sky1; g.beginPath(); g.arc(mx + 9, my - 5, 19, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 4; i++) prang(g, 80 + R() * (VW - 160), VH - 10, 50 + R() * 30, 180 + R() * 90, C.far);
  for (let i = 0; i < 3; i++) prang(g, 60 + R() * (VW - 120), VH, 70 + R() * 30, 150 + R() * 60, C.near);
  g.fillStyle = C.near; g.fillRect(0, VH - 26, VW, 26);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const t = L.grid[y][x];
    if (t === '#') drawStone(g, L, x, y);
    else if (t === '-') {
      const px = x * T, py = y * T;
      g.fillStyle = '#5e3a22'; g.fillRect(px + 4, py + 7, 3, 6); g.fillRect(px + T - 7, py + 7, 3, 6);
      g.fillStyle = '#8b5a35'; g.fillRect(px, py, T, 8);
      g.fillStyle = '#b07a4a'; g.fillRect(px, py, T, 2);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + T - 1, py, 1, 8);
    }
  }
  S.gates = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const t = L.grid[y][x]; if (t === 'p' || t === 'm') S.gates.push({ x, y, c: t }); }
}

/* ---------- Drawing ---------- */
function drawGates(g, L, t) {
  for (const q of S.gates) {
    const col = q.c === 'p' ? C.pink : C.mint, px = q.x * T, py = q.y * T;
    g.fillStyle = hexA(col, .17 + .07 * Math.sin(t * 2.4 + q.x * .7 + q.y * .4));
    g.fillRect(px, py, T, T);
    g.save(); g.beginPath(); g.rect(px, py, T, T); g.clip();
    g.strokeStyle = hexA(col, .42); g.lineWidth = 2;
    const o = (t * 16) % 16;
    for (let k = -T; k < T * 2; k += 16) { g.beginPath(); g.moveTo(px + k + o - T, py + T); g.lineTo(px + k + o, py); g.stroke(); }
    g.restore();
    g.fillStyle = hexA(col, .95);
    const same = (xx, yy) => L.grid[yy] && L.grid[yy][xx] === q.c;
    if (!same(q.x, q.y - 1)) g.fillRect(px, py, T, 2);
    if (!same(q.x, q.y + 1)) g.fillRect(px, py + T - 2, T, 2);
    if (!same(q.x - 1, q.y)) g.fillRect(px, py, 2, T);
    if (!same(q.x + 1, q.y)) g.fillRect(px + T - 2, py, 2, T);
  }
}
function numeral(g, n, x, y, col, size = 13) {
  g.font = `600 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col; g.fillText(th(n), x, y + 1);
}
function drawDoors(g, L) {
  for (const d of L.doors) {
    const px = d.x * T, py = d.y * T, h = T * (1 - d.anim), col = IDC[d.id];
    g.strokeStyle = hexA(col, .35); g.lineWidth = 1; g.setLineDash([3, 4]);
    g.strokeRect(px + 3.5, py + .5, T - 7, T - 1); g.setLineDash([]);
    if (h > .5) {
      g.fillStyle = C.door; g.fillRect(px + 3, py, T - 6, h);
      g.fillStyle = col; g.fillRect(px + 3, py, 3, h); g.fillRect(px + T - 6, py, 3, h);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(px + 6, py, T - 12, Math.min(h, 3));
      if (h > 20) numeral(g, d.id, px + T / 2, py + h / 2, col, 17);
    }
  }
}
function drawBridges(g, L) {
  for (const b of L.bridges) {
    const px = b.x * T, py = b.y * T, col = IDC[b.id];
    if (b.anim < 1) {
      g.strokeStyle = hexA(col, .5); g.setLineDash([4, 4]); g.lineWidth = 1.5;
      g.strokeRect(px + 2.5, py + 2.5, T - 5, T - 5); g.setLineDash([]);
    }
    if (b.anim > 0) {
      g.globalAlpha = b.anim;
      g.fillStyle = hexA(col, .3); g.fillRect(px + 1, py + 1, T - 2, T - 2);
      g.strokeStyle = hexA(col, .95); g.lineWidth = 2; g.strokeRect(px + 2, py + 2, T - 4, T - 4);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px + 3, py + 3, T - 6, 2);
      g.globalAlpha = 1;
    }
    numeral(g, b.id, px + T / 2, py + T / 2, hexA(col, .35 + .55 * b.anim), 12);
  }
}
function drawPlates(g, L) {
  for (const p of L.plates) {
    const px = p.x * T, by = (p.y + 1) * T, col = IDC[p.id], heavy = p.need > 1, ph = (heavy ? 8 : 7) - 4 * p.anim;
    if (p.anim > .05) {
      const gl = g.createRadialGradient(px + T / 2, by - 4, 2, px + T / 2, by - 4, 26);
      gl.addColorStop(0, hexA(col, .45 * p.anim)); gl.addColorStop(1, hexA(col, 0));
      g.fillStyle = gl; g.fillRect(px - 10, by - 30, T + 20, 30);
    }
    g.fillStyle = C.door; g.fillRect(px + (heavy ? 1 : 3), by - 3, T - (heavy ? 2 : 6), 3);
    g.fillStyle = col; g.fillRect(px + (heavy ? 2 : 5), by - 3 - ph, T - (heavy ? 4 : 10), ph);
    if (heavy) {
      g.fillStyle = 'rgba(26,21,48,.55)';
      for (let k = 0; k < 4; k++) g.fillRect(px + 5 + k * 6.5, by - 3 - ph, 2.5, ph);
      for (let k = 0; k < 2; k++) {
        const dx = px + T / 2 + (k ? 6 : -6), dy = by - 30;
        g.beginPath(); g.arc(dx, dy, 4, 0, Math.PI * 2);
        g.fillStyle = (p.load || 0) > k ? col : 'rgba(26,21,48,.7)'; g.fill();
        g.strokeStyle = col; g.lineWidth = 1.2; g.stroke();
      }
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px + (heavy ? 2 : 5), by - 3 - ph, T - (heavy ? 4 : 10), 1.5);
    g.globalAlpha = .95; numeral(g, p.id, px + T / 2, by - 18, col, 15); g.globalAlpha = 1;
  }
}
function drawToggles(g, L) {
  for (const s of L.toggles) {
    const px = s.x * T, by = (s.y + 1) * T, col = IDC[s.id], cx = px + T / 2;
    const a = -0.65 + 1.3 * s.anim;
    g.strokeStyle = '#d9d0ee'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, by - 6); g.lineTo(cx + Math.sin(a) * 16, by - 6 - Math.cos(a) * 16); g.stroke(); g.lineCap = 'butt';
    g.beginPath(); g.arc(cx + Math.sin(a) * 16, by - 6 - Math.cos(a) * 16, 4.5, 0, Math.PI * 2);
    g.fillStyle = s.anim > .5 ? col : '#6c6390'; g.fill();
    rr(g, px + 6, by - 8, T - 12, 8, 3); g.fillStyle = C.door; g.fill();
    g.strokeStyle = col; g.lineWidth = 1.5; g.stroke();
    numeral(g, s.id, px + (s.anim > .5 ? 7 : T - 7), by - 24, col, 12);
  }
}
function drawLifts(g, L) {
  for (const l of L.lifts) {
    const cx = l.x + l.w / 2, col = IDC[l.id];
    g.strokeStyle = hexA(col, .28); g.setLineDash([3, 6]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, Math.min(l.y0, l.y1) + 4); g.lineTo(cx, Math.max(l.y0, l.y1) + 4); g.stroke(); g.setLineDash([]);
    rr(g, l.x + 1, l.y, l.w - 2, LIFT_H + 2, 6); g.fillStyle = C.leaf; g.fill();
    rr(g, l.x + 4, l.y, l.w - 8, 4, 2); g.fillStyle = C.leafL; g.fill();
    g.strokeStyle = 'rgba(20,50,20,.45)'; g.lineWidth = 1;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx, l.y + 7); g.lineTo(l.x + k * l.w / 4, l.y + 2); g.stroke(); }
    const fx = l.x + l.w - 10, fy = l.y - 2;
    g.fillStyle = '#ff9fc0';
    for (const a of [-.6, 0, .6]) { g.save(); g.translate(fx, fy); g.rotate(a); g.beginPath(); g.ellipse(0, -5, 3.2, 6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = C.gold; g.beginPath(); g.arc(fx, fy, 1.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.door; g.beginPath(); g.arc(l.x + 10, l.y + 5, 7, 0, Math.PI * 2); g.fill();
    numeral(g, l.id, l.x + 10, l.y + 5, col, 11);
  }
}
function drawHazards(g, L, t) {
  for (const h of L.hazards) {
    const px = h.cx * T, py = h.cy * T;
    if (h.kind === 'spike') {
      g.fillStyle = C.spike; g.strokeStyle = C.spikeD; g.lineWidth = 1.5;
      g.beginPath();
      for (let k = 0; k < 3; k++) { const sx = px + 2 + k * 9.3; g.moveTo(sx, py + T); g.lineTo(sx + 4.6, py + T - 13); g.lineTo(sx + 9.3, py + T); }
      g.fill(); g.stroke();
    } else {
      g.fillStyle = C.water; g.fillRect(px, py + 10, T, T - 10);
      g.beginPath(); g.moveTo(px, py + T);
      for (let k = 0; k <= T; k += 4) g.lineTo(px + k, py + 10 + Math.sin((px + k) * .14 + t * 3) * 2);
      g.lineTo(px + T, py + T); g.closePath();
      g.fillStyle = hexA(C.waterL, .45); g.fill();
      g.fillStyle = hexA(C.waterL, .7);
      g.fillRect(px + ((t * 20 + h.cx * 11) % T), py + 14, 5, 1.5);
    }
  }
}
function drawHearts(g, L, t) {
  for (const h of L.hearts) {
    if (h.got) continue;
    const y = h.y + Math.sin(t * 3 + h.x * .05) * 3;
    const gl = g.createRadialGradient(h.x, y, 2, h.x, y, 18);
    gl.addColorStop(0, 'rgba(255,207,90,.4)'); gl.addColorStop(1, 'rgba(255,207,90,0)');
    g.fillStyle = gl; g.fillRect(h.x - 18, y - 18, 36, 36);
    heartPath(g, h.x, y, 9); g.fillStyle = C.gold; g.fill();
    g.strokeStyle = '#8a5d10'; g.lineWidth = 1.5; g.stroke();
  }
}
function drawExit(g, W, t) {
  const e = W.L.exit; if (!e) return;
  const cx = e.x + T, floor = e.y + e.h, s = 27, cy = floor - s * .85 - 1;
  const lit = W.inDoor / 2;
  const gl = g.createRadialGradient(cx, cy, 4, cx, cy, 60);
  gl.addColorStop(0, hexA(C.gold, .18 + .4 * lit)); gl.addColorStop(1, hexA(C.gold, 0));
  g.fillStyle = gl; g.fillRect(cx - 60, cy - 60, 120, 120);
  heartPath(g, cx, cy, s); g.fillStyle = '#231a48'; g.fill();
  g.save(); heartPath(g, cx, cy, s); g.clip();
  const ig = g.createLinearGradient(0, cy - s, 0, cy + s);
  ig.addColorStop(0, hexA(C.gold, .1 + .5 * lit)); ig.addColorStop(1, hexA(C.pink, .12 + .4 * lit));
  g.fillStyle = ig; g.fillRect(cx - s * 1.3, cy - s, s * 2.6, s * 2);
  g.restore();
  heartPath(g, cx, cy, s); g.strokeStyle = C.gold; g.lineWidth = 3; g.stroke();
  for (let k = 0; k < 3; k++) {
    const a = t * 1.4 + k * 2.1, r = s * 1.25;
    g.fillStyle = hexA(C.gold, .5 + .5 * Math.sin(t * 4 + k));
    g.fillRect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r * .8 - 1, 2.2, 2.2);
  }
}
function drawBoxes(g, L) {
  for (const b of L.boxes) {
    const x = b.x, y = b.y;
    if (b.heavy) {
      rr(g, x, y + 1, b.w, b.h - 1, 7); g.fillStyle = '#8b85a4'; g.fill();
      rr(g, x, y + b.h - 9, b.w, 8, 4); g.fillStyle = '#625c7c'; g.fill();
      rr(g, x + 3, y + 3, b.w - 6, 5, 3); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
      g.strokeStyle = 'rgba(40,30,60,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 5, y + 12); g.lineTo(x + 9, y + 16); g.lineTo(x + 7, y + 21); g.stroke();
      g.font = `600 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a4466';
      g.fillText('๒', x + b.w / 2 + 3, y + b.h / 2 + 1);
      if (b.push) { g.fillStyle = 'rgba(230,220,250,.6)'; g.fillRect(x + (b.push > 0 ? -6 : b.w + 2), y + b.h - 4, 4, 2); }
    } else {
      g.fillStyle = '#a7713f'; g.fillRect(x, y, b.w, b.h);
      g.strokeStyle = '#6a4222'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
      g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + b.w - 3, y + b.h - 3); g.moveTo(x + b.w - 3, y + 3); g.lineTo(x + 3, y + b.h - 3); g.stroke();
      g.fillStyle = 'rgba(255,225,170,.25)'; g.fillRect(x + 2, y + 2, b.w - 4, 2);
    }
  }
}
function drawBells(g, L, t) {
  for (const b of L.bells) {
    const cx = b.x * T + T / 2, by = (b.y + 1) * T, sw = Math.sin(t * 18) * 0.35 * b.ring;
    g.fillStyle = '#6b4a2a'; g.fillRect(cx - 12, by - 30, 24, 3); g.fillRect(cx - 11, by - 30, 2, 30); g.fillRect(cx + 9, by - 30, 2, 30);
    g.save(); g.translate(cx, by - 27); g.rotate(sw);
    if (b.ring > 0) { g.globalAlpha = b.ring * .5; g.strokeStyle = C.gold; g.lineWidth = 1.5; for (const r of [14, 20]) { g.beginPath(); g.arc(0, 12, r * (1.4 - b.ring * .4), -2.4, -0.7); g.stroke(); } g.globalAlpha = 1; }
    g.beginPath(); g.moveTo(-3, 2); g.quadraticCurveTo(-4, 6, -7, 16); g.lineTo(7, 16); g.quadraticCurveTo(4, 6, 3, 2); g.closePath();
    g.fillStyle = C.gold; g.fill(); g.strokeStyle = '#8a5d10'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#8a5d10'; g.beginPath(); g.arc(0, 17.5, 2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}
function drawSwaps(g, L, t) {
  for (const s of L.swaps) {
    const cx = s.x * T + T / 2, by = (s.y + 1) * T, a = s.armed ? 1 : .45;
    if (s.flash > 0) {
      const gl = g.createRadialGradient(cx, by - 12, 2, cx, by - 12, 40);
      gl.addColorStop(0, `rgba(255,255,255,${s.flash * .7})`); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fillRect(cx - 40, by - 52, 80, 80);
    }
    g.globalAlpha = a;
    rr(g, cx - 12, by - 9, 24, 9, 3); g.fillStyle = '#5b5480'; g.fill();
    rr(g, cx - 9, by - 22, 18, 14, 6); g.fillStyle = '#8a83b3'; g.fill();
    const rot = t * (s.armed ? 2.2 : .6);
    g.lineWidth = 2.4; g.lineCap = 'round';
    for (const [col, off] of [[C.pink, 0], [C.mint, Math.PI]]) {
      g.strokeStyle = col; g.beginPath(); g.arc(cx, by - 15, 11, rot + off, rot + off + 2.2); g.stroke();
      const ex = cx + Math.cos(rot + off + 2.2) * 11, ey = by - 15 + Math.sin(rot + off + 2.2) * 11;
      g.fillStyle = col; g.beginPath(); g.arc(ex, ey, 2.4, 0, Math.PI * 2); g.fill();
    }
    g.lineCap = 'butt'; g.globalAlpha = 1;
  }
}
function drawThread(g, W) {
  const L = W.L;
  if (!L.thread || S.mode === 'dying') return;
  const a = W.pink, b = W.mint;
  const ax = a.x + a.w / 2, ay = a.y + a.h * .62, bx = b.x + b.w / 2, by = b.y + b.h * .62;
  const d = Math.hypot(bx - ax, by - ay), sag = Math.max(0, L.thread - d) * .55;
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
  const taut = d > L.thread - 6;
  g.lineCap = 'round';
  g.strokeStyle = taut ? 'rgba(255,90,110,.35)' : 'rgba(255,60,90,.18)'; g.lineWidth = taut ? 6 : 4;
  g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
  g.strokeStyle = taut ? '#ff5468' : '#e8364c'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
  g.lineCap = 'butt';
  for (const [x, y] of [[ax, ay], [bx, by]]) { g.fillStyle = '#e8364c'; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
}
function drawGhost(g, gh, t) {
  const pink = gh.who === 'pink', col = pink ? C.pink : C.mint, pale = pink ? '#ffc4d6' : '#bdf5e8';
  const cx = gh.x + gh.w / 2, by = gh.y + gh.h, w = 24, h = 29, moving = Math.abs(gh.dx) + Math.abs(gh.dy) > .05;
  const flick = .62 + .1 * Math.sin(t * 6 + (pink ? 0 : 2)), bob = Math.sin(t * 3 + (pink ? 0 : 1)) * 1.2;
  g.save(); g.translate(cx, by + bob);
  g.shadowColor = col; g.shadowBlur = 14;
  g.globalAlpha = flick;
  rr(g, -w / 2, -h, w, h, 10); g.fillStyle = pale; g.fill();
  g.shadowBlur = 0;
  g.globalAlpha = .9; g.setLineDash([3, 3]); g.lineWidth = 1.6; g.strokeStyle = col;
  rr(g, -w / 2, -h, w, h, 10); g.stroke(); g.setLineDash([]);
  const fx = gh.face * 2.5, ey = -h + 12;
  g.fillStyle = 'rgba(21,18,43,.8)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 5 + fx, ey, 2.4, 3.2, 0, 0, Math.PI * 2); g.fill(); }
  if (!moving) {
    g.globalAlpha = .9; g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText('เงา', 0, -h - 5); g.fillStyle = pale; g.fillText('เงา', 0, -h - 5);
  }
  g.restore(); g.globalAlpha = 1;
}
function recProgress(L, k) {
  if (L.rec && L.rec[k]) return Math.min(1, L.rec[k].t / L.echoT);
  if (L.recP && L.recP[k] >= 0) return L.recP[k] / 100;
  return -1;
}
function drawRecording(g, W, t) {
  const L = W.L;
  for (const k of ['pink', 'mint']) {
    const pr = recProgress(L, k);
    if (pr < 0) continue;
    const p = W[k], cx = p.x + p.w / 2, cy = p.y + p.h / 2, col = k === 'pink' ? C.pink : C.mint;
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pr)); g.stroke();
    const left = Math.max(0, Math.ceil(L.echoT * (1 - pr)));
    g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(cx - 7, p.y - 31, 3 + Math.sin(t * 10) * .6, 0, Math.PI * 2); g.fill();
    g.font = `600 12px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)';
    g.strokeText(th(left), cx - 1, p.y - 30); g.fillStyle = C.paper; g.fillText(th(left), cx - 1, p.y - 30);
  }
  g.textBaseline = 'alphabetic';
}
const shade = document.createElement('canvas');
function drawDark(W, t) {
  const L = W.L;
  if (!L.dark) return;
  if (shade.width !== cv.width || shade.height !== cv.height) { shade.width = cv.width; shade.height = cv.height; }
  const s = shade.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, shade.width, shade.height);
  s.setTransform(scale, 0, 0, scale, 0, 0);
  s.fillStyle = 'rgba(6,4,16,.95)'; s.fillRect(0, 0, VW, VH);
  s.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => { const gr = s.createRadialGradient(x, y, r * .25, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); s.fillStyle = gr; s.fillRect(x - r, y - r, r * 2, r * 2); };
  const flick = 1 + Math.sin(t * 7) * .03;
  for (const p of [W.pink, W.mint]) if (!(S.mode === 'dying' && S.deadId === p.id)) hole(p.x + p.w / 2, p.y + p.h / 2, 118 * flick);
  for (const k of ['pink', 'mint']) { const gh = L.ghost[k]; if (gh) hole(gh.x + gh.w / 2, gh.y + gh.h / 2, 46, .7); }
  if (L.exit) hole(L.exit.x + T, L.exit.y + T, 62, .85);
  for (const h of L.hearts) if (!h.got) hole(h.x, h.y, 22, .8);
  for (const o of L.plates) hole(o.x * T + T / 2, (o.y + 1) * T - 6, 26, .55);
  for (const o of L.toggles) hole(o.x * T + T / 2, (o.y + 1) * T - 12, 26, .55);
  for (const o of L.swaps) hole(o.x * T + T / 2, (o.y + 1) * T - 14, 30, .7);
  for (const o of L.bells) hole(o.x * T + T / 2, (o.y + 1) * T - 14, 26, .6);
  s.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(shade, 0, 0);
}
function drawPlayer(g, p, t) {
  if (S.mode === 'dying' && S.deadId === p.id) return;
  const pink = p.id === 'pink', col = pink ? C.pink : C.mint, dark = pink ? C.pinkD : C.mintD;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const sq = p.sq, w = 24 * (1 + .2 * sq), h = 29 * (1 - .2 * sq);
  const bob = p.walk ? Math.abs(Math.sin(p.walk)) * 1.5 : 0;
  g.save(); g.translate(cx, by - bob);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, bob + 1, w * .45, 2.5, 0, 0, Math.PI * 2); g.fill();
  rr(g, -w / 2, -h, w, h, 10); g.fillStyle = col; g.fill();
  g.save(); rr(g, -w / 2, -h, w, h, 10); g.clip(); g.fillStyle = hexA(dark, .45); g.fillRect(-w / 2, -h * .3, w, h * .3); g.restore();
  const fx = p.face * 2.5, ey = -h + 12;
  const blink = ((t + (pink ? 0 : 1.7)) % 3.6) < .12;
  for (const s of [-1, 1]) {
    if (blink) { g.fillStyle = C.ink; g.fillRect(s * 5 + fx - 3, ey, 6, 1.6); continue; }
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * 5 + fx, ey, 3.6, 4.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.arc(s * 5 + fx + p.face * 1.3, ey + .6, 2, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(255,170,200,.75)';
  g.beginPath(); g.ellipse(-8 + fx, ey + 6, 2.6, 1.6, 0, 0, Math.PI * 2); g.ellipse(8 + fx, ey + 6, 2.6, 1.6, 0, 0, Math.PI * 2); g.fill();
  if (pink) {
    g.fillStyle = C.gold;
    const bx = w / 2 - 6, byy = -h + 1;
    g.beginPath(); g.moveTo(bx, byy); g.lineTo(bx - 6, byy - 5); g.lineTo(bx - 6, byy + 4); g.closePath();
    g.moveTo(bx, byy); g.lineTo(bx + 6, byy - 5); g.lineTo(bx + 6, byy + 4); g.closePath(); g.fill();
    g.beginPath(); g.arc(bx, byy, 2.2, 0, Math.PI * 2); g.fill();
  } else {
    g.strokeStyle = '#3f8f4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h + 1); g.quadraticCurveTo(1, -h - 4, -1, -h - 7); g.stroke();
    g.fillStyle = '#7cc46d'; g.beginPath(); g.ellipse(4, -h - 7, 5, 2.6, -.5, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  const name = S.names[p.id];
  g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText(name, cx, p.y - 11);
  g.fillStyle = col; g.fillText(name, cx, p.y - 11);
}
function drawLink(g, W) {
  if (S.mode === 'dying') return;
  const a = W.pink, b = W.mint;
  const dx = (a.x - b.x), dy = (a.y - b.y), d = Math.hypot(dx, dy);
  if (d > 70) return;
  const al = 1 - d / 70, x = (a.x + b.x) / 2 + a.w / 2, y = Math.min(a.y, b.y) - 26 + Math.sin(S.time * 4) * 2;
  g.globalAlpha = al * .9; heartPath(g, x, y, 5); g.fillStyle = C.pink; g.fill(); g.globalAlpha = 1;
}
function drawParts(g) {
  for (const q of S.parts) {
    const a = Math.max(0, q.life / q.max);
    g.globalAlpha = a;
    if (q.type === 'heart') { heartPath(g, q.x, q.y, q.s); g.fillStyle = q.col; g.fill(); }
    else { g.fillStyle = q.col; g.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  }
  g.globalAlpha = 1;
}
function drawBanner(g) {
  if (S.banner <= 0) return;
  const a = Math.min(1, S.banner, (4.2 - S.banner) * 3);
  const lv = ALL[S.li];
  g.globalAlpha = Math.max(0, a);
  g.font = `400 22px ${FONT_D}`;
  const title = `${lvLabel(S.li)} · ${lv.name}`;
  g.font = `400 14px ${FONT}`;
  const lines = wrap(g, lv.hint, 600);
  const w = Math.min(VW - 80, 660), h = 50 + lines.length * 20, x = (VW - w) / 2, y = 44;
  rr(g, x, y, w, h, 14); g.fillStyle = 'rgba(21,17,46,.86)'; g.fill();
  g.strokeStyle = hexA(C.gold, .5); g.lineWidth = 1; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `400 21px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(title, VW / 2, y + 32);
  g.font = `400 14px ${FONT}`; g.fillStyle = C.paper;
  lines.forEach((ln, i) => g.fillText(ln, VW / 2, y + 56 + i * 20));
  g.globalAlpha = 1;
}
function wrap(g, text, max) {
  const words = text.split(' '), out = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
function render() {
  const g = ctx, W = S.W;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(bg, 0, 0);
  if (!W) return;
  let ox = 0, oy = 0;
  if (S.shake > 0) { ox = (Math.random() - .5) * 6 * S.shake; oy = (Math.random() - .5) * 6 * S.shake; }
  g.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
  const t = S.time, L = W.L;
  drawHazards(g, L, t);
  drawGates(g, L, t);
  drawDoors(g, L);
  drawBridges(g, L);
  drawPlates(g, L);
  drawToggles(g, L);
  drawBells(g, L, t);
  drawSwaps(g, L, t);
  drawLifts(g, L);
  drawExit(g, W, t);
  drawHearts(g, L, t);
  drawBoxes(g, L);
  for (const k of ['mint', 'pink']) if (L.ghost[k]) drawGhost(g, L.ghost[k], t);
  drawThread(g, W);
  const order = W.pink.ground && W.pink.ground.ref === W.mint ? [W.mint, W.pink] : [W.pink, W.mint];
  for (const p of order) drawPlayer(g, p, t);
  drawRecording(g, W, t);
  drawLink(g, W);
  drawParts(g);
  drawDark(W, t);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  drawBanner(g);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
  if (S.flash > 0) { g.fillStyle = `rgba(255,80,110,${S.flash * .28})`; g.fillRect(0, 0, VW, VH); }
}

function swapFx() {
  sfx.swap();
  for (const p of [S.W.pink, S.W.mint]) burst(p.x + p.w / 2, p.y + p.h / 2, 14, p.id === 'pink' ? C.pink : C.mint, { speed: 120, life: .5, size: 3, g: 0 });
}
/* ---------- Particles ---------- */
function burst(x, y, n, col, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (opts.speed || 120) * (.4 + Math.random() * .8);
    S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0), life: opts.life || .7, max: opts.life || .7, col, s: opts.size || 3, type: opts.type || 'dot', g: opts.g == null ? 500 : opts.g });
  }
}
function stepParts(dt) {
  for (const q of S.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  S.parts = S.parts.filter(q => q.life > 0);
}

/* ---------- Game flow ---------- */
function setMode(m) {
  S.mode = m;
  app.classList.toggle('menu', m === 'menu');
  app.classList.toggle('playing', m === 'play' || m === 'dying' || m === 'won');
}
function showScreen(name) { for (const k in scr) scr[k].hidden = k !== name; }
function updateHud() {
  const lv = ALL[S.li];
  $('#hNo').textContent = lvLabel(S.li);
  $('#hName').textContent = lv.name;
  $('#hHint').textContent = lv.hint;
  $('#hHearts').textContent = S.W ? `♥ ${th(S.W.heartsGot)}/${th(S.W.heartsTotal)}` : '';
}
function readNames() {
  S.names.pink = (nPink.value.trim() || 'เค้า').slice(0, 10);
  S.names.mint = (nMint.value.trim() || 'ตัวเอง').slice(0, 10);
  store.set('names', S.names);
}
function releaseAll() { for (const id of ['pink', 'mint']) for (const k of ['left', 'right', 'jump']) { KB[id][k] = false; TC[id][k] = false; } JP.pink = JP.mint = false; document.querySelectorAll('.pad button.on').forEach(b => b.classList.remove('on')); touches.clear(); }
function loadLevel(i, fresh) {
  S.li = i; S.W = Phys.load(ALL[i]); S.parts = []; S.deadId = null; S.flash = 0; S.shake = 0;
  if (fresh) { S.deaths = 0; S.elapsed = 0; S.banner = 4.2; }
  buildBg(); updateHud();
}
function startLevel(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadLevel(i, true); showScreen(null); setMode('play');
}
function restart() {
  if (!S.W) return;
  if (O.role) { onlineRestart(); return; }
  S.deaths++; loadLevel(S.li, false); showScreen(null); setMode('play');
}
const tipsShown = {};
function renderTips() {
  const lv = ALL[S.li], tips = lv.tips || [], n = tipsShown[lv.name] || 0;
  $('#pTips').innerHTML = tips.slice(0, n).map((t, i) => `<li><b>คำใบ้ ${th(i + 1)}</b> ${t}</li>`).join('');
  $('#pTips').hidden = n === 0;
  const b = $('#bTip');
  b.hidden = tips.length === 0 || n >= tips.length;
  b.textContent = n === 0 ? 'ขอคำใบ้' : `ขอคำใบ้เพิ่ม (เหลือ ${th(tips.length - n)})`;
}
function pause() {
  if (S.mode !== 'play') return;
  setMode('paused'); releaseAll();
  const lv = ALL[S.li];
  $('#pNo').textContent = lvLabel(S.li) + ' · ' + lv.name;
  $('#pHint').textContent = lv.hint;
  $('#bLevels').hidden = !!O.role; $('#bLeave').hidden = !O.role; $('#pNet').hidden = !O.role;
  renderTips(); showScreen('pause');
}
function resume() { if (S.mode !== 'paused') return; showScreen(null); setMode('play'); }
function toTitle() { if (O.role) leaveOnline(); releaseAll(); renderLevels(); showScreen('title'); setMode('menu'); }
function die(id) {
  setMode('dying'); S.deadId = id; S.deathT = 1; S.flash = 1; S.shake = 1; sfx.die();
  if (O.role === 'guest') O.dead++;
  const p = S.W[id];
  burst(p.x + p.w / 2, p.y + p.h / 2, 22, id === 'pink' ? C.pink : C.mint, { speed: 180, up: 120, life: .8, size: 4 });
}
function win() {
  setMode('won'); S.winT = 1.6; sfx.win();
  const e = S.W.L.exit, lv = ALL[S.li];
  burst(e.x + T, e.y + T, 18, C.gold, { type: 'heart', size: 5, speed: 90, up: 140, life: 1.4, g: -40 });
  burst(e.x + T, e.y + T, 12, C.pink, { type: 'heart', size: 4, speed: 70, up: 110, life: 1.2, g: -30 });
  prog.u[lv.ch] = Math.max(prog.u[lv.ch] || 0, lv.n);
  prog.h[lv.name] = Math.max(prog.h[lv.name] || 0, S.W.heartsGot);
  store.set('prog2', prog);
}
function showClear() {
  setMode('clear'); releaseAll();
  const lv = ALL[S.li], nxt = ALL[S.li + 1];
  const endCh = !nxt || nxt.ch !== lv.ch, endAll = !nxt;
  const chList = ALL.filter(l => l.ch === lv.ch);
  const total = chList.reduce((s, l) => s + (l.map.join('').match(/\*/g) || []).length, 0);
  const got = chList.reduce((s, l) => s + (prog.h[l.name] || 0), 0);
  $('#cNo').textContent = endCh ? `จบบทที่ ${th(lv.ch)} · ${CH_NAME[lv.ch]}` : `ผ่าน${lvLabel(S.li)}`;
  $('#cName').textContent = endAll ? 'ถึงบ้านแล้ว' : endCh ? (lv.ch === 1 ? 'บทต่อไปต้องคิดหนักขึ้น' : 'บทต่อไปแปลกกว่าเดิม') : lv.name;
  $('#cMsg').textContent = endAll
    ? `${S.names.pink} กับ ${S.names.mint} ไขปริศนาครบทุกด่านด้วยกัน เก็บหัวใจบทนี้ได้ ${th(got)} จาก ${th(total)} ดวง`
    : endCh ? `${S.names.pink} กับ ${S.names.mint} ผ่านบทที่ ${th(lv.ch)} ครบแล้ว ${CH_NEXT[lv.ch] || ''}`
    : S.deaths === 0 ? 'ผ่านรอบเดียวไม่พลาดเลย เข้าขากันดีมาก' : 'ช่วยกันคิดจนผ่านมาได้';
  $('#cStats').innerHTML = `<span>หัวใจ <b>${th(S.W.heartsGot)}/${th(S.W.heartsTotal)}</b></span><span>เวลา <b>${th(fmt(S.elapsed))}</b></span><span>พลาด <b>${th(S.deaths)}</b> ครั้ง</span>`;
  $('#bNext').textContent = endAll ? 'กลับหน้าแรก' : endCh ? `ไปบทที่ ${th(lv.ch + 1)}` : 'ด่านต่อไป';
  const guest = O.role === 'guest';
  $('#bNext').hidden = guest || (O.role && endAll); $('#bAgain').hidden = guest; $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}กดไปด่านต่อไป`;
  if (O.role === 'host') $('#bAgain').textContent = 'เลือกด่านอื่น'; else $('#bAgain').textContent = 'เล่นด่านนี้อีกครั้ง';
  showScreen('clear');
  $('#bNext').focus({ preventScroll: true });
}
function next() {
  if (O.role === 'host') { if (S.li < ALL.length - 1) onlineStart(S.li + 1); return; }
  if (S.li >= ALL.length - 1) toTitle(); else startLevel(S.li + 1);
}

function renderLevels() {
  for (const ch of CHAPTERS) {
    const idx = ALL.map((l, i) => i).filter(i => ALL[i].ch === ch);
    const total = idx.reduce((s, i) => s + heartsIn(i), 0), got = idx.reduce((s, i) => s + (prog.h[ALL[i].name] || 0), 0);
    $('#tHearts' + ch).textContent = `หัวใจ ${th(got)}/${th(total)}`;
    $('#levels' + ch).innerHTML = idx.map(i => {
      const lv = ALL[i], locked = !isOpen(i), done = prog.h[lv.name] != null;
      const hs = done ? `♥ ${th(prog.h[lv.name])}/${th(heartsIn(i))}` : locked ? 'ยังล็อกอยู่' : 'ยังไม่เคยผ่าน';
      return `<button type="button" class="lv${done ? ' done' : ''}" data-i="${i}"${locked ? ' disabled' : ''}><span class="n">${th(lv.n)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
    }).join('');
  }
  let cont = ALL.findIndex((l, i) => isOpen(i) && prog.h[l.name] == null);
  if (cont < 0) cont = firstOf(3);
  const started = Object.keys(prog.h).length > 0;
  $('#bGo').textContent = !started ? 'ออกเดินทาง' : `เล่นต่อ ${lvLabel(cont)}`;
  $('#bGo').dataset.i = cont;
  $('#bCh2').dataset.i = firstOf(3);
}
/* ---------- Main loop ---------- */
let last = performance.now(), acc = 0;
function tick() {
  const inp = { pink: input('pink'), mint: input('mint') };
  JP.pink = JP.mint = false;
  if (O.role) {
    const rid = O.local === 'pink' ? 'mint' : 'pink';
    O.lastInp = inp[O.local];
    inp[rid] = O.role === 'host' && S.W[rid].netInp ? S.W[rid].netInp : { left: false, right: false, jump: false, jp: false };
    Net.smoothPlayer(S.W, rid, performance.now());
    if (O.role === 'guest') Net.smoothWorld(S.W);
  }
  const ev = Phys.step(S.W, inp);
  S.elapsed += DT;
  const seen = new Set();
  for (const e of ev) {
    if (seen.has(e)) continue; seen.add(e);
    const [k, id] = e.split(':');
    if (k === 'jump') sfx.jump(id);
    else if (k === 'land') { sfx.land(); const p = S.W[id]; burst(p.x + p.w / 2, p.y + p.h, 5, 'rgba(230,220,250,.7)', { speed: 50, up: 30, life: .35, size: 2.5, g: 200 }); }
    else if (k === 'plate') sfx.plate();
    else if (k === 'bell') sfx.bell();
    else if (k === 'ghost') { sfx.ghost(); const gh = S.W.L.ghost[id]; if (gh) burst(gh.x + gh.w / 2, gh.y + gh.h / 2, 12, id === 'pink' ? C.pink : C.mint, { speed: 70, life: .6, size: 2.5, g: -60 }); }
    else if (k === 'swap') swapFx();
    else if (k === 'open' || k === 'close') sfx.door();
    else if (k === 'heart') { sfx.heart(); updateHud(); for (const h of S.W.L.hearts) if (h.got && !h.fx) { h.fx = 1; burst(h.x, h.y, 10, C.gold, { speed: 90, life: .5, size: 2.5, g: 100 }); } }
  }
  if (ev.some(e => e.startsWith('die:'))) { die(S.W.dead); return; }
  if (ev.includes('win')) { win(); if (O.role === 'host') O.st = 'won'; }
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  S.time += dt;
  if (S.mode === 'play') {
    acc += dt;
    while (acc >= DT) { tick(); acc -= DT; if (S.mode !== 'play') { acc = 0; break; } }
  } else acc = 0;
  if (S.mode === 'dying') {
    S.deathT -= dt;
    if (S.deathT <= 0) {
      if (O.role === 'host') onlineRestart();
      else if (O.role === 'guest') { if (S.deathT < -4) { O.rq++; S.deathT = 0; } }
      else { S.deaths++; loadLevel(S.li, false); setMode('play'); }
    }
  }
  if (S.mode === 'won') { S.winT -= dt; if (S.winT <= 0) { showClear(); if (O.role === 'host') O.st = 'clear'; } }
  if (O.role) pumpOnline(now);
  if (S.mode === 'play' || S.mode === 'won' || S.mode === 'dying') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  render();
  requestAnimationFrame(frame);
}

/* ---------- Input ---------- */
const MAP = { KeyA: ['pink', 'left'], KeyD: ['pink', 'right'], KeyW: ['pink', 'jump'], ArrowLeft: ['mint', 'left'], ArrowRight: ['mint', 'right'], ArrowUp: ['mint', 'jump'] };
document.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT') { if (e.key === 'Enter' && S.mode === 'menu') startLevel(+$('#bGo').dataset.i || 0); return; }
  const m0 = MAP[e.code], m = m0 && O.role ? [O.local, m0[1]] : m0;
  if (m) {
    e.preventDefault();
    if (m[1] === 'jump' && !KB[m[0]].jump && !e.repeat) JP[m[0]] = true;
    KB[m[0]][m[1]] = true;
    return;
  }
  if (e.repeat) return;
  if (e.code === 'KeyF') { toggleFull(); return; }
  if (e.code === 'KeyR' && (S.mode === 'play' || S.mode === 'dying')) restart();
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (S.mode === 'play') pause(); else if (S.mode === 'paused') resume(); }
  else if (e.key === 'Enter' && S.mode === 'paused') { e.preventDefault(); resume(); }
});
document.addEventListener('keyup', e => { const m = MAP[e.code]; if (m) KB[O.role ? O.local : m[0]][m[1]] = false; });
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (S.mode === 'play' && !O.role) pause(); else releaseAll(); } });

const touches = new Map();
function syncTouch() {
  for (const id of ['pink', 'mint']) for (const k of ['left', 'right', 'jump']) {
    const on = [...touches.values()].some(b => (O.role ? O.local : b.dataset.p) === id && b.dataset.k === k);
    if (k === 'jump' && on && !TC[id].jump) JP[id] = true;
    TC[id][k] = on;
  }
  document.querySelectorAll('.pad button').forEach(b => b.classList.toggle('on', [...touches.values()].includes(b)));
}
const pad = $('#pad');
pad.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  e.preventDefault();
  try { b.releasePointerCapture(e.pointerId); } catch (er) {}
  touches.set(e.pointerId, b); syncTouch(); audio();
});
window.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest ? el.closest('[data-k]') : null;
  const cur = touches.get(e.pointerId);
  if (b && b !== cur && (O.role || b.dataset.p === cur.dataset.p)) { touches.set(e.pointerId, b); syncTouch(); }
}, { passive: true });
const endTouch = e => { if (touches.delete(e.pointerId)) syncTouch(); };
window.addEventListener('pointerup', endTouch);
window.addEventListener('pointercancel', endTouch);
pad.addEventListener('contextmenu', e => e.preventDefault());

for (const ch of CHAPTERS) $('#levels' + ch).addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && !b.disabled) startLevel(+b.dataset.i); });
$('#bCh2').addEventListener('click', () => startLevel(firstOf(3)));
$('#bTip').addEventListener('click', () => { const n = ALL[S.li].name; tipsShown[n] = (tipsShown[n] || 0) + 1; renderTips(); });
$('#bGo').addEventListener('click', () => startLevel(+$('#bGo').dataset.i || 0));
$('#bRestart').addEventListener('click', () => { if (S.mode === 'play' || S.mode === 'dying') restart(); });
$('#bMenu').addEventListener('click', () => { if (S.mode === 'play') pause(); else if (S.mode === 'paused') resume(); });
$('#bResume').addEventListener('click', resume);
$('#bRestart2').addEventListener('click', restart);
$('#bLevels').addEventListener('click', toTitle);
$('#bLevels2').addEventListener('click', toTitle);
$('#bNext').addEventListener('click', next);
$('#bAgain').addEventListener('click', () => { if (O.role === 'host') openOnlineRoom(); else startLevel(S.li); });
[nPink, nMint].forEach(i => i.addEventListener('input', readNames));
snd.addEventListener('change', () => { S.sound = snd.checked; store.set('sound', S.sound); });


/* ---------- Online (two phones, one character each) ---------- */
const O = { api: null, apiP: null, room: null, lobby: false, code: '', role: null, local: null, partner: null, partnerPeer: null, partnerName: '', partnerAt: 0,
  ep: 0, lv: -1, st: 'lobby', loadedEp: -1, lastRec: { pink: -1, mint: -1 }, dead: 0, rq: 0, seenDead: 0, seenRq: 0, firstSeen: false, lastInp: null, unsub: [], lastD: '', lastH: 0, wonEp: -1, deathEp: -1 };
function roomApi() {
  if (!O.apiP) O.apiP = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('room')).catch(() => null) : Promise.resolve(null);
  return O.apiP;
}
const cleanName = v => String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 10);
function myName() { return cleanName($('#oName').value) || (O.local === 'mint' ? 'ตัวเอง' : 'เค้า'); }
function setOnlineMsg(t) { $('#oMsg').textContent = t; }
const inClaude = () => !!(window.claude && typeof window.claude.use === 'function');
const peerCtor = () => window.Peer || (window.peerjs && (window.peerjs.Peer || window.peerjs.default)) || null;
const PEER_PREFIX = 'thangsongrao-v1-';
const PEER_ERR = {
  'peer-unavailable': 'ไม่เจอห้องรหัสนี้ ลองเช็กรหัสอีกที หรือให้อีกคนเปิดห้องใหม่',
  'no-lib': 'โหลดระบบออนไลน์ไม่ขึ้น ลองเช็กอินเทอร์เน็ตแล้วเปิดหน้านี้ใหม่',
  'browser-incompatible': 'เบราว์เซอร์นี้เล่นออนไลน์ไม่ได้ ลองเปิดด้วย Chrome หรือ Safari'
};
const peerErrText = t => PEER_ERR[t] || 'ต่อระบบจับคู่ไม่ได้ ลองใหม่อีกครั้ง ถ้ายังไม่ได้ลองสลับไปใช้เน็ตมือถือ';
const newCode = () => String(1000 + Math.floor(Math.random() * 9000));

/* A PeerJS data connection dressed up as the small part of a room this game uses: presence(), onPeers(), leave(). */
function peerRoom(code, role) {
  const Peer = peerCtor();
  return new Promise((resolve, reject) => {
    if (!Peer) { reject('no-lib'); return; }
    let peer = null, conn = null, fn = null, done = false, closed = false, lastSent = 0, retry = null;
    try { peer = role === 'host' ? new Peer(PEER_PREFIX + code) : new Peer(); } catch (e) { reject('browser-incompatible'); return; }
    const deliver = data => { if (fn) fn({ peers: data ? [{ peer: 'remote', presence: data, updatedAt: performance.now(), sameTab: false }] : [] }); };
    const wire = c => {
      c.on('data', d => { if (conn === c && d && typeof d === 'object') deliver(d); });
      c.on('close', () => { if (conn === c) { conn = null; deliver(null); } });
      c.on('error', () => {});
    };
    const room = {
      presence(o) {
        const now = performance.now();
        if (conn && conn.open && now - lastSent > 33) { lastSent = now; try { conn.send(o); } catch (e) {} }
        return Promise.resolve();
      },
      onPeers(f) { fn = f; return () => { if (fn === f) fn = null; }; },
      leave() { closed = true; clearInterval(retry); try { if (conn) conn.close(); } catch (e) {} try { peer.destroy(); } catch (e) {} return Promise.resolve(); }
    };
    const fail = t => { if (done) return; done = true; clearTimeout(timer); clearInterval(retry); try { peer.destroy(); } catch (e) {} reject(t); };
    const timer = setTimeout(() => fail('timeout'), 15000);
    peer.on('error', err => { if (!done) fail((err && err.type) || 'error'); });
    peer.on('disconnected', () => { if (!closed) { try { peer.reconnect(); } catch (e) {} } });
    const dial = () => { const c = peer.connect(PEER_PREFIX + code, { serialization: 'json', reliable: false }); conn = c; wire(c); return c; };
    peer.on('open', () => {
      if (role === 'host') {
        peer.on('connection', c => {
          if (conn && conn.open) { c.on('open', () => { try { c.close(); } catch (e) {} }); return; }
          conn = c; wire(c);
        });
        done = true; clearTimeout(timer); resolve(room);
      } else {
        const c = dial();
        c.on('open', () => {
          if (done) return;
          done = true; clearTimeout(timer); resolve(room);
          retry = setInterval(() => { if (!closed && (!conn || !conn.open) && !peer.disconnected) dial(); }, 4000);
        });
      }
    });
  });
}

function openOnline() {
  releaseAll(); showScreen('online'); setMode('menu');
  $('#oPick').hidden = false; $('#oRoom').hidden = true;
  $('#oName').value = S.names.pink || '';
  O.mode = inClaude() ? 'claude' : 'peer';
  if (O.mode === 'peer') {
    const ok = !!peerCtor();
    setOnlineMsg(ok ? 'ทั้งสองคนเปิดหน้านี้ในมือถือตัวเอง คนหนึ่งเปิดห้องแล้วบอกรหัส อีกคนใส่รหัสเข้ามา ทุกคนคุมตัวละครของตัวเองตัวเดียว' : PEER_ERR['no-lib']);
    $('#oCreate').disabled = $('#oJoin').disabled = !ok;
    return;
  }
  setOnlineMsg('กำลังเช็กว่าเครื่องนี้ต่อห้องออนไลน์ได้ไหม…');
  roomApi().then(api => {
    O.api = api;
    setOnlineMsg(api
      ? 'ทั้งสองคนเปิดหน้านี้ในเครื่องตัวเอง คนหนึ่งเปิดห้องแล้วบอกรหัส อีกคนใส่รหัสเข้ามา ทุกคนคุมตัวละครของตัวเองตัวเดียว'
      : 'เครื่องนี้ต่อห้องออนไลน์ไม่ได้ ต้องเปิดหน้านี้ในแอปหรือเว็บ Claude และล็อกอินอยู่ อีกคนต้องได้รับแชร์หน้านี้จากเมนูแชร์ด้วย');
    $('#oCreate').disabled = $('#oJoin').disabled = !api;
  });
}
async function enterRoom(code, role, tries = 0) {
  if (O.busy) return;
  let room = null, lobby = false;
  if (O.mode === 'peer') {
    O.busy = true; $('#oCreate').disabled = $('#oJoin').disabled = true;
    setOnlineMsg(role === 'host' ? 'กำลังเปิดห้อง…' : 'กำลังเข้าห้อง…');
    try { room = await peerRoom(code, role); }
    catch (e) {
      O.busy = false; $('#oCreate').disabled = $('#oJoin').disabled = false;
      if (role === 'host' && e === 'unavailable-id' && tries < 3) return enterRoom(newCode(), 'host', tries + 1);
      setOnlineMsg(peerErrText(e)); return;
    }
    O.busy = false; $('#oCreate').disabled = $('#oJoin').disabled = false;
  } else {
    const api = O.api || await roomApi();
    if (!api) return;
    try { room = await api.join('tsr-' + code); } catch (e) { room = api; lobby = true; }
  }
  O.code = code; O.role = role; O.local = role === 'host' ? 'pink' : 'mint';
  O.ep = 0; O.lv = -1; O.st = 'lobby'; O.loadedEp = -1; O.dead = 0; O.rq = 0; O.firstSeen = false; O.partner = null; O.partnerName = ''; O.wonEp = -1;
  S.names[O.local] = myName();
  O.room = room; O.lobby = lobby;
  try { O.unsub.push(room.onPeers(onPeers, () => { O.partner = null; })); } catch (e) {}
  app.classList.add('solo');
  app.style.setProperty('--local', O.local === 'pink' ? 'var(--pink)' : 'var(--mint)');
  openOnlineRoom();
}
function openOnlineRoom() {
  releaseAll(); showScreen('online'); setMode('menu');
  if (O.role === 'host') { O.st = 'lobby'; }
  $('#oPick').hidden = true; $('#oRoom').hidden = false;
  $('#oCodeShow').textContent = O.code;
  $('#oTitle').textContent = O.role === 'host' ? 'ห้องของคุณ' : 'เข้าห้องแล้ว';
  setOnlineMsg(O.role === 'host' ? 'บอกรหัสนี้ให้แฟน ให้เขาเปิดหน้านี้ในเครื่องตัวเองแล้วกด "เข้าห้องของแฟน"' : 'รออีกฝั่งเลือกด่าน ฉากจะเปิดขึ้นเองในเครื่องคุณ');
  renderOnlineRoom();
}
function renderOnlineRoom() {
  if (scr.online.hidden || $('#oRoom').hidden) return;
  const here = !!O.partner;
  $('#oStatus').textContent = here ? `${O.partnerName || 'อีกคน'} อยู่ในห้องแล้ว` + (O.role === 'host' ? ' · เลือกด่านได้เลย' : '') : (O.role === 'host' ? 'รออีกคนเข้าห้อง…' : 'กำลังหาห้องนี้… ถ้านานเกินไป ลองเช็กรหัสอีกครั้ง');
  const show = O.role === 'host' && here;
  $('#oLevelsWrap').hidden = !show;
  if (show) for (const ch of CHAPTERS) {
    $('#oLevels' + ch).innerHTML = ALL.map((l, i) => i).filter(i => ALL[i].ch === ch).map(i => {
      const lv = ALL[i], locked = !isOpen(i);
      return `<button type="button" class="lv${prog.h[lv.name] != null ? ' done' : ''}" data-i="${i}"${locked ? ' disabled' : ''}><span class="n">${th(lv.n)}</span><span class="nm">${lv.name}</span><span class="hs">${locked ? 'ยังล็อกอยู่' : prog.h[lv.name] != null ? 'ผ่านแล้ว' : 'ยังไม่เคยผ่าน'}</span></button>`;
    }).join('');
  }
}
function onlineStart(i) {
  if (O.role !== 'host') return;
  O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
function onlineRestart() {
  if (O.role === 'host') { O.ep++; O.st = 'play'; S.deaths++; loadOnlineLevel(false); }
  else if (O.role === 'guest') { O.rq++; }
}
function loadOnlineLevel(fresh) {
  audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const changed = S.li !== O.lv || fresh;
  S.li = O.lv; S.W = Phys.load(ALL[O.lv]);
  S.W.net = { role: O.role, local: O.local };
  O.loadedEp = O.ep; O.lastD = ''; O.lastH = 0;
  S.parts = []; S.deadId = null; S.flash = 0; S.shake = 0;
  if (changed) { S.deaths = 0; S.elapsed = 0; S.banner = 4.2; }
  buildBg(); updateHud(); releaseAll(); showScreen(null); setMode('play');
}
function leaveOnline() {
  const room = O.room;
  O.unsub.forEach(u => { try { u(); } catch (e) {} }); O.unsub = [];
  if (room) {
    try { if (O.lobby) room.presence({ tsr: null }); else room.leave(); } catch (e) {}
  }
  O.room = null; O.role = null; O.local = null; O.partner = null; O.code = '';
  if (S.W) S.W.net = null;
  app.classList.remove('solo');
  $('#hNet').hidden = true;
}
function onPeers(change) {
  const list = change && change.peers ? change.peers : [];
  let best = null;
  for (const p of list) {
    if (p.sameTab) continue;
    const pr = O.lobby ? (p.presence && p.presence.tsr) : p.presence;
    if (!pr || typeof pr !== 'object' || pr.app !== 'tsr' || pr.code !== O.code) continue;
    if (pr.r === (O.role === 'host' ? 'h' : 'g')) continue;
    if (!best || p.updatedAt > best.updatedAt) best = { peer: p.peer, updatedAt: p.updatedAt, pr };
  }
  const was = !!O.partner;
  if (!best) { O.partner = null; if (was) renderOnlineRoom(); return; }
  O.partner = best.pr; O.partnerPeer = best.peer; O.partnerAt = performance.now();
  O.partnerName = cleanName(best.pr.n) || (O.role === 'host' ? 'ตัวเอง' : 'เค้า');
  S.names[O.local === 'pink' ? 'mint' : 'pink'] = O.partnerName;
  if (!was) renderOnlineRoom();
  if (O.role === 'host') hostHears(best.pr); else guestHears(best.pr);
}
function hostHears(pr) {
  if (!O.firstSeen) { O.firstSeen = true; O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0; }
  if ((pr.dead | 0) > O.seenDead || (pr.rq | 0) > O.seenRq) {
    O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0;
    if (O.st === 'play' && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'paused')) onlineRestart();
  }
  if (S.W && pr.ep === O.ep && pr.p && S.W.net) Net.applyPlayer(S.W, 'mint', pr.p, performance.now());
}
function guestHears(pr) {
  const lv = pr.lv | 0, ep = pr.ep | 0;
  if (pr.st === 'lobby') { if (S.mode !== 'menu' || scr.online.hidden) openOnlineRoom(); else renderOnlineRoom(); return; }
  if (lv >= 0 && lv < ALL.length && (ep !== O.loadedEp)) { O.ep = ep; O.lv = lv; loadOnlineLevel(lv !== S.li); }
  if (!S.W || !S.W.net || ep !== O.loadedEp) return;
  if (pr.p) Net.applyPlayer(S.W, 'pink', pr.p, performance.now());
  if (pr.w) {
    Net.applyWorld(S.W, pr.w);
    if (typeof pr.w.d === 'string' && O.lastD && pr.w.d !== O.lastD) sfx.door();
    O.lastD = pr.w.d || '';
    if (S.W.swapFx) { S.W.swapFx = false; swapFx(); }
    for (const k of ['pink', 'mint']) {
      const gh = S.W.L.ghost[k];
      if (gh && gh.fresh) { gh.fresh = false; sfx.ghost(); }
      const rp = S.W.L.recP ? S.W.L.recP[k] : -1;
      if (rp >= 0 && !(O.lastRec[k] >= 0)) sfx.bell();
      O.lastRec[k] = rp;
    }
    if (S.W.heartsGot > O.lastH) { sfx.heart(); for (const h of S.W.L.hearts) if (h.got && !h.fx) { h.fx = 1; burst(h.x, h.y, 10, C.gold, { speed: 90, life: .5, size: 2.5, g: 100 }); } }
    if (S.W.heartsGot !== O.lastH) { O.lastH = S.W.heartsGot; updateHud(); }
  }
  if ((pr.st === 'won' || pr.st === 'clear') && O.wonEp !== ep && (S.mode === 'play' || S.mode === 'dying')) { O.wonEp = ep; win(); }
}
function pumpOnline(now) {
  const room = O.room; if (!room) return;
  const o = { app: 'tsr', v: 1, code: O.code, r: O.role === 'host' ? 'h' : 'g', n: S.names[O.local] || '', ep: O.ep, lv: O.lv };
  if (O.role === 'host') o.st = O.st; else { o.dead = O.dead; o.rq = O.rq; }
  if (S.W && S.W.net && O.loadedEp === O.ep && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'won' || S.mode === 'paused' || S.mode === 'clear')) {
    o.p = Net.encodePlayer(S.W, O.local, O.lastInp || { left: false, right: false, jump: false });
    if (O.role === 'host') o.w = Net.encodeWorld(S.W);
  }
  try { const r = O.lobby ? room.presence({ tsr: o }) : room.presence(o); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  const away = !O.partner;
  const badge = $('#hNet');
  badge.hidden = false;
  badge.classList.toggle('wait', away);
  badge.textContent = away ? `รอ${O.partnerName || 'อีกคน'}…` : `ออนไลน์กับ ${O.partnerName}`;
}
function drawNetNote(g) {
  if (O.partner) return;
  const text = O.partnerName ? `${O.partnerName} หลุดออกจากห้อง รอสักครู่…` : 'รออีกคนเข้าห้อง…';
  g.font = `600 14px ${FONT}`;
  const w = g.measureText(text).width + 32, x = (VW - w) / 2, y = VH - 52;
  rr(g, x, y, w, 30, 15); g.fillStyle = 'rgba(21,17,46,.88)'; g.fill();
  g.strokeStyle = hexA(C.gold, .6); g.lineWidth = 1; g.stroke();
  g.fillStyle = C.gold; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, VW / 2, y + 16);
}
$('#bOnline').addEventListener('click', openOnline);
$('#oBack').addEventListener('click', () => { toTitle(); });
$('#oCreate').addEventListener('click', () => enterRoom(newCode(), 'host'));
$('#oJoin').addEventListener('click', () => {
  const v = ($('#oCode').value || '').replace(/[^0-9๐-๙]/g, '').replace(/[๐-๙]/g, d => String(TH.indexOf(d)));
  if (v.length !== 4) { setOnlineMsg('รหัสห้องมี ๔ ตัวเลข ลองดูที่จอของอีกคนอีกที'); return; }
  enterRoom(v, 'guest');
});
for (const ch of CHAPTERS) $('#oLevels' + ch).addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && !b.disabled) onlineStart(+b.dataset.i); });
$('#bLeave').addEventListener('click', toTitle);
$('#bLeave2').addEventListener('click', toTitle);

/* ---------- Fullscreen ---------- */
const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const standalone = () => { if (fsEl()) return false; try { return window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const ICON_IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let toastT = null;
function toast(html, ms = 4000) {
  const el = $('#toast');
  el.innerHTML = html; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms);
}
$('#toast').addEventListener('click', () => { $('#toast').hidden = true; });
function syncFull() {
  const on = !!fsEl();
  $('#bFull').innerHTML = on ? ICON_OUT : ICON_IN;
  $('#bFull').setAttribute('aria-label', on ? 'ออกจากเต็มจอ' : 'เต็มจอ');
  $('#bFull').title = on ? 'ออกจากเต็มจอ (F)' : 'เต็มจอ (F)';
  $('#bFull2').innerHTML = (on ? ICON_OUT : ICON_IN) + `<span>${on ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</span>`;
  app.classList.toggle('standalone', standalone());
}
function fullHelp() {
  if (isIPhone && !inClaude()) toast('iPhone ยังไม่ให้เว็บเปิดเต็มจอเอง<br>กดปุ่ม <b>แชร์</b> ของ Safari แล้วเลือก <b>เพิ่มไปยังหน้าจอโฮม</b><br>เปิดเกมจากไอคอนนั้นจะเต็มจอ', 10000);
  else if (inClaude()) toast('หน้านี้ไม่อนุญาตให้เปิดเต็มจอ ลองหมุนจอเป็นแนวนอนแทน', 5000);
  else toast('เบราว์เซอร์นี้ไม่ให้เปิดเต็มจอ ลองหมุนจอเป็นแนวนอนแทน', 5000);
}
async function toggleFull() {
  try {
    if (fsEl()) {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) await Promise.resolve(ex.call(document));
      return;
    }
    const el = document.documentElement;
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled) || !(el.requestFullscreen || el.webkitRequestFullscreen)) { fullHelp(); return; }
    await Promise.resolve(el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen());
    if (isTouch) { try { const o = screen.orientation; if (o && o.lock) await o.lock('landscape'); } catch (e) {} }
  } catch (e) { if (!fsEl()) fullHelp(); }
}
for (const id of ['#bFull', '#bFull2']) $(id).addEventListener('click', e => { e.currentTarget.blur(); toggleFull(); });
document.addEventListener('fullscreenchange', syncFull);
document.addEventListener('webkitfullscreenchange', syncFull);

/* ---------- Boot ---------- */
function boot(data) {
  data = data || {};
  const names = data.names || store.get('names', null);
  if (names) { nPink.value = names.pink || 'เค้า'; nMint.value = names.mint || 'ตัวเอง'; }
  readNames();
  S.sound = store.get('sound', true) !== false; snd.checked = S.sound;
  let li = typeof data.li === 'number' ? data.li : ALL.findIndex((l, i) => isOpen(i) && prog.h[l.name] == null);
  if (li < 0) li = 0;
  loadLevel(Math.max(0, Math.min(ALL.length - 1, li)), true);
  S.banner = 0;
  renderLevels(); showScreen('title'); setMode('menu');
  syncFull();
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`600 12px ${FONT}`), document.fonts.load(`400 20px ${FONT_D}`)]).catch(() => {});
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  if (inClaude()) setTimeout(roomApi, 300);
}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ names: S.names, li: S.li })); } catch (e) {}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();

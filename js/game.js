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
const ALL = [LEVELS, LEVELS2, LEVELS3, LEVELS4].flatMap((set, c) => set.map((l, i) => Object.assign({ ch: c + 1, n: i + 1 }, l)));
const CHAPTERS = [1, 2, 3, 4];
const CH_NAME = { 1: 'ฝึกมือ', 2: 'ใช้หัว', 3: 'โลกแปลก', 4: 'กลไกโบราณ' };
const CH_NEXT = { 1: 'บทที่ ๒ แต่ละด่านมีทางผ่านทางเดียว ต้องวางแผนลำดับก่อนลงมือ', 2: 'บทที่ ๓ โลกเริ่มแปลก มีด้ายแดงผูกกันไว้ เงาย้อนเวลา และหินสลับร่าง', 3: 'บทที่ ๔ เครื่องจักรโบราณตื่นแล้ว มีพัดลม กระดานหก ประตูมิติ และพื้นผุ' };
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
const curLevel = () => (S.kind === 'kit' ? KLEVELS[KS.li] : S.kind === 'def' ? DLEVELS[DS.li] : S.kind === 'drv' ? RLEVELS[RS.li] : S.kind === 'tak' ? TLEVELS[TS.li] : ALL[S.li]);
const curLabel = () => (S.kind === 'kit' ? kLabel(KS.li) : S.kind === 'def' ? NIGHT(DS.li) : S.kind === 'drv' ? ROUTE(RS.li) : S.kind === 'tak' ? COURT(TS.li) : lvLabel(S.li));
// the modes driven by the kitchen-style controls (joystick + buttons); takraw is side-on but uses them too
const topDown = () => S.kind === 'kit' || S.kind === 'def' || S.kind === 'drv' || S.kind === 'tak';

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
  swap() { tone(300, .18, 'sawtooth', .05, 900); tone(900, .18, 'sawtooth', .04, 300, .12); },
  boing() { tone(180, .28, 'sine', .08, 620); tone(360, .2, 'triangle', .04, 900, .03); },
  portal() { tone(500, .3, 'sine', .05, 1500); tone(1500, .25, 'sine', .03, 500, .08); },
  crumble() { tone(140, .18, 'sawtooth', .04, 70); tone(90, .2, 'square', .03, 50, .05); }
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
  if (S.kind === 'kit') buildKitBg();
  if (S.kind === 'def') buildDefBg();
  if (S.kind === 'drv') buildDrvBg();
  if (S.kind === 'tak') buildTakBg();
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
    if (l.see) continue;
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
/* chapter 4 machines */
function drawFans(g, L, t) {
  for (const f of L.fans) {
    const x0 = f.x * T, w = f.w * T, base = (f.y + 1) * T, top = (f.y + 1 - f.h) * T, cx = x0 + w / 2;
    if (f.on) {
      g.save(); g.beginPath(); g.rect(x0, top - 10, w, base - top + 10); g.clip();
      for (let k = 0; k < 6 * f.w; k++) {
        const lx = x0 + 5 + ((k * 13.7) % (w - 10)), ph = ((t * 1.4 + k * 0.37) % 1);
        const ly = base - 10 - ph * (base - top + 6);
        g.strokeStyle = `rgba(215,242,255,${0.6 * (1 - ph)})`; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + 4 * Math.sin(t * 6 + k), ly - 9, lx, ly - 18); g.stroke();
      }
      const gl = g.createLinearGradient(0, base, 0, top);
      gl.addColorStop(0, 'rgba(170,220,255,.22)'); gl.addColorStop(1, 'rgba(170,220,255,0)');
      g.fillStyle = gl; g.fillRect(x0, top, w, base - top);
      g.restore();
    } else {
      g.strokeStyle = 'rgba(170,220,255,.14)'; g.setLineDash([3, 7]); g.lineWidth = 1.5;
      g.strokeRect(x0 + 3, top, w - 6, base - top - 10); g.setLineDash([]);
    }
    rr(g, x0 + 2, base - 11, w - 4, 11, 3); g.fillStyle = '#4a4560'; g.fill();
    g.fillStyle = '#2b2740'; g.fillRect(x0 + 5, base - 9, w - 10, 6);
    const rot = f.spin * 18;
    g.strokeStyle = f.on ? '#cfe9ff' : '#7c7698'; g.lineWidth = 2;
    for (let k = 0; k < f.w; k++) {
      const bx = x0 + T * k + T / 2;
      for (let b = 0; b < 3; b++) { const a = rot + b * 2.09; g.beginPath(); g.moveTo(bx, base - 6); g.lineTo(bx + Math.cos(a) * 9, base - 6 + Math.sin(a) * 2.2); g.stroke(); }
    }
    f.ids.forEach((id, k) => { const nx = x0 + w - 8 - k * 14; g.fillStyle = C.door; g.beginPath(); g.arc(nx, base - 16, 6.5, 0, Math.PI * 2); g.fill(); numeral(g, id, nx, base - 16, IDC[id], 10); });
  }
}
function drawSeesaws(g, L) {
  for (const s of L.seesaws) {
    const x0 = s.x, x1 = s.x + s.w, ya = s.a.y, yb = s.b.y, mid = (x0 + x1) / 2, my = (ya + yb) / 2;
    g.fillStyle = '#5e3a22'; g.beginPath(); g.moveTo(mid - 12, s.y); g.lineTo(mid + 12, s.y); g.lineTo(mid, my + 4); g.closePath(); g.fill();
    g.save(); g.translate(mid, my); g.rotate(Math.atan2(yb - ya, x1 - x0));
    const len = Math.hypot(x1 - x0, yb - ya);
    rr(g, -len / 2, 0, len, 8, 3); g.fillStyle = '#8b5a35'; g.fill();
    g.fillStyle = '#b07a4a'; g.fillRect(-len / 2 + 2, 0, len - 4, 2);
    g.fillStyle = C.gold; for (const e of [-1, 1]) { g.beginPath(); g.arc(e * (len / 2 - 8), 4, 2.4, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.fillStyle = '#3a2418'; g.beginPath(); g.arc(mid, my + 4, 3, 0, Math.PI * 2); g.fill();
  }
}
const PORTAL_COL = [['#b38cff', '#ff9ad5'], ['#5ec8ff', '#a6e05a'], ['#ffb347', '#ff6f9c']];
function drawPortals(g, L, t) {
  L.portals.forEach((q, i) => {
    const [c1, c2] = PORTAL_COL[i % PORTAL_COL.length];
    for (const s of [q.a, q.b]) {
      const cx = s.x * T + T / 2, cy = s.y * T, rx = 12, ry = 28;
      if (q.on) {
        const gl = g.createRadialGradient(cx, cy, 2, cx, cy, 34);
        gl.addColorStop(0, hexA(c1, .35 + q.flash * .4)); gl.addColorStop(1, hexA(c1, 0));
        g.fillStyle = gl; g.fillRect(cx - 34, cy - 34, 68, 68);
        g.fillStyle = 'rgba(20,10,40,.75)'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 3; k++) { g.strokeStyle = k % 2 ? c2 : c1; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, rx - k * 3.5, ry - k * 7, 0, t * (2 + k) + k, t * (2 + k) + k + 4); g.stroke(); }
      } else {
        g.strokeStyle = 'rgba(160,150,190,.35)'; g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      g.strokeStyle = q.on ? c1 : '#5b5480'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2); g.stroke();
      if (q.id) { g.fillStyle = C.door; g.beginPath(); g.arc(cx, cy - ry - 8, 6.5, 0, Math.PI * 2); g.fill(); numeral(g, q.id, cx, cy - ry - 8, IDC[q.id], 10); }
    }
  });
}
function drawCrumbles(g, L, t) {
  for (const c of L.crumbles) {
    const px = c.x * T, py = c.y * T;
    if (c.gone) { g.strokeStyle = 'rgba(232,210,180,.25)'; g.setLineDash([3, 4]); g.lineWidth = 1; g.strokeRect(px + 1, py + 1, T - 2, T - 2); g.setLineDash([]); continue; }
    const sh = c.t > 0 ? (Math.random() - .5) * 3 : 0;
    g.fillStyle = '#c9a98a'; g.fillRect(px + sh, py, T, T);
    g.fillStyle = '#a8876a'; g.fillRect(px + sh, py + T - 5, T, 5);
    g.fillStyle = '#e3cba8'; g.fillRect(px + sh, py, T, 3);
    g.strokeStyle = 'rgba(70,40,25,.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(px + 6 + sh, py + 4); g.lineTo(px + 13 + sh, py + 14); g.lineTo(px + 9 + sh, py + 24); g.moveTo(px + 22 + sh, py + 5); g.lineTo(px + 18 + sh, py + 16); g.lineTo(px + 26 + sh, py + 26); g.stroke();
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
  const lv = curLevel();
  g.globalAlpha = Math.max(0, a);
  g.font = `400 22px ${FONT_D}`;
  const title = `${curLabel()} · ${lv.name}`;
  g.font = `400 14px ${FONT}`;
  const lines = wrap(g, lv.hint, 600);
  const w = Math.min(VW - 80, 660), h = 50 + lines.length * 20, x = (VW - w) / 2, y = topDown() ? 236 : 44;
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
  drawFans(g, L, t);
  drawPortals(g, L, t);
  drawCrumbles(g, L, t);
  drawSeesaws(g, L);
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
  S.kind = 'adv'; app.classList.remove('kit', 'def', 'drv', 'tak');
  S.li = i; S.W = Phys.load(ALL[i]); S.parts = []; S.deadId = null; S.flash = 0; S.shake = 0; JP.pink = JP.mint = false;
  if (fresh) { S.deaths = 0; S.elapsed = 0; S.banner = 4.2; }
  buildBg(); updateHud();
}
function startLevel(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadLevel(i, true); showScreen(null); setMode('play');
}
function restart() {
  if (S.kind === 'kit') { kitRestart(); return; }
  if (S.kind === 'def') { defRestart(); return; }
  if (S.kind === 'drv') { drvRestart(); return; }
  if (S.kind === 'tak') { takRestart(); return; }
  if (!S.W) return;
  if (O.role) { onlineRestart(); return; }
  S.deaths++; loadLevel(S.li, false); showScreen(null); setMode('play');
}
const tipsShown = {};
function renderTips() {
  const lv = curLevel(), tips = lv.tips || [], n = tipsShown[lv.name] || 0;
  $('#pTips').innerHTML = tips.slice(0, n).map((t, i) => `<li><b>คำใบ้ ${th(i + 1)}</b> ${t}</li>`).join('');
  $('#pTips').hidden = n === 0;
  const b = $('#bTip');
  b.hidden = tips.length === 0 || n >= tips.length;
  b.textContent = n === 0 ? 'ขอคำใบ้' : `ขอคำใบ้เพิ่ม (เหลือ ${th(tips.length - n)})`;
}
function pause() {
  if (S.mode !== 'play') return;
  setMode('paused'); releaseAll(); releaseK(); engine(false, 0);
  O.lastInp = null; KS.lastInp = {}; DS.lastInp = {}; RS.lastInp = {}; TS.lastInp = {};
  const lv = curLevel();
  $('#pNo').textContent = curLabel() + ' · ' + lv.name;
  $('#pHint').textContent = lv.hint;
  $('#bLevels').hidden = !!O.role; $('#bLeave').hidden = !O.role; $('#pNet').hidden = !O.role;
  $('#bSwap').hidden = !(S.kind === 'drv' && O.role !== 'guest');
  if (S.kind === 'drv') renderSwapNote();
  renderTips(); showScreen('pause');
}
function resume() { if (S.mode !== 'paused') return; showScreen(null); setMode('play'); }
function toTitle() { if (O.role) leaveOnline(); releaseAll(); releaseK(); showScreen('title'); setMode('menu'); setTab(S.tab); }
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
  $('#cStars').hidden = true;
  const lv = ALL[S.li], nxt = ALL[S.li + 1];
  const endCh = !nxt || nxt.ch !== lv.ch, endAll = !nxt;
  const chList = ALL.filter(l => l.ch === lv.ch);
  const total = chList.reduce((s, l) => s + (l.map.join('').match(/\*/g) || []).length, 0);
  const got = chList.reduce((s, l) => s + (prog.h[l.name] || 0), 0);
  $('#cNo').textContent = endCh ? `จบบทที่ ${th(lv.ch)} · ${CH_NAME[lv.ch]}` : `ผ่าน${lvLabel(S.li)}`;
  $('#cName').textContent = endAll ? 'ถึงบ้านแล้ว' : endCh ? (lv.ch === 1 ? 'บทต่อไปต้องคิดหนักขึ้น' : lv.ch === 2 ? 'บทต่อไปแปลกกว่าเดิม' : 'บทต่อไปมีเครื่องจักรโบราณ') : lv.name;
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
  if (S.kind === 'kit') { kitNext(); return; }
  if (S.kind === 'def') { defNext(); return; }
  if (S.kind === 'drv') { drvNext(); return; }
  if (S.kind === 'tak') { takNext(); return; }
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
  if (cont < 0) cont = firstOf(4);
  const started = Object.keys(prog.h).length > 0;
  $('#bGo').textContent = !started ? 'ออกเดินทาง' : `เล่นต่อ ${lvLabel(cont)}`;
  $('#bGo').dataset.i = cont;
  $('#bCh2').dataset.i = firstOf(4);
  renderKitLevels();
  renderDefLevels();
  renderDrvLevels();
  renderTakLevels();
}
function goFromTitle() { if (S.tab === 'kit') startKitchen(+$('#bGo').dataset.k || 0); else if (S.tab === 'def') startDefense(+$('#bGo').dataset.d || 0); else if (S.tab === 'drv') startDrive(+$('#bGo').dataset.r || 0); else if (S.tab === 'tak') startTak(+$('#bGo').dataset.t || 0); else startLevel(+$('#bGo').dataset.i || 0); }
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
    else if (k === 'boing') sfx.boing();
    else if (k === 'portal') sfx.portal();
    else if (k === 'crumble') sfx.crumble();
    else if (k === 'open' || k === 'close') sfx.door();
    else if (k === 'heart') { sfx.heart(); updateHud(); for (const h of S.W.L.hearts) if (h.got && !h.fx) { h.fx = 1; burst(h.x, h.y, 10, C.gold, { speed: 90, life: .5, size: 2.5, g: 100 }); } }
  }
  if (ev.some(e => e.startsWith('die:'))) { die(S.W.dead); return; }
  if (ev.includes('win')) { win(); if (O.role === 'host') O.st = 'won'; }
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  S.time += dt;
  if (S.kind === 'kit') { kitFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'def') { defFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'drv') { drvFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'tak') { if (eng) engine(false, 0); takFrame(dt, now); requestAnimationFrame(frame); return; }
  if (eng) engine(false, 0);
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
  if (tag === 'INPUT') { if (e.key === 'Enter' && S.mode === 'menu' && scr.online.hidden) goFromTitle(); return; }
  if (topDown() && S.mode === 'play' && kitKey(e, true)) return;
  const m0 = MAP[e.code], m = m0 && O.role ? [O.local, m0[1]] : m0;
  if (m) {
    e.preventDefault();
    if (m[1] === 'jump' && !KB[m[0]].jump && !e.repeat) JP[m[0]] = true;
    KB[m[0]][m[1]] = true;
    return;
  }
  if (e.repeat) return;
  if (e.code === 'KeyF') { toggleFull(); return; }
  if (e.code === 'KeyR' && !topDown() && (S.mode === 'play' || S.mode === 'dying')) restart();
  else if (e.code === 'Escape' || e.code === 'KeyP') { if (S.mode === 'play') pause(); else if (S.mode === 'paused') resume(); }
  else if (e.key === 'Enter' && S.mode === 'paused') { e.preventDefault(); resume(); }
});
document.addEventListener('keyup', e => { if (topDown()) kitKey(e, false); const m = MAP[e.code]; if (m) KB[O.role ? O.local : m[0]][m[1]] = false; });
window.addEventListener('blur', () => { releaseAll(); releaseK(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { engine(false, 0); if (S.mode === 'play' && !O.role) pause(); else releaseAll(); } });

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
$('#bCh2').addEventListener('click', () => startLevel(firstOf(4)));
$('#bTip').addEventListener('click', () => { const n = curLevel().name; tipsShown[n] = (tipsShown[n] || 0) + 1; renderTips(); });
$('#bGo').addEventListener('click', goFromTitle);
$('#bRestart').addEventListener('click', () => { if (S.mode === 'play' || S.mode === 'dying') restart(); });
$('#bMenu').addEventListener('click', () => { if (S.mode === 'play') pause(); else if (S.mode === 'paused') resume(); });
$('#bResume').addEventListener('click', resume);
$('#bRestart2').addEventListener('click', restart);
$('#bLevels').addEventListener('click', toTitle);
$('#bLevels2').addEventListener('click', toTitle);
$('#bNext').addEventListener('click', next);
$('#bAgain').addEventListener('click', () => { if (O.role === 'host') openOnlineRoom(); else if (S.kind === 'kit') startKitchen(KS.li); else if (S.kind === 'def') startDefense(DS.li); else if (S.kind === 'drv') startDrive(RS.li); else if (S.kind === 'tak') startTak(TS.li); else startLevel(S.li); });
[nPink, nMint].forEach(i => i.addEventListener('input', readNames));
snd.addEventListener('change', () => { S.sound = snd.checked; store.set('sound', S.sound); });


/* ---------- Online (two phones, one character each) ---------- */
const O = { api: null, apiP: null, room: null, lobby: false, code: '', role: null, local: null, partner: null, partnerPeer: null, partnerName: '', partnerAt: 0,
  md: 'a', ep: 0, lv: -1, st: 'lobby', loadedEp: -1, lastRec: { pink: -1, mint: -1 }, dead: 0, rq: 0, seenDead: 0, seenRq: 0, firstSeen: false, lastInp: null, unsub: [], lastD: '', lastH: 0, wonEp: -1, deathEp: -1 };
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
  O.sid = Math.random().toString(36).slice(2, 10); O.partnerSid = null; O.freshEp = -1;
  S.names[O.local] = myName();
  O.room = room; O.lobby = lobby;
  try { O.unsub.push(room.onPeers(onPeers, () => { O.partner = null; dropRemoteInput(); })); } catch (e) {}
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
  if (show) { renderOnlineKit(); renderOnlineDef(); renderOnlineDrv(); renderOnlineTak(); }
}
function onlineStart(i) {
  if (O.role !== 'host') return;
  O.md = 'a'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
function onlineRestart() {
  if (O.role === 'host') { O.ep++; O.st = 'play'; S.deaths++; loadOnlineLevel(false); }
  else if (O.role === 'guest') { O.rq++; }
}
function loadOnlineLevel(fresh) {
  audio();
  if (fresh && O.role === 'host') O.freshEp = O.ep;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (O.md === 't') {
    const keepBanner = TS.G && TS.li === O.lv && !fresh;
    loadTak(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'r') {
    const keepBanner = RS.G && RS.li === O.lv && !fresh;
    loadDrive(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'd') {
    const keepBanner = DS.G && DS.li === O.lv && !fresh;
    loadDefense(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'k') {
    const keepBanner = KS.G && KS.li === O.lv && !fresh;
    loadKitchen(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  S.kind = 'adv'; app.classList.remove('kit', 'def', 'drv', 'tak');
  const changed = S.li !== O.lv || fresh;
  S.li = O.lv; S.W = Phys.load(ALL[O.lv]);
  S.W.net = { role: O.role, local: O.local };
  O.loadedEp = O.ep; O.lastD = ''; O.lastH = 0;
  S.parts = []; S.deadId = null; S.flash = 0; S.shake = 0;
  if (changed) { S.deaths = 0; S.elapsed = 0; S.banner = 4.2; }
  else if (O.role === 'guest') S.deaths++;
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
  if (KS.G) KS.G.net = null;
  if (DS.G) DS.G.net = null;
  if (RS.G) RS.G.net = null;
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
  if (!best) { O.partner = null; dropRemoteInput(); if (was) renderOnlineRoom(); return; }
  O.partner = best.pr; O.partnerPeer = best.peer; O.partnerAt = performance.now();
  O.partnerName = cleanName(best.pr.n) || (O.role === 'host' ? 'ตัวเอง' : 'เค้า');
  S.names[O.local === 'pink' ? 'mint' : 'pink'] = O.partnerName;
  if (!was) renderOnlineRoom();
  if (O.role === 'host') hostHears(best.pr); else guestHears(best.pr);
}
// the partner left: forget whatever they were holding so the host does not keep pushing, chopping or driving for them
function dropRemoteInput() {
  if (O.role !== 'host') return;
  KS.remote.act = KS.remote.use = false; DS.remote.act = DS.remote.use = false;
  RS.remote.s = RS.remote.p = 0; RS.remote.act = false; TS.remote.fresh = false;
  if (S.W && S.W.mint) S.W.mint.netInp = null;
}
function hostHears(pr) {
  // a guest that rejoined starts its counters from zero again: take a fresh baseline
  if (pr.sid && pr.sid !== O.partnerSid) { O.partnerSid = pr.sid; O.firstSeen = false; KS.seenKa = DS.seenKa = RS.seenKa = TS.seenKa = -1; }
  if (!O.firstSeen) { O.firstSeen = true; O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0; }
  if ((pr.dead | 0) > O.seenDead || (pr.rq | 0) > O.seenRq) {
    O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0;
    if (O.st === 'play' && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'paused')) onlineRestart();
  }
  if (S.kind === 'kit') { if (O.md === 'k') kHostHears(pr); return; }
  if (S.kind === 'def') { if (O.md === 'd') dHostHears(pr); return; }
  if (S.kind === 'drv') { if (O.md === 'r') rHostHears(pr); return; }
  if (S.kind === 'tak') { if (O.md === 't') tHostHears(pr); return; }
  if (S.W && pr.ep === O.ep && pr.p && S.W.net) Net.applyPlayer(S.W, 'mint', pr.p, performance.now());
}
function guestHears(pr) {
  const lv = pr.lv | 0, ep = pr.ep | 0;
  if (pr.st === 'lobby') { if (S.mode !== 'menu' || scr.online.hidden) openOnlineRoom(); else renderOnlineRoom(); return; }
  const md = pr.md === 'k' || pr.md === 'd' || pr.md === 'r' || pr.md === 't' ? pr.md : 'a';
  const nLv = md === 'k' ? KLEVELS.length : md === 'd' ? DLEVELS.length : md === 'r' ? RLEVELS.length : md === 't' ? TLEVELS.length : ALL.length, kind = md === 'k' ? 'kit' : md === 'd' ? 'def' : md === 'r' ? 'drv' : md === 't' ? 'tak' : 'adv', cur = md === 'k' ? KS.li : md === 'd' ? DS.li : md === 'r' ? RS.li : md === 't' ? TS.li : S.li;
  if (lv >= 0 && lv < nLv && (ep !== O.loadedEp)) { const ch = (pr.fs | 0) === ep || O.loadedEp < 0 || md !== O.md || lv !== cur || S.kind !== kind; O.ep = ep; O.lv = lv; O.md = md; loadOnlineLevel(ch); }
  if (md === 'k') { if (S.kind === 'kit' && ep === O.loadedEp) kGuestHears(pr); return; }
  if (md === 'd') { if (S.kind === 'def' && ep === O.loadedEp) dGuestHears(pr); return; }
  if (md === 'r') { if (S.kind === 'drv' && ep === O.loadedEp) rGuestHears(pr); return; }
  if (md === 't') { if (S.kind === 'tak' && ep === O.loadedEp) tGuestHears(pr); return; }
  if (!S.W || !S.W.net || ep !== O.loadedEp) return;
  if (pr.p) Net.applyPlayer(S.W, 'pink', pr.p, performance.now());
  if (pr.w) {
    Net.applyWorld(S.W, pr.w);
    if (typeof pr.w.d === 'string' && O.lastD && pr.w.d !== O.lastD) sfx.door();
    O.lastD = pr.w.d || '';
    if (S.W.swapFx) { S.W.swapFx = false; swapFx(); }
    S.W.launchFx = false;
    for (const s of S.W.L.seesaws) { if (s.seenTilt != null && s.seenTilt !== s.tilt) sfx.boing(); s.seenTilt = s.tilt; }
    for (const c of S.W.L.crumbles) { if (c.seenGone != null && c.seenGone !== c.gone) sfx.crumble(); c.seenGone = c.gone; }
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
  const o = { app: 'tsr', v: 1, code: O.code, r: O.role === 'host' ? 'h' : 'g', n: S.names[O.local] || '', ep: O.ep, lv: O.lv, md: O.md, sid: O.sid };
  if (O.role === 'host') { o.st = O.st; o.fs = O.freshEp; } else { o.dead = O.dead; o.rq = O.rq; }
  const live = O.loadedEp === O.ep && (S.mode === 'play' || S.mode === 'paused' || S.mode === 'clear');
  if (S.kind === 'kit') {
    if (KS.G && KS.G.net && live) {
      o.p = Kit.encodePlayer(KS.G, O.local, KS.lastInp || {}, KS.act);
      if (O.role === 'host') o.kw = Kit.encode(KS.G);
    }
  } else if (S.kind === 'def') {
    if (DS.G && DS.G.net && live) {
      o.p = Def.encodePlayer(DS.G, O.local, DS.lastInp || {}, DS.act);
      if (O.role === 'host') o.dw = Def.encode(DS.G);
    }
  } else if (S.kind === 'tak') {
    if (TS.G && TS.G.net && live) {
      o.p = Tak.encodePlayer(TS.G, O.local, O.role === 'guest' ? TS.kick : null);
      if (O.role === 'host') o.tw = Tak.encode(TS.G);
    }
  } else if (S.kind === 'drv') {
    if (RS.G && RS.G.net && live) {
      o.p = rEncodePlayer();
      if (O.role === 'host') o.rw = Object.assign(Drv.encode(RS.G), { ro: RS.roles.steer === 'mint' ? 'm' : 'p' });
    }
  } else if (S.W && S.W.net && O.loadedEp === O.ep && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'won' || S.mode === 'paused' || S.mode === 'clear')) {
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

/* ---------- Kitchen mode ---------- */
const KX = Kit.K, KY0 = 96;
const KS = { G: null, li: 0, acc: 0, floats: [], act: { n: 0, ref: null, uref: null }, lastInp: {}, seenKa: -1, remote: { act: false, ref: null, use: false, uref: null }, endT: 0, prev: null, chopT: 0 };
const KK = { pink: { u: 0, d: 0, l: 0, r: 0, act: 0, use: 0 }, mint: { u: 0, d: 0, l: 0, r: 0, act: 0, use: 0 } };
const KT = { pink: { x: 0, y: 0, act: 0, use: 0 }, mint: { x: 0, y: 0, act: 0, use: 0 } };
const KKEY = { KeyW: ['pink', 'u'], KeyS: ['pink', 'd'], KeyA: ['pink', 'l'], KeyD: ['pink', 'r'], Space: ['pink', 'act'], KeyQ: ['pink', 'act'], ShiftLeft: ['pink', 'use'], KeyE: ['pink', 'use'],
  ArrowUp: ['mint', 'u'], ArrowDown: ['mint', 'd'], ArrowLeft: ['mint', 'l'], ArrowRight: ['mint', 'r'], Enter: ['mint', 'act'], NumpadEnter: ['mint', 'act'], Slash: ['mint', 'act'], ShiftRight: ['mint', 'use'], Period: ['mint', 'use'] };
const DISH = { kaijeow: 'ข้าวไข่เจียว', kaprao: 'ข้าวกะเพราหมู', somtam: 'ส้มตำ', tomyum: 'ต้มยำกุ้ง' };
const LABEL = { E: 'ไข่', H: 'หมู', K: 'กุ้ง', Y: 'มะละกอ', R: 'ข้าว' };
if (!prog.k) prog.k = {};
const kBest = i => prog.k[KLEVELS[i].name] || null;
const kOpen = i => i === 0 || !!(kBest(i - 1) && kBest(i - 1).s >= 1);
const kLabel = i => 'ร้าน ' + th(i + 1);
Object.assign(sfx, {
  pick() { tone(620, .05, 'triangle', .05, 760); },
  drop() { tone(420, .05, 'triangle', .05, 300); },
  chop() { tone(900 + Math.random() * 200, .03, 'square', .025); },
  pound() { tone(140, .07, 'sine', .08, 90); },
  wash() { tone(1400 + Math.random() * 600, .04, 'sine', .02); },
  serve() { [988, 1319, 1568].forEach((f, i) => tone(f, .12, 'triangle', .06, 0, i * .06)); },
  reject() { tone(180, .2, 'sawtooth', .05, 120); },
  trash() { tone(260, .12, 'triangle', .05, 140); },
  cooked() { tone(1760, .12, 'sine', .05); tone(2349, .18, 'sine', .04, 0, .1); },
  burnt() { tone(300, .3, 'sawtooth', .04, 100); },
  fire() { tone(220, .25, 'square', .05, 440); tone(440, .25, 'square', .04, 220, .25); },
  spray() { tone(3000 + Math.random() * 1500, .04, 'sawtooth', .012); },
  order() { tone(1568, .1, 'sine', .05); tone(2093, .2, 'sine', .04, 0, .09); },
  expire() { [392, 370, 349].forEach((f, i) => tone(f, .18, 'triangle', .05, 0, i * .16)); },
  dirty() { tone(2200, .05, 'triangle', .03); tone(1800, .05, 'triangle', .03, 0, .05); },
  whistle() { tone(1200, .5, 'square', .05, 1600); }
});

function kInput(id) {
  const a = KK[id], t = KT[id];
  const mx = (a.r - a.l) + t.x, my = (a.d - a.u) + t.y;
  const act = a.act > 0 || t.act > 0;
  if (a.act > 0) a.act--;
  if (t.act > 0) t.act--;
  return { mx, my, act, use: !!(a.use || t.use) };
}
function releaseK() {
  for (const id of ['pink', 'mint']) { Object.assign(KK[id], { u: 0, d: 0, l: 0, r: 0, act: 0, use: 0, jp: 0 }); Object.assign(KT[id], { x: 0, y: 0, act: 0, use: 0, jp: 0 }); }
  kjoys.clear(); kbtns.clear();
  document.querySelectorAll('.kpad .on').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.kpad .knob').forEach(k => { k.style.transform = ''; });
}
function kitKey(e, down) {
  const m = KKEY[e.code];
  if (!m || (e.target && e.target.tagName === 'INPUT')) return false;
  e.preventDefault();
  const id = O.role ? O.local : m[0], k = m[1];
  if (down) { if (e.repeat) return true; if (k === 'act') KK[id].act++; else KK[id][k] = 1; if (k === 'u' || k === 'use') KK[id].jp = (KK[id].jp || 0) + 1; }
  else if (k !== 'act') KK[id][k] = 0;
  return true;
}

/* touch: joystick + buttons */
const kjoys = new Map(), kbtns = new Map();
const kpad = $('#kpad');
const padId = el => (el.dataset.p === 'local' ? (O.local || 'pink') : el.dataset.p);
function joyMove(e) {
  const s = kjoys.get(e.pointerId);
  if (!s) return;
  const r = s.el.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.34), dy = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.34);
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  KT[s.id].x = Math.abs(dx) < 0.18 ? 0 : dx;
  KT[s.id].y = Math.abs(dy) < 0.18 ? 0 : dy;
  s.el.querySelector('.knob').style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
}
kpad.addEventListener('pointerdown', e => {
  const j = e.target.closest('.joy'), b = e.target.closest('.kb');
  if (j) { e.preventDefault(); try { j.setPointerCapture(e.pointerId); } catch (er) {} kjoys.set(e.pointerId, { el: j, id: padId(j) }); joyMove(e); audio(); return; }
  if (b) {
    e.preventDefault();
    const id = padId(b);
    if (b.dataset.k === 'act') KT[id].act++; else { KT[id].use = 1; KT[id].jp = (KT[id].jp || 0) + 1; }
    b.classList.add('on'); kbtns.set(e.pointerId, { b, id }); audio();
  }
});
window.addEventListener('pointermove', e => { if (kjoys.has(e.pointerId)) joyMove(e); }, { passive: true });
const kEnd = e => {
  const s = kjoys.get(e.pointerId);
  if (s) { KT[s.id].x = 0; KT[s.id].y = 0; s.el.querySelector('.knob').style.transform = ''; kjoys.delete(e.pointerId); }
  const b = kbtns.get(e.pointerId);
  if (b) { if (b.b.dataset.k === 'use') KT[b.id].use = 0; b.b.classList.remove('on'); kbtns.delete(e.pointerId); }
};
window.addEventListener('pointerup', kEnd);
window.addEventListener('pointercancel', kEnd);
kpad.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- flow ---------- */
function kSnap(G) { return { money: G.money, failed: G.failed, orders: G.orders.length, fires: G.list.filter(t => t.fire > 0).length, ids: G.orders.map(o => o.id).join(), over: G.over }; }
function loadKitchen(i, net) {
  KS.li = i; KS.G = Kit.load(KLEVELS[i]); KS.G.net = net || null;
  KS.acc = 0; KS.floats = []; KS.act = { n: KS.act.n, ref: null, uref: null }; KS.seenKa = -1; KS.remote = { act: false, ref: null, use: false, uref: null }; KS.endT = 0; KS.savedB = null; KS.prev = kSnap(KS.G);
  S.kind = 'kit'; app.classList.add('kit'); app.classList.remove('def', 'drv', 'tak'); setPadLabels('kit');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); buildKitBg(); kHud();
}
function startKitchen(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadKitchen(i); showScreen(null); setMode('play');
}
function kitRestart() { if (O.role) { onlineRestart(); return; } loadKitchen(KS.li); showScreen(null); setMode('play'); }
function kitNext() {
  if (O.role === 'host') { if (KS.li < KLEVELS.length - 1) onlineStartKit(KS.li + 1); return; }
  if (KS.li < KLEVELS.length - 1 && kOpen(KS.li + 1)) startKitchen(KS.li + 1); else toTitle();
}
let hudKey = '';
function kHud(force) {
  const G = KS.G, lv = KLEVELS[KS.li];
  if (!G) return;
  const k = `${KS.li}|${G.money}|${Math.ceil(G.left)}`;
  if (!force && k === hudKey) return;
  hudKey = k;
  $('#hNo').textContent = kLabel(KS.li);
  $('#hName').textContent = lv.name;
  $('#hHint').textContent = lv.hint;
  $('#hHearts').textContent = '';
}
// progress is saved as soon as the round ends, so leaving during the end whistle keeps the result
function kSave() {
  if (KS.savedB) return KS.savedB;
  const G = KS.G, lv = KLEVELS[KS.li], st = Kit.stars(G);
  const b = prog.k[lv.name] || { s: 0, m: 0 };
  prog.k[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, G.money) };
  store.set('prog2', prog);
  return (KS.savedB = b);
}
function kResults() {
  const G = KS.G, lv = KLEVELS[KS.li], st = Kit.stars(G);
  const b = kSave();
  const newBest = G.money > b.m;
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${kLabel(KS.li)} · ปิดร้าน`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = st === 3 ? 'ลูกค้าติดใจ บอกต่อกันทั้งซอย' : st === 2 ? 'ขายดีใช้ได้ อีกนิดเดียวได้สามดาว' : st === 1 ? 'เปิดร้านรอดแล้ว ร้านถัดไปเปิดให้เล่นแล้ว' : `ยังไม่ถึงดาวแรก ต้องได้ ฿${th(lv.stars[0])} ลองแบ่งงานกันใหม่`;
  $('#cMsg').textContent = msg + (newBest && G.money > 0 ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>รายได้ <b>฿${th(G.money)}</b></span><span>เสิร์ฟ <b>${th(G.served)}</b> จาน</span><span>ลูกค้ารอไม่ไหว <b>${th(G.failed)}</b></span>`;
  const last = KS.li >= KLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'ร้านถัดไป';
  $('#bNext').hidden = guest || last || !kOpen(KS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'เปิดร้านอีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกร้านต่อไป`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function nearTile(G, p, t) { if (!t) return false; const r = Kit.tileRect(G, t); return Math.hypot(r.x + KX / 2 - p.x, r.y + KX / 2 - p.y) < KX * 1.75; }
function kTick() {
  const G = KS.G, inp = {};
  if (!O.role) { inp.pink = kInput('pink'); inp.mint = kInput('mint'); }
  else {
    const me = G[O.local], li = kInput(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    if (li.act) { KS.act.n++; const t = Kit.target(G, me); KS.act.ref = t ? Kit.refOf(t) : null; }
    if (li.use) { const t = Kit.target(G, me); KS.act.uref = t ? Kit.refOf(t) : null; }
    KS.lastInp = li;
    Kit.smoothPlayer(G, rid, performance.now());
    if (O.role === 'host') {
      inp[O.local] = li;
      const R = KS.remote;
      inp[rid] = { act: R.act, ref: R.ref, use: R.use, uref: R.uref };
      R.act = false;
    } else {
      Kit.smoothBoat(G);
      inp[O.local] = { mx: li.mx, my: li.my };
    }
  }
  const ev = Kit.step(G, inp);
  kEvents(ev);
  if (O.role === 'guest') kGuestDiff();
  if (G.over && !KS.endT) { KS.endT = 1.4; sfx.whistle(); kSave(); }
}
function kFloat(text, x, y, col) { KS.floats.push({ text, x, y, col, life: 1.4 }); }
function tileCenter(G, t) { const r = Kit.tileRect(G, t); return { x: r.x + KX / 2, y: r.y + KX / 2 }; }
function kEvents(ev) {
  const G = KS.G, seen = new Set();
  for (const e of ev) {
    const [k, id] = e.split(':');
    if (seen.has(k) && k !== 'serve') continue; seen.add(k);
    if (k === 'pick' || k === 'plate') sfx.pick();
    else if (k === 'drop') sfx.drop();
    else if (k === 'chop' || k === 'chopped') { if ((KS.chopT -= 1) <= 0) { sfx.chop(); KS.chopT = 9; } }
    else if (k === 'pound' || k === 'pounded') { if ((KS.chopT -= 1) <= 0) { sfx.pound(); KS.chopT = 14; } }
    else if (k === 'wash' || k === 'washed') { if ((KS.chopT -= 1) <= 0) { sfx.wash(); KS.chopT = 7; } }
    else if (k === 'spray' || k === 'spray0') { if ((KS.chopT -= 1) <= 0) { sfx.spray(); KS.chopT = 3; } }
    else if (k === 'serve') { sfx.serve(); const w = G.list.find(t => t.t === 'W'), c = w ? tileCenter(G, w) : { x: VW / 2, y: 0 }; const s = G.lastServe; kFloat(`+฿${th(Kit.PRICE[s.r] + s.tip)}`, c.x, c.y - 10, C.gold); burst(c.x, c.y + KY0, 12, C.gold, { speed: 90, up: 60, life: .7, size: 3, g: 120 }); }
    else if (k === 'reject') { sfx.reject(); const p = G[id]; kFloat('ไม่มีใครสั่ง', p.x, p.y - 30, '#ff8a8a'); }
    else if (k === 'trash') sfx.trash();
    else if (k === 'cooked') sfx.cooked();
    else if (k === 'burnt') sfx.burnt();
    else if (k === 'fire') { sfx.fire(); S.shake = 0.5; }
    else if (k === 'order') sfx.order();
    else if (k === 'expire') { sfx.expire(); kFloat(`−฿${th(15)}`, 120, -40, '#ff8a8a'); }
    else if (k === 'dirty') sfx.dirty();
  }
}
function kGuestDiff() {
  const G = KS.G, n = kSnap(G), p = KS.prev || n;
  if (n.money > p.money && G.served > (p.served || 0)) { sfx.serve(); const w = G.list.find(t => t.t === 'W'); if (w) { const c = tileCenter(G, w); kFloat(`+฿${th(n.money - p.money)}`, c.x, c.y - 10, C.gold); } }
  if (G.failed > p.failed) { sfx.expire(); kFloat(`−฿${th(15)}`, 120, -40, '#ff8a8a'); }
  if (n.ids !== p.ids && n.orders > p.orders) sfx.order();
  if (n.fires > p.fires) sfx.fire();
  n.served = G.served;
  KS.prev = n;
}
function kitFrame(dt, now) {
  const G = KS.G;
  if (S.mode === 'play' && G) {
    KS.acc += dt;
    while (KS.acc >= Kit.DT) { kTick(); KS.acc -= Kit.DT; if (S.mode !== 'play') { KS.acc = 0; break; } }
    if (KS.endT > 0) { KS.endT -= dt; if (KS.endT <= 0) { KS.endT = -1; kResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else KS.acc = 0;
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  if (G && S.mode === 'play') for (const p of [G.pink, G.mint]) {
    if (p.using && p.held && p.held.k === 'ext' && Math.random() < 0.8) {
      const a = (Math.random() - .5) * .7, c = Math.cos(a), s = Math.sin(a), vx = (p.fx * c - p.fy * s) * 300, vy = (p.fx * s + p.fy * c) * 300;
      S.parts.push({ x: p.x + p.fx * 26, y: p.y + p.fy * 22 - 8 + KY0, vx, vy, life: .32, max: .32, col: 'rgba(235,245,255,.9)', s: 4 + Math.random() * 4, type: 'dot', g: 0 });
    }
  }
  stepParts(dt);
  for (const f of KS.floats) { f.life -= dt; f.y -= dt * 30; }
  KS.floats = KS.floats.filter(f => f.life > 0);
  if (G) kHud();
  renderKitchen();
}

/* ---------- drawing ---------- */
const KCOL = { floorA: '#e9dcc4', floorB: '#ddcbae', wall: '#2c2346', wallTop: '#3a2f5c', wood: '#c48a55', woodTop: '#d9a26a', woodFront: '#8f5a33', crate: '#a86e3e', steel: '#8d93a6', steelD: '#555b6e', water: '#1f5f78', waterL: '#4fb3c8' };
const kbg = document.createElement('canvas');
function kStatic(t) { return !t.boat; }
function drawCounterBase(g, x, y, t) {
  const top = t === 'S' ? '#4a4b5c' : t === 'N' ? '#b9c0cf' : KCOL.woodTop;
  const front = t === 'S' ? '#2e2f3c' : t === 'N' ? '#7b8296' : KCOL.woodFront;
  g.fillStyle = front; g.fillRect(x, y, KX, KX);
  g.fillStyle = top; g.fillRect(x + 1, y + 1, KX - 2, KX - 11);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1, y + 1, KX - 2, 3);
  if (t !== 'S' && t !== 'N') { g.strokeStyle = 'rgba(90,50,20,.18)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + 4, y + k * 17); g.lineTo(x + KX - 4, y + k * 17 + 2); g.stroke(); } }
}
function drawStationArt(g, t, x, y) {
  const cx = x + KX / 2, cy = y + KX / 2 - 5;
  if (Kit.CRATE[t.t]) {
    g.fillStyle = KCOL.crate; g.fillRect(x + 5, y + 5, KX - 10, KX - 20);
    g.strokeStyle = '#6e4423'; g.lineWidth = 2; g.strokeRect(x + 6, y + 6, KX - 12, KX - 22);
    g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + KX - 6, y + KX - 16); g.stroke();
    if (t.t === 'R') { g.fillStyle = '#f2efe6'; g.beginPath(); g.ellipse(cx, cy - 2, 18, 14, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fb7c9'; g.fillRect(cx - 18, cy - 2, 36, 10); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy - 4, 14, 8, 0, 0, Math.PI * 2); g.fill(); }
    else drawFood(g, Kit.CRATE[t.t], cx, cy - 2, 0.95);
    g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineWidth = 3; g.strokeStyle = 'rgba(40,20,10,.8)'; g.strokeText(LABEL[t.t], cx, y + KX - 13); g.fillStyle = '#fff6e0'; g.fillText(LABEL[t.t], cx, y + KX - 13);
  } else if (t.t === 'B') {
    g.fillStyle = '#efd7a8'; rr(g, x + 7, y + 8, KX - 14, KX - 26, 5); g.fill();
    g.strokeStyle = '#c9a56b'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#cfd5e2'; g.fillRect(x + KX - 20, y + 10, 4, 18); g.fillStyle = '#4a3a2a'; g.fillRect(x + KX - 20, y + 28, 4, 8);
  } else if (t.t === 'M') {
    g.fillStyle = '#7a4a2c'; g.beginPath(); g.ellipse(cx, cy, 20, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4e2f1c'; g.beginPath(); g.ellipse(cx, cy - 2, 14, 10, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#9b6a45'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 6, cy - 4); g.lineTo(cx + 20, cy - 18); g.stroke(); g.lineCap = 'butt';
  } else if (t.t === 'S') {
    g.strokeStyle = '#25262f'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 19, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#6b6d80'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.stroke();
  } else if (t.t === 'P') {
    // drawn dynamically (count)
  } else if (t.t === 'W') {
    g.fillStyle = '#f4e7c8'; g.fillRect(x + 4, y + 18, KX - 8, KX - 32);
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#e8b23a' : '#d63d3d'; g.fillRect(x + 2 + k * (KX - 4) / 4, y + 2, (KX - 4) / 4, 14); }
    g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(cx + 14, y + 36, 6, Math.PI, 0); g.fill(); g.fillRect(cx + 7, y + 36, 14, 2);
    g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#7a2a2a'; g.fillText('ส่ง', cx - 8, y + 41);
  } else if (t.t === 'X') {
    g.fillStyle = '#5d6476'; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3d4352'; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8890a3'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.stroke();
  } else if (t.t === 'N') {
    g.fillStyle = '#6f778c'; rr(g, x + 6, y + 7, KX - 12, KX - 24, 8); g.fill();
    g.fillStyle = '#5bb5d6'; rr(g, x + 10, y + 11, KX - 20, KX - 32, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 14, y + 14, 12, 3);
  } else if (t.t === 'D') {
    g.fillStyle = '#3b3346'; rr(g, x + 8, y + 10, KX - 16, KX - 28, 5); g.fill();
    g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#d7cfe8'; g.fillText('คืนจาน', cx, y + KX - 14);
  }
}
function drawTileStatic(g, t, x, y) {
  if (t.t === '#') { g.fillStyle = KCOL.wall; g.fillRect(x, y, KX, KX); g.fillStyle = KCOL.wallTop; g.fillRect(x, y, KX, KX - 10); return; }
  if (t.t === '~') return;
  if ('.12'.includes(t.t)) return;
  drawCounterBase(g, x, y, t.t);
  drawStationArt(g, t, x, y);
}
function buildKitBg() {
  const G = KS.G;
  if (!G) return;
  kbg.width = cv.width; kbg.height = cv.height;
  const g = kbg.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, KY0);
  sky.addColorStop(0, '#120f26'); sky.addColorStop(1, '#2a1d45');
  g.fillStyle = sky; g.fillRect(0, 0, VW, KY0);
  g.strokeStyle = 'rgba(255,230,180,.35)'; g.lineWidth = 1;
  g.beginPath(); for (let x = 0; x <= VW; x += 8) g.lineTo(x, 8 + Math.sin(x / VW * Math.PI * 3) * 5); g.stroke();
  for (let x = 12; x < VW; x += 36) { const y = 9 + Math.sin(x / VW * Math.PI * 3) * 5; g.fillStyle = ['#ffcf5a', '#ff6f9c', '#4fe0bf', '#ff9a5a'][(x / 36 | 0) % 4]; g.beginPath(); g.arc(x, y + 3, 3, 0, Math.PI * 2); g.fill(); }
  g.translate(0, KY0);
  for (let y = 0; y < Kit.GH; y++) for (let x = 0; x < Kit.GW; x++) {
    const t = G.tiles[y][x];
    if (t.t === '~') continue;
    g.fillStyle = (x + y) % 2 ? KCOL.floorA : KCOL.floorB; g.fillRect(x * KX, y * KX, KX, KX);
  }
  for (let y = 0; y < Kit.GH; y++) for (let x = 0; x < Kit.GW; x++) drawTileStatic(g, G.tiles[y][x], x * KX, y * KX);
}

function drawFood(g, k, cx, cy, s = 1) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  switch (k) {
    case 'egg': g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#d8ccb4'; g.lineWidth = 1; g.stroke(); break;
    case 'rice': g.fillStyle = '#fdfdf8'; g.beginPath(); g.ellipse(0, 1, 11, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ece7da'; for (const [a, b] of [[-4, 0], [3, -2], [0, 3]]) g.fillRect(a, b, 2, 1); break;
    case 'pork': g.fillStyle = '#f08a96'; rr(g, -12, -8, 24, 16, 6); g.fill(); g.fillStyle = '#fbd3d8'; rr(g, -8, -4, 10, 5, 2); g.fill(); break;
    case 'porkc': g.fillStyle = '#f08a96'; for (const [a, b] of [[-9, -2], [-1, -6], [5, 1], [-4, 4]]) { rr(g, a, b, 7, 6, 2); g.fill(); } break;
    case 'shrimp': g.strokeStyle = '#ff8a4c'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 8, 0.4, Math.PI * 1.6); g.stroke(); g.fillStyle = '#ff8a4c'; g.beginPath(); g.moveTo(5, -9); g.lineTo(12, -12); g.lineTo(9, -5); g.fill(); break;
    case 'shrimpc': g.strokeStyle = '#ff9d66'; g.lineWidth = 4; g.lineCap = 'round'; for (const [a, b] of [[-6, -2], [5, 2]]) { g.beginPath(); g.arc(a, b, 4, 0.5, Math.PI * 1.5); g.stroke(); } break;
    case 'papaya': g.fillStyle = '#6bb04a'; g.beginPath(); g.ellipse(0, 0, 13, 9, -0.3, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#a7d77f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, 2); g.quadraticCurveTo(0, -5, 9, -3); g.stroke(); break;
    case 'papayac': g.strokeStyle = '#cfe9a0'; g.lineWidth = 2; for (let i = -4; i <= 4; i += 2) { g.beginPath(); g.moveTo(-9, i); g.quadraticCurveTo(0, i - 4, 9, i + 1); g.stroke(); } break;
    case 'somtam': g.strokeStyle = '#bfe08a'; g.lineWidth = 2; for (let i = -4; i <= 4; i += 2) { g.beginPath(); g.moveTo(-9, i); g.quadraticCurveTo(0, i + 3, 9, i - 1); g.stroke(); } g.fillStyle = '#e23b3b'; g.beginPath(); g.arc(-3, -1, 2.5, 0, Math.PI * 2); g.arc(4, 2, 2.2, 0, Math.PI * 2); g.fill(); break;
    case 'omelette': g.fillStyle = '#c98a2a'; g.beginPath(); g.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd64d'; g.beginPath(); g.ellipse(-1, -1, 9.5, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe98a'; g.beginPath(); g.ellipse(-3, -3, 4, 2.5, 0, 0, Math.PI * 2); g.fill(); break;
    case 'kaprao': g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(0, 1, 11, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3f9a4a'; for (const [a, b, r] of [[-5, -2, .5], [4, -3, -.4], [1, 3, .2]]) { g.beginPath(); g.ellipse(a, b, 4, 2, r, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#e23b3b'; g.fillRect(-1, -1, 3, 2); break;
    case 'tomyum': g.fillStyle = '#ff7a2f'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ffd0a8'; g.lineWidth = 2.5; g.beginPath(); g.arc(-2, 0, 4, 0.4, Math.PI * 1.6); g.stroke(); g.fillStyle = '#3f9a4a'; g.fillRect(3, -5, 4, 2); break;
    case 'burnt': g.fillStyle = '#2a2222'; g.beginPath(); g.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a3a3a'; g.fillRect(-4, -3, 5, 3); break;
  }
  g.restore();
}
function drawItem(g, it, cx, cy, s = 1) {
  if (!it) return;
  g.save(); g.translate(cx, cy); g.scale(s, s);
  if (it.k === 'plate') {
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(1, 3, 17, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c7d3e0'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2); g.stroke();
    const c = it.c, pos = c.length === 2 ? [[-5, 0], [5, 0]] : [[0, 0]];
    c.forEach((f, i) => drawFood(g, f, pos[i][0], pos[i][1], c.length === 2 ? 0.65 : 0.8));
  } else if (it.k === 'dirty') {
    for (let i = Math.min(3, it.n) - 1; i >= 0; i--) { g.fillStyle = '#d9d2c3'; g.beginPath(); g.ellipse(0, -i * 3, 16, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a89a7c'; g.beginPath(); g.arc(-4, -i * 3 + 1, 3, 0, Math.PI * 2); g.arc(5, -i * 3 - 2, 2, 0, Math.PI * 2); g.fill(); }
    if (it.n > 1) { g.fillStyle = C.ink; g.beginPath(); g.arc(13, -12, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(th(it.n), 13, -11.5); g.textBaseline = 'alphabetic'; }
  } else if (it.k === 'pan' || it.k === 'pot') {
    const pan = it.k === 'pan';
    if (pan) { g.fillStyle = '#2a2a33'; g.fillRect(12, -3, 15, 6); }
    else { g.fillStyle = '#6a7084'; g.fillRect(-21, -3, 6, 6); g.fillRect(15, -3, 6, 6); }
    g.fillStyle = pan ? '#3a3b48' : '#8d93a6'; g.beginPath(); g.arc(0, 0, pan ? 15 : 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = pan ? '#23242c' : '#5b6174'; g.beginPath(); g.arc(0, 0, pan ? 12 : 13, 0, Math.PI * 2); g.fill();
    if (it.f) {
      const f = it.st === 'cook' ? it.f : it.f;
      if (it.st === 'cook') drawFood(g, f === 'egg' ? 'egg' : f, 0, 0, 0.75);
      else drawFood(g, f, 0, 0, 0.85);
      if (it.st === 'cook' && f === 'egg') { g.fillStyle = 'rgba(255,214,77,' + Math.min(1, it.p) + ')'; g.beginPath(); g.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2); g.fill(); }
    }
  } else if (it.k === 'ext') {
    g.fillStyle = '#d62e2e'; rr(g, -7, -14, 14, 26, 5); g.fill();
    g.fillStyle = '#2a2a33'; g.fillRect(-3, -18, 6, 5); g.strokeStyle = '#2a2a33'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, -16); g.quadraticCurveTo(14, -18, 12, -6); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-5, -4, 10, 4);
  } else drawFood(g, it.k, 0, 0, 1);
  g.restore();
}
function bar(g, x, y, w, v, col) {
  g.fillStyle = 'rgba(21,18,43,.8)'; rr(g, x - 1, y - 1, w + 2, 8, 4); g.fill();
  g.fillStyle = col; rr(g, x, y, Math.max(3, w * Math.min(1, v)), 6, 3); g.fill();
}
function drawFire(g, x, y, t) {
  const cx = x + KX / 2, by = y + KX - 12;
  const gl = g.createRadialGradient(cx, by - 14, 4, cx, by - 14, 40);
  gl.addColorStop(0, 'rgba(255,170,60,.55)'); gl.addColorStop(1, 'rgba(255,90,30,0)');
  g.fillStyle = gl; g.fillRect(cx - 40, by - 54, 80, 80);
  for (let k = 0; k < 3; k++) {
    const ox = (k - 1) * 12, h = 26 + Math.sin(t * 14 + k * 2) * 6 + (k === 1 ? 10 : 0);
    g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(cx + ox - 9, by); g.quadraticCurveTo(cx + ox - 8, by - h * .6, cx + ox + Math.sin(t * 9 + k) * 3, by - h); g.quadraticCurveTo(cx + ox + 8, by - h * .6, cx + ox + 9, by); g.fill();
    g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(cx + ox - 5, by); g.quadraticCurveTo(cx + ox - 4, by - h * .4, cx + ox, by - h * .65); g.quadraticCurveTo(cx + ox + 4, by - h * .4, cx + ox + 5, by); g.fill();
  }
}
function drawTileDynamic(g, G, t, x, y, time) {
  const cx = x + KX / 2, cy = y + KX / 2 - 6, it = t.item;
  if (t.t === 'S' && Kit.isCook(it) && (it.st === 'cook' || it.st === 'done')) {
    g.fillStyle = `rgba(255,120,40,${0.35 + 0.15 * Math.sin(time * 12)})`; g.beginPath(); g.arc(cx, cy + 5, 21, 0, Math.PI * 2); g.fill();
  }
  if (t.t === 'P') {
    const n = t.plates < 0 ? 4 : Math.min(4, t.plates);
    for (let i = 0; i < n; i++) { g.fillStyle = '#c7d3e0'; g.beginPath(); g.ellipse(cx, cy + 4 - i * 3, 17, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy + 3 - i * 3, 16, 11, 0, 0, Math.PI * 2); g.fill(); }
    if (t.plates >= 0) { g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(40,20,10,.8)'; const s = `${th(t.plates)} ใบ`; g.strokeText(s, cx, y + KX - 13); g.fillStyle = '#fff6e0'; g.fillText(s, cx, y + KX - 13); }
  }
  if (t.t === 'N') {
    if (t.dirty) drawItem(g, { k: 'dirty', n: t.dirty }, cx - 6, cy + 2, 0.75);
    for (let i = 0; i < Math.min(3, t.clean); i++) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + KX - 14, y + 14 + i * 4, 9, 6, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#9fb5c9'; g.lineWidth = 1; g.stroke(); }
    if (t.wp > 0) bar(g, x + 8, y - 6, KX - 16, t.wp, '#5bb5d6');
  }
  if (t.t === 'D' && t.ret) drawItem(g, { k: 'dirty', n: t.ret }, cx, cy, 0.85);
  if (it) {
    drawItem(g, it, cx, cy + (t.t === 'S' ? 4 : 0), 1);
    if (it.cp > 0 && it.cp < 1) bar(g, x + 8, y - 6, KX - 16, it.cp, t.t === 'M' ? '#c9a06a' : '#7fd36a');
    if (Kit.isCook(it)) {
      if (it.st === 'cook') bar(g, x + 8, y - 6, KX - 16, it.p, '#ffb347');
      else if (it.st === 'done') {
        const o = it.of != null ? it.of : it.o / G.burnT;
        if (o < 0.35) { g.fillStyle = '#5fd36a'; g.beginPath(); g.arc(cx + 18, y + 6, 8, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + 14, y + 6); g.lineTo(cx + 17, y + 9); g.lineTo(cx + 22, y + 3); g.stroke(); }
        else {
          const on = Math.sin(time * (8 + o * 16)) > 0;
          bar(g, x + 8, y - 6, KX - 16, o, on ? '#ff4d4d' : '#ffb347');
          if (on) { g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(cx + 18, y + 6, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', cx + 18, y + 7); g.textBaseline = 'alphabetic'; }
          g.fillStyle = `rgba(80,80,90,${0.25 + o * 0.4})`; for (let k = 0; k < 3; k++) { const sy = (time * 30 + k * 12) % 36; g.beginPath(); g.arc(cx - 6 + k * 6, cy - sy, 4 + sy * .15, 0, Math.PI * 2); g.fill(); }
        }
      } else if (it.st === 'burnt') { g.fillStyle = 'rgba(60,60,70,.5)'; for (let k = 0; k < 3; k++) { const sy = (time * 25 + k * 12) % 36; g.beginPath(); g.arc(cx - 6 + k * 6, cy - sy, 5 + sy * .15, 0, Math.PI * 2); g.fill(); } }
    }
  }
  if (t.fire > 0) { g.globalAlpha = Math.min(1, 0.4 + t.fire); drawFire(g, x, y, time); g.globalAlpha = 1; }
}
function drawBoat(g, G, time) {
  const B = G.boat;
  if (!B) return;
  const bx = B.x0 * KX, top = Kit.boatTop(B), w = B.w * KX, h = B.h * KX;
  g.fillStyle = KCOL.water; g.fillRect(bx, 0, (Kit.GW - B.x0) * KX, Kit.GH * KX);
  g.strokeStyle = 'rgba(120,210,230,.35)'; g.lineWidth = 2;
  for (let y = 10; y < Kit.GH * KX; y += 26) { g.beginPath(); for (let x = bx; x <= Kit.GW * KX; x += 12) g.lineTo(x, y + Math.sin(x * 0.05 + time * 2 + y) * 3); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, bx - 4, top + 8, w + 8, h + 4, 18); g.fill();
  g.fillStyle = '#7a4a28'; rr(g, bx - 6, top - 6, w + 12, h + 12, 18); g.fill();
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
    const t = B.tiles[y][x], px = bx + x * KX, py = top + y * KX;
    if ('.12'.includes(t.t)) { g.fillStyle = (x + y) % 2 ? '#b98552' : '#c4915c'; g.fillRect(px, py, KX, KX); g.strokeStyle = 'rgba(80,45,20,.35)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px, py + k * 16); g.lineTo(px + KX, py + k * 16); g.stroke(); } }
    else drawTileStatic(g, t, px, py);
  }
  if (B.ph === 'hold') { const gx = bx, gy = top + KX; g.strokeStyle = 'rgba(255,207,90,.6)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.strokeRect(gx + 2, gy + 2, KX - 4, KX - 4); g.setLineDash([]); }
}
function drawChef(g, p, time, name, nameA) {
  const pink = p.id === 'pink', col = pink ? C.pink : C.mint, dark = pink ? C.pinkD : C.mintD;
  const bob = p.walk ? Math.abs(Math.sin(p.walk)) * 2 : 0;
  const x = p.x, y = p.y - bob, it = p.held, hx = x + p.fx * 21, hy = p.fy < 0 ? y - 27 : y + p.fy * 14 - 6;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, p.y + 15, 18, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = dark; g.beginPath(); g.arc(x, y + 3, 19, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, 19, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - p.fx * 3, y - 16 - p.fy * 2, 13, 8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x - 6 - p.fx * 3, y - 21, 6, 0, Math.PI * 2); g.arc(x + 6 - p.fx * 3, y - 21, 6, 0, Math.PI * 2); g.arc(x - p.fx * 3, y - 24, 6.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.fillRect(x - 12 - p.fx * 3, y - 13 - p.fy * 2, 24, 3);
  if (p.fy >= 0) {
    const ex = p.fx * 6, ey = 2 + p.fy * 3;
    for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + ex + s * 6, y + ey, 3.5, 4.2, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(x + ex + s * 6 + p.fx * 1.3, y + ey + .8 + p.fy, 2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,170,200,.75)'; g.beginPath(); g.ellipse(x + ex - 11, y + ey + 6, 2.6, 1.6, 0, 0, Math.PI * 2); g.ellipse(x + ex + 11, y + ey + 6, 2.6, 1.6, 0, 0, Math.PI * 2); g.fill();
  }
  if (p.using) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; const a = time * 20; g.beginPath(); g.arc(hx, hy, 14, a, a + 1.2); g.stroke(); }
  if (it) drawItem(g, it, hx, hy, 0.85);
  if (nameA <= 0) return;
  g.globalAlpha = nameA;
  g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText(name, x, y - 32);
  g.fillStyle = col; g.fillText(name, x, y - 32);
  g.globalAlpha = 1;
}
function drawTarget(g, G, p) {
  const t = Kit.target(G, p);
  if (!t) return;
  const r = Kit.tileRect(G, t);
  g.strokeStyle = p.id === 'pink' ? C.pink : C.mint; g.lineWidth = 3; g.setLineDash([7, 5]);
  rr(g, r.x + 3, r.y + 3, KX - 6, KX - 6, 8); g.stroke(); g.setLineDash([]);
}
function drawOrders(g, G, time) {
  const pad = 8, w = 158, h = KY0 - 22;
  G.orders.forEach((o, i) => {
    const x = pad + i * (w + 8), y = 16, f = Math.max(0, o.left / o.max), shake = f < 0.2 ? Math.sin(time * 30) * 1.5 : 0;
    g.save(); g.translate(shake, 0);
    rr(g, x, y, w, h, 8); g.fillStyle = '#fff8e6'; g.fill();
    g.strokeStyle = f < 0.2 ? '#ff4d4d' : '#e8d3a8'; g.lineWidth = 2; g.stroke();
    g.font = `600 14px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#3a2418'; g.fillText(DISH[o.r], x + 8, y + 19);
    g.font = `600 11px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#9a6a2a'; g.fillText('฿' + th(Kit.PRICE[o.r]), x + w - 8, y + 19);
    Kit.RECIPES[o.r].forEach((fd, k) => { const ix = x + 22 + k * 34; g.fillStyle = '#efe2c4'; g.beginPath(); g.arc(ix, y + 40, 14, 0, Math.PI * 2); g.fill(); drawFood(g, fd, ix, y + 40, 0.75); });
    g.font = `400 10px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#7a6a5a';
    const how = { kaijeow: 'ไข่ › กระทะ', kaprao: 'หมู › หั่น › กระทะ', somtam: 'มะละกอ › หั่น › ตำ', tomyum: 'กุ้ง › หั่น › หม้อ' }[o.r];
    g.fillText(how, x + w - 8, y + 44);
    const col = f > 0.5 ? '#5fd36a' : f > 0.2 ? '#ffb347' : '#ff4d4d';
    g.fillStyle = '#e8d9bb'; rr(g, x + 8, y + h - 12, w - 16, 6, 3); g.fill();
    g.fillStyle = col; rr(g, x + 8, y + h - 12, (w - 16) * f, 6, 3); g.fill();
    g.restore();
  });
  const rx = VW - 12;
  g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.font = `400 13px ${FONT}`; g.fillStyle = C.muted || '#b3a8d9'; g.fillText('เวลา', rx, 34);
  const low = G.left < 20 && Math.sin(time * 8) > 0;
  g.font = `400 26px ${FONT_D}`; g.fillStyle = low ? '#ff6b6b' : C.paper; g.fillText(th(fmt(Math.ceil(G.left))), rx, 62);
  g.font = `400 13px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText('รายได้', rx - 96, 34);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.gold; g.fillText('฿' + th(G.money), rx - 96, 62);
  const lv = KLEVELS[KS.li], st = Kit.stars(G);
  g.font = `400 14px ${FONT}`; g.fillStyle = C.gold; g.fillText([0, 1, 2].map(i => (i < st ? '★' : '☆')).join(''), rx - 96, 82);
  if (st < 3) { g.font = `400 10px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText(`ดาวถัดไป ฿${th(lv.stars[st])}`, rx, 82); }
}
function renderKitchen() {
  const g = ctx, G = KS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(kbg, 0, 0);
  let ox = 0, oy = 0;
  if (S.shake > 0) { ox = (Math.random() - .5) * 6 * S.shake; oy = (Math.random() - .5) * 6 * S.shake; }
  g.setTransform(scale, 0, 0, scale, ox * scale, (KY0 + oy) * scale);
  const time = S.time;
  drawBoat(g, G, time);
  for (const t of G.list) { const r = Kit.tileRect(G, t); drawTileDynamic(g, G, t, r.x, r.y, time); }
  const locals = O.role ? [G[O.local]] : [G.pink, G.mint];
  if (S.mode === 'play') for (const p of locals) drawTarget(g, G, p);
  const order = [G.pink, G.mint].sort((a, b) => a.y - b.y);
  const nameA = S.mode === 'menu' ? 0 : Math.max(0, Math.min(1, 7 - (G.def.time - G.left)));
  for (const p of order) drawChef(g, p, time, S.names[p.id], nameA);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  drawParts(g);
  drawOrders(g, G, time);
  g.setTransform(scale, 0, 0, scale, 0, KY0 * scale);
  for (const f of KS.floats) {
    g.globalAlpha = Math.min(1, f.life * 1.5);
    g.font = `400 20px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.85)';
    g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y);
  }
  g.globalAlpha = 1;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  drawBanner(g);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}

/* ---------- title tabs + level list ---------- */
S.tab = ['adv', 'kit', 'def', 'drv'].includes(store.get('tab', 'adv')) ? store.get('tab', 'adv') : 'adv';
function setTab(t) {
  S.tab = t; store.set('tab', t);
  for (const k of ['adv', 'kit', 'def', 'drv', 'tak']) app.classList.toggle('tab-' + k, t === k);
  document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  renderLevels();
  if (S.mode === 'menu' && !O.role) {
    if (t === 'kit') { loadKitchen(+$('#bGo').dataset.k || 0); S.banner = 0; }
    else if (t === 'def') { loadDefense(+$('#bGo').dataset.d || 0); S.banner = 0; }
    else if (t === 'drv') { loadDrive(+$('#bGo').dataset.r || 0); S.banner = 0; }
    else if (t === 'tak') { loadTak(+$('#bGo').dataset.t || 0); S.banner = 0; }
    else if (S.kind !== 'adv') { S.kind = 'adv'; app.classList.remove('kit', 'def', 'drv', 'tak'); buildBg(); }
  }
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
function kStars(n) { return [0, 1, 2].map(i => (i < n ? '★' : '☆')).join(''); }
function renderKitLevels() {
  let total = 0;
  $('#klevels').innerHTML = KLEVELS.map((lv, i) => {
    const b = kBest(i), open = kOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ฿${th(b.m)}` : open ? 'ยังไม่เคยเปิดร้าน' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-k="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#kStarsAll').textContent = `ดาวรวม ${th(total)}/${th(KLEVELS.length * 3)}`;
  let next = KLEVELS.findIndex((l, i) => kOpen(i) && !(kBest(i) && kBest(i).s >= 3));
  if (next < 0) next = 0;
  if (S.tab === 'kit') { $('#bGo').textContent = kBest(next) ? `เปิด${kLabel(next)}` : 'เปิดร้าน'; $('#bGo').dataset.k = next; }
}
$('#klevels').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) startKitchen(+b.dataset.k); });

/* ---------- online ---------- */
function onlineStartKit(i) {
  if (O.role !== 'host') return;
  O.md = 'k'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsK').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) onlineStartKit(+b.dataset.k); });
function renderOnlineKit() {
  $('#oLevelsK').innerHTML = KLEVELS.map((lv, i) => {
    const b = kBest(i), open = kOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-k="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยเปิดร้าน' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function kHostHears(pr) {
  const G = KS.G;
  if (!G || pr.ep !== O.ep || !pr.p) return;
  Kit.applyPlayer(G, 'mint', pr.p, performance.now());
  const ka = pr.p.ka | 0;
  if (KS.seenKa < 0) KS.seenKa = ka;
  if (ka > KS.seenKa) {
    KS.seenKa = ka;
    const t = Kit.byRef(G, pr.p.kr);
    KS.remote.act = true; KS.remote.ref = t && nearTile(G, G.mint, t) ? pr.p.kr : null;
  }
  KS.remote.use = !!pr.p.ku;
  const u = Kit.byRef(G, pr.p.kur);
  KS.remote.uref = u && nearTile(G, G.mint, u) ? pr.p.kur : null;
}
function kGuestHears(pr) {
  const G = KS.G;
  if (!G) return;
  if (pr.p) Kit.applyPlayer(G, 'pink', pr.p, performance.now());
  if (pr.kw) {
    const wasOver = G.over, had = Kit.enc(G[O.local].held);
    Kit.apply(G, pr.kw);
    const has = Kit.enc(G[O.local].held);
    if (has !== had && S.mode === 'play') { if (!has) sfx.drop(); else if (!had || has[0] !== had[0]) sfx.pick(); }
    if (G.over && !wasOver && !KS.endT && S.mode === 'play') { KS.endT = 1.4; sfx.whistle(); kSave(); }
  }
}

/* ---------- Defense mode ---------- */
const DK = Def.K, DY0 = 96;
const DS = { G: null, li: 0, acc: 0, floats: [], rings: [], act: { n: 0, uref: null }, lastInp: {}, seenKa: -1, remote: { act: false, use: false, uref: null }, endT: 0, prev: null, shootT: 0, tickT: 0, hitT: 0, popT: 0 };
const NIGHT = i => 'คืนที่ ' + th(i + 1);
const GHOST = { imp: 'ผีน้อย', head: 'กระสือ', pob: 'ปอบ', wisp: 'ผีโขมด', king: 'ราชาผี' };
const GCOL = { imp: '#f4f0ff', head: '#ff9ab8', pob: '#9fb06a', wisp: '#7fe8ff', king: '#b07bff' };
if (!prog.d) prog.d = {};
const dBest = i => prog.d[DLEVELS[i].name] || null;
const dOpen = i => i === 0 || !!(dBest(i - 1) && dBest(i - 1).s >= 1);
Object.assign(sfx, {
  pew(id) { tone(id === 'pink' ? 1250 : 950, .04, 'triangle', .016, id === 'pink' ? 1600 : 700); },
  pop() { tone(520, .08, 'sine', .05, 1150); },
  coin() { tone(1568, .05, 'square', .022); tone(2093, .08, 'square', .018, 0, .05); },
  burst() { tone(220, .25, 'sawtooth', .06, 60); tone(880, .2, 'triangle', .05, 1760); },
  heal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .18, 'sine', .045, 0, i * .05)); },
  down() { tone(520, .5, 'triangle', .07, 130); },
  revive() { [523, 784, 1047].forEach((f, i) => tone(f, .14, 'triangle', .06, 0, i * .08)); },
  build() { tone(330, .06, 'square', .05); tone(495, .06, 'square', .05, 0, .07); tone(660, .14, 'square', .05, 0, .14); },
  repair() { tone(700 + Math.random() * 300, .03, 'square', .02); },
  fireball() { tone(160, .2, 'sawtooth', .035, 320); },
  houseHit() { tone(110, .1, 'square', .05, 70); },
  horn() { tone(196, .5, 'sawtooth', .05, 220); tone(294, .5, 'sawtooth', .035, 330, .05); },
  rest() { tone(1047, .25, 'sine', .05); tone(1319, .3, 'sine', .04, 0, .12); },
  boss() { tone(98, 1.2, 'sawtooth', .07, 65); tone(147, 1.2, 'square', .03, 98, .1); },
  lost() { [392, 330, 262, 196].forEach((f, i) => tone(f, .3, 'triangle', .06, 0, i * .2)); },
  summon() { tone(300, .3, 'sine', .04, 150); }
});
function setPadLabels(kind) {
  const act = kind === 'def' ? 'ท่า<br>พิเศษ' : 'หยิบ<br>วาง';
  document.querySelectorAll('.kpad .kb.act').forEach(b => { b.innerHTML = act; });
  document.querySelectorAll('.kpad .kb.use').forEach(b => { b.innerHTML = 'ใช้'; });
}

/* ---------- flow ---------- */
function dSnap(G) { return { coins: G.coins, ph: G.ph, wi: G.wi, sn: [G.pink.snR | 0, G.mint.snR | 0], down: [G.pink.down, G.mint.down], boss: G.en.some(e => e.k === 'king'), tw: G.pads.reduce((s, t) => s + t.tw, 0) }; }
function loadDefense(i, net) {
  DS.li = i; DS.G = Def.load(DLEVELS[i]); DS.G.net = net || null;
  DS.acc = 0; DS.floats = []; DS.rings = []; DS.act = { n: DS.act.n, uref: null }; DS.seenKa = -1; DS.remote = { act: false, use: false, uref: null }; DS.endT = 0; DS.savedB = null; DS.prev = null;
  S.kind = 'def'; app.classList.add('def'); app.classList.remove('kit', 'drv', 'tak');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  setPadLabels('def'); releaseK(); buildDefBg(); dHud(true);
}
function startDefense(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadDefense(i); showScreen(null); setMode('play');
}
function defRestart() { if (O.role) { onlineRestart(); return; } loadDefense(DS.li); showScreen(null); setMode('play'); }
function defNext() {
  if (O.role === 'host') { if (DS.li < DLEVELS.length - 1) onlineStartDef(DS.li + 1); return; }
  if (DS.li < DLEVELS.length - 1 && dOpen(DS.li + 1)) startDefense(DS.li + 1); else toTitle();
}
let dHudKey = '';
function dHud(force) {
  const lv = DLEVELS[DS.li], k = String(DS.li);
  if (!force && k === dHudKey) return;
  dHudKey = k;
  $('#hNo').textContent = NIGHT(DS.li);
  $('#hName').textContent = lv.name;
  $('#hHint').textContent = lv.hint;
  $('#hHearts').textContent = '';
}
function dSave() {
  if (DS.savedB) return DS.savedB;
  const G = DS.G, lv = DLEVELS[DS.li], st = Def.stars(G), won = G.ph === 'won';
  const pct = Math.max(0, Math.round(Math.min(...G.houses.map(H => H.hp / H.max)) * 100));
  const b = prog.d[lv.name] || { s: 0, h: 0 };
  if (won) { prog.d[lv.name] = { s: Math.max(b.s, st), h: Math.max(b.h || 0, pct) }; store.set('prog2', prog); }
  return (DS.savedB = b);
}
function dResults() {
  const G = DS.G, lv = DLEVELS[DS.li], st = Def.stars(G), won = G.ph === 'won';
  const pct = Math.max(0, Math.round(Math.min(...G.houses.map(H => H.hp / H.max)) * 100));
  const b = dSave();
  const best = won && pct > (b.h || 0);
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${NIGHT(DS.li)} · ${won ? 'ฟ้าสางแล้ว' : 'เฝ้าไม่รอด'}`;
  $('#cName').textContent = won ? lv.name : (G.why === 'down' ? 'ล้มทั้งคู่' : 'บ้านพัง');
  $('#cStars').hidden = !won;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const last = DS.li >= DLEVELS.length - 1;
  let msg = won
    ? (last ? 'ราชาผียอมแพ้แล้ว บ้านของเราปลอดภัยทุกคืน' : st === 3 ? 'บ้านแทบไม่มีรอย ผีไม่กล้ามาอีกแล้ว' : st === 2 ? 'รอดมาได้ บ้านเป็นรอยนิดหน่อย ช่วงพักลองซ่อมบ้านด้วย' : 'รอดแบบหวุดหวิด ลองสร้างตะเกียงเพิ่มกับซ่อมบ้านช่วงพัก')
    : (G.why === 'down' ? 'พอล้มทั้งสองคนก็ไม่มีใครเฝ้าบ้าน ยืนใกล้กันไว้ ใครล้มให้อีกคนรีบไปพยุง' : 'ผีพังบ้านได้ ลองยืนให้สายใจขวางทางผี แล้วสร้างตะเกียงไว้ช่วยยิง');
  if (best && b.h) msg += ' · สถิติใหม่';
  $('#cMsg').textContent = msg;
  const total = G.def.waves.length;
  $('#cStats').innerHTML = `<span>บ้านเหลือ <b>${th(pct)}%</b></span><span>ปราบผี <b>${th(G.kills)}</b> ตัว</span><span>คลื่น <b>${th(Math.max(0, G.wi + (won ? 1 : 0)))}/${th(total)}</b></span>`;
  const guest = O.role === 'guest';
  $('#bNext').textContent = 'คืนถัดไป';
  $('#bNext').hidden = guest || !won || last || !dOpen(DS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : won ? 'เล่นคืนนี้อีกครั้ง' : 'ลองคืนนี้อีกครั้ง';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function dPoof(e) {
  const col = GCOL[e.k] || '#fff';
  burst(e.x, e.y + DY0, e.k === 'king' ? 40 : 10, col, { speed: e.k === 'king' ? 160 : 80, life: e.k === 'king' ? 1.2 : .5, size: 3, g: -40 });
}
function dRing(x, y, r, col, max = .5) { DS.rings.push({ x, y, r, col, t: 0, max }); }
function dBurstFx(p) { sfx.burst(); S.shake = .45; dRing(p.x, p.y, Def.BURST.r, C.pink, .45); burst(p.x, p.y + DY0, 16, C.pink, { type: 'heart', size: 4, speed: 160, life: .6, g: 0 }); }
function dHealFx(p) { sfx.heal(); dRing(p.x, p.y, Def.HEAL.r, C.mint, .7); burst(p.x, p.y + DY0, 14, '#7dffb0', { speed: 70, life: .9, size: 3, g: -60 }); }
function dEvents(ev) {
  const G = DS.G, seen = new Set();
  for (const e of ev) {
    const [k, id] = e.split(':');
    if (k === 'shoot') { if (DS.shootT <= 0) { sfx.pew(id); DS.shootT = .09; } continue; }
    if (k === 'kill' || k === 'tower') continue;
    if (seen.has(e)) continue; seen.add(e);
    if (k === 'coin') sfx.coin();
    else if (k === 'burst') dBurstFx(G[id]);
    else if (k === 'heal') dHealFx(G[id]);
    else if (k === 'down') { sfx.down(); S.shake = .5; S.flash = .5; }
    else if (k === 'revive') { sfx.revive(); const p = G[id]; burst(p.x, p.y + DY0, 12, C.gold, { type: 'heart', size: 3, speed: 90, life: .8, g: -60 }); }
    else if (k === 'build' || k === 'upgrade') sfx.build();
    else if (k === 'repair') { if (DS.tickT <= 0) { sfx.repair(); DS.tickT = .12; } }
    else if (k === 'fire') sfx.fireball();
    else if (k === 'wave') sfx.horn();
    else if (k === 'boss') { sfx.boss(); S.shake = 1; }
    else if (k === 'rest') sfx.rest();
    else if (k === 'summon') sfx.summon();
  }
  if (G.dead && G.dead.length) { for (const e of G.dead) dPoof(e); if (DS.popT <= 0) { sfx.pop(); DS.popT = .06; } G.dead = []; }
}
function dGuestDiff() {
  const G = DS.G, n = dSnap(G), p = DS.prev || n;
  if (G.gone && G.gone.length) { for (const e of G.gone) dPoof(e); if (DS.popT <= 0) { sfx.pop(); DS.popT = .06; } G.gone = []; }
  if (n.coins > p.coins + 0.5) sfx.coin();
  [G.pink, G.mint].forEach((pl, i) => {
    if (n.sn[i] > p.sn[i]) (pl.id === 'pink' ? dBurstFx : dHealFx)(pl);
    if (n.down[i] && !p.down[i]) { sfx.down(); S.shake = .5; }
    if (!n.down[i] && p.down[i]) sfx.revive();
  });
  if (n.wi > p.wi) sfx.horn();
  if (n.ph === 'rest' && p.ph === 'wave') sfx.rest();
  if (n.boss && !p.boss) { sfx.boss(); S.shake = 1; }
  if (n.tw > p.tw) sfx.build();
  DS.prev = n;
}
function dTick() {
  const G = DS.G, inp = {};
  if (!O.role) { inp.pink = kInput('pink'); inp.mint = kInput('mint'); }
  else {
    const me = G[O.local], li = kInput(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    if (li.act) DS.act.n++;
    if (li.use) { const t = Def.target(G, me); DS.act.uref = t ? Def.refOf(t) : null; }
    DS.lastInp = li;
    Def.smoothPlayer(G, rid, performance.now());
    if (O.role === 'host') {
      inp[O.local] = li;
      const R = DS.remote;
      inp[rid] = { act: R.act, use: R.use, uref: R.uref };
      R.act = false;
    } else {
      Def.smooth(G);
      inp[O.local] = { mx: li.mx, my: li.my };
    }
  }
  const ev = Def.step(G, inp);
  dEvents(ev);
  if (O.role === 'guest') dGuestDiff();
  if (G.over && !DS.endT) { DS.endT = 1.8; if (G.ph === 'won') sfx.win(); else sfx.lost(); dSave(); }
}
function defFrame(dt, now) {
  const G = DS.G;
  DS.shootT -= dt; DS.tickT -= dt; DS.hitT -= dt; DS.popT -= dt;
  if (S.mode === 'play' && G) {
    DS.acc += dt;
    while (DS.acc >= Def.DT) { dTick(); DS.acc -= Def.DT; if (S.mode !== 'play') { DS.acc = 0; break; } }
    if (DS.endT > 0) { DS.endT -= dt; if (DS.endT <= 0) { DS.endT = -1; dResults(); if (O.role === 'host') O.st = 'clear'; } }
    if (G.hurtT > 0 && DS.hitT <= 0 && !G.over) { sfx.houseHit(); DS.hitT = .45; }
  } else DS.acc = 0;
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const r of DS.rings) r.t += dt;
  DS.rings = DS.rings.filter(r => r.t < r.max);
  if (G) dHud();
  renderDefense();
}

/* ---------- drawing ---------- */
const defBg = document.createElement('canvas');
function drawTree(g, x, y, s) {
  const cx = x + DK / 2, cy = y + DK / 2;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx + 3, cy + 14, 24, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3d2a1c'; g.fillRect(cx - 4, cy + 2, 8, 16);
  const r = rng(s);
  for (const [dx, dy, rad, col] of [[0, -4, 22, '#163a2c'], [-10, 2, 15, '#1b4634'], [10, 0, 16, '#1b4634'], [-4, -10, 13, '#25563f'], [6, -8, 10, '#2f6a4c']]) {
    g.fillStyle = col; g.beginPath(); g.arc(cx + dx + (r() - .5) * 4, cy + dy + (r() - .5) * 4, rad, 0, Math.PI * 2); g.fill();
  }
}
function drawFence(g, x, y) {
  g.fillStyle = '#5b3b24';
  for (const fx of [10, 30, 50]) { rr(g, x + fx - 4, y + 6, 8, DK - 14, 2); g.fill(); }
  g.fillStyle = '#7a5032'; g.fillRect(x, y + 18, DK, 6); g.fillRect(x, y + 38, DK, 6);
}
function drawGate(g, x, y, t) {
  g.fillStyle = '#2a2219'; g.fillRect(x, y, DK, DK);
  g.fillStyle = 'rgba(160,110,255,.18)'; g.beginPath(); g.arc(x + DK / 2, y + DK / 2, 26, 0, Math.PI * 2); g.fill();
  // little spirit arch
  g.strokeStyle = '#a3312f'; g.lineWidth = 5;
  const horiz = t.y === 0 || t.y === Def.GH - 1;
  g.beginPath();
  if (horiz) { g.moveTo(x + 8, y + 4); g.lineTo(x + 8, y + DK - 4); g.moveTo(x + DK - 8, y + 4); g.lineTo(x + DK - 8, y + DK - 4); }
  else { g.moveTo(x + 4, y + 8); g.lineTo(x + DK - 4, y + 8); g.moveTo(x + 4, y + DK - 8); g.lineTo(x + DK - 4, y + DK - 8); }
  g.stroke();
}
function drawHouse(g, H) {
  const { x, y, w, h } = H.rect;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + w / 2, y + h - 6, w / 2 + 6, 12, 0, 0, Math.PI * 2); g.fill();
  // stilts
  g.fillStyle = '#4a2f1d';
  for (let i = 0; i <= Math.round(w / 48); i++) g.fillRect(x + 8 + i * (w - 22) / Math.round(w / 48), y + h - 26, 6, 22);
  // floor + walls
  g.fillStyle = '#6b4329'; g.fillRect(x + 2, y + h - 30, w - 4, 8);
  const wallTop = y + h * 0.42;
  g.fillStyle = '#8a5a35'; g.fillRect(x + 8, wallTop, w - 16, y + h - 30 - wallTop);
  g.strokeStyle = 'rgba(60,35,18,.5)'; g.lineWidth = 1;
  for (let px = x + 16; px < x + w - 8; px += 10) { g.beginPath(); g.moveTo(px, wallTop); g.lineTo(px, y + h - 30); g.stroke(); }
  // windows with warm light
  const nw = Math.max(1, Math.round(w / 64));
  for (let i = 0; i < nw; i++) {
    const wx = x + (i + 0.5) * w / nw - 9, wy = wallTop + 8;
    g.fillStyle = 'rgba(255,190,90,.25)'; g.beginPath(); g.arc(wx + 9, wy + 9, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffcf6b'; g.fillRect(wx, wy, 18, 18);
    g.fillStyle = '#6b4329'; g.fillRect(wx + 8, wy, 2, 18); g.fillRect(wx, wy + 8, 18, 2);
  }
  // steep thai roof with curled ends
  const top = y - 22, eave = wallTop + 4;
  g.fillStyle = '#a3312f';
  g.beginPath(); g.moveTo(x - 6, eave); g.lineTo(x + w * 0.5, top); g.lineTo(x + w + 6, eave); g.closePath(); g.fill();
  g.fillStyle = '#7d2422';
  g.beginPath(); g.moveTo(x + w * 0.5, top); g.lineTo(x + w + 6, eave); g.lineTo(x + w * 0.5, eave); g.closePath(); g.fill();
  g.strokeStyle = '#e8b23a'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - 6, eave); g.lineTo(x + w * 0.5, top); g.lineTo(x + w + 6, eave); g.stroke();
  g.beginPath(); g.moveTo(x + w * 0.5 - 6, top + 6); g.quadraticCurveTo(x + w * 0.5 - 12, top - 10, x + w * 0.5 - 4, top - 14); g.moveTo(x + w * 0.5 + 6, top + 6); g.quadraticCurveTo(x + w * 0.5 + 12, top - 10, x + w * 0.5 + 4, top - 14); g.stroke();
  g.lineCap = 'butt';
}
function buildDefBg() {
  const G = DS.G;
  if (!G) return;
  defBg.width = cv.width; defBg.height = cv.height;
  const g = defBg.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, DY0);
  sky.addColorStop(0, '#0b0a1f'); sky.addColorStop(1, '#1b1636');
  g.fillStyle = sky; g.fillRect(0, 0, VW, DY0);
  const r = rng(99);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .5})`; g.fillRect(r() * VW, r() * (DY0 - 10), 1.5, 1.5); }
  g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(VW * 0.66, 14, 22, 0, Math.PI); g.fill();
  g.translate(0, DY0);
  for (let y = 0; y < Def.GH; y++) for (let x = 0; x < Def.GW; x++) {
    const t = G.tiles[y][x], px = x * DK, py = y * DK;
    g.fillStyle = (x + y) % 2 ? '#20402f' : '#1c3a2b'; g.fillRect(px, py, DK, DK);
    const rr2 = rng(hash(x, y));
    g.fillStyle = 'rgba(120,200,140,.12)';
    for (let k = 0; k < 4; k++) { const gx = px + rr2() * DK, gy = py + rr2() * DK; g.fillRect(gx, gy, 2, 5); }
  }
  for (let y = 0; y < Def.GH; y++) for (let x = 0; x < Def.GW; x++) {
    const t = G.tiles[y][x], px = x * DK, py = y * DK;
    if (t.t === 't') drawTree(g, px, py, hash(x, y));
    else if (t.t === '#') drawFence(g, px, py);
    else if (t.t === '~') { g.fillStyle = '#163e57'; g.fillRect(px, py, DK, DK); }
    else if (t.t === 'G') drawGate(g, px, py, t);
    else if (t.t === 'T') {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(px + DK / 2, py + DK / 2 + 12, 24, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6d6a7d'; g.beginPath(); g.ellipse(px + DK / 2, py + DK / 2 + 6, 24, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8c8aa0'; g.beginPath(); g.ellipse(px + DK / 2, py + DK / 2 + 2, 22, 12, 0, 0, Math.PI * 2); g.fill();
    }
  }
  for (const H of G.houses) drawHouse(g, H);
}
function drawLantern(g, t, time) {
  const cx = (t.x + 0.5) * DK, base = (t.y + 0.5) * DK + 4;
  if (t.tw) {
    const T = Def.TOWER[t.tw], fl = 0.85 + Math.sin(time * 6 + t.x) * 0.15;
    const gl = g.createRadialGradient(cx, base - 30, 4, cx, base - 30, 46);
    gl.addColorStop(0, `rgba(255,170,80,${0.35 * fl})`); gl.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gl; g.fillRect(cx - 46, base - 76, 92, 92);
    g.fillStyle = '#3a2a22'; g.fillRect(cx - 3, base - 26, 6, 26);
    const h = 18 + t.tw * 4;
    g.fillStyle = '#d23a2f'; rr(g, cx - 12, base - 26 - h, 24, h, 9); g.fill();
    g.fillStyle = `rgba(255,210,120,${0.5 * fl})`; rr(g, cx - 8, base - 22 - h, 16, h - 8, 6); g.fill();
    g.fillStyle = '#e8b23a'; g.fillRect(cx - 9, base - 28 - h, 18, 4); g.fillRect(cx - 9, base - 26, 18, 4);
    for (let i = 0; i < t.tw; i++) { g.fillStyle = C.gold; g.beginPath(); g.arc(cx - 8 + i * 8, base + 8, 2.6, 0, Math.PI * 2); g.fill(); }
  }
  if (t.bp > 0) {
    g.strokeStyle = 'rgba(21,18,43,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, base - 4, 20, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(cx, base - 4, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t.bp)); g.stroke();
  }
}
function ghostEyes(g, x, y, s, ax, ay, angry) {
  for (const k of [-1, 1]) {
    g.fillStyle = '#1a1530'; g.beginPath(); g.ellipse(x + k * 5 * s + ax * 2, y + ay * 2, 2.8 * s, 3.6 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + k * 5 * s + ax * 2 + 1, y + ay * 2 - 1.2, 1 * s, 0, Math.PI * 2); g.fill();
  }
  if (angry) { g.strokeStyle = '#1a1530'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 9 * s, y - 6 * s); g.lineTo(x - 2 * s, y - 3.5 * s); g.moveTo(x + 9 * s, y - 6 * s); g.lineTo(x + 2 * s, y - 3.5 * s); g.stroke(); }
}
function drawSpook(g, e, time) {
  const s = Def.EN[e.k], r = e.r, bob = Math.sin(time * 5 + e.id) * 2.5;
  const x = e.x, y = e.y + (s.fly ? bob - 6 : bob * 0.5);
  const sp = Math.hypot(e.vx || 0, e.vy || 0) || 1, ax = (e.vx || 0) / sp, ay = (e.vy || 0) / sp;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(e.x, e.y + r * 0.8, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); g.fill();
  g.save();
  if (e.k === 'imp' || e.k === 'king') {
    const col = e.k === 'king' ? '#9b6bf0' : '#f4f0ff';
    g.fillStyle = col; g.globalAlpha = e.k === 'imp' ? 0.93 : 1;
    g.beginPath(); g.arc(x, y - r * 0.2, r, Math.PI, 0);
    const n = 4, bw = (2 * r) / n;
    g.lineTo(x + r, y + r * 0.7);
    for (let i = n; i > 0; i--) { const bx = x - r + i * bw; g.quadraticCurveTo(bx - bw / 2, y + r * (i % 2 ? 1.05 : 0.6) + Math.sin(time * 8 + i) * 2, bx - bw, y + r * 0.7); }
    g.closePath(); g.fill(); g.globalAlpha = 1;
    if (e.k === 'king') {
      g.fillStyle = '#e8b23a'; g.beginPath(); g.moveTo(x - r * 0.55, y - r * 1.05); g.lineTo(x - r * 0.55, y - r * 1.45); g.lineTo(x - r * 0.25, y - r * 1.2); g.lineTo(x, y - r * 1.55); g.lineTo(x + r * 0.25, y - r * 1.2); g.lineTo(x + r * 0.55, y - r * 1.45); g.lineTo(x + r * 0.55, y - r * 1.05); g.closePath(); g.fill();
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(x, y - r * 1.25, 3, 0, Math.PI * 2); g.fill();
      for (const k of [-1, 1]) { g.fillStyle = '#ff4d6d'; g.beginPath(); g.ellipse(x + k * r * 0.32, y - r * 0.25, 5, 7, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#2a1a40'; g.lineWidth = 3; g.beginPath(); g.arc(x, y + r * 0.15, r * 0.3, 0.2, Math.PI - 0.2); g.stroke();
    } else {
      ghostEyes(g, x, y - r * 0.25, 1, ax, ay, false);
      g.fillStyle = '#1a1530'; g.beginPath(); g.ellipse(x + ax * 2, y + r * 0.12, e.atk ? 3 : 2, e.atk ? 4 : 1.6, 0, 0, Math.PI * 2); g.fill();
    }
  } else if (e.k === 'head') {
    const tail = 5;
    for (let i = tail; i > 0; i--) { const ty = y + r * 0.7 + i * 5, tx = x + Math.sin(time * 9 + i) * 3; g.fillStyle = `rgba(255,${120 + i * 15},${160 + i * 10},${0.9 - i * 0.12})`; g.beginPath(); g.arc(tx, ty, 4.5 - i * 0.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,120,170,.25)'; g.beginPath(); g.arc(x, y, r * 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6d6b8'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1726'; g.beginPath(); g.arc(x, y - 2, r * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    g.fillRect(x - r * 1.02, y - 3, 5, r * 0.9); g.fillRect(x + r * 1.02 - 5, y - 3, 5, r * 0.9);
    ghostEyes(g, x, y + 2, 0.8, ax, ay, false);
    g.fillStyle = '#e8536f'; g.beginPath(); g.arc(x, y + r * 0.5, 2, 0, Math.PI); g.fill();
  } else if (e.k === 'pob') {
    g.fillStyle = '#5e6b3b'; g.beginPath(); g.ellipse(x, y, r * 1.05, r * 0.95, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7f8f50'; g.beginPath(); g.ellipse(x, y + r * 0.2, r * 0.7, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    for (const k of [-1, 1]) { g.fillStyle = '#5e6b3b'; g.beginPath(); g.ellipse(x + k * r * 0.95, y + r * 0.35 + (e.atk ? Math.sin(time * 16) * 4 : 0), r * 0.28, r * 0.42, k * 0.4, 0, Math.PI * 2); g.fill(); }
    ghostEyes(g, x, y - r * 0.35, 1.1, ax, ay, true);
    g.fillStyle = '#2a2a1a'; g.fillRect(x - 7, y + 2, 14, 4);
    g.fillStyle = '#fff'; g.fillRect(x - 5, y + 2, 3, 3); g.fillRect(x + 2, y + 2, 3, 3);
  } else if (e.k === 'wisp') {
    const fl = Math.sin(time * 14 + e.id) * 2;
    const gl = g.createRadialGradient(x, y, 2, x, y, r * 2.2);
    gl.addColorStop(0, 'rgba(120,230,255,.6)'); gl.addColorStop(1, 'rgba(60,160,255,0)');
    g.fillStyle = gl; g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    g.fillStyle = '#5fd0ff'; g.beginPath(); g.moveTo(x - r, y + 2); g.quadraticCurveTo(x - r, y - r * 1.2, x + fl, y - r * 1.9); g.quadraticCurveTo(x + r, y - r * 1.2, x + r, y + 2); g.arc(x, y + 2, r, 0, Math.PI); g.fill();
    g.fillStyle = '#c9f6ff'; g.beginPath(); g.ellipse(x, y + 3, r * 0.6, r * 0.55, 0, 0, Math.PI * 2); g.fill();
    ghostEyes(g, x, y + 2, 0.75, ax, ay, true);
  }
  g.restore();
  if (e.fl > 0) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x, y, r * 1.02, 0, Math.PI * 2); g.fill(); }
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.1; g.fillStyle = C.gold; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.9, y - r * 1.1 + Math.sin(a) * 4, 2.6, 0, Math.PI * 2); g.fill(); }
  if (e.hp < e.max && e.k !== 'king') {
    const w = Math.max(22, r * 1.8);
    g.fillStyle = 'rgba(21,18,43,.75)'; g.fillRect(x - w / 2 - 1, y - r - 13, w + 2, 5);
    g.fillStyle = '#ff6b8a'; g.fillRect(x - w / 2, y - r - 12, w * Math.max(0, e.hp / e.max), 3);
  }
}
function drawHero(g, p, time, name, nameA) {
  const pink = p.id === 'pink', col = pink ? C.pink : C.mint, dark = pink ? C.pinkD : C.mintD;
  const x = p.x, y = p.y;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 15, 18, 6, 0, 0, Math.PI * 2); g.fill();
  if (p.down) {
    g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + 6, 22, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + 4, 21, 11, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 2;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + k * 6 - 3, y); g.lineTo(x + k * 6 + 3, y + 5); g.moveTo(x + k * 6 + 3, y); g.lineTo(x + k * 6 - 3, y + 5); g.stroke(); }
    // help bubble + revive ring
    const by = y - 34 + Math.sin(time * 4) * 2;
    g.font = `600 12px ${FONT}`; const tw = g.measureText('ช่วยด้วย').width + 16;
    rr(g, x - tw / 2, by - 12, tw, 20, 10); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ช่วยด้วย', x, by - 1); g.textBaseline = 'alphabetic';
    if (p.rv > 0) {
      g.strokeStyle = 'rgba(21,18,43,.6)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 4, 28, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 4, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.rv)); g.stroke();
    }
    return;
  }
  const bob = p.walk ? Math.abs(Math.sin(p.walk)) * 2 : 0, yy = y - bob;
  g.fillStyle = dark; g.beginPath(); g.arc(x, yy + 3, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.hurt > 0 ? '#ffffff' : col; g.beginPath(); g.arc(x, yy, 18, 0, Math.PI * 2); g.fill();
  if (pink) {
    g.fillStyle = C.gold;
    g.beginPath(); g.moveTo(x + 6, yy - 16); g.lineTo(x - 2, yy - 24); g.lineTo(x - 2, yy - 10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + 6, yy - 16); g.lineTo(x + 14, yy - 24); g.lineTo(x + 14, yy - 10); g.closePath(); g.fill();
    g.beginPath(); g.arc(x + 6, yy - 17, 3, 0, Math.PI * 2); g.fill();
  } else {
    g.strokeStyle = '#2f8f55'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, yy - 17); g.lineTo(x + 1, yy - 24); g.stroke();
    g.fillStyle = '#5fd37a'; g.beginPath(); g.ellipse(x + 7, yy - 26, 7, 4, -0.5, 0, Math.PI * 2); g.fill();
  }
  const ex = p.ax * 5, ey = p.ay * 3;
  for (const s of [-1, 1]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + ex + s * 6, yy + ey - 1, 3.6, 4.4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.arc(x + ex + s * 6 + p.ax * 1.4, yy + ey - 0.5 + p.ay * 1.4, 2, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(255,170,200,.75)'; g.beginPath(); g.ellipse(x + ex - 11, yy + ey + 5, 2.6, 1.6, 0, 0, Math.PI * 2); g.ellipse(x + ex + 11, yy + ey + 5, 2.6, 1.6, 0, 0, Math.PI * 2); g.fill();
  // little slingshot in the aim direction
  g.strokeStyle = '#6b4329'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + p.ax * 16, yy + p.ay * 16 + 4); g.lineTo(x + p.ax * 25, yy + p.ay * 25 + 2); g.stroke();
  if (p.using) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; const a = time * 18; g.beginPath(); g.arc(x + p.fx * 24, yy + p.fy * 22, 12, a, a + 1.3); g.stroke(); }
  if (p.hp < p.max) {
    g.fillStyle = 'rgba(21,18,43,.8)'; rr(g, x - 19, y + 21, 38, 6, 3); g.fill();
    g.fillStyle = p.hp > 50 ? '#5fd36a' : p.hp > 25 ? '#ffb347' : '#ff4d4d'; rr(g, x - 18, y + 22, 36 * p.hp / p.max, 4, 2); g.fill();
  }
  if (p.cd <= 0) { g.strokeStyle = hexA(col, .55 + Math.sin(time * 5) * .25); g.lineWidth = 2; g.beginPath(); g.arc(x, yy, 23, 0, Math.PI * 2); g.stroke(); }
  if (nameA > 0) {
    g.globalAlpha = nameA; g.font = `600 11px ${FONT}`; g.textAlign = 'center';
    g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText(name, x, yy - 30); g.fillStyle = col; g.fillText(name, x, yy - 30); g.globalAlpha = 1;
  }
}
function drawBeam(g, a, b, time) {
  const gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
  gr.addColorStop(0, C.pink); gr.addColorStop(1, C.mint);
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  g.save();
  g.globalAlpha = 0.35; g.strokeStyle = gr; g.lineWidth = 14 + Math.sin(time * 9) * 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  g.globalAlpha = 1; g.lineWidth = 3.5;
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const s = i / 24, w = Math.sin(s * Math.PI) * Math.sin(time * 12 + s * 14) * 4; g.lineTo(a.x + dx * s + nx * w, a.y + dy * s + ny * w); }
  g.stroke();
  g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const s = (time * 0.8 + i / 3) % 1; heartPath(g, a.x + dx * s, a.y + dy * s, 3.2); g.fill(); }
  g.restore();
}
function drawCoinIcon(g, x, y, r) {
  g.fillStyle = '#b8860b'; g.beginPath(); g.arc(x, y + 1, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e0a82a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * 0.62, 0, Math.PI * 2); g.stroke();
}
function drawDefHud(g, G, time) {
  const W = G.def.waves.length, wn = Math.max(1, Math.min(W, G.wi + (G.ph === 'rest' || G.ph === 'prep' ? 2 : 1)));
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `400 13px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText('คลื่น', 16, 30);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(`${th(wn)}/${th(W)}`, 16, 60);
  const left = (G.queue ? G.queue.length : 0) || G.qlen || 0;
  const status = G.ph === 'prep' ? `ผีมาใน ${th(Math.ceil(G.pt))} วิ` : G.ph === 'rest' ? `พัก ${th(Math.ceil(G.pt))} วิ` : G.ph === 'wave' ? `ผีเหลือ ${th(left + G.en.length)}` : '';
  g.font = `600 13px ${FONT}`; g.fillStyle = C.paper; g.fillText(status, 16, 82);
  // houses
  const hx0 = 150, hw = G.houses.length > 1 ? 170 : 300;
  G.houses.forEach((H, i) => {
    const x = hx0 + i * (hw + 22), y = 22, f = Math.max(0, H.hp / H.max);
    g.fillStyle = '#a3312f'; g.beginPath(); g.moveTo(x, y + 9); g.lineTo(x + 9, y); g.lineTo(x + 18, y + 9); g.closePath(); g.fill();
    g.fillStyle = '#8a5a35'; g.fillRect(x + 3, y + 9, 12, 9);
    const bx = x + 26;
    g.fillStyle = 'rgba(255,255,255,.08)'; rr(g, bx, y + 2, hw - 26, 14, 7); g.fill();
    const hc = f > 0.6 ? '#5fd36a' : f > 0.3 ? '#ffb347' : '#ff4d4d';
    g.fillStyle = G.hurtT > 0 && Math.sin(time * 40) > 0 ? '#ffffff' : hc; rr(g, bx, y + 2, Math.max(6, (hw - 26) * f), 14, 7); g.fill();
    g.font = `600 11px ${FONT}`; g.textAlign = 'left'; const ht = `${G.houses.length > 1 ? (i ? 'บ้านขวา ' : 'บ้านซ้าย ') : 'บ้าน '}${th(Math.ceil(f * 100))}%`; g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.9)'; g.strokeText(ht, bx + 8, y + 13); g.fillStyle = '#fff'; g.fillText(ht, bx + 8, y + 13);
  });
  // heroes
  [G.pink, G.mint].forEach((p, i) => {
    const x = hx0 + i * 170, y = 52, col = p.id === 'pink' ? C.pink : C.mint;
    g.fillStyle = col; g.beginPath(); g.arc(x + 8, y + 9, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.08)'; rr(g, x + 22, y + 3, 100, 10, 5); g.fill();
    g.fillStyle = p.down ? '#555' : col; rr(g, x + 22, y + 3, Math.max(4, 100 * p.hp / p.max), 10, 5); g.fill();
    g.font = `600 11px ${FONT}`; g.textAlign = 'left';
    const sp = p.id === 'pink' ? 'ระเบิดหัวใจ' : 'ใบไม้ฟื้นใจ';
    if (p.down) { g.fillStyle = '#ff8a8a'; g.fillText('ล้มอยู่ ไปพยุงที', x + 22, y + 30); }
    else if (p.cd <= 0) { g.fillStyle = col; g.fillText(`${sp} พร้อม`, x + 22, y + 30); }
    else { g.fillStyle = '#8f86b5'; g.fillText(`${sp} ${th(Math.ceil(p.cd))}`, x + 22, y + 30); }
  });
  // coins
  const rx = VW - 16;
  g.textAlign = 'right'; g.font = `400 13px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText('เหรียญ', rx, 30);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.gold; const cs = th(Math.floor(G.coins)); g.fillText(cs, rx, 60);
  const cw = g.measureText(cs).width; drawCoinIcon(g, rx - cw - 14, 51, 8);
  g.font = `400 11px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText(`ตะเกียง ฿${th(Def.TOWER[1].cost)} · ซ่อมบ้าน ฿๑ ต่อ ๒%`, rx, 82);
  g.textAlign = 'left';
}
function drawUseHint(g, G, p) {
  if (p.down) return;
  const o = p === G.pink ? G.mint : G.pink;
  const label = (text, x, y, col) => {
    g.font = `600 12px ${FONT}`; const w = g.measureText(text).width + 14;
    rr(g, x - w / 2, y - 14, w, 20, 10); g.fillStyle = 'rgba(21,18,43,.88)'; g.fill();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - 3.5); g.textBaseline = 'alphabetic';
  };
  if (o.down && Math.hypot(o.x - p.x, o.y - p.y) < Def.REVIVE_D * 1.6) { label('กดใช้ค้างไว้เพื่อพยุง', o.x, o.y - 56, C.gold); return; }
  const t = Def.target(G, p);
  if (!t) return;
  const col = p.id === 'pink' ? C.pink : C.mint;
  if (t.t === 'T') {
    g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([7, 5]); rr(g, t.x * DK + 3, t.y * DK + 3, DK - 6, DK - 6, 8); g.stroke(); g.setLineDash([]);
    const nx = t.tw + 1, cx = (t.x + 0.5) * DK, cy = t.y * DK;
    const rg = Def.TOWER[Math.min(3, Math.max(1, nx > 3 ? 3 : nx))].range;
    g.strokeStyle = 'rgba(255,207,90,.14)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy + DK / 2, rg, 0, Math.PI * 2); g.stroke();
    if (nx > 3) label('ตะเกียงเต็มขั้นแล้ว', cx, cy - 8, '#b3a8d9');
    else { const cost = Def.TOWER[nx].cost, ok = G.coins >= cost; label(`${nx === 1 ? 'สร้างตะเกียง' : 'อัปเกรด'} ฿${th(cost)}`, cx, cy - 8, ok ? C.gold : '#ff8a8a'); }
  } else if (t.t === 'h' && t.house) {
    const H = t.house;
    if (H.hp < H.max) label(G.coins >= 1 ? 'กดใช้ค้างไว้เพื่อซ่อม' : 'ไม่มีเหรียญซ่อม', H.cx, H.rect.y - 30, G.coins >= 1 ? C.gold : '#ff8a8a');
  }
}
function renderDefense() {
  const g = ctx, G = DS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(defBg, 0, 0);
  let ox = 0, oy = 0;
  if (S.shake > 0) { ox = (Math.random() - .5) * 6 * S.shake; oy = (Math.random() - .5) * 6 * S.shake; }
  g.setTransform(scale, 0, 0, scale, ox * scale, (DY0 + oy) * scale);
  const time = S.time;
  // house damage
  for (const H of G.houses) {
    const f = H.hp / H.max;
    if (f < 0.66) { g.strokeStyle = 'rgba(30,15,10,.75)'; g.lineWidth = 2; const { x, y, w, h } = H.rect; g.beginPath(); g.moveTo(x + w * 0.3, y + h * 0.5); g.lineTo(x + w * 0.36, y + h * 0.62); g.lineTo(x + w * 0.31, y + h * 0.72); if (f < 0.33) { g.moveTo(x + w * 0.7, y + h * 0.48); g.lineTo(x + w * 0.64, y + h * 0.6); g.lineTo(x + w * 0.7, y + h * 0.7); } g.stroke(); }
    if (H.hp <= 0) { g.fillStyle = 'rgba(20,10,10,.55)'; g.fillRect(H.rect.x, H.rect.y - 20, H.rect.w, H.rect.h + 20); }
  }
  for (const t of G.pads) drawLantern(g, t, time);
  // coins on the ground
  for (const c of G.drops) { if (c.life < 3 && Math.sin(time * 18) > 0) continue; drawCoinIcon(g, c.x, c.y + Math.sin(time * 4 + c.x) * 1.5, 6 + Math.min(3, c.v * 0.4)); }
  if (G.beam) drawBeam(g, G.pink, G.mint, time);
  if (S.mode === 'play') { const locals = O.role ? [G[O.local]] : [G.pink, G.mint]; for (const p of locals) drawUseHint(g, G, p); }
  // rings
  for (const r of DS.rings) { const k = r.t / r.max; g.strokeStyle = hexA(r.col, 1 - k); g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, r.r * (0.3 + 0.7 * k), 0, Math.PI * 2); g.stroke(); }
  // characters by depth
  const nameA = S.mode === 'menu' ? 0 : Math.max(0, Math.min(1, 7 - G.t));
  const list = G.en.map(e => ({ y: e.y, e })).concat([G.pink, G.mint].map(p => ({ y: p.y, p })));
  list.sort((a, b) => a.y - b.y);
  for (const it of list) { if (it.e) drawSpook(g, it.e, time); else drawHero(g, it.p, time, S.names[it.p.id], nameA); }
  // shots
  for (const b of G.bu) {
    if (b.o === 'pink') { heartPath(g, b.x, b.y, 4.5); g.fillStyle = C.pink; g.fill(); }
    else if (b.o === 'mint') { g.fillStyle = '#5fd37a'; g.beginPath(); g.ellipse(b.x, b.y, 5.5, 3, time * 10, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = 'rgba(255,200,90,.35)'; g.beginPath(); g.arc(b.x, b.y, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(b.x, b.y, 3.5, 0, Math.PI * 2); g.fill(); }
  }
  for (const f of G.fb) {
    const gl = g.createRadialGradient(f.x, f.y, 1, f.x, f.y, 11);
    gl.addColorStop(0, '#fff2a8'); gl.addColorStop(0.5, '#ff8a2f'); gl.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(f.x, f.y, 11, 0, Math.PI * 2); g.fill();
  }
  // boss bar
  const boss = G.en.find(e => e.k === 'king');
  if (boss) {
    const w = 360, x = (VW - w) / 2, y = 10;
    rr(g, x - 4, y - 4, w + 8, 30, 8); g.fillStyle = 'rgba(21,18,43,.85)'; g.fill();
    g.font = `600 12px ${FONT}`; g.fillStyle = '#d9c2ff'; g.textAlign = 'left'; g.fillText('ราชาผี', x + 4, y + 12);
    g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, x + 50, y + 3, w - 54, 12, 6); g.fill();
    g.fillStyle = '#b07bff'; rr(g, x + 50, y + 3, Math.max(4, (w - 54) * boss.hp / boss.max), 12, 6); g.fill();
  }
  // wave countdown in the middle of the yard
  if ((G.ph === 'prep' || G.ph === 'rest') && G.pt < 4.5 && S.mode === 'play') {
    const n = Math.ceil(G.pt), a = Math.min(1, (4.5 - G.pt) * 2);
    g.globalAlpha = a; g.textAlign = 'center';
    g.font = `400 18px ${FONT_D}`; g.lineWidth = 5; g.strokeStyle = 'rgba(21,18,43,.9)';
    const t1 = G.wi + 2 >= G.def.waves.length && G.def.waves[G.wi + 1] && G.def.waves[G.wi + 1].list.some(l => l[0] === 'king') ? 'ราชาผีกำลังมา' : `คลื่นที่ ${th(G.wi + 2)} มาใน`;
    g.strokeText(t1, VW / 2, 40); g.fillStyle = C.paper; g.fillText(t1, VW / 2, 40);
    g.font = `400 40px ${FONT_D}`; g.strokeText(th(n), VW / 2, 86); g.fillStyle = C.gold; g.fillText(th(n), VW / 2, 86);
    g.globalAlpha = 1;
  }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  drawParts(g);
  drawDefHud(g, G, time);
  drawBanner(g);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
  if (S.flash > 0) { g.fillStyle = `rgba(255,80,110,${S.flash * .2})`; g.fillRect(0, 0, VW, VH); }
}

/* ---------- title list ---------- */
function renderDefLevels() {
  let total = 0;
  $('#dlevels').innerHTML = DLEVELS.map((lv, i) => {
    const b = dBest(i), open = dOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> บ้าน ${th(b.h || 0)}%` : open ? 'ยังไม่เคยรอด' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-d="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#dStarsAll').textContent = `ดาวรวม ${th(total)}/${th(DLEVELS.length * 3)}`;
  let next = DLEVELS.findIndex((l, i) => dOpen(i) && !(dBest(i) && dBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.d = next;
  if (S.tab === 'def') $('#bGo').textContent = dBest(next) ? `เฝ้า${NIGHT(next)}` : 'เริ่มเฝ้าบ้าน';
}
$('#dlevels').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b && !b.disabled) startDefense(+b.dataset.d); });

/* ---------- online ---------- */
function onlineStartDef(i) {
  if (O.role !== 'host') return;
  O.md = 'd'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsD').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b && !b.disabled) onlineStartDef(+b.dataset.d); });
function renderOnlineDef() {
  $('#oLevelsD').innerHTML = DLEVELS.map((lv, i) => {
    const b = dBest(i), open = dOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-d="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยรอด' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function dHostHears(pr) {
  const G = DS.G;
  if (!G || pr.ep !== O.ep || !pr.p) return;
  Def.applyPlayer(G, 'mint', pr.p, performance.now());
  const ka = pr.p.ka | 0;
  if (DS.seenKa < 0) DS.seenKa = ka;
  if (ka > DS.seenKa) { DS.seenKa = ka; DS.remote.act = true; }
  DS.remote.use = !!pr.p.ku;
  const u = Def.byRef(G, pr.p.kur);
  DS.remote.uref = u && Math.hypot((u.x + 0.5) * DK - G.mint.x, (u.y + 0.5) * DK - G.mint.y) < DK * 1.75 ? pr.p.kur : null;
}
function dGuestHears(pr) {
  const G = DS.G;
  if (!G) return;
  if (pr.p) Def.applyPlayer(G, 'pink', pr.p, performance.now());
  if (pr.dw) {
    const was = G.over;
    Def.apply(G, pr.dw);
    if (G.over && !was && !DS.endT && S.mode === 'play') { DS.endT = 1.8; if (G.ph === 'won') sfx.win(); else sfx.lost(); dSave(); }
  }
}

/* ---------- Driving mode ---------- */
const RK = Drv.K, RY0 = 96, RZ = 0.7, RVW = 960, RVH = VH - RY0;
const RS = { G: null, li: 0, acc: 0, floats: [], act: { n: 0 }, lastInp: {}, seenKa: -1, remote: { s: 0, p: 0, act: false }, endT: 0, prev: null, roles: { steer: 'pink', pedal: 'mint' }, cam: { x: 0, y: 0 }, bellT: 0, puffT: 0 };
const ROUTE = i => 'เส้นทาง ' + th(i + 1);
const TCOL = ['#ffcf5a', '#ff6f9c', '#4fe0bf', '#8fb8ff', '#ffa25c', '#c59bff'];
const ocol = o => TCOL[o.id % TCOL.length];
if (!prog.r) prog.r = {};
const rBest = i => prog.r[RLEVELS[i].name] || null;
const rOpen = i => i === 0 || !!(rBest(i - 1) && rBest(i - 1).s >= 1);
const roleOf = id => (RS.roles.steer === id ? 'steer' : 'pedal');
Object.assign(sfx, {
  honk() { tone(440, .16, 'square', .045); tone(554, .16, 'square', .035); },
  turboS() { tone(200, .5, 'sawtooth', .05, 900); },
  crash() { tone(90, .25, 'square', .07, 40); tone(160, .12, 'sawtooth', .05, 60, .03); },
  cluck() { tone(900, .05, 'square', .04, 1300); tone(1100, .07, 'square', .035, 700, .07); },
  xbell() { tone(1568, .12, 'triangle', .04); },
  trainHorn() { tone(233, .9, 'sawtooth', .05); tone(277, .9, 'sawtooth', .035); },
  pickup() { tone(784, .08, 'triangle', .05); tone(1175, .12, 'triangle', .05, 0, .07); },
  cash() { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, .12, 'triangle', .05, 0, i * .06)); }
});
// engine hum follows the truck's speed
let eng = null;
function engine(on, v) {
  const a = on ? audio() : ac;
  if (!a) return;
  try {
    if (!eng && on) {
      const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0;
      o.connect(f).connect(g).connect(a.destination); o.start();
      eng = { o, g };
    }
    if (!eng) return;
    const t = a.currentTime;
    eng.o.frequency.setTargetAtTime(48 + v * 26, t, 0.08);
    eng.g.gain.setTargetAtTime(on && S.sound ? 0.022 + Math.min(0.02, v * 0.003) : 0, t, 0.08);
  } catch (e) {}
}
function setDrvPadLabels() {
  document.querySelectorAll('.kpad .kb.act').forEach(b => {
    const id = b.dataset.p === 'local' ? (O.local || 'pink') : b.dataset.p;
    b.innerHTML = roleOf(id) === 'steer' ? 'แตร' : 'เทอร์โบ';
  });
  const st = RS.roles.steer === 'pink';
  const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  set('#rolePinkK', st ? 'A D เลี้ยว' : 'W S คันเร่ง เบรก'); set('#rolePinkT', st ? 'พวงมาลัย' : 'คันเร่ง');
  set('#roleMintK', st ? '↑ ↓ คันเร่ง เบรก' : '← → เลี้ยว'); set('#roleMintT', st ? 'คันเร่ง' : 'พวงมาลัย');
}
function swapRoles() {
  if (O.role === 'guest') return;
  RS.roles = { steer: RS.roles.pedal, pedal: RS.roles.steer };
  store.set('roles', RS.roles.steer);
  setDrvPadLabels(); renderSwapNote();
}
function renderSwapNote() {
  const n = S.names, r = RS.roles;
  $('#bSwap').textContent = `สลับหน้าที่ (ตอนนี้ ${n[r.steer]} คุมพวงมาลัย)`;
}
RS.roles = store.get('roles', 'pink') === 'mint' ? { steer: 'mint', pedal: 'pink' } : { steer: 'pink', pedal: 'mint' };
$('#bSwap').addEventListener('click', () => { swapRoles(); });

/* ---------- flow ---------- */
function rSnap(G) { const e = G.evR || G.ev; return Object.assign({ money: G.money, orders: G.orders.length, ids: G.orders.map(o => o.id).join() }, e); }
function loadDrive(i, net) {
  RS.li = i; RS.G = Drv.load(RLEVELS[i]); RS.G.net = net || null;
  RS.acc = 0; RS.floats = []; RS.act = { n: RS.act.n }; RS.seenKa = -1; RS.remote = { s: 0, p: 0, act: false }; RS.endT = 0; RS.savedB = null; RS.prev = null;
  RS.cam.x = RS.G.car.x; RS.cam.y = RS.G.car.y;
  S.kind = 'drv'; app.classList.add('drv'); app.classList.remove('kit', 'def', 'tak');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); setDrvPadLabels(); buildDrvBg(); rHud(true);
}
function startDrive(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadDrive(i); showScreen(null); setMode('play');
}
function drvRestart() { if (O.role) { onlineRestart(); return; } loadDrive(RS.li); showScreen(null); setMode('play'); }
function drvNext() {
  if (O.role === 'host') { if (RS.li < RLEVELS.length - 1) onlineStartDrv(RS.li + 1); return; }
  if (RS.li < RLEVELS.length - 1 && rOpen(RS.li + 1)) startDrive(RS.li + 1); else toTitle();
}
let rHudKey = '';
function rHud(force) {
  const k = String(RS.li);
  if (!force && k === rHudKey) return;
  rHudKey = k;
  const lv = RLEVELS[RS.li];
  $('#hNo').textContent = ROUTE(RS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function rSave() {
  if (RS.savedB) return RS.savedB;
  const G = RS.G, lv = RLEVELS[RS.li], st = Drv.stars(G);
  const b = prog.r[lv.name] || { s: 0, m: 0 };
  prog.r[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, G.money) };
  store.set('prog2', prog);
  return (RS.savedB = b);
}
function rResults() {
  const G = RS.G, lv = RLEVELS[RS.li], st = Drv.stars(G);
  const b = rSave();
  const best = G.money > b.m;
  setMode('clear'); releaseAll(); releaseK(); engine(false, 0);
  $('#cNo').textContent = `${ROUTE(RS.li)} · หมดเวลาส่งของ`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = st === 3 ? 'ขับเข้าขากันสุดๆ ลูกค้าให้ห้าดาวทุกบ้าน' : st === 2 ? 'ส่งได้ดี อีกนิดเดียวได้สามดาว ลองบอกกันให้เร็วขึ้นตอนจะเลี้ยว' : st === 1 ? 'ส่งรอดแล้ว เส้นทางถัดไปเปิดให้เล่นแล้ว' : `ยังไม่ถึงดาวแรก ต้องได้ ฿${th(lv.stars[0])} ลองตกลงกันก่อนว่าใครพูดอะไร`;
  $('#cMsg').textContent = msg + (best && G.money > 0 && b.m ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>รายได้ <b>฿${th(G.money)}</b></span><span>ส่งสำเร็จ <b>${th(G.served)}</b></span><span>ลูกค้ารอไม่ไหว <b>${th(G.failed)}</b></span><span>ชน <b>${th(G.crashes)}</b> ครั้ง</span>`;
  const last = RS.li >= RLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'เส้นทางถัดไป';
  $('#bNext').hidden = guest || last || !rOpen(RS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'ขับเส้นนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function rFloat(text, x, y, col) { RS.floats.push({ text, x, y, col, life: 1.6 }); }
function rFx(kind, G) {
  const c = G.car, sx = c.x, sy = c.y;
  if (kind === 'crash') { sfx.crash(); S.shake = 0.6; rBurst(sx, sy, 10, '#d8d2e8', 140); }
  else if (kind === 'chicken') { sfx.cluck(); const p = G.lastChick || { x: sx, y: sy }; rBurst(p.x, p.y, 16, '#ffffff', 150); rFloat(`−฿${th(5)}`, p.x, p.y - 20, '#ff8a8a'); }
  else if (kind === 'train') { sfx.crash(); sfx.trainHorn(); S.shake = 1.2; S.flash = 0.6; rFloat(`−฿${th(10)}`, sx, sy - 30, '#ff8a8a'); }
  else if (kind === 'honk') sfx.honk();
  else if (kind === 'turbo') { sfx.turboS(); rBurst(sx - Math.cos(c.a) * 30, sy - Math.sin(c.a) * 30, 12, '#ffb347', 120); }
  else if (kind === 'pick') { sfx.pickup(); rFloat('รับของแล้ว', sx, sy - 34, C.gold); }
  else if (kind === 'drop') { sfx.cash(); rFloat(`+฿${th(G.lastPay || 0)}`, sx, sy - 34, C.gold); rBurst(sx, sy, 14, C.gold, 120); }
}
// particles live in world space for this mode
function rBurst(x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random() * .8); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .6, max: .6, col, s: 4, type: 'dot', g: 0 }); } }
function rEvents(ev) {
  const G = RS.G, seen = new Set();
  for (const e of ev) {
    const [k] = e.split(':');
    if (seen.has(k)) continue; seen.add(k);
    if (['crash', 'chicken', 'train', 'honk', 'turbo', 'pick', 'drop'].includes(k)) rFx(k, G);
    else if (k === 'order') sfx.order();
    else if (k === 'expire') { sfx.expire(); rFloat(`−฿${th(10)}`, G.car.x, G.car.y - 40, '#ff8a8a'); }
  }
}
function rGuestDiff() {
  const G = RS.G, n = rSnap(G), p = RS.prev || n;
  for (const k of ['crash', 'chicken', 'train', 'honk', 'turbo', 'pick', 'drop']) {
    const key = k === 'chicken' ? 'chick' : k;
    if ((n[key] | 0) > (p[key] | 0)) rFx(k, G);
  }
  if (n.ids !== p.ids && n.orders > p.orders) sfx.order();
  RS.prev = n;
}
function rInputs(G) {
  // returns { steer, pedal, horn, turbo } built from whoever holds each half of the truck
  const R = RS.roles, out = { steer: 0, pedal: 0, horn: false, turbo: false };
  const take = (id, inp) => {
    if (roleOf(id) === 'steer') { out.steer = inp.mx; out.horn = out.horn || inp.act; }
    else { out.pedal = -inp.my; out.turbo = out.turbo || inp.act; }
  };
  if (!O.role) { take('pink', kInput('pink')); take('mint', kInput('mint')); return out; }
  const li = kInput(O.local);
  if (li.act) RS.act.n++;
  RS.lastInp = li;
  take(O.local, li);
  const rid = O.local === 'pink' ? 'mint' : 'pink';
  if (O.role === 'host') { const r = RS.remote; take(rid, { mx: r.s, my: -r.p, act: r.act }); r.act = false; }
  else { const c = G.car; if (roleOf(rid) === 'steer') out.steer = c.hostS || 0; else out.pedal = c.hostP || 0; }
  return out;
}
function rTick() {
  const G = RS.G, inp = rInputs(G);
  if (O.role === 'guest') {
    G.t += Drv.DT; G.left = Math.max(0, G.left - Drv.DT);
    G.car.inS = inp.steer; G.car.inP = inp.pedal;
    if (!G.over) Drv.stepCar(G, inp.steer, inp.pedal, Drv.DT);
    Drv.smooth(G);
    rGuestDiff();
  } else {
    const ev = Drv.step(G, inp);
    rEvents(ev);
  }
  if (G.over && !RS.endT) { RS.endT = 1.6; sfx.whistle(); rSave(); }
}
function drvFrame(dt, now) {
  const G = RS.G;
  if (S.mode === 'play' && G) {
    RS.acc += dt;
    while (RS.acc >= Drv.DT) { rTick(); RS.acc -= Drv.DT; if (S.mode !== 'play') { RS.acc = 0; break; } }
    if (RS.endT > 0) { RS.endT -= dt; if (RS.endT <= 0) { RS.endT = -1; rResults(); if (O.role === 'host') O.st = 'clear'; } }
    // crossing bell
    RS.bellT -= dt;
    if (G.trains.length && RS.bellT <= 0 && G.trains.some(tr => { for (let y = 0; y < G.H; y++) if (G.tiles[y][tr.col] === '=' && Drv.gateClosed(G, y, G.t) && Math.hypot((tr.col + .5) * RK - G.car.x, (y + .5) * RK - G.car.y) < 9 * RK) return true; return false; })) { sfx.xbell(); RS.bellT = 0.5; }
    // tyre smoke when sliding
    const c = G.car, d = { x: Math.cos(c.a), y: Math.sin(c.a) }, lat = Math.abs(-c.vx * d.y + c.vy * d.x);
    RS.puffT -= dt;
    if (lat > 1.4 * RK && RS.puffT <= 0) { RS.puffT = 0.05; S.parts.push({ x: c.x - d.x * 20, y: c.y - d.y * 20, vx: 0, vy: 0, life: .5, max: .5, col: 'rgba(220,220,230,.6)', s: 7, type: 'dot', g: 0 }); }
    engine(!G.over, Math.hypot(c.vx, c.vy) / RK);
  } else { RS.acc = 0; engine(false, 0); }
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const f of RS.floats) { f.life -= dt; f.y -= dt * 30; }
  RS.floats = RS.floats.filter(f => f.life > 0);
  if (G) rHud();
  renderDrive(dt);
}

/* ---------- drawing ---------- */
const drvBg = document.createElement('canvas'), drvMini = document.createElement('canvas');
const ROOF = ['#b85c4a', '#c9824f', '#7f8fa6', '#a3707a', '#6f9a84', '#c8a25a', '#8b6fa8'];
function isRoad(c) { return c === '.' || c === 'S' || c === 'p' || /[A-Fa-f]/.test(c); }
function buildDrvBg() {
  const G = RS.G;
  if (!G) return;
  const s = scale * RZ, W = G.W, H = G.H;
  drvBg.width = Math.ceil(W * RK * s); drvBg.height = Math.ceil(H * RK * s);
  const g = drvBg.getContext('2d');
  g.setTransform(s, 0, 0, s, 0, 0);
  const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : G.tiles[y][x]);
  // building blocks get one roof colour each
  const blk = []; let nb = 0;
  for (let y = 0; y < H; y++) { blk.push(new Array(W).fill(-1)); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (T(x, y) !== '#' || blk[y][x] >= 0) continue;
    const st = [[x, y]]; blk[y][x] = nb;
    while (st.length) { const [cx, cy] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (T(nx, ny) === '#' && nx >= 0 && ny >= 0 && nx < W && ny < H && blk[ny][nx] < 0) { blk[ny][nx] = nb; st.push([nx, ny]); } } }
    nb++;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = T(x, y), px = x * RK, py = y * RK;
    if (isRoad(c) || c === '=') {
      g.fillStyle = G.rain ? '#2f3140' : '#3b3c4b'; g.fillRect(px, py, RK, RK);
      if (c === 'p') { g.fillStyle = 'rgba(110,160,220,.55)'; g.beginPath(); g.ellipse(px + 32, py + 34, 24, 15, 0.3, 0, Math.PI * 2); g.fill(); }
    } else if (c === ' ' || c === 't' || c === 'k') {
      g.fillStyle = c === 'k' ? '#8f7d43' : '#3f7a46'; g.fillRect(px, py, RK, RK);
      const r = rng(hash(x, y)); g.fillStyle = c === 'k' ? 'rgba(240,210,120,.35)' : 'rgba(150,220,140,.25)';
      for (let k = 0; k < 5; k++) g.fillRect(px + r() * RK, py + r() * RK, 3, 6);
    } else if (c === '~') { g.fillStyle = '#25617f'; g.fillRect(px, py, RK, RK); }
    else if (c === '#') {
      g.fillStyle = '#9b97aa'; g.fillRect(px, py, RK, RK);
      const col = ROOF[blk[y][x] % ROOF.length];
      const inset = (dx, dy) => (T(x + dx, y + dy) === '#' ? 0 : 7);
      const l = inset(-1, 0), r2 = inset(1, 0), t2 = inset(0, -1), b2 = inset(0, 1);
      g.fillStyle = col; g.fillRect(px + l, py + t2, RK - l - r2, RK - t2 - b2);
      g.fillStyle = 'rgba(0,0,0,.12)'; if (!b2) {} else g.fillRect(px + l, py + RK - b2 - 6, RK - l - r2, 6);
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + RK / 2, py + t2 + 4); g.lineTo(px + RK / 2, py + RK - b2 - 4); g.stroke();
    }
    if (c === '=') {
      const roadSide = isRoad(T(x - 1, y)) || isRoad(T(x + 1, y));
      if (!roadSide) { g.fillStyle = '#6b6258'; g.fillRect(px, py, RK, RK); }
      g.fillStyle = '#4a3624'; for (let k = 4; k < RK; k += 12) g.fillRect(px + 12, py + k, RK - 24, 5);
      g.fillStyle = '#c8c8d2'; g.fillRect(px + 18, py, 4, RK); g.fillRect(px + RK - 22, py, 4, RK);
    }
    if (c === 't') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 36, py + 40, 26, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2b6a3c'; g.beginPath(); g.arc(px + 32, py + 30, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a8a4c'; g.beginPath(); g.arc(px + 26, py + 24, 14, 0, Math.PI * 2); g.fill();
    }
  }
  // lane lines on two-lane roads
  g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = 3; g.setLineDash([14, 12]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isRoad(T(x, y))) continue;
    if (isRoad(T(x, y + 1)) && !isRoad(T(x, y - 1)) && !isRoad(T(x, y + 2)) && T(x, y) !== '=') { g.beginPath(); g.moveTo(x * RK, (y + 1) * RK); g.lineTo((x + 1) * RK, (y + 1) * RK); g.stroke(); }
    if (isRoad(T(x + 1, y)) && !isRoad(T(x - 1, y)) && !isRoad(T(x + 2, y))) { g.beginPath(); g.moveTo((x + 1) * RK, y * RK); g.lineTo((x + 1) * RK, (y + 1) * RK); g.stroke(); }
  }
  g.setLineDash([]);
  // bays, awnings and names
  for (const sp of G.spots) {
    const px = sp.tx * RK, py = sp.ty * RK;
    g.strokeStyle = sp.shop ? '#ffb347' : '#7fe3d0'; g.lineWidth = 3; g.setLineDash([8, 6]); rr(g, px + 5, py + 5, RK - 10, RK - 10, 6); g.stroke(); g.setLineDash([]);
    let bx = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (T(sp.tx + dx, sp.ty + dy) === '#') { bx = { x: sp.tx + dx, y: sp.ty + dy, dx, dy }; break; }
    if (!bx) continue;
    const ax = bx.x * RK, ay = bx.y * RK;
    if (sp.shop) { for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff4dc' : '#e2483d'; g.fillRect(ax + 4 + k * 14, ay + 4, 14, 16); } }
    else { g.fillStyle = '#fff4dc'; g.beginPath(); g.moveTo(ax + 16, ay + 30); g.lineTo(ax + 32, ay + 14); g.lineTo(ax + 48, ay + 30); g.closePath(); g.fill(); g.fillRect(ax + 20, ay + 30, 24, 18); g.fillStyle = '#5a4030'; g.fillRect(ax + 28, ay + 36, 8, 12); }
    g.font = `600 15px ${FONT}`; const tw = g.measureText(sp.name).width + 12, lx = ax + RK / 2, ly = ay + (bx.dy > 0 ? RK - 8 : bx.dy < 0 ? 26 : RK / 2 + 8);
    rr(g, lx - tw / 2, ly - 15, tw, 21, 8); g.fillStyle = 'rgba(21,18,43,.82)'; g.fill();
    g.fillStyle = sp.shop ? '#ffcf8a' : '#bff3e8'; g.textAlign = 'center'; g.fillText(sp.name, lx, ly);
  }
  // minimap
  const m = 4; drvMini.width = W * m * scale; drvMini.height = H * m * scale;
  const mg = drvMini.getContext('2d'); mg.setTransform(scale, 0, 0, scale, 0, 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = T(x, y);
    mg.fillStyle = isRoad(c) ? '#9a98ad' : c === '=' ? '#b38a5c' : c === '#' ? '#3a3350' : c === '~' ? '#25617f' : '#2f5a3a';
    mg.fillRect(x * m, y * m, m, m);
  }
}
function rDrawCarShape(g, x, y, a, body, roof, w = 0.5, l = 0.86) {
  g.save(); g.translate(x, y); g.rotate(a);
  const L = l * RK, Wd = w * RK;
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -L / 2 + 3, -Wd / 2 + 4, L, Wd, 9); g.fill();
  g.fillStyle = body; rr(g, -L / 2, -Wd / 2, L, Wd, 9); g.fill();
  g.fillStyle = roof; rr(g, -L * 0.12, -Wd * 0.38, L * 0.34, Wd * 0.76, 6); g.fill();
  g.fillStyle = 'rgba(180,220,255,.85)'; g.fillRect(L * 0.2, -Wd * 0.34, 4, Wd * 0.68);
  g.fillStyle = '#fff7c2'; g.fillRect(L / 2 - 4, -Wd / 2 + 3, 4, 6); g.fillRect(L / 2 - 4, Wd / 2 - 9, 4, 6);
  g.restore();
}
function rDrawTruck(g, G, time) {
  const c = G.car;
  g.save(); g.translate(c.x, c.y); g.rotate(c.a);
  const L = 0.9 * RK, Wd = 0.52 * RK;
  if (c.turboT > 0) { for (let k = 0; k < 2; k++) { g.fillStyle = k ? '#ffe08a' : '#ff7a2f'; g.beginPath(); g.moveTo(-L / 2, -6 + k * 2); g.lineTo(-L / 2 - 18 - Math.random() * 10 + k * 8, 0); g.lineTo(-L / 2, 6 - k * 2); g.fill(); } }
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -L / 2 + 4, -Wd / 2 + 5, L, Wd, 8); g.fill();
  // wheels turn with the steering
  g.fillStyle = '#1a1a22';
  for (const [wx, wy, steer] of [[L * 0.28, -Wd / 2, 1], [L * 0.28, Wd / 2, 1], [-L * 0.3, -Wd / 2, 0], [-L * 0.3, Wd / 2, 0]]) { g.save(); g.translate(wx, wy); g.rotate(steer ? c.steer * 0.5 : 0); g.fillRect(-7, -3, 14, 6); g.restore(); }
  g.fillStyle = '#f2b632'; rr(g, -L / 2, -Wd / 2, L, Wd, 8); g.fill();
  g.fillStyle = '#c98f1c'; g.fillRect(-L / 2 + 4, -Wd / 2 + 4, L * 0.5, Wd - 8);
  // parcels in the bed
  G.carried.forEach((id, i) => { const o = G.orders.find(q => q.id === id); g.fillStyle = o ? ocol(o) : '#d9a05b'; g.fillRect(-L / 2 + 7 + i * 13, -Wd / 2 + 7, 11, Wd - 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-L / 2 + 7 + i * 13, -1, 11, 2); });
  // cab with both of us inside
  g.fillStyle = '#fff3c4'; rr(g, L * 0.06, -Wd / 2 + 3, L * 0.36, Wd - 6, 6); g.fill();
  g.fillStyle = 'rgba(160,210,255,.9)'; g.fillRect(L * 0.36, -Wd / 2 + 5, 5, Wd - 10);
  const seats = [[RS.roles.steer, -1], [RS.roles.pedal, 1]];
  for (const [id, side] of seats) { g.fillStyle = id === 'pink' ? C.pink : C.mint; g.beginPath(); g.arc(L * 0.22, side * Wd * 0.2, 6.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff7c2'; g.fillRect(L / 2 - 3, -Wd / 2 + 3, 3, 6); g.fillRect(L / 2 - 3, Wd / 2 - 9, 3, 6);
  g.restore();
  if (c.honkT > 0) { g.font = `600 13px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText('ปี๊นๆ', c.x, c.y - 30); g.fillStyle = C.gold; g.fillText('ปี๊นๆ', c.x, c.y - 30); }
  if (c.stun > 0) for (let i = 0; i < 3; i++) { const a = time * 7 + i * 2.1; g.fillStyle = C.gold; g.beginPath(); g.arc(c.x + Math.cos(a) * 22, c.y - 26 + Math.sin(a) * 6, 3, 0, Math.PI * 2); g.fill(); }
}
function rDrawChicken(g, q, time) {
  if (q.st === 'gone') return;
  const flap = q.st === 'flee' ? Math.sin(time * 40) * 4 : 0;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(q.x, q.y + 7, 8, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(q.x, q.y, 9, 7, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(q.x - 6, q.y - 2 - flap * 0.3, 5, 3 + Math.abs(flap) * 0.4, -0.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e2483d'; g.beginPath(); g.arc(q.x + 6, q.y - 6, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(q.x + 9, q.y - 3); g.lineTo(q.x + 14, q.y - 2); g.lineTo(q.x + 9, q.y); g.fill();
  g.fillStyle = '#1a1530'; g.beginPath(); g.arc(q.x + 7, q.y - 3, 1.3, 0, Math.PI * 2); g.fill();
}
function rDrawTrain(g, G, tr, time) {
  const r = Drv.trainRect(G, tr, G.t);
  if (!r) return;
  const n = Math.round(tr.len), seg = r.h / n;
  for (let i = 0; i < n; i++) {
    const y = r.y + i * seg, head = tr.dir > 0 ? i === n - 1 : i === 0;
    g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, r.x + 4, y + 5, r.w, seg - 4, 8); g.fill();
    g.fillStyle = head ? '#c4302b' : '#f1e3c4'; rr(g, r.x, y + 2, r.w, seg - 4, 8); g.fill();
    g.fillStyle = head ? '#f1e3c4' : '#c4302b'; g.fillRect(r.x + r.w / 2 - 4, y + 6, 8, seg - 12);
    g.fillStyle = 'rgba(150,200,240,.8)'; for (let k = 10; k < seg - 10; k += 14) { g.fillRect(r.x + 5, y + k, 6, 8); g.fillRect(r.x + r.w - 11, y + k, 6, 8); }
  }
}
function rDrawCrossings(g, G, time) {
  for (const tr of G.trains) {
    for (let y = 0; y < G.H; y++) {
      if (G.tiles[y][tr.col] !== '=' || !(isRoad(G.tiles[y][tr.col - 1] || '#') || isRoad(G.tiles[y][tr.col + 1] || '#'))) continue;
      const closed = Drv.gateClosed(G, y, G.t), blink = closed && Math.sin(time * 14) > 0;
      for (const side of [-1, 1]) {
        const bx = (tr.col + (side < 0 ? 0 : 1)) * RK + side * 6, by = (y + 0.5) * RK;
        g.fillStyle = '#33303f'; g.beginPath(); g.arc(bx, by - 26 * side, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = blink ? '#ff3b3b' : '#5a2a2a'; g.beginPath(); g.arc(bx, by - 26 * side, 3.5, 0, Math.PI * 2); g.fill();
        g.save(); g.translate(bx, by - 26 * side); g.rotate(closed ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : 0);
        for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff' : '#e2483d'; g.fillRect(-2, side * (4 + k * 12), 4, side * 12); }
        g.restore();
      }
    }
  }
}
function rDrawRain(g, time) {
  g.strokeStyle = 'rgba(190,210,255,.35)'; g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < 90; i++) { const x = ((i * 97 + time * 600) % (RVW + 100)) - 50, y = RY0 + ((i * 53 + time * 900) % RVH); g.moveTo(x, y); g.lineTo(x - 6, y + 14); }
  g.stroke();
  g.fillStyle = 'rgba(10,12,40,.18)'; g.fillRect(0, RY0, RVW, RVH);
}
function rDrawHud(g, G, time) {
  const shop = k => G.spots.find(s => s.key === k), w = 196;
  G.orders.slice(0, 3).forEach((o, i) => {
    const x = 8 + i * (w + 8), y = 12, h = 74, f = Math.max(0, o.left / o.max), col = ocol(o), inCar = o.st === 'car';
    rr(g, x, y, w, h, 8); g.fillStyle = '#fff8e6'; g.fill();
    g.fillStyle = col; rr(g, x, y, 8, h, 4); g.fill();
    g.lineWidth = 2; g.strokeStyle = f < 0.25 && Math.sin(time * 12) > 0 ? '#ff4d4d' : '#e8d3a8'; rr(g, x, y, w, h, 8); g.stroke();
    g.textAlign = 'left'; g.font = `600 13px ${FONT}`; g.fillStyle = '#3a2418';
    const s = shop(o.from), hs = shop(o.to);
    g.fillText(inCar ? `ส่ง ${hs ? hs.name : o.to}` : `รับที่ ${s ? s.name : o.from}`, x + 16, y + 20);
    g.font = `400 11px ${FONT}`; g.fillStyle = '#7a6a5a';
    g.fillText(inCar ? `${Drv.KIND[o.kind].name} · สภาพ ${th(Math.round(o.cond * 100))}%` : `${Drv.KIND[o.kind].name} → ${hs ? hs.name : o.to}`, x + 16, y + 38);
    g.textAlign = 'right'; g.font = `600 12px ${FONT}`; g.fillStyle = '#9a6a2a'; g.fillText('฿' + th(o.price), x + w - 10, y + 20);
    if (inCar) { g.fillStyle = col; g.font = `600 11px ${FONT}`; g.fillText('บนรถ', x + w - 10, y + 38); }
    const bc = f > 0.5 ? '#5fd36a' : f > 0.25 ? '#ffb347' : '#ff4d4d';
    g.fillStyle = '#e8d9bb'; rr(g, x + 16, y + h - 18, w - 28, 7, 3.5); g.fill();
    g.fillStyle = bc; rr(g, x + 16, y + h - 18, (w - 28) * f, 7, 3.5); g.fill();
  });
  const rx = VW - 12;
  g.textAlign = 'right';
  g.font = `400 13px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText('เวลา', rx, 30);
  const low = G.left < 20 && Math.sin(time * 8) > 0;
  g.font = `400 26px ${FONT_D}`; g.fillStyle = low ? '#ff6b6b' : C.paper; g.fillText(th(fmt(Math.ceil(G.left))), rx, 58);
  g.font = `400 13px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText('รายได้', rx - 92, 30);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.gold; g.fillText('฿' + th(G.money), rx - 92, 58);
  const st = Drv.stars(G), lv = RLEVELS[RS.li];
  g.font = `400 14px ${FONT}`; g.fillStyle = C.gold; g.fillText([0, 1, 2].map(i => (i < st ? '★' : '☆')).join(''), rx - 92, 80);
  if (st < 3) { g.font = `400 10px ${FONT}`; g.fillStyle = '#b3a8d9'; g.fillText(`ดาวถัดไป ฿${th(lv.stars[st])}`, rx, 80); }
}
function rDrawControls(g, G, time) {
  // who holds what, and what they are doing right now
  const c = G.car, n = S.names, R = RS.roles, y = VH - 34;
  const pill = (x, w, col) => { rr(g, x, y, w, 26, 13); g.fillStyle = 'rgba(21,18,43,.82)'; g.fill(); g.strokeStyle = hexA(col, .7); g.lineWidth = 1.5; g.stroke(); };
  const cs = R.steer === 'pink' ? C.pink : C.mint, cp = R.pedal === 'pink' ? C.pink : C.mint;
  pill(10, 170, cs);
  g.save(); g.translate(30, y + 13); g.rotate(c.steer * 1.2);
  g.strokeStyle = cs; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.moveTo(0, 0); g.lineTo(0, 8); g.stroke();
  g.restore();
  g.font = `600 12px ${FONT}`; g.textAlign = 'left'; g.fillStyle = cs; g.fillText(`${n[R.steer]} · พวงมาลัย`, 46, y + 18);
  pill(188, 186, cp);
  const pv = c.inP != null ? c.inP : 0;
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(200, y + 6, 8, 14);
  g.fillStyle = pv >= 0 ? '#5fd36a' : '#ff6b6b'; const ph = Math.abs(pv) * 7; g.fillRect(200, pv >= 0 ? y + 13 - ph : y + 13, 8, ph);
  g.fillStyle = cp; g.fillText(`${n[R.pedal]} · คันเร่ง`, 216, y + 18);
  for (let i = 0; i < Drv.TURBO_MAX; i++) { g.fillStyle = i < c.turbo ? '#ffb347' : 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(330 + i * 13, y + 7); g.lineTo(337 + i * 13, y + 13); g.lineTo(330 + i * 13, y + 19); g.closePath(); g.fill(); }
}
function rTargets(G) {
  const out = [];
  for (const o of G.orders) {
    const sp = G.spots.find(s => s.key === (o.st === 'car' ? o.to : o.from));
    if (sp && (o.st === 'car' || G.carried.length < Drv.CAP)) out.push({ sp, col: ocol(o), drop: o.st === 'car' });
  }
  return out;
}
function renderDrive(dt) {
  const g = ctx, G = RS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  const c = G.car, time = S.time;
  // camera leads the truck a little
  const tx = c.x + c.vx * 0.35, ty = c.y + c.vy * 0.35, k = Math.min(1, (dt || 0.016) * 4);
  RS.cam.x += (tx - RS.cam.x) * k; RS.cam.y += (ty - RS.cam.y) * k;
  const hw = RVW / 2 / RZ, hh = RVH / 2 / RZ;
  RS.cam.x = Math.max(hw, Math.min(G.W * RK - hw, RS.cam.x)); RS.cam.y = Math.max(hh, Math.min(G.H * RK - hh, RS.cam.y));
  let ox = 0, oy = 0;
  if (S.shake > 0) { ox = (Math.random() - .5) * 8 * S.shake; oy = (Math.random() - .5) * 8 * S.shake; }
  g.fillStyle = '#15122b'; g.fillRect(0, 0, cv.width, cv.height);
  const sx = (RS.cam.x - hw) * RZ * scale, sy = (RS.cam.y - hh) * RZ * scale;
  g.drawImage(drvBg, sx - ox * scale, sy - oy * scale, RVW * scale, RVH * scale, 0, RY0 * scale, RVW * scale, RVH * scale);
  g.save();
  g.beginPath(); g.rect(0, RY0 * scale, RVW * scale, RVH * scale); g.clip();
  g.setTransform(scale * RZ, 0, 0, scale * RZ, (RVW / 2 - RS.cam.x * RZ + ox) * scale, (RY0 + RVH / 2 - RS.cam.y * RZ + oy) * scale);
  // bays that matter now
  for (const t of rTargets(G)) {
    const pulse = 0.5 + Math.sin(time * 6) * 0.5;
    g.strokeStyle = hexA(t.col, 0.5 + pulse * 0.5); g.lineWidth = 5; rr(g, t.sp.tx * RK + 2, t.sp.ty * RK + 2, RK - 4, RK - 4, 10); g.stroke();
    g.fillStyle = t.col; g.beginPath(); const by = t.sp.y - 46 - pulse * 6; g.moveTo(t.sp.x - 9, by); g.lineTo(t.sp.x + 9, by); g.lineTo(t.sp.x, by + 12); g.closePath(); g.fill();
  }
  if (G.stopT > 0 && G.bay >= 0 && G.spots[G.bay]) {
    const sp = G.spots[G.bay];
    g.strokeStyle = 'rgba(21,18,43,.7)'; g.lineWidth = 7; g.beginPath(); g.arc(sp.x, sp.y, 30, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 5; g.beginPath(); g.arc(sp.x, sp.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, G.stopT / 0.45)); g.stroke();
  }
  rDrawCrossings(g, G, time);
  for (const q of G.chickens) rDrawChicken(g, q, time);
  const TRC = ['#5b8def', '#e86a5a', '#8ad06a', '#e8c25a', '#b57be0', '#57c3c3', '#f08cc0', '#ffffff'];
  for (const o of G.traffic) {
    rDrawCarShape(g, o.x, o.y, o.a, TRC[o.col % TRC.length], 'rgba(0,0,0,.25)');
    if (o.honk > 0) { g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('ปี๊น!', o.x, o.y - 26); }
  }
  rDrawTruck(g, G, time);
  for (const tr of G.trains) rDrawTrain(g, G, tr, time);
  drawParts(g);
  for (const f of RS.floats) {
    g.globalAlpha = Math.min(1, f.life * 1.5); g.font = `400 26px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(21,18,43,.85)';
    g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y);
  }
  g.globalAlpha = 1;
  g.restore();
  g.setTransform(scale, 0, 0, scale, 0, 0);
  if (G.rain) rDrawRain(g, time);
  // arrows to targets off screen
  for (const t of rTargets(G)) {
    const px = (t.sp.x - RS.cam.x) * RZ + RVW / 2, py = (t.sp.y - RS.cam.y) * RZ + RY0 + RVH / 2;
    if (px > 30 && px < RVW - 30 && py > RY0 + 30 && py < VH - 30) continue;
    const cx = RVW / 2, cy = RY0 + RVH / 2, a = Math.atan2(py - cy, px - cx);
    const ex = Math.max(28, Math.min(RVW - 28, cx + Math.cos(a) * 1000)), ey = Math.max(RY0 + 28, Math.min(VH - 28, cy + Math.sin(a) * 1000));
    const s2 = Math.min((RVW / 2 - 28) / Math.abs(Math.cos(a) || 1e-6), (RVH / 2 - 28) / Math.abs(Math.sin(a) || 1e-6));
    const ax = cx + Math.cos(a) * s2, ay = cy + Math.sin(a) * s2;
    g.save(); g.translate(ax, ay); g.rotate(a);
    g.fillStyle = 'rgba(21,18,43,.85)'; g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = t.col; g.beginPath(); g.moveTo(12, 0); g.lineTo(-7, -9); g.lineTo(-3, 0); g.lineTo(-7, 9); g.closePath(); g.fill();
    g.restore();
    g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(t.drop ? 'ส่ง' : 'รับ', ax, ay + 30 > VH - 4 ? ay - 22 : ay + 30);
    void ex; void ey;
  }
  // minimap
  const mw = G.W * 4, mh = G.H * 4, mx = RVW - mw - 10, my = VH - mh - 10;
  g.globalAlpha = 0.9; rr(g, mx - 4, my - 4, mw + 8, mh + 8, 6); g.fillStyle = 'rgba(21,18,43,.85)'; g.fill();
  g.drawImage(drvMini, mx, my, mw, mh); g.globalAlpha = 1;
  for (const t of rTargets(G)) { g.fillStyle = t.col; g.fillRect(mx + t.sp.tx * 4 - 1, my + t.sp.ty * 4 - 1, 6, 6); }
  for (const tr of G.trains) { const r = Drv.trainRect(G, tr, G.t); if (r) { g.fillStyle = '#ff5a4a'; g.fillRect(mx + r.x / RK * 4, my + Math.max(0, r.y / RK * 4), Math.max(2, r.w / RK * 4), Math.min(mh, r.h / RK * 4)); } }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(mx + c.x / RK * 4, my + c.y / RK * 4, 3.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(mx + (RS.cam.x - hw) / RK * 4, my + (RS.cam.y - hh) / RK * 4, RVW / RZ / RK * 4, RVH / RZ / RK * 4);
  rDrawControls(g, G, time);
  // top band
  const band = g.createLinearGradient(0, 0, 0, RY0);
  band.addColorStop(0, '#120f26'); band.addColorStop(1, '#231a40');
  g.fillStyle = band; g.fillRect(0, 0, VW, RY0);
  rDrawHud(g, G, time);
  drawBanner(g);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
  if (S.flash > 0) { g.fillStyle = `rgba(255,80,110,${S.flash * .25})`; g.fillRect(0, 0, VW, VH); }
}

/* ---------- title list ---------- */
function renderDrvLevels() {
  let total = 0;
  $('#rlevels').innerHTML = RLEVELS.map((lv, i) => {
    const b = rBest(i), open = rOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ฿${th(b.m)}` : open ? 'ยังไม่เคยขับ' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-r="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#rStarsAll').textContent = `ดาวรวม ${th(total)}/${th(RLEVELS.length * 3)}`;
  let next = RLEVELS.findIndex((l, i) => rOpen(i) && !(rBest(i) && rBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.r = next;
  if (S.tab === 'drv') $('#bGo').textContent = rBest(next) ? `ขับ${ROUTE(next)}` : 'ออกรถ';
  setDrvPadLabels();
}
$('#rlevels').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b && !b.disabled) startDrive(+b.dataset.r); });

/* ---------- online ---------- */
function onlineStartDrv(i) {
  if (O.role !== 'host') return;
  O.md = 'r'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsR').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b && !b.disabled) onlineStartDrv(+b.dataset.r); });
function renderOnlineDrv() {
  $('#oLevelsR').innerHTML = RLEVELS.map((lv, i) => {
    const b = rBest(i), open = rOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-r="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยขับ' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function rEncodePlayer() { const li = RS.lastInp || {}; return { s: Math.round((li.mx || 0) * 100) / 100, p: Math.round(-(li.my || 0) * 100) / 100, ka: RS.act.n }; }
function rHostHears(pr) {
  if (!RS.G || pr.ep !== O.ep || !pr.p) return;
  const p = pr.p, R = RS.remote;
  R.s = Math.max(-1, Math.min(1, +p.s || 0)); R.p = Math.max(-1, Math.min(1, +p.p || 0));
  const ka = p.ka | 0;
  if (RS.seenKa < 0) RS.seenKa = ka;
  if (ka > RS.seenKa) { RS.seenKa = ka; R.act = true; }
}
function rGuestHears(pr) {
  const G = RS.G;
  if (!G || !pr.rw) return;
  const was = G.over;
  Drv.apply(G, pr.rw, true);
  if (typeof pr.rw.ro === 'string') {
    const r = pr.rw.ro === 'm' ? { steer: 'mint', pedal: 'pink' } : { steer: 'pink', pedal: 'mint' };
    if (r.steer !== RS.roles.steer) { RS.roles = r; setDrvPadLabels(); }
  }
  if (G.over && !was && !RS.endT && S.mode === 'play') { RS.endT = 1.6; sfx.whistle(); rSave(); }
}

/* ---------- Takraw mode (ตะกร้อลอดห่วง) ---------- */
const TS = { G: null, li: 0, acc: 0, floats: [], kick: { n: 0, req: null }, lastInp: {}, seenKa: -1, remote: { req: null, fresh: false }, endT: 0, savedB: null, prev: null, rimT: 0, myKickT: 0 };
const COURT = i => 'สนาม ' + th(i + 1);
const KICKNAME = { shot: 'ลูกยิง', back: 'ลูกส้นหลัง', head: 'ลูกโหม่ง', lucky: 'ลูกฟลุก' };
if (!prog.t) prog.t = {};
const tBest = i => prog.t[TLEVELS[i].name] || null;
const tOpen = i => i === 0 || !!(tBest(i - 1) && tBest(i - 1).s >= 1);
Object.assign(sfx, {
  tkick() { tone(170, .06, 'square', .06, 90); tone(900, .03, 'triangle', .03, 500); },
  tpass() { tone(230, .08, 'triangle', .07, 430); tone(160, .05, 'square', .03, 90); },
  tshot() { tone(190, .08, 'square', .07, 110); tone(700, .25, 'sawtooth', .025, 1500, .02); },
  thead() { tone(330, .08, 'sine', .07, 520); },
  trim() { tone(1250, .18, 'triangle', .04, 1180); tone(1880, .12, 'sine', .02); },
  tgoal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .16, 'triangle', .06, 0, i * .07)); tone(220, .5, 'sawtooth', .02, 330, .1); },
  tdrop() { tone(95, .2, 'sine', .09, 55); },
  tnope() { tone(200, .22, 'square', .04, 150); },
  tserve() { tone(1500, .08, 'sine', .04, 1800); },
  twhiff() { tone(520, .05, 'sine', .02, 300); }
});
function tKickSound(kind) { if (kind === 'pass') sfx.tpass(); else if (kind === 'shot' || kind === 'back') sfx.tshot(); else if (kind === 'whiff') sfx.twhiff(); else sfx.tkick(); }
// takraw buttons: move with left/right, jump with up or the jump button, kick with the action button
// a jump press is counted so that a tap shorter than one frame still jumps
function tInput(id) {
  const k = kInput(id), a = KK[id], t = KT[id];
  const jp = (a.jp || 0) > 0 || (t.jp || 0) > 0;
  if (a.jp > 0) a.jp--; if (t.jp > 0) t.jp--;
  return { mx: k.mx, my: k.use || jp ? -1 : k.my, act: k.act };
}
function tSetPad() {
  document.querySelectorAll('.kpad .kb.act').forEach(b => { b.innerHTML = 'เตะ'; });
  document.querySelectorAll('.kpad .kb.use').forEach(b => { b.innerHTML = 'กระ<br>โดด'; });
}

/* ---------- flow ---------- */
function tSnap(G) { return Object.assign({ score: G.score }, G.ev); }
function loadTak(i, net) {
  TS.li = i; TS.G = Tak.load(TLEVELS[i]); TS.G.net = net || null;
  TS.acc = 0; TS.floats = []; TS.kick = { n: TS.kick.n, req: null }; TS.seenKa = -1; TS.remote = { req: null, fresh: false };
  TS.endT = 0; TS.savedB = null; TS.prev = tSnap(TS.G); TS.lastInp = {}; TS.rimT = 0;
  S.kind = 'tak'; app.classList.add('tak'); app.classList.remove('kit', 'def', 'drv');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); tSetPad(); buildTakBg(); tHud(true);
}
function startTak(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadTak(i); showScreen(null); setMode('play');
}
function takRestart() { if (O.role) { onlineRestart(); return; } loadTak(TS.li); showScreen(null); setMode('play'); }
function takNext() {
  if (O.role === 'host') { if (TS.li < TLEVELS.length - 1) onlineStartTak(TS.li + 1); return; }
  if (TS.li < TLEVELS.length - 1 && tOpen(TS.li + 1)) startTak(TS.li + 1); else toTitle();
}
let tHudKey = '';
function tHud(force) {
  const k = String(TS.li);
  if (!force && k === tHudKey) return;
  tHudKey = k;
  const lv = TLEVELS[TS.li];
  $('#hNo').textContent = COURT(TS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function tSave() {
  if (TS.savedB) return TS.savedB;
  const G = TS.G, lv = TLEVELS[TS.li], st = Tak.stars(G);
  const b = prog.t[lv.name] || { s: 0, m: 0 };
  prog.t[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, G.score) };
  store.set('prog2', prog);
  return (TS.savedB = b);
}
function tResults() {
  const G = TS.G, lv = TLEVELS[TS.li], st = Tak.stars(G);
  const b = tSave();
  const best = G.score > b.m;
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${COURT(TS.li)} · หมดเวลา`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = st === 3 ? 'ส่งกันเข้าขาสุดๆ ห่วงแทบไม่ว่างเลย' : st === 2 ? 'เล่นเข้าขากันดี ลองส่งกันหลายทอดก่อนยิง แต้มจะคูณเพิ่ม' : st === 1 ? 'ผ่านแล้ว สนามถัดไปเปิดให้เล่นแล้ว' : `ยังไม่ถึงดาวแรก ต้องได้ ${th(lv.stars[0])} แต้ม ลองให้คนหนึ่งส่ง อีกคนกระโดดยิง`;
  $('#cMsg').textContent = msg + (best && G.score > 0 && b.m ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>แต้ม <b>${th(G.score)}</b></span><span>ลูกเข้าห่วง <b>${th(G.ev.goals)}</b></span><span>ลูกดีสุด <b>${th(G.ev.best)}</b> แต้ม</span><span>ลูกตก <b>${th(G.ev.drops)}</b> ครั้ง</span>`;
  const last = TS.li >= TLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'สนามถัดไป';
  $('#bNext').hidden = guest || last || !tOpen(TS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'เล่นสนามนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function tFloat(text, x, y, col, size = 16, life = 1.6) { TS.floats.push({ text, x, y, col, life, max: life, size }); }
function tBurst(x, y, n, cols, sp, life = .7) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random() * .8); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, life, max: life, col: cols[i % cols.length], s: 3 + Math.random() * 3, type: 'dot', g: 400 }); } }
function tGoalFx(G, l) {
  sfx.tgoal();
  const mult = 1 + Tak.MULT_STEP * Math.min(l.passes, Tak.MULT_MAX);
  tFloat(`+${th(l.pts)}`, l.x, l.y - 46, C.gold, 30, 1.8);
  tFloat(`${KICKNAME[l.kind] || 'ลูกยิง'}${l.passes > 1 ? ` · ส่ง ${th(l.passes)} ทอด ×${th(mult)}` : ''}`, l.x, l.y - 18, C.paper, 14, 1.8);
  tBurst(l.x, l.y + 20, 26, [C.gold, C.pink, C.mint, '#fff'], 220, .9);
}
function tEvents(ev) {
  const G = TS.G;
  for (const e of ev) {
    const [k, a, b, c] = e.split(':');
    if (k === 'kick') { tKickSound(b); tBurst(G.ball.x, G.ball.y, 5, ['#f5e2b0'], 70, .3); }
    else if (k === 'head') sfx.thead();
    else if (k === 'rim') { if (TS.rimT <= 0) { sfx.trim(); TS.rimT = .12; } }
    else if (k === 'goal') tGoalFx(G, G.last);
    else if (k === 'nopass') { sfx.tnope(); const h = Tak.litHoop(G); tFloat('ยังไม่ผ่านเท้าเพื่อน ไม่นับแต้ม', h.cx, h.y - 30, '#ff9a9a', 14); }
    else if (k === 'dark') { sfx.tnope(); const h = G.hoops.find(q => !q.lit) || G.hoops[0]; tFloat('ห่วงไฟดับ ไม่นับแต้ม', h.cx, h.y - 30, '#ff9a9a', 14); }
    else if (k === 'drop') { sfx.tdrop(); const x = G.ball.dropX || G.ball.x; tFloat('ลูกตก', x, Tak.GROUND - 34, '#ffb0a0', 15); tBurst(x, Tak.GROUND, 10, ['#c9a77a', '#e0c79a'], 90, .5); S.shake = .25; }
    else if (k === 'serve') sfx.tserve();
    else if (k === 'jump') sfx.jump(a);
    void c;
  }
}
// guest: effects from the host's counters
function tGuestDiff() {
  const G = TS.G, n = tSnap(G), p = TS.prev || n;
  if (n.goals > p.goals && G.last) tGoalFx(G, G.last);
  if (n.drops > p.drops) tEvents(['drop']);
  if (n.nopass > p.nopass) tEvents(['nopass']);
  if (n.dark > p.dark) tEvents(['dark']);
  if (n.rims > p.rims) tEvents(['rim']);
  if (n.heads > p.heads) sfx.thead();
  if (n.kicks > p.kicks && TS.myKickT <= 0) sfx.tkick();
  TS.prev = n;
}
function tTick(now) {
  const G = TS.G;
  TS.rimT -= Tak.DT; TS.myKickT -= Tak.DT;
  if (!O.role) {
    tEvents(Tak.step(G, { pink: tInput('pink'), mint: tInput('mint') }));
  } else if (O.role === 'host') {
    const li = tInput(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    TS.lastInp = li;
    Tak.smoothPlayer(G, rid, now);
    const ev = Tak.step(G, { [O.local]: li });
    if (TS.remote.fresh) { TS.remote.fresh = false; Tak.remoteKick(G, rid, TS.remote.req, ev); }
    tEvents(ev);
  } else {
    const me = G[O.local], hid = O.local === 'pink' ? 'mint' : 'pink', li = tInput(O.local);
    TS.lastInp = li;
    if (!G.over) {
      if (Tak.stepPlayer(G, me, li, Tak.DT)) sfx.jump(O.local);
      if (li.act && me.cd <= 0) {
        const b = G.ball, dir = Math.abs(li.mx) > .3 ? Math.sign(li.mx) : 0;
        if (b.live && Tak.inReach(me, b.x, b.y)) {
          TS.kick.n++;
          TS.kick.req = { bx: Math.round(b.x), by: Math.round(b.y), px: Math.round(me.x), py: Math.round(me.y), dir, air: !me.ground };
          me.cd = .2; me.kickT = .24; me.kickK = Tak.kickKind(G, me, dir, !me.ground); TS.myKickT = .3;
          tKickSound(me.kickK);
        } else { me.cd = .12; me.kickT = .18; me.kickK = 'whiff'; }
      }
    }
    G[hid].kickT = Math.max(0, G[hid].kickT - Tak.DT);
    Tak.smoothPlayer(G, hid, now);
    Tak.smooth(G, now);
    tGuestDiff();
  }
  if (G.over && !TS.endT) { TS.endT = 1.4; sfx.whistle(); tSave(); }
}
function takFrame(dt, now) {
  const G = TS.G;
  if (S.mode === 'play' && G) {
    TS.acc += dt;
    while (TS.acc >= Tak.DT) { tTick(now); TS.acc -= Tak.DT; if (S.mode !== 'play') { TS.acc = 0; break; } }
    if (TS.endT > 0) { TS.endT -= dt; if (TS.endT <= 0) { TS.endT = -1; tResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else TS.acc = 0;
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const f of TS.floats) { f.life -= dt; f.y -= dt * 26; }
  TS.floats = TS.floats.filter(f => f.life > 0);
  if (G) tHud();
  renderTak(dt);
}

/* ---------- drawing ---------- */
const takBg = document.createElement('canvas');
const SCENE = {
  temple: { sky: ['#ffd7a0', '#ffad84', '#d9789a'], far: '#b9708a', near: '#8a4a68', ground: '#d6ae86', ground2: '#c19672', line: 'rgba(255,255,255,.45)' },
  tree: { sky: ['#bfe6ff', '#d8f0e6', '#f3f7d6'], far: '#9cc3a6', near: '#6f9f7a', ground: '#b9c27c', ground2: '#a3ad68', line: 'rgba(255,255,255,.5)' },
  fair: { sky: ['#8fd2ff', '#c9e9ff', '#ffe6bd'], far: '#b2a6d9', near: '#8d7fc0', ground: '#d8b27c', ground2: '#c39d69', line: 'rgba(255,255,255,.5)' },
  beach: { sky: ['#7cc8ff', '#b9e4ff', '#eef8ff'], far: '#8fb6cf', near: '#5d8fae', ground: '#efd59d', ground2: '#ddc184', line: 'rgba(255,255,255,.6)' },
  night: { sky: ['#110e2c', '#2a1d4d', '#4a2a5e'], far: '#3a2a5c', near: '#2a1d44', ground: '#5b4a3c', ground2: '#4d3e33', line: 'rgba(255,230,180,.35)' }
};
function tRoof(g, cx, base, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w * .42, base - h * .45, w * .84, h * .45);
  g.beginPath(); g.moveTo(cx - w * .62, base - h * .42); g.lineTo(cx, base - h); g.lineTo(cx + w * .62, base - h * .42); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx - w * .5, base - h * .7); g.lineTo(cx, base - h * 1.18); g.lineTo(cx + w * .5, base - h * .7); g.closePath(); g.fill();
  g.lineWidth = 3; g.strokeStyle = col; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * w * .6, base - h * .44); g.quadraticCurveTo(cx + s * w * .72, base - h * .5, cx + s * w * .7, base - h * .64); g.stroke(); }
  g.beginPath(); g.moveTo(cx, base - h * 1.18); g.quadraticCurveTo(cx + 6, base - h * 1.28, cx + 2, base - h * 1.36); g.stroke();
}
function buildTakBg() {
  const G = TS.G; if (!G) return;
  takBg.width = cv.width; takBg.height = cv.height;
  const g = takBg.getContext('2d'), def = G.def, P = SCENE[def.scene] || SCENE.temple, R = rng(TS.li * 7717 + 5), GY = Tak.GROUND;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, P.sky[0]); sky.addColorStop(.6, P.sky[1]); sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  if (def.scene === 'night') {
    for (let i = 0; i < 110; i++) { g.fillStyle = `rgba(255,244,220,${.2 + R() * .6})`; const s = R() < .1 ? 2 : 1.2; g.fillRect(R() * VW, R() * GY * .7, s, s); }
    g.fillStyle = '#ffeccc'; g.beginPath(); g.arc(820, 70, 20, 0, Math.PI * 2); g.fill();
  } else {
    const sx = def.scene === 'temple' ? 760 : 150, sy = def.scene === 'temple' ? 150 : 70;
    const glow = g.createRadialGradient(sx, sy, 8, sx, sy, 110); glow.addColorStop(0, 'rgba(255,250,220,.9)'); glow.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = glow; g.fillRect(sx - 110, sy - 110, 220, 220);
    for (let i = 0; i < 4; i++) { const cx = R() * VW, cy = 60 + R() * 120, w = 60 + R() * 70; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx, cy, w, 14, 0, 0, Math.PI * 2); g.ellipse(cx + w * .3, cy - 10, w * .5, 14, 0, 0, Math.PI * 2); g.fill(); }
  }
  // far scenery
  if (def.scene === 'temple') {
    for (let i = 0; i < 3; i++) prang(g, 120 + i * 360 + R() * 60, GY - 30, 46 + R() * 20, 190 + R() * 60, P.far);
    tRoof(g, 250, GY, 230, 150, P.near); tRoof(g, 760, GY, 200, 130, P.near);
  } else if (def.scene === 'tree') {
    g.fillStyle = P.far; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(R() * VW, GY - 40 - R() * 50, 50 + R() * 40, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#6b4a2e'; g.fillRect(40, 120, 34, GY - 120); g.fillRect(880, 140, 30, GY - 140);
    g.strokeStyle = '#6b4a2e'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(60, 200); g.quadraticCurveTo(150, 150, 250, 140); g.stroke();
    g.beginPath(); g.moveTo(895, 210); g.quadraticCurveTo(880, 160, 860, 120); g.stroke();
  } else if (def.scene === 'fair') {
    g.strokeStyle = P.far; g.lineWidth = 4; const wx = 790, wy = 250, wr = 150;
    g.beginPath(); g.arc(wx, wy, wr, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); g.stroke(); g.fillStyle = P.near; g.fillRect(wx + Math.cos(a) * wr - 9, wy + Math.sin(a) * wr, 18, 14); }
    g.beginPath(); g.moveTo(wx - 60, GY); g.lineTo(wx, wy); g.lineTo(wx + 60, GY); g.stroke();
    for (let i = 0; i < 4; i++) { const x = 40 + i * 140, w = 110; g.fillStyle = P.near; g.fillRect(x, GY - 70, w, 70); for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? '#ff7a8a' : '#fff4e0'; g.beginPath(); g.moveTo(x - 6 + s * (w + 12) / 6, GY - 70); g.lineTo(x - 6 + (s + 1) * (w + 12) / 6, GY - 70); g.lineTo(x + w / 2, GY - 100); g.closePath(); g.fill(); } }
  } else if (def.scene === 'beach') {
    g.fillStyle = '#3d9ad6'; g.fillRect(0, GY - 110, VW, 110);
    g.fillStyle = '#6dbbe8'; for (let i = 0; i < 26; i++) g.fillRect(R() * VW, GY - 110 + R() * 100, 20 + R() * 40, 2);
    g.fillStyle = '#ffffff'; g.globalAlpha = .7; g.fillRect(0, GY - 8, VW, 4); g.globalAlpha = 1;
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(70, GY); g.quadraticCurveTo(60, 330, 110, 230); g.stroke();
    g.fillStyle = '#3f8f4a'; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .55; g.beginPath(); g.ellipse(110 + Math.cos(a) * 46, 230 + Math.sin(a) * 18 + 10, 50, 10, a, 0, Math.PI * 2); g.fill(); }
  } else if (def.scene === 'night') {
    tRoof(g, 200, GY, 240, 170, P.near); tRoof(g, 780, GY, 220, 150, P.near);
    for (let i = 0; i < 3; i++) prang(g, 470 + (i - 1) * 140, GY - 40, 40, 160, P.far);
  }
  // ground
  const gg = g.createLinearGradient(0, GY, 0, VH); gg.addColorStop(0, P.ground); gg.addColorStop(1, P.ground2);
  g.fillStyle = gg; g.fillRect(0, GY, VW, VH - GY);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, GY, VW, 2);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(R() * VW, GY + 6 + R() * (VH - GY - 8), 3 + R() * 6, 1.5); }
  g.strokeStyle = P.line; g.lineWidth = 2;
  for (const h of G.hoops) { g.beginPath(); g.ellipse(h.x0, GY + 22, 110 + (h.swing || 0) * .6, 13, 0, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.moveTo(30, GY + 40); g.lineTo(VW - 30, GY + 40); g.stroke();
  // tree branches the ball bounces off
  for (const br of G.branches) {
    g.fillStyle = '#3f7d3a'; g.beginPath(); g.arc(br.x, br.y, br.r + 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5ea24f';
    for (let k = 0; k < 9; k++) { const a = R() * Math.PI * 2, d = R() * br.r * .7; g.beginPath(); g.arc(br.x + Math.cos(a) * d, br.y + Math.sin(a) * d, br.r * (.28 + R() * .2), 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#8a6a3a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(br.x - br.r * .5 + R() * br.r, br.y + br.r * .3 + R() * br.r * .4, 2.5, 7, .4, 0, Math.PI * 2); g.fill(); }
  }
}
// strings of flags / lights across the top
function tDrawScenery(g, G, time) {
  const sc = G.def.scene;
  if (sc === 'fair' || sc === 'night' || sc === 'temple') {
    for (const [x0, x1, y] of [[0, 330, 70], [630, 960, 70]]) {
      g.strokeStyle = 'rgba(60,40,40,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + 40, x1, y); g.stroke();
      for (let k = 1; k < 10; k++) {
        const t = k / 10, x = x0 + (x1 - x0) * t, yy = y + 40 * 2 * t * (1 - t) * 1 + Math.sin(time * 2 + k) * 1.5;
        if (sc === 'night') { const on = (Math.sin(time * 3 + k * 1.7) + 1) / 2; g.fillStyle = `rgba(255,${190 + 40 * on | 0},120,${.5 + on * .5})`; g.beginPath(); g.arc(x, yy + 6, 4, 0, Math.PI * 2); g.fill(); }
        else { g.fillStyle = ['#ff6f9c', '#ffcf5a', '#4fe0bf', '#8fb8ff'][k % 4]; g.beginPath(); g.moveTo(x - 7, yy); g.lineTo(x + 7, yy); g.lineTo(x, yy + 14); g.closePath(); g.fill(); }
      }
    }
  }
  if (G.def.wind) {                                                     // flag on a pole shows the wind
    const px = 918, py = 300, w = G.wind / G.def.wind.amp;
    g.fillStyle = '#e8e2d6'; g.fillRect(px - 2, py, 4, Tak.GROUND - py);
    const len = 22 + Math.abs(w) * 26, dir = w >= 0 ? 1 : -1, flap = Math.sin(time * (6 + Math.abs(w) * 8)) * (4 + Math.abs(w) * 3);
    g.fillStyle = '#ff5a6a'; g.beginPath(); g.moveTo(px, py + 2); g.quadraticCurveTo(px + dir * len / 2, py + 2 + flap, px + dir * len, py + 8 + flap * .5); g.lineTo(px + dir * len, py + 14 + flap * .5); g.quadraticCurveTo(px + dir * len / 2, py + 18 - flap, px, py + 20); g.closePath(); g.fill();
  }
}
function tDrawHoopBack(g, G, h, time) {
  const lit = h.lit, rx = Tak.HR;
  g.strokeStyle = 'rgba(80,55,35,.85)'; g.lineWidth = 2;
  const top = h.swing ? -40 : -10, pivot = h.x0;
  g.beginPath(); g.moveTo(pivot, top); g.lineTo(h.cx, h.y - 34); g.stroke();
  g.beginPath(); g.moveTo(h.cx, h.y - 34); g.lineTo(h.cx - rx, h.y); g.moveTo(h.cx, h.y - 34); g.lineTo(h.cx + rx, h.y); g.stroke();
  if (lit && G.hoops.length > 1) {
    const glow = g.createRadialGradient(h.cx, h.y, 10, h.cx, h.y, 90); glow.addColorStop(0, 'rgba(255,214,120,.45)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = glow; g.fillRect(h.cx - 90, h.y - 90, 180, 180);
  }
  // the two rear rings of the three-ring hoop
  g.lineWidth = 3;
  for (const s of [-1, 1]) { g.strokeStyle = lit ? (s < 0 ? '#e85a4a' : '#4aa0e8') : '#6b6680'; g.beginPath(); g.ellipse(h.cx + s * 16, h.y - 5, 22, 6, 0, Math.PI, Math.PI * 2); g.stroke(); }
  g.strokeStyle = lit ? '#ffcf5a' : '#7c7698'; g.beginPath(); g.ellipse(h.cx, h.y, rx, 9, 0, Math.PI, Math.PI * 2); g.stroke();
  // net
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
  for (let k = 0; k <= 6; k++) { const t = k / 6, x0 = h.cx - rx + 2 * rx * t, x1 = h.cx - 16 + 32 * t; g.beginPath(); g.moveTo(x0, h.y); g.lineTo(x1, h.y + 40); g.stroke(); }
  for (let k = 1; k <= 3; k++) { const yy = h.y + k * 10, w = rx - (rx - 16) * k / 4; g.beginPath(); g.ellipse(h.cx, yy, w, 4, 0, 0, Math.PI * 2); g.stroke(); }
}
function tDrawHoopFront(g, G, h, time) {
  const lit = h.lit, rx = Tak.HR;
  g.lineWidth = 3.5; g.strokeStyle = lit ? '#ffcf5a' : '#7c7698';
  g.beginPath(); g.ellipse(h.cx, h.y, rx, 9, 0, 0, Math.PI); g.stroke();
  for (const s of [-1, 1]) { g.fillStyle = lit ? '#fff1c0' : '#9a94b0'; g.beginPath(); g.arc(h.cx + s * rx, h.y, 3, 0, Math.PI * 2); g.fill(); }
  if (G.hoops.length > 1 && G.def.litT) {                               // time left before the light moves
    const per = G.def.litT, left = per - (G.t % per);
    if (lit) { g.strokeStyle = 'rgba(255,207,90,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(h.cx, h.y + 14, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / per); g.stroke();
      g.font = `600 13px ${FONT}`; g.textAlign = 'center'; g.fillStyle = C.gold; g.fillText(th(Math.ceil(left)), h.cx, h.y + 82); }
  }
}
function tDrawBall(g, G, time) {
  const b = G.ball, r = Tak.BR;
  const hgt = Math.max(0, Tak.GROUND - b.y), sh = Math.max(.15, 1 - hgt / 420);
  g.fillStyle = `rgba(0,0,0,${.25 * sh})`; g.beginPath(); g.ellipse(b.x, Tak.GROUND + 3, 14 * sh + 4, 3.5 * sh + 1, 0, 0, Math.PI * 2); g.fill();
  let alpha = 1, y = b.y;
  if (!b.live) { alpha = .55 + .45 * Math.abs(Math.sin(time * 6)); y += Math.sin(time * 4) * 4; }
  g.globalAlpha = alpha;
  const gr = g.createRadialGradient(b.x - 4, y - 4, 2, b.x, y, r); gr.addColorStop(0, '#fbe6a6'); gr.addColorStop(1, '#c8902f');
  g.fillStyle = gr; g.beginPath(); g.arc(b.x, y, r, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(b.x, y, r, 0, Math.PI * 2); g.clip();
  g.translate(b.x, y); g.rotate(b.spin); g.strokeStyle = 'rgba(122,78,20,.85)'; g.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(0, 0, r, r * .42, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
  g.strokeStyle = '#7a4e14'; g.lineWidth = 1.2; g.beginPath(); g.arc(b.x, y, r, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 1;
  if (!b.live) {                                                        // serve countdown ring
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(b.x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, b.wait / 1.6))); g.stroke();
  }
  if (b.y < 0 && b.live) {                                             // above the top edge: little arrow
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(b.x, 6); g.lineTo(b.x - 7, 18); g.lineTo(b.x + 7, 18); g.closePath(); g.fill();
  }
}
function tDrawLanding(g, G, time) {
  const b = G.ball;
  if (!b.live || b.vy < -50 && b.y > 200) return;
  const pr = Tak.predict(G, Tak.GROUND - Tak.BR, 2.5);
  const a = Math.max(.15, Math.min(.6, 1.2 - pr.t));
  g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 2; g.setLineDash([4, 5]);
  g.beginPath(); g.ellipse(pr.x, Tak.GROUND + 4, 18, 5, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
}
function tDrawPlayer(g, G, p, time) {
  const k = 1.55, cx = p.x + p.w / 2, by = p.y + p.h, pink = p.id === 'pink';
  if (p.kickT > 0) {                                                    // the kicking leg
    const dur = p.kickK === 'whiff' ? .18 : .24, u = 1 - p.kickT / dur;
    const b = G.ball, side = p.kickK === 'shot' || p.kickK === 'back' || p.kickK === 'whiff' ? p.face : (Math.sign(b.x - cx) || p.face);
    const air = p.kickK === 'shot' || p.kickK === 'back';
    const a0 = air ? .6 : .9, a1 = air ? -1.5 : -.5, ang = a0 + (a1 - a0) * Math.min(1, u * 1.6);
    const hx = cx + side * 4, hy = by - 14, len = 28;
    const fx = hx + side * Math.cos(ang) * len, fy = hy + Math.sin(ang) * len;
    g.strokeStyle = pink ? C.pinkD : C.mintD; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx, fy); g.stroke();
    g.fillStyle = pink ? C.pink : C.mint; g.beginPath(); g.arc(fx, fy, 6, 0, Math.PI * 2); g.fill();
    if (u < .7 && p.kickK !== 'whiff') { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, len + 6, side > 0 ? a1 : Math.PI - a0, side > 0 ? a0 : Math.PI - a1); g.stroke(); }
  }
  g.save(); g.translate(cx, by); g.scale(k, k);
  drawPlayer(g, { id: p.id, x: -11, y: -28, w: 22, h: 28, face: p.face, sq: p.sq, walk: p.walk }, time);
  g.restore();
}
function tDrawHud(g, G, time) {
  const lv = TLEVELS[TS.li], st = Tak.stars(G);
  rr(g, 10, 10, 182, 66, 12); g.fillStyle = 'rgba(21,17,46,.72)'; g.fill();
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('แต้ม', 22, 30);
  g.font = `400 30px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(th(G.score), 22, 64);
  g.textAlign = 'right'; g.font = `400 15px ${FONT}`; g.fillStyle = C.gold; g.fillText([0, 1, 2].map(i => (i < st ? '★' : '☆')).join(''), 182, 32);
  if (st < 3) { g.font = `400 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`ดาวถัดไป ${th(lv.stars[st])}`, 182, 52); }
  rr(g, VW - 122, 10, 112, 66, 12); g.fillStyle = 'rgba(21,17,46,.72)'; g.fill();
  g.textAlign = 'right'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('เวลา', VW - 22, 30);
  const low = G.left < 15 && Math.sin(time * 8) > 0;
  g.font = `400 28px ${FONT_D}`; g.fillStyle = low ? '#ff6b6b' : C.paper; g.fillText(th(fmt(Math.ceil(G.left))), VW - 22, 64);
  // the exchange multiplier
  const ch = G.chain;
  g.textAlign = 'center';
  if (ch.passes > 0) {
    const mult = 1 + Tak.MULT_STEP * Math.min(ch.passes, Tak.MULT_MAX);
    rr(g, VW / 2 - 92, 12, 184, 40, 20); g.fillStyle = 'rgba(21,17,46,.72)'; g.fill();
    g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(`ส่งต่อ ×${th(mult)}`, VW / 2, 40);
    for (let k = 0; k < Tak.MULT_MAX; k++) { g.fillStyle = k < ch.passes ? C.gold : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(VW / 2 - 18 + k * 12, 58, 3.5, 0, Math.PI * 2); g.fill(); }
  } else if (ch.last && G.ball.live) {
    g.font = `600 13px ${FONT}`; const t = 'ส่งให้เพื่อนก่อน ถึงจะยิงได้แต้ม', w = g.measureText(t).width + 28;
    rr(g, VW / 2 - w / 2, 16, w, 28, 14); g.fillStyle = 'rgba(21,17,46,.66)'; g.fill();
    g.fillStyle = '#ffd9e6'; g.fillText(t, VW / 2, 35);
  }
  if (G.def.wind) {
    const w = G.wind / G.def.wind.amp, x = VW - 66, y = 92;
    rr(g, x - 56, y - 14, 112, 28, 14); g.fillStyle = 'rgba(21,17,46,.6)'; g.fill();
    g.font = `600 12px ${FONT}`; g.fillStyle = '#c9e6ff'; g.textAlign = 'left'; g.fillText('ลม', x - 46, y + 4);
    const len = 8 + Math.abs(w) * 30, d = Math.sign(w) || 1, ax = x + 8;
    g.strokeStyle = '#c9e6ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax - d * len / 2, y); g.lineTo(ax + d * len / 2, y); g.stroke();
    g.fillStyle = '#c9e6ff'; g.beginPath(); g.moveTo(ax + d * (len / 2 + 7), y); g.lineTo(ax + d * len / 2, y - 6); g.lineTo(ax + d * len / 2, y + 6); g.closePath(); g.fill();
  }
}
function renderTak(dt) {
  const g = ctx, G = TS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(takBg, 0, 0);
  let ox = 0, oy = 0;
  if (S.shake > 0) { ox = (Math.random() - .5) * 6 * S.shake; oy = (Math.random() - .5) * 6 * S.shake; }
  g.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
  const time = S.time;
  tDrawScenery(g, G, time);
  tDrawLanding(g, G, time);
  for (const h of G.hoops) tDrawHoopBack(g, G, h, time);
  for (const id of ['mint', 'pink']) tDrawPlayer(g, G, G[id], time);
  tDrawBall(g, G, time);
  for (const h of G.hoops) tDrawHoopFront(g, G, h, time);
  drawParts(g);
  for (const f of TS.floats) {
    const a = Math.min(1, f.life / (f.max * .5));
    g.globalAlpha = a; g.textAlign = 'center'; g.font = `${f.size > 20 ? 400 : 600} ${f.size}px ${f.size > 20 ? FONT_D : FONT}`;
    g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y);
    g.globalAlpha = 1;
  }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  tDrawHud(g, G, time);
  drawBanner(g);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
  if (S.flash > 0) { g.fillStyle = `rgba(255,80,110,${S.flash * .25})`; g.fillRect(0, 0, VW, VH); }
}

/* ---------- title list ---------- */
function renderTakLevels() {
  let total = 0;
  $('#tlevels').innerHTML = TLEVELS.map((lv, i) => {
    const b = tBest(i), open = tOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ${th(b.m)} แต้ม` : open ? 'ยังไม่เคยลงสนาม' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-t="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#tStarsAll').textContent = `ดาวรวม ${th(total)}/${th(TLEVELS.length * 3)}`;
  let next = TLEVELS.findIndex((l, i) => tOpen(i) && !(tBest(i) && tBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.t = next;
  if (S.tab === 'tak') $('#bGo').textContent = tBest(next) ? `เล่น${COURT(next)}` : 'ลงสนาม';
}
$('#tlevels').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b && !b.disabled) startTak(+b.dataset.t); });

/* ---------- online ---------- */
function onlineStartTak(i) {
  if (O.role !== 'host') return;
  O.md = 't'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsT').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b && !b.disabled) onlineStartTak(+b.dataset.t); });
function renderOnlineTak() {
  $('#oLevelsT').innerHTML = TLEVELS.map((lv, i) => {
    const b = tBest(i), open = tOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-t="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยลงสนาม' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function tHostHears(pr) {
  const G = TS.G;
  if (!G || pr.ep !== O.ep || !pr.p) return;
  const rid = O.local === 'pink' ? 'mint' : 'pink';
  Tak.applyPlayer(G, rid, pr.p, performance.now());
  const ka = pr.p.ka | 0;
  if (TS.seenKa < 0) TS.seenKa = ka;
  if (ka > TS.seenKa) { TS.seenKa = ka; TS.remote.req = pr.p.kq; TS.remote.fresh = true; }
}
function tGuestHears(pr) {
  const G = TS.G;
  if (!G) return;
  const hid = O.local === 'pink' ? 'mint' : 'pink';
  if (pr.p) Tak.applyPlayer(G, hid, pr.p, performance.now());
  if (pr.tw) {
    const was = G.over;
    Tak.apply(G, pr.tw, performance.now());
    if (G.over && !was && !TS.endT && S.mode === 'play') { TS.endT = 1.4; sfx.whistle(); tSave(); }
  }
}

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
  setTab(S.tab);
  syncFull();
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`600 12px ${FONT}`), document.fonts.load(`400 20px ${FONT_D}`)]).catch(() => {});
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  if (inClaude()) setTimeout(roomApi, 300);
}
try { Object.defineProperty(window, '__tsr', { value: { S, KS, DS, RS, TS, O, KK, KT }, configurable: true }); } catch (e) {}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ names: S.names, li: S.li })); } catch (e) {}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();

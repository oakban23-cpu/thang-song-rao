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
const curLevel = () => (MODES[S.kind] ? MODES[S.kind].L[MODES[S.kind].st.li] : S.kind === 'kit' ? KLEVELS[KS.li] : S.kind === 'def' ? DLEVELS[DS.li] : S.kind === 'drv' ? RLEVELS[RS.li] : S.kind === 'tak' ? TLEVELS[TS.li] : S.kind === 'mus' ? MLEVELS[MS.li] : S.kind === 'twr' ? WLEVELS[WS.li] : S.kind === 'leg' ? LLEVELS[LS.li] : S.kind === 'boat' ? BLEVELS[BS.li] : S.kind === 'mov' ? VLEVELS[VS.li] : S.kind === 'kite' ? ILEVELS[IS.li] : ALL[S.li]);
const curLabel = () => (MODES[S.kind] ? MODES[S.kind].label(MODES[S.kind].st.li) : S.kind === 'kit' ? kLabel(KS.li) : S.kind === 'def' ? NIGHT(DS.li) : S.kind === 'drv' ? ROUTE(RS.li) : S.kind === 'tak' ? COURT(TS.li) : S.kind === 'mus' ? SONG(MS.li) : S.kind === 'twr' ? SITE(WS.li) : S.kind === 'leg' ? COURSE(LS.li) : S.kind === 'boat' ? RIVER(BS.li) : S.kind === 'mov' ? HOUSE(VS.li) : S.kind === 'kite' ? KFIELD(IS.li) : lvLabel(S.li));
// the modes driven by the kitchen-style controls (joystick + buttons); takraw is side-on but uses them too
const topDown = () => S.kind === 'kit' || S.kind === 'def' || S.kind === 'drv' || S.kind === 'tak' || S.kind === 'mov' || S.kind === 'kite' || !!(MODES[S.kind] && MODES[S.kind].pad === 'k');

/* ---------- DOM ---------- */
const app = $('#app'), stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const scr = { title: $('#sTitle'), pause: $('#sPause'), clear: $('#sClear'), online: $('#sOnline'), ward: $('#sWard') };
const nPink = $('#nPink'), nMint = $('#nMint'), snd = $('#snd'), bgmOn = $('#bgmOn');
const isTouch = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !window.matchMedia('(pointer: fine)').matches;
app.classList.toggle('touch', isTouch);

/* ---------- State ---------- */
// every kind of screen; the one showing is a class on #app
const KINDS = ['kit', 'def', 'drv', 'tak', 'mus', 'twr', 'leg', 'boat', 'mov', 'kite', 'cin', 'fart', 'bed', 'win', 'trap', 'isle', 'shop', 'fish'];
function setKind(k) { S.kind = k; for (const x of KINDS) app.classList.toggle(x, x === k); }
const MODES = {};
const S = { mode: 'menu', li: 0, W: null, deathT: 0, winT: 0, flash: 0, banner: 0, deaths: 0, elapsed: 0, parts: [], time: 0, deadId: null, shake: 0, gates: [], names: { pink: 'เค้า', mint: 'ตัวเอง' }, sound: true, music: true };
const KB = { pink: { left: false, right: false, jump: false }, mint: { left: false, right: false, jump: false } };
const TC = { pink: { left: false, right: false, jump: false }, mint: { left: false, right: false, jump: false } };
const JP = { pink: false, mint: false };
const input = id => ({ left: KB[id].left || TC[id].left, right: KB[id].right || TC[id].right, jump: KB[id].jump || TC[id].jump, jp: JP[id] });

/* ---------- Sound: one soft mixer for the effects, the music and the sounds of each place ---------- */
// everything goes through a gentle compressor; longer sounds also ring a little in a warm room
let ac = null, MX = null;
function audioCtx() {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended' && !(window.OfflineAudioContext && ac instanceof OfflineAudioContext)) ac.resume(); } catch (e) { ac = null; }
  return ac;
}
// for the tests: play sounds into another context (an offline one, to measure them)
function soundsInto(c, fn) { const A = ac, B = MX, s = S.sound; ac = c; MX = mixerFor(c, c.destination); S.sound = true; try { fn(); } finally { ac = A; MX = B; S.sound = s; } }
function audio() { return S.sound ? audioCtx() : null; }                       // the effects (the music has its own switch)
function mixer(a) { if (!MX || MX.a !== a) MX = mixerFor(a, a.destination); return MX; }
function mixerFor(a, out) {
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 16; comp.ratio.value = 3.5; comp.attack.value = .005; comp.release.value = .25;
  const master = a.createGain(); master.gain.value = .95; comp.connect(master); master.connect(out);
  const room = a.createConvolver(); room.buffer = roomIR(a); const wet = a.createGain(); wet.gain.value = .55; room.connect(wet); wet.connect(comp);
  const send = a.createGain(); send.gain.value = .32; send.connect(room);
  const fx = a.createGain(); fx.gain.value = 1.2; fx.connect(comp);
  const musLP = a.createBiquadFilter(); musLP.type = 'lowpass'; musLP.frequency.value = 16000; musLP.Q.value = .4;
  const mus = a.createGain(); mus.gain.value = 0; mus.connect(musLP); musLP.connect(comp);
  const musSend = a.createGain(); musSend.gain.value = .3; musLP.connect(musSend); musSend.connect(room);
  const amb = a.createGain(); amb.gain.value = 0; amb.connect(comp);
  return { a, comp, master, fx, send, mus, musLP, amb };
}
// a soft room: decaying, slightly dark noise
function roomIR(a) {
  const n = Math.floor(a.sampleRate * 1.7), b = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * .55 + (Math.random() * 2 - 1) * .45; d[i] = lp * Math.pow(1 - i / n, 3.4) * Math.min(1, i / 60); } }
  return b;
}
let NB = null;
function noiseBuf(a) {
  if (NB && NB.sampleRate === a.sampleRate) return NB;
  NB = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return NB;
}
// one note: a soft start (no clicks), buzzy waves rounded off with a filter so nothing sounds harsh
function tone(f, d = .08, type = 'sine', v = .08, slide = 0, delay = 0) {
  const a = audio(); if (!a) return;
  try {
    const M = mixer(a), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(.006, d * .25)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let src = o;
    if (type === 'square' || type === 'sawtooth') { const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(6000, Math.max(1500, Math.max(f, slide || 0) * 4)); lp.Q.value = .7; o.connect(lp); src = lp; }
    src.connect(g); g.connect(M.fx); if (d >= .15) g.connect(M.send);
    o.start(t); o.stop(t + d + .03);
  } catch (e) {}
}
// a burst of shaped noise: whooshes, splashes, thuds, claps; the filter can sweep from f to f2
function noise(d = .1, f = 1000, v = .05, type = 'bandpass', q = 1, f2 = 0, delay = 0) {
  const a = audio(); if (!a) return;
  try {
    const M = mixer(a), t = a.currentTime + delay, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf(a); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(.012, d * .3)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl).connect(g); g.connect(M.fx); if (d >= .2) g.connect(M.send);
    s.start(t, Math.random() * Math.max(0, 1.9 - d)); s.stop(t + d + .03);
  } catch (e) {}
}
// a little glass bell: a pure note with a bright, quick overtone
function chime(f, d = .5, v = .05, delay = 0) { tone(f, d, 'sine', v, 0, delay); tone(f * 2.76, d * .4, 'sine', v * .25, 0, delay); tone(f * 5.4, d * .18, 'sine', v * .08, 0, delay); }
// a proper "brrrt": a low buzz chopped on and off, sagging in pitch, with a breath of air
function brrt(d, f, v, delay = 0) {
  const a = audio(); if (!a) return;
  try {
    const M = mixer(a), t = a.currentTime + delay, o = a.createOscillator(), lf = a.createOscillator(), lg = a.createGain(), am = a.createGain(), lp = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .7, t + d);
    lf.type = 'square'; lf.frequency.setValueAtTime(26 + Math.random() * 10, t); lf.frequency.linearRampToValueAtTime(17, t + d);
    am.gain.value = .5; lg.gain.value = .5; lf.connect(lg).connect(am.gain);
    lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .02); g.gain.setValueAtTime(v, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(lp).connect(am).connect(g); g.connect(M.fx);
    o.start(t); lf.start(t); o.stop(t + d + .05); lf.stop(t + d + .05);
  } catch (e) {}
  noise(d * .8, 320, v * .5, 'bandpass', 1.5, 160, delay);
}
const sfx = {
  jump(id) { tone(id === 'pink' ? 520 : 420, .13, 'triangle', .07, id === 'pink' ? 980 : 800); tone(id === 'pink' ? 1040 : 840, .06, 'sine', .02, 0, .02); },
  land() { tone(160, .08, 'sine', .06, 80); noise(.05, 700, .02, 'lowpass', .7); },
  plate() { tone(330, .06, 'triangle', .05, 300); noise(.03, 2000, .015, 'bandpass', 2); },
  door() { noise(.35, 300, .04, 'lowpass', 1, 900); tone(130, .3, 'triangle', .04, 90); },
  heart() { chime(1047, .35, .05); chime(1568, .5, .05, .07); tone(2093, .25, 'sine', .015, 0, .14); },
  die() { tone(523, .18, 'triangle', .06, 494); tone(392, .45, 'triangle', .06, 330, .18); noise(.3, 400, .02, 'lowpass', 1, 150, .1); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => chime(f, .45, .05, i * .09)); [523, 659, 784].forEach(f => tone(f, .9, 'triangle', .025, 0, .5)); },
  bell() { chime(1318, 1.1, .06); chime(659, 1.3, .035, .01); },
  ghost() { tone(880, .5, 'sine', .05, 330); tone(1320, .4, 'triangle', .02, 440, .05); noise(.5, 1200, .01, 'bandpass', 4, 500); },
  swap() { [784, 1047, 1319, 1568].forEach((f, i) => chime(f, .25, .03, i * .035)); noise(.25, 3000, .015, 'bandpass', 2, 800); },
  boing() { tone(180, .32, 'sine', .08, 640); tone(360, .22, 'triangle', .035, 900, .03); },
  portal() { tone(500, .35, 'sine', .05, 1500); tone(1500, .3, 'sine', .03, 500, .08); noise(.4, 600, .02, 'bandpass', 3, 3000); },
  crumble() { noise(.25, 600, .05, 'lowpass', 1, 150); tone(110, .2, 'triangle', .04, 60, .03); for (let i = 0; i < 4; i++) noise(.04, 1500 + i * 300, .015, 'bandpass', 3, 0, .04 + i * .05); }
};
/* ---------- Background music: a little band playing live on the audio clock ---------- */
// Every track is a few bars of chords, a melody, an arpeggio or chord stabs, a bass line and light percussion.
// Notes are written one token per step (two steps a beat): a note like E5 or F#4, '-' holds it, '.' rests, '|' is just a bar line.
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(n) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return m ? 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : null; }
const CHORD_IV = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7], '6': [0, 4, 7, 9] };
function chordOf(sym) { const m = /^([A-G][#b]?)(maj7|m7|m|7|dim|sus|6)?$/.exec(sym); return { pc: noteMidi(m[1] + '4') % 12, iv: CHORD_IV[m[2] || ''] }; }
const chordTone = (ch, i) => ch.iv[i % ch.iv.length] + 12 * Math.floor(i / ch.iv.length);
const arpBase = ch => 55 + ((ch.pc - 7 + 12) % 12);                 // the chord's root between G3 and F#4

const TRACKS = {
  // the title: a music box over a soft kalimba, gentle and a little hopeful
  title: { bpm: 96, beats: 4, div: 2, vol: 0.65, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'G', 'C'],
    mel: [{ i: 'bell', v: .07, n: 'E5 - G5 - A5 G5 E5 - | D5 - C5 - D5 E5 - . | C5 - A4 - C5 D5 E5 - | D5 - - - . . . . | E5 - G5 - A5 - C6 - | A5 G5 E5 - D5 - E5 - | G5 E5 D5 C5 D5 - E5 D5 | C5 - - - . . . .' }],
    arp: { i: 'pluck', v: .026, p: '0 1 2 1 3 2 1 2' }, bass: { i: 'bass', v: .06, p: '0 - - - 2 - - -' }, pad: .016,
    drums: { shaker: ['. x . x . x . x', .5] } },
  // the old temple at dusk: a breathy flute over a kalimba
  adv: { bpm: 80, beats: 4, div: 2, vol: 0.5, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am'],
    mel: [{ i: 'flute', v: .05, n: 'A4 - C5 - E5 - D5 C5 | C5 - - - A4 - - - | G4 - C5 - E5 - D5 E5 | D5 - - - . . . . | E5 - G5 - A5 - G5 E5 | F5 - E5 - C5 - A4 - | B4 - D5 - G5 - D5 - | A4 - - - . . . .' }],
    arp: { i: 'pluck', v: .03, p: '0 2 1 2 3 2 1 2' }, bass: { i: 'bass', v: .065, p: '0 - - - - - 2 -' }, pad: .018 },
  // the kitchen: a bouncy marimba, oom-pah bass, a shaker and claps
  kit: { bpm: 126, beats: 4, div: 2, vol: 0.5, chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'],
    mel: [{ i: 'marimba', v: .07, n: 'F5 . A5 . C6 . A5 . | D5 . F5 . A5 . F5 . | Bb4 . D5 . F5 . D5 F5 | E5 . G5 . C6 . . . | F5 . A5 . C6 . D6 . | C6 . A5 . F5 . D5 . | D5 . F5 . Bb5 . A5 . | G5 . E5 . C5 . . .' }],
    arp: { i: 'pizz', v: .028, p: '. 1 . 2 . 1 . 2' }, bass: { i: 'bass', v: .07, p: '0 . 2 . 0 . 2 .' },
    drums: { shaker: ['x o x o x o x o', .4], kick: ['x . . . x . . .', .45], clap: ['. . x . . . x .', .3] } },
  // the night watch: a music box in a minor key, a ticking clock
  def: { bpm: 100, beats: 4, div: 2, vol: 0.86, chords: ['Dm', 'A', 'Bb', 'A', 'Dm', 'Gm', 'Bb', 'Dm'],
    mel: [{ i: 'bell', v: .06, n: 'D5 . F5 . A5 . G5 F5 | E5 . . . C#5 . . . | D5 . F5 . Bb5 . A5 G5 | A5 . . . . . . . | F5 . E5 . D5 . F5 . | G5 . F5 . E5 . D5 . | Bb4 . D5 . G5 . F5 E5 | D5 . . . . . . .' }],
    arp: { i: 'pizz', v: .03, p: '0 . 2 . 1 . 2 .' }, bass: { i: 'bass', v: .065, p: '0 . . . 0 . . .' }, pad: .015,
    drums: { block: ['. . x . . . x .', .28] } },
  // the delivery truck: a driving little pop band
  drv: { bpm: 116, beats: 4, div: 2, vol: 0.4, chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'D7', 'G'],
    mel: [{ i: 'lead', v: .042, n: 'B4 . D5 . G5 . F#5 . | E5 - - - B4 - - - | C5 . E5 . G5 . A5 . | F#5 - - - D5 - - - | B4 . D5 . G5 . B5 . | A5 . G5 . E5 - - - | C5 . E5 . D5 . A4 . | G4 - - - . . . .' }],
    arp: { i: 'pluck', v: .022, p: '. 1 . 2 . 1 . 2' }, bass: { i: 'bass', v: .065, p: '0 0 2 0 0 0 2 0' },
    drums: { kick: ['x . . . x . x .', .5], snare: ['. . x . . . x .', .32], hat: ['x x x x x x x x', .3] } },
  // the takraw court in the sun: a kalimba tune with claps and a little cymbal
  tak: { bpm: 108, beats: 4, div: 2, vol: 0.76, chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'],
    mel: [{ i: 'pluck', v: .07, n: 'G5 . E5 . G5 A5 G5 . | A5 . F5 . C5 . . . | B4 . D5 . G5 . F5 . | E5 . . . C5 . . . | C6 . A5 . G5 . E5 . | F5 . A5 . C6 . A5 . | G5 . D5 . F5 . B4 . | C5 . . . . . . .' }],
    arp: { i: 'marimba', v: .024, p: '. 0 . 1 . 2 . 1' }, bass: { i: 'bass', v: .07, p: '0 . . 2 0 . 2 .' },
    drums: { clap: ['. . x . . . x .', .28], shaker: ['. x . x . x . x', .3], ching: ['x . . . x . . .', .22] } },
  // the building site: a xylophone with a ticking hammer
  twr: { bpm: 120, beats: 4, div: 2, vol: 0.58, chords: ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'],
    mel: [{ i: 'marimba', v: .07, n: 'D5 . F#5 . A5 . F#5 . | G5 . B5 . G5 . . . | A5 . C#6 . E6 . C#6 . | D6 . . . A5 . . . | B5 . A5 . F#5 . D5 . | G5 . F#5 . E5 . D5 . | E5 . F#5 . G5 . A5 . | D5 . . . D6 . . .' }],
    arp: { i: 'pizz', v: .024, p: '. 1 . 2 . 1 . 2' }, bass: { i: 'bass', v: .068, p: '0 . 2 . 0 . 2 .' },
    drums: { block: ['x . x . x . x .', .22], kick: ['x . . . x . . .', .4] } },
  // sports day: a little brass march with a snare
  leg: { bpm: 120, beats: 4, div: 2, vol: 0.56, chords: ['Bb', 'F', 'Bb', 'F', 'Eb', 'Bb', 'F', 'Bb'],
    mel: [{ i: 'lead', v: .045, n: 'F5 . F5 . Bb5 - - - | A5 . F5 . C5 - - - | D5 . F5 . Bb5 . D6 . | C6 - - - - - . . | Eb6 . D6 . C6 . Bb5 . | D6 . C6 . Bb5 . F5 . | G5 . A5 . C6 . A5 . | Bb5 - - - . . . .' }],
    bass: { i: 'tuba', v: .08, p: '0 . 2 . 0 . 2 .' },
    drums: { kick: ['x . . . x . . .', .45], snare: ['. . x . . . x x', .3], hat: ['. x . x . x . x', .18] } },
  // the long boat race: a ranat-like tune, the little cymbals and a festival drum
  boat: { bpm: 112, beats: 4, div: 2, vol: 0.58, chords: ['G', 'G', 'Em', 'D', 'G', 'Em', 'D', 'G'],
    mel: [{ i: 'pluck', v: .068, n: 'D5 E5 G5 . E5 D5 B4 . | A4 B4 D5 . B4 A4 G4 . | G4 A4 B4 D5 E5 . D5 . | B4 . A4 . G4 . . . | E5 G5 A5 . G5 E5 D5 . | E5 D5 B4 . A4 B4 D5 . | G5 E5 D5 B4 A4 . B4 . | G4 . . . . . . .' }],
    bass: { i: 'bass', v: .065, p: '0 . . . 2 . . .' },
    drums: { ching: ['x . . . x . . .', .3], chap: ['. . x . . . x .', .25], tom: ['x . . x . . x .', .35] } },
  // moving house: a tuba and a plucky tune, a bit clumsy
  mov: { bpm: 104, beats: 4, div: 2, vol: 0.72, chords: ['C', 'G7', 'C', 'G7', 'F', 'C', 'G7', 'C'],
    mel: [{ i: 'pizz', v: .075, n: 'E5 . G5 . C6 . G5 . | F5 . D5 . B4 . G4 . | E5 . G5 . C6 . E6 . | D6 . . . . . . . | F5 . A5 . C6 . A5 . | G5 . E5 . C5 . E5 . | D5 . F5 . B5 . D6 . | C6 . . . C5 . . .' }],
    bass: { i: 'tuba', v: .085, p: '0 . 2 . 0 . 2 .' },
    drums: { block: ['. . x . . . x .', .25], kick: ['x . . . x . . .', .3] } },
  // kites in the wind: a flute floating over a kalimba
  kite: { bpm: 88, beats: 4, div: 2, vol: 0.5, chords: ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'D'],
    mel: [{ i: 'flute', v: .052, n: 'A5 - - B5 A5 - F#5 - | E5 - - - D5 - - - | B4 - D5 - E5 - F#5 - | E5 - - - - - . . | A5 - - B5 D6 - B5 - | A5 - F#5 - E5 - D5 - | B4 - D5 - E5 - F#5 E5 | D5 - - - - - . .' }],
    arp: { i: 'pluck', v: .022, p: '0 2 1 2 3 2 1 2' }, bass: { i: 'bass', v: .055, p: '0 - - - - - - -' }, pad: .018 },
  // the cinema: a soft electric piano, quiet so the film can be heard
  cin: { bpm: 76, beats: 4, div: 2, vol: 0.6, chords: ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Dm7', 'C7', 'Fmaj7'],
    mel: [{ i: 'ep', v: .045, n: 'A5 - - - C6 - A5 - | F5 - - - . . . . | D5 - F5 - A5 - G5 F5 | E5 - - - . . . . | A5 - - - C6 - D6 - | C6 - A5 - F5 - . . | Bb5 - A5 - G5 - E5 - | F5 - - - . . . .' }],
    comp: { i: 'ep', v: .014, p: 'x . . . . x . .' }, bass: { i: 'bass', v: .055, p: '0 - - - 2 - - -' },
    drums: { hat: ['. . x . . . x .', .12] } },
  // the first date: a bassoon-ish tune and a tuba, trying hard to stay calm
  fart: { bpm: 100, beats: 4, div: 2, vol: 0.86, chords: ['Gm', 'D7', 'Gm', 'D7', 'Cm', 'Gm', 'D7', 'Gm'],
    mel: [{ i: 'reed', v: .05, n: 'G4 . . Bb4 . . D5 . | C5 . Bb4 . A4 - - - | G4 . . Bb4 . . D5 . | F#4 - - - A4 - - - | C5 . . Eb5 . . G5 . | F5 . Eb5 . D5 - - - | C5 . Bb4 . A4 . F#4 . | G4 - - - . . . .' }],
    comp: { i: 'pizz', v: .016, p: '. . x . . . x .' }, bass: { i: 'tuba', v: .08, p: '0 . . . 2 . . .' },
    drums: { block: ['x . . . x . . .', .16] } },
  // the blanket: a lullaby in three, a music box and a soft pad
  bed: { bpm: 70, beats: 3, div: 2, vol: 0.9, chords: ['Eb', 'Ab', 'Bb', 'Eb', 'Cm', 'Ab', 'Bb', 'Eb'],
    mel: [{ i: 'bell', v: .055, n: 'Bb5 - G5 - Eb5 - | C6 - Ab5 - F5 - | D5 - F5 - Ab5 - | G5 - - - . . | Bb5 - G5 - Eb5 - | Eb6 - C6 - Ab5 - | F5 - G5 - D5 - | Eb5 - - - . .' }],
    arp: { i: 'pluck', v: .02, p: '0 . 1 . 2 .' }, bass: { i: 'bass', v: .05, p: '0 - - - - -' }, pad: .018 },
  // sneaking in at night: tiptoeing pizzicato, a walking bass
  win: { bpm: 96, beats: 4, div: 2, vol: 1.15, chords: ['Em', 'Am', 'B7', 'Em', 'Em', 'Am', 'B7', 'Em'],
    mel: [{ i: 'pizz', v: .07, n: 'E4 . G4 . B4 . . . | A4 . C5 . E5 . . . | D#5 . . F#5 . . A5 . | G5 . F#5 . E5 . B4 . | E5 . . G5 . . B5 . | A5 . G5 . F#5 . E5 . | D#5 . E5 . F#5 . B4 . | E4 . . . . . . .' }],
    bass: { i: 'bass', v: .06, p: '0 . 2 . 0 . 2 .' },
    drums: { block: ['. . x . . . x .', .18] } },
  // the trap run: a marimba striding through the jungle over toms and a shaker
  trap: { bpm: 112, beats: 4, div: 2, vol: 0.75, chords: ['Dm', 'Dm', 'C', 'Am', 'Bb', 'C', 'Dm', 'A7'],
    mel: [{ i: 'marimba', v: .06, n: 'D5 . F5 . A5 - G5 F5 | E5 . D5 . A4 - - - | C5 . E5 . G5 - F5 E5 | D5 . C5 . A4 - - - | Bb4 . D5 . F5 - E5 D5 | C5 . E5 . G5 - A5 - | F5 . E5 . D5 . A4 . | C#5 - E5 - D5 - - -' }],
    arp: { i: 'pluck', v: .02, p: '0 2 1 2 0 2 1 2' }, bass: { i: 'bass', v: .06, p: '0 . 0 2 . 0 2 .' },
    drums: { tom: ['x . . x . . x .', .22], shaker: ['. x . x . x . x', .35], block: ['. . x . . . . x', .15] } },
  // stranded: a lazy island marimba over a plucked strum, a bouncy bass and a shaker
  isle: { bpm: 96, beats: 4, div: 2, vol: 0.8, chords: ['F', 'Bb', 'C7', 'F', 'Dm', 'Gm', 'C7', 'F'],
    mel: [{ i: 'marimba', v: .06, n: 'A4 . C5 . F5 . D5 C5 | D5 . F5 . Bb4 - - - | G4 . Bb4 . E5 . D5 C5 | A4 - C5 - F4 - - - | F5 . E5 . D5 . A4 . | Bb4 . D5 . G5 - F5 - | E5 . C5 . Bb4 . G4 . | F4 - A4 - F5 - - -' }],
    arp: { i: 'pluck', v: .022, p: '0 1 2 1 0 1 2 1' }, bass: { i: 'bass', v: .06, p: '0 . 2 . 0 . 2 .' },
    drums: { shaker: ['x x . x x x . x', .3], block: ['. . x . . . x .', .14], tom: ['x . . . . . . .', .15] } },
  // fishing on the lake: a lazy country waltz, a slide guitar-ish reed over a plucked strum, a soft brush
  fish: { bpm: 84, beats: 3, div: 2, vol: 0.75, chords: ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'],
    mel: [{ i: 'reed', v: .045, n: 'D5 - B4 - G4 - | E5 - - - C5 - | D5 - B4 - G4 B4 | A4 - - - - - | B4 - C5 - D5 - | E5 - G5 - E5 - | D5 - C5 - A4 - | G4 - - - - -' }],
    arp: { i: 'pluck', v: .024, p: '0 2 1 2 3 2' }, bass: { i: 'bass', v: .055, p: '0 - - 2 - -' }, pad: .012,
    drums: { shaker: ['. x . x . x', .2], block: ['x . . . . .', .1] } },
  // the dress shop: a breezy boutique bossa on electric piano over a walking bass, a rim click and a shaker
  shop: { bpm: 108, beats: 4, div: 2, vol: 0.8, chords: ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'],
    mel: [{ i: 'ep', v: .05, n: 'A5 . G5 A5 - . E5 . | G5 . F5 G5 - . D5 . | F5 . E5 F5 - . A4 . | B4 - D5 - G5 - - . | E5 . D5 E5 - . G5 . | C6 - B5 A5 - . E5 . | F5 . A5 - D5 . F5 . | E5 - D5 - B4 - - .' }],
    arp: { i: 'pluck', v: .018, p: '0 . 2 1 . 2 1 .' }, bass: { i: 'bass', v: .06, p: '0 . . 2 . 1 2 .' },
    drums: { block: ['. . x . . x . .', .14], shaker: ['x x x x x x x x', .22], kick: ['x . . . x . . .', .25] } }
};

// turn the written parts into steps once
function trackPrep(tr) {
  if (tr._p) return tr;
  const spb = tr.beats * tr.div, toks = s => s.replace(/\|/g, ' ').trim().split(/\s+/);
  tr._ch = tr.chords.map(chordOf);
  tr._mel = (tr.mel || []).map(L => {
    const t = toks(L.n), ev = new Array(t.length).fill(null);
    for (let i = 0; i < t.length; i++) { const m = noteMidi(t[i]); if (m == null) continue; let len = 1; while (t[i + len] === '-') len++; ev[i] = { m, len }; }
    return { i: L.i, v: L.v, ev };
  });
  const pat = (p, holdable) => { const t = toks(p), out = []; for (let i = 0; i < spb; i++) { const k = t[i % t.length]; if (k === '.' || k === '-') { out.push(null); continue; } let len = 1; if (holdable) while (t[(i + len) % t.length] === '-' && len < spb) len++; out.push({ k, len }); } return out; };
  if (tr.arp) tr._arp = pat(tr.arp.p);
  if (tr.bass) tr._bass = pat(tr.bass.p, true);
  if (tr.comp) tr._comp = pat(tr.comp.p);
  tr._dr = Object.entries(tr.drums || {}).map(([k, [p, v]]) => ({ k, v, p: pat(p) }));
  tr._p = true; return tr;
}
const stepDur = tr => 60 / tr.bpm / tr.div;
function bgmStep(a, out, tr, step, at) {
  trackPrep(tr);
  const spb = tr.beats * tr.div, bar = Math.floor(step / spb), s = step % spb, sd = stepDur(tr), ch = tr._ch[bar % tr._ch.length];
  for (const L of tr._mel) { const e = L.ev[step % L.ev.length]; if (e) voice(a, out, L.i, at, mtof(e.m), e.len * sd, L.v); }
  if (tr._arp && tr._arp[s]) voice(a, out, tr.arp.i, at, mtof(arpBase(ch) + chordTone(ch, +tr._arp[s].k)), sd, tr.arp.v);
  if (tr._bass && tr._bass[s]) { const b = tr._bass[s]; voice(a, out, tr.bass.i, at, mtof(36 + ch.pc + chordTone(ch, +b.k)), b.len * sd, tr.bass.v); }
  if (tr._comp && tr._comp[s]) for (const iv of ch.iv) voice(a, out, tr.comp.i, at, mtof(arpBase(ch) + 12 + iv), sd * 2, tr.comp.v);
  if (tr.pad && s === 0) for (const iv of ch.iv.slice(0, 3)) voice(a, out, 'pad', at, mtof(arpBase(ch) + iv), spb * sd, tr.pad);
  for (const d of tr._dr) { const h = d.p[s]; if (h) drum(a, out, d.k, at, d.v * (h.k === 'o' ? .5 : 1)); }
}
// the band's instruments: a few oscillators each, shaped by short envelopes
function voice(a, out, what, at, f, dur, v) {
  const env = (node, peak, att, dec, hold = 0) => {
    const g = a.createGain(); g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + att);
    if (hold > 0) g.gain.setValueAtTime(peak, at + att + hold);
    g.gain.exponentialRampToValueAtTime(.0001, at + att + hold + dec); node.connect(g); g.connect(out); return at + att + hold + dec;
  };
  const osc = (type, fr) => { const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(fr, at); return o; };
  const go = (o, end) => { o.start(at); o.stop(end + .05); };
  const lp = (fr, q = .7) => { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(fr, at); fl.Q.value = q; return fl; };
  let o, o2, fl;
  switch (what) {
    case 'bell': o = osc('sine', f); go(o, env(o, v, .003, 1.2)); o = osc('sine', f * 2.005); go(o, env(o, v * .2, .003, .45)); o = osc('sine', f * 3.01); go(o, env(o, v * .06, .002, .16)); break;
    case 'pluck': o = osc('sine', f); go(o, env(o, v, .004, .8)); o = osc('triangle', f); go(o, env(o, v * .25, .004, .25)); o = osc('sine', f * 5.4); go(o, env(o, v * .1, .002, .05)); break;
    case 'marimba': o = osc('sine', f); go(o, env(o, v, .003, .42)); o = osc('sine', f * 3.93); go(o, env(o, v * .15, .002, .06)); break;
    case 'pizz': o = osc('triangle', f); go(o, env(o, v, .004, .22)); o = osc('sine', f * 2); go(o, env(o, v * .18, .003, .08)); break;
    case 'bass': { const d = Math.min(Math.max(dur * .9, .15), .8); o = osc('triangle', f); go(o, env(o, v, .006, d)); o = osc('sine', f); go(o, env(o, v * .6, .006, d)); break; }
    case 'tuba': { o = osc('sawtooth', f * 1.02); o.frequency.exponentialRampToValueAtTime(f, at + .05); fl = lp(f * 2.5 + 250, 1.2); o.connect(fl); go(o, env(fl, v, .02, Math.min(dur, .3))); break; }
    case 'flute': {
      o = osc('sine', f); const lfo = osc('sine', 5.2), lg = a.createGain(); lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * .007, at + .25); lfo.connect(lg).connect(o.frequency);
      const end = env(o, v, .06, .18, Math.max(0, dur - .12)); go(o, end); go(lfo, end);
      const n = a.createBufferSource(); n.buffer = noiseBuf(a); const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2; n.connect(bp); n.start(at, Math.random()); n.stop(env(bp, v * .1, .02, .1) + .05);
      break;
    }
    case 'ep': {
      o = osc('sine', f); const m = osc('sine', f), mg = a.createGain(); mg.gain.setValueAtTime(f * 1.2, at); mg.gain.exponentialRampToValueAtTime(f * .12, at + .4); m.connect(mg).connect(o.frequency);
      const end = env(o, v, .004, dur * .8 + .35, dur * .3); go(o, end); go(m, end);
      o2 = osc('sine', f * 2); go(o2, env(o2, v * .08, .003, .2)); break;
    }
    case 'lead': {
      o = osc('sawtooth', f); o2 = osc('square', f * 1.003); fl = lp(2600, 1.6); fl.frequency.exponentialRampToValueAtTime(1100, at + .15);
      const mix = a.createGain(); mix.gain.value = .5; o.connect(mix); o2.connect(mix); mix.connect(fl);
      const end = env(fl, v, .015, .12, Math.max(0, dur - .06)); go(o, end); go(o2, end); break;
    }
    case 'reed': {
      o = osc('sawtooth', f); fl = lp(f * 3, 3); o.connect(fl);
      const lfo = osc('sine', 4.5), lg = a.createGain(); lg.gain.value = f * .004; lfo.connect(lg).connect(o.frequency);
      const end = env(fl, v, .02, .1, Math.max(0, dur - .05)); go(o, end); go(lfo, end); break;
    }
    case 'pad': {
      fl = lp(900, .5); const mix = a.createGain(); mix.gain.value = .5;
      o = osc('sawtooth', f); o.detune.value = -7; o2 = osc('sawtooth', f); o2.detune.value = 7; o.connect(mix); o2.connect(mix); mix.connect(fl);
      const end = env(fl, v, .35, .6, Math.max(0, dur - .55)); go(o, end); go(o2, end); break;
    }
  }
}
function drum(a, out, k, at, v) {
  const env = (node, peak, att, dec, t0 = 0) => { const g = a.createGain(); g.gain.setValueAtTime(.0001, at + t0); g.gain.exponentialRampToValueAtTime(peak, at + t0 + att); g.gain.exponentialRampToValueAtTime(.0001, at + t0 + att + dec); node.connect(g); g.connect(out); return at + t0 + att + dec; };
  const nz = (type, fr, q, peak, att, dec, t0 = 0) => { const s = a.createBufferSource(); s.buffer = noiseBuf(a); const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = fr; fl.Q.value = q; s.connect(fl); s.start(at + t0, Math.random() * 1.5); s.stop(env(fl, peak, att, dec, t0) + .05); };
  const tn = (type, f0, f1, peak, att, dec) => { const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, at); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + att + dec * .6); o.start(at); o.stop(env(o, peak, att, dec) + .05); };
  switch (k) {
    case 'kick': tn('sine', 150, 45, v * .9, .002, .22); break;
    case 'snare': nz('bandpass', 1900, .8, v * .45, .002, .14); tn('triangle', 190, 160, v * .3, .002, .08); break;
    case 'hat': nz('highpass', 7500, .7, v * .22, .001, .035); break;
    case 'shaker': nz('bandpass', 5200, 1.5, v * .2, .015, .06); break;
    case 'clap': for (const t0 of [0, .012, .024]) nz('bandpass', 1500, 1.2, v * .3, .001, .018, t0); nz('bandpass', 1400, 1, v * .25, .001, .14, .032); break;
    case 'block': tn('sine', 1100, 1100, v * .32, .001, .06); tn('sine', 2200, 2200, v * .07, .001, .025); break;
    case 'ching': tn('sine', 2637, 2637, v * .16, .001, .5); tn('sine', 3951, 3951, v * .09, .001, .35); break;
    case 'chap': nz('bandpass', 2800, 2.5, v * .3, .001, .07); break;
    case 'tom': tn('sine', 230, 150, v * .55, .002, .25); nz('lowpass', 400, .7, v * .12, .001, .05); break;
  }
}

/* the conductor: which track (or none) fits what is on screen, faded in and out, muffled while paused */
const BGM = { name: undefined, tr: null, step: 0, next: 0, fadeIn: false, hold: 0, prevMode: '', banner: 0, amb: {}, ambKind: null };
const MODE_TRACK = { adv: 'adv', kit: 'kit', def: 'def', drv: 'drv', tak: 'tak', twr: 'twr', leg: 'leg', boat: 'boat', mov: 'mov', kite: 'kite', cin: 'cin', fart: 'fart', bed: 'bed', win: 'win', trap: 'trap', isle: 'isle', shop: 'shop', fish: 'fish' };
function bgmWanted() {
  if (!S.music || document.hidden) return null;
  if (S.mode === 'menu' || S.mode === 'clear' || !scr.title.hidden || !scr.online.hidden) return 'title';
  if (S.kind === 'mus') return null;                                   // the rhythm game's song is the music
  return MODE_TRACK[S.kind] || 'title';
}
function bgmTick() {
  const a = ac; if (!a || a.state !== 'running') return;
  const M = mixer(a), now = a.currentTime;
  if (S.mode !== BGM.prevMode) { if (S.mode === 'clear') BGM.hold = now + resultsJingle(); BGM.prevMode = S.mode; }
  if (S.banner > BGM.banner + .5 && S.mode === 'play' && S.sound) [784, 1175, 1568].forEach((f, i) => chime(f, .4, .03, i * .07));
  BGM.banner = S.banner || 0;
  const want = now >= BGM.hold ? bgmWanted() : null;
  if (want !== BGM.name) {
    M.mus.gain.cancelScheduledValues(now); M.mus.gain.setTargetAtTime(0, now, .12);
    BGM.name = want; BGM.tr = want ? trackPrep(TRACKS[want]) : null; BGM.step = 0; BGM.next = now + .5; BGM.fadeIn = true;
  }
  if (BGM.tr) {
    if (BGM.fadeIn && now >= BGM.next - .06) { M.mus.gain.setTargetAtTime(BGM.tr.vol, now, .35); BGM.fadeIn = false; }
    const paused = S.mode === 'paused';
    if (paused !== BGM.paused) { BGM.paused = paused; M.musLP.frequency.setTargetAtTime(paused ? 650 : 16000, now, .15); if (!BGM.fadeIn) M.mus.gain.setTargetAtTime(BGM.tr.vol * (paused ? .7 : 1), now, .2); }
    if (BGM.next < now - .3) BGM.next = now + .05;                     // after the tab slept: pick up from now
    while (BGM.next < now + .3) { try { bgmStep(a, M.mus, BGM.tr, BGM.step, BGM.next); } catch (e) {} BGM.next += stepDur(BGM.tr); BGM.step++; }
  }
  ambTick(a, M, now);
}
setInterval(bgmTick, 50);
// the end of a level: the stars pop with a ding each (in time with the screen), then a little fanfare; no stars, a soft "aww"
function resultsJingle() {
  if (!S.sound) return .8;
  const cs = $('#cStars'), lit = cs && !cs.hidden ? cs.querySelectorAll('span:not(.off)').length : -1;
  setTimeout(() => { try { sayBoth(lit < 0 || lit === 3 ? 'cheer' : lit > 0 ? 'happy' : 'sad', .25); } catch (e) {} }, lit < 0 ? 600 : 1300);
  if (lit < 0 && S.kind === 'adv') return 1.2;
  if (lit <= 0) { tone(523, .22, 'triangle', .05, 494); tone(440, .25, 'triangle', .05, 415, .22); tone(349, .6, 'triangle', .05, 330, .46); return 2.2; }
  for (let i = 0; i < 3; i++) { if (i < lit) chime([1047, 1319, 1568][i], .5, .06, .3 + i * .2); else tone(262, .12, 'triangle', .03, 0, .3 + i * .2); }
  const t0 = .3 + 3 * .2 + .12, notes = lit === 3 ? [523, 659, 784, 1047, 1319] : lit === 2 ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((f, i) => chime(f, .5, .04, t0 + i * .07));
  [523, 659, 784].forEach(f => tone(f, 1.3, 'triangle', .022, 0, t0 + .35));
  return t0 + 2;
}

/* the sound of each place: crickets at night, birds by day, the jungle, wind, water, a crowd, the air conditioner, the projector */
const AMB_OF = { adv: ['night'], def: ['night', 'wind'], drv: ['birds'], tak: ['birds'], twr: ['wind', 'birds'], leg: ['crowd', 'birds'], boat: ['water', 'crowd'], mov: ['birds'], kite: ['wind', 'birds'], cin: ['projector'], fart: ['crowd'], bed: ['hum', 'night'], win: ['night'], trap: ['birds', 'jungle'], isle: ['sea'], shop: ['crowd'], fish: ['water', 'birds'] };
function ambLayer(a, M, kind) {
  const s = a.createBufferSource(); s.buffer = noiseBuf(a); s.loop = true;
  const f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  g.gain.value = 0; let base = 0;
  if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = .6; base = .05; lfo.frequency.value = .12; lg.gain.value = 260; lfo.connect(lg).connect(f.frequency); }
  else if (kind === 'water') { f.type = 'lowpass'; f.frequency.value = 650; f.Q.value = .3; base = .06; lfo.frequency.value = .27; lg.gain.value = .022; lfo.connect(lg).connect(g.gain); }
  else if (kind === 'sea') { f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = .3; base = .07; lfo.frequency.value = .11; lg.gain.value = .045; lfo.connect(lg).connect(g.gain); }
  else if (kind === 'crowd') { f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 1.1; base = .045; lfo.frequency.value = .6; lg.gain.value = .014; lfo.connect(lg).connect(g.gain); }
  else if (kind === 'hum') { f.type = 'lowpass'; f.frequency.value = 230; f.Q.value = .4; base = .07; lfo.frequency.value = .05; lg.gain.value = .006; lfo.connect(lg).connect(g.gain); }
  else if (kind === 'projector') { f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 3; base = .012; lfo.frequency.value = 24; lg.gain.value = .005; lfo.connect(lg).connect(g.gain); }
  else return null;                                                     // birds and crickets are calls, not a loop
  s.connect(f).connect(g).connect(M.amb); s.start(0, Math.random()); lfo.start();
  g.gain.setTargetAtTime(base, a.currentTime, .8);
  return () => { g.gain.setTargetAtTime(0, a.currentTime, .3); setTimeout(() => { try { s.stop(); lfo.stop(); } catch (e) {} }, 1600); };
}
// a short call somewhere in the scene: a cricket's chirps, a bird's tweet, a drop on the water
function ambCall(a, M, f0, f1, d, v, at, pan) {
  const o = a.createOscillator(), g = a.createGain(), p = a.createStereoPanner ? a.createStereoPanner() : null;
  o.type = 'sine'; o.frequency.setValueAtTime(f0, at); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + d);
  g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(v, at + d * .25); g.gain.exponentialRampToValueAtTime(.0001, at + d);
  o.connect(g); if (p) { p.pan.value = pan; g.connect(p).connect(M.amb); } else g.connect(M.amb);
  o.start(at); o.stop(at + d + .02);
}
function ambTick(a, M, now) {
  const playing = S.mode === 'play' || S.mode === 'won' || S.mode === 'dying' || S.mode === 'paused';
  const kind = S.sound && playing && !document.hidden ? S.kind : null, want = kind ? AMB_OF[kind] || [] : [];
  if (kind !== BGM.ambKind) {
    for (const k in BGM.amb) BGM.amb[k] && BGM.amb[k]();
    BGM.amb = {}; BGM.ambKind = kind;
    for (const k of want) BGM.amb[k] = ambLayer(a, M, k);
    M.amb.gain.setTargetAtTime(kind ? 1 : 0, now, .5);
  }
  if (!kind) return;
  M.amb.gain.setTargetAtTime(S.mode === 'paused' ? .45 : 1, now, .3);
  const pan = () => Math.random() * 1.6 - .8;
  if (want.includes('night') && Math.random() < .07) { const f = 4200 + Math.random() * 600, at = now + .05, p = pan(), n = 2 + (Math.random() * 3 | 0), v = .006 + Math.random() * .007; for (let i = 0; i < n; i++) ambCall(a, M, f, f, .022, v, at + i * .05, p); }
  if (want.includes('birds') && Math.random() < .014) { const f = 2400 + Math.random() * 1200, at = now + .05, p = pan(), n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) ambCall(a, M, f * (1 + i * .04), f * 1.35, .06 + Math.random() * .03, .01, at + i * .09, p); }
  // the jungle: insects trilling, now and then a bird calling two notes far off
  if (want.includes('jungle')) {
    if (Math.random() < .02) { const f = 5200 + Math.random() * 900, at = now + .05, p = pan(), v = .004 + Math.random() * .004; for (let i = 0; i < 9; i++) ambCall(a, M, f, f, .018, v, at + i * .028, p); }
    if (Math.random() < .005) { const f = 700 + Math.random() * 300, at = now + .05, p = pan(); ambCall(a, M, f, f * 1.05, .22, .012, at, p); ambCall(a, M, f * .8, f * .78, .3, .011, at + .28, p); }
  }
  // the island: gulls by day, crickets once it is dark
  if (want.includes('sea')) {
    let dark = false; try { dark = Isle.night(MODES.isle.st.G); } catch (e) {}
    if (dark) { if (Math.random() < .07) { const f = 4200 + Math.random() * 600, at = now + .05, p = pan(), n = 2 + (Math.random() * 3 | 0), v = .006 + Math.random() * .007; for (let i = 0; i < n; i++) ambCall(a, M, f, f, .022, v, at + i * .05, p); } }
    else if (Math.random() < .006) { const at = now + .05, p = pan(), n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) ambCall(a, M, 1500 + Math.random() * 200, 1100, .16, .008, at + i * .2, p); }
  }
  if (want.includes('water') && Math.random() < .03) ambCall(a, M, 700 + Math.random() * 500, 1500 + Math.random() * 600, .05, .012, now + .05, pan());
}
// the first tap or key press is allowed to start the sound (browsers keep it asleep until then)
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (S.sound || S.music) audioCtx(); }, true);
// buttons and cards answer with a little note
document.addEventListener('click', e => {
  if (!S.sound) return;
  const b = e.target.closest('.tab.mode, .lv, .cta, .ghost, .hbtn'); if (!b || b.disabled) return;
  if (b.classList.contains('mode')) { const i = [...b.parentNode.querySelectorAll('.tab.mode')].indexOf(b), sc = [523, 587, 659, 784, 880]; chime(sc[i % 5] * (i >= 5 ? (i >= 10 ? 2 : 1.5) : 1), .3, .035); }
  else if (b.classList.contains('lv')) { chime(1047, .3, .035); chime(1568, .25, .02, .05); }
  else if (b.classList.contains('cta')) { chime(784, .3, .04); chime(1175, .4, .035, .06); }
  else tone(700, .05, 'triangle', .03);
}, true);
/* ---------- end of the music ---------- */

/* ---------- Helpers ---------- */
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// a colour pushed toward white (k > 0) or black (k < 0)
function hexMix(hex, k) { const n = parseInt(hex.slice(1), 16), t = k < 0 ? 0 : 255, a = Math.abs(k), f = c => Math.round(c + (t - c) * a); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; }
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

/* ---------- a little art kit: the two characters' faces and things, soft panels ---------- */
const LITE = { pink: '#ffb8cf', mint: '#a9f2de' };
// big shiny eyes, rosy cheeks, a small mouth; x, ey: between the eyes; face: -1..1 which way they look; k: size
function cuteFace(g, x, ey, face, t, pink, mood, k = 1, lookY = 0, who = '') {
  const blink = ((t + (pink ? 0 : 1.7)) % 3.6) < .12;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const ex = x + s * 5 * k;
    if (mood === 'happy' || mood === 'sleep' || blink) {
      g.strokeStyle = C.ink; g.lineWidth = 1.6 * k; g.beginPath();
      if (mood === 'happy') g.arc(ex, ey + 1.6 * k, 2.8 * k, Math.PI * 1.15, Math.PI * 1.85);
      else if (mood === 'sleep') g.arc(ex, ey - .6 * k, 2.8 * k, Math.PI * .15, Math.PI * .85);
      else { g.moveTo(ex - 3 * k, ey + .5 * k); g.lineTo(ex + 3 * k, ey + .5 * k); }
      g.stroke(); continue;
    }
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, 3.9 * k, 4.7 * k, 0, 0, Math.PI * 2); g.fill();
    const px = ex + face * 1.2 * k, py = ey + (.7 + lookY * 1.4) * k;
    g.fillStyle = '#2a1f4a'; g.beginPath(); g.ellipse(px, py, 2.7 * k, 3.2 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a3b78'; g.beginPath(); g.ellipse(px, py + 1.4 * k, 1.8 * k, 1.3 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 1 * k, py - 1.2 * k, 1.15 * k, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(px + 1 * k, py + 1.1 * k, .55 * k, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = pink ? 'rgba(255,128,170,.55)' : 'rgba(255,112,150,.62)';
  g.beginPath(); g.ellipse(x - 8.6 * k, ey + 5.4 * k, 2.8 * k, 1.7 * k, 0, 0, Math.PI * 2); g.ellipse(x + 8.6 * k, ey + 5.4 * k, 2.8 * k, 1.7 * k, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 1.25 * k; g.beginPath();
  if (mood === 'o') { g.fillStyle = C.ink; g.ellipse(x + face * .6 * k, ey + 6.4 * k, 1.5 * k, 1.9 * k, 0, 0, Math.PI * 2); g.fill(); }
  else if (mood === 'sad') { g.arc(x + face * .6 * k, ey + 7.6 * k, 2 * k, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (mood !== 'none') { g.arc(x + face * .6 * k, ey + 4.4 * k, 2 * k, Math.PI * .18, Math.PI * .82); g.stroke(); }
  if (who) wearFace(g, who, x, ey, k, face, t);
}
// pink's bow: two puffy loops, a knot and a shine
function cuteBow(g, x, y, k = 1) {
  if (wearHat(g, 'pink', x - 5.5 * k, y, k)) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = '#d99520';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 4, -7.5, s * 9.5, -6.5, s * 9, 0); g.bezierCurveTo(s * 9.5, 6, s * 4, 6.5, 0, 0); g.fill(); }
  g.fillStyle = C.gold;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -.4); g.bezierCurveTo(s * 3.6, -6.4, s * 8.2, -5.4, s * 7.8, -.6); g.bezierCurveTo(s * 8, 3.8, s * 3.6, 4.6, 0, -.4); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.65)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 4.6, -2.8, 1.7, .9, s * .45, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#d99520'; g.beginPath(); g.arc(0, 0, 2.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe39a'; g.beginPath(); g.arc(-.6, -.7, 1.05, 0, Math.PI * 2); g.fill();
  g.restore();
}
// mint's sprout: a little stem with two leaves that sway
function cuteSprout(g, x, y, k = 1, t = 0) {
  if (wearHat(g, 'mint', x, y - k, k * .93, t || S.time)) return;
  g.save(); g.translate(x, y); g.scale(k, k); g.rotate(Math.sin(t * 2.2) * .14);
  g.strokeStyle = '#3f8f4a'; g.lineWidth = 1.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(1.2, -4, -.4, -7.4); g.stroke();
  g.fillStyle = '#5fae55'; g.beginPath(); g.ellipse(-3.6, -6.6, 3.8, 2, .6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7cc46d'; g.beginPath(); g.ellipse(4, -8.4, 5.6, 2.9, -.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .8; g.beginPath(); g.moveTo(0, -7.4); g.lineTo(7.4, -10.2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(2.6, -9.6, 1.6, .7, -.5, 0, Math.PI * 2); g.fill();
  g.restore();
}
// a name over someone's head: a little rounded tag with a point
function nameTag(g, name, x, y, col) {
  if (!name) return;
  g.font = `600 10.5px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const w = g.measureText(name).width + 12;
  g.fillStyle = 'rgba(21,17,46,.72)';
  rr(g, x - w / 2, y - 11.5, w, 15, 7.5); g.fill();
  g.beginPath(); g.moveTo(x - 3.5, y + 3.4); g.lineTo(x + 3.5, y + 3.4); g.lineTo(x, y + 7); g.closePath(); g.fill();
  g.fillStyle = col; g.fillText(name, x, y);
}
// a round body seen from above (the kitchen and the night defence): shading, a rim, a shine
function roundBody(g, x, y, r, id, flash, arm) {
  const col = id === 'pink' ? C.pink : C.mint, dark = id === 'pink' ? C.pinkD : C.mintD;
  if (arm != null) for (const s of [-1, 1]) {
    const sw = Math.sin(arm + (s > 0 ? 0 : Math.PI)) * r * .2;
    g.fillStyle = dark; g.beginPath(); g.ellipse(x + s * r * .92, y + r * .2 + sw, r * .3, r * .36, s * .5, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x + s * r * .98, y + r * .24 + sw, r * .19, r * .24, s * .5, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = dark; g.beginPath(); g.arc(x, y + 3, r, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(x - r * .35, y - r * .45, r * .15, x, y, r * 1.05);
  gr.addColorStop(0, flash ? '#ffffff' : LITE[id]); gr.addColorStop(.55, flash ? '#ffffff' : col); gr.addColorStop(1, flash ? '#f2eeff' : dark);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = hexA(dark, .9); g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r * .45, y - r * .5, r * .2, r * .3, -.6, 0, Math.PI * 2); g.fill();
}
/* ---------- the wardrobe: hats, glasses and neck things the two of them wear in every mode ---------- */
// stars from every mode add up; each thing opens at a number of stars (nothing is spent)
const WARD_SLOTS = [['h', 'หมวก'], ['f', 'หน้า'], ['n', 'คอ']];
const WARD_ITEMS = {
  h: [['straw', 'หมวกสาน', 3], ['party', 'หมวกปาร์ตี้', 6], ['flower', 'มงกุฎดอกไม้', 10], ['cap', 'หมวกแก๊ปสีคู่', 15], ['cat', 'หูแมว', 20],
      ['beanie', 'หมวกไหมพรม', 26], ['bunny', 'หูกระต่าย', 32], ['witch', 'หมวกแม่มด', 40], ['crown', 'มงกุฎ', 55], ['halo', 'วงแหวนนางฟ้า', 75]],
  f: [['round', 'แว่นกลม', 2], ['sun', 'แว่นกันแดด', 8], ['heart', 'แว่นหัวใจ', 13], ['stache', 'หนวดเฟิ้ม', 18], ['star', 'สติกเกอร์ดาว', 24],
      ['mono', 'แว่นข้างเดียว', 36], ['patch', 'ผ้าปิดตาโจรสลัด', 46]],
  n: [['scarf', 'ผ้าพันคอสีคู่', 4], ['bowtie', 'หูกระต่ายผูกคอ', 9], ['lei', 'พวงมาลัยดอกไม้', 16], ['bell', 'กระดิ่งแมว', 22], ['pearl', 'สร้อยมุก', 30],
      ['tie', 'เนกไท', 38], ['cape', 'ผ้าคลุมฮีโร่', 50], ['medal', 'เหรียญทอง', 65]]
};
const WARD_ALL = Object.entries(WARD_ITEMS).flatMap(([s, l]) => l.map(([id, name, need]) => ({ slot: s, id, name, need })));
const wardItem = (slot, id) => WARD_ALL.find(it => it.slot === slot && it.id === id) || null;
const WARD_NONE = { h: '', f: '', n: '' };
const WARD = { eq: { pink: { ...WARD_NONE }, mint: { ...WARD_NONE } }, over: null };
(function loadWard() {
  const s = store.get('ward', null);
  if (s && typeof s === 'object') for (const id of ['pink', 'mint']) for (const [k] of WARD_SLOTS) {
    const v = s[id] && s[id][k];
    if (typeof v === 'string' && wardItem(k, v)) WARD.eq[id][k] = v;
  }
})();
// every best star from every mode, plus one for each three hearts of the adventure
function wardStars() {
  let n = 0;
  try {
    n += Math.floor(ALL.reduce((a, l) => a + (prog.h[l.name] || 0), 0) / 3);
    for (const [L, best] of [[KLEVELS, kBest], [DLEVELS, dBest], [RLEVELS, rBest], [TLEVELS, tBest], [MLEVELS, mBest], [WLEVELS, wBest], [LLEVELS, lBest], [BLEVELS, bBest], [VLEVELS, vBest], [ILEVELS, iBest]])
      n += L.reduce((a, l, i) => a + ((best(i) || {}).s || 0), 0);
    for (const m of Object.values(MODES)) n += m.L.reduce((a, l, i) => a + ((m.best(i) || {}).s || 0), 0);
  } catch (e) {}
  return n;
}
const wardOpen = it => !!it && wardStars() >= it.need;
// what someone has on: online, the other one's comes from their own device
function wearOf(id) {
  if (WARD.over && WARD.over[id]) return WARD.over[id];
  if (typeof O !== 'undefined' && O.role && id !== O.local) return O.partnerWear || WARD_NONE;
  return WARD.eq[id];
}
// how much higher a name tag goes over a tall hat
const WARD_TALL = { party: 13, witch: 14, bunny: 15, halo: 5, crown: 5, beanie: 4, cat: 4 };
const wardLift = id => WARD_TALL[wearOf(id).h] || 0;
const wardCode = id => { const w = WARD.eq[id]; return `${w.h}.${w.f}.${w.n}`; };
function wardParse(s) {
  const out = { ...WARD_NONE };
  if (typeof s !== 'string' || s.length > 40) return out;
  const p = s.split('.');
  WARD_SLOTS.forEach(([k], i) => { if (p[i] && wardItem(k, p[i])) out[k] = p[i]; });
  return out;
}
function wardSave() { store.set('ward', WARD.eq); }

// ---- drawing: each thing is drawn around an anchor, at a size k (1 = the platform hero) ----
// hats: (x, y) is the top middle of the head
function wearHat(g, who, x, y, k, t = S.time) {
  const id = wearOf(who).h; if (!id) return false;
  const pink = who === 'pink', col = pink ? C.pink : C.mint, other = pink ? C.mint : C.pink, otherD = pink ? C.mintD : C.pinkD;
  g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  if (id === 'straw') {
    g.fillStyle = '#c99a3e'; g.beginPath(); g.ellipse(0, .6, 16.5, 4.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f0cf78'; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8c165'; g.beginPath(); g.ellipse(0, -3, 9, 7.5, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#e8574f'; g.fillRect(-9, -3.4, 18, 2.6);
    g.strokeStyle = 'rgba(150,100,30,.45)'; g.lineWidth = .7;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 3.2, -9.5 + Math.abs(i) * .9); g.lineTo(i * 3.6, -3.6); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-3.5, -7, 2.6, 1.3, -.3, 0, Math.PI * 2); g.fill();
  } else if (id === 'party') {
    g.rotate(.18);
    g.beginPath(); g.moveTo(-8, 1); g.lineTo(8, 1); g.lineTo(0, -21); g.closePath();
    g.fillStyle = '#7d6bff'; g.fill(); g.save(); g.clip();
    g.fillStyle = C.gold; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-12, -4 - i * 6); g.lineTo(12, -9 - i * 6); g.lineTo(12, -6 - i * 6); g.lineTo(-12, -1 - i * 6); g.fill(); }
    g.restore();
    g.fillStyle = '#fff'; for (const [a, b] of [[-3, -5], [2, -10], [-1, -15]]) { g.beginPath(); g.arc(a, b, .9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = C.pink; g.beginPath(); g.arc(0, -21.5, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd1e0'; g.beginPath(); g.arc(-.8, -22.4, 1.1, 0, Math.PI * 2); g.fill();
  } else if (id === 'flower') {
    g.strokeStyle = '#4f9a4a'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 1, 12.5, 3.2, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
    const cols = ['#ff7aa8', '#ffd25a', '#ffffff', '#b98cff', '#ff9a5c'];
    for (let i = -2; i <= 2; i++) {
      const fx = i * 5.4, fy = -1.2 + Math.abs(i) * .7, c = cols[(i + 2) % 5];
      g.fillStyle = '#5fae55'; g.beginPath(); g.ellipse(fx + 2.6, fy + 1.4, 2, 1, .5, 0, Math.PI * 2); g.fill();
      g.fillStyle = c; for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + i; g.beginPath(); g.arc(fx + Math.cos(a) * 1.9, fy + Math.sin(a) * 1.9, 1.6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffe37a'; g.beginPath(); g.arc(fx, fy, 1.1, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'cap') {
    g.fillStyle = hexA(otherD, 1); g.beginPath(); g.ellipse(7, .4, 10, 3, .08, 0, Math.PI * 2); g.fill();
    const gr = g.createLinearGradient(0, -11, 0, 1); gr.addColorStop(0, LITE[pink ? 'mint' : 'pink']); gr.addColorStop(1, other);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 1, 11.5, 11, 0, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = hexA(otherD, .8); g.lineWidth = .8; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 1); g.stroke();
    g.fillStyle = '#fff'; rr(g, -4, -6, 8, 4.5, 1.5); g.fill(); g.fillStyle = col; heartPath(g, 0, -3.9, 1.8); g.fill();
    g.fillStyle = otherD; g.beginPath(); g.arc(0, -10.2, 1.5, 0, Math.PI * 2); g.fill();
  } else if (id === 'cat') {
    for (const s of [-1, 1]) {
      g.fillStyle = pink ? C.pinkD : C.mintD; g.beginPath(); g.moveTo(s * 2.5, 2); g.lineTo(s * 12.5, 2.5); g.lineTo(s * 10, -11); g.closePath(); g.fill();
      g.fillStyle = col; g.beginPath(); g.moveTo(s * 3.5, 2); g.lineTo(s * 11.5, 2.2); g.lineTo(s * 9.6, -9.6); g.closePath(); g.fill();
      g.fillStyle = '#ff9ec0'; g.beginPath(); g.moveTo(s * 5.6, 1.2); g.lineTo(s * 9.8, 1.4); g.lineTo(s * 9, -5.5); g.closePath(); g.fill();
    }
  } else if (id === 'beanie') {
    g.fillStyle = '#ff8a5c'; g.beginPath(); g.ellipse(0, 0, 11.8, 11.5, 0, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,60,30,.35)'; g.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3, -.5); g.quadraticCurveTo(i * 3.4, -6, i * 2, -10.6 + Math.abs(i) * .6); g.stroke(); }
    g.fillStyle = '#ffd27a'; rr(g, -12.6, -3.2, 25.2, 5.4, 2.6); g.fill();
    g.strokeStyle = 'rgba(190,130,40,.5)'; g.lineWidth = .8; for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(i * 2.2, -2.6); g.lineTo(i * 2.2, 1.6); g.stroke(); }
    g.fillStyle = '#fff4dc'; for (const [a, b, r] of [[0, -12.5, 3.6], [-2, -14, 2], [2.2, -13.6, 2]]) { g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); }
  } else if (id === 'bunny') {
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 5, -1); g.rotate(s * .2 + (s > 0 ? Math.sin(t * 2) * .08 : 0));
      g.fillStyle = '#e9e4f5'; g.beginPath(); g.ellipse(0, -10, 4.2, 11.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-.3, -10.4, 3.8, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffb3cc'; g.beginPath(); g.ellipse(0, -9.5, 2, 8, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  } else if (id === 'witch') {
    g.fillStyle = '#2a1f52'; g.beginPath(); g.ellipse(0, .4, 17, 4.4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3b2a6b'; g.beginPath(); g.moveTo(-8.5, -.5); g.quadraticCurveTo(-4, -14, 1, -20); g.quadraticCurveTo(7, -25, 12, -21); g.quadraticCurveTo(6, -19, 4, -13); g.lineTo(8.5, -.5); g.closePath(); g.fill();
    g.fillStyle = '#8f6be0'; g.beginPath(); g.moveTo(-8.4, -.8); g.lineTo(8.4, -.8); g.lineTo(7.4, -4.4); g.lineTo(-7.2, -4.4); g.closePath(); g.fill();
    g.strokeStyle = C.gold; g.lineWidth = 1.1; g.strokeRect(-2, -4, 4, 3);
    g.fillStyle = C.gold; twinkle(g, -3, -11, 1.8); twinkle(g, 3.5, -15, 1.2);
  } else if (id === 'crown') {
    g.beginPath(); g.moveTo(-10, 1); g.lineTo(10, 1); g.lineTo(11, -9); g.lineTo(5.5, -4); g.lineTo(0, -12); g.lineTo(-5.5, -4); g.lineTo(-11, -9); g.closePath();
    const gr = g.createLinearGradient(0, -12, 0, 1); gr.addColorStop(0, '#fff0a6'); gr.addColorStop(.5, '#ffcf4d'); gr.addColorStop(1, '#d99520');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#b5761a'; g.lineWidth = .9; g.stroke();
    g.fillStyle = '#d99520'; g.fillRect(-10, -2, 20, 2.4);
    for (const [a, b, c] of [[-11, -9.5, '#ff6b9a'], [0, -12.6, '#4fe0bf'], [11, -9.5, '#ff6b9a']]) { g.fillStyle = c; g.beginPath(); g.arc(a, b, 1.7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#7d6bff'; g.beginPath(); g.arc(0, -.8, 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; twinkle(g, -4 + Math.sin(t * 1.3) * 2, -6, 1.6);
  } else if (id === 'halo') {
    const hy = -8 + Math.sin(t * 2.4) * 1.4;
    g.strokeStyle = 'rgba(255,224,120,.28)'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, hy, 10.5, 3.4, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ffe27a'; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = '#fff7cf'; g.lineWidth = .8; g.beginPath(); g.ellipse(0, hy - .6, 9, 2.6, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    g.fillStyle = '#fff4b0'; twinkle(g, 9 + Math.sin(t * 3) * 1.5, hy - 4, 1.4);
  }
  g.restore();
  return true;
}
// glasses and such: (x, ey) is between the eyes (they sit at ±5); then whatever is round the neck below
function wearFace(g, who, x, ey, k, face, t) {
  const w = wearOf(who);
  if (w.f) {
    const id = w.f;
    g.save(); g.translate(x, ey); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
    if (id === 'round') {
      g.fillStyle = 'rgba(200,230,255,.16)'; g.strokeStyle = '#5a3a24'; g.lineWidth = 1.15;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 5, .3, 4.7, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.beginPath(); g.moveTo(-.7, -.3); g.quadraticCurveTo(0, -1.4, .7, -.3); g.moveTo(-9.6, -.5); g.lineTo(-11.6, -1.4); g.moveTo(9.6, -.5); g.lineTo(11.6, -1.4); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .7; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 5, .3, 3.4, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); }
    } else if (id === 'sun') {
      g.fillStyle = '#1d1838'; for (const s of [-1, 1]) { rr(g, s * 5 - 4.8, -3.4, 9.6, 6.6, 2.8); g.fill(); }
      g.strokeStyle = '#1d1838'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-.4, -1.6); g.lineTo(.4, -1.6); g.moveTo(-9.6, -2); g.lineTo(-11.8, -2.6); g.moveTo(9.6, -2); g.lineTo(11.8, -2.6); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 5 - 3.2, 1.6); g.lineTo(s * 5 - .6, -2.4); g.lineTo(s * 5 + .8, -2.4); g.lineTo(s * 5 - 1.8, 1.6); g.fill(); }
    } else if (id === 'heart') {
      for (const s of [-1, 1]) { g.fillStyle = '#c42a63'; heartPath(g, s * 5, .2, 5.6); g.fill(); g.fillStyle = '#ff4f8b'; heartPath(g, s * 5, -.1, 4.9); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(s * 5 - 1.8, -1.8, 1.3, .7, -.5, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#c42a63'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-.6, -1.2); g.lineTo(.6, -1.2); g.stroke();
    } else if (id === 'stache') {
      g.fillStyle = '#4a2e1c';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 3.2); g.bezierCurveTo(s * 2.5, 1.6, s * 6.5, 1.9, s * 8, 4.6); g.bezierCurveTo(s * 8.6, 5.6, s * 7.2, 6.4, s * 6.6, 5.2); g.bezierCurveTo(s * 5, 4.4, s * 2.4, 5.4, 0, 4.6); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-3.4, 3, 1.6, .5, -.2, 0, Math.PI * 2); g.fill();
    } else if (id === 'star') {
      const tw = 1 + Math.sin(t * 3) * .08;
      g.fillStyle = '#d99520'; starPath(g, 9.4, 4.6, 3.3 * tw); g.fill();
      g.fillStyle = '#ffd94d'; starPath(g, 9.4, 4.4, 2.7 * tw); g.fill();
      g.fillStyle = '#ff7aa8'; heartPath(g, -9.6, 5.2, 1.9); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(8.6, 3.6, .7, 0, Math.PI * 2); g.fill();
    } else if (id === 'mono') {
      g.fillStyle = 'rgba(210,235,255,.22)'; g.strokeStyle = '#d99520'; g.lineWidth = 1.3;
      g.beginPath(); g.arc(5, .3, 5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = .7; g.strokeStyle = '#ffcf4d'; g.beginPath(); g.moveTo(9.4, 2.6); g.quadraticCurveTo(12 + Math.sin(t * 2) * .6, 8, 9.5, 12); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(5, .3, 3.6, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    } else if (id === 'patch') {
      g.strokeStyle = '#1d1838'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-12, -4.6); g.quadraticCurveTo(-5, -6.2, 1, -4.4); g.lineTo(12.2, -1.4); g.stroke();
      g.fillStyle = '#1d1838'; g.beginPath(); g.ellipse(-5, .2, 4.9, 4.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `700 4.6px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('☠', -5, .4); g.textBaseline = 'alphabetic';
    }
    g.restore();
  }
  if (w.n) wearNeck(g, w.n, who, x, ey + 9 * k, k, t);
}
// round the neck: (x, y) is the middle of the neck, about 11 either side to the body's edge
function wearNeck(g, id, who, x, y, k, t) {
  const pink = who === 'pink', other = pink ? C.mint : C.pink, otherD = pink ? C.mintD : C.pinkD;
  g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  if (id === 'scarf') {
    g.fillStyle = otherD; g.save(); g.translate(5, 1); g.rotate(-.12 + Math.sin(t * 2.2) * .06); rr(g, -2.4, 0, 5, 9, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-2.4, 6, 5, 1); g.restore();
    g.fillStyle = other; rr(g, -10.5, -2.4, 21, 5, 2.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = -8; i <= 8; i += 4) g.fillRect(i, -2.4, 1.2, 5);
  } else if (id === 'bowtie') {
    g.fillStyle = '#c4303f'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 6, -3.6); g.quadraticCurveTo(s * 7, 0, s * 6, 3.6); g.closePath(); g.fill(); }
    g.fillStyle = '#e8574f'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -.2); g.lineTo(s * 5.2, -2.8); g.lineTo(s * 5.2, 1.8); g.closePath(); g.fill(); }
    g.fillStyle = '#a01f30'; rr(g, -1.6, -1.8, 3.2, 3.6, 1.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 3.6, -.6, .6, 0, Math.PI * 2); g.fill(); }
  } else if (id === 'lei') {
    const cols = ['#ff7aa8', '#ffd25a', '#ffffff', '#ff9a5c', '#b98cff'];
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * (.12 + i / 6 * .76), fx = Math.cos(a) * 10.5, fy = Math.sin(a) * 4.6 - 2.4;
      g.fillStyle = cols[i % 5]; for (let p = 0; p < 5; p++) { const b = p / 5 * Math.PI * 2 + i; g.beginPath(); g.arc(fx + Math.cos(b) * 1.6, fy + Math.sin(b) * 1.6, 1.4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffe37a'; g.beginPath(); g.arc(fx, fy, .8, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'bell') {
    g.fillStyle = '#d83a4a'; rr(g, -10.5, -2, 21, 3.6, 1.8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-9, -1.6, 18, .8);
    const sw = Math.sin(t * 5) * .18;
    g.save(); g.translate(0, 1.4); g.rotate(sw);
    const gr = g.createRadialGradient(-1, 2, .5, 0, 3, 4); gr.addColorStop(0, '#fff3a6'); gr.addColorStop(1, '#d99520');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 3.2, 3.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a5a12'; g.lineWidth = .8; g.beginPath(); g.moveTo(-2.4, 3.6); g.lineTo(2.4, 3.6); g.stroke(); g.fillStyle = '#8a5a12'; g.beginPath(); g.arc(0, 5, .8, 0, Math.PI * 2); g.fill();
    g.restore();
  } else if (id === 'pearl') {
    for (let i = 0; i <= 9; i++) {
      const a = Math.PI * (.1 + i / 9 * .8), px = Math.cos(a) * 10, py = Math.sin(a) * 5 - 2.6;
      g.fillStyle = '#e6e0f0'; g.beginPath(); g.arc(px, py, 1.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(px - .5, py - .5, .7, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ff9ec0'; g.beginPath(); g.arc(0, 3.4, 2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-.6, 2.8, .7, 0, Math.PI * 2); g.fill();
  } else if (id === 'tie') {
    g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -1); g.lineTo(s * 5.4, -2.6); g.lineTo(s * 3, 1.6); g.closePath(); g.fill(); }
    g.fillStyle = '#2f3f91'; g.beginPath(); g.moveTo(-1.8, -1.6); g.lineTo(1.8, -1.6); g.lineTo(1.2, 1.2); g.lineTo(-1.2, 1.2); g.closePath(); g.fill();
    g.fillStyle = '#3b4fa8'; g.beginPath(); g.moveTo(-1.1, 1.2); g.lineTo(1.1, 1.2); g.lineTo(2.8, 8); g.lineTo(0, 10.6); g.lineTo(-2.8, 8); g.closePath(); g.fill();
    g.strokeStyle = C.gold; g.lineWidth = .8; for (const yy of [3.6, 6.4]) { g.beginPath(); g.moveTo(-1.8, yy); g.lineTo(1.8, yy + 1.4); g.stroke(); }
  } else if (id === 'cape') {
    const fl = Math.sin(t * 3) * 1.2;
    g.fillStyle = '#a81f33'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 8, -2); g.quadraticCurveTo(s * (15 + fl), 3, s * (16 + fl), 11); g.lineTo(s * 10.5, 9); g.closePath(); g.fill(); }
    g.fillStyle = '#d83a4a'; rr(g, -11, -2.8, 22, 4.4, 2.2); g.fill();
    g.fillStyle = '#ff7a8a'; g.fillRect(-9.5, -2.4, 19, .9);
    g.fillStyle = C.gold; starPath(g, 0, -.6, 3); g.fill();
  } else if (id === 'medal') {
    g.strokeStyle = '#3b6fd8'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-7, -2.4); g.lineTo(-1, 4.6); g.stroke();
    g.strokeStyle = '#e8574f'; g.beginPath(); g.moveTo(7, -2.4); g.lineTo(1, 4.6); g.stroke();
    const gr = g.createRadialGradient(-1, 5.6, .5, 0, 6.8, 4.2); gr.addColorStop(0, '#fff3a6'); gr.addColorStop(1, '#d99520');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 7, 3.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b5761a'; starPath(g, 0, 7.1, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; twinkle(g, 2.4 + Math.sin(t * 2) * .5, 4.6, 1.1);
  }
  g.restore();
}
function starPath(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  g.closePath();
}
// a standing doll for the wardrobe screen and its icons: the platform hero's shape, with what it has on
function wardDoll(g, id, x, y, k, t, wear, face = 0, mood = '') {
  const was = WARD.over, nm = S.names; WARD.over = { [id]: wear || WARD.eq[id] }; S.names = { pink: '', mint: '' };
  g.save(); g.translate(x, y); g.scale(k, k);
  try { drawPlayer(g, { id, x: -12, y: -29, w: 24, h: 29, face, walk: 0, sq: 0, mood }, t); } finally { g.restore(); WARD.over = was; S.names = nm; }
}

// ---- the wardrobe screen ----
const WS_UI = { who: 'pink', slot: 'h', raf: 0, seenAtOpen: 0 };
function wardNewCount() { const seen = store.get('wardSeen', 0), n = wardStars(); return WARD_ALL.filter(it => it.need <= n && it.need > seen).length; }
function wardBadge() {
  const n = wardStars(), el = $('#wardStars'); if (el) el.textContent = th(n);
  const b = $('#wardNew'); if (b) { const c = wardNewCount(); b.hidden = !c; b.textContent = c ? `ใหม่ ${th(c)}` : ''; }
}
// after a level: tell them when they have opened something new
function wardCheck() {
  const n = wardStars(), told = store.get('wardTold', null);
  if (told == null) { store.set('wardTold', n); wardBadge(); return; }
  const fresh = WARD_ALL.filter(it => it.need <= n && it.need > told);
  if (fresh.length) {
    store.set('wardTold', n);
    toast(`<b>ตู้เสื้อผ้า</b> ได้ของใหม่ ${fresh.slice(0, 3).map(it => it.name).join(' · ')}${fresh.length > 3 ? ` และอีก ${th(fresh.length - 3)} ชิ้น` : ''} <span class="tsub">ไปแต่งตัวกันที่ปุ่มตู้เสื้อผ้าหน้าแรก</span>`, 5200);
    try { chime(784, .3, .04); chime(1047, .4, .04, .12); } catch (e) {}
  }
  wardBadge();
}
function openWard() {
  WS_UI.seenAtOpen = store.get('wardSeen', 0);
  if (O.role) WS_UI.who = O.local;
  showScreen('ward'); renderWard();
  store.set('wardSeen', Math.max(WS_UI.seenAtOpen, wardStars())); store.set('wardTold', Math.max(store.get('wardTold', 0) || 0, wardStars()));
  wardBadge();
  cancelAnimationFrame(WS_UI.raf);
  const loop = now => { if (scr.ward.hidden) return; drawWardStage(now / 1000); WS_UI.raf = requestAnimationFrame(loop); };
  WS_UI.raf = requestAnimationFrame(loop);
}
function closeWard() { cancelAnimationFrame(WS_UI.raf); showScreen('title'); }
function drawWardStage(t) {
  const cv = $('#wardCv'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 150;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  // a little stage: a spotlight on each, a soft floor
  const fy = H * .82, k = Math.min(H / 72, W / 124);
  const fl = g.createLinearGradient(0, fy - 10, 0, H); fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(1, 'rgba(255,255,255,.07)'); g.fillStyle = fl; g.fillRect(0, fy - 10, W, H);
  for (const [id, sx] of [['pink', W / 2 - 26 * k], ['mint', W / 2 + 26 * k]]) {
    const on = id === WS_UI.who, sp = g.createRadialGradient(sx, fy, 2, sx, fy - 20 * k, 40 * k);
    sp.addColorStop(0, on ? 'rgba(255,224,140,.32)' : 'rgba(255,255,255,.08)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp; g.beginPath(); g.ellipse(sx, fy - 16 * k, 34 * k, 42 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = on ? 'rgba(255,207,90,.5)' : 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(sx, fy + 1, 19 * k, 4 * k, 0, 0, Math.PI * 2); g.fill();
    const hop = on ? Math.max(0, Math.sin(t * 5)) * 1.2 * k * (((t * .8) % 3) < .6 ? 1 : 0) : 0;
    wardDoll(g, id, sx, fy - hop, k * 1.1, t, wearOf(id), id === 'pink' ? .5 : -.5, on ? 'happy' : '');
  }
  if (Math.sin(t * 1.3) > .2) { g.fillStyle = C.pink; heartPath(g, W / 2, fy - 50 * k + Math.sin(t * 2) * 3, 4 * k); g.fill(); }
}
function wardIcon(it, id) {
  const c = document.createElement('canvas'), s = 64, dpr = 2; c.width = s * dpr; c.height = s * dpr; c.className = 'wico';
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const wear = { ...WARD_NONE }; if (it) wear[it.slot] = it.id;
  const k = it && it.slot === 'h' ? 1.35 : 1.75, y = it && it.slot === 'h' ? 60 : it && it.slot === 'n' ? 50 : 62;
  wardDoll(g, id, 32, y, k, .8, wear, 0, '');
  return c;
}
function renderWard() {
  const id = WS_UI.who, n = wardStars();
  $('#wardTotal').textContent = th(n);
  document.querySelectorAll('#sWard .wwho').forEach(b => { const on = b.dataset.who === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = !!O.role && b.dataset.who !== O.local; });
  document.querySelectorAll('#sWard .wslot').forEach(b => { const on = b.dataset.slot === WS_UI.slot; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  const grid = $('#wardGrid'); grid.innerHTML = '';
  const cur = WARD.eq[id][WS_UI.slot];
  const items = [null, ...WARD_ITEMS[WS_UI.slot].map(([iid]) => wardItem(WS_UI.slot, iid))];
  for (const it of items) {
    const open = !it || n >= it.need, on = it ? cur === it.id : !cur, fresh = it && open && it.need > WS_UI.seenAtOpen;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'witem' + (on ? ' on' : '') + (open ? '' : ' locked');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.appendChild(wardIcon(it, id));
    const nm = document.createElement('span'); nm.className = 'wnm'; nm.textContent = it ? it.name : 'ไม่ใส่'; b.appendChild(nm);
    if (!open) { const l = document.createElement('span'); l.className = 'wlock'; l.textContent = `★ ${th(it.need)}`; b.appendChild(l); b.title = `ต้องมีดาวรวม ${th(it.need)} ดวง`; }
    if (fresh) { const f = document.createElement('span'); f.className = 'new'; f.textContent = 'ใหม่'; b.appendChild(f); }
    b.addEventListener('click', () => {
      if (!open) { toast(`ยังล็อกอยู่ ต้องมีดาวรวม <b>${th(it.need)}</b> ดวง (ตอนนี้ ${th(n)}) เล่นโหมดไหนก็ได้ดาวมาเพิ่ม`, 3200); try { tone(220, .12, 'triangle', .03); } catch (e) {} return; }
      WARD.eq[id][WS_UI.slot] = it ? it.id : ''; wardSave(); renderWard();
      try { say(id, it ? (['happy', 'giggle', 'love'][Math.floor(Math.random() * 3)]) : 'hmm', 0, true); } catch (e) {}
      try { chime(it ? 880 : 523, .25, .035); } catch (e) {}
    });
    grid.appendChild(b);
  }
  const sum = WARD_ALL.filter(it => n >= it.need).length;
  $('#wardCount').textContent = `เปิดแล้ว ${th(sum)}/${th(WARD_ALL.length)} ชิ้น`;
  const next = WARD_ALL.filter(it => it.need > n).sort((a, b) => a.need - b.need)[0];
  $('#wardNext').textContent = next ? `ชิ้นต่อไป ${next.name} อีก ${th(next.need - n)} ดาว` : 'ครบทุกชิ้นแล้ว เก่งมากทั้งคู่!';
}
document.querySelectorAll('#sWard .wwho').forEach(b => b.addEventListener('click', () => { WS_UI.who = b.dataset.who; renderWard(); }));
document.querySelectorAll('#sWard .wslot').forEach(b => b.addEventListener('click', () => { WS_UI.slot = b.dataset.slot; renderWard(); }));
$('#bWard').addEventListener('click', openWard);
$('#bWardBack').addEventListener('click', closeWard);
$('#bWardOff').addEventListener('click', () => { WARD.eq[WS_UI.who] = { ...WARD_NONE }; wardSave(); renderWard(); });
document.addEventListener('keydown', e => { if (e.code === 'Escape' && scr.ward && !scr.ward.hidden) { e.preventDefault(); closeWard(); } });
// "pick for us": the cards light up one after another and slow down on tonight's game
const PICK_SAY = ['คืนนี้เล่น', 'ดวงบอกว่าต้อง', 'ลูกเต๋าเลือกแล้ว', 'ไม่ต้องเถียงกัน เล่น'];
function randomMode() {
  if (WS_UI.rolling) return;
  const cards = [...document.querySelectorAll('.tabs.modes .tab.mode')];
  if (!cards.length) return;
  const pool = cards.filter(b => b.dataset.tab !== S.tab), end = pool[Math.floor(Math.random() * pool.length)] || cards[0];
  const steps = 13, seq = [];
  let prev = null;
  for (let i = 0; i < steps - 1; i++) { let c; do c = cards[Math.floor(Math.random() * cards.length)]; while (c === prev || c === end); seq.push(c); prev = c; }
  seq.push(end);
  WS_UI.rolling = true; $('#bRand').classList.add('spin');
  cards.forEach(b => b.classList.remove('pickme'));
  let i = 0, delay = 55;
  const step = () => {
    cards.forEach(b => b.classList.remove('roll'));
    const c = seq[i]; c.classList.add('roll');
    try { chime(523 + (i % 5) * 70, .08, .02); } catch (e) {}
    i++;
    if (i < seq.length) { delay *= 1.17; setTimeout(step, delay); return; }
    setTimeout(() => {
      c.classList.remove('roll'); WS_UI.rolling = false; $('#bRand').classList.remove('spin');
      setTab(c.dataset.tab); c.classList.add('pickme');
      try { c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
      const go = $('#bGo'); go.classList.remove('pickme'); void go.offsetWidth; go.classList.add('pickme');
      const nm = (c.querySelector('.nm') || {}).textContent || '';
      try { chime(784, .3, .04); chime(1047, .45, .04, .1); } catch (e) {}
      toast(`${PICK_SAY[Math.floor(Math.random() * PICK_SAY.length)]} <b>${nm}</b> กัน! <span class="tsub">กด "${go.textContent.trim()}" ได้เลย หรือสุ่มใหม่ก็ได้</span>`, 3600);
    }, 260);
  };
  step();
}
$('#bRand').addEventListener('click', randomMode);
/* ---------- end of the wardrobe ---------- */
/* ---------- stickers: playing online on two phones, send each other a little picture with a word ---------- */
// each sticker: [id, word, colour, svg]; sent in the presence message as "count.id" (a new count is a new sticker)
const STK = [
  ['love', 'รักนะ', '#ff6f9c', '<path d="M20 34C9 26 4 20 4 13.5 4 8.6 7.8 5 12.4 5c3.1 0 5.7 1.7 7.6 4.3C21.9 6.7 24.5 5 27.6 5 32.2 5 36 8.6 36 13.5 36 20 31 26 20 34z" fill="#ff6f9c"/><path d="M11 10.5c-2.4.6-3.8 2.6-3.8 4.9" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".7"/>'],
  ['great', 'เก่งมาก!', '#ffb83a', '<path d="M20 3.5l4.9 10 11 1.6-8 7.8 1.9 11-9.8-5.2-9.8 5.2 1.9-11-8-7.8 11-1.6z" fill="#ffcf5a" stroke="#e8a020" stroke-width="1.5" stroke-linejoin="round"/><circle cx="16.4" cy="18.5" r="1.6" fill="#5a3a10"/><circle cx="23.6" cy="18.5" r="1.6" fill="#5a3a10"/><path d="M16.5 22.6q3.5 3.2 7 0" stroke="#5a3a10" stroke-width="1.6" fill="none" stroke-linecap="round"/>'],
  ['sorry', 'ขอโทษนะ', '#7fb6ff', '<circle cx="20" cy="21" r="14" fill="#9fc8ff"/><path d="M13 19.5q2.4-1.6 4.4 0M22.6 19.5q2.4-1.6 4.4 0" stroke="#2a3a5a" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M16.5 27.5q3.5-2.4 7 0" stroke="#2a3a5a" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M31 6c2.6 3.6 3.6 5.6 3.6 7.2a3.6 3.6 0 0 1-7.2 0c0-1.6 1-3.6 3.6-7.2z" fill="#7fd0ff"/><ellipse cx="11.5" cy="24" rx="2.4" ry="1.4" fill="#ff9ab5" opacity=".7"/><ellipse cx="28.5" cy="24" rx="2.4" ry="1.4" fill="#ff9ab5" opacity=".7"/>'],
  ['turn', 'ตาเธอแล้ว', '#4fe0bf', '<circle cx="20" cy="20" r="15" fill="#bff6e8"/><path d="M9 20h16" stroke="#2fb898" stroke-width="5" stroke-linecap="round"/><path d="M21 12.5l8.5 7.5-8.5 7.5" fill="none" stroke="#2fb898" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'],
  ['haha', 'ฮ่าๆๆ', '#ffcf5a', '<circle cx="20" cy="20" r="15" fill="#ffe27a"/><path d="M12 16.5l4 2-4 2M28 16.5l-4 2 4 2" stroke="#5a3a10" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 24.5h15q-1.5 7-7.5 7t-7.5-7z" fill="#5a3a10"/><path d="M15.5 28.4q4.5 2.6 9 0" fill="#ff8a9a"/><path d="M6.5 15.5q-2.5 3.5-.5 6" stroke="#7fd0ff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M33.5 15.5q2.5 3.5.5 6" stroke="#7fd0ff" stroke-width="2.6" fill="none" stroke-linecap="round"/>'],
  ['wait', 'รอแป๊บนะ', '#c9a0ff', '<circle cx="20" cy="21" r="14" fill="#e6d6ff" stroke="#9a72e0" stroke-width="2.4"/><path d="M20 13v8l5 3.5" stroke="#6a48b0" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 6.5l-4 3.5M29 6.5l4 3.5" stroke="#9a72e0" stroke-width="2.6" stroke-linecap="round"/>'],
  ['go', 'ไปเลย!', '#ff8a5c', '<path d="M20 3c5 4.5 7.5 10 7.5 16.5V27h-15v-7.5C12.5 13 15 7.5 20 3z" fill="#fff4e8" stroke="#ff8a5c" stroke-width="2"/><circle cx="20" cy="16" r="3.4" fill="#7fd0ff" stroke="#ff8a5c" stroke-width="1.6"/><path d="M12.5 21l-5 5v4l5-2.5M27.5 21l5 5v4l-5-2.5" fill="#ff8a5c"/><path d="M16 29q4 9 8 0" fill="#ffcf5a"/><path d="M18 29q2 5 4 0" fill="#ff6f4c"/>'],
  ['help', 'ช่วยด้วย!', '#ff6b6b', '<path d="M8 6h24a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H19l-7 6v-6H8a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#ff8a8a"/><rect x="18" y="10" width="4.2" height="11" rx="2.1" fill="#fff"/><circle cx="20.1" cy="25" r="2.3" fill="#fff"/>']
];
const STK_GAP = 0.7;
const STK_MOOD = ['love', 'happy', 'oops', 'call', 'giggle', 'hmm', 'go', 'help'];                                     // s between two stickers from one phone
const SK = { n: 0, id: 0, last: -9, seen: null, sid: '' };
const stkCode = () => SK.n + '.' + SK.id;
const stkSvg = s => `<svg viewBox="0 0 40 40" aria-hidden="true">${s[3]}</svg>`;
function stkShow(i, mine) {
  const s = STK[i], layer = $('#stkLayer'); if (!s || !layer) return;
  const el = document.createElement('div');
  const id = mine ? O.local : (O.local === 'pink' ? 'mint' : 'pink'), who = (S.names[id] || '').slice(0, 14);
  el.className = 'stk ' + (mine ? 'mine ' : 'theirs ') + (id === 'mint' ? 'm' : 'p');
  el.style.setProperty('--x', (mine ? 0 : (Math.random() * 20 - 10)) + '%'); if (!mine) el.style.left = (id === 'pink' ? 30 : 70) + '%';
  el.innerHTML = `${stkSvg(s)}<span class="w">${s[1]}</span><span class="by">${mine ? 'ส่งให้' + (O.partnerName || 'แฟน') : 'จาก' + who}</span>`;
  if (!mine && s[0] === 'love') for (let k = 0; k < 6; k++) { const h = document.createElement('i'); h.style.setProperty('--d', (k * 60 - 150) + 'px'); h.style.animationDelay = (k * .05) + 's'; el.appendChild(h); }
  layer.appendChild(el);
  setTimeout(() => el.remove(), mine ? 1700 : 3200);
  while (layer.children.length > 5) layer.firstChild.remove();
}
function stkSend(i) {
  if (!O.role || !STK[i]) return;
  const now = performance.now() / 1000; if (now - SK.last < STK_GAP) return;
  SK.last = now; SK.n++; SK.id = i;
  stkShow(i, true);
  try { audio(); tone(700, .06, 'sine', .04, 1100); say(O.local, STK_MOOD[i], .05, true); } catch (e) {}
  stkPop(false);
}
// what the other phone says: show a sticker only when its count goes up (and not the old one on first sight)
function stkHear(code, sid) {
  if (typeof code !== 'string') return;
  const m = /^(\d{1,6})\.(\d{1,2})$/.exec(code); if (!m) return;
  const n = +m[1], i = +m[2];
  if (SK.seen == null || sid !== SK.sid || n < SK.seen) { SK.seen = n; SK.sid = sid; return; }
  if (n === SK.seen) return;
  SK.seen = n;
  stkShow(i, false);
  try { say(O.local === 'pink' ? 'mint' : 'pink', STK_MOOD[i], .15, true); } catch (e) {}
  try { const f = [988, 1175, 784, 880, 1319, 659, 1047, 523][i] || 880; chime(f, .35, .05); chime(f * 1.5, .4, .035, .1); } catch (e) {}
}
// the button in the top bar and the little tray of stickers
function stkPop(open) {
  const p = $('#stkPop'), b = $('#bStk'); if (!p || !b) return;
  if (open == null) open = p.hidden;
  p.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) { const r = b.getBoundingClientRect(), w = p.offsetWidth || 300; p.style.top = Math.round(r.bottom + 8) + 'px'; p.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))) + 'px'; }
}
(function stkInit() {
  const p = $('#stkPop'); if (!p) return;
  p.innerHTML = STK.map((s, i) => `<button type="button" class="stkb" data-i="${i}" style="--c:${s[2]}">${stkSvg(s)}<span>${s[1]}</span><kbd>${th(i + 1)}</kbd></button>`).join('') + '<p class="stkhint">บนคีย์บอร์ดกดเลข ๑ ถึง ๘ ได้เลย</p>';
  p.addEventListener('click', e => { const b = e.target.closest('.stkb'); if (b) stkSend(+b.dataset.i); });
  $('#bStk').addEventListener('click', e => { e.stopPropagation(); stkPop(); });
  document.addEventListener('pointerdown', e => { if (!p.hidden && !e.target.closest('#stkPop, #bStk')) stkPop(false); }, true);
  document.addEventListener('keydown', e => {
    if (!O.role || e.repeat || (e.target && e.target.tagName === 'INPUT')) return;
    const m = /^(Digit|Numpad)([1-8])$/.exec(e.code); if (!m) return;
    e.preventDefault(); stkSend(+m[2] - 1);
  });
  // the button shows only while playing online
  setInterval(() => { const b = $('#bStk'); if (!b) return; const on = !!O.role; if (b.hidden === on) { b.hidden = !on; if (!on) stkPop(false); } }, 300);
})();
/* ---------- end of the stickers ---------- */
/* ---------- voices: the two of them mumble in a little language of their own ---------- */
// a syllable is a buzzy note shaped by two vowel filters; a phrase is a few syllables with a tune for the mood.
// pink speaks a little higher and brighter, mint a little lower and rounder.
const VOICE_OF = { pink: { f: 470, vow: 'aiea' }, mint: { f: 350, vow: 'aouo' } };
const VOWEL = { a: [820, 1250], e: [520, 1850], i: [330, 2350], o: [520, 900], u: [360, 820], m: [270, 1100] };
// each mood: syllables of [start pitch, end pitch (times the voice's), length s, vowel ('' = the voice's own), gap after, loudness, wobble]
const MOODS = {
  cheer: [[1.1, 1.25, .085, 'e', .02, 1], [1.35, 1.8, .24, 'a', 0, 1.1]],
  happy: [[1, 1.08, .08, '', .025, .9], [1.15, 1.2, .075, '', .025, .95], [1.3, 1.45, .14, '', 0, 1]],
  giggle: [[1.55, 1.5, .055, 'i', .035, 1.1], [1.4, 1.35, .055, 'i', .035, 1.1], [1.55, 1.5, .055, 'i', .035, 1.1], [1.4, 1.3, .05, 'i', .035, 1], [1.6, 1.7, .08, 'i', 0, 1.1]],
  wow: [[1, 1.45, .13, 'o', .02, 1], [1.5, 1.15, .26, 'o', 0, 1, 1]],
  surprise: [[1.3, 2.05, .15, 'a', .03, 1.25], [1.9, 1.7, .07, 'i', 0, .8]],
  oops: [[1.25, 1.05, .1, 'o', .03, .9], [1.05, .82, .2, 'u', 0, .85]],
  sad: [[1.05, .92, .17, 'u', .05, .8], [.95, .74, .32, 'u', 0, .75, 1]],
  call: [[1.25, 1.36, .14, 'e', .07, 1.05], [1.18, 1, .28, 'o', 0, 1, 1]],
  help: [[1.4, 1.55, .11, 'e', .04, 1.1], [1.5, 1.62, .11, 'e', .04, 1.1], [1.45, 1.2, .26, 'a', 0, 1.1, 1]],
  effort: [[.82, .72, .16, 'u', 0, 1]],
  love: [[1.05, 1.3, .16, 'u', .03, .85, 1], [1.3, 1.02, .34, 'a', 0, .9, 1]],
  hmm: [[.95, 1.06, .34, 'm', 0, 1.8, 1]],
  go: [[1.2, 1.22, .08, 'a', .03, .95], [1.4, 1.42, .08, 'a', .03, 1], [1.6, 1.85, .18, 'i', 0, 1.05]]
};
const VO = { on: store.get('voice', true) !== false, last: { pink: -9, mint: -9 }, log: [] };
function vSyl(a, M, t, f0, f1, d, vw, v, wob) {
  const o = a.createOscillator(), env = a.createGain(), [F1, F2] = VOWEL[vw] || VOWEL.a;
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
  if (wob) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 7.5; lg.gain.value = f0 * .035; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + .05); }
  // a soft body (the buzz rounded off), then the vowel: two raised bands where that vowel rings
  const lp = a.createBiquadFilter(), p1 = a.createBiquadFilter(), p2 = a.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = vw === 'm' ? 700 : Math.min(4200, Math.max(f0, f1) * 5); lp.Q.value = .6;
  p1.type = 'peaking'; p1.frequency.value = F1; p1.Q.value = 2.2; p1.gain.value = vw === 'm' ? 0 : 11;
  p2.type = 'peaking'; p2.frequency.value = F2; p2.Q.value = 3; p2.gain.value = vw === 'm' ? 0 : 8;
  o.connect(lp); lp.connect(p1); p1.connect(p2); p2.connect(env);
  env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(v, t + .014); env.gain.setValueAtTime(v, t + d * .6); env.gain.exponentialRampToValueAtTime(.0001, t + d);
  env.connect(M.fx); env.connect(M.send);
  o.start(t); o.stop(t + d + .04);
}
// id says something in a mood; force: even if they spoke a moment ago
function say(id, mood, delay = 0, force = false) {
  if (!VO.on || (id !== 'pink' && id !== 'mint')) return;
  VO.log.push(id + ':' + mood); if (VO.log.length > 80) VO.log.shift();               // what was said (for the tests)
  const P = MOODS[mood], a = audio(); if (!P || !a) return;
  const now = a.currentTime; if (!force && now + delay - VO.last[id] < .55) return;
  VO.last[id] = now + delay;
  try {
    const M = mixer(a), Vc = VOICE_OF[id], f = Vc.f * (.96 + Math.random() * .08), vol = .032;
    let t = now + delay + .01, k = Math.floor(Math.random() * 4);
    for (const [p0, p1, d, vw, gap, loud, wob] of P) {
      const vowel = vw || Vc.vow[k++ % Vc.vow.length];
      vSyl(a, M, t, f * p0, f * p1, d * (.95 + Math.random() * .1), vowel, vol * (loud || 1), wob);
      t += d + (gap || 0);
    }
  } catch (e) {}
}
const vOther = id => (id === 'pink' ? 'mint' : 'pink');
const vRand = () => (Math.random() < .5 ? 'pink' : 'mint');
function sayBoth(mood, gap = .18) { const f = vRand(); say(f, mood, 0, true); say(vOther(f), mood, gap, true); }
// the newer modes' events: [mood, who] where who is 'a' (the id in the event), 'both', 'rand' or 'other' (the one who did not)
const VEV = {
  cin: { kiss: ['love', 'rand'], combo: ['giggle', 'rand'], caught: ['surprise', 'both'], hug: ['love', 'both'], kicked: ['oops', 'rand'] },
  fart: { 'strike': ['oops', 'rand'], ruined: ['sad', 'both'] },
  bed: { kick: ['oops', 'a'], fall: ['surprise', 'a'], wake: ['surprise', 'a'], bite: ['oops', 'a'], slap: ['effort', 'a'], morning: ['cheer', 'both'], failed: ['sad', 'both'] },
  win: { caught: ['surprise', 'both'], seen: ['surprise', 'rand'], fall: ['oops', 'rand'], in: ['cheer', 'both'], bark: ['surprise', 'rand'] },
  trap: { down: ['help', 'a'], revive: ['happy', 'a'], hurt: ['oops', 'a'], gem: ['happy', 'a'], heart: ['giggle', 'a'], check: ['cheer', 'both'], out: ['sad', 'both'] },
  isle: { catch: ['happy', 'a'], bonk: ['oops', 'a'], salty: ['oops', 'a'], fish: ['happy', 'a'], lit: ['cheer', 'both'], singe: ['surprise', 'a'], sick: ['sad', 'a'], sulk: ['hmm', 'a'], makeup: ['love', 'both'], love: ['love', 'a'], flower: ['love', 'a'], monkey: ['surprise', 'rand'], pinch: ['surprise', 'a'], ship: ['call', 'both'], rescued: ['cheer', 'both'], down: ['help', 'a'], revive: ['happy', 'a'] },
  shop: { boo: ['surprise', 'a'], caught: ['cheer', 'a'], kidcaught: ['giggle', 'a'], escaped: ['sad', 'rand'], tangle: ['oops', 'rand'], duo: ['love', 'both'], alarm: ['help', 'rand'], sewn: ['happy', 'rand'] },
  fish: { hook: ['wow', 'a'], land: ['happy', 'a'], netted: ['happy', 'a'], snap: ['sad', 'a'], escape: ['oops', 'a'], surface: ['call', 'a'], giant: ['wow', 'rand'], stolen: ['surprise', 'rand'], shoo: ['effort', 'a'], flood: ['surprise', 'both'], tangle: ['oops', 'both'], untangled: ['giggle', 'rand'] }
};
function voiceEv(kind, ev) {
  const T = VEV[kind]; if (!T || !VO.on) return;
  for (const e of ev) {
    const [k, a, b] = String(e).split(':'), m = T[k]; if (!m) continue;
    if (kind === 'fish' && k === 'netted' && b != null && YF.SP[+b] && YF.SP[+b].sz === 'g') { sayBoth('cheer'); continue; }
    if (kind === 'fish' && k === 'hook' && b != null && YF.SP[+b] && YF.SP[+b].sz === 'g') { say(a, 'help'); continue; }
    const who = m[1] === 'both' ? 'both' : m[1] === 'rand' ? vRand() : m[1] === 'other' ? vOther(a) : (a === 'pink' || a === 'mint' ? a : vRand());
    if (who === 'both') sayBoth(m[0]); else say(who, m[0]);
    if (m[0] === 'help' && (a === 'pink' || a === 'mint')) say(vOther(a), 'call', .7);
  }
}
// the older modes speak through their sound effects (who it was is not known there: one of them, at random)
const VSFX = {
  serve: 'happy', burnt: 'oops', fire: 'surprise', expire: 'sad', reject: 'oops',
  down: 'help', revive: 'happy', houseHit: 'surprise', boss: 'surprise', lost: 'sad',
  crash: 'surprise', cash: 'happy', cluck: 'giggle',
  tgoal: 'cheer', tdrop: 'oops',
  wperf: 'happy', wfall: 'surprise', wmiss: 'oops', wtop: 'cheer',
  lwrong: 'oops', lfall: 'surprise', ltangle: 'oops',
  bbump: 'surprise', bcrack: 'surprise', bkrathong: 'happy',
  vlift: 'effort', vdeliver: 'happy', vbroken: 'sad', vbump: 'oops', vgrab: 'call',
  isnap: 'surprise', icrash: 'oops',
  heart: 'giggle'
};
setTimeout(() => {
  for (const [name, mood] of Object.entries(VSFX)) {
    const f = sfx[name]; if (typeof f !== 'function' || f.voiced) continue;
    const w = function () { const r = f.apply(this, arguments); try { if (mood === 'cheer' || mood === 'sad') sayBoth(mood); else say(vRand(), mood); } catch (e) {} return r; };
    w.voiced = true; sfx[name] = w;
  }
}, 0);
/* ---------- end of the voices ---------- */
// a HUD box: a soft shadow, a dusky gradient and a fine light rim
// (each size is drawn once and stamped; the rim is left as the current path for callers that outline it)
function panel(g, x, y, w, h, r, a = .85) {
  const W = Math.round(w), H = Math.round(h), c = layer(`pn${W}x${H}r${r}a${a}`, '', W + 4, H + 7, q => { q.translate(2, 1); panelShape(q, 0, 0, W, H, r, a); });
  blit(g, c, x - 2, y - 1, W + 4, H + 7);
  rr(g, x + .5, y + .5, w - 1, h - 1, Math.max(0, r - .5));
}
function panelShape(g, x, y, w, h, r, a) {
  // a soft shadow from two offset shapes (a blurred shadow costs far too much)
  rr(g, x - 1.5, y + 1, w + 3, h + 4, r + 1.5); g.fillStyle = `rgba(8,5,24,${.14 * a})`; g.fill();
  rr(g, x - .5, y + 1.5, w + 1, h + 1.5, r + .5); g.fillStyle = `rgba(8,5,24,${.2 * a})`; g.fill();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgba(52,41,98,${a})`); gr.addColorStop(1, `rgba(22,17,48,${a})`);
  rr(g, x, y, w, h, r); g.fillStyle = gr; g.fill();
  rr(g, x + .5, y + .5, w - 1, h - 1, Math.max(0, r - .5)); g.strokeStyle = `rgba(255,255,255,${.16 * Math.min(1, a + .1)})`; g.lineWidth = 1; g.stroke();
}
// a fluffy cloud: puffs with a soft shadow underneath and a bright top
function fluffyCloud(g, x, y, w, a = .85, tint = '255,255,255') {
  const h = w * .32;
  g.fillStyle = `rgba(180,190,230,${a * .35})`; g.beginPath(); g.ellipse(x + w * .05, y + h * .35, w * .55, h * .38, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = `rgba(${tint},${a})`; g.beginPath();
  g.ellipse(x, y + h * .15, w * .55, h * .42, 0, 0, Math.PI * 2);
  g.arc(x - w * .25, y - h * .05, h * .55, 0, Math.PI * 2); g.arc(x + w * .05, y - h * .35, h * .75, 0, Math.PI * 2); g.arc(x + w * .32, y - h * .02, h * .55, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = `rgba(255,255,255,${a * .5})`; g.beginPath(); g.ellipse(x - w * .02, y - h * .55, w * .16, h * .2, 0, 0, Math.PI * 2); g.fill();
}
// grass along a ground line: tufts and now and then a flower
function grassEdge(g, y0, R, dark, light, flowers = true) {
  for (let x = 0; x < VW; x += 6 + R() * 10) {
    const h = 4 + R() * 7; g.fillStyle = R() < .5 ? dark : light;
    g.beginPath(); g.moveTo(x, y0 + 1); g.lineTo(x + 2, y0 - h); g.lineTo(x + 4, y0 + 1); g.lineTo(x + 5, y0 - h * .7); g.lineTo(x + 7, y0 + 1); g.closePath(); g.fill();
    if (flowers && R() < .08) { const c = ['#ffd1e8', '#fff3b0', '#ffffff', '#ffb3b3'][Math.floor(R() * 4)]; g.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(x + 3 + Math.cos(a) * 2.2, y0 - h - 1 + Math.sin(a) * 2.2, 1.7, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x + 3, y0 - h - 1, 1.2, 0, Math.PI * 2); g.fill(); }
  }
}
// a few birds flapping across the sky
function drawBirds(g, t, y0, y1, n = 4, col = 'rgba(40,40,70,.55)') {
  g.strokeStyle = col; g.lineWidth = 1.6; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 18 + (i * 7) % 14, x = ((t * sp + i * 293) % (VW + 200)) - 100, y = y0 + (i * 53) % Math.max(1, y1 - y0) + Math.sin(t * .8 + i) * 8, f = Math.sin(t * 9 + i * 2) * 3.5, s = 5 + (i % 3);
    g.beginPath(); g.moveTo(x - s, y - f); g.quadraticCurveTo(x - s * .4, y - 2, x, y); g.quadraticCurveTo(x + s * .4, y - 2, x + s, y - f); g.stroke();
  }
  g.lineCap = 'butt';
}
// layers: something drawn once (per key and screen size) into its own canvas, then stamped every frame
const LAYERS = {};
function layer(name, key, w, h, draw, opaque) {
  let L = LAYERS[name]; if (!L) { L = LAYERS[name] = { cv: document.createElement('canvas'), key: null }; L.cv.getContext('2d', { alpha: !opaque }); }
  const k = key + '|' + scale + '|' + (document.fonts && document.fonts.status === 'loaded' ? 1 : 0);
  if (L.key !== k) {
    L.key = k; L.cv.width = Math.max(1, Math.ceil(w * scale)); L.cv.height = Math.max(1, Math.ceil(h * scale));
    const g = L.cv.getContext('2d'); g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic'; draw(g);
  }
  return L.cv;
}
function stamp(g, name, key, x, y, w, h, draw, opaque) { blit(g, layer(name, key, w, h, draw, opaque), x, y, w, h); }
// draw a layer on whole pixels when nothing is scaled or turned (a plain copy is far cheaper than a filtered one)
function blit(g, c, x, y, w, h) {
  const m = g.getTransform();
  if (m.b === 0 && m.c === 0 && Math.abs(m.a - scale) < 1e-6 && Math.abs(m.d - scale) < 1e-6 && Math.abs(c.width - w * scale) < 1.5 && Math.abs(c.height - h * scale) < 1.5) {
    const a = g.globalAlpha; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(c, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f)); g.restore();
  } else g.drawImage(c, x, y, w, h);
}
// a soft round glow from a small cached sprite (much cheaper than a gradient every frame)
function glow(g, rgb, x, y, r, a) {
  const s = layer('glow' + rgb, '', 64, 64, q => { const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.3, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); });
  g.globalAlpha = a; g.drawImage(s, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
// a twinkle: a four-pointed star
function twinkle(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
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
  if (S.kind === 'mus') buildMusBg();
  if (S.kind === 'twr') buildTwrBg();
  if (S.kind === 'leg') buildLegBg();
  if (S.kind === 'boat') buildBoatBg();
  if (S.kind === 'mov') buildMovBg();
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
  g.fillStyle = 'rgba(255,232,196,.16)';
  g.fillRect(px, py, T, 1.5); g.fillRect(px, py + 17, T, 1.5);
  g.fillStyle = 'rgba(40,20,20,.13)'; g.fillRect(px, py + 13, T, 2); g.fillRect(px, py + 30, T, 2);
  g.fillStyle = 'rgba(70,40,30,.22)'; for (let k = 0; k < 3; k++) g.fillRect(px + 3 + ((h >> (k * 4)) % 26), py + 3 + ((h >> (k * 5 + 2)) % 26), 1.6, 1.6);
  if (h % 7 === 0) { g.fillStyle = 'rgba(60,35,25,.35)'; g.fillRect(px + 12, py + 4, 6, 2); g.fillRect(px + 16, py + 6, 2, 5); }
  if (h % 9 === 4) { g.fillStyle = 'rgba(110,170,90,.35)'; g.beginPath(); g.ellipse(px + 6 + (h >> 5) % 18, py + 16, 6, 3, 0, 0, Math.PI * 2); g.fill(); }
  const all = solid(x, y - 1) && solid(x, y + 1) && solid(x - 1, y) && solid(x + 1, y);
  if (all) { g.fillStyle = 'rgba(24,12,30,.32)'; g.fillRect(px, py, T, T); return; }
  if (!solid(x, y + 1)) {
    g.fillStyle = 'rgba(20,10,25,.3)'; g.fillRect(px, py + T - 4, T, 4);
    // ivy hanging from overhangs
    if (h % 4 === 1 && y + 1 < ROWS) {
      const vx = px + 6 + (h >> 6) % 20, len = 8 + (h >> 3) % 14;
      g.strokeStyle = '#4c853d'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(vx, py + T); g.quadraticCurveTo(vx + 3, py + T + len * .5, vx - 1, py + T + len); g.stroke();
      g.fillStyle = '#6cb35a'; for (let k = 3; k < len; k += 5) { g.beginPath(); g.ellipse(vx + (k % 10 ? 2.5 : -2), py + T + k, 2.6, 1.6, k % 10 ? .5 : -.5, 0, Math.PI * 2); g.fill(); }
    }
  }
  if (!solid(x - 1, y)) { g.fillStyle = 'rgba(255,232,196,.12)'; g.fillRect(px, py, 2, T); }
  if (!solid(x + 1, y)) { g.fillStyle = 'rgba(20,10,25,.22)'; g.fillRect(px + T - 3, py, 3, T); }
  if (!solid(x, y - 1)) {
    g.fillStyle = C.mossD; g.fillRect(px, py, T, 6);
    g.fillStyle = C.moss; g.fillRect(px, py, T, 4);
    g.beginPath();
    for (let k = 0; k < 3; k++) { const tx = px + 4 + ((h >> (k * 3)) % 24); g.moveTo(tx, py); g.lineTo(tx + 2, py - 4 - (h >> k) % 3); g.lineTo(tx + 4, py); }
    g.fill();
    g.fillStyle = 'rgba(200,240,160,.45)'; g.fillRect(px, py, T, 1.2);
    // now and then a little flower or a mushroom
    if (h % 5 === 0) {
      const fx = px + 5 + (h >> 4) % 22, fy = py - 5, pc = ['#ffd1e8', '#fff3b0', '#d9c8ff', '#ffb3b3'][(h >> 8) % 4];
      g.strokeStyle = '#3f7a35'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, py); g.lineTo(fx, fy); g.stroke();
      g.fillStyle = pc; for (let k = 0; k < 5; k++) { const a = k * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 1.9, fy + Math.sin(a) * 1.9, 1.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.1, 0, Math.PI * 2); g.fill();
    } else if (h % 13 === 6) {
      const mx = px + 8 + (h >> 5) % 16;
      g.fillStyle = '#f2e6d8'; g.fillRect(mx - 1.2, py - 4, 2.4, 4);
      g.fillStyle = '#e8574f'; g.beginPath(); g.arc(mx, py - 4, 3.6, Math.PI, 0); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(mx - 1.4, py - 5.4, .8, 0, Math.PI * 2); g.arc(mx + 1.3, py - 4.8, .6, 0, Math.PI * 2); g.fill();
    }
  }
}
function buildBg() {
  if (!S.W) return;
  bg.width = cv.width; bg.height = cv.height;
  const g = bg.getContext('2d', { alpha: false });
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const L = S.W.L, R = rng(S.li * 7919 + 13);
  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#120f2e'); sky.addColorStop(.35, C.sky0); sky.addColorStop(.68, C.sky1); sky.addColorStop(1, '#8a4466');
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  // a soft band of light across the sky
  const band = g.createLinearGradient(0, VH * .1, VW, VH * .5); band.addColorStop(0, 'rgba(120,100,220,0)'); band.addColorStop(.5, 'rgba(150,120,230,.12)'); band.addColorStop(1, 'rgba(120,100,220,0)');
  g.fillStyle = band; g.fillRect(0, 0, VW, VH * .7);
  for (let i = 0; i < 110; i++) {
    g.fillStyle = `rgba(255,244,220,${.25 + R() * .6})`;
    const s = R() < .12 ? 2 : 1.2;
    g.beginPath(); g.arc(R() * VW, R() * VH * .62, s * .6, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(255,240,210,.85)'; for (let i = 0; i < 6; i++) twinkle(g, R() * VW, R() * VH * .45, 3 + R() * 2.5);
  // wisps of cloud
  for (let i = 0; i < 7; i++) {
    const cx = R() * VW, cy = 60 + R() * VH * .45, w = 80 + R() * 140;
    g.fillStyle = `rgba(200,180,255,${.04 + R() * .05})`; g.beginPath(); g.ellipse(cx, cy, w, 9 + R() * 8, 0, 0, Math.PI * 2); g.ellipse(cx + w * .3, cy - 6, w * .5, 7, 0, 0, Math.PI * 2); g.fill();
  }
  const mx = VW * (.7 + R() * .2), my = 70 + R() * 30;
  const glow = g.createRadialGradient(mx, my, 10, mx, my, 90);
  glow.addColorStop(0, 'rgba(255,226,170,.35)'); glow.addColorStop(1, 'rgba(255,226,170,0)');
  g.fillStyle = glow; g.fillRect(mx - 90, my - 90, 180, 180);
  g.fillStyle = '#ffeccc'; g.beginPath(); g.arc(mx, my, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.sky1; g.beginPath(); g.arc(mx + 9, my - 5, 19, 0, Math.PI * 2); g.fill();
  // far hills, the temples, little lit windows, mist along the bottom
  g.fillStyle = '#2f2150'; g.beginPath(); g.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 30) g.lineTo(x, VH - 70 - 26 * Math.sin(x / 140 + S.li) - 12 * Math.sin(x / 47));
  g.lineTo(VW, VH); g.fill();
  for (let i = 0; i < 4; i++) prang(g, 80 + R() * (VW - 160), VH - 10, 50 + R() * 30, 180 + R() * 90, C.far);
  for (let i = 0; i < 3; i++) prang(g, 60 + R() * (VW - 120), VH, 70 + R() * 30, 150 + R() * 60, C.near);
  g.fillStyle = C.near; g.fillRect(0, VH - 26, VW, 26);
  for (let i = 0; i < 9; i++) { const lx = R() * VW, ly = VH - 18 - R() * 40; g.fillStyle = 'rgba(255,214,140,.55)'; g.fillRect(lx, ly, 3, 4); g.fillStyle = 'rgba(255,214,140,.12)'; g.beginPath(); g.arc(lx + 1.5, ly + 2, 7, 0, Math.PI * 2); g.fill(); }
  const mist = g.createLinearGradient(0, VH - 120, 0, VH); mist.addColorStop(0, 'rgba(180,140,220,0)'); mist.addColorStop(1, 'rgba(180,140,220,.22)');
  g.fillStyle = mist; g.fillRect(0, VH - 120, VW, 120);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const t = L.grid[y][x];
    if (t === '#') drawStone(g, L, x, y);
    else if (t === '-') {
      const px = x * T, py = y * T;
      g.fillStyle = '#5e3a22'; g.fillRect(px + 4, py + 7, 3, 6); g.fillRect(px + T - 7, py + 7, 3, 6);
      const pg = g.createLinearGradient(0, py, 0, py + 8); pg.addColorStop(0, '#b47c4a'); pg.addColorStop(1, '#7a4c2c');
      g.fillStyle = pg; g.fillRect(px, py, T, 8);
      g.fillStyle = '#d29a62'; g.fillRect(px, py, T, 1.6);
      g.strokeStyle = 'rgba(70,40,20,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(px + 2, py + 4.5); g.quadraticCurveTo(px + 14, py + 3, px + 26, py + 5); g.stroke();
      g.fillStyle = '#3a2416'; g.beginPath(); g.arc(px + 3, py + 4, .9, 0, Math.PI * 2); g.arc(px + T - 3, py + 4, .9, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + T - 1, py, 1, 8);
    }
  }
  S.gates = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const t = L.grid[y][x]; if (t === 'p' || t === 'm') S.gates.push({ x, y, c: t }); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(vignette(), 0, 0);              // the soft dark edges, baked in
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
    heartPath(g, h.x, y, 9); const hg = g.createLinearGradient(0, y - 9, 0, y + 9); hg.addColorStop(0, '#ffe7a0'); hg.addColorStop(1, '#f2a93a'); g.fillStyle = hg; g.fill();
    g.strokeStyle = '#8a5d10'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(h.x - 3.4, y - 2.4, 2, 1.3, -.6, 0, Math.PI * 2); g.fill();
    const tw = (Math.sin(t * 3 + h.x) + 1) / 2; g.fillStyle = `rgba(255,250,220,${tw})`; twinkle(g, h.x + 9, y - 8, 2.5 + tw * 1.5);
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
      const wg = g.createLinearGradient(0, y, 0, y + b.h); wg.addColorStop(0, '#c48a52'); wg.addColorStop(1, '#94603a');
      g.fillStyle = wg; rr(g, x, y, b.w, b.h, 3); g.fill();
      g.strokeStyle = 'rgba(90,55,28,.45)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + 2, y + k * b.h / 3); g.lineTo(x + b.w - 2, y + k * b.h / 3); g.stroke(); }
      g.strokeStyle = '#6a4222'; g.lineWidth = 2.4; rr(g, x + 1.2, y + 1.2, b.w - 2.4, b.h - 2.4, 2.5); g.stroke();
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + b.w - 4, y + b.h - 4); g.stroke();
      g.fillStyle = '#4a2e18'; for (const [dx, dy] of [[4, 4], [b.w - 4, 4], [4, b.h - 4], [b.w - 4, b.h - 4]]) { g.beginPath(); g.arc(x + dx, y + dy, 1.1, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,225,170,.3)'; g.fillRect(x + 3, y + 2.2, b.w - 6, 1.6);
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
  const cx = p.x + p.w / 2, by = p.y + p.h, walk = p.walk || 0;
  const breathe = walk ? 0 : Math.sin(t * 2.6 + (pink ? 0 : 1.3)) * .035;
  const sq = (p.sq || 0) + breathe, w = 24 * (1 + .2 * sq), h = 29 * (1 - .2 * sq);
  const bob = walk ? Math.abs(Math.sin(walk)) * 1.5 : 0;
  g.save(); g.translate(cx, by - bob);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, bob + 1, w * .5, 2.8, 0, 0, Math.PI * 2); g.fill();
  // little feet
  g.fillStyle = dark;
  for (const s of [-1, 1]) { const lift = walk ? Math.max(0, Math.sin(walk + (s > 0 ? Math.PI : 0))) * 2 : 0; g.beginPath(); g.ellipse(s * w * .25, -.6 - lift, 4.4, 2.7, 0, 0, Math.PI * 2); g.fill(); }
  // the body: lighter on top, a soft rim, a shine
  const gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, LITE[p.id]); gr.addColorStop(.38, col); gr.addColorStop(1, dark);
  rr(g, -w / 2, -h, w, h, 10.5); g.fillStyle = gr; g.fill();
  g.lineWidth = 1.3; g.strokeStyle = hexA(dark, .95); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(0, -h * .2, w * .3, h * .15, 0, 0, Math.PI * 2); g.fill();
  // little arms in front at the sides: they swing as they walk, go up in the air, wave when happy
  if (!p.noArms) {
    const air = p.vy !== undefined && !p.ground, happy = p.mood === 'happy';
    for (const s of [-1, 1]) {
      let a = -s * .45;
      if (air) a = -s * (2.3 + Math.sin(t * 18 + s) * .15);
      else if (happy) a = -s * (2.1 + Math.sin(t * 12 + (s > 0 ? 1.5 : 0)) * .35);
      else if (walk) a += Math.sin(walk + (s > 0 ? 0 : Math.PI)) * .5;
      else a -= s * Math.sin(t * 2.6 + (pink ? 0 : 1.3)) * .08;
      g.save(); g.translate(s * (w / 2 - 1.5), -h * .46); g.rotate(a);
      g.beginPath(); g.ellipse(0, 4.4, 2.8, 4.9, 0, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 1.1; g.strokeStyle = hexA(dark, .95); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-.8, 2.6, 1, 2, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-w * .27, -h * .76, 2.6, 4.4, -.45, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(-w * .1, -h * .9, 1.2, 0, Math.PI * 2); g.fill();
  cuteFace(g, p.face * 2.5, -h + 12.5, p.face, t, pink, p.mood || (p.sq < -.15 ? 'o' : ''), 1, 0, p.id);
  if (pink) cuteBow(g, w / 2 - 6, -h + 1.5); else cuteSprout(g, 0, -h + 1, 1, t);
  g.restore();
  nameTag(g, S.names[p.id], cx, p.y - 13 - wardLift(p.id), col);
}
// fireflies drifting about in the open (not in the walls), and a few stars that twinkle
function drawFireflies(g, L, t) {
  for (let i = 0; i < 16; i++) {
    const x = ((i * 157.3 + Math.sin(t * .23 + i) * 70) % VW + VW) % VW, y = 60 + (i * 83.7) % (VH - 140) + Math.sin(t * .6 + i * 2.1) * 22;
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    const c = L.grid[cy] && L.grid[cy][cx]; if (c === '#' || c === undefined) continue;
    const a = .5 + .45 * Math.sin(t * 2.6 + i * 1.7);
    if (a <= .12) continue;
    g.fillStyle = `rgba(255,210,100,${a * .22})`; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,226,130,${a * .4})`; g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,248,200,${a})`; g.beginPath(); g.arc(x, y, 1.7, 0, Math.PI * 2); g.fill();
  }
}
// a soft darkening toward the edges of the picture (drawn once per size)
let vigC = null;
function vignette() {
  if (vigC && vigC.width === cv.width && vigC.height === cv.height) return vigC;
  vigC = document.createElement('canvas'); vigC.width = cv.width; vigC.height = cv.height;
  const g = vigC.getContext('2d'), w = cv.width, h = cv.height, gr = g.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .45, w / 2, h / 2, Math.max(w, h) * .75);
  gr.addColorStop(0, 'rgba(10,6,30,0)'); gr.addColorStop(1, 'rgba(10,6,30,.38)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return vigC;
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
    if (q.type === 'heart') { heartPath(g, q.x, q.y, q.s); g.fillStyle = q.col; g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(q.x - q.s * .35, q.y - q.s * .25, q.s * .22, 0, Math.PI * 2); g.fill(); }
    else if (q.type === 'star') { g.fillStyle = q.col; twinkle(g, q.x, q.y, q.s * (1.2 + .3 * Math.sin(q.life * 20))); }
    else { g.fillStyle = q.col; g.beginPath(); g.arc(q.x, q.y, q.s * .58, 0, Math.PI * 2); g.fill(); }
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
  panel(g, x, y, w, h, 14, .86);
  g.strokeStyle = hexA(C.gold, .5); g.lineWidth = 1; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `400 21px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(title, VW / 2, y + 32);
  { const tw = g.measureText(title).width / 2 + 16; g.fillStyle = C.pink; heartPath(g, VW / 2 - tw, y + 25, 5); g.fill(); heartPath(g, VW / 2 + tw, y + 25, 5); g.fill(); }
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
  drawFireflies(g, L, t);
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
  const was = S.mode;
  S.mode = m;
  if (m === 'play' && was !== 'paused' && was !== 'play' && was !== 'dying' && !MODES[S.kind]) try { sayBoth('go'); } catch (e) {}
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
  setKind('adv');
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
  if (S.kind === 'mus') { musRestart(); return; }
  if (S.kind === 'twr') { twrRestart(); return; }
  if (S.kind === 'leg') { legRestart(); return; }
  if (S.kind === 'boat') { boatRestart(); return; }
  if (S.kind === 'mov') { movRestart(); return; }
  if (S.kind === 'kite') { kiteRestart(); return; }
  if (MODES[S.kind]) { MODES[S.kind].restart(); return; }
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
  O.lastInp = null; KS.lastInp = {}; DS.lastInp = {}; RS.lastInp = {}; TS.lastInp = {}; WS.press = { pink: 0, mint: 0 }; LS.q = []; BS.q = []; VS.lastInp = {}; IS.lastInp = {};
  for (const m of Object.values(MODES)) m.st.lastInp = {};
  xRelease();
  const lv = curLevel();
  $('#pNo').textContent = curLabel() + ' · ' + lv.name;
  $('#pHint').textContent = lv.hint;
  $('#bLevels').hidden = !!O.role; $('#bLeave').hidden = !O.role; $('#pNet').hidden = !O.role;
  $('#bSwap').hidden = !((S.kind === 'drv' || S.kind === 'kite' || !!(MODES[S.kind] && MODES[S.kind].swap)) && O.role !== 'guest');
  if (S.kind === 'drv') renderSwapNote(); else if (S.kind === 'kite') iSwapNote(); else if (MODES[S.kind] && MODES[S.kind].swap) MODES[S.kind].swapNote();
  renderTips(); showScreen('pause');
}
function resume() { if (S.mode !== 'paused') return; showScreen(null); setMode('play'); }
function toTitle() { if (O.role) leaveOnline(); releaseAll(); releaseK(); showScreen('title'); setMode('menu'); setTab(S.tab); }
function die(id) {
  setMode('dying'); S.deadId = id; S.deathT = 1; S.flash = 1; S.shake = 1; sfx.die(); say(id, 'surprise', 0, true); say(id === 'pink' ? 'mint' : 'pink', 'call', .45, true);
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
  if (S.kind === 'mus') { musNext(); return; }
  if (S.kind === 'twr') { twrNext(); return; }
  if (S.kind === 'leg') { legNext(); return; }
  if (S.kind === 'boat') { boatNext(); return; }
  if (S.kind === 'mov') { movNext(); return; }
  if (S.kind === 'kite') { kiteNext(); return; }
  if (MODES[S.kind]) { MODES[S.kind].next(); return; }
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
  renderMusLevels();
  renderTwrLevels();
  renderLegLevels();
  renderBoatLevels();
  renderMovLevels();
  renderKiteLevels();
  for (const m of Object.values(MODES)) m.renderLevels();
  renderModeCards();
}
// the mode cards on the title: stars (hearts for the adventure) collected in each
function renderModeCards() {
  const set = (k, html) => { const el = $('#ms-' + k); if (el) el.innerHTML = html; };
  const hearts = ALL.reduce((a, l, i) => a + heartsIn(i), 0), got = ALL.reduce((a, l) => a + (prog.h[l.name] || 0), 0);
  set('adv', `<b>♥ ${th(got)}</b> / ${th(hearts)}`);
  for (const [k, L, best] of [['kit', KLEVELS, kBest], ['def', DLEVELS, dBest], ['drv', RLEVELS, rBest], ['tak', TLEVELS, tBest], ['mus', MLEVELS, mBest], ['twr', WLEVELS, wBest], ['leg', LLEVELS, lBest], ['boat', BLEVELS, bBest], ['mov', VLEVELS, vBest], ['kite', ILEVELS, iBest]]) {
    const n = L.reduce((a, l, i) => a + ((best(i) || {}).s || 0), 0);
    set(k, `<b>★ ${th(n)}</b> / ${th(L.length * 3)}`);
  }
  for (const m of Object.values(MODES)) { const n = m.L.reduce((a, l, i) => a + ((m.best(i) || {}).s || 0), 0); set(m.kind, `<b>★ ${th(n)}</b> / ${th(m.L.length * 3)}`); }
  wardCheck();
}
function goFromTitle() { if (MODES[S.tab]) { MODES[S.tab].start(+$('#bGo').dataset[MODES[S.tab].dk] || 0); return; } if (S.tab === 'kit') startKitchen(+$('#bGo').dataset.k || 0); else if (S.tab === 'def') startDefense(+$('#bGo').dataset.d || 0); else if (S.tab === 'drv') startDrive(+$('#bGo').dataset.r || 0); else if (S.tab === 'tak') startTak(+$('#bGo').dataset.t || 0); else if (S.tab === 'mus') startMus(+$('#bGo').dataset.m || 0); else if (S.tab === 'twr') startTwr(+$('#bGo').dataset.w || 0); else if (S.tab === 'leg') startLeg(+$('#bGo').dataset.l || 0); else if (S.tab === 'boat') startBoat(+$('#bGo').dataset.b || 0); else if (S.tab === 'mov') startMov(+$('#bGo').dataset.v || 0); else if (S.tab === 'kite') startKite(+$('#bGo').dataset.f || 0); else startLevel(+$('#bGo').dataset.i || 0); }
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
  if (S.kind === 'mus') { if (eng) engine(false, 0); musFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'twr') { if (eng) engine(false, 0); twrFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'leg') { if (eng) engine(false, 0); legFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'boat') { if (eng) engine(false, 0); boatFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'mov') { if (eng) engine(false, 0); movFrame(dt, now); requestAnimationFrame(frame); return; }
  if (S.kind === 'kite') { if (eng) engine(false, 0); kiteFrame(dt, now); requestAnimationFrame(frame); return; }
  if (MODES[S.kind]) { if (eng) engine(false, 0); MODES[S.kind].frame(dt, now); requestAnimationFrame(frame); return; }
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
  if (S.kind === 'leg' && LKEY[e.code] && S.mode === 'play') { lKey(e); return; }
  if (S.kind === 'boat' && BKEY[e.code] && S.mode === 'play') { bKey(e); return; }
  if (MODES[S.kind] && MODES[S.kind].pad === 'x' && XKEY[e.code] && S.mode === 'play') { xKey(e, true); return; }
  if (S.kind === 'twr' && WKEY[e.code] && S.mode === 'play') { e.preventDefault(); if (!e.repeat) wPress(O.role ? O.local : WKEY[e.code]); return; }
  if (S.kind === 'mus' && MKEY[e.code] != null) { e.preventDefault(); if (!e.repeat && S.mode === 'play') musPress(MKEY[e.code], e.timeStamp); return; }
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
document.addEventListener('keyup', e => { if (topDown()) kitKey(e, false); if (MODES[S.kind] && MODES[S.kind].pad === 'x') xKey(e, false); const m = MAP[e.code]; if (m) KB[O.role ? O.local : m[0]][m[1]] = false; });
window.addEventListener('blur', () => { releaseAll(); releaseK(); xRelease(); });
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
$('#bAgain').addEventListener('click', () => { if (O.role === 'host') openOnlineRoom(); else if (S.kind === 'kit') startKitchen(KS.li); else if (S.kind === 'def') startDefense(DS.li); else if (S.kind === 'drv') startDrive(RS.li); else if (S.kind === 'tak') startTak(TS.li); else if (S.kind === 'mus') startMus(MS.li); else if (S.kind === 'twr') startTwr(WS.li); else if (S.kind === 'leg') startLeg(LS.li); else if (S.kind === 'boat') startBoat(BS.li); else if (S.kind === 'mov') startMov(VS.li); else if (S.kind === 'kite') startKite(IS.li); else if (MODES[S.kind]) MODES[S.kind].start(MODES[S.kind].st.li); else startLevel(S.li); });
[nPink, nMint].forEach(i => i.addEventListener('input', readNames));
snd.addEventListener('change', () => { S.sound = snd.checked; store.set('sound', S.sound); });
bgmOn.addEventListener('change', () => { S.music = bgmOn.checked; store.set('music', S.music); if (S.music) audioCtx(); });
$('#voiceOn').checked = VO.on;
$('#voiceOn').addEventListener('change', () => { VO.on = $('#voiceOn').checked; store.set('voice', VO.on); if (VO.on) { audio(); sayBoth('happy'); } });


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
    let peer = null, conn = null, fn = null, done = false, closed = false, lastSent = 0, retry = null, heard = 0;
    try { peer = role === 'host' ? new Peer(PEER_PREFIX + code) : new Peer(); } catch (e) { reject('browser-incompatible'); return; }
    const deliver = data => { if (fn) fn({ peers: data ? [{ peer: 'remote', presence: data, updatedAt: performance.now(), sameTab: false }] : [] }); };
    // a phone's line can drop for a moment and the guest dials again while the host still thinks the old line is up:
    // the newest line that opens is the one used (the old one is hung up), and whatever comes in on a line is listened to
    const use = c => { if (closed) return; const old = conn; conn = c; if (old && old !== c) setTimeout(() => { try { old.close(); } catch (e) {} }, 0); };
    const wire = c => {
      c.on('open', () => use(c));
      c.on('data', d => { if (closed || !d || typeof d !== 'object') return; heard = performance.now(); if (!conn || !conn.open) use(c); deliver(d); });
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
    const dial = () => { const c = peer.connect(PEER_PREFIX + code, { serialization: 'json', reliable: false }); if (!conn) conn = c; wire(c); return c; };
    peer.on('open', () => {
      if (role === 'host') {
        peer.on('connection', c => { wire(c); if (c.open) use(c); });
        done = true; clearTimeout(timer); resolve(room);
      } else {
        const c = dial();
        c.on('open', () => {
          if (done) return;
          done = true; clearTimeout(timer); resolve(room);
          // dial again when the line is down, or when nothing has come in for a while although it looks up
          heard = performance.now();
          retry = setInterval(() => { if (!closed && !peer.disconnected && (!conn || !conn.open || performance.now() - heard > 2500)) { heard = performance.now(); dial(); } }, 800);
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
  O.sid = Math.random().toString(36).slice(2, 10); O.partnerSid = null; O.freshEp = -1; O.hostSid = null; O.hostEp = -1;
  O.ckS = []; O.clockOff = 0; O.rtt = 0; O.pCk = null;
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
  if (show) { renderOnlineKit(); renderOnlineDef(); renderOnlineDrv(); renderOnlineTak(); renderOnlineMus(); renderOnlineTwr(); renderOnlineLeg(); renderOnlineBoat(); renderOnlineMov(); renderOnlineKite(); for (const m of Object.values(MODES)) m.renderOnline(); }
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
  if (O.md === 'm') {
    loadMus(O.lv, { role: O.role, local: O.local });
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'b') {
    loadBoat(O.lv, { role: O.role, local: O.local });
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'l') {
    loadLeg(O.lv, { role: O.role, local: O.local });
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  const XO = Object.values(MODES).find(m => m.md === O.md);
  if (XO) {
    const keep = XO.st.G && XO.st.li === O.lv && !fresh;
    XO.load(O.lv, { role: O.role, local: O.local });
    if (keep) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'i') {
    loadKite(O.lv, { role: O.role, local: O.local });
    if (!fresh) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'v') {
    const keepBanner = VS.G && VS.li === O.lv && !fresh;
    loadMov(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
  if (O.md === 'w') {
    const keepBanner = WS.G && WS.li === O.lv && !fresh;
    loadTwr(O.lv, { role: O.role, local: O.local });
    if (keepBanner) S.banner = 0;
    O.loadedEp = O.ep; showScreen(null); setMode('play');
    return;
  }
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
  setKind('adv');
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
  if (WS.G) WS.G.net = null;
  if (LS.G) LS.G.net = null;
  if (BS.G) BS.G.net = null;
  if (VS.G) VS.G.net = null;
  if (IS.G) IS.G.net = null;
  for (const m of Object.values(MODES)) if (m.st.G) m.st.G.net = null;
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
  O.partnerWear = wardParse(best.pr.wd);
  stkHear(best.pr.sk, best.pr.sid);
  S.names[O.local === 'pink' ? 'mint' : 'pink'] = O.partnerName;
  if (!was) renderOnlineRoom();
  if (O.role === 'host') hostHears(best.pr); else guestHears(best.pr);
}
// the partner left: forget whatever they were holding so the host does not keep pushing, chopping or driving for them
function dropRemoteInput() {
  if (O.role !== 'host') return;
  KS.remote.act = KS.remote.use = false; DS.remote.act = DS.remote.use = false;
  RS.remote.s = RS.remote.p = 0; RS.remote.act = false; TS.remote.fresh = false; VS.remote.mx = VS.remote.my = 0; VS.remote.act = false; IS.remote.mx = IS.remote.my = 0; IS.remote.act = false;
  for (const m of Object.values(MODES)) m.st.remote = m.fresher();
  if (S.W && S.W.mint) S.W.mint.netInp = null;
}
function hostHears(pr) {
  // a guest that rejoined starts its counters from zero again: take a fresh baseline
  if (pr.sid && pr.sid !== O.partnerSid) { O.partnerSid = pr.sid; O.firstSeen = false; KS.seenKa = DS.seenKa = RS.seenKa = TS.seenKa = -1; WS.seenReq = -1; LS.seen = 0; BS.seen = 0; VS.remote.seen = -1; IS.remote.seen = -1; for (const m of Object.values(MODES)) m.st.remote = m.fresher(); }
  if (!O.firstSeen) { O.firstSeen = true; O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0; }
  if (Number.isFinite(pr.ck)) { O.pCk = pr.ck; O.pCkAt = performance.now(); }
  if ((pr.dead | 0) > O.seenDead || (pr.rq | 0) > O.seenRq) {
    O.seenDead = pr.dead | 0; O.seenRq = pr.rq | 0;
    if (O.st === 'play' && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'paused')) onlineRestart();
  }
  if (S.kind === 'kit') { if (O.md === 'k') kHostHears(pr); return; }
  if (S.kind === 'def') { if (O.md === 'd') dHostHears(pr); return; }
  if (S.kind === 'drv') { if (O.md === 'r') rHostHears(pr); return; }
  if (S.kind === 'tak') { if (O.md === 't') tHostHears(pr); return; }
  if (S.kind === 'mus') { if (O.md === 'm') mHostHears(pr); return; }
  if (S.kind === 'twr') { if (O.md === 'w') wHostHears(pr); return; }
  if (S.kind === 'leg') { if (O.md === 'l') lHostHears(pr); return; }
  if (S.kind === 'boat') { if (O.md === 'b') bHostHears(pr); return; }
  if (S.kind === 'mov') { if (O.md === 'v') vHostHears(pr); return; }
  if (S.kind === 'kite') { if (O.md === 'i') iHostHears(pr); return; }
  if (MODES[S.kind]) { if (O.md === MODES[S.kind].md) MODES[S.kind].hostHearsW(pr); return; }
  if (S.W && pr.ep === O.ep && pr.p && S.W.net) Net.applyPlayer(S.W, 'mint', pr.p, performance.now());
}
function guestHears(pr) {
  clockSample(pr);
  const lv = pr.lv | 0, ep = pr.ep | 0;
  // the line does not keep order: a late message from before the host's last restart is old news
  if (pr.sid !== O.hostSid) { O.hostSid = pr.sid; O.hostEp = -1; }
  if (ep < O.hostEp) return;
  O.hostEp = ep;
  if (pr.st === 'lobby') { if (S.mode !== 'menu' || scr.online.hidden) openOnlineRoom(); else renderOnlineRoom(); return; }
  const XG = Object.values(MODES).find(m => m.md === pr.md);
  const md = XG || pr.md === 'k' || pr.md === 'd' || pr.md === 'r' || pr.md === 't' || pr.md === 'm' || pr.md === 'w' || pr.md === 'l' || pr.md === 'b' || pr.md === 'v' || pr.md === 'i' ? pr.md : 'a';
  const nLv = XG ? XG.L.length : md === 'k' ? KLEVELS.length : md === 'd' ? DLEVELS.length : md === 'r' ? RLEVELS.length : md === 't' ? TLEVELS.length : md === 'm' ? MLEVELS.length : md === 'w' ? WLEVELS.length : md === 'l' ? LLEVELS.length : md === 'b' ? BLEVELS.length : md === 'v' ? VLEVELS.length : md === 'i' ? ILEVELS.length : ALL.length, kind = XG ? XG.kind : md === 'k' ? 'kit' : md === 'd' ? 'def' : md === 'r' ? 'drv' : md === 't' ? 'tak' : md === 'm' ? 'mus' : md === 'w' ? 'twr' : md === 'l' ? 'leg' : md === 'b' ? 'boat' : md === 'v' ? 'mov' : md === 'i' ? 'kite' : 'adv', cur = XG ? XG.st.li : md === 'k' ? KS.li : md === 'd' ? DS.li : md === 'r' ? RS.li : md === 't' ? TS.li : md === 'm' ? MS.li : md === 'w' ? WS.li : md === 'l' ? LS.li : md === 'b' ? BS.li : md === 'v' ? VS.li : md === 'i' ? IS.li : S.li;
  if (lv >= 0 && lv < nLv && (ep !== O.loadedEp)) { const ch = (pr.fs | 0) === ep || O.loadedEp < 0 || md !== O.md || lv !== cur || S.kind !== kind; O.ep = ep; O.lv = lv; O.md = md; loadOnlineLevel(ch); }
  if (md === 'k') { if (S.kind === 'kit' && ep === O.loadedEp) kGuestHears(pr); return; }
  if (md === 'd') { if (S.kind === 'def' && ep === O.loadedEp) dGuestHears(pr); return; }
  if (md === 'r') { if (S.kind === 'drv' && ep === O.loadedEp) rGuestHears(pr); return; }
  if (md === 't') { if (S.kind === 'tak' && ep === O.loadedEp) tGuestHears(pr); return; }
  if (md === 'm') { if (S.kind === 'mus' && ep === O.loadedEp) mGuestHears(pr); return; }
  if (md === 'w') { if (S.kind === 'twr' && ep === O.loadedEp) wGuestHears(pr); return; }
  if (md === 'l') { if (S.kind === 'leg' && ep === O.loadedEp) lGuestHears(pr); return; }
  if (md === 'b') { if (S.kind === 'boat' && ep === O.loadedEp) bGuestHears(pr); return; }
  if (md === 'v') { if (S.kind === 'mov' && ep === O.loadedEp) vGuestHears(pr); return; }
  if (md === 'i') { if (S.kind === 'kite' && ep === O.loadedEp) iGuestHears(pr); return; }
  if (XG) { if (S.kind === XG.kind && ep === O.loadedEp) XG.guestHearsW(pr); return; }
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
// the guest's estimate of (host clock - own clock), from the echo with the quickest round trip lately
function clockSample(pr) {
  if (!Array.isArray(pr.ce) || !Number.isFinite(pr.hn) || !Number.isFinite(pr.ce[0]) || !Number.isFinite(pr.ce[1])) return;
  const now = performance.now(), rtt = now - pr.ce[0] - pr.ce[1];
  if (!(rtt >= 0 && rtt < 5000)) return;
  if (!O.ckS) O.ckS = [];
  O.ckS.push({ rtt, off: pr.hn + rtt / 2 - now, at: now });
  O.ckS = O.ckS.filter(c => now - c.at < 20000).slice(-60);
  const best = O.ckS.reduce((a, c) => (c.rtt < a.rtt ? c : a));
  O.clockOff = best.off; O.rtt = best.rtt;
}
function pumpOnline(now) {
  const room = O.room; if (!room) return;
  const o = { app: 'tsr', v: 1, code: O.code, r: O.role === 'host' ? 'h' : 'g', n: S.names[O.local] || '', ep: O.ep, lv: O.lv, md: O.md, sid: O.sid, wd: wardCode(O.local), sk: stkCode() };
  if (O.role === 'host') { o.st = O.st; o.fs = O.freshEp; } else { o.dead = O.dead; o.rq = O.rq; }
  // clock sync: the guest sends its clock, the host echoes it back with how long it held it and its own clock
  const pnow = performance.now();
  if (O.role === 'guest') o.ck = Math.round(pnow * 10) / 10;
  else { o.hn = Math.round(pnow * 10) / 10; if (O.pCk != null) o.ce = [O.pCk, Math.round((pnow - O.pCkAt) * 10) / 10]; }
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
  } else if (S.kind === 'mus') {
    if (MS.G && MS.G.net && live) o.mw = mEncode();
  } else if (S.kind === 'twr') {
    if (WS.G && WS.G.net && live) o.ww = wEncode();
  } else if (S.kind === 'leg') {
    if (LS.G && LS.G.net && live) o.lw = lEncode();
  } else if (S.kind === 'boat') {
    if (BS.G && BS.G.net && live) o.bw = bEncode();
  } else if (S.kind === 'mov') {
    if (VS.G && VS.G.net && live) o.vw = vEncode();
  } else if (S.kind === 'kite') {
    if (IS.G && IS.G.net && live) o.iw = iEncode();
  } else if (MODES[S.kind]) {
    const m = MODES[S.kind]; if (m.st.G && m.st.G.net && live) o[m.pres] = m.encodeW();
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
  const away = !O.partner || performance.now() - (O.partnerAt || 0) > 2500;   // gone quiet: the line may be down
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
  panel(g, x, y, w, 30, 15, .88);
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
  pick() { tone(620, .06, 'triangle', .05, 780); noise(.03, 2200, .012, 'bandpass', 2); },
  drop() { tone(420, .06, 'triangle', .05, 300); noise(.03, 900, .015, 'bandpass', 1.5); },
  chop() { noise(.035, 2600 + Math.random() * 800, .06, 'bandpass', 2.5); tone(820 + Math.random() * 160, .03, 'triangle', .02); },
  pound() { tone(140, .09, 'sine', .09, 80); noise(.06, 500, .03, 'lowpass', .8); },
  wash() { noise(.12, 2200 + Math.random() * 1500, .045, 'bandpass', 3); tone(1300 + Math.random() * 600, .05, 'sine', .014, 2200); },
  serve() { [988, 1319, 1568].forEach((f, i) => chime(f, .35, .045, i * .06)); },
  reject() { tone(220, .16, 'triangle', .05, 170); tone(185, .24, 'triangle', .045, 140, .13); },
  trash() { noise(.16, 700, .045, 'lowpass', 1, 200); tone(260, .12, 'triangle', .04, 140); },
  cooked() { chime(1760, .35, .045); chime(2349, .45, .04, .1); },
  burnt() { noise(.55, 1300, .03, 'bandpass', 1, 400); tone(300, .35, 'sawtooth', .03, 110); },
  fire() { noise(.7, 700, .05, 'lowpass', .7, 2200); tone(660, .2, 'triangle', .04, 880, .05); tone(660, .2, 'triangle', .04, 880, .35); },
  spray() { noise(.07, 5200, .03, 'highpass', .7); },
  order() { chime(1568, .35, .05); chime(2093, .5, .04, .09); },
  expire() { [392, 370, 349].forEach((f, i) => tone(f, .2, 'triangle', .05, 0, i * .16)); },
  dirty() { tone(2200, .05, 'triangle', .03); tone(1800, .05, 'triangle', .03, 0, .05); },
  whistle() { tone(1200, .5, 'sine', .05, 1600); tone(2400, .4, 'sine', .01, 3200); }
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
  document.querySelectorAll('.kpad .joy').forEach(joyRest);
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

/* touch: joystick + buttons. The joystick floats (like a phone MMORPG): touch anywhere on your own half of the screen
   (all of it when playing online) and the stick comes to your finger; drag past its rim and it follows. Let go and it
   goes back to its corner. The buttons stay where they are. */
const kjoys = new Map(), kbtns = new Map();
const kpad = $('#kpad');
const padId = el => (el.dataset.p === 'local' ? (O.local || 'pink') : el.dataset.p);
const ZONE_JOY = { pink: '.kside.pink .joy', mint: '.kside.mint .joy', solo: '.kside.solo-joy .joy' };
function joyPlace(s) { s.el.style.transform = `translate(${s.cx - s.hx}px, ${s.cy - s.hy}px)`; }
function joyStart(e, j) {
  for (const o of kjoys.values()) if (o.el === j) return;                // that stick already has a finger on it
  j.style.transform = '';
  const h = j.getBoundingClientRect(), half = h.width / 2;
  const s = { el: j, id: padId(j), hx: h.left + half, hy: h.top + half, w: h.width, R: h.width * 0.34, cx: e.clientX, cy: e.clientY };
  if (Math.hypot(e.clientX - s.hx, e.clientY - s.hy) <= half) { s.cx = s.hx; s.cy = s.hy; }   // on the stick itself: it stays put
  s.cx = Math.max(half, Math.min(innerWidth - half, s.cx)); s.cy = Math.max(half, Math.min(innerHeight - half, s.cy));
  joyPlace(s); j.classList.add('live');
  kjoys.set(e.pointerId, s); joyMove(e);
}
function joyMove(e) {
  const s = kjoys.get(e.pointerId);
  if (!s) return;
  let dx = (e.clientX - s.cx) / s.R, dy = (e.clientY - s.cy) / s.R;
  let m = Math.hypot(dx, dy);
  if (m > 1.4) {                                                          // dragged well past the rim: the stick follows
    const k = 1 - 1.4 / m, half = s.w / 2;
    s.cx = Math.max(half, Math.min(innerWidth - half, s.cx + (e.clientX - s.cx) * k));
    s.cy = Math.max(half, Math.min(innerHeight - half, s.cy + (e.clientY - s.cy) * k));
    joyPlace(s); dx = (e.clientX - s.cx) / s.R; dy = (e.clientY - s.cy) / s.R; m = Math.hypot(dx, dy);
  }
  if (m > 1) { dx /= m; dy /= m; }
  KT[s.id].x = Math.abs(dx) < 0.18 ? 0 : dx;
  KT[s.id].y = Math.abs(dy) < 0.18 ? 0 : dy;
  s.el.querySelector('.knob').style.transform = `translate(${dx * s.w * 0.3}px, ${dy * s.w * 0.3}px)`;
}
function joyRest(el) { el.style.transform = ''; el.classList.remove('live'); el.querySelector('.knob').style.transform = ''; }
kpad.addEventListener('pointerdown', e => {
  const z = e.target.closest('.kzone'), j = z ? $(ZONE_JOY[z.dataset.zone]) : e.target.closest('.joy'), b = e.target.closest('.kb');
  if (j && !b) { e.preventDefault(); try { (z || j).setPointerCapture(e.pointerId); } catch (er) {} joyStart(e, j); audio(); return; }
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
  if (s) { KT[s.id].x = 0; KT[s.id].y = 0; joyRest(s.el); kjoys.delete(e.pointerId); }
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
  setKind('kit'); setPadLabels('kit');
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
  const steel = t === 'S' || t === 'N';
  // the front: cabinet doors with little knobs
  const fg = g.createLinearGradient(0, y + KX - 12, 0, y + KX);
  fg.addColorStop(0, t === 'S' ? '#3a3b4a' : t === 'N' ? '#8a91a5' : '#72c9b4'); fg.addColorStop(1, t === 'S' ? '#24252f' : t === 'N' ? '#646b80' : '#4b9f8b');
  g.fillStyle = fg; g.fillRect(x, y, KX, KX);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + KX / 2 - .5, y + KX - 11, 1, 11);
  g.fillStyle = steel ? '#d9dde8' : '#fff6e0'; g.beginPath(); g.arc(x + KX / 2 - 5, y + KX - 5, 1.4, 0, Math.PI * 2); g.arc(x + KX / 2 + 5, y + KX - 5, 1.4, 0, Math.PI * 2); g.fill();
  // the top
  const tg = g.createLinearGradient(0, y, 0, y + KX - 10);
  if (t === 'S') { tg.addColorStop(0, '#5a5b6e'); tg.addColorStop(1, '#43445a'); }
  else if (t === 'N') { tg.addColorStop(0, '#d3d9e6'); tg.addColorStop(1, '#a9b0c2'); }
  else { tg.addColorStop(0, '#fffaf2'); tg.addColorStop(1, '#f2e2cb'); }
  g.fillStyle = tg; g.fillRect(x + 1, y + 1, KX - 2, KX - 11);
  if (steel) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let k = 4; k < KX - 12; k += 4) { g.beginPath(); g.moveTo(x + 2, y + k); g.lineTo(x + KX - 2, y + k); g.stroke(); } }
  else {
    // pale marble: a couple of soft veins
    g.strokeStyle = 'rgba(200,170,180,.35)'; g.lineWidth = 1;
    const v = (x * 7 + y * 13) % 17;
    g.beginPath(); g.moveTo(x + 4 + v, y + 4); g.bezierCurveTo(x + 18 + v, y + 18, x + 10, y + 30, x + 30 + v * .5, y + KX - 14); g.stroke();
    g.strokeStyle = 'rgba(200,170,180,.2)'; g.beginPath(); g.moveTo(x + KX - 6, y + 8 + v); g.quadraticCurveTo(x + 36, y + 24, x + 44 - v * .4, y + KX - 16); g.stroke();
    g.fillStyle = '#ff9ab5'; g.fillRect(x + 1, y + KX - 13, KX - 2, 2);
  }
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 1, y + 1, KX - 2, 2);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 1, y + KX - 12, KX - 2, 2);
  g.strokeStyle = steel ? 'rgba(40,20,10,.35)' : 'rgba(90,70,60,.22)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, KX - 1, KX - 1);
}
function drawStationArt(g, t, x, y) {
  const cx = x + KX / 2, cy = y + KX / 2 - 5;
  if (Kit.CRATE[t.t]) {
    const cg = g.createLinearGradient(0, y + 5, 0, y + KX - 15); cg.addColorStop(0, '#c08550'); cg.addColorStop(1, '#93603a');
    g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, x + 6, y + 8, KX - 10, KX - 20, 4); g.fill();
    g.fillStyle = cg; rr(g, x + 5, y + 5, KX - 10, KX - 20, 4); g.fill();
    g.strokeStyle = 'rgba(90,55,28,.5)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + 7, y + 5 + k * (KX - 20) / 3); g.lineTo(x + KX - 7, y + 5 + k * (KX - 20) / 3); g.stroke(); }
    g.strokeStyle = '#6e4423'; g.lineWidth = 2; rr(g, x + 6, y + 6, KX - 12, KX - 22, 3); g.stroke();
    g.fillStyle = 'rgba(255,225,170,.3)'; g.fillRect(x + 8, y + 7, KX - 16, 1.5);
    if (t.t === 'R') { g.fillStyle = '#f2efe6'; g.beginPath(); g.ellipse(cx, cy - 2, 18, 14, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fb7c9'; g.fillRect(cx - 18, cy - 2, 36, 10); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy - 4, 14, 8, 0, 0, Math.PI * 2); g.fill(); }
    else drawFood(g, Kit.CRATE[t.t], cx, cy - 2, 0.95);
    g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const lw = g.measureText(LABEL[t.t]).width + 12; rr(g, cx - lw / 2, y + KX - 25, lw, 15, 7.5); g.fillStyle = 'rgba(60,32,16,.82)'; g.fill(); g.fillStyle = '#fff6e0'; g.fillText(LABEL[t.t], cx, y + KX - 13.5);
  } else if (t.t === 'B') {
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x + 8, y + 11, KX - 14, KX - 26, 6); g.fill();
    const bgd = g.createLinearGradient(0, y + 8, 0, y + KX - 18); bgd.addColorStop(0, '#f7e2b8'); bgd.addColorStop(1, '#e2c48e');
    g.fillStyle = bgd; rr(g, x + 7, y + 8, KX - 14, KX - 26, 6); g.fill();
    g.strokeStyle = '#c9a56b'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(170,130,70,.35)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 20, y + 20, 4 + k * 4, .3, 2.2); g.stroke(); }
    g.fillStyle = '#e8edf6'; g.beginPath(); g.moveTo(x + KX - 20, y + 10); g.lineTo(x + KX - 14, y + 12); g.lineTo(x + KX - 14, y + 28); g.lineTo(x + KX - 20, y + 28); g.closePath(); g.fill();
    g.fillStyle = '#b9c2d4'; g.fillRect(x + KX - 20, y + 10, 2, 18);
    g.fillStyle = '#5a3a26'; rr(g, x + KX - 21, y + 28, 8, 10, 2); g.fill(); g.fillStyle = '#d9b36a'; g.fillRect(x + KX - 18, y + 31, 2, 2);
  } else if (t.t === 'M') {
    g.fillStyle = '#7a4a2c'; g.beginPath(); g.ellipse(cx, cy, 20, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4e2f1c'; g.beginPath(); g.ellipse(cx, cy - 2, 14, 10, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#9b6a45'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 6, cy - 4); g.lineTo(cx + 20, cy - 18); g.stroke(); g.lineCap = 'butt';
  } else if (t.t === 'S') {
    const bg2 = g.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 22); bg2.addColorStop(0, '#4a4b5e'); bg2.addColorStop(1, '#1d1e27');
    g.fillStyle = bg2; g.beginPath(); g.arc(cx, cy, 21, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6b6d80'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#8b8ea3'; g.lineWidth = 2.4; g.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19); } g.stroke();
    g.fillStyle = '#c94a3a'; g.beginPath(); g.arc(x + KX - 8, y + KX - 16, 2.4, 0, Math.PI * 2); g.fill();
  } else if (t.t === 'P') {
    // drawn dynamically (count)
  } else if (t.t === 'W') {
    g.fillStyle = '#f4e7c8'; g.fillRect(x + 4, y + 18, KX - 8, KX - 32);
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#e8b23a' : '#d63d3d'; g.fillRect(x + 2 + k * (KX - 4) / 4, y + 2, (KX - 4) / 4, 14); }
    g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(cx + 14, y + 36, 6, Math.PI, 0); g.fill(); g.fillRect(cx + 7, y + 36, 14, 2);
    g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#7a2a2a'; g.fillText('ส่ง', cx - 8, y + 41);
  } else if (t.t === 'X') {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(cx + 1, cy + 3, 20, 0, Math.PI * 2); g.fill();
    const tg2 = g.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 21); tg2.addColorStop(0, '#8a93a8'); tg2.addColorStop(1, '#4d5466');
    g.fillStyle = tg2; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3d4352'; g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5fbf6a'; g.beginPath(); g.moveTo(cx - 5, cy - 3); g.lineTo(cx + 5, cy - 3); g.lineTo(cx + 3, cy + 6); g.lineTo(cx - 3, cy + 6); g.closePath(); g.fill();
    g.strokeStyle = '#8890a3'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.stroke();
  } else if (t.t === 'N') {
    g.fillStyle = '#6f778c'; rr(g, x + 6, y + 7, KX - 12, KX - 24, 8); g.fill();
    const wg = g.createLinearGradient(0, y + 11, 0, y + KX - 21); wg.addColorStop(0, '#7fd0ea'); wg.addColorStop(1, '#3d93b5');
    g.fillStyle = wg; rr(g, x + 10, y + 11, KX - 20, KX - 32, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 14, y + 14, 12, 2.5); g.fillRect(x + 30, y + 22, 6, 2);
    g.fillStyle = '#c9cfdc'; rr(g, x + KX / 2 - 3, y + 2, 6, 9, 2); g.fill(); g.fillRect(x + KX / 2 - 1, y + 9, 2, 5);
  } else if (t.t === 'D') {
    g.fillStyle = '#3b3346'; rr(g, x + 8, y + 10, KX - 16, KX - 28, 5); g.fill();
    g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#d7cfe8'; g.fillText('คืนจาน', cx, y + KX - 14);
  }
}
function drawTileStatic(g, t, x, y) {
  if (t.t === '#') {
    g.fillStyle = KCOL.wall; g.fillRect(x, y, KX, KX);
    const wg = g.createLinearGradient(0, y, 0, y + KX - 10); wg.addColorStop(0, '#4a3d72'); wg.addColorStop(1, '#3a2f5c'); g.fillStyle = wg; g.fillRect(x, y, KX, KX - 10);
    g.strokeStyle = 'rgba(20,14,40,.35)'; g.lineWidth = 1;
    for (let r = 0; r < 3; r++) { const yy = y + 4 + r * 17; g.beginPath(); g.moveTo(x, yy + 16); g.lineTo(x + KX, yy + 16); g.stroke(); for (let c = (r % 2) * 16; c < KX; c += 32) { g.beginPath(); g.moveTo(x + c, yy); g.lineTo(x + c, yy + 16); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, KX, 2);
    return;
  }
  if (t.t === '~') return;
  if ('.12'.includes(t.t)) return;
  drawCounterBase(g, x, y, t.t);
  drawStationArt(g, t, x, y);
}
function buildKitBg() {
  const G = KS.G;
  if (!G) return;
  kbg.width = cv.width; kbg.height = cv.height;
  const g = kbg.getContext('2d', { alpha: false });
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const R = rng(G.def.name.length * 97 + 3);
  // the back wall: warm wooden planks, a mint tiled splashback, a round window with the sky, a shelf of jars and herbs
  const wg = g.createLinearGradient(0, 0, 0, KY0); wg.addColorStop(0, '#6e4632'); wg.addColorStop(1, '#8a5a3e');
  g.fillStyle = wg; g.fillRect(0, 0, VW, KY0);
  for (let x = 0; x < VW; x += 26) { g.fillStyle = (x / 26) % 2 ? 'rgba(255,220,180,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(x, 0, 26, KY0 - 30); g.fillStyle = 'rgba(40,20,10,.25)'; g.fillRect(x, 0, 1, KY0 - 30); }
  for (let k = 0; k < 18; k++) { g.fillStyle = 'rgba(40,20,10,.18)'; g.beginPath(); g.ellipse(R() * VW, R() * (KY0 - 34), 2.2, 1.2, 0, 0, Math.PI * 2); g.fill(); }
  // splashback tiles under the shelf
  for (let y = KY0 - 30; y < KY0; y += 10) for (let x = ((y / 10) % 2) * 5 - 5; x < VW; x += 10) { g.fillStyle = (Math.floor(x / 10) + Math.floor(y / 10)) % 5 ? '#bfe9dc' : '#ffd6e0'; rr(g, x + .5, y + .5, 9, 9, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 1.5, y + 1.5, 4, 1.2); }
  g.fillStyle = 'rgba(60,30,20,.25)'; g.fillRect(0, KY0 - 30, VW, 2);
  // the window (between the orders and the till)
  const wx = 620, wy = 44, wr = 26;
  g.fillStyle = '#5a3624'; g.beginPath(); g.arc(wx, wy, wr + 5, 0, Math.PI * 2); g.fill();
  const sky = g.createLinearGradient(0, wy - wr, 0, wy + wr); sky.addColorStop(0, '#8fd0ff'); sky.addColorStop(1, '#ffe2c4');
  g.fillStyle = sky; g.beginPath(); g.arc(wx, wy, wr, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(wx, wy, wr, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(wx + 10, wy - 8, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(wx - 8, wy + 4, 11, 4, 0, 0, Math.PI * 2); g.ellipse(wx - 2, wy + 1, 7, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8cc77a'; g.beginPath(); g.ellipse(wx, wy + wr + 6, wr + 6, 16, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  g.strokeStyle = '#5a3624'; g.lineWidth = 3; g.beginPath(); g.moveTo(wx - wr, wy); g.lineTo(wx + wr, wy); g.moveTo(wx, wy - wr); g.lineTo(wx, wy + wr); g.stroke();
  // little curtains
  for (const s of [-1, 1]) { g.fillStyle = '#ff9ab5'; g.beginPath(); g.moveTo(wx + s * (wr + 9), wy - wr - 6); g.quadraticCurveTo(wx + s * 6, wy - wr - 8, wx + s * 4, wy - wr + 2); g.quadraticCurveTo(wx + s * (wr - 4), wy - 6, wx + s * (wr + 9), wy + 6); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; for (let d = 0; d < 3; d++) { g.beginPath(); g.arc(wx + s * (wr - 2 - d * 6), wy - wr + 2 + d * 4, 1.2, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = '#ff9ab5'; rr(g, wx - wr - 12, wy - wr - 9, wr * 2 + 24, 5, 2.5); g.fill();
  // a little clock and a hanging ladle and whisk
  const cx0 = 700, cy0 = 30; g.fillStyle = '#fff6e6'; g.beginPath(); g.arc(cx0, cy0, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ff7aa0'; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = '#5a3624'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx0, cy0 - 7); g.moveTo(cx0, cy0); g.lineTo(cx0 + 5, cy0 + 2); g.stroke();
  for (const [ux, k] of [[548, 0], [566, 1]]) { g.strokeStyle = '#c9ccd8'; g.lineWidth = 2; g.beginPath(); g.moveTo(ux, 18); g.lineTo(ux, 40); g.stroke(); if (k) { g.beginPath(); g.ellipse(ux, 47, 5, 8, 0, 0, Math.PI * 2); g.stroke(); } else { g.fillStyle = '#c9ccd8'; g.beginPath(); g.arc(ux, 44, 5, 0, Math.PI); g.fill(); } g.fillStyle = '#5a3624'; g.beginPath(); g.arc(ux, 16, 2, 0, Math.PI * 2); g.fill(); }
  // the shelf, with jars, herbs and pans
  g.fillStyle = '#4a2c1c'; g.fillRect(0, KY0 - 31, VW, 6); g.fillStyle = '#a8724a'; g.fillRect(0, KY0 - 32, VW, 2);
  for (let x = 30; x < VW - 20; x += 46 + R() * 40) {
    const k = R();
    if (k < .4) { const c = ['#e8574f', '#f2c94c', '#7fd36a', '#c9a0ff', '#ff9ab5'][Math.floor(R() * 5)]; g.fillStyle = 'rgba(230,245,255,.55)'; rr(g, x - 7, KY0 - 50, 14, 18, 4); g.fill(); g.fillStyle = hexA(c, .85); rr(g, x - 6, KY0 - 42, 12, 9, 3); g.fill(); g.fillStyle = c; rr(g, x - 7, KY0 - 53, 14, 4, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - 4, KY0 - 48, 2, 8); }
    else if (k < .7) { g.fillStyle = '#e98a6a'; g.beginPath(); g.moveTo(x - 8, KY0 - 32); g.lineTo(x + 8, KY0 - 32); g.lineTo(x + 6, KY0 - 44); g.lineTo(x - 6, KY0 - 44); g.closePath(); g.fill(); g.fillStyle = '#fff2'; g.fillRect(x - 8, KY0 - 44, 16, 2); g.fillStyle = '#6fc06a'; for (let l = 0; l < 5; l++) { g.beginPath(); g.ellipse(x - 6 + l * 3, KY0 - 48 - (l % 2) * 4, 3, 6, (l - 2) * .35, 0, Math.PI * 2); g.fill(); } }
    else { g.fillStyle = '#ffd25a'; g.beginPath(); g.ellipse(x, KY0 - 39, 9, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8574f'; g.beginPath(); g.moveTo(x - 9, KY0 - 39); g.quadraticCurveTo(x, KY0 - 50, x + 9, KY0 - 39); g.fill(); g.fillStyle = '#fff'; for (const [a, b] of [[-3, -43], [3, -44], [0, -40]]) { g.beginPath(); g.arc(x + a, KY0 + b, 1.2, 0, Math.PI * 2); g.fill(); } }
  }
  // string lights
  g.strokeStyle = 'rgba(255,230,180,.55)'; g.lineWidth = 1;
  g.beginPath(); for (let x = 0; x <= VW; x += 8) g.lineTo(x, 8 + Math.sin(x / VW * Math.PI * 3) * 5); g.stroke();
  for (let x = 12; x < VW; x += 36) {
    const y = 9 + Math.sin(x / VW * Math.PI * 3) * 5, c = ['#ffcf5a', '#ff6f9c', '#4fe0bf', '#ff9a5a'][(x / 36 | 0) % 4];
    const lg = g.createRadialGradient(x, y + 4, 1, x, y + 4, 14); lg.addColorStop(0, hexA(c, .5)); lg.addColorStop(1, hexA(c, 0)); g.fillStyle = lg; g.fillRect(x - 14, y - 10, 28, 28);
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y + 4, 3, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 1, y + 2.6, 1, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, KY0 - 4, VW, 4);
  g.translate(0, KY0);
  for (let y = 0; y < Kit.GH; y++) for (let x = 0; x < Kit.GW; x++) {
    const t = G.tiles[y][x];
    if (t.t === '~') continue;
    const px = x * KX, py = y * KX;
    g.fillStyle = '#dca991'; g.fillRect(px, py, KX, KX);
    const tg = g.createLinearGradient(px, py, px + KX, py + KX); tg.addColorStop(0, (x + y) % 2 ? '#fbdccb' : '#f8d0bc'); tg.addColorStop(1, (x + y) % 2 ? '#f4ccb7' : '#efbfa8');
    g.fillStyle = tg; rr(g, px + 1.5, py + 1.5, KX - 3, KX - 3, 5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, px + 4, py + 3.5, KX * .45, 2, 1); g.fill();
    // a soft diamond in the middle of every other tile
    if ((x + y) % 2 === 0) { const cx = px + KX / 2, cy = py + KX / 2; g.fillStyle = 'rgba(255,245,230,.45)'; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 9, cy); g.lineTo(cx, cy + 9); g.lineTo(cx - 9, cy); g.closePath(); g.fill(); g.fillStyle = 'rgba(120,200,180,.3)'; g.beginPath(); g.arc(cx, cy, 2.4, 0, Math.PI * 2); g.fill(); }
  }
  // little four-petal flowers where the tiles meet
  for (let y = 1; y < Kit.GH; y++) for (let x = 1; x < Kit.GW; x++) {
    if ([G.tiles[y][x], G.tiles[y - 1][x], G.tiles[y][x - 1], G.tiles[y - 1][x - 1]].some(t => !'.12'.includes(t.t))) continue;
    const cx = x * KX, cy = y * KX, c = (x * 7 + y * 3) % 3 ? '#ff8fae' : '#5fc6ad';
    g.fillStyle = '#fff6ea'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(cx + Math.cos(a) * 3.6, cy + Math.sin(a) * 3.6, 3.2, 1.9, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = c; g.beginPath(); g.arc(cx, cy, 1.8, 0, Math.PI * 2); g.fill();
  }
  // warm pools of light under the lamps
  g.save(); g.globalCompositeOperation = 'soft-light';
  for (const lx of [VW * .25, VW * .5, VW * .75]) { const lg = g.createRadialGradient(lx, Kit.GH * KX * .45, 10, lx, Kit.GH * KX * .45, 230); lg.addColorStop(0, 'rgba(255,236,190,.4)'); lg.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = lg; g.fillRect(lx - 240, 0, 480, Kit.GH * KX); }
  g.restore();
  for (let y = 0; y < Kit.GH; y++) for (let x = 0; x < Kit.GW; x++) drawTileStatic(g, G.tiles[y][x], x * KX, y * KX);
  // soft shadows on the floor below counters and walls
  for (let y = 1; y < Kit.GH; y++) for (let x = 0; x < Kit.GW; x++) {
    if (!'.12'.includes(G.tiles[y][x].t) || '.12~'.includes(G.tiles[y - 1][x].t)) continue;
    const sg = g.createLinearGradient(0, y * KX, 0, y * KX + 14); sg.addColorStop(0, 'rgba(70,40,20,.28)'); sg.addColorStop(1, 'rgba(70,40,20,0)'); g.fillStyle = sg; g.fillRect(x * KX, y * KX, KX, 14);
  }
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
      if (it.st === 'cook') {
        bar(g, x + 8, y - 6, KX - 16, it.p, '#ffb347');
        for (let k = 0; k < 3; k++) { const sy = (time * 22 + k * 13) % 34, a = .45 * (1 - sy / 34); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(cx - 7 + k * 7 + Math.sin(time * 3 + k + sy * .2) * 3, cy - 4 - sy, 3 + sy * .12, 0, Math.PI * 2); g.fill(); }
        if (Math.sin(time * 37 + x) > .7) { g.fillStyle = '#ffe08a'; g.fillRect(cx + Math.sin(time * 53) * 14, cy + Math.cos(time * 41) * 6, 2, 2); }
      }
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
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, p.y + 15, 18, 6, 0, 0, Math.PI * 2); g.fill();
  roundBody(g, x, y, 19, p.id, false, p.walk || 0);
  // the chef's hat: puffy, a little shaded, with a band in their colour
  const hx0 = x - p.fx * 3, hy0 = y - 16 - p.fy * 2;
  g.fillStyle = '#d9d3ea'; g.beginPath(); g.arc(hx0 - 6, hy0 - 4, 6.4, 0, Math.PI * 2); g.arc(hx0 + 6, hy0 - 4, 6.4, 0, Math.PI * 2); g.arc(hx0, hy0 - 8, 7, 0, Math.PI * 2); g.ellipse(hx0, hy0 + 1, 13.4, 8.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(hx0, hy0, 13, 8, 0, 0, Math.PI * 2); g.arc(hx0 - 6, hy0 - 5, 6, 0, Math.PI * 2); g.arc(hx0 + 6, hy0 - 5, 6, 0, Math.PI * 2); g.arc(hx0, hy0 - 8, 6.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(220,214,240,.9)'; g.beginPath(); g.arc(hx0 + 3, hy0 - 3, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx0 + 2, hy0 - 4.4, 4, 0, Math.PI * 2); g.fill();
  rr(g, hx0 - 12, hy0 + 3, 24, 4, 2); g.fillStyle = col; g.fill();
  if (p.fy >= 0) cuteFace(g, x + p.fx * 6, y + 2 + p.fy * 3, p.fx, time, pink, p.using ? 'happy' : '', 1.15, p.fy, p.id);
  if (p.using) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; const a = time * 20; g.beginPath(); g.arc(hx, hy, 14, a, a + 1.2); g.stroke(); }
  if (it) drawItem(g, it, hx, hy, 0.85);
  if (nameA <= 0) return;
  g.globalAlpha = nameA; nameTag(g, name, x, y - 34, col); g.globalAlpha = 1;
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
    rr(g, x + 2, y + 4, w, h, 8); g.fillStyle = 'rgba(10,6,24,.3)'; g.fill();
    rr(g, x, y, w, h, 8); g.fillStyle = '#fff8e6'; g.fill();
    g.strokeStyle = f < 0.2 ? '#ff4d4d' : '#e8d3a8'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#e8574f'; g.beginPath(); g.arc(x + w / 2, y + 2, 3.4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x + w / 2 - 1, y + 1, 1.1, 0, Math.PI * 2); g.fill();
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
  const rx = VW - 18;
  panel(g, VW - 214, 12, 206, KY0 - 18, 12, .86);
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
S.tab = ['adv', ...KINDS].includes(store.get('tab', 'adv')) ? store.get('tab', 'adv') : 'adv';
function setTab(t) {
  S.tab = t; store.set('tab', t);
  for (const k of ['adv', ...KINDS]) app.classList.toggle('tab-' + k, t === k);
  document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  renderLevels();
  if (S.mode === 'menu' && !O.role) {
    if (t === 'kit') { loadKitchen(+$('#bGo').dataset.k || 0); S.banner = 0; }
    else if (t === 'def') { loadDefense(+$('#bGo').dataset.d || 0); S.banner = 0; }
    else if (t === 'drv') { loadDrive(+$('#bGo').dataset.r || 0); S.banner = 0; }
    else if (t === 'tak') { loadTak(+$('#bGo').dataset.t || 0); S.banner = 0; }
    else if (t === 'mus') { loadMus(+$('#bGo').dataset.m || 0); MS.t0 = performance.now() + 1e9; }
    else if (t === 'twr') { loadTwr(+$('#bGo').dataset.w || 0); S.banner = 0; }
    else if (t === 'leg') { loadLeg(+$('#bGo').dataset.l || 0); }
    else if (t === 'boat') { loadBoat(+$('#bGo').dataset.b || 0); }
    else if (t === 'mov') { loadMov(+$('#bGo').dataset.v || 0); S.banner = 0; }
    else if (t === 'kite') { loadKite(+$('#bGo').dataset.f || 0); S.banner = 0; }
    else if (MODES[t]) { MODES[t].load(+$('#bGo').dataset[MODES[t].dk] || 0); S.banner = 0; }
    else if (S.kind !== 'adv') { setKind('adv'); buildBg(); }
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
  pew(id) { tone(id === 'pink' ? 1250 : 950, .05, 'triangle', .026, id === 'pink' ? 1700 : 650); },
  pop() { tone(520, .09, 'sine', .055, 1200); noise(.05, 2400, .02, 'bandpass', 2); },
  coin() { chime(1568, .18, .03); chime(2093, .28, .028, .05); },
  burst() { noise(.35, 1000, .05, 'bandpass', 1, 200); tone(880, .25, 'sine', .04, 1760); [1319, 1760].forEach((f, i) => chime(f, .3, .02, .05 + i * .05)); },
  heal() { [784, 988, 1175, 1568].forEach((f, i) => chime(f, .35, .04, i * .05)); },
  down() { tone(520, .5, 'triangle', .07, 130); noise(.25, 400, .03, 'lowpass', .8, 120, .2); },
  revive() { [523, 784, 1047].forEach((f, i) => chime(f, .3, .05, i * .08)); },
  build() { [330, 495, 660].forEach((f, i) => { tone(f, .07, 'triangle', .05, 0, i * .07); noise(.04, 1300, .03, 'bandpass', 2, 0, i * .07); }); },
  repair() { noise(.03, 2600, .05, 'bandpass', 4); tone(700 + Math.random() * 300, .03, 'triangle', .02); },
  fireball() { noise(.3, 500, .04, 'bandpass', 1, 1600); tone(160, .2, 'sawtooth', .03, 320); },
  houseHit() { tone(110, .14, 'sine', .08, 60); noise(.12, 450, .05, 'lowpass', .8); },
  horn() { tone(196, .5, 'sawtooth', .05, 220); tone(294, .5, 'sawtooth', .035, 330, .05); },
  rest() { chime(1047, .4, .05); chime(1319, .5, .04, .12); },
  boss() { tone(98, 1.2, 'sawtooth', .07, 65); tone(147, 1.2, 'square', .03, 98, .1); noise(1.2, 200, .06, 'lowpass', .7, 60); },
  lost() { [392, 330, 262, 196].forEach((f, i) => tone(f, .32, 'triangle', .06, 0, i * .2)); },
  summon() { tone(300, .3, 'sine', .04, 150); noise(.4, 900, .015, 'bandpass', 3, 300); }
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
  setKind('def');
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
  const cx = x + DK / 2, cy = y + DK / 2, r = rng(s), kind = s % 5;
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx + 3, cy + 16, 24, 9, 0, 0, Math.PI * 2); g.fill();
  if (kind === 1) {
    // a little pine, three tiers, a star of light on top
    g.fillStyle = '#3d2a1c'; g.fillRect(cx - 3, cy + 8, 6, 12);
    for (const [ty, w, c] of [[8, 26, '#14392c'], [-4, 21, '#1b4a37'], [-15, 15, '#245c44']]) { g.fillStyle = c; g.beginPath(); g.moveTo(cx - w, cy + ty + 6); g.quadraticCurveTo(cx, cy + ty + 10, cx + w, cy + ty + 6); g.lineTo(cx, cy + ty - 16); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(180,240,200,.2)'; g.beginPath(); g.moveTo(cx - 3, cy - 30); g.lineTo(cx - 12, cy - 12); g.lineTo(cx - 4, cy - 14); g.closePath(); g.fill();
    g.fillStyle = '#fff3b0'; twinkle(g, cx, cy - 32, 4);
    return;
  }
  g.fillStyle = '#3d2a1c'; g.fillRect(cx - 4, cy + 2, 8, 16); g.fillStyle = '#5a3e28'; g.fillRect(cx - 4, cy + 2, 3, 16);
  const pal = kind === 3 ? ['#123a3a', '#18494a', '#1f5a59', '#2b706d'] : ['#0f2a20', '#163a2c', '#1b4634', '#25563f'];
  g.fillStyle = pal[0]; g.beginPath(); g.arc(cx, cy - 3, 24, 0, Math.PI * 2); g.fill();
  for (const [dx, dy, rad, k] of [[0, -4, 22, 1], [-11, 3, 15, 2], [11, 1, 16, 2], [-5, -11, 13, 3], [6, -9, 11, 3]]) {
    g.fillStyle = pal[k]; g.beginPath(); g.arc(cx + dx + (r() - .5) * 4, cy + dy + (r() - .5) * 4, rad, 0, Math.PI * 2); g.fill();
  }
  // moonlight on the top, a rim of light
  g.fillStyle = 'rgba(190,240,210,.2)'; g.beginPath(); g.arc(cx - 7, cy - 15, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(220,255,235,.35)'; g.beginPath(); g.ellipse(cx - 9, cy - 17, 3.5, 2, -.5, 0, Math.PI * 2); g.fill();
  if (kind === 0 || kind === 4) { g.fillStyle = kind ? '#ffb3cf' : '#fff0b0'; for (let k = 0; k < 6; k++) { const fx = cx - 15 + r() * 30, fy = cy - 18 + r() * 24; for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; g.beginPath(); g.arc(fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.6, 1.4, 0, Math.PI * 2); g.fill(); } } }
  else if (kind === 2) { g.fillStyle = '#ff6b8a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx - 12 + r() * 24, cy - 12 + r() * 18, 2.3, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(cx - 8 + k * 9, cy - 9 + k * 3, .8, 0, Math.PI * 2); g.fill(); } }
  else { g.fillStyle = 'rgba(160,255,240,.7)'; for (let k = 0; k < 3; k++) { const fx = cx - 12 + r() * 24, fy = cy - 14 + r() * 20; g.beginPath(); g.arc(fx, fy, 1.6, 0, Math.PI * 2); g.fill(); } }
}
function drawFence(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + DK - 8, DK, 6);
  for (const fx of [10, 30, 50]) {
    g.fillStyle = '#5b3b24'; rr(g, x + fx - 4, y + 6, 8, DK - 14, 2); g.fill();
    g.fillStyle = '#7a5032'; g.beginPath(); g.moveTo(x + fx - 4, y + 9); g.lineTo(x + fx, y + 3); g.lineTo(x + fx + 4, y + 9); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,180,.18)'; g.fillRect(x + fx - 3, y + 8, 2, DK - 18);
  }
  g.fillStyle = '#7a5032'; g.fillRect(x, y + 18, DK, 6); g.fillRect(x, y + 38, DK, 6);
  g.fillStyle = 'rgba(255,220,180,.2)'; g.fillRect(x, y + 18, DK, 1.5); g.fillRect(x, y + 38, DK, 1.5);
}
function drawGate(g, x, y, t) {
  // a little spirit gate: a misty purple swirl between two red posts with a curved roof
  const cx = x + DK / 2, cy = y + DK / 2, horiz = t.y === 0 || t.y === Def.GH - 1;
  const gl = g.createRadialGradient(cx, cy, 2, cx, cy, 30); gl.addColorStop(0, 'rgba(210,170,255,.75)'); gl.addColorStop(.5, 'rgba(150,100,255,.35)'); gl.addColorStop(1, 'rgba(120,80,255,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(240,220,255,.55)'; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx, cy, 6 + k * 6, k * 1.4, k * 1.4 + Math.PI * 1.2); g.stroke(); }
  g.save(); g.translate(cx, cy); if (horiz) g.rotate(Math.PI / 2);
  for (const s of [-1, 1]) { g.fillStyle = '#c23b35'; rr(g, -DK / 2 + 4, s * 22 - 3, DK - 8, 6, 3); g.fill(); g.fillStyle = 'rgba(255,200,180,.4)'; g.fillRect(-DK / 2 + 6, s * 22 - 2.5, DK - 12, 1.2); }
  g.fillStyle = '#e8b23a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(-DK / 2 + 6, s * 22, 3, 0, Math.PI * 2); g.arc(DK / 2 - 6, s * 22, 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
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
  const g = defBg.getContext('2d', { alpha: false });
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, DY0);
  sky.addColorStop(0, '#0b0a1f'); sky.addColorStop(1, '#1b1636');
  g.fillStyle = sky; g.fillRect(0, 0, VW, DY0);
  const r = rng(99);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .5})`; g.fillRect(r() * VW, r() * (DY0 - 10), 1.5, 1.5); }
  const mg = g.createRadialGradient(VW * .66, 14, 10, VW * .66, 14, 70); mg.addColorStop(0, 'rgba(255,240,200,.3)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = mg; g.fillRect(VW * .66 - 70, 0, 140, DY0);
  g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(VW * 0.66, 14, 22, 0, Math.PI); g.fill();
  g.fillStyle = 'rgba(220,210,180,.5)'; g.beginPath(); g.arc(VW * .66 - 8, 22, 4, 0, Math.PI * 2); g.arc(VW * .66 + 7, 28, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0f1d1a'; g.beginPath(); g.moveTo(0, DY0);
  for (let x = 0; x <= VW; x += 24) g.lineTo(x, DY0 - 10 - 8 * Math.abs(Math.sin(x * .07)) - 6 * Math.sin(x * .023));
  g.lineTo(VW, DY0); g.fill();
  g.translate(0, DY0);
  // one moonlit lawn: soft lighter patches, blades, flowers that glow a little, mushrooms
  const GWp = Def.GW * DK, GHp = Def.GH * DK, rl = rng(hash(G.def.name.length, 7));
  g.fillStyle = '#1f4031'; g.fillRect(0, 0, GWp, GHp);
  for (let k = 0; k < 55; k++) { g.fillStyle = k % 3 ? 'rgba(80,150,110,.09)' : 'rgba(20,40,40,.18)'; g.beginPath(); g.ellipse(rl() * GWp, rl() * GHp, 20 + rl() * 40, 12 + rl() * 22, rl() * 3, 0, Math.PI * 2); g.fill(); }
  // paths of round stepping stones from each gate to the house
  const hc = G.houses.length ? [G.houses[0].x != null ? G.houses[0].x : GWp / 2, GHp / 2] : [GWp / 2, GHp / 2];
  for (let y = 0; y < Def.GH; y++) for (let x = 0; x < Def.GW; x++) {
    if (G.tiles[y][x].t !== 'G') continue;
    const sx = (x + .5) * DK, sy = (y + .5) * DK, ex = GWp / 2, ey = GHp / 2, n = Math.floor(Math.hypot(ex - sx, ey - sy) / 26);
    for (let k = 1; k < n - 2; k++) { const u = k / n, px = sx + (ex - sx) * u + Math.sin(k * 1.7) * 5, py = sy + (ey - sy) * u + Math.cos(k * 2.3) * 4;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 1, py + 2, 10, 6.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7d7a90'; g.beginPath(); g.ellipse(px, py, 10, 6.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(220,225,255,.25)'; g.beginPath(); g.ellipse(px - 2, py - 2, 5, 2.5, 0, 0, Math.PI * 2); g.fill(); }
  }
  void hc;
  for (let y = 0; y < Def.GH; y++) for (let x = 0; x < Def.GW; x++) {
    const t = G.tiles[y][x], px = x * DK, py = y * DK;
    const rr2 = rng(hash(x, y));
    g.strokeStyle = 'rgba(140,220,160,.2)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const gx = px + rr2() * DK, gy = py + rr2() * DK; g.beginPath(); g.moveTo(gx, gy + 4); g.quadraticCurveTo(gx + 1, gy, gx + (rr2() - .5) * 4, gy - 3); g.stroke(); }
    g.lineCap = 'butt';
    if (t.t !== '.') continue;
    const k2 = rr2();
    if (k2 < .14) { const fx = px + 10 + rr2() * (DK - 20), fy = py + 10 + rr2() * (DK - 20), c = ['#cfd8ff', '#ffd1e8', '#fff3b0', '#c9f6ff'][Math.floor(rr2() * 4)];
      const gl = g.createRadialGradient(fx, fy, 1, fx, fy, 12); gl.addColorStop(0, hexA(c, .25)); gl.addColorStop(1, hexA(c, 0)); g.fillStyle = gl; g.fillRect(fx - 12, fy - 12, 24, 24);
      g.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2.1, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.5, 0, Math.PI * 2); g.fill(); }
    else if (k2 < .2) { // a little glowing mushroom
      const fx = px + 12 + rr2() * (DK - 24), fy = py + 14 + rr2() * (DK - 24), c = rr2() < .5 ? '#7ff0ff' : '#ff9ad5';
      const gl = g.createRadialGradient(fx, fy - 3, 1, fx, fy - 3, 16); gl.addColorStop(0, hexA(c, .35)); gl.addColorStop(1, hexA(c, 0)); g.fillStyle = gl; g.fillRect(fx - 16, fy - 19, 32, 32);
      g.fillStyle = '#e8e2f0'; g.fillRect(fx - 1.5, fy - 3, 3, 6); g.fillStyle = c; g.beginPath(); g.arc(fx, fy - 3, 5, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(fx - 2, fy - 5, 1, 0, Math.PI * 2); g.arc(fx + 2, fy - 4.5, .8, 0, Math.PI * 2); g.fill(); }
    else if (k2 < .27) { g.fillStyle = 'rgba(150,150,170,.4)'; g.beginPath(); g.ellipse(px + rr2() * DK, py + rr2() * DK, 2.5, 1.6, 0, 0, Math.PI * 2); g.fill(); }
  }
  const moon = g.createRadialGradient(VW / 2, Def.GH * DK / 2, 30, VW / 2, Def.GH * DK / 2, VW * .6);
  moon.addColorStop(0, 'rgba(190,220,255,.14)'); moon.addColorStop(1, 'rgba(20,10,50,.32)');
  g.fillStyle = moon; g.fillRect(0, 0, VW, Def.GH * DK);
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
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(px + DK / 2 - 7, py + DK / 2 - 3, 8, 4, -.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(110,170,90,.55)'; g.beginPath(); g.ellipse(px + DK / 2 + 9, py + DK / 2 + 5, 7, 3.5, .3, 0, Math.PI * 2); g.fill();
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
  roundBody(g, x, yy, 18, p.id, p.hurt > 0, p.walk || 0);
  if (pink) cuteBow(g, x + 6, yy - 16, 1.25); else cuteSprout(g, x, yy - 16, 1.35, time);
  const ex = p.ax * 5, ey = p.ay * 3;
  cuteFace(g, x + ex, yy + ey - 1, p.ax, time, pink, p.hurt > 0 ? 'o' : '', 1.15, p.ay, p.id);
  // little slingshot in the aim direction
  g.strokeStyle = '#6b4329'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + p.ax * 16, yy + p.ay * 16 + 4); g.lineTo(x + p.ax * 25, yy + p.ay * 25 + 2); g.stroke();
  if (p.using) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; const a = time * 18; g.beginPath(); g.arc(x + p.fx * 24, yy + p.fy * 22, 12, a, a + 1.3); g.stroke(); }
  if (p.hp < p.max) {
    g.fillStyle = 'rgba(21,18,43,.8)'; rr(g, x - 19, y + 21, 38, 6, 3); g.fill();
    g.fillStyle = p.hp > 50 ? '#5fd36a' : p.hp > 25 ? '#ffb347' : '#ff4d4d'; rr(g, x - 18, y + 22, 36 * p.hp / p.max, 4, 2); g.fill();
  }
  if (p.cd <= 0) { g.strokeStyle = hexA(col, .55 + Math.sin(time * 5) * .25); g.lineWidth = 2; g.beginPath(); g.arc(x, yy, 23, 0, Math.PI * 2); g.stroke(); }
  if (nameA > 0) {
    g.globalAlpha = nameA; nameTag(g, name, x, yy - 32 - wardLift(p.id) * 1.2, col); g.globalAlpha = 1;
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
    panel(g, x - w / 2, y - 14, w, 20, 10, .88);
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
  for (let i = 0; i < 14; i++) {
    const fx = ((i * 211.7 + Math.sin(time * .2 + i) * 80) % VW + VW) % VW, fy = (i * 97.3) % (Def.GH * DK) + Math.sin(time * .5 + i * 1.7) * 18, a = .45 + .45 * Math.sin(time * 2.2 + i * 2.3);
    if (a < .12) continue;
    g.fillStyle = `rgba(200,255,150,${a * .2})`; g.beginPath(); g.arc(fx, fy, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(230,255,190,${a})`; g.beginPath(); g.arc(fx, fy, 1.7, 0, Math.PI * 2); g.fill();
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
    panel(g, x - 4, y - 4, w + 8, 30, 8, .85);
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
  turboS() { tone(200, .5, 'sawtooth', .045, 900); noise(.5, 600, .04, 'bandpass', 1, 3000); },
  crash() { noise(.35, 900, .07, 'lowpass', .8, 200); tone(90, .25, 'square', .06, 40); [2200, 2900, 2500].forEach((f, i) => tone(f, .08, 'sine', .012, 0, .05 + i * .05)); },
  cluck() { tone(900, .05, 'square', .04, 1300); tone(1100, .07, 'square', .035, 700, .07); noise(.06, 1800, .015, 'bandpass', 2, 0, .1); },
  xbell() { chime(1568, .25, .035); },
  trainHorn() { tone(233, .9, 'sawtooth', .05); tone(277, .9, 'sawtooth', .035); },
  pickup() { chime(784, .25, .05); chime(1175, .35, .05, .07); },
  cash() { [1047, 1319, 1568, 2093].forEach((f, i) => chime(f, .3, .045, i * .06)); noise(.08, 4000, .015, 'highpass', .7, 0, .02); }
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
      o.connect(f).connect(g).connect(mixer(a).fx); o.start();
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
$('#bSwap').addEventListener('click', () => { if (MODES[S.kind] && MODES[S.kind].swap) MODES[S.kind].swap(); else if (S.kind === 'kite') iSwap(); else swapRoles(); });

/* ---------- flow ---------- */
function rSnap(G) { const e = G.evR || G.ev; return Object.assign({ money: G.money, orders: G.orders.length, ids: G.orders.map(o => o.id).join() }, e); }
function loadDrive(i, net) {
  RS.li = i; RS.G = Drv.load(RLEVELS[i]); RS.G.net = net || null;
  RS.acc = 0; RS.floats = []; RS.act = { n: RS.act.n }; RS.seenKa = -1; RS.remote = { s: 0, p: 0, act: false }; RS.endT = 0; RS.savedB = null; RS.prev = null;
  RS.cam.x = RS.G.car.x; RS.cam.y = RS.G.car.y;
  setKind('drv');
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
    const r = rng(hash(x, y));
    if (isRoad(c) || c === '=') {
      g.fillStyle = G.rain ? '#2f3140' : '#3b3c4b'; g.fillRect(px, py, RK, RK);
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let k = 0; k < 10; k++) g.fillRect(px + r() * RK, py + r() * RK, 2, 2);
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 6; k++) g.fillRect(px + r() * RK, py + r() * RK, 3, 2);
      if (c === 'p') { g.fillStyle = 'rgba(110,160,220,.55)'; g.beginPath(); g.ellipse(px + 32, py + 34, 24, 15, 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(px + 26, py + 30, 8, 3, .3, 0, Math.PI * 2); g.fill(); }
      // a kerb where the road meets anything else
      if (c !== '=') for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const n = T(x + dx, y + dy); if (isRoad(n) || n === '=') continue;
        g.fillStyle = '#b8b4c4'; const kx = dx > 0 ? px + RK - 5 : px, ky = dy > 0 ? py + RK - 5 : py;
        if (dx) g.fillRect(kx, py, 5, RK); else g.fillRect(px, ky, RK, 5);
        g.fillStyle = '#8f8ba0'; if (dx) for (let k = 0; k < RK; k += 16) g.fillRect(kx, py + k, 5, 1.5); else for (let k = 0; k < RK; k += 16) g.fillRect(px + k, ky, 1.5, 5);
      }
    } else if (c === ' ' || c === 't' || c === 'k') {
      g.fillStyle = c === 'k' ? '#8f7d43' : '#3f7a46'; g.fillRect(px, py, RK, RK);
      g.fillStyle = c === 'k' ? 'rgba(240,210,120,.35)' : 'rgba(150,220,140,.25)';
      for (let k = 0; k < 8; k++) { const gx = px + r() * RK, gy = py + r() * RK; g.fillRect(gx, gy, 2, 6); g.fillRect(gx + 3, gy + 2, 2, 4); }
      if (c === ' ' && r() < .3) { const fx = px + 10 + r() * 44, fy = py + 10 + r() * 44; g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff'][Math.floor(r() * 3)]; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.5, 0, Math.PI * 2); g.fill(); }
    } else if (c === '~') {
      g.fillStyle = '#25617f'; g.fillRect(px, py, RK, RK);
      g.strokeStyle = 'rgba(160,220,240,.3)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const wy = py + 12 + k * 20 + r() * 6; g.beginPath(); g.moveTo(px + 6 + r() * 10, wy); g.quadraticCurveTo(px + 24, wy - 4, px + 40 + r() * 16, wy); g.stroke(); }
    }
    else if (c === '#') {
      g.fillStyle = '#f4ead8'; g.fillRect(px - .5, py - .5, RK + 1, RK + 1);
      const col = ROOF[blk[y][x] % ROOF.length], tex = blk[y][x] % 3;
      const inset = (dx, dy) => (T(x + dx, y + dy) === '#' ? 0 : 7);
      const l = inset(-1, 0), r2 = inset(1, 0), t2 = inset(0, -1), b2 = inset(0, 1);
      const rg = g.createLinearGradient(px, py, px + RK * .7, py + RK); rg.addColorStop(0, hexA('#ffffff', .0)); rg.addColorStop(1, hexA('#000000', .1));
      g.fillStyle = col; g.fillRect(px + l, py + t2, RK - l - r2, RK - t2 - b2);
      g.fillStyle = rg; g.fillRect(px + l, py + t2, RK - l - r2, RK - t2 - b2);
      if (t2) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(px + l, py + t2, RK - l - r2, 2.5); }
      if (l) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(px + l, py + t2, 2.5, RK - t2 - b2); }
      g.fillStyle = 'rgba(0,0,0,.12)'; if (!b2) {} else g.fillRect(px + l, py + RK - b2 - 6, RK - l - r2, 6);
      if (tex === 0) { g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 1.5; for (let k = 10; k < RK - 6; k += 10) { g.beginPath(); g.moveTo(px + l + 2, py + k); g.lineTo(px + RK - r2 - 2, py + k); g.stroke(); } }
      else if (tex === 1) { g.fillStyle = 'rgba(0,0,0,.08)'; for (let yy = py + t2 + 2; yy < py + RK - b2 - 4; yy += 9) for (let xx = px + l + ((yy / 9) % 2 ? 0 : 6); xx < px + RK - r2 - 4; xx += 12) { g.beginPath(); g.arc(xx + 6, yy + 6, 6, 0, Math.PI); g.fill(); } }
      else { g.fillStyle = 'rgba(255,255,255,.08)'; for (let yy = py + t2; yy < py + RK - b2; yy += 16) for (let xx = px + l; xx < px + RK - r2; xx += 16) if (((xx - px) / 16 + (yy - py) / 16) % 2 < 1) g.fillRect(xx, yy, 16, 16); }
      // the parapet: a soft cream rim with a little shade inside
      g.fillStyle = 'rgba(120,100,90,.25)'; if (t2) g.fillRect(px + l, py + t2, RK - l - r2, 2); if (l) g.fillRect(px + l, py + t2, 2, RK - t2 - b2);
      // things on the roof: an air conditioner, a water tank, solar panels, a potted plant
      const q = r();
      if (q > .25 && q < .3 && !l && !r2) { // a washing line with little clothes
        g.strokeStyle = '#8a8070'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 6, py + 20); g.lineTo(px + RK - 6, py + 22); g.stroke();
        ['#ff8fb8', '#7fd0ff', '#ffd25a', '#9be07a'].forEach((c, k) => { g.fillStyle = c; rr(g, px + 10 + k * 12, py + 21 + k * .5, 8, 9, 2); g.fill(); });
      } else if (q > .3 && q < .315) { // a cat asleep in the sun
        const cx = px + 32, cy = py + 34; g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(cx + 2, cy + 3, 11, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f2a65a'; g.beginPath(); g.ellipse(cx, cy, 11, 7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx + 9, cy - 3, 5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(cx + 6, cy - 6); g.lineTo(cx + 7, cy - 11); g.lineTo(cx + 10, cy - 7); g.fill(); g.beginPath(); g.moveTo(cx + 10, cy - 7); g.lineTo(cx + 13, cy - 10); g.lineTo(cx + 13, cy - 5); g.fill();
        g.strokeStyle = '#f2a65a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 10, cy); g.quadraticCurveTo(cx - 16, cy + 6, cx - 8, cy + 7); g.stroke(); g.lineCap = 'butt';
        g.strokeStyle = '#c97a3a'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx - 4 + k * 4, cy - 6); g.lineTo(cx - 3 + k * 4, cy - 2); g.stroke(); }
        g.strokeStyle = '#3a2418'; g.beginPath(); g.arc(cx + 8, cy - 3, 1.4, 0, Math.PI); g.arc(cx + 11.5, cy - 3, 1.4, 0, Math.PI); g.stroke();
      } else if (q > .34 && q < .4) { // a planter box of flowers
        g.fillStyle = '#b86a44'; rr(g, px + 14, py + 26, 36, 12, 3); g.fill(); g.fillStyle = '#5fae55'; g.beginPath(); g.ellipse(px + 32, py + 26, 18, 6, 0, 0, Math.PI * 2); g.fill();
        ['#ff7aa8', '#ffd25a', '#fff', '#ff9a5c', '#c9a0ff'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(px + 18 + k * 7, py + 23 + (k % 2) * 3, 2.6, 0, Math.PI * 2); g.fill(); });
      } else if (q < .09) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(px + 22, py + 24, 22, 16); g.fillStyle = '#d9dbe6'; g.fillRect(px + 20, py + 21, 22, 16); g.strokeStyle = '#9a9cb0'; g.lineWidth = 1; g.beginPath(); g.arc(px + 31, py + 29, 5, 0, Math.PI * 2); g.stroke(); }
      else if (q < .15) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(px + 34, py + 34, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5b8fd6'; g.beginPath(); g.arc(px + 32, py + 31, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8fb6ec'; g.beginPath(); g.arc(px + 29, py + 28, 5, 0, Math.PI * 2); g.fill(); }
      else if (q < .2) { g.fillStyle = '#2c3a66'; g.fillRect(px + 14, py + 16, 34, 26); g.strokeStyle = '#7a8cc8'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px + 14 + k * 8.5, py + 16); g.lineTo(px + 14 + k * 8.5, py + 42); g.stroke(); } g.beginPath(); g.moveTo(px + 14, py + 29); g.lineTo(px + 48, py + 29); g.stroke(); }
      else if (q < .25) { g.fillStyle = '#b86a44'; g.beginPath(); g.arc(px + 30, py + 32, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4f9a52'; g.beginPath(); g.arc(px + 30, py + 30, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6cbf6a'; g.beginPath(); g.arc(px + 27, py + 27, 4, 0, Math.PI * 2); g.fill(); }
    }
    if (c === '=') {
      const roadSide = isRoad(T(x - 1, y)) || isRoad(T(x + 1, y));
      if (!roadSide) { g.fillStyle = '#6b6258'; g.fillRect(px, py, RK, RK); }
      g.fillStyle = '#4a3624'; for (let k = 4; k < RK; k += 12) g.fillRect(px + 12, py + k, RK - 24, 5);
      g.fillStyle = '#c8c8d2'; g.fillRect(px + 18, py, 4, RK); g.fillRect(px + RK - 22, py, 4, RK);
    }
    if (c === 't') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 38, py + 40, 27, 15, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#245a33'; g.beginPath(); g.arc(px + 32, py + 30, 27, 0, Math.PI * 2); g.fill();
      for (const [dx, dy, rad, cc] of [[-9, 2, 14, '#2b6a3c'], [9, 4, 15, '#2b6a3c'], [0, -8, 16, '#357a45'], [-6, -10, 11, '#3f8a4f'], [7, -6, 9, '#4c9a5a']]) { g.fillStyle = cc; g.beginPath(); g.arc(px + 32 + dx, py + 30 + dy, rad, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(220,255,200,.25)'; g.beginPath(); g.arc(px + 24, py + 18, 6, 0, Math.PI * 2); g.fill();
    }
  }
  // buildings and trees cast a soft shadow down and to the right
  g.fillStyle = 'rgba(20,10,40,.22)';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (T(x, y) !== '#') continue;
    if (T(x + 1, y) !== '#') g.fillRect((x + 1) * RK, y * RK + 8, 10, RK);
    if (T(x, y + 1) !== '#') g.fillRect(x * RK + 8, (y + 1) * RK, RK - (T(x + 1, y) !== '#' ? -2 : 0), 10);
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
    panel(g, lx - tw / 2, ly - 15, tw, 21, 8, .82);
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
  g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, -L / 2 + 3, -Wd / 2 + 2, L - 6, Wd * .3, 6); g.fill();
  g.fillStyle = 'rgba(0,0,0,.15)'; rr(g, -L / 2 + 3, Wd * .2, L - 6, Wd * .28, 6); g.fill();
  g.fillStyle = 'rgba(160,205,245,.9)'; rr(g, L * 0.16, -Wd * 0.36, 7, Wd * 0.72, 3); g.fill(); rr(g, -L * 0.2, -Wd * 0.34, 5, Wd * 0.68, 2); g.fill();
  g.fillStyle = roof; rr(g, -L * 0.14, -Wd * 0.36, L * 0.32, Wd * 0.72, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, -L * 0.1, -Wd * 0.3, L * 0.22, 3, 1.5); g.fill();
  g.fillStyle = '#ff6b5b'; g.fillRect(-L / 2, -Wd / 2 + 3, 3, 5); g.fillRect(-L / 2, Wd / 2 - 8, 3, 5);
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
  const tb = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); tb.addColorStop(0, '#ffd04a'); tb.addColorStop(1, '#d99a1c');
  g.fillStyle = tb; rr(g, -L / 2, -Wd / 2, L, Wd, 8); g.fill();
  g.strokeStyle = '#a8740f'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#b97f14'; rr(g, -L / 2 + 4, -Wd / 2 + 4, L * 0.5, Wd - 8, 3); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(-L / 2 + 4 + k * L * .125, -Wd / 2 + 5); g.lineTo(-L / 2 + 4 + k * L * .125, Wd / 2 - 5); g.stroke(); }
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
    rr(g, x + 2, y + 4, w, h, 8); g.fillStyle = 'rgba(10,6,24,.3)'; g.fill();
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
  const rx = VW - 18;
  panel(g, VW - 210, 10, 202, 80, 12, .86);
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
  const pill = (x, w, col) => { panel(g, x, y, w, 26, 13, .82); g.strokeStyle = hexA(col, .7); g.lineWidth = 1.5; g.stroke(); };
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
  g.globalAlpha = 0.9; panel(g, mx - 4, my - 4, mw + 8, mh + 8, 6, .85);
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
  tkick() { tone(170, .07, 'sine', .08, 90); noise(.035, 1600, .035, 'bandpass', 1.5); },
  tpass() { tone(230, .09, 'sine', .07, 430); noise(.03, 1400, .03, 'bandpass', 1.5); },
  tshot() { tone(190, .08, 'sine', .08, 110); noise(.035, 1700, .04, 'bandpass', 1.5); noise(.3, 900, .03, 'bandpass', 1, 3200, .02); },
  thead() { tone(330, .09, 'sine', .07, 520); noise(.025, 1200, .025, 'bandpass', 1.5); },
  trim() { chime(1250, .4, .04); tone(1180, .25, 'triangle', .02, 1100); },
  tgoal() { [784, 988, 1175, 1568].forEach((f, i) => chime(f, .4, .05, i * .07)); noise(.9, 800, .035, 'bandpass', .8, 1400, .15); },
  tdrop() { tone(95, .2, 'sine', .09, 55); noise(.08, 500, .03, 'lowpass', .8); },
  tnope() { tone(220, .2, 'triangle', .05, 160); },
  tserve() { tone(1500, .08, 'sine', .04, 1800); },
  twhiff() { noise(.14, 1600, .045, 'bandpass', 1, 600); }
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
  setKind('tak');
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
  const g = takBg.getContext('2d', { alpha: false }), def = G.def, P = SCENE[def.scene] || SCENE.temple, R = rng(TS.li * 7717 + 5), GY = Tak.GROUND;
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
    for (let i = 0; i < 5; i++) fluffyCloud(g, R() * VW, 70 + R() * 130, 90 + R() * 90, .75);
  }
  // far scenery
  if (def.scene === 'temple') {
    for (let i = 0; i < 3; i++) prang(g, 120 + i * 360 + R() * 60, GY - 30, 46 + R() * 20, 190 + R() * 60, P.far);
    tRoof(g, 250, GY, 230, 150, P.near); tRoof(g, 760, GY, 200, 130, P.near);
  } else if (def.scene === 'tree') {
    for (let i = 0; i < 9; i++) {
      const x = R() * VW, y = GY - 40 - R() * 50, r = 50 + R() * 40;
      g.fillStyle = P.far; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = hexMix(P.far, .14); g.beginPath(); g.arc(x - r * .22, y - r * .25, r * .62, 0, Math.PI * 2); g.fill();
      g.fillStyle = hexMix(P.far, .26); g.beginPath(); g.arc(x - r * .38, y - r * .45, r * .22, 0, Math.PI * 2); g.fill();
      g.fillStyle = hexMix(P.far, -.07); for (let k = 0; k < 6; k++) { const a = R() * Math.PI * 2, d = r * (.45 + R() * .4); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (.12 + R() * .1), 0, Math.PI * 2); g.fill(); }
    }
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
  for (let i = 0; i < 26; i++) { const x = R() * VW, y = GY + 8 + R() * (VH - GY - 14); g.fillStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.ellipse(x + 1, y + 1, 3, 1.8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x, y, 2.6, 1.6, 0, 0, Math.PI * 2); g.fill(); }
  if (def.scene === 'beach') { for (let i = 0; i < 10; i++) { const x = R() * VW, y = GY + 14 + R() * (VH - GY - 24); g.fillStyle = ['#ffd1e8', '#fff3e0', '#ffcfa8'][i % 3]; g.beginPath(); g.arc(x, y, 3.5, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(160,110,90,.5)'; g.lineWidth = .8; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 1.4, y - 3); g.stroke(); } } }
  else grassEdge(g, GY + 1, R, def.scene === 'night' ? '#3a4a3a' : '#7aa85a', def.scene === 'night' ? '#4a5a44' : '#9cc46a', def.scene !== 'night');
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
  panel(g, 10, 10, 182, 66, 12, .72);
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('แต้ม', 22, 30);
  g.font = `400 30px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(th(G.score), 22, 64);
  g.textAlign = 'right'; g.font = `400 15px ${FONT}`; g.fillStyle = C.gold; g.fillText([0, 1, 2].map(i => (i < st ? '★' : '☆')).join(''), 182, 32);
  if (st < 3) { g.font = `400 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`ดาวถัดไป ${th(lv.stars[st])}`, 182, 52); }
  panel(g, VW - 122, 10, 112, 66, 12, .72);
  g.textAlign = 'right'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('เวลา', VW - 22, 30);
  const low = G.left < 15 && Math.sin(time * 8) > 0;
  g.font = `400 28px ${FONT_D}`; g.fillStyle = low ? '#ff6b6b' : C.paper; g.fillText(th(fmt(Math.ceil(G.left))), VW - 22, 64);
  // the exchange multiplier
  const ch = G.chain;
  g.textAlign = 'center';
  if (ch.passes > 0) {
    const mult = 1 + Tak.MULT_STEP * Math.min(ch.passes, Tak.MULT_MAX);
    panel(g, VW / 2 - 92, 12, 184, 40, 20, .72);
    g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(`ส่งต่อ ×${th(mult)}`, VW / 2, 40);
    for (let k = 0; k < Tak.MULT_MAX; k++) { g.fillStyle = k < ch.passes ? C.gold : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(VW / 2 - 18 + k * 12, 58, 3.5, 0, Math.PI * 2); g.fill(); }
  } else if (ch.last && G.ball.live) {
    g.font = `600 13px ${FONT}`; const t = 'ส่งให้เพื่อนก่อน ถึงจะยิงได้แต้ม', w = g.measureText(t).width + 28;
    panel(g, VW / 2 - w / 2, 16, w, 28, 14, .66);
    g.fillStyle = '#ffd9e6'; g.fillText(t, VW / 2, 35);
  }
  if (G.def.wind) {
    const w = G.wind / G.def.wind.amp, x = VW - 66, y = 92;
    panel(g, x - 56, y - 14, 112, 28, 14, .6);
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
  if (G.def.scene !== 'night') drawBirds(g, time, 60, 200, 4); else for (let i = 0; i < 8; i++) { const a = .5 + .5 * Math.sin(time * 2 + i * 1.9); g.fillStyle = `rgba(255,245,220,${a})`; twinkle(g, (i * 137) % VW, 30 + (i * 59) % 160, 2 + a * 1.5); }
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

/* ---------- Duo rhythm mode (ดนตรีจังหวะคู่) ---------- */
const MS = { G: null, li: 0, t0: 0, pausedAt: 0, sched: -9, endT: 0, savedB: null, floats: [], flash: [0, 0, 0, 0], judge: [null, null, null, null], hitAnim: { pink: 0, mint: 0 }, syncFx: [], feverOn: false, lastMerge: 0, synced: false };
const SONG = i => 'เพลงที่ ' + th(i + 1);
const LANE_X = [150, 232, 728, 810], LANE_W = 74, HIT_Y = 466, TOP_Y = 92;
const MKEY = { KeyA: 0, KeyD: 1, ArrowLeft: 2, ArrowRight: 3 };
const LANE_KEY = ['A', 'D', '←', '→'];
const JUDGE_TXT = { perfect: 'เป๊ะ!', good: 'ดี', ok: 'พอได้', miss: 'พลาด', early: 'เร็วไป' };
const JUDGE_COL = { perfect: '#ffe27a', good: '#9ff0c8', ok: '#c9c0ff', miss: '#ff8a8a', early: '#ff8a8a' };
if (!prog.m) prog.m = {};
const mBest = i => prog.m[MLEVELS[i].name] || null;
const mOpen = i => i === 0 || !!(mBest(i - 1) && mBest(i - 1).s >= 1);
const mLocalWho = () => (O.role ? [O.local] : ['pink', 'mint']);
const mNow = () => (performance.now() - MS.t0) / 1000;

/* ---------- instruments (scheduled on the audio clock) ---------- */
const mNoise = a => noiseBuf(a);
function mOsc(a, at, type, f0, f1, dur, vol, dest) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, at); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest || mixer(a).fx); o.start(at); o.stop(at + dur + 0.03);
}
function mHiss(a, at, freq, q, dur, vol) {
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = mNoise(a); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f).connect(g).connect(mixer(a).fx); s.start(at, Math.random() * 0.5); s.stop(at + dur + 0.02);
}
const midiF = m => 440 * Math.pow(2, (m - 69) / 12);
// what = 'klong' | 'ranat' | 'pong' | 'ching' | 'chap' | 'bass' | 'tick' | 'thud'; pitch: drum 0 low / 1 high, else a midi note
function mPlay(what, at, pitch, vol = 1) {
  const a = audio(); if (!a) return;
  at = Math.max(a.currentTime, at);
  try {
    if (what === 'klong') {
      if (pitch === 0) { mOsc(a, at, 'sine', 120, 52, 0.32, 0.5 * vol); mHiss(a, at, 300, 1, 0.06, 0.18 * vol); }
      else { mOsc(a, at, 'triangle', 300, 210, 0.12, 0.32 * vol); mHiss(a, at, 1800, 1.5, 0.05, 0.22 * vol); }
    } else if (what === 'ranat') {
      const f = midiF(pitch); mOsc(a, at, 'triangle', f, f, 0.42, 0.3 * vol); mOsc(a, at, 'sine', f * 2.01, f * 2.01, 0.18, 0.08 * vol); mHiss(a, at, 3500, 3, 0.015, 0.05 * vol);
    } else if (what === 'pong') {
      const f = midiF(pitch); mOsc(a, at, 'sine', f, f, 0.3, 0.32 * vol); mOsc(a, at, 'sine', f * 2.76, f * 2.76, 0.09, 0.07 * vol); mHiss(a, at, 1200, 2, 0.02, 0.05 * vol);
    } else if (what === 'ching') { mOsc(a, at, 'sine', 2637, 2637, 0.5, 0.035 * vol); mOsc(a, at, 'sine', 3951, 3951, 0.35, 0.02 * vol); }
    else if (what === 'chap') mHiss(a, at, 2600, 2, 0.07, 0.09 * vol);
    else if (what === 'bass') mOsc(a, at, 'triangle', midiF(pitch), midiF(pitch), 0.35, 0.18 * vol);
    else if (what === 'tick') mOsc(a, at, 'square', 1200, 1200, 0.05, 0.05 * vol);
    else if (what === 'thud') { mOsc(a, at, 'sine', 90, 60, 0.12, 0.12 * vol); }
  } catch (e) {}
}
const instOf = (G, who) => (G.def.inst && G.def.inst[who]) || (who === 'pink' ? 'klong' : 'ranat');
const lanePitch = lane => (lane === 0 ? 0 : lane === 1 ? 1 : lane === 2 ? 60 : 72);
// schedule the backing (ching-chap, bass on the bar, count-in) and, online, the partner's part a little ahead
function mSchedule(t) {
  const a = audio(), G = MS.G; if (!a || !G) return;
  const ahead = 0.25, lat = a.outputLatency || a.baseLatency || 0, toAc = st => a.currentTime + (st - t) - lat;
  if (MS.sched < t - 0.05) MS.sched = t - 0.05;
  const from = MS.sched, to = t + ahead;
  for (const c of G.C.count) if (c.t >= from && c.t < to) mPlay('tick', toAc(c.t), 0, c.n === 4 ? 1.4 : 1);
  for (const b of G.C.back) if (b.t >= from && b.t < to) { mPlay(b.k, toAc(b.t), 0, 1); if (b.down) mPlay('bass', toAc(b.t), [48, 55, 52, 50][b.bar % 4], 1); }
  if (O.role) {
    const other = O.local === 'pink' ? 'mint' : 'pink', inst = instOf(G, other);
    for (let i = G.next; i < G.notes.length; i++) { const n = G.notes[i]; if (n.t >= to) break; if (n.who === other && n.t >= from && n.res !== 'miss') mPlay(inst, toAc(n.t), n.pitch, 0.6); }
  }
  MS.sched = to;
}

/* ---------- flow ---------- */
function loadMus(i, net) {
  MS.li = i; MS.G = Rhy.load(MLEVELS[i]); MS.G.net = net || null; MS.G.local = net ? net.local : null;
  MS.t0 = performance.now() + 700; MS.pausedAt = 0; MS.sched = -9; MS.endT = 0; MS.savedB = null; MS.floats = []; MS.flash = [0, 0, 0, 0]; MS.judge = [null, null, null, null];
  MS.syncFx = []; MS.feverOn = false; MS.synced = !net || net.role === 'host';
  setKind('mus');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 0;
  releaseK(); buildMusBg(); mHud(true); mPadLabels();
}
function startMus(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadMus(i); showScreen(null); setMode('play');
}
function musRestart() { if (O.role) { onlineRestart(); return; } loadMus(MS.li); showScreen(null); setMode('play'); }
function musNext() {
  if (O.role === 'host') { if (MS.li < MLEVELS.length - 1) onlineStartMus(MS.li + 1); return; }
  if (MS.li < MLEVELS.length - 1 && mOpen(MS.li + 1)) startMus(MS.li + 1); else toTitle();
}
let mHudKey = '';
function mHud(force) {
  const k = String(MS.li); if (!force && k === mHudKey) return; mHudKey = k;
  const lv = MLEVELS[MS.li];
  $('#hNo').textContent = SONG(MS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function mSave() {
  if (MS.savedB) return MS.savedB;
  const G = MS.G, lv = MLEVELS[MS.li], st = Rhy.stars(G), acc = Math.round(Rhy.accuracy(G) * 100);
  const b = prog.m[lv.name] || { s: 0, m: 0, a: 0 };
  if (!G.failed) { prog.m[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, G.score), a: Math.max(b.a || 0, acc) }; store.set('prog2', prog); }
  return (MS.savedB = b);
}
function mResults() {
  const G = MS.G, lv = MLEVELS[MS.li], st = Rhy.stars(G), acc = Math.round(Rhy.accuracy(G) * 100);
  const b = mSave(), best = !G.failed && G.score > b.m;
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${SONG(MS.li)} · ${G.failed ? 'วงล่มกลางเพลง' : 'จบเพลง'}`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = G.failed ? 'พลังวงหมดก่อนจบเพลง ช่วยกันตีตัวง่ายๆ ให้ติดก่อน แล้วค่อยไล่ตัวยาก' : st === 3 ? 'เข้าขากันสุดๆ ฟังแล้วเหมือนคนเดียวตี' : st === 2 ? 'เพราะแล้ว อีกนิดได้สามดาว ลองนับจังหวะออกเสียงด้วยกัน' : st === 1 ? 'เล่นจบเพลงแล้ว เพลงถัดไปเปิดให้เล่นแล้ว' : `ยังไม่ถึงดาวแรก ต้องแม่น ${th(Math.round(lv.stars[0] * 100))}% ลองฟังฉิ่งฉับเป็นจังหวะ`;
  $('#cMsg').textContent = msg + (best && b.m ? ' · สถิติใหม่' : '');
  const s = G.stats;
  $('#cStats').innerHTML = `<span>แต้ม <b>${th(G.score)}</b></span><span>แม่น <b>${th(acc)}%</b></span><span>เป๊ะ <b>${th(s.perfect)}</b> ดี <b>${th(s.good)}</b> พลาด <b>${th(s.miss)}</b></span><span>คอมโบ <b>${th(G.maxCombo)}</b> ตีพร้อม <b>${th(s.sync)}</b></span>`;
  const last = MS.li >= MLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'เพลงถัดไป';
  $('#bNext').hidden = guest || last || !mOpen(MS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'เล่นเพลงนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- input ---------- */
// a press on a lane at an event time (performance.now clock); online both key pairs play the local player's two lanes
function musPress(lane, ts) {
  const G = MS.G;
  if (!G || S.mode !== 'play' || G.over) return;
  if (O.role) lane = Rhy.LANE_OF[O.local][lane % 2];
  const t = ((ts || performance.now()) - MS.t0) / 1000, who = Rhy.whoOf(lane);
  const n = Rhy.hit(G, lane, t);
  mPlay(instOf(G, who), audio() ? audio().currentTime : 0, n ? n.pitch : lanePitch(lane), 1);
  MS.flash[lane] = 1; MS.hitAnim[who] = 1;
  if (n) { MS.judge[lane] = { r: n.res === 'miss' ? 'early' : n.res, life: 0.5 }; if (n.res === 'perfect') mSpark(LANE_X[lane], HIT_Y, who); }
}
function mPadLabels() { document.querySelectorAll('.mpad button').forEach(b => { b.querySelector('i').textContent = b.dataset.k === 'lo' ? 'ต่ำ' : 'สูง'; }); }
const mpad = $('#mpad');
const mbtns = new Map();
mpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault(); audio();
  const side = b.closest('.side').dataset.p, lane = Rhy.LANE_OF[O.role ? O.local : side][b.dataset.k === 'lo' ? 0 : 1];
  b.classList.add('on'); mbtns.set(e.pointerId, b);
  try { b.setPointerCapture(e.pointerId); } catch (err) {}
  musPress(lane, e.timeStamp);
});
for (const ev of ['pointerup', 'pointercancel']) mpad.addEventListener(ev, e => { const b = mbtns.get(e.pointerId); if (b) { b.classList.remove('on'); mbtns.delete(e.pointerId); } });
mpad.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- tick ---------- */
function mSpark(x, y, who) { burst(x, y, 10, who === 'pink' ? C.pink : C.mint, { speed: 160, life: .45, size: 3, g: 200 }); }
function mEvents(ev) {
  const G = MS.G;
  for (const e of ev) {
    const [k, id] = e.split(':');
    if (k === 'sync') { const n = G.notes[+id]; MS.syncFx.push({ t: n.t, life: 0.6 }); }
    else if (k === 'fever') { sfx.win(); MS.floats.push({ text: 'วงเข้าขา! แต้มสองเท่า', x: VW / 2, y: 250, col: C.gold, life: 2, size: 24 }); burst(VW / 2, 300, 40, C.gold, { speed: 260, life: 1, size: 4, up: 120 }); }
    else if (k === 'break') { mPlay('thud', audio() ? audio().currentTime : 0, 0, 1); MS.floats.push({ text: 'คอมโบหลุด', x: VW / 2, y: 200, col: '#ff9a9a', life: 1, size: 16 }); }
    else if (k === 'fail') { sfx.lost(); S.shake = 1; }
    else if (k === 'end') sfx.win();
  }
}
function musFrame(dt, now) {
  const G = MS.G;
  // pause holds the song clock (playing alone); resuming gives a short run-up
  if (S.mode === 'paused' && !O.role && !MS.pausedAt) MS.pausedAt = now;
  if (S.mode === 'play' && MS.pausedAt) { const tp = (MS.pausedAt - MS.t0) / 1000; MS.t0 = now - (tp - 1.5) * 1000; MS.pausedAt = 0; MS.sched = tp - 1.5; }
  if (S.mode === 'play' && G && MS.synced) {
    const t = mNow();
    for (const n of Rhy.expire(G, t, mLocalWho())) { MS.judge[n.lane] = { r: 'miss', life: 0.5 }; }
    if (!O.role || O.role === 'host') mEvents(Rhy.settle(G, t));
    mSchedule(t);
    if (G.over && !MS.endT) { MS.endT = 1.6; mSave(); }
    if (MS.endT > 0) { MS.endT -= dt; if (MS.endT <= 0) { MS.endT = -1; mResults(); if (O.role === 'host') O.st = 'clear'; } }
    // drawn notes for the partner online: shown as hit once their result arrives
  }
  if (O.role) pumpOnline(now);
  S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
  for (let i = 0; i < 4; i++) { MS.flash[i] = Math.max(0, MS.flash[i] - dt * 6); if (MS.judge[i]) { MS.judge[i].life -= dt; if (MS.judge[i].life <= 0) MS.judge[i] = null; } }
  for (const k of ['pink', 'mint']) MS.hitAnim[k] = Math.max(0, MS.hitAnim[k] - dt * 7);
  for (const f of MS.syncFx) f.life -= dt; MS.syncFx = MS.syncFx.filter(f => f.life > 0);
  for (const f of MS.floats) { f.life -= dt; f.y -= dt * 20; } MS.floats = MS.floats.filter(f => f.life > 0);
  stepParts(dt);
  if (G) mHud();
  renderMus();
}

/* ---------- drawing ---------- */
const musBg = document.createElement('canvas');
const MSCENE = {
  home: { sky: ['#ffcf9e', '#f59a7a', '#7a4d7c'], far: '#5a3a64', ground: '#3d2a44' },
  parade: { sky: ['#9fd8ff', '#ffe2b0', '#f7b08a'], far: '#8a6a9a', ground: '#6a4a5a' },
  river: { sky: ['#ffd6a0', '#f29f7f', '#5b6fa6'], far: '#3f4f7a', ground: '#2f3a5e' },
  isan: { sky: ['#ffe0a0', '#f2b46a', '#a85a5a'], far: '#7a4a4a', ground: '#4a2e2e' },
  stage: { sky: ['#140f2e', '#2c1d52', '#4a2563'], far: '#2a1f4a', ground: '#1e1636' }
};
function buildMusBg() {
  const G = MS.G; if (!G) return;
  musBg.width = cv.width; musBg.height = cv.height;
  const g = musBg.getContext('2d', { alpha: false }), P = MSCENE[G.def.scene] || MSCENE.home, R = rng(MS.li * 977 + 3);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, P.sky[0]); sky.addColorStop(.55, P.sky[1]); sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  if (G.def.scene === 'stage') {
    for (let i = 0; i < 90; i++) { const a = .2 + R() * .6, x = R() * VW, y = R() * 300; g.fillStyle = `rgba(255,240,220,${a})`; g.beginPath(); g.arc(x, y, .8 + a, 0, Math.PI * 2); g.fill(); if (a > .7) { g.fillStyle = `rgba(255,240,220,${a * .7})`; twinkle(g, x, y, 4); } }
    const mx = VW / 2 + 130, my = 150, mg = g.createRadialGradient(mx, my, 10, mx, my, 90); mg.addColorStop(0, 'rgba(255,240,210,.35)'); mg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = mg; g.fillRect(mx - 90, my - 90, 180, 180); g.fillStyle = '#fff4d8'; g.beginPath(); g.arc(mx, my, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(230,214,190,.5)'; g.beginPath(); g.arc(mx - 7, my - 5, 5, 0, Math.PI * 2); g.arc(mx + 6, my + 7, 3.5, 0, Math.PI * 2); g.fill();
  } else {
    // a low sun behind the town, and warm clouds between the lanes
    const sx = VW / 2, sy = 352, sg = g.createRadialGradient(sx, sy, 10, sx, sy, 260);
    sg.addColorStop(0, 'rgba(255,242,205,.85)'); sg.addColorStop(.2, 'rgba(255,214,150,.4)'); sg.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = sg; g.fillRect(0, 92, VW, 520); g.fillStyle = 'rgba(255,247,222,.92)'; g.beginPath(); g.arc(sx, sy, 38, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4; i++) fluffyCloud(g, 335 + i * 100 + R() * 30, 170 + R() * 110, 64 + R() * 40, .5, '255,234,218');
  }
  // far silhouettes
  g.fillStyle = P.far;
  if (G.def.scene === 'river') { g.fillRect(0, 380, VW, 30); for (let i = 0; i < 6; i++) { const x = R() * VW; g.beginPath(); g.moveTo(x - 40, 380); g.lineTo(x, 330 - R() * 40); g.lineTo(x + 40, 380); g.fill(); } }
  else if (G.def.scene === 'isan') { for (let i = 0; i < 5; i++) { const x = 60 + i * 210 + R() * 60; g.fillRect(x - 3, 250, 6, 150); g.beginPath(); g.arc(x, 250, 40 + R() * 20, Math.PI, 0); g.fill(); } }
  else for (let i = 0; i < 4; i++) prang(g, 90 + i * 260 + R() * 50, 400, 40 + R() * 20, 160 + R() * 70, P.far);
  // stage floor in the middle
  g.fillStyle = P.ground; g.fillRect(0, 400, VW, VH - 400);
  const fg = g.createLinearGradient(0, 400, 0, VH); fg.addColorStop(0, 'rgba(255,220,170,.14)'); fg.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = fg; g.fillRect(0, 400, VW, VH - 400);
  g.strokeStyle = 'rgba(255,230,190,.1)'; g.lineWidth = 1;
  for (let k = 1; k < 9; k++) { const y = 400 + k * k * 2.2; g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); }
  for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(VW / 2 + k * 30, 400); g.lineTo(VW / 2 + k * 95, VH); g.stroke(); }
  g.fillStyle = 'rgba(255,230,190,.3)'; g.fillRect(0, 400, VW, 2);
  // a woven mat under the band
  g.fillStyle = 'rgba(255,214,140,.2)'; g.beginPath(); g.ellipse(VW / 2, 470, 190, 34, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,214,140,.25)'; g.setLineDash([5, 5]); g.beginPath(); g.ellipse(VW / 2, 470, 176, 28, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  if (G.def.scene === 'stage') {
    // red curtains tied back at both sides, and a scalloped valance
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 0 : VW, cg = g.createLinearGradient(x0, 0, x0 - sd * 104, 0); cg.addColorStop(0, '#7a1d3a'); cg.addColorStop(.6, '#a52b4f'); cg.addColorStop(1, '#5a1230');
      g.fillStyle = cg; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 - sd * 104, 0); g.quadraticCurveTo(x0 - sd * 70, 220, x0 - sd * 34, 300); g.quadraticCurveTo(x0 - sd * 50, 360, x0 - sd * 70, 404); g.lineTo(x0, 404); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 - sd * k * 24, 0); g.quadraticCurveTo(x0 - sd * k * 15, 220, x0 - sd * k * 8, 300); g.stroke(); }
      g.fillStyle = '#ffcf5a'; g.beginPath(); g.ellipse(x0 - sd * 30, 300, 12, 5, sd * .3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#8f2246'; g.fillRect(0, 0, VW, 16);
    for (let x = 0; x < VW; x += 40) { g.beginPath(); g.arc(x + 20, 16, 20, 0, Math.PI); g.fill(); }
    g.fillStyle = '#ffcf5a'; for (let x = 0; x < VW; x += 40) { g.beginPath(); g.arc(x + 20, 37, 3, 0, Math.PI * 2); g.fill(); }
  }
  // lanes
  for (let l = 0; l < 4; l++) {
    const x = LANE_X[l], pink = l < 2;
    const lg = g.createLinearGradient(0, TOP_Y - 30, 0, HIT_Y + 40); lg.addColorStop(0, 'rgba(21,17,46,0)'); lg.addColorStop(.25, 'rgba(21,17,46,.55)'); lg.addColorStop(1, 'rgba(21,17,46,.8)');
    g.fillStyle = lg; g.fillRect(x - LANE_W / 2, TOP_Y - 30, LANE_W, HIT_Y + 40 - (TOP_Y - 30));
    g.strokeStyle = hexA(pink ? C.pink : C.mint, .35); g.lineWidth = 1.5; g.strokeRect(x - LANE_W / 2, TOP_Y - 30, LANE_W, HIT_Y + 40 - (TOP_Y - 30));
  }
  mLanternSet(g, true); mLanternSet(g, false);                         // paper lanterns over the stage
}
function mDrawNote(g, n, y, alpha) {
  const x = LANE_X[n.lane];
  g.globalAlpha = alpha;
  stamp(g, 'mNote' + n.lane, '', x - 32, y - 16, 64, 34, q => mNoteShape(q, n.lane));
  if (n.sync >= 0) { g.strokeStyle = C.gold; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, 32, 15, 0, 0, Math.PI * 2); g.stroke(); }
  g.globalAlpha = 1;
}
// a drum head (pink's lanes) or a ranat bar (mint's), centred at (32, 16)
function mNoteShape(g, lane) {
  const x = 32, y = 16;
  if (lane < 2) {                                                   // a drum head
    const dc = lane === 0 ? '#c94372' : '#ff8fb5';
    g.fillStyle = hexMix(dc, -.3); g.beginPath(); g.ellipse(x, y + 4, 26, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = dc; g.beginPath(); g.ellipse(x, y, 26, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd36b'; for (const dx of [-18, -6, 6, 18]) { g.beginPath(); g.arc(x + dx, y + 8 - Math.abs(dx) * .2, 1.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fff2f6'; g.beginPath(); g.ellipse(x, y - 2, 20, 7.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x - 8, y - 4, 5, 1.8, -.15, 0, Math.PI * 2); g.fill();
  } else {                                                      // a ranat bar
    const bc = lane === 2 ? '#1f9d80' : '#68f0cf';
    rr(g, x - 28, y - 6, 56, 18, 6); g.fillStyle = hexMix(bc, -.32); g.fill();
    rr(g, x - 28, y - 9, 56, 18, 6); const bg2 = g.createLinearGradient(0, y - 9, 0, y + 9); bg2.addColorStop(0, hexMix(bc, .3)); bg2.addColorStop(1, bc); g.fillStyle = bg2; g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; rr(g, x - 22, y - 6, 44, 3, 1.5); g.fill();
    g.fillStyle = '#123'; g.beginPath(); g.arc(x - 18, y, 2, 0, Math.PI * 2); g.arc(x + 18, y, 2, 0, Math.PI * 2); g.fill();
  }
}
function mDrawBand(g, G, t) {
  const cx = VW / 2, by = 452, beat = G.C.spb, ph = ((t - G.C.lead) / beat) % 1, bob = Math.max(0, Math.cos(ph * Math.PI * 2)) * 3;
  // pink and the long drum
  const pa = MS.hitAnim.pink, ma = MS.hitAnim.mint;
  g.save(); g.translate(cx - 90, by - bob - pa * 4);
  g.fillStyle = '#8a4a2a'; rr(g, -12, -46, 24, 64, 8); g.fill();
  g.fillStyle = '#d9a46a'; g.beginPath(); g.ellipse(0, -46, 13, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e8d2a0'; for (let k = 0; k < 4; k++) g.fillRect(-12, -36 + k * 12, 24, 2);
  g.restore();
  g.save(); g.translate(cx - 120, by - bob); g.scale(1.6, 1.6); drawPlayer(g, { id: 'pink', x: -11, y: -28, w: 22, h: 28, face: 1, sq: pa * .5, walk: 0 }, S.time); g.restore();
  g.strokeStyle = C.pinkD; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 108, by - 30); g.lineTo(cx - 92, by - 52 - bob + pa * 10); g.stroke();
  // mint and the ranat
  g.save(); g.translate(cx + 96, by - 8);
  g.fillStyle = '#7a3e22'; g.beginPath(); g.moveTo(-46, -10); g.quadraticCurveTo(0, 18, 46, -10); g.lineTo(40, 4); g.quadraticCurveTo(0, 26, -40, 4); g.closePath(); g.fill();
  for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#e7c27a' : '#d7aa5a'; g.fillRect(-38 + k * 8.6, -16 + Math.abs(k - 4) * 0.8, 7, 12); }
  g.restore();
  g.save(); g.translate(cx + 140, by - bob); g.scale(1.6, 1.6); drawPlayer(g, { id: 'mint', x: -11, y: -28, w: 22, h: 28, face: -1, sq: ma * .5, walk: 0 }, S.time); g.restore();
  g.strokeStyle = C.mintD; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 128, by - 30); g.lineTo(cx + 104, by - 26 - ma * 10); g.stroke();
  g.lineCap = 'butt';
  // little notes floating up on each beat
  if (t > G.C.lead && beat > 0) {
    g.font = `400 17px ${FONT}`; g.textAlign = 'center';
    for (const [col, x0, k] of [[C.pink, cx - 92, 0], [C.mint, cx + 104, .5]]) {
      const q = (ph + k) % 1; g.globalAlpha = Math.max(0, 1 - q) * .9; g.fillStyle = col;
      g.fillText(q < .5 ? '♪' : '♫', x0 + Math.sin(q * 6 + k * 3) * 7, by - 70 - q * 34);
    }
    g.globalAlpha = 1;
  }
}
// paper lanterns strung over the stage; they glow on the beat
function mLanterns(g, pulse) {
  stamp(g, 'mLanterns', '', 0, 30, VW, 120, q => { q.translate(0, -30); mLanternSet(q, true); mLanternSet(q, false); });
}
function mLanternSet(g, glowOnly) {
  const LC = ['#ff8fb0', '#ffd36b', '#7fd9c2', '#ffb08a', '#c9a8ff'];
  for (const [x0, x1, y0, n] of [[284, 676, 66, 7], [-10, 100, 60, 2], [860, 970, 60, 2]]) {
    const sag = (x1 - x0) * .08;
    if (!glowOnly) { g.strokeStyle = 'rgba(60,40,70,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); g.stroke(); }
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n, x = x0 + (x1 - x0) * u, y = y0 + sag * 4 * u * (1 - u) + 12, sw = 0, c = LC[((i + Math.round(x0)) % 5 + 5) % 5];
      if (glowOnly) { const gl = g.createRadialGradient(x, y, 2, x, y, 26); gl.addColorStop(0, hexA(c, .5)); gl.addColorStop(1, hexA(c, 0)); g.fillStyle = gl; g.fillRect(x - 26, y - 26, 52, 52); continue; }
      g.strokeStyle = 'rgba(60,40,70,.6)'; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + sw, y - 8); g.stroke();
      g.fillStyle = c; g.beginPath(); g.ellipse(x + sw, y, 9, 10.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(120,60,60,.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + sw, y, 4.5, 10.5, 0, 0, Math.PI * 2); g.moveTo(x + sw - 9, y); g.lineTo(x + sw + 9, y); g.stroke();
      g.fillStyle = '#c9963f'; g.fillRect(x + sw - 4, y - 12, 8, 3); g.fillRect(x + sw - 4, y + 9, 8, 3);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x + sw - 3.5, y - 4, 1.8, 3.2, -.3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c; g.beginPath(); g.moveTo(x + sw, y + 12); g.lineTo(x + sw, y + 18); g.stroke();
    }
  }
}
// people watching at the front, bobbing on the beat (more when the band is on fire)
function mCrowd(g, pulse, cheer) {
  const b = pulse * (cheer ? 6 : 2);
  stamp(g, 'mCrowd' + (cheer ? 'c' : ''), '', 0, 498 - b, VW, 60, q => { q.translate(0, -498); mCrowdHalf(q, 0, cheer); mCrowdHalf(q, 1, cheer); });
  // glow sticks waving
  g.lineCap = 'round';
  for (let i = 0; i < 42; i++) {
    const x = 6 + i * 23 + (i % 2) * 5, hh = hash(i, 3);
    if (hh % 4 || LANE_X.some(lx => Math.abs(x - lx) < LANE_W / 2 + 12)) continue;
    const y = 528 - (hh % 3) * 4 - b, c = hh & 8 ? C.pink : C.mint, a = Math.sin(S.time * 4 + i) * .35;
    g.strokeStyle = hexA(c, .25); g.lineWidth = 7; g.beginPath(); g.moveTo(x + 11, y + 4); g.lineTo(x + 11 + Math.sin(a) * 16, y + 4 - Math.cos(a) * 16); g.stroke();
    g.strokeStyle = hexA(c, .9); g.lineWidth = 3; g.stroke();
  }
  g.lineCap = 'butt';
}
function mCrowdHalf(g, half, cheer) {
  g.fillStyle = 'rgba(24,15,38,.86)'; g.strokeStyle = 'rgba(24,15,38,.86)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 42; i++) {
    const x = 6 + i * 23 + (i % 2) * 5, hh = hash(i, 3);
    if ((hh & 1) !== half || LANE_X.some(lx => Math.abs(x - lx) < LANE_W / 2 + 12)) continue;
    const y = 528 - (hh % 3) * 4;
    g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.ellipse(x, y + 22, 15, 13, 0, Math.PI, 0); g.fill();
    if (cheer && hh % 3 === 0) { g.beginPath(); g.moveTo(x - 10, y + 14); g.lineTo(x - 15, y - 6); g.moveTo(x + 10, y + 14); g.lineTo(x + 15, y - 6); g.stroke(); }
  }
}
function mDrawHud(g, G, t) {
  panel(g, 10, 10, 190, 60, 12, .75);
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('แต้ม', 22, 29);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(th(G.score), 22, 60);
  const acc = Rhy.accuracy(G), done = G.next / Math.max(1, G.notes.length);
  g.textAlign = 'right'; g.font = `400 11px ${FONT}`; g.fillStyle = '#c9bfef';
  g.fillText(`แม่น ${th(Math.round((G.next ? G.base / (100 * G.next) : 1) * 100))}%`, 190, 29);
  // band energy
  const ex = VW / 2 - 150, ey = 14, ew = 300;
  panel(g, ex - 10, ey - 6, ew + 20, 34, 12, .75);
  g.textAlign = 'left'; g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('พลังวง', ex, ey + 9);
  const e = G.energy / 100, col = e > .5 ? '#7be08a' : e > .25 ? '#ffc65a' : '#ff6b6b';
  rr(g, ex + 46, ey + 1, ew - 46, 10, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  rr(g, ex + 46, ey + 1, (ew - 46) * e, 10, 5); g.fillStyle = col; g.fill();
  rr(g, ex + 46, ey + 17, ew - 46, 4, 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  rr(g, ex + 46, ey + 17, (ew - 46) * Math.min(1, Math.max(0, t / G.C.end)), 4, 2); g.fillStyle = '#c9bfef'; g.fill();
  // section label and who leads
  const sec = [...G.C.secs].reverse().find(s => s.t <= t + 0.5);
  if (sec && sec.label) { g.textAlign = 'center'; g.font = `600 13px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(sec.label, VW / 2, ey + 44); }
  // combo
  if (G.combo >= 5) {
    const mult = G.combo >= 25 ? 2 : G.combo >= 10 ? 1.5 : 1;
    g.textAlign = 'center'; g.font = `400 34px ${FONT_D}`; g.fillStyle = C.paper; g.fillText(th(G.combo), VW / 2, 150);
    g.font = `600 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`คอมโบ${mult > 1 ? ` ×${th(mult)}` : ''}`, VW / 2, 168);
  }
  if (t < G.fever) { g.textAlign = 'center'; g.font = `400 18px ${FONT_D}`; g.fillStyle = C.gold; g.fillText('วงเข้าขา ×๒', VW / 2, 200); }
  else if (G.streak > 0) { g.textAlign = 'center'; g.font = `600 12px ${FONT}`; g.fillStyle = C.gold; g.fillText(`ตีพร้อมกันติด ${th(G.streak)}/${th(Rhy.FEVER_STREAK)}`, VW / 2, 200); }
  // count-in
  const c = G.C.count.find(q => t >= q.t && t < q.t + G.C.spb);
  if (c) { g.textAlign = 'center'; g.font = `400 64px ${FONT_D}`; g.fillStyle = hexA(C.gold, 1 - (t - c.t) / G.C.spb); g.fillText(th(c.n), VW / 2, 320); }
}
function renderMus() {
  const g = ctx, G = MS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(musBg, 0, 0);
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 6 * S.shake;
  g.setTransform(scale, 0, 0, scale, ox * scale, 0);
  const t = S.mode === 'play' && MS.synced ? mNow() : (MS.pausedAt ? (MS.pausedAt - MS.t0) / 1000 : Math.min(mNow(), 0));
  const fever = t < G.fever;
  if (fever) { const a = .12 + Math.sin(S.time * 8) * .05; g.fillStyle = `rgba(255,207,90,${a})`; g.fillRect(0, 0, VW, VH); }
  const beat = G.C.spb, bph = beat > 0 ? (((t - G.C.lead) / beat) % 1 + 1) % 1 : 0, pulse = t > G.C.lead ? Math.max(0, Math.cos(bph * Math.PI * 2)) : 0;
  // two spotlights sweeping over the band
  for (const sd of [-1, 1]) {
    const ax = VW / 2 + sd * 200, tx = VW / 2 + sd * 40 + Math.sin(S.time * .7 + sd) * 80, ty = 480;
    const a = (fever ? .12 : .08) + pulse * .04;
    g.fillStyle = `rgba(255,244,214,${a})`; g.beginPath(); g.moveTo(ax - 7, 0); g.lineTo(tx - 85, ty); g.lineTo(tx + 85, ty); g.lineTo(ax + 7, 0); g.closePath(); g.fill();
  }
  // beat lines sliding down the lanes
  if (beat > 0) {
    const sp0 = G.def.speed || 1.6, pp = (HIT_Y - TOP_Y) / sp0;
    for (let k = Math.ceil((t - G.C.lead) / beat); ; k++) {
      const bt = G.C.lead + k * beat; if (bt > t + sp0) break;
      const y = HIT_Y - (bt - t) * pp; if (y < TOP_Y - 20) continue;
      for (let l = 0; l < 4; l++) { g.fillStyle = `rgba(255,255,255,${k % 4 === 0 ? .16 : .07})`; g.fillRect(LANE_X[l] - LANE_W / 2 + 5, y, LANE_W - 10, k % 4 === 0 ? 2 : 1); }
    }
  }
  // lane flashes, hit line, keys
  for (let l = 0; l < 4; l++) {
    const x = LANE_X[l], pink = l < 2, col = pink ? C.pink : C.mint;
    if (MS.flash[l] > 0) { g.fillStyle = hexA(col, MS.flash[l] * .35); g.fillRect(x - LANE_W / 2, TOP_Y - 30, LANE_W, HIT_Y + 40 - (TOP_Y - 30)); }
    g.save(); g.translate(x, HIT_Y); g.scale(1, .47); glow(g, pink ? '255,111,156' : '79,224,191', 0, 0, 36, .45 + pulse * .2); g.restore();
    g.strokeStyle = hexA(col, .9); g.lineWidth = 3; g.beginPath(); g.ellipse(x, HIT_Y, 30, 13, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, HIT_Y - 1, 26, 10, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.font = `600 14px ${FONT}`; g.textAlign = 'center'; g.fillStyle = hexA(col, .9); g.fillText(O.role ? (l % 2 ? 'ขวา' : 'ซ้าย') : LANE_KEY[l], x, HIT_Y + 34);
  }
  // notes: from now up to 'speed' seconds ahead
  const sp = G.def.speed || 1.6, ppx = (HIT_Y - TOP_Y) / sp, yOf = n => HIT_Y - (n.t - t) * ppx;
  const show = [];
  for (let i = Math.max(0, G.next - 30); i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t > t + sp + 0.1) break;
    if (n.t < t - 0.3) continue;
    if (n.res && n.res !== 'miss') continue;                 // hit notes disappear
    show.push(n);
  }
  // the gold thread of a chord across the stage
  const seen = new Set();
  for (const n of show) {
    if (n.sync < 0 || seen.has(n.sync)) continue; seen.add(n.sync);
    const grp = show.filter(q => q.sync === n.sync), p = grp.find(q => q.who === 'pink'), m = grp.find(q => q.who === 'mint');
    if (!p || !m) continue;
    const y = yOf(n);
    g.strokeStyle = hexA(C.gold, .55); g.lineWidth = 2; g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(LANE_X[p.lane] + 30, y); g.quadraticCurveTo(VW / 2, y - 26, LANE_X[m.lane] - 30, y); g.stroke(); g.setLineDash([]);
  }
  for (const n of show) mDrawNote(g, n, yOf(n), n.res === 'miss' ? 0.35 : 1);
  for (const f of MS.syncFx) { const y = HIT_Y; g.strokeStyle = hexA(C.gold, f.life / 0.6); g.lineWidth = 5; g.beginPath(); g.moveTo(LANE_X[1] + 30, y); g.quadraticCurveTo(VW / 2, y - 60, LANE_X[2] - 30, y); g.stroke(); }
  for (let l = 0; l < 4; l++) { const j = MS.judge[l]; if (!j) continue; g.globalAlpha = Math.min(1, j.life * 3); g.font = `400 18px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.85)'; g.strokeText(JUDGE_TXT[j.r], LANE_X[l], HIT_Y - 30 - (0.5 - j.life) * 30); g.fillStyle = JUDGE_COL[j.r]; g.fillText(JUDGE_TXT[j.r], LANE_X[l], HIT_Y - 30 - (0.5 - j.life) * 30); g.globalAlpha = 1; }
  mDrawBand(g, G, t);
  mCrowd(g, pulse, fever || G.combo >= 10);
  drawParts(g);
  for (const f of MS.floats) { g.globalAlpha = Math.min(1, f.life * 2); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y); g.globalAlpha = 1; }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  mDrawHud(g, G, t);
  if (O.role && !MS.synced && S.mode === 'play') { g.textAlign = 'center'; g.font = `600 15px ${FONT}`; g.fillStyle = C.gold; g.fillText('รอเพลงเริ่มพร้อมกัน…', VW / 2, 300); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}

/* ---------- title list ---------- */
function renderMusLevels() {
  let total = 0;
  $('#mlevels').innerHTML = MLEVELS.map((lv, i) => {
    const b = mBest(i), open = mOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> แม่น ${th(b.a || 0)}%` : open ? 'ยังไม่เคยเล่น' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-m="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#mStarsAll').textContent = `ดาวรวม ${th(total)}/${th(MLEVELS.length * 3)}`;
  let next = MLEVELS.findIndex((l, i) => mOpen(i) && !(mBest(i) && mBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.m = next;
  if (S.tab === 'mus') $('#bGo').textContent = mBest(next) ? `เล่น${SONG(next)}` : 'เริ่มบรรเลง';
}
$('#mlevels').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b && !b.disabled) startMus(+b.dataset.m); });

/* ---------- online: each phone judges its own player; results go both ways, the host has the final say ---------- */
function onlineStartMus(i) {
  if (O.role !== 'host') return;
  O.md = 'm'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsM').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b && !b.disabled) onlineStartMus(+b.dataset.m); });
function renderOnlineMus() {
  $('#oLevelsM').innerHTML = MLEVELS.map((lv, i) => {
    const b = mBest(i), open = mOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-m="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยเล่น' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function mEncode() { const G = MS.G, t = mNow(); const o = { t: Math.round(t * 1000) / 1000, j: Rhy.recent(G, O.local, t) }; if (O.role === 'host') o.s = Rhy.summary(G); return o; }
function mHostHears(pr) {
  const G = MS.G;
  if (!G || pr.ep !== O.ep || !pr.mw) return;
  Rhy.merge(G, pr.mw.j);
}
function mGuestHears(pr) {
  const G = MS.G;
  if (!G || !pr.mw) return;
  const m = pr.mw;
  // start our clock on the host's song time the first time we hear it
  if (!MS.synced && Number.isFinite(m.t)) { MS.t0 = performance.now() - m.t * 1000; MS.synced = true; MS.sched = m.t - 0.05; }
  Rhy.merge(G, m.j);
  const was = G.over, pv = Object.assign({}, G.stats), pc = G.combo;
  if (m.s) Rhy.applySummary(G, m.s);
  if (G.stats.sync > pv.sync) MS.syncFx.push({ t: 0, life: 0.6 });
  if (G.stats.fevers > pv.fevers) mEvents(['fever']);
  if (pc >= 10 && G.combo < pc && G.stats.miss > pv.miss) mEvents(['break']);
  if (G.over && !was && !MS.endT && S.mode === 'play') { MS.endT = 1.6; mSave(); }
}

/* ---------- Tower mode (ต่อตึกด้วยกัน) ---------- */
const WS = { G: null, li: 0, acc: 0, floats: [], debris: [], camY: 0, endT: 0, savedB: null, press: { pink: 0, mint: 0 }, req: { n: 0, id: -1, x: 0, t: 0 }, seenReq: -1, prev: null, hop: { pink: 0, mint: 0 } };
const SITE = i => 'ไซต์ที่ ' + th(i + 1);
const WKEY = { KeyW: 'pink', KeyS: 'pink', Space: 'pink', ArrowUp: 'mint', ArrowDown: 'mint', Enter: 'mint', NumpadEnter: 'mint' };
const W_FH = Twr.FH, W_REST = 380;                                   // the floor being built rests this far down the screen
if (!prog.w) prog.w = {};
const wBest = i => prog.w[WLEVELS[i].name] || null;
const wOpen = i => i === 0 || !!(wBest(i - 1) && wBest(i - 1).s >= 1);
Object.assign(sfx, {
  wdrop() { tone(620, .06, 'triangle', .03, 320); noise(.18, 1200, .02, 'bandpass', 1, 400); },
  wland() { tone(150, .12, 'sine', .07, 70); tone(90, .18, 'sine', .08, 50); noise(.1, 600, .04, 'lowpass', .8); },
  wperf() { [880, 1320].forEach((f, i) => chime(f, .35, .05, i * .05)); },
  wseal() { chime(660, .3, .05); chime(990, .4, .05, .07); },
  wcrack() { noise(.08, 3000, .05, 'highpass', .7); tone(300, .18, 'sawtooth', .03, 120); tone(170, .1, 'square', .025, 90, .05); },
  wmiss() { tone(520, .35, 'sine', .05, 120); tone(80, .25, 'sine', .09, 40, .35); noise(.2, 500, .05, 'lowpass', .8, 0, .35); },
  what() { [523, 659, 784].forEach((f, i) => chime(f, .3, .05, i * .06)); },
  wtop() { [523, 659, 784, 1047, 1319].forEach((f, i) => chime(f, .5, .055, i * .09)); [523, 659, 784].forEach(f => tone(f, 1.1, 'triangle', .02, 0, .5)); },
  wfall() { tone(220, .7, 'sawtooth', .04, 50); tone(60, .5, 'sine', .1, 30, .15); noise(1.2, 300, .07, 'lowpass', .7, 80, .2); },
  wwind() { noise(.9, 300, .04, 'bandpass', .7, 900); tone(380, .55, 'sine', .015, 720); }
});
function wPress(who) { if (WS.G && S.mode === 'play') { WS.press[who] = Math.min(2, WS.press[who] + 1); audio(); } }

/* ---------- flow ---------- */
function loadTwr(i, net) {
  WS.li = i; WS.G = Twr.load(WLEVELS[i], 1000 + i * 37 + Math.floor(Math.random() * 1000)); WS.G.net = net || null;
  WS.acc = 0; WS.floats = []; WS.debris = []; WS.camY = 0; WS.endT = 0; WS.savedB = null; WS.press = { pink: 0, mint: 0 };
  WS.req = { n: WS.req.n, id: -1, x: 0, t: 0 }; WS.seenReq = -1; WS.prev = wSnap(WS.G); WS.hop = { pink: 0, mint: 0 };
  setKind('twr');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); buildTwrBg(); wHud(true);
}
function startTwr(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadTwr(i); showScreen(null); setMode('play');
}
function twrRestart() { if (O.role) { onlineRestart(); return; } loadTwr(WS.li); showScreen(null); setMode('play'); }
function twrNext() {
  if (O.role === 'host') { if (WS.li < WLEVELS.length - 1) onlineStartTwr(WS.li + 1); return; }
  if (WS.li < WLEVELS.length - 1 && wOpen(WS.li + 1)) startTwr(WS.li + 1); else toTitle();
}
let wHudKey = '';
function wHud(force) {
  const k = String(WS.li); if (!force && k === wHudKey) return; wHudKey = k;
  const lv = WLEVELS[WS.li];
  $('#hNo').textContent = SITE(WS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function wSave() {
  if (WS.savedB) return WS.savedB;
  const G = WS.G, lv = WLEVELS[WS.li], st = Twr.stars(G), f = Twr.floorsDone(G);
  const b = prog.w[lv.name] || { s: 0, f: 0, m: 0 };
  prog.w[lv.name] = { s: Math.max(b.s, st), f: Math.max(b.f || 0, f), m: Math.max(b.m || 0, G.score) };
  store.set('prog2', prog);
  return (WS.savedB = b);
}
function wResults() {
  const G = WS.G, lv = WLEVELS[WS.li], st = Twr.stars(G), f = Twr.floorsDone(G), s = G.stats;
  const b = wSave(), best = f > (b.f || 0) || (G.won && G.score > (b.m || 0));
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${SITE(WS.li)} · ${G.won ? 'สร้างเสร็จแล้ว' : 'หมวกหมด ปิดไซต์'}`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = G.won ? (s.crack === 0 ? 'ต่อสนิททุกชั้น ตึกตั้งตรงเป๊ะ ช่างคู่นี้ฝีมือดีมาก' : 'ต่อจนถึงยอดได้แล้ว รอบหน้าลองปิดรอยต่อให้ครบทุกชั้น')
    : st >= 2 ? 'อีกนิดเดียวถึงยอด ลงเป๊ะพร้อมกันจะได้หมวกคืน'
    : st === 1 ? 'ผ่านแล้ว ไซต์ถัดไปเปิดให้เล่นแล้ว'
    : `ยังไม่ถึงดาวแรก ต้องต่อให้ได้ ${th(lv.stars[0])} ชั้น ปล่อยตอนขอบด้านในตรงกับชั้นล่างของตัวเอง`;
  $('#cMsg').textContent = msg + (best && b.f ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>ชั้น <b>${th(f)}/${th(lv.top)}</b></span><span>แต้ม <b>${th(G.score)}</b></span><span>ลงเป๊ะ <b>${th(s.perfect)}</b> ครั้ง</span><span>ต่อสนิท <b>${th(s.seal)}</b> ชั้น ร่วง <b>${th(s.miss)}</b></span>`;
  const last = WS.li >= WLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'ไซต์ถัดไป';
  $('#bNext').hidden = guest || last || !wOpen(WS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'สร้างไซต์นี้ใหม่';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
const wTop = k => Twr.GROUND - k * W_FH;                              // world y of the top of floor k
function wFloat(text, x, y, col, size = 16, life = 1.4) { WS.floats.push({ text, x, y, col, life, max: life, size }); }
function wWall(who) { const P = WSCENE[WS.G.def.scene] || WSCENE.house; return who === 'pink' ? P.wallP : P.wallM; }
function wDebris(who, x0, x1, ytop, vx) {
  if (x1 - x0 < 1) return;
  WS.debris.push({ x: x0, w: x1 - x0, y: ytop, vx: vx + (Math.random() - .5) * 40, vy: -60 - Math.random() * 60, rot: 0, vr: (Math.random() - .5) * 5, col: wWall(who), who });
}
// what a landing looked like: cut pieces fly off, a miss falls whole
function wLandFx(who, l) {
  const G = WS.G; if (!l) return;
  const ytop = l.y - W_FH, o = l.o || 0;
  if (l.miss) {
    wDebris(who, l.x + o, l.x + l.w + o, ytop, G.wind * .5);
    sfx.wmiss(); S.shake = .5;
    wFloat('ร่วง! เสียหมวกหนึ่งใบ', l.x + l.w / 2 + o, ytop - 18, '#ff9a9a', 16);
    return;
  }
  if (l.a > l.x + .5) wDebris(who, l.x + o, l.a + o, ytop, -70);
  if (l.x + l.w > l.b + .5) wDebris(who, l.b + o, l.x + l.w + o, ytop, 70);
  sfx.wland();
  const cx = (l.a + l.b) / 2 + o;
  burst(cx, l.y, 8, 'rgba(230,220,200,.8)', { speed: 70, up: 30, life: .4, size: 2.5, g: 200 });
  if (l.perf) { sfx.wperf(); wFloat('เป๊ะ!', cx, ytop - 14, C.gold, 20, 1); burst(cx, ytop, 14, C.gold, { speed: 150, up: 60, life: .55, size: 3, g: 150 }); }
}
function wFloorFx(f, k) {
  const G = WS.G, y = wTop(k), sx = f.pink.b + Twr.off(G, k, G.t);
  if (f.seal) { sfx.wseal(); wFloat('ต่อสนิท', sx, y - 34, C.paper, 14, 1.1); burst(sx, y + W_FH / 2, 10, '#fff', { speed: 90, life: .4, size: 2, g: 0 }); }
  else { sfx.wcrack(); wFloat('รอยต่อห่าง ตึกโยกขึ้น', sx + f.gap / 2, y - 34, '#ffb38a', 14, 1.4); S.shake = Math.max(S.shake, .25); }
}
function wEvents(ev) {
  const G = WS.G;
  for (const e of ev) {
    const [k, who, p] = e.split(':');
    if (k === 'drop') { sfx.wdrop(); WS.hop[who] = 1; }
    else if (k === 'land' || k === 'miss') wLandFx(who, G.last[who]);
    else if (k === 'seal' || k === 'crack') { const n = G.floors.length - 1; wFloorFx(G.floors[n], n); }
    else if (k === 'both') wFloat('ลงเป๊ะทั้งคู่', VW / 2, wTop(G.floors.length - 1) - 60, C.gold, 18, 1.4);
    else if (k === 'life') { sfx.what(); wFloat('ได้หมวกคืนหนึ่งใบ', VW / 2, wTop(G.floors.length - 1) - 84, '#ffe07a', 15, 1.6); }
    else if (k === 'auto') { const b = G.blk[who]; wFloat('ปั้นจั่นปล่อยเอง', b ? b.x + b.w / 2 : VW / 2, (b ? b.y : wTop(G.n)) - 60, '#ffcfa0', 13, 1.2); }
    else if (k === 'wind') { sfx.wwind(); wFloat(G.wind > 0 ? 'ลมเปลี่ยน พัดไปทางขวา →' : '← ลมเปลี่ยน พัดไปทางซ้าย', VW / 2, wTop(G.n) - 170, '#d8f2ff', 16, 1.8); }
    else if (k === 'top') { sfx.wtop(); wTopFx(); }
    else if (k === 'collapse') { sfx.wfall(); S.shake = 1.2; S.flash = .6; }
    void p;
  }
}
function wTopFx() {
  const G = WS.G, y = wTop(G.floors.length - 1);
  for (let i = 0; i < 4; i++) setTimeout(() => { if (S.kind === 'twr') burst(VW / 2 + (Math.random() - .5) * 300, y - 60 - Math.random() * 80, 30, [C.gold, C.pink, C.mint, '#fff'][i], { speed: 240, up: 60, life: 1.1, size: 3.5, g: 120 }); }, i * 220);
  wFloat('สร้างเสร็จแล้ว!', VW / 2, y - 110, C.gold, 30, 2.4);
}
function wSnap(G) { return { lands: G.lands, k: { pink: G.last.pink ? G.last.pink.k : 0, mint: G.last.mint ? G.last.mint.k : 0 }, floors: G.floors.length, lives: G.lives, both: G.stats.both, auto: G.stats.auto, wind: G.wind, over: G.over, won: G.won }; }
// the guest: effects from what changed in the host's snapshot
function wGuestDiff() {
  const G = WS.G, n = wSnap(G), p = WS.prev || n;
  for (const who of ['pink', 'mint']) if (n.k[who] > p.k[who] && G.last[who]) wLandFx(who, G.last[who]);
  for (let k = p.floors; k < n.floors; k++) if (G.floors[k]) wFloorFx(G.floors[k], k);
  if (n.both > p.both) wEvents(['both']);
  if (n.lives > p.lives) wEvents(['life']);
  if (n.wind !== p.wind && n.floors > 1) wEvents(['wind']);
  if (n.won && !p.won) wEvents(['top']);
  else if (n.over && !p.over) wEvents(['collapse']);
  WS.prev = n;
}
function wTick() {
  const G = WS.G;
  const take = who => { const p = WS.press[who] > 0; if (p) WS.press[who]--; return p; };
  if (!O.role) wEvents(Twr.step(G, { pink: { drop: take('pink') }, mint: { drop: take('mint') } }));
  else if (O.role === 'host') { const me = O.local; wEvents(Twr.step(G, { [me]: { drop: take(me) } })); }
  else {
    const req = Twr.guestStep(G, O.local, take(O.local));
    if (req) { WS.req = { n: WS.req.n + 1, id: req.id, x: req.x, t: req.t }; sfx.wdrop(); WS.hop[O.local] = 1; }
  }
  if (G.over && !WS.endT) { WS.endT = G.won ? 2.8 : 2; wSave(); }
}
function twrFrame(dt, now) {
  const G = WS.G;
  if (S.mode === 'play' && G) {
    WS.acc += dt;
    while (WS.acc >= Twr.DT) { wTick(); WS.acc -= Twr.DT; if (S.mode !== 'play') { WS.acc = 0; break; } }
    if (WS.endT > 0) { WS.endT -= dt; if (WS.endT <= 0) { WS.endT = -1; wResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else WS.acc = 0;
  if (O.role) pumpOnline(now);
  if (G) {
    const target = Math.min(0, Twr.restY(G.won ? G.floors.length - 1 : G.n) - W_REST - (G.won ? 40 : 0));
    WS.camY += (target - WS.camY) * Math.min(1, dt * 3.5);
    for (const d of WS.debris) { d.vy += 1500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
    WS.debris = WS.debris.filter(d => d.y - WS.camY < VH + 80);
    for (const k of ['pink', 'mint']) WS.hop[k] = Math.max(0, WS.hop[k] - dt * 5);
  }
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const f of WS.floats) { f.life -= dt; f.y -= dt * 22; }
  WS.floats = WS.floats.filter(f => f.life > 0);
  if (G) wHud();
  renderTwr();
}

/* ---------- drawing ---------- */
const twrBg = document.createElement('canvas');
const WSCENE = {
  house: { sky: ['#9fd3ff', '#d4ecff', '#fff0d2'], far: '#a9cfa0', near: '#86b585', ground: '#8f6b48', wallP: '#f4bccb', wallM: '#ace6d3', trim: '#8a5a3c', win: '#5a4570', roof: '#b4553f', style: 'wood' },
  shop: { sky: ['#9ccaf5', '#d6e9ff', '#ffe8cc'], far: '#a7aecf', near: '#8a91b6', ground: '#6e6b7c', wallP: '#f6c6d2', wallM: '#bdebdc', trim: '#5c5472', win: '#3e3a5e', roof: '#e3b54d', style: 'shop' },
  wind: { sky: ['#86c9f2', '#c6ebff', '#f0fae6'], far: '#b2d993', near: '#8cc073', ground: '#7d9a52', wallP: '#f7c2cc', wallM: '#b3e9d6', trim: '#8a4e3a', win: '#4e4268', roof: '#a8473a', style: 'barn' },
  sea: { sky: ['#73bdf0', '#b9e3ff', '#fff2d8'], far: '#3f8fc4', near: '#2f78ad', ground: '#ecd59c', wallP: '#f8d0da', wallM: '#c4f0e2', trim: '#6a7a9a', win: '#2e5a86', roof: '#e7eef6', style: 'condo' },
  chedi: { sky: ['#ffd7a4', '#f6b48a', '#c587a6'], far: '#a7789a', near: '#86607e', ground: '#7a5a4a', wallP: '#f8ead6', wallM: '#f8ead6', trim: '#e2b04a', win: '#c99a3a', roof: '#f1c35a', style: 'chedi' }
};
function buildTwrBg() {
  const G = WS.G; if (!G) return;
  twrBg.width = cv.width; twrBg.height = cv.height;
  const g = twrBg.getContext('2d', { alpha: false }), P = WSCENE[G.def.scene] || WSCENE.house;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, P.sky[0]); sky.addColorStop(.6, P.sky[1]); sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
}
// scenery that slides down as the tower rises (parallax 'p'); y is where it sits when the camera is at the ground
function wScenery(g, P, scene, cam) {
  const R = rng(WS.li * 131 + 7);
  // clouds all the way up
  for (let i = 0; i < 26; i++) {
    const cy = 120 - i * 150 + R() * 60, x = (R() * (VW + 200) - 100), y = cy - cam * .55, s = .6 + R() * .8;
    if (y < -60 || y > VH + 40) continue;
    const cw = 110 * s, cl = layer('wCloud', '', 360, 210, q => fluffyCloud(q, 180, 130, 200, .78));
    g.drawImage(cl, x - cw * .9, y - cw * .65, cw * 1.8, cw * 1.05);
  }
  // a soft sun, and hot air balloons drifting at different heights
  { const sy = 90 - cam * .15; if (sy > -80) { glow(g, '255,236,170', 760, sy, 90, .5); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(760, sy, 26, 0, Math.PI * 2); g.fill(); } }
  for (let i = 0; i < 4; i++) {
    const by = 170 - i * 420 - cam * .45, bx = ((i * 263 + S.time * (6 + i * 2)) % (VW + 160)) - 80;
    if (by < -90 || by > VH + 60) continue;
    const cols = [['#ff8fb8', '#fff3f8'], ['#7fd0ff', '#fffbe6'], ['#ffd25a', '#ff9a5c'], ['#9be07a', '#fff']][i], k = .7 + (i % 2) * .25;
    g.save(); g.translate(bx, by + Math.sin(S.time * .8 + i) * 5); g.scale(k, k);
    g.strokeStyle = 'rgba(90,70,60,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-9, 20); g.lineTo(-6, 34); g.moveTo(9, 20); g.lineTo(6, 34); g.stroke();
    g.save(); g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(-30, 6, -26, -30, 0, -30); g.bezierCurveTo(26, -30, 30, 6, 0, 24); g.closePath(); g.clip();
    for (let s = -3; s <= 3; s++) { g.fillStyle = (s + 3) % 2 ? cols[0] : cols[1]; g.fillRect(s * 8 - 4, -32, 8, 60); }
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-9, -14, 5, 10, -.3, 0, Math.PI * 2); g.fill();
    g.restore();
    g.fillStyle = '#a8724a'; rr(g, -7, 33, 14, 9, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-6, 34, 12, 1.5);
    g.restore();
  }
  const fy = 380 - cam * .3;
  if (fy < VH + 10) stamp(g, 'wFar', scene + WS.li, 0, fy - 130, VW, VH + 360, q => {
    // the far layer is drawn once with its own copy of the random numbers (the clouds used the first 78)
    const R = rng(WS.li * 131 + 7); for (let i = 0; i < 78; i++) R();
    q.translate(0, 130); wFar(q, P, scene, R, 0);
  });
  const ny = 430 - cam * .6;
  if (ny < VH + 10) {
    g.fillStyle = P.near;
    if (scene === 'sea') { g.fillStyle = P.ground; g.fillRect(0, ny + 30, VW, VH); for (const px of [120, 820]) { g.strokeStyle = '#7a5a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, ny + 40); g.quadraticCurveTo(px + 10, ny - 20, px + 4, ny - 60); g.stroke(); g.fillStyle = '#3f9a62'; for (let a = 0; a < 5; a++) { g.beginPath(); g.ellipse(px + 4 + Math.cos(a * 1.3) * 22, ny - 60 + Math.sin(a * 1.3) * 6, 26, 7, a * 1.3, 0, Math.PI * 2); g.fill(); } } }
    else if (scene === 'wind') { g.beginPath(); g.moveTo(0, ny + 40); for (let x = 0; x <= VW; x += 120) g.lineTo(x, ny + 20 + Math.sin(x * .02) * 14); g.lineTo(VW, VH + 200); g.lineTo(0, VH + 200); g.fill(); for (const mx of [150, 800]) { g.fillStyle = '#efe6d6'; g.fillRect(mx - 4, ny - 50, 8, 80); g.save(); g.translate(mx, ny - 50); g.rotate(S.time * 2); for (let a = 0; a < 4; a++) { g.rotate(Math.PI / 2); g.fillRect(-3, 0, 6, 34); } g.restore(); } }
    else if (scene === 'chedi') { g.beginPath(); g.moveTo(0, ny + 30); for (let x = 0; x <= VW; x += 90) g.lineTo(x, ny + 10 + Math.sin(x * .015 + 2) * 18); g.lineTo(VW, VH + 200); g.lineTo(0, VH + 200); g.fill(); for (const tx of [110, 850]) prang(g, tx, ny + 30, 30, 90, '#6e4a66'); }
    else { g.beginPath(); g.moveTo(0, ny + 40); for (let x = 0; x <= VW; x += 100) g.lineTo(x, ny + 22 + Math.sin(x * .013 + 3) * 16); g.lineTo(VW, VH + 200); g.lineTo(0, VH + 200); g.fill(); }
  }
}
// the building site at the foot of the tower (drawn once per level)
function wSite(g, P, G, gy) {
  g.fillStyle = P.ground; g.fillRect(0, gy, VW, 120);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, gy, VW, 4);
  // the building site: specks of gravel, striped barriers and cones
  const R2 = rng(WS.li * 17 + 3);
  g.fillStyle = 'rgba(0,0,0,.1)'; for (let i = 0; i < 50; i++) g.fillRect(R2() * VW, gy + 8 + R2() * 70, 2 + R2() * 4, 1.5);
  g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(R2() * VW, gy + 8 + R2() * 70, 1.2 + R2() * 1.5, 0, Math.PI * 2); g.fill(); }
  for (const bx of [150, VW - 270]) {
    g.fillStyle = '#5c5472'; g.fillRect(bx + 8, gy - 20, 4, 22); g.fillRect(bx + 108, gy - 20, 4, 22);
    g.save(); rr(g, bx, gy - 27, 120, 12, 3); g.clip(); g.fillStyle = '#fff4e0'; g.fillRect(bx, gy - 27, 120, 12);
    g.fillStyle = '#ff8a5c'; for (let s = -1; s < 13; s++) { const x = bx + s * 12; g.beginPath(); g.moveTo(x, gy - 15); g.lineTo(x + 12, gy - 27); g.lineTo(x + 18, gy - 27); g.lineTo(x + 6, gy - 15); g.closePath(); g.fill(); }
    g.restore(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(bx + 2, gy - 26, 116, 1.5);
  }
  for (const cx of [118, 296, VW - 296, VW - 118]) {
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(cx, gy + 3, 13, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff8a3c'; g.beginPath(); g.moveTo(cx - 9, gy + 1); g.lineTo(cx - 2.5, gy - 21); g.lineTo(cx + 2.5, gy - 21); g.lineTo(cx + 9, gy + 1); g.closePath(); g.fill();
    g.fillStyle = '#fff6e8'; g.fillRect(cx - 5.6, gy - 12, 11.2, 4); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - 2, gy - 19, 2, 18);
    g.fillStyle = '#5c5472'; rr(g, cx - 12, gy - 1, 24, 4, 2); g.fill();
  }
  const f0 = G.floors[0]; g.fillStyle = '#9b97a8'; g.fillRect(f0.pink.a - 18, gy, f0.mint.b - f0.pink.a + 36, 18); g.fillStyle = '#b8b4c4'; g.fillRect(f0.pink.a - 18, gy, f0.mint.b - f0.pink.a + 36, 4);
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = f0.pink.a - 6; x < f0.mint.b + 12; x += 34) g.fillRect(x, gy + 6, 1.5, 10);

}
// the far scenery behind the tower (drawn once into a layer)
function wFar(g, P, scene, R, fy) {
  g.fillStyle = P.far;
  if (scene === 'sea') { g.fillRect(0, fy + 20, VW, VH); g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) g.fillRect(R() * VW, fy + 30 + R() * 60, 30 + R() * 40, 2); }
  else if (scene === 'shop') { for (let i = 0; i < 14; i++) { const x = i * 72 + R() * 20, h = 60 + R() * 110, top = fy + 60 - h; g.fillStyle = P.far; g.fillRect(x, top, 56, h + 200); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, top, 56, 3); g.fillStyle = 'rgba(255,255,255,.28)'; for (let wy = top + 10; wy < fy + 70; wy += 16) for (let wx = x + 7; wx < x + 50; wx += 13) if ((wx * 3 + wy) % 7) g.fillRect(wx, wy, 7, 9); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 46, top, 10, h + 200); } }
  else if (scene === 'chedi') { g.beginPath(); g.moveTo(0, fy + 70); for (let x = 0; x <= VW; x += 60) g.lineTo(x, fy + 10 + Math.sin(x * .01 + 1) * 40 + R() * 20); g.lineTo(VW, VH + 200); g.lineTo(0, VH + 200); g.fill(); }
  else { g.beginPath(); g.moveTo(0, fy + 60); for (let x = 0; x <= VW; x += 80) g.lineTo(x, fy + 30 + Math.sin(x * .008) * 30 + R() * 16); g.lineTo(VW, VH + 200); g.lineTo(0, VH + 200); g.fill(); }
}
function wHalf(g, P, who, x0, x1, ytop, k, ghost) {
  const w = x1 - x0; if (w <= .5) return;
  const pink = who === 'pink', style = P.style;
  g.fillStyle = pink ? P.wallP : P.wallM; g.fillRect(x0, ytop, w, W_FH);
  if (style === 'chedi') {
    g.fillStyle = P.trim; g.fillRect(x0, ytop, w, 4); g.fillRect(x0, ytop + W_FH - 6, w, 2);
    g.fillStyle = 'rgba(160,110,60,.18)'; for (let x = x0 + 10; x < x1 - 6; x += 18) g.fillRect(x, ytop + 10, 8, 14);
  } else {
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x0, ytop + W_FH - 5, w, 5);
    if (style === 'wood' || style === 'barn') { g.fillStyle = 'rgba(120,70,40,.18)'; for (let yy = ytop + 9; yy < ytop + W_FH - 4; yy += 8) g.fillRect(x0, yy, w, 1.5); }
    g.fillStyle = P.trim; g.fillRect(x0, ytop, w, 3);
    const n = Math.floor((w - 6) / 26), sx = x0 + (w - n * 26) / 2;
    for (let i = 0; i < n; i++) {
      const wx = sx + i * 26 + 7;
      if (style === 'shop' && k % 4 === 1) { g.fillStyle = i % 2 ? '#ff9fb6' : '#fff1f4'; g.fillRect(wx - 7, ytop + 3, 26, 7); g.fillStyle = P.win; g.fillRect(wx - 3, ytop + 13, 18, 16); continue; }
      g.fillStyle = P.win; g.fillRect(wx, ytop + 10, 12, 15);
      if (style === 'condo') { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(wx - 3, ytop + 25, 18, 3); }
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(wx + 2, ytop + 12, 3, 6);
    }
  }
  // whose half it is: a thin stripe on the outer edge
  g.fillStyle = pink ? C.pink : C.mint; g.fillRect(pink ? x0 : x1 - 3, ytop + 3, 3, W_FH - 3);
  if (ghost) { g.strokeStyle = pink ? C.pink : C.mint; g.lineWidth = 2; g.strokeRect(x0 + 1, ytop + 1, w - 2, W_FH - 2); }
}
function wRoof(g, P, scene, x0, x1, ytop) {
  const cx = (x0 + x1) / 2, w = x1 - x0;
  g.fillStyle = P.roof;
  if (scene === 'chedi') {
    g.beginPath(); g.ellipse(cx, ytop, w * .42, 16, 0, Math.PI, 0); g.fill();
    for (let i = 0; i < 6; i++) { const ww = w * .3 * (1 - i / 7); g.fillRect(cx - ww / 2, ytop - 16 - i * 12, ww, 9); }
    g.beginPath(); g.moveTo(cx - 6, ytop - 86); g.lineTo(cx, ytop - 150); g.lineTo(cx + 6, ytop - 86); g.fill();
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(cx, ytop - 150, 3, 0, Math.PI * 2); g.fill();
  } else if (scene === 'sea') {
    g.fillRect(x0 - 6, ytop - 10, w + 12, 10); g.fillStyle = '#9aa8be'; g.fillRect(cx - 2, ytop - 70, 4, 60); g.fillStyle = C.pink; g.beginPath(); g.moveTo(cx + 2, ytop - 70); g.lineTo(cx + 30, ytop - 62); g.lineTo(cx + 2, ytop - 54); g.fill();
  } else if (scene === 'shop') {
    g.fillRect(x0 - 8, ytop - 8, w + 16, 8); rr(g, cx - 70, ytop - 46, 140, 34, 8); g.fillStyle = '#fff6df'; g.fill(); g.strokeStyle = P.roof; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#5c5472'; g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ร้านของเรา', cx, ytop - 28); g.textBaseline = 'alphabetic';
  } else {
    g.beginPath(); g.moveTo(x0 - 16, ytop); g.lineTo(cx, ytop - Math.min(90, w * .4)); g.lineTo(x1 + 16, ytop); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(cx, ytop - Math.min(90, w * .4)); g.lineTo(x1 + 16, ytop); g.lineTo(cx, ytop); g.fill();
  }
}
const W_MAST = { pink: 46, mint: 914 }, W_JIB = { pink: 92, mint: 108 };
function wCrane(g, G, who, cam) {
  const pink = who === 'pink', mx = W_MAST[who], jy = W_JIB[who], col = pink ? C.pink : C.mint, dk = pink ? C.pinkD : C.mintD;
  // mast down to the ground, braces sliding past as the camera rises
  const base = Twr.GROUND + 40 - cam;
  g.strokeStyle = '#e2b84a'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(mx - 9, jy); g.lineTo(mx - 9, Math.min(VH + 10, base)); g.moveTo(mx + 9, jy); g.lineTo(mx + 9, Math.min(VH + 10, base)); g.stroke();
  g.lineWidth = 1.5; g.beginPath();
  const ph = ((-cam) % 26 + 26) % 26;
  for (let y = jy + 30 + ph - 26; y < Math.min(VH + 10, base); y += 26) { g.moveTo(mx - 9, y); g.lineTo(mx + 9, y + 13); g.lineTo(mx - 9, y + 26); }
  g.stroke();
  // jib out toward the middle and a short counter-jib with its weight
  const far = pink ? 640 : 320;
  g.strokeStyle = '#e2b84a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx, jy); g.lineTo(far, jy); g.moveTo(mx, jy + 10); g.lineTo(far, jy + 10); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); for (let x = mx; pink ? x < far : x > far; x += pink ? 18 : -18) { g.moveTo(x, jy); g.lineTo(x + (pink ? 9 : -9), jy + 10); g.lineTo(x + (pink ? 18 : -18), jy); } g.stroke();
  g.fillStyle = '#7a7690'; g.fillRect(pink ? mx - 44 : mx + 14, jy - 2, 30, 16);
  g.strokeStyle = '#e2b84a'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, jy - 16); g.lineTo(pink ? far - 60 : far + 60, jy); g.moveTo(mx, jy - 16); g.lineTo(pink ? mx - 30 : mx + 30, jy); g.stroke();
  // cabin with the player inside
  rr(g, mx - 22, jy + 12, 44, 36, 7); g.fillStyle = '#fff7e6'; g.fill(); g.strokeStyle = dk; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(140,200,255,.45)'; g.fillRect(mx - 18, jy + 16, 36, 16);
  g.save(); g.translate(mx, jy + 46 - WS.hop[who] * 3); g.scale(1.05, 1.05); drawPlayer(g, { id: who, x: -11, y: -28, w: 22, h: 28, face: pink ? 1 : -1, sq: WS.hop[who] * .5, walk: 0 }, S.time); g.restore();
  // trolley, cable and hook
  const b = G.blk[who];
  const tx = b ? clampX(b.x + b.w / 2, pink) : (pink ? 420 : 540);
  g.fillStyle = '#5c5472'; g.fillRect(tx - 9, jy + 8, 18, 8);
  const swinging = b && b.st === 'swing';
  const hy = swinging ? b.y - W_FH - cam : jy + 34;
  g.strokeStyle = '#3e3a52'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx - 4, jy + 16); g.lineTo(tx - 4, hy - 8); g.moveTo(tx + 4, jy + 16); g.lineTo(tx + 4, hy - 8); g.stroke();
  if (swinging) { g.beginPath(); g.moveTo(tx, hy - 8); g.lineTo(b.x + 6, hy); g.moveTo(tx, hy - 8); g.lineTo(b.x + b.w - 6, hy); g.stroke(); }
  // the crane's patience: a ring that empties, red at the end
  if (swinging) {
    const left = Math.max(0, b.fuse - b.t), fr = left / b.fuse;
    g.lineWidth = 3; g.strokeStyle = 'rgba(21,17,46,.35)'; g.beginPath(); g.arc(tx, hy - 16, 7, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = left < 1.5 ? (Math.sin(S.time * 18) > 0 ? '#ff5d5d' : '#ffd0d0') : col; g.beginPath(); g.arc(tx, hy - 16, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); g.stroke();
  }
  // wind flag at the tip of the jib
  if (G.def.wind) {
    const fx = far, fy = jy - 2, wv = G.wind / G.def.wind, len = 14 + Math.abs(wv) * 22;
    g.strokeStyle = '#5c5472'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 26); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(fx, fy - 26);
    const fl = Math.sin(S.time * (6 + Math.abs(wv) * 8)) * 3;
    g.lineTo(fx + Math.sign(G.wind || 1) * len, fy - 21 + fl); g.lineTo(fx, fy - 15); g.fill();
  }
}
const clampX = (x, pink) => (pink ? Math.min(630, Math.max(80, x)) : Math.max(330, Math.min(880, x)));
function wHudDraw(g, G) {
  const lv = G.def, done = Twr.floorsDone(G);
  // floors and hard hats
  panel(g, 10, 10, 170, 64, 12, .78);
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('ชั้น', 22, 29);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.paper; g.fillText(`${th(done)}`, 22, 62);
  g.font = `400 14px ${FONT_D}`; g.fillStyle = '#c9bfef'; g.fillText(`/${th(lv.top)}`, 22 + g.measureText(th(done)).width * 26 / 14 + 4, 62);
  for (let i = 0; i < Twr.LIVES; i++) {
    const x = 112 + i * 22, y = 50, on = i < G.lives;
    g.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,.15)';
    g.beginPath(); g.arc(x, y, 9, Math.PI, 0); g.fill(); g.fillRect(x - 12, y - 1, 24, 4);
    if (on) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 2, y - 9, 4, 8); }
  }
  g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.textAlign = 'right'; g.fillText('หมวก', 168, 29);
  // progress to the top with the star marks
  const px = VW / 2 - 150, pw = 300, py = 14;
  panel(g, px - 12, py - 6, pw + 24, 40, 12, .78);
  rr(g, px, py + 10, pw, 10, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  rr(g, px, py + 10, Math.max(10, pw * done / lv.top), 10, 5); g.fillStyle = G.won ? C.gold : '#9fe3c9'; g.fill();
  for (let i = 0; i < 3; i++) {
    const x = px + pw * lv.stars[i] / lv.top, got = done >= lv.stars[i];
    g.font = `400 ${i === 2 ? 15 : 13}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = got ? C.gold : 'rgba(255,255,255,.45)'; g.fillText('★', Math.min(x, px + pw - 4), py + 6);
  }
  g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.textAlign = 'left'; g.fillText('ถึงยอด', px, py + 4);
  // score, sway and wind
  panel(g, VW - 180, 10, 170, 64, 12, .78);
  g.textAlign = 'right'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('แต้ม', VW - 22, 29);
  g.font = `400 22px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(th(G.score), VW - 22, 56);
  g.textAlign = 'left'; g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('ตึกโยก', VW - 168, 29);
  for (let i = 0; i < Twr.WOB_MAX; i++) { g.fillStyle = i < G.wobble ? (G.wobble >= 4 ? '#ff7b6b' : '#ffc65a') : 'rgba(255,255,255,.14)'; g.fillRect(VW - 168 + i * 9, 36, 7, 8); }
  if (G.def.wind) {
    const a = G.wind > 0 ? '→' : '←', n = Math.max(1, Math.round(Math.abs(G.wind) / G.def.wind * 3));
    g.font = `600 11px ${FONT}`; g.fillStyle = '#d8f2ff'; g.fillText('ลม ' + a.repeat(n), VW - 168, 62);
  }
}
function renderTwr() {
  const g = ctx, G = WS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(twrBg, 0, 0);
  let ox = 0, oy = 0; if (S.shake > 0) { ox = (Math.random() - .5) * 8 * S.shake; oy = (Math.random() - .5) * 6 * S.shake; }
  g.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
  const P = WSCENE[G.def.scene] || WSCENE.house, cam = WS.camY, t = G.t;
  wScenery(g, P, G.def.scene, cam);
  drawBirds(g, S.time, 80 - cam * .2, 260 - cam * .2, 3);
  // ground and foundation
  const gy = Twr.GROUND - cam;
  if (gy < VH + 10) stamp(g, 'wSite', String(WS.li), 0, gy - 34, VW, 154, q => { q.translate(0, 34); wSite(q, P, G, 0); });
  // the tower: each floor leans by its own height; a half being placed leans with the floor under it
  g.save(); g.translate(0, -cam);
  const lo = Math.max(1, Math.floor((Twr.GROUND - (cam + VH + 60)) / W_FH));
  for (let k = lo; k < G.floors.length; k++) {
    const f = G.floors[k]; if (!f) continue;
    const o = Twr.off(G, k, t), y = wTop(k);
    if (y - cam < -W_FH - 200) break;
    wHalf(g, P, 'pink', f.pink.a + o, f.pink.b + o, y, k);
    wHalf(g, P, 'mint', f.mint.a + o, f.mint.b + o, y, k);
    if (!f.seal && f.gap > 0) {                                    // the two inner edges are broken where they failed to meet
      g.strokeStyle = 'rgba(70,35,35,.6)'; g.lineWidth = 2; g.beginPath();
      for (const [x, s] of [[f.pink.b + o - 1, -1], [f.mint.a + o + 1, 1]]) { g.moveTo(x, y + 3); for (let j = 1; j <= 5; j++) g.lineTo(x + (j % 2 ? s * 4 : 0), y + 3 + j * (W_FH - 6) / 5); }
      g.stroke();
    }
  }
  const top = G.floors.length - 1;
  // halves already down on the floor being built
  if (!G.won) for (const who of ['pink', 'mint']) { const c = G.cur[who]; if (c) { const o = Twr.off(G, G.n - 1, t); wHalf(g, P, who, c.a + o, c.b + o, wTop(G.n), G.n); } }
  if (G.won) { const f = G.floors[top], o = Twr.off(G, top, t); wRoof(g, P, G.def.scene, f.pink.a + o, f.mint.b + o, wTop(top)); }
  // where each half belongs: a faint outline on its own floor below while it swings
  for (const who of ['pink', 'mint']) {
    const b = G.blk[who]; if (!b || b.st !== 'swing' || O.role && who !== O.local) continue;
    const below = G.floors[G.n - 1] && G.floors[G.n - 1][who]; if (!below) continue;
    const o = Twr.off(G, G.n - 1, t);
    g.strokeStyle = hexA(who === 'pink' ? C.pink : C.mint, .55); g.setLineDash([5, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(below.a + o, wTop(G.n - 1) - 1); g.lineTo(below.b + o, wTop(G.n - 1) - 1); g.stroke(); g.setLineDash([]);
  }
  // swinging and falling halves
  for (const who of ['pink', 'mint']) { const b = G.blk[who]; if (b) wHalf(g, P, who, b.x, b.x + b.w, b.y - W_FH, G.n, true); }
  // pieces flying off
  for (const d of WS.debris) { g.save(); g.translate(d.x + d.w / 2, d.y + W_FH / 2); g.rotate(d.rot); g.fillStyle = d.col; g.fillRect(-d.w / 2, -W_FH / 2, d.w, W_FH); g.fillStyle = d.who === 'pink' ? C.pink : C.mint; g.fillRect(-d.w / 2, -W_FH / 2, d.w, 3); g.restore(); }
  drawParts(g);
  for (const f of WS.floats) { g.globalAlpha = Math.min(1, f.life * 2.5); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y); g.globalAlpha = 1; }
  g.restore();
  // cranes on top (they stand still while the tower sways under them)
  wCrane(g, G, 'mint', cam); wCrane(g, G, 'pink', cam);
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * .4})`; g.fillRect(0, 0, VW, VH); }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  wHudDraw(g, G);
  if (S.banner > 0 && Twr.floorsDone(G) === 0) {
    const a = Math.min(1, S.banner * 1.5);
    g.globalAlpha = a; panel(g, VW / 2 - 230, 196, 460, 58, 14, .82);
    g.textAlign = 'center'; g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(G.def.name, VW / 2, 222);
    g.font = `600 12px ${FONT}`; g.fillStyle = C.paper; g.fillText(O.role ? 'กดปุ่มปล่อยตอนครึ่งตึกของคุณตรงกับเส้นประ' : 'ชมพูกด W  ·  มิ้นต์กด ↑  ·  ปล่อยตอนตรงกับเส้นประ', VW / 2, 243);
    g.globalAlpha = 1;
  }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}

/* ---------- touch: one big button each ---------- */
const wpad = $('#wpad');
wpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault(); audio();
  const who = O.role ? O.local : b.closest('.side').dataset.p;
  b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 140);
  wPress(who);
});
wpad.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- title list ---------- */
function renderTwrLevels() {
  let total = 0;
  $('#wlevels').innerHTML = WLEVELS.map((lv, i) => {
    const b = wBest(i), open = wOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ${th(b.f || 0)}/${th(lv.top)} ชั้น` : open ? 'ยังไม่เคยสร้าง' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-w="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#wStarsAll').textContent = `ดาวรวม ${th(total)}/${th(WLEVELS.length * 3)}`;
  let next = WLEVELS.findIndex((l, i) => wOpen(i) && !(wBest(i) && wBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.w = next;
  if (S.tab === 'twr') $('#bGo').textContent = wBest(next) ? `สร้าง${SITE(next)}` : 'เริ่มก่อสร้าง';
}
$('#wlevels').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && !b.disabled) startTwr(+b.dataset.w); });

/* ---------- online: the guest swings its own crane and says where it let go; the host lands everything ---------- */
function onlineStartTwr(i) {
  if (O.role !== 'host') return;
  O.md = 'w'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsW').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && !b.disabled) onlineStartTwr(+b.dataset.w); });
function renderOnlineTwr() {
  $('#oLevelsW').innerHTML = WLEVELS.map((lv, i) => {
    const b = wBest(i), open = wOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-w="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยสร้าง' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function wEncode() {
  const G = WS.G;
  if (O.role === 'host') return Twr.encode(G);
  const b = G.blk[O.local];
  return { x: b && b.st === 'swing' ? Math.round(b.x * 10) / 10 : null, id: b ? b.id : -1, d: WS.req.id >= 0 ? [WS.req.n, WS.req.id, WS.req.x, WS.req.t] : null };
}
function wHostHears(pr) {
  const G = WS.G;
  if (!G || pr.ep !== O.ep || !pr.ww || typeof pr.ww !== 'object') return;
  const m = pr.ww, rid = O.local === 'pink' ? 'mint' : 'pink';
  if (Number.isFinite(m.x)) Twr.remoteX(G, rid, m.x, m.id);
  const d = Array.isArray(m.d) ? m.d : null, n = d ? d[0] | 0 : 0;
  // the guest clears its request on every new level, so anything here is a real drop for this one
  if (d && n > WS.seenReq) { WS.seenReq = n; Twr.dropAt(G, rid, +d[2], d[1] | 0, +d[3]); }
}
function wGuestHears(pr) {
  const G = WS.G;
  if (!G || !pr.ww) return;
  Twr.apply(G, pr.ww, O.local);
  wGuestDiff();
  if (G.over && !WS.endT && S.mode === 'play') { WS.endT = G.won ? 2.8 : 2; wSave(); }
}

/* ---------- Three-legged race (วิ่งสามขา) ---------- */
const LS = { G: null, li: 0, acc: 0, floats: [], endT: 0, savedB: null, q: [], sent: [], seen: 0, raceAt: null, lift: { pink: 0, mint: 0 }, prev: null, simPerf: 0 };
const COURSE = i => 'สนามที่ ' + th(i + 1);
// keys: each player's left key and right key; pink stands on the left so its left key is the outer leg
const LKEY = { KeyA: ['pink', 'out'], KeyD: ['pink', 'in'], ArrowLeft: ['mint', 'in'], ArrowRight: ['mint', 'out'] };
const LQ_TXT = { perfect: 'เป๊ะ!', good: 'ดี', loose: 'ห่างไป' }, LQ_COL = { perfect: '#ffe27a', good: '#9ff0c8', loose: '#ffb38a' };
const L_PPM = 20;                                                     // pixels per metre on the track
if (!prog.l) prog.l = {};
const lBest = i => prog.l[LLEVELS[i].name] || null;
const lOpen = i => i === 0 || !!(lBest(i - 1) && lBest(i - 1).s >= 1);
Object.assign(sfx, {
  lstep(q) { tone(q === 'loose' ? 95 : 125, .08, 'sine', .09, 70); noise(.05, 400, .03, 'lowpass', .8); if (q === 'perfect') chime(1319, .15, .02); },
  llift() { tone(420, .04, 'triangle', .02); },
  lwrong() { tone(200, .16, 'triangle', .05, 140); },
  ltangle() { tone(160, .25, 'sawtooth', .04, 90); tone(120, .2, 'square', .03, 80, .08); noise(.2, 800, .03, 'bandpass', 1.5); },
  lfall() { tone(260, .35, 'sine', .06, 70); tone(70, .3, 'sine', .1, 40, .2); noise(.2, 500, .05, 'lowpass', .8, 0, .2); noise(.8, 520, .025, 'bandpass', 1.5, 380, .25); },
  ljump() { tone(300, .18, 'triangle', .06, 640); noise(.15, 900, .02, 'bandpass', 1, 2400); },
  lbeep(hi) { if (hi) { chime(1047, .5, .06); chime(1568, .5, .04, .03); } else chime(660, .2, .05); }
});
// online the guest stamps its presses on the host's race clock: its own clock plus the measured offset
function lRaceTime(perf) {
  const G = LS.G;
  if (O.role !== 'guest' || !LS.raceAt) return G.t + (perf - LS.simPerf) / 1000;
  return LS.raceAt.t + (perf + (O.clockOff || 0) - LS.raceAt.hn) / 1000;
}
function lPress(who, leg, perf) {
  const G = LS.G; if (!G || S.mode !== 'play') return;
  audio();
  const t = lRaceTime(perf || performance.now());
  LS.lift[who] = 1; sfx.llift();
  if (O.role === 'guest') { if (G.t >= Leg.START && G.st !== 'down') LS.sent.push([LS.sent.length ? LS.sent[LS.sent.length - 1][0] + 1 : 1, leg, Math.round(t * 1000) / 1000]); if (LS.sent.length > 8) LS.sent.shift(); return; }
  LS.q.push({ who, leg, t });
}

/* ---------- flow ---------- */
function loadLeg(i, net) {
  LS.li = i; LS.G = Leg.load(LLEVELS[i]); LS.G.net = net || null; LS.G.late = net && net.role === 'host' ? 0.35 : 0;
  LS.acc = 0; LS.floats = []; LS.endT = 0; LS.savedB = null; LS.q = []; LS.sent = []; LS.seen = 0; LS.raceAt = null; LS.lift = { pink: 0, mint: 0 };
  LS.prev = lSnap(LS.G); LS.simPerf = performance.now();
  setKind('leg');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 0;
  releaseK(); buildLegBg(); lHud(true); lPadLabels();
}
function startLeg(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadLeg(i); showScreen(null); setMode('play');
}
function legRestart() { if (O.role) { onlineRestart(); return; } loadLeg(LS.li); showScreen(null); setMode('play'); }
function legNext() {
  if (O.role === 'host') { if (LS.li < LLEVELS.length - 1) onlineStartLeg(LS.li + 1); return; }
  if (LS.li < LLEVELS.length - 1 && lOpen(LS.li + 1)) startLeg(LS.li + 1); else toTitle();
}
let lHudKey = '';
function lHud(force) {
  const k = String(LS.li); if (!force && k === lHudKey) return; lHudKey = k;
  const lv = LLEVELS[LS.li];
  $('#hNo').textContent = COURSE(LS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
const lFmt = s => th(s.toFixed(1));
function lSave() {
  if (LS.savedB) return LS.savedB;
  const G = LS.G, lv = LLEVELS[LS.li], st = Leg.stars(G);
  const b = prog.l[lv.name] || { s: 0, m: 0 };
  if (G.finished) { prog.l[lv.name] = { s: Math.max(b.s, st), m: b.m ? Math.min(b.m, G.time) : G.time }; store.set('prog2', prog); }
  return (LS.savedB = b);
}
function lResults() {
  const G = LS.G, lv = LLEVELS[LS.li], st = Leg.stars(G), pl = Leg.place(G), s = G.stats;
  const b = lSave(), best = G.finished && (!b.m || G.time < b.m);
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${COURSE(LS.li)} · ${G.finished ? `เข้าเส้นชัยอันดับ ${th(pl)}` : 'หมดเวลา'}`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const champ = lv.rivals.reduce((a, r) => (r.time < a.time ? r : a));
  const msg = !G.finished ? 'ยังไม่ถึงเส้นชัย ลองนับ ใน นอก ออกเสียงด้วยกันช้าๆ ก่อน แล้วค่อยเร่ง'
    : st === 3 ? `ชนะ${champ.name}แชมป์เก่า ขาเป็นขาเดียวกันจริงๆ`
    : st === 2 ? `อีกนิดจะชนะ${champ.name} ลองกดให้พร้อมกันกว่านี้ ก้าวจะยาวขึ้นเอง`
    : st === 1 ? 'ผ่านแล้ว สนามถัดไปเปิดให้เล่นแล้ว'
    : `ยังแพ้ทุกทีม ต้องเร็วกว่า ${th(lv.rivals.reduce((a, r) => Math.max(a, r.time), 0))} วินาที ล้มน้อยลงจะเร็วขึ้นมาก`;
  $('#cMsg').textContent = msg + (best && b.m ? ' · สถิติใหม่' : '');
  const n = s.perfect + s.good + s.loose;
  $('#cStats').innerHTML = `<span>เวลา <b>${G.finished ? lFmt(G.time) : '–'}</b> วิ</span><span>ก้าวพร้อมเป๊ะ <b>${th(n ? Math.round(s.perfect / n * 100) : 0)}%</b></span><span>ล้ม <b>${th(s.falls)}</b> ครั้ง</span><span>ข้ามรั้ว <b>${th(s.jumps)}</b> พันกัน <b>${th(s.tangle)}</b></span>`;
  const last = LS.li >= LLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'สนามถัดไป';
  $('#bNext').hidden = guest || last || !lOpen(LS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'วิ่งสนามนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function lFloat(text, x, y, col, size = 16, life = 1) { LS.floats.push({ text, x, y, col, life, max: life, size }); }
function lSnap(G) { return Object.assign({ st: G.st, fin: G.finished, over: G.over, c: G.cleared }, G.stats); }
function lEvents(ev) {
  const G = LS.G, px = L_PX, py = L_ME.y - 178;
  for (const e of ev) {
    const [k, a, b] = e.split(':');
    if (k === 'step') { sfx.lstep(b); if (b !== 'good') lFloat(LQ_TXT[b], px, py, LQ_COL[b], b === 'perfect' ? 18 : 15, .7); }
    else if (k === 'wrong') { sfx.lwrong(); lFloat(`${S.names[a] || ''} ผิดขา`, a === 'pink' ? px - 40 : px + 40, py, '#ff9a9a', 15); }
    else if (k === 'tangle') { sfx.ltangle(); lFloat('พันกัน! คนละขา', px, py, '#ff9a9a', 17); S.shake = Math.max(S.shake, .3); }
    else if (k === 'rush') lFloat('รีบเกิน สะดุด', px, py - 20, '#ffcf8a', 14);
    else if (k === 'fall') { sfx.lfall(); S.shake = .8; lFloat('ล้ม!', px, py - 10, '#ff8a8a', 24, 1.2); burst(px, 440, 14, '#c9a77a', { speed: 120, up: 60, life: .6, size: 3, g: 300 }); }
    else if (k === 'trip') lFloat('สะดุดรั้ว', px, py - 40, '#ff9a9a', 16, 1.2);
    else if (k === 'jump') { sfx.ljump(); lFloat('ข้ามได้!', px, py - 30, C.gold, 18, .9); }
    else if (k === 'go') sfx.lbeep(true);
    else if (k === 'finish') { sfx.win(); burst(px, 300, 40, C.gold, { speed: 260, up: 120, life: 1.1, size: 4, g: 200 }); }
    else if (k === 'timeup') sfx.lost();
    void G;
  }
}
// the guest: effects from changes in the host's snapshot
function lGuestDiff() {
  const G = LS.G, n = lSnap(G), p = LS.prev || n, ev = [];
  for (const q of ['perfect', 'good', 'loose']) if (n[q] > p[q]) ev.push('step::' + q);
  if (n.wrong > p.wrong) ev.push('wrong:' + (O.local === 'pink' ? 'mint' : 'pink'));
  if (n.tangle > p.tangle) ev.push('tangle');
  if (n.rush > p.rush) ev.push('rush');
  if (n.falls > p.falls) ev.push('fall');
  if (n.jumps > p.jumps) ev.push('jump');
  if (n.fin && !p.fin) ev.push('finish');
  else if (n.over && !p.over) ev.push('timeup');
  if (n.st === 'run' && p.st === 'count') ev.push('go');
  lEvents(ev);
  LS.prev = n;
}
function lTick() {
  const G = LS.G;
  if (O.role === 'guest') { Leg.guestStep(G); }
  else {
    const was = Math.ceil(Leg.START - G.t);
    const ev = Leg.step(G);
    // presses wait for their moment on the race clock
    LS.q.sort((a, b) => a.t - b.t);
    while (LS.q.length && LS.q[0].t <= G.t) { const p = LS.q.shift(); ev.push(...Leg.press(G, p.who, p.leg, p.t)); }
    if (G.st === 'count') { const now = Math.ceil(Leg.START - G.t); if (now !== was && now > 0) sfx.lbeep(false); }
    lEvents(ev);
  }
  if (G.over && !LS.endT) { LS.endT = 2.2; lSave(); }
}
function legFrame(dt, now) {
  const G = LS.G;
  if (S.mode === 'play' && G) {
    LS.acc += dt;
    while (LS.acc >= Leg.DT) { lTick(); LS.acc -= Leg.DT; if (S.mode !== 'play') { LS.acc = 0; break; } }
    LS.simPerf = now - LS.acc * 1000;
    if (O.role === 'guest' && LS.raceAt) G.t = lRaceTime(now);
    if (LS.endT > 0) { LS.endT -= dt; if (LS.endT <= 0) { LS.endT = -1; lResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else { LS.acc = 0; if (G) LS.q = []; }
  if (O.role) pumpOnline(now);
  S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
  for (const k of ['pink', 'mint']) LS.lift[k] = Math.max(0, LS.lift[k] - dt * 5);
  stepParts(dt);
  for (const f of LS.floats) { f.life -= dt; f.y -= dt * 30; }
  LS.floats = LS.floats.filter(f => f.life > 0);
  if (G) lHud();
  renderLeg();
}

/* ---------- drawing ---------- */
const legBg = document.createElement('canvas');
const LSCENE = {
  yard: { sky: ['#9fd6ff', '#d9efff', '#fff3da'], far: '#c9b8a6', stand: '#e8dccb', ground: '#d9b98c', lane: '#e6c99e', line: 'rgba(255,255,255,.75)' },
  grass: { sky: ['#a7c9e0', '#d4e4ee', '#eef3e6'], far: '#8fb59a', stand: '#c4d6c0', ground: '#6fa860', lane: '#7cb86b', line: 'rgba(255,255,255,.7)' },
  track: { sky: ['#8fcaf5', '#cde9ff', '#ffeccf'], far: '#b6a3c9', stand: '#d9cfe6', ground: '#c45b4a', lane: '#d06a56', line: 'rgba(255,255,255,.8)' },
  hill: { sky: ['#ffd29e', '#ffe7c4', '#f6f2d8'], far: '#9cbf86', stand: '#cfe0b8', ground: '#8cb86c', lane: '#9cc77a', line: 'rgba(255,255,255,.65)' },
  final: { sky: ['#5f8ee6', '#a9c8f5', '#ffe0c0'], far: '#8f86c9', stand: '#d6cdf0', ground: '#c45b4a', lane: '#d06a56', line: 'rgba(255,255,255,.85)' }
};
const L_LANES = [{ y: 336, s: .66 }, { y: 378, s: .8 }, { y: 424, s: .95 }], L_ME = { y: 486, s: 1.4 };
const L_PX = 300;                                                     // where the pair stands on screen
function buildLegBg() {
  const G = LS.G; if (!G) return;
  legBg.width = cv.width; legBg.height = cv.height;
  const g = legBg.getContext('2d', { alpha: false }), P = LSCENE[G.def.scene] || LSCENE.yard;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, P.sky[0]); sky.addColorStop(.7, P.sky[1]); sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  // the sun with a soft glow, clouds and far hills
  const sx = 790, sy = 70, sg = g.createRadialGradient(sx, sy, 8, sx, sy, 130);
  sg.addColorStop(0, 'rgba(255,250,220,.95)'); sg.addColorStop(.22, 'rgba(255,238,170,.5)'); sg.addColorStop(1, 'rgba(255,238,170,0)');
  g.fillStyle = sg; g.fillRect(sx - 130, sy - 130, 260, 260);
  g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(sx, sy, 24, 0, Math.PI * 2); g.fill();
  const R = rng(LS.li * 13 + 7);
  for (let i = 0; i < 5; i++) fluffyCloud(g, 50 + i * 190 + R() * 70, 46 + R() * 70, 80 + R() * 70, .82);
  g.fillStyle = hexA(P.far, .4); g.beginPath(); g.moveTo(0, 240);
  for (let x = 0; x <= VW; x += 16) g.lineTo(x, 176 + Math.sin(x * .011 + LS.li) * 16 + Math.sin(x * .029 + 2) * 7);
  g.lineTo(VW, 240); g.closePath(); g.fill();
}
// a strip of scenery that repeats every `per` units, drawn once and slid along with the camera
function lStrip(g, name, key, per, y, h, shift, draw, dy = 0) {
  const c = layer(name, key, per, h, q => { q.translate(0, -y); draw(q); });
  const off = ((shift % per) + per) % per;
  for (let x = -off; x < VW; x += per) blit(g, c, x, y + dy, per, h);
}
// the far town: little school buildings, a flag here and there, round trees
function lFar(g, P, cam) {
  lStrip(g, 'lFar', P.far, 1320, 80, 192, cam * .25 + 120, q => lFarTown(q, P));
}
function lFarTown(g, P) {
  const w = 120;
  for (let i = 0; i < 11; i++) {
    const x = i * w, h = 60 + ((i * 37) % 5) * 14, top = 230 - h, bw = w - 18, kind = (i + 1) % 4;
    if (kind === 3) {
      const cx = x + bw / 2;
      g.fillStyle = hexMix(P.far, -.2); g.fillRect(cx - 3, 196, 6, 44);
      for (const [dx, dy, r] of [[-20, 196, 21], [19, 199, 19], [0, 180, 26]]) { g.fillStyle = hexMix(P.far, -.1); g.beginPath(); g.arc(cx + dx, dy, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(cx - 8, 172, 9, 0, Math.PI * 2); g.arc(cx - 26, 190, 6, 0, Math.PI * 2); g.fill();
      continue;
    }
    g.fillStyle = P.far; rr(g, x, top, bw, h + 40, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + bw - 12, top, 12, h + 40);
    g.fillStyle = hexMix(P.far, -.22);
    if (kind === 1) { g.beginPath(); g.moveTo(x - 6, top + 3); g.lineTo(x + bw / 2, top - 20); g.lineTo(x + bw + 6, top + 3); g.closePath(); g.fill(); }
    else { g.fillRect(x - 4, top - 4, bw + 8, 7); }
    for (let r = 0; r < Math.floor(h / 28); r++) for (let k = 0; k < 3; k++) {
      const wx = x + 11 + k * 28, wy = top + 12 + r * 26;
      g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, wx, wy, 16, 13, 2); g.fill();
      g.fillStyle = hexA(P.far, .6); g.fillRect(wx + 7, wy, 2, 13);
    }
    if (kind === 2) {
      const fx = x + bw / 2;
      g.fillStyle = hexMix(P.far, -.32); g.fillRect(fx - 1, top - 30, 2, 30);
      g.fillStyle = '#e8574f'; g.beginPath(); g.moveTo(fx + 1, top - 30); g.quadraticCurveTo(fx + 9, top - 29, fx + 17, top - 25); g.lineTo(fx + 1, top - 21); g.closePath(); g.fill();
    }
  }
}
// the stands: steps, a crowd of little people (some with flags), bunting across the top
// (each row of people is two cached strips that bounce on their own; arms go up when the crowd cheers)
const L_CROWD = 65;                                                   // people per row before the strip repeats
function lStands(g, P, cam, cheer) {
  g.fillStyle = P.stand; g.fillRect(0, 238, VW, 52);
  for (let row = 0; row < 3; row++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 259 + row * 13, VW, 3); }
  const cs = cam * .55, per = L_CROWD * 18;
  for (let row = 0; row < 3; row++) {
    const ph = row * 1.3, jump = cheer ? Math.abs(Math.sin(S.time * 9 + ph)) * 4 : Math.abs(Math.sin(S.time * 3 + ph)) * 1.5, y = 252 + row * 13 - 18;
    lStrip(g, 'lRow' + row + (cheer ? 'c' : ''), '', per, y, 34, cs, q => { lCrowdRow(q, row, 0, cheer); lCrowdRow(q, row, 1, cheer); }, -jump);
  }
  g.fillStyle = hexMix(P.stand, -.25); g.fillRect(0, 286, VW, 4);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, 286, VW, 1);
  lStrip(g, 'lBunting', '', 1170, 226, 22, cs, lBunting);
}
function lGrass(g) {
  g.fillStyle = '#6aa95a'; g.fillRect(0, 518, 1024, VH - 518); g.fillStyle = '#7fbf68'; g.fillRect(0, 518, 1024, 3);
  for (let k = -1; k < 65; k++) {
    const id = ((k % 64) + 64) % 64, x = k * 16, hh = hash(id, 77), h = 6 + hh % 8;
    g.fillStyle = hh & 1 ? '#5a9a4c' : '#86c870'; g.beginPath(); g.moveTo(x, 520); g.lineTo(x + 3, 520 - h); g.lineTo(x + 5, 520); g.lineTo(x + 8, 520 - h * .7); g.lineTo(x + 10, 520); g.closePath(); g.fill();
    if (hh % 7 === 0) { g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff', '#ffb3b3'][hh >> 4 & 3]; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(x + 5 + Math.cos(a) * 2.6, 512 - h * .3 + Math.sin(a) * 2.6, 2, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x + 5, 512 - h * .3, 1.4, 0, Math.PI * 2); g.fill(); }
  }
}
function lCrowdRow(g, row, half, cheer) {
  const SK = ['#ffd9b8', '#f2c49b', '#d9a477', '#ffe3cc'], SH = ['#ff8fb0', '#7fd9c2', '#ffd36b', '#9fb4ff', '#ffb08a', '#c9a8ff'], HR = ['#3a2a3f', '#5a3b2a', '#2a2340', '#8a5a3a'];
  g.lineCap = 'round';
  for (let i = -1; i <= L_CROWD; i++) {
    const pid = ((i % L_CROWD) + L_CROWD) % L_CROWD; if (pid % 2 !== half) continue;
    const hh = hash(pid + 500, row + 9), x = i * 18 + (row % 2) * 9, y = 252 + row * 13, shirt = SH[hh % 6];
    if (cheer || hh % 5 === 0) { g.strokeStyle = shirt; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 5, y + 5); g.lineTo(x - 8 + (pid % 3 - 1) * 2, y - 4); g.moveTo(x + 5, y + 5); g.lineTo(x + 8 - (pid % 3 - 1) * 2, y - 4); g.stroke(); }
    g.fillStyle = shirt; g.beginPath(); g.ellipse(x, y + 10, 7, 6.5, 0, Math.PI, 0); g.fill();
    g.fillStyle = SK[hh >> 3 & 3]; g.beginPath(); g.arc(x, y, 4.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = HR[hh >> 5 & 3]; g.beginPath(); g.arc(x, y - .8, 4.9, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    g.fillStyle = '#2a1f4a'; g.fillRect(x - 2.2, y + .2, 1.3, 1.6); g.fillRect(x + .9, y + .2, 1.3, 1.6);
    if (hh % 11 === 0) { const fx = x + 7; g.fillStyle = '#5c5472'; g.fillRect(fx, y - 15, 1.5, 18); g.fillStyle = hh & 1 ? C.pink : C.mint; g.beginPath(); g.moveTo(fx + 1.5, y - 15); g.lineTo(fx + 11, y - 12); g.lineTo(fx + 1.5, y - 8); g.closePath(); g.fill(); }
  }
  g.lineCap = 'butt';
}
function lBunting(g) {
  const BC = ['#ff8fb0', '#ffd36b', '#7fd9c2', '#9fb4ff', '#ffb08a'];
  g.strokeStyle = 'rgba(90,80,110,.55)'; g.lineWidth = 1;
  for (let k = 0; k < 13; k++) {
    const x0 = k * 90;
    g.beginPath(); g.moveTo(x0, 230); g.quadraticCurveTo(x0 + 45, 244, x0 + 90, 230); g.stroke();
    for (let q = 1; q < 6; q++) { const u = q / 6, fx = x0 + 90 * u, fy = 230 + 14 * u * (1 - u); g.fillStyle = BC[(k * 2 + q) % 5]; g.beginPath(); g.moveTo(fx - 5, fy); g.lineTo(fx + 5, fy); g.lineTo(fx, fy + 10); g.closePath(); g.fill(); }
  }
}
// how high the ground is at x (hills)
function lHeight(def, x) {
  let h = 0;
  for (const z of def.zones || []) { const d = Math.max(0, Math.min(x, z.to) - z.from); if (z.type === 'up') h += d * .14; else if (z.type === 'down') h -= d * .14; }
  return Math.max(0, h);
}
function lLegs(g, phase, lift, cols, tied) {
  // three legs seen from the front, drawn at the pair's feet (0, 0): left outer, tied middle, right outer
  const top = -16, up = k => Math.max(0, k) * 9;
  const L = [[-13, cols[0], phase.out + lift.pinkOut], [0, tied, phase.in + lift.inn], [13, cols[1], phase.out + lift.mintOut]];
  g.lineCap = 'round'; g.lineWidth = 5;
  for (const [lx, col, k] of L) {
    const fy = -up(k);
    g.strokeStyle = col; g.beginPath(); g.moveTo(lx, top); g.quadraticCurveTo(lx + 4 * Math.min(1, k), (top + fy) / 2, lx, fy); g.stroke();
    g.fillStyle = '#4a3f5a'; g.beginPath(); g.ellipse(lx + 2, fy, 4.5, 2.5, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#e8574f'; g.fillRect(-7, top + 5 - up(phase.in + lift.inn) * .5, 14, 4);   // the cloth tying the middle legs
}
// a body without drawPlayer's own name label (names are placed apart above the pair)
function lBody(g, who, x, y, face, sq) { const nm = S.names; S.names = { pink: '', mint: '' }; g.save(); g.translate(x, y); drawPlayer(g, { id: who, x: -12, y: -28, w: 24, h: 28, face, sq, walk: 0 }, S.time); g.restore(); S.names = nm; }
function lPair(g, x, gy, s, G, rival, t) {
  const down = rival ? false : G.st === 'down';
  const since = rival ? 0 : Math.min(1, (G.t - G.lastStepT) / .16);
  const swing = rival ? Math.sin(t * 11 + rival.time) : 0;
  let ph = { in: 0, out: 0 };
  if (rival) ph = { in: Math.max(0, swing), out: Math.max(0, -swing) };
  else if (G.st === 'run' && G.lastLeg) ph[G.lastLeg] = Math.sin(since * Math.PI);
  const lp = rival ? { pinkOut: 0, mintOut: 0, inn: 0 } : lLifted(G);
  const bob = rival ? Math.abs(swing) * 2 : (ph.in + ph.out) * 2;
  g.save(); g.translate(x, gy); g.scale(s, s);
  if (down) {                                                       // in a heap on the ground, seeing stars
    g.rotate(-.35);
    const f = Math.sin(S.time * 8) * .05;
    g.save(); g.translate(-14, -6); g.rotate(-1.2 + f); lBody(g, 'pink', 0, 0, 1, .3); g.restore();
    g.save(); g.translate(16, -4); g.rotate(1.1 - f); lBody(g, 'mint', 0, 0, -1, .3); g.restore();
    g.rotate(.35);
    for (let i = 0; i < 3; i++) { const a = S.time * 4 + i * 2.1; g.fillStyle = C.gold; g.font = `400 14px ${FONT}`; g.textAlign = 'center'; g.fillText('★', Math.cos(a) * 22, -46 + Math.sin(a) * 6); }
    g.restore();
    return;
  }
  const lean = rival ? 0 : Math.min(.12, (G.owe > 0 ? .08 : 0) + (1 - G.bal) * .1 * Math.sin(S.time * 9));
  g.rotate(lean);
  g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(0, 2, 26, 4, 0, 0, Math.PI * 2); g.fill();
  lLegs(g, ph, lp, rival ? [rival.col, rival.col] : [C.pinkD, C.mintD], rival ? rival.col : '#8a6fb0');
  const by = -15 - bob;
  if (rival) {
    // the two of them with headbands and their team's name, drawn once per team
    const c = layer('lRival' + rival.col + rival.name, '', 80, 50, q => { q.translate(40, 46); lRivalPair(q, rival); });
    g.drawImage(c, -40, by - 46, 80, 50);
  } else {
    lBody(g, 'pink', -12, by, 1, LS.lift.pink * .3);
    lBody(g, 'mint', 12, by, 1, LS.lift.mint * .3);
    g.font = `600 10px ${FONT}`; g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.85)';
    for (const [who, dx, al] of [['pink', -16, 'right'], ['mint', 16, 'left']]) { g.textAlign = al; g.strokeText(S.names[who], dx, by - 34); g.fillStyle = who === 'pink' ? C.pink : C.mint; g.fillText(S.names[who], dx, by - 34); }
  }
  g.restore();
}
function lRivalPair(g, rival) {
  const by = 0;
  for (const dx of [-11, 11]) {
    const gr = g.createLinearGradient(0, by - 26, 0, by); gr.addColorStop(0, hexMix(rival.col, .28)); gr.addColorStop(1, hexMix(rival.col, -.1));
    rr(g, dx - 11, by - 26, 22, 26, 10); g.fillStyle = gr; g.fill(); g.strokeStyle = hexMix(rival.col, -.3); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(dx - 10.4, by - 24, 20.8, 3);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(dx - 6, by - 17, 2, 3.4, -.4, 0, Math.PI * 2); g.fill();
    cuteFace(g, dx + 1.5, by - 15, 1, 1, dx < 0, undefined, .78);
  }
  nameTag(g, rival.name, 0, by - 31, '#fff');
}
// legs already lifted while waiting for the partner (and, online, this phone's own press before the host answers)
function lLifted(G) {
  const r = { pinkOut: 0, mintOut: 0, inn: 0 };
  const add = (who, leg, k) => { if (leg === 'in') r.inn = Math.max(r.inn, k * .6); else r[who + 'Out'] = Math.max(r[who + 'Out'], k); };
  for (const w of ['pink', 'mint']) { const p = G.pend[w][0]; if (p) add(w, p.leg, .7); }
  if (O.role === 'guest' && LS.sent.length && LS.lift[O.local] > 0) add(O.local, LS.sent[LS.sent.length - 1][1], LS.lift[O.local]);
  return r;
}
function lTrackObj(g, def, sxOf, lane, P) {
  const gy = lane.y;
  // ground features on this lane
  for (const z of def.zones || []) {
    const a = sxOf(z.from), b = sxOf(z.to); if (b < -20 || a > VW + 20) continue;
    if (z.type === 'mud') { g.fillStyle = 'rgba(110,75,45,.75)'; g.beginPath(); g.ellipse((a + b) / 2, gy + 2, (b - a) / 2, 9 * lane.s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(80,55,35,.6)'; for (let x = a + 14; x < b - 10; x += 26) { g.beginPath(); g.ellipse(x, gy + 1, 6 * lane.s, 2.5 * lane.s, 0, 0, Math.PI * 2); g.fill(); } }
    else if (z.type === 'wet') { g.fillStyle = 'rgba(110,190,255,.7)'; g.beginPath(); g.ellipse((a + b) / 2, gy + 2, (b - a) / 2, 8 * lane.s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; for (let x = a + 16; x < b - 10; x += 30) g.fillRect(x, gy - 1 + Math.sin(x) * 2, 12 * lane.s, 2); }
  }
  for (const h of def.hurdles || []) {
    const x = sxOf(h); if (x < -30 || x > VW + 30) continue;
    const hh = 22 * lane.s, w = 26 * lane.s;
    g.fillStyle = '#f5f0e6'; g.fillRect(x - w / 2, gy - hh, 3, hh); g.fillRect(x + w / 2 - 3, gy - hh, 3, hh);
    g.fillStyle = '#e8574f'; g.fillRect(x - w / 2 - 2, gy - hh, w + 4, 5 * lane.s); g.fillStyle = '#fff'; g.fillRect(x - w / 4, gy - hh, w / 4, 5 * lane.s);
  }
  void P;
}
function renderLeg() {
  const g = ctx, G = LS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(legBg, 0, 0);
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 8 * S.shake;
  g.setTransform(scale, 0, 0, scale, ox * scale, 0);
  const def = G.def, P = LSCENE[def.scene] || LSCENE.yard, cam = G.x, t = G.t;
  // far scenery and the stands slide slower than the track
  lFar(g, P, cam);
  lStands(g, P, cam, G.finished || G.hurdle >= 0);
  // the track: lanes with lines and a grainy surface, start and finish
  g.fillStyle = P.ground; g.fillRect(0, 290, VW, VH - 290);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 290, VW, 3);
  for (const [i, ln] of [...L_LANES, L_ME].entries()) {
    g.fillStyle = i % 2 ? P.lane : P.ground; g.fillRect(0, ln.y - 24 * ln.s, VW, 34 * ln.s);
    const off = (cam * (.45 + .4 * ln.s)) % 47;
    g.fillStyle = 'rgba(255,255,255,.13)'; for (let x = -off; x < VW; x += 47) { g.fillRect(x, ln.y - 15 * ln.s, 3 * ln.s, 1.5); g.fillRect(x + 23, ln.y + 3 * ln.s, 2 * ln.s, 1.5); }
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 11 - off; x < VW; x += 47) g.fillRect(x, ln.y - 6 * ln.s, 2.5 * ln.s, 1.5);
    g.fillStyle = P.line; g.fillRect(0, ln.y + 10 * ln.s, VW, 2);
  }
  // grass and flowers along the front edge
  lStrip(g, 'lGrass', '', 1024, 500, VH - 500, cam * 1.1, lGrass);
  const sxOf = (x, ln = L_ME) => L_PX + (x - cam) * (.45 + .4 * ln.s);
  for (const ln of [...L_LANES, L_ME]) {
    const sx = x => sxOf(x, ln);
    const fx = sx(def.length), s0 = sx(0);
    if (fx > -20 && fx < VW + 20) { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#fff' : '#2a2340'; g.fillRect(fx - 4, ln.y - 24 * ln.s + k * 34 * ln.s / 6, 8, 34 * ln.s / 6); } }
    if (s0 > -20 && s0 < VW + 20) { g.fillStyle = '#fff'; g.fillRect(s0 - 2, ln.y - 24 * ln.s, 4, 34 * ln.s); }
    lTrackObj(g, def, sx, ln, P);
  }
  // distance markers every 25 m
  for (let m = 25; m * L_PPM < def.length; m += 25) { const x = sxOf(m * L_PPM); if (x < -30 || x > VW + 30) continue; g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillText(`${th(m)} ม.`, x, 300); }
  // finish banner
  const fbx = sxOf(def.length);
  if (fbx > -100 && fbx < VW + 160) {
    for (const [px, ph] of [[fbx - 3, 260], [fbx + 223, 240]]) { const pg = g.createLinearGradient(px, 0, px + 6, 0); pg.addColorStop(0, '#7a7192'); pg.addColorStop(1, '#4a4260'); g.fillStyle = pg; g.fillRect(px, 210, 6, ph); }
    rr(g, fbx - 3, 200, 232, 30, 6); g.fillStyle = '#fff6df'; g.fill();
    g.save(); rr(g, fbx - 3, 200, 232, 30, 6); g.clip(); g.fillStyle = '#2a2340';
    for (let k = 0; k < 29; k++) { g.fillRect(fbx - 3 + k * 8, k % 2 ? 200 : 204, 8, 4); g.fillRect(fbx - 3 + k * 8, k % 2 ? 226 : 222, 8, 4); }
    g.restore();
    g.fillStyle = '#e8574f'; g.font = `400 17px ${FONT_D}`; g.textAlign = 'center'; g.fillText('เส้นชัย', fbx + 113, 220);
    // balloons on both posts
    for (const [bx, cols] of [[fbx, ['#ff8fb0', '#ffd36b', '#7fd9c2']], [fbx + 226, ['#9fb4ff', '#ff8fb0', '#ffd36b']]]) cols.forEach((c, k) => {
      const ax = bx + (k - 1) * 13, ay = 176 - (k % 2) * 10 + Math.sin(S.time * 2 + k + bx * .01) * 3;
      g.strokeStyle = 'rgba(90,80,110,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, 202); g.quadraticCurveTo(ax, 195, ax, ay + 11); g.stroke();
      g.fillStyle = c; g.beginPath(); g.ellipse(ax, ay, 9, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(ax - 3, ay - 4, 2.2, 3.4, -.4, 0, Math.PI * 2); g.fill();
    });
  }
  // rival teams, then us in front
  def.rivals.forEach((r, i) => { const ln = L_LANES[i]; const rx = Leg.rivalX(def, r, G.st === 'count' ? Leg.START : t); const x = sxOf(rx, ln); if (x > -40 && x < VW + 40) lPair(g, x, ln.y - lHeight(def, rx) * ln.s, ln.s, G, r, G.st === 'count' ? 0 : t); });
  const gy = L_ME.y - lHeight(def, G.x);
  if (G.hurdle >= 0 && G.st === 'run') { g.fillStyle = hexA(C.gold, .25 + .2 * Math.sin(S.time * 10)); g.beginPath(); g.ellipse(L_PX + 24, gy + 2, 60, 12, 0, 0, Math.PI * 2); g.fill(); }
  lPair(g, L_PX, gy, L_ME.s, G, null, t);
  drawParts(g);
  for (const f of LS.floats) { g.globalAlpha = Math.min(1, f.life * 2.5); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y); g.globalAlpha = 1; }
  // what to press next, and balance, over the pair
  if (G.st === 'run' && !G.over) {
    const nxt = G.pend.pink.length && !G.pend.mint.length ? G.pend.pink[0].leg : G.pend.mint.length && !G.pend.pink.length ? G.pend.mint[0].leg : G.expect;
    const txt = G.hurdle >= 0 ? 'พร้อมกันเป๊ะ แล้วกระโดด!' : nxt === 'in' ? 'ขาใน' : nxt === 'out' ? 'ขานอก' : 'ใน หรือ นอก';
    g.font = `400 ${G.hurdle >= 0 ? 18 : 20}px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.75)';
    g.strokeText(txt, L_PX, gy - 118); g.fillStyle = G.hurdle >= 0 ? C.gold : C.paper; g.fillText(txt, L_PX, gy - 118);
    const bw = 70, bx = L_PX - bw / 2, by = gy - 108;
    panel(g, bx, by, bw, 6, 3, .55);
    rr(g, bx, by, bw * Math.max(0, G.bal), 6, 3); g.fillStyle = G.bal > .5 ? '#7be08a' : G.bal > .25 ? '#ffc65a' : '#ff6b6b'; g.fill();
  }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  lHudDraw(g, G);
  if (G.st === 'count') { const n = Math.ceil(Leg.START - G.t); g.textAlign = 'center'; g.font = `400 72px ${FONT_D}`; g.lineWidth = 6; g.strokeStyle = 'rgba(21,17,46,.7)'; g.strokeText(th(n), VW / 2, 200); g.fillStyle = C.gold; g.fillText(th(n), VW / 2, 200); const hint = O.role ? 'กดขาเดียวกันพร้อมกับเพื่อน เริ่มที่ขาในหรือขานอกก็ได้' : 'ชมพู D ขาใน A ขานอก · มิ้นต์ ← ขาใน → ขานอก'; g.font = `600 14px ${FONT}`; const hw = g.measureText(hint).width + 30; panel(g, VW / 2 - hw / 2, 214, hw, 28, 14, .8); g.fillStyle = C.paper; g.fillText(hint, VW / 2, 233); }
  else if (G.t - Leg.START < .8) { g.textAlign = 'center'; g.font = `400 64px ${FONT_D}`; g.fillStyle = hexA(C.gold, 1 - (G.t - Leg.START) / .8); g.fillText('ไป!', VW / 2, 200); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
function lHudDraw(g, G) {
  const def = G.def, el = G.st === 'count' ? 0 : G.over ? G.time : G.t - Leg.START;
  panel(g, 10, 10, 168, 60, 12, .78);
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('เวลา', 22, 29);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = C.paper; g.fillText(lFmt(Math.max(0, el)), 22, 60);
  const ahead = def.rivals.filter(r => Leg.rivalX(def, r, G.t) > G.x + 1).length;
  g.textAlign = 'right'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('อันดับ', 166, 29);
  g.font = `400 26px ${FONT_D}`; g.fillStyle = ahead === 0 ? C.gold : C.paper; g.fillText(th(G.finished ? Leg.place(G) : ahead + 1), 166, 60);
  // the whole course with every team on it
  const px = VW / 2 - 170, pw = 340, py = 22;
  panel(g, px - 12, 10, pw + 24, 44, 12, .78);
  rr(g, px, py + 8, pw, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill();
  for (const z of def.zones || []) { g.fillStyle = z.type === 'mud' ? '#8a5a3a' : z.type === 'wet' ? '#7cc8ff' : z.type === 'up' ? '#9cc77a' : '#c7e09a'; g.fillRect(px + pw * z.from / def.length, py + 8, pw * (z.to - z.from) / def.length, 6); }
  for (const h of def.hurdles || []) { g.fillStyle = '#e8574f'; g.fillRect(px + pw * h / def.length - 1, py + 4, 3, 14); }
  def.rivals.forEach(r => { const x = px + pw * Leg.rivalX(def, r, G.t) / def.length; g.fillStyle = r.col; g.beginPath(); g.arc(x, py + 11, 5, 0, Math.PI * 2); g.fill(); });
  const mx = px + pw * G.x / def.length; g.fillStyle = C.pink; g.beginPath(); g.arc(mx - 3, py + 11, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = C.mint; g.beginPath(); g.arc(mx + 3, py + 11, 6, 0, Math.PI * 2); g.fill();
  g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.textAlign = 'left'; g.fillText('เริ่ม', px, py + 30); g.textAlign = 'right'; g.fillText(`เส้นชัย ${th(Math.round(def.length / L_PPM))} ม.`, px + pw, py + 30);
  // the teams to beat
  panel(g, VW - 178, 10, 168, 60, 12, .78);
  g.textAlign = 'left'; g.font = `600 10px ${FONT}`;
  [...def.rivals].sort((a, b) => b.time - a.time).forEach((r, i) => { const y = 26 + i * 15; g.fillStyle = r.col; g.fillRect(VW - 166, y - 7, 8, 8); g.fillStyle = '#e8e0ff'; g.fillText(`${'★'.repeat(i + 1)} ชนะ${r.name} ${th(r.time)} วิ`, VW - 152, y); });
}

/* ---------- touch: two buttons each (outer leg, tied leg) ---------- */
function lPadLabels() {
  document.querySelectorAll('.lpad button').forEach(b => { b.querySelector('i').textContent = b.dataset.k === 'in' ? 'ขาใน' : 'ขานอก'; });
}
const lpad = $('#lpad');
const lbtns = new Map();
lpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault();
  const side = b.closest('.side').dataset.p, who = O.role ? O.local : side;
  b.classList.add('on'); lbtns.set(e.pointerId, b);
  try { b.setPointerCapture(e.pointerId); } catch (err) {}
  lPress(who, b.dataset.k, e.timeStamp);
});
for (const ev of ['pointerup', 'pointercancel']) lpad.addEventListener(ev, e => { const b = lbtns.get(e.pointerId); if (b) { b.classList.remove('on'); lbtns.delete(e.pointerId); } });
lpad.addEventListener('contextmenu', e => e.preventDefault());
function lKey(e) {
  const m = LKEY[e.code]; if (!m) return false;
  e.preventDefault();
  if (e.repeat || S.mode !== 'play') return true;
  if (!O.role) { lPress(m[0], m[1], e.timeStamp); return true; }
  // one player per phone: the left key and the right key, mirrored for whoever stands on the right
  const left = e.code === 'KeyA' || e.code === 'ArrowLeft';
  lPress(O.local, O.local === 'pink' ? (left ? 'out' : 'in') : (left ? 'in' : 'out'), e.timeStamp);
  return true;
}

/* ---------- title list ---------- */
function renderLegLevels() {
  let total = 0;
  $('#llevels').innerHTML = LLEVELS.map((lv, i) => {
    const b = lBest(i), open = lOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ${lFmt(b.m)} วิ` : open ? 'ยังไม่เคยวิ่ง' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-l="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#lStarsAll').textContent = `ดาวรวม ${th(total)}/${th(LLEVELS.length * 3)}`;
  let next = LLEVELS.findIndex((l, i) => lOpen(i) && !(lBest(i) && lBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.l = next;
  if (S.tab === 'leg') $('#bGo').textContent = lBest(next) ? `วิ่ง${COURSE(next)}` : 'เข้าเส้นเริ่ม';
}
$('#llevels').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b && !b.disabled) startLeg(+b.dataset.l); });

/* ---------- online: presses travel with their time on the host's race clock; the host runs the race ---------- */
function onlineStartLeg(i) {
  if (O.role !== 'host') return;
  O.md = 'l'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsL').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b && !b.disabled) onlineStartLeg(+b.dataset.l); });
function renderOnlineLeg() {
  $('#oLevelsL').innerHTML = LLEVELS.map((lv, i) => {
    const b = lBest(i), open = lOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-l="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยวิ่ง' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function lEncode() { return O.role === 'host' ? Leg.encode(LS.G) : { p: LS.sent.slice(-6), rt: Math.round(O.rtt || 0) }; }
function lHostHears(pr) {
  const G = LS.G;
  if (!G || pr.ep !== O.ep || !pr.lw || typeof pr.lw !== 'object') return;
  const rid = O.local === 'pink' ? 'mint' : 'pink', m = pr.lw;
  if (Number.isFinite(m.rt) && m.rt > 0) G.late = Math.min(0.8, m.rt / 1000 + 0.12);
  if (Array.isArray(m.p)) for (const e of m.p) {
    if (!Array.isArray(e) || !((e[0] | 0) > LS.seen)) continue;
    LS.seen = e[0] | 0;
    lEvents(Leg.press(G, rid, e[1], +e[2]));
  }
}
function lGuestHears(pr) {
  const G = LS.G;
  if (!G || !pr.lw) return;
  Leg.apply(G, pr.lw);
  if (Number.isFinite(pr.hn) && Number.isFinite(pr.lw.t)) LS.raceAt = { t: pr.lw.t, hn: pr.hn };
  if (LS.raceAt) G.t = lRaceTime(performance.now());
  lGuestDiff();
  if (G.over && !LS.endT && S.mode === 'play') { LS.endT = 2.2; lSave(); }
}

/* ---------- Long boat (เรือยาวพายคู่) ---------- */
const BS = { G: null, li: 0, acc: 0, floats: [], endT: 0, savedB: null, q: [], sent: [], seen: 0, raceAt: null, camD: 0, prev: null, simPerf: 0, mine: { pink: -9, mint: -9 }, wake: [] };
const RIVER = i => 'สายน้ำที่ ' + th(i + 1);
const BKEY = { KeyW: ['pink', 'fwd'], KeyS: ['pink', 'back'], ArrowUp: ['mint', 'fwd'], ArrowDown: ['mint', 'back'] };
const B_Y = 392;                                                      // where the boat sits on screen
if (!prog.b) prog.b = {};
const bBest = i => prog.b[BLEVELS[i].name] || null;
const bOpen = i => i === 0 || !!(bBest(i - 1) && bBest(i - 1).s >= 1);
Object.assign(sfx, {
  bstroke() { noise(.16, 1300, .045, 'bandpass', 1.2, 450); tone(240, .1, 'sine', .035, 120); },
  bsync() { chime(523, .3, .045); chime(784, .4, .045, .05); },
  bbump() { tone(110, .14, 'sine', .07, 70); noise(.08, 700, .04, 'bandpass', 1.5); },
  bcrack() { noise(.1, 2500, .05, 'highpass', .7); tone(160, .2, 'sawtooth', .05, 60); tone(90, .3, 'square', .035, 50, .05); },
  bsink() { tone(300, .9, 'sine', .06, 60); tone(80, .7, 'sine', .08, 40, .3); for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, .06, 'sine', .02, 1100, .2 + i * .12); noise(.8, 500, .04, 'lowpass', .8, 150); },
  bkrathong() { [1046, 1318, 1568].forEach((f, i) => chime(f, .35, .035, i * .05)); },
  bbeep(hi) { if (hi) { chime(1047, .5, .06); chime(1568, .5, .04, .03); } else chime(660, .2, .05); }
});
function bRaceTime(perf) {
  const G = BS.G;
  if (O.role !== 'guest' || !BS.raceAt) return G.t + (perf - BS.simPerf) / 1000;
  return BS.raceAt.t + (perf + (O.clockOff || 0) - BS.raceAt.hn) / 1000;
}
function bPress(who, kind, perf) {
  const G = BS.G; if (!G || S.mode !== 'play') return;
  audio();
  const t = bRaceTime(perf || performance.now());
  if (t - BS.mine[who] < Boat.STROKE_T || G.st !== 'run' && t < Boat.START) return;
  BS.mine[who] = t;
  if (O.role === 'guest') { BS.sent.push([BS.sent.length ? BS.sent[BS.sent.length - 1][0] + 1 : 1, kind, Math.round(t * 1000) / 1000]); if (BS.sent.length > 8) BS.sent.shift(); BS.myKind = kind; sfx.bstroke(); return; }
  BS.q.push({ who, kind, t });
}

/* ---------- flow ---------- */
function loadBoat(i, net) {
  BS.li = i; BS.G = Boat.load(BLEVELS[i]); BS.G.net = net || null;
  BS.acc = 0; BS.floats = []; BS.endT = 0; BS.savedB = null; BS.q = []; BS.sent = []; BS.seen = 0; BS.raceAt = null; BS.camD = 0; BS.mine = { pink: -9, mint: -9 }; BS.wake = [];
  BS.prev = bSnap(BS.G); BS.simPerf = performance.now();
  setKind('boat');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 0;
  releaseK(); buildBoatBg(); bHud(true); bPadLabels();
}
function startBoat(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadBoat(i); showScreen(null); setMode('play');
}
function boatRestart() { if (O.role) { onlineRestart(); return; } loadBoat(BS.li); showScreen(null); setMode('play'); }
function boatNext() {
  if (O.role === 'host') { if (BS.li < BLEVELS.length - 1) onlineStartBoat(BS.li + 1); return; }
  if (BS.li < BLEVELS.length - 1 && bOpen(BS.li + 1)) startBoat(BS.li + 1); else toTitle();
}
let bHudKey = '';
function bHud(force) {
  const k = String(BS.li); if (!force && k === bHudKey) return; bHudKey = k;
  const lv = BLEVELS[BS.li];
  $('#hNo').textContent = RIVER(BS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
const bFmt = s => th(s.toFixed(1));
function bSave() {
  if (BS.savedB) return BS.savedB;
  const G = BS.G, lv = BLEVELS[BS.li], st = Boat.stars(G);
  const b = prog.b[lv.name] || { s: 0, m: 0 };
  if (G.finished) { const sc = Boat.score(G); prog.b[lv.name] = { s: Math.max(b.s, st), m: b.m ? Math.min(b.m, sc) : sc }; store.set('prog2', prog); }
  return (BS.savedB = b);
}
function bResults() {
  const G = BS.G, lv = BLEVELS[BS.li], st = Boat.stars(G), s = G.stats, sc = Boat.score(G);
  const b = bSave(), best = G.finished && (!b.m || sc < b.m);
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${RIVER(BS.li)} · ${G.finished ? 'ถึงเส้นชัย' : G.sunk ? 'เรือแตก' : 'หมดเวลา'}`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const msg = G.sunk ? 'เรือชนจนแตก ลองพายช้าลงตอนใกล้หินหรือตลิ่ง ชนเบาๆ ไม่เป็นไร'
    : !G.finished ? 'ยังไม่ถึงเส้นชัย ร้องพาย พาย พร้อมกัน เรือจะไปเร็วและตรงขึ้นมาก'
    : st === 3 ? 'พายพร้อมกันเหมือนคนเดียว เรือพุ่งเป็นลูกธนู'
    : st === 2 ? 'อีกนิดเดียว พายพร้อมกันให้มากขึ้นและเก็บกระทงอีกสักใบ'
    : st === 1 ? 'ถึงเส้นชัยแล้ว สายน้ำถัดไปเปิดให้เล่นแล้ว'
    : `ช้ากว่าที่ต้องการ ต้องได้ไม่เกิน ${th(lv.stars[0])} วินาที (หลังหักกระทง)`;
  $('#cMsg').textContent = msg + (best && b.m ? ' · สถิติใหม่' : '');
  const strokes = Math.max(1, s.strokes);
  $('#cStats').innerHTML = `<span>เวลา <b>${G.finished ? bFmt(G.time) : '–'}</b> วิ</span><span>กระทง <b>${th(G.krN)}</b> ใบ (−${th(G.krN * Boat.KR_BONUS)} วิ)</span><span>พายพร้อมกัน <b>${th(Math.round(s.sync * 2 / strokes * 100))}%</b></span><span>ตัวเรือ <b>${th(Math.round(G.hull))}%</b></span>`;
  const last = BS.li >= BLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'สายน้ำถัดไป';
  $('#bNext').hidden = guest || last || !bOpen(BS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'พายสายนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
const bSy = (G, d) => B_Y - (d - BS.camD);
function bFloat(text, x, y, col, size = 16, life = 1) { BS.floats.push({ text, x, y, col, life, max: life, size }); }
function bSnap(G) { return Object.assign({ kr: G.krN, hull: G.hull, fin: G.finished, over: G.over, sunk: G.sunk, lp: G.last.pink.t, lm: G.last.mint.t }, G.stats); }
function bSplash(G, who) {
  const sh = Math.sin(G.h), ch = Math.cos(G.h), side = who === 'pink' ? -1 : 1, along = who === 'pink' ? 18 : -18;
  const x = G.x + sh * along + ch * side * 22, d = G.d + ch * along - sh * side * 22;
  burst(x, bSy(G, d), 7, 'rgba(220,240,255,.9)', { speed: 70, up: 30, life: .4, size: 2.5, g: 120 });
}
function bEvents(ev) {
  const G = BS.G;
  for (const e of ev) {
    const [k, a, b] = e.split(':');
    if (k === 'stroke') { if (!(O.role && a === O.local)) sfx.bstroke(); bSplash(G, a); void b; }
    else if (k === 'sync') { sfx.bsync(); bFloat('พร้อมกัน!', G.x, bSy(G, G.d) - 70, C.gold, 17, .8); BS.wake.push({ x: G.x, d: G.d, life: .8 }); }
    else if (k === 'bump') sfx.bbump();
    else if (k === 'crack') { sfx.bcrack(); S.shake = .6; bFloat('เรือร้าว!', G.x, bSy(G, G.d) - 60, '#ff9a9a', 17, 1); burst(G.x, bSy(G, G.d), 12, '#a8774f', { speed: 120, life: .6, size: 3, g: 0 }); }
    else if (k === 'sink') { sfx.bsink(); S.shake = 1.2; S.flash = .5; }
    else if (k === 'krathong') { sfx.bkrathong(); const kk = G.def.krathong[+a]; bFloat('+กระทง −๑ วิ', kk[0], bSy(G, kk[1]) - 24, '#ffe7a0', 14, 1.1); burst(kk[0], bSy(G, kk[1]), 14, C.gold, { speed: 90, life: .6, size: 2.5, g: -30 }); }
    else if (k === 'go') sfx.bbeep(true);
    else if (k === 'finish') { sfx.win(); burst(G.x, bSy(G, G.d), 40, C.gold, { speed: 240, life: 1.1, size: 4, g: 60 }); }
    else if (k === 'timeup') sfx.lost();
  }
}
function bGuestDiff() {
  const G = BS.G, n = bSnap(G), p = BS.prev || n, ev = [];
  if (n.lp > p.lp && O.local !== 'pink') ev.push('stroke:pink');
  if (n.lm > p.lm && O.local !== 'mint') ev.push('stroke:mint');
  if (n.sync > p.sync) ev.push('sync');
  if (n.hard > p.hard) ev.push('crack'); else if (n.hits > p.hits) ev.push('bump');
  if (n.kr > p.kr) G.kr.forEach((v, i) => { if (v && !(BS.krSeen || [])[i]) ev.push('krathong:' + i); });
  BS.krSeen = G.kr.slice();
  if (n.sunk && !p.sunk) ev.push('sink');
  if (n.fin && !p.fin) ev.push('finish'); else if (n.over && !p.over && !n.sunk) ev.push('timeup');
  bEvents(ev);
  BS.prev = n;
}
function bTick() {
  const G = BS.G;
  if (O.role === 'guest') { Boat.guestStep(G); }
  else {
    const was = Math.ceil(Boat.START - G.t);
    const ev = Boat.step(G);
    BS.q.sort((a, b) => a.t - b.t);
    while (BS.q.length && BS.q[0].t <= G.t) { const p = BS.q.shift(); ev.push(...Boat.press(G, p.who, p.kind, p.t)); }
    if (G.st === 'count') { const now = Math.ceil(Boat.START - G.t); if (now !== was && now > 0) sfx.bbeep(false); }
    bEvents(ev);
  }
  if (G.over && !BS.endT) { BS.endT = 2.2; bSave(); }
}
function boatFrame(dt, now) {
  const G = BS.G;
  if (S.mode === 'play' && G) {
    BS.acc += dt;
    while (BS.acc >= Boat.DT) { bTick(); BS.acc -= Boat.DT; if (S.mode !== 'play') { BS.acc = 0; break; } }
    BS.simPerf = now - BS.acc * 1000;
    if (O.role === 'guest' && BS.raceAt) G.t = bRaceTime(now);
    if (BS.endT > 0) { BS.endT -= dt; if (BS.endT <= 0) { BS.endT = -1; bResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else { BS.acc = 0; if (G) BS.q = []; }
  if (O.role) pumpOnline(now);
  if (G) BS.camD += (G.d - BS.camD) * Math.min(1, dt * 5);
  S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
  for (const w of BS.wake) w.life -= dt; BS.wake = BS.wake.filter(w => w.life > 0);
  stepParts(dt);
  for (const f of BS.floats) { f.life -= dt; f.y -= dt * 30; }
  BS.floats = BS.floats.filter(f => f.life > 0);
  if (G) bHud();
  renderBoat();
}

/* ---------- drawing ---------- */
const boatBg = document.createElement('canvas');
const BSCENE = {
  canal: { land: '#8cc46d', land2: '#79b05c', water: ['#4aa3c9', '#3b8db5'], foam: 'rgba(255,255,255,.55)', deco: 'house' },
  market: { land: '#d9b27c', land2: '#c79d66', water: ['#5aa8a0', '#468f88'], foam: 'rgba(255,255,255,.5)', deco: 'stall' },
  rapids: { land: '#8e8a7a', land2: '#7a7666', water: ['#3f8fc4', '#2f78ad'], foam: 'rgba(255,255,255,.7)', deco: 'rock' },
  race: { land: '#9cc77a', land2: '#86b366', water: ['#4c9fd0', '#3a88bb'], foam: 'rgba(255,255,255,.55)', deco: 'crowd' },
  night: { land: '#2c3a33', land2: '#24302a', water: ['#1f3557', '#182a47'], foam: 'rgba(200,220,255,.35)', deco: 'lantern' }
};
function buildBoatBg() { const G = BS.G; if (!G) return; boatBg.width = cv.width; boatBg.height = cv.height; const g = boatBg.getContext('2d', { alpha: false }); g.setTransform(scale, 0, 0, scale, 0, 0); g.fillStyle = (BSCENE[G.def.scene] || BSCENE.canal).land; g.fillRect(0, 0, VW, VH); }
function bBoatShape(g, x, y, h, col, trim, scaleK = 1) {
  g.save(); g.translate(x, y); g.rotate(h); g.scale(scaleK, scaleK);
  const L = Boat.LEN / 2, W = Boat.BEAM / 2;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(3, 4, W + 2, L + 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -L - 8); g.quadraticCurveTo(W + 3, -L + 14, W, 0); g.lineTo(W - 2, L - 6); g.quadraticCurveTo(0, L + 6, -W + 2, L - 6); g.lineTo(-W, 0); g.quadraticCurveTo(-W - 3, -L + 14, 0, -L - 8); g.fill();
  g.strokeStyle = trim; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = 'rgba(255,240,210,.3)'; g.fillRect(-W + 5, -L + 10, 2 * W - 10, 2 * L - 20);
  g.strokeStyle = 'rgba(90,50,20,.25)'; g.lineWidth = 1; for (let k = -L + 16; k < L - 10; k += 9) { g.beginPath(); g.moveTo(-W + 5, k); g.lineTo(W - 5, k); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-W * .45, -L * .3, 2, L * .45, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(0, -L - 4, 3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e8574f'; g.lineWidth = 2; g.beginPath(); g.moveTo(-3, -L - 2); g.lineTo(-7, -L + 6); g.moveTo(3, -L - 2); g.lineTo(7, -L + 6); g.stroke();
  g.restore();
}
function bKrathong(g, G, k, i) {
  if (G.kr[i]) return; const y = bSy(G, k[1]); if (y < -30 || y > VH + 30) return;
  const bob = Math.sin(S.time * 2 + i) * 1.5;
  g.fillStyle = 'rgba(255,210,120,.28)'; g.beginPath(); g.arc(k[0], y + bob, 20, 0, Math.PI * 2); g.fill();
  for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2; g.fillStyle = p % 2 ? '#7ccf7a' : '#5fb35d'; g.beginPath(); g.ellipse(k[0] + Math.cos(a) * 8, y + bob + Math.sin(a) * 8, 6, 3.5, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffd1e0'; g.beginPath(); g.arc(k[0], y + bob, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff3c4'; g.fillRect(k[0] - 1, y + bob - 9, 2, 6); g.fillStyle = '#ffb347'; g.beginPath(); g.arc(k[0], y + bob - 11, 2.5 + Math.sin(S.time * 12 + i) * .6, 0, Math.PI * 2); g.fill();
}
// what stands on the bank at (x, y): a stilt house, a stall, a rock, a lantern, people cheering; a bush beside it
function bDeco(g, P, night, x, y, s, k, d) {
  if (P.deco === 'house') {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 20, y + 14, 46, 8);
    g.fillStyle = '#6b4329'; for (const sx of [-18, -4, 10, 22]) g.fillRect(x + sx - 1.5, y + 8, 3, 12);
    g.fillStyle = '#d8a06a'; g.fillRect(x - 22, y - 16, 44, 26); g.strokeStyle = 'rgba(110,70,40,.4)'; g.lineWidth = 1; for (let i = -18; i < 22; i += 6) { g.beginPath(); g.moveTo(x + i, y - 16); g.lineTo(x + i, y + 10); g.stroke(); }
    g.fillStyle = '#ffe9a8'; g.fillRect(x - 12, y - 9, 9, 9); g.fillRect(x + 4, y - 9, 9, 9); g.fillStyle = '#6b4329'; g.fillRect(x - 8, y - 9, 1, 9); g.fillRect(x + 8, y - 9, 1, 9);
    g.fillStyle = '#b4523e'; g.beginPath(); g.moveTo(x - 30, y - 14); g.lineTo(x, y - 36); g.lineTo(x + 30, y - 14); g.closePath(); g.fill();
    g.fillStyle = '#8f3d2e'; g.beginPath(); g.moveTo(x, y - 36); g.lineTo(x + 30, y - 14); g.lineTo(x, y - 14); g.closePath(); g.fill();
    g.strokeStyle = '#ffcf5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30, y - 14); g.lineTo(x, y - 36); g.lineTo(x + 30, y - 14); g.stroke();
  }
  else if (P.deco === 'stall') {
    const c = ['#ff8fb0', '#ffd36b', '#7fd9c2'][Math.floor(k * 3)];
    g.fillStyle = '#8a5a3a'; g.fillRect(x - 22, y - 8, 44, 20); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 22, y - 8, 44, 2);
    g.fillStyle = '#ffb347'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - 14 + i * 9, y, 4, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#7fd06a'; g.beginPath(); g.arc(x - 9, y + 6, 4, 0, Math.PI * 2); g.arc(x + 9, y + 6, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(x - 28, y - 10); g.quadraticCurveTo(x, y - 34, x + 28, y - 10); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + i * 11 - 3, y - 10); g.lineTo(x + i * 11 + 3, y - 10); g.closePath(); g.fill(); }
  }
  else if (P.deco === 'rock') { g.fillStyle = '#5d5a50'; g.beginPath(); g.ellipse(x + 2, y + 3, 27, 18, k, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7d7a6e'; g.beginPath(); g.ellipse(x, y, 26, 17, k, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(x - 8, y - 6, 9, 5, k, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(110,160,90,.6)'; g.beginPath(); g.ellipse(x + 10, y + 6, 8, 4, k, 0, Math.PI * 2); g.fill(); }
  else if (P.deco === 'crowd') {
    for (let i = 0; i < 6; i++) { const cx = x - 25 + i * 10, cy = y + Math.sin(S.time * 6 + i + d) * 2, c = ['#ff8fb0', '#7fd9c2', '#ffd36b', '#9fb4ff'][(i + Math.floor(k * 4)) % 4]; g.fillStyle = c; g.beginPath(); g.arc(cx, cy + 6, 6, Math.PI, 0); g.fill(); g.fillStyle = '#f2d2b0'; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill(); }
    const fx = x + 6, fy = y - 18 + Math.sin(S.time * 7 + d) * 2; g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx, fy + 16); g.lineTo(fx, fy); g.stroke(); g.fillStyle = ['#e8574f', '#5aa8e0', '#ffcf5a'][Math.floor(k * 3)]; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + 8, fy + 2 + Math.sin(S.time * 9 + d) * 2, fx + 14, fy + 1); g.lineTo(fx + 14, fy + 8); g.quadraticCurveTo(fx + 8, fy + 9, fx, fy + 7); g.fill();
  }
  else if (P.deco === 'lantern') { g.fillStyle = 'rgba(255,190,90,.25)'; g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#4a3a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x, y - 8); g.stroke(); g.fillStyle = '#ff8a5a'; g.beginPath(); g.ellipse(x, y, 6, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(x, y, 3, 6, 0, 0, Math.PI * 2); g.fill(); }
  if (P.deco !== 'crowd' && P.deco !== 'stall') {
    const tx = x + s * 46, ty = y + 20;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(tx + 4, ty + 6, 15, 7, 0, 0, Math.PI * 2); g.fill();
    for (const [dx, dy, rad, cc] of [[0, 0, 15, night ? '#1d2b24' : '#4f8a42'], [-6, -4, 9, night ? '#24352c' : '#5f9a4f'], [5, -6, 7, night ? '#2b3e33' : '#74b060']]) { g.fillStyle = cc; g.beginPath(); g.arc(tx + dx, ty + dy, rad, 0, Math.PI * 2); g.fill(); }
  }
}
// a palm on the bank, its foot at (0, 24)
function bPalm(g, night, k) {
  const x = 0, y = 0;
  g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x + 8, y + 26, 18, 6, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = night ? '#3a3020' : '#8a6a42'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 24); g.quadraticCurveTo(x + 8, y + 4, x + 2, y - 16); g.stroke(); g.lineCap = 'butt';
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + k; g.fillStyle = night ? (i % 2 ? '#1f3a2a' : '#284a35') : (i % 2 ? '#4f9a4a' : '#62b25a'); g.beginPath(); g.ellipse(x + 2 + Math.cos(a) * 14, y - 16 + Math.sin(a) * 9, 15, 4.5, a, 0, Math.PI * 2); g.fill(); }
  if (!night && k > .6) { g.fillStyle = '#d9b84a'; g.beginPath(); g.arc(x + 5, y - 12, 2.5, 0, Math.PI * 2); g.arc(x, y - 11, 2.5, 0, Math.PI * 2); g.fill(); }
}
function renderBoat() {
  const g = ctx, G = BS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(boatBg, 0, 0);
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 8 * S.shake;
  g.setTransform(scale, 0, 0, scale, ox * scale, 0);
  const def = G.def, P = BSCENE[def.scene] || BSCENE.canal, night = def.scene === 'night', t = G.t;
  const dTop = BS.camD + B_Y + 40, dBot = BS.camD - (VH - B_Y) - 40, step = 16;
  // land stripes for a sense of speed, then the water between the banks
  for (let d = Math.floor(dBot / 60) * 60; d < dTop; d += 60) {
    const y0 = bSy(G, d + 60), h0 = hash(d / 60 | 0, 7); g.fillStyle = (d / 60) % 2 ? P.land : P.land2; g.fillRect(0, y0, VW, 60);
    g.fillStyle = night ? 'rgba(120,180,140,.12)' : 'rgba(255,255,255,.16)';
    for (let k = 0; k < 8; k++) { const x = (h0 >> (k % 8)) * (k + 3) % VW, y = y0 + (k * 37 + (h0 % 50)) % 58; g.fillRect(x, y, 1.6, 4); }
    if (!night && P.deco !== 'stall' && h0 % 2) { const x = (h0 * 7) % VW, y = y0 + (h0 >> 3) % 56; g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff'][h0 % 3]; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffcf5a'; g.fillRect(x - 1, y - 1, 2, 2); }
  }
  const left = [], right = [];
  for (let d = dBot; d <= dTop; d += step) { const [l, r] = Boat.banks(def, d); left.push([l, bSy(G, d)]); right.push([r, bSy(G, d)]); }
  const wg = g.createLinearGradient(0, 0, VW, 0); wg.addColorStop(0, P.water[1]); wg.addColorStop(.5, P.water[0]); wg.addColorStop(1, P.water[1]);
  // a sandy (or muddy) edge first, then the water a little inside it
  g.strokeStyle = night ? '#3a3a32' : P.deco === 'rock' ? '#a8a290' : '#e8d29a'; g.lineWidth = 16; g.lineJoin = 'round';
  g.beginPath(); left.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.beginPath(); right.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.fillStyle = wg; g.beginPath(); g.moveTo(left[0][0], left[0][1]); for (const p of left) g.lineTo(p[0], p[1]); for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]); g.closePath(); g.fill();
  g.strokeStyle = night ? 'rgba(120,160,220,.18)' : 'rgba(170,230,240,.35)'; g.lineWidth = 16;
  g.beginPath(); left.forEach((p, i) => (i ? g.lineTo(p[0] + 9, p[1]) : g.moveTo(p[0] + 9, p[1]))); g.stroke();
  g.beginPath(); right.forEach((p, i) => (i ? g.lineTo(p[0] - 9, p[1]) : g.moveTo(p[0] - 9, p[1]))); g.stroke();
  // glints of light on the water
  for (let k = 0; k < 26; k++) { const d = dBot + ((k * 211 + t * 20) % (dTop - dBot)), [l, r] = Boat.banks(def, d), x = l + 20 + ((k * 0.618) % 1) * (r - l - 40), y = bSy(G, d), a = .25 + .25 * Math.sin(S.time * 3 + k); g.fillStyle = night ? `rgba(200,220,255,${a * .5})` : `rgba(255,255,255,${a})`; g.fillRect(x - 5, y, 10, 1.6); g.fillRect(x - 2, y - 2, 4, 1.4); }
  g.strokeStyle = night ? 'rgba(160,190,255,.25)' : 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  g.beginPath(); left.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.beginPath(); right.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  // ripples drift down with the current
  const flow = (def.current || 0) * t;
  g.strokeStyle = P.foam; g.lineWidth = 1.5;
  for (let d = Math.floor((dBot + flow) / 70) * 70; d < dTop + flow; d += 70) {
    const dd = d - flow, [l, r] = Boat.banks(def, dd), k = Math.abs(Math.sin(d * 12.9898)) ;
    for (let j = 0; j < 3; j++) { const x = l + 30 + ((k * 997 + j * 0.37) % 1) * (r - l - 60), y = bSy(G, dd); g.beginPath(); g.moveTo(x - 10, y); g.quadraticCurveTo(x, y - 3, x + 10, y); g.stroke(); }
  }
  // lily pads and lotus along the banks, and now and then a little duck family
  for (let d = Math.floor(dBot / 90) * 90; d < dTop; d += 90) {
    const hh = hash(d / 90 | 0, 23); if (hh % 3 === 0) continue;
    const [l, r] = Boat.banks(def, d), side = hh & 1, x = side ? r - 22 - hh % 10 : l + 22 + hh % 10, y = bSy(G, d);
    if (hh % 11 === 1 && !night) {
      for (let k = 0; k < 3; k++) { const dx = x + (side ? -1 : 1) * k * 16, dy = y + k * 10 + Math.sin(S.time * 3 + k) * 1.5, s = k ? .7 : 1;
        g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(dx, dy + 4 * s, 8 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = k ? '#ffe27a' : '#fff6e0'; g.beginPath(); g.ellipse(dx, dy, 8 * s, 5.5 * s, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(dx, dy - 6 * s, 4 * s, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff9a3c'; g.beginPath(); g.moveTo(dx - 1.5 * s, dy - 9 * s); g.lineTo(dx, dy - 12.5 * s); g.lineTo(dx + 1.5 * s, dy - 9 * s); g.fill();
        g.fillStyle = C.ink; g.beginPath(); g.arc(dx - 1.6 * s, dy - 7 * s, .8, 0, Math.PI * 2); g.arc(dx + 1.6 * s, dy - 7 * s, .8, 0, Math.PI * 2); g.fill(); }
      continue;
    }
    for (let k = 0; k < 2 + hh % 2; k++) { const px = x + ((hh >> (k * 3)) % 20 - 10), py = y + k * 14 - 8, rad = 7 + (hh >> (k + 2)) % 4;
      g.fillStyle = night ? '#24503a' : '#4fae5a'; g.beginPath(); g.moveTo(px, py); g.arc(px, py, rad, .3 + k, Math.PI * 1.85 + k); g.closePath(); g.fill();
      g.fillStyle = night ? 'rgba(160,220,180,.15)' : 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(px - 2, py - 2, rad * .4, 0, Math.PI * 2); g.fill(); }
    if (hh % 4 === 1) { const fx = x + 4, fy = y - 2; g.fillStyle = night ? '#ffc8e0' : '#ff9ac0'; for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2; g.beginPath(); g.ellipse(fx + Math.cos(a) * 3.5, fy + Math.sin(a) * 3.5, 3.6, 2, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(fx, fy, 2, 0, Math.PI * 2); g.fill(); }
  }
  // rapids, whirlpools
  for (const z of def.zones || []) {
    if (z.type === 'rapid') {
      if (z.to < dBot || z.from > dTop) continue;
      g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 2;
      for (let d = z.from; d < z.to; d += 26) { const [l, r] = Boat.banks(def, d), y = bSy(G, d - ((t * 60) % 26)); for (let x = l + 20; x < r - 20; x += 44) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sign(z.side || 1) * 14, y + 8); g.stroke(); } }
      const y0 = bSy(G, (z.from + z.to) / 2); if (y0 > 0 && y0 < VH) { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `600 13px ${FONT}`; g.textAlign = 'center'; g.fillText(z.side > 0 ? 'น้ำเชี่ยว →' : '← น้ำเชี่ยว', (Boat.banks(def, z.from)[0] + Boat.banks(def, z.from)[1]) / 2, bSy(G, z.from) + 4); }
    } else if (z.type === 'whirl') {
      const y = bSy(G, z.d); if (y < -150 || y > VH + 150) continue;
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
      for (let k = 0; k < 4; k++) { g.beginPath(); for (let a = 0; a < 5; a += .2) { const rr2 = z.r * (1 - a / 5), ang = a * 2 * Math.sign(z.spin) + t * 2 * Math.sign(z.spin) + k * Math.PI / 2; const px = z.x + Math.cos(ang) * rr2, py = y - Math.sin(ang) * rr2; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
    }
  }
  // a boardwalk along the water at the market; palms and banana trees further back everywhere
  if (P.deco === 'stall') for (const side of [-1, 1]) {
    g.fillStyle = '#9a6a42'; g.beginPath();
    const pts = side < 0 ? left : right;
    pts.forEach((p, i) => (i ? g.lineTo(p[0] + side * 30, p[1]) : g.moveTo(p[0] + side * 30, p[1]))); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + side * 8, pts[i][1]); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,35,18,.45)'; g.lineWidth = 1.2; for (let d = Math.floor(dBot / 14) * 14; d < dTop; d += 14) { const [l, r] = Boat.banks(def, d), y = bSy(G, d), e = side < 0 ? l : r; g.beginPath(); g.moveTo(e + side * 8, y); g.lineTo(e + side * 30, y); g.stroke(); }
  }
  for (let d = Math.floor(dBot / 120) * 120 + 60; d < dTop; d += 120) {
    const [l, r] = Boat.banks(def, d), y = bSy(G, d), k = Math.abs(Math.sin(d * 3.71));
    for (const x of [l - 150 - k * 70, r + 150 + k * 70]) {
      if (x < -30 || x > VW + 30) continue;
      const kq = Math.min(3, Math.floor(k * 4));
      stamp(g, 'bPalm' + (night ? 'n' : '') + kq, '', x - 32, y - 36, 70, 72, q => { q.translate(32, 36); bPalm(q, night, (kq + .5) / 4); });
    }
  }
  // bank decorations
  const R = rng(BS.li * 53 + 9);
  for (let d = Math.floor(dBot / 140) * 140; d < dTop; d += 140) {
    const [l, r] = Boat.banks(def, d), y = bSy(G, d), k = Math.abs(Math.sin(d * 7.13));
    for (const [x, s] of [[l - 50 - k * 40, -1], [r + 50 + k * 40, 1]]) {
      if (P.deco === 'crowd') bDeco(g, P, night, x, y, s, k, d);
      else { const kq = Math.min(3, Math.floor(k * 4)); stamp(g, 'bDeco' + P.deco + (night ? 'n' : '') + s + kq, '', x - 68, y - 42, 136, 80, q => { q.translate(68, 42); bDeco(q, P, night, 0, 0, s, (kq + .5) / 4, 0); }); }
      // reeds and lily pads along the water's edge
      const ex = s < 0 ? l - 4 : r + 4;
      if (!night && k > .3) { g.strokeStyle = '#4f8a42'; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const rx = ex + s * (i * 3 - 4), ry = y + 30 + i * 4; g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx - s * 2, ry - 10, rx + s * 1, ry - 18 - i * 2); g.stroke(); } g.fillStyle = '#8a5a3a'; g.beginPath(); g.ellipse(ex + s * 2, y + 14, 1.8, 4, 0, 0, Math.PI * 2); g.fill(); }
      if (k < .45) { const lx = (s < 0 ? l + 18 : r - 18), ly = y - 30; g.fillStyle = night ? '#2a4a3a' : '#5fae55'; g.beginPath(); g.arc(lx, ly, 7, .4, Math.PI * 2 - .2); g.lineTo(lx, ly); g.fill(); if (!night && k < .2) { g.fillStyle = '#ffd1e8'; g.beginPath(); g.arc(lx + 3, ly - 2, 2.6, 0, Math.PI * 2); g.fill(); } }
    }
    void R;
  }
  // start and finish lines across the river
  for (const [d, txt] of [[0, 'เริ่ม'], [def.length, 'เส้นชัย']]) {
    const y = bSy(G, d); if (y < -40 || y > VH + 40) continue;
    const [l, r] = Boat.banks(def, d);
    for (let x = l, k = 0; x < r; x += 16, k++) { g.fillStyle = k % 2 ? '#fff' : '#2a2340'; g.fillRect(x, y - 4, 16, 8); }
    if (d > 0) { rr(g, (l + r) / 2 - 60, y - 44, 120, 28, 8); g.fillStyle = '#fff6df'; g.fill(); g.fillStyle = '#e8574f'; g.font = `400 18px ${FONT_D}`; g.textAlign = 'center'; g.fillText(txt, (l + r) / 2, y - 24); }
  }
  // krathong, rocks, crossing boats and logs
  (def.krathong || []).forEach((k, i) => bKrathong(g, G, k, i));
  for (const q of def.rocks || []) {
    const y = bSy(G, q[1]); if (y < -40 || y > VH + 40) continue;
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(q[0], y, q[2] + 4 + Math.sin(S.time * 4 + q[0]) * 1.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#7d7a70'; g.beginPath(); g.arc(q[0], y, q[2], 0, Math.PI * 2); g.fill(); g.fillStyle = '#9a978c'; g.beginPath(); g.arc(q[0] - q[2] * .3, y - q[2] * .3, q[2] * .5, 0, Math.PI * 2); g.fill();
  }
  for (const m of Boat.movers(def, t)) {
    const y = bSy(G, m.d); if (y < -40 || y > VH + 40) continue;
    if (m.kind === 'cross') {
      g.save(); g.translate(m.x, y); g.rotate(Math.PI / 2 * (m.dir || 1));
      g.fillStyle = '#8a5a3a'; g.beginPath(); g.ellipse(0, 0, 11, m.r + 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffb347'; g.beginPath(); g.arc(-2, -8, 4, 0, Math.PI * 2); g.arc(3, 6, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fd06a'; g.beginPath(); g.arc(3, -2, 4, 0, Math.PI * 2); g.fill();
      g.restore();
      g.fillStyle = '#f2d9a6'; g.beginPath(); g.arc(m.x, y, 7, 0, Math.PI * 2); g.fill();
    } else { g.fillStyle = '#7a5134'; rr(g, m.x - m.r - 14, y - m.r * .55, 2 * m.r + 28, m.r * 1.1, m.r * .55); g.fill(); g.strokeStyle = '#5e3c26'; g.lineWidth = 2; g.stroke(); }
  }
  // rival boats on race day
  (def.rivals || []).forEach((r, i) => {
    const d = Boat.rivalD(def, r, G.st === 'count' ? Boat.START : t), y = bSy(G, d); if (y < -80 || y > VH + 80) return;
    const [l, rr2] = Boat.banks(def, d), x = l + (rr2 - l) * [.18, .82, .3][i];
    bBoatShape(g, x, y, 0, r.col, '#3a2a20', .85);
    g.fillStyle = '#fff'; g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillText(r.name, x, y + 52);
  });
  // our boat, its paddlers and paddles
  for (const w of BS.wake) { const y = bSy(G, w.d); g.strokeStyle = hexA(C.gold, w.life); g.lineWidth = 3; g.beginPath(); g.ellipse(w.x, y + 30, 30 * (1.6 - w.life), 10, 0, 0, Math.PI * 2); g.stroke(); }
  const by = bSy(G, G.d);
  bBoatShape(g, G.x, by, G.h, '#b9773e', G.t - G.hitT < .3 ? '#ff6b6b' : '#6b3d1f');
  const sh = Math.sin(G.h), ch = Math.cos(G.h);
  for (const [who, along, side] of [['pink', 16, -1], ['mint', -18, 1]]) {
    const px = G.x + sh * along, py = by - ch * along;
    const last = O.role && who === O.local ? Math.max(G.last[who].t, BS.mine[who]) : G.last[who].t;
    const kind = O.role && who === O.local && BS.mine[who] > G.last[who].t ? BS.myKind : G.last[who].kind;
    const ph = Math.min(1, Math.max(0, (G.t - last) / Boat.STROKE_T));
    const sweep = kind === 'back' ? (ph - .5) : (.5 - ph);
    // paddle: blade sweeps along the side of the boat during a stroke
    const bx = px + ch * side * 24 + sh * sweep * 30, byy = py + sh * side * 24 - ch * sweep * 30;
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + ch * side * 6, py + sh * side * 6); g.lineTo(bx, byy); g.stroke();
    g.fillStyle = who === 'pink' ? C.pinkD : C.mintD; g.beginPath(); g.ellipse(bx, byy, 4, 8, G.h, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(px, py + 6); g.scale(.82, .82); const nm = S.names; S.names = { pink: '', mint: '' }; drawPlayer(g, { id: who, x: -12, y: -28, w: 24, h: 28, face: who === 'pink' ? -1 : 1, sq: ph < .3 ? .3 : 0, walk: 0 }, S.time); S.names = nm; g.restore();
  }
  drawParts(g);
  if (night) {                                                       // the dark, with light around the boat, the krathong and the lanterns
    g.save(); g.fillStyle = 'rgba(8,10,30,.55)'; g.beginPath(); g.rect(0, 0, VW, VH);
    g.arc(G.x, by, 150, 0, Math.PI * 2, true); g.fill('evenodd');
    g.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, a) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(255,190,100,${a})`); q.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    (def.krathong || []).forEach((k, i) => { if (!G.kr[i]) { const y = bSy(G, k[1]); if (y > -50 && y < VH + 50) glow(k[0], y, 46, .35); } });
    for (let d = Math.floor(dBot / 140) * 140; d < dTop; d += 140) { const [l, r] = Boat.banks(def, d), y = bSy(G, d), k = Math.abs(Math.sin(d * 7.13)); glow(l - 50 - k * 40, y, 40, .3); glow(r + 50 + k * 40, y, 40, .3); }
    g.restore();
    (def.krathong || []).forEach((k, i) => bKrathong(g, G, k, i));
  }
  for (const f of BS.floats) { g.globalAlpha = Math.min(1, f.life * 2.5); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y); g.globalAlpha = 1; }
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * .4})`; g.fillRect(0, 0, VW, VH); }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  bHudDraw(g, G);
  if (G.st === 'count') { const n = Math.ceil(Boat.START - G.t); g.textAlign = 'center'; g.font = `400 72px ${FONT_D}`; g.lineWidth = 6; g.strokeStyle = 'rgba(21,17,46,.7)'; g.strokeText(th(n), VW / 2, 220); g.fillStyle = C.gold; g.fillText(th(n), VW / 2, 220); const hint = O.role ? 'พายพร้อมกันเรือไปตรง พายข้างเดียวเรือเลี้ยว' : 'ชมพู W พาย S ทวน (ซ้าย) · มิ้นต์ ↑ พาย ↓ ทวน (ขวา)'; g.font = `600 14px ${FONT}`; const hw = g.measureText(hint).width + 30; panel(g, VW / 2 - hw / 2, 236, hw, 28, 14, .8); g.fillStyle = C.paper; g.fillText(hint, VW / 2, 255); }
  else if (G.t - Boat.START < .8) { g.textAlign = 'center'; g.font = `400 64px ${FONT_D}`; g.fillStyle = hexA(C.gold, 1 - (G.t - Boat.START) / .8); g.fillText('พาย!', VW / 2, 220); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
function bHudDraw(g, G) {
  const def = G.def, el = G.st === 'count' ? 0 : G.over ? G.time : G.t - Boat.START;
  panel(g, 10, 10, 168, 64, 12, .78);
  g.textAlign = 'left'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('เวลา', 22, 29);
  g.font = `400 24px ${FONT_D}`; g.fillStyle = C.paper; g.fillText(bFmt(Math.max(0, el)), 22, 58);
  g.textAlign = 'right'; g.font = `400 12px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('กระทง', 166, 29);
  g.font = `400 20px ${FONT_D}`; g.fillStyle = '#ffe7a0'; g.fillText(`${th(G.krN)}/${th((def.krathong || []).length)}`, 166, 56);
  // hull
  g.textAlign = 'left'; g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('ตัวเรือ', 22, 70 - 2);
  rr(g, 62, 62, 104, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); rr(g, 62, 62, 104 * G.hull / Boat.HULL, 6, 3); g.fillStyle = G.hull > 50 ? '#7be08a' : G.hull > 25 ? '#ffc65a' : '#ff6b6b'; g.fill();
  // progress along the river
  const px = VW / 2 - 170, pw = 340, py = 22;
  panel(g, px - 12, 10, pw + 24, 44, 12, .78);
  rr(g, px, py + 8, pw, 6, 3); g.fillStyle = 'rgba(120,190,255,.35)'; g.fill();
  (def.rivals || []).forEach(r => { const x = px + pw * Boat.rivalD(def, r, G.t) / def.length; g.fillStyle = r.col; g.beginPath(); g.arc(x, py + 11, 5, 0, Math.PI * 2); g.fill(); });
  const mx = px + pw * Math.max(0, Math.min(1, G.d / def.length)); g.fillStyle = '#b9773e'; g.beginPath(); g.ellipse(mx, py + 11, 9, 5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = C.pink; g.beginPath(); g.arc(mx + 3, py + 11, 2.5, 0, Math.PI * 2); g.fill(); g.fillStyle = C.mint; g.beginPath(); g.arc(mx - 3, py + 11, 2.5, 0, Math.PI * 2); g.fill();
  g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.textAlign = 'left'; g.fillText('เริ่ม', px, py + 30); g.textAlign = 'right'; g.fillText('เส้นชัย', px + pw, py + 30);
  // star times
  panel(g, VW - 178, 10, 168, 64, 12, .78);
  g.textAlign = 'left'; g.font = `600 10px ${FONT}`;
  def.stars.forEach((s, i) => { const y = 28 + i * 15; g.fillStyle = C.gold; g.fillText('★'.repeat(i + 1), VW - 166, y); g.fillStyle = '#e8e0ff'; g.fillText(`ไม่เกิน ${th(s)} วิ`, VW - 120, y); });
  g.fillStyle = '#c9bfef'; g.fillText('เวลาหักกระทงใบละ ๑ วิ', VW - 166, 72);
}

/* ---------- touch: paddle and back-paddle on each side ---------- */
function bPadLabels() { document.querySelectorAll('.bpad button').forEach(b => { b.querySelector('i').textContent = b.dataset.k === 'fwd' ? 'พาย' : 'ทวน'; }); }
const bpad = $('#bpad');
const bbtns = new Map();
bpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault();
  const who = O.role ? O.local : b.closest('.side').dataset.p;
  b.classList.add('on'); bbtns.set(e.pointerId, b);
  try { b.setPointerCapture(e.pointerId); } catch (err) {}
  bPress(who, b.dataset.k, e.timeStamp);
});
for (const ev of ['pointerup', 'pointercancel']) bpad.addEventListener(ev, e => { const b = bbtns.get(e.pointerId); if (b) { b.classList.remove('on'); bbtns.delete(e.pointerId); } });
bpad.addEventListener('contextmenu', e => e.preventDefault());
function bKey(e) {
  const m = BKEY[e.code]; if (!m) return false;
  e.preventDefault();
  if (e.repeat || S.mode !== 'play') return true;
  bPress(O.role ? O.local : m[0], m[1], e.timeStamp);
  return true;
}

/* ---------- title list ---------- */
function renderBoatLevels() {
  let total = 0;
  $('#blevels').innerHTML = BLEVELS.map((lv, i) => {
    const b = bBest(i), open = bOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ${bFmt(b.m)} วิ` : open ? 'ยังไม่เคยพาย' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-b="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#bStarsAll').textContent = `ดาวรวม ${th(total)}/${th(BLEVELS.length * 3)}`;
  let next = BLEVELS.findIndex((l, i) => bOpen(i) && !(bBest(i) && bBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.b = next;
  if (S.tab === 'boat') $('#bGo').textContent = bBest(next) ? `พาย${RIVER(next)}` : 'ลงเรือ';
}
$('#blevels').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b && !b.disabled) startBoat(+b.dataset.b); });

/* ---------- online: strokes travel with their time on the host's clock; the host moves the boat ---------- */
function onlineStartBoat(i) {
  if (O.role !== 'host') return;
  O.md = 'b'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsB').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b && !b.disabled) onlineStartBoat(+b.dataset.b); });
function renderOnlineBoat() {
  $('#oLevelsB').innerHTML = BLEVELS.map((lv, i) => {
    const b = bBest(i), open = bOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-b="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยพาย' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function bEncode() { return O.role === 'host' ? Boat.encode(BS.G) : { p: BS.sent.slice(-6) }; }
function bHostHears(pr) {
  const G = BS.G;
  if (!G || pr.ep !== O.ep || !pr.bw || typeof pr.bw !== 'object') return;
  const rid = O.local === 'pink' ? 'mint' : 'pink';
  if (Array.isArray(pr.bw.p)) for (const e of pr.bw.p) {
    if (!Array.isArray(e) || !((e[0] | 0) > BS.seen)) continue;
    BS.seen = e[0] | 0;
    bEvents(Boat.press(G, rid, e[1], +e[2]));
  }
}
function bGuestHears(pr) {
  const G = BS.G;
  if (!G || !pr.bw) return;
  // take the host's boat, run it forward by however old the snapshot is, then ease the drawn boat toward that
  const keep = { x: G.x, d: G.d, h: G.h }, was = G.st;
  Boat.apply(G, pr.bw, false);
  if (Number.isFinite(pr.hn) && Number.isFinite(pr.bw.t)) BS.raceAt = { t: pr.bw.t, hn: pr.hn };
  if (BS.raceAt) {
    const now = bRaceTime(performance.now()), lag = Math.max(0, Math.min(0.5, now - G.t));
    for (let i = 0; i < Math.round(lag / Boat.DT); i++) Boat.guestStep(G);
    G.t = now;
  }
  if (was === 'run' && G.st === 'run' && Math.hypot(G.x - keep.x, G.d - keep.d) < 60) {
    G.x = keep.x + (G.x - keep.x) * .4; G.d = keep.d + (G.d - keep.d) * .4; G.h = Boat.wrap(keep.h + Boat.wrap(G.h - keep.h) * .4);
  }
  bGuestDiff();
  if (G.over && !BS.endT && S.mode === 'play') { BS.endT = 2.2; bSave(); }
}

/* ---------- Moving house (ย้ายบ้านแบกของ) ---------- */
const VS = { G: null, li: 0, acc: 0, floats: [], endT: 0, savedB: null, prev: null, lastInp: {}, act: { n: 0 }, remote: { mx: 0, my: 0, act: false, seen: -1 }, rain: [] };
const HOUSE = i => 'บ้านหลังที่ ' + th(i + 1);
const V_OY = 8;                                                       // the 20x11 house sits this far down the canvas
const ZONE_NAME = { L: 'ห้องนั่งเล่น', B: 'ห้องนอน', A: 'ห้องครัว', C: 'ห้องทำงาน', G: 'สวน', Z: 'ห้อง' };
if (!prog.v) prog.v = {};
const vBest = i => prog.v[VLEVELS[i].name] || null;
const vOpen = i => i === 0 || !!(vBest(i - 1) && vBest(i - 1).s >= 1);
const vZoneName = (def, z) => (def.zoneNames && def.zoneNames[z]) || ZONE_NAME[z] || z;
Object.assign(sfx, {
  vgrab() { tone(330, .08, 'triangle', .04, 260); noise(.05, 1200, .02, 'bandpass', 2); },
  vlift() { tone(220, .14, 'triangle', .06, 330); tone(330, .1, 'triangle', .04, 440, .06); },
  vdown() { tone(150, .1, 'sine', .06, 90); noise(.08, 500, .04, 'lowpass', .8); },
  vbump() { tone(120, .14, 'sine', .08, 60); noise(.1, 600, .05, 'lowpass', .8); },
  vdeliver() { [660, 880, 1320].forEach((f, i) => chime(f, .35, .05, i * .06)); },
  vbroken() { noise(.3, 2500, .05, 'bandpass', .8, 600); tone(140, .3, 'square', .04, 60, .05); [2600, 3300, 2900].forEach((f, i) => tone(f, .09, 'sine', .015, 0, .05 + i * .06)); },
  vnope() { tone(200, .08, 'sine', .03, 160); }
});

/* ---------- flow ---------- */
function loadMov(i, net) {
  VS.li = i; VS.G = Mov.load(VLEVELS[i]); VS.G.net = net || null;
  VS.acc = 0; VS.floats = []; VS.endT = 0; VS.savedB = null; VS.prev = vSnap(VS.G); VS.lastInp = {}; VS.act = { n: VS.act.n }; VS.remote = { mx: 0, my: 0, act: false, seen: -1 };
  VS.rain = Array.from({ length: 70 }, () => [Math.random() * VW, Math.random() * VH, 0.6 + Math.random() * 0.6]);
  setKind('mov');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); setPadLabels('kit'); document.querySelectorAll('.kpad .kb.act').forEach(b => { b.innerHTML = 'ยก<br>วาง'; });
  buildMovBg(); vHud(true);
}
function startMov(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadMov(i); showScreen(null); setMode('play');
}
function movRestart() { if (O.role) { onlineRestart(); return; } loadMov(VS.li); showScreen(null); setMode('play'); }
function movNext() {
  if (O.role === 'host') { if (VS.li < VLEVELS.length - 1) onlineStartMov(VS.li + 1); return; }
  if (VS.li < VLEVELS.length - 1 && vOpen(VS.li + 1)) startMov(VS.li + 1); else toTitle();
}
let vHudKey = '';
function vHud(force) {
  const k = String(VS.li); if (!force && k === vHudKey) return; vHudKey = k;
  const lv = VLEVELS[VS.li];
  $('#hNo').textContent = HOUSE(VS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function vSave() {
  if (VS.savedB) return VS.savedB;
  const G = VS.G, lv = VLEVELS[VS.li], st = Mov.stars(G);
  const b = prog.v[lv.name] || { s: 0, m: 0 };
  prog.v[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, G.money) };
  store.set('prog2', prog);
  return (VS.savedB = b);
}
function vResults() {
  const G = VS.G, lv = VLEVELS[VS.li], st = Mov.stars(G), s = G.stats;
  const b = vSave(), best = G.money > b.m;
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${HOUSE(VS.li)} · ${G.done ? 'ย้ายเสร็จแล้ว' : 'หมดเวลา'}`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const dents = G.items.reduce((a, it) => a + it.dmg, 0) / Math.max(1, G.items.length);
  const msg = st === 3 ? (dents < 5 ? 'ย้ายครบ ไม่บุบ แถมเสร็จเร็ว เจ้าของบ้านให้ทิปเพียบ' : `ย้ายครบแถมเสร็จเร็ว ได้ทิปเพียบ ถึงของจะ${lv.rain ? 'เปียก' : 'บุบ'}ไปบ้าง`)
    : st === 2 ? (G.done ? 'ย้ายครบแล้ว รอบหน้าลองเร็วขึ้นอีกนิด จะได้ทิปเพิ่ม' : 'เกือบครบแล้ว แบ่งกันถือกล่องตอนที่อีกคนว่าง จะทันเวลา')
    : st === 1 ? (dents > 15 ? 'ของบุบเยอะไปหน่อย เลี้ยวช้าๆ อย่าดันชนกำแพง' : 'ผ่านแล้ว บ้านหลังถัดไปเปิดให้เล่นแล้ว')
    : `ยังไม่ถึงดาวแรก ต้องได้ ฿${th(lv.stars[0])} เฟอร์นิเจอร์ใหญ่ต้องช่วยกันยกคนละปลาย`;
  $('#cMsg').textContent = msg + (best && b.m ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>ได้เงิน <b>฿${th(G.money)}</b></span><span>ย้ายแล้ว <b>${th(s.delivered)}/${th(G.items.length)}</b> ชิ้น</span><span>ทิปเสร็จเร็ว <b>฿${th(G.tip)}</b></span><span>ชน <b>${th(s.bumps)}</b> ครั้ง พัง <b>${th(s.broken)}</b></span>`;
  const last = VS.li >= VLEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'บ้านหลังถัดไป';
  $('#bNext').hidden = guest || last || !vOpen(VS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'ย้ายบ้านนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function vFloat(text, x, y, col, size = 15, life = 1.2) { VS.floats.push({ text, x, y, col, life, max: life, size }); }
function vSnap(G) { return { st: G.items.map(it => it.st), dmg: G.items.map(it => Math.floor(it.dmg)), bumps: G.stats.bumps, done: G.done, over: G.over, money: G.money }; }
function vEvents(ev) {
  const G = VS.G;
  for (const e of ev) {
    const [k, a, b] = e.split(':');
    const it = G.items[+(b != null ? b : a)];
    if (k === 'grab') sfx.vgrab();
    else if (k === 'lift') sfx.vlift();
    else if (k === 'pick') sfx.vgrab();
    else if (k === 'down' || k === 'drop') sfx.vdown();
    else if (k === 'nothing') { if (!O.role || a === O.local) sfx.vnope(); }
    else if (k === 'bump' && it) { sfx.vbump(); S.shake = Math.max(S.shake, .25); vFloat('ปัง!', it.x, it.y - 20 + V_OY, '#ffb38a', 15, .7); }
    else if (k === 'broken' && it) { sfx.vbroken(); vFloat(`${Mov.KINDS[it.k].name}พัง!`, it.x, it.y - 30 + V_OY, '#ff8a8a', 18, 1.4); }
    else if (k === 'wet' && it) vFloat('เปียก!', it.x, it.y - 18 + V_OY, '#9fd6ff', 13, .9);
    else if (k === 'deliver' && it) { sfx.vdeliver(); vFloat(`+฿${th(Mov.worth(it))}`, it.x, it.y - 24 + V_OY, C.gold, 20, 1.3); burst(it.x, it.y + V_OY, 16, C.gold, { speed: 140, life: .6, size: 3, g: 100 }); }
    else if (k === 'alldone') { sfx.win(); vFloat(`ย้ายครบ! ทิป ฿${th(G.tip)}`, VW / 2, 200, C.gold, 26, 2.4); }
    else if (k === 'timeup') sfx.lost();
  }
}
// the guest: effects from the host's snapshot
function vGuestDiff() {
  const G = VS.G, n = vSnap(G), p = VS.prev || n, ev = [];
  G.items.forEach((it, i) => {
    if (n.st[i] !== p.st[i]) { if (n.st[i] === 'placed') ev.push('deliver:' + i); else if (n.st[i] === 'carried') ev.push('lift::' + i); else if (n.st[i] === 'held' || n.st[i] === 'wait') ev.push('grab::' + i); else if (n.st[i] === 'floor') ev.push('down:' + i); }
    if (n.dmg[i] > p.dmg[i]) { if (n.dmg[i] >= 100) ev.push('broken:' + i); else if (G.def.rain && it.st === 'floor') { if (Math.floor(n.dmg[i] / 10) > Math.floor(p.dmg[i] / 10)) ev.push('wet:' + i); } else ev.push('bump:' + i); }
  });
  if (n.done && !p.done) ev.push('alldone');
  else if (n.over && !p.over) ev.push('timeup');
  vEvents(ev);
  VS.prev = n;
}
function vTick() {
  const G = VS.G;
  if (!O.role) { vEvents(Mov.step(G, { pink: kInput('pink'), mint: kInput('mint') })); }
  else if (O.role === 'host') {
    const li = kInput(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    VS.lastInp = li;
    const ev = Mov.step(G, { [O.local]: li, [rid]: { mx: VS.remote.mx, my: VS.remote.my, act: VS.remote.act } });
    VS.remote.act = false;
    vEvents(ev);
  } else {
    // the guest walks its own player here (and says where it is); while both carry something, the host moves it
    const li = kInput(O.local);
    VS.lastInp = li;
    if (li.act) VS.act.n++;
    Mov.guestStep(G, O.local, li.mx, li.my);
  }
  if (G.over && !VS.endT) { VS.endT = G.done ? 2.6 : 1.8; vSave(); }
}
function movFrame(dt, now) {
  const G = VS.G;
  if (S.mode === 'play' && G) {
    VS.acc += dt;
    while (VS.acc >= Mov.DT) { vTick(); VS.acc -= Mov.DT; if (S.mode !== 'play') { VS.acc = 0; break; } }
    if (VS.endT > 0) { VS.endT -= dt; if (VS.endT <= 0) { VS.endT = -1; vResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else VS.acc = 0;
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const f of VS.floats) { f.life -= dt; f.y -= dt * 24; }
  VS.floats = VS.floats.filter(f => f.life > 0);
  for (const r of VS.rain) { r[1] += dt * 520 * r[2]; r[0] -= dt * 90 * r[2]; if (r[1] > VH) { r[1] = -10; r[0] = Math.random() * (VW + 100); } }
  if (G) vHud();
  renderMov();
}

/* ---------- drawing ---------- */
const movBg = document.createElement('canvas');
const VSCENE = {
  flat: { floor: ['#ecd2aa', '#e3c599'], wall: '#c58fa7', wallTop: '#f6dbe6', grass: '#9fd27c', grass2: '#8bc46b', rug: '#ff9fbd' },
  house: { floor: ['#efd6ae', '#e6ca9f'], wall: '#8f9bd0', wallTop: '#e2e7fb', grass: '#a2d47f', grass2: '#8fc66e', rug: '#7fc8f0' },
  town: { floor: ['#e2cdb8', '#d9c1aa'], wall: '#cf8f74', wallTop: '#fbe0cf', grass: '#a8c487', grass2: '#97b577', rug: '#ffb36b' },
  rain: { floor: ['#ddc8aa', '#d3bb9c'], wall: '#8890b0', wallTop: '#dbe0ee', grass: '#6c9d63', grass2: '#5e8d56', rug: '#9fa8ff' },
  garden: { floor: ['#efd8b2', '#e6cba2'], wall: '#b7987a', wallTop: '#f4e8d4', grass: '#a6d97f', grass2: '#94ca6d', rug: '#8fd6a0' }
};
function buildMovBg() {
  const G = VS.G; if (!G) return;
  movBg.width = cv.width; movBg.height = cv.height;
  const g = movBg.getContext('2d', { alpha: false }), def = G.def, P = VSCENE[def.scene] || VSCENE.flat, T = Mov.T, R = rng(VS.li * 61 + 3);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.fillStyle = '#2b2440'; g.fillRect(0, 0, VW, VH);
  g.translate(0, V_OY);
  g.fillStyle = P.grass; g.fillRect(0, 0, Mov.W * T, Mov.H * T);
  const grassAt = (x, y) => { const c = (def.map[y] || '')[x]; return c === ',' || c === 'w'; };
  for (let y = 0; y < Mov.H; y++) for (let x = 0; x < Mov.W; x++) {
    if (!grassAt(x, y)) continue;
    const px = x * T, py = y * T;
    for (let k = 0; k < 2; k++) { const bx = px + 6 + R() * (T - 12), by = py + 6 + R() * (T - 12); g.fillStyle = hexA(P.grass2, .5); g.beginPath(); g.ellipse(bx, by, 7 + R() * 8, 4 + R() * 5, R() * 3, 0, Math.PI * 2); g.fill(); }
  }
  for (let y = 0; y < Mov.H; y++) for (let x = 0; x < Mov.W; x++) {
    if (!grassAt(x, y)) continue;
    const c = def.map[y][x], px = x * T, py = y * T;
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const gx = px + 4 + R() * 40, gy = py + 6 + R() * 38; g.beginPath(); g.moveTo(gx, gy); g.quadraticCurveTo(gx - 1, gy - 3, gx - 2.5, gy - 5); g.moveTo(gx + 2, gy); g.quadraticCurveTo(gx + 2.5, gy - 3, gx + 4, gy - 4.5); g.stroke(); }
    if (c === ',' && R() < .22) { const fx = px + 8 + R() * 32, fy = py + 8 + R() * 32; g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff', '#ffb3b3', '#d9c2ff'][Math.floor(R() * 5)]; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.9, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.4, 0, Math.PI * 2); g.fill(); }
    if (c === 'w') { const wt = (dx, dy) => (def.map[y + dy] || '')[x + dx] === 'w', l = wt(-1, 0) ? 0 : 4, r = wt(1, 0) ? 0 : 4, t = wt(0, -1) ? 0 : 4, b = wt(0, 1) ? 0 : 4; g.fillStyle = '#3f8fc4'; g.fillRect(px + l, py + t, T - l - r, T - t - b); const e = v => (v ? v + 3 : 0); g.fillStyle = '#5aaee0'; g.fillRect(px + e(l), py + e(t), T - e(l) - e(r), T - e(t) - e(b)); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px + 10, py + 16, 18, 2); g.fillRect(px + 20, py + 30, 14, 2); }
  }
  for (let y = 0; y < Mov.H; y++) for (let x = 0; x < Mov.W; x++) {
    const c = def.map[y][x], px = x * T, py = y * T;
    if (c === '.') {
      // floorboards: four planks a tile, joints staggered, a little grain
      for (let k = 0; k < 4; k++) {
        const pyk = py + k * T / 4, sh = (hash(x, y * 4 + k) % 7) * .012;
        g.fillStyle = P.floor[(x + y + k) % 2]; g.fillRect(px, pyk, T, T / 4);
        g.fillStyle = `rgba(255,255,255,${.06 + sh})`; g.fillRect(px, pyk, T, 1.4);
        g.fillStyle = 'rgba(110,70,35,.22)'; g.fillRect(px, pyk + T / 4 - 1, T, 1);
        const jx = px + ((x * 13 + k * 17 + y * 5) % 3) * T / 3; if ((x + k) % 2) g.fillRect(jx, pyk, 1, T / 4 - 1);
        g.strokeStyle = 'rgba(120,80,40,.1)'; g.lineWidth = .8; g.beginPath(); g.moveTo(px + 3, pyk + 5); g.quadraticCurveTo(px + T / 2, pyk + 3 + (k % 2) * 4, px + T - 3, pyk + 6); g.stroke();
      }
    }
    else if (c === ',' || c === 'w') continue;
    else if (c === '=') {
      const eq = (dx, dy) => (def.map[y + dy] || '')[x + dx] === '=';
      g.fillStyle = '#b9c0cc'; g.fillRect(px, py, T, T);
      for (let k = 4; k < T; k += 8) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px + k, py, 2, T); g.fillStyle = 'rgba(70,80,100,.22)'; g.fillRect(px + k + 2, py, 1.5, T); }
      g.fillStyle = '#e5574f';
      if (!eq(-1, 0)) g.fillRect(px, py, 5, T); if (!eq(1, 0)) g.fillRect(px + T - 5, py, 5, T); if (!eq(0, 1)) g.fillRect(px, py + T - 5, T, 5); if (!eq(0, -1)) g.fillRect(px, py, T, 3);
      g.fillStyle = 'rgba(255,255,255,.3)'; if (!eq(-1, 0)) g.fillRect(px, py, 2, T); if (!eq(0, 1)) g.fillRect(px, py + T - 5, T, 1.5);
    }
    else if (c === 'T') {
      const tg = g.createLinearGradient(0, py, 0, py + T); tg.addColorStop(0, '#f2685f'); tg.addColorStop(1, '#c7413a');
      g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, px + 2, py + 8, T, T - 4, 6); g.fill();
      g.fillStyle = tg; rr(g, px, py + 4, T, T - 4, 6); g.fill();
      g.fillStyle = '#9fd6ff'; rr(g, px + 6, py + 10, T - 12, 14, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px + 9, py + 12, 10, 2.5);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(px + 3, py + 6, T - 6, 2);
    }
    else if (c === 'f') { g.fillStyle = '#b7895a'; g.fillRect(px, py, T, T); g.fillStyle = '#d9b07a'; g.fillRect(px + 3, py + 3, T - 6, T - 6); g.fillStyle = '#8a6440'; g.fillRect(px + T / 2 - 1, py + 6, 2, T - 12); }
    else if (c === '#') {
      const at = (dx, dy) => (def.map[y + dy] || '')[x + dx], wallAt = (dx, dy) => at(dx, dy) === '#' || at(dx, dy) === undefined;
      const face = !wallAt(0, 1), fh = face ? 16 : 0;
      // the top of the wall: a soft pastel cap with a white rim on its open sides
      g.fillStyle = P.wallTop; g.fillRect(px - .5, py - .5, T + 1, T - fh + 1);
      g.fillStyle = 'rgba(0,0,0,.05)'; for (let k = 6; k < T - fh; k += 9) g.fillRect(px, py + k, T, 1);
      g.fillStyle = 'rgba(255,255,255,.6)'; if (!wallAt(0, -1)) g.fillRect(px, py, T, 2.5); if (!wallAt(-1, 0)) g.fillRect(px, py, 2.5, T - fh); if (!wallAt(1, 0)) g.fillRect(px + T - 2.5, py, 2.5, T - fh);
      g.fillStyle = hexA(P.wall, .35); if (!wallAt(-1, 0)) g.fillRect(px + 2.5, py, 1.5, T - fh); if (!wallAt(1, 0)) g.fillRect(px + T - 4, py, 1.5, T - fh);
      if (face) {
        const fg = g.createLinearGradient(0, py + T - fh, 0, py + T); fg.addColorStop(0, P.wall); fg.addColorStop(1, hexA(P.wall, .85)); g.fillStyle = fg; g.fillRect(px, py + T - fh, T, fh);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py + T - fh, T, 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px, py + T - 3, T, 3);
        // a window on outside walls, now and then
        if ((x + y) % 3 === 1 && (y === 0 || x === 0 || at(0, -1) === ',' )) { g.fillStyle = '#fff6e8'; rr(g, px + 12, py + T - fh + 2, T - 24, fh - 6, 2); g.fill(); g.fillStyle = '#9fd6ff'; rr(g, px + 14, py + T - fh + 4, T - 28, fh - 10, 1.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(px + 16, py + T - fh + 5, 4, 2); }
      }
    }
  }
  // a rug in the middle of each room, and soft shadows where walls meet the floor
  for (const [z, r] of Object.entries(def.zones)) {
    const w = (r[2] - r[0] + 1) * T, h = (r[3] - r[1] + 1) * T; if (w < 3 * T || h < 3 * T) continue;
    const cx = (r[0] + r[2] + 1) / 2 * T, cy = (r[1] + r[3] + 1) / 2 * T, rw = Math.min(w - T * 2, 170), rh = Math.min(h - T * 2, 104), col = [P.rug, '#ffb36b', '#c9a0ff', '#8fd6a0'][z.length % 4];
    if (rw < 60 || rh < 40) continue;
    // warm light in the room
    const lg = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * .7); lg.addColorStop(0, 'rgba(255,240,200,.28)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = lg; g.fillRect(r[0] * T, r[1] * T, w, h);
    g.fillStyle = hexA(col, .4); rr(g, cx - rw / 2, cy - rh / 2, rw, rh, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, cx - rw / 2 + 6, cy - rh / 2 + 6, rw - 12, rh - 12, 9); g.fill();
    g.fillStyle = hexA(col, .3); rr(g, cx - rw / 2 + 10, cy - rh / 2 + 10, rw - 20, rh - 20, 7); g.fill();
    g.fillStyle = hexA(col, .55); for (let hx = cx - rw / 2 + 22; hx < cx + rw / 2 - 14; hx += 26) { heartPath(g, hx, cy - rh / 2 + 18, 3.6); g.fill(); heartPath(g, hx + 13, cy + rh / 2 - 16, 3.6); g.fill(); }
    g.strokeStyle = hexA(col, .45); g.lineWidth = 1.5; for (let k = 0; k < rw; k += 6) { g.beginPath(); g.moveTo(cx - rw / 2 + k, cy - rh / 2); g.lineTo(cx - rw / 2 + k, cy - rh / 2 - 4); g.moveTo(cx - rw / 2 + k, cy + rh / 2); g.lineTo(cx - rw / 2 + k, cy + rh / 2 + 4); g.stroke(); }
  }
  for (let y = 1; y < Mov.H; y++) for (let x = 0; x < Mov.W; x++) {
    if (def.map[y][x] !== '.') continue;
    if (def.map[y - 1][x] === '#') { const sg = g.createLinearGradient(0, y * T, 0, y * T + 12); sg.addColorStop(0, 'rgba(50,30,20,.3)'); sg.addColorStop(1, 'rgba(50,30,20,0)'); g.fillStyle = sg; g.fillRect(x * T, y * T, T, 12); }
    if (def.map[y][x - 1] === '#') { const sg = g.createLinearGradient(x * T, 0, x * T + 8, 0); sg.addColorStop(0, 'rgba(50,30,20,.2)'); sg.addColorStop(1, 'rgba(50,30,20,0)'); g.fillStyle = sg; g.fillRect(x * T, y * T, 8, T); }
  }
  // room names, faintly on the floor
  for (const [z, r] of Object.entries(def.zones)) {
    g.fillStyle = 'rgba(90,60,40,.22)'; g.font = `400 18px ${FONT_D}`; g.textAlign = 'center';
    g.fillText(vZoneName(def, z), (r[0] + r[2] + 1) / 2 * T, (r[3] + 1) * T - 14);
  }
  g.translate(0, -V_OY);
}
// a piece of furniture (or a small thing) seen from above, centred at (0, 0) along +x
function vShape(g, k, L, W, dmg, wet) {
  const hl = L / 2, hw = W / 2;
  g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, -hl + 3, -hw + 4, L, W, 6); g.fill();
  if (k === 'sofa') { g.fillStyle = '#4fae9a'; rr(g, -hl, -hw, L, W, 8); g.fill(); g.fillStyle = '#3d8f7d'; rr(g, -hl, -hw, L, 11, 6); g.fill(); rr(g, -hl, -hw, 11, W, 6); g.fill(); rr(g, hl - 11, -hw, 11, W, 6); g.fill(); g.fillStyle = '#6cc7b2'; for (const s of [-1, 1]) { rr(g, s > 0 ? 2 : -hl + 12, -hw + 12, hl - 14, W - 16, 5); g.fill(); } g.fillStyle = 'rgba(255,255,255,.22)'; for (const s of [-1, 1]) { rr(g, s > 0 ? 5 : -hl + 15, -hw + 14, hl - 22, 4, 2); g.fill(); } g.fillStyle = '#ffcf5a'; rr(g, -hl + 13, -hw + 13, 12, 10, 3); g.fill(); }
  else if (k === 'bed') { g.fillStyle = '#e2d8ee'; rr(g, -hl, -hw, L, W, 6); g.fill(); g.fillStyle = '#f2ecf7'; rr(g, -hl + 2, -hw + 2, L - 4, W - 4, 5); g.fill(); g.fillStyle = '#ff9fbd'; rr(g, -hl + L * .35, -hw, L * .65, W, 5); g.fill(); g.strokeStyle = 'rgba(200,80,120,.3)'; g.lineWidth = 1.5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-hl + L * .35 + i * L * .16, -hw + 3); g.lineTo(-hl + L * .35 + i * L * .16, hw - 3); g.stroke(); } g.fillStyle = '#fff'; rr(g, -hl + 6, -hw + 6, 22, W - 12, 6); g.fill(); g.fillStyle = 'rgba(200,190,220,.6)'; g.fillRect(-hl + 16, -hw + 9, 2, W - 18); }
  else if (k === 'table') { const tg = g.createLinearGradient(0, -hw, 0, hw); tg.addColorStop(0, '#c08a52'); tg.addColorStop(1, '#9a663a'); g.fillStyle = tg; rr(g, -hl, -hw, L, W, 5); g.fill(); g.strokeStyle = 'rgba(90,55,28,.3)'; g.lineWidth = 1; for (let i = -hw + 6; i < hw - 2; i += 7) { g.beginPath(); g.moveTo(-hl + 4, i); g.quadraticCurveTo(0, i + 2, hl - 4, i); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-hl + 6, -hw + 4, L - 12, 3); g.fillStyle = '#f2f0e8'; g.beginPath(); g.arc(hl * .4, 0, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fd36a'; g.beginPath(); g.arc(hl * .4, -1, 3, 0, Math.PI * 2); g.fill(); }
  else if (k === 'wardrobe') { g.fillStyle = '#8a5a3a'; g.fillRect(-hl, -hw, L, W); g.fillStyle = '#a8724a'; g.fillRect(-hl + 3, -hw + 3, L - 6, W - 6); g.fillStyle = '#6b4329'; g.fillRect(-1, -hw + 3, 2, W - 6); g.fillStyle = '#f1c35a'; g.fillRect(-6, -2, 3, 4); g.fillRect(3, -2, 3, 4); }
  else if (k === 'fridge') { g.fillStyle = '#eef3f8'; rr(g, -hl, -hw, L, W, 6); g.fill(); g.strokeStyle = '#b8c4d2'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#9aa8b8'; g.fillRect(hl - 10, -hw + 8, 3, W - 16); }
  else if (k === 'mirror') { g.fillStyle = '#c9d6e6'; g.fillRect(-hl, -hw, L, W); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-hl + 8, -hw + 3, L * .3, 3); g.strokeStyle = '#8a6a4a'; g.lineWidth = 2; g.strokeRect(-hl, -hw, L, W); }
  else if (k === 'piano') { g.fillStyle = '#231c2c'; rr(g, -hl, -hw, L, W, 6); g.fill(); g.fillStyle = '#fff'; g.fillRect(-hl + 6, hw - 12, L - 12, 8); g.fillStyle = '#231c2c'; for (let x = -hl + 10; x < hl - 8; x += 7) g.fillRect(x, hw - 12, 3, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-hl + 6, -hw + 5, L - 12, 3); }
  else if (k === 'shrine') { g.fillStyle = '#f6e3c9'; g.fillRect(-hl + 6, -hw + 6, L - 12, W - 12); g.fillStyle = '#d64545'; g.beginPath(); g.moveTo(-hl, -hw); g.lineTo(hl, 0); g.lineTo(-hl, hw); g.closePath(); g.globalAlpha = .55; g.fill(); g.globalAlpha = 1; g.fillStyle = '#f1c35a'; g.beginPath(); g.moveTo(hl + 6, 0); g.lineTo(hl - 6, -8); g.lineTo(hl - 6, 8); g.fill(); g.fillStyle = '#f1c35a'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill(); }
  else if (k === 'box') { g.fillStyle = '#d4a46a'; g.fillRect(-hl, -hw, L, W); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-hl, -hw, L, 3); g.fillStyle = '#c99858'; g.fillRect(-hl, -2.5, L, 5); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-hl, -2.5, L, 1.2); g.strokeStyle = '#a77a45'; g.lineWidth = 1.5; g.strokeRect(-hl, -hw, L, W); }
  else if (k === 'tv') { g.fillStyle = '#1e1a26'; rr(g, -hl, -hw, L, W, 3); g.fill(); g.fillStyle = '#3d5a80'; g.fillRect(-hl + 3, -hw + 3, L - 6, W - 6); }
  else if (k === 'plant') { g.fillStyle = '#b5653d'; g.beginPath(); g.arc(0, 0, hw - 2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a4a2a'; g.beginPath(); g.arc(0, 0, hw - 5, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.fillStyle = i % 2 ? '#4caf50' : '#66c46a'; g.beginPath(); g.ellipse(Math.cos(a) * 7, Math.sin(a) * 7, 7.5, 3.6, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#a8e08a'; g.beginPath(); g.arc(0, 0, 2.5, 0, Math.PI * 2); g.fill(); }
  if (dmg > 5) { g.strokeStyle = `rgba(60,30,20,${Math.min(.8, dmg / 100 + .2)})`; g.lineWidth = 1.5; g.beginPath(); const n = Math.ceil(dmg / 25); for (let i = 0; i < n; i++) { const x = -hl + (i + .5) * L / n; g.moveTo(x - 4, -hw + 2); g.lineTo(x + 3, -2); g.lineTo(x - 2, hw - 3); } g.stroke(); }
  if (wet) { g.fillStyle = 'rgba(120,190,255,.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-hl + 6 + i * L / 4, -hw + 6 + (i % 2) * 8, 2.5, 0, Math.PI * 2); g.fill(); } }
}
function renderMov() {
  const g = ctx, G = VS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  g.drawImage(movBg, 0, 0);
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 6 * S.shake;
  g.setTransform(scale, 0, 0, scale, ox * scale, V_OY * scale);
  const def = G.def, K = Mov.KINDS;
  // outlines where furniture goes (green when the piece being carried lines up)
  G.items.forEach(it => {
    if (!it.to || it.st === 'placed') return;
    const k = K[it.k], good = (it.st === 'carried') && Mov.aligned(it, it.to);
    g.save(); g.translate(it.to[0], it.to[1]); g.rotate(it.to[2]);
    g.setLineDash([6, 5]); g.lineWidth = good ? 3 : 2; g.strokeStyle = good ? '#5fe08a' : 'rgba(70,50,60,.55)'; g.strokeRect(-k.L / 2, -k.Wd / 2, k.L, k.Wd); g.setLineDash([]);
    if (good) { g.fillStyle = 'rgba(95,224,138,.18)'; g.fillRect(-k.L / 2, -k.Wd / 2, k.L, k.Wd); }
    if (k.facing) { g.fillStyle = good ? '#5fe08a' : 'rgba(70,50,60,.6)'; g.beginPath(); g.moveTo(k.L / 2 + 14, 0); g.lineTo(k.L / 2 + 2, -8); g.lineTo(k.L / 2 + 2, 8); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(70,50,60,.6)'; g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillText(k.name, it.to[0], it.to[1] + 4);
  });
  // things on the floor and in place, then things being carried (a little lifted)
  const order = G.items.map((it, i) => i).sort((a, b) => (G.items[a].st === 'carried' || G.items[a].st === 'held') - (G.items[b].st === 'carried' || G.items[b].st === 'held'));
  const drawItem = it => {
    const k = K[it.k], up = it.st === 'carried' ? -5 : 0;
    g.save(); g.translate(it.x, it.y + up); g.rotate(it.a); vShape(g, it.k, k.L, k.Wd, it.dmg, G.def.rain && it.wet > G.def.rain); g.restore();
    if (it.st === 'placed') { g.fillStyle = 'rgba(95,224,138,.9)'; g.font = `400 14px ${FONT}`; g.textAlign = 'center'; g.fillText('✓', it.x, it.y + 5); }
    else if (!k.two && it.st === 'floor' && it.zone) { const nm = vZoneName(def, it.zone); g.font = `600 9px ${FONT}`; const w = g.measureText(nm).width + 8; panel(g, it.x - w / 2, it.y - k.Wd / 2 - 16, w, 13, 6, .7); g.fillStyle = '#fff3c4'; g.fillText(nm, it.x, it.y - k.Wd / 2 - 6); }
  };
  for (const i of order) { const it = G.items[i]; if (it.st !== 'held') drawItem(it); }
  // players (a small thing rides above the head of whoever carries it)
  for (const w of ['pink', 'mint']) {
    const P = G.p[w];
    g.save(); g.translate(P.x, P.y + 14); drawPlayer(g, { id: w, x: -12, y: -28, w: 24, h: 28, face: P.fx >= 0 ? 1 : -1, sq: 0, walk: 0 }, S.time); g.restore();
    if (P.hold >= 0 && G.items[P.hold].st === 'held') { const it = G.items[P.hold], k = K[it.k]; g.save(); g.translate(P.x, P.y - 26); vShape(g, it.k, k.L, k.Wd, it.dmg, false); g.restore(); }
  }
  // what the button would do, for anyone standing next to something
  for (const w of ['pink', 'mint']) {
    if (O.role && w !== O.local) continue;
    const P = G.p[w]; let label = null;
    if (P.hold >= 0) { const it = G.items[P.hold]; label = it.st === 'wait' ? 'รอเพื่อนยกอีกปลาย' : it.st === 'carried' ? (it.to && Mov.aligned(it, it.to) ? 'กดวางได้เลย' : null) : (it.zone && Mov.inZone(def, it.zone, P.x, P.y) ? 'กดวางได้เลย' : null); }
    else G.items.forEach(it => { if (label || (it.st !== 'floor' && it.st !== 'wait')) return; const k = K[it.k]; if (k.two) { for (const e of [0, 1]) { const [hx, hy] = Mov.handle(it, e); if (Math.hypot(hx - P.x, hy - P.y) < Mov.GRAB_R) label = 'กดยก' + k.name; } } else if (Math.hypot(it.x - P.x, it.y - P.y) < Mov.PICK_R + 6) label = 'กดหยิบ' + k.name; });
    if (label) { g.font = `600 11px ${FONT}`; const tw = g.measureText(label).width + 12; panel(g, P.x - tw / 2, P.y - 58, tw, 18, 9, .82); g.fillStyle = w === 'pink' ? C.pink : C.mint; g.textAlign = 'center'; g.fillText(label, P.x, P.y - 45); }
  }
  drawParts(g);
  for (const f of VS.floats) { g.globalAlpha = Math.min(1, f.life * 2.5); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(f.text, f.x, f.y - V_OY); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y - V_OY); g.globalAlpha = 1; }
  g.setTransform(scale, 0, 0, scale, 0, 0);
  if (def.rain) { g.strokeStyle = 'rgba(190,215,255,.45)'; g.lineWidth = 1.2; g.beginPath(); for (const r of VS.rain) { g.moveTo(r[0], r[1]); g.lineTo(r[0] - 5 * r[2], r[1] + 14 * r[2]); } g.stroke(); g.fillStyle = 'rgba(30,40,70,.12)'; g.fillRect(0, 0, VW, VH); }
  vHudDraw(g, G);
  if (S.banner > 0 && G.stats.delivered === 0) {
    g.globalAlpha = Math.min(1, S.banner * 1.5); panel(g, VW / 2 - 250, VH / 2 - 34, 500, 60, 14, .85);
    g.textAlign = 'center'; g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(def.name, VW / 2, VH / 2 - 8);
    g.font = `600 12px ${FONT}`; g.fillStyle = C.paper; g.fillText(O.role || app.classList.contains('touch') ? 'ไปยืนคนละปลายของ แล้วกดยกทั้งคู่ วางให้ตรงเส้นประ' : 'ไปคนละปลายแล้วกดยก (ชมพู Space · มิ้นต์ Enter) วางให้ตรงเส้นประ', VW / 2, VH / 2 + 14);
    g.globalAlpha = 1;
  }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
function vHudDraw(g, G) {
  const def = G.def, left = Math.max(0, def.time - G.t);
  const x = VW - 300, w = 290;
  panel(g, x, 6, w, 42, 12, .84);
  g.textAlign = 'left'; g.font = `400 18px ${FONT_D}`; g.fillStyle = left < 20 ? '#ff8a8a' : C.paper;
  g.fillText(`${th(Math.floor(left / 60))}:${th(String(Math.floor(left % 60)).padStart(2, '0'))}`, x + 12, 34);
  g.fillStyle = C.gold; g.fillText(`฿${th(G.money)}`, x + 76, 34);
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`ย้ายแล้ว ${th(G.stats.delivered)}/${th(G.items.length)}`, x + 160, 21);
  const s = def.stars, k = Math.min(1, G.money / s[2]), bx = x + 160, bw = 118;
  rr(g, bx, 27, bw, 5, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); if (k > 0) { rr(g, bx, 27, Math.max(5, bw * k), 5, 3); g.fillStyle = C.gold; g.fill(); }
  g.textAlign = 'center'; g.font = `400 10px ${FONT}`;
  for (let i = 0; i < 3; i++) { g.fillStyle = G.money >= s[i] ? C.gold : 'rgba(255,255,255,.45)'; g.fillText('★', bx + bw * s[i] / s[2] - (i === 2 ? 4 : 0), 44); }
  if (def.rain) { const y = V_OY + 10 * Mov.T + 30; panel(g, 6, y - 16, 168, 24, 10, .72); g.font = `600 11px ${FONT}`; g.fillStyle = '#9fd6ff'; g.textAlign = 'left'; g.fillText('ฝนตก ของข้างนอกเปียกได้', 16, y); }
}

/* ---------- title list ---------- */
function renderMovLevels() {
  let total = 0;
  $('#vlevels').innerHTML = VLEVELS.map((lv, i) => {
    const b = vBest(i), open = vOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ฿${th(b.m)}` : open ? 'ยังไม่เคยย้าย' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-v="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#vStarsAll').textContent = `ดาวรวม ${th(total)}/${th(VLEVELS.length * 3)}`;
  let next = VLEVELS.findIndex((l, i) => vOpen(i) && !(vBest(i) && vBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.v = next;
  if (S.tab === 'mov') $('#bGo').textContent = vBest(next) ? `ย้าย${HOUSE(next)}` : 'เริ่มขนของ';
}
$('#vlevels').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b && !b.disabled) startMov(+b.dataset.v); });

/* ---------- online: the guest walks itself and sends its stick and button; the host carries and decides ---------- */
function onlineStartMov(i) {
  if (O.role !== 'host') return;
  O.md = 'v'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsV').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b && !b.disabled) onlineStartMov(+b.dataset.v); });
function renderOnlineMov() {
  $('#oLevelsV').innerHTML = VLEVELS.map((lv, i) => {
    const b = vBest(i), open = vOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-v="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยย้าย' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function vEncode() {
  const G = VS.G;
  return O.role === 'host' ? Mov.encode(G) : Mov.guestMsg(G, O.local, VS.lastInp || {}, VS.act.n);
}
function vHostHears(pr) {
  const G = VS.G;
  if (!G || pr.ep !== O.ep || !pr.vw || typeof pr.vw !== 'object') return;
  Mov.hostHears(G, O.local === 'pink' ? 'mint' : 'pink', pr.vw, VS.remote);
}
function vGuestHears(pr) {
  const G = VS.G;
  if (!G || !pr.vw) return;
  Mov.apply(G, pr.vw, O.local);
  vGuestDiff();
  if (G.over && !VS.endT && S.mode === 'play') { VS.endT = G.done ? 2.6 : 1.8; vSave(); }
}

/* ---------- Kite flying (ชักว่าวคู่) ---------- */
const IS = { G: null, li: 0, acc: 0, floats: [], endT: 0, savedB: null, prev: null, lastInp: {}, act: { n: 0 }, remote: { mx: 0, my: 0, act: false, seen: -1 },
  roles: { run: 'pink', line: 'mint' }, cam: { x: 0, s: 1 }, clouds: [], sparks: [], rubT: 0, runT: 0 };
const KFIELD = i => 'ลานว่าวที่ ' + th(i + 1);
if (!prog.i) prog.i = {};
const iBest = i => prog.i[ILEVELS[i].name] || null;
const iOpen = i => i === 0 || !!(iBest(i - 1) && iBest(i - 1).s >= 1);
IS.roles = store.get('kroles', 'pink') === 'mint' ? { run: 'mint', line: 'pink' } : { run: 'pink', line: 'mint' };
const iRoleOf = id => (IS.roles.run === id ? 'run' : 'line');
Object.assign(sfx, {
  igust() { noise(1.1, 300, .05, 'bandpass', .7, 1100); tone(240, .7, 'triangle', .015, 520, .15); },
  isnap() { noise(.06, 3000, .05, 'highpass', .7); tone(1200, .25, 'triangle', .05, 300); tone(90, .25, 'sine', .06, 50, .04); },
  irub() { noise(.05, 2800 + Math.random() * 1500, .06, 'bandpass', 6); },
  itug() { tone(520, .1, 'triangle', .045, 980); noise(.08, 1500, .02, 'bandpass', 1.5, 3000); },
  isprint() { noise(.06, 400, .065, 'lowpass', .8); noise(.06, 400, .055, 'lowpass', .8, 0, .1); },
  icrash() { tone(130, .22, 'sine', .07, 55); noise(.3, 2500, .035, 'bandpass', 1, 900); },
  ilaunch() { noise(.4, 600, .03, 'bandpass', 1, 2500); chime(990, .3, .035, .1); },
  iup() { chime(1320, .25, .025); }
});
function iPadLabels() {
  document.querySelectorAll('.kpad .kb.act').forEach(b => {
    const id = b.dataset.p === 'local' ? (O.local || 'pink') : b.dataset.p;
    b.innerHTML = iRoleOf(id) === 'run' ? 'วิ่ง<br>เร็ว' : 'กระ<br>ตุก';
  });
  const r = IS.roles.run === 'pink';
  const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  set('#iRolePinkK', r ? 'A D วิ่ง' : 'W S ดึง ผ่อนสาย'); set('#iRolePinkT', r ? 'คนวิ่ง' : 'คนคุมสาย');
  set('#iRoleMintK', r ? '↑ ↓ ดึง ผ่อนสาย' : '← → วิ่ง'); set('#iRoleMintT', r ? 'คนคุมสาย' : 'คนวิ่ง');
}
function iSwap() {
  if (O.role === 'guest') return;
  IS.roles = { run: IS.roles.line, line: IS.roles.run };
  store.set('kroles', IS.roles.run);
  iPadLabels(); iSwapNote();
}
function iSwapNote() { $('#bSwap').textContent = `สลับหน้าที่ (ตอนนี้ ${S.names[IS.roles.run]} เป็นคนวิ่ง)`; }

/* ---------- flow ---------- */
function iSnap(G) { return { st: G.st, s: Object.assign({}, G.stats), rub: G.rub > 0, over: G.over, cause: G.cause }; }
function loadKite(i, net) {
  IS.li = i; IS.G = Kite.load(ILEVELS[i]); IS.G.net = net || null;
  IS.acc = 0; IS.floats = []; IS.endT = 0; IS.savedB = null; IS.prev = iSnap(IS.G); IS.lastInp = {}; IS.act = { n: IS.act.n }; IS.remote = { mx: 0, my: 0, act: false, seen: -1 };
  IS.sparks = []; IS.rubT = 0; IS.runT = 0;
  const f = IS.G.def.field; IS.cam = { x: IS.G.run.x + 120, s: 1.1 };
  const R = rng(i * 71 + 5); IS.clouds = Array.from({ length: 14 }, () => ({ x: (R() * 2.4 - 0.4) * 2600 + f[0], y: 160 + R() * 900, w: 60 + R() * 110, p: 0.25 + R() * 0.35 }));
  setKind('kite');
  S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
  releaseK(); iPadLabels(); iHud(true);
}
function startKite(i) {
  readNames(); audio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadKite(i); showScreen(null); setMode('play');
}
function kiteRestart() { if (O.role) { onlineRestart(); return; } loadKite(IS.li); showScreen(null); setMode('play'); }
function kiteNext() {
  if (O.role === 'host') { if (IS.li < ILEVELS.length - 1) onlineStartKite(IS.li + 1); return; }
  if (IS.li < ILEVELS.length - 1 && iOpen(IS.li + 1)) startKite(IS.li + 1); else toTitle();
}
let iHudKey = '';
function iHud(force) {
  const k = String(IS.li); if (!force && k === iHudKey) return; iHudKey = k;
  const lv = ILEVELS[IS.li];
  $('#hNo').textContent = KFIELD(IS.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
function iSave() {
  if (IS.savedB) return IS.savedB;
  const G = IS.G, lv = ILEVELS[IS.li], st = Kite.stars(G), sc = Math.round(G.score);
  const b = prog.i[lv.name] || { s: 0, m: 0 };
  prog.i[lv.name] = { s: Math.max(b.s, st), m: Math.max(b.m, sc) };
  store.set('prog2', prog);
  return (IS.savedB = b);
}
function iResults() {
  const G = IS.G, lv = ILEVELS[IS.li], st = Kite.stars(G), s = G.stats, sc = Math.round(G.score);
  const b = iSave(), best = sc > b.m;
  setMode('clear'); releaseAll(); releaseK();
  $('#cNo').textContent = `${KFIELD(IS.li)} · หมดเวลา`;
  $('#cName').textContent = lv.name;
  $('#cStars').hidden = false;
  $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? '' : 'off'}">★</span>`).join('');
  const trouble = s.snaps + s.cuts + s.crashes;
  const msg = st === 3 ? 'ว่าวติดลมบน ลอยสูงแทบทั้งเกม ทีมนี้ชักว่าวเก่งมาก'
    : st === 2 ? (trouble ? 'ว่าวลอยดีแล้ว ถ้าตกน้อยกว่านี้จะได้สามดาว' : 'ว่าวลอยดีแล้ว ผ่อนสายตอนลมดีให้ขึ้นสูงกว่านี้อีกนิด')
    : st === 1 ? 'ผ่านแล้ว ลานถัดไปเปิดให้เล่นแล้ว'
    : `ว่าวยังลอยไม่สูงพอ ต้องได้ ${th(lv.stars[0])} แต้ม คนวิ่งส่งว่าวขึ้นก่อน คนคุมสายผ่อนสายตอนว่าวกินลม`;
  $('#cMsg').textContent = msg + (best && b.m ? ' · สถิติใหม่' : '');
  $('#cStats').innerHTML = `<span>แต้ม <b>${th(sc)}</b></span><span>สูงสุด <b>${th(Math.round(G.best))} ม.</b></span><span>สายขาด <b>${th(s.snaps)}</b> โดนตัด <b>${th(s.cuts)}</b> ตก <b>${th(s.crashes)}</b></span>`;
  const last = IS.li >= ILEVELS.length - 1, guest = O.role === 'guest';
  $('#bNext').textContent = 'ลานถัดไป';
  $('#bNext').hidden = guest || last || !iOpen(IS.li + 1);
  $('#bAgain').hidden = guest;
  $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : 'ชักว่าวลานนี้อีกรอบ';
  $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
  if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
  showScreen('clear');
}

/* ---------- tick ---------- */
function iFloat(text, x, y, col, size = 16, life = 1.4) { IS.floats.push({ text, x, y, col, life, max: life, size }); }
const I_CAUSE = { snap: ['สายขาด!', '#ff8a8a'], cut: ['สายโดนตัด!', '#ff8a8a'], crash: ['ว่าวตก!', '#ffb38a'], tree: ['ติดต้นไม้!', '#ffb38a'], wire: ['ติดสายไฟ!', '#ffb38a'] };
function iEvents(ev) {
  const G = IS.G;
  for (const e of ev) {
    if (e === 'go') { sfx.ilaunch(); }
    else if (e === 'sprint') sfx.isprint();
    else if (e === 'tug') sfx.itug();
    else if (e === 'gust') { sfx.igust(); iFloat('ลมกระโชก!', null, 120, '#bfe6ff', 22, 1.6); }
    else if (e === 'rub') sfx.irub();
    else if (e.startsWith('down:')) {
      const c = I_CAUSE[e.slice(5)] || I_CAUSE.crash;
      if (e === 'down:snap' || e === 'down:cut') sfx.isnap(); else sfx.icrash();
      S.shake = Math.max(S.shake, .3);
      iFloat(c[0], G.k.x, G.k.y + 30, c[1], 20, 1.6);
    } else if (e === 'relaunch') sfx.iup();
    else if (e === 'timeup') sfx.win();
  }
}
// the guest: effects from the host's snapshots
function iGuestDiff() {
  const G = IS.G, n = iSnap(G), p = IS.prev || n, ev = [];
  if (p.st === 'count' && n.st === 'fly') ev.push('go');
  if (n.s.snaps > p.s.snaps) ev.push('down:snap');
  else if (n.s.cuts > p.s.cuts) ev.push('down:cut');
  else if (n.s.crashes > p.s.crashes) ev.push('down:' + (n.cause || 'crash'));
  if (p.st === 'down' && n.st === 'fly') ev.push('relaunch');
  if (n.s.gusts > p.s.gusts) ev.push('gust');
  if (n.rub && !p.rub) ev.push('rub');
  if (n.over && !p.over) ev.push('timeup');
  iEvents(ev);
  IS.prev = n;
}
const iCtl = (role, q) => (role === 'run' ? { mx: q.mx || 0, act: !!q.act } : { pull: Math.max(0, Math.min(1, -(q.my || 0))), rel: Math.max(0, Math.min(1, q.my || 0)), act: !!q.act });
function iTick() {
  const G = IS.G, R = IS.roles;
  if (!O.role) {
    const ev = Kite.step(G, { run: iCtl('run', kInput(R.run)), line: iCtl('line', kInput(R.line)) });
    iEvents(ev); IS.prev = iSnap(G);
  } else if (O.role === 'host') {
    const li = kInput(O.local), rid = O.local === 'pink' ? 'mint' : 'pink', rq = IS.remote;
    IS.lastInp = li;
    const inp = { [iRoleOf(O.local)]: iCtl(iRoleOf(O.local), li), [iRoleOf(rid)]: iCtl(iRoleOf(rid), { mx: rq.mx, my: rq.my, act: rq.act }) };
    rq.act = false;
    iEvents(Kite.step(G, inp)); IS.prev = iSnap(G);
  } else {
    // the guest: its own half acts here at once; the other half as the host last said
    const li = kInput(O.local), mine = iRoleOf(O.local);
    IS.lastInp = li;
    if (li.act) IS.act.n++;
    const inp = mine === 'run' ? { run: iCtl('run', li), line: { pull: G.inp.pull, rel: G.inp.rel } } : { run: { mx: G.inp.mx }, line: iCtl('line', li) };
    const ev = Kite.step(G, inp, true);
    iEvents(ev.filter(e => e === 'sprint' || e === 'tug'));
  }
  if (G.over && !IS.endT) { IS.endT = 2.2; iSave(); }
}
function kiteFrame(dt, now) {
  const G = IS.G;
  if (S.mode === 'play' && G) {
    IS.acc += dt;
    while (IS.acc >= Kite.DT) { iTick(); IS.acc -= Kite.DT; if (S.mode !== 'play') { IS.acc = 0; break; } }
    if (IS.endT > 0) { IS.endT -= dt; if (IS.endT <= 0) { IS.endT = -1; iResults(); if (O.role === 'host') O.st = 'clear'; } }
  } else IS.acc = 0;
  if (O.role) pumpOnline(now);
  if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
  if (S.mode === 'play' && G) {                                       // three, two, one, go
    const n = G.st === 'count' ? Math.ceil(Kite.START - G.t) : 0;
    if (n !== IS.cd) { if (n > 0 && n <= 3) chime(660, .2, .05); else if (n === 0 && IS.cd > 0) { chime(1047, .5, .06); chime(1568, .5, .04, .03); } IS.cd = n; }
  }
  S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
  stepParts(dt);
  for (const f of IS.floats) { f.life -= dt; f.y += dt * 20; }
  IS.floats = IS.floats.filter(f => f.life > 0);
  if (G) {
    for (const c of IS.clouds) c.x += G.wind * 0.12 * dt;
    // rubbing lines: sparks and a scratchy sound
    if (G.rub > 0 && G.rubAt && S.mode === 'play') { IS.rubT -= dt; if (IS.rubT <= 0) { IS.rubT = 0.11; sfx.irub(); } for (let k = 0; k < 2; k++) IS.sparks.push({ x: G.rubAt[0], y: G.rubAt[1], vx: (Math.random() - .5) * 120, vy: Math.random() * 90, life: .4 }); }
    for (const p of IS.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 200 * dt; p.life -= dt; }
    IS.sparks = IS.sparks.filter(p => p.life > 0);
    if (Math.abs(G.run.v) > 20) IS.runT += dt * Math.abs(G.run.v) / 22;
    iHud();
  }
  renderKite(dt);
}

/* ---------- drawing ---------- */
const ISCENE = {
  paddy: { sky: ['#7fc8f2', '#cdeeff'], hill: '#8fb58a', ground: '#c9b46a', ground2: '#b9a35a', field: '#d8c47a', far: '#9bc0a0' },
  march: { sky: ['#62b6ef', '#e2f4ff'], hill: '#93b9a0', ground: '#a9c46c', ground2: '#98b35d', field: '#b9d17c', far: '#a6c9b4' },
  canal: { sky: ['#78bfe4', '#d8efff'], hill: '#7aa98a', ground: '#8fbf62', ground2: '#7fae55', field: '#a2cd74', far: '#8fb8a0', water: '#4f9fd1' },
  royal: { sky: ['#6db4ea', '#e6f3ff'], hill: '#a7b8c8', ground: '#96c464', ground2: '#86b356', field: '#a8d276', far: '#b3c4d6', roofs: true },
  final: { sky: ['#f08a5d', '#ffd99a'], hill: '#9a6f7f', ground: '#8dab5c', ground2: '#7e9b50', field: '#9fbd6a', far: '#b08a95', roofs: true }
};
const I_GY = 34;                                                     // the ground line, this far above the bottom of the screen
function iCamera(dt) {
  const G = IS.G, K = G.k, rx = G.run.x, C2 = IS.cam;
  const span = Math.abs(K.x - rx) + 320, tall = Math.max(K.y, 120) + 110;
  const want = Math.max(0.36, Math.min(1.1, (VH - I_GY - 70) / tall, VW / span));
  const cx = (Math.min(K.x, rx) + Math.max(K.x, rx)) / 2 + 30;
  const k = Math.min(1, dt * 2.5);
  C2.s += (want - C2.s) * k; C2.x += (cx - C2.x) * k;
}
function renderKite(dt) {
  const g = ctx, G = IS.G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) return;
  iCamera(Math.min(dt || 0, .05));
  const P = ISCENE[G.def.scene] || ISCENE.paddy, cam = IS.cam, s = cam.s;
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 6 * S.shake;
  const X = x => VW / 2 + (x - cam.x) * s + ox, Y = y => VH - I_GY - y * s, big = Math.max(s, 0.72);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.textBaseline = 'alphabetic';
  // sky, sun, height marks
  // the sky and the sun stay put on screen: drawn once
  stamp(g, 'iSky', G.def.scene, 0, 0, VW, VH, q => {
    const sk = q.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, P.sky[0]); sk.addColorStop(1, P.sky[1]); q.fillStyle = sk; q.fillRect(0, 0, VW, VH);
    const sx = VW - 120, sy = G.def.scene === 'final' ? 300 : 90, sg = q.createRadialGradient(sx, sy, 10, sx, sy, 150);
    sg.addColorStop(0, 'rgba(255,250,224,.9)'); sg.addColorStop(.25, 'rgba(255,240,190,.4)'); sg.addColorStop(1, 'rgba(255,240,190,0)'); q.fillStyle = sg; q.fillRect(sx - 150, sy - 150, 300, 300);
    q.fillStyle = G.def.scene === 'final' ? 'rgba(255,240,200,.95)' : 'rgba(255,251,228,.95)'; q.beginPath(); q.arc(sx, sy, 32, 0, Math.PI * 2); q.fill();
  }, true);
  g.font = `600 10px ${FONT}`; g.textAlign = 'left';
  for (let m = 10; m <= 120; m += 10) { const y = Y(m * Kite.METER); if (y < 50) break; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y, VW, 1); g.fillStyle = 'rgba(40,60,90,.45)'; g.fillText(`${th(m)} ม.`, 6, y - 3); }
  // clouds (drifting with the wind, a little parallax)
  for (const c of IS.clouds) {
    const cx = VW / 2 + (c.x - cam.x) * s * c.p, cy = Y(c.y), w = c.w * Math.max(.45, s) * .8;
    const xx = ((cx % (VW + 400)) + VW + 400) % (VW + 400) - 200;
    if (cy < -40 || cy > VH) continue;
    const cw = w * 1.7, fin = G.def.scene === 'final';
    const cl = layer('iCloud' + (fin ? 'f' : ''), '', 360, 210, q => fluffyCloud(q, 180, 130, 200, fin ? .7 : .8, fin ? '255,236,220' : '255,255,255'));
    g.drawImage(cl, xx - cw * .9, cy - cw * .65, cw * 1.8, cw * 1.05);
  }
  drawBirds(g, S.time, 110, 300, 4);
  // other people's kites far away: little diamonds with ribbon tails, bobbing in the wind
  for (let i = 0; i < 3; i++) {
    const kx = [150, 470, 640][i] - (cam.x * s * .05) % 40, ky = [150, 95, 190][i] + Math.sin(S.time * (1.1 + i * .3) + i) * 8, a = Math.sin(S.time * 1.6 + i * 2) * .15, c = [['#ff8fb8', '#ffd25a'], ['#7fd0ff', '#ff9a5c'], ['#9be07a', '#c9a0ff']][i];
    if (G.def.scene === 'final' && i === 1) continue;
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(kx, ky + 12); g.lineTo(kx + 60 - i * 30, VH); g.stroke();
    g.save(); g.translate(kx, ky); g.rotate(a);
    g.beginPath(); g.moveTo(0, -12); g.lineTo(9, 0); g.lineTo(0, 13); g.lineTo(-9, 0); g.closePath(); g.fillStyle = c[0]; g.fill();
    g.beginPath(); g.moveTo(0, -12); g.lineTo(9, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = c[1]; g.fill(); g.beginPath(); g.moveTo(0, 13); g.lineTo(-9, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.strokeStyle = c[0]; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 13); for (let k = 1; k <= 6; k++) g.lineTo(Math.sin(S.time * 4 + k + i) * 4, 13 + k * 5); g.stroke();
    g.fillStyle = c[1]; for (let k = 1; k <= 3; k++) { const ty = 13 + k * 9, tx = Math.sin(S.time * 4 + k * 1.8 + i) * 4; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 3, ty - 2); g.lineTo(tx - 3, ty + 2); g.closePath(); g.moveTo(tx, ty); g.lineTo(tx + 3, ty - 2); g.lineTo(tx + 3, ty + 2); g.closePath(); g.fill(); }
    g.restore();
  }
  // far hills and roofs (slow parallax)
  const gy = Y(0), hs = cam.x * s;
  // two rows of hills; little round trees on the nearer one
  g.fillStyle = hexA(P.far, .5); g.beginPath(); g.moveTo(0, gy);
  for (let x = 0; x <= VW; x += 24) { const wx = x + hs * .1; g.lineTo(x, gy - 60 - 22 * Math.sin(wx / 140) - 9 * Math.sin(wx / 53)); }
  g.lineTo(VW, gy); g.fill();
  const hillY = x => { const wx = x + hs * .2; return gy - 30 - 18 * Math.sin(wx / 90) - 10 * Math.sin(wx / 37); };
  g.fillStyle = P.far; g.beginPath(); g.moveTo(0, gy);
  for (let x = 0; x <= VW; x += 16) g.lineTo(x, hillY(x));
  g.lineTo(VW, gy); g.fill();
  { const n0 = Math.floor(hs * .2 / 64), sh = hs * .2 - n0 * 64;
    for (let k = -1; k < VW / 64 + 2; k++) {
      const hh = hash(k + n0, 31); if (hh % 3 === 0) continue;
      const x = k * 64 - sh + hh % 30, y = hillY(x) + 4, r = 6 + hh % 6;
      g.fillStyle = hexMix(P.far, -.14); g.beginPath(); g.arc(x, y - r * .7, r, 0, Math.PI * 2); g.arc(x - r * .8, y - r * .2, r * .7, 0, Math.PI * 2); g.arc(x + r * .85, y - r * .25, r * .75, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(x - r * .3, y - r * 1.05, r * .42, 0, Math.PI * 2); g.fill();
    } }
  if (P.roofs) {
    const base = -((cam.x * s * 0.3) % 520);
    for (let i = -1; i < 4; i++) { const x = base + i * 520 + 180; g.fillStyle = G.def.scene === 'final' ? '#8a5a63' : '#c9963f'; g.beginPath(); g.moveTo(x, gy - 30); g.lineTo(x + 34, gy - 72); g.lineTo(x + 68, gy - 30); g.fill(); g.beginPath(); g.moveTo(x + 30, gy - 72); g.lineTo(x + 34, gy - 96); g.lineTo(x + 38, gy - 72); g.fill(); g.fillStyle = '#f2e0b8'; g.fillRect(x + 8, gy - 32, 52, 10); }
  }
  // the ground: the field the runner can use is the lighter part
  g.fillStyle = P.ground; g.fillRect(0, gy, VW, VH - gy);
  const f = G.def.field;
  g.fillStyle = P.field; g.fillRect(X(f[0]), gy, (f[1] - f[0]) * s, VH - gy);
  g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = Math.floor((cam.x - VW / s) / 60) * 60; x < cam.x + VW / s; x += 60) g.fillRect(X(x), gy + 6, 2, 5);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, gy, VW, 2);
  // grass tufts and flowers along the ground (they scroll with the field)
  { const st = s < .6 ? 32 : 16, x0 = Math.floor((cam.x - VW / 2 / s) / st) - 1, x1 = Math.ceil((cam.x + VW / 2 / s) / st) + 1, light = hexMix(P.ground, .18), dark = hexMix(P.ground, -.15);
    for (let k = x0; k <= x1; k++) {
      const hh = hash(k, 5), x = X(k * st + hh % 9), h = (5 + hh % 7) * big;
      g.fillStyle = hh & 1 ? dark : light; g.beginPath(); g.moveTo(x, gy + 1); g.lineTo(x + 2 * big, gy - h); g.lineTo(x + 4 * big, gy + 1); g.lineTo(x + 6 * big, gy - h * .7); g.lineTo(x + 8 * big, gy + 1); g.closePath(); g.fill();
      if (hh % 13 === 0) { const fy = gy - h - 1, fx = x + 3 * big; g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff', '#ffb3b3'][hh >> 4 & 3]; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 2.2 * big, fy + Math.sin(a) * 2.2 * big, 1.7 * big, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.2 * big, 0, Math.PI * 2); g.fill(); }
    } }
  if (P.water) { g.fillStyle = P.water; g.fillRect(X(f[1] + 40), gy, 220 * s, VH - gy); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(X(f[1] + 70), gy + 10, 60 * s, 2); }
  g.fillStyle = 'rgba(80,60,30,.5)'; g.fillRect(X(f[0]) - 2, gy - 10, 3, 10); g.fillRect(X(f[1]) - 1, gy - 10, 3, 10);
  // the launch spot
  if (G.def.launchAt) { const lx = X(G.def.launchAt); g.strokeStyle = '#6b4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, gy); g.lineTo(lx, gy - 30); g.stroke(); g.fillStyle = C.gold; g.beginPath(); g.moveTo(lx, gy - 30); g.lineTo(lx + 16, gy - 25); g.lineTo(lx, gy - 20); g.fill(); g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = 'rgba(40,30,20,.75)'; g.fillText('จุดส่งว่าว', lx, gy + 16); }
  // trees and power lines
  for (const t of G.def.trees || []) {
    const tx = X(t.x), ty = Y(t.y), r = t.r * s;
    const tg = g.createLinearGradient(tx - 5 * s, 0, tx + 5 * s, 0); tg.addColorStop(0, '#7d5a36'); tg.addColorStop(1, '#5a3d22'); g.fillStyle = tg; g.fillRect(tx - 5 * s, Y(t.y - t.r * .6), 10 * s, Y(0) - Y(t.y - t.r * .6));
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(tx, gy + 2, r * .8, 4 * big, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f7a40'; g.beginPath(); g.arc(tx, ty, r, 0, Math.PI * 2); g.arc(tx - r * .62, ty + r * .28, r * .58, 0, Math.PI * 2); g.arc(tx + r * .62, ty + r * .22, r * .62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#45974f'; g.beginPath(); g.arc(tx - r * .12, ty - r * .12, r * .8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#62b465'; g.beginPath(); g.arc(tx - r * .34, ty - r * .38, r * .42, 0, Math.PI * 2); g.arc(tx + r * .3, ty - r * .2, r * .26, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(tx - r * .42, ty - r * .5, r * .15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffb3cf'; for (let q = 0; q < 5; q++) { const a = q * 2.4 + t.x, d = r * (.35 + (q % 3) * .18); g.beginPath(); g.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(1.2, 2.2 * s), 0, Math.PI * 2); g.fill(); }
  }
  for (const w of G.def.wires || []) { g.strokeStyle = '#5b5b66'; g.lineWidth = 4 * s; for (const x of [w.x0, w.x1]) { g.beginPath(); g.moveTo(X(x), gy); g.lineTo(X(x), Y(w.y + 24)); g.stroke(); g.fillRect(X(x) - 12 * s, Y(w.y + 24), 24 * s, 3 * s); } g.strokeStyle = '#2b2b33'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(w.x0), Y(w.y)); g.quadraticCurveTo(X((w.x0 + w.x1) / 2), Y(w.y - 6), X(w.x1), Y(w.y)); g.stroke(); }
  // other people's kites
  for (const r of Kite.rivals(G.def, G.t)) {
    g.strokeStyle = hexA(r.col, .85); g.lineWidth = 1.4; g.beginPath(); g.moveTo(X(r.ax), Y(r.ay)); g.lineTo(X(r.kx), Y(r.ky)); g.stroke();
    iFlyer(g, X(r.ax), gy, r.col, big);
    iKiteShape(g, X(r.kx), Y(r.ky), Math.atan2(r.ky - r.ay, r.kx - r.ax), r.kind, [r.col, r.col], 26 * big, G.t);
  }
  // our line and kite
  const K = G.k, hx = X(G.run.x) + 6 * big, hy = Y(Kite.HAND);
  if (G.st !== 'down' || G.cause === 'crash' || G.cause === 'tree' || G.cause === 'wire') {
    const kx = X(K.x), ky = Y(K.y), sag = G.st === 'down' ? 30 : Math.max(0, 1 - G.strain * 2.5) * Math.hypot(kx - hx, ky - hy) * .12;
    const hot = G.strain > 0.8 ? (Math.sin(S.time * 20) > 0 ? '#ff5d5d' : '#ffd0d0') : G.strain > 0.55 ? '#ffe08a' : 'rgba(255,255,255,.95)';
    g.strokeStyle = hot; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + kx) / 2, (hy + ky) / 2 + sag, kx, ky); g.stroke();
  }
  iKiteShape(g, X(K.x), Y(K.y), G.st === 'down' ? -0.6 + Math.sin(S.time * 7) * .6 : G.th + Math.sin(S.time * 3.1) * .05, 'ours', [C.pink, C.mint], 30 * big, G.t);
  // the two flyers: the runner at the line, the line handler beside with the reel
  const runner = IS.roles.run, handler = IS.roles.line, step = Math.abs(G.run.v) > 20 ? IS.runT : 0;
  const face = G.run.v < -20 ? -1 : 1;
  for (const [id, dx] of [[handler, -38], [runner, 0]]) {
    g.save(); g.translate(X(G.run.x) + dx * big, gy); g.scale(big, big);
    drawPlayer(g, { id, x: -12, y: -29, w: 24, h: 29, face: id === runner ? face : 1, sq: 0, walk: step }, S.time);
    if (id === handler) { g.fillStyle = '#c9963f'; g.beginPath(); g.ellipse(12, -12, 6, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.fillRect(9, -14, 6, 4); }
    g.restore();
  }
  // what to do now (a hint over each of them)
  if (S.mode === 'play' && G.st === 'fly') {
    const hints = [];
    const lowK = K.y < 140, sinking = K.vy < -40, gust = Kite.gustSoon(G, G.t);
    if (G.rub > 0) hints.push([runner, 'สายเสียด! ย้ายที่']);
    else if (lowK && G.t - Kite.START < 30) hints.push([runner, G.run.x > f[0] + 20 ? '← วิ่งสวนลม' : 'ไม่มีที่วิ่งแล้ว เดินไปขวาก่อน']);
    else if (sinking && K.y < 300) hints.push([runner, '← วิ่งช่วย']);
    if (gust || G.strain > 0.75) hints.push([handler, G.L >= G.def.spool - 1 ? 'สายหมดม้วน! ดึงเก็บ' : 'ผ่อนสาย!']);
    else if (sinking && !lowK) hints.push([handler, 'ดึงสาย!']);
    else if (lowK && G.t - Kite.START < 30) hints.push([handler, 'ผ่อนสายตอนว่าวขึ้น']);
    for (const [id, text] of hints) {
      if (O.role && id !== O.local) continue;
      const bx = X(G.run.x) + (id === handler ? -38 : 0) * big, by = gy - 52 * big - (id === handler ? 36 : 14);
      g.font = `600 12px ${FONT}`; const tw = g.measureText(text).width + 14;
      panel(g, bx - tw / 2, by - 15, tw, 20, 10, .85); g.fillStyle = id === 'pink' ? C.pink : C.mint; g.textAlign = 'center'; g.fillText(text, bx, by);
    }
  }
  // sparks where lines rub, floating words
  for (const p of IS.sparks) { g.globalAlpha = Math.min(1, p.life * 3); g.fillStyle = '#ffd36b'; g.fillRect(X(p.x) - 1.5, Y(p.y) - 1.5, 3, 3); }
  g.globalAlpha = 1;
  if (G.rub > 0 && G.rubAt) { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; const tx = X(G.rubAt[0]), ty = Y(G.rubAt[1]) - 14; g.strokeText('สายเสียด!', tx, ty); g.fillStyle = '#ffb38a'; g.fillText('สายเสียด!', tx, ty); }
  for (const fl of IS.floats) {
    const fx = fl.x == null ? VW / 2 : X(fl.x), fy = fl.x == null ? fl.y - (fl.max - fl.life) * 20 : Y(fl.y);
    g.globalAlpha = Math.min(1, fl.life * 2.5); g.textAlign = 'center'; g.font = `400 ${fl.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(fl.text, fx, fy); g.fillStyle = fl.col; g.fillText(fl.text, fx, fy); g.globalAlpha = 1;
  }
  drawParts(g);
  iHudDraw(g, G);
  if (G.st === 'count') { const n = Math.ceil(Kite.START - G.t); g.font = `400 54px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(21,18,43,.7)'; g.strokeText(th(n), VW / 2, VH / 2 + 40); g.fillStyle = C.gold; g.fillText(th(n), VW / 2, VH / 2 + 40); }
  if (S.banner > 0 && G.t < Kite.START + 3) {
    g.globalAlpha = Math.min(1, S.banner * 1.5); panel(g, VW / 2 - 270, 150, 540, 60, 14, .85);
    g.textAlign = 'center'; g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(G.def.name, VW / 2, 176);
    g.font = `600 12px ${FONT}`; g.fillStyle = C.paper; g.fillText(`${S.names[IS.roles.run]} วิ่งถอยไปทางซ้ายส่งว่าวขึ้น · ${S.names[IS.roles.line]} ผ่อนสายตอนว่าวกินลม ดึงสายตอนว่าวตก`, VW / 2, 198);
    g.globalAlpha = 1;
  }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
// a person flying a kite (the other teams), feet at (x, gy)
function iFlyer(g, x, gy, col, k) {
  g.save(); g.translate(x, gy); g.scale(k, k);
  g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(0, 0, 9, 2.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3048'; rr(g, -5, -8, 4, 8, 2); g.fill(); rr(g, 1, -8, 4, 8, 2); g.fill();
  const bg = g.createLinearGradient(0, -22, 0, -6); bg.addColorStop(0, hexMix(col, .25)); bg.addColorStop(1, hexMix(col, -.12));
  g.fillStyle = bg; rr(g, -7, -22, 14, 16, 6); g.fill();
  g.strokeStyle = '#f2d2b0'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(5, -18); g.lineTo(9, -26); g.stroke(); g.lineCap = 'butt';
  g.fillStyle = '#f2d2b0'; g.beginPath(); g.arc(0, -28, 6.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2a3f'; g.beginPath(); g.arc(0, -28.8, 6.8, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  g.fillStyle = '#e8c46a'; g.beginPath(); g.ellipse(0, -33, 10, 2.6, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, -35, 5.5, 4, 0, Math.PI, 0); g.fill();
  g.fillStyle = col; g.fillRect(-5.4, -35.6, 10.8, 1.6);
  g.fillStyle = '#2a1f4a'; g.fillRect(-3, -28, 1.4, 1.8); g.fillRect(1.6, -28, 1.4, 1.8);
  g.fillStyle = 'rgba(255,128,170,.5)'; g.beginPath(); g.arc(-4, -25.3, 1.4, 0, Math.PI * 2); g.arc(4, -25.3, 1.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
// a kite at (x, y) on screen; a is the line's angle up from downwind (radians)
function iKiteShape(g, x, y, a, kind, cols, size, t) {
  g.save(); g.translate(x, y); g.rotate(-(a - Math.PI / 2) * 0.35 + Math.sin(t * 2.3 + x * .01) * .05);
  const h = size, w = size * 0.75;
  // tail ribbons, trailing downwind
  g.strokeStyle = kind === 'chula' ? cols[0] : '#fff'; g.lineWidth = 2;
  if (kind !== 'chula') {
    const tp = i => [i * size * .18, h * .55 + i * size * .1 + Math.sin(t * 6 + i) * size * .06];
    g.beginPath(); g.moveTo(0, h * .55); for (let i = 1; i <= 8; i++) g.lineTo(...tp(i)); g.stroke();
    // little bows tied along the tail
    for (const i of [2, 4, 6, 8]) { const [bx, by] = tp(i), bs = size * .09; g.fillStyle = kind === 'ours' ? (i % 4 ? C.pink : C.mint) : cols[0]; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - bs, by - bs * .8); g.lineTo(bx - bs, by + bs * .8); g.closePath(); g.moveTo(bx, by); g.lineTo(bx + bs, by - bs * .8); g.lineTo(bx + bs, by + bs * .8); g.closePath(); g.fill(); }
  }
  if (kind === 'chula') {
    // a big five-pointed star kite
    g.fillStyle = cols[0]; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? h * .28 : h * .62, b = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(b) * r, Math.sin(b) * r); }
    g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.stroke();
  } else {
    g.beginPath(); g.moveTo(0, -h * .55); g.lineTo(-w / 2, -h * .1); g.lineTo(0, h * .55); g.closePath(); g.fillStyle = cols[0]; g.fill();
    g.beginPath(); g.moveTo(0, -h * .55); g.lineTo(w / 2, -h * .1); g.lineTo(0, h * .55); g.closePath(); g.fillStyle = cols[1]; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -h * .55); g.lineTo(-w / 2, -h * .1); g.lineTo(0, h * .55); g.lineTo(w / 2, -h * .1); g.closePath(); g.moveTo(0, -h * .55); g.lineTo(0, h * .55); g.moveTo(-w / 2, -h * .1); g.lineTo(w / 2, -h * .1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(0, -h * .55); g.lineTo(-w / 2, -h * .1); g.lineTo(-w * .18, -h * .16); g.closePath(); g.fill();
    if (kind === 'ours') { g.fillStyle = C.gold; heartPath(g, 0, -h * .08, size * .12); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-size * .04, -h * .12, size * .03, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}
function iHudDraw(g, G) {
  const def = G.def, left = Math.max(0, def.time - Math.max(0, G.t - Kite.START));
  // left: time, height, points
  panel(g, 8, 8, 236, 58, 12, .82);
  g.textAlign = 'left'; g.font = `400 18px ${FONT_D}`; g.fillStyle = left < 10 ? '#ff8a8a' : C.paper;
  g.fillText(`${th(Math.floor(left / 60))}:${th(String(Math.floor(left % 60)).padStart(2, '0'))}`, 18, 32);
  g.font = `400 22px ${FONT_D}`; g.fillStyle = '#bfe6ff'; g.fillText(`${th(Math.round(Kite.height(G)))} ม.`, 84, 33);
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`แต้ม ${th(Math.round(G.score))}`, 164, 22);
  const st = def.stars, kk = Math.min(1, G.score / st[2]), bx = 18, bw = 216;
  rr(g, bx, 44, bw, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); if (kk > 0) { rr(g, bx, 44, Math.max(6, bw * kk), 6, 3); g.fillStyle = C.gold; g.fill(); }
  g.font = `400 10px ${FONT}`; g.textAlign = 'center';
  for (let i = 0; i < 3; i++) { g.fillStyle = G.score >= st[i] ? C.gold : 'rgba(255,255,255,.45)'; g.fillText('★', bx + bw * st[i] / st[2] - (i === 2 ? 4 : 0), 62); }
  // right: the wind, the line's pull, line left on the reel
  const x0 = VW - 250;
  panel(g, x0, 8, 242, 58, 12, .82);
  const gust = Kite.gustSoon(G, G.t), w = G.wind;
  g.textAlign = 'left'; g.font = `600 11px ${FONT}`; g.fillStyle = gust && Math.sin(S.time * 14) > 0 ? '#ffb38a' : '#c9bfef';
  g.fillText(gust ? 'ลมกระโชก!' : w < 80 ? 'ลมหยุด' : 'ลม', x0 + 12, 24);
  // a wind flag that flaps harder in stronger wind
  const fl = Math.min(1, w / 200), fx = x0 + 74, fy = 14;
  g.strokeStyle = '#d9cfe9'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy - 2); g.lineTo(fx, fy + 22); g.stroke();
  g.fillStyle = gust ? '#ff8a8a' : '#ffcf5a'; g.beginPath(); g.moveTo(fx, fy);
  for (let i = 1; i <= 5; i++) g.lineTo(fx + i * 9 * (0.4 + fl * .6), fy + 3 + Math.sin(S.time * (4 + fl * 10) + i) * (2 + (1 - fl) * 4) + (1 - fl) * i * 2);
  for (let i = 5; i >= 0; i--) g.lineTo(fx + i * 9 * (0.4 + fl * .6), fy + 10 + Math.sin(S.time * (4 + fl * 10) + i) * (2 + (1 - fl) * 4) + (1 - fl) * i * 2);
  g.fill();
  g.fillStyle = '#c9bfef'; g.fillText('สายตึง', x0 + 128, 24);
  const sn = Math.min(1, G.strain);
  rr(g, x0 + 168, 16, 62, 8, 4); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill();
  if (sn > 0) { rr(g, x0 + 168, 16, Math.max(8, 62 * sn), 8, 4); g.fillStyle = sn > .8 ? '#ff6b6b' : sn > .55 ? '#ffcf5a' : '#7fe0a0'; g.fill(); }
  const left2 = Math.max(0, def.spool - G.L);
  g.fillStyle = left2 < 60 ? '#ffb38a' : '#c9bfef'; g.fillText(`สายในม้วน ${th(Math.round(left2 / Kite.METER))} ม.`, x0 + 12, 54);
  const rb = Math.min(1, left2 / def.spool);
  rr(g, x0 + 128, 46, 102, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); if (rb > 0) { rr(g, x0 + 128, 46, Math.max(6, 102 * rb), 6, 3); g.fillStyle = '#bfe6ff'; g.fill(); }
  // the runner's sprint and the handler's tug, ready or not
  const rs = G.run.sprintCd > 0, tc = G.tugCd > 0;
  g.font = `600 11px ${FONT}`; g.textAlign = 'center';
  for (const [x, wait, text, id] of [[70, rs, 'วิ่งเร็ว', IS.roles.run], [VW - 70, tc, 'กระตุก', IS.roles.line]]) {
    panel(g, x - 52, VH - 26, 104, 20, 10, .72);
    g.fillStyle = wait ? 'rgba(255,255,255,.45)' : (id === 'pink' ? C.pink : C.mint); g.fillText(wait ? `${text} (รอ)` : `${text}ได้`, x, VH - 12);
  }
}

/* ---------- title list ---------- */
function renderKiteLevels() {
  let total = 0;
  $('#ilevels').innerHTML = ILEVELS.map((lv, i) => {
    const b = iBest(i), open = iOpen(i);
    if (b) total += b.s;
    const hs = b ? `<span class="st">${kStars(b.s)}</span> ${th(b.m)} แต้ม` : open ? 'ยังไม่เคยชัก' : 'ยังล็อกอยู่';
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-f="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
  }).join('');
  $('#iStarsAll').textContent = `ดาวรวม ${th(total)}/${th(ILEVELS.length * 3)}`;
  let next = ILEVELS.findIndex((l, i) => iOpen(i) && !(iBest(i) && iBest(i).s >= 3));
  if (next < 0) next = 0;
  $('#bGo').dataset.f = next;
  if (S.tab === 'kite') $('#bGo').textContent = iBest(next) ? `ชักว่าว${KFIELD(next)}` : 'ไปชักว่าว';
}
$('#ilevels').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b && !b.disabled) startKite(+b.dataset.f); });

/* ---------- online: the guest sends its stick and presses; the host flies the kite ---------- */
function onlineStartKite(i) {
  if (O.role !== 'host') return;
  O.md = 'i'; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
  loadOnlineLevel(true);
}
$('#oLevelsI').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b && !b.disabled) onlineStartKite(+b.dataset.f); });
function renderOnlineKite() {
  $('#oLevelsI').innerHTML = ILEVELS.map((lv, i) => {
    const b = iBest(i), open = iOpen(i);
    return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-f="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? 'ยังไม่เคยชัก' : 'ยังล็อกอยู่'}</span></button>`;
  }).join('');
}
function iEncode() {
  const G = IS.G;
  if (O.role === 'host') return Object.assign(Kite.encode(G), { ro: IS.roles.run === 'mint' ? 'm' : 'p' });
  const q = IS.lastInp || {}, r2 = v => Math.round((v || 0) * 100) / 100;
  return { mx: r2(q.mx), my: r2(q.my), a: IS.act.n };
}
function iHostHears(pr) {
  if (!IS.G || pr.ep !== O.ep || !pr.iw || typeof pr.iw !== 'object') return;
  const m = pr.iw, rq = IS.remote;
  rq.mx = Number.isFinite(m.mx) ? Math.max(-1, Math.min(1, m.mx)) : 0; rq.my = Number.isFinite(m.my) ? Math.max(-1, Math.min(1, m.my)) : 0;
  const a = Number.isInteger(m.a) ? m.a : 0;
  if (rq.seen < 0) rq.seen = a;
  if (a > rq.seen) { rq.seen = a; rq.act = true; }
}
function iGuestHears(pr) {
  const G = IS.G;
  if (!G || !pr.iw) return;
  Kite.apply(G, pr.iw, true);
  if (typeof pr.iw.ro === 'string') { const r = pr.iw.ro === 'm' ? { run: 'mint', line: 'pink' } : { run: 'pink', line: 'mint' }; if (r.run !== IS.roles.run) { IS.roles = r; iPadLabels(); } }
  iGuestDiff();
  if (G.over && !IS.endT && S.mode === 'play') { IS.endT = 2.2; iSave(); }
}

/* ---------- the newer modes (cinema, no farting, one blanket, the window, the trap run) share one flow ----------
   Each registers itself with xMode({...}); the hooks in the main code (frame, restart, next, title, online) go through
   MODES. What a mode brings: kind, md (online code), pres (its key in the presence message), dk (the level buttons'
   data attribute), L (levels), pk (where its stars are kept), label(i), Eng (the engine), pad ('x': two buttons a side,
   'k': joystick and buttons), optional R (two role names) with rk (where the choice is kept), and: tick(), snap(G),
   events(ev), render(dt), result(G, stars) -> { msg, stats }, score(G), encode(), hostHears(m), guestHears(m), and the
   words: word (the verb on the title button), fresh (a level not played yet), nextWord, againWord. */
const XK = { pink: { a: 0, b: 0, an: 0, bn: 0 }, mint: { a: 0, b: 0, an: 0, bn: 0 } };
const XKEY = { KeyA: ['pink', 'a'], KeyD: ['pink', 'b'], ArrowRight: ['mint', 'a'], ArrowLeft: ['mint', 'b'] };
// a button held (a/b) and presses since the last read (ap/bp)
function xRead(id) { const k = XK[id], r = { a: !!k.a, b: !!k.b, ap: k.an > 0, bp: k.bn > 0 }; k.an = 0; k.bn = 0; return r; }
function xRelease() { for (const id of ['pink', 'mint']) Object.assign(XK[id], { a: 0, b: 0, an: 0, bn: 0 }); xbtns.clear(); document.querySelectorAll('.xpad button.on').forEach(b => b.classList.remove('on')); }
function xKey(e, down) {
  const m = XKEY[e.code]; if (!m) return false;
  e.preventDefault();
  const id = O.role ? O.local : m[0], k = m[1];
  if (down) { if (e.repeat) return true; XK[id][k] = 1; XK[id][k + 'n']++; audio(); }
  else XK[id][k] = 0;
  return true;
}
const xpad = $('#xpad'), xbtns = new Map();
xpad.addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.preventDefault();
  const id = O.role ? O.local : b.closest('.side').dataset.p, k = b.dataset.k;
  b.classList.add('on'); xbtns.set(e.pointerId, { b, id, k });
  try { b.setPointerCapture(e.pointerId); } catch (err) {}
  XK[id][k] = 1; XK[id][k + 'n']++; audio();
});
for (const ev of ['pointerup', 'pointercancel']) xpad.addEventListener(ev, e => { const s = xbtns.get(e.pointerId); if (s) { s.b.classList.remove('on'); XK[s.id][s.k] = 0; xbtns.delete(e.pointerId); } });
xpad.addEventListener('contextmenu', e => e.preventDefault());

function xMode(m) {
  const st = m.st = { G: null, li: 0, acc: 0, endT: 0, savedB: null, floats: [], prev: null, lastInp: {}, n: { a: 0, b: 0 }, remote: {} };
  if (!prog[m.pk]) prog[m.pk] = {};
  m.best = i => prog[m.pk][m.L[i].name] || null;
  m.open = i => i === 0 || !!(m.best(i - 1) && m.best(i - 1).s >= 1);
  m.fresher = m.fresher || (() => ({ a: false, b: false, ap: false, bp: false, mx: 0, my: 0, act: false, use: false, seenA: -1, seenB: -1 }));
  // roles (two players doing different jobs): which colour does which, kept between games, swappable in the pause menu
  if (m.R) {
    st.roles = store.get(m.rk, 'pink') === 'mint' ? { [m.R[0]]: 'mint', [m.R[1]]: 'pink' } : { [m.R[0]]: 'pink', [m.R[1]]: 'mint' };
    m.roleOf = id => (st.roles[m.R[0]] === id ? m.R[0] : m.R[1]);
    m.swap = () => {
      if (O.role === 'guest') return;
      st.roles = { [m.R[0]]: st.roles[m.R[1]], [m.R[1]]: st.roles[m.R[0]] };
      store.set(m.rk, st.roles[m.R[0]]);
      xLabels(m); m.swapNote();
    };
    m.swapNote = () => { $('#bSwap').textContent = `สลับหน้าที่ (ตอนนี้ ${S.names[st.roles[m.R[0]]]} ${m.roleName[m.R[0]]})`; };
  }
  m.load = (i, net) => {
    st.li = i; st.G = m.Eng.load(m.L[i]); st.G.net = net || null;
    st.acc = 0; st.endT = 0; st.savedB = null; st.floats = []; st.lastInp = {}; st.remote = m.fresher();
    setKind(m.kind);
    S.parts = []; S.flash = 0; S.shake = 0; S.banner = 4.2;
    releaseAll(); releaseK(); xRelease();
    if (m.onLoad) m.onLoad(i);
    st.prev = m.snap(st.G); xLabels(m); xHud(m);
  };
  m.start = i => { readNames(); audio(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); m.load(i); showScreen(null); setMode('play'); };
  m.restart = () => { if (O.role) { onlineRestart(); return; } m.load(st.li); showScreen(null); setMode('play'); };
  m.next = () => {
    if (O.role === 'host') { if (st.li < m.L.length - 1) m.onlineStart(st.li + 1); return; }
    if (st.li < m.L.length - 1 && m.open(st.li + 1)) m.start(st.li + 1); else toTitle();
  };
  m.save = () => {
    if (st.savedB) return st.savedB;
    const G = st.G, lv = m.L[st.li], s = m.Eng.stars(G), sc = Math.round(m.score(G));
    const b = prog[m.pk][lv.name] || { s: 0, m: 0 };
    prog[m.pk][lv.name] = { s: Math.max(b.s, s), m: Math.max(b.m, sc) };
    store.set('prog2', prog);
    return (st.savedB = b);
  };
  m.results = () => {
    const G = st.G, lv = m.L[st.li], s = m.Eng.stars(G), sc = Math.round(m.score(G)), b = m.save(), best = sc > b.m;
    setMode('clear'); releaseAll(); releaseK(); xRelease();
    const r = m.result(G, s);
    $('#cNo').textContent = `${m.label(st.li)} · ${r.head}`;
    $('#cName').textContent = lv.name;
    $('#cStars').hidden = false;
    $('#cStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < s ? '' : 'off'}">★</span>`).join('');
    $('#cMsg').textContent = r.msg + (best && b.m ? ' · สถิติใหม่' : '');
    $('#cStats').innerHTML = r.stats;
    const lastL = st.li >= m.L.length - 1, guest = O.role === 'guest';
    $('#bNext').textContent = m.nextWord;
    $('#bNext').hidden = guest || lastL || !m.open(st.li + 1);
    $('#bAgain').hidden = guest;
    $('#bAgain').textContent = O.role === 'host' ? 'เลือกด่านอื่น' : m.againWord;
    $('#bLevels2').hidden = !!O.role; $('#bLeave2').hidden = !O.role;
    if (guest) $('#cMsg').textContent += ` · รอ${O.partnerName || 'อีกคน'}เลือกต่อ`;
    showScreen('clear');
  };
  m.frame = (dt, now) => {
    const G = st.G;
    if (S.mode === 'play' && G) {
      st.acc += dt;
      while (st.acc >= m.Eng.DT) {
        m.tick(); st.acc -= m.Eng.DT;
        if (G.over && !st.endT) { st.endT = 2.2; m.save(); }
        if (S.mode !== 'play') { st.acc = 0; break; }
      }
      if (st.endT > 0) { st.endT -= dt; if (st.endT <= 0) { st.endT = -1; m.results(); if (O.role === 'host') O.st = 'clear'; } }
    } else st.acc = 0;
    if (O.role) pumpOnline(now);
    if (S.mode === 'play') S.banner = Math.max(0, S.banner - dt);
    // count down with little bells: three, two, one, go
    if (S.mode === 'play' && G) {
      const n = G.st === 'count' ? Math.ceil(m.Eng.START - G.t) : 0;
      if (n !== st.cd) { if (n > 0 && n <= 3) chime(660, .2, .05); else if (n === 0 && st.cd > 0) { chime(1047, .5, .06); chime(1568, .5, .04, .03); sayBoth('go'); } st.cd = n; }
    }
    S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 3);
    stepParts(dt);
    for (const f of st.floats) { f.life -= dt; f.y -= dt * 22; }
    st.floats = st.floats.filter(f => f.life > 0);
    if (m.frameExtra && G) m.frameExtra(dt);
    if (G) xHud(m);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (G) m.render(dt);
  };
  // the guest: effects from the host's snapshots (the events the host's step gave, worked out from what changed)
  m.diff = () => { const n = m.snap(st.G); m.events(m.changes(st.prev || n, n)); st.prev = n; };
  m.renderLevels = () => {
    let total = 0;
    $('#' + m.list).innerHTML = m.L.map((lv, i) => {
      const b = m.best(i), open = m.open(i);
      if (b) total += b.s;
      const hs = b ? `<span class="st">${kStars(b.s)}</span> ${th(b.m)} แต้ม` : open ? m.fresh : 'ยังล็อกอยู่';
      return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-${m.dk}="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${hs}</span></button>`;
    }).join('');
    $('#' + m.starsAll).textContent = `ดาวรวม ${th(total)}/${th(m.L.length * 3)}`;
    let nx = m.L.findIndex((l, i) => m.open(i) && !(m.best(i) && m.best(i).s >= 3));
    if (nx < 0) nx = 0;
    $('#bGo').dataset[m.dk] = nx;
    if (S.tab === m.kind) $('#bGo').textContent = m.best(nx) ? `${m.word}${m.label(nx)}` : m.goWord;
  };
  m.renderOnline = () => {
    $('#' + m.olist).innerHTML = m.L.map((lv, i) => {
      const b = m.best(i), open = m.open(i);
      return `<button type="button" class="lv${b && b.s ? ' done' : ''}" data-${m.dk}="${i}"${open ? '' : ' disabled'}><span class="n">${th(i + 1)}</span><span class="nm">${lv.name}</span><span class="hs">${b ? `<span class="st">${kStars(b.s)}</span>` : open ? m.fresh : 'ยังล็อกอยู่'}</span></button>`;
    }).join('');
  };
  m.onlineStart = i => {
    if (O.role !== 'host') return;
    O.md = m.md; O.lv = i; O.ep++; O.st = 'play'; O.seenDead = O.partner ? (O.partner.dead | 0) : 0; O.seenRq = O.partner ? (O.partner.rq | 0) : 0;
    loadOnlineLevel(true);
  };
  m.hostHearsW = pr => { const q = pr[m.pres]; if (!st.G || pr.ep !== O.ep || !q || typeof q !== 'object') return; m.hostHears(q); };
  m.guestHearsW = pr => {
    const q = pr[m.pres]; if (!st.G || !q || typeof q !== 'object') return;
    if (m.R && typeof q.ro === 'string') { const first = q.ro === 'm' ? 'mint' : 'pink'; if (st.roles[m.R[0]] !== first) { st.roles = { [m.R[0]]: first, [m.R[1]]: first === 'pink' ? 'mint' : 'pink' }; xLabels(m); } }
    m.guestHears(q, pr); m.diff();
    if (st.G.over && !st.endT && S.mode === 'play') { st.endT = 2.2; m.save(); }
  };
  m.encodeW = () => (O.role === 'host' ? Object.assign(m.encode(), m.R ? { ro: st.roles[m.R[0]] === 'mint' ? 'm' : 'p' } : {}) : m.encode());
  $('#' + m.list).addEventListener('click', e => { const b = e.target.closest(`[data-${m.dk}]`); if (b && !b.disabled) m.start(+b.dataset[m.dk]); });
  $('#' + m.olist).addEventListener('click', e => { const b = e.target.closest(`[data-${m.dk}]`); if (b && !b.disabled) m.onlineStart(+b.dataset[m.dk]); });
  MODES[m.kind] = m;
  const ev0 = m.events; m.events = ev => { ev0(ev); try { voiceEv(m.kind, ev); } catch (e) {} };
  return m;
}
function xHud(m) {
  const k = m.kind + m.st.li; if (xHud.k === k) return; xHud.k = k;
  const lv = m.L[m.st.li];
  $('#hNo').textContent = m.label(m.st.li); $('#hName').textContent = lv.name; $('#hHint').textContent = lv.hint; $('#hHearts').textContent = '';
}
// the touch buttons' words, for whoever holds that side (online: both sides are this phone's player)
function xLabels(m) {
  if (m.pad === 'x') document.querySelectorAll('#xpad .side').forEach(sd => {
    const id = O.role ? (O.local || 'pink') : sd.dataset.p, w = m.xWords(id);
    sd.querySelectorAll('button').forEach(b => { b.querySelector('i').innerHTML = w[b.dataset.k]; b.dataset.w = m.R ? m.roleOf(id) : ''; });
  });
  else document.querySelectorAll('.kpad .kb').forEach(b => {
    const id = b.dataset.p === 'local' ? (O.local || 'pink') : b.dataset.p, w = m.kWords(id);
    b.innerHTML = w[b.dataset.k] || '';
  });
  if (m.chips) m.chips();
}
const xFloat = (m, text, x, y, col, size = 18, life = 1.4) => m.st.floats.push({ text, x, y, col, life, max: life, size });
function xDrawFloats(g, m) {
  for (const f of m.st.floats) {
    g.globalAlpha = Math.min(1, f.life * 2.5); g.textAlign = 'center'; g.font = `400 ${f.size}px ${FONT_D}`; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.85)';
    g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y); g.globalAlpha = 1;
  }
}
function xCountdown(g, G, START) {
  if (G.st !== 'count') return;
  const left = START - G.t, n = Math.ceil(left), f = left - Math.floor(left), pop = 1 + Math.max(0, f - .72) * 1.8;
  g.save(); g.translate(VW / 2, VH / 2); g.scale(pop, pop);
  g.strokeStyle = hexA(C.gold, .4 * f); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 46 + (1 - f) * 34, 0, Math.PI * 2); g.stroke();
  g.font = `400 54px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(21,18,43,.7)';
  g.strokeText(th(n), 0, 20); g.fillStyle = C.gold; g.fillText(th(n), 0, 20);
  g.restore();
}
function xBannerDraw(g, G, START, title, line) {
  if (!(S.banner > 0 && G.t < START + 3)) return;
  g.font = `600 12px ${FONT}`; const w = Math.max(420, g.measureText(line).width + 40);
  g.globalAlpha = Math.min(1, S.banner * 1.5); panel(g, VW / 2 - w / 2, 150, w, 60, 14, .88);
  g.textAlign = 'center'; g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(title, VW / 2, 176);
  const tw = g.measureText(title).width / 2 + 16; g.fillStyle = C.pink; heartPath(g, VW / 2 - tw, 169, 5); g.fill(); heartPath(g, VW / 2 + tw, 169, 5); g.fill();
  g.font = `600 12px ${FONT}`; g.fillStyle = C.paper; g.fillText(line, VW / 2, 198);
  g.globalAlpha = 1;
}
// a box at the top left: time left, points and the star bar
function xScoreBox(g, left, score, stars, extra) {
  panel(g, 8, 8, 236, 58, 12, .82);
  g.textAlign = 'left'; g.font = `400 18px ${FONT_D}`; g.fillStyle = left < 10 ? '#ff8a8a' : C.paper;
  g.fillText(`${th(Math.floor(left / 60))}:${th(String(Math.floor(left % 60)).padStart(2, '0'))}`, 18, 32);
  g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText(`${th(Math.round(score))}`, 84, 33);
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(extra || 'แต้ม', 150, 30);
  const kk = Math.min(1, score / stars[2]), bx = 18, bw = 216;
  rr(g, bx, 44, bw, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); if (kk > 0) { rr(g, bx, 44, Math.max(6, bw * kk), 6, 3); g.fillStyle = C.gold; g.fill(); }
  g.font = `400 10px ${FONT}`; g.textAlign = 'center';
  for (let i = 0; i < 3; i++) { g.fillStyle = score >= stars[i] ? C.gold : 'rgba(255,255,255,.45)'; g.fillText('★', bx + bw * stars[i] / stars[2] - (i === 2 ? 4 : 0), 62); }
}
// strikes left, as little hearts (grey once used), in a box ending at the right edge
function xStrikes(g, y, n, max, label) {
  const w = 22 * max + 14 + (label ? 70 : 0), x = VW - 8 - w;
  panel(g, x, y - 16, w, 26, 12, .82);
  if (label) { g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText(label, x + 10, y + 2); }
  for (let i = 0; i < max; i++) { g.fillStyle = i < max - n ? C.pink : 'rgba(255,255,255,.2)'; heartPath(g, x + (label ? 70 : 0) + 16 + i * 22, y - 2, 7); g.fill(); }
}
// a speech bubble with a hint for one player (shown on their own phone only online)
function xTip(g, id, text, x, y) {
  if (O.role && id !== O.local) return;
  g.font = `600 12px ${FONT}`; const tw = g.measureText(text).width + 14;
  panel(g, x - tw / 2, y - 15, tw, 20, 10, .88); g.fillStyle = id === 'pink' ? C.pink : C.mint; g.textAlign = 'center'; g.fillText(text, x, y);
}
// press counters: a guest's presses arrive as running totals; a new total is a new press
function xHeard(rq, key, n) {
  const a = Number.isInteger(n) ? n : 0, s = 'seen' + key;
  if (rq[s] < 0) { rq[s] = a; return false; }
  if (a > rq[s]) { rq[s] = a; return true; }
  return false;
}
const xNum = (v, lo, hi, d = 0) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);

/* ---------- Sneaking a kiss at the cinema (แอบจุ๊บในโรงหนัง) ---------- */
Object.assign(sfx, {
  ckiss() { tone(700, .09, 'sine', .05, 1300); noise(.05, 2600, .02, 'bandpass', 2); chime(1568, .3, .02, .06); },
  ccombo() { chime(1175, .3, .04); chime(1568, .4, .04, .08); },
  cpop() { for (let i = 0; i < 3; i++) { noise(.025, 1800 + Math.random() * 1200, .03, 'bandpass', 2, 0, i * .04 + Math.random() * .02); } },
  ctell() { tone(330, .14, 'triangle', .03, 380); },
  ccaught() { tone(760, .22, 'triangle', .05, 300); tone(240, .3, 'triangle', .05, 160, .12); noise(.15, 1500, .02, 'bandpass', 1.5, 0, .05); },
  csaved() { chime(880, .25, .04); },
  cscare() { noise(.7, 1600, .06, 'bandpass', .8, 300); tone(1300, .45, 'sawtooth', .035, 500); tone(60, .6, 'sine', .1, 40); },
  chug() { chime(660, .35, .05); chime(990, .45, .04, .1); },
  cboom() { noise(.9, 450, .08, 'lowpass', .6, 70); tone(60 + Math.random() * 30, .4, 'sine', .08, 35); },
  cout() { [523, 440, 349, 262].forEach((f, i) => tone(f, .24, 'triangle', .05, 0, i * .16)); }
});
const CROOM = { L: 452, R: 508 };                                     // where pink and mint sit (head x)
// where each kind of watcher sits: x, the head's y, head size
const CSEAT = { aunt: { x: 380, y: 226, r: 15 }, phone: { x: 262, y: 228, r: 14 }, kid: { x: 578, y: 340, r: 14 }, guy: { x: 648, y: 466, r: 27 }, usher: { x: 884, y: 380, r: 16 } };
const CM = xMode({
  kind: 'cin', md: 'c', pres: 'cw', dk: 'c', L: CLEVELS, pk: 'c', Eng: Cin, pad: 'x', list: 'clevels', olist: 'oLevelsC', starsAll: 'cStarsAll',
  label: i => 'รอบที่ ' + th(i + 1), word: 'ดู', goWord: 'ไปดูหนัง', fresh: 'ยังไม่เคยดู', nextWord: 'รอบถัดไป', againWord: 'ดูรอบนี้อีกครั้ง',
  score: G => G.score,
  xWords: () => ({ b: 'เอียง<br>หา', a: 'ป๊อป<br>คอร์น' }),
  onLoad() { CM.st.gl = 0; CM.st.jump = 0; CM.st.boomT = 1; CM.st.sc = -1; CM.st.ws = CM.st.G.def.watchers.map(() => 'idle'); },
  snap: G => ({ st: G.st, ki: G.kissing, mu: Cin.mult(G.kiss), sh: [G.shield.pink, G.shield.mint], caught: G.stats.caught, saves: G.stats.saves, hugs: G.stats.hugs, over: G.over, kicked: G.kicked }),
  changes(p, n) {
    const ev = [];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.ki && !p.ki) ev.push('kiss'); else if (!n.ki && p.ki) ev.push('part');
    if (n.ki && n.mu > p.mu) ev.push('combo:' + n.mu);
    ['pink', 'mint'].forEach((w, i) => { if (n.sh[i] > p.sh[i] + 0.5) ev.push('shield:' + w); });
    if (n.caught > p.caught) ev.push('caught:' + CM.st.G.caughtBy);
    if (n.saves > p.saves) ev.push('saved:-1');
    if (n.hugs > p.hugs) ev.push('hug:0');
    if (n.over && !p.over) ev.push(n.kicked ? 'kicked' : 'end');
    return ev;
  },
  events(ev) {
    const G = CM.st.G;
    for (const e of ev) {
      const [k, a] = e.split(':');
      if (k === 'go') sfx.ilaunch();
      else if (k === 'kiss') { sfx.ckiss(); burst(480, 300, 8, C.pink, { type: 'heart', size: 4, speed: 60, up: 90, life: 1, g: -40 }); }
      else if (k === 'combo') { sfx.ccombo(); xFloat(CM, `จุ๊บนาน ×${a === '2' ? th(2) : '๑.๕'}`, 480, 270, C.gold, 20); }
      else if (k === 'shield') sfx.cpop();
      else if (k === 'caught') {
        sfx.ccaught(); S.shake = Math.max(S.shake, .5); S.flash = .5;
        const w = G.def.watchers[+a], s = w ? CSEAT[w.kind] : null;
        xFloat(CM, ['เห็นนะ!', 'แหม!', 'อุ๊ย!', 'ทำอะไรกัน!'][(G.strikes + (+a || 0)) % 4], s ? s.x : 480, s ? s.y - 30 : 260, '#ff8a8a', 22, 1.6);
      } else if (k === 'saved') { sfx.csaved(); xFloat(CM, 'ป๊อปคอร์นบังทัน!', 480, 280, '#ffe08a', 18); }
      else if (k === 'hug') { sfx.chug(); xFloat(CM, `กอดกัน +${th(Cin.HUG)}`, 480, 280, C.mint, 20); }
      else if (k === 'kicked') { sfx.cout(); xFloat(CM, 'โดนเชิญออกจากโรง!', 480, 250, '#ff8a8a', 26, 2.2); }
      else if (k === 'end') sfx.win();
    }
  },
  tick() {
    const st = CM.st, G = st.G;
    if (!O.role) { const p = xRead('pink'), m = xRead('mint'); CM.events(Cin.step(G, { pink: { lean: p.b, shield: p.ap }, mint: { lean: m.b, shield: m.ap } })); st.prev = CM.snap(G); return; }
    const li = xRead(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      CM.events(Cin.step(G, { [O.local]: { lean: li.b, shield: li.ap }, [rid]: { lean: rq.b, leanV: rq.lv, shield: rq.ap } }));
      rq.ap = false; st.prev = CM.snap(G);
    } else {
      // the guest leans its own person at once; the rest is the host's word
      if (li.ap) st.n.a++;
      st.gl = Cin.leanStep(st.gl, li.b && G.st === 'run', G);
      Cin.step(G, { [O.local]: { lean: li.b, leanV: st.gl }, [rid]: { lean: G.held[rid] } }, true);
    }
  },
  frameExtra(dt) {
    const st = CM.st, G = st.G, def = G.def;
    st.jump = Math.max(0, st.jump - dt * 2.5);
    // the watchers' tells and looks (everyone works these out from the same clock)
    def.watchers.forEach((w, i) => { const s = O.role === 'guest' ? Cin.watchState(G, i).st : G.ws[i].st; if (s !== st.ws[i]) { if (s === 'tell' && S.mode === 'play') sfx.ctell(); st.ws[i] = s; } });
    // a jump scare: the film's ghost, a scream, everyone jumps
    const sc = (def.scares || []).findIndex(s => G.t - Cin.START >= s && G.t - Cin.START < s + 0.2);
    if (sc >= 0 && sc !== st.sc && S.mode === 'play') { st.sc = sc; sfx.cscare(); st.jump = 1; S.shake = Math.max(S.shake, .6); S.flash = .6; }
    if (Cin.sceneAt(def, G.t) === 'loud' && S.mode === 'play' && G.st === 'run') { st.boomT -= dt; if (st.boomT <= 0) { st.boomT = 0.7 + Math.random() * 1.4; sfx.cboom(); S.shake = Math.max(S.shake, .25); } }
  },
  result(G, s) {
    const sx = G.stats, msg = G.kicked ? (s ? 'โดนเชิญออกจากโรงก่อนหนังจบ แต่แต้มที่จุ๊บได้ยังอยู่' : 'โดนเห็นครบสามครั้ง พนักงานเชิญออกจากโรง ครั้งหน้าหัวเริ่มหันเมื่อไหร่ให้ถอยทันที')
      : s === 3 ? 'จุ๊บกันได้ทั้งเรื่องโดยไม่มีใครรู้ เนียนมาก' : s === 2 ? (sx.caught ? 'เกือบเนียนแล้ว ถ้าไม่โดนเห็นจะได้สามดาว' : 'เนียนดี ลองจุ๊บให้นานกว่านี้ตอนฉากมืดกับฉากเสียงดัง')
      : s === 1 ? 'ผ่านแล้ว รอบถัดไปเปิดให้ดูแล้ว' : `ยังจุ๊บได้น้อยไป ต้องได้ ${th(G.def.stars[0])} แต้ม เอียงเข้าหากันตอนที่ไม่มีใครมอง`;
    return { head: G.kicked ? 'โดนเชิญออก' : 'หนังจบ', msg,
      stats: `<span>แต้ม <b>${th(Math.round(G.score))}</b></span><span>จุ๊บ <b>${th(sx.kisses)}</b> ครั้ง นานสุด <b>${th(Math.round(sx.longest))}</b> วิ</span><span>โดนเห็น <b>${th(sx.caught)}</b> กอดตอนผีออก <b>${th(sx.hugs)}</b></span>` };
  },
  encode() {
    const st = CM.st;
    if (O.role === 'host') return Cin.encode(st.G);
    return { b: st.lastInp.b ? 1 : 0, lv: Math.round(st.gl * 1000) / 1000, an: st.n.a };
  },
  hostHears(m) { const rq = CM.st.remote; rq.b = !!m.b; rq.lv = xNum(m.lv, 0, 1, rq.lv || 0); if (xHeard(rq, 'A', m.an)) rq.ap = true; },
  guestHears(m) { Cin.apply(CM.st.G, m, O.local); },
  fresher: () => ({ b: false, lv: 0, ap: false, seenA: -1 }),
  render: cinRender
});

function cinRender() {
  const g = ctx, st = CM.st, G = st.G, def = G.def, t = G.t;
  const scene = G.st === 'count' ? 'dark' : Cin.sceneAt(def, t), scare = Cin.scareAt(def, t);
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0, oy = 0; if (S.shake > 0) { ox = (Math.random() - .5) * 8 * S.shake; oy = (Math.random() - .5) * 5 * S.shake; }
  const flick = scene === 'loud' ? 0.5 + 0.5 * Math.abs(Math.sin(S.time * 9) * Math.sin(S.time * 3.3)) : 0;
  const light = scare ? 1 : scene === 'bright' ? 0.9 : scene === 'loud' ? 0.35 + 0.4 * flick : scene === 'quiet' ? 0.3 : 0.12;
  // the room
  stamp(g, 'cinRoom', '', 0, 0, VW, VH, q => { const bg = q.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#1a1430'); bg.addColorStop(1, '#2e2148'); q.fillStyle = bg; q.fillRect(0, 0, VW, VH); cinRoom(q); }, true);
  g.save(); g.translate(ox, oy);
  // the screen and what is on it
  cinScreen(g, scene, scare, t, flick);
  stamp(g, 'cinCurtains', '', 0, 0, VW, 170, cinCurtains);
  // the projector's beam (from behind us, over everyone's heads)
  const beam = g.createLinearGradient(0, VH, 0, 150); beam.addColorStop(0, 'rgba(255,255,255,0)'); beam.addColorStop(1, `rgba(220,230,255,${0.05 + light * 0.08})`);
  g.fillStyle = beam; g.beginPath(); g.moveTo(470, VH); g.lineTo(490, VH); g.lineTo(780, 150); g.lineTo(180, 150); g.closePath(); g.fill();
  // dust drifting in the beam
  g.fillStyle = '#fff';
  for (let i = 0; i < 26; i++) {
    const hh = hash(i, 21), v = ((hh % 1000) / 1000 + S.time * .015 * (1 + i % 3)) % 1, w = Math.sin(hh + S.time * .3) * .85, y = VH - v * (VH - 150), x = 480 + w * (10 + v * 290);
    g.globalAlpha = (.12 + light * .3) * Math.sin(v * Math.PI); g.fillRect(x, y, 1.6, 1.6);
  }
  g.globalAlpha = 1;
  // seats: three rows seen from behind, the couple's in the middle
  const rows = [{ y: 250, h: 26, k: 0.62, seats: [140, 204, 268, 332, 396, 460, 524, 588, 652, 716, 780] }, { y: 362, h: 34, k: 0.82, seats: [196, 260, 324, 388, CROOM.L, CROOM.R, 578, 642, 706, 770] }, { y: 502, h: 46, k: 1.1, seats: [150, 240, 330, 420, 520, 640, 740, 830] }];
  const jump = st.jump > 0 ? Math.sin(st.jump * Math.PI) * 7 : 0;
  rows.forEach((row, ri) => {
    // who sits in this row (people from behind, then the watchers, then the couple in the middle row)
    for (const x of row.seats) {
      if (ri === 1 && (x === CROOM.L || x === CROOM.R)) continue;
      const w = def.watchers.find(q => Math.abs(CSEAT[q.kind].x - x) < 34 && Math.abs(CSEAT[q.kind].y - (row.y - row.h)) < 40);
      if (w || (x * 7 + ri * 13) % 5 === 0) continue;                // an empty seat now and then
      cinBack(g, x, row.y - row.h * .7 - jump, 13 * row.k, (x * 31 + ri) % 4);
    }
    def.watchers.forEach((w, i) => { const s = CSEAT[w.kind]; if (w.kind !== 'usher' && Math.abs(s.y - (row.y - row.h)) < 40) cinWatcher(g, w, i, s, jump); });
    if (ri === 1) cinCouple(g, G, jump);
    const k = row.k, sy = row.y - row.h * .55, sg = g.createLinearGradient(0, sy, 0, sy + row.h);
    sg.addColorStop(0, '#9a3a4c'); sg.addColorStop(1, '#561a2b');
    for (const x of row.seats) {
      const sx = x - 27 * k;
      rr(g, sx, sy, 54 * k, row.h, 8 * k); g.fillStyle = sg; g.fill();
      g.fillStyle = '#b24e60'; rr(g, x - 25 * k, sy, 50 * k, 7 * k, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; rr(g, x - 19 * k, sy + 1.5 * k, 20 * k, 2.4 * k, 1.2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 9 * k, sy + 10 * k); g.lineTo(x - 9 * k, sy + row.h - 4); g.moveTo(x + 9 * k, sy + 10 * k); g.lineTo(x + 9 * k, sy + row.h - 4); g.stroke();
    }
  });
  // the usher in the aisle on the right, with a torch
  def.watchers.forEach((w, i) => { if (w.kind === 'usher') cinUsher(g, G, w, i); });
  // the room light: the brighter the film, the more anyone can see
  g.fillStyle = `rgba(5,3,14,${0.32 * (1 - light)})`; g.fillRect(-10, 150, VW + 20, VH);
  if (scene === 'bright' || scare) { g.fillStyle = `rgba(255,245,220,${scare ? 0.12 : 0.06})`; g.fillRect(-10, 0, VW + 20, VH); }
  // how much they show: an eye over them when anyone looking now would see
  if (G.st === 'run' && Cin.visibility(G) > Cin.showAt(G) && !G.blush) {
    const looking = G.ws.some(w => w.st === 'look'), y = 268 - jump;
    g.globalAlpha = looking ? 1 : 0.55 + 0.3 * Math.sin(S.time * 6);
    g.fillStyle = looking ? '#ff6b6b' : '#ffe08a'; g.beginPath(); g.ellipse(480, y, 13, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1530'; g.beginPath(); g.arc(480, y, 3.6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  }
  g.restore();
  drawParts(g);
  xDrawFloats(g, CM);
  cinHud(g, G);
  xCountdown(g, G, Cin.START);
  xBannerDraw(g, G, Cin.START, def.name, `กดค้างเอียงเข้าหากันจนสุดพร้อมกันคือจุ๊บ · หัวคนเริ่มหันเมื่อไหร่ให้ถอย · ${S.names.pink}ดูฝั่งซ้าย ${S.names.mint}ดูฝั่งขวา`);
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * .35})`; g.fillRect(0, 0, VW, VH); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
// the screen: a trapezoid at the top; the film's mood decides what is on it
function cinScreen(g, scene, scare, t, flick) {
  g.save(); g.beginPath(); g.moveTo(200, 14); g.lineTo(760, 14); g.lineTo(790, 150); g.lineTo(170, 150); g.closePath(); g.clip();
  const sk = g.createLinearGradient(0, 14, 0, 150);
  if (scare) { sk.addColorStop(0, '#2a0c12'); sk.addColorStop(1, '#5a1420'); }
  else if (scene === 'bright') { sk.addColorStop(0, '#fff7d6'); sk.addColorStop(1, '#ffd98a'); }
  else if (scene === 'loud') { sk.addColorStop(0, '#3a1a10'); sk.addColorStop(1, `rgb(${200 + 55 * flick},${90 + 60 * flick},30)`); }
  else if (scene === 'quiet') { sk.addColorStop(0, '#4a6a9a'); sk.addColorStop(1, '#8fb0c8'); }
  else { sk.addColorStop(0, '#0b1230'); sk.addColorStop(1, '#1d2a50'); }
  g.fillStyle = sk; g.fillRect(160, 10, 640, 150);
  if (scare) {
    // the ghost lunges at the camera
    const k = 1 + Math.min(1, (S.time * 3) % 1) * 0.15;
    g.fillStyle = '#f2f0ff'; g.beginPath(); g.ellipse(480, 92, 70 * k, 64 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#100810'; g.beginPath(); g.ellipse(452, 80, 13 * k, 18 * k, 0, 0, Math.PI * 2); g.ellipse(508, 80, 13 * k, 18 * k, 0, 0, Math.PI * 2); g.ellipse(480, 120, 16 * k, 22 * k, 0, 0, Math.PI * 2); g.fill();
  } else if (scene === 'loud') {
    for (let i = 0; i < 3; i++) { const x = 260 + i * 220 + Math.sin(t * 2 + i) * 30, r = 26 + 22 * Math.abs(Math.sin(t * 4 + i * 2)); g.fillStyle = `rgba(255,${200 - i * 40},80,.85)`; g.beginPath(); g.arc(x, 120, r, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,250,200,.9)'; g.beginPath(); g.arc(x, 120, r * .45, 0, Math.PI * 2); g.fill(); }
    g.font = `400 26px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,200,.9)'; g.fillText('ตูม!', 480 + Math.sin(t * 7) * 20, 60);
  } else if (scene === 'bright') {
    g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(640, 50, 26, 0, Math.PI * 2); g.fill();
    // a rainbow over green hills, and a pair of butterflies
    g.lineWidth = 7; ['#ff9a9a', '#ffd27a', '#fff3a0', '#9be07a', '#7fd0ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = hexA(c, .7); g.beginPath(); g.arc(380, 160, 110 - i * 7, Math.PI, 0); g.stroke(); });
    g.fillStyle = '#c9e7a2'; g.beginPath(); g.moveTo(160, 150); for (let x = 160; x <= 800; x += 40) g.lineTo(x, 118 - 14 * Math.sin(x / 60)); g.lineTo(800, 150); g.fill();
    for (let i = 0; i < 2; i++) { const bx = 520 + i * 26 + Math.sin(t * 1.3 + i) * 30, by = 80 + Math.cos(t * 1.7 + i * 2) * 14, f = Math.abs(Math.sin(t * 12 + i)); g.fillStyle = i ? '#ff8fb8' : '#7fd0ff'; g.beginPath(); g.ellipse(bx - 4 * f, by, 4 * f + 1, 5, 0, 0, Math.PI * 2); g.ellipse(bx + 4 * f, by, 4 * f + 1, 5, 0, 0, Math.PI * 2); g.fill(); }
  } else if (scene === 'quiet') {
    // two people talking on a bench
    g.fillStyle = '#2a3a55'; g.fillRect(160, 128, 640, 30); g.fillStyle = '#6a4a3a'; g.fillRect(410, 112, 140, 8);
    g.fillStyle = 'rgba(255,240,200,.85)'; g.beginPath(); g.arc(650, 44, 16, 0, Math.PI * 2); g.fill();
    for (const [x, c, sh] of [[452, '#e9c6a2', '#ff8fb8'], [508, '#d9b08c', '#7fd0ff']]) { g.fillStyle = sh; rr(g, x - 13, 82, 26, 32, 8); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, 72, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a2a24'; g.beginPath(); g.arc(x, 68, 11, Math.PI, 0); g.fill(); }
    for (let i = 0; i < 3; i++) { const u = ((t * .35 + i / 3) % 1), hy = 70 - u * 50; g.fillStyle = `rgba(255,120,170,${1 - u})`; heartPath(g, 480 + Math.sin(u * 8 + i) * 6, hy, 4 + u * 3); g.fill(); }
  } else {
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 14; i++) g.fillRect(180 + (i * 97) % 600, 24 + (i * 53) % 90, 2, 2);
    g.fillStyle = '#f2f0d0'; g.beginPath(); g.arc(300, 50, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = sk; g.beginPath(); g.arc(306, 46, 12, 0, Math.PI * 2); g.fill();
    // a shooting star now and then
    { const u = (t * .4) % 3; if (u < 1) { const x = 700 - u * 260, y = 30 + u * 60; g.strokeStyle = 'rgba(255,250,220,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40, y - 9); g.stroke(); g.fillStyle = '#fffbe0'; twinkle(g, x, y, 4); } }
  }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(200, 14); g.lineTo(760, 14); g.lineTo(790, 150); g.lineTo(170, 150); g.closePath(); g.stroke();
}
// someone seen from behind (a dark head with a shine, ears, a bit of shoulder)
function cinBack(g, x, y, r, v) {
  g.fillStyle = ['#4a3e60', '#55486a', '#463a58', '#5a4c6e'][v]; rr(g, x - r * 1.6, y + r * .6, r * 3.2, r * 2, r); g.fill();
  g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, x - r * 1.3, y + r * .7, r * 2.6, r * .45, r * .22); g.fill();
  g.fillStyle = '#9a7460'; g.beginPath(); g.arc(x - r * .95, y + r * .15, r * .24, 0, Math.PI * 2); g.arc(x + r * .95, y + r * .15, r * .24, 0, Math.PI * 2); g.fill();
  g.fillStyle = ['#2e2438', '#4a3226', '#3a2e28', '#5a4230'][v]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - r * .35, y - r * .45, r * .36, r * .18, -.5, 0, Math.PI * 2); g.fill();
}
// the walls: soft panels, warm sconces, little lights along the aisle steps
function cinRoom(g) {
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const w = 54, x = sd < 0 ? 18 + k * 66 : VW - 18 - k * 66 - w, y = 26 + k * 8, h = 118 - k * 8;
      const pg = g.createLinearGradient(x, 0, x + w, 0); pg.addColorStop(0, '#2c2148'); pg.addColorStop(.5, '#382a5a'); pg.addColorStop(1, '#2c2148');
      rr(g, x, y, w, h, 10); g.fillStyle = pg; g.fill(); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.18)'; for (let q = 1; q < 3; q++) { g.beginPath(); g.moveTo(x + q * w / 3, y + 6); g.lineTo(x + q * w / 3, y + h - 6); g.stroke(); }
    }
    const lx = sd < 0 ? 78 : VW - 78, ly = 160, gl = g.createRadialGradient(lx, ly, 2, lx, ly, 70); gl.addColorStop(0, 'rgba(255,190,120,.28)'); gl.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gl; g.fillRect(lx - 70, ly - 70, 140, 140);
    g.fillStyle = '#d9a54a'; g.beginPath(); g.arc(lx, ly + 4, 9, Math.PI, 0); g.fill(); g.fillStyle = '#ffe2a8'; g.beginPath(); g.ellipse(lx, ly + 4, 9, 2.5, 0, 0, Math.PI * 2); g.fill();
    // aisle step lights
    for (let q = 0; q < 6; q++) {
      const u = q / 5, x = sd < 0 ? 108 - u * 56 : VW - 108 + u * 56, y = 190 + u * 330;
      const sg = g.createRadialGradient(x, y, 1, x, y, 14); sg.addColorStop(0, 'rgba(255,200,110,.45)'); sg.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = sg; g.fillRect(x - 14, y - 14, 28, 28); g.fillStyle = '#ffd890'; rr(g, x - 5, y - 1.5, 10, 3, 1.5); g.fill();
    }
  }
}
// red velvet drapes either side of the screen and a scalloped valance
function cinCurtains(g) {
  for (const sd of [-1, 1]) {
    const X = x => sd < 0 ? x : VW - x;
    const cg = g.createLinearGradient(X(118), 0, X(214), 0); cg.addColorStop(0, '#5a1430'); cg.addColorStop(.55, '#a52b4f'); cg.addColorStop(1, '#6a1838');
    g.fillStyle = cg; g.beginPath(); g.moveTo(X(118), 0); g.lineTo(X(216), 0); g.quadraticCurveTo(X(176), 80, X(190), 164); g.lineTo(X(118), 164); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2;
    for (let q = 1; q < 4; q++) { g.beginPath(); g.moveTo(X(118 + q * 24), 0); g.quadraticCurveTo(X(118 + q * 16), 80, X(126 + q * 18), 164); g.stroke(); }
    g.fillStyle = '#ffcf5a'; g.beginPath(); g.ellipse(X(166), 112, 4, 10, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#7a1d3a'; g.fillRect(0, 0, VW, 8);
  for (let x = 0; x < VW; x += 32) { g.beginPath(); g.arc(x + 16, 8, 16, 0, Math.PI); g.fill(); }
  g.fillStyle = 'rgba(255,207,90,.65)'; for (let x = 0; x < VW; x += 32) { g.beginPath(); g.arc(x + 16, 25, 2.2, 0, Math.PI * 2); g.fill(); }
}
// a watcher: from behind when not interested; turning (the tell), then looking right at the couple
function cinWatcher(g, w, i, s, jump) {
  const G = CM.st.G, ws = O.role === 'guest' ? Cin.watchState(G, i) : G.ws[i], state = ws.st, r = s.r, x = s.x, y = s.y - (w.kind === 'guy' ? jump * 1.4 : jump);
  const side = w.side === 'L' ? 'pink' : 'mint', dir = x < 480 ? 1 : -1;            // which way they turn to look at the couple
  const turn = state === 'look' ? 1 : state === 'tell' ? 0.45 + 0.1 * Math.sin(S.time * 10) : 0;
  const body = { aunt: '#7a3f6a', phone: '#3f5a7a', kid: '#e8a33a', guy: '#3a4a3a' }[w.kind] || '#444';
  g.fillStyle = body; rr(g, x - r * 1.6, y + r * .6, r * 3.2, r * 2.1, r); g.fill();
  const hair = { aunt: '#8a7a7a', phone: '#3a2e28', kid: '#5a3a22', guy: '#2e2438' }[w.kind];
  g.fillStyle = hair; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  if (w.kind === 'aunt') { g.beginPath(); g.arc(x, y - r * 1.05, r * .5, 0, Math.PI * 2); g.fill(); }
  if (w.kind === 'kid') { g.fillStyle = '#e8574f'; g.beginPath(); g.arc(x, y - r * .3, r * .95, Math.PI, 0); g.fill(); g.fillRect(x - dir * r * 1.4, y - r * .4, r * 1.2 * dir, r * .25); }
  if (turn > 0) {
    // the face coming round
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#e8c3a0'; g.beginPath(); g.ellipse(x + dir * r * (1 - turn) * 1.1, y + r * .15, r * (0.35 + turn * .6), r * .9, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    if (turn > 0.7) {
      const ex = x + dir * r * .25;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex - r * .3, y, r * .2, r * .24, 0, 0, Math.PI * 2); g.ellipse(ex + r * .3, y, r * .2, r * .24, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1530'; g.beginPath(); g.arc(ex - r * .3 + dir * r * .08, y + 1, r * .11, 0, Math.PI * 2); g.arc(ex + r * .3 + dir * r * .08, y + 1, r * .11, 0, Math.PI * 2); g.fill();
      if (w.kind === 'aunt') { g.strokeStyle = '#d9cfe9'; g.lineWidth = 1.2; g.beginPath(); g.arc(ex - r * .3, y, r * .28, 0, Math.PI * 2); g.arc(ex + r * .3, y, r * .28, 0, Math.PI * 2); g.stroke(); }
    }
  }
  if (w.kind === 'phone') {
    const up = state === 'idle' ? 0 : 1, px = x + dir * r * 1.1, py = y + r * (1.4 - up * 1.4);
    g.fillStyle = '#222'; rr(g, px - 5, py - 9, 10, 18, 2); g.fill();
    g.fillStyle = state === 'tell' ? 'rgba(160,220,255,.9)' : '#556'; g.fillRect(px - 4, py - 7, 8, 13);
    if (state === 'look') { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(px, py - 6, 9 + 4 * Math.sin(S.time * 30), 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,240,.12)'; g.fillRect(-10, 150, VW + 20, VH); }
  }
  // whose to watch: a little marker in their colour; a warning while they turn, a stare while they look
  g.fillStyle = side === 'pink' ? C.pink : C.mint; g.beginPath(); g.moveTo(x - 5, y - r - 8); g.lineTo(x + 5, y - r - 8); g.lineTo(x, y - r - 2); g.fill();
  if (state === 'tell') { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ffe08a'; g.fillText('?', x + dir * (r + 8), y - r); }
  else if (state === 'look') { g.font = `400 18px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ff8a8a'; g.fillText('!', x + dir * (r + 8), y - r); }
}
function cinUsher(g, G, w, i) {
  const ws = O.role === 'guest' ? Cin.watchState(G, i) : G.ws[i], s = CSEAT.usher;
  // walks up the aisle during the tell, stands and shines the torch along the row during the look
  const k = ws.st === 'tell' ? 1 - Math.min(1, ws.left / w.tell) : ws.st === 'look' ? 1 : 0;
  if (ws.st === 'idle') return;
  const x = s.x, y = VH + 40 - (VH + 40 - s.y) * k, r = s.r;
  g.fillStyle = '#20304a'; rr(g, x - r * 1.5, y + r * .6, r * 3, r * 3, r); g.fill();
  g.fillStyle = '#e8c3a0'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#20304a'; g.fillRect(x - r, y - r, r * 2, r * .6); g.fillRect(x - r * 1.3, y - r * .45, r * 2.6, r * .25);
  const tx = x - r * 1.4, ty = y + r * 1.4;
  g.fillStyle = '#ccc'; g.fillRect(tx - 8, ty - 3, 12, 6);
  // the torch beam: sweeping along the floor while walking, along the couple's row while looking
  const aim = ws.st === 'look' ? { x: 480, y: 330 } : { x: tx - 120, y: ty + 40 + Math.sin(S.time * 3) * 20 };
  const a = Math.atan2(aim.y - ty, aim.x - tx), L = Math.hypot(aim.x - tx, aim.y - ty) + 60;
  g.fillStyle = ws.st === 'look' ? 'rgba(255,245,190,.28)' : 'rgba(255,245,190,.16)';
  g.beginPath(); g.moveTo(tx - 8, ty); g.lineTo(tx - 8 + Math.cos(a - .18) * L, ty + Math.sin(a - .18) * L); g.lineTo(tx - 8 + Math.cos(a + .18) * L, ty + Math.sin(a + .18) * L); g.closePath(); g.fill();
  g.fillStyle = C.mint; g.beginPath(); g.moveTo(x - 5, y - r - 8); g.lineTo(x + 5, y - r - 8); g.lineTo(x, y - r - 2); g.fill();
  if (ws.st === 'tell') { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ffe08a'; g.fillText('?', x - r - 8, y - r); }
}
// the couple from behind: leaning in (heads toward each other), a kiss, the popcorn up, red in the face when caught
function cinCouple(g, G, jump) {
  const st = CM.st, lean = { pink: G.lean.pink, mint: G.lean.mint };
  if (O.role === 'guest') lean[O.local] = st.gl;
  for (const id of ['pink', 'mint']) {
    const L = lean[id], dir = id === 'pink' ? 1 : -1, x0 = id === 'pink' ? CROOM.L : CROOM.R, col = id === 'pink' ? C.pink : C.mint, dark = id === 'pink' ? C.pinkD : C.mintD;
    const y = 322 - jump, hx = x0 + dir * L * 16;
    g.save(); g.translate(hx, y + 26); g.rotate(dir * L * 0.32); g.scale(1.15, 1.15);
    g.fillStyle = dark; rr(g, -20, -10, 40, 34, 12); g.fill();                       // shoulders
    const hg = g.createLinearGradient(0, -40, 0, -6); hg.addColorStop(0, LITE[id]); hg.addColorStop(.5, col); hg.addColorStop(1, dark);
    g.fillStyle = hg; rr(g, -17, -40, 34, 34, 13); g.fill();                         // head (from behind)
    g.fillStyle = hexA(dark, .5); rr(g, -17, -16, 34, 10, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-7, -32, 6, 3.2, -.4, 0, Math.PI * 2); g.fill();
    if (wearHat(g, id, 0, -39, 1.4)) {}
    else if (id === 'pink') { g.fillStyle = C.gold; g.beginPath(); g.moveTo(8, -40); g.lineTo(2, -45); g.lineTo(2, -36); g.closePath(); g.moveTo(8, -40); g.lineTo(14, -45); g.lineTo(14, -36); g.closePath(); g.fill(); }
    else { g.strokeStyle = '#3f8f4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(1, -45, -1, -48); g.stroke(); g.fillStyle = '#7cc46d'; g.beginPath(); g.ellipse(4, -48, 5, 2.6, -.5, 0, Math.PI * 2); g.fill(); }
    if (G.blush > 0) { g.fillStyle = 'rgba(255,90,110,.75)'; g.beginPath(); g.ellipse(dir * 14, -20, 5, 3, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // the popcorn: in the lap, or up beside the head to hide them from that side
    const up = G.shield[id] > 0, px = up ? x0 - dir * 34 : x0 - dir * 8, py = up ? y - 6 : y + 44;
    const k = up ? 1.25 : 0.7;
    g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(px - 6 * k, py - 14 * k, 6 * k, 0, Math.PI * 2); g.arc(px + 5 * k, py - 15 * k, 6 * k, 0, Math.PI * 2); g.arc(px, py - 19 * k, 6 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8574f'; g.beginPath(); g.moveTo(px - 11 * k, py - 12 * k); g.lineTo(px + 11 * k, py - 12 * k); g.lineTo(px + 8 * k, py + 14 * k); g.lineTo(px - 8 * k, py + 14 * k); g.closePath(); g.fill();
    g.fillStyle = '#fff'; for (const s of [-5, 1]) { g.fillRect(px + s * k, py - 12 * k, 3 * k, 26 * k); }
    if (up) { const left = G.shield[id] / Cin.SHIELD_T; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(px - 14, py + 22, 28, 4); g.fillStyle = col; g.fillRect(px - 14, py + 22, 28 * left, 4); }
  }
  if (G.kissing) { g.fillStyle = C.pink; heartPath(g, 480, 268 - jump + Math.sin(S.time * 5) * 2, 7 + Math.min(4, G.kiss)); g.fill(); }
  else if (G.blush > 0) { g.font = `400 18px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ff8a8a'; g.fillText('!!', 480, 270); }
}
function cinHud(g, G) {
  const def = G.def, left = Math.max(0, def.time - Math.max(0, G.t - Cin.START));
  xScoreBox(g, left, G.score, def.stars, G.kissing ? `จุ๊บ ×${Cin.mult(G.kiss) === 2 ? th(2) : Cin.mult(G.kiss) === 1.5 ? '๑.๕' : th(1)}` : 'แต้ม');
  xStrikes(g, 30, G.strikes, Cin.STRIKES, 'โดนเห็น');
  // each player's popcorn: ready, or how long to wait
  g.font = `600 11px ${FONT}`; g.textAlign = 'center';
  for (const [id, x] of [['pink', VW / 2 - 120], ['mint', VW / 2 + 120]]) {
    if (O.role && id !== O.local) continue;
    const cd = G.shieldCd[id], text = G.shield[id] > 0 ? 'ป๊อปคอร์นบังอยู่' : cd > 0 ? `ป๊อปคอร์น รอ ${th(Math.ceil(cd))} วิ` : 'ป๊อปคอร์นพร้อม';
    panel(g, x - 70, VH - 28, 140, 20, 10, .75); g.fillStyle = cd > 0 && G.shield[id] <= 0 ? 'rgba(255,255,255,.5)' : id === 'pink' ? C.pink : C.mint; g.fillText(text, x, VH - 14);
  }
  // a word for each player: someone on their side is turning round
  if (S.mode === 'play' && G.st === 'run') {
    for (const id of ['pink', 'mint']) {
      const side = id === 'pink' ? 'L' : 'R', turning = def.watchers.some((w, i) => w.side === side && (O.role === 'guest' ? Cin.watchState(G, i).st : G.ws[i].st) !== 'idle');
      const x = id === 'pink' ? CROOM.L - 40 : CROOM.R + 40;
      if (turning && G.lean[id] > 0.2 && !(G.shield[id] > 0)) xTip(g, id, 'ถอย! มีคนหันมา', x, 232);
      else if (G.t - Cin.START < 5 && !G.kissing) xTip(g, id, id === 'pink' ? 'กดค้าง เอียงหา →' : '← กดค้าง เอียงหา', x, 232);
    }
  }
}

/* ---------- No farting at the table (เดทแรกห้ามตด) ---------- */
Object.assign(sfx, {
  ffart(size) {
    if (size < Fart.QUIET) { noise(.25 + size / 300, 1100, .014, 'bandpass', 1, 500); return; }        // the silent kind: a long hiss
    brrt(.12 + size / 260, 70 + size * .9, .03 + size / 1800);
  },
  fcough() { for (const t of [0, .14]) { noise(.09, 950, .07, 'bandpass', 1.2, 600, t); tone(310, .07, 'triangle', .04, 200, t); } },
  fchair() { noise(.5, 700, .05, 'bandpass', 4, 350); tone(190, .45, 'sawtooth', .02, 120); },
  frumble() { tone(55, .35, 'sine', .05, 40); noise(.3, 150, .03, 'lowpass', .7); },
  fheard() { tone(520, .1, 'triangle', .05, 700); tone(700, .18, 'triangle', .05, 380, .1); },
  fok() { chime(1046, .25, .035); },
  fplate() { noise(.25, 3500, .04, 'bandpass', 1); for (let i = 0; i < 4; i++) tone(2500 + Math.random() * 2500, .12, 'sine', .015, 0, i * .03); },
  flaugh() { [0, .13, .26, .39].forEach((t, i) => { tone(i % 2 ? 300 : 270, .08, 'sawtooth', .025, 240, t); noise(.07, 1100, .02, 'bandpass', 2, 0, t); }); },
  fmusic() { [659, 784, 880, 784, 659, 587].forEach((f, i) => chime(f, .3, .02, i * .3)); },
  fkid() { tone(700, .6, 'sawtooth', .02, 1100); tone(1000, .5, 'sawtooth', .015, 800, .55); },
  fthunder() { noise(.25, 2200, .05, 'bandpass', .8, 400); noise(1.8, 300, .1, 'lowpass', .7, 60, .05); },
  fclap() { for (let i = 0; i < 12; i++) noise(.03, 1500 + Math.random() * 600, .03, 'bandpass', 1.2, 0, i * .09 + Math.random() * .05); }
});
const FSCENE = {
  cafe: { wall: '#6a4a5a', wall2: '#5a3e4c', floor: '#3a2a36', table: '#c99a6a', light: '#ffe2a8' },
  grill: { wall: '#5a3a2a', wall2: '#4a2e22', floor: '#2e2420', table: '#8a5a3a', light: '#ffb070' },
  library: { wall: '#3e4a5e', wall2: '#33405a', floor: '#2a2a38', table: '#9a7a5a', light: '#e8f0ff' },
  family: { wall: '#5e5a3e', wall2: '#504c33', floor: '#33302a', table: '#b08a5a', light: '#fff0c8' },
  wedding: { wall: '#6a3e5e', wall2: '#5a334f', floor: '#3a2840', table: '#f2e6f0', light: '#ffd8f0' }
};
const FDIN = [{ x: 140, y: 268 }, { x: 228, y: 262 }, { x: 330, y: 270 }, { x: 640, y: 268 }, { x: 734, y: 262 }, { x: 826, y: 270 }];
const FM = xMode({
  kind: 'fart', md: 'f', pres: 'fw', dk: 'g', L: FLEVELS, pk: 'g', Eng: Fart, pad: 'x', list: 'flevels', olist: 'oLevelsF', starsAll: 'fStarsAll',
  R: ['gas', 'cover'], rk: 'froles', roleName: { gas: 'ท้องปั่นป่วน', cover: 'ช่วยกลบเสียง' },
  label: i => 'มื้อที่ ' + th(i + 1), word: 'ไป', goWord: 'ไปกินข้าว', fresh: 'ยังไม่เคยไป', nextWord: 'มื้อถัดไป', againWord: 'กินมื้อนี้อีกครั้ง',
  score: G => G.score,
  xWords: id => (FM.roleOf(id) === 'gas' ? { b: 'เกร็ง', a: 'ปล่อย' } : { a: 'ไอ', b: 'ลาก<br>เก้าอี้' }),
  chips() {
    const R = FM.st.roles, gp = R.gas === 'pink', set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    set('#fRolePinkK', gp ? 'D เกร็ง A ปล่อย' : 'A ไอ D ลากเก้าอี้'); set('#fRolePinkT', gp ? 'ท้องปั่นป่วน' : 'ช่วยกลบเสียง');
    set('#fRoleMintK', gp ? '→ ไอ ← ลากเก้าอี้' : '← เกร็ง → ปล่อย'); set('#fRoleMintT', gp ? 'ช่วยกลบเสียง' : 'ท้องปั่นป่วน');
  },
  onLoad() { Object.assign(FM.st, { played: new Set(), shown: new Set(), coverAnim: { cough: 0, chair: 0 }, puff: [], amb: -1, turn: 0, smell: 0, goAt: 0, goTa: 0, ta: null, tb: null, rumbleT: 2, lastPress: { cough: -9, chair: -9 }, myCovers: [] }); },
  snap: G => ({ st: G.st, over: G.over, ru: G.ruined, odd: G.stats.odd, x: G.strikes }),
  changes(p, n) {
    const ev = [];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.odd > p.odd) ev.push('strike:odd');
    if (n.over && !p.over) ev.push(n.ru ? 'ruined' : 'end');
    return ev;
  },
  events(ev) {
    for (const e of ev) {
      if (e === 'go') sfx.ilaunch();
      else if (e === 'strike:odd') { sfx.fheard(); xFloat(FM, 'ไอบ่อยจนคนสงสัย!', 480, 220, '#ffb38a', 20, 1.6); FM.st.turn = 1.6; }
      else if (e === 'ruined') { sfx.cout(); xFloat(FM, 'มื้อนี้พังแล้ว!', 480, 200, '#ff8a8a', 26, 2.2); }
      else if (e === 'end') { sfx.win(); xFloat(FM, `อิ่มแล้ว +${th(Fart.FINISH)}`, 480, 200, C.gold, 22, 1.8); }
    }
  },
  tick() {
    const st = FM.st, G = st.G, R = st.roles;
    const gasInp = q => ({ hold: q.b, release: q.ap ? G.t : null }), covInp = q => ({ cough: q.ap ? G.t : null, chair: q.bp ? G.t : null });
    if (!O.role) { const g = xRead(R.gas), c = xRead(R.cover); FM.events(Fart.step(G, { gas: gasInp(g), cover: covInp(c) })); st.prev = FM.snap(G); return; }
    const li = xRead(O.local), mine = FM.roleOf(O.local);
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote, theirs = mine === 'gas' ? 'cover' : 'gas';
      const r = theirs === 'gas' ? { hold: rq.b, release: rq.ta } : { cough: rq.ta, chair: rq.tb };
      FM.events(Fart.step(G, { [mine]: mine === 'gas' ? gasInp(li) : covInp(li), [theirs]: r }));
      rq.ta = rq.tb = null; st.prev = FM.snap(G);
    } else {
      // the guest: its own presses count from when they were pressed, on the host's clock; what they do comes back in
      // the host's snapshots (the meter and the noises show here at once)
      const ht = fHostT();
      if (mine === 'gas') {
        if (li.ap) { st.n.a++; st.ta = ht; if (G.P >= Fart.MIN_GAS && ht - Math.max(G.lastGo, st.goTa || -9) >= Fart.AGAIN) { st.goTa = ht; st.goAt = G.t; } }
        Fart.step(G, { gas: { hold: li.b, release: null } }, true);
      } else {
        for (const [p, kind, k] of [[li.ap, 'cough', 'a'], [li.bp, 'chair', 'b']]) {
          if (!p) continue;
          st.n[k]++; st['t' + k] = ht;
          const K = kind === 'chair' ? Fart.CHAIR : Fart.COUGH;
          if (ht - Math.max(G.last[kind], st.lastPress[kind]) >= K.cd) { st.lastPress[kind] = ht; st.myCovers.push({ kind, t: ht }); st.coverAnim[kind] = kind === 'chair' ? 1 : 0.6; if (kind === 'chair') sfx.fchair(); else sfx.fcough(); }
        }
        Fart.step(G, { gas: { hold: G.hold } }, true);
      }
    }
  },
  frameExtra(dt) {
    const st = FM.st, G = st.G, def = G.def;
    st.coverAnim.cough = Math.max(0, st.coverAnim.cough - dt); st.coverAnim.chair = Math.max(0, st.coverAnim.chair - dt);
    st.turn = Math.max(0, st.turn - dt); st.smell = Math.max(0, st.smell - dt);
    for (const p of st.puff) { p.life -= dt; p.x += p.vx * dt; p.y -= 14 * dt; p.r += 10 * dt; }
    st.puff = st.puff.filter(p => p.life > 0);
    if (S.mode !== 'play') return;
    const gx = st.roles.gas === 'pink' ? 410 : 550;
    // each fart sounds when it sounds (on both phones, from the same list), and its fate shows once it is judged
    for (const f of G.farts) {
      const key = Math.round(f.t * 1000);
      if (!st.played.has(key) && G.t >= f.ts) { st.played.add(key); sfx.ffart(f.size); for (let i = 0; i < 3 + f.size / 15; i++) st.puff.push({ x: gx + (Math.random() - .5) * 20, y: 380, vx: (Math.random() - .5) * 30, r: 6 + f.size / 12, life: 1 + f.size / 80 }); }
      if (f.judged && !st.shown.has(key)) {
        st.shown.add(key);
        if (f.res === 'heard') { sfx.fheard(); st.turn = 1.8; S.shake = Math.max(S.shake, .35); xFloat(FM, ['ได้ยินนะ!', 'เสียงอะไรน่ะ!', 'ปู้ด!'][key % 3], gx, 330, '#ff8a8a', 22, 1.6); }
        else if (f.res) { sfx.fok(); xFloat(FM, f.res === 'ambient' ? `เสียงร้านกลบ +${th(f.pts)}` : f.res === 'silent' ? `เงียบกริบ +${th(f.pts)}` : `เนียน! +${th(f.pts)}`, gx, 330, f.res === 'ambient' ? '#bfe6ff' : C.gold, 18); }
        if (f.smelled) { st.smell = 2.5; xFloat(FM, 'แหวะ! เหม็น!', 230, 220, '#b8e07a', 22, 1.8); }
        if (f.forced) xFloat(FM, 'หลุด!', gx, 300, '#ffb38a', 20);
      }
    }
    for (const c of G.covers) {
      const key = c.kind + Math.round(c.a * 1000);
      if (st.played.has(key)) continue;
      // the guest's own cough or scrape already sounded when it was pressed
      const K = c.kind === 'chair' ? Fart.CHAIR : Fart.COUGH;
      if (st.myCovers.some(q => q.kind === c.kind && Math.abs(q.t + K.from - c.a) < 0.25)) { st.played.add(key); continue; }
      st.played.add(key); st.coverAnim[c.kind] = c.kind === 'chair' ? 1 : 0.6; if (c.kind === 'chair') sfx.fchair(); else sfx.fcough();
    }
    // the place's own noises
    const amb = G.amb.findIndex(([a, b]) => G.t >= a && G.t < b);
    if (amb >= 0 && amb !== st.amb) { const k = G.amb[amb][3]; ({ plate: sfx.fplate, music: sfx.fmusic, laugh: sfx.flaugh, kid: sfx.fkid, thunder: sfx.fthunder, clap: sfx.fclap }[k] || (() => {}))(); if (k === 'thunder') S.flash = .7; }
    st.amb = amb;
    // a rumbling tummy when the gas is building up
    if (G.st === 'run' && G.P > 60) { st.rumbleT -= dt; if (st.rumbleT <= 0) { st.rumbleT = 1.2 + Math.random(); sfx.frumble(); } }
  },
  result(G, s) {
    const sx = G.stats, msg = G.ruined ? 'โดนจับได้ครบแล้ว มื้อนี้พัง ครั้งหน้าให้คนปวดบอกก่อนปล่อย อีกคนจะได้กลบทัน'
      : s === 3 ? 'ตดไปหลายรอบแต่ไม่มีใครรู้เลย คู่นี้เนียนสุดๆ' : s === 2 ? (sx.heard ? 'เกือบเนียนแล้ว มีหลุดให้ได้ยินอยู่บ้าง' : 'เนียนดี ลองปล่อยตอนร้านเสียงดังจะได้แต้มเพิ่ม')
      : s === 1 ? 'รอดมาได้ มื้อถัดไปเปิดแล้ว' : `ยังได้แต้มน้อยไป ต้องได้ ${th(G.def.stars[0])} แต้ม ปล่อยแล้วให้อีกคนกลบให้ทัน`;
    return { head: G.ruined ? 'มื้อนี้พัง' : 'อิ่มแล้ว', msg,
      stats: `<span>แต้ม <b>${th(G.score)}</b></span><span>ตดเนียน <b>${th(sx.hidden)}</b> จาก <b>${th(sx.farts)}</b> ใหญ่สุด <b>${th(sx.biggest)}</b></span><span>มีคนได้ยิน <b>${th(sx.heard)}</b> ได้กลิ่น <b>${th(sx.smelled)}</b></span>` };
  },
  encode() {
    const st = FM.st;
    if (O.role === 'host') return Fart.encode(st.G);
    const q = st.lastInp || {}, r3 = v => (v == null ? null : Math.round(v * 1000) / 1000);
    return { b: q.b ? 1 : 0, an: st.n.a, bn: st.n.b, ta: r3(st.ta), tb: r3(st.tb) };
  },
  hostHears(m) {
    const rq = FM.st.remote; rq.b = !!m.b;
    if (xHeard(rq, 'A', m.an) && Number.isFinite(m.ta)) rq.ta = m.ta;
    if (xHeard(rq, 'B', m.bn) && Number.isFinite(m.tb)) rq.tb = m.tb;
  },
  guestHears(m, pr) {
    const st = FM.st, G = st.G, mine = FM.roleOf(O.local);
    Fart.apply(G, m, mine);
    if (mine === 'cover' && Array.isArray(m.lc)) { G.last.cough = xNum(m.lc[0], -9, 1e6, -9); G.last.chair = xNum(m.lc[1], -9, 1e6, -9); }
    if (pr && Number.isFinite(pr.hn)) st.ref = { t: G.t, hn: pr.hn };
    // a release pressed here that the host has not heard of yet: the gas meter stays let go
    if (mine === 'gas' && st.goTa && Number.isFinite(m.lg) && m.lg < st.goTa - 0.05 && G.t - st.goAt < 1.5) G.P = Math.max(0, (G.t - st.goAt) * Fart.gasAt(G.def, G.t));
  },
  fresher: () => ({ b: false, ta: null, tb: null, seenA: -1, seenB: -1 }),
  render: fartRender
});
// the host's game clock now, as best this (guest) phone can tell
function fHostT() {
  const st = FM.st, G = st.G;
  if (st.ref && Number.isFinite(O.clockOff)) return Math.max(G.t, st.ref.t + (performance.now() + O.clockOff - st.ref.hn) / 1000);
  return G.t + (O.rtt || 120) / 2000;
}

function fartRender() {
  const g = ctx, st = FM.st, G = st.G, def = G.def, P = FSCENE[def.scene] || FSCENE.cafe, R = st.roles;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 7 * S.shake;
  g.save(); g.translate(ox, 0);
  // the room
  const amb = G.amb.find(([a, b]) => G.t >= a && G.t < b), ambK = amb ? amb[3] : null;
  stamp(g, 'fartRoom', def.scene, -10, 0, VW + 20, VH, q => { q.translate(10, 0); fartRoom(q, P, def); }, true);
  if (ambK === 'thunder') {
    // the storm in the window: flashes and rain
    g.save(); rr(g, 400, 40, 160, 100, 6); g.clip();
    if (Math.sin(S.time * 40) > 0) { g.fillStyle = 'rgba(240,245,255,.92)'; g.fillRect(400, 40, 160, 100); }
    g.strokeStyle = 'rgba(200,220,255,.5)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 18; i++) { const x = 400 + (i * 37 + S.time * 300) % 180, y = 40 + (i * 23 + S.time * 500) % 100; g.moveTo(x, y); g.lineTo(x - 4, y + 10); } g.stroke();
    g.restore();
    g.strokeStyle = '#2a2030'; g.lineWidth = 5; g.beginPath(); g.moveTo(480, 40); g.lineTo(480, 140); g.moveTo(400, 90); g.lineTo(560, 90); g.stroke();
  }
  // the fan: swings back and forth; toward the other diners is bad news for a big one
  if (def.fan) {
    const k = Fart.fanAt(def, G.t), toward = Fart.fanToward(def, G.t), a = Math.sin(k * Math.PI * 2) * 0.9;
    g.fillStyle = '#ccc'; g.fillRect(866, 118, 6, 30); g.save(); g.translate(869, 112); g.scale(Math.cos(a) * .6 + .4, 1);
    g.fillStyle = toward ? '#ffb38a' : '#bfe6ff'; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 3; i++) { const b = S.time * 30 + i * 2.1; g.strokeStyle = '#777'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(b) * 18, Math.sin(b) * 18); g.stroke(); }
    g.restore();
    g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillStyle = toward ? '#ffb38a' : '#bfe6ff'; g.fillText(toward ? 'พัดลมหันไปหาโต๊ะอื่น' : 'พัดลมหันออก', 869, 160);
    if (toward) { g.strokeStyle = 'rgba(255,200,160,.35)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const y = 200 + i * 24, s = (S.time * 160 + i * 60) % 300; g.beginPath(); g.moveTo(820 - s, y); g.lineTo(780 - s, y); g.stroke(); } }
  }
  // the other diners: busy with their food, unless they heard something (turn), smelled it, or wonder about all that coughing
  const sus = G.odd > 55, turned = st.turn > 0, smelly = st.smell > 0;
  FDIN.forEach((d, i) => {
    if (def.scene === 'library' && i % 2) return;
    const col = ['#7a3f6a', '#3f5a7a', '#5a7a3f', '#7a5a3f', '#5a3f7a', '#3f7a6a'][i], face = turned || (sus && i % 2 === 0) || smelly;
    const dg = g.createLinearGradient(0, d.y, 0, d.y + 40); dg.addColorStop(0, hexMix(col, .16)); dg.addColorStop(1, hexMix(col, -.18));
    g.fillStyle = dg; rr(g, d.x - 18, d.y, 36, 40, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(d.x - 7, d.y + 1); g.lineTo(d.x, d.y + 8); g.lineTo(d.x + 7, d.y + 1); g.closePath(); g.fill();
    g.fillStyle = '#e8c3a0'; g.beginPath(); g.arc(d.x, d.y - 8, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#2a1a12', '#120d18', '#4a3a3a', '#1a1410', '#3a2a1a', '#2a2238'][i]; g.beginPath(); g.arc(d.x, d.y - 14, 15, Math.PI, 0); g.fill();
    if (face) {
      const lx = d.x < 480 ? 4 : -4;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(d.x - 5 + lx, d.y - 8, 3.5, 4.5, 0, 0, Math.PI * 2); g.ellipse(d.x + 5 + lx, d.y - 8, 3.5, 4.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1530'; g.beginPath(); g.arc(d.x - 5 + lx * 1.4, d.y - 7, 2, 0, Math.PI * 2); g.arc(d.x + 5 + lx * 1.4, d.y - 7, 2, 0, Math.PI * 2); g.fill();
      if (smelly) { g.fillStyle = 'rgba(160,210,90,.55)'; g.beginPath(); g.arc(d.x, d.y - 8, 15, 0, Math.PI * 2); g.fill(); }
      g.font = `400 14px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = smelly ? '#b8e07a' : turned ? '#ff8a8a' : '#ffe08a'; g.fillText(smelly ? '~' : turned ? '!?' : '?', d.x + 18, d.y - 22);
    } else {
      // busy eating, happily: closed eyes, rosy cheeks, chewing
      g.strokeStyle = '#2a2030'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.arc(d.x - 5, d.y - 6, 2.6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.beginPath(); g.arc(d.x + 5, d.y - 6, 2.6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.lineCap = 'butt';
      g.fillStyle = 'rgba(255,128,150,.45)'; g.beginPath(); g.ellipse(d.x - 9, d.y - 2, 3, 1.8, 0, 0, Math.PI * 2); g.ellipse(d.x + 9, d.y - 2, 3, 1.8, 0, 0, Math.PI * 2); g.fill();
      const ch = Math.abs(Math.sin(S.time * 6 + i * 1.3)); g.fillStyle = '#7a3a3a'; g.beginPath(); g.ellipse(d.x, d.y + 1, 2.4, .8 + ch * 1.4, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = hexA(P.table, .85); rr(g, d.x - 40, d.y + 34, 80, 10, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(d.x - 38, d.y + 34, 76, 2);
    if (def.scene !== 'library') { const px = d.x + (i % 2 ? 16 : -16); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px, d.y + 34, 11, 3.4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = ['#e8a33a', '#e8574f', '#9cc77a'][i % 3]; g.beginPath(); g.ellipse(px, d.y + 32.5, 6, 2.4, 0, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = ['#c94a4a', '#4a7ac9', '#c9a24a'][i % 3]; g.fillRect(d.x - 14, d.y + 30, 28, 5); }
  });
  // the place's noises, where they come from
  if (ambK) {
    g.font = `400 18px ${FONT_D}`; g.textAlign = 'center';
    const pop = (text, x, y, col) => { g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.8)'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); };
    if (ambK === 'music') { for (let i = 0; i < 3; i++) pop('♪', 100 + i * 34 + Math.sin(S.time * 3 + i) * 6, 200 - ((S.time * 30 + i * 20) % 60), '#bfe6ff'); }
    else if (ambK === 'plate') pop('เพล้ง!', 300, 230, '#fff');
    else if (ambK === 'laugh') pop('ฮ่าๆๆๆ', 734, 230, '#ffe08a');
    else if (ambK === 'kid') pop('แง้!!', 140, 236, '#ffb38a');
    else if (ambK === 'thunder') pop('เปรี้ยง!', 480, 160, '#e8f0ff');
    else if (ambK === 'clap') pop('แปะๆๆ', 640 + Math.sin(S.time * 20) * 4, 236, '#ffd8f0');
    panel(g, VW / 2 - 110, 186, 220, 24, 12, .8); g.font = `600 12px ${FONT}`; g.fillStyle = '#bfe6ff'; g.fillText('ร้านเสียงดังอยู่ ปล่อยได้!', VW / 2, 203);
  }
  // our table and the two of us
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(480, 470, 260, 26, 0, 0, Math.PI * 2); g.fill();
  for (const id of ['pink', 'mint']) {
    const role = FM.roleOf(id), x = id === 'pink' ? 410 : 550, chairDx = role === 'cover' && st.coverAnim.chair > 0 ? Math.sin(st.coverAnim.chair * 30) * 4 + (id === 'pink' ? -6 : 6) : 0;
    g.fillStyle = '#5a3a2a'; rr(g, x - 26 + chairDx, 330, 52, 70, 8); g.fill(); g.fillRect(x - 24 + chairDx, 398, 6, 60); g.fillRect(x + 18 + chairDx, 398, 6, 60);
    const squirm = role === 'gas' ? Math.min(1, G.P / 100) : 0, bob = role === 'cover' && st.coverAnim.cough > 0 ? Math.abs(Math.sin(st.coverAnim.cough * 18)) * 4 : 0;
    g.save(); g.translate(x + chairDx + (squirm > .6 ? Math.sin(S.time * 25) * squirm * 2 : 0), 400 - bob); g.scale(2.1, 2.1);
    drawPlayer(g, { id, x: -12, y: -29, w: 24, h: 29, face: id === 'pink' ? 1 : -1, sq: role === 'gas' && G.hold ? .25 : 0, walk: 0 }, S.time);
    if (role === 'gas' && G.strain > 30) { g.fillStyle = `rgba(255,60,60,${Math.min(.5, G.strain / 200)})`; rr(g, -12, -29, 24, 29, 10); g.fill(); }
    if (role === 'gas' && G.strain > 60) { g.fillStyle = '#bfe6ff'; g.beginPath(); g.ellipse(10, -24 + (S.time * 10 % 6), 1.6, 2.4, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    if (role === 'cover' && st.coverAnim.cough > 0) { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('แค่กๆ!', x, 300); }
    if (role === 'cover' && st.coverAnim.chair > 0) { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ffe08a'; g.fillText('ครืดดด!', x + (id === 'pink' ? -30 : 30), 440); }
  }
  // the table in front, with a cloth and what is on it
  g.fillStyle = P.table; rr(g, 280, 408, 400, 30, 8); g.fill(); g.fillStyle = hexA('#000000', .2); g.fillRect(290, 432, 380, 6);
  const TC = { cafe: ['#fff2e6', '#f6c8d4'], grill: ['#fff4ee', '#e8574f'], family: ['#fffbea', '#9cc77a'], wedding: ['#ffffff', '#ffb8d2'] }[def.scene];
  if (TC) {
    g.fillStyle = TC[0]; rr(g, 288, 404, 384, 22, 6); g.fill();
    for (let x = 288; x < 672; x += 16) { g.beginPath(); g.arc(x + 8, 425, 8, 0, Math.PI); g.fill(); }
    g.fillStyle = hexA(TC[1], .55);
    if (def.scene === 'grill') { for (let x = 288; x < 672; x += 16) g.fillRect(x, 404 + ((x / 16) % 2) * 8, 8, 8); }
    else g.fillRect(288, 418, 384, 4);
  }
  g.fillStyle = hexA('#000000', .3); g.fillRect(300, 438, 12, 80); g.fillRect(648, 438, 12, 80);
  if (def.scene === 'grill') { g.fillStyle = '#333'; g.beginPath(); g.ellipse(480, 404, 46, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c96a4a'; g.beginPath(); g.arc(480, 398, 22, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(220,220,220,.3)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(470 + i * 10, 370 - ((S.time * 20 + i * 12) % 40), 6, 0, Math.PI * 2); g.fill(); } }
  else if (def.scene === 'wedding') { g.fillStyle = '#fff'; rr(g, 455, 370, 50, 36, 4); g.fill(); g.fillStyle = C.pink; g.fillRect(455, 384, 50, 4); }
  else if (def.scene === 'library') { g.fillStyle = '#4a7ac9'; g.fillRect(440, 398, 40, 10); g.fillStyle = '#c94a4a'; g.fillRect(486, 396, 36, 12); }
  else {
    for (const x of [430, 530]) { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x + 2, 407, 22, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, 404, 22, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8a33a'; g.beginPath(); g.ellipse(x, 401, 12, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - 4, 399.5, 4, 1.4, 0, 0, Math.PI * 2); g.fill(); }
    // a little vase with a flower between the plates
    g.fillStyle = '#bfe6ff'; rr(g, 474, 382, 12, 22, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(477, 386, 2, 12);
    g.strokeStyle = '#5fae55'; g.lineWidth = 2; g.beginPath(); g.moveTo(480, 384); g.quadraticCurveTo(482, 372, 480, 362); g.stroke();
    g.fillStyle = C.pink; for (let q = 0; q < 5; q++) { const a = q * 1.2566 + .3; g.beginPath(); g.arc(480 + Math.cos(a) * 4.5, 360 + Math.sin(a) * 4.5, 3.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = C.gold; g.beginPath(); g.arc(480, 360, 2.6, 0, Math.PI * 2); g.fill();
  }
  // the gas: little clouds
  for (const p of st.puff) { g.globalAlpha = Math.min(.6, p.life); g.fillStyle = '#b8c87a'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  g.restore();
  // over the gas player: the gas meter; after a release, a ring running down to when it sounds
  const gx = R.gas === 'pink' ? 410 : 550, k = G.P / 100;
  panel(g, gx - 40, 254, 80, 10, 5, .8);
  rr(g, gx - 40, 254, Math.max(10, 80 * k), 10, 5); g.fillStyle = k > .8 ? '#ff6b6b' : k > .5 ? '#ffcf5a' : '#9be07a'; g.fill();
  g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#c9bfef'; g.fillText(G.hold ? 'เกร็งอยู่' : 'แก๊ส', gx, 250);
  const pend = G.farts.find(f => !f.judged && G.t < f.ts);
  if (pend) {
    const left = Math.max(0, pend.ts - G.t) / Fart.DELAY;
    g.strokeStyle = pend.size > Fart.COUGH.str ? '#ff8a8a' : '#ffe08a'; g.lineWidth = 4; g.beginPath(); g.arc(gx, 222, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke();
    g.font = `400 13px ${FONT_D}`; g.fillStyle = '#fff'; g.fillText('ปล่อยแล้ว!', gx, 204);
  }
  drawParts(g);
  xDrawFloats(g, FM);
  fartHud(g, G);
  xCountdown(g, G, Fart.START);
  xBannerDraw(g, G, Fart.START, def.name, `${S.names[R.gas]}ท้องปั่นป่วน กดปล่อยแล้วเสียงจะตามมา · ${S.names[R.cover]}ไอหรือลากเก้าอี้กลบให้ทัน`);
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * .3})`; g.fillRect(0, 0, VW, VH); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
// the restaurant: striped wallpaper, wainscot, plank floor, a window with curtains, hanging lamps, things on the walls
function fartRoom(g, P, def) {
  g.fillStyle = P.wall; g.fillRect(-10, 0, VW + 20, 300);
  g.fillStyle = P.wall2; for (let x = 0; x < VW; x += 80) g.fillRect(x, 0, 40, 300);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 20; x < VW; x += 40) for (let y = 16; y < 220; y += 28) { g.beginPath(); g.arc(x, y + (x % 80 ? 14 : 0), 2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-10, 222, VW + 20, 78);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-10, 219, VW + 20, 4);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1.5; for (let x = 10; x < VW; x += 96) { rr(g, x, 234, 76, 54, 4); g.stroke(); }
  // floor planks with a soft pool of light
  g.fillStyle = P.floor; g.fillRect(-10, 300, VW + 20, VH - 300);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-10, 300, VW + 20, 4);
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  for (let y = 316, k = 0; y < VH; k++) { const h = 16 + k * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); for (let x = (k % 2) * 70; x < VW; x += 140) { g.moveTo(x, y); g.lineTo(x, y + h); } g.stroke(); y += h; }
  const pool = g.createRadialGradient(480, 470, 20, 480, 470, 380); pool.addColorStop(0, hexA(P.light, .1)); pool.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = pool; g.fillRect(0, 300, VW, VH - 300);
  // a string of little bulbs along the top
  if (def.scene !== 'wedding' && def.scene !== 'library') {
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    for (const [x0, x1] of [[0, 330], [330, 630], [630, 960]]) {
      g.beginPath(); g.moveTo(x0, 10); g.quadraticCurveTo((x0 + x1) / 2, 34, x1, 10); g.stroke();
      for (let q = 1; q < 8; q++) { const u = q / 8, x = x0 + (x1 - x0) * u, y = 10 + 24 * 2 * u * (1 - u) + 4, on = .6 + .4 * Math.sin(x * .05);
        const bg = g.createRadialGradient(x, y, 1, x, y, 12); bg.addColorStop(0, hexA(P.light, .45 * on)); bg.addColorStop(1, hexA(P.light, 0)); g.fillStyle = bg; g.fillRect(x - 12, y - 12, 24, 24);
        g.fillStyle = hexA(P.light, .7 + .3 * on); g.beginPath(); g.ellipse(x, y, 2.6, 3.4, 0, 0, Math.PI * 2); g.fill(); }
    }
  }
  // the window: a night town outside (thunder flashes and rain in the storm), curtains, a sill
  const flash = false;
  g.save(); rr(g, 400, 40, 160, 100, 6); g.clip();
  const wg = g.createLinearGradient(0, 40, 0, 140); wg.addColorStop(0, flash ? '#f4f7ff' : '#141c38'); wg.addColorStop(1, flash ? '#dfe8ff' : '#2e3f6a'); g.fillStyle = wg; g.fillRect(400, 40, 160, 100);
  if (!flash) {
    g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 9; i++) g.fillRect(408 + (i * 53) % 146, 46 + (i * 29) % 40, 1.5, 1.5);
    g.fillStyle = '#fff4d8'; g.beginPath(); g.arc(530, 62, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f2848'; for (let i = 0; i < 6; i++) g.fillRect(402 + i * 27, 112 - (i * 13) % 22, 24, 40);
    g.fillStyle = 'rgba(255,214,140,.7)'; for (let i = 0; i < 10; i++) g.fillRect(408 + (i * 37) % 146, 118 + (i * 7) % 14, 3, 4);
  }
  g.restore();
  g.strokeStyle = '#2a2030'; g.lineWidth = 5; g.strokeRect(400, 40, 160, 100); g.beginPath(); g.moveTo(480, 40); g.lineTo(480, 140); g.moveTo(400, 90); g.lineTo(560, 90); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, 392, 138, 176, 8, 3); g.fill();
  const cur = def.scene === 'wedding' ? '#ffd8ea' : def.scene === 'library' ? '#8a9ab8' : '#c9605e';
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 386 : 574, cg = g.createLinearGradient(x0 - 14, 0, x0 + 14, 0); cg.addColorStop(0, hexMix(cur, -.2)); cg.addColorStop(.5, cur); cg.addColorStop(1, hexMix(cur, -.2));
    g.fillStyle = cg; g.beginPath(); g.moveTo(x0 - 14 * sd, 30); g.lineTo(x0 + 22 * sd, 30); g.quadraticCurveTo(x0 + 2 * sd, 90, x0 + 10 * sd, 150); g.lineTo(x0 - 14 * sd, 150); g.closePath(); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.ellipse(x0 + 3 * sd, 104, 3, 7, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#5a3a2a'; rr(g, 376, 26, 208, 6, 3); g.fill();
  // hanging lamps
  for (const x of [300, 660]) {
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 50); g.stroke();
    const lg = g.createRadialGradient(x, 80, 4, x, 120, 140); lg.addColorStop(0, hexA(P.light, .25)); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(x - 160, 60, 320, 240);
    const sg = g.createLinearGradient(0, 50, 0, 70); sg.addColorStop(0, hexMix(P.light, -.15)); sg.addColorStop(1, P.light);
    g.fillStyle = sg; g.beginPath(); g.moveTo(x - 22, 70); g.lineTo(x + 22, 70); g.lineTo(x + 12, 50); g.lineTo(x - 12, 50); g.fill();
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, 72, 5, 0, Math.PI); g.fill();
  }
  // things on the walls
  const sc = def.scene;
  if (sc === 'library') {
    for (const x of [40, 740]) {
      g.fillStyle = '#5a3a2a'; g.fillRect(x, 60, 180, 230); g.fillStyle = '#6e4a34'; g.fillRect(x - 4, 56, 188, 8);
      for (let r = 0; r < 4; r++) { for (let b = 0; b < 12; b++) { const hgt = 36 + (b * 7 + r * 3) % 9; g.fillStyle = ['#c94a4a', '#4a7ac9', '#c9a24a', '#4ac98a', '#9a6ac9'][(b + r * 2) % 5]; g.fillRect(x + 6 + b * 14, 114 + r * 56 - hgt, 10, hgt); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 7 + b * 14, 118 + r * 56 - hgt, 8, 2); } g.fillStyle = '#4a2e20'; g.fillRect(x, 114 + r * 56, 180, 4); }
    }
    g.fillStyle = '#fff8e6'; rr(g, 606, 160, 96, 26, 6); g.fill(); g.fillStyle = '#5c5472'; g.font = `600 12px ${FONT}`; g.textAlign = 'center'; g.fillText('โปรดเงียบ', 654, 178);
  } else if (sc === 'wedding') {
    g.fillStyle = '#fff'; for (let x = 20; x < VW; x += 60) { g.beginPath(); g.arc(x, 18, 14, 0, Math.PI); g.fill(); }
    g.fillStyle = C.pink; heartPath(g, 480, 22, 10); g.fill();
    for (const [x0, x1] of [[0, 370], [590, 960]]) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 60); g.quadraticCurveTo((x0 + x1) / 2, 110, x1, 60); g.stroke(); for (let q = 1; q < 9; q++) { const u = q / 9, x = x0 + (x1 - x0) * u, y = 60 + 25 * 4 * u * (1 - u) * .5 * 2; g.fillStyle = q % 2 ? '#ffd8ea' : '#fff'; for (let p = 0; p < 5; p++) { const a = p * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 0, Math.PI * 2); g.fill(); } g.fillStyle = C.gold; g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); } }
    for (const [bx, cs] of [[90, ['#ffb8d2', '#fff', '#ffd8ea']], [870, ['#fff', '#ffb8d2', '#ffd8ea']]]) cs.forEach((c, k) => { const x = bx + (k - 1) * 18, y = 150 - (k % 2) * 16; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, 210); g.lineTo(x, y + 13); g.stroke(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 11, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - 4, y - 5, 2.5, 4, -.4, 0, Math.PI * 2); g.fill(); });
  } else {
    // a menu board on the left, a framed picture on the right
    g.fillStyle = '#6e4a34'; rr(g, 86, 64, 132, 100, 6); g.fill(); g.fillStyle = '#2f3a36'; rr(g, 92, 70, 120, 88, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `400 15px ${FONT_D}`; g.textAlign = 'center'; g.fillText(sc === 'grill' ? 'หมูกระทะ' : sc === 'family' ? 'อาหารวันนี้' : 'เมนู', 152, 92);
    g.fillStyle = 'rgba(255,255,255,.45)'; for (let q = 0; q < 3; q++) { g.fillRect(104, 104 + q * 16, 54 - q * 8, 2); g.fillRect(180, 104 + q * 16, 18, 2); }
    g.fillStyle = sc === 'grill' ? '#ff9a7a' : '#ffd36b'; g.beginPath(); g.arc(196, 146, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9963f'; rr(g, 716, 74, 96, 78, 4); g.fill(); g.fillStyle = '#fff6e6'; rr(g, 722, 80, 84, 66, 3); g.fill();
    if (sc === 'grill') { g.fillStyle = '#ffb8c8'; g.beginPath(); g.arc(764, 112, 20, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff94ab'; g.beginPath(); g.ellipse(764, 118, 8, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c95a76'; g.beginPath(); g.arc(761, 118, 1.6, 0, Math.PI * 2); g.arc(767, 118, 1.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a1f4a'; g.beginPath(); g.arc(756, 106, 2, 0, Math.PI * 2); g.arc(772, 106, 2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffb8c8'; g.beginPath(); g.moveTo(748, 96); g.lineTo(744, 86); g.lineTo(754, 92); g.fill(); g.beginPath(); g.moveTo(780, 96); g.lineTo(784, 86); g.lineTo(774, 92); g.fill(); }
    else if (sc === 'family') { for (const [x, c] of [[750, '#7a9ac9'], [778, '#c97a9a']]) { g.fillStyle = c; rr(g, x - 9, 116, 18, 24, 7); g.fill(); g.fillStyle = '#e8c3a0'; g.beginPath(); g.arc(x, 108, 8, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#e8574f'; heartPath(g, 764, 92, 5); g.fill(); }
    else { g.fillStyle = '#ffd8ea'; heartPath(g, 764, 112, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(756, 104, 4, 0, Math.PI * 2); g.fill(); }
  }
}
function fartHud(g, G) {
  const def = G.def, st = FM.st, R = st.roles, left = Math.max(0, def.time - Math.max(0, G.t - Fart.START));
  xScoreBox(g, left, G.score, def.stars);
  const max = def.strikes || Fart.STRIKES;
  xStrikes(g, 30, G.strikes, max, 'โดนจับได้');
  // how odd all that coughing looks
  panel(g, VW - 214, 50, 206, 22, 11, .82);
  g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText('คนเริ่มสงสัย', VW - 204, 65);
  rr(g, VW - 132, 57, 116, 8, 4); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill();
  if (G.odd > 0) { rr(g, VW - 132, 57, Math.max(8, 116 * G.odd / 100), 8, 4); g.fillStyle = G.odd > 70 ? '#ff6b6b' : '#ffcf5a'; g.fill(); }
  // the chair: one scrape every few seconds
  const cd = Math.max(0, Fart.CHAIR.cd - (G.t - G.last.chair));
  g.textAlign = 'center';
  const cx = R.cover === 'pink' ? VW / 2 - 120 : VW / 2 + 120;
  if (!O.role || R.cover === O.local) { panel(g, cx - 70, VH - 28, 140, 20, 10, .75); g.fillStyle = cd > 0 ? 'rgba(255,255,255,.5)' : (R.cover === 'pink' ? C.pink : C.mint); g.fillText(cd > 0 ? `เก้าอี้ รอ ${th(Math.ceil(cd))} วิ` : 'ลากเก้าอี้ได้', cx, VH - 14); }
  if (S.mode !== 'play' || G.st !== 'run') return;
  const gx = R.gas === 'pink' ? 410 : 550, cxp = R.cover === 'pink' ? 410 : 550;
  const pend = G.farts.find(f => !f.judged && G.t < f.ts + 0.05), amb = G.amb.some(([a, b]) => G.t >= a && b - G.t > 0.7);
  if (pend && !G.covers.some(c => pend.ts >= c.a && pend.ts < c.b) && Fart.ambientAt(G, pend.ts) < pend.size && pend.size >= Fart.QUIET) xTip(g, R.cover, pend.size > Fart.COUGH.str ? 'ลากเก้าอี้!' : 'ไอเลย!', cxp, 318);
  if (G.strain > 70) xTip(g, R.gas, 'เกร็งนานไม่ไหวแล้ว!', gx, 318);
  else if (def.fan && G.P > Fart.SMELL - 8 && Fart.fanToward(def, G.t + Fart.DELAY)) xTip(g, R.gas, 'พัดลมหันมา รอก่อน', gx, 318);
  else if (amb && G.P >= 20 && !pend) xTip(g, R.gas, 'ปล่อยเลย ร้านเสียงดัง!', gx, 318);
  else if (G.P > 75 && !pend) xTip(g, R.gas, 'แก๊สเต็มแล้ว บอกเพื่อนแล้วปล่อย', gx, 318);
}

/* ---------- One blanket (แย่งผ้าห่ม) ---------- */
Object.assign(sfx, {
  hkick() { noise(.16, 500, .04, 'lowpass', .8); tone(240, .12, 'triangle', .035, 120); },
  hwhoosh() { noise(.35, 500, .07, 'bandpass', .8, 1800); },
  hfart() { brrt(.4, 85, .035); },
  hbuzz() { tone(560 + Math.random() * 60, .25, 'sawtooth', .028, 620); },
  hslap() { noise(.06, 2400, .08, 'bandpass', 1); tone(200, .06, 'sine', .05, 120, .01); },
  hbite() { tone(1800, .06, 'triangle', .03, 2400); },
  hthud() { tone(90, .2, 'sine', .09, 50); noise(.15, 400, .05, 'lowpass', .8); },
  hwake() { tone(660, .12, 'triangle', .05, 880); tone(880, .16, 'triangle', .05, 660, .12); },
  htug() { noise(.22, 800, .06, 'bandpass', 1.5, 1500); },
  htell() { tone(220, .12, 'sine', .03, 200); },
  hrooster() { tone(700, .15, 'sawtooth', .04, 900); tone(900, .25, 'sawtooth', .04, 1100, .15); tone(1100, .4, 'sawtooth', .035, 700, .4); }
});
const HB0 = 480 - Bed.BW * 1.1, HK = 2.2;                            // the bed on screen: x0 and scale
const hx = x => HB0 + x * HK;
const HM = xMode({
  kind: 'bed', md: 'h', pres: 'hw', dk: 'h', L: HLEVELS, pk: 'e', Eng: Bed, pad: 'k', list: 'hlevels', olist: 'oLevelsH', starsAll: 'hStarsAll',
  label: i => 'คืนที่ ' + th(i + 1), word: 'นอน', goWord: 'ไปนอน', fresh: 'ยังไม่เคยนอน', nextWord: 'คืนถัดไป', againWord: 'นอนคืนนี้อีกครั้ง',
  score: G => G.score,
  kWords: () => ({ act: 'ตบ<br>สะบัด', use: 'ดึง<br>ผ้า' }),
  onLoad() { Object.assign(HM.st, { buzzT: 0, flapT: 0, kickT: { pink: 0, mint: 0 }, slapT: 0, zs: [], ed: '' }); },
  snap: G => ({ st: G.st, over: G.over, failed: G.failed, s: Object.assign({}, G.stats), ed: G.evs.map(e => (e.done ? 2 : e.told ? 1 : 0)).join(''), mq: G.mq ? G.mq.st + (G.mq.on || '') : '', aw: [G.awake.pink > 0, G.awake.mint > 0] }),
  changes(p, n) {
    const ev = [], G = HM.st.G;
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    for (let i = 0; i < n.ed.length; i++) {
      const e = G.evs[i]; if (!e) continue;
      if (n.ed[i] >= '1' && !(p.ed[i] >= '1')) ev.push(`tell:${e.kind}:${e.who}`);
      if (n.ed[i] === '2' && p.ed[i] !== '2') ev.push(e.kind === 'mosquito' ? 'mosquito' : `${e.kind}:${e.who}`);
    }
    if (n.mq.startsWith('sit') && !p.mq.startsWith('sit')) ev.push('land:' + n.mq.slice(3));
    if (n.s.bites > p.s.bites) ev.push('bite:x');
    if (n.s.kills > p.s.kills) ev.push('slap:x:x');
    if (n.s.flaps > p.s.flaps) ev.push('flap:x');
    if (n.s.tugs > p.s.tugs) ev.push('tug');
    ['pink', 'mint'].forEach((w, i) => { if (n.aw[i] && !p.aw[i]) ev.push(`wake:${w}:x`); });
    if (n.over && !p.over) ev.push(n.failed ? 'failed' : 'morning');
    return ev;
  },
  events(ev) {
    const st = HM.st, G = st.G, hy = 150;
    for (const e of ev) {
      const [k, a, b] = e.split(':');
      const at = w => hx(G.x[w] || 120);
      if (k === 'go') sfx.ilaunch();
      else if (k === 'tell') { sfx.htell(); if (a === 'kick' || a === 'roll') st.kickT[b] = Bed.TELL; }
      else if (k === 'kick') { sfx.hkick(); sfx.hwhoosh(); xFloat(HM, 'เตะผ้าห่ม!', at(a), 300, '#ffb38a', 18); }
      else if (k === 'roll') { sfx.hwhoosh(); xFloat(HM, 'กลิ้งเอาผ้าไป!', at(a), 300, '#ffb38a', 18); }
      else if (k === 'fart') { sfx.hfart(); xFloat(HM, 'ปู้ด!', at(a), 330, '#b8e07a', 22); }
      else if (k === 'hot') xFloat(HM, 'ร้อนวูบ!', at(a), 230, '#ff8a8a', 18);
      else if (k === 'mosquito') { st.buzzT = 0; xFloat(HM, 'ยุงมา!', 480, 120, '#ffe08a', 18); }
      else if (k === 'land') xFloat(HM, 'ยุงเกาะ! ตบเลย', G.x[a] ? at(a) : 480, hy - 30, '#ffe08a', 16);
      else if (k === 'bite') { sfx.hbite(); xFloat(HM, 'โดนกัด!', 480, hy - 20, '#ff8a8a', 18); }
      else if (k === 'slap') { sfx.hslap(); st.slapT = 0.3; S.shake = Math.max(S.shake, .2); xFloat(HM, `แปะ! +${th(Bed.KILL)}`, 480, hy - 20, C.gold, 18); }
      else if (k === 'miss') { sfx.hslap(); xFloat(HM, 'พลาด!', at(a), hy - 20, '#c9bfef', 14); }
      else if (k === 'flap') { sfx.hwhoosh(); st.flapT = 0.5; xFloat(HM, 'พรึ่บ!', 480, 300, '#bfe6ff', 18); }
      else if (k === 'tug') { sfx.htug(); xFloat(HM, 'อย่าแย่งกัน!', 480, 260, '#ffb38a', 18); }
      else if (k === 'fall') { sfx.hthud(); S.shake = Math.max(S.shake, .5); xFloat(HM, 'ตกเตียง!', a === 'pink' ? HB0 - 10 : HB0 + Bed.BW * HK + 10, 360, '#ff8a8a', 20); }
      else if (k === 'wake') { sfx.hwake(); xFloat(HM, `${S.names[a]}ตื่นแล้ว!`, a === 'pink' ? 360 : 600, 110, '#ff8a8a', 20, 1.6); }
      else if (k === 'failed') { sfx.cout(); xFloat(HM, 'นอนไม่หลับทั้งคืน!', 480, 250, '#ff8a8a', 26, 2.2); }
      else if (k === 'morning') { sfx.hrooster(); xFloat(HM, 'เช้าแล้ว!', 480, 250, C.gold, 26, 2); }
    }
  },
  tick() {
    const st = HM.st, G = st.G, q = id => { const k = kInput(id); return { mx: k.mx, pull: k.use, act: k.act }; };
    if (!O.role) { HM.events(Bed.step(G, { pink: q('pink'), mint: q('mint') })); st.prev = HM.snap(G); return; }
    const li = q(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      HM.events(Bed.step(G, { [O.local]: li, [rid]: { mx: rq.mx, pull: rq.use, act: rq.act } }));
      rq.act = false; st.prev = HM.snap(G);
    } else {
      if (li.act) st.n.a++;
      Bed.step(G, { [O.local]: { mx: li.mx, pull: li.pull }, [rid]: { mx: 0, pull: G.pull[rid] } }, true);
    }
  },
  frameExtra(dt) {
    const st = HM.st, G = st.G;
    st.flapT = Math.max(0, st.flapT - dt); st.slapT = Math.max(0, st.slapT - dt);
    for (const w of ['pink', 'mint']) st.kickT[w] = Math.max(0, st.kickT[w] - dt);
    if (G.mq && S.mode === 'play') { st.buzzT -= dt; if (st.buzzT <= 0) { st.buzzT = 0.35; sfx.hbuzz(); } }
    // zzz drifting up from whoever sleeps well
    if (S.mode === 'play' && G.st === 'run' && Math.random() < dt * 2) for (const w of ['pink', 'mint']) if (G.awake[w] === 0 && G.Z[w] < 40) st.zs.push({ x: hx(G.x[w]) + 20, y: 120, life: 2 });
    for (const z of st.zs) { z.life -= dt; z.y -= 18 * dt; z.x += 6 * dt; }
    st.zs = st.zs.filter(z => z.life > 0);
  },
  result(G, s) {
    const sx = G.stats, msg = G.failed ? 'ตื่นกันบ่อยจนนอนไม่หลับทั้งคืน ครั้งหน้านอนชิดกันกลางเตียง แล้วคอยดึงผ้าห่มให้กัน'
      : s === 3 ? 'หลับสบายทั้งคืน ผ้าห่มผืนเดียวก็พอสำหรับสองคน' : s === 2 ? (sx.wakes ? 'หลับดีเกือบทั้งคืน ถ้าไม่ตื่นกลางดึกจะได้สามดาว' : 'หลับดี ลองนอนชิดกันให้นานกว่านี้จะอุ่นกว่า')
      : s === 1 ? 'รอดมาถึงเช้า คืนถัดไปเปิดแล้ว' : `ยังหลับไม่สนิทพอ ต้องได้ ${th(G.def.stars[0])} แต้ม นอนให้ผ้าห่มคลุมทั้งคู่ อย่าให้หนาวหรือร้อนเกินไป`;
    return { head: G.failed ? 'นอนไม่หลับ' : 'เช้าแล้ว', msg,
      stats: `<span>แต้ม <b>${th(Math.round(G.score))}</b></span><span>ตื่นกลางดึก <b>${th(sx.wakes)}</b> โดนยุงกัด <b>${th(sx.bites)}</b> ตบยุง <b>${th(sx.kills)}</b></span><span>นอนชิดกัน <b>${th(Math.round(sx.spoon))}</b> วิ แย่งผ้า <b>${th(sx.tugs)}</b></span>` };
  },
  encode() {
    const st = HM.st;
    if (O.role === 'host') return Bed.encode(st.G);
    const q = st.lastInp || {}, r2 = v => Math.round((v || 0) * 100) / 100;
    return { mx: r2(q.mx), pl: q.pull ? 1 : 0, an: st.n.a };
  },
  hostHears(m) { const rq = HM.st.remote; rq.mx = xNum(m.mx, -1, 1); rq.use = !!m.pl; if (xHeard(rq, 'A', m.an)) rq.act = true; },
  guestHears(m) { Bed.apply(HM.st.G, m, true); },
  render: bedRender
});

function bedRender() {
  const g = ctx, st = HM.st, G = st.G, def = G.def;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 7 * S.shake;
  const cold = Bed.coldAt(G), blast = cold > (def.ac || 7) * 1.05;
  g.save(); g.translate(ox, 0);
  // the room at night, seen from above (drawn once, stamped every frame)
  const top = 70, bot = 500, x0 = hx(0), x1 = hx(Bed.BW);
  stamp(g, 'bedRoom', 'r', -10, 0, VW + 20, VH, q => { q.translate(10, 0); bedRoom(q, top, bot, x0, x1); }, true);
  g.fillStyle = blast ? '#5aa0ff' : '#7be08a'; g.beginPath(); g.arc(566, 13, 2.2, 0, Math.PI * 2); g.fill();
  g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = blast ? '#5aa0ff' : '#7a7890'; g.fillText(blast ? 'เย็นจัด!' : `${th(Math.round(27 - cold))}°`, 548, 26);
  // pillows
  for (const w of ['pink', 'mint']) stamp(g, 'pillow' + w, '', hx(G.x[w]) - 56, top + 10, 116, 70, q => bedPillow(q, w));
  // the two of them: head on the pillow, body down the bed
  for (const w of ['pink', 'mint']) bedSleeper(g, G, w, top);
  // the air conditioner blowing over them
  g.strokeStyle = blast ? 'rgba(170,210,255,.5)' : 'rgba(170,210,255,.25)'; g.lineWidth = 2;
  for (let i = 0; i < (blast ? 9 : 5); i++) { const x = 400 + i * (160 / (blast ? 8 : 4)), s = (S.time * (blast ? 90 : 50) + i * 17) % 70; g.beginPath(); g.moveTo(x, 44 + s); g.quadraticCurveTo(x + 6, 52 + s, x, 60 + s); g.stroke(); }
  // the blanket
  const half = def.blanket / 2, bx0 = hx(G.c - half), bx1 = hx(G.c + half), lift = st.flapT > 0 ? Math.sin(st.flapT / 0.5 * Math.PI) * 30 : 0;
  g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, bx0 + 6, 176 + 8 - lift, bx1 - bx0, 300, 18); g.fill();
  stamp(g, 'quilt', String(Math.round(bx1 - bx0)), bx0, 176 - lift, bx1 - bx0, 300, q => bedQuilt(q, bx1 - bx0));
  if (G.tug) { g.strokeStyle = Math.sin(S.time * 30) > 0 ? '#ff8a8a' : '#ffe08a'; g.lineWidth = 3; rr(g, bx0, 176 - lift, bx1 - bx0, 300, 18); g.stroke(); }
  // a smell under the blanket
  if (G.stink > 0) { g.globalAlpha = Math.min(.6, G.stink / 120); g.fillStyle = '#9ac85a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(bx0 + (bx1 - bx0) * (0.2 + i * 0.15) + Math.sin(S.time * 2 + i) * 8, 170 - lift - 10 - (S.time * 20 + i * 9) % 30, 14, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
  // pulling: little arrows from where it is held
  for (const w of ['pink', 'mint']) if (G.pull[w]) { const x = hx(G.x[w]), dir = Math.sign(G.x[w] - G.c) || 1; g.fillStyle = w === 'pink' ? C.pink : C.mint; g.beginPath(); g.moveTo(x + dir * 14, 330); g.lineTo(x - dir * 4, 320); g.lineTo(x - dir * 4, 340); g.fill(); }
  // the mosquito
  const M = G.mq;
  if (M) {
    const mx = hx(M.x) + (M.st === 'sit' ? 0 : Math.sin(S.time * 17) * 4), my = M.st === 'sit' ? top + 34 : top + 20 + M.y * 1.6 + Math.sin(S.time * 23) * 3;
    g.fillStyle = '#2a2030'; g.beginPath(); g.ellipse(mx, my, 5, 2.4, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(220,230,255,.75)'; const fl = Math.sin(S.time * 80) * 3; g.beginPath(); g.ellipse(mx - 2, my - 4 - fl, 4, 2, -0.6, 0, Math.PI * 2); g.ellipse(mx + 2, my - 4 + fl, 4, 2, 0.6, 0, Math.PI * 2); g.fill();
    if (M.st === 'sit') { g.strokeStyle = '#ff6b6b'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 14 + Math.sin(S.time * 10) * 2, 0, Math.PI * 2); g.stroke(); }
  }
  if (st.slapT > 0) { g.fillStyle = `rgba(255,240,200,${st.slapT * 2})`; g.beginPath(); g.arc(480, top + 34, 30, 0, Math.PI * 2); g.fill(); }
  for (const z of st.zs) { g.globalAlpha = Math.min(1, z.life); g.font = `400 14px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#c9bfef'; g.fillText('z', z.x, z.y); }
  g.globalAlpha = 1;
  g.restore();
  drawParts(g);
  xDrawFloats(g, HM);
  bedHud(g, G);
  xCountdown(g, G, Bed.START);
  xBannerDraw(g, G, Bed.START, def.name, 'นอนชิดกันกลางเตียง ผ้าห่มจะคลุมทั้งคู่ · ใครหนาวกดค้างดึงผ้า อย่าดึงพร้อมกัน · ยุงเกาะใครให้ตบ');
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
// the room: floorboards, moonlight, a rug, bedside tables, the air conditioner, the bed itself
function bedRoom(g, top, bot, x0, x1) {
  // floorboards, moonlight from a window, a rug peeking out from under the bed
  for (let x = -10, k = 0; x < VW + 10; x += 40, k++) {
    g.fillStyle = k % 2 ? '#241d3c' : '#2a2244'; g.fillRect(x, 0, 40, VH);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 1.5, VH); const j = (k * 137) % VH; g.fillRect(x, j, 40, 1.5); g.fillRect(x, (j + 270) % VH, 40, 1.5);
    g.fillStyle = 'rgba(255,255,255,.025)'; g.fillRect(x + 8, 0, 2, VH);
  }
  g.fillStyle = 'rgba(190,200,255,.07)'; g.beginPath(); g.moveTo(VW, 40); g.lineTo(VW, 330); g.lineTo(640, 544); g.lineTo(380, 544); g.closePath(); g.fill();
  g.fillStyle = '#c99ab8'; g.beginPath(); g.ellipse(480, 528, 330, 48, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2d2e6'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.ellipse(480, 528, 306, 38, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  // bedside tables: a lamp on one, a clock and a bunny on the other
  for (const [tx, lamp] of [[x0 - 96, true], [x1 + 26, false]]) {
    g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, tx + 5, 74, 70, 64, 8); g.fill();
    g.fillStyle = '#6e4a34'; rr(g, tx, 68, 70, 64, 8); g.fill(); g.fillStyle = '#82583e'; rr(g, tx + 4, 72, 62, 56, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(tx + 8, 74, 54, 2);
    if (lamp) {
      const lg = g.createRadialGradient(tx + 35, 100, 4, tx + 35, 100, 90); lg.addColorStop(0, 'rgba(255,214,150,.32)'); lg.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = lg; g.fillRect(tx - 55, 10, 180, 180);
      g.fillStyle = '#ffd9a8'; g.beginPath(); g.arc(tx + 35, 100, 17, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#e8b880'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff4d8'; g.beginPath(); g.arc(tx + 35, 100, 7, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#bfe6ff'; rr(g, tx + 10, 82, 32, 22, 6); g.fill(); g.fillStyle = '#2a3a5a'; rr(g, tx + 13, 85, 26, 16, 4); g.fill();
      g.fillStyle = '#7be0ff'; g.font = `600 9px ${FONT}`; g.textAlign = 'center'; g.fillText('๐๒:๓๐', tx + 26, 97);
      g.fillStyle = '#fff3f8'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(tx + 52 + s * 5, 104, 3, 8, s * .2, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(tx + 52, 116, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffb8cf'; g.beginPath(); g.ellipse(tx + 47, 104, 1.2, 5, -.2, 0, Math.PI * 2); g.ellipse(tx + 57, 104, 1.2, 5, .2, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.ink; g.beginPath(); g.arc(tx + 49, 115, 1.2, 0, Math.PI * 2); g.arc(tx + 55, 115, 1.2, 0, Math.PI * 2); g.fill();
    }
  }
  // the air conditioner on the wall at the top
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, 383, 10, 200, 34, 8); g.fill();
  g.fillStyle = '#e8e6f2'; rr(g, 380, 6, 200, 34, 8); g.fill(); g.fillStyle = '#bdbad0'; g.fillRect(392, 30, 176, 4);
  g.fillStyle = '#d4d1e4'; for (let i = 0; i < 3; i++) g.fillRect(392, 12 + i * 5, 136, 1.5);
  // the bed: a frame with a headboard, a dotted sheet
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, x0 - 8, top - 4, x1 - x0 + 28, bot - top + 24, 12); g.fill();
  const fg = g.createLinearGradient(x0 - 14, 0, x1 + 14, 0); fg.addColorStop(0, '#553626'); fg.addColorStop(.5, '#6e4a34'); fg.addColorStop(1, '#553626');
  g.fillStyle = fg; rr(g, x0 - 14, top - 10, x1 - x0 + 28, bot - top + 24, 12); g.fill();
  g.fillStyle = '#7d5640'; rr(g, x0 - 20, top - 24, x1 - x0 + 40, 26, 10); g.fill(); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0 - 10, top - 20, x1 - x0 + 20, 3);
  g.fillStyle = '#ffb8cf'; heartPath(g, (x0 + x1) / 2, top - 12, 6); g.fill();
  g.fillStyle = '#efe9f7'; rr(g, x0, top, x1 - x0, bot - top, 8); g.fill();
  g.fillStyle = 'rgba(160,140,210,.14)'; for (let y = top + 10; y < bot; y += 22) for (let x = x0 + 10 + ((y - top) / 22 % 2) * 11; x < x1 - 4; x += 22) g.fillRect(x, y, 2.5, 2.5);
  // fairy lights along the headboard
  g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1; g.beginPath(); for (let x = x0 - 18; x <= x1 + 18; x += 6) g.lineTo(x, top - 26 + Math.sin((x - x0) / 40) * 4); g.stroke();
  for (let x = x0 - 12, k = 0; x <= x1 + 12; x += 24, k++) { const y = top - 24 + Math.sin((x - x0) / 40) * 4, c = ['#ffcf5a', '#ff8fb8', '#7fe8d0', '#c9a0ff'][k % 4]; const lg = g.createRadialGradient(x, y, 1, x, y, 10); lg.addColorStop(0, hexA(c, .55)); lg.addColorStop(1, hexA(c, 0)); g.fillStyle = lg; g.fillRect(x - 10, y - 10, 20, 20); g.fillStyle = c; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
  // a little teddy in the bottom right corner, a toy box
  const tx = VW - 110, ty = 420;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(tx + 4, ty + 34, 30, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c98a5a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(tx + s * 15, ty - 22, 8, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(tx + s * 16, ty + 26, 9, 7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(tx + s * 22, ty + 6, 6, 9, s * .5, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.ellipse(tx, ty + 10, 19, 22, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(tx, ty - 12, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ecc39a'; g.beginPath(); g.ellipse(tx, ty + 12, 11, 13, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(tx, ty - 7, 7, 5, 0, 0, Math.PI * 2); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = '#ecc39a'; g.beginPath(); g.arc(tx + s * 15, ty - 22, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(tx + s * 6, ty - 14, 2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = C.ink; g.beginPath(); g.ellipse(tx, ty - 9, 2.5, 1.8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ff8fb8'; g.beginPath(); g.moveTo(tx, ty + 2); g.lineTo(tx - 8, ty - 3); g.lineTo(tx - 8, ty + 7); g.closePath(); g.moveTo(tx, ty + 2); g.lineTo(tx + 8, ty - 3); g.lineTo(tx + 8, ty + 7); g.closePath(); g.fill();
  // slippers and a plant in the bottom left corner
  const sx = 70, sy = 440;
  for (const [dx, c] of [[0, '#ff8fb8'], [26, '#7fe8d0']]) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(sx + dx + 2, sy + 4, 10, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(sx + dx, sy, 10, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff6f0'; g.beginPath(); g.ellipse(sx + dx, sy - 6, 8, 9, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(sx + dx - 3, sy - 8, 1.3, 0, Math.PI * 2); g.arc(sx + dx + 3, sy - 8, 1.3, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx + 4, sy - 66, 22, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d9825a'; rr(g, sx - 14, sy - 86, 30, 22, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(sx - 12, sy - 84, 26, 3);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .42; g.fillStyle = i % 2 ? '#4fae5a' : '#6cc46a'; g.beginPath(); g.ellipse(sx + 1 + Math.cos(a) * 14, sy - 92 + Math.sin(a) * 12, 5, 12, a + Math.PI / 2, 0, Math.PI * 2); g.fill(); }
  // the edges: rolling off there wakes you
  g.fillStyle = 'rgba(255,120,120,.12)'; g.fillRect(x0, top, Bed.HB * HK * .6, bot - top); g.fillRect(x1 - Bed.HB * HK * .6, top, Bed.HB * HK * .6, bot - top);
}
function bedPillow(g, w) {
  g.translate(56, 10);
  g.fillStyle = 'rgba(60,40,90,.12)'; rr(g, -49, 4, 104, 56, 18); g.fill();
  const pg = g.createRadialGradient(0, 28, 8, 0, 28, 62); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#e2daf4');
  g.fillStyle = pg; rr(g, -52, 0, 104, 56, 18); g.fill(); g.strokeStyle = '#d9d3ee'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = hexA(w === 'pink' ? C.pink : C.mint, .55); g.setLineDash([3, 4]); g.lineWidth = 1.5; rr(g, -46, 6, 92, 44, 14); g.stroke(); g.setLineDash([]);
}
// a quilt: soft squares, little hearts and stars, stitching, a folded top edge
function bedQuilt(g, w) {
  const cw = 50;
  rr(g, 0, 0, w, 300, 18); g.clip();
  const bl = g.createLinearGradient(0, 0, w, 0); bl.addColorStop(0, '#7f9ff0'); bl.addColorStop(1, '#93b2f6'); g.fillStyle = bl; g.fillRect(0, 0, w, 300);
  const PATCH = ['#93b2f6', '#f7a8c8', '#a8e6cf', '#ffd59e', '#c9b6f2', '#8ad0f0'];
  for (let r = 0; r < 6; r++) for (let c = 0; c * cw < w; c++) {
    g.fillStyle = PATCH[(r * 4 + c * 7 + ((r + c) % 3)) % PATCH.length]; g.fillRect(c * cw, r * 50, cw, 50);
    const k = (r * 3 + c) % 4;
    if (k === 0) { g.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = r * 50 + 6; yy < r * 50 + 50; yy += 10) for (let xx = c * cw + 6 + ((yy / 10) % 2) * 5; xx < c * cw + cw; xx += 10) { g.beginPath(); g.arc(xx, yy, 1.6, 0, Math.PI * 2); g.fill(); } }
    else if (k === 1) { g.fillStyle = 'rgba(255,255,255,.18)'; for (let xx = c * cw; xx < c * cw + cw; xx += 10) g.fillRect(xx, r * 50, 4, 50); }
    else if (k === 2) { g.fillStyle = 'rgba(255,255,255,.16)'; for (let yy = r * 50; yy < r * 50 + 50; yy += 12) for (let xx = c * cw; xx < c * cw + cw; xx += 12) if (((xx - c * cw) / 12 + (yy - r * 50) / 12) % 2 < 1) g.fillRect(xx, yy, 12, 12); }
    const cx = c * cw + 25, cy = r * 50 + 27, m = (r * 2 + c) % 3;
    if (m === 0) { g.fillStyle = 'rgba(255,255,255,.75)'; heartPath(g, cx, cy, 6); g.fill(); g.fillStyle = 'rgba(255,120,170,.6)'; heartPath(g, cx, cy, 4); g.fill(); }
    else if (m === 1) { g.fillStyle = 'rgba(255,250,220,.85)'; twinkle(g, cx, cy, 6); }
    else { g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(cx, cy, 2.2, 0, Math.PI * 2); g.fill(); }
  }
  g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
  for (let i = 1; i < 6; i++) { g.moveTo(0, i * 50); g.lineTo(w, i * 50); }
  for (let c = 1; c * cw < w; c++) { g.moveTo(c * cw, 16); g.lineTo(c * cw, 300); }
  g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, w, 16); g.fillStyle = 'rgba(255,170,200,.5)'; for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, 16, 4, 0, Math.PI); g.fill(); }
  g.fillStyle = 'rgba(30,40,110,.12)'; g.fillRect(0, 16, w, 3);
}
function bedSleeper(g, G, w, top) {
  const st = HM.st, x = hx(G.x[w]), col = w === 'pink' ? C.pink : C.mint, dark = w === 'pink' ? C.pinkD : C.mintD, up = G.awake[w] > 0;
  const shake = st.kickT[w] > 0 ? Math.sin(S.time * 40) * 3 : 0, hot = G.H[w] > Bed.BAND[1], cold = G.H[w] < Bed.BAND[0];
  // body
  g.fillStyle = dark; rr(g, x - 46 + shake, 150, 92, 300, 30); g.fill();
  g.fillStyle = hexA(col, .55); rr(g, x - 40 + shake, 160, 80, 120, 26); g.fill();
  // head
  const hy = up ? top + 30 : top + 42, r = up ? 30 : 26;
  const hg = g.createRadialGradient(x - r * .35, hy - r * .4, r * .15, x, hy, r * 1.05); hg.addColorStop(0, LITE[w]); hg.addColorStop(.6, col); hg.addColorStop(1, dark);
  g.fillStyle = hg; g.beginPath(); g.arc(x, hy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - r * .45, hy - r * .5, r * .16, r * .26, -.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,128,170,.55)'; g.beginPath(); g.ellipse(x - 17, hy + 8, 5, 3, 0, 0, Math.PI * 2); g.ellipse(x + 17, hy + 8, 5, 3, 0, 0, Math.PI * 2); g.fill();
  if (!cold) { g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); if (up) { g.fillStyle = C.ink; g.ellipse(x, hy + 11, 2.6, 3.4, 0, 0, Math.PI * 2); g.fill(); } else { g.arc(x, hy + 7, 3, Math.PI * .2, Math.PI * .8); g.stroke(); } }
  if (hot) { g.fillStyle = 'rgba(255,60,60,.35)'; g.beginPath(); g.arc(x, hy, r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#bfe6ff'; g.beginPath(); g.ellipse(x + r * .7, hy - 6 + (S.time * 12 % 8), 2, 3, 0, 0, Math.PI * 2); g.fill(); }
  if (cold) { g.fillStyle = 'rgba(120,170,255,.35)'; g.beginPath(); g.arc(x, hy, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = C.ink;
  if (up) { for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + s * 10, hy - 2, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(x + s * 10, hy - 1, 3, 0, Math.PI * 2); g.fill(); } }
  else { g.lineWidth = 2; g.strokeStyle = C.ink; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 10, hy - 2, 5, 0.2, Math.PI - 0.2); g.stroke(); } }
  if (cold) { g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 5; i++) g.lineTo(x - 8 + i * 4, hy + 12 + (i % 2 ? 2 : -1)); g.stroke(); }
  { const wr = wearOf(w); if (wr.n) wearNeck(g, wr.n, w, x, hy + r * .95, r / 13.5, S.time); if (wr.f) { const keep = WARD.over; WARD.over = { [w]: { h: '', f: wr.f, n: '' } }; wearFace(g, w, x, hy - 2, 2, 0, S.time); WARD.over = keep; } }
  if (wearHat(g, w, x, hy - r + 3, r / 12.5)) {}
  else if (w === 'pink') { g.fillStyle = C.gold; g.beginPath(); g.moveTo(x + 14, hy - r + 4); g.lineTo(x + 6, hy - r - 4); g.lineTo(x + 6, hy - r + 10); g.closePath(); g.moveTo(x + 14, hy - r + 4); g.lineTo(x + 22, hy - r - 4); g.lineTo(x + 22, hy - r + 10); g.closePath(); g.fill(); }
  else { g.fillStyle = '#7cc46d'; g.beginPath(); g.ellipse(x + 6, hy - r - 3, 7, 3.5, -.5, 0, Math.PI * 2); g.fill(); }
}
function bedHud(g, G) {
  const def = G.def, left = Math.max(0, def.time - Math.max(0, G.t - Bed.START));
  xScoreBox(g, left, G.score, def.stars);
  const max = def.strikes || Bed.STRIKES;
  xStrikes(g, 30, G.strikes, max, 'ตื่นกลางดึก');
  // each sleeper: warm enough (the green band), and how close to waking up
  for (const [w, x] of [['pink', 92], ['mint', VW - 92]]) {
    const y = 222, bw = 140;
    panel(g, x - bw / 2 - 10, y - 30, bw + 20, 74, 12, .8);
    g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillStyle = w === 'pink' ? C.pink : C.mint; g.fillText(S.names[w], x, y - 14);
    const hb = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); hb.addColorStop(0, '#5aa0ff'); hb.addColorStop(Bed.BAND[0] / 100, '#9be07a'); hb.addColorStop(Bed.BAND[1] / 100, '#9be07a'); hb.addColorStop(1, '#ff6b6b');
    rr(g, x - bw / 2, y - 6, bw, 8, 4); g.fillStyle = hb; g.fill();
    const hxp = x - bw / 2 + bw * G.H[w] / 100; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(hxp, y - 8); g.lineTo(hxp - 5, y - 15); g.lineTo(hxp + 5, y - 15); g.fill();
    g.font = `600 10px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(G.awake[w] > 0 ? 'ตื่นแล้ว!' : G.H[w] < Bed.BAND[0] ? 'หนาว' : G.H[w] > Bed.BAND[1] ? 'ร้อน' : 'อุ่นพอดี', x, y + 16);
    rr(g, x - bw / 2, y + 22, bw, 6, 3); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill();
    if (G.Z[w] > 0) { rr(g, x - bw / 2, y + 22, Math.max(6, bw * G.Z[w] / 100), 6, 3); g.fillStyle = G.Z[w] > 70 ? '#ff6b6b' : '#ffcf5a'; g.fill(); }
    g.fillStyle = '#c9bfef'; g.font = `600 9px ${FONT}`; g.fillText('ใกล้ตื่น', x, y + 40);
  }
  if (S.mode !== 'play' || G.st !== 'run') return;
  for (const w of ['pink', 'mint']) {
    const o = w === 'pink' ? 'mint' : 'pink', x = hx(G.x[w]), cv = Bed.cover(G, w), y = 140;
    if (G.awake[w] > 0) continue;
    if (G.mq && G.mq.st === 'sit') xTip(g, w, G.mq.on === w ? 'ยุงเกาะ! ตบ' : 'ตบยุงให้แฟน!', x, y);
    else if (G.stink > 30 && G.stinkWho !== w) xTip(g, w, 'สะบัดผ้าห่ม!', x, y);
    else if (G.tug) xTip(g, w, 'อย่าดึงพร้อมกัน!', x, y);
    else if (w === 'pink' ? G.x.pink < Bed.HB + 18 : G.x.mint > Bed.BW - Bed.HB - 18) xTip(g, w, w === 'pink' ? 'จะตกเตียง →' : '← จะตกเตียง', x, y);
    else if (cv < 0.5 && G.H[w] < 50 && !G.pull[o]) xTip(g, w, 'กดค้างดึงผ้าห่ม', x, y);
    else if (G.H[w] > Bed.BAND[1] - 2) xTip(g, w, 'ร้อนไป ขยับออกนิด', x, y);
    else if (G.tell && G.tell.who === o && (G.tell.kind === 'kick' || G.tell.kind === 'roll')) xTip(g, w, 'แฟนจะดิ้น! เตรียมดึงผ้า', x, y);
  }
}

/* ---------- Climbing in at the window (ปีนหน้าต่างหาแฟน) ---------- */
Object.assign(sfx, {
  nstep() { noise(.06, 550, .07, 'lowpass', .8); },
  ncar() { noise(1.3, 300, .05, 'lowpass', .7, 800); tone(70, .9, 'sawtooth', .02, 140); },
  nwhoosh() { noise(.45, 400, .06, 'bandpass', .8, 1500); },
  nbark() { for (const t of [0, .17]) { tone(420, .09, 'sawtooth', .05, 260, t); noise(.08, 900, .05, 'bandpass', 2, 500, t); } },
  nseen() { tone(880, .12, 'triangle', .05, 660); tone(660, .22, 'triangle', .05, 440, .1); },
  ncreak() { tone(180, .4, 'sawtooth', .025, 260); noise(.4, 1200, .01, 'bandpass', 6); },
  nrustle() { noise(.18, 3200, .03, 'bandpass', 1.5); noise(.12, 2400, .02, 'bandpass', 1.5, 0, .08); },
  ncrunch() { noise(.06, 2500 + Math.random() * 1500, .09, 'bandpass', 3); },
  nclimb() { noise(.06, 1600 + Math.random() * 600, .045, 'bandpass', 3); },
  nthud() { tone(80, .22, 'sine', .09, 45); noise(.15, 400, .05, 'lowpass', .8); },
  nsheet() { noise(.2, 1500, .045, 'bandpass', 1, 600); }
});
const NGY = VH - 44, ny = y => NGY - y;
const NCOL = { pink: C.pink, mint: C.mint };                         // the players' colours (C is the climber inside the drawing code)
const NM = xMode({
  kind: 'win', md: 'n', pres: 'nw', dk: 'n', L: NLEVELS, pk: 'n', Eng: Win, pad: 'k', list: 'nlevels', olist: 'oLevelsN', starsAll: 'nStarsAll',
  R: ['climb', 'top'], rk: 'nroles', roleName: { climb: 'เป็นคนปีน', top: 'รออยู่บนห้อง' },
  label: i => 'ภารกิจที่ ' + th(i + 1), word: 'ไป', goWord: 'ไปหาแฟน', fresh: 'ยังไม่เคยไป', nextWord: 'ภารกิจถัดไป', againWord: 'ลองภารกิจนี้อีกครั้ง',
  score: G => G.score,
  kWords: id => (NM.roleOf(id) === 'climb' ? { act: 'ซ่อน', use: '' } : { act: 'ขึ้น<br>เตียง', use: '' }),
  chips() {
    const cp = NM.st.roles.climb === 'pink', set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    set('#nRolePinkK', cp ? 'A D เดิน W ปีน' : 'W S ผ้าปู Space เตียง'); set('#nRolePinkT', cp ? 'คนปีน' : 'คนบนห้อง');
    set('#nRoleMintK', cp ? '↑ ↓ ผ้าปู Enter เตียง' : '← → เดิน ↑ ปีน'); set('#nRoleMintT', cp ? 'คนบนห้อง' : 'คนปีน');
  },
  onLoad() { Object.assign(NM.st, { stepT: 0, crunchT: 0, climbT: 0, carSnd: -1, face: 1, lastX: NM.st.G.c.x }); },
  snap: G => ({ st: G.st, over: G.over, won: G.won, failed: G.failed, s: Object.assign({}, G.stats), look: G.look.st, dt: G.doorTold, ct: G.carTold, on: G.c.on, x: G.strikes }),
  changes(p, n) {
    const ev = [];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.s.seen > p.s.seen) ev.push('seen:x');
    if (n.s.sheet > p.s.sheet) ev.push('seen:sheet');
    if (n.s.barks > p.s.barks) ev.push('bark');
    if (n.s.caught > p.s.caught) ev.push('caught:bed');
    if (n.s.falls > p.s.falls) ev.push('fall:x');
    if (n.look === 'tell' && p.look !== 'tell') ev.push('look:tell');
    if (n.look === 'look' && p.look !== 'look') ev.push('look');
    if (n.dt !== p.dt && n.dt >= 0) ev.push('door');
    if (n.ct !== p.ct && n.ct >= 0) ev.push('car');
    if (n.won && !p.won) ev.push('in');
    else if (n.over && !p.over) ev.push(n.x >= (NM.st.G.def.strikes || Win.STRIKES) ? 'caught' : 'dawn');
    return ev;
  },
  events(ev) {
    const st = NM.st, G = st.G, C = G.c;
    for (const e of ev) {
      const [k, a] = e.split(':');
      if (k === 'go') sfx.ilaunch();
      else if (k === 'hide' || k === 'unhide') sfx.nrustle();
      else if (k === 'grab') sfx.nsheet();
      else if (k === 'top') { if (a === 'toBed' || a === 'toWindow') sfx.hwhoosh(); }
      else if (k === 'bark') { sfx.nbark(); xFloat(NM, 'โฮ่ง! โฮ่ง!', 900, ny(60), '#ffe08a', 18); }
      else if (k === 'look' && a === 'tell') xFloat(NM, 'ใครน่ะ!', G.look.x || 480, ny((G.look.y || 70) + 70), '#ffb38a', 20, 1.6);
      else if (k === 'car') sfx.ncar();
      else if (k === 'seen') { sfx.nseen(); S.shake = Math.max(S.shake, .4); xFloat(NM, a === 'sheet' ? 'เห็นผ้าห้อยอยู่!' : 'เห็นนะ!', a === 'sheet' ? Win.her(G.def).x : C.x, ny(a === 'sheet' ? Win.her(G.def).y - 40 : C.y + 80), '#ff8a8a', 22, 1.6); }
      else if (k === 'caught' && a === 'bed') { sfx.ncreak(); sfx.nseen(); S.shake = Math.max(S.shake, .4); xFloat(NM, 'ไม่นอนอีกเหรอ!', Win.her(G.def).x, ny(Win.her(G.def).y + 80), '#ff8a8a', 22, 1.6); }
      else if (k === 'door' && a === 'ok') sfx.ncreak();
      else if (k === 'door') st.stepT = 0;
      else if (k === 'fall') { sfx.nthud(); S.shake = Math.max(S.shake, .6); xFloat(NM, a === 'high' || a === 'x' ? 'ร่วง!' : 'ตุ้บ', C.x, ny(60), '#ff8a8a', 20); }
      else if (k === 'in') { sfx.win(); const h = Win.her(G.def); burst(h.x, ny(h.y) - 20, 16, C.pink, { type: 'heart', size: 5, speed: 90, up: 120, life: 1.4, g: -40 }); xFloat(NM, G.def.cake ? 'เซอร์ไพรส์! สุขสันต์วันเกิด!' : 'เข้ามาได้แล้ว!', h.x - 80, ny(h.y) - 40, C.gold, 24, 2.2); }
      else if (k === 'caught') { sfx.cout(); xFloat(NM, 'โดนจับได้แล้ว!', 480, 220, '#ff8a8a', 26, 2.2); }
      else if (k === 'dawn') { sfx.hrooster(); xFloat(NM, 'ฟ้าสางแล้ว ไม่ทันซะแล้ว', 480, 220, '#ffb38a', 22, 2.2); }
    }
  },
  tick() {
    const st = NM.st, G = st.G, R = st.roles, q = id => { const k = kInput(id); return { mx: k.mx, my: k.my, act: k.act }; };
    if (!O.role) { NM.events(Win.step(G, { climb: q(R.climb), top: q(R.top) })); st.prev = NM.snap(G); return; }
    const li = q(O.local), mine = NM.roleOf(O.local), theirs = mine === 'climb' ? 'top' : 'climb';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      NM.events(Win.step(G, { [mine]: li, [theirs]: { mx: rq.mx, my: rq.my, act: false } }));
      st.prev = NM.snap(G);
    } else {
      // the guest moves its own player at once and tells the host where it is
      if (li.act) st.n.a++;
      NM.events(Win.step(G, { [mine]: li }, true).filter(e => /^(hide|unhide|grab|top:)/.test(e)));
    }
  },
  frameExtra(dt) {
    const st = NM.st, G = st.G, C = G.c, def = G.def;
    if (Math.abs(C.x - st.lastX) > 0.3) st.face = Math.sign(C.x - st.lastX); st.lastX = C.x;
    if (S.mode !== 'play' || G.st !== 'run') return;
    // footsteps on the stairs while dad comes to her door
    const door = Win.doorAt(def, G.t);
    if (door && door[0] === 'tell') { st.stepT -= dt; if (st.stepT <= 0) { st.stepT = 0.42; sfx.nstep(); } }
    // a car: the engine, then the whoosh as it passes
    const car = Win.carAt(def, G.t);
    if (car && car.st === 'sweep' && st.carSnd !== car.i) { st.carSnd = car.i; sfx.nwhoosh(); }
    // gravel under foot, the sheet rustling
    if (C.on === 'ground' && C.mv && Win.onGravel(def, C.x)) { st.crunchT -= dt * (C.sp / Win.WALK + .2); if (st.crunchT <= 0) { st.crunchT = 0.16; sfx.ncrunch(); } }
    if (C.on === 'sheet' && C.mv) { st.climbT -= dt; if (st.climbT <= 0) { st.climbT = 0.22; sfx.nclimb(); } }
  },
  result(G, s) {
    const sx = G.stats, msg = !G.won ? (G.failed && G.strikes >= (G.def.strikes || Win.STRIKES) ? 'โดนจับได้ครบสามครั้ง คืนนี้อดเจอกัน ครั้งหน้ายืนนิ่งๆ ตอนไฟส่อง แล้วฟังเสียงเดินขึ้นบันไดให้ดี' : 'ฟ้าสางก่อนจะเข้าห้องได้ ครั้งหน้ารีบกว่านี้อีกนิด')
      : s === 3 ? 'เข้าห้องได้เร็วแถมไม่มีใครรู้ คู่นี้ภารกิจลับเก่งมาก' : s === 2 ? (G.strikes ? 'เข้ามาได้ แต่มีพลาดให้เห็นอยู่ ถ้าไม่โดนเลยจะได้สามดาว' : 'เนียนดี ลองเข้าห้องให้เร็วกว่านี้')
      : s === 1 ? 'เข้ามาได้อย่างหวุดหวิด ภารกิจถัดไปเปิดแล้ว' : 'เข้ามาได้ แต่โดนจับได้บ่อยไป ต้องได้อย่างน้อย ' + th(G.def.stars[0]) + ' แต้ม';
    return { head: G.won ? 'เข้าห้องได้' : G.strikes >= (G.def.strikes || Win.STRIKES) ? 'โดนจับได้' : 'ฟ้าสาง', msg,
      stats: `<span>แต้ม <b>${th(G.score)}</b></span><span>เข้าห้องใน <b>${G.won ? th(Math.round(G.inT)) + ' วิ' : '-'}</b></span><span>โดนเห็น <b>${th(sx.seen + sx.sheet)}</b> โดนพ่อจับ <b>${th(sx.caught)}</b> หมาเห่า <b>${th(sx.barks)}</b> ร่วง <b>${th(sx.falls)}</b></span>` };
  },
  encode() {
    const st = NM.st;
    if (O.role === 'host') return Win.encode(st.G);
    return Win.guestMsg(st.G, NM.roleOf(O.local), st.lastInp, st.n.a);
  },
  hostHears(m) { Win.hostHears(NM.st.G, NM.roleOf(O.local === 'pink' ? 'mint' : 'pink'), m, NM.st.remote); },
  guestHears(m) { Win.apply(NM.st.G, m, NM.roleOf(O.local), true); },
  fresher: () => ({ seen: -1, mx: 0, my: 0, act: false }),
  render: winRender
});

// the night, the house front, the yard and the road: everything that does not move (drawn once per mission)
function winScene(g, def) {
  // the night sky, the moon
  const sk = g.createLinearGradient(0, 0, 0, NGY); sk.addColorStop(0, '#0c0b24'); sk.addColorStop(1, '#2a2350'); g.fillStyle = sk; g.fillRect(-10, 0, VW + 20, NGY);
  for (let i = 0; i < 46; i++) { const x = (i * 173 + 37) % VW, y = (i * 71) % 110 + 6; g.fillStyle = `rgba(255,255,255,${.3 + (i % 5) * .1})`; g.fillRect(x, y, 1.6, 1.6); }
  { const mx = 640, my = 52, mg = g.createRadialGradient(mx, my, 8, mx, my, 80); mg.addColorStop(0, 'rgba(255,246,200,.35)'); mg.addColorStop(1, 'rgba(255,246,200,0)');
    g.fillStyle = mg; g.fillRect(mx - 80, my - 80, 160, 160); g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(mx, my, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(220,206,160,.55)'; g.beginPath(); g.arc(mx - 6, my - 4, 4, 0, Math.PI * 2); g.arc(mx + 6, my + 6, 3, 0, Math.PI * 2); g.arc(mx + 5, my - 7, 2, 0, Math.PI * 2); g.fill(); }
  // the house front: trees behind it, a tiled roof with a chimney, siding, a drainpipe
  const roof = Math.min(...def.windows.map(w => ny(w.y))) - 80;
  g.fillStyle = '#100d22'; for (let x = -20, k = 0; x < VW + 40; x += 46, k++) { const hh = hash(k, 12); g.beginPath(); g.arc(x, roof - 6 - hh % 22, 22 + hh % 12, 0, Math.PI * 2); g.fill(); }
  { const cx = 640; g.fillStyle = '#4a3040'; g.fillRect(cx, roof - 68, 28, 60); g.fillStyle = '#5a3a4c'; g.fillRect(cx - 4, roof - 74, 36, 8); }
  { const wg = g.createLinearGradient(0, roof, 0, NGY); wg.addColorStop(0, '#4f4274'); wg.addColorStop(1, '#3d3360'); g.fillStyle = wg; g.fillRect(-10, roof, VW + 20, NGY - roof); }
  for (let y = roof + 8, k = 0; y < NGY; y += 32, k++) { g.fillStyle = k % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.05)'; g.fillRect(-10, y, VW + 20, 32); }
  g.fillStyle = '#342b52'; for (let y = roof + 16; y < NGY; y += 32) g.fillRect(-10, y, VW + 20, 2);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = roof + 18; y < NGY; y += 32) g.fillRect(-10, y, VW + 20, 1.5);
  // ivy climbing up the corners, with little white flowers
  for (const [x0, dir] of [[24, 1], [VW - 30, -1]]) {
    for (let k = 0; k < 3; k++) {
      let x = x0 + k * 14 * dir, y = NGY - 4; g.strokeStyle = '#2f5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y);
      const hgt = 120 + k * 50 + (hash(k, x0) % 60);
      for (let t = 0; t < hgt; t += 12) { x += Math.sin(t * .08 + k) * 3 * dir; y -= 12; g.lineTo(x, y); }
      g.stroke();
      x = x0 + k * 14 * dir; y = NGY - 4;
      for (let t = 0; t < hgt; t += 12) { x += Math.sin(t * .08 + k) * 3 * dir; y -= 12; const side = (t / 12) % 2 ? 1 : -1; g.fillStyle = (t / 12 + k) % 3 ? '#3f8f4a' : '#58a85d'; g.beginPath(); g.ellipse(x + side * 5, y + 2, 5, 3, side * .6, 0, Math.PI * 2); g.fill(); if ((t / 12 + k) % 5 === 2) { g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(x + side * 7, y - 2, 2, 0, Math.PI * 2); g.fill(); } }
    }
  }
  g.save(); g.beginPath(); g.moveTo(-20, roof + 4); g.lineTo(VW / 2, roof - 50); g.lineTo(VW + 20, roof + 4); g.closePath();
  const rg = g.createLinearGradient(0, roof - 50, 0, roof + 4); rg.addColorStop(0, '#74394b'); rg.addColorStop(1, '#4e2632'); g.fillStyle = rg; g.fill(); g.clip();
  g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = roof - 46, r = 0; y < roof + 6; y += 9, r++) for (let x = (r % 2) * 9 - 20; x < VW + 20; x += 18) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI); g.fill(); }
  g.restore();
  g.fillStyle = '#2a2236'; g.fillRect(-10, roof + 2, VW + 20, 7); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-10, roof + 2, VW + 20, 1.5);
  g.strokeStyle = 'rgba(255,240,200,.4)'; g.lineWidth = 1; g.beginPath(); for (let x = -10; x <= VW + 10; x += 6) g.lineTo(x, roof + 12 + Math.abs(Math.sin(x / 60)) * 8); g.stroke();
  for (let x = 14, k = 0; x < VW; x += 30, k++) { const y = roof + 13 + Math.abs(Math.sin(x / 60)) * 8, c = ['#ffcf5a', '#ff8fb8', '#7fe8d0', '#c9a0ff'][k % 4]; const lg = g.createRadialGradient(x, y, 1, x, y, 12); lg.addColorStop(0, hexA(c, .5)); lg.addColorStop(1, hexA(c, 0)); g.fillStyle = lg; g.fillRect(x - 12, y - 12, 24, 24); g.fillStyle = c; g.beginPath(); g.ellipse(x, y + 1, 2.4, 3.2, 0, 0, Math.PI * 2); g.fill(); }
  // a cat on the roof, looking at the moon
  { const cx = 200, cy = roof - 18 - (200 - VW / 2) / (VW / 2) * -50 * 0 ; const ry = roof + 4 - (50 * (1 - Math.abs(cx - VW / 2) / (VW / 2 + 20))); g.fillStyle = '#1a1530';
    g.beginPath(); g.ellipse(cx, ry - 12, 9, 12, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx + 2, ry - 27, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - 3, ry - 31); g.lineTo(cx - 2, ry - 39); g.lineTo(cx + 3, ry - 33); g.fill(); g.beginPath(); g.moveTo(cx + 4, ry - 33); g.lineTo(cx + 8, ry - 39); g.lineTo(cx + 8, ry - 30); g.fill();
    g.strokeStyle = '#1a1530'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 6, ry - 4); g.quadraticCurveTo(cx - 20, ry - 2, cx - 16, ry - 18); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(cx + 0, ry - 28, 1.4, 0, Math.PI * 2); g.arc(cx + 5, ry - 28, 1.4, 0, Math.PI * 2); g.fill(); void cy; }
  g.fillStyle = '#4a405e'; g.fillRect(10, roof + 9, 6, NGY - roof - 9); g.fillRect(6, NGY - 8, 14, 8);
  g.fillStyle = '#2a2236'; g.fillRect(-10, NGY - 12, VW + 20, 12);
  // the ground: grass, gravel, bushes, the dog's house
  g.fillStyle = '#2b4a32'; g.fillRect(-10, NGY, VW + 20, VH - NGY);
  g.fillStyle = '#3a5a3e'; g.fillRect(-10, NGY, VW + 20, 5);
  for (let x = 0; x < VW; x += 9) { const hh = hash(x, 4); if (hh % 3 === 0) continue; const hgt = 4 + hh % 6; g.fillStyle = hh & 4 ? '#456e4a' : '#2f5236'; g.beginPath(); g.moveTo(x, NGY + 2); g.lineTo(x + 2, NGY - hgt); g.lineTo(x + 4, NGY + 2); g.lineTo(x + 6, NGY - hgt * .6); g.lineTo(x + 8, NGY + 2); g.closePath(); g.fill(); }
  for (const [a, b] of def.gravel || []) { g.fillStyle = '#7a7480'; g.fillRect(a, NGY - 2, b - a, 9); g.fillStyle = '#a8a2b0'; for (let x = a + 3; x < b; x += 7) g.fillRect(x, NGY + (x * 7 % 5), 2, 2); }
  if (def.dog) {
    const dx = 912;
    // the dog's house: plank walls, a red roof, a name plate
    g.fillStyle = '#9a6a44'; g.beginPath(); g.moveTo(dx - 24, NGY); g.lineTo(dx - 24, NGY - 30); g.lineTo(dx, NGY - 46); g.lineTo(dx + 24, NGY - 30); g.lineTo(dx + 24, NGY); g.fill();
    g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = NGY - 26; y < NGY; y += 7) g.fillRect(dx - 24, y, 48, 1.2);
    g.fillStyle = '#c9504a'; g.beginPath(); g.moveTo(dx - 30, NGY - 28); g.lineTo(dx, NGY - 50); g.lineTo(dx + 30, NGY - 28); g.lineTo(dx + 26, NGY - 25); g.lineTo(dx, NGY - 44); g.lineTo(dx - 26, NGY - 25); g.closePath(); g.fill();
    g.fillStyle = '#1a1424'; g.beginPath(); g.arc(dx, NGY - 10, 11, Math.PI, 0); g.fill(); g.fillRect(dx - 11, NGY - 10, 22, 10);
    g.fillStyle = '#fff3d8'; rr(g, dx - 9, NGY - 36, 18, 7, 2); g.fill();
  }
  for (let x = 30; x < VW - 20; x += 22) { const hh = hash(x, 9); if (hh % 4 === 0) continue; const c = ['#ffd1e8', '#fff3b0', '#c9b6f2', '#ff9ab5'][hh % 4]; g.fillStyle = '#3f8f4a'; g.fillRect(x, NGY - 8, 1.5, 8); g.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, NGY - 10 + Math.sin(a) * 2.2, 1.7, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x, NGY - 10, 1.2, 0, Math.PI * 2); g.fill(); }
  { const lx = 70; const lg = g.createRadialGradient(lx, NGY - 70, 4, lx, NGY - 70, 110); lg.addColorStop(0, 'rgba(255,214,140,.35)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = lg; g.fillRect(lx - 110, NGY - 180, 220, 220);
    g.fillStyle = '#2a2440'; g.fillRect(lx - 2, NGY - 70, 4, 70); g.fillRect(lx - 7, NGY - 4, 14, 4); g.fillStyle = '#3a3256'; g.beginPath(); g.moveTo(lx - 9, NGY - 70); g.lineTo(lx + 9, NGY - 70); g.lineTo(lx + 5, NGY - 82); g.lineTo(lx - 5, NGY - 82); g.closePath(); g.fill();
    g.fillStyle = '#ffe4a8'; g.beginPath(); g.moveTo(lx - 7, NGY - 70); g.lineTo(lx + 7, NGY - 70); g.lineTo(lx + 4, NGY - 64); g.lineTo(lx - 4, NGY - 64); g.closePath(); g.fill(); }
  // the road in front, and the car itself
  g.fillStyle = '#2a2836'; g.fillRect(-10, NGY + 20, VW + 20, VH - NGY - 20);
  g.fillStyle = '#4a4656'; g.fillRect(-10, NGY + 18, VW + 20, 4);
  g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % VW, NGY + 24 + (i * 13) % 18, 2, 1.5);
  g.fillStyle = '#d9d3c0'; for (let x = 0; x < VW; x += 60) g.fillRect(x, NGY + 32, 30, 2);
}
// the bushes, drawn once (they go in front of whoever hides in them)
function winBushes(g, def) {
  for (const b of def.bushes || []) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(b.x, NGY + 2, b.w / 2 + 8, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a5e34'; g.beginPath(); g.ellipse(b.x, NGY - 18, b.w / 2 + 4, 26, 0, Math.PI, 0); g.fill(); g.fillRect(b.x - b.w / 2 - 4, NGY - 18, b.w + 8, 18);
    g.fillStyle = '#3f8f4a'; g.beginPath(); g.arc(b.x - b.w * .22, NGY - 26, b.w * .26, 0, Math.PI * 2); g.arc(b.x + b.w * .2, NGY - 30, b.w * .28, 0, Math.PI * 2); g.arc(b.x, NGY - 38, b.w * .24, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#58a85d'; g.beginPath(); g.arc(b.x - b.w * .3, NGY - 34, b.w * .11, 0, Math.PI * 2); g.arc(b.x + b.w * .08, NGY - 46, b.w * .1, 0, Math.PI * 2); g.arc(b.x + b.w * .3, NGY - 38, b.w * .08, 0, Math.PI * 2); g.fill();
    for (let q = 0; q < 5; q++) { const fx = b.x + (q - 2) * b.w * .18, fy = NGY - 14 - ((q * 7) % 4) * 7; g.fillStyle = q % 2 ? '#ffd1e8' : '#fff6e0'; g.beginPath(); g.arc(fx, fy, 2.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffcf5a'; g.fillRect(fx - .6, fy - .6, 1.2, 1.2); }
  }
}
function winRender() {
  const g = ctx, st = NM.st, G = st.G, def = G.def, C = G.c, T = G.top, h = Win.her(def), R = st.roles;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 7 * S.shake;
  g.save(); g.translate(ox, 0);
  // the scene that does not move, then the dawn over the sky, a few twinkles, the chimney's smoke
  const roof = Math.min(...def.windows.map(w => ny(w.y))) - 80;
  stamp(g, 'winScene', def.name, -10, 0, VW + 20, VH, q => { q.translate(10, 0); winScene(q, def); }, true);
  const dawn = Math.max(0, (G.t - Win.START) / def.time - 0.75) * 4;
  if (dawn > 0) { g.fillStyle = `rgba(255,170,120,${dawn * .35})`; g.beginPath(); g.moveTo(-10, 0); g.lineTo(VW + 10, 0); g.lineTo(VW + 10, roof + 4); g.lineTo(VW / 2, roof - 50); g.lineTo(-10, roof + 4); g.closePath(); g.fill(); }
  for (let i = 0; i < 46; i += 9) { const x = (i * 173 + 37) % VW, y = (i * 71) % 110 + 6, a = .35 + .3 * Math.sin(S.time * (1 + i % 3) + i); g.fillStyle = `rgba(255,250,220,${a * .8})`; twinkle(g, x + .8, y + .8, 4); }
  g.fillStyle = 'rgba(220,220,240,.1)'; for (let i = 0; i < 4; i++) { const u = (S.time * .25 + i / 4) % 1; g.beginPath(); g.arc(654 + Math.sin(u * 6 + i) * 8 + u * 20, roof - 80 - u * 60, 6 + u * 10, 0, Math.PI * 2); g.fill(); }
  // light from lit rooms down the wall and onto the ground (and a glow where dad is about to switch one on)
  const dadRoom = Win.dadAt(def, G.t), glow = Win.glowAt(def, G.t);
  for (const w of def.windows) {
    const lit = w.room === dadRoom && w.room !== 'her', soon = w.room === glow;
    if (!lit && !soon) continue;
    const a = lit ? 0.22 : 0.06 + 0.05 * Math.sin(S.time * 14);
    const lg = g.createLinearGradient(0, ny(w.y), 0, NGY + 20); lg.addColorStop(0, `rgba(255,220,130,${a})`); lg.addColorStop(1, `rgba(255,220,130,${a * .6})`);
    g.fillStyle = lg; g.beginPath(); g.moveTo(w.x - 32, ny(w.y)); g.lineTo(w.x + 32, ny(w.y)); g.lineTo(w.x + Win.LIGHT_W, NGY + 30); g.lineTo(w.x - Win.LIGHT_W, NGY + 30); g.closePath(); g.fill();
  }
  // windows
  for (const w of def.windows) winWindow(g, G, w, dadRoom, glow);
  // dad looking out of a window with a torch
  if (G.look.st) {
    const L = G.look, wy = ny(L.y) - 26;
    g.fillStyle = '#1a1424'; g.beginPath(); g.arc(L.x, wy, 13, 0, Math.PI * 2); g.fill();
    if (L.st === 'look') { g.fillStyle = 'rgba(255,250,200,.2)'; g.beginPath(); g.moveTo(L.x - 6, wy + 8); g.lineTo(L.x + 6, wy + 8); g.lineTo(L.x + Win.LOOK_W, NGY + 20); g.lineTo(L.x - Win.LOOK_W, NGY + 20); g.closePath(); g.fill(); }
    else { g.font = `400 16px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#ffb38a'; g.fillText('!', L.x + 20, wy - 10); }
  }
  if (def.dog) {
    const dx = 912, d = G.dog;
    // the dog: wags when it hears something, ears up when awake
    const up = d > 50, hy = NGY - 15 - (up ? 4 : 0), wag = d > 80 ? Math.sin(S.time * 20) * 6 : up ? Math.sin(S.time * 6) * 3 : 0;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(dx - 38, NGY + 1, 22, 4, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c99050'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(dx - 24, NGY - 10); g.quadraticCurveTo(dx - 16, NGY - 18 + wag, dx - 19, NGY - 24 + wag); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#d9a55a'; g.beginPath(); g.ellipse(dx - 36, NGY - 9, 15, 9.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2d2a0'; g.beginPath(); g.ellipse(dx - 38, NGY - 5, 8, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d9a55a'; g.beginPath(); g.arc(dx - 49, hy, 8.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8574f'; g.fillRect(dx - 45, hy + 4, 3, 7);
    g.fillStyle = '#f2d2a0'; g.beginPath(); g.ellipse(dx - 55, hy + 2.5, 4.5, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1f2a'; g.beginPath(); g.arc(dx - 58.5, hy + 1.2, 1.7, 0, Math.PI * 2); g.fill();
    if (up) { g.fillStyle = '#2a1f2a'; g.beginPath(); g.arc(dx - 51, hy - 2, 1.8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.fillRect(dx - 51.6, hy - 3, .9, .9); }
    else { g.strokeStyle = '#2a1f2a'; g.lineWidth = 1.2; g.beginPath(); g.arc(dx - 51, hy - 2.6, 2, Math.PI * .15, Math.PI * .85); g.stroke(); }
    g.fillStyle = 'rgba(255,128,150,.45)'; g.beginPath(); g.ellipse(dx - 51, hy + 4, 2, 1.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a8763a'; g.beginPath(); g.ellipse(dx - 46, hy - 6 - (up ? 3 : 0), 3.2, up ? 6 : 4, up ? -.2 : 1, 0, Math.PI * 2); g.fill();
    g.font = `400 12px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = d > 80 ? '#ff8a8a' : d > 50 ? '#ffe08a' : '#c9bfef'; g.fillText(d > 80 ? 'แฮ่!' : d > 50 ? '?' : 'z', dx - 50, NGY - 36 - Math.sin(S.time * 3) * 3);
  }
  // the sheet hanging from her window
  if (T.len > 2) {
    const top = ny(h.y), bot = ny(Win.sheetBottom(G));
    g.fillStyle = '#f2eef8'; g.fillRect(h.x - 6, top, 12, bot - top);
    g.fillStyle = 'rgba(255,170,200,.35)'; for (let y = top + 4; y < bot - 6; y += 16) g.fillRect(h.x - 6, y, 12, 6);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(h.x + 3, top, 3, bot - top);
    g.fillStyle = '#c9c2da'; for (let y = top + 30; y < bot - 4; y += 42) { g.beginPath(); g.ellipse(h.x, y, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
    if (def.sheet > 220) { g.fillStyle = '#ffd8e8'; g.fillRect(h.x - 6, Math.max(top, bot - 120), 12, Math.min(120, bot - top)); }
  }
  // headlights: a car on the road, its light sweeping across the house
  const car = Win.carAt(def, G.t);
  if (car && car.st === 'sweep') {
    g.fillStyle = 'rgba(255,250,220,.18)'; g.fillRect(car.x - Win.CAR_W, roof, Win.CAR_W * 2, NGY - roof + 10);
    g.fillStyle = 'rgba(255,250,220,.12)'; g.fillRect(car.x - Win.CAR_W * .6, roof, Win.CAR_W * 1.2, NGY - roof + 10);
  }
  // bushes (in front of whoever hides in them)
  const climberIn = C.on === 'in';
  if (!C.hid && !climberIn) winClimber(g, G);
  stamp(g, 'winBushes', def.name, 0, NGY - 64, VW, 74, q => { q.translate(0, -(NGY - 64)); winBushes(q, def); });
  for (const b of def.bushes || []) {
    if (C.hid && Math.abs(C.x - b.x) < b.w / 2) { const k = R.climb === 'pink' ? NCOL.pink : NCOL.mint; g.fillStyle = '#fff'; g.beginPath(); g.arc(C.x - 5, NGY - 30, 3, 0, Math.PI * 2); g.arc(C.x + 5, NGY - 30, 3, 0, Math.PI * 2); g.fill(); g.fillStyle = k; g.fillRect(C.x - 10, NGY - 22, 20, 3); }
  }
  if (car && car.st === 'sweep') {
    const x = car.x, cy = NGY + 14;
    for (const wx of [x - 28, x + 28]) { g.fillStyle = '#1a1820'; g.beginPath(); g.arc(wx, cy + 21, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a8a9a'; g.beginPath(); g.arc(wx, cy + 21, 3.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#b84444'; rr(g, x - 26, cy - 12, 50, 16, 7); g.fill();
    g.fillStyle = 'rgba(190,220,255,.75)'; rr(g, x - 22, cy - 9, 21, 10, 3); g.fill(); rr(g, x + 1, cy - 9, 20, 10, 3); g.fill();
    const cg = g.createLinearGradient(0, cy, 0, cy + 20); cg.addColorStop(0, '#e8665e'); cg.addColorStop(1, '#a83a3a'); g.fillStyle = cg; rr(g, x - 46, cy, 92, 22, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x - 38, cy + 4, 64, 2);
    g.fillStyle = '#fff6c9'; rr(g, x + 40, cy + 6, 7, 6, 2); g.fill(); g.fillStyle = '#ff5a5a'; rr(g, x - 47, cy + 6, 5, 6, 2); g.fill();
  }
  if (car && car.st === 'tell') { g.fillStyle = `rgba(255,250,200,${.15 + .1 * Math.sin(S.time * 8)})`; g.beginPath(); g.arc(0, NGY + 26, 60, -Math.PI / 2, Math.PI / 2); g.fill(); }
  g.restore();
  drawParts(g);
  xDrawFloats(g, NM);
  winHud(g, G);
  xCountdown(g, G, Win.START);
  xBannerDraw(g, G, Win.START, def.name, `${S.names[R.climb]}ย่องไปใต้หน้าต่าง ยืนนิ่งตอนไฟส่อง · ${S.names[R.top]}หย่อนผ้าปู ได้ยินพ่อเดินมาให้รีบขึ้นเตียง`);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
function winWindow(g, G, w, dadRoom, glow) {
  const T = G.top, x = w.x - 32, y = ny(w.y) - 52, isHer = w.room === 'her', lit = w.room === dadRoom && !isHer, soon = w.room === glow;
  g.fillStyle = '#4a405e'; g.fillRect(x - 10, y - 12, 84, 7);
  g.fillStyle = '#2a2236'; g.fillRect(x - 5, y - 5, 74, 62);
  if (isHer) {
    // inside her room: dark, the door opens when dad checks
    g.fillStyle = '#1e1830'; g.fillRect(x, y, 64, 52);
    const door = Win.doorAt(G.def, G.t);
    if (door && door[0] === 'look') { g.fillStyle = 'rgba(255,220,130,.35)'; g.beginPath(); g.moveTo(x + 52, y); g.lineTo(x + 64, y); g.lineTo(x + 64, y + 52); g.lineTo(x + 30, y + 52); g.fill(); g.fillStyle = '#1a1424'; g.beginPath(); g.arc(x + 56, y + 20, 8, 0, Math.PI * 2); g.fill(); }
    // the bed inside, with someone pretending to sleep
    g.fillStyle = '#5a4a7a'; g.fillRect(x + 4, y + 36, 40, 12);
    const who = NM.st.roles.top, col = who === 'pink' ? C.pink : C.mint;
    const k = T.at === 'window' ? 1 : T.at === 'bed' ? 0 : T.at === 'toBed' ? T.move / Win.TO_BED : 1 - T.move / Win.TO_BED;
    if (k > 0.05) {
      // at the window: head and arms on the sill
      g.save(); g.beginPath(); g.rect(x, y, 64, 52); g.clip();
      g.fillStyle = col; g.beginPath(); g.arc(x + 32, y + 52 - 26 * k, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 27, y + 50 - 26 * k, 2.6, 0, Math.PI * 2); g.arc(x + 37, y + 50 - 26 * k, 2.6, 0, Math.PI * 2); g.fill();
      g.restore();
      if (k > .9) { g.fillStyle = col; rr(g, x + 14, y + 48, 12, 8, 4); g.fill(); rr(g, x + 38, y + 48, 12, 8, 4); g.fill(); }
    } else { g.fillStyle = col; g.beginPath(); g.ellipse(x + 22, y + 34, 14, 6, 0, 0, Math.PI * 2); g.fill(); g.font = `400 10px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = '#c9bfef'; g.fillText('z', x + 40, y + 24); }
    g.fillStyle = '#ff8fb8'; g.fillRect(x, y, 8, 52); g.fillRect(x + 56, y, 8, 52);
  } else {
    g.fillStyle = lit ? '#ffdc82' : soon ? `rgba(255,190,110,${.3 + .2 * Math.sin(S.time * 14)})` : '#141020'; g.fillRect(x, y, 64, 52);
    if (lit) { g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(x + 40, y + 26, 10, 0, Math.PI * 2); g.fill(); rr(g, x + 28, y + 34, 24, 18, 6); g.fill(); }
  }
  g.fillStyle = '#2a2236'; g.fillRect(x + 30, y, 4, 52); g.fillRect(x, y + 24, 64, 3);
  g.fillStyle = '#4a405e'; g.fillRect(x - 8, y + 52, 80, 6); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x - 8, y + 52, 80, 1.5);
  if (!isHer) {
    // a flower box under the window
    g.fillStyle = '#6e4a34'; rr(g, x - 2, y + 58, 68, 10, 3); g.fill();
    for (let q = 0; q < 6; q++) { const fx = x + 5 + q * 11, fy = y + 56 - (q % 2) * 3; g.fillStyle = '#3f8f4a'; g.beginPath(); g.arc(fx, fy + 2, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = ['#ffb3cf', '#fff3b0', '#ffd1e8'][q % 3]; g.beginPath(); g.arc(fx, fy - 1, 2.4, 0, Math.PI * 2); g.fill(); }
  }
}
function winClimber(g, G) {
  const C = G.c, id = NM.st.roles.climb, x = C.x, y = ny(C.y);
  g.save(); g.translate(x, y); g.scale(1.25, 1.25);
  const walk = C.on === 'ground' && C.mv ? S.time * 14 : 0;
  drawPlayer(g, { id, x: -12, y: -29, w: 24, h: 29, face: C.on === 'sheet' ? 0 : NM.st.face || 1, sq: 0, walk }, S.time);
  if (C.on === 'sheet') { g.fillStyle = NCOL[id]; rr(g, -14, -36, 6, 12, 3); g.fill(); rr(g, 8, -36, 6, 12, 3); g.fill(); }
  if (G.def.cake) { g.fillStyle = '#fff'; rr(g, 8, -18, 16, 10, 2); g.fill(); g.fillStyle = NCOL.pink; g.fillRect(8, -14, 16, 2); g.fillStyle = '#ffcf5a'; g.fillRect(15, -24, 2, 6); }
  g.restore();
}
function winHud(g, G) {
  const def = G.def, st = NM.st, R = st.roles, C = G.c, T = G.top, h = Win.her(def), left = Math.max(0, def.time - Math.max(0, G.t - Win.START));
  const shown = G.won ? G.score : Math.max(0, Math.round(def.points + left * Win.TIME_PTS - G.strikes * Win.STRIKE_PTS));
  xScoreBox(g, left, shown, def.stars, G.won ? 'แต้ม' : 'ถ้าเข้าตอนนี้');
  const max = def.strikes || Win.STRIKES;
  xStrikes(g, 30, G.strikes, max, 'โดนจับได้');
  // the dog, the climber's grip
  let y = 58;
  if (def.dog) { panel(g, VW - 214, y - 8, 206, 22, 11, .82); g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText('หมาเริ่มตื่น', VW - 204, y + 7); rr(g, VW - 132, y - 1, 116, 8, 4); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); if (G.dog > 0) { rr(g, VW - 132, y - 1, Math.max(8, 116 * G.dog / 100), 8, 4); g.fillStyle = G.dog > 70 ? '#ff6b6b' : '#ffcf5a'; g.fill(); } y += 26; }
  if (C.on === 'sheet') { panel(g, h.x - 40, ny(C.y) - 70, 80, 8, 4, .8); rr(g, h.x - 40, ny(C.y) - 70, Math.max(8, 80 * C.stam / 100), 8, 4); g.fillStyle = C.stam < 30 ? '#ff6b6b' : '#9be07a'; g.fill(); }
  // what is coming: a car, dad on the stairs, dad at a window
  const car = Win.carAt(def, G.t), door = Win.doorAt(def, G.t), warn = [];
  if (door && door[0] === 'tell') warn.push(['เสียงพ่อเดินขึ้นบันได!', '#ffb38a']);
  if (car && (car.st === 'tell' || car.x < h.x + Win.CAR_W)) warn.push([car.st === 'tell' ? 'เสียงรถกำลังมา!' : 'ไฟรถส่อง!', '#fff6c9']);
  if (G.look.st) warn.push([G.look.st === 'tell' ? 'พ่อจะมาส่องหน้าต่าง!' : 'พ่อส่องไฟหาอยู่!', '#ff8a8a']);
  warn.forEach(([text, col], i) => { g.font = `600 13px ${FONT}`; const w = g.measureText(text).width + 28; panel(g, VW / 2 - w / 2, 78 + i * 28, w, 24, 12, .88); g.fillStyle = col; g.textAlign = 'center'; g.fillText(text, VW / 2, 95 + i * 28); });
  if (S.mode !== 'play' || G.st !== 'run' || G.won) return;
  // a word for each of them
  const cx = C.x, cy = ny(C.y) - 56, lit = Win.windowLit(def, G.t, C.x, C.y) || (car && car.st === 'sweep' && Math.abs(car.x - C.x) < Win.CAR_W + 60), soon = Win.windowSoon(def, G.t, C.x, C.y);
  const cone = G.look.st && Math.abs(C.x - G.look.x) < Win.LOOK_W + 10;
  let tc = null;
  if (cone && !C.hid) tc = Win.inBush(def, C.x) ? 'ซ่อนในพุ่มไม้!' : 'หนีให้พ้นไฟฉาย!';
  else if (C.on === 'sheet' && T.at !== 'window') tc = 'เกาะไว้ก่อน!';
  else if (lit) tc = 'อย่าขยับ!';
  else if (soon) tc = 'หยุด ไฟกำลังเปิด';
  else if (car && car.st === 'tell') tc = 'นิ่งไว้ รถมา';
  else if (C.on === 'ground' && Math.abs(C.x - h.x) < Win.REACH && Win.canGrab(G)) tc = 'ดันขึ้นเพื่อปีน';
  else if (C.on === 'ground' && Win.onGravel(def, C.x)) tc = 'ย่องช้าๆ บนกรวด';
  if (tc) xTip(g, R.climb, tc, cx, cy);
  let tt = null;
  if (door && door[0] === 'tell' && T.at === 'window') tt = 'ขึ้นเตียงเร็ว!';
  else if (T.at === 'bed' && !door) tt = 'กลับไปที่หน้าต่าง';
  else if (car && car.st === 'tell' && T.len > Win.SHOWS && C.on !== 'sheet') tt = 'ดึงผ้าขึ้น!';
  else if (C.on === 'sheet' && T.at === 'window') tt = 'ดันขึ้น ช่วยดึง';
  else if (C.on === 'ground' && Math.abs(C.x - h.x) < 90 && !Win.canGrab(G) && T.at === 'window') tt = 'หย่อนผ้าลง';
  if (tt) xTip(g, R.top, tt, h.x, ny(h.y) - 70);
}

/* ---------- The trap run (ฝ่าดงกับดัก) ---------- */
Object.assign(sfx, {
  pstep() { noise(.05, 700 + Math.random() * 500, .042, 'bandpass', 1.2); },
  pspike() { noise(.12, 4200, .05, 'highpass', .8); tone(1700, .09, 'triangle', .022, 2500); tone(140, .08, 'sine', .045, 80); },
  ppeek() { tone(2600 + Math.random() * 300, .03, 'triangle', .022); tone(2900, .025, 'triangle', .015, 0, .04); },
  parrow() { tone(300, .1, 'triangle', .05, 170); noise(.2, 2600, .035, 'bandpass', 2, 900, .03); },
  proll() { noise(.9, 170, .07, 'lowpass', .8, 90); tone(58, .7, 'sine', .045, 44); },
  pfire() { noise(.45, 650, .04, 'bandpass', .7, 1500); noise(.2, 2500, .012, 'bandpass', 3, 0, .1); },
  psaw() { tone(880 + Math.random() * 90, .16, 'sawtooth', .024, 1150); },
  psplash() { noise(.45, 1400, .08, 'bandpass', .9, 380); tone(320, .2, 'sine', .035, 120); for (let i = 0; i < 3; i++) tone(900 + i * 280, .05, 'sine', .016, 1500, .1 + i * .05); },
  pplate() { tone(170, .1, 'triangle', .055, 120); noise(.07, 900, .035, 'lowpass', 1); },
  pgate() { noise(.55, 220, .05, 'lowpass', 1.2, 520); tone(92, .4, 'triangle', .035, 70); },
  plever() { tone(250, .06, 'square', .035, 190); noise(.05, 1800, .035, 'bandpass', 2); },
  punlock() { noise(.9, 190, .07, 'lowpass', 1, 600); [392, 523, 659, 784].forEach((f, i) => chime(f, .45, .04, .25 + i * .08)); },
  pgem() { chime(1568, .3, .045); chime(2093, .35, .035, .06); },
  phit() { tone(230, .14, 'triangle', .06, 110); noise(.12, 500, .05, 'lowpass', .8); },
  previve() { [523, 659, 784, 1047].forEach((f, i) => chime(f, .25, .04, i * .06)); },
  phurt() { tone(440, .18, 'triangle', .055, 392); tone(330, .42, 'triangle', .055, 262, .16); },
  pcheck() { noise(.35, 900, .045, 'bandpass', 1, 2400); chime(784, .4, .045, .1); chime(1175, .5, .04, .2); }
});
const PT = Trap.T, PROWS = Trap.ROWS, PY0 = VH - PROWS * PT, PCH = 16;
// every plate (and lever pair) takes the colour of what it works, so a plate and its gate or trap can be matched up
const PCOLS = ['#7cc8ff', '#ffb35a', '#c79bff', '#7be08a', '#ff8fb0', '#ffe066', '#6fe0d6', '#ff9f7a'];
function trapGroups(def) {
  const col = {}, of = {}; let n = 0;
  const give = spec => { let c = null; for (const ch of spec) if (col[ch]) c = col[ch]; if (!c) c = PCOLS[n++ % PCOLS.length]; for (const ch of spec) col[ch] = c; return c; };
  for (const g in def.gates || {}) of['g' + g] = give(def.gates[g]);
  for (const s in def.spikes || {}) if (def.spikes[s].stop) of['s' + s] = give(def.spikes[s].stop);
  (def.things || []).forEach((t, i) => { if (t.stop) of['t' + i] = give(t.stop); });
  return { col, of };
}
const P_WHY = { spike: 'โดนหนาม!', water: 'ตกน้ำ!', arrow: 'โดนธนู!', log: 'โดนท่อนไม้!', rock: 'โดนหินกลิ้ง!', fire: 'ร้อน!', saw: 'โดนใบเลื่อย!' };
const PM = xMode({
  kind: 'trap', md: 'p', pres: 'pw', dk: 'q', L: PLEVELS, pk: 'q', Eng: Trap, pad: 'k', list: 'qlevels', olist: 'oLevelsQ', starsAll: 'qStarsAll',
  label: i => 'เส้นทางที่ ' + th(i + 1), word: 'ไป', goWord: 'ออกผจญภัย', fresh: 'ยังไม่เคยไป', nextWord: 'เส้นทางถัดไป', againWord: 'ลองเส้นทางนี้อีกครั้ง',
  score: G => G.score,
  kWords: () => ({ act: 'ดึง<br>คันโยก', use: '' }),
  onLoad() {
    const st = PM.st, G = st.G, def = G.def;
    // where each band of spikes lies (for its sound), how the plates are coloured, the camera
    const spx = {};
    for (let y = 0; y < PROWS; y++) for (let x = 0; x < G.W; x++) { const c = G.grid[y][x]; if (Trap.SPIKE.includes(c)) { const r = spx[c] || (spx[c] = [x, x]); r[0] = Math.min(r[0], x); r[1] = Math.max(r[1], x); } }
    Object.assign(st, { grp: trapGroups(def), spx, spk: {}, strips: st.strips || new Map(), spare: st.spare || [], lastCam: null, walk: { pink: 0, mint: 0 }, stepT: { pink: 0, mint: 0 }, sawT: 0, fireT: 0, peekT: 0, gate: {}, downAt: { pink: -9, mint: -9 },
      disp: { pink: { x: G.p.pink.x, y: G.p.pink.y }, mint: { x: G.p.mint.x, y: G.p.mint.y } }, cam: 0 });
    st.cam = trapCamTo(G, st.disp);
    for (const g of Trap.GATE) st.gate[g] = 0;
  },
  snap: G => ({ st: G.st, over: G.over, won: G.won, failed: G.failed, h: G.hearts, cp: G.cp, sig: G.sig, go: Object.keys(G.gopen).filter(k => G.gopen[k]).join(''), op: Object.keys(G.open).filter(k => G.open[k]).join(''),
    gm: G.gems.map(g => (g.got ? 1 : 0)).join(''), ex: G.extras.map(g => (g.got ? 1 : 0)).join(''), ps: [G.p.pink.st, G.p.mint.st], lv: G.levers.map(l => (l.t > 0 ? 1 : 0)).join(''), s: Object.assign({}, G.stats) }),
  changes(p, n) {
    const ev = [], G = PM.st.G;
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    ['pink', 'mint'].forEach((id, i) => {
      if (n.ps[i] === 'down' && p.ps[i] !== 'down' && id !== O.local) ev.push(`down:${id}:${G.p[id].why || 'spike'}`);
      if (n.ps[i] === 'ok' && p.ps[i] === 'down' && n.s.revives > p.s.revives) ev.push('revive:' + id);
    });
    if (n.s.respawns > p.s.respawns) ev.push('respawn:x');
    for (const k of n.sig) if (!p.sig.includes(k)) ev.push('plate:' + k);
    for (const k of Trap.GATE) { if (n.go.includes(k) && !p.go.includes(k)) ev.push('open:' + k); if (!n.go.includes(k) && p.go.includes(k)) ev.push('shut:' + k); }
    for (const k of n.op) if (!p.op.includes(k)) ev.push('unlock:' + k);
    for (let i = 0; i < n.lv.length; i++) if (n.lv[i] === '1' && p.lv[i] !== '1') ev.push('lever:x');
    for (let i = 0; i < n.gm.length; i++) if (n.gm[i] === '1' && p.gm[i] !== '1') ev.push('gem:x:' + i);
    for (let i = 0; i < n.ex.length; i++) if (n.ex[i] === '1' && p.ex[i] !== '1') ev.push('heart:x:' + i);
    if (n.cp > p.cp) ev.push('check:' + n.cp);
    if (n.h < p.h) ev.push('hurt');
    if (n.won && !p.won) ev.push('win');
    else if (n.over && !p.over) ev.push(n.h <= 0 ? 'out' : 'time');
    return ev;
  },
  events(ev) {
    const st = PM.st, G = st.G, sx = x => x - st.cam, sy = y => y + PY0;
    for (const e of ev) {
      const [k, a, b] = e.split(':'), p = G.p[a];
      if (k === 'go') sfx.ilaunch();
      else if (k === 'shoot') { const x = +b; if (x > st.cam - 120 && x < st.cam + VW + 120) { if (a === 'arrow') sfx.parrow(); else sfx.proll(); } }
      else if (k === 'down' && p) {
        if (S.time - st.downAt[a] < 1) continue; st.downAt[a] = S.time;
        if (b === 'water') { sfx.psplash(); burst(sx(p.x), sy(p.y), 14, '#9fd8ff', { size: 3, speed: 110, up: 90, life: .8, g: 260 }); }
        else { sfx.phit(); burst(sx(p.x), sy(p.y), 10, b === 'fire' ? '#ffb35a' : '#fff3d8', { size: 3, speed: 120, life: .6 }); }
        S.shake = Math.max(S.shake, .45); xFloat(PM, P_WHY[b] || 'ล้ม!', sx(p.x), sy(p.y) - 30, '#ff8a8a', 18);
      }
      else if (k === 'plate') sfx.pplate();
      else if (k === 'lever') sfx.plever();
      else if (k === 'unlock') { sfx.punlock(); S.shake = Math.max(S.shake, .3); const L = G.levers.find(l => l.id === a); if (L) xFloat(PM, 'ประตูเปิดแล้ว!', sx(L.x + 40), sy(L.y) - 20, C.gold, 20, 1.8); }
      else if (k === 'open' || k === 'shut') sfx.pgate();
      else if (k === 'gem') { sfx.pgem(); const gm = b != null ? G.gems[+b] : null, x = gm ? gm.x : p ? p.x : 0, y = gm ? gm.y : p ? p.y : 0; burst(sx(x), sy(y), 10, '#bff4ff', { type: 'star', size: 4, speed: 90, life: .7 }); xFloat(PM, '+' + th(Trap.GEM_PTS), sx(x), sy(y) - 16, '#bff4ff', 16); }
      else if (k === 'heart') { sfx.heart(); const hh = b != null ? G.extras[+b] : null, x = hh ? hh.x : p ? p.x : 0, y = hh ? hh.y : p ? p.y : 0; burst(sx(x), sy(y), 10, C.pink, { type: 'heart', size: 4, speed: 80, up: 60, life: 1, g: -30 }); xFloat(PM, 'หัวใจ +๑', sx(x), sy(y) - 16, C.pink, 18); }
      else if (k === 'check') { sfx.pcheck(); const c = G.checks[+a]; if (c) { xFloat(PM, 'จุดเซฟ!', sx((c.tx + .5) * PT), sy(2 * PT), C.gold, 20, 1.6); burst(sx((c.tx + .5) * PT), sy((c.ty + .5) * PT), 14, '#ffd27a', { size: 3, speed: 70, up: 80, life: 1, g: -40 }); } }
      else if (k === 'revive' && p) { sfx.previve(); burst(sx(p.x), sy(p.y) - 6, 10, a === 'pink' ? C.pink : C.mint, { type: 'heart', size: 4, speed: 70, up: 70, life: 1, g: -40 }); xFloat(PM, 'ลุกได้แล้ว!', sx(p.x), sy(p.y) - 30, '#9be07a', 18); }
      else if (k === 'hurt') { sfx.phurt(); xFloat(PM, 'เสียหัวใจไปหนึ่งดวง', VW / 2, 150, '#ff8a8a', 22, 1.8); }
      else if (k === 'respawn') sfx.portal();
      else if (k === 'out') { sfx.cout(); xFloat(PM, 'หัวใจหมดแล้ว!', VW / 2, 250, '#ff8a8a', 26, 2.2); }
      else if (k === 'time') { sfx.cout(); xFloat(PM, 'หมดเวลา!', VW / 2, 250, '#ffb38a', 26, 2.2); }
      else if (k === 'win') { sfx.win(); const q = G.p.pink; burst(sx(q.x), sy(q.y) - 10, 24, C.gold, { type: 'star', size: 5, speed: 140, up: 120, life: 1.4, g: 60 }); xFloat(PM, 'ถึงวิหารแล้ว!', VW / 2, 200, C.gold, 28, 2.4); }
    }
  },
  tick() {
    const st = PM.st, G = st.G, q = id => { const k = kInput(id); return { mx: k.mx, my: k.my, act: k.act }; };
    if (!O.role) { PM.events(Trap.step(G, { pink: q('pink'), mint: q('mint') })); st.prev = PM.snap(G); return; }
    const li = q(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      PM.events(Trap.step(G, { [O.local]: li, [rid]: rq }, false, rid));
      rq.act = false; st.prev = PM.snap(G);
    } else {
      // the guest walks its own player at once (and sees its own falls); the rest comes from the host
      if (li.act) st.n.a++;
      PM.events(Trap.step(G, { [O.local]: li, [rid]: { still: true } }, true).filter(e => /^(shoot|down)/.test(e)));
    }
  },
  frameExtra(dt) {
    const st = PM.st, G = st.G;
    // what is shown: the other phone's player eases toward where it was last heard of
    for (const id of ['pink', 'mint']) {
      const p = G.p[id], d = st.disp[id], far = Math.hypot(p.x - d.x, p.y - d.y);
      if (!O.role || id === O.local || far > 90) { d.x = p.x; d.y = p.y; } else { const k = Math.min(1, dt * 14); d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k; }
      if (p.mv && p.st === 'ok') st.walk[id] += dt * 13;
    }
    st.cam += (trapCamTo(G, st.disp) - st.cam) * Math.min(1, dt * 4);
    for (const g of Trap.GATE) st.gate[g] += ((G.gopen[g] ? 1 : 0) - st.gate[g]) * Math.min(1, dt * 7);
    if (S.mode !== 'play' || G.st !== 'run') return;
    // footsteps, saws buzzing close by, the fire bars roaring, spikes on their beat
    for (const id of ['pink', 'mint']) { const p = G.p[id]; if (p.mv && p.st === 'ok') { st.stepT[id] -= dt; if (st.stepT[id] <= 0) { st.stepT[id] = 0.3; if (!O.role || id === O.local) sfx.pstep(); } } }
    const near = (x, y, r) => ['pink', 'mint'].some(id => Math.hypot(G.p[id].x - x, G.p[id].y - y) < r);
    st.sawT -= dt; st.fireT -= dt; st.peekT -= dt;
    for (const h of G.things) {
      const d = h.d; if (Trap.stopped(G, d.stop)) continue;
      if (d.k === 'saw' && st.sawT <= 0) { const [x, y] = Trap.sawPos(d, h.c); if (near(x, y, 110)) { sfx.psaw(); st.sawT = 0.22; } }
      if (d.k === 'fire' && st.fireT <= 0 && near((d.x + .5) * PT, (d.y + .5) * PT, (d.len + 2) * PT)) { sfx.pfire(); st.fireT = 0.8; }
    }
    let up = false, peek = false;
    for (const g in G.def.spikes || {}) {
      const s = Trap.spikeState(G, g), r = st.spx[g], seen = r && (r[1] + 1) * PT > st.cam && r[0] * PT < st.cam + VW;
      if (seen && s !== st.spk[g]) { if (s === 'up') up = true; else if (s === 'warn') peek = true; }
      st.spk[g] = s;
    }
    if (up) sfx.pspike(); else if (peek && st.peekT <= 0) { sfx.ppeek(); st.peekT = 0.3; }
  },
  result(G, s) {
    const sx = G.stats, all = G.gems.length, msg = !G.won ? (G.hearts <= 0 ? 'หัวใจหมดก่อนถึงวิหาร ครั้งหน้ารอดูจังหวะกับดักก่อนค่อยเดิน ใครล้มให้อีกคนรีบไปยืนข้างๆ ช่วยลุก' : 'หมดเวลาก่อนถึงวิหาร ครั้งหน้าผลัดกันยืนบนแผ่นหินให้ไวขึ้นอีกนิด')
      : s === 3 ? 'ฝ่ากับดักมาได้อย่างเฉียบ คู่นี้รู้ใจกันสุดๆ' : s === 2 ? (sx.downs > 2 ? 'ถึงวิหารแล้ว แต่ล้มบ่อยไปหน่อย ถ้าระวังกว่านี้จะได้สามดาว' : sx.gems < all ? 'ถึงวิหารแล้ว ลองเก็บเพชรให้ครบแล้วไปให้ไวกว่านี้' : 'เก่งมาก ลองไปให้ไวกว่านี้อีกนิด')
      : s === 1 ? 'ถึงวิหารได้อย่างหวุดหวิด เส้นทางถัดไปเปิดแล้ว' : 'ถึงวิหารแล้ว แต่แต้มยังไม่พอ ต้องได้อย่างน้อย ' + th(G.def.stars[0]) + ' แต้ม';
    return { head: G.won ? 'ถึงวิหารแล้ว' : G.hearts <= 0 ? 'หัวใจหมด' : 'หมดเวลา', msg,
      stats: `<span>แต้ม <b>${th(G.score)}</b></span><span>ถึงใน <b>${G.won ? th(Math.round(G.inT)) + ' วิ' : '-'}</b> หัวใจเหลือ <b>${th(G.hearts)}</b></span><span>เพชร <b>${th(sx.gems)}/${th(all)}</b> ล้ม <b>${th(sx.downs)}</b> ช่วยกันลุก <b>${th(sx.revives)}</b></span>` };
  },
  encode() {
    const st = PM.st;
    if (O.role === 'host') return Trap.encode(st.G);
    return Trap.guestMsg(st.G, O.local, st.lastInp, st.n.a);
  },
  hostHears(m) { Trap.hostHears(PM.st.G, O.local === 'pink' ? 'mint' : 'pink', m, PM.st.remote); },
  guestHears(m) { Trap.apply(PM.st.G, m, O.local); },
  fresher: () => ({ seen: -1, mx: 0, my: 0, act: false }),
  render: trapRender
});
// the camera: between the two of them, inside the path
function trapCamTo(G, d) { return Math.max(0, Math.min(G.W * PT - VW, (d.pink.x + d.mint.x) / 2 - VW / 2)); }

/* ---------- the ground: drawn once in strips of PCH tiles ---------- */
// A strip is drawn a part at a time (the generator stops between parts), so the one coming up next can be drawn a
// little each frame before it is needed; one needed at once is finished there and then.
const P_GRASS = ['#5d9c48', '#62a24c', '#5a9645', '#66a650'], P_PATH = ['#caa56c', '#c49e65', '#cfab72'];
function* trapChunk(g, G, ci) {
  const x0 = ci * PCH, W = G.W, def = G.def, grp = PM.st.grp, tile = (x, y) => Trap.tileAt(G, x, y), TAU = Math.PI * 2;
  g.translate(-x0 * PT, 0);
  const xs = Math.max(0, x0 - 2), xe = Math.min(W - 1, x0 + PCH + 1), N4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const isWater = c => Trap.WATER.includes(c), pathy = c => c === '.' || c === '!' || Trap.LEVER.includes(c) || Trap.GATE.includes(c);
  const stone = (x, y) => tile(x, y) === '.' && N4.some(([dx, dy]) => tile(x + dx, y + dy) === '~');
  // the ground under everything
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) {
    const c = tile(x, y), px = x * PT, py = y * PT, hh = hash(x, y);
    if (c === 'T') g.fillStyle = '#2f5a2c';
    else if (pathy(c)) g.fillStyle = P_PATH[0];
    else if (c === 'E') g.fillStyle = (x + y) % 2 ? '#e3bd58' : '#dcb24e';
    else if (c === '~') g.fillStyle = '#3d8fc2';
    else if (c === 'o') g.fillStyle = '#6b4a32';
    else if (Trap.SPIKE.includes(c)) g.fillStyle = '#8f8778';
    else if (Trap.PLATE.includes(c)) g.fillStyle = N4.filter(([dx, dy]) => tile(x + dx, y + dy) === ',').length >= 2 ? P_GRASS[0] : P_PATH[0];
    else g.fillStyle = P_GRASS[0];
    g.fillRect(px - .5, py - .5, PT + 1, PT + 1);
    if (Trap.SPIKE.includes(c)) {
      g.fillStyle = '#a39b8a'; g.fillRect(px + 1, py + 1, PT - 2, PT - 5);
      g.fillStyle = '#4a4238'; g.beginPath(); for (const [ox, oy] of [[9, 9], [23, 9], [9, 23], [23, 23]]) { g.moveTo(px + ox + 3.4, py + oy); g.ellipse(px + ox, py + oy, 3.4, 2.6, 0, 0, TAU); } g.fill();
      const sp = def.spikes[c]; if (sp && sp.stop) { g.strokeStyle = hexA(grp.of['s' + c], .45); g.lineWidth = 2; g.strokeRect(px + 2, py + 2, PT - 4, PT - 4); }
    } else if (c === 'E') { g.strokeStyle = 'rgba(140,90,20,.35)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, PT - 1, PT - 1); }
  }
  // the lanes logs roll down: worn earth
  for (const d of def.things || []) if (d.k === 'roll') { const cx = (d.x + .5) * PT; g.fillStyle = 'rgba(90,60,30,.16)'; g.fillRect(cx - Trap.LOG_W / 2 + 4, PT * .6, Trap.LOG_W - 8, (PROWS - 1.2) * PT); g.fillStyle = 'rgba(90,60,30,.1)'; for (let y = 1; y < PROWS - 1; y++) g.fillRect(cx - Trap.LOG_W / 2 + 10, y * PT + (hash(d.x, y) % 20), Trap.LOG_W - 20, 2); }
  yield;
  // grass: tufts, flowers and ferns; the path: pebbles and grass creeping over its edges
  for (let y = 1; y < PROWS - 1; y++) for (let x = xs; x <= xe; x++) {
    const c = tile(x, y), px = x * PT, py = y * PT, hh = hash(x + 7, y + 3);
    if (c === ',') {
      // soft lighter and darker patches (only where the grass goes on all round, so they never spill on the path)
      if (N4.every(([dx, dy]) => tile(x + dx, y + dy) === ',' || tile(x + dx, y + dy) === 'T') && hh % 2) { g.fillStyle = hh & 4 ? 'rgba(150,210,110,.25)' : 'rgba(40,90,40,.15)'; g.beginPath(); g.ellipse(px + 16, py + 16, 14 + hh % 8, 9 + (hh >> 3) % 6, (hh % 7) * .4, 0, TAU); g.fill(); }
      for (let k = 0; k < 2; k++) { const q = hash(x * 3 + k, y * 5), tx = px + 4 + q % 24, ty = py + 6 + (q >> 5) % 22; g.fillStyle = q & 64 ? '#4c8a3c' : '#78b75a'; g.beginPath(); g.moveTo(tx, ty + 3); g.lineTo(tx + 1.5, ty - 4); g.lineTo(tx + 3, ty + 3); g.lineTo(tx + 4.5, ty - 2.5); g.lineTo(tx + 6, ty + 3); g.closePath(); g.fill(); }
      if (hh % 9 === 0) { const fx = px + 8 + hh % 16, fy = py + 8 + (hh >> 6) % 16; g.fillStyle = ['#ffd1e8', '#fff3b0', '#ffffff', '#ffb3b3', '#c9b6ff'][hh % 5]; g.beginPath(); for (let q = 0; q < 5; q++) { const a = q * 1.2566, cx = fx + Math.cos(a) * 2.4, cy = fy + Math.sin(a) * 2.4; g.moveTo(cx + 1.8, cy); g.arc(cx, cy, 1.8, 0, TAU); } g.fill(); g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(fx, fy, 1.3, 0, TAU); g.fill(); }
      else if (hh % 13 === 1) { g.fillStyle = '#3f7a34'; g.beginPath(); for (let q = 0; q < 4; q++) { const a = -1.4 + q * .9, cx = px + 16 + Math.cos(a) * 6, cy = py + 16 + Math.sin(a) * 6; g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); g.ellipse(cx, cy, 6, 2.4, a, 0, TAU); } g.fill(); }
    } else if (c === '.' || c === '!' || Trap.PLATE.includes(c) || Trap.LEVER.includes(c)) {
      if (hh % 3 === 0) { g.fillStyle = 'rgba(120,90,50,.35)'; g.beginPath(); g.ellipse(px + 6 + hh % 20, py + 8 + (hh >> 4) % 18, 2.4, 1.7, 0, 0, TAU); g.fill(); }
      if (hh % 5 === 1) { g.fillStyle = 'rgba(255,240,210,.35)'; g.beginPath(); g.arc(px + 10 + (hh >> 3) % 14, py + 10 + (hh >> 7) % 14, 1.4, 0, TAU); g.fill(); }
      // grass creeping over the edge of the path
      let any = false;
      for (const [dx, dy] of N4) {
        if (tile(x + dx, y + dy) !== ',') continue; if (!any) { g.fillStyle = '#5d9c48'; g.beginPath(); any = true; }
        for (let k = 0; k < 3; k++) { const q = hash(x * 11 + k, y * 7 + dx + 3 * dy), t = 3 + (q % 26), r = 2.4 + (q >> 4) % 3, bx = dx ? (dx < 0 ? px : px + PT) : px + t, by = dy ? (dy < 0 ? py : py + PT) : py + t; g.moveTo(bx + r, by); g.arc(bx, by, r, 0, TAU); }
      }
      if (any) g.fill();
    }
  }
  yield;
  // water: a lighter rim along the banks, lily pads; pits: a dark hole; stepping stones; banks: wet earth and reeds
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) {
    const c = tile(x, y), px = x * PT, py = y * PT, hh = hash(x, y);
    if (c === '~') {
      for (const [dx, dy] of N4) { if (isWater(tile(x + dx, y + dy))) continue; g.fillStyle = 'rgba(190,235,255,.5)'; if (dx) g.fillRect(dx < 0 ? px : px + PT - 4, py, 4, PT); else g.fillRect(px, dy < 0 ? py : py + PT - 4, PT, 4); g.fillStyle = 'rgba(30,70,110,.35)'; if (dx) g.fillRect(dx < 0 ? px + 4 : px + PT - 7, py, 3, PT); else g.fillRect(px, dy < 0 ? py + 4 : py + PT - 7, PT, 3); }
      if (hh % 7 === 0) { const lx = px + 10 + hh % 12, ly = py + 12 + (hh >> 5) % 10; g.fillStyle = '#4f9a4a'; g.beginPath(); g.moveTo(lx, ly); g.ellipse(lx, ly, 6, 4.5, 0, 0, Math.PI * 1.75); g.closePath(); g.fill(); }
    } else if (c === 'o') {
      // a chasm: dark all through, a lip of earth where it meets the ground, darker under the near edge
      const pit = (dx, dy) => tile(x + dx, y + dy) === 'o';
      g.fillStyle = '#16101c'; g.fillRect(px, py, PT, PT);
      if (!pit(0, -1)) { g.fillStyle = '#4a3324'; g.fillRect(px, py, PT, 9); g.fillStyle = '#2a1d16'; g.fillRect(px, py + 9, PT, 5); }
      if (!pit(0, 1)) { g.fillStyle = '#7a5a3a'; g.fillRect(px, py + PT - 4, PT, 4); }
      if (!pit(-1, 0)) { g.fillStyle = '#5a3f2a'; g.fillRect(px, py, 4, PT); }
      if (!pit(1, 0)) { g.fillStyle = '#5a3f2a'; g.fillRect(px + PT - 4, py, 4, PT); }
      if (pit(0, -1) && hh % 5 === 0) { g.fillStyle = 'rgba(120,100,160,.12)'; g.beginPath(); g.arc(px + 8 + hh % 16, py + 8 + (hh >> 4) % 16, 1.2, 0, TAU); g.fill(); }
    } else if (stone(x, y)) {
      // a stepping stone: rounded, a little darker at the waterline
      g.fillStyle = '#3d8fc2'; g.fillRect(px, py, PT, PT);
      g.fillStyle = 'rgba(40,60,80,.35)'; rr(g, px + 1, py + 3, PT - 2, PT - 2, 8); g.fill();
      g.fillStyle = '#b9a37e'; rr(g, px + 1, py + 1, PT - 2, PT - 3, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, px + 5, py + 4, PT - 12, 6, 3); g.fill();
    } else if (c === ',' && (tile(x - 1, y) === '~' || tile(x + 1, y) === '~')) {
      const ex = tile(x - 1, y) === '~' ? px : px + PT - 7;
      g.fillStyle = '#6f5a3a'; g.fillRect(ex, py, 7, PT);
      if (hh % 3 === 0) { g.strokeStyle = '#3f7a34'; g.lineWidth = 1.6; g.beginPath(); for (let k = 0; k < 3; k++) { const rx = ex + 2 + k * 2, ry = py + 8 + (hh >> 3) % 14; g.moveTo(rx, ry + 8); g.lineTo(rx + (k - 1) * 2, ry - 4); } g.stroke(); }
    }
  }
  // saw tracks: a slot in the ground
  for (const d of def.things || []) {
    if (d.k !== 'saw') continue;
    const ax = (d.x0 + .5) * PT, ay = (d.y0 + .5) * PT, bx = (d.x1 + .5) * PT, by = (d.y1 + .5) * PT;
    g.lineCap = 'round'; g.strokeStyle = '#4a4040'; g.lineWidth = 9; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    g.strokeStyle = '#1e1a1e'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#6f6a70'; g.beginPath(); g.arc(ax, ay, 7, 0, TAU); g.moveTo(bx + 7, by); g.arc(bx, by, 7, 0, TAU); g.fill();
  }
  yield;
  // stone: walls (temple blocks, moss), rock pillars, carved faces that shoot arrows
  const faces = {}; for (const d of def.things || []) if (d.k === 'arrow') faces[d.x + ',' + d.y] = d.dir;
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) {
    const c = tile(x, y), px = x * PT, py = y * PT, hh = hash(x, y);
    if (c === '#') {
      if (tile(x, y + 1) !== '#' && y < PROWS - 1) { g.fillStyle = 'rgba(20,20,10,.28)'; g.fillRect(px, py + PT, PT, 7); }
      g.fillStyle = '#857a68'; g.fillRect(px, py, PT, PT);
      g.fillStyle = (hh & 1) ? '#a99e88' : '#a2977f'; g.fillRect(px + 1, py + 1, PT - 2, PT - 9);
      g.fillStyle = '#93887a'; g.fillRect(px + 1, py + PT - 8, PT - 2, 7);
      g.fillStyle = 'rgba(60,50,40,.4)'; g.fillRect(px + (hh % 2 ? 12 : 20), py + 1, 1.5, PT - 9); g.fillRect(px + 1, py + 12, PT - 2, 1.2);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(px + 1, py + 1, PT - 2, 2);
      if (hh % 4 === 0) { g.fillStyle = 'rgba(100,150,70,.75)'; g.beginPath(); g.arc(px + 6 + hh % 20, py + 4, 4, 0, TAU); g.moveTo(px + 14 + hh % 20, py + 3); g.arc(px + 11 + hh % 20, py + 3, 3, 0, TAU); g.fill(); }
      const dir = faces[x + ',' + y];
      if (dir) {
        // a carved face: eyes, and a round mouth facing the path
        const [dx, dy] = Trap.DIRS[dir], cx = px + 16, cy = py + 14;
        g.fillStyle = '#7a6f5e'; g.beginPath(); g.arc(cx, cy, 12, 0, TAU); g.fill();
        g.fillStyle = '#b3a890'; g.beginPath(); g.arc(cx, cy - 1, 11, 0, TAU); g.fill();
        g.fillStyle = '#3a3128'; g.beginPath(); g.ellipse(cx - 4.5, cy - 3, 2.4, 1.6, 0, 0, TAU); g.moveTo(cx + 6.9, cy - 3); g.ellipse(cx + 4.5, cy - 3, 2.4, 1.6, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(cx - 4.5, cy - 3, .9, 0, TAU); g.moveTo(cx + 5.4, cy - 3); g.arc(cx + 4.5, cy - 3, .9, 0, TAU); g.fill();
        g.fillStyle = '#1c1612'; g.beginPath(); g.arc(cx + dx * 5, cy + 4 + dy * 4, 3.6, 0, TAU); g.fill();
      }
    } else if (c === 'R') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 17, py + 25, 15, 7, 0, 0, TAU); g.fill();
      g.fillStyle = '#6e6a72'; g.beginPath(); g.arc(px + 16, py + 17, 15, 0, TAU); g.fill();
      g.fillStyle = '#8c8892'; g.beginPath(); g.arc(px + 14, py + 14, 13, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(px + 10, py + 9, 5, 3, -.5, 0, TAU); g.fill();
    }
  }
  // fire pillars' braziers, plates, lever sockets, checkpoint posts
  (def.things || []).forEach((d, i) => {
    if (d.k !== 'fire') return;
    const cx = (d.x + .5) * PT, cy = (d.y + .5) * PT;
    g.fillStyle = '#4a3a34'; g.beginPath(); g.arc(cx, cy - 2, 9, 0, TAU); g.fill(); g.fillStyle = '#20161a'; g.beginPath(); g.arc(cx, cy - 2, 6, 0, TAU); g.fill();
    if (d.stop) { g.strokeStyle = grp.of['t' + i]; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy - 2, 11, 0, TAU); g.stroke(); }
  });
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) {
    const c = tile(x, y), px = x * PT, py = y * PT;
    if (Trap.PLATE.includes(c)) {
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, px + 3, py + 5, PT - 6, PT - 6, 5); g.fill();
      g.fillStyle = '#9c9484'; rr(g, px + 3, py + 3, PT - 6, PT - 6, 5); g.fill();
      g.fillStyle = '#b2aa98'; rr(g, px + 5, py + 4, PT - 10, PT - 10, 4); g.fill();
      g.strokeStyle = hexA(grp.col[c] || '#ffcf5a', .55); g.lineWidth = 2; g.beginPath(); g.arc(px + 16, py + 15, 7, 0, TAU); g.stroke();
    } else if (Trap.LEVER.includes(c)) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 16, py + 22, 11, 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#7d7466'; rr(g, px + 6, py + 12, 20, 12, 4); g.fill(); g.fillStyle = '#a0978a'; rr(g, px + 7, py + 12, 18, 8, 3); g.fill();
      g.fillStyle = '#2a221c'; rr(g, px + 14, py + 13, 4, 6, 2); g.fill();
    } else if (c === '!') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 16, py + 24, 9, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#8a8070'; rr(g, px + 9, py + 8, 14, 16, 4); g.fill(); g.fillStyle = '#a99f8c'; rr(g, px + 10, py + 8, 12, 6, 3); g.fill();
      g.fillStyle = '#3a2e26'; g.beginPath(); g.ellipse(px + 16, py + 10, 4.5, 2.4, 0, 0, TAU); g.fill();
    }
  }
  // the temple gate at the end: a sun carved in the floor
  const Ex = [], Ey = [];
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) if (tile(x, y) === 'E') { Ex.push(x); Ey.push(y); }
  if (Ex.length) {
    const cx = (Math.min(...Ex) + Math.max(...Ex) + 1) / 2 * PT, cy = (Math.min(...Ey) + Math.max(...Ey) + 1) / 2 * PT;
    g.strokeStyle = 'rgba(150,95,20,.5)'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 20, 0, TAU);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.moveTo(cx + Math.cos(a) * 25, cy + Math.sin(a) * 25); g.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); }
    g.stroke();
  }
  yield;
  // the gaps in the trees the logs come down: a bare earth slope
  const lane = {};
  for (const d of def.things || []) if (d.k === 'roll') { for (let x = d.x - 1; x <= d.x + 1; x++) lane[x] = 1; const cx = (d.x + .5) * PT; for (const y of [0, PROWS - 1]) { g.fillStyle = '#6b4a2e'; g.fillRect(cx - 40, y * PT, 80, PT); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - 40, y === 0 ? 0 : (PROWS - 1) * PT + PT - 8, 80, 8); g.fillStyle = 'rgba(255,230,190,.12)'; for (let k = 0; k < 5; k++) g.fillRect(cx - 32 + k * 15, y * PT + 6 + (k % 2) * 12, 8, 2); } }
  // trees along both edges: round crowns with a soft shadow, a lighter top and the odd fruit
  for (let y = 0; y < PROWS; y++) for (let x = xs; x <= xe; x++) {
    if (tile(x, y) !== 'T' || ((y === 0 || y === PROWS - 1) && lane[x])) continue;
    const hh = hash(x, y), px = x * PT + 16 + (hh % 9) - 4, py = y * PT + 16 + ((hh >> 4) % 9) - 4 + (y === 0 ? -4 : 4), r = 19 + (hh >> 8) % 7;
    g.fillStyle = 'rgba(10,30,10,.3)'; g.beginPath(); g.ellipse(px + 3, py + 8, r, r * .8, 0, 0, TAU); g.fill();
    g.fillStyle = '#2c6a33'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    g.fillStyle = '#3b8441'; g.beginPath(); g.arc(px - r * .2, py - r * .22, r * .78, 0, TAU); g.fill();
    g.fillStyle = '#4f9d4f'; g.beginPath(); g.arc(px - r * .35, py - r * .38, r * .42, 0, TAU); g.moveTo(px + r * .55, py - r * .1); g.arc(px + r * .25, py - r * .1, r * .3, 0, TAU); g.fill();
    if (hh % 5 === 0) { g.fillStyle = hh & 32 ? '#ff8a5a' : '#ffd25a'; g.beginPath(); for (let q = 0; q < 3; q++) { const fx = px + ((hash(q, x) % 20) - 10), fy = py + ((hash(y, q) % 16) - 4); g.moveTo(fx + 2.6, fy); g.arc(fx, fy, 2.6, 0, TAU); } g.fill(); }
  }
}
// the strips on hand: the ones on screen are finished at once; one coming up is drawn a part per frame
function trapStrip(G, ci, now) {
  const st = PM.st, key = G.def.name + ':' + ci + ':' + scale, w = PCH * PT, h = PROWS * PT;
  let c = st.strips.get(ci);
  if (!c || c.key !== key) {
    const cv = c ? c.cv : st.spare.pop() || document.createElement('canvas');
    cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale);
    const g = cv.getContext('2d', { alpha: false }); g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
    c = { key, cv, it: trapChunk(g, G, ci), done: false }; st.strips.set(ci, c);
  }
  if (now) while (!c.done) c.done = !!c.it.next().done;
  return c;
}
function trapStrips(G, cam) {
  const st = PM.st, span = PCH * PT, c0 = Math.floor(cam / span), c1 = Math.floor((cam + VW - 1) / span), last = Math.ceil(G.W / PCH) - 1;
  // let go of strips well off screen (their canvases are kept for the next ones)
  for (const [ci, c] of st.strips) if (ci < c0 - 1 || ci > c1 + 1) { st.strips.delete(ci); st.spare.push(c.cv); }
  const out = [];
  for (let ci = c0; ci <= Math.min(c1, last); ci++) out.push([ci, trapStrip(G, ci, true)]);
  // the strip coming up (the way the camera is going), then the one behind: one part this frame
  const dir = cam >= (st.lastCam == null ? cam : st.lastCam) ? 1 : -1; st.lastCam = cam;
  for (const ci of dir > 0 ? [c1 + 1, c0 - 1] : [c0 - 1, c1 + 1]) {
    if (ci < 0 || ci > last) continue;
    const c = trapStrip(G, ci, false);
    if (!c.done) { c.done = !!c.it.next().done; break; }
  }
  return out;
}
// the canopy above the path, behind the boxes at the top
function trapTop(g) {
  g.fillStyle = '#1d3a22'; g.fillRect(0, 0, VW, PY0);
  const R = rng(77);
  for (let i = 0; i < 70; i++) { const x = R() * VW, y = R() * (PY0 + 10), r = 14 + R() * 22; g.fillStyle = ['#25502b', '#2c5f31', '#214627', '#346b37'][i % 4]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  // hanging vines and a few flowers
  for (let i = 0; i < 16; i++) { const x = R() * VW, l = 30 + R() * 50; g.strokeStyle = '#3f7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 8, l / 2, x - 2, l); g.stroke(); g.fillStyle = '#5fa04f'; for (let k = 8; k < l; k += 10) { g.beginPath(); g.ellipse(x + (k % 20 ? 4 : -3), k, 4, 2, k % 20 ? .5 : -.5, 0, Math.PI * 2); g.fill(); } }
  for (let i = 0; i < 12; i++) { const x = R() * VW, y = 10 + R() * (PY0 - 20); g.fillStyle = ['#ff8fb8', '#ffd25a', '#ffffff'][i % 3]; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); g.fill(); } }
  const sh = g.createLinearGradient(0, PY0 - 18, 0, PY0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = sh; g.fillRect(0, PY0 - 18, VW, 18);
}

/* ---------- sprites ---------- */
function trapSpikeSprite(q, k) {
  // k: 1 up, .35 peeking
  for (const [ox, oy] of [[9, 9], [23, 9], [9, 23], [23, 23]]) {
    const h = 13 * k, w = 4.2;
    q.fillStyle = 'rgba(0,0,0,.25)'; q.beginPath(); q.ellipse(ox + 1, oy + 1, w, 2.2, 0, 0, Math.PI * 2); q.fill();
    q.fillStyle = '#9aa2b4'; q.beginPath(); q.moveTo(ox - w, oy); q.lineTo(ox, oy - h); q.lineTo(ox + w, oy); q.closePath(); q.fill();
    q.fillStyle = '#e4e9f4'; q.beginPath(); q.moveTo(ox - w * .3, oy); q.lineTo(ox, oy - h); q.lineTo(ox - w, oy); q.closePath(); q.fill();
    q.fillStyle = '#5d6476'; q.beginPath(); q.moveTo(ox + w * .2, oy); q.lineTo(ox, oy - h); q.lineTo(ox + w, oy); q.closePath(); q.fill();
  }
}
function trapGemSprite(q, col) {
  q.fillStyle = 'rgba(0,0,0,.2)'; q.beginPath(); q.ellipse(12, 21, 7, 2.5, 0, 0, Math.PI * 2); q.fill();
  q.fillStyle = col; q.beginPath(); q.moveTo(12, 3); q.lineTo(20, 9); q.lineTo(12, 19); q.lineTo(4, 9); q.closePath(); q.fill();
  q.fillStyle = 'rgba(255,255,255,.55)'; q.beginPath(); q.moveTo(12, 3); q.lineTo(15, 9); q.lineTo(12, 19); q.lineTo(9, 9); q.closePath(); q.fill();
  q.fillStyle = 'rgba(255,255,255,.85)'; q.beginPath(); q.moveTo(4, 9); q.lineTo(12, 3); q.lineTo(9, 9); q.closePath(); q.fill();
  q.strokeStyle = 'rgba(30,40,80,.35)'; q.lineWidth = 1; q.beginPath(); q.moveTo(4, 9); q.lineTo(20, 9); q.stroke();
}
function trapSawSprite(q) {
  q.translate(16, 16);
  q.fillStyle = '#c9ced8';
  q.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? 11 : 15; q.lineTo(Math.cos(a) * r, Math.sin(a) * r); } q.closePath(); q.fill();
  q.fillStyle = '#9aa0ae'; q.beginPath(); q.arc(0, 0, 9, 0, Math.PI * 2); q.fill();
  q.fillStyle = '#e8ecf3'; q.beginPath(); q.arc(-2, -2, 6, 0, Math.PI * 2); q.fill();
  q.fillStyle = '#5a5f6c'; q.beginPath(); q.arc(0, 0, 3, 0, Math.PI * 2); q.fill();
}
function trapFireSprite(q) {
  const gr = q.createRadialGradient(18, 18, 0, 18, 18, 18); gr.addColorStop(0, 'rgba(255,150,50,.6)'); gr.addColorStop(.45, 'rgba(255,150,50,.3)'); gr.addColorStop(1, 'rgba(255,150,50,0)');
  q.fillStyle = gr; q.fillRect(0, 0, 36, 36);
  q.fillStyle = '#ff7a2a'; q.beginPath(); q.arc(18, 18, 7.5, 0, Math.PI * 2); q.fill();
  q.fillStyle = '#ffd25a'; q.beginPath(); q.arc(18, 18, 4.2, 0, Math.PI * 2); q.fill();
  q.fillStyle = '#fff6d0'; q.beginPath(); q.arc(18, 18, 1.8, 0, Math.PI * 2); q.fill();
}
function trapRockSprite(q) {
  q.translate(20, 20);
  q.fillStyle = '#6a6470'; q.beginPath(); q.arc(0, 0, Trap.ROCK_R, 0, Math.PI * 2); q.fill();
  q.fillStyle = '#8b8592'; q.beginPath(); q.arc(-2, -2, Trap.ROCK_R - 3, 0, Math.PI * 2); q.fill();
  q.strokeStyle = 'rgba(40,35,45,.55)'; q.lineWidth = 1.5; q.beginPath(); q.moveTo(-8, -3); q.lineTo(-2, 1); q.lineTo(3, -5); q.moveTo(-2, 1); q.lineTo(0, 9); q.moveTo(6, 3); q.lineTo(11, 6); q.stroke();
  q.fillStyle = 'rgba(255,255,255,.22)'; q.beginPath(); q.ellipse(-6, -8, 5, 3, -.5, 0, Math.PI * 2); q.fill();
}

/* ---------- each frame ---------- */
function trapRender() {
  const g = ctx, st = PM.st, G = st.G, def = G.def, grp = st.grp;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 7 * S.shake;
  const cam = Math.round(st.cam - ox);
  stamp(g, 'pTop', '', 0, 0, VW, PY0, trapTop, true);
  for (const [ci, c] of trapStrips(G, cam)) blit(g, c.cv, ci * PCH * PT - cam, PY0, PCH * PT, PROWS * PT);
  g.save(); g.translate(-cam, PY0);
  const tx0 = Math.max(0, Math.floor(cam / PT) - 1), tx1 = Math.min(G.W - 1, Math.ceil((cam + VW) / PT) + 1), t = S.time, inView = (x, m = 60) => x > cam - m && x < cam + VW + m;
  // water glinting, spikes on their beat, plates, gates, levers, checkpoint fires
  const spk = {};
  for (const sg in def.spikes || {}) spk[sg] = Trap.spikeState(G, sg);
  const upC = layer('pSpUp', '', 32, 32, q => trapSpikeSprite(q, 1)), warnC = layer('pSpWarn', '', 32, 32, q => trapSpikeSprite(q, .35)), sprites = [];
  for (let y = 0; y < PROWS; y++) for (let x = tx0; x <= tx1; x++) {
    const c = G.grid[y][x], px = x * PT, py = y * PT;
    if (c === '~') { const k = Math.floor(((t * .6 + hash(x, y) % 100 / 100) % 1) * 8); sprites.push(layer('pWave' + k, '', 32, 32, q => { const u = (k + .5) / 8; q.strokeStyle = `rgba(220,245,255,${.35 * Math.sin(u * Math.PI)})`; q.lineWidth = 1.5; q.beginPath(); q.moveTo(6, 10 + u * 14); q.quadraticCurveTo(16, 6 + u * 14, 26, 10 + u * 14); q.stroke(); }), px, py); }
    else if (Trap.SPIKE.includes(c)) {
      const s = spk[c], sp = def.spikes[c];
      if (s === 'up') sprites.push(upC, px, py); else if (s === 'warn') sprites.push(warnC, px + (Math.sin(t * 60 + x) > 0 ? .5 : -.5), py);
      if (sp && sp.stop && Trap.stopped(G, sp.stop)) { g.strokeStyle = hexA(grp.of['s' + c], .55 + .25 * Math.sin(t * 5)); g.lineWidth = 2; g.strokeRect(px + 2, py + 2, PT - 4, PT - 4); }
    }
    else if (Trap.PLATE.includes(c) && G.sig.includes(c)) { const col = grp.col[c] || C.gold; glow(g, hexRgb(col), px + 16, py + 15, 22, .55); g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, px + 5, py + 5, PT - 10, PT - 10, 4); g.fill(); g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(px + 16, py + 16, 7, 0, Math.PI * 2); g.stroke(); }
    else if (Trap.GATE.includes(c)) trapGate(g, G, c, x, y);
    else if (c === '!') { const i = G.checks.findIndex(k => k.tx === x); if (i >= 0 && i <= G.cp) { const k = Math.floor(t * 9 + y * 1.7) % 4; sprites.push(layer('pFlame' + k, '', 40, 36, q => { const gr = q.createRadialGradient(20, 18, 0, 20, 18, 20); gr.addColorStop(0, 'rgba(255,190,90,.5)'); gr.addColorStop(1, 'rgba(255,190,90,0)'); q.fillStyle = gr; q.fillRect(0, 0, 40, 36); trapFlame(q, 20, 20, 1, k * .4); }), px - 4, py - 10); } }
  }
  // the spikes, copied on whole pixels all in one go
  if (sprites.length) { const m = g.getTransform(); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); for (let i = 0; i < sprites.length; i += 3) g.drawImage(sprites[i], Math.round(m.a * sprites[i + 1] + m.e), Math.round(m.d * sprites[i + 2] + m.f)); g.restore(); }
  // lamps by each gate in its plates' colour, lit while it is open
  for (const gk in def.gates || {}) {
    let top = null; for (let y = 0; y < PROWS && !top; y++) for (let x = tx0; x <= tx1; x++) if (G.grid[y][x] === gk) { top = [x, y]; break; }
    if (!top) continue;
    const col = grp.of['g' + gk], lx = (top[0] + .5) * PT, ly = top[1] * PT - 9, on = G.gopen[gk];
    if (on) glow(g, hexRgb(col), lx, ly, 18, .7);
    g.fillStyle = '#3a3128'; g.beginPath(); g.arc(lx, ly, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = on ? col : hexA(col, .35); g.beginPath(); g.arc(lx, ly, 4, 0, Math.PI * 2); g.fill();
  }
  for (const L of G.levers) if (inView(L.x)) trapLever(g, G, L, t);
  trapExit(g, G, t, inView);
  // gems and hearts bobbing
  for (const gm of G.gems) if (!gm.got && inView(gm.x)) { const b = Math.sin(t * 3 + gm.x * .05) * 2.5, k = Math.floor(gm.x / 97) % 3, col = ['#7cdcff', '#ff9ad0', '#b8f27a'][k]; blit(g, layer('pGem' + k, '', 24, 24, q => trapGemSprite(q, col)), gm.x - 12, gm.y - 14 + b, 24, 24); if ((t * 2 + gm.x) % 3 < .3) { g.fillStyle = 'rgba(255,255,255,.9)'; twinkle(g, gm.x + 6, gm.y - 12 + b, 3.5); } }
  for (const hh of G.extras) if (!hh.got && inView(hh.x)) { const b = Math.sin(t * 3 + hh.x) * 2.5; glow(g, '255,120,160', hh.x, hh.y + b, 20, .35); g.fillStyle = C.pink; heartPath(g, hh.x, hh.y - 2 + b, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(hh.x - 3.5, hh.y - 5 + b, 2.4, 1.6, -.5, 0, Math.PI * 2); g.fill(); }
  // saws, fire bars
  G.things.forEach((h, i) => {
    const d = h.d, stop = Trap.stopped(G, d.stop);
    if (d.k === 'saw') {
      const [sx, sy] = Trap.sawPos(d, h.c); if (!inView(sx)) return;
      if (d.stop) for (const [x, y] of [[d.x0, d.y0], [d.x1, d.y1]]) { const col = grp.of['t' + i]; g.fillStyle = stop ? col : hexA(col, .4); g.beginPath(); g.arc((x + .5) * PT, (y + .5) * PT, 3.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx + 2, sy + 5, 14, 6, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(sx, sy); g.rotate(stop ? 0 : t * 14); blit(g, layer('pSaw', '', 32, 32, trapSawSprite), -16, -16, 32, 32); g.restore();
      if (!stop) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, 17, t * 14, t * 14 + 1); g.stroke(); }
    } else if (d.k === 'fire') {
      const cx = (d.x + .5) * PT, cy = (d.y + .5) * PT; if (!inView(cx, (d.len + 1) * PT)) return;
      if (stop) { glow(g, '255,140,60', cx, cy - 2, 12, .35); return; }
      // a chain of fireballs (each one sprite: a glow, an orange ball, a yellow heart), flickering
      const [ax, ay, bx, by] = Trap.firePts(d, h.c), n = d.len * 2 + 1, fb = layer('pFire', '', 36, 36, trapFireSprite);
      for (let k = 0; k <= n; k++) { const u = k / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, f = 18 * (1 + .15 * Math.sin(t * 22 + k * 2.5)); g.drawImage(fb, x - f, y - f, f * 2, f * 2); }
    }
  });
  // arrows, logs, boulders (kept inside the path: they come out of the trees, not over the boxes at the top)
  const edge = G.shots.some(s => s.y < 30 || s.y > PROWS * PT - 30);
  if (edge) { g.save(); g.beginPath(); g.rect(cam - 10, 0, VW + 20, PROWS * PT); g.clip(); }
  for (const s of G.shots) {
    if (!inView(s.x, 90)) continue;
    if (s.k === 'arrow') {
      const v = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / v, uy = s.vy / v;
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x + 3, s.y + 5); g.lineTo(s.x - ux * 22 + 3, s.y - uy * 22 + 5); g.stroke();
      g.strokeStyle = '#8a5a32'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - ux * 22, s.y - uy * 22); g.stroke();
      g.fillStyle = '#d8dde8'; g.beginPath(); g.moveTo(s.x + ux * 4, s.y + uy * 4); g.lineTo(s.x - uy * 3.5, s.y + ux * 3.5); g.lineTo(s.x + uy * 3.5, s.y - ux * 3.5); g.closePath(); g.fill();
      g.fillStyle = '#ff8fb0'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(s.x - ux * 16, s.y - uy * 16); g.lineTo(s.x - ux * 22 - uy * 4 * sd, s.y - uy * 22 + ux * 4 * sd); g.lineTo(s.x - ux * 22, s.y - uy * 22); g.closePath(); g.fill(); }
    } else if (s.k === 'rock') {
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(s.x + 3, s.y + 9, 16, 7, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(s.x, s.y); g.rotate(s.y * .06 * Math.sign(s.vy || 1)); blit(g, layer('pRock', '', 40, 40, trapRockSprite), -20, -20, 40, 40); g.restore();
    } else {
      const w = Trap.LOG_W, h = Trap.LOG_H, x = s.x - w / 2, y = s.y - h / 2, roll = ((s.y * .25) % 8 + 8) % 8;
      g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, x + 3, y + 7, w, h, 10); g.fill();
      g.fillStyle = '#7a4a28'; rr(g, x, y, w, h, 10); g.fill();
      g.fillStyle = '#8f5a32'; rr(g, x, y + 2, w, h - 8, 8); g.fill();
      g.strokeStyle = 'rgba(60,35,18,.6)'; g.lineWidth = 1.5; for (let k = -1; k < 4; k++) { const yy = y + 2 + ((k * 8 + roll) % 24 + 24) % 24 * (h - 4) / 24; g.beginPath(); g.moveTo(x + 8, yy); g.lineTo(x + w - 8, yy); g.stroke(); }
      for (const ex of [x + 5, x + w - 5]) { g.fillStyle = '#d9b07a'; g.beginPath(); g.ellipse(ex, s.y, 5, h / 2 - 1, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#a87a48'; g.lineWidth = 1; g.beginPath(); g.ellipse(ex, s.y, 2.6, h / 4, 0, 0, Math.PI * 2); g.stroke(); }
    }
  }
  if (edge) g.restore();
  // the two of them, the nearer one in front
  const ids = ['pink', 'mint'].sort((a, b) => st.disp[a].y - st.disp[b].y);
  for (const id of ids) trapHero(g, G, id, st.disp[id].x, st.disp[id].y, t);
  g.restore();
  drawParts(g);
  xDrawFloats(g, PM);
  trapHud(g, G);
  xCountdown(g, G, Trap.START);
  xBannerDraw(g, G, Trap.START, def.name, `ผลัดกันยืนบนแผ่นหินให้อีกคนผ่าน · ใครล้มให้อีกคนไปยืนข้างๆ · ไปให้ถึงประตูวิหารพร้อมกัน`);
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
function trapFlame(g, x, y, k, t) {
  const f = 1 + .12 * Math.sin(t * 17), w = Math.sin(t * 11) * 1.5;
  g.fillStyle = '#ff7a2a'; g.beginPath(); g.moveTo(x - 5 * k, y); g.quadraticCurveTo(x - 4 * k, y - 8 * k * f, x + w, y - 13 * k * f); g.quadraticCurveTo(x + 4 * k, y - 8 * k * f, x + 5 * k, y); g.closePath(); g.fill();
  g.fillStyle = '#ffd25a'; g.beginPath(); g.moveTo(x - 2.6 * k, y); g.quadraticCurveTo(x - 2 * k, y - 5 * k * f, x + w * .6, y - 8 * k * f); g.quadraticCurveTo(x + 2 * k, y - 5 * k * f, x + 2.6 * k, y); g.closePath(); g.fill();
}
// a gate: a row of stakes that sink into the ground as it opens
function trapGate(g, G, c, x, y) {
  const k = PM.st.gate[c], px = x * PT, py = y * PT;
  g.fillStyle = '#3a2e26'; g.fillRect(px + 2, py, 4, PT); g.fillRect(px + PT - 6, py, 4, PT);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let s = 0; s < 3; s++) g.fillRect(px + 9 + s * 6, py + 2, 3, PT - 4);
  if (k > .97) return;
  const hgt = 1 - k;
  for (let s = 0; s < 3; s++) {
    const bx = px + 8 + s * 6;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(bx + 2, py + 3, 5, (PT - 2) * hgt);
    g.fillStyle = '#7a5032'; rr(g, bx, py + 1, 5, (PT - 2) * hgt, 2); g.fill();
    g.fillStyle = '#9a6a44'; g.fillRect(bx + 1, py + 2, 2, (PT - 4) * hgt);
    g.fillStyle = '#c7ccd6'; g.beginPath(); g.moveTo(bx - .5, py + 1 + (PT - 2) * hgt); g.lineTo(bx + 2.5, py + 5 + (PT - 2) * hgt); g.lineTo(bx + 5.5, py + 1 + (PT - 2) * hgt); g.fill();
  }
  g.fillStyle = '#5e3d26'; g.fillRect(px + 6, py + 8, PT - 12, 3 * hgt); g.fillRect(px + 6, py + 21, PT - 12, 3 * hgt);
}
function trapLever(g, G, L, t) {
  const on = !!G.open[L.id], k = on ? 1 : Math.min(1, L.t / (Trap.LEVER_T * .5)), a = -0.7 + k * 1.4, bx = L.x, by = L.y + 1;
  const col = PM.st.grp.col[L.id] || C.gold;
  if (on) glow(g, '140,230,120', bx, by, 22, .5);
  else { glow(g, hexRgb(col), bx, by, 18, .22 + .12 * Math.sin(t * 4)); }
  g.strokeStyle = '#4a3a2c'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.sin(a) * 14, by - Math.cos(a) * 14); g.stroke(); g.lineCap = 'butt';
  g.fillStyle = on ? '#8fe07a' : col; g.beginPath(); g.arc(bx + Math.sin(a) * 14, by - Math.cos(a) * 14, 4.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(bx + Math.sin(a) * 14 - 1.5, by - Math.cos(a) * 14 - 1.5, 1.5, 0, Math.PI * 2); g.fill();
}
// the temple gate: a stone arch glowing more as the two of them come near
function trapExit(g, G, t, inView) {
  const E = trapExit.of === G ? trapExit.box : (trapExit.of = G, trapExit.box = (() => { let a = 1e9, b = -1, c = 1e9, d = -1; for (let y = 0; y < PROWS; y++) for (let x = 0; x < G.W; x++) if (G.grid[y][x] === 'E') { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return b < 0 ? null : [a, b, c, d]; })());
  if (!E) return;
  const x0 = E[0] * PT, x1 = (E[1] + 1) * PT, y0 = E[2] * PT, y1 = (E[3] + 1) * PT; if (!inView(x0, 200)) return;
  const pulse = .5 + .2 * Math.sin(t * 2.5), dx = x1 + 4, cy = (y0 + y1) / 2;
  glow(g, '255,220,120', (x0 + x1) / 2, cy, 90, .25 * pulse + .1);
  // the doorway in the wall behind
  g.fillStyle = '#5a4a3a'; rr(g, dx - 6, y0 - 10, 34, y1 - y0 + 20, 8); g.fill();
  g.fillStyle = '#e8c25a'; rr(g, dx - 2, y0 - 4, 26, y1 - y0 + 8, 10); g.fill();
  g.fillStyle = `rgba(255,250,220,${.55 + .3 * pulse})`; rr(g, dx + 2, y0 + 2, 18, y1 - y0 - 4, 8); g.fill();
  g.fillStyle = '#c99a3a'; for (let y = y0 + 8; y < y1 - 6; y += 18) { g.beginPath(); g.arc(dx + 11, y, 2.4, 0, Math.PI * 2); g.fill(); }
  for (let k = 0; k < 4; k++) { const u = (t * .4 + k / 4) % 1; g.fillStyle = `rgba(255,240,180,${.6 * (1 - u)})`; twinkle(g, x0 + 12 + (k * 37) % (x1 - x0 - 20), y1 - 6 - u * (y1 - y0 - 10), 3); }
}
function trapHero(g, G, id, x, y, t) {
  const st = PM.st, p = G.p[id], pink = id === 'pink', col = pink ? C.pink : C.mint, dark = pink ? C.pinkD : C.mintD;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2); g.fill();
  if (p.st === 'down') {
    // flat on the ground: dizzy eyes, little stars going round, a cry for help and the help ring
    g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + 4, 17, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + 2, 16, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 6, y - 2, 4, 2, -.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 1.6; for (const s of [-1, 1]) { const ex = x + s * 5; g.beginPath(); g.moveTo(ex - 2.4, y); g.lineTo(ex + 2.4, y + 3.6); g.moveTo(ex + 2.4, y); g.lineTo(ex - 2.4, y + 3.6); g.stroke(); }
    if (p.why === 'water') { g.fillStyle = 'rgba(160,220,255,.85)'; for (let k = 0; k < 3; k++) { const u = (t * 1.5 + k / 3) % 1; g.beginPath(); g.arc(x - 10 + k * 10, y - 6 + u * 12, 2, 0, Math.PI * 2); g.fill(); } }
    else for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; g.fillStyle = C.gold; twinkle(g, x + Math.cos(a) * 13, y - 10 + Math.sin(a) * 4, 3); }
    const by = y - 30 + Math.sin(t * 4) * 2;
    g.font = `600 12px ${FONT}`; const tw = g.measureText('ช่วยด้วย!').width + 16;
    rr(g, x - tw / 2, by - 12, tw, 20, 10); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.moveTo(x - 4, by + 7); g.lineTo(x + 4, by + 7); g.lineTo(x, by + 12); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ช่วยด้วย!', x, by - 1); g.textBaseline = 'alphabetic';
    const left = Math.max(0, 1 - p.dt / Trap.DOWN_T);
    g.strokeStyle = 'rgba(21,18,43,.55)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 2, 24, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = left < .3 ? '#ff6b6b' : 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y + 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke();
    if (p.rv > 0) { g.strokeStyle = '#9be07a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.rv / Trap.REVIVE_T)); g.stroke(); }
    return;
  }
  if (p.inv > 0 && Math.floor(t * 12) % 2) g.globalAlpha = .45;
  const w = st.walk[id], bob = p.mv ? Math.abs(Math.sin(w)) * 2.2 : 0, step = p.mv ? Math.sin(w) * 3 : 0, fx = p.fx, fy = p.fy;
  // little feet, then the round body, the bow or the sprout, the face looking where they go
  g.fillStyle = dark; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 6 + fx * s * step * .3, y + 8 + s * step * .6, 4.2, 3, 0, 0, Math.PI * 2); g.fill(); }
  roundBody(g, x, y - 3 - bob, 13, id, false, p.mv ? w : 0);
  if (pink) cuteBow(g, x + 5, y - 16 - bob, .95); else cuteSprout(g, x, y - 15 - bob, 1.05, t);
  cuteFace(g, x + fx * 3.5, y - 5 - bob + Math.max(-1, fy) * 1.5, fx, t, pink, '', .82, fy, id);
  g.globalAlpha = 1;
  if (G.t < Trap.START + 3) { g.globalAlpha = Math.min(1, (Trap.START + 3 - G.t) * 1.5); nameTag(g, S.names[id], x, y - 30 - wardLift(id), col); g.globalAlpha = 1; }
}

/* ---------- the boxes at the top: time and points, hearts, how far along the path ---------- */
function trapHud(g, G) {
  const def = G.def, st = PM.st, left = Math.max(0, def.time - Math.max(0, G.t - Trap.START));
  const shown = G.won ? G.score : Math.max(0, Math.round(Trap.FINISH_PTS + G.stats.gems * Trap.GEM_PTS + G.hearts * Trap.HEART_PTS + left * Trap.TIME_PTS - G.stats.downs * Trap.FALL_PTS));
  xScoreBox(g, left, shown, def.stars, G.won ? 'แต้ม' : 'ถ้าถึงตอนนี้');
  // hearts
  const n = Math.max(Trap.HEARTS, G.hearts), hw = 22 * n + 70, hx = VW - 8 - hw;
  panel(g, hx, 8, hw, 26, 12, .82);
  g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText('หัวใจ', hx + 10, 25);
  for (let i = 0; i < n; i++) { g.fillStyle = i < G.hearts ? C.pink : 'rgba(255,255,255,.2)'; heartPath(g, hx + 60 + i * 22, 20, 7); g.fill(); }
  // gems
  const all = G.gems.length, gw = 112, gx = VW - 8 - gw;
  panel(g, gx, 40, gw, 26, 12, .82);
  blit(g, layer('pGem0', '', 24, 24, q => trapGemSprite(q, '#7cdcff')), gx + 6, 40, 24, 24);
  g.font = `400 15px ${FONT_D}`; g.textAlign = 'left'; g.fillStyle = '#bff4ff'; g.fillText(`${th(G.stats.gems)}/${th(all)}`, gx + 36, 59);
  // the path: the start, the checkpoints, the temple; where each of them is
  const px0 = 262, px1 = gx - 18 < hx - 18 ? gx - 18 : hx - 18, pw = px1 - px0;
  panel(g, px0, 8, pw, 58, 14, .82);
  const lx0 = px0 + 22, lx1 = px1 - 34, ly = 40, at = x => lx0 + (lx1 - lx0) * Math.max(0, Math.min(1, x / (G.W * PT)));
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx0, ly); g.lineTo(lx1, ly); g.stroke();
  const far = Math.max(G.p.pink.x, G.p.mint.x);
  g.strokeStyle = 'rgba(255,207,90,.55)'; g.beginPath(); g.moveTo(lx0, ly); g.lineTo(at(far), ly); g.stroke(); g.lineCap = 'butt';
  G.checks.forEach((c, i) => { const x = at((c.tx + .5) * PT); g.fillStyle = i <= G.cp ? '#ffb35a' : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x, ly, 4, 0, Math.PI * 2); g.fill(); if (i <= G.cp) trapFlame(g, x, ly - 4, .55, S.time + i); });
  g.fillStyle = '#e8c25a'; rr(g, lx1 + 6, ly - 11, 18, 20, 5); g.fill(); g.fillStyle = '#fff6d0'; rr(g, lx1 + 10, ly - 7, 10, 16, 4); g.fill();
  for (const id of ['pink', 'mint']) { const x = at(G.p[id].x), y = ly + (id === 'pink' ? -10 : 10); g.fillStyle = id === 'pink' ? C.pink : C.mint; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
  g.font = `600 10px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText(`จุดเซฟ ${th(G.cp + 1)}/${th(G.checks.length)}`, px0 + 14, 22);
  if (S.mode !== 'play' || G.st !== 'run' || G.over) return;
  // a word for each of them, over their head
  for (const id of ['pink', 'mint']) {
    const p = G.p[id], o = G.p[id === 'pink' ? 'mint' : 'pink'], d = st.disp[id], sx = d.x - st.cam, sy = d.y + PY0 - 36;
    if (p.st !== 'ok') continue;
    let tip = null;
    const under = Trap.tileAt(G, Math.floor(p.x / PT), Math.floor(p.y / PT));
    if (o.st === 'down') tip = `ไปช่วย${S.names[o === G.p.pink ? 'pink' : 'mint']}!`;
    else if (Trap.PLATE.includes(under) && G.sig.includes(under)) tip = 'ยืนไว้ ให้อีกคนผ่าน';
    else if (G.levers.some(L => !G.open[L.id] && Math.hypot(L.x - p.x, L.y - p.y) < Trap.LEVER_R)) tip = 'ดึงคันโยกพร้อมกัน!';
    else { for (let k = 1; k <= 2 && !tip; k++) for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) { const c = Trap.tileAt(G, Math.floor((p.x + dx * k * 16) / PT), Math.floor((p.y + dy * k * 16) / PT)); if (Trap.GATE.includes(c) && !G.gopen[c]) { tip = 'ให้อีกคนเหยียบแผ่นหิน'; break; } } }
    if (tip) xTip(g, id, tip, sx, sy);
  }
}

/* ---------- Stranded (ติดเกาะกับแฟน) ---------- */
Object.assign(sfx, {
  sshake() { noise(.25, 2200, .045, 'bandpass', .8, 900); noise(.12, 3500, .02, 'highpass', .7, 0, .08); },
  sbonk() { tone(330, .08, 'square', .05, 180); tone(900, .35, 'sine', .04, 1500, .06); noise(.08, 700, .06, 'lowpass', 1); },
  scatch() { tone(520, .06, 'triangle', .05, 780); chime(1175, .25, .035, .05); },
  spick() { tone(600, .05, 'triangle', .035, 750); },
  seat() { for (let i = 0; i < 3; i++) noise(.05, 1500 + Math.random() * 800, .045, 'bandpass', 2, 0, i * .11); },
  sdrink() { for (let i = 0; i < 3; i++) tone(260 + i * 20, .09, 'sine', .05, 160, i * .16); },
  ssalty() { tone(500, .15, 'sawtooth', .03, 330); tone(330, .35, 'sawtooth', .03, 200, .14); },
  ssplash() { noise(.35, 1500, .07, 'bandpass', .8, 500); for (let i = 0; i < 3; i++) tone(900 + i * 300, .05, 'sine', .015, 1500, .08 + i * .05); },
  sfish() { tone(400, .06, 'triangle', .04, 600); tone(600, .06, 'triangle', .04, 400, .08); chime(1319, .3, .035, .14); },
  srub() { noise(.12, 900 + Math.random() * 300, .05, 'bandpass', 2.5); },
  ssmoke() { for (let i = 0; i < 2; i++) noise(.1, 600, .06, 'lowpass', 1.2, 0, i * .2); tone(180, .1, 'sawtooth', .02, 140, .02); },
  slit() { noise(.6, 500, .06, 'bandpass', .7, 2000); chime(784, .4, .045, .2); chime(1175, .5, .04, .32); },
  swood() { tone(150, .1, 'triangle', .05, 110); noise(.3, 2600, .02, 'bandpass', 3, 0, .05); },
  spinch() { tone(1800, .04, 'square', .03, 1200); tone(600, .5, 'triangle', .05, 1300, .05); },
  stoot() { brrt(.3 + Math.random() * .2, 95 + Math.random() * 30, .035); },
  ssulk() { tone(330, .35, 'triangle', .045, 311); tone(294, .7, 'triangle', .045, 262, .35); },
  smakeup() { [659, 784, 988, 1319].forEach((f, i) => chime(f, .35, .04, i * .08)); },
  sflower() { chime(1568, .3, .035); chime(2093, .3, .025, .06); },
  smonkey() { for (let i = 0; i < 4; i++) tone(700 + (i % 2) * 300, .07, 'square', .02, 900 + (i % 2) * 300, i * .1); },
  ssteal() { noise(.2, 1800, .04, 'bandpass', 1, 600); },
  sship() { tone(110, 1.2, 'sawtooth', .04, 108); tone(165, 1.2, 'sawtooth', .025, 162); },
  sdusk() { chime(392, 1.2, .03); chime(523, 1.2, .025, .2); },
  sfizz() { noise(.7, 3000, .04, 'highpass', .7, 900); },
  slove() { chime(1047, .3, .03); },
  sretry() { tone(392, .25, 'triangle', .05, 370); tone(330, .25, 'triangle', .05, 311, .25); tone(262, .6, 'triangle', .05, 247, .5); },
  swash() { noise(.9, 500, .05, 'lowpass', .7, 1400); }
});
const SI = Isle.T;
// a word floating up (the same words twice at once just once)
function sFloat(text, x, y, col, size, life) { if (SM.st.floats.some(f => f.text === text && f.max - f.life < .8)) return; xFloat(SM, text, x, y, col, size, life); }
const S_WHY = { food: 'หิวจนหมดแรง', water: 'กระหายน้ำจนหมดแรง', cold: 'หนาวจนหมดแรง' };
const S_ITEM = { coco: 'มะพร้าว', banana: 'กล้วย', fish: 'ปลาดิบ', cooked: 'ปลาย่าง', wood: 'ฟืน', rock: 'หิน', flower: 'ดอกไม้' };
const SM = xMode({
  kind: 'isle', md: 's', pres: 'sw', dk: 's', L: SLEVELS, pk: 's', Eng: Isle, pad: 'k', list: 'slevels', olist: 'oLevelsS', starsAll: 'sStarsAll',
  label: i => 'เกาะที่ ' + th(i + 1), word: 'ไป', goWord: 'ไปติดเกาะ', fresh: 'ยังไม่เคยไป', nextWord: 'เกาะถัดไป', againWord: 'ติดเกาะนี้อีกครั้ง',
  score: G => G.score,
  kWords: () => ({ act: 'หยิบ<br>ทำ', use: '' }),
  onLoad() {
    const st = SM.st, G = st.G;
    Object.assign(st, { shakeT: {}, puffs: [], walk: { pink: 0, mint: 0 }, stepT: { pink: 0, mint: 0 }, disp: { pink: { x: G.p.pink.x, y: G.p.pink.y }, mint: { x: G.p.mint.x, y: G.p.mint.y } },
      night: Isle.night(G) ? 1 : 0, rainK: 0, tideK: 0, said: {}, monkeyT: 0, cryT: { pink: 0, mint: 0 } });
  },
  snap: G => ({ st: G.st, over: G.over, won: G.won, h: G.hearts, d: G.day, n: Isle.night(G), su: G.sulk, sh: !!G.ship, lit: G.fire.lit, mk: !!G.monkey, ps: [G.p.pink.st, G.p.mint.st],
    it: [G.p.pink.item, G.p.mint.item], fa: G.falls.length, pd: G.pads.map(p => p.n).join(','), s: Object.assign({}, G.stats), lv: Math.round(G.love), pa: [G.p.pink.panic > 0, G.p.mint.panic > 0],
    stn: [G.p.pink.stun > 0, G.p.mint.stun > 0], sk: [G.p.pink.sick > 0, G.p.mint.sick > 0], fu: G.fire.fuel, pr: G.fire.prog }),
  changes(p, n) {
    const ev = [];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.d > p.d) ev.push('dawn:' + n.d);
    if (n.n && !p.n) ev.push('dusk');
    if (n.lit && !p.lit) ev.push('lit'); else if (!n.lit && p.lit) ev.push('fireout');
    if (n.fu > p.fu + 5) ev.push('wood:x');
    if (n.pr > p.pr + 2) ev.push('rub:x');
    if (n.s.smoke > p.s.smoke) ev.push('smoke:x');
    if (n.sh && !p.sh) ev.push('ship');
    if (n.mk && !p.mk) ev.push('monkey');
    if (n.s.steals > p.s.steals) ev.push('steal:x');
    if (n.fa > p.fa) ev.push('fall');
    if (n.s.catches > p.s.catches) ev.push('catch:x');
    if (n.s.fish > p.s.fish) ev.push('fish:x');
    if (n.s.makeups > p.s.makeups) ev.push('makeup:x');
    if (n.s.gifts > p.s.gifts) ev.push('flower:x');
    if (n.s.selfish > p.s.selfish) ev.push('selfish:x');
    if (n.s.retries > p.s.retries) ev.push('retry:x');
    if (n.pd !== p.pd && n.pd.split(',').reduce((a, b) => a + +b, 0) > p.pd.split(',').reduce((a, b) => a + +b, 0)) ev.push('sos:0:0');
    ['pink', 'mint'].forEach((id, i) => {
      if (n.ps[i] === 'down' && p.ps[i] !== 'down') ev.push('down:' + id + ':' + (SM.st.G.p[id].why || 'food'));
      if (n.ps[i] === 'ok' && p.ps[i] === 'down') ev.push('revive:' + id);
      if (n.pa[i] && !p.pa[i]) ev.push('pinch:' + id);
      if (n.stn[i] && !p.stn[i] && n.s.bonks > p.s.bonks) ev.push('bonk:' + id + ':x');
      if (n.sk[i] && !p.sk[i]) ev.push('sick:' + id);
      if (n.it[i] !== p.it[i] && n.it[i] && n.it[i] !== 'cooked') ev.push('pick:' + id + ':' + n.it[i]);
      if (n.it[i] === 'cooked' && p.it[i] === 'fish') ev.push('cooked:' + id);
    });
    if (n.su && !p.su) ev.push('sulk:' + n.su);
    if (n.won && !p.won) ev.push('rescued');
    else if (n.over && !p.over) ev.push('out:x');
    return ev;
  },
  events(ev) {
    const st = SM.st, G = st.G, at = id => G.p[id] || { x: VW / 2, y: VH / 2 };
    for (const e of ev) {
      const [k, a, b, c] = e.split(':'), p = G.p[a];
      if (k === 'go') sfx.ilaunch();
      else if (k === 'shake') { sfx.sshake(); if (p) { const t = Isle.reach(G, p, 'T'); if (t) st.shakeT[t.tx + ',' + t.ty] = .5; } }
      else if (k === 'empty') { if (p) sFloat('หมดแล้ว', p.x, p.y - 30, '#c9bfef', 14); }
      else if (k === 'fall') sfx.sshake();
      else if (k === 'catch') { sfx.scatch(); if (p) sFloat('รับได้!', p.x, p.y - 34, C.gold, 18); }
      else if (k === 'bonk') { sfx.sbonk(); S.shake = Math.max(S.shake, .35); if (p) { burst(p.x, p.y - 20, 6, C.gold, { type: 'star', size: 4, speed: 70, life: .8, g: 0 }); sFloat(b === a ? 'โป๊ก! หัวตัวเองแท้ๆ' : 'โป๊ก!! ใครเขย่าเนี่ย!', p.x, p.y - 36, '#ffb38a', 18, 1.6); } }
      else if (k === 'land') sfx.land();
      else if (k === 'pick') { sfx.spick(); }
      else if (k === 'eat') { sfx.seat(); if (p && c) sFloat('ป้อนให้!', p.x, p.y - 34, '#ffd1e8', 16); }
      else if (k === 'drink') { sfx.sdrink(); if (p) sFloat('อึกๆๆ สดชื่น', p.x, p.y - 34, '#bfe6ff', 15); }
      else if (k === 'salty') { sfx.ssalty(); if (p) sFloat('แหวะ! เค็มปี๋', p.x, p.y - 36, '#9fd8ff', 18, 1.6); }
      else if (k === 'splash') { sfx.ssplash(); if (p) sFloat('พลาด! ตัวเปียกเลย', p.x, p.y - 34, '#bfe6ff', 15); }
      else if (k === 'fish') { sfx.sfish(); if (p) sFloat('ได้ปลา!', p.x, p.y - 34, C.gold, 18); }
      else if (k === 'rub') { sfx.srub(); st.puffs.push({ x: G.fire.x + (Math.random() - .5) * 10, y: G.fire.y - 6, life: .8, s: 4 }); }
      else if (k === 'smoke') { sfx.ssmoke(); for (let i = 0; i < 4; i++) st.puffs.push({ x: G.fire.x + (Math.random() - .5) * 20, y: G.fire.y - 6, life: 1.4, s: 8 + Math.random() * 6 }); sFloat('แค่กๆ! ถูสลับกันสิ', G.fire.x, G.fire.y - 40, '#c9bfef', 16, 1.6); }
      else if (k === 'nowood') { if (p) sFloat('ต้องมีฟืนในกองไฟก่อน', p.x, p.y - 34, '#ffb38a', 14); }
      else if (k === 'lit') { sfx.slit(); burst(G.fire.x, G.fire.y - 10, 12, '#ffb35a', { size: 3, speed: 60, up: 80, life: 1, g: -40 }); sFloat('ไฟติดแล้ว!', G.fire.x, G.fire.y - 44, C.gold, 20); }
      else if (k === 'singe') { if (p) sFloat('ผมไหม้!', p.x, p.y - 40, '#ffb38a', 18); }
      else if (k === 'wood') sfx.swood();
      else if (k === 'cook') sfx.swood();
      else if (k === 'cooked') { sfx.scatch(); if (p) sFloat('ปลาย่างหอมๆ', p.x, p.y - 34, '#ffd27a', 15); }
      else if (k === 'sos') { sfx.swood(); }
      else if (k === 'pinch') { sfx.spinch(); S.shake = Math.max(S.shake, .3); if (p) sFloat('โอ๊ยยย! ปูหนีบก้น!', p.x, p.y - 40, '#ff8a8a', 18, 1.6); }
      else if (k === 'sick') { if (p) sFloat('ท้องไส้ปั่นป่วน...', p.x, p.y - 36, '#b8e07a', 15, 1.6); }
      else if (k === 'toot') { sfx.stoot(); if (p) { st.puffs.push({ x: p.x - p.fx * 10, y: p.y + 6, life: 1.2, s: 7, green: true }); const o = G.p[a === 'pink' ? 'mint' : 'pink']; sFloat(Math.hypot(o.x - p.x, o.y - p.y) < 70 ? 'ปู้ด! (ขอโทษ...)' : 'ปู้ด!', p.x, p.y - 30, '#b8e07a', 14); } }
      else if (k === 'selfish') { sfx.ssulk(); const o = G.p[a === 'pink' ? 'mint' : 'pink']; sFloat('เห้ย! กินคนเดียวเหรอ!', o.x, o.y - 40, '#ff8a8a', 17, 1.8); }
      else if (k === 'sulk') { sfx.ssulk(); if (p) sFloat('งอนแล้ว! ไม่ช่วยแล้ว!', p.x, p.y - 44, '#ff8a8a', 18, 2); }
      else if (k === 'makeup') { sfx.smakeup(); const o = G.p[a === 'pink' ? 'mint' : 'pink']; if (o) burst(o.x, o.y - 20, 14, C.pink, { type: 'heart', size: 5, speed: 80, up: 80, life: 1.2, g: -40 }); sFloat('ง้อสำเร็จ! หายงอนแล้ว', VW / 2, 150, C.pink, 20, 1.8); }
      else if (k === 'flower') { sfx.sflower(); const o = G.p[a === 'pink' ? 'mint' : 'pink']; if (o && a !== 'x') { burst(o.x, o.y - 20, 8, C.pink, { type: 'heart', size: 4, speed: 60, up: 60, life: 1, g: -40 }); sFloat('ให้ดอกไม้! 💗', o.x, o.y - 40, '#ffd1e8', 16); } }
      else if (k === 'love' && +a > 0 && b !== 'catch') sfx.slove();
      else if (k === 'monkey') { sfx.smonkey(); sFloat('ลิงมาแล้ว! ระวังของ', VW / 2, 120, '#ffd27a', 18, 1.6); }
      else if (k === 'steal') { sfx.ssteal(); const m = G.monkey; sFloat(a === 'rock' ? 'ลิงขโมยหินจาก SOS!' : `ลิงขโมย${S_ITEM[a] || 'ของ'}!`, m ? m.x : VW / 2, m ? m.y - 30 : 150, '#ffb38a', 17, 1.6); }
      else if (k === 'shoo') { sfx.smonkey(); if (p) sFloat('ชิ่ว! ชิ่ว!', p.x, p.y - 34, '#ffd27a', 15); }
      else if (k === 'monkeydrop') { sfx.land(); if (p) sFloat('จับได้! คืนมานะ', p.x, p.y - 36, C.gold, 17); }
      else if (k === 'gone') { sFloat(`ลิงเอา${S_ITEM[a] || 'ของ'}หนีเข้าป่าไปแล้ว`, VW / 2, 150, '#c9bfef', 16, 1.8); }
      else if (k === 'drift') { if (Math.random() < .5) sFloat('มีขอนไม้ลอยมาเกยหาด', VW / 2, 470, '#e8d5b0', 14); }
      else if (k === 'washed') { sfx.swash(); sFloat('คลื่นพาของบนหาดไปแล้ว!', VW / 2, 440, '#bfe6ff', 16); }
      else if (k === 'fireout') { sfx.sfizz(); sFloat('ไฟดับ!', G.fire.x, G.fire.y - 40, '#ff8a8a', 18); }
      else if (k === 'dusk') { sfx.sdusk(); sFloat('ค่ำแล้ว ไปนั่งข้างกองไฟกัน', VW / 2, 150, '#ffd27a', 20, 2); }
      else if (k === 'dawn') { sfx.hrooster(); sFloat(`เช้าวันที่ ${th(+a)}`, VW / 2, 150, C.gold, 24, 2); }
      else if (k === 'ship') { sfx.sship(); sFloat(Isle.sosDone(G) ? 'เรือมาแล้ว! จุดไฟให้ควันขึ้น!' : 'เรือมาแล้ว! SOS ยังไม่ครบ!', VW / 2, 150, '#fff6c9', 22, 2.2); }
      else if (k === 'shipgone') { sfx.ssulk(); sFloat('เรือไม่เห็นเรา... ไปแล้ว', VW / 2, 150, '#c9bfef', 20, 2); }
      else if (k === 'down' && p) { sfx.die(); sFloat(S_WHY[b] || 'หมดแรง', p.x, p.y - 36, '#ff8a8a', 16, 1.6); }
      else if (k === 'revive' && p) { sfx.previve(); burst(p.x, p.y - 10, 8, a === 'pink' ? C.pink : C.mint, { type: 'heart', size: 4, speed: 60, up: 60, life: 1, g: -40 }); }
      else if (k === 'retry') { sfx.sretry(); sFloat(a === 'love' ? 'ทะเลาะกันจนแยกกันอยู่คนละฝั่งเกาะ! เริ่มวันนี้ใหม่' : a === 'ship' ? 'พลาดเรือ! เริ่มวันนี้ใหม่' : 'วันนี้ไม่รอด เริ่มวันนี้ใหม่', VW / 2, 220, '#ff8a8a', 20, 2.4); }
      else if (k === 'rescued') { sfx.win(); burst(VW / 2, 470, 24, C.gold, { type: 'star', size: 5, speed: 160, up: 140, life: 1.4, g: 80 }); sFloat('รอดแล้ว! เรือมารับแล้ว!', VW / 2, 200, C.gold, 28, 2.4); }
      else if (k === 'out') { sfx.cout(); sFloat('ติดเกาะต่อไป...', VW / 2, 250, '#ff8a8a', 26, 2.2); }
    }
  },
  tick() {
    const st = SM.st, G = st.G, q = id => { const k = kInput(id); return { mx: k.mx, my: k.my, act: k.act }; };
    if (!O.role) { SM.events(Isle.step(G, { pink: q('pink'), mint: q('mint') })); st.prev = SM.snap(G); return; }
    const li = q(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      SM.events(Isle.step(G, { [O.local]: li, [rid]: rq }, false, rid));
      rq.act = false; st.prev = SM.snap(G);
    } else {
      if (li.act) st.n.a++;
      Isle.step(G, { [O.local]: li, [rid]: { still: true } }, true);
    }
  },
  frameExtra(dt) {
    const st = SM.st, G = st.G;
    for (const id of ['pink', 'mint']) {
      const p = G.p[id], d = st.disp[id], far = Math.hypot(p.x - d.x, p.y - d.y);
      if (!O.role || id === O.local || far > 90) { d.x = p.x; d.y = p.y; } else { const k = Math.min(1, dt * 14); d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k; }
      if ((p.mv || p.panic > 0) && p.st === 'ok') st.walk[id] += dt * (p.panic > 0 ? 20 : 13);
    }
    for (const k in st.shakeT) if ((st.shakeT[k] -= dt) <= 0) delete st.shakeT[k];
    for (const f of st.puffs) { f.life -= dt; f.y -= dt * 22; f.x += dt * 6; f.s += dt * 6; }
    st.puffs = st.puffs.filter(f => f.life > 0);
    st.night += ((Isle.night(G) ? 1 : 0) - st.night) * Math.min(1, dt * .8);
    st.rainK += ((Isle.raining(G) ? 1 : 0) - st.rainK) * Math.min(1, dt * 1.5);
    st.tideK += ((Isle.tide(G) ? 1 : 0) - st.tideK) * Math.min(1, dt * .7);
    if (S.mode !== 'play' || G.st !== 'run') return;
    for (const id of ['pink', 'mint']) { const p = G.p[id]; if (p.mv && p.st === 'ok') { st.stepT[id] -= dt; if (st.stepT[id] <= 0) { st.stepT[id] = .32; if (!O.role || id === O.local) noise(.04, 2400 + Math.random() * 600, .02, 'bandpass', 2); } } }
    // a fire going: crackles now and then; smoke going up
    if (G.fire.lit && Math.random() < dt * 3) { noise(.03, 3000 + Math.random() * 2000, .012, 'bandpass', 3); if (Math.random() < .5) st.puffs.push({ x: G.fire.x + (Math.random() - .5) * 8, y: G.fire.y - 14, life: 2, s: 5 }); }
    if (st.rainK > .5 && Math.random() < dt * 2) noise(.5, 5000, .015, 'highpass', .5);
    // the panicking one cries out
    for (const id of ['pink', 'mint']) { const p = G.p[id]; if (p.panic > 0) { st.cryT[id] -= dt; if (st.cryT[id] <= 0) { st.cryT[id] = .45; tone(900 + Math.random() * 300, .25, 'triangle', .025, 1300); } } }
  },
  result(G, s) {
    const sx = G.stats, msg = !G.won ? (G.why === 'love' ? 'ทะเลาะกันบ่อยจนไม่รอด ครั้งหน้าแบ่งของกินกัน อย่าเขย่ามะพร้าวใส่หัวกัน ถ้าใครงอนให้รีบเอาดอกไม้ไปง้อ' : G.why === 'ship' ? 'เรือผ่านไปโดยไม่เห็นเรา ครั้งหน้าเรียงหิน SOS ให้ครบตั้งแต่เช้าวันสุดท้าย แล้วจุดไฟรอไว้' : 'หัวใจหมดก่อนเรือมา ครั้งหน้าคอยดูแถบหิว กระหาย หนาว ของทั้งสองคน แล้วอย่าให้ไฟดับตอนกลางคืน')
      : s === 3 ? 'รอดแบบหวานๆ ติดเกาะทั้งทียังรักกันมากขึ้นอีก' : s === 2 ? (G.love < 70 ? 'รอดแล้ว แต่ทะเลาะกันบ้าง ลองนั่งพิงกันข้างกองไฟตอนกลางคืน และให้ดอกไม้กันบ่อยๆ' : 'รอดแล้ว ลองให้เรือลำแรกเห็นจะได้แต้มเพิ่ม') : s === 1 ? 'รอดมาได้อย่างหวุดหวิด เกาะถัดไปเปิดแล้ว' : 'รอดแล้ว แต่แต้มยังไม่พอ ต้องได้อย่างน้อย ' + th(G.def.stars[0]) + ' แต้ม';
    return { head: G.won ? 'รอดแล้ว' : 'ติดเกาะต่อ', msg,
      stats: `<span>แต้ม <b>${th(G.score)}</b> ความรัก <b>${th(Math.round(G.love))}</b></span><span>หัวใจเหลือ <b>${th(G.hearts)}</b> เริ่มวันใหม่ <b>${th(sx.retries)}</b> หมดแรง <b>${th(sx.downs)}</b></span><span>โดนมะพร้าว <b>${th(sx.bonks)}</b> ปูหนีบ <b>${th(sx.pinches)}</b> งอน-ง้อ <b>${th(sx.makeups)}</b> ได้ปลา <b>${th(sx.fish)}</b></span>` };
  },
  encode() { const st = SM.st; return O.role === 'host' ? Isle.encode(st.G) : Isle.guestMsg(st.G, O.local, st.lastInp, st.n.a); },
  hostHears(m) { Isle.hostHears(SM.st.G, O.local === 'pink' ? 'mint' : 'pink', m, SM.st.remote); },
  guestHears(m) { Isle.apply(SM.st.G, m, O.local); },
  fresher: () => ({ seen: -1, mx: 0, my: 0, act: false }),
  render: isleRender
});

/* ---------- the island as it lies (drawn once) ---------- */
function isleGround(g, G) {
  const tile = (x, y) => Isle.tileAt(G, x, y), TAU = Math.PI * 2, W = Isle.COLS, H = Isle.ROWS, R = rng(G.def.seed || 5);
  // the sea: deep in the middle, lighter by the shore
  const sg = g.createLinearGradient(0, 0, 0, VH); sg.addColorStop(0, '#2a7fb8'); sg.addColorStop(1, '#1f6aa6'); g.fillStyle = sg; g.fillRect(0, 0, VW, VH);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) { const x = R() * VW, y = R() * VH, w = 14 + R() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); }
  // shallows round the island, then the wet sand, the dry sand, the grass, the jungle (rounded, overlapping)
  // a smooth shape round the tiles that pass test: squares (grown by grow px) blurred and cut again at the half-way line
  const blob = (test, col, grow, r) => {
    const w = Math.ceil(VW / 2), h = Math.ceil(VH / 2), k = 2;          // worked out at half size, then drawn smooth
    const a = new Float32Array(w * h);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (test(tile(x, y))) {
      const x0 = Math.max(0, Math.floor((x * SI - grow) / k)), x1 = Math.min(w, Math.ceil(((x + 1) * SI + grow) / k)), y0 = Math.max(0, Math.floor((y * SI - grow) / k)), y1 = Math.min(h, Math.ceil(((y + 1) * SI + grow) / k));
      for (let yy = y0; yy < y1; yy++) a.fill(1, yy * w + x0, yy * w + x1);
    }
    const rad = Math.max(2, Math.round(r / k)), tmp = new Float32Array(w * h);
    for (let pass = 0; pass < 2; pass++) {
      for (let yy = 0; yy < h; yy++) { let acc = 0; const o = yy * w; for (let xx = -rad; xx < w; xx++) { if (xx + rad < w) acc += a[o + xx + rad]; if (xx - rad - 1 >= 0) acc -= a[o + xx - rad - 1]; if (xx >= 0) tmp[o + xx] = acc / (rad * 2 + 1); } }
      for (let xx = 0; xx < w; xx++) { let acc = 0; for (let yy = -rad; yy < h; yy++) { if (yy + rad < h) acc += tmp[(yy + rad) * w + xx]; if (yy - rad - 1 >= 0) acc -= tmp[(yy - rad - 1) * w + xx]; if (yy >= 0) a[yy * w + xx] = acc / (rad * 2 + 1); } }
    }
    const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const q = cv2.getContext('2d'), img = q.createImageData(w, h), d = img.data;
    q.fillStyle = col; q.fillRect(0, 0, 1, 1); const [cr, cg, cb, ca] = q.getImageData(0, 0, 1, 1).data;
    for (let i = 0; i < w * h; i++) { const v = Math.max(0, Math.min(1, (a[i] - .42) / .16)); if (!v) continue; d[i * 4] = cr; d[i * 4 + 1] = cg; d[i * 4 + 2] = cb; d[i * 4 + 3] = ca * v; }
    q.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(cv2, 0, 0, w * k, h * k);
  };
  blob(c => c !== '~', 'rgba(120,210,220,.35)', 22, 44);
  blob(c => c !== '~', 'rgba(150,225,225,.45)', 12, 36);
  blob(c => c !== '~', 'rgba(255,255,255,.55)', 7, 32);
  blob(c => c !== '~', '#dcc48e', 4, 30);
  blob(c => c !== '~' && c !== '.', '#f3dfa8', 2, 28);
  g.fillStyle = 'rgba(180,150,100,.25)'; for (let i = 0; i < 500; i++) { const x = R() * VW, y = R() * VH; if (tile(Math.floor(x / SI), Math.floor(y / SI)) === ',' ) g.fillRect(x, y, 1.6, 1.6); }
  blob(c => 'gFBDCwj'.includes(c), '#7fbf5a', 6, 26);
  blob(c => 'gFBDCwj'.includes(c), '#8ccc63', 2, 22);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tile(x, y) === 'g') for (let k = 0; k < 3; k++) { const q = hash(x * 3 + k, y * 7), tx = x * SI + 4 + q % 24, ty = y * SI + 6 + (q >> 5) % 22; g.fillStyle = q & 64 ? '#6aa84c' : '#9bd96f'; g.beginPath(); g.moveTo(tx, ty + 3); g.lineTo(tx + 1.5, ty - 4); g.lineTo(tx + 3, ty + 3); g.lineTo(tx + 4.5, ty - 2.5); g.lineTo(tx + 6, ty + 3); g.closePath(); g.fill(); }
  // shells and pebbles on the sand
  for (let i = 0; i < 26; i++) { const x = R() * VW, y = R() * VH, c = tile(Math.floor(x / SI), Math.floor(y / SI)); if (c !== ',' && c !== '.') continue; g.fillStyle = ['#fff3e0', '#ffd1dc', '#e8d8c0'][i % 3]; g.beginPath(); g.ellipse(x, y, 3, 2.2, R() * 3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(150,110,80,.4)'; g.lineWidth = .8; g.stroke(); }
  // the jungle: big round crowns, dark under, lighter on top
  const jt = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tile(x, y) === 'j') jt.push([x, y, hash(x, y)]);
  g.fillStyle = 'rgba(20,50,20,.35)'; for (const [x, y, h] of jt) { g.beginPath(); g.arc(x * SI + 18, y * SI + 24, 22, 0, TAU); g.fill(); }
  g.fillStyle = '#2f6e36'; for (const [x, y, h] of jt) { g.beginPath(); g.arc(x * SI + 16 + (h % 7) - 3, y * SI + 14 + ((h >> 3) % 7) - 3, 21, 0, TAU); g.fill(); }
  g.fillStyle = '#3f8a43'; for (const [x, y, h] of jt) { g.beginPath(); g.arc(x * SI + 12 + (h % 5), y * SI + 10 + ((h >> 4) % 5), 14, 0, TAU); g.fill(); }
  g.fillStyle = '#58a651'; for (const [x, y, h] of jt) if (h % 3 === 0) { g.beginPath(); g.arc(x * SI + 10 + (h % 7), y * SI + 8, 6, 0, TAU); g.fill(); }
  for (const [x, y, h] of jt) if (h % 6 === 0) { g.fillStyle = ['#ff8fb8', '#ffd25a', '#ff7a5a'][h % 3]; g.beginPath(); g.arc(x * SI + 8 + h % 16, y * SI + 18 + (h >> 5) % 10, 2.6, 0, TAU); g.fill(); }
  // things that stay put: the spring, tide pools, rock piles, dead wood, boulders, the fire pit
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = tile(x, y), px = x * SI, py = y * SI, cx = px + 16, cy = py + 16;
    if (c === 'w') { g.fillStyle = '#7a7a86'; g.beginPath(); g.ellipse(cx, cy + 1, 17, 15, 0, 0, TAU); g.fill(); g.fillStyle = '#4fb6e0'; g.beginPath(); g.ellipse(cx, cy, 13, 11, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx - 4, cy - 4, 5, 2.5, -.4, 0, TAU); g.fill(); }
    else if (c === 'X') { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx + 2, cy + 8, 15, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#8c8892'; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill(); g.fillStyle = '#a8a4ae'; g.beginPath(); g.arc(cx - 3, cy - 3, 9, 0, TAU); g.fill(); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = tile(x, y), px = x * SI, py = y * SI, cx = px + 16, cy = py + 16;
    if (c === 'R') { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx + 2, cy + 9, 15, 6, 0, 0, TAU); g.fill(); for (const [ox, oy, r, col] of [[-7, 4, 8, '#8a8690'], [6, 5, 8, '#9c98a2'], [0, -4, 9, '#aeaab4'], [-4, -2, 4, '#c4c0ca']]) { g.fillStyle = col; g.beginPath(); g.arc(cx + ox, cy + oy, r, 0, TAU); g.fill(); } }
    else if (c === 'D') { g.save(); g.translate(cx, cy); g.rotate(-.5); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-14, 4, 28, 6); g.fillStyle = '#7a5a3a'; rr(g, -14, -4, 28, 9, 4); g.fill(); g.fillStyle = '#9a7650'; g.fillRect(-12, -3, 24, 2); g.strokeStyle = '#7a5a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, -2); g.lineTo(-9, -12); g.moveTo(6, -2); g.lineTo(11, -10); g.stroke(); g.restore(); }
    else if (c === 'C') { for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; g.fillStyle = k % 2 ? '#8a8690' : '#a09ca6'; g.beginPath(); g.arc(cx + Math.cos(a) * 13, cy + Math.sin(a) * 11, 5, 0, TAU); g.fill(); } g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(cx, cy, 9, 7, 0, 0, TAU); g.fill(); }
  }
  // tide pools: a ring of wet stones round clear water
  for (const pl of G.pools) {
    const x = pl.x0, y = pl.y0, w = pl.x1 - pl.x0, h = pl.y1 - pl.y0;
    g.fillStyle = '#8a8478'; rr(g, x - 5, y - 5, w + 10, h + 10, 14); g.fill();
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, q = hash(k, x | 0); g.fillStyle = q & 1 ? '#9c968a' : '#7a7468'; g.beginPath(); g.arc(x + w / 2 + Math.cos(a) * (w / 2 + 2), y + h / 2 + Math.sin(a) * (h / 2 + 2), 4 + q % 3, 0, TAU); g.fill(); }
    const wg = g.createLinearGradient(0, y, 0, y + h); wg.addColorStop(0, '#4fb6e0'); wg.addColorStop(1, '#2f8fbf'); g.fillStyle = wg; rr(g, x + 1, y + 1, w - 2, h - 2, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x + w * .35, y + h * .25, w * .2, 3, -.2, 0, TAU); g.fill();
  }
  // where the SOS goes: the letters scratched faintly in the sand
  G.pads.forEach((pd, i) => { g.strokeStyle = 'rgba(140,100,60,.35)'; g.lineWidth = 3; g.setLineDash([4, 5]); isleLetter(g, pd, i, null); g.setLineDash([]); });
}
// the shape of each letter of the SOS (pad i: S, O, S), as a path or as the spots for its rocks
function isleLetterPts(pd, i, n) {
  const cx = (pd.x0 + pd.x1) / 2, cy = (pd.y0 + pd.y1) / 2, w = (pd.x1 - pd.x0) * .3, h = (pd.y1 - pd.y0) * .4, h2 = h / 2, pts = [];
  for (let k = 0; k < n; k++) {
    const u = n === 1 ? .5 : k / (n - 1);
    if (i === 1) { const a = -Math.PI / 2 + u * Math.PI * 2 * (n - 1) / n; pts.push([cx + Math.cos(a) * w, cy + Math.sin(a) * h]); }
    else if (u < .5) { const a = -Math.PI / 6 - u * 2 * (Math.PI * 4 / 3); pts.push([cx + Math.cos(a) * w, cy - h2 + Math.sin(a) * h2]); }
    else { const a = -Math.PI / 2 + (u - .5) * 2 * (Math.PI * 4 / 3); pts.push([cx + Math.cos(a) * w, cy + h2 + Math.sin(a) * h2]); }
  }
  return pts;
}
function isleLetter(g, pd, i) { const pts = isleLetterPts(pd, i, 24); g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); if (i === 1) g.closePath(); g.stroke(); }

/* ---------- sprites ---------- */
function isleItem(g, k, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (k === 'coco') { g.fillStyle = '#6b4226'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a5a34'; g.beginPath(); g.arc(-2, -2, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a2214'; for (const [a, b] of [[-2, 2], [1, 3], [2, 0]]) { g.beginPath(); g.arc(a, b, .9, 0, Math.PI * 2); g.fill(); } }
  else if (k === 'banana') { g.strokeStyle = '#d9a520'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, -6, 9, Math.PI * .2, Math.PI * .8); g.stroke(); g.strokeStyle = '#ffe066'; g.lineWidth = 4; g.stroke(); g.lineCap = 'butt'; g.fillStyle = '#5a3a1a'; g.fillRect(-8, -1, 3, 3); }
  else if (k === 'fish' || k === 'cooked') { g.fillStyle = k === 'fish' ? '#8fc7e0' : '#c98a4a'; g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(7, 0); g.lineTo(13, -5); g.lineTo(13, 5); g.closePath(); g.fill(); g.fillStyle = '#1a1530'; g.beginPath(); g.arc(-5, -1, 1.2, 0, Math.PI * 2); g.fill(); if (k === 'cooked') { g.strokeStyle = '#7a4a24'; g.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 3 - 1, -4); g.lineTo(i * 3 + 1, 4); g.stroke(); } } else { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-4, -3, 6, 1.5); } }
  else if (k === 'wood') { g.rotate(-.4); g.fillStyle = '#7a5a3a'; rr(g, -11, -3.5, 22, 7, 3); g.fill(); g.fillStyle = '#c9a070'; g.beginPath(); g.ellipse(11, 0, 2.5, 3.5, 0, 0, Math.PI * 2); g.fill(); }
  else if (k === 'rock') { g.fillStyle = '#8a8690'; g.beginPath(); g.ellipse(0, 1, 8, 6.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b0acb6'; g.beginPath(); g.ellipse(-2, -1, 4, 3, 0, 0, Math.PI * 2); g.fill(); }
  else if (k === 'flower') { g.strokeStyle = '#3f8f4a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, 9); g.stroke(); g.fillStyle = '#ff8fb8'; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(Math.cos(a) * 3.4, Math.sin(a) * 3.4 - 1, 2.6, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(0, -1, 1.8, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function islePalm(g, x, y, cocos, wob, t) {
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 6, y + 10, 24, 11, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a6440'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
  const sway = Math.sin(t * 1.3 + x) * .05 + Math.sin(t * 30) * wob * .25;
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + sway + .3, L = 26 + (k % 2) * 4;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = k % 2 ? '#3f9a4a' : '#4fae55'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -9, L, 0); g.quadraticCurveTo(L * .5, 7, 0, 0); g.fill();
    g.strokeStyle = 'rgba(30,80,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 0); g.lineTo(L - 3, 0); g.stroke();
    g.restore();
  }
  for (let k = 0; k < cocos; k++) { const a = k * 2.4 + 1; isleItem(g, 'coco', x + Math.cos(a) * 5, y + Math.sin(a) * 5, .85); }
}

/* ---------- each frame ---------- */
function isleRender() {
  const g = ctx, st = SM.st, G = st.G, def = G.def, t = S.time;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 7 * S.shake;
  g.save(); g.translate(ox, 0);
  stamp(g, 'isleGround', def.name, 0, 0, VW, VH, q => isleGround(q, G), true);
  // the sea moving: glints, and foam along the shore
  for (let i = 0; i < 26; i++) { const x = (i * 211 + t * 9) % (VW + 40) - 20, y = (i * 97) % VH, a = .25 + .2 * Math.sin(t * 1.5 + i); if (Isle.tileAt(G, Math.floor(x / SI), Math.floor(y / SI)) !== '~') continue; g.strokeStyle = `rgba(255,255,255,${a * .5})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 3, x + 16, y); g.stroke(); }
  // the tide: the wet sand under water
  if (st.tideK > .02) { g.fillStyle = `rgba(70,170,210,${.55 * st.tideK})`; for (let y = 0; y < Isle.ROWS; y++) for (let x = 0; x < Isle.COLS; x++) if (G.grid[y][x] === '.') g.fillRect(x * SI, y * SI, SI, SI); }
  // tide pools with their fish
  for (const f of G.fish) { g.fillStyle = 'rgba(20,40,80,.55)'; g.beginPath(); g.ellipse(f.x, f.y, 6, 3, Math.sin(t * 3 + f.x) * .5, 0, Math.PI * 2); g.fill(); }
  // the SOS: the rocks on it so far
  const need = Isle.sosNeed(G);
  G.pads.forEach((pd, i) => { for (const [x, y] of isleLetterPts(pd, i, need).slice(0, pd.n)) isleItem(g, 'rock', x, y, 1.1); if (pd.n >= need) { g.fillStyle = 'rgba(255,240,180,.25)'; g.beginPath(); g.ellipse((pd.x0 + pd.x1) / 2, (pd.y0 + pd.y1) / 2, 30, 26, 0, 0, Math.PI * 2); g.fill(); } });
  // flowers, banana bushes
  for (const f of G.flowers) { const x = (f.tx + .5) * SI, y = (f.ty + .5) * SI; g.fillStyle = '#4f9a4a'; g.beginPath(); g.arc(x, y + 3, 9, 0, Math.PI * 2); g.fill(); if (f.has) { isleItem(g, 'flower', x - 5, y - 2, .9); isleItem(g, 'flower', x + 5, y + 1, .8); } }
  for (const b of G.bushes) {
    const x = (b.tx + .5) * SI, y = (b.ty + .5) * SI;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x + 3, y + 10, 18, 7, 0, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .4; g.save(); g.translate(x, y); g.rotate(a + Math.sin(t + k) * .04); g.fillStyle = k % 2 ? '#3f9a4a' : '#56b25a'; g.beginPath(); g.ellipse(11, 0, 12, 6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    for (let k = 0; k < b.fruit; k++) isleItem(g, 'banana', x - 4 + k * 8, y + 4, .8);
  }
  // things lying about
  for (const it of G.items) isleItem(g, it.k, it.x, it.y);
  // crabs
  for (const c of G.crabs) {
    const walk = Math.sin(t * 18 + c.x) * (Math.abs(c.vx) > 1 ? 2 : 0), sn = Math.sin(t * 6 + c.y) > .7 ? 2 : 0;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(c.x + 1, c.y + 6, 10, 4, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c0392b'; g.lineWidth = 1.6; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(c.x + s * 6, c.y + k * 2 - 1); g.lineTo(c.x + s * 11, c.y + k * 3 + (k % 2 ? walk : -walk)); g.stroke(); }
    g.fillStyle = '#e74c3c'; g.beginPath(); g.ellipse(c.x, c.y, 8, 6, 0, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(c.x + s * 9, c.y - 6 - sn, 3.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(c.x + s * 2.5, c.y - 5, 1.8, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#1a1530'; for (const s of [-1, 1]) { g.beginPath(); g.arc(c.x + s * 2.5, c.y - 5, .9, 0, Math.PI * 2); g.fill(); }
  }
  // the fire
  const f = G.fire;
  if (f.lit) {
    glow(g, '255,170,80', f.x, f.y, 46 + Math.sin(t * 9) * 3, .45);
    const k = Math.min(1.3, .6 + f.fuel / 70);
    for (let i = 0; i < 3; i++) { const fx = f.x + (i - 1) * 6, h = (14 + i % 2 * 6) * k * (1 + .12 * Math.sin(t * 15 + i * 2)); g.fillStyle = i === 1 ? '#ff7a2a' : '#ff9a3a'; g.beginPath(); g.moveTo(fx - 6, f.y + 2); g.quadraticCurveTo(fx - 5, f.y - h * .6, fx + Math.sin(t * 11 + i) * 2, f.y - h); g.quadraticCurveTo(fx + 5, f.y - h * .6, fx + 6, f.y + 2); g.closePath(); g.fill(); }
    g.fillStyle = '#ffd25a'; g.beginPath(); g.moveTo(f.x - 4, f.y + 2); g.quadraticCurveTo(f.x - 3, f.y - 8 * k, f.x, f.y - 12 * k); g.quadraticCurveTo(f.x + 3, f.y - 8 * k, f.x + 4, f.y + 2); g.fill();
  } else if (f.fuel > 0) { for (let k = 0; k < Math.min(5, Math.ceil(f.fuel / 20)); k++) { g.save(); g.translate(f.x, f.y); g.rotate(k * 1.1); g.fillStyle = '#7a5a3a'; rr(g, -9, -2, 18, 4, 2); g.fill(); g.restore(); } }
  if (!f.lit && f.prog > 0) { panel(g, f.x - 26, f.y - 38, 52, 10, 5, .85); rr(g, f.x - 24, f.y - 36, Math.max(4, 48 * Math.min(1, f.prog / 100)), 6, 3); g.fillStyle = '#ffb35a'; g.fill(); }
  // palms (they sway; one just shaken shakes)
  for (const pm of G.palms) islePalm(g, (pm.tx + .5) * SI, (pm.ty + .5) * SI, pm.cocos, st.shakeT[pm.tx + ',' + pm.ty] || (pm.shakes ? .15 : 0), t);
  // the two of them
  const ids = ['pink', 'mint'].sort((a, b) => st.disp[a].y - st.disp[b].y);
  for (const id of ids) isleHero(g, G, id, st.disp[id].x, st.disp[id].y, t);
  // a monkey
  if (G.monkey) {
    const m = G.monkey, bob = Math.abs(Math.sin(t * 14)) * 3;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(m.x, m.y + 9, 11, 4, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a4a28'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(m.x + 6, m.y + 2); g.quadraticCurveTo(m.x + 18, m.y - 2, m.x + 14, m.y - 12 + Math.sin(t * 8) * 3); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(m.x, m.y - bob, 9, 10, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(m.x, m.y - 12 - bob, 8, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#8a5a34'; g.beginPath(); g.arc(m.x + s * 8, m.y - 14 - bob, 3.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8b890'; g.beginPath(); g.arc(m.x + s * 8, m.y - 14 - bob, 1.8, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e8b890'; g.beginPath(); g.ellipse(m.x, m.y - 10 - bob, 5.5, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1530'; for (const s of [-1, 1]) { g.beginPath(); g.arc(m.x + s * 2.4, m.y - 12 - bob, 1.2, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(m.x, m.y - 8.5 - bob, 1.6, 0, Math.PI); g.stroke();
    if (m.item) isleItem(g, m.item, m.x, m.y - 26 - bob, .9);
    g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#ffd27a'; g.fillText(m.st === 'in' ? 'อู๊กๆ' : m.item ? 'ฮิๆ' : 'เจี๊ยก!', m.x, m.y - 30 - (m.item ? 12 : 0) - bob);
  }
  // coconuts coming down: a shadow growing where it will land
  for (const c of G.falls) {
    const k = 1 - Math.max(0, c.t) / Isle.FALL_T;
    g.fillStyle = `rgba(0,0,0,${.15 + .3 * k})`; g.beginPath(); g.ellipse(c.x, c.y + 4, 4 + 8 * k, 2 + 4 * k, 0, 0, Math.PI * 2); g.fill();
    isleItem(g, 'coco', c.x, c.y - 70 * (1 - k * k), 1);
    if (c.t < Isle.CATCH_W + .1) { g.strokeStyle = `rgba(255,207,90,${.8})`; g.lineWidth = 2; g.beginPath(); g.arc(c.x, c.y + 4, Isle.BONK_R + 4, 0, Math.PI * 2); g.stroke(); }
  }
  // smoke and puffs
  for (const p of st.puffs) { g.fillStyle = p.green ? `rgba(160,200,90,${p.life * .4})` : `rgba(220,220,230,${Math.min(.5, p.life * .35)})`; g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill(); }
  // the ship, out at sea
  if (G.ship) {
    const x = G.ship.x, y = VH - 50; g.save(); g.translate(x, y); g.scale(.85, .85); g.translate(-x, -y);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 70, y + 10, 50, 2);
    g.fillStyle = '#f5f0e6'; g.beginPath(); g.moveTo(x - 46, y - 2); g.lineTo(x + 50, y - 2); g.lineTo(x + 38, y + 12); g.lineTo(x - 40, y + 12); g.closePath(); g.fill();
    g.fillStyle = '#c94a4a'; g.fillRect(x - 40, y + 6, 78, 4);
    g.fillStyle = '#fff'; rr(g, x - 20, y - 16, 40, 14, 3); g.fill(); g.fillStyle = '#4a6a9a'; for (let i = 0; i < 4; i++) g.fillRect(x - 16 + i * 9, y - 12, 5, 5);
    g.fillStyle = '#e8574f'; g.fillRect(x + 4, y - 28, 9, 12); g.fillStyle = 'rgba(200,200,210,.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 2 - i * 9 + Math.sin(t * 2 + i), y - 34 - i * 6, 5 + i * 2, 0, Math.PI * 2); g.fill(); } g.restore();
  }
  // rain
  if (st.rainK > .02) { g.strokeStyle = `rgba(200,220,255,${.35 * st.rainK})`; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 90; i++) { const x = (i * 97 + t * 60) % (VW + 40) - 20, y = (i * 53 + t * 520) % (VH + 40) - 20; g.moveTo(x, y); g.lineTo(x - 4, y + 12); } g.stroke(); g.fillStyle = `rgba(40,50,80,${.18 * st.rainK})`; g.fillRect(0, 0, VW, VH); }
  g.restore();
  // dusk and night: darker, a pool of light round the fire (drawn small and stretched: soft and cheap)
  const c = Isle.clock(G), dusk = Math.max(0, Math.min(1, (c.t - (c.dayLen - 20)) / 20)) * (c.night ? 0 : 1);
  if (dusk > 0) { g.fillStyle = `rgba(255,140,80,${.12 * dusk})`; g.fillRect(0, 0, VW, VH); }
  if (st.night > .02) isleNight(g, G, st.night, t);
  drawParts(g);
  xDrawFloats(g, SM);
  isleHud(g, G);
  xCountdown(g, G, Isle.START);
  xBannerDraw(g, G, Isle.START, def.name, 'อยู่ให้รอดสามวัน กิน ดื่ม อยู่ข้างกองไฟตอนกลางคืน อย่าทะเลาะกัน วันสุดท้ายเรียง SOS แล้วจุดไฟรอเรือ');
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
const ISLE_NIGHT = { cv: null, g: null };
function isleNight(g, G, k, t) {
  if (!ISLE_NIGHT.cv) { ISLE_NIGHT.cv = document.createElement('canvas'); ISLE_NIGHT.cv.width = 192; ISLE_NIGHT.cv.height = 109; ISLE_NIGHT.g = ISLE_NIGHT.cv.getContext('2d'); }
  const q = ISLE_NIGHT.g, s = 192 / VW;
  q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, 192, 109); q.fillStyle = `rgba(12,16,48,${.72 * k})`; q.fillRect(0, 0, 192, 109);
  q.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a) => { const gr = q.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(x * s - r * s, y * s - r * s, r * s * 2, r * s * 2); };
  if (G.fire.lit) light(G.fire.x, G.fire.y, 150 + Math.sin(t * 9) * 6, .95);
  for (const id of ['pink', 'mint']) light(G.p[id].x, G.p[id].y, 55, .55);
  q.globalCompositeOperation = 'source-over';
  g.save(); g.imageSmoothingEnabled = true; g.drawImage(ISLE_NIGHT.cv, 0, 0, VW, VH); g.restore();
  // stars over the sea
  g.fillStyle = `rgba(255,250,220,${.5 * k})`; for (let i = 0; i < 24; i++) { const x = (i * 173 + 37) % VW, y = (i * 61) % 90 + 4; g.globalAlpha = k * (.4 + .4 * Math.sin(t * 2 + i)); twinkle(g, x, y, 2.5); } g.globalAlpha = 1;
}
function isleHero(g, G, id, x, y, t) {
  const st = SM.st, p = G.p[id], pink = id === 'pink', col = pink ? C.pink : C.mint, dark = pink ? C.pinkD : C.mintD;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2); g.fill();
  if (p.st === 'down') {
    g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + 4, 17, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + 2, 16, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 1.6; for (const s of [-1, 1]) { const ex = x + s * 5; g.beginPath(); g.moveTo(ex - 2.4, y); g.lineTo(ex + 2.4, y + 3.6); g.moveTo(ex + 2.4, y); g.lineTo(ex - 2.4, y + 3.6); g.stroke(); }
    const by = y - 30 + Math.sin(t * 4) * 2, txt = p.why === 'water' ? 'น้ำ...' : p.why === 'cold' ? 'หนาว...' : 'หิว...';
    g.font = `600 12px ${FONT}`; const tw = g.measureText(txt).width + 16; rr(g, x - tw / 2, by - 12, tw, 20, 10); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, by - 1); g.textBaseline = 'alphabetic';
    const left = Math.max(0, 1 - p.dt / Isle.DOWN_T);
    g.strokeStyle = 'rgba(21,18,43,.55)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 2, 24, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = left < .3 ? '#ff6b6b' : 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y + 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke();
    if (p.rv > 0) { g.strokeStyle = '#9be07a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.rv / Isle.REVIVE_T)); g.stroke(); }
    return;
  }
  const w = st.walk[id], bob = p.mv || p.panic > 0 ? Math.abs(Math.sin(w)) * 2.2 : 0, step = p.mv ? Math.sin(w) * 3 : 0;
  const shiver = Isle.night(G) && p.warm < 40 && !Isle.nearFire(G, p) ? Math.sin(t * 40) * 1.2 : 0, cx = x + shiver;
  const fx = p.sulk ? 0 : p.fx, fy = p.sulk ? -1 : p.fy;
  g.fillStyle = dark; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 6, y + 8 + s * step * .6, 4.2, 3, 0, 0, Math.PI * 2); g.fill(); }
  if (p.inv > 0 && p.panic <= 0 && Math.floor(t * 12) % 2) g.globalAlpha = .55;
  roundBody(g, cx, y - 3 - bob, 13, id, false, p.mv ? w : 0);
  if (p.sick > 0) { g.fillStyle = 'rgba(150,200,80,.35)'; g.beginPath(); g.arc(cx, y - 3 - bob, 13, 0, Math.PI * 2); g.fill(); }
  if (p.wet > 0) { g.fillStyle = 'rgba(140,200,255,.8)'; for (let k = 0; k < 2; k++) { const u = (t * 1.6 + k / 2) % 1; g.beginPath(); g.arc(cx - 8 + k * 16, y - 10 + u * 14, 1.6, 0, Math.PI * 2); g.fill(); } }
  if (p.singe > 0) { g.fillStyle = '#2a2420'; for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; g.beginPath(); g.arc(cx + Math.cos(a) * 10, y - 12 - bob + Math.sin(a) * 6, 5, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(200,200,200,.5)'; g.beginPath(); g.arc(cx + 4, y - 26 - bob - (t * 10 % 8), 3, 0, Math.PI * 2); g.fill(); }
  else if (pink) cuteBow(g, cx + 5, y - 16 - bob, .95); else cuteSprout(g, cx, y - 15 - bob, 1.05, t);
  if (p.sulk) {
    // sulking: turned away, arms crossed, a little storm cloud
    g.fillStyle = dark; rr(g, cx - 9, y - 4 - bob, 18, 5, 2.5); g.fill();
    g.fillStyle = '#6a6a80'; for (const [a, b, r] of [[-7, -36, 6], [0, -39, 8], [8, -36, 6]]) { g.beginPath(); g.arc(cx + a, y + b - bob, r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#ffe066'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx + 1, y - 30); g.lineTo(cx - 2, y - 24); g.lineTo(cx + 2, y - 24); g.lineTo(cx - 1, y - 18); g.stroke();
  } else {
    const mood = p.stun > 0 ? 'sleep' : p.panic > 0 ? 'o' : p.sick > 0 ? 'sad' : (Isle.night(G) && Isle.nearFire(G, p) && Isle.nearFire(G, G.p[pink ? 'mint' : 'pink'])) ? 'happy' : '';
    cuteFace(g, cx + fx * 3.5, y - 5 - bob + Math.max(-1, fy) * 1.5, fx, t, pink, mood, .82, fy, id);
  }
  g.globalAlpha = 1;
  if (p.stun > 0) for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; g.fillStyle = C.gold; twinkle(g, cx + Math.cos(a) * 12, y - 22 + Math.sin(a) * 4, 3); }
  if (p.panic > 0) {
    // a crab hanging on behind, and a scream
    g.fillStyle = '#e74c3c'; g.beginPath(); g.ellipse(cx - p.pdx * 13, y + 2 - p.pdy * 13, 6, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.font = `400 15px ${FONT_D}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(21,18,43,.8)'; const sy = y - (p.item ? 46 : 32) - Math.sin(t * 20) * 2; g.strokeText('อ๊ากกก!', cx, sy); g.fillStyle = '#ffb3b3'; g.fillText('อ๊ากกก!', cx, sy);
  }
  if (p.cook > 0) { g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, y - 4); g.lineTo(G.fire.x, G.fire.y - 6); g.stroke(); isleItem(g, 'fish', G.fire.x, G.fire.y - 8, .8); panel(g, cx - 18, y - 34, 36, 8, 4, .85); rr(g, cx - 16, y - 32, 32 * (1 - p.cook / Isle.COOK_T), 4, 2); g.fillStyle = '#ffb35a'; g.fill(); }
  else if (p.item) isleItem(g, p.item, cx, y - 26 - bob, .95);
  if (G.t < Isle.START + 3) { g.globalAlpha = Math.min(1, (Isle.START + 3 - G.t) * 1.5); nameTag(g, S.names[id], x, y - 32 - wardLift(id), col); g.globalAlpha = 1; }
}

/* ---------- the boxes: the day and the clock, hearts, love, how each of you is ---------- */
function isleHud(g, G) {
  const c = Isle.clock(G), st = SM.st;
  // the day: a sun (or a moon) going across, and what is coming
  panel(g, 8, 8, 236, 58, 12, .82);
  g.textAlign = 'left'; g.font = `400 18px ${FONT_D}`; g.fillStyle = C.paper; g.fillText(`วันที่ ${th(c.day)}/${th(c.days)}`, 18, 32);
  const u = c.t / c.len, bx = 120, bw = 112;
  rr(g, bx, 22, bw, 6, 3); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  rr(g, bx, 22, bw * c.dayLen / c.len, 6, 3); g.fillStyle = 'rgba(255,207,90,.4)'; g.fill();
  g.fillStyle = c.night ? '#e8e4ff' : C.gold; g.beginPath(); g.arc(bx + bw * u, 25, 6, 0, Math.PI * 2); g.fill();
  if (c.night) { g.fillStyle = '#2a2350'; g.beginPath(); g.arc(bx + bw * u + 3, 23, 5, 0, Math.PI * 2); g.fill(); }
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef';
  const last = Isle.lastDay(G), ships = G.def.ships || [50, 95], nx = ships[G.shipN];
  const line = G.ship ? 'เรือกำลังผ่าน!' : last && nx != null && !c.night ? `เรือจะผ่านในอีก ${th(Math.max(0, Math.ceil(nx - c.t)))} วิ` : c.night ? `เช้าในอีก ${th(Math.ceil(c.len - c.t))} วิ` : `ค่ำในอีก ${th(Math.ceil(c.dayLen - c.t))} วิ`;
  g.fillText(line, 18, 54);
  const need = Isle.sosNeed(G), got = G.pads.reduce((a, p) => a + Math.min(need, p.n), 0);
  g.textAlign = 'right'; g.fillStyle = got >= need * 3 ? C.gold : '#c9bfef'; g.fillText(`SOS ${th(got)}/${th(need * 3)}`, 234, 54);
  // hearts
  const n = Math.max(Isle.HEARTS, G.hearts), hw = 22 * n + 70, hx = VW - 8 - hw;
  panel(g, hx, 8, hw, 26, 12, .82);
  g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#c9bfef'; g.fillText('หัวใจ', hx + 10, 25);
  for (let i = 0; i < n; i++) { g.fillStyle = i < G.hearts ? C.pink : 'rgba(255,255,255,.2)'; heartPath(g, hx + 60 + i * 22, 20, 7); g.fill(); }
  // love between you
  const lw = 220, lx = VW / 2 - lw / 2;
  panel(g, lx, 8, lw, 30, 14, .82);
  g.fillStyle = G.love < Isle.SULK + 10 ? '#ff6b6b' : C.pink; heartPath(g, lx + 18, 22, 8); g.fill();
  rr(g, lx + 32, 19, lw - 44, 8, 4); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  if (G.love > 0) { rr(g, lx + 32, 19, Math.max(8, (lw - 44) * G.love / 100), 8, 4); g.fillStyle = G.love < Isle.SULK + 10 ? '#ff6b6b' : G.love > 70 ? '#ff8fb8' : '#ffb3cf'; g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(lx + 32 + (lw - 44) * Isle.SULK / 100, 17, 1.5, 12);
  if (G.sulk) { g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#ff8a8a'; g.fillText(`${S.names[G.sulk]}งอนอยู่! เอาดอกไม้หรือของกินไปง้อ`, VW / 2, 52); }
  // each one's hunger, thirst and warmth, in their corner
  for (const id of ['pink', 'mint']) {
    if (O.role && id !== O.local && false) continue;
    const p = G.p[id], w = 168, x = id === 'pink' ? 8 : VW - 8 - w, y = VH - 50;
    panel(g, x, y, w, 42, 12, .82);
    g.font = `600 10px ${FONT}`; g.textAlign = 'left'; g.fillStyle = id === 'pink' ? C.pink : C.mint; g.fillText(S.names[id], x + 10, y + 15);
    if (p.item) { g.fillStyle = '#c9bfef'; g.textAlign = 'right'; g.fillText('ถือ' + (S_ITEM[p.item] || ''), x + w - 10, y + 15); }
    [['หิว', p.food, '#ffb35a'], ['น้ำ', p.water, '#6fc8ff'], ['อุ่น', p.warm, '#ff8a8a']].forEach(([lab, v, col], i) => {
      const bx = x + 10 + i * 52; g.textAlign = 'left'; g.fillStyle = v < 25 ? '#ff6b6b' : '#c9bfef'; g.fillText(lab, bx, y + 33);
      rr(g, bx + 18, y + 26, 28, 7, 3.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
      if (v > 0) { rr(g, bx + 18, y + 26, Math.max(4, 28 * v / 100), 7, 3.5); g.fillStyle = v < 25 && Math.sin(S.time * 10) > 0 ? '#ff6b6b' : col; g.fill(); }
    });
  }
  if (S.mode !== 'play' || G.st !== 'run' || G.over) return;
  // a word over each head when it matters
  for (const id of ['pink', 'mint']) {
    const p = G.p[id], o = G.p[id === 'pink' ? 'mint' : 'pink'], d = st.disp[id]; if (p.st !== 'ok' || p.sulk) continue;
    let tip = null;
    const fall = G.falls.find(cf => Math.hypot(cf.x - p.x, cf.y - p.y) < 40);
    if (fall) tip = p.item ? 'หลบ! มะพร้าวหล่น' : 'กดรับตอนหล่นถึงพื้น!';
    else if (o.st === 'down') tip = `ไปยืนข้างๆ ${S.names[o === G.p.pink ? 'pink' : 'mint']}!`;
    else if (o.sulk) tip = p.item === 'flower' || Isle.FOOD[p.item] ? 'เอาไปให้เลย' : 'เก็บดอกไม้ไปง้อ';
    else if (G.ship && !Isle.sosDone(G)) tip = 'SOS ยังขาดหิน!';
    else if (G.ship && !G.fire.lit) tip = 'จุดไฟ! ให้เรือเห็นควัน';
    else if (p.water < 25) tip = 'คอแห้ง! ไปดื่มน้ำที่ตาน้ำ';
    else if (p.food < 25) tip = 'หิวแล้ว หาอะไรกิน';
    else if (Isle.night(G) && !Isle.nearFire(G, p) && p.warm < 50) tip = 'หนาว! ไปที่กองไฟ';
    else if (!G.fire.lit && G.fire.fuel >= Isle.LIGHT_FUEL && Isle.reach(G, p, 'C')) tip = G.fire.last === id ? 'รออีกคนถู' : 'ถูไม้สลับกัน';
    else if (!G.fire.lit && G.fire.fuel < Isle.LIGHT_FUEL && Isle.reach(G, p, 'C')) tip = 'ต้องเอาฟืนมาใส่ก่อน';
    else if (p.item === 'fish' && !G.fire.lit) tip = 'ปลาดิบ ย่างก่อนดีกว่า';
    else if (p.item === 'rock' && Isle.onPad(G, p) >= 0) tip = 'วางหิน';
    if (tip) xTip(g, id, tip, d.x, d.y - 40);
  }
}

/* ---------- The dress shop (ร้านแต่งตัว) ---------- */
Object.assign(sfx, {
  dzbell() { chime(1319, .5, .04); chime(1047, .7, .035, .18); },
  dzwant() { tone(880, .06, 'triangle', .03, 1100); },
  dzhang() { tone(1500 + Math.random() * 300, .03, 'square', .015, 1200); noise(.06, 3000, .02, 'highpass', 1); },
  dzswish() { noise(.18, 1800, .045, 'bandpass', .7, 900); },
  dzpop() { tone(500, .07, 'sine', .05, 900); },
  dznope() { tone(220, .12, 'square', .03, 200); tone(196, .16, 'square', .03, 180, .12); },
  dzclunk() { tone(140, .08, 'triangle', .06, 90); noise(.06, 900, .03, 'lowpass', 1); },
  dzsew() { for (let i = 0; i < 4; i++) noise(.025, 2600, .03, 'bandpass', 3, 0, i * .035); },
  dztangle() { tone(700, .3, 'sawtooth', .02, 200); noise(.25, 1200, .03, 'bandpass', 2, 400, .05); },
  dzsewn() { chime(1568, .3, .04); chime(2093, .35, .03, .08); },
  dzcurtain() { noise(.35, 2200, .04, 'bandpass', .6, 1200); },
  dzdrum() { for (let i = 0; i < 10; i++) noise(.04, 900, .02 + i * .004, 'bandpass', 2, 0, i * .06); },
  dzwow() { [784, 988, 1175, 1568].forEach((f, i) => chime(f, .4, .04, i * .07)); },
  dzrip() { noise(.35, 3500, .06, 'highpass', .8, 1200); tone(900, .05, 'square', .02, 0, .1); tone(1100, .05, 'square', .02, 0, .18); },
  dzdroop() { tone(700, .7, 'sine', .04, 200); },
  dzhuh() { tone(400, .12, 'triangle', .04, 600); tone(600, .2, 'triangle', .04, 300, .12); },
  dzmeh() { tone(330, .3, 'triangle', .04, 300); },
  dzhuff() { noise(.3, 500, .06, 'lowpass', 1, 200); tone(200, .3, 'sawtooth', .02, 120); },
  dzching() { noise(.05, 4000, .03, 'highpass', 1); chime(2349, .5, .04, .05); chime(3136, .6, .03, .1); },
  dzgiggle() { for (let i = 0; i < 5; i++) tone(1200 + (i % 2) * 300, .06, 'sine', .025, 1500, i * .08); },
  dzboo() { tone(160, .4, 'sawtooth', .06, 90); noise(.3, 800, .07, 'lowpass', 1); tone(1200, .15, 'square', .03, 1800, .05); },
  dzsneak() { [0, 3, 6, 3].forEach((k, i) => tone(220 * Math.pow(2, k / 12), .1, 'triangle', .03, 0, i * .18)); },
  dzalarm() { tone(880, .22, 'square', .03, 1320); tone(1320, .22, 'square', .03, 880, .25); },
  dzgotcha() { [523, 659, 784].forEach((f, i) => tone(f, .12, 'square', .03, 0, i * .07)); chime(1047, .4, .04, .2); },
  dzsad() { [392, 330, 262].forEach((f, i) => tone(f, .25, 'triangle', .04, 0, i * .2)); },
  dztruck() { tone(330, .25, 'square', .025, 320); tone(392, .35, 'square', .025, 380, .3); },
  dztick() { tone(1800, .03, 'square', .02); tone(1800, .03, 'square', .02, 0, .5); },
  dzclose() { [784, 659, 523].forEach((f, i) => chime(f, .5, .04, i * .15)); },
  dzshow() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'sawtooth', .025, 0, i * .12)); chime(1568, .8, .04, .5); },
  dzsnap() { noise(.08, 3000, .07, 'highpass', 1.2); tone(4000, .02, 'square', .015); },
  dzduo() { noise(.08, 3000, .07, 'highpass', 1.2); noise(.08, 3000, .07, 'highpass', 1.2, 0, .1); [1047, 1319, 1568].forEach((f, i) => chime(f, .4, .04, .15 + i * .06)); }
});
const OT = Shop.T;
const DZ_COL = ['#e85a5a', '#ff8fb8', '#5aa8ff', '#5cc87a', '#ffd25a', '#3a3446', '#f4f1ea'];
const DZ_COLN = ['แดง', 'ชมพู', 'ฟ้า', 'เขียว', 'เหลือง', 'ดำ', 'ขาว'];
const DZ_STY = ['ทะเล', 'งานแต่ง', 'ทำงาน', 'ปาร์ตี้', 'กีฬา', 'เดท'];
const DZ_GO = ['ไปทะเล', 'ไปงานแต่ง', 'ไปทำงาน', 'ไปปาร์ตี้', 'ไปเล่นกีฬา', 'ไปเดท'];
const DZ_PIECE = ['เสื้อ', 'ท่อนล่าง', 'รองเท้า', 'หมวก'];
const DZ_BOTTOM = ['กางเกงขาสั้น', 'กระโปรงยาว', 'กางเกงสแล็ก', 'กระโปรงสั้น', 'กางเกงวอร์ม', 'กระโปรงจีบ'];
const DZ_SKIN = ['#ffd6a5', '#cdb4db', '#a0c4ff', '#ffadad', '#bde0fe', '#fdffb6', '#caffbf', '#f1c0e8', '#e9c46a', '#b8c0ff'];
const DZ_HAIR = ['#3a2a22', '#7a4a28', '#e0b050', '#2a2440', '#c0503a', '#efe8e0'];
const dzName = n => { const g = Shop.gd(n); return (g.p === 1 ? DZ_BOTTOM[g.s] : DZ_PIECE[g.p] + DZ_STY[g.s]) + ' ' + DZ_COLN[g.c] + ' ไซซ์ ' + Shop.SIZES[g.z]; };
function dzFloat(text, x, y, col, size, life) { if (OM.st.floats.some(f => f.text === text && f.max - f.life < .8)) return; xFloat(OM, text, x, y, col, size, life); }
const OM = xMode({
  kind: 'shop', md: 'o', pres: 'ow', dk: 'o', L: OLEVELS, pk: 'o', Eng: Shop, pad: 'k', list: 'olevels', olist: 'oLevelsO', starsAll: 'oStarsAll',
  label: i => 'ร้านที่ ' + th(i + 1), word: 'เปิด', goWord: 'เปิดร้าน', fresh: 'ยังไม่เคยเปิด', nextWord: 'ร้านถัดไป', againWord: 'เปิดร้านนี้อีกวัน',
  score: G => (G.over ? G.score : Math.max(0, Math.round(G.money))),
  kWords: () => ({ act: 'หยิบ<br>ทำ', use: '' }),
  onLoad() {
    const st = OM.st, G = st.G;
    Object.assign(st, { walk: { pink: 0, mint: 0 }, stepT: { pink: 0, mint: 0 }, disp: { pink: { x: G.p.pink.x, y: G.p.pink.y }, mint: { x: G.p.mint.x, y: G.p.mint.y } },
      cwalk: {}, flash: 0, alarmT: 0, sirenT: 0, wob: {}, spark: [], fly: [], shown: -1 });
  },
  snap: G => ({ st: G.st, over: G.over, s: Object.assign({}, G.stats), mo: Math.round(G.money), it: [G.p.pink.item, G.p.mint.item], kid: !!G.kid, th: G.thief ? (G.thief.alarm ? 2 : G.thief.item >= 0 ? 1 : 0) : -1,
    cu: G.cust.map(c => c.id + ':' + c.st + ':' + (c.out ? c.out.kind : '') + ':' + (c.angry ? 1 : 0)).join(','), stun: [G.p.pink.stun > 0, G.p.mint.stun > 0], sh: G.show ? Math.floor((G.show.t - Shop.SHOW_IN) / Shop.MODEL_T) : -9 }),
  changes(p, n) {
    const ev = [];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.st === 'close' && p.st !== 'close') ev.push('close');
    if (n.st === 'show' && p.st !== 'show') ev.push('show');
    if (n.sh !== p.sh && n.sh >= 0) ev.push('walk:' + n.sh);
    const pc = {}; p.cu.split(',').filter(Boolean).forEach(s => { const [id, st, k, a] = s.split(':'); pc[id] = { st, k, a }; });
    n.cu.split(',').filter(Boolean).forEach(s => {
      const [id, st, k, a] = s.split(':'), o = pc[id];
      if (!o) { ev.push('arrive:' + id); return; }
      if (st !== o.st) {
        if (st === 'wait' || st === 'queue') ev.push('want:' + id);
        else if (st === 'try') ev.push('try:' + id);
        else if (st === 'pose') ev.push('reveal:' + id + ':' + k);
        else if (st === 'out' && a === '1' && o.st !== 'pose') ev.push('angry:' + id);
      }
    });
    const d = k => n.s[k] > p.s[k];
    if (d('served')) ev.push('pay:x:' + (n.mo - p.mo)); if (d('refused')) ev.push('refuse:x'); if (d('messes')) ev.push('messy:x'); if (d('kids')) ev.push('kidcaught:x');
    if (d('boos')) ev.push('boo:' + (n.stun[0] && !p.stun[0] ? 'pink' : 'mint')); if (d('thefts')) ev.push('escaped'); if (d('caught')) ev.push('caught:x'); if (d('tangles')) ev.push('tangle:x');
    if (d('sewn')) ev.push('sewn:x'); if (d('photos')) ev.push('flash:x:0'); if (d('duos')) ev.push('duo:x'); if (d('tidied')) ev.push('restock:x');
    if (n.kid && !p.kid) ev.push('kid'); if (n.th >= 0 && p.th < 0) ev.push('thief'); if (n.th >= 1 && p.th < 1) ev.push('steal:x'); if (n.th === 2 && p.th !== 2) ev.push('alarm');
    ['pink', 'mint'].forEach((id, i) => { if (n.it[i] !== p.it[i]) ev.push(n.it[i] >= 0 ? 'pick:' + id : 'give:' + id); });
    if (n.over && !p.over) ev.push('over');
    return ev;
  },
  events(ev) {
    const st = OM.st, G = st.G, cu = id => G.cust.find(c => c.id === +id);
    for (const e of ev) {
      const [k, a, b] = e.split(':'), p = G.p[a];
      if (k === 'go') sfx.ilaunch();
      else if (k === 'arrive') sfx.dzbell();
      else if (k === 'want') sfx.dzwant();
      else if (k === 'take' || k === 'restock' || k === 'mtake') sfx.dzhang();
      else if (k === 'pick') sfx.dzpop();
      else if (k === 'give') { sfx.dzpop(); const c = cu(b); if (c) { st.spark.push({ x: c.x, y: c.y - 10, t: .5 }); } }
      else if (k === 'drop') sfx.dzswish();
      else if (k === 'empty') { sfx.dznope(); if (p) dzFloat('หมดราว!', p.x, p.y - 34, '#ffb38a', 14); }
      else if (k === 'nope') { sfx.dznope(); const c = cu(b); if (c) dzFloat(c.st === 'queue' || c.st === 'wait' ? 'ไม่ได้ขอชิ้นนี้นะ' : 'ยังไม่ใช่ตอนนี้', c.x, c.y - 52, '#ffb38a', 14); }
      else if (k === 'wrongrack') { sfx.dznope(); if (p) dzFloat('ไม่ใช่ราวนี้', p.x, p.y - 34, '#ffb38a', 14); }
      else if (k === 'busy') { sfx.dznope(); if (p) dzFloat('จักรไม่ว่าง', p.x, p.y - 34, '#ffb38a', 14); }
      else if (k === 'nosize') { sfx.dznope(); if (p) dzFloat(b === '0' ? 'เล็กสุดแล้ว' : 'ใหญ่สุดแล้ว', p.x, p.y - 34, '#ffb38a', 14); }
      else if (k === 'put') sfx.dzclunk();
      else if (k === 'sew') sfx.dzsew();
      else if (k === 'tangle') { sfx.dztangle(); const m = G.mach[+b] || G.mach[0]; dzFloat('ด้ายพันกัน! กดสลับกันสิ', (m.tx + 1) * OT, m.ty * OT, '#ffb38a', 14, 1.4); }
      else if (k === 'sewn') { sfx.dzsewn(); const m = G.mach[+a]; if (m) { burst((m.tx + .5) * OT, (m.ty + .5) * OT, 8, C.gold, { type: 'star', size: 3, speed: 60, life: .6 }); dzFloat('เสร็จ! ไซซ์ ' + (Shop.SIZES[+b] || ''), (m.tx + 1.2) * OT, m.ty * OT, C.gold, 15); } }
      else if (k === 'try') { sfx.dzcurtain(); setTimeout(() => sfx.dzdrum(), 500); }
      else if (k === 'reveal') {
        const c = cu(a); if (!c) continue; const x = c.x, y = c.y - 46;
        if (b === 'perfect') { sfx.dzwow(); burst(x, y + 20, 18, C.gold, { type: 'star', size: 4, speed: 120, up: 80, life: 1.1, g: 40 }); dzFloat(['ปังมาก!', 'สวยเริ่ด!', 'ใช่เลย!', 'ถูกใจสุดๆ'][c.look % 4], x, y, C.gold, 20, 1.6); }
        else if (b === 'tight') { sfx.dzrip(); for (let i = 0; i < 6; i++) st.fly.push({ x, y: y + 36, vx: (Math.random() - .5) * 220, vy: -120 - Math.random() * 120, t: 1, k: 'btn' }); dzFloat('แคว่ก! คับไป!', x, y, '#ff8a8a', 19, 1.6); S.shake = Math.max(S.shake, .25); }
        else if (b === 'loose') { sfx.dzdroop(); dzFloat('ย้วยยย... ใหญ่ไป', x, y, '#bfe6ff', 18, 1.6); }
        else if (b === 'style' || b === 'nostyle') { sfx.dzhuh(); const ws = c.want.pieces.map(p => c.got[p] != null ? Shop.gd(c.got[p]).s : c.want.s).find(s => s !== c.want.s); dzFloat(ws != null ? `ชุด${DZ_STY[ws]}${DZ_GO[c.want.s]}?!` : 'ไม่ใช่สไตล์เลย', x, y, '#ffd27a', 18, 1.8); }
        else if (b === 'color') { sfx.dzmeh(); dzFloat('ขอสี' + (DZ_COLN[c.want.c] || '') + 'นะ...', x, y, '#c9bfef', 17, 1.6); }
      }
      else if (k === 'refuse') { sfx.dzhuff(); const c = cu(a); if (c) { for (let i = 0; i < 4; i++) st.fly.push({ x: c.x, y: c.y - 10, vx: (Math.random() - .5) * 260, vy: -160 - Math.random() * 80, t: 1, k: 'cloth', c: i }); dzFloat('ไม่เอาแล้ว!', c.x, c.y - 52, '#ff8a8a', 20, 1.6); } }
      else if (k === 'pay') { sfx.dzching(); const amt = +b; const [x, y] = G.tillQ[0]; if (amt) dzFloat('+฿' + th(amt), x, y - 40, C.gold, 20); burst(x, y - 20, 6, C.gold, { size: 3, speed: 60, up: 60, life: .6 }); }
      else if (k === 'angry') { sfx.dzhuff(); const c = cu(a); if (c) dzFloat('รอนานไปแล้ว! ไปละ', c.x, c.y - 50, '#ff8a8a', 16, 1.6); }
      else if (k === 'tillgone') { sfx.dzhuff(); const c = cu(a); if (c) dzFloat('ไม่มีใครคิดเงินเลย!', c.x, c.y - 50, '#ff8a8a', 16, 1.6); }
      else if (k === 'messy') { sfx.dzswish(); const c = cu(a); if (c && Math.random() < .5) dzFloat(['อันนี้ก็ไม่ใช่...', 'ตัวนี้ล่ะ? ไม่ดีกว่า', 'รื้อหน่อยนะ'][c.look % 3], c.x, c.y - 50, '#c9bfef', 13); }
      else if (k === 'kid') { sfx.dzgiggle(); dzFloat('เด็กซนวิ่งเข้าราวผ้า!', VW / 2, 120, '#ffd27a', 17, 1.6); }
      else if (k === 'hide') sfx.dzgiggle();
      else if (k === 'kidthrow') { sfx.dzswish(); const r = G.racks[+a]; if (r) { st.wob[a] = .6; dzFloat('คิกๆ', (r.tx + .5) * OT, r.ty * OT - 4, '#ffd27a', 13); } }
      else if (k === 'boo') { sfx.dzboo(); if (p) { dzFloat('แฮ่!!', p.x, p.y - 40, '#ff8a8a', 22, 1.2); S.shake = Math.max(S.shake, .3); } }
      else if (k === 'kidcaught') { sfx.dzgiggle(); const pp = G.p[a]; dzFloat('จับได้แล้ว! กลับไปหาแม่นะ', pp ? pp.x : VW / 2, pp ? pp.y - 40 : 140, C.gold, 15, 1.6); }
      else if (k === 'thief') sfx.dzsneak();
      else if (k === 'steal') { sfx.dzswish(); }
      else if (k === 'alarm') { sfx.dzalarm(); st.alarmT = 3; dzFloat('ขโมย! จับไว้!', VW / 2, 420, '#ff6b6b', 22, 1.8); }
      else if (k === 'caught') { sfx.dzgotcha(); const pp = G.p[a]; dzFloat('จับได้! ของคืนมา', pp ? pp.x : VW / 2, pp ? pp.y - 40 : 420, C.gold, 18, 1.6); }
      else if (k === 'shoo') { const pp = G.p[a]; if (pp) dzFloat('จ้องอยู่นะ...', pp.x, pp.y - 36, '#c9bfef', 14); }
      else if (k === 'escaped') { sfx.dzsad(); dzFloat('ขโมยหนีไปได้...', VW / 2, 440, '#ff8a8a', 18, 1.6); }
      else if (k === 'delivery') { sfx.dztruck(); dzFloat('ของมาส่งแล้ว ราวเติมเต็ม', VW / 2, 470, '#bfe6ff', 15, 1.4); }
      else if (k === 'last30') { sfx.dztick(); dzFloat('อีก ๓๐ วินาทีปิดร้าน', VW / 2, 120, '#ffd27a', 18, 1.8); }
      else if (k === 'close') { sfx.dzclose(); dzFloat('ปิดร้านแล้ว!', VW / 2, 200, C.gold, 26, 2); }
      else if (k === 'show') { sfx.dzshow(); }
      else if (k === 'walk') { tone(98, .15, 'sine', .06, 60); tone(98, .15, 'sine', .06, 60, .4); }
      else if (k === 'flash') { if (b === '-1') tone(300, .05, 'square', .02); else { sfx.dzsnap(); st.flash = Math.max(st.flash, .5); st.conf = st.conf || []; for (let i = 0; i < 18; i++) st.conf.push({ x: VW / 2 + (Math.random() - .5) * 300, y: -10 - Math.random() * 80, vy: 90 + Math.random() * 80, r: Math.random() * 6, ph: Math.random() * 6, c: ['#ff8fb8', '#ffd25a', '#5aa8ff', '#5cc87a', '#fff'][i % 5] }); dzFloat('+' + th(Shop.PHOTO_PTS), VW / 2 + (a === 'pink' ? -90 : 90), 300, a === 'mint' ? C.mint : C.pink, 18); } }
      else if (k === 'duo') { sfx.dzduo(); st.flash = 1; st.conf = st.conf || []; for (let i = 0; i < 40; i++) st.conf.push({ x: Math.random() * VW, y: -10 - Math.random() * 120, vy: 100 + Math.random() * 90, r: Math.random() * 6, ph: Math.random() * 6, c: ['#ff8fb8', '#ffd25a', '#5aa8ff', '#5cc87a', '#fff'][i % 5] }); dzFloat('ภาพคู่! +' + th(Shop.DUO_PTS), VW / 2, 250, C.gold, 24, 1.6); }
    }
  },
  tick() {
    const st = OM.st, G = st.G, q = id => { const k = kInput(id); return { mx: k.mx, my: k.my, act: k.act }; };
    if (!O.role) { OM.events(Shop.step(G, { pink: q('pink'), mint: q('mint') })); st.prev = OM.snap(G); return; }
    const li = q(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      OM.events(Shop.step(G, { [O.local]: li, [rid]: rq }));
      rq.act = false; st.prev = OM.snap(G);
    } else {
      if (li.act) st.n.a++;
      Shop.step(G, { [O.local]: li, [rid]: { still: true } }, true);
    }
  },
  frameExtra(dt) {
    const st = OM.st, G = st.G;
    for (const id of ['pink', 'mint']) {
      const p = G.p[id], d = st.disp[id], far = Math.hypot(p.x - d.x, p.y - d.y);
      if (!O.role || id === O.local || far > 90) { d.x = p.x; d.y = p.y; } else { const k = Math.min(1, dt * 14); d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k; }
      if (p.mv) st.walk[id] += dt * 13;
    }
    for (const c of G.cust) if (c.mv) st.cwalk[c.id] = (st.cwalk[c.id] || 0) + dt * 11;
    for (const k in st.wob) if ((st.wob[k] -= dt) <= 0) delete st.wob[k];
    st.flash = Math.max(0, st.flash - dt * 2.5);
    for (const f of st.fly) { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 420 * dt; }
    st.fly = st.fly.filter(f => f.t > 0);
    for (const s of st.spark) s.t -= dt; st.spark = st.spark.filter(s => s.t > 0);
    if (S.mode !== 'play') return;
    for (const id of ['pink', 'mint']) { const p = G.p[id]; if (p.mv) { st.stepT[id] -= dt; if (st.stepT[id] <= 0) { st.stepT[id] = .3; if (!O.role || id === O.local) noise(.035, 1400 + Math.random() * 400, .018, 'bandpass', 2); } } }
    // the alarm keeps wailing while he runs
    if (G.thief && G.thief.alarm && G.thief.st === 'run') { st.sirenT -= dt; if (st.sirenT <= 0) { st.sirenT = .5; sfx.dzalarm(); } }
  },
  result(G, s) {
    const x = G.stats, msg = s === 3 ? (x.perfect >= x.served && x.served ? 'ทุกคนแต่งตัวออกมาปังหมด ร้านนี้ดังแน่' : 'ขายดีสุดๆ ลูกค้าเดินออกไปพร้อมรอยยิ้ม')
      : s === 2 ? (x.lost ? 'ขายดีแล้ว แต่มีลูกค้ารอนานจนเดินออกไป ลองแบ่งกันทำ คนหนึ่งหยิบของ อีกคนเย็บกับคิดเงิน' : 'ขายดีแล้ว ลองแต่งให้ตรงทุกชิ้นจะได้ทิปเพิ่ม')
      : s === 1 ? 'ผ่านไปได้ ร้านถัดไปเปิดแล้ว ดูหุ่นลูกค้าให้ดี ตัวผอมไซซ์ S ตัวกลมไซซ์ L ต้องไปแก้ที่จักรก่อน'
      : 'ยังขายได้ไม่พอ ต้องได้อย่างน้อย ' + th(G.def.stars[0]) + ' บาท ลองช่วยกันเย็บ (กดสลับกันคนละที) จะเร็วกว่าเยอะ';
    return { head: 'ปิดร้านแล้ว', msg,
      stats: `<span>รายได้ <b>฿${th(G.score)}</b> ลูกค้าซื้อ <b>${th(x.served)}</b> คน ปังทั้งชุด <b>${th(x.perfect)}</b></span><span>ลูกค้าเดินออก <b>${th(x.lost + x.refused)}</b> ขโมยหนีได้ <b>${th(x.thefts)}</b> จับขโมย <b>${th(x.caught)}</b> จับเด็กซน <b>${th(x.kids)}</b></span><span>เย็บแก้ไซซ์ <b>${th(x.sewn)}</b> ด้ายพัน <b>${th(x.tangles)}</b> รูปแฟชั่นโชว์ <b>${th(x.photos)}</b> ภาพคู่ <b>${th(x.duos)}</b></span>` };
  },
  encode() { const st = OM.st; return O.role === 'host' ? Shop.encode(st.G) : Shop.guestMsg(st.G, O.local, st.lastInp, st.n.a); },
  hostHears(m) { Shop.hostHears(OM.st.G, O.local === 'pink' ? 'mint' : 'pink', m, OM.st.remote); },
  guestHears(m) { Shop.apply(OM.st.G, m, O.local); },
  fresher: () => ({ seen: -1, mx: 0, my: 0, act: false }),
  render: shopRender
});

/* ---------- colour helpers ---------- */
const dzHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function dzMix(a, b, t) { const p = dzHex(a), q = dzHex(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const dzLite = c => dzMix(c, '#ffffff', .38), dzDark = c => (c === '#f4f1ea' ? '#b9b2c6' : dzMix(c, '#15122b', .48));
// each occasion's own colour (tags, bubbles) and its little picture
const DZ_OCC = ['#3fb6e0', '#d9b25a', '#5468a8', '#cf4fae', '#f2862f', '#f46f99'];
function dzIcon(g, s, x, y, k = 1, ink = '#fff') {
  g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 1.4;
  if (s === 0) { g.beginPath(); g.arc(0, 0, 6, Math.PI, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 7); g.quadraticCurveTo(0, 8.5, -2, 8); g.stroke(); }
  else if (s === 1) { g.lineWidth = 1.3; g.beginPath(); g.arc(-2.2, 2, 3.6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(2.2, 2, 3.6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-2.2, -3.6); g.lineTo(-.6, -5.8); g.lineTo(-2.2, -7.4); g.lineTo(-3.8, -5.8); g.closePath(); g.fill(); }
  else if (s === 2) { rr(g, -6, -3, 12, 9, 2); g.fill(); g.beginPath(); g.moveTo(-2.5, -3); g.lineTo(-2.5, -5.5); g.lineTo(2.5, -5.5); g.lineTo(2.5, -3); g.stroke(); }
  else if (s === 3) { g.beginPath(); g.ellipse(0, -2, 4.6, 5.6, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(0, 3.6); g.quadraticCurveTo(2, 6, 0, 8.5); g.stroke(); }
  else if (s === 4) { g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(0, -3, 6, 0); g.moveTo(0, -6); g.quadraticCurveTo(-3, 0, 0, 6); g.stroke(); }
  else { heartPath(g, 0, 1, 6); g.fill(); }
  g.restore();
}

/* ---------- clothes ---------- */
// a garment by itself (on a hanger, on the floor, held up): centred, about 26 px across at k = 1
function dzGarment(g, n, x, y, k = 1, crumple = 0) {
  const d = Shop.gd(n), col = DZ_COL[d.c], dark = dzDark(col), lite = dzLite(col);
  g.save(); g.translate(x, y); g.scale(k, k); if (crumple) g.rotate(crumple);
  const fill = () => { const gr = g.createLinearGradient(-12, -10, 10, 12); gr.addColorStop(0, lite); gr.addColorStop(.45, col); gr.addColorStop(1, dzMix(col, '#15122b', .15)); g.fillStyle = gr; g.fill(); g.strokeStyle = dark; g.lineWidth = 1.3; g.stroke(); };
  g.lineJoin = 'round';
  if (d.p === 0) {
    g.beginPath(); g.moveTo(-5, -9); g.lineTo(-11, -6.5); g.lineTo(-13.5, 0); g.lineTo(-8.5, 2.2); g.lineTo(-7.5, -1); g.lineTo(-7.5, 9); g.quadraticCurveTo(0, 10.5, 7.5, 9); g.lineTo(7.5, -1); g.lineTo(8.5, 2.2); g.lineTo(13.5, 0); g.lineTo(11, -6.5); g.lineTo(5, -9); g.quadraticCurveTo(0, -4.5, -5, -9); g.closePath(); fill();
    g.strokeStyle = 'rgba(21,18,43,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-7.5, -1); g.lineTo(-7.5, 6); g.moveTo(7.5, -1); g.lineTo(7.5, 6); g.stroke();
    dzTopDeco(g, d.s, 0, 2, 1, d.c);
  } else if (d.p === 1) {
    g.beginPath();
    if (d.s === 0) { g.moveTo(-8, -7); g.lineTo(8, -7); g.lineTo(9.5, 4.5); g.lineTo(1.5, 4.5); g.lineTo(0, .5); g.lineTo(-1.5, 4.5); g.lineTo(-9.5, 4.5); }
    else if (d.s === 1) { g.moveTo(-6, -9); g.lineTo(6, -9); g.quadraticCurveTo(9, 3, 13, 10); g.quadraticCurveTo(0, 13.5, -13, 10); g.quadraticCurveTo(-9, 3, -6, -9); }
    else if (d.s === 3) { g.moveTo(-6, -7); g.lineTo(6, -7); g.lineTo(11, 3.5); g.quadraticCurveTo(0, 6.5, -11, 3.5); }
    else if (d.s === 5) { g.moveTo(-6, -8); g.lineTo(6, -8); g.lineTo(10.5, 6.5); g.quadraticCurveTo(0, 8, -10.5, 6.5); }
    else { g.moveTo(-7, -9); g.lineTo(7, -9); g.lineTo(7.5, 10); g.lineTo(1.5, 10); g.lineTo(0, -2); g.lineTo(-1.5, 10); g.lineTo(-7.5, 10); }
    g.closePath(); fill();
    g.fillStyle = 'rgba(21,18,43,.18)'; g.fillRect(-6.5, -8.5, 13, 2.2);
    if (d.s === 4) { g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-6.5, -7); g.lineTo(-6.8, 9); g.moveTo(6.5, -7); g.lineTo(6.8, 9); g.stroke(); }
    if (d.s === 5) { g.strokeStyle = 'rgba(21,18,43,.25)'; g.lineWidth = .8; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 2.4, -6); g.lineTo(i * 3.6, 6); g.stroke(); } }
    if (d.s === 3) for (const [a, b] of [[-4, -1], [3, 0], [0, 2.5], [-6, 2], [6, 2.5]]) { g.fillStyle = 'rgba(255,255,255,.85)'; twinkle(g, a, b, 1.6); }
    if (d.s === 1) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-11, 8); g.quadraticCurveTo(0, 11, 11, 8); g.stroke(); }
  } else if (d.p === 2) {
    for (const s of [-1, 1]) dzShoe(g, d.s, s * 6, 2, s, col, dark);
  } else {
    dzHat(g, d.s, 0, 0, 1, col, dark);
  }
  if (d.z !== 1) { g.fillStyle = d.z === 0 ? '#5aa8ff' : '#ff9a3a'; g.beginPath(); g.arc(10.5, -8.5, 5.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = '#fff'; g.font = `700 8px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Shop.SIZES[d.z], 10.5, -8.1); g.textBaseline = 'alphabetic'; }
  g.restore();
}
function dzTopDeco(g, s, x, y, k, c) {
  const ink = c === 5 ? '#fff' : C.ink;
  if (s === 0) { g.fillStyle = c === 6 ? '#ff8fb8' : 'rgba(255,255,255,.85)'; for (const [a, b] of [[-4, -2], [4, 1], [-2, 5], [3, -5]]) { for (let q = 0; q < 5; q++) { const an = q * 1.2566; g.beginPath(); g.arc(x + (a + Math.cos(an) * 1.3) * k, y + (b + Math.sin(an) * 1.3) * k, .9 * k, 0, Math.PI * 2); g.fill(); } } }
  else if (s === 1) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1 * k; g.beginPath(); for (let i = -3; i <= 3; i++) g.arc(x + i * 2 * k, y - 8 * k, 1 * k, 0, Math.PI); g.stroke(); g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x, y - 3 * k, 1.4 * k, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - .4 * k, y - 3.4 * k, .5 * k, 0, Math.PI * 2); g.fill(); }
  else if (s === 2) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 4.5 * k, y - 10.5 * k); g.lineTo(x, y - 5.5 * k); g.lineTo(x + 4.5 * k, y - 10.5 * k); g.fill(); g.fillStyle = c === 0 ? '#2a4a8a' : '#c0392b'; g.beginPath(); g.moveTo(x, y - 6 * k); g.lineTo(x - 1.8 * k, y + 2 * k); g.lineTo(x, y + 4.5 * k); g.lineTo(x + 1.8 * k, y + 2 * k); g.closePath(); g.fill(); g.fillStyle = 'rgba(21,18,43,.25)'; g.fillRect(x - .4 * k, y - 4 * k, .8 * k, 7 * k); }
  else if (s === 3) { for (const [a, b] of [[-4, -3], [3, -1], [-1, 3], [4, 5], [-5, 5]]) { g.fillStyle = 'rgba(255,255,255,.9)'; twinkle(g, x + a * k, y + b * k, 1.8 * k); } }
  else if (s === 4) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 7.5 * k, y - 2 * k, 15 * k, 2.4 * k); g.fillStyle = ink; g.font = `700 ${5 * k}px ${FONT}`; g.textAlign = 'center'; g.fillText('7', x, y + 5.5 * k); }
  else if (s === 5) { g.fillStyle = c === 1 ? '#e85a5a' : '#ff8fb8'; heartPath(g, x, y + 1 * k, 3.2 * k); g.fill(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = .7 * k; g.stroke(); }
}
function dzShoe(g, s, x, y, side, col, dark) {
  g.save(); g.translate(x, y); g.scale(side, 1);
  g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = 1.1;
  if (s === 0) { g.beginPath(); g.ellipse(0, 2, 3.6, 6.2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-3, -1); g.lineTo(0, -3.4); g.lineTo(3, -1); g.stroke(); }
  else if (s === 1) { g.beginPath(); g.moveTo(-3, -4); g.lineTo(3, -4); g.lineTo(4, 4); g.lineTo(1, 4); g.lineTo(0, 8); g.lineTo(-1, 4); g.lineTo(-4, 4); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-2, -3, 1.2, 5); }
  else if (s === 3) { rr(g, -3.6, -8, 7.2, 15, 2.5); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-2, -6, 1.2, 10); }
  else if (s === 4) { rr(g, -3.6, -5, 7.2, 11, 3); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-3.6, 3.5, 7.2, 2.5); g.strokeStyle = '#fff'; g.lineWidth = .8; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-2, -3 + i * 2); g.lineTo(2, -3 + i * 2); g.stroke(); } }
  else { g.beginPath(); g.ellipse(0, 1, 3.6, 6.2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); if (s === 5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -3, 1.5, 0, Math.PI * 2); g.fill(); } else { g.fillStyle = 'rgba(21,18,43,.3)'; g.fillRect(-2.5, -2, 5, 1); } }
  g.restore();
}
function dzHat(g, s, x, y, k, col, dark) {
  g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = 1.1;
  if (s === 0) { g.beginPath(); g.ellipse(0, 3, 13.5, 4.8, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -1, 6.8, 5.8, 0, Math.PI, 0); g.fill(); g.stroke(); g.fillStyle = '#e85a5a'; g.fillRect(-6.8, 0, 13.6, 2.2); g.strokeStyle = 'rgba(160,110,40,.35)'; g.lineWidth = .7; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, 5); g.lineTo(i * 5.5, 7); g.stroke(); } }
  else if (s === 1) { for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; g.fillStyle = ['#ff8fb8', '#fff', '#ffd25a'][i % 3]; g.beginPath(); g.arc(Math.cos(a) * 9, 2 + Math.sin(a) * 4, 2.8, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,200,80,.9)'; g.beginPath(); g.arc(Math.cos(a) * 9, 2 + Math.sin(a) * 4, .9, 0, Math.PI * 2); g.fill(); } }
  else if (s === 3) { g.beginPath(); g.moveTo(-6, 4); g.lineTo(0, -11); g.lineTo(6, 4); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -11, 2.2, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(-3.5, -2); g.lineTo(3.5, -2); g.moveTo(-5, 2); g.lineTo(5, 2); g.stroke(); }
  else if (s === 4) { g.beginPath(); g.arc(0, 2, 7, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.ellipse(6, 2.5, 6, 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -4.5, 1.2, 0, Math.PI * 2); g.fill(); }
  else { g.beginPath(); g.ellipse(0, 0, 9, 4.6, -.2, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = dark; g.beginPath(); g.arc(1, -4, 1.6, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// what someone wears, drawn on a round body (r) centred at x, y; got: piece -> garment; body z for the fit
function dzWear(g, x, y, r, got, bz) {
  const fit = n => 1 + (Shop.gd(n).z - bz) * .3;
  const shaded = (col, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, dzLite(col)); gr.addColorStop(.5, col); gr.addColorStop(1, dzMix(col, '#15122b', .2)); return gr; };
  if (got[1] != null) {
    const d = Shop.gd(got[1]), f = fit(got[1]), col = DZ_COL[d.c];
    g.save(); g.translate(x, y + r * .55); g.scale(r / 13 * f, r / 13 * (f > 1 ? 1.15 : 1)); g.fillStyle = shaded(col, -12, -4, 12, 14); g.strokeStyle = dzDark(col); g.lineWidth = 1.3; g.lineJoin = 'round';
    g.beginPath();
    if (d.s === 1) { g.moveTo(-9, -4); g.lineTo(9, -4); g.quadraticCurveTo(12, 8, 15, 15); g.quadraticCurveTo(0, 18.5, -15, 15); g.quadraticCurveTo(-12, 8, -9, -4); }
    else if (d.s === 3 || d.s === 5) { g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(d.s === 3 ? 13 : 12, d.s === 3 ? 6 : 9); g.quadraticCurveTo(0, d.s === 3 ? 9 : 12, d.s === 3 ? -13 : -12, d.s === 3 ? 6 : 9); }
    else if (d.s === 0) { g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(11, 6); g.lineTo(1.5, 6); g.lineTo(0, 2); g.lineTo(-1.5, 6); g.lineTo(-11, 6); }
    else { g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(9, 13); g.lineTo(2, 13); g.lineTo(0, 3); g.lineTo(-2, 13); g.lineTo(-9, 13); }
    g.closePath(); g.fill(); g.stroke();
    if (d.s === 4) { g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-8.5, 12); g.moveTo(9, -3); g.lineTo(8.5, 12); g.stroke(); }
    if (d.s === 3) for (const [a, b] of [[-5, 0], [4, 1], [0, 4], [-8, 4], [8, 4]]) { g.fillStyle = 'rgba(255,255,255,.85)'; twinkle(g, a, b, 1.5); }
    g.restore();
  }
  if (got[2] != null) { const d = Shop.gd(got[2]), col = DZ_COL[d.c]; for (const s of [-1, 1]) { g.save(); g.translate(x + s * r * .45, y + r * 1.25); g.scale(r / 14, r / 14); dzShoe(g, d.s, 0, 0, s, col, dzDark(col)); g.restore(); } }
  if (got[0] != null) {
    const d = Shop.gd(got[0]), f = fit(got[0]), col = DZ_COL[d.c];
    g.save();
    // a top too small sits tight round the middle with a gap; too big hangs off the shoulders past the body
    g.beginPath(); g.arc(x, y, r * Math.max(1, f) + .5, 0, Math.PI * 2); g.clip();
    const top = y - r * .05, h = r * (f < 1 ? .5 : .95) * f, w = r * 2.2 * f;
    g.fillStyle = shaded(col, x - w / 2, top, x + w / 2, top + h); g.strokeStyle = dzDark(col); g.lineWidth = 1.3;
    rr(g, x - w / 2, top, w, h + (f > 1 ? r * .5 : 0), r * .25); g.fill(); g.stroke();
    // a neckline
    g.fillStyle = 'rgba(21,18,43,.15)'; g.beginPath(); g.ellipse(x, top, r * .32, r * .14, 0, 0, Math.PI); g.fill();
    if (f < 1) { g.strokeStyle = 'rgba(21,18,43,.55)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * r * .35 - 2, top + 2); g.lineTo(x + i * r * .35 + 2, top + h - 2); g.stroke(); } }
    g.restore();
    for (const s of [-1, 1]) { g.fillStyle = col; g.strokeStyle = dzDark(col); g.lineWidth = 1.1; g.beginPath(); g.ellipse(x + s * r * .98 * Math.min(1.15, f), y + r * .2, r * .28 * f, r * .22 * f, s * .5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    dzTopDeco(g, d.s, x, y + r * .3, r / 16 * f, d.c);
  }
}
// a customer (or a model): a round body of their colour, hair, a face, and whatever they have on
function dzPerson(g, look, bz, x, y, got, t, opt = {}) {
  const r = [10.5, 13, 16][bz] * (opt.k || 1), skin = DZ_SKIN[look % DZ_SKIN.length], hair = DZ_HAIR[Math.floor(look / 10) % DZ_HAIR.length], style = Math.floor(look / 60) % 5;
  const breathe = opt.still ? Math.sin(t * 2.2 + look) * .6 : 0, bob = (opt.bob || 0) + breathe, cy = y - r * .3 - bob;
  g.fillStyle = 'rgba(40,20,30,.22)'; g.beginPath(); g.ellipse(x, y + r * .95, r * 1.1, r * .4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = dzMix(skin, '#15122b', .35); for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * .45, y + r * .85 + (opt.step || 0) * s, r * .3, r * .2, 0, 0, Math.PI * 2); g.fill(); }
  const gr = g.createRadialGradient(x - r * .35, cy - r * .45, r * .1, x, cy, r * 1.05); gr.addColorStop(0, '#fff'); gr.addColorStop(.32, skin); gr.addColorStop(1, dzMix(skin, '#15122b', .18));
  g.fillStyle = gr; g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = dzMix(skin, '#15122b', .45); g.lineWidth = 1.2; g.stroke();
  if (got) dzWear(g, x, cy, r, got, bz);
  // hair
  g.fillStyle = hair;
  if (style === 1) { g.beginPath(); g.arc(x, cy - r * 1.05, r * .38, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - r * .12, cy - r * 1.15, r * .12, 0, Math.PI * 2); g.fill(); }
  else if (style === 2) { g.beginPath(); g.arc(x, cy - r * .2, r * 1.02, Math.PI * 1.1, Math.PI * 1.9); g.quadraticCurveTo(x, cy - r * .55, x - r * .9, cy - r * .6); g.fill(); }
  else if (style === 3) { for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * .18); g.beginPath(); g.arc(x + Math.cos(a) * r * .85, cy + Math.sin(a) * r * .85, r * .32, 0, Math.PI * 2); g.fill(); } }
  else if (style === 4) { g.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * .17); g.moveTo(x + Math.cos(a - .1) * r * .8, cy + Math.sin(a - .1) * r * .8); g.lineTo(x + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35); g.lineTo(x + Math.cos(a + .1) * r * .8, cy + Math.sin(a + .1) * r * .8); } g.fill(); }
  if (got && got[3] != null) { const d = Shop.gd(got[3]); dzHat(g, d.s, x, cy - r * .92, r / 13 * (1 + (d.z - bz) * .3), DZ_COL[d.c], dzDark(DZ_COL[d.c])); }
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - r * .48, cy - r * .5, r * .16, r * .24, -.6, 0, Math.PI * 2); g.fill();
  cuteFace(g, x + (opt.fx || 0) * r * .2, cy - r * .15, opt.fx || 0, t + look, look % 2 === 0, opt.mood || '', r / 15);
  if (opt.mood === 'angry') { const ax = x + r * .85, ay = cy - r * .8; g.strokeStyle = '#ff4f4f'; g.lineWidth = 1.8; g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(ax + a * 1.5, ay + b * 4); g.quadraticCurveTo(ax + a * 1.5, ay + b * 1.5, ax + a * 4, ay + b * 1.5); } g.stroke(); }
  return { r, cy };
}

/* ---------- the shop as it stands (drawn once) ---------- */
function shopGround(g, G) {
  const W = Shop.COLS, H = Shop.ROWS, tile = (x, y) => Shop.tileAt(G, x, y), TAU = Math.PI * 2, R = rng(17);
  const x0 = OT, x1 = (W - 1) * OT, y0 = 3 * OT, y1 = (H - 1) * OT;
  // the floor: honey parquet laid in chevrons
  g.fillStyle = '#c9965e'; g.fillRect(0, 0, VW, VH);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  const woods = ['#ecc896', '#e8c290', '#efcd9c', '#e5be8a', '#eac693', '#e7c38e'];
  g.lineWidth = .6; g.strokeStyle = 'rgba(140,90,50,.2)';
  for (let cx = x0 - 16, ci = 0; cx < x1 + 16; cx += 16, ci++) for (let cy = y0 - 24; cy < y1 + 16; cy += 8) {
    g.fillStyle = woods[Math.floor(R() * woods.length)]; g.beginPath();
    if (ci % 2) { g.moveTo(cx, cy); g.lineTo(cx + 16, cy + 8); g.lineTo(cx + 16, cy + 16); g.lineTo(cx, cy + 8); }
    else { g.moveTo(cx, cy + 8); g.lineTo(cx + 16, cy); g.lineTo(cx + 16, cy + 8); g.lineTo(cx, cy + 16); }
    g.closePath(); g.fill(); g.stroke();
  }
  // a sheen across the floor
  const sh = g.createLinearGradient(0, y0, 0, y1); sh.addColorStop(0, 'rgba(255,240,210,.18)'); sh.addColorStop(1, 'rgba(90,40,20,.12)'); g.fillStyle = sh; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.restore();
  // a plum carpet before the fitting rooms, a runner from the door, a round rug by the till
  const carpet = (x, y, w, h, base, edge, motif) => {
    g.fillStyle = 'rgba(40,10,30,.25)'; rr(g, x + 2, y + 3, w, h, 6); g.fill();
    g.fillStyle = base; rr(g, x, y, w, h, 6); g.fill(); g.strokeStyle = edge; g.lineWidth = 3; rr(g, x + 4, y + 4, w - 8, h - 8, 4); g.stroke();
    g.lineWidth = 1; g.strokeStyle = hexA(edge, .5); rr(g, x + 8, y + 8, w - 16, h - 16, 3); g.stroke();
    if (motif) { g.fillStyle = hexA(edge, .45); for (let yy = y + 18; yy < y + h - 12; yy += 22) for (let xx = x + 18; xx < x + w - 12; xx += 22) { g.beginPath(); g.moveTo(xx, yy - 5); g.lineTo(xx + 5, yy); g.lineTo(xx, yy + 5); g.lineTo(xx - 5, yy); g.closePath(); g.fill(); } }
  };
  // a soft runner along the fitting rooms, a patterned one from the door
  g.globalAlpha = .55; carpet(6.6 * OT, 3.15 * OT, 14.8 * OT, .95 * OT, '#e8a8c8', '#fff3f8', false); g.globalAlpha = 1;
  g.globalAlpha = .7; carpet(13.1 * OT, 11.4 * OT, 3.8 * OT, 4.6 * OT, '#c99ad8', '#fff3f8', true); g.globalAlpha = 1;
  // walls round the sides: panelled wood
  g.fillStyle = '#5a3f6a'; g.fillRect(0, y0, x0, y1 - y0); g.fillRect(x1, y0, VW - x1, y1 - y0);
  g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = y0; y < y1; y += 48) { g.fillRect(4, y + 4, x0 - 10, 40); g.fillRect(x1 + 6, y + 4, x0 - 10, 40); }
  g.fillStyle = '#e6c26a'; g.fillRect(x0 - 3, y0, 3, y1 - y0); g.fillRect(x1, y0, 3, y1 - y0);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y0, 7, y1 - y0); g.fillRect(x1 - 7, y0, 7, y1 - y0);
  // the back wall: damask paper, a gold rail, wainscoting
  const wy = 3 * OT;
  const wg = g.createLinearGradient(0, 0, 0, wy); wg.addColorStop(0, '#f7dbe7'); wg.addColorStop(1, '#f2cfdf'); g.fillStyle = wg; g.fillRect(0, 0, VW, wy);
  g.fillStyle = 'rgba(214,120,170,.18)';
  for (let y = 10; y < 66; y += 18) for (let x = (y / 18 % 2) * 12; x < VW; x += 24) { g.beginPath(); g.moveTo(x, y - 5); g.quadraticCurveTo(x + 4, y, x, y + 5); g.quadraticCurveTo(x - 4, y, x, y - 5); g.fill(); }
  g.fillStyle = '#fbeff4'; g.fillRect(0, 68, VW, wy - 68); g.strokeStyle = 'rgba(200,140,170,.45)'; g.lineWidth = 1;
  for (let x = 6; x < VW; x += 46) { rr(g, x, 73, 38, wy - 80, 3); g.stroke(); }
  g.fillStyle = '#e6c26a'; g.fillRect(0, 66, VW, 3); g.fillStyle = '#c79a4a'; g.fillRect(0, wy - 3, VW, 3);
  g.fillStyle = '#d9a8c4'; g.fillRect(0, 0, VW, 5);
  // shelves of folded clothes and bags, posters, sconces, between the rooms
  const shelf = (x, y, w) => {
    g.fillStyle = 'rgba(80,40,60,.18)'; g.fillRect(x + 2, y + 3, w, 4); g.fillStyle = '#fff5f8'; g.fillRect(x, y, w, 4); g.fillStyle = '#d9b0c8'; g.fillRect(x, y + 4, w, 2);
    for (let k = 0, xx = x + 3; xx < x + w - 10; k++) {
      if (k % 3 === 2) { const c = DZ_COL[Math.floor(R() * 5)]; g.fillStyle = c; rr(g, xx, y - 10, 10, 10, 2); g.fill(); g.strokeStyle = dzDark(c); g.lineWidth = 1; g.beginPath(); g.arc(xx + 5, y - 10, 3.2, Math.PI, 0); g.stroke(); xx += 14; continue; }
      const n = 2 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const c = DZ_COL[Math.floor(R() * 7)]; g.fillStyle = c; rr(g, xx, y - 3.5 - i * 3.5, 13, 3.6, 1.2); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(xx + 1, y - 3.5 - i * 3.5, 11, 1); }
      xx += 17;
    }
  };
  const poster = (x, y, c1, c2) => {
    g.fillStyle = '#c79a4a'; rr(g, x - 2, y - 2, 30, 38, 3); g.fill(); g.fillStyle = c1; g.fillRect(x, y, 26, 34);
    g.fillStyle = c2; g.beginPath(); g.arc(x + 13, y + 9, 4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 13, y + 12); g.lineTo(x + 20, y + 30); g.lineTo(x + 6, y + 30); g.closePath(); g.fill();
  };
  const sconce = (x, y) => { const gl = g.createRadialGradient(x, y, 1, x, y, 26); gl.addColorStop(0, 'rgba(255,230,170,.55)'); gl.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = gl; g.fillRect(x - 26, y - 26, 52, 52); g.fillStyle = '#c79a4a'; g.fillRect(x - 1, y + 2, 2, 7); g.fillStyle = '#fff3d0'; g.beginPath(); g.moveTo(x - 5, y + 3); g.lineTo(x + 5, y + 3); g.lineTo(x + 3, y - 4); g.lineTo(x - 3, y - 4); g.closePath(); g.fill(); };
  const doors = G.rooms.map(rm => rm.tx);
  const free = []; let at = 2.2; for (const dx of doors.concat([19.6])) { if (dx - 1.4 - at > 1.6) free.push([at, dx - 1.4]); at = dx + 1.4; }
  free.forEach(([a, b], i) => { const x = a * OT, w = (b - a) * OT; if (w > 70) shelf(x + 8, 40, w - 16); else if (w > 40) poster(x + w / 2 - 13, 24, ['#ffe0ec', '#e0f0ff', '#fff2cc'][i % 3], ['#d45ab0', '#5468a8', '#f2862f'][i % 3]); });
  for (const dx of doors) { sconce((dx - .9) * OT, 20); sconce((dx + 1.9) * OT, 20); }
  // the shop's sign in neon over the till side
  g.save(); const nx = 21.7 * OT; g.fillStyle = 'rgba(60,20,50,.3)'; rr(g, nx - 64, 13, 130, 52, 12); g.fill(); g.fillStyle = '#3a1e40'; rr(g, nx - 66, 10, 130, 52, 12); g.fill(); g.strokeStyle = '#c79a4a'; g.lineWidth = 2; g.stroke();
  g.font = `400 25px ${FONT_D}`; g.textAlign = 'center'; g.shadowColor = '#ff4fa0'; g.shadowBlur = 12; g.fillStyle = '#ffe0f0'; g.fillText('ร้านของเรา', nx - 1, 40); g.fillText('ร้านของเรา', nx - 1, 40); g.shadowBlur = 0;
  g.font = `600 10px ${FONT}`; g.fillStyle = '#e6c26a'; g.fillText(G.def.name, nx - 1, 55); g.restore();
  // fitting rooms: an arched booth with a lamp and a brass number (the curtains come each frame)
  G.rooms.forEach((rm, i) => {
    const cx = (rm.tx + .5) * OT, top = rm.ty * OT - 34, bot = (rm.ty + 1) * OT, w = 46;
    const gl = g.createRadialGradient(cx, top + 4, 2, cx, top + 4, 40); gl.addColorStop(0, 'rgba(255,230,170,.6)'); gl.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = gl; g.fillRect(cx - 40, top - 36, 80, 80);
    g.fillStyle = 'rgba(60,20,50,.25)'; rr(g, cx - w / 2 + 3, top + 4, w, bot - top, 10); g.fill();
    const fr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); fr.addColorStop(0, '#b8893a'); fr.addColorStop(.5, '#f2d48a'); fr.addColorStop(1, '#b8893a');
    g.fillStyle = fr; g.beginPath(); g.moveTo(cx - w / 2, bot); g.lineTo(cx - w / 2, top + 18); g.arc(cx, top + 18, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, bot); g.closePath(); g.fill();
    g.fillStyle = '#3a1e40'; g.beginPath(); g.moveTo(cx - w / 2 + 4, bot); g.lineTo(cx - w / 2 + 4, top + 18); g.arc(cx, top + 18, w / 2 - 4, Math.PI, 0); g.lineTo(cx + w / 2 - 4, bot); g.closePath(); g.fill();
    g.fillStyle = '#c79a4a'; g.beginPath(); g.arc(cx, top - 3, 8, 0, TAU); g.fill(); g.fillStyle = '#f7e2a8'; g.beginPath(); g.arc(cx, top - 3, 6, 0, TAU); g.fill();
    g.fillStyle = '#6a4a20'; g.font = `700 9px ${FONT}`; g.textAlign = 'center'; g.fillText(th(i + 1), cx, top);
  });
  // the till: a marble counter, a register, a card reader, flowers and bags
  if (G.till.length) {
    const xs = G.till.map(t => t[0]), y = G.till[0][1], tx0 = Math.min(...xs) * OT - 4, tx1 = (Math.max(...xs) + 1) * OT + 4, py = y * OT;
    g.fillStyle = 'rgba(40,10,30,.28)'; rr(g, tx0 + 4, py + 8, tx1 - tx0, OT, 8); g.fill();
    const fg = g.createLinearGradient(0, py + 8, 0, py + OT + 2); fg.addColorStop(0, '#8a5a8a'); fg.addColorStop(1, '#5a3a62'); g.fillStyle = fg; rr(g, tx0, py + 6, tx1 - tx0, OT - 2, 7); g.fill();
    g.strokeStyle = '#e6c26a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx0 + 6, py + OT - 1); g.lineTo(tx1 - 6, py + OT - 1); g.stroke();
    const mg = g.createLinearGradient(tx0, py, tx1, py + 12); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#e6e2ee'); g.fillStyle = mg; rr(g, tx0 - 2, py, tx1 - tx0 + 4, 12, 6); g.fill();
    g.strokeStyle = 'rgba(150,140,170,.4)'; g.lineWidth = .7; for (let k = 0; k < 5; k++) { g.beginPath(); const a = tx0 + R() * (tx1 - tx0); g.moveTo(a, py + 2); g.quadraticCurveTo(a + 8, py + 6, a + 16, py + 10); g.stroke(); }
    const mx = (tx0 + tx1) / 2;
    g.fillStyle = '#2e2a3e'; rr(g, mx - 12, py - 10, 24, 16, 4); g.fill(); g.fillStyle = '#7fe8c0'; rr(g, mx - 9, py - 8, 18, 6, 2); g.fill(); g.fillStyle = '#c0bcd0'; for (let i = 0; i < 4; i++) g.fillRect(mx - 9 + i * 5, py, 3.5, 3);
    g.fillStyle = '#2e2a3e'; rr(g, mx + 16, py - 4, 8, 11, 2); g.fill(); g.fillStyle = '#5aa8ff'; g.fillRect(mx + 17.5, py - 2.5, 5, 3);
    g.fillStyle = '#e0f0ff'; rr(g, tx0 + 6, py - 9, 8, 11, 3); g.fill(); for (const [a, b, c] of [[tx0 + 8, py - 12, '#ff8fb8'], [tx0 + 12, py - 13, '#ffd25a'], [tx0 + 10, py - 15, '#ff6f9c']]) { g.fillStyle = c; g.beginPath(); g.arc(a, b, 2.6, 0, TAU); g.fill(); }
    for (const [k, c] of [[0, '#ff8fb8'], [1, '#c9a0ff']]) { const bx = tx1 - 20 + k * 8; g.fillStyle = c; rr(g, bx, py - 6 + k, 9, 12, 2); g.fill(); g.strokeStyle = dzDark(c); g.lineWidth = 1.2; g.beginPath(); g.arc(bx + 4.5, py - 6 + k, 3, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#c79a4a'; rr(g, mx - 24, py + OT + 4, 48, 13, 6); g.fill(); g.fillStyle = '#fff6dc'; g.font = `700 9px ${FONT}`; g.textAlign = 'center'; g.fillText('คิดเงิน', mx, py + OT + 13.5);
  }
  // sewing machines on worktables, a plate saying which way they go
  for (const m of G.mach) {
    const px = m.tx * OT, py = m.ty * OT, cx = px + OT / 2 + 3, tone = m.dir < 0 ? '#8fd3e8' : '#ffc28a', dk = m.dir < 0 ? '#3a8aa8' : '#c0702a';
    g.fillStyle = 'rgba(40,10,30,.28)'; rr(g, px + 2, py + 6, OT + 10, OT, 5); g.fill();
    const tg = g.createLinearGradient(0, py, 0, py + OT); tg.addColorStop(0, '#c89060'); tg.addColorStop(1, '#9a6a40'); g.fillStyle = tg; rr(g, px - 2, py + 1, OT + 10, OT - 2, 5); g.fill();
    g.strokeStyle = 'rgba(255,240,210,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 1, py + 4); g.lineTo(px + OT + 5, py + 4); g.stroke();
    // a measuring tape and a pin cushion
    g.strokeStyle = '#ffe066'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 1, py + OT - 6); g.quadraticCurveTo(px + 12, py + OT - 1, px + 22, py + OT - 7); g.stroke();
    g.fillStyle = '#e85a5a'; g.beginPath(); g.arc(px + OT + 2, py + OT - 8, 3.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(px + OT + 1, py + OT - 13, 1, 4); g.fillRect(px + OT + 3, py + OT - 12, 1, 3);
    // the machine: a base, an arm, a head with a wheel, two spools
    g.fillStyle = dk; rr(g, cx - 12, py + 15, 24, 6, 2); g.fill();
    g.fillStyle = tone; rr(g, cx - 11, py + 4, 22, 9, 4); g.fill(); g.fillRect(cx + 5, py + 6, 6, 12); rr(g, cx - 12, py + 13, 24, 4, 1.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(cx - 9, py + 5, 12, 2);
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(cx + 12, py + 9, 3.5, 0, TAU); g.fill(); g.strokeStyle = dk; g.lineWidth = 1; g.stroke();
    for (const [sx, sc] of [[cx - 4, '#ff8fb8'], [cx + 2, '#5cc87a']]) { g.fillStyle = sc; rr(g, sx - 1.5, py + 0, 3, 4.5, 1); g.fill(); }
    g.fillStyle = '#c0c0d0'; g.fillRect(cx - 8, py + 13, 1.5, 4);
    // the plate
    const lx = px + OT + 26, ly = py + OT / 2 + 3;
    g.fillStyle = 'rgba(40,10,30,.25)'; rr(g, lx - 20, ly - 8, 42, 17, 8); g.fill();
    g.fillStyle = m.dir < 0 ? '#2f7fae' : '#c0702a'; rr(g, lx - 22, ly - 10, 42, 17, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#fff'; g.font = `700 9px ${FONT}`; g.textAlign = 'left'; g.fillText(m.dir < 0 ? 'ย่อ → S' : 'ขยาย → L', lx - 17, ly + 2);
  }
  // racks: chrome rails on wheels where they hang clothes; little display shelves for shoes and hats
  const rackAt = (x, y) => G.racks.find(r => r.tx === x && r.ty === y);
  for (const rk of G.racks) {
    const px = rk.tx * OT, py = rk.ty * OT, hang = rk.p < 2, L = rackAt(rk.tx - 1, rk.ty), Rt = rackAt(rk.tx + 1, rk.ty);
    g.fillStyle = 'rgba(40,10,30,.22)'; g.beginPath(); g.ellipse(px + OT / 2, py + OT - 1, OT * .62, 5, 0, 0, TAU); g.fill();
    if (hang) {
      const lh = !(L && L.p < 2), rh = !(Rt && Rt.p < 2), chrome = g.createLinearGradient(0, py - 6, 0, py - 2); chrome.addColorStop(0, '#ffffff'); chrome.addColorStop(1, '#9a9ab0');
      g.fillStyle = chrome; g.fillRect(px - (lh ? -2 : 0), py - 6, OT - (lh ? 2 : 0) - (rh ? 2 : 0), 3);
      g.strokeStyle = '#a0a0b8'; g.lineWidth = 2;
      if (lh) { g.beginPath(); g.moveTo(px + 3, py - 6); g.lineTo(px + 3, py + OT - 3); g.stroke(); g.fillStyle = '#5a5a70'; g.beginPath(); g.arc(px + 3, py + OT - 2, 2.2, 0, TAU); g.fill(); }
      if (rh) { g.beginPath(); g.moveTo(px + OT - 3, py - 6); g.lineTo(px + OT - 3, py + OT - 3); g.stroke(); g.fillStyle = '#5a5a70'; g.beginPath(); g.arc(px + OT - 3, py + OT - 2, 2.2, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(160,160,184,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + (lh ? 3 : 0), py + OT - 4); g.lineTo(px + OT - (rh ? 3 : 0), py + OT - 4); g.stroke();
    } else {
      const wg2 = g.createLinearGradient(0, py, 0, py + OT); wg2.addColorStop(0, '#fff8f2'); wg2.addColorStop(1, '#e8d8cc'); g.fillStyle = wg2; rr(g, px + 2, py - 4, OT - 4, OT + 2, 4); g.fill();
      g.strokeStyle = '#c8a888'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#c8a888'; g.fillRect(px + 3, py + 9, OT - 6, 2); g.fillRect(px + 3, py + 21, OT - 6, 2);
    }
  }
  // the gate by the door: two posts with light strips
  if (G.gateY >= 0) {
    const xs = []; for (let x = 0; x < W; x++) if (tile(x, G.gateY) === 'G') xs.push(x);
    for (const x of [xs[0], xs[xs.length - 1]]) { const px = (x + .5) * OT, py = G.gateY * OT; g.fillStyle = 'rgba(40,10,30,.25)'; g.beginPath(); g.ellipse(px + 2, py + OT, 9, 3.5, 0, 0, TAU); g.fill(); const pg = g.createLinearGradient(px - 5, 0, px + 5, 0); pg.addColorStop(0, '#d8dce8'); pg.addColorStop(.5, '#ffffff'); pg.addColorStop(1, '#b8bccc'); g.fillStyle = pg; rr(g, px - 5, py - 14, 10, OT + 12, 5); g.fill(); }
  }
  // the front door: gold-framed glass, a welcome mat
  if (G.doors.length) {
    const xs = G.doors.map(d => d[0]), y = G.doors[0][1], dx0 = Math.min(...xs) * OT, dx1 = (Math.max(...xs) + 1) * OT, py = y * OT;
    const gg = g.createLinearGradient(0, py, 0, py + OT); gg.addColorStop(0, '#bfe6f6'); gg.addColorStop(1, '#8fc8e0'); g.fillStyle = gg; g.fillRect(dx0, py, dx1 - dx0, OT);
    g.fillStyle = 'rgba(255,255,255,.5)'; for (const a of [dx0 + 8, (dx0 + dx1) / 2 + 8]) { g.beginPath(); g.moveTo(a, py + 3); g.lineTo(a + 8, py + 3); g.lineTo(a + 2, py + OT - 3); g.lineTo(a - 6, py + OT - 3); g.closePath(); g.fill(); }
    g.strokeStyle = '#e6c26a'; g.lineWidth = 3; g.strokeRect(dx0 + 1.5, py + 1.5, dx1 - dx0 - 3, OT); g.beginPath(); g.moveTo((dx0 + dx1) / 2, py); g.lineTo((dx0 + dx1) / 2, py + OT); g.stroke();
    g.fillStyle = '#c79a4a'; for (const a of [(dx0 + dx1) / 2 - 6, (dx0 + dx1) / 2 + 4]) g.fillRect(a, py + 10, 2, 10);
    g.fillStyle = '#7a3a6a'; rr(g, dx0 + 10, py - 20, dx1 - dx0 - 20, 16, 5); g.fill(); g.strokeStyle = '#e6c26a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#ffe6f0'; g.font = `700 10px ${FONT}`; g.textAlign = 'center'; g.fillText('ยินดีต้อนรับ', (dx0 + dx1) / 2, py - 8.5);
  }
  // little things: potted plants, a dressed form, velvet poufs where customers wait
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = tile(x, y), cx = (x + .5) * OT, cy = (y + .5) * OT;
    if (c === 'o') {
      g.fillStyle = 'rgba(40,10,30,.25)'; g.beginPath(); g.ellipse(cx + 2, cy + 13, 12, 4, 0, 0, TAU); g.fill();
      const pg = g.createLinearGradient(cx - 9, 0, cx + 9, 0); pg.addColorStop(0, '#f4f1ea'); pg.addColorStop(1, '#cfc6d8'); g.fillStyle = pg; g.beginPath(); g.moveTo(cx - 9, cy + 1); g.lineTo(cx + 9, cy + 1); g.lineTo(cx + 7, cy + 14); g.lineTo(cx - 7, cy + 14); g.closePath(); g.fill(); g.fillStyle = '#e6c26a'; g.fillRect(cx - 9, cy + 1, 18, 2);
      for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * .38, l = 9 + (k % 3) * 2; g.fillStyle = k % 2 ? '#3f8f4a' : '#5cb05a'; g.beginPath(); g.ellipse(cx + Math.cos(a) * l * .8, cy - 2 + Math.sin(a) * l, 3.5, l * .7, a + Math.PI / 2, 0, TAU); g.fill(); }
    }
    if (c === 'm') {
      g.fillStyle = 'rgba(40,10,30,.25)'; g.beginPath(); g.ellipse(cx, cy + 13, 10, 3, 0, 0, TAU); g.fill(); g.strokeStyle = '#8a6a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + 13); g.lineTo(cx, cy + 3); g.moveTo(cx - 7, cy + 13); g.lineTo(cx + 7, cy + 13); g.stroke();
      g.fillStyle = '#f4e6d8'; g.beginPath(); g.ellipse(cx, cy - 4, 9, 10, 0, 0, TAU); g.fill(); dzWear(g, cx, cy - 4, 9, { 0: 311, 1: 1351 }, 1); g.fillStyle = '#c79a4a'; g.beginPath(); g.arc(cx, cy - 15, 2.5, 0, TAU); g.fill();
    }
  }
  for (const [x, y] of G.waits) {
    const cx = (x + .5) * OT, cy = (y + .5) * OT;
    g.fillStyle = 'rgba(40,10,30,.22)'; g.beginPath(); g.ellipse(cx + 1, cy + 9, 11, 4, 0, 0, TAU); g.fill();
    const pg = g.createRadialGradient(cx - 3, cy + 2, 1, cx, cy + 5, 11); pg.addColorStop(0, '#e8b8e8'); pg.addColorStop(1, '#9a5aa8'); g.fillStyle = pg; g.beginPath(); g.ellipse(cx, cy + 5, 10, 6.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#e6c26a'; for (const a of [-4, 0, 4]) { g.beginPath(); g.arc(cx + a, cy + 4 + Math.abs(a) * .2, .9, 0, TAU); g.fill(); }
  }
  // warm light pooling under the ceiling lamps
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [lx, ly] of [[6, 7.5], [12.5, 7.5], [18.5, 7.5], [24.5, 6], [15, 13]]) { const gl = g.createRadialGradient(lx * OT, ly * OT, 4, lx * OT, ly * OT, 120); gl.addColorStop(0, 'rgba(255,220,160,.16)'); gl.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gl; g.fillRect(lx * OT - 120, ly * OT - 120, 240, 240); }
  g.restore();
}
// the edges of the room a touch darker (laid over everything, cached)
function shopVignette(g) {
  const v = g.createRadialGradient(VW / 2, VH / 2 + 20, VH * .35, VW / 2, VH / 2, VH * .95); v.addColorStop(0, 'rgba(40,10,40,0)'); v.addColorStop(1, 'rgba(40,10,40,.28)'); g.fillStyle = v; g.fillRect(0, 0, VW, VH);
}
// a fitting room's curtains: open (gathered at the sides, the mirror inside showing) or shut (and wobbling)
function dzCurtains(g, rm, i, busy, t) {
  const cx = (rm.tx + .5) * OT, top = rm.ty * OT - 16, bot = (rm.ty + 1) * OT, w = 38, col = ['#c2307a', '#7a3ac2', '#2f7fae'][i % 3];
  g.fillStyle = '#c79a4a'; g.fillRect(cx - w / 2 - 2, top - 2, w + 4, 2.5);
  if (!busy) {
    // the inside: a long mirror and a hook
    g.fillStyle = '#5a3a62'; g.fillRect(cx - w / 2, top, w, bot - top);
    const mg = g.createLinearGradient(cx - 8, 0, cx + 8, 0); mg.addColorStop(0, '#bfe0f0'); mg.addColorStop(1, '#e8f6ff'); g.fillStyle = mg; rr(g, cx - 7, top + 3, 14, bot - top - 7, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(cx - 4, top + 6, 2, bot - top - 14);
  }
  const shut = busy ? 1 : .32;
  for (const side of [-1, 1]) {
    const cw = w / 2 * shut, x0 = side < 0 ? cx - w / 2 : cx + w / 2 - cw;
    for (let k = 0; k < 4; k++) {
      const fx = x0 + k * cw / 4, wob = busy ? Math.sin(t * 9 + k + side) * 1.2 : 0, fg = g.createLinearGradient(fx, 0, fx + cw / 4, 0);
      fg.addColorStop(0, dzMix(col, '#15122b', .35)); fg.addColorStop(.5, dzMix(col, '#ffffff', .2)); fg.addColorStop(1, col);
      g.fillStyle = fg; g.beginPath(); g.moveTo(fx, top); g.lineTo(fx + cw / 4 + .5, top); g.lineTo(fx + cw / 4 + .5 + wob, bot); g.lineTo(fx + wob, bot); g.closePath(); g.fill();
    }
    if (!busy) { g.fillStyle = '#e6c26a'; g.fillRect(side < 0 ? x0 + cw - 2 : x0, top + 14, 2.5, 3); }
  }
  g.fillStyle = '#e6c26a'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(cx - w / 2 + 3 + k * (w - 6) / 5, top, 1.4, 0, Math.PI * 2); g.fill(); }
  if (busy) { g.fillStyle = '#fff'; g.font = `700 12px ${FONT}`; g.textAlign = 'center'; g.fillText('.'.repeat(1 + Math.floor(t * 3) % 3), cx, (top + bot) / 2 + 4); }
}
function dzHanger(g, x, y) { g.strokeStyle = '#c0c0d0'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y + 1.6, 1.8, Math.PI, Math.PI * 2.2); g.moveTo(x, y + 3.4); g.lineTo(x - 7, y + 7.5); g.lineTo(x + 7, y + 7.5); g.closePath(); g.stroke(); }

/* ---------- each frame ---------- */
function shopRender() {
  const g = ctx, st = OM.st, G = st.G, def = G.def, t = S.time;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 6 * S.shake;
  g.save(); g.translate(ox, 0);
  stamp(g, 'shopGround', def.name, 0, 0, VW, VH, q => shopGround(q, G), true);
  // the gate's light strips: green, red and flashing while the alarm goes
  if (G.gateY >= 0) {
    const alarm = G.thief && G.thief.alarm, on = alarm ? Math.sin(t * 18) > 0 : true, col = alarm ? (on ? '#ff4f4f' : '#802020') : '#5cf0a0';
    let xs = st.gateXs; if (!xs) { xs = []; for (let x = 0; x < Shop.COLS; x++) if (Shop.tileAt(G, x, G.gateY) === 'G') xs.push(x); st.gateXs = xs; }
    for (const x of [xs[0], xs[xs.length - 1]]) { const px = (x + .5) * OT, py = G.gateY * OT; g.fillStyle = col; rr(g, px - 1.5, py - 10, 3, OT + 4, 1.5); g.fill(); if (alarm && on) glow(g, '255,80,80', px, py + 6, 30, .5); }
    if (alarm && on) { g.fillStyle = 'rgba(255,60,60,.12)'; g.fillRect((xs[0] + .5) * OT, G.gateY * OT - 6, (xs[xs.length - 1] - xs[0]) * OT, OT + 12); }
  }
  // clothes on the racks (the one with the kid in it shakes, with eyes peeping out)
  G.racks.forEach((rk, i) => {
    const px = rk.tx * OT, py = rk.ty * OT, kid = G.kid && G.kid.st === 'hide' && G.kid.rack === i, w = (kid ? Math.sin(t * 20) * 2.2 : 0) + (st.wob[i] ? Math.sin(t * 40) * 3 : 0);
    const n = Math.min(rk.n, 4), code = Shop.gc({ p: rk.p, s: rk.s, c: rk.c, z: 1 });
    if (rk.p < 2) {
      for (let k = 0; k < n; k++) { const hx = px + OT / 2 + (k - (n - 1) / 2) * 3.4 + w * (k + 1) / n, hy = py - 6; dzHanger(g, hx, hy); g.save(); g.translate(hx, hy + 17); g.rotate(Math.sin(t * 1.3 + i + k) * .03); dzGarment(g, code, 0, 0, .8); g.restore(); }
    } else {
      for (let k = 0; k < n; k++) { const row = k < 2 ? 0 : 1, col = k % 2; dzGarment(g, code, px + 10 + col * 12 + w, py + 3 + row * 12, .42); }
    }
    if (!rk.n) { g.fillStyle = 'rgba(21,18,43,.55)'; g.font = `700 9px ${FONT}`; g.textAlign = 'center'; g.fillText('หมด', px + OT / 2, py + 12); }
    // its tag: the occasion's colour and picture
    const tc = DZ_OCC[rk.s]; g.fillStyle = 'rgba(40,10,30,.25)'; rr(g, px + 2, py + OT - 7, OT - 3, 12, 6); g.fill();
    g.fillStyle = tc; rr(g, px + 1, py + OT - 8, OT - 3, 12, 6); g.fill(); dzIcon(g, rk.s, px + 7.5, py + OT - 2.2, .55);
    g.fillStyle = '#fff'; g.font = `700 7.5px ${FONT}`; g.textAlign = 'center'; g.fillText(DZ_STY[rk.s], px + OT / 2 + 4, py + OT + .5);
    if (kid) { const ex = px + OT / 2 + w, ey = py + 6; g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(ex, ey + 2, 6, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(ex + s * 2.8, ey + 1, 2, 0, Math.PI * 2); g.fill(); } g.fillStyle = C.ink; for (const s of [-1, 1]) { g.beginPath(); g.arc(ex + s * 2.8 + Math.sin(t * 3), ey + 1.4, 1, 0, Math.PI * 2); g.fill(); } }
  });
  // clothes on the floor, crumpled
  G.items.forEach((it, i) => { g.fillStyle = 'rgba(40,10,30,.18)'; g.beginPath(); g.ellipse(it.x + 1, it.y + 7, 10, 3.5, 0, 0, Math.PI * 2); g.fill(); dzGarment(g, it.g, it.x, it.y, .8, ((i * 37) % 7 - 3) * .2); });
  // the machines: what is on them, the needle going, how far along
  for (const m of G.mach) {
    const cx = (m.tx + .5) * OT + 3, cy = (m.ty + .5) * OT, busy = m.g >= 0 && !m.done && G.t - m.lastT < .5;
    g.fillStyle = '#c0c0d0'; g.fillRect(cx - 8.5, m.ty * OT + 12 + (busy ? Math.abs(Math.sin(t * 40)) * 3 : 0), 1.5, 4);
    if (m.g < 0) continue;
    dzGarment(g, m.g, cx - 2, cy + 2 + (m.done ? 0 : Math.sin(t * 30) * .5), .62);
    g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,18,43,.45)'; g.beginPath(); g.arc(cx, cy - 2, 17, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = m.done ? '#9be07a' : C.gold; g.beginPath(); g.arc(cx, cy - 2, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, m.prog / 100)); g.stroke(); g.lineCap = 'butt';
    if (m.done) { g.fillStyle = '#9be07a'; g.font = `700 11px ${FONT}`; g.textAlign = 'center'; g.fillText('✓ หยิบได้', cx, cy - 24); }
  }
  // fitting room curtains
  G.rooms.forEach((rm, i) => dzCurtains(g, rm, i, G.cust.some(c => c.room === i && c.st === 'try'), t));
  // who the buttons would work on just now (each player's own colour; red when it would not do)
  if (G.st === 'run') for (const id of ['pink', 'mint']) {
    if (O.role && id !== O.local) continue;
    const tg = Shop.target(G, id); if (!tg) continue;
    const col = !tg.ok ? '#ff6b6b' : id === 'pink' ? C.pink : C.mint, pulse = .6 + .4 * Math.sin(t * 6);
    g.strokeStyle = hexA(col, pulse); g.lineWidth = 2.5;
    if (tg.tx != null) { rr(g, tg.tx * OT - 3, tg.ty * OT - 8, OT + 6, OT + 14, 8); g.stroke(); }
    else if (tg.k === 'cust') { g.beginPath(); g.ellipse(tg.x, tg.y + 14, 20, 8, 0, 0, Math.PI * 2); g.stroke(); }
    else if (tg.k === 'item') { g.beginPath(); g.arc(tg.x, tg.y, 13, 0, Math.PI * 2); g.stroke(); }
  }
  // a spotlight on whoever comes out of a fitting room to show their outfit
  for (const c of G.cust) if (c.st === 'pose') { const a = Math.min(1, c.t * 2) * (c.t > Shop.POSE_T - .4 ? (Shop.POSE_T - c.t) / .4 : 1); g.save(); g.globalCompositeOperation = 'lighter'; glow(g, c.out && c.out.kind === 'perfect' ? '255,220,140' : '200,200,255', c.x, c.y - 6, 42, .55 * a); g.restore(); }
  // everyone, the nearer in front: players, customers (not in a room), the kid, the thief
  const ppl = [];
  for (const id of ['pink', 'mint']) ppl.push({ y: st.disp[id].y, f: () => dzHero(g, G, id, st.disp[id].x, st.disp[id].y, t) });
  for (const c of G.cust) if (c.st !== 'try') ppl.push({ y: c.y, f: () => dzCust(g, G, c, t) });
  if (G.kid && G.kid.st !== 'hide') ppl.push({ y: G.kid.y, f: () => dzKid(g, G.kid, t) });
  if (G.thief) ppl.push({ y: G.thief.y, f: () => dzThief(g, G.thief, t) });
  ppl.sort((a, b) => a.y - b.y).forEach(o => o.f());
  // bubbles over the waiting customers (on top of everyone)
  for (const c of G.cust) if (['in', 'wait', 'queue', 'pay'].includes(c.st)) dzBubble(g, G, c, t);
  // flying buttons and clothes, sparkles where something was handed over, dust in the light
  for (const f of st.fly) { if (f.k === 'btn') { g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x, f.y, 2.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.ink; g.lineWidth = .8; g.stroke(); } else dzGarment(g, 1000 * (f.c % 4) + 10 * (f.c * 3 % 7) + 1, f.x, f.y, .6, f.t * 8); }
  for (const s of st.spark) { g.fillStyle = `rgba(255,236,150,${s.t * 2})`; twinkle(g, s.x + Math.sin(s.t * 20) * 8, s.y - (1 - s.t) * 20, 4); }
  for (let i = 0; i < 14; i++) { const x = (i * 131 + t * (6 + i % 3)) % 860 + 50, y = (i * 77 + Math.sin(t * .4 + i) * 30) % 360 + 120, a = .25 + .2 * Math.sin(t * 1.3 + i * 2); g.fillStyle = `rgba(255,245,220,${a})`; g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill(); }
  g.restore();
  stamp(g, 'shopVignette', '', 0, 0, VW, VH, shopVignette);
  drawParts(g);
  if (G.st === 'show' || (G.st === 'close' && G.ct > 1.2)) dzShow(g, G, t);
  xDrawFloats(g, OM);
  dzHud(g, G);
  xCountdown(g, G, Shop.START);
  xBannerDraw(g, G, Shop.START, def.name, 'ดูว่าลูกค้าจะไปไหน หยิบชุดสไตล์นั้นไปยื่น ไซซ์ S หรือ L ไปแก้ที่จักร (กดสลับกัน) แล้วคิดเงินที่เคาน์เตอร์');
  if (st.flash > 0) { g.fillStyle = `rgba(255,255,255,${st.flash * .6})`; g.fillRect(0, 0, VW, VH); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
function dzHero(g, G, id, x, y, t) {
  const st = OM.st, p = G.p[id], pink = id === 'pink', dark = pink ? C.pinkD : C.mintD;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2); g.fill();
  const w = st.walk[id], bob = p.mv ? Math.abs(Math.sin(w)) * 2.2 : 0, step = p.mv ? Math.sin(w) * 3 : 0;
  g.fillStyle = dark; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 6, y + 8 + s * step * .6, 4.2, 3, 0, 0, Math.PI * 2); g.fill(); }
  roundBody(g, x, y - 3 - bob, 13, id, false, p.mv ? w : 0);
  // a little apron: they work here
  g.fillStyle = 'rgba(255,255,255,.85)'; rr(g, x - 7, y - 1 - bob, 14, 9, 3); g.fill(); g.fillStyle = pink ? C.pinkD : C.mintD; g.fillRect(x - 2, y + 1 - bob, 4, 3);
  if (pink) cuteBow(g, x + 5, y - 16 - bob, .95); else cuteSprout(g, x, y - 15 - bob, 1.05, t);
  cuteFace(g, x + p.fx * 3.5, y - 5 - bob + Math.max(-1, p.fy) * 1.5, p.fx, t, pink, p.stun > 0 ? 'o' : '', .82, p.fy, id);
  if (p.stun > 0) for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; g.fillStyle = C.gold; twinkle(g, x + Math.cos(a) * 12, y - 22 + Math.sin(a) * 4, 3); }
  if (p.item >= 0) dzGarment(g, p.item, x, y - 30 - bob, .9);
  if (G.t < Shop.START + 3) { g.globalAlpha = Math.min(1, (Shop.START + 3 - G.t) * 1.5); nameTag(g, S.names[id], x, y - 34 - wardLift(id), pink ? C.pink : C.mint); g.globalAlpha = 1; }
}
function dzKid(g, k, t) {
  const bob = Math.abs(Math.sin(t * 16)) * 2;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(k.x, k.y + 7, 7, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(k.x, k.y - bob, 8, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(21,18,43,.3)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#e85a5a'; g.beginPath(); g.arc(k.x, k.y - 7 - bob, 8, Math.PI, 0); g.fill(); g.fillRect(k.x, k.y - 8 - bob, 10, 2.5);
  cuteFace(g, k.x, k.y - 1 - bob, 0, t, true, 'happy', .55);
}
function dzThief(g, th, t) {
  const bob = th.mv ? Math.abs(Math.sin(t * (th.alarm ? 22 : 12))) * 2 : 0, x = th.x, y = th.y;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 10, 12, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3446'; g.beginPath(); g.arc(x, y - 3 - bob, 13, 0, Math.PI * 2); g.fill();
  // the hood, a gap for the eyes, shifty eyes
  g.fillStyle = '#2a2436'; g.beginPath(); g.arc(x, y - 6 - bob, 13, Math.PI * .95, Math.PI * 2.05); g.fill();
  g.fillStyle = '#e8c8a8'; rr(g, x - 8, y - 9 - bob, 16, 7, 3); g.fill();
  const look = Math.sin(t * 2.5) * 2.5; g.fillStyle = C.ink; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 3.8 + look, y - 5.5 - bob, 1.4, 0, Math.PI * 2); g.fill(); }
  if (th.item >= 0) dzGarment(g, th.item, x + 12, y - 4 - bob, .7, .5);
  if (th.alarm) { g.fillStyle = '#ff6b6b'; g.font = `400 14px ${FONT_D}`; g.textAlign = 'center'; g.fillText('ขโมย!', x, y - 26 - bob); }
}
// what a customer wants: where they are going, the pieces (a tick on each one they have), the colour, their size,
// and how long they will wait
function dzCust(g, G, c, t) {
  const st = OM.st, w = st.cwalk[c.id] || 0, step = c.mv ? Math.sin(w) * 2.4 : 0, bob = c.mv ? Math.abs(Math.sin(w)) * 1.8 : 0;
  let mood = '', got = c.got, spin = 0;
  if (c.st === 'pose' && c.out) {
    const k = c.out.kind; mood = k === 'perfect' ? 'happy' : k === 'tight' || k === 'style' || k === 'nostyle' ? 'o' : 'sad';
    if (k === 'perfect') spin = Math.sin(c.t * 7) * .25;
  } else if (c.angry) mood = 'angry';
  else if ((c.st === 'wait' || c.st === 'queue') && c.pat < c.patMax * .3) mood = 'sad';
  else if (c.st === 'pay' || (c.st === 'out' && !c.angry)) mood = 'happy';
  if (c.st === 'out' || c.st === 'pay') got = c.st === 'pay' ? c.got : {};
  g.save();
  if (spin) { g.translate(c.x, c.y); g.scale(Math.cos(spin * 6) > 0 ? 1 : -1, 1); g.translate(-c.x, -c.y); }
  const b = dzPerson(g, c.look, c.z, c.x, c.y, got, t, { bob, step, fx: c.fx || 0, mood, still: !c.mv });
  g.restore();
  // walking out happy: a shopping bag; a perfect outfit: a selfie; a size too big: a sweat drop
  if (c.st === 'out' && !c.angry) { const bx = c.x + b.r * .8; g.fillStyle = '#ff8fb8'; rr(g, bx, c.y - 2, 11, 13, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx + 1, c.y - 1, 3, 11); g.strokeStyle = '#c0457a'; g.lineWidth = 1.4; g.beginPath(); g.arc(bx + 5.5, c.y - 2, 3, Math.PI, 0); g.stroke(); }
  if (c.st === 'pose' && c.out && c.out.kind === 'perfect' && c.t > 1) { g.fillStyle = '#2a2440'; rr(g, c.x + b.r + 2, b.cy - b.r - 6, 8, 13, 2); g.fill(); g.fillStyle = '#7fe8c0'; g.fillRect(c.x + b.r + 3.5, b.cy - b.r - 4.5, 5, 8); if (Math.floor(c.t * 4) % 3 === 0) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(c.x + b.r + 6, b.cy - b.r - 4, 7, 0, Math.PI * 2); g.fill(); } }
  if (c.st === 'pose' && c.out && c.out.kind === 'loose') { g.fillStyle = 'rgba(140,200,255,.85)'; g.beginPath(); g.moveTo(c.x - b.r, b.cy - b.r * .55); g.quadraticCurveTo(c.x - b.r + 3, b.cy - b.r * .2, c.x - b.r, b.cy - b.r * .1); g.quadraticCurveTo(c.x - b.r - 3, b.cy - b.r * .2, c.x - b.r, b.cy - b.r * .55); g.fill(); }
}
// what a customer wants: a card in the colour of where they are going (its picture and name), the pieces (a tick on
// each one they have), the colour, their size, and how long they will wait
function dzBubble(g, G, c, t) {
  const pay = c.st === 'pay', n = c.want.pieces.length, occ = DZ_OCC[c.want.s];
  const w = pay ? 78 : Math.max(86, 24 * n + 40), h = pay ? 28 : 50, x = Math.max(36, Math.min(VW - 36 - w, c.x - w / 2)), y = c.y - [10.5, 13, 16][c.z] * 1.3 - h - 18;
  const a = c.st === 'in' ? .75 : 1, low = !pay && c.pat < c.patMax * .3;
  g.globalAlpha = a;
  const pop = c.st === 'wait' && c.t < .3 ? 1 + (1 - c.t / .3) * .15 : 1;
  g.save(); g.translate(c.x, y + h); g.scale(pop, pop); g.translate(-c.x, -(y + h));
  g.fillStyle = 'rgba(40,10,30,.25)'; rr(g, x + 1, y + 3, w, h, 10); g.fill();
  g.fillStyle = '#fffaf6'; rr(g, x, y, w, h, 10); g.fill();
  g.beginPath(); g.moveTo(c.x - 6, y + h - .5); g.lineTo(c.x, y + h + 7); g.lineTo(c.x + 6, y + h - .5); g.fill();
  if (pay) {
    g.fillStyle = '#e6c26a'; rr(g, x, y, 22, h, 10); g.fill(); g.fillStyle = '#fffaf6'; g.fillRect(x + 14, y, 8, h);
    g.fillStyle = '#c79a4a'; g.beginPath(); g.arc(x + 11, y + 13, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff6dc'; g.font = `700 8px ${FONT}`; g.textAlign = 'center'; g.fillText('฿', x + 11, y + 16);
    g.fillStyle = C.ink; g.font = `700 11px ${FONT}`; g.textAlign = 'left'; g.fillText('คิดเงินด้วย', x + 26, y + 17);
    const q = Math.max(0, c.tillPat / Shop.TILL_PAT); g.fillStyle = 'rgba(21,18,43,.1)'; rr(g, x + 26, y + h - 7, w - 32, 3, 1.5); g.fill(); g.fillStyle = q < .35 ? '#ff6b6b' : '#ffb35a'; rr(g, x + 26, y + h - 7, Math.max(3, (w - 32) * q), 3, 1.5); g.fill();
    g.restore(); g.globalAlpha = 1; return;
  }
  // the header in the occasion's colour
  g.save(); rr(g, x, y, w, h, 10); g.clip(); g.fillStyle = occ; g.fillRect(x, y, w, 18); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 6); g.restore();
  dzIcon(g, c.want.s, x + 11, y + 9.5, .7);
  g.fillStyle = '#fff'; g.font = `700 11px ${FONT}`; g.textAlign = 'left'; g.fillText(DZ_GO[c.want.s], x + 20, y + 13.5);
  if (G.def.sizeShow !== false) { const sc = c.z === 0 ? '#5aa8ff' : c.z === 2 ? '#ff9a3a' : '#9a8ab8'; g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w - 10, y + 9, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = sc; g.beginPath(); g.arc(x + w - 10, y + 9, 5.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = `700 8.5px ${FONT}`; g.textAlign = 'center'; g.fillText(Shop.SIZES[c.z], x + w - 10, y + 12); }
  c.want.pieces.forEach((p, i) => {
    const ix = x + 16 + i * 24, iy = y + 32, have = c.got[p] != null;
    g.fillStyle = have ? '#e8f8ee' : '#f2ecf4'; g.beginPath(); g.arc(ix, iy, 10, 0, Math.PI * 2); g.fill();
    const code = have ? c.got[p] : Shop.gc({ p, s: c.want.s, c: c.want.c >= 0 ? c.want.c : 6, z: 1 });
    g.globalAlpha = a * (have ? 1 : c.want.c >= 0 ? .9 : .5);
    dzGarment(g, code, ix, iy, .52);
    g.globalAlpha = a;
    if (have) { g.fillStyle = '#3fbf6a'; g.beginPath(); g.arc(ix + 7.5, iy - 7, 4.6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ix + 5.4, iy - 7); g.lineTo(ix + 7, iy - 5.3); g.lineTo(ix + 9.6, iy - 8.8); g.stroke(); }
  });
  if (c.want.c >= 0) { const cx = x + w - 11, cy = y + 32; g.fillStyle = DZ_COL[c.want.c]; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(21,18,43,.3)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - 2, cy - 2, 1.8, 0, Math.PI * 2); g.fill(); }
  // patience: a bar along the bottom that empties (and blinks when it is nearly gone)
  const q = Math.max(0, c.pat / c.patMax), qc = q < .3 ? '#ff5a5a' : q < .6 ? '#ffb35a' : '#3fbf6a';
  g.fillStyle = 'rgba(21,18,43,.1)'; rr(g, x + 8, y + h - 6, w - 16, 3, 1.5); g.fill();
  if (!low || Math.sin(t * 12) > -.3) { g.fillStyle = qc; rr(g, x + 8, y + h - 6, Math.max(3, (w - 16) * q), 3, 1.5); g.fill(); }
  if (c.st === 'queue') { g.fillStyle = '#7a5aa0'; g.font = `700 9px ${FONT}`; g.textAlign = 'center'; g.fillText('รอห้องลอง', x + w / 2, y - 4); }
  g.restore();
  g.globalAlpha = 1;
}
// closing time: the lights down, a glittering curtain, a runway, the best outfits walking it, a photo as each poses
function dzShow(g, G, t) {
  const s = Shop.showAt(G), fade = G.st === 'close' ? Math.min(1, (G.ct - 1.2) / .8) : 1;
  g.fillStyle = `rgba(14,8,30,${.86 * fade})`; g.fillRect(0, 0, VW, VH);
  if (!s) return;
  const rx = VW / 2, top = 90, bot = 460;
  g.globalAlpha = fade;
  // the backdrop: a curtain of sequins, soft coloured lights out of focus
  const cg = g.createLinearGradient(0, 0, 0, top + 20); cg.addColorStop(0, '#5a1e6a'); cg.addColorStop(1, '#2a0e3a'); g.fillStyle = cg; g.fillRect(rx - 220, 0, 440, top + 20);
  for (let i = 0; i < 22; i++) { const xx = rx - 210 + i * 20; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(xx, 0, 8, top + 20); }
  for (let i = 0; i < 40; i++) { const xx = rx - 210 + (i * 53) % 420, yy = (i * 37) % (top + 10), a = .3 + .7 * Math.max(0, Math.sin(t * 3 + i * 1.7)); g.fillStyle = `rgba(255,230,180,${a * .8})`; twinkle(g, xx, yy, 1.6 + a); }
  for (let i = 0; i < 9; i++) { const xx = (i * 151 + 40) % VW, yy = 120 + (i * 97) % 300, col = ['255,120,200', '120,180,255', '255,220,120'][i % 3]; glow(g, col, xx, yy, 30 + (i % 3) * 10, .12 + .05 * Math.sin(t + i)); }
  // spotlights from both sides onto the end of the runway
  for (const sx of [rx - 300, rx + 300]) { const gr = g.createLinearGradient(sx, 0, rx, bot); gr.addColorStop(0, 'rgba(255,240,210,.22)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(sx - 12, 0); g.lineTo(sx + 12, 0); g.lineTo(rx + 100, bot); g.lineTo(rx - 100, bot); g.closePath(); g.fill(); }
  // the runway: glossy, lit along both edges
  const rw = g.createLinearGradient(0, top, 0, bot); rw.addColorStop(0, '#3a2060'); rw.addColorStop(1, '#5a3a8a'); g.fillStyle = rw;
  g.beginPath(); g.moveTo(rx - 42, top); g.lineTo(rx + 42, top); g.lineTo(rx + 74, bot); g.lineTo(rx - 74, bot); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(rx - 10, top); g.lineTo(rx + 10, top); g.lineTo(rx + 18, bot); g.lineTo(rx - 18, bot); g.closePath(); g.fill();
  for (let i = 0; i < 13; i++) { const k = i / 12, yy = top + k * (bot - top), on = Math.sin(t * 6 - i * .6) > 0; for (const side of [-1, 1]) { g.fillStyle = on ? '#ffe9a0' : 'rgba(255,233,160,.35)'; g.beginPath(); g.arc(rx + side * (44 + 30 * k), yy, 2.2, 0, Math.PI * 2); g.fill(); } }
  // the crowd along it, phones up, now and then a flash
  for (let i = 0; i < 13; i++) for (const side of [-1, 1]) {
    const yy = top + 24 + i * 29, xx = rx + side * (118 + (i % 2) * 24 + (yy - top) * .14), bob = Math.sin(t * 3 + i + side) * 1.2;
    g.fillStyle = '#251a48'; g.beginPath(); g.arc(xx, yy + bob, 10, 0, Math.PI * 2); g.fill(); rr(g, xx - 12, yy + 7 + bob, 24, 16, 6); g.fill();
    const col = ['#ff8fb8', '#5aa8ff', '#ffd25a', '#5cc87a'][(i + (side > 0 ? 2 : 0)) % 4]; g.fillStyle = hexA(col, .55); g.beginPath(); g.arc(xx, yy - 3 + bob, 10, Math.PI * 1.1, Math.PI * 1.9); g.fill();
    if ((i + (side > 0 ? 3 : 0)) % 4 === 0) { g.fillStyle = '#121022'; rr(g, xx - side * 9 - 3, yy - 6 + bob, 6, 9, 1.5); g.fill(); if (Math.sin(t * 5 + i * 1.7) > .88) glow(g, '255,255,255', xx - side * 9, yy - 2 + bob, 14, .8); }
  }
  g.fillStyle = C.gold; g.font = `400 24px ${FONT_D}`; g.textAlign = 'center'; g.fillText('แฟชั่นโชว์ปิดร้าน', rx, 48);
  if (s.i >= 0 && s.i < s.n) {
    const m = G.best[s.i], k = s.k, y = top + 40 + k * (bot - top - 100), sc = 1.9 + k * .8, got = {};
    (m.got || []).forEach(n => { got[Shop.gd(n).p] = n; });
    const walk = k < 1 ? Math.sin(s.lt * 9) : 0;
    // a spot on the model, and their reflection on the runway
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, '255,230,190', rx, y - 10, 70 * sc / 2, .35); g.restore();
    g.save(); g.globalAlpha = .18 * fade; g.translate(rx, y + 30 * sc / 2.5); g.scale(sc, -sc * .5); g.translate(-rx, -y); dzPerson(g, m.look, m.z, rx + walk * 2, y, got, t, { mood: '' }); g.restore();
    g.save(); g.translate(rx, y); g.scale(sc, sc); g.translate(-rx, -y);
    dzPerson(g, m.look, m.z, rx + walk * 2, y, got, t, { bob: Math.abs(walk) * 2, step: walk * 2, mood: s.pose ? 'happy' : '' });
    g.restore();
    g.font = `700 14px ${FONT}`; g.fillStyle = '#fff'; g.fillText(`ชุด${DZ_GO[m.s] || ''}  ·  ${th(s.i + 1)}/${th(s.n)}`, rx, bot + 30);
    // the pose: the moment for a photo
    if (s.pose) {
      const u = (s.lt - Shop.FLASH[0]) / (Shop.FLASH[1] - Shop.FLASH[0]);
      g.strokeStyle = `rgba(255,207,90,${1 - u})`; g.lineWidth = 4; g.beginPath(); g.arc(rx, y - 20, 64 + u * 30, 0, Math.PI * 2); g.stroke();
      // a camera frame round them
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; const fw = 70, fh = 80, fy = y - 40;
      for (const [ax, ay, dx, dy] of [[-1, -1, 1, 1], [1, -1, -1, 1], [-1, 1, 1, -1], [1, 1, -1, -1]]) { const px = rx + ax * fw, py = fy + ay * fh; g.beginPath(); g.moveTo(px, py + dy * 16); g.lineTo(px, py); g.lineTo(px + dx * 16, py); g.stroke(); }
      g.fillStyle = C.gold; g.font = `400 26px ${FONT_D}`; g.fillText('ถ่ายเลย!', rx, fy - fh - 10);
    } else if (s.lt < Shop.FLASH[0]) { g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `600 13px ${FONT}`; g.fillText('รอนายแบบหยุดโพสท่าแล้วกดถ่ายรูป (กดพร้อมกันได้ภาพคู่)', rx, VH - 18); }
  }
  // confetti after a good photo
  const st = OM.st; st.conf = st.conf || [];
  for (const p of st.conf) { p.y += p.vy * .016; p.x += Math.sin(t * 3 + p.ph) * .6; p.r += .1; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-3, -1.5, 6, 3); g.restore(); }
  st.conf = st.conf.filter(p => p.y < VH + 10);
  g.globalAlpha = 1;
}
function dzHud(g, G) {
  const c = Shop.clock(G), sec = Math.ceil(c.left), mm = Math.floor(sec / 60), ss = sec % 60;
  panel(g, 8, 8, 196, 50, 12, .85);
  g.textAlign = 'left'; g.font = `400 20px ${FONT_D}`; g.fillStyle = c.left < 30 && G.st === 'run' && Math.sin(S.time * 8) > 0 ? '#ff8a8a' : C.paper;
  g.fillText(G.st === 'run' || G.st === 'count' ? `${th(mm)}:${ss < 10 ? '๐' : ''}${th(ss)}` : 'ปิดร้าน', 18, 33);
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText('ก่อนปิดร้าน', 18, 50);
  g.textAlign = 'right'; g.font = `400 20px ${FONT_D}`; g.fillStyle = C.gold; g.fillText('฿' + th(Math.max(0, Math.round(G.money))), 194, 33);
  g.font = `600 11px ${FONT}`; g.fillStyle = '#c9bfef'; g.fillText(`ขายได้ ${th(G.stats.served)} คน`, 194, 50);
  // the stars, and how far to each
  const s = G.def.stars, w = 150, x = VW - 8 - w;
  panel(g, x, 8, w, 30, 12, .85);
  const got = s.filter(v => G.money >= v).length;
  for (let i = 0; i < 3; i++) { g.fillStyle = i < got ? C.gold : 'rgba(255,255,255,.2)'; twinkle(g, x + 20 + i * 24, 23, 8); }
  g.font = `600 10px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#c9bfef'; g.fillText(got < 3 ? `ดาวถัดไป ฿${th(s[got])}` : 'ครบสามดาว!', x + w - 8, 27);
  if (G.st === 'show') return;
  // what each of you holds, in your corner
  for (const id of ['pink', 'mint']) {
    const p = G.p[id]; if (p.item < 0) continue;
    const ww = 210, xx = id === 'pink' ? 8 : VW - 8 - ww, yy = VH - 36;
    panel(g, xx, yy, ww, 28, 10, .85);
    dzGarment(g, p.item, xx + 16, yy + 14, .6);
    g.font = `600 11px ${FONT}`; g.textAlign = 'left'; g.fillStyle = id === 'pink' ? C.pink : C.mint; g.fillText(dzName(p.item), xx + 30, yy + 18);
  }
  if (S.mode !== 'play' || G.st !== 'run' || G.over) return;
  // a word over the head when it helps
  for (const id of ['pink', 'mint']) {
    if (O.role && id !== O.local) continue;
    const p = G.p[id], d = OM.st.disp[id], tg = Shop.target(G, id); let tip = null;
    if (G.thief && G.thief.alarm && G.thief.st === 'run') tip = 'วิ่งไปชนขโมย!';
    else if (tg && tg.k === 'kid') tip = 'จับเด็ก!';
    else if (tg && tg.k === 'till') tip = 'คิดเงิน';
    else if (tg && tg.k === 'mach') { const m = Shop.machAt(G, tg.tx, tg.ty); tip = m.g < 0 ? (tg.ok ? (m.dir < 0 ? 'ใส่จักรย่อเป็นไซซ์เล็กลง' : 'ใส่จักรขยายเป็นไซซ์ใหญ่ขึ้น') : 'ไซซ์นี้สุดแล้ว') : m.done ? 'หยิบออก' : 'กดสลับกันคนละที'; }
    else if (tg && tg.k === 'cust' && !tg.ok) tip = 'ลูกค้าไม่ได้ขอชิ้นนี้';
    else if (tg && tg.k === 'rack' && p.item >= 0 && !tg.ok) tip = 'ไม่ใช่ราวของมัน';
    else if (tg && tg.k === 'rack' && p.item < 0 && !tg.ok) tip = 'ราวนี้หมด';
    if (tip) xTip(g, id, tip, d.x, d.y - 46);
  }
}

/* ---------- Fishing together (ตกปลาคู่) ---------- */
Object.assign(sfx, {
  fcast() { noise(.28, 1600, .05, 'bandpass', .8, 500); tone(900, .18, 'sine', .015, 400); },
  fplop() { tone(520, .09, 'sine', .05, 180); noise(.12, 900, .03, 'lowpass', 1); },
  fnib() { tone(1400, .03, 'sine', .025, 1200); },
  fbite() { tone(300, .14, 'sine', .07, 120); noise(.16, 700, .05, 'lowpass', 1); chime(1319, .25, .04, .05); },
  fhook() { tone(600, .12, 'triangle', .05, 1500); noise(.1, 3000, .03, 'highpass', 1); },
  fclick() { tone(2200 + Math.random() * 300, .015, 'square', .012); },
  fthrash() { noise(.25, 1200, .05, 'bandpass', .7, 400); },
  fsnap() { tone(1600, .25, 'sawtooth', .03, 200); noise(.12, 4000, .04, 'highpass', 1); },
  fgone() { [392, 330, 262].forEach((f, i) => tone(f, .2, 'triangle', .035, 0, i * .15)); },
  fland() { noise(.15, 900, .05, 'lowpass', 1); chime(988, .3, .04, .08); chime(1319, .35, .035, .18); },
  fsurf() { noise(.35, 700, .07, 'lowpass', .8); tone(200, .2, 'sine', .05, 120); },
  fscoop() { noise(.25, 1500, .05, 'bandpass', .7, 600); [784, 988, 1175].forEach((f, i) => chime(f, .3, .04, .1 + i * .07)); },
  fdive() { tone(500, .4, 'sine', .04, 150); noise(.3, 600, .05, 'lowpass', 1); },
  fgiant() { tone(73, 1.2, 'sine', .08, 65); tone(110, 1, 'triangle', .03, 98, .2); },
  fbig() { [523, 659, 784, 1047, 1319].forEach((f, i) => chime(f, .5, .045, i * .09)); },
  fcaw() { tone(900, .12, 'sawtooth', .025, 600); tone(850, .14, 'sawtooth', .025, 550, .16); },
  fshoo() { noise(.2, 2500, .05, 'bandpass', 1, 900); tone(500, .1, 'square', .02, 900); },
  fsteal() { tone(900, .1, 'sawtooth', .025, 1200); [392, 311].forEach((f, i) => tone(f, .2, 'triangle', .03, 0, .15 + i * .15)); },
  fleak() { for (let i = 0; i < 3; i++) tone(1800 - i * 200, .04, 'sine', .03, 900, i * .12); },
  fplug() { tone(300, .08, 'triangle', .05, 150); chime(1175, .2, .03, .05); },
  fflood() { noise(.8, 500, .08, 'lowpass', .7, 200); tone(160, .5, 'sawtooth', .03, 90); },
  ftangle() { tone(700, .3, 'sawtooth', .02, 300); },
  funtie() { tone(900 + Math.random() * 200, .05, 'triangle', .03); },
  fundone() { chime(1047, .3, .04); chime(1568, .35, .03, .08); },
  fdusk() { [659, 523, 440, 392].forEach((f, i) => chime(f, .7, .035, i * .22)); },
  fnet() { noise(.45, 1100, .06, 'bandpass', .6, 400); },
  fnetok() { [523, 659, 784, 1047].forEach((f, i) => chime(f, .4, .045, i * .08)); },
  fnethalf() { [523, 494].forEach((f, i) => tone(f, .2, 'triangle', .035, 0, i * .15)); },
  ftick() { tone(1800, .03, 'square', .02); tone(1800, .03, 'square', .02, 0, .5); }
});
const YF = Fish, YSY = YF.SY, YBX = YF.BX, YDECK = YF.DECK;
const YFN = ['ปลานิล', 'ปลาตะเพียน', 'ปลาช่อน', 'ปลาดุก', 'ปลากะพง', 'ปลาทองเรืองแสง', 'ปลาบึก', 'เจ้าบึง', 'รองเท้าบูท'];
function yFloat(text, x, y, col, size, life) { if (YM.st.floats.some(f => f.text === text && f.max - f.life < .8)) return; xFloat(YM, text, x, y, col, size, life); }
const yOther = id => (id === 'pink' ? 'mint' : 'pink');
const YM = xMode({
  kind: 'fish', md: 'y', pres: 'yw', dk: 'y', L: YLEVELS, pk: 'y', Eng: Fish, pad: 'k', list: 'ylevels', olist: 'oLevelsY', starsAll: 'yStarsAll',
  label: i => 'บึงที่ ' + th(i + 1), word: 'ตก', goWord: 'ออกเรือ', fresh: 'ยังไม่เคยไป', nextWord: 'บึงถัดไป', againWord: 'ตกบึงนี้อีกรอบ',
  score: G => (G.over ? G.score : Math.max(0, Math.round(G.money))),
  kWords: () => ({ act: 'เหวี่ยง<br>ตวัด', use: 'กรอ<br>สาย' }),
  onLoad() {
    const st = YM.st, G = st.G;
    Object.assign(st, { walk: { pink: 0, mint: 0 }, disp: { pink: G.p.pink.x, mint: G.p.mint.x }, rip: [], drops: [], reelT: { pink: 0, mint: 0 }, catchShow: [], wob: 0, bubbles: [], netAnim: 0 });
  },
  snap: G => ({ st: G.st, over: G.over, s: Object.assign({}, G.stats), mo: Math.round(G.money), l: ['pink', 'mint'].map(id => G.p[id].line.st + ':' + (G.p[id].line.biteT > 0 ? 1 : 0) + ':' + (G.p[id].line.nibT > 0 ? 1 : 0) + ':' + (G.p[id].line.thr ? 1 : 0)),
    sp: ['pink', 'mint'].map(id => { const f = Fish.lineFish(G, id); return f ? f.sp : -1; }), bd: G.bird ? G.bird.st : '', lk: G.leaks.length, tg: G.tangle ? G.tangle.n : -1, nr: G.toss ? G.toss.res.length : -1, nph: G.toss ? G.toss.ph : '', bk: G.bucket.length }),
  changes(p, n) {
    const ev = [], ids = ['pink', 'mint'];
    if (p.st === 'count' && n.st === 'run') ev.push('go');
    if (n.st === 'dusk' && p.st !== 'dusk') ev.push('dusk');
    if (n.st === 'net' && p.st !== 'net') ev.push('net');
    ids.forEach((id, i) => {
      const [a, ab, an, at] = p.l[i].split(':'), [b, bb, bn, bt] = n.l[i].split(':'), sp = n.sp[i] >= 0 ? n.sp[i] : p.sp[i];
      if (a !== b) {
        if (b === 'sink' && a === 'aim') ev.push('cast:' + id);
        else if (b === 'aim') ev.push('aim:' + id);
        else if (b === 'fight' && (a === 'wait' || a === 'sink')) ev.push('hook:' + id + ':' + sp);
        else if (b === 'surface') ev.push('surface:' + id + ':' + sp);
        else if (b === 'fight' && a === 'surface') ev.push('dive:' + id);
        else if (b === 'none' && (a === 'wait' || a === 'sink')) ev.push('reelin:' + id);
      }
      if (bb === '1' && ab !== '1') ev.push('bite:' + id);
      if (bn === '1' && an !== '1') ev.push('nibble:' + id);
      if (bt === '1' && at !== '1' && b === 'fight') ev.push('thrash:' + id);
    });
    const d = k => n.s[k] - p.s[k];
    if (d('fish') + d('junk') > 0) { const id = ids.find((x, i) => n.l[i].startsWith('none') && !p.l[i].startsWith('none') && p.l[i].split(':')[0] !== 'aim') || 'pink'; ev.push((d('netted') ? 'netted:' + yOther(id) : 'land:' + id) + ':' + (p.sp[ids.indexOf(id)] >= 0 ? p.sp[ids.indexOf(id)] : 0)); }
    if (d('snaps')) ev.push('snap:x'); if (d('escapes')) ev.push('escape:x'); if (d('spooked')) ev.push('spook:x'); if (d('missed')) ev.push('missed:x');
    if (d('stolen')) ev.push('stolen:0'); if (d('shoo')) ev.push('shoo:x'); if (d('plugged')) ev.push('plug:x'); if (d('floods')) ev.push('flood'); if (d('tangles')) ev.push('tangle');
    if (n.bd === 'sit' && p.bd !== 'sit') ev.push('birdsit'); if (n.bd && !p.bd) ev.push('bird'); if (n.lk > p.lk) ev.push('leak');
    if (n.tg > p.tg && p.tg >= 0) ev.push('untie:x:' + n.tg); if (n.tg < 0 && p.tg >= 0) ev.push('untangled');
    if (n.nr > p.nr && p.nr >= 0) ev.push('throw:' + (n.s.netFish - p.s.netFish) + ':' + (n.s.syncs > p.s.syncs ? 1 : 0));
    if (n.nph === 'wait' && p.nph !== 'wait') ev.push('netgo');
    if (n.over && !p.over) ev.push('over');
    return ev;
  },
  events(ev) {
    const st = YM.st, G = st.G;
    for (const e of ev) {
      const [k, a, b] = e.split(':'), p = G.p[a], L = p ? p.line : null;
      if (k === 'go') sfx.ilaunch();
      else if (k === 'aim') {}
      else if (k === 'cast') { sfx.fcast(); setTimeout(() => sfx.fplop(), 380); if (L) st.rip.push({ x: L.hx, t: 0, big: 0, delay: .38 }); }
      else if (k === 'nibble') { sfx.fnib(); if (L) st.rip.push({ x: L.hx, t: 0, big: 0 }); }
      else if (k === 'bite') { sfx.fbite(); if (L) { st.rip.push({ x: L.hx, t: 0, big: 1 }); if (!O.role || a === O.local) yFloat('ตวัด!', L.hx, YSY - 30, C.gold, 22, .8); } }
      else if (k === 'spook') { sfx.dznope(); if (p) yFloat('เร็วไป ปลาตกใจหนี', YF.tipX(p), YSY - 50, '#ffb38a', 15); }
      else if (k === 'missed') { sfx.dzmeh(); if (p) yFloat('ช้าไป ปลากินเหยื่อหนีไป', YF.tipX(p), YSY - 50, '#ffb38a', 15); }
      else if (k === 'reelin') {}
      else if (k === 'hook') { sfx.fhook(); const sp = +b; if (p) { yFloat(sp === 8 ? 'ติดอะไรสักอย่าง...' : YF.SP[sp] && YF.SP[sp].sz === 'g' ? 'ตัวใหญ่มาก!!' : 'ติดแล้ว!', YF.tipX(p), YSY - 60, sp === 8 ? '#c9bfef' : C.gold, 18); } if (YF.SP[sp] && YF.SP[sp].sz === 'g') { sfx.fgiant(); S.shake = Math.max(S.shake, .4); } }
      else if (k === 'thrash') { sfx.fthrash(); }
      else if (k === 'snap') { sfx.fsnap(); sfx.fgone(); if (p) yFloat('สายขาด!', YF.tipX(p), YSY - 60, '#ff8a8a', 20); else yFloat('สายขาด!', VW / 2, 200, '#ff8a8a', 20); S.shake = Math.max(S.shake, .3); }
      else if (k === 'escape') { sfx.fgone(); yFloat('ปลาหลุดไปแล้ว...', p ? YF.tipX(p) : VW / 2, YSY - 60, '#ff8a8a', 17); }
      else if (k === 'land' || k === 'netted') {
        const sp = +b, S0 = YF.SP[sp] || YF.SP[0];
        if (S0.sz === 'g') sfx.fbig(); else if (k === 'netted') sfx.fscoop(); else sfx.fland();
        const x = YBX, y = YDECK - 30;
        st.catchShow.push({ sp, t: 0 });
        yFloat((S0.sz === 'j' ? 'รองเท้าบูทเก่า! ' : (YFN[sp] || '') + ' ') + '+' + th(S0.v), x, y - 30, S0.sz === 'j' ? '#c9bfef' : S0.sz === 'g' ? C.gold : '#bfe6ff', S0.sz === 'g' ? 24 : 17, 1.6);
        if (k === 'netted') yFloat('ช้อนสวย!', x, y - 56, a === 'mint' ? C.mint : C.pink, 16);
        burst(x, y, S0.sz === 'g' ? 26 : 10, S0.sz === 'g' ? C.gold : '#bfe6ff', { type: S0.sz === 'g' ? 'star' : undefined, size: 3, speed: 90, up: 70, life: .8, g: 120 });
        if (S0.sz === 'g') S.flash = Math.max(S.flash, .5);
      }
      else if (k === 'surface') { sfx.fsurf(); if (p) { const x = YF.netX(p) + p.face * 26; st.rip.push({ x, t: 0, big: 2 }); burst(x, YSY, 12, '#d6f0ff', { speed: 90, up: 90, life: .6, g: 260, size: 2.5 }); } }
      else if (k === 'dive') { sfx.fdive(); yFloat('ช้อนไม่ทัน ดำน้ำหนีแล้ว!', p ? YF.netX(p) : VW / 2, YSY - 50, '#ffb38a', 16); }
      else if (k === 'giant') { sfx.fgiant(); yFloat('มีเงาใหญ่ๆ ว่ายอยู่ใต้น้ำ...', VW / 2, 130, '#bfe6ff', 17, 2); }
      else if (k === 'bird') { sfx.fcaw(); }
      else if (k === 'birdsit') { sfx.fcaw(); yFloat('นกมาขโมยปลา! ไปไล่เร็ว', YBX, YDECK - 80, '#ffd27a', 16, 1.6); }
      else if (k === 'shoo') { sfx.fshoo(); yFloat('ชู่ว! ไปเลย', YBX, YDECK - 70, C.gold, 16); }
      else if (k === 'stolen') { sfx.fsteal(); yFloat('นกคาบปลาไปแล้ว!', YBX, YDECK - 70, '#ff8a8a', 17, 1.6); }
      else if (k === 'leak') { sfx.fleak(); yFloat('เรือรั่ว!', YBX, YDECK - 70, '#bfe6ff', 18); }
      else if (k === 'plug') { sfx.fplug(); yFloat('อุดแล้ว', p ? p.x : YBX, YDECK - 60, C.gold, 15); }
      else if (k === 'flood') { sfx.fflood(); yFloat('น้ำเข้าเรือ! โดนหัก ' + th(YF.FLOOD_PTS), YBX, YDECK - 80, '#ff8a8a', 19, 1.8); S.shake = Math.max(S.shake, .5); }
      else if (k === 'tangle') { sfx.ftangle(); yFloat('สายพันกัน! กดสลับกันคนละที', VW / 2, 150, '#ffb38a', 18, 1.6); }
      else if (k === 'untie') sfx.funtie();
      else if (k === 'untie1') { sfx.dznope(); if (p) yFloat('ให้อีกคนกดบ้าง', p.x, YDECK - 60, '#ffb38a', 14); }
      else if (k === 'untangled') { sfx.fundone(); yFloat('แกะออกแล้ว!', VW / 2, 150, C.gold, 18); }
      else if (k === 'last20') { sfx.ftick(); yFloat('อีก ๒๐ วินาทีพระอาทิตย์ตก', VW / 2, 120, '#ffd27a', 17, 1.8); }
      else if (k === 'dusk') { sfx.fdusk(); yFloat('ตะวันตกดินแล้ว', VW / 2, 120, C.gold, 22, 2); }
      else if (k === 'net') { sfx.fdusk(); yFloat('ถึงเวลาทอดแห! กดพร้อมกันตอนฝูงปลาเข้าวง', VW / 2, 120, C.gold, 18, 2.4); }
      else if (k === 'netgo') {}
      else if (k === 'netready') { tone(880, .06, 'triangle', .03); }
      else if (k === 'throw') {
        const n = +a, sync = b === '1'; sfx.fnet(); st.netAnim = 1;
        setTimeout(() => { if (n > 0) sfx.fnetok(); else sfx.fnethalf(); }, 700);
        setTimeout(() => yFloat(n > 0 ? `ได้ ${th(n)} ตัว +${th(n * YF.NET_PTS)}${sync ? '' : ' (แหกางครึ่งเดียว)'}` : 'แหเปล่า...', YBX, YDECK - 80, n > 0 ? C.gold : '#ffb38a', 19, 1.6), 700);
      }
    }
  },
  tick() {
    const st = YM.st, G = st.G, q = id => { const k = kInput(id); return { mx: k.mx, my: k.my, act: k.act, use: k.use }; };
    if (!O.role) { YM.events(Fish.step(G, { pink: q('pink'), mint: q('mint') })); st.prev = YM.snap(G); return; }
    const li = q(O.local), rid = O.local === 'pink' ? 'mint' : 'pink';
    st.lastInp = li;
    if (O.role === 'host') {
      const rq = st.remote;
      YM.events(Fish.step(G, { [O.local]: li, [rid]: rq }));
      rq.act = false; st.prev = YM.snap(G);
    } else {
      if (li.act) st.n.a++;
      Fish.step(G, { [O.local]: li, [rid]: { still: true } }, true);
    }
  },
  frameExtra(dt) {
    const st = YM.st, G = st.G;
    for (const id of ['pink', 'mint']) {
      const p = G.p[id], far = Math.abs(p.x - st.disp[id]);
      if (!O.role || id === O.local || far > 90) st.disp[id] = p.x; else st.disp[id] += (p.x - st.disp[id]) * Math.min(1, dt * 14);
      if (p.mv) st.walk[id] += dt * 13;
      // the reel clicks while it turns
      const L = p.line, k = id === O.local || !O.role ? kInput.peek(id) : null;
      if (S.mode === 'play' && L.st === 'fight' && (k ? k.use : false)) { st.reelT[id] -= dt; if (st.reelT[id] <= 0) { st.reelT[id] = .07; sfx.fclick(); } }
    }
    for (const r of st.rip) { if (r.delay > 0) r.delay -= dt; else r.t += dt; }
    st.rip = st.rip.filter(r => r.t < 1.4);
    for (const c of st.catchShow) c.t += dt; st.catchShow = st.catchShow.filter(c => c.t < 1.2);
    st.netAnim = Math.max(0, st.netAnim - dt * .45);
    if (G.def.rain) { for (let i = 0; i < 3; i++) st.drops.push({ x: Math.random() * VW, y: -10, v: 520 + Math.random() * 120 }); for (const d of st.drops) d.y += d.v * dt; st.drops = st.drops.filter(d => { if (d.y > YSY) { if (Math.random() < .25) st.rip.push({ x: d.x, t: .5, big: -1 }); return false; } return true; }); }
    if (Math.random() < dt * 3) st.bubbles.push({ x: Math.random() * VW, y: YF.BED - 4, r: 1 + Math.random() * 2, w: Math.random() * 6 });
    for (const b of st.bubbles) b.y -= dt * (24 + b.r * 6);
    st.bubbles = st.bubbles.filter(b => b.y > YSY + 4);
  },
  result(G, s) {
    const x = G.stats, msg = s === 3 ? (x.giants ? 'ได้ปลายักษ์ด้วย! ไปเล่าให้ใครฟังก็ไม่มีใครเชื่อ' : 'ปลาเต็มถังเลย คืนนี้มีกับข้าวแน่')
      : s === 2 ? (x.snaps ? 'ตกได้เยอะแล้ว แต่สายขาดไปบ้าง ปลาดิ้นเมื่อไหร่ปล่อยมือก่อน' : 'ตกได้เยอะแล้ว ลองช่วยกันดึงปลายักษ์กับช้อนปลาใหญ่ให้ทัน')
      : s === 1 ? 'ได้ปลากลับบ้านแล้ว บึงถัดไปเปิดแล้ว รอให้ทุ่นจมมิดค่อยตวัด จะพลาดน้อยลง'
      : 'ยังได้ปลาไม่พอ ต้องได้อย่างน้อย ' + th(G.def.stars[0]) + ' แต้ม อย่าตวัดตอนทุ่นแค่กระตุก รอให้จมมิดก่อน';
    return { head: 'กลับฝั่งแล้ว', msg,
      stats: `<span>แต้ม <b>${th(G.score)}</b> ปลา <b>${th(x.fish)}</b> ตัว ตัวใหญ่ <b>${th(x.big)}</b> ปลายักษ์ <b>${th(x.giants)}</b> รองเท้าบูท <b>${th(x.junk)}</b></span><span>ช้อนให้กัน <b>${th(x.netted)}</b> สายขาด <b>${th(x.snaps)}</b> ปลาหลุด <b>${th(x.escapes + x.dives)}</b> ตวัดเร็วไป <b>${th(x.spooked)}</b> ช้าไป <b>${th(x.missed)}</b></span><span>นกขโมย <b>${th(x.stolen)}</b> ไล่นก <b>${th(x.shoo)}</b> อุดรูรั่ว <b>${th(x.plugged)}</b> น้ำเข้าเรือ <b>${th(x.floods)}</b> สายพัน <b>${th(x.tangles)}</b> ทอดแหได้ <b>${th(x.netFish)}</b> ตัว</span>` };
  },
  encode() { const st = YM.st; return O.role === 'host' ? Fish.encode(st.G) : Fish.guestMsg(st.G, O.local, st.lastInp, st.n.a); },
  hostHears(m) { Fish.hostHears(YM.st.G, O.local === 'pink' ? 'mint' : 'pink', m, YM.st.remote); },
  guestHears(m) { Fish.apply(YM.st.G, m, O.local); },
  fresher: () => ({ seen: -1, mx: 0, my: 0, act: false, use: false }),
  render: fishRender
});
// what the stick and the hold button say now, without using up a press (for the reel's clicks)
kInput.peek = id => { const a = KK[id], t = KT[id]; return { use: !!(a.use || t.use) }; };

/* ---------- drawing ---------- */
const yLerp = (a, b, k) => a + (b - a) * k;
function yMix(a, b, k) { const p = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), q = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
// the still parts: sky, far shore, the water's body, the bottom with its stones and weed (one picture per lake)
function fishBack(g, def) {
  const night = !!def.night, rain = !!def.rain, W = VW, SY = YSY;
  const sky = g.createLinearGradient(0, 0, 0, SY);
  if (night) { sky.addColorStop(0, '#0b0b26'); sky.addColorStop(.7, '#1d1f4a'); sky.addColorStop(1, '#2c2f63'); }
  else if (rain) { sky.addColorStop(0, '#6f7a92'); sky.addColorStop(1, '#a9b3c4'); }
  else { sky.addColorStop(0, '#7ec4f2'); sky.addColorStop(.75, '#c6e6fa'); sky.addColorStop(1, '#f1f4e4'); }
  g.fillStyle = sky; g.fillRect(0, 0, W, SY + 2);
  const R = rng(night ? 77 : rain ? 55 : 33);
  if (night) { for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,240,${.3 + R() * .6})`; g.fillRect(R() * W, R() * (SY - 60), 1.4, 1.4); } }
  // far hills, then trees on the far bank
  const hill = (y, a, col, seed) => { const r = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, SY); for (let x = 0; x <= W; x += 24) g.lineTo(x, y - Math.sin(x / 180 + seed) * a - r() * 8); g.lineTo(W, SY); g.closePath(); g.fill(); };
  hill(SY - 70, 26, night ? '#25295a' : rain ? '#8792a6' : '#a9cbb8', 2);
  hill(SY - 40, 16, night ? '#1c2148' : rain ? '#6d7a88' : '#7fae8a', 5);
  for (let i = 0; i < 46; i++) { const x = i * 22 + R() * 10, h = 16 + R() * 18, y = SY - 4; g.fillStyle = night ? '#151a3a' : rain ? '#56636e' : (i % 3 ? '#4f8c5c' : '#5d9a63'); g.beginPath(); g.ellipse(x, y - h * .6, 11 + R() * 5, h * .7, 0, 0, Math.PI * 2); g.fill(); }
  // a sala on the far bank, with a little pier
  g.fillStyle = night ? '#2a2650' : '#a5714a'; g.fillRect(150, SY - 34, 46, 24); g.fillStyle = night ? '#3a2f60' : '#c0483e'; g.beginPath(); g.moveTo(140, SY - 32); g.lineTo(173, SY - 54); g.lineTo(206, SY - 32); g.closePath(); g.fill();
  if (night) { g.fillStyle = 'rgba(255,214,120,.8)'; g.fillRect(160, SY - 28, 8, 8); g.fillRect(178, SY - 28, 8, 8); }
  g.fillStyle = night ? '#2a2650' : '#8a5d3e'; g.fillRect(196, SY - 10, 60, 4); for (const x of [200, 222, 248]) g.fillRect(x, SY - 10, 3, 12);
  // the water: lighter near the top, deep and dark at the bottom
  const wg = g.createLinearGradient(0, SY, 0, VH);
  if (night) { wg.addColorStop(0, '#1d3a66'); wg.addColorStop(.5, '#10264a'); wg.addColorStop(1, '#081430'); }
  else if (rain) { wg.addColorStop(0, '#5c8aa0'); wg.addColorStop(.5, '#2f6278'); wg.addColorStop(1, '#173a4c'); }
  else { wg.addColorStop(0, '#5cc0cf'); wg.addColorStop(.45, '#2b8fa6'); wg.addColorStop(1, '#14536b'); }
  g.fillStyle = wg; g.fillRect(0, SY, W, VH - SY);
  // reflections of the far bank
  g.globalAlpha = .18; g.fillStyle = night ? '#25295a' : '#3f7a58'; g.fillRect(0, SY, W, 18); g.globalAlpha = 1;
  // light coming down through the water
  if (!night) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const x = 60 + i * 140 + R() * 40, gr = g.createLinearGradient(0, SY, 0, SY + 220); gr.addColorStop(0, 'rgba(200,250,255,.12)'); gr.addColorStop(1, 'rgba(200,250,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, SY); g.lineTo(x + 34, SY); g.lineTo(x + 90, SY + 230); g.lineTo(x + 40, SY + 230); g.closePath(); g.fill(); } g.restore(); }
  // the bottom: mud and sand, pebbles, a sunken log
  const BED = YF.BED;
  g.fillStyle = night ? '#1a2034' : '#6b5a3e'; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= W; x += 16) g.lineTo(x, BED + 4 + Math.sin(x / 70) * 5 + Math.sin(x / 23) * 2); g.lineTo(W, VH); g.closePath(); g.fill();
  g.fillStyle = night ? '#232a42' : '#8c7550'; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= W; x += 16) g.lineTo(x, BED + 12 + Math.sin(x / 70) * 5); g.lineTo(W, VH); g.closePath(); g.fill();
  for (let i = 0; i < 40; i++) { const x = R() * W, y = BED + 8 + R() * 20; g.fillStyle = night ? 'rgba(120,130,170,.35)' : ['#a29070', '#8a8a86', '#b5a07a'][i % 3]; g.beginPath(); g.ellipse(x, y, 3 + R() * 6, 2 + R() * 3, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = night ? '#232036' : '#4a3424'; rr(g, 690, BED - 2, 110, 14, 7); g.fill(); g.fillStyle = night ? '#2c2840' : '#5d4330'; g.beginPath(); g.ellipse(800, BED + 5, 7, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, VH - 6, W, 6);
}
// weed that sways, in front of the bottom
function fishWeed(g, t, night) {
  for (let i = 0; i < 16; i++) {
    const x = 20 + i * 61 + (i * 37 % 23), h = 30 + (i * 53 % 40), col = night ? '#1f4a4a' : i % 2 ? '#3f8f5a' : '#4fa36a';
    g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const ox = (k - 1) * 5, sw = Math.sin(t * 1.2 + i + k) * 7; g.beginPath(); g.moveTo(x + ox, YF.BED + 8); g.quadraticCurveTo(x + ox + sw * .5, YF.BED - h * .5, x + ox + sw, YF.BED - h + k * 6); g.stroke(); }
  }
}
// a fish, facing dir, of some kind; k: size
function drawFish(g, sp, x, y, dir, t, opt = {}) {
  const S0 = YF.SP[sp] || YF.SP[0], L = S0.len, wig = Math.sin(t * (opt.fast ? 22 : 8) + x * .05) * (opt.fast ? .35 : .18);
  g.save(); g.translate(x, y); g.scale(dir * (opt.k || 1), opt.k || 1); if (opt.tilt) g.rotate(opt.tilt);
  if (sp === 8) { // an old boot
    g.fillStyle = '#4a3a2c'; rr(g, -10, -14, 12, 18, 3); g.fill(); rr(g, -10, -2, 22, 8, 4); g.fill(); g.fillStyle = '#2f241b'; g.fillRect(-10, 4, 22, 3); g.fillStyle = 'rgba(90,160,90,.7)'; g.beginPath(); g.ellipse(-3, -12, 6, 2, .3, 0, Math.PI * 2); g.fill(); g.restore(); return;
  }
  const P = {
    nil: ['#7f8fa8', '#c9d3df', '#4f5f78'], taphian: ['#d8c98a', '#f4ecc8', '#a8913f'], chon: ['#55634a', '#a9b38f', '#2f3a28'], duk: ['#5c5466', '#a8a0b4', '#3a3344'],
    kaphong: ['#9aa9b8', '#e8eef4', '#5d6c7c'], glow: ['#ffb347', '#fff1a8', '#d9771f'], buek: ['#6d7480', '#c4cad2', '#424854'], legend: ['#c9a24a', '#fff0b0', '#8a6a1f']
  }[S0.k] || ['#888', '#ccc', '#555'];
  if (S0.k === 'glow') { g.globalCompositeOperation = 'lighter'; glow(g, '255,190,90', 0, 0, L * 1.2, .45); g.globalCompositeOperation = 'source-over'; }
  if (S0.k === 'legend') glow(g, '255,220,120', 0, 0, L * .9, .3);
  // tail and fins
  g.fillStyle = P[2];
  g.save(); g.translate(-L * .45, 0); g.rotate(wig); g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * .32, -L * .22); g.quadraticCurveTo(-L * .22, 0, -L * .32, L * .22); g.closePath(); g.fill(); g.restore();
  g.beginPath(); g.moveTo(-L * .1, -L * .18); g.quadraticCurveTo(L * .05, -L * .38, L * .18, -L * .2); g.closePath(); g.fill();
  // the body: darker back, light belly
  const gr = g.createLinearGradient(0, -L * .25, 0, L * .25); gr.addColorStop(0, P[0]); gr.addColorStop(.55, P[0]); gr.addColorStop(1, P[1]);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * .5, L * (S0.k === 'chon' || S0.k === 'duk' ? .18 : S0.sz === 'g' ? .2 : .25), 0, 0, Math.PI * 2); g.fill();
  if (S0.k === 'nil') { g.strokeStyle = 'rgba(40,50,70,.35)'; g.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * L * .12, -L * .2); g.lineTo(i * L * .12 - 2, L * .1); g.stroke(); } }
  if (S0.k === 'chon') { g.fillStyle = 'rgba(30,40,20,.45)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(i * L * .14, -L * .02, L * .05, L * .08, 0, 0, Math.PI * 2); g.fill(); } }
  if (S0.k === 'kaphong') { g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(0, -L * .05, L * .38, L * .05, 0, 0, Math.PI * 2); g.fill(); }
  if (S0.k === 'duk' || S0.sz === 'g') { g.strokeStyle = P[2]; g.lineWidth = S0.sz === 'g' ? 2 : 1.2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(L * .45, L * .04); g.quadraticCurveTo(L * .58, L * .1 * s + L * .05, L * .64 + Math.sin(t * 3 + s) * 2, L * .14 * s + L * .08); g.stroke(); } }
  if (S0.k === 'legend') { g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-L * .3 + i * L * .1, -L * .08 + (i % 2) * 4, 2.2, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(L * .08, -L * .1, L * .2, L * .05, -.1, 0, Math.PI * 2); g.fill();
  // eye and a little mouth
  const er = Math.max(2, L * .07);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(L * .3, -L * .05, er, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a1530'; g.beginPath(); g.arc(L * .31, -L * .05, er * .6, 0, Math.PI * 2); g.fill();
  if (opt.mouth) { g.strokeStyle = '#1a1530'; g.lineWidth = 1; g.beginPath(); g.arc(L * .47, L * .03, 2, Math.PI * .7, Math.PI * 1.3); g.stroke(); }
  g.restore();
}
// the rowing boat, from the side, with the water in it, the leaks, the bucket and its fish
function fishBoat(g, G, t) {
  const bob = Math.sin(t * 1.4) * 1.5, x0 = YBX - 156, x1 = YBX + 156, top = YDECK + 2 + bob, bot = YSY + 20 + bob;
  g.save();
  // inside the far wall (seen over the near rim)
  g.fillStyle = '#7a4f30'; g.beginPath(); g.moveTo(x0 + 6, top - 8); g.lineTo(x1 - 6, top - 8); g.lineTo(x1 - 14, top); g.lineTo(x0 + 14, top); g.closePath(); g.fill();
  // the bucket in the middle, with tails sticking out
  const bx = YBX, by = top - 2;
  const tails = Math.min(G.bucket.length, 6);
  for (let i = 0; i < tails; i++) { const sp = G.bucket[G.bucket.length - 1 - i], S0 = YF.SP[sp] || YF.SP[0]; drawFish(g, sp, bx - 8 + i * 3.5, by - 22 - (i % 2) * 3, 1, t, { tilt: -1.3 + i * .35, k: Math.min(1, 30 / S0.len) }); }
  g.fillStyle = '#4a6f9a'; g.beginPath(); g.moveTo(bx - 14, by - 22); g.lineTo(bx + 14, by - 22); g.lineTo(bx + 11, by); g.lineTo(bx - 11, by); g.closePath(); g.fill();
  g.fillStyle = '#6a8fba'; g.fillRect(bx - 14, by - 22, 28, 3); g.strokeStyle = '#2f4a6a'; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, by - 22, 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  if (G.bucket.length > 6) { g.font = `700 10px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('×' + th(G.bucket.length), bx, by - 8); }
  g.restore();
}
function fishHull(g, G, t) {
  const bob = Math.sin(t * 1.4) * 1.5, x0 = YBX - 156, x1 = YBX + 156, top = YDECK + 2 + bob, bot = YSY + 22 + bob;
  // water in the boat
  if (G.water > 1) { const h = (G.water / 100) * 16; g.fillStyle = 'rgba(90,170,210,.75)'; g.fillRect(x0 + 18, top - h, x1 - x0 - 36, h); g.fillStyle = 'rgba(220,245,255,.6)'; for (let x = x0 + 20; x < x1 - 20; x += 14) g.fillRect(x + Math.sin(t * 3 + x) * 3, top - h, 6, 1.2); }
  // the hull
  const hull = new Path2D(); hull.moveTo(x0 - 10, top - 10); hull.quadraticCurveTo(x0 + 10, bot, x0 + 60, bot); hull.lineTo(x1 - 60, bot); hull.quadraticCurveTo(x1 - 10, bot, x1 + 10, top - 10); hull.lineTo(x1 - 6, top); hull.lineTo(x0 + 6, top); hull.closePath();
  const hg = g.createLinearGradient(0, top - 10, 0, bot); hg.addColorStop(0, '#b97b4a'); hg.addColorStop(1, '#7a4a2a');
  g.fillStyle = hg; g.fill(hull);
  g.save(); g.clip(hull); g.strokeStyle = 'rgba(60,30,15,.4)'; g.lineWidth = 1.2; for (let y = top - 4; y < bot; y += 7) { g.beginPath(); g.moveTo(x0 - 10, y); g.lineTo(x1 + 10, y); g.stroke(); }
  g.fillStyle = '#ffcf5a'; g.fillRect(x0, top + 4, x1 - x0, 3); g.restore();
  g.fillStyle = '#5a3520'; rr(g, x0 - 12, top - 12, x1 - x0 + 24, 6, 3); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x0 - 6, top - 11, x1 - x0 + 12, 1.5);
  // a name on the side
  g.font = `400 12px ${FONT_D}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,210,.85)'; g.fillText('สองเรา', YBX + 90, top + 16);
  // the oars, resting
  g.strokeStyle = '#8a5d3e'; g.lineWidth = 3; g.beginPath(); g.moveTo(YBX - 40, top - 6); g.lineTo(YBX - 120, bot + 14); g.stroke(); g.fillStyle = '#8a5d3e'; g.beginPath(); g.ellipse(YBX - 124, bot + 18, 4, 10, -.9, 0, Math.PI * 2); g.fill();
  // leaks: a little fountain coming up from the floor
  for (const l of G.leaks) {
    for (let i = 0; i < 4; i++) { const k = (t * 3 + i / 4) % 1; g.fillStyle = `rgba(160,220,255,${1 - k})`; g.beginPath(); g.arc(l.x + Math.sin(i * 2 + t * 5) * 4 * k, top - 4 - Math.sin(k * Math.PI) * 18, 2.2, 0, Math.PI * 2); g.fill(); }
    if (l.p > 0) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(l.x, top - 24, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (l.p / YF.PLUG_T)); g.stroke(); }
  }
  // the waterline: little waves against the hull
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); for (let x = x0 - 6; x <= x1 + 6; x += 6) g.lineTo(x, YSY + Math.sin(t * 3 + x * .1) * 1.5); g.stroke();
}
// the rod in someone's hands, and the line: to the float and down to the hook, or tight to a fish
function fishRod(g, G, id, x, t) {
  const p = G.p[id], L = p.line, f = p.face, hx = x + f * 10, hy = YDECK - 18;
  let tx = x + f * YF.TIP, ty = YDECK - YF.ROD_UP;
  if (L.st === 'aim') { const pw = YF.aimPower(L), a = -f * (.2 + pw * 1.6); const dx = tx - hx, dy = ty - hy; tx = hx + dx * Math.cos(a) - dy * Math.sin(a); ty = hy + dx * Math.sin(a) + dy * Math.cos(a); }
  const bend = L.st === 'fight' ? 6 + L.ten * .18 : L.biteT > 0 ? 6 : 0;
  if (L.st === 'fight') ty += bend * .8;
  g.strokeStyle = '#5a3a24'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + tx) / 2, (hy + ty) / 2 - 4 + bend * .6, tx, ty); g.stroke();
  g.strokeStyle = '#d9b27a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo((hx + tx) / 2, (hy + ty) / 2 - 3 + bend * .4); g.lineTo(tx, ty); g.stroke();
  g.fillStyle = '#c0c0d0'; g.beginPath(); g.arc(hx + f * 8, hy + 2, 3.2, 0, Math.PI * 2); g.fill();
  if (L.st === 'none' || L.st === 'aim') { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = .8; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx, ty + 12); g.stroke(); return { tx, ty }; }
  if (L.st === 'fight' || L.st === 'surface') {
    const fish = Fish.lineFish(G, id), ex = fish ? fish.x + f * -0 : L.hx, ey = fish ? fish.y : L.hy;
    const k = L.ten / 100, col = L.thr ? `rgba(255,${Math.round(160 - k * 120)},${Math.round(160 - k * 140)},.95)` : `rgba(255,255,255,${.6 + k * .4})`;
    g.strokeStyle = col; g.lineWidth = 1 + k; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, (ty + ey) / 2 + (1 - k) * 20, ex, ey); g.stroke();
    return { tx, ty };
  }
  // the float on the water, the line down to the hook
  const dip = L.biteT > 0 ? 9 + Math.sin(t * 30) * 1.5 : L.nibT > 0 ? 3.5 : Math.sin(t * 2 + id.length) * 1;
  const fx = L.hx, fy = YSY - 3 + dip;
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .9; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + fx) / 2, Math.max(ty, fy) - 8, fx, fy); g.stroke();
  if (L.st !== 'sink' || L.hy > YSY + 2) { g.strokeStyle = 'rgba(230,250,255,.4)'; g.beginPath(); g.moveTo(fx, fy + 4); g.lineTo(L.hx, L.hy); g.stroke(); g.strokeStyle = '#c0c0d0'; g.lineWidth = 1.4; g.beginPath(); g.arc(L.hx - 2, L.hy, 3, 0, Math.PI); g.stroke(); g.fillStyle = '#e8574f'; g.beginPath(); g.arc(L.hx - 5, L.hy - 1, 1.8, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff'; rr(g, fx - 3, fy - 8, 6, 8, 3); g.fill(); g.fillStyle = id === 'pink' ? C.pink : C.mint; rr(g, fx - 3, fy - 10, 6, 5, 2.5); g.fill(); g.fillStyle = '#e8574f'; g.fillRect(fx - 3, fy - 5, 6, 2);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(fx - 4, YSY - 1, 8, 1.2);
  return { tx, ty };
}
function fishBird(g, b, t) {
  const sit = b.st === 'sit', flap = sit ? Math.sin(t * 3) * .1 : Math.sin(t * 14) * .8, dir = b.st === 'out' ? (b.sx < YBX ? -1 : 1) : (b.sx < YBX ? 1 : -1);
  g.save(); g.translate(b.x, b.y); g.scale(dir, 1);
  if (sit) { const peck = Math.max(0, Math.sin(t * 6)) * 4; g.rotate(peck * .04); }
  g.fillStyle = '#f2f2f6'; g.beginPath(); g.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8d8e2'; g.beginPath(); g.ellipse(-4, 2, 9, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -8, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(15, -8); g.lineTo(23, -6); g.lineTo(15, -5); g.closePath(); g.fill();
  g.fillStyle = '#1a1530'; g.beginPath(); g.arc(12, -9, 1.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#a8a8b8'; for (const s of [-1, 1]) { g.save(); g.translate(-2, -3); g.rotate(s * .2 - .4 - flap * (s > 0 ? 1 : .7)); g.beginPath(); g.ellipse(-8, 0, 13, 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  if (sit) { g.strokeStyle = '#ffb347'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, 7); g.lineTo(-2, 12); g.moveTo(3, 7); g.lineTo(3, 12); g.stroke(); }
  if (b.fish != null && b.st === 'out') drawFish(g, b.fish, 22, -3, 1, t, { fast: true, tilt: 1.2 });
  g.restore();
}
function fishRender() {
  const g = ctx, st = YM.st, G = st.G, def = G.def, t = S.time;
  g.setTransform(scale, 0, 0, scale, 0, 0); g.textBaseline = 'alphabetic';
  let ox = 0; if (S.shake > 0) ox = (Math.random() - .5) * 6 * S.shake;
  g.save(); g.translate(ox, 0);
  stamp(g, 'fishBack', def.name, 0, 0, VW, VH, q => fishBack(q, def), true);
  const len = def.time || YF.TIME, day = Math.min(1, G.rt / len), dusk = G.st === 'dusk' || G.st === 'net' ? 1 : day;
  // the sun going down (or the moon), clouds drifting, the evening coming on
  if (def.night) { glow(g, '220,230,255', 760, 70, 60, .35); g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(760, 70, 18, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(200,200,180,.5)'; g.beginPath(); g.arc(754, 66, 4, 0, Math.PI * 2); g.arc(766, 78, 3, 0, Math.PI * 2); g.fill(); }
  else if (!def.rain) { const sx = 340 + dusk * 480, sy = 60 + dusk * dusk * 150; glow(g, dusk > .7 ? '255,150,80' : '255,240,180', sx, sy, 70, .55); g.fillStyle = yMix('#fff6c8', '#ff8a4a', dusk); g.beginPath(); g.arc(sx, sy, 22, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 5; i++) { const x = ((i * 230 + t * (6 + i)) % (VW + 200)) - 100, y = 40 + i * 22; g.fillStyle = def.night ? 'rgba(120,130,180,.25)' : def.rain ? 'rgba(90,96,110,.7)' : 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x, y, 46, 13, 0, 0, Math.PI * 2); g.ellipse(x + 30, y - 6, 30, 12, 0, 0, Math.PI * 2); g.ellipse(x - 30, y + 2, 26, 9, 0, 0, Math.PI * 2); g.fill(); }
  if (!def.night && dusk > .55) { const a = (dusk - .55) / .45; const sg = g.createLinearGradient(0, 0, 0, YSY); sg.addColorStop(0, `rgba(70,40,120,${a * .45})`); sg.addColorStop(1, `rgba(255,120,70,${a * .4})`); g.fillStyle = sg; g.fillRect(0, 0, VW, YSY); }
  // under the water: bubbles, weed, the boots on the bottom, the fish
  for (const b of st.bubbles) { g.strokeStyle = 'rgba(220,250,255,.5)'; g.lineWidth = .8; g.beginPath(); g.arc(b.x + Math.sin(b.y * .05 + b.w) * 3, b.y, b.r, 0, Math.PI * 2); g.stroke(); }
  for (const x of G.junk) drawFish(g, 8, x, YF.BED - 4, 1, t);
  // the shoal at dusk, and where the net goes
  if (G.st === 'net' && G.toss) {
    const n = G.toss, sx = n.ph === 'pull' ? n.sx : Fish.shoalX(G), cnt = def.shoal || 10, ry = 400;
    if (n.ph === 'wait' || n.ph === 'in') {
      const inRing = Math.abs(sx - YBX) < YF.NET_RING * .6;
      g.strokeStyle = inRing ? 'rgba(255,224,120,.9)' : 'rgba(255,255,255,.45)'; g.lineWidth = inRing ? 3 : 2; g.setLineDash([8, 6]); g.beginPath(); g.ellipse(YBX, ry, YF.NET_RING, 34, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (inRing) glow(g, '255,224,120', YBX, ry, 110, .25);
    }
    if (n.ph !== 'pull' || st.netAnim < .55) for (let i = 0; i < cnt; i++) { const a = i * 2.4 + t * .8, r = 12 + (i % 4) * 9; drawFish(g, i % 3 ? 0 : 1, sx + Math.cos(a) * r * 1.4, ry + Math.sin(a) * r * .6, Math.cos(t * 1.5) > 0 ? 1 : -1, t + i, {}); }
  }
  for (const f of G.fish) { if (f.sp === 8 && f.st !== 'hooked') continue; drawFish(g, f.sp, f.x, f.y, f.dir, t, { fast: f.st === 'hooked' || f.st === 'flee', mouth: f.st === 'nib' || f.st === 'bite' }); }
  fishWeed(g, t, def.night);
  // the surface: a bright wavy edge, rings where something touched it
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(0, YSY + 6); for (let x = 0; x <= VW; x += 20) g.lineTo(x, YSY + Math.sin(t * 1.6 + x * .03) * 2); g.lineTo(VW, YSY + 6); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; g.beginPath(); for (let x = 0; x <= VW; x += 20) g.lineTo(x, YSY + Math.sin(t * 1.6 + x * .03) * 2); g.stroke();
  for (const r of st.rip) { if (r.delay > 0) continue; const k = r.t / 1.4, R = (r.big > 1 ? 40 : r.big > 0 ? 26 : r.big < 0 ? 6 : 14) * (.3 + k); g.strokeStyle = `rgba(255,255,255,${(1 - k) * .8})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(r.x, YSY + 1, R, R * .25, 0, 0, Math.PI * 2); g.stroke(); }
  // the boat and the two in it
  fishBoat(g, G, t);
  const tips = {};
  for (const id of ['pink', 'mint']) {
    const p = G.p[id], x = st.disp[id], L = p.line;
    const mood = L.biteT > 0 ? 'o' : L.st === 'fight' && L.thr ? 'o' : st.catchShow.length ? 'happy' : '';
    const by = YDECK + 2 + Math.sin(t * 1.4) * 1.5;
    g.save(); g.translate(x, by); g.scale(1.35, 1.35); g.translate(-x, -by);
    drawPlayer(g, { id, x: x - 12, y: by - 29, w: 24, h: 29, face: p.face, walk: p.mv ? st.walk[id] : 0, sq: L.st === 'fight' && L.thr ? -.12 : 0, mood }, t);
    g.restore();
    tips[id] = fishRod(g, G, id, x, t);
  }
  fishHull(g, G, t);
  // the big net between them
  if (G.st === 'net' && G.toss) {
    const n = G.toss, a = G.p.pink, b = G.p.mint;
    if (n.ph === 'pull' && st.netAnim > 0) {
      const k = 1 - st.netAnim, down = k < .45 ? k / .45 : 1 - (k - .45) / .55, cx = n.sx * .5 + YBX * .5, cy = YSY + down * 150, w = 40 + down * 70;
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(YBX + i * 4, YDECK - 20); g.lineTo(cx + i * w / 4, cy); g.stroke(); }
      g.beginPath(); g.ellipse(cx, cy, w, 8, 0, 0, Math.PI * 2); g.stroke();
      if (k > .45) { const got = n.res[n.res.length - 1] || 0; for (let i = 0; i < Math.min(got, 14); i++) drawFish(g, i % 3 ? 0 : 1, cx - w * .6 + (i % 7) * w * .18, cy - 10 - Math.floor(i / 7) * 8, i % 2 ? 1 : -1, t * 2 + i, { fast: true }); }
    } else {
      g.fillStyle = 'rgba(240,240,250,.85)'; g.strokeStyle = 'rgba(120,120,140,.8)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(st.disp.pink + 8, YDECK - 14); g.quadraticCurveTo(YBX, YDECK + 4 + Math.sin(t * 2) * 2, st.disp.mint - 8, YDECK - 14); g.lineTo(st.disp.mint - 8, YDECK - 8); g.quadraticCurveTo(YBX, YDECK + 12, st.disp.pink + 8, YDECK - 8); g.closePath(); g.fill(); g.stroke();
      for (let i = 1; i < 8; i++) { const x = st.disp.pink + 8 + (st.disp.mint - st.disp.pink - 16) * i / 8; g.beginPath(); g.moveTo(x, YDECK - 12); g.lineTo(x, YDECK); g.stroke(); }
      if (n.p1) { const p = n.p1 === 'pink' ? a : b; g.fillStyle = n.p1 === 'pink' ? C.pink : C.mint; heartPath(g, st.disp[n.p1], YDECK - 64, 7); g.fill(); void p; }
    }
  }
  // the bird
  if (G.bird) fishBird(g, G.bird, t);
  // rain
  if (def.rain) { g.strokeStyle = 'rgba(220,230,255,.45)'; g.lineWidth = 1; g.beginPath(); for (const d of st.drops) { g.moveTo(d.x, d.y); g.lineTo(d.x - 3, d.y - 12); } g.stroke(); }
  // night: a lantern on the boat, the rest a little darker
  if (def.night) { g.fillStyle = 'rgba(10,10,40,.25)'; g.fillRect(0, 0, VW, VH); g.save(); g.globalCompositeOperation = 'lighter'; glow(g, '255,200,120', YBX - 150, YDECK - 40, 120, .35); g.restore(); g.fillStyle = '#ffd27a'; rr(g, YBX - 156, YDECK - 52, 12, 16, 3); g.fill(); g.strokeStyle = '#5a3a24'; g.lineWidth = 2; g.beginPath(); g.moveTo(YBX - 150, YDECK - 52); g.lineTo(YBX - 150, YDECK); g.stroke(); }
  if (G.st === 'dusk' || G.st === 'net') { g.fillStyle = def.night ? 'rgba(0,0,20,.15)' : 'rgba(60,30,80,.12)'; g.fillRect(0, 0, VW, VH); }
  g.restore();
  fishMeters(g, G, t);
  drawParts(g);
  xDrawFloats(g, YM);
  fishHud(g, G, t);
  xCountdown(g, G, YF.START);
  xBannerDraw(g, G, YF.START, def.name, 'กดหนึ่งทีเหวี่ยงเบ็ด กดอีกทีปล่อยสาย ทุ่นจมมิดค่อยกดตวัด กดค้างกรอสาย ปลาดิ้นปล่อยมือ');
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * .4})`; g.fillRect(0, 0, VW, VH); }
  if (O.role && S.mode !== 'menu') drawNetNote(g);
}
// over the heads: the swing gauge, the line's tension, the net timer
function fishMeters(g, G, t) {
  const st = YM.st;
  for (const id of ['pink', 'mint']) {
    const p = G.p[id], L = p.line, x = st.disp[id], col = id === 'pink' ? C.pink : C.mint, y = YDECK - 76;
    if (L.st === 'aim') {
      const pw = YF.aimPower(L); panel(g, x - 34, y - 12, 68, 14, 7, .85);
      const gr = g.createLinearGradient(x - 30, 0, x + 30, 0); gr.addColorStop(0, '#9be07a'); gr.addColorStop(1, '#ffcf5a'); rr(g, x - 30, y - 8, 60 * pw, 6, 3); g.fillStyle = gr; g.fill();
      g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = C.paper; g.fillText('แรงเหวี่ยง', x, y - 16);
    }
    if (L.st === 'fight') {
      const w = 84, k = L.ten / 100; panel(g, x - w / 2 - 4, y - 14, w + 8, 18, 8, .88);
      rr(g, x - w / 2, y - 9, w, 8, 4); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill();
      rr(g, x - w / 2, y - 9, Math.max(6, w * k), 8, 4); g.fillStyle = k > .8 ? (Math.sin(t * 20) > 0 ? '#ff4f4f' : '#ff9a7a') : k > .55 ? '#ffb35a' : '#9be07a'; g.fill();
      g.font = `600 10px ${FONT}`; g.textAlign = 'center'; g.fillStyle = L.thr ? '#ff8a8a' : C.paper; g.fillText(L.thr ? 'ปลาดิ้น! ปล่อยมือ' : L.help ? 'ช่วยกันดึง ×๒' : 'สายตึง', x, y - 18);
      const f = Fish.lineFish(G, id); if (f && YF.SP[f.sp].sz === 'g' && !L.help) { g.fillStyle = '#ffd27a'; g.fillText('หนักมาก ดึงคนเดียวไม่ขึ้น!', x, y - 30); }
    }
    if (L.st === 'surface') { const fx = YF.netX(p) + p.face * 26; g.strokeStyle = 'rgba(21,18,43,.6)'; g.lineWidth = 5; g.beginPath(); g.arc(fx, YSY - 22, 13, 0, Math.PI * 2); g.stroke(); g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.arc(fx, YSY - 22, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (L.netT / YF.NET_T)); g.stroke(); }
  }
  if (G.tangle) { const a = G.p.pink.line, b = G.p.mint.line, x = (a.hx + b.hx) / 2; g.strokeStyle = '#ffb38a'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + Math.sin(t * 3 + i) * 4, YSY - 12 - i * 5, 8, 4, i, 0, Math.PI * 2); g.stroke(); } g.font = `600 11px ${FONT}`; g.textAlign = 'center'; g.fillStyle = C.paper; g.fillText(`แกะสาย ${th(G.tangle.n)}/${th(YF.UNTANGLE)}`, x, YSY - 36); }
}
function fishHud(g, G, t) {
  const c = Fish.clock(G), def = G.def;
  xScoreBox(g, G.st === 'run' || G.st === 'count' ? c.left : 0, Math.max(0, G.money), def.stars, G.st === 'net' ? `ทอดแห ${th(Math.min(3, (G.toss ? G.toss.i : 0) + 1))}/๓` : G.st === 'dusk' ? 'ค่ำแล้ว' : 'แต้ม');
  // the bucket, and how full the boat is getting
  const w = 150, x = VW - 8 - w; panel(g, x, 8, w, 30, 12, .85);
  drawFish(g, 0, x + 18, 23, 1, t); g.font = `600 12px ${FONT}`; g.textAlign = 'left'; g.fillStyle = C.paper;
  g.fillText(`ในถัง ${th(G.stats.fish)} ตัว${G.stats.giants ? ' · ยักษ์ ' + th(G.stats.giants) : ''}`, x + 34, 27);
  if (G.water > 0.5 || G.leaks.length) {
    panel(g, x, 42, w, 24, 10, .85); g.font = `600 10px ${FONT}`; g.fillStyle = '#bfe6ff'; g.fillText('น้ำในเรือ', x + 10, 58);
    rr(g, x + 62, 51, w - 72, 7, 3.5); g.fillStyle = 'rgba(255,255,255,.15)'; g.fill(); rr(g, x + 62, 51, Math.max(4, (w - 72) * G.water / 100), 7, 3.5); g.fillStyle = G.water > 70 ? (Math.sin(t * 12) > 0 ? '#ff6b6b' : '#ffb38a') : '#7fc8ff'; g.fill();
  }
  if (S.mode !== 'play' || G.over) return;
  // a word over each head when it helps (your own only, online)
  const st = YM.st;
  if (G.st === 'net') { if (G.toss && G.toss.ph === 'wait') { const id = O.role ? O.local : 'pink', tx = G.toss.p1 ? `${S.names[G.toss.p1] || ''}กดแล้ว! อีกคนกดเลย` : 'กดพร้อมกัน ตอนฝูงปลาเข้าวง'; g.font = `600 13px ${FONT}`; const w = g.measureText(tx).width + 24; panel(g, VW / 2 - w / 2, YDECK - 124, w, 24, 12, .88); g.fillStyle = G.toss.p1 ? C.gold : C.paper; g.textAlign = 'center'; g.fillText(tx, VW / 2, YDECK - 107); void id; } return; }
  for (const id of ['pink', 'mint']) {
    if (O.role && id !== O.local) continue;
    const tg = Fish.target(G, id), p = G.p[id], L = p.line, o = S.names[yOther(id)] || 'อีกคน', x = st.disp[id], y = YDECK - 82 - (L.st === 'aim' ? 26 : 0);
    let tip = '';
    if (G.st === 'net') tip = G.toss && G.toss.ph === 'wait' ? 'กดพร้อมกัน ตอนฝูงปลาเข้าวง' : '';
    else if (tg === 'aim') tip = 'กดอีกที ปล่อยสาย';
    else if (tg === 'wait' || tg === 'sink') tip = L.biteT > 0 ? 'ตวัดเลย!!' : L.nibT > 0 ? 'รอก่อน...' : G.t < YF.START + 25 && tg === 'wait' ? '↑↓ ปรับความลึก' : '';
    else if (tg === 'fight') tip = L.thr ? 'ปล่อยมือก่อน!' : 'กดค้าง กรอสาย';
    else if (tg === 'surface') tip = `ให้${o}เอาสวิงมาช้อน`;
    else if (tg === 'selfscoop') tip = 'กด ช้อนเองเลย';
    else if (tg === 'goscoop') tip = `ไปช้อนปลาให้${o}!`;
    else if (tg === 'scoop') tip = 'กดช้อน!';
    else if (tg === 'goshoo') tip = 'นกมาขโมยปลา! ไปไล่';
    else if (tg === 'shoo') tip = 'กดไล่นก!';
    else if (tg === 'untie') tip = 'กดสลับกันแกะสาย';
    else if (tg === 'gohelp') tip = `ไปช่วย${o}ดึงปลายักษ์!`;
    else if (tg === 'help') tip = 'กดค้างช่วยดึง';
    else if (tg === 'goplug') tip = 'เรือรั่ว! ไปยืนตรงรู';
    else if (tg === 'plug') tip = 'กดค้าง อุดรู';
    else if (tg === 'none' && G.st === 'run' && G.t < YF.START + 8) tip = 'กดเหวี่ยงเบ็ด';
    if (tip) xTip(g, id, tip, x, y - (L.st === 'fight' ? 40 : 0));
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
  S.music = store.get('music', true) !== false; bgmOn.checked = S.music;
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
try { Object.defineProperty(window, '__tsr', { value: { S, KS, DS, RS, TS, MS, WS, LS, BS, VS, IS, O, KK, KT, Twr, Leg, Boat, Mov, Kite, MODES, XK, Cin, Fart, Bed, Win, Trap, Isle, SM, Shop, OM, Fish, YM, WARD, wardStars, ART: { drawPlayer, roundBody, cuteFace, wardDoll, drawChef }, VOICE: { say, sayBoth, MOODS, VO }, GO: { kit: startKitchen, def: startDefense, drv: startDrive, tak: startTak, mus: startMus, twr: startTwr, leg: startLeg, boat: startBoat, mov: startMov, kite: startKite, adv: startLevel }, BGMX: { TRACKS, bgmStep, mixerFor, stepDur, trackPrep, BGM, soundsInto, sfx } }, configurable: true }); } catch (e) {}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ names: S.names, li: S.li })); } catch (e) {}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();

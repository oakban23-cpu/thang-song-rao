/* One blanket (แย่งผ้าห่ม). Two sleepers on one bed under one blanket, with the air conditioner on. Each player moves
   their own sleeper across the bed and can pull the blanket toward themselves; both pulling against each other is a
   tug-of-war that wakes them. Covered, a sleeper warms up; uncovered, they get cold; lying close together (spooning)
   they keep each other warm; too warm is no good either. In the night a sleeper kicks the blanket off, rolls away
   wrapped in it, or farts under it (lift the blanket to air it out, at the cost of a chill); a mosquito comes to bite
   (slap it while it sits: on yourself it wakes you a little, on your partner a lot). Discomfort fills each sleeper's
   wake meter; full, they wake up (a strike). Points for every second both sleep well. The bed runs across x (0..BW). */
const Bed = (() => {
  'use strict';
  const DT = 1 / 120, START = 2, BW = 240, HB = 26, GAP = 40, SPOON = 50;
  const ROLL = 55, PULL = 75, COSY = 62, CHILL = 7, SPOON_H = 10, WARM_K = 0.45, BAND = [35, 78], DISCOMFORT = 0.8, TUG = 10, Z_DOWN = 3;
  const BITE = 30, LAND = 1.6, SLAP_SELF = 8, SLAP_PARTNER = 20, MISS = 5, KILL = 20;
  const STINK = 100, STINK_DOWN = 5, STINK_Z = 0.22, FLAP = 60, FLAP_CHILL = 12;
  const TELL = 0.9, HOT = 22, KICK = 70, ROLLAWAY = 40, AWAKE_T = 2.5, STRIKES = 3, RATE = 10;
  const WHO = ['pink', 'mint'], other = w => (w === 'pink' ? 'mint' : 'pink');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // the night's happenings, the same on both phones: { t, kind, who }
  function night(def) {
    const R = rng(def.seed || 5), out = [];
    for (const [kind, n] of Object.entries(def.events || {})) for (let i = 0; i < n; i++) out.push({ t: START + 6 + R() * (def.time - 12), kind, who: R() < 0.5 ? 'pink' : 'mint', done: false });
    out.sort((a, b) => a.t - b.t);
    // keep them a few seconds apart
    for (let i = 1; i < out.length; i++) out[i].t = Math.max(out[i].t, out[i - 1].t + 3.5);
    return out.filter(e => e.t < START + def.time - 3);
  }
  // sleepers drift about in their sleep (each player has to keep theirs on the bed): px/s at time t
  function driftAt(G, w, t) {
    const d = G.def.drift || 0, p = G.ph[w];
    return d * (Math.sin(t * 0.9 + p[0]) + 0.6 * Math.sin(t * 2.3 + p[1])) / 1.6;
  }
  function load(def) {
    const s = def.start || [90, 150], R = rng((def.seed || 5) * 31 + 7);
    return {
      def, evs: night(def), ph: { pink: [R() * 6.3, R() * 6.3], mint: [R() * 6.3, R() * 6.3] }, hot: { pink: 0, mint: 0 }, t: 0, st: 'count', over: false, failed: false,
      x: { pink: s[0], mint: s[1] }, c: def.blanketAt || (s[0] + s[1]) / 2, H: { pink: 55, mint: 55 }, Z: { pink: 10, mint: 10 }, awake: { pink: 0, mint: 0 },
      pull: { pink: false, mint: false }, tug: false, stink: 0, stinkWho: null, roll: null, tell: null, cold: def.ac || 7,
      mq: null, strikes: 0, score: 0, stats: { wakes: 0, bites: 0, kills: 0, slapsOnPartner: 0, flaps: 0, tugs: 0, spoon: 0 }, net: null
    };
  }
  const HW = G => G.def.blanket / 2;
  function cover(G, w) { const a = Math.max(G.x[w] - HB, G.c - HW(G)), b = Math.min(G.x[w] + HB, G.c + HW(G)); return clamp((b - a) / (2 * HB), 0, 1); }
  const spooning = G => G.x.mint - G.x.pink <= SPOON;
  const comfy = (G, w) => G.H[w] >= BAND[0] && G.H[w] <= BAND[1];
  const coldAt = G => (G.def.ac || 7) * (G.def.blasts || []).reduce((k, [a, b, m]) => (G.t - START >= a && G.t - START < b ? k * m : k), 1);
  function wake(G, w, why, ev) {
    if (G.awake[w] > 0) return;
    G.awake[w] = AWAKE_T; G.Z[w] = 35; G.strikes++; G.stats.wakes++; ev.push(`wake:${w}:${why}`);
    if (G.strikes >= (G.def.strikes || STRIKES) && !G.over) { G.over = true; G.failed = true; ev.push('failed'); }
  }
  function moveTo(G, w, x) {
    const lo = w === 'pink' ? HB : G.x.pink + GAP, hi = w === 'pink' ? G.x.mint - GAP : BW - HB;
    G.x[w] = clamp(x, lo, hi);
  }
  /* one step. inp: { pink: { mx, pull, act }, mint: ... }. guest: positions move, nothing is decided */
  function step(G, inp, guest) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    const def = G.def, q = w => (inp && inp[w]) || {};
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    // moving and pulling (someone awake sits up and does neither)
    for (const w of WHO) {
      const i = q(w), up = G.awake[w] > 0, mx = clamp(Number.isFinite(i.mx) ? i.mx : 0, -1, 1);
      if (!up && !(G.roll && G.roll.who === w)) moveTo(G, w, G.x[w] + ((Math.abs(mx) > 0.15 ? mx * ROLL : 0) + driftAt(G, w, G.t)) * DT);
      G.pull[w] = !up && !!i.pull;
    }
    const dirTo = w => Math.sign(G.x[w] - G.c);
    G.tug = G.pull.pink && G.pull.mint && dirTo('pink') !== dirTo('mint') && dirTo('pink') !== 0 && dirTo('mint') !== 0;
    if (!G.tug) for (const w of WHO) if (G.pull[w]) { const d = G.x[w] - G.c; G.c += Math.sign(d) * Math.min(Math.abs(d), PULL * DT); }
    G.c = clamp(G.c, -HW(G) * 0.5, BW + HW(G) * 0.5);
    if (guest) return ev;
    for (const w of WHO) if (G.awake[w] === 0 && (w === 'pink' ? G.x.pink <= HB + 0.01 : G.x.mint >= BW - HB - 0.01)) {
      ev.push('fall:' + w); wake(G, w, 'fall', ev); moveTo(G, w, w === 'pink' ? HB + 50 : BW - HB - 50);
    }
    if (G.tug) { for (const w of WHO) G.Z[w] += TUG * DT; if (!G.tugWas) { G.stats.tugs++; ev.push('tug'); } }
    G.tugWas = G.tug;
    // the night's happenings: a tell first (a twitch, a rumble), then it happens
    for (const e of G.evs) {
      if (e.done || G.t < e.t - TELL) continue;
      if (!e.told) { e.told = true; G.tell = { kind: e.kind, who: e.who, at: e.t }; ev.push(`tell:${e.kind}:${e.who}`); }
      if (G.t < e.t) continue;
      e.done = true; G.tell = null;
      const w = e.who, away = w === 'pink' ? -1 : 1;
      if (e.kind === 'kick') { G.c -= away * KICK; ev.push('kick:' + w); }
      else if (e.kind === 'roll') { G.roll = { who: w, left: 0.6, wrap: cover(G, w) > 0.3 }; ev.push('roll:' + w); }
      else if (e.kind === 'fart') { G.stink = STINK; G.stinkWho = w; ev.push('fart:' + w); }
      else if (e.kind === 'hot') { G.hot[w] = 9; ev.push('hot:' + w); }
      else if (e.kind === 'mosquito') { if (!G.mq) { G.mq = { x: BW / 2, y: -40, st: 'fly', tLeft: 2.5, on: null }; ev.push('mosquito'); } }
    }
    if (G.roll) {
      const w = G.roll.who, away = w === 'pink' ? -1 : 1, d = ROLLAWAY / 0.6 * DT, x0 = G.x[w];
      moveTo(G, w, G.x[w] + away * d);
      if (G.roll.wrap) G.c += G.x[w] - x0;
      G.roll.left -= DT; if (G.roll.left <= 0) G.roll = null;
    }
    G.c = clamp(G.c, -HW(G) * 0.5, BW + HW(G) * 0.5);
    // the mosquito: flies about, sits on someone, bites if left there
    const M = G.mq;
    if (M) {
      M.tLeft -= DT;
      if (M.st === 'fly') {
        M.x += Math.sin(G.t * 5.3) * 60 * DT; M.y = -30 + Math.sin(G.t * 3.7) * 18;
        if (M.tLeft <= 0) { const w = cover(G, 'pink') < cover(G, 'mint') ? 'pink' : 'mint'; M.st = 'sit'; M.on = w; M.tLeft = LAND; M.x = G.x[w]; ev.push('land:' + w); }
      } else {
        M.x = G.x[M.on];
        if (M.tLeft <= 0) { G.Z[M.on] += BITE; G.stats.bites++; ev.push('bite:' + M.on); M.st = 'fly'; M.on = null; M.tLeft = 2 + (G.t * 7 % 2); }
      }
    }
    // the button: slap the mosquito where it sits, or (if something stinks) lift the blanket to air it
    for (const w of WHO) {
      if (!q(w).act || G.awake[w] > 0) continue;
      if (G.mq) {
        if (G.mq.st === 'sit') {
          const on = G.mq.on; G.Z[on] += on === w ? SLAP_SELF : SLAP_PARTNER; G.score += KILL; G.stats.kills++; if (on !== w) G.stats.slapsOnPartner++;
          ev.push(`slap:${w}:${on}`); G.mq = null;
        } else { G.Z[w] += MISS; ev.push('miss:' + w); }
      } else if (G.stink > 0) { G.stink = Math.max(0, G.stink - FLAP); for (const v of WHO) { G.H[v] -= FLAP_CHILL; G.Z[v] += 3; } G.stats.flaps++; ev.push('flap:' + w); }
    }
    // warmth, smells, and the wake meters
    const cold = coldAt(G), sp = spooning(G);
    if (sp) G.stats.spoon += DT;
    for (const w of WHO) {
      const cv = cover(G, w);
      // warmth settles toward cosy under the blanket, toward cold out of it (colder the stronger the air), warmer together
      if (G.hot[w] > 0) G.hot[w] = Math.max(0, G.hot[w] - DT);
      const target = COSY - (1 - cv) * cold * CHILL + (sp ? SPOON_H : 0) + (G.hot[w] > 0 ? HOT : 0);
      G.H[w] = clamp(G.H[w] + (target - G.H[w]) * WARM_K * DT, 0, 100);
      if (G.stink > 0 && cv > 0.3) G.Z[w] += G.stink * STINK_Z * DT;
      if (G.H[w] < BAND[0]) G.Z[w] += (BAND[0] - G.H[w]) * DISCOMFORT * DT;
      else if (G.H[w] > BAND[1]) G.Z[w] += (G.H[w] - BAND[1]) * DISCOMFORT * DT;
      else if (!G.tug && !(G.stink > 0 && cv > 0.3)) G.Z[w] = Math.max(0, G.Z[w] - Z_DOWN * DT);
      if (G.awake[w] > 0) { G.awake[w] = Math.max(0, G.awake[w] - DT); if (G.awake[w] === 0) ev.push('sleep:' + w); }
      else if (G.Z[w] >= 100) wake(G, w, G.H[w] < BAND[0] ? 'cold' : G.H[w] > BAND[1] ? 'hot' : 'other', ev);
      G.Z[w] = clamp(G.Z[w], 0, 100);
    }
    G.stink = Math.max(0, G.stink - STINK_DOWN * DT);
    // points: both asleep, the comfier the better
    if (G.awake.pink === 0 && G.awake.mint === 0) {
      const n = (comfy(G, 'pink') ? 1 : 0) + (comfy(G, 'mint') ? 1 : 0), cv = (cover(G, 'pink') + cover(G, 'mint')) / 2;
      G.score += (RATE * [0.2, 0.5, 1][n] * (0.3 + 0.7 * cv) + (sp ? 3 : 0)) * DT;
    }
    if (!G.over && G.t - START >= def.time) { G.over = true; ev.push('morning'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  function encode(G) {
    const M = G.mq;
    return { t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, fl: G.failed ? 1 : 0, x: [r1(G.x.pink), r1(G.x.mint)], c: r1(G.c), H: [r1(G.H.pink), r1(G.H.mint)], Z: [r1(G.Z.pink), r1(G.Z.mint)],
      aw: [r3(G.awake.pink), r3(G.awake.mint)], pl: [G.pull.pink ? 1 : 0, G.pull.mint ? 1 : 0], tg: G.tug ? 1 : 0, sk: r1(G.stink), sw: G.stinkWho,
      ht: [r3(G.hot.pink), r3(G.hot.mint)], ro: G.roll ? [G.roll.who, r3(G.roll.left), G.roll.wrap ? 1 : 0] : 0, te: G.tell ? [G.tell.kind, G.tell.who, r3(G.tell.at)] : 0,
      mq: M ? [r1(M.x), r1(M.y), M.st, M.on, r3(M.tLeft)] : 0, ed: G.evs.map(e => (e.done ? 2 : e.told ? 1 : 0)), x2: G.strikes, p: Math.round(G.score * 10) / 10, s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const isWho = w => w === 'pink' || w === 'mint';
  function apply(G, m, soft) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.failed = !!m.fl;
    const b = soft ? 0.35 : 1;
    WHO.forEach((w, i) => {
      if (Array.isArray(m.x)) G.x[w] = clamp(G.x[w] + (num(m.x[i], G.x[w]) - G.x[w]) * b, HB, BW - HB);
      if (Array.isArray(m.H)) G.H[w] = clamp(num(m.H[i], G.H[w]), 0, 100);
      if (Array.isArray(m.Z)) G.Z[w] = clamp(num(m.Z[i], G.Z[w]), 0, 100);
      if (Array.isArray(m.aw)) G.awake[w] = clamp(num(m.aw[i], 0), 0, AWAKE_T);
      if (Array.isArray(m.pl)) G.pull[w] = !!m.pl[i];
    });
    if (Array.isArray(m.ht)) WHO.forEach((w, i) => { G.hot[w] = clamp(num(m.ht[i], 0), 0, 9); });
    G.c = G.c + (num(m.c, G.c) - G.c) * b; G.tug = !!m.tg; G.stink = clamp(num(m.sk, 0), 0, STINK); G.stinkWho = isWho(m.sw) ? m.sw : null;
    G.roll = Array.isArray(m.ro) && isWho(m.ro[0]) ? { who: m.ro[0], left: num(m.ro[1], 0), wrap: !!m.ro[2] } : null;
    G.tell = Array.isArray(m.te) && isWho(m.te[1]) ? { kind: String(m.te[0]), who: m.te[1], at: num(m.te[2], G.t) } : null;
    G.mq = Array.isArray(m.mq) && (m.mq[2] === 'fly' || m.mq[2] === 'sit') ? { x: num(m.mq[0], BW / 2), y: num(m.mq[1], -30), st: m.mq[2], on: isWho(m.mq[3]) ? m.mq[3] : null, tLeft: num(m.mq[4], 1) } : null;
    if (G.mq && G.mq.st === 'sit' && !G.mq.on) G.mq.st = 'fly';
    if (Array.isArray(m.ed) && m.ed.length === G.evs.length) G.evs.forEach((e, i) => { e.done = m.ed[i] === 2; e.told = m.ed[i] >= 1; });
    G.strikes = clamp(num(m.x2, G.strikes) | 0, 0, 9); G.score = Math.max(0, num(m.p, G.score));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }

  return { DT, START, BW, HB, GAP, SPOON, ROLL, PULL, BAND, BITE, LAND, KILL, STINK, TELL, AWAKE_T, STRIKES, RATE,
    night, driftAt, load, step, cover, spooning, comfy, coldAt, stars, encode, apply };
})();

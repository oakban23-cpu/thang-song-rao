/* No farting at the table (ห้ามตด). One player has a rumbling tummy (gas), the other covers for them (cover). Gas
   builds up; the gas player can clench (it builds slower, but they go red and cannot hold forever) and lets one go
   with a button: it sounds a moment later (DELAY), as loud as the gas built up. The cover player can cough or scrape
   a chair; a fart that sounds while a cough or a scrape is going (or while the restaurant is noisy anyway: a plate
   smashing, music, laughter at the next table) goes unheard and scores, bigger ones more. Heard: a strike. Covering
   when there is nothing to cover looks odd: too much of it is a strike as well. A big one let go while the fan blows
   toward the other diners gets smelled: a strike. Three strikes and the dinner is ruined. Presses carry their own times
   (both phones share a clock), so a cover pressed on the other phone counts from when it was pressed.
   Roles: inp.gas = { hold, release: time or null }, inp.cover = { cough: time or null, chair: time or null }. */
const Fart = (() => {
  'use strict';
  const DT = 1 / 120, START = 2, DELAY = 0.55, GRACE = 0.3, QUIET = 15, MIN_GAS = 10, AGAIN = 1.2;
  const HOLD_K = 0.35, STRAIN_UP = 28, STRAIN_DOWN = 18;
  const COUGH = { from: 0.05, to: 0.6, str: 55, cd: 0.35, odd: 10 }, CHAIR = { from: 0.1, to: 1.1, str: 100, cd: 5, odd: 22 };
  const ODD_DOWN = 4, STRIKES = 3, SMELL = 70, FINISH = 100;
  const AMB = { plate: { dur: 0.6, str: 100 }, music: { dur: 4, str: 55 }, laugh: { dur: 1.6, str: 70 }, kid: { dur: 2.2, str: 80 }, thunder: { dur: 1.2, str: 100 }, clap: { dur: 2.5, str: 85 } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r3 = v => Math.round(v * 1000) / 1000;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // the restaurant's own noises, the same on both phones: [from, until, strength, kind]
  function noises(def) {
    const R = rng(def.seed || 7), out = [], a = def.ambient;
    if (a) for (let t = START + a.first; t < START + def.time; t += a.every[0] + R() * (a.every[1] - a.every[0])) {
      const kind = a.kinds[Math.floor(R() * a.kinds.length)], k = AMB[kind];
      out.push([t, t + k.dur, k.str, kind]);
    }
    return out;
  }
  // extra gas from what they eat: [from, until, extra per second]
  const gasAt = (def, t) => (def.gas || 6) + (def.food || []).reduce((s, f) => s + (t - START >= f[0] && t - START < f[1] ? f[2] : 0), 0);
  // the fan swings back and forth; toward the diners for the first half of each swing
  const fanAt = (def, t) => (def.fan ? (((t - START) / def.fan) % 1 + 1) % 1 : -1);
  const fanToward = (def, t) => def.fan > 0 && fanAt(def, t) < 0.5;
  function load(def) {
    return { def, amb: noises(def), t: 0, st: 'count', over: false, ruined: false, P: 0, strain: 0, hold: false, odd: 0, strikes: 0, score: 0,
      farts: [], covers: [], last: { cough: -9, chair: -9 }, lastGo: -9, stats: { farts: 0, hidden: 0, heard: 0, smelled: 0, odd: 0, slips: 0, ambient: 0, biggest: 0 }, net: null };
  }
  const ambientAt = (G, t) => G.amb.reduce((m, [a, b, s]) => (t >= a && t < b ? Math.max(m, s) : m), 0);
  function letGo(G, t, forced, ev) {
    const size = Math.round(G.P);
    G.P = 0; G.lastGo = t; G.strain = Math.max(0, G.strain - 40);
    G.farts.push({ t, ts: t + (forced ? 0.15 : DELAY), size, forced, judged: false });
    G.stats.farts++; G.stats.biggest = Math.max(G.stats.biggest, size);
    ev.push((forced ? 'slip:' : 'release:') + size);
    if (forced) G.stats.slips++;
  }
  function strike(G, why, ev) {
    G.strikes++; ev.push('strike:' + why);
    if (G.strikes >= (G.def.strikes || STRIKES) && !G.over) { G.over = true; G.ruined = true; ev.push('ruined'); }
  }
  function cover(G, kind, t, ev) {
    const K = kind === 'chair' ? CHAIR : COUGH;
    if (t - G.last[kind] < K.cd) return;
    G.last[kind] = t;
    G.covers.push({ kind, a: t + K.from, b: t + K.to, str: K.str, used: false, done: false });
    ev.push(kind + ':' + r3(t));
  }
  /* one step. guest: the clock and the gas meter run on, nothing is judged (the host does that) */
  function step(G, inp, guest) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    const def = G.def, gi = (inp && inp.gas) || {}, ci = (inp && inp.cover) || {};
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    const now = t => (Number.isFinite(t) ? clamp(t, G.t - 1, G.t) : null);
    // the cover player's noises
    for (const k of ['cough', 'chair']) { const t = now(ci[k]); if (t != null) cover(G, k, t, ev); }
    // the gas
    G.hold = !!gi.hold;
    G.P = Math.min(100, G.P + gasAt(def, G.t) * (G.hold ? HOLD_K : 1) * DT);
    G.strain = clamp(G.strain + (G.hold ? STRAIN_UP : -STRAIN_DOWN) * DT, 0, 100);
    const rt = now(gi.release);
    if (rt != null && G.P >= MIN_GAS && rt - G.lastGo >= AGAIN) letGo(G, rt, false, ev);
    else if (!guest && (G.P >= 100 || G.strain >= 100)) letGo(G, G.t, true, ev);
    if (guest) { if (G.t - START >= def.time) G.t = START + def.time; return ev; }
    // judge each fart once everything that could cover it has had time to arrive
    for (const f of G.farts) {
      if (f.judged || G.t < f.ts + GRACE) continue;
      f.judged = true;
      const by = G.covers.filter(c => f.ts >= c.a && f.ts < c.b), amb = ambientAt(G, f.ts);
      const mask = Math.max(amb, ...by.map(c => c.str));
      by.forEach(c => { c.used = true; });
      if (f.size < QUIET || f.size <= mask) {
        const pts = f.size < QUIET ? 1 : Math.round((10 + f.size * 0.9) * (amb >= f.size ? 1.3 : 1));
        G.score += pts; G.stats.hidden++; if (amb >= f.size && f.size >= QUIET) G.stats.ambient++;
        f.res = f.size < QUIET ? 'silent' : amb >= f.size ? 'ambient' : 'hidden'; f.pts = pts;
        ev.push(`hidden:${f.size}:${pts}:${f.res}`);
      } else { f.res = 'heard'; G.stats.heard++; ev.push('heard:' + f.size); strike(G, 'heard', ev); }
      if (!G.over && f.size >= SMELL && fanToward(def, f.ts)) { f.smelled = true; G.stats.smelled++; ev.push('smelled:' + f.size); strike(G, 'smell', ev); }
    }
    G.farts = G.farts.filter(f => !f.judged || G.t - f.ts < 3);
    // covers that covered nothing look odd (decided once they are over and nothing could still land in them)
    for (const c of G.covers) {
      if (c.done || G.t < c.b + GRACE) continue;
      c.done = true;
      if (!c.used) { G.odd += (c.kind === 'chair' ? CHAIR.odd : COUGH.odd) * (def.oddK || 1); ev.push('odd:' + c.kind); }
    }
    G.covers = G.covers.filter(c => !c.done || G.t - c.b < 2);
    if (G.odd >= 100) { G.odd = 30; G.stats.odd++; strike(G, 'odd', ev); }
    G.odd = Math.max(0, G.odd - ODD_DOWN * DT);
    if (!G.over && G.t - START >= def.time) { G.over = true; G.score += FINISH; ev.push('end'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  function encode(G) {
    return { t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, ru: G.ruined ? 1 : 0, P: Math.round(G.P * 10) / 10, sn: Math.round(G.strain * 10) / 10, h: G.hold ? 1 : 0,
      o: Math.round(G.odd * 10) / 10, x: G.strikes, p: G.score, lc: [r3(G.last.cough), r3(G.last.chair)], lg: r3(G.lastGo),
      f: G.farts.map(f => [r3(f.t), r3(f.ts), f.size, f.forced ? 1 : 0, f.judged ? 1 : 0, f.res || '', f.pts || 0, f.smelled ? 1 : 0]),
      c: G.covers.map(c => [c.kind === 'chair' ? 1 : 0, r3(c.a), r3(c.b), c.used ? 1 : 0, c.done ? 1 : 0]), s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  // own: on the guest, which role it plays (its own gas meter or covers are not overwritten by older news)
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.ruined = !!m.ru;
    G.P = clamp(num(m.P, G.P), 0, 100); G.strain = clamp(num(m.sn, G.strain), 0, 100);
    if (own !== 'gas') G.hold = !!m.h;
    G.odd = clamp(num(m.o, G.odd), 0, 100); G.strikes = clamp(num(m.x, G.strikes) | 0, 0, 9); G.score = Math.max(0, num(m.p, G.score));
    if (own !== 'gas') G.lastGo = num(m.lg, G.lastGo);
    if (Array.isArray(m.lc) && own !== 'cover') { G.last.cough = num(m.lc[0], G.last.cough); G.last.chair = num(m.lc[1], G.last.chair); }
    if (Array.isArray(m.f)) G.farts = m.f.filter(Array.isArray).slice(0, 40).map(q => ({ t: num(q[0], 0), ts: num(q[1], 0), size: clamp(num(q[2], 0), 0, 100), forced: !!q[3], judged: !!q[4],
      res: ['hidden', 'ambient', 'silent', 'heard'].includes(q[5]) ? q[5] : undefined, pts: num(q[6], 0), smelled: !!q[7] }));
    if (Array.isArray(m.c)) G.covers = m.c.filter(Array.isArray).slice(0, 40).map(q => ({ kind: q[0] ? 'chair' : 'cough', a: num(q[1], 0), b: num(q[2], 0), str: q[0] ? CHAIR.str : COUGH.str, used: !!q[3], done: !!q[4] }));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }

  return { DT, START, DELAY, GRACE, QUIET, MIN_GAS, AGAIN, HOLD_K, COUGH, CHAIR, STRIKES, SMELL, FINISH, AMB, noises, gasAt, fanAt, fanToward, ambientAt, load, step, stars, encode, apply };
})();

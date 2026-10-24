/* Three-legged race (วิ่งสามขา): pink's right leg and mint's left leg are tied together ("in"); each player also has
   an outer leg ("out"). A step happens only when both press the same leg, alternating in, out, in, out. How close
   together the two presses land decides the stride; pressing the wrong leg, pressing different legs, rushing, or
   leaving the partner standing on one leg costs balance, and when balance runs out the pair falls over.
   Mud shortens strides and hurts more, hills change stride and safe speed, wet ground makes any tangle a fall, and a
   hurdle can only be cleared by a step taken together almost exactly. Times are race seconds on one shared clock;
   presses carry their own time so a guest's press is judged by when it was pressed, not when it arrived. */
const Leg = (() => {
  'use strict';
  const DT = 1 / 120, START = 3;                                   // three-second countdown
  const STRIDE = 30, VMAX = 230;
  const PERFECT = 0.06, GOOD = 0.15, HURDLE_GAP = 0.11;
  const MIN_I = 0.17, MIN_I_DOWN = 0.22, WAIT = 0.45, WOB_RATE = 0.9;
  const LOSS = { wrong: 0.35, tangle: 0.5, rush: 0.2, loose: 0.1 };
  const GAIN = { perfect: 0.12, good: 0.06 };
  const MULT = { perfect: 1.15, good: 1, loose: 0.8 };
  const TERRAIN = { flat: 1, up: 0.7, down: 1.3, mud: 0.6, wet: 1 };
  const FALL_T = 1.6, UP_BAL = 0.7, HURDLE_STOP = 12, HURDLE_OVER = 26;
  const WHO = ['pink', 'mint'];
  const other = l => (l === 'in' ? 'out' : 'in');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r3 = v => Math.round(v * 1000) / 1000;

  function terrainAt(def, x) { for (const z of def.zones || []) if (x >= z.from && x < z.to) return z.type; return 'flat'; }
  function load(def) {
    return {
      def, t: 0, st: 'count', x: 0, owe: 0, bal: 1, expect: null, pend: { pink: [], mint: [] }, lastStepT: START,
      fallT: 0, hurdle: -1, cleared: 0, over: false, finished: false, time: 0, late: 0,
      steps: 0, lastLeg: null, lastQ: null, jumpT: -9, trip: 0,
      stats: { perfect: 0, good: 0, loose: 0, wrong: 0, tangle: 0, rush: 0, falls: 0, jumps: 0 }, net: null
    };
  }
  function lose(G, amount, ev, tag) {
    const k = terrainAt(G.def, G.x) === 'mud' ? 1.6 : 1;
    G.bal = Math.max(0, G.bal - amount * k);
    if (tag) ev.push(tag);
    if (G.bal <= 0) fall(G, ev);                                   // out of balance: down they go, right away
  }
  function fall(G, ev) {
    if (G.st === 'down' || G.over) return;
    G.st = 'down'; G.fallT = FALL_T; G.owe = 0; G.bal = 0; G.pend = { pink: [], mint: [] }; G.stats.falls++;
    ev.push('fall');
  }
  /* a key went down at race time t ('in' is the tied leg, 'out' the player's own outer leg). Each player's presses
     wait in a short queue and pair with the partner's in order, so presses that reach the host late (online) are
     matched with the right step. One step ahead of the partner is allowed (and judged by the time gap); more is wrong. */
  function press(G, who, leg, t, ev = []) {
    if (G.over || G.st !== 'run' || (leg !== 'in' && leg !== 'out') || !Number.isFinite(t)) return ev;
    t = clamp(t, G.lastStepT, G.t);
    const wet = terrainAt(G.def, G.x) === 'wet', q = G.pend[who], last = q[q.length - 1];
    if (last && last.leg === leg) return ev;                        // tapped again while waiting for the partner
    const want = last ? other(last.leg) : G.expect;
    if (q.length >= 2 || (want && leg !== want)) {
      G.stats.wrong++;
      if (wet) fall(G, ev); else lose(G, LOSS.wrong, ev, 'wrong:' + who);
      return ev;
    }
    q.push({ leg, t, wob: 0 });
    ev.push('lift:' + who + ':' + leg);
    while (G.st === 'run' && G.pend.pink.length && G.pend.mint.length) {
      const p = G.pend.pink[0], m = G.pend.mint[0];
      if (p.leg !== m.leg) {                                        // one lifted the tied leg, the other the outer one
        G.pend = { pink: [], mint: [] }; G.stats.tangle++;
        if (wet) fall(G, ev); else lose(G, LOSS.tangle, ev, 'tangle');
        break;
      }
      G.pend.pink.shift(); G.pend.mint.shift();
      resolve(G, p, m, ev);
    }
    return ev;
  }
  function resolve(G, p, m, ev) {
    const gap = Math.abs(p.t - m.t), ts = Math.max(p.t, m.t), leg = p.leg;
    const wet = terrainAt(G.def, G.x) === 'wet', ter = terrainAt(G.def, G.x);
    const first = p.t < m.t ? p : m;
    const waited = Math.max(0, (gap - WAIT) * WOB_RATE - first.wob);   // what waiting on one leg cost, not yet taken
    if (waited > 0) lose(G, waited, ev, null);
    const q = gap <= PERFECT ? 'perfect' : gap <= GOOD ? 'good' : 'loose';
    const I = ts - G.lastStepT;
    G.lastStepT = ts; G.expect = other(leg); G.lastLeg = leg; G.lastQ = q; G.steps++;
    G.stats[q]++;
    if (G.hurdle >= 0) {                                           // standing at a hurdle: only a step together clears it
      if (gap <= HURDLE_GAP) { G.x = G.def.hurdles[G.hurdle] + HURDLE_OVER; G.hurdle = -1; G.cleared++; G.jumpT = ts; G.stats.jumps++; G.bal = Math.min(1, G.bal + GAIN.good); ev.push('jump'); }
      else { G.trip++; ev.push('trip'); fall(G, ev); }
      return;
    }
    let mult = MULT[q] * TERRAIN[ter];
    const minI = ter === 'down' ? MIN_I_DOWN : MIN_I;
    if (G.steps > 1 && I < minI) { mult *= 0.8; G.stats.rush++; lose(G, LOSS.rush, ev, 'rush'); }
    if (q === 'loose') lose(G, LOSS.loose * (wet ? 2 : 1), ev, null);
    else G.bal = Math.min(1, G.bal + GAIN[q]);
    if (G.st === 'down') return;
    G.owe += STRIDE * mult;
    ev.push('step:' + leg + ':' + q);
  }
  function rivalX(def, r, t) {
    const L = def.length, s = clamp((t - START - 0.5) / (r.time - 0.5), 0, 1);
    const wob = Math.sin(t * 2.1 + r.time) * 0.012 * Math.sin(Math.PI * s);
    return L * clamp(s + wob, 0, 1);
  }
  function step(G) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; G.lastStepT = START; ev.push('go'); } return ev; }
    if (G.st === 'down') {
      G.fallT -= DT;
      if (G.fallT <= 0) { G.st = 'run'; G.bal = UP_BAL; G.expect = null; G.lastStepT = G.t; G.pend = { pink: [], mint: [] }; ev.push('up'); }
    } else {
      // waiting on one leg for the partner wobbles (online the host allows for the partner's press still on its way)
      const grace = WAIT + G.late;
      for (const w of WHO) { const p = G.pend[w][0]; if (p && !G.pend[w === 'pink' ? 'mint' : 'pink'].length && G.t - p.t > grace) { G.bal = Math.max(0, G.bal - WOB_RATE * DT); p.wob += WOB_RATE * DT; } }
      if (G.owe > 0 && G.hurdle < 0) {
        let adv = Math.min(G.owe, VMAX * DT);
        const hs = G.def.hurdles || [];
        for (let i = 0; i < hs.length; i++) {
          const stop = hs[i] - HURDLE_STOP;
          if (G.x < stop + 1e-6 && G.x + adv >= stop) { adv = stop - G.x; G.hurdle = i; G.owe = 0; ev.push('hurdle'); break; }
        }
        G.x += adv; G.owe = Math.max(0, G.owe - adv);
      }
      if (G.bal <= 0) fall(G, ev);
    }
    if (G.x >= G.def.length) { G.x = G.def.length; G.over = true; G.finished = true; G.time = r3(G.t - START); ev.push('finish'); }
    else if (G.t - START > G.def.limit) { G.over = true; G.time = G.def.limit; ev.push('timeup'); }
    return ev;
  }
  function stars(G) {
    if (!G.finished) return 0;
    const s = G.def.rivals.map(r => r.time).sort((a, b) => b - a);   // slowest rival first
    return G.time < s[2] ? 3 : G.time < s[1] ? 2 : G.time < s[0] ? 1 : 0;
  }
  const place = G => 1 + G.def.rivals.filter(r => !G.finished || r.time < G.time).length;

  /* ---------- online ---------- */
  const encP = q => q.map(p => [p.leg === 'in' ? 1 : 2, r3(p.t)]);
  function encode(G) {
    return { t: r3(G.t), st: G.st, x: Math.round(G.x * 10) / 10, ow: Math.round(G.owe * 10) / 10, b: Math.round(G.bal * 1000) / 1000, e: G.expect, pd: WHO.map(w => encP(G.pend[w])),
      ls: r3(G.lastStepT), ll: G.lastLeg, lq: G.lastQ, n: G.steps, ft: r3(G.fallT), h: G.hurdle, c: G.cleared, j: r3(G.jumpT), tr: G.trip, ov: G.over ? 1 : 0, fi: G.finished ? 1 : 0, tm: G.time, s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  function apply(G, m) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = ['count', 'run', 'down'].includes(m.st) ? m.st : G.st;
    G.x = clamp(num(m.x, G.x), 0, G.def.length); G.owe = num(m.ow, 0); G.bal = clamp(num(m.b, G.bal), 0, 1);
    G.expect = m.e === 'in' || m.e === 'out' ? m.e : null;
    if (Array.isArray(m.pd)) WHO.forEach((w, i) => { const q = m.pd[i]; G.pend[w] = Array.isArray(q) ? q.filter(Array.isArray).slice(0, 2).map(p => ({ leg: p[0] === 1 ? 'in' : 'out', t: num(p[1], G.t), wob: 0 })) : []; });
    G.lastStepT = num(m.ls, G.lastStepT); G.lastLeg = m.ll === 'in' || m.ll === 'out' ? m.ll : null; G.lastQ = MULT[m.lq] ? m.lq : null;
    G.steps = num(m.n, G.steps); G.fallT = num(m.ft, 0); G.hurdle = num(m.h, -1); G.cleared = num(m.c, G.cleared); G.jumpT = num(m.j, G.jumpT); G.trip = num(m.tr, G.trip);
    G.over = !!m.ov; G.finished = !!m.fi; G.time = num(m.tm, G.time);
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  // the guest between snapshots: its clock runs on, the pair keeps moving toward what it owes
  function guestStep(G) {
    if (G.over) return;
    G.t += DT;
    if (G.st === 'run' && G.owe > 0 && G.hurdle < 0) { const adv = Math.min(G.owe, VMAX * DT); G.x = Math.min(G.def.length, G.x + adv); G.owe -= adv; }
    if (G.st === 'down') G.fallT = Math.max(0, G.fallT - DT);
  }

  return { DT, START, STRIDE, VMAX, PERFECT, GOOD, HURDLE_GAP, MIN_I, MIN_I_DOWN, WAIT, FALL_T, TERRAIN, HURDLE_STOP,
    load, press, step, stars, place, rivalX, terrainAt, encode, apply, guestStep };
})();

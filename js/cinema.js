/* Sneaking a kiss at the cinema (แอบจุ๊บในโรงหนัง). Pink sits on the left, mint on the right. Each holds a button to
   lean in toward the other; when both lean all the way they kiss, and points flow (more the longer the kiss lasts).
   People around keep glancing over: each gives a tell first (a head starting to turn, footsteps and a torch, a phone
   coming up), then looks for a moment. Anyone looking while the two are leaning in catches them: a strike, and the kiss
   is over. Three strikes and the usher shows them out. Each player has a popcorn bucket to raise on their own side,
   hiding them from the people on that side for a little while. Bright scenes light the room up (leaning shows more);
   loud scenes keep everyone's eyes on the screen; in a jump scare everyone jumps, and hugging then is a bonus.
   Watchers on the left are pink's to watch for, on the right mint's. */
const Cin = (() => {
  'use strict';
  const DT = 1 / 120, START = 2;
  const UP = 2.4, DOWN = 4.5, KISS_AT = 0.85, HUG_AT = 0.6;
  const SHOW = 0.42, SHOW_BRIGHT = 0.22, SHIELD_T = 2.2, SHIELD_CD = 12, STRIKES = 3;
  const RATE = 10, HUG = 60, SCARE_T = 1.2, CATCH_PTS = 60, BLUSH = 1.2;
  const WHO = ['pink', 'mint'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r3 = v => Math.round(v * 1000) / 1000;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  // the film: scenes [from, kind] ('dark', 'bright', 'loud'; 'quiet' otherwise) and jump scares at times
  function sceneAt(def, t) { let k = 'quiet'; for (const [t0, kind] of def.film || []) if (t - START >= t0) k = kind; return k; }
  const scareAt = (def, t) => (def.scares || []).some(s => t - START >= s && t - START < s + SCARE_T);
  /* every watcher's glances, the same on both phones: a list of [tell from, look from, look until] */
  function plan(def) {
    const R = rng(def.seed || 9), out = [];
    for (const w of def.watchers) {
      const list = [];
      let t = START + w.first;
      while (t < START + def.time) {
        const tell = w.tell, look = w.look[0] + R() * (w.look[1] - w.look[0]);
        // nobody turns round in a loud scene or a scare: push the glance past it
        const busy = (a, b) => { for (let x = a; x <= b + 1e-9; x += 0.1) if (sceneAt(def, x) === 'loud' || scareAt(def, x)) return true; return false; };
        for (let k = 0; k < 80 && busy(t, t + tell + look); k++) t += 0.25;
        list.push([t, t + tell, t + tell + look]);
        t += tell + look + w.every[0] + R() * (w.every[1] - w.every[0]);
      }
      out.push(list);
    }
    return out;
  }
  function load(def) {
    return {
      def, plan: plan(def), t: 0, st: 'count', over: false, kicked: false,
      lean: { pink: 0, mint: 0 }, held: { pink: false, mint: false }, shield: { pink: 0, mint: 0 }, shieldCd: { pink: 0, mint: 0 },
      kiss: 0, kissing: false, blush: 0, strikes: 0, score: 0, hugged: [], caughtBy: -1, caughtT: -9, ws: def.watchers.map(() => ({ st: 'idle', i: 0, done: -1 })),
      stats: { kisses: 0, longest: 0, caught: 0, hugs: 0, shields: 0, saves: 0 }, net: null
    };
  }
  const mult = k => (k >= 4 ? 2 : k >= 2 ? 1.5 : 1);
  const visibility = G => (G.kissing ? 1 : (G.lean.pink + G.lean.mint) / 2);
  const showAt = G => (sceneAt(G.def, G.t) === 'bright' ? SHOW_BRIGHT : SHOW);
  // where each watcher is in their glances now: 'idle', 'tell' or 'look'
  function watchState(G, i) {
    const list = G.plan[i];
    for (let k = 0; k < list.length; k++) {
      const [a, b, c] = list[k];
      if (G.t >= a && G.t < b) return { st: 'tell', k, left: b - G.t };
      if (G.t >= b && G.t < c) return { st: k === G.ws[i].done ? 'idle' : 'look', k, left: c - G.t };
      if (G.t < a) break;
    }
    return { st: 'idle', k: -1, left: 0 };
  }
  /* one step. inp: { pink: { lean: held, shield: pressed now }, mint: ... }. On the guest, own: its own lean value
     straight from its own button (host trusts it) */
  function step(G, inp, guest) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    const def = G.def;
    G.blush = Math.max(0, G.blush - DT);
    for (const w of WHO) {
      const q = (inp && inp[w]) || {};
      G.held[w] = !!q.lean;
      if (Number.isFinite(q.leanV)) G.lean[w] = G.blush > 0 ? 0 : clamp(q.leanV, 0, 1);      // a guest's own lean, as its phone saw it
      else G.lean[w] = clamp(G.lean[w] + (G.held[w] && G.st !== 'count' && G.blush <= 0 ? UP : -DOWN) * DT, 0, 1);
      G.shield[w] = Math.max(0, G.shield[w] - DT); G.shieldCd[w] = Math.max(0, G.shieldCd[w] - DT);
      if (q.shield && G.shieldCd[w] <= 0 && G.st !== 'count') { G.shield[w] = SHIELD_T; G.shieldCd[w] = SHIELD_CD; G.stats.shields++; ev.push('shield:' + w); }
    }
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    if (guest) return ev;
    // kissing
    const was = G.kissing;
    G.kissing = G.lean.pink >= KISS_AT && G.lean.mint >= KISS_AT;
    if (G.kissing) {
      if (!was) { G.stats.kisses++; ev.push('kiss'); }
      G.kiss += DT; G.score += RATE * mult(G.kiss) * DT; G.stats.longest = Math.max(G.stats.longest, G.kiss);
      if (mult(G.kiss) !== mult(G.kiss - DT)) ev.push('combo:' + mult(G.kiss));
    } else { if (was) ev.push('part'); G.kiss = 0; }
    // a jump scare: a hug then is worth a bonus (once a scare)
    (def.scares || []).forEach((s, i) => {
      if (G.t - START >= s && G.t - START < s + SCARE_T && !G.hugged.includes(i) && G.lean.pink >= HUG_AT && G.lean.mint >= HUG_AT) { G.hugged.push(i); G.score += HUG; G.stats.hugs++; ev.push('hug:' + i); }
      if (Math.abs(G.t - START - s) < DT / 2) ev.push('scare:' + i);
    });
    // people looking
    def.watchers.forEach((w, i) => {
      const s = watchState(G, i), W = G.ws[i], prev = W.st;
      W.st = s.st; W.i = s.k;
      if (s.st !== 'look') W.saved = false;
      if (s.st === 'tell' && prev !== 'tell') ev.push('tell:' + i);
      if (s.st !== 'look') return;
      if (prev !== 'look') ev.push('look:' + i);
      const shielded = G.shield[w.side === 'L' ? 'pink' : 'mint'] > 0;
      if (visibility(G) > (w.kind === 'phone' ? SHOW_BRIGHT : showAt(G))) {
        if (shielded) { if (!W.saved) { W.saved = true; G.stats.saves++; ev.push('saved:' + i); } return; }
        W.done = s.k; W.st = 'idle'; W.saved = false;
        // caught: they spring apart, red in the face, and cannot lean in again for a moment
        G.strikes++; G.stats.caught++; G.kiss = 0; G.kissing = false; G.lean.pink = G.lean.mint = 0; G.blush = BLUSH; G.caughtBy = i; G.caughtT = G.t; G.score = Math.max(0, G.score - CATCH_PTS);
        ev.push('caught:' + i);
        if (G.strikes >= STRIKES) { G.over = true; G.kicked = true; ev.push('kicked'); }
      }
    });
    if (!G.over && G.t - START >= def.time) { G.over = true; ev.push('end'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  function encode(G) {
    return { t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, kk: G.kicked ? 1 : 0, l: [r3(G.lean.pink), r3(G.lean.mint)], h: [G.held.pink ? 1 : 0, G.held.mint ? 1 : 0],
      sh: [r3(G.shield.pink), r3(G.shield.mint)], sc: [r3(G.shieldCd.pink), r3(G.shieldCd.mint)], k: r3(G.kiss), ki: G.kissing ? 1 : 0,
      x: G.strikes, bl: r3(G.blush), p: Math.round(G.score * 10) / 10, hg: G.hugged.slice(), cb: G.caughtBy, ct: r3(G.caughtT), dn: G.ws.map(w => w.done), s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  function apply(G, m, local) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.kicked = !!m.kk;
    WHO.forEach((w, i) => {
      if (w !== local && Array.isArray(m.l)) G.lean[w] = clamp(num(m.l[i], G.lean[w]), 0, 1);
      if (w !== local && Array.isArray(m.h)) G.held[w] = !!m.h[i];
      if (Array.isArray(m.sh)) G.shield[w] = Math.max(0, num(m.sh[i], G.shield[w]));
      if (Array.isArray(m.sc)) G.shieldCd[w] = Math.max(0, num(m.sc[i], G.shieldCd[w]));
    });
    G.kiss = Math.max(0, num(m.k, G.kiss)); G.kissing = !!m.ki; G.blush = clamp(num(m.bl, G.blush), 0, BLUSH); G.strikes = clamp(num(m.x, G.strikes) | 0, 0, STRIKES); G.score = Math.max(0, num(m.p, G.score));
    if (Array.isArray(m.hg)) G.hugged = m.hg.filter(Number.isInteger);
    G.caughtBy = Number.isInteger(m.cb) ? m.cb : -1; G.caughtT = num(m.ct, G.caughtT);
    if (Array.isArray(m.dn)) G.ws.forEach((w, i) => { if (Number.isInteger(m.dn[i])) w.done = m.dn[i]; });
    G.ws.forEach((w, i) => { const s = watchState(G, i); w.st = s.st; w.i = s.k; });
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  // the guest's own lean, moved by its own button between snapshots
  function leanStep(v, held, G) { if (G && G.blush > 0) return 0; return clamp(v + (held ? UP : -DOWN) * DT, 0, 1); }

  return { DT, START, UP, DOWN, KISS_AT, HUG_AT, SHOW, SHOW_BRIGHT, SHIELD_T, SHIELD_CD, STRIKES, RATE, HUG, SCARE_T, BLUSH,
    sceneAt, scareAt, plan, load, step, watchState, visibility, showAt, mult, stars, encode, apply, leanStep };
})();

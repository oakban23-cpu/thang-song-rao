/* Cinema couple for the bots (tests) and the browser pilots. Needs Cin. cinemaCrew(G, opt) returns a function giving
   { pink: { lean, shield }, mint: { lean, shield } } for the next step of G.
   opt: react (s before acting on what they see), think (s between decisions), shield (use the popcorn), miss (chance of
   not noticing a glance), seed. */
function cinRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function cinemaCrew(G, opt = {}) {
  const R = cinRng(opt.seed || 1), react = opt.react == null ? 0.2 : opt.react, think = opt.think == null ? 0.08 : opt.think, miss = opt.miss || 0;
  const def = G.def, seen = [], missed = new Set();
  let next = 0, plan = { pink: { lean: false, shield: false }, mint: { lean: false, shield: false } };
  function decide(s) {
    const out = { pink: { lean: false, shield: false }, mint: { lean: false, shield: false } };
    if (s.st !== 'run') { plan = out; return; }
    // who is about to look (or looking), on which side, and until when (at the longest)
    const until = { L: 0, R: 0 };
    s.ws.forEach((w, i) => {
      if (w.st === 'idle') return;
      const key = i + ':' + w.k;
      if (!missed.has(key + '?') && !missed.has(key)) { if (R() < miss) missed.add(key); else missed.add(key + '?'); }
      if (missed.has(key)) return;                                  // did not notice this one
      const W = def.watchers[i], end = w.st === 'tell' ? w.left + W.look[1] : w.left;
      until[W.side] = Math.max(until[W.side], end + 0.05);
    });
    let lean = true;
    for (const side of ['L', 'R']) {
      if (!until[side]) continue;
      const who = side === 'L' ? 'pink' : 'mint';
      // the popcorn hides them only if it stays up until the glance is over (seen react seconds late)
      if (s.shield[who] > until[side] + react) continue;
      if (opt.shield !== false && s.shield[who] <= 0 && s.shieldCd[who] <= 0 && s.lean > 0.5 && Cin.SHIELD_T > until[side] + react + 0.1) { out[who].shield = true; continue; }
      lean = false;
    }
    if (s.scare && !until.L && !until.R) lean = true;
    out.pink.lean = out.mint.lean = lean;
    plan = out;
  }
  return () => {
    seen.push({ t: G.t, st: G.st, ws: G.ws.map((w, i) => { const q = Cin.watchState(G, i); return { st: q.st, k: q.k, left: q.left }; }), shield: Object.assign({}, G.shield), shieldCd: Object.assign({}, G.shieldCd),
      lean: Math.min(G.lean.pink, G.lean.mint), scare: Cin.scareAt(def, G.t) });
    while (seen.length > 1 && seen[1].t <= G.t - react) seen.shift();
    if (G.t >= next) { decide(seen[0]); next = G.t + think * (0.6 + R() * 0.8); }
    const out = { pink: Object.assign({}, plan.pink), mint: Object.assign({}, plan.mint) };
    plan.pink.shield = plan.mint.shield = false;
    return out;
  };
}

/* Kite crew for the bots (tests) and the browser pilots: a runner and a line handler who look at the kite, the wind
   flags and the line's pull, and act after a reaction delay. Needs Kite. kiteCrew(G, opt) returns a function giving
   { run: { mx, act }, line: { pull, rel, act } } for the next step of G.
   opt: react (s before acting on what they see), think (s between decisions), heed (0..1: how often they act on a
   gust warning before the pull gets high), relAt (pull at which the line handler lets line out to climb), tug/sprint
   (use them), seed. */
function kiteRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function kiteCrew(G, opt = {}) {
  const R = kiteRng(opt.seed || 1), react = opt.react == null ? 0.15 : opt.react, think = opt.think == null ? 0.1 : opt.think;
  const heed = opt.heed == null ? 1 : opt.heed, relAt = opt.relAt || 0.2, SN = Kite.SNAP;
  const seen = [];                                           // what they saw, to act on it react seconds later
  let sv = 0, next = 0, plan = { run: { mx: 0, act: false }, line: { pull: 0, rel: 0, act: false } }, warned = -9, heeding = false, home = null, homeAt = -9;
  const def = G.def, HAND = Kite.HAND;
  // a good spot to stand: the kite (at its usual angle on the line out now) clear of other lines, trees and wires,
  // with room behind to run into the wind
  function pickHome(t) {
    const L = Math.max(G.L, 200), f = def.field, out = [];
    for (let x = f[0] + 60; x <= f[1] - 20; x += 20) {
      const kx = x + L * Math.cos(0.95), ky = HAND + L * Math.sin(0.95);
      let bad = 0;
      for (const tt of [t, t + 2, t + 4]) for (const r of Kite.rivals(def, tt)) for (const [LL, aa] of [[L, 0.8], [L, 1.05], [L + 200, 0.95]]) {
        const a = [r.ax, r.ay], b = [r.kx, r.ky], k2 = [x + LL * Math.cos(aa), HAND + LL * Math.sin(aa)], X = Kite.segX([x, HAND], k2, a, b);
        if (X && X[1] > 90) bad += 2;
        if (Kite.segDist(k2, a, b) < 70) bad += 1;
      }
      void kx; void ky;
      for (const tr of def.trees || []) if (Kite.segDist([tr.x, tr.y], [x, HAND], [kx, ky]) < tr.r + 30) bad += 2;
      for (const w of def.wires || []) if (Kite.segX([x, HAND], [kx, ky], [w.x0, w.y], [w.x1, w.y])) bad += 1;
      bad += Math.max(0, 260 - (x - f[0])) / 200;            // room to run back into the wind
      out.push([bad + Math.abs(x - G.run.x) / 2000, x]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return out.length ? out[0][1] : G.run.x;
  }
  let lineMode = 'hold', runMode = 'home';
  function decide(s) {
    const K = s.k, t = s.t, ang = Math.atan2(K.y - HAND, K.x - s.rx), falling = K.vy < -40, plunging = K.vy < -80;
    const run = { mx: 0, act: false }, line = { pull: 0, rel: 0, act: false };
    if (s.st !== 'fly') { lineMode = 'hold'; runMode = 'home'; plan = { run, line }; return; }
    // a gust coming: some crews let out line before it hits; everyone does once the pull gets high
    if (s.gust && s.gust !== warned) { warned = s.gust; heeding = R() < heed; }
    const gustNow = s.gust && heeding;
    // other lines above: how far under the lowest one the kite is (lines from flyers upwind of the runner)
    let above = 1e9;
    for (const r of Kite.rivals(def, t + 1)) {
      if (r.ax > s.rx || K.x < r.ax || K.x > r.kx) continue;
      above = Math.min(above, r.ay + (r.ky - r.ay) * (K.x - r.ax) / (r.kx - r.ax) - K.y);
    }
    // the runner: into the wind until the kite is up where the wind holds it, toward the kite when the line pulls too
    // hard, out from under other lines, else to a good spot
    const canBack = s.rx > def.field[0] + 15, spot = def.launchAt || def.field[0] + Math.min(380, (def.field[1] - def.field[0]) * 0.55);
    if (s.sn > 0.7 || (s.gust && above < 120)) runMode = 'ease';
    else if (K.y < 110 && (runMode === 'room' ? Math.abs(s.rx - spot) > 15 : s.rx < spot - 250 || s.rx > spot + 120)) runMode = 'room';
    else if (runMode === 'ease' && s.sn > 0.45) runMode = 'ease';
    else if (canBack && (K.y < 110 || (falling && K.y < 260) || (runMode === 'launch' && K.y < 230))) runMode = 'launch';
    else if (s.rub > 0) runMode = 'unrub';
    else runMode = 'home';
    if (runMode === 'ease') run.mx = above < 120 ? 1 : 0.4;
    else if (runMode === 'room') run.mx = Math.sign(spot - s.rx);
    else if (runMode === 'launch') { run.mx = s.sn > 0.5 ? -0.5 : -1; if (opt.sprint !== false && K.y < 70 && s.sn < 0.25 && s.sprintCd <= 0) run.act = true; }
    else if (runMode === 'unrub') run.mx = s.rubDir;
    else {
      if (home === null || t - homeAt > 1.5) { home = pickHome(t); homeAt = t; }
      const dx = home - s.rx; run.mx = Math.abs(dx) < 12 || (K.y < 320 && dx > 0) ? 0 : Math.sign(dx) * Math.min(1, Math.abs(dx) / 80) * 0.35;
    }
    const reserve = def.spool - s.L, keep = def.wind.gust ? 260 : 60;
    // the line: let out in gusts and while the runner gets it up, pull in when it drops, let out to climb when it pulls well
    if (!gustNow && s.sn < 0.5 && (above < (s.gustSoonish ? 150 : 70) || reserve < keep - 40)) lineMode = 'pull';
    else if (gustNow || s.sn > 0.6 || (lineMode === 'gust' && s.sn > 0.35)) lineMode = 'gust';
    else if (runMode === 'launch' && s.T > 0.12 * SN && !falling) lineMode = 'out';
    else if (falling && K.y > 40) lineMode = 'pull';
    else if (s.T > relAt * SN && ang > 0.7 && above > 140 && reserve > keep) lineMode = 'out';
    else lineMode = 'hold';
    if (lineMode === 'gust' || lineMode === 'out') line.rel = 1;
    else if (lineMode === 'pull') { line.pull = 1; if (plunging && opt.tug !== false && s.tugCd <= 0) line.act = true; }
    plan = { run, line, lineMode, runMode };
  }
  return () => {
    const K = G.k, t = G.t;
    sv += (K.vy - sv) * Math.min(1, Kite.DT * 2.5);
    // which way to step to stop rubbing another line (looked at now, used later)
    let rubDir = 0;
    if (G.rub > 0) {
      const tryAt = x => { const kx = K.x - G.run.x + x; return Kite.rivals(def, t).some(r => Kite.segX([x, HAND], [kx, K.y], [r.ax, r.ay], [r.kx, r.ky])); };
      rubDir = !tryAt(G.run.x - 60) ? -1 : !tryAt(G.run.x + 60) ? 1 : -1;
    }
    seen.push({ t, st: G.st, k: { x: K.x, y: K.y, vx: K.vx, vy: sv }, T: G.T, sn: G.strain, L: G.L, taut: G.taut, rx: G.run.x, tugCd: G.tugCd, sprintCd: G.run.sprintCd,
      gustSoonish: G.ws.gusts.some(([t0]) => t0 > t && t0 < t + 6), gust: Kite.gustSoon(G, t) ? Math.round(G.ws.gusts.findIndex(([t0, d]) => t > t0 - Kite.WARN && t < t0 + d * 0.8)) + 1 : 0, rub: G.rub, rubDir });
    while (seen.length > 1 && seen[1].t <= t - react) seen.shift();
    if (t >= next) { decide(seen[0]); next = t + think * (0.6 + R() * 0.8); }
    const out = { run: Object.assign({}, plan.run), line: Object.assign({}, plan.line), lineMode: plan.lineMode, runMode: plan.runMode };
    plan.run.act = false; plan.line.act = false;
    return out;
  };
}

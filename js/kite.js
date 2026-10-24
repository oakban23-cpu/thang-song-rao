/* Kite flying (ชักว่าวคู่): one player runs with the line (left and right along the field), the other works the line:
   pull it in, let it out, or give it a tug. The wind blows to the right and keeps changing; the kite flies downwind of
   the runner. It climbs on a taut line in the wind, sinks on a slack one or in a lull; running into the wind or pulling
   the line gives it more air. Letting the line out lets it slip off the reel while the kite pulls, so the kite goes out
   further (and later higher) and the line's pull stays gentle; a gust on a held line pulls too hard and snaps it.
   Trees and power lines catch the kite or its line; other people's kite lines rubbing on ours for a while cut it.
   A kite that comes down is brought back to the runner's hand on a short line after a moment.
   Points: the kite's height (in metres, 10 px each) for every second it flies. Coordinates: x to the right, y up from
   the ground (0). Roles: inp.run = { mx, act } (act: a burst of speed), inp.line = { pull 0..1, rel 0..1, act } (act: a tug). */
const Kite = (() => {
  'use strict';
  const DT = 1 / 120, START = 3, HAND = 26, METER = 10;
  const GRAV = 120, KA = 0.0135, CL = 1.6, CD = 0.7, EDGE = 1.25, TURN = 1.4, SINK = 0.75, RUN_K = 0.85, PAY_K = 0.35, REEL_K = 0.5, TUG_W = 90;
  const LMIN = 50, REEL = 60, T_REL = 30, SLIDE = 2.5, PAY_MAX = 420, SNAP = 720, SNAP_T = 0.4, LAUNCH = 0.85;
  const TUG_D = 15, TUG_T = 0.25, TUG_CD = 0.9;
  const RUN = 130, SPRINT = 205, SPRINT_T = 1.2, SPRINT_CD = 4, RUN_ACC = 500;
  const CUT_T = 1.0, DOWN_T = 2.2, CRASH_T = 1.6, WARN = 1.3, FLOOR = 8;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------- wind: the same on both phones (from the level's seed) ---------- */
  function schedule(def) {
    const w = def.wind, R = rng(def.seed || 5), end = def.time + START + 20;
    const knots = [[0, w.base]];
    for (let t = 0; t < end;) { t += w.period[0] + R() * (w.period[1] - w.period[0]); knots.push([t, w.base + (R() * 2 - 1) * w.var]); }
    const gusts = [], lulls = [];
    if (w.gust) for (let t = START + w.gust.first; t < end; t += w.gust.every[0] + R() * (w.gust.every[1] - w.gust.every[0])) gusts.push([t, w.gust.dur, w.gust.peak * (0.85 + R() * 0.3)]);
    if (w.lull) for (let t = START + w.lull.first; t < end; t += w.lull.every[0] + R() * (w.lull.every[1] - w.lull.every[0])) lulls.push([t, w.lull.dur, w.lull.depth]);
    return { knots, gusts, lulls };
  }
  const bell = (t, t0, dur) => { const u = (t - t0) / dur; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2; };
  // ground wind at time t (px/s, blowing to the right)
  function windAt(G, t) {
    const S = G.ws, k = S.knots;
    let i = 1; while (i < k.length - 1 && k[i][0] < t) i++;
    const a = k[i - 1], b = k[i], u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1), s = (1 - Math.cos(Math.PI * u)) / 2;
    let W = a[1] + (b[1] - a[1]) * s;
    for (const [t0, d, depth] of S.lulls) W *= 1 - depth * bell(t, t0, d);
    for (const [t0, d, peak] of S.gusts) W += (peak - W) * Math.max(0, bell(t, t0, d));
    return Math.max(0, W);
  }
  const shear = y => 0.5 + 0.6 * Math.min(1, Math.max(0, y) / 300);       // weak near the ground, stronger higher up
  // a gust is on its way (the flags start snapping a moment before it arrives)
  const gustSoon = (G, t) => G.ws.gusts.some(([t0, d]) => t > t0 - WARN && t < t0 + d * 0.8);

  /* ---------- the other kites over the field ---------- */
  function rivals(def, t) {
    return (def.rivals || []).map(r => {
      const ax = r.ax + (r.walk ? Math.sin(t * 2 * Math.PI / r.walk[1] + r.ph) * r.walk[0] : 0);
      const kx = r.kx + Math.sin(t * 2 * Math.PI / r.px + r.ph) * r.sx, ky = r.ky + Math.sin(t * 2 * Math.PI / r.py + r.ph * 1.7) * r.sy;
      return { ax, ay: HAND, kx, ky, col: r.col, kind: r.kind };
    });
  }
  function segX(a, b, c, d) {               // do segments ab and cd cross? returns the crossing point or null
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const qp = [c[0] - a[0], c[1] - a[1]], t = (qp[0] * s[1] - qp[1] * s[0]) / den, u = (qp[0] * r[1] - qp[1] * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
  }
  function segDist(p, a, b) { const ex = b[0] - a[0], ey = b[1] - a[1], L2 = ex * ex + ey * ey || 1, k = clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / L2, 0, 1); return Math.hypot(p[0] - a[0] - ex * k, p[1] - a[1] - ey * k); }

  /* ---------- state ---------- */
  function load(def) {
    const x = def.start;
    return {
      def, ws: schedule(def), t: 0, st: 'count', over: false,
      run: { x, v: 0, sprintT: 0, sprintCd: 0 },
      k: inHand(x), th: LAUNCH, L: LMIN, taut: false, T: 0, overT: 0, tugT: 0, tugCd: 0, rel: false,
      rub: 0, rubAt: null, strain: 0, inp: { mx: 0, pull: 0, rel: 0 }, downT: 0, cause: null, wind: 0, score: 0, best: 0,
      stats: { snaps: 0, cuts: 0, crashes: 0, tugs: 0, sprints: 0, gusts: 0 }, net: null
    };
  }
  const height = G => Math.max(0, G.k.y) / METER;
  // a short line (just launched) is hard to snap, and a kite on it that sags only drags along the grass
  const SHORT = 110, snapAt = L => SNAP * (1 + Math.max(0, 160 - L) / 100);
  // the kite held up at the end of a short line, ready to go
  const inHand = x => ({ x: x + Math.cos(LAUNCH) * LMIN, y: HAND + Math.sin(LAUNCH) * LMIN, vx: 0, vy: 0 });
  function down(G, cause, ev) {
    if (G.st !== 'fly') return;
    G.st = 'down'; G.strain = 0; G.cause = cause; G.downT = cause === 'crash' || cause === 'tree' || cause === 'wire' ? CRASH_T : DOWN_T; G.taut = false; G.T = 0; G.overT = 0; G.rub = 0; G.rubAt = null;
    if (cause === 'snap') G.stats.snaps++; else if (cause === 'cut') G.stats.cuts++; else G.stats.crashes++;
    ev.push('down:' + cause);
  }
  function relaunch(G, ev) {
    G.st = 'fly'; G.cause = null; G.L = LMIN; G.th = LAUNCH; G.k = inHand(G.run.x); G.taut = true; G.T = 0;
    ev.push('relaunch');
  }

  /* one step. guest: physics only (the host decides snaps, crashes, cuts and points) */
  function step(G, inp, guest) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    const def = G.def, R = G.run, K = G.k, ri = (inp && inp.run) || {}, li = (inp && inp.line) || {};
    G.wind = windAt(G, G.t);
    // the runner (also during the countdown, to get ready)
    if (ri.act && R.sprintCd <= 0 && G.st !== 'count') { R.sprintT = SPRINT_T; R.sprintCd = SPRINT_CD; G.stats.sprints++; ev.push('sprint'); }
    R.sprintT = Math.max(0, R.sprintT - DT); R.sprintCd = Math.max(0, R.sprintCd - DT);
    const mx = clamp(Number.isFinite(ri.mx) ? ri.mx : 0, -1, 1);
    G.inp = { mx, pull: clamp(Number.isFinite(li.pull) ? li.pull : 0, 0, 1), rel: clamp(Number.isFinite(li.rel) ? li.rel : 0, 0, 1) };
    const vmax = R.sprintT > 0 ? SPRINT : RUN, want = Math.abs(mx) > 0.15 ? mx * vmax : 0;
    R.v += clamp(want - R.v, -RUN_ACC * DT, RUN_ACC * DT);
    const ox = R.x;
    R.x = clamp(R.x + R.v * DT, def.field[0], def.field[1]);
    if (R.x === def.field[0] || R.x === def.field[1]) R.v = 0;
    const ax = R.x, ay = HAND, avx = (R.x - ox) / DT;
    if (G.st === 'count') {
      Object.assign(K, inHand(ax)); G.th = LAUNCH; G.taut = true;
      if (G.t >= START) { G.st = 'fly'; ev.push('go'); }
      return ev;
    }
    if (G.st === 'down') {
      // a cut or snapped kite flutters away downwind; a crashed one stays where it fell
      if (G.cause === 'snap' || G.cause === 'cut') { K.vx += (G.wind * shear(K.y) - K.vx) * 1.5 * DT; K.vy += (-40 - K.vy) * 2 * DT; K.x += K.vx * DT; K.y = Math.max(0, K.y + K.vy * DT); }
      else if (G.cause === 'crash') { K.vx = K.vy = 0; K.y = Math.max(0, K.y - 120 * DT); }
      if (!guest) { G.downT -= DT; if (G.downT <= 0) relaunch(G, ev); }
      if (G.t - START >= def.time) { G.over = true; ev.push('timeup'); }
      return ev;
    }
    // the line handler: pull in, let out, tug
    const pull = clamp(Number.isFinite(li.pull) ? li.pull : 0, 0, 1), rel = clamp(Number.isFinite(li.rel) ? li.rel : 0, 0, 1);
    if (li.act && G.tugCd <= 0) { G.tugT = TUG_T; G.tugCd = TUG_CD; G.stats.tugs++; ev.push('tug'); }
    G.tugCd = Math.max(0, G.tugCd - DT);
    let reel = pull * REEL, kick = 0;
    if (G.tugT > 0) { reel += TUG_D / TUG_T; kick = TUG_W; G.tugT = Math.max(0, G.tugT - DT); }
    if (G.L <= LMIN) reel = 0;
    G.rel = rel > 0.3 && reel === 0;
    /* the kite: it hangs on the line at an angle th above the downwind ground. The wind it feels is the wind up there,
       plus the runner running into the wind (along the line), plus line being reeled in, less line slipping out. With
       enough wind it climbs toward the angle where lift, drag and its weight balance (higher in more wind, never past
       EDGE); without, that angle is below the ground and it sinks. The line pulls with the wind's push less the weight. */
    const ky0 = ay + G.L * Math.sin(G.th), Wg = G.wind * shear(ky0), c = Math.cos(G.th);
    const feel = p => Math.max(0, Wg - avx * c * RUN_K + reel * REEL_K + kick - p * PAY_K);
    const pullAt = w => KA * w * w * 1.68 - GRAV * Math.sin(G.th);
    // letting out: the line slides through the fingers, faster the harder the kite pulls (and sliding out eases the pull)
    let pay = 0;
    if (G.rel && G.L < def.spool) {
      let lo = 0, hi = PAY_MAX;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if ((pullAt(feel(m)) - T_REL) / SLIDE > m) lo = m; else hi = m; }
      pay = lo * rel;
    }
    G.L = clamp(G.L - reel * DT + pay * DT, LMIN, def.spool);
    const w = feel(pay), q = KA * w * w / GRAV;
    const eq = q > 1e-3 ? clamp(Math.atan((CL - 1 / q) / CD), -0.45, EDGE) : -0.45;
    G.th += (eq - G.th) * Math.min(1, (eq < G.th ? SINK : TURN) / Math.sqrt(Math.max(1, G.L / 100)) * DT);
    G.th = Math.max(-0.2, G.th);
    G.taut = q * CL > 0.75;
    const nx = ax + Math.cos(G.th) * G.L, ny = ay + Math.sin(G.th) * G.L;
    K.vx = (nx - K.x) / DT; K.vy = (ny - K.y) / DT; K.x = nx; K.y = ny;
    const d = G.L;
    const Tnow = G.taut ? Math.max(0, pullAt(w)) : 0;
    G.T += (Tnow - G.T) * Math.min(1, DT * 8);
    G.strain = G.T / snapAt(G.L);
    if (gustSoon(G, G.t) && !gustSoon(G, G.t - DT)) { G.stats.gusts++; ev.push('gust'); }
    if (guest) return ev;
    // too much pull snaps the line
    G.overT = G.T > snapAt(G.L) ? G.overT + DT : Math.max(0, G.overT - DT * 2);
    if (G.overT > SNAP_T) { down(G, 'snap', ev); return ev; }
    // the ground, trees and power lines
    const A = [ax, ay], P = [K.x, K.y];
    if (K.y < 6 && d > SHORT) { K.y = 0; down(G, 'crash', ev); return ev; }
    if (K.y < 4) { K.y = 4; G.th = Math.asin(clamp((4 - ay) / d, -1, 1)); }
    for (const tr of def.trees || []) if (Math.hypot(K.x - tr.x, K.y - tr.y) < tr.r || (G.taut && segDist([tr.x, tr.y], A, P) < tr.r * 0.6)) { down(G, 'tree', ev); return ev; }
    for (const w of def.wires || []) { const a = [w.x0, w.y], b = [w.x1, w.y]; if (segDist(P, a, b) < 8 || (G.taut && segX(A, P, a, b))) { down(G, 'wire', ev); return ev; } }
    // other people's lines rubbing on ours (or on the kite) cut it after a while
    let at = null;
    for (const r of rivals(def, G.t)) {
      const a = [r.ax, r.ay], b = [r.kx, r.ky], x = G.taut ? segX(A, P, a, b) : null;
      at = (x && x[1] > 100 ? x : null) || (segDist(P, a, b) < 10 ? P : null);     // (lines from hands side by side don't count)
      if (at) break;
    }
    if (at) { if (!G.rubAt) ev.push('rub'); G.rub += DT; G.rubAt = at; } else { G.rub = Math.max(0, G.rub - DT * 2); if (G.rub === 0) G.rubAt = null; }
    if (G.rub > CUT_T) { down(G, 'cut', ev); return ev; }
    // points: the height, every second in the air
    const h = height(G);
    G.score += Math.max(0, h - FLOOR) * DT; G.best = Math.max(G.best, h);
    if (G.t - START >= def.time) { G.over = true; ev.push('timeup'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  function encode(G) {
    const K = G.k, R = G.run;
    return { t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, r: [r1(R.x), r1(R.v), r3(R.sprintT), r3(R.sprintCd)], k: [r1(K.x), r1(K.y), r1(K.vx), r1(K.vy)],
      L: r1(G.L), th: r3(G.th), T: r1(G.T), sn: r3(G.strain), ta: G.taut ? 1 : 0, tc: r3(G.tugCd), tt: r3(G.tugT), rb: r3(G.rub), ra: G.rubAt ? [r1(G.rubAt[0]), r1(G.rubAt[1])] : 0,
      in: [Math.round(G.inp.mx * 100) / 100, Math.round(G.inp.pull * 100) / 100, Math.round(G.inp.rel * 100) / 100], dt: r3(G.downT), c: G.cause, sc: Math.round(G.score * 10) / 10, b: r1(G.best), s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  // soft: blend the guest's own prediction toward the snapshot (snap outright on big gaps or a change of state)
  function apply(G, m, soft) {
    if (!m || typeof m !== 'object') return;
    const st = ['count', 'fly', 'down'].includes(m.st) ? m.st : G.st, same = st === G.st;
    G.t = num(m.t, G.t); G.st = st; G.over = !!m.ov;
    const R = G.run, K = G.k, r = Array.isArray(m.r) ? m.r : [], k = Array.isArray(m.k) ? m.k : [];
    const nx = num(r[0], R.x), kx = num(k[0], K.x), ky = num(k[1], K.y);
    const b = soft && same && Math.abs(nx - R.x) < 60 && Math.hypot(kx - K.x, ky - K.y) < 80 ? 0.3 : 1;
    R.x = clamp(R.x + (nx - R.x) * b, G.def.field[0], G.def.field[1]); R.v = num(r[1], R.v); R.sprintT = num(r[2], R.sprintT); R.sprintCd = num(r[3], R.sprintCd);
    K.x += (kx - K.x) * b; K.y += (ky - K.y) * b; K.vx = num(k[2], K.vx); K.vy = num(k[3], K.vy);
    G.L = clamp(G.L + (num(m.L, G.L) - G.L) * b, LMIN, G.def.spool); G.th = clamp(G.th + (num(m.th, G.th) - G.th) * b, -0.2, 1.3); G.T = num(m.T, G.T); G.strain = clamp(num(m.sn, G.strain), 0, 3); G.taut = !!m.ta;
    G.tugCd = num(m.tc, G.tugCd); G.tugT = num(m.tt, G.tugT); G.rub = num(m.rb, 0); G.rubAt = Array.isArray(m.ra) && m.ra.every(Number.isFinite) ? m.ra : null;
    if (Array.isArray(m.in)) G.inp = { mx: clamp(num(m.in[0], 0), -1, 1), pull: clamp(num(m.in[1], 0), 0, 1), rel: clamp(num(m.in[2], 0), 0, 1) };
    G.downT = num(m.dt, G.downT); G.cause = ['snap', 'cut', 'crash', 'tree', 'wire'].includes(m.c) ? m.c : null;
    G.score = Math.max(0, num(m.sc, G.score)); G.best = Math.max(0, num(m.b, G.best));
    if (m.s && typeof m.s === 'object') for (const q of Object.keys(G.stats)) G.stats[q] = num(m.s[q], G.stats[q]);
  }

  return { DT, START, HAND, METER, LMIN, SHORT, snapAt, REEL, T_REL, SNAP, CUT_T, RUN, SPRINT, SPRINT_CD, TUG_CD, WARN,
    windAt, shear, gustSoon, rivals, segX, segDist, load, step, height, stars, encode, apply };
})();

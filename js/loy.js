/* Loy Krathong (ลอยกระทง). The two of you float one krathong together down the river on the full-moon night, seen
   from above: pink walks the left bank, mint the right. Neither can reach the krathong; each can only scoop the water
   (a wave rolls out from where you stand and nudges the krathong away from your bank), so to steer it you take turns:
   pink pushes it right, mint pushes it left, and whoever stands a little upstream or down tips it forward or back.
   The candle must stay lit: when the wind comes from one side (you see it coming) the one on that bank holds up a hand
   to shield it, standing level with the krathong; unshielded, the flame shrinks and goes out. On the way: rocks and
   logs (a knock costs the krathong a bit of itself; three and it sinks), whirlpools that hold it, lotus that slows it,
   ducks crossing, a ferry going back and forth, bridges with narrow gaps, other people's krathongs to jostle, and
   sparks from the fireworks. Golden wishes float on the water: steer through them. Reach the moon's reflection: points
   for that, each wish, the krathong in one piece, the flame and each gust blocked. World: x across (the river between
   the banks), y along the river (the start at 0, downstream positive, the moon at -len: it floats up the screen). */
const Loy = (() => {
  'use strict';
  const DT = 1 / 120, START = 3, VW = 960, VH = 544;
  const KR = 15, P_SPEED = 190, P_R = 12, PUSH_CD = 0.45, WAVE_V = 300, WAVE_MAX = 470, WAVE_PUSH = 92, WAVE_BAND = 12;
  const SHIELD_DY = 95, GUST_WARN = 1.6, GUST_ACC = 46, GUST_DRAIN = 34, FLAME_REGEN = 6, SPARK_WARN = 2.4, SPARK_R = 36, SPARK_HIT = 45;
  const HULL = 3, INV_T = 1.2, HIT_V = 10, WISH_R = KR + 11, DRAG = 1.6, CAM_K = 0.62;
  const FINISH_PTS = 400, WISH_PTS = 50, HULL_PTS = 80, BLOCK_PTS = 30;
  const IDS = ['pink', 'mint'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  // the river's edges for this level (a narrow canal has wider banks)
  const banks = def => { const b = def.bank || 150; return { RL: b, RR: VW - b }; };
  const xOf = (def, f) => { const { RL, RR } = banks(def); return RL + f * (RR - RL); };

  function load(def) {
    const { RL, RR } = banks(def), X = f => RL + f * (RR - RL);
    const G = {
      def, RL, RR, t: 0, rt: 0, st: 'count', over: false, won: false, why: '', cv: { pink: 0, mint: 0 },
      kr: { x: X(def.x0 != null ? def.x0 : 0.5), y: 0, vx: 0, vy: 0, hull: HULL, flame: 100, inv: 0, spin: 0 },
      p: {
        pink: { x: RL * 0.55, y: 30, mv: false, face: 1, cd: 0, shield: false, push: 0 },
        mint: { x: VW - RL * 0.55, y: 30, mv: false, face: -1, cd: 0, shield: false, push: 0 }
      },
      waves: [], wishes: (def.wish || []).map(([d, f]) => ({ x: X(f), y: -d, got: false })),
      rocks: (def.rocks || []).map(([d, f, r]) => ({ x: X(f), y: -d, r: r || 18 })),
      logs: (def.logs || []).map(([d, f, vx, len]) => ({ x: X(f), y: -d, vx: vx || 0, vy: 0, dr: vx || 0, len: len || 70, a: (vx || 0) * 0.02, on: false })),
      whirls: (def.whirls || []).map(([d, f, r, s]) => ({ x: X(f), y: -d, r: r || 80, s: s || 1 })),
      lotus: (def.lotus || []).map(([d, f, r]) => ({ x: X(f), y: -d, r: r || 60 })),
      ducks: (def.ducks || []).map(([d, side, n]) => ({ x: side < 0 ? RL - 30 : RR + 30, y: -d, vx: (side < 0 ? 1 : -1) * 42, n: n || 3, on: false, done: false })),
      ferries: (def.ferry || []).map(([d, per, ph]) => ({ y: -d, per: per || 9, ph: ph || 0, x: 0, w: 124, h: 46 })),
      pillars: (def.bridge || []).flatMap(([d, cols]) => cols.map(([f, w]) => ({ x: X(f), y: -d, w: w || 40, h: 34 }))),
      bridges: (def.bridge || []).map(([d]) => -d),
      npc: (def.npc || []).map(([d, f], i) => ({ x: X(f), y: -d, vx: 0, vy: 0, ph: i * 1.7, on: false })),
      sparks: [], sparkDefs: (def.sparks || []).map(([d, dx]) => ({ d, dx, done: false })),
      gusts: (def.gusts || []).map(([d, side, dur, str]) => ({ d, side, dur: dur || 2.5, str: str || 1, ph: 'wait', t: 0, blocked: true })),
      rs: (def.seed || 7) >>> 0 || 7,
      stats: { pushes: { pink: 0, mint: 0 }, hits: 0, wishes: 0, gusts: 0, blocked: 0, shieldT: 0, sparks: 0, banks: 0, quacks: 0 },
      score: 0
    };
    for (const f of G.ferries) f.x = ferryX(G, f, 0);
    return G;
  }
  const ferryX = (G, f, t) => G.RL + f.w / 2 + 10 + (G.RR - G.RL - f.w - 20) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 / f.per + f.ph));
  const cam = G => G.kr.y - VH * CAM_K;                                    // the top of the view
  const gustNow = G => G.gusts.find(g => g.ph === 'warn' || g.ph === 'on') || null;
  // the water's pull at a point: the current (strongest mid-river), a gust, a whirlpool's swirl
  function flowAt(G, x, y) {
    const w = G.RR - G.RL, u = clamp((x - G.RL) / w, 0, 1), cur = G.def.cur * (0.55 + 0.45 * Math.sin(Math.PI * u));
    let fx = 0, fy = -cur;
    const g = gustNow(G); if (g && g.ph === 'on') fx += (g.side === 'pink' ? 1 : -1) * g.str * GUST_ACC;
    for (const wp of G.whirls) {
      const dx = x - wp.x, dy = y - wp.y, d = Math.hypot(dx, dy);
      if (d < wp.r && d > 1) {
        const k = Math.min(1, 1.6 * (1 - d / wp.r)), s = wp.s * 70, tg = s * (0.2 + 0.35 * k), inw = s * (0.25 + 0.45 * k) * Math.min(1, d / 14);
        fx = fx * (1 - k) + (-dy / d * tg - dx / d * inw);
        fy = fy * (1 - k) + (dx / d * tg - dy / d * inw);
      }
    }
    for (const l of G.lotus) if (Math.hypot(x - l.x, y - l.y) < l.r) { fx *= 0.35; fy *= 0.35; }
    return { fx, fy };
  }
  // where a log's two ends are
  const logEnds = l => { const c = Math.cos(l.a) * l.len / 2, s = Math.sin(l.a) * l.len / 2; return [l.x - c, l.y - s, l.x + c, l.y + s]; };
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, t = clamp(((px - x1) * dx + (py - y1) * dy) / L, 0, 1), qx = x1 + t * dx, qy = y1 + t * dy;
    return { d: Math.hypot(px - qx, py - qy), qx, qy };
  }
  // the krathong bumps something solid: out of it, a bounce, and (if it came in hard) a knock
  function bump(G, nx, ny, depth, ev, what, soft) {
    const k = G.kr, vn = k.vx * nx + k.vy * ny;
    k.x += nx * depth; k.y += ny * depth;
    if (vn < 0) { k.vx -= 1.5 * vn * nx; k.vy -= 1.5 * vn * ny; }
    if (soft) return;
    if (-vn > HIT_V && k.inv <= 0) { k.hull--; k.inv = INV_T; G.stats.hits++; k.spin += 4; ev.push('hit:' + what + ':' + k.hull); }
  }

  function step(G, inp, guest, only) {
    const ev = [];
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } }
    const run = G.st === 'run' && !G.over, k = G.kr, top = cam(G);
    // the two on the banks: walk along it (the view drags whoever falls behind), scoop, shield
    for (const id of IDS) {
      if (guest && id !== only) continue;
      const p = G.p[id], q = (inp && inp[id]) || {}, mx = clamp(num(q.mx), -1, 1), my = clamp(num(q.my), -1, 1);
      if (q.still) continue;
      const L = id === 'pink' ? 18 : G.RR + 14, R = id === 'pink' ? G.RL - 14 : VW - 18;
      const m = Math.hypot(mx, my), sp = m > 1 ? P_SPEED / m : P_SPEED;
      p.mv = m > 0.15 && run;
      if (!G.over) { p.x = clamp(p.x + mx * sp * DT * (run ? 1 : 0.4), L, R); p.y += my * sp * DT * (run ? 1 : 0.4); }
      p.y = clamp(p.y, top + 46, top + VH - 26);
      if (Math.abs(mx) > 0.2) p.face = mx > 0 ? 1 : -1;
      p.shield = !!q.use && run;
      p.cd = Math.max(0, p.cd - DT); p.push = Math.max(0, p.push - DT);
      if (q.act && run && p.cd <= 0) {
        p.cd = PUSH_CD; p.push = 0.35; G.stats.pushes[id]++;
        if (!guest) { G.waves.push({ s: id, ox: id === 'pink' ? G.RL : G.RR, oy: p.y, r: 0, hit: false, ht: {} }); ev.push('push:' + id); }
      }
    }
    if (guest) return ev;
    if (!run) { if (G.st === 'count') k.y = 0; return ev; }
    G.rt += DT;
    // waves roll out from the bank; each nudges the krathong (and whatever floats) once, away from where it started
    for (const w of G.waves) {
      w.r += WAVE_V * DT;
      const hitIt = (o, key, mass) => {
        if (w.ht[key]) return false;
        const dx = o.x - w.ox, dy = o.y - w.oy, d = Math.hypot(dx, dy);
        if (d > WAVE_MAX || Math.abs(d - w.r) > WAVE_BAND) return false;
        w.ht[key] = 1;
        const f = WAVE_PUSH * (1 - 0.55 * d / WAVE_MAX) / mass, nx = dx / (d || 1), ny = dy / (d || 1) * 0.6, n = Math.hypot(nx, ny) || 1;
        o.vx += nx / n * f; o.vy += ny / n * f;
        return true;
      };
      if (hitIt(k, 'k', 1)) { w.hit = true; ev.push('nudge:' + w.s); }
      G.npc.forEach((c, i) => hitIt(c, 'n' + i, 1.2));
      G.logs.forEach((l, i) => { if (l.on) hitIt(l, 'l' + i, 3); });
    }
    G.waves = G.waves.filter(w => w.r < WAVE_MAX);
    // gusts: seen coming, then blowing; the candle shrinks unless the one on that bank shields it
    for (const g of G.gusts) {
      if (g.ph === 'wait' && k.y <= -g.d) { g.ph = 'warn'; g.t = GUST_WARN; ev.push('wind:' + g.side); }
      else if (g.ph === 'warn') { g.t -= DT; if (g.t <= 0) { g.ph = 'on'; g.t = g.dur; G.stats.gusts++; ev.push('gust:' + g.side); } }
      else if (g.ph === 'on') {
        g.t -= DT;
        const p = G.p[g.side], safe = p.shield && Math.abs(p.y - k.y) < SHIELD_DY;
        if (safe) G.stats.shieldT += DT; else { g.blocked = false; k.flame -= GUST_DRAIN * g.str * DT; }
        if (g.t <= 0) { g.ph = 'done'; if (g.blocked) { G.stats.blocked++; ev.push('blocked:' + g.side); } }
      }
    }
    if (!gustNow(G) || gustNow(G).ph !== 'on') k.flame = Math.min(100, k.flame + FLAME_REGEN * DT);
    // sparks from the fireworks: a glow on the water where they will land, then they land
    for (const s of G.sparkDefs) if (!s.done && k.y <= -s.d) { s.done = true; G.sparks.push({ x: clamp(k.x + k.vx * SPARK_WARN + s.dx, G.RL + 30, G.RR - 30), y: k.y + k.vy * SPARK_WARN, t: SPARK_WARN }); ev.push('boom'); }   // aimed where it will be
    for (const s of G.sparks) {
      s.t -= DT;
      if (s.t <= 0 && !s.done) { s.done = true; if (Math.hypot(k.x - s.x, k.y - s.y) < SPARK_R) { k.flame -= SPARK_HIT; G.stats.sparks++; ev.push('spark:hit'); } else ev.push('spark:miss'); }
    }
    G.sparks = G.sparks.filter(s => s.t > -0.6);
    // the krathong: carried by the water, slowed by its pull
    const fl = flowAt(G, k.x, k.y), a = Math.min(1, DRAG * DT);
    k.vx += (fl.fx - k.vx) * a; k.vy += (fl.fy - k.vy) * a;
    k.x += k.vx * DT; k.y += k.vy * DT; k.inv = Math.max(0, k.inv - DT); k.spin *= Math.pow(0.4, DT);
    // the banks
    if (k.x < G.RL + KR) { k.x = G.RL + KR; if (k.vx < -8) { G.stats.banks++; ev.push('bank'); } k.vx = Math.abs(k.vx) * 0.3; }
    if (k.x > G.RR - KR) { k.x = G.RR - KR; if (k.vx > 8) { G.stats.banks++; ev.push('bank'); } k.vx = -Math.abs(k.vx) * 0.3; }
    // rocks, logs, pillars, the ferry: knocks; ducks and other krathongs: just a bump
    for (const r of G.rocks) { const dx = k.x - r.x, dy = k.y - r.y, d = Math.hypot(dx, dy); if (d < r.r + KR) bump(G, dx / (d || 1), dy / (d || 1), r.r + KR - d, ev, 'rock'); }
    for (const l of G.logs) {
      if (!l.on && l.y > top - 260) l.on = true;
      if (!l.on) continue;
      const lf = flowAt(G, l.x, l.y);
      l.vx += (lf.fx * 0.7 + l.dr - l.vx) * Math.min(1, 0.5 * DT); l.vy += (lf.fy * 0.3 - l.vy) * Math.min(1, 0.8 * DT);   // heavy and half sunk: the krathong overtakes it
      if ((l.x <= G.RL + 12 && l.dr < 0) || (l.x >= G.RR - 12 && l.dr > 0)) l.dr = -l.dr;
      l.x = clamp(l.x + l.vx * DT, G.RL + 10, G.RR - 10); l.y += l.vy * DT; l.a += l.vx * 0.0015 * DT * 60;
      const [x1, y1, x2, y2] = logEnds(l), s = segDist(k.x, k.y, x1, y1, x2, y2);
      if (s.d < KR + 7) { const dx = k.x - s.qx, dy = k.y - s.qy, d = s.d || 1; bump(G, dx / d, dy / d, KR + 7 - s.d, ev, 'log'); }
    }
    const rectHit = (cx, cy, w, h, what, soft) => {
      const qx = clamp(k.x, cx - w / 2, cx + w / 2), qy = clamp(k.y, cy - h / 2, cy + h / 2), dx = k.x - qx, dy = k.y - qy, d = Math.hypot(dx, dy);
      if (d < KR) { if (d > 0.01) bump(G, dx / d, dy / d, KR - d, ev, what, soft); else bump(G, 0, 1, KR, ev, what, soft); }
    };
    for (const pl of G.pillars) rectHit(pl.x, pl.y, pl.w, pl.h, 'pillar');
    for (const f of G.ferries) { f.x = ferryX(G, f, G.rt); rectHit(f.x, f.y, f.w, f.h, 'ferry'); }
    for (const d of G.ducks) {
      if (!d.on && !d.done && d.y > top - 120) { d.on = true; ev.push('ducks'); }
      if (!d.on) continue;
      d.x += d.vx * DT;
      if (d.x < G.RL - 60 || d.x > G.RR + 60) { d.on = false; d.done = true; }
      for (let i = 0; i < d.n; i++) {
        const dx0 = d.x - Math.sign(d.vx) * i * 26, dx = k.x - dx0, dy = k.y - d.y, dd = Math.hypot(dx, dy);
        if (dd < KR + 10) { bump(G, dx / (dd || 1), dy / (dd || 1), KR + 10 - dd, ev, 'duck', true); if (!d.q) { d.q = 1; G.stats.quacks++; ev.push('quack'); } }
      }
    }
    for (const c of G.npc) {
      if (!c.on && c.y > top - 200) c.on = true;
      if (!c.on) continue;
      const cf = flowAt(G, c.x, c.y);
      c.vx += (cf.fx + Math.sin(G.rt * 0.8 + c.ph) * 6 - c.vx) * Math.min(1, DRAG * DT); c.vy += (cf.fy * 0.82 - c.vy) * Math.min(1, DRAG * DT);
      c.x = clamp(c.x + c.vx * DT, G.RL + 13, G.RR - 13); c.y += c.vy * DT;
      const dx = k.x - c.x, dy = k.y - c.y, d = Math.hypot(dx, dy);
      if (d < KR + 13 && d > 0.01) { const o = (KR + 13 - d) / 2, nx = dx / d, ny = dy / d; k.x += nx * o; k.y += ny * o; c.x -= nx * o; c.y -= ny * o; const rv = (k.vx - c.vx) * nx + (k.vy - c.vy) * ny; if (rv < 0) { k.vx -= rv * nx; k.vy -= rv * ny; c.vx += rv * nx; c.vy += rv * ny; } }
    }
    // wishes on the water
    for (const w of G.wishes) if (!w.got && Math.hypot(k.x - w.x, k.y - w.y) < WISH_R) { w.got = true; G.stats.wishes++; ev.push('wish:' + G.stats.wishes); }
    // the end: the moon's reflection, or the krathong lost
    const def = G.def;
    if (k.y <= -def.len) { G.over = true; G.won = true; G.st = 'end'; ev.push('moon'); }
    else if (k.hull <= 0) { G.over = true; G.why = 'sink'; G.st = 'end'; ev.push('sink'); }
    else if (k.flame <= 0) { k.flame = 0; G.over = true; G.why = 'out'; G.st = 'end'; ev.push('out'); }
    else if (G.rt > def.limit) { G.over = true; G.why = 'late'; G.st = 'end'; ev.push('late'); }
    G.score = score(G);
    return ev;
  }
  function score(G) {
    if (!G.won) return 0;
    return FINISH_PTS + G.stats.wishes * WISH_PTS + G.kr.hull * HULL_PTS + Math.round(G.kr.flame) + G.stats.blocked * BLOCK_PTS;
  }
  function stars(G) { if (!G.won) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  const progress = G => clamp(-G.kr.y / G.def.len, 0, 1);
  const timeLeft = G => Math.max(0, G.def.limit - G.rt);

  // ---- online: the host runs the river, the guest walks its own bank and sends its scoops ----
  function encode(G) {
    const k = G.kr, g = gustNow(G);
    return {
      t: r2(G.t), rt: r2(G.rt), st: G.st, ov: G.over ? 1 : 0, wo: G.won ? 1 : 0, why: G.why, sc: G.score, cv: [G.cv.pink, G.cv.mint],
      k: [r1(k.x), r1(k.y), r1(k.vx), r1(k.vy), k.hull, r1(k.flame), r2(k.inv), r1(k.spin)],
      p: IDS.map(id => { const p = G.p[id]; return [r1(p.x), r1(p.y), p.mv ? 1 : 0, p.face, p.shield ? 1 : 0, r2(p.push)]; }),
      w: G.waves.slice(-12).map(w => [w.s === 'pink' ? 0 : 1, r1(w.oy), r1(w.r)]),
      wi: G.wishes.map((w, i) => (w.got ? i : -1)).filter(i => i >= 0),
      lg: G.logs.map(l => [r1(l.x), r1(l.y), r2(l.a), l.on ? 1 : 0]),
      dk: G.ducks.map(d => [r1(d.x), d.on ? 1 : 0, d.done ? 1 : 0]),
      np: G.npc.map(c => [r1(c.x), r1(c.y)]),
      sp: G.sparks.map(s => [r1(s.x), r1(s.y), r2(s.t)]), sd: G.sparkDefs.map(s => (s.done ? 1 : 0)),
      gu: G.gusts.map(gg => [['wait', 'warn', 'on', 'done'].indexOf(gg.ph), r2(gg.t), gg.blocked ? 1 : 0]),
      s: { hits: G.stats.hits, wishes: G.stats.wishes, gusts: G.stats.gusts, blocked: G.stats.blocked, sparks: G.stats.sparks, banks: G.stats.banks, quacks: G.stats.quacks, pp: G.stats.pushes.pink, pm: G.stats.pushes.mint, sh: r1(G.stats.shieldT) },
      g: g ? 1 : 0
    };
  }
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.rt = num(m.rt, G.rt); G.st = ['count', 'run', 'end'].includes(m.st) ? m.st : G.st;
    G.over = !!m.ov; G.won = !!m.wo; G.why = ['sink', 'out', 'late', ''].includes(m.why) ? m.why : ''; G.score = Math.max(0, num(m.sc, G.score));
    const k = G.kr;
    if (Array.isArray(m.k)) { k.x = clamp(num(m.k[0], k.x), G.RL, G.RR); k.y = num(m.k[1], k.y); k.vx = num(m.k[2]); k.vy = num(m.k[3]); k.hull = clamp(num(m.k[4], k.hull) | 0, 0, HULL); k.flame = clamp(num(m.k[5], k.flame), 0, 100); k.inv = num(m.k[6]); k.spin = num(m.k[7]); }
    if (Array.isArray(m.p) && Array.isArray(m.cv)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id], cv = Number.isInteger(m.cv[i]) ? m.cv[i] : G.cv[id]; if (!Array.isArray(e)) return;
      if (id !== own || cv !== G.cv[id]) { p.x = clamp(num(e[0], p.x), 0, VW); p.y = num(e[1], p.y); p.mv = !!e[2]; p.face = e[3] === -1 ? -1 : 1; }
      G.cv[id] = cv; if (id !== own) p.shield = !!e[4]; p.push = Math.max(id === own ? p.push : 0, num(e[5]));
    });
    if (Array.isArray(m.w)) G.waves = m.w.filter(Array.isArray).slice(0, 16).map(a => ({ s: a[0] ? 'mint' : 'pink', ox: a[0] ? G.RR : G.RL, oy: num(a[1]), r: num(a[2]), hit: false, ht: {} }));
    if (Array.isArray(m.wi)) { const got = new Set(m.wi.filter(Number.isInteger)); G.wishes.forEach((w, i) => { w.got = got.has(i); }); }
    if (Array.isArray(m.lg)) m.lg.forEach((a, i) => { const l = G.logs[i]; if (l && Array.isArray(a)) { l.x = num(a[0], l.x); l.y = num(a[1], l.y); l.a = num(a[2], l.a); l.on = !!a[3]; } });
    if (Array.isArray(m.dk)) m.dk.forEach((a, i) => { const d = G.ducks[i]; if (d && Array.isArray(a)) { d.x = num(a[0], d.x); d.on = !!a[1]; d.done = !!a[2]; } });
    if (Array.isArray(m.np)) m.np.forEach((a, i) => { const c = G.npc[i]; if (c && Array.isArray(a)) { c.x = num(a[0], c.x); c.y = num(a[1], c.y); c.on = true; } });
    if (Array.isArray(m.sp)) G.sparks = m.sp.filter(Array.isArray).slice(0, 12).map(a => ({ x: num(a[0]), y: num(a[1]), t: num(a[2]), done: num(a[2]) <= 0 }));
    if (Array.isArray(m.sd)) m.sd.forEach((v, i) => { if (G.sparkDefs[i]) G.sparkDefs[i].done = !!v; });
    if (Array.isArray(m.gu)) m.gu.forEach((a, i) => { const g = G.gusts[i]; if (g && Array.isArray(a)) { g.ph = ['wait', 'warn', 'on', 'done'][a[0]] || g.ph; g.t = num(a[1]); g.blocked = !!a[2]; } });
    if (m.s && typeof m.s === 'object') {
      const s = m.s, t = G.stats;
      for (const key of ['hits', 'wishes', 'gusts', 'blocked', 'sparks', 'banks', 'quacks']) t[key] = num(s[key], t[key]);
      t.pushes.pink = num(s.pp, t.pushes.pink); t.pushes.mint = num(s.pm, t.pushes.mint); t.shieldT = num(s.sh, t.shieldT);
    }
    for (const f of G.ferries) f.x = ferryX(G, f, G.rt);
  }
  function guestMsg(G, own, inp, presses) {
    const i = inp || {}, p = G.p[own];
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), u: i.use ? 1 : 0, a: presses | 0, x: r1(p.x), y: r1(p.y), cv: G.cv[own] };
  }
  function hostHears(G, rid, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx), -1, 1); rq.my = clamp(num(m.my), -1, 1); rq.use = !!m.u;
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    const p = G.p[rid];
    if (m.cv === G.cv[rid] && Number.isFinite(m.x) && Number.isFinite(m.y)) {
      if (Math.hypot(m.x - p.x, m.y - p.y) < 90) { p.x = m.x; p.y = m.y; } else G.cv[rid]++;
    }
  }

  return { DT, START, VW, VH, KR, P_SPEED, PUSH_CD, WAVE_V, WAVE_MAX, WAVE_PUSH, SHIELD_DY, GUST_WARN, GUST_DRAIN, SPARK_WARN, SPARK_R, HULL, WISH_R, CAM_K,
    FINISH_PTS, WISH_PTS, HULL_PTS, BLOCK_PTS, banks, xOf, load, step, stars, score, progress, timeLeft, cam, gustNow, flowAt, logEnds, ferryX,
    encode, apply, guestMsg, hostHears };
})();
if (typeof module !== 'undefined') module.exports = Loy;

/* Long boat (เรือยาวพายคู่): pink paddles on the left, mint on the right. A stroke on one side pushes the boat
   forward and turns it toward the other side; both strokes together (within 120 ms) go straight and glide further.
   Back-paddling brakes and swings the bow toward that side. The river flows against the boat; banks, rocks, crossing
   boats and drifting logs bump it (hard hits crack the hull), rapids push it sideways, whirlpools spin it.
   Floating krathong picked up on the way take a second off the time each.
   Coordinates: x across the screen (0..960), d up the river from the start (0) to the finish (def.length). Heading h
   is 0 straight up the river, positive turned to the right. Speeds are relative to the water (u forward, s sideways). */
const Boat = (() => {
  'use strict';
  const DT = 1 / 120, START = 3, VW = 960;
  const LEN = 84, BEAM = 20, STROKE_T = 0.42;
  const PUSH = 52, BACK = 40, SYNC = 0.12, SYNC_MULT = 1.35, YAW = 0.9, BACK_YAW = 1.1;
  const DRAG = 1.0, SIDE_DRAG = 5, SPIN_DRAG = 2.4;
  const HULL = 100, HIT_MIN = 60, HIT_K = 0.18, KR_R = 34, KR_BONUS = 1;
  const WHO = ['pink', 'mint'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // the banks at distance d: [left x, right x], straight lines between the river's points
  function banks(def, d) {
    const R = def.river;
    if (d <= R[0][0]) return [R[0][1], R[0][2]];
    for (let i = 1; i < R.length; i++) if (d <= R[i][0]) { const a = R[i - 1], b = R[i], k = (d - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
    const z = R[R.length - 1]; return [z[1], z[2]];
  }
  // moving things at time t: crossing boats go back and forth across, logs drift down a stretch of river
  function movers(def, t) {
    const out = [];
    for (const m of def.movers || []) {
      if (m.kind === 'cross') { const [l, r] = banks(def, m.d), span = r - l - 2 * m.r, p = ((t * m.v / span + m.ph) % 2 + 2) % 2; out.push({ x: l + m.r + span * (p < 1 ? p : 2 - p), d: m.d, r: m.r, kind: m.kind, dir: p < 1 ? 1 : -1 }); }
      else { const len = m.span, p = ((t * m.v + m.ph * len) % len + len) % len; out.push({ x: m.x + Math.sin(t * .7 + m.ph * 6) * 10, d: m.d + len / 2 - p, r: m.r, kind: m.kind }); }
    }
    return out;
  }
  function currentAt(def, x, d) {
    let cx = 0, cd = -(def.current || 0), spin = 0;
    for (const z of def.zones || []) {
      if (z.type === 'rapid' && d >= z.from && d < z.to) { cd -= z.push || 0; cx += z.side || 0; }
      else if (z.type === 'whirl') { const dx = x - z.x, dd = d - z.d, r = Math.hypot(dx, dd); if (r < z.r && r > 1) { const k = (1 - r / z.r) * z.spin; cx += -dd / r * k * z.r * .5 - dx / r * k * 10; cd += dx / r * k * z.r * .5 - dd / r * k * 10; spin += k * 1.4; } }
    }
    return { cx, cd, spin };
  }
  function load(def) {
    const [l, r] = banks(def, 0);
    return {
      def, t: 0, st: 'count', x: (l + r) / 2, d: 0, h: 0, u: 0, s: 0, w: 0, hull: HULL, kr: (def.krathong || []).map(() => 0), krN: 0,
      last: { pink: { t: -9, kind: null, yaw: 0, sync: false }, mint: { t: -9, kind: null, yaw: 0, sync: false } }, syncT: -9,
      over: false, finished: false, sunk: false, time: 0, hitT: -9, bumpT: -9,
      stats: { strokes: 0, sync: 0, back: 0, hits: 0, hard: 0 }, net: null
    };
  }
  const ends = G => { const fx = Math.sin(G.h) * LEN / 2, fd = Math.cos(G.h) * LEN / 2; return [[G.x + fx, G.d + fd], [G.x - fx, G.d - fd]]; };
  // a paddle stroke at time t: 'fwd' pulls, 'back' brakes; one side turns the boat, both together go straight
  function press(G, who, kind, t, ev = []) {
    if (G.over || G.st !== 'run' || (kind !== 'fwd' && kind !== 'back') || !Number.isFinite(t)) return ev;
    t = clamp(t, G.t - 1, G.t);
    const me = G.last[who], other = G.last[who === 'pink' ? 'mint' : 'pink'];
    if (t - me.t < STROKE_T) return ev;                             // still in the middle of the last stroke
    const side = who === 'pink' ? 1 : -1;                           // a left stroke turns right (+), a right stroke left (-)
    let yaw = kind === 'fwd' ? side * YAW : -side * BACK_YAW, push = kind === 'fwd' ? PUSH : -BACK, sync = false;
    if (kind === 'fwd' && other.kind === 'fwd' && !other.sync && Math.abs(t - other.t) <= SYNC) {
      sync = true; other.sync = true;
      // the two turns cancel: take back the partner's turn, including what it already swung (it may be a moment old
      // when this stroke arrives from the other phone)
      const dt = Math.max(0, G.t - other.t), k = Math.exp(-SPIN_DRAG * dt);
      G.h = wrap(G.h - other.yaw * (1 - k) / SPIN_DRAG); G.w -= other.yaw * k; other.yaw = 0; yaw = 0;
      push += PUSH * 2 * (SYNC_MULT - 1);                            // and the boat glides
      G.stats.sync++; G.syncT = t; ev.push('sync');
    }
    G.u += push; G.w += yaw;
    G.last[who] = { t, kind, yaw, sync };
    G.stats.strokes++; if (kind === 'back') G.stats.back++;
    ev.push('stroke:' + who + ':' + kind);
    return ev;
  }
  function hit(G, speed, ev, what) {
    if (speed <= HIT_MIN && (speed < 12 || G.t - G.bumpT < 0.3)) return;   // scraping along or resting against it
    G.bumpT = G.t; G.stats.hits++;
    if (speed > HIT_MIN) {
      const dmg = (speed - HIT_MIN) * HIT_K + 3;
      G.hull = Math.max(0, G.hull - dmg); G.stats.hard++; G.hitT = G.t; ev.push('crack:' + what);
      if (G.hull <= 0) { G.over = true; G.sunk = true; ev.push('sink'); }
    } else ev.push('bump:' + what);
  }
  // push the boat out of something along normal (nx, nd) by depth; the part of its speed going in bounces off
  function bounce(G, nx, nd, depth, ev, what, cur) {
    G.x += nx * depth; G.d += nd * depth;
    const sh = Math.sin(G.h), ch = Math.cos(G.h);
    let vx = G.u * sh + G.s * ch + cur.cx, vd = G.u * ch - G.s * sh + cur.cd;
    const into = -(vx * nx + vd * nd);
    if (into <= 0) return;
    vx += nx * into * 1.35; vd += nd * into * 1.35;
    vx -= cur.cx; vd -= cur.cd;
    G.u = (vx * sh + vd * ch) * 0.8; G.s = (vx * ch - vd * sh) * 0.6;
    G.w += (nx * ch - nd * sh) * into * 0.004;
    hit(G, into, ev, what);
  }
  function collide(G, ev, cur) {
    const def = G.def, [a, b] = ends(G);
    for (const p of [a, b]) {                                        // banks, checked at bow and stern
      const [l, r] = banks(def, p[1]);
      if (p[0] < l + BEAM / 2) bounce(G, 1, 0, l + BEAM / 2 - p[0], ev, 'bank', cur);
      else if (p[0] > r - BEAM / 2) bounce(G, -1, 0, p[0] - (r - BEAM / 2), ev, 'bank', cur);
    }
    const obs = (def.rocks || []).map(q => ({ x: q[0], d: q[1], r: q[2], kind: 'rock' })).concat(movers(def, G.t));
    for (const o of obs) {
      const [p, q] = ends(G), ex = p[0] - q[0], ed = p[1] - q[1], L2 = ex * ex + ed * ed;
      const k = clamp(((o.x - q[0]) * ex + (o.d - q[1]) * ed) / L2, 0, 1), cx = q[0] + ex * k, cd = q[1] + ed * k;
      const dx = cx - o.x, dd = cd - o.d, dist = Math.hypot(dx, dd), min = o.r + BEAM / 2;
      if (dist < min && dist > 1e-6) bounce(G, dx / dist, dd / dist, min - dist, ev, o.kind, cur);
    }
    if (G.d < -40) { G.d = -40; G.u = Math.max(G.u, 0); }
  }
  function step(G) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    const def = G.def, cur = currentAt(def, G.x, G.d);
    G.u *= Math.exp(-DRAG * DT); G.s *= Math.exp(-SIDE_DRAG * DT); G.w *= Math.exp(-SPIN_DRAG * DT);
    G.w += cur.spin * DT;
    const sh = Math.sin(G.h), ch = Math.cos(G.h);
    G.x += (G.u * sh + G.s * ch + cur.cx) * DT; G.d += (G.u * ch - G.s * sh + cur.cd) * DT; G.h = wrap(G.h + G.w * DT);
    collide(G, ev, cur);
    // krathong within reach of the boat are picked up
    (def.krathong || []).forEach((k, i) => {
      if (G.kr[i]) return;
      const [p, q] = ends(G), ex = p[0] - q[0], ed = p[1] - q[1], kk = clamp(((k[0] - q[0]) * ex + (k[1] - q[1]) * ed) / (ex * ex + ed * ed), 0, 1);
      if (Math.hypot(q[0] + ex * kk - k[0], q[1] + ed * kk - k[1]) < KR_R) { G.kr[i] = 1; G.krN++; ev.push('krathong:' + i); }
    });
    if (G.over) return ev;
    if (G.d >= def.length) { G.over = true; G.finished = true; G.time = r3(G.t - START); ev.push('finish'); }
    else if (G.t - START > def.limit) { G.over = true; G.time = def.limit; ev.push('timeup'); }
    return ev;
  }
  const score = G => (G.finished ? Math.max(0, G.time - G.krN * KR_BONUS) : Infinity);
  function stars(G) { if (!G.finished) return 0; const s = G.def.stars, t = score(G); return t <= s[2] ? 3 : t <= s[1] ? 2 : t <= s[0] ? 1 : 0; }
  // rival boats (only on the race day): where each would be at time t if it keeps its pace
  function rivalD(def, r, t) { const s = clamp((t - START - 0.6) / (r.time - 0.6), 0, 1); return def.length * clamp(s + Math.sin(t * 1.3 + r.time) * 0.01 * Math.sin(Math.PI * s), 0, 1); }

  /* ---------- online ---------- */
  function encode(G) {
    return { t: r3(G.t), st: G.st, x: r2(G.x), d: r2(G.d), h: r3(G.h), u: r2(G.u), s: r2(G.s), w: r3(G.w), hu: Math.round(G.hull * 10) / 10, kr: G.kr.join(''),
      lp: [r3(G.last.pink.t), G.last.pink.kind], lm: [r3(G.last.mint.t), G.last.mint.kind], sy: r3(G.syncT), ht: r3(G.hitT),
      ov: G.over ? 1 : 0, fi: G.finished ? 1 : 0, sk: G.sunk ? 1 : 0, tm: G.time, s2: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  function apply(G, m, soft) {
    if (!m || typeof m !== 'object') return;
    const nx = num(m.x, G.x), nd = num(m.d, G.d), nh = num(m.h, G.h);
    if (soft && Math.hypot(nx - G.x, nd - G.d) < 60) { G.x += (nx - G.x) * 0.35; G.d += (nd - G.d) * 0.35; G.h = wrap(G.h + wrap(nh - G.h) * 0.35); }
    else { G.x = nx; G.d = nd; G.h = wrap(nh); }
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st;
    G.u = num(m.u, G.u); G.s = num(m.s, G.s); G.w = num(m.w, G.w); G.hull = clamp(num(m.hu, G.hull), 0, HULL);
    if (typeof m.kr === 'string' && m.kr.length === G.kr.length) { G.kr = [...m.kr].map(c => (c === '1' ? 1 : 0)); G.krN = G.kr.reduce((a, b) => a + b, 0); }
    for (const [k, w] of [['lp', 'pink'], ['lm', 'mint']]) if (Array.isArray(m[k])) G.last[w] = { t: num(m[k][0], -9), kind: m[k][1] === 'fwd' || m[k][1] === 'back' ? m[k][1] : null, yaw: 0, sync: false };
    G.syncT = num(m.sy, G.syncT); G.hitT = num(m.ht, G.hitT);
    G.over = !!m.ov; G.finished = !!m.fi; G.sunk = !!m.sk; G.time = num(m.tm, G.time);
    if (m.s2 && typeof m.s2 === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s2[k], G.stats[k]);
  }
  // the guest between snapshots: the boat keeps gliding with the river (no strokes, no bumps; the host decides those)
  function guestStep(G) {
    if (G.over) return;
    G.t += DT;
    if (G.st !== 'run') return;
    const cur = currentAt(G.def, G.x, G.d);
    G.u *= Math.exp(-DRAG * DT); G.s *= Math.exp(-SIDE_DRAG * DT); G.w *= Math.exp(-SPIN_DRAG * DT);
    const sh = Math.sin(G.h), ch = Math.cos(G.h);
    G.x += (G.u * sh + G.s * ch + cur.cx) * DT; G.d += (G.u * ch - G.s * sh + cur.cd) * DT; G.h = wrap(G.h + G.w * DT);
  }

  return { DT, START, VW, LEN, BEAM, STROKE_T, SYNC, PUSH, HULL, KR_BONUS, KR_R, banks, movers, currentAt, load, press, step, score, stars, rivalD, ends, encode, apply, guestStep, wrap };
})();

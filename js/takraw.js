/* Takraw hoop (ตะกร้อลอดห่วง): two players keep a rattan ball in the air, pass it to each other and kick it
   down through a hanging hoop. A goal only counts after the ball has gone through both players; every extra
   exchange raises the multiplier. Side view, one court per level. */
const Tak = (() => {
  'use strict';
  const VW = 960, VH = 544, GROUND = 480, TOP = -140, DT = 1 / 120;
  const PW = 28, PH = 44, SPEED = 240, ACC_G = 2600, ACC_A = 1500, GP = 2100, JUMP = 760, MAXF = 900;
  const BR = 11, GB = 1150, WALL_E = 0.72, HEAD_E = 0.5, LEAF_E = 0.55, RIM_E = 0.55;
  const SERVE_Y = 236;                                       // below the hoops, so a serve never drops through one
  const REACH = 30, KICK_CD = 0.2, WHIFF_CD = 0.12, HR = 34, RIM = 4, RESPAWN = 1.1, FIRST_SERVE = 1.6;
  const BASE = { shot: 2, back: 4, head: 1, lucky: 1 };
  const MULT_STEP = 0.5, MULT_MAX = 4;                       // +0.5x per exchange, up to x3
  const PASS_WIND = 1, SHOT_WIND = 0.5;                       // how much of the wind the auto-aim allows for

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------- load ---------- */
  function mkP(id, x) {
    return { id, x: x - PW / 2, y: GROUND - PH, w: PW, h: PH, vx: 0, vy: 0, ground: true, face: id === 'pink' ? 1 : -1,
      cd: 0, kickT: 0, kickK: '', jbuf: 0, coy: 0, upHeld: false, walk: 0, sq: 0, headCd: 0, net: null };
  }
  function load(def) {
    const G = {
      def, t: 0, left: def.time || 90, score: 0, over: false, rand: rng(def.seed || 7), net: null,
      pink: mkP('pink', def.spawn ? def.spawn[0] : 300), mint: mkP('mint', def.spawn ? def.spawn[1] : 660),
      ball: { x: 0, y: 0, vx: 0, vy: 0, live: false, wait: FIRST_SERVE, spin: 0, to: 'pink' },
      chain: { last: null, passes: 0, kind: null, shooter: null, q: 0 },
      hoops: (def.hoops || [{ x: 480, y: 170 }]).map((h, i) => ({ x0: h.x, cx: h.x, y: h.y, swing: h.swing || 0, period: h.period || 6, phase: h.phase || 0, lit: true })),
      branches: (def.branches || []).map(b => ({ x: b.x, y: b.y, r: b.r })),
      wind: 0, hist: [],
      ev: { goals: 0, kicks: 0, passes: 0, drops: 0, rims: 0, heads: 0, nopass: 0, dark: 0, best: 0 },
      last: null                                                  // last goal: { pts, kind, passes, x, y, by }
    };
    serve(G, 'pink', FIRST_SERVE);
    world(G);
    return G;
  }
  function serve(G, to, wait) {
    const b = G.ball, p = G[to];
    b.to = to; b.live = false; b.wait = wait;
    b.x = clamp(p.x + p.w / 2, 60, VW - 60); b.y = SERVE_Y; b.vx = 0; b.vy = 0;
    G.chain.last = null; G.chain.passes = 0; G.chain.kind = null; G.chain.shooter = null;
  }

  /* ---------- the world clock: swinging hoops, which hoop is lit, wind ---------- */
  function hoopX(G, h, t) { return h.x0 + (h.swing ? h.swing * Math.sin(2 * Math.PI * t / h.period + h.phase) : 0); }
  function windAt(G, t) {
    const w = G.def.wind;
    if (!w) return 0;
    return w.amp * (0.72 * Math.sin(2 * Math.PI * t / w.period) + 0.28 * Math.sin(2 * Math.PI * t / (w.period * 0.37) + 1.3));
  }
  function litIndex(G, t) { const n = G.hoops.length, p = G.def.litT || 0; return n > 1 && p ? Math.floor(t / p) % n : -1; }
  function world(G) {
    const li = litIndex(G, G.t);
    G.hoops.forEach((h, i) => { h.cx = hoopX(G, h, G.t); h.lit = li < 0 || li === i; });
    G.wind = windAt(G, G.t);
  }
  const litHoop = G => G.hoops.find(h => h.lit) || G.hoops[0];

  /* ---------- players ---------- */
  function stepPlayer(G, p, i, dt) {
    const dir = Math.abs(i.mx || 0) > 0.3 ? Math.sign(i.mx) : 0;
    p.vx = approach(p.vx, dir * SPEED, (p.ground ? ACC_G : ACC_A) * dt);
    if (dir) p.face = dir;
    const up = (i.my || 0) < -0.5;
    if (up && !p.upHeld) p.jbuf = 0.12;
    p.upHeld = up;
    p.jbuf = Math.max(0, p.jbuf - dt);
    p.coy = p.ground ? 0.08 : Math.max(0, p.coy - dt);
    let jumped = false;
    if (p.jbuf > 0 && p.coy > 0) { p.vy = -JUMP; p.ground = false; p.jbuf = 0; p.coy = 0; p.sq = -0.6; jumped = true; }
    const fallV = p.vy;
    p.vy = Math.min(p.vy + GP * dt, MAXF);
    p.x += p.vx * dt;
    if (p.x < 8) { p.x = 8; p.vx = 0; } else if (p.x > VW - 8 - p.w) { p.x = VW - 8 - p.w; p.vx = 0; }
    p.y += p.vy * dt;
    if (p.y + p.h >= GROUND) { if (!p.ground && fallV > 300) p.sq = Math.min(1, fallV / 900); p.y = GROUND - p.h; p.vy = 0; p.ground = true; }
    else p.ground = false;
    p.cd = Math.max(0, p.cd - dt); p.kickT = Math.max(0, p.kickT - dt); p.headCd = Math.max(0, p.headCd - dt);
    p.walk = p.ground && Math.abs(p.vx) > 20 ? p.walk + dt * Math.abs(p.vx) / 16 : 0;
    p.sq = approach(p.sq, 0, dt * 5);
    return jumped;
  }
  // is the ball close enough to kick? (a band from just above the head down to the feet, a little wider than the body)
  function inReach(p, bx, by, extra = 0) {
    const nx = clamp(bx, p.x - 4, p.x + p.w + 4), ny = clamp(by, p.y - 18, p.y + p.h);
    return Math.hypot(bx - nx, by - ny) <= REACH + BR + extra;
  }

  /* ---------- kicks ---------- */
  // kind of kick from the kicker's state: in the air = shot at the hoop; on the ground towards the partner = pass;
  // on the ground towards nobody = nudge sideways; no direction = keep it up yourself
  function kickKind(G, p, dir, air) {
    if (air) return 'shot';
    const o = p.id === 'pink' ? G.mint : G.pink;
    if (dir && Math.sign((o.x + o.w / 2) - (p.x + p.w / 2)) === dir) return 'pass';
    return dir ? 'nudge' : 'juggle';
  }
  // a pass is the ball going from one player to the other; bouncing off a partner who has not moved for a while
  // (away from the keys, or just used as a wall) does not count
  function touch(G, p, head) {
    const ch = G.chain, from = ch.last;
    if (head && p.still > 1.5) return from;                       // just a wall
    if (from && from !== p.id) { ch.passes++; G.ev.passes++; }
    ch.last = p.id;
    return from;
  }
  // velocity that takes the ball from (x, y) to (tx, ty) in T seconds under gravity and part of the wind
  function aim(G, b, tx, ty, T, windShare) {
    const a = G.wind * windShare;
    b.vx = (tx - b.x - 0.5 * a * T * T) / T;
    b.vy = (ty - b.y - 0.5 * GB * T * T) / T;
  }
  function kick(G, p, dir, air, ev) {
    const b = G.ball, o = p.id === 'pink' ? G.mint : G.pink, kind = kickKind(G, p, dir, air);
    const from = touch(G, p);
    p.cd = KICK_CD; p.kickT = 0.24; p.kickK = kind;
    G.ev.kicks++;
    const cx = p.x + p.w / 2;
    if (kind === 'shot') {
      const h = litHoop(G), hx0 = hoopX(G, h, G.t), back = Math.sign(hx0 - cx) === -p.face && Math.abs(hx0 - cx) > 20;
      // shot quality: ball near head height, received from the partner, near the top of the jump, not too far
      let q = 1 - clamp(Math.abs(b.y - (p.y + 4)) / 60, 0, 1) * 0.35;
      if (from && from !== p.id) q += 0.15; else if (from === p.id) q -= 0.15;
      if (Math.abs(p.vy) < 240) q += 0.08;
      const dist = Math.abs(hx0 - b.x);
      if (dist > 320) q -= (dist - 320) / 600;
      if (back) q -= 0.12;
      q = clamp(q, 0.1, 1);
      const err = (1 - q) * 84 * (G.rand() * 2 - 1);
      const apexY = Math.min(h.y - 70 - G.rand() * 24, b.y - 30);
      const vy0 = -Math.sqrt(2 * GB * Math.max(10, b.y - apexY));
      const T = -vy0 / GB + Math.sqrt(2 * Math.max(0, h.y - apexY) / GB);
      const tx = hoopX(G, h, G.t + T) + err;
      b.vy = vy0; b.vx = (tx - b.x - 0.5 * G.wind * SHOT_WIND * T * T) / T;
      G.chain.kind = back ? 'back' : 'shot'; G.chain.shooter = p.id; G.chain.q = q;
      ev.push(`kick:${p.id}:${back ? 'back' : 'shot'}`);
      return;
    }
    G.chain.kind = null;
    if (kind === 'pass') {
      const ox = clamp(o.x + o.w / 2 + o.vx * 0.25, 30, VW - 30), dx = ox - b.x;
      let T = clamp(0.62 + Math.abs(dx) / 650, 0.66, 1.15);
      const ty = o.y - 46;
      for (let k = 0; k < 6; k++) {                          // keep the arc under the top of the court
        aim(G, b, ox, ty, T, PASS_WIND);
        const apex = b.vy < 0 ? b.y - b.vy * b.vy / (2 * GB) : b.y;
        if (apex > TOP + 40) break;
        T *= 0.88;
      }
      ev.push(`kick:${p.id}:pass`);
    } else if (kind === 'nudge') {
      b.vx = dir * 170 - G.wind * 0.3; b.vy = -Math.sqrt(2 * GB * Math.max(20, b.y - (p.y - 90)));
      ev.push(`kick:${p.id}:nudge`);
    } else {
      b.vx = clamp((cx - b.x) * 2.2, -120, 120) - G.wind * 0.6; b.vy = -Math.sqrt(2 * GB * Math.max(20, b.y - (p.y - 120)));
      ev.push(`kick:${p.id}:juggle`);
    }
  }
  function tryKick(G, p, dir, ev) {
    if (p.cd > 0) return false;
    const b = G.ball;
    if (!b.live || !inReach(p, b.x, b.y)) { p.cd = WHIFF_CD; p.kickT = 0.18; p.kickK = 'whiff'; return false; }
    kick(G, p, dir, !p.ground, ev);
    return true;
  }
  // online: the guest kicked the ball where it saw it, which is where the ball was a moment ago on the host.
  // Find that moment in the recent history, kick the ball from there and fly it forward to now (lag compensation).
  // A drop that happened in between is undone; a touch by the host's own player in between wins over the guest.
  function remoteKick(G, id, k, ev) {
    const p = G[id], b = G.ball;
    if (!k || !Number.isFinite(k.bx) || !Number.isFinite(k.by) || !Number.isFinite(k.px) || !Number.isFinite(k.py)) return false;
    let h = null, bd = 46;
    for (const e of G.hist) { const d = Math.hypot(e[1] - k.bx, e[2] - k.by); if (d < bd) { bd = d; h = e; } }
    const body = { x: k.px, y: k.py, w: p.w, h: p.h };
    if (!h || !inReach(body, k.bx, k.by, 12)) return false;
    if (G.ev.kicks + G.ev.heads !== h[9]) return false;          // someone touched it after that moment
    const dropped = G.ev.drops - h[5];
    if (dropped > 1 || (dropped === 1 && (b.live || G.chain.last))) return false;
    if (!dropped && !b.live) return false;
    if (dropped) { G.ev.drops = h[5]; b.live = true; b.wait = 0; ev.push('undrop'); }
    G.chain.last = h[6]; G.chain.passes = h[7]; G.chain.kind = h[8];
    b.x = h[1]; b.y = h[2]; b.vx = h[3]; b.vy = h[4];
    const keep = { x: p.x, y: p.y, ground: p.ground };
    p.x = k.px; p.y = k.py; p.ground = !k.air;
    if (k.head) { headBounce(b, p, +k.pvy || 0); headTouch(G, p, ev); }
    else kick(G, p, [-1, 0, 1].includes(k.dir) ? k.dir : 0, !!k.air, ev);
    p.x = keep.x; p.y = keep.y; p.ground = keep.ground;
    for (let t = h[0]; t < G.t - 1e-9; t += DT) moveBall(G, DT, ev);
    return true;
  }

  /* ---------- ball ---------- */
  function bounceCircle(b, cx, cy, r, e) {
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), m = r + BR;
    if (d >= m || d < 1e-6) return false;
    const nx = dx / d, ny = dy / d;
    b.x = cx + nx * m; b.y = cy + ny * m;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
    return true;
  }
  function moveBall(G, dt, ev, opts = {}) {
    const b = G.ball;
    b.vy += GB * dt; b.vx += G.wind * dt;
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt; b.spin += b.vx * dt * 0.06;
    if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * WALL_E; }
    else if (b.x > VW - BR) { b.x = VW - BR; b.vx = -Math.abs(b.vx) * WALL_E; }
    if (b.y < TOP) { b.y = TOP; b.vy = Math.abs(b.vy) * 0.5; }
    for (const br of G.branches) if (bounceCircle(b, br.x, br.y, br.r, LEAF_E) && ev) ev.push('leaf');
    for (const h of G.hoops) {
      for (const s of [-1, 1]) if (bounceCircle(b, h.cx + s * HR, h.y, RIM, RIM_E)) { if (ev) { ev.push('rim'); G.ev.rims++; } }
      if (!opts.noScore && py < h.y && b.y >= h.y) {
        const t = (h.y - py) / Math.max(1e-6, b.y - py), xc = px + (b.x - px) * t;
        if (Math.abs(xc - h.cx) < HR - RIM - BR * 0.3) goal(G, h, ev);
      }
    }
    return { px, py };
  }
  function goal(G, h, ev) {
    const ch = G.chain;
    if (!h.lit) { G.ev.dark++; ev.push('dark'); return; }
    if (ch.passes < 1) { G.ev.nopass++; ev.push('nopass'); ch.kind = null; return; }
    const kind = ch.kind || (ch.last ? 'lucky' : 'lucky');
    const mult = 1 + MULT_STEP * Math.min(ch.passes, MULT_MAX);
    const pts = Math.round(BASE[kind] * mult);
    G.score += pts; G.ev.goals++; G.ev.best = Math.max(G.ev.best, pts);
    G.last = { pts, kind, passes: ch.passes, x: h.cx, y: h.y, by: ch.shooter || ch.last, t: G.t };
    ev.push(`goal:${G.last.by || ''}:${pts}:${kind}:${ch.passes}`);
    ch.passes = 0; ch.kind = null; ch.last = null; ch.shooter = null;
  }
  // jumping into the ball is a header; a ball landing on a head that is not going up loses its bounce and rolls off
  function headBounce(b, p, pvy) {
    const header = pvy < -120, off = b.x - (p.x + p.w / 2);
    b.y = p.y - BR;
    if (header) { b.vy = -Math.max(Math.abs(b.vy) * HEAD_E, 380); b.vx = b.vx * 0.6 + off * 3; }
    else { b.vy = -Math.abs(b.vy) * 0.42; b.vx = b.vx * 0.6 + (Math.abs(off) > 1 ? Math.sign(off) : p.face) * 70 + off * 2; }
  }
  const onHead = (b, p) => { const nx = clamp(b.x, p.x, p.x + p.w), ny = clamp(b.y, p.y, p.y + p.h); return Math.hypot(b.x - nx, b.y - ny) < BR && b.y < p.y + 6 && b.vy > 0; };
  function headTouch(G, p, ev) {
    if (p.headCd > 0) return;
    const wall = p.still > 1.5;
    touch(G, p, true); if (!wall) G.chain.kind = 'head'; G.ev.heads++; ev.push(`head:${p.id}`); p.headCd = 0.15;
  }
  // the ball against bodies: a head bounce counts as a touch; sides just push it away. Online nobody's body stops
  // the ball (each phone sees the other player a little late, so bounces would disagree); you kick it instead.
  function bodies(G, ev) {
    const b = G.ball;
    if (G.net) return;
    for (const p of [G.pink, G.mint]) {
      const nx = clamp(b.x, p.x, p.x + p.w), ny = clamp(b.y, p.y, p.y + p.h), dx = b.x - nx, dy = b.y - ny, d = Math.hypot(dx, dy);
      if (d >= BR) continue;
      if (b.y < p.y + 6 && b.vy > 0) { headBounce(b, p, p.vy); headTouch(G, p, ev); }
      else if (d > 1e-6) {
        b.x = nx + dx / d * BR; b.y = ny + dy / d * BR;
        const vn = (b.vx * dx + b.vy * dy) / d;
        if (vn < 0) { b.vx -= 1.4 * vn * dx / d; b.vy -= 1.4 * vn * dy / d; }
      }
    }
  }
  function stepBall(G, dt, ev) {
    const b = G.ball;
    for (const p of [G.pink, G.mint]) p.still = p.ground && Math.abs(p.vx) < 5 ? (p.still || 0) + dt : 0;
    if (!b.live) {
      b.wait -= dt;
      const p = G[b.to]; b.x += (clamp(p.x + p.w / 2, 60, VW - 60) - b.x) * Math.min(1, dt * 3);
      if (b.wait <= 0) { b.live = true; b.vy = 60; b.vx = 0; ev.push('serve'); }
      return;
    }
    moveBall(G, dt, ev);
    bodies(G, ev);
    const ch = G.chain;
    G.hist.push([G.t, b.x, b.y, b.vx, b.vy, G.ev.drops, ch.last, ch.passes, ch.kind, G.ev.kicks + G.ev.heads]);
    while (G.hist.length && G.hist[0][0] < G.t - 0.7) G.hist.shift();
    if (b.y + BR >= GROUND) {
      const afterGoal = G.last && G.t - G.last.t < 2.5;            // a ball that just went through the hoop is not a miss
      if (afterGoal) ev.push('land'); else { G.ev.drops++; ev.push('drop'); }
      const lastBy = afterGoal ? G.last.by : G.chain.last;
      serve(G, lastBy === 'pink' ? 'mint' : lastBy === 'mint' ? 'pink' : (b.to === 'pink' ? 'mint' : 'pink'), RESPAWN);
      b.dropX = b.x;
    }
  }

  /* ---------- one tick for the host / local game ---------- */
  // inp: { pink: { mx, my, act }, mint: {...} }; online the remote player is moved by the network instead
  function step(G, inp) {
    const ev = [];
    if (G.over) return ev;
    const net = G.net, remote = net ? (net.local === 'pink' ? 'mint' : 'pink') : null;
    G.t += DT; G.left = Math.max(0, G.left - DT);
    world(G);
    for (const id of ['pink', 'mint']) {
      if (id === remote) continue;
      const p = G[id], i = inp[id] || {};
      if (stepPlayer(G, p, i, DT)) ev.push(`jump:${id}`);
      if (i.act) tryKick(G, p, Math.abs(i.mx || 0) > 0.3 ? Math.sign(i.mx) : 0, ev);
    }
    if (remote) { const p = G[remote]; p.cd = Math.max(0, p.cd - DT); p.kickT = Math.max(0, p.kickT - DT); p.headCd = Math.max(0, p.headCd - DT); }
    stepBall(G, DT, ev);
    if (G.left <= 0 && !G.over) { G.over = true; ev.push('over'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  // where will the ball come down to height y (straight-line flight, wind included)? used for the landing marker and the bots
  function predict(G, y, maxT = 3) {
    const b = G.ball;
    let x = b.x, by = b.y, vx = b.vx, vy = b.vy, t = 0;
    if (!b.live) return { x: b.x, t: b.wait + Math.sqrt(2 * Math.max(0, y - b.y) / GB) };
    const dt = 1 / 60;
    while (t < maxT) {
      vy += GB * dt; vx += windAt(G, G.t + t) * dt; x += vx * dt; by += vy * dt; t += dt;
      if (x < BR) { x = BR; vx = Math.abs(vx) * WALL_E; } else if (x > VW - BR) { x = VW - BR; vx = -Math.abs(vx) * WALL_E; }
      if (vy > 0 && by >= y) return { x, t };
    }
    return { x, t };
  }

  /* ---------- online ---------- */
  const r1 = v => Math.round(v * 10) / 10;
  const KIND = ['', 'shot', 'back', 'head', 'lucky'];
  function encode(G) {
    const b = G.ball, ch = G.chain, e = G.ev, l = G.last;
    return { t: Math.round(G.t * 1000) / 1000, l: r1(G.left), s: G.score, o: G.over ? 1 : 0,
      b: [r1(b.x), r1(b.y), Math.round(b.vx), Math.round(b.vy), b.live ? 1 : 0, Math.round(b.wait * 100) / 100, b.to === 'mint' ? 1 : 0],
      c: [ch.last === 'pink' ? 1 : ch.last === 'mint' ? 2 : 0, ch.passes, KIND.indexOf(ch.kind || '')],
      e: [e.goals, e.kicks, e.passes, e.drops, e.rims, e.heads, e.nopass, e.dark, e.best],
      g: l ? [l.pts, KIND.indexOf(l.kind), l.passes, Math.round(l.x), Math.round(l.y), l.by === 'mint' ? 1 : 0] : null };
  }
  function apply(G, m, now) {
    if (!m || !Array.isArray(m.b)) return;
    if (Number.isFinite(m.t)) G.t = m.t;
    if (Number.isFinite(m.l)) G.left = m.l;
    if (Number.isFinite(m.s)) G.score = m.s;
    G.over = !!m.o;
    const [x, y, vx, vy, live, wait, to] = m.b, b = G.ball;
    if ([x, y, vx, vy].every(Number.isFinite)) {
      b.net = { x, y, vx, vy, at: now || 0 };
      if (!live || !b.live || Math.hypot(x - b.x, y - b.y) > 90) { b.x = x; b.y = y; b.vx = vx; b.vy = vy; }
    }
    b.live = !!live; b.wait = +wait || 0; b.to = to ? 'mint' : 'pink';
    if (Array.isArray(m.c)) { G.chain.last = m.c[0] === 1 ? 'pink' : m.c[0] === 2 ? 'mint' : null; G.chain.passes = m.c[1] | 0; G.chain.kind = KIND[m.c[2]] || null; }
    if (Array.isArray(m.e)) { const k = ['goals', 'kicks', 'passes', 'drops', 'rims', 'heads', 'nopass', 'dark', 'best']; k.forEach((n, i) => { G.ev[n] = m.e[i] | 0; }); }
    if (Array.isArray(m.g)) G.last = { pts: m.g[0], kind: KIND[m.g[1]] || 'shot', passes: m.g[2], x: m.g[3], y: m.g[4], by: m.g[5] ? 'mint' : 'pink' };
    world(G);
  }
  // guest: fly the ball locally and pull it towards where the host says it is now
  function smooth(G, now, dt = DT) {
    const b = G.ball, n = b.net;
    G.t += dt; world(G);
    if (!b.live) return;
    moveBall(G, dt, null, { noScore: true });
    if (!n) return;
    const age = Math.min(0.25, Math.max(0, ((now || 0) - n.at) / 1000));
    const tx = n.x + n.vx * age + 0.5 * G.wind * age * age, ty = n.y + n.vy * age + 0.5 * GB * age * age;
    const tvx = n.vx + G.wind * age, tvy = n.vy + GB * age;
    if (Math.hypot(tx - b.x, ty - b.y) > 70) { b.x = tx; b.y = ty; b.vx = tvx; b.vy = tvy; return; }
    b.x += (tx - b.x) * 0.18; b.y += (ty - b.y) * 0.18;
    b.vx += (tvx - b.vx) * 0.18; b.vy += (tvy - b.vy) * 0.18;
  }
  function guestHead(G, id) {
    const p = G[id], b = G.ball;
    if (!b.live || p.headCd > 0 || !onHead(b, p)) return null;
    const req = { bx: Math.round(b.x), by: Math.round(b.y), px: Math.round(p.x), py: Math.round(p.y), dir: 0, air: !p.ground, head: 1, pvy: Math.round(p.vy) };
    headBounce(b, p, p.vy); p.headCd = 0.15;
    return req;
  }
  function encodePlayer(G, id, kick) {
    const p = G[id];
    return { x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), f: p.face, g: p.ground ? 1 : 0, k: p.kickT > 0 ? 1 : 0, kk: p.kickK || '',
      ka: kick ? kick.n : 0, kq: kick && kick.req ? kick.req : null };
  }
  function applyPlayer(G, id, m, now) {
    if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const p = G[id];
    if (!p.net) { p.x = m.x; p.y = m.y; }
    p.net = { x: m.x, y: m.y, vx: +m.vx || 0, vy: +m.vy || 0, at: now };
    if (m.f === 1 || m.f === -1) p.face = m.f;
    p.ground = !!m.g;
    if (m.k && p.kickT <= 0) { p.kickT = 0.24; p.kickK = typeof m.kk === 'string' ? m.kk : ''; }
  }
  function smoothPlayer(G, id, now) {
    const p = G[id], n = p.net;
    if (!n) return;
    const age = Math.min(0.1, Math.max(0, (now - n.at) / 1000));
    const tx = n.x + n.vx * age, ty = Math.min(GROUND - p.h, n.y + n.vy * age);
    if (Math.abs(tx - p.x) > 80 || Math.abs(ty - p.y) > 80) { p.x = tx; p.y = ty; }
    else { p.x += (tx - p.x) * 0.3; p.y += (ty - p.y) * 0.3; }
    p.vx = n.vx; p.vy = n.vy;
    p.walk = p.ground && Math.abs(p.vx) > 20 ? p.walk + DT * Math.abs(p.vx) / 16 : 0;
  }

  return { VW, VH, GROUND, DT, PW, PH, BR, HR, RIM, GB, JUMP, GP, BASE, MULT_STEP, MULT_MAX, load, step, stepPlayer, tryKick, remoteKick, kick, kickKind, inReach,
    stars, predict, hoopX, windAt, litIndex, world, litHoop, encode, apply, smooth, encodePlayer, applyPlayer, smoothPlayer, guestHead };
})();

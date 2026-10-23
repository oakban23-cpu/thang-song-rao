/* Tower (ต่อตึกด้วยกัน): every floor is two halves, pink's on the left and mint's on the right. Each half swings on
   its own crane; press to let go. Whatever does not sit on the same player's half below is cut off, so halves get
   narrower. Landing within a few pixels snaps on exactly ("perfect") and grows the half back a little, first toward
   the partner's half to close the seam. A floor whose halves meet is sealed and steadies the tower; a gap makes the
   whole tower sway more, which makes every later drop harder for both. Both halves perfect on one floor gives a hard
   hat back. Three halves dropped off the tower in total and the site closes. Stars come from floors built.
   World units are canvas pixels; floor k (k >= 1) sits between GROUND - k*FH and GROUND - (k-1)*FH. */
const Twr = (() => {
  'use strict';
  const VW = 960, VH = 544, DT = 1 / 120;
  const FH = 34, GROUND = 470, CX = 480, W0 = 150;
  const MIN_W = 8, PERFECT = 5, GROW = 6, SEAM = 2;
  const DROP_H = 160, GRAV = 1900, LIVES = 3;
  const FUSE = 5, FUSE_RND = 1, NEXT_DELAY = 0.55, RESPAWN = 0.7, FIRST = 1.2, REMOTE_GRACE = 2.5;
  const SWAY_T = 3.4, SWAY_H = 12, WOB_PX = 3, WOB_MAX = 6, SWAY_EASE = 8;
  const FALL_T = Math.sqrt(2 * DROP_H / GRAV);
  const PTS = { half: 10, perfect: 10, seal: 10, both: 20 };
  const WHO = ['pink', 'mint'];
  const other = w => (w === 'pink' ? 'mint' : 'pink');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const restY = n => GROUND - (n - 1) * FH;                       // the floor being built (n >= 1) rests on this y
  const capW = (def, n) => (def.taper ? Math.max(def.minCap || 40, W0 - def.taper * (n - 1)) : W0);
  const hf = k => Math.pow(Math.min(1, Math.max(0, k) / SWAY_H), 1.5);
  // how far floor k leans sideways at time t (the cranes stand still, the tower moves under them)
  const off = (G, k, t) => G.swayA * Math.sin(2 * Math.PI * t / SWAY_T) * hf(k);
  const swayTarget = G => (G.def.sway || 0) + Math.min(G.wobble, WOB_MAX) * WOB_PX;

  function load(def, seed) {
    const G = {
      def, t: 0, n: 1, R: rng(seed || 7),
      floors: [{ pink: { a: CX - W0, b: CX }, mint: { a: CX, b: CX + W0 }, seal: true, perf: { pink: true, mint: true }, gap: 0 }],
      cur: { pink: null, mint: null }, blk: { pink: null, mint: null }, respawn: { pink: 0, mint: 0 }, pf: { pink: false, mint: false },
      lives: LIVES, score: 0, wobble: 0, swayA: def.sway || 0, wind: 0, next: FIRST, over: false, won: false, ids: 0, lands: 0,
      last: { pink: null, mint: null }, stats: { perfect: 0, seal: 0, crack: 0, miss: 0, both: 0, auto: 0, halves: 0 }, net: null
    };
    setWind(G);
    return G;
  }
  function setWind(G) {
    const d = G.def;
    if (!d.wind) { G.wind = 0; return; }
    G.wind = Math.round(d.wind * (0.4 + 0.6 * G.R()) * (G.R() < 0.5 ? -1 : 1));
  }
  function speedOf(G, who) {
    const d = G.def;
    let m = 1;
    if (d.mul) { const sw = d.swapEvery ? Math.floor((G.n - 1) / d.swapEvery) % 2 === 1 : false; m = d.mul[(who === 'pink') !== sw ? 0 : 1]; }
    return (d.speed + (d.accel || 0) * (G.n - 1)) * m;
  }
  function spawn(G, who) {
    const below = G.floors[G.n - 1][who];
    const w = Math.min(below.b - below.a, capW(G.def, G.n));
    const T = who === 'pink' ? below.b - w : below.a;               // the perfect spot: inner edges line up
    const amp = G.def.amp, u = who === 'pink' ? -amp : amp;          // pink swings in from the left, mint from the right
    G.blk[who] = { id: ++G.ids, who, w, T, amp, u, dir: who === 'pink' ? 1 : -1, v: speedOf(G, who), x: T + u, tx: null,
      y: restY(G.n) - DROP_H, vy: 0, vx: 0, st: 'swing', t: 0, fuse: FUSE + G.R() * FUSE_RND };
    G.pf[who] = false;
  }
  // swing position after dt seconds from now (dt may be negative): back and forth between -amp and +amp
  function uAt(b, dt) {
    const A = b.amp, L = 4 * A, p = b.u + b.dir * b.v * dt;
    const s = (((p + A) % L) + L) % L;
    return s <= 2 * A ? s - A : 3 * A - s;
  }
  function dirAt(b, dt) { const e = 1e-4; return Math.sign(uAt(b, dt + e) - uAt(b, dt)) || b.dir; }
  function swing(b, dt) { const u = uAt(b, dt); b.dir = dirAt(b, dt); b.u = u; b.x = b.T + u; b.t += dt; }
  function drop(G, who, ev) {
    const b = G.blk[who];
    b.st = 'fall'; b.vy = 0; b.vx = G.wind;
    ev.push('drop:' + who);
  }
  // where (in tower coordinates) the block would land if let go after 'ahead' seconds; for bots and tests
  function predict(G, who, ahead = 0) {
    const b = G.blk[who]; if (!b) return null;
    const x = b.T + uAt(b, ahead), tl = G.t + ahead + FALL_T;
    return x + G.wind * FALL_T - G.swayA * Math.sin(2 * Math.PI * tl / SWAY_T) * hf(G.n - 1);
  }

  function land(G, who, b, ev) {
    const below = G.floors[G.n - 1][who], o = off(G, G.n - 1, G.t + (b.ts || 0));   // online: judged on the guest's own clock
    const xt = b.x - o, d = xt - b.T, perfect = Math.abs(d) <= PERFECT;
    const x = perfect ? b.T : xt;
    let a = Math.max(x, below.a), e = Math.min(x + b.w, below.b);
    G.blk[who] = null;
    G.lands++;
    if (e - a < MIN_W) {
      G.lives--; G.stats.miss++;
      G.last[who] = { k: G.lands, x, w: b.w, a: x, b: x, perf: false, miss: true, y: restY(G.n), o };
      ev.push('miss:' + who);
      if (G.lives <= 0) { G.lives = 0; G.over = true; ev.push('collapse'); }
      else G.respawn[who] = RESPAWN;
      return;
    }
    const ca = a, cb = e;                                           // what survived the cut, before growing
    if (perfect) {
      let gr = Math.min(GROW, capW(G.def, G.n) - (e - a));
      if (gr > 0) {
        const ob = G.floors[G.n - 1][other(who)], oc = G.cur[other(who)];
        if (who === 'pink') { const lim = Math.min(ob.a, oc ? oc.a : Infinity), r = clamp(lim - e, 0, gr); e += r; gr -= r; a -= gr; }
        else { const lim = Math.max(ob.b, oc ? oc.b : -Infinity), r = clamp(a - lim, 0, gr); a -= r; gr -= r; e += gr; }
        a = Math.max(a, 30); e = Math.min(e, VW - 30);
      }
      G.stats.perfect++; G.score += PTS.perfect;
    }
    G.cur[who] = { a: r1(a), b: r1(e) };
    G.pf[who] = perfect; G.stats.halves++; G.score += PTS.half;
    G.last[who] = { k: G.lands, x, w: b.w, a: ca, b: cb, perf: perfect, miss: false, y: restY(G.n), o };
    ev.push('land:' + who + (perfect ? ':p' : ''));
    if (G.cur.pink && G.cur.mint) finishFloor(G, ev);
  }
  function finishFloor(G, ev) {
    const p = G.cur.pink, m = G.cur.mint, gap = r1(m.a - p.b), seal = gap <= SEAM;
    if (seal && gap > 0) { const h = gap / 2; p.b = r1(p.b + h); m.a = p.b; }
    if (seal) { G.wobble = Math.max(0, G.wobble - 1); G.stats.seal++; G.score += PTS.seal; }
    else { G.wobble = Math.min(WOB_MAX, G.wobble + 1); G.stats.crack++; }
    const both = G.pf.pink && G.pf.mint;
    G.floors.push({ pink: p, mint: m, seal, perf: { pink: G.pf.pink, mint: G.pf.mint }, gap: seal ? 0 : gap });
    ev.push(seal ? 'seal' : 'crack');
    if (both) { G.stats.both++; G.score += PTS.both; ev.push('both'); if (G.lives < LIVES) { G.lives++; ev.push('life'); } }
    G.cur = { pink: null, mint: null }; G.blk = { pink: null, mint: null }; G.respawn = { pink: 0, mint: 0 };
    if (G.n >= G.def.top) { G.won = true; G.over = true; ev.push('top'); return; }
    G.n++; G.next = NEXT_DELAY;
    if (G.def.wind && (G.n - 1) % (G.def.windEvery || 3) === 0) { const w0 = G.wind; setWind(G); if (G.wind !== w0) ev.push('wind'); }
  }

  /* one step for one device. inp: { pink: { drop }, mint: { drop } } with drop true on the step a button went down.
     Online the host steps everything but only swings its own player's crane: the guest's crane position and its
     drop arrive by message (remote / dropAt). */
  function step(G, inp) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    const tg = swayTarget(G);
    G.swayA += clamp(tg - G.swayA, -SWAY_EASE * DT, SWAY_EASE * DT);
    if (G.next > 0) { G.next -= DT; if (G.next <= 0) { G.next = 0; for (const w of WHO) if (!G.cur[w] && !G.blk[w]) spawn(G, w); ev.push('swing'); } }
    for (const who of WHO) {
      if (G.respawn[who] > 0) { G.respawn[who] -= DT; if (G.respawn[who] <= 0) { G.respawn[who] = 0; if (!G.over && !G.cur[who]) { spawn(G, who); ev.push('respawn:' + who); } } }
      const b = G.blk[who]; if (!b) continue;
      const remote = !!(G.net && G.net.local !== who);
      if (b.st === 'swing') {
        if (remote) {
          b.t += DT;
          if (b.tx != null) { b.x += (b.tx - b.x) * 0.35; b.u = b.x - b.T; }
          if (b.t >= b.fuse + REMOTE_GRACE) { drop(G, who, ev); G.stats.auto++; ev.push('auto:' + who); }
        } else {
          swing(b, DT);
          if (inp && inp[who] && inp[who].drop) drop(G, who, ev);
          else if (b.t >= b.fuse) { drop(G, who, ev); G.stats.auto++; ev.push('auto:' + who); }
        }
      } else if (b.st === 'fall') {
        b.vy += GRAV * DT; b.y += b.vy * DT; b.x += b.vx * DT;
        if (b.y >= restY(G.n)) { b.y = restY(G.n); land(G, who, b, ev); if (G.over) return ev; }
      }
    }
    return ev;
  }
  // the host: the guest let go of its half at x (world left edge) on block id, at its clock time tg.
  // The guest's clock runs a little behind ours, so the sway it aimed at is judged on its clock, not ours.
  function dropAt(G, who, x, id, tg) {
    const b = G.blk[who];
    if (!b || b.st !== 'swing' || (id != null && b.id !== id) || !Number.isFinite(x)) return false;
    b.x = clamp(x, b.T - b.amp, b.T + b.amp); b.u = b.x - b.T; b.tx = null;
    b.ts = Number.isFinite(tg) ? clamp(tg - G.t, -1.5, 0.2) : 0;
    drop(G, who, []);
    return true;
  }
  // the host: where the guest's crane is now
  function remoteX(G, who, x, id) { const b = G.blk[who]; if (b && b.st === 'swing' && b.id === id && Number.isFinite(x)) b.tx = clamp(x, b.T - b.amp, b.T + b.amp); }

  /* the guest: swings its own crane and lets go locally (the host decides where it lands); everything else is
     drawn from the host's snapshots, moved along between them. Returns { id, x } when the local half is let go. */
  function guestStep(G, local, press) {
    if (G.over) return null;
    G.t += DT;
    let req = null;
    for (const who of WHO) {
      const b = G.blk[who]; if (!b) continue;
      if (b.st === 'swing') {
        swing(b, DT);
        if (who === local && (press || b.t >= b.fuse)) { b.st = 'fall'; b.vy = 0; b.vx = G.wind; b.pred = true; req = { id: b.id, x: r1(b.x), t: r3(G.t), auto: !press }; }
      } else if (b.st === 'fall' && b.y < restY(G.n)) {
        b.vy += GRAV * DT; b.y = Math.min(restY(G.n), b.y + b.vy * DT); b.x += b.vx * DT;
      }
    }
    return req;
  }

  /* ---------- online snapshot ---------- */
  const encB = b => (b ? [b.id, b.st === 'swing' ? 0 : 1, r1(b.x), r1(b.y), r1(b.w), r1(b.T), b.amp, r1(b.v), r3(b.t), r3(b.fuse), r1(b.vy), r1(b.vx), r1(b.u), b.dir] : 0);
  const encL = l => (l ? [l.k, r1(l.x), r1(l.w), r1(l.a), r1(l.b), l.perf ? 1 : 0, l.miss ? 1 : 0, r1(l.y), r1(l.o)] : 0);
  function encode(G) {
    const base = Math.max(0, G.floors.length - 14);
    return {
      t: r3(G.t), n: G.n, lv: G.lives, sc: G.score, wb: G.wobble, sa: r1(G.swayA), wd: G.wind, nx: r3(G.next), ov: G.over ? 1 : 0, wn: G.won ? 1 : 0,
      fb: base, fl: G.floors.slice(base).map(f => [f.pink.a, f.pink.b, f.mint.a, f.mint.b, (f.seal ? 1 : 0) | (f.perf.pink ? 2 : 0) | (f.perf.mint ? 4 : 0), f.gap]),
      cu: WHO.map(w => (G.cur[w] ? [G.cur[w].a, G.cur[w].b] : 0)), bk: WHO.map(w => encB(G.blk[w])), rs: WHO.map(w => r3(G.respawn[w])),
      ls: WHO.map(w => encL(G.last[w])), pf: WHO.map(w => (G.pf[w] ? 1 : 0)), st: G.stats, ld: G.lands
    };
  }
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  function decB(a) {
    if (!Array.isArray(a) || a.length < 14) return null;
    const [id, st, x, y, w, T, amp, v, t, fuse, vy, vx, u, dir] = a.map(q => num(q));
    return { id, who: null, st: st ? 'fall' : 'swing', x, y, w, T, amp: amp || 1, v, t, fuse, vy, vx, u, dir: dir < 0 ? -1 : 1, tx: null };
  }
  function apply(G, m, local) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.fl)) return;
    G.t = num(m.t, G.t); G.n = Math.max(1, num(m.n, G.n) | 0); G.lives = num(m.lv, G.lives); G.score = num(m.sc, G.score);
    G.wobble = num(m.wb, G.wobble); G.swayA = num(m.sa, G.swayA); G.wind = num(m.wd, G.wind); G.next = num(m.nx, 0);
    G.over = !!m.ov; G.won = !!m.wn; G.lands = num(m.ld, G.lands);
    const base = Math.max(0, num(m.fb) | 0);
    if (m.fl.length && base <= G.floors.length) {
      m.fl.forEach((f, i) => {
        if (!Array.isArray(f) || f.length < 6) return;
        G.floors[base + i] = { pink: { a: num(f[0]), b: num(f[1]) }, mint: { a: num(f[2]), b: num(f[3]) }, seal: !!(f[4] & 1), perf: { pink: !!(f[4] & 2), mint: !!(f[4] & 4) }, gap: num(f[5]) };
      });
      G.floors.length = base + m.fl.length;
    }
    WHO.forEach((w, i) => {
      const c = m.cu && m.cu[i]; G.cur[w] = Array.isArray(c) ? { a: num(c[0]), b: num(c[1]) } : null;
      G.respawn[w] = num(m.rs && m.rs[i]);
      G.pf[w] = !!(m.pf && m.pf[i]);
      const l = m.ls && m.ls[i];
      G.last[w] = Array.isArray(l) && l.length >= 9 ? { k: num(l[0]), x: num(l[1]), w: num(l[2]), a: num(l[3]), b: num(l[4]), perf: !!l[5], miss: !!l[6], y: num(l[7]), o: num(l[8]) } : null;
      const nb = decB(m.bk && m.bk[i]), ob = G.blk[w];
      if (!nb) { G.blk[w] = null; return; }
      nb.who = w;
      if (ob && ob.id === nb.id) {
        if (w === local && (ob.st === 'swing' || ob.pred)) { if (nb.st === 'fall' && ob.pred) { ob.x = nb.x; } return; }   // our own crane: ours to move
        if (ob.st === 'fall' && nb.st === 'fall') { ob.x = nb.x; ob.vx = nb.vx; if (Math.abs(ob.y - nb.y) > 40) { ob.y = nb.y; ob.vy = nb.vy; } return; }
      }
      G.blk[w] = nb;
    });
    if (m.st && typeof m.st === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.st[k], G.stats[k]);
  }

  const floorsDone = G => G.floors.length - 1;
  function stars(G) { const f = floorsDone(G), s = G.def.stars; return f >= s[2] ? 3 : f >= s[1] ? 2 : f >= s[0] ? 1 : 0; }

  return { VW, VH, DT, FH, GROUND, CX, W0, MIN_W, PERFECT, GROW, SEAM, DROP_H, GRAV, LIVES, FUSE, FALL_T, SWAY_T, WOB_MAX, PTS,
    restY, capW, off, hf, load, step, predict, uAt, dropAt, remoteX, guestStep, encode, apply, floorsDone, stars, speedOf };
})();

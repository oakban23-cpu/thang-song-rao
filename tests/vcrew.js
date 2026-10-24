/* Moving-house crew: the planners and the two-player controller used by the bots (tests) and the browser pilots.
   Needs Mov. */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

class Heap { constructor() { this.a = []; } push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }

// furniture: from its pose to the goal (x, y, angle), as a list of poses
function planItem(G, i, goal, S = 8) {
  const it = G.items[i], k = Mov.KINDS[it.k], NA = k.facing ? 24 : 12, AS = (k.facing ? 2 : 1) * Math.PI / NA;
  const ai = a => ((Math.round(a / AS) % NA) + NA) % NA, key = (x, y, a) => (x * 200 + y) * 64 + a;
  const free = new Map(), ok = (x, y, a) => { const kk = key(x, y, a); if (!free.has(kk)) free.set(kk, Mov.poseFree(G, i, x * S, y * S, a * AS)); return free.get(kk); };
  const turnOk = (x, y, a, da) => Mov.poseFree(G, i, x * S, y * S, (a + da * .5) * AS);   // turning: the pose halfway must be free too
  const sx = Math.round(it.x / S), sy = Math.round(it.y / S), sa = ai(it.a), gx = Math.round(goal[0] / S), gy = Math.round(goal[1] / S), ga = ai(goal[2]);
  const h = (x, y, a) => Math.hypot(x - gx, y - gy) + Math.min(Math.abs(a - ga), NA - Math.abs(a - ga)) * 1.2;
  const open = new Heap(), from = new Map(), cost = new Map(), start = key(sx, sy, sa);
  open.push([h(sx, sy, sa), 0, sx, sy, sa]); cost.set(start, 0);
  let n = 0;
  while (open.size && n++ < 400000) {
    const [, c, x, y, a] = open.pop(), kk = key(x, y, a);
    if (c > cost.get(kk)) continue;
    const atGoal = a === ga && ((x === gx && y === gy) || (Math.abs(x * S - goal[0]) <= S && Math.abs(y * S - goal[1]) <= S && Mov.poseFree(G, i, goal[0], goal[1], goal[2])));
    if (atGoal) {
      const out = []; let q = kk;
      while (q !== undefined) { const a2 = q % 64, xy = (q - a2) / 64, y2 = xy % 200, x2 = (xy - y2) / 200; out.push([x2 * S, y2 * S, a2 * AS]); q = from.get(q); }
      out.reverse(); out[0] = [it.x, it.y, it.a]; out[out.length - 1] = [goal[0], goal[1], goal[2]];
      // a symmetric piece looks the same turned half round, but its ends swap: keep the angle continuous along the
      // path so each carrier keeps their own end
      const per = k.facing ? 2 * Math.PI : Math.PI;
      for (let j = 1; j < out.length; j++) { let d = out[j][2] - out[j - 1][2]; d -= Math.round(d / per) * per; out[j][2] = out[j - 1][2] + d; }
      return out;
    }
    for (const [dx, dy, da, w] of [[1, 0, 0, 1], [-1, 0, 0, 1], [0, 1, 0, 1], [0, -1, 0, 1], [0, 0, 1, 1.3], [0, 0, -1, 1.3]]) {
      const nx = x + dx, ny = y + dy, na = (a + da + NA) % NA;
      if (!ok(nx, ny, na) && !(nx === sx && ny === sy && na === sa)) continue;
      if (da && !turnOk(x, y, a, da)) continue;
      const nk = key(nx, ny, na), nc = c + w;
      if (nc < (cost.has(nk) ? cost.get(nk) : Infinity)) { cost.set(nk, nc); from.set(nk, kk); open.push([nc + h(nx, ny, na), nc, nx, ny, na]); }
    }
  }
  return null;
}
// walking: a path of points for one player to (tx, ty)
function planWalk(G, who, tx, ty, skip, S = 8) {
  const P = G.p[who], sx = Math.round(P.x / S), sy = Math.round(P.y / S), gx = Math.round(tx / S), gy = Math.round(ty / S);
  const key = (x, y) => x * 200 + y, free = new Map();
  const ok = (x, y) => { const k = key(x, y); if (!free.has(k)) free.set(k, Mov.spotFree(G, x * S, y * S, skip)); return free.get(k); };
  const open = new Heap(), from = new Map(), cost = new Map();
  open.push([0, 0, sx, sy]); cost.set(key(sx, sy), 0);
  let n = 0;
  while (open.size && n++ < 100000) {
    const [, c, x, y] = open.pop(), k = key(x, y);
    if (c > cost.get(k)) continue;
    if (Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1) { const out = []; let q = k; while (q !== undefined) { out.push([Math.floor(q / 200) * S, (q % 200) * S]); q = from.get(q); } out.reverse(); out.push([tx, ty]); return out; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) continue;
      if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
      const nk = key(nx, ny), nc = c + Math.hypot(dx, dy);
      if (nc < (cost.has(nk) ? cost.get(nk) : Infinity)) { cost.set(nk, nc); from.set(nk, k); open.push([nc + Math.hypot(nx - gx, ny - gy), nc, nx, ny]); }
    }
  }
  return null;
}

// a free spot to stand next to a small thing, within reach of it, that the player can walk to
function besideSpot(G, who, i) {
  const it = G.items[i]; let best = null;
  for (let r = 18; r <= Mov.PICK_R - 2; r += 4) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, x = it.x + Math.cos(a) * r, y = it.y + Math.sin(a) * r;
    if (!Mov.spotFree(G, x, y, -1)) continue;
    const p = planWalk(G, who, x, y, -1);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
}
// a clear spot well inside a room to set a small thing down
function zoneSpot(G, who, z, salt) {
  const r = G.def.zones[z], T = Mov.T, pts = [];
  for (let y = r[1] * T + 30; y <= (r[3] + 1) * T - 30; y += 12) for (let x = r[0] * T + 30; x <= (r[2] + 1) * T - 30; x += 12) pts.push([x, y]);
  const cx = (r[0] + r[2] + 1) / 2 * T, cy = (r[1] + r[3] + 1) / 2 * T;
  pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
  for (let k = 0; k < pts.length; k++) { const q = pts[(k + salt * 7) % pts.length]; if (!Mov.spotFree(G, q[0], q[1], -1)) continue; const p = planWalk(G, who, q[0], q[1], -1); if (p) return p; }
  return null;
}

/* the crew: jobs in order (big things together, small things one each), each player following a path.
   crew(G, opt) returns a function that gives both players' input for the next step of G */
function crew(G, opt = {}) {
  const R = rng(opt.seed || 1), def = G.def;
  const jit = opt.jit || 0, pace = opt.pace || 1, think = opt.think || 0;
  const big = [], small = [];
  G.items.forEach((it, i) => (Mov.KINDS[it.k].two ? big : small).push(i));
  const order = opt.smallFirst ? small.concat(big) : big.concat(small);
  const st = { pink: { plan: null, i: 0, job: null, wait: think }, mint: { plan: null, i: 0, job: null, wait: think } };
  let bigJob = null;                                                  // { i, stage, path, k }
  const steer = (who, tx, ty, P) => { const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy); if (d < 1.2) return { mx: 0, my: 0 }; const a = Math.atan2(dy, dx) + gauss(R) * jit, s = Math.max(0.3, Math.min(1, d / (opt.soft || 6))) * pace; return { mx: Math.cos(a) * s, my: Math.sin(a) * s }; };
  const goalOf = (it, i) => { const to = it.to; const k = Mov.KINDS[it.k]; if (k.facing) return to; const alt = [to[0], to[1], Mov.wrap(to[2] + Math.PI)]; return Math.abs(Mov.wrap(alt[2] - it.a)) < Math.abs(Mov.wrap(to[2] - it.a)) ? alt : to; };
  const idle = w => !st[w].job && G.p[w].hold < 0;
  return () => {
      const inp = { pink: { mx: 0, my: 0, act: false }, mint: { mx: 0, my: 0, act: false } };
      // next big job when both are free
      if (!bigJob && idle('pink') && idle('mint') && !opt.only) {
        const i = order.find(j => big.includes(j) && G.items[j].st === 'floor' && !(G.items[j].skip > G.t));
        if (i !== undefined && (!opt.smallFirst || small.every(j => G.items[j].st === 'placed'))) {
          const it = G.items[i], h0 = Mov.handle(it, 0), h1 = Mov.handle(it, 1);
          const pinkFirst = Math.hypot(h0[0] - G.p.pink.x, h0[1] - G.p.pink.y) + Math.hypot(h1[0] - G.p.mint.x, h1[1] - G.p.mint.y) <= Math.hypot(h1[0] - G.p.pink.x, h1[1] - G.p.pink.y) + Math.hypot(h0[0] - G.p.mint.x, h0[1] - G.p.mint.y);
          bigJob = { i, stage: 'walk', ends: { pink: pinkFirst ? 0 : 1, mint: pinkFirst ? 1 : 0 }, path: null, k: 0, paths: {}, idx: { pink: 0, mint: 0 } };
          // walk round the piece to its end; only if there is no way round (a tight pocket) aim straight through it
          for (const w of ['pink', 'mint']) { const [hx, hy] = Mov.handle(it, bigJob.ends[w]); bigJob.paths[w] = planWalk(G, w, hx, hy, -1) || planWalk(G, w, hx, hy, i); }
          if (!bigJob.paths.pink || !bigJob.paths.mint) { bigJob.stage = 'stuck'; }
        }
      }
      if (bigJob) {
        const it = G.items[bigJob.i];
        if (bigJob.stage === 'walk') {
          let there = 0;
          for (const w of ['pink', 'mint']) {
            const P = G.p[w], p = bigJob.paths[w]; let j = bigJob.idx[w];
            while (j < p.length - 1 && Math.hypot(p[j][0] - P.x, p[j][1] - P.y) < Math.max(6, opt.tol || 0)) j++;
            bigJob.idx[w] = j;
            const [hx, hy] = Mov.handle(it, bigJob.ends[w]);
            if (P.hold >= 0 && P.hold !== bigJob.i) { if ((st[w].wait -= Mov.DT) <= 0) { inp[w].act = true; st[w].wait = think; } continue; }   // grabbed the wrong thing: let go
            if (P.hold === bigJob.i) { there++; continue; }
            const dh = Math.hypot(hx - P.x, hy - P.y);
            // close enough, and this end is the nearest one around (so the button takes the right thing)
            const nearest = () => { let b = 1e9; G.items.forEach((o, oi) => { if (oi === bigJob.i || !Mov.KINDS[o.k].two || (o.st !== 'floor' && o.st !== 'wait')) return; for (const e of [0, 1]) { const [x, y] = Mov.handle(o, e); b = Math.min(b, Math.hypot(x - P.x, y - P.y)); } }); return b; };
            if (dh < 12 && nearest() > dh + 2) { there++; if ((st[w].wait -= Mov.DT) <= 0) { inp[w].act = true; st[w].wait = Math.max(think, 0.3); } }
            else Object.assign(inp[w], steer(w, j >= p.length - 1 || dh < 14 ? hx : p[j][0], j >= p.length - 1 || dh < 14 ? hy : p[j][1], P));
          }
          if (it.st === 'carried') { bigJob.stage = 'carry'; bigJob.path = planItem(G, bigJob.i, goalOf(it, bigJob.i), opt.grid || 8); bigJob.k = 0; if (!bigJob.path) bigJob.stage = 'stuck'; }
          void there;
        } else if (bigJob.stage === 'carry') {
          // no progress for a while: plan again from where the piece is now
          if (!bigJob.lp || Math.hypot(bigJob.lp[0] - it.x, bigJob.lp[1] - it.y) > 3 || Math.abs(Mov.wrap(bigJob.lp[2] - it.a)) > .05) { bigJob.lp = [it.x, it.y, it.a]; bigJob.lt = G.t; }
          else if (G.t - bigJob.lt > 1) { const np = planItem(G, bigJob.i, goalOf(it, bigJob.i), opt.grid || 8); if (np) { bigJob.path = np; bigJob.k = 0; } bigJob.lt = G.t; bigJob.replans = (bigJob.replans || 0) + 1; }
          const pth = bigJob.path;
          let j = bigJob.k;
          const near = q => { let worst = 0; for (const w of ['pink', 'mint']) { const e = it[w + 'End'], r = Mov.reach(it.k) * (e ? 1 : -1), hx = q[0] + Math.cos(q[2]) * r, hy = q[1] + Math.sin(q[2]) * r; worst = Math.max(worst, Math.hypot(hx - G.p[w].x, hy - G.p[w].y)); } return worst; };
          while (j < pth.length - 1 && near(pth[j]) < (opt.tol || 5)) j++;
          bigJob.k = j;
          const q = pth[Math.min(pth.length - 1, j)];
          for (const w of ['pink', 'mint']) { const e = it[w + 'End'], r = Mov.reach(it.k) * (e ? 1 : -1); Object.assign(inp[w], steer(w, q[0] + Math.cos(q[2]) * r, q[1] + Math.sin(q[2]) * r, G.p[w])); }
          // a rough crew now and then shoves its end the wrong way
          for (const w of ['pink', 'mint']) { const s = st[w]; if (opt.shove && !(s.shoveT > G.t) && R() < opt.shove * Mov.DT) { s.shoveT = G.t + .35; s.shoveA = R() * Math.PI * 2; } if (s.shoveT > G.t) { inp[w].mx = Math.cos(s.shoveA); inp[w].my = Math.sin(s.shoveA); } }
          if (j >= pth.length - 1 && near(q) < (opt.tol ? opt.tol * .8 : 3)) { inp.pink.act = true; bigJob.stage = 'done'; }
        } else if (bigJob.stage === 'done' || bigJob.stage === 'stuck') {
          if (it.st !== 'carried' && it.st !== 'wait') { if (it.st !== 'placed') G.items[bigJob.i].skip = G.t + 3; bigJob = null; }
          else { inp.pink.act = true; bigJob.stage = 'stuck2'; }
        } else bigJob = null;
      }
      // small things: whoever is free takes the next one
      for (const w of ['pink', 'mint']) {
        if (bigJob || (opt.only && opt.only !== w)) continue;
        const s = st[w], P = G.p[w];
        if (!s.job) {
          if (!opt.smallFirst && !opt.only && big.some(j => G.items[j].st === 'floor' && !(G.items[j].skip > G.t))) continue;
          const taken = new Set(['pink', 'mint'].map(x => st[x].job && st[x].job.i));
          const i = order.find(j => small.includes(j) && G.items[j].st === 'floor' && !taken.has(j) && !(G.items[j].skip > G.t));
          if (i === undefined) continue;
          const it = G.items[i];
          s.job = { i, stage: 'get', path: besideSpot(G, w, i), j: 0 }; s.wait = think;
          if (!s.job.path) { it.skip = G.t + 2; s.job = null; continue; }
        }
        const job = s.job, it = G.items[job.i];
        if (job.stage === 'get') {
          if (it.st !== 'floor' && P.hold !== job.i) { s.job = null; continue; }
          if (P.hold === job.i) { job.stage = 'bring'; job.path = zoneSpot(G, w, it.zone, job.i); job.j = 0; job.lp = null; if (!job.path) { inp[w].act = true; s.job = null; } continue; }
          if (Math.hypot(it.x - P.x, it.y - P.y) < Mov.PICK_R + 4) { if ((s.wait -= Mov.DT) <= 0) { inp[w].act = true; s.wait = think; } continue; }
        } else if (job.stage === 'bring') {
          if (P.hold !== job.i) { s.job = null; continue; }
          if (Mov.inZone(def, it.zone, P.x + P.fx * 18, P.y + P.fy * 18) && Mov.inZone(def, it.zone, P.x, P.y) && job.j >= job.path.length - 3) { if ((s.wait -= Mov.DT) <= 0) { inp[w].act = true; s.wait = think; s.job = null; } continue; }
        }
        // no progress for a while (someone in the way): plan again from here
        if (!job.lp || Math.hypot(job.lp[0] - P.x, job.lp[1] - P.y) > 4) { job.lp = [P.x, P.y]; job.lt = G.t; }
        else if (G.t - job.lt > 1.2) { const np = job.stage === 'get' ? besideSpot(G, w, job.i) : zoneSpot(G, w, it.zone, job.i + Math.floor(G.t)); if (np) { job.path = np; job.j = 0; } job.lt = G.t; }
        const p = job.path; let j = job.j;
        while (j < p.length - 1 && Math.hypot(p[j][0] - P.x, p[j][1] - P.y) < Math.max(6, opt.tol || 0)) j++;
        job.j = j;
        Object.assign(inp[w], steer(w, p[j][0], p[j][1], P));
      }
      if (opt.mash) for (const w of ['pink', 'mint']) { inp[w] = { mx: R() * 2 - 1, my: R() * 2 - 1, act: R() < 0.03 }; }
      if (opt.debug) opt.debug(G, st, bigJob, inp);
    return inp;
  };
}


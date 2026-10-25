/* The pair on the trap run, for the bots (tests) and the browser pilots. Needs Trap. trapCrew(G, opt) returns a
   function giving { pink: { mx, my, act }, mint: { mx, my, act } } for the next step of G. They follow the path's plan
   (def.bot: plate pairs held in turn, lever pairs pulled together; between them, on to the end of each stretch), pick
   up gems on the way, help each other up, and dodge by looking a little ahead at what they can see coming.
   opt: think (s between decisions), react (s to set off once a trap has passed), look (s they look ahead), margin
   (s of room they leave a trap), pad (px), miss (0..1: chance of going anyway when a trap is in the way), greed (0..1:
   chance of going for a gem), pace (stick 0..1), sync (s: how far apart a pair of lever pulls may come), seed. */
function trapRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function trapCrew(G, opt = {}) {
  const R = trapRng(opt.seed || 1), T = Trap.T, ROWS = Trap.ROWS, IDS = ['pink', 'mint'];
  const think = opt.think == null ? 0.1 : opt.think, look = opt.look == null ? 0.6 : opt.look, margin = opt.margin == null ? 0.1 : opt.margin;
  const pad = opt.pad == null ? 3 : opt.pad, miss = opt.miss || 0, greed = opt.greed == null ? 1 : opt.greed, pace = opt.pace == null ? 1 : opt.pace;
  const sync = opt.sync == null ? 0.15 : opt.sync, react = opt.react == null ? 0.25 : opt.react, blocked = {}, rash = {}, resume = { pink: 0, mint: 0 }, late = { pink: 0, mint: 0 };
  const def = G.def, W = G.W, plan = def.bot || [];
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  const want = {}, next = { pink: 0, mint: 0 }, out = { pink: { mx: 0, my: 0, act: false }, mint: { mx: 0, my: 0, act: false } };
  const fields = new Map(), skip = {}, holder = {}, pull = { at: null, done: {} };
  const E = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) if (G.grid[y][x] === 'E') E.push([x, y]);
  const Ey = E.map(e => e[1]), Emid = E.filter(e => e[0] === Math.round(E.reduce((s, e) => s + e[0], 0) / E.length));
  const endFor = { pink: Emid.filter(e => e[1] === Math.min(...Ey) + 1), mint: Emid.filter(e => e[1] === Math.max(...Ey) - 1) };
  // ---- the map, as the bots plan on it: costs go up through traps that are running now
  const passable = (x, y, gates) => { const c = Trap.tileAt(G, x, y); if (Trap.WATER.includes(c)) return false; if (Trap.GATE.includes(c)) return gates || !!G.gopen[c]; return !Trap.WALL.includes(c); };
  // traps running now: what they add to the cost of a tile (spikes, saw tracks, fire), and where a careful player would
  // not stop to wait (those, and the lanes of logs and arrows)
  const lanes = new Uint8Array(W * ROWS), busyOf = new Map();
  for (const d of def.things || []) {
    if (d.k === 'roll') { const x0 = Math.floor(((d.x + .5) * T - Trap.LOG_W / 2 - Trap.R) / T), x1 = Math.floor(((d.x + .5) * T + Trap.LOG_W / 2 + Trap.R) / T); for (let y = 0; y < ROWS; y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) lanes[y * W + x] = 1; }
    else if (d.k === 'arrow') { const [dx, dy] = Trap.DIRS[d.dir]; let x = d.x + dx, y = d.y + dy; while (x >= 0 && y >= 0 && x < W && y < ROWS && !Trap.WALL.includes(G.grid[y][x])) { lanes[y * W + x] = 1; x += dx; y += dy; } }
  }
  function busy() {
    if (busyOf.has(G.sig)) return busyOf.get(G.sig);
    const b = new Float64Array(W * ROWS), z = new Uint8Array(lanes);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) { const c = G.grid[y][x]; if (Trap.SPIKE.includes(c) && !Trap.stopped(G, (def.spikes[c] || {}).stop)) b[y * W + x] = 2; }
    for (const h of G.things) {
      const d = h.d; if (Trap.stopped(G, d.stop)) continue;
      if (d.k === 'fire') { for (let y = d.y - d.len - 1; y <= d.y + d.len + 1; y++) for (let x = d.x - d.len - 1; x <= d.x + d.len + 1; x++) if (y >= 0 && y < ROWS && x >= 0 && x < W && Math.hypot(x - d.x, y - d.y) <= d.len + .8) b[y * W + x] = 3; }
      else if (d.k === 'saw') { const n = Math.max(1, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)); for (let i = 0; i <= n; i++) { const x = Math.round(d.x0 + (d.x1 - d.x0) * i / n), y = Math.round(d.y0 + (d.y1 - d.y0) * i / n); if (y >= 0 && y < ROWS && x >= 0 && x < W) b[y * W + x] = 2; } }
    }
    for (let i = 0; i < b.length; i++) if (b[i]) z[i] = 1;
    // spikes held down by a plate are no place to wait either (the plate may be let go)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) if (Trap.SPIKE.includes(G.grid[y][x])) z[y * W + x] = 1;
    const o = { b, z }; if (busyOf.size > 20) busyOf.clear(); busyOf.set(G.sig, o); return o;
  }
  // distances to a set of tiles (8 ways, no cutting corners), with gates as they are or all open
  function field(key, targets, gates) {
    const k = key + '|' + G.sig + '|' + Object.keys(G.gopen).filter(g => G.gopen[g]).join('') + (gates ? '|g' : '');
    if (fields.has(k)) return fields.get(k);
    const D = new Float64Array(W * ROWS).fill(Infinity), b = busy().b, h = [];
    // a little binary heap of [distance, tile]
    const push = (d, i) => { h.push([d, i]); let k = h.length - 1; while (k) { const u = (k - 1) >> 1; if (h[u][0] <= h[k][0]) break; [h[u], h[k]] = [h[k], h[u]]; k = u; } };
    const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } } return top; };
    for (const [x, y] of targets) if (passable(x, y, gates)) { D[y * W + x] = 0; push(0, y * W + x); }
    while (h.length) {
      const [d, i] = pop(), x = i % W, y = (i - x) / W;
      if (d > D[i]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (!passable(nx, ny, gates) || (dx && dy && (!passable(x + dx, y, gates) || !passable(x, y + dy, gates)))) continue;
        const nd = d + (dx && dy ? 1.42 : 1) + b[ny * W + nx];
        if (nd < D[ny * W + nx] - 1e-9) { D[ny * W + nx] = nd; push(nd, ny * W + nx); }
      }
    }
    if (fields.size > 60) fields.clear();
    fields.set(k, D); return D;
  }
  const col = x => { const t = []; x = Math.min(W - 1, x); for (let y = 0; y < ROWS; y++) t.push([x, y]); return t; };
  const tile = p => [Math.floor(p.x / T), Math.floor(p.y / T)];
  // a straight walk from a to b that keeps clear of walls and water
  function clear(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6) || 1, r = Trap.R - 1;
    for (let i = 1; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (Trap.solid(G, Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return false;
      for (const [ox, oy] of [[0, 0], [-5, -5], [5, -5], [-5, 5], [5, 5]]) if (Trap.waterAt(G, x + ox, y + oy)) return false;
    }
    return true;
  }
  // where to head next along a field: the furthest of the next few tiles downhill that can be walked to straight
  function waypoint(p, D) {
    let [x, y] = tile(p); if (!(D[y * W + x] < Infinity)) return null;
    const path = [];
    for (let i = 0; i < 5; i++) {
      let best = null, bd = D[y * W + x];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= ROWS || (dx && dy && (!passable(x + dx, y, true) || !passable(x, y + dy, true)))) continue; const d = D[ny * W + nx]; if (d < bd - 1e-6) { bd = d; best = [nx, ny]; } }
      if (!best) break; [x, y] = best; path.push(best);
    }
    if (!path.length) return null;
    for (let i = path.length - 1; i >= 0; i--) { const cx = (path[i][0] + .5) * T, cy = (path[i][1] + .5) * T; if (clear(p.x, p.y, cx, cy)) return [cx, cy]; }
    return [(path[0][0] + .5) * T, (path[0][1] + .5) * T];
  }
  // ---- looking ahead: what is near enough to matter
  function view(p) {
    const V = Object.create(G), near = 360;
    V.things = G.things.filter(h => { const d = h.d; const xs = d.k === 'saw' ? [d.x0, d.x1] : [d.x]; return xs.some(x => Math.abs((x + .5) * T - p.x) < near + (d.len || 0) * T); });
    V.shots = G.shots.filter(s => Math.abs(s.x - p.x) < near);
    return V;
  }
  function calm(V, p) {
    if (V.things.length || V.shots.length) return false;
    const [x, y] = tile(p);
    for (let ty = y - 3; ty <= y + 3; ty++) for (let tx = x - 4; tx <= x + 4; tx++) { const c = Trap.tileAt(G, tx, ty); if (Trap.SPIKE.includes(c) || Trap.WATER.includes(c)) return false; }
    return true;
  }
  // a spot to wait at: clear of every trap's ground (z) and of water
  function rest(z, x, y) {
    const r = Trap.R - 2 + pad;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) { const tx = Math.floor((x + ox) / T), ty = Math.floor((y + oy) / T); if (tx >= 0 && ty >= 0 && tx < W && ty < ROWS && z[ty * W + tx]) return false; }
    return !Trap.waterAt(G, x, y);
  }
  const wet = (x, y) => Trap.waterAt(G, x, y) || Trap.waterAt(G, x - 3, y - 3) || Trap.waterAt(G, x + 3, y - 3) || Trap.waterAt(G, x - 3, y + 3) || Trap.waterAt(G, x + 3, y + 3);
  /* walking a straight line (a: the angle, or null to stand) for up to maxd px, stopping early at the first spot to wait
     at once past a trap's ground (hor: look at least this far ahead): when that would first get somebody hit (Infinity:
     never), and where it stops */
  function hitTime(V, p, a, sp, maxd, hor = 0) {
    const z = busy().z, q = { x: p.x, y: p.y }, vx = a == null ? 0 : Math.cos(a) * sp / 30, vy = a == null ? 0 : Math.sin(a) * sp / 30;
    let moving = a != null && maxd > 0, gone = 0, left = !rest(z, p.x, p.y), end = Math.ceil(Math.max(look + think, hor) * 30), stop = null;
    for (let i = 0; i <= end && i <= 150; i++) {
      const t = i / 30;
      if (i && moving) {
        q.x += vx; Trap.collide(V, q); q.y += vy; Trap.collide(V, q); gone += sp / 30;
        const ok = rest(z, q.x, q.y);
        if (!ok) left = true;
        if (gone >= maxd || (left && ok)) { moving = false; stop = [q.x, q.y]; end = Math.max(end, i + Math.ceil(.3 * 30)); }
        else if (left) end = Math.max(end, i + 1);
      }
      if (wet(q.x, q.y)) return { t, stop };
      if (Trap.hazardAt(V, q.x, q.y, t, Trap.R + pad) || (margin && Trap.hazardAt(V, q.x, q.y, t + margin, Trap.R + pad))) return { t, stop };
    }
    return { t: Infinity, stop: moving ? null : stop };
  }
  const TURN = [0, Math.PI / 4, -Math.PI / 4, null, Math.PI / 2, -Math.PI / 2, 3 * Math.PI / 4, -3 * Math.PI / 4, Math.PI];
  // head for (tx, ty), unless it is not safe: then whatever is. The answer may carry a spot to stop at (the next safe
  // place to wait), which the walker keeps to between decisions.
  function steer(id, tx, ty, stopAt = 3) {
    const p = G.p[id], V = view(p), d = Math.hypot(tx - p.x, ty - p.y), sp = Trap.SPEED * pace;
    const a0 = d > stopAt ? Math.atan2(ty - p.y, tx - p.x) : null;
    const go = (a, stop) => { const k = a === a0 && d < 12 ? Math.max(.3, d / 12) : 1; return a == null ? { mx: 0, my: 0 } : { mx: Math.cos(a) * pace * k, my: Math.sin(a) * pace * k, stop: stop || (a === a0 ? [tx, ty] : null) }; };
    if (calm(V, p)) return go(a0);
    const order = a0 == null ? [null, 0, Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4] : TURN.map(t => (t == null ? null : a0 + t));
    let best = null, bt = -1, bs = null;
    for (const a of order) {
      const h = hitTime(V, p, a, sp, a === a0 ? d : a == null ? 0 : 1.5 * T);
      if (opt.debug) opt.debug(id, 'try', a == null ? 'stand' : ((a - (a0 || 0)) * 180 / Math.PI).toFixed(0), h.t, h.stop && h.stop.map(v => (v / T).toFixed(2)).join(','), 'to', (tx / T).toFixed(2), (ty / T).toFixed(2));
      if (a0 != null && a === a0) {
        // held up by a trap: now and then somebody goes anyway (miss); otherwise, once the way is clear, it takes a
        // moment to notice and set off (react), less each time the chance was missed (they learn the beat)
        if (h.t !== Infinity) { if (!blocked[id]) { blocked[id] = true; rash[id] = R() < miss; if (G.t < resume[id] + think) late[id]++; } if (rash[id]) return go(a0); }
        else if (blocked[id]) { blocked[id] = false; resume[id] = G.t + react * (0.6 + R() * 0.8) * Math.max(0.15, 1 - 0.4 * late[id]); }
        else if (G.t > resume[id] + 1) late[id] = 0;
        if (h.t === Infinity && G.t < resume[id] && hitTime(V, p, null, 0, 0).t === Infinity) return { mx: 0, my: 0 };
      }
      if (h.t === Infinity) return go(a, h.stop);
      if (h.t > bt + 1e-6) { bt = h.t; best = a; bs = h.stop; }
    }
    return go(best, bs);
  }
  const stand = id => { const p = G.p[id]; return steer(id, p.x, p.y, 99); };
  // walk a field to its end (point: the very spot, once close)
  function walk(id, D, point) {
    const p = G.p[id];
    if (point && Math.hypot(point[0] - p.x, point[1] - p.y) < 1.6 * T && clear(p.x, p.y, point[0], point[1])) return steer(id, point[0], point[1]);
    const w = waypoint(p, D); if (!w) return point ? steer(id, point[0], point[1]) : stand(id);
    return steer(id, w[0], w[1], 0);
  }
  const ptOf = t => [(t[0] + .5) * T, (t[1] + .5) * T];
  function walkTo(id, key, t, exact) {
    let D = field(key, [t]); const [x, y] = tile(G.p[id]);
    if (!(D[y * W + x] < Infinity)) D = field(key, [t], true);           // through a gate that will open
    return walk(id, D, exact ? ptOf(t) : null);
  }
  function walkCol(id, key, cx) {
    let D = field(key, col(cx)); const [x, y] = tile(G.p[id]);
    if (!(D[y * W + x] < Infinity)) D = field(key, col(cx), true);
    return walk(id, D, null);
  }
  // a gem on the way (ahead, before xEnd), nearer this one than the other
  function gemFor(id, xEnd) {
    const p = G.p[id], o = G.p[other(id)];
    let best = null, bd = Infinity;
    [...G.gems.map((g, i) => [g, 'g' + i]), ...G.extras.map((g, i) => [g, 'h' + i])].forEach(([g, k]) => {
      if (g.got || g.x > xEnd || g.x < p.x - 2.5 * T) return;
      if (!(k + id in skip)) skip[k + id] = R() >= greed;
      if (skip[k + id]) return;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (o.st === 'ok' && Math.hypot(g.x - o.x, g.y - o.y) < d - 8 && !skip[k + other(id)]) return;
      const D = field('gem' + k, [[Math.floor(g.x / T), Math.floor(g.y / T)]]); const [x, y] = tile(p); if (!(D[y * W + x] < Infinity)) { skip[k + id] = true; return; }
      if (d < bd) { bd = d; best = [g, k]; }
    });
    return best;
  }
  // ---- the plan
  const far = (id, s) => G.p[id].x >= (s.x1 + 1) * T + Trap.R;
  const done = s => (s.to != null ? s.to >= W - 1 || IDS.every(id => G.p[id].x >= s.to * T + Trap.R) : s.pair ? IDS.every(id => far(id, s)) : s.pull ? !!G.open[s.pull] : false);
  function decide(id) {
    const p = G.p[id], o = G.p[other(id)];
    if (p.st !== 'ok' || G.st !== 'run') { blocked[id] = rash[id] = false; return { mx: 0, my: 0 }; }
    // a partner down comes first: stand close to them, at a spot beside them that stays safe long enough to help them
    // up (none just now: wait where it is safe)
    if (o.st === 'down') {
      const need = Trap.REVIVE_T + 0.5, V = view(o), near = Math.hypot(o.x - p.x, o.y - p.y) < Trap.REVIVE_R - 8;
      if (near && hitTime(view(p), p, null, 0, 0, need - Math.min(p === G.p[id] ? o.rv : 0, Trap.REVIVE_T)).t === Infinity) return { mx: 0, my: 0 };
      let spot = null, bd = Infinity;
      for (const r of [16, 26]) for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
        if (Trap.solid(G, Math.floor(x / T), Math.floor(y / T)) || Trap.waterAt(G, x, y) || hitTime(V, { x, y }, null, 0, 0, need + Math.hypot(x - p.x, y - p.y) / Trap.SPEED).t !== Infinity) continue;
        const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; spot = [x, y]; }
      }
      if (!spot) return stand(id);
      if (Math.hypot(spot[0] - p.x, spot[1] - p.y) < 1.6 * T && clear(p.x, p.y, spot[0], spot[1])) return steer(id, spot[0], spot[1], 2);
      return walkTo(id, 'rv' + Math.floor(spot[0] / T) + ',' + Math.floor(spot[1] / T), [Math.floor(spot[0] / T), Math.floor(spot[1] / T)], false);
    }
    const s = plan.find(q => !done(q));
    if (!s) {
      // the temple gate
      const t = (endFor[id].length ? endFor[id] : E)[0];
      return walkTo(id, 'end' + id, t, true);
    }
    if (s.to != null) {
      if (p.x >= (s.to + 1) * T) return stand(id);
      const g = gemFor(id, (s.to + 1) * T);
      if (g) { const [gm, k] = g; return walkTo(id, 'gem' + k, [Math.floor(gm.x / T), Math.floor(gm.y / T)], true); }
      return walkCol(id, 'to' + s.to, s.to + 1);
    }
    if (s.pair) {
      const key = s.x1 + ':' + s.pair.join(',');
      if (far(id, s)) return walkTo(id, 'far' + key, s.far, true);                    // hold the plate beyond
      if (far(other(id), s)) return walkCol(id, 'past' + key, s.x1 + 2);            // the other holds it: through
      if (!holder[key]) { const dn = q => Math.hypot(ptOf(s.pair)[0] - G.p[q].x, ptOf(s.pair)[1] - G.p[q].y); holder[key] = dn('pink') <= dn('mint') ? 'pink' : 'mint'; }
      if (holder[key] === id) return walkTo(id, 'near' + key, s.pair, true);           // hold the plate this side
      return walkTo(id, 'far' + key, s.far, true);                                  // cross while it is held
    }
    if (s.pull) {
      const t = s.at[id], [lx, ly] = ptOf(t), ready = q => G.p[q].st === 'ok' && Math.hypot(ptOf(s.at[q])[0] - G.p[q].x, ptOf(s.at[q])[1] - G.p[q].y) < 14;
      if (ready('pink') && ready('mint') && !pull.at) { const d = R() * sync, first = R() < .5 ? 'pink' : 'mint'; pull.at = { pink: G.t + (first === 'pink' ? 0 : d), mint: G.t + (first === 'mint' ? 0 : d), until: G.t + sync + 1.2 }; pull.done = {}; }
      if (pull.at && G.t > pull.at.until) pull.at = null;
      const m = steer(id, lx, ly);
      if (pull.at && !pull.done[id] && G.t >= pull.at[id]) { pull.done[id] = true; m.act = true; }
      return m;
    }
    return stand(id);
  }
  return () => {
    for (const id of IDS) {
      out[id].act = false;
      if (G.t >= next[id]) {
        const m = decide(id); next[id] = G.t + think * (0.7 + R() * 0.6);
        out[id] = { mx: m.mx || 0, my: m.my || 0, act: !!m.act, stop: m.stop || null };
      }
      // keep to the stopping spot: there, or past it, stand
      const o = out[id], p = G.p[id];
      if (o.stop && (o.mx || o.my)) { const dx = o.stop[0] - p.x, dy = o.stop[1] - p.y; if (Math.hypot(dx, dy) < 0.8 || dx * o.mx + dy * o.my < 0) { o.mx = 0; o.my = 0; } }
    }
    // a lever pull is timed to the step, not to the thinking
    if (pull.at) for (const id of IDS) if (!pull.done[id] && G.t >= pull.at[id] && G.p[id].st === 'ok') { pull.done[id] = true; out[id].act = true; }
    const pick = o => ({ mx: o.mx, my: o.my, act: o.act });
    return { pink: pick(out.pink), mint: pick(out.mint) };
  };
}

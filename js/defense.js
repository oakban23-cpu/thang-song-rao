/* Defense mode: two heroes guard a little house from waves of cute ghosts.
   Heroes shoot on their own; players only move, fire a special (act) and hold "use" to revive, build or repair. */
const Def = (() => {
  'use strict';
  const K = 64, GW = 15, GH = 7, DT = 1 / 60;
  const PR = 0.3 * K, SPEED = 3.5 * K, ACC = 24 * K;
  const SOLID = new Set(['#', 't', '~', 'h', 'T']);
  const RANGE = 4.2 * K, SHOT_T = 0.45, SHOT_DMG = 10, BULLET_V = 11 * K;
  const BEAM_LEN = 5 * K, BEAM_DPS = 40, BEAM_W = 0.14 * K;
  const REGEN_NEAR = 2.2 * K, REGEN = 3;
  const REVIVE_T = 2, REVIVE_D = 1.5 * K, REVIVE_HP = 50;
  const BURST = { cd: 7, r: 2.3 * K, dmg: 45, push: 1.3 * K };
  const HEAL = { cd: 11, r: 3.2 * K, hp: 40, stun: 1, stunR: 2 * K };
  const TOWER = [null, { cost: 30, range: 3.6 * K, dmg: 8, rate: 0.7 }, { cost: 45, range: 4 * K, dmg: 12, rate: 0.55 }, { cost: 70, range: 4.4 * K, dmg: 16, rate: 0.45 }];
  const BUILD_T = 1, REPAIR_HPS = 14, REPAIR_COST = 0.5; // coins per hp
  const EN = {
    imp: { hp: 36, sp: 1.3, r: 0.28, pd: 12, hd: 5, coin: 2, aggro: 0 },
    head: { hp: 22, sp: 2.1, r: 0.24, pd: 8, hd: 3, coin: 2, aggro: 0, fly: true },
    pob: { hp: 150, sp: 0.6, r: 0.4, pd: 22, hd: 12, coin: 8, aggro: 2.2, heavy: true },
    wisp: { hp: 40, sp: 0.95, r: 0.27, pd: 6, hd: 4, coin: 4, aggro: 0, fly: true, ranged: true },
    king: { hp: 1300, sp: 0.42, r: 0.7, pd: 30, hd: 20, coin: 40, aggro: 2.5, fly: true, heavy: true, boss: true }
  };
  const TYPES = Object.keys(EN);
  const FIRE = { v: 4.2 * K, dmg: 12, house: 6, rate: 2.4, keep: 3 * K, see: 4.2 * K };
  const PH = ['prep', 'wave', 'rest', 'won', 'lost'];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------- load ---------- */
  function load(def) {
    const G = { def, t: 0, ph: 'prep', pt: def.prep || 8, wi: -1, queue: [], spawnT: 0, coins: def.coins || 0, kills: 0, over: false,
      rand: rng(def.seed || 7), dead: [], gone: [], tiles: [], gates: [], houses: [], pads: [], en: [], eid: 0, bu: [], fb: [], drops: [], beam: false, net: null, spawn: {}, flow: null, hurtT: 0 };
    for (let y = 0; y < GH; y++) {
      const row = (def.map[y] || '').padEnd(GW, 't');
      G.tiles.push([]);
      for (let x = 0; x < GW; x++) {
        const c = row[x], t = { t: c, x, y, tw: 0, cd: 0, bp: 0, house: null };
        if (c === '1' || c === '2') G.spawn[c] = { x: (x + 0.5) * K, y: (y + 0.5) * K };
        if (c === 'G') G.gates.push({ x: (x + 0.5) * K, y: (y + 0.5) * K, tx: x, ty: y });
        if (c === 'T') G.pads.push(t);
        G.tiles[y].push(t);
      }
    }
    // houses = connected groups of 'h'
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const t = G.tiles[y][x];
      if (t.t !== 'h' || t.house) continue;
      const H = { id: G.houses.length, tiles: [], hp: def.houseHp || 100, max: def.houseHp || 100, x0: x, y0: y, x1: x, y1: y };
      const st = [t]; t.house = H;
      while (st.length) {
        const c = st.pop(); H.tiles.push(c);
        H.x0 = Math.min(H.x0, c.x); H.y0 = Math.min(H.y0, c.y); H.x1 = Math.max(H.x1, c.x); H.y1 = Math.max(H.y1, c.y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = G.tiles[c.y + dy] && G.tiles[c.y + dy][c.x + dx];
          if (n && n.t === 'h' && !n.house) { n.house = H; st.push(n); }
        }
      }
      H.rect = { x: H.x0 * K, y: H.y0 * K, w: (H.x1 - H.x0 + 1) * K, h: (H.y1 - H.y0 + 1) * K };
      H.cx = H.rect.x + H.rect.w / 2; H.cy = H.rect.y + H.rect.h / 2;
      G.houses.push(H);
    }
    G.flow = buildFlow(G);
    const mk = (id, s) => ({ id, x: s.x, y: s.y, vx: 0, vy: 0, fx: id === 'pink' ? 1 : -1, fy: 0, ax: id === 'pink' ? 1 : -1, ay: 0, hp: 100, max: 100, down: false, rv: 0, cd: 0, shotT: 0, walk: 0, using: null, sn: 0, net: null, hurt: 0, rvBy: 0 });
    G.pink = mk('pink', G.spawn['1']); G.mint = mk('mint', G.spawn['2']);
    return G;
  }

  /* ---------- geometry ---------- */
  const walkable = c => !SOLID.has(c);
  function tileAt(G, px, py) {
    const x = Math.floor(px / K), y = Math.floor(py / K);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return null;
    return G.tiles[y][x];
  }
  const refOf = t => t.y * GW + t.x;
  function byRef(G, r) {
    if (typeof r !== 'number' || !Number.isFinite(r) || r < 0) return null;
    const y = Math.floor(r / GW), x = r % GW;
    return G.tiles[y] && G.tiles[y][x] || null;
  }
  function solidsNear(G, cx, cy, blockGate) {
    const out = [];
    const x0 = Math.floor((cx - K) / K), x1 = Math.floor((cx + K) / K), y0 = Math.floor((cy - K) / K), y1 = Math.floor((cy + K) / K);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= GW || y >= GH) { out.push({ x: x * K, y: y * K, w: K, h: K }); continue; }
      const c = G.tiles[y][x].t;
      if (SOLID.has(c) || (blockGate && c === 'G')) out.push({ x: x * K, y: y * K, w: K, h: K });
    }
    return out;
  }
  function pushOut(p, r, rad) {
    const nx = clamp(p.x, r.x, r.x + r.w), ny = clamp(p.y, r.y, r.y + r.h);
    const dx = p.x - nx, dy = p.y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= rad * rad) return;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.y += dy * k; return; }
    const l = p.x - r.x, rr = r.x + r.w - p.x, t = p.y - r.y, b = r.y + r.h - p.y, m = Math.min(l, rr, t, b);
    if (m === l) p.x = r.x - rad; else if (m === rr) p.x = r.x + r.w + rad; else if (m === t) p.y = r.y - rad; else p.y = r.y + r.h + rad;
  }
  function rectDist(r, x, y) { const nx = clamp(x, r.x, r.x + r.w), ny = clamp(y, r.y, r.y + r.h); return Math.hypot(x - nx, y - ny); }
  function segDist(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const s = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + dx * s), py - (ay + dy * s));
  }
  const frontPoint = (p, d = 0.8) => ({ x: p.x + p.fx * K * d, y: p.y + p.fy * K * d });
  function target(G, p) {
    const f = frontPoint(p), t = tileAt(G, f.x, f.y);
    return t && (t.t === 'T' || t.t === 'h') ? t : null;
  }

  /* flow field: steps from each walkable tile to the nearest tile touching a house */
  function buildFlow(G) {
    const D = [], q = [];
    for (let y = 0; y < GH; y++) { D.push(new Array(GW).fill(Infinity)); }
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (!walkable(G.tiles[y][x].t)) continue;
      let goal = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = G.tiles[y + dy] && G.tiles[y + dy][x + dx]; if (n && n.t === 'h') goal = true; }
      if (goal) { D[y][x] = 0; q.push([x, y]); }
    }
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !walkable(G.tiles[ny][nx].t) || D[ny][nx] <= D[y][x] + 1) continue;
        D[ny][nx] = D[y][x] + 1; q.push([nx, ny]);
      }
    }
    return D;
  }
  function nearestHouse(G, x, y) {
    let best = null, bd = Infinity;
    for (const H of G.houses) { if (H.hp <= 0) continue; const d = rectDist(H.rect, x, y); if (d < bd) { bd = d; best = H; } }
    return best ? { H: best, d: bd } : null;
  }
  // next steering point for a walking ghost heading home-wards
  function flowGoal(G, e) {
    const cx = Math.floor(e.x / K), cy = Math.floor(e.y / K), D = G.flow;
    const d = D[cy] && D[cy][cx];
    const nh = nearestHouse(G, e.x, e.y);
    if (!nh) return null;
    if (d === 0 || d == null || d === Infinity) {
      const r = nh.H.rect;
      return { x: clamp(e.x, r.x + 8, r.x + r.w - 8), y: clamp(e.y, r.y + 8, r.y + r.h - 8) };
    }
    let best = null, bd = d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!D[ny] || D[ny][nx] == null || D[ny][nx] >= bd) continue;
      if (dx && dy && (D[cy][nx] === Infinity || D[ny][cx] === Infinity)) continue;
      const v = D[ny][nx] + (dx && dy ? 0.4 : 0);
      if (v < bd) { bd = v; best = [nx, ny]; }
    }
    if (!best) return { x: (cx + 0.5) * K, y: (cy + 0.5) * K };
    return { x: (best[0] + 0.5) * K, y: (best[1] + 0.5) * K };
  }

  /* ---------- waves ---------- */
  function buildQueue(G, w) {
    const groups = w.list.map(([k, n, gates]) => ({ k, n, gates: gates && gates.length ? gates : G.gates.map((g, i) => i), gi: 0 }));
    const out = [];
    let left = groups.reduce((s, g) => s + g.n, 0);
    while (left > 0) {
      for (const g of groups) {
        if (g.n <= 0) continue;
        out.push({ k: g.k, g: g.gates[g.gi % g.gates.length] });
        g.gi++; g.n--; left--;
      }
    }
    return out;
  }
  function spawnEnemy(G, k, gate, x, y) {
    const s = EN[k], gt = G.gates[gate] || G.gates[0];
    const e = { id: ++G.eid, k, x: x != null ? x : gt.x + (G.rand() - 0.5) * 20, y: y != null ? y : gt.y + (G.rand() - 0.5) * 20, vx: 0, vy: 0, kx: 0, ky: 0,
      hp: s.hp * (G.def.hpMul || 1), max: s.hp * (G.def.hpMul || 1), r: s.r * K, cd: 1 + G.rand(), stun: 0, slow: false, fl: 0, chase: null, sum: 4, atk: false };
    G.en.push(e);
    return e;
  }

  /* ---------- heroes ---------- */
  const alive = p => !p.down;
  function movePlayer(G, p, i, dt) {
    if (p.down) { p.vx = p.vy = 0; p.walk = 0; return; }
    const mx = clamp(i.mx || 0, -1, 1), my = clamp(i.my || 0, -1, 1), mag = Math.hypot(mx, my);
    const sx = mag > 1 ? mx / mag : mx, sy = mag > 1 ? my / mag : my;
    p.vx = approach(p.vx, sx * SPEED, ACC * dt);
    p.vy = approach(p.vy, sy * SPEED, ACC * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (mag > 0.3) { if (Math.abs(mx) >= Math.abs(my)) { p.fx = Math.sign(mx); p.fy = 0; } else { p.fx = 0; p.fy = Math.sign(my); } }
    for (let k = 0; k < 3; k++) for (const r of solidsNear(G, p.x, p.y, false)) pushOut(p, r, PR);
    const sp = Math.hypot(p.vx, p.vy);
    p.walk = sp > 20 ? p.walk + dt * sp / 18 : 0;
  }
  function hurtPlayer(G, p, dmg, ev) {
    if (p.down || dmg <= 0) return;
    p.hp -= dmg; p.hurt = 0.25;
    if (p.hp <= 0) { p.hp = 0; p.down = true; p.rv = 0; ev.push('down:' + p.id); }
  }
  function nearestEnemy(G, x, y, range) {
    let best = null, bd = range;
    for (const e of G.en) { const d = Math.hypot(e.x - x, e.y - y) - e.r * 0.5; if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function hurtEnemy(G, e, dmg) { if (e.hp <= 0) return; e.hp -= dmg; e.fl = 0.08; }
  function special(G, p, ev) {
    if (p.down || p.cd > 0) return;
    const o = p === G.pink ? G.mint : G.pink;
    if (p.id === 'pink') {
      p.cd = BURST.cd; p.sn++;
      for (const e of G.en) {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d > BURST.r + e.r) continue;
        hurtEnemy(G, e, BURST.dmg);
        const push = BURST.push * (EN[e.k].heavy ? 0.3 : 1) * 6;
        e.kx += dx / (d || 1) * push; e.ky += dy / (d || 1) * push;
      }
      G.fb = G.fb.filter(f => Math.hypot(f.x - p.x, f.y - p.y) > BURST.r);
      ev.push('burst:pink');
    } else {
      p.cd = HEAL.cd; p.sn++;
      p.hp = Math.min(p.max, p.hp + HEAL.hp);
      if (Math.hypot(o.x - p.x, o.y - p.y) <= HEAL.r) {
        if (o.down) { o.down = false; o.hp = REVIVE_HP; o.rv = 0; ev.push('revive:' + o.id); }
        else o.hp = Math.min(o.max, o.hp + HEAL.hp);
      }
      for (const e of G.en) if (Math.hypot(e.x - p.x, e.y - p.y) <= HEAL.stunR + e.r) e.stun = Math.max(e.stun, HEAL.stun * (EN[e.k].boss ? 0.3 : 1));
      ev.push('heal:mint');
    }
  }
  function useAt(G, p, tile, dt, ev) {
    if (p.down) return null;
    const o = p === G.pink ? G.mint : G.pink;
    if (o.down && Math.hypot(o.x - p.x, o.y - p.y) <= REVIVE_D) {
      o.rv += dt / REVIVE_T; o.rvBy = 0.1;
      if (o.rv >= 1) { o.down = false; o.hp = REVIVE_HP; o.rv = 0; ev.push('revive:' + o.id); }
      return 'revive';
    }
    if (!tile) return null;
    if (tile.t === 'T') {
      const nx = tile.tw + 1;
      if (nx > 3) return 'max';
      const cost = TOWER[nx].cost;
      if (G.coins < cost) return 'poor';
      tile.bp += dt / BUILD_T;
      if (tile.bp >= 1) { tile.bp = 0; tile.tw = nx; tile.cd = 0.3; G.coins -= cost; ev.push((nx === 1 ? 'build' : 'upgrade') + ':' + p.id); }
      return 'build';
    }
    if (tile.t === 'h') {
      const H = tile.house;
      if (!H || H.hp >= H.max || H.hp <= 0) return 'full';
      if (G.coins < 1) return 'poor';
      const hp = Math.min(REPAIR_HPS * dt, H.max - H.hp, G.coins / REPAIR_COST);
      H.hp += hp; G.coins = Math.max(0, G.coins - hp * REPAIR_COST);
      ev.push('repair:' + p.id);
      return 'repair';
    }
    return null;
  }

  /* ---------- step ---------- */
  function stepHeroes(G, inp, dt, ev) {
    const P = [G.pink, G.mint], [a, b] = P;
    for (const p of P) {
      const i = inp[p.id] || {};
      p.cd = Math.max(0, p.cd - dt); p.hurt = Math.max(0, p.hurt - dt);
      if (i.act) special(G, p, ev);
      if (i.use) { const t = i.uref != null ? byRef(G, i.uref) : target(G, p); p.using = useAt(G, p, t, dt, ev); }
      else p.using = null;
      if (p.down) { p.rvBy -= dt; if (p.rvBy <= 0) p.rv = Math.max(0, p.rv - dt * 0.5); continue; }
      p.shotT -= dt;
      const e = nearestEnemy(G, p.x, p.y, RANGE);
      if (e) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; p.ax = (e.x - p.x) / d; p.ay = (e.y - p.y) / d; }
      if (e && p.shotT <= 0) {
        p.shotT = SHOT_T;
        G.bu.push({ x: p.x + p.ax * 16, y: p.y + p.ay * 16, tid: e.id, o: p.id, dmg: SHOT_DMG, life: 0.9, vx: p.ax * BULLET_V, vy: p.ay * BULLET_V });
        ev.push('shoot:' + p.id);
      }
    }
    // the love thread between the two heroes
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    G.beam = alive(a) && alive(b) && d <= BEAM_LEN && d > PR;
    if (G.beam) {
      for (const e of G.en) if (segDist(a.x, a.y, b.x, b.y, e.x, e.y) <= e.r + BEAM_W) { hurtEnemy(G, e, BEAM_DPS * dt); e.slow = true; }
      G.fb = G.fb.filter(f => segDist(a.x, a.y, b.x, b.y, f.x, f.y) > BEAM_W + 6);
    }
    if (alive(a) && alive(b) && d <= REGEN_NEAR) for (const p of P) p.hp = Math.min(p.max, p.hp + REGEN * dt);
  }
  function stepTowers(G, dt, ev) {
    for (const t of G.pads) {
      if (!t.tw) continue;
      t.cd -= dt;
      if (t.cd > 0) continue;
      const T = TOWER[t.tw], cx = (t.x + 0.5) * K, cy = (t.y + 0.5) * K, e = nearestEnemy(G, cx, cy, T.range);
      if (!e) continue;
      t.cd = T.rate;
      const d = Math.hypot(e.x - cx, e.y - cy) || 1;
      G.bu.push({ x: cx, y: cy - 18, tid: e.id, o: 'tower', dmg: T.dmg, life: 1, vx: (e.x - cx) / d * BULLET_V, vy: (e.y - cy) / d * BULLET_V });
      ev.push('tower');
    }
  }
  function stepBullets(G, dt) {
    const byId = new Map(G.en.map(e => [e.id, e]));
    for (const b of G.bu) {
      b.life -= dt;
      let e = byId.get(b.tid);
      if (!e || e.hp <= 0) { e = nearestEnemy(G, b.x, b.y, 1.5 * K); b.tid = e ? e.id : -1; }
      if (e) { const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * BULLET_V; b.vy = dy / d * BULLET_V; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (e && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 5) { hurtEnemy(G, e, b.dmg); b.life = 0; }
    }
    G.bu = G.bu.filter(b => b.life > 0);
  }
  function stepEnemies(G, dt, ev) {
    const P = [G.pink, G.mint];
    for (const e of G.en) {
      const s = EN[e.k];
      e.fl = Math.max(0, e.fl - dt); e.cd -= dt;
      const slowK = e.slow ? 0.6 : 1; e.slow = false;
      // knockback
      if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(0.002, dt); e.ky *= Math.pow(0.002, dt); if (Math.abs(e.kx) + Math.abs(e.ky) < 4) e.kx = e.ky = 0; }
      if (e.stun > 0) { e.stun -= dt; e.atk = false; continue; }
      // who to go for
      let tgt = null;
      if (s.aggro) {
        let bd = (e.chase ? s.aggro * 1.5 : s.aggro) * K;
        for (const p of P) { if (p.down) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < bd) { bd = d; tgt = p; } }
      }
      e.chase = tgt ? tgt.id : null;
      const nh = nearestHouse(G, e.x, e.y);
      e.atk = false;
      let gx = null, gy = null;
      if (s.ranged) {
        let aim = null, ad = FIRE.see;
        for (const p of P) { if (p.down) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < ad) { ad = d; aim = { x: p.x, y: p.y }; } }
        if (!aim && nh) { const r = nh.H.rect; aim = { x: clamp(e.x, r.x, r.x + r.w), y: clamp(e.y, r.y, r.y + r.h) }; ad = nh.d; }
        if (aim) {
          if (ad > FIRE.keep) { gx = aim.x; gy = aim.y; }
          else if (e.cd <= 0) {
            e.cd = FIRE.rate;
            const dx = aim.x - e.x, dy = aim.y - e.y, d = Math.hypot(dx, dy) || 1;
            G.fb.push({ x: e.x, y: e.y, vx: dx / d * FIRE.v, vy: dy / d * FIRE.v, life: 3 });
            ev.push('fire');
          }
        }
      } else if (tgt) {
        gx = tgt.x; gy = tgt.y;
        if (Math.hypot(tgt.x - e.x, tgt.y - e.y) < e.r + PR + 4) { hurtPlayer(G, tgt, s.pd * dt, ev); gx = null; e.atk = true; }
      } else if (nh) {
        if (nh.d < e.r + 4) { nh.H.hp = Math.max(0, nh.H.hp - s.hd * dt); e.atk = true; G.hurtT = 0.3; }
        else if (s.fly) { const r = nh.H.rect; gx = clamp(e.x, r.x, r.x + r.w); gy = clamp(e.y, r.y, r.y + r.h); }
        else { const f = flowGoal(G, e); if (f) { gx = f.x; gy = f.y; } }
      }
      if (gx != null) {
        const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
        const sp = s.sp * K * slowK;
        if (d > 1) { e.vx = dx / d * sp; e.vy = dy / d * sp; e.x += e.vx * dt; e.y += e.vy * dt; }
      } else { e.vx = e.vy = 0; }
      // ranged ghosts also sting if you hug them
      if (s.ranged || tgt == null) for (const p of P) if (!p.down && Math.hypot(p.x - e.x, p.y - e.y) < e.r + PR) hurtPlayer(G, p, s.pd * dt, ev);
      // boss calls for help
      if (s.boss) {
        e.sum -= dt;
        if (e.sum <= 0 && G.en.length < 50) { e.sum = 7; for (let k = 0; k < 2; k++) { const a = G.rand() * Math.PI * 2; spawnEnemy(G, 'imp', 0, e.x + Math.cos(a) * e.r * 1.4, e.y + Math.sin(a) * e.r * 1.4); } ev.push('summon'); }
      }
    }
    // keep ghosts apart and out of walls
    const n = G.en.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = G.en[i], b = G.en[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.r + b.r) * 0.85;
      if (d >= m || d < 1e-6) continue;
      const wa = EN[a.k].heavy ? 0.2 : 1, wb = EN[b.k].heavy ? 0.2 : 1, k = (m - d) / d / (wa + wb);
      a.x -= dx * k * wa; a.y -= dy * k * wa; b.x += dx * k * wb; b.y += dy * k * wb;
    }
    for (const e of G.en) {
      if (EN[e.k].fly) { e.x = clamp(e.x, e.r, GW * K - e.r); e.y = clamp(e.y, e.r, GH * K - e.r); }
      else for (let k = 0; k < 2; k++) for (const r of solidsNear(G, e.x, e.y, false)) pushOut(e, r, Math.min(e.r, 0.42 * K));
      if (!EN[e.k].fly) { e.x = clamp(e.x, e.r, GW * K - e.r); e.y = clamp(e.y, e.r, GH * K - e.r); }
    }
    // fireballs
    for (const f of G.fb) {
      f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
      for (const p of P) if (!p.down && Math.hypot(p.x - f.x, p.y - f.y) < PR + 6) { hurtPlayer(G, p, FIRE.dmg, ev); f.life = 0; }
      for (const H of G.houses) if (f.life > 0 && H.hp > 0 && rectDist(H.rect, f.x, f.y) < 4) { H.hp = Math.max(0, H.hp - FIRE.house); f.life = 0; G.hurtT = 0.3; }
      const t = tileAt(G, f.x, f.y);
      if (!t || t.t === '#' || t.t === 't') f.life = 0;
    }
    G.fb = G.fb.filter(f => f.life > 0);
    // deaths and loot
    for (const e of G.en) if (e.hp <= 0) {
      G.kills++; G.dead.push({ x: e.x, y: e.y, k: e.k });
      G.drops.push({ x: e.x, y: e.y, v: EN[e.k].coin, life: 15 });
      ev.push('kill:' + e.k);
    }
    G.en = G.en.filter(e => e.hp > 0);
  }
  function stepDrops(G, dt, ev) {
    const P = [G.pink, G.mint].filter(alive);
    for (const c of G.drops) {
      c.life -= dt;
      let best = null, bd = 2.2 * K;
      for (const p of P) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = p; } }
      if (!best) continue;
      if (bd < 0.5 * K) { G.coins += c.v; c.life = 0; ev.push('coin'); continue; }
      const k = Math.min(1, 7 * K * dt / bd);
      c.x += (best.x - c.x) * k; c.y += (best.y - c.y) * k;
    }
    G.drops = G.drops.filter(c => c.life > 0);
  }
  function stepWaves(G, dt, ev) {
    const W = G.def.waves;
    if (G.ph === 'prep' || G.ph === 'rest') {
      G.pt -= dt;
      if (G.pt <= 0) {
        G.wi++; G.ph = 'wave'; G.queue = buildQueue(G, W[G.wi]); G.spawnT = 0;
        ev.push('wave');
        if (G.queue.some(q => EN[q.k].boss)) ev.push('boss');
      }
      return;
    }
    if (G.ph !== 'wave') return;
    G.spawnT -= dt;
    if (G.queue.length && G.spawnT <= 0) {
      const q = G.queue.shift(); spawnEnemy(G, q.k, q.g);
      G.spawnT = W[G.wi].gap || 0.8;
    }
    if (!G.queue.length && !G.en.length) {
      if (G.wi >= W.length - 1) { G.ph = 'won'; G.over = true; ev.push('won'); }
      else { G.ph = 'rest'; G.pt = G.def.rest || 10; ev.push('rest'); }
    }
  }
  function movePlayers(G, inp, dt) {
    const net = G.net;
    for (const p of [G.pink, G.mint]) if (!net || p.id === net.local) movePlayer(G, p, inp[p.id] || {}, dt);
  }
  /* inp: { pink: {mx, my, act, use, uref?}, mint: {...} }; act is a press (true for one step) */
  function step(G, inp, dt = DT) {
    const ev = [];
    const guest = !!(G.net && G.net.role === 'guest');
    movePlayers(G, inp, dt);
    if (guest || G.over) return ev;
    G.dead = [];
    G.t += dt; G.hurtT = Math.max(0, G.hurtT - dt);
    stepHeroes(G, inp, dt, ev);
    stepTowers(G, dt, ev);
    stepBullets(G, dt);
    stepEnemies(G, dt, ev);
    stepDrops(G, dt, ev);
    stepWaves(G, dt, ev);
    if (!G.over) {
      if (G.houses.some(H => H.hp <= 0)) { G.ph = 'lost'; G.over = true; G.why = 'house'; ev.push('lost'); }
      else if (G.pink.down && G.mint.down) { G.ph = 'lost'; G.over = true; G.why = 'down'; ev.push('lost'); }
    }
    return ev;
  }
  function stars(G) {
    if (G.ph !== 'won') return 0;
    const f = Math.min(...G.houses.map(H => H.hp / H.max));
    return f >= 0.75 ? 3 : f >= 0.4 ? 2 : 1;
  }

  /* ---------- net codec ---------- */
  const OWN = ['pink', 'mint', 'tower'];
  function encode(G) {
    const r = Math.round;
    const pl = p => [r(p.hp), p.down ? 1 : 0, r(p.rv * 99), r(p.cd * 10), p.sn, p.using ? 1 : 0, r(p.ax * 100), r(p.ay * 100), p.hurt > 0 ? 1 : 0];
    return {
      t: r(G.t * 10), ph: PH.indexOf(G.ph), pt: r(G.pt * 10), wi: G.wi, c: r(G.coins), k: G.kills, ql: G.queue.length || G.qlen || 0, why: G.why || '',
      hs: G.houses.map(H => r(H.hp * 10) / 10), ht: G.hurtT > 0 ? 1 : 0,
      pl: [pl(G.pink), pl(G.mint)],
      en: G.en.slice(0, 60).map(e => [e.id, TYPES.indexOf(e.k), r(e.x), r(e.y), r(Math.max(0, e.hp) / e.max * 99), (e.stun > 0 ? 1 : 0) | (e.fl > 0 ? 2 : 0) | (e.atk ? 4 : 0), r(e.vx), r(e.vy)]),
      bu: G.bu.slice(0, 30).map(b => [r(b.x), r(b.y), OWN.indexOf(b.o)]),
      fb: G.fb.slice(0, 20).map(f => [r(f.x), r(f.y)]),
      dr: G.drops.slice(0, 30).map(c => [r(c.x), r(c.y), c.v, c.life < 3 ? 1 : 0]),
      tw: G.pads.filter(t => t.tw || t.bp > 0).map(t => [refOf(t), t.tw, r(t.bp * 99)]),
      bm: G.beam ? 1 : 0
    };
  }
  function apply(G, w) {
    if (!w || typeof w !== 'object') return;
    const n = v => (Number.isFinite(+v) ? +v : 0);
    G.t = n(w.t) / 10; G.ph = PH[w.ph] || G.ph; G.pt = n(w.pt) / 10; G.wi = w.wi | 0; G.coins = n(w.c); G.kills = w.k | 0; G.qlen = w.ql | 0; G.why = typeof w.why === 'string' ? w.why : '';
    G.over = G.ph === 'won' || G.ph === 'lost';
    if (Array.isArray(w.hs)) G.houses.forEach((H, i) => { if (w.hs[i] != null) H.hp = n(w.hs[i]); });
    G.hurtT = w.ht ? 0.3 : 0;
    if (Array.isArray(w.pl)) [G.pink, G.mint].forEach((p, i) => {
      const a = w.pl[i]; if (!Array.isArray(a)) return;
      p.hp = n(a[0]); p.down = !!a[1]; p.rv = n(a[2]) / 99; p.cd = n(a[3]) / 10; p.snR = a[4] | 0; p.using = a[5] ? 'x' : null;
      const ax = n(a[6]) / 100, ay = n(a[7]) / 100; if (ax || ay) { p.ax = ax; p.ay = ay; } p.hurt = a[8] ? 0.25 : 0;
    });
    if (Array.isArray(w.en)) {
      const old = new Map(G.en.map(e => [e.id, e])), next = [];
      if (!G.gone) G.gone = [];
      for (const a of w.en) {
        if (!Array.isArray(a) || !TYPES[a[1]]) continue;
        const k = TYPES[a[1]], s = EN[k];
        let e = old.get(a[0]);
        if (!e) e = { id: a[0], k, x: n(a[2]), y: n(a[3]), r: s.r * K, max: s.hp, hp: s.hp, vx: 0, vy: 0, fl: 0, stun: 0 };
        old.delete(a[0]);
        e.tx = n(a[2]); e.ty = n(a[3]); e.hp = n(a[4]) / 99 * e.max; e.stun = a[5] & 1 ? 0.1 : 0; e.fl = a[5] & 2 ? 0.08 : 0; e.atk = !!(a[5] & 4); e.vx = n(a[6]); e.vy = n(a[7]);
        next.push(e);
      }
      for (const e of old.values()) G.gone.push(e);
      G.en = next;
    }
    if (Array.isArray(w.bu)) G.bu = w.bu.filter(Array.isArray).map(a => ({ x: n(a[0]), y: n(a[1]), o: OWN[a[2]] || 'tower' }));
    if (Array.isArray(w.fb)) G.fb = w.fb.filter(Array.isArray).map(a => ({ x: n(a[0]), y: n(a[1]) }));
    if (Array.isArray(w.dr)) G.drops = w.dr.filter(Array.isArray).map(a => ({ x: n(a[0]), y: n(a[1]), v: a[2] | 0, life: a[3] ? 2 : 10 }));
    if (Array.isArray(w.tw)) {
      for (const t of G.pads) { t.tw = 0; t.bp = 0; }
      for (const a of w.tw) { const t = Array.isArray(a) && byRef(G, a[0]); if (t && t.t === 'T') { t.tw = clamp(a[1] | 0, 0, 3); t.bp = n(a[2]) / 99; } }
    }
    G.beam = !!w.bm;
  }
  // guest: glide ghosts toward the host's positions
  function smooth(G) {
    for (const e of G.en) {
      if (e.tx == null) continue;
      const dx = e.tx - e.x, dy = e.ty - e.y;
      if (Math.abs(dx) > 2 * K || Math.abs(dy) > 2 * K) { e.x = e.tx; e.y = e.ty; }
      else { e.x += dx * 0.3; e.y += dy * 0.3; }
      e.tx += e.vx * DT; e.ty += e.vy * DT;
    }
  }
  function encodePlayer(G, id, i, act) {
    const p = G[id];
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, vx: Math.round(p.vx), vy: Math.round(p.vy), fx: p.fx, fy: p.fy, ka: act.n, ku: i.use ? 1 : 0, kur: i.use ? act.uref : null };
  }
  function applyPlayer(G, id, m, now) {
    if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const p = G[id];
    if (!p.net) { p.x = m.x; p.y = m.y; }
    p.net = { x: m.x, y: m.y, vx: +m.vx || 0, vy: +m.vy || 0, at: now };
    if ([-1, 0, 1].includes(m.fx) && [-1, 0, 1].includes(m.fy) && (m.fx || m.fy)) { p.fx = m.fx; p.fy = m.fy; }
  }
  function smoothPlayer(G, id, now) {
    const p = G[id], n = p.net;
    if (!n) return;
    const age = Math.min(0.1, Math.max(0, (now - n.at) / 1000));
    const tx = n.x + n.vx * age, ty = n.y + n.vy * age;
    if (Math.abs(tx - p.x) > 2 * K || Math.abs(ty - p.y) > 2 * K) { p.x = tx; p.y = ty; }
    else { p.x += (tx - p.x) * 0.3; p.y += (ty - p.y) * 0.3; }
    p.vx = n.vx; p.vy = n.vy;
    const sp = Math.hypot(p.vx, p.vy);
    p.walk = sp > 20 ? p.walk + DT * sp / 18 : 0;
  }

  return { K, GW, GH, DT, PR, EN, TYPES, TOWER, BURST, HEAL, RANGE, BEAM_LEN, REVIVE_D, load, step, stars, target, tileAt, refOf, byRef, nearestHouse, segDist, special, useAt,
    encode, apply, smooth, encodePlayer, applyPlayer, smoothPlayer, buildQueue };
})();

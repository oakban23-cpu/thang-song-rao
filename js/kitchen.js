const Kit = (() => {
  'use strict';
  const K = 64, GW = 15, GH = 7, DT = 1 / 60;
  const PR = 0.3 * K, SPEED = 3.7 * K, ACC = 26 * K;
  const FLOOR = new Set(['.', '1', '2']);
  const STATION = new Set(['C', 'E', 'H', 'K', 'Y', 'R', 'B', 'M', 'S', 'P', 'W', 'X', 'N', 'D']);
  const CRATE = { E: 'egg', H: 'pork', K: 'shrimp', Y: 'papaya', R: 'rice' };
  const CHOP = { pork: 'porkc', shrimp: 'shrimpc', papaya: 'papayac' };
  const POUND = { papayac: 'somtam' };
  const PAN = { egg: 'omelette', porkc: 'kaprao' };
  const POT = { shrimpc: 'tomyum' };
  const COOK_T = { egg: 5, porkc: 6, shrimpc: 7 };
  const READY = new Set(['rice', 'omelette', 'kaprao', 'somtam', 'tomyum']);
  const RECIPES = { kaijeow: ['rice', 'omelette'], kaprao: ['rice', 'kaprao'], somtam: ['somtam'], tomyum: ['tomyum'] };
  const RNAMES = Object.keys(RECIPES);
  const PATIENCE = { kaijeow: 62, kaprao: 78, somtam: 72, tomyum: 84 };
  const PRICE = { kaijeow: 40, kaprao: 50, somtam: 45, tomyum: 60 };
  const CHOP_T = 1.6, POUND_T = 1.8, WASH_T = 1.6, SPRAY_T = 1.1, SPREAD_T = 6, MAX_FIRE = 4, RETURN_T = 6, FAIL = 15;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  function mkTile(c, x, y, boat) {
    const t = { t: c, x, y, boat, item: null, fire: 0, fs: 0, plates: 0, dirty: 0, clean: 0, wp: 0, ret: 0 };
    if (c === 'T') { t.t = 'S'; t.item = { k: 'pot', f: null, st: 'empty', p: 0, o: 0 }; }
    else if (c === 'S') t.item = { k: 'pan', f: null, st: 'empty', p: 0, o: 0 };
    else if (c === 'F') { t.t = 'C'; t.item = { k: 'ext' }; }
    return t;
  }

  function load(def) {
    const G = { def, t: 0, left: def.time || 150, money: 0, served: 0, failed: 0, orders: [], oid: 0, spawnT: 1.5, over: false,
      rand: rng(def.seed || 11), returns: [], tiles: [], boat: null, fireOn: !!def.fire, burnT: def.burn || 9, dirtyOn: def.plates != null,
      spawn: {}, list: [], net: null, served1: [] };
    for (let y = 0; y < GH; y++) {
      const row = (def.map[y] || '').padEnd(GW, '#');
      G.tiles.push([]);
      for (let x = 0; x < GW; x++) {
        const c = row[x];
        if (c === '1' || c === '2') G.spawn[c] = { x: (x + 0.5) * K, y: (y + 0.5) * K };
        const t = mkTile(c, x, y, false);
        if (t.t === 'P') t.plates = def.plates != null ? def.plates : -1;
        G.tiles[y].push(t);
        if (STATION.has(t.t)) G.list.push(t);
      }
    }
    if (def.boat) {
      const b = def.boat;
      const B = { x0: b.x, base: b.y, w: b.map[0].length, h: b.map.length, stops: b.stops, hold: b.hold, glide: b.glide, i: 0, ph: 'hold', t: 0, off: b.stops[0], from: 0, to: 0, dy: 0, tiles: [] };
      for (let y = 0; y < B.h; y++) {
        B.tiles.push([]);
        for (let x = 0; x < B.w; x++) {
          const t = mkTile(b.map[y][x], x, y, true);
          if (t.t === 'P') t.plates = def.plates != null ? def.plates : -1;
          B.tiles[y].push(t);
          if (STATION.has(t.t)) G.list.push(t);
        }
      }
      G.boat = B;
    }
    const mk = (id, s) => ({ id, x: s.x, y: s.y, vx: 0, vy: 0, fx: id === 'pink' ? 1 : -1, fy: 0, held: null, walk: 0, act: 0, net: null });
    G.pink = mk('pink', G.spawn['1']); G.mint = mk('mint', G.spawn['2']);
    return G;
  }

  /* ---------- geometry ---------- */
  const boatTop = B => (B.base + B.off) * K;
  function tileRect(G, t) {
    if (!t.boat) return { x: t.x * K, y: t.y * K, w: K, h: K };
    const B = G.boat;
    return { x: (B.x0 + t.x) * K, y: boatTop(B) + t.y * K, w: K, h: K };
  }
  function tileAt(G, px, py) {
    const B = G.boat;
    if (B && px >= B.x0 * K && px < (B.x0 + B.w) * K && py >= boatTop(B) && py < boatTop(B) + B.h * K) {
      const lx = Math.floor((px - B.x0 * K) / K), ly = Math.floor((py - boatTop(B)) / K);
      return B.tiles[ly] && B.tiles[ly][lx] || null;
    }
    const x = Math.floor(px / K), y = Math.floor(py / K);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return null;
    return G.tiles[y][x];
  }
  const refOf = t => (t.boat ? 1000 + t.y * 100 + t.x : t.y * GW + t.x);
  function byRef(G, r) {
    if (typeof r !== 'number' || !Number.isFinite(r)) return null;
    if (r >= 1000) { const B = G.boat; if (!B) return null; const y = Math.floor((r - 1000) / 100), x = (r - 1000) % 100; return B.tiles[y] && B.tiles[y][x] || null; }
    const y = Math.floor(r / GW), x = r % GW;
    return G.tiles[y] && G.tiles[y][x] || null;
  }
  function solids(G, cx, cy) {
    const out = [], B = G.boat;
    const x0 = Math.floor((cx - K) / K), x1 = Math.floor((cx + K) / K), y0 = Math.floor((cy - K) / K), y1 = Math.floor((cy + K) / K);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= GW || y >= GH) { out.push({ x: x * K, y: y * K, w: K, h: K }); continue; }
      const c = G.tiles[y][x].t;
      if (FLOOR.has(c)) continue;
      if (c === '~' && B && x >= B.x0 && x < B.x0 + B.w) continue;
      out.push({ x: x * K, y: y * K, w: K, h: K });
    }
    if (B) {
      const top = boatTop(B), bot = top + B.h * K, bx = B.x0 * K, bw = B.w * K;
      out.push({ x: bx, y: -K, w: bw, h: top + K }, { x: bx, y: bot, w: bw, h: GH * K - bot + K });
      for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
        if (FLOOR.has(B.tiles[y][x].t)) continue;
        const r = { x: bx + x * K, y: top + y * K, w: K, h: K };
        if (Math.abs(r.x + K / 2 - cx) < K * 1.6 && Math.abs(r.y + K / 2 - cy) < K * 1.6) out.push(r);
      }
    }
    return out;
  }
  function pushOut(p, r) {
    const nx = clamp(p.x, r.x, r.x + r.w), ny = clamp(p.y, r.y, r.y + r.h);
    const dx = p.x - nx, dy = p.y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= PR * PR) return;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (PR - d) / d; p.x += dx * k; p.y += dy * k; return; }
    const l = p.x - r.x, rr = r.x + r.w - p.x, t = p.y - r.y, b = r.y + r.h - p.y, m = Math.min(l, rr, t, b);
    if (m === l) p.x = r.x - PR; else if (m === rr) p.x = r.x + r.w + PR; else if (m === t) p.y = r.y - PR; else p.y = r.y + r.h + PR;
  }
  function collide(G, p, other) {
    for (let k = 0; k < 3; k++) {
      for (const r of solids(G, p.x, p.y)) pushOut(p, r);
      if (other) {
        const dx = p.x - other.x, dy = p.y - other.y, d = Math.hypot(dx, dy), m = PR * 2 - 2;
        if (d < m && d > 1e-6) { p.x += dx / d * (m - d); p.y += dy / d * (m - d); }
      }
    }
  }
  function onBoat(G, p) {
    const B = G.boat;
    if (!B) return false;
    const t = tileAt(G, p.x, p.y);
    return !!t && t.boat;
  }
  const frontPoint = (p, d = 0.82) => ({ x: p.x + p.fx * K * d, y: p.y + p.fy * K * d });
  function target(G, p) {
    const f = frontPoint(p);
    const t = tileAt(G, f.x, f.y);
    return t && STATION.has(t.t) ? t : null;
  }

  /* ---------- items ---------- */
  const isCook = it => it && (it.k === 'pan' || it.k === 'pot');
  const doneFood = it => (isCook(it) && it.st === 'done' ? it.f : null);
  function canAdd(c, food) {
    if (!READY.has(food) || c.includes(food)) return false;
    const n = c.concat(food);
    return RNAMES.some(r => n.every(f => RECIPES[r].includes(f)));
  }
  function fits(cw, raw) { return cw.st === 'empty' && (cw.k === 'pan' ? !!PAN[raw] : !!POT[raw]); }
  function fill(cw, raw) { cw.f = raw; cw.st = 'cook'; cw.p = 0; cw.o = 0; }
  function empty(cw) { cw.f = null; cw.st = 'empty'; cw.p = 0; cw.o = 0; }

  function combine(G, p, tile) {
    const h = p.held, it = tile.item;
    if (h.k === 'plate' && READY.has(it.k) && canAdd(h.c, it.k)) { h.c.push(it.k); tile.item = null; return 'plate'; }
    if (READY.has(h.k) && it.k === 'plate' && canAdd(it.c, h.k)) { it.c.push(h.k); p.held = null; return 'plate'; }
    if (h.k === 'plate' && doneFood(it) && canAdd(h.c, it.f)) { h.c.push(it.f); empty(it); return 'plate'; }
    if (doneFood(h) && it.k === 'plate' && canAdd(it.c, h.f)) { it.c.push(h.f); empty(h); return 'plate'; }
    if (isCook(it) && fits(it, h.k)) { fill(it, h.k); p.held = null; return 'drop'; }
    if (isCook(h) && fits(h, it.k)) { fill(h, it.k); tile.item = null; return 'pick'; }
    return null;
  }

  function serve(G, p) {
    const c = p.held.c;
    if (!c.length) return 'reject';
    let best = -1;
    G.orders.forEach((o, i) => {
      const r = RECIPES[o.r];
      if (best < 0 && r.length === c.length && r.every(f => c.includes(f))) best = i;
    });
    if (best < 0) return 'reject';
    const o = G.orders[best];
    const tip = Math.round(15 * clamp(o.left / o.max, 0, 1));
    G.money += PRICE[o.r] + tip;
    G.served++;
    G.orders.splice(best, 1);
    p.held = null;
    if (G.dirtyOn) G.returns.push({ t: RETURN_T });
    G.lastServe = { r: o.r, tip, id: o.id };
    if (!G.orders.length) G.spawnT = Math.min(G.spawnT, 1.5);
    return 'serve';
  }

  function interact(G, p, tile) {
    if (!tile || !STATION.has(tile.t) || tile.fire > 0 || G.over) return null;
    const h = p.held, it = tile.item, t = tile.t;
    if (!h) {
      if (CRATE[t]) { p.held = { k: CRATE[t] }; return 'pick'; }
      if (t === 'P') { if (tile.plates === 0) return null; if (tile.plates > 0) tile.plates--; p.held = { k: 'plate', c: [] }; return 'pick'; }
      if (t === 'D') { if (!tile.ret) return null; p.held = { k: 'dirty', n: tile.ret }; tile.ret = 0; return 'pick'; }
      if (t === 'N') { if (!tile.clean) return null; tile.clean--; p.held = { k: 'plate', c: [] }; return 'pick'; }
      if (it && t !== 'W' && t !== 'X') { p.held = it; tile.item = null; return 'pick'; }
      return null;
    }
    if (t === 'X') {
      if (h.k === 'plate') { if (!h.c.length) return null; h.c = []; return 'trash'; }
      if (isCook(h)) { if (h.st === 'empty') return null; empty(h); return 'trash'; }
      if (h.k === 'dirty' || h.k === 'ext') return null;
      p.held = null; return 'trash';
    }
    if (t === 'W') return h.k === 'plate' ? serve(G, p) : null;
    if (t === 'N') { if (h.k !== 'dirty') return null; tile.dirty += h.n; p.held = null; return 'drop'; }
    if (t === 'D') { if (h.k !== 'dirty') return null; tile.ret += h.n; p.held = null; return 'drop'; }
    if (t === 'P') { if (h.k === 'plate' && !h.c.length && tile.plates >= 0) { tile.plates++; p.held = null; return 'drop'; } return null; }
    if (CRATE[t]) {
      if (h.k === CRATE[t]) { p.held = null; return 'drop'; }
      if (h.k === 'plate' && canAdd(h.c, CRATE[t])) { h.c.push(CRATE[t]); return 'plate'; }
      return null;
    }
    if (!it) {
      if (t === 'S' && !isCook(h)) return null;
      if (t !== 'S' && t !== 'C' && isCook(h)) return null;
      if ((t === 'B' || t === 'M') && h.k === 'ext') return null;
      tile.item = h; p.held = null; return 'drop';
    }
    return combine(G, p, tile);
  }

  function sprayTiles(G, p) {
    const out = new Set();
    const px = -p.fy, py = p.fx;
    for (const [d, s] of [[0.82, 0], [1.8, 0], [0.82, 1], [0.82, -1]]) {
      const f = frontPoint(p, d), t = tileAt(G, f.x + px * s * K, f.y + py * s * K);
      if (t) out.add(t);
    }
    return [...out];
  }
  function spray(G, p, dt) {
    let hit = false;
    for (const t of sprayTiles(G, p)) if (t.fire > 0) { t.fire = Math.max(0, t.fire - dt / SPRAY_T); hit = true; if (t.fire === 0) t.fs = 0; }
    return hit;
  }

  function useAt(G, p, tile, dt) {
    if (G.over) return null;
    if (p.held && p.held.k === 'ext') return spray(G, p, dt) ? 'spray' : 'spray0';
    if (p.held || !tile || tile.fire > 0) return null;
    const it = tile.item;
    if (tile.t === 'B' && it && CHOP[it.k]) {
      it.cp = (it.cp || 0) + dt / CHOP_T;
      if (it.cp >= 1) { tile.item = { k: CHOP[it.k] }; return 'chopped'; }
      return 'chop';
    }
    if (tile.t === 'M' && it && POUND[it.k]) {
      it.cp = (it.cp || 0) + dt / POUND_T;
      if (it.cp >= 1) { tile.item = { k: POUND[it.k] }; return 'pounded'; }
      return 'pound';
    }
    if (tile.t === 'N' && tile.dirty > 0) {
      tile.wp += dt / WASH_T;
      if (tile.wp >= 1) { tile.wp = 0; tile.dirty--; tile.clean++; return 'washed'; }
      return 'wash';
    }
    return null;
  }

  function neighbours(G, t) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const row = t.boat ? G.boat.tiles[t.y + dy] : G.tiles[t.y + dy];
      const n = row && row[t.x + dx];
      if (n && STATION.has(n.t) && n.t !== 'W') out.push(n);
    }
    return out;
  }

  function stepStations(G, dt, ev) {
    for (const t of G.list) {
      const it = t.item;
      if (t.t === 'S' && isCook(it) && !t.fire) {
        if (it.st === 'cook') {
          it.p += dt / COOK_T[it.f];
          if (it.p >= 1) { it.p = 1; it.st = 'done'; it.f = (it.k === 'pan' ? PAN : POT)[it.f]; ev.push('cooked'); }
        } else if (it.st === 'done') {
          it.o += dt;
          if (it.o >= G.burnT) {
            it.st = 'burnt'; it.f = 'burnt'; ev.push('burnt');
            if (G.fireOn) { t.fire = 1; t.fs = 0; ev.push('fire'); }
          }
        }
      }
      if (t.fire > 0) {
        if (isCook(it) && (it.st === 'cook' || it.st === 'done')) { it.st = 'burnt'; it.f = 'burnt'; }
        t.fs += dt;
        if (t.fs >= SPREAD_T) {
          t.fs = 0;
          if (G.list.filter(x => x.fire > 0).length >= MAX_FIRE) continue;
          const ns = neighbours(G, t).filter(n => !n.fire);
          if (ns.length) { ns[Math.floor(G.rand() * ns.length)].fire = 1; ev.push('fire'); }
        }
      }
    }
  }

  function pickRecipe(G) {
    const pool = G.def.orders;
    let r = pool[Math.floor(G.rand() * pool.length)];
    const same = G.orders.filter(o => o.r === r).length;
    if (same >= 2 && pool.length > 1) r = pool.find(x => x !== r);
    return r;
  }
  function stepOrders(G, dt, ev) {
    const max = G.def.maxOrders || 4;
    G.spawnT -= dt;
    if (G.orders.length < max && G.spawnT <= 0) {
      const r = pickRecipe(G), m = PATIENCE[r] * (G.def.patience || 1);
      G.orders.push({ r, left: m, max: m, id: ++G.oid });
      G.spawnT = G.def.every || 15;
      ev.push('order');
    }
    for (let i = G.orders.length - 1; i >= 0; i--) {
      const o = G.orders[i];
      o.left -= dt;
      if (o.left <= 0) { G.orders.splice(i, 1); G.money = Math.max(0, G.money - FAIL); G.failed++; ev.push('expire'); if (!G.orders.length) G.spawnT = Math.min(G.spawnT, 1.5); }
    }
    for (let i = G.returns.length - 1; i >= 0; i--) {
      G.returns[i].t -= dt;
      if (G.returns[i].t <= 0) {
        G.returns.splice(i, 1);
        const d = G.list.find(t => t.t === 'D');
        if (d) { d.ret++; ev.push('dirty'); }
      }
    }
  }

  function stepBoat(G, dt) {
    const B = G.boat;
    if (!B) return 0;
    const o0 = B.off;
    B.t += dt;
    if (B.ph === 'hold') {
      if (B.t >= B.hold) { B.ph = 'glide'; B.t = 0; B.from = B.stops[B.i]; B.i = (B.i + 1) % B.stops.length; B.to = B.stops[B.i]; }
    } else {
      const s = Math.min(1, B.t / B.glide), e = s * s * (3 - 2 * s);
      B.off = B.from + (B.to - B.from) * e;
      if (s >= 1) { B.ph = 'hold'; B.t = 0; B.off = B.to; }
    }
    B.dy = (B.off - o0) * K;
    return B.dy;
  }

  function movePlayer(G, p, i, dt, other) {
    const mx = clamp(i.mx || 0, -1, 1), my = clamp(i.my || 0, -1, 1), mag = Math.hypot(mx, my);
    const sx = mag > 1 ? mx / mag : mx, sy = mag > 1 ? my / mag : my;
    p.vx = approach(p.vx, sx * SPEED, ACC * dt);
    p.vy = approach(p.vy, sy * SPEED, ACC * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (mag > 0.3) {
      if (Math.abs(mx) >= Math.abs(my)) { p.fx = Math.sign(mx); p.fy = 0; } else { p.fx = 0; p.fy = Math.sign(my); }
    }
    collide(G, p, other);
    const sp = Math.hypot(p.vx, p.vy);
    p.walk = sp > 20 ? p.walk + dt * sp / 18 : 0;
  }

  /* inp: { pink: {mx, my, act, use}, mint: {...} }; act is a press (true for one step) */
  function step(G, inp, dt = DT) {
    const ev = [];
    const net = G.net, guest = !!(net && net.role === 'guest');
    const P = [G.pink, G.mint];
    const local = p => !net || p.id === net.local;
    if (!guest) G.t += dt;
    const dy = guest ? (G.boat ? G.boat.dy : 0) : stepBoat(G, dt);
    if (dy) for (const p of P) if (local(p) && onBoat(G, { x: p.x, y: p.y - dy })) p.y += dy;
    for (const p of P) {
      if (!local(p)) continue;
      const o = p === G.pink ? G.mint : G.pink;
      movePlayer(G, p, inp[p.id] || {}, dt, o);
    }
    if (guest) return ev;
    if (!G.over) {
      for (const p of P) {
        const i = inp[p.id] || {};
        const tile = i.ref != null ? byRef(G, i.ref) : target(G, p);
        if (i.act) { const r = interact(G, p, tile); if (r) ev.push(r + ':' + p.id); p.act = r ? 1 : -1; }
        if (i.use) { const r = useAt(G, p, i.uref != null ? byRef(G, i.uref) : tile, dt); if (r) { p.using = r; ev.push(r + ':' + p.id); } else p.using = null; }
        else p.using = null;
      }
      stepStations(G, dt, ev);
      stepOrders(G, dt, ev);
      G.left -= dt;
      if (G.left <= 0) { G.left = 0; G.over = true; ev.push('end'); }
    }
    return ev;
  }

  function stars(G) {
    const s = G.def.stars;
    return G.money >= s[2] ? 3 : G.money >= s[1] ? 2 : G.money >= s[0] ? 1 : 0;
  }

  /* ---------- net codec ---------- */
  const SIMPLE = { egg: 'e', rice: 'r', pork: 'p', porkc: 'q', shrimp: 's', shrimpc: 'z', papaya: 'y', papayac: 'u', somtam: 'm', omelette: 'o', kaprao: 'k', tomyum: 't', ext: 'x', burnt: 'b' };
  const UNSIMPLE = Object.fromEntries(Object.entries(SIMPLE).map(([a, b]) => [b, a]));
  const ST = { empty: '0', cook: 'c', done: 'd', burnt: 'b' }, UNST = { 0: 'empty', c: 'cook', d: 'done', b: 'burnt' };
  function enc(it) {
    if (!it) return '';
    if (it.k === 'plate') return 'P' + it.c.map(c => SIMPLE[c]).join('');
    if (it.k === 'dirty') return 'D' + it.n;
    if (isCook(it)) return (it.k === 'pan' ? 'N' : 'O') + (it.f ? SIMPLE[it.f] : '-') + ST[it.st] + String(Math.round(Math.min(it.st === 'done' ? it.o / 9.9 : it.p, 0.99) * 100)).padStart(2, '0');
    const c = SIMPLE[it.k];
    return c ? c + (it.cp ? String(Math.round(Math.min(it.cp, .99) * 100)).padStart(2, '0') : '') : '';
  }
  function dec(s, burnT) {
    if (typeof s !== 'string' || !s) return null;
    const h = s[0];
    if (h === 'P') return { k: 'plate', c: s.slice(1).split('').map(c => UNSIMPLE[c]).filter(f => READY.has(f)).slice(0, 3) };
    if (h === 'D') return { k: 'dirty', n: Math.max(1, Math.min(9, parseInt(s.slice(1), 10) || 1)) };
    if (h === 'N' || h === 'O') {
      const st = UNST[s[2]] || 'empty', v = (parseInt(s.slice(3), 10) || 0) / 100;
      return { k: h === 'N' ? 'pan' : 'pot', f: s[1] === '-' ? null : UNSIMPLE[s[1]] || null, st, p: st === 'cook' ? v : 1, o: st === 'done' ? v * 9.9 : 0, of: st === 'done' ? v * 9.9 / burnT : 0 };
    }
    const k = UNSIMPLE[h];
    if (!k) return null;
    const it = { k };
    if (s.length > 1) it.cp = (parseInt(s.slice(1), 10) || 0) / 100;
    return it;
  }
  function encode(G) {
    const tl = [];
    for (const t of G.list) {
      const e = enc(t.item), extra = t.t === 'P' ? t.plates : t.t === 'N' ? t.dirty * 10 + Math.min(9, t.clean) : t.t === 'D' ? t.ret : 0;
      const w = t.t === 'N' ? Math.round(t.wp * 99) : 0, f = Math.round(t.fire * 9);
      if (e || extra || w || f) tl.push([refOf(t), e, extra, w, f]);
    }
    return {
      t: Math.round(G.left * 10), $: G.money, sv: G.served, fl: G.failed, ov: G.over ? 1 : 0,
      o: G.orders.map(o => [RNAMES.indexOf(o.r), Math.round(o.left), Math.round(o.max), o.id]),
      tl, h: [enc(G.pink.held), enc(G.mint.held)], u: [G.pink.using ? 1 : 0, G.mint.using ? 1 : 0],
      bo: G.boat ? Math.round(G.boat.off * 1000) / 1000 : 0
    };
  }
  function apply(G, w) {
    if (!w || typeof w !== 'object') return;
    if (Number.isFinite(w.t)) G.left = Math.max(0, w.t / 10);
    if (Number.isFinite(w.$)) G.money = w.$;
    G.served = w.sv | 0; G.failed = w.fl | 0; G.over = !!w.ov;
    if (Array.isArray(w.o)) G.orders = w.o.filter(a => Array.isArray(a) && RNAMES[a[0]]).slice(0, 6).map(a => ({ r: RNAMES[a[0]], left: +a[1] || 0, max: Math.max(1, +a[2] || 1), id: a[3] | 0 }));
    if (Array.isArray(w.tl)) {
      const seen = new Set();
      for (const a of w.tl) {
        if (!Array.isArray(a)) continue;
        const t = byRef(G, a[0]);
        if (!t || !STATION.has(t.t)) continue;
        seen.add(t);
        t.item = dec(a[1], G.burnT);
        if (t.t === 'P') t.plates = a[2] | 0; else t.plates = 0;
        if (t.t === 'N') { t.dirty = Math.floor((a[2] | 0) / 10); t.clean = (a[2] | 0) % 10; t.wp = (a[3] | 0) / 99; }
        if (t.t === 'D') t.ret = a[2] | 0;
        t.fire = Math.max(0, Math.min(1, (a[4] | 0) / 9));
      }
      for (const t of G.list) if (!seen.has(t)) { t.item = null; t.fire = 0; if (t.t === 'P') t.plates = 0; if (t.t === 'N') { t.dirty = t.clean = 0; t.wp = 0; } if (t.t === 'D') t.ret = 0; }
    }
    if (Array.isArray(w.h)) { G.pink.held = dec(w.h[0], G.burnT); G.mint.held = dec(w.h[1], G.burnT); }
    if (Array.isArray(w.u)) { G.pink.using = w.u[0] ? 'x' : null; G.mint.using = w.u[1] ? 'x' : null; }
    if (G.boat && Number.isFinite(w.bo)) { const o0 = G.boat.off; G.boat.tgt = w.bo; G.boat.o0 = o0; }
  }
  function smoothBoat(G) {
    const B = G.boat;
    if (!B || B.tgt == null) { if (B) B.dy = 0; return; }
    const o0 = B.off, d = B.tgt - B.off;
    B.off += Math.abs(d) > 1 ? d : d * 0.3;
    B.dy = (B.off - o0) * K;
  }
  function encodePlayer(G, id, i, act) {
    const p = G[id];
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, vx: Math.round(p.vx), vy: Math.round(p.vy), fx: p.fx, fy: p.fy, ka: act.n, kr: act.ref, ku: i.use ? 1 : 0, kur: i.use ? act.uref : null };
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

  return { sprayTiles, K, GW, GH, DT, PR, RECIPES, RNAMES, PRICE, PATIENCE, CRATE, COOK_T, load, step, interact, useAt, target, tileAt, tileRect, refOf, byRef, stars, onBoat, boatTop, isCook, doneFood, canAdd,
    encode, apply, smoothBoat, encodePlayer, applyPlayer, smoothPlayer, enc, dec };
})();

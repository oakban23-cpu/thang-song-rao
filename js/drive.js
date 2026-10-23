/* Driving mode: one delivery truck, two drivers. One player only steers, the other only works the pedals.
   Pick parcels up at shops (capital letters on the map) and drop them at houses (small letters) before the customer gives up. */
const Drv = (() => {
  'use strict';
  const K = 64, DT = 1 / 60;
  const SOLID = new Set(['#', 't', '~']);
  const VMAX = 6.5 * K, VTURBO = 9.5 * K, VGRASS = 3 * K, VREV = 2.6 * K;
  const ACC = 5 * K, BRAKE = 13 * K, REV_ACC = 4 * K, DRAG = 2.5 * K, GRASS_DRAG = 7 * K;
  const TURN = 2.7, TURN_V = 2.2 * K;
  const GRIP = { road: 14, grass: 8, puddle: 1.6 };
  const CAR_R = 0.25 * K, CAR_OFF = 0.22 * K;
  const STOP_V = 0.8 * K, STOP_R = 0.9 * K, STOP_T = 0.45, CAP = 2;
  const TURBO_T = 1.5, TURBO_MAX = 3, HORN_CD = 0.45, HORN_R = 4 * K;
  const KIND = {
    box: { name: 'กล่อง', bonus: 0, frag: 1, pat: 1 },
    egg: { name: 'ไข่ไก่', bonus: 10, frag: 2.5, pat: 1 },
    cake: { name: 'เค้ก', bonus: 15, frag: 2, pat: 1 },
    ice: { name: 'ไอติม', bonus: 10, frag: 1, pat: 0.65 }
  };
  const KINDS = Object.keys(KIND);
  const FAIL = 10, CHICK_FINE = 5, TRAIN_FINE = 10;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  /* ---------- load ---------- */
  function load(def) {
    const W = def.map[0].length, H = def.map.length;
    const G = { def, W, H, t: 0, left: def.time || 150, money: 0, served: 0, failed: 0, crashes: 0, chicks: 0, trainHits: 0, over: false,
      rand: rng(def.seed || 5), tiles: [], spots: [], shops: [], houses: [], orders: [], oid: 0, spawnT: 1, carried: [], net: null,
      traffic: [], chickens: [], trains: def.trains || [], rain: !!def.rain, stopT: 0, stopLock: false, ev: { crash: 0, chick: 0, train: 0, honk: 0, turbo: 0, pick: 0, drop: 0 } };
    let start = null;
    for (let y = 0; y < H; y++) {
      G.tiles.push([]);
      for (let x = 0; x < W; x++) {
        const c = def.map[y][x];
        G.tiles[y].push(c);
        if (c === 'S') start = { x: (x + 0.5) * K, y: (y + 0.5) * K };
        if (/[A-F]/.test(c) || /[a-f]/.test(c)) {
          const shop = /[A-F]/.test(c), sp = { id: G.spots.length, key: c, shop, x: (x + 0.5) * K, y: (y + 0.5) * K, tx: x, ty: y, name: (shop ? def.shops : def.houses)[c] || c };
          G.spots.push(sp); (shop ? G.shops : G.houses).push(sp);
        }
      }
    }
    G.dist = distTable(G);
    G.car = { x: start.x, y: start.y, a: def.startA || 0, vx: 0, vy: 0, steer: 0, turboT: 0, turbo: TURBO_MAX, stun: 0, safe: 0, honkT: 0, hornCd: 0, inS: 0, inP: 0 };
    // traffic cars spread along their loops
    for (const tr of def.traffic || []) {
      const pts = tr.path.map(([x, y]) => ({ x: x * K, y: y * K }));
      let len = 0; const segs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b.x - a.x, b.y - a.y); segs.push({ a, b, l, s: len }); len += l; }
      for (let k = 0; k < tr.n; k++) {
        let d = (len * k) / tr.n + (tr.shift || 0) * K, i = 0;
        while (d > segs[i].s + segs[i].l) i = (i + 1) % segs.length;
        const sg = segs[i], f = (d - sg.s) / sg.l;
        G.traffic.push({ pts, i: (i + 1) % pts.length, x: sg.a.x + (sg.b.x - sg.a.x) * f, y: sg.a.y + (sg.b.y - sg.a.y) * f, a: Math.atan2(sg.b.y - sg.a.y, sg.b.x - sg.a.x), v: 0, top: (tr.sp || 3) * K * (G.rain ? 0.85 : 1), col: k + G.traffic.length, wait: 0, honk: 0 });
      }
    }
    // chickens live on k tiles
    const yard = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.tiles[y][x] === 'k') yard.push([x, y]);
    for (let i = 0; i < (def.chickens || 0) && yard.length; i++) {
      const [x, y] = yard[Math.floor(G.rand() * yard.length)];
      const c = { hx: (x + 0.5) * K, hy: (y + 0.5) * K, x: (x + 0.5) * K, y: (y + 0.5) * K, tx: 0, ty: 0, st: 'walk', t: 0, vx: 0, vy: 0 };
      pickTarget(G, c); G.chickens.push(c);
    }
    return G;
  }
  const tileAt = (G, x, y) => { const tx = Math.floor(x / K), ty = Math.floor(y / K); return tx < 0 || ty < 0 || tx >= G.W || ty >= G.H ? '#' : G.tiles[ty][tx]; };
  const drivable = c => !SOLID.has(c);
  // road steps between every shop and house (for patience and price)
  function distTable(G) {
    const out = {};
    for (const s of G.shops) {
      const D = new Map(), q = [[s.tx, s.ty]]; D.set(s.ty * 100 + s.tx, 0);
      while (q.length) {
        const [x, y] = q.shift(), d = D.get(y * 100 + x);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= G.W || ny >= G.H || !drivable(G.tiles[ny][nx]) || D.has(ny * 100 + nx)) continue;
          D.set(ny * 100 + nx, d + 1); q.push([nx, ny]);
        }
      }
      for (const h of G.houses) out[s.key + h.key] = D.get(h.ty * 100 + h.tx) || 30;
    }
    return out;
  }

  /* ---------- trains ---------- */
  // head position (in tiles along the track) of train k at time t; the train spans [head - len, head]
  function trainHead(G, tr, t) {
    const span = (tr.row != null ? G.W : G.H) + tr.len + 6;
    const s = (((t + (tr.off || 0)) % tr.period) + tr.period) % tr.period * tr.sp - 3;
    if (s > span) return null;
    return tr.dir < 0 ? (tr.row != null ? G.W : G.H) - s + tr.len : s;
  }
  function trainRect(G, tr, t) {
    const h = trainHead(G, tr, t);
    if (h == null) return null;
    const lo = tr.dir < 0 ? h - tr.len : h - tr.len, hi = lo + tr.len;
    if (tr.row != null) return { x: lo * K, y: tr.row * K + 6, w: tr.len * K, h: K - 12 };
    return { x: tr.col * K + 6, y: lo * K, w: K - 12, h: tr.len * K };
  }
  // is a crossing at track position p (tiles) about to see a train?
  function gateClosed(G, p, t) {
    for (const tr of G.trains) {
      for (let dt = 0; dt <= 3; dt += 0.25) {
        const r = trainRect(G, tr, t + dt);
        if (!r) continue;
        const lo = (tr.row != null ? r.x : r.y) / K - 0.6, hi = lo + tr.len + 1.2;
        if (p + 1 >= lo && p <= hi) return true;
      }
    }
    return false;
  }
  function onTrackGate(G, x, y) {
    const tx = Math.floor(x / K), ty = Math.floor(y / K);
    for (const tr of G.trains) {
      if (tr.row != null ? ty === tr.row : tx === tr.col) return gateClosed(G, tr.row != null ? tx : ty, G.t);
    }
    return false;
  }

  /* ---------- the truck ---------- */
  const dirOf = a => ({ x: Math.cos(a), y: Math.sin(a) });
  function circles(o) { const d = dirOf(o.a); return [{ x: o.x + d.x * CAR_OFF, y: o.y + d.y * CAR_OFF }, { x: o.x - d.x * CAR_OFF, y: o.y - d.y * CAR_OFF }]; }
  function rectPush(c, r, rad) {
    const nx = clamp(c.x, r.x, r.x + r.w), ny = clamp(c.y, r.y, r.y + r.h);
    const dx = c.x - nx, dy = c.y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= rad * rad) return null;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); return { x: dx / d * (rad - d), y: dy / d * (rad - d) }; }
    const l = c.x - r.x, rr = r.x + r.w - c.x, t = c.y - r.y, b = r.y + r.h - c.y, m = Math.min(l, rr, t, b);
    if (m === l) return { x: -(l + rad), y: 0 }; if (m === rr) return { x: rr + rad, y: 0 }; if (m === t) return { x: 0, y: -(t + rad) }; return { x: 0, y: b + rad };
  }
  function surface(G, x, y) { const c = tileAt(G, x, y); return c === ' ' || c === 'k' ? 'grass' : c === 'p' ? 'puddle' : 'road'; }
  // move the truck one step; returns the hardest impact speed (px/s) against walls or traffic
  function stepCar(G, s, p, dt, opts = {}) {
    const car = G.car;
    if (car.stun > 0) { car.stun -= dt; s = 0; p = 0; }
    car.steer += (s - car.steer) * Math.min(1, dt * 12);
    const d = dirOf(car.a), px = -d.y, py = d.x;
    let fwd = car.vx * d.x + car.vy * d.y, lat = car.vx * px + car.vy * py;
    const surf = surface(G, car.x, car.y), turbo = car.turboT > 0;
    const top = surf === 'grass' ? VGRASS : turbo ? VTURBO : VMAX;
    if (p > 0.05) {
      if (fwd < -0.2 * K) fwd = Math.min(0, fwd + BRAKE * p * dt);
      else if (fwd < top) fwd = Math.min(top, fwd + ACC * (turbo ? 2 : 1) * p * dt);
    } else if (p < -0.05) {
      if (fwd > 0.2 * K) fwd = Math.max(0, fwd - BRAKE * -p * dt);
      else fwd = Math.max(-VREV, fwd - REV_ACC * -p * dt);
    } else fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), DRAG * dt);
    if (Math.abs(fwd) > top) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd) - top, GRASS_DRAG * dt);
    car.a = wrapA(car.a + car.steer * TURN * clamp(fwd / TURN_V, -1, 1) * dt);
    const grip = GRIP[surf] * (G.rain ? 0.35 : 1);
    lat *= Math.exp(-grip * dt);
    car.vx = d.x * fwd + px * lat; car.vy = d.y * fwd + py * lat;
    car.x += car.vx * dt; car.y += car.vy * dt;
    car.turboT = Math.max(0, car.turboT - dt);
    // walls, traffic
    let hit = 0;
    for (let it = 0; it < 3; it++) {
      let tx = 0, ty = 0;
      for (const c of circles(car)) {
        const x0 = Math.floor((c.x - K) / K), x1 = Math.floor((c.x + K) / K), y0 = Math.floor((c.y - K) / K), y1 = Math.floor((c.y + K) / K);
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          if (xx >= 0 && yy >= 0 && xx < G.W && yy < G.H && drivable(G.tiles[yy][xx])) continue;
          const pu = rectPush(c, { x: xx * K, y: yy * K, w: K, h: K }, CAR_R);
          if (pu) { tx += pu.x; ty += pu.y; c.x += pu.x; c.y += pu.y; }
        }
        if (!opts.noTraffic) for (const o of G.traffic) for (const oc of circles(o)) {
          const dx = c.x - oc.x, dy = c.y - oc.y, dd = Math.hypot(dx, dy), m = CAR_R * 2 - 2;
          if (dd < m && dd > 1e-6) { const k = (m - dd) / dd; tx += dx * k; ty += dy * k; c.x += dx * k; c.y += dy * k; }
        }
      }
      const pl = Math.hypot(tx, ty);
      if (pl < 1e-6) break;
      car.x += tx / 2; car.y += ty / 2;
      const nx = tx / pl, ny = ty / pl, vn = car.vx * nx + car.vy * ny;
      if (vn < 0) { hit = Math.max(hit, -vn); car.vx -= 1.3 * vn * nx; car.vy -= 1.3 * vn * ny; car.vx *= 0.85; car.vy *= 0.85; }
    }
    return hit;
  }

  /* ---------- world ---------- */
  function pickTarget(G, c) {
    for (let k = 0; k < 12; k++) {
      const a = G.rand() * Math.PI * 2, r = (0.5 + G.rand() * 3) * K, x = c.hx + Math.cos(a) * r, y = c.hy + Math.sin(a) * r;
      if (drivable(tileAt(G, x, y))) { c.tx = x; c.ty = y; c.t = 2 + G.rand() * 3; return; }
    }
    c.tx = c.hx; c.ty = c.hy; c.t = 2;
  }
  function stepChickens(G, dt, ev) {
    const car = G.car, sp = Math.hypot(car.vx, car.vy);
    for (const c of G.chickens) {
      if (c.st === 'gone') { c.t -= dt; if (c.t <= 0) { c.st = 'walk'; c.x = c.hx; c.y = c.hy; pickTarget(G, c); } continue; }
      const dcar = Math.hypot(c.x - car.x, c.y - car.y);
      if (c.st !== 'flee' && dcar < 1.0 * K && sp > 1.5 * K) { c.st = 'flee'; c.t = 1.2; }
      if (c.st === 'flee') {
        c.t -= dt;
        const ax = c.x - car.x, ay = c.y - car.y, l = Math.hypot(ax, ay) || 1;
        c.vx = ax / l * 3.2 * K; c.vy = ay / l * 3.2 * K;
        if (c.t <= 0) { c.st = 'walk'; pickTarget(G, c); }
      } else {
        c.t -= dt;
        const ax = c.tx - c.x, ay = c.ty - c.y, l = Math.hypot(ax, ay);
        if (l < 4 || c.t <= 0) { pickTarget(G, c); c.vx = c.vy = 0; }
        else { c.vx = ax / l * 0.7 * K; c.vy = ay / l * 0.7 * K; }
      }
      const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
      if (drivable(tileAt(G, nx, c.y))) c.x = nx; else c.vx = 0;
      if (drivable(tileAt(G, c.x, ny))) c.y = ny; else c.vy = 0;
      // run over?
      if (sp > 1.0 * K) for (const cc of circles(car)) if (Math.hypot(cc.x - c.x, cc.y - c.y) < CAR_R + 0.14 * K) {
        c.st = 'gone'; c.t = 4; G.chicks++; G.ev.chick++; G.money = Math.max(0, G.money - CHICK_FINE);
        ev.push('chicken'); G.lastChick = { x: c.x, y: c.y };
        break;
      }
    }
  }
  function honk(G, ev) {
    const car = G.car;
    if (car.hornCd > 0) return;
    car.hornCd = HORN_CD; car.honkT = 0.35; G.ev.honk++;
    for (const c of G.chickens) if (c.st !== 'gone' && Math.hypot(c.x - car.x, c.y - car.y) < HORN_R) { c.st = 'flee'; c.t = 1.6; }
    ev.push('honk');
  }
  function turbo(G, ev) {
    const car = G.car;
    if (car.turbo <= 0 || car.turboT > 0 || car.stun > 0) return;
    car.turbo--; car.turboT = TURBO_T; G.ev.turbo++;
    ev.push('turbo');
  }
  function stepTraffic(G, dt) {
    const car = G.car, cc = circles(car);
    for (const o of G.traffic) {
      const tg = o.pts[o.i], dx = tg.x - o.x, dy = tg.y - o.y, d = Math.hypot(dx, dy);
      if (d < 6) { o.i = (o.i + 1) % o.pts.length; continue; }
      const want = Math.atan2(dy, dx);
      o.a = wrapA(o.a + clamp(wrapA(want - o.a), -4 * dt, 4 * dt));
      const dir = dirOf(o.a);
      let blocked = false, byCar = false;
      for (const ahead of [0.55, 0.95, 1.35]) {
        const ax = o.x + dir.x * ahead * K, ay = o.y + dir.y * ahead * K;
        for (const c of cc) if (Math.hypot(c.x - ax, c.y - ay) < 0.42 * K) { blocked = true; byCar = true; }
        for (const q of G.traffic) if (q !== o && Math.hypot(q.x - ax, q.y - ay) < 0.42 * K && o.wait < 4) blocked = true;
        if (ahead > 0.6 && G.trains.length && !onTrackGate(G, o.x, o.y) && onTrackGate(G, ax, ay)) blocked = true;
      }
      o.wait = blocked ? o.wait + dt : Math.max(0, o.wait - dt * 2);
      if (o.wait > 7) o.wait = 0;
      o.honk = byCar && o.wait > 1.5 ? 0.3 : Math.max(0, o.honk - dt);
      const target = blocked ? 0 : o.top * (Math.abs(wrapA(want - o.a)) > 0.6 ? 0.5 : 1);
      o.v += clamp(target - o.v, -12 * K * dt, 4 * K * dt);
      o.x += dir.x * o.v * dt; o.y += dir.y * o.v * dt;
    }
  }
  function stepTrains(G, ev) {
    const car = G.car;
    if (car.safe > 0) return;
    for (const tr of G.trains) {
      const r = trainRect(G, tr, G.t);
      if (!r) continue;
      for (const c of circles(car)) {
        if (!rectPush(c, r, CAR_R)) continue;
        // flung off the line
        const side = tr.row != null ? (car.y < r.y + r.h / 2 ? -1 : 1) : (car.x < r.x + r.w / 2 ? -1 : 1);
        if (tr.row != null) { car.vy = side * 7 * K; car.vx = tr.dir * tr.sp * K * 0.4; car.y += side * K * 0.6; }
        else { car.vx = side * 7 * K; car.vy = tr.dir * tr.sp * K * 0.4; car.x += side * K * 0.6; }
        car.stun = 1.2; car.safe = 2; G.trainHits++; G.ev.train++;
        G.money = Math.max(0, G.money - TRAIN_FINE);
        damage(G, 0.5, true);
        ev.push('train');
        return;
      }
    }
  }
  function damage(G, amt, flat) {
    for (const id of G.carried) { const o = G.orders.find(q => q.id === id); if (o) o.cond = Math.max(0, o.cond - amt * (flat ? 1 : KIND[o.kind].frag)); }
  }

  /* ---------- orders ---------- */
  function spawnOrder(G, ev) {
    const busyShops = new Set(G.orders.filter(o => o.st === 'wait').map(o => o.from));
    const busyHouses = new Set(G.orders.map(o => o.to));
    let shops = G.shops.filter(s => !busyShops.has(s.key)); if (!shops.length) shops = G.shops;
    let houses = G.houses.filter(h => !busyHouses.has(h.key)); if (!houses.length) houses = G.houses;
    const s = shops[Math.floor(G.rand() * shops.length)], h = houses[Math.floor(G.rand() * houses.length)];
    const kinds = G.def.kinds || ['box'], kind = kinds[Math.floor(G.rand() * kinds.length)], K2 = KIND[kind];
    const dist = G.dist[s.key + h.key];
    const max = (26 + dist * 1.4) * (G.def.patience || 1) * K2.pat;
    G.orders.push({ id: ++G.oid, from: s.key, to: h.key, kind, left: max, max, st: 'wait', cond: 1, price: Math.round(25 + dist * 1.1 + K2.bonus) });
    ev.push('order');
  }
  function stepOrders(G, dt, ev) {
    G.spawnT -= dt;
    if (G.orders.length < (G.def.maxOrders || 3) && G.spawnT <= 0) { spawnOrder(G, ev); G.spawnT = G.def.every || 14; }
    for (let i = G.orders.length - 1; i >= 0; i--) {
      const o = G.orders[i];
      o.left -= dt;
      if (o.left <= 0) {
        G.orders.splice(i, 1); G.carried = G.carried.filter(id => id !== o.id);
        G.failed++; G.money = Math.max(0, G.money - FAIL); ev.push('expire');
        if (!G.orders.length) G.spawnT = Math.min(G.spawnT, 1.5);
      }
    }
    // stopping in a bay
    const car = G.car, sp = Math.hypot(car.vx, car.vy);
    let bay = null;
    for (const s of G.spots) if (Math.hypot(s.x - car.x, s.y - car.y) < STOP_R) { bay = s; break; }
    const useful = bay && (bay.shop ? G.carried.length < CAP && G.orders.some(o => o.st === 'wait' && o.from === bay.key) : G.carried.some(id => { const o = G.orders.find(q => q.id === id); return o && o.to === bay.key; }));
    if (!bay) G.stopLock = false;
    if (useful && sp < STOP_V && !G.stopLock) {
      G.stopT += dt; G.bay = bay.id;
      if (G.stopT >= STOP_T) {
        G.stopT = 0; G.stopLock = true;
        if (bay.shop) {
          for (const o of G.orders) if (o.st === 'wait' && o.from === bay.key && G.carried.length < CAP) { o.st = 'car'; G.carried.push(o.id); }
          G.ev.pick++; ev.push('pick');
        } else {
          let pay = 0;
          for (const id of G.carried.slice()) {
            const o = G.orders.find(q => q.id === id);
            if (!o || o.to !== bay.key) continue;
            const tip = Math.round(20 * clamp(o.left / o.max, 0, 1));
            const got = Math.round((o.price + tip) * (0.3 + 0.7 * o.cond));
            pay += got; G.money += got; G.served++;
            G.orders.splice(G.orders.indexOf(o), 1); G.carried = G.carried.filter(q => q !== id);
          }
          car.turbo = Math.min(TURBO_MAX, car.turbo + 1);
          G.lastPay = pay; G.ev.drop++; ev.push('drop:' + pay);
          if (!G.orders.length) G.spawnT = Math.min(G.spawnT, 1.5);
        }
      }
    } else { G.stopT = Math.max(0, G.stopT - dt * 2); if (!useful) G.bay = -1; }
  }

  /* inp: { steer: [-1..1], pedal: [-1..1], horn: bool (press), turbo: bool (press) } */
  function step(G, inp, dt = DT) {
    const ev = [];
    const car = G.car;
    car.inS = clamp(inp.steer || 0, -1, 1); car.inP = clamp(inp.pedal || 0, -1, 1);
    car.hornCd = Math.max(0, car.hornCd - dt); car.honkT = Math.max(0, car.honkT - dt); car.safe = Math.max(0, car.safe - dt);
    if (G.over) { stepCar(G, 0, -1, dt); return ev; }
    G.t += dt;
    if (inp.horn) honk(G, ev);
    if (inp.turbo) turbo(G, ev);
    stepTraffic(G, dt);
    const hit = stepCar(G, car.inS, car.inP, dt);
    if (hit > 1.6 * K) {
      G.crashes++; G.ev.crash++;
      damage(G, (hit / K - 1.6) * 0.08, false);
      ev.push('crash:' + Math.round(hit / K * 10));
    }
    stepTrains(G, ev);
    stepChickens(G, dt, ev);
    stepOrders(G, dt, ev);
    G.left -= dt;
    if (G.left <= 0) { G.left = 0; G.over = true; ev.push('end'); }
    return ev;
  }
  function stars(G) { const s = G.def.stars; return G.money >= s[2] ? 3 : G.money >= s[1] ? 2 : G.money >= s[0] ? 1 : 0; }

  /* ---------- net codec ---------- */
  function encode(G) {
    const r = Math.round, c = G.car;
    return {
      t: r(G.t * 100) / 100, l: r(G.left * 10), $: G.money, sv: G.served, fl: G.failed, ov: G.over ? 1 : 0,
      c: [r(c.x * 10) / 10, r(c.y * 10) / 10, r(c.a * 1000) / 1000, r(c.vx), r(c.vy), r(c.steer * 100) / 100, r(c.turboT * 10) / 10, c.turbo, r(c.stun * 10) / 10, c.honkT > 0 ? 1 : 0, r(c.inS * 100) / 100, r(c.inP * 100) / 100],
      tr: G.traffic.map(o => [r(o.x), r(o.y), r(o.a * 100) / 100, o.honk > 0 ? 1 : 0]),
      ch: G.chickens.map(q => [r(q.x), r(q.y), q.st === 'gone' ? 2 : q.st === 'flee' ? 1 : 0]),
      o: G.orders.map(o => [o.id, o.from, o.to, KINDS.indexOf(o.kind), r(o.left * 10) / 10, r(o.max), o.st === 'car' ? 1 : 0, r(o.cond * 100), o.price]),
      cr: G.carried.slice(), st: r(G.stopT * 100), bay: G.bay == null ? -1 : G.bay,
      ev: [G.ev.crash, G.ev.chick, G.ev.train, G.ev.honk, G.ev.turbo, G.ev.pick, G.ev.drop], lp: G.lastPay || 0
    };
  }
  function apply(G, w, keepCar) {
    if (!w || typeof w !== 'object') return;
    const n = v => (Number.isFinite(+v) ? +v : 0);
    G.t = n(w.t); G.left = n(w.l) / 10; G.money = n(w.$); G.served = w.sv | 0; G.failed = w.fl | 0; G.over = !!w.ov;
    if (Array.isArray(w.c)) {
      const c = G.car, a = w.c;
      G.host = { x: n(a[0]), y: n(a[1]), a: n(a[2]), vx: n(a[3]), vy: n(a[4]) };
      if (!keepCar) { c.x = G.host.x; c.y = G.host.y; c.a = G.host.a; c.vx = G.host.vx; c.vy = G.host.vy; }
      c.steerHost = n(a[5]); c.turboT = n(a[6]); c.turbo = a[7] | 0; c.stun = n(a[8]); c.honkT = a[9] ? 0.2 : Math.max(0, c.honkT); c.hostS = n(a[10]); c.hostP = n(a[11]);
    }
    if (Array.isArray(w.tr)) w.tr.forEach((a, i) => { const o = G.traffic[i]; if (!o || !Array.isArray(a)) return; o.nx = n(a[0]); o.ny = n(a[1]); o.na = n(a[2]); o.honk = a[3] ? 0.3 : 0; });
    if (Array.isArray(w.ch)) w.ch.forEach((a, i) => { const q = G.chickens[i]; if (!q || !Array.isArray(a)) return; q.nx = n(a[0]); q.ny = n(a[1]); q.st = a[2] === 2 ? 'gone' : a[2] === 1 ? 'flee' : 'walk'; });
    if (Array.isArray(w.o)) G.orders = w.o.filter(a => Array.isArray(a) && KINDS[a[3]]).slice(0, 6).map(a => ({ id: a[0] | 0, from: String(a[1]).slice(0, 1), to: String(a[2]).slice(0, 1), kind: KINDS[a[3]], left: n(a[4]), max: Math.max(1, n(a[5])), st: a[6] ? 'car' : 'wait', cond: n(a[7]) / 100, price: n(a[8]) }));
    if (Array.isArray(w.cr)) G.carried = w.cr.map(v => v | 0).slice(0, CAP);
    G.stopT = n(w.st) / 100; G.bay = w.bay | 0;
    if (Array.isArray(w.ev)) { const e = w.ev; G.evR = { crash: e[0] | 0, chick: e[1] | 0, train: e[2] | 0, honk: e[3] | 0, turbo: e[4] | 0, pick: e[5] | 0, drop: e[6] | 0 }; }
    G.lastPay = w.lp | 0;
  }
  // guest: glide traffic and chickens; pull the predicted truck toward the host's truck
  function smooth(G) {
    for (const o of G.traffic) if (o.nx != null) {
      if (Math.hypot(o.nx - o.x, o.ny - o.y) > 2 * K) { o.x = o.nx; o.y = o.ny; o.a = o.na; }
      else { o.x += (o.nx - o.x) * 0.3; o.y += (o.ny - o.y) * 0.3; o.a = wrapA(o.a + wrapA(o.na - o.a) * 0.3); }
    }
    for (const q of G.chickens) if (q.nx != null) {
      if (Math.hypot(q.nx - q.x, q.ny - q.y) > 2 * K) { q.x = q.nx; q.y = q.ny; } else { q.x += (q.nx - q.x) * 0.3; q.y += (q.ny - q.y) * 0.3; }
    }
    const h = G.host, c = G.car;
    if (h) {
      const dx = h.x - c.x, dy = h.y - c.y, da = wrapA(h.a - c.a);
      if (Math.hypot(dx, dy) > 1.3 * K || Math.abs(da) > 0.9) { c.x = h.x; c.y = h.y; c.a = h.a; c.vx = h.vx; c.vy = h.vy; }
      else { c.x += dx * 0.12; c.y += dy * 0.12; c.a = wrapA(c.a + da * 0.12); c.vx += (h.vx - c.vx) * 0.12; c.vy += (h.vy - c.vy) * 0.12; }
    }
  }

  return { K, DT, KIND, KINDS, VMAX, TURBO_MAX, CAP, STOP_R, load, step, stepCar, stars, tileAt, drivable, circles, trainRect, gateClosed, onTrackGate, surface,
    encode, apply, smooth, honk, turbo };
})();

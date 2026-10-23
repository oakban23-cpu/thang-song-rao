// A scripted driver (both halves of the truck at once) delivers on every route; used to prove routes are doable and to set the stars.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'drive.js'), 'utf8') + ';this.Drv=Drv;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'rlevels.js'), 'utf8') + ';this.RLEVELS=RLEVELS;', ctx);
const { Drv, RLEVELS } = ctx;
const K = Drv.K;
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function plan(G, from, to) {
  // Dijkstra on tiles; grass and puddles cost more, tiles with traffic cost more
  const W = G.W, H = G.H, key = (x, y) => y * W + x, dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
  const busy = new Set();
  for (const o of G.traffic) for (const a of [0, 1, 2]) { const x = Math.floor((o.x + Math.cos(o.a) * a * K) / K), y = Math.floor((o.y + Math.sin(o.a) * a * K) / K); busy.add(key(x, y)); }
  const cost = (x, y) => { const c = G.tiles[y][x]; return (c === ' ' || c === 'k' ? 3 : c === 'p' ? 2 : c === '=' ? 1.5 : 1) + (busy.has(key(x, y)) ? 6 : 0); };
  const open = [[0, from[0], from[1]]]; dist[key(...from)] = 0;
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [d, x, y] = open.splice(bi, 1)[0];
    if (d > dist[key(x, y)]) continue;
    if (x === to[0] && y === to[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !Drv.drivable(G.tiles[ny][nx])) continue;
      const nd = d + cost(nx, ny);
      if (nd < dist[key(nx, ny)]) { dist[key(nx, ny)] = nd; prev[key(nx, ny)] = key(x, y); open.push([nd, nx, ny]); }
    }
  }
  const out = []; let k = key(...to);
  if (!Number.isFinite(dist[k])) return null;
  while (k !== -1) { out.unshift([k % W, Math.floor(k / W)]); k = prev[k]; }
  return out;
}
function goal(G) {
  const car = G.car;
  const carried = G.carried.map(id => G.orders.find(o => o.id === id)).filter(Boolean);
  const waiting = G.orders.filter(o => o.st === 'wait');
  const spot = k => G.spots.find(s => s.key === k);
  const d = s => Math.hypot(s.x - car.x, s.y - car.y) / K;
  let best = null, bs = -1e9;
  for (const o of carried) { const s = spot(o.to), sc = 100 - d(s) * 2 - o.left * 0.5; if (sc > bs) { bs = sc; best = s; } }
  if (carried.length < Drv.CAP) for (const o of waiting) { const s = spot(o.from), sc = 60 - d(s) * 2 - o.left * 0.4 - (carried.length ? 25 : 0); if (sc > bs) { bs = sc; best = s; } }
  return best;
}
function driver(G) {
  const st = { path: null, replan: 0, stuck: 0, back: 0, target: null };
  return () => {
    const car = G.car, inp = { steer: 0, pedal: 0, horn: false, turbo: false };
    const tgt = goal(G);
    if (!tgt) return inp;
    if (tgt !== st.target) { st.target = tgt; st.replan = 0; }
    st.replan -= 1 / 60;
    const cell = [Math.floor(car.x / K), Math.floor(car.y / K)];
    if (st.replan <= 0 || !st.path) { st.path = plan(G, cell, [tgt.tx, tgt.ty]); st.replan = 0.5; }
    if (!st.path) return inp;
    // trim passed cells
    let ci = 0, bd = 1e9;
    st.path.forEach(([x, y], i) => { const dd = Math.hypot((x + .5) * K - car.x, (y + .5) * K - car.y); if (dd < bd) { bd = dd; ci = i; } });
    const P = st.path.slice(ci);
    const look = P[Math.min(P.length - 1, 2)], lx = (look[0] + .5) * K, ly = (look[1] + .5) * K;
    const fwd = car.vx * Math.cos(car.a) + car.vy * Math.sin(car.a);
    const distGoal = Math.hypot(tgt.x - car.x, tgt.y - car.y);
    let want = Math.atan2((P.length <= 2 ? tgt.y : ly) - car.y, (P.length <= 2 ? tgt.x : lx) - car.x);
    let diff = wrapA(want - car.a);
    // backing up out of a jam
    if (st.back > 0) { st.back -= 1 / 60; inp.pedal = -1; inp.steer = st.backS; return inp; }
    inp.steer = clamp(diff * 2.2, -1, 1);
    // speed plan: slow for corners and the bay
    let turn = 0;
    for (let i = 1; i + 1 < Math.min(P.length, 5); i++) { const a1 = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), a2 = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); if (Math.abs(wrapA(a2 - a1)) > 0.5) { turn = Math.max(turn, 1 / i); } }
    let vt = 6 * K;
    if (turn) vt = Math.min(vt, (1.6 + 2.2 * (1 - turn)) * K);
    if (Math.abs(diff) > 0.7) vt = Math.min(vt, 1.8 * K);
    if (distGoal < 3 * K) vt = Math.min(vt, Math.max(0.2 * K, (distGoal / K - 0.15) * 1.4 * K));
    if (G.rain) vt *= 0.8;
    // traffic, trains, chickens ahead
    const d = { x: Math.cos(car.a), y: Math.sin(car.a) };
    let jam = false;
    for (const o of G.traffic) { const rx = o.x - car.x, ry = o.y - car.y, al = rx * d.x + ry * d.y, lat = Math.abs(-rx * d.y + ry * d.x); if (al > 0 && al < 1.8 * K && lat < 0.6 * K) { vt = Math.min(vt, Math.max(0, (al / K - 0.9)) * 2 * K); jam = true; } }
    st.jam = jam && Math.abs(fwd) < 0.4 * K ? (st.jam || 0) + 1 / 60 : 0;
    if (st.jam > 1) { st.jam = 0; st.back = 0.9; st.backS = (G.rand() < 0.5 ? -1 : 1); st.replan = 0; return inp; }
    for (const ahead of [0.8, 1.4, 2.0]) { const ax = car.x + d.x * ahead * K, ay = car.y + d.y * ahead * K; if (!Drv.onTrackGate(G, car.x, car.y) && Drv.onTrackGate(G, ax, ay)) vt = Math.min(vt, Math.max(0, ahead - 1.2) * K); }
    for (const c of G.chickens) if (c.st !== 'gone' && Math.hypot(c.x - car.x - d.x * K, c.y - car.y - d.y * K) < 1.6 * K) { inp.horn = true; vt = Math.min(vt, 2 * K); }
    inp.pedal = clamp((vt - fwd) / (1.2 * K), -1, 1);
    if (vt < 0.3 * K && fwd < 0.5 * K && distGoal < Drv.STOP_R) inp.pedal = fwd > 0.05 * K ? -0.5 : 0;
    // turbo on long straights
    if (!turn && P.length > 7 && fwd > 4 * K && Math.abs(diff) < 0.15 && car.turbo > 1 && !G.traffic.some(o => Math.hypot(o.x - car.x, o.y - car.y) < 5 * K)) inp.turbo = true;
    // stuck?
    if (Math.abs(fwd) < 0.3 * K && vt > 1 * K) st.stuck += 1 / 60; else st.stuck = 0;
    if (st.stuck > 1.2) { st.stuck = 0; st.back = 0.8; st.backS = -inp.steer || 1; st.replan = 0; }
    return inp;
  };
}
function playDrive(def, opt = {}) {
  const G = Drv.load(def), drive = driver(G);
  const stats = { crash: 0, chicken: 0, train: 0, pick: 0, drop: 0, expire: 0, honk: 0, turbo: 0 };
  for (let f = 0; f < 60 * (def.time + 2) && !G.over; f++) {
    const inp = opt.idle ? {} : drive();
    const ev = Drv.step(G, inp);
    for (const e of ev) { const k = e.split(':')[0]; if (stats[k] != null) stats[k]++; }
    if (opt.trace && f % 300 === 0) console.log('   t', (f / 60).toFixed(0), '฿', G.money, 'car', (G.car.x / K).toFixed(1), (G.car.y / K).toFixed(1), 'v', (Math.hypot(G.car.vx, G.car.vy) / K).toFixed(1), 'orders', G.orders.map(o => o.from + o.to + o.st[0] + Math.round(o.left)).join(' '), 'carried', G.carried.join(','));
  }
  return { money: G.money, served: G.served, failed: G.failed, stars: Drv.stars(G), stats };
}
module.exports = { playDrive, Drv, RLEVELS, plan };
if (require.main === module) {
  let fails = 0;
  const only = process.argv.find(a => a.startsWith('--lvl='));
  RLEVELS.forEach((def, i) => {
    if (only && +only.slice(6) !== i + 1) return;
    const r = playDrive(def, { trace: process.argv.includes('-v') });
    const z = playDrive(def, { idle: true });
    const ok = r.stars === 3 && r.served >= 6 && z.stars === 0;
    console.log(`${ok ? 'PASS' : 'FAIL'} เส้นทาง ${i + 1} ${def.name} ฿${r.money} served ${r.served} failed ${r.failed} stars ${r.stars}/3 thresholds ${def.stars.join('/')} ${JSON.stringify(r.stats)} | parked: ฿${z.money}`);
    if (!ok) fails++;
  });
  console.log(fails ? fails + ' FAILED' : 'DRIVERS OK');
  process.exit(fails ? 1 : 0);
}

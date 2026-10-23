// Two scripted chefs play a kitchen; used to prove every dish is servable and to calibrate stars.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'kitchen.js'), 'utf8') + ';this.Kit=Kit;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'klevels.js'), 'utf8') + ';this.KLEVELS=KLEVELS;', ctx);
const { Kit, KLEVELS } = ctx;
const K = Kit.K, GW = Kit.GW, GH = Kit.GH;
const FLOORC = '.12';

/* ---------- map knowledge ---------- */
function aligned(G) { const B = G.boat; return !B || (B.ph === 'hold' && Math.abs(B.off - Math.round(B.off)) < 1e-6); }
function walk(G) {
  const w = [];
  for (let y = 0; y < GH; y++) { w.push([]); for (let x = 0; x < GW; x++) w[y].push(FLOORC.includes(G.tiles[y][x].t)); }
  const B = G.boat;
  if (B) {
    for (let y = 0; y < GH; y++) for (let x = B.x0; x < B.x0 + B.w; x++) w[y][x] = false;
    if (aligned(G)) {
      const top = B.base + Math.round(B.off);
      for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (FLOORC.includes(B.tiles[y][x].t) && w[top + y]) w[top + y][B.x0 + x] = true;
    }
  }
  return w;
}
function cellOfTile(G, t) {
  if (!t.boat) return [t.x, t.y];
  if (!aligned(G)) return null;
  const B = G.boat; return [B.x0 + t.x, B.base + Math.round(B.off) + t.y];
}
const cellOf = p => [Math.floor(p.x / K), Math.floor(p.y / K)];
const CACHE = { frame: -1, bfs: new Map(), walk: null, stands: new Map(), align: null };
function frameKey(G) {
  const a = G.boat ? (aligned(G) ? Math.round(G.boat.off) : 'm') : 0;
  if (CACHE.frame !== G.t) { CACHE.frame = G.t; CACHE.bfs.clear(); CACHE.walk = null; }
  if (CACHE.align !== a) { CACHE.align = a; CACHE.stands.clear(); }
}
function bfs(G, from, blocked) {
  frameKey(G);
  const ck = from.join(',') + '|' + (blocked ? blocked.join(',') : '');
  if (CACHE.bfs.has(ck)) return CACHE.bfs.get(ck);
  const r = bfsRaw(G, from, blocked);
  CACHE.bfs.set(ck, r);
  return r;
}
function bfsRaw(G, from, blocked) {
  const w = CACHE.walk || (CACHE.walk = walk(G)), dist = new Map(), prev = new Map(), key = (x, y) => y * 100 + x;
  const q = [from]; dist.set(key(...from), 0);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (ny < 0 || ny >= GH || nx < 0 || nx >= GW || !w[ny][nx] || dist.has(k)) continue;
      if (blocked && blocked[0] === nx && blocked[1] === ny) continue;
      dist.set(k, dist.get(key(x, y)) + 1); prev.set(k, [x, y]); q.push([nx, ny]);
    }
  }
  return { dist, prev, key, w };
}
// stand cells + facing from which the player's front point hits tile t (or, with sprayHit, from which a spray reaches it)
function stands(G, t, w, spray) {
  frameKey(G);
  const ck = (spray ? 's' : 'a') + Kit.refOf(t);
  if (CACHE.stands.has(ck)) return CACHE.stands.get(ck);
  const out = standsRaw(G, t, w, spray);
  CACHE.stands.set(ck, out);
  return out;
}
function standsRaw(G, t, w, spray) {
  const out = [];
  const c = cellOfTile(G, t);
  if (!c) return out;
  for (let y = c[1] - 2; y <= c[1] + 2; y++) for (let x = c[0] - 2; x <= c[0] + 2; x++) {
    if (y < 0 || y >= GH || x < 0 || x >= GW || !w[y][x]) continue;
    for (const [fx, fy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const fake = { x: (x + 0.5) * K, y: (y + 0.5) * K, fx, fy };
      const hit = spray ? Kit.sprayTiles(G, fake).includes(t) : Kit.target(G, fake) === t;
      if (hit) out.push([x, y, fx, fy]);
    }
  }
  return out;
}

/* ---------- bot primitives (generators yield once per frame) ---------- */
function plan(bot, t, spray) {
  const G = bot.G, from = cellOf(bot.p);
  const oc = cellOf(bot.o);
  let r = bfs(G, from, oc);
  let st = stands(G, t, r.w, spray);
  let best = null;
  for (const s of st) { const d = r.dist.get(r.key(s[0], s[1])); if (d != null && (!best || d < best.d)) best = { d, s }; }
  if (!best) {
    r = bfs(G, from, null);
    for (const s of st) { const d = r.dist.get(r.key(s[0], s[1])); if (d != null && (!best || d < best.d)) best = { d, s }; }
  }
  if (!best) return null;
  const cells = [];
  let k = r.key(best.s[0], best.s[1]), cur = [best.s[0], best.s[1]];
  while (r.prev.has(k)) { cells.unshift(cur); cur = r.prev.get(k); k = r.key(cur[0], cur[1]); }
  return { cells, face: [best.s[2], best.s[3]], dist: best.d };
}
function reach(bot, t, spray) { const p = plan(bot, t, spray); return p ? p.dist : null; }
function* goTo(bot, tf, spray) {
  let stuck = 0, lastD = 1e9, none = 0;
  for (;;) {
    const t = typeof tf === 'function' ? tf() : tf;
    if (!t || bot.G.over) { bot.inp = {}; if (bot.G.over || ++none > 180) return null; yield; continue; }
    none = 0;
    if (!aligned(bot.G) && (t.boat || Kit.onBoat(bot.G, bot.p))) { bot.inp = {}; yield; continue; }
    const pl = plan(bot, t, spray);
    if (!pl) { bot.inp = {}; yield; continue; }
    const p = bot.p;
    const goal = pl.cells.length ? pl.cells[pl.cells.length - 1] : cellOf(p);
    const gx = (goal[0] + 0.5) * K, gy = (goal[1] + 0.5) * K;
    if (!pl.cells.length && Math.hypot(p.x - gx, p.y - gy) < 10) {
      if (p.fx === pl.face[0] && p.fy === pl.face[1] && (spray ? Kit.sprayTiles(bot.G, p).includes(t) : Kit.target(bot.G, p) === t)) { bot.inp = {}; return t; }
      bot.inp = { mx: pl.face[0] * 0.5, my: pl.face[1] * 0.5 }; yield; continue;
    }
    const nx = pl.cells.length ? pl.cells[0] : goal;
    const tx = (nx[0] + 0.5) * K, ty = (nx[1] + 0.5) * K, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    const s = d > 20 ? 1 : Math.max(0.35, d / 20);
    bot.inp = { mx: dx / (d || 1) * s, my: dy / (d || 1) * s };
    const dd = pl.dist * K + d;
    if (dd > lastD - 0.5) stuck++; else stuck = 0;
    lastD = dd;
    if (stuck > 90) { bot.inp = { mx: Math.random() * 2 - 1, my: Math.random() * 2 - 1 }; for (let i = 0; i < 12; i++) yield; stuck = 0; lastD = 1e9; continue; }
    yield;
  }
}
function* act(bot, tf) { const t = yield* goTo(bot, tf); if (!t) return null; bot.inp = { act: true }; yield; bot.inp = {}; return t; }
function* useUntil(bot, tf, cond, spray) {
  const t = yield* goTo(bot, tf, spray);
  if (!t) return;
  let n = 0;
  while (!cond() && !bot.G.over && n++ < 900) { bot.inp = { use: true }; yield; }
  bot.inp = {};
}
function* waitUntil(bot, cond, max = 6000) { let n = 0; while (!cond() && !bot.G.over && n++ < max) { bot.inp = {}; yield; } }

/* ---------- world helpers ---------- */
const W = { res: new Map() };
const all = (G, ty, f) => G.list.filter(t => t.t === ty && !t.fire && (!f || f(t)));
function nearest(bot, list, spray) {
  if (!list.length) return null;
  const G = bot.G, r = bfs(G, cellOf(bot.p), null);
  let best = null;
  for (const t of list) {
    for (const s of stands(G, t, r.w, spray)) { const d = r.dist.get(r.key(s[0], s[1])); if (d != null && (!best || d < best.d)) best = { d, t }; }
  }
  return best ? best.t : null;
}
const reserved = (t, bot) => W.res.has(t) && W.res.get(t) !== bot.name;
const reserve = (t, bot) => { if (t) W.res.set(t, bot.name); return t; };
const release = bot => { for (const [t, n] of [...W.res]) if (n === bot.name) W.res.delete(t); };
const freeCounter = (bot, avoid) => nearest(bot, all(bot.G, 'C', t => !t.item && !reserved(t, bot) && !(avoid && avoid(t))));
const crate = (bot, food) => nearest(bot, bot.G.list.filter(t => Kit.CRATE[t.t] === food));
const COOKS = { omelette: ['pan', 'egg'], kaprao: ['pan', 'porkc'], tomyum: ['pot', 'shrimpc'] };
const freeStove = (bot, kind) => nearest(bot, all(bot.G, 'S', t => t.item && t.item.k === kind && t.item.st === 'empty' && !reserved(t, bot)));

function* getPlate(bot) {
  const G = bot.G;
  for (let n = 0; n < 60 * 60; n++) {
    if (G.over) return;
    const P = nearest(bot, all(G, 'P', t => t.plates !== 0));
    if (P) { yield* act(bot, P); if (bot.p.held && bot.p.held.k === 'plate') return; continue; }
    const S = nearest(bot, all(G, 'N', t => t.clean > 0));
    if (S) { yield* act(bot, S); if (bot.p.held) return; continue; }
    const S2 = nearest(bot, all(G, 'N', t => t.dirty > 0));
    if (S2) { yield* useUntil(bot, S2, () => S2.clean > 0); continue; }
    const D = nearest(bot, all(G, 'D', t => t.ret > 0));
    const sink = nearest(bot, all(G, 'N'));
    if (D && sink) { yield* act(bot, D); yield* act(bot, sink); continue; }
    bot.inp = {}; yield;
  }
}
function* putDown(bot) {
  if (!bot.p.held) return;
  const c = freeCounter(bot);
  if (c) yield* act(bot, c);
}
function* fightFire(bot) {
  const G = bot.G;
  const burning = () => G.list.filter(t => t.fire > 0);
  if (!burning().length) return;
  yield* putDown(bot);
  const ext = () => nearest(bot, G.list.filter(t => !t.fire && t.item && t.item.k === 'ext'));
  if (!(bot.p.held && bot.p.held.k === 'ext')) { const e = ext(); if (!e) return; yield* act(bot, e); }
  for (let n = 0; n < 40 && burning().length && !G.over; n++) {
    const f = nearest(bot, burning(), true);
    if (!f) break;
    yield* useUntil(bot, f, () => f.fire <= 0, true);
  }
  yield* putDown(bot);
}
function* cleanBurnt(bot) {
  const G = bot.G;
  const s = nearest(bot, all(G, 'S', t => t.item && t.item.st === 'burnt'));
  if (!s) return false;
  yield* putDown(bot);
  yield* act(bot, s);
  if (!bot.p.held || !Kit.isCook(bot.p.held)) return true;
  yield* act(bot, () => nearest(bot, all(G, 'X')));
  yield* act(bot, () => nearest(bot, all(G, 'S', t => !t.item)) || nearest(bot, all(G, 'C', t => !t.item)));
  return true;
}

/* ---------- solo chef: each cook makes whole orders ---------- */
function claim(G, bot) {
  for (const o of G.orders) if (!W.claims.has(o.id)) { W.claims.set(o.id, bot.name); return o; }
  return null;
}
function* prepIngredient(bot, food) {
  const G = bot.G;
  if (food === 'omelette') { yield* act(bot, () => crate(bot, 'egg')); return; }
  const raw = { kaprao: 'pork', tomyum: 'shrimp', somtam: 'papaya' }[food];
  yield* act(bot, () => crate(bot, raw));
  const b = reserve(nearest(bot, all(G, 'B', t => !t.item && !reserved(t, bot))) || null, bot);
  const board = b || (yield* (function* () { let x = null; while (!x && !G.over) { x = nearest(bot, all(G, 'B', t => !t.item && !reserved(t, bot))); if (!x) { bot.inp = {}; yield; } } return reserve(x, bot); })());
  if (!board) return;
  yield* act(bot, board);
  yield* useUntil(bot, board, () => board.item && board.item.k !== raw);
  yield* act(bot, board);
  W.res.delete(board);
  if (food === 'somtam') {
    let m = null;
    while (!m && !G.over) { m = nearest(bot, all(G, 'M', t => !t.item && !reserved(t, bot))); if (!m) { bot.inp = {}; yield; } }
    if (!m) return;
    reserve(m, bot);
    yield* act(bot, m);
    yield* useUntil(bot, m, () => m.item && m.item.k === 'somtam');
    yield* act(bot, m);
    W.res.delete(m);
  }
}
function* makeOrder(bot, o) {
  const G = bot.G, rec = Kit.RECIPES[o.r];
  const main = rec.find(f => f !== 'rice');
  yield* getPlate(bot);
  if (G.over) return;
  if (rec.includes('rice')) yield* act(bot, () => crate(bot, 'rice'));
  const A = reserve(freeCounter(bot), bot);
  yield* act(bot, A);
  yield* prepIngredient(bot, main);
  if (COOKS[main]) {
    const [kind] = COOKS[main];
    let s = null;
    while (!s && !G.over) { s = freeStove(bot, kind); if (!s) { if (yield* cleanBurnt(bot)) continue; bot.inp = {}; yield; } }
    if (!s) return;
    reserve(s, bot);
    yield* act(bot, s);
    yield* act(bot, A);
    yield* goTo(bot, s);
    yield* waitUntil(bot, () => !s.item || s.item.st !== 'cook');
    yield* act(bot, s);
    W.res.delete(s);
  } else {
    yield* act(bot, A);
    yield* act(bot, A);
  }
  W.res.delete(A);
  if (bot.p.held && bot.p.held.k === 'plate') yield* act(bot, () => nearest(bot, all(G, 'W')));
  if (bot.p.held && bot.p.held.k === 'plate') { yield* act(bot, () => nearest(bot, all(G, 'X'))); yield* putDown(bot); }
}
function* soloChef(bot) {
  const G = bot.G;
  for (;;) {
    if (G.over) { bot.inp = {}; yield; continue; }
    if (G.list.some(t => t.fire > 0) && (!W.fireman || W.fireman === bot.name)) { W.fireman = bot.name; yield* fightFire(bot); W.fireman = null; continue; }
    if (yield* cleanBurnt(bot)) continue;
    const o = claim(G, bot);
    if (!o) { bot.inp = {}; yield; continue; }
    yield* makeOrder(bot, o);
    W.claims.delete(o.id);
    release(bot);
  }
}

/* ---------- split kitchen: one preps, the other cooks and serves ---------- */
const PASS = { key: null, list: [], spot: null };
function passCounters(G, a, b) {
  if (PASS.spot) return G.list.filter(t => t.t === 'C' && PASS.spot(t));
  const k = G.t + '|' + CACHE.align;
  if (PASS.key === k) return PASS.list;
  const ca = cellOf(a.p), cb = cellOf(b.p);
  const ra = bfs(G, ca, null), rb = bfs(G, cb, null);
  const ok = (r, t) => stands(G, t, r.w, false).some(s => r.dist.has(r.key(s[0], s[1])));
  PASS.key = k;
  PASS.list = G.list.filter(t => t.t === 'C' && ok(ra, t) && ok(rb, t));
  return PASS.list;
}
function needs(G) {
  const want = { omelette: 0, kaprao: 0, somtam: 0, tomyum: 0 };
  for (const o of G.orders) for (const f of Kit.RECIPES[o.r]) if (want[f] != null) want[f]++;
  const raw = { egg: 'omelette', porkc: 'kaprao', pork: 'kaprao', somtam: 'somtam', papaya: 'somtam', papayac: 'somtam', shrimpc: 'tomyum', omelette: 'omelette', kaprao: 'kaprao', tomyum: 'tomyum' };
  const have = t => { const it = t && (t.item || t); if (!it) return; if (Kit.isCook(it)) { if (it.f && raw[it.f]) want[raw[it.f]]--; return; } if (it.k === 'plate') { for (const f of it.c) if (want[f] != null) want[f]--; return; } if (raw[it.k]) want[raw[it.k]]--; };
  G.list.forEach(have); have(G.pink.held); have(G.mint.held);
  return want;
}
function* prepRole(bot, other) {
  const G = bot.G;
  for (;;) {
    if (G.over) { bot.inp = {}; yield; continue; }
    if (G.list.some(t => t.fire > 0 && reach(bot, t, true) != null) && !W.fireman) { W.fireman = bot.name; yield* fightFire(bot); W.fireman = null; continue; }
    const want = needs(G);
    const pick = ['kaprao', 'omelette', 'somtam', 'tomyum'].filter(f => want[f] > 0 && (G.def.orders.some(r => Kit.RECIPES[r].includes(f))));
    const spot = () => nearest(bot, passCounters(G, bot, other).filter(t => !t.item && !reserved(t, bot)));
    if (!pick.length || !spot()) { bot.inp = {}; yield; continue; }
    yield* prepIngredient(bot, pick[0]);
    yield* act(bot, spot);
  }
}
function* cookRole(bot, other) {
  const G = bot.G;
  const passes = () => passCounters(G, bot, other);
  const mySide = PASS.side || (() => true);
  const workCounter = () => freeCounter(bot, t => passes().includes(t) || !mySide(t));
  for (;;) {
    if (G.over) { bot.inp = {}; yield; continue; }
    if (G.list.some(t => t.fire > 0) && (!W.fireman || W.fireman === bot.name)) { W.fireman = bot.name; yield* fightFire(bot); W.fireman = null; continue; }
    if (yield* cleanBurnt(bot)) continue;
    // a finished pan or a ready dish on the pass: plate it and serve
    const doneS = nearest(bot, all(G, 'S', t => Kit.doneFood(t.item)));
    const readyPass = nearest(bot, passes().filter(t => t.item && t.item.k === 'somtam'));
    const target = doneS || readyPass;
    if (target) {
      const food = doneS ? doneS.item.f : 'somtam';
      const plate = nearest(bot, all(G, 'C', t => t.item && t.item.k === 'plate' && Kit.canAdd(t.item.c, food) && !passes().includes(t) && mySide(t)));
      if (plate) { yield* act(bot, plate); }
      else { yield* getPlate(bot); const needsRice = Kit.RECIPES[G.orders.find(o => Kit.RECIPES[o.r].includes(food)) ? G.orders.find(o => Kit.RECIPES[o.r].includes(food)).r : 'somtam'].includes('rice'); if (needsRice) yield* act(bot, () => crate(bot, 'rice')); }
      if (doneS && Kit.doneFood(doneS.item)) yield* act(bot, doneS);
      else if (!doneS) { const rp = nearest(bot, passes().filter(t => t.item && t.item.k === 'somtam')); if (rp) { const c = workCounter(); yield* act(bot, c); yield* act(bot, rp); yield* act(bot, c); yield* act(bot, c); } }
      if (bot.p.held && bot.p.held.k === 'plate' && bot.p.held.c.length) yield* act(bot, () => nearest(bot, all(G, 'W')));
      if (bot.p.held && bot.p.held.k === 'plate') { if (bot.p.held.c.length) yield* act(bot, () => nearest(bot, all(G, 'X'))); yield* putDown(bot); }
      continue;
    }
    // raw item on the pass: put it in a free pan/pot
    const rawPass = nearest(bot, passes().filter(t => t.item && ['egg', 'porkc', 'shrimpc'].includes(t.item.k) && freeStove(bot, t.item.k === 'shrimpc' ? 'pot' : 'pan')));
    if (rawPass) { const kind = rawPass.item.k === 'shrimpc' ? 'pot' : 'pan'; yield* act(bot, rawPass); yield* act(bot, () => freeStove(bot, kind)); continue; }
    // prepare a plate with rice while things cook
    const plates = all(G, 'C', t => t.item && t.item.k === 'plate' && mySide(t)).length;
    const riceDish = G.orders.some(o => Kit.RECIPES[o.r].includes('rice'));
    if (plates < 2 && riceDish && workCounter()) { yield* getPlate(bot); yield* act(bot, () => crate(bot, 'rice')); yield* act(bot, workCounter); continue; }
    if (bot.p.held) { yield* putDown(bot); continue; }
    if (PASS.home && !PASS.home(bot)) { const h = nearest(bot, all(G, 'S')); if (h) { yield* goTo(bot, h); continue; } }
    bot.inp = {}; yield;
  }
}

/* ---------- driver ---------- */
const HINTS = {
  'กะเพราด่วน': { spot: t => !t.boat && t.x === 7 && t.y > 0 && t.y < 6, side: t => t.x >= 7 },
  'ตลาดน้ำ': { spot: t => t.boat && t.x === 0, side: t => t.boat, home: bot => Kit.onBoat(bot.G, bot.p) }
};
function playKitchen(def, style, opt = {}) {
  const G = Kit.load(def);
  CACHE.frame = -1; CACHE.align = null; CACHE.stands.clear(); PASS.key = null;
  const h = HINTS[def.name] || {}; PASS.spot = h.spot || null; PASS.side = h.side || null; PASS.home = h.home || null;
  W.res = new Map(); W.claims = new Map(); W.fireman = null;
  const pink = { name: 'pink', G, p: G.pink, o: G.mint, inp: {} }, mint = { name: 'mint', G, p: G.mint, o: G.pink, inp: {} };
  let gp, gm;
  if (style === 'split') { gp = prepRole(pink, mint); gm = cookRole(mint, pink); }
  else { gp = soloChef(pink); gm = soloChef(mint); }
  const stats = { serve: 0, reject: 0, burnt: 0, fire: 0, expire: 0 };
  for (let f = 0; f < 60 * (def.time + 2) && !G.over; f++) {
    if (opt.igniteAt && f === opt.igniteAt * 60) { const s = G.list.filter(t => t.t === 'S'); s[0].fire = 1; s[s.length - 1].fire = 1; stats.ignited = G.t; }
    if (opt.igniteAt && stats.ignited != null && stats.out == null && !G.list.some(t => t.fire > 0)) stats.out = +(G.t - stats.ignited).toFixed(1);
    gp.next(); gm.next();
    const ev = Kit.step(G, { pink: pink.inp, mint: mint.inp });
    for (const e of ev) { const k = e.split(':')[0]; if (stats[k] != null) stats[k]++; }
    if (opt.trace && f % 180 === 0) console.log('   t', (f / 60).toFixed(0), '฿', G.money, 'orders', G.orders.map(o => o.r).join(','), '| pink', cellOf(pink.p).join(','), pink.p.held && pink.p.held.k, '| mint', cellOf(mint.p).join(','), mint.p.held && mint.p.held.k, Kit.onBoat(G, mint.p) ? 'onboat' : '', '| boat', G.boat ? G.boat.off.toFixed(2) + G.boat.ph : '', '| fires', G.list.filter(t => t.fire > 0).map(t => t.x + ',' + t.y).join(' '), 'fm', W.fireman, '| items', G.list.filter(t => t.item && t.t === 'C').map(t => (t.boat ? 'b' : '') + t.x + ',' + t.y + ':' + (t.item.k === 'plate' ? 'plate[' + t.item.c + ']' : t.item.k)).join(' '));
  }
  return { money: G.money, served: G.served, failed: G.failed, stars: Kit.stars(G), stats };
}

module.exports = { playKitchen, Kit, KLEVELS };
if (require.main === module) {
  const styles = { 0: ['solo'], 1: ['split'], 2: ['solo'], 3: ['solo'], 4: ['split'] };
  const only = process.argv.find(a => a.startsWith('--lvl='));
  let fails = 0;
  KLEVELS.forEach((def, i) => {
    if (only && +only.slice(6) !== i + 1) return;
    for (const st of styles[i]) {
      const r = playKitchen(def, st, { trace: process.argv.includes('-v') });
      const okk = r.served >= 6 && r.stars === 3;
      console.log(`${okk ? 'PASS' : 'FAIL'} ครัว ${i + 1} ${def.name} [${st}] ฿${r.money} served ${r.served} failed ${r.failed} stars ${r.stars}/3 thresholds ${def.stars.join('/')} ${JSON.stringify(r.stats)}`);
      if (!okk) fails++;
    }
    if (def.fire) {
      const r = playKitchen(def, styles[i][styles[i].length - 1], { igniteAt: 30 });
      const okf = r.stats.out != null && r.stats.out < 25;
      console.log(`${okf ? 'PASS' : 'FAIL'} ครัว ${i + 1} two stoves set alight at 0:30, out after ${r.stats.out}s, still served ${r.served}`);
      if (!okf) fails++;
    }
  });
  console.log(fails ? fails + ' FAILED' : 'CHEFS OK');
  process.exit(fails ? 1 : 0);
}

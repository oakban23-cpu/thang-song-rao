// Scripted heroes defend every night; used to prove each night is winnable together and hard alone.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'defense.js'), 'utf8') + ';this.Def=Def;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'dlevels.js'), 'utf8') + ';this.DLEVELS=DLEVELS;', ctx);
const { Def, DLEVELS } = ctx;
const K = Def.K, GW = Def.GW, GH = Def.GH;
const SOLID = new Set(['#', 't', '~', 'h', 'T']);
const cellOf = (x, y) => [Math.max(0, Math.min(GW - 1, Math.floor(x / K))), Math.max(0, Math.min(GH - 1, Math.floor(y / K)))];
const free = (G, x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !SOLID.has(G.tiles[y][x].t);

function bfs(G, from) {
  const dist = new Map(), prev = new Map(), key = (x, y) => y * 100 + x, q = [from];
  dist.set(key(...from), 0);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (!free(G, nx, ny) || dist.has(k)) continue;
      dist.set(k, dist.get(key(x, y)) + 1); prev.set(k, [x, y]); q.push([nx, ny]);
    }
  }
  return { dist, prev, key };
}
function nearestFree(G, x, y) {
  const [cx, cy] = cellOf(x, y);
  if (free(G, cx, cy)) return { x, y };
  let best = null, bd = 1e9;
  for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) if (free(G, xx, yy) && G.tiles[yy][xx].t !== 'G') {
    const d = Math.hypot((xx + 0.5) * K - x, (yy + 0.5) * K - y); if (d < bd) { bd = d; best = { x: (xx + 0.5) * K, y: (yy + 0.5) * K }; }
  }
  return best;
}
// steer toward a point along grid paths
function steer(G, p, tx, ty) {
  const t = nearestFree(G, tx, ty); tx = t.x; ty = t.y;
  const from = cellOf(p.x, p.y), to = cellOf(tx, ty);
  let nx = tx, ny = ty;
  if (from[0] !== to[0] || from[1] !== to[1]) {
    const r = bfs(G, from);
    let k = r.key(...to);
    if (r.dist.has(k)) {
      let cur = to, prevC = null;
      while (r.prev.has(r.key(...cur))) { prevC = cur; cur = r.prev.get(r.key(...cur)); }
      if (prevC) { nx = (prevC[0] + 0.5) * K; ny = (prevC[1] + 0.5) * K; }
    }
  }
  const dx = nx - p.x, dy = ny - p.y, d = Math.hypot(dx, dy);
  if (d < 6) return { mx: 0, my: 0 };
  const s = d > 24 ? 1 : d / 24;
  return { mx: dx / d * s, my: dy / d * s };
}
// stand on a free cell next to tile t, facing it
function faceTile(G, p, t) {
  let best = null, bd = 1e9;
  const r = bfs(G, cellOf(p.x, p.y));
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const sx = t.x - dx, sy = t.y - dy;
    if (!free(G, sx, sy)) continue;
    const d = r.dist.get(r.key(sx, sy)); if (d == null) continue;
    if (d < bd) { bd = d; best = { sx, sy, dx, dy }; }
  }
  if (!best) return null;
  const gx = (best.sx + 0.5) * K, gy = (best.sy + 0.5) * K;
  if (Math.hypot(p.x - gx, p.y - gy) > 10) return { inp: steer(G, p, gx, gy), at: false };
  if (Def.target(G, p) !== t) return { inp: { mx: best.dx * 0.4, my: best.dy * 0.4 }, at: false };
  return { inp: { mx: 0, my: 0 }, at: true };
}
function threatHouse(G) {
  let best = null, bw = -1;
  for (const H of G.houses) {
    let w = 0; for (const e of G.en) { const d = Math.hypot(e.x - H.cx, e.y - H.cy) / K; w += (Def.EN[e.k].boss ? 4 : 1) / (1 + d * d * 0.15); }
    if (w > bw) { bw = w; best = H; }
  }
  return best;
}
function guardSpots(G, H, solo) {
  let cx = 0, cy = 0, W = 0;
  for (const e of G.en) { const d = Math.hypot(e.x - H.cx, e.y - H.cy) / K, w = (Def.EN[e.k].boss ? 4 : 1) / (1 + d * d * 0.2); cx += e.x * w; cy += e.y * w; W += w; }
  let dx = 1, dy = 0;
  if (W > 0) { dx = cx / W - H.cx; dy = cy / W - H.cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
  const rad = Math.max(H.rect.w, H.rect.h) / 2 + 1.5 * K;
  const gx = H.cx + dx * rad, gy = H.cy + dy * rad, px = -dy, py = dx, s = solo ? 0 : 1.7 * K;
  return [{ x: gx + px * s, y: gy + py * s }, { x: gx - px * s, y: gy - py * s }];
}
function nearCount(G, p, r) { return G.en.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < r + e.r).length; }
function brain(G, p, o, role, solo) {
  if (p.down) return {};
  const inp = {};
  // revive the partner first
  if (!solo && o.down) {
    if (Math.hypot(o.x - p.x, o.y - p.y) < Def.REVIVE_D * 0.8) return { use: true };
    if (role === 'mint' && p.cd <= 0 && Math.hypot(o.x - p.x, o.y - p.y) < Def.HEAL.r * 0.9) return { act: true };
    return steer(G, p, o.x, o.y);
  }
  // specials
  if (role === 'pink' && p.cd <= 0 && (nearCount(G, p, Def.BURST.r) >= 3 || G.en.some(e => Def.EN[e.k].boss && Math.hypot(e.x - p.x, e.y - p.y) < Def.BURST.r))) inp.act = true;
  if (role === 'mint' && p.cd <= 0 && (p.hp < 55 || (!solo && o.hp < 55 && Math.hypot(o.x - p.x, o.y - p.y) < Def.HEAL.r * 0.9))) inp.act = true;
  const calm = G.ph === 'prep' || G.ph === 'rest' || !G.en.length;
  const H = threatHouse(G);
  // spend coins when it is calm (or the house is in trouble and nobody is near it)
  if (calm || (H && H.hp < H.max * 0.5 && G.en.every(e => Math.hypot(e.x - H.cx, e.y - H.cy) > 3 * K))) {
    const hurt = G.houses.filter(h => h.hp < h.max - 4).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
    let job = null;
    if (hurt && G.coins >= 4 && (role === 'mint' || solo || hurt.hp < hurt.max * 0.6)) job = hurt.tiles[0];
    if (!job) {
      const pads = G.pads.filter(t => t.tw < 3 && G.coins >= Def.TOWER[t.tw + 1].cost).sort((a, b) => a.tw - b.tw || Math.hypot((a.x + .5) * K - p.x, (a.y + .5) * K - p.y) - Math.hypot((b.x + .5) * K - p.x, (b.y + .5) * K - p.y));
      if (pads.length && (role === 'pink' || solo || G.coins >= 60)) job = pads[0];
    }
    if (job) {
      let best = job;
      if (job.t === 'h') { let bd = 1e9; for (const t of job.house.tiles) { const d = Math.hypot((t.x + .5) * K - p.x, (t.y + .5) * K - p.y); if (d < bd) { bd = d; best = t; } } }
      const f = faceTile(G, p, best);
      if (f) { if (f.at) return Object.assign(inp, { use: true }); return Object.assign(inp, f.inp); }
    }
  }
  if (!H) return inp;
  // retreat to the partner when hurt
  if (!solo && p.hp < 30 && !o.down) return Object.assign(inp, steer(G, p, o.x, o.y));
  const boss = G.en.find(e => Def.EN[e.k].boss);
  if (boss && !solo) {
    // sandwich the boss: stand on both sides so the thread runs through it
    const hx = H.cx - boss.x, hy = H.cy - boss.y, l = Math.hypot(hx, hy) || 1, ux = -hy / l, uy = hx / l, off = 2.2 * K;
    const lead = 0.6 * K, bx = boss.x + hx / l * lead, by = boss.y + hy / l * lead;
    const s2 = role === 'pink' ? { x: bx + ux * off, y: by + uy * off } : { x: bx - ux * off, y: by - uy * off };
    return Object.assign(inp, steer(G, p, s2.x, s2.y));
  }
  const spots = guardSpots(G, H, solo);
  const s = role === 'pink' ? spots[0] : spots[1];
  return Object.assign(inp, steer(G, p, s.x, s.y));
}
function playDefense(def, style, opt = {}) {
  const G = Def.load(def);
  const stats = { kill: 0, down: 0, revive: 0, build: 0, upgrade: 0, burst: 0, heal: 0 };
  let inp = { pink: {}, mint: {} };
  // the AFK partner hides in the free cell farthest from every house
  let afk = null, ad = -1;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (free(G, x, y) && G.tiles[y][x].t !== 'G') {
    const d = Math.min(...G.houses.map(H => Math.hypot((x + .5) * K - H.cx, (y + .5) * K - H.cy)));
    if (d > ad) { ad = d; afk = { x: (x + .5) * K, y: (y + .5) * K }; }
  }
  for (let f = 0; f < 60 * 600 && !G.over; f++) {
    if (f % 6 === 0) {
      inp.pink = style === 'idle' ? {} : brain(G, G.pink, G.mint, 'pink', style === 'solo');
      inp.mint = style === 'duo' ? brain(G, G.mint, G.pink, 'mint', false) : style === 'solo' ? steer(G, G.mint, afk.x, afk.y) : {};
    } else { inp.pink = Object.assign({}, inp.pink, { act: false }); inp.mint = Object.assign({}, inp.mint, { act: false }); }
    const ev = Def.step(G, inp);
    for (const e of ev) { const k = e.split(':')[0]; if (stats[k] != null) stats[k]++; }
    if (opt.trace && f % 300 === 0) console.log('   t', (f / 60).toFixed(0), G.ph, 'w', G.wi + 1, 'en', G.en.length, 'houses', G.houses.map(h => h.hp.toFixed(0)).join(','), 'hp', G.pink.hp.toFixed(0) + (G.pink.down ? 'D' : ''), G.mint.hp.toFixed(0) + (G.mint.down ? 'D' : ''), 'coins', G.coins.toFixed(0), 'towers', G.pads.map(t => t.tw).join(''), 'beam', G.beam);
  }
  return { ph: G.ph, why: G.why, t: G.t, stars: Def.stars(G), houses: G.houses.map(h => Math.round(h.hp / h.max * 100)), wave: G.wi + 1, stats };
}
module.exports = { playDefense, Def, DLEVELS };
if (require.main === module) {
  let fails = 0;
  const only = process.argv.find(a => a.startsWith('--lvl='));
  DLEVELS.forEach((def, i) => {
    if (only && +only.slice(6) !== i + 1) return;
    const d = playDefense(def, 'duo', { trace: process.argv.includes('-v') });
    const s = playDefense(def, 'solo'), z = playDefense(def, 'idle');
    const ok = d.stars === 3 && (i === 0 || (s.stars <= 2 && z.stars <= 1));
    console.log(`${ok ? 'PASS' : 'FAIL'} คืน ${i + 1} ${def.name} | duo ${d.ph} ${d.stars}★ house ${d.houses}% ${d.t.toFixed(0)}s ${JSON.stringify(d.stats)} | solo ${s.ph}${s.why ? '(' + s.why + ')' : ''} ${s.stars}★ w${s.wave} house ${s.houses}% | idle ${z.ph}${z.why ? '(' + z.why + ')' : ''} ${z.stars}★ w${z.wave} house ${z.houses}%`);
    if (!ok) fails++;
  });
  console.log(fails ? fails + ' FAILED' : 'DEFENDERS OK');
  process.exit(fails ? 1 : 0);
}

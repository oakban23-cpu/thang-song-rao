// Random play on every adventure level, checking that nothing ends up inside a wall, outside the map or NaN.
// node fuzz.js [seconds-per-run=40] [runs-per-level=12] [filter]
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8') + ';this.Phys=Phys;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'levels.js'), 'utf8') + ';this.A=[LEVELS,LEVELS2,LEVELS3,LEVELS4];', ctx);
const { Phys } = ctx, T = Phys.T, DT = Phys.DT;
const SECS = +process.argv[2] || 40, RUNS = +process.argv[3] || 12, FILTER = process.argv[4] || '';
const ALL = ctx.A.flatMap((a, c) => a.map((l, i) => ({ def: l, tag: `${c + 1}-${i + 1}` })));
let seed = 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

function solidAt(L, x, y, body) {
  if (x < 0 || x >= Phys.COLS || y < 0) return true;
  if (y >= Phys.ROWS) return false;
  const t = L.grid[y][x];
  if (t === '#') return true;
  if (t === 'D') return !L.doorAt[x + '_' + y].open;
  if (t === 'b') return L.bridgeAt[x + '_' + y].on;
  if (t === 'p') return body.kind !== 'pink';
  if (t === 'm') return body.kind !== 'mint';
  if (t === 'r') return !L.crumbleAt[x + '_' + y].gone;
  return false;
}
function inWall(L, b, m = 1.5) {
  const r = { x: b.x + m, y: b.y + m, w: b.w - 2 * m, h: b.h - 2 * m };
  for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.h) / T); y++)
    for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.w) / T); x++)
      if (solidAt(L, x, y, b)) return `${L.grid[y] ? L.grid[y][x] : '?'}@${x},${y}`;
  return null;
}
const ov = (a, b, m) => a.x + m < b.x + b.w && a.x + a.w > b.x + m && a.y + m < b.y + b.h && a.y + a.h > b.y + m;

// a "brain" per player: pick a goal every so often (wander, chase partner, chase a box, hold still, mash jump)
function brain() {
  let mode = 'wander', dir = 0, until = 0, jumpP = 0.02;
  return (W, me, other, k) => {
    if (k >= until) {
      const r = rnd();
      mode = r < 0.35 ? 'wander' : r < 0.55 ? 'partner' : r < 0.7 ? 'box' : r < 0.85 ? 'still' : 'hop';
      dir = rnd() < 0.5 ? -1 : 1; until = k + 30 + Math.floor(rnd() * 200); jumpP = rnd() * 0.06;
    }
    const p = W[me], o = W[other], inp = { left: false, right: false, jump: false, jp: false };
    let d = 0;
    if (mode === 'wander') d = dir;
    else if (mode === 'partner') d = Math.sign(o.x - p.x) * (Math.abs(o.x - p.x) > 4 ? 1 : 0);
    else if (mode === 'box' && W.L.boxes.length) { const b = W.L.boxes[Math.floor((k / 400) % W.L.boxes.length)]; d = Math.sign(b.x + b.w / 2 - p.x - p.w / 2); }
    else if (mode === 'hop') d = dir;
    if (d > 0) inp.right = true; if (d < 0) inp.left = true;
    if (rnd() < (mode === 'hop' ? 0.08 : jumpP)) inp.jp = inp.jump = true;
    if (mode === 'partner' && Math.abs(o.x - p.x) < 20 && rnd() < 0.05) inp.jp = inp.jump = true;
    return inp;
  };
}

const found = new Map();
const report = (tag, what, info) => { const k = tag + ' ' + what; if (!found.has(k)) found.set(k, { n: 0, info }); found.get(k).n++; };
const t0 = Date.now();
for (const lv of ALL) {
  if (FILTER && !lv.tag.startsWith(FILTER)) continue;
  let wins = 0, deaths = {}, steps = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 7919 * (run + 1) + lv.tag.charCodeAt(0) * 31 + lv.tag.charCodeAt(2);
    let W = Phys.load(lv.def);
    const bp = brain(), bm = brain();
    const stuck = { pink: 0, mint: 0 };
    for (let k = 0; k < SECS / DT; k++) {
      const inp = { pink: bp(W, 'pink', 'mint', k), mint: bm(W, 'mint', 'pink', k) };
      let ev;
      try { ev = Phys.step(W, inp); } catch (e) { report(lv.tag, 'exception: ' + e.message, e.stack.split('\n')[1]); W = Phys.load(lv.def); continue; }
      steps++;
      for (const b of [W.pink, W.mint, ...W.L.boxes]) {
        if (![b.x, b.y, b.vx, b.vy].every(Number.isFinite)) report(lv.tag, `NaN on ${b.id || b.k}`, `t=${(k * DT).toFixed(2)}`);
        if (b.x < -1 || b.x + b.w > Phys.VW + 1 || b.y < -40) report(lv.tag, `${b.id || 'box'} outside the map`, `x=${b.x.toFixed(0)} y=${b.y.toFixed(0)}`);
      }
      for (const id of ['pink', 'mint']) {
        const p = W[id], w = inWall(W.L, p);
        if (w) { stuck[id]++; if (stuck[id] === 3) report(lv.tag, `${id} inside wall ${w.split('@')[0]}`, `${w} t=${(k * DT).toFixed(2)} run ${run} pos ${(p.x / T).toFixed(2)},${(p.y / T).toFixed(2)}`); }
        else stuck[id] = 0;
        for (const b of W.L.boxes) if (ov(p, b, 3)) report(lv.tag, `${id} inside a ${b.heavy ? 'stone' : 'box'}`, `t=${(k * DT).toFixed(2)} run ${run} p ${(p.x / T).toFixed(2)},${(p.y / T).toFixed(2)} b ${(b.x / T).toFixed(2)},${(b.y / T).toFixed(2)}`);
      }
      for (const b of W.L.boxes) { const w = inWall(W.L, b, 2); if (w) report(lv.tag, `${b.heavy ? 'stone' : 'box'} inside wall ${w.split('@')[0]}`, `${w} t=${(k * DT).toFixed(2)} run ${run}`); }
      for (let i = 0; i < W.L.boxes.length; i++) for (let j = i + 1; j < W.L.boxes.length; j++) if (ov(W.L.boxes[i], W.L.boxes[j], 3)) report(lv.tag, 'two boxes overlap', `t=${(k * DT).toFixed(2)} run ${run}`);
      if (W.dead) { const c = String(W.dead); deaths[c] = (deaths[c] || 0) + 1; W = Phys.load(lv.def); continue; }
      if (ev.includes('win')) { wins++; W = Phys.load(lv.def); }
    }
  }
  const dd = Object.entries(deaths).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`${lv.tag.padEnd(4)} ${lv.def.name.padEnd(16)} runs ${RUNS}×${SECS}s  wins ${wins}  deaths ${dd || 0}`);
}
console.log('\n--- findings ---');
for (const [k, v] of found) console.log(`${k}  ×${v.n}  (${v.info})`);
console.log(found.size ? `${found.size} kinds of problem` : 'FUZZ CLEAN', `${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(found.size ? 1 : 0);

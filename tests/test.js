const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8') + ';this.Phys=Phys;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'levels.js'), 'utf8') + ';this.LEVELS=LEVELS;', ctx);
const { Phys, LEVELS } = ctx;
const T = 32;
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const idle = () => ({ left: false, right: false, jump: false, jp: false });
function run(W, n, f) {
  for (let k = 0; k < n; k++) {
    const inp = { pink: idle(), mint: idle() };
    if (f) f(inp, k, W);
    Phys.step(W, inp);
    if (W.dead) return { dead: W.dead, k };
  }
  return {};
}
const hold = (who, keys, from = 0, to = 1e9) => (inp, k) => {
  if (k < from || k > to) return;
  for (const key of keys) inp[who][key] = true;
  if (keys.includes('jump') && k === from) inp[who].jp = true;
};
const all = (...fs) => (inp, k, W) => fs.forEach(f => f(inp, k, W));
const place = (p, x, bottom) => { p.x = x; p.y = bottom - p.h; p.vx = p.vy = 0; p.ground = null; };
const far = W => { W.mint.x = W.L.spawn.M.x; W.mint.y = W.L.spawn.M.y; };

// --- map validation
LEVELS.forEach((lv, i) => {
  const rows = lv.map.length === 17 && lv.map.every(r => r.length === 30);
  const s = lv.map.join('');
  const plates = new Set(s.match(/[1-6]/g) || []);
  const needs = new Set([...(s.match(/[A-Fa-f]/g) || [])].map(c => String(c.toUpperCase().charCodeAt(0) - 64)));
  (lv.lifts || []).forEach(l => needs.add(String(l.id)));
  const linked = [...needs].every(id => plates.has(id));
  ok(rows && s.includes('P') && s.includes('M') && s.includes('@') && linked, `level ${i + 1} map shape and links`);
});

function jumpTry(W, p, dir, steps = 90) {
  const k = dir > 0 ? 'right' : 'left';
  return run(W, steps, hold(p.id, [k, 'jump'], 0, steps));
}

// --- L1: single jump reaches 2 tiles, not 3; stacking reaches 3
{
  let W = Phys.load(LEVELS[0]);
  place(W.pink, 19 * T + 2, 512); place(W.mint, 2 * T, 512); run(W, 10);
  jumpTry(W, W.pink, 1, 60); run(W, 30);
  ok(Math.abs(W.pink.y + W.pink.h - 448) < 0.5, 'L1 single jump onto 2-tile platform');

  W = Phys.load(LEVELS[0]);
  place(W.pink, 7 * T + 2, 512); place(W.mint, 10 * T, 512); run(W, 10);
  jumpTry(W, W.pink, -1, 60); run(W, 30);
  ok(Math.abs(W.pink.y + W.pink.h - 416) > 1, 'L1 single jump cannot reach 3-tile platform');

  W = Phys.load(LEVELS[0]);
  place(W.mint, 7 * T + 4, 512); run(W, 10);
  place(W.pink, 7 * T + 4, W.mint.y - 1); run(W, 20);
  ok(W.pink.ground && W.pink.ground.type === 'player', 'L1 pink stands on mint head');
  jumpTry(W, W.pink, -1, 45); run(W, 40);
  ok(Math.abs(W.pink.y + W.pink.h - 416) < 0.5, 'L1 stacked jump reaches 3-tile platform');
}

// --- L2: stack from step onto upper floor; solo cannot
{
  let W = Phys.load(LEVELS[1]);
  place(W.mint, 11 * T - Phys.PW, 480); run(W, 10);
  place(W.pink, W.mint.x, W.mint.y - 1); run(W, 20);
  jumpTry(W, W.pink, 1, 60); run(W, 40);
  ok(Math.abs(W.pink.y + W.pink.h - 384) < 0.5, 'L2 stacked jump from step lands on upper floor');

  W = Phys.load(LEVELS[1]);
  place(W.pink, 11 * T - Phys.PW, 480); far(W); run(W, 10);
  jumpTry(W, W.pink, 1, 60); run(W, 40);
  ok(W.pink.y + W.pink.h > 400, 'L2 solo from step cannot reach upper floor');

  // plate opens door, partner walks through corridor to exit
  W = Phys.load(LEVELS[1]);
  place(W.pink, 19 * T + 5, 384); place(W.mint, 11 * T - Phys.PW - 2, 480); run(W, 10);
  let jumped = false;
  const r = run(W, 600, (inp, k, W) => { inp.mint.right = true; if (!jumped && W.mint.ground && W.mint.x > 15.4 * T) { jumped = true; inp.mint.jp = inp.mint.jump = true; } });
  ok(!r.dead && W.mint.x > 24 * T, 'L2 mint passes open door A and crosses corridor');
}

// --- L3: mint stacks on pink to reach light bridge, walks the tunnel; solo cannot
{
  let W = Phys.load(LEVELS[2]);
  place(W.pink, 8 * T - Phys.PW - 1, 448); run(W, 10);
  place(W.mint, W.pink.x, W.pink.y - 1); run(W, 20);
  jumpTry(W, W.mint, 1, 60);
  const r = run(W, 600, hold('mint', ['right']));
  ok(!r.dead && W.mint.x > 20 * T && Math.abs(W.mint.y + W.mint.h - 448) < 0.5, 'L3 mint crosses on pink-gate bridge via tunnel to right side');

  W = Phys.load(LEVELS[2]);
  place(W.mint, 8 * T - Phys.PW - 1, 448); place(W.pink, 2 * T, 448); run(W, 10);
  jumpTry(W, W.mint, 1, 60); run(W, 60);
  ok(W.mint.y + W.mint.h > 400, 'L3 mint alone cannot reach light bridge');

  W = Phys.load(LEVELS[2]);
  place(W.pink, 23 * T + 2, 448); place(W.mint, 21 * T + 5, 448); run(W, 10);
  jumpTry(W, W.pink, 1, 60); run(W, 120, hold('pink', ['right']));
  ok(W.pink.x > 25 * T, 'L3 pink enters room through pink gate');
  const plate1 = W.L.plates.find(p => p.id === 1);
  ok(plate1.down && W.L.bridges.every(b => b.on), 'L3 mint on plate 1 shows bridge');

  W = Phys.load(LEVELS[2]);
  place(W.mint, 23 * T + 2, 448); place(W.pink, 2 * T, 448); run(W, 10);
  jumpTry(W, W.mint, 1, 60); run(W, 120, hold('mint', ['right']));
  ok(W.mint.x < 24 * T, 'L3 mint blocked by pink gate');
}

// --- L4: light box pushes solo, heavy needs both; box + stack clears wall
{
  let W = Phys.load(LEVELS[3]);
  const box = W.L.boxes.find(b => !b.heavy), stone = W.L.boxes.find(b => b.heavy);
  place(W.pink, box.x - Phys.PW - 3, 512); far(W); run(W, 10);
  const bx = box.x; run(W, 120, hold('pink', ['right']));
  ok(box.x > bx + 20, 'L4 one player pushes light box');

  place(W.pink, stone.x - Phys.PW - 3, 480); run(W, 10);
  const sx = stone.x; run(W, 120, hold('pink', ['right']));
  ok(Math.abs(stone.x - sx) < 0.5, 'L4 one player cannot push heavy stone');
  place(W.mint, stone.x - Phys.PW - 3, 480); run(W, 10);
  run(W, 120, all(hold('pink', ['right']), hold('mint', ['right'])));
  ok(stone.x > sx + 20, 'L4 two players push heavy stone');
  run(W, 480, all(hold('pink', ['right']), hold('mint', ['right'])));
  const p2 = W.L.plates.find(p => p.id === 2);
  ok(p2.down && W.L.doors.filter(d => d.id === 2).every(d => d.open) && Math.abs(stone.y + stone.h - 512) < 0.5, 'L4 stone drops into notch on plate 2 and opens door B');
  let won = false;
  for (let k = 0; k < 900 && !won; k++) {
    const inp = { pink: idle(), mint: idle() };
    for (const p of [W.pink, W.mint]) { inp[p.id].right = p.x < 26.3 * T; inp[p.id].left = p.x > 26.9 * T; }
    if (Phys.step(W, inp).includes('win')) won = true;
  }
  if (!won) console.log('  pos', W.pink.x.toFixed(1), (W.pink.y+W.pink.h).toFixed(1), W.mint.x.toFixed(1), (W.mint.y+W.mint.h).toFixed(1), 'stone', stone.x.toFixed(1), (stone.y+stone.h).toFixed(1), 'doors', W.L.doors.map(d=>d.id+':'+d.open).join(' '));
  ok(won, 'L4 both walk over the stone through door B to the exit');

  W = Phys.load(LEVELS[3]);
  const b2 = W.L.boxes.find(b => !b.heavy);
  b2.x = 12 * T - b2.w; run(W, 10);
  place(W.mint, b2.x + 4, 480); run(W, 10);
  place(W.pink, W.mint.x, W.mint.y - 1); run(W, 20);
  jumpTry(W, W.pink, 1, 60); run(W, 60, hold('pink', ['right']));
  ok(W.pink.x > 12 * T, 'L4 box + stack gets over the 4-tile wall');

  W = Phys.load(LEVELS[3]);
  place(W.mint, 12 * T - Phys.PW, 512); run(W, 10);
  place(W.pink, W.mint.x, W.mint.y - 1); run(W, 20);
  jumpTry(W, W.pink, 1, 60); run(W, 60, hold('pink', ['right']));
  ok(W.pink.x < 12 * T, 'L4 stack without box cannot clear 4-tile wall');
}

// --- L5: lift carries rider when partner holds plate
{
  const W = Phys.load(LEVELS[4]);
  place(W.pink, 12 * T + 20, 448); run(W, 10);
  ok(W.pink.ground && W.pink.ground.type === 'lift', 'L5 pink stands on lift');
  place(W.mint, 2 * T + 5, 448);
  run(W, 360);
  ok(Math.abs(W.pink.y + W.pink.h - 224) < 0.5, 'L5 lift raises pink to top floor');
  run(W, 120, hold('pink', ['right']));
  ok(W.pink.x > 14 * T && Math.abs(W.pink.y + W.pink.h - 224) < 0.5, 'L5 pink steps onto top floor');
  run(W, 240, all(hold('pink', ['right']), (inp, k) => { if (k === 60) { inp.pink.jp = true; inp.pink.jump = true; } }));
  ok(W.pink.x > 21 * T, 'L5 pink enters the pink room');
}

// --- L6: pink climbs ledges to the upper corridor
{
  const W = Phys.load(LEVELS[5]);
  place(W.pink, 1 * T + 5, 512); run(W, 10);
  jumpTry(W, W.pink, 0, 1); run(W, 60);
  const a = Math.abs(W.pink.y + W.pink.h - 448) < 0.5;
  run(W, 70, all(hold('pink', ['right'], 0, 40), (inp, k) => { if (k === 0) { inp.pink.jp = true; inp.pink.jump = true; } }));
  run(W, 30);
  const b = Math.abs(W.pink.y + W.pink.h - 384) < 0.5;
  run(W, 70, all(hold('pink', ['left'], 0, 20), (inp, k) => { if (k === 0) { inp.pink.jp = true; inp.pink.jump = true; } }));
  run(W, 30);
  const c = Math.abs(W.pink.y + W.pink.h - 320) < 0.5;
  run(W, 200, hold('pink', ['right']));
  ok(a && b && c && W.pink.x > 7 * T, `L6 pink climbs to upper corridor (${a},${b},${c},${(W.pink.x / T).toFixed(1)})`);
}

// --- L7: riding across light bridges
{
  const W = Phys.load(LEVELS[6]);
  place(W.mint, 12 * T, 448); run(W, 10);
  place(W.pink, W.mint.x, W.mint.y - 1); run(W, 20);
  let r = run(W, 600, (inp, k, W) => { if (W.mint.x < 20 * T + 4) inp.mint.right = true; });
  ok(!r.dead && W.pink.ground && W.pink.ground.type === 'player' && W.mint.x >= 20 * T, 'L7 pink rides mint across pink bridge');
  place(W.mint, W.pink.x, W.pink.y - 1); W.pink.ground = { type: 'tile' };
  run(W, 30);
  const pinkX = W.pink.x;
  place(W.pink, 20 * T + 4, 448); run(W, 10);
  place(W.mint, W.pink.x, W.pink.y - 1); run(W, 20);
  r = run(W, 600, (inp, k, W) => { if (W.pink.x < 27 * T + 4) inp.pink.right = true; });
  ok(!r.dead && W.mint.ground && W.mint.ground.type === 'player' && W.pink.x >= 27 * T, 'L7 mint rides pink across mint bridge');
  const W2 = Phys.load(LEVELS[6]);
  place(W2.pink, 12 * T, 448); far(W2); run(W2, 10);
  r = run(W2, 300, hold('pink', ['right']));
  ok(r.dead === 'pink', 'L7 pink alone falls through pink bridge');
  const W3 = Phys.load(LEVELS[6]);
  const st = W3.L.boxes[0];
  st.x = 10 * T - st.w; run(W3, 10);
  place(W3.mint, st.x + 4, 480); run(W3, 10);
  place(W3.pink, W3.mint.x, W3.mint.y - 1); run(W3, 20);
  jumpTry(W3, W3.pink, 1, 60); run(W3, 60, hold('pink', ['right']));
  ok(W3.pink.x > 10 * T, 'L7 stone + stack clears the wall');
}

console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

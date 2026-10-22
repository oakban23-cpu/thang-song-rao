// Chapter 3 shortcuts that must NOT work.
const B = require('./bot.js');
const { Phys, LEVELS3, T, idle, go, hold, jump, hopTo, until, wait, par, cx } = B;
const { act } = require('./bot3.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const L3 = n => LEVELS3.find(l => l.name === n);
const feet = p => p.y + p.h;
const place = (p, x, bottom) => { p.x = x; p.y = bottom - p.h; p.vx = p.vy = 0; p.ground = null; };
const settle = (W, n = 20) => { for (let i = 0; i < n; i++) Phys.step(W, { pink: idle(), mint: idle() }); };
function runPlan(W, plan, max = 6000) {
  let i = 0, k = 0;
  for (let t = 0; t < max; t++) {
    if (i >= plan.length) return { done: true };
    const inp = { pink: idle(), mint: idle() };
    if (plan[i].fn(W, inp, k)) { i++; k = 0; continue; }
    const ev = Phys.step(W, inp); k++;
    if (W.dead) return { dead: W.dead };
    if (ev.includes('win')) return { win: true };
    if (k > (plan[i].timeout || 900)) return { timeout: plan[i].name };
  }
  return { timeout: 'max' };
}
const holdFor = (who, dir, n) => ({ name: `hold ${who} ${dir} ${n}`, timeout: n + 5, fn(W, inp, k) { if (k >= n) return true; for (const w of [].concat(who)) { if (dir > 0) inp[w].right = true; if (dir < 0) inp[w].left = true; } return false; } });

// 3-1 ด้ายแดง
{ const W = Phys.load(L3('ด้ายแดง'));
  runPlan(W, [holdFor('mint', 1, 400)]);
  ok(cx(W.mint) < 9 * T && cx(W.mint) - cx(W.pink) <= 4 * T + 1, `3-1 mint cannot leave pink behind (mint at ${(cx(W.mint) / T).toFixed(2)})`); }
{ const W = Phys.load(L3('ด้ายแดง'));
  const r = runPlan(W, [holdFor('pink', 1, 500)]);
  ok(!r.dead && !(W.pink.ground && cx(W.pink) > 12 * T), '3-1 pink alone dangles but cannot cross'); }
{ const W = Phys.load(L3('ด้ายแดง'));
  place(W.mint, 3.5 * T - 11, 288); settle(W); place(W.pink, W.mint.x, W.mint.y - 1); settle(W);
  runPlan(W, [holdFor('mint', 1, 300), wait(60)]);
  ok(!(W.pink.ground && W.pink.ground.type === 'player' && cx(W.pink) > 6 * T), '3-1 pink cannot ride through the low tunnel'); }
{ const W = Phys.load(L3('ด้ายแดง'));
  runPlan(W, [holdFor('pink', 1, 160), wait(240)]);
  ok(W.mint.ground && feet(W.mint) === 288 && cx(W.mint) < 5 * T, '3-1 a dangling partner does not drag the anchor off the edge'); }

// 3-2 คนละชั้น
{ const W = Phys.load(L3('คนละชั้น'));
  place(W.pink, 9 * T, 416); settle(W);
  const r = runPlan(W, [holdFor('mint', 1, 600)]);
  ok(r.dead === 'mint' || !(W.mint.ground && cx(W.mint) > 15 * T), '3-2 with both downstairs the pit cannot be crossed'); }
{ const W = Phys.load(L3('คนละชั้น'));
  place(W.mint, 9.2 * T, 416); place(W.pink, 9.5 * T, 320); settle(W);
  runPlan(W, [jump('mint', 1), wait(60)]);
  ok(!(W.mint.ground && cx(W.mint) > 15 * T), '3-2 the pit is too wide to jump'); }
{ const W = Phys.load(L3('คนละชั้น'));
  place(W.mint, 2.5 * T, 416); settle(W);
  runPlan(W, [go('pink', 4.5), jump('pink', 1), wait(60)]);
  ok(feet(W.pink) > 330, '3-2 the upper floor cannot be reached without a boost'); }

// 3-3 ระฆังเงา
{ const W = Phys.load(L3('ระฆังเงา'));
  place(W.pink, 8.5 * T - 11, 320); place(W.mint, 15 * T, 416); settle(W, 40);
  ok(W.L.doors.every(d => d.open), '3-3 plate opens the door');
  runPlan(W, [holdFor('pink', 1, 360)]);
  ok(!W.L.doors.every(d => d.open) && cx(W.pink) < 16 * T, '3-3 plate holder cannot reach the door before it shuts'); }

// 3-4 ตึกสามชั้น: one ghost only lets one player up
{ const W = Phys.load(L3('ตึกสามชั้น'));
  const r = runPlan(W, [go('mint', 13.0), go('mint', 17.5), until('ghost', W => W.L.ghost.mint && W.L.ghost.mint.i >= W.L.ghost.mint.path.length - 1, 1500),
    go('mint', 15), go('pink', 17.5, { hop: false }), jump('pink', 0), until('pink on ghost', W => W.pink.ground && W.pink.ground.type === 'ghost'),
    go('mint', 16.6, { hop: false }), hopTo('mint', W => cx(W.pink)), until('mint on pink', W => W.mint.ground && W.mint.ground.type === 'player'),
    jump('mint', 1), wait(60), jump('pink', 1), wait(60), jump('pink', 1), wait(60)]);
  ok(W.mint.ground && feet(W.mint) === 288, '3-4 a stack of ghost + both players gets the top player up');
  ok(feet(W.pink) > 300, '3-4 but the other player cannot follow from a single ghost'); }
{ const W = Phys.load(L3('ตึกสามชั้น'));
  place(W.mint, 17.4 * T - 11, 416); settle(W); place(W.pink, W.mint.x, W.mint.y - 1); settle(W);
  runPlan(W, [jump('pink', 1), wait(60)]);
  ok(feet(W.pink) > 300, '3-4 stacking without ghosts is not enough'); }

// 3-5 สลับร่าง
{ const W = Phys.load(L3('สลับร่าง'));
  const r = runPlan(W, [holdFor('pink', 1, 400)]);
  ok(r.dead === 'pink', '3-5 pink falls through the pink light'); }
{ const W = Phys.load(L3('สลับร่าง'));
  place(W.mint, 6 * T - 11, 384); settle(W); place(W.pink, W.mint.x, W.mint.y - 1); settle(W);
  const r = runPlan(W, [holdFor('mint', 1, 300), wait(90)]);
  ok(r.dead === 'pink' || !(cx(W.pink) > 15 * T && W.pink.ground), '3-5 pink cannot ride across the low tunnel'); }

// 3-6 ถ้ำมืด
{ const W = Phys.load(L3('ถ้ำมืด'));
  runPlan(W, [go('pink', 7.3), jump('pink', 1), wait(30), holdFor('pink', 1, 400)]);
  ok(cx(W.pink) < 13 * T + 1, '3-6 pink is blocked by the mint light'); }
{ const W = Phys.load(L3('ถ้ำมืด'));
  place(W.mint, 21 * T, 416); settle(W);
  runPlan(W, [holdFor('mint', 1, 300)]);
  ok(cx(W.mint) < 22 * T + 1 && !W.L.tog[1] && !W.L.tog[2], '3-6 mint cannot reach the switches'); }
{ const W = Phys.load(L3('ถ้ำมืด'));
  place(W.pink, 8.5 * T - 11, 512); settle(W);
  runPlan(W, [jump('pink', 1), wait(40), jump('pink', -1), wait(40), jump('pink', 1), wait(40)]);
  ok(feet(W.pink) > 420, '3-6 the pit cannot be climbed without the step'); }
{ const W = Phys.load(L3('ถ้ำมืด'));
  place(W.mint, 8.5 * T - 11, 512); place(W.pink, 12 * T, 416); settle(W, 40);
  ok(W.L.doors.every(d => d.open), '3-6 a body on the plate opens the door');
  runPlan(W, [holdFor('pink', 1, 400)]);
  ok(cx(W.pink) < 13 * T + 1, '3-6 but pink still cannot get past the mint light'); }

console.log(fails ? fails + ' FAILED' : 'NO SHORTCUTS');
process.exit(fails ? 1 : 0);

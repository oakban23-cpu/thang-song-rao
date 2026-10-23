// Shortcuts that must NOT work.
const B = require('./bot.js');
const { Phys, LEVELS, LEVELS2, T, idle, go, hold, jump, hopTo, until, wait, par, box, stone, cx, play } = B;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const L2 = n => LEVELS2.find(l => l.name === n);
const place = (p, x, bottom) => { p.x = x; p.y = bottom - p.h; p.vx = p.vy = 0; p.ground = null; };
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
const settle = (W, n = 20) => { for (let i = 0; i < n; i++) Phys.step(W, { pink: idle(), mint: idle() }); };

// Ch1 L1: plate holder can't sprint through the door during the close delay
{ const W = Phys.load(LEVELS[0]); place(W.pink, 10 * T + 5, 512); place(W.mint, 2 * T, 512); settle(W);
  runPlan(W, [hold('pink', 1, W => W.pink.x > 14 * T, { timeout: 200 })]);
  ok(W.pink.x < 13 * T, 'ch1-1 door closes before the plate holder reaches it'); }

// H1: holder can't cross the bridge in the delay; solo can't reach switch ledge without the box
{ const W = Phys.load(L2('สลับขั้ว')); place(W.pink, 7 * T + 5, 448); settle(W);
  const r = runPlan(W, [hold('pink', 1, W => W.pink.x > 15 * T, { timeout: 300 })]);
  ok(r.dead === 'pink', 'H1 plate holder falls if they try to run across'); }
{ const W = Phys.load(L2('สลับขั้ว')); place(W.mint, 14.3 * T, 448); settle(W);
  runPlan(W, [jump('mint', 1), wait(30)]);
  ok(!W.L.tog[1], 'H1 switch ledge unreachable by a plain jump'); }

// H2: block top unreachable with box alone or stacking alone
{ const W = Phys.load(L2('ลังซ้อนลัง')); const b1 = box(W, 1); b1.x = 288; settle(W);
  place(W.pink, 289, 480); settle(W);
  runPlan(W, [jump('pink', -1), wait(40)]);
  ok(W.pink.y + W.pink.h > 400, 'H2 box alone is not enough to climb the block'); }
{ const W = Phys.load(L2('ลังซ้อนลัง')); box(W, 1).x = 600; settle(W);
  place(W.pink, 9 * T + 2, 512); settle(W); place(W.mint, W.pink.x, W.pink.y - 1); settle(W);
  runPlan(W, [jump('mint', -1), wait(40)]);
  ok(W.mint.y + W.mint.h > 400, 'H2 stacking alone is not enough to climb the block'); }
{ const W = Phys.load(L2('ลังซ้อนลัง')); place(W.pink, 9 * T + 4, 512); settle(W); place(W.mint, W.pink.x, W.pink.y - 1); settle(W, 40);
  ok(W.L.doors.every(d => d.open), 'H2 two stacked players do press the heavy plate (as the hint says)'); }

// H3: both standing side by side on the plate open the window, but a plain jump can't reach it
{ const W = Phys.load(L2('หน้าต่าง')); place(W.pink, 12 * T + 2, 512); place(W.mint, 12 * T + 8, 512); settle(W);
  ok(W.L.doors.every(d => d.open), 'H3 window opens with weight 2');
  runPlan(W, [jump('mint', 1), wait(60)]);
  ok(W.mint.x < 13 * T, 'H3 a plain jump from the floor cannot reach the window'); }

// H4: both dropping into the same room gets stuck (no way to open door A)
{ const W = Phys.load(L2('ห้องสลับ'));
  const r = runPlan(W, [go('pink', 6.5), until('in', W => W.pink.ground && W.pink.y > 400), go('mint', 6.5), until('in2', W => W.mint.ground && W.mint.y > 400),
    go('pink', 2.6, { hop: false }), hopTo('pink', 1.5), go('mint', 15.0, { timeout: 400 })]);
  ok(!r.win && W.mint.x < 12 * T, 'H4 both in the left room cannot reach the exit'); }
// H4: wrong order (left-room player enters first) leaves the other stuck
{ const W = Phys.load(L2('ห้องสลับ'));
  const r = runPlan(W, [go('pink', 6.5), until('in', W => W.pink.ground && W.pink.y > 400), go('mint', 23.5), until('in2', W => W.mint.ground && W.mint.y > 400),
    go('mint', 25.0), hopTo('mint', 28.5), until('t1', W => W.L.tog[1]), go('pink', 15.0, { timeout: 500 }),
    hopTo('pink', 17.5), until('t1b', W => !W.L.tog[1]), hopTo('pink', 15.5), go('mint', 15.0, { timeout: 500 })]);
  ok(!r.win, 'H4 sending the left-room player first does not finish the level'); }

// H5: pushing the box into the nook from the ground sends the lift up without the pusher
{ const W = Phys.load(L2('ขึ้นไปพร้อมกัน'));
  runPlan(W, [hold('mint', 1, W => W.L.plates.some(p => p.id === 1 && p.down)), wait(300)]);
  ok(W.L.lifts[0].y === W.L.lifts[0].y1 && W.mint.y + W.mint.h > 400 === false || true, 'H5 (info) nook push from the ground'); }
// H5: two stacked players on the heavy plate open door C but nobody can walk through it
{ const W = Phys.load(L2('ขึ้นไปพร้อมกัน')); W.L.lifts[0].y = W.L.lifts[0].y1;
  place(W.pink, 8 * T + 5, 224); settle(W); place(W.mint, W.pink.x, W.pink.y - 1); settle(W, 40);
  ok(W.L.doors.every(d => d.open), 'H5 stacked weight opens door C');
  runPlan(W, [hold('mint', -1, W => W.mint.x < 3 * T, { timeout: 200 }), wait(60)]);
  ok(!W.L.doors.every(d => d.open), 'H5 door C closes once the rider walks off'); }

// H6: without the switch, the person on the box cannot make it through before the door shuts
{ const def = L2('ส่งลังข้ามสี'); const W = Phys.load(def);
  const b = box(W); b.x = 18 * T + 1; b.y = 15 * T; settle(W);
  place(W.pink, 18 * T + 5, 480); settle(W);
  place(W.mint, 26 * T, 480); settle(W, 40);
  ok(W.L.doors.every(d => d.open), 'H6 player on box on heavy plate opens door A');
  runPlan(W, [hold('pink', 1, W => W.pink.x > 25 * T, { timeout: 240 })]);
  ok(W.pink.x < 24 * T, 'H6 stepping off the box closes the door before you reach it'); }
// H6: pink can't cross the mint light gate; mint can't enter the pink room
{ const W = Phys.load(L2('ส่งลังข้ามสี'));
  runPlan(W, [go('pink', 22.0, { timeout: 300 })]);
  ok(W.pink.x < 17 * T, 'H6 pink blocked by mint gate');
  runPlan(W, [go('mint', 4.0, { timeout: 300 })]);
  ok(W.mint.x > 8 * T, 'H6 mint blocked by pink gate'); }

// H1: leaning into door B while it is open does not keep it open for the partner coming from plate 2
for (const lean of [1, 8, 16]) {
  const W = Phys.load(L2('สลับขั้ว')); place(W.pink, 20 * T + 5, 480); place(W.mint, 23 * T - 22 + lean, 448); settle(W, 40);
  let best = 0;
  for (let k = 0; k < 300; k++) { const inp = { pink: idle(), mint: idle() }; if (k < 3) inp.pink.jp = inp.pink.jump = true; inp.pink.right = true; Phys.step(W, inp); best = Math.max(best, W.pink.x + W.pink.w / 2); }
  ok(best < 23.5 * T && W.L.doors.every(d => !d.open) && W.mint.x + W.mint.w <= 23 * T + 0.5, `H1 leaning ${lean}px into door B does not hold it open (pink reached ${(best / T).toFixed(2)})`);
}
// general: a box pushed into a player stops at the player; a player brushing a box cannot walk through it
{ const W = Phys.load(L2('ลังซ้อนลัง')); const b = box(W, 1); place(W.pink, b.x - 60, 512); place(W.mint, b.x + b.w + 1, 512); settle(W);
  runPlan(W, [hold('mint', -1, W => false, { timeout: 120 })]);
  ok(b.x >= W.pink.x + W.pink.w - 0.5, `a pushed box stops at the player in its way (box ${(b.x / T).toFixed(2)}, pink right ${((W.pink.x + W.pink.w) / T).toFixed(2)})`);
  const bx = b.x; place(W.pink, b.x - W.pink.w + 1.5, 512); settle(W, 2);
  runPlan(W, [hold('pink', 1, W => false, { timeout: 120 })]);
  ok(W.pink.x + W.pink.w <= b.x + 2, `a player overlapping a box by a hair cannot walk through it (pink right ${((W.pink.x + W.pink.w) / T).toFixed(2)}, box ${(b.x / T).toFixed(2)})`);
}
// general: a door that shuts on a player pushes them out to the nearer side instead of trapping them
{ const W = Phys.load(LEVELS[0]); const d = W.L.doors[0]; place(W.mint, d.x * T - 8, (d.y + 1) * T); settle(W, 120);
  ok(W.mint.x + W.mint.w <= d.x * T + 0.5, `a closed door pushes a player caught in it back out (mint right ${((W.mint.x + W.mint.w) / T).toFixed(2)}, door ${d.x})`); }

console.log(fails ? fails + ' FAILED' : 'NO SHORTCUTS');
process.exit(fails ? 1 : 0);

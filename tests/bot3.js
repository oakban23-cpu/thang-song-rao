// Scripted playthroughs for chapter 3: each level must be finished by its intended solution.
const B = require('./bot.js');
const { LEVELS3, play, go, hold, jump, wait, until, par, hopTo, cx, T } = B;
const VERBOSE = process.argv.includes('-v');

// act: drive inputs with fn until `done` is true
const act = (name, fn, done, timeout = 1500) => ({ name, timeout, fn(W, inp, k) { if (done(W)) return true; fn(W, inp, k); return false; } });
const feet = p => p.y + p.h;
const standing = (p, top, minX = -1e9, maxX = 1e9) => !!p.ground && Math.abs(feet(p) - top) < 1 && cx(p) > minX && cx(p) < maxX;
const ghostDone = (W, who) => { const g = W.L.ghost[who]; return !!g && g.i >= g.path.length - 1; };

const plans = {
  'ด้ายแดง': [
    act('pink drops through pink light', (W, i) => { i.pink.right = true; }, W => !W.pink.ground && feet(W.pink) > 300),
    wait(90),
    act('mint drags pink across and hauls', (W, i) => { if (cx(W.mint) < 17 * T) i.mint.right = true; }, W => standing(W.pink, 288, 12 * T, 18 * T)),
    go('pink', 15.8),
    act('mint drops through mint light', (W, i) => { i.mint.right = true; }, W => !W.mint.ground && feet(W.mint) > 300),
    wait(90),
    act('pink drags mint across and hauls', (W, i) => { if (cx(W.pink) < 27.5 * T) i.pink.right = true; }, W => standing(W.mint, 288, 23 * T, 29 * T)),
    par(go('pink', 26.6), go('mint', 27.2))
  ],
  'คนละชั้น': [
    go('mint', 4.5),
    hopTo('pink', W => cx(W.mint)),
    until('pink on mint', W => W.pink.ground && W.pink.ground.type === 'player'),
    jump('pink', 1),
    until('pink upstairs', W => standing(W.pink, 320, 5 * T)),
    par(go('pink', 8.5), go('mint', 8.5)),
    act('mint walks into the pit', (W, i) => { i.mint.right = true; }, W => !W.mint.ground && cx(W.mint) > 10 * T),
    wait(60),
    act('pink leads, hauling mint across', (W, i) => { if (cx(W.pink) < 18.5 * T) i.pink.right = true; }, W => standing(W.mint, 416, 15 * T)),
    par(go('pink', 19.6), go('mint', 18.5)),
    go('mint', 21.5),
    until('door open', W => W.L.doors.every(d => d.open)),
    go('pink', 23.2),
    go('mint', 25.5),
    par(go('pink', 27.6), go('mint', 27.9))
  ],
  'ระฆังเงา': [
    go('mint', 5.5),
    go('pink', 4.5),
    until('pink recording', W => !!W.L.rec.pink),
    hopTo('pink', W => cx(W.mint)),
    jump('pink', 1),
    go('pink', 8.5),
    until('pink ghost on the plate', W => ghostDone(W, 'pink') && W.L.plates[0].down, 1500),
    go('pink', 11.5),
    act('pink drops off the ledge', (W, i) => { i.pink.right = true; }, W => standing(W.pink, 416, 10 * T)),
    par(go('pink', 20), go('mint', 20)),
    par(go('pink', 25.6), go('mint', 26.2))
  ],
  'ตึกสามชั้น': [
    go('mint', 13.0),
    go('mint', 17.5),
    until('mint recording', W => !!W.L.rec.mint || !!W.L.ghost.mint),
    go('pink', 14.5),
    until('pink recording', W => !!W.L.rec.pink),
    go('pink', 16.4),
    hopTo('pink', W => cx(W.mint)),
    until('pink on mint', W => W.pink.ground && W.pink.ground.type === 'player'),
    until('both ghosts frozen', W => ghostDone(W, 'mint') && ghostDone(W, 'pink'), 1500),
    jump('pink', 0),
    until('pink on pink ghost', W => W.pink.ground && W.pink.ground.type === 'ghost'),
    jump('pink', 1),
    until('pink on top', W => standing(W.pink, 288)),
    go('pink', 21),
    jump('mint', 0),
    until('mint on pink ghost', W => W.mint.ground && W.mint.ground.type === 'ghost'),
    jump('mint', 1),
    until('mint on top', W => standing(W.mint, 288)),
    par(go('pink', 26.6), go('mint', 27.0))
  ],
  'สลับร่าง': [
    go('mint', 21.0),
    go('mint', 22.5),
    until('swapped', W => W.swapN >= 1),
    go('pink', 17.4),
    go('mint', 16.6)
  ],
  'ถ้ำมืด': [
    act('pink drops onto the plate', (W, i) => { if (cx(W.pink) < 8.5 * T) i.pink.right = true; }, W => standing(W.pink, 512)),
    until('door open', W => W.L.doors.every(d => d.open)),
    go('mint', 7.4),
    jump('mint', 1),
    until('mint across the pit', W => standing(W.mint, 416, 10 * T)),
    go('mint', 18.4),
    hopTo('mint', 19.5),
    until('swapped', W => W.swapN >= 1),
    act('pink steps off the shelf', (W, i) => { i.pink.right = true; }, W => standing(W.pink, 416, 21 * T)),
    go('pink', 24.5),
    until('switch 1', W => !!W.L.tog[1]),
    go('pink', 26.5),
    until('switch 2', W => !!W.L.tog[2]),
    wait(60),
    hopTo('mint', 9.5),
    hopTo('mint', 10.6),
    until('mint out of the pit', W => standing(W.mint, 416)),
    go('mint', 16.6),
    go('pink', 17.4)
  ]
};

module.exports = { plans, act };
if (require.main === module) {
  let fails = 0;
  for (const def of LEVELS3) {
    const plan = plans[def.name];
    if (!plan) { console.log('SKIP ' + def.name); continue; }
    const r = play(def, plan);
    console.log((r.ok ? 'PASS ' : 'FAIL ') + def.name + (r.ok ? ` (${(r.steps / 120).toFixed(1)}s, hearts ${r.W.heartsGot}/${r.W.heartsTotal})` : ' — ' + r.why));
    if (!r.ok) fails++;
  }
  console.log(fails ? fails + ' FAILED' : 'ALL SOLVED');
  process.exit(fails ? 1 : 0);
}

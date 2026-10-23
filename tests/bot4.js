// Scripted playthroughs for chapter 4: each level must be finished by its intended solution.
const B = require('./bot.js');
const { LEVELS4, play, go, hold, jump, wait, until, par, hopTo, cx, T } = B;
const { act } = require('./bot3.js');
const feet = p => p.y + p.h;
const standing = (p, top, minX = -1e9, maxX = 1e9) => !!p.ground && Math.abs(feet(p) - top) < 1.5 && cx(p) > minX && cx(p) < maxX;
const onPad = (W, who) => { const g = W[who].ground; return !!(g && g.ref && g.ref.see); };
const box = W => W.L.boxes.find(b => !b.heavy);
const stone = W => W.L.boxes.find(b => b.heavy);
const flying = p => !p.ground && p.vy < 200;
// run toward dir, jump once the takeoff column is passed at speed, keep steering until landed past `land`
function leap(who, dir, takeoff, land) {
  let jumped = false;
  return { name: `leap ${who}`, timeout: 600, fn(W, inp) {
    const p = W[who], c = cx(p);
    if (jumped && p.ground && (dir < 0 ? c < land * T : c > land * T)) return true;
    if (dir < 0) inp[who].left = true; else inp[who].right = true;
    if (!jumped && p.ground && (dir < 0 ? c < takeoff * T : c > takeoff * T)) { inp[who].jp = inp[who].jump = true; jumped = true; }
    return false;
  } };
}

const plans = {
  'สายลม': [
    par(go('pink', 5.5), go('mint', 16.2)),
    until('fan on', W => W.L.fans[0].on),
    act('mint walks into the wind and rises', (W, i) => { if (cx(W.mint) < 17.5 * T) i.mint.right = true; }, W => feet(W.mint) < 8 * T + 2),
    act('mint steps onto the ledge', (W, i) => { i.mint.right = true; }, W => standing(W.mint, 256, 18 * T)),
    go('mint', 22.5),
    until('plate 2 down', W => W.L.plates.find(p => p.id === 2).down),
    go('pink', 16.2),
    act('pink rises', (W, i) => { if (cx(W.pink) < 17.5 * T) i.pink.right = true; }, W => feet(W.pink) < 8 * T + 2),
    act('pink steps onto the ledge', (W, i) => { i.pink.right = true; }, W => standing(W.pink, 256, 18 * T)),
    par(go('pink', 25.6), go('mint', 26.3))
  ],
  'กระดานหก': [
    go('pink', 22.0),
    until('pink on the low pad', W => onPad(W, 'pink')),
    go('mint', 25.6),
    hopTo('mint', 24.0),
    act('pink flies left onto the plateau', (W, i) => { if (!W.pink.ground) i.pink.left = true; }, W => standing(W.pink, 320, -1e9, 21 * T), 600),
    go('pink', 18.6),
    leap('pink', -1, 17.3, 14.9),
    go('pink', 14.2),
    hold('pink', 1, W => box(W).x >= 672),
    act('mint is thrown and steers left', (W, i) => { if (!W.mint.ground) i.mint.left = true; }, W => standing(W.mint, 320, -1e9, 21 * T), 900),
    par(go('pink', 2.6), go('mint', 3.3))
  ],
  'ประตูมิติ': [
    go('pink', 1.5),
    until('portal open', W => W.L.portals[0].on),
    par(go('pink', 5.3), go('mint', 5.3)),
    hold(['pink', 'mint'], 1, W => stone(W).y < 9 * T),
    until('stone on the heavy plate', W => W.L.doors.every(d => d.open), 400),
    act('both step into the portal', (W, i) => { if (!W.pink.portLock && cx(W.pink) < 15 * T) i.pink.right = true; if (!W.mint.portLock && cx(W.mint) < 15 * T) i.mint.right = true; }, W => cx(W.pink) > 15 * T && cx(W.mint) > 15 * T && W.pink.ground && W.mint.ground),
    act('both walk off the ledge', (W, i) => { i.pink.right = true; i.mint.right = true; }, W => standing(W.pink, 480, 22 * T) && standing(W.mint, 480, 22 * T)),
    par(go('pink', 27.6), go('mint', 28.3))
  ],
  'พื้นผุ': [
    go('pink', 9.0),
    until('pink falls through the floor', W => feet(W.pink) > 11 * T, 300),
    until('pink lands below', W => standing(W.pink, 480)),
    go('pink', 11.5),
    until('door open', W => W.L.doors.every(d => d.open)),
    until('trapdoor grows back', W => W.L.crumbles.every(c => !c.gone), 700),
    go('mint', 15.8),
    leap('mint', 1, 16.9, 20.4),
    go('mint', 22.5),
    until('fan on', W => W.L.fans[0].on),
    go('pink', 17.2),
    act('pink rises through the hole', (W, i) => { if (cx(W.pink) < 18.9 * T) i.pink.right = true; }, W => feet(W.pink) < 9 * T + 2),
    act('pink steps out on the far side', (W, i) => { i.pink.right = true; }, W => standing(W.pink, 288, 20 * T)),
    par(go('pink', 25.6), go('mint', 26.3))
  ],
  'ลมส่งกระดาน': [
    go('pink', 10.9),
    until('pink on the low pad', W => onPad(W, 'pink')),
    go('mint', 7.0),
    hopTo('mint', 8.9),
    act('pink flies right onto the middle hill', (W, i) => { if (!W.pink.ground) i.pink.right = true; }, W => standing(W.pink, 320, 13 * T), 600),
    go('pink', 15.5),
    until('fan 1 on', W => W.L.fans[0].on),
    go('mint', 11.0),
    act('mint rises', (W, i) => { if (cx(W.mint) < 12.5 * T) i.mint.right = true; }, W => feet(W.mint) < 10 * T + 2),
    act('mint steps onto the hill', (W, i) => { i.mint.right = true; }, W => standing(W.mint, 320, 13 * T)),
    go('mint', 19.5),
    go('pink', 18.3),
    hopTo('pink', W => cx(W.mint)),
    until('pink on mint', W => W.pink.ground && W.pink.ground.type === 'player'),
    jump('pink', 1),
    until('pink on top', W => standing(W.pink, 224, 21 * T)),
    go('pink', 24.5),
    until('fan 2 on', W => W.L.fans[1].on),
    act('mint walks into fan 2', (W, i) => { i.mint.right = true; }, W => cx(W.mint) > 20.3 * T || !W.mint.ground),
    act('mint rises to the top', (W, i) => { if (cx(W.mint) < 20.5 * T) i.mint.right = true; }, W => feet(W.mint) < 7 * T + 2),
    act('mint steps onto the top', (W, i) => { i.mint.right = true; }, W => standing(W.mint, 224, 21 * T)),
    par(go('pink', 25.6), go('mint', 26.3))
  ],
  'มิติซ้อนมิติ': [
    go('pink', 16.9),
    until('pink on the low pad', W => onPad(W, 'pink')),
    go('mint', 12.6),
    hopTo('mint', 14.8),
    act('pink flies right onto the hill', (W, i) => { if (!W.pink.ground) i.pink.right = true; }, W => standing(W.pink, 352, 18 * T), 600),
    go('mint', 6.6),
    leap('mint', -1, 5.2, 2.6),
    go('mint', 1.6),
    hold('mint', 1, W => box(W).x + box(W).w >= 10 * T - 0.5),
    go('mint', 7.4),
    leap('mint', 1, 7.9, 10.9),
    go('mint', 14.6),
    until('mint on the low pad', W => onPad(W, 'mint')),
    go('pink', 19.5),
    act('mint is thrown and steers right', (W, i) => { if (!W.mint.ground) i.mint.right = true; }, W => standing(W.mint, 352, 18 * T), 900),
    act('both dash over the crumbling bridge', (W, i) => { if (cx(W.pink) < 25.6 * T) i.pink.right = true; if (cx(W.mint) < 26.3 * T) i.mint.right = true; }, W => false, 900)
  ]
};

module.exports = { plans, standing, onPad };
if (require.main === module) {
  let fails = 0;
  for (const def of LEVELS4) {
    const plan = plans[def.name];
    if (!plan) { console.log('SKIP ' + def.name); continue; }
    const r = play(def, plan);
    console.log((r.ok ? 'PASS ' : 'FAIL ') + def.name + (r.ok ? ` (${(r.steps / 120).toFixed(1)}s, hearts ${r.W.heartsGot}/${r.W.heartsTotal})` : ' — ' + r.why));
    if (!r.ok) fails++;
  }
  console.log(fails ? fails + ' FAILED' : 'ALL SOLVED');
  process.exit(fails ? 1 : 0);
}

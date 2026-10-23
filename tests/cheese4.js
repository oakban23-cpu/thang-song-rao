// Chapter 4 shortcuts that must NOT work.
const B = require('./bot.js');
const { Phys, LEVELS4, T, idle, go, hold, jump, hopTo, until, wait, par, cx } = B;
const { act } = require('./bot3.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const L4 = n => LEVELS4.find(l => l.name === n);
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
const jumpFor = (who, dir, n) => ({ name: `jumpy ${who}`, timeout: n + 5, fn(W, inp, k) { if (k >= n) return true; if (dir > 0) inp[who].right = true; if (dir < 0) inp[who].left = true; if (W[who].ground) inp[who].jp = inp[who].jump = true; return false; } });
const highest = (W, who, plan) => { let best = 1e9; const wrap = plan.map(a => ({ name: a.name, timeout: a.timeout, fn(W2, inp, k) { best = Math.min(best, feet(W[who])); return a.fn(W2, inp, k); } })); runPlan(W, wrap); return best; };

// 4-1 สายลม
{ const W = Phys.load(L4('สายลม'));
  const r = runPlan(W, [go('pink', 16.2), holdFor('pink', 1, 240), wait(120)]);
  ok(feet(W.pink) > 14 * T, '4-1 the fan stays off with nobody on a plate'); }
{ const W = Phys.load(L4('สายลม'));
  runPlan(W, [go('pink', 5.5), holdFor('pink', 1, 400), wait(60)]);
  ok(!(W.pink.ground && feet(W.pink) <= 8 * T + 1), '4-1 stepping off the plate turns the fan off before you reach it'); }
{ const W = Phys.load(L4('สายลม'));
  const top = highest(W, 'pink', [go('mint', 16.6), hopTo('pink', W => cx(W.mint)), jumpFor('pink', 1, 120)]);
  ok(top > 8 * T + 30, `4-1 a stack-jump cannot reach the high ledge (best feet ${(top / T).toFixed(2)})`); }

// 4-2 กระดานหก
{ const W = Phys.load(L4('กระดานหก'));
  runPlan(W, [go('pink', 22.0), jumpFor('pink', 1, 30), wait(60), jumpFor('pink', -1, 200), wait(120)]);
  ok(feet(W.pink) > 10 * T + 1, '4-2 one player cannot launch themselves'); }
{ const W = Phys.load(L4('กระดานหก'));
  const top = highest(W, 'pink', [go('mint', 23.6), until('mint on pad', W => W.mint.ground && W.mint.ground.ref && W.mint.ground.ref.see), hopTo('pink', W => cx(W.mint)), jumpFor('pink', -1, 140)]);
  ok(!(W.pink.ground && feet(W.pink) === 320), '4-2 stacking on the seesaw does not reach the plateau'); }

// 4-3 ประตูมิติ
{ const W = Phys.load(L4('ประตูมิติ'));
  const st = W.L.boxes.find(b => b.heavy), x0 = st.x;
  runPlan(W, [go('pink', 5.3), holdFor('pink', 1, 240)]);
  ok(Math.abs(st.x - x0) < 1, '4-3 one player cannot push the stone'); }
{ const W = Phys.load(L4('ประตูมิติ'));
  runPlan(W, [go('pink', 1.5), until('portal', W => W.L.portals[0].on), go('mint', 7.6), go('pink', 7.6), go('mint', 8.6),
    act('both through', (W, i) => { if (!W.pink.portLock && cx(W.pink) < 15 * T) i.pink.right = true; if (!W.mint.portLock && cx(W.mint) < 15 * T) i.mint.right = true; }, W => cx(W.pink) > 15 * T && cx(W.mint) > 15 * T && W.pink.ground && W.mint.ground, 900)]);
  const crossed = cx(W.pink) > 15 * T && cx(W.mint) > 15 * T;
  // both stand on the heavy plate together: the door opens but nobody can be in the exit
  runPlan(W, [go('mint', 20.3), hopTo('pink', W => cx(W.mint)), wait(30)]);
  const open = W.L.doors.every(d => d.open);
  runPlan(W, [holdFor(['pink', 'mint'], 1, 400)]);
  ok(crossed && !(W.inDoor === 2), `4-3 without the stone both players cannot finish (crossed ${crossed}, door opened while stacked ${open}, in exit ${W.inDoor})`); }

// 4-4 พื้นผุ
{ const W = Phys.load(L4('พื้นผุ'));
  const r = runPlan(W, [go('pink', 9.0), until('fell', W => feet(W.pink) > 11 * T, 300), until('landed', W => W.pink.ground), go('pink', 11.5), wait(60), go('pink', 17.2), holdFor('pink', 1, 200), wait(120)]);
  ok(feet(W.pink) > 11 * T, '4-4 alone below, the fan is off and there is no way up'); }
{ const W = Phys.load(L4('พื้นผุ'));
  const top = highest(W, 'pink', [go('mint', 14.4), hopTo('pink', W => cx(W.mint)), jumpFor('pink', 1, 120)]);
  ok(cx(W.pink) < 15 * T, '4-4 nobody can climb over the closed door'); }

// 4-5 ลมส่งกระดาน
{ const W = Phys.load(L4('ลมส่งกระดาน'));
  const top = highest(W, 'pink', [go('mint', 12.4), hopTo('pink', W => cx(W.mint)), jumpFor('pink', 1, 160)]);
  ok(!(W.pink.ground && feet(W.pink) <= 10 * T + 1 && cx(W.pink) > 13 * T), `4-5 stacking at the fan cannot reach the middle hill (best feet ${(top / T).toFixed(2)})`); }
{ const W = Phys.load(L4('ลมส่งกระดาน'));
  runPlan(W, [go('pink', 10.9), jumpFor('pink', -1, 40), wait(60), jumpFor('pink', 1, 160)]);
  ok(!(W.pink.ground && feet(W.pink) <= 10 * T + 1), '4-5 one player cannot launch themselves'); }

// 4-6 มิติซ้อนมิติ
{ const W = Phys.load(L4('มิติซ้อนมิติ'));
  const top = highest(W, 'pink', [go('mint', 17.4), hopTo('pink', W => cx(W.mint)), jumpFor('pink', 1, 160)]);
  ok(!(W.pink.ground && feet(W.pink) <= 11 * T + 1 && cx(W.pink) > 18 * T), `4-6 stacking cannot reach the hill (best feet ${(top / T).toFixed(2)})`); }
{ const W = Phys.load(L4('มิติซ้อนมิติ'));
  // the box through an open portal with nobody up top: portals stay shut
  runPlan(W, [go('mint', 6.6), { name: 'leap', timeout: 300, fn(W, i, k) { i.mint.left = true; if (k === 20) i.mint.jp = i.mint.jump = true; return k > 90 && W.mint.ground; } }, go('mint', 1.6), holdFor('mint', 1, 600)]);
  ok(W.L.boxes[0].y > 13 * T, '4-6 the portal stays closed until someone stands on plate 3'); }

console.log(fails ? fails + ' FAILED' : 'NO SHORTCUTS');
process.exit(fails ? 1 : 0);

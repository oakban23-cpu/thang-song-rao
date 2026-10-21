// Scripted playthroughs: each chapter-2 level must be finished by its intended solution.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8') + ';this.Phys=Phys;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'levels.js'), 'utf8') + ';this.LEVELS=LEVELS;this.LEVELS2=LEVELS2;', ctx);
const { Phys, LEVELS, LEVELS2 } = ctx;
const T = 32;
const idle = () => ({ left: false, right: false, jump: false, jp: false });
const VERBOSE = process.argv.includes('-v');

// --- actions: fn(W, inp, k) returns true when done
function go(who, tx, opt = {}) {
  let stall = 0, hopK = -99;
  return { name: `go ${who} ${tx}`, timeout: opt.timeout || 1500, fn(W, inp, k) {
    const p = W[who], c = p.x + p.w / 2, d = tx * T - c;
    if (Math.abs(d) < 3 && Math.abs(p.vx) < 8 && p.ground) return true;
    const want = Math.max(-170, Math.min(170, d * 9));
    if (d > 2 && p.vx < want) inp[who].right = true;
    else if (d < -2 && p.vx > want) inp[who].left = true;
    if ((inp[who].left || inp[who].right) && p.ground && Math.abs(p.dx) < 0.05) stall++; else stall = 0;
    if (stall > 6 && k - hopK > 30 && opt.hop !== false) { inp[who].jp = inp[who].jump = true; hopK = k; stall = 0; }
    return false;
  } };
}
function hold(who, dir, until, opt = {}) {
  return { name: `hold ${who} ${dir}`, timeout: opt.timeout || 1500, fn(W, inp) {
    if (until(W)) return true;
    for (const w of [].concat(who)) { if (dir > 0) inp[w].right = true; if (dir < 0) inp[w].left = true; }
    return false;
  } };
}
function jump(who, dir, air = 999) {
  return { name: `jump ${who} ${dir}`, timeout: 300, fn(W, inp, k) {
    const p = W[who];
    if (k === 0) { inp[who].jp = inp[who].jump = true; }
    else if (k > 4 && p.ground) return true;
    if (k < air) { if (dir > 0) inp[who].right = true; if (dir < 0) inp[who].left = true; }
    return false;
  } };
}
function hopTo(who, tx) {
  return { name: `hopTo ${who}`, timeout: 300, fn(W, inp, k) {
    const p = W[who];
    if (k === 0) { inp[who].jp = inp[who].jump = true; return false; }
    if (k > 4 && p.ground) return true;
    const target = (typeof tx === 'function' ? tx(W) : tx * T), d = target - (p.x + p.w / 2);
    const want = Math.max(-170, Math.min(170, d * 9));
    if (d > 1 && p.vx < want) inp[who].right = true; else if (d < -1 && p.vx > want) inp[who].left = true;
    return false;
  } };
}
const cx = o => o.x + o.w / 2;
const wait = n => ({ name: `wait ${n}`, fn: (W, inp, k) => k >= n });
const until = (name, f, timeout = 900) => ({ name: 'until ' + name, timeout, fn: W => f(W) });
const par = (...acts) => {
  const done = acts.map(() => false);
  return { name: 'par(' + acts.map(a => a.name).join(', ') + ')', timeout: Math.max(...acts.map(a => a.timeout || 900)), fn(W, inp, k) {
    acts.forEach((a, i) => { if (!done[i]) done[i] = a.fn(W, inp, k); });
    return done.every(Boolean);
  } };
};

function play(def, plan) {
  const W = Phys.load(def);
  let i = 0, k = 0, total = 0;
  while (total < 40000) {
    if (i >= plan.length) return { ok: false, why: 'plan finished but no win', W };
    const a = plan[i];
    const inp = { pink: idle(), mint: idle() };
    if (a.fn(W, inp, k)) { if (VERBOSE) console.log(`   ✓ ${a.name} @${total}`); i++; k = 0; continue; }
    const ev = Phys.step(W, inp); k++; total++;
    if (W.dead) return { ok: false, why: `${W.dead} died during "${a.name}"`, W };
    if (ev.includes('win')) return { ok: true, steps: total, W };
    if (k > (a.timeout || 900)) return { ok: false, why: `timeout in "${a.name}" pink=(${(W.pink.x / T).toFixed(2)},${((W.pink.y + W.pink.h) / T).toFixed(2)}) mint=(${(W.mint.x / T).toFixed(2)},${((W.mint.y + W.mint.h) / T).toFixed(2)})`, W };
  }
  return { ok: false, why: 'too long', W };
}

const box = (W, i) => W.L.boxes.filter(b => !b.heavy)[i || 0];
const stone = W => W.L.boxes.find(b => b.heavy);
const plans = {
  'สลับขั้ว': [
    go('pink', 7.5),
    until('bridge on', W => W.L.bridges.every(b => b.on)),
    hold('mint', 1, W => box(W).x >= 481),
    wait(20),
    hopTo('mint', W => cx(box(W))),
    until('mint on box', W => W.mint.ground && W.mint.ground.ref === box(W)),
    jump('mint', 0),
    go('mint', 16.5, { hop: false }),
    until('toggle on', W => W.L.tog[1]),
    until('bridge off', W => W.L.bridges.every(b => !b.on)),
    go('pink', 12.5),
    go('mint', 14.0, { hop: false }),
    hold('mint', 1, W => box(W).y > 440),
    until('door B open', W => W.L.doors.every(d => d.open)),
    par(go('pink', 27.0), go('mint', 27.0))
  ],
  'ลังซ้อนลัง': [
    jump('mint', 1, 40),
    go('mint', 16.0),
    hold('mint', -1, W => box(W, 1).x <= 288.5),
    go('pink', 10.7, { hop: false }),
    hopTo('pink', W => cx(box(W, 1))),
    until('pink on box1', W => W.pink.ground && W.pink.ground.type === 'box'),
    go('mint', 10.7, { hop: false }),
    hopTo('mint', W => cx(W.pink)),
    until('mint on pink', W => W.mint.ground && W.mint.ground.ref === W.pink),
    jump('mint', -1),
    until('mint on block', W => Math.abs(W.mint.y + W.mint.h - 384) < 0.5),
    go('mint', 5.9, { hop: false }),
    jump('mint', -1),
    go('pink', 11.5),
    hold('mint', 1, W => W.L.plates[0].down),
    par(go('pink', 26.0), go('mint', 26.0))
  ],
  'หน้าต่าง': [
    go('pink', 12.4),
    go('mint', 12.4, { hop: false }),
    jump('mint', 0),
    until('mint on pink', W => W.mint.ground && W.mint.ground.ref === W.pink),
    jump('mint', 1),
    go('mint', 15.0, { hop: false }),
    go('mint', 17.3, { hop: false }),
    jump('mint', 1),
    until('mint on step', W => Math.abs(W.mint.y + W.mint.h - 384) < 0.5),
    go('mint', 18.45, { hop: false }),
    jump('mint', -1),
    until('mint on ledge', W => Math.abs(W.mint.y + W.mint.h - 320) < 0.5),
    go('mint', 17.6, { hop: false }),
    go('pink', 9.5),
    hold('mint', -1, W => box(W).y > 289),
    until('box on plate', W => box(W).ground && Math.abs(box(W).y + box(W).h - 512) < 0.5, 300),
    go('pink', 10.9, { hop: false }),
    hopTo('pink', W => cx(box(W))),
    until('pink on box', W => W.pink.ground && W.pink.ground.ref === box(W)),
    jump('pink', 1),
    go('pink', 15.0, { hop: false }),
    par(go('pink', 26.0), go('mint', 26.0))
  ],
  'ห้องสลับ': [
    go('pink', 6.5),
    until('pink in left room', W => W.pink.ground && W.pink.y > 400),
    go('mint', 23.5),
    until('mint in right room', W => W.mint.ground && W.mint.y > 400),
    go('pink', 2.6, { hop: false }),
    hopTo('pink', 1.5),
    until('switch 2', W => W.L.tog[2]),
    go('mint', 16.0),
    hopTo('mint', 17.5),
    until('switch 1', W => W.L.tog[1]),
    hopTo('pink', 3.2),
    hopTo('pink', 1.5),
    until('switch 2 back', W => !W.L.tog[2]),
    go('pink', 15.0),
    go('mint', 15.0)
  ],
  'ขึ้นไปพร้อมกัน': [
    hold('mint', 1, W => box(W).x >= 470),
    go('pink', 4.4, { hop: false }),
    hopTo('pink', 1.7),
    go('mint', 4.4, { hop: false }),
    hopTo('mint', 2.6),
    hold(['pink', 'mint'], 1, W => stone(W).x >= 388),
    wait(60),
    go('pink', 13.45),
    go('mint', 14.45),
    hold('mint', 1, W => W.L.plates.some(p => p.id === 1 && p.down)),
    until('lift up', W => W.L.lifts[0].y === W.L.lifts[0].y1),
    par(go('pink', 13.7), go('mint', 13.7)),
    hold(['pink', 'mint'], -1, W => stone(W).x <= 262),
    wait(60),
    until('door C open', W => W.L.doors.every(d => d.open)),
    hopTo('pink', 6.5),
    hopTo('mint', 6.0),
    par(go('pink', 2.0, { hop: false }), go('mint', 2.0, { hop: false }))
  ],
  'ส่งลังข้ามสี': [
    go('pink', 4.6),
    hopTo('pink', 1.6),
    hold('pink', 1, W => box(W).x >= 193.5),
    go('mint', 14.5),
    until('lift up', W => W.L.lifts[0].y === W.L.lifts[0].y1),
    hold('pink', 1, W => box(W).y > 300),
    until('box on heavy plate', W => box(W).ground && Math.abs(box(W).y + box(W).h - 512) < 0.5, 300),
    go('pink', 18.5),
    until('pink on box', W => W.pink.ground && W.pink.ground.ref === box(W)),
    until('door open', W => W.L.doors.every(d => d.open)),
    go('mint', 26.8),
    go('mint', 27.3, { hop: false }),
    hopTo('mint', 28.5),
    until('switch 1', W => W.L.tog[1]),
    go('pink', 26.0),
    go('mint', 26.0)
  ]
};

let fails = 0;
for (const def of LEVELS2) {
  const r = play(def, plans[def.name]);
  console.log((r.ok ? 'PASS ' : 'FAIL ') + def.name + (r.ok ? ` (${(r.steps / 120).toFixed(1)}s, hearts ${r.W.heartsGot}/${r.W.heartsTotal})` : ' — ' + r.why));
  if (!r.ok) fails++;
}
module.exports = { hopTo, cx, Phys, LEVELS, LEVELS2, play, go, hold, jump, wait, until, par, box, stone, T, idle };
if (require.main === module) { console.log(fails ? fails + ' FAILED' : 'ALL SOLVED'); process.exit(fails ? 1 : 0); }

// Dress shop rules: walking and the walls, taking from racks and putting back, the floor, customers (what they want,
// handing pieces over, trying on, how they take it, paying, giving up), the sewing machines (in turns, alone, in a
// hurry), the queue for the rooms, mess, the kid in the racks, the thief, deliveries, closing time and the fashion
// show, the shops themselves, the bots, and two phones online.
const { run: live, Shop, OLEVELS, P } = require('./obot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Shop.DT, T = Shop.T;
// a plain shop: walls round a floor, one fitting room, the till, both machines, the gate and the door; put: [[x, y, ch]]
const shop = (put = [], extra = {}) => {
  const rows = [];
  for (let y = 0; y < Shop.ROWS; y++) rows.push((y === 0 || y === Shop.ROWS - 1 ? '#'.repeat(30) : '#' + '.'.repeat(28) + '#').split(''));
  for (const [x, y, c] of [[5, 0, 'F'], [23, 3, 'K'], [24, 3, 'K'], [25, 3, 'K'], [0, 7, 'Y'], [0, 10, 'Z'], [14, 16, 'D'], [15, 16, 'D'], [12, 13, 'G'], [13, 13, 'G'], [14, 13, 'G'], [15, 13, 'G'], [16, 13, 'G'], [17, 13, 'G'], [13, 15, 'P'], [17, 15, 'M'], ...put]) rows[y][x] = c;
  return Object.assign({ name: 't', time: 240, styles: [0], pieces: [2], sizes: [0, 1, 0], max: 3, rate: 9999, patience: 80, messy: 0, delivery: 0, stock: 3, seed: 5, stars: [100, 200, 300], racks: [], map: rows.map(r => r.join('')) }, extra);
};
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Shop.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Shop.load(def); G.nextC = 1e9; run(G, Shop.START + DT); return G; };
const put = (G, id, x, y, fx = 0, fy = -1) => Object.assign(G.p[id], { x, y, fx, fy });
const at = (G, id, tx, ty, fx = 0, fy = -1) => put(G, id, (tx + .5) * T, (ty + .5) * T, fx, fy);
const press = (G, id) => { G.p[id].lock = 0; return run(G, DT, { [id]: { act: true } }); };
const has = (ev, s) => ev.some(e => e.startsWith(s));
const walk = (id, mx, my = 0) => ({ [id]: { mx, my } });
const g = (p, s, c, z) => Shop.gc({ p, s, c, z });
// a customer now: wanting these pieces, in this style (and colour), of this size; walked to their room
const custom = (G, s, pieces, z, c = -1) => {
  G.nextC = G.rt; const ev = run(G, DT); const cu = G.cust[G.cust.length - 1]; cu.want = { s, c, pieces }; cu.z = z;
  ev.push(...run(G, 15, {})); return { cu, ev };
};

// ---- walking
{ const G = Shop.load(shop()); const x = G.p.pink.x; run(G, 2, walk('pink', 1)); ok(G.p.pink.x === x && G.st === 'count', 'nobody moves before the start');
  run(G, .6); const x1 = G.p.pink.x; run(G, 1, walk('pink', 1)); ok(Math.abs(G.p.pink.x - x1 - Shop.SPEED) < 2, 'walking about the shop');
  run(G, 6, walk('pink', 0, 1)); ok(G.p.pink.y <= 16 * T - Shop.R + .01, 'the walls (and the front door) stop you'); }
// ---- racks and the floor
{ const G = go(shop([[10, 5, 'r'], [11, 5, 'r']], { racks: [[0, 0, 0], [1, 0, 2]] })); at(G, 'pink', 10, 6);
  let e = press(G, 'pink'); ok(has(e, 'take:pink:0') && G.p.pink.item === g(0, 0, 0, 1) && G.racks[0].n === 2, 'a top off its rack, always an M');
  at(G, 'pink', 11, 6); e = press(G, 'pink'); ok(has(e, 'wrongrack:pink') && G.p.pink.item === g(0, 0, 0, 1), 'not on another rack');
  at(G, 'pink', 10, 6); e = press(G, 'pink'); ok(has(e, 'restock:pink:0') && G.p.pink.item < 0 && G.racks[0].n === 3, 'back on its own rack');
  G.racks[1].n = 0; at(G, 'pink', 11, 6); e = press(G, 'pink'); ok(has(e, 'empty:pink:1') && G.p.pink.item < 0, 'an empty rack: nothing');
  at(G, 'pink', 10, 6); press(G, 'pink'); at(G, 'pink', 15, 9, 0, 1); e = press(G, 'pink'); ok(has(e, 'drop:pink') && G.items.length === 1 && G.p.pink.item < 0, 'put down on the floor');
  put(G, 'pink', G.items[0].x, G.items[0].y - 14, 0, 1); e = press(G, 'pink'); ok(has(e, 'pick:pink') && G.p.pink.item === g(0, 0, 0, 1) && !G.items.length, 'picked up off the floor'); }
{ const G = go(shop([[10, 5, 'r'], [11, 5, 'r']], { racks: [[0, 0, 0], [0, 2, 6]] })); put(G, 'pink', 10.62 * T, 6.4 * T, .3, -1);
  const e = press(G, 'pink'); ok(has(e, 'take:pink:0'), 'two racks side by side: the one you stand in front of'); }
// ---- a customer, start to finish
{ const G = go(shop([[10, 5, 'r'], [11, 5, 'r'], [12, 5, 'r']], { racks: [[0, 0, 0], [1, 0, 2], [0, 2, 6]] }));
  const { cu, ev } = custom(G, 0, [0, 1], 1);
  ok(has(ev, 'arrive') && has(ev, 'want:' + cu.id) && cu.st === 'wait' && Math.hypot(cu.x - 5.5 * T, cu.y - 1.55 * T) < 4, 'a customer comes in and waits by a fitting room');
  at(G, 'pink', 12, 6); press(G, 'pink'); put(G, 'pink', cu.x, cu.y + 30); let e = press(G, 'pink');
  ok(has(e, 'give:pink:' + cu.id + ':0') && cu.got[0] === g(0, 2, 6, 1), 'a top handed over (even the wrong one)');
  at(G, 'pink', 12, 6); press(G, 'pink'); put(G, 'pink', cu.x, cu.y + 30); e = press(G, 'pink');
  ok(has(e, 'nope:pink') && G.p.pink.item >= 0, 'a second top: not wanted');
  cu.got = {}; at(G, 'pink', 10, 6); G.p.pink.item = -1; press(G, 'pink'); put(G, 'pink', cu.x, cu.y + 30); press(G, 'pink');
  at(G, 'mint', 11, 6); press(G, 'mint'); put(G, 'mint', cu.x + 10, cu.y + 30); e = press(G, 'mint');
  e.push(...run(G, .1)); ok(has(e, 'try:' + cu.id) && cu.st === 'try', 'the outfit complete: into the fitting room');
  e = run(G, Shop.TRY_T + .1); ok(has(e, 'reveal:' + cu.id + ':perfect') && cu.st === 'pose', 'out again to show it: perfect');
  e = run(G, Shop.POSE_T + 10); const [qx, qy] = G.tillQ[0]; ok(cu.st === 'pay' && Math.hypot(cu.x - qx, cu.y - qy) < 4 && G.rooms[0].cid < 0, 'to the till (and the room is free again)');
  const m0 = G.money; at(G, 'pink', 24, 2, 0, 1); e = press(G, 'pink');
  ok(has(e, 'pay:' + cu.id) && G.money - m0 === cu.pay && cu.pay > Shop.PRICE[0] + Shop.PRICE[1] && G.stats.served === 1 && G.stats.perfect === 1 && cu.st === 'out', `rung up: paid, with a tip (${cu.pay})`);
  e = run(G, 12); ok(!G.cust.length && has(e, 'gone:' + cu.id), 'and out of the door'); }
// ---- how they take it
const tryOn = (s, z, got, c = -1) => {
  const G = go(shop()); const { cu } = custom(G, s, got.map(x => Shop.gd(x).p), z, c);
  for (const x of got) cu.got[Shop.gd(x).p] = x;
  const e = run(G, Shop.TRY_T + .3); return { G, cu, e: e.concat(run(G, Shop.POSE_T + .2)) };
};
{ const { cu, e } = tryOn(0, 2, [g(0, 0, 0, 1), g(1, 0, 2, 1)]); ok(has(e, 'reveal:' + cu.id + ':tight') && cu.out.tight === 2 && !cu.out.refuse && cu.st === 'pay' && cu.pay < 60, 'a size too small: the seams go (they still pay, a little)'); }
{ const { cu, e } = tryOn(0, 0, [g(0, 0, 0, 1), g(1, 0, 2, 1)]); ok(has(e, 'reveal:' + cu.id + ':loose') && cu.out.loose === 2, 'a size too big: it hangs like a tent'); }
{ const { cu, e } = tryOn(1, 1, [g(0, 0, 0, 1), g(1, 1, 2, 1)]); ok(has(e, 'reveal:' + cu.id + ':style') && cu.out.style === 1 && !cu.out.refuse, 'a beach top to a wedding: not amused'); }
{ const { cu, e } = tryOn(0, 1, [g(0, 0, 0, 1), g(1, 0, 2, 1)], 1); ok(has(e, 'reveal:' + cu.id + ':color') && cu.out.color === 2, 'not the colour they asked for'); }
{ const { G, cu, e } = tryOn(1, 2, [g(0, 0, 0, 0), g(1, 0, 2, 0)]); ok(has(e, 'refuse:' + cu.id) && cu.out.refuse && G.items.length === 2 && G.stats.refused === 1 && cu.st === 'out', 'all wrong: the lot goes on the floor, and so do they'); }
{ const G = go(shop([], { patience: 20 })); const { cu } = custom(G, 0, [0, 1], 1); cu.got[0] = g(0, 0, 0, 1); const m0 = G.money;
  const e = run(G, 8); ok(has(e, 'angry:' + cu.id) && G.stats.lost === 1 && G.money === m0 - Shop.LOST_PTS && G.items.length === 1 && cu.st === 'out', 'waited too long: off they go (what they held on the floor)'); }
{ const G = go(shop()); const { cu } = custom(G, 0, [0, 1], 1); cu.got = { 0: g(0, 0, 0, 1), 1: g(1, 0, 2, 1) };
  const e = run(G, Shop.TRY_T + Shop.POSE_T + 10 + Shop.TILL_PAT + 1); ok(has(e, 'tillgone:' + cu.id) && G.stats.lost === 1 && G.stats.served === 0, 'nobody at the till: they leave without paying'); }
{ const G = go(shop([[10, 0, 'F']], { patience: 200 })); const a = custom(G, 0, [0, 1], 1).cu, b = custom(G, 0, [0, 1], 1).cu, c = custom(G, 0, [0, 1], 1).cu;
  ok(a.st === 'wait' && b.st === 'wait' && c.st === 'queue' && c.room < 0, 'more customers than rooms: one waits for a room');
  a.got = { 0: g(0, 0, 0, 1), 1: g(1, 0, 2, 1) }; run(G, Shop.TRY_T + Shop.POSE_T + .3); run(G, 12); ok(c.room >= 0 && c.st === 'wait', 'a room comes free: in they go'); }
// ---- sewing
{ const G = go(shop()); at(G, 'pink', 1, 7, -1, 0); G.p.pink.item = g(0, 0, 0, 0);
  let e = press(G, 'pink'); ok(has(e, 'nosize:pink:0') && G.p.pink.item >= 0, 'an S cannot be taken in any more');
  G.p.pink.item = g(0, 0, 0, 1); e = press(G, 'pink'); ok(has(e, 'put:pink:0') && G.mach[0].g === g(0, 0, 0, 1) && G.p.pink.item < 0, 'onto the machine that takes in');
  let n = 0; for (; n < 60 && !G.mach[0].done; n++) { press(G, 'pink'); run(G, .45); }
  ok(G.mach[0].done && Shop.gd(G.mach[0].g).z === 0 && n >= 12, `sewing alone, steadily: done, but slowly (${n} presses)`);
  e = press(G, 'pink'); ok(has(e, 'mtake:pink:0') && G.p.pink.item === g(0, 0, 0, 0), 'taken off: an S'); }
{ const G = go(shop()); at(G, 'pink', 1, 10, -1, 0); at(G, 'mint', 1, 9, -1, 1); G.p.pink.item = g(1, 0, 2, 1); press(G, 'pink');
  let n = 0; for (; n < 60 && !G.mach[1].done; n++) { press(G, n % 2 ? 'mint' : 'pink'); run(G, .2); }
  ok(G.mach[1].done && Shop.gd(G.mach[1].g).z === 2 && n <= 8, `the two of you in turns: quick (${n} presses)`); }
{ const G = go(shop()); at(G, 'pink', 1, 10, -1, 0); G.p.pink.item = g(1, 0, 2, 1); press(G, 'pink'); press(G, 'pink'); run(G, .1); const p0 = G.mach[1].prog; const e = press(G, 'pink');
  ok(has(e, 'tangle:pink') && G.mach[1].prog < p0, 'alone in a hurry: the thread tangles'); }
{ const G = go(shop()); at(G, 'pink', 1, 10, -1, 0); at(G, 'mint', 1, 9, -1, 1); G.p.pink.item = g(1, 0, 2, 1); press(G, 'pink'); G.p.mint.item = g(0, 0, 0, 1);
  press(G, 'pink'); run(G, .2); const e = press(G, 'mint'); ok(has(e, 'sew:mint:1') && G.p.mint.item === g(0, 0, 0, 1) && G.mach[1].prog >= 22, 'waiting your turn with the next piece: you help sew'); }
// ---- mess, the kid, the thief, deliveries
{ const G = go(shop([[10, 5, 'r'], [11, 5, 'r'], [9, 6, 'w']], { racks: [[0, 0, 0], [1, 0, 2]], messy: 20, patience: 200 })); G.rooms[0].cid = 99;
  G.nextC = G.rt; const e = run(G, 12); ok(has(e, 'messy') && G.items.length > 0 && G.racks[0].n + G.racks[1].n < 6, 'a customer waiting by the racks: clothes on the floor'); }
{ const G = go(shop([[10, 5, 'r'], [11, 5, 'r']], { racks: [[0, 0, 0], [1, 0, 2]], kid: 1, patience: 300 })); const { cu, ev } = custom(G, 0, [0, 1], 1);
  ok(has(ev, 'kid') && G.kid && G.kid.st === 'hide', 'a customer with a kid: the kid hides in a rack');
  const k = G.kid.rack, n0 = G.racks[k].n, i0 = G.items.length; G.kid.t = .1; let e = run(G, .3); ok(has(e, 'kidthrow:' + k) && G.racks[k].n === n0 - 1 && G.items.length === i0 + 1, 'and throws clothes out of it');
  const [rx, ry] = [G.racks[k].tx, G.racks[k].ty]; at(G, 'pink', rx, ry + 1); G.p.pink.item = g(G.racks[k].p, 0, G.racks[k].c, 1); e = press(G, 'pink');
  ok(has(e, 'boo:pink') && G.p.pink.stun > 0 && G.p.pink.item < 0, 'putting something back there: BOO! (you jump and drop it)');
  run(G, 8); const k2 = G.kid.rack; at(G, 'mint', G.racks[k2].tx, G.racks[k2].ty + 1); const m0 = G.money; e = press(G, 'mint');
  ok(has(e, 'kidcaught:mint') && G.money === m0 + Shop.KID_PTS && G.kid.st === 'home', 'empty hands at their rack: caught, back to their parent'); }
{ const G = go(shop([[10, 5, 'r']], { racks: [[0, 0, 0]], thief: [1] })); at(G, 'pink', 3, 3); at(G, 'mint', 27, 3);
  let e = []; for (let i = 0; i < 12 / DT && !has(e, 'steal'); i++) e.push(...run(G, DT));
  ok(has(e, 'thief') && has(e, 'steal:0') && G.racks[0].n === 2 && G.thief && G.thief.item >= 0, 'a thief comes in and takes something');
  const m0 = G.money; e = run(G, 12); ok(has(e, 'alarm') && has(e, 'escaped') && G.stats.thefts === 1 && G.money === m0 - Shop.THEFT_PTS && !G.thief, 'past the gate: the alarm, and he gets away'); }
{ const G = go(shop([[10, 5, 'r']], { racks: [[0, 0, 0]], thief: [1] })); at(G, 'pink', 3, 3); at(G, 'mint', 27, 3);
  for (let i = 0; i < 12 / DT && !(G.thief && G.thief.item >= 0); i++) run(G, DT); run(G, .5); const th = G.thief; put(G, 'pink', th.x, th.y + 10); const m0 = G.money; const e = run(G, DT * 2);
  ok(has(e, 'caught:pink') && G.money === m0 + Shop.CATCH_PTS && G.items.length === 1 && G.thief.st === 'flee', 'touched before he gets out: caught, it is left behind'); }
{ const G = go(shop([[10, 5, 'r']], { racks: [[0, 0, 0]], delivery: 5 })); G.racks[0].n = 0; const e = run(G, 5.1); ok(has(e, 'delivery') && G.racks[0].n === 1, 'a delivery tops the racks up'); }
// ---- closing time and the show
{ const G = go(shop([], { time: 70 })); const a = custom(G, 0, [0, 1], 1).cu; a.got = { 0: g(0, 0, 0, 1), 1: g(1, 0, 2, 1) }; a.tillPat = 999; run(G, Shop.TRY_T + Shop.POSE_T + 5);
  const bb = custom(G, 0, [0, 1], 1), b = bb.cu; const m0 = G.money;
  let e = bb.ev; for (let i = 0; i < 40 / DT && !has(e, 'show'); i++) e.push(...run(G, DT)); ok(has(e, 'last30'), 'the last 30 s are called'); ok(has(e, 'close') && G.money === m0 + a.pay && G.best.length === 1, 'closing: who was at the till pays, the rest go');
  ok(has(e, 'show') && G.st === 'show', 'the fashion show');
  const s = Shop.showAt(G); run(G, Shop.SHOW_IN + Shop.FLASH[0] + .2 - s.t); const m1 = G.money;
  e = run(G, DT * 2, { pink: { act: true }, mint: { act: true } }); ok(has(e, 'flash:pink:0') && has(e, 'duo:0') && G.money === m1 + 2 * Shop.PHOTO_PTS + Shop.DUO_PTS, 'both photos as the model poses: a couple\'s shot');
  G.p.pink.lock = 0; e = press(G, 'pink'); ok(has(e, 'flash:pink:-1') && G.money === m1 + 2 * Shop.PHOTO_PTS + Shop.DUO_PTS, 'one photo of each model each');
  e = run(G, 10); ok(G.over && has(e, 'over') && G.score === Math.round(G.money) && Shop.stars(G) >= 0, 'the end of the day'); }
{ const G = go(shop([], { time: 10 })); const e = run(G, 15); ok(G.over && !G.best.length && !has(e, 'show') && G.score === 0 && Shop.stars(G) === 0, 'nobody served: no show, no stars'); }
// ---- the shops
for (const def of OLEVELS) {
  const G = Shop.load(def), nr = def.map.join('').split('r').length - 1, styles = def.styles;
  const pieces = s => [0, 1, 2, 3].filter(p => G.racks.some(r => r.p === p && r.s === s));
  const bad = [];
  if (nr !== def.racks.length) bad.push('racks ' + nr + '/' + def.racks.length);
  if (!G.rooms.length || G.till.length < 1 || G.mach.length !== 2 || G.mach[0].dir === G.mach[1].dir || !G.doors.length || G.gateY < 0) bad.push('fittings');
  for (const s of styles) if (pieces(s).length < Math.min(...def.pieces) || !pieces(s).includes(0) || !pieces(s).includes(1)) bad.push('style ' + s + ' ' + pieces(s));
  for (const [x, y] of G.tillQ.map(q => q.map(v => Math.floor(v / T)))) if (Shop.solid(G, x, y)) bad.push('till queue ' + x + ',' + y);
  for (const id of ['pink', 'mint']) if (Shop.solid(G, Math.floor(G.p[id].x / T), Math.floor(G.p[id].y / T))) bad.push(id + ' start');
  ok(!bad.length, `shop ${def.name}: racks, rooms, till, machines, door, gate, and every style it sells has a top and a bottom` + (bad.length ? ' ' + bad.join(', ') : ''));
}
for (const def of OLEVELS) { const r = live(def, Object.assign({ seed: 3 }, P.tight)); ok(r.over && r.stars >= 1, `a careful pair runs ${def.name} for a day (${r.score}, served ${r.stats.served})`); }
// ---- two phones: pink plays on the host, mint on the guest
{ const def = shop([[10, 5, 'r'], [11, 5, 'r']], { racks: [[0, 0, 0], [1, 0, 2]] }), H = Shop.load(def), Gs = Shop.load(def), rq = { seen: -1, act: false, mx: 0, my: 0 };
  const toG = [], toH = []; let presses = 0; const hev = [];
  const lag = 6;
  const tick = (pinp, minp) => {
    Shop.step(Gs, { mint: minp, pink: { still: true } }, true);
    if (minp.act) presses++;
    toH.push(JSON.stringify(Shop.guestMsg(Gs, 'mint', minp, presses)));
    while (toH.length > lag) Shop.hostHears(H, 'mint', JSON.parse(toH.shift()), rq);
    hev.push(...Shop.step(H, { pink: pinp, mint: rq })); rq.act = false;
    toG.push(JSON.stringify(Shop.encode(H)));
    while (toG.length > lag) Shop.apply(Gs, JSON.parse(toG.shift()), 'mint');
  };
  for (let i = 0; i < (Shop.START + .2) / DT; i++) tick({}, {});
  ok(H.st === 'run' && Gs.st === 'run', 'online: both phones start');
  for (let i = 0; i < 1 / DT; i++) tick({ mx: 1 }, { mx: -1, my: -1 });
  ok(Math.abs(Gs.p.mint.x - H.p.mint.x) < 10 && Math.abs(Gs.p.pink.x - H.p.pink.x) < 10, 'online: both walk, and both phones agree');
  const bx = 11.5 * T, by = 6.5 * T;
  for (let i = 0; i < 12 / DT && Math.hypot(Gs.p.mint.x - bx, Gs.p.mint.y - by) > 3; i++) { const dx = bx - Gs.p.mint.x, dy = by - Gs.p.mint.y, d = Math.hypot(dx, dy); tick({}, { mx: dx / d, my: dy / d }); }
  for (let i = 0; i < 10; i++) tick({}, { my: -.3 });
  tick({}, { act: true }); for (let i = 0; i < 20; i++) tick({}, {});
  ok(H.p.mint.item === g(1, 0, 2, 1) && Gs.p.mint.item === g(1, 0, 2, 1) && hev.includes('take:mint:1') && Gs.racks[1].n === 2, 'online: a press on the guest takes from the rack on the host, and the guest sees it');
  H.nextC = H.rt; for (let i = 0; i < 4 / DT; i++) tick({}, {});
  ok(Gs.cust.length === 1 && Gs.cust[0].want.pieces.length === H.cust[0].want.pieces.length && Math.abs(Gs.cust[0].x - H.cust[0].x) < 20, 'online: the guest sees the customer and what they want');
  ok(JSON.stringify(Shop.encode(H)).length < 3000, `online: a small message (${JSON.stringify(Shop.encode(H)).length} bytes)`);
  const cv = H.cv.mint; Shop.hostHears(H, 'mint', { mx: 0, my: 0, a: presses, x: H.p.mint.x + 300, y: H.p.mint.y, cv }, rq); ok(H.cv.mint === cv + 1, 'online: a jump the host cannot believe is corrected');
  let threw = false; try { for (const m of [null, 5, 'x', {}, { p: 3, cv: 'a' }, { it: [[9, 1]], rk: 7, cu: [[1, 'a'], 5], mc: 'x', kd: [1], th: [1], bs: [[1]], p: [[1, 2, 99999]] }]) { Shop.apply(Gs, m, 'mint'); Shop.hostHears(H, 'mint', m, rq); } run(H, .1); for (let i = 0; i < 12; i++) Shop.step(Gs, {}, true); } catch (e) { threw = e; }
  ok(!threw && Number.isFinite(Gs.p.pink.x) && Number.isFinite(H.p.mint.x), 'online: junk messages are ignored' + (threw ? ' ' + threw : '')); }
console.log(fails ? fails + ' FAILED' : 'DRESS SHOP OK');
process.exit(fails ? 1 : 0);

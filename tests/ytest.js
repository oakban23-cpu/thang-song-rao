// Fishing rules: walking in the boat, casting and the depth, nibbles and bites, striking too soon or too late, the fight
// (reeling, thrashing, snapping, running off), the net for big fish (the other one scoops; yourself only when they are
// busy), giants (two on one rod), the bird, leaks and floods, tangles, old boots, dusk and the big net, the lakes, the
// bots, and two phones online.
const { run, Fish, YLEVELS, P } = require('./ybot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Fish.DT, BX = Fish.BX;
const lake = (extra = {}) => Object.assign({ name: 'test', hint: '', fishes: [0], pop: 0, time: 100, seed: 5, stars: [10, 20, 30] }, extra);
const fresh = extra => { const G = Fish.load(lake(extra)); G.spawnT = 1e9; for (let i = 0; i < Math.ceil(Fish.START / DT) + 1; i++) Fish.step(G, {}); G.spawnT = 1e9; return G; };
const steps = (G, inp, s) => { const ev = []; for (let i = 0; i < Math.round(s / DT); i++) ev.push(...Fish.step(G, typeof inp === 'function' ? inp(i) : inp)); return ev; };
const press = (G, id, extra = {}) => Fish.step(G, { [id]: Object.assign({ act: true }, extra) });
const has = (ev, k) => ev.some(e => e === k || e.startsWith(k + ':'));
// cast pink to the left, at full swing, and let it sink to its depth
function castOut(G, id = 'pink', depth) {
  const p = G.p[id]; if (depth) p.depth = depth;
  press(G, id); steps(G, {}, Fish.AIM_PERIOD / 2 - DT); const ev = press(G, id); steps(G, {}, 4);
  return ev;
}
function addFish(G, sp, x, y, extra = {}) { const f = Object.assign({ id: ++G.fid, sp, x, y, ty: y, dir: 1, st: 'swim', t: 0, n: 0, wary: 0, own: '', life: 99 }, extra); G.fish.push(f); return f; }
// a fish already at pink's hook, about to nibble n times and bite
function onHook(G, sp, n = 0, id = 'pink') { const L = G.p[id].line, f = addFish(G, sp, L.hx, L.hy, { st: 'nib', n, t: .1, own: id }); L.fid = f.id; return f; }
function hooked(G, sp, id = 'pink') {
  const f = onHook(G, sp, 0, id); let ev = [];
  for (let i = 0; i < 200 && !has(ev, 'bite'); i++) ev = ev.concat(Fish.step(G, {}));
  press(G, id); return f;
}

{ // the start
  const G = Fish.load(lake()); const ev = steps(G, {}, Fish.START + .05);
  ok(G.st === 'run' && has(ev, 'go'), 'the count runs into fishing');
}
{ // walking in the boat
  const G = fresh(), p = G.p.pink, x0 = p.x;
  steps(G, { pink: { mx: 1 } }, .5); ok(p.x > x0 + 40 && p.face === 1 && p.mv, 'walk right, face right');
  steps(G, { pink: { mx: -1 } }, 6); ok(Math.abs(p.x - (BX - Fish.BHALF)) < 1 && p.face === -1, 'the boat ends at the bow');
}
{ // casting
  const G = fresh(), p = G.p.pink, L = p.line;
  press(G, 'pink'); ok(L.st === 'aim', 'press: the rod swings back');
  steps(G, {}, Fish.AIM_PERIOD / 2 - DT); ok(Fish.aimPower(L) > .95, 'the swing peaks half way round');
  const ev = press(G, 'pink'); ok(L.st === 'sink' && has(ev, 'cast'), 'press again: the line flies out');
  ok(L.hx < BX - Fish.OUT && L.hx > 20, 'a full swing lands far out on the facing side: ' + Math.round(L.hx));
  steps(G, {}, 4); ok(L.st === 'wait' && Math.abs(L.hy - p.depth) < 1, 'the hook sinks to its depth');
  const x = p.x; steps(G, { pink: { mx: 1 } }, .5); ok(p.x === x, 'no walking with the line out');
  const d0 = p.depth; steps(G, { pink: { my: 1 } }, .5); ok(p.depth > d0 + 40 && L.hy > d0 + 30, 'down: the hook goes deeper');
  steps(G, { pink: { my: 1 } }, 5); ok(p.depth === Fish.DMAX, 'not through the bottom');
  const ev2 = press(G, 'pink'); ok(L.st === 'none' && has(ev2, 'reelin'), 'press with nothing on: reel in');
  const G2 = fresh(), L2 = G2.p.pink.line; press(G2, 'pink'); steps(G2, {}, .05); press(G2, 'pink');
  ok(Math.abs(L2.hx - BX) >= Fish.OUT - 1, 'a weak swing still lands clear of the boat');
}
{ // nibbles and bites
  const G = fresh(); castOut(G); const L = G.p.pink.line, f = onHook(G, 0, 2);
  let ev = []; for (let i = 0; i < 400 && !has(ev, 'bite'); i++) ev = ev.concat(Fish.step(G, {}));
  ok(ev.filter(e => e.startsWith('nibble')).length === 2 && has(ev, 'bite') && L.biteT > 0, 'two nibbles, then the bite');
  press(G, 'pink'); ok(L.st === 'fight' && f.st === 'hooked', 'strike on the bite: hooked');
  const G2 = fresh(); castOut(G2); const L2 = G2.p.pink.line, f2 = onHook(G2, 0, 3);
  let e2 = []; for (let i = 0; i < 400 && !has(e2, 'nibble'); i++) e2 = e2.concat(Fish.step(G2, {}));
  const e3 = press(G2, 'pink'); ok(has(e3, 'spook') && f2.st === 'flee' && L2.fid < 0 && L2.st === 'wait', 'strike on a nibble: the fish is scared off, the hook stays');
  const G3 = fresh(); castOut(G3); const f3 = onHook(G3, 0, 0);
  const e4 = steps(G3, {}, 1.5); ok(has(e4, 'missed') && f3.st === 'flee' && G3.stats.missed === 1, 'too slow on the bite: it gets away');
}
{ // fish come to a hook by themselves
  const G = fresh(); castOut(G); const L = G.p.pink.line;
  const f = addFish(G, 0, L.hx + 60, L.hy + 10, { dir: -1 });
  let ev = []; for (let i = 0; i < 30 / DT && !has(ev, 'bite'); i++) ev = ev.concat(Fish.step(G, {}));
  ok(has(ev, 'bite') && L.fid === f.id, 'a fish nearby finds the hook and bites');
  const G2 = fresh(); castOut(G2, 'pink', 300); const L2 = G2.p.pink.line; addFish(G2, 3, L2.hx + 30, 495);
  const e2 = steps(G2, {}, 6); ok(!has(e2, 'bite') && L2.fid < 0, 'a fish far deeper than the hook does not notice it');
}
{ // the fight: small fish
  const G = fresh(); castOut(G); const L = G.p.pink.line; hooked(G, 0);
  const d0 = L.d; steps(G, { pink: { use: true } }, .3); ok(L.d < d0 - 10, 'hold: reel in');
  let ev = [], t = 0;
  for (let i = 0; i < 40 / DT && L.st === 'fight'; i++) ev = ev.concat(Fish.step(G, { pink: { use: !L.thr && L.ten < 70 } })), t += DT;
  ok(has(ev, 'land') && G.money === 10 && G.bucket[0] === 0 && G.stats.fish === 1, 'a small fish reeled all the way lands in the boat (+10)');
  ok(has(ev, 'thrash'), 'it thrashes now and then on the way');
  const G2 = fresh(); castOut(G2); const L2 = G2.p.pink.line; hooked(G2, 0);
  const e2 = steps(G2, { pink: { use: true } }, 30);
  ok(has(e2, 'snap') && L2.st === 'none' && G2.stats.snaps === 1, 'holding on through the thrashing snaps the line');
  const G3 = fresh(); castOut(G3); const L3 = G3.p.pink.line; hooked(G3, 4); L3.thr = true; L3.thrT = 99;
  const e3 = steps(G3, {}, 12); ok(has(e3, 'escape') && G3.stats.escapes === 1, 'letting a thrashing fish run: it takes the line and goes');
  const G4 = fresh(); castOut(G4); const L4 = G4.p.pink.line; hooked(G4, 0); L4.thr = true; L4.thrT = 99; L4.ten = 50;
  steps(G4, {}, .5); ok(L4.ten < 30, 'letting go eases the line');
}
const reelTo = (G, id, pred, s = 40, extra = () => ({})) => { const L = G.p[id].line; let ev = []; for (let i = 0; i < s / DT && !pred(); i++) ev = ev.concat(Fish.step(G, Object.assign({ [id]: { use: !L.thr && L.ten < 70 } }, extra(i)))); return ev; };
{ // big fish: the net
  const G = fresh(); castOut(G); const L = G.p.pink.line; hooked(G, 2);
  const ev = reelTo(G, 'pink', () => L.st === 'surface');
  ok(has(ev, 'surface') && L.st === 'surface' && G.money === 0, 'a big fish comes up beside the boat but is not in yet');
  press(G, 'pink'); ok(L.st === 'surface', 'the one holding the rod cannot scoop it');
  const m = G.p.mint; m.x = Fish.netX(G.p.pink) + 40;
  const e2 = press(G, 'mint'); ok(has(e2, 'netted:mint') && G.money === 30 && G.stats.netted === 1 && G.stats.big === 1, 'the other scoops it with the net (+30)');
  const G2 = fresh(); castOut(G2); const L2 = G2.p.pink.line; hooked(G2, 2); reelTo(G2, 'pink', () => L2.st === 'surface');
  G2.p.mint.x = BX + 100; const e3 = press(G2, 'mint'); ok(L2.st === 'surface' && !has(e3, 'netted'), 'too far from it: no scoop');
  const e4 = steps(G2, {}, Fish.NET_T + .1); ok(has(e4, 'dive') && L2.st === 'fight' && L2.d > 100, 'not scooped in time: it dives again');
  const G3 = fresh(); castOut(G3); castOut(G3, 'mint'); const L3 = G3.p.pink.line; hooked(G3, 2); hooked(G3, 0, 'mint');
  G3.p.mint.line.thrT = 99; G3.p.mint.line.thr = false;
  reelTo(G3, 'pink', () => L3.st === 'surface');
  const e5 = press(G3, 'pink'); ok(has(e5, 'netted:pink') && G3.money === 30, 'when the other has a fish on too, you can scoop your own');
}
{ // giants
  const G = fresh(); castOut(G); const L = G.p.pink.line; hooked(G, 6); L.thrT = 99; L.thr = false;
  const d0 = L.d; steps(G, { pink: { use: true } }, 2); const alone = d0 - L.d;
  const m = G.p.mint; m.x = G.p.pink.x + 30; const d1 = L.d;
  steps(G, { pink: { use: true }, mint: { use: true } }, 2); const both = d1 - L.d;
  ok(alone < 20 && both > 150, `a giant hardly moves for one (${Math.round(alone)}), comes in for two (${Math.round(both)})`);
  ok(L.help, 'the screen knows the other is pulling');
  const G2 = fresh(); castOut(G2); const L2 = G2.p.pink.line; hooked(G2, 6); L2.thrT = 99; L2.thr = false; castOut(G2, 'mint'); G2.p.mint.x = G2.p.pink.x + 30;
  const d2 = L2.d; steps(G2, { pink: { use: true }, mint: { use: true } }, 2); ok(d2 - L2.d < 20, 'not with their own line out');
  const G3 = fresh(); castOut(G3); const L3 = G3.p.pink.line; hooked(G3, 6); G3.p.mint.x = G3.p.pink.x + 30;
  reelTo(G3, 'pink', () => L3.st === 'surface', 60, () => ({ mint: { use: true } }));
  G3.p.mint.x = Fish.netX(G3.p.pink) + 30; const e = press(G3, 'mint');
  ok(has(e, 'netted:mint') && G3.money === 120 && G3.stats.giants === 1, 'pulled in together and scooped: +120');
}
{ // the bird
  const G = fresh({ birds: [1] }); G.bucket = [0, 6, 1]; G.money = 142;
  const ev = steps(G, {}, 1 + Fish.BIRD_FLY + .1); ok(has(ev, 'bird') && G.bird.st === 'sit', 'a bird flies in and sits on the bucket');
  const e2 = steps(G, {}, Fish.BIRD_SIT); ok(has(e2, 'stolen:1') && G.money === 130 && G.bucket.join() === '0,6', 'left alone it takes the last small fish (not the giant)');
  const G2 = fresh({ birds: [1] }); G2.bucket = [0]; G2.money = 10;
  steps(G2, {}, 1 + Fish.BIRD_FLY + .1); G2.p.pink.x = BX + 20;
  const e3 = press(G2, 'pink'); ok(has(e3, 'shoo:pink') && G2.bird.st === 'out', 'press beside the bucket: shoo');
  steps(G2, {}, 5); ok(!G2.bird && G2.money === 10, 'it flies off with nothing');
  const G3 = fresh({ birds: [1] }); steps(G3, {}, 1 + Fish.BIRD_FLY + .1); G3.p.pink.x = BX - 100; const e4 = press(G3, 'pink');
  ok(!has(e4, 'shoo') && G3.p.pink.line.st === 'aim', 'from the far end of the boat the press is a cast');
}
{ // leaks
  const G = fresh({ leaks: [1] }); const ev = steps(G, {}, 1.1); ok(has(ev, 'leak') && G.leaks.length === 1, 'the boat springs a leak');
  steps(G, {}, 5); ok(G.water > 10, 'the water comes in: ' + Math.round(G.water));
  const l = G.leaks[0]; G.p.pink.x = l.x; const e2 = steps(G, { pink: { use: true } }, Fish.PLUG_T + .05);
  ok(has(e2, 'plug:pink') && !G.leaks.length, 'stand on it and hold: plugged');
  const w = G.water; steps(G, {}, 2); ok(G.water < w, 'with no leak the water goes down');
  const G2 = fresh({ leaks: [1, 1.5, 2] }); G2.money = 50; const e3 = steps(G2, {}, 30);
  ok(has(e3, 'flood') && G2.money === 50 - Fish.FLOOD_PTS && G2.water < 100 && !G2.leaks.length, 'left leaking it floods: points lost, bailed out');
  const G3 = fresh(); G3.water = 80; const x = G3.p.pink.x; steps(G3, { pink: { mx: 1 } }, .5); const slow = G3.p.pink.x - x;
  const G4 = fresh(); const x4 = G4.p.pink.x; steps(G4, { pink: { mx: 1 } }, .5); ok(slow < G4.p.pink.x - x4, 'wading through water is slower');
}
{ // tangles
  const G = fresh(); G.p.mint.x = BX - 100; G.p.mint.face = -1; castOut(G, 'pink'); press(G, 'mint'); steps(G, {}, Fish.AIM_PERIOD / 2 - DT); const ev = press(G, 'mint').concat(steps(G, {}, 2));
  ok(has(ev, 'tangle') && G.tangle && G.p.pink.line.st === 'tangle', 'two lines in the same spot tangle');
  press(G, 'pink'); press(G, 'pink'); ok(G.tangle.n === 1, 'pressing twice running does not help');
  let e2 = []; for (let i = 0; i < 5; i++) e2 = e2.concat(press(G, i % 2 ? 'pink' : 'mint'));
  ok(has(e2, 'untangled') && !G.tangle && G.p.pink.line.st === 'none' && G.p.mint.line.st === 'none', 'pressing in turns undoes it');
  const G2 = fresh(); castOut(G2, 'pink'); castOut(G2, 'mint'); ok(!G2.tangle, 'casting off different ends: no tangle');
}
{ // old boots
  const G = fresh({ junk: 0 }); G.junk = [BX - 300]; G.p.pink.x = BX - Fish.BHALF;
  press(G, 'pink'); const need = (300 - Fish.BHALF - Fish.TIP - Fish.CAST_MIN) / (Fish.CAST_MAX - Fish.CAST_MIN), at = Math.acos(1 - 2 * need) / (2 * Math.PI) * Fish.AIM_PERIOD;
  steps(G, {}, at - DT); press(G, 'pink'); G.p.pink.depth = Fish.DMAX; const L = G.p.pink.line;
  const ev = steps(G, {}, 7); ok(has(ev, 'bite') && !G.junk.length, 'a hook on the bottom by an old boot snags it: ' + Math.round(L.hx));
  press(G, 'pink'); const e2 = steps(G, { pink: { use: true } }, 10); ok(has(e2, 'land') && G.money === 3 && G.stats.junk === 1, 'it comes up without a fight: a boot (+3)');
}
{ // dusk and the big net
  const G = fresh({ time: 12, shoal: 10 }); castOut(G, 'pink'); hooked(G, 0); G.p.pink.line.thrT = 99; G.p.pink.line.thr = false;
  castOut(G, 'mint'); const ev = steps(G, {}, 7);
  ok(has(ev, 'dusk') && G.st === 'dusk' && G.p.mint.line.st === 'none', 'dusk: lines without a fish come in');
  ok(G.p.pink.line.st === 'fight', 'a fish on the line is still played');
  const L = G.p.pink.line; reelTo(G, 'pink', () => G.st === 'net', 30);
  ok(G.st === 'net' && G.money === 10, 'when it is in, out comes the big net');
  steps(G, {}, Fish.NET_IN + .5); ok(G.toss.ph === 'wait' && Math.abs(G.p.pink.x - (BX - 34)) < 2, 'the two of them take a side of the net each');
  const at = () => { const n = G.toss; let best = 0, bd = 1e9; for (let k = 0; k < 900; k++) { const t = n.t + k * DT, d = Math.abs(Fish.shoalX(Object.assign({}, G, { toss: Object.assign({}, n, { t }) })) - BX); if (d < bd) { bd = d; best = k; } } return best; };
  steps(G, {}, at() * DT - DT); const m0 = G.money; press(G, 'pink'); const e2 = press(G, 'mint');
  ok(has(e2, 'throw:10:1') && G.money === m0 + 10 * Fish.NET_PTS, 'together as the shoal passes under the boat: the whole shoal (+60)');
  steps(G, {}, Fish.NET_PULL + .5); steps(G, {}, at() * DT - DT - Fish.NET_SYNC); const m1 = G.money; press(G, 'pink'); const e3 = steps(G, {}, Fish.NET_SYNC + .05);
  ok(has(e3, 'throw:5:0') && G.money === m1 + 30, 'only one pulls: the net opens half way');
  steps(G, {}, Fish.NET_PULL + .5); const n0 = G.toss.t; let k = 0; while (Math.abs(Fish.shoalX(G) - BX) < Fish.NET_RING + 40 && k++ < 2000) Fish.step(G, {});
  press(G, 'pink'); const e4 = press(G, 'mint'); ok(has(e4, 'throw:0:1'), 'with the shoal off to one side the net comes up empty'); void n0;
  const e5 = steps(G, {}, Fish.NET_PULL + 2); ok(G.over && has(e5, 'over') && G.score === G.money && Fish.stars(G) > 0, 'three throws and the day is done');
}
{ // the lakes
  ok(YLEVELS.length === 5, 'five lakes');
  for (const d of YLEVELS) ok(d.name && d.hint && d.stars[0] < d.stars[1] && d.stars[1] < d.stars[2] && d.fishes.every(s => Fish.SP[s] && Fish.SP[s].sz !== 'g'), d.name + ': names, hint, stars in order, ordinary fish');
  ok(YLEVELS.slice(1).every(d => d.giants.length), 'a giant comes to every lake after the first');
  ok(YLEVELS[4].giants.some(g => g[1] === 7), 'the old giant of the lake is in the last one');
}
{ // what the button would do
  const G = fresh(); ok(Fish.target(G, 'pink') === 'none', 'idle: cast');
  castOut(G); hooked(G, 2); reelTo(G, 'pink', () => G.p.pink.line.st === 'surface');
  ok(Fish.target(G, 'mint') === 'goscoop', 'the other is told to go and scoop');
  G.p.mint.x = Fish.netX(G.p.pink) + 30; ok(Fish.target(G, 'mint') === 'scoop', 'and when close: scoop');
}
{ // online: the host's picture of the lake arrives whole; junk is ignored; the guest's presses and holding come through
  const G = fresh({ birds: [1], leaks: [1] }); castOut(G); hooked(G, 2); steps(G, { pink: { use: true } }, 3); G.bucket = [0, 1];
  const m = JSON.parse(JSON.stringify(Fish.encode(G))), H = fresh();
  Fish.apply(H, m, 'mint');
  ok(H.p.pink.line.st === G.p.pink.line.st && Math.abs(H.p.pink.line.d - G.p.pink.line.d) < .2 && H.fish.length === G.fish.length && H.bucket.join() === '0,1' && H.leaks.length === 1 && !!H.bird, 'the guest sees what the host sees');
  const J = fresh(); Fish.apply(J, { t: 'x', p: [[1e9, 5, 'q'], 7], f: [[1, 99]], bd: [9, 'a'], lk: 'zz', nt: [99], s: { fish: 'many' }, cv: [0, 0] }, 'mint');
  ok(J.p.pink.x <= BX + Fish.BHALF && J.fish.length === 0 && J.stats.fish === 0 && Number.isFinite(J.t), 'nonsense from the other phone is ignored');
  const rq = { seen: -1, mx: 0, my: 0, act: false, use: false };
  const K = fresh(); Fish.hostHears(K, 'mint', Fish.guestMsg(K, 'mint', { mx: 1, use: true }, 0), rq);
  Fish.hostHears(K, 'mint', Fish.guestMsg(K, 'mint', { mx: 1, use: true }, 1), rq);
  ok(rq.act && rq.use && rq.mx === 1, 'a guest press and a held button arrive');
  const x = K.p.mint.x; Fish.hostHears(K, 'mint', Object.assign(Fish.guestMsg(K, 'mint', {}, 1), { x: x - 200 }), rq);
  ok(K.p.mint.x === x && K.cv.mint === 1, 'a guest too far from where the host has them is put back');
}
{ // the bots
  const r = run(YLEVELS[1], Object.assign({ seed: 3 }, P.tight));
  ok(r.over && r.stats.giants >= 1 && r.stats.netted >= 1 && r.stats.netFish > 0, 'a careful pair lands a giant together, nets big fish and throws the big net');
  const solo = run(YLEVELS[1], { seed: 3, only: 'pink' });
  ok(solo.stats.giants === 0 && solo.stars < 3, 'one alone lands no giant');
}
console.log(fails ? fails + ' FAILED' : 'FISHING OK');
process.exit(fails ? 1 : 0);

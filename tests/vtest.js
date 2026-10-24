// Moving-house rules: two-person lifting, carrying as one rigid piece (moving, turning, walls), setting down on the
// outline, the shrine that must face the right way, small things one person carries, dents, rain, the tip for
// finishing early, every house solvable and never sealing anyone in, and two phones online.
const { move, crew, planItem, planWalk, Mov, VLEVELS, rng } = require('./vbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const T = Mov.T;
const open = { name: 't', time: 999, map: Array.from({ length: 11 }, (_, y) => (y === 0 || y === 10 ? '#'.repeat(20) : '#' + '.'.repeat(18) + '#')), spawn: { pink: [3, 5], mint: [6, 5] }, zones: { Z: [12, 1, 18, 9] }, items: [], stars: [1, 2, 3] };
const run = (G, n, inp) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...Mov.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const tap = (G, w) => Mov.step(G, { [w]: { act: true } });
function lifted(k = 'sofa', at = [8, 5, 0], to = [14, 5, 0], extra = {}) {
  const def = Object.assign({}, open, { items: [{ k, at, to }] }, extra), G = Mov.load(def), it = G.items[0];
  const [ax, ay] = Mov.handle(it, 0), [bx, by] = Mov.handle(it, 1);
  G.p.pink.x = ax; G.p.pink.y = ay; G.p.mint.x = bx; G.p.mint.y = by;
  return G;
}

{ const G = lifted(), it = G.items[0];
  const e1 = tap(G, 'pink');
  ok(e1.includes('grab:pink:0') && it.st === 'wait', 'one player takes an end: it is too heavy to move alone');
  const x0 = it.x; run(G, 60, { pink: { mx: 1, my: 0 } });
  ok(it.x === x0 && G.p.pink.hold === 0, 'pushing alone does nothing');
  const e2 = tap(G, 'mint');
  ok(e2.includes('lift:mint:0') && it.st === 'carried', 'the partner takes the other end: lifted');
  run(G, 60, { pink: { mx: 0, my: 1 }, mint: { mx: 0, my: 1 } });
  ok(Math.abs(it.y - 5 * T - Mov.CARRY * Mov.KINDS.sofa.speed * .5) < 2 && Math.abs(it.a) < 1e-6, `both walking the same way carry it along (${(it.y - 5 * T).toFixed(0)} px)`);
  const a0 = it.a; run(G, 60, { pink: { mx: 0, my: -1 }, mint: { mx: 0, my: 1 } });
  ok(Math.abs(it.a - a0) > 0.3, `opposite ways across it turns it (${((it.a - a0) * 57.3).toFixed(0)} degrees)`);
  const x1 = it.x, y1 = it.y, a1 = it.a, ux = Math.cos(it.a) * (it.pinkEnd ? 1 : -1), uy = Math.sin(it.a) * (it.pinkEnd ? 1 : -1);
  run(G, 60, { pink: { mx: ux, my: uy }, mint: { mx: -ux, my: -uy } });
  ok(Math.hypot(it.x - x1, it.y - y1) < 1 && Math.abs(it.a - a1) < .05, 'pulling apart along it goes nowhere');
  const [hx, hy] = Mov.handle(it, it.pinkEnd); ok(Math.hypot(G.p.pink.x - hx, G.p.pink.y - hy) < 1e-6, 'the carriers stay at their ends'); }
{ const G = lifted('sofa', [8, 5, 0], [14, 5, 0]), it = G.items[0];
  tap(G, 'pink'); tap(G, 'mint');
  let bad = 0; const R = rng(3);
  for (let i = 0; i < 3000; i++) { const q = i % 40 === 0 ? [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1, R() * 2 - 1] : null; if (q) G._q = q; run(G, 1, { pink: { mx: G._q[0], my: G._q[1] }, mint: { mx: G._q[2], my: G._q[3] } }); if (!Mov.poseFree(G, 0, it.x, it.y, it.a)) bad++; }
  ok(bad === 0, 'pushed about at random for 25 seconds, the sofa never goes into a wall'); }
{ const G = lifted(), it = G.items[0];
  tap(G, 'pink'); tap(G, 'mint');
  for (let i = 0; i < 2000 && it.x < 14 * T - 1; i++) run(G, 1, { pink: { mx: Math.min(1, (14 * T - it.x) / 4), my: 0 }, mint: { mx: Math.min(1, (14 * T - it.x) / 4), my: 0 } });
  const e = tap(G, 'pink');
  ok(e.includes('deliver:0') && it.st === 'placed' && G.money - G.tip === Mov.KINDS.sofa.value && it.x === 14 * T && G.p.pink.hold === -1 && G.p.mint.hold === -1, 'set down on its outline: delivered for its full value, and both let go'); }
{ const G = lifted(), it = G.items[0];
  tap(G, 'pink'); tap(G, 'mint'); run(G, 120, { pink: { mx: 1, my: 0 }, mint: { mx: 1, my: 0 } });
  const e = tap(G, 'mint');
  ok(e.includes('down:0') && it.st === 'floor' && G.money === 0, 'set down short of its outline: just put down');
  const e2 = tap(G, 'mint'); ok(e2.some(x => x.startsWith('grab')), 'and can be picked up again'); }
{ const G = lifted('shrine', [8, 5, 180], [14, 5, 0]), it = G.items[0];
  const push = (H, X) => { const q = H.items[0]; for (let i = 0; i < 2000 && q.x < 14 * T - 1; i++) run(H, 1, { pink: { mx: Math.min(1, (14 * T - q.x) / 4), my: 0 }, mint: { mx: Math.min(1, (14 * T - q.x) / 4), my: 0 } }); void X; };
  tap(G, 'pink'); tap(G, 'mint'); push(G);
  const e = tap(G, 'pink');
  ok(Math.abs(it.x - 14 * T) < 20 && e.includes('down:0') && it.st === 'floor', 'the shrine set down facing backwards does not count');
  const S = lifted('shrine', [8, 5, 0], [14, 5, 0]); tap(S, 'pink'); tap(S, 'mint'); push(S);
  ok(tap(S, 'pink').includes('deliver:0'), 'facing the right way it does'); }
{ const def = Object.assign({}, open, { items: [{ k: 'box', at: [4, 5], zone: 'Z' }, { k: 'tv', at: [4, 7], zone: 'Z' }] }), G = Mov.load(def);
  G.p.pink.x = 4 * T + 20; G.p.pink.y = 5 * T;
  ok(tap(G, 'pink').includes('pick:pink:0') && G.items[0].st === 'held', 'one player picks up a box');
  run(G, 120, { pink: { mx: 1, my: 0 } });
  ok(Math.hypot(G.items[0].x - G.p.pink.x, G.items[0].y - G.p.pink.y) < 8 && G.p.pink.x > 7 * T, 'and walks off with it');
  ok(tap(G, 'pink').includes('drop:pink') && G.items[0].st === 'floor', 'putting it down outside its room is just putting it down');
  tap(G, 'pink'); run(G, 240, { pink: { mx: 1, my: 0 } });
  ok(tap(G, 'pink').includes('deliver:0') && G.items[0].st === 'placed' && G.money === 50, 'inside its room: delivered');
  ok(!Mov.KINDS.box.two && Mov.spotFree(G, G.items[0].x, G.items[0].y, -1), 'and a delivered box never blocks the way'); }
{ const G = lifted(), it = G.items[0];
  tap(G, 'pink'); tap(G, 'mint');
  run(G, 360, { pink: { mx: 0, my: -1 }, mint: { mx: 0, my: -1 } });
  ok(it.dmg > 0 && Mov.worth(it) < Mov.KINDS.sofa.value && G.stats.bumps > 1, `driving it into the wall dents it (${it.dmg.toFixed(0)}% damage)`);
  const M = lifted('mirror'), mi = M.items[0]; tap(M, 'pink'); tap(M, 'mint'); run(M, 360, { pink: { mx: 0, my: -1 }, mint: { mx: 0, my: -1 } });
  ok(mi.dmg > it.dmg * 2.5, `a mirror dents far more (${mi.dmg.toFixed(0)}%)`);
  const S = lifted(), si = S.items[0]; tap(S, 'pink'); tap(S, 'mint'); S.items[0].y = 5 * T;
  run(S, 200, { pink: { mx: 1, my: -.25 }, mint: { mx: 1, my: -.25 } }); run(S, 300, { pink: { mx: 1, my: -.08 }, mint: { mx: 1, my: -.08 } });
  ok(si.dmg === 0, 'sliding along a wall at a shallow angle does not dent it'); }
{ const def = Object.assign({}, open, { items: [{ k: 'tv', at: [4, 5], zone: 'Z' }] }), G = Mov.load(def);
  G.p.pink.x = 4 * T + 20; G.p.pink.y = 5 * T; tap(G, 'pink');
  run(G, 360, { pink: { mx: 0, my: -1 } });
  ok(G.items[0].dmg > 5, `running into a wall with the TV dents it (${G.items[0].dmg.toFixed(0)}%)`); }
{ const def = Object.assign({}, open, { rain: 10, map: open.map.map((r, y) => (y > 0 && y < 10 ? '#,,,,' + r.slice(5) : r)), items: [{ k: 'box', at: [2.5, 5], zone: 'Z' }, { k: 'box', at: [10, 5], zone: 'Z' }] }), G = Mov.load(def);
  run(G, 9 * 120); const d9 = G.items[0].dmg;
  run(G, 10 * 120);
  ok(d9 === 0 && G.items[0].dmg > 10 && G.items[1].dmg === 0, `in the rain, a box left outside gets wet after ten seconds (${G.items[0].dmg.toFixed(0)}%), one inside stays dry`); }
{ const r = move(VLEVELS[0], { seed: 1, jit: .05, think: .1 });
  const tip = Math.max(0, Math.round((VLEVELS[0].time - r.G.t) * Mov.TIP));
  ok(r.done && r.G.over && r.G.tip === tip && r.money === r.G.items.reduce((s, it) => s + Mov.worth(it), 0) + tip, `finishing early adds a tip (${r.G.t.toFixed(0)} s, tip ฿${r.G.tip})`);
  const G = Mov.load(VLEVELS[0]); run(G, Math.round(VLEVELS[0].time / Mov.DT) + 2); ok(G.over && !G.done && Mov.stars(G) === 0, 'time runs out: whatever is delivered is what you get'); }
// every house: everything can be moved, nothing starts or ends inside a wall, and with everything in place nobody is sealed in
for (const def of VLEVELS) {
  const G = Mov.load(def); let ok1 = true;
  G.items.forEach((it, i) => { if (!(Mov.KINDS[it.k].two ? Mov.poseFree(G, i, it.x, it.y, it.a) : Mov.spotFree(G, it.x, it.y, i))) ok1 = false; });
  for (const w of ['pink', 'mint']) if (!Mov.spotFree(G, G.p[w].x, G.p[w].y, -1)) ok1 = false;
  let paths = 0;
  G.items.forEach((it, i) => { if (!Mov.KINDS[it.k].two) return; const p = planItem(G, i, it.to); if (p) { paths++; it.x = it.to[0]; it.y = it.to[1]; it.a = it.to[2]; it.st = 'placed'; } });
  const big = G.items.filter(it => Mov.KINDS[it.k].two).length;
  // flood the floor from where pink starts, with everything in place
  const S = 8, seen = new Set(), q = [[Math.round(G.p.pink.x / S), Math.round(G.p.pink.y / S)]]; seen.add(q[0].join());
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && Mov.spotFree(G, (x + dx) * S, (y + dy) * S, -1)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  let free = 0; for (let y = 0; y <= 528 / S; y++) for (let x = 0; x <= 960 / S; x++) if (Mov.spotFree(G, x * S, y * S, -1)) free++;
  const zonesOk = Object.entries(def.zones).every(([z, r]) => { let n = 0; for (let y = r[1] * T + 30; y <= (r[3] + 1) * T - 30; y += 8) for (let x = r[0] * T + 30; x <= (r[2] + 1) * T - 30; x += 8) if (seen.has(Math.round(x / S) + ',' + Math.round(y / S))) n++; return n > 0; });
  ok(ok1 && paths === big && seen.size >= free * 0.9 && zonesOk, `${def.name}: starts clear, all ${big} pieces of furniture have a way in, and with everything in place ${Math.round(seen.size / free * 100)}% of the floor is still reachable`);
}
for (const [li, def] of VLEVELS.entries()) { const r = move(def, { seed: 3 + li, jit: .05, think: .1 }); ok(r.done && r.stars === 3, `${def.name}: a careful crew moves it all in ${r.G.t.toFixed(0)} s for ฿${r.money}`); }

// online, as the phones do it: the guest walks its own player at once and sends its stick, its presses and where it is;
// the host takes that position (walking alone) or the stick (carrying together) and runs the house; snapshots go back.
// The crew plans on the host's game but sees the guest's player where the guest sees it.
for (const [li, lat] of [[0, 0.1], [1, 0.15], [4, 0.2]]) {
  const def = VLEVELS[li], G = Mov.load(def), U = Mov.load(def), think = crew(G, { seed: 11, jit: .05, think: .2, soft: 14, tol: 10 });
  const toHost = [], toGuest = [], rq = { mx: 0, my: 0, act: false, seen: -1 };
  let t = 0, presses = 0, n = 0, pulled = 0, worst = 0;
  const big = (X, w) => X.p[w].hold >= 0 && Mov.KINDS[X.items[X.p[w].hold].k].two;
  while (!G.over && t < def.time + 1) {
    t += Mov.DT; n++;
    const P = G.p.mint, keep = [P.x, P.y];
    if (!big(G, 'mint')) { P.x = U.p.mint.x; P.y = U.p.mint.y; }
    const inp = think();
    P.x = keep[0]; P.y = keep[1];
    // guest
    if (inp.mint.act) presses++;
    Mov.guestStep(U, 'mint', inp.mint.mx, inp.mint.my);
    if (n % 4 === 0) toHost.push({ at: t + lat, m: JSON.parse(JSON.stringify(Mov.guestMsg(U, 'mint', inp.mint, presses))) });
    // host
    while (toHost.length && toHost[0].at <= t) Mov.hostHears(G, 'mint', toHost.shift().m, rq);
    Mov.step(G, { pink: inp.pink, mint: { mx: rq.mx, my: rq.my, act: rq.act } });
    rq.act = false;
    if (n % 4 === 0) toGuest.push({ at: t + lat, m: JSON.parse(JSON.stringify(Mov.encode(G))) });
    // walking alone, the guest's own player is never yanked back by an old snapshot
    while (toGuest.length && toGuest[0].at <= t) {
      const was = [U.p.mint.x, U.p.mint.y], wasBig = big(U, 'mint');
      Mov.apply(U, toGuest.shift().m, 'mint');
      const jump = Math.hypot(U.p.mint.x - was[0], U.p.mint.y - was[1]);
      if (!wasBig && !big(U, 'mint') && jump > 0.5) { pulled++; worst = Math.max(worst, jump); }
    }
  }
  Mov.apply(U, JSON.parse(JSON.stringify(Mov.encode(G))), 'mint');
  ok(G.done, `${def.name} online, ${lat * 1000} ms each way: moved in ${G.t.toFixed(0)} s for ฿${G.money} (${Mov.stars(G)} stars)`);
  ok(pulled === 0, `the guest walks freely, never pulled back (${pulled} jumps, worst ${worst.toFixed(0)} px)`);
  ok(U.money === G.money && U.items.every((it, i) => it.st === G.items[i].st && Math.abs(it.x - G.items[i].x) < .1), 'and the guest sees the same house');
}
{ const G = Mov.load(VLEVELS[0]); let thrown = null;
  for (const junk of [null, 5, {}, { it: 3 }, { it: [[1, 2]] }, { it: VLEVELS[0].items.map(() => ['x', null, 9, 77]), p: [[1e9, 'q', 99]] }]) { try { Mov.apply(G, junk, 'mint'); Mov.step(G, { mint: { mx: NaN, my: 1, act: true } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.p.pink.x, G.p.mint.x, G.p.mint.y].every(Number.isFinite), 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'MOVING OK');
process.exit(fails ? 1 : 0);

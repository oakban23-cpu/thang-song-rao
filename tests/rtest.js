// Rules checks for the driving mode.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'drive.js'), 'utf8') + ';this.Drv=Drv;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'rlevels.js'), 'utf8') + ';this.RLEVELS=RLEVELS;', ctx);
const { Drv, RLEVELS } = ctx;
const K = Drv.K;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const run = (G, inp, s) => { const ev = []; for (let i = 0; i < Math.round(s * 60); i++) ev.push(...Drv.step(G, typeof inp === 'function' ? inp(i) : inp)); return ev; };
const at = (G, x, y, a = 0) => { Object.assign(G.car, { x: (x + 0.5) * K, y: (y + 0.5) * K, a, vx: 0, vy: 0, steer: 0, stun: 0, safe: 0 }); };
const quiet = G => { G.spawnT = 1e9; G.traffic = []; G.chickens = []; };

for (const def of RLEVELS) {
  const G = Drv.load(def);
  ok(def.map.length === 18 && def.map.every(r => r.length === 32) && def.tips.length === 3, `${def.name}: map is 32×18 with three tips`);
  ok(G.shops.length >= 2 && G.houses.length >= 4 && Object.values(G.dist).every(d => d > 0 && d < 80), `${def.name}: shops and houses all join up by road (${G.shops.length} shops, ${G.houses.length} houses)`);
  ok(G.spots.every(s => def.shops[s.key] || def.houses[s.key]), `${def.name}: every bay has a name`);
}
{ const G = Drv.load(RLEVELS[0]); quiet(G); at(G, 9, 8, 0);
  run(G, { steer: 1 }, 1); ok(Math.abs(G.car.a) < 1e-9 && Math.hypot(G.car.vx, G.car.vy) < 1, 'turning the wheel alone does nothing while parked');
  G.car.steer = 0; run(G, { pedal: 1 }, 1); ok(Math.abs(G.car.a) < 1e-9 && G.car.x > 9.5 * K + 2 * K, `the pedal alone drives straight (moved ${((G.car.x / K) - 9.5).toFixed(1)} tiles)`);
  const a0 = G.car.a; run(G, { pedal: 0.4, steer: 1 }, 0.4); ok(G.car.a > a0 + 0.3, 'wheel plus pedal turns the truck');
  at(G, 9, 8, 0); run(G, { pedal: 1 }, 1.2); const v1 = G.car.vx; run(G, { pedal: -1 }, 0.5); ok(G.car.vx < v1 * 0.5, 'brake slows hard');
  run(G, { pedal: -1 }, 1.5); ok(G.car.vx < -0.5 * K, 'holding brake after stopping reverses');
}
{ const G = Drv.load(RLEVELS[0]); quiet(G); at(G, 9, 8, -Math.PI / 2); // facing north into the building block at row 7
  const ev = run(G, { pedal: 1 }, 2);
  const c = G.car, inside = Drv.circles(c).some(q => !Drv.drivable(Drv.tileAt(G, q.x, q.y)));
  ok(!inside, 'the truck cannot drive into a building');
  at(G, 3, 14, 0); G.car.vx = 6 * K; G.car.a = -Math.PI / 2; G.car.vy = -6 * K; G.car.vx = 0; // fast into the block above row 14? use a straight wall run
  const G2 = Drv.load(RLEVELS[0]); quiet(G2); at(G2, 9, 9, 0); G2.car.a = Math.PI / 2; G2.car.vy = 6.5 * K;
  const ev2 = run(G2, {}, 0.6); ok(ev2.some(e => e.startsWith('crash')), 'hitting a wall fast counts as a crash');
}
{ const G = Drv.load(RLEVELS[0]); quiet(G); at(G, 6, 5, 0); run(G, { pedal: 1 }, 3); // grass yard
  const G2 = Drv.load(RLEVELS[0]); quiet(G2); at(G2, 4, 2, 0); run(G2, { pedal: 1 }, 3);
  ok(G.car.x - 6.5 * K < G2.car.x - 4.5 * K, 'grass is slower than road');
  const slip = rain => { const H = Drv.load(RLEVELS[rain ? 4 : 0]); quiet(H); H.trains = []; at(H, 2, 9, 0); H.tiles = H.tiles.map(r => r.map(c => (c === '#' || c === 't' ? '.' : c))); run(H, { pedal: 1 }, 1.2); run(H, { pedal: 0.6, steer: 1 }, 0.6); const d = { x: Math.cos(H.car.a), y: Math.sin(H.car.a) }; return Math.abs(-H.car.vx * d.y + H.car.vy * d.x); };
  ok(slip(true) > slip(false) * 2, `the truck slides much more in the rain (${(slip(true) / K).toFixed(2)} vs ${(slip(false) / K).toFixed(2)} tiles/s)`);
}
{ // pick up, deliver, tip, turbo back
  const G = Drv.load(RLEVELS[0]); quiet(G);
  const A = G.spots.find(s => s.key === 'A'), b = G.spots.find(s => s.key === 'b');
  G.orders.push({ id: 1, from: 'A', to: 'b', kind: 'box', left: 60, max: 60, st: 'wait', cond: 1, price: 40 }); G.car.turbo = 1;
  Object.assign(G.car, { x: A.x - 2 * K, y: A.y, a: 0, vx: 6 * K, vy: 0 });
  run(G, { pedal: 1 }, 0.5); ok(!G.carried.length, 'speeding past the shop picks nothing up');
  Object.assign(G.car, { x: A.x, y: A.y, a: 0, vx: 0, vy: 0 }); G.stopLock = false;
  const ev = run(G, {}, 0.6); ok(G.carried.length === 1 && ev.includes('pick'), 'stopping in the bay for half a second loads the parcel');
  Object.assign(G.car, { x: b.x, y: b.y, vx: 0, vy: 0 }); G.stopLock = false;
  const m0 = G.money, ev2 = run(G, {}, 0.6);
  ok(G.served === 1 && G.money - m0 >= 55 && G.money - m0 <= 60 && !G.orders.length, `stopping at the house delivers it with a tip (+฿${G.money - m0})`);
  ok(G.car.turbo === 2, 'each delivery gives back one turbo');
}
{ // crashes dent parcels, eggs dent faster
  const mk = kind => { const G = Drv.load(RLEVELS[0]); quiet(G); G.orders.push({ id: 1, from: 'A', to: 'b', kind, left: 60, max: 60, st: 'car', cond: 1, price: 40 }); G.carried = [1]; at(G, 9, 9, Math.PI / 2); G.car.vy = 6.5 * K; run(G, {}, 0.6); return G.orders[0].cond; };
  const box = mk('box'), egg = mk('egg');
  ok(box < 1 && egg < box, `a hard crash dents a box (${Math.round(box * 100)}%) and an egg more (${Math.round(egg * 100)}%)`);
}
{ const G = Drv.load(RLEVELS[0]); quiet(G); G.orders.push({ id: 1, from: 'A', to: 'b', kind: 'box', left: 0.1, max: 60, st: 'wait', cond: 1, price: 40 }); G.money = 30;
  const ev = run(G, {}, 0.2); ok(ev.includes('expire') && G.money === 20 && G.failed === 1, 'a customer who gives up costs ฿10');
}
{ // chickens
  const G = Drv.load(RLEVELS[1]); G.spawnT = 1e9;
  const c = G.chickens[0]; c.x = 6 * K; c.y = 2.5 * K; c.tx = c.x; c.ty = c.y; c.t = 99; G.chickens = [c];
  at(G, 4, 2, 0); G.car.y = 2.5 * K; G.car.vx = 6 * K; G.money = 20;
  Object.assign(c, { st: 'walk' }); c.hx = c.x; c.hy = c.y;
  const ev = run(G, { pedal: 1 }, 0.5);
  ok(ev.includes('chicken') && G.money === 15, 'running over a chicken costs ฿5');
  const G2 = Drv.load(RLEVELS[1]); G2.spawnT = 1e9; const c2 = G2.chickens[0]; at(G2, 4, 2, 0); c2.x = G2.car.x + 2 * K; c2.y = G2.car.y; c2.st = 'walk';
  run(G2, { horn: true }, 0.05); ok(c2.st === 'flee', 'the horn sends chickens running');
}
{ // trains
  const G = Drv.load(RLEVELS[3]); quiet(G);
  const tr = G.trains[0];
  let closed = -1, hit = -1;
  for (let t = 0; t < tr.period * 2; t += 0.05) { const r = Drv.trainRect(G, tr, t); if (r && r.y < 8 * K + K && r.y + r.h > 8 * K) { hit = t; break; } }
  for (let t = 0; t < tr.period * 2; t += 0.05) if (Drv.gateClosed(G, 8, t)) { closed = t; break; }
  ok(hit > 0 && closed >= 0 && hit - closed > 2, `the crossing closes ${(hit - closed).toFixed(1)} s before the train arrives`);
  G.t = hit - 0.4; G.car.safe = 0; at(G, 18, 8, 0); G.t = hit - 0.4; G.money = 50;
  G.orders.push({ id: 1, from: 'A', to: 'b', kind: 'box', left: 60, max: 60, st: 'car', cond: 1, price: 40 }); G.carried = [1];
  const ev = run(G, {}, 1);
  ok(ev.includes('train') && G.car.stun > 0 && G.money === 40 && G.orders[0].cond <= 0.5, 'a truck on the rails gets knocked off, fined ฿10 and the parcels dented');
  ok(!Drv.circles(G.car).some(q => Math.floor(q.x / K) === 18), 'and ends up off the rails');
}
{ // traffic waits for the truck
  const G = Drv.load(RLEVELS[2]); G.spawnT = 1e9; G.traffic = G.traffic.slice(0, 1);
  const o = G.traffic[0]; const d = { x: Math.cos(o.a), y: Math.sin(o.a) };
  at(G, 0, 0); G.car.x = o.x + d.x * 1.1 * K; G.car.y = o.y + d.y * 1.1 * K; G.car.a = o.a;
  run(G, {}, 2); ok(o.v < 5 && Math.hypot(o.x - G.car.x, o.y - G.car.y) > 0.6 * K, 'a traffic car stops behind the truck instead of driving through it');
}
{ // net: guest copy lines up with the host
  const B = require('./rbot.js');
  const A = Drv.load(RLEVELS[4]), Gs = Drv.load(RLEVELS[4]); Gs.net = { role: 'guest' };
  let same = 0, n = 0;
  for (let f = 0; f < 60 * 60; f++) {
    Drv.step(A, { pedal: Math.sin(f / 90), steer: Math.cos(f / 70) });
    if (f % 30 === 0) {
      const w = JSON.parse(JSON.stringify(Drv.encode(A))); Drv.apply(Gs, w);
      const w2 = JSON.parse(JSON.stringify(Drv.encode(Gs)));
      const strip = o => JSON.stringify({ l: o.l, $: o.$, o: o.o, cr: o.cr, c: o.c.slice(0, 3) });
      n++; if (strip(w) === strip(w2)) same++;
    }
  }
  ok(n > 50 && same === n, `guest copy of the truck and orders matches the host (${same}/${n})`);
}
console.log(fails ? fails + ' FAILED' : 'DRIVING OK');
process.exit(fails ? 1 : 0);

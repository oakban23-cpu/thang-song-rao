// Unit checks for the kitchen rules
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'kitchen.js'), 'utf8') + ';this.Kit=Kit;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'klevels.js'), 'utf8') + ';this.KLEVELS=KLEVELS;', ctx);
const { Kit, KLEVELS } = ctx; const K = Kit.K;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
KLEVELS.forEach((l, i) => {
  const rows = l.map.length === 7 && l.map.every(r => r.length === 15);
  const s = l.map.join('');
  const b = l.boat ? l.boat.map.join('') : '';
  ok(rows && s.includes('1') && s.includes('2') && (s + b).includes('W') && (s + b).includes('P'), `kitchen ${i + 1} map shape`);
});
const idle = () => ({ pink: {}, mint: {} });
const run = (G, n, f) => { const ev = []; for (let k = 0; k < n; k++) { const i = idle(); if (f) f(i, k); ev.push(...Kit.step(G, i)); } return ev; };
const at = (G, p, x, y, fx, fy) => { p.x = (x + .5) * K; p.y = (y + .5) * K; p.fx = fx; p.fy = fy; p.vx = p.vy = 0; };
const press = (G, who) => run(G, 1, i => { i[who].act = true; });
// level 1: egg -> pan -> plate+rice -> serve
{
  const G = Kit.load(KLEVELS[0]); const p = G.pink;
  at(G, p, 3, 1, 0, -1); press(G, 'pink'); ok(p.held && p.held.k === 'egg', 'take an egg from the crate');
  at(G, p, 6, 1, 0, -1); press(G, 'pink'); ok(!p.held && G.tiles[0][6].item.st === 'cook', 'egg goes into the pan on the stove');
  run(G, 60 * 5.1); ok(G.tiles[0][6].item.st === 'done' && G.tiles[0][6].item.f === 'omelette', 'omelette cooks in 5 s');
  at(G, p, 10, 1, 0, -1); press(G, 'pink'); ok(p.held && p.held.k === 'plate', 'take a plate');
  at(G, p, 2, 5, 0, 1); press(G, 'pink'); ok(p.held.c.join() === 'rice', 'rice goes straight onto the plate');
  at(G, p, 6, 1, 0, -1); press(G, 'pink'); ok(p.held.c.length === 2 && G.tiles[0][6].item.st === 'empty', 'plate scoops the omelette from the pan');
  run(G, 60); const m0 = G.money;
  at(G, p, 13, 1, 0, -1); const ev = press(G, 'pink'); ok(ev.includes('serve:pink') && G.money > m0 && !p.held, `serve kaijeow (+${G.money - m0} baht)`);
}
// burning and trash
{
  const G = Kit.load(KLEVELS[0]); const p = G.pink;
  at(G, p, 3, 1, 0, -1); press(G, 'pink'); at(G, p, 6, 1, 0, -1); press(G, 'pink');
  run(G, 60 * 15); ok(G.tiles[0][6].item.st === 'burnt' && !G.tiles[0][6].fire, 'level 1: food burns but no fire');
  press(G, 'pink'); ok(p.held && p.held.k === 'pan', 'pick up the burnt pan');
  at(G, p, 6, 5, 0, 1); press(G, 'pink'); ok(p.held.st === 'empty', 'trash empties the pan');
  at(G, p, 6, 1, 0, -1); press(G, 'pink'); ok(G.tiles[0][6].item && !p.held, 'pan goes back on the stove');
}
// chop, fire, extinguisher (level 2)
{
  const G = Kit.load(KLEVELS[1]); const p = G.pink, m = G.mint;
  at(G, p, 2, 1, 0, -1); press(G, 'pink'); at(G, p, 4, 1, 0, -1); press(G, 'pink');
  ok(G.tiles[0][4].item.k === 'pork', 'pork on the board');
  run(G, 60 * 1.7, i => { i.pink.use = true; }); ok(G.tiles[0][4].item.k === 'porkc', 'hold use to chop');
  press(G, 'pink'); at(G, p, 6, 3, 1, 0); press(G, 'pink'); ok(G.tiles[3][7].item.k === 'porkc', 'put chopped pork on the middle counter');
  at(G, m, 8, 3, -1, 0); press(G, 'mint'); ok(m.held && m.held.k === 'porkc', 'other side picks it up');
  at(G, m, 8, 1, 0, -1); press(G, 'mint'); run(G, 60 * 6.1); ok(G.tiles[0][8].item.f === 'kaprao', 'kaprao cooks');
  run(G, 60 * 10.2); ok(G.tiles[0][8].fire > 0, 'level 2: burning starts a fire');
  run(G, 60 * 6.2); ok(G.list.filter(t => t.fire > 0).length >= 2, 'fire spreads to a neighbour');
  at(G, m, 13, 5, 1, 0); press(G, 'mint'); ok(m.held && m.held.k === 'ext', 'pick up the extinguisher');
  const fires = () => G.list.filter(t => t.fire > 0);
  const floorNext = t => { for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const n = G.tiles[t.y + dy] && G.tiles[t.y + dy][t.x + dx]; if (n && '.12'.includes(n.t)) return [n.x, n.y, dy ? 0 : -dx, dy ? -dy : 0]; } return null; };
  for (let k = 0; k < 12 && fires().length; k++) { const f = fires().find(floorNext); if (!f) break; const [x, y, fx, fy] = floorNext(f); at(G, m, x, y, fx, fy); run(G, 60 * 1.3, i => { i.mint.use = true; }); }
  if (fires().length) console.log('   left burning:', fires().map(f => [f.x, f.y, f.t, f.fire.toFixed(2), !!floorNext(f)]));
  ok(!fires().length, 'spraying puts every fire out');
}
// dirty plates (level 3)
{
  const G = Kit.load(KLEVELS[2]); const p = G.pink;
  const P = G.tiles[5][14];
  ok(P.plates === 3, 'level 3 starts with 3 plates');
  at(G, p, 13, 5, 1, 0); press(G, 'pink'); press(G, 'pink'); press(G, 'pink');
  ok(P.plates === 2 && p.held.k === 'plate', 'plates are limited');
  G.orders = [{ r: 'somtam', left: 50, max: 50, id: 1 }];
  p.held.c = ['somtam']; at(G, p, 13, 1, 0, -1); press(G, 'pink');
  ok(G.served === 1, 'serve somtam');
  run(G, 60 * 6.1); ok(G.tiles[1][14].ret === 1, 'dirty plate comes back after 6 s');
  at(G, p, 13, 1, 1, 0); press(G, 'pink'); ok(p.held.k === 'dirty', 'pick up the dirty plate');
  at(G, p, 13, 2, 1, 0); press(G, 'pink'); run(G, 60 * 1.7, i => { i.pink.use = true; });
  ok(G.tiles[2][14].clean === 1, 'wash it in the sink'); press(G, 'pink'); ok(p.held && p.held.k === 'plate', 'take the clean plate');
}
// mortar
{
  const G = Kit.load(KLEVELS[2]); const p = G.pink;
  at(G, p, 1, 1, 0, -1); press(G, 'pink'); at(G, p, 3, 1, 0, -1); press(G, 'pink'); run(G, 100, i => { i.pink.use = true; }); press(G, 'pink');
  at(G, p, 5, 1, 0, -1); press(G, 'pink'); run(G, 60 * 1.9, i => { i.pink.use = true; }); ok(G.tiles[0][5].item.k === 'somtam', 'papaya: chop then pound into somtam');
}
// boat (level 5)
{
  const G = Kit.load(KLEVELS[4]); const B = G.boat;
  ok(B && B.off === 0, 'boat starts docked');
  at(G, G.mint, 7, 2, 1, 0); run(G, 40, i => { i.mint.mx = 1; });
  ok(Kit.onBoat(G, G.mint), 'walk across the gangway onto the boat');
  const y0 = G.mint.y; run(G, 60 * (7 + 2.6) - 40);
  ok(Math.abs(B.off - 2) < 1e-6 && Math.abs(G.mint.y - y0 - 2 * K) < 2, `the boat carries the cook (moved ${((G.mint.y - y0) / K).toFixed(2)} tiles)`);
  at(G, G.pink, 7, 3, 1, 0); run(G, 60, i => { i.pink.mx = 1; });
  ok(!Kit.onBoat(G, G.pink) && G.pink.x < 8 * K, 'cannot walk off the dock when the gangway is elsewhere');
}
console.log(fails ? fails + ' FAILED' : 'KITCHEN OK');
process.exit(fails ? 1 : 0);

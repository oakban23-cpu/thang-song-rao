// Stranded rules: walking and the sea, palms and coconuts (catching them, being hit by them), bananas, the spring and
// the sea water, the fire (wood, rubbing in turns, smoke, the rain), cooking, fishing (one herds, one pounces), crabs,
// eating, giving, eating alone, sulking and making up, hunger, thirst and the cold, passing out and being helped up,
// the days and the nights, starting a day over, the SOS and the ship, monkeys, the tide, the islands themselves, the
// bots, and two phones online.
const { run: live, Isle, SLEVELS } = require('./sbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Isle.DT, T = Isle.T;
// a plain island of sand; put: [[x, y, ch], ...]
const isle = (put = [], extra = {}) => {
  const rows = [];
  for (let y = 0; y < Isle.ROWS; y++) rows.push((y < 2 || y > 14 ? '~'.repeat(30) : '~' + ','.repeat(28) + '~').split(''));
  for (const [x, y, c] of [[20, 12, '1'], [22, 12, '2'], [24, 12, '3'], [5, 8, 'P'], [7, 8, 'M'], ...put]) rows[y][x] = c;
  return Object.assign({ name: 't', days: 3, day: 120, night: 60, sos: 1, ships: [10], stars: [500, 800, 1000], map: rows.map(r => r.join('')) }, extra);
};
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Isle.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Isle.load(def); run(G, Isle.START + DT); return G; };
const put = (G, id, tx, ty, fx = 0, fy = 1) => Object.assign(G.p[id], { x: (tx + .5) * T, y: (ty + .5) * T, fx, fy });
const press = (G, id) => { G.p[id].lock = 0; return run(G, DT, { [id]: { act: true } }); };   // (no waiting out the moment after the last press)
const has = (ev, s) => ev.some(e => e.startsWith(s));
const walk = (id, mx, my = 0) => ({ [id]: { mx, my } });

// ---- moving
{ const G = Isle.load(isle()); const x = G.p.pink.x; run(G, 2, walk('pink', 1)); ok(G.p.pink.x === x && G.st === 'count', 'nobody moves before the start');
  run(G, .6); const x1 = G.p.pink.x; run(G, 1, walk('pink', 1)); ok(Math.abs(G.p.pink.x - x1 - Isle.SPEED) < 2, 'walking along the sand');
  run(G, 3, walk('pink', 0, -1)); ok(G.p.pink.y >= 2 * T + Isle.R - .01, 'the sea stops you'); }
// ---- palms and coconuts
{ const G = go(isle([[10, 6, 'T']])); put(G, 'pink', 10, 7, 0, -1); put(G, 'mint', 3, 12);
  let e = press(G, 'pink'); ok(has(e, 'shake:pink') && !G.falls.length, 'a shake: the palm sways'); run(G, .4); press(G, 'pink'); run(G, .4); e = press(G, 'pink');
  ok(has(e, 'fall') && G.falls.length === 1 && G.palms[0].cocos === 1, `three shakes: a coconut comes down (somewhere close)`);
  const c = G.falls[0]; put(G, 'mint', 0, 0); G.p.mint.x = c.x; G.p.mint.y = c.y; G.p.pink.x = c.x + 60; const love = G.love;
  e = run(G, 1); ok(has(e, 'bonk:mint:pink') && G.p.mint.stun > 0 && Math.abs(G.love - (love - 10)) < .1 && G.items.some(i => i.k === 'coco'), 'standing under it: bonk (seeing stars), and the one who shook it is in trouble'); }
{ const G = go(isle([[10, 6, 'T']])); put(G, 'pink', 10, 7, 0, -1); for (let k = 0; k < 3; k++) { press(G, 'pink'); run(G, .4); }
  const c = G.falls[0]; G.p.mint.x = c.x; G.p.mint.y = c.y + 8; put(G, 'pink', 3, 12); run(G, c.t - .2); const e = run(G, .4, i => (i === 0 ? { mint: { act: true } } : {}));
  ok(has(e, 'catch:mint') && G.p.mint.item === 'coco' && !has(e, 'bonk'), 'pressing just as it lands: caught'); }
{ const G = go(isle([[10, 6, 'T']])); put(G, 'pink', 10, 7, 0, -1); G.palms[0].cocos = 0; G.palms[0].regen = 5; const e = press(G, 'pink'); ok(has(e, 'empty:pink'), 'a bare palm: nothing comes down');
  G.palms[0].regen = 1; run(G, 1.1); ok(G.palms[0].cocos === 1, 'coconuts grow back'); }
// ---- food, water, eating, giving
{ const G = go(isle([[10, 6, 'B'], [14, 6, 'w']])); put(G, 'pink', 10, 7, 0, -1);
  let e = press(G, 'pink'); ok(has(e, 'pick:pink:banana') && G.p.pink.item === 'banana' && G.bushes[0].fruit === 1, 'a banana off the bush');
  G.p.pink.food = 50; G.p.mint.food = 50; put(G, 'mint', 20, 4); e = press(G, 'pink'); ok(has(e, 'eat:pink:banana') && G.p.pink.food >= 79, 'eaten');
  G.p.pink.water = 50; put(G, 'pink', 14, 7, 0, -1); e = press(G, 'pink'); ok(has(e, 'drink:pink') && G.p.pink.water > 85, 'a drink at the spring'); }
{ const G = go(isle()); put(G, 'pink', 5, 2, 0, -1); G.p.pink.water = 50; const e = press(G, 'pink'); ok(has(e, 'salty:pink') && G.p.pink.water < 50 && G.p.pink.stun > 0, 'sea water: salty, and worse than nothing'); }
{ const G = go(isle()); G.p.pink.item = 'banana'; G.p.pink.food = 90; G.p.mint.food = 30; put(G, 'mint', 6, 8); const love = G.love; const e = press(G, 'pink');
  ok(has(e, 'eat:mint:banana:pink') && G.p.mint.food >= 59 && G.love > love, 'food to the hungrier one when close: given'); }
{ const G = go(isle()); G.p.pink.item = 'banana'; G.p.pink.food = 70; G.p.mint.food = 20; put(G, 'mint', 20, 10); const love = G.love; const e = press(G, 'pink');
  ok(has(e, 'selfish:pink') && Math.abs(G.love - (love - 12)) < .1 && G.wronged === 'mint', 'eating alone while the other starves: noticed'); }
// ---- the fire
{ const G = go(isle([[10, 6, 'C'], [14, 6, 'D']])); put(G, 'pink', 10, 7, 0, -1); put(G, 'mint', 11, 6, -1, 0);
  let e = press(G, 'pink'); ok(has(e, 'nowood:pink') && !G.fire.lit, 'no wood in the pit: nothing to light');
  put(G, 'mint', 14, 7, 0, -1); e = press(G, 'mint'); ok(G.p.mint.item === 'wood', 'a branch of dead wood'); put(G, 'mint', 11, 6, -1, 0); e = press(G, 'mint');
  ok(has(e, 'wood:mint') && G.fire.fuel === Isle.WOOD_FUEL, 'wood in the pit');
  press(G, 'pink'); run(G, .3); e = press(G, 'pink'); ok(has(e, 'smoke:pink') && !G.fire.lit, 'rubbing alone: just smoke');
  run(G, 1.2); for (let k = 0; k < 16 && !G.fire.lit; k++) { press(G, k % 2 ? 'mint' : 'pink'); run(G, .3); }
  ok(G.fire.lit, 'rubbing in turns: it catches');
  G.p.pink.item = 'fish'; e = press(G, 'pink'); ok(has(e, 'cook:pink') && G.p.pink.cook > 0, 'a fish on the fire'); const x = G.p.pink.x; e = run(G, 1.9, walk('pink', 1)); const still = G.p.pink.x === x; e.push(...run(G, .2));
  ok(has(e, 'cooked:pink') && G.p.pink.item === 'cooked' && still, 'cooked (standing by it meanwhile)');
  const f0 = G.fire.fuel; run(G, 10); ok(Math.abs(G.fire.fuel - (f0 - 10 * Isle.FUEL_D)) < .5, 'the fire burns down'); }
{ const G = go(isle([[10, 6, 'C']], { rain: [[1, 0, 50]], fuel: 30 })); G.fire.lit = true; run(G, 10); ok(G.fire.fuel < 30 - 15 && Isle.raining(G), 'rain eats the fire');
  const e = run(G, 10); ok(has(e, 'fireout') && !G.fire.lit, 'and puts it out'); }
// ---- fishing and crabs
{ const G = go(isle([[10, 6, 'p'], [11, 6, 'p'], [10, 7, 'p'], [11, 7, 'p']])); put(G, 'pink', 12, 6, -1, 0); G.p.pink.x += 10; put(G, 'mint', 25, 12);
  for (const f of G.fish) { f.x = 10.6 * T; f.y = 7 * T; }
  let e = run(G, .6, i => ({ pink: { my: i % 40 < 20 ? 1 : -1 } })); const away = G.fish.every(f => f.x < 11 * T); ok(away, 'fish swim away from whoever moves about by the pool');
  e = press(G, 'pink'); ok(has(e, 'splash:pink') && !G.p.pink.item && G.p.pink.wet > 0, 'alone: a splash, and wet');
  put(G, 'mint', 9, 7, 1, 0); G.p.mint.x -= 12; G.p.pink.x = 12.5 * T + 6;
  for (let k = 0; k < 60 && !G.p.pink.item; k++) { const ex = 11.75 * T, near = G.fish.some(f => Math.hypot(f.x - ex, f.y - G.p.pink.y) < 20); if (near) press(G, 'pink'); run(G, .25, i => ({ mint: { my: Math.sin((G.t) * 2.2) } })); }
  ok(G.p.pink.item === 'fish', 'with the other herding from the far side: a fish'); }
{ const G = go(isle([], { crabs: 1 })); const c = G.crabs[0]; c.x = 10.5 * T; c.y = 8.5 * T; c.vx = c.vy = 0; c.t = 9; G.p.pink.item = 'rock'; put(G, 'pink', 8, 8);
  const e = run(G, 1.5, walk('pink', 1)); ok(has(e, 'pinch:pink') && !G.p.pink.item && G.p.pink.panic > 0, 'walking into a crab: pinched, drops everything, runs about');
  const y0 = G.p.pink.y, x0 = G.p.pink.x; run(G, .3); ok(Math.hypot(G.p.pink.x - x0, G.p.pink.y - y0) > 20, 'running about without being steered'); }
// ---- getting on (or not)
{ const G = go(isle([[12, 10, 'F']])); G.love = 32; G.wronged = 'mint'; G.p.pink.item = 'banana'; G.p.pink.food = 95; G.p.mint.food = 40; put(G, 'mint', 20, 10); let e = press(G, 'pink');
  e.push(...run(G, DT)); ok(has(e, 'sulk:mint') && G.p.mint.sulk && G.sulk === 'mint', 'too little love: the one wronged sulks');
  const x = G.p.mint.x; run(G, 1, walk('mint', -1)); const e2 = press(G, 'mint'); ok(G.p.mint.x === x && !has(e2, 'drop'), 'sulking: will not move or help');
  put(G, 'pink', 12, 10); e = press(G, 'pink'); ok(G.p.pink.item === 'flower', 'a flower');
  put(G, 'pink', 19, 10, 1, 0); e = press(G, 'pink'); ok(has(e, 'makeup:pink') && !G.p.mint.sulk && G.love >= 55, 'brought to the one sulking: made up'); }
{ const G = go(isle()); G.love = 1; G.wronged = 'pink'; const e = run(G, 1); ok(G.p.pink.sulk, 'nearly broken up: sulking'); }
// ---- hunger, thirst, the cold, passing out
{ const G = go(isle()); G.p.pink.water = .2; let e = run(G, 1); ok(has(e, 'down:pink:water') && G.p.pink.st === 'down', 'out of water: passed out');
  put(G, 'mint', 5, 9); e = run(G, Isle.REVIVE_T + .1); ok(has(e, 'revive:pink') && G.p.pink.st === 'ok' && G.p.pink.water >= 34, 'the other standing close helps them up'); }
{ const G = go(isle()); G.p.pink.food = .1; put(G, 'mint', 20, 10); const h = G.hearts; let e = run(G, Isle.DOWN_T + 1);
  ok(has(e, 'retry:down') && G.hearts === h - 1 && G.p.pink.st === 'ok' && G.p.pink.food > 99 && G.dt < 2, 'out too long alone: a heart, and the day starts over'); }
{ const G = go(isle([[10, 8, 'C']], { fuel: 50 })); G.dt = 125; put(G, 'pink', 10, 9); put(G, 'mint', 20, 9); run(G, 5); ok(Isle.night(G) && G.p.mint.warm < 95 && G.p.pink.warm < 95, 'at night away from a fire: cold');
  G.fire.lit = true; G.p.pink.warm = 50; put(G, 'mint', 11, 9); const love = G.love; run(G, 5); ok(G.p.pink.warm > 60 && G.love > love + 1, 'by the fire together: warm, and closer'); }
{ const G = go(isle([], { cold: 3 })); G.dt = 125; G.p.pink.warm = 2; const e = run(G, 1); ok(has(e, 'down:pink:cold'), 'too cold: out'); }
// ---- days, the SOS, the ship
{ const G = go(isle([[10, 8, 'R']], { day: 20, night: 10 })); let e = run(G, 21); ok(has(e, 'dusk') && Isle.night(G), 'evening'); e = run(G, 10);
  ok(has(e, 'dawn:2') && G.day === 2 && !Isle.night(G), 'and the next day');
  G.p.pink.food = 10; G.p.mint.food = 10; G.snap = G.snap; put(G, 'pink', 10, 9, 0, -1); press(G, 'pink'); put(G, 'pink', 20, 12); e = press(G, 'pink');
  ok(has(e, 'sos:0:1') && G.pads[0].n === 1, 'a rock on the first letter'); }
{ const def = isle([[10, 8, 'C']], { days: 1, day: 30, night: 10, sos: 1, ships: [5], fuel: 40 }), G = go(def); G.pads.forEach(p => { p.n = 1; });
  let e = run(G, 6); ok(has(e, 'ship') && G.ship && !G.won, 'a ship goes by: no fire, not seen');
  G.fire.lit = true; e = run(G, 4); ok(has(e, 'rescued') && G.won && G.over && Isle.stars(G) > 0, 'SOS and a fire: rescued');
  const avg = (G.p.pink.food + G.p.pink.water + G.p.pink.warm + G.p.mint.food + G.p.mint.water + G.p.mint.warm) / 6;
  ok(G.early && Math.abs(G.score - (Isle.RESCUE_PTS + G.love * Isle.LOVE_PTS + G.hearts * Isle.HEART_PTS + avg * Isle.STAT_PTS + Isle.EARLY_PTS)) <= 1, `score: rescued (by the first ship), love, hearts left, how well you are (${G.score})`); }
{ const def = isle([], { days: 1, day: 30, night: 10, sos: 1, ships: [5] }), G = go(def); const e = run(G, 41);
  ok(has(e, 'shipgone') && has(e, 'retry:ship') && G.hearts === Isle.HEARTS - 1, 'the ship gone and the day over: start the day over'); }
{ const def = isle([], { days: 1, day: 30, night: 10, ships: [5], hearts: 1 }), G = go(def); const e = run(G, 41); ok(has(e, 'out:ship') && G.over && G.failed && Isle.stars(G) === 0, 'no hearts left: stuck on the island'); }
// ---- monkeys, the tide
{ const def = isle([[15, 3, 'j']], { monkey: 1, jungle: [[15, 3]] }), G = go(def); G.items.push({ k: 'banana', x: 15.5 * T, y: 8.5 * T }); put(G, 'pink', 3, 12); put(G, 'mint', 5, 12);
  let e = []; for (let i = 0; i < 8 / DT && !has(e, 'steal'); i++) e.push(...run(G, DT)); ok(has(e, 'monkey') && has(e, 'steal:banana'), 'a monkey takes the banana lying about');
  if (G.monkey && G.monkey.item) { G.p.pink.x = G.monkey.x; G.p.pink.y = G.monkey.y + 4; e = run(G, DT * 2); ok(has(e, 'monkeydrop') && G.items.some(i => i.k === 'banana'), 'caught: it drops it'); } else ok(false, 'caught: it drops it'); }
{ const def = isle([[15, 3, 'j']], { monkey: 1, jungle: [[15, 3]] }), G = go(def); G.pads[0].n = 1; put(G, 'pink', 3, 12); put(G, 'mint', 5, 12);
  const e = run(G, 8); ok(has(e, 'steal:rock:0') && G.pads[0].n === 0, 'with nothing lying about, it takes a rock off the SOS'); }
{ const rows = isle().map.map(r => r.split('')); for (let x = 1; x < 29; x++) rows[14][x] = '.'; const def = Object.assign(isle(), { map: rows.map(r => r.join('')), tide: [[1, 2, 10]] }), G = go(def);
  G.items.push({ k: 'wood', x: 10.5 * T, y: 14.5 * T }); put(G, 'pink', 5, 14); run(G, 2.5); ok(Isle.tide(G) && !G.items.length, 'the tide takes what lies on the wet sand');
  const x = G.p.pink.x; run(G, 1, walk('pink', 1)); ok(Math.abs(G.p.pink.x - x - Isle.SPEED / 2) < 2 && G.p.pink.wet > 0, 'wading: slow, and wet'); }
// ---- the islands
SLEVELS.forEach((def, i) => {
  const G = Isle.load(def), probs = [];
  if (def.map.length !== Isle.ROWS || def.map.some(r => r.length !== Isle.COLS)) probs.push('size');
  if (!G.start.pink || !G.start.mint) probs.push('starts');
  if (G.pads.length !== 3 || G.pads.some(p => p.x1 - p.x0 < T)) probs.push('pads');
  for (const ch of 'TBRDwpC') if (!def.map.join('').includes(ch)) probs.push('no ' + ch);
  if ((def.jungle || []).some(([x, y]) => def.map[y][x] !== 'j') || (def.monkey && !(def.jungle || []).length)) probs.push('jungle');
  // everything that is used can be walked up to from where the two wake up
  const seen = new Set(), q = [[Math.floor(G.start.pink[0] / T), Math.floor(G.start.pink[1] / T)]];
  while (q.length) { const [x, y] = q.shift(), k = x + ',' + y; if (seen.has(k) || Isle.solid(G, x, y)) continue; seen.add(k); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) q.push([x + dx, y + dy]); }
  for (let y = 0; y < Isle.ROWS; y++) for (let x = 0; x < Isle.COLS; x++) if ('TBRDwpC'.includes(G.grid[y][x]) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)))) probs.push('cut off ' + G.grid[y][x]);
  if (!seen.has(Math.floor(G.start.mint[0] / T) + ',' + Math.floor(G.start.mint[1] / T))) probs.push('mint apart');
  ok(!probs.length && def.hint && def.stars[0] < def.stars[1] && def.stars[1] < def.stars[2], `island ${i + 1} ${def.name}${probs.length ? ': ' + probs.join(', ') : ''}`);
});
for (const def of SLEVELS) { const r = live(def, { seed: 3 }); ok(r.won, `a careful pair gets off ${def.name} (${r.score}, love ${r.love}, ${r.stats.retries} days over)`); }
// ---- two phones: pink plays on the host, mint on the guest
{ const def = SLEVELS[0], H = Isle.load(def), Gs = Isle.load(def), rq = { seen: -1, act: false, mx: 0, my: 0 };
  const toG = [], toH = []; let presses = 0; const hev = [];
  const lag = 6;
  const tick = (pinp, minp) => {
    Isle.step(Gs, { mint: minp, pink: { still: true } }, true);
    if (minp.act) presses++;
    toH.push(JSON.stringify(Isle.guestMsg(Gs, 'mint', minp, presses)));
    while (toH.length > lag) Isle.hostHears(H, 'mint', JSON.parse(toH.shift()), rq);
    hev.push(...Isle.step(H, { pink: pinp, mint: rq }, false, 'mint')); rq.act = false;
    toG.push(JSON.stringify(Isle.encode(H)));
    while (toG.length > lag) Isle.apply(Gs, JSON.parse(toG.shift()), 'mint');
  };
  for (let i = 0; i < (Isle.START + .2) / DT; i++) tick({}, {});
  ok(H.st === 'run' && Gs.st === 'run', 'online: both phones start');
  for (let i = 0; i < 1 / DT; i++) tick({ mx: 1 }, { mx: -1, my: -1 });
  ok(Math.abs(Gs.p.mint.x - H.p.mint.x) < 10 && Math.abs(Gs.p.pink.x - H.p.pink.x) < 10, 'online: both walk, and both phones agree');
  // mint walks to the banana bush and picks one on the guest's phone
  const b = H.bushes[0], bx = (b.tx + .5) * T, by = (b.ty + 1.5) * T;
  for (let i = 0; i < 12 / DT && Math.hypot(Gs.p.mint.x - bx, Gs.p.mint.y - by) > 4; i++) { const dx = bx - Gs.p.mint.x, dy = by - Gs.p.mint.y, d = Math.hypot(dx, dy); tick({}, { mx: dx / d, my: dy / d }); }
  for (let i = 0; i < 20; i++) tick({}, { my: -.3 });
  tick({}, { act: true }); for (let i = 0; i < 20; i++) tick({}, {});
  ok(H.p.mint.item === 'banana' && Gs.p.mint.item === 'banana' && hev.includes('pick:mint:banana'), 'online: a press on the guest picks a banana on the host, and the guest sees it');
  ok(JSON.stringify(Isle.encode(H)).length < 3000, `online: a small message (${JSON.stringify(Isle.encode(H)).length} bytes)`);
  const cv = H.cv.mint; Isle.hostHears(H, 'mint', { mx: 0, my: 0, a: presses, x: H.p.mint.x + 300, y: H.p.mint.y, cv }, rq); ok(H.cv.mint === cv + 1, 'online: a jump the host cannot believe is corrected');
  let threw = false; try { for (const m of [null, 5, 'x', {}, { p: 3, cv: 'a' }, { it: [[9, 1]], fi: 'x', pd: [NaN], mk: [1], pm: 7 }]) { Isle.apply(Gs, m, 'mint'); Isle.hostHears(H, 'mint', m, rq); } run(H, .1); run(Gs, .1); } catch (e) { threw = e; }
  ok(!threw && Number.isFinite(Gs.p.pink.x) && Number.isFinite(H.p.mint.x), 'online: junk messages are ignored' + (threw ? ' ' + threw : '')); }
console.log(fails ? fails + ' FAILED' : 'STRANDED OK');
process.exit(fails ? 1 : 0);

// Trap-run rules: walking and walls, staying on one screen, water, spikes on a beat (and plates that stop them), gates
// held open by plates, lever pairs, arrows, rolling logs and boulders, fire bars, saws, falling and helping each other
// up, hearts and checkpoints, gems, the temple gate, the clock, the paths themselves, and two phones online.
const { run: trek, Trap, PLEVELS } = require('./pbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Trap.DT, T = Trap.T;
// a little clearing: the lines given are rows 1.., grass below them, trees round the edge
const room = (lines, extra = {}) => {
  const W = lines[0].length, rows = ['T'.repeat(W), ...lines];
  while (rows.length < Trap.ROWS - 1) rows.push(','.repeat(W));
  rows.push('T'.repeat(W));
  return Object.assign({ name: 't', map: rows, time: 60, stars: [600, 800, 1000] }, extra);
};
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Trap.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Trap.load(def); run(G, Trap.START + DT); return G; };
const put = (G, id, tx, ty) => { const x = (tx + .5) * T, y = (ty + .5) * T; Object.assign(G.p[id], { x, y, sx: x, sy: y }); };
const tx = (G, id) => Math.floor(G.p[id].x / T);
const has = (ev, s) => ev.some(e => e.startsWith(s));
const walk = (id, mx, my = 0) => ({ [id]: { mx, my } });

// ---- moving
{ const G = Trap.load(room(['P,,,,,,,,,', 'M,,,,,,,,,'])); const x = G.p.pink.x; run(G, 2, walk('pink', 1)); ok(G.p.pink.x === x && G.st === 'count', 'nobody moves before the start');
  run(G, 0.6); ok(G.st === 'run', 'then go'); const x1 = G.p.pink.x; run(G, 1, walk('pink', 1)); ok(Math.abs(G.p.pink.x - x1 - Trap.SPEED) < 2, `walking (${(G.p.pink.x - x1).toFixed(1)} px in a second)`);
  const y = G.p.pink.y; run(G, 0.3, walk('pink', 1, 1)); ok(G.p.pink.y > y && Math.abs(Math.hypot(G.p.pink.x - x1 - Trap.SPEED, G.p.pink.y - y) - Trap.SPEED * 0.3) < 2, 'diagonally no faster'); }
{ const G = go(room(['P,,,,#,,,,', 'M,,,,#,,,,'])); run(G, 3, walk('pink', 1)); ok(Math.abs(G.p.pink.x - (5 * T - Trap.R)) < 0.5, 'a stone wall stops you'); run(G, 1, walk('pink', 0, -1)); ok(G.p.pink.y >= T + Trap.R - 0.01, 'and so do the trees at the edge'); }
{ const G = go(room(['P' + ','.repeat(39), 'M' + ','.repeat(39)])); run(G, 8, walk('pink', 1)); ok(Math.abs(G.p.pink.x - G.p.mint.x - Trap.MAXSEP) < 2, `the two of you stay on one screen (${(G.p.pink.x - G.p.mint.x).toFixed(0)} apart)`);
  run(G, 1, walk('pink', -1)); ok(G.p.pink.x - G.p.mint.x < Trap.MAXSEP - 100, 'walking back is fine'); }
// ---- water
{ const G = go(room(['P,,,~~~,,,', 'M,,,~~~,,,'])); const e = run(G, 2, walk('pink', 1));
  ok(has(e, 'down:pink:water') && G.p.pink.st === 'down', 'walking into the water: down');
  ok(G.p.pink.x < 4 * T && !Trap.waterAt(G, G.p.pink.x, G.p.pink.y), 'washed back to the bank'); }
// ---- spikes
{ const def = room(['P,,,,a,,,,', 'M,,,,a,,,,'], { spikes: { a: { per: 2, up: 1, ph: 0 } } }), G = go(def); put(G, 'pink', 5, 1);
  ok(Trap.spikeState(G, 'a') === 'down', 'spikes down at first'); run(G, 0.5); ok(Trap.spikeState(G, 'a') === 'warn' && G.p.pink.st === 'ok', 'then they peek (no harm yet)');
  ok(Trap.hazardAt(G, G.p.pink.x, G.p.pink.y, 0.55) === 'spike', 'the look-ahead sees them coming');
  const e = run(G, 0.55); ok(has(e, 'down:pink:spike'), 'then up: standing on them is a fall'); }
{ const def = room(['P,,,,a,,,,', ',,,,,a,,,,', ',1,,,a,,,,', 'M,,,,a,,,,'], { spikes: { a: { per: 2, up: 1, ph: 0, stop: '1' } } }), G = go(def); put(G, 'pink', 5, 1); put(G, 'mint', 1, 3);
  const e = run(G, 5); ok(G.p.pink.st === 'ok' && Trap.spikeState(G, 'a') === 'down' && G.sig === '1' && has(e, 'plate:1'), 'somebody on the plate keeps them down');
  put(G, 'mint', 1, 6); run(G, 0.55); ok(G.p.pink.st === 'ok' && Trap.spikeState(G, 'a') === 'warn', 'off the plate they peek first');
  const e2 = run(G, 0.6); ok(has(e2, 'down:pink:spike'), 'then come up'); }
// ---- gates and plates
{ const def = room(['P,,,,#,,,,', ',1,,,H,,,,', ',,,,,H,,,,', 'M,,,,#,,,,'], { gates: { H: '1' } }), G = go(def); put(G, 'pink', 2, 2);
  run(G, 2, walk('pink', 1)); ok(G.p.pink.x <= 5 * T - Trap.R + 0.5, 'a shut gate is a wall');
  put(G, 'mint', 1, 2); const e = run(G, DT); ok(has(e, 'open:H') && !Trap.solid(G, 5, 2), 'one on the plate: open');
  run(G, 0.12, walk('pink', 1)); ok(G.p.pink.x > 5 * T - 4 && G.p.pink.x < 6 * T, 'walking into it'); put(G, 'mint', 1, 5);
  const e2 = run(G, DT); ok(!has(e2, 'shut:H') && G.gopen.H, 'it does not close on somebody'); const e3 = run(G, 1, walk('pink', 1));
  ok(has(e3, 'shut:H') && G.p.pink.x > 6 * T, 'through, and it shuts behind'); }
{ const def = room(['P,,,,#,,2,', ',1,,,H,,,,', 'M,,,,#,,,,'], { gates: { H: '12' } }), G = go(def); put(G, 'mint', 8, 1); const e = run(G, DT); ok(has(e, 'open:H'), 'a gate with a plate on each side opens from either'); }
// ---- levers
{ const def = room(['P,,,,u,,,,#,,', ',,,,,,,,,J,,', 'M,,,,,,,,,#,,', ',,,,,,,,,#,,', ',,,,,u,,,,#,,'], { gates: { J: 'u' } }), G = go(def);
  put(G, 'pink', 5, 2); put(G, 'mint', 5, 4);
  let e = run(G, DT, { pink: { act: true } }); ok(has(e, 'lever:u') && !G.open.u, 'one lever alone: it springs back');
  e = run(G, 1.0); ok(!has(e, 'unlock') && !G.gopen.J, 'and the door stays shut');
  run(G, DT, { pink: { act: true } }); e = run(G, 0.5); e.push(...run(G, DT, { mint: { act: true } })); ok(has(e, 'unlock:u') && G.open.u, 'both pulled at nearly the same moment: unlocked');
  ok(has(e, 'open:J') && G.gopen.J, 'its door opens'); run(G, 5); ok(G.gopen.J, 'and stays open'); }
{ const def = room(['P,,,,u,,,,,,', 'M,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,u,,,,,,'], { gates: {} }), G = go(def); put(G, 'pink', 5, 1); put(G, 'mint', 5, 4);
  run(G, DT, { pink: { act: true } }); run(G, 1.0); const e = run(G, DT, { mint: { act: true } }); ok(!has(e, 'unlock'), 'a second apart is too late'); }
{ const def = room(['P,,u,,,,,,,', 'M,,,,,,,,,,']), G = go(def); put(G, 'pink', 1, 1); const e = run(G, DT, { pink: { act: true } }); ok(!has(e, 'lever'), 'out of reach of the lever: nothing'); }
// ---- arrows, logs, boulders, fire, saws
{ const def = room(['P,,,,,,,,,', ',,,,,,,,,,', ',,,,,,,,,,', ',,,,,,,,,,', ',,,,,,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'arrow', x: 5, y: 0, dir: 'd', per: 2, ph: 0 }] }), G = go(def); put(G, 'pink', 5, 6);
  let e = run(G, 1.9); ok(!has(e, 'shoot') && G.p.pink.st === 'ok', 'a carved face, quiet for a moment');
  ok(Trap.hazardAt(G, G.p.pink.x, G.p.pink.y, 0.7) === 'arrow' && !Trap.hazardAt(G, G.p.pink.x, G.p.pink.y, 0.3), 'the look-ahead knows when an arrow is due');
  e = run(G, 0.2); ok(has(e, 'shoot:arrow') && G.shots.length === 1, 'then it shoots');
  e = run(G, 1); ok(has(e, 'down:pink:arrow'), 'an arrow in its path: a fall'); }
{ const def = room(['P,,,,,,,,,', ',,,,,,,,,,', ',,,,,,,,,,', ',,,,,#,,,,', ',,,,,,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'arrow', x: 5, y: 0, dir: 'd', per: 2, ph: 1.9 }] }), G = go(def); put(G, 'pink', 5, 6);
  run(G, 2); ok(G.p.pink.st === 'ok' && G.shots.length === 0, 'arrows stop at a wall: shelter behind one'); }
{ const def = room(['P,,,,,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'roll', x: 5, dir: 'd', per: 3, ph: 2.5, sp: 140, shape: 'log' }] }), G = go(def); put(G, 'pink', 5, 7); put(G, 'mint', 9, 7);
  const e = run(G, 3); ok(has(e, 'shoot:log') && has(e, 'down:pink:log') && G.p.mint.st === 'ok', 'a log rolling down the slope knocks you over (only in its way)'); }
{ const def = room(['P,,,,,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'roll', x: 5, dir: 'u', per: 3, ph: 2.5, sp: 140, shape: 'rock' }] }), G = go(def); put(G, 'pink', 5, 7); put(G, 'mint', 6, 3);
  const e = run(G, 4); ok(has(e, 'shoot:rock') && has(e, 'down:pink:rock') && G.p.mint.st === 'ok', 'a boulder too, rolling up (a step to the side is enough)'); }
{ const def = room(['P,,,,,,,,,', ',1,,,,,,,,', ',,,,,,,,,,', ',,,,,,,,,,', ',,,,R,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'fire', x: 4, y: 5, len: 3, sp: 1.6, ph: 0, stop: '1' }] }), G = go(def); put(G, 'pink', 6, 5);
  ok(Trap.hazardAt(G, G.p.pink.x, G.p.pink.y) === 'fire', 'a fire bar along the ground');
  put(G, 'mint', 1, 2); const e = run(G, 3); ok(!has(e, 'down') && G.things[0].c === 0 && Trap.hazardAt(G, G.p.pink.x, G.p.pink.y) === '', 'somebody on its plate puts it out');
  put(G, 'mint', 1, 9); const e2 = run(G, DT); ok(has(e2, 'down:pink:fire'), 'off the plate it burns again');
  const H = go(def); put(H, 'pink', 6, 9); put(H, 'mint', 1, 9); run(H, 1); const a = H.things[0].c; ok(Math.abs(a - 1.6) < .02, 'and turns at its pace'); }
{ const def = room(['P,,,,,,,,,', 'M,,,,,,,,,'], { things: [{ k: 'saw', x0: 3, y0: 1, x1: 3, y1: 12, per: 2, ph: 0 }] }), G = go(def);
  const [sx, sy] = Trap.sawPos(def.things[0], 1); ok(Math.abs(sx - 3.5 * T) < .1 && Math.abs(sy - 7 * T) < .1, 'a saw halfway along its track halfway through');
  put(G, 'pink', 3, 9); const e = run(G, 2); ok(has(e, 'down:pink:saw'), 'a saw going by: a fall'); put(G, 'mint', 4, 6); ok(true, ''); }
// ---- falling and getting up
{ const def = room(['P,,,~~,,,,', 'M,,,,,,,,,']), G = go(def); run(G, 1.5, walk('pink', 1)); ok(G.p.pink.st === 'down', 'down');
  run(G, 2, { pink: { mx: -1 } }); ok(Math.abs(G.p.pink.x - G.p.pink.sx) < 1, 'nobody walks while down');
  const cv = G.cv.pink; put(G, 'mint', 2, 1); G.p.mint.x = G.p.pink.x - 20; G.p.mint.y = G.p.pink.y + 10;
  let e = run(G, 0.8); ok(!has(e, 'revive'), 'helping up takes a moment'); e = run(G, 0.3);
  ok(has(e, 'revive:pink') && G.p.pink.st === 'ok' && G.p.pink.inv > 1 && G.cv.pink === cv + 1, 'the other standing close helps you up (a moment of safety after)'); }
{ const def = room(['P,,,~~,,,,', 'M,,,,,,,,,']), G = go(def); run(G, 1.5, walk('pink', 1)); let e = run(G, Trap.DOWN_T - 1);
  ok(G.hearts === Trap.HEARTS && !has(e, 'hurt'), 'down alone: waiting for help'); e = run(G, 1.2);
  ok(has(e, 'hurt') && has(e, 'respawn:pink') && G.hearts === Trap.HEARTS - 1 && G.p.pink.st === 'ok' && G.p.pink.x === G.start.pink[0], 'too long: a heart, and back at the start'); }
{ const def = room(['P,,,~~,,,,', 'M,,,~~,,,,']), G = go(def); run(G, 1.5, { pink: { mx: 1 }, mint: { mx: 1 } }); ok(G.p.pink.st === 'down' && G.p.mint.st === 'down', 'both down');
  const e = run(G, Trap.BOTH_T + .05); ok(has(e, 'hurt') && has(e, 'respawn:pink') && has(e, 'respawn:mint') && G.hearts === Trap.HEARTS - 1, 'both down: a heart, and back for both'); }
{ const def = room(['P,,,~~,,,,', 'M,,,~~,,,,'], { hearts: 1 }), G = go(def); run(G, 1.5, { pink: { mx: 1 }, mint: { mx: 1 } }); const e = run(G, 2);
  ok(has(e, 'out') && G.over && G.failed && !G.won && Trap.stars(G) === 0, 'no hearts left: the run is over'); }
// ---- checkpoints, gems, hearts
{ const def = room(['P,,,,!,,,~~', 'M,,,,!,,,,,', ',,,,,!,,,,,']), G = go(def); const e = run(G, 1.5, walk('pink', 1));
  ok(has(e, 'check:0') && G.cp === 0, 'past the glowing stones: a checkpoint'); run(G, 2, walk('pink', 1)); run(G, Trap.DOWN_T + .2);
  ok(Math.abs(G.p.pink.x - 5.5 * T) < 1 && G.p.pink.st === 'ok', 'a fall sends you back to it, not to the start'); }
{ const def = room(['P,*,+,+,+,', 'M,,,,,,,,,']), G = go(def); const e = run(G, 3, walk('pink', 1));
  ok(e.filter(x => x === 'gem:pink').length === 1 && G.stats.gems === 1, 'a gem'); ok(G.hearts === Trap.MAX_HEARTS, `hearts to pick up, up to ${Trap.MAX_HEARTS}`); }
// ---- the temple gate and the clock
{ const def = room(['P,,,*,,,EE', 'M,,,,,,,EE'], { time: 60 }), G = go(def); let e = run(G, 3, walk('pink', 1)); ok(!G.over, 'one at the temple gate is not enough');
  e = run(G, 3, { pink: { mx: 0 }, mint: { mx: 1 } }); ok(has(e, 'win') && G.won && G.over, 'both of you: through');
  const want = Trap.FINISH_PTS + Trap.GEM_PTS + Trap.HEARTS * Trap.HEART_PTS + Math.round((60 - G.inT) * Trap.TIME_PTS);
  ok(Math.abs(G.score - want) <= 1, `score: finishing, gems, hearts left, time left (${G.score})`); }
{ const G = go(room(['P,,,,,,EE,', 'M,,,,,,EE,'], { time: 3 })); const e = run(G, 4); ok(has(e, 'time') && G.over && G.failed && Trap.stars(G) === 0, 'out of time: over'); }
// ---- the paths
PLEVELS.forEach((def, i) => {
  const G = Trap.load(def), W = G.W, used = new Set(def.map.join(''));
  const probs = [];
  if (def.map.length !== Trap.ROWS || def.map.some(r => r.length !== W)) probs.push('rows');
  if (!G.start.pink || !G.start.mint) probs.push('starts');
  for (const c of used) if (Trap.SPIKE.includes(c) && !(def.spikes || {})[c]) probs.push('spike ' + c);
  for (const c of used) if (Trap.GATE.includes(c) && !(def.gates || {})[c]) probs.push('gate ' + c);
  for (const g in def.gates || {}) for (const c of def.gates[g]) if (Trap.PLATE.includes(c) ? !G.plates[c] : G.levers.filter(l => l.id === c).length !== 2) probs.push('opener ' + c);
  for (const h of def.things || []) if (!(h.per > 0 || h.k === 'fire') || (h.stop && [...h.stop].some(c => !G.plates[c]))) probs.push('thing');
  // with every gate open and the traps ignored, the two starts reach the temple gate without crossing water
  const seen = new Set(), q = [[Math.floor(G.start.pink[0] / T), Math.floor(G.start.pink[1] / T)]]; let end = false;
  for (const g of Trap.GATE) G.gopen[g] = true;
  while (q.length) { const [x, y] = q.shift(), k = x + ',' + y; if (seen.has(k)) continue; seen.add(k); const c = Trap.tileAt(G, x, y); if (c === 'E') end = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!Trap.solid(G, nx, ny) && !Trap.WATER.includes(Trap.tileAt(G, nx, ny)) && !seen.has(nx + ',' + ny)) q.push([nx, ny]); } }
  if (!end) probs.push('no way through');
  ok(!probs.length && def.stars[0] < def.stars[1] && def.stars[1] < def.stars[2] && def.time > 0 && def.hint,
    `path ${i + 1} ${def.name}: ${W} tiles, ${G.checks.length} checkpoints, ${G.gems.length} gems${probs.length ? ' — ' + probs.join(', ') : ''}`);
});
ok(PLEVELS.every((d, i) => i === 0 || d.map[0].length > PLEVELS[i - 1].map[0].length * 0.9), 'the paths get longer');
// ---- the bots: a careful pair gets through every path
for (const def of PLEVELS) { const r = trek(def, { seed: 3 }); ok(r.won, `a careful pair walks ${def.name} (${r.t}s, ${r.score}, ${r.stats.downs} falls)`); }
// ---- two phones: pink plays on the host, mint on the guest
{ const def = PLEVELS[0], H = Trap.load(def), Gs = Trap.load(def), rq = { seen: -1, act: false, mx: 0, my: 0 };
  const toG = [], toH = []; let presses = 0, gev = [], hev = [];
  const lag = 6;                                                     // 50 ms each way
  const tick = (pinp, minp) => {
    // the guest
    gev.push(...Trap.step(Gs, { mint: minp, pink: { still: true } }, true));
    if (minp.act) presses++;
    toH.push(JSON.stringify(Trap.guestMsg(Gs, 'mint', minp, presses)));
    // the host
    while (toH.length > lag) Trap.hostHears(H, 'mint', JSON.parse(toH.shift()), rq);
    hev.push(...Trap.step(H, { pink: pinp, mint: rq }, false, 'mint')); rq.act = false;
    toG.push(JSON.stringify(Trap.encode(H)));
    while (toG.length > lag) Trap.apply(Gs, JSON.parse(toG.shift()), 'mint');
  };
  for (let i = 0; i < (Trap.START + 0.2) / DT; i++) tick({}, {});
  ok(H.st === 'run' && Gs.st === 'run', 'online: both phones start');
  for (let i = 0; i < 1.5 / DT; i++) tick({ mx: 1 }, { mx: 1, my: -0.3 });
  ok(Math.abs(Gs.p.mint.x - H.p.mint.x) < 12 && Math.abs(Gs.p.pink.x - H.p.pink.x) < 12, `online: both walk, and both phones agree (${(Gs.p.mint.x - H.p.mint.x).toFixed(1)}, ${(Gs.p.pink.x - H.p.pink.x).toFixed(1)})`);
  // mint walks into a spike beat on the guest: the host hears of it
  const Hm = H.p.mint; let fell = false;
  for (let i = 0; i < 6 / DT && !fell; i++) { tick({}, { mx: 1 }); fell = H.p.mint.st === 'down'; }
  ok(fell && gev.some(e => e.startsWith('down:mint')) && hev.some(e => e.startsWith('down:mint')), 'online: a fall on the guest reaches the host');
  // pink comes to help
  let up = false; for (let i = 0; i < 8 / DT && !up; i++) { const dx = Hm.x - H.p.pink.x, dy = Hm.y - H.p.pink.y, d = Math.hypot(dx, dy); tick(d > 20 ? { mx: dx / d, my: dy / d } : {}, {}); up = Gs.p.mint.st === 'ok' && H.p.mint.st === 'ok'; }
  ok(up && hev.includes('revive:mint'), 'online: helped up on the host, and up again on the guest');
  for (let i = 0; i < 0.5 / DT; i++) tick({}, { mx: -1 });
  ok(Math.abs(Gs.p.mint.x - H.p.mint.x) < 12, 'online: and walking on from there');
  ok(JSON.stringify(Trap.encode(H)).length < 1800, `online: a small message (${JSON.stringify(Trap.encode(H)).length} bytes)`);
  // a guest that claims to be somewhere far off is put back
  const cv = H.cv.mint; Trap.hostHears(H, 'mint', { mx: 0, my: 0, a: presses, x: H.p.mint.x + 400, y: H.p.mint.y, cv }, rq); ok(H.cv.mint === cv + 1, 'online: a jump the host cannot believe is corrected');
  // junk
  let threw = false; try { for (const m of [null, 5, 'x', {}, { p: 3, cv: 'a' }, { sh: [[9, 1]], sc: 'x', lv: [NaN] }]) { Trap.apply(Gs, m, 'mint'); Trap.hostHears(H, 'mint', m, rq); } run(H, 0.1); run(Gs, 0.1); } catch (e) { threw = e; }
  ok(!threw && Number.isFinite(Gs.p.pink.x) && Number.isFinite(H.p.mint.x), 'online: junk messages are ignored' + (threw ? ' ' + threw : '')); }
// ---- the guest's traps keep their beat when the host's word arrives late, and catch up when they drift
{ const def = PLEVELS[2], H = go(def), Gs = go(def); Trap.apply(Gs, Trap.encode(H), 'mint');
  run(H, 2); run(Gs, 2); const old = JSON.parse(JSON.stringify(Trap.encode(H))); run(Gs, 0.1); const c = Gs.things[0].c, n = Gs.shots.length;
  Trap.apply(Gs, old, 'mint'); ok(Gs.things[0].c === c && Gs.shots.length === n, 'online: a late message does not pull the traps back');
  Gs.things[0].c += 5; Trap.apply(Gs, old, 'mint'); ok(Math.abs(Gs.things[0].c - old.hz[0]) < 1e-9, 'online: traps that drifted apart take the host\'s beat'); }
// ---- a lever pulled on the guest's phone counts
{ const def = room(['P,,,,u,,,,#,,', ',,,,,,,,,J,,', 'M,,,,,,,,,#,,', ',,,,,,,,,#,,', ',,,,,u,,,,#,,'], { gates: { J: 'u' } }), H = go(def), rq = { seen: -1, act: false };
  put(H, 'pink', 5, 2); put(H, 'mint', 5, 4); Trap.hostHears(H, 'mint', { a: 0, cv: H.cv.mint, x: H.p.mint.x, y: H.p.mint.y }, rq);
  Trap.hostHears(H, 'mint', { a: 1, cv: H.cv.mint, x: H.p.mint.x, y: H.p.mint.y }, rq); const e = Trap.step(H, { pink: { act: true }, mint: rq }, false, 'mint');
  ok(e.includes('unlock:u'), 'online: a lever pulled on each phone at once unlocks the door'); }
console.log(fails ? fails + ' FAILED' : 'TRAP OK');
process.exit(fails ? 1 : 0);

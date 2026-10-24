// Long boat rules: one side turns the boat, both together go straight and glide, back-paddling brakes and swings,
// the current, banks and rocks (and cracking the hull), rapids and whirlpools, krathong, finishing, and two phones.
const { cruise, Boat, BLEVELS, rng, gauss } = require('./bbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const B1 = BLEVELS[0];
const open = Object.assign({}, B1, { river: [[0, 0, 960], [9000, 0, 960]], rocks: [], krathong: [], movers: [], zones: [], current: 0, length: 9000, limit: 999 });
const run = (G, s) => { const ev = []; for (let i = 0; i < Math.round(s / Boat.DT) && !G.over; i++) ev.push(...Boat.step(G)); return ev; };
const go = def => { const G = Boat.load(def); G.x = 480; run(G, Boat.START + 0.01); return G; };

{ const G = Boat.load(B1); Boat.press(G, 'pink', 'fwd', 1);
  ok(G.u === 0 && G.st === 'count', 'no paddling during the countdown');
  const e = run(G, Boat.START + 0.01); ok(e.includes('go') && G.st === 'run', 'then the race starts'); }
{ const G = go(open); Boat.press(G, 'pink', 'fwd', G.t); run(G, 1);
  ok(G.d > 20 && G.h > 0.2 && G.x > 480, `a stroke on the left pushes ahead and turns right (heading ${G.h.toFixed(2)})`);
  const M = go(open); Boat.press(M, 'mint', 'fwd', M.t); run(M, 1);
  ok(M.h < -0.2 && M.x < 480, 'a stroke on the right turns left'); }
{ const S = go(open), A = go(open);
  const e = Boat.press(S, 'pink', 'fwd', S.t).concat(Boat.press(S, 'mint', 'fwd', S.t));
  Boat.press(A, 'pink', 'fwd', A.t); let swing = 0; for (let i = 0; i < 30; i++) { run(A, Boat.DT); swing = Math.max(swing, Math.abs(A.h)); } Boat.press(A, 'mint', 'fwd', A.t);
  run(S, 1.2); run(A, 0.95);
  ok(e.includes('sync') && Math.abs(S.h) < 1e-6 && S.stats.sync === 1, 'both strokes together: straight ahead');
  ok(S.d > A.d * 1.2 && A.stats.sync === 0, `and the boat glides further than two strokes apart (${S.d.toFixed(0)} vs ${A.d.toFixed(0)} px)`);
  ok(swing > 0.1 && Math.abs(A.x - 480) > 4, `strokes a quarter second apart zigzag the boat (bow swung ${swing.toFixed(2)}, ended ${(A.x - 480).toFixed(0)} px aside)`); }
{ const G = go(open); Boat.press(G, 'pink', 'fwd', G.t); const u = G.u; run(G, 0.1); Boat.press(G, 'pink', 'fwd', G.t);
  ok(G.stats.strokes === 1 && G.u < u, 'a second stroke before the first is through does nothing'); }
{ const G = go(open); Boat.press(G, 'pink', 'fwd', G.t); Boat.press(G, 'mint', 'fwd', G.t); run(G, 0.5);
  const u = G.u; Boat.press(G, 'pink', 'back', G.t); run(G, 0.6);
  ok(G.u < u * 0.5 && G.h < -0.15, `back-paddling on the left brakes and swings the bow left (${G.h.toFixed(2)})`); }
{ const G = go(Object.assign({}, open, { current: 20 })); run(G, 3);
  ok(G.d < -30, 'nobody paddling: the river carries the boat back'); }
{ const G = go(Object.assign({}, open, { river: [[0, 380, 580], [9000, 380, 580]] }));
  G.h = 1.2; let hits = 0;
  for (let i = 0; i < 6; i++) { Boat.press(G, 'pink', 'fwd', G.t); Boat.press(G, 'mint', 'fwd', G.t); const e = run(G, 0.45); hits += e.filter(x => x.startsWith('bump') || x.startsWith('crack')).length; }
  const [a, b] = Boat.ends(G);
  ok(hits > 0 && Math.min(a[0], b[0]) >= 380 && Math.max(a[0], b[0]) <= 580, 'paddling into the bank bounces off it and stays on the water'); }
{ const G = go(Object.assign({}, open, { rocks: [[480, 260, 22]] }));
  for (let i = 0; i < 4; i++) { Boat.press(G, 'pink', 'fwd', G.t); Boat.press(G, 'mint', 'fwd', G.t); run(G, 0.45); }
  const [a, b] = Boat.ends(G), ex = a[0] - b[0], ed = a[1] - b[1], k = Math.max(0, Math.min(1, ((480 - b[0]) * ex + (260 - b[1]) * ed) / (ex * ex + ed * ed)));
  ok(G.hull < Boat.HULL && G.stats.hard >= 1, `ramming a rock at speed cracks the hull (${G.hull.toFixed(0)} left)`);
  ok(Math.hypot(b[0] + ex * k - 480, b[1] + ed * k - 260) >= 22 + Boat.BEAM / 2 - 0.5, 'and the boat is never inside the rock'); }
{ const G = go(Object.assign({}, open, { rocks: [[480, 200, 22]] })); G.hull = 3;
  let e = []; for (let i = 0; i < 6 && !G.over; i++) { Boat.press(G, 'pink', 'fwd', G.t); Boat.press(G, 'mint', 'fwd', G.t); e = e.concat(run(G, 0.45)); }
  ok(G.over && G.sunk && e.includes('sink') && Boat.stars(G) === 0, 'a cracked hull that breaks sinks the boat: no stars'); }
{ const G = go(Object.assign({}, open, { krathong: [[480, 150], [900, 150]] }));
  for (let i = 0; i < 4; i++) { Boat.press(G, 'pink', 'fwd', G.t); Boat.press(G, 'mint', 'fwd', G.t); run(G, 0.45); }
  ok(G.krN === 1 && G.kr[0] === 1 && G.kr[1] === 0, 'a krathong the boat passes is picked up, one far away is not'); }
{ const R = go(Object.assign({}, open, { zones: [{ type: 'rapid', from: -100, to: 9000, push: 30, side: 40 }] })); run(R, 2);
  ok(R.x > 540 && R.d < -30, `rapids shove the boat sideways and back (${(R.x - 480).toFixed(0)} px aside, ${R.d.toFixed(0)} px back)`);
  const W = go(Object.assign({}, open, { zones: [{ type: 'whirl', x: 480, d: 40, r: 120, spin: .9 }] })); run(W, 2);
  ok(Math.abs(W.h) > 0.3, `a whirlpool spins the boat (${W.h.toFixed(2)})`); }
{ const def = BLEVELS[1], a = Boat.movers(def, 0), b = Boat.movers(def, 3);
  ok(a.length === 4 && a.some((m, i) => Math.abs(m.x - b[i].x) > 50), 'market boats cross the river');
  const n = BLEVELS[4], c = Boat.movers(n, 0), d = Boat.movers(n, 3);
  ok(c.every((m, i) => d[i].d < m.d || d[i].d > m.d + 100), 'logs drift down with the current'); }
{ const r = cruise(B1, { seed: 3, sd: 0.02, collect: true, react: .1, judge: .03 });
  ok(r.finished && r.stars === 3 && Math.abs(Boat.score(r.G) - (r.G.time - r.G.krN * Boat.KR_BONUS)) < 1e-9, `a careful crew finishes the canal (${r.G.time.toFixed(1)} s, ${r.kr} krathong, score ${r.score.toFixed(1)})`);
  const G = go(B1); run(G, B1.limit + 1); ok(G.over && !G.finished && Boat.stars(G) === 0, 'not finishing in time: no stars'); }
for (const def of BLEVELS) { const r = cruise(def, { seed: 5, sd: 0.02, collect: true, react: .1, judge: .03 }); ok(r.finished && r.stars === 3, `${def.name}: ${r.G.time.toFixed(1)} s, ${r.kr}/${(def.krathong || []).length} krathong, hull ${Math.round(r.hull)}`); }
{ const def = BLEVELS[3], r = def.rivals[2];
  ok(Boat.rivalD(def, r, Boat.START) === 0 && Math.abs(Boat.rivalD(def, r, Boat.START + r.time) - def.length) < 1e-6, 'rival boats reach the finish on their time'); }

// online: the guest's strokes carry their true time and arrive late; the host judges sync by those times
for (const [li, lat] of [[0, 0.08], [3, 0.2]]) {
  const def = BLEVELS[li], H = Boat.load(def), U = Boat.load(def), R = rng(40 + li);
  let n = 0, seen = 0; const q = [], sent = [], local = [];
  let beat = Boat.START + 0.15;
  for (let k = 0; k < (def.limit + 5) / Boat.DT && !H.over; k++) {
    const t = (k + 1) * Boat.DT;
    Boat.step(H); Boat.guestStep(U);
    if (H.st === 'run' && t >= beat) {
      beat += 0.46;
      // the pair agree on the call by voice in the same room; the host's screen is what both steer by
      const { target } = require('./bbot.js'), [tx, td] = target(H, {}), e = Boat.wrap(Math.atan2(tx - H.x, td - H.d) - H.h);
      const call = Math.abs(e) < 0.12 ? { pink: 'fwd', mint: 'fwd' } : e > 0 ? { pink: 'fwd', mint: e > .5 ? 'back' : null } : { mint: 'fwd', pink: e < -.5 ? 'back' : null };
      if (call.pink) local.push({ t: t + Math.abs(gauss(R)) * 0.015, kind: call.pink });
      if (call.mint) sent.push([++n, call.mint, Math.round((t + Math.abs(gauss(R)) * 0.015) * 1000) / 1000]);
    }
    while (local.length && local[0].t <= t) { const p = local.shift(); Boat.press(H, 'pink', p.kind, p.t); }
    if (k % 4 === 0) { q.push({ at: t + lat, h: true, m: sent.filter(s => s[2] <= t).slice(-6) }); q.push({ at: t + lat, h: false, m: JSON.parse(JSON.stringify(Boat.encode(H))) }); }
    while (q.length && q[0].at <= t) { const e = q.shift(); if (e.h) { for (const [i, kind, st] of e.m) if (i > seen) { seen = i; Boat.press(H, 'mint', kind, st); } } else Boat.apply(U, e.m, true); }
  }
  Boat.apply(U, JSON.parse(JSON.stringify(Boat.encode(H))), false);
  ok(H.finished && H.stats.sync >= 20, `${def.name} online, ${lat * 1000} ms each way: finished in ${H.time.toFixed(1)} s with ${H.stats.sync} strokes judged together, hull ${Math.round(H.hull)}`);
  ok(U.finished && U.time === H.time && Math.abs(U.x - H.x) < .01 && Math.abs(U.d - H.d) < .01 && U.stats.sync === H.stats.sync, 'and the guest sees the same finish');
}
{ const G = go(B1); let thrown = null;
  for (const junk of [null, 5, {}, { x: 'q', d: NaN, kr: 7, lp: 3 }, { kr: '1111111111', lm: ['x', 'y'] }, { st: 'zz', h: 1e9 }]) { try { Boat.apply(G, junk, true); Boat.guestStep(G); Boat.press(G, 'mint', 'sideways', G.t); Boat.press(G, 'pink', 'fwd', NaN); } catch (e) { thrown = e; } }
  ok(!thrown && [G.x, G.d, G.h, G.u].every(Number.isFinite), 'junk snapshots and strokes are ignored'); }

console.log(fails ? `${fails} FAILED` : 'BOAT OK');
process.exit(fails ? 1 : 0);

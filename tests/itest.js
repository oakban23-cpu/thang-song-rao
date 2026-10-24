// Kite rules: launching needs the runner, letting out line climbs, pulling and gusts strain the line, a short line is
// safe, gusts snap a held long line but not a released one, the reel runs out, sinking kites crash and come back,
// trees, power lines and other people's lines, points only up in the air, the same wind on both phones, and two
// phones online (the guest's own half of the controls acts at once on its screen, the host decides).
const { fly, kiteCrew, Kite, ILEVELS } = require('./ibot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Kite.DT;
const field = (extra = {}) => Object.assign({ name: 't', field: [100, 1500], start: 700, launchAt: 700, spool: 900, time: 200, seed: 3, wind: { base: 115, var: 0, period: [50, 60] }, stars: [1, 2, 3] }, extra);
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Kite.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Kite.load(def); run(G, Kite.START + DT); return G; };
// get a kite up: run into the wind letting line out, then hold
function upTo(G, L) {
  run(G, 4, { run: { mx: -1 }, line: { rel: 1 } });
  for (let i = 0; i < 60 / DT && G.L < L; i++) Kite.step(G, { line: { rel: 1 } });
  run(G, 4);
  return G;
}

{ const G = Kite.load(field()); const ev = run(G, 2, { run: { mx: -1 }, line: { rel: 1 } });
  ok(G.st === 'count' && G.L === Kite.LMIN && G.score === 0 && !ev.includes('down:snap'), 'during the countdown the kite stays in hand (the runner may get ready)');
  run(G, 1.2); ok(G.st === 'fly', 'then it flies'); }
{ const G = go(field()); run(G, 8);
  ok(G.k.y < 60 && G.score === 0, `standing still, the kite cannot get up on its own near the ground (${G.k.y.toFixed(0)} px, ${G.score.toFixed(0)} points)`);
  const L0 = G.L; run(G, 6, { line: { rel: 1 } });
  ok(G.L < L0 + 60 && G.k.y < 80, `letting out line without running does not get it up either (line ${G.L.toFixed(0)})`); }
{ const G = go(field()); const ev = run(G, 4, { run: { mx: -1 }, line: { rel: 1 } });
  ok(G.k.y > 150 && G.L > 150 && !ev.some(e => e.startsWith('down')), `running into the wind while letting line out launches it (${(G.k.y / 10).toFixed(0)} m on ${G.L.toFixed(0)} px of line)`);
  const y0 = G.k.y; run(G, 6);
  ok(G.st === 'fly' && G.k.y > y0 - 20, `up there the wind holds it without running (${(G.k.y / 10).toFixed(0)} m)`);
  const L1 = G.L, y1 = G.k.y; run(G, 12, { line: { rel: 1 } }); run(G, 5);
  ok(G.L > L1 + 150 && G.k.y > y1 + 120, `letting out more line in a good wind takes it higher (${(G.k.y / 10).toFixed(0)} m on ${G.L.toFixed(0)} px)`);
  const T0 = G.T; run(G, 0.6, { line: { pull: 1 } });
  ok(G.T > T0 * 1.25 && G.L < G.def.spool, `pulling the line in makes it pull harder (${T0.toFixed(0)} → ${G.T.toFixed(0)})`); }
{ const G = go(field()); const ev = run(G, 3, { run: { mx: -1, act: true } });
  ok(!ev.includes('down:snap') && G.L === Kite.LMIN, 'sprinting with the kite on a short line does not snap it');
  ok(G.stats.sprints === 1, 'one sprint, then it needs a rest'); }
// gusts
{ const def = field({ wind: { base: 115, var: 0, period: [50, 60], gust: { first: 50, every: [999, 999], dur: 1.8, peak: 215 } } });
  const H = upTo(go(def), 650), R = upTo(go(def), 650);
  const t0 = H.ws.gusts[0][0];
  run(H, t0 - H.t - 2); run(R, t0 - R.t - 2);
  let warned = false; for (let i = 0; i < 1 / DT; i++) { Kite.step(H, {}); Kite.step(R, {}); if (Kite.gustSoon(H, H.t)) warned = true; }
  ok(warned && H.wind < 140, 'the flags warn of a gust before it hits');
  let eh = []; for (let i = 0; i < 5 / DT && H.st === 'fly'; i++) eh.push(...Kite.step(H, {}));
  const er = run(R, 5, { line: { rel: 1 } });
  ok(eh.includes('down:snap') && H.stats.snaps === 1, 'a gust on a held long line snaps it');
  ok(!er.some(e => e.startsWith('down')) && R.L > 700, `letting line out through the gust saves it (line out to ${R.L.toFixed(0)})`);
  const F = upTo(go(Object.assign({}, def, { spool: 650 })), 650); run(F, t0 - F.t - 0.5);
  const Lf = F.L, ef = run(F, 5, { line: { rel: 1 } });
  ok(ef.includes('down:snap') && Lf >= 649, 'with all the line already out there is nothing to let out: it snaps');
  const x0 = H.k.x; run(H, 0.5); ok(H.st === 'down' && H.cause === 'snap' && H.k.x > x0 + 20, 'a snapped kite flutters away downwind');
  const e2 = run(H, 3); ok(e2.includes('relaunch') && H.st === 'fly' && H.L === Kite.LMIN, 'and a new one is back in hand on a short line a moment later'); }
// sinking and crashing
{ const def = field({ wind: { base: 115, var: 0, period: [50, 60], lull: { first: 30, every: [999, 999], dur: 6, depth: 0.7 } } });
  const G = upTo(go(def), 400); run(G, 30 + Kite.START - G.t);
  const ev = run(G, 8);
  ok(ev.includes('down:crash') && G.stats.crashes === 1, 'when the wind dies and nobody helps, the kite sinks to the ground');
  const H = upTo(go(def), 400);
  run(H, 30 + Kite.START - 1 - H.t, () => ({ run: { mx: H.run.x < 1200 ? 0.6 : 0 } }));     // walk downwind first, to have room
  let lowest = 1e9;
  const eh = run(H, 8, () => { lowest = Math.min(lowest, H.k.y); return { run: { mx: H.k.vy < 0 ? -1 : 0 }, line: { pull: H.k.vy < -10 ? 1 : 0 } }; });
  ok(!eh.some(e => e.startsWith('down')), `running into the wind and pulling the line keep it up through the lull (lowest ${(lowest / 10).toFixed(0)} m)`); }
// trees, power lines
{ const T = upTo(go(field({ trees: [{ x: 640, y: 560, r: 80 }] })), 300);
  let ev = []; for (let i = 0; i < 20 / DT && T.st === 'fly'; i++) ev.push(...Kite.step(T, { line: { rel: 1 } }));
  ok(ev.includes('down:tree'), 'flying the kite into a tree catches it');
  const W = go(field({ wires: [{ x0: 300, x1: 1000, y: 110 }] }));
  const ew = run(W, 6, { run: { mx: -1 }, line: { rel: 1 } });
  ok(ew.includes('down:wire'), 'a power line over the field catches a kite or line that crosses it'); }
// other kites
{ const r = { ax: 400, kx: 1400, ky: 300, sx: 0, sy: 0, px: 9, py: 9, ph: 0, col: '#f00', kind: 'pakpao' };
  const G = upTo(go(field({ rivals: [r], start: 1000, launchAt: 1000 })), 500);
  ok(G.stats.cuts === 1 || G.rub > 0 || G.st === 'down', 'a line crossing another flyer\'s line rubs on it…');
  const C = go(field({ rivals: [r], start: 1000 }));
  let touch = 0; const ec = []; for (let i = 0; i < 30 / DT && C.st === 'fly'; i++) { ec.push(...Kite.step(C, { run: { mx: C.t < 7 ? -1 : 0 }, line: { rel: 1 } })); if (C.rub > 0) touch++; }
  ok(ec.includes('rub') && ec.includes('down:cut'), '…and cuts it after a while');
  const D = upTo(go(field({ rivals: [Object.assign({}, r, { ax: 1700, kx: 2400 })], start: 600, launchAt: 600 })), 600);
  ok(D.stats.cuts === 0 && D.st === 'fly', 'a flyer far downwind is no trouble'); }
// points
{ const G = upTo(go(field()), 600); const s0 = G.score, h = Kite.height(G); run(G, 2);
  ok(Math.abs(G.score - s0 - 2 * (h - 8)) < 2 * 0.05 * h + 1 && G.best >= h - 1, `every second in the air scores the height above the first 8 m (${h.toFixed(0)} m: +${(G.score - s0).toFixed(0)})`);
  const I = go(field()); run(I, 20); ok(I.score === 0, 'a kite hanging by the runner scores nothing'); }
// the wind is the same on both phones
{ const A = Kite.load(ILEVELS[4]), B = Kite.load(ILEVELS[4]);
  ok([5, 17.3, 44, 71.25].every(t => Kite.windAt(A, t) === Kite.windAt(B, t)), 'the wind is the same for everyone on a field');
  ok(A.ws.gusts.length > 3 && A.ws.lulls.length > 2, `the final has gusts (${A.ws.gusts.length}) and lulls (${A.ws.lulls.length})`); }
// every field: a careful crew gets three stars
for (const [li, def] of ILEVELS.entries()) { const r = fly(def, { seed: 21 + li, react: .15, think: .08 }); ok(r.stars >= 2, `${def.name}: a careful crew scores ${r.score} (${r.stars} stars, best ${r.best.toFixed(0)} m)`); }

// online: the host runs the field; the guest (here the line handler, or the runner) sends its controls and sees its
// own half act at once, snapshots soften its picture toward the host's
for (const [li, lat, guestRole] of [[0, 0.1, 'line'], [1, 0.15, 'run'], [3, 0.2, 'line']]) {
  const def = ILEVELS[li], H = Kite.load(def), U = Kite.load(def), crew = kiteCrew(H, { seed: 31 + li, react: .2, think: .1 });
  const toHost = [], toGuest = [], other = guestRole === 'line' ? 'run' : 'line';
  let gi = { mx: 0, pull: 0, rel: 0, act: false }, worst = 0, sumd = 0, n = 0, presses = 0, seen = 0;
  while (!H.over && H.t < def.time + Kite.START + 1) {
    const plan = crew();
    // guest: its own half now, the partner's half as the last snapshot said
    const mine = plan[guestRole];
    if (mine.act) presses++;
    const gin = guestRole === 'line' ? { run: { mx: U.inp.mx }, line: mine } : { run: mine, line: { pull: U.inp.pull, rel: U.inp.rel } };
    Kite.step(U, gin, true);
    if (Math.round(H.t / DT) % 4 === 0) toHost.push({ at: H.t + lat, m: guestRole === 'line' ? { pull: mine.pull || 0, rel: mine.rel || 0, a: presses } : { mx: mine.mx || 0, a: presses } });
    while (toHost.length && toHost[0].at <= H.t) { const m = toHost.shift().m; gi = Object.assign({}, gi, m, { act: m.a > seen }); seen = m.a; }
    const hin = { [other]: plan[other], [guestRole]: guestRole === 'line' ? { pull: gi.pull, rel: gi.rel, act: gi.act } : { mx: gi.mx, act: gi.act } };
    gi.act = false;
    Kite.step(H, hin);
    if (Math.round(H.t / DT) % 4 === 0) toGuest.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Kite.encode(H))) });
    while (toGuest.length && toGuest[0].at <= H.t) Kite.apply(U, toGuest.shift().m, true);
    if (H.st === 'fly' && U.st === 'fly' && H.t > 8) { const d = Math.hypot(U.k.x - H.k.x, U.k.y - H.k.y); worst = Math.max(worst, d); sumd += d; n++; }
  }
  Kite.apply(U, JSON.parse(JSON.stringify(Kite.encode(H))), true);
  ok(Kite.stars(H) >= 1, `${def.name} online, ${lat * 1000} ms each way, guest on the ${guestRole === 'line' ? 'line' : 'run'}: ${Math.round(H.score)} points (${Kite.stars(H)} stars)`);
  ok(n && sumd / n < 25, `the guest's kite stays close to the host's (${(sumd / n).toFixed(1)} px apart on average, ${worst.toFixed(0)} at most)`);
  ok(Math.round(U.score) === Math.round(H.score) && U.over, 'and the guest ends with the same points');
}
{ const G = go(ILEVELS[0]); let thrown = null;
  for (const junk of [null, 5, 'x', {}, { st: 'zz', k: 'no', r: [NaN] }, { L: 1e9, th: -9, k: [1e9, NaN], in: ['a', 9, -3] }]) { try { Kite.apply(G, junk, true); Kite.step(G, { run: { mx: NaN, act: 'x' }, line: { pull: Infinity, rel: -1 } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.k.x, G.k.y, G.L, G.th, G.run.x].every(Number.isFinite) && G.L <= G.def.spool, 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'KITE OK');
process.exit(fails ? 1 : 0);

// Three-legged race rules: the countdown, steps taken together, wrong legs and tangles, waiting on one leg, falling
// and getting up, rushing, mud, hills, wet ground, hurdles, finishing against the rival teams, and two phones online.
const { race, Leg, LLEVELS, rng, gauss } = require('./lbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const L1 = LLEVELS[0];
const run = (G, s) => { const ev = []; for (let i = 0; i < Math.round(s / Leg.DT) && !G.over; i++) ev.push(...Leg.step(G)); return ev; };
const go = def => { const G = Leg.load(def); run(G, Leg.START + 0.01); return G; };
const both = (G, leg, gap = 0) => { const e = Leg.press(G, 'pink', leg, G.t); e.push(...run(G, gap)); return e.concat(Leg.press(G, 'mint', leg, G.t)); };
const mk = (o) => Object.assign({}, L1, { length: 3000, limit: 99 }, o);

{ const G = Leg.load(L1);
  Leg.press(G, 'pink', 'in', 0.5); Leg.press(G, 'mint', 'in', 0.5);
  ok(G.st === 'count' && G.steps === 0, 'nothing moves during the countdown');
  const ev = run(G, Leg.START + 0.01);
  ok(ev.includes('go') && G.st === 'run', 'then the race starts'); }
{ const G = go(L1);
  const ev = both(G, 'in', 0.03);
  ok(ev.includes('step:in:perfect') && Math.abs(G.owe - Leg.STRIDE * 1.15) < 1e-6 && G.expect === 'out', 'both lift the tied leg within 60 ms: a perfect, longer stride, and the outer legs are next');
  run(G, 0.25); const e2 = both(G, 'out', 0.12);
  ok(e2.includes('step:out:good') && G.expect === 'in', 'within 150 ms is a good step');
  run(G, 0.25); const b0 = G.bal; const e3 = both(G, 'in', 0.25);
  ok(e3.includes('step:in:loose') && G.bal < b0, 'further apart is a loose, short step that costs balance');
  run(G, 1); ok(G.x > 60, `the pair moves ahead (${G.x.toFixed(0)} px)`); }
{ const G = go(L1); both(G, 'in'); run(G, 0.25);
  const ev = Leg.press(G, 'pink', 'in', G.t);
  ok(ev.some(e => e === 'wrong:pink') && G.bal < 1 && !G.pend.pink.length, 'the same leg twice in a row is the wrong leg');
  const H = go(L1), b = H.bal; Leg.press(H, 'pink', 'out', H.t); const e2 = Leg.press(H, 'mint', 'in', H.t);
  ok(e2.includes('tangle') && H.bal < b - 0.4 && H.steps === 0, 'one lifts the outer leg, the other the tied one: tangled, nobody moves'); }
{ const G = go(L1); Leg.press(G, 'pink', 'in', G.t);
  const e = run(G, 2);
  ok(e.includes('fall') && G.st === 'down' && G.stats.falls === 1, 'standing on one leg waiting for the partner wobbles until both fall');
  const e2 = run(G, Leg.FALL_T + 0.05);
  ok(e2.includes('up') && G.st === 'run' && G.bal > 0.6 && G.expect === null, 'they get up after a moment and start again with either leg'); }
{ const G = go(mk({})); both(G, 'in'); run(G, 0.08);
  const e = both(G, 'out');
  ok(e.includes('rush') && G.stats.rush === 1, 'stepping faster than legs can go stumbles'); }
{ const mud = go(mk({ zones: [{ from: 0, to: 3000, type: 'mud' }] })), flat = go(mk({}));
  for (const G of [mud, flat]) { both(G, 'in', 0.2); run(G, 0.3); both(G, 'out', 0.2); run(G, 2); }
  ok(mud.x < flat.x * 0.7 && 1 - mud.bal > (1 - flat.bal) * 1.4, `mud shortens steps (${mud.x.toFixed(0)} vs ${flat.x.toFixed(0)} px) and slips cost more`); }
{ const up = go(mk({ zones: [{ from: 0, to: 3000, type: 'up' }] })), down = go(mk({ zones: [{ from: 0, to: 3000, type: 'down' }] }));
  for (const G of [up, down]) { both(G, 'in'); run(G, 0.3); both(G, 'out'); run(G, 1); }
  ok(up.x < 50 && down.x > 75, `uphill steps are short (${up.x.toFixed(0)}), downhill long (${down.x.toFixed(0)})`);
  run(down, 0.01); both(down, 'in'); run(down, 0.2); const e = both(down, 'out');
  ok(e.includes('rush'), 'downhill, steps 0.2 s apart are already too fast'); }
{ const G = go(mk({ zones: [{ from: 0, to: 3000, type: 'wet' }] }));
  Leg.press(G, 'pink', 'in', G.t); const e = Leg.press(G, 'mint', 'out', G.t);
  ok(e.includes('fall') && G.st === 'down', 'on wet ground a tangle is a fall straight away'); }
{ const G = go(mk({ hurdles: [100] }));
  for (let i = 0; i < 6 && G.hurdle < 0; i++) { both(G, i % 2 ? 'out' : 'in'); run(G, 0.3); }
  ok(G.hurdle === 0 && Math.abs(G.x - (100 - Leg.HURDLE_STOP)) < 1e-6, 'the pair stops at the hurdle');
  run(G, 0.3); const e = both(G, G.expect, 0.14);
  ok(e.includes('trip') && G.st === 'down' && G.x < 100, 'a step 140 ms apart trips over it');
  run(G, Leg.FALL_T + 0.1); const e2 = both(G, 'in', 0.05);
  ok(e2.includes('jump') && G.x > 100 && G.hurdle === -1 && G.cleared === 1, 'a step together clears it'); }
{ const r = race(L1, { seed: 1, I: 0.2, sd: 0.015 });
  ok(r.finished && r.stars === 3 && r.place === 1 && r.ev.includes('finish'), `a tight pair finishes first (${r.time.toFixed(1)} s)`);
  const G = go(L1); run(G, L1.limit + 1);
  ok(G.over && !G.finished && Leg.stars(G) === 0 && Leg.place(G) === 4, 'nobody pressing: time runs out, last place, no star'); }
{ const G = Leg.load(L1), r = LLEVELS[0].rivals[2];
  ok(Leg.rivalX(L1, r, Leg.START) === 0 && Math.abs(Leg.rivalX(L1, r, Leg.START + r.time) - L1.length) < 1e-6 && Leg.rivalX(L1, r, Leg.START + r.time / 2) > L1.length * 0.3, 'rival teams run the course in their time');
  void G; }
// every course can be finished by a careful pair, with every kind of ground on it
for (const def of LLEVELS) { const r = race(def, { seed: 9, I: 0.2, sd: 0.015 }); ok(r.finished && r.stars === 3, `${def.name}: finished in ${r.time.toFixed(1)} s, ${r.s.jumps} hurdles, ${r.falls} falls`); }

// online: the guest's presses carry the true time (its clock synced to the host's); they arrive late in a list
for (const [li, lat] of [[0, 0.08], [2, 0.15], [4, 0.25]]) {
  const def = LLEVELS[li], H = Leg.load(def), U = Leg.load(def), R = rng(21 + li);
  H.late = 2 * lat + 0.05;
  const q = [], sent = []; let seen = 0, nextCall = Leg.START + 0.25, leg = 'in', sched = null, waitUp = false;
  for (let k = 0; k < (def.limit + 5) / Leg.DT && !H.over; k++) {
    const t = (k + 1) * Leg.DT;
    const e = Leg.step(H);
    Leg.guestStep(U);
    if (e.includes('fall')) { waitUp = true; sched = null; }
    if (e.includes('up')) { waitUp = false; nextCall = H.t + 0.35; sched = null; leg = 'in'; }
    if (H.st === 'run' && !waitUp) {
      // the two players count in, out, in, out together (in the same room or on a call); nobody waits for the screen
      if (!sched && t >= nextCall) { sched = { p: { t: nextCall + gauss(R) * 0.015, leg }, m: { t: nextCall + gauss(R) * 0.015, leg } }; leg = leg === 'in' ? 'out' : 'in'; nextCall += U.hurdle >= 0 ? 0.45 : 0.2; }
      if (sched && sched.p && t >= sched.p.t) { Leg.press(H, 'pink', sched.p.leg, sched.p.t); sched.p = null; }
      if (sched && sched.m && t >= sched.m.t) { sent.push([sent.length + 1, sched.m.leg, sched.m.t]); sched.m = null; }
      if (sched && !sched.p && !sched.m) sched = null;
    }
    if (k % 4 === 0) { q.push({ at: t + lat, to: 'h', m: sent.slice(-6) }); q.push({ at: t + lat, to: 'g', m: JSON.parse(JSON.stringify(Leg.encode(H))) }); }
    while (q.length && q[0].at <= t) {
      const msg = q.shift();
      if (msg.to === 'h') for (const [n, lg, st] of msg.m) { if (n > seen) { seen = n; Leg.press(H, 'mint', lg, st); } }
      else Leg.apply(U, msg.m);
    }
  }
  Leg.apply(U, JSON.parse(JSON.stringify(Leg.encode(H))));
  const s = H.stats;
  ok(H.finished && s.perfect >= (s.perfect + s.good + s.loose) * 0.7 && s.tangle === 0, `${def.name} online, ${lat * 1000} ms each way: finished in ${H.time.toFixed(1)} s, ${s.perfect}/${s.perfect + s.good + s.loose} steps judged perfect by their true times, ${s.falls} falls`);
  ok(U.finished && U.time === H.time && U.x === H.x && U.stats.perfect === s.perfect, 'and the guest sees the same race');
}
{ const G = go(L1); let thrown = null;
  for (const junk of [null, 5, {}, { st: 'x', x: 'q', pd: 5 }, { pd: [[9, 'a'], 3] }, { x: 1e9, b: -5, s: 'x' }]) { try { Leg.apply(G, junk); Leg.guestStep(G); Leg.press(G, 'mint', 'in', NaN); Leg.press(G, 'mint', 'sideways', G.t); } catch (e) { thrown = e; } }
  ok(!thrown && Number.isFinite(G.x) && G.x <= L1.length && G.bal >= 0 && G.bal <= 1, 'junk snapshots and presses are ignored'); }

{ const r = race(LLEVELS[0], { seed: 2, I: 0.2, sd: 0.015 }), G = r.G, b = G.bal, n = G.stats.wrong;
  Leg.press(G, 'pink', 'in', G.t); Leg.press(G, 'pink', 'in', G.t); Leg.press(G, 'mint', 'out', G.t);
  ok(G.over && G.bal === b && G.stats.wrong === n, 'after the finish line presses do nothing'); }
{ let bad = 0;
  for (const def of LLEVELS) for (const mash of [4, 8, 12, 20]) { const r = race(def, { seed: mash, mash }); if (!Number.isFinite(r.G.bal) || !Number.isFinite(r.G.x) || r.stars > 0) bad++; }
  ok(bad === 0, 'mashing any speed on any course keeps the numbers sane and earns nothing'); }
console.log(fails ? `${fails} FAILED` : 'RACE OK');
process.exit(fails ? 1 : 0);

// One-blanket rules: covered warms toward cosy, uncovered chills (colder with the air on), close together is warmer,
// pulling and tug-of-war, sleepers drift and can roll off the bed, kicks, rolls, farts and airing out, the mosquito
// and the slaps, wake-ups and the ruined night, and two phones online.
const { sleep, bedCrew, Bed, HLEVELS } = require('./hbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Bed.DT;
const room = (extra = {}) => Object.assign({ name: 't', time: 300, blanket: 140, start: [95, 145], ac: 7, drift: 0, seed: 3, events: {}, stars: [1, 2, 3] }, extra);
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Bed.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Bed.load(def); run(G, Bed.START + DT); return G; };

{ const G = Bed.load(room({ drift: 30 })); const x = G.x.pink; run(G, 1.5, { pink: { mx: -1 } }); ok(G.x.pink === x, 'nobody moves before the lights go out'); }
{ const G = go(room()); ok(Bed.cover(G, 'pink') === 1 && Bed.cover(G, 'mint') === 1, 'lying close under the blanket: both covered');
  run(G, 20); ok(Bed.comfy(G, 'pink') && Bed.comfy(G, 'mint') && G.Z.pink < 5, `close together under the blanket they sleep well (warmth ${G.H.pink.toFixed(0)})`);
  const s0 = G.score; run(G, 1); ok(G.score - s0 > Bed.RATE, `and score every second (${(G.score - s0).toFixed(1)})`); }
{ const G = go(room({ start: [40, 200], blanketAt: 40 })); run(G, 5);
  ok(G.H.mint < 30 && G.H.pink > 40, `the one left uncovered gets cold (${G.H.mint.toFixed(0)}), the covered one does not (${G.H.pink.toFixed(0)})`);
  const e = []; for (let i = 0; i < 20 / DT && !G.strikes; i++) e.push(...Bed.step(G, {}));
  ok(e.includes('wake:mint:cold') && G.strikes === 1 && G.awake.mint > 0, 'cold enough for long enough wakes them: a strike'); }
{ const A = go(room({ start: [70, 170], blanket: 220 })), B = go(room({ start: [95, 145], blanket: 220 })); run(A, 20); run(B, 20);
  ok(B.H.pink > A.H.pink + 5 && Bed.spooning(B) && !Bed.spooning(A), `lying close is warmer (${B.H.pink.toFixed(0)} against ${A.H.pink.toFixed(0)})`); }
// pulling
{ const G = go(room({ blanketAt: 150 })); const c0 = G.c; run(G, 0.5, { pink: { pull: true } }); ok(G.c < c0 - 20, 'pulling brings the blanket toward you');
  const e = run(G, 1, { pink: { pull: true }, mint: { pull: true } }); const c1 = G.c; run(G, 1, { pink: { pull: true }, mint: { pull: true } });
  ok(e.includes('tug') && G.tug && Math.abs(G.c - c1) < 1e-6 && G.Z.pink > 10, 'both pulling against each other: a tug of war, nobody gets it, and it wakes them'); }
// drifting and falling off
{ const G = go(room({ drift: 30, start: [40, 200] })); const e = run(G, 30);
  ok(e.some(x => x.startsWith('fall:')) && G.stats.wakes >= 1, 'sleepers drift about; left alone near the edge, one rolls off the bed and wakes');
  const H = go(room({ drift: 30 })); const eh = run(H, 30, () => ({ pink: { mx: Math.max(-1, Math.min(1, (95 - H.x.pink) / 10)) }, mint: { mx: Math.max(-1, Math.min(1, (145 - H.x.mint) / 10)) } }));
  ok(!eh.some(x => x.startsWith('fall:')) && H.stats.wakes === 0, 'each keeping their own sleeper in place: nobody falls'); }
// things in the night
const one = (kind, who = 'pink', extra = {}) => { const def = room(Object.assign({ events: { [kind]: 1 }, time: 40 }, extra)); const G = go(def); Object.assign(G.evs[0], { who, t: Bed.START + 3 }); return G; };
{ const G = one('kick'); const e1 = run(G, 2.5); ok(e1.includes('tell:kick:pink') && !e1.includes('kick:pink'), 'a twitch first (the tell)');
  const c0 = G.c; const e2 = run(G, 1); ok(e2.includes('kick:pink') && G.c > c0 + 50 && Bed.cover(G, 'pink') < 0.5, 'then the kick throws the blanket off the kicker'); }
{ const G = one('roll', 'mint'); run(G, 4.5); ok(G.x.mint > 170 && Bed.cover(G, 'pink') < 0.6 && Bed.cover(G, 'mint') > 0.8, 'rolling away wrapped in the blanket takes it along'); }
{ const G = one('fart', 'mint'); run(G, 3.2); const z0 = G.Z.pink; run(G, 3);
  ok(G.stink > 50 && G.Z.pink > z0 + 30, 'a fart under the blanket: everyone under it is about to wake');
  const H = one('fart', 'mint'); run(H, 3.5); const h0 = H.H.pink, e = run(H, DT, { pink: { act: true } });
  ok(e.includes('flap:pink') && H.stink < 50 && H.H.pink < h0 - 8, 'lifting the blanket airs it out, but lets the cold in'); }
{ const G = one('mosquito'); run(G, 3.2); ok(G.mq && G.mq.st === 'fly', 'a mosquito comes buzzing');
  const e1 = run(G, 0.3, { pink: { act: true } }); ok(e1.includes('miss:pink') && G.mq, 'slapping at it in the air misses (and jolts you)');
  let landed = null; for (let i = 0; i < 6 / DT && !landed; i++) { const e = Bed.step(G, {}); const l = e.find(x => x.startsWith('land:')); if (l) landed = l.split(':')[1]; }
  const z = G.Z[landed], e2 = run(G, 2); ok(e2.includes('bite:' + landed) && G.Z[landed] > z + 25, 'left sitting there, it bites'); }
{ const G = one('mosquito'); let on = null; for (let i = 0; i < 8 / DT && !on; i++) { const e = Bed.step(G, {}); const l = e.find(x => x.startsWith('land:')); if (l) on = l.split(':')[1]; }
  const off = on === 'pink' ? 'mint' : 'pink', zs = G.Z[on]; const e = run(G, DT, { [off]: { act: true } });
  ok(e.includes(`slap:${off}:${on}`) && !G.mq && G.Z[on] > zs + 15 && G.score >= Bed.KILL, 'slapping it off your partner kills it, but gives them a fright'); }
{ const G = go(room({ start: [40, 200], blanketAt: 40, ac: 12, time: 400 })); const e = run(G, 200);
  ok(e.includes('failed') && G.failed && G.strikes === Bed.STRIKES, 'three wake-ups: the night is ruined');
  const H = go(room({ time: 5 })); const eh = run(H, 6); ok(eh.includes('morning') && !H.failed, 'morning comes'); }
for (const [li, def] of HLEVELS.entries()) { const r = sleep(def, { seed: 31 + li, react: .2, think: .1 }); ok(r.stars >= 2 && !r.failed, `${def.name}: a careful couple scores ${r.score} (woke ${r.stats.wakes})`); }

// online: the host runs the bed; the guest's moves and presses arrive late, its picture is softened toward the host's
for (const [li, lat] of [[0, 0.1], [2, 0.15], [4, 0.2]]) {
  const def = HLEVELS[li], H = Bed.load(def), U = Bed.load(def), crew = bedCrew(H, { seed: 61 + li, react: .2, think: .1 });
  const toHost = [], toGuest = []; let steps = 0, gi = { mx: 0, pull: false }, act = false;
  while (!H.over) {
    steps++;
    const p = crew();
    toHost.push({ at: H.t + lat, m: p.mint });
    Bed.step(U, { mint: p.mint }, true);
    while (toHost.length && toHost[0].at <= H.t) { const m = toHost.shift().m; gi = { mx: m.mx, pull: m.pull }; if (m.act) act = true; }
    Bed.step(H, { pink: p.pink, mint: { mx: gi.mx, pull: gi.pull, act } }); act = false;
    if (steps % 4 === 0) toGuest.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Bed.encode(H))) });
    while (toGuest.length && toGuest[0].at <= H.t) Bed.apply(U, toGuest.shift().m, true);
  }
  Bed.apply(U, JSON.parse(JSON.stringify(Bed.encode(H))), false);
  const solo = sleep(def, { seed: 61 + li, react: .2, think: .1 });
  ok(Bed.stars(H) >= 2 && H.score > solo.score * 0.93, `${def.name} online, ${lat * 1000} ms each way: ${Math.round(H.score)} points (one phone ${solo.score}), woke ${H.stats.wakes}`);
  ok(Math.abs(U.score - H.score) < 0.1 && U.over && Math.abs(U.x.mint - H.x.mint) < 0.1, 'and both phones agree');
}
{ const G = go(HLEVELS[0]); let thrown = null;
  for (const junk of [null, 1, 'x', {}, { x: ['a', 1e9], c: NaN, mq: [1, 2, 'sit', 'nobody'], ro: ['zz'], te: [1, 2] }, { ed: 'no', H: [NaN], Z: [500] }]) { try { Bed.apply(G, junk, true); Bed.step(G, { pink: { mx: NaN, pull: 'y', act: 5 }, mint: { mx: 1e9 } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.x.pink, G.x.mint, G.c, G.H.pink, G.Z.mint].every(Number.isFinite) && G.Z.mint <= 100 && G.x.mint <= Bed.BW, 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'BLANKET OK');
process.exit(fails ? 1 : 0);

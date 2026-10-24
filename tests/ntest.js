// Window-climbing rules: walking and hiding, lit windows (and the glow before them), headlights, the dog and dad at the
// window, the sheet (grabbing, climbing, pulling, slipping), dad at her door, falling, strikes, dawn, getting in, and two
// phones online (either one climbing).
const { sneak, climbCrew, Win, NLEVELS } = require('./nbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Win.DT;
const night = (extra = {}) => Object.assign({ name: 't', time: 120, start: 40, sheet: 200, points: 1000, dog: false, windows: [{ room: 'living', x: 300, y: 70 }, { room: 'her', x: 700, y: 210 }],
  bushes: [{ x: 500, w: 60 }], gravel: [], dad: [], cars: [], stars: [1, 2, 3] }, extra);
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Win.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Win.load(def); run(G, Win.START + DT); return G; };
const walk = mx => ({ climb: { mx } });
const at = (G, x) => { G.c.x = x; return G; };

{ const G = Win.load(night()); run(G, 1.5, walk(1)); ok(G.c.x === 40, 'nobody moves before the night starts'); }
{ const G = go(night()); run(G, 2, walk(1)); ok(Math.abs(G.c.x - 40 - 2 * Win.WALK) < 2, `walking along the house (${G.c.x.toFixed(0)})`);
  const e = run(G, DT, { climb: { act: true } }); ok(!G.c.hid && !e.includes('hide'), 'no hiding out in the open');
  at(G, 500); const e2 = run(G, DT, { climb: { act: true } }); const x = G.c.x; run(G, 1, walk(1));
  ok(e2.includes('hide') && G.c.hid && G.c.x === x, 'in a bush: hidden, and staying put'); run(G, DT, { climb: { act: true } }); ok(!G.c.hid, 'and out again'); }
// lights
{ const def = night({ dad: [[0, 'living']] }), G = go(def); at(G, 300);
  run(G, 2); ok(G.strikes === 0, 'standing still in a lit patch: nobody notices');
  const e = run(G, 0.6, walk(0.5)); ok(e.includes('seen:light') && G.strikes === 1, 'moving in it: seen, a strike');
  ok(e.includes('look:tell'), 'and dad comes to look out'); }
{ const def = night({ dad: [[3, 'living']] }), G = go(def); at(G, 300);
  run(G, 2.2); ok(!Win.windowLit(def, G.t, 300, 0) && Win.windowSoon(def, G.t, 300, 0), 'a glow shows a moment before dad turns a light on');
  run(G, 1); ok(Win.windowLit(def, G.t, 300, 0) && !Win.windowLit(def, G.t, 120, 0), 'then the light, on the ground below that window only'); }
{ const G = go(night({ dad: [[0, 'living']] })); at(G, 240); const e = run(G, 0.3, walk(1)); run(G, 2); ok(!e.some(x => x.startsWith('seen')), 'a quick step stopped at once is not enough to be seen'); }
// headlights
{ const def = night({ cars: [3] }), G = go(def); at(G, 300); const e = run(G, 2);
  ok(e.includes('car') && Win.carAt(def, G.t).st === 'tell', 'an engine first: a car is coming');
  const e2 = run(G, 3, walk(0.3)); ok(e2.includes('seen:car'), 'walking about in the headlights: seen');
  const H = go(def); at(H, 300); const e3 = run(H, 6); ok(!e3.some(x => x.startsWith('seen')), 'standing still while they pass: fine'); }
{ const def = night({ cars: [2] }), G = go(def); G.top.len = 150; const e = run(G, 6);
  ok(e.includes('seen:sheet') && G.strikes === 1, 'a sheet hanging out of the window in the headlights: noticed, a strike');
  const H = go(def); H.top.len = 150; const e2 = run(H, 6, { top: { my: -1 } }); ok(!e2.includes('seen:sheet') && H.top.len === 0, 'pulled in in time: not'); }
// the dog and dad at the window
{ const def = night({ dog: true, gravel: [[100, 400]] }), G = go(def); const e = run(G, 3, walk(1));
  ok(e.includes('bark') && e.includes('look:tell'), `stomping across gravel wakes the dog, and dad comes to the window (${G.stats.barks} bark)`);
  const H = go(def); const e2 = run(H, 7, walk(0.4)); ok(!e2.includes('bark') && H.c.x > 300, 'treading softly does not');
  const N = go(night({ gravel: [[100, 400]] })); const e3 = run(N, 3, walk(1)); ok(!e3.includes('bark'), 'and with no dog nothing barks'); }
{ const def = night({ dog: true }), G = go(def); at(G, 330); G.dog = 101; const e = run(G, Win.LOOK_TELL + 1);
  ok(e.includes('look') && e.includes('seen:look') && G.strikes === 1, 'dad looking out sees someone standing still in front of him');
  const H = go(def); at(H, 500); H.dog = 101; run(H, DT); H.c.x = 500; const L = H.look.x; run(H, DT, { climb: { act: true } }); const e2 = run(H, Win.LOOK_TELL + Win.LOOK_T + 0.2);
  ok(Math.abs(500 - L) > Win.LOOK_W || (!e2.some(x => x.startsWith('seen')) && H.c.hid), 'but not someone in a bush'); }
{ const def = night({ dog: true, windows: [{ room: 'living', x: 450, y: 70 }, { room: 'her', x: 700, y: 210 }] }), H = go(def); at(H, 500); H.dog = 101; run(H, DT);
  run(H, DT, { climb: { act: true } }); const e = run(H, Win.LOOK_TELL + Win.LOOK_T + 0.2); ok(H.c.hid && !e.some(x => x.startsWith('seen')) && e.includes('look:end'), 'hidden in a bush right in front of him: not seen'); }
// the sheet
{ const G = go(night()); at(G, 700); const e = run(G, 0.5, { climb: { my: -1 } }); ok(!e.includes('grab') && G.c.on === 'ground', 'no sheet down: nothing to grab');
  run(G, 1.5, { top: { my: 1 } }); ok(Win.sheetBottom(G) <= Win.GRAB_Y, 'the one upstairs lets the sheet down');
  run(G, 1, { top: { my: -1 } }); const l = G.top.len; ok(l < 60, 'and can pull it back up'); run(G, 1.5, { top: { my: 1 } });
  const e2 = run(G, DT, { climb: { my: -1 } }); ok(e2.includes('grab') && G.c.on === 'sheet', 'down within reach: the climber grabs it');
  run(G, 1, { climb: { my: -1 } }); const y1 = G.c.y; run(G, 1, { climb: { my: -1 }, top: { my: -1 } }); const y2 = G.c.y;
  ok(Math.abs(y1 - 1 - Win.CLIMB) < 1 && Math.abs(y2 - y1 - Win.CLIMB - Win.PULLUP) < 1, `climbing up (${y1.toFixed(0)}), faster with a pull from above (${(y2 - y1).toFixed(0)})`);
  const ev = run(G, 3, { climb: { my: -1 }, top: { my: -1 } }); ok(ev.includes('in') && G.won && G.over, 'up at the window: in!');
  ok(G.score === Math.round(1000 + (120 - G.inT) * Win.TIME_PTS), `quicker scores more (${G.score} in ${G.inT.toFixed(1)} s)`); }
{ const G = go(night()); at(G, 700); G.top.len = 200; run(G, DT, { climb: { my: -1 } }); run(G, 2, { climb: { my: -1 } }); const y = G.c.y;
  run(G, DT, { top: { act: true } }); run(G, 1.5, { climb: { my: -1 } }); ok(G.top.at === 'bed' && G.c.y < y - 20, 'the one upstairs in bed: nobody holds the sheet, no climbing, it slides');
  const e = run(G, 10); ok(e.includes('down') && G.c.on === 'ground' && !e.some(x => x.startsWith('fall')), 'slid all the way down without falling');
  G.c.y = 0; const H = go(night()); at(H, 700); H.top.len = 200; run(H, DT, { climb: { my: -1 } }); run(H, 3.5, { climb: { my: -1 } });
  run(H, DT, { climb: { my: -1 } }); const e2 = run(H, 3, { climb: { my: -1 }, top: { my: 0 } }); ok(H.won && e2.includes('in'), 'a hand to come in at the window: in'); }
{ const G = go(night()); at(G, 700); G.top.len = 200; run(G, DT, { climb: { my: -1 } }); run(G, 3.2, { climb: { my: -1 } }); G.c.stam = 3;
  const e = run(G, 1); ok(e.includes('fall:high') && G.strikes === 1 && G.c.on === 'ground', 'out of strength high up: a fall, and a strike');
  const H = go(night()); at(H, 700); H.top.len = 200; run(H, DT, { climb: { my: -1 } }); run(H, 1, { climb: { my: -1 } }); H.c.stam = 3;
  const e2 = run(H, 1); ok(e2.includes('fall:low') && H.strikes === 0, 'from low down: just a bump'); }
// dad at her door
{ const def = night({ dad: [[3, 'her'], [6, 'away'], [10, 'her']] }), G = go(def); const e = run(G, 2);
  ok(e.includes('door'), 'footsteps on the stairs first'); const e2 = run(G, 2); ok(e2.includes('caught:bed') && G.strikes === 1, 'not in bed when the door opens: caught, a strike');
  run(G, 4); run(G, DT, { top: { act: true } }); const e3 = run(G, 5); ok(e3.includes('door:ok') && G.strikes === 1, 'in bed in time: dad goes away'); }
// strikes and dawn
{ const def = night({ dad: [[0, 'living']] }), G = go(def); at(G, 260); const e = run(G, 20, walk(0.3)); ok(e.includes('caught') && G.failed && G.strikes === Win.STRIKES && Win.stars(G) === 0, 'three strikes: caught, the night is over');
  const H = go(night({ time: 5 })); const e2 = run(H, 6); ok(e2.includes('dawn') && H.failed && Win.stars(H) === 0, 'dawn comes: too late'); }
for (const [li, def] of NLEVELS.entries()) { const r = sneak(def, { seed: 41 + li, react: .2, think: .08 }); ok(r.stars === 3, `${def.name}: a careful couple gets in in ${r.t} s, ${r.score} points`); }

// online: the host runs the night; the guest walks (or works the sheet) on its own phone at once and tells the host
function online(def, lat, guest, seed) {
  const H = Win.load(def), U = Win.load(def), crewH = climbCrew(H, { seed, react: .2, think: .08 }), crewU = climbCrew(U, { seed: seed + 1, react: .2, think: .08 });
  const toHost = [], toGuest = [], rq = { seen: -1, mx: 0, my: 0, act: false }, mine = guest === 'climb' ? 'climb' : 'top', theirs = guest === 'climb' ? 'top' : 'climb';
  let steps = 0, presses = 0, jumps = 0;
  while (!H.over && steps < 200 / DT) {
    steps++;
    const pu = crewU()[mine], ph = crewH()[theirs];
    if (pu.act) presses++;
    const x0 = U.c.x, y0 = U.c.y;
    Win.step(U, { [mine]: pu }, true);
    if (steps % 4 === 0) toHost.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Win.guestMsg(U, mine, pu, presses))) });
    while (toHost.length && toHost[0].at <= H.t) Win.hostHears(H, mine, toHost.shift().m, rq);
    Win.step(H, { [theirs]: ph, [mine]: { mx: rq.mx, my: rq.my, act: mine === 'top' ? false : false } });
    if (steps % 4 === 0) toGuest.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Win.encode(H))) });
    while (toGuest.length && toGuest[0].at <= H.t) Win.apply(U, toGuest.shift().m, mine, true);
    if (guest === 'climb' && U.c.on === 'ground' && Math.abs(U.c.x - x0) > 30) jumps++;
    if (guest === 'climb' && U.c.on === 'sheet' && y0 > 0 && Math.abs(U.c.y - y0) > 30) jumps++;
  }
  Win.apply(U, JSON.parse(JSON.stringify(Win.encode(H))), mine, false);
  return { H, U, jumps };
}
for (const [li, lat, guest] of [[0, 0.1, 'climb'], [2, 0.15, 'climb'], [4, 0.2, 'climb'], [1, 0.1, 'top'], [3, 0.2, 'top']]) {
  const def = NLEVELS[li], { H, U, jumps } = online(def, lat, guest, 71 + li);
  ok(H.won && Win.stars(H) >= 2 && jumps === 0, `${def.name} online, ${lat * 1000} ms each way, the guest ${guest === 'climb' ? 'climbing' : 'upstairs'}: in after ${H.inT.toFixed(1)} s, ${H.score} points, ${H.strikes} strikes, ${jumps} jumps`);
  ok(U.score === H.score && U.over && U.won === H.won && U.c.on === H.c.on, 'and both phones agree');
}
{ const def = night(), H = go(def), rq = { seen: -1, mx: 0, my: 0 }; at(H, 100);
  Win.hostHears(H, 'climb', { mx: 1, my: 0, a: 0, x: 500, y: 0, on: 0, hd: 0, cv: 0 }, rq); ok(H.c.x === 100 && H.cv === 1, 'a guest claiming to be somewhere far off: the host keeps its own and tells it so');
  Win.hostHears(H, 'climb', { mx: 1, my: 0, a: 0, x: 160, y: 0, on: 0, hd: 0, cv: 0 }, rq); ok(H.c.x === 100, 'old news (from before that) is ignored');
  Win.hostHears(H, 'climb', { mx: 1, my: 0, a: 0, x: 160, y: 0, on: 0, hd: 0, cv: 1 }, rq); ok(H.c.x === 160, 'and then it carries on from there');
  Win.hostHears(H, 'climb', { mx: 0, my: -1, a: 0, x: 160, y: 50, on: 1, hd: 0, cv: 1 }, rq); ok(H.c.on === 'ground' && H.cv === 2, 'climbing a sheet that is not there: no');
  Win.hostHears(H, 'climb', { mx: 0, my: 0, a: 0, x: 160, y: 0, on: 0, hd: 1, cv: 2 }, rq); ok(!H.c.hid && H.cv === 3, 'hiding with no bush: no'); }
{ const G = go(NLEVELS[4]); let thrown = null;
  for (const junk of [null, 2, 'x', {}, { c: ['a', 1e9, 7, 1, NaN], tp: [9, 'q', -5], lk: [5, NaN, 'x'], cv: 'z', x: 1e9 }, { s: 3, dd: 1.5, it: NaN }]) {
    try { Win.apply(G, junk, 'climb', true); Win.hostHears(G, 'climb', junk, { seen: -1 }); Win.hostHears(G, 'top', junk, { seen: -1 }); Win.step(G, { climb: { mx: NaN, my: 1e9, act: 'y' }, top: { my: -Infinity, act: 3 } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.c.x, G.c.y, G.c.stam, G.top.len, G.dog, G.score].every(Number.isFinite) && G.c.x >= 0 && G.c.x <= Win.W && G.top.len <= G.def.sheet, 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'CLIMB OK');
process.exit(fails ? 1 : 0);

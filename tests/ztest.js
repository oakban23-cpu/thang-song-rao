// Climbing rules: standing and walking, the aim and the leap, holding on as you get there (or slipping), a jump from a
// ledge is a fresh press, the grip tiring and resting, the rope catching a fall (and jerking the other), hanging,
// climbing and sliding on the rope, hauling, swinging and grabbing, climbing onto a ledge, the shoulders, both falling
// and starting again, the ledges you start again from, crumbly rock, nests, goats, wind, the waterfall, flowers, the
// top, the time, the score, the cliffs, the bots, and two phones online.
const { run, Rope, ZLEVELS, P, ropePlan } = require('./zbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Rope.DT, ARM = Rope.ARM;
const has = (ev, k) => ev.some(e => e === k || e.startsWith(k + ':'));
const blank = '........................';
// a little cliff from rows (the ground is the lowest ledge, the top the T one)
function cliff(rows, extra = {}) { return Object.assign({ name: 'test', hint: '', time: 100, seed: 5, stars: [100, 200, 300], map: rows }, extra); }
function fresh(rows, extra) { const G = Rope.load(cliff(rows, extra)); for (let i = 0; i < Math.ceil(Rope.START / DT) + 1; i++) Rope.step(G, {}); return G; }
const steps = (G, inp, s) => { const ev = []; for (let i = 0; i < Math.round(s / DT); i++) ev.push(...Rope.step(G, typeof inp === 'function' ? inp(i) : inp)); return ev; };
function onHold(G, id, i, extra = {}) { const h = G.geo.holds[i]; Object.assign(G.p[id], { st: 'hold', h: i, li: -1, x: h.x, y: h.y, vx: 0, vy: 0, firm: true, need: 0, held: true, taut: false, tgt: null }, extra); }
function onLedge(G, id, li, x) { const l = G.geo.ledges[li]; Object.assign(G.p[id], { st: 'ledge', li, h: -1, x, y: l.y - ARM, vx: 0, vy: 0, held: false, armed: false, taut: false, tgt: null }); }
const holdAt = (G, r, c) => G.geo.holds.findIndex(h => Math.round((h.x - 20) / 40) === c && Math.round((h.y - 20) / 40) === r);
const ledgeAt = (G, r) => G.geo.ledges.findIndex(l => Math.round((l.y - 30) / 40) === r);
// leap: aim at a place, press and let go; then hold on (or not)
function leap(G, id, tx, ty, opt = {}) {
  const p = G.p[id], mx = tx - p.x, my = ty - p.y, m = Math.hypot(mx, my), o = { mx: mx / m, my: my / m };
  const other = opt.other || {}, ev = [];
  if (p.st === 'ledge') ev.push(...Rope.step(G, { [id]: Object.assign({ use: true }, o), ...other }));
  ev.push(...Rope.step(G, { [id]: Object.assign({ use: false }, o), ...other }));
  ev.push(...steps(G, i => ({ [id]: { use: opt.press == null ? true : i * DT >= opt.press }, ...other }), opt.t || 0.8));
  return ev;
}
// a wall of rocks: rows 3..9, ledges at 11 and 1
const WALL = [blank, '....TTTTTTTTTTTTTTTT....', blank, '.........o...o..........', blank, '.......o..o...o.........', blank, '.........o...o..........', blank, '...........o............', blank, '===========C============'];

{ // the start, standing, walking
  const G = Rope.load(cliff(WALL)); const ev = steps(G, {}, Rope.START + .05);
  ok(G.st === 'run' && has(ev, 'go'), 'the count runs into climbing');
  const p = G.p.pink, x0 = p.x; steps(G, { pink: { mx: -1 } }, .5); ok(p.x < x0 - 50 && p.st === 'ledge' && p.mv, 'stick: walk along the ledge');
  steps(G, { pink: { mx: -1 } }, 4); ok(Math.abs(G.p.pink.x - G.p.mint.x) <= Rope.ROPE + 1, 'not further from the other than the rope');
  const H = fresh(WALL); steps(H, { pink: { mx: -1, use: true } }, .5); ok(Math.abs(H.p.pink.x - 450) < 1 && H.p.pink.crouch, 'holding the button: crouch and aim, no walking');
}
{ // the aim and the leap
  const G = fresh(WALL), p = G.p.pink, a = holdAt(G, 9, 11), h = G.geo.holds[a];
  const tg = Rope.aimTarget(G, 'pink', 0, -1);
  ok(tg && tg.k === 'h' && tg.i === a, 'pointing up from the ledge: the rock above');
  ok(!Rope.aimTarget(G, 'pink', 1, 0) || Rope.aimTarget(G, 'pink', 1, 0).k !== 'h' || Rope.aimTarget(G, 'pink', 1, 0).d <= Rope.REACH, 'nothing further than an arm and a leap');
  const ev = leap(G, 'pink', h.x, h.y);
  ok(has(ev, 'jump') && has(ev, 'grab') && p.st === 'hold' && p.h === a && p.firm, 'press, let go: a leap to it; holding the button as you get there: you hold on');
  const b = holdAt(G, 7, 9), hb = G.geo.holds[b];
  const e2 = leap(G, 'pink', hb.x, hb.y, { press: 5 });
  ok(has(e2, 'grab') && e2.some(e => e.endsWith(':tip')) && G.stats.slips === 1 && p.st !== 'hold', 'not holding the button as you get there: fingertips, then you slip off');
  const G2 = fresh(WALL), q = G2.p.pink; leap(G2, 'pink', h.x, h.y);
  const e3 = leap(G2, 'pink', hb.x, hb.y, { press: .62 });
  ok(q.st === 'hold' && q.h === b && q.firm && has(e3, 'firm'), 'pressing again in time from the fingertips: you hold on');
  ok(!Rope.aimTarget(G2, 'mint', 0, -1) || Rope.aimTarget(G2, 'mint', 0, -1).i !== b, "the other's rock is taken");
}
{ // landing on a ledge with the button held does not jump again
  const G = fresh(WALL), a = holdAt(G, 9, 11); onHold(G, 'pink', a);
  const l = G.geo.ledges[ledgeAt(G, 11)];
  const ev = leap(G, 'pink', G.p.pink.x, l.y - ARM, { t: .8 });
  ok(G.p.pink.st === 'ledge' && has(ev, 'land'), 'a leap down to a ledge: standing on it');
  const e2 = steps(G, { pink: { use: false } }, .3); ok(!has(e2, 'jump') && G.p.pink.st === 'ledge', 'letting go of the button you held as you landed: no jump');
  steps(G, { pink: { use: true, my: -1 } }, .1); const e3 = steps(G, { pink: { use: false, my: -1 } }, .1); ok(has(e3, 'jump'), 'a fresh press and let go: a jump');
}
{ // grip: tires on the rock (faster wet, in the cold), comes back on a ledge
  const G = fresh(WALL), a = holdAt(G, 9, 11); onHold(G, 'pink', a);
  steps(G, { pink: { use: true } }, 2); ok(Math.abs(G.p.pink.stam - (100 - Rope.DRAIN * 2)) < .5, 'holding on tires the hands');
  const W = fresh(WALL.map((r, i) => i === 9 ? '...........w............' : r)); onHold(W, 'pink', holdAt(W, 9, 11)); steps(W, { pink: { use: true } }, 2);
  ok(Math.abs(W.p.pink.stam - (100 - Rope.DRAIN * Rope.WET * 2)) < .5, 'wet rock tires them faster');
  const K = fresh(WALL, { tire: 1.5 }); onHold(K, 'pink', holdAt(K, 9, 11)); steps(K, { pink: { use: true } }, 2); ok(Math.abs(K.p.pink.stam - (100 - Rope.DRAIN * 3)) < .5, 'a cliff where hands tire faster');
  const T = fresh(WALL); onHold(T, 'pink', holdAt(T, 9, 11), { stam: 2 }); const ev = steps(T, { pink: { use: true } }, 1);
  ok(has(ev, 'tired') && T.p.pink.st !== 'hold', 'no grip left: you let go');
  const R = fresh(WALL); R.p.pink.stam = 20; steps(R, {}, 1); ok(R.p.pink.stam > 55, 'standing on a ledge the grip comes back');
}
{ // the rope catches a fall on the other
  const G = fresh(WALL), a = holdAt(G, 3, 9), b = holdAt(G, 5, 10); onHold(G, 'mint', a); onHold(G, 'pink', b);
  const s0 = G.p.mint.stam, ev = steps(G, i => ({ mint: { use: true }, pink: { use: false } }), 1.2);
  const d = Math.hypot(G.p.pink.x - G.p.mint.x, G.p.pink.y - G.p.mint.y);
  ok(has(ev, 'catch') && G.p.pink.taut && Math.abs(d - Rope.ROPE) < 2, 'let go below the other: caught by the rope, hanging its length below');
  ok(G.p.mint.stam < s0 - 5 && G.p.mint.st === 'hold', 'the one holding on feels the jerk (grip)');
  const s1 = G.p.mint.stam; steps(G, { mint: { use: true } }, 1); ok(s1 - G.p.mint.stam > Rope.DRAIN * 1.8, 'and holds a hanging partner: hands tire twice as fast');
  const L = fresh(WALL), lb = holdAt(L, 9, 11); onHold(L, 'pink', lb); onLedge(L, 'mint', ledgeAt(L, 11), 300);
  L.p.mint.stam = 100; steps(L, { pink: { use: false, my: 1 } }, 1.2); ok(L.p.mint.stam === 100, 'on a ledge the jerk costs nothing');
  const Q = fresh(WALL); onHold(Q, 'mint', holdAt(Q, 3, 9), { stam: 3 }); onHold(Q, 'pink', holdAt(Q, 5, 10));
  const e2 = steps(Q, { mint: { use: true }, pink: { use: false, my: 1 } }, 2); ok(has(e2, 'pulled') && Q.p.mint.st !== 'hold', 'too tired to hold the jerk: pulled off too');
}
{ // hanging, climbing and sliding on the rope, hauling, climbing onto a ledge
  const G = fresh(WALL), a = holdAt(G, 3, 9), b = holdAt(G, 5, 10); onHold(G, 'mint', a); onHold(G, 'pink', b);
  const e0 = Rope.step(G, { mint: { use: true }, pink: { use: true, act: true } });
  ok(has(e0, 'hang') && G.p.pink.st === 'air' && G.p.pink.taut, 'the other button on a rock: let go and hang from the other');
  ok(Math.abs(G.ropeL - Math.hypot(G.p.pink.x - G.p.mint.x, G.p.pink.y - G.p.mint.y)) < 3, 'hanging at the length you were apart');
  const L1 = G.ropeL; steps(G, { mint: { use: true }, pink: { my: 1 } }, 1.2); ok(G.ropeL > L1 + 100, 'stick down: slide down the rope');
  const L0 = G.ropeL; steps(G, i => ({ mint: { use: true }, pink: { act: i % 12 === 0 } }), 1);
  ok(G.ropeL < L0 - 100 && G.stats.climbs >= 8, 'pressing it hanging: climb up the rope');
  const H = fresh(WALL), lt = ledgeAt(H, 1); onLedge(H, 'mint', lt, 400); onHold(H, 'pink', holdAt(H, 5, 10));
  Rope.step(H, { pink: { use: false, act: true } }); steps(H, {}, .5);
  steps(H, i => ({ mint: { act: i % 15 === 0 } }), 1.6); ok(H.stats.hauls >= 8 && H.ropeL < 100, 'on a ledge, the other button hauls the one hanging below');
  const e1 = steps(H, i => ({ mint: { act: i % 15 === 0 }, pink: { use: true } }), 1.5);
  ok(H.p.pink.st === 'ledge' && H.p.pink.li === lt && e1.some(e => e.startsWith('land:pink') && e.endsWith('mantle')), 'pulled up to the ledge holding the button: climb onto it');
}
{ // swinging and grabbing
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, '..........o.............', blank, blank, blank, '..............o.........', blank, blank, blank, '===========C============'];
  const G = fresh(rows), a = holdAt(G, 3, 10), b = holdAt(G, 7, 14), A = G.geo.holds[a], B = G.geo.holds[b]; onHold(G, 'mint', a);
  Object.assign(G.p.pink, { st: 'air', x: A.x, y: A.y + 150, vx: 0, vy: 0, taut: true, h: -1, li: -1, held: false }); G.ropeL = 150;
  let maxDx = 0; for (let i = 0; i < 120 * 4; i++) { const p = G.p.pink; Rope.step(G, { mint: { use: true }, pink: { mx: Math.abs(p.vx) > 20 ? Math.sign(p.vx) : 1, use: false } }); maxDx = Math.max(maxDx, Math.abs(p.x - A.x)); }
  ok(maxDx > 110, 'leaning with the swing: it swings higher and higher (' + Math.round(maxDx) + ' px)');
  const K = fresh(rows); onHold(K, 'mint', a); Object.assign(K.p.pink, { st: 'air', x: A.x, y: A.y + Math.hypot(B.x - A.x, B.y - A.y), vx: 0, vy: 0, taut: true, h: -1, li: -1, held: false }); K.ropeL = Math.hypot(B.x - A.x, B.y - A.y);
  let ev = []; for (let i = 0; i < 120 * 8 && K.p.pink.st === 'air'; i++) { const p = K.p.pink; ev = ev.concat(Rope.step(K, { mint: { use: true }, pink: { mx: Math.abs(p.vx) > 20 ? Math.sign(p.vx) : 1, use: true } })); }
  ok(K.p.pink.st === 'hold' && K.p.pink.h === b && K.stats.swings === 1, 'holding the button as the swing passes a rock: grab it');
}
{ // up on the shoulders
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, blank, blank, '..........======........', blank, blank, blank, blank, '..........======........', '===========C============'];
  const G = fresh(rows), lo = ledgeAt(G, 10), hi = ledgeAt(G, 5); onLedge(G, 'pink', lo, 470); onLedge(G, 'mint', lo, 560);
  ok(!Rope.aimTarget(G, 'pink', 0, -1) || Rope.aimTarget(G, 'pink', 0, -1).i !== hi, 'a ledge too high to leap to alone');
  onLedge(G, 'mint', lo, 500); const tg = Rope.aimTarget(G, 'pink', 0, -1);
  ok(Rope.boosted(G, 'pink') && tg && tg.k === 'l' && tg.i === hi && tg.boost, 'standing right next to the other: up on their shoulders, it is in reach');
  const ev = leap(G, 'pink', 470, G.geo.ledges[hi].y - ARM, { t: 1 }); ok(has(ev, 'boost') && G.p.pink.st === 'ledge' && G.p.pink.li === hi, 'and the leap gets there');
}
{ // both off at once: back to the ledge you started from; the ledges you start again from
  const TALL = [...WALL.slice(0, 11), ...Array(18).fill(blank), WALL[11]];
  const G = fresh(TALL), off = (Q, id, x, y) => Object.assign(Q.p[id], { st: 'air', x, y, vx: 0, vy: 0, h: -1, li: -1, held: false, taut: false, tgt: null });
  off(G, 'pink', 300, 200); off(G, 'mint', 400, 200);
  const sc = G.score, ev = steps(G, {}, 1.2);
  ok(has(ev, 'fall') && G.st === 'fall' && G.stats.falls === 1, 'both let go: they fall');
  const e2 = steps(G, {}, Rope.RESPAWN + .1); ok(has(e2, 'respawn') && G.st === 'run' && G.p.pink.st === 'ledge' && G.p.pink.li === G.geo.ground, 'and start again on the ledge they last stood on together');
  ok(G.score <= Math.max(0, sc) && Rope.scoreOf(G) === Math.max(0, Math.round(Rope.PROG * G.best) - Rope.FALL_PTS), 'a fall costs points');
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, '..........o..o..........', blank, blank, '.........======.........', blank, blank, blank, blank, '===========C============'];
  const C = fresh(rows.map((r, i) => i === 6 ? '.........===C==.........' : r)), cl = ledgeAt(C, 6);
  onLedge(C, 'pink', cl, 420); onLedge(C, 'mint', cl, 500); const e3 = steps(C, {}, .1);
  ok(has(e3, 'check') && C.cp === cl, 'both standing on a ledge with a flag: you start from there after a fall');
  off(C, 'pink', 200, 120); off(C, 'mint', 260, 120); const e4 = steps(C, {}, 2.2);
  ok(has(e4, 'fall') && C.p.pink.li === cl && C.p.pink.st === 'ledge', 'a fall from above it comes back to it');
}
{ // crumbly rock, the nest, the goat
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, '.........c..on..........', blank, blank, '...........=G=====......', blank, blank, blank, blank, '===========C============'];
  const G = fresh(rows), c = holdAt(G, 3, 9), n = holdAt(G, 3, 12); onHold(G, 'pink', c);
  const ev = steps(G, { pink: { use: true } }, Rope.CRUMBLE_T + .05);
  ok(has(ev, 'crumble') && G.p.pink.st === 'air' && G.hs[c].gone > 0, 'crumbly rock: it gives way under you after a moment');
  ok(!Rope.aimTarget(G, 'mint', 0, -1) || Rope.aimTarget(G, 'mint', 0, -1).i !== c, 'a crumbled rock is not there to leap to');
  steps(G, {}, Rope.REGROW); ok(G.hs[c].gone === 0, 'and the rock is back after a while');
  const N = fresh(rows); onHold(N, 'pink', n); ok(N.geo.holds[n].nest, 'a rock beside a nest');
  const e2 = steps(N, { pink: { use: true } }, Rope.PECK_T - .2); ok(!has(e2, 'peck') && N.nb[0] > .5, 'the bird gets cross while you hang there');
  const e3 = steps(N, { pink: { use: true } }, .3); ok(has(e3, 'peck') && N.p.pink.st === 'air', 'and pecks you off');
  const Y = fresh(rows), gl = ledgeAt(Y, 6), g = Y.goats[0]; ok(Y.goats.length === 1 && g.li === gl, 'a goat on the ledge');
  onLedge(Y, 'mint', gl, g.x + g.dir * 40); const e4 = steps(Y, {}, .2);
  ok(has(e4, 'goat') && g.aim > 0, 'standing in its way: it lowers its head');
  const e5 = steps(Y, {}, Rope.GOAT_AIM); ok(has(e5, 'butt') && Y.p.mint.st === 'air', 'then butts you off the ledge');
  const Z = fresh(rows), g2 = Z.goats[0]; onLedge(Z, 'mint', gl, g2.x + g2.dir * 40); steps(Z, {}, .3);
  const e6 = Rope.step(Z, { mint: { act: true } }); ok(has(e6, 'shoo') && g2.shoo > 0 && g2.aim === 0, 'the other button near it: shoo it away');
  const e7 = steps(Z, {}, 2); ok(!has(e7, 'butt') && Z.p.mint.st === 'ledge', 'and it leaves you be');
}
{ // wind and the waterfall
  const G = fresh(WALL, { wind: [[1, 1]] }); const ev = steps(G, {}, 1.05);
  ok(has(ev, 'windwarn') && has(ev, 'gust'), 'a gust is warned of, then blows');
  onHold(G, 'pink', holdAt(G, 9, 11)); const s0 = G.p.pink.stam; steps(G, { pink: { use: true } }, 1); ok(s0 - G.p.pink.stam > Rope.DRAIN * 1.8, 'holding on in the wind tires the hands');
  const W = fresh(WALL, { wind: [[1, 1]] }); steps(W, {}, 1.05); Object.assign(W.p.pink, { st: 'air', x: 300, y: 200, vx: 0, vy: 0, held: false }); onHold(W, 'mint', holdAt(W, 3, 9));
  steps(W, { mint: { use: true } }, .3); ok(W.p.pink.vx > 120, 'it blows whoever is in the air');
  const F = fresh(WALL, { falls: [[9, 9, 2, 10]] }); ok(F.geo.holds[holdAt(F, 7, 9)].wet && !F.geo.holds[holdAt(F, 7, 13)].wet, 'rocks in the waterfall are wet');
  onHold(F, 'mint', holdAt(F, 3, 9)); Object.assign(F.p.pink, { st: 'air', x: F.geo.holds[holdAt(F, 3, 9)].x, y: 220, vx: 0, vy: 0, held: false, taut: false });
  const D = fresh(WALL); onHold(D, 'mint', holdAt(D, 3, 13)); Object.assign(D.p.pink, { st: 'air', x: 700, y: 220, vx: 0, vy: 0, held: false, taut: false });
  steps(F, { mint: { use: true } }, .15); steps(D, { mint: { use: true } }, .15); ok(F.p.pink.vy > D.p.pink.vy + 80, 'falling in the waterfall: pushed down harder');
}
{ // flowers, the top, the time, the score
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, '..........*.............', blank, blank, blank, blank, blank, blank, blank, '===========C============'];
  const G = fresh(rows), f = holdAt(G, 3, 10); onHold(G, 'pink', f); const ev = steps(G, { pink: { use: true } }, .05);
  ok(has(ev, 'gem') && G.gemN === 1 && G.gem[0], 'a rock with a flower: picked as you get there');
  const t0 = G.rt, T = G.geo.ledges[G.geo.top]; onLedge(G, 'pink', G.geo.top, 400); onLedge(G, 'mint', G.geo.top, 480); const e2 = steps(G, {}, .1);
  const left = Math.floor(100 - G.rt);
  ok(has(e2, 'summit') && G.over && G.won && G.best === 1, 'both standing on the top: done'); void t0; void T;
  ok(G.score === Rope.PROG + Rope.GEM + Rope.SUMMIT + Rope.TBONUS * left, 'the score: how high, the flowers, the top and the time left (' + G.score + ')');
  const H = fresh(rows, { time: 3 }); const e3 = steps(H, {}, 3.2); ok(has(e3, 'timeup') && H.over && !H.won && H.score === 0, 'out of time: the climb ends where it is');
  const S = fresh(rows); onLedge(S, 'pink', S.geo.top, 400); steps(S, {}, .1); ok(!S.over, 'one at the top alone is not enough');
}
{ // the cliffs
  ok(ZLEVELS.length === 5, 'five cliffs');
  for (const d of ZLEVELS) {
    const geo = Rope.parse(d), pl = ropePlan(d), G = Rope.load(d);
    ok(d.name && d.hint && d.stars[0] < d.stars[1] && d.stars[1] < d.stars[2] && d.map.every(r => r.length === 24) && geo.ledges[geo.top].top && Number.isFinite(pl.val(pl.nodeOf(G.p.pink), pl.nodeOf(G.p.mint))),
      d.name + ': names, hint, stars in order, rows of 24, a top, a way up');
  }
  ok(Rope.parse(ZLEVELS[1]).nests.length >= 3 && ZLEVELS[1].look === 'cave', 'the cave has nests');
  ok(ZLEVELS[2].falls && Rope.parse(ZLEVELS[2]).goats.length >= 2, 'the waterfall has its falls and goats');
  ok(ZLEVELS[3].wind.length >= 5 && ZLEVELS[3].tire > 1.2 && ZLEVELS[3].cold, 'the snow mountain is windy and cold');
  const g4 = Rope.parse(ZLEVELS[4]); ok(g4.nests.length && g4.goats.length && ZLEVELS[4].wind.length && g4.holds.some(h => h.cr) && ZLEVELS[4].look === 'dawn', 'the summit at dawn has a bit of everything');
}
{ // what the button would do
  const G = fresh(WALL); ok(Rope.target(G, 'pink') === 'stand', 'on a ledge: stand');
  onHold(G, 'pink', holdAt(G, 9, 11)); ok(Rope.target(G, 'pink') === 'aim', 'on a rock: aim');
  G.p.pink.firm = false; ok(Rope.target(G, 'pink') === 'catch', 'by the fingertips: hold on!');
}
{ // online: the host's picture arrives whole; nonsense is ignored; the guest's presses and let-gos come through
  const rows = [blank, '....TTTTTTTTTTTTTTTT....', blank, '.........c..o.n.........', blank, blank, '...........=G=====......', blank, blank, blank, blank, '===========C============'];
  const G = fresh(rows, { wind: [[1, -1]] }); onHold(G, 'pink', holdAt(G, 3, 9)); steps(G, { pink: { use: true } }, 1.05); G.gem = []; G.stats.falls = 1;
  const m = JSON.parse(JSON.stringify(Rope.encode(G))), H = fresh(rows, { wind: [[1, -1]] });
  Rope.apply(H, m);
  ok(H.p.pink.st === 'hold' && H.p.pink.h === G.p.pink.h && Math.abs(H.hs[holdAt(H, 3, 9)].ct - G.hs[holdAt(G, 3, 9)].ct) < .02 && !!H.wind && H.goats[0].x === Math.round(G.goats[0].x * 10) / 10 && H.stats.falls === 1, 'the guest sees what the host sees');
  const J = fresh(rows); Rope.apply(J, { t: 'x', p: [[1e9, 'a', 0, 0, 0, 999], 7], hs: 'zz', gm: [99, -1], gt: [['q']], wd: 'w', s: { gems: 'many' }, cp: 77 });
  ok(J.p.pink.st === 'ledge' && J.gemN === 0 && J.stats.gems === 0 && Number.isFinite(J.t) && J.cp === J.geo.ground, 'nonsense from the other phone is ignored');
  const rq = { seen: -1, seenR: -1, mx: 0, my: 0, act: false, use: false, rel: false }, K = fresh(WALL);
  Rope.hostHears(K, 'mint', Rope.guestMsg(K, 'mint', { mx: 1, use: true }, 0, 0), rq);
  Rope.hostHears(K, 'mint', Rope.guestMsg(K, 'mint', { mx: 1, use: true }, 1, 1), rq);
  ok(rq.act && rq.rel && rq.use && rq.mx === 1, 'a guest press, a let-go and a held button arrive (a quick let-go and press again still counts)');
  onLedge(K, 'mint', K.geo.ground, 500); K.p.mint.armed = true; const e = Rope.step(K, { mint: { use: true, rel: true, my: -1 } });
  ok(has(e, 'jump:mint'), 'a let-go heard from the guest jumps even if the button is down again');
  const L = fresh(WALL); onHold(L, 'mint', holdAt(L, 9, 11)); const st = L.p.mint.stam; Rope.step(L, { mint: { still: true } }, true);
  ok(L.p.mint.st === 'hold' && L.p.mint.stam === st, "the guest's own phone does not move the climb (the host does)");
}
{ // the bots
  const r = run(ZLEVELS[0], Object.assign({ seed: 3 }, P.tight));
  ok(r.won && r.stats.boosts >= 1 && r.stats.gems >= 1, 'a careful pair gets to the top of the first cliff, on each other\'s shoulders, picking flowers');
  const r2 = run(ZLEVELS[1], Object.assign({ seed: 3 }, P.tight));
  ok(r2.won && r2.stats.swings >= 1, 'and swings across the chasm in the cave');
  const solo = run(ZLEVELS[0], { seed: 3, only: 'pink' });
  ok(!solo.won && solo.best < .2, 'one alone gets no higher than the rope lets them');
}
console.log(fails ? fails + ' FAILED' : 'CLIMBING OK');
process.exit(fails ? 1 : 0);

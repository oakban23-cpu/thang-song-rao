// The Loy Krathong rules: the waves from each bank, the wind and the shielding hand, knocks and sinking, wishes,
// sparks, whirlpools, the moon at the end, points and stars, and what goes between two phones.
const Loy = require('../js/loy.js'), QLEVELS = require('../js/qlevels.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const idle = { pink: {}, mint: {} };
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / Loy.DT); i++) ev.push(...Loy.step(G, typeof inp === 'function' ? inp(G) : inp || idle)); return ev; };
const river = extra => Object.assign({ name: 'ทดสอบ', len: 3000, cur: 40, limit: 200, x0: 0.5, stars: [500, 900, 1200] }, extra);
const go = G => { run(G, Loy.START + 0.05); return G; };

{ // the start
  const G = Loy.load(QLEVELS[0]);
  ok(G.st === 'count' && G.kr.hull === 3 && G.kr.flame === 100 && G.p.pink.x < G.RL && G.p.mint.x > G.RR, 'the krathong at the pier, pink on the left bank, mint on the right');
  const ev = run(G, Loy.START + 0.05);
  ok(G.st === 'run' && ev.includes('go'), 'after the count it floats');
  const y0 = G.kr.y; run(G, 2);
  ok(G.kr.y < y0 - 50, 'the current carries it up the river');
  ok(QLEVELS.length === 6 && new Set(QLEVELS.map(l => l.name)).size === 6 && QLEVELS.every(l => l.hint && l.tips.length === 3 && l.stars[0] < l.stars[1] && l.stars[1] < l.stars[2]), 'six rivers, each with a hint, three tips and rising stars');
}
{ // scooping: each bank pushes the krathong away from itself
  for (const id of ['pink', 'mint']) {
    const G = go(Loy.load(river()));
    G.p[id].y = G.kr.y - 40;
    const x0 = G.kr.x, ev = run(G, 0.01, { [id]: { act: true }, [id === 'pink' ? 'mint' : 'pink']: {} });
    ok(ev.includes('push:' + id) && G.waves.length === 1, `${id}: a scoop sends a wave out from the ${id === 'pink' ? 'left' : 'right'} bank`);
    const ev2 = run(G, 2);
    ok(ev2.includes('nudge:' + id) && (id === 'pink' ? G.kr.x > x0 + 25 : G.kr.x < x0 - 25), `${id}: the wave reaches it and nudges it ${id === 'pink' ? 'right' : 'left'} (${Math.round(G.kr.x - x0)} px)`);
  }
  const G = go(Loy.load(river())); G.p.pink.y = G.kr.y;
  run(G, 0.01, { pink: { act: true }, mint: {} }); run(G, 0.1, { pink: { act: true }, mint: {} });
  ok(G.waves.length === 1, 'holding it down does not scoop again before the hand is back (a short wait)');
  const far = go(Loy.load(river({ bank: 110, x0: 0.97 }))); far.p.pink.y = far.kr.y;
  const fx = far.kr.x; run(far, 0.01, { pink: { act: true }, mint: {} }); run(far, 2.5);
  ok(Math.abs(far.kr.x - fx) < 3, 'on a wide river a wave dies out before the far bank: the other one has to help there');
}
{ // the wind and the hand that shields the candle
  const def = river({ gusts: [[200, 'mint', 2.5, 1]] });
  const A = go(Loy.load(def)), evA = run(A, 12);
  ok(evA.includes('wind:mint') && evA.includes('gust:mint') && A.kr.flame < 30, `unshielded, the gust nearly blows the candle out (${Math.round(A.kr.flame)})`);
  ok(A.stats.blocked === 0, 'and it does not count as blocked');
  const B = go(Loy.load(def)), evB = run(B, 12, G => ({ pink: {}, mint: { use: true, my: Math.sign(G.kr.y - G.p.mint.y) * Math.min(1, Math.abs(G.kr.y - G.p.mint.y) / 20) } }));
  ok(B.kr.flame > 95 && evB.includes('blocked:mint') && B.stats.blocked === 1, 'mint level with it, hand up: the flame stays, the gust is blocked');
  const C = go(Loy.load(def)); run(C, 12, () => ({ pink: { use: true }, mint: {} }));
  ok(C.kr.flame < 30, 'the wrong side shielding does not help');
  const D = go(Loy.load(river({ gusts: [[200, 'pink', 2.5, 1], [500, 'pink', 2.5, 1], [800, 'pink', 2.5, 1]] }))); const evD = run(D, 30);
  ok(D.over && D.why === 'out' && evD.includes('out') && Loy.stars(D) === 0, 'gust after gust unshielded: the candle goes out, the night is lost');
  const E = go(Loy.load(def)); run(E, 12); const f1 = E.kr.flame; run(E, 5);
  ok(E.kr.flame > f1 + 20, 'without wind the flame grows back');
}
{ // knocks and sinking
  const G = go(Loy.load(river({ rocks: [[150, 0.5, 20]] })));
  const ev = run(G, 6);
  ok(ev.some(e => e.startsWith('hit:rock')) && G.kr.hull === 2, 'drifting into a rock costs the krathong a bit of itself');
  const H = go(Loy.load(river({ rocks: [[600, .5, 30]] }))), evH = [];
  for (let i = 0; i < 3; i++) { H.kr.x = H.rocks[0].x; H.kr.y = H.rocks[0].y + 60; H.kr.vx = 0; H.kr.vy = -90; evH.push(...run(H, 1.5)); }
  ok(H.over && H.why === 'sink' && evH.includes('sink'), 'three knocks and it sinks');
  const P = go(Loy.load(river({ bridge: [[200, [[.5, 60]]]] }))); run(P, 8);
  ok(P.kr.hull === 2 && P.kr.y > -400, 'a bridge pillar right in its way stops it and knocks it');
  const Dk = go(Loy.load(river({ ducks: [[150, -1, 3]] }))); const evDk = run(Dk, 8);
  ok(Dk.kr.hull === 3, 'ducks only jostle it' + (evDk.includes('quack') ? ' (with a quack)' : ''));
  const N = go(Loy.load(river({ npc: [[60, .5]] }))); run(N, 8);
  ok(N.kr.hull === 3, "other people's krathongs only jostle it too");
}
{ // wishes, sparks, whirlpools, lotus
  const G = go(Loy.load(river({ wish: [[200, .5], [400, .9]] }))); const ev = run(G, 15);
  ok(ev.includes('wish:1') && G.stats.wishes === 1 && G.wishes[0].got && !G.wishes[1].got, 'it picks up the wish in its way, not the one far off');
  const S = go(Loy.load(river({ sparks: [[400, 0]] }))); const evS = run(S, 20);
  ok(evS.includes('boom') && evS.includes('spark:hit') && S.stats.sparks === 1, 'a spark landing on it singes the flame');
  const S2 = go(Loy.load(river({ sparks: [[400, 120]] }))); const evS2 = run(S2, 20);
  ok(evS2.includes('spark:miss') && S2.kr.flame === 100, 'one landing beside it does nothing');
  const W = go(Loy.load(river({ whirls: [[150, .5, 90, 1]] }))); run(W, 25);
  ok(W.kr.y > -400, `a whirlpool holds it if no one helps (${Math.round(-W.kr.y)} px in 25 s)`);
  global.Loy = Loy; const W2 = go(Loy.load(river({ whirls: [[150, .5, 90, 1]] }))), crew = require('./qcrew.js')(W2);
  run(W2, 25, () => crew());
  ok(W2.kr.y < W.kr.y - 400, `scooping from both sides gets it out (${Math.round(-W2.kr.y)} px)`);
  const Lf = go(Loy.load(river({ lotus: [[100, .5, 90]] }))), Lo = go(Loy.load(river())); run(Lf, 6); run(Lo, 6);
  ok(Lf.kr.y > Lo.kr.y + 80, 'lotus slows it');
}
{ // the end and the points
  const G = go(Loy.load(river({ len: 400, wish: [[200, .5]] }))); const ev = run(G, 20);
  ok(G.won && ev.includes('moon') && G.score === Loy.FINISH_PTS + Loy.WISH_PTS + 3 * Loy.HULL_PTS + 100, `at the moon: points for getting there, the wish, the krathong whole, the flame (${G.score})`);
  ok(Loy.stars(G) === 1 && Loy.stars(Object.assign({}, G, { score: 950 })) === 2, 'and stars by the level\'s lines');
  const T = go(Loy.load(river({ len: 4000, limit: 10 }))); run(T, 12);
  ok(T.over && T.why === 'late' && Loy.stars(T) === 0, 'too slow: the night ends first');
  const I = Loy.load(QLEVELS[0]); run(I, 140);
  ok(Loy.stars(I) <= 1, `standing still on the first river: at most one star (${Loy.stars(I)}, ${I.won ? 'there' : I.why})`);
}
{ // two phones: the host runs the river, the guest walks its bank
  const H = go(Loy.load(QLEVELS[2])); H.p.pink.y = H.kr.y; run(H, 0.01, { pink: { act: true }, mint: {} }); run(H, 3, { pink: { use: true }, mint: { my: -1 } });
  const m = JSON.parse(JSON.stringify(Loy.encode(H))), Gst = Loy.load(QLEVELS[2]);
  Loy.apply(Gst, m, 'mint');
  ok(Math.abs(Gst.kr.x - H.kr.x) < 0.2 && Math.abs(Gst.kr.y - H.kr.y) < 0.2 && Gst.kr.hull === H.kr.hull && Gst.st === H.st && Gst.p.pink.shield, 'the guest sees the krathong, the state and the other one shielding');
  ok(Gst.waves.length === H.waves.length && Gst.logs.every((l, i) => Math.abs(l.y - H.logs[i].y) < 0.2), 'and the waves and the logs');
  ok(JSON.stringify(m).length < 2500, `in a small message (${JSON.stringify(m).length} bytes)`);
  const rq = { seen: -1, mx: 0, my: 0, act: false };
  Loy.hostHears(H, 'mint', Loy.guestMsg(Gst, 'mint', { mx: 0, my: -1 }, 0), rq);
  Loy.hostHears(H, 'mint', Loy.guestMsg(Gst, 'mint', { mx: 0, my: -1, use: true }, 1), rq);
  ok(rq.act && rq.use && rq.my === -1, "the host hears the guest's scoop (once), its stick and its hand");
  Loy.apply(Gst, { k: ['x', null], p: 7, w: 'no', gu: [[9, 'a']], st: 'boom', s: { hits: 'x' } }, 'mint');
  ok(Number.isFinite(Gst.kr.x) && Gst.st === 'run' && Number.isFinite(Gst.stats.hits), 'nonsense from the other phone changes nothing that matters');
}
console.log(fails ? fails + ' FAILED' : 'LOY OK');
process.exit(fails ? 1 : 0);

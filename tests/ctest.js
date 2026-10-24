// Cinema rules: leaning in together kisses, longer kisses score more, glances come with a tell, getting caught
// costs a strike and points, bright scenes show more, the popcorn hides one side for a while, loud scenes and scares
// keep everyone's eyes on the screen, a hug in a scare is a bonus, three strikes and out, and two phones online.
const { watch, cinemaCrew, Cin, CLEVELS } = require('./cbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Cin.DT;
const show = (extra = {}) => Object.assign({ name: 't', film: [[0, 'quiet']], scares: [], time: 120, seed: 3, watchers: [], stars: [1, 2, 3] }, extra);
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Cin.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const both = { pink: { lean: true }, mint: { lean: true } };
const go = def => { const G = Cin.load(def); run(G, Cin.START + DT); return G; };

{ const G = Cin.load(show()); run(G, 1, both); ok(G.lean.pink === 0 && G.score === 0, 'nobody can lean in before the film starts'); }
{ const G = go(show()); run(G, 2, { pink: { lean: true } }); ok(G.lean.pink === 1 && !G.kissing && G.score === 0, 'leaning in alone kisses nobody');
  const e = run(G, 0.6, both); ok(e.includes('kiss') && G.kissing, 'both leaning all the way in: a kiss');
  const s0 = G.score; run(G, 1, both); const r1 = (G.score - s0) / 1; run(G, 1.5, both); const s2 = G.score; run(G, 1, both); const r2 = G.score - s2; run(G, 2, both); const s3 = G.score; run(G, 1, both); const r3 = G.score - s3;
  ok(Math.abs(r1 - Cin.RATE) < 1 && Math.abs(r2 - Cin.RATE * 1.5) < 1 && Math.abs(r3 - Cin.RATE * 2) < 1, `the longer the kiss the faster the points (${r1.toFixed(0)}, ${r2.toFixed(0)}, ${r3.toFixed(0)} a second)`);
  run(G, 0.25, {}); ok(!G.kissing && G.lean.pink < 0.1, 'letting go sits them straight back up in a moment'); }
// glances
{ const w = { kind: 'aunt', side: 'L', first: 5, tell: 1, look: [1.5, 1.5], every: [20, 20] };
  const G = go(show({ watchers: [w] }));
  const e1 = run(G, 5.5, both);
  ok(e1.includes('tell:0') && !e1.includes('look:0') && G.ws[0].st === 'tell', 'a head starts turning before anyone looks (a tell)');
  const s0 = G.score, e2 = run(G, 0.6, both);
  ok(e2.includes('caught:0') && G.strikes === 1 && !G.kissing && G.score < s0 - 30 && G.lean.pink < 0.3, 'caught kissing: a strike, points lost, and they spring apart');
  run(G, 0.5, both); ok(G.lean.pink === 0, 'too red in the face to lean in again for a moment');
  const H = go(show({ watchers: [w] })); const eh = run(H, 9, i => (H.ws[0].st === 'idle' ? both : {}));
  ok(!eh.some(e => e.startsWith('caught')) && H.score > 0, 'sitting up during the tell and the look: not caught'); }
{ const w = { kind: 'aunt', side: 'L', first: 3, tell: 1, look: [2, 2], every: [20, 20] };
  const half = def => { const G = go(def); run(G, 3.5, i => ({ pink: { lean: G.lean.pink < 0.3 }, mint: { lean: G.lean.mint < 0.3 } })); return run(G, 2.5, i => ({ pink: { lean: G.lean.pink < 0.3 }, mint: { lean: G.lean.mint < 0.3 } })); };
  ok(!half(show({ watchers: [w] })).some(e => e.startsWith('caught')), 'leaning a little in a quiet scene goes unnoticed');
  ok(half(show({ watchers: [w], film: [[0, 'bright']] })).some(e => e.startsWith('caught')), 'but in a bright scene the room lights up and it shows'); }
// popcorn
{ const w = { kind: 'guy', side: 'R', first: 6, tell: 0.8, look: [1, 1], every: [20, 20] }, w2 = Object.assign({}, w, { side: 'L' });
  const G = go(show({ watchers: [w] })); run(G, 5.9, both); const e = run(G, 3, i => (i === 0 ? { pink: { lean: true }, mint: { lean: true, shield: true } } : both));
  ok(!e.some(x => x.startsWith('caught')) && e.includes('saved:0') && G.kissing, 'mint raises the popcorn: the man behind on mint\'s side sees nothing');
  const H = go(show({ watchers: [w2] })); run(H, 5.9, both); const eh = run(H, 3, i => (i === 0 ? { pink: { lean: true }, mint: { lean: true, shield: true } } : both));
  ok(eh.some(x => x.startsWith('caught')), 'but it does not hide them from the other side');
  const S = go(show()); run(S, 0.1, { mint: { shield: true } }); const e3 = run(S, 1, { mint: { shield: true } });
  ok(!e3.some(x => x.startsWith('shield')) && S.stats.shields === 1, 'and it takes a while before it can go up again'); }
// scares, loud scenes
{ const def = show({ film: [[0, 'quiet'], [10, 'loud'], [20, 'quiet']], scares: [30], watchers: [{ kind: 'aunt', side: 'L', first: 1, tell: 0.8, look: [1, 1.5], every: [1, 2] }] });
  const P = Cin.plan(def)[0], hit = P.some(([a, , c]) => [[10, 20], [30, 30 + Cin.SCARE_T]].some(([x, y]) => a < y + Cin.START && c > x + Cin.START));
  ok(!hit, 'nobody glances over during a loud scene or a scare');
  const G = go(def); run(G, 30 - G.t + Cin.START - 0.3, {}); const e = run(G, 1.2, both);
  ok(e.includes('hug:0') && G.stats.hugs === 1 && G.score >= Cin.HUG, 'hugging when the ghost jumps out: a bonus');
  run(G, 1, both); ok(G.stats.hugs === 1, 'once a scare'); }
{ const w = { kind: 'aunt', side: 'L', first: 2, tell: 0.5, look: [1, 1], every: [1, 1] };
  const G = go(show({ watchers: [w] })); const e = run(G, 30, both);
  ok(e.includes('kicked') && G.over && G.kicked && G.strikes === Cin.STRIKES, 'caught three times: shown out of the cinema'); }
{ const G = go(show({ time: 10 })); const e = run(G, 11, both); ok(e.includes('end') && G.over && !G.kicked, 'the film ends'); }
{ const G = go(show({ watchers: [{ kind: 'phone', side: 'R', first: 3, tell: 0.8, look: [0.3, 0.3], every: [20, 20] }] }));
  const e = run(G, 6, i => ({ pink: { lean: G.lean.pink < 0.3 }, mint: { lean: G.lean.mint < 0.3 } }));
  ok(e.some(x => x.startsWith('caught')), 'a phone flash catches even a little lean'); }
// every showing: a careful couple gets three stars
for (const [li, def] of CLEVELS.entries()) { const r = watch(def, { seed: 31 + li, react: .15, think: .06 }); ok(r.stars === 3, `${def.name}: a careful couple scores ${r.score} (caught ${r.stats.caught})`); }

// online: each phone leans its own person straight away and sends how far; the host decides the rest
for (const [li, lat] of [[0, 0.1], [2, 0.15], [4, 0.2]]) {
  const def = CLEVELS[li], H = Cin.load(def), U = Cin.load(def), crew = cinemaCrew(H, { seed: 41 + li, react: .15, think: .06 });
  const toHost = [], toGuest = []; let gl = 0, gHeld = false, gShield = 0, seen = 0, mintV = 0, n = 0, steps = 0;
  while (!H.over) {
    steps++;
    const p = crew();
    // guest (mint): its own lean from its own button
    gHeld = !!p.mint.lean; if (p.mint.shield) gShield++;
    gl = Cin.leanStep(gl, gHeld && U.st === 'run', U); U.lean.mint = gl; U.held.mint = gHeld;
    Cin.step(U, { mint: { leanV: gl } }, true);
    if (steps % 4 === 0) toHost.push({ at: H.t + lat, m: { lv: gl, h: gHeld, s: gShield } });
    let shield = false;
    while (toHost.length && toHost[0].at <= H.t) { const m = toHost.shift().m; mintV = m.lv; if (m.s > seen) { seen = m.s; shield = true; } }
    Cin.step(H, { pink: p.pink, mint: { leanV: mintV, lean: true, shield } });
    if (steps % 4 === 0) toGuest.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Cin.encode(H))) });
    while (toGuest.length && toGuest[0].at <= H.t) { Cin.apply(U, toGuest.shift().m, 'mint'); n++; }
  }
  Cin.apply(U, JSON.parse(JSON.stringify(Cin.encode(H))), 'mint');
  const solo = watch(def, { seed: 41 + li, react: .15, think: .06 });
  ok(Cin.stars(H) >= 2 && H.score > solo.score * 0.8, `${def.name} online, ${lat * 1000} ms each way: ${Math.round(H.score)} points (one phone: ${solo.score}), caught ${H.stats.caught}`);
  ok(Math.abs(U.score - H.score) < 0.1 && U.over && U.strikes === H.strikes, 'and both phones agree');
}
{ const G = go(CLEVELS[0]); let thrown = null;
  for (const junk of [null, 4, 'x', {}, { l: ['a', 9], st: 'zz', x: 99, hg: 'no', dn: [null, 'b'] }, { p: NaN, sh: [1e9], sc: [-5] }]) { try { Cin.apply(G, junk, 'mint'); Cin.step(G, { pink: { lean: 'yes', leanV: NaN }, mint: { leanV: 7, shield: 3 } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.lean.pink, G.lean.mint, G.score].every(Number.isFinite) && G.lean.mint <= 1 && G.strikes <= Cin.STRIKES, 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'CINEMA OK');
process.exit(fails ? 1 : 0);

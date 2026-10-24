// No-farting rules: gas builds (slower when clenched, but clenching runs out), a fart sounds a moment after it is let
// go and as loud as the gas, a cough or a chair scrape at the right time covers it, so does a noisy room, needless
// covering looks odd, a big one toward the other diners gets smelled, strikes, and two phones online.
const { dine, fartCrew, Fart, FLEVELS } = require('./fbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Fart.DT;
const meal = (extra = {}) => Object.assign({ name: 't', time: 200, gas: 10, food: [], seed: 3, ambient: null, fan: 0, oddK: 1, stars: [1, 2, 3] }, extra);
const run = (G, s, inp) => { const ev = []; for (let i = 0; i < Math.round(s / DT) && !G.over; i++) ev.push(...Fart.step(G, typeof inp === 'function' ? inp(i) : inp || {})); return ev; };
const go = def => { const G = Fart.load(def); run(G, Fart.START + DT); return G; };
const rel = G => ({ gas: { release: G.t } });

{ const G = Fart.load(meal()); run(G, 1.5); ok(G.P === 0, 'no gas before dinner starts'); }
{ const G = go(meal()); run(G, 3); ok(Math.abs(G.P - 30) < 1, `gas builds up (${G.P.toFixed(0)} after 3 s)`);
  const H = go(meal()); run(H, 3, { gas: { hold: true } }); ok(H.P < 14 && H.strain > 70, `clenching slows it right down, but goes red in the face (${H.P.toFixed(0)}, strain ${H.strain.toFixed(0)})`);
  const e = run(H, 2, { gas: { hold: true } }); ok(e.some(x => x.startsWith('slip:')) && H.stats.slips === 1, 'clench too long and one slips out by itself'); }
{ const G = go(meal()); run(G, 4); const e = run(G, DT, rel(G));
  ok(e.includes('release:40') && G.P === 0 && Math.abs(G.farts[0].ts - G.farts[0].t - Fart.DELAY) < 1e-9, 'letting one go: as loud as the gas, sounding a moment later');
  const e2 = run(G, 0.5, rel(G)); ok(!e2.some(x => x.startsWith('release')), 'not again straight away');
  const e3 = run(G, 1); ok(e3.includes('heard:40') && G.strikes === 1, 'nobody covers it: everyone hears, a strike'); }
{ const G = go(meal()); run(G, 0.5); const e = run(G, DT, rel(G)); ok(!e.some(x => x.startsWith('release')), 'nothing much to let go yet'); }
{ const G = go(meal()); run(G, 1.2); run(G, DT, rel(G)); const e = run(G, 1.5); ok(e.some(x => x.startsWith('hidden:12:1:silent')) && G.strikes === 0, 'a little one is silent anyway (and worth hardly anything)'); }
// covering
const timed = (size, kind, offset) => { const G = go(meal()); run(G, size / 10 - DT); const t0 = G.t; run(G, DT, rel(G));
  const ev = []; for (let i = 0; i < 2 / DT; i++) { const t = G.t + DT, cv = Math.abs(t - (t0 + DT + offset)) < DT / 2 ? { [kind]: t } : {}; ev.push(...Fart.step(G, { cover: cv })); } return { G, ev }; };
{ const a = timed(40, 'cough', 0.2); ok(a.ev.some(x => x.startsWith('hidden:')) && a.G.score > 40, 'a cough just after the release covers a middling one');
  const b = timed(40, 'cough', -0.4); ok(b.ev.some(x => x.startsWith('heard')), 'a cough too early is over before it sounds');
  const c = timed(40, 'cough', 0.6); ok(c.ev.some(x => x.startsWith('heard')), 'and a cough too late is no use');
  const d = timed(80, 'cough', 0.2); ok(d.ev.some(x => x.startsWith('heard')), 'a big one is louder than a cough');
  const e = timed(80, 'chair', 0.2); ok(e.ev.some(x => x.startsWith('hidden:80')) && e.G.score > 70, 'a chair scrape covers even a big one (and big ones score more)'); }
{ const def = meal({ ambient: { first: 4, every: [100, 100], kinds: ['music'] } }); const G = go(def); run(G, 4.5); const e = run(G, 2, i => (i === 0 ? rel(G) : {}));
  ok(e.some(x => x.endsWith(':ambient')) && G.stats.ambient === 1, 'letting go while the music plays: nobody hears, and it scores extra'); }
{ const G = go(meal({ gas: 0.5 })); const ev = run(G, 10, i => (i % 60 === 0 ? { cover: { cough: G.t } } : {}));
  ok(ev.includes('strike:odd') && G.stats.odd === 1, 'coughing over and over with nothing to cover looks odd: a strike'); }
{ const fanDef = meal({ fan: 8, gas: 0.1 });
  const big = (lo, hi) => { const G = go(fanDef); while (!(Fart.fanAt(fanDef, G.t + Fart.DELAY) > lo && Fart.fanAt(fanDef, G.t + Fart.DELAY) < hi)) run(G, DT); G.P = 75;
    return { G, e: run(G, 2, i => (i === 0 ? { gas: { release: G.t } } : i === 20 ? { cover: { chair: G.t } } : {})) }; };
  const a = big(0.6, 0.85); ok(a.e.some(x => x.startsWith('hidden:75')) && !a.e.some(x => x.startsWith('smelled')), 'a big one with the fan turned away: hidden and not smelled');
  const b = big(0.1, 0.3); ok(b.e.some(x => x.startsWith('smelled')) && b.G.strikes === 1, 'a big one with the fan blowing toward the other diners: smelled, a strike'); }
{ const G = go(meal()); const e = run(G, 40); ok(e.includes('ruined') && G.ruined && G.strikes === Fart.STRIKES, 'three strikes: the dinner is ruined');
  const H = go(meal({ time: 5, gas: 1 })); const eh = run(H, 6); ok(eh.includes('end') && H.score === Fart.FINISH && !H.ruined, 'getting through the meal earns a bonus');
  const L = go(Object.assign({}, FLEVELS[0], { ambient: null, food: [] })); for (let i = 0; i < 4; i++) { run(L, 5); run(L, DT, rel(L)); run(L, 1); }
  ok(!L.ruined && L.strikes === 4, 'the first date forgives more (five strikes)'); }
for (const [li, def] of FLEVELS.entries()) { const r = dine(def, { seed: 31 + li, react: .15, think: .08 }); ok(r.stars >= 2 && !r.ruined, `${def.name}: a careful duo scores ${r.score} (hid ${r.stats.hidden} of ${r.stats.farts})`); }

// online: the guest covers; its presses carry their times and arrive late, the host waits a moment before judging
for (const [li, lat] of [[1, 0.1], [2, 0.15], [4, 0.2]]) {
  const def = FLEVELS[li], H = Fart.load(def), U = Fart.load(def), crew = fartCrew(H, { seed: 51 + li, react: .15, think: .08 });
  const toHost = [], toGuest = []; let steps = 0;
  while (!H.over) {
    steps++;
    const p = crew();
    // the guest presses (as the crew decided) at its own time, which reaches the host lat later
    for (const k of ['cough', 'chair']) if (p.cover[k] != null) toHost.push({ at: H.t + lat, k, t: p.cover[k] });
    Fart.step(U, { cover: p.cover }, true);
    const cov = {};
    while (toHost.length && toHost[0].at <= H.t) { const m = toHost.shift(); cov[m.k] = m.t; }
    Fart.step(H, { gas: p.gas, cover: cov });
    if (steps % 4 === 0) toGuest.push({ at: H.t + lat, m: JSON.parse(JSON.stringify(Fart.encode(H))) });
    while (toGuest.length && toGuest[0].at <= H.t) Fart.apply(U, toGuest.shift().m, 'cover');
  }
  Fart.apply(U, JSON.parse(JSON.stringify(Fart.encode(H))), 'cover');
  const solo = dine(def, { seed: 51 + li, react: .15, think: .08 });
  ok(Fart.stars(H) >= 2 && H.stats.heard <= solo.stats.heard + 1, `${def.name} online, ${lat * 1000} ms each way: ${H.score} points (one phone ${solo.score}), heard ${H.stats.heard}`);
  ok(U.score === H.score && U.over && U.strikes === H.strikes, 'and both phones agree');
}
{ const G = go(FLEVELS[0]); let thrown = null;
  for (const junk of [null, 3, 'x', {}, { f: [[1, 'a', 999, 1, 1, 'zz']], c: [[5, NaN]], P: 1e9, st: 'q' }, { lc: 'no', s: 5, x: -4 }]) { try { Fart.apply(G, junk, 'cover'); Fart.step(G, { gas: { release: NaN, hold: 'y' }, cover: { cough: 1e12, chair: -1e12 } }); } catch (e) { thrown = e; } }
  ok(!thrown && [G.P, G.strain, G.score, G.odd].every(Number.isFinite) && G.P <= 100, 'junk snapshots and inputs are ignored'); }

console.log(fails ? `${fails} FAILED` : 'NO-FART OK');
process.exit(fails ? 1 : 0);

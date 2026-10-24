// Three-legged race bots: the pair counts "in, out, in, out" at a chosen pace; each presses on the count with a
// timing error (sd, seconds) and sometimes presses the wrong leg. Careful pairs must beat the champions; looser pairs
// place lower; one player alone, mashing, or rushing must not win.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'leg.js'), 'utf8') + ';this.Leg=Leg;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'llevels.js'), 'utf8') + ';this.LLEVELS=LLEVELS;', ctx);
const { Leg, LLEVELS } = ctx;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* opt: { I: pace in seconds, sd, err: chance of the wrong leg, careful: extra pause at hurdles, pink/mint overrides,
   mash: presses per second at random, only: one player plays } */
function race(def, opt = {}) {
  const G = Leg.load(def), R = rng(opt.seed || 1), ev = [];
  const sched = { pink: null, mint: null };
  let nextCall = Leg.START + 0.25, waitUp = false;
  const o = w => Object.assign({}, opt, opt[w] || {});
  const plan = t => {
    const leg = G.expect || 'in';
    for (const w of ['pink', 'mint']) {
      const p = o(w);
      if (opt.only && opt.only !== w) { sched[w] = null; continue; }
      const wrong = R() < (p.err || 0);
      sched[w] = { t: t + Math.max(-0.08, gauss(R) * (p.sd || 0)), leg: wrong ? (leg === 'in' ? 'out' : 'in') : leg };
    }
  };
  for (let k = 0; k < (def.limit + 5) / Leg.DT && !G.over; k++) {
    const e = Leg.step(G); ev.push(...e);
    if (e.includes('up')) { waitUp = false; nextCall = G.t + 0.35; sched.pink = sched.mint = null; }
    if (e.includes('fall')) { waitUp = true; sched.pink = sched.mint = null; }
    if (G.st !== 'run' || waitUp) continue;
    if (opt.mash) { for (const w of ['pink', 'mint']) if (R() < opt.mash * Leg.DT) ev.push(...Leg.press(G, w, R() < 0.5 ? 'in' : 'out', G.t)); continue; }
    if (!sched.pink && !sched.mint && G.t >= nextCall) plan(nextCall);
    for (const w of ['pink', 'mint']) {
      const s = sched[w];
      if (s && G.t >= s.t) { sched[w] = null; const r = Leg.press(G, w, s.leg, s.t); ev.push(...r); if (r.some(x => x.startsWith('wrong') || x === 'tangle')) { sched.pink = sched.mint = null; nextCall = G.t + 0.3; } }
    }
    if (!sched.pink && !sched.mint && nextCall <= G.t) {
      const atFence = G.hurdle >= 0, I = atFence ? (opt.fence || 0.45) : (Leg.terrainAt(def, G.x) === 'down' ? Math.max(opt.I || 0.22, opt.down || 0.25) : (opt.I || 0.22));
      nextCall = Math.max(G.lastStepT, G.t - 0.05) + I;
    }
  }
  return { G, time: G.time, finished: G.finished, stars: Leg.stars(G), place: Leg.place(G), falls: G.stats.falls, s: G.stats, ev };
}
module.exports = { race, Leg, LLEVELS, rng, gauss };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { I: 0.2, sd: 0.018, err: 0 }, good: { I: 0.24, sd: 0.04, err: 0.01 }, casual: { I: 0.27, sd: 0.06, err: 0.02 }, sloppy: { I: 0.3, sd: 0.09, err: 0.04 } };
  LLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => race(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2, 3]), good = run(P.good, [4, 5, 6]), cas = run(P.casual, [7, 8, 9]), slop = run(P.sloppy, [10, 11, 12]);
    const solo = race(def, { seed: 13, only: 'pink', I: 0.2, sd: 0.02 }), mash = race(def, { seed: 14, mash: 12 }), rush = race(def, { seed: 15, I: 0.12, sd: 0.02 });
    const show = a => a.map(r => (r.finished ? r.time.toFixed(1) : 'DNF') + '/' + r.stars + '★' + (r.falls ? ' ' + r.falls + 'f' : '')).join(', ');
    const checks = [
      ['a tight pair beats the champions', tight.every(r => r.stars === 3)],
      ['a good pair gets two stars or more', good.every(r => r.stars >= 2)],
      ['a casual pair still finishes with a star', cas.every(r => r.stars >= 1)],
      ['beginners get a star on the first three courses', li > 2 || slop.every(r => r.stars >= 1)],
      ['a sloppy pair does not beat the champions', slop.every(r => r.stars < 3)],
      ['one player alone never finishes', !solo.finished],
      ['mashing gets nothing', mash.stars === 0],
      ['rushing faster than legs can go is slower than a steady pace', !rush.finished || rush.time > tight[0].time]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(17)} rivals ${def.rivals.map(r => r.time).join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.finished ? solo.time.toFixed(1) : 'DNF'} mash ${mash.finished ? mash.time.toFixed(1) : 'DNF'} rush ${rush.finished ? rush.time.toFixed(1) + ' ' + rush.falls + 'f' : 'DNF'}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'RACE BOTS OK');
  process.exit(fails ? 1 : 0);
}

// Climbing bots: pairs of different skill climb every cliff. Skill is how late they notice and act (react), how often
// they slip (a late grab, a leap pointed a little wrong, a worse move), how long they think between moves, how far they
// go for flowers and the stick (pace). The pair itself is in zcrew.js (shared with the pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'rope.js'), 'utf8') + ';this.Rope=Rope;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'zlevels.js'), 'utf8') + ';this.ZLEVELS=ZLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'zcrew.js'), 'utf8') + ';this.ropeCrew=ropeCrew;this.ropePlan=ropePlan;', ctx);
const { Rope, ZLEVELS, ropeCrew, ropePlan } = ctx;
function run(def, opt = {}) {
  const G = Rope.load(def), ev = [], c = ropeCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let mash = { pink: {}, mint: {} };
  for (let k = 0; k < Math.round(((def.time || Rope.TIME) + 30) / Rope.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.mash) { if (k % 30 === 0) mash = { pink: { mx: R() * 2 - 1, my: R() * 2 - 1, use: R() < .6 }, mint: { mx: R() * 2 - 1, my: R() * 2 - 1, use: R() < .6 } }; inp = { pink: Object.assign({ act: R() < .02 }, mash.pink), mint: Object.assign({ act: R() < .02 }, mash.mint) }; }
    ev.push(...Rope.step(G, inp));
  }
  return { G, score: G.score, stars: Rope.stars(G), ev, stats: G.stats, over: G.over, won: G.won, left: Math.round(Rope.timeLeft(G)), best: G.best };
}
module.exports = { run, ropeCrew, ropePlan, Rope, ZLEVELS };
const P = { tight: { react: .25, slip: 0, think: .45, gems: 1.2 }, good: { react: .35, slip: .15, think: .8, gems: .9, pace: .95 },
  casual: { react: .5, slip: .35, think: 1.3, gems: .6, pace: .85 }, sloppy: { react: .75, slip: .7, think: 2, gems: .3, pace: .75 } };
module.exports.P = P;
if (require.main === module) {
  let fails = 0;
  const only = process.argv[2] ? +process.argv[2] : -1;
  ZLEVELS.forEach((def, li) => {
    if (only >= 0 && li !== only) return;
    const t0 = Date.now(), pl = ropePlan(def);
    const runs = (p, from) => [0, 1, 2, 3, 4, 5].map(i => run(def, Object.assign({ seed: from + i }, p)));
    const tight = runs(P.tight, 1), good = runs(P.good, 11), cas = runs(P.casual, 21), slop = runs(P.sloppy, 31);
    const solo = run(def, { seed: 9, only: 'pink' }), idle = run(def, { idle: true }), mash = run(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, top ${a.filter(r => r.won).length} left ${a.map(r => r.won ? r.left : '-').join(',')}, falls ${a.reduce((s, r) => s + r.stats.falls, 0)}, gems ${a.reduce((s, r) => s + r.stats.gems, 0)})`;
    const checks = [
      ['a careful pair gets three stars (5 of 6)', n(tight, s => s === 3) >= 5],
      ['a good pair gets two stars or more (5 of 6)', n(good, s => s >= 2) >= 5],
      ['a casual pair gets a star (4 of 6)', n(cas, s => s >= 1) >= 4],
      ['beginners get a star on the first cliff (4 of 6)', li > 0 || n(slop, s => s >= 1) >= 4],
      ['a sloppy pair seldom gets three stars (2 of 6 at most)', n(slop, s => s === 3) <= 2],
      ['one alone does worse than two (no star)', solo.stars < 1],
      ['doing nothing gets no star', idle.stars === 0],
      ['random pressing gets no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(14)} stars ${def.stars.join('/')} plan ${pl.S} states | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.score} idle ${idle.score} mash ${mash.score} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'CLIMBING BOTS OK');
  process.exit(fails ? 1 : 0);
}

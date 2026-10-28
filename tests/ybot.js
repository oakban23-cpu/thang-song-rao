// Fishing bots: pairs of different skill fish every lake till dusk. Skill is how late they notice things (react), how
// often they slip (strike on a nibble, cast to the wrong side, hold on through a thrash), how much they help each other
// (care), how far they push the tension (greed) and the stick (pace). The pair itself is in ycrew.js (shared with the pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'fish.js'), 'utf8') + ';this.Fish=Fish;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'ylevels.js'), 'utf8') + ';this.YLEVELS=YLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ycrew.js'), 'utf8') + ';this.fishCrew=fishCrew;', ctx);
const { Fish, YLEVELS, fishCrew } = ctx;
function run(def, opt = {}) {
  const G = Fish.load(def), ev = [], c = fishCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let mash = { pink: {}, mint: {} };
  for (let k = 0; k < Math.round(((def.time || Fish.TIME) + 60) / Fish.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.mash) { if (k % 30 === 0) mash = { pink: { mx: R() * 2 - 1, my: R() * 2 - 1 }, mint: { mx: R() * 2 - 1, my: R() * 2 - 1 } }; inp = { pink: Object.assign({ act: R() < .03, use: R() < .5 }, mash.pink), mint: Object.assign({ act: R() < .03, use: R() < .5 }, mash.mint) }; }
    ev.push(...Fish.step(G, inp));
  }
  return { G, score: G.score, stars: Fish.stars(G), ev, stats: G.stats, over: G.over };
}
module.exports = { run, fishCrew, Fish, YLEVELS };
const P = { tight: { react: .2, slip: 0, care: 1, greed: 78 }, good: { react: .3, slip: .15, care: .9, greed: 88, pace: .95 },
  casual: { react: .45, slip: .35, care: .7, greed: 97, pace: .85 }, sloppy: { react: .7, slip: .7, care: .4, greed: 104, pace: .75 } };
module.exports.P = P;
if (require.main === module) {
  let fails = 0;
  const only = process.argv[2] ? +process.argv[2] : -1;
  YLEVELS.forEach((def, li) => {
    if (only >= 0 && li !== only) return;
    const t0 = Date.now();
    const runs = (p, from) => [0, 1, 2, 3, 4, 5].map(i => run(def, Object.assign({ seed: from + i }, p)));
    const tight = runs(P.tight, 1), good = runs(P.good, 11), cas = runs(P.casual, 21), slop = runs(P.sloppy, 31);
    const solo = run(def, { seed: 9, only: 'pink' }), idle = run(def, { idle: true }), mash = run(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, fish ${a.reduce((s, r) => s + r.stats.fish, 0)}, giants ${a.reduce((s, r) => s + r.stats.giants, 0)}, snaps ${a.reduce((s, r) => s + r.stats.snaps, 0)}, net ${a.reduce((s, r) => s + r.stats.netFish, 0)})`;
    const checks = [
      ['every pair gets to the end of the day', [...tight, ...good, ...cas, ...slop].every(r => r.over)],
      ['a careful pair gets three stars (5 of 6)', n(tight, s => s === 3) >= 5],
      ['a good pair gets two stars or more (5 of 6)', n(good, s => s >= 2) >= 5],
      ['a casual pair gets a star (4 of 6)', n(cas, s => s >= 1) >= 4],
      ['beginners get a star on the first lake (4 of 6)', li > 0 || n(slop, s => s >= 1) >= 4],
      ['a sloppy pair seldom gets three stars (2 of 6 at most)', n(slop, s => s === 3) <= 2],
      ['one alone does worse than two (no three stars)', solo.stars < 3],
      ['doing nothing gets no star', idle.stars === 0],
      ['random walking gets no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(14)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.score} idle ${idle.score} mash ${mash.score} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'FISHING BOTS OK');
  process.exit(fails ? 1 : 0);
}

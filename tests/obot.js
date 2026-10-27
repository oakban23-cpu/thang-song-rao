// Shop bots: pairs of different skill run every shop for a day. Skill is how quickly they decide (think), how late they
// notice things (react), how often they slip (sew twice running, misjudge a size, a photo off time), how much they help
// each other (care) and how hard they push the stick (pace). The pair itself is in ocrew.js (shared with the pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'shop.js'), 'utf8') + ';this.Shop=Shop;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'olevels.js'), 'utf8') + ';this.OLEVELS=OLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ocrew.js'), 'utf8') + ';this.shopCrew=shopCrew;', ctx);
const { Shop, OLEVELS, shopCrew } = ctx;
function run(def, opt = {}) {
  const G = Shop.load(def), ev = [], c = shopCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let mash = { pink: {}, mint: {} };
  for (let k = 0; k < Math.round(((def.time || Shop.TIME) + 40) / Shop.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.mash) { if (k % 30 === 0) mash = { pink: { mx: R() * 2 - 1, my: R() * 2 - 1 }, mint: { mx: R() * 2 - 1, my: R() * 2 - 1 } }; inp = { pink: Object.assign({ act: R() < .03 }, mash.pink), mint: Object.assign({ act: R() < .03 }, mash.mint) }; }
    ev.push(...Shop.step(G, inp));
  }
  return { G, score: G.score, stars: Shop.stars(G), ev, stats: G.stats, over: G.over };
}
module.exports = { run, shopCrew, Shop, OLEVELS };
const P = { tight: { think: .1, react: .2, slip: 0, care: 1 }, good: { think: .15, react: .3, slip: .1, care: .9, pace: .95 },
  casual: { think: .22, react: .45, slip: .25, care: .7, pace: .85 }, sloppy: { think: .35, react: .7, slip: .5, care: .4, pace: .75 } };
module.exports.P = P;
if (require.main === module) {
  let fails = 0;
  const only = process.argv[2] ? +process.argv[2] : -1;
  OLEVELS.forEach((def, li) => {
    if (only >= 0 && li !== only) return;
    const t0 = Date.now();
    const runs = (p, from) => [0, 1, 2, 3, 4, 5].map(i => run(def, Object.assign({ seed: from + i }, p)));
    const tight = runs(P.tight, 1), good = runs(P.good, 11), cas = runs(P.casual, 21), slop = runs(P.sloppy, 31);
    const solo = run(def, { seed: 9, only: 'pink' }), idle = run(def, { idle: true }), mash = run(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, served ${a.reduce((s, r) => s + r.stats.served, 0)}, perfect ${a.reduce((s, r) => s + r.stats.perfect, 0)}, lost ${a.reduce((s, r) => s + r.stats.lost, 0)})`;
    const checks = [
      ['every pair gets to the end of the day', [...tight, ...good, ...cas, ...slop].every(r => r.over)],
      ['a careful pair gets three stars (5 of 6)', n(tight, s => s === 3) >= 5],
      ['a good pair gets two stars or more (5 of 6)', n(good, s => s >= 2) >= 5],
      ['a casual pair gets a star (4 of 6)', n(cas, s => s >= 1) >= 4],
      ['beginners get a star on the first shop (4 of 6)', li > 0 || n(slop, s => s >= 1) >= 4],
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
  console.log(fails ? fails + ' FAILED' : 'SHOP BOTS OK');
  process.exit(fails ? 1 : 0);
}

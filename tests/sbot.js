// Stranded bots: pairs of different skill live through every island. Skill is how quickly they decide (think), how
// late they notice things (react), how often they slip (rub twice, mistime a catch, walk into a crab), how much they
// look out for each other (care) and how hard they push the stick (pace). The pair itself is in screw.js (shared with
// the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'isle.js'), 'utf8') + ';this.Isle=Isle;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'slevels.js'), 'utf8') + ';this.SLEVELS=SLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'screw.js'), 'utf8') + ';this.isleCrew=isleCrew;', ctx);
const { Isle, SLEVELS, isleCrew } = ctx;
function run(def, opt = {}) {
  const G = Isle.load(def), ev = [], c = isleCrew(G, opt), days = def.days || Isle.DAYS, len = (def.day || Isle.DAY) + (def.night || Isle.NIGHT);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let mash = { pink: {}, mint: {} };
  for (let k = 0; k < Math.round((days * len * ((def.hearts || Isle.HEARTS) + 1) + Isle.START + 1) / Isle.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.mash) { if (k % 30 === 0) mash = { pink: { mx: R() * 2 - 1, my: R() * 2 - 1 }, mint: { mx: R() * 2 - 1, my: R() * 2 - 1 } }; inp = { pink: Object.assign({ act: R() < .03 }, mash.pink), mint: Object.assign({ act: R() < .03 }, mash.mint) }; }
    ev.push(...Isle.step(G, inp));
  }
  return { G, score: G.score, stars: Isle.stars(G), won: G.won, ev, stats: G.stats, hearts: G.hearts, love: Math.round(G.love), day: G.day };
}
module.exports = { run, isleCrew, Isle, SLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { think: .1, react: .2, slip: 0, care: 1 }, good: { think: .15, react: .3, slip: .1, care: .9, pace: .95 },
    casual: { think: .22, react: .45, slip: .25, care: .7, pace: .85 }, sloppy: { think: .35, react: .7, slip: .5, care: .4, pace: .75 } };
  const only = process.argv[2] ? +process.argv[2] : -1;
  SLEVELS.forEach((def, li) => {
    if (only >= 0 && li !== only) return;
    const t0 = Date.now();
    const runs = (p, from) => [0, 1, 2, 3, 4, 5].map(i => run(def, Object.assign({ seed: from + i }, p)));
    const tight = runs(P.tight, 1), good = runs(P.good, 11), cas = runs(P.casual, 21), slop = runs(P.sloppy, 31);
    const solo = run(def, { seed: 9, only: 'pink' }), idle = run(def, { idle: true }), mash = run(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, love ${Math.min(...a.map(r => r.love))}..${Math.max(...a.map(r => r.love))}, retries ${a.reduce((s, r) => s + r.stats.retries, 0)}, downs ${a.reduce((s, r) => s + r.stats.downs, 0)})`;
    const checks = [
      ['a careful pair gets off the island every time', n(tight, s => s >= 1) === 6],
      ['a careful pair gets three stars (4 of 6: an island has its bad days)', n(tight, s => s === 3) >= 4],
      ['a good pair gets two stars or more (5 of 6)', n(good, s => s >= 2) >= 5],
      ['a casual pair gets a star (4 of 6)', n(cas, s => s >= 1) >= 4],
      ['beginners get off the first island (4 of 6)', li > 0 || n(slop, s => s >= 1) >= 4],
      ['a sloppy pair gets three stars less often than a careful one (and half the time at most)', li === 0 || (n(slop, s => s === 3) <= 3 && n(slop, s => s === 3) < n(tight, s => s === 3))],
      ['one alone does not get off the island', solo.stars === 0 && !solo.won],
      ['doing nothing gets nobody off', idle.stars === 0],
      ['random walking gets nobody off', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(12)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo day ${solo.day} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'STRANDED BOTS OK');
  process.exit(fails ? 1 : 0);
}

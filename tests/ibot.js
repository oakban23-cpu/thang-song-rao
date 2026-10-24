// Kite bots: crews of different skill fly every field. Skill is how fast they react to what they see (react, s),
// how often they decide (think), whether they let line out when the flags warn of a gust (heed), and whether they use
// the tug and the sprint. The crew itself is in icrew.js (shared with the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'kite.js'), 'utf8') + ';this.Kite=Kite;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'ilevels.js'), 'utf8') + ';this.ILEVELS=ILEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'icrew.js'), 'utf8') + ';this.kiteCrew=kiteCrew;', ctx);
const { Kite, ILEVELS, kiteCrew } = ctx;

function fly(def, opt = {}) {
  const G = Kite.load(def), ev = [];
  const c = kiteCrew(G, opt), R = (() => { let s = (opt.seed || 1) * 7919 >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })();
  for (let k = 0; k < Math.round((def.time + Kite.START + 1) / Kite.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only === 'run') inp = { run: inp.run, line: {} };
    if (opt.only === 'line') inp = { run: {}, line: inp.line };
    if (opt.mash) inp = { run: { mx: R() * 2 - 1, act: R() < .01 }, line: { pull: R() < .5 ? 1 : 0, rel: R() < .5 ? 1 : 0, act: R() < .02 } };
    if (opt.idle) inp = {};
    ev.push(...Kite.step(G, inp));
  }
  return { G, score: Math.round(G.score), stars: Kite.stars(G), best: G.best, ev, stats: G.stats };
}
module.exports = { fly, kiteCrew, Kite, ILEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { react: .15, think: .08, heed: 1 }, good: { react: .3, think: .15, heed: .85 }, casual: { react: .5, think: .25, heed: .6 }, sloppy: { react: .8, think: .4, heed: .25, tug: false, sprint: false } };
  ILEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => fly(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2]), good = run(P.good, [3, 4]), cas = run(P.casual, [5, 6]), slop = run(P.sloppy, [7, 8]);
    const runner = fly(def, { seed: 9, only: 'run' }), liner = fly(def, { seed: 10, only: 'line' }), mash = fly(def, { seed: 11, mash: true }), idle = fly(def, { idle: true });
    const show = a => a.map(r => `${r.score} ${r.stars}★ (${r.best.toFixed(0)} m, snap ${r.stats.snaps} cut ${r.stats.cuts} crash ${r.stats.crashes})`).join(', ');
    const st = a => a.map(r => r.stars), gusty = !!def.wind.gust;
    const checks = [
      ['a careful crew gets two stars or more, and three on a good day', st(tight).every(n => n >= 2) && st(tight).some(n => n === 3)],
      ['a good crew gets a star or more, and two on a good day', st(good).every(n => n >= 1) && st(good).some(n => n >= 2)],
      ['a casual crew still gets a star', st(cas).every(n => n >= 1)],
      ['beginners get a star on the first two fields', li > 1 || st(slop).every(n => n >= 1)],
      ['a sloppy crew does not get three stars where gusts blow', !gusty || st(slop).every(n => n < 3)],
      ['only running (nobody on the line) earns no star', runner.stars === 0],
      ['only working the line (nobody running) earns no star', liner.stars === 0],
      ['random buttons earn no star', mash.stars === 0],
      ['doing nothing earns no star', idle.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(20)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | run only ${runner.score} | line only ${liner.score} | mash ${mash.score} | idle ${idle.score}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'KITE BOTS OK');
  process.exit(fails ? 1 : 0);
}

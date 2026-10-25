// Trap-run bots: pairs of different skill walk every path. Skill is how far ahead they look (look, margin), how soon
// they set off once a trap has passed (react), how often they step without looking (miss), how slowly they think
// (think), how keen they are on gems (greed), how hard they push the stick (pace), and how well they time a pair of
// levers (sync). The pair itself is in pcrew.js (shared with the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'trap.js'), 'utf8') + ';this.Trap=Trap;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'plevels.js'), 'utf8') + ';this.PLEVELS=PLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'pcrew.js'), 'utf8') + ';this.trapCrew=trapCrew;', ctx);
const { Trap, PLEVELS, trapCrew } = ctx;
function run(def, opt = {}) {
  const G = Trap.load(def), ev = [], c = trapCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let mash = { pink: {}, mint: {} };
  for (let k = 0; k < Math.round((def.time + Trap.START + 1) / Trap.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.rush) inp = { pink: { mx: 1, my: 0 }, mint: { mx: 1, my: 0 } };
    if (opt.mash) { if (k % 30 === 0) mash = { pink: { mx: R() * 2 - .6, my: R() * 2 - 1 }, mint: { mx: R() * 2 - .6, my: R() * 2 - 1 } }; inp = { pink: Object.assign({ act: R() < .02 }, mash.pink), mint: Object.assign({ act: R() < .02 }, mash.mint) }; }
    ev.push(...Trap.step(G, inp));
  }
  return { G, score: G.score, stars: Trap.stars(G), won: G.won, t: Math.round(G.inT * 10) / 10, ev, stats: G.stats, hearts: G.hearts, x: Math.round(Math.max(G.p.pink.x, G.p.mint.x) / Trap.T) };
}
module.exports = { run, trapCrew, Trap, PLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { look: .7, margin: .12, pad: 3, think: .08, react: .25, sync: .1 }, good: { look: .55, margin: .08, pad: 2, think: .12, react: .4, miss: .03, greed: .9, pace: .95, sync: .3 },
    casual: { look: .45, margin: .04, pad: 1, think: .18, react: .6, miss: .07, greed: .7, pace: .85, sync: .5 }, sloppy: { look: .3, margin: 0, pad: 0, think: .28, react: .9, miss: .15, greed: .5, pace: .75, sync: .8 } };
  const only = process.argv[2] ? +process.argv[2] : -1;
  PLEVELS.forEach((def, li) => {
    if (only >= 0 && li !== only) return;
    const t0 = Date.now();
    const runs = (p, from) => [0, 1, 2, 3, 4, 5].map(i => run(def, Object.assign({ seed: from + i }, p)));
    const tight = runs(P.tight, 1), good = runs(P.good, 11), cas = runs(P.casual, 21), slop = runs(P.sloppy, 31);
    const solo = run(def, { seed: 9, only: 'pink' }), idle = run(def, { idle: true }), rush = run(def, { rush: true }), mash = run(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, ${Math.min(...a.map(r => r.t))}..${Math.max(...a.map(r => r.t))}s, falls ${a.reduce((s, r) => s + r.stats.downs, 0)})`;
    const checks = [
      ['a careful pair gets three stars', n(tight, s => s === 3) === 6],
      ['a good pair gets two stars or more (5 of 6)', n(good, s => s >= 2) >= 5],
      ['a casual pair gets a star (4 of 6)', n(cas, s => s >= 1) >= 4],
      ['beginners get through the first path (4 of 6)', li > 0 || n(slop, s => s >= 1) >= 4],
      ['a sloppy pair seldom gets three stars (2 of 6 at most)', n(slop, s => s === 3) <= 2],
      ['one alone gets nowhere', solo.stars === 0 && !solo.won],
      ['doing nothing earns no star', idle.stars === 0],
      ['running straight ahead earns no star', rush.stars === 0],
      ['random walking earns no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(14)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo x${solo.x} rush x${rush.x} mash x${mash.x} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'TRAP BOTS OK');
  process.exit(fails ? 1 : 0);
}

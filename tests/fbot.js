// No-farting bots: duos of different skill get through every meal. Skill is how fast the cover player reacts (react,
// s), how often they miss one (miss), and how patiently the gas player waits for noise. The duo itself is in fcrew.js
// (shared with the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'fart.js'), 'utf8') + ';this.Fart=Fart;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'flevels.js'), 'utf8') + ';this.FLEVELS=FLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'fcrew.js'), 'utf8') + ';this.fartCrew=fartCrew;', ctx);
const { Fart, FLEVELS, fartCrew } = ctx;
function dine(def, opt = {}) {
  const G = Fart.load(def), ev = [], c = fartCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < Math.round((def.time + Fart.START + 1) / Fart.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only === 'gas') inp = { gas: inp.gas };
    if (opt.idle) inp = {};
    if (opt.mash) inp = { gas: { hold: R() < .5, release: R() < .02 ? G.t : null }, cover: { cough: R() < .02 ? G.t : null, chair: R() < .01 ? G.t : null } };
    ev.push(...Fart.step(G, inp));
  }
  return { G, score: G.score, stars: Fart.stars(G), ruined: G.ruined, ev, stats: G.stats };
}
module.exports = { dine, fartCrew, Fart, FLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { react: .15, think: .08 }, good: { react: .25, think: .12, miss: .03 }, casual: { react: .35, think: .2, miss: .08 }, sloppy: { react: .4, think: .3, miss: .12, target: 62 } };
  FLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => dine(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2]), good = run(P.good, [3, 4]), cas = run(P.casual, [5, 6]), slop = run(P.sloppy, [7, 8]);
    const solo = dine(def, { seed: 9, only: 'gas' }), idle = dine(def, { idle: true }), mash = dine(def, { seed: 11, mash: true });
    const st = a => a.map(r => r.stars);
    const show = a => a.map(r => `${r.score} ${r.stars}★${r.ruined ? ' RUINED' : ''} (hid ${r.stats.hidden}/${r.stats.farts}, heard ${r.stats.heard}, smelled ${r.stats.smelled}, odd ${r.stats.odd}, slips ${r.stats.slips})`).join(', ');
    const checks = [
      ['a careful duo gets three stars', st(tight).every(n => n === 3)],
      ['a good duo gets two stars or more', st(good).every(n => n >= 2)],
      ['a casual duo still gets a star', st(cas).every(n => n >= 1)],
      ['beginners get a star at the first meal', li > 0 || st(slop).every(n => n >= 1)],
      ['a sloppy duo does not get three stars (after the first meal)', li === 0 || st(slop).every(n => n < 3)],
      ['nobody covering earns no star', solo.stars === 0],
      ['doing nothing (it all comes out by itself) earns no star', idle.stars === 0],
      ['random buttons earn no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(22)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | alone ${solo.score}${solo.ruined ? ' R' : ''} | idle ${idle.score}${idle.ruined ? ' R' : ''} | mash ${mash.score}${mash.ruined ? ' R' : ''}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'NO-FART BOTS OK');
  process.exit(fails ? 1 : 0);
}

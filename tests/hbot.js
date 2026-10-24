// One-blanket bots: couples of different skill sleep through every night. Skill is how fast they react in their sleep
// (react, s) and how often they cannot be bothered (sloppy). The couple itself is in hcrew.js (shared with the browser
// pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'bed.js'), 'utf8') + ';this.Bed=Bed;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'hlevels.js'), 'utf8') + ';this.HLEVELS=HLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'hcrew.js'), 'utf8') + ';this.bedCrew=bedCrew;', ctx);
const { Bed, HLEVELS, bedCrew } = ctx;
function sleep(def, opt = {}) {
  const G = Bed.load(def), ev = [], c = bedCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < Math.round((def.time + Bed.START + 1) / Bed.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.mash) inp = { pink: { mx: R() * 2 - 1, pull: R() < .5, act: R() < .01 }, mint: { mx: R() * 2 - 1, pull: R() < .5, act: R() < .01 } };
    ev.push(...Bed.step(G, inp));
  }
  return { G, score: Math.round(G.score), stars: Bed.stars(G), failed: G.failed, ev, stats: G.stats };
}
module.exports = { sleep, bedCrew, Bed, HLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { react: .2, think: .1 }, good: { react: .35, think: .15, sloppy: .03 }, casual: { react: .5, think: .25, sloppy: .08 }, sloppy: { react: .8, think: .4, sloppy: .2 } };
  HLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => sleep(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2]), good = run(P.good, [3, 4]), cas = run(P.casual, [5, 6]), slop = run(P.sloppy, [7, 8]);
    const solo = sleep(def, { seed: 9, only: 'pink' }), idle = sleep(def, { idle: true }), mash = sleep(def, { seed: 11, mash: true });
    const st = a => a.map(r => r.stars);
    const show = a => a.map(r => `${r.score} ${r.stars}★${r.failed ? ' WOKE' : ''} (wakes ${r.stats.wakes}, bites ${r.stats.bites}, kills ${r.stats.kills}, tugs ${r.stats.tugs})`).join(', ');
    const checks = [
      ['a careful couple gets three stars', st(tight).every(n => n === 3)],
      ['a good couple gets two stars or more', st(good).every(n => n >= 2)],
      ['a casual couple still gets a star', st(cas).every(n => n >= 1)],
      ['beginners get a star on the first night', li > 0 || st(slop).every(n => n >= 1)],
      ['a sloppy couple does not get three stars (after the first night)', li === 0 || st(slop).every(n => n < 3)],
      ['one sleeper looking after themselves alone earns no star', solo.stars === 0],
      ['doing nothing earns no star', idle.stars === 0],
      ['random tossing and turning earns no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(20)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.score}${solo.failed ? ' W' : ''} | idle ${idle.score}${idle.failed ? ' W' : ''} | mash ${mash.score}${mash.failed ? ' W' : ''}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'BLANKET BOTS OK');
  process.exit(fails ? 1 : 0);
}

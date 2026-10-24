// Cinema bots: couples of different skill sit through every showing. Skill is how fast they react to a head starting
// to turn (react, s), how often they miss one (miss), and whether they use the popcorn. The couple itself is in
// ccrew.js (shared with the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'cinema.js'), 'utf8') + ';this.Cin=Cin;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'clevels.js'), 'utf8') + ';this.CLEVELS=CLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ccrew.js'), 'utf8') + ';this.cinemaCrew=cinemaCrew;', ctx);
const { Cin, CLEVELS, cinemaCrew } = ctx;
function watch(def, opt = {}) {
  const G = Cin.load(def), ev = [], c = cinemaCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < Math.round((def.time + Cin.START + 1) / Cin.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.always) inp = { pink: { lean: true }, mint: { lean: true } };
    if (opt.mash) inp = { pink: { lean: R() < .5, shield: R() < .01 }, mint: { lean: R() < .5, shield: R() < .01 } };
    ev.push(...Cin.step(G, inp));
  }
  return { G, score: Math.round(G.score), stars: Cin.stars(G), kicked: G.kicked, ev, stats: G.stats };
}
module.exports = { watch, cinemaCrew, Cin, CLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { react: .15, think: .06 }, good: { react: .3, think: .1, miss: .02 }, casual: { react: .45, think: .15, miss: .06 }, sloppy: { react: .6, think: .25, miss: .15, shield: false } };
  CLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => watch(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2]), good = run(P.good, [3, 4]), cas = run(P.casual, [5, 6]), slop = run(P.sloppy, [7, 8]);
    const solo = watch(def, { seed: 9, only: 'pink' }), always = watch(def, { always: true }), mash = watch(def, { seed: 11, mash: true });
    const st = a => a.map(r => r.stars);
    const show = a => a.map(r => `${r.score} ${r.stars}★${r.kicked ? ' OUT' : ''} (caught ${r.stats.caught}, saves ${r.stats.saves}, hugs ${r.stats.hugs})`).join(', ');
    const checks = [
      ['a careful couple gets three stars', st(tight).every(n => n === 3)],
      ['a good couple gets two stars or more', st(good).every(n => n >= 2)],
      ['a casual couple still gets a star', st(cas).every(n => n >= 1)],
      ['beginners get a star in the first showing', li > 0 || st(slop).every(n => n >= 1)],
      ['a sloppy couple does not get three stars (after the first showing)', li === 0 || st(slop).every(n => n < 3)],
      ['leaning in alone never kisses', solo.score === 0],
      ['kissing all the way through gets them shown out early, for no star', always.kicked && always.stars === 0],
      ['random buttons earn no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(22)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.score} | always ${always.score}${always.kicked ? ' OUT' : ''} | mash ${mash.score}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'CINEMA BOTS OK');
  process.exit(fails ? 1 : 0);
}

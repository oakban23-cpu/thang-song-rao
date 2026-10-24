// Window-climbing bots: couples of different skill sneak in on every night. Skill is how fast they react to what they
// see and hear (react, think) and how often a warning goes unnoticed for a while (miss). The couple itself is in
// ncrew.js (shared with the browser pilots).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'climb.js'), 'utf8') + ';this.Win=Win;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'nlevels.js'), 'utf8') + ';this.NLEVELS=NLEVELS;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ncrew.js'), 'utf8') + ';this.climbCrew=climbCrew;', ctx);
const { Win, NLEVELS, climbCrew } = ctx;
function sneak(def, opt = {}) {
  const G = Win.load(def), ev = [], c = climbCrew(G, opt);
  let s = (opt.seed || 1) * 7919 >>> 0 || 1; const R = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < Math.round((def.time + Win.START + 1) / Win.DT) && !G.over; k++) {
    let inp = c();
    if (opt.only) inp = { [opt.only]: inp[opt.only] };
    if (opt.idle) inp = {};
    if (opt.rush) inp = { climb: { mx: 1, my: -1 }, top: { my: 1 } };
    if (opt.mash) inp = { climb: { mx: R() * 2 - 1, my: R() * 2 - 1, act: R() < .01 }, top: { my: R() * 2 - 1, act: R() < .01 } };
    ev.push(...Win.step(G, inp));
  }
  return { G, score: G.score, stars: Win.stars(G), won: G.won, t: Math.round(G.inT * 10) / 10, ev, stats: G.stats, strikes: G.strikes };
}
module.exports = { sneak, climbCrew, Win, NLEVELS };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { react: .2, think: .08 }, good: { react: .35, think: .12, miss: .05, careless: .05 }, casual: { react: .5, think: .2, miss: .15, careless: .15 }, sloppy: { react: .8, think: .35, miss: .45, careless: .5 } };
  NLEVELS.forEach((def, li) => {
    // eight couples of each kind: one bad night now and then is part of the game, so these are shares
    const run = (p, from) => [0, 1, 2, 3, 4, 5, 6, 7].map(i => sneak(def, Object.assign({ seed: from + i }, p)));
    const tight = run(P.tight, 1), good = run(P.good, 11), cas = run(P.casual, 21), slop = run(P.sloppy, 31);
    const solo = sneak(def, { seed: 9, only: 'climb' }), top = sneak(def, { seed: 9, only: 'top' }), idle = sneak(def, { idle: true }), rush = sneak(def, { rush: true }), mash = sneak(def, { seed: 11, mash: true });
    const n = (a, f) => a.filter(r => f(r.stars)).length;
    const show = a => `${a.map(r => r.stars).join('')}★ (${Math.min(...a.map(r => r.score))}..${Math.max(...a.map(r => r.score))}, struck ${a.reduce((s, r) => s + r.strikes, 0)})`;
    const checks = [
      ['a careful couple gets three stars', n(tight, s => s === 3) === 8],
      ['a good couple gets two stars or more (7 of 8)', n(good, s => s >= 2) >= 7],
      ['a casual couple gets a star (6 of 8)', n(cas, s => s >= 1) >= 6],
      ['beginners get a star on the first night (6 of 8)', li > 0 || n(slop, s => s >= 1) >= 6],
      ['a sloppy couple seldom gets three stars after the first night (3 of 8 at most)', li === 0 || n(slop, s => s === 3) <= 3],
      ['the climber alone gets nowhere', solo.stars === 0 && !solo.won],
      ['the one upstairs alone gets nowhere', top.stars === 0 && !top.won],
      ['doing nothing earns no star', idle.stars === 0],
      ['rushing straight in without looking earns no star', rush.stars === 0],
      ['random buttons earn no star', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(22)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | rush ${rush.score}${rush.won ? '' : ' OUT'} x${rush.strikes} | mash ${mash.score}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'CLIMB BOTS OK');
  process.exit(fails ? 1 : 0);
}

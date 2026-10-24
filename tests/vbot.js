// Moving-house bots. A planner finds a way for each piece of furniture from the truck to its outline (A* over
// position and angle, with the two carriers at its ends), and a walking planner gets each player to their end. The
// two players then pull their ends toward the next pose on the path. Small things are carried one each. Skill is
// modelled as wobbly steering (jit, radians), slower pushing (pace), and pauses to think between jobs (think, s).
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'move.js'), 'utf8') + ';this.Mov=Mov;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'vlevels.js'), 'utf8') + ';this.VLEVELS=VLEVELS;', ctx);
const { Mov, VLEVELS } = ctx;
vm.runInContext(fs.readFileSync(path.join(__dirname, 'vcrew.js'), 'utf8') + ';this.crew=crew;this.planItem=planItem;this.planWalk=planWalk;this.rng=rng;this.gauss=gauss;', ctx);
const { crew, planItem, planWalk, rng, gauss } = ctx;
function move(def, opt = {}) {
  const G = Mov.load(def), ev = [], think = crew(G, opt);
  for (let k = 0; k < Math.round(def.time / Mov.DT) + 2 && !G.over; k++) ev.push(...Mov.step(G, think()));
  return { G, money: G.money, stars: Mov.stars(G), done: G.done, delivered: G.stats.delivered, t: G.t, dmg: G.items.reduce((s, it) => s + it.dmg, 0), ev };
}
module.exports = { move, crew, planItem, planWalk, Mov, VLEVELS, rng, gauss };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { jit: 0.05, pace: 1, think: 0.1 }, good: { jit: 0.2, pace: .9, think: 0.5 }, casual: { jit: 0.35, pace: .8, think: 1 }, sloppy: { jit: 0.5, pace: .7, think: 1.8 } };
  VLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => move(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1]), good = run(P.good, [2]), cas = run(P.casual, [3]), slop = run(P.sloppy, [4]);
    const solo = move(def, { seed: 5, only: 'pink', jit: .05 }), mash = move(def, { seed: 6, mash: true }), rough = move(def, { seed: 7, jit: .1, think: .3, shove: 1.2 });
    const show = a => a.map(r => `฿${r.money} ${r.delivered}/${def.items.length} ${r.done ? r.t.toFixed(0) + 's' : 'TO'} ${r.stars}★ dmg${Math.round(r.dmg)}`).join(', ');
    const checks = [
      ['a careful crew moves everything in time for three stars', tight.every(r => r.done && r.stars === 3)],
      ['a good crew gets two stars or more', good.every(r => r.stars >= 2)],
      ['a casual crew still gets a star', cas.every(r => r.stars >= 1)],
      ['beginners get a star in the first two houses', li > 1 || slop.every(r => r.stars >= 1)],
      ['one player alone cannot earn a star (the furniture needs two)', solo.stars === 0],
      ['random pushing earns nothing', mash.stars === 0],
      ['a rough crew that bangs the furniture about loses stars', rough.stars < 3 && rough.dmg > 30]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(18)} total ฿${Mov.total(def)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | rough ${show([rough])} | solo ฿${solo.money} | mash ฿${mash.money}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'MOVERS OK');
  process.exit(fails ? 1 : 0);
}

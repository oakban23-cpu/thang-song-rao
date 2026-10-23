// Tower bots: each player lets go when its own idea of where the half will land crosses the perfect spot, with a
// timing error (sd in seconds) and a misjudged wind and sway (judge, as a fraction). A careful pair must finish every
// building; careless pairs get fewer floors; random presses or a partner who never presses must not.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'tower.js'), 'utf8') + ';this.Twr=Twr;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'wlevels.js'), 'utf8') + ';this.WLEVELS=WLEVELS;', ctx);
const { Twr, WLEVELS } = ctx;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// one player's brain: returns a function (G) -> pressed this step
function brain(who, opt, R) {
  let id = -1, d = 0, ew = 0, es = 0, last = null, at = 0;
  return G => {
    const b = G.blk[who];
    if (!b || b.st !== 'swing') { last = null; return false; }
    if (b.id !== id) { id = b.id; d = gauss(R) * (opt.sd || 0); ew = gauss(R) * (opt.judge || 0); es = gauss(R) * (opt.judge || 0); last = null; at = 0.25 + R() * (b.fuse - 0.3); }
    if (opt.idle) return false;
    if (opt.random) return b.t >= at;
    if (b.t < 0.2) return false;
    const x = b.T + Twr.uAt(b, d), tl = G.t + d + Twr.FALL_T;
    const pred = x + G.wind * Twr.FALL_T * (1 + ew) - G.swayA * Math.sin(2 * Math.PI * tl / Twr.SWAY_T) * Twr.hf(G.n - 1) * (1 + es);
    const e = pred - b.T, hit = last !== null && Math.sign(e) !== Math.sign(last);
    last = e;
    return hit;
  };
}
function build(def, opt = {}) {
  const G = Twr.load(def, opt.seed || 1), R = rng((opt.seed || 1) * 31 + 7);
  const bp = brain('pink', Object.assign({}, opt.both, opt.pink), R), bm = brain('mint', Object.assign({}, opt.both, opt.mint), R);
  const ev = [];
  for (let k = 0; k < 60 * 120 * 4 && !G.over; k++) ev.push(...Twr.step(G, { pink: { drop: bp(G) }, mint: { drop: bm(G) } }));
  return { G, floors: Twr.floorsDone(G), stars: Twr.stars(G), won: G.won, lives: G.lives, s: G.stats, t: G.t, ev };
}
module.exports = { build, Twr, WLEVELS, rng, gauss, brain };

if (require.main === module) {
  let fails = 0;
  const P = { pro: { sd: 0.012, judge: 0.05 }, good: { sd: 0.03, judge: 0.15 }, casual: { sd: 0.055, judge: 0.3 }, sloppy: { sd: 0.08, judge: 0.45 }, newbie: { sd: 0.11, judge: 0.6 } };
  WLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => build(def, { seed: s, both: p }));
    const pro = run(P.pro, [1, 2, 3]), good = run(P.good, [4, 5, 6]), cas = run(P.casual, [7, 8, 9]), slop = run(P.sloppy, [21, 22, 23]), nb = run(P.newbie, [24, 25, 26]);
    const rnd = run({ random: true }, [10, 11, 12]);
    const idle = [13, 14].map(s => build(def, { seed: s, pink: P.pro, mint: { idle: true } }));
    const show = a => a.map(r => r.floors + '/' + r.stars + '★').join(',');
    const checks = [
      ['a careful pair finishes the building', pro.every(r => r.won)],
      ['a good pair gets at least two stars', good.every(r => r.stars >= 2)],
      ['a casual pair gets at least two stars', cas.every(r => r.stars >= 2)],
      ['first players still get a star on the first two sites', li > 1 || nb.every(r => r.stars >= 1)],
      ['later sites are hard for a sloppy pair', li === 0 || slop.some(r => r.stars < 3)],
      ['pressing at random gets no star', rnd.every(r => r.stars === 0)],
      ['a partner who never presses ruins it', idle.every(r => r.stars <= 1)]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(16)} top ${def.top} | pro ${pro.map(r => r.floors).join(',')} in ${pro[0].t.toFixed(0)}s, ${pro[0].s.perfect} perfect | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | newbie ${show(nb)} | random ${rnd.map(r => r.floors).join(',')} | idle partner ${idle.map(r => r.floors).join(',')}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'TOWER BOTS OK');
  process.exit(fails ? 1 : 0);
}

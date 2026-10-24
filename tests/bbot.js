// Long boat bots: every beat a pilot looks ahead along the river (around rocks, crossing boats and logs, toward
// krathong if it wants them) and calls the strokes: both paddle together when the bow points the right way, one side
// paddles to turn, and the other back-paddles for a sharp turn. Each player strokes on the call with a timing error
// (sd, seconds) and sometimes gets it wrong (err). A careful crew must earn three stars on every river; a careless
// one fewer; one paddler alone, or random paddling, must not finish.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'boat.js'), 'utf8') + ';this.Boat=Boat;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'blevels.js'), 'utf8') + ';this.BLEVELS=BLEVELS;', ctx);
const { Boat, BLEVELS } = ctx;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// where to steer: a point ahead on the river, pushed aside by anything in the way
function target(G, opt) {
  const def = G.def, speed = Math.max(40, G.u), la = 160 + speed * .35, td = Math.min(def.length + 200, G.d + la);
  const [l, r] = Boat.banks(def, td);
  let tx = (l + r) / 2;
  if (opt.collect) {
    let best = null;
    (def.krathong || []).forEach((k, i) => { if (!G.kr[i] && k[1] > G.d + 30 && k[1] < G.d + 320 && Math.abs(k[0] - tx) < 150 && (!best || k[1] < best[1])) best = k; });
    if (best) tx = best[0];
  }
  const t2 = G.t + la / speed;
  const obs = (def.rocks || []).map(q => ({ x: q[0], d: q[1], r: q[2] })).concat(Boat.movers(def, t2), Boat.movers(def, G.t));
  for (let pass = 0; pass < 2; pass++) for (const o of obs) {
    if (o.d < G.d - 20 || o.d > G.d + la + 80) continue;
    const need = o.r + 48;
    if (Math.abs(o.x - tx) < need) { const side = tx === o.x ? (o.x < (l + r) / 2 ? 1 : -1) : Math.sign(tx - o.x); tx = o.x + side * need; }
  }
  const [l2, r2] = Boat.banks(def, G.d + 60);
  tx = Math.max(Math.max(l, l2) + 40, Math.min(Math.min(r, r2) - 40, tx));
  return [tx, td];
}
function cruise(def, opt = {}) {
  const G = Boat.load(def), R = rng(opt.seed || 1), ev = [];
  const I = opt.I || 0.46, sd = opt.sd || 0, err = opt.err || 0;
  let beat = Boat.START + 0.15; const q = [], hist = [], react = Math.round((opt.react || 0) / Boat.DT);
  for (let k = 0; k < (def.limit + 5) / Boat.DT && !G.over; k++) {
    ev.push(...Boat.step(G));
    hist.push({ x: G.x, d: G.d, h: G.h, u: G.u, t: G.t }); if (hist.length > 200) hist.shift();
    if (G.st !== 'run') continue;
    if (G.t >= beat) {
      beat += I;
      let call = { pink: null, mint: null };
      if (opt.mash) call = { pink: R() < .7 ? (R() < .7 ? 'fwd' : 'back') : null, mint: R() < .7 ? (R() < .7 ? 'fwd' : 'back') : null };
      else if (opt.only) call[opt.only] = 'fwd';
      else {
        // what the crew sees: the boat a moment ago (reaction), the heading misjudged a little (judge), and how far the
        // river is pushing the boat sideways, which they lean into
        const V = hist.length > react ? hist[hist.length - 1 - react] : G, cur = Boat.currentAt(def, V.x, V.d);
        const [tx, td] = target(Object.assign({}, G, V), opt);
        const lean = Math.asin(Math.max(-0.6, Math.min(0.6, -cur.cx / Math.max(70, V.u))));
        const e = Boat.wrap(Math.atan2(tx - V.x, td - V.d) + lean - V.h + gauss(R) * (opt.judge || 0)), tol = opt.tol || 0.12;
        if (Math.abs(e) < tol) call = { pink: 'fwd', mint: 'fwd' };
        else if (e > 0) call = { pink: 'fwd', mint: e > 0.5 ? 'back' : null };
        else call = { mint: 'fwd', pink: e < -0.5 ? 'back' : null };
      }
      for (const w of ['pink', 'mint']) {
        let a = call[w];
        if (!opt.mash && R() < err) a = a ? null : 'fwd';             // a slip: misses the call, or paddles when not asked
        if (a) q.push({ t: G.t + Math.max(0, 0.03 + gauss(R) * sd), who: w, kind: a });
      }
      q.sort((a, b) => a.t - b.t);
    }
    while (q.length && q[0].t <= G.t) { const p = q.shift(); ev.push(...Boat.press(G, p.who, p.kind, p.t)); }
  }
  return { G, finished: G.finished, time: G.time, score: Boat.score(G), stars: Boat.stars(G), hull: G.hull, kr: G.krN, s: G.stats, ev };
}
module.exports = { cruise, target, Boat, BLEVELS, rng, gauss };

if (require.main === module) {
  let fails = 0;
  const P = { tight: { sd: 0.02, err: 0, collect: true, react: 0.1, judge: 0.03 }, good: { sd: 0.045, err: 0.03, collect: true, react: 0.18, judge: 0.08 }, casual: { sd: 0.07, err: 0.06, I: 0.5, react: 0.26, judge: 0.15 }, sloppy: { sd: 0.1, err: 0.1, I: 0.55, react: 0.35, judge: 0.25 } };
  BLEVELS.forEach((def, li) => {
    const run = (p, seeds) => seeds.map(s => cruise(def, Object.assign({ seed: s }, p)));
    const tight = run(P.tight, [1, 2, 3]), good = run(P.good, [4, 5, 6]), cas = run(P.casual, [7, 8, 9]), slop = run(P.sloppy, [10, 11, 12]);
    const solo = cruise(def, { seed: 13, only: 'pink' }), mash = cruise(def, { seed: 14, mash: true });
    const show = a => a.map(r => (r.finished ? r.score.toFixed(0) : r.G.sunk ? 'SANK' : 'DNF') + '/' + r.stars + '★ h' + Math.round(r.hull) + ' k' + r.kr).join(', ');
    const checks = [
      ['a careful crew gets three stars', tight.every(r => r.stars === 3)],
      ['a good crew gets two stars or more', good.every(r => r.stars >= 2)],
      ['a casual crew still finishes with a star', cas.every(r => r.stars >= 1)],
      ['beginners finish the first three rivers', li > 2 || slop.every(r => r.stars >= 1)],
      ['a sloppy crew does not get three stars', slop.every(r => r.stars < 3)],
      ['one paddler alone goes in circles', !solo.finished],
      ['random paddling gets nowhere', mash.stars === 0]
    ];
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${def.name.padEnd(18)} stars ${def.stars.join('/')} | tight ${show(tight)} | good ${show(good)} | casual ${show(cas)} | sloppy ${show(slop)} | solo ${solo.finished ? 'finished!' : 'no'} mash ${mash.finished ? mash.score.toFixed(0) : 'DNF'}`);
    for (const c of bad) console.log('   failed: ' + c[0]);
  });
  console.log(fails ? fails + ' FAILED' : 'BOAT BOTS OK');
  process.exit(fails ? 1 : 0);
}

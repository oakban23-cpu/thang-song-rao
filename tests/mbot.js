// Rhythm bots: each player presses its notes with a timing error (normal, sd in ms) and sometimes forgets one.
// A tight pair must get 3 stars on every song, a sloppy pair fewer, one player alone or random mashing must fail.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'rhythm.js'), 'utf8') + ';this.Rhy=Rhy;', ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'mlevels.js'), 'utf8') + ';this.MLEVELS=MLEVELS;', ctx);
const { Rhy, MLEVELS } = ctx;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// presses: [{ t, lane }] for one player
function pressesFor(G, who, opt, R) {
  const out = [];
  if (opt.mash) {
    const lanes = Rhy.LANE_OF[who];
    for (let t = 0; t < G.C.end; t += 1 / opt.mash) out.push({ t: t + R() * 0.05, lane: lanes[R() < 0.5 ? 0 : 1] });
    return out;
  }
  for (const n of G.notes) {
    if (n.who !== who) continue;
    if (R() < (opt.forget || 0)) continue;
    out.push({ t: n.t + gauss(R) * (opt.sd || 0) / 1000 + (opt.bias || 0) / 1000, lane: n.lane });
  }
  return out.sort((a, b) => a.t - b.t);
}
function playSong(def, opt = {}) {
  const G = Rhy.load(def), R = rng(opt.seed || 1);
  const press = [];
  for (const who of ['pink', 'mint']) { const o = opt[who] === null ? null : Object.assign({}, opt.both || {}, opt[who] || {}); if (o) press.push(...pressesFor(G, who, o, R)); }
  press.sort((a, b) => a.t - b.t);
  let i = 0; const ev = [];
  for (let t = 0; t < G.C.end + 2 && !G.over; t += 1 / 240) {
    while (i < press.length && press[i].t <= t) { Rhy.hit(G, press[i].lane, press[i].t); i++; }
    Rhy.expire(G, t);
    ev.push(...Rhy.settle(G, t));
  }
  return { G, score: G.score, acc: Rhy.accuracy(G), stars: Rhy.stars(G), failed: G.failed, fevers: G.stats.fevers, sync: G.stats.sync, maxCombo: G.maxCombo, ev };
}
module.exports = { playSong, Rhy, MLEVELS, rng, pressesFor };

if (require.main === module) {
  let fails = 0;
  for (const def of MLEVELS) {
    const C = Rhy.compile(def);
    const tight = [1, 2, 3].map(s => playSong(def, { seed: s, both: { sd: 14, forget: 0.01 } }));
    const ok2 = playSong(def, { seed: 7, both: { sd: 38, forget: 0.04 } });
    const sloppy = playSong(def, { seed: 8, both: { sd: 70, forget: 0.08 } });
    const solo = playSong(def, { seed: 9, both: { sd: 14 }, mint: null });
    const mash = playSong(def, { seed: 10, both: { mash: 8 } });
    const ok = tight.every(r => r.stars === 3) && ok2.stars >= 1 && sloppy.stars < 3 && solo.failed && mash.stars === 0;
    if (!ok) fails++;
    const pn = C.notes.filter(n => n.who === 'pink').length, mn = C.notes.length - pn;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${def.name.padEnd(18)} ${(C.end).toFixed(0)}s notes ${pn}+${mn} chords ${C.chords} | tight ${tight.map(r => r.stars + '★ ' + (r.acc * 100).toFixed(0) + '%').join(', ')} fever ${tight[0].fevers} score ${tight[0].score} | ok ${ok2.stars}★ ${(ok2.acc * 100).toFixed(0)}%${ok2.failed ? ' FAILED' : ''} | sloppy ${sloppy.stars}★ ${(sloppy.acc * 100).toFixed(0)}%${sloppy.failed ? ' failed' : ''} | solo ${solo.failed ? 'band fell apart' : 'survived!'} | mash ${mash.stars}★${mash.failed ? ' failed' : ''}`);
  }
  console.log(fails ? fails + ' FAILED' : 'RHYTHM BOTS OK');
  process.exit(fails ? 1 : 0);
}

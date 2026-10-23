// Two takraw bots: whoever gets the serve sets it to the partner, the partner jumps and shoots. Used to prove every
// court is playable, to set the stars, and to show that playing alone (never passing) scores nothing.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'takraw.js'), 'utf8') + ';this.Tak=Tak;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'tlevels.js'), 'utf8') + ';this.TLEVELS=TLEVELS;', ctx);
const { Tak, TLEVELS } = ctx;
const DT = Tak.DT;
const RISE = h => (Tak.JUMP - Math.sqrt(Math.max(0, Tak.JUMP * Tak.JUMP - 2 * Tak.GP * h))) / Tak.GP;   // time to rise h px

function brain(G, me, opt = {}) {
  const other = me === 'pink' ? 'mint' : 'pink', p = G[me], o = G[other], b = G.ball, ch = G.chain;
  const cx = p.x + p.w / 2, inp = { mx: 0, my: 0, act: false };
  const go = (x, tol = 4) => { const d = x - cx; if (Math.abs(d) > tol) inp.mx = Math.sign(d) * Math.min(1, Math.abs(d) / 30 + 0.35); };
  const hoop = Tak.litHoop(G), hx = hoop.cx;
  if (opt.idle) return inp;
  if (!b.live) {                                                 // waiting for the serve
    if (b.to === me) go(b.x); else go(clamp(b.x + (hx > b.x ? 150 : -150), 60, 900));
    return inp;
  }
  const coming = ch.last !== me;                                 // nobody touched it yet, or the partner did
  const mine = coming && (ch.last === other || (ch.last === null && Math.abs(Tak.predict(G, p.y).x - cx) <= Math.abs(Tak.predict(G, o.y).x - (o.x + o.w / 2)) + (b.to === me ? 40 : -40)));
  const shoot = opt.solo ? (ch.last === me || ch.passes > 0) : ch.last === other;
  if (!mine && !opt.solo) {                                      // partner's ball: get into a spot to receive the next one
    const myHome = clamp(hx + (cx < hx ? -70 : 70), 40, 920);
    go(ch.last === me ? myHome : clamp((o.x + o.w / 2) + (hx > o.x ? 170 : -170), 40, 920));
    return inp;
  }
  if (shoot) {
    const hk = p.y - 100, pr = Tak.predict(G, hk), tj = RISE(p.y - hk + 10);
    const want = clamp(pr.x - Math.sign(hx - pr.x) * 4, 30, 930);
    go(want, 3);
    if (p.ground && pr.t <= tj + 0.02 && Math.abs(want - cx) < 26 && b.vy > -200) inp.my = -1;
    if (!p.ground && Tak.inReach(p, b.x, b.y) && b.y < p.y + 10) inp.act = true;
    if (p.ground && pr.t > 0.5 && b.vy > 0 && Tak.inReach(p, b.x, b.y)) { inp.act = true; inp.mx = opt.solo ? 0 : Math.sign((o.x + o.w / 2) - cx); }
    return inp;
  }
  // set: keep it up once if it is awkward, else pass it to the partner
  const pr = Tak.predict(G, p.y + 6);
  go(clamp(pr.x, 30, 930), 3);
  if (Tak.inReach(p, b.x, b.y) && b.vy > -60) {
    inp.act = true;
    inp.mx = opt.solo ? 0 : Math.sign((o.x + o.w / 2) - cx) || 1;
  }
  return inp;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function playTak(def, opt = {}) {
  const G = Tak.load(def);
  const st = { kicks: 0, goals: 0, drops: 0, nopass: 0, rims: 0, dark: 0, back: 0, best: 0 };
  let lastAct = { pink: false, mint: false };
  for (let f = 0; f < (def.time + 2) / DT && !G.over; f++) {
    const inp = {};
    for (const id of ['pink', 'mint']) {
      const q = opt.solo ? (id === 'pink' ? brain(G, id, { solo: true }) : brain(G, id, { idle: true })) : brain(G, id, opt);
      // a key press is one frame
      const act = q.act && !lastAct[id]; lastAct[id] = q.act; q.act = act;
      inp[id] = q;
    }
    const ev = Tak.step(G, inp);
    for (const e of ev) {
      const [k, , pts, kind] = e.split(':');
      if (k === 'goal') { st.goals++; if (kind === 'back') st.back++; }
      if (k === 'drop') st.drops++; if (k === 'nopass') st.nopass++; if (k === 'rim') st.rims++; if (k === 'dark') st.dark++;
      if (k === 'kick') st.kicks++;
    }
    if (opt.trace && f % 600 === 0) console.log('   t', (G.t).toFixed(0), 'score', G.score, 'goals', st.goals, 'drops', st.drops, 'chain', G.chain.passes);
  }
  st.best = G.ev.best;
  return { score: G.score, stars: Tak.stars(G), st };
}
module.exports = { brain, playTak, Tak, TLEVELS };

if (require.main === module) {
  let fails = 0;
  for (const def of TLEVELS) {
    const runs = [0, 1, 2].map(k => playTak(Object.assign({}, def, { seed: def.seed + k * 101 })));
    const duo = runs.map(r => r.score), solo = playTak(def, { solo: true }), idle = playTak(def, { idle: true });
    const ok = runs.every(r => r.stars === 3) && solo.score === 0 && idle.score === 0;
    if (!ok) fails++;
    const r = runs[0].st;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${def.name.padEnd(14)} duo ${duo.join('/')} (stars ${runs.map(r => r.stars).join('')}) goals ${r.goals} back ${r.back} drops ${r.drops} rims ${r.rims} dark ${r.dark} best ${r.best} | thresholds ${def.stars.join('/')} | solo ${solo.score} (nopass ${solo.st.nopass}, goals ${solo.st.goals}) | idle ${idle.score}`);
  }
  console.log(fails ? fails + ' FAILED' : 'TAKRAW BOTS OK');
  process.exit(fails ? 1 : 0);
}

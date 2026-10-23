// Two simulated phones playing takraw over a delayed link: the host (pink) runs the ball, the guest (mint) moves its
// own player and asks the host to kick. Both run the bot. The pair must still score well and see the same score.
const vm = require('vm'), fs = require('fs'), path = require('path');
const { brain } = require('./tbot.js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'takraw.js'), 'utf8') + ';this.Tak=Tak;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'tlevels.js'), 'utf8') + ';this.TLEVELS=TLEVELS;', ctx);
const { Tak, TLEVELS } = ctx;
const DT = Tak.DT;
const MS = +(process.argv.find(a => a.startsWith('--ms=')) || '--ms=100').slice(5);

function playNet(def, ms) {
  const A = Tak.load(def), B = Tak.load(def);
  A.net = { role: 'host', local: 'pink' }; B.net = { role: 'guest', local: 'mint' };
  const D = Math.round(ms / 1000 / DT), qA = [], qB = [];
  const kick = { n: 0, req: null };
  let seenKa = 0, fresh = false, req = null, la = false, lb = false, rejected = 0, accepted = 0;
  for (let t = 0; t < (def.time + 3) / DT && !A.over; t++) {
    const now = t * DT * 1000;
    while (qA.length && qA[0].at <= t) { const m = qA.shift().m; Tak.applyPlayer(A, 'mint', m, now); if ((m.ka | 0) > seenKa) { seenKa = m.ka; req = m.kq; fresh = true; } }
    while (qB.length && qB[0].at <= t) { const m = qB.shift().m; Tak.applyPlayer(B, 'pink', m.p, now); Tak.apply(B, m.w, now); }
    // host
    const ip = brain(A, 'pink'); const a = ip.act && !la; la = ip.act; ip.act = a;
    Tak.smoothPlayer(A, 'mint', now);
    const ev = Tak.step(A, { pink: ip });
    if (fresh) { fresh = false; if (Tak.remoteKick(A, 'mint', req, ev)) accepted++; else rejected++; }
    // guest: own player locally, kicks become requests
    const im = brain(B, 'mint'); const b = im.act && !lb; lb = im.act; im.act = b;
    const me = B.mint;
    Tak.stepPlayer(B, me, im, DT);
    if (im.act && me.cd <= 0) {
      const ball = B.ball, dir = Math.abs(im.mx) > .3 ? Math.sign(im.mx) : 0;
      if (ball.live && Tak.inReach(me, ball.x, ball.y)) { kick.n++; kick.req = { bx: Math.round(ball.x), by: Math.round(ball.y), px: Math.round(me.x), py: Math.round(me.y), dir, air: !me.ground }; me.cd = .2; me.kickT = .24; }
      else { me.cd = .12; }
    }
    Tak.smoothPlayer(B, 'pink', now); Tak.smooth(B, now);
    if (t % 2 === 0) {
      qB.push({ at: t + D, m: JSON.parse(JSON.stringify({ p: Tak.encodePlayer(A, 'pink', null), w: Tak.encode(A) })) });
      qA.push({ at: t + D, m: JSON.parse(JSON.stringify(Tak.encodePlayer(B, 'mint', kick))) });
    }
  }
  // let the last messages arrive
  for (const m of qB) Tak.apply(B, m.m.w, 0);
  return { score: A.score, guestScore: B.score, stars: Tak.stars(A), goals: A.ev.goals, drops: A.ev.drops, accepted, rejected };
}
let fails = 0;
for (const def of TLEVELS) {
  const r = playNet(def, MS);
  const ok = r.stars >= 3 && r.guestScore === r.score && r.accepted > 10;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${def.name.padEnd(14)} @${MS}ms score ${r.score} (guest sees ${r.guestScore}) stars ${r.stars} goals ${r.goals} drops ${r.drops} guest kicks accepted ${r.accepted} refused ${r.rejected}`);
}
console.log(fails ? fails + ' FAILED' : 'TAKRAW ONLINE OK');
process.exit(fails ? 1 : 0);

// Takraw rules: kicks, passes, shots, the pass rule, the multiplier, drops, dark hoops, wind, branches, the online codec.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'takraw.js'), 'utf8') + ';this.Tak=Tak;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'tlevels.js'), 'utf8') + ';this.TLEVELS=TLEVELS;', ctx);
const { Tak, TLEVELS } = ctx;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DT = Tak.DT, idle = () => ({ mx: 0, my: 0, act: false });
const run = (G, n, f) => { const evs = []; for (let k = 0; k < n; k++) { const i = f ? f(k) : { pink: idle(), mint: idle() }; evs.push(...Tak.step(G, i)); } return evs; };
const live = (G, x, y, vx = 0, vy = 0) => Object.assign(G.ball, { x, y, vx, vy, live: true, wait: 0 });
const at = (p, x) => { p.x = x - p.w / 2; p.y = Tak.GROUND - p.h; p.vx = p.vy = 0; p.ground = true; };
const cxOf = p => p.x + p.w / 2;

for (const def of TLEVELS) {
  ok(def.hoops.length >= 1 && def.stars.length === 3 && def.stars[0] < def.stars[1] && def.stars[1] < def.stars[2] && def.tips.length === 3 && def.hint, `${def.name}: hoops, rising stars, hint and three tips`);
  ok(def.hoops.every(h => h.y > 100 && h.y < 260 && h.x - (h.swing || 0) > 60 && h.x + (h.swing || 0) < 900), `${def.name}: every hoop stays on the court`);
}
const L1 = TLEVELS[0];

// a kick on the ground with no direction keeps the ball up for yourself
{ const G = Tak.load(L1); at(G.pink, 300); at(G.mint, 700); live(G, 300, Tak.GROUND - 30, 0, 100);
  run(G, 1, () => ({ pink: { mx: 0, my: 0, act: true }, mint: idle() }));
  let top = 1e9; for (let k = 0; k < 120; k++) { run(G, 1); top = Math.min(top, G.ball.y); }
  ok(G.chain.last === 'pink' && top < G.pink.y - 60 && Math.abs(G.ball.x - 300) < 40, `juggle goes up over your own head (top ${(G.pink.y - top).toFixed(0)}px above, x ${G.ball.x.toFixed(0)})`); }

// a pass towards the partner comes down onto the partner's head
for (const [a, bx] of [[220, 520], [300, 700], [600, 250]]) {
  const G = Tak.load(L1); at(G.pink, a); at(G.mint, bx); live(G, a, Tak.GROUND - 30, 0, 100);
  run(G, 1, () => ({ pink: { mx: Math.sign(bx - a), my: 0, act: true }, mint: idle() }));
  let reach = false; for (let k = 0; k < 220 && !reach; k++) { run(G, 1); if (G.ball.vy > 0 && Tak.inReach(G.mint, G.ball.x, G.ball.y)) reach = true; }
  ok(reach, `a pass from ${a} reaches the partner at ${bx} without them moving`);
}

// shot after a pass: goes in most of the time from near the hoop; the pass rule and the multiplier
{ let goals = 0, pts = 0, tries = 0;
  for (let s = 0; s < 40; s++) {
    const G = Tak.load(Object.assign({}, L1, { seed: 100 + s })); at(G.pink, 360); at(G.mint, 560);
    G.chain.last = 'mint'; G.chain.passes = 0;
    G.pink.vy = -Tak.JUMP; G.pink.ground = false; G.pink.y -= 2;
    for (let k = 0; k < 14; k++) Tak.stepPlayer(G, G.pink, idle(), DT);
    live(G, cxOf(G.pink) + 6, G.pink.y - 4, 0, 40);
    const ev = run(G, 1, () => ({ pink: { mx: 0, my: 0, act: true }, mint: idle() }));
    tries++;
    const evs = run(G, 200);
    const g = evs.find(e => e.startsWith('goal'));
    if (g) { goals++; pts = +g.split(':')[2]; }
  }
  ok(goals >= 30, `a jump shot after a pass from near the hoop goes in ${goals}/${tries}`);
  ok(pts === 3, `one pass then a shot is worth 2 x 1.5 = 3 (got ${pts})`);
}
{ const G = Tak.load(L1); at(G.pink, 380); at(G.mint, 700);
  G.chain.last = 'pink'; G.chain.passes = 0; G.chain.kind = 'shot'; G.chain.shooter = 'pink';
  const h = G.hoops[0]; live(G, h.cx, h.y - 40, 0, 50);
  const ev = run(G, 30);
  ok(ev.includes('nopass') && G.score === 0, 'a goal that never went through the partner scores nothing'); }
{ const G = Tak.load(L1); at(G.pink, 380); at(G.mint, 700);
  G.chain.last = 'pink'; G.chain.passes = 3; G.chain.kind = 'back'; G.chain.shooter = 'pink';
  const h = G.hoops[0]; live(G, h.cx, h.y - 40, 0, 50);
  run(G, 30);
  ok(G.score === 10, `three exchanges then a back-heel: 4 x 2.5 = 10 (got ${G.score})`); }
{ const G = Tak.load(L1); G.chain.last = 'mint'; G.chain.passes = 9; G.chain.kind = 'shot';
  const h = G.hoops[0]; live(G, h.cx, h.y - 40, 0, 50); run(G, 30);
  ok(G.score === 6, `the multiplier stops at x3 (got ${G.score})`); }

// facing away from the hoop makes it a back-heel
{ const G = Tak.load(L1); at(G.pink, 300); G.pink.face = -1; G.chain.last = 'mint';
  G.pink.vy = -Tak.JUMP; G.pink.ground = false; G.pink.y -= 2; for (let k = 0; k < 14; k++) Tak.stepPlayer(G, G.pink, { mx: 0, my: 0 }, DT);
  G.pink.face = -1; live(G, cxOf(G.pink), G.pink.y, 0, 40);
  const ev = run(G, 1, () => ({ pink: { mx: 0, my: 0, act: true }, mint: idle() }));
  ok(ev.includes('kick:pink:back'), 'a jump kick with your back to the hoop is a back-heel'); }

// kicking with nothing in reach is a whiff with a short wait
{ const G = Tak.load(L1); at(G.pink, 200); live(G, 800, 200);
  const ev = run(G, 1, () => ({ pink: { mx: 0, my: 0, act: true }, mint: idle() }));
  ok(!ev.some(e => e.startsWith('kick')) && G.pink.kickK === 'whiff' && G.pink.cd > 0, 'kicking at thin air does nothing but swing'); }

// the ball on the ground: a drop, then a serve to the other player
{ const G = Tak.load(L1); at(G.pink, 300); at(G.mint, 700); G.chain.last = 'pink'; G.chain.passes = 2; live(G, 500, Tak.GROUND - 40, 0, 300);
  const ev = run(G, 20);
  ok(ev.includes('drop') && G.ev.drops === 1 && G.chain.passes === 0 && !G.ball.live && G.ball.to === 'mint', 'a ball on the ground ends the rally and the other player gets the next serve');
  run(G, Math.ceil(1.2 / DT));
  ok(G.ball.live && Math.abs(G.ball.x - cxOf(G.mint)) < 30, 'the serve drops in over that player'); }

// a ball landing just after a goal is not a drop
{ const G = Tak.load(L1); G.chain.last = 'mint'; G.chain.passes = 1; G.chain.kind = 'shot'; G.chain.shooter = 'mint';
  const h = G.hoops[0]; live(G, h.cx, h.y - 40, 0, 50); const ev = run(G, 200);
  ok(ev.some(e => e.startsWith('goal')) && ev.includes('land') && G.ev.drops === 0, 'the ball falling out of the hoop after a goal is not counted as a drop'); }

// a bounce off the head of a partner standing still is not a pass
{ const G = Tak.load(L1); at(G.pink, 300); at(G.mint, 600); run(G, Math.ceil(1.6 / DT)); G.chain.last = 'pink'; G.chain.passes = 0;
  live(G, cxOf(G.mint), G.mint.y - 60, 0, 200); run(G, 30);
  ok(G.chain.passes === 0 && G.chain.last === 'pink', 'a ball bouncing off a partner who stands still is not a pass'); }
{ const G = Tak.load(L1); at(G.pink, 300); at(G.mint, 560); G.ball.wait = 99;
  run(G, 24, () => ({ pink: idle(), mint: { mx: 1, my: 0, act: false } })); run(G, 12);   // mint has just been walking
  G.chain.last = 'pink'; G.chain.passes = 0;
  live(G, cxOf(G.mint), G.mint.y - 60, 0, 200); run(G, 30);
  ok(G.chain.passes === 1 && G.chain.last === 'mint', 'a header by a partner on the move is a pass'); }

// a ball landing on the head of someone standing still rolls off instead of bouncing there forever
{ const G = Tak.load(L1); at(G.pink, 300); at(G.mint, 700); G.ball.wait = 99; G.chain.last = 'mint';
  live(G, cxOf(G.pink), G.pink.y - 120, 0, 0); const ev = run(G, Math.ceil(3 / DT));
  ok(ev.includes('drop'), 'a ball dropped on a still head rolls off and lands'); }
{ const G = Tak.load(L1); at(G.pink, 300); live(G, cxOf(G.pink), G.pink.y - 110, 0, 0);
  run(G, 14, () => ({ pink: { mx: 0, my: -1, act: false }, mint: idle() }));
  let top = 1e9; for (let k = 0; k < 120; k++) { run(G, 1); top = Math.min(top, G.ball.y); }
  ok(top < G.pink.y - 120, `jumping into the ball is a header that sends it back up (${(G.pink.y - top).toFixed(0)}px over the head)`); }

// dark hoop (two-hoop night court)
{ const L5 = TLEVELS[4], G = Tak.load(L5); run(G, 2);
  const dark = G.hoops.find(h => !h.lit), lit = G.hoops.find(h => h.lit);
  ok(dark && lit, 'night court: one hoop lit, one dark');
  G.chain.last = 'mint'; G.chain.passes = 2; G.chain.kind = 'shot'; live(G, dark.cx, dark.y - 40, 0, 50); const ev = run(G, 45);
  ok(ev.includes('dark') && G.score === 0, 'a ball through the dark hoop scores nothing');
  const G2 = Tak.load(L5); run(G2, Math.ceil(10.5 / DT));
  ok(G2.hoops[1].lit && !G2.hoops[0].lit, 'the light moves to the other hoop after ten seconds'); }

// wind, branches, swinging hoop
{ const L4 = TLEVELS[3], G = Tak.load(L4); let mx = 0; for (let k = 0; k < 900; k++) { run(G, 1); mx = Math.max(mx, Math.abs(G.wind)); }
  const G2 = Tak.load(L4); G2.t = 2; Tak.world(G2); live(G2, 480, 100, 0, 0); const x0 = G2.ball.x; G2.wind = Tak.windAt(G2, 2); for (let k = 0; k < 60; k++) Tak.step(G2, { pink: idle(), mint: idle() });
  ok(mx > 150 && Math.abs(G2.ball.x - x0) > 15, `sea wind blows (up to ${mx.toFixed(0)}) and moves a falling ball ${(G2.ball.x - x0).toFixed(0)}px`); }
{ const G = Tak.load(TLEVELS[1]); const br = G.branches[0]; live(G, br.x, br.y - br.r - 40, 0, 300); const ev = run(G, 30);
  ok(ev.includes('leaf') && G.ball.vy < 0, 'a ball dropping onto a branch bounces off'); }
{ const G = Tak.load(TLEVELS[2]); const xs = []; for (let k = 0; k < 800; k++) { run(G, 1); xs.push(G.hoops[0].cx); }
  ok(Math.max(...xs) - Math.min(...xs) > 250, `the swinging hoop moves ${(Math.max(...xs) - Math.min(...xs)).toFixed(0)}px`); }

// players: jump height, walls, round ends
{ const G = Tak.load(L1); let top = 1e9; run(G, 1, () => ({ pink: { mx: 0, my: -1, act: false }, mint: idle() })); for (let k = 0; k < 80; k++) { run(G, 1); top = Math.min(top, G.pink.y); }
  ok(Tak.GROUND - Tak.PH - top > 120 && Tak.GROUND - Tak.PH - top < 160, `a jump is ${(Tak.GROUND - Tak.PH - top).toFixed(0)}px high`);
  run(G, 300, () => ({ pink: { mx: -1, my: 0, act: false }, mint: { mx: 1, my: 0, act: false } }));
  ok(G.pink.x >= 8 && G.mint.x + G.mint.w <= Tak.VW - 8, 'players stop at the edges of the court'); }
{ const G = Tak.load(L1); const ev = run(G, Math.ceil((L1.time + 0.1) / DT)); ok(G.over && ev.includes('over'), 'the round ends when time runs out'); }

// online: the guest's copy follows the host; a guest kick is accepted only where the ball really was
{ const A = Tak.load(L1), B = Tak.load(L1); A.net = { role: 'host', local: 'pink' }; B.net = { role: 'guest', local: 'mint' };
  run(A, 400, k => ({ pink: { mx: k % 200 < 100 ? 1 : -1, my: 0, act: false }, mint: idle() }));
  Tak.apply(B, JSON.parse(JSON.stringify(Tak.encode(A))), 0);
  ok(Math.abs(B.ball.x - A.ball.x) < 0.2 && B.score === A.score && B.ball.live === A.ball.live && Math.abs(B.t - A.t) < 0.01, 'guest copy of ball, score and clock matches the host');
  const H = Tak.load(L1); H.net = { role: 'host', local: 'pink' }; at(H.mint, 600); live(H, 600, Tak.GROUND - 60, 0, 120);
  for (let k = 0; k < 10; k++) Tak.step(H, { pink: idle() });
  const b = H.ball, good = { bx: b.x, by: b.y - 4, px: H.mint.x, py: H.mint.y, dir: -1, air: false };
  ok(Tak.remoteKick(H, 'mint', good, []) && H.chain.last === 'mint', 'host accepts a guest kick where the ball was');
  const H2 = Tak.load(L1); H2.net = { role: 'host', local: 'pink' }; at(H2.mint, 600); live(H2, 200, 200, 0, 0); for (let k = 0; k < 10; k++) Tak.step(H2, { pink: idle() });
  ok(!Tak.remoteKick(H2, 'mint', { bx: 600, by: 430, px: H2.mint.x, py: H2.mint.y, dir: 0, air: false }, []) && H2.chain.last === null, 'host refuses a guest kick at a ball that was never there'); }

console.log(fails ? `${fails} FAILED` : 'TAKRAW OK');
process.exit(fails ? 1 : 0);

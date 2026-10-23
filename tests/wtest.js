// Tower rules: cutting, perfect snaps and regrowth toward the seam, sealed and cracked floors, sway, wind, taper,
// misses and hard hats, the crane fuse, and the online exchange (the guest swings its own crane, the host lands it).
const { Twr, WLEVELS, build, rng } = require('./wbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const H = WLEVELS[0];
const run = (G, inp, n) => { const ev = []; for (let i = 0; i < n && !G.over; i++) ev.push(...Twr.step(G, inp ? inp(i) : {})); return ev; };
const ready = G => { run(G, null, Math.ceil(1.3 / Twr.DT)); };            // the first halves swing in
// put a swinging half at offset d from its perfect spot and let go; wait until it has landed
function dropAt(G, who, d) {
  const b = G.blk[who]; b.dir = 1; b.u = d - b.v * Twr.DT; b.x = b.T + b.u;        // one swing step lands it on d
  const ev = Twr.step(G, { [who]: { drop: true } });
  for (let i = 0; i < 200 && G.blk[who] && G.blk[who].st === 'fall'; i++) ev.push(...Twr.step(G, {}));
  return ev;
}

{ const G = Twr.load(H);
  ok(G.n === 1 && G.lives === 3 && G.floors.length === 1 && !G.blk.pink, 'a site starts on the foundation with three hard hats and no halves yet');
  ready(G);
  ok(G.blk.pink && G.blk.mint && G.blk.pink.st === 'swing' && G.blk.pink.w === Twr.W0, 'then both cranes swing a half in');
  const x0 = G.blk.pink.x; run(G, null, 30);
  ok(G.blk.pink.x > x0 && G.blk.mint.x < G.blk.mint.T + G.blk.mint.amp, 'pink swings in from the left, mint from the right');
  const ev = dropAt(G, 'pink', 0);
  ok(ev.includes('land:pink:p') && G.cur.pink.a === Twr.CX - Twr.W0 && G.cur.pink.b === Twr.CX, 'let go right over its half: a perfect landing, nothing cut');
  dropAt(G, 'mint', 3);
  ok(G.cur.mint === null && G.floors.length === 2 && G.floors[1].seal && G.floors[1].mint.a === Twr.CX, 'within five pixels snaps on exactly; both halves down finishes the floor, sealed');
  ok(G.stats.both === 1 && G.lives === 3, 'both perfect on one floor (no hard hat lost, so none to give back)');
}
{ const G = Twr.load(H); ready(G);
  dropAt(G, 'pink', 20);
  ok(Math.abs(G.cur.pink.b - Twr.CX) < 0.01 && Math.abs(G.cur.pink.a - (Twr.CX - Twr.W0 + 20)) < 0.01, 'twenty pixels too far in: the part hanging over is cut, the seam side stays');
  dropAt(G, 'mint', 0);
  ok(G.floors[1].seal, 'so the seam is still closed');
  run(G, null, 80);
  ok(G.blk.pink && Math.abs(G.blk.pink.w - (Twr.W0 - 20)) < 0.01, 'the next half is as wide as what is left below');
}
{ const G = Twr.load(H); ready(G);
  dropAt(G, 'pink', -20); dropAt(G, 'mint', 0);
  const f = G.floors[1];
  ok(!f.seal && Math.abs(f.gap - 20) < 0.01 && G.wobble === 1 && G.stats.crack === 1, 'pink too far out: the inner edge pulls back, a 20 px gap cracks the floor and the tower wobbles');
  run(G, null, 80);
  const w = G.blk.pink.w;
  dropAt(G, 'pink', 0);
  ok(Math.abs(G.cur.pink.b - (Twr.CX - 20 + Twr.GROW)) < 0.01 && Math.abs(G.cur.pink.b - G.cur.pink.a - (w + Twr.GROW)) < 0.01, 'a perfect landing grows the half back toward the seam first');
  dropAt(G, 'mint', 0);
  ok(!G.floors[2].seal && G.wobble === 2, 'the gap is smaller but still open: more wobble');
  for (let k = 0; k < 3; k++) { run(G, null, 80); dropAt(G, 'pink', 0); dropAt(G, 'mint', 0); }
  ok(G.floors[G.floors.length - 1].seal && G.wobble < 3, `three more perfect floors close the seam and steady the tower (wobble ${G.wobble})`);
}
{ const G = Twr.load(H); ready(G);
  ok(Twr.W0 > H.amp, 'at full width a half cannot miss altogether: the crane does not swing that far');
  dropAt(G, 'pink', -100); dropAt(G, 'mint', 0); run(G, null, 80);
  ok(Math.abs(G.blk.pink.w - 50) < 0.01, 'a bad drop leaves pink a 50 px half');
  const ev = dropAt(G, 'pink', -100);
  ok(ev.includes('miss:pink') && G.lives === 2 && !G.cur.pink && G.last.pink.miss, 'a half that misses its own floor falls off: a hard hat lost');
  run(G, null, Math.ceil(0.8 / Twr.DT));
  ok(G.blk.pink && Math.abs(G.blk.pink.w - 50) < 0.01 && G.blk.pink.st === 'swing', 'and a new half of the same width swings in');
  dropAt(G, 'pink', 0); dropAt(G, 'mint', 0);
  ok(G.lives === 3 && G.stats.both === 1, 'both perfect on a floor gives a hard hat back');
  run(G, null, 80); dropAt(G, 'pink', 100); run(G, null, 90); dropAt(G, 'pink', 100); run(G, null, 90); const e3 = dropAt(G, 'pink', -100);
  ok(G.over && !G.won && G.lives === 0 && e3.includes('collapse'), 'three misses and the site closes');
}
{ const G = Twr.load(H); ready(G);
  const f = G.blk.pink.fuse, ev = run(G, null, Math.ceil((f + 0.7) / Twr.DT));
  ok(ev.includes('auto:pink') && ev.includes('auto:mint') && f >= Twr.FUSE && f <= Twr.FUSE + 1, `a crane nobody lets go of drops its half by itself after about ${f.toFixed(1)} s`);
}
{ const def = WLEVELS[2], G = Twr.load(def, 3); ready(G);
  ok(Math.abs(G.wind) >= def.wind * 0.4 && Math.abs(G.wind) <= def.wind, `the windy site has wind (${G.wind} px/s)`);
  const b = G.blk.pink, x0 = b.x;
  Twr.step(G, { pink: { drop: true } });
  for (let i = 0; i < 200 && G.blk.pink; i++) Twr.step(G, {});
  const drift = G.last.pink.x - x0;
  ok(Math.abs(drift - G.wind * Twr.FALL_T) < 3, `a falling half drifts with the wind (${drift.toFixed(1)} px, expected ${(G.wind * Twr.FALL_T).toFixed(1)})`);
  const ws = new Set([G.wind]); const r = build(def, { seed: 5, both: { sd: 0.01 } });
  ok(r.won && r.ev.filter(e => e === 'wind').length >= 2, 'the wind changes every few floors (and careful players still finish)');
  void ws;
}
{ const def = WLEVELS[3], r = build(def, { seed: 2, both: { sd: 0.01 } });
  const G = r.G;
  ok(Math.abs(Twr.off(G, 18, 0.85)) > 15 && Math.abs(Twr.off(G, 2, 0.85)) < 2, 'the condo leans more the higher it is');
  ok(r.won && r.s.perfect > 30, `players who time the sway still land perfect (${r.s.perfect} perfect halves)`);
  const blind = build(def, { seed: 2, both: { sd: 0.01, judge: 1.5 } });
  ok(blind.floors < r.floors && blind.s.perfect < r.s.perfect / 2, `ignoring the sway costs floors (${blind.floors}) and perfects (${blind.s.perfect})`);
}
{ const def = WLEVELS[4], r = build(def, { seed: 4, both: { sd: 0.01, judge: 0.02 } });
  const fl = r.G.floors;
  ok(r.won && fl.every((f, k) => k === 0 || (f.pink.b - f.pink.a <= Twr.capW(def, k) + 0.1 && f.mint.b - f.mint.a <= Twr.capW(def, k) + 0.1)), 'the chedi narrows every floor');
  ok(fl.slice(1).every(f => f.seal), 'and with perfect play its two halves stay joined all the way up');
  ok(fl[fl.length - 1].pink.b - fl[fl.length - 1].pink.a < 80, `the top is narrow (${(fl[fl.length - 1].pink.b - fl[fl.length - 1].pink.a).toFixed(0)} px a half)`);
}
{ const def = WLEVELS[1], G = Twr.load(def); ready(G);
  const v1 = [G.blk.pink.v, G.blk.mint.v];
  for (let k = 0; k < 4; k++) { dropAt(G, 'pink', 0); dropAt(G, 'mint', 0); run(G, null, 80); }
  const v2 = [G.blk.pink.v, G.blk.mint.v];
  ok(v1[0] > v1[1] * 1.4 && v2[1] > v2[0] * 1.4, `the shophouse cranes run at different speeds and swap after four floors (${v1.map(Math.round)} -> ${v2.map(Math.round)})`);
}
{ const r = build(H, { seed: 1, both: { sd: 0.01 } });
  ok(r.won && r.stars === 3 && r.G.over && r.ev.includes('top'), 'twelve floors finish the house: three stars');
  ok(r.G.score === r.s.halves * Twr.PTS.half + r.s.perfect * Twr.PTS.perfect + r.s.seal * Twr.PTS.seal + r.s.both * Twr.PTS.both, `score adds up (${r.G.score})`);
}

{ // tall towers built carelessly stay well formed: halves never overlap, never leave the screen, never go thinner than a crumb
  let bad = 0, floors = 0;
  for (const def of WLEVELS) for (const seed of [31, 32, 33, 34]) {
    const r = build(def, { seed, both: { sd: 0.07, judge: 0.4 } });
    floors += r.floors;
    for (const f of r.G.floors.slice(1)) if (!(f.pink.b - f.pink.a >= Twr.MIN_W - 1e-6 && f.mint.b - f.mint.a >= Twr.MIN_W - 1e-6 && f.pink.b <= f.mint.a + 1e-6 && f.pink.a >= 0 && f.mint.b <= Twr.VW && (f.seal ? f.gap === 0 : f.gap > Twr.SEAM))) bad++;
  }
  ok(bad === 0, `${floors} floors built by sloppy pairs on every site are all well formed`);
}

// online: the guest swings its own crane and sends where it let go; snapshots go back. Both sides end the same.
for (const [li, lat] of [[0, 0.1], [3, 0.25], [4, 0.15]]) {
  const def = WLEVELS[li], Hs = Twr.load(def, 9), Gs = Twr.load(def, 9);
  Hs.net = { role: 'host', local: 'pink' }; Gs.net = { role: 'guest', local: 'mint' };
  const R = rng(17), { brain } = require('./wbot.js');
  const hp = brain('pink', { sd: 0.015, judge: 0.05 }, R), gp = brain('mint', { sd: 0.015, judge: 0.05 }, R);
  const q = []; let reqN = 0, seenN = 0, lastReq = null, k = 0, perfMint = 0, guestDrops = 0;
  for (; k < 120 * 200 && !Hs.over; k++) {
    const t = k * Twr.DT;
    Twr.step(Hs, { pink: { drop: hp(Hs) } });
    const req = Twr.guestStep(Gs, 'mint', gp(Gs));
    if (req) { reqN++; lastReq = req; guestDrops++; }
    if (k % 4 === 0) {
      q.push({ at: t + lat, to: 'g', m: JSON.parse(JSON.stringify(Twr.encode(Hs))) });
      const gb = Gs.blk.mint;
      q.push({ at: t + lat, to: 'h', m: { x: gb ? gb.x : null, id: gb ? gb.id : -1, d: lastReq ? [reqN, lastReq.id, lastReq.x, lastReq.t] : null } });
    }
    while (q.length && q[0].at <= t) {
      const msg = q.shift();
      if (msg.to === 'g') Twr.apply(Gs, msg.m, 'mint');
      else {
        if (msg.m.x != null) Twr.remoteX(Hs, 'mint', msg.m.x, msg.m.id);
        if (msg.m.d && msg.m.d[0] > seenN) { seenN = msg.m.d[0]; Twr.dropAt(Hs, 'mint', msg.m.d[2], msg.m.d[1], msg.m.d[3]); }
      }
    }
  }
  Twr.apply(Gs, JSON.parse(JSON.stringify(Twr.encode(Hs))), 'mint');           // the host keeps sending after the end
  perfMint = Hs.floors.slice(1).filter(f => f.perf.mint).length;
  const same = JSON.stringify(Hs.floors) === JSON.stringify(Gs.floors) && Hs.score === Gs.score && Hs.lives === Gs.lives && Gs.over === Hs.over;
  ok(Hs.won && same, `${def.name} online with ${lat * 1000} ms each way: finished (${Twr.floorsDone(Hs)} floors) and both phones agree`);
  ok(perfMint >= Twr.floorsDone(Hs) * 0.7 && Hs.stats.auto === 0, `the guest's careful drops land where the guest saw them (${perfMint}/${Twr.floorsDone(Hs)} perfect, ${guestDrops} drops)`);
}
{ const G = Twr.load(H); let thrown = null;
  for (const junk of [null, 5, {}, { fl: 3 }, { fl: [[1]] }, { fl: [], bk: [[1, 2]], cu: ['x', [1, 'b']] }, { fl: [[1, 2, 3, 4, 5, 6]], fb: 999 }, { fl: [], ls: [[1, 2]], st: 'x', t: 'q' }]) {
    try { Twr.apply(G, junk, 'mint'); Twr.guestStep(G, 'mint', true); } catch (e) { thrown = e; }
  }
  ok(!thrown && G.floors.length >= 1 && Number.isFinite(G.t), 'junk snapshots are ignored');
  const A = Twr.load(H); ready(A); dropAt(A, 'pink', 7); dropAt(A, 'mint', -9); run(A, null, 100);
  const B = Twr.load(H); Twr.apply(B, JSON.parse(JSON.stringify(Twr.encode(A))), 'mint');
  ok(JSON.stringify(A.floors) === JSON.stringify(B.floors) && A.score === B.score && B.blk.pink && B.blk.pink.id === A.blk.pink.id, 'a snapshot carries the whole tower');
}

console.log(fails ? `${fails} FAILED` : 'TOWER OK');
process.exit(fails ? 1 : 0);

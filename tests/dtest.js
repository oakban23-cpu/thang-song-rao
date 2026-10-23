// Rules checks for the defense mode.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'defense.js'), 'utf8') + ';this.Def=Def;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'dlevels.js'), 'utf8') + ';this.DLEVELS=DLEVELS;', ctx);
const { Def, DLEVELS } = ctx;
const K = Def.K;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const run = (G, inp, s) => { const ev = []; for (let i = 0; i < Math.round(s * 60); i++) ev.push(...Def.step(G, typeof inp === 'function' ? inp(i) : inp)); return ev; };
const fresh = (i = 0) => { const G = Def.load(DLEVELS[i]); G.pt = 999; return G; };
const put = (p, cx, cy) => { p.x = (cx + 0.5) * K; p.y = (cy + 0.5) * K; p.vx = p.vy = 0; };
const imp = (G, x, y, k = 'imp') => { const e = { id: ++G.eid, k, x, y, vx: 0, vy: 0, kx: 0, ky: 0, hp: Def.EN[k].hp, max: Def.EN[k].hp, r: Def.EN[k].r * K, cd: 9, stun: 0, slow: false, fl: 0, chase: null, sum: 4, atk: false }; G.en.push(e); return e; };

for (const def of DLEVELS) {
  const G = Def.load(def);
  const bad = G.gates.filter(g => !Number.isFinite(G.flow[g.ty][g.tx]));
  ok(!bad.length && G.houses.length >= 1 && G.spawn['1'] && G.spawn['2'], `${def.name}: every gate has a path to a house, spawns exist`);
  ok(def.map.every(r => r.length === 15) && def.map.length === 7 && def.tips.length === 3, `${def.name}: map is 15×7 with three tips`);
}
{ // heroes shoot on their own
  const G = fresh(0); put(G.pink, 3, 4); put(G.mint, 12, 1);
  const e = imp(G, 6 * K, 4.5 * K); e.k = 'pob'; e.hp = e.max = 999;
  run(G, {}, 1);
  ok(e.hp < 999 - 15, `a hero hits a ghost in range without pressing anything (hp ${e.hp.toFixed(0)})`);
}
{ // the thread
  const G = fresh(0); put(G.pink, 2, 4); put(G.mint, 6, 4);
  run(G, {}, 0.05); ok(G.beam, 'thread links the heroes 4 tiles apart');
  put(G.mint, 8, 5); run(G, {}, 0.05); ok(!G.beam, 'thread breaks past 5 tiles');
  put(G.mint, 5, 4); G.mint.down = true; run(G, {}, 0.05); ok(!G.beam, 'no thread while a hero is down');
  G.mint.down = false; G.mint.hp = 100; put(G.pink, 1, 5); put(G.mint, 5, 5);
  const e = imp(G, 3.5 * K, 5.5 * K); e.k = 'pob'; e.hp = e.max = 999; e.cd = 99;
  const pinkShot = G.pink.shotT; G.pink.shotT = G.mint.shotT = 99; // silence the guns
  const ref = { x: e.x };
  Def.step(G, {}); G.pink.shotT = G.mint.shotT = 99;
  run(G, () => { G.pink.shotT = G.mint.shotT = 99; return {}; }, 1);
  ok(e.hp < 999 - 35 && e.hp > 999 - 45, `a ghost on the thread burns about 40 a second (lost ${(999 - e.hp).toFixed(0)})`);
  const fb = { x: 3.5 * K, y: 5.5 * K, vx: 0, vy: 0, life: 3 }; G.fb.push(fb); Def.step(G, {});
  ok(!G.fb.includes(fb), 'the thread blocks fireballs');
}
{ // down, revive, lose
  const G = fresh(0); put(G.pink, 3, 4); put(G.mint, 3, 5); G.pink.hp = 5;
  const e = imp(G, 3.5 * K, 4.5 * K, 'pob'); e.hp = e.max = 9999; G.pink.shotT = G.mint.shotT = 99;
  const ev = run(G, () => { G.pink.shotT = G.mint.shotT = 99; return {}; }, 0.5);
  ok(G.pink.down && ev.includes('down:pink'), 'a hero at zero falls down');
  G.en = []; const x0 = G.pink.x; run(G, { pink: { mx: 1 } }, 0.5); ok(G.pink.x === x0, 'a fallen hero cannot move');
  run(G, { mint: { use: true } }, 1.0); ok(G.pink.down, 'not up yet after 1 s of help');
  const ev2 = run(G, { mint: { use: true } }, 1.1); ok(!G.pink.down && G.pink.hp >= 50 && G.pink.hp < 53 && ev2.includes('revive:pink'), 'holding use next to them for 2 s brings them back with 50');
  G.pink.hp = 1; G.mint.hp = 1; const b = imp(G, 3.5 * K, 4.9 * K, 'pob'); b.hp = b.max = 9999;
  run(G, () => { G.pink.shotT = G.mint.shotT = 99; return {}; }, 0.5);
  ok(G.over && G.ph === 'lost' && G.why === 'down', 'both down means the night is lost');
}
{ // build, upgrade, repair
  const G = fresh(0); const pad = G.pads[0]; put(G.pink, pad.x, pad.y + 1); G.pink.fx = 0; G.pink.fy = -1;
  G.coins = 29; run(G, { pink: { use: true } }, 1.2); ok(pad.tw === 0, 'cannot build a lantern with 29 coins');
  G.coins = 30; const ev = run(G, { pink: { use: true } }, 1.05); ok(pad.tw === 1 && G.coins === 0 && ev.includes('build:pink'), 'holding use on a pad for 1 s builds a lantern for 30');
  G.coins = 45; run(G, { pink: { use: true } }, 1.05); ok(pad.tw === 2 && G.coins === 0, 'and upgrades it for 45');
  const e = imp(G, (pad.x + 0.5) * K, (pad.y + 3.2) * K, 'pob'); e.hp = e.max = 999; G.pink.shotT = G.mint.shotT = 99; put(G.mint, 13, 1); put(G.pink, 1, 1);
  run(G, () => { G.pink.shotT = G.mint.shotT = 99; return {}; }, 2); ok(e.hp < 999 - 30, `the lantern shoots ghosts nearby (lost ${(999 - e.hp).toFixed(0)})`);
  const H = G.houses[0]; H.hp = 50; G.coins = 20; G.en = [];
  const t = H.tiles.find(t => t.y === H.y1 && t.x === H.x0); put(G.pink, t.x, t.y + 1); G.pink.fx = 0; G.pink.fy = -1;
  run(G, { pink: { use: true } }, 1);
  ok(H.hp > 63 && H.hp < 65 && Math.abs(G.coins - (20 - (H.hp - 50) * 0.5)) < 0.01, `repairing turns coins into house (hp ${H.hp.toFixed(1)}, coins ${G.coins.toFixed(1)})`);
  G.coins = 0; const h1 = H.hp; run(G, { pink: { use: true } }, 1); ok(H.hp === h1, 'no coins, no repair');
}
{ // specials
  const G = fresh(0); put(G.pink, 4, 4); put(G.mint, 12, 1);
  const a = imp(G, 5 * K, 4.5 * K), c = imp(G, 4.5 * K, 5.6 * K); a.hp = a.max = 200; c.hp = c.max = 200;
  const ev = run(G, i => ({ pink: { act: i === 0 } }), 0.3);
  ok(a.hp <= 200 - 45 && c.hp <= 200 - 45 && ev.includes('burst:pink'), 'pink burst hits every ghost around');
  ok(Math.hypot(a.x - G.pink.x, a.y - G.pink.y) > 1.5 * K, 'and knocks them back');
  ok(G.pink.cd > 6, 'then waits for the cooldown');
  const hp = a.hp; run(G, i => ({ pink: { act: i === 0 } }), 0.1); ok(G.pink.cd > 6 && a.hp >= hp - 20, 'pressing again during the cooldown does nothing');
  const H = fresh(0); put(H.pink, 4, 4); put(H.mint, 5, 5); H.pink.hp = 30; H.mint.hp = 40;
  run(H, i => ({ mint: { act: i === 0 } }), 0.05); ok(H.pink.hp >= 69 && H.mint.hp >= 79, 'mint heal mends both heroes nearby');
  H.pink.down = true; H.pink.hp = 0; H.mint.cd = 0; run(H, i => ({ mint: { act: i === 0 } }), 0.05); ok(!H.pink.down && H.pink.hp >= 50 && H.pink.hp < 53, 'and lifts a fallen pink straight up');
  const e = imp(H, 5.5 * K, 6 * K); H.mint.cd = 0; run(H, i => ({ mint: { act: i === 0 } }), 0.05); ok(e.stun > 0.5, 'ghosts next to the heal are dazed');
}
{ // ghosts
  const G = fresh(0); G.pink.x = G.mint.x = 1e5; // heroes away
  put(G.pink, 1, 1); put(G.mint, 13, 1); G.pink.shotT = G.mint.shotT = 1e9;
  const e = imp(G, 0.5 * K, 3.5 * K); e.cd = 99;
  run(G, () => { G.pink.shotT = G.mint.shotT = 1e9; return {}; }, 8);
  ok(G.houses[0].hp < 100 && e.atk, `a ghost walks the path to the house and knocks on it (house ${G.houses[0].hp.toFixed(0)})`);
  const B = fresh(4); B.pink.shotT = B.mint.shotT = 1e9; put(B.pink, 1, 1); put(B.mint, 1, 5);
  const k = imp(B, 13 * K, 3.5 * K, 'king'); k.sum = 0.1;
  const ev = run(B, () => { B.pink.shotT = B.mint.shotT = 1e9; return {}; }, 0.3);
  ok(ev.includes('summon') && B.en.filter(x => x.k === 'imp').length === 2, 'the ghost king calls two little ghosts');
  const W = fresh(2); put(W.pink, 1, 3); put(W.mint, 1, 4); W.pink.shotT = W.mint.shotT = 1e9;
  const w = imp(W, 4.5 * K, 3.5 * K, 'wisp'); w.cd = 0;
  const ev2 = run(W, () => { W.pink.shotT = W.mint.shotT = 1e9; return {}; }, 2);
  ok(ev2.includes('fire') && (W.pink.hp < 100 || W.mint.hp < 100), 'a will-o-wisp spits fire at a hero in sight');
}
{ // loot
  const G = fresh(0); put(G.pink, 4, 4); put(G.mint, 12, 1); G.coins = 0;
  const e = imp(G, 5 * K, 4.5 * K); e.hp = 1;
  run(G, {}, 2);
  ok(G.coins === Def.EN.imp.coin && !G.drops.length, 'a ghost drops coins that fly to the nearest hero');
}
{ // a whole night: waves, rests, the end
  const G = Def.load(DLEVELS[0]); const seen = [];
  let spawned = 0; const total = DLEVELS[0].waves.reduce((s, w) => s + w.list.reduce((a, l) => a + l[1], 0), 0);
  for (let f = 0; f < 60 * 300 && !G.over; f++) {
    for (const e of G.en) if (!e.seen) { e.seen = 1; spawned++; }
    const ev = Def.step(G, {}); for (const x of ev) if (['wave', 'rest', 'won', 'lost'].includes(x)) seen.push(x);
    G.pink.hp = G.mint.hp = 100; G.houses[0].hp = 100;
  }
  ok(G.ph === 'won' && Def.stars(G) === 3, 'with heroes kept alive the first night is won with three stars');
  ok(seen.join(',') === 'wave,rest,wave,rest,wave,won', `waves run in order (${seen.join(',')})`);
  ok(spawned === total, `every ghost in the list shows up (${spawned}/${total})`);
}
{ // net: what the guest rebuilds matches the host
  const B = require('./dbot.js');
  const A = Def.load(DLEVELS[4]); const Gst = Def.load(DLEVELS[4]); Gst.net = { role: 'guest', local: 'mint' };
  let same = 0, checks = 0;
  for (let f = 0; f < 60 * 70 && !A.over; f++) {
    Def.step(A, { pink: { mx: Math.sin(f / 50) }, mint: { my: Math.cos(f / 70) } });
    if (f % 45 === 0) {
      const w = JSON.parse(JSON.stringify(Def.encode(A))); Def.apply(Gst, w);
      for (const e of Gst.en) { e.x = e.tx; e.y = e.ty; }
      const w2 = JSON.parse(JSON.stringify(Def.encode(Gst)));
      const strip = o => JSON.stringify(Object.assign({}, o, { en: o.en.map(a => a.slice(0, 5)), pl: o.pl.map(a => a.slice(0, 4)), bu: o.bu.length, dr: o.dr.length }));
      checks++; if (strip(w) === strip(w2)) same++; else if (process.argv.includes('-v')) console.log(strip(w), '\n', strip(w2));
    }
  }
  ok(checks > 20 && same === checks, `guest copy of the world matches the host (${same}/${checks})`);
}
console.log(fails ? fails + ' FAILED' : 'DEFENSE OK');
process.exit(fails ? 1 : 0);

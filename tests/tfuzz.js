// Random play on every kitchen, defense night, driving route, takraw court, song, building site, race course, river, house, kite field,
// cinema showing, meal, night in one bed and window to climb:
// nothing may throw, go NaN, leave the map,
// sink into walls, duplicate an item, or fail to end the round.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');   // coop/ (dev) or tests/ (repo)
for (const f of ['kitchen', 'klevels', 'defense', 'dlevels', 'drive', 'rlevels', 'takraw', 'tlevels', 'rhythm', 'mlevels', 'tower', 'wlevels', 'leg', 'llevels', 'boat', 'blevels', 'move', 'vlevels', 'kite', 'ilevels', 'cinema', 'clevels', 'fart', 'flevels', 'bed', 'hlevels', 'climb', 'nlevels']) vm.runInContext(fs.readFileSync(path.join(JS, f + '.js'), 'utf8'), ctx);
vm.runInContext('this.Kit=Kit;this.Def=Def;this.Drv=Drv;this.Tak=Tak;this.KL=KLEVELS;this.DL=DLEVELS;this.RL=RLEVELS;this.TL=TLEVELS;this.Rhy=Rhy;this.ML=MLEVELS;this.Twr=Twr;this.WL=WLEVELS;this.Leg=Leg;this.LL=LLEVELS;this.Boat=Boat;this.BL=BLEVELS;this.Mov=Mov;this.VL=VLEVELS;this.Kite=Kite;this.IL=ILEVELS;this.Cin=Cin;this.CL=CLEVELS;this.Fart=Fart;this.FL=FLEVELS;this.Bed=Bed;this.HL=HLEVELS;this.Win=Win;this.NL=NLEVELS;', ctx);
const { Kit, Def, Drv, Tak, KL, DL, RL, TL, Rhy, ML, Twr, WL, Leg, LL, Boat, BL, Mov, VL, Kite, IL, Cin, CL, Fart, FL, Bed, HL, Win, NL } = ctx;
const RUNS = +process.argv[2] || 6;
let seed = 1; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const found = new Map();
const report = (k, info) => { if (!found.has(k)) found.set(k, { n: 0, info }); found.get(k).n++; };
const fin = (...v) => v.every(Number.isFinite);
const pen = (cx, cy, r, R) => { const nx = Math.max(R.x, Math.min(cx, R.x + R.w)), ny = Math.max(R.y, Math.min(cy, R.y + R.h)); return r - Math.hypot(cx - nx, cy - ny); };

function walker() {
  let mx = 0, my = 0, until = 0, use = false, useUntil = 0;
  return (k, actP) => {
    if (k >= until) { const a = rnd() * Math.PI * 2, still = rnd() < 0.2; mx = still ? 0 : Math.cos(a); my = still ? 0 : Math.sin(a); until = k + 15 + Math.floor(rnd() * 90); }
    if (k >= useUntil) { use = rnd() < 0.3; useUntil = k + 20 + Math.floor(rnd() * 120); }
    return { mx, my, act: rnd() < actP, use };
  };
}

// ---- kitchen
const KF = new Set(['.', '1', '2']);
for (const def of KL) {
  let ends = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 1000 + run * 77 + def.name.length;
    const G = Kit.load(def), wp = walker(), wm = walker();
    let over = false;
    for (let k = 0; k < (def.time + 5) / Kit.DT; k++) {
      const inp = { pink: wp(k, 0.04), mint: wm(k, 0.04) };
      try { Kit.step(G, inp); } catch (e) { report(`kitchen ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      for (const p of [G.pink, G.mint]) {
        if (!fin(p.x, p.y)) report(`kitchen ${def.name}: NaN player`, `run ${run}`);
        if (p.x < 0 || p.y < 0 || p.x > Kit.GW * Kit.K || p.y > Kit.GH * Kit.K) report(`kitchen ${def.name}: player off the map`, `${p.x | 0},${p.y | 0}`);
        if (!G.boat || Math.abs(p.x / Kit.K - (G.boat.x0 + G.boat.w / 2)) > G.boat.w / 2 + 1) {
          const tx = Math.floor(p.x / Kit.K), ty = Math.floor(p.y / Kit.K);
          for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
            if (x < 0 || y < 0 || x >= Kit.GW || y >= Kit.GH || KF.has(G.tiles[y][x].t)) continue;
            const d = pen(p.x, p.y, Kit.PR, { x: x * Kit.K, y: y * Kit.K, w: Kit.K, h: Kit.K });
            if (d > 5) report(`kitchen ${def.name}: ${p.id} inside '${G.tiles[y][x].t}'`, `run ${run} t=${(k * Kit.DT).toFixed(1)} by ${d.toFixed(1)}px`);
          }
        }
      }
      // no item object in two places at once
      const seen = new Set(), dup = it => { if (!it) return; if (seen.has(it)) report(`kitchen ${def.name}: an item is in two places`, `run ${run}`); seen.add(it); };
      dup(G.pink.held); dup(G.mint.held);
      for (const row of G.tiles) for (const t of row) dup(t.item);
      if (G.boat) for (const row of G.boat.tiles) for (const t of row) dup(t.item);
      if (!fin(G.money)) report(`kitchen ${def.name}: money NaN`, '');
      if (G.over) { over = true; break; }
    }
    if (over) ends++; else report(`kitchen ${def.name}: round never ended`, `run ${run} left ${G.left}`);
  }
  console.log(`kitchen ${def.name.padEnd(18)} ${RUNS} random rounds, ended ${ends}`);
}

// ---- defense
const DSOL = new Set(['#', 't', '~', 'h', 'T']);
for (const def of DL) {
  const res = {};
  for (let run = 0; run < RUNS; run++) {
    seed = 2000 + run * 91 + def.name.length;
    const G = Def.load(def), wp = walker(), wm = walker();
    let k = 0;
    for (; k < 900 / Def.DT && !G.over; k++) {
      const inp = { pink: wp(k, 0.01), mint: wm(k, 0.01) };
      try { Def.step(G, inp); } catch (e) { report(`defense ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      for (const p of [G.pink, G.mint]) {
        if (!fin(p.x, p.y, p.hp)) report(`defense ${def.name}: NaN hero`, `run ${run}`);
        if (p.hp < -0.01 || p.hp > (p.max || 100) + 0.01) report(`defense ${def.name}: hp out of range`, `${p.hp}`);
        const tx = Math.floor(p.x / Def.K), ty = Math.floor(p.y / Def.K);
        for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
          if (x < 0 || y < 0 || x >= Def.GW || y >= Def.GH || !DSOL.has(G.tiles[y][x].t)) continue;
          const d = pen(p.x, p.y, Def.PR, { x: x * Def.K, y: y * Def.K, w: Def.K, h: Def.K });
          if (d > 5) report(`defense ${def.name}: ${p.id} inside '${G.tiles[y][x].t}'`, `run ${run} by ${d.toFixed(1)}px`);
        }
        if (p.x < 0 || p.y < 0 || p.x > Def.GW * Def.K || p.y > Def.GH * Def.K) report(`defense ${def.name}: hero off the map`, `${p.x | 0},${p.y | 0}`);
      }
      for (const e of G.en) if (!fin(e.x, e.y, e.hp)) report(`defense ${def.name}: NaN ghost ${e.type}`, '');
      if (!fin(G.coins) || G.coins < -0.01) report(`defense ${def.name}: coins ${G.coins}`, '');
      for (const H of G.houses) if (!fin(H.hp) || H.hp < -0.01 || H.hp > H.max + 0.01) report(`defense ${def.name}: house hp ${H.hp}`, '');
    }
    const r = G.over ? G.ph : 'never ended'; res[r] = (res[r] || 0) + 1;
    if (!G.over) report(`defense ${def.name}: night never ended`, `run ${run} ph ${G.ph} wave ${G.wi} en ${G.en.length}`);
  }
  console.log(`defense ${def.name.padEnd(18)} ${RUNS} random nights: ${JSON.stringify(res)}`);
}

// ---- drive
// can a driver who means it get out? alternate gas+full lock and reverse+opposite lock (a three-point turn), both ways
function rescue(def, c) {
  for (const sgn of [1, -1]) {
    const G = Drv.load(def); G.traffic = []; G.trains = [];
    Object.assign(G.car, { x: c.x, y: c.y, a: c.a, vx: 0, vy: 0 });
    for (let k = 0; k < 600; k++) { Drv.step(G, Math.floor(k / 90) % 2 ? { steer: -sgn, pedal: -1 } : { steer: sgn, pedal: 1 }); if (Math.hypot(G.car.x - c.x, G.car.y - c.y) > 1.2 * Drv.K) return true; }
  }
  return false;
}
for (const def of RL) {
  let ends = 0, crashes = 0, maxStuck = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 3000 + run * 53 + def.name.length;
    const G = Drv.load(def);
    let st = 0, pe = 0.6, until = 0, stuck = 0; const win = [];
    for (let k = 0; k < (def.time + 5) / Drv.DT; k++) {
      if (k >= until) { st = rnd() * 2 - 1; if (rnd() < 0.4) st = 0; pe = rnd() < 0.8 ? 0.3 + rnd() * 0.7 : -1; until = k + 30 + Math.floor(rnd() * 120); }
      const inp = { steer: st, pedal: pe, horn: rnd() < 0.005, turbo: rnd() < 0.003 };
      let ev;
      try { ev = Drv.step(G, inp); } catch (e) { report(`drive ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      crashes += ev.filter(e => e.startsWith('crash')).length;
      const c = G.car;
      if (!fin(c.x, c.y, c.vx, c.vy, c.a)) report(`drive ${def.name}: NaN truck`, `run ${run}`);
      if (c.x < 0 || c.y < 0 || c.x > G.W * Drv.K || c.y > G.H * Drv.K) report(`drive ${def.name}: truck off the map`, `${(c.x / Drv.K).toFixed(1)},${(c.y / Drv.K).toFixed(1)}`);
      for (const cc of Drv.circles(c)) {
        const tx = Math.floor(cc.x / Drv.K), ty = Math.floor(cc.y / Drv.K);
        for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
          if (x < 0 || y < 0 || x >= G.W || y >= G.H || Drv.drivable(G.tiles[y][x])) continue;
          const d = pen(cc.x, cc.y, 0.25 * Drv.K, { x: x * Drv.K, y: y * Drv.K, w: Drv.K, h: Drv.K });
          if (d > 0.12 * Drv.K) report(`drive ${def.name}: truck inside '${G.tiles[y][x]}'`, `run ${run} t=${(k * Drv.DT).toFixed(1)} by ${(d / Drv.K).toFixed(2)} tile`);
        }
      }
      // wedged = over a 6 s window the truck tried gas+wheel and reverse+wheel for at least a second each and still moved < 0.2 tile
      win.push({ x: c.x, y: c.y, f: pe > 0.2 && Math.abs(st) > 0.3, r: pe < -0.5 && Math.abs(st) > 0.3 }); if (win.length > 360) win.shift();
      if (win.length === 360 && k % 30 === 0) {
        const xs = win.map(w => w.x), ys = win.map(w => w.y), span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        if (span < 0.2 * Drv.K && win.filter(w => w.f).length > 60 && win.filter(w => w.r).length > 60 && !rescue(def, c)) { stuck++; report(`drive ${def.name}: truck wedged (gas and reverse both fail)`, `run ${run} t=${(k * Drv.DT).toFixed(1)} at ${(c.x / Drv.K).toFixed(1)},${(c.y / Drv.K).toFixed(1)}`); }
      }
      maxStuck = Math.max(maxStuck, stuck);
      for (const o of G.traffic || []) if (!fin(o.x, o.y)) report(`drive ${def.name}: NaN traffic car`, '');
      if (!fin(G.money)) report(`drive ${def.name}: money NaN`, '');
      if (G.over) { ends++; break; }
    }
  }
  console.log(`drive   ${def.name.padEnd(18)} ${RUNS} random drives, ended ${ends}, crashes ${crashes}, wedged checks ${maxStuck}`);
}
// ---- takraw
for (const def of TL) {
  let ends = 0, goals = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 4000 + run * 61 + def.name.length;
    const G = Tak.load(def), wp = walker(), wm = walker();
    let last = 0;
    for (let k = 0; k < (def.time + 3) / Tak.DT && !G.over; k++) {
      const inp = { pink: wp(k, 0.05), mint: wm(k, 0.05) };
      try { Tak.step(G, inp); } catch (e) { report(`takraw ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      const b = G.ball;
      if (![b.x, b.y, b.vx, b.vy].every(Number.isFinite)) report(`takraw ${def.name}: NaN ball`, `run ${run}`);
      if (b.x < 0 || b.x > Tak.VW || b.y < -150 || b.y > Tak.GROUND + 1) report(`takraw ${def.name}: ball off the court`, `${b.x | 0},${b.y | 0}`);
      for (const p of [G.pink, G.mint]) {
        if (![p.x, p.y, p.vx, p.vy].every(Number.isFinite)) report(`takraw ${def.name}: NaN player`, '');
        if (p.x < 0 || p.x + p.w > Tak.VW || p.y + p.h > Tak.GROUND + 0.01) report(`takraw ${def.name}: player off the court`, `${p.x | 0},${p.y | 0}`);
      }
      if (G.score < last) report(`takraw ${def.name}: score went down`, `${last} -> ${G.score}`);
      last = G.score;
    }
    if (G.over) ends++; else report(`takraw ${def.name}: round never ended`, `run ${run}`);
    goals += G.ev.goals;
  }
  console.log(`takraw  ${def.name.padEnd(18)} ${RUNS} random rounds, ended ${ends}, goals by mashing ${goals}`);
}
// ---- rhythm: random presses on any lane at any time, plus junk and stale online messages
const JUNK = [null, 5, 'x', [null], [[1e9, 1, 0]], [[-3, 2, 5]], [['a', 9, 'q']], [[0, 4, NaN]], [[2, 1, 1e12]], {}, [[1.5, 1, 3]]];
for (const def of ML) {
  let ends = 0, fails = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 5000 + run * 43 + def.name.length;
    const online = run % 2 === 1;
    const G = Rhy.load(def), P = online ? Rhy.load(def) : null;
    if (online) { G.local = 'pink'; P.local = 'mint'; }
    let lastNext = 0, lastScore = 0;
    for (let t = -1; t < G.C.end + 3 && !G.over; t += 1 / 60) {
      try {
        const n = Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const lane = Math.floor(rnd() * 4), tt = t + (rnd() - 0.5) * 0.3;
          if (!online) Rhy.hit(G, lane, tt);
          else if (lane < 2) Rhy.hit(G, lane, tt); else Rhy.hit(P, lane, tt);
        }
        if (online) {
          Rhy.expire(G, t, ['pink']); Rhy.expire(P, t, ['mint']);
          if (rnd() < 0.3) Rhy.merge(G, Rhy.recent(P, 'mint', t - rnd() * 2));           // late and out of order
          if (rnd() < 0.05) Rhy.merge(G, JUNK[Math.floor(rnd() * JUNK.length)]);
          if (rnd() < 0.05) Rhy.merge(G, Rhy.recent(G, 'pink', t));                        // our own results echoed back
        } else Rhy.expire(G, t);
        Rhy.settle(G, t);
      } catch (e) { report(`rhythm ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      if (!fin(G.score, G.energy, G.combo, G.base) || G.energy < 0 || G.energy > 100) report(`rhythm ${def.name}: bad numbers`, `${G.score} ${G.energy}`);
      if (G.next < lastNext || G.score < lastScore) report(`rhythm ${def.name}: went backwards`, `${lastNext}->${G.next} ${lastScore}->${G.score}`);
      if (G.notes.some((n, i) => i < G.next && !n.res)) report(`rhythm ${def.name}: scored past an undecided note`, `run ${run}`);
      if (G.notes.some(n => n.res && !['perfect', 'good', 'ok', 'miss'].includes(n.res))) report(`rhythm ${def.name}: strange result`, '');
      lastNext = G.next; lastScore = G.score;
    }
    if (G.over) ends++; else report(`rhythm ${def.name}: song never ended`, `run ${run}`);
    if (G.failed) fails++;
    if (Rhy.stars(G) > 0) report(`rhythm ${def.name}: random mashing earned a star`, `run ${run} acc ${Rhy.accuracy(G).toFixed(2)}`);
  }
  console.log(`rhythm  ${def.name.padEnd(18)} ${RUNS} random songs (half online with junk messages), ended ${ends}, band fell apart ${fails}`);
}
// ---- tower: random and lazy presses, half the runs online with a lagging guest and junk messages
for (const def of WL) {
  let ends = 0, best = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 6000 + run * 53 + def.name.length;
    const online = run % 2 === 1, G = Twr.load(def, run + 1), U = online ? Twr.load(def, run + 1) : null;
    if (online) { G.net = { role: 'host', local: 'pink' }; U.net = { role: 'guest', local: 'mint' }; }
    let lastScore = 0, lastFloors = 1, q = [], dn = 0, seen = 0, lastReq = null;
    const pr = { pink: 0.004 + rnd() * 0.02, mint: 0.004 + rnd() * 0.02 };
    for (let k = 0; k < 120 * 400 && !G.over; k++) {
      const t = k * Twr.DT;
      try {
        if (!online) Twr.step(G, { pink: { drop: rnd() < pr.pink }, mint: { drop: rnd() < pr.mint } });
        else {
          Twr.step(G, { pink: { drop: rnd() < pr.pink } });
          const req = Twr.guestStep(U, 'mint', rnd() < pr.mint);
          if (req) { dn++; lastReq = req; }
          if (k % 5 === 0) {
            q.push({ at: t + 0.05 + rnd() * 0.3, h: false, m: JSON.parse(JSON.stringify(Twr.encode(G))) });
            const b = U.blk.mint;
            q.push({ at: t + 0.05 + rnd() * 0.3, h: true, m: { x: b ? b.x : null, id: b ? b.id : -1, d: lastReq ? [dn, lastReq.id, lastReq.x, lastReq.t] : null } });
            q.sort((a, b2) => a.at - b2.at);
          }
          if (rnd() < 0.01) Twr.apply(U, [null, {}, { fl: [] }, { fl: [[1, 2, 3, 4, 5, 6]], fb: 1e9 }, { fl: 'x', bk: 5 }][Math.floor(rnd() * 5)], 'mint');
          if (rnd() < 0.01) Twr.dropAt(G, 'mint', rnd() * 2000 - 500, Math.floor(rnd() * 50), rnd() * 100);
          while (q.length && q[0].at <= t) {
            const e = q.shift();
            if (e.h) { if (Number.isFinite(e.m.x)) Twr.remoteX(G, 'mint', e.m.x, e.m.id); if (e.m.d && e.m.d[0] > seen) { seen = e.m.d[0]; Twr.dropAt(G, 'mint', e.m.d[2], e.m.d[1], e.m.d[3]); } }
            else Twr.apply(U, e.m, 'mint');
          }
        }
      } catch (e) { report(`tower ${def.name}: exception ${e.message}`, e.stack.split('\n')[1]); break; }
      const f = G.floors[G.floors.length - 1];
      if (!fin(G.score, G.t, G.swayA, G.lives) || G.lives < 0 || G.lives > Twr.LIVES) report(`tower ${def.name}: bad numbers`, `${G.score} ${G.lives}`);
      if (G.score < lastScore || G.floors.length < lastFloors) report(`tower ${def.name}: went backwards`, '');
      if (G.floors.length > def.top + 1) report(`tower ${def.name}: built past the top`, '');
      if (!(f.pink.a < f.pink.b && f.mint.a < f.mint.b && f.pink.b <= f.mint.a + 1e-6)) report(`tower ${def.name}: halves overlap or vanished`, JSON.stringify(f));
      if (f.pink.a < 0 || f.mint.b > Twr.VW) report(`tower ${def.name}: tower off the screen`, JSON.stringify(f));
      for (const w of ['pink', 'mint']) { const b = G.blk[w]; if (b && (!fin(b.x, b.y, b.w) || b.w < Twr.MIN_W - 1e-6)) report(`tower ${def.name}: strange block`, JSON.stringify(b)); }
      lastScore = G.score; lastFloors = G.floors.length;
    }
    if (G.over) ends++; else report(`tower ${def.name}: never ended`, `run ${run} floors ${G.floors.length - 1}`);
    if (G.won) report(`tower ${def.name}: random presses finished the building`, `run ${run}`);
    best = Math.max(best, Twr.floorsDone(G));
  }
  console.log(`tower   ${def.name.padEnd(18)} ${RUNS} random sites (half online with a lagging guest and junk), ended ${ends}, most floors ${best}`);
}
// ---- three-legged race: random presses on either leg at random moments, half online (late presses, junk snapshots)
for (const def of LL) {
  let ends = 0, fin1 = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 5000 + run * 31 + def.name.length;
    const online = run % 2 === 1, G = Leg.load(def), U = online ? Leg.load(def) : null, q = [];
    const rate = [3, 6, 12][run % 3];
    try {
      for (let k = 0; k < Math.round((def.limit + Leg.START + 2) / Leg.DT) && !G.over; k++) {
        for (const w of ['pink', 'mint']) if (rnd() < rate * Leg.DT) { const leg = rnd() < .5 ? 'in' : 'out'; if (online && w === 'mint') q.push({ at: G.t + 0.05 + rnd() * 0.25, leg, t: G.t }); else Leg.press(G, w, leg, G.t); }
        while (q.length && q[0].at <= G.t) { const p = q.shift(); Leg.press(G, 'mint', p.leg, p.t); }
        Leg.step(G);
        if (online) { Leg.guestStep(U); if (k % 4 === 0) Leg.apply(U, JSON.parse(JSON.stringify(Leg.encode(G)))); if (rnd() < 0.005) Leg.apply(U, [null, 7, 'x', {}, { t: NaN, x: 1e9, st: 'zz' }, { pd: [[[9, 'q']], 5], b: -4 }, { it: [[1, 2]] }, { it: 'no', p: [[NaN, 1e9, 99]] }][Math.floor(rnd() * 8)]); }
        if (!fin(G.x, G.t, G.bal, G.owe) || G.x < 0 || G.x > def.length || G.bal < 0 || G.bal > 1) report(`race ${def.name}: bad numbers`, `${G.x} ${G.bal} ${G.owe}`);
        if (G.pend.pink.length > 2 || G.pend.mint.length > 2) report(`race ${def.name}: press queue grew`, JSON.stringify(G.pend));
        if (online && (!fin(U.x, U.t, U.bal) || U.x > def.length)) report(`race ${def.name}: guest went strange`, `${U.x} ${U.bal}`);
      }
    } catch (e) { report(`race ${def.name}: threw`, e.message); }
    if (G.over) ends++;
    if (G.finished && Leg.stars(G) > 0) fin1++;
  }
  console.log(`race    ${def.name.padEnd(18)} ${RUNS} random races (half online), ended ${ends}, stars by mashing ${fin1}`);
}

// ---- long boat: random strokes either way on either side, half online (late strokes, soft snapshots, junk)
for (const def of BL) {
  let ends = 0, st1 = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 6000 + run * 37 + def.name.length;
    const online = run % 2 === 1, G = Boat.load(def), U = online ? Boat.load(def) : null, q = [];
    const rate = [2, 4, 8][run % 3];
    try {
      for (let k = 0; k < Math.round((def.limit + Boat.START + 2) / Boat.DT) && !G.over; k++) {
        for (const w of ['pink', 'mint']) if (rnd() < rate * Boat.DT) { const kind = rnd() < .75 ? 'fwd' : 'back'; if (online && w === 'mint') q.push({ at: G.t + 0.05 + rnd() * 0.25, kind, t: G.t }); else Boat.press(G, w, kind, G.t); }
        while (q.length && q[0].at <= G.t) { const p = q.shift(); Boat.press(G, 'mint', p.kind, p.t); }
        Boat.step(G);
        if (online) { Boat.guestStep(U); if (k % 4 === 0) Boat.apply(U, JSON.parse(JSON.stringify(Boat.encode(G))), true); if (rnd() < 0.005) Boat.apply(U, [null, 7, 'x', {}, { t: NaN, x: 1e9, st: 'zz' }, { pd: [[[9, 'q']], 5], b: -4 }, { it: [[1, 2]] }, { it: 'no', p: [[NaN, 1e9, 99]] }][Math.floor(rnd() * 8)], rnd() < .5); }
        if (!fin(G.x, G.d, G.h, G.u, G.s, G.w, G.hull) || G.hull < 0 || G.hull > Boat.HULL) report(`boat ${def.name}: bad numbers`, `${G.x} ${G.d} ${G.h} ${G.hull}`);
        const [l, r] = Boat.banks(def, G.d);
        if (G.x < l - 5 || G.x > r + 5) report(`boat ${def.name}: boat on the bank`, `${G.x.toFixed(1)} not in ${l.toFixed(1)}..${r.toFixed(1)} at ${G.d.toFixed(0)}`);
        if (online && !fin(U.x, U.d, U.h, U.hull)) report(`boat ${def.name}: guest went strange`, `${U.x} ${U.d}`);
      }
    } catch (e) { report(`boat ${def.name}: threw`, e.message); }
    if (G.over) ends++;
    if (Boat.stars(G) > 0) st1++;
  }
  console.log(`boat    ${def.name.padEnd(18)} ${RUNS} random paddles (half online), ended ${ends}, stars by mashing ${st1}`);
}

// ---- moving house: random walking, grabbing and letting go, half online (the guest walks itself, late presses, junk)
for (const def of VL) {
  let ends = 0, st1 = 0, lifts = 0, carried = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 7000 + run * 41 + def.name.length;
    const online = run % 2 === 1, G = Mov.load(def), U = online ? Mov.load(def) : null, toHost = [], toGuest = [], rq = { mx: 0, my: 0, act: false, seen: -1 };
    const wp = walker(), wm = walker(), actP = [0.004, 0.012, 0.03][run % 3];
    let presses = 0;
    try {
      for (let k = 0; k < Math.round((def.time + 1) / Mov.DT) && !G.over; k++) {
        const ip = wp(k, actP), im = wm(k, actP);
        // now and then (playing on one machine) both step up to a piece of furniture and lift it, so random pushing
        // also drives carried furniture into walls, doors and other pieces
        if (!online && k % 700 === 350) {
          const big = G.items.map((it, i) => i).filter(i => Mov.KINDS[G.items[i].k].two && G.items[i].st === 'floor');
          if (big.length && G.p.pink.hold < 0 && G.p.mint.hold < 0) {
            const i = big[Math.floor(rnd() * big.length)], it = G.items[i], h0 = Mov.handle(it, 0), h1 = Mov.handle(it, 1);
            if (Mov.spotFree(G, h0[0], h0[1], i) && Mov.spotFree(G, h1[0], h1[1], i)) { G.p.pink.x = h0[0]; G.p.pink.y = h0[1]; G.p.mint.x = h1[0]; G.p.mint.y = h1[1]; ip.act = im.act = true; lifts++; }
          }
        }
        if (!online) Mov.step(G, { pink: ip, mint: im });
        else {
          if (im.act) presses++;
          Mov.guestStep(U, 'mint', im.mx, im.my);
          if (k % 4 === 0) toHost.push({ at: G.t + 0.05 + rnd() * 0.2, m: JSON.parse(JSON.stringify(Mov.guestMsg(U, 'mint', im, presses))) });
          while (toHost.length && toHost[0].at <= G.t) Mov.hostHears(G, 'mint', toHost.shift().m, rq);
          if (rnd() < 0.003) Mov.hostHears(G, 'mint', [null, 7, 'x', {}, { t: NaN, x: 1e9, st: 'zz' }, { pd: [[[9, 'q']], 5], b: -4 }, { it: [[1, 2]] }, { it: 'no', p: [[NaN, 1e9, 99]] }][Math.floor(rnd() * 8)], rq);
          Mov.step(G, { pink: ip, mint: { mx: rq.mx, my: rq.my, act: rq.act } }); rq.act = false;
          if (k % 4 === 0) toGuest.push({ at: G.t + 0.05 + rnd() * 0.2, m: JSON.parse(JSON.stringify(Mov.encode(G))) });
          while (toGuest.length && toGuest[0].at <= G.t) Mov.apply(U, toGuest.shift().m, 'mint');
          if (rnd() < 0.003) Mov.apply(U, [null, 7, 'x', {}, { t: NaN, x: 1e9, st: 'zz' }, { pd: [[[9, 'q']], 5], b: -4 }, { it: [[1, 2]] }, { it: 'no', p: [[NaN, 1e9, 99]] }][Math.floor(rnd() * 8)], 'mint');
        }
        for (const X of online ? [G, U] : [G]) {
          const who = X === G ? 'host' : 'guest';
          for (const w of ['pink', 'mint']) {
            const P = X.p[w];
            if (!fin(P.x, P.y, P.fx, P.fy)) { report(`moving ${def.name}: bad numbers (${who})`, `${w} ${P.x} ${P.y}`); continue; }
            if (P.x < 0 || P.y < 0 || P.x > Mov.W * Mov.T || P.y > Mov.H * Mov.T) report(`moving ${def.name}: ${who} player left the map`, `${w} ${P.x.toFixed(0)},${P.y.toFixed(0)}`);
            if (X === G && Mov.circleHitsWalls(def, P.x, P.y, Mov.PR - 1)) report(`moving ${def.name}: player in a wall`, `${w} ${P.x.toFixed(1)},${P.y.toFixed(1)}`);
          }
        }
        G.items.forEach((it, i) => {
          if (!fin(it.x, it.y, it.a, it.dmg) || it.dmg < 0 || it.dmg > 100) report(`moving ${def.name}: bad item numbers`, JSON.stringify(it));
          else if (Mov.KINDS[it.k].two && (it.st === 'floor' || it.st === 'carried' || it.st === 'placed') && Mov.rectHitsWalls(def, Mov.poly(it))) report(`moving ${def.name}: furniture in a wall`, `${it.k} ${it.st} ${it.x.toFixed(1)},${it.y.toFixed(1)} ${it.a.toFixed(2)}`);
          const holders = ['pink', 'mint'].filter(w => G.p[w].hold === i).length;
          if ((it.st === 'held' && holders !== 1) || (it.st === 'carried' && holders !== 2) || ((it.st === 'floor' || it.st === 'placed') && holders)) report(`moving ${def.name}: who holds what got mixed up`, `${it.k} ${it.st} held by ${holders}`);
        });
        if (G.money < 0 || G.stats.delivered > G.items.length) report(`moving ${def.name}: bad money`, `${G.money} ${G.stats.delivered}`);
        if (G.items.some(it => it.st === 'carried')) carried++;
      }
    } catch (e) { report(`moving ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++;
    if (Mov.stars(G) > 0) st1++;
  }
  console.log(`moving  ${def.name.padEnd(18)} ${RUNS} random crews (half online), ended ${ends}, lifted ${lifts} times, carried for ${(carried * Mov.DT).toFixed(0)} s, stars by mashing ${st1}`);
}

// ---- kite: random running and line work, half online (the guest's half late, soft snapshots, junk)
for (const def of IL) {
  let ends = 0, st1 = 0, downs = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 8000 + run * 43 + def.name.length;
    const online = run % 2 === 1, G = Kite.load(def), U = online ? Kite.load(def) : null, q = [];
    const w = walker(), rate = [0.004, 0.012, 0.03][run % 3];
    let pull = 0, rel = 0, lastScore = 0, until = 0;
    try {
      for (let k = 0; k < Math.round((def.time + Kite.START + 1) / Kite.DT) && !G.over; k++) {
        const a = w(k, rate);
        if (k >= until) { const r = rnd(); pull = r < 0.33 ? 1 : 0; rel = r > 0.6 ? rnd() : 0; until = k + 20 + Math.floor(rnd() * 200); }
        let inp = { run: { mx: a.mx, act: a.act }, line: { pull, rel, act: rnd() < rate } };
        // most runs get the kite up first (run into the wind letting line out), so the random part happens in the air
        if (run % 4 !== 3 && G.t > Kite.START && G.t < Kite.START + 6) inp = { run: { mx: -1 }, line: { rel: 1 } };
        if (!online) Kite.step(G, inp);
        else {
          q.push({ at: G.t + 0.05 + rnd() * 0.2, line: inp.line });
          let late = { pull: 0, rel: 0 }; while (q.length && q[0].at <= G.t) late = q.shift().line;
          Kite.step(G, { run: inp.run, line: G.t < Kite.START + 6 && run % 4 !== 3 ? inp.line : late });
          Kite.step(U, { run: { mx: U.inp.mx }, line: inp.line }, true);
          if (k % 4 === 0) Kite.apply(U, JSON.parse(JSON.stringify(Kite.encode(G))), true);
          if (rnd() < 0.003) Kite.apply(U, [null, 7, 'x', {}, { t: NaN, st: 'zz', k: 'no' }, { L: 1e9, th: -9, k: [1e9, NaN], r: [NaN, 'q'] }, { in: ['a', 9, -3], sc: -5 }, { ra: [1, 'b'], c: 'boom' }][Math.floor(rnd() * 8)], rnd() < .5);
          if (!fin(U.k.x, U.k.y, U.L, U.th, U.run.x) || U.L > def.spool + 1e-6) report(`kite ${def.name}: guest went strange`, `${U.k.x} ${U.k.y} ${U.L}`);
        }
        const K = G.k;
        if (!fin(K.x, K.y, G.L, G.th, G.T, G.score, G.run.x)) report(`kite ${def.name}: bad numbers`, `${K.x} ${K.y} ${G.L} ${G.th}`);
        if (G.L < Kite.LMIN - 1e-6 || G.L > def.spool + 1e-6) report(`kite ${def.name}: line length out of range`, G.L.toFixed(1));
        if (K.y < -1e-6) report(`kite ${def.name}: kite under the ground`, K.y.toFixed(1));
        if (G.run.x < def.field[0] - 1e-6 || G.run.x > def.field[1] + 1e-6) report(`kite ${def.name}: runner left the field`, G.run.x.toFixed(1));
        if (G.score < lastScore - 1e-9) report(`kite ${def.name}: points went down`, `${lastScore} → ${G.score}`);
        lastScore = G.score;
      }
    } catch (e) { report(`kite ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++;
    if (Kite.stars(G) > 0) st1++;
    downs += G.stats.snaps + G.stats.cuts + G.stats.crashes;
  }
  console.log(`kite    ${def.name.padEnd(18)} ${RUNS} random flights (half online), ended ${ends}, came down ${downs} times, stars after a launch and random play ${st1}`);
}

const JUNK2 = [null, 7, 'x', {}, [1, 2], { t: NaN, st: 'zz', x: 1e9 }, { c: ['a', 1e9, 9], tp: [7, 'q', -5], l: ['x', 2], P: 1e9, f: [[1, 'a']], mq: [1, 2, 'sit', 'z'] }, { s: 3, dd: 1.5, ed: 'no', H: [NaN] }];
const junk = () => JUNK2[Math.floor(rnd() * JUNK2.length)];
// ---- cinema: random leaning and popcorn, half online (the guest leans itself, its presses arrive late; junk)
for (const def of CL) {
  let ends = 0, kicked = 0, st1 = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 9000 + run * 37 + def.name.length;
    const online = run % 2 === 1, G = Cin.load(def), U = online ? Cin.load(def) : null, q = [];
    let hold = { pink: false, mint: false }, until = 0, gl = 0, last = 0, lv = 0;
    try {
      for (let k = 0; k < Math.round((def.time + Cin.START + 1) / Cin.DT) && !G.over; k++) {
        if (k >= until) { hold = { pink: rnd() < 0.6, mint: rnd() < 0.6 }; until = k + 10 + Math.floor(rnd() * 150); }
        const inp = { pink: { lean: hold.pink, shield: rnd() < 0.004 }, mint: { lean: hold.mint, shield: rnd() < 0.004 } };
        if (!online) Cin.step(G, inp);
        else {
          gl = Cin.leanStep(gl, hold.mint && U.st === 'run', U);
          Cin.step(U, { mint: { lean: hold.mint, leanV: gl }, pink: { lean: U.held.pink } }, true);
          q.push({ at: G.t + 0.05 + rnd() * 0.2, lv: gl, s: inp.mint.shield });
          let sh = false; while (q.length && q[0].at <= G.t) { const m = q.shift(); lv = m.lv; sh = sh || m.s; }
          Cin.step(G, { pink: inp.pink, mint: { lean: hold.mint, leanV: lv, shield: sh } });
          if (k % 4 === 0) Cin.apply(U, JSON.parse(JSON.stringify(Cin.encode(G))), 'mint');
          if (rnd() < 0.003) Cin.apply(U, junk(), 'mint');
          if (!fin(U.lean.pink, U.lean.mint, U.score, U.t)) report(`cinema ${def.name}: guest went strange`, `${U.lean.pink} ${U.score}`);
        }
        if (!fin(G.lean.pink, G.lean.mint, G.score, G.kiss, G.shield.pink, G.shield.mint) || G.lean.pink < 0 || G.lean.pink > 1 || G.lean.mint < 0 || G.lean.mint > 1) report(`cinema ${def.name}: bad numbers`, `${G.lean.pink} ${G.lean.mint} ${G.score}`);
        if (G.score < 0 || G.strikes > Cin.STRIKES) report(`cinema ${def.name}: score or strikes out of range`, `${G.score} ${G.strikes}`);
        if (G.kissing && !(G.lean.pink >= Cin.KISS_AT && G.lean.mint >= Cin.KISS_AT)) report(`cinema ${def.name}: kissing apart`, `${G.lean.pink} ${G.lean.mint}`);
        last = G.score;
      }
    } catch (e) { report(`cinema ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++; if (G.kicked) kicked++; if (Cin.stars(G) > 0) st1++;
  }
  console.log(`cinema  ${def.name.padEnd(18)} ${RUNS} random showings (half online), ended ${ends}, shown out ${kicked}, stars from random leaning ${st1}`);
}
// ---- no farting: random gas and covers, half online (presses carry their times and arrive late; junk)
for (const def of FL) {
  let ends = 0, ruined = 0, st1 = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 9500 + run * 41 + def.name.length;
    const online = run % 2 === 1, G = Fart.load(def), U = online ? Fart.load(def) : null, q = [];
    let hold = false, until = 0, last = 0;
    try {
      for (let k = 0; k < Math.round((def.time + Fart.START + 1) / Fart.DT) && !G.over; k++) {
        if (k >= until) { hold = rnd() < 0.3; until = k + 10 + Math.floor(rnd() * 200); }
        const t = G.t, inp = { gas: { hold, release: rnd() < 0.006 ? t : null }, cover: { cough: rnd() < 0.006 ? t : null, chair: rnd() < 0.002 ? t : null } };
        if (!online) Fart.step(G, inp);
        else {
          Fart.step(U, { cover: inp.cover }, true);
          for (const kk of ['cough', 'chair']) if (inp.cover[kk] != null) q.push({ at: G.t + 0.05 + rnd() * 0.25, kk, t: inp.cover[kk] });
          const cov = {}; while (q.length && q[0].at <= G.t) { const m = q.shift(); cov[m.kk] = m.t; }
          Fart.step(G, { gas: inp.gas, cover: cov });
          if (k % 4 === 0) Fart.apply(U, JSON.parse(JSON.stringify(Fart.encode(G))), 'cover');
          if (rnd() < 0.003) Fart.apply(U, junk(), rnd() < .5 ? 'cover' : 'gas');
          if (!fin(U.P, U.strain, U.odd, U.score, U.t)) report(`fart ${def.name}: guest went strange`, `${U.P} ${U.score}`);
        }
        if (!fin(G.P, G.strain, G.odd, G.score) || G.P < 0 || G.P > 100 || G.strain < 0 || G.strain > 100 || G.odd < 0 || G.odd > 100) report(`fart ${def.name}: bad numbers`, `${G.P} ${G.strain} ${G.odd}`);
        if (G.score < last) report(`fart ${def.name}: points went down`, `${last} → ${G.score}`);
        last = G.score;
      }
    } catch (e) { report(`fart ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++; if (G.ruined) ruined++; if (Fart.stars(G) > 0) st1++;
  }
  console.log(`fart    ${def.name.padEnd(18)} ${RUNS} random meals (half online), ended ${ends}, ruined ${ruined}, stars from random play ${st1}`);
}
// ---- one blanket: random moving, pulling and slapping, half online (the guest moves itself, soft snapshots; junk)
for (const def of HL) {
  let ends = 0, failed = 0, st1 = 0;
  for (let run = 0; run < RUNS; run++) {
    seed = 9900 + run * 29 + def.name.length;
    const online = run % 2 === 1, G = Bed.load(def), U = online ? Bed.load(def) : null, q = [];
    const wp = walker(), wm = walker(), rate = [0.003, 0.01, 0.03][run % 3];
    let pull = { pink: false, mint: false }, until = 0, last = 0, gi = { mx: 0, pull: false };
    try {
      for (let k = 0; k < Math.round((def.time + Bed.START + 1) / Bed.DT) && !G.over; k++) {
        if (k >= until) { pull = { pink: rnd() < 0.3, mint: rnd() < 0.3 }; until = k + 10 + Math.floor(rnd() * 150); }
        const a = wp(k, rate), b = wm(k, rate), inp = { pink: { mx: a.mx, pull: pull.pink, act: a.act }, mint: { mx: b.mx, pull: pull.mint, act: b.act } };
        if (!online) Bed.step(G, inp);
        else {
          Bed.step(U, { mint: { mx: b.mx, pull: pull.mint }, pink: { mx: 0, pull: U.pull.pink } }, true);
          q.push({ at: G.t + 0.05 + rnd() * 0.2, m: inp.mint });
          let act = false; while (q.length && q[0].at <= G.t) { const m = q.shift().m; gi = { mx: m.mx, pull: m.pull }; act = act || m.act; }
          Bed.step(G, { pink: inp.pink, mint: { mx: gi.mx, pull: gi.pull, act } });
          if (k % 4 === 0) Bed.apply(U, JSON.parse(JSON.stringify(Bed.encode(G))), true);
          if (rnd() < 0.003) Bed.apply(U, junk(), rnd() < .5);
          if (!fin(U.x.pink, U.x.mint, U.c, U.score, U.t)) report(`bed ${def.name}: guest went strange`, `${U.x.pink} ${U.c}`);
        }
        if (!fin(G.x.pink, G.x.mint, G.c, G.H.pink, G.H.mint, G.Z.pink, G.Z.mint, G.score, G.stink)) report(`bed ${def.name}: bad numbers`, `${G.x.pink} ${G.c}`);
        if (G.x.pink < Bed.HB - 1e-6 || G.x.mint > Bed.BW - Bed.HB + 1e-6 || G.x.mint - G.x.pink < Bed.GAP - 1e-6) report(`bed ${def.name}: sleepers out of place`, `${G.x.pink} ${G.x.mint}`);
        if ([G.H.pink, G.H.mint, G.Z.pink, G.Z.mint].some(v => v < 0 || v > 100)) report(`bed ${def.name}: meters out of range`, `${G.H.pink} ${G.Z.pink}`);
        if (G.score < last - 1e-9) report(`bed ${def.name}: points went down`, `${last} → ${G.score}`);
        last = G.score;
      }
    } catch (e) { report(`bed ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++; if (G.failed) failed++; if (Bed.stars(G) > 0) st1++;
  }
  console.log(`bed     ${def.name.padEnd(18)} ${RUNS} random nights (half online), ended ${ends}, ruined ${failed}, stars from random play ${st1}`);
}
// ---- the window: random walking, climbing and sheet work, half online (either side as the guest; junk)
for (const def of NL) {
  let ends = 0, won = 0, st1 = 0;
  const h = Win.her(def);
  for (let run = 0; run < RUNS; run++) {
    seed = 10300 + run * 31 + def.name.length;
    const online = run % 2 === 1, guest = run % 4 === 1 ? 'climb' : 'top', G = Win.load(def), U = online ? Win.load(def) : null, q = [], rq = { seen: -1, mx: 0, my: 0 };
    const w = walker(), rate = [0.003, 0.01, 0.03][run % 3];
    let ty = 0, until = 0, presses = 0;
    try {
      for (let k = 0; k < Math.round((def.time + Win.START + 1) / Win.DT) && !G.over; k++) {
        if (k >= until) { ty = rnd() < 0.5 ? (rnd() < 0.6 ? 1 : -1) : 0; until = k + 10 + Math.floor(rnd() * 200); }
        const a = w(k, rate), inp = { climb: { mx: a.mx, my: rnd() < 0.5 ? -1 : a.my, act: a.act }, top: { my: ty, act: rnd() < rate * 0.3 } };
        if (!online) Win.step(G, inp);
        else {
          const mine = inp[guest], theirs = guest === 'climb' ? 'top' : 'climb';
          if (mine.act) presses++;
          Win.step(U, { [guest]: mine }, true);
          if (k % 4 === 0) q.push({ at: G.t + 0.05 + rnd() * 0.2, m: JSON.parse(JSON.stringify(Win.guestMsg(U, guest, mine, presses))) });
          while (q.length && q[0].at <= G.t) Win.hostHears(G, guest, q.shift().m, rq);
          Win.step(G, { [theirs]: inp[theirs], [guest]: { mx: rq.mx, my: rq.my, act: false } });
          if (k % 4 === 0) Win.apply(U, JSON.parse(JSON.stringify(Win.encode(G))), guest, true);
          if (rnd() < 0.003) { Win.apply(U, junk(), guest, rnd() < .5); Win.hostHears(G, guest, junk(), rq); }
          if (!fin(U.c.x, U.c.y, U.top.len, U.dog, U.t)) report(`window ${def.name}: guest went strange`, `${U.c.x} ${U.c.y}`);
        }
        const C = G.c;
        if (!fin(C.x, C.y, C.stam, G.top.len, G.dog, G.score)) report(`window ${def.name}: bad numbers`, `${C.x} ${C.y} ${G.top.len}`);
        if (C.x < 0 || C.x > Win.W || C.y < 0 || C.y > h.y + 1e-6 || G.top.len < 0 || G.top.len > def.sheet + 1e-6) report(`window ${def.name}: out of range`, `${C.x} ${C.y} ${G.top.len}`);
        if (C.on === 'ground' && C.y !== 0) report(`window ${def.name}: floating on the ground`, `${C.y}`);
        if (C.on === 'sheet' && Math.abs(C.x - h.x) > 1e-6) report(`window ${def.name}: on the sheet away from it`, `${C.x}`);
        if (G.strikes > (def.strikes || Win.STRIKES)) report(`window ${def.name}: too many strikes`, `${G.strikes}`);
      }
    } catch (e) { report(`window ${def.name}: threw`, e.stack.split('\n').slice(0, 2).join(' ')); }
    if (G.over) ends++; if (G.won) won++; if (Win.stars(G) > 0) st1++;
  }
  console.log(`window  ${def.name.padEnd(18)} ${RUNS} random nights (half online), ended ${ends}, got in ${won}, stars from random play ${st1}`);
}

console.log('\n--- findings ---');
for (const [k, v] of found) console.log(`${k}  ×${v.n}  (${v.info})`);
console.log(found.size ? `${found.size} kinds of problem` : 'TOPDOWN FUZZ CLEAN');
process.exit(found.size ? 1 : 0);

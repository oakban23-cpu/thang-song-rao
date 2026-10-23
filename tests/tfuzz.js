// Random play on every kitchen, defense night, driving route, takraw court, song and building site: nothing may throw, go NaN, leave the map,
// sink into walls, duplicate an item, or fail to end the round.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');   // coop/ (dev) or tests/ (repo)
for (const f of ['kitchen', 'klevels', 'defense', 'dlevels', 'drive', 'rlevels', 'takraw', 'tlevels', 'rhythm', 'mlevels', 'tower', 'wlevels']) vm.runInContext(fs.readFileSync(path.join(JS, f + '.js'), 'utf8'), ctx);
vm.runInContext('this.Kit=Kit;this.Def=Def;this.Drv=Drv;this.Tak=Tak;this.KL=KLEVELS;this.DL=DLEVELS;this.RL=RLEVELS;this.TL=TLEVELS;this.Rhy=Rhy;this.ML=MLEVELS;this.Twr=Twr;this.WL=WLEVELS;', ctx);
const { Kit, Def, Drv, Tak, KL, DL, RL, TL, Rhy, ML, Twr, WL } = ctx;
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
console.log('\n--- findings ---');
for (const [k, v] of found) console.log(`${k}  ×${v.n}  (${v.info})`);
console.log(found.size ? `${found.size} kinds of problem` : 'TOPDOWN FUZZ CLEAN');
process.exit(found.size ? 1 : 0);

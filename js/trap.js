/* The trap run (ฝ่ากับดัก). A long path through the jungle and an old temple, seen from above, walked at your own pace.
   Spikes come up out of the floor on a beat (they peek first), arrows fly out of carved faces in the walls, logs and
   boulders roll across the path, fire bars turn, saw blades slide along their tracks, and there is water to fall into.
   Pressure plates hold gates open, or stop a trap, only while someone stands on them: one holds, the other gets
   through, then holds the plate on the far side for the first. Some doors need both levers of a pair pulled at the
   same moment. Whoever is hit falls down where they are and needs the other to come and stand by them to get up; down
   alone for too long, or both down at once, costs a heart and sends them back to the last checkpoint (a row of glowing
   stones). The run ends at the temple gate with both of you on it: points for getting there, for each gem picked up on
   the way, each heart kept and each second to spare, less a little for every fall.
   The map: rows of characters, ROWS tall, a tile T px; x along the path, y across it. */
const Trap = (() => {
  'use strict';
  const DT = 1 / 120, START = 2.5, T = 32, ROWS = 14;
  const R = 11, SPEED = 150, MAXSEP = 860, GAP = 150;
  const REVIVE_R = 40, REVIVE_T = 1.0, DOWN_T = 10, BOTH_T = 1.4, INV_T = 1.6;
  const LEVER_R = 38, LEVER_T = 0.9, GEM_R = 20, WARN = 0.6, DRIFT = 0.3;
  const HEARTS = 3, MAX_HEARTS = 5, GEM_PTS = 50, HEART_PTS = 100, TIME_PTS = 4, FALL_PTS = 40, FINISH_PTS = 500;
  const WALL = '#TR', GATE = 'HIJK', PLATE = '123456789', LEVER = 'uvw', SPIKE = 'abcdefg', WATER = '~o';
  const SHOT = { arrow: 300 }, LOG_W = 76, LOG_H = 22, ROCK_R = 17, SAW_R = 13, FIRE_R = 7;
  const IDS = ['pink', 'mint'], WHY = ['spike', 'water', 'arrow', 'log', 'rock', 'fire', 'saw'], SK = ['arrow', 'log', 'rock'];
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const mod = (a, n) => ((a % n) + n) % n;
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  const tAt = v => Math.floor(v / T);

  function load(def) {
    const W = Math.max(...def.map.map(r => r.length));
    const grid = def.map.map(r => r.padEnd(W, '#').split(''));
    const G = {
      def, W, grid, t: 0, st: 'count', over: false, won: false, failed: false, hearts: def.hearts || HEARTS,
      gems: [], extras: [], levers: [], plates: {}, checks: [], sig: '', gopen: {}, open: {}, cp: -1,
      sc: {}, things: [], shots: [], cv: { pink: 0, mint: 0 }, dn: { pink: 0, mint: 0 }, bothT: 0, score: 0, inT: 0, pend: [],
      stats: { downs: 0, revives: 0, gems: 0, respawns: 0, levers: 0 }, net: null
    };
    const start = {};
    // a gem, a heart or a start lies on grass or on the path, whichever is more of what is round it
    const under = (x, y) => { let g = 0, p = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = (def.map[y + dy] || '')[x + dx]; if (c === ',') g++; else if (c === '.') p++; } return g > p ? ',' : '.'; };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x], cx = (x + .5) * T, cy = (y + .5) * T;
      if (c === '*') { G.gems.push({ x: cx, y: cy, got: false }); grid[y][x] = under(x, y); }
      else if (c === '+') { G.extras.push({ x: cx, y: cy, got: false }); grid[y][x] = under(x, y); }
      else if (c === 'P' || c === 'M') { start[c === 'P' ? 'pink' : 'mint'] = [cx, cy]; grid[y][x] = under(x, y); }
      else if (LEVER.includes(c)) G.levers.push({ id: c, x: cx, y: cy, t: 0 });
      else if (PLATE.includes(c)) (G.plates[c] = G.plates[c] || []).push([x, y]);
    }
    // checkpoints: columns of '!' (left to right)
    for (let x = 0; x < W; x++) { const ys = []; for (let y = 0; y < ROWS; y++) if (grid[y][x] === '!') ys.push(y); if (ys.length) G.checks.push({ tx: x, ty: ys[Math.floor(ys.length / 2)] }); }
    for (const g in def.spikes || {}) G.sc[g] = def.spikes[g].ph || 0;
    G.things = (def.things || []).map(d => ({ d, c: d.ph || 0 }));
    G.start = start;
    G.p = {};
    for (const id of IDS) { const [x, y] = start[id]; G.p[id] = { x, y, st: 'ok', dt: 0, rv: 0, inv: 0, sx: x, sy: y, mv: false, fx: 1, fy: 0, why: '' }; }
    return G;
  }

  /* ---------- the map ---------- */
  const tileAt = (G, tx, ty) => (ty < 0 || ty >= ROWS || tx < 0 || tx >= G.W ? '#' : G.grid[ty][tx]);
  const solid = (G, tx, ty) => { const c = tileAt(G, tx, ty); return WALL.includes(c) || (GATE.includes(c) && !G.gopen[c]); };
  const waterAt = (G, x, y) => WATER.includes(tileAt(G, tAt(x), tAt(y)));
  // a plate's signal (only plates); an opening spec may also name a lever pair that has been opened
  const stopped = (G, spec) => !!spec && [...spec].some(ch => PLATE.includes(ch) && G.sig.includes(ch));
  const active = (G, spec) => !!spec && [...spec].some(ch => (PLATE.includes(ch) ? G.sig.includes(ch) : !!G.open[ch]));
  // spikes of group g: down, peeking (the warning) or up; stopped spikes stay down
  function spikeState(G, g, ahead = 0) {
    const s = G.def.spikes[g]; if (!s || stopped(G, s.stop)) return 'down';
    const p = mod(G.sc[g] + ahead, s.per), d = s.per - s.up - WARN;
    return p < d ? 'down' : p < d + WARN ? 'warn' : 'up';
  }
  const tri = u => { const f = mod(u, 2); return f < 1 ? f : 2 - f; };
  function sawPos(d, c) { const u = tri(c / d.per); return [((d.x0 + (d.x1 - d.x0) * u) + .5) * T, ((d.y0 + (d.y1 - d.y0) * u) + .5) * T]; }
  function firePts(d, a) { const px = (d.x + .5) * T, py = (d.y + .5) * T, L = d.len * T; return [px, py, px + Math.cos(a) * L, py + Math.sin(a) * L]; }
  function segDist(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(x - ax - dx * u, y - ay - dy * u);
  }
  // where a spawner puts a new shot, and how fast it goes
  function spawnOf(d) {
    if (d.k === 'arrow') { const [dx, dy] = DIRS[d.dir]; return { k: 'arrow', x: (d.x + .5) * T + dx * (T / 2 + 2), y: (d.y + .5) * T + dy * (T / 2 + 2), vx: dx * (d.sp || SHOT.arrow), vy: dy * (d.sp || SHOT.arrow) }; }
    const down = d.dir !== 'u', sp = d.sp || 110;
    return { k: d.shape === 'rock' ? 'rock' : 'log', x: (d.x + .5) * T, y: down ? -40 : ROWS * T + 40, vx: 0, vy: down ? sp : -sp };
  }
  function shotHits(s, x, y, r) {
    if (s.k === 'arrow') { const v = Math.hypot(s.vx, s.vy) || 1; return segDist(x, y, s.x, s.y, s.x - s.vx / v * 18, s.y - s.vy / v * 18) < r + 2; }
    if (s.k === 'rock') return Math.hypot(x - s.x, y - s.y) < r + ROCK_R - 2;
    const cx = clamp(x, s.x - LOG_W / 2, s.x + LOG_W / 2), cy = clamp(y, s.y - LOG_H / 2, s.y + LOG_H / 2);
    return Math.hypot(x - cx, y - cy) < r - 2;
  }
  // an arrow flies until its tip meets something solid
  function arrowAlive(G, s) { return s.x > -40 && s.x < G.W * T + 40 && s.y > -40 && s.y < ROWS * T + 40 && !solid(G, tAt(s.x), tAt(s.y)); }
  function arrowAt(G, s, ahead) {
    const n = Math.ceil(ahead / (1 / 30)), e = { k: s.k, x: s.x, y: s.y, vx: s.vx, vy: s.vy };
    for (let i = 0; i < n; i++) { const h = Math.min(1 / 30, ahead - i / 30); e.x += e.vx * h; e.y += e.vy * h; if (!arrowAlive(G, e)) return null; }
    return e;
  }
  /* what would hit someone standing at (x, y) a moment from now (ahead s; signals as they are now): a reason or '' */
  function hazardAt(G, x, y, ahead = 0, r = R) {
    const rr = r - 4;
    for (const ty of [tAt(y - rr), tAt(y + rr)]) for (const tx of [tAt(x - rr), tAt(x + rr)]) {
      const c = tileAt(G, tx, ty); if (SPIKE.includes(c) && spikeState(G, c, ahead) === 'up') return 'spike';
    }
    for (const h of G.things) {
      const d = h.d; if (stopped(G, d.stop)) continue;
      if (d.k === 'fire') { const p = firePts(d, h.c + d.sp * ahead); if (segDist(x, y, p[0], p[1], p[2], p[3]) < r + FIRE_R) return 'fire'; }
      else if (d.k === 'saw') { const [sx, sy] = sawPos(d, h.c + ahead); if (Math.hypot(x - sx, y - sy) < r + SAW_R) return 'saw'; }
      else if (ahead > 0) {
        // shots not fired yet that will be by then
        for (let k = Math.floor(h.c / d.per) + 1; k * d.per <= h.c + ahead; k++) {
          const s = spawnOf(d), age = h.c + ahead - k * d.per;
          let e = s; if (s.k === 'arrow') e = arrowAt(G, s, age); else { e.x += e.vx * age; e.y += e.vy * age; }
          if (e && shotHits(e, x, y, r)) return e.k;
        }
      }
    }
    for (const s of G.shots) {
      let e = s;
      if (ahead > 0) { if (s.k === 'arrow') e = arrowAt(G, s, ahead); else e = { k: s.k, x: s.x + s.vx * ahead, y: s.y + s.vy * ahead, vx: s.vx, vy: s.vy }; }
      if (e && shotHits(e, x, y, r)) return e.k;
    }
    return '';
  }
  const danger = (G, x, y, ahead) => (waterAt(G, x, y) ? 'water' : hazardAt(G, x, y, ahead));

  /* ---------- moving ---------- */
  function collide(G, p) {
    const x0 = tAt(p.x - R), x1 = tAt(p.x + R), y0 = tAt(p.y - R), y1 = tAt(p.y + R);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!solid(G, tx, ty)) continue;
      const cx = clamp(p.x, tx * T, tx * T + T), cy = clamp(p.y, ty * T, ty * T + T), dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > 1e-6) { p.x += dx / d * (R - d); p.y += dy / d * (R - d); }
      else {                                                            // the centre inside the tile: out the nearest side
        const l = p.x - tx * T, rgt = tx * T + T - p.x, u = p.y - ty * T, dn = ty * T + T - p.y, m = Math.min(l, rgt, u, dn);
        if (m === l) p.x = tx * T - R; else if (m === rgt) p.x = tx * T + T + R; else if (m === u) p.y = ty * T - R; else p.y = ty * T + T + R;
      }
    }
  }
  function move(G, id, q) {
    const p = G.p[id]; p.mv = false;
    if (p.st !== 'ok') return;
    let mx = clamp(num(q.mx), -1, 1), my = clamp(num(q.my), -1, 1); const m = Math.hypot(mx, my);
    if (m < .15) return;
    if (m > 1) { mx /= m; my /= m; }
    const o = G.p[other(id)], x0 = p.x, y0 = p.y;
    p.x += mx * SPEED * DT; collide(G, p);
    if (Math.abs(p.x - o.x) > MAXSEP && Math.abs(p.x - o.x) > Math.abs(x0 - o.x)) p.x = x0;   // the two stay on one screen
    p.y += my * SPEED * DT; collide(G, p);
    p.x = clamp(p.x, R, G.W * T - R); p.y = clamp(p.y, R, ROWS * T - R);
    p.mv = Math.hypot(p.x - x0, p.y - y0) > .05;
    if (p.mv) { p.fx = mx; p.fy = my; }
    if (!waterAt(G, p.x, p.y)) { p.sx = p.x; p.sy = p.y; }
  }
  function down(G, id, why, ev) {
    const p = G.p[id]; if (p.st !== 'ok') return;
    p.st = 'down'; p.dt = 0; p.rv = 0; p.why = why;
    if (why === 'water') { p.x = p.sx; p.y = p.sy; }
    G.stats.downs++; ev.push('down:' + id + ':' + why);
  }
  function lose(G, ev) {
    G.hearts--; ev.push('hurt');
    if (G.hearts <= 0 && !G.over) { G.hearts = 0; G.over = true; G.failed = true; ev.push('out'); }
  }
  function respawnAt(G, id) {
    if (G.cp < 0) return G.start[id];
    const c = G.checks[G.cp], y = (c.ty + .5) * T + (id === 'pink' ? -18 : 18);
    return [(c.tx + .5) * T, clamp(y, T + R, (ROWS - 1) * T - R)];
  }
  function respawn(G, id, ev) {
    const p = G.p[id], [x, y] = respawnAt(G, id);
    Object.assign(p, { x, y, sx: x, sy: y, st: 'ok', dt: 0, rv: 0, inv: INV_T, why: '' });
    collide(G, p); G.cv[id]++; G.stats.respawns++; ev.push('respawn:' + id);
  }
  function spawn(G, h, ev) {
    const s = spawnOf(h.d); G.shots.push(s); ev.push('shoot:' + s.k + ':' + Math.round(s.x));
  }
  // the traps move on (spikes keep their beat; a stopped trap waits)
  function advance(G, ev) {
    const def = G.def;
    for (const g in def.spikes || {}) {
      const s = def.spikes[g];
      if (stopped(G, s.stop)) { const p = mod(G.sc[g], s.per), d = s.per - s.up - WARN; if (p > d) G.sc[g] -= p - d; continue; }   // back to just before the warning
      G.sc[g] += DT;
    }
    for (const h of G.things) {
      const d = h.d; if (stopped(G, d.stop)) continue;
      if (d.k === 'fire') h.c += d.sp * DT;
      else if (d.k === 'saw') h.c += DT;
      else { const c0 = h.c; h.c += DT; if (Math.floor(h.c / d.per) !== Math.floor(c0 / d.per)) spawn(G, h, ev); }
    }
    for (const s of G.shots) { s.x += s.vx * DT; s.y += s.vy * DT; }
    G.shots = G.shots.filter(s => (s.k === 'arrow' ? arrowAlive(G, s) : s.y > -60 && s.y < ROWS * T + 60));
  }
  const onTiles = (G, p, ch) => tileAt(G, tAt(p.x), tAt(p.y)) === ch;
  function gateOccupied(G, g) {
    return IDS.some(id => { const p = G.p[id]; for (let ty = tAt(p.y - R); ty <= tAt(p.y + R); ty++) for (let tx = tAt(p.x - R); tx <= tAt(p.x + R); tx++) if (tileAt(G, tx, ty) === g) return true; return false; });
  }

  /* one step. inp = { pink: { mx, my, act, still }, mint: ... } (act: a single press; still: played on another phone,
     so it does not move here). guest: the guest's phone moves its own player and the traps, and judges only its own
     player's hits; the host decides everything shared. remote: on the host, the player on the other phone (its hits
     are judged there and arrive with its messages). */
  function step(G, inp, guest, remote) {
    const ev = G.pend.length ? G.pend.splice(0) : [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    const def = G.def;
    // plates: lit while anybody stands on one (the host's word; the guest hears it)
    if (!guest) {
      let sig = '';
      for (const k of Object.keys(G.plates).sort()) if (G.plates[k].some(([tx, ty]) => IDS.some(id => { const p = G.p[id]; return Math.abs(p.x - (tx + .5) * T) < 17 && Math.abs(p.y - (ty + .5) * T) < 17; }))) sig += k;
      if (sig !== G.sig) { for (const k of sig) if (!G.sig.includes(k)) ev.push('plate:' + k); G.sig = sig; }
    }
    advance(G, ev);
    for (const id of IDS) { const q = inp && inp[id]; if (q && !q.still) move(G, id, q); }
    for (const id of IDS) {
      const q = inp && inp[id], mine = !!q && !q.still;
      if (guest ? !mine : id === remote) continue;
      const p = G.p[id]; if (p.st !== 'ok' || p.inv > 0) continue;
      const why = danger(G, p.x, p.y, 0); if (why) { down(G, id, why, ev); if (guest) G.dn[id]++; }
    }
    for (const id of IDS) { const p = G.p[id]; if (p.inv > 0) p.inv = Math.max(0, p.inv - DT); }
    if (guest) return ev;
    // levers: a pull lasts a moment; all of a pair down at once opens their door for good
    for (const id of IDS) {
      const q = inp && inp[id], p = G.p[id]; if (!q || !q.act || p.st !== 'ok') continue;
      const L = G.levers.filter(l => !G.open[l.id] && Math.hypot(l.x - p.x, l.y - p.y) < LEVER_R).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (L) { L.t = LEVER_T; ev.push('lever:' + L.id); }
    }
    for (const L of G.levers) L.t = Math.max(0, L.t - DT);
    for (const L of G.levers) if (!G.open[L.id] && G.levers.filter(l => l.id === L.id).every(l => l.t > 0)) { G.open[L.id] = true; G.stats.levers++; ev.push('unlock:' + L.id); }
    // gates follow their plates and levers (one closing on somebody waits for them to step out)
    for (const g in def.gates || {}) {
      const want = active(G, def.gates[g]); if (want === !!G.gopen[g]) continue;
      if (!want && gateOccupied(G, g)) continue;
      G.gopen[g] = want; ev.push((want ? 'open:' : 'shut:') + g);
    }
    // gems, extra hearts
    for (const id of IDS) {
      const p = G.p[id]; if (p.st !== 'ok') continue;
      for (const gm of G.gems) if (!gm.got && Math.hypot(gm.x - p.x, gm.y - p.y) < GEM_R) { gm.got = true; G.stats.gems++; ev.push('gem:' + id); }
      for (const hh of G.extras) if (!hh.got && Math.hypot(hh.x - p.x, hh.y - p.y) < GEM_R) { hh.got = true; G.hearts = Math.min(MAX_HEARTS, G.hearts + 1); ev.push('heart:' + id); }
    }
    // checkpoints: reached when either of you passes the row of stones
    for (let i = G.cp + 1; i < G.checks.length; i++) if (IDS.some(id => G.p[id].st === 'ok' && tAt(G.p[id].x) >= G.checks[i].tx)) { G.cp = i; ev.push('check:' + i); }
    // whoever is down: the other standing close helps them up; alone too long, or both down, costs a heart
    for (const id of IDS) {
      const p = G.p[id], o = G.p[other(id)]; if (p.st !== 'down') continue;
      p.dt += DT;
      if (o.st === 'ok' && Math.hypot(o.x - p.x, o.y - p.y) < REVIVE_R) {
        p.rv += DT;
        if (p.rv >= REVIVE_T) { Object.assign(p, { st: 'ok', inv: INV_T, rv: 0, dt: 0, why: '' }); G.cv[id]++; G.stats.revives++; ev.push('revive:' + id); }
      } else p.rv = Math.max(0, p.rv - 2 * DT);
    }
    if (G.p.pink.st === 'down' && G.p.mint.st === 'down') {
      G.bothT += DT;
      if (G.bothT >= BOTH_T) { G.bothT = 0; lose(G, ev); if (!G.over) { respawn(G, 'pink', ev); respawn(G, 'mint', ev); } }
    } else {
      G.bothT = 0;
      for (const id of IDS) if (G.p[id].st === 'down' && G.p[id].dt >= DOWN_T) { lose(G, ev); if (!G.over) respawn(G, id, ev); }
    }
    if (G.over) return ev;
    // the temple gate: both of you on it
    if (IDS.every(id => G.p[id].st === 'ok' && onTiles(G, G.p[id], 'E'))) {
      G.won = true; G.over = true; G.inT = G.t - START;
      G.score = Math.max(0, Math.round(FINISH_PTS + G.stats.gems * GEM_PTS + G.hearts * HEART_PTS + Math.max(0, def.time - G.inT) * TIME_PTS - G.stats.downs * FALL_PTS)); ev.push('win');
      return ev;
    }
    if (G.t - START >= def.time) { G.over = true; G.failed = true; ev.push('time'); }
    return ev;
  }
  function stars(G) { if (!G.won) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  // how far along the path the pair has come, 0..1 (for the little map at the top)
  const progress = (G, id) => clamp(G.p[id].x / (G.W * T), 0, 1);

  /* ---------- online ---------- */
  function encode(G) {
    const pe = p => [r1(p.x), r1(p.y), p.st === 'down' ? 1 : 0, r3(p.dt), r3(p.rv), r3(p.inv), WHY.indexOf(p.why), p.mv ? 1 : 0, r3(p.fx), r3(p.fy)];
    return {
      t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, wn: G.won ? 1 : 0, fl: G.failed ? 1 : 0, h: G.hearts, cp: G.cp, cv: [G.cv.pink, G.cv.mint], dn: [G.dn.pink, G.dn.mint],
      p: [pe(G.p.pink), pe(G.p.mint)], sg: G.sig, go: Object.keys(G.gopen).filter(k => G.gopen[k]).join(''), op: Object.keys(G.open).filter(k => G.open[k]).join(''),
      lv: G.levers.map(l => r3(l.t)), gm: G.gems.map(g => (g.got ? 1 : 0)).join(''), ex: G.extras.map(g => (g.got ? 1 : 0)).join(''),
      sc: Object.keys(G.def.spikes || {}).map(g => r3(G.sc[g])), hz: G.things.map(h => r3(h.c)),
      sh: G.shots.slice(0, 40).map(s => [SK.indexOf(s.k), r1(s.x), r1(s.y), r1(s.vx), r1(s.vy)]),
      bt: r3(G.bothT), it: r3(G.inT), sp: G.score, s: G.stats
    };
  }
  /* the guest takes the host's word for everything but its own player, unless the host moved that one (a revive, a
     respawn: its cv moved on) */
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.won = !!m.wn; G.failed = !!m.fl;
    G.hearts = clamp(num(m.h, G.hearts) | 0, 0, MAX_HEARTS); G.cp = clamp(num(m.cp, G.cp) | 0, -1, G.checks.length - 1);
    if (Array.isArray(m.p) && Array.isArray(m.cv)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id], cv = Number.isInteger(m.cv[i]) ? m.cv[i] : G.cv[id]; if (!Array.isArray(e)) return;
      const take = id !== own || cv !== G.cv[id];
      if (take) {
        p.x = clamp(num(e[0], p.x), 0, G.W * T); p.y = clamp(num(e[1], p.y), 0, ROWS * T); p.st = e[2] ? 'down' : 'ok'; p.why = WHY[e[6]] || '';
        p.inv = clamp(num(e[5], 0), 0, INV_T); p.mv = !!e[7]; p.fx = num(e[8], p.fx); p.fy = num(e[9], p.fy);
        if (!waterAt(G, p.x, p.y)) { p.sx = p.x; p.sy = p.y; }
      }
      p.dt = clamp(num(e[3], 0), 0, 99); p.rv = clamp(num(e[4], 0), 0, REVIVE_T);
      G.cv[id] = cv;
      if (id !== own && Array.isArray(m.dn) && Number.isInteger(m.dn[i])) G.dn[id] = m.dn[i];
    });
    if (typeof m.sg === 'string') G.sig = m.sg.replace(/[^1-9]/g, '');
    if (typeof m.go === 'string') { for (const g of GATE) G.gopen[g] = m.go.includes(g); }
    if (typeof m.op === 'string') { for (const l of LEVER) if (m.op.includes(l)) G.open[l] = true; }
    if (Array.isArray(m.lv)) G.levers.forEach((l, i) => { l.t = clamp(num(m.lv[i], l.t), 0, LEVER_T); });
    if (typeof m.gm === 'string') G.gems.forEach((g, i) => { g.got = m.gm[i] === '1'; });
    if (typeof m.ex === 'string') G.extras.forEach((g, i) => { g.got = m.ex[i] === '1'; });
    // the traps keep their own beat here (the host's word is a moment old by the time it arrives, and taking it every
    // time would make them stutter); only when they have drifted apart does the guest take the host's beat, and its shots
    let resync = !G.synced;
    if (Array.isArray(m.sc)) Object.keys(G.def.spikes || {}).forEach((g, i) => { const v = num(m.sc[i], G.sc[g]); if (Math.abs(v - G.sc[g]) > DRIFT) { G.sc[g] = v; resync = true; } });
    if (Array.isArray(m.hz)) G.things.forEach((h, i) => { const v = num(m.hz[i], h.c); if (Math.abs(v - h.c) > DRIFT * (h.d.k === 'fire' ? Math.abs(h.d.sp) || 1 : 1)) { h.c = v; resync = true; } });
    if (Array.isArray(m.sh) && resync) G.shots = m.sh.filter(a => Array.isArray(a) && SK[a[0]]).map(a => ({ k: SK[a[0]], x: num(a[1]), y: num(a[2]), vx: num(a[3]), vy: num(a[4]) }));
    G.synced = true;
    G.bothT = num(m.bt, G.bothT); G.inT = num(m.it, G.inT); G.score = Math.max(0, num(m.sp, G.score));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  // the guest's message: its stick, its presses, where its player is, and its own falls (judged on its phone)
  function guestMsg(G, own, inp, presses) {
    const r2 = v => Math.round(v * 100) / 100, i = inp || {}, p = G.p[own];
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), a: presses | 0, x: r1(p.x), y: r1(p.y), sx: r1(p.sx), sy: r1(p.sy), mv: p.mv ? 1 : 0, fx: r3(p.fx), fy: r3(p.fy),
      cv: G.cv[own], dn: G.dn[own], w: WHY.indexOf(p.why) };
  }
  /* the host hears the guest (rid: the guest's player). rq = { seen, act } carries between messages; act turns true
     once per new press (the caller clears it after the step). A fall the guest saw goes into G.pend for the next step. */
  function hostHears(G, rid, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx), -1, 1); rq.my = clamp(num(m.my), -1, 1);
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    const p = G.p[rid];
    if (m.cv === G.cv[rid] && Number.isFinite(m.x) && Number.isFinite(m.y)) {
      const x = clamp(m.x, R, G.W * T - R), y = clamp(m.y, R, ROWS * T - R);
      if (Math.hypot(x - p.x, y - p.y) < GAP && !solid(G, tAt(x), tAt(y))) {
        if (p.st === 'ok') { p.x = x; p.y = y; p.mv = !!m.mv; p.fx = num(m.fx, p.fx); p.fy = num(m.fy, p.fy); if (Number.isFinite(m.sx) && !waterAt(G, m.sx, m.sy)) { p.sx = m.sx; p.sy = m.sy; } }
      } else G.cv[rid]++;
    }
    if (Number.isInteger(m.dn) && m.dn > G.dn[rid]) {
      G.dn[rid] = m.dn;
      if (p.st === 'ok' && !G.over && G.st === 'run') { const why = WHY[m.w] || 'spike'; if (why === 'water' && Number.isFinite(m.sx)) { p.sx = m.sx; p.sy = m.sy; } down(G, rid, why, G.pend); }
    }
  }

  return { DT, START, T, ROWS, R, SPEED, MAXSEP, GAP, REVIVE_R, REVIVE_T, DOWN_T, BOTH_T, INV_T, LEVER_R, LEVER_T, GEM_R, WARN, HEARTS, MAX_HEARTS,
    GEM_PTS, HEART_PTS, TIME_PTS, FALL_PTS, FINISH_PTS, WALL, GATE, PLATE, LEVER, SPIKE, WATER, LOG_W, LOG_H, ROCK_R, SAW_R, FIRE_R, DIRS,
    load, tileAt, solid, waterAt, stopped, active, spikeState, sawPos, firePts, segDist, hazardAt, danger, collide, step, stars, progress, respawnAt,
    encode, apply, guestMsg, hostHears };
})();

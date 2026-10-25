/* Stranded (ติดเกาะกับแฟน). The honeymoon boat sank; the two of you washed up on a small island, seen from above, and
   have to last three days (each a day and a night) until a ship comes by, then be seen by it: an SOS of rocks on the
   beach and a fire going. Each of you gets hungry, thirsty and (at night, or wet) cold; at zero you pass out where you
   stand and need the other to come and stand by you. Carry one thing at a time; one button does whatever fits where
   you are: shake a palm (the coconut falls a moment later somewhere close: press as it lands to catch it, or it lands
   on whoever is under it), pick a banana, a flower, a rock, a branch, drink at the spring (not the sea), pounce into a
   tide pool for a fish (they swim away from whoever is near, so one herds and one pounces; now and then it is a crab),
   rub sticks at the fire pit with the other (in turns: the same one twice only makes smoke), add wood, cook a fish,
   put a rock on the SOS, eat, or hand food to the other. The two of you also share how you are getting on (love):
   bonking each other with coconuts or eating alone while the other starves makes it drop, sitting by the fire
   together at night and giving things makes it rise; too low and the one wronged sulks (won't move or help) until the
   other brings a flower or food. Crabs pinch (you run about screaming and drop what you hold), monkeys steal (two can
   corner one; one carrying something is slow enough to catch), rain eats the fire, the tide floods the shore.
   Each day starts from where the last one ended; if it goes badly (both out, one out too long, a breakup, or the last
   ship missed) it costs a heart and the day starts over. Rescued: points for that, for how you are getting on, the
   hearts left and how well fed, watered and warm you are, more for the first ship, less for each time one passed out. The map: COLS x ROWS tiles of T px. */
const Isle = (() => {
  'use strict';
  const DT = 1 / 120, START = 2.5, T = 32, COLS = 30, ROWS = 17, W = COLS * T, H = ROWS * T;
  const R = 12, SPEED = 140, DAY = 120, NIGHT = 60, DAYS = 3, HEARTS = 3;
  const FOOD_D = 0.5, WATER_D = 0.62, COLD = 2.0, WARM_UP = 4, FIRE_R = 84, REACH = 20, PICK_R = 26, GIVE_R = 46;
  const REVIVE_R = 40, REVIVE_T = 1.5, DOWN_T = 25, BOTH_T = 2, INV_T = 1.5, STUN_T = 1.6, PANIC_T = 1.6;
  const SHAKES = 3, FALL_T = 0.9, BONK_R = 18, CATCH_W = 0.35, PALM_REGEN = 40, BUSH_REGEN = 60, FLOWER_REGEN = 15;
  const FUEL_D = 0.55, RAIN_FUEL = 2.2, WOOD_FUEL = 25, LIGHT_FUEL = 15, RUB_GAP = [0.12, 1.0], COOK_T = 2, SICK_T = 15;
  const SULK = 30, SHIP_T = 24, LOVE0 = 60;
  const RESCUE_PTS = 600, LOVE_PTS = 6, HEART_PTS = 100, STAT_PTS = 2, DOWN_PTS = 40, EARLY_PTS = 100, OOPS_PTS = 15;
  const SOLID = '~jTBRDwpCX', IDS = ['pink', 'mint'];
  const FOOD = { coco: { food: 14, water: 25 }, banana: { food: 30, water: 0 }, cooked: { food: 50, water: 0 }, fish: { food: 15, water: 0 } };
  const ITEMS = ['coco', 'banana', 'fish', 'cooked', 'wood', 'rock', 'flower'], WHY = ['food', 'water', 'cold'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  const tAt = v => Math.floor(v / T);
  function rng(G) { let s = G.rs >>> 0 || 1; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; G.rs = s; return s / 4294967296; }

  function load(def) {
    const grid = def.map.map(r => r.padEnd(COLS, '~').slice(0, COLS).split(''));
    const G = {
      def, grid, t: 0, st: 'count', over: false, won: false, failed: false, hearts: def.hearts || HEARTS, day: 1, dt: 0,
      love: def.love || LOVE0, sulk: '', wronged: '', items: [], falls: [], crabs: [], fish: [], palms: [], bushes: [], flowers: [], pools: [],
      fire: { x: 0, y: 0, fuel: def.fuel || 0, lit: false, prog: 0, last: '', lastT: -9 }, pads: [], ship: null, monkey: null, monkeyT: def.monkey || 0,
      driftT: def.drift || 30, rs: def.seed || 7, shipN: 0, score: 0, bothT: 0, snap: null, cv: { pink: 0, mint: 0 }, pend: [], why: '',
      stats: { downs: 0, bonks: 0, catches: 0, fish: 0, pinches: 0, steals: 0, makeups: 0, gifts: 0, selfish: 0, smoke: 0, retries: 0 }
    };
    const start = {}, pads = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = grid[y][x], cx = (x + .5) * T, cy = (y + .5) * T;
      if (c === 'P' || c === 'M') { start[c === 'P' ? 'pink' : 'mint'] = [cx, cy]; grid[y][x] = ','; }
      else if (c === 'T') G.palms.push({ tx: x, ty: y, cocos: 2, shakes: 0, regen: 0, by: '' });
      else if (c === 'B') G.bushes.push({ tx: x, ty: y, fruit: 2, regen: 0 });
      else if (c === 'F') { G.flowers.push({ tx: x, ty: y, has: true, regen: 0 }); grid[y][x] = 'g'; }
      else if (c === 'C') { G.fire.x = cx; G.fire.y = cy; }
      else if ('123'.includes(c)) { (pads[c] = pads[c] || []).push([x, y]); grid[y][x] = ','; }
    }
    G.pads = ['1', '2', '3'].map(k => { const t = pads[k] || [[0, 0]], xs = t.map(a => a[0]), ys = t.map(a => a[1]); return { x0: Math.min(...xs) * T, y0: Math.min(...ys) * T, x1: (Math.max(...xs) + 1) * T, y1: (Math.max(...ys) + 1) * T, n: 0 }; });
    // tide pools: each block of 'p' tiles, with its fish
    const seen = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === 'p' && !seen[x + ',' + y]) {
      let x1 = x, y1 = y; while (grid[y][x1 + 1] === 'p') x1++; while (grid[y1 + 1] && grid[y1 + 1][x] === 'p') y1++;
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen[xx + ',' + yy] = 1;
      const pool = { x0: x * T, y0: y * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, regen: 0 }; G.pools.push(pool);
      for (let k = 0; k < (def.fishes || 2); k++) G.fish.push({ pool: G.pools.length - 1, x: (pool.x0 + pool.x1) / 2 + (k - .5) * 14, y: (pool.y0 + pool.y1) / 2, vx: 20, vy: 10 });
    }
    for (let k = 0; k < (def.crabs || 0); k++) { const s = sandSpot(G); G.crabs.push({ x: s[0], y: s[1], vx: 0, vy: 0, t: 0, ang: 0 }); }
    G.start = start;
    G.p = {};
    for (const id of IDS) { const [x, y] = start[id]; G.p[id] = fresh(x, y); }
    G.snap = snap(G);
    return G;
  }
  const fresh = (x, y) => ({ x, y, st: 'ok', why: '', dt: 0, rv: 0, inv: 0, item: '', food: 100, water: 100, warm: 100, stun: 0, panic: 0, pdx: 0, pdy: 0,
    sick: 0, toot: 3, singe: 0, wet: 0, cook: 0, lock: 0, sulk: false, mv: false, fx: 0, fy: 1, pressT: -9 });
  // a free spot of sand for a crab or a log of driftwood
  function sandSpot(G, wet) {
    for (let k = 0; k < 60; k++) { const x = Math.floor(rng(G) * COLS), y = Math.floor(rng(G) * ROWS), c = G.grid[y][x]; if (wet ? c === '.' : c === ',' || c === '.') return [(x + .5) * T, (y + .5) * T]; }
    return [W / 2, H / 2];
  }

  /* ---------- the map ---------- */
  const tileAt = (G, tx, ty) => (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS ? '~' : G.grid[ty][tx]);
  const solid = (G, tx, ty) => SOLID.includes(tileAt(G, tx, ty));
  const night = G => G.dt >= (G.def.day || DAY);
  const inEvent = (G, list) => (list || []).some(([d, a, len]) => d === G.day && G.dt >= a && G.dt < a + len);
  const raining = G => inEvent(G, G.def.rain);
  const tide = G => inEvent(G, G.def.tide);
  const flooded = (G, x, y) => tide(G) && tileAt(G, tAt(x), tAt(y)) === '.';
  const lastDay = G => G.day >= (G.def.days || DAYS);
  const sosNeed = G => G.def.sos || 4;
  const sosDone = G => G.pads.every(p => p.n >= sosNeed(G));
  const nearFire = (G, p) => G.fire.lit && Math.hypot(p.x - G.fire.x, p.y - G.fire.y) < FIRE_R;
  // the distance from a player to a tile's edge
  function edge(p, tx, ty) { const cx = clamp(p.x, tx * T, tx * T + T), cy = clamp(p.y, ty * T, ty * T + T); return Math.hypot(p.x - cx, p.y - cy); }
  // the nearest tile of these kinds within reach, or null
  function reach(G, p, kinds, ok) {
    let best = null, bd = Infinity;
    for (let ty = tAt(p.y) - 2; ty <= tAt(p.y) + 2; ty++) for (let tx = tAt(p.x) - 2; tx <= tAt(p.x) + 2; tx++) {
      const c = tileAt(G, tx, ty); if (!kinds.includes(c) || (ok && !ok(c, tx, ty))) continue;
      const d = edge(p, tx, ty); if (d >= R + REACH) continue;
      // the one in front counts as nearer
      const dx = (tx + .5) * T - p.x, dy = (ty + .5) * T - p.y, f = d - 10 * Math.max(0, (dx * p.fx + dy * p.fy) / (Math.hypot(dx, dy) || 1));
      if (f < bd) { bd = f; best = { c, tx, ty }; }
    }
    return best;
  }
  const onPad = (G, p) => G.pads.findIndex(q => p.x > q.x0 - 10 && p.x < q.x1 + 10 && p.y > q.y0 - 10 && p.y < q.y1 + 10);

  /* ---------- moving ---------- */
  function collide(G, p) {
    const x0 = tAt(p.x - R), x1 = tAt(p.x + R), y0 = tAt(p.y - R), y1 = tAt(p.y + R);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!solid(G, tx, ty)) continue;
      const cx = clamp(p.x, tx * T, tx * T + T), cy = clamp(p.y, ty * T, ty * T + T), dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > 1e-6) { p.x += dx / d * (R - d); p.y += dy / d * (R - d); }
      else { const l = p.x - tx * T, rg = tx * T + T - p.x, u = p.y - ty * T, dn = ty * T + T - p.y, m = Math.min(l, rg, u, dn); if (m === l) p.x = tx * T - R; else if (m === rg) p.x = tx * T + T + R; else if (m === u) p.y = ty * T - R; else p.y = ty * T + T + R; }
    }
    p.x = clamp(p.x, R, W - R); p.y = clamp(p.y, R, H - R);
  }
  // can this one move about by themselves just now?
  const free = p => p.st === 'ok' && p.stun <= 0 && !p.sulk && p.cook <= 0;
  function move(G, id, q) {
    const p = G.p[id]; p.mv = false;
    if (p.st !== 'ok' || p.stun > 0 || p.sulk || p.cook > 0) return;
    let mx, my;
    if (p.panic > 0) { mx = p.pdx; my = p.pdy; }
    else { mx = clamp(num(q.mx), -1, 1); my = clamp(num(q.my), -1, 1); const m = Math.hypot(mx, my); if (m < .15) return; if (m > 1) { mx /= m; my /= m; } }
    const sp = SPEED * (p.panic > 0 ? 1.3 : 1) * (p.sick > 0 ? .75 : 1) * (flooded(G, p.x, p.y) ? .5 : 1), x0 = p.x, y0 = p.y;
    p.x += mx * sp * DT; collide(G, p); p.y += my * sp * DT; collide(G, p);
    p.mv = Math.hypot(p.x - x0, p.y - y0) > .05;
    if (p.panic <= 0) { p.fx = mx; p.fy = my; }                      // facing where the stick points, even into a wall
  }

  /* ---------- what the button does ---------- */
  // somewhere to put a thing down: here, or the nearest open ground round about (never inside rocks or trees)
  function putAt(G, x, y) {
    const open = (a, b) => !solid(G, tAt(a - 8), tAt(b - 6)) && !solid(G, tAt(a + 8), tAt(b - 6)) && !solid(G, tAt(a - 8), tAt(b + 6)) && !solid(G, tAt(a + 8), tAt(b + 6));
    if (open(x, y)) return [x, y];
    for (let r = 8; r <= 64; r += 8) for (let k = 0; k < 16; k++) { const a = x + Math.cos(k / 8 * Math.PI) * r, b = y + Math.sin(k / 8 * Math.PI) * r; if (open(a, b)) return [a, b]; }
    return [x, y];
  }
  function drop(G, p, ev) { if (!p.item) return; const x = p.x - p.fx * 17, y = p.y - p.fy * 17 + 3, ok = !solid(G, tAt(x), tAt(y)); const [ax, ay] = putAt(G, ok ? x : p.x, ok ? y : p.y); G.items.push({ k: p.item, x: ax, y: ay }); p.item = ''; }
  function eat(G, id, k, ev, from) {
    const p = G.p[id], f = FOOD[k]; p.food = Math.min(100, p.food + f.food); p.water = Math.min(100, p.water + f.water);
    if (k === 'fish') { p.sick = SICK_T; p.toot = 1.5; ev.push('sick:' + id); }
    ev.push('eat:' + id + ':' + k + (from ? ':' + from : ''));
  }
  function setLove(G, d, victim, ev, why) {
    G.love = clamp(G.love + d, 0, 100);
    if (d < 0 && victim) G.wronged = victim;
    if (why) ev.push('love:' + Math.round(d) + ':' + why);
  }
  function act(G, id, ev) {
    const p = G.p[id], o = G.p[other(id)], def = G.def;
    if (!free(p) || p.panic > 0 || p.lock > 0) return;
    p.pressT = G.t;
    const dO = Math.hypot(o.x - p.x, o.y - p.y);
    if (p.item) {
      const food = !!FOOD[p.item];
      // to the other: a peace offering when they sulk, a flower, or food they need more than you
      if (dO < GIVE_R && o.st === 'ok' && (food || p.item === 'flower')) {
        if (o.sulk) { if (food) eat(G, other(id), p.item, ev, id); p.item = ''; o.sulk = false; G.sulk = ''; G.wronged = ''; G.stats.makeups++; setLove(G, Math.max(20, 56 - G.love), '', ev, 'makeup'); ev.push('makeup:' + id); return; }
        if (p.item === 'flower') { p.item = ''; G.stats.gifts++; setLove(G, 8, '', ev, 'flower'); ev.push('flower:' + id); return; }
        if (o.food < p.food - 10 || (FOOD[p.item].water && o.water < p.water - 10)) { const k = p.item; p.item = ''; eat(G, other(id), k, ev, id); G.stats.gifts++; setLove(G, 5, '', ev, 'give'); return; }
      }
      const fire = reach(G, p, 'C');
      if (fire && p.item === 'wood') { p.item = ''; G.fire.fuel = Math.min(100, G.fire.fuel + WOOD_FUEL); ev.push('wood:' + id); p.lock = .3; return; }
      if (fire && p.item === 'fish' && G.fire.lit) { p.cook = COOK_T; ev.push('cook:' + id); return; }
      const pad = onPad(G, p);
      if (pad >= 0 && p.item === 'rock' && G.pads[pad].n < sosNeed(G)) { p.item = ''; G.pads[pad].n++; ev.push('sos:' + pad + ':' + G.pads[pad].n); p.lock = .3; return; }
      if (food) {
        // eating while the other is far hungrier: they will hear of it
        const k = p.item; p.item = ''; eat(G, id, k, ev);
        if (o.st === 'ok' && o.food < p.food - FOOD[k].food - 25) { G.stats.selfish++; setLove(G, -12, other(id), ev, 'selfish'); ev.push('selfish:' + id); }
        p.lock = .5; return;
      }
      drop(G, p, ev); ev.push('drop:' + id); return;
    }
    // empty hands: pick up what lies close, else whatever is in reach
    let gi = -1, gd = PICK_R;
    // what lies in front (or right underfoot): not what was just put down behind
    G.items.forEach((it, i) => { const dx = it.x - p.x, dy = it.y - p.y, d = Math.hypot(dx, dy); if (d < PICK_R && (d < 12 || dx * p.fx + dy * p.fy > 0) && d < gd) { gd = d; gi = i; } });
    if (gi >= 0) { p.item = G.items[gi].k; G.items.splice(gi, 1); ev.push('pick:' + id + ':' + p.item); return; }
    // a palm or a bush with something on it before a bare one
    const t = reach(G, p, 'TB', (c, x, y) => (c === 'T' ? G.palms.some(q => q.tx === x && q.ty === y && q.cocos > 0) : G.bushes.some(q => q.tx === x && q.ty === y && q.fruit > 0))) || reach(G, p, 'RDwpC~') || reach(G, p, 'TB');
    const fl = G.flowers.find(f => f.has && edge(p, f.tx, f.ty) < 4);
    if (fl) { fl.has = false; fl.regen = FLOWER_REGEN; p.item = 'flower'; ev.push('pick:' + id + ':flower'); return; }
    if (!t) return;
    if (t.c === 'T') {
      const pm = G.palms.find(q => q.tx === t.tx && q.ty === t.ty);
      p.lock = .35; ev.push('shake:' + id);
      if (pm.cocos <= 0) { ev.push('empty:' + id); return; }
      if (++pm.shakes >= SHAKES) {
        pm.shakes = 0; pm.cocos--; pm.regen = pm.regen || def.palmRegen || PALM_REGEN;
        const cx = (pm.tx + .5) * T, cy = (pm.ty + .5) * T; let spot = null;
        for (let k = 0; k < 12 && !spot; k++) { const a = rng(G) * Math.PI * 2, d = 24 + rng(G) * 22, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (!solid(G, tAt(x), tAt(y)) && !solid(G, tAt(x - 8), tAt(y)) && !solid(G, tAt(x + 8), tAt(y))) spot = [x, y]; }
        if (!spot) spot = [p.x, p.y];
        G.falls.push({ x: spot[0], y: spot[1], t: FALL_T, by: id }); ev.push('fall:' + Math.round(spot[0]) + ':' + Math.round(spot[1]));
      }
    } else if (t.c === 'B') {
      const b = G.bushes.find(q => q.tx === t.tx && q.ty === t.ty);
      if (b.fruit > 0) { b.fruit--; b.regen = b.regen || G.def.bushRegen || BUSH_REGEN; p.item = 'banana'; ev.push('pick:' + id + ':banana'); } else ev.push('empty:' + id);
    } else if (t.c === 'R') { p.item = 'rock'; p.lock = .4; ev.push('pick:' + id + ':rock'); }
    else if (t.c === 'D') { p.item = 'wood'; p.lock = .6; ev.push('pick:' + id + ':wood'); }
    else if (t.c === 'w') { p.water = Math.min(100, p.water + 40); p.lock = .7; ev.push('drink:' + id); }
    else if (t.c === '~') { p.water = Math.max(0, p.water - 3); p.stun = .8; ev.push('salty:' + id); }
    else if (t.c === 'p') {
      // pounce: at the edge of the pool nearest you
      const pl = G.pools.find(q => t.tx * T >= q.x0 && t.tx * T < q.x1 && t.ty * T >= q.y0 && t.ty * T < q.y1), px = clamp(p.x, pl.x0 + 8, pl.x1 - 8), py = clamp(p.y, pl.y0 + 8, pl.y1 - 8);
      const fi = G.fish.findIndex(f => G.pools[f.pool] === pl && Math.hypot(f.x - px, f.y - py) < 24);
      p.lock = .6; p.wet = 4;
      if (fi >= 0) { G.fish.splice(fi, 1); pl.regen = pl.regen || 20; p.item = 'fish'; G.stats.fish++; ev.push('fish:' + id); }
      else if (rng(G) < (G.def.poolCrab || 0)) pinch(G, id, ev);
      else ev.push('splash:' + id);
      // the splash scatters them
      for (const f of G.fish) if (G.pools[f.pool] === pl) { const dx = f.x - px, dy = f.y - py, d = Math.hypot(dx, dy) || 1; if (d < 50) { f.vx = dx / d * 70; f.vy = dy / d * 70; } }
    } else if (t.c === 'C') {
      const f = G.fire;
      if (f.lit) { ev.push('warm:' + id); return; }
      if (f.fuel < LIGHT_FUEL) { ev.push('nowood:' + id); return; }
      // rubbing sticks: in turns, quick enough; the same one twice only makes smoke
      const gap = G.t - f.lastT;
      if (f.last && f.last !== id && gap >= RUB_GAP[0] && gap <= RUB_GAP[1]) f.prog += 14;
      else if (f.last === id && gap < RUB_GAP[1]) { f.prog = Math.max(0, f.prog - 8); G.stats.smoke++; setLove(G, -2, other(id), ev); ev.push('smoke:' + id); }
      else f.prog += 4;
      f.last = id; f.lastT = G.t; ev.push('rub:' + id);
      if (f.prog >= 100) { f.lit = true; f.prog = 0; f.last = ''; ev.push('lit'); if (rng(G) < .15) { p.singe = 8; ev.push('singe:' + id); } }
    }
  }
  function pinch(G, id, ev) {
    const p = G.p[id]; if (p.st !== 'ok' || p.inv > 0 || p.panic > 0) return;
    drop(G, p, ev); p.panic = PANIC_T; p.cook = 0; const a = rng(G) * Math.PI * 2; p.pdx = Math.cos(a); p.pdy = Math.sin(a); p.inv = PANIC_T + INV_T; G.stats.pinches++; ev.push('pinch:' + id);
  }
  function down(G, id, why, ev) {
    const p = G.p[id]; if (p.st !== 'ok') return;
    drop(G, p, ev); Object.assign(p, { st: 'down', why, dt: 0, rv: 0, panic: 0, cook: 0, sulk: false });
    if (G.sulk === id) G.sulk = '';
    G.stats.downs++; ev.push('down:' + id + ':' + why); setLove(G, -4, id, ev, 'down');
  }

  /* ---------- the day as it was at dawn (to start it over) ---------- */
  function snap(G) {
    return JSON.stringify({ p: G.p, love: G.love, items: G.items, palms: G.palms, bushes: G.bushes, flowers: G.flowers, fish: G.fish, pools: G.pools, crabs: G.crabs, fire: G.fire, pads: G.pads, monkeyT: G.monkeyT, driftT: G.driftT, rs: G.rs });
  }
  function restore(G, ev, why) {
    const s = JSON.parse(G.snap);
    Object.assign(G, { p: s.p, love: Math.max(s.love, 40), items: s.items, palms: s.palms, bushes: s.bushes, flowers: s.flowers, fish: s.fish, pools: s.pools, crabs: s.crabs, fire: s.fire, pads: s.pads, monkeyT: s.monkeyT, driftT: s.driftT, rs: s.rs });
    G.dt = 0; G.falls = []; G.monkey = null; G.ship = null; G.shipN = 0; G.sulk = ''; G.wronged = ''; G.bothT = 0;
    for (const id of IDS) { G.p[id].inv = INV_T; G.cv[id]++; }
    G.hearts--; G.stats.retries++; ev.push('retry:' + why);
    if (G.hearts <= 0) { G.hearts = 0; G.over = true; G.failed = true; G.why = why; ev.push('out:' + why); }
  }

  /* ---------- the island going on: palms, fish, crabs, monkeys, driftwood, the fire, ships ---------- */
  function world(G, ev) {
    const def = G.def;
    const pr = def.palmRegen || PALM_REGEN, br = def.bushRegen || BUSH_REGEN;
    for (const pm of G.palms) if (pm.cocos < 2 && (pm.regen -= DT) <= 0) { pm.cocos++; pm.regen = pm.cocos < 2 ? pr : 0; }
    for (const b of G.bushes) if (b.fruit < 2 && (b.regen -= DT) <= 0) { b.fruit++; b.regen = b.fruit < 2 ? br : 0; }
    for (const f of G.flowers) if (!f.has && (f.regen -= DT) <= 0) f.has = true;
    // coconuts falling
    for (const c of G.falls) {
      c.t -= DT; if (c.t > 0) continue;
      let caught = '';
      for (const id of IDS) { const p = G.p[id]; if (free(p) && !p.item && p.panic <= 0 && Math.hypot(p.x - c.x, p.y - c.y) < BONK_R + 6 && G.t - p.pressT < CATCH_W) caught = id; }
      if (caught) { G.p[caught].item = 'coco'; G.stats.catches++; ev.push('catch:' + caught); if (caught !== c.by) setLove(G, 3, '', ev, 'catch'); continue; }
      for (const id of IDS) {
        const p = G.p[id]; if (p.st !== 'ok' || Math.hypot(p.x - c.x, p.y - c.y) >= BONK_R) continue;
        drop(G, p, ev); p.stun = STUN_T; p.cook = 0; G.stats.bonks++; ev.push('bonk:' + id + ':' + c.by);
        if (id !== c.by) setLove(G, -10, id, ev, 'bonk');
      }
      { const [ax, ay] = putAt(G, c.x, c.y); G.items.push({ k: 'coco', x: ax, y: ay }); } ev.push('land:' + Math.round(c.x) + ':' + Math.round(c.y));
    }
    G.falls = G.falls.filter(c => c.t > 0);
    // fish: wander, and swim away from whoever is close
    for (const pl of G.pools) if (pl.regen > 0 && (pl.regen -= DT) <= 0) { const i = G.pools.indexOf(pl); if (G.fish.filter(f => f.pool === i).length < (def.fishes || 2)) G.fish.push({ pool: i, x: (pl.x0 + pl.x1) / 2, y: (pl.y0 + pl.y1) / 2, vx: 0, vy: 0 }); pl.regen = G.fish.filter(f => f.pool === i).length < (def.fishes || 2) ? 20 : 0; }
    for (const f of G.fish) {
      const pl = G.pools[f.pool];
      if (rng(G) < DT * 1.5) { const a = rng(G) * Math.PI * 2; f.vx = Math.cos(a) * 30; f.vy = Math.sin(a) * 30; }
      let ax = 0, ay = 0;
      // (only whoever moves about by the pool scares them; someone standing still they come close to)
      for (const id of IDS) { const p = G.p[id], dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy); if (p.st === 'ok' && p.mv && d < 90) { ax += dx / (d || 1) * (90 - d) * 2.4; ay += dy / (d || 1) * (90 - d) * 2.4; } }
      f.x = clamp(f.x + (f.vx + ax) * DT, pl.x0 + 6, pl.x1 - 6); f.y = clamp(f.y + (f.vy + ay) * DT, pl.y0 + 6, pl.y1 - 6);
    }
    // crabs: sidle about the sand; walking into one is a pinch
    for (const c of G.crabs) {
      c.t -= DT; if (c.t <= 0) { c.t = 1 + rng(G) * 2; const a = rng(G) * Math.PI * 2, sp = rng(G) < .3 ? 0 : 38; c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp * .5; }
      const nx = c.x + c.vx * DT, ny = c.y + c.vy * DT, k = tileAt(G, tAt(nx), tAt(ny));
      if (k === ',' || k === '.') { c.x = nx; c.y = ny; } else c.t = 0;
      for (const id of IDS) { const p = G.p[id]; if (p.st === 'ok' && Math.hypot(p.x - c.x, p.y - c.y) < R + 9) pinch(G, id, ev); }
    }
    // driftwood washes up now and then
    if (def.drift && (G.driftT -= DT) <= 0) { G.driftT = def.drift; if (G.items.filter(i => i.k === 'wood').length < 3) { const s = sandSpot(G, true); G.items.push({ k: 'wood', x: s[0], y: s[1] }); ev.push('drift'); } }
    // the tide takes what lies on the wet sand
    if (tide(G)) { const n = G.items.length; G.items = G.items.filter(i => tileAt(G, tAt(i.x), tAt(i.y)) !== '.'); if (G.items.length < n) ev.push('washed'); }
    // a monkey: comes out of the jungle for something lying about or a rock off the SOS, and runs back with it
    if (def.monkey) monkeyStep(G, ev);
    // the fire burns down (fast in the rain)
    const f = G.fire;
    f.prog = Math.max(0, f.prog - 6 * DT);
    if (f.lit) { f.fuel = Math.max(0, f.fuel - (raining(G) ? RAIN_FUEL : FUEL_D) * DT); if (f.fuel <= 0) { f.lit = false; ev.push('fireout'); if (night(G)) setLove(G, -4, '', ev, 'cold'); } }
    // ships, on the last day: seen if the SOS is done and the fire is going
    const ships = def.ships || [50, 95];
    if (lastDay(G) && !G.ship && G.shipN < ships.length && G.dt >= ships[G.shipN]) { G.shipN++; G.ship = { x: -80, t: 0 }; ev.push('ship'); }
    if (G.ship) {
      G.ship.t += DT; G.ship.x = -80 + (W + 160) * G.ship.t / SHIP_T;
      if (sosDone(G) && f.lit && G.ship.t > 3) { rescue(G, ev); return; }
      if (G.ship.t >= SHIP_T) { G.ship = null; ev.push('shipgone'); }
    }
  }
  function monkeyStep(G, ev) {
    const def = G.def, m = G.monkey;
    if (!m) {
      if ((G.monkeyT -= DT) > 0) return;
      G.monkeyT = def.monkey * (0.8 + rng(G) * 0.4);
      const ins = def.jungle || []; if (!ins.length) return;
      const [ex, ey] = ins[Math.floor(rng(G) * ins.length)], x = (ex + .5) * T, y = (ey + .5) * T;
      // what to take: food lying about first, then anything lying about, then a rock off the SOS
      let tgt = null, bd = 1e9;
      G.items.forEach((it, i) => { const d = Math.hypot(it.x - x, it.y - y) * (FOOD[it.k] ? .5 : 1); if (d < bd) { bd = d; tgt = { i: -1, x: it.x, y: it.y }; } });
      if (!tgt) { const pi = G.pads.findIndex(p => p.n > 0); if (pi >= 0) { const p = G.pads[pi]; tgt = { pad: pi, x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 }; } }
      if (!tgt) return;
      G.monkey = { x, y, hx: x, hy: y, st: 'in', tx: tgt.x, ty: tgt.y, pad: tgt.pad == null ? -1 : tgt.pad, item: '', t: 0 }; ev.push('monkey');
      return;
    }
    m.t += DT;
    const sp = m.st === 'in' ? 120 : m.st === 'run' ? (m.item ? 95 : 170) : 0;
    const go = (tx, ty) => { const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy); if (d < 2) return true; m.x += dx / d * Math.min(d, sp * DT); m.y += dy / d * Math.min(d, sp * DT); return false; };
    const near = IDS.find(id => { const p = G.p[id]; return p.st === 'ok' && p.stun <= 0 && Math.hypot(p.x - m.x, p.y - m.y) < R + 14; });
    if (near && m.st !== 'gone') {
      if (m.item) { const [ax, ay] = putAt(G, m.x, m.y); G.items.push({ k: m.item, x: ax, y: ay }); m.item = ''; ev.push('monkeydrop:' + near); }
      else if (m.st === 'in') ev.push('shoo:' + near);
      m.st = 'run';
    }
    if (m.st === 'in') {
      // the thing may have been picked up meanwhile: then the nearest other thing, or home
      if (m.pad < 0 && !G.items.some(it => Math.hypot(it.x - m.tx, it.y - m.ty) < 4)) { const it = G.items[0]; if (it) { m.tx = it.x; m.ty = it.y; } else m.st = 'run'; }
      if (m.st === 'in' && go(m.tx, m.ty)) {
        if (m.pad >= 0) { const p = G.pads[m.pad]; if (p.n > 0) { p.n--; m.item = 'rock'; G.stats.steals++; ev.push('steal:rock:' + m.pad); } }
        else { const i = G.items.findIndex(it => Math.hypot(it.x - m.x, it.y - m.y) < 6); if (i >= 0) { m.item = G.items[i].k; G.items.splice(i, 1); G.stats.steals++; ev.push('steal:' + m.item); } }
        m.st = 'run';
      }
    } else if (m.st === 'run' && go(m.hx, m.hy)) { if (m.item) ev.push('gone:' + m.item); G.monkey = null; }
  }
  function rescue(G, ev) {
    G.won = true; G.over = true;
    const avg = IDS.reduce((s, id) => s + (G.p[id].food + G.p[id].water + G.p[id].warm) / 3, 0) / 2;
    G.early = G.shipN === 1;
    G.score = Math.max(0, Math.round(RESCUE_PTS + G.love * LOVE_PTS + G.hearts * HEART_PTS + avg * STAT_PTS - G.stats.downs * DOWN_PTS - (G.stats.bonks + G.stats.pinches + G.stats.smoke + G.stats.selfish) * OOPS_PTS + (G.early ? EARLY_PTS : 0)));
    ev.push('rescued');
  }

  /* one step. inp = { pink: { mx, my, act, still }, mint: ... }. guest: the guest's phone walks its own player only (the
     host decides everything else); remote: on the host, the player on the other phone (moved by its messages). */
  function step(G, inp, guest, remote) {
    const ev = G.pend.length ? G.pend.splice(0) : [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    for (const id of IDS) { const q = (inp && inp[id]) || (G.p[id].panic > 0 ? {} : null); if (q && !q.still) move(G, id, q); }   // (panic runs by itself)
    if (guest) return ev;
    const def = G.def, dayLen = def.day || DAY, was = night(G), n = def.need || 1;
    G.dt += DT;
    if (!was && night(G)) ev.push('dusk');
    if (G.dt >= dayLen + (def.night || NIGHT)) {
      // dawn: the day is over; a new one starts from here (the last day ends with a ship, or not at all)
      if (lastDay(G)) { restore(G, ev, 'ship'); return ev; }
      G.day++; G.dt = 0; G.snap = snap(G); ev.push('dawn:' + G.day);
    }
    for (const id of IDS) { const q = inp && inp[id]; if (q && q.act && !q.still) act(G, id, ev); }
    world(G, ev); if (G.over) return ev;
    const nt = night(G), rain = raining(G);
    for (const id of IDS) {
      const p = G.p[id];
      for (const k of ['stun', 'panic', 'inv', 'lock', 'singe', 'wet']) if (p[k] > 0) p[k] = Math.max(0, p[k] - DT);
      if (p.cook > 0 && (p.cook -= DT) <= 0) { p.cook = 0; if (p.item === 'fish') { p.item = 'cooked'; ev.push('cooked:' + id); } }
      if (p.panic > 0 && rng(G) < DT * 3) { const a = rng(G) * Math.PI * 2; p.pdx = Math.cos(a); p.pdy = Math.sin(a); }
      if (p.sick > 0) { p.sick = Math.max(0, p.sick - DT); if ((p.toot -= DT) <= 0) { p.toot = 2.5 + rng(G) * 2; ev.push('toot:' + id); } }
      if (p.st !== 'ok') continue;
      if (rain || flooded(G, p.x, p.y)) p.wet = Math.max(p.wet, 2);
      const slow = nt ? .6 : 1;
      p.food = Math.max(0, p.food - FOOD_D * n * slow * DT); p.water = Math.max(0, p.water - WATER_D * n * slow * DT);
      if (nearFire(G, p)) p.warm = Math.min(100, p.warm + WARM_UP * DT);
      else if (nt) p.warm = Math.max(0, p.warm - COLD * (def.cold || 1) * (p.wet > 0 ? 1.4 : 1) * DT);
      else if (p.wet > 0) p.warm = Math.max(0, p.warm - .5 * DT);
      else p.warm = Math.min(100, p.warm + 2 * DT);
      if (p.food <= 0) down(G, id, 'food', ev); else if (p.water <= 0) down(G, id, 'water', ev); else if (p.warm <= 0) down(G, id, 'cold', ev);
    }
    // how you are getting on: by the fire together at night, close by day; apart, it slowly cools
    const a = G.p.pink, b = G.p.mint, apart = Math.hypot(a.x - b.x, a.y - b.y);
    if (a.st === 'ok' && b.st === 'ok') {
      if (nt && nearFire(G, a) && nearFire(G, b)) G.love = Math.min(100, G.love + .25 * DT);
      else if (!G.sulk) G.love = Math.max(0, G.love - ((nt ? .03 : .06) + (apart > 420 ? .06 : 0)) * DT);
    }
    if (!G.sulk && G.love < SULK && a.st === 'ok' && b.st === 'ok') {
      const id = G.wronged || (a.food < b.food ? 'pink' : 'mint'), p = G.p[id];
      drop(G, p, ev); p.sulk = true; p.cook = 0; G.sulk = id; ev.push('sulk:' + id);
    }
    if (G.love <= 0) { restore(G, ev, 'love'); return ev; }
    // whoever is down: the other standing close helps them up; down alone too long, or both, and the day is lost
    for (const id of IDS) {
      const p = G.p[id], o = G.p[other(id)]; if (p.st !== 'down') continue;
      p.dt += DT;
      if (o.st === 'ok' && !o.sulk && Math.hypot(o.x - p.x, o.y - p.y) < REVIVE_R) {
        p.rv += DT;
        if (p.rv >= REVIVE_T) {
          Object.assign(p, { st: 'ok', why: '', dt: 0, rv: 0, inv: INV_T }); p.food = Math.max(p.food, 35); p.water = Math.max(p.water, 35); p.warm = Math.max(p.warm, 35);
          G.cv[id]++; setLove(G, 4, '', ev, 'revive'); ev.push('revive:' + id);
        }
      } else p.rv = Math.max(0, p.rv - 2 * DT);
    }
    if (a.st === 'down' && b.st === 'down') { if ((G.bothT += DT) >= BOTH_T) { restore(G, ev, 'down'); return ev; } }
    else { G.bothT = 0; for (const id of IDS) if (G.p[id].st === 'down' && G.p[id].dt >= DOWN_T) { restore(G, ev, 'down'); return ev; } }
    return ev;
  }
  function stars(G) { if (!G.won) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  // the clock for the box at the top: day, how far through it, night or not
  const clock = G => ({ day: G.day, days: G.def.days || DAYS, t: G.dt, len: (G.def.day || DAY) + (G.def.night || NIGHT), dayLen: G.def.day || DAY, night: night(G) });

  /* ---------- online ---------- */
  const IT = k => ITEMS.indexOf(k);
  function encode(G) {
    const pe = p => [r1(p.x), r1(p.y), p.st === 'down' ? 1 : 0, WHY.indexOf(p.why), r2(p.dt), r2(p.rv), r2(p.inv), IT(p.item), r1(p.food), r1(p.water), r1(p.warm), r2(p.stun), r2(p.panic), r2(p.pdx), r2(p.pdy),
      r1(p.sick), r1(p.singe), r1(p.wet), r2(p.cook), p.sulk ? 1 : 0, p.mv ? 1 : 0, r2(p.fx), r2(p.fy)];
    const f = G.fire, m = G.monkey;
    return {
      t: r2(G.t), st: G.st, ov: G.over ? 1 : 0, wn: G.won ? 1 : 0, fl: G.failed ? 1 : 0, h: G.hearts, d: G.day, dt: r2(G.dt), lv: r1(G.love), su: G.sulk, cv: [G.cv.pink, G.cv.mint], p: [pe(G.p.pink), pe(G.p.mint)],
      it: G.items.slice(0, 40).map(i => [IT(i.k), r1(i.x), r1(i.y)]), fa: G.falls.map(c => [r1(c.x), r1(c.y), r2(c.t)]), cr: G.crabs.map(c => [r1(c.x), r1(c.y), r1(c.vx)]),
      fs: G.fish.map(q => [q.pool, r1(q.x), r1(q.y)]), pm: G.palms.map(q => q.cocos * 10 + q.shakes).join(','), bu: G.bushes.map(q => q.fruit).join(''), fw: G.flowers.map(q => (q.has ? 1 : 0)).join(''),
      fi: [r1(f.fuel), f.lit ? 1 : 0, r1(f.prog)], pd: G.pads.map(q => q.n), sh: G.ship ? r2(G.ship.t) : -1,
      mk: m ? [r1(m.x), r1(m.y), ['in', 'run'].indexOf(m.st), IT(m.item)] : 0, sc: G.score, s: G.stats, why: G.why
    };
  }
  /* the guest takes the host's word for everything; its own player's place only when the host moved it (cv) */
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.won = !!m.wn; G.failed = !!m.fl;
    G.hearts = clamp(num(m.h, G.hearts) | 0, 0, 9); G.day = clamp(num(m.d, G.day) | 0, 1, 9); G.dt = num(m.dt, G.dt); G.love = clamp(num(m.lv, G.love), 0, 100);
    G.sulk = IDS.includes(m.su) ? m.su : ''; G.why = typeof m.why === 'string' ? m.why.slice(0, 8) : '';
    if (Array.isArray(m.p) && Array.isArray(m.cv)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id], cv = Number.isInteger(m.cv[i]) ? m.cv[i] : G.cv[id]; if (!Array.isArray(e)) return;
      if (id !== own || cv !== G.cv[id]) { p.x = clamp(num(e[0], p.x), 0, W); p.y = clamp(num(e[1], p.y), 0, H); p.mv = !!e[20]; p.fx = num(e[21], p.fx); p.fy = num(e[22], p.fy); }
      G.cv[id] = cv;
      p.st = e[2] ? 'down' : 'ok'; p.why = WHY[e[3]] || ''; p.dt = num(e[4]); p.rv = num(e[5]); p.inv = num(e[6]); p.item = ITEMS[e[7]] || '';
      p.food = clamp(num(e[8], p.food), 0, 100); p.water = clamp(num(e[9], p.water), 0, 100); p.warm = clamp(num(e[10], p.warm), 0, 100);
      p.stun = num(e[11]); p.panic = num(e[12]); p.pdx = clamp(num(e[13]), -1, 1); p.pdy = clamp(num(e[14]), -1, 1); p.sick = num(e[15]); p.singe = num(e[16]); p.wet = num(e[17]); p.cook = num(e[18]); p.sulk = !!e[19];
    });
    const xy = (a, k) => ({ k, x: num(a[1]), y: num(a[2]) });
    if (Array.isArray(m.it)) G.items = m.it.filter(a => Array.isArray(a) && ITEMS[a[0]]).map(a => xy(a, ITEMS[a[0]]));
    if (Array.isArray(m.fa)) G.falls = m.fa.filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), t: num(a[2]), by: '' }));
    if (Array.isArray(m.cr)) G.crabs = m.cr.filter(Array.isArray).map(a => ({ x: num(a[0]), y: num(a[1]), vx: num(a[2]), vy: 0, t: 1 }));
    if (Array.isArray(m.fs)) G.fish = m.fs.filter(a => Array.isArray(a) && G.pools[a[0]]).map(a => ({ pool: a[0], x: num(a[1]), y: num(a[2]), vx: 0, vy: 0 }));
    if (typeof m.pm === 'string') m.pm.split(',').forEach((v, i) => { if (G.palms[i]) { G.palms[i].cocos = Math.floor(num(+v) / 10); G.palms[i].shakes = num(+v) % 10; } });
    if (typeof m.bu === 'string') G.bushes.forEach((b, i) => { b.fruit = num(+m.bu[i], b.fruit); });
    if (typeof m.fw === 'string') G.flowers.forEach((f, i) => { f.has = m.fw[i] === '1'; });
    if (Array.isArray(m.fi)) { G.fire.fuel = clamp(num(m.fi[0], G.fire.fuel), 0, 100); G.fire.lit = !!m.fi[1]; G.fire.prog = num(m.fi[2]); }
    if (Array.isArray(m.pd)) G.pads.forEach((p, i) => { p.n = clamp(num(m.pd[i], p.n) | 0, 0, 9); });
    G.ship = num(m.sh, -1) >= 0 ? { t: m.sh, x: -80 + (W + 160) * m.sh / SHIP_T } : null;
    G.monkey = Array.isArray(m.mk) ? { x: num(m.mk[0]), y: num(m.mk[1]), st: m.mk[2] === 0 ? 'in' : 'run', item: ITEMS[m.mk[3]] || '' } : null;
    G.score = Math.max(0, num(m.sc, G.score));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  function guestMsg(G, own, inp, presses) {
    const i = inp || {}, p = G.p[own];
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), a: presses | 0, x: r1(p.x), y: r1(p.y), mv: p.mv ? 1 : 0, fx: r2(p.fx), fy: r2(p.fy), cv: G.cv[own] };
  }
  // the host hears the guest: its stick, a new press (rq.act, cleared by the caller after the step), where it is
  function hostHears(G, rid, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx), -1, 1); rq.my = clamp(num(m.my), -1, 1);
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    const p = G.p[rid];
    if (m.cv === G.cv[rid] && Number.isFinite(m.x) && Number.isFinite(m.y) && free(p)) {
      const x = clamp(m.x, R, W - R), y = clamp(m.y, R, H - R);
      if (Math.hypot(x - p.x, y - p.y) < 120 && !solid(G, tAt(x), tAt(y))) { p.x = x; p.y = y; p.mv = !!m.mv; p.fx = num(m.fx, p.fx); p.fy = num(m.fy, p.fy); }
      else G.cv[rid]++;
    }
  }

  return { DT, START, T, COLS, ROWS, W, H, R, SPEED, DAY, NIGHT, DAYS, HEARTS, FIRE_R, REACH, PICK_R, GIVE_R, REVIVE_R, REVIVE_T, DOWN_T, STUN_T, PANIC_T, SHAKES, FALL_T, BONK_R, CATCH_W,
    FUEL_D, WOOD_FUEL, LIGHT_FUEL, RUB_GAP, COOK_T, SULK, SHIP_T, LOVE0, RESCUE_PTS, LOVE_PTS, HEART_PTS, STAT_PTS, DOWN_PTS, EARLY_PTS, OOPS_PTS, SOLID, FOOD, ITEMS,
    load, tileAt, solid, night, raining, tide, flooded, lastDay, sosNeed, sosDone, nearFire, reach, onPad, edge, collide, free, step, stars, clock, encode, apply, guestMsg, hostHears };
})();

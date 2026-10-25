/* The stranded pair, for the bots (tests) and the browser pilots. Needs Isle. isleCrew(G, opt) returns a function
   giving { pink: { mx, my, act }, mint: { mx, my, act } } for the next step of G. They look after themselves (drink
   before they are parched, eat before they starve), keep the fire fed and lit for the night (rubbing in turns), sit by
   it together at night, pile rocks on the SOS, fish together (one herds, one pounces), chase monkeys, step round crabs,
   help each other up, and make up with a flower when the other sulks.
   opt: think (s between decisions), react (s late to things that happen), slip (0..1: chance of a mistake: rubbing
   twice, mistiming a catch, walking into a crab), care (0..1: how much they look out for the other: sharing food,
   sitting together at night), pace (stick 0..1), seed. */
function isleRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function isleCrew(G, opt = {}) {
  const R = isleRng(opt.seed || 1), T = Isle.T, IDS = ['pink', 'mint'], other = id => (id === 'pink' ? 'mint' : 'pink');
  const think = opt.think == null ? 0.12 : opt.think, react = opt.react == null ? 0.25 : opt.react, slip = opt.slip || 0;
  const care = opt.care == null ? 1 : opt.care, pace = opt.pace == null ? 1 : opt.pace;
  const def = G.def, dayLen = def.day || Isle.DAY, fields = new Map(), next = { pink: 0, mint: 0 }, out = { pink: {}, mint: {} }, note = {};
  const tiles = ch => { const t = []; for (let y = 0; y < Isle.ROWS; y++) for (let x = 0; x < Isle.COLS; x++) if (G.grid[y][x] === ch) t.push([x, y]); return t; };
  const near4 = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => !Isle.solid(G, a, b));
  const SPOT = { T: tiles('T'), B: tiles('B'), R: tiles('R'), D: tiles('D'), w: tiles('w'), C: tiles('C') };
  // distances (8 ways, no corner cutting) to a set of tiles; the map never changes, so each is worked out once
  function field(key, targets) {
    if (fields.has(key)) return fields.get(key);
    const W = Isle.COLS, D = new Float64Array(W * Isle.ROWS).fill(Infinity), q = [];
    for (const [x, y] of targets) if (!Isle.solid(G, x, y)) { D[y * W + x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (Isle.solid(G, nx, ny) || (dx && dy && (Isle.solid(G, x + dx, y) || Isle.solid(G, x, y + dy)))) continue;
        const nd = D[y * W + x] + (dx && dy ? 1.42 : 1); if (nd < D[ny * W + nx] - 1e-9) { D[ny * W + nx] = nd; q.push([nx, ny]); }
      }
    }
    fields.set(key, D); return D;
  }
  const tile = p => [Math.floor(p.x / T), Math.floor(p.y / T)];
  // head for a point, round the walls (a field to its tile), stepping round crabs
  function goTo(id, x, y, stop = 4) {
    const p = G.p[id], d = Math.hypot(x - p.x, y - p.y);
    if (d < stop) return { mx: 0, my: 0 };
    let tx = x, ty = y;
    const [cx, cy] = tile(p), [gx, gy] = [Math.floor(x / T), Math.floor(y / T)];
    if (cx !== gx || cy !== gy) {
      const D = field('pt' + gx + ',' + gy, [[gx, gy]]), W = Isle.COLS;
      // the furthest of the next few tiles downhill that can be walked to straight
      let bx = cx, by = cy; const path = [];
      for (let k = 0; k < 4; k++) {
        let best = null, bd = D[by * W + bx];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = bx + dx, ny = by + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Isle.ROWS) continue;
          if (dx && dy && (Isle.solid(G, bx + dx, by) || Isle.solid(G, bx, by + dy))) continue;
          if (D[ny * W + nx] < bd - 1e-9) { bd = D[ny * W + nx]; best = [nx, ny]; }
        }
        if (!best) break; [bx, by] = best; path.push(best);
      }
      if (path.length) { const pick = path.find((q, i) => i === path.length - 1 || !clear(p.x, p.y, (path[i + 1][0] + .5) * T, (path[i + 1][1] + .5) * T)) || path[0]; tx = (pick[0] + .5) * T; ty = (pick[1] + .5) * T; if (pick[0] === gx && pick[1] === gy) { tx = x; ty = y; } }
    }
    let mx = tx - p.x, my = ty - p.y; const m = Math.hypot(mx, my) || 1; mx /= m; my /= m;
    // a crab just ahead: go round it (now and then a careless one does not look)
    for (const c of G.crabs) {
      const dx = c.x - p.x, dy = c.y - p.y, dc = Math.hypot(dx, dy);
      if (dc < 60 && dx * mx + dy * my > 0) {
        if (!(('cr' + id) in note) || G.t > note['cr' + id]) { note['cr' + id] = G.t + 1.5; note['crs' + id] = R() < slip; }
        if (!note['crs' + id]) { const s = (dx * my - dy * mx) > 0 ? 1 : -1, px = -s * my, py = s * mx; mx = mx * .3 + px; my = my * .3 + py; const n = Math.hypot(mx, my) || 1; mx /= n; my /= n; }
      }
    }
    const k = Math.min(1, d / 14) * pace;
    return { mx: mx * Math.max(.35, k), my: my * Math.max(.35, k) };
  }
  function clear(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6) || 1, r = Isle.R;
    for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (Isle.solid(G, Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return false; }
    return true;
  }
  // walk up to a tile of some kind (the nearest, by the way there), and press once there
  function useTile(id, kinds, filter) {
    const p = G.p[id]; let best = null, bd = Infinity;
    for (const ch of kinds) for (const t of SPOT[ch] || []) {
      if (filter && !filter(t)) continue;
      const D = field('nb' + t, near4(t)), [x, y] = tile(p), d = D[y * Isle.COLS + x] + Math.hypot((t[0] + .5) * T - p.x, (t[1] + .5) * T - p.y) / T * .1;
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return null;
    if (Isle.edge(p, best[0], best[1]) < Isle.R + Isle.REACH - 5) {
      // lean toward it (so it is the one in front) and press
      const dx = (best[0] + .5) * T - p.x, dy = (best[1] + .5) * T - p.y, m = Math.hypot(dx, dy) || 1;
      return { mx: dx / m * .3, my: dy / m * .3, act: true, at: best };
    }
    // the walkable side nearest to here
    const sides = near4(best).map(([a, b]) => [(a + .5) * T, (b + .5) * T]).sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y) - Math.hypot(b[0] - p.x, b[1] - p.y));
    return Object.assign(goTo(id, sides[0][0], sides[0][1], 3), { at: best });
  }
  const isFood = k => !!Isle.FOOD[k] && k !== 'fish';
  const ground = (pred, from) => G.items.filter(it => pred(it.k)).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
  function pickUp(id, it) { const p = G.p[id]; if (Math.hypot(it.x - p.x, it.y - p.y) < Isle.PICK_R - 6) return { mx: 0, my: 0, act: true }; return goTo(id, it.x, it.y, 2); }
  // hands free first (what is held goes down where it is, unless it is food: that is eaten)
  const letGo = id => ({ mx: 0, my: 0, act: true });
  // food: in hand, lying about, on a bush, a palm to shake (stepping clear of where it will land), or fish
  function getFood(id) {
    const p = G.p[id];
    if (isFood(p.item)) return { mx: 0, my: 0, act: true };
    if (p.item === 'fish') return cookFish(id);
    if (p.item) return letGo(id);
    const it = ground(isFood, p); if (it && Math.hypot(it.x - p.x, it.y - p.y) < 260) return pickUp(id, it);
    // fishing together, once there is a fire to cook on (and the other is fit to help)
    const o = G.p[other(id)];
    if ((note.fish && note.fish.by === id && G.t < note.fish.until) || (G.fire.lit && def.poolCrab != null && G.pools.length && o.st === 'ok' && o.food > 40 && o.water > 40 && !(note.fish && note.fish.by === other(id) && G.t < note.fish.until))) { const f = fishing(id); if (f) return f; }
    const bush = useTile(id, 'B', t => G.bushes.some(b => b.tx === t[0] && b.ty === t[1] && b.fruit > 0)); if (bush) return bush;
    if (it) return pickUp(id, it);
    const palm = useTile(id, 'T', t => G.palms.some(q => q.tx === t[0] && q.ty === t[1] && q.cocos > 0)); if (palm) return palm;
    return fishing(id);
  }
  function cookFish(id) {
    if (!G.fire.lit) return G.fire.fuel >= Isle.LIGHT_FUEL ? light(id) : wood(id);
    return useTile(id, 'C');
  }
  // fishing together: the one who wants the fish pounces from near the pool, the other herds from the far side
  function fishing(id, asHerder) {
    const p = G.p[id];
    if (asHerder) {
      // walk to and fro along the far side, splashing the fish toward the one waiting
      const n = note.fish; note.fish.until = Math.max(n.until, G.t + .5); if (p.item) return letGo(id);
      const pl = G.pools[n.pool], along = Math.abs(n.side[0] - n.side[2]) > 1 ? 'y' : 'x', sw = Math.sin(G.t * 2.2) * 22;
      return goTo(id, n.side[2] + (along === 'x' ? sw : 0), n.side[3] + (along === 'y' ? sw : 0), 2);
    }
    if (G.t < (note.noFish || 0)) return null;
    if (!note.fish || note.fish.by !== id || G.t > note.fish.until + 1) note.fishFrom = G.t;
    if (G.t - note.fishFrom > 14) { note.noFish = G.t + 25; note.fish = null; return null; }   // no luck: try again later
    const pi = G.pools.reduce((b, q, i) => (b < 0 || Math.hypot((q.x0 + q.x1) / 2 - p.x, (q.y0 + q.y1) / 2 - p.y) < Math.hypot((G.pools[b].x0 + G.pools[b].x1) / 2 - p.x, (G.pools[b].y0 + G.pools[b].y1) / 2 - p.y) ? i : b), -1);
    if (pi < 0) return null;
    const pl = G.pools[pi], cx = (pl.x0 + pl.x1) / 2, cy = (pl.y0 + pl.y1) / 2;
    // two sides of the pool across from each other where somebody can stand
    const sides = [[pl.x1 + 26, cy, pl.x0 - 14, cy], [pl.x0 - 26, cy, pl.x1 + 14, cy], [cx, pl.y1 + 26, cx, pl.y0 - 14], [cx, pl.y0 - 26, cx, pl.y1 + 14]]
      .filter(([a, b, c, d]) => !Isle.solid(G, Math.floor(a / T), Math.floor(b / T)) && !Isle.solid(G, Math.floor(c / T), Math.floor(d / T)));
    if (!sides.length) return null;
    const s = sides.sort((u, v) => Math.hypot(u[0] - p.x, u[1] - p.y) - Math.hypot(v[0] - p.x, v[1] - p.y))[0];
    note.fish = { pool: pi, until: G.t + 3, by: id, side: s };
    if (p.item) return letGo(id);
    if (Math.hypot(s[0] - p.x, s[1] - p.y) > 6) return goTo(id, s[0], s[1], 3);
    // pounce when a fish comes close to the edge in front
    const ex = Math.max(pl.x0 + 8, Math.min(pl.x1 - 8, p.x)), ey = Math.max(pl.y0 + 8, Math.min(pl.y1 - 8, p.y));
    const close = G.fish.some(f => f.pool === pi && Math.hypot(f.x - ex, f.y - ey) < 20);
    return { mx: 0, my: 0, act: close && p.lock <= 0 };
  }
  function wood(id) {
    const p = G.p[id];
    if (p.item === 'wood') return useTile(id, 'C');
    if (p.item) return isFood(p.item) && p.food < 85 ? { mx: 0, my: 0, act: true } : letGo(id);
    const it = ground(k => k === 'wood', p); if (it && Math.hypot(it.x - p.x, it.y - p.y) < 300) return pickUp(id, it);
    return useTile(id, 'D');
  }
  function rock(id) {
    const p = G.p[id];
    if (p.item === 'rock') {
      const need = Isle.sosNeed(G), i = G.pads.map((q, k) => k).filter(k => G.pads[k].n < need).sort((a, b) => G.pads[a].n - G.pads[b].n || Math.hypot((G.pads[a].x0 + G.pads[a].x1) / 2 - p.x, 0) - Math.hypot((G.pads[b].x0 + G.pads[b].x1) / 2 - p.x, 0))[0];
      if (i == null) return letGo(id);
      const q = G.pads[i], x = (q.x0 + q.x1) / 2, y = (q.y0 + q.y1) / 2;
      return Isle.onPad(G, p) === i ? { mx: 0, my: 0, act: true } : goTo(id, x, y, 6);
    }
    if (p.item) return isFood(p.item) && p.food < 85 ? { mx: 0, my: 0, act: true } : letGo(id);
    const it = ground(k => k === 'rock', p); if (it && Math.hypot(it.x - p.x, it.y - p.y) < 200) return pickUp(id, it);
    return useTile(id, 'R');
  }
  // lighting the fire: both at the pit, pressing in turns (pink starts)
  function light(id) {
    const p = G.p[id], f = G.fire, o = G.p[other(id)];
    if (p.item === 'wood') return useTile(id, 'C');
    if (p.item) return letGo(id);
    const u = useTile(id, 'C');
    if (!u || !u.act) return u;
    const oThere = o.st === 'ok' && Math.hypot(o.x - f.x, o.y - f.y) < 60, gap = G.t - f.lastT;
    let press = false;
    if (f.last === other(id) && gap > .22 + react * .3) press = true;
    else if (!f.last || gap > 1.1) press = oThere ? id === 'pink' || gap > 2 : true;
    if (f.last === id && gap > .3 && gap < .9 && R() < slip * .15) press = true;           // a slip: twice in a row
    return { mx: 0, my: 0, act: press };
  }
  function drink(id) { const p = G.p[id]; if (p.item) return isFood(p.item) && p.food < 80 ? { mx: 0, my: 0, act: true } : letGo(id); return useTile(id, 'w'); }
  function flower(id) {
    const p = G.p[id];
    if (p.item && p.item !== 'flower' && !isFood(p.item)) return letGo(id);
    const f = G.flowers.filter(q => q.has).sort((a, b) => Math.hypot((a.tx + .5) * T - p.x, (a.ty + .5) * T - p.y) - Math.hypot((b.tx + .5) * T - p.x, (b.ty + .5) * T - p.y))[0];
    if (!f) return null;
    const x = (f.tx + .5) * T, y = (f.ty + .5) * T;
    return Math.hypot(x - p.x, y - p.y) < 8 ? { mx: 0, my: 0, act: true } : goTo(id, x, y, 2);
  }
  const fireSpot = id => { const f = G.fire, a = id === 'pink' ? Math.PI * .75 : Math.PI * .25; return [f.x + Math.cos(a) * 38, f.y + Math.sin(a) * 38]; };
  // what each one does next
  function decide(id) {
    const p = G.p[id], o = G.p[other(id)], f = G.fire, c = Isle.clock(G), last = Isle.lastDay(G);
    if (p.st !== 'ok' || G.st !== 'run' || !Isle.free(p) || p.panic > 0) return { mx: 0, my: 0 };
    // a coconut about to land: catch it if it is close and the hands are free, else get out from under it
    for (const cf of G.falls) {
      const d = Math.hypot(cf.x - p.x, cf.y - p.y);
      if (d < 60 && !p.item && cf.t < .9) {
        if (cf.t < .2 + R() * slip * .3) return { mx: 0, my: 0, act: d < Isle.BONK_R + 4 };
        return goTo(id, cf.x, cf.y, 2);
      }
      if (d < Isle.BONK_R + 14) { const dx = p.x - cf.x, dy = p.y - cf.y, m = Math.hypot(dx, dy) || 1; return { mx: dx / m, my: dy / m }; }
    }
    if (o.st === 'down') return goTo(id, o.x, o.y, Isle.REVIVE_R - 14);
    if (o.sulk) {
      if (p.item === 'flower' || isFood(p.item)) return Math.hypot(o.x - p.x, o.y - p.y) < Isle.GIVE_R - 8 ? { mx: 0, my: 0, act: true } : goTo(id, o.x, o.y, Isle.GIVE_R - 12);
      return flower(id) || getFood(id);
    }
    // the ship: be seen
    if (G.ship && last) { if (!Isle.sosDone(G)) return rock(id); if (!f.lit) return f.fuel >= Isle.LIGHT_FUEL ? light(id) : wood(id); }
    // a monkey: the nearer one chases it
    const m = G.monkey;
    if (m && Math.hypot(m.x - p.x, m.y - p.y) <= Math.hypot(m.x - o.x, m.y - o.y) && Math.hypot(m.x - p.x, m.y - p.y) < 320) return goTo(id, m.x, m.y, 2);
    // the other one fishing: herd for them
    if (note.fish && note.fish.by === other(id) && G.t < note.fish.until && p.food > 30 && p.water > 30) return fishing(id, true);
    if (p.water < 30) return drink(id);
    if (p.food < 35) return getFood(id);
    // food in hand: eat it if hungry, or give it to the other if they need it more
    if (isFood(p.item) && o.food < p.food - 15 && R() < care) return Math.hypot(o.x - p.x, o.y - p.y) < Isle.GIVE_R - 8 ? { mx: 0, my: 0, act: true } : goTo(id, o.x, o.y, Isle.GIVE_R - 12);
    if (isFood(p.item) && p.food < 70) return { mx: 0, my: 0, act: true };
    const dusk = c.night || c.t > dayLen - 30, nx = (G.def.ships || [50, 95])[G.shipN], soon = last && nx != null && nx - c.t < 25 * care;
    const fuelGoal = (c.night ? 35 : dusk ? 70 : soon ? 55 : last ? 45 : 25) + (Isle.raining(G) ? 30 * care : 0);
    if (soon && !f.lit && Isle.sosDone(G)) return f.fuel >= Isle.LIGHT_FUEL ? light(id) : wood(id);
    // the fire: wood before dark, lit before dark, and on the last day ready for the ship
    if (f.fuel < fuelGoal && (dusk || last || Isle.raining(G)) && (id === 'mint' || f.fuel < 15 + 10 * care || c.night)) return wood(id);
    if (!f.lit && f.fuel >= Isle.LIGHT_FUEL && (dusk || (last && Isle.sosDone(G)))) return light(id);
    if (c.night) {
      if (p.water < 60) return drink(id);
      if (p.food < 55) return getFood(id);
      if (p.item === 'rock' || p.item === 'flower') return letGo(id);
      const [x, y] = fireSpot(id); return R() < care || Math.hypot(x - p.x, y - p.y) > 70 ? goTo(id, x, y, 6) : { mx: 0, my: 0 };
    }
    if (p.water < 55) return drink(id);
    if (p.food < 55) return getFood(id);
    // a flower for the other now and then, when things have cooled between them
    if (p.item === 'flower') return Math.hypot(o.x - p.x, o.y - p.y) < Isle.GIVE_R - 8 ? { mx: 0, my: 0, act: true } : goTo(id, o.x, o.y, Isle.GIVE_R - 12);
    if (G.love < 70 && id === 'mint') {
      if (!note.flw || G.t > note.flw.until) note.flw = { until: G.t + 30, want: R() < care };
      if (note.flw.want) { const f = flower(id); if (f) return f; }
    }
    if (!Isle.sosDone(G)) return rock(id);
    if (f.fuel < 60) return wood(id);
    if (!p.item) { const g = getFood(id); if (g) return g; }
    const [x, y] = fireSpot(id); return goTo(id, x, y, 10);
  }
  return () => {
    for (const id of IDS) {
      out[id].act = false;
      if (G.t >= next[id]) {
        const d = decide(id) || { mx: 0, my: 0 }; next[id] = G.t + think * (0.7 + R() * 0.6);
        out[id] = { mx: d.mx || 0, my: d.my || 0, act: !!d.act };
      }
    }
    return { pink: { mx: out.pink.mx, my: out.pink.my, act: out.pink.act }, mint: { mx: out.mint.mx, my: out.mint.my, act: out.mint.act } };
  };
}

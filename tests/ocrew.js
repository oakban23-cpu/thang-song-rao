/* The shop pair, for the bots (tests) and the browser pilots. Needs Shop. shopCrew(G, opt) returns a function giving
   { pink: { mx, my, act }, mint: { mx, my, act } } for the next step of G. They split the customers' pieces between
   them (each claims one), take each from its rack (or the floor), get it taken in or let out at the machines when the
   customer is not an M (the other comes over to sew in turns when free), hand it over, ring up whoever waits at the
   till, chase the thief once he has something, catch the kid, put clothes on the floor back, and take the photos at
   the fashion show.
   opt: think (s between decisions), react (s late to things that happen), slip (0..1: chance of a mistake: sewing
   twice running, a wrong guess at a size, a photo too early), care (0..1: how much they help the other: coming over to
   sew, tidying up), pace (stick 0..1), seed. */
function shopRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function shopCrew(G, opt = {}) {
  const R = shopRng(opt.seed || 1), T = Shop.T, IDS = ['pink', 'mint'], other = id => (id === 'pink' ? 'mint' : 'pink');
  const think = opt.think == null ? 0.12 : opt.think, react = opt.react == null ? 0.25 : opt.react, slip = opt.slip || 0;
  const care = opt.care == null ? 1 : opt.care, pace = opt.pace == null ? 1 : opt.pace;
  const fields = new Map(), next = { pink: 0, mint: 0 }, out = { pink: {}, mint: {} }, task = { pink: null, mint: null }, note = { guess: {}, seen: {} };
  const near4 = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => !Shop.solid(G, a, b));
  function field(key, targets) {
    if (fields.has(key)) return fields.get(key);
    const W = Shop.COLS, D = new Float64Array(W * Shop.ROWS).fill(Infinity), q = [];
    for (const [x, y] of targets) if (!Shop.solid(G, x, y)) { D[y * W + x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (Shop.solid(G, nx, ny) || (dx && dy && (Shop.solid(G, x + dx, y) || Shop.solid(G, x, y + dy)))) continue;
        const nd = D[y * W + x] + (dx && dy ? 1.42 : 1); if (nd < D[ny * W + nx] - 1e-9) { D[ny * W + nx] = nd; q.push([nx, ny]); }
      }
    }
    fields.set(key, D); return D;
  }
  const tile = p => [Math.floor(p.x / T), Math.floor(p.y / T)];
  function clear(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6) || 1, r = Shop.R;
    for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (Shop.solid(G, Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return false; }
    return true;
  }
  function goTo(id, x, y, stop = 4) {
    const p = G.p[id], d = Math.hypot(x - p.x, y - p.y);
    if (d < stop) return { mx: 0, my: 0 };
    let tx = x, ty = y;
    const [cx, cy] = tile(p), gx = Math.floor(x / T), gy = Math.floor(y / T);
    if ((cx !== gx || cy !== gy) && !clear(p.x, p.y, x, y)) {
      const D = field('pt' + gx + ',' + gy, [[gx, gy]]), W = Shop.COLS;
      let bx = cx, by = cy; const path = [];
      for (let k = 0; k < 4; k++) {
        let best = null, bd = D[by * W + bx];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = bx + dx, ny = by + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Shop.ROWS) continue;
          if (dx && dy && (Shop.solid(G, bx + dx, by) || Shop.solid(G, bx, by + dy))) continue;
          if (D[ny * W + nx] < bd - 1e-9) { bd = D[ny * W + nx]; best = [nx, ny]; }
        }
        if (!best) break; [bx, by] = best; path.push(best);
      }
      if (path.length) { const pick = path.find((q, i) => i === path.length - 1 || !clear(p.x, p.y, (path[i + 1][0] + .5) * T, (path[i + 1][1] + .5) * T)) || path[0]; tx = (pick[0] + .5) * T; ty = (pick[1] + .5) * T; if (pick[0] === gx && pick[1] === gy) { tx = x; ty = y; } }
    }
    let mx = tx - p.x, my = ty - p.y; const m = Math.hypot(mx, my) || 1; mx /= m; my /= m;
    const k = Math.min(1, d / 14) * pace;
    return { mx: mx * Math.max(.35, k), my: my * Math.max(.35, k) };
  }
  // walk up to a tile (from its nearest open side) and press once there, leaning toward it
  function useTile(id, t) {
    const p = G.p[id], sides = near4(t).map(([a, b]) => [(a + .5) * T, (b + .5) * T]).sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y) - Math.hypot(b[0] - p.x, b[1] - p.y));
    if (!sides.length) return { mx: 0, my: 0 };
    // right beside it (on the open tile next to it), then press, leaning toward it
    const [sx, sy] = sides[0];
    if (Math.hypot(sx - p.x, sy - p.y) > 9) return goTo(id, sx, sy, 3);
    const dx = (t[0] + .5) * T - p.x, dy = (t[1] + .5) * T - p.y, m = Math.hypot(dx, dy) || 1, hit = Shop.reach(G, p, Shop.tileAt(G, t[0], t[1]));
    return { mx: dx / m * .3, my: dy / m * .3, act: p.lock <= 0 && !!hit && hit.tx === t[0] && hit.ty === t[1] };
  }
  const rackT = k => [G.racks[k].tx, G.racks[k].ty];
  const dist = (p, x, y) => Math.hypot(p.x - x, p.y - y);
  const waiting = () => G.cust.filter(c => (c.st === 'wait' || c.st === 'queue' || c.st === 'in') && c.pat > 0);
  // the size a bot thinks the customer is (a careless one now and then takes them for an M)
  function sizeOf(c) { if (!(c.id in note.guess)) note.guess[c.id] = R() < slip * .35 ? 1 : c.z; return note.guess[c.id]; }
  function claimed(cid, p, except) { return IDS.some(id => id !== except && task[id] && task[id].cid === cid && task[id].p === p); }
  // where to get a piece: a garment on the floor that will do, or the nearest rack with one
  function source(id, c, p) {
    const pl = G.p[id], s = c.want.s, col = c.want.c, z = sizeOf(c), SEW = 260;
    // the cheapest: the walk there, and a sewing job on top when it is not their size
    let best = null, bc = Infinity;
    for (const it of G.items) {
      const d = Shop.gd(it.g); if (d.p !== p || d.s !== s || (col >= 0 && d.c !== col)) continue;
      const cost = dist(pl, it.x, it.y) + (d.z === z ? 0 : Math.abs(d.z - z) * SEW);
      if (cost < bc) { bc = cost; best = { floor: it }; }
    }
    G.racks.forEach((r, k) => {
      if (r.n <= 0 || r.p !== p || r.s !== s || (col >= 0 && r.c !== col) || (G.kid && G.kid.st === 'hide' && G.kid.rack === k)) return;
      const cost = dist(pl, (r.tx + .5) * T, (r.ty + .5) * T) + Math.abs(1 - z) * SEW;
      if (cost < bc) { bc = cost; best = { rack: k }; }
    });
    return best;
  }
  const machFor = z => G.mach.findIndex(m => m.dir === (z === 0 ? -1 : 1));
  function pickUp(id, it) { const p = G.p[id]; if (dist(p, it.x, it.y) < Shop.PICK_R - 8) return { mx: 0, my: 0, act: p.lock <= 0 }; return goTo(id, it.x, it.y, 2); }
  // working a piece for a customer: get it, get it sewn to size, hand it over
  function doPiece(id, tk) {
    const p = G.p[id], c = G.cust.find(o => o.id === tk.cid);
    if (!c || !Shop.needs(c).includes(tk.p) || !['in', 'wait', 'queue'].includes(c.st)) {
      // the customer is gone: whatever of ours is on a machine still has to come off it
      task[id] = tk.mach != null && G.mach[tk.mach].g >= 0 ? { type: 'free', mach: tk.mach } : null; return null;
    }
    const z = sizeOf(c);
    if (p.item >= 0) {
      const g = Shop.gd(p.item);
      if (g.p !== tk.p) { task[id] = null; return null; }
      if (g.z !== z) {
        const mi = machFor(z < g.z ? 0 : 2), m = G.mach[mi]; if (!m) { task[id] = null; return null; }
        if (m.g >= 0 && !m.done) { tk.waitM = mi; return Shop.edge(p, m.tx, m.ty) >= Shop.R + Shop.REACH - 5 ? useTile(id, [m.tx, m.ty]) : sew(id, m); }   // sew theirs meanwhile
        if (m.g >= 0) return goTo(id, (m.tx + 1.5) * T, (m.ty + .5) * T, 20);          // done: wait for them to take it
        tk.waitM = null; tk.mach = mi; return useTile(id, [m.tx, m.ty]);
      }
      if (dist(p, c.x, c.y) < Shop.GIVE_R - 10 && c.st !== 'in') return { mx: 0, my: 0, act: p.lock <= 0 };
      return goTo(id, c.x, c.y + 18, 8);
    }
    // a garment of ours on a machine: sew (in turns with the other, if they are there), then take it
    if (tk.mach != null) {
      const m = G.mach[tk.mach];
      if (m.g < 0) { tk.mach = null; return null; }
      if (Shop.edge(p, m.tx, m.ty) >= Shop.R + Shop.REACH - 5) return useTile(id, [m.tx, m.ty]);
      if (m.done) return useTile(id, [m.tx, m.ty]);
      return sew(id, m);
    }
    const src = tk.src = source(id, c, tk.p);
    if (!src) return { mx: 0, my: 0 };
    if (src.floor) return pickUp(id, src.floor);
    return useTile(id, rackT(src.rack));
  }
  function sew(id, m) {
    const p = G.p[id], gap = G.t - m.lastT;
    const oth = G.p[other(id)], ot = task[other(id)], mi = G.mach.indexOf(m);
    const there = oth.stun <= 0 && Shop.edge(oth, m.tx, m.ty) < Shop.R + Shop.REACH && ot && (ot.help === mi || ot.mach === mi || ot.waitM === mi);
    let press = false;
    if (m.last && m.last !== id && gap > .14 + react * .25) press = true;                         // my turn
    else if (there) press = !m.last ? id === 'pink' : gap > 1.4;                                 // waiting for the other's turn
    else press = m.last !== id || gap > Shop.SOLO_GAP + .05 + react * .2;                        // alone: steadily
    if (m.last === id && gap > .15 && gap < Shop.SOLO_GAP && R() < slip * .08) press = true;     // a slip: in a hurry
    const dx = (m.tx + .5) * T - p.x, dy = (m.ty + .5) * T - p.y, d = Math.hypot(dx, dy) || 1;
    return { mx: dx / d * .3, my: dy / d * .3, act: press && p.lock <= 0 };
  }
  function decide(id) {
    const p = G.p[id], o = G.p[other(id)];
    if (p.stun > 0) return { mx: 0, my: 0 };
    // the show: a photo as the model strikes the pose (a careless one too early or late now and then)
    if (G.st === 'show') {
      const s = Shop.showAt(G); if (!s || s.i < 0 || s.i >= s.n || p.flashI === s.i) return { mx: 0, my: 0 };
      const aim = Shop.FLASH[0] + .25 + react * .4 + (R() < slip * .5 ? .6 : 0);
      return { mx: 0, my: 0, act: s.lt >= aim && s.lt <= Shop.FLASH[1] + .6 };
    }
    if (G.st !== 'run') return { mx: 0, my: 0 };
    const tk = task[id];
    // a thief making off with something: the nearer one goes after him
    const th = G.thief;
    if (th && th.item >= 0 && th.st === 'run') {
      note.seen.thief = note.seen.thief || G.t;
      if (G.t - note.seen.thief > react * 2 && dist(p, th.x, th.y) <= dist(o, th.x, th.y) + 40) return goTo(id, th.x, th.y, 0);
    } else note.seen.thief = 0;
    // someone waiting at the till: whoever is free and nearer rings it up
    const tc = G.cust.find(c => c.st === 'pay'), [qx, qy] = G.tillQ[0];
    if (tc && dist(tc, qx, qy) < 6) {
      note.seen.till = note.seen.till || G.t;
      const me = p.item < 0 && (!tk || tk.type !== 'piece' || tc.tillPat < 12), they = o.item < 0 && (!task[other(id)] || tc.tillPat < 12);
      if (G.t - note.seen.till > react && me && (!they || dist(p, qx, qy) <= dist(o, qx, qy))) { const kt = G.till[1] || G.till[0]; return useTile(id, kt); }
    } else note.seen.till = 0;
    // the kid in a rack: whoever is free with empty hands catches them
    const kd = G.kid;
    if (kd && kd.st === 'hide' && p.item < 0 && !tk && R() < care + .3) return useTile(id, rackT(kd.rack));
    // carrying on with a piece
    if (tk && tk.type === 'piece') { const d = doPiece(id, tk); if (d) return d; }
    if (tk && tk.type === 'free' && p.item >= 0) task[id] = null;
    // a machine with something on it nobody is seeing to: finish it and take it off
    const own = mi => IDS.some(k => task[k] && (task[k].mach === mi) && (k !== id || task[k].type === 'free'));
    if (p.item < 0) {
      const mi = task[id] && task[id].type === 'free' ? task[id].mach : G.mach.findIndex((m, i) => m.g >= 0 && !own(i));
      if (mi >= 0 && G.mach[mi].g >= 0) { const m = G.mach[mi]; task[id] = { type: 'free', mach: mi }; return Shop.edge(p, m.tx, m.ty) >= Shop.R + Shop.REACH - 5 || m.done ? useTile(id, [m.tx, m.ty]) : sew(id, m); }
      if (task[id] && task[id].type === 'free') task[id] = null;
    }
    if (tk && tk.type === 'help') {
      const m = G.mach[tk.help], ot = task[other(id)];
      if (m.g >= 0 && !m.done && p.item < 0 && ot && ot.mach === tk.help) return Shop.edge(p, m.tx, m.ty) >= Shop.R + Shop.REACH - 5 ? useTile(id, [m.tx, m.ty]) : sew(id, m);
      task[id] = null;
    }
    // holding something with no one to give it to: whoever wants it, else back on its rack, else down
    if (p.item >= 0) {
      const g = Shop.gd(p.item);
      const c = waiting().find(c => Shop.needs(c).includes(g.p) && c.want.s === g.s && (c.want.c < 0 || c.want.c === g.c) && !claimed(c.id, g.p, id));
      if (c) { task[id] = { type: 'piece', cid: c.id, p: g.p }; return doPiece(id, task[id]); }
      const rk = G.racks.findIndex(r => r.p === g.p && r.s === g.s && r.c === g.c);
      if (rk >= 0 && !(G.kid && G.kid.st === 'hide' && G.kid.rack === rk)) return useTile(id, rackT(rk));
      // nowhere for it just now: put it down out in the open, away from racks and customers
      const [ax, ay] = id === 'pink' ? [12.5 * T, 11.5 * T] : [17.5 * T, 11.5 * T];
      return dist(p, ax, ay) < 10 ? { mx: 0, my: 0, act: p.lock <= 0 } : goTo(id, ax, ay, 6);
    }
    // the other sewing alone: come and help
    const ot = task[other(id)];
    if (ot && ot.mach != null && R() < care) { const m = G.mach[ot.mach]; if (m && m.g >= 0 && !m.done) { task[id] = { type: 'help', help: ot.mach }; return useTile(id, [m.tx, m.ty]); } }
    // a piece nobody is on yet: the customer who has waited longest first
    const cs = waiting().sort((a, b) => a.pat - b.pat);
    for (const c of cs) for (const pc of Shop.needs(c)) if (!claimed(c.id, pc, id) && source(id, c, pc)) { task[id] = { type: 'piece', cid: c.id, p: pc }; const d = doPiece(id, task[id]); if (d) return d; }
    // nothing to do: put clothes on the floor back
    const it = G.items.slice().sort((a, b) => dist(p, a.x, a.y) - dist(p, b.x, b.y))[0];
    if (it && R() < care + .4 && !(task[other(id)] && task[other(id)].tidy === it)) { task[id] = null; return pickUp(id, it); }
    return goTo(id, id === 'pink' ? 13 * T : 17 * T, 11 * T, 30);
  }
  const fn = () => {
    for (const id of IDS) {
      out[id].act = false;
      if (G.t >= next[id]) {
        const d = decide(id) || { mx: 0, my: 0 }; next[id] = G.t + think * (0.7 + R() * 0.6);
        out[id] = { mx: d.mx || 0, my: d.my || 0, act: !!d.act };
      }
    }
    return { pink: { mx: out.pink.mx, my: out.pink.my, act: out.pink.act }, mint: { mx: out.mint.mx, my: out.mint.my, act: out.mint.act } };
  };
  fn.task = task;
  return fn;
}

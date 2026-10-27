/* The dress shop (ร้านแต่งตัว). The two of you run a small clothes shop for a day, seen from above. Customers come in
   wanting an outfit for something (the beach, a wedding, the office, a party, sport, a date): two to four pieces (a top,
   a bottom, shoes, a hat), now and then in a colour, and in their size (S, M or L: look at them). Each rack holds one
   design (a piece, a style, a colour), always in M; S and L are made at the sewing machines (one takes in, one lets
   out: the two of you pressing in turns sews fast, even if one is holding the next piece; alone it is slow; alone in a
   hurry tangles the thread). Hand each piece to the
   customer; when the outfit is complete they try it on in their fitting room and come out to show it (too small and the
   seams burst, too big and it hangs like a tent, the wrong style and they are not amused). If they like it they pay at
   the till (someone has to ring it up), with a tip for a perfect outfit; if they don't they throw it all on the floor.
   Customers waiting pull clothes off the racks onto the floor; a kid hides in a rack, throws clothes out and jumps out
   at whoever puts something back; a thief in a hood takes something and runs, the alarm rings at the gate by the door,
   and touching him before he gets out gets it back. Clothes on the floor go back on their own rack (or to a customer),
   and a delivery tops the racks up now and then. At closing time the best three outfits walk in a fashion show: press
   as each model strikes the pose at the end of the runway to take a photo (both together: a couple's shot).
   The score is the money taken, less what was lost. The map: COLS x ROWS tiles of T px. */
const Shop = (() => {
  'use strict';
  const DT = 1 / 120, START = 2.5, T = 32, COLS = 30, ROWS = 17, W = COLS * T, H = ROWS * T;
  const R = 12, SPEED = 150, CSPEED = 85, REACH = 20, PICK_R = 26, GIVE_R = 46, CATCH_R = 26;
  const TIME = 240, PATIENCE = 75, TILL_PAT = 25, TRY_T = 2.2, POSE_T = 2.8, STUN_T = 0.9, CLOSE_T = 2;
  const SEW_GAP = [0.1, 1.0], SOLO_GAP = 0.35, STOCK = 3;
  const PRICE = [30, 30, 24, 16], TIP = 25, LOST_PTS = 15, THEFT_PTS = 25, CATCH_PTS = 15, KID_PTS = 10, PHOTO_PTS = 12, DUO_PTS = 20;
  const MODEL_T = 3.2, SHOW_IN = 2, FLASH = [1.8, 2.7];
  const STYLES = ['beach', 'wedding', 'office', 'party', 'sport', 'date'], PIECES = ['top', 'bottom', 'shoes', 'hat'];
  const COLORS = ['red', 'pink', 'blue', 'green', 'yellow', 'black', 'white'], SIZES = ['S', 'M', 'L'];
  const SOLID = '#rFKYZDom', WALK = '#rKYZom', IDS = ['pink', 'mint'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  const tAt = v => Math.floor(v / T);
  // a garment as one number: piece, style, colour, size
  const gc = g => g.p * 1000 + g.s * 100 + g.c * 10 + g.z;
  const gd = n => ({ p: Math.floor(n / 1000) % 10, s: Math.floor(n / 100) % 10, c: Math.floor(n / 10) % 10, z: n % 10 });
  const okG = n => Number.isInteger(n) && n >= 0 && n < 4000 && gd(n).s < STYLES.length && gd(n).c < COLORS.length && gd(n).z < 3;
  function rng(G) { let s = G.rs >>> 0 || 1; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; G.rs = s; return s / 4294967296; }
  const pick = (G, a) => a[Math.floor(rng(G) * a.length)];

  function load(def) {
    const grid = def.map.map(r => r.padEnd(COLS, '#').slice(0, COLS).split(''));
    const G = {
      def, grid, t: 0, rt: 0, st: 'count', over: false, won: false, money: 0, score: 0, rs: def.seed || 7,
      racks: [], rooms: [], till: [], mach: [], waits: [], doors: [], gateY: -1, items: [], cust: [], cid: 0, nextC: 3, kid: null, thief: null,
      thiefI: 0, delT: def.delivery || 0, show: null, best: [], cv: { pink: 0, mint: 0 }, pend: [],
      stats: { served: 0, perfect: 0, lost: 0, refused: 0, tight: 0, loose: 0, wrong: 0, thefts: 0, caught: 0, kids: 0, boos: 0, tangles: 0, sewn: 0, messes: 0, tidied: 0, photos: 0, duos: 0, tips: 0 }
    };
    const start = {};
    let ri = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c === 'P' || c === 'M') { start[c === 'P' ? 'pink' : 'mint'] = [(x + .5) * T, (y + .5) * T]; grid[y][x] = '.'; }
      else if (c === 'r') { const d = (def.racks || [])[ri++] || [0, 0, 0]; G.racks.push({ tx: x, ty: y, p: d[0], s: d[1], c: d[2], n: def.stock || STOCK, max: def.stock || STOCK }); }
      else if (c === 'F') G.rooms.push({ tx: x, ty: y, cid: -1 });
      else if (c === 'K') G.till.push([x, y]);
      else if (c === 'Y' || c === 'Z') G.mach.push({ tx: x, ty: y, dir: c === 'Y' ? -1 : 1, g: -1, prog: 0, last: '', lastT: -9, done: false });
      else if (c === 'w') { G.waits.push([x, y]); grid[y][x] = '.'; }
      else if (c === 'D') G.doors.push([x, y]);
      else if (c === 'G') G.gateY = y;
    }
    // where the till is rung from, and where its queue stands (below the middle of the counter, going down)
    const k = G.till[Math.floor(G.till.length / 2)] || [COLS - 3, 4];
    G.tillQ = [0, 1, 2, 3].map(i => [(k[0] + .5) * T, (k[1] + 1.5 + i * .85) * T]);
    const d = G.doors[Math.floor((G.doors.length - 1) / 2)] || [COLS / 2, ROWS - 1];
    G.door = [(d[0] + (G.doors.length % 2 ? .5 : 1)) * T, (d[1] + .5) * T];
    G.p = {};
    for (const id of IDS) { const [x, y] = start[id] || [W / 2, H / 2]; G.p[id] = { x, y, item: -1, stun: 0, lock: 0, mv: false, fx: 0, fy: -1, flashI: -1 }; }
    G.fields = {};
    return G;
  }

  /* ---------- the map ---------- */
  const tileAt = (G, tx, ty) => (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS ? '#' : G.grid[ty][tx]);
  const solid = (G, tx, ty) => SOLID.includes(tileAt(G, tx, ty));
  function edge(p, tx, ty) { const cx = clamp(p.x, tx * T, tx * T + T), cy = clamp(p.y, ty * T, ty * T + T); return Math.hypot(p.x - cx, p.y - cy); }
  // the nearest tile of these kinds within reach (the one in front counts as nearer), or null
  function reach(G, p, kinds, ok) {
    let best = null, bd = Infinity;
    for (let ty = tAt(p.y) - 2; ty <= tAt(p.y) + 2; ty++) for (let tx = tAt(p.x) - 2; tx <= tAt(p.x) + 2; tx++) {
      const c = tileAt(G, tx, ty); if (!kinds.includes(c) || (ok && !ok(c, tx, ty))) continue;
      const d = edge(p, tx, ty); if (d >= R + REACH) continue;
      // the one whose middle is nearest, and the one in front, wins (racks stand side by side)
      const dx = (tx + .5) * T - p.x, dy = (ty + .5) * T - p.y, dc = Math.hypot(dx, dy), f = dc - 14 * Math.max(0, (dx * p.fx + dy * p.fy) / (dc || 1));
      if (f < bd) { bd = f; best = { c, tx, ty }; }
    }
    return best;
  }
  const rackAt = (G, tx, ty) => G.racks.find(r => r.tx === tx && r.ty === ty);
  const machAt = (G, tx, ty) => G.mach.find(m => m.tx === tx && m.ty === ty);
  const roomSpot = rm => [(rm.tx + .5) * T, (rm.ty + 1.55) * T];
  const timeLeft = G => (G.def.time || TIME) - G.rt;
  // what each customer still wants: the pieces not handed over yet
  const needs = c => c.want.pieces.filter(p => c.got[p] == null);

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
  const free = p => p.stun <= 0;
  function move(G, id, q) {
    const p = G.p[id]; p.mv = false;
    if (!free(p)) return;
    let mx = clamp(num(q.mx), -1, 1), my = clamp(num(q.my), -1, 1); const m = Math.hypot(mx, my); if (m < .15) return; if (m > 1) { mx /= m; my /= m; }
    const x0 = p.x, y0 = p.y;
    p.x += mx * SPEED * DT; collide(G, p); p.y += my * SPEED * DT; collide(G, p);
    p.mv = Math.hypot(p.x - x0, p.y - y0) > .05;
    p.fx = mx; p.fy = my;
  }
  // customers, the kid and the thief walk the aisles (a distance field to where they are going; they pass through people)
  function field(G, tx, ty) {
    const key = tx + ',' + ty; if (G.fields[key]) return G.fields[key];
    const D = new Float64Array(COLS * ROWS).fill(Infinity), q = [[tx, ty]]; D[ty * COLS + tx] = 0;
    const walk = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !WALK.includes(G.grid[y][x]);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (!walk(nx, ny) || (dx && dy && (!walk(x + dx, y) || !walk(x, y + dy)))) continue;
        const nd = D[y * COLS + x] + (dx && dy ? 1.42 : 1); if (nd < D[ny * COLS + nx] - 1e-9) { D[ny * COLS + nx] = nd; q.push([nx, ny]); }
      }
    }
    return (G.fields[key] = D);
  }
  function walkTo(G, a, x, y, sp) {
    const d = Math.hypot(x - a.x, y - a.y); if (d < 2.5) { a.x = x; a.y = y; a.mv = false; return true; }
    let gx = x, gy = y; const cx = tAt(a.x), cy = tAt(a.y), txx = tAt(x), tyy = tAt(y);
    if (cx !== txx || cy !== tyy) {
      const D = field(G, clamp(txx, 0, COLS - 1), clamp(tyy, 0, ROWS - 1)); let best = null, bd = D[cy * COLS + cx];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (D[ny * COLS + nx] < bd - 1e-9) { bd = D[ny * COLS + nx]; best = [nx, ny]; }
      }
      if (best) { gx = (best[0] + .5) * T; gy = (best[1] + .5) * T; if (best[0] === txx && best[1] === tyy) { gx = x; gy = y; } }
    }
    const dx = gx - a.x, dy = gy - a.y, m = Math.hypot(dx, dy) || 1, s = Math.min(m, sp * DT);
    a.x += dx / m * s; a.y += dy / m * s; a.mv = true; if (Math.abs(dx) > .5) a.fx = Math.sign(dx);
    return false;
  }

  /* ---------- customers ---------- */
  function spawn(G, ev) {
    const def = G.def, styles = def.styles || [0, 2], counts = def.pieces || [2];
    const s = pick(G, styles), n = pick(G, counts), pieces = [0, 1, 2, 3].slice(0, n).filter(p => G.racks.some(r => r.p === p && r.s === s));
    // a colour only if every piece they want comes in it
    let c = -1;
    if (rng(G) < (def.colorAsk || 0)) {
      const cs = COLORS.map((x, i) => i).filter(ci => pieces.every(p => G.racks.some(r => r.p === p && r.s === s && r.c === ci)));
      if (cs.length) c = pick(G, cs);
    }
    const wz = def.sizes || [.2, .6, .2], u = rng(G), z = u < wz[0] ? 0 : u < wz[0] + wz[1] ? 1 : 2;
    const [dx, dy] = G.door, pat = def.patience || PATIENCE;
    const cu = { id: G.cid++, x: dx, y: dy, st: 'in', room: -1, wait: -1, z, look: Math.floor(rng(G) * 1000), want: { s, c, pieces }, got: {}, pat, patMax: pat, tillPat: TILL_PAT, out: null, pay: 0, t: 0, fx: 1, mv: false, angry: false, q: 0 };
    G.cust.push(cu); ev.push('arrive:' + cu.id);
    if (def.kid && !G.kid && rng(G) < def.kid) kidSpawn(G, cu, ev);
    seat(G, cu);
    return cu;
  }
  // a fitting room for this customer if one is free, else a spot to wait in
  function seat(G, cu) {
    const ri = G.rooms.findIndex(r => r.cid < 0);
    if (ri >= 0) { G.rooms[ri].cid = cu.id; cu.room = ri; if (cu.wait >= 0) cu.wait = -1; cu.st = 'in'; return; }
    if (cu.wait < 0) { const used = G.cust.filter(o => o.wait >= 0).map(o => o.wait), wi = G.waits.findIndex((w, i) => !used.includes(i)); cu.wait = wi; }
    cu.st = 'in';
  }
  function leave(G, cu, ev, angry) {
    if (cu.room >= 0) { G.rooms[cu.room].cid = -1; cu.room = -1; }
    cu.wait = -1; cu.st = 'out'; cu.angry = !!angry;
    // what they were handed lies where they stood
    for (const p of cu.want.pieces) if (cu.got[p] != null) { dropAt(G, cu.got[p], cu.x + (rng(G) - .5) * 30, cu.y + 8 + (rng(G) - .5) * 16); delete cu.got[p]; }
  }
  // how well an outfit suits them, piece by piece: the style, the colour (if they asked for one), the fit
  function judge(cu) {
    let sum = 0, pay = 0; const o = { tight: 0, loose: 0, style: 0, color: 0, n: cu.want.pieces.length };
    for (const p of cu.want.pieces) {
      const g = gd(cu.got[p]); let q = 1;
      if (g.s !== cu.want.s) { q *= .35; o.style++; }
      if (cu.want.c >= 0 && g.c !== cu.want.c) { q *= .65; o.color++; }
      if (g.z < cu.z) { q *= .55; o.tight++; } else if (g.z > cu.z) { q *= .55; o.loose++; }
      sum += q; pay += PRICE[p] * q;
    }
    o.q = Math.round(sum / o.n * 100); o.pay = Math.round(pay);
    o.perfect = !o.tight && !o.loose && !o.style && !o.color; o.refuse = o.q < 50;
    o.kind = o.refuse && o.style ? 'nostyle' : o.tight ? 'tight' : o.loose ? 'loose' : o.style ? 'style' : o.color ? 'color' : 'perfect';
    return o;
  }
  function custStep(G, cu, ev) {
    const def = G.def;
    cu.t += DT;
    if (cu.st === 'in') {
      const [x, y] = cu.room >= 0 ? roomSpot(G.rooms[cu.room]) : cu.wait >= 0 ? [(G.waits[cu.wait][0] + .5) * T, (G.waits[cu.wait][1] + .5) * T] : [W / 2, H / 2];
      if (walkTo(G, cu, x, y, CSPEED)) { cu.st = cu.room >= 0 ? 'wait' : 'queue'; cu.fx = 0; if (!cu.seen) { cu.seen = 1; ev.push('want:' + cu.id); } }
    }
    if (cu.st === 'wait' || cu.st === 'queue' || cu.st === 'in') {
      // patience runs out faster in a messy shop
      cu.pat -= DT * (G.items.length > 4 ? 1.25 : 1);
      if (cu.pat <= 0) { G.stats.lost++; G.money -= LOST_PTS; ev.push('angry:' + cu.id); leave(G, cu, ev, true); return; }
      // fussing with the racks while waiting: something ends up on the floor
      if (cu.st !== 'in' && def.messy && rng(G) < def.messy * DT) {
        const r = G.racks.filter(k => k.n > 0 && Math.hypot((k.tx + .5) * T - cu.x, (k.ty + .5) * T - cu.y) < 110);
        if (r.length) { const k = pick(G, r); k.n--; dropAt(G, gc({ p: k.p, s: k.s, c: k.c, z: 1 }), cu.x + (rng(G) - .5) * 36, cu.y + 14 + rng(G) * 10); G.stats.messes++; ev.push('messy:' + cu.id); }
      }
      // complete and in a room: into it to try it all on
      if (cu.st === 'wait' && !needs(cu).length) { cu.st = 'try'; cu.t = 0; ev.push('try:' + cu.id); }
      // waiting with nowhere to try it on: a room may have come free
      if (cu.st === 'queue' && cu.room < 0 && G.rooms.some(r => r.cid < 0)) seat(G, cu);
      return;
    }
    if (cu.st === 'try') {
      const rm = G.rooms[cu.room]; cu.x = (rm.tx + .5) * T; cu.y = (rm.ty + .5) * T;
      if (cu.t >= TRY_T) { const [x, y] = roomSpot(rm); cu.x = x; cu.y = y; cu.st = 'pose'; cu.t = 0; cu.out = judge(cu); ev.push('reveal:' + cu.id + ':' + cu.out.kind); }
      return;
    }
    if (cu.st === 'pose') {
      if (cu.t < POSE_T) return;
      const o = cu.out; G.rooms[cu.room].cid = -1; cu.room = -1;
      for (const k of ['tight', 'loose']) G.stats[k] += o[k] ? 1 : 0; if (o.style || o.color) G.stats.wrong++;
      if (o.refuse) {
        // not a chance: the lot goes on the floor
        G.stats.refused++; ev.push('refuse:' + cu.id);
        for (const p of cu.want.pieces) { dropAt(G, cu.got[p], cu.x + (rng(G) - .5) * 50, cu.y + 10 + rng(G) * 20); delete cu.got[p]; }
        cu.st = 'out'; cu.angry = true; return;
      }
      cu.pay = o.pay + (o.perfect ? TIP + Math.round(15 * Math.max(0, cu.pat) / cu.patMax) : 0); cu.q = o.q;
      cu.st = 'pay'; cu.t = 0; return;
    }
    if (cu.st === 'pay') {
      // in the queue for the till: its place in it decides where it stands
      const line = G.cust.filter(o => o.st === 'pay'), i = line.indexOf(cu), [x, y] = G.tillQ[Math.min(i, G.tillQ.length - 1)];
      walkTo(G, cu, x, y, CSPEED);
      if (i === 0 && Math.hypot(cu.x - x, cu.y - y) < 4) { cu.tillPat -= DT; if (cu.tillPat <= 0) { G.stats.lost++; ev.push('tillgone:' + cu.id); cu.st = 'out'; cu.angry = true; } }
      return;
    }
    if (cu.st === 'out') { if (walkTo(G, cu, G.door[0], G.door[1], cu.angry ? CSPEED * 1.3 : CSPEED)) { cu.st = 'gone'; ev.push('gone:' + cu.id); } }
  }
  function ring(G, id, ev) {
    const cu = G.cust.find(o => o.st === 'pay'); if (!cu) return false;
    const [x, y] = G.tillQ[0]; if (Math.hypot(cu.x - x, cu.y - y) > 6) return false;
    G.money += cu.pay; G.stats.served++; if (cu.out.perfect) { G.stats.perfect++; G.stats.tips += cu.pay - cu.out.pay; }
    G.best.push({ look: cu.look, z: cu.z, got: cu.want.pieces.map(p => cu.got[p]), q: cu.q, s: cu.want.s });
    G.best.sort((a, b) => b.q - a.q); G.best = G.best.slice(0, 3);
    ev.push('pay:' + cu.id + ':' + cu.pay + ':' + id); cu.st = 'out'; cu.got = {};
    // the kid goes home with them
    if (G.kid && G.kid.parent === cu.id) G.kid.st = 'home';
    return true;
  }

  /* ---------- the kid in the racks ---------- */
  function kidSpawn(G, cu, ev) {
    const r = G.racks.filter(k => k.n > 0); if (!r.length) return;
    const k = G.racks.indexOf(pick(G, r));
    G.kid = { x: cu.x, y: cu.y, st: 'run', rack: k, parent: cu.id, t: 7 + rng(G) * 4, fx: 1, mv: false, pop: 0 };
    ev.push('kid');
  }
  function kidStep(G, ev) {
    const k = G.kid, par = G.cust.find(c => c.id === k.parent);
    if (k.pop > 0) k.pop -= DT;
    if (!par || par.st === 'gone' || par.st === 'out') k.st = 'home';
    if (k.st === 'home') { if (walkTo(G, k, G.door[0], G.door[1], CSPEED * 1.4)) G.kid = null; return; }
    const rk = G.racks[k.rack], [x, y] = rackSide(G, rk);
    if (k.st === 'run') { if (walkTo(G, k, x, y, CSPEED * 1.5)) { k.st = 'hide'; ev.push('hide:' + k.rack); } return; }
    // hiding: now and then something comes flying out of the rack
    k.x = (rk.tx + .5) * T; k.y = (rk.ty + .5) * T;
    if ((k.t -= DT) <= 0) {
      k.t = 8 + rng(G) * 5;
      if (rk.n > 0) { rk.n--; dropAt(G, gc({ p: rk.p, s: rk.s, c: rk.c, z: 1 }), k.x + (rng(G) - .5) * 60, k.y + 26 + rng(G) * 16); G.stats.messes++; ev.push('kidthrow:' + k.rack); }
    }
    // walking right past: boo!
    for (const id of IDS) {
      const p = G.p[id]; if (!free(p) || k.pop > 0) continue;
      if (edge(p, rk.tx, rk.ty) < 10 && p.mv && rng(G) < DT * 1.2) boo(G, id, ev);
    }
  }
  // the open floor beside a rack (for the kid to slip in from)
  function rackSide(G, rk) { for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!solid(G, rk.tx + dx, rk.ty + dy)) return [(rk.tx + dx + .5) * T, (rk.ty + dy + .5) * T]; return [(rk.tx + .5) * T, (rk.ty + 1.5) * T]; }
  function boo(G, id, ev) {
    const p = G.p[id], k = G.kid; if (!k) return;
    if (p.item >= 0) { dropAt(G, p.item, p.x - p.fx * 16, p.y - p.fy * 16 + 4); p.item = -1; }
    p.stun = STUN_T; k.pop = 1.2; G.stats.boos++; ev.push('boo:' + id + ':' + k.rack);
    // and off to another rack
    const r = G.racks.map((x, i) => i).filter(i => i !== k.rack && G.racks[i].n > 0); if (r.length) { const [x, y] = rackSide(G, G.racks[k.rack]); k.x = x; k.y = y; k.rack = pick(G, r); k.st = 'run'; }
  }

  /* ---------- the thief ---------- */
  function thiefStep(G, ev) {
    const th = G.thief;
    if (th.st === 'in') {
      const rk = G.racks[th.rack];
      if (rk.n <= 0) { const r = G.racks.map((x, i) => i).filter(i => G.racks[i].n > 0); if (!r.length) { th.st = 'flee'; return; } th.rack = pick(G, r); }
      const [x, y] = rackSide(G, G.racks[th.rack]);
      if (walkTo(G, th, x, y, CSPEED * 1.05)) { const k = G.racks[th.rack]; if (k.n > 0) { k.n--; th.item = gc({ p: k.p, s: k.s, c: k.c, z: 1 }); ev.push('steal:' + th.rack); } th.st = 'run'; }
    } else if (th.st === 'run') {
      // past the gate with it: the alarm, and a dash for the door
      if (!th.alarm && G.gateY >= 0 && tAt(th.y) >= G.gateY && th.item >= 0) { th.alarm = true; ev.push('alarm'); }
      if (walkTo(G, th, G.door[0], G.door[1], th.alarm ? SPEED * .92 : CSPEED * 1.05)) { if (th.item >= 0) { G.stats.thefts++; G.money -= THEFT_PTS; ev.push('escaped'); } G.thief = null; return; }
    } else if (th.st === 'flee') { if (walkTo(G, th, G.door[0], G.door[1], SPEED * 1.1)) { G.thief = null; return; } }
    // caught (or shooed) by whoever touches him
    if (th.st !== 'flee') for (const id of IDS) {
      const p = G.p[id]; if (!free(p) || Math.hypot(p.x - th.x, p.y - th.y) > CATCH_R) continue;
      if (th.item >= 0) { dropAt(G, th.item, th.x, th.y + 8); th.item = -1; G.stats.caught++; G.money += CATCH_PTS; ev.push('caught:' + id); }
      else ev.push('shoo:' + id);
      th.st = 'flee'; break;
    }
  }

  /* ---------- clothes on the floor ---------- */
  function putAt(G, x, y) {
    const open = (a, b) => !solid(G, tAt(a - 8), tAt(b - 6)) && !solid(G, tAt(a + 8), tAt(b - 6)) && !solid(G, tAt(a - 8), tAt(b + 6)) && !solid(G, tAt(a + 8), tAt(b + 6)) && tileAt(G, tAt(a), tAt(b)) !== 'D';
    if (open(x, y)) return [x, y];
    for (let r = 8; r <= 80; r += 8) for (let k = 0; k < 16; k++) { const a = x + Math.cos(k / 8 * Math.PI) * r, b = y + Math.sin(k / 8 * Math.PI) * r; if (open(a, b)) return [a, b]; }
    return [W / 2, H / 2];
  }
  function dropAt(G, g, x, y) { if (!okG(g)) return; const [a, b] = putAt(G, clamp(x, R, W - R), clamp(y, R, H - R)); G.items.push({ g, x: a, y: b }); }

  /* ---------- what the button does ---------- */
  function act(G, id, ev) {
    const p = G.p[id];
    if (!free(p) || p.lock > 0) return;
    if (G.st === 'show') { photo(G, id, ev); return; }
    if (G.st !== 'run') return;
    if (p.item >= 0) {
      const g = gd(p.item);
      // to a customer who still wants this piece
      const cu = G.cust.filter(c => (c.st === 'wait' || c.st === 'queue') && Math.hypot(c.x - p.x, c.y - p.y) < GIVE_R).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const to = cu.find(c => needs(c).includes(g.p));
      if (to) { to.got[g.p] = p.item; p.item = -1; p.lock = .25; ev.push('give:' + id + ':' + to.id + ':' + g.p); return; }
      if (cu.length) { ev.push('nope:' + id + ':' + cu[0].id); p.lock = .3; return; }
      // onto a sewing machine, or back on its rack: whichever is nearest (and in front)
      const nt = reach(G, p, 'YZr'), mt = nt && nt.c !== 'r' ? nt : null;
      if (mt) {
        const m = machAt(G, mt.tx, mt.ty);
        if (m.g >= 0 && !m.done) { sewPress(G, id, m, ev); return; }                    // waiting your turn: help sew meanwhile
        if (m.g >= 0) { ev.push('busy:' + id); p.lock = .3; return; }
        if ((m.dir < 0 && g.z === 0) || (m.dir > 0 && g.z === 2)) { ev.push('nosize:' + id + ':' + (m.dir < 0 ? 0 : 2)); p.lock = .3; return; }
        m.g = p.item; m.prog = 0; m.done = false; m.last = ''; p.item = -1; p.lock = .3; ev.push('put:' + id + ':' + G.mach.indexOf(m)); return;
      }
      const rt = nt && nt.c === 'r' ? nt : null;
      if (rt) {
        const rk = rackAt(G, rt.tx, rt.ty), ki = G.racks.indexOf(rk);
        if (G.kid && G.kid.st === 'hide' && G.kid.rack === ki) { boo(G, id, ev); return; }
        if (rk.p === g.p && rk.s === g.s && rk.c === g.c) { rk.n = Math.min(rk.max + 2, rk.n + 1); p.item = -1; p.lock = .4; G.stats.tidied++; ev.push('restock:' + id + ':' + ki); return; }
        ev.push('wrongrack:' + id); p.lock = .3; return;
      }
      dropAt(G, p.item, p.x - p.fx * 16, p.y - p.fy * 16 + 4); p.item = -1; ev.push('drop:' + id); return;
    }
    // empty hands: the till, something on the floor, a sewing machine, a rack (or the kid in it)
    if (reach(G, p, 'K') && ring(G, id, ev)) { p.lock = .3; return; }
    let gi = -1, gdd = PICK_R;
    G.items.forEach((it, i) => { const dx = it.x - p.x, dy = it.y - p.y, d = Math.hypot(dx, dy); if (d < PICK_R && (d < 12 || dx * p.fx + dy * p.fy > 0) && d < gdd) { gdd = d; gi = i; } });
    if (gi >= 0) { p.item = G.items[gi].g; G.items.splice(gi, 1); ev.push('pick:' + id); return; }
    const et = reach(G, p, 'YZr', (c, x, y) => c === 'r' || machAt(G, x, y).g >= 0), mt = et && et.c !== 'r' ? et : null;
    if (mt) {
      const m = machAt(G, mt.tx, mt.ty), mi = G.mach.indexOf(m);
      if (m.done) { p.item = m.g; m.g = -1; m.done = false; m.prog = 0; p.lock = .3; ev.push('mtake:' + id + ':' + mi); return; }
      sewPress(G, id, m, ev); return;
    }
    const rt = et && et.c === 'r' ? et : null;
    if (rt) {
      const rk = rackAt(G, rt.tx, rt.ty), ki = G.racks.indexOf(rk);
      if (G.kid && G.kid.st === 'hide' && G.kid.rack === ki) { G.stats.kids++; G.money += KID_PTS; G.kid.st = 'home'; ev.push('kidcaught:' + id); p.lock = .4; return; }
      if (rk.n <= 0) { ev.push('empty:' + id + ':' + ki); p.lock = .3; return; }
      rk.n--; p.item = gc({ p: rk.p, s: rk.s, c: rk.c, z: 1 }); p.lock = .25; ev.push('take:' + id + ':' + ki); return;
    }
  }

  // sewing: the two of you in turns is quick; alone, steadily, is slow; alone in a hurry tangles the thread
  function sewPress(G, id, m, ev) {
    const gap = G.t - m.lastT, mi = G.mach.indexOf(m);
    if (m.last && m.last !== id && gap >= SEW_GAP[0] && gap <= SEW_GAP[1]) m.prog += 16;
    else if (m.last === id && gap < SOLO_GAP) { m.prog = Math.max(0, m.prog - 10); G.stats.tangles++; ev.push('tangle:' + id + ':' + mi); }
    else m.prog += 6;
    m.last = id; m.lastT = G.t; ev.push('sew:' + id + ':' + mi);
    if (m.prog >= 100) { const g = gd(m.g); g.z = clamp(g.z + m.dir, 0, 2); m.g = gc(g); m.done = true; m.prog = 100; m.last = ''; G.stats.sewn++; ev.push('sewn:' + mi + ':' + g.z); }
  }

  /* ---------- closing time: the fashion show ---------- */
  function close(G, ev) {
    G.st = 'close'; G.ct = 0; ev.push('close');
    for (const cu of G.cust) {
      if (cu.st === 'pay') { G.money += cu.pay; G.stats.served++; if (cu.out.perfect) G.stats.perfect++; G.best.push({ look: cu.look, z: cu.z, got: cu.want.pieces.map(p => cu.got[p]), q: cu.q, s: cu.want.s }); cu.st = 'out'; }
      else if (cu.st !== 'gone' && cu.st !== 'out') leave(G, cu, ev, false);
    }
    G.best.sort((a, b) => b.q - a.q); G.best = G.best.slice(0, 3);
    if (G.thief) G.thief.st = 'flee';
    if (G.kid) G.kid.st = 'home';
    for (const id of IDS) G.p[id].item = -1;
  }
  function photo(G, id, ev) {
    const sh = G.show, p = G.p[id]; if (!sh) return;
    const i = Math.floor((sh.t - SHOW_IN) / MODEL_T), lt = sh.t - SHOW_IN - i * MODEL_T;
    p.lock = .3;
    if (i < 0 || i >= G.best.length || p.flashI === i) { ev.push('flash:' + id + ':-1'); return; }
    p.flashI = i;
    if (lt >= FLASH[0] && lt <= FLASH[1]) {
      G.money += PHOTO_PTS; G.stats.photos++; sh.shots[i] = sh.shots[i] || {}; sh.shots[i][id] = G.t; ev.push('flash:' + id + ':' + i);
      const o = sh.shots[i][other(id)];
      if (o != null && Math.abs(o - G.t) < .35 && !sh.duo[i]) { sh.duo[i] = 1; G.money += DUO_PTS; G.stats.duos++; ev.push('duo:' + i); }
    } else ev.push('flash:' + id + ':-1');
  }
  function finish(G, ev) { G.over = true; G.won = true; G.score = Math.max(0, Math.round(G.money)); ev.push('over'); }

  /* one step. inp = { pink: { mx, my, act, still }, mint: ... }. guest: the guest's phone walks its own player only (the
     host decides everything else). */
  function step(G, inp, guest) {
    const ev = G.pend.length ? G.pend.splice(0) : [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    if (G.st === 'run') for (const id of IDS) { const q = inp && inp[id]; if (q && !q.still) move(G, id, q); }
    if (guest) return ev;
    const def = G.def;
    for (const id of IDS) { const p = G.p[id]; if (p.stun > 0) p.stun = Math.max(0, p.stun - DT); if (p.lock > 0) p.lock = Math.max(0, p.lock - DT); }
    for (const id of IDS) { const q = inp && inp[id]; if (q && q.act && !q.still) act(G, id, ev); }
    if (G.st === 'run') {
      G.rt += DT;
      const left = timeLeft(G);
      if (left <= 30 && left + DT > 30) ev.push('last30');
      // customers come in, while there is time to serve them
      const busy = G.cust.filter(c => c.st !== 'gone' && c.st !== 'out').length;
      if (G.rt >= G.nextC && busy < (def.max || 3) && left > 40) { spawn(G, ev); G.nextC = G.rt + (def.rate || 20) * (.75 + rng(G) * .5); }
      for (const cu of G.cust) custStep(G, cu, ev);
      G.cust = G.cust.filter(c => c.st !== 'gone');
      if (G.kid) kidStep(G, ev);
      // a thief, when it is time
      const ths = def.thief || [];
      if (!G.thief && G.thiefI < ths.length && G.rt >= ths[G.thiefI]) {
        G.thiefI++; const r = G.racks.map((x, i) => i).filter(i => G.racks[i].n > 0);
        if (r.length) { G.thief = { x: G.door[0], y: G.door[1], st: 'in', rack: pick(G, r), item: -1, alarm: false, fx: 1, mv: false }; ev.push('thief'); }
      }
      if (G.thief) thiefStep(G, ev);
      // a delivery tops the racks up
      if (def.delivery && (G.delT -= DT) <= 0) { G.delT = def.delivery; let n = 0; for (const rk of G.racks) if (rk.n < rk.max) { rk.n++; n++; } if (n) ev.push('delivery'); }
      for (const m of G.mach) if (m.g >= 0 && !m.done && G.t - m.lastT > 2) m.prog = Math.max(0, m.prog - 4 * DT);   // left alone, it slips back
      if (left <= 0) close(G, ev);
      return ev;
    }
    if (G.st === 'close') {
      G.ct += DT;
      for (const cu of G.cust) if (cu.st === 'out' && walkTo(G, cu, G.door[0], G.door[1], CSPEED * 1.6)) cu.st = 'gone';
      G.cust = G.cust.filter(c => c.st !== 'gone');
      if (G.thief && walkTo(G, G.thief, G.door[0], G.door[1], SPEED)) G.thief = null;
      if (G.kid && walkTo(G, G.kid, G.door[0], G.door[1], SPEED)) G.kid = null;
      if (G.ct >= CLOSE_T) { if (G.best.length) { G.st = 'show'; G.show = { t: 0, shots: {}, duo: {} }; ev.push('show'); } else finish(G, ev); }
      return ev;
    }
    if (G.st === 'show') {
      const sh = G.show, i0 = Math.floor((sh.t - SHOW_IN) / MODEL_T); sh.t += DT;
      const i1 = Math.floor((sh.t - SHOW_IN) / MODEL_T);
      if (i1 !== i0 && i1 >= 0 && i1 < G.best.length) ev.push('walk:' + i1);
      if (sh.t >= SHOW_IN + G.best.length * MODEL_T + 1.5) finish(G, ev);
    }
    return ev;
  }
  // what the button would do for this one just now (for the screen to point at): k is 'cust', 'mach', 'rack', 'kid',
  // 'till', 'item', 'drop' or '' (and where); no change to anything
  function target(G, id) {
    const p = G.p[id]; if (G.st !== 'run' || !free(p)) return null;
    if (p.item >= 0) {
      const g = gd(p.item);
      const cu = G.cust.filter(c => (c.st === 'wait' || c.st === 'queue') && Math.hypot(c.x - p.x, c.y - p.y) < GIVE_R).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const to = cu.find(c => needs(c).includes(g.p));
      if (to) return { k: 'cust', x: to.x, y: to.y, ok: true, cid: to.id };
      if (cu.length) return { k: 'cust', x: cu[0].x, y: cu[0].y, ok: false, cid: cu[0].id };
      const nt = reach(G, p, 'YZr');
      if (nt && nt.c !== 'r') { const m = machAt(G, nt.tx, nt.ty); return { k: 'mach', tx: nt.tx, ty: nt.ty, ok: m.g < 0 ? !((m.dir < 0 && g.z === 0) || (m.dir > 0 && g.z === 2)) : !m.done }; }
      if (nt) { const rk = rackAt(G, nt.tx, nt.ty); return { k: 'rack', tx: nt.tx, ty: nt.ty, ok: rk.p === g.p && rk.s === g.s && rk.c === g.c }; }
      return { k: 'drop', x: p.x - p.fx * 16, y: p.y - p.fy * 16 + 4, ok: true };
    }
    if (reach(G, p, 'K')) { const cu = G.cust.find(o => o.st === 'pay'); if (cu && Math.hypot(cu.x - G.tillQ[0][0], cu.y - G.tillQ[0][1]) <= 6) { const t = reach(G, p, 'K'); return { k: 'till', tx: t.tx, ty: t.ty, ok: true }; } }
    let it = null, gdd = PICK_R;
    for (const o of G.items) { const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy); if (d < PICK_R && (d < 12 || dx * p.fx + dy * p.fy > 0) && d < gdd) { gdd = d; it = o; } }
    if (it) return { k: 'item', x: it.x, y: it.y, ok: true };
    const et = reach(G, p, 'YZr', (c, x, y) => c === 'r' || machAt(G, x, y).g >= 0);
    if (et && et.c !== 'r') return { k: 'mach', tx: et.tx, ty: et.ty, ok: true };
    if (et) { const ki = G.racks.indexOf(rackAt(G, et.tx, et.ty)); if (G.kid && G.kid.st === 'hide' && G.kid.rack === ki) return { k: 'kid', tx: et.tx, ty: et.ty, ok: true }; return { k: 'rack', tx: et.tx, ty: et.ty, ok: G.racks[ki].n > 0 }; }
    return null;
  }
  function stars(G) { if (!G.over) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  const clock = G => ({ t: G.rt, len: G.def.time || TIME, left: Math.max(0, timeLeft(G)) });
  // the show: which model is out, and how far along the runway (0..1), and whether the pose is on now
  function showAt(G) {
    const sh = G.show; if (!sh) return null;
    const i = Math.floor((sh.t - SHOW_IN) / MODEL_T), lt = sh.t - SHOW_IN - i * MODEL_T;
    return { i, lt, k: clamp(lt / FLASH[0], 0, 1), pose: lt >= FLASH[0] && lt <= FLASH[1], n: G.best.length, t: sh.t };
  }

  /* ---------- online ---------- */
  function encode(G) {
    const cu = G.cust.map(c => [c.id, r1(c.x), r1(c.y), ['in', 'wait', 'queue', 'try', 'pose', 'pay', 'out'].indexOf(c.st), c.room, c.z, c.look, c.want.s, c.want.c, c.want.pieces.length,
      [0, 1, 2, 3].map(p => (c.got[p] == null ? -1 : c.got[p])), r1(c.pat), c.patMax, r1(c.tillPat), c.out ? c.out.kind : '', c.out ? c.out.q : 0, c.angry ? 1 : 0, c.mv ? 1 : 0, c.fx, r1(c.t)]);
    const k = G.kid, th = G.thief;
    return {
      t: r2(G.t), rt: r2(G.rt), st: G.st, ov: G.over ? 1 : 0, mo: Math.round(G.money), sc: G.score, cv: [G.cv.pink, G.cv.mint],
      p: IDS.map(id => { const p = G.p[id]; return [r1(p.x), r1(p.y), p.item, r2(p.stun), p.mv ? 1 : 0, r2(p.fx), r2(p.fy)]; }),
      rk: G.racks.map(r => r.n).join(','), rm: G.rooms.map(r => r.cid), mc: G.mach.map(m => [m.g, Math.round(m.prog), m.done ? 1 : 0]),
      it: G.items.slice(0, 40).map(i => [i.g, r1(i.x), r1(i.y)]), cu,
      kd: k ? [r1(k.x), r1(k.y), ['run', 'hide', 'home'].indexOf(k.st), k.rack, r2(k.pop)] : 0,
      th: th ? [r1(th.x), r1(th.y), ['in', 'run', 'flee'].indexOf(th.st), th.item, th.alarm ? 1 : 0] : 0,
      sh: G.show ? r2(G.show.t) : -1, bs: G.best.map(b => [b.look, b.z, b.got, b.q, b.s]), s: G.stats
    };
  }
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.rt = num(m.rt, G.rt); G.st = ['count', 'run', 'close', 'show'].includes(m.st) ? m.st : G.st; G.over = !!m.ov; G.won = G.over;
    G.money = num(m.mo, G.money); G.score = Math.max(0, num(m.sc, G.score));
    if (Array.isArray(m.p) && Array.isArray(m.cv)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id], cv = Number.isInteger(m.cv[i]) ? m.cv[i] : G.cv[id]; if (!Array.isArray(e)) return;
      if (id !== own || cv !== G.cv[id]) { p.x = clamp(num(e[0], p.x), 0, W); p.y = clamp(num(e[1], p.y), 0, H); p.mv = !!e[4]; p.fx = num(e[5], p.fx); p.fy = num(e[6], p.fy); }
      G.cv[id] = cv; p.item = okG(e[2]) ? e[2] : -1; p.stun = num(e[3]);
    });
    if (typeof m.rk === 'string') m.rk.split(',').forEach((v, i) => { if (G.racks[i]) G.racks[i].n = clamp(num(+v, G.racks[i].n) | 0, 0, 20); });
    if (Array.isArray(m.rm)) G.rooms.forEach((r, i) => { r.cid = Number.isInteger(m.rm[i]) ? m.rm[i] : -1; });
    if (Array.isArray(m.mc)) G.mach.forEach((q, i) => { const e = m.mc[i]; if (!Array.isArray(e)) return; q.g = okG(e[0]) ? e[0] : -1; q.prog = num(e[1]); q.done = !!e[2]; });
    if (Array.isArray(m.it)) G.items = m.it.filter(a => Array.isArray(a) && okG(a[0])).map(a => ({ g: a[0], x: num(a[1]), y: num(a[2]) }));
    if (Array.isArray(m.cu)) G.cust = m.cu.filter(Array.isArray).map(a => {
      const pieces = [0, 1, 2, 3].slice(0, clamp(num(a[9], 2) | 0, 1, 4)), got = {};
      if (Array.isArray(a[10])) a[10].forEach((v, p) => { if (okG(v)) got[p] = v; });
      return { id: a[0], x: num(a[1]), y: num(a[2]), st: ['in', 'wait', 'queue', 'try', 'pose', 'pay', 'out'][a[3]] || 'in', room: num(a[4], -1), z: clamp(num(a[5], 1) | 0, 0, 2), look: num(a[6]),
        want: { s: clamp(num(a[7]) | 0, 0, STYLES.length - 1), c: num(a[8], -1), pieces }, got, pat: num(a[11]), patMax: num(a[12], PATIENCE), tillPat: num(a[13]),
        out: a[14] ? { kind: String(a[14]).slice(0, 8), q: num(a[15]) } : null, angry: !!a[16], mv: !!a[17], fx: num(a[18], 1), t: num(a[19]) };
    });
    const rk = v => (Number.isInteger(v) && G.racks[v] ? v : 0);
    G.kid = Array.isArray(m.kd) && G.racks.length ? { x: num(m.kd[0]), y: num(m.kd[1]), st: ['run', 'hide', 'home'][m.kd[2]] || 'run', rack: rk(m.kd[3]), pop: num(m.kd[4]), fx: 1, parent: -1, t: 9 } : null;
    G.thief = Array.isArray(m.th) && G.racks.length ? { x: num(m.th[0]), y: num(m.th[1]), st: ['in', 'run', 'flee'][m.th[2]] || 'in', rack: 0, item: okG(m.th[3]) ? m.th[3] : -1, alarm: !!m.th[4], fx: 1 } : null;
    G.show = num(m.sh, -1) >= 0 ? Object.assign(G.show || { shots: {}, duo: {} }, { t: m.sh }) : null;
    if (Array.isArray(m.bs)) G.best = m.bs.filter(Array.isArray).slice(0, 3).map(b => ({ look: num(b[0]), z: clamp(num(b[1], 1) | 0, 0, 2), got: Array.isArray(b[2]) ? b[2].filter(okG) : [], q: num(b[3]), s: num(b[4]) }));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  function guestMsg(G, own, inp, presses) {
    const i = inp || {}, p = G.p[own];
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), a: presses | 0, x: r1(p.x), y: r1(p.y), mv: p.mv ? 1 : 0, fx: r2(p.fx), fy: r2(p.fy), cv: G.cv[own] };
  }
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

  return { DT, START, T, COLS, ROWS, W, H, R, SPEED, CSPEED, REACH, PICK_R, GIVE_R, CATCH_R, TIME, PATIENCE, TILL_PAT, TRY_T, POSE_T, STUN_T, SEW_GAP, SOLO_GAP, STOCK, CLOSE_T,
    PRICE, TIP, LOST_PTS, THEFT_PTS, CATCH_PTS, KID_PTS, PHOTO_PTS, DUO_PTS, MODEL_T, SHOW_IN, FLASH, STYLES, PIECES, COLORS, SIZES, SOLID,
    gc, gd, okG, load, tileAt, solid, reach, edge, rackAt, machAt, roomSpot, needs, judge, collide, free, step, target, stars, clock, showAt, encode, apply, guestMsg, hostHears };
})();

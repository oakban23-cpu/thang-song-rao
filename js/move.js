/* Moving house (ย้ายบ้านแบกของ): big furniture needs both players, one at each end. While both hold it, it moves as
   one rigid piece: both pushing the same way carries it along, pushing opposite ways across it turns it, and walls stop
   it (it slides along or pivots round an end when it can). Bumping it hard against something dents it, fragile things
   more. Small things (boxes, a TV, plants) one player carries alone. Furniture is delivered by setting it down on its
   outline (lined up and turned the right way); small things anywhere inside their room. Delivered things are worth
   their value less the damage; whatever is left on the truck in the rain gets wet. Pixels; the house is 20x11 tiles. */
const Mov = (() => {
  'use strict';
  const DT = 1 / 120, T = 48, W = 20, H = 11, PR = 13;
  const WALK = 150, CARRY = 100, GRAB_R = 30, PICK_R = 28;
  const PLACE_D = 20, PLACE_A = 0.26, BUMP_MIN = 30, BUMP_GAP = 0.4, TIP = 3;
  const KINDS = {
    sofa: { L: 112, Wd: 44, two: true, value: 300, fragile: .5, speed: .9, name: 'โซฟา' },
    bed: { L: 116, Wd: 62, two: true, value: 350, fragile: .3, speed: .85, name: 'เตียง' },
    table: { L: 88, Wd: 50, two: true, value: 200, fragile: .5, speed: 1, name: 'โต๊ะ' },
    wardrobe: { L: 96, Wd: 38, two: true, value: 300, fragile: .6, speed: .75, name: 'ตู้เสื้อผ้า' },
    fridge: { L: 60, Wd: 44, two: true, value: 400, fragile: .8, speed: .7, name: 'ตู้เย็น' },
    mirror: { L: 84, Wd: 14, two: true, value: 250, fragile: 1.6, speed: 1, name: 'กระจกบานใหญ่' },
    piano: { L: 104, Wd: 50, two: true, value: 800, fragile: 1, speed: .55, name: 'เปียโน' },
    shrine: { L: 56, Wd: 40, two: true, value: 600, fragile: 1.2, speed: .8, name: 'ศาลพระภูมิ', facing: true },
    box: { L: 26, Wd: 26, two: false, value: 50, fragile: .4, speed: 1, name: 'กล่อง' },
    tv: { L: 40, Wd: 14, two: false, value: 250, fragile: 1.8, speed: .9, name: 'ทีวี' },
    plant: { L: 24, Wd: 24, two: false, value: 80, fragile: 1, speed: 1, name: 'ต้นไม้' }
  };
  const SOLID = new Set(['#', 'T', 'f', 'w']);
  const OUTSIDE = new Set([',', '=']);
  const WHO = ['pink', 'mint'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
  const tileAt = (def, tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? '#' : def.map[ty][tx]);
  const solid = (def, tx, ty) => SOLID.has(tileAt(def, tx, ty));
  const reach = k => KINDS[k].L / 2 + PR + 2;                         // centre to where a holder stands

  /* ---------- geometry ---------- */
  function circleHitsWalls(def, x, y, r) {
    for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++) for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++) {
      if (!solid(def, tx, ty)) continue;
      const nx = clamp(x, tx * T, tx * T + T), ny = clamp(y, ty * T, ty * T + T);
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r - 1e-6) return true;
    }
    return false;
  }
  const corners = (cx, cy, a, hl, hw) => { const c = Math.cos(a), s = Math.sin(a); return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]); };
  function overlap(P, Q) {                                          // separating axis test for two convex polygons
    for (const poly of [P, Q]) for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length], ax = y1 - y2, ay = x2 - x1;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, y] of P) { const d = x * ax + y * ay; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const [x, y] of Q) { const d = x * ax + y * ay; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 <= b0 + 1e-6 || b1 <= a0 + 1e-6) return false;
    }
    return true;
  }
  function rectHitsWalls(def, P) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    for (let ty = Math.floor(Math.min(...ys) / T); ty <= Math.floor(Math.max(...ys) / T); ty++) for (let tx = Math.floor(Math.min(...xs) / T); tx <= Math.floor(Math.max(...xs) / T); tx++) {
      if (solid(def, tx, ty) && overlap(P, [[tx * T, ty * T], [tx * T + T, ty * T], [tx * T + T, ty * T + T], [tx * T, ty * T + T]])) return true;
    }
    return false;
  }
  function circleHitsPoly(x, y, r, P) {
    let inside = true;
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], ex = x2 - x1, ey = y2 - y1, L2 = ex * ex + ey * ey;
      const k = clamp(((x - x1) * ex + (y - y1) * ey) / L2, 0, 1), dx = x - (x1 + ex * k), dy = y - (y1 + ey * k);
      if (dx * dx + dy * dy < r * r - 1e-6) return true;
      if (ex * (y - y1) - ey * (x - x1) < 0) inside = false;
    }
    return inside;
  }
  const poly = it => corners(it.x, it.y, it.a, KINDS[it.k].L / 2, KINDS[it.k].Wd / 2);
  // things on the floor (or set in place) that block walking and carrying
  // (small things already delivered are stacked out of the way and block nothing, so they can never seal a door)
  const blockers = (G, skip) => G.items.filter((it, i) => i !== skip && (it.st === 'floor' || (it.st === 'placed' && KINDS[it.k].two)));
  function poseFree(G, i, x, y, a) {
    const it = G.items[i], k = KINDS[it.k], P = corners(x, y, a, k.L / 2, k.Wd / 2);
    if (rectHitsWalls(G.def, P)) return false;
    const bl = blockers(G, i);
    for (const o of bl) if (overlap(P, poly(o))) return false;
    if (k.two) for (const e of [-1, 1]) {
      const hx = x + Math.cos(a) * e * reach(it.k), hy = y + Math.sin(a) * e * reach(it.k);
      if (circleHitsWalls(G.def, hx, hy, PR)) return false;
      for (const o of bl) if (circleHitsPoly(hx, hy, PR, poly(o))) return false;
    }
    return true;
  }
  function spotFree(G, x, y, skip) {
    if (circleHitsWalls(G.def, x, y, PR)) return false;
    for (const o of blockers(G, skip)) if (circleHitsPoly(x, y, PR, poly(o))) return false;
    return true;
  }
  const handle = (it, end) => { const r = reach(it.k) * (end ? 1 : -1); return [it.x + Math.cos(it.a) * r, it.y + Math.sin(it.a) * r]; };
  function inZone(def, z, x, y) { const r = def.zones[z]; return r && x >= r[0] * T && x <= (r[2] + 1) * T && y >= r[1] * T && y <= (r[3] + 1) * T; }
  function aligned(it, to) {
    const k = KINDS[it.k], da = k.facing ? Math.abs(wrap(it.a - to[2])) : Math.min(Math.abs(wrap(it.a - to[2])), Math.abs(wrap(it.a - to[2] - Math.PI)));
    return Math.hypot(it.x - to[0], it.y - to[1]) < PLACE_D && da < PLACE_A;
  }

  /* ---------- state ---------- */
  function load(def) {
    const sp = def.spawn;
    const G = {
      def, t: 0, over: false, done: false, money: 0, tip: 0, bumpT: -9,
      p: { pink: { x: (sp.pink[0] + .5) * T, y: (sp.pink[1] + .5) * T, hold: -1, end: 0, fx: 1, fy: 0 }, mint: { x: (sp.mint[0] + .5) * T, y: (sp.mint[1] + .5) * T, hold: -1, end: 0, fx: 1, fy: 0 } },
      items: def.items.map(d => ({ k: d.k, x: d.at[0] * T, y: d.at[1] * T, a: (d.at[2] || 0) * Math.PI / 180, st: 'floor', dmg: 0, wet: 0, pinkEnd: -1, mintEnd: -1,
        to: d.to ? [d.to[0] * T, d.to[1] * T, d.to[2] * Math.PI / 180] : null, zone: d.zone || null })),
      stats: { delivered: 0, bumps: 0, broken: 0, wet: 0 }, net: null
    };
    return G;
  }
  const worth = it => Math.round(KINDS[it.k].value * Math.max(0, 1 - it.dmg / 100));
  function dent(G, it, k, ev) {
    if (G.t - G.bumpT < BUMP_GAP) return;
    G.bumpT = G.t; G.stats.bumps++;
    const was = it.dmg;
    it.dmg = Math.min(100, it.dmg + KINDS[it.k].fragile * k);
    ev.push('bump:' + G.items.indexOf(it));
    if (was < 100 && it.dmg >= 100) { G.stats.broken++; ev.push('broken:' + G.items.indexOf(it)); }
  }
  // the act button: grab or let go
  function act(G, who, ev) {
    const P = G.p[who];
    if (P.hold >= 0) {
      const it = G.items[P.hold], k = KINDS[it.k];
      if (k.two) { putDown(G, P.hold, ev); return; }
      // a small thing goes down just in front, if there is room
      const x = P.x + P.fx * 18, y = P.y + P.fy * 18;
      const nx = spotOk(G, P.hold, x, y) ? x : P.x, ny = spotOk(G, P.hold, x, y) ? y : P.y;
      it.x = nx; it.y = ny; it.st = 'floor'; P.hold = -1;
      if (it.zone && inZone(G.def, it.zone, it.x, it.y)) deliver(G, G.items.indexOf(it), ev); else ev.push('drop:' + who);
      return;
    }
    // nearest handle of a big thing, or a small thing within reach
    let best = -1, bestD = 1e9, bestEnd = 0;
    G.items.forEach((it, i) => {
      if (it.st !== 'floor' && it.st !== 'carried' && it.st !== 'wait') return;
      const k = KINDS[it.k];
      if (k.two) {
        for (const e of [0, 1]) {
          if ((who === 'pink' ? it.mintEnd : it.pinkEnd) === e) continue;
          const [hx, hy] = handle(it, e), d = Math.hypot(hx - P.x, hy - P.y);
          if (d < GRAB_R && d < bestD) { best = i; bestD = d; bestEnd = e; }
        }
      } else if (it.st === 'floor') { const d = Math.hypot(it.x - P.x, it.y - P.y); if (d < PICK_R + 6 && d < bestD) { best = i; bestD = d; bestEnd = 0; } }
    });
    if (best < 0) { ev.push('nothing:' + who); return; }
    const it = G.items[best], k = KINDS[it.k];
    if (!k.two) { it.st = 'held'; P.hold = best; ev.push('pick:' + who + ':' + best); return; }
    const [hx, hy] = handle(it, bestEnd);
    if (!spotFree(G, hx, hy, best)) { ev.push('nothing:' + who); return; }
    P.x = hx; P.y = hy; P.hold = best; P.end = bestEnd; it[who + 'End'] = bestEnd;
    it.st = it.pinkEnd >= 0 && it.mintEnd >= 0 ? 'carried' : 'wait';
    ev.push((it.st === 'carried' ? 'lift:' : 'grab:') + who + ':' + best);
  }
  const spotOk = (G, i, x, y) => !circleHitsWalls(G.def, x, y, 12) && blockers(G, i).every(o => !circleHitsPoly(x, y, 12, poly(o)));
  function putDown(G, i, ev) {
    const it = G.items[i];
    for (const w of WHO) if (G.p[w].hold === i) G.p[w].hold = -1;
    it.pinkEnd = it.mintEnd = -1; it.st = 'floor';
    if (it.to && aligned(it, it.to) && poseFree(G, i, it.to[0], it.to[1], it.to[2])) { it.x = it.to[0]; it.y = it.to[1]; it.a = it.to[2]; deliver(G, i, ev); }
    else ev.push('down:' + i);
    for (const w of WHO) unstick(G, w);
  }
  function deliver(G, i, ev) {
    const it = G.items[i];
    it.st = 'placed'; G.money += worth(it); G.stats.delivered++;
    ev.push('deliver:' + i);
    if (G.items.every(q => q.st === 'placed')) { G.done = true; G.over = true; G.tip = Math.max(0, Math.round((G.def.time - G.t) * TIP)); G.money += G.tip; ev.push('alldone'); }
  }
  // someone overlapping a wall or furniture (a piece snapped into place next to them): step out to the nearest free spot
  function unstick(G, who) {
    const P = G.p[who], skip = P.hold >= 0 ? P.hold : -1;
    if (spotFree(G, P.x, P.y, skip)) return;
    for (let r = 2; r <= 40; r += 2) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (spotFree(G, x, y, skip)) { P.x = x; P.y = y; return; }
    }
  }
  // walking: slide along walls and furniture, one axis at a time
  function walk(G, who, mx, my, sp) {
    unstick(G, who);
    const P = G.p[who], m = Math.hypot(mx, my);
    if (m < 0.15) return;
    const k = Math.min(1, m), vx = mx / m * k * sp * DT, vy = my / m * k * sp * DT;
    P.fx = mx / m; P.fy = my / m;
    const skip = P.hold >= 0 ? P.hold : -1;
    if (spotFree(G, P.x + vx, P.y, skip)) P.x += vx;
    if (spotFree(G, P.x, P.y + vy, skip)) P.y += vy;
  }
  // carrying a big thing: each holder pulls their end; the piece stays rigid; if the move is blocked, try sliding,
  // turning on the spot, or pivoting round either end
  function carry(G, i, inp, ev) {
    const it = G.items[i], k = KINDS[it.k], R = reach(it.k), sp = CARRY * k.speed * DT;
    const want = [[0, 0], [0, 0]];
    for (const w of WHO) { const e = it[w + 'End'], q = inp[w] || {}, m = Math.hypot(q.mx || 0, q.my || 0); if (m > .15) { const s = Math.min(1, m) / m; want[e] = [(q.mx || 0) * s * sp, (q.my || 0) * s * sp]; } }
    if (!want[0][0] && !want[0][1] && !want[1][0] && !want[1][1]) return;
    const [ax, ay] = handle(it, 0), [bx, by] = handle(it, 1);
    const a2 = [ax + want[0][0], ay + want[0][1]], b2 = [bx + want[1][0], by + want[1][1]];
    const rod = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return Math.atan2(dy, dx) + (L < 1e-6 ? 0 : 0); };
    const full = { x: (a2[0] + b2[0]) / 2, y: (a2[1] + b2[1]) / 2, a: rod(a2, b2) };
    const tx = (want[0][0] + want[1][0]) / 2, ty = (want[0][1] + want[1][1]) / 2;
    const pivA = rod([ax, ay], b2), pivB = rod(a2, [bx, by]);
    const tries = [full, { x: it.x + tx, y: it.y + ty, a: it.a }, { x: it.x + tx, y: it.y, a: it.a }, { x: it.x, y: it.y + ty, a: it.a }, { x: it.x, y: it.y, a: full.a },
      { x: ax + Math.cos(pivA) * R, y: ay + Math.sin(pivA) * R, a: pivA }, { x: bx - Math.cos(pivB) * R, y: by - Math.sin(pivB) * R, a: pivB }];
    // a forgiving touch: if the move just grazes something, try it nudged a pixel or two and a degree either way
    const nudges = [];
    for (const [nx, ny, na] of [[2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, .02], [0, 0, -.02], [2, 0, .02], [-2, 0, -.02], [0, 2, .02], [0, -2, -.02], [2, 0, -.02], [-2, 0, .02], [0, 2, -.02], [0, -2, .02]]) nudges.push({ x: full.x + nx, y: full.y + ny, a: full.a + na });
    tries.splice(1, 0, ...nudges);
    let got = null;
    for (const c of tries) if (poseFree(G, i, c.x, c.y, c.a)) { got = c; break; }
    // how hard did it hit? for each end, the part of the push that did not happen; sliding along a wall loses
    // little of it, driving straight into one loses nearly all of it
    let impact = 0;
    const to = got || { x: it.x, y: it.y, a: it.a };
    for (const e of [0, 1]) {
      const wv = want[e], w2 = wv[0] * wv[0] + wv[1] * wv[1]; if (w2 < 1e-9) continue;
      const r = reach(it.k) * (e ? 1 : -1), was = e ? [bx, by] : [ax, ay], now = [to.x + Math.cos(to.a) * r, to.y + Math.sin(to.a) * r];
      const prog = clamp(((now[0] - was[0]) * wv[0] + (now[1] - was[1]) * wv[1]) / w2, 0, 1);
      impact = Math.max(impact, Math.sqrt(w2) / DT * (1 - prog));
    }
    if (impact > 0.7 * CARRY * k.speed) dent(G, it, 5, ev);
    if (!got) return;
    it.x = got.x; it.y = got.y; it.a = wrap(got.a);
    for (const w of WHO) { const [hx, hy] = handle(it, it[w + 'End']); G.p[w].x = hx; G.p[w].y = hy; }
  }
  /* one step. inp: { pink: { mx, my, act }, mint: ... } with act true on the step the button went down */
  function step(G, inp) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    for (const w of WHO) if (inp && inp[w] && inp[w].act) act(G, w, ev);
    // a big thing both are holding moves together; anyone else walks (holding one end alone, you cannot move)
    const carried = new Set();
    G.items.forEach((it, i) => { if (it.st === 'carried') { carry(G, i, inp || {}, ev); carried.add(i); } });
    for (const w of WHO) {
      const P = G.p[w], q = (inp && inp[w]) || {};
      if (P.hold >= 0 && KINDS[G.items[P.hold].k].two) continue;
      const before = [P.x, P.y];
      walk(G, w, q.mx || 0, q.my || 0, WALK * (P.hold >= 0 ? KINDS[G.items[P.hold].k].speed : 1));
      if (P.hold >= 0) {
        const it = G.items[P.hold]; it.x = P.x; it.y = P.y - 6;
        const m = Math.hypot(q.mx || 0, q.my || 0), moved = Math.hypot(P.x - before[0], P.y - before[1]) / DT;
        if (m > .6 && moved < WALK * .3) dent(G, it, 3, ev);
      }
    }
    void carried;
    // rain soaks whatever is still outside on the ground
    if (G.def.rain) G.items.forEach((it, i) => {
      if (it.st !== 'floor' && it.st !== 'wait') return;
      if (!OUTSIDE.has(tileAt(G.def, Math.floor(it.x / T), Math.floor(it.y / T)))) return;
      it.wet += DT;
      if (it.wet > G.def.rain) { const was = it.dmg; it.dmg = Math.min(100, it.dmg + 1.2 * DT); if (Math.floor(was / 10) !== Math.floor(it.dmg / 10)) ev.push('wet:' + i); }
    });
    if (G.t >= G.def.time) { G.over = true; ev.push('timeup'); }
    return ev;
  }
  const total = def => def.items.reduce((s, d) => s + KINDS[d.k].value, 0);
  function stars(G) { const s = G.def.stars; return G.money >= s[2] ? 3 : G.money >= s[1] ? 2 : G.money >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  const ST = ['floor', 'wait', 'carried', 'held', 'placed'];
  function encode(G) {
    return { t: r3(G.t), m: G.money, tp: G.tip, ov: G.over ? 1 : 0, dn: G.done ? 1 : 0, bt: r3(G.bumpT),
      p: WHO.map(w => { const P = G.p[w]; return [r1(P.x), r1(P.y), P.hold, P.end, Math.round(P.fx * 100) / 100, Math.round(P.fy * 100) / 100]; }),
      it: G.items.map(it => [r1(it.x), r1(it.y), r3(it.a), ST.indexOf(it.st), Math.round(it.dmg * 10) / 10, it.pinkEnd, it.mintEnd, r1(it.wet)]), s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  function apply(G, m, local) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.it) || m.it.length !== G.items.length) return;
    G.t = num(m.t, G.t); G.money = num(m.m, G.money); G.tip = num(m.tp, 0); G.over = !!m.ov; G.done = !!m.dn; G.bumpT = num(m.bt, G.bumpT);
    m.it.forEach((q, i) => {
      if (!Array.isArray(q)) return;
      const it = G.items[i];
      it.x = num(q[0], it.x); it.y = num(q[1], it.y); it.a = num(q[2], it.a); it.st = ST[q[3]] || it.st; it.dmg = clamp(num(q[4], it.dmg), 0, 100);
      it.pinkEnd = q[5] === 0 || q[5] === 1 ? q[5] : -1; it.mintEnd = q[6] === 0 || q[6] === 1 ? q[6] : -1; it.wet = Math.max(0, num(q[7], it.wet));
    });
    if (Array.isArray(m.p)) WHO.forEach((w, i) => {
      const q = m.p[i]; if (!Array.isArray(q)) return;
      const P = G.p[w];
      P.hold = Number.isInteger(q[2]) && q[2] < G.items.length ? q[2] : -1; P.end = q[3] === 1 ? 1 : 0;
      // the guest walks its own player itself unless both are carrying something (the snapshot is a round trip old,
      // so small gaps are just lag); the host's word wins only on a real disagreement
      const mine = w === local && !(P.hold >= 0 && KINDS[G.items[P.hold].k].two);
      if (!mine || Math.hypot(num(q[0], P.x) - P.x, num(q[1], P.y) - P.y) > GAP) { P.x = num(q[0], P.x); P.y = num(q[1], P.y); }
      if (!mine) { P.fx = num(q[4], P.fx); P.fy = num(q[5], P.fy); }
    });
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }

  // the guest's own player between snapshots: walking (with a small thing) happens on the guest's phone straight away
  const GAP = 160;
  const bigHeld = (G, who) => { const P = G.p[who]; return P.hold >= 0 && KINDS[G.items[P.hold].k].two; };
  function guestStep(G, who, mx, my) {
    G.t += DT;
    if (G.over || bigHeld(G, who)) return;
    const P = G.p[who];
    walk(G, who, mx, my, WALK * (P.hold >= 0 ? KINDS[G.items[P.hold].k].speed : 1));
    if (P.hold >= 0) { const it = G.items[P.hold]; it.x = P.x; it.y = P.y - 6; }
  }
  const guestMsg = (G, who, inp, presses) => { const P = G.p[who], r2 = v => Math.round(v * 100) / 100; return { mx: r2(clamp(num(inp.mx, 0), -1, 1)), my: r2(clamp(num(inp.my, 0), -1, 1)), a: presses | 0, x: r1(P.x), y: r1(P.y), fx: r2(P.fx), fy: r2(P.fy) }; };
  /* the host hears the guest: rq = { seen, mx, my, act } carries over between messages; act turns true once per new
     press (the caller clears it after the step). Walking alone, the guest's position counts if it is a free spot;
     carrying together, its stick pushes its end here. */
  function hostHears(G, who, m, rq) {
    if (!m || typeof m !== 'object') return;
    const P = G.p[who];
    rq.mx = clamp(num(m.mx, 0), -1, 1); rq.my = clamp(num(m.my, 0), -1, 1);
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    if (!bigHeld(G, who) && Number.isFinite(m.x) && Number.isFinite(m.y) && Math.hypot(m.x - P.x, m.y - P.y) < GAP + 40 && spotFree(G, m.x, m.y, P.hold)) {
      P.x = m.x; P.y = m.y; if (Number.isFinite(m.fx) && Number.isFinite(m.fy)) { P.fx = m.fx; P.fy = m.fy; }
      if (P.hold >= 0) { const it = G.items[P.hold]; it.x = P.x; it.y = P.y - 6; }
      rq.mx = rq.my = 0;
    }
  }

  return { DT, T, W, H, PR, WALK, GAP, guestStep, guestMsg, hostHears, CARRY, KINDS, SOLID, OUTSIDE, GRAB_R, PICK_R, PLACE_D, PLACE_A, TIP,
    tileAt, solid, reach, handle, corners, overlap, poseFree, spotFree, circleHitsWalls, rectHitsWalls, poly, inZone, aligned, worth, total,
    load, step, walk, stars, encode, apply, wrap };
})();

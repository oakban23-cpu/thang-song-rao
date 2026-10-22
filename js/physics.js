const Phys = (() => {
  'use strict';
  const T = 32, COLS = 30, ROWS = 17, VW = COLS * T, VH = ROWS * T;
  const G = 1800, JUMP = 540, SPEED = 170, ACC_G = 2400, ACC_A = 1500, MAXFALL = 760;
  const PW = 22, PH = 28, BS = 30;
  const PUSH_LIGHT = 95, PUSH_HEAVY = 80, LIFT_SPEED = 110, LIFT_H = 10;
  const DT = 1 / 120, COYOTE = 0.08, JBUF = 0.12, HOLD = 0.3, PULL_MAX = 3, SWING_V = 260;

  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));

  function load(def) {
    const L = { grid: [], doors: [], bridges: [], plates: [], toggles: [], hearts: [], boxes: [], hazards: [], lifts: [], bells: [], swaps: [], exit: null, spawn: {}, doorAt: {}, bridgeAt: {}, on: {}, tog: {}, hold: {}, ids: new Set(),
      thread: def.thread ? def.thread * T : 0, echoT: def.echo || 4, dark: !!def.dark, ghost: { pink: null, mint: null }, rec: { pink: null, mint: null } };
    for (let y = 0; y < ROWS; y++) {
      const row = (def.map[y] || '').padEnd(COLS, '.');
      L.grid.push([]);
      for (let x = 0; x < COLS; x++) {
        const c = row[x];
        let t = '.';
        if (c === '#' || c === '-' || c === 'p' || c === 'm') t = c;
        else if (c >= 'A' && c <= 'F') { t = 'D'; const d = { x, y, id: c.charCodeAt(0) - 64, open: false, anim: 0 }; L.doors.push(d); L.doorAt[x + '_' + y] = d; }
        else if (c >= 'a' && c <= 'f') { t = 'b'; const b = { x, y, id: c.charCodeAt(0) - 96, on: false, anim: 0 }; L.bridges.push(b); L.bridgeAt[x + '_' + y] = b; }
        else if (c >= '1' && c <= '6') L.plates.push({ x, y, id: +c, need: 1, down: false, anim: 0, load: 0 });
        else if (c >= 'G' && c <= 'L') L.plates.push({ x, y, id: c.charCodeAt(0) - 70, need: 2, down: false, anim: 0, load: 0 });
        else if (c >= 'u' && c <= 'z') L.toggles.push({ x, y, id: c.charCodeAt(0) - 116, down: false, anim: 0 });
        else if (c === '^') L.hazards.push({ x: x * T + 4, y: y * T + T - 12, w: T - 8, h: 12, kind: 'spike', cx: x, cy: y });
        else if (c === '~') L.hazards.push({ x: x * T, y: y * T + 9, w: T, h: T - 9, kind: 'water', cx: x, cy: y });
        else if (c === '*') L.hearts.push({ x: x * T + T / 2, y: y * T + T / 2, got: false });
        else if (c === 'o' || c === 'O') L.boxes.push({ x: x * T + 1, y: y * T, w: BS, h: T, vx: 0, vy: 0, heavy: c === 'O', ground: null, dx: 0, dy: 0, push: 0, k: 'b' + L.boxes.length, kind: 'box' });
        else if (c === 'P' || c === 'M') L.spawn[c] = { x: x * T + (T - PW) / 2, y: (y + 1) * T - PH };
        else if (c === '@') L.exit = { x: x * T, y: (y - 1) * T, w: 2 * T, h: 2 * T };
        else if (c === 'q') L.bells.push({ x, y, armed: { pink: true, mint: true }, ring: 0 });
        else if (c === 'X') L.swaps.push({ x, y, armed: true, flash: 0 });
        L.grid[y].push(t);
      }
    }
    L.lifts = (def.lifts || []).map(l => ({ x: l.x * T, w: l.w * T, y0: l.y * T, y1: l.y2 * T, y: l.y * T, id: l.id, dy: 0, dx: 0 }));
    for (const o of [...L.doors, ...L.bridges, ...L.plates, ...L.toggles, ...L.lifts]) L.ids.add(o.id);
    const mk = (id, s) => ({ id, kind: id, isPlayer: true, x: s.x, y: s.y, w: PW, h: PH, vx: 0, vy: 0, ground: null, coy: 0, buf: 0, face: id === 'pink' ? 1 : -1, sq: 0, dx: 0, dy: 0, inDoor: false, walk: 0 });
    return { L, pink: mk('pink', L.spawn.P), mint: mk('mint', L.spawn.M), t: 0, heartsGot: 0, heartsTotal: L.hearts.length, inDoor: 0, dead: null, swapN: 0, swapTo: null, taut: false };
  }

  function tileSolid(L, x, y, body) {
    if (x < 0 || x >= COLS || y < 0) return true;
    if (y >= ROWS) return false;
    const t = L.grid[y][x];
    if (t === '#') return true;
    if (t === 'D') return !L.doorAt[x + '_' + y].open;
    if (t === 'b') return L.bridgeAt[x + '_' + y].on;
    if (t === 'p') return body.kind !== 'pink';
    if (t === 'm') return body.kind !== 'mint';
    return false;
  }

  function solidsIn(L, r, body) {
    const out = [];
    const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 1e-6) / T);
    const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 1e-6) / T);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (tileSolid(L, x, y, body)) out.push({ x: x * T, y: y * T, w: T, h: T, k: 't' + x + '_' + y, tile: true });
    for (const b of L.boxes) if (b !== body && overlaps(r, b)) out.push(b);
    return out;
  }

  const inner = b => ({ x: b.x + 0.05, y: b.y + 0.05, w: b.w - 0.1, h: b.h - 0.1 });
  function moveX(L, b, dx) {
    if (!dx) return false;
    const pre = new Set(solidsIn(L, inner(b), b).map(r => r.k));
    b.x += dx;
    const hits = solidsIn(L, b, b).filter(r => !pre.has(r.k));
    if (!hits.length) return false;
    b.x = dx > 0 ? Math.min(...hits.map(r => r.x)) - b.w : Math.max(...hits.map(r => r.x + r.w));
    return true;
  }

  function oneWays(W, b) {
    const L = W.L, out = [];
    const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 1e-6) / T);
    const yB = Math.floor((b.y + b.h) / T), yA = yB - 1;
    for (let y = Math.max(0, yA); y <= Math.min(ROWS - 1, yB); y++)
      for (let x = Math.max(0, x0); x <= Math.min(COLS - 1, x1); x++)
        if (L.grid[y][x] === '-') out.push({ top: y * T, x: x * T, w: T, sup: { type: 'tile' } });
    for (const l of L.lifts) out.push({ top: l.y, x: l.x, w: l.w, sup: { type: 'lift', ref: l } });
    if (b.isPlayer) {
      const o = b === W.pink ? W.mint : W.pink;
      if (!(o.ground && o.ground.ref === b)) out.push({ top: o.y, x: o.x + 1, w: o.w - 2, sup: { type: 'player', ref: o } });
      for (const k of ['pink', 'mint']) { const g = L.ghost[k]; if (g) out.push({ top: g.y, x: g.x + 1, w: g.w - 2, sup: { type: 'ghost', ref: g } }); }
    }
    return out;
  }

  function moveY(W, b, dy) {
    const L = W.L;
    if (!dy) return null;
    const pre = new Set(solidsIn(L, inner(b), b).map(r => r.k));
    const prevBottom = b.y + b.h;
    b.y += dy;
    const hits = solidsIn(L, b, b).filter(r => !pre.has(r.k));
    if (dy < 0) {
      if (hits.length) { b.y = Math.max(...hits.map(r => r.y + r.h)); if (b.vy < 0) b.vy = 0; }
      return null;
    }
    let best = null;
    for (const r of hits) if (!best || r.y < best.top) best = { top: r.y, sup: r.tile ? { type: 'tile' } : { type: 'box', ref: r } };
    for (const s of oneWays(W, b)) {
      if (prevBottom <= s.top + 0.01 && b.y + b.h > s.top && b.x + b.w > s.x && b.x < s.x + s.w && (!best || s.top < best.top)) best = s;
    }
    if (best) { b.y = best.top - b.h; b.vy = 0; return best.sup; }
    return null;
  }

  function updateBox(W, b, inp) {
    const L = W.L;
    let push = 0;
    for (const d of [-1, 1]) {
      let n = 0;
      for (const p of [W.pink, W.mint]) {
        const i = inp[p.id];
        const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
        if (dir !== d || !p.ground) continue;
        if (!(p.y + p.h > b.y + 6 && p.y < b.y + b.h - 2)) continue;
        const gap = d > 0 ? b.x - (p.x + p.w) : p.x - (b.x + b.w);
        const remote = W.net && p.id !== W.net.local;
        if (gap > (remote ? -3 : -1) && gap < (remote ? 24 : 1.5)) n++;
      }
      if (b.heavy ? n >= 2 : n >= 1) push = d;
    }
    b.push = push;
    if (b.ground && b.ground.ref && b.ground.ref.dy) moveY(W, b, b.ground.ref.dy);
    b.vy = Math.min(b.vy + G * DT, MAXFALL);
    if (push && b.ground) moveX(L, b, push * (b.heavy ? PUSH_HEAVY : PUSH_LIGHT) * DT);
    b.ground = moveY(W, b, b.vy * DT);
  }

  function updatePlayer(W, p, i, ev) {
    const L = W.L, o = p === W.pink ? W.mint : W.pink;
    const g = p.ground;
    if (g && g.ref) {
      if (g.ref.dx) moveX(L, p, g.ref.dx);
      if (g.ref.dy) moveY(W, p, g.ref.dy);
    }
    const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    p.vx = approach(p.vx, dir * SPEED, (p.ground ? ACC_G : ACC_A) * DT);
    if (dir) p.face = dir;
    p.buf = i.jp ? JBUF : Math.max(0, p.buf - DT);
    const firm = p.ground && (p.ground.type !== 'player' || (o.ground && o.ground.type !== 'player'));
    p.coy = firm ? COYOTE : Math.max(0, p.coy - DT);
    if (p.buf > 0 && p.coy > 0) {
      p.vy = -JUMP; p.buf = 0; p.coy = 0; p.ground = null; p.sq = -0.8;
      ev.push('jump:' + p.id);
    }
    const fallV = p.vy;
    p.vy = Math.min(p.vy + G * DT, MAXFALL);
    if (moveX(L, p, p.vx * DT)) p.vx = 0;
    const air = !p.ground;
    p.ground = moveY(W, p, p.vy * DT);
    if (p.ground && air && fallV > 260) { p.sq = Math.min(1, fallV / 650); ev.push('land:' + p.id); }
    p.sq = approach(p.sq, 0, DT * 5);
    p.walk = p.ground && Math.abs(p.vx) > 20 ? p.walk + DT * Math.abs(p.vx) / 14 : 0;
  }

  function ghosts(L) { return ['pink', 'mint'].map(k => L.ghost[k]).filter(Boolean); }

  /* Red thread: player centres stay within L.thread. Grounded bodies anchor; airborne ones swing.
     Online, each machine corrects only its own player against the other's last known position. */
  function thread(W) {
    const L = W.L, net = W.net;
    if (!L.thread) return;
    const R = net ? L.thread + 8 : L.thread;
    const a = W.pink, b = W.mint;
    const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    const d = Math.hypot(dx, dy);
    W.taut = d > R - 3;
    if (d <= R || d < 1e-6) return;
    const nx = dx / d, ny = dy / d, ga = !!a.ground, gb = !!b.ground;
    let sa, sb, horiz = false;
    if (ga && gb) {
      if (Math.abs(dy) < R * 0.95) {
        horiz = true;
        const s = Math.sign(dx) || 1, oa = Math.max(0, -a.vx * s), ob = Math.max(0, b.vx * s);
        if (oa + ob < 1e-3) sa = sb = 0.5; else { sa = oa / (oa + ob); sb = ob / (oa + ob); }
      } else if (dy > 0) { sa = 0; sb = 1; } else { sa = 1; sb = 0; }
    } else if (ga) { sa = 0; sb = 1; }
    else if (gb) { sa = 1; sb = 0; }
    else sa = sb = 0.5;
    const pull = (p, share, sg) => {
      if (!share || (net && p.id !== net.local)) return;
      if (horiz) {
        const need = Math.abs(dx) - Math.sqrt(Math.max(0, R * R - dy * dy));
        moveX(L, p, -sg * Math.sign(dx) * need * share);
        if (sg * Math.sign(dx) * p.vx > 0) p.vx = 0;
        return;
      }
      const ex = Math.min(d - R, PULL_MAX) * share, mx = -sg * nx * ex, my = -sg * ny * ex;
      moveX(L, p, mx);
      if (my < 0) { const y0 = p.y; moveY(W, p, my); if (p.y < y0 - 0.01) p.ground = null; }
      else if (my > 0) { const g = moveY(W, p, my); if (g) p.ground = g; }
      if (p.ox != null) { p.vx = Math.max(-SWING_V, Math.min(SWING_V, (p.x - p.ox) / DT)); p.vy = Math.max(-JUMP, Math.min(MAXFALL, (p.y - p.oy) / DT)); }
      const vr = (p.vx * nx + p.vy * ny) * sg;
      if (vr > 0) { p.vx -= vr * nx * sg; p.vy -= vr * ny * sg; }
    };
    pull(b, sb, 1);
    pull(a, sa, -1);
  }

  function doSwap(W) {
    const a = W.pink, b = W.mint;
    const ax = a.x, ay = a.y;
    a.x = b.x; a.y = b.y; b.x = ax; b.y = ay;
    for (const p of [a, b]) { p.vx = 0; p.vy = 0; p.ground = null; p.sq = 0.6; p.net = null; }
    W.swapN++;
    W.swapTo = { x: b.x, y: b.y };
  }

  function stepEcho(W, ev) {
    const L = W.L;
    for (const g of ghosts(L)) {
      const ox = g.x, oy = g.y;
      if (g.i < g.path.length - 1) { g.i++; const s = g.path[g.i]; g.x = s[0]; g.y = s[1]; g.face = s[2]; }
      g.dx = g.x - ox; g.dy = g.y - oy;
    }
    for (const p of [W.pink, W.mint]) {
      const r = L.rec[p.id];
      if (r) {
        r.path.push([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.face]);
        r.t += DT;
        if (r.t >= L.echoT - 1e-9) {
          const old = L.ghost[p.id];
          if (old) { old.dx = old.dy = 0; for (const q of [W.pink, W.mint]) if (q.ground && q.ground.ref === old) q.ground = null; }
          const s = r.path[0];
          L.ghost[p.id] = { who: p.id, kind: 'ghost', isGhost: true, path: r.path, i: 0, x: s[0], y: s[1], w: PW, h: PH, face: s[2], dx: 0, dy: 0, ground: null };
          L.rec[p.id] = null;
          ev.push('ghost:' + p.id);
        }
      }
      let touching = false;
      for (const bl of L.bells) {
        const br = { x: bl.x * T + 6, y: bl.y * T + 6, w: T - 12, h: T - 6 };
        if (!overlaps(p, br)) continue;
        touching = true;
        if (bl.armed[p.id] && !L.rec[p.id]) { L.rec[p.id] = { t: 0, path: [] }; bl.ring = 1; ev.push('bell:' + p.id); }
        bl.armed[p.id] = false;
      }
      if (!touching) for (const bl of L.bells) bl.armed[p.id] = true;
    }
    for (const bl of L.bells) bl.ring = Math.max(0, bl.ring - DT * 1.5);
  }

  function stepSwaps(W, ev) {
    const L = W.L;
    for (const s of L.swaps) {
      s.flash = Math.max(0, s.flash - DT * 2);
      const r = { x: s.x * T + 6, y: s.y * T + 10, w: T - 12, h: T - 10 };
      const on = [W.pink, W.mint].some(p => p.ground && overlaps(p, r));
      if (!on) { s.armed = true; continue; }
      if (s.armed) { s.armed = false; doSwap(W); s.flash = 1; ev.push('swap'); for (const o of L.swaps) if (o !== s && [W.pink, W.mint].some(p => overlaps(p, { x: o.x * T + 6, y: o.y * T + 10, w: T - 12, h: T - 10 }))) o.armed = false; }
    }
  }

  function step(W, inp) {
    const L = W.L, ev = [];
    W.t += DT;
    const P = [W.pink, W.mint];
    const net = W.net, guest = !!(net && net.role === 'guest');
    const remote = net ? (net.local === 'pink' ? W.mint : W.pink) : null;
    const bodies = P.concat(L.boxes);
    if (!guest) {
      const gh = ghosts(L), weighed = bodies.concat(gh);
      const weightOf = (b, depth) => {
        let w = b.heavy ? 2 : 1;
        if (depth < 4) for (const o of weighed) if (o !== b && o.ground && o.ground.ref === b) w += weightOf(o, depth + 1);
        return w;
      };
      const onCell = (b, x, y) => Math.abs(b.y + b.h - (y + 1) * T) < 3 && b.x + b.w > x * T + 4 && b.x < x * T + T - 4;
      const pressed = {};
      for (const pl of L.plates) {
        const was = pl.down;
        pl.load = 0;
        for (const b of weighed) if (onCell(b, pl.x, pl.y)) pl.load += weightOf(b, 0);
        if (pl.need > 1) { pl.holdT = pl.load >= pl.need ? HOLD : Math.max(0, (pl.holdT || 0) - DT); pl.down = pl.load >= pl.need || pl.holdT > 0; }
        else pl.down = pl.load >= pl.need;
        if (pl.down && !was) ev.push('plate');
        if (pl.down) pressed[pl.id] = true;
      }
      for (const tg of L.toggles) {
        if (bodies.some(b => b.ground && onCell(b, tg.x, tg.y))) {
          tg.offT = 0;
          if (!tg.down) { tg.down = true; L.tog[tg.id] = !L.tog[tg.id]; ev.push('toggle'); }
        } else if ((tg.offT = (tg.offT || 0) + DT) > 0.2) tg.down = false;
        tg.anim = approach(tg.anim, L.tog[tg.id] ? 1 : 0, DT * 10);
      }
      const on = {};
      for (const id of L.ids) {
        on[id] = !!pressed[id] !== !!L.tog[id];
      }
      L.on = on;
      for (const d of L.doors) {
        const r = { x: d.x * T, y: d.y * T, w: T, h: T };
        const open = !!on[d.id] || bodies.some(b => overlaps(b, r));
        if (open !== d.open) { d.open = open; ev.push(open ? 'open' : 'close'); }
        d.anim = approach(d.anim, open ? 1 : 0, DT * 7);
      }
      for (const b of L.bridges) {
        b.on = !!on[b.id];
        b.anim = approach(b.anim, b.on ? 1 : 0, DT * 8);
      }
      for (const pl of L.plates) pl.anim = approach(pl.anim, pl.down ? 1 : 0, DT * 12);
      for (const l of L.lifts) {
        const tgt = on[l.id] ? l.y1 : l.y0, oy = l.y, s = LIFT_SPEED * DT;
        l.y = Math.abs(tgt - l.y) <= s ? tgt : l.y + Math.sign(tgt - l.y) * s;
        l.dy = l.y - oy;
      }
      for (const b of L.boxes) { b.ox = b.x; b.oy = b.y; }
      for (const b of L.boxes) updateBox(W, b, inp);
      for (const b of L.boxes) { b.dx = b.x - b.ox; b.dy = b.y - b.oy; }
      if (L.bells.length || gh.length) stepEcho(W, ev);
    }
    const order = W.pink.ground && W.pink.ground.ref === W.mint ? [W.mint, W.pink] : [W.pink, W.mint];
    for (const p of order) {
      if (p === remote) continue;
      p.ox = p.x; p.oy = p.y;
      updatePlayer(W, p, inp[p.id], ev);
      p.dx = p.x - p.ox; p.dy = p.y - p.oy;
    }
    thread(W);
    if (!guest && L.swaps.length) stepSwaps(W, ev);
    for (const p of P) {
      if (p === remote) continue;
      const r = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 4 };
      if (p.y > VH + 20 || L.hazards.some(h => overlaps(r, h))) { W.dead = p.id; ev.push('die:' + p.id); break; }
    }
    if (!guest) {
      for (const h of L.hearts) {
        if (h.got) continue;
        for (const p of P) {
          const dx = p.x + p.w / 2 - h.x, dy = p.y + p.h / 2 - h.y;
          if (dx * dx + dy * dy < 400) { h.got = true; W.heartsGot++; ev.push('heart'); break; }
        }
      }
      if (L.exit) {
        let n = 0;
        for (const p of P) {
          const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
          p.inDoor = cx > L.exit.x + 4 && cx < L.exit.x + L.exit.w - 4 && cy > L.exit.y && cy < L.exit.y + L.exit.h;
          if (p.inDoor) n++;
        }
        W.inDoor = n;
        if (n === 2) ev.push('win');
      }
    }
    return ev;
  }

  return { T, COLS, ROWS, VW, VH, DT, PW, PH, BS, LIFT_H, load, step, overlaps, approach, ghosts };
})();

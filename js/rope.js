/* Climbing tied together (ปีนผาผูกเชือก). A cliff seen from the side, a few screens tall; the two of you climb it with
   one rope tied between you. Hold the grip button to hang on to a rock; point the stick where you want to go and let go
   of the button: you leap to the rock (or ledge) you pointed at; press and hold again as you get there or you slip off.
   Standing on a ledge you can walk; hold the button to crouch and aim, let go to jump. Your grip tires on the rock
   (faster on wet rock, in the cold, in the wind, and with your partner hanging on you); it comes back on a ledge.
   If you fall the rope catches you on your partner (it jerks them, and costs them grip if they are on a rock); hanging
   on the rope, lean left and right to swing, hold the button to grab a rock you swing past, press the other button to
   climb up the rope; a partner on a ledge can haul you up. If you both come off at once you fall back to the last ledge
   where you both stood. Standing on a ledge right next to your partner you can step up on their shoulders and leap
   higher. Some rocks crumble, a bird pecks whoever hangs by her nest, goats on the ledges butt you off (shoo them), gusts
   of wind push you about, and a waterfall pours down on you. Reach the top together. */
const Rope = (() => {
  'use strict';
  const DT = 1 / 120, START = 2.5, W = 960, H = 544, CELL = 40, COLS = 24;
  const GRAV = 1400, REACH = 150, BOOST = 214, BOOST_DX = 44, ROPE = 240, ROPE_MIN = 44, SLACK = 10, MAXANG = 0.9;
  const JUMP_V = 430, GRAB_R = 28, CATCH = 0.45, ARM = 46, EXCL = 0.3, HOP = 120;
  const STAM = 100, DRAIN = 2.4, REGEN = 40, HANG_REGEN = 10, HANG_DRAIN = 2, WET = 2.5, GUST_DRAIN = 2, MIN_GRAB = 12;
  const YANK_MIN = 160, YANK_K = 0.03, CLIMB = 18, CLIMB_COST = 2.5, HAUL = 26, REEL_SPD = 300, SLIDE = 110, PUMP = 420, DAMP = 0.25;
  const WALK = 140, FALL_T = 1, RESPAWN = 1.6, CRUMBLE_T = 1.6, REGROW = 8, NEST_R = 56, PECK_T = 1.6;
  const GOAT_SPD = 40, GOAT_R = 22, GOAT_WAIT = 1.4, GOAT_AIM = 1, SHOO_R = 90, SHOO_T = 2.5, WIND_WARN = 1.6, GUST_T = 2.6, GUST_A = 650, FALLS_A = 1100, VMAX = 1100;
  const PROG = 300, GEM = 20, SUMMIT = 150, TBONUS = 2, FALL_PTS = 30, GEM_R = 30, HARD = 760, TIME = 180;
  const IDS = ['pink', 'mint'], PST = ['hold', 'ledge', 'air'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  const hyp = Math.hypot;

  /* ---------- the cliff from its map: one character a cell of 40 px, row 0 at the top ----------
     o rock, c crumbly rock, w wet rock, * a rock with a flower to pick, = ledge, C ledge where you start again after a
     fall, T the top, G a goat on a ledge, n a bird's nest; def.falls: [[col0, col1, row0, row1]] where the waterfall pours */
  function parse(def) {
    if (def._geo) return def._geo;
    const rows = def.map, holds = [], ledges = [], gems = [], nests = [], goats = [], zones = [];
    const jit = (r, c, k) => (((r * 73 + c * 151 + k * 37) * 2654435761 >>> 0) % 13) - 6;
    rows.forEach((row, r) => {
      let run = -1;
      for (let c = 0; c <= COLS; c++) {
        const ch = row[c] || '.', x = c * CELL + CELL / 2, y = r * CELL + CELL / 2, led = '=CTG'.includes(ch);
        if (led && run < 0) run = c;
        if (!led && run >= 0) {
          const seg = row.slice(run, c);
          ledges.push({ x0: run * CELL, x1: c * CELL, y: r * CELL + 30, cp: seg.includes('C'), top: seg.includes('T') });
          for (let k = 0; k < seg.length; k++) if (seg[k] === 'G') goats.push({ li: ledges.length - 1, x: (run + k) * CELL + CELL / 2 });
          run = -1;
        }
        if ('ocw*'.includes(ch)) {
          const h = { x: x + jit(r, c, 1), y: y + jit(r, c, 2), cr: ch === 'c', wet: ch === 'w', nest: false };
          holds.push(h);
          if (ch === '*') gems.push({ x: h.x, y: h.y, h: holds.length - 1 });
        } else if (ch === 'n') nests.push({ x, y });
      }
    });
    for (const z of def.falls || []) zones.push({ x0: z[0] * CELL, x1: (z[1] + 1) * CELL, y0: z[2] * CELL, y1: (z[3] + 1) * CELL });
    for (const h of holds) { if (zones.some(z => h.x >= z.x0 && h.x <= z.x1 && h.y >= z.y0 && h.y <= z.y1)) h.wet = true; h.nest = nests.some(n => hyp(n.x - h.x, n.y - h.y) < NEST_R); }
    const ground = ledges.reduce((a, l, i) => (l.y > ledges[a].y ? i : a), 0), top = ledges.findIndex(l => l.top);
    ledges[ground].cp = true;
    const geo = { holds, ledges, gems, nests, goats, zones, ground, top: top < 0 ? 0 : top, HT: rows.length * CELL };
    Object.defineProperty(def, '_geo', { value: geo, enumerable: false, configurable: true });
    return geo;
  }

  const newP = (x, y, li, face) => ({ x, y, vx: 0, vy: 0, st: 'ledge', h: -1, li, firm: true, need: 0, stam: STAM, taut: false, slackT: 9, held: false, armed: false, crouch: false, face, mv: false,
    tgt: null, ft: 0, tf: 0, ex: -1, exT: 0, pass: -1, passT: 0, peckT: 0, top: y, boost: 0 });
  function load(def) {
    const geo = parse(def), gl = geo.ledges[geo.ground];
    const sx = def.start || [gl.x0 + (gl.x1 - gl.x0) / 2 - 30, gl.x0 + (gl.x1 - gl.x0) / 2 + 30];
    const G = {
      def, geo, t: 0, rt: 0, st: 'count', over: false, won: false, score: 0, best: 0, rs: def.seed || 7,
      p: { pink: newP(sx[0], gl.y - ARM, geo.ground, 1), mint: newP(sx[1], gl.y - ARM, geo.ground, -1) },
      hs: geo.holds.map(() => ({ ct: 0, gone: 0 })), gem: geo.gems.map(() => false), gemN: 0, nb: geo.nests.map(() => 0),
      goats: geo.goats.map((g, i) => ({ li: g.li, x: g.x, dir: i % 2 ? -1 : 1, wait: 0, shoo: 0, butt: 0, aim: 0 })),
      ropeL: ROPE, reelQ: 0, cp: geo.ground, bothAir: 0, fallT: 0, windI: 0, wind: null, pend: [], inp: null,
      stats: { jumps: 0, grabs: 0, slips: 0, tired: 0, pecks: 0, crumbles: 0, butts: 0, catches: 0, hauls: 0, climbs: 0, swings: 0, boosts: 0, gems: 0, falls: 0, checks: 0, shoos: 0, thuds: 0 }
    };
    G.y0 = gl.y - ARM; G.y1 = geo.ledges[geo.top].y - ARM;
    return G;
  }
  const timeLeft = G => (G.def.time || TIME) - G.rt;
  const anchored = p => p.st === 'hold' || p.st === 'ledge';
  const onRope = p => p.st === 'air' && (p.taut || (p.slackT || 0) < 0.25);   // hanging (the rope goes slack a moment at the top of a swing)
  const inZone = (G, x, y) => G.geo.zones.some(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
  const gusting = G => !!(G.wind && G.wind.st === 'gust');
  const holdFree = (G, i, id) => !G.hs[i].gone && !(G.p[other(id)].st === 'hold' && G.p[other(id)].h === i);
  const boosted = (G, id) => { const p = G.p[id], o = G.p[other(id)]; return p.st === 'ledge' && o.st === 'ledge' && o.li === p.li && Math.abs(o.x - p.x) <= BOOST_DX; };

  /* where a leap from here would go, pointing the stick (mx, my); null: no rock or ledge that way, a plain jump.
     { k: 'h' a rock | 'l' a ledge, i, x, y, d, boost } */
  function aimTarget(G, id, mx, my) {
    const p = G.p[id], o = G.p[other(id)];
    if (!anchored(p)) return null;
    let ax = num(mx), ay = num(my); const m = hyp(ax, ay);
    if (m < 0.35) { ax = 0; ay = -1; } else { ax /= m; ay /= m; }
    const bst = boosted(G, id), R = bst ? BOOST : REACH, oa = anchored(o), lim = G.ropeL - SLACK;
    let best = null, bs = 1e9;
    const consider = (k, i, x, y) => {
      const dx = x - p.x, dy = y - p.y, d = hyp(dx, dy);
      if (d > R || d < 12) return;
      if (oa && hyp(x - o.x, y - o.y) > lim) return;
      const ang = Math.acos(clamp((dx * ax + dy * ay) / d, -1, 1));
      if (ang > MAXANG) return;
      const s = ang + d * 0.0015;
      if (s < bs) { bs = s; best = { k, i, x, y, d, boost: bst && d > REACH }; }
    };
    G.geo.holds.forEach((h, i) => { if (i !== p.h || p.st !== 'hold') if (holdFree(G, i, id)) consider('h', i, h.x, h.y); });
    G.geo.ledges.forEach((l, i) => {
      if (p.st === 'ledge' && i === p.li) return;
      const y = l.y - ARM; let x;
      if (Math.abs(ay) > 0.05 && (y - p.y) * ay > 0) x = p.x + ax * (y - p.y) / ay; else x = p.x + ax * R * 0.6;
      x = clamp(x, l.x0 + 14, l.x1 - 14);
      if (oa && o.st === 'ledge' && o.li === i && Math.abs(o.x - x) < 26) x = clamp(x + (x < o.x ? -26 : 26), l.x0 + 14, l.x1 - 14);
      consider('l', i, x, y);
    });
    return best;
  }

  // off a rock or a ledge into the air
  function leave(G, id) {
    const p = G.p[id];
    if (p.st === 'hold') { p.ex = p.h; p.exT = EXCL; }
    p.st = 'air'; p.h = -1; p.firm = true; p.need = 0; p.crouch = false; p.peckT = 0; p.top = p.y; p.tgt = null; p.taut = false;
  }
  function drop(G, id, why, ev) {
    const p = G.p[id], li = p.st === 'ledge' ? p.li : -1;
    leave(G, id); p.vx = 0; p.vy = 40;
    if (li >= 0) { p.pass = li; p.passT = 0.5; }
    if (why) ev.push(why + ':' + id);
  }
  function jump(G, id, mx, my, ev) {
    const p = G.p[id], tg = aimTarget(G, id, mx, my), wasLedge = p.st === 'ledge', li = p.li;
    let ax = num(mx), ay = num(my); const m = hyp(ax, ay);
    if (m < 0.35) { ax = 0; ay = -1; } else { ax /= m; ay /= m; }
    leave(G, id); G.stats.jumps++;
    if (tg) {
      const dx = tg.x - p.x, dy = tg.y - p.y, tf = 0.24 + tg.d / 1000;
      p.vx = dx / tf; p.vy = dy / tf - 0.5 * GRAV * tf; p.tgt = tg; p.ft = 0; p.tf = tf;
      if (tg.boost) { G.stats.boosts++; p.boost = 0.5; ev.push('boost:' + id); }
      if (wasLedge && dy > 0) { p.pass = li; p.passT = 0.4; }
    } else if (ay > 0.5) {                         // pointing down with nothing there: let go
      p.vx = ax * HOP; p.vy = 40;
      if (wasLedge) { p.pass = li; p.passT = 0.5; }
    } else { p.vx = ax * JUMP_V; p.vy = ay * JUMP_V; }
    if (Math.abs(p.vx) > 20) p.face = p.vx > 0 ? 1 : -1;
    ev.push('jump:' + id + (tg ? ':' + tg.k : ''));
  }
  function grabHold(G, id, i, firm, ev, how) {
    const p = G.p[id], h = G.geo.holds[i];
    p.st = 'hold'; p.h = i; p.x = h.x; p.y = h.y; p.vx = 0; p.vy = 0; p.firm = firm; p.need = firm ? 0 : CATCH; p.tgt = null; p.taut = false; p.li = -1; p.peckT = 0;
    G.stats.grabs++; if (how === 'swing') G.stats.swings++;
    ev.push('grab:' + id + ':' + i + (firm ? '' : ':tip') + (how ? ':' + how : ''));
  }
  function land(G, id, li, ev, how) {
    const p = G.p[id], l = G.geo.ledges[li], fall = p.y - p.top;
    p.st = 'ledge'; p.li = li; p.y = l.y - ARM; p.x = clamp(p.x, l.x0 + 8, l.x1 - 8); p.tgt = null; p.taut = false; p.firm = true; p.need = 0; p.h = -1; p.armed = false; p.crouch = false;
    const hard = p.vy > HARD && fall > 200;
    p.vx = 0; p.vy = 0;
    if (hard) { p.stam = Math.max(0, p.stam - 10); G.stats.thuds++; }
    ev.push('land:' + id + ':' + li + (hard ? ':hard' : how ? ':' + how : ''));
  }

  function act(G, id, ev) {
    const p = G.p[id], o = G.p[other(id)];
    if (p.st === 'ledge') {
      const gt = G.goats.find(g => g.li === p.li && Math.abs(g.x - p.x) < SHOO_R);
      if (gt) { gt.dir = gt.x < p.x ? -1 : 1; gt.shoo = SHOO_T; gt.wait = 0; gt.aim = 0; G.stats.shoos++; ev.push('shoo:' + id); return; }
      if (o.st === 'air' && o.taut) { G.reelQ += HAUL; G.stats.hauls++; ev.push('haul:' + id); return; }
    }
    if (p.st === 'air' && onRope(p) && anchored(o)) {
      if (p.stam > 5 && G.ropeL > ROPE_MIN + 1) { G.reelQ += CLIMB; p.stam -= CLIMB_COST; G.stats.climbs++; ev.push('climb:' + id); }
      return;
    }
    if (!anchored(o)) return;
    const d = hyp(p.x - o.x, p.y - o.y);
    if (d >= 30 && (p.st === 'hold' || (p.st === 'ledge' && o.y < p.y - 24))) {
      G.ropeL = clamp(d, ROPE_MIN, ROPE); G.reelQ = 0;
      const li = p.st === 'ledge' ? p.li : -1;
      leave(G, id); p.vx = 0; p.vy = 0; p.taut = true;
      if (p.ex >= 0) p.exT = 2;                        // not straight back onto the same rock (unless pressed afresh)
      if (li >= 0) { p.pass = li; p.passT = 0.5; }
      ev.push('hang:' + id);
    }
  }

  // what each one does with their buttons this step
  function control(G, id, q, ev) {
    const p = G.p[id];
    if (!q || q.still) return;
    const use = !!q.use, wasHeld = p.held, rel = !!q.rel || (wasHeld && !use), mx = clamp(num(q.mx), -1, 1), my = clamp(num(q.my), -1, 1);
    p.held = use; p.mv = false;
    if (q.act) act(G, id, ev);
    if (p.st === 'hold') {
      if (rel && p.firm) { jump(G, id, mx, my, ev); return; }
      if (use) { if (!p.firm) { p.firm = true; p.need = 0; ev.push('firm:' + id); } }
      else if (!p.firm) { p.need -= DT; if (p.need <= 0) { G.stats.slips++; drop(G, id, 'slip', ev); } }
      else { p.firm = false; p.need = CATCH; }
      if (Math.abs(mx) > 0.35) p.face = mx > 0 ? 1 : -1;
      return;
    }
    if (p.st === 'ledge') {
      // on a ledge a jump is a press and a let go (holding on as you landed does not count)
      if (use && !wasHeld) p.armed = true;
      if (rel && p.armed) { jump(G, id, mx, my, ev); return; }
      if (!use) p.armed = false;
      p.crouch = use && p.armed;
      if (!use && Math.abs(mx) > 0.25) {
        const l = G.geo.ledges[p.li], o = G.p[other(id)];
        const nx = clamp(p.x + mx * WALK * (gusting(G) ? 0.6 : 1) * DT, l.x0 + 10, l.x1 - 10);
        if (!anchored(o) || hyp(nx - o.x, p.y - o.y) <= G.ropeL || Math.abs(nx - o.x) < Math.abs(p.x - o.x)) { p.mv = nx !== p.x; p.x = nx; }
        p.face = mx > 0 ? 1 : -1;
      } else if (Math.abs(mx) > 0.35) p.face = mx > 0 ? 1 : -1;
      return;
    }
    // in the air: hanging on the rope you can lean to swing and slide down it; holding the button you grab
    if (use && !wasHeld && p.exT > 0.05) p.exT = 0.05;
    if (onRope(p)) { p.pump = mx; if (my > 0.6 && G.ropeL < ROPE) G.ropeL = Math.min(ROPE, G.ropeL + SLIDE * DT); }
    else p.pump = 0;
  }

  // the body in the air, and whatever it reaches
  function airStep(G, id, ev) {
    const p = G.p[id], o = G.p[other(id)], geo = G.geo;
    let ax = 0, ay = GRAV;
    if (gusting(G)) ax += G.wind.dir * GUST_A;
    // the waterfall pours on whoever hangs or falls in it (a leap through it is quick enough)
    if (!p.tgt && inZone(G, p.x, p.y)) { ay += FALLS_A; p.vx *= 1 - 2 * DT; }
    if (onRope(p) && anchored(o) && p.pump) {
      const d = hyp(p.x - o.x, p.y - o.y) || 1, tx = -(p.y - o.y) / d, ty = (p.x - o.x) / d, s = Math.sign(tx) || 1;
      const a = PUMP * p.pump * Math.abs(tx); ax += tx * s * a; ay += ty * s * a;
    }
    if (p.taut) { p.vx -= p.vx * DAMP * DT; p.vy -= p.vy * DAMP * DT; }
    p.vx += ax * DT; p.vy = Math.min(VMAX, p.vy + ay * DT);
    const fy0 = p.y + ARM;
    p.x += p.vx * DT; p.y += p.vy * DT;
    if (p.x < 16) { p.x = 16; p.vx = Math.max(0, p.vx); } if (p.x > W - 16) { p.x = W - 16; p.vx = Math.min(0, p.vx); }
    if (p.y > geo.HT + 120) { p.y = geo.HT + 120; p.vy = 0; }
    p.top = Math.min(p.top, p.y);
    if (p.exT > 0 && (p.exT -= DT) <= 0) p.ex = -1;
    if (p.passT > 0 && (p.passT -= DT) <= 0) p.pass = -1;
    if (Math.abs(p.vx) > 40) p.face = p.vx > 0 ? 1 : -1;
    if (G.st === 'fall') return;
    // a leap to a rock or a ledge: there when the time is up
    if (p.tgt) {
      p.ft += DT;
      if (p.ft >= p.tf - 1e-6) {
        const tg = p.tgt; p.tgt = null;
        if (hyp(p.x - tg.x, p.y - tg.y) < GRAB_R + 12) {
          if (tg.k === 'h') { if (holdFree(G, tg.i, id) && p.stam >= MIN_GRAB) { grabHold(G, id, tg.i, p.held, ev); return; } }
          else { p.x = tg.x; p.y = tg.y; p.vy = Math.max(p.vy, 0); land(G, id, tg.i, ev); return; }
        }
      } else { landCheck(G, id, fy0, ev); return; }
    }
    if (landCheck(G, id, fy0, ev)) return;
    // holding the button: grab a rock that comes within reach, or the edge of a ledge
    if (p.held && p.stam >= MIN_GRAB) {
      let bi = -1, bd = GRAB_R;
      geo.holds.forEach((h, i) => { if (i === p.ex || !holdFree(G, i, id)) return; const d = hyp(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { grabHold(G, id, bi, true, ev, p.taut ? 'swing' : ''); return; }
      if (p.taut || p.vy < 60) for (let i = 0; i < geo.ledges.length; i++) {
        const l = geo.ledges[i]; if (i === p.pass) continue;
        if (p.x >= l.x0 - 4 && p.x <= l.x1 + 4 && p.y >= l.y - ARM - 30 && p.y <= l.y + 30) { land(G, id, i, ev, 'mantle'); return; }
      }
    }
  }
  function landCheck(G, id, fy0, ev) {
    const p = G.p[id]; if (p.vy <= 0) return false;
    const fy = p.y + ARM, ls = G.geo.ledges;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]; if (i === p.pass) continue;
      if (fy0 <= l.y && fy >= l.y && p.x >= l.x0 - 6 && p.x <= l.x1 + 6) { p.y = l.y - ARM; land(G, id, i, ev); return true; }
    }
    return false;
  }

  // the rope: no further apart than its length; a fall is caught on the one holding on
  function ropeStep(G, ev) {
    const A = G.p.pink, B = G.p.mint;
    for (const p of [A, B]) p.slackT = p.taut ? 0 : (p.slackT || 0) + DT;   // how long since the rope last held them (a swing that goes slack at the top is no fall)
    if (G.reelQ > 0) { const dl = Math.min(G.reelQ, REEL_SPD * DT); G.ropeL = Math.max(ROPE_MIN, G.ropeL - dl); G.reelQ -= dl; if (G.ropeL <= ROPE_MIN) G.reelQ = 0; }
    if (anchored(A) && anchored(B)) { G.ropeL = ROPE; G.reelQ = 0; A.taut = B.taut = false; return; }
    const dx = A.x - B.x, dy = A.y - B.y, d = hyp(dx, dy) || 1e-6, L = G.ropeL;
    if (d <= L) { if (d < L - 2) A.taut = B.taut = false; return; }
    if (A.st === 'air' && B.st === 'air') {
      const nx = dx / d, ny = dy / d, e = (d - L) / 2;
      A.x -= nx * e; A.y -= ny * e; B.x += nx * e; B.y += ny * e;
      const rv = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
      if (rv > 0) { A.vx -= nx * rv / 2; A.vy -= ny * rv / 2; B.vx += nx * rv / 2; B.vy += ny * rv / 2; }
      A.taut = B.taut = false; return;
    }
    const X = A.st === 'air' ? A : B, Y = X === A ? B : A, xid = X === A ? 'pink' : 'mint', yid = other(xid);
    const nx = (X.x - Y.x) / d, ny = (X.y - Y.y) / d;
    X.x = Y.x + nx * L; X.y = Y.y + ny * L;
    const vr = X.vx * nx + X.vy * ny;
    if (vr > 0) { X.vx -= nx * vr; X.vy -= ny * vr; }
    if (X.tgt) X.tgt = null;
    if (!X.taut && vr > YANK_MIN && X.slackT > 0.3) {
      G.stats.catches++; ev.push('catch:' + xid + ':' + Math.round(vr));
      if (Y.st === 'hold') { Y.stam -= YANK_K * vr; if (Y.stam <= 0) { Y.stam = 0; G.stats.tired++; drop(G, yid, 'pulled', ev); } }
    }
    X.taut = true;
  }

  // grip: tires on the rock, comes back on a ledge and (a little) hanging in the harness
  function gripStep(G, ev) {
    const cold = G.def.cold || 0, tire = G.def.tire || 1;
    for (const id of IDS) {
      const p = G.p[id], o = G.p[other(id)];
      if (p.st === 'hold') {
        const h = G.geo.holds[p.h];
        const k = tire * (h.wet ? WET : 1) * (gusting(G) ? GUST_DRAIN : 1) * (o.st === 'air' && o.taut ? HANG_DRAIN : 1);
        p.stam -= DRAIN * k * DT;
        if (p.stam <= 0) { p.stam = 0; G.stats.tired++; drop(G, id, 'tired', ev); }
      } else if (p.st === 'ledge') p.stam = Math.min(STAM, p.stam + REGEN * (cold ? 0.6 : 1) * DT);
      else if (p.taut) p.stam = Math.min(STAM, p.stam + HANG_REGEN * DT);
    }
  }
  // crumbly rock, the birds, the flowers
  function rockStep(G, ev) {
    const geo = G.geo;
    G.hs.forEach((s, i) => { if (s.gone > 0 && (s.gone -= DT) <= 0) { s.gone = 0; s.ct = 0; ev.push('regrow:' + i); } });
    for (let n = 0; n < G.nb.length; n++) G.nb[n] = Math.max(0, G.nb[n] - DT * 2);
    for (const id of IDS) {
      const p = G.p[id];
      if (p.st === 'hold') {
        const h = geo.holds[p.h], s = G.hs[p.h];
        if (h.cr) { s.ct += DT; if (s.ct >= CRUMBLE_T) { s.gone = REGROW; G.stats.crumbles++; ev.push('crumble:' + id + ':' + p.h); drop(G, id, '', ev); continue; } }
        if (h.nest) {
          p.peckT += DT;
          geo.nests.forEach((n, k) => { if (hyp(n.x - h.x, n.y - h.y) < NEST_R) G.nb[k] = Math.max(G.nb[k], Math.min(1, p.peckT / PECK_T) + 0.05); });
          if (p.peckT >= PECK_T) { G.stats.pecks++; geo.nests.forEach((n, k) => { if (hyp(n.x - h.x, n.y - h.y) < NEST_R) G.nb[k] = 2; }); drop(G, id, 'peck', ev); p.vx = (p.x < W / 2 ? 1 : -1) * 60; continue; }
        }
      }
      geo.gems.forEach((g, i) => { if (!G.gem[i] && hyp(g.x - p.x, g.y - p.y) < GEM_R) { G.gem[i] = true; G.gemN++; G.stats.gems++; ev.push('gem:' + id + ':' + i); } });
    }
  }
  // goats walk to and fro on their ledge; someone standing in the way gets a look, a lowered head, then a butt
  function goatStep(G, ev) {
    for (const g of G.goats) {
      const l = G.geo.ledges[g.li];
      if (g.shoo > 0) g.shoo -= DT;
      if (g.butt > 0) g.butt -= DT;
      const inWay = g.shoo > 0 ? null : IDS.find(id => { const p = G.p[id]; if (p.st !== 'ledge' || p.li !== g.li) return false; const a = (p.x - g.x) * g.dir; return a > -6 && a < GOAT_R + 34; });
      if (g.aim > 0) {
        if (!inWay) { g.aim = 0; continue; }
        if ((g.aim -= DT) <= 0) {
          g.aim = 0; const p = G.p[inWay];
          leave(G, inWay); p.vx = g.dir * 260; p.vy = -220; p.pass = g.li; p.passT = 0.6;
          G.stats.butts++; g.wait = 1.2; g.butt = 0.6; ev.push('butt:' + inWay);
        }
        continue;
      }
      if (inWay && g.wait <= 0) { g.aim = GOAT_AIM; ev.push('goat:' + inWay); continue; }
      if (g.wait > 0) { g.wait -= DT; continue; }
      g.x += g.dir * GOAT_SPD * (g.shoo > 0 ? 1.8 : 1) * DT;
      if (g.x <= l.x0 + 18) { g.x = l.x0 + 18; g.dir = 1; g.wait = GOAT_WAIT; }
      else if (g.x >= l.x1 - 18) { g.x = l.x1 - 18; g.dir = -1; g.wait = GOAT_WAIT; }
    }
  }
  function windStep(G, ev) {
    const ws = G.def.wind || [];
    if (G.wind) {
      G.wind.t += DT;
      if (G.wind.st === 'warn' && G.rt >= ws[G.windI][0]) { G.wind.st = 'gust'; G.wind.t = 0; ev.push('gust:' + G.wind.dir); }
      else if (G.wind.st === 'gust' && G.wind.t >= GUST_T) { G.wind = null; G.windI++; ev.push('calm'); }
    } else if (G.windI < ws.length && G.rt >= ws[G.windI][0] - WIND_WARN) { G.wind = { dir: ws[G.windI][1] < 0 ? -1 : 1, st: 'warn', t: 0 }; ev.push('windwarn:' + G.wind.dir); }
  }
  function respawn(G, ev) {
    const l = G.geo.ledges[G.cp], cx = (l.x0 + l.x1) / 2;
    IDS.forEach((id, k) => {
      const p = G.p[id]; Object.assign(p, newP(clamp(cx + (k ? 26 : -26), l.x0 + 12, l.x1 - 12), l.y - ARM, G.cp, k ? -1 : 1));
    });
    G.ropeL = ROPE; G.reelQ = 0; G.st = 'run'; G.bothAir = 0; ev.push('respawn');
  }
  function scoreOf(G) {
    const won = G.won, left = Math.max(0, timeLeft(G));
    return Math.max(0, Math.round(PROG * G.best) + G.gemN * GEM + (won ? SUMMIT + TBONUS * Math.floor(left) : 0) - G.stats.falls * FALL_PTS);
  }

  /* one step. inp = { pink: { mx, my, use, act, rel }, mint: ... }: use = the grip button held, act = the other button
     pressed this step, rel = (online) the grip was let go of since the last step. guest: the host decides everything */
  function step(G, inp, guest) {
    const ev = G.pend.length ? G.pend.splice(0) : [];
    if (G.over) return ev;
    G.t += DT; G.inp = inp;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    if (guest) return ev;
    if (G.st === 'fall') {
      for (const id of IDS) { const p = G.p[id]; if (p.st === 'air') airStep(G, id, ev); }
      if ((G.fallT -= DT) <= 0) respawn(G, ev);
      return ev;
    }
    G.rt += DT;
    windStep(G, ev);
    for (const id of IDS) control(G, id, inp && inp[id], ev);
    for (const id of IDS) { const p = G.p[id]; if (p.st === 'air') airStep(G, id, ev); if (p.boost > 0) p.boost -= DT; }
    ropeStep(G, ev);
    gripStep(G, ev);
    rockStep(G, ev);
    goatStep(G, ev);
    const A = G.p.pink, B = G.p.mint;
    // both off the rock at once: down you go, back to the last ledge you both stood on (at once if already below it)
    if (A.st === 'air' && B.st === 'air') {
      G.bothAir += DT;
      const below = G.cp !== G.geo.ground && (A.y + B.y) / 2 > G.geo.ledges[G.cp].y;
      if (G.bothAir >= FALL_T || (below && G.bothAir > 0.15)) { G.st = 'fall'; G.fallT = RESPAWN; G.stats.falls++; ev.push('fall'); }
    } else G.bothAir = 0;
    if (anchored(A) && anchored(B)) {
      const f = clamp((G.y0 - Math.max(A.y, B.y)) / (G.y0 - G.y1), 0, 1);
      if (f > G.best) G.best = f;
      if (A.st === 'ledge' && B.st === 'ledge' && A.li === B.li) {
        const l = G.geo.ledges[A.li];
        if (l.top) { G.over = true; G.won = true; G.best = 1; G.score = scoreOf(G); ev.push('summit'); return ev; }
        if (l.cp && A.li !== G.cp && l.y < G.geo.ledges[G.cp].y) { G.cp = A.li; G.stats.checks++; ev.push('check:' + A.li); }
      }
    }
    G.score = scoreOf(G);
    const left = timeLeft(G);
    if (left <= 20 && left + DT > 20) ev.push('last20');
    if (left <= 0) { G.over = true; G.won = false; G.score = scoreOf(G); ev.push('timeup'); }
    return ev;
  }
  // what the button would do for this one now (for the screen to point at)
  function target(G, id) {
    const p = G.p[id], o = G.p[other(id)];
    if (G.st !== 'run') return '';
    if (p.st === 'hold') return p.firm ? (p.stam < 30 ? 'tired' : 'aim') : 'catch';
    if (p.st === 'ledge') {
      if (G.goats.some(g => g.li === p.li && Math.abs(g.x - p.x) < SHOO_R && g.shoo <= 0 && (g.aim > 0 || (p.x - g.x) * g.dir > 0))) return 'shoo';
      if (o.st === 'air' && o.taut) return 'haul';
      return boosted(G, id) ? 'boost' : 'stand';
    }
    if (p.tgt) return 'fly';
    if (p.taut) return 'hang';
    return 'air';
  }
  function stars(G) { if (!G.over) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  const clock = G => ({ t: G.rt, len: G.def.time || TIME, left: Math.max(0, timeLeft(G)) });

  /* ---------- online ---------- */
  function encode(G) {
    const w = G.wind;
    return {
      t: r2(G.t), rt: r2(G.rt), st: G.st, ov: G.over ? 1 : 0, wo: G.won ? 1 : 0, sc: G.score, be: r2(G.best), cp: G.cp, ba: r2(G.bothAir), ft: r2(G.fallT), rl: r1(G.ropeL),
      p: IDS.map(id => { const p = G.p[id]; return [r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), PST.indexOf(p.st), p.h, p.li, p.firm ? 1 : 0, r2(p.need), r1(p.stam), p.taut ? 1 : 0, p.face, p.mv ? 1 : 0, p.crouch ? 1 : 0, r2(p.peckT), r2(p.boost), p.held ? 1 : 0]; }),
      hs: G.hs.map((s, i) => [i, r2(s.ct), r2(s.gone)]).filter(a => a[1] > 0 || a[2] > 0),
      gm: G.gem.map((g, i) => (g ? i : -1)).filter(i => i >= 0), nb: G.nb.map(r2),
      gt: G.goats.map(g => [r1(g.x), g.dir, r2(g.wait), r2(g.shoo), r2(g.butt), r2(g.aim)]),
      wd: w ? [w.dir, w.st === 'gust' ? 1 : 0, r2(w.t)] : 0, wi: G.windI, s: G.stats
    };
  }
  function apply(G, m) {
    if (!m || typeof m !== 'object') return;
    const geo = G.geo;
    G.t = num(m.t, G.t); G.rt = num(m.rt, G.rt); G.st = ['count', 'run', 'fall'].includes(m.st) ? m.st : G.st; G.over = !!m.ov; G.won = !!m.wo;
    G.score = Math.max(0, num(m.sc, G.score)); G.best = clamp(num(m.be, G.best), 0, 1); G.bothAir = num(m.ba); G.fallT = num(m.ft);
    G.ropeL = clamp(num(m.rl, G.ropeL), ROPE_MIN, ROPE);
    if (Number.isInteger(m.cp) && geo.ledges[m.cp]) G.cp = m.cp;
    if (Array.isArray(m.p)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id]; if (!Array.isArray(e)) return;
      const st = PST[e[4]] || p.st;
      if (st === 'hold' && !(Number.isInteger(e[5]) && geo.holds[e[5]])) return;
      if (st === 'ledge' && !(Number.isInteger(e[6]) && geo.ledges[e[6]])) return;
      Object.assign(p, { x: clamp(num(e[0], p.x), 0, W), y: clamp(num(e[1], p.y), -200, geo.HT + 200), vx: num(e[2]), vy: num(e[3]), st, h: st === 'hold' ? e[5] : -1, li: st === 'ledge' ? e[6] : -1,
        firm: !!e[7], need: num(e[8]), stam: clamp(num(e[9], p.stam), 0, STAM), taut: !!e[10], face: e[11] === -1 ? -1 : 1, mv: !!e[12], crouch: !!e[13], peckT: num(e[14]), boost: num(e[15]), heldR: !!e[16] });
    });
    if (Array.isArray(m.hs)) { G.hs.forEach(s => { s.ct = 0; s.gone = 0; }); for (const a of m.hs.slice(0, 400)) if (Array.isArray(a) && Number.isInteger(a[0]) && G.hs[a[0]]) { G.hs[a[0]].ct = num(a[1]); G.hs[a[0]].gone = num(a[2]); } }
    if (Array.isArray(m.gm)) { G.gem = G.gem.map(() => false); for (const i of m.gm) if (Number.isInteger(i) && i >= 0 && i < G.gem.length) G.gem[i] = true; G.gemN = G.gem.filter(Boolean).length; }
    if (Array.isArray(m.nb)) G.nb = G.nb.map((v, i) => clamp(num(m.nb[i], v), 0, 2));
    if (Array.isArray(m.gt)) G.goats.forEach((g, i) => { const a = m.gt[i]; if (!Array.isArray(a)) return; const l = geo.ledges[g.li]; g.x = clamp(num(a[0], g.x), l.x0, l.x1); g.dir = a[1] === -1 ? -1 : 1; g.wait = num(a[2]); g.shoo = num(a[3]); g.butt = num(a[4]); g.aim = num(a[5]); });
    G.wind = Array.isArray(m.wd) ? { dir: m.wd[0] === -1 ? -1 : 1, st: m.wd[1] ? 'gust' : 'warn', t: num(m.wd[2]) } : null;
    if (Number.isInteger(m.wi)) G.windI = m.wi;
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  // the guest's phone sends its stick, whether the grip is held, and running counts of let-gos and presses
  function guestMsg(G, own, inp, rels, presses) {
    const i = inp || {};
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), u: i.use ? 1 : 0, r: rels | 0, a: presses | 0 };
  }
  function hostHears(G, rid, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx), -1, 1); rq.my = clamp(num(m.my), -1, 1); rq.use = !!m.u;
    const a = Number.isInteger(m.a) ? m.a : 0, r = Number.isInteger(m.r) ? m.r : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    if (rq.seenR < 0) rq.seenR = r;
    if (r > rq.seenR) { rq.seenR = r; rq.rel = true; }
  }

  return { DT, START, W, H, CELL, COLS, GRAV, REACH, BOOST, BOOST_DX, ROPE, ROPE_MIN, SLACK, MAXANG, JUMP_V, GRAB_R, CATCH, ARM, EXCL, STAM, DRAIN, REGEN, HANG_REGEN, HANG_DRAIN, WET, GUST_DRAIN, MIN_GRAB,
    YANK_MIN, YANK_K, CLIMB, CLIMB_COST, HAUL, REEL_SPD, SLIDE, PUMP, WALK, FALL_T, RESPAWN, CRUMBLE_T, REGROW, NEST_R, PECK_T, GOAT_SPD, GOAT_R, GOAT_AIM, SHOO_R, SHOO_T, WIND_WARN, GUST_T, GUST_A,
    PROG, GEM, SUMMIT, TBONUS, FALL_PTS, GEM_R, TIME, PST,
    parse, load, step, target, stars, clock, encode, apply, guestMsg, hostHears, aimTarget, boosted, timeLeft, anchored, inZone, scoreOf };
})();

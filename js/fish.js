/* Fishing together (ตกปลาคู่). A little rowing boat on a lake, seen from the side: the sky and the far bank above, the
   water below with the fish swimming in it. The two of you stand in the boat, each with a rod. Press to start the
   swing, press again to let go (the further the swing, the further the cast); move up and down to choose how deep the
   hook hangs. Fish come to look; they nibble once or twice (the float bobs a little) and then bite (the float goes right
   under): strike then, not on a nibble (that scares them off). A hooked fish fights: hold to reel in, but let go while
   it thrashes or the line snaps. A small fish comes straight into the boat; a bigger one comes up beside the boat and the
   other one of you has to scoop it with the net before it dives again; a giant cannot be pulled in alone at all, the
   other one has to come and pull on the same rod. Meanwhile a bird lands on the bucket to steal a fish (shoo it), the
   boat springs leaks (stand on one and hold to plug it, or the water gets in), and two lines cast to the same spot get
   tangled (press in turns to undo it). At dusk you throw the big net together: press at the same moment, as the shoal
   swims under the boat, three times. The score is what you caught. */
const Fish = (() => {
  'use strict';
  const DT = 1 / 120, START = 2.5, W = 960, H = 544, SY = 250, DECK = 236, BX = 480, BHALF = 128, BED = 512;
  const SPEED = 110, TIP = 46, ROD_UP = 44, AIM_PERIOD = 2, CAST_MIN = 60, CAST_MAX = 360, OUT = 172, SINK = 110, DEPTH_SPD = 120;
  const DMIN = SY + 30, DMAX = BED - 8, NIBBLE_T = 0.22, BITE_T = 0.65, MISS_WARY = 3, SPOOK_WARY = 5;
  const REEL = 62, HELP_R = 80, NET_R = 70, NET_T = 3.2, LMAX = 430, TIME = 150, GRACE = 15;
  const FLOOD_PTS = 25, LEAK_RATE = 2.6, DRAIN = 4, PLUG_T = 1.2, PLUG_R = 26;
  const BIRD_FLY = 2.6, BIRD_SIT = 4.5, SHOO_R = 60, TANGLE_DX = 44, UNTANGLE = 6;
  const NET_SYNC = 0.45, NET_RING = 90, NET_PTS = 6, NET_THROWS = 3, NET_IN = 1.6, NET_PULL = 2.2, NET_AMP = 230;
  const IDS = ['pink', 'mint'], LST = ['none', 'aim', 'sink', 'wait', 'fight', 'surface', 'tangle'], FST = ['swim', 'look', 'nib', 'bite', 'hooked', 'flee'];
  // the fish: size class (s small, m big: needs the net, g giant: needs both on the rod and the net, j junk), points,
  // the depth they swim at, how hard they pull when they thrash (tension a second), how fast they run with the line,
  // how fast they swim, how long they are
  const SP = [
    { k: 'nil', sz: 's', v: 10, d: [280, 420], str: 22, run: 30, spd: 42, len: 24 },
    { k: 'taphian', sz: 's', v: 12, d: [300, 460], str: 24, run: 34, spd: 52, len: 26 },
    { k: 'chon', sz: 'm', v: 30, d: [340, 500], str: 34, run: 52, spd: 44, len: 40 },
    { k: 'duk', sz: 'm', v: 26, d: [440, 505], str: 30, run: 44, spd: 34, len: 42 },
    { k: 'kaphong', sz: 'm', v: 40, d: [280, 400], str: 42, run: 68, spd: 60, len: 40 },
    { k: 'glow', sz: 's', v: 35, d: [300, 480], str: 26, run: 40, spd: 46, len: 26 },
    { k: 'buek', sz: 'g', v: 120, d: [420, 505], str: 52, run: 62, spd: 30, len: 110 },
    { k: 'legend', sz: 'g', v: 250, d: [440, 505], str: 58, run: 72, spd: 26, len: 150 },
    { k: 'boot', sz: 'j', v: 3, d: [BED - 6, BED - 6], str: 0, run: 0, spd: 0, len: 22 }
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const other = id => (id === 'pink' ? 'mint' : 'pink');
  function rng(G) { let s = G.rs >>> 0 || 1; s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; G.rs = s; return s / 4294967296; }
  const rr = (G, a, b) => a + (b - a) * rng(G);
  const pick = (G, a) => a[Math.floor(rng(G) * a.length)];
  const newLine = () => ({ st: 'none', at: 0, hx: 0, hy: SY, nibT: 0, biteT: 0, fid: -1, d: 0, d0: 1, y0: SY, ten: 0, thr: false, thrT: 0, netT: 0, snag: 0 });

  function load(def) {
    const G = {
      def, t: 0, rt: 0, st: 'count', over: false, won: false, money: 0, score: 0, rs: def.seed || 11, water: 0, dusk: 0,
      p: { pink: { x: BX - 60, face: -1, mv: false, depth: 380, line: newLine(), plug: false }, mint: { x: BX + 60, face: 1, mv: false, depth: 380, line: newLine(), plug: false } },
      fish: [], fid: 0, spawnT: 0.5, giantI: 0, birdI: 0, leakI: 0, bird: null, leaks: [], tangle: null, bucket: [], junk: [], toss: null, cv: { pink: 0, mint: 0 }, pend: [],
      stats: { fish: 0, big: 0, giants: 0, junk: 0, netted: 0, snaps: 0, escapes: 0, dives: 0, spooked: 0, missed: 0, stolen: 0, shoo: 0, plugged: 0, floods: 0, tangles: 0, netFish: 0, syncs: 0 }
    };
    for (let i = 0; i < (def.junk || 0); i++) G.junk.push(Math.round(BX + (i % 2 ? 1 : -1) * rr(G, OUT + 40, 430)));
    for (let i = 0; i < (def.pop != null ? def.pop : 6); i++) spawnFish(G, true);
    return G;
  }
  const timeLeft = G => (G.def.time || TIME) - G.rt;
  const tipX = p => p.x + p.face * TIP;
  const netX = p => BX + p.face * (BHALF + 10);
  const fishById = (G, id) => G.fish.find(f => f.id === id) || null;

  function spawnFish(G, inside, sp) {
    const pool = G.def.fishes || [0, 1];
    const s = sp != null ? sp : pick(G, pool), S0 = SP[s];
    const left = rng(G) < .5, y = rr(G, S0.d[0], S0.d[1]);
    const x = inside ? rr(G, 40, W - 40) : (left ? -30 : W + 30);
    G.fish.push({ id: ++G.fid, sp: s, x, y, ty: y, dir: inside ? (rng(G) < .5 ? -1 : 1) : (left ? 1 : -1), st: 'swim', t: 0, n: 0, wary: inside ? 1.5 : 0, own: '', life: S0.sz === 'g' ? 90 : rr(G, 22, 40) });
  }

  function move(G, id, q) {
    const p = G.p[id];
    p.mv = false;
    if (G.st !== 'run' && G.st !== 'dusk') return;
    if (p.line.st !== 'none') return;
    const mx = clamp(num(q.mx), -1, 1);
    if (Math.abs(mx) < .2) return;
    p.face = mx > 0 ? 1 : -1;
    const sp = SPEED * (1 - G.water / 250);
    p.x = clamp(p.x + mx * sp * DT, BX - BHALF, BX + BHALF);
    p.mv = true;
  }

  // a fish lets go of the hook: scared off, missed, or the line went
  function release(G, f, wary, ev, why) {
    if (!f) return;
    f.st = 'flee'; f.t = 1.6; f.wary = wary; f.own = '';
    f.dir = f.x < BX ? -1 : 1;
    if (why) ev.push(why);
  }
  function lineFish(G, L) { return L.fid >= 0 ? fishById(G, L.fid) : null; }
  function reelIn(G, id) { const L = G.p[id].line; const f = lineFish(G, L); if (f && f.st !== 'hooked') { f.st = 'swim'; f.own = ''; f.wary = 1.5; } Object.assign(L, newLine()); }

  function act(G, id, ev) {
    const p = G.p[id], o = G.p[other(id)], L = p.line;
    if (G.st === 'net') { netPress(G, id, ev); return; }
    // scoop the other one's fish beside the boat
    if (o.line.st === 'surface' && Math.abs(p.x - netX(o)) < NET_R && L.st === 'none') { scoop(G, other(id), id, ev); return; }
    // your own fish beside the boat, when the other one has their hands full with a fish of their own
    if (L.st === 'surface' && (o.line.st === 'fight' || o.line.st === 'surface')) { G.stats.netted++; land(G, id, lineFish(G, L), ev, id); return; }
    if (G.bird && G.bird.st === 'sit' && Math.abs(p.x - BX) < SHOO_R && (L.st === 'none' || L.st === 'aim')) { if (L.st === 'aim') L.st = 'none'; G.bird.st = 'out'; G.bird.t = 0; G.stats.shoo++; ev.push('shoo:' + id); return; }
    if (G.tangle && L.st === 'tangle') {
      if (G.tangle.last !== id) { G.tangle.n++; G.tangle.last = id; ev.push('untie:' + id + ':' + G.tangle.n); if (G.tangle.n >= UNTANGLE) { for (const k of IDS) Object.assign(G.p[k].line, newLine()); G.tangle = null; ev.push('untangled'); } }
      else ev.push('untie1:' + id);
      return;
    }
    if (L.st === 'none') { if (G.st === 'run') { L.st = 'aim'; L.at = 0; ev.push('aim:' + id); } return; }
    if (L.st === 'aim') { cast(G, id, ev); return; }
    if (L.st === 'sink' || L.st === 'wait') {
      const f = lineFish(G, L);
      if (f && f.st === 'bite') { hook(G, id, f, ev); return; }
      if (f && f.st === 'nib') { release(G, f, SPOOK_WARY, ev, 'spook:' + id); G.stats.spooked++; L.fid = -1; L.nibT = 0; return; }
      reelIn(G, id); ev.push('reelin:' + id); return;
    }
  }
  const aimPower = L => (1 - Math.cos(2 * Math.PI * L.at / AIM_PERIOD)) / 2;
  function cast(G, id, ev) {
    const p = G.p[id], L = p.line, pw = aimPower(L), dist = CAST_MIN + pw * (CAST_MAX - CAST_MIN);
    let hx = tipX(p) + p.face * dist;
    if (Math.abs(hx - BX) < OUT) hx = BX + p.face * OUT;
    hx = clamp(hx, 24, W - 24);
    Object.assign(L, { st: 'sink', hx, hy: SY, nibT: 0, biteT: 0, fid: -1, snag: 0 });
    ev.push('cast:' + id + ':' + Math.round(pw * 100));
  }
  function hook(G, id, f, ev) {
    const p = G.p[id], L = p.line, d = Math.max(30, Math.abs(f.x - tipX(p)));
    f.st = 'hooked'; f.own = id;
    Object.assign(L, { st: 'fight', d, d0: d, y0: f.y, ten: 8, thr: false, thrT: rr(G, 1, 1.8), nibT: 0, biteT: 0 });
    ev.push('hook:' + id + ':' + f.sp);
  }
  function land(G, id, f, ev, netter) {
    const S0 = SP[f.sp];
    G.money += S0.v; G.bucket.push(f.sp);
    if (S0.sz === 'j') G.stats.junk++; else { G.stats.fish++; if (S0.sz === 'm') G.stats.big++; if (S0.sz === 'g') G.stats.giants++; }
    G.fish = G.fish.filter(x => x !== f);
    Object.assign(G.p[id].line, newLine());
    ev.push((netter ? 'netted:' + netter : 'land:' + id) + ':' + f.sp);
  }
  function scoop(G, angler, netter, ev) {
    const L = G.p[angler].line, f = lineFish(G, L);
    if (!f) { Object.assign(L, newLine()); return; }
    G.stats.netted++; land(G, angler, f, ev, netter);
  }

  // the line in the water: sinking to the depth, nibbles and bites, the snag of an old boot on the bottom
  function lineStep(G, id, q, ev) {
    const p = G.p[id], L = p.line;
    if (L.st === 'aim') { L.at += DT; if (G.st !== 'run') L.st = 'none'; return; }
    if (L.st === 'sink' || L.st === 'wait') {
      if (q && !q.still) p.depth = clamp(p.depth + clamp(num(q.my), -1, 1) * DEPTH_SPD * DT, DMIN, DMAX);
      const dy = p.depth - L.hy; L.hy += clamp(dy, -SINK * DT, SINK * DT);
      if (L.st === 'sink' && Math.abs(dy) < 1) L.st = 'wait';
      L.nibT = Math.max(0, L.nibT - DT); L.biteT = Math.max(0, L.biteT - DT);
      const f = lineFish(G, L);
      if (f && (f.st === 'nib' || f.st === 'bite')) { f.x += (L.hx - f.dir * SP[f.sp].len * .45 - f.x) * Math.min(1, DT * 6); f.y += (L.hy - f.y) * Math.min(1, DT * 6); }
      if (L.fid < 0 && L.hy >= BED - 40) {
        const j = G.junk.findIndex(x => Math.abs(x - L.hx) < 28);
        if (j >= 0 && (L.snag += DT) >= 1.4) {
          const x = G.junk.splice(j, 1)[0];
          G.fish.push({ id: ++G.fid, sp: 8, x, y: BED - 6, ty: BED - 6, dir: 1, st: 'bite', t: 1.2, n: 0, wary: 0, own: id, life: 99 });
          L.fid = G.fid; L.biteT = 1.2; ev.push('bite:' + id);
        }
      }
      return;
    }
    if (L.st === 'fight') fightStep(G, id, q, ev);
    else if (L.st === 'surface') {
      const f = lineFish(G, L);
      if (f) { f.x = netX(p) + p.face * 26; f.y = SY + 6; }
      if ((L.netT -= DT) <= 0) {
        Object.assign(L, { st: 'fight', d: 120, d0: Math.max(L.d0, 120), ten: 35, thr: true, thrT: 1 });
        G.stats.dives++; ev.push('dive:' + id);
      }
    }
  }
  function fightStep(G, id, q, ev) {
    const p = G.p[id], L = p.line, f = lineFish(G, L);
    if (!f) { Object.assign(L, newLine()); return; }
    const S0 = SP[f.sp], o = G.p[other(id)], oq = G.inp && G.inp[other(id)];
    const help = o.line.st === 'none' && Math.abs(o.x - p.x) < HELP_R && !!(oq && oq.use && !oq.still);
    const reel = !!(q && q.use && !q.still);
    L.help = help;
    if (S0.sz !== 'j') { L.thrT -= DT; if (L.thrT <= 0) { L.thr = !L.thr; L.thrT = L.thr ? rr(G, .7, 1.5) * (S0.sz === 'g' ? 1.2 : 1) : rr(G, 1.2, 2.6) * (S0.sz === 'g' ? .8 : 1); if (L.thr) ev.push('thrash:' + id); } }
    else L.thr = false;
    if (reel) {
      const k = S0.sz === 'g' && !help ? .12 : 1;
      L.d -= REEL * (help ? 1.9 : 1) * k * DT;
      if (S0.sz !== 'j') L.ten += (L.thr ? S0.str * 2.6 : S0.str * .32) * (help ? .7 : 1) * DT;
    } else {
      L.ten -= 55 * DT;
      if (L.thr) L.d += S0.run * DT;
      if (S0.sz === 'g') L.d += 8 * DT;
    }
    L.ten = clamp(L.ten, 0, 100);
    if (L.ten >= 100) { G.stats.snaps++; Object.assign(L, newLine()); release(G, f, 6, ev, 'snap:' + id + ':' + f.sp); if (S0.sz === 'j') G.fish = G.fish.filter(x => x !== f); return; }
    if (L.d > LMAX) { G.stats.escapes++; Object.assign(L, newLine()); release(G, f, 6, ev, 'escape:' + id + ':' + f.sp); return; }
    const k = clamp(L.d / L.d0, 0, 1);
    f.x = clamp(tipX(p) + p.face * L.d, 10, W - 10); f.y = SY + 18 + (L.y0 - SY - 18) * k; f.dir = p.face; L.hx = f.x; L.hy = f.y;
    if (L.d <= 0) {
      if (S0.sz === 's' || S0.sz === 'j') land(G, id, f, ev);
      else { L.st = 'surface'; L.netT = NET_T; L.thr = false; ev.push('surface:' + id + ':' + f.sp); }
    }
  }

  function fishStep(G, f, ev) {
    const S0 = SP[f.sp];
    f.wary = Math.max(0, f.wary - DT);
    if (f.st === 'swim' || f.st === 'flee') {
      const sp = S0.spd * (f.st === 'flee' ? 2.2 : 1);
      f.x += f.dir * sp * DT; f.y += (f.ty - f.y) * DT * .6;
      if (rng(G) < DT * .15) f.ty = rr(G, S0.d[0], S0.d[1]);
      if (f.st === 'flee' && (f.t -= DT) <= 0) f.st = 'swim';
      f.life -= DT;
      if ((f.x < -40 && f.dir < 0) || (f.x > W + 40 && f.dir > 0)) { if (f.life <= 0) { f.gone = true; return; } f.dir = -f.dir; }
      else if (f.st === 'swim' && f.life > 0 && ((f.x < 30 && f.dir < 0) || (f.x > W - 30 && f.dir > 0))) f.dir = -f.dir;
      else if (f.st === 'swim' && rng(G) < DT * .05) f.dir = -f.dir;
      if (f.st !== 'swim' || f.wary > 0 || S0.sz === 'j') return;
      for (const id of IDS) {
        const L = G.p[id].line;
        if (L.st !== 'wait' || L.fid >= 0) continue;
        const dx = Math.abs(L.hx - f.x), dy = Math.abs(L.hy - f.y);
        if (dx < 110 && dy < (S0.sz === 'g' ? 60 : 55) && rng(G) < DT * (G.def.rain ? 1.7 : .85)) { f.st = 'look'; f.own = id; L.fid = f.id; return; }
      }
      return;
    }
    const L = f.own ? G.p[f.own].line : null;
    if (f.st === 'look') {
      if (!L || L.fid !== f.id || L.st !== 'wait') { f.st = 'swim'; f.own = ''; if (L && L.fid === f.id) L.fid = -1; return; }
      const dx = L.hx - f.x, dy = L.hy - f.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 2) f.dir = dx > 0 ? 1 : -1;
      const sp = S0.spd * 1.3 * DT;
      if (d <= Math.max(10, sp)) { f.st = 'nib'; f.n = S0.sz === 'g' ? 1 : G.def.rain ? Math.floor(rr(G, 0, 2)) : Math.floor(rr(G, 1, 4)); f.t = rr(G, .45, .95); }
      else { f.x += dx / d * sp; f.y += dy / d * sp; }
      return;
    }
    if (f.st === 'nib' || f.st === 'bite') {
      if (!L || L.fid !== f.id || (L.st !== 'wait' && L.st !== 'sink')) { f.st = 'swim'; f.own = ''; return; }
      f.t -= DT;
      if (f.t > 0) return;
      if (f.st === 'nib') {
        if (f.n > 0) { f.n--; L.nibT = NIBBLE_T; f.t = rr(G, .45, .95); ev.push('nibble:' + f.own); }
        else { f.st = 'bite'; f.t = BITE_T; L.biteT = BITE_T; ev.push('bite:' + f.own); }
      } else {
        const own = f.own; L.fid = -1; L.biteT = 0;
        if (S0.sz === 'j') { G.junk.push(f.x); f.gone = true; ev.push('missed:' + own); }
        else release(G, f, MISS_WARY, ev, 'missed:' + own);
        G.stats.missed++;
      }
    }
  }

  function birdStep(G, ev) {
    const def = G.def, bs = def.birds || [];
    if (!G.bird && G.birdI < bs.length && G.rt >= bs[G.birdI]) { G.birdI++; const sx = rng(G) < .5 ? -30 : W + 30; G.bird = { st: 'in', x: sx, y: 70, sx, t: 0 }; ev.push('bird'); }
    const b = G.bird; if (!b) return;
    b.t += DT;
    if (b.st === 'in') {
      const k = Math.min(1, b.t / BIRD_FLY);
      b.x = b.sx + (BX - b.sx) * k; b.y = 70 + (DECK - 30 - 70) * k - Math.sin(k * Math.PI) * 40;
      if (k >= 1) { b.st = 'sit'; b.t = 0; ev.push('birdsit'); }
    } else if (b.st === 'sit') {
      b.x = BX; b.y = DECK - 30;
      if (b.t >= BIRD_SIT) {
        const bi = G.bucket.map(s => SP[s].sz).lastIndexOf('s');
        if (bi >= 0) { const s = G.bucket.splice(bi, 1)[0]; G.money -= SP[s].v; G.stats.stolen++; b.fish = s; ev.push('stolen:' + s); }
        b.st = 'out'; b.t = 0;
      }
    } else {
      b.x += (b.sx < BX ? -1 : 1) * 260 * DT; b.y -= 120 * DT;
      if (b.t > 2.5) G.bird = null;
    }
  }
  function leakStep(G, inp, ev) {
    const ls = G.def.leaks || [];
    if (G.st === 'run' && G.leakI < ls.length && G.rt >= ls[G.leakI]) {
      G.leakI++;
      let x = BX; for (let k = 0; k < 8; k++) { x = rr(G, BX - BHALF + 12, BX + BHALF - 12); if (G.leaks.every(l => Math.abs(l.x - x) > 30) && Math.abs(x - BX) > 18) break; }
      G.leaks.push({ x, p: 0 }); ev.push('leak');
    }
    for (const id of IDS) {
      const p = G.p[id], q = inp && inp[id]; p.plug = false;
      if (!q || !q.use || q.still) continue;
      if (!['none', 'sink', 'wait'].includes(p.line.st)) continue;
      const l = G.leaks.find(l => Math.abs(l.x - p.x) < PLUG_R);
      if (!l) continue;
      p.plug = true; l.p += DT;
      if (l.p >= PLUG_T) { G.leaks = G.leaks.filter(x => x !== l); G.stats.plugged++; ev.push('plug:' + id); }
    }
    if (G.leaks.length) G.water += LEAK_RATE * G.leaks.length * DT; else G.water = Math.max(0, G.water - DRAIN * DT);
    if (G.water >= 100) { G.money -= FLOOD_PTS; G.water = 35; G.leaks = []; G.stats.floods++; ev.push('flood'); }
  }
  function tangleCheck(G, ev) {
    if (G.tangle) return;
    const a = G.p.pink.line, b = G.p.mint.line, out = L => L.st === 'sink' || L.st === 'wait';
    if (!out(a) || !out(b) || Math.abs(a.hx - b.hx) >= TANGLE_DX) return;
    for (const L of [a, b]) { const f = lineFish(G, L); if (f) release(G, f, 2, ev); L.st = 'tangle'; L.fid = -1; L.nibT = L.biteT = 0; }
    G.tangle = { n: 0, last: '' }; G.stats.tangles++; ev.push('tangle');
  }

  // the big net at dusk: the shoal swims to and fro under the boat; both press together as it passes the middle
  const shoalX = G => { const n = G.toss; if (!n) return BX; const w = [.7, .9, 1.1][Math.min(2, n.i)] * (G.def.netSpd || 1); return BX + NET_AMP * Math.sin(n.t * w + 1.9 + n.i * 1.3); };
  function netPress(G, id, ev) {
    const n = G.toss; if (!n || n.ph !== 'wait' || n.t < .4) return;
    if (!n.p1) { n.p1 = id; n.p1t = n.t; ev.push('netready:' + id); return; }
    if (n.p1 === id) return;
    throwNet(G, 1, ev);
  }
  function throwNet(G, sync, ev) {
    const n = G.toss, q = clamp(1 - Math.abs(shoalX(G) - BX) / NET_RING, 0, 1), got = Math.round(q * sync * (G.def.shoal || 10));
    G.money += got * NET_PTS; G.stats.netFish += got; if (sync >= 1) G.stats.syncs++;
    n.res.push(got); n.ph = 'pull'; n.pt = 0; n.sx = shoalX(G); n.p1 = '';
    ev.push('throw:' + got + ':' + (sync >= 1 ? 1 : 0));
  }
  function netStep(G, ev) {
    const n = G.toss;
    if (n.ph === 'in') {
      n.pt += DT;
      for (const id of IDS) { const p = G.p[id], tx = BX + (id === 'pink' ? -34 : 34), d = tx - p.x; p.mv = Math.abs(d) > 1; p.x += clamp(d, -SPEED * DT, SPEED * DT); p.face = id === 'pink' ? 1 : -1; }
      if (n.pt >= NET_IN) { n.ph = 'wait'; n.t = 0; ev.push('netgo'); }
      return;
    }
    for (const id of IDS) G.p[id].mv = false;
    if (n.ph === 'wait') {
      n.t += DT;
      if (n.p1 && n.t - n.p1t > NET_SYNC) throwNet(G, .5, ev);
      return;
    }
    if (n.ph === 'pull') {
      n.pt += DT;
      if (n.pt >= NET_PULL) {
        n.i++;
        if (n.i >= NET_THROWS) { n.ph = 'done'; n.pt = 0; }
        else { n.ph = 'wait'; n.t = 0; ev.push('netgo'); }
      }
      return;
    }
    if (n.ph === 'done' && (n.pt += DT) >= 1.5) finish(G, ev);
  }
  function finish(G, ev) { G.over = true; G.won = true; G.score = Math.max(0, Math.round(G.money)); ev.push('over'); }

  /* one step. inp = { pink: { mx, my, act, use, still }, mint: ... }. guest: the guest's phone walks its own player only
     (the host decides everything else). */
  function step(G, inp, guest) {
    const ev = G.pend.length ? G.pend.splice(0) : [];
    if (G.over) return ev;
    G.t += DT; G.inp = inp;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    if (G.st === 'run' || G.st === 'dusk') for (const id of IDS) { const q = inp && inp[id]; if (q && !q.still) move(G, id, q); }
    if (guest) return ev;
    const def = G.def;
    if (G.st === 'net') { for (const id of IDS) { const q = inp && inp[id]; if (q && q.act && !q.still) act(G, id, ev); } netStep(G, ev); return ev; }
    for (const id of IDS) { const q = inp && inp[id]; if (q && q.act && !q.still) act(G, id, ev); }
    for (const id of IDS) lineStep(G, id, inp && inp[id], ev);
    for (const f of G.fish) fishStep(G, f, ev);
    G.fish = G.fish.filter(f => !f.gone);
    tangleCheck(G, ev);
    birdStep(G, ev);
    leakStep(G, inp, ev);
    if (G.st === 'run') {
      G.rt += DT;
      const left = timeLeft(G);
      if (left <= 20 && left + DT > 20) ev.push('last20');
      // the lake keeps its fish; the giants come when it is their time
      const swimmers = G.fish.filter(f => SP[f.sp].sz !== 'g' && SP[f.sp].sz !== 'j').length;
      if (swimmers < (def.pop != null ? def.pop : 6) && (G.spawnT -= DT) <= 0) { spawnFish(G, false); G.spawnT = rr(G, 1.5, 3.5); }
      const gs = def.giants || [];
      if (G.giantI < gs.length && G.rt >= gs[G.giantI][0]) { spawnFish(G, false, gs[G.giantI][1]); G.giantI++; ev.push('giant'); }
      if (left <= 0) {
        G.st = 'dusk'; G.dusk = 0; ev.push('dusk');
        for (const id of IDS) { const L = G.p[id].line; if (['aim', 'sink', 'wait', 'tangle'].includes(L.st)) reelIn(G, id); }
        G.tangle = null;
      }
      return ev;
    }
    if (G.st === 'dusk') {
      G.dusk += DT;
      const busy = IDS.some(id => ['fight', 'surface'].includes(G.p[id].line.st));
      if (!busy || G.dusk >= GRACE) {
        for (const id of IDS) { const L = G.p[id].line; if (L.st !== 'none') { const f = lineFish(G, L); if (f && L.st !== 'aim') release(G, f, 9, ev, 'escape:' + id + ':' + f.sp); Object.assign(L, newLine()); } }
        G.bird = null; G.leaks = [];
        G.st = 'net'; G.toss = { i: 0, t: 0, pt: 0, ph: 'in', p1: '', p1t: 0, res: [], sx: BX }; ev.push('net');
      }
    }
    return ev;
  }
  // what the button would do for this one now (for the screen to point at); no change to anything
  function target(G, id) {
    const p = G.p[id], o = G.p[other(id)], L = p.line;
    if (G.st === 'net') return G.toss && G.toss.ph === 'wait' ? 'net' : '';
    if (o.line.st === 'surface' && L.st === 'none') return Math.abs(p.x - netX(o)) < NET_R ? 'scoop' : 'goscoop';
    if (L.st === 'surface' && (o.line.st === 'fight' || o.line.st === 'surface')) return 'selfscoop';
    if (G.bird && G.bird.st === 'sit' && (L.st === 'none' || L.st === 'aim')) return Math.abs(p.x - BX) < SHOO_R ? 'shoo' : 'goshoo';
    if (L.st === 'tangle') return 'untie';
    if (o.line.st === 'fight' && L.st === 'none') { const f = lineFish(G, o.line); if (f && SP[f.sp].sz === 'g') return Math.abs(o.x - p.x) < HELP_R ? 'help' : 'gohelp'; }
    if (L.st === 'none' && G.leaks.length) { const l = G.leaks.find(l => Math.abs(l.x - p.x) < PLUG_R); return l ? 'plug' : 'goplug'; }
    return L.st;
  }
  function stars(G) { if (!G.over) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }
  const clock = G => ({ t: G.rt, len: G.def.time || TIME, left: Math.max(0, timeLeft(G)) });

  /* ---------- online ---------- */
  function encode(G) {
    const n = G.toss;
    return {
      t: r2(G.t), rt: r2(G.rt), st: G.st, ov: G.over ? 1 : 0, mo: Math.round(G.money), sc: G.score, wa: r1(G.water), du: r1(G.dusk), cv: [G.cv.pink, G.cv.mint],
      p: IDS.map(id => { const p = G.p[id], L = p.line; return [r1(p.x), p.face, p.mv ? 1 : 0, r1(p.depth), LST.indexOf(L.st), r1(L.at), r1(L.hx), r1(L.hy), r2(L.nibT), r2(L.biteT), L.fid, r1(L.d), r1(L.d0), r1(L.ten), L.thr ? 1 : 0, r2(L.netT), L.help ? 1 : 0, p.plug ? 1 : 0]; }),
      f: G.fish.map(f => [f.id, f.sp, r1(f.x), r1(f.y), f.dir, FST.indexOf(f.st)]),
      bd: G.bird ? [['in', 'sit', 'out'].indexOf(G.bird.st), r1(G.bird.x), r1(G.bird.y), r2(G.bird.t), G.bird.sx < BX ? -1 : 1, G.bird.fish != null ? G.bird.fish : -1] : 0,
      lk: G.leaks.map(l => [r1(l.x), r2(l.p)]), tg: G.tangle ? G.tangle.n : -1, bk: G.bucket.slice(-40), jk: G.junk.map(r1),
      nt: n ? [n.i, r2(n.t), ['in', 'wait', 'pull', 'done'].indexOf(n.ph), n.p1 === 'pink' ? 1 : n.p1 === 'mint' ? 2 : 0, r2(n.pt), n.res, r1(n.sx)] : 0, s: G.stats
    };
  }
  function apply(G, m, own) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.rt = num(m.rt, G.rt); G.st = ['count', 'run', 'dusk', 'net'].includes(m.st) ? m.st : G.st; G.over = !!m.ov; G.won = G.over;
    G.money = num(m.mo, G.money); G.score = Math.max(0, num(m.sc, G.score)); G.water = clamp(num(m.wa, G.water), 0, 100); G.dusk = num(m.du, G.dusk);
    if (Array.isArray(m.p) && Array.isArray(m.cv)) IDS.forEach((id, i) => {
      const e = m.p[i], p = G.p[id], L = p.line, cv = Number.isInteger(m.cv[i]) ? m.cv[i] : G.cv[id]; if (!Array.isArray(e)) return;
      const lst = LST[e[4]] || 'none';
      if (id !== own || cv !== G.cv[id] || lst !== 'none' || G.st === 'net') { p.x = clamp(num(e[0], p.x), BX - BHALF, BX + BHALF); p.face = e[1] === -1 ? -1 : 1; p.mv = !!e[2]; }
      G.cv[id] = cv; p.depth = clamp(num(e[3], p.depth), DMIN, DMAX); p.plug = !!e[17];
      Object.assign(L, { st: lst, at: num(e[5]), hx: clamp(num(e[6], L.hx), 0, W), hy: clamp(num(e[7], L.hy), 0, H), nibT: num(e[8]), biteT: num(e[9]), fid: Number.isInteger(e[10]) ? e[10] : -1,
        d: num(e[11]), d0: Math.max(1, num(e[12], 1)), ten: clamp(num(e[13]), 0, 100), thr: !!e[14], netT: num(e[15]), help: !!e[16] });
    });
    if (Array.isArray(m.f)) G.fish = m.f.filter(a => Array.isArray(a) && SP[a[1]]).slice(0, 40).map(a => ({ id: a[0] | 0, sp: a[1], x: num(a[2]), y: num(a[3]), ty: num(a[3]), dir: a[4] === -1 ? -1 : 1, st: FST[a[5]] || 'swim', t: 0, n: 0, wary: 0, own: '', life: 9 }));
    G.bird = Array.isArray(m.bd) ? { st: ['in', 'sit', 'out'][m.bd[0]] || 'in', x: num(m.bd[1]), y: num(m.bd[2]), t: num(m.bd[3]), sx: m.bd[4] < 0 ? -30 : W + 30, fish: SP[m.bd[5]] ? m.bd[5] : null } : null;
    if (Array.isArray(m.lk)) G.leaks = m.lk.filter(Array.isArray).slice(0, 8).map(a => ({ x: num(a[0], BX), p: num(a[1]) }));
    G.tangle = Number.isInteger(m.tg) && m.tg >= 0 ? { n: m.tg, last: '' } : null;
    if (Array.isArray(m.bk)) G.bucket = m.bk.filter(s => Number.isInteger(s) && SP[s]);
    if (Array.isArray(m.jk)) G.junk = m.jk.map(x => num(x)).slice(0, 10);
    if (Array.isArray(m.nt)) { const a = m.nt; G.toss = { i: clamp(num(a[0]) | 0, 0, NET_THROWS), t: num(a[1]), ph: ['in', 'wait', 'pull', 'done'][a[2]] || 'wait', p1: a[3] === 1 ? 'pink' : a[3] === 2 ? 'mint' : '', p1t: 0, pt: num(a[4]), res: Array.isArray(a[5]) ? a[5].map(v => num(v) | 0).slice(0, 3) : [], sx: num(a[6], BX) }; }
    else G.toss = null;
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  function guestMsg(G, own, inp, presses) {
    const i = inp || {}, p = G.p[own];
    return { mx: r2(clamp(num(i.mx), -1, 1)), my: r2(clamp(num(i.my), -1, 1)), u: i.use ? 1 : 0, a: presses | 0, x: r1(p.x), fc: p.face, mv: p.mv ? 1 : 0, cv: G.cv[own] };
  }
  function hostHears(G, rid, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx), -1, 1); rq.my = clamp(num(m.my), -1, 1); rq.use = !!m.u;
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    const p = G.p[rid];
    if (m.cv === G.cv[rid] && Number.isFinite(m.x) && p.line.st === 'none' && G.st !== 'net') {
      const x = clamp(m.x, BX - BHALF, BX + BHALF);
      if (Math.abs(x - p.x) < 80) { p.x = x; p.mv = !!m.mv; p.face = m.fc === -1 ? -1 : 1; } else G.cv[rid]++;
    }
  }

  return { DT, START, W, H, SY, DECK, BX, BHALF, BED, SPEED, TIP, ROD_UP, AIM_PERIOD, CAST_MIN, CAST_MAX, OUT, DMIN, DMAX, NIBBLE_T, BITE_T, REEL, HELP_R, NET_R, NET_T, LMAX, TIME, GRACE,
    FLOOD_PTS, LEAK_RATE, PLUG_T, PLUG_R, BIRD_FLY, BIRD_SIT, SHOO_R, TANGLE_DX, UNTANGLE, NET_SYNC, NET_RING, NET_PTS, NET_THROWS, NET_AMP, NET_IN, NET_PULL, SP, LST,
    load, step, target, stars, clock, encode, apply, guestMsg, hostHears, tipX, netX, aimPower, shoalX, timeLeft, fishById, lineFish: (G, id) => lineFish(G, G.p[id].line) };
})();

/* The climbing pair, for the bots (tests) and the browser pilots. Needs Rope. ropeCrew(G, opt) returns a function
   giving { pink: { mx, my, use, act }, mint: ... } for the next step of G.
   The route: every rock and every spot on a ledge is a place to be; a state is where the two of them are (both holding
   on); a move is one of them going somewhere while the other holds on: a leap (on the shoulders, from a ledge), a walk
   along a ledge, or a move on the rope (let go, hang from the other, climb or slide to the right length, swing and
   grab). How far each state is from the top (both on it) is worked out once a cliff, backwards from the top; then each
   time they are both holding on they take the move that leaves them nearest the top.
   opt: react (s to notice and act), slip (0..1: a late grab, a leap pointed a little wrong, a worse move), pace (walk),
   think (s between moves), gems (how far out of the way they go for a flower), seed. */
function ropeRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function ropePlan(def) {
  if (def._plan) return def._plan;
  const R = Rope, geo = R.parse(def), nodes = [], LIM = R.ROPE - R.SLACK - 4;
  geo.holds.forEach((h, i) => nodes.push({ k: 'h', i, x: h.x, y: h.y, hot: h.cr || h.nest, wet: h.wet, li: -1, gem: -1 }));
  geo.gems.forEach((g, gi) => { nodes[g.h].gem = gi; });
  geo.ledges.forEach((l, li) => {
    const n = Math.max(1, Math.floor((l.x1 - l.x0 - 28) / 28) + 1), w = (n - 1) * 28, x0 = (l.x0 + l.x1) / 2 - w / 2;
    for (let k = 0; k < n; k++) nodes.push({ k: 'l', i: li, x: x0 + k * 28, y: l.y - R.ARM, hot: false, wet: false, li, top: l.top, goat: geo.goats.some(g => g.li === li) });
  });
  const N = nodes.length, D = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
  const near = nodes.map((n, a) => { const r = []; for (let b = 0; b < N; b++) if (b !== a && D(a, b) <= R.ROPE) r.push(b); return r; });
  // where the mover at u can get to with the other holding on at w: [v, cost, kind, extra]
  function moves(u, w) {
    const U = nodes[u], Wn = nodes[w], out = [];
    const boost = U.k === 'l' && Wn.k === 'l' && U.li === Wn.li && Math.abs(U.x - Wn.x) <= R.BOOST_DX;
    const reach = (boost ? R.BOOST : R.REACH) - 4;
    for (const v of near[w]) {
      if (v === u) continue;
      const V = nodes[v], dw = D(v, w);
      if (dw > LIM) continue;
      if (V.k === 'l' && Wn.k === 'l' && V.li === Wn.li && Math.abs(V.x - Wn.x) < 26) continue;
      if (V.k === 'l' && U.k === 'l' && V.li === U.li) { const c = Math.abs(V.x - U.x) / R.WALK + 0.15; out.push([v, c, 'walk']); continue; }
      const d = D(u, v);
      if (d <= reach && d >= 12) out.push([v, 1 + (V.hot ? 0.3 : 0) + (V.wet ? 0.3 : 0) + (d > R.REACH - 4 ? 0.5 : 0) + (V.goat ? 0.4 : 0), 'jump']);
      // on the rope: hang from w, get to the right length, swing to v (a rock below the other; their own ledge by climbing)
      const canHang = U.k === 'h' || (Wn.y < U.y - 24);
      if (!canHang) continue;
      if (V.k === 'h' && V.y > Wn.y + 10 && dw >= R.ROPE_MIN + 6) {
        const th = Math.atan2(Math.abs(V.x - Wn.x), V.y - Wn.y);
        if (th <= 1.2) out.push([v, 2 + Math.abs(D(u, w) - dw) / 110 + th * 1.4 + (V.hot ? 0.3 : 0), 'rope']);
      } else if (V.k === 'l' && Wn.k === 'l' && V.li === Wn.li && Math.abs(V.x - Wn.x) < 60) out.push([v, 1.6 + Math.max(0, D(u, w) - R.ROPE_MIN) / 110, 'rope']);
    }
    return out;
  }
  // the states, and how far each is from the top (backwards from the top)
  const idx = new Int32Array(N * N).fill(-1), SA = [], SB = [];
  for (let a = 0; a < N; a++) for (const b of near[a]) if (D(a, b) <= LIM && !(nodes[a].hot && nodes[b].hot)) { idx[a * N + b] = SA.length; SA.push(a); SB.push(b); }
  const S = SA.length, from = [], to = [], cost = [];
  for (let s = 0; s < S; s++) {
    const a = SA[s], b = SB[s];
    if (nodes[a].top && nodes[b].top && nodes[a].li === nodes[b].li) continue;
    for (const m of [0, 1]) {
      const u = m ? b : a, w = m ? a : b;
      if (nodes[w].hot) continue;                    // the one waiting must not be on a rock that crumbles or by a nest
      for (const [v, c] of moves(u, w)) {
        const t = m ? idx[w * N + v] : idx[v * N + w];
        if (t >= 0) { from.push(s); to.push(t); cost.push(c); }
      }
    }
  }
  const head = new Int32Array(S + 1); for (const t of to) head[t + 1]++; for (let i = 0; i < S; i++) head[i + 1] += head[i];
  const fill = head.slice(0, S), rev = new Int32Array(to.length), rc = new Float64Array(to.length);
  for (let e = 0; e < to.length; e++) { const p = fill[to[e]]++; rev[p] = from[e]; rc[p] = cost[e]; }
  const V = new Float64Array(S).fill(Infinity), heap = [];
  const push = (s, d) => { heap.push([d, s]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let s = 0; s < S; s++) { const a = nodes[SA[s]], b = nodes[SB[s]]; if (a.top && b.top && a.li === b.li) { V[s] = 0; push(s, 0); } }
  while (heap.length) { const [d, s] = pop(); if (d > V[s]) continue; for (let e = head[s]; e < head[s + 1]; e++) { const p = rev[e], nd = d + rc[e]; if (nd < V[p]) { V[p] = nd; push(p, nd); } } }
  const plan = { nodes, N, idx, V, S, moves, D, near, edges: to.length, LIM };
  plan.val = (a, b) => { const s = a >= 0 && b >= 0 ? idx[a * N + b] : -1; return s >= 0 ? V[s] : Infinity; };
  // where someone is now, as a place: their rock, or the nearest spot on their ledge
  plan.nodeOf = p => {
    if (p.st === 'hold') return nodes.findIndex(n => n.k === 'h' && n.i === p.h);
    if (p.st === 'ledge') { let bi = -1, bd = 1e9; nodes.forEach((n, i) => { if (n.k === 'l' && n.li === p.li && Math.abs(n.x - p.x) < bd) { bd = Math.abs(n.x - p.x); bi = i; } }); return bi; }
    return -1;
  };
  Object.defineProperty(def, '_plan', { value: plan, enumerable: false, configurable: true });
  return plan;
}
function ropeCrew(G, opt = {}) {
  const Rr = Rope, R = ropeRng(opt.seed || 1), IDS = ['pink', 'mint'], other = id => (id === 'pink' ? 'mint' : 'pink');
  const react = opt.react == null ? 0.25 : opt.react, slip = opt.slip || 0, pace = opt.pace == null ? 1 : opt.pace, think = opt.think == null ? 0.15 : opt.think;
  const gemW = opt.gems == null ? 0.8 : opt.gems;
  const plan = ropePlan(G.def), P = plan.nodes;
  let job = null, wait = 0.3, bad = {}, held = { pink: false, mint: false };
  const out0 = () => ({ pink: { mx: 0, my: 0, use: false, act: false }, mint: { mx: 0, my: 0, use: false, act: false } });
  // a direction to point the stick that makes the leap go to node v (the screen's aim snaps to the nearest rock that way)
  function aimFor(id, v) {
    const p = G.p[id], V = P[v], base = Math.atan2(V.y - p.y, V.x - p.x);
    for (const da of [0, 0.06, -0.06, 0.12, -0.12, 0.2, -0.2, 0.3, -0.3, 0.42, -0.42]) {
      const a = base + da, mx = Math.cos(a), my = Math.sin(a), tg = Rr.aimTarget(G, id, mx, my);
      if (tg && ((V.k === 'h' && tg.k === 'h' && tg.i === V.i) || (V.k === 'l' && tg.k === 'l' && tg.i === V.li && Math.abs(tg.x - V.x) < 30))) return [mx, my];
    }
    return null;
  }
  function choose() {
    const a = plan.nodeOf(G.p.pink), b = plan.nodeOf(G.p.mint);
    if (a < 0 || b < 0) return null;
    const cands = [];
    const tired = IDS.find(id => G.p[id].st === 'hold' && G.p[id].stam < 35);
    for (const m of [0, 1]) {
      const id = IDS[m], u = m ? b : a, w = m ? a : b;
      if (P[w].hot) continue;
      if (tired && tired !== id && P[w].k === 'h' && P[u].k !== 'l' && R() < 0.5) continue;
      for (const [v, c, kind] of plan.moves(u, w)) {
        if (P[v].k === 'h' && G.hs[P[v].i].gone) continue;
        if (bad[id + ':' + v] > G.t) continue;
        const val = m ? plan.val(w, v) : plan.val(v, w);
        if (!Number.isFinite(val)) continue;
        const gb = P[v].gem >= 0 && !G.gem[P[v].gem] ? gemW : 0;
        // tired hands: a ledge to rest on is worth a little way round
        const rest = P[v].k === 'l' && P[u].k === 'h' && G.p[id].stam < 45 ? 1.2 : 0;
        cands.push({ id, u, v, w, kind, total: c + val - gb - rest, c });
      }
    }
    if (!cands.length) return null;
    cands.sort((x, y) => x.total - y.total);
    let pick = cands[0];
    if (slip && R() < slip * 0.12 && cands.length > 1) pick = cands[Math.min(cands.length - 1, 1 + Math.floor(R() * 3))];
    return pick;
  }
  return function () {
    const out = out0();
    if (G.st !== 'run' || G.over) { job = null; wait = 0.3; return out; }
    for (const id of IDS) { const p = G.p[id]; out[id].use = p.st === 'hold' ? true : held[id]; }
    // goats: shoo one coming at you
    for (const id of IDS) {
      const p = G.p[id]; if (p.st !== 'ledge') continue;
      const g = G.goats.find(g => g.li === p.li && g.shoo <= 0 && (p.x - g.x) * g.dir > -6 && Math.abs(p.x - g.x) < 80);
      if (g && (g.aim > 0 ? Rr.GOAT_AIM - g.aim > react * (0.6 + R() * 0.8) : R() < 0.02)) out[id].act = true;
    }
    if (!job) {
      // someone in the air without a plan: hanging on the rope, pick a rock to swing to; else grab what is near
      const air = IDS.find(id => G.p[id].st === 'air');
      if (air && G.p[air].taut && Rr.anchored(G.p[other(air)]) && G.p[air].stam > 30) {
        const w = plan.nodeOf(G.p[other(air)]), p = G.p[air];
        let best = null;
        if (w >= 0) for (let v = 0; v < P.length; v++) {
          const V = P[v], W = P[w]; if (v === w) continue;
          const dw = Math.hypot(V.x - W.x, V.y - W.y); if (dw > plan.LIM) continue;
          let c;
          if (V.k === 'h' && V.y > W.y + 10 && dw >= Rr.ROPE_MIN + 6 && !G.hs[V.i].gone) { const th = Math.atan2(Math.abs(V.x - W.x), V.y - W.y); if (th > 1.2) continue; c = 2 + Math.abs(G.ropeL - dw) / 110 + th * 1.4 + Math.hypot(V.x - p.x, V.y - p.y) / 300; }
          else if (V.k === 'l' && W.k === 'l' && V.li === W.li && Math.abs(V.x - W.x) < 60 && Math.abs(V.x - W.x) >= 26) c = 1.6 + Math.max(0, G.ropeL - Rr.ROPE_MIN) / 110;
          else continue;
          const m = IDS.indexOf(air), val = m ? plan.val(w, v) : plan.val(v, w);
          if (Number.isFinite(val) && (!best || c + val < best.total)) best = { id: air, u: -1, v, w, kind: 'rope', total: c + val, c };
        }
        if (best) { job = best; job.ph = 'hanging'; job.t = 0; job.loose = 0; }
      }
      if (!job && air) {
        const p = G.p[air], o = G.p[other(air)];
        out[air].use = true; held[air] = true;
        if (p.taut && Rr.anchored(o)) {
          // rest a moment in the harness if the hands are spent, then climb the rope toward the other
          if (p.stam > 30 || (o.st === 'hold' && o.stam < 25)) { out[air].mx = Math.abs(p.vx) > 25 ? Math.sign(p.vx) * 0.6 : 0; if (G.ropeL > Rr.ROPE_MIN + 4 && p.stam > 8 && R() < 0.1) out[air].act = true; }
          if (o.st === 'ledge' && R() < 0.06) out[other(air)].act = true;
        }
        return out;
      }
      if (!job && (wait -= Rr.DT) > 0) return out;
      if (!job) {
        if (IDS.some(id => G.p[id].st === 'ledge' && G.p[id].stam < 60) && IDS.every(id => G.p[id].st === 'ledge' || G.p[id].stam > 50)) return out;
        if (G.wind && G.wind.st === 'warn' && G.wind.t > 0.3) return out;
        job = choose();
        if (!job) { wait = 0.5; return out; }
        job.ph = 'start'; job.t = 0;
      }
      job.lag = react * (0.5 + R()); job.loose = 0;
      if (job.kind === 'jump' && slip && R() < slip * 0.1) job.skew = (R() < 0.5 ? -1 : 1) * 0.35;
    }
    const id = job.id, p = G.p[id], o = G.p[other(id)], V = P[job.v], q = out[id];
    job.t += Rr.DT;
    // a rock that crumbles or a cross bird: no time to think, move on
    const done = () => { job = null; const v = plan.nodeOf(G.p[id]); wait = v >= 0 && P[v].hot ? react * 0.5 : think * (0.5 + R()); };
    const fail = () => { bad[id + ':' + job.v] = G.t + 6; job = null; wait = 0.2; };
    if (job.kind === 'walk') {
      if (p.st !== 'ledge') { done(); return out; }
      held[id] = false; q.use = false;
      const dx = V.x - p.x; if (Math.abs(dx) < 5 || job.t > 6) { done(); return out; }
      q.mx = Math.sign(dx) * pace; return out;
    }
    if (job.kind === 'jump') {
      if (job.ph === 'start') {
        if (!Rr.anchored(p)) { done(); return out; }
        const aim = aimFor(id, job.v);
        if (!aim) { fail(); return out; }
        job.aim = aim; job.ph = 'aim'; job.t = 0;
      }
      if (job.ph === 'aim') {
        let [mx, my] = job.aim; if (job.skew) { const a = Math.atan2(my, mx) + job.skew; mx = Math.cos(a); my = Math.sin(a); }
        q.mx = mx; q.my = my;
        if (p.st === 'ledge' && !p.armed && p.held) { q.use = false; held[id] = false; job.t = 0; return out; }   // let go first: a jump from a ledge is a fresh press
        q.use = true; held[id] = true;
        if (job.t >= job.lag + 0.05) { job.ph = 'go'; job.t = 0; }
        return out;
      }
      if (job.ph === 'go') { q.mx = job.aim[0]; q.my = job.aim[1]; q.use = false; held[id] = false; job.ph = 'fly'; job.t = 0; job.late = slip && R() < slip * 0.18; job.pressAt = -1; return out; }
      if (job.ph === 'fly') {
        // press again to hold on as you get there (a sloppy one sometimes too late: slips off)
        if (job.pressAt < 0) job.pressAt = job.late && p.tgt ? p.tf + Rr.CATCH + 0.05 : 0.04 + R() * react * 0.6;
        const go = job.t >= job.pressAt || p.st === 'hold';
        q.use = go; held[id] = go;
        if (p.st === 'hold' && p.firm) { done(); return out; }
        if (p.st === 'ledge') { done(); return out; }
        if (p.st === 'air' && p.taut && job.t > 0.4) { job = null; wait = 0; return out; }
        if (job.t > 3) { job = null; return out; }
        return out;
      }
    }
    if (job.kind === 'rope') {
      if (job.ph === 'start') {
        if (!Rr.anchored(p) || !Rr.anchored(o)) { job = null; return out; }
        q.act = true; q.use = true; job.ph = 'hang'; job.t = 0; return out;
      }
      if (p.st === 'hold' || p.st === 'ledge') { done(); return out; }
      if (!Rr.anchored(o)) { job = null; return out; }
      job.loose = p.taut ? 0 : job.loose + Rr.DT;
      if (job.loose > 0.8 && job.t > 1) { job = null; return out; }
      const W = P[job.w], toLedge = V.k === 'l';
      const Lv = toLedge ? Rr.ROPE_MIN : Math.max(Rr.ROPE_MIN, Math.hypot(V.x - o.x, V.y - o.y) - 2);
      if (G.ropeL > Lv + 6) { if (job.t > (job.nextAct || 0)) { q.act = true; job.nextAct = job.t + 0.09 + react * 0.25 + R() * 0.05; } if (o.st === 'ledge' && R() < 0.12) out[other(id)].act = true; }
      else if (G.ropeL < Lv - 6) q.my = 1;
      // swing toward it: push the way you are moving
      const side = Math.sign(V.x - o.x) || 1;
      if (!toLedge) { const sp = Math.hypot(p.vx, p.vy); q.mx = sp > 30 ? Math.sign(p.vx) : side; }
      const dv = Math.hypot(V.x - p.x, V.y - p.y);
      const want = toLedge ? G.ropeL <= Lv + 8 : dv < 44;
      q.use = want; held[id] = want;
      if (job.t > 9) fail();
      void W;
      return out;
    }
    return out;
  };
}

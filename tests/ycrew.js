/* The fishing pair, for the bots (tests) and the browser pilots. Needs Fish. fishCrew(G, opt) returns a function giving
   { pink: { mx, my, act, use }, mint: ... } for the next step of G. Each fishes off their own end of the boat (pink
   left, mint right), strikes on the bite, reels while the fish is calm and lets go while it thrashes; the other comes to
   scoop a big fish with the net, comes to pull on a giant, shoos the bird, plugs the leaks, and at dusk they throw the
   net as the shoal passes under the boat.
   opt: react (s late to notice things), slip (0..1: a strike on a nibble, a cast to the wrong side, holding on through
   a thrash), care (0..1: how readily they leave their own rod to help), greed (tension they reel up to), pace (stick),
   seed. */
function fishRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function fishCrew(G, opt = {}) {
  const R = fishRng(opt.seed || 1), IDS = ['pink', 'mint'], other = id => (id === 'pink' ? 'mint' : 'pink'), F = Fish;
  const react = opt.react == null ? .25 : opt.react, slip = opt.slip || 0, care = opt.care == null ? 1 : opt.care;
  const greed = opt.greed == null ? 78 : opt.greed, pace = opt.pace == null ? 1 : opt.pace;
  const mem = {};
  for (const id of IDS) mem[id] = { cd: 0, aimAt: .7, side: id === 'pink' ? -1 : 1, depth: 400, thr: false, thrAt: 0, seenThr: false, biteAt: -1, nibAt: -1, nibDone: -1, job: '', jobT: 0, hold: false, netAt: -1 };
  const big = f => f && F.SP[f.sp].sz === 'g';
  const walk = (o, id, x) => { const p = G.p[id], d = x - p.x; if (Math.abs(d) > 5) o.mx = Math.sign(d) * pace; return Math.abs(d) <= 8; };
  function press(o, m) { if (m.cd <= 0) { o.act = true; m.cd = .18 + R() * .1; } }
  return function () {
    const out = { pink: { mx: 0, my: 0, act: false, use: false }, mint: { mx: 0, my: 0, act: false, use: false } };
    for (const id of IDS) mem[id].cd -= F.DT;
    if (G.st === 'count' || G.over) return out;
    if (G.st === 'net') {
      const n = G.toss; if (!n || n.ph !== 'wait') { for (const id of IDS) mem[id].netAt = -1; return out; }
      const sx = F.shoalX(G), soon = F.shoalX(Object.assign({}, G, { toss: Object.assign({}, n, { t: n.t + react * .6 }) }));
      for (const id of IDS) {
        const m = mem[id];
        if (m.netAt < 0 && Math.abs(soon - F.BX) < 20 && n.t > .5 && n.p1 !== id) m.netAt = G.t + R() * (.08 + slip * .5) + react * .15;
        if (m.netAt >= 0 && G.t >= m.netAt) { out[id].act = true; m.netAt = -1; }
      }
      void sx;
      return out;
    }
    for (const id of IDS) {
      const o = out[id], m = mem[id], p = G.p[id], L = p.line, q = G.p[other(id)], Q = q.line, f = F.lineFish(G, id), qf = F.lineFish(G, other(id));
      // the other's big fish beside the boat: scoop it
      if (Q.st === 'surface' && L.st === 'none') { if (walk(o, id, F.netX(q) - q.face * 30) && Q.netT < F.NET_T - react) press(o, m); continue; }
      if (Q.st === 'surface' && (L.st === 'wait' || L.st === 'sink') && !(f && (f.st === 'nib' || f.st === 'bite')) && R() < care * .05) { press(o, m); continue; }
      if (L.st === 'surface' && (Q.st === 'fight' || Q.st === 'surface')) { if (L.netT < F.NET_T - react - .3) press(o, m); continue; }
      // the other has a giant on: come and pull
      if (Q.st === 'fight' && big(qf) && L.st === 'none') { if (walk(o, id, q.x - q.face * 30)) o.use = true; continue; }
      if (Q.st === 'fight' && big(qf) && (L.st === 'wait' || L.st === 'sink') && !(f && (f.st === 'nib' || f.st === 'bite')) && R() < care * .02) { press(o, m); continue; }
      // the tangle: press in turns
      if (L.st === 'tangle') { if (G.tangle && G.tangle.last !== id && R() < .08) press(o, m); continue; }
      // the bird on the bucket: whoever is free and nearer
      if (G.bird && G.bird.st === 'sit' && L.st === 'none' && (q.line.st !== 'none' || Math.abs(p.x - F.BX) <= Math.abs(q.x - F.BX))) {
        if (G.bird.t > react && walk(o, id, F.BX)) press(o, m); continue;
      }
      // a leak: plug it (leave the rod if the water is getting high)
      if (G.leaks.length && (L.st === 'none' || ((L.st === 'wait' || L.st === 'sink') && !f && (G.water > 40 || q.line.st === 'fight') && R() < care * .03))) {
        if (L.st !== 'none') { press(o, m); continue; }
        const l = G.leaks.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
        const theirs = q.plug && Math.abs(q.x - l.x) < F.PLUG_R;
        const l2 = theirs ? G.leaks.find(x => x !== l) : l;
        if (l2) { if (walk(o, id, l2.x)) o.use = true; continue; }
      }
      if (L.st === 'none') {
        if (G.st !== 'run' || F.timeLeft(G) < 3) { walk(o, id, F.BX + m.side * 40); continue; }
        if (m.job !== 'cast') { m.job = 'cast'; m.side = (id === 'pink' ? -1 : 1) * (R() < slip * .15 ? -1 : 1); }
        const end = F.BX + m.side * F.BHALF;
        if (Math.abs(p.x - end) > 3 || p.face !== m.side) { o.mx = m.side * pace; continue; }
        const gi = G.fish.find(x => F.SP[x.sp].sz === 'g' && x.st === 'swim');
        m.aimAt = .45 + R() * .5; m.depth = gi && R() < care ? 470 + R() * 25 : 330 + R() * 160;
        if (gi && R() < care) { const want = Math.abs(gi.x - F.BX) - F.BHALF - F.TIP - F.CAST_MIN; m.aimAt = Math.max(0, Math.min(1, want / (F.CAST_MAX - F.CAST_MIN))); }
        press(o, m); continue;
      }
      m.job = '';
      if (L.st === 'aim') { const pw = F.aimPower(L), rising = (L.at % F.AIM_PERIOD) < F.AIM_PERIOD / 2; if (rising && pw >= m.aimAt - .03 && pw <= m.aimAt + .05) press(o, m); continue; }
      if (L.st === 'sink' || L.st === 'wait') {
        o.my = Math.abs(p.depth - m.depth) > 6 ? Math.sign(m.depth - p.depth) : 0;
        if (L.biteT > 0) { if (m.biteAt < 0) m.biteAt = G.t + react * (.6 + R() * .8); if (G.t >= m.biteAt) { press(o, m); m.biteAt = -1; } }
        else m.biteAt = -1;
        if (L.nibT > 0 && m.nibDone !== L.fid) { m.nibDone = L.fid; if (R() < slip * .25) press(o, m); }
        if (L.st === 'wait' && !f && R() < F.DT / 25) press(o, m);
        continue;
      }
      if (L.st === 'fight') {
        if (L.thr !== m.thr) { m.thr = L.thr; m.thrAt = G.t; }
        const seen = G.t - m.thrAt > react ? L.thr : !L.thr;
        const hold = slip > 0 && R() < slip * .004 ? !m.hold : m.hold;
        m.hold = !seen ? L.ten < greed : L.ten < greed * .25;
        o.use = hold;
        continue;
      }
    }
    return out;
  };
}

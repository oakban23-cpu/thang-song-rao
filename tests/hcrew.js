/* The sleeping couple for the bots (tests) and the browser pilots. Needs Bed. bedCrew(G, opt) returns a function giving
   { pink: { mx, pull, act }, mint: ... } for the next step of G. opt: react (s), think (s between decisions), sloppy
   (0..1: chance of not bothering), seed. */
function bedRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function bedCrew(G, opt = {}) {
  const R = bedRng(opt.seed || 1), react = opt.react == null ? 0.2 : opt.react, think = opt.think == null ? 0.1 : opt.think, lazy = opt.sloppy || 0;
  const seen = [], WHO = ['pink', 'mint'];
  let next = 0, plan = { pink: {}, mint: {} };
  function decide(s) {
    const out = { pink: { mx: 0, pull: false, act: false }, mint: { mx: 0, pull: false, act: false } };
    if (s.st !== 'run') { plan = out; return; }
    const mid = (s.x.pink + s.x.mint) / 2, hotW = WHO.find(w => s.H[w] > 75);
    for (const w of WHO) {
      const o = w === 'pink' ? 'mint' : 'pink', me = out[w];
      if (s.awake[w] > 0 || R() < lazy) continue;
      // lie close together in the middle of the bed; whoever is too warm shifts out a little
      const spread = s.H[w] > 75 ? 34 : 0, side = w === 'pink' ? -1 : 1;
      const want = Bed.BW / 2 + side * ((Bed.GAP + 2) / 2 + spread);
      const dx = want - s.x[w]; me.mx = Math.abs(dx) < 3 ? 0 : Math.max(-1, Math.min(1, dx / 12));
      // the blanket: over the middle of the two, or toward the one who is not too warm; the one it has slipped away
      // from pulls (never both against each other)
      const aim = hotW ? s.x[hotW === 'pink' ? 'mint' : 'pink'] + (hotW === 'pink' ? -18 : 18) : mid;
      const off = s.c - aim, mine = w === 'pink' ? off > 6 : off < -6;
      if (mine && !s.pull[o] && (hotW !== w)) me.pull = true;
      // the button: a mosquito sitting on me, or a smell to air (by the one who did not do it, if it is warm enough)
      if (s.mq && s.mq.st === 'sit' && s.mq.on === w) me.act = true;
      else if (!s.mq && s.stink > 35 && s.stinkWho !== w && s.H[w] > 45 && s.H[o] > 45 && s.cov[w] > 0.3) me.act = true;
    }
    plan = out;
  }
  return () => {
    seen.push({ t: G.t, st: G.st, x: Object.assign({}, G.x), c: G.c, H: Object.assign({}, G.H), awake: Object.assign({}, G.awake), pull: Object.assign({}, G.pull),
      cov: { pink: Bed.cover(G, 'pink'), mint: Bed.cover(G, 'mint') }, mq: G.mq ? { st: G.mq.st, on: G.mq.on } : null, stink: G.stink, stinkWho: G.stinkWho });
    while (seen.length > 1 && seen[1].t <= G.t - react) seen.shift();
    let fresh = false;
    if (G.t >= next) { decide(seen[0]); next = G.t + think * (0.6 + R() * 0.8); fresh = true; }
    const out = { pink: Object.assign({}, plan.pink), mint: Object.assign({}, plan.mint) };
    if (!fresh) out.pink.act = out.mint.act = false;
    plan.pink.act = plan.mint.act = false;
    return out;
  };
}

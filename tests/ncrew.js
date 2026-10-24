/* The sneaking couple for the bots (tests) and the browser pilots. Needs Win. climbCrew(G, opt) returns a function
   giving { climb: { mx, my, act }, top: { my, act } } for the next step of G. They only go by what a player could see
   or hear (lit windows, the engine of a car, footsteps on the stairs, dad at a window), late by react seconds.
   opt: react (s), think (s between decisions), miss (0..1: chance of not noticing a warning for a while), careless
   (0..1: chance of stomping across a stretch of gravel), seed. */
function climbRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function climbCrew(G, opt = {}) {
  const R = climbRng(opt.seed || 1), react = opt.react == null ? 0.2 : opt.react, think = opt.think == null ? 0.1 : opt.think, miss = opt.miss || 0;
  const def = G.def, h = Win.her(def), seen = [], deaf = {};
  let next = 0, plan = { climb: {}, top: {} }, topWait = 0, hideWait = 0;
  // a warning (by name) goes unnoticed for a while now and then
  const noticed = (key, s) => { if (!(key in deaf)) deaf[key] = R() < miss ? s.t + 0.6 + R() * 1.2 : 0; return s.t >= deaf[key]; };
  // a lit window, or the glow of dad on his way there (if noticed)
  const glowKey = t => { const d = def.dad || []; for (let i = 0; i < d.length; i++) { const a = Win.START + d[i][0]; if (t >= a - Win.LIGHT_TELL && t < a) return 'glow' + i; } return 'glow'; };
  const lit = (s, x, y) => Win.windowLit(def, s.t, x, y) || (Win.windowSoon(def, s.t, x, y) && noticed(glowKey(s.t), s));
  // now and then a careless climber forgets to tread softly on gravel
  const stomp = {};
  function decide(s) {
    const c = { mx: 0, my: 0, act: false }, tp = { my: 0, act: false };
    plan = { climb: c, top: tp };
    if (s.st !== 'run' || s.C.on === 'in') return;
    const C = s.C, T = s.T, door = s.door, car = s.car, look = s.look;
    const carNear = car && noticed('car' + car.i, s) && (car.st === 'tell' || car.x < h.x + Win.CAR_W);
    const doorNear = door && noticed('door' + door[1], s);
    const rest = h.y - Win.TOP_GAP - C.y, up = Win.CLIMB * (def.cake ? 0.8 : 1) + Win.PULLUP;
    const carLeft = car ? (car.st === 'tell' ? car.left : 0) + Math.max(0, (h.x - Win.CAR_W / 2 - car.x) / ((Win.W + 300) / Win.CAR_T)) : 9;
    // ---- upstairs
    if (s.t >= topWait) {
      if (doorNear && door[0] === 'tell' && T.at === 'window') {
        // stay a moment only to let a climber who is nearly there in, or to pull the sheet in first (a car might come)
        const stay = C.on === 'sheet' ? rest / up < door[2] - Win.TO_BED - 0.35 : T.len > Win.SHOWS && (T.len - Win.SHOWS + 8) / Win.SHEET_V < door[2] - Win.TO_BED - 0.35;
        if (!stay) { tp.act = true; topWait = s.t + Win.TO_BED + react + 0.25; }
        else if (C.on !== 'sheet') tp.my = -1;
      } else if (door && door[0] === 'look' && T.at === 'window') { tp.act = true; topWait = s.t + Win.TO_BED + react + 0.25; }
      else if (T.at === 'bed' && !door) { tp.act = true; topWait = s.t + Win.TO_BED + react + 0.25; }
    }
    if (T.at === 'window' && T.move <= 0 && !tp.my) {
      // the sheet goes down only for a climber waiting below with nothing coming, and up again otherwise
      if (C.on === 'sheet') { if (!(carNear && rest / up > carLeft)) tp.my = -1; }
      else if (Math.abs(C.x - h.x) < 70 && !carNear && !doorNear && !C.hid) { if (T.len < h.y - Win.GRAB_Y + 8) tp.my = 1; }
      else if (T.len > Win.SHOWS - 12) tp.my = -1;
    }
    // ---- the climber
    if (C.on === 'sheet') {
      const held = T.at === 'window' && !(doorNear && door[0] === 'tell' && !(rest / up < door[2] - Win.TO_BED - 0.35));
      if (carNear) { if (rest / up < carLeft - 0.2) c.my = -1; else c.my = 1; }
      else if (held) c.my = -1;
      else if (C.stam < 20 + C.y / 10 || (doorNear && C.y < 60)) c.my = 1;
      return;
    }
    // on the ground: a man at a window looks for anyone not in a bush
    const inLook = look.st && noticed('look' + look.n, s) && Math.abs(C.x - look.x) < Win.LOOK_W + 25;
    const bushAt = Win.inBush(def, C.x);
    if (inLook) {
      if (C.hid) return;
      if (bushAt) { if (s.t >= hideWait) { c.act = true; hideWait = s.t + 0.4 + react; } return; }
      const b = (def.bushes || []).reduce((q, x) => (!q || Math.abs(x.x - C.x) < Math.abs(q.x - C.x) ? x : q), null);
      const left = look.st === 'tell' ? look.t : 0, outR = look.x + Win.LOOK_W + 6 - C.x, outL = look.x - Win.LOOK_W - 6 - C.x;
      const out = Math.abs(outR) < Math.abs(outL) ? outR : outL, bd = b ? b.x - C.x : 1e9;
      const go = Math.abs(bd) < Math.abs(out) || Math.abs(out) / Win.WALK > left + 0.3 && Math.abs(bd) / Win.WALK < Math.abs(out) / Win.WALK ? bd : out;
      c.mx = Math.sign(go); return;
    }
    if (C.hid) { if (!look.st && s.t >= hideWait) { c.act = true; hideWait = s.t + 0.4 + react; } return; }
    // stand still while headlights or a lit window could catch me moving
    if (carNear && Math.abs(car.x - C.x) < Win.CAR_W + 90 + (car.st === 'tell' ? 1e9 : 0)) return;
    if (car && car.st === 'sweep' && car.x < C.x + Win.CAR_W + 10) return;
    if (lit(s, C.x, 0)) return;
    const dx = h.x - C.x;
    if (Math.abs(dx) < Win.REACH - 6) {
      // under her window: up once the sheet is down and nothing is coming
      if (T.at === 'window' && T.move <= 0 && s.bottom <= Win.GRAB_Y && !carNear && !doorNear && !(look.st && Math.abs(C.x - look.x) < Win.LOOK_W + 25)) c.my = -1;
      return;
    }
    const dir = Math.sign(dx);
    if (lit(s, C.x + dir * 14, 0)) return;
    const g = (def.gravel || []).findIndex(q => C.x + dir * 8 >= q[0] && C.x - dir * 8 <= q[1]);
    if (g >= 0 && !(g in stomp)) stomp[g] = R() < (opt.careless || 0);
    const speed = g < 0 || stomp[g] ? 1 : s.dog > 55 ? 0 : 0.4;
    c.mx = dir * Math.min(speed, Math.abs(dx) / 20 + 0.2);
  }
  return () => {
    const car = Win.carAt(def, G.t), door = Win.doorAt(def, G.t);
    if (car && car.st === 'tell') car.left = Win.START + def.cars[car.i] - G.t;
    if (door) door[2] = door[0] === 'tell' ? Win.START + def.dad[door[1]][0] - G.t : 0;
    seen.push({ t: G.t, st: G.st, C: Object.assign({}, G.c), T: Object.assign({}, G.top), bottom: Win.sheetBottom(G), dog: G.dog, car, door,
      look: Object.assign({ n: G.stats.barks + G.stats.seen }, G.look) });
    while (seen.length > 1 && seen[1].t <= G.t - react) seen.shift();
    let fresh = false;
    // the players see their own characters straight away; what happens around them reaches them react seconds late
    if (G.t >= next) { decide(Object.assign({}, seen[0], { C: Object.assign({}, G.c), T: Object.assign({}, G.top), bottom: Win.sheetBottom(G), dog: G.dog })); next = G.t + think * (0.6 + R() * 0.8); fresh = true; }
    const out = { climb: Object.assign({}, plan.climb), top: Object.assign({}, plan.top) };
    if (!fresh) out.climb.act = out.top.act = false;
    plan.climb.act = plan.top.act = false;
    return out;
  };
}

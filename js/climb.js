/* Climbing in at the window (ปีนหน้าต่างหาแฟน). One player sneaks along the front of the house at night and climbs a
   bed sheet up to the other's window; the other, upstairs, lets the sheet down when the coast is clear, pulls it back
   in when a car is coming (a sheet hanging out of a window in the headlights gets noticed), can help haul the climber
   up, and has to dive into bed whenever dad comes to check the room (the sheet stays tied to the bed leg, but nobody
   is holding it: the climber cannot climb and slowly slides). Dad walks from room to room and the room he is in has its
   light on: anyone moving in a lit patch is seen (a dark shape standing still is not). Cars sweep their headlights
   across the house. Gravel crunches and wakes the dog; a barking dog brings dad to the nearest window to look out, and
   a man looking out sees anyone who is not hiding in a bush. Seen, caught out of bed, or falling from high up: a
   strike; three and it is over. Getting in quickly scores more. x along the house (0..W), y up from the ground. */
const Win = (() => {
  'use strict';
  const DT = 1 / 120, START = 2, W = 960;
  const WALK = 95, CLIMB = 45, DESCEND = 90, PULLUP = 30, SLIP = 30, SHEET_V = 160, REACH = 22, GRAB_Y = 50, TOP_GAP = 14, SHOWS = 60;
  const STAM_ON = 3.5, STAM_LOOSE = 8, STAM_BACK = 12, HIGH_FALL = 90;
  const TO_BED = 0.6, DOOR_TELL = 2, DOOR_LOOK = 2.2;
  const LIGHT_W = 80, LOOK_W = 130, LOOK_TELL = 1.5, LOOK_T = 3, CAR_TELL = 2.5, CAR_T = 2.6, CAR_W = 140;
  const SEE_T = 0.45, SEEN_GAP = 2.5, LIGHT_TELL = 1;
  const N_GRAVEL = 130, N_CLIMB = 10, N_SLIP = 12, N_FALL = 70, N_DOWN = 9, BARK_AFTER = 25;
  const STRIKES = 3, STRIKE_PTS = 400, TIME_PTS = 5, GAP = 120;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;

  // where dad is at time t: def.dad is [[from s, room], ...]; a room is a window by name, 'her' is a check on her room
  function dadAt(def, t) { let r = 'away'; for (const [t0, room] of def.dad || []) if (t - START >= t0) r = room; return r; }
  // dad at her door: footsteps first (the tell), then he opens the door and looks; [state, which visit]
  function doorAt(def, t) {
    const d = def.dad || [];
    for (let i = 0; i < d.length; i++) if (d[i][1] === 'her') { const a = START + d[i][0]; if (t >= a - DOOR_TELL && t < a) return ['tell', i]; if (t >= a && t < a + DOOR_LOOK) return ['look', i]; }
    return null;
  }
  // a passing car: the engine first (the tell), then its headlights sweep along the house from left to right
  function carAt(def, t) {
    const c = def.cars || [];
    for (let i = 0; i < c.length; i++) { const a = START + c[i]; if (t >= a - CAR_TELL && t < a) return { st: 'tell', i, x: -150 }; if (t >= a && t < a + CAR_T) return { st: 'sweep', i, x: (t - a) / CAR_T * (W + 300) - 150 }; }
    return null;
  }
  const her = def => def.windows.find(w => w.room === 'her');
  const roomLit = (def, room, x, y) => room !== 'her' && room !== 'away' && def.windows.some(w => w.room === room && Math.abs(x - w.x) < LIGHT_W && y < w.y + 30);
  const windowLit = (def, t, x, y) => roomLit(def, dadAt(def, t), x, y);
  // dad on his way to a room: a glow (his torch, the hall light) shows there a moment before the light comes on
  const glowAt = (def, t) => { const now = dadAt(def, t), soon = dadAt(def, t + LIGHT_TELL); return soon !== now && soon !== 'her' && soon !== 'away' ? soon : null; };
  const windowSoon = (def, t, x, y) => { const r = glowAt(def, t); return !!r && roomLit(def, r, x, y); };
  const carLit = (def, t, x) => { const c = carAt(def, t); return !!c && c.st === 'sweep' && Math.abs(x - c.x) < CAR_W; };
  const lookCone = (G, x, y) => G.look.st === 'look' && Math.abs(x - G.look.x) < LOOK_W && y < G.look.y + 40;
  const inBush = (def, x) => (def.bushes || []).some(b => Math.abs(x - b.x) < b.w / 2);
  const onGravel = (def, x) => (def.gravel || []).some(g => x >= g[0] && x <= g[1]);
  const sheetBottom = G => her(G.def).y - G.top.len;
  const canGrab = (G, slack) => G.top.at === 'window' && sheetBottom(G) <= GRAB_Y + (slack || 0);
  // the nearest window dad can look out of (not hers)
  const nearestWindow = (def, x) => def.windows.filter(w => w.room !== 'her').reduce((b, w) => (!b || Math.abs(w.x - x) < Math.abs(b.x - x) ? w : b), null);
  function load(def) {
    return {
      def, t: 0, st: 'count', over: false, won: false, failed: false,
      c: { x: def.start, y: 0, on: 'ground', hid: false, stam: 100, mv: false, sp: 0, exp: 0 },
      top: { at: 'window', move: 0, len: 0, pull: false },
      cv: 0, dog: 0, look: { st: null, t: 0, x: 0, y: 0 }, strikes: 0, lastSeen: -9, carSeen: -1, doorDone: -1, doorTold: -1, carTold: -1,
      inT: 0, score: 0, stats: { seen: 0, barks: 0, caught: 0, falls: 0, hides: 0, sheet: 0 }, net: null
    };
  }
  function strike(G, why, ev) {
    G.strikes++; ev.push('strike:' + why);
    if (G.strikes >= (G.def.strikes || STRIKES) && !G.over) { G.over = true; G.failed = true; ev.push('caught'); }
  }
  function lookout(G, x, ev) {
    if (G.look.st) return;
    const w = nearestWindow(G.def, x); if (!w) return;
    G.look = { st: 'tell', t: LOOK_TELL, x: w.x, y: w.y }; ev.push('look:tell');
  }
  /* the top player: act goes to bed / back to the window; my < 0 pulls the sheet up (and the climber with it), my > 0
     lets it down. Without an input (another phone's player) the top stays as last heard. */
  function topStep(G, ti, ev) {
    const T = G.top, C = G.c, def = G.def;
    if (T.move > 0) { T.move -= DT; if (T.move <= 0) { T.move = 0; T.at = T.at === 'toBed' ? 'bed' : 'window'; ev.push('top:' + T.at); } }
    if (!ti) return;
    const ty = Number.isFinite(ti.my) ? clamp(ti.my, -1, 1) : 0;
    if (ti.act && T.move <= 0) { T.at = T.at === 'window' ? 'toBed' : 'toWindow'; T.move = TO_BED; ev.push('top:' + T.at); }
    T.pull = T.at === 'window' && C.on === 'sheet' && ty < -0.3;
    if (T.at === 'window' && C.on !== 'sheet' && Math.abs(ty) > 0.15) T.len = clamp(T.len + ty * SHEET_V * DT, 0, def.sheet);
  }
  /* the climber: mx walks, my < 0 climbs (or grabs the sheet), my > 0 climbs down, act hides in a bush or comes out */
  function climbStep(G, ci, guest, ev) {
    const C = G.c, T = G.top, def = G.def, h = her(def);
    const held = T.at === 'window', mx = ci && Number.isFinite(ci.mx) ? clamp(ci.mx, -1, 1) : 0, my = ci && Number.isFinite(ci.my) ? clamp(ci.my, -1, 1) : 0;
    C.mv = false; C.sp = 0;
    if (C.on === 'in') return;
    if (C.on === 'ground') {
      if (ci && ci.act) {
        if (C.hid) { C.hid = false; ev.push('unhide'); } else if (inBush(def, C.x)) { C.hid = true; G.stats.hides++; ev.push('hide'); }
      }
      if (!C.hid && Math.abs(mx) > 0.15) { const x0 = C.x; C.x = clamp(C.x + mx * WALK * DT, 16, W - 16); C.sp = Math.abs(C.x - x0) / DT; C.mv = C.sp > 1; }
      if (!C.hid && my < -0.5 && Math.abs(C.x - h.x) < REACH && canGrab(G)) { C.on = 'sheet'; C.y = 1; C.x = h.x; ev.push('grab'); }
      C.stam = Math.min(100, C.stam + STAM_BACK * DT);
      return;
    }
    // on the sheet
    const y0 = C.y, slow = def.cake ? 0.8 : 1;
    if (held && my < -0.3) { C.y += CLIMB * slow * -my * DT; C.mv = true; }
    if (T.pull && held) { C.y += PULLUP * DT; C.mv = true; }
    if (my > 0.3) { C.y -= DESCEND * my * DT; C.mv = true; }
    if (!held) C.y -= SLIP * DT;
    C.y = clamp(C.y, 0, h.y - TOP_GAP);
    C.sp = Math.abs(C.y - y0) / DT;
    C.stam -= (held ? STAM_ON : STAM_LOOSE) * DT;
    if (C.y <= 0) { C.on = 'ground'; C.y = 0; ev.push('down'); return; }
    if (guest) return;
    if (C.stam <= 0) {
      const high = C.y > HIGH_FALL; C.stam = 30; C.on = 'ground'; C.y = 0; G.cv++; G.dog += N_FALL; G.stats.falls++; ev.push('fall:' + (high ? 'high' : 'low'));
      if (high) strike(G, 'fall', ev);
      return;
    }
    if (C.y >= h.y - TOP_GAP - 0.5 && held) {
      C.on = 'in'; C.y = h.y; G.cv++; G.won = true; G.over = true; G.inT = G.t - START;
      G.score = Math.max(0, Math.round(def.points + Math.max(0, def.time - G.inT) * TIME_PTS - G.strikes * STRIKE_PTS)); ev.push('in');
    }
  }
  /* one step. inp.climb = { mx, my, act }, inp.top = { my, act } (act: a single press). A missing role is played on
     another phone: it stays as last heard. guest: things move, nothing is decided (the host does that). */
  function step(G, inp, guest) {
    const ev = [];
    if (G.over) return ev;
    G.t += DT;
    if (G.st === 'count') { if (G.t >= START) { G.st = 'run'; ev.push('go'); } return ev; }
    const def = G.def, C = G.c, T = G.top, h = her(def);
    topStep(G, inp && inp.top, ev);
    climbStep(G, inp && inp.climb, guest, ev);
    if (G.over || guest) return ev;
    // noise and the dog
    if (C.on === 'ground' && C.mv && onGravel(def, C.x)) G.dog += N_GRAVEL * (C.sp / WALK) ** 2 * DT;
    if (C.on === 'sheet') G.dog += (T.at === 'window' ? N_CLIMB * Math.min(1, C.sp / CLIMB) ** 2 : N_SLIP) * DT;
    G.dog = clamp(G.dog - N_DOWN * DT, 0, 100);
    if (G.dog >= 100) { if (def.dog) { G.dog = BARK_AFTER; G.stats.barks++; ev.push('bark'); lookout(G, C.x, ev); } else G.dog = 99; }
    // dad looking out of a window
    if (G.look.st) { G.look.t -= DT; if (G.look.t <= 0) { if (G.look.st === 'tell') { G.look.st = 'look'; G.look.t = LOOK_T; ev.push('look'); } else { G.look.st = null; ev.push('look:end'); } } }
    // dad at her door: she had better be in bed
    const door = doorAt(def, G.t);
    if (door && door[0] === 'tell' && G.doorTold !== door[1]) { G.doorTold = door[1]; ev.push('door'); }
    if (door && door[0] === 'look' && G.doorDone !== door[1]) {
      if (T.at !== 'bed') { G.doorDone = door[1]; G.stats.caught++; ev.push('caught:bed'); strike(G, 'door', ev); }
      else if (G.t + DT >= START + def.dad[door[1]][0] + DOOR_LOOK) { G.doorDone = door[1]; ev.push('door:ok'); }
    }
    // a car: its engine, then the headlights; a sheet hanging down from her window catches the light
    const car = carAt(def, G.t);
    if (car && car.st === 'tell' && G.carTold !== car.i) { G.carTold = car.i; ev.push('car'); }
    if (car && car.st === 'sweep' && G.carSeen !== car.i && Math.abs(car.x - h.x) < CAR_W / 2 && T.len > SHOWS) { G.carSeen = car.i; G.stats.sheet++; ev.push('seen:sheet'); strike(G, 'sheet', ev); }
    // seen: moving in a lit patch, or anywhere in front of a man looking out (unless in a bush)
    if (!G.over && C.on !== 'in') {
      const exposed = !C.hid && (lookCone(G, C.x, C.y) || (C.mv && (windowLit(def, G.t, C.x, C.y) || carLit(def, G.t, C.x))));
      C.exp = exposed ? C.exp + DT : Math.max(0, C.exp - 2 * DT);
      if (C.exp >= SEE_T && G.t - G.lastSeen > SEEN_GAP) {
        G.lastSeen = G.t; C.exp = 0; G.stats.seen++;
        const how = lookCone(G, C.x, C.y) ? 'look' : carLit(def, G.t, C.x) ? 'car' : 'light';
        ev.push('seen:' + how); strike(G, 'seen', ev); if (how !== 'look') lookout(G, C.x, ev);
      }
    }
    if (!G.over && G.t - START >= def.time) { G.over = true; G.failed = true; ev.push('dawn'); }
    return ev;
  }
  function stars(G) { if (!G.won) return 0; const s = G.def.stars; return G.score >= s[2] ? 3 : G.score >= s[1] ? 2 : G.score >= s[0] ? 1 : 0; }

  /* ---------- online ---------- */
  const ONS = ['ground', 'sheet', 'in'], ATS = ['window', 'bed', 'toBed', 'toWindow'];
  function encode(G) {
    const C = G.c, T = G.top, L = G.look;
    return { t: r3(G.t), st: G.st, ov: G.over ? 1 : 0, wn: G.won ? 1 : 0, fl: G.failed ? 1 : 0, cv: G.cv,
      c: [r1(C.x), r1(C.y), ONS.indexOf(C.on), C.hid ? 1 : 0, r1(C.stam), C.mv ? 1 : 0, r3(C.exp)], tp: [ATS.indexOf(T.at), r3(T.move), r1(T.len), T.pull ? 1 : 0],
      d: r1(G.dog), lk: [L.st === 'tell' ? 1 : L.st === 'look' ? 2 : 0, r3(L.t), L.x, L.y], x: G.strikes, ls: r3(G.lastSeen), cs: G.carSeen, dd: G.doorDone, dt: G.doorTold, ct: G.carTold,
      it: r3(G.inT), p: G.score, s: G.stats };
  }
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  /* own: the role this (guest) phone plays. Its own player is not pulled back to where the host last saw it (that is a
     round trip old) unless the host changed it (a fall, getting in: cv) or the two disagree by a lot. */
  function apply(G, m, own, soft) {
    if (!m || typeof m !== 'object') return;
    G.t = num(m.t, G.t); G.st = m.st === 'count' || m.st === 'run' ? m.st : G.st; G.over = !!m.ov; G.won = !!m.wn; G.failed = !!m.fl;
    const C = G.c, T = G.top, h = her(G.def), cv = Number.isInteger(m.cv) ? m.cv : G.cv;
    if (Array.isArray(m.c)) {
      const on = ONS[m.c[2]] || C.on, x = clamp(num(m.c[0], C.x), 0, W), y = clamp(num(m.c[1], C.y), 0, h.y);
      const mine = own === 'climb' && cv === G.cv && on !== 'in' && Math.hypot(x - C.x, y - C.y) < GAP;
      if (!mine) { const b = soft && on === C.on && cv === G.cv ? 0.5 : 1; C.x += (x - C.x) * b; C.y += (y - C.y) * b; C.on = on; C.hid = !!m.c[3]; }
      C.stam = clamp(num(m.c[4], C.stam), 0, 100); if (own !== 'climb') C.mv = !!m.c[5]; C.exp = clamp(num(m.c[6], 0), 0, 5);
    }
    G.cv = cv;
    if (Array.isArray(m.tp) && own !== 'top') { T.at = ATS[m.tp[0]] || T.at; T.move = clamp(num(m.tp[1], 0), 0, TO_BED); T.len = clamp(num(m.tp[2], T.len), 0, G.def.sheet); T.pull = !!m.tp[3]; }
    G.dog = clamp(num(m.d, G.dog), 0, 100);
    if (Array.isArray(m.lk)) G.look = { st: m.lk[0] === 1 ? 'tell' : m.lk[0] === 2 ? 'look' : null, t: clamp(num(m.lk[1], 0), 0, 5), x: num(m.lk[2], 0), y: num(m.lk[3], 0) };
    G.strikes = clamp(num(m.x, G.strikes) | 0, 0, 9); G.lastSeen = num(m.ls, G.lastSeen);
    for (const [k, f] of [['cs', 'carSeen'], ['dd', 'doorDone'], ['dt', 'doorTold'], ['ct', 'carTold']]) if (Number.isInteger(m[k])) G[f] = m[k];
    G.inT = num(m.it, G.inT); G.score = Math.max(0, num(m.p, G.score));
    if (m.s && typeof m.s === 'object') for (const k of Object.keys(G.stats)) G.stats[k] = num(m.s[k], G.stats[k]);
  }
  // what the guest sends: its input, a press counter, and (for its own player) where it is
  function guestMsg(G, role, inp, presses) {
    const r2 = v => Math.round(v * 100) / 100, i = inp || {}, C = G.c, T = G.top;
    const m = { mx: r2(clamp(num(i.mx, 0), -1, 1)), my: r2(clamp(num(i.my, 0), -1, 1)), a: presses | 0 };
    if (role === 'climb') Object.assign(m, { x: r1(C.x), y: r1(C.y), on: ONS.indexOf(C.on), hd: C.hid ? 1 : 0, cv: G.cv });
    else Object.assign(m, { at: ATS.indexOf(T.at), mt: r3(T.move), len: r1(T.len) });
    return m;
  }
  /* the host hears the guest. rq = { seen, mx, my, act } carries between messages; act turns true once per new press
     (the caller clears it after the step). The guest's own player counts where the guest says it is, if that makes
     sense; if not, cv moves on and the guest takes the host's word. */
  function hostHears(G, role, m, rq) {
    if (!m || typeof m !== 'object') return;
    rq.mx = clamp(num(m.mx, 0), -1, 1); rq.my = clamp(num(m.my, 0), -1, 1);
    const a = Number.isInteger(m.a) ? m.a : 0;
    if (rq.seen < 0) rq.seen = a;
    if (role === 'top') {
      const T = G.top, at = ATS[m.at];
      if (at) { T.at = at; T.move = clamp(num(m.mt, 0), 0, TO_BED); }
      if (Number.isFinite(m.len) && G.c.on !== 'sheet') T.len = clamp(m.len, 0, G.def.sheet);
      rq.seen = a; rq.act = false; return;
    }
    if (a > rq.seen) { rq.seen = a; rq.act = true; }
    const C = G.c, on = ONS[m.on], h = her(G.def);
    if (m.cv !== G.cv || !on || on === 'in' || C.on === 'in' || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const x = clamp(m.x, 16, W - 16), y = clamp(m.y, 0, h.y - TOP_GAP);
    const ok = Math.hypot(x - C.x, y - C.y) < GAP + 40 && (on === C.on || on === 'ground' || (on === 'sheet' && canGrab(G, 30) && Math.abs(x - h.x) < REACH + 4));
    if (!ok) { G.cv++; return; }
    C.x = on === 'sheet' ? h.x : x; C.y = on === 'ground' ? 0 : y; C.on = on;
    if (!!m.hd !== C.hid) { if (m.hd && !inBush(G.def, C.x)) G.cv++; else { C.hid = !!m.hd; if (C.hid) G.stats.hides++; } }
    rq.act = false;
  }

  return { DT, START, W, WALK, CLIMB, DESCEND, PULLUP, SLIP, SHEET_V, REACH, GRAB_Y, TOP_GAP, SHOWS, HIGH_FALL, TO_BED, DOOR_TELL, DOOR_LOOK, LIGHT_W, LIGHT_TELL, LOOK_W, LOOK_TELL, LOOK_T,
    CAR_TELL, CAR_T, CAR_W, SEE_T, SEEN_GAP, STRIKES, STRIKE_PTS, TIME_PTS, GAP,
    dadAt, doorAt, carAt, her, roomLit, windowLit, glowAt, windowSoon, carLit, lookCone, inBush, onGravel, sheetBottom, canGrab, nearestWindow, load, step, stars, encode, apply, guestMsg, hostHears };
})();

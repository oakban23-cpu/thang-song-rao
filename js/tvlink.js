/* The big screen and the phone pads: what goes between them, made safe on arrival; which phone plays which colour;
   which presses and which commands are new. No page needed (the tests use it as it is).
   A phone says: { app: 'tsr', tv: 'p', code, sid, n (name), want ('pink'/'mint'), j: [x, y] (the stick), h: 'A,U' (the
   buttons held), c: { A: 3, ... } (presses so far, per button), t: { A: ms } (when the last press was, on the screen's
   clock), cmd: [seq, what, kind, level], br (the mode it is looking at), sk (stickers: 'count.id'), ck (its clock),
   wr: [seq, look code] (what it changed in the wardrobe) }.
   The screen says: { app: 'tsr', tv: 's', code, sid, seat: { pink: [sid, name], mint }, st ('menu', 'play', 'pause',
   'clear'), kind, li, lab, nm, hint, pad: { pink: { t, b: [[key, label]], role }, mint }, tip: { pink, mint }, ms: { kind:
   stars }, lv: { kind: [[i, no, name, note, locked, done]] }, clear: { h, nm, s, msg, stats, next, again }, pause: { no,
   hint, swap }, ce: { sid: [their clock, held ms] }, hn (its clock), wait, wr: { pink: look code, mint }, ws (its stars) }. */
const TvLink = (() => {
  'use strict';
  // the buttons of each kind of pad: adv left/right/jump; k stick with act and use; x two buttons; m low/high (music);
  // w one big button (the tower); l outer/inner leg; b paddle/back-paddle
  const KEYS = { adv: ['L', 'R', 'J'], k: ['A', 'U'], x: ['a', 'b'], m: ['lo', 'hi'], w: ['go'], l: ['out', 'in'], b: ['fwd', 'back'] };
  const ALLKEYS = [...new Set(Object.values(KEYS).flat())];
  const CMDS = ['start', 'pause', 'resume', 'restart', 'menu', 'next', 'again', 'swap'];
  const STS = ['menu', 'play', 'pause', 'clear'];
  const LOST = 12;                                                    // s without a word: a phone's colour is free again
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000b-\u001f]/g, '').slice(0, n) : '');
  const name = v => str(v, 40).replace(/[<>\n]/g, '').trim().slice(0, 10);
  const isSid = v => typeof v === 'string' && /^[a-z0-9]{4,16}$/.test(v);
  const isKind = v => typeof v === 'string' && /^[a-z]{2,6}$/.test(v);
  // a button's words on the screen (it may have <br>) as plain lines
  const label = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 40);

  // what a phone said, made safe (null: not a pad of this screen)
  function readPad(m, code) {
    if (!m || typeof m !== 'object' || m.app !== 'tsr' || m.tv !== 'p' || String(m.code) !== String(code) || !isSid(m.sid)) return null;
    const j = Array.isArray(m.j) ? [clamp(num(m.j[0]), -1, 1), clamp(num(m.j[1]), -1, 1)] : [0, 0];
    const h = new Set(typeof m.h === 'string' ? m.h.split(',').filter(k => ALLKEYS.includes(k)) : []);
    const c = {}, t = {};
    if (m.c && typeof m.c === 'object') for (const k of ALLKEYS) if (Number.isInteger(m.c[k]) && m.c[k] >= 0) c[k] = m.c[k];
    if (m.t && typeof m.t === 'object') for (const k of ALLKEYS) if (Number.isFinite(m.t[k])) t[k] = m.t[k];
    let cmd = null;
    if (Array.isArray(m.cmd) && Number.isInteger(m.cmd[0]) && m.cmd[0] > 0 && CMDS.includes(m.cmd[1])) cmd = [m.cmd[0], m.cmd[1], isKind(m.cmd[2]) ? m.cmd[2] : '', Number.isInteger(m.cmd[3]) && m.cmd[3] >= 0 && m.cmd[3] < 1000 ? m.cmd[3] : -1];
    return { sid: m.sid, n: name(m.n), want: m.want === 'pink' || m.want === 'mint' ? m.want : '', j, h, c, t, cmd, br: isKind(m.br) ? m.br : '',
      sk: typeof m.sk === 'string' && /^\d{1,6}\.\d{1,2}$/.test(m.sk) ? m.sk : '', ck: num(m.ck, NaN),
      wr: Array.isArray(m.wr) && Number.isInteger(m.wr[0]) && m.wr[0] > 0 && typeof m.wr[1] === 'string' && m.wr[1].length <= 160 ? [m.wr[0], m.wr[1]] : null };
  }
  // what the screen said, made safe (null: not this screen)
  function readScreen(m, code) {
    if (!m || typeof m !== 'object' || m.app !== 'tsr' || m.tv !== 's' || String(m.code) !== String(code) || !isSid(m.sid)) return null;
    const seat = {}, pad = {}, tip = {};
    for (const id of ['pink', 'mint']) {
      const s = m.seat && Array.isArray(m.seat[id]) ? m.seat[id] : null;
      seat[id] = s && isSid(s[0]) ? [s[0], name(s[1])] : ['', ''];
      const p = m.pad && m.pad[id];
      pad[id] = p && typeof p === 'object' && KEYS[p.t] ? { t: p.t, role: str(p.role, 30), b: (Array.isArray(p.b) ? p.b : []).filter(a => Array.isArray(a) && KEYS[p.t].includes(a[0])).slice(0, 4).map(a => [a[0], label(a[1])]) } : null;
      tip[id] = m.tip ? str(m.tip[id], 80) : '';
    }
    const ms = {}, lv = {};
    if (m.ms && typeof m.ms === 'object') for (const k of Object.keys(m.ms).slice(0, 30)) if (isKind(k)) ms[k] = str(m.ms[k], 24);
    if (m.lv && typeof m.lv === 'object') for (const k of Object.keys(m.lv).slice(0, 4)) if (isKind(k) && Array.isArray(m.lv[k]))
      lv[k] = m.lv[k].filter(a => Array.isArray(a) && Number.isInteger(a[0]) && a[0] >= 0 && a[0] < 1000).slice(0, 100).map(a => [a[0], str(a[1], 8), str(a[2], 40), str(a[3], 30), a[4] ? 1 : 0, a[5] ? 1 : 0]);
    const c = m.clear && typeof m.clear === 'object' ? m.clear : null, p = m.pause && typeof m.pause === 'object' ? m.pause : null;
    const ce = {};
    if (m.ce && typeof m.ce === 'object') for (const k of Object.keys(m.ce).slice(0, 4)) if (isSid(k) && Array.isArray(m.ce[k]) && Number.isFinite(m.ce[k][0]) && Number.isFinite(m.ce[k][1])) ce[k] = [m.ce[k][0], m.ce[k][1]];
    return {
      sid: m.sid, seat, st: STS.includes(m.st) ? m.st : 'menu', kind: isKind(m.kind) ? m.kind : '', li: Number.isInteger(m.li) ? m.li : -1,
      lab: str(m.lab, 40), nm: str(m.nm, 60), hint: str(m.hint, 400), pad, tip, ms, lv,
      clear: c ? { h: str(c.h, 60), nm: str(c.nm, 60), s: Number.isInteger(c.s) ? clamp(c.s, -1, 3) : -1, msg: str(c.msg, 300), stats: str(c.stats, 400), next: str(c.next, 30), again: str(c.again, 30) } : null,
      pause: p ? { no: str(p.no, 80), hint: str(p.hint, 400), swap: str(p.swap, 80) } : null,
      ce, hn: num(m.hn, NaN), wait: str(m.wait, 80),
      wr: { pink: m.wr ? str(m.wr.pink, 160) : '', mint: m.wr ? str(m.wr.mint, 160) : '' }, ws: Number.isInteger(m.ws) && m.ws >= 0 && m.ws < 10000 ? m.ws : NaN
    };
  }
  /* who plays which colour. slots { pink: sid, mint: sid }; pads Map sid -> { at (ms), want, first (ms) }. Keeps whoever
     has a colour; frees a colour whose phone has gone quiet; gives free colours to waiting phones, first come first,
     their wish first. */
  function seat(slots, pads, now) {
    const out = { pink: slots.pink || '', mint: slots.mint || '' }, live = s => pads.has(s) && now - pads.get(s).at <= LOST * 1000;
    for (const id of ['pink', 'mint']) if (out[id] && !live(out[id])) out[id] = '';
    const waiting = [...pads.entries()].filter(([s]) => live(s) && out.pink !== s && out.mint !== s).sort((a, b) => a[1].first - b[1].first);
    for (const [s, p] of waiting) {
      const free = ['pink', 'mint'].filter(id => !out[id]); if (!free.length) break;
      out[free.includes(p.want) ? p.want : free[0]] = s;
    }
    return out;
  }
  // presses since last time, per button (at most a few at once); the first word from a phone only sets where it starts
  // (a button it had not pressed before, later, counts from zero)
  function newPresses(seen, c) {
    const out = {}, first = !seen._;
    seen._ = 1;
    for (const k of Object.keys(c)) {
      const was = seen[k] == null && !first ? 0 : seen[k];
      if (was == null || c[k] < was) { seen[k] = c[k]; continue; }
      if (c[k] > was) { out[k] = Math.min(4, c[k] - was); seen[k] = c[k]; }
    }
    return out;
  }
  // a command is new when its number is higher than the last one done for that phone
  function newCmd(seen, cmd) {
    if (!cmd || cmd[0] <= (seen.cmd || 0)) return null;
    seen.cmd = cmd[0]; return cmd;
  }
  // the clock: from the screen's echo of a phone's clock, (screen clock - phone clock) and the round trip
  function clockFrom(echo, hn, now) {
    if (!echo || !Number.isFinite(hn)) return null;
    const rtt = now - echo[0] - echo[1];
    if (!(rtt >= 0 && rtt < 5000)) return null;
    return { off: hn + rtt / 2 - now, rtt };
  }
  return { KEYS, ALLKEYS, CMDS, LOST, readPad, readScreen, seat, newPresses, newCmd, clockFrom, label };
})();

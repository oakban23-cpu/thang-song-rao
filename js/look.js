/* How the two of them look: what is free (body colour, a pattern, eyes, mouth, cheeks, the thing on top of the head)
   and what opens with stars (hats, glasses, round the neck, a whole outfit, something on the back, shoes); the short
   code that carries both to the other phone or the big screen; and the couple sets (an outfit worn by both, or a pair
   that goes together). No page needed. */
const Look = (() => {
  'use strict';
  // body colours: [id, name, base, dark, light]
  const COLORS = [
    ['pink', 'ชมพู', '#ff6f9c', '#c94372', '#ffb8cf'], ['mint', 'มิ้นต์', '#4fe0bf', '#22a184', '#a9f2de'],
    ['peach', 'ส้มพีช', '#ffa86b', '#d6733a', '#ffd5b5'], ['lemon', 'เหลืองมะนาว', '#ffd84d', '#c99a1c', '#fff0a8'],
    ['sky', 'ฟ้า', '#5ec8ff', '#2b8ccc', '#b8e7ff'], ['lilac', 'ม่วงไลแลค', '#b38cff', '#7b56cc', '#ddccff'],
    ['coral', 'แดงปะการัง', '#ff7d6e', '#c94b3f', '#ffc3ba'], ['lime', 'เขียวใบไม้', '#9bdb57', '#62a42a', '#d3f1ae'],
    ['cream', 'ครีม', '#f4e2bf', '#c3a57a', '#fff6e4'], ['cocoa', 'โกโก้', '#b47c57', '#7c4e31', '#dfb99c'],
    ['cloud', 'เทาเมฆ', '#bdb8cf', '#86809e', '#e6e3f0']
  ];
  // the free parts: [id, name]
  const FREE = {
    c: COLORS.map(a => [a[0], a[1]]),
    p: [['none', 'ตัวเรียบ'], ['spots', 'ลายจุด'], ['belly', 'พุงขาว'], ['stripes', 'ลายทาง']],
    e: [['shiny', 'ตาวิ้ง'], ['dot', 'ตาจุด'], ['sleepy', 'ตาง่วง'], ['star', 'ตาดาว'], ['heart', 'ตาหัวใจ'], ['lash', 'ขนตางอน']],
    m: [['smile', 'ยิ้ม'], ['cat', 'ปากแมว'], ['fang', 'เขี้ยวจิ๋ว'], ['grin', 'ยิ้มกว้าง'], ['tongue', 'แลบลิ้น']],
    k: [['rosy', 'แก้มแดง'], ['heart', 'แก้มหัวใจ'], ['freckle', 'กระ'], ['none', 'ไม่มีแก้ม']],
    t: [['bow', 'โบว์'], ['sprout', 'ต้นอ่อน'], ['curl', 'ผมชี้'], ['antenna', 'หนวดแมลง'], ['flower', 'ดอกไม้'], ['horns', 'เขาปีศาจ'], ['ears', 'หูหมี'], ['none', 'ไม่มี']]
  };
  const FREE_KEYS = ['c', 'p', 'e', 'm', 'k', 't'];
  const FREE_NAMES = { c: 'สีตัว', p: 'ลายตัว', e: 'ตา', m: 'ปาก', k: 'แก้ม', t: 'บนหัว' };
  const DEF = {
    pink: { c: 'pink', p: 'none', e: 'shiny', m: 'smile', k: 'rosy', t: 'bow' },
    mint: { c: 'mint', p: 'none', e: 'shiny', m: 'smile', k: 'rosy', t: 'sprout' }
  };
  // what opens with stars (best stars from every mode added up; nothing is spent): [id, name, stars]
  const SLOTS = [['h', 'หมวก'], ['f', 'หน้า'], ['n', 'คอ'], ['o', 'ชุด'], ['b', 'หลัง'], ['s', 'รองเท้า']];
  const ITEMS = {
    h: [['straw', 'หมวกสาน', 3], ['party', 'หมวกปาร์ตี้', 6], ['flower', 'มงกุฎดอกไม้', 10], ['cap', 'หมวกแก๊ปสีคู่', 15], ['cat', 'หูแมว', 20],
        ['beanie', 'หมวกไหมพรม', 26], ['bunny', 'หูกระต่าย', 32], ['witch', 'หมวกแม่มด', 40], ['crown', 'มงกุฎ', 55], ['halo', 'วงแหวนนางฟ้า', 75]],
    f: [['round', 'แว่นกลม', 2], ['sun', 'แว่นกันแดด', 8], ['heart', 'แว่นหัวใจ', 13], ['stache', 'หนวดเฟิ้ม', 18], ['star', 'สติกเกอร์ดาว', 24],
        ['mono', 'แว่นข้างเดียว', 36], ['patch', 'ผ้าปิดตาโจรสลัด', 46]],
    n: [['scarf', 'ผ้าพันคอสีคู่', 4], ['bowtie', 'หูกระต่ายผูกคอ', 9], ['lei', 'พวงมาลัยดอกไม้', 16], ['bell', 'กระดิ่งแมว', 22], ['pearl', 'สร้อยมุก', 30],
        ['tie', 'เนกไท', 38], ['cape', 'ผ้าคลุมฮีโร่', 50], ['medal', 'เหรียญทอง', 65]],
    o: [['tee', 'เสื้อยืดหัวใจ', 5], ['stripe', 'เสื้อลายขวาง', 8], ['overall', 'เอี๊ยมยีนส์', 12], ['hoodie', 'เสื้อฮู้ด', 17], ['sailor', 'ชุดกะลาสี', 23],
        ['pjs', 'ชุดนอนลายดาว', 28], ['raincoat', 'เสื้อกันฝน', 34], ['thai', 'ชุดไทย', 42], ['tux', 'ทักซิโด้', 52], ['gown', 'ชุดเจ้าสาว', 52], ['astro', 'ชุดนักบินอวกาศ', 70]],
    b: [['bag', 'เป้ใบจิ๋ว', 7], ['balloon', 'ลูกโป่งหัวใจ', 14], ['tail', 'หางแมว', 19], ['wings', 'ปีกนางฟ้า', 30], ['bat', 'ปีกค้างคาว', 44], ['jet', 'เจ็ตแพ็ก', 60]],
    s: [['sneak', 'รองเท้าผ้าใบ', 3], ['boot', 'บูทกันฝน', 11], ['bunny', 'สลิปเปอร์กระต่าย', 21], ['gold', 'รองเท้าทอง', 48]]
  };
  const NONE = { h: '', f: '', n: '', o: '', b: '', s: '' };
  const ALL = Object.entries(ITEMS).flatMap(([slot, l]) => l.map(([id, name, need]) => ({ slot, id, name, need })));
  const item = (slot, id) => ALL.find(it => it.slot === slot && it.id === id) || null;
  const has = (k, v) => FREE[k].some(a => a[0] === v);
  const color = id => { const a = COLORS.find(c => c[0] === id) || COLORS[0]; return { id: a[0], name: a[1], c: a[2], d: a[3], l: a[4] }; };
  const who2 = w => (w === 'mint' ? 'mint' : 'pink');
  // a look with only known parts (anything else back to that one's own)
  function cleanLook(o, who) {
    const d = DEF[who2(who)], out = { ...d };
    if (o && typeof o === 'object') for (const k of FREE_KEYS) if (typeof o[k] === 'string' && has(k, o[k])) out[k] = o[k];
    return out;
  }
  function cleanWear(o, stars) {
    const out = { ...NONE };
    if (o && typeof o === 'object') for (const [k] of SLOTS) {
      const it = typeof o[k] === 'string' && o[k] ? item(k, o[k]) : null;
      if (it && (stars == null || stars >= it.need)) out[k] = it.id;
    }
    return out;
  }
  // the code: "2|hat.face.neck.outfit.back.shoes|colour.pattern.eyes.mouth.cheeks.top"; an old code is just "hat.face.neck"
  function code(look, wear, who) {
    const w = cleanWear(wear), l = look ? cleanLook(look, who) : null;
    return '2|' + SLOTS.map(([k]) => w[k]).join('.') + '|' + (l ? FREE_KEYS.map(k => l[k]).join('.') : '');
  }
  function parse(s, who) {
    const out = { look: cleanLook(null, who), wear: { ...NONE } };
    if (typeof s !== 'string' || s.length > 160) return out;
    const parts = s.split('|');
    const w = (parts.length >= 2 ? parts[1] : parts[0]).split('.'), wear = {};
    (parts.length >= 2 ? SLOTS : SLOTS.slice(0, 3)).forEach(([k], i) => { wear[k] = w[i]; });
    out.wear = cleanWear(wear);
    if (parts.length >= 3 && parts[2]) { const l = parts[2].split('.'), o = {}; FREE_KEYS.forEach((k, i) => { o[k] = l[i]; }); out.look = cleanLook(o, who); }
    return out;
  }
  // couple sets: the same outfit on both, or the groom and the bride
  const SAME = { tee: 'เสื้อคู่ลายหัวใจ', stripe: 'เสื้อลายขวางคู่', overall: 'เอี๊ยมคู่', hoodie: 'ฮู้ดคู่', sailor: 'กะลาสีคู่', pjs: 'ชุดนอนคู่', raincoat: 'เสื้อกันฝนคู่',
    thai: 'ชุดไทยคู่', tux: 'ทักซิโด้คู่', gown: 'ชุดเจ้าสาวคู่', astro: 'นักบินอวกาศคู่' };
  function pairSet(a, b) {
    const x = a && a.o, y = b && b.o;
    if (!x || !y) return null;
    if ((x === 'tux' && y === 'gown') || (x === 'gown' && y === 'tux')) return { id: 'wed', name: 'เจ้าบ่าวเจ้าสาว' };
    if (x === y && SAME[x]) return { id: x, name: SAME[x] };
    return null;
  }
  return { COLORS, FREE, FREE_KEYS, FREE_NAMES, DEF, SLOTS, ITEMS, NONE, ALL, item, color, cleanLook, cleanWear, code, parse, pairSet };
})();

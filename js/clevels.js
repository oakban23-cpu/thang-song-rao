/* Cinema showings. time: seconds of film. film: scenes [from s, kind]: 'dark' (safe), 'bright' (the room lights up:
   leaning shows sooner), 'loud' (nobody looks away from the screen), 'quiet'. scares: jump scares (hug then for a
   bonus). watchers: the people around, kind (aunt: the lady in front, guy: the man behind, kid: a child next to them,
   usher: an usher with a torch along the aisle, phone: someone taking a photo with the flash), side (L: pink's to
   watch, R: mint's), first glance at, tell (s of warning), look [min, max] s, every [min, max] s between glances.
   seed: the same glances every time. stars: points for 1, 2 and 3 stars. */
const CLEVELS = [
  { name: 'รอบบ่ายวันธรรมดา', film: [[0, 'quiet'], [18, 'dark'], [38, 'bright'], [52, 'quiet'], [66, 'dark']], scares: [], time: 80, seed: 11,
    watchers: [{ kind: 'aunt', side: 'L', first: 6, tell: 1.1, look: [1.2, 2], every: [5, 8] }],
    stars: [400, 600, 725],
    hint: 'ป้าแถวหน้าชอบหันมามอง หัวเริ่มหันเมื่อไหร่ให้ปล่อยปุ่มนั่งตัวตรง ป้าหันกลับไปดูหนังแล้วค่อยเอียงเข้าหากันใหม่',
    tips: ['เอียงพร้อมกันจนสุดถึงจะจุ๊บกัน ยิ่งจุ๊บนานแต้มยิ่งคูณ', 'ฉากสว่างห้องจะสว่างตาม เอียงนิดเดียวก็เห็น', 'ยกถังป๊อปคอร์นบังฝั่งตัวเองได้แป๊บหนึ่ง แต่ต้องรอนานกว่าจะยกได้อีก'] },
  { name: 'หนังผีรอบดึก', film: [[0, 'dark'], [24, 'quiet'], [44, 'dark'], [60, 'bright'], [70, 'dark']], scares: [16, 34, 52, 74], time: 85, seed: 23,
    watchers: [{ kind: 'aunt', side: 'L', first: 5, tell: 1, look: [1.2, 2], every: [6, 9] }, { kind: 'kid', side: 'R', first: 9, tell: 0.8, look: [1.5, 2.5], every: [7, 11] }],
    stars: [300, 700, 900],
    hint: 'หนังผีมีฉากตุ้งแช่ ตอนผีออกทุกคนสะดุ้งดูจอ กอดกันตอนนั้นได้โบนัส เด็กข้างๆ ก็ชอบหันมามองด้วย',
    tips: ['เพลงเริ่มเงียบผิดปกติคือผีใกล้จะออก เอียงเข้าหากันรอไว้', 'เด็กอยู่ฝั่งมิ้นต์ ป้าอยู่ฝั่งชมพู ต่างคนต่างดูฝั่งตัวเอง', 'ตอนผีออกไม่มีใครหันมา จุ๊บต่อได้เต็มที่'] },
  { name: 'หนังบู้ฟอร์มยักษ์', film: [[0, 'quiet'], [10, 'loud'], [20, 'bright'], [30, 'quiet'], [42, 'loud'], [54, 'bright'], [64, 'quiet'], [74, 'loud']], scares: [], time: 90, seed: 37,
    watchers: [{ kind: 'aunt', side: 'L', first: 4, tell: 0.9, look: [1, 1.8], every: [5, 8] }, { kind: 'guy', side: 'R', first: 7, tell: 0.8, look: [0.9, 1.6], every: [5, 9] },
      { kind: 'usher', side: 'R', first: 22, tell: 1.6, look: [1.2, 1.8], every: [11, 15] }],
    stars: [350, 800, 1080],
    hint: 'ฉากระเบิดดังสนั่นทุกคนดูจอ จุ๊บตอนนั้นสบาย แต่ระเบิดทำให้ห้องสว่าง ระวังพนักงานถือไฟฉายเดินมาทางขวา',
    tips: ['ฉากเสียงดัง ไม่มีใครหันมาเลย จุ๊บให้นานๆ', 'เห็นไฟฉายส่องมาตามทางเดิน มิ้นต์ยกป๊อปคอร์นบังไว้ก่อน', 'ผู้ชายข้างหลังชอบชะโงกมา หัวขยับเมื่อไหร่ให้ถอย'] },
  { name: 'รอบปฐมทัศน์คนแน่นโรง', film: [[0, 'quiet'], [14, 'dark'], [26, 'bright'], [36, 'loud'], [46, 'quiet'], [58, 'dark'], [70, 'bright'], [80, 'quiet']], scares: [62], time: 95, seed: 41,
    watchers: [{ kind: 'aunt', side: 'L', first: 4, tell: 0.9, look: [1, 1.8], every: [5, 8] }, { kind: 'guy', side: 'R', first: 6, tell: 0.85, look: [0.9, 1.5], every: [5, 8] },
      { kind: 'phone', side: 'L', first: 15, tell: 0.85, look: [0.25, 0.35], every: [9, 13] }, { kind: 'usher', side: 'R', first: 25, tell: 1.4, look: [1.2, 1.8], every: [10, 14] }],
    stars: [300, 650, 740],
    hint: 'คนเต็มโรง ป้า ผู้ชายข้างหลัง คนถ่ายรูปเปิดแฟลช และพนักงานถือไฟฉาย ต้องแบ่งกันดูคนละฝั่งดีๆ',
    tips: ['คนยกมือถือขึ้นมาเมื่อไหร่ แฟลชจะแวบแป๊บเดียวแต่เห็นชัดมาก', 'ป๊อปคอร์นบังได้เฉพาะฝั่งตัวเอง ใช้ตอนคนฝั่งนั้นหันมาพร้อมกันหลายคน', 'มีผีออกฉากเดียว อย่าพลาดกอดตอนนั้น'] },
  { name: 'หนังกลางแปลงงานวัด', film: [[0, 'dark'], [12, 'quiet'], [24, 'loud'], [34, 'bright'], [46, 'dark'], [56, 'quiet'], [68, 'loud'], [78, 'bright'], [88, 'dark']], scares: [20, 50, 84], time: 100, seed: 53,
    watchers: [{ kind: 'aunt', side: 'L', first: 3, tell: 0.85, look: [1, 1.8], every: [4.5, 7] }, { kind: 'kid', side: 'R', first: 5, tell: 0.85, look: [1.5, 2.5], every: [6, 9] },
      { kind: 'guy', side: 'R', first: 8, tell: 0.85, look: [0.9, 1.5], every: [5, 8] }, { kind: 'usher', side: 'L', first: 18, tell: 1.3, look: [1.2, 1.8], every: [9, 13] },
      { kind: 'phone', side: 'R', first: 26, tell: 0.85, look: [0.25, 0.35], every: [10, 14] }],
    stars: [280, 750, 850],
    hint: 'หนังกลางแปลงงานวัด คนนั่งเสื่อรอบตัว ลุงขายถั่วต้มถือไฟฉายเดินผ่าน เด็กวิ่งเล่น ฉากผีสามรอบ ใจกล้าๆ',
    tips: ['ลุงขายถั่วต้มถือไฟฉายเดินมาทางซ้าย ชมพูคอยดู', 'ผีออกสามรอบ กอดให้ครบได้โบนัสเยอะ', 'คนเยอะ อย่าจุ๊บนานจนลืมดูรอบตัว'] }
];

/* Nights for the window-climbing mode. The house front runs along x 0..960; the climber starts at the gate (start).
   windows: { room, x, y (sill height) }; the room 'her' is the girlfriend's (or boyfriend's) room upstairs. dad: where
   dad is from each second on ([s, room]; 'her' is a check on her room: footsteps first, then he opens the door; 'away'
   is asleep with every light off). A lit room's light falls on the wall and the ground below its window. cars: when a
   car's headlights sweep along the house. bushes: { x, w } to hide in. gravel: [from, to] stretches that crunch (and
   wake the dog, if there is one). sheet: how far the sheet reaches down. time: seconds until dawn. points: for getting
   in (plus TIME_PTS for each second left, minus STRIKE_PTS per strike). cake: carrying a birthday cake (climbs slower).
   stars: score for 1, 2, 3 stars. */
const NLEVELS = [
  { name: 'คืนแรกที่แอบมา', time: 60, start: 40, sheet: 200, points: 1000, dog: false,
    windows: [{ room: 'living', x: 250, y: 70 }, { room: 'kitchen', x: 480, y: 70 }, { room: 'her', x: 760, y: 210 }],
    bushes: [{ x: 365, w: 60 }, { x: 640, w: 60 }], gravel: [],
    dad: [[0, 'living'], [4, 'her'], [7, 'living'], [10, 'kitchen'], [13, 'living'], [16, 'kitchen'], [19, 'away'], [24, 'her'], [27, 'kitchen'], [31, 'living'], [35, 'away'], [42, 'her'], [45, 'away']],
    cars: [9, 30], stars: [500, 790, 1160],
    hint: 'ห้องไหนไฟเปิด แปลว่าพ่ออยู่ห้องนั้น อย่าขยับในที่สว่าง ยืนนิ่งๆ ไม่มีใครเห็น',
    tips: ['ไฟจะเรืองๆ ก่อนพ่อเดินเข้าห้อง เห็นแล้วหยุดเดิน', 'ได้ยินเสียงรถ คนข้างบนดึงผ้าขึ้น ไฟหน้ารถส่องเห็นผ้าที่ห้อยอยู่', 'ได้ยินเสียงเดินขึ้นบันได คนข้างบนรีบกระโดดขึ้นเตียง'] },
  { name: 'ทางกรวดกับหมาเฝ้าบ้าน', time: 60, start: 40, sheet: 200, points: 1000, dog: true,
    windows: [{ room: 'living', x: 300, y: 70 }, { room: 'kitchen', x: 560, y: 70 }, { room: 'her', x: 800, y: 210 }],
    bushes: [{ x: 190, w: 60 }, { x: 430, w: 60 }, { x: 690, w: 60 }], gravel: [[100, 160], [470, 640]],
    dad: [[0, 'kitchen'], [5, 'living'], [8, 'kitchen'], [11, 'her'], [14, 'living'], [18, 'kitchen'], [21, 'living'], [24, 'her'], [27, 'kitchen'], [31, 'living'], [35, 'her'], [38, 'kitchen'], [42, 'living'], [46, 'away']],
    cars: [7, 20, 33, 47], stars: [500, 740, 1110],
    hint: 'เดินบนกรวดช้าๆ ถ้าเสียงดังหมาจะเห่า แล้วพ่อจะมาส่องหน้าต่าง รีบไปซ่อนในพุ่มไม้',
    tips: ['ดันจอยแค่นิดเดียวบนทางกรวด เดินช้าเสียงก็เบา', 'พ่อส่องหน้าต่างจะเห็นแม้ยืนนิ่ง ต้องซ่อนในพุ่มไม้หรือหนีให้พ้น', 'คนข้างบนช่วยดึงผ้าขึ้นได้ ปีนเร็วขึ้นมาก'] },
  { name: 'พ่อเดินตรวจบ้าน', time: 70, start: 40, sheet: 200, points: 1000, dog: true,
    windows: [{ room: 'living', x: 220, y: 70 }, { room: 'dining', x: 420, y: 70 }, { room: 'study', x: 620, y: 210 }, { room: 'her', x: 820, y: 210 }],
    bushes: [{ x: 120, w: 50 }, { x: 320, w: 60 }, { x: 520, w: 60 }, { x: 720, w: 60 }], gravel: [[280, 360], [680, 760]],
    dad: [[0, 'living'], [3, 'dining'], [6, 'her'], [9, 'study'], [12, 'living'], [15, 'her'], [18, 'dining'], [21, 'study'], [24, 'her'], [27, 'living'], [30, 'dining'], [33, 'her'], [36, 'study'], [39, 'living'], [43, 'her'], [46, 'dining'], [50, 'living'], [56, 'away']],
    cars: [8, 19, 31, 44, 58], stars: [500, 790, 1155],
    hint: 'พ่อเดินไปทั่วบ้าน ไฟเปิดปิดตลอด และแวะเปิดประตูห้องแฟนบ่อยมาก',
    tips: ['รอให้ไฟดับก่อนค่อยเดินผ่าน', 'ปีนให้เสร็จระหว่างที่พ่อเพิ่งเช็กห้องไป', 'ปีนครึ่งทางแล้วพ่อมา ให้เกาะไว้นิ่งๆ ผ้าจะไหลลงช้าๆ'] },
  { name: 'ห้องชั้นสาม', time: 75, start: 40, sheet: 290, points: 1000, dog: true,
    windows: [{ room: 'living', x: 260, y: 70 }, { room: 'kitchen', x: 500, y: 70 }, { room: 'hall', x: 660, y: 190 }, { room: 'her', x: 840, y: 300 }],
    bushes: [{ x: 160, w: 50 }, { x: 380, w: 60 }, { x: 580, w: 50 }, { x: 760, w: 50 }], gravel: [[300, 350], [690, 790]],
    dad: [[0, 'kitchen'], [4, 'living'], [7, 'hall'], [10, 'her'], [13, 'kitchen'], [16, 'living'], [19, 'hall'], [22, 'her'], [25, 'living'], [28, 'kitchen'], [31, 'hall'], [34, 'her'], [37, 'kitchen'], [41, 'living'], [45, 'her'], [48, 'hall'], [52, 'kitchen'], [57, 'her'], [60, 'away']],
    cars: [5, 17, 29, 41, 54], stars: [500, 815, 1185],
    hint: 'ห้องแฟนอยู่สูงขึ้นไปอีก ต้องมัดผ้าปูสองผืนต่อกัน ปีนนานจนแขนล้า',
    tips: ['แรงปีนหมดกลางทางจะร่วง ถ้าสูงเกินไปเจ็บตัวด้วย', 'ปีนพร้อมให้คนข้างบนดึง เร็วกว่าปีนเองมาก', 'ผ้ายาวขึ้น ดึงขึ้นนานขึ้นตอนรถมา'] },
  { name: 'เซอร์ไพรส์วันเกิด', time: 80, start: 40, sheet: 290, points: 1000, dog: true, cake: true,
    windows: [{ room: 'living', x: 200, y: 70 }, { room: 'dining', x: 380, y: 70 }, { room: 'kitchen', x: 560, y: 70 }, { room: 'hall', x: 700, y: 190 }, { room: 'her', x: 880, y: 300 }],
    bushes: [{ x: 120, w: 50 }, { x: 290, w: 50 }, { x: 470, w: 60 }, { x: 630, w: 50 }, { x: 800, w: 50 }], gravel: [[160, 240], [500, 600], [740, 830]],
    dad: [[0, 'dining'], [3, 'living'], [6, 'kitchen'], [9, 'her'], [12, 'hall'], [15, 'dining'], [18, 'living'], [21, 'her'], [24, 'kitchen'], [27, 'hall'], [30, 'dining'], [33, 'her'], [36, 'living'], [39, 'kitchen'], [42, 'hall'], [45, 'her'], [48, 'dining'], [52, 'living'], [56, 'her'], [59, 'kitchen'], [63, 'hall'], [67, 'her'], [70, 'away']],
    cars: [8, 22, 36, 50, 64], stars: [500, 835, 1205],
    hint: 'ถือเค้กวันเกิดปีนขึ้นไปเซอร์ไพรส์ตอนเที่ยงคืน ปีนช้าลง พ่อก็ยังไม่นอน',
    tips: ['ถือเค้กปีนช้ากว่าปกติ ให้คนข้างบนช่วยดึง', 'ทางกรวดหน้าห้องแฟนยาว เดินช้าๆ', 'ยิ่งเข้าห้องได้เร็ว คะแนนยิ่งสูง แต่โดนเห็นแต่ละครั้งเสียคะแนนเยอะ'] }
];

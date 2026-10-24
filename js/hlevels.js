/* Nights for the one-blanket mode. time: seconds of night. blanket: its width (the bed is 240 wide, a sleeper 52).
   start: where pink and mint lie. ac: how fast the cold takes someone uncovered (per s); blasts: [from, until, times
   colder]. events: how many of each happen in the night (kick: kicks the blanket off, roll: rolls away taking the
   blanket, fart, mosquito, hot: a hot flush). drift: how hard sleepers drift about in their sleep (px/s; each player
   keeps their own from rolling off the bed). strikes: wake-ups before the night is ruined (3 if not given). seed: the same night every
   time. stars: points for 1, 2 and 3 stars. */
const HLEVELS = [
  { name: 'คืนแรกในห้องใหม่', time: 80, blanket: 150, start: [92, 148], ac: 6, drift: 16, seed: 11, strikes: 4,
    events: { kick: 3, roll: 2, mosquito: 1 },
    stars: [850, 960, 1030],
    hint: 'นอนชิดกันกลางเตียงจะอุ่นทั้งคู่ ตอนหลับตัวจะไหลไปเอง คอยขยับกลับอย่าให้ตกเตียง ใครโดนผ้าห่มน้อยกดดึงผ้าห่ม แต่อย่าดึงพร้อมกันคนละทาง',
    tips: ['ดูแถบอุ่นของแต่ละคน ฟ้าคือหนาว แดงคือร้อน เขียวคือหลับสบาย', 'ใครดิ้นเตะผ้าห่มออก อีกคนช่วยดึงกลับมาตรงกลาง', 'ยุงเกาะใครให้คนนั้นตบเอง ตบหน้าแฟนจะสะดุ้งตื่นง่ายกว่า'] },
  { name: 'แอร์เย็นเฉียบ', time: 85, blanket: 130, start: [80, 160], ac: 9, drift: 22, blasts: [[20, 32, 1.5], [52, 64, 1.6]], seed: 23,
    events: { kick: 4, roll: 3, mosquito: 2, hot: 2 },
    stars: [600, 1000, 1050],
    hint: 'แอร์เย็นจัดและผ้าห่มผืนเล็กลง ต้องนอนชิดกันถึงจะห่มได้ทั้งคู่ ช่วงแอร์ตัดเย็นจัดห้ามหลุดจากผ้าห่ม',
    tips: ['เริ่มมานอนห่างกัน ขยับเข้าหากันก่อนเลย', 'มีคนกลิ้งม้วนผ้าห่มหนีเมื่อไหร่ อีกคนดึงคืนมาเร็วๆ', 'ชิดกันมากๆ ตอนแอร์เบาอาจร้อนไป ขยับออกนิดหนึ่งได้'] },
  { name: 'ยุงบุกห้อง', time: 85, blanket: 135, start: [92, 148], ac: 7, drift: 22, seed: 37,
    events: { mosquito: 5, kick: 3, roll: 2, fart: 1 },
    stars: [600, 1140, 1185],
    hint: 'ยุงเข้ามาหลายตัว เกาะใครคนนั้นตบเอง ตบตอนบินอยู่จะพลาดและสะดุ้งเอง',
    tips: ['ยุงเกาะแล้วจะกัดเร็วมาก ตบให้ทัน', 'ตบโดนแฟนได้แต้มแต่แฟนสะดุ้งหนัก ใช้ตอนแฟนยังหลับลึกๆ', 'มีคนตดใต้ผ้าห่มด้วย กดปุ่มเดียวกันเพื่อเปิดผ้าห่มระบาย'] },
  { name: 'หลังกินหมูกระทะ', time: 90, blanket: 135, start: [90, 150], ac: 8, drift: 24, seed: 41,
    events: { fart: 4, roll: 3, kick: 3, mosquito: 2, hot: 1 },
    stars: [500, 1090, 1120],
    hint: 'มื้อเย็นหมูกระทะ กลางคืนเลยมีตดใต้ผ้าห่ม ท้องร้องโครกเมื่อไหร่เตรียมเปิดผ้าห่มระบาย แต่เปิดแล้วหนาว',
    tips: ['ใครตดเหม็นทั้งคู่ เปิดผ้าห่มทีเดียวกลิ่นจางเยอะ', 'เปิดผ้าห่มแล้วทั้งคู่จะเย็นลง ถ้าหนาวอยู่แล้วกลิ้งหนีจากผ้าห่มแทนก็ได้', 'กลิ่นจางเองได้ช้าๆ ถ้าทนไหวก็รอ'] },
  { name: 'คืนก่อนวันแต่งงาน', time: 95, blanket: 125, start: [85, 155], ac: 9, drift: 28, blasts: [[30, 42, 1.5], [70, 80, 1.6]], seed: 53,
    events: { kick: 4, roll: 4, fart: 3, mosquito: 4, hot: 2 },
    stars: [500, 1160, 1215],
    hint: 'ตื่นเต้นจนนอนดิ้นทั้งคืน ผ้าห่มเล็ก แอร์เย็น ยุงก็มา ตดก็มี พรุ่งนี้ต้องสดใส ห้ามตื่นเกินสามครั้ง',
    tips: ['ชิดกันไว้ทั้งคืน ผ้าห่มเล็กห่มสองคนได้แค่ตอนชิดกัน', 'ทุกอย่างมีสัญญาณก่อน ตัวกระตุก ท้องร้อง ยุงบินมา', 'อย่าดึงผ้าห่มพร้อมกันคนละทาง'] }
];

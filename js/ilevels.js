/* Kite fields. field: where the runner can go [left x, right x] (px; the wind blows to the right, the kite flies to
   the right of the runner). start: where the runner stands. spool: the most line there is. time: seconds of flying.
   wind: base speed (px/s) wandering by var every period seconds; gust: sudden strong wind (peak) every few seconds,
   lasting dur, first one at first s; lull: the wind dropping by depth (0..1). seed: the same wind every time.
   trees: { x, y, r } crowns; wires: power lines { x0, x1, y }. rivals: other people's kites, the flyer at ax (walking
   walk[0] px back and forth every walk[1] s), the kite swaying round (kx, ky) by sx, sy every px, py seconds.
   launchAt: a good place to start a run from (marked on the field). stars: points (metres of height above the first
   few, for every second in the air) for 1, 2 and 3 stars. */
const ILEVELS = [
  { name: 'ทุ่งนาหลังเก็บเกี่ยว', scene: 'paddy', field: [120, 1000], start: 640, launchAt: 760, spool: 700, time: 75, seed: 11,
    wind: { base: 115, var: 12, period: [5, 8] },
    stars: [800, 1800, 2700],
    hint: 'คนวิ่งถอยไปทางซ้ายสวนลมเพื่อส่งว่าวขึ้น คนคุมสายผ่อนสายตอนว่าวกินลม ดึงสายตอนว่าวตก',
    tips: ['ตอนเริ่ม ว่าวยังอยู่ต่ำ ลมข้างล่างเบา คนวิ่งต้องวิ่งสวนลมไปทางซ้ายสักพัก ว่าวถึงจะลอยขึ้น',
      'ผ่อนสายตอนว่าวดึงมือ สายจะไหลออก ว่าวจะไปไกลขึ้นแล้วค่อยลอยสูงขึ้นเอง',
      'ว่าวเริ่มร่วง ให้ดึงสายหรือกระตุก คนวิ่งช่วยวิ่งสวนลมอีกแรง'] },
  { name: 'ลมว่าวเดือนมีนา', scene: 'march', field: [120, 1000], start: 600, launchAt: 760, spool: 900, time: 85, seed: 23,
    wind: { base: 110, var: 22, period: [4, 7], gust: { first: 14, every: [9, 13], dur: 1.7, peak: 205 } },
    stars: [1000, 2000, 2950],
    hint: 'ลมกระโชกมาเป็นพักๆ ธงจะสะบัดก่อนลมมา คนคุมสายต้องผ่อนสายไว้ ไม่งั้นสายตึงจนขาด',
    tips: ['เห็นคำว่าลมกระโชกหรือธงสะบัดแรง ให้กดผ่อนสายค้างไว้จนลมผ่านไป',
      'แถบสายตึงด้านบนขึ้นสีแดงเมื่อไหร่ สายใกล้ขาดแล้ว อย่าดึงเพิ่ม',
      'หลังลมกระโชก สายจะออกไปยาว ว่าวจะลอยขึ้นสูงกว่าเดิม'] },
  { name: 'ริมคลองหลังวัด', scene: 'canal', field: [120, 760], start: 520, launchAt: 640, spool: 900, time: 85, seed: 37,
    wind: { base: 108, var: 18, period: [4, 7], lull: { first: 18, every: [12, 16], dur: 3.5, depth: 0.45 } },
    trees: [{ x: 930, y: 150, r: 70 }, { x: 1280, y: 190, r: 90 }, { x: 1700, y: 160, r: 80 }],
    wires: [{ x0: 820, x1: 1560, y: 120 }],
    stars: [600, 1800, 3800],
    hint: 'ข้างหน้ามีต้นไม้กับสายไฟ ส่งว่าวให้พ้นยอดไม้ก่อนผ่อนสายออกไป ลมจะหยุดเป็นช่วงๆ ต้องช่วยกันประคอง',
    tips: ['ตอนลมหยุด คนวิ่งต้องวิ่งสวนลม คนคุมสายดึงหรือกระตุก ไม่งั้นว่าวตกลงไปติดต้นไม้',
      'ผ่อนสายตอนว่าวลอยสูงพ้นต้นไม้แล้วเท่านั้น ว่าวต่ำเกินจะไปติดสายไฟ',
      'สนามแคบ คลองอยู่ทางขวา วิ่งไปเกินคลองไม่ได้'] },
  { name: 'สนามหลวงงานว่าว', scene: 'royal', field: [100, 1300], start: 560, launchAt: 640, spool: 1000, time: 90, seed: 41,
    wind: { base: 120, var: 18, period: [4, 7], gust: { first: 30, every: [16, 22], dur: 1.6, peak: 200 } },
    rivals: [
      { ax: -400, kx: 1500, ky: 760, sx: 140, sy: 80, px: 13, py: 9, ph: 0.4, col: '#e8574f', kind: 'chula' },
      { ax: 760, kx: 1350, ky: 420, sx: 100, sy: 70, px: 11, py: 7, ph: 2.1, col: '#4f8ee8', kind: 'pakpao' },
      { ax: 1240, kx: 1700, ky: 520, sx: 80, sy: 70, px: 8, py: 5, ph: 4.0, col: '#f2c53d', kind: 'pakpao' }],
    stars: [700, 1200, 1700],
    hint: 'คนอื่นก็ชักว่าวอยู่ ถ้าสายเราไปเสียดกับสายเขานานเกินไปสายจะขาด ว่าวจุฬาสีแดงสายยาวพาดอยู่เหนือสนาม ต้องให้ว่าวเราอยู่ใต้สายเขา',
    tips: ['ว่าวจุฬาสีแดงคนชักอยู่ไกลทางซ้าย สายเขาลาดขึ้นไปทางขวา ยิ่งยืนไปทางขวา ใต้สายเขายิ่งสูง แต่ห้ามเลยคนชักว่าวสีน้ำเงินไป',
      'ขึ้นคำว่าสายเสียด ให้รีบแก้ คนวิ่งย้ายที่ หรือคนคุมสายดึงว่าวลงมาให้พ้น',
      'ว่าวคนอื่นแกว่งไปมา ช่องว่างระหว่างสายจะเปลี่ยนตลอด'] },
  { name: 'แข่งว่าวจุฬาปักเป้า', scene: 'final', field: [100, 1300], start: 560, launchAt: 660, spool: 1100, time: 100, seed: 53,
    wind: { base: 115, var: 24, period: [3.5, 6], gust: { first: 16, every: [11, 15], dur: 1.7, peak: 205 }, lull: { first: 26, every: [17, 23], dur: 4, depth: 0.5 } },
    trees: [{ x: 1520, y: 170, r: 85 }],
    rivals: [
      { ax: -350, kx: 1450, ky: 720, sx: 160, sy: 100, px: 12, py: 8, ph: 1.0, col: '#e8574f', kind: 'chula' },
      { ax: 780, kx: 1350, ky: 440, sx: 130, sy: 90, px: 10, py: 6.5, ph: 3.3, col: '#4f8ee8', kind: 'pakpao', walk: [100, 15] },
      { ax: 1250, kx: 1850, ky: 420, sx: 100, sy: 80, px: 9, py: 6, ph: 5.2, col: '#f2c53d', kind: 'pakpao', walk: [80, 18] }],
    stars: [650, 1700, 2250],
    hint: 'รอบชิง มีครบทุกอย่าง ลมกระโชก ลมหยุด ต้นไม้ และว่าวจุฬาของคู่แข่งที่เดินไล่ไปมา',
    tips: ['ลมกระโชกผ่อนสาย ลมหยุดดึงสายกับวิ่งสวนลม สองอย่างนี้ต้องพูดกันตลอด',
      'ว่าวคู่แข่งเดินไปมา คนวิ่งคอยดูว่าสายเราจะไปพาดสายใคร',
      'ว่าวยิ่งสูงยิ่งได้แต้มเร็ว แต่สายยาวลมแรงก็ดึงแรงตาม'] }
];

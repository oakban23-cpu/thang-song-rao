/* The lakes for fishing together. fishes: which fish swim here (a fish listed twice comes twice as often; 0 ปลานิล,
   1 ปลาตะเพียน, 2 ปลาช่อน, 3 ปลาดุก, 4 ปลากะพง, 5 ปลาทองเรืองแสง: small ones land straight in the boat, the big ones
   need the net), pop (fish in the lake at once), time (s of fishing before dusk), giants ([s, fish]: 6 ปลาบึก, 7 the old
   giant of the lake: both of you on one rod), birds (s when a bird comes for the bucket), leaks (s when the boat
   springs one), junk (old boots on the bottom), rain (fish bite sooner), night, shoal (fish in the shoal at dusk),
   netSpd (how fast it swims), seed, stars. */
const YLEVELS = [
  { name: 'บึงหน้าบ้าน', hint: 'กดหนึ่งทีให้คันเบ็ดเหวี่ยง กดอีกทีปล่อยสาย ทุ่นกระตุกเบาๆ อย่าเพิ่ง รอให้ทุ่นจมมิดแล้วค่อยกดตวัด ปลาดิ้นเมื่อไหร่ปล่อยมือ ปลาใหญ่ให้อีกคนเอาสวิงไปช้อนข้างเรือ',
    fishes: [0, 0, 1, 1, 2], pop: 6, time: 150, giants: [], birds: [], leaks: [], junk: 2, shoal: 10, netSpd: .85, seed: 11, stars: [150, 240, 265] },
  { name: 'ปลาช่อนตัวโต', hint: 'ปลาบึกตัวใหญ่ว่ายมาแล้ว ดึงคนเดียวไม่ขึ้น อีกคนต้องเก็บสายแล้วมายืนข้างๆ กดค้างช่วยดึง นกมาเกาะถังเมื่อไหร่รีบไปไล่',
    fishes: [0, 1, 2, 2, 3, 4], pop: 7, time: 150, giants: [[35, 6]], birds: [40, 95], leaks: [], junk: 2, shoal: 12, netSpd: 1, seed: 23, stars: [380, 480, 515] },
  { name: 'ฝนพรำปลากินเหยื่อ', hint: 'ฝนตก ปลากินเหยื่อไวขึ้น แต่เรือเริ่มรั่ว ยืนตรงรูแล้วกดค้างอุด ถ้าน้ำเต็มลำโดนหักแต้ม',
    fishes: [0, 1, 1, 2, 3, 4], pop: 7, time: 150, rain: true, giants: [[70, 6]], birds: [55], leaks: [25, 60, 100, 125], junk: 3, shoal: 12, netSpd: 1.05, seed: 37, stars: [380, 460, 480] },
  { name: 'ทะเลสาบยามค่ำ', hint: 'กลางคืนปลาทองเรืองแสงขึ้นมา ตัวละหลายแต้ม เหวี่ยงคนละฝั่งเรือ ไม่อย่างนั้นสายจะพันกัน ต้องกดสลับกันคนละทีถึงจะแกะออก',
    fishes: [0, 2, 3, 5, 5, 4], pop: 8, time: 160, night: true, giants: [[30, 6], [105, 6]], birds: [45, 115], leaks: [65, 130], junk: 2, shoal: 14, netSpd: 1.15, seed: 41, stars: [520, 600, 640] },
  { name: 'ตำนานเจ้าบึง', hint: 'เขาว่ากันว่าเจ้าบึงตัวใหญ่ที่สุดจะขึ้นมาตอนใกล้ค่ำ ต้องดึงสองคนแล้วช้อนให้ทัน ระวังนก ระวังเรือรั่ว',
    fishes: [1, 2, 3, 4, 4, 5], pop: 8, time: 180, giants: [[25, 6], [120, 7]], birds: [35, 80, 140], leaks: [50, 95, 150], junk: 3, shoal: 16, netSpd: 1.25, seed: 53, stars: [600, 720, 790] }
];

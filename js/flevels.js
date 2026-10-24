/* Meals for the no-farting mode. time: seconds at the table. gas: how fast the gas builds (per s); food: [from, until,
   extra per s] while they eat something that does not agree with them. ambient: the place's own noises (first at,
   every [min, max] s, kinds: plate, music, laugh, kid, thunder, clap). fan: seconds for the fan to swing back and forth
   (a big one let go while it blows toward the other diners gets smelled); 0 for no fan. oddK: how odd needless
   coughing looks here. seed: the same noises every time. stars: points for 1, 2 and 3 stars. */
const FLEVELS = [
  { name: 'เดทแรกร้านกาแฟ', scene: 'cafe', time: 75, gas: 5, food: [[22, 34, 6]], seed: 11,
    ambient: { first: 5, every: [6, 10], kinds: ['music', 'laugh', 'plate'] }, fan: 0, oddK: 1, strikes: 5,
    stars: [250, 450, 570],
    hint: 'ท้องเริ่มปั่นป่วน คนท้องเสียกดปล่อยแล้วเสียงจะดังตามมาแป๊บหนึ่ง อีกคนกดไอหรือลากเก้าอี้ให้ทันพอดี',
    tips: ['ปล่อยตอนแก๊สยังน้อย เสียงเบา ไอทีเดียวก็กลบได้', 'ปล่อยตอนร้านเสียงดัง เช่น เพลงขึ้น จานตก โต๊ะข้างๆ หัวเราะ ได้แต้มเพิ่ม', 'ไอบ่อยเกินไปทั้งที่ไม่มีอะไรให้กลบ คนจะมองแปลกๆ'] },
  { name: 'ร้านหมูกระทะ', scene: 'grill', time: 80, gas: 7, food: [[10, 24, 8], [42, 56, 9]], seed: 23,
    ambient: { first: 3, every: [4, 7], kinds: ['laugh', 'plate', 'music', 'kid'] }, fan: 9, oddK: 1,
    stars: [400, 900, 1150],
    hint: 'ร้านเสียงดังกลบง่าย แต่หมูกระทะทำให้ท้องปั่นป่วนเร็ว และมีพัดลมส่ายในร้าน ตัวใหญ่ๆ อย่าปล่อยตอนพัดลมหันไปหาคนอื่น',
    tips: ['ดูลูกศรพัดลม หันไปทางโต๊ะอื่นเมื่อไหร่ อย่าปล่อยตัวใหญ่', 'ลากเก้าอี้กลบได้แม้แต่ตัวที่ดังสุด แต่ต้องรอนานกว่าจะลากได้อีก', 'กดกลั้นช่วยให้แก๊สขึ้นช้าลง แต่หน้าแดงได้ไม่นาน'] },
  { name: 'ติวหนังสือในห้องสมุด', scene: 'library', time: 80, gas: 6, food: [[30, 40, 7]], seed: 37,
    ambient: { first: 14, every: [13, 18], kinds: ['thunder'] }, fan: 0, oddK: 1.3,
    stars: [240, 550, 700],
    hint: 'ห้องสมุดเงียบมาก ไม่มีเสียงอะไรช่วยกลบเลยนอกจากฟ้าร้อง ปล่อยทีละน้อยๆ แล้วไอกลบให้แม่น',
    tips: ['ปล่อยตอนแก๊สยังน้อยมากๆ จะเงียบกริบ ไม่ต้องกลบเลย แต่ได้แต้มนิดเดียว', 'ฟ้าร้องเมื่อไหร่ ปล่อยตัวใหญ่ได้เลย', 'ไอบ่อยในห้องสมุดคนมองแปลกกว่าที่อื่น'] },
  { name: 'กินข้าวกับพ่อแม่แฟน', scene: 'family', time: 85, gas: 7, food: [[8, 20, 7], [36, 50, 10], [64, 74, 8]], seed: 41,
    ambient: { first: 7, every: [8, 12], kinds: ['laugh', 'kid', 'plate'] }, fan: 7, oddK: 1.4,
    stars: [400, 900, 1120],
    hint: 'มื้อแรกกับพ่อแม่แฟน แม่ตักส้มตำให้ไม่หยุด พ่อสังเกตทุกอย่าง ไอผิดจังหวะก็ดูแปลก ตัวใหญ่ห้ามปล่อยตอนพัดลมหันไปหาพ่อ',
    tips: ['ส้มตำมาเมื่อไหร่ ท้องจะปั่นป่วนเร็วมาก ปล่อยเล็กๆ บ่อยๆ ดีกว่า', 'หลานร้องไห้หรือทุกคนหัวเราะ คือจังหวะทอง', 'พ่อแฟนสังเกตเก่ง อย่าลากเก้าอี้เล่น'] },
  { name: 'งานแต่งเพื่อนสนิท', scene: 'wedding', time: 90, gas: 8, food: [[6, 18, 8], [30, 44, 10], [58, 72, 10]], seed: 53,
    ambient: { first: 4, every: [5, 9], kinds: ['clap', 'music', 'laugh', 'plate'] }, fan: 8, oddK: 1.2,
    stars: [500, 1100, 1430],
    hint: 'งานแต่งโต๊ะจีน อาหารมาไม่หยุด ตอนบ่าวสาวขึ้นเวทีคนปรบมือ ตอนกล่าวอวยพรเงียบกริบ จังหวะต้องเป๊ะ',
    tips: ['ปรบมือกับเพลงคือที่กำบังชั้นดี ปล่อยตัวใหญ่ตอนนั้น', 'อาหารจีนมาทีไรแก๊สพุ่ง อย่ากลั้นนานจนหลุด', 'พัดลมส่ายเร็ว ดูลูกศรดีๆ'] }
];

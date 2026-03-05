import { ShipmentParser } from '../services/shipmentParser';

// Test the actual message from the user
const actualMessage = `465044299299134 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 

Og'irligi: 0.22 kg
Yo'l haqi: 16300 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;

console.log('Testing Actual Shipment Message...\n');
console.log('Message:', actualMessage);
console.log('\n' + '='.repeat(50) + '\n');

const result = ShipmentParser.parseMessage(actualMessage);
console.log('Parsing Result:');
console.log(JSON.stringify(result, null, 2));

if (result) {
  console.log('\n✅ Bot xabarni togri tushundi!');
  console.log('\nBot foydalanuvchiga quyidagilarni yuboradi:');
  
  if (result.receivePriceCNY && result.receivePriceUZS) {
    console.log(`Yuk topildi:`);
    console.log(`Tracking: ${result.trackNumber}`);
    console.log(`📦 Siz oldingan narx: ${result.receivePriceCNY} CNY (~${Math.round(result.receivePriceUZS)} so'm)`);
    console.log(`🚚 Yetkazish narxi: ${result.shipmentPrice ? `${result.shipmentPrice} CNY` : 'Noma\'lum'}`);
  } else {
    console.log(`Yuk topildi:`);
    console.log(`Tracking: ${result.trackNumber}`);
    console.log(`Narx: ${result.shipmentPrice ? `${result.shipmentPrice} CNY` : 'Noma\'lum'}`);
  }
  
  console.log(`\nAgar bu yukni qoshmoqchi bo'lsangiz, "✓ Qoshish" deb yozing.`);
} else {
  console.log('\n❌ Bot xabarni tushuna olmadi');
}

console.log('\n' + '='.repeat(50));
console.log('\nBotning ish jarayoni:');

console.log('\n1. Foydalanuvchi xabarni botga forward qiladi');
console.log('2. Bot xabarni tahlil qilib trek raqam va narxni ajratib oladi');
console.log('3. Foydalanuvchiga "✓ Qoshish" imkoniyati beriladi');
console.log('4. Foydalanuvchi "✓ Qoshish" deb yozsa, yuk avtomatik ravishda qoshiladi');
console.log('5. Bot tov narxini kiritishni so\'raydi');
console.log('6. Foydalanuvchi narxni kiritgach, yuk to\'liq saqlanadi');
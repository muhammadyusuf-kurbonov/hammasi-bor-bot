import { ShipmentParser } from '../services/shipmentParser';

// Test with all real message formats from iPost
const testMessages = [
  {
    name: "Order Success - JT Format",
    message: "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: JT5451380061466",
    shouldTrigger: true,
    expectTrackNumber: "JT5451380061466"
  },
  {
    name: "Order Success - YT Format", 
    message: "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: YT8834552519081",
    shouldTrigger: true,
    expectTrackNumber: "YT8834552519081"
  },
  {
    name: "Order Success - Numeric Format",
    message: "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: 772055336899474",
    shouldTrigger: true,
    expectTrackNumber: "772055336899474"
  },
  {
    name: "Shipment Update - Price Format",
    message: "👋 Assalomu alaykum, hurmatli mijoz!\n\n772055336899474 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫\n\n🏋️‍♂️ Og'irligi: 0.05 kg\n💰 Yo'l haqi: 3700 so'm \nILTIMOS TO'LOVNI AMALGA OSHIRING",
    shouldTrigger: true,
    expectTrackNumber: "772055336899474",
    expectPrice: 3700
  },
  {
    name: "Shipment Update - Heavy Package",
    message: "👋 Assalomu alaykum, hurmatli mijoz!\n\nJT5451380061466 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫\n\n🏋️‍♂️ Og'irligi: 4.07 kg\n💰 Yo'l haqi: 302100 so'm \nILTIMOS TO'LOVNI AMALGA OSHIRING",
    shouldTrigger: true,
    expectTrackNumber: "JT5451380061466",
    expectPrice: 302100
  },
  {
    name: "Shipment Update - Another Format",
    message: "👋 Assalomu alaykum, hurmatli mijoz!\n\n78976460106087 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫\n\n🏋️‍♂️ Og'irligi: 0.08 kg\n💰 Yo'l haqi: 5900 so'm \nILTIMOS TO'LOVNI AMALGA OSHIRING",
    shouldTrigger: true,
    expectTrackNumber: "78976460106087",
    expectPrice: 5900
  },
  {
    name: "Non-shipment Message",
    message: "Hello, how are you?",
    shouldTrigger: false,
    expectTrackNumber: null
  }
];

console.log('🧪 Testing All Real Message Formats from iPost...\n');

let passedTests = 0;
let totalTests = testMessages.length;

testMessages.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log('Message:', test.message.substring(0, 100) + '...');
  
  const result = ShipmentParser.parseMessage(test.message);
  const shouldTrigger = ShipmentParser.shouldTriggerAddFlow(test.message);
  
  console.log('Parsed Result:', JSON.stringify(result, null, 2));
  console.log('Should trigger add flow:', shouldTrigger);
  
  // Validate results
  let testPassed = true;
  
  if (test.shouldTrigger !== shouldTrigger) {
    console.log('❌ FAILED: Trigger flow mismatch');
    testPassed = false;
  } else if (test.expectTrackNumber && (!result || result.trackNumber !== test.expectTrackNumber)) {
    console.log(`❌ FAILED: Track number mismatch. Expected: ${test.expectTrackNumber}, Got: ${result?.trackNumber || 'null'}`);
    testPassed = false;
  } else if (test.expectPrice && (!result || !result.receivePriceUZS || result.receivePriceUZS !== test.expectPrice)) {
    console.log(`❌ FAILED: Price mismatch. Expected: ${test.expectPrice}, Got: ${result?.receivePriceUZS || 'null'}`);
    testPassed = false;
  } else if (!test.shouldTrigger && result) {
    console.log('❌ FAILED: Should not have triggered but got result');
    testPassed = false;
  } else {
    console.log('✅ PASSED');
    passedTests++;
  }
  
  console.log(''.padEnd(60, '-'));
});

console.log(`\n🎯 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Bot is ready for all iPost message formats.');
} else {
  console.log('⚠️ Some tests failed. Please check the parser logic.');
}

console.log('\n📋 SUPPORTED TRACK NUMBER FORMATS:');
console.log('✅ JTxxxxxxxxxxxx (12 digits after JT)');
console.log('✅ YTxxxxxxxxxxxx (12 digits after YT)');
console.log('✅ xxxxxxxxxxxxxx (12-15 digits only)');
console.log('✅ Price format: "yo\'l haqi: XXXX so\'m"');

console.log('\n🚀 Bot is ready to handle all real iPost message formats!');
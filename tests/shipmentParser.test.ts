import { test, expect, describe } from "bun:test";
import { ShipmentParser } from "../src/services/shipmentParser";

describe("ShipmentParser", () => {
  describe("parseMessage", () => {
    test("should parse order success message with JT format", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: JT5451380061466";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "JT5451380061466",
        description: "Buyurtma muvaffaqiyatli yaratildi"
      });
    });

    test("should parse order success message with YT format", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: YT8834552519081";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "YT8834552519081",
        description: "Buyurtma muvaffaqiyatli yaratildi"
      });
    });

    test("should parse order success message with numeric format", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: 772055336899474";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "772055336899474",
        description: "Buyurtma muvaffaqiyatli yaratildi"
      });
    });

    test("should parse shipment message with price information", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

772055336899474 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 0.05 kg
💰 Yo'l haqi: 3700 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "772055336899474",
        shipmentPrice: 3700,
        receivePriceCNY: 2.31,
        receivePriceUZS: 3700
      });
    });

    test("should parse heavy shipment message", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

JT5451380061466 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 4.07 kg
💰 Yo'l haqi: 302100 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "JT5451380061466",
        shipmentPrice: 302100,
        receivePriceCNY: 188.81,
        receivePriceUZS: 302100
      });
    });

    test("should parse another shipment format", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

78976460106087 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 0.08 kg
💰 Yo'l haqi: 5900 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toEqual({
        trackNumber: "78976460106087",
        shipmentPrice: 5900,
        receivePriceCNY: 3.69,
        receivePriceUZS: 5900
      });
    });

    test("should return null for non-shipment messages", () => {
      const message = "Hello, how are you?";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result).toBeNull();
    });

    test("should return null for empty messages", () => {
      const result = ShipmentParser.parseMessage("");
      expect(result).toBeNull();
    });

    test("should return null for whitespace-only messages", () => {
      const result = ShipmentParser.parseMessage("   \n\t  ");
      expect(result).toBeNull();
    });
  });

  describe("shouldTriggerAddFlow", () => {
    test("should return true for order success messages", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: JT5451380061466";
      const result = ShipmentParser.shouldTriggerAddFlow(message);
      
      expect(result).toBe(true);
    });

    test("should return true for price-based shipment messages", () => {
      const message = "465044299299134 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi. Yo'l haqi: 16300 so'm";
      const result = ShipmentParser.shouldTriggerAddFlow(message);
      
      expect(result).toBe(true);
    });

    test("should return false for non-shipment messages", () => {
      const message = "Hello, how are you?";
      const result = ShipmentParser.shouldTriggerAddFlow(message);
      
      expect(result).toBe(false);
    });

    test("should return false for messages without track numbers", () => {
      const message = "💰 Yo'l haqi: 16300 so'm";
      const result = ShipmentParser.shouldTriggerAddFlow(message);
      
      expect(result).toBe(false);
    });
  });

  describe("Real iPost Message Examples", () => {
    test("should parse JT5451380061466 order success", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: JT5451380061466";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("JT5451380061466");
      expect(result?.description).toBe("Buyurtma muvaffaqiyatli yaratildi");
    });

    test("should parse YT8834552519081 order success", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: YT8834552519081";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("YT8834552519081");
      expect(result?.description).toBe("Buyurtma muvaffaqiyatli yaratildi");
    });

    test("should parse 772055336899474 order success", () => {
      const message = "Buyurtma muvaffaqiyatli yaratildi! Trek raqami: 772055336899474";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("772055336899474");
      expect(result?.description).toBe("Buyurtma muvaffaqiyatli yaratildi");
    });

    test("should parse 772055336899474 shipment with price", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

772055336899474 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 0.05 kg
💰 Yo'l haqi: 3700 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("772055336899474");
      expect(result?.shipmentPrice).toBe(3700);
      expect(result?.receivePriceCNY).toBe(2.31);
      expect(result?.receivePriceUZS).toBe(3700);
    });

    test("should parse JT5451380061466 shipment with heavy price", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

JT5451380061466 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 4.07 kg
💰 Yo'l haqi: 302100 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("JT5451380061466");
      expect(result?.shipmentPrice).toBe(302100);
      expect(result?.receivePriceCNY).toBe(188.81);
      expect(result?.receivePriceUZS).toBe(302100);
    });

    test("should parse 78976460106087 shipment", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

78976460106087 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 0.08 kg
💰 Yo'l haqi: 5900 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("78976460106087");
      expect(result?.shipmentPrice).toBe(5900);
      expect(result?.receivePriceCNY).toBe(3.69);
      expect(result?.receivePriceUZS).toBe(5900);
    });
  });

  describe("Edge Cases", () => {
    test("should handle messages with emojis and special characters", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz! 

465044299299134 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫

🏋️‍♂️ Og'irligi: 0.22 kg
💰 Yo'l haqi: 16300 so'm 
ILTIMOS TO'LOVNI AMALGA OSHIRING`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("465044299299134");
      expect(result?.shipmentPrice).toBe(16300);
      expect(result?.receivePriceCNY).toBe(10.19);
      expect(result?.receivePriceUZS).toBe(16300);
    });

    test("should handle messages without price information", () => {
      const message = `👋 Assalomu alaykum, hurmatli mijoz!

772055336899474 trek raqamli buyurtmangiz Xitoy omboridan jo'natildi va O'zbekiston tomon yo'lga chiqdi. 🛫`;
      
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("772055336899474");
      expect(result?.shipmentPrice).toBeUndefined();
      expect(result?.receivePriceCNY).toBeUndefined();
      expect(result?.receivePriceUZS).toBeUndefined();
    });

    test("should handle case-insensitive matching", () => {
      const message = "BUYURTMA MUVAFFAQIYATLI YARATILDI! TREK RAQAMI: JT5451380061466";
      const result = ShipmentParser.parseMessage(message);
      
      expect(result?.trackNumber).toBe("JT5451380061466");
      expect(result?.description).toBe("Buyurtma muvaffaqiyatli yaratildi");
    });
  });
});
import { and, eq } from "drizzle-orm";
import { Composer } from "grammy";
import type { Message } from "grammy/types";
import { db } from "../database";
import { shipments } from "../database/schema";
import { ShipmentParser } from "../services/shipmentParser";
import type { BotContext } from "../types/bot";

const composer = new Composer<BotContext>();

composer.on(":forward_origin", async (ctx) => {
  const message = ctx.message as Message;
  console.log("received forward", message);
  const messageText = message.text || message.caption || "";

  if (!messageText) return;

  console.log("received forward", message);
  if (ShipmentParser.shouldTriggerAddFlow(messageText)) {
    console.log("Triggered add by forward");
    const parsedData = ShipmentParser.parseMessage(messageText);

    if (!parsedData) {
      await ctx.reply(
        "❌ Yuk xabarni tushunib bo'lmadi. Iltimos, tracking raqamini va narxni qo'lda kiriting.",
      );
      return;
    }

    const existing = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.trackNumber, parsedData.trackNumber),
          eq(shipments.ownerId, ctx.user!.id),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      try {
        const updateData: Record<string, unknown> = {};
        if (parsedData.shipmentPrice) {
          updateData.shipmentPrice = parsedData.shipmentPrice.toString();
        }
        if (parsedData.status) {
          updateData.status = parsedData.status;
        }
        if (parsedData.description || parsedData.provider) {
          updateData.description =
            parsedData.description ||
            `Provayder: ${parsedData.provider || "Noma'lum"}`;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await db
            .update(shipments)
            .set(updateData)
            .where(eq(shipments.id, existing[0].id));
        }

        let priceInfo = "";
        if (parsedData.receivePriceCNY && parsedData.receivePriceUZS) {
          priceInfo = `📦 Siz oldingan narx: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n`;
        }

        await ctx.reply(
          `✓ Yuk yangilandi: ${parsedData.trackNumber}\n\n${priceInfo}🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} so'm` : "Noma'lum"}`,
        );
      } catch (error) {
        console.error("Error updating shipment:", error);
        await ctx.reply("❌ Yukni yangilashda xatolik yuz berdi.");
      }
      return;
    }

    let priceInfo = "";
    if (parsedData.receivePriceCNY && parsedData.receivePriceUZS) {
      priceInfo = `📦 Siz oldingan narx: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n`;
    }

    await ctx.reply(
      `📦 Yuk topildi: ${parsedData.trackNumber}\n\n${priceInfo}🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} so'm` : "Noma'lum"}\n\n📝 Yuk nomini (tavsifini) kiriting:`,
    );

    ctx.session = {
      action: "awaiting_description",
      trackNumber: parsedData.trackNumber,
      shipmentPrice: parsedData.shipmentPrice,
      skipShipmentPrice: !!parsedData.receivePriceUZS,
    };

    return;
  }

  // Original flow for confirmation-based messages
  const parsedData = ShipmentParser.parseMessage(messageText);

  if (!parsedData) {
    await ctx.reply(
      "❌ Yuk xabarni tushunib bo'lmadi. Iltimos, tracking raqamini va narxni qo'lda kiriting.",
    );
    return;
  }

  let priceInfo = "";
  if (parsedData.receivePriceCNY && parsedData.receivePriceUZS) {
    priceInfo = `📦 Tovar narxi: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} so'm` : "Noma'lum"}\n\n`;
  } else {
    priceInfo = `📦 Narx: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} so'm` : "Noma'lum"}\n\n`;
  }

  await ctx.reply(
    `🔍 Yuk topildi:\n\n${priceInfo}Agar bu yukni qo\'shmoqchi bo\'lsangiz, "✓ Qo\'shish" deb yozing.`,
  );

  ctx.session = {
    action: "confirm_shipment",
    parsedData: parsedData,
  };
});

export default composer;

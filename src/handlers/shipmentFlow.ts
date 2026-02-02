import { and, eq } from "drizzle-orm";
import { Composer, InlineKeyboard } from "grammy";
import { db } from "../database";
import { shipments } from "../database/schema";
import type { BotContext } from "../types/bot";
import { MESSAGES, SHIPMENT_STATUSES } from "../types/bot";

const composer = new Composer<BotContext>();

// Add shipment - start flow
composer.callbackQuery("add_shipment", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(MESSAGES.ADD_SHIPMENT);
  ctx.session = { action: "awaiting_track_number" };
});

// Skip good price
composer.callbackQuery("skip_good_price", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session;
  if (session?.action !== "awaiting_good_price") return;

  session.goodPrice = 0;

  if (session.skipShipmentPrice) {
    try {
      await db.insert(shipments).values({
        trackNumber: session.trackNumber!,
        goodPrice: "0" as any,
        shipmentPrice: session.shipmentPrice?.toString() as any,
        status: SHIPMENT_STATUSES.PENDING,
        ownerId: ctx.user!.id,
        isPaid: false,
        description: session.description,
      });

      const keyboard = new InlineKeyboard()
        .text("📋 Yuklar ro'yxati", "list_shipments")
        .text("📦 Yana yuk qo'shish", "add_shipment");

      await ctx.reply(MESSAGES.SHIPMENT_ADDED, { reply_markup: keyboard });
      ctx.session = {};
    } catch (error) {
      console.error("Error creating shipment:", error);
      await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
    }
    return;
  }

  session.action = "awaiting_shipment_price";
  const skipKeyboard = new InlineKeyboard()
    .text("⏭️ O'tkazib yuborish", "skip_shipment_price");
  await ctx.reply(
    "🚚 Kargo narxini kiriting (so'm):\n\nAgar narx ma'lum bo'lmasa, tugmani bosing:",
    { reply_markup: skipKeyboard },
  );
});

// Skip shipment price - create shipment without cargo price
composer.callbackQuery("skip_shipment_price", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session;
  if (session?.action !== "awaiting_shipment_price") return;

  session.shipmentPrice = null;

  try {
    await db.insert(shipments).values({
      trackNumber: session.trackNumber!,
      goodPrice: (session.goodPrice || 0).toString() as any,
      shipmentPrice: null,
      status: SHIPMENT_STATUSES.PENDING,
      ownerId: ctx.user!.id,
      isPaid: false,
      description: session.description,
    });

    const keyboard = new InlineKeyboard()
      .text("📋 Yuklar ro'yxati", "list_shipments")
      .text("📦 Yana yuk qo'shish", "add_shipment");

    await ctx.reply(MESSAGES.SHIPMENT_ADDED, { reply_markup: keyboard });
    ctx.session = {};
  } catch (error) {
    console.error("Error creating shipment:", error);
    await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
  }
});

// Text handler for shipment flow states
composer.on("message:text", async (ctx, next) => {
  const session = ctx.session;
  if (!session?.action) return next();

  const text = ctx.message.text;

  switch (session.action) {
    case "awaiting_track_number": {
      const existing = await db
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.trackNumber, text),
            eq(shipments.ownerId, ctx.user!.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await ctx.reply(
          "❌ Bu tracking raqam sizda allaqachon mavjud! Boshqa raqam kiriting.",
        );
        return;
      }

      session.trackNumber = text;
      session.action = "awaiting_description";
      await ctx.reply("📝 Yuk nomini (tavsifini) kiriting:");
      break;
    }

    case "awaiting_description":
      session.description = text;
      session.action = "awaiting_good_price";
      {
        const skipKeyboard = new InlineKeyboard()
          .text("⏭️ O'tkazib yuborish", "skip_good_price");
        await ctx.reply(
          "💰 Pinduoduo narxini (CNY) kiriting:\n\nAgar narx ma'lum bo'lmasa, tugmani bosing:",
          { reply_markup: skipKeyboard },
        );
      }
      break;

    case "awaiting_good_price": {
      const goodPrice = parseFloat(text);
      if (isNaN(goodPrice) || goodPrice <= 0) {
        await ctx.reply("⚠️ Iltimos, to'g'ri narx kiriting (masalan: 150.50):");
        return;
      }

      session.goodPrice = goodPrice;

      if (session.skipShipmentPrice) {
        // Shipment price already known from forwarded message, create shipment directly
        try {
          await db.insert(shipments).values({
            trackNumber: session.trackNumber!,
            goodPrice: goodPrice.toString() as any,
            shipmentPrice: session.shipmentPrice?.toString() as any,
            status: SHIPMENT_STATUSES.PENDING,
            ownerId: ctx.user!.id,
            isPaid: false,
            description: session.description,
          });

          const keyboard = new InlineKeyboard()
            .text("📋 Yuklar ro'yxati", "list_shipments")
            .text("📦 Yana yuk qo'shish", "add_shipment");

          await ctx.reply(MESSAGES.SHIPMENT_ADDED, { reply_markup: keyboard });
          ctx.session = {};
        } catch (error) {
          console.error("Error creating shipment:", error);
          await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
        }
        break;
      }

      session.action = "awaiting_shipment_price";
      {
        const skipKeyboard = new InlineKeyboard()
          .text("⏭️ O'tkazib yuborish", "skip_shipment_price");
        await ctx.reply(
          "🚚 Kargo narxini kiriting (so'm):\n\nAgar narx ma'lum bo'lmasa, tugmani bosing:",
          { reply_markup: skipKeyboard },
        );
      }
      break;
    }

    case "awaiting_shipment_price": {
      const shipmentPriceVal = parseFloat(text.replace(/\s/g, ""));
      if (isNaN(shipmentPriceVal) || shipmentPriceVal < 0) {
        await ctx.reply(
          "⚠️ Iltimos, to'g'ri narx kiriting (masalan: 50000):",
        );
        return;
      }

      session.shipmentPrice = shipmentPriceVal === 0 ? null : shipmentPriceVal;

      try {
        await db.insert(shipments).values({
          trackNumber: session.trackNumber!,
          goodPrice: (session.goodPrice || 0).toString() as any,
          shipmentPrice: session.shipmentPrice?.toString() as any,
          status: SHIPMENT_STATUSES.PENDING,
          ownerId: ctx.user!.id,
          isPaid: false,
          description: session.description,
        });

        const keyboard = new InlineKeyboard()
          .text("📋 Yuklar ro'yxati", "list_shipments")
          .text("📦 Yana yuk qo'shish", "add_shipment");

        await ctx.reply(MESSAGES.SHIPMENT_ADDED, { reply_markup: keyboard });
        ctx.session = {};
      } catch (error) {
        console.error("Error creating shipment:", error);
        await ctx.reply(
          "❌ Yuk qo'shishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        );
      }
      break;
    }

    case "confirm_shipment": {
      if (text !== "✓ Qo'shish") return next();

      const parsedData = session.parsedData;

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
        await ctx.reply(
          `❌ Bu tracking raqam sizda allaqachon mavjud: ${parsedData.trackNumber}`,
        );
        return;
      }

      try {
        await db.insert(shipments).values({
          trackNumber: parsedData.trackNumber,
          goodPrice: "0",
          shipmentPrice: parsedData.shipmentPrice
            ? parsedData.shipmentPrice.toString()
            : null,
          status: parsedData.status || SHIPMENT_STATUSES.PENDING,
          ownerId: ctx.user!.id,
          isPaid: false,
          description: `Provayder: ${parsedData.provider || "Noma'lum"}`,
        });

        let priceInfo = "";
        if (parsedData.receivePriceCNY && parsedData.receivePriceUZS) {
          priceInfo = `📦 Siz oldingan narx: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n`;
        }

        await ctx.reply(
          `✓ Yuk muvaffaqiyatli qo\'shildi: ${parsedData.trackNumber}\n\n${priceInfo}🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} so'm` : "Noma'lum"}\n\n💰 Tovar narxini kirishingiz kerak (CNY):`,
        );

        ctx.session = {
          action: "awaiting_good_price",
          trackNumber: parsedData.trackNumber,
          shipmentPrice: parsedData.shipmentPrice,
        };
      } catch (error) {
        console.error("Error creating shipment:", error);
        await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
      }
      break;
    }

    default:
      return next();
  }
});

export default composer;

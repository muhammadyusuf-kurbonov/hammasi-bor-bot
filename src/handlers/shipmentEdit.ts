import { Composer, InlineKeyboard } from "grammy";
import { ShipmentService } from "../services/shipmentService";
import type { BotContext } from "../types/bot";

const composer = new Composer<BotContext>();

// Edit shipment callback
composer.callbackQuery(/^edit_shipment_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const shipment = await ShipmentService.getShipmentById(shipmentId, ctx.user!.id);
  if (!shipment) {
    await ctx.reply("❌ Yuk topilmadi yoki sizda bunday yukga ruxsat yo'q.");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📝 Tovar narxini o'zgartirish", `edit_price_${shipmentId}`)
    .row()
    .text("📦 Tracking raqamini o'zgartirish", `edit_track_${shipmentId}`)
    .text("📝 Tavsifni o'zgartirish", `edit_desc_${shipmentId}`)
    .row()
    .text("🗑️ Yukni o'chirish", `delete_shipment_${shipmentId}`)
    .row()
    .text("⬅️ Orqaga", "list_shipments");

  await ctx.reply(
    `📦 *Yukni tahrirlash:*\n\n` +
    `🔹 *Tracking:* ${shipment.trackNumber}\n` +
    `💰 *Tovar narxi:* ${shipment.goodPrice} CNY\n` +
    `📊 *Holati:* ${shipment.isPaid ? "💰 To'langan" : shipment.status}\n` +
    `📝 *Tavsif:* ${shipment.description || "Yo'q"}`,
    { reply_markup: keyboard, parse_mode: "Markdown" }
  );
});

// Delete shipment callback
composer.callbackQuery(/^delete_shipment_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const shipment = await ShipmentService.getShipmentById(shipmentId, ctx.user!.id);
  if (!shipment) {
    await ctx.reply("❌ Yuk topilmadi yoki sizda bunday yukga ruxsat yo'q.");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("✓ Ha, o'chirish", `confirm_delete_${shipmentId}`)
    .text("❌ Bekor qilish", "list_shipments");

  await ctx.reply(
    `⚠️ **Diqqat!**\n\n` +
    `Siz bu yukni o'chirmoqchimisiz?\n\n` +
    `🔹 *Tracking:* ${shipment.trackNumber}\n` +
    `💰 *Tovar narxi:* ${shipment.goodPrice} CNY\n` +
    `📊 *Holati:* ${shipment.isPaid ? "💰 To'langan" : shipment.status}`,
    { reply_markup: keyboard, parse_mode: "Markdown" }
  );
});

// Confirm delete shipment
composer.callbackQuery(/^confirm_delete_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  try {
    await ShipmentService.deleteShipment(shipmentId, ctx.user!.id);
    await ctx.reply("✅ Yuk muvaffaqiyatli o'chirildi!");

    setTimeout(() => {
      const keyboard = new InlineKeyboard()
        .text("📦 Yuklar ro'yxati", "list_shipments")
        .text("📦 Yangi yuk qo'shish", "add_shipment");

      ctx.reply("📋 Yangilangan ro'yxatni ko'rish uchun tugmani bosing:", {
        reply_markup: keyboard
      });
    }, 1000);
  } catch (error) {
    console.error("Error deleting shipment:", error);
    await ctx.reply("❌ Yuk o'chirishda xatolik yuz berdi.");
  }
});

// Edit price callback
composer.callbackQuery(/^edit_price_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const shipment = await ShipmentService.getShipmentById(shipmentId, ctx.user!.id);
  if (!shipment) {
    await ctx.reply("❌ Yuk topilmadi yoki sizda bunday yukga ruxsat yo'q.");
    return;
  }

  ctx.session = {
    action: "edit_shipment_price",
    shipmentId: shipmentId,
    currentPrice: shipment.goodPrice
  };

  await ctx.reply(
    `💰 *Tovar narxini o'zgartirish*\n\n` +
    `Hozirgi narx: ${shipment.goodPrice} CNY\n\n` +
    `Yangi narxni kiriting (CNY):`
  );
});

// Edit track number callback
composer.callbackQuery(/^edit_track_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const shipment = await ShipmentService.getShipmentById(shipmentId, ctx.user!.id);
  if (!shipment) {
    await ctx.reply("❌ Yuk topilmadi yoki sizda bunday yukga ruxsat yo'q.");
    return;
  }

  ctx.session = {
    action: "edit_shipment_track",
    shipmentId: shipmentId,
    currentTrack: shipment.trackNumber
  };

  await ctx.reply(
    `📦 *Tracking raqamini o'zgartirish*\n\n` +
    `Hozirgi raqam: ${shipment.trackNumber}\n\n` +
    `Yangi tracking raqamini kiriting:`
  );
});

// Edit description callback
composer.callbackQuery(/^edit_desc_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const shipment = await ShipmentService.getShipmentById(shipmentId, ctx.user!.id);
  if (!shipment) {
    await ctx.reply("❌ Yuk topilmadi yoki sizda bunday yukga ruxsat yo'q.");
    return;
  }

  ctx.session = {
    action: "edit_shipment_desc",
    shipmentId: shipmentId,
    currentDesc: shipment.description || ""
  };

  await ctx.reply(
    `📝 *Tavsifni o'zgartirish*\n\n` +
    `Hozirgi tavsif: ${shipment.description || "Yo'q"}\n\n` +
    `Yangi tavsifni kiriting (agar tavsiz kerak bo'lsa, "⏭️ O'tkazish" deb yozing):`
  );
});

// Text handler for edit session states
composer.on("message:text", async (ctx, next) => {
  const session = ctx.session;
  if (!session?.action) return next();

  const text = ctx.message.text;

  switch (session.action) {
    case "edit_shipment_price": {
      const newPrice = parseFloat(text);
      if (isNaN(newPrice) || newPrice <= 0) {
        await ctx.reply("⚠️ Iltimos, to'g'ri narx kiriting (masalan: 150.50):");
        return;
      }

      try {
        await ShipmentService.updateShipment(session.shipmentId!, ctx.user!.id, {
          goodPrice: newPrice
        });

        await ctx.reply("✅ Tovar narxi muvaffaqiyatli yangilandi!");

        const keyboard = new InlineKeyboard()
          .text("📦 Yuklar ro'yxati", "list_shipments")
          .text("📦 Yangi yuk qo'shish", "add_shipment");

        ctx.reply("Boshqa amallar uchun:", { reply_markup: keyboard });
      } catch (error) {
        console.error("Error updating shipment price:", error);
        await ctx.reply("❌ Narxni yangilashda xatolik yuz berdi.");
      }
      break;
    }

    case "edit_shipment_track":
      try {
        await ShipmentService.updateShipment(session.shipmentId!, ctx.user!.id, {
          trackNumber: text
        });

        await ctx.reply("✅ Tracking raqami muvaffaqiyatli yangilandi!");

        const keyboard = new InlineKeyboard()
          .text("📦 Yuklar ro'yxati", "list_shipments")
          .text("📦 Yangi yuk qo'shish", "add_shipment");

        ctx.reply("Boshqa amallar uchun:", { reply_markup: keyboard });
      } catch (error) {
        console.error("Error updating shipment track:", error);
        await ctx.reply("❌ Tracking raqamini yangilashda xatolik yuz berdi.");
      }
      break;

    case "edit_shipment_desc": {
      const description = text === "⏭️ O'tkazish" ? undefined : text;

      try {
        await ShipmentService.updateShipment(session.shipmentId!, ctx.user!.id, {
          description: description
        });

        await ctx.reply("✅ Tavsif muvaffaqiyatli yangilandi!");

        const keyboard = new InlineKeyboard()
          .text("📦 Yuklar ro'yxati", "list_shipments")
          .text("📦 Yangi yuk qo'shish", "add_shipment");

        ctx.reply("Boshqa amallar uchun:", { reply_markup: keyboard });
      } catch (error) {
        console.error("Error updating shipment description:", error);
        await ctx.reply("❌ Tavsifni yangilashda xatolik yuz berdi.");
      }
      break;
    }

    default:
      return next();
  }
});

export default composer;

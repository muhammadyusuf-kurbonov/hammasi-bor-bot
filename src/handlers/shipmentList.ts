import { Composer, InlineKeyboard } from "grammy";
import { ShipmentService } from "../services/shipmentService";
import type { BotContext } from "../types/bot";
import { MESSAGES } from "../types/bot";

const composer = new Composer<BotContext>();

// List shipments
composer.callbackQuery("list_shipments", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userShipments = await ShipmentService.getUserShipments(ctx.user!.id);

  if (userShipments.length === 0) {
    await ctx.reply("📦 Sizda hali yuklar yo'q.");
    return;
  }

  let message = "📦 *Sizning yuklaringiz:*\n\n";

  const keyboard = new InlineKeyboard();

  for (const shipment of userShipments) {
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    const shipmentPrice = shipment.shipmentPrice
      ? ` | 🚚 ${shipment.shipmentPrice} so'm`
      : "";

    message += `🔹 *${shipment.trackNumber}*\n`;
    message += `💰 Tovar: ${shipment.goodPrice} CNY${shipmentPrice}\n`;
    message += `📊 Holati: ${status}\n`;

    if (shipment.description) {
      message += `📝 ${shipment.description}\n`;
    }

    message += `\n`;

    keyboard
      .text(`✏️ ${shipment.trackNumber}`, `edit_shipment_${shipment.id}`)
      .text(`🗑️`, `delete_shipment_${shipment.id}`)
      .row();
  }

  keyboard
    .text("📦 Yangi yuk qo'shish", "add_shipment")
    .text("🔍 Qidirish", "search_shipment");

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

// Search shipment callback
composer.callbackQuery("search_shipment", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔍 Iltimos, tracking raqamini kiriting:");
  ctx.session = { action: "searching" };
});

// Search text handler
composer.on("message:text", async (ctx, next) => {
  const session = ctx.session;
  if (session?.action !== "searching") return next();

  const trackNumber = ctx.message.text;

  const shipment = await ShipmentService.getShipmentByTrackNumber(trackNumber, ctx.user!.id);

  if (!shipment) {
    await ctx.reply(MESSAGES.SHIPMENT_NOT_FOUND);
    ctx.session = {};
    return;
  }

  const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
  const shipmentPrice = shipment.shipmentPrice
    ? ` | 🚚 ${shipment.shipmentPrice} so'm`
    : "";

  let message = `📦 *Yuk ma\'lumotlari:*\n\n`;
  message += `🔹 *Tracking:* ${shipment.trackNumber}\n`;
  message += `💰 *Tovar narxi:* ${shipment.goodPrice} CNY${shipmentPrice}\n`;
  message += `📊 *Holati:* ${status}\n`;

  if (shipment.description) {
    message += `📝 *Tavsif:* ${shipment.description}\n`;
  }

  message += `📅 *Qo\'shilgan:* ${shipment.createdAt?.toLocaleDateString("uz-UZ") || "N/A"}\n`;

  const keyboard = new InlineKeyboard()
    .text("✏️ Tahrirlash", `edit_shipment_${shipment.id}`)
    .row()
    .text("🗑️ O'chirish", `delete_shipment_${shipment.id}`)
    .row()
    .text("📋 Ro'yxatga qaytish", "list_shipments")
    .text("📦 Yangi yuk", "add_shipment");

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });

  ctx.session = {};
});

export default composer;

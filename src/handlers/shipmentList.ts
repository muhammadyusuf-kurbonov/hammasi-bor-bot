import { Composer, InlineKeyboard } from "grammy";
import { ShipmentService } from "../services/shipmentService";
import type { BotContext } from "../types/bot";
import { MESSAGES } from "../types/bot";

const PAGE_SIZE = 5;

const composer = new Composer<BotContext>();

function buildShipmentListMessage(
  items: Awaited<ReturnType<typeof ShipmentService.getUserShipments>>["items"],
  total: number,
  page: number,
) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  let message = `📦 *Sizning yuklaringiz* (${page + 1}/${totalPages}):\n\n`;

  const keyboard = new InlineKeyboard();

  for (const shipment of items) {
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    const shipmentPrice = shipment.shipmentPrice
      ? ` | 🚚 ${shipment.shipmentPrice} so'm`
      : "";

    message += `🔹 *${shipment.trackNumber}*\n`;
    message += `💰 Tovar: ${shipment.goodPrice} CNY${shipmentPrice}\n`;
    message += `📊 Holati: ${status}\n`;

    if (shipment.description) {
      message += `📝 Nomi: ${shipment.description}\n`;
    }

    message += `\n`;

    const label = shipment.description
      ? shipment.description.substring(0, 20) + (shipment.description.length > 20 ? "…" : "")
      : shipment.trackNumber;
    keyboard
      .text(`✏️ ${label}`, `edit_shipment_${shipment.id}`)
      .text(`🗑️`, `delete_shipment_${shipment.id}`)
      .row();
  }

  // Pagination buttons
  if (totalPages > 1) {
    if (page > 0) {
      keyboard.text("⬅️", `list_page_${page - 1}`);
    }
    keyboard.text(`${page + 1}/${totalPages}`, "noop");
    if (page < totalPages - 1) {
      keyboard.text("➡️", `list_page_${page + 1}`);
    }
    keyboard.row();
  }

  keyboard
    .text("📦 Yangi yuk qo'shish", "add_shipment")
    .text("🔍 Qidirish", "search_shipment");

  return { message, keyboard };
}

// List shipments (first page)
composer.callbackQuery("list_shipments", async (ctx) => {
  await ctx.answerCallbackQuery();

  const { items, total } = await ShipmentService.getUserShipments(ctx.user!.id, 0, PAGE_SIZE);

  if (items.length === 0) {
    await ctx.reply("📦 Sizda hali yuklar yo'q.");
    return;
  }

  const { message, keyboard } = buildShipmentListMessage(items, total, 0);

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

// List page navigation
composer.callbackQuery(/^list_page_(\d+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();

  const { items, total } = await ShipmentService.getUserShipments(ctx.user!.id, page, PAGE_SIZE);

  if (items.length === 0) {
    await ctx.reply("📦 Bu sahifada yuklar yo'q.");
    return;
  }

  const { message, keyboard } = buildShipmentListMessage(items, total, page);

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

// noop for page indicator button
composer.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// Search shipment callback
composer.callbackQuery("search_shipment", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔍 Tracking raqami yoki yuk nomini kiriting:");
  ctx.session = { action: "searching" };
});

// Search text handler
composer.on("message:text", async (ctx, next) => {
  const session = ctx.session;
  if (session?.action !== "searching") return next();

  const query = ctx.message.text;

  // First try exact track number match
  const exactMatch = await ShipmentService.getShipmentByTrackNumber(query, ctx.user!.id);

  if (exactMatch) {
    const shipment = exactMatch;
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    const shipmentPrice = shipment.shipmentPrice
      ? ` | 🚚 ${shipment.shipmentPrice} so'm`
      : "";

    let message = `📦 *Yuk ma\'lumotlari:*\n\n`;
    message += `🔹 *Tracking:* ${shipment.trackNumber}\n`;
    if (shipment.description) {
      message += `📝 *Nomi:* ${shipment.description}\n`;
    }
    message += `💰 *Tovar narxi:* ${shipment.goodPrice} CNY${shipmentPrice}\n`;
    message += `📊 *Holati:* ${status}\n`;
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
    return;
  }

  // Search by name (case-insensitive, partial match)
  const { items: nameResults, total } = await ShipmentService.searchByName(query, ctx.user!.id, 0, PAGE_SIZE);

  if (nameResults.length === 0) {
    await ctx.reply(MESSAGES.SHIPMENT_NOT_FOUND);
    ctx.session = {};
    return;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  let message = `🔍 *Qidiruv natijalari* (${total} ta topildi, 1/${totalPages}):\n\n`;
  const keyboard = new InlineKeyboard();

  for (const shipment of nameResults) {
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    message += `🔹 *${shipment.description || shipment.trackNumber}*\n`;
    message += `📦 Tracking: ${shipment.trackNumber}\n`;
    message += `📊 Holati: ${status}\n\n`;

    const label = shipment.description
      ? shipment.description.substring(0, 20) + (shipment.description.length > 20 ? "…" : "")
      : shipment.trackNumber;
    keyboard
      .text(`✏️ ${label}`, `edit_shipment_${shipment.id}`)
      .row();
  }

  if (totalPages > 1) {
    const encodedQuery = Buffer.from(query).toString("base64").substring(0, 40);
    keyboard.text(`1/${totalPages}`, "noop");
    keyboard.text("➡️", `search_page_${encodedQuery}_1`);
    keyboard.row();
  }

  keyboard.text("📋 Ro'yxatga qaytish", "list_shipments");

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });

  ctx.session = {};
});

// Search page navigation
composer.callbackQuery(/^search_page_(.+)_(\d+)$/, async (ctx) => {
  const encodedQuery = ctx.match[1];
  const page = parseInt(ctx.match[2]);
  await ctx.answerCallbackQuery();

  const query = Buffer.from(encodedQuery, "base64").toString("utf-8");
  const { items, total } = await ShipmentService.searchByName(query, ctx.user!.id, page, PAGE_SIZE);

  if (items.length === 0) {
    await ctx.reply("🔍 Bu sahifada natijalar yo'q.");
    return;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  let message = `🔍 *Qidiruv natijalari* (${total} ta topildi, ${page + 1}/${totalPages}):\n\n`;
  const keyboard = new InlineKeyboard();

  for (const shipment of items) {
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    message += `🔹 *${shipment.description || shipment.trackNumber}*\n`;
    message += `📦 Tracking: ${shipment.trackNumber}\n`;
    message += `📊 Holati: ${status}\n\n`;

    const label = shipment.description
      ? shipment.description.substring(0, 20) + (shipment.description.length > 20 ? "…" : "")
      : shipment.trackNumber;
    keyboard
      .text(`✏️ ${label}`, `edit_shipment_${shipment.id}`)
      .row();
  }

  if (page > 0) {
    keyboard.text("⬅️", `search_page_${encodedQuery}_${page - 1}`);
  }
  keyboard.text(`${page + 1}/${totalPages}`, "noop");
  if (page < totalPages - 1) {
    keyboard.text("➡️", `search_page_${encodedQuery}_${page + 1}`);
  }
  keyboard.row();

  keyboard.text("📋 Ro'yxatga qaytish", "list_shipments");

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

export default composer;

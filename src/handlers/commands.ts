import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../types/bot";
import { MESSAGES } from "../types/bot";

const composer = new Composer<BotContext>();

composer.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("📦 Yangi yuk qo'shish", "add_shipment")
    .text("📋 Yuklar ro'yxati", "list_shipments")
    .row()
    .text("🔍 Yuk qidirish", "search_shipment")
    .text("🌐 Veb-ilova", "open_webapp")
    .row()
    .text("❓ Yordam", "help");

  await ctx.reply(MESSAGES.WELCOME, { reply_markup: keyboard });
});

composer.command("help", async (ctx) => {
  await ctx.reply(MESSAGES.HELP);
});

composer.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(MESSAGES.HELP);
});

export default composer;

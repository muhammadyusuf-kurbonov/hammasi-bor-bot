import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../types/bot";
import { MESSAGES } from "../types/bot";
import { UserService } from "../services/userService";

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

composer.command("share", async (ctx) => {
  const telegramId = ctx.match;
  
  if (!telegramId) {
    await ctx.reply("❌ Noto'g'ri foydalanuvchi IDsi. Iltimos, /share <USER_TG_ID> ko'rinishida kiriting.");
    return;
  }

  const targetId = parseInt(telegramId, 10);
  
  if (isNaN(targetId) || targetId <= 0) {
    await ctx.reply("❌ Noto'g'ri foydalanuvchi IDsi. Iltimos, to'g'ri raqam kiriting.");
    return;
  }

  if (!ctx.user) {
    await ctx.reply("❌ Foydalanuvchi ma'lumotlari topilmadi. Iltimos, /start buyrug'ini bosing.");
    return;
  }

  const result = await UserService.grantShareAccess(ctx.user.id, targetId);
  
  if (result.success) {
    await ctx.reply(`✅ ${result.message}\n\nEndi bu foydalanuvchi sizning yuklaringizni ko'radi.`);
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
});

composer.command("unshare", async (ctx) => {
  const telegramId = ctx.match;
  
  if (!telegramId) {
    await ctx.reply("❌ Noto'g'ri foydalanuvchi IDsi. Iltimos, /unshare <USER_TG_ID> ko'rinishida kiriting.");
    return;
  }

  const targetId = parseInt(telegramId, 10);
  
  if (isNaN(targetId) || targetId <= 0) {
    await ctx.reply("❌ Noto'g'ri foydalanuvchi IDsi. Iltimos, to'g'ri raqam kiriting.");
    return;
  }

  if (!ctx.user) {
    await ctx.reply("❌ Foydalanuvchi ma'lumotlari topilmadi. Iltimos, /start buyrug'ini bosing.");
    return;
  }

  const result = await UserService.revokeShareAccess(ctx.user.id, targetId);
  
  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
});

export default composer;

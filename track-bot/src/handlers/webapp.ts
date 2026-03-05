import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../types/bot";

const composer = new Composer<BotContext>();

composer.callbackQuery("open_webapp", async (ctx) => {
  await ctx.answerCallbackQuery();

  const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3000";

  const keyboard = new InlineKeyboard().webApp(
    "🌐 Veb-ilovani ochish",
    webAppUrl,
  );

  await ctx.reply("🌐 Veb-ilovani ochish uchun tugmani bosing:", {
    reply_markup: keyboard,
  });
});

export default composer;

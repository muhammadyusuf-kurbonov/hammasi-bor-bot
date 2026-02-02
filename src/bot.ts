import { eq } from "drizzle-orm";
import { Bot, session } from "grammy";
import { db } from "./database";
import { users } from "./database/schema";
import commands from "./handlers/commands";
import forwardHandler from "./handlers/forwardHandler";
import shipmentEdit from "./handlers/shipmentEdit";
import shipmentFlow from "./handlers/shipmentFlow";
import shipmentList from "./handlers/shipmentList";
import webapp from "./handlers/webapp";
import type { BotContext, SessionData } from "./types/bot";

// Create bot with proper context type
const bot = new Bot<BotContext>(process.env.BOT_TOKEN || "");

// Session middleware
bot.use(
  session({
    initial: (): SessionData => ({}),
  }),
);

// Middleware to handle user state
bot.use(async (ctx, next) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  // Get or create user
  let user = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (user.length === 0) {
    const newUser = await db
      .insert(users)
      .values({
        telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
      })
      .returning();
    user = newUser;
  }

  // Add user to context
  ctx.user = user[0];
  return next();
});

// Register handlers
bot.use(commands);
bot.use(forwardHandler);
bot.use(shipmentFlow);
bot.use(shipmentList);
bot.use(shipmentEdit);
bot.use(webapp);

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };

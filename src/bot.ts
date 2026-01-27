import { and, desc, eq } from "drizzle-orm";
import { Bot, InlineKeyboard, session } from "grammy";
import type { Message } from "grammy/types";
import { db } from "./database";
import { shipments, users } from "./database/schema";
import { ShipmentParser } from "./services/shipmentParser";
import { ShipmentService } from "./services/shipmentService";
import type { BotContext, SessionData } from "./types/bot";
import { MESSAGES, SHIPMENT_STATUSES } from "./types/bot";

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

// Start command
bot.command("start", async (ctx) => {
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

// Help command
bot.command("help", async (ctx) => {
  await ctx.reply(MESSAGES.HELP);
});

// Add shipment - quick flow with minimal clicks
bot.callbackQuery("add_shipment", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(MESSAGES.ADD_SHIPMENT);
  ctx.session = { action: "awaiting_track_number" };
});
// Handle forwarded messages (shipment provider messages)
bot.on(":forward_origin", async (ctx) => {
  const message = ctx.message as Message;
  console.log("received forward", message);
  const messageText = message.text || message.caption || "";

  if (!messageText) return;

  console.log("received forward", message);
  // Check if this should trigger automatic add flow
  if (ShipmentParser.shouldTriggerAddFlow(messageText)) {
    console.log("Triggered add by forward");
    // Parse the shipment message
    const parsedData = ShipmentParser.parseMessage(messageText);

    if (!parsedData) {
      await ctx.reply(
        "❌ Yuk xabarni tushunib bo'lmadi. Iltimos, tracking raqamini va narxni qo'lda kiriting.",
      );
      return;
    }

    // Check if track number already exists for this user
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

    // Create new shipment automatically
    try {
      await db.insert(shipments).values({
        trackNumber: parsedData.trackNumber,
        goodPrice: "0", // Will be set manually
        shipmentPrice: parsedData.shipmentPrice
          ? parsedData.shipmentPrice.toString()
          : null,
        status: parsedData.status || SHIPMENT_STATUSES.PENDING,
        ownerId: ctx.user!.id,
        isPaid: false,
        description:
          parsedData.description ||
          `Provayder: ${parsedData.provider || "Noma'lum"}`,
      });

      let priceInfo = "";
      if (parsedData.receivePriceCNY && parsedData.receivePriceUZS) {
        priceInfo = `📦 Siz oldingan narx: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n`;
      }

      await ctx.reply(
        `✓ Yuk avtomatik ravishda qo\'shildi: ${parsedData.trackNumber}\n\n${priceInfo}🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} CNY` : "Noma'lum"}\n\n💰 Tovar narxini kirishingiz kerak (CNY):`,
      );

      // Set session to await good price
      ctx.session = {
        action: "awaiting_good_price",
        trackNumber: parsedData.trackNumber,
        shipmentPrice: parsedData.shipmentPrice,
      };
    } catch (error) {
      console.error("Error creating shipment:", error);
      await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
    }

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
    priceInfo = `📦 Tovar narxi: ${parsedData.receivePriceCNY} CNY (~${Math.round(parsedData.receivePriceUZS)} so'm)\n🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} CNY` : "Noma'lum"}\n\n`;
  } else {
    priceInfo = `📦 Narx: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} CNY` : "Noma'lum"}\n\n`;
  }

  await ctx.reply(
    `🔍 Yuk topildi:\n\n${priceInfo}Agar bu yukni qo\'shmoqchi bo\'lsangiz, "✓ Qo\'shish" deb yozing.`,
  );

  // Set session for confirmation
  ctx.session = {
    action: "confirm_shipment",
    parsedData: parsedData,
  };
});

// Handle text input for adding shipment
bot.on("message:text", async (ctx) => {
  const session = ctx.session;
  if (!session?.action) return;

  const text = ctx.message.text;

  switch (session.action) {
    case "awaiting_track_number":
      // FIX: Check if track number already exists for this user only
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
      session.action = "awaiting_good_price";
      await ctx.reply(MESSAGES.ENTER_GOOD_PRICE);
      break;

    case "awaiting_good_price":
      const goodPrice = parseFloat(text);
      if (isNaN(goodPrice) || goodPrice <= 0) {
        await ctx.reply("⚠️ Iltimos, to'g'ri narx kiriting (masalan: 150.50):");
        return;
      }

      session.goodPrice = goodPrice;
      session.action = "awaiting_shipment_price";
      await ctx.reply(
        MESSAGES.ENTER_SHIPMENT_PRICE +
          "\n\nAgar narx ma'lum bo'lmasa, \"0\" deb yozing:",
      );
      break;

    case "awaiting_shipment_price":
      const shipmentPrice = parseFloat(text);
      if (isNaN(shipmentPrice) || shipmentPrice < 0) {
        await ctx.reply(
          "⚠️ Iltimos, to'g'ri narx kiriting (masalan: 50.00) yoki \"0\" deb yozing:",
        );
        return;
      }

      session.shipmentPrice = shipmentPrice === 0 ? null : shipmentPrice;
      session.action = "awaiting_description";
      await ctx.reply(
        MESSAGES.ENTER_DESCRIPTION +
          "\n\nAgar tavsif kerak bo'lmasa, \"⏭️ O'tkazish\" deb yozing:",
      );
      break;

    case "awaiting_description":
      if (text === "⏭️ O'tkazish") {
        session.description = null;
      } else {
        session.description = text;
      }

      // Create shipment
      try {
        await db.insert(shipments).values({
          trackNumber: session.trackNumber!,
          goodPrice: session.goodPrice!.toString() as any,
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

        // Clear session
        ctx.session = {};
      } catch (error) {
        console.error("Error creating shipment:", error);
        await ctx.reply(
          "❌ Yuk qo'shishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        );
      }
      break;

    // Edit shipment price
    case "edit_shipment_price":
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

    // Edit shipment track number
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

    // Edit shipment description
    case "edit_shipment_desc":
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
});

// List shipments
bot.callbackQuery("list_shipments", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userShipments = await ShipmentService.getUserShipments(ctx.user!.id);

  if (userShipments.length === 0) {
    await ctx.reply("📦 Sizda hali yuklar yo'q.");
    return;
  }

  let message = "📦 *Sizning yuklaringiz:*\n\n";

  // Create keyboard with shipment buttons
  const keyboard = new InlineKeyboard();
  
  for (const shipment of userShipments) {
    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    const shipmentPrice = shipment.shipmentPrice
      ? ` | 🚚 ${shipment.shipmentPrice} CNY`
      : "";

    message += `🔹 *${shipment.trackNumber}*\n`;
    message += `💰 Tovar: ${shipment.goodPrice} CNY${shipmentPrice}\n`;
    message += `📊 Holati: ${status}\n`;

    if (shipment.description) {
      message += `📝 ${shipment.description}\n`;
    }

    message += `\n`;
    
    // Add edit and delete buttons for each shipment
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

// Edit shipment callback
bot.callbackQuery(/^edit_shipment_(\d+)$/, async (ctx) => {
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
bot.callbackQuery(/^delete_shipment_(\d+)$/, async (ctx) => {
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
bot.callbackQuery(/^confirm_delete_(\d+)$/, async (ctx) => {
  const shipmentId = parseInt(ctx.match[1]);
  await ctx.answerCallbackQuery();
  
  try {
    await ShipmentService.deleteShipment(shipmentId, ctx.user!.id);
    await ctx.reply("✅ Yuk muvaffaqiyatli o'chirildi!");
    
    // Show updated list
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

// Edit shipment price callback
bot.callbackQuery(/^edit_price_(\d+)$/, async (ctx) => {
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
bot.callbackQuery(/^edit_track_(\d+)$/, async (ctx) => {
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
bot.callbackQuery(/^edit_desc_(\d+)$/, async (ctx) => {
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

// Search shipment
bot.callbackQuery("search_shipment", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔍 Iltimos, tracking raqamini kiriting:");
  ctx.session = { action: "searching" };
});

// Handle search
bot.on("message:text", async (ctx) => {
  const session = ctx.session;
  if (session?.action === "searching") {
    const trackNumber = ctx.message.text;

    const shipment = await ShipmentService.getShipmentByTrackNumber(trackNumber, ctx.user!.id);

    if (!shipment) {
      await ctx.reply(MESSAGES.SHIPMENT_NOT_FOUND);
      ctx.session = {};
      return;
    }

    const status = shipment.isPaid ? "💰 To'langan" : shipment.status;
    const shipmentPrice = shipment.shipmentPrice
      ? ` | 🚚 ${shipment.shipmentPrice} CNY`
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
  }
});

// Web app
bot.callbackQuery("open_webapp", async (ctx) => {
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

// Help callback
bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(MESSAGES.HELP);
});


// Handle confirmation for parsed shipments
bot.on("message:text", async (ctx) => {
  const session = ctx.session;
  if (!session?.action) return;

  const text = ctx.message.text;

  if (session.action === "confirm_shipment" && text === "✓ Qo'shish") {
    const parsedData = session.parsedData;

    // Check if track number already exists for this user
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

    // Create new shipment
    try {
      await db.insert(shipments).values({
        trackNumber: parsedData.trackNumber,
        goodPrice: "0", // Will be set manually
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
        `✓ Yuk muvaffaqiyatli qo\'shildi: ${parsedData.trackNumber}\n\n${priceInfo}🚚 Yetkazish narxi: ${parsedData.shipmentPrice ? `${parsedData.shipmentPrice} CNY` : "Noma'lum"}\n\n💰 Tovar narxini kirishingiz kerak (CNY):`,
      );

      // Set session to await good price
      ctx.session = {
        action: "awaiting_good_price",
        trackNumber: parsedData.trackNumber,
        shipmentPrice: parsedData.shipmentPrice,
      };
    } catch (error) {
      console.error("Error creating shipment:", error);
      await ctx.reply("❌ Yuk qo'shishda xatolik yuz berdi.");
    }
  }
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };

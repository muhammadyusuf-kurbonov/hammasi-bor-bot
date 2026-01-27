import type { Context } from 'grammy';
import type { SessionFlavor } from 'grammy';

// Bot types and interfaces
export interface SessionData {
  action?: string;
  trackNumber?: string;
  goodPrice?: number;
  shipmentPrice?: number | null;
  description?: string | null;
  parsedData?: any;
  shipmentId?: number;
  currentPrice?: string;
  currentTrack?: string;
  currentDesc?: string;
}

// Extended context type with user and session
export interface BotContext extends Context, SessionFlavor<SessionData> {
  user?: {
    id: number;
    telegramId: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  };
}



export interface ShipmentData {
  trackNumber: string;
  goodPrice: number;
  shipmentPrice?: number;
  status: string;
  ownerId?: number;
  isPaid: boolean;
  description?: string;
  notes?: string;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  date: string;
}

// Bot commands
export const BOT_COMMANDS = {
  START: '/start',
  ADD: '/add',
  LIST: '/list',
  SEARCH: '/search',
  UPDATE: '/update',
  DELETE: '/delete',
  HELP: '/help',
  WEBAPP: '/webapp',
} as const;

// Shipment statuses
export const SHIPMENT_STATUSES = {
  PENDING: 'pending',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  PAID: 'paid',
} as const;

// Bot messages (Uzbek - placeholders for translation)
export const MESSAGES = {
  WELCOME: '👋 Assalomu alaykum! Yuklarni kuzatish botiga xush kelibsiz.',
  HELP: '📋 Yordam:\n/add - Yangi yuk qo\'shish\n/list - Yuklar ro\'yxati\n/search - Yuk qidirish\n/update - Yuk ma\'lumotlarini yangilash\n/delete - Yuk o\'chirish\n/webapp - Veb-ilova',
  ADD_SHIPMENT: '📦 Yangi yuk qo\'shish. Iltimos, tracking raqamini kiriting:',
  ENTER_GOOD_PRICE: '💰 Tovar narxini (CNY) kiriting:',
  ENTER_SHIPMENT_PRICE: '🚚 Yetkazish narxini kiriting (agar ma\'lum bo\'lsa):',
  ENTER_OWNER: '👤 Qabul qiluvchini tanlang:',
  ENTER_DESCRIPTION: '📝 Tavsifni kiriting (ixtiyoriy):',
  SHIPMENT_ADDED: '✅ Yuk muvaffaqiyatli qo\'shildi!',
  SHIPMENT_LIST: '📦 Yuklar ro\'yxati:',
  SHIPMENT_NOT_FOUND: '❌ Yuk topilmadi!',
  SHIPMENT_UPDATED: '✅ Yuk ma\'lumotlari yangilandi!',
  SHIPMENT_DELETED: '🗑️ Yuk o\'chirildi!',
  INVALID_INPUT: '⚠️ Noto\'g\'ri ma\'lumot! Iltimos, qaytadan urinib ko\'ring.',
  CANCEL: '❌ Bekor qilindi',
} as const;
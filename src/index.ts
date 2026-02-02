import { bot } from './bot';
import { db } from './database';
import { users } from './database/schema';

// Start the bot
console.log('🚀 Starting Hammasi Bor Tracking Bot...');

// Test database connection
try {
  await db.select().from(users).limit(1);
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Start bot polling
console.log('🤖 Starting bot...');
bot.start().catch((error: unknown) => {
  console.error('❌ Bot failed to start:', error);
  process.exit(1);
});

console.log('✅ Bot started successfully!');
console.log('📱 Bot is running and ready to receive messages');
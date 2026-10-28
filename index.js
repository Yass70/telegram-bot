import { Bot } from 'grammy';
import { setupCommands } from './commands.js';
import { db, save, freshGroup } from './database.js';
import { createHelpers } from './helpers.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || '').trim();
if (!TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
if (!OWNER_ID) console.warn('Warning: BOT_OWNER_ID is not set; owner-only features will be unavailable.');

const bot = new Bot(TOKEN);
bot.catch((err) => {
  console.error('Error happened in bot catch:', err);
});

const helpers = createHelpers({ bot, db, save, freshGroup, OWNER_ID });
setupCommands(bot, db, helpers);

bot.start();

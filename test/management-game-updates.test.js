import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUESTIONS_DB, SHUAR_LIST, PERSONAL_QUESTIONS_LIST } from '../games/data.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('all main quiz pools have at least 50 randomized prompts', () => {
  for (const category of ['choose', 'math', 'animals', 'general']) assert.ok(QUESTIONS_DB[category].length >= 50, category);
  assert.ok(PERSONAL_QUESTIONS_LIST.length >= 30);
  assert.ok(SHUAR_LIST.length >= 15);
  const gameHandler = read('../games/messageHandler.js');
  assert.ok((gameHandler.match(/\{ emoji:/g) || []).length >= 60, 'emoji meaning questions');
  assert.ok((gameHandler.match(/DECOMPOSE_WORDS[\s\S]*?\];/) || [''])[0].split(',').length >= 70, 'decomposition word pool');
});

test('deleted ask-me game is absent from handlers and public menus', () => {
  const messages = read('../commands/messages.js');
  const callbacks = read('../commands/callbacks.js');
  const gameHandler = read('../games/messageHandler.js');
  assert.doesNotMatch(messages + callbacks + gameHandler, /game_askme|اسئلني|اسالني|اسألني/);
  assert.match(messages, /'🎁 خدمات حصرية', 'exclusive_services'/);
  assert.match(callbacks, /game_ge: '💡 اضغط أسئلة ثم اكتب «س»/);
});

test('protection menu integrates selective protection and warning controls', () => {
  const commands = read('../commands.js');
  const callbacks = read('../commands/callbacks.js');
  assert.match(commands, /تفعيل حمايات محددة/);
  assert.match(commands, /'warningstoggle'/);
  assert.match(callbacks, /g\.warningSettings\.enabled = true/);
  assert.match(callbacks, /g\.warningSettings\.enabled = false/);
});

test('owner chat subscription feature is persisted and checks membership', () => {
  const database = read('../database.js');
  const callbacks = read('../commands/callbacks.js');
  const messages = read('../commands/messages.js');
  assert.match(database, /chatSubscriptions:\s*\{\}/);
  assert.match(callbacks, /showChatSubscriptionMenu/);
  assert.match(callbacks, /chatsubverify:/);
  assert.match(messages, /chatSub\?\.enabled/);
  assert.match(messages, /chat-sub-set/);
});


test('owner stats expose compact counts and a paginated user directory', () => {
  const callbacks = read('../commands/callbacks.js');
  const helpers = read('../helpers.js');
  assert.match(callbacks, /إجمالي مستخدمي الخاص:/);
  assert.match(callbacks, /المجموعات المسجّلة:/);
  assert.match(callbacks, /المنضمون خلال آخر 24 ساعة:/);
  assert.match(callbacks, /botgroupspage:/);
  assert.match(callbacks, /botnew24hpage:/);
  assert.match(callbacks, /botuserspage:/);
  assert.match(callbacks, /copy_text: \{ text: id \}/);
  assert.match(helpers, /firstName/);
  assert.match(helpers, /username/);
  assert.match(helpers, /function registerPrivateStart/);
  assert.match(helpers, /privateStartAt/);
});

test('games hub separates games from interactive commands and exclusive services', () => {
  const commands = read('../commands.js');
  const callbacks = read('../commands/callbacks.js');
  assert.match(commands, /bot\.hears\(\/\^\(\?:العاب/);
  assert.match(callbacks, /if \(data === 'gameshub'\)/);
  const gamesBlock = callbacks.slice(callbacks.indexOf("if (data === 'gamesmenu'"), callbacks.indexOf("if (data === 'game_top'"));
  assert.doesNotMatch(gamesBlock, /text\('💬 الأوامر التفاعلية'/);
  assert.doesNotMatch(gamesBlock, /text\('🎁 خدمات حصرية'/);
  assert.match(callbacks, /'↩️ عالم نغنوغ', 'gameshub'/);
});

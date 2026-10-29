import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeNameBatch } from '../touches.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Arabic name decoration produces up to ten distinct short styles', () => {
  const styles = makeNameBatch('ياسر', 'ar');
  assert.equal(styles.length, 10);
  assert.equal(new Set(styles).size, 10);
  assert.ok(styles.every(style => [...style].length <= 64));
});

test('game buttons use short popup instructions and no long explanation page', () => {
  const callbacks = read('../commands/callbacks.js');
  assert.match(callbacks, /gameHelpAlerts/);
  assert.match(callbacks, /show_alert:\s*true/);
  assert.match(callbacks, /game_ch:\s*'🧩 اكتب «اختيارات»/);
  const games = read('../games/messageHandler.js');
  assert.doesNotMatch(games, /game.key === 'askme'/);
  assert.doesNotMatch(callbacks, /game_askme|اسئلني/);
  assert.doesNotMatch(callbacks, /if \(\['game_ch', 'game_ma', 'game_an', 'game_ge', 'game_meanings', 'game_opposite', 'game_decompose', 'game_askme'\]\.includes\(data\)\)/);
});

test('group games command and random profile praise are registered', () => {
  const messages = read('../commands/messages.js');
  assert.match(messages, /\['العاب', 'ألعاب', 'الالعاب', 'الألعاب'\]/);
  assert.match(messages, /const praise = PROFILE_PHRASES\[Math\.floor\(Math\.random\(\) \* PROFILE_PHRASES\.length\)\]/);
});

test('owner text editor is text-only and statistics include activity windows', () => {
  const callbacks = read('../commands/callbacks.js');
  assert.match(callbacks, /const textCatalog = UI_TEXT_CATALOG[\s\S]*filter\(item => item\.kind === 'text'\)/);
  assert.match(callbacks, /نشطون خلال 24 ساعة/);
  assert.match(callbacks, /نشطون خلال 7 أيام/);
  assert.match(callbacks, /if \(kind !== 'text'\)/);
});

test('warnings are kept in group overview and removed from group settings list', () => {
  const keyboards = read('../keyboards.js');
  const settings = keyboards.split('export function groupSettingsKeyboard')[1].split('export function repliesKeyboard')[0];
  assert.doesNotMatch(settings, /warningsmenu/);
  const callbacks = read('../commands/callbacks.js');
  assert.match(callbacks, /\.text\('⚠️ التحذيرات', 'warningsmenu'\)/);
  assert.match(keyboards, /back === 'groupoverview' \? '↩️ بطاقة المجموعة'/);
});

test('database persists game points and referral records', () => {
  const database = read('../database.js');
  assert.match(database, /groupPoints:\s*\{\}/);
  assert.match(database, /points:\s*\{\}/);
  assert.match(database, /referrals:\s*\{\}/);
  assert.match(database, /referralByUser:\s*\{\}/);
});

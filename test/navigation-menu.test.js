import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('main menu keeps profile, earnings, help and opens remaining services', async () => {
  const keyboards = await read('../keyboards.js');
  const main = keyboards.slice(keyboards.indexOf('export function mainKeyboard'), keyboards.indexOf('export function remainingServicesKeyboard'));
  assert.match(main, /accountinfo/);
  assert.match(main, /earningsmenu/);
  assert.match(main, /help/);
  assert.match(main, /باقي الخدمات🧩/);
  assert.doesNotMatch(main, /chmgr:|custommenu|إدارة القنوات|تخصيص نغنوغ/);
});

test('remaining services contains the requested six entries', async () => {
  const keyboards = await read('../keyboards.js');
  const menu = keyboards.slice(keyboards.indexOf('export function remainingServicesKeyboard'), keyboards.indexOf('export function helpKeyboard'));
  for (const item of ['groupmanagementmenu', 'touchesvocal', 'touchesdecorate', 'qrmenu', 'touchesdownload', 'remindermenu']) {
    assert.ok(menu.includes(item), `missing ${item}`);
  }
  assert.match(menu, /إنشاء رمز QR/);
  assert.match(menu, /🏠 القائمة الرئيسية/);
});

test('channel manager and personal customization menu handlers are removed', async () => {
  const callbacks = await read('../commands/callbacks.js');
  const commands = await read('../commands.js');
  const helpers = await read('../helpers.js');
  assert.equal(existsSync(new URL('../channelManager.js', import.meta.url)), false);
  assert.doesNotMatch(commands, /registerChannelManager|channelManager\.js/);
  assert.doesNotMatch(callbacks, /custommenu|customuimenu|customdescmenu|customreplymenu|customreset|chmgr:/);
  assert.doesNotMatch(helpers, /custommenu/);
});

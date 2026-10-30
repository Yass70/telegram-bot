import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChatTargetInput, resolveTelegramChatTarget } from '../chatTarget.js';

const publicInputs = [
  ['@example_channel', '@example_channel'],
  ['https://t.me/example_channel', '@example_channel'],
  ['https://telegram.me/example_channel', '@example_channel'],
  ['t.me/example_channel', '@example_channel'],
  ['https://t.me/example_channel/123', '@example_channel'],
];
for (const [input, reference] of publicInputs) {
  test(`normalizes ${input}`, () => assert.equal(normalizeChatTargetInput(input).reference, reference));
}

test('preserves numeric chat IDs as strings', () => {
  const parsed = normalizeChatTargetInput('-1001234567890');
  assert.equal(parsed.reference, '-1001234567890');
  assert.equal(parsed.isNumericId, true);
});

test('private invite links cannot be mistaken for chat IDs', () => {
  assert.throws(() => normalizeChatTargetInput('https://t.me/+AbCdEfGh12345678'), /Chat ID/);
  assert.throws(() => normalizeChatTargetInput('https://t.me/joinchat/AbCdEfGh12345678'), /Chat ID/);
});

test('private invite requires a numeric chat ID and valid Telegram invite', () => {
  const parsed = normalizeChatTargetInput('-1001234567890 | https://t.me/+AbCdEfGh12345678');
  assert.equal(parsed.reference, '-1001234567890');
  assert.equal(parsed.isPrivateInvite, true);
  assert.throws(() => normalizeChatTargetInput('-1001234567890 | https://example.com/invite'), /رابط دعوة خاص/);
});

test('rejects malformed hosts, usernames and non-chat links', () => {
  for (const value of ['https://evil.t.me/example_channel', 'https://t.me/ab', 'https://t.me/c/123/456', 'not-a-chat']) {
    assert.throws(() => normalizeChatTargetInput(value));
  }
});

test('resolver uses Telegram getChat and checks bot plus user permissions', async () => {
  const calls = [];
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat(ref) { calls.push(['getChat', ref]); return { id: -1001234567890, type: 'channel', title: 'Test', username: 'example_channel' }; },
      async getChatMember(chatId, userId) { calls.push(['getChatMember', String(chatId), String(userId)]); return { status: 'administrator', can_post_messages: userId === '999' }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, 'https://telegram.me/example_channel', {
    allowedTypes: ['channel'], requireBotPost: true, requireUserAdmin: true,
  });
  assert.equal(result.id, '-1001234567890');
  assert.equal(result.url, 'https://t.me/example_channel');
  assert.deepEqual(calls, [['getChat', '@example_channel'], ['getChatMember', '-1001234567890', '999'], ['getChatMember', '-1001234567890', '111']]);
});

test('resolver refuses save when bot is not admin or lacks channel posting permission', async () => {
  const base = { me: { id: 999 }, from: { id: 111 }, api: { async getChat() { return { id: -1001234567890, type: 'channel', title: 'Test' }; } } };
  await assert.rejects(() => resolveTelegramChatTarget({ ...base, api: { ...base.api, async getChatMember() { return { status: 'member' }; } } }, '-1001234567890', { allowedTypes: ['channel'], requireBotPost: true }), /ليس مشرفاً/);
  await assert.rejects(() => resolveTelegramChatTarget({ ...base, api: { ...base.api, async getChatMember(chatId, userId) { return userId === '999' ? { status: 'administrator', can_post_messages: false } : { status: 'administrator' }; } } }, '-1001234567890', { allowedTypes: ['channel'], requireBotPost: true }), /صلاحية «نشر الرسائل»/);
});

test('public group links resolve for chat-subscription targets', async () => {
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat(ref) { assert.equal(ref, '@example_group'); return { id: -1001234567890, type: 'supergroup', title: 'Example group', username: 'example_group' }; },
      async getChatMember(chatId, userId) { return { status: 'administrator' }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, 't.me/example_group', { allowedTypes: ['channel', 'group', 'supergroup'] });
  assert.equal(result.type, 'supergroup');
  assert.equal(result.url, 'https://t.me/example_group');
});

test('private chat ID is resolved independently from its invite link', async () => {
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat(ref) { assert.equal(ref, '-1001234567890'); return { id: -1001234567890, type: 'supergroup', title: 'Private group' }; },
      async getChatMember() { return { status: 'administrator' }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890 | https://t.me/+AbCdEfGh12345678', { allowedTypes: ['channel', 'group', 'supergroup'] });
  assert.equal(result.id, '-1001234567890');
  assert.equal(result.url, 'https://t.me/+AbCdEfGh12345678');
  assert.equal(result.inviteAssociationVerified, false);
});

test('the three product entry points share one Telegram target resolver', async () => {
  const messages = await (await import('node:fs/promises')).readFile(new URL('../commands/messages.js', import.meta.url), 'utf8');
  const manager = await (await import('node:fs/promises')).readFile(new URL('../channelManager.js', import.meta.url), 'utf8');
  const callbacks = await (await import('node:fs/promises')).readFile(new URL('../commands/callbacks.js', import.meta.url), 'utf8');
  assert.match(messages, /import \{ resolveTelegramChatTarget \} from '\.\.\/chatTarget\.js'/);
  assert.match(messages, /async function resolveSubscriptionTarget[\s\S]*?resolveTelegramChatTarget\(ctx, input/);
  assert.match(messages, /p\.action === 'chat-sub-set'[\s\S]*?resolveSubscriptionTarget\(ctx, text\)/);
  assert.match(messages, /p\.action === 'add-required-chat'[\s\S]*?resolveSubscriptionTarget\(ctx, text\)/);
  assert.match(manager, /import \{ resolveTelegramChatTarget \} from '\.\/chatTarget\.js'/);
  assert.match(manager, /resolveTelegramChatTarget\(ctx, raw/);
  assert.match(callbacks, /data === 'requiredadd'/);
  assert.match(callbacks, /data\.startsWith\('chatsubset:'\)/);
});

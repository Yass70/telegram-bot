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
      async getChatMember() { return { status: 'administrator', can_invite_users: true }; },
      async createChatInviteLink(chatId, options) { assert.equal(String(chatId), '-1001234567890'); assert.equal(options.creates_join_request, true); return { invite_link: 'https://t.me/+FreshBotCreatedInvite123', creates_join_request: true }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890 | https://t.me/+AbCdEfGh12345678', { allowedTypes: ['channel', 'group', 'supergroup'] });
  assert.equal(result.id, '-1001234567890');
  assert.equal(result.url, 'https://t.me/+FreshBotCreatedInvite123');
  assert.equal(result.inviteAssociationVerified, true);
  assert.equal(result.inviteLinkGeneratedByBot, true);
  assert.equal(result.createsJoinRequest, true);
});

test('subscription target entry points share one Telegram target resolver', async () => {
  const messages = await (await import('node:fs/promises')).readFile(new URL('../commands/messages.js', import.meta.url), 'utf8');
  const callbacks = await (await import('node:fs/promises')).readFile(new URL('../commands/callbacks.js', import.meta.url), 'utf8');
  assert.match(messages, /import \{ resolveTelegramChatTarget \} from '\.\.\/chatTarget\.js'/);
  assert.match(messages, /async function resolveSubscriptionTarget[\s\S]*?resolveTelegramChatTarget\(ctx, input/);
  assert.match(messages, /p\.action === 'chat-sub-set'[\s\S]*?resolveSubscriptionTarget\(ctx, text\)/);
  assert.match(messages, /p\.action === 'add-required-chat'[\s\S]*?resolveSubscriptionTarget\(ctx, text\)/);
  assert.match(callbacks, /data === 'requiredadd'/);
  assert.match(callbacks, /data\.startsWith\('chatsubset:'\)/);
});


test('private chat without invite creates a fresh normal invite link', async () => {
  const calls = [];
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat() { return { id: -1001234567890, type: 'channel', title: 'Private channel' }; },
      async getChatMember(chatId, userId) { return { status: 'administrator', can_post_messages: true, can_invite_users: true }; },
      async createChatInviteLink(chatId, options) { calls.push(options); return { invite_link: 'https://t.me/+NewPrivateInvite987654321', expire_date: 0, creates_join_request: false }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890', { allowedTypes: ['channel'], requireBotPost: true });
  assert.equal(result.url, 'https://t.me/+NewPrivateInvite987654321');
  assert.equal(result.inviteLinkGeneratedByBot, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].creates_join_request, false);
});

test('private chat refuses to save when bot cannot create an invite link', async () => {
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat() { return { id: -1001234567890, type: 'supergroup', title: 'Private group' }; },
      async getChatMember() { return { status: 'administrator', can_invite_users: false }; },
    },
  };
  await assert.rejects(() => resolveTelegramChatTarget(ctx, '-1001234567890', { allowedTypes: ['group', 'supergroup'] }), /صلاحية «دعوة المستخدمين عبر رابط»/);
});

test('stored expired invite is rotated using createChatInviteLink', async () => {
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat() { return { id: -1001234567890, type: 'supergroup', title: 'Private group' }; },
      async getChatMember() { return { status: 'administrator', can_invite_users: true }; },
      async createChatInviteLink() { return { invite_link: 'https://t.me/+ReplacementInvite12345678' }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890', { allowedTypes: ['group', 'supergroup'], existingTarget: { inviteLink: 'https://t.me/+OldInvite12345678', inviteLinkGeneratedByBot: true, inviteLinkCreatedAt: Date.now() - 1000, inviteLinkExpiresAt: Math.floor(Date.now() / 1000) - 10 } });
  assert.equal(result.url, 'https://t.me/+ReplacementInvite12345678');
});


test('a recent bot-generated private invite is reused instead of trusting a supplied URL', async () => {
  const saved = { inviteLink: 'https://t.me/+BotGeneratedInvite123456', inviteLinkGeneratedByBot: true, inviteLinkCreatedAt: Date.now() - 1000, inviteLinkExpiresAt: 0, createsJoinRequest: false };
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat() { return { id: -1001234567890, type: 'supergroup', title: 'Private group' }; },
      async getChatMember() { return { status: 'administrator', can_invite_users: true }; },
      async createChatInviteLink() { assert.fail('a recent generated invite should be reused'); },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890', { allowedTypes: ['group', 'supergroup'], existingTarget: saved });
  assert.equal(result.url, saved.inviteLink);
});


test('all subscription gates use Bot API membership and track pending approval separately', async () => {
  const fs = await import('node:fs/promises');
  const helpers = await fs.readFile(new URL('../helpers.js', import.meta.url), 'utf8');
  const commands = await fs.readFile(new URL('../commands.js', import.meta.url), 'utf8');
  assert.match(helpers, /bot\.api\.getChatMember\(normalizeChatIdentifier\(ch\.id\), Number\(userId\)\)/);
  assert.match(helpers, /bot\.api\.getChatMember\(normalizeChatIdentifier\(resolved\.id\), Number\(userId\)\)/);
  assert.match(helpers, /function isJoinedMember\(member\)/);
  assert.match(commands, /bot\.on\('chat_join_request'/);
  assert.match(helpers, /pendingApproval/);
});

test('private target links are not constructed from numeric Chat IDs', async () => {
  const ctx = {
    me: { id: 999 }, from: { id: 111 },
    api: {
      async getChat() { return { id: -1001234567890, type: 'supergroup', title: 'Private group' }; },
      async getChatMember() { return { status: 'administrator', can_invite_users: true }; },
      async createChatInviteLink() { return { invite_link: 'https://t.me/+ValidInviteLink123456' }; },
    },
  };
  const result = await resolveTelegramChatTarget(ctx, '-1001234567890', { allowedTypes: ['group', 'supergroup'] });
  assert.notEqual(result.url, result.id);
  assert.match(result.url, /^https:\/\/t\.me\/\+/);
});

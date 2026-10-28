// توحيد النصوص العامة على مخرجات Telegram API مع الحفاظ على معرفات الأزرار.
const WRAPPED = Symbol.for('naghnogh.globalTextOverrides.installed');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceByRules(value, rules) {
  if (typeof value !== 'string' || !value || !Array.isArray(rules) || !rules.length) return value;
  const valid = rules
    .filter(rule => rule && typeof rule.from === 'string' && rule.from.length && typeof rule.to === 'string' && rule.from !== rule.to)
    .sort((a, b) => b.from.length - a.from.length);
  if (!valid.length) return value;
  const replacements = new Map(valid.map(rule => [rule.from, rule.to]));
  const pattern = new RegExp(valid.map(rule => escapeRegExp(rule.from)).join('|'), 'g');
  return value.replace(pattern, match => replacements.get(match) ?? match);
}

function withinLimit(original, changed, maxLength = 4096) {
  return typeof changed === 'string' && changed.length <= maxLength ? changed : original;
}

function transformButton(button, db) {
  if (!button || typeof button !== 'object' || typeof button.text !== 'string') return button;
  const rules = db.globalTextOverrides || {};
  let changed = button.text;
  const callback = typeof button.callback_data === 'string' ? rules.buttonCallbacks?.[button.callback_data] : null;
  // التعديل المخصص لمعرف callback له أولوية، ولا يغيّر callback_data نفسه.
  if (callback && (button.text === callback.from || button.text === callback.to)) changed = callback.to;
  else changed = replaceByRules(button.text, rules.buttons || []);
  if (Buffer.byteLength(changed, 'utf8') > 64) return button;
  return changed === button.text ? button : { ...button, text: changed };
}

function transformMarkup(markup, db) {
  if (!markup || typeof markup !== 'object') return markup;
  const out = { ...markup };
  if (Array.isArray(markup.inline_keyboard)) {
    out.inline_keyboard = markup.inline_keyboard.map(row => Array.isArray(row) ? row.map(button => transformButton(button, db)) : row);
  }
  if (Array.isArray(markup.keyboard)) {
    out.keyboard = markup.keyboard.map(row => Array.isArray(row) ? row.map(button => {
      if (typeof button === 'string') return replaceByRules(button, db.globalTextOverrides?.buttons || []);
      return transformButton(button, db);
    }) : row);
  }
  return out;
}

function transformExtra(extra, db, { captionLimit = 1024 } = {}) {
  if (!extra || typeof extra !== 'object') return extra;
  const out = { ...extra };
  if (out.reply_markup) out.reply_markup = transformMarkup(out.reply_markup, db);
  const textRules = db.globalTextOverrides?.texts || [];
  if (typeof out.caption === 'string') out.caption = withinLimit(out.caption, replaceByRules(out.caption, textRules), captionLimit);
  if (typeof out.text === 'string') out.text = withinLimit(out.text, replaceByRules(out.text, textRules), captionLimit);
  if (typeof out.explanation === 'string') out.explanation = withinLimit(out.explanation, replaceByRules(out.explanation, textRules), 200);
  return out;
}

function transformMedia(media, db) {
  if (!Array.isArray(media)) return media;
  return media.map(item => {
    if (!item || typeof item !== 'object') return item;
    const out = { ...item };
    if (typeof out.caption === 'string') out.caption = withinLimit(out.caption, replaceByRules(out.caption, db.globalTextOverrides?.texts || []), 1024);
    return out;
  });
}

function transformArgs(method, args, db) {
  const out = [...args];
  const textRules = db.globalTextOverrides?.texts || [];
  const applyTextAt = (index, limit = 4096) => {
    if (typeof out[index] === 'string') out[index] = withinLimit(out[index], replaceByRules(out[index], textRules), limit);
  };
  const applyExtraAt = (index, options) => {
    if (out[index] && typeof out[index] === 'object' && !Array.isArray(out[index])) out[index] = transformExtra(out[index], db, options);
  };

  switch (method) {
    case 'sendMessage':
      applyTextAt(1); applyExtraAt(2); break;
    case 'editMessageText': {
      const inline = typeof out[0] === 'string' && typeof out[1] === 'string';
      const textIndex = inline ? 1 : 2;
      applyTextAt(textIndex); applyExtraAt(textIndex + 1); break;
    }
    case 'sendPhoto': case 'sendVideo': case 'sendDocument': case 'sendAudio': case 'sendAnimation': case 'sendVoice':
      applyExtraAt(2, { captionLimit: 1024 }); break;
    case 'editMessageCaption': {
      // Telegram/grammY places caption inside the optional `other` object.
      const extraIndex = out[1] && typeof out[1] === 'object' ? 1 : 2;
      applyExtraAt(extraIndex, { captionLimit: 1024 }); break;
    }
    case 'editMessageReplyMarkup': {
      // reply_markup is also a field of the `other` object in grammY.
      const extraIndex = out[1] && typeof out[1] === 'number' ? 2 : 1;
      applyExtraAt(extraIndex); break;
    }
    case 'sendMediaGroup':
      out[1] = transformMedia(out[1], db); applyExtraAt(2); break;
    case 'sendPoll':
      applyTextAt(1, 300); // Telegram poll question limit.
      if (Array.isArray(out[2])) out[2] = out[2].map(option => {
        if (typeof option === 'string') return withinLimit(option, replaceByRules(option, textRules), 100);
        if (option && typeof option.text === 'string') return { ...option, text: withinLimit(option.text, replaceByRules(option.text, textRules), 100) };
        return option;
      });
      applyExtraAt(3); break;
    case 'answerCallbackQuery':
      applyExtraAt(1, { captionLimit: 200 });
      break;
    default:
      // بقية الدوال لا تحمل نص واجهة في مواضع معروفة؛ تُترك كما هي عمداً.
      break;
  }
  return out;
}

/**
 * Installs on the shared grammY Api object. Context helpers such as ctx.reply and
 * ctx.editMessageText route through this API, so the transformation is applied once
 * to both context-based and direct bot.api calls.
 */
export function installGlobalTextOverrides(bot, db) {
  const api = bot?.api;
  if (!api || api[WRAPPED]) return;
  Object.defineProperty(api, WRAPPED, { value: true, configurable: false });
  const methods = [
    'sendMessage', 'editMessageText', 'sendPhoto', 'sendVideo', 'sendDocument', 'sendAudio',
    'sendAnimation', 'sendVoice', 'editMessageCaption', 'editMessageReplyMarkup', 'sendMediaGroup',
    'sendPoll', 'answerCallbackQuery'
  ];
  for (const method of methods) {
    if (typeof api[method] !== 'function') continue;
    const original = api[method].bind(api);
    api[method] = (...args) => original(...transformArgs(method, args, db));
  }
}

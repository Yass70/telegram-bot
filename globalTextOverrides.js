// تطبيق توحيد النصوص العامة على رسائل الواجهات وأزرارها دون تغيير callback_data.
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceByRules(value, rules) {
  if (typeof value !== 'string' || !value || !Array.isArray(rules) || !rules.length) return value;
  const valid = rules
    .filter(rule => rule && typeof rule.from === 'string' && rule.from.length && typeof rule.to === 'string' && rule.from !== rule.to)
    .sort((a, b) => b.from.length - a.from.length);
  if (!valid.length) return value;
  const replacements = new Map(valid.map(rule => [rule.from, rule.to]));
  const pattern = new RegExp(valid.map(rule => escapeRegExp(rule.from)).join('|'), 'g');
  return value.replace(pattern, match => replacements.get(match) ?? match);
}

function transformMarkup(markup, buttonRules) {
  if (!markup || typeof markup !== 'object') return markup;
  const out = { ...markup };
  if (Array.isArray(markup.inline_keyboard)) {
    out.inline_keyboard = markup.inline_keyboard.map(row => row.map(button => {
      if (!button || typeof button !== 'object' || typeof button.text !== 'string') return button;
      const changed = replaceByRules(button.text, buttonRules);
      // لا نرسل اسماً يتجاوز حد تيليگرام لزر InlineKeyboard (64 بايت).
      const safeText = typeof Buffer !== 'undefined' && Buffer.byteLength(changed, 'utf8') > 64 ? button.text : changed;
      return { ...button, text: safeText };
    }));
  }
  if (Array.isArray(markup.keyboard)) {
    out.keyboard = markup.keyboard.map(row => row.map(button => {
      if (typeof button === 'string') return replaceByRules(button, buttonRules);
      if (!button || typeof button !== 'object' || typeof button.text !== 'string') return button;
      const changed = replaceByRules(button.text, buttonRules);
      const safeText = typeof Buffer !== 'undefined' && Buffer.byteLength(changed, 'utf8') > 64 ? button.text : changed;
      return { ...button, text: safeText };
    }));
  }
  return out;
}

function transformExtra(extra, textRules, buttonRules) {
  if (!extra || typeof extra !== 'object') return extra;
  const out = { ...extra };
  if (out.reply_markup) out.reply_markup = transformMarkup(out.reply_markup, buttonRules);
  if (typeof out.caption === 'string') out.caption = replaceByRules(out.caption, textRules);
  return out;
}

export function installGlobalTextOverrides(bot, db) {
  bot.use(async (ctx, next) => {
    const originalReply = ctx.reply.bind(ctx);
    const originalEditMessageText = ctx.editMessageText.bind(ctx);
    const originalReplyWithPhoto = ctx.replyWithPhoto?.bind(ctx);
    const applyText = value => {
      const changed = replaceByRules(value, db.globalTextOverrides?.texts || []);
      // نحافظ على حد طول رسائل تيليگرام إذا أدى الاستبدال إلى نص أطول من المسموح.
      return typeof changed === 'string' && changed.length > 4096 ? value : changed;
    };
    const applyButtons = extra => transformExtra(extra, db.globalTextOverrides?.texts || [], db.globalTextOverrides?.buttons || []);

    ctx.reply = (text, extra) => originalReply(applyText(text), applyButtons(extra));
    ctx.editMessageText = (text, extra) => originalEditMessageText(applyText(text), applyButtons(extra));
    if (originalReplyWithPhoto) {
      ctx.replyWithPhoto = (photo, extra) => originalReplyWithPhoto(photo, applyButtons(extra));
    }
    await next();
  });
}

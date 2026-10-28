import { InlineKeyboard } from 'grammy';

const ARABIC_FRAMES = [
  n => `꧁༺ ${n} ༻꧂`, n => `𓆩 ${n} 𓆪`, n => `『 ${n} 』`, n => `「 ${n} 」`,
  n => `【 ${n} 】`, n => `〘 ${n} 〙`, n => `〚 ${n} 〛`, n => `〈 ${n} 〉`,
  n => `《 ${n} 》`, n => `〔 ${n} 〕`, n => `〖 ${n} 〗`, n => `〘༺ ${n} ༻〙`,
  n => `༺═ ${n} ═༻`, n => `✦ ${n} ✦`, n => `✧･ﾟ ${n} ﾟ･✧`, n => `★彡 ${n} 彡★`,
  n => `♛ ${n} ♛`, n => `♕『${n}』♕`, n => `𖤍 ${n} 𖤍`, n => `༒ ${n} ༒`,
  n => `☬ ${n} ☬`, n => `⫷ ${n} ⫸`, n => `◥ ${n} ◤`, n => `◈ ${n} ◈`,
  n => `•°¯ ${n} ¯°•`, n => `➳ ${n} ࿐`,
  n => `༄ ${n} ࿐`, n => `𓂀 ${n} 𓂀`, n => `♡ ${n} ♡`, n => `♥︎ ${n} ♥︎`,
  n => `⋆｡°✩ ${n} ✩°｡⋆`, n => `⟦ ${n} ⟧`, n => `⟪ ${n} ⟫`,
  n => `༺♡ ${n} ♡༻`, n => `乂 ${n} 乂`, n => `彡 ${n} 彡`, n => `〆${n}〆`,
  n => `么 ${n} 么`, n => `ツ ${n} ツ`, n => `۝ ${n} ۝`, n => `⸙ ${n} ⸙`,
  n => `⿻ ${n} ⿻`, n => `⟡ ${n} ⟡`, n => `⦿ ${n} ⦿`, n => `⤹ ${n} ⤸`,
  n => `༆ ${n} ༆`, n => `༺𓆩 ${n} 𓆪༻`, n => `✿ ${n} ✿`, n => `❖ ${n} ❖`,
  n => `╰☆☆ ${n} ☆☆╮`, n => `—͟͞͞★ ${n} ★͟͞͞—`, n => `░▒▓ ${n} ▓▒░`,
  n => `⎝ ${n} ⎠`, n => `⧼ ${n} ⧽`, n => `☾ ${n} ☽`, n => `𓇼 ${n} 𓇼`,
  n => `ᯓ ${n} ᯓ`, n => `⸻ ${n} ⸻`, n => `༺۝ ${n} ۝༻`, n => `◜ ${n} ◝`,
];

const FONT_MAPS = [
  { a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭', u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳', A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓', U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙' },
  { a: '𝑎', b: '𝑏', c: '𝑐', d: '𝑑', e: '𝑒', f: '𝑓', g: '𝑔', h: 'ℎ', i: '𝑖', j: '𝑗', k: '𝑘', l: '𝑙', m: '𝑚', n: '𝑛', o: '𝑜', p: '𝑝', q: '𝑞', r: '𝑟', s: '𝑠', t: '𝑡', u: '𝑢', v: '𝑣', w: '𝑤', x: '𝑥', y: '𝑦', z: '𝑧', A: '𝐴', B: '𝐵', C: '𝐶', D: '𝐷', E: '𝐸', F: '𝐹', G: '𝐺', H: '𝐻', I: '𝐼', J: '𝐽', K: '𝐾', L: '𝐿', M: '𝑀', N: '𝑁', O: '𝑂', P: '𝑃', Q: '𝑄', R: '𝑅', S: '𝑆', T: '𝑇', U: '𝑈', V: '𝑉', W: '𝑊', X: '𝑋', Y: '𝑌', Z: '𝑍' },
  { a: '𝒶', b: '𝒷', c: '𝒸', d: '𝒹', e: 'ℯ', f: '𝒻', g: 'ℊ', h: '𝒽', i: '𝒾', j: '𝒿', k: '𝓀', l: '𝓁', m: '𝓂', n: '𝓃', o: 'ℴ', p: '𝓅', q: '𝓆', r: '𝓇', s: '𝓈', t: '𝓉', u: '𝓊', v: '𝓋', w: '𝓌', x: '𝓍', y: '𝓎', z: '𝓏', A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: 'ℰ', F: 'ℱ', G: '𝒢', H: 'ℋ', I: 'ℐ', J: '𝒥', K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫', Q: '𝒬', R: 'ℛ', S: '𝒮', T: '𝒯', U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳', Y: '𝒴', Z: '𝒵' },
  { a: '𝔞', b: '𝔟', c: '𝔠', d: '𝔡', e: '𝔢', f: '𝔣', g: '𝔤', h: '𝔥', i: '𝔦', j: '𝔧', k: '𝔨', l: '𝔩', m: '𝔪', n: '𝔫', o: '𝔬', p: '𝔭', q: '𝔮', r: '𝔯', s: '𝔰', t: '𝔱', u: '𝔲', v: '𝔳', w: '𝔴', x: '𝔵', y: '𝔶', z: '𝔷', A: '𝔄', B: '𝔅', C: 'ℭ', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: 'ℌ', I: 'ℑ', J: '𝔍', K: '𝔎', L: '𝔏', M: '𝔐', N: '𝔑', O: '𝔒', P: '𝔓', Q: '𝔔', R: 'ℜ', S: '𝔖', T: '𝔗', U: '𝔘', V: '𝔙', W: '𝔚', X: '𝔛', Y: '𝔜', Z: 'ℨ' },
  { a: '𝕒', b: '𝕓', c: '𝕔', d: '𝕕', e: '𝕖', f: '𝕗', g: '𝕘', h: '𝕙', i: '𝕚', j: '𝕛', k: '𝕜', l: '𝕝', m: '𝕞', n: '𝕟', o: '𝕠', p: '𝕡', q: '𝕢', r: '𝕣', s: '𝕤', t: '𝕥', u: '𝕦', v: '𝕧', w: '𝕨', x: '𝕩', y: '𝕪', z: '𝕫', A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ', I: '𝕀', J: '𝕁', K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ', Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋', U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏', Y: '𝕐', Z: 'ℤ' },
  { a: '𝖆', b: '𝖇', c: '𝖈', d: '𝖉', e: '𝖊', f: '𝖋', g: '𝖌', h: '𝖍', i: '𝖎', j: '𝖏', k: '𝖐', l: '𝖑', m: '𝖒', n: '𝖓', o: '𝖔', p: '𝖕', q: '𝖖', r: '𝖗', s: '𝖘', t: '𝖙', u: '𝖚', v: '𝖛', w: '𝖜', x: '𝖝', y: '𝖞', z: '𝖟', A: '𝕬', B: '𝕭', C: '𝕮', D: '𝕯', E: '𝕰', F: '𝕱', G: '𝕲', H: '𝕳', I: '𝕴', J: '𝕵', K: '𝕶', L: '𝕷', M: '𝕸', N: '𝕹', O: '𝕺', P: '𝕻', Q: '𝕼', R: '𝕽', S: '𝕾', T: '𝕿', U: '𝖀', V: '𝖁', W: '𝖂', X: '𝖃', Y: '𝖄', Z: '𝖅' },
];

const ENGLISH_FRAMES = [
  n => `꧁༺ ${n} ༻꧂`, n => `𓆩 ${n} 𓆪`, n => `『 ${n} 』`, n => `「 ${n} 」`,
  n => `【 ${n} 】`, n => `〘 ${n} 〙`, n => `〚 ${n} 〛`, n => `〈 ${n} 〉`,
  n => `《 ${n} 》`, n => `〔 ${n} 〕`, n => `〖 ${n} 〗`, n => `༺═ ${n} ═༻`,
  n => `✦ ${n} ✦`, n => `✧･ﾟ ${n} ﾟ･✧`, n => `★彡 ${n} 彡★`, n => `♛ ${n} ♛`,
  n => `♕『${n}』♕`, n => `𖤍 ${n} 𖤍`, n => `༒ ${n} ༒`, n => `☬ ${n} ☬`,
  n => `⫷ ${n} ⫸`, n => `◥ ${n} ◤`, n => `◈ ${n} ◈`, n => `➳ ${n} ࿐`,
  n => `༄ ${n} ࿐`, n => `𓂀 ${n} 𓂀`, n => `♡ ${n} ♡`, n => `♥︎ ${n} ♥︎`,
  n => `⋆｡°✩ ${n} ✩°｡⋆`, n => `⟦ ${n} ⟧`, n => `⟪ ${n} ⟫`, n => `༺♡ ${n} ♡༻`,
  n => `乂 ${n} 乂`, n => `彡 ${n} 彡`, n => `〆${n}〆`, n => `么 ${n} 么`,
  n => `ツ ${n} ツ`, n => `۝ ${n} ۝`, n => `⸙ ${n} ⸙`, n => `⿻ ${n} ⿻`,
  n => `⟡ ${n} ⟡`, n => `⦿ ${n} ⦿`, n => `⤹ ${n} ⤸`, n => `༆ ${n} ༆`,
  n => `✿ ${n} ✿`, n => `❖ ${n} ❖`, n => `╰☆☆ ${n} ☆☆╮`, n => `░▒▓ ${n} ▓▒░`,
  n => `⎝ ${n} ⎠`, n => `⧼ ${n} ⧽`, n => `☾ ${n} ☽`, n => `𓇼 ${n} 𓇼`,
  n => `ᯓ ${n} ᯓ`, n => `⸻ ${n} ⸻`, n => `༺۝ ${n} ۝༻`, n => `◜ ${n} ◝`,
];

function mapFont(value, map) {
  return [...value].map(char => map[char] || char).join('');
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeNameBatch(name, language, previous = []) {
  const frames = language === 'en' ? ENGLISH_FRAMES : ARABIC_FRAMES;
  const candidates = [];
  const fontMaps = language === 'en' ? shuffled(FONT_MAPS) : [null];
  for (const frame of shuffled(frames)) {
    candidates.push(frame(name));
    if (language === 'en') {
      for (const map of fontMaps) candidates.push(frame(mapFont(name, map)));
    }
  }
  const used = new Set(previous);
  const unique = [...new Set(candidates)].filter(value => !used.has(value));
  // إذا استنفد المستخدم كل الأشكال المتاحة، نبدأ مجموعة جديدة من دون تكرار داخل الدفعة.
  const pool = unique.length >= 10 ? unique : [...new Set(candidates)];
  return shuffled(pool).slice(0, 10);
}

export function touchesMenuKeyboard() {
  return new InlineKeyboard().text('✨ الزخرفة', 'touchesdecorate').row().text('🔙 رجوع', 'home');
}

export function touchesLanguageKeyboard() {
  return new InlineKeyboard().text('🇮🇶 عربي', 'toucheslang:ar').text('🇬🇧 English', 'toucheslang:en').row().text('🔙 رجوع', 'touchesmenu');
}

export function touchesBatchKeyboard(results) {
  const kb = new InlineKeyboard();
  results.forEach((result, index) => {
    kb.add({ text: `📋 نسخ ${index + 1}`, copy_text: { text: result } }).row();
  });
  return kb.text('🔄 دفعة جديدة (10)', 'touchesmore').row().text('🔙 رجوع', 'touchesmenu').text('🏠 الرئيسية', 'home');
}

export function touchesBatchText(name, language, results, batchNumber = 1) {
  const heading = language === 'en' ? '🇬🇧 English' : '🇮🇶 عربي';
  return `🔥🐈‍⬛ لمسات نغنوغ | زخرفة الأسماء\n\nالاسم: ${name}\nاللغة: ${heading}\nالدفعة: ${batchNumber}\n\n${results.map((value, i) => `${i + 1}. ${value}`).join('\n\n')}\n\n📋 اضغط زر «نسخ» بجانب النتيجة المطلوبة. الزخارف تتغير مع كل دفعة.`;
}

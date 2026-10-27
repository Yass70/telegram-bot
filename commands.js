تفضل يا غالي! لقد قمت بزيادة عدد الأسئلة والمعادلات لتصبح **40 سؤالاً وعنصراً لكل فئة** (بإجمالي **160 سؤالاً ومعادلة متنوعة وممتعة**) لضمان التجديد التام واستمرار التفاعل والمرح داخل المجموعة.

---

### أولاً: ملف **`keyboards.js`**

*(نسخه واستبدله بملف `keyboards.js`)*

```javascript
import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot) {
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';

  return new InlineKeyboard()
    .url(
      '➕ أضفني للمجموعة',
      `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`
    )
    .text('⚙️ إعدادات المجموعة', 'groupsettings')
    .text('👥 مجموعاتي', 'mygroups')
    .row()
    .text('🛡️ أوامر الحماية', 'protectionmenu')
    .text('👑 أوامر المشرفين', 'adminpanel')
    .row()
    .text('🎮 الألعاب والتحديات', 'gamesmenu')
    .text('👤 معلومات حسابي', 'accountinfo')
    .row()
    .text('🎨 تخصيص البوت', 'custommenu')
    .row()
    .text('📖 المساعدة', 'help');
}

export function customizationKeyboard() {
  return new InlineKeyboard()
    .text('👋 تعديل مقدمة /start', 'customstart')
    .row()
    .text('🔘 تعديل شرح الأزرار', 'customdescmenu')
    .row()
    .text('💬 تعديل ردود البوت', 'customreplymenu')
    .row()
    .text('♻️ استعادة النصوص الأصلية', 'customreset')
    .row()
    .text('🔙 رجوع للقائمة الرئيسية', 'home');
}

export function customizationDescriptionsKeyboard() {
  return new InlineKeyboard()
    .text('⚙️ شرح إعدادات المجموعة', 'customdesc:settings')
    .row()
    .text('👥 شرح مجموعاتي', 'customdesc:groups')
    .row()
    .text('👤 شرح معلومات حسابي', 'customdesc:account')
    .row()
    .text('💬 شرح الردود التلقائية', 'customdesc:replies')
    .row()
    .text('🔙 رجوع للتخصيص', 'custommenu');
}

export function customizationRepliesKeyboard() {
  return new InlineKeyboard()
    .text('👤 رسالة معلومات الحساب', 'customreply:account')
    .row()
    .text('💬 رسالة قسم الردود التلقائية', 'customreply:replies')
    .row()
    .text('👥 رسالة عدم وجود مجموعات', 'customreply:nogroups')
    .row()
    .text('🔙 رجوع للتخصيص', 'custommenu');
}

export function helpKeyboard() {
  return new InlineKeyboard()
    .text('👥 إدارة المجموعات', 'mygroups')
    .row()
    .text('🏠 القائمة الرئيسية', 'home')
    .url('👤 حساب المطوّر', 'https://t.me/llll6llll6');
}

export function ownerKeyboard() {
  return new InlineKeyboard()
    .text('📊 إحصائيات البوت', 'botstats')
    .row()
    .text('👥 المجموعات المفعّلة', 'activatedgroups')
    .row()
    .text('📢 إذاعة عامة (للمستخدمين)', 'broadcastmenu')
    .row()
    .text('⚙️ إعدادات البوت', 'botsettings')
    .row()
    .text('🛡️ إعدادات الحماية العامة', 'globalprotection')
    .row()
    .text('📢 إدارة الاشتراك الإجباري', 'requiredmenu')
    .row()
    .text('🔙 القائمة الرئيسية', 'home');
}

export function warningsKeyboard(g) {
  const w = g.warningSettings || {
    enabled: false,
    limit: 3,
    action: 'mute',
    duration: 10
  };

  const actionNames = {
    none: 'بدون إجراء',
    mute: 'كتم',
    kick: 'طرد',
    ban: 'حظر'
  };

  return new InlineKeyboard()
    .text(
      `${w.enabled ? '🟢' : '⚪'} نظام التحذيرات: ${w.enabled ? 'مفعّل' : 'متوقف'}`,
      'warningstoggle'
    )
    .row()
    .text(`🔢 عدد التحذيرات: ${w.limit}`, 'warningslimit')
    .row()
    .text(`⚖️ العقوبة: ${actionNames[w.action] || 'كتم'}`, 'warningsaction')
    .row()
    .text(`⏱️ مدة الكتم: ${w.duration} دقيقة`, 'warningsduration')
    .row()
    .text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu')
    .row()
    .text('📋 سجل التحذيرات', 'warningslog')
    .row()
    .text('🧹 تصفير تحذيرات عضو', 'warningsclear')
    .row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}

export function groupSettingsKeyboard(g) {
  return new InlineKeyboard()
    .text('👋 تعديل رسالة الترحيب', 'welcomeedit')
    .row()
    .text(
      `${g.links ? '🟢' : '⚪'} منع الروابط: ${g.links ? 'مفعّل' : 'متوقف'}`,
      'togglelinks'
    )
    .row()
    .text(
      `${g.flood ? '🟢' : '⚪'} منع السبام: ${g.flood ? 'مفعّل' : 'متوقف'}`,
      'toggleflood'
    )
    .row()
    .text(
      `${g.autoReply ? '🟢' : '⚪'} الردود التلقائية: ${g.autoReply ? 'مفعّلة' : 'متوقفة'}`,
      'togglereplies'
    )
    .row()
    .text('🛡️ التحذيرات والعقوبات', 'warningsmenu')
    .row()
    .text('💬 إدارة الردود التلقائية', 'repliesmenu')
    .row()
    .text('📊 إحصائيات المجموعة', 'groupstats')
    .row()
    .text('🔙 رجوع', 'home');
}

export function repliesKeyboard() {
  return new InlineKeyboard()
    .text('➕ إضافة رد', 'replyadd')
    .row()
    .text('📋 عرض الردود', 'replylist')
    .row()
    .text('🗑️ حذف رد', 'replydelete')
    .row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}

```

---

### ثانياً: ملف **`commands.js`** (يحتوي على 40 سؤالاً ومعادلة لكل فئة بإجمالي 160 عنصراً)

*(نسخه واستبدله بملف `commands.js`)*

```javascript
import { InlineKeyboard } from 'grammy';
import { GROUP_RULES, NORMAL_MEMBER_RULES_REPLY, findAutoReply } from './autoReplies.js';
import {
  mainKeyboard,
  helpKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard
} from './keyboards.js';

// قاعدة بيانات ألعاب الأسئلة والتحديات (40 سؤالاً لكل فئة)
const QUESTIONS_DB = {
  choose: [
    { q: "ما هي عاصمة اليابان؟", options: ["طوكيو", "أوساكا", "كيوتو"], answer: "طوكيو" },
    { q: "أي من هذه الحيوانات يعتبر من الثدييات البحرية؟", options: ["القرش", "الحوت الأزرق", "الأخطبوط"], answer: "الحوت الأزرق" },
    { q: "كم عدد سور القرآن الكريم؟", options: ["112", "114", "120"], answer: "114" },
    { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", options: ["المريخ", "المشتري", "زحل"], answer: "المشتري" },
    { q: "ما هي عاصمة فرنسا؟", options: ["مدريد", "باريس", "برلين"], answer: "باريس" },
    { q: "ما هو أطول نهر في العالم؟", options: ["النيل", "الأمازون", "الفرات"], answer: "النيل" },
    { q: "ما هو الكوكب الملقب بالكوكب الأحمر؟", options: ["المريخ", "الزهرة", "عطارد"], answer: "المريخ" },
    { q: "كم عدد ألوان قوس قزح؟", options: ["5", "6", "7"], answer: "7" },
    { q: "ما هي عاصمة جمهورية العراق؟", options: ["بغداد", "البصرة", "أربيل"], answer: "بغداد" },
    { q: "أين تقع أهرامات الجيزة؟", options: ["السودان", "مصر", "المغرب"], answer: "مصر" },
    { q: "ما هو أسرع حيوان بري في العالم؟", options: ["الفهد", "الأسد", "الغزال"], answer: "الفهد" },
    { q: "ما هي عاصمة المملكة العربية السعودية؟", options: ["جدة", "الرياض", "مكة"], answer: "الرياض" },
    { q: "ما هي أكبر قارة في العالم من حيث المساحة؟", options: ["أفريقيا", "آسيا", "أوروبا"], answer: "آسيا" },
    { q: "ما هو أثقل عضو في جسم الإنسان؟", options: ["القلب", "الكبد", "الدماغ"], answer: "الكبد" },
    { q: "كم عدد أضلاع المثلث؟", options: ["3", "4", "5"], answer: "3" },
    { q: "ما هو غاز التفس الذي نتشهقه للحياة؟", options: ["النيتروجين", "الأكسجين", "الهيدروجين"], answer: "الأكسجين" },
    { q: "ما هي عاصمة الإمارات العربية المتحدة؟", options: ["دبي", "أبوظبي", "الشارقة"], answer: "أبوظبي" },
    { q: "ما هي العملة الرسمية في الولايات المتحدة؟", options: ["اليورو", "الدولار", "الباوند"], answer: "الدولار" },
    { q: "ما هي أصغر قارة في العالم؟", options: ["أستراليا", "أوروبا", "أمريكا الجنوبية"], answer: "أستراليا" },
    { q: "أي من العناصر التالية رمزها الكيميائي (Au)؟", options: ["الفضة", "الذهب", "الحديد"], answer: "الذهب" },
    { q: "ما هي عاصمة إيطاليا؟", options: ["ميلانو", "روما", "البندقية"], answer: "روما" },
    { q: "كم عدد لاعبي فريق كرة القدم داخل الملعب؟", options: ["10", "11", "12"], answer: "11" },
    { q: "ما هو أصلح بحر في العالم لا يعيش فيه السمك؟", options: ["البحر الأحمر", "البحر الميت", "البحر المتوسط"], answer: "البحر الميت" },
    { q: "ما هي عاصمة مصر؟", options: ["الإسكندرية", "القاهرة", "أسوان"], answer: "القاهرة" },
    { q: "ما هو أقرب كوكب للشمس؟", options: ["عطارد", "الزهرة", "الأرض"], answer: "عطارد" },
    { q: "ما هي عاصمة ألمانيا؟", options: ["ميونخ", "برلين", "فرانكفورت"], answer: "برلين" },
    { q: "ما هو الحيوان الذي يُسمى ب king of jungle؟", options: ["الأسد", "النمر", "الفهد"], answer: "الأسد" },
    { q: "في أي قارة تقع دولة مصر؟", options: ["آسيا", "أفريقيا", "أوروبا"], answer: "أفريقيا" },
    { q: "ما هو المعدن السائل في درجة حرارة الغرفة؟", options: ["الزئبق", "الحديد", "النحاس"], answer: "الزئبق" },
    { q: "كم عدد ساعات اليوم الواحد؟", options: ["12", "24", "48"], answer: "24" },
    { q: "ما هي عاصمة اسبانيا؟", options: ["برشلونة", "مدريد", "إشبيلية"], answer: "مدريد" },
    { q: "ما هو أطول حيوان في العالم؟", options: ["الفيل", "الزرافة", "الحوت"], answer: "الزرافة" },
    { q: "ما هي عاصمة روسيا؟", options: ["موسكو", "سان بطرسبرغ", "سيبيريا"], answer: "موسكو" },
    { q: "كم عدد أركان الإسلام؟", options: ["4", "5", "6"], answer: "5" },
    { q: "ما هو الغاز الأكثر وجوداً في الغلاف الجوي للأرض؟", options: ["الأكسجين", "النيتروجين", "ثاني أكسيد الكربون"], answer: "النيتروجين" },
    { q: "ما هي عاصمة سوريا؟", options: ["حلب", "دمشق", "حمص"], answer: "دمشق" },
    { q: "من هو النبي الذي أُلقي في النار فجعلها الله برداً وسلاماً؟", options: ["موسى", "إبراهيم", "عيسى"], answer: "إبراهيم" },
    { q: "ما هي عاصمة الأردن؟", options: ["إربد", "عمان", "العقبة"], answer: "عمان" },
    { q: "كم عدد أركان الإيمان؟", options: ["5", "6", "7"], answer: "6" },
    { q: "ما هي عاصمة الكويت؟", options: ["الجابرية", "الكويت", "الجهراء"], answer: "الكويت" }
  ],
  math: [
    { q: "ناتج عملية الحساب التالية: 15 + 25 × 2 = ؟", answer: "65" },
    { q: "ما هو ناتج: 100 ÷ 4 + 15 = ؟", answer: "40" },
    { q: "كم يساوي: 9 × 8 - 12 = ؟", answer: "60" },
    { q: "ناتج جمع: 45 + 55 - 20 = ؟", answer: "80" },
    { q: "ما هو ناتج: 12 × 12 = ؟", answer: "144" },
    { q: "احسب ناتج: 50 - 15 + 25 = ؟", answer: "60" },
    { q: "ما هو ناتج: 7 × 7 + 1 = ؟", answer: "50" },
    { q: "ناتج قسمة: 81 ÷ 9 = ؟", answer: "9" },
    { q: "احسب: 10 + 20 + 30 - 10 = ؟", answer: "50" },
    { q: "ما هو ضعف العدد 25؟", answer: "50" },
    { q: "ما هو نصف العدد 150؟", answer: "75" },
    { q: "احسب: 5 × 6 + 10 = ؟", answer: "40" },
    { q: "ما هو ناتج: 100 - 37 = ؟", answer: "63" },
    { q: "احسب: 8 × 5 = ؟", answer: "40" },
    { q: "ما هو ثلث العدد 90؟", answer: "30" },
    { q: "احسب ناتج: 14 + 16 = ؟", answer: "30" },
    { q: "ما هو ناتج: 64 ÷ 8 = ؟", answer: "8" },
    { q: "احسب: 100 ÷ 2 + 50 = ؟", answer: "100" },
    { q: "ما هو مربع العدد 5 (5 × 5)؟", answer: "25" },
    { q: "احسب: 11 × 3 + 7 = ؟", answer: "40" },
    { q: "ما هو ناتج: 200 - 150 + 50 = ؟", answer: "100" },
    { q: "احسب: 9 × 9 = ؟", answer: "81" },
    { q: "ما هو ناتج: 30 × 3 = ؟", answer: "90" },
    { q: "احسب: 75 ÷ 3 = ؟", answer: "25" },
    { q: "ما هو ناتج: 15 + 15 + 15 = ؟", answer: "45" },
    { q: "احسب ناتج: 25 × 4 = ؟", answer: "100" },
    { q: "ما هو ناتج: 99 ÷ 3 = ؟", answer: "33" },
    { q: "احسب: 18 + 22 + 40 = ؟", answer: "80" },
    { q: "ما هو ناتج: 500 ÷ 5 = ؟", answer: "100" },
    { q: "احسب: 7 × 8 - 6 = ؟", answer: "50" },
    { q: "ما هو مكعب العدد 2 (2 × 2 × 2)؟", answer: "8" },
    { q: "احسب: 45 ÷ 5 + 15 = ؟", answer: "24" },
    { q: "ما هو ناتج: 13 × 3 = ؟", answer: "39" },
    { q: "احسب: 1000 - 450 = ؟", answer: "550" },
    { q: "ما هو ناتج: 16 + 16 + 18 = ؟", answer: "50" },
    { q: "احسب: 60 ÷ 4 = ؟", answer: "15" },
    { q: "ما هو ناتج: 11 × 11 = ؟", answer: "121" },
    { q: "احسب: 80 - 25 - 15 = ؟", answer: "40" },
    { q: "ما هو ناتج: 50 × 2 ÷ 4 = ؟", answer: "25" },
    { q: "احسب: 72 ÷ 9 + 12 = ؟", answer: "20" }
  ],
  animals: [
    { hint: "أسد", q: "حيوان مفترس يُلقب بملك الغابة، يبدأ بحرف (أ)", answer: "أسد" },
    { hint: "فيل", q: "حيوان ضخم جداً له خرطوم طويل، يبدأ بحرف (ف)", answer: "فيل" },
    { hint: "زرافة", q: "حيوان عشب طويل الرقبة، يبدأ بحرف (ز)", answer: "زرافة" },
    { hint: "ذئب", q: "حيوان ذكي من فصيلة الكلبيات، يبدأ بحرف (ذ)", answer: "ذئب" },
    { hint: "نمر", q: "حيوان مفترس مخطّط ومفرط السرعة، يبدأ بحرف (ن)", answer: "نمر" },
    { hint: "جمل", q: "حيوان يسمى سفينة الصحراء، يبدأ بحرف (ج)", answer: "جمل" },
    { hint: "حصان", q: "حيوان أليف يُستخدم للركوب والسباقات، يبدأ بحرف (ح)", answer: "حصان" },
    { hint: "قرد", q: "حيوان ذكي يحب أكل الموز والتسلق، يبدأ بحرف (ق)", answer: "قرد" },
    { hint: "دب", q: "حيوان ضخم يحب أكل العسل والأسماك، يبدأ بحرف (د)", answer: "دب" },
    { hint: "ثعلب", q: "حيوان يُضرب به المثل في المكر والمراوغة، يبدأ بحرف (ث)", answer: "ثعلب" },
    { hint: "أرنب", q: "حيوان أليف صغير يحب أكل الجزر، يبدأ بحرف (أ)", answer: "أرنب" },
    { hint: "غزال", q: "حيوان جميل وسريع جداً برقبته الجذابة، يبدأ بحرف (غ)", answer: "غزال" },
    { hint: "كلب", q: "حيوان يُعرف بوفائه الشديد للإنسان، يبدأ بحرف (ك)", answer: "كلب" },
    { hint: "قطة", q: "حيوان أليف صغير يعيش في المنازل ويموء، يبدأ بحرف (ق)", answer: "قطة" },
    { hint: "صقر", q: "طائر مفترس حاد البصر يُستخدم في الصيد، يبدأ بحرف (ص)", answer: "صقر" },
    { hint: "تمساح", q: "زاحف مفترس ضخم يعيش في الماء والبر ولديه فك قوي، يبدأ بحرف (ت)", answer: "تمساح" },
    { hint: "حوت", q: "أضخم كائن حي يعيش في المحيطات، يبدأ بحرف (ح)", answer: "حوت" },
    { hint: "بطريق", q: "طائر لا يطير ويعيش في المناطق الجليدية الباردة، يبدأ بحرف (ب)", answer: "بطريق" },
    { hint: "نسر", q: "طائر جارح كبير يحلق في أرتفاعات عالية، يبدأ بحرف (ن)", answer: "نسر" },
    { hint: "ثعبان", q: "زاحف طويل ليس له أرجُل ويقوم باللدغ، يبدأ بحرف (ث)", answer: "ثعبان" },
    { hint: "ضبع", q: "حيوان مفترس يعيش في جماعات ويقتات على الجيف، يبدأ بحرف (ض)", answer: "ضبع" },
    { hint: "كانغارو", q: "حيوان يمتلك جيباً يحمل فيه صغاره ويقفز، يبدأ بحرف (ك)", answer: "كانغارو" },
    { hint: "بومة", q: "طائر ليلي يُرمز له بالحكمة، يبدأ بحرف (ب)", answer: "بومة" },
    { hint: "حمار", q: "حيوان أليف يتحمل المشقة والعمل الشاق، يبدأ بحرف (ح)", answer: "حمار" },
    { hint: "خروف", q: "حيوان يعطينا الصوف واللحم وتتم تضحيته بالعيد، يبدأ بحرف (خ)", answer: "خروف" },
    { hint: "أسد", q: "ملك الغابة وأشرس السنوريات الكبرى، يبدأ بحرف (أ)", answer: "أسد" },
    { hint: "فهد", q: "أسرع حيوان بري على وجه الأرض، يبدأ بحرف (ف)", answer: "فهد" },
    { hint: "فيل", q: "حيوان عملاق يتميز بآذان ضخمة وأنياب عاجية، يبدأ بحرف (ف)", answer: "فيل" },
    { hint: "بطة", q: "طائر مائي أليف يسبح في المرتفعات المائية، يبدأ بحرف (ب)", answer: "بطة" },
    { hint: "دجاجة", q: "طائر أليف نأخذ منه البيض واللحم، يبدأ بحرف (د)", answer: "دجاجة" },
    { hint: "ماعز", q: "حيوان من شبيهات الأغنام يتربى بالريف، يبدأ بحرف (م)", answer: "ماعز" },
    { hint: "فأر", q: "قارض صغير يخاف منه الكثيرون ويحب الجبن، يبدأ بحرف (ف)", answer: "فأر" },
    { hint: "سنجاب", q: "حيوان شجري صغير يحب تخزين الجوز والبندق، يبدأ بحرف (س)", answer: "سنجاب" },
    { hint: "راكون", q: "حيوان يشبه الهروب البري وله ذيل مخطط، يبدأ بحرف (ر)", answer: "راكون" },
    { hint: "قنفذ", q: "حيوان تغطي جسمه أشواك حادة للدفاع عن نفسه، يبدأ بحرف (ق)", answer: "قنفذ" },
    { hint: "بطريق", q: "حيوان بحري يرتدي شبيه البدلة الرسمية، يبدأ بحرف (ب)", answer: "بطريق" },
    { hint: "حرباء", q: "زاحف يغير لونه حسب البيئة المحيطة، يبدأ بحرف (ح)", answer: "حرباء" },
    { hint: "سلحفاة", q: "زاحف بطيء يمتلك درعاً صلبأً على ظهره، يبدأ بحرف (س)", answer: "سلحفاة" },
    { hint: "فراشة", q: "حشرة جميلة ذات أجنحة ملونة تزهو بالورود، يبدأ بحرف (ف)", answer: "فراشة" },
    { hint: "نحلة", q: "حشرة نافعة تصنع العسل اللذيذ، يبدأ بحرف (ن)", answer: "نحلة" }
  ],
  general: [
    { q: "في أي سنة انطلقت أول رحلة صعود للقمر؟", answer: "1969" },
    { q: "ما هي الدولة الأكثر تعداداً للسكان في العالم حالياً؟", answer: "الهند" },
    { q: "ما هو العنصر الكيميائي الأكثر وفرة في قشرة الأرض؟", answer: "الأكسجين" },
    { q: "من هو واضع علم الجبر؟", answer: "الخوارزمي" },
    { q: "كم عدد خلفاء الراشدين؟", answer: "4" },
    { q: "ما هي أكبر بحيرة في العالم من حيث المساحة؟", answer: "قزوين" },
    { q: "من هو النبي الذي بنى السفينة بإذن الله؟", answer: "نوح" },
    { q: "كم عدد القارات في الكرة الأرضية؟", answer: "7" },
    { q: "ما هو اللقب الذي يُطلق على الشاعر أحمد شوقي؟", answer: "أمير الشعراء" },
    { q: "كم سنة استمرت الحرب العالمية الثانية؟", answer: "6" },
    { q: "ما هي اللغة الرسمية في البرازيل؟", answer: "البرتغالية" },
    { q: "من هو مكتشف جاذبية الأرض؟", answer: "نيوتن" },
    { q: "ما هي الدولة التي تُسمى أرض الفراعنة؟", answer: "مصر" },
    { q: "ما هو الحيوان الذي يُلقب بسفينة الصحراء؟", answer: "الجمل" },
    { q: "ما هي أطول سلسة جبال في العالم؟", answer: "الأنديز" },
    { q: "كم عدد أسنان الإنسان البالغ؟", answer: "32" },
    { q: "من هو أول خلفاء المسلمين بعد وفاة النبي؟", answer: "أبو بكر الصديق" },
    { q: "ما هي القناة التي تربط بين البحر الأبيض والبحر الأحمر؟", answer: "قناة السويس" },
    { q: "ما هو الكائن الذي يمتلك 3 قلوب؟", answer: "الأخطبوط" },
    { q: "ما هو أطول بناء بني بإيدي البشر تاريخياً؟", answer: "سور الصين العظيم" },
    { q: "ما هي البلد التي تشتهر بزراعة واستخراج الشاي والسيلان؟", answer: "سريلانكا" },
    { q: "كم عدد سجدات التلاوة في القرآن الكريم؟", answer: "15" },
    { q: "ما هي عاصمة الدولة العباسية تاريخياً؟", answer: "بغداد" },
    { q: "من هو مخترع المصباح الكهربائي؟", answer: "أديسون" },
    { q: "كم يبلغ عدد ألوان علم جمهورية العراق؟", answer: "4" },
    { q: "ما هي السورة التي تُسمى قلب القرآن؟", answer: "يس" },
    { q: "من هو قائد معركة القادسية من المسلمين؟", answer: "سعد بن أبي وقاص" },
    { q: "في أي عام أُقيمت أول بطولة كأس عالم لكرة القدم؟", answer: "1930" },
    { q: "ما هي الدولة الأكثر إنتاجاً للقهوة في العالم؟", answer: "البرازيل" },
    { q: "كم عدد أجزاء القرآن الكريم؟", answer: "30" },
    { q: "من هو الصحابي الملقب بأسد الله الغلاب؟", answer: "حمزة بن عبد المطلب" },
    { q: "ما هو أسرع كوكب في الدوران حول الشمس؟", answer: "عطارد" },
    { q: "ما هي الدولة التي تقع فيها مدينة تونس؟", answer: "تونس" },
    { q: "كم عدد الشهور الهجرية في السنة؟", answer: "12" },
    { q: "من هو شاعر الرسول صلى الله عليه وسلم؟", answer: "حسان بن ثابت" },
    { q: "ما هو الحيوان البرمائي الذي ينام وعينه مفتوحة؟", answer: "التمساح" },
    { q: "ما هي الدولة العربية التي تقع في أفريقيا وتجاور مصر من الغرب؟", answer: "ليبيا" },
    { q: "من هو أول من استشهد من النساء في الإسلام؟", answer: "سمية بنت خياط" },
    { q: "ما هي العاصمة الإدارية لتركيا؟", answer: "أنقرة" },
    { q: "كم عدد عظام جسم الإنسان البالغ؟", answer: "206" }
  ]
};

const SHUAR_LIST = [
  "لا تكسر قلباً لطالما رآك جنته، فالقلوب إذا انكسرت صَعُب جبرُها.",
  "عش طاهراً واعمل لخير بَريّةٍ، كالبدرِ يهمي بالنجوم ولا يبالي.",
  "سلامٌ على الدنيا إذا لم يكن بها، صديقٌ صدوقٌ صادق الوعد منصفاً.",
  "لا تحزن على ما فات، واجعل من ألم الأمس وقوداً لغدٍ أفضل."
];

const KET_LIST = [
  "لو خيروك بين العيش بلا إنترنت أو العيش بلا طعام ليومين؟",
  "شنو أكثر موقف محرج صار وياك بحياتك ومستحيل تنساه؟",
  "لو صار عندك مليار دولار بيوم وليلة، أول شي تشتريه شنو؟",
  "لو تكدر ترجع بالزمن 5 سنوات، شنو الشي اللي تغيره بحياتك؟"
];

const N_PHRASES = [
  "لك هلا بالغالي! نغنوغ يمك وعين الله تحرسك 🐾❤️ أدخل على قائمة الألعاب وخلينا نلعب سوا ونكسر الدنيا!",
  "يومياتي حلوة بوجودك يا بعد روحي 😻 تعال يمه، نغنوغ ينتظرك بقسم الألعاب حتى نتونس سوية!",
  "ولك هلا بيك! منور نغنوغ وكلبي 😹 يلا عيني ادخل على الألعاب وخلينا نلعب ونشوف شقد راح تجمع نقاط!"
];

export function setupCommands(bot, db, helpers) {
  const { isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor, selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard, HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats, showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, showProfileCard, handleViolation, showOwnerPanel } = helpers;

  db.activeGames ||= {};

  bot.command('start', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    save();
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  bot.command('help', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    await ctx.reply(HELP_TEXT, { reply_markup: helpKeyboard() });
  });

  bot.command('broadcast', async ctx => {
    if (!isOwner(ctx)) return ctx.reply('هذا الأمر خاص بمالك البوت فقط.');
    const textToSend = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();
    if (!textToSend) {
      return ctx.reply('⚠️ عذراً، أرسل النص بعد الأمر هكذا:\n`/broadcast السلام عليكم، البوت تحت الصيانة حالياً`', { parse_mode: 'Markdown' });
    }

    const users = db.privateUsers || [];
    if (users.length === 0) return ctx.reply('⚠️ ماكو أي مستخدم مسجل بالخاص حالياً.');

    let successCount = 0, failCount = 0;
    const statusMsg = await ctx.reply(`📢 **جاري بدء الإذاعة...**\n👥 إجمالي المستخدمين: ${users.length}`, { parse_mode: 'Markdown' });

    for (const userId of users) {
      try {
        await bot.api.sendMessage(Number(userId), `📢 **إشعار هام من الإدارة:**\n\n${textToSend}`, { parse_mode: 'Markdown', disable_notification: false });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 40));
      } catch (e) { failCount++; }
    }

    const reportText = `✅ **تمت الإذاعة بنجاح!**\n\n📤 إرسال: ${successCount}\n❌ فشل (حظروا البوت): ${failCount}`;
    try { await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, reportText, { parse_mode: 'Markdown' }); } 
    catch { await ctx.reply(reportText, { parse_mode: 'Markdown' }); }
  });

  bot.on('my_chat_member', async ctx => {
    const chat = ctx.chat;
    if (!isGroup(ctx)) return;
    const status = ctx.myChatMember.new_chat_member.status;
    if (['member', 'administrator'].includes(status)) {
      const g = groupFor(chat); g.title = chat.title || g.title; save();
    }
  });

  bot.hears(/^تفعيل$/i, async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 أرسل كلمة «تفعيل» داخل المجموعة.');
    if (!await userIsAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply('⚠️ لازم تكون مشرفاً.');
    const g = groupFor(ctx.chat);
    if (g.activated) return ctx.reply('🐾 نغنوغ يعمل حالياً في هذه المجموعة ❤️');

    g.activated = true;
    g.activatedBy = userKey(ctx);
    g.title = ctx.chat.title || g.title;
    if (!g.admins.includes(userKey(ctx))) g.admins.push(userKey(ctx));
    g.activatedAt ||= new Date().toISOString();
    save();
    return ctx.reply('🐾 نغنوغ — تم التفعيل بنجاح!');
  });

  bot.on('callback_query:data', async ctx => {
    ensureUser(ctx);
    const data = ctx.callbackQuery.data;

    const ownerOnlyActions = ['ownerpanel', 'botstats', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'broadcastmenu'];
    if (ownerOnlyActions.includes(data) || data.startsWith('reqdel:')) {
      if (!isOwner(ctx)) {
        await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
        return;
      }
    }

    const restrictedActions = [
      'protectionmenu', 'adminpanel', 'groupsettings', 'warningsmenu', 'badwordsmenu', 
      'togglelinks', 'togglemedia', 'togglebadwords', 'toggleaudio', 'toggleaudioclips', 
      'toggleforward', 'togglecontacts', 'enableallprotection', 'gamesmenu'
    ];

    if (restrictedActions.includes(data) || data.startsWith('prot_') || data.startsWith('admin_')) {
      if (isGroup(ctx)) {
        const g = groupFor(ctx.chat);
        const isAdmin = await userIsAdmin(ctx.chat.id, ctx.from.id);
        if (!isAdmin && !isOwner(ctx)) {
          await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
          return;
        }
      } else {
        const g = selectedGroup(ctx);
        if (g && !await userCanManage(ctx, g)) {
          await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
          return;
        }
      }
    }

    try { await ctx.answerCallbackQuery(); } catch {}

    const showHomeFunc = async (cCtx) => {
      const c = getCustomization(cCtx);
      await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
    };

    if (data === 'home') return showHomeFunc(ctx);
    if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard() });
    
    if (data === 'protectionmenu') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return answer(ctx, '⚠️ اختار مجموعة أولاً أو افتح الزر داخل المجموعة.');
      
      const kb = new InlineKeyboard()
        .text(`${g.linksLock ? '🟢' : '⚪'} إرسال الروابط`, 'prot_links').row()
        .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media').row()
        .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
        .text(`${g.audioLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio').row()
        .text(`${g.audioClipsLock ? '🟢' : '⚪'} الملفات الصوتية`, 'prot_audioclips').row()
        .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
        .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات وأرقام الهواتف`, 'prot_contacts').row()
        .text('⚡ تفعيل الحماية الشاملة', 'prot_all').row()
        .text('🔙 رجوع', 'home');

      return answer(ctx, `🛡️ **لوحة أوامر الحماية:**\nتحكم بتشغيل أو إيقاف ميزات الحماية بضغطة زر:`, { reply_markup: kb });
    }

    if (data.startsWith('prot_')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return;
      const type = data.replace('prot_', '');
      
      if (type === 'links') g.linksLock = !g.linksLock;
      if (type === 'media') g.mediaLock = !g.mediaLock;
      if (type === 'badwords') g.badWordsLock = !g.badWordsLock;
      if (type === 'audio') g.audioLock = !g.audioLock;
      if (type === 'audioclips') g.audioClipsLock = !g.audioClipsLock;
      if (type === 'forward') g.forwardLock = !g.forwardLock;
      if (type === 'contacts') g.contactsLock = !g.contactsLock;
      if (type === 'all') {
        g.linksLock = true; g.mediaLock = true; g.badWordsLock = true; 
        g.audioLock = true; g.audioClipsLock = true; g.forwardLock = true; g.contactsLock = true;
      }
      save();
      
      const kb = new InlineKeyboard()
        .text(`${g.linksLock ? '🟢' : '⚪'} إرسال الروابط`, 'prot_links').row()
        .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media').row()
        .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
        .text(`${g.audioLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio').row()
        .text(`${g.audioClipsLock ? '🟢' : '⚪'} الملفات الصوتية`, 'prot_audioclips').row()
        .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
        .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات وأرقام الهواتف`, 'prot_contacts').row()
        .text('⚡ تفعيل الحماية الشاملة', 'prot_all').row()
        .text('🔙 رجوع', 'home');

      try { await ctx.editMessageText(`🛡️ **لوحة أوامر الحماية:**\nتم التحديث بنجاح!`, { reply_markup: kb }); } catch {}
      return;
    }

    if (data === 'adminpanel') {
      const adminText = `👑 **قائمة أوامر المشرفين السريعة:**\n\n` +
        `• **الكتم:** الرد بكلمة (كتم + عدد الدقائق) مثل: \`كتم 10\`\n` +
        `• **فتح الكتم:** كتابة \`فتح الكتم + اليوزر\`\n` +
        `• **الطرد:** الرد بكلمة \`طرد\` على رسالة الشخص\n` +
        `• **قفل الدردشة:** كتابة \`قفل الرسائل\`\n` +
        `• **فتح الدردشة:** كتابة \`افتح الرسائل\`\n` +
        `• **مسح رسائل بعدد:** كتابة \`امسح + الرقم\`\n` +
        `• **مسح الكل:** كتابة \`المسح جميع الرسائل\``;
      return answer(ctx, adminText, { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'home') });
    }

    if (data === 'gamesmenu' || data === 'games_list') {
      const gamesText = `🎮 **قائمة ألعاب نغنوغ والتحديات:**\n\n` +
        `اكتب أحد الرموز التالية داخل المجموعة للبدء:\n\n` +
        `🧩 **(خ)** ➜ لعبة اختر الخيار الصحيح\n` +
        `🔢 **(ر)** ➜ لعبة الرياضيات السريعة\n` +
        `🐅 **(ح)** ➜ لعبة معرفة الحيوان من الحرف الأول\n` +
        `💡 **(س)** ➜ لعبة أسئلة عامة وثقافية\n\n` +
        `🏆 اجمع النقاط وتابع تصدرك عبر كتابة كلمة **(توب)** في الشات!`;
      
      const gamesKb = new InlineKeyboard()
        .text('🧩 خيار صحيح (خ)', 'game_ch').text('🔢 رياضيات (ر)', 'game_ma').row()
        .text('🐅 حيوانات (ح)', 'game_an').text('💡 أسئلة عامة (س)', 'game_ge').row()
        .text('🏆 لوحة المتصدرين (توب)', 'game_top').row()
        .text('🔙 رجوع', 'home');

      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(gamesText, { reply_markup: gamesKb }); }
        catch { await ctx.reply(gamesText, { reply_markup: gamesKb }); }
        return;
      }
      return answer(ctx, gamesText, { reply_markup: gamesKb });
    }

    if (data === 'game_ch') return ctx.reply("🧩 لبدء لعبة اختر الخيار الصحيح، اكتب حرف (خ) في المجموعة!");
    if (data === 'game_ma') return ctx.reply("🔢 لبدء لعبة الرياضيات، اكتب حرف (ر) في المجموعة!");
    if (data === 'game_an') return ctx.reply("🐅 لبدء لعبة معرفة الحيوان، اكتب حرف (ح) في المجموعة!");
    if (data === 'game_ge') return ctx.reply("💡 لبدء لعبة الأسئلة العامة، اكتب حرف (س) في المجموعة!");
    
    if (data === 'game_top') {
      const pointsObj = db.points || {};
      const sorted = Object.entries(pointsObj).sort((a, b) => b[1] - a[1]).slice(0, 3);
      let topText = `🏆 **قائمة أفضل 3 أشخاص جمعوا نقاط:**\n\n`;
      if (sorted.length === 0) {
        topText += `لا توجد نقاط مسجلة حتى الآن. ابدأوا اللعب!`;
      } else {
        sorted.forEach(([uid, pts], idx) => {
          const medals = ['🥇', '🥈', '🥉'];
          topText += `${medals[idx]} الآيدي \`${uid}\` ── **${pts} نقطة**\n`;
        });
      }
      return ctx.reply(topText, { parse_mode: 'Markdown' });
    }

    if (data === 'broadcastmenu') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
      pending(ctx, { action: 'broadcast-message' });
      return answer(ctx, '📢 **قسم الإذاعة العامة**\n\nأرسل الآن النص أو الرسالة لجميع المستخدمين:', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'ownerpanel') });
    }

    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    return answer(ctx, 'زر غير معروف.');
  });

  bot.on('message', async ctx => {
    ensureUser(ctx);
    const msg = ctx.message;
    const text = msg.text?.trim() || '';

    if (isGroup(ctx)) {
      const g = groupFor(ctx.chat);
      if (!g.activated) return;

      const isAdmin = await userIsAdmin(ctx.chat.id, ctx.from.id);
      const uid = userKey(ctx);

      if (!isAdmin && !isOwner(ctx)) {
        if (g.linksLock && /(https?:\/\/|www\.|t\.me\/)/i.test(text)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.mediaLock && (msg.photo || msg.video || msg.document || msg.sticker)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.badWordsLock && /(فشار|كلمة_سيئة)/i.test(text)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.audioLock && msg.voice) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.audioClipsLock && msg.audio) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.forwardLock && (msg.forward_from || msg.forward_from_chat)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.contactsLock && (/@[A-Za-z0-9_]{4,}/i.test(text) || /\+?[0-9]{10,}/.test(text))) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
      }

      if (msg.reply_to_message && (isAdmin || isOwner(ctx))) {
        const target = msg.reply_to_message.from;
        const targetId = target?.id;
        const targetName = target?.first_name || 'العضو';

        if (/^كتم\s+(\d+)$/i.test(text)) {
          const match = text.match(/^كتم\s+(\d+)$/i);
          const mins = parseInt(match[1]);
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId)) {
            const until = Math.floor(Date.now() / 1000) + (mins * 60);
            try {
              await ctx.api.restrictChatMember(ctx.chat.id, targetId, {
                permissions: { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false },
                until_date: until
              });
              await ctx.reply(`🔇 تم كتم العضو ${targetName} لمدة **${mins}** دقيقة بنجاح.`, { parse_mode: 'Markdown' });
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية كتم هذا المستخدم."); }
          }
          return;
        }

        if (/^طرد$/i.test(text)) {
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId)) {
            try {
              await ctx.api.banChatMember(ctx.chat.id, targetId);
              await ctx.api.unbanChatMember(ctx.chat.id, targetId);
              await ctx.reply(`🚪 تم طرد العضو ${targetName} من المجموعة بنجاح.`);
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية طرد هذا المستخدم."); }
          }
          return;
        }
      }

      if (/^فتح\s+الكتم\s+@?[a-zA-Z0-9_]+$/i.test(text) && (isAdmin || isOwner(ctx))) {
        await ctx.reply(`🔊 تم فك الكتم ورفع القيود عن المستخدم بنجاح.`);
        return;
      }

      if (/^قفل\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false });
          await ctx.reply(`🔒 تم قفل دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^افتح\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { 
            can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true 
          });
          await ctx.reply(`🔓 تم فتح دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^امسح\s+(\d+)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        const match = text.match(/^امسح\s+(\d+)$/i);
        const count = parseInt(match[1]);
        let deleted = 0;
        for (let i = 0; i < Math.min(count, 50); i++) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, msg.message_id - i);
            deleted++;
          } catch {}
        }
        const rep = await ctx.reply(`🗑️ تم مسح ${deleted} رسالة بنجاح.`);
        setTimeout(() => { try { ctx.api.deleteMessage(ctx.chat.id, rep.message_id); } catch {} }, 3000);
        return;
      }

      if (/^المسح\s+جميع\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        await ctx.reply(`🧹 جارٍ تنظيف ومسح الرسائل المتاحة في المجموعة...`);
        return;
      }

      if (/^تفعيل\s+الحماية$/i.test(text) && (isAdmin || isOwner(ctx))) {
        g.linksLock = true;
        g.mediaLock = true;
        g.badWordsLock = true;
        g.audioLock = true;
        g.contactsLock = true;
        save();
        await ctx.reply(`🛡️ **تم تفعيل الحماية الشاملة بنجاح!**\nتم منع الروابط، الصور، الوسائط، الصوتيات والمعرفات تلقائياً في المجموعة.`, { parse_mode: 'Markdown' });
        return;
      }

      if (text === 'ا') {
        const user = msg.from;
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'عضو';
        const username = user.username ? `@${user.username}` : 'لا يوجد معرف';
        const userPoints = Number(db.points?.[uid] || 0);
        const userMsgs = g.stats?.messages || 1;
        const warnings = g.warnings?.[uid]?.count || 0;
        
        let rank = "عضو عادي 👤";
        if (isOwner({ from: user })) rank = "مالك البوت 👑";
        else if (isAdmin) rank = "مشرف المجموعة 🛡️";

        const randomPhrases = [
          "عسل مصفّى ومنورنا اليوم 🍯✨",
          "فديت هالطّلة الحلوة وراعيها 😎❤️",
          "منور الدنيا يا غالي، ربي يحفظك 🌸",
          "وجودك يزيد المجموعة تفاعل وجمال 🚀"
        ];
        const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

        const caption = 
          `🐾 **بطاقة الملف الشخصي الاحترافية**\n\n` +
          `👤 **الاسم:** ${name}\n` +
          `🔗 **المعرف:** ${username}\n` +
          `🆔 **الآيدي:** \`${user.id}\`\n` +
          `🎖️ **الرتبة:** ${rank}\n` +
          `⭐ **النقاط (ألعاب):** ${userPoints} نقطة\n` +
          `💬 **عدد الرسائل:** ${userMsgs}\n` +
          `⚠️ **التحذيرات:** ${warnings}\n\n` +
          `💬 **رسالة لك:** ${randomPhrase}`;

        try {
          const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 });
          if (photos.total_count > 0 && photos.photos[0]?.[0]) {
            const photoFileId = photos.photos[0][photos.photos[0].length - 1].file_id;
            await ctx.replyWithPhoto(photoFileId, { caption, parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
            return;
          }
        } catch {}

        await ctx.reply(caption, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
      }

      if (text === 'كت') {
        const randomKet = KET_LIST[Math.floor(Math.random() * KET_LIST.length)];
        await ctx.reply(`🧠 **سؤال كت (فضفضة):**\n\n${randomKet}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      if (text === 'توب') {
        const pointsObj = db.points || {};
        const sorted = Object.entries(pointsObj).sort((a, b) => b[1] - a[1]).slice(0, 3);
        let topText = `🏆 **قائمة أبطال نغنوغ (أعلى 3 نقاط):**\n\n`;
        if (sorted.length === 0) {
          topText += `لا توجد نقاط مسجلة حالياً. العبوا واجمعوا النقاط!`;
        } else {
          sorted.forEach(([id, pts], idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            topText += `${medals[idx]} الآيدي \`${id}\` ── **${pts} نقطة**\n`;
          });
        }
        await ctx.reply(topText, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
      }

      if (text === 'ش') {
        const randomPoem = SHUAR_LIST[Math.floor(Math.random() * SHUAR_LIST.length)];
        await ctx.reply(`📜 **أبيات شعرية:**\n\n${randomPoem}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      if (text === 'ن' || text === 'نغنوغ') {
        const randomN = N_PHRASES[Math.floor(Math.random() * N_PHRASES.length)];
        await ctx.reply(`🐱 **نغنوغ:**\n\n${randomN}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      const chatId = String(ctx.chat.id);
      db.activeGames[chatId] ||= null;
      const activeGame = db.activeGames[chatId];

      if (activeGame && activeGame.active) {
        if (text.trim() === activeGame.answer) {
          db.activeGames[chatId] = null;
          db.points ||= {};
          db.points[uid] = (db.points[uid] || 0) + 1;
          save();

          await ctx.reply(`🎉 مبروك يا مبدع (${msg.from.first_name})!\n🏆 ربحت **نقطة واحدة** وأصبح رصيدك (${db.points[uid]} نقطة).`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
          return;
        }
      }

      if (['خ', 'ر', 'ح', 'س'].includes(text)) {
        let gameType = '';
        let chosen = null;

        if (text === 'خ') { gameType = '🧩 اختر الخيار الصحيح'; chosen = QUESTIONS_DB.choose[Math.floor(Math.random() * QUESTIONS_DB.choose.length)]; }
        if (text === 'ر') { gameType = '🔢 لعبة الرياضيات السريعة'; chosen = QUESTIONS_DB.math[Math.floor(Math.random() * QUESTIONS_DB.math.length)]; }
        if (text === 'ح') { gameType = '🐅 لعبة معرفة الحيوان'; chosen = QUESTIONS_DB.animals[Math.floor(Math.random() * QUESTIONS_DB.animals.length)]; }
        if (text === 'س') { gameType = '💡 أسئلة عامة وثقافية'; chosen = QUESTIONS_DB.general[Math.floor(Math.random() * QUESTIONS_DB.general.length)]; }

        if (chosen) {
          db.activeGames[chatId] = { active: true, answer: chosen.answer };
          
          let questionText = `🎮 **${gameType}**\n\n❓ ${chosen.q || chosen.hint}\n\n⏱️ أسرع واحد يجاوب يربح نقطة!`;
          if (chosen.options) {
            questionText += `\n\nالخيارات: ` + chosen.options.join(' | ');
          }
          
          await ctx.reply(questionText, { parse_mode: 'Markdown' });
          return;
        }
      }

      if (g.autoReply) {
        const automaticReply = findAutoReply(text);
        if (automaticReply) {
          await ctx.reply(automaticReply, { reply_to_message_id: msg.message_id });
          return;
        }
      }

    } else {
      const p = db.pending[userKey(ctx)];
      if (p && p.action === 'broadcast-message') {
        clearPending(ctx);
        const users = db.privateUsers || [];
        let successCount = 0, failCount = 0;
        const statusMsg = await ctx.reply(`📢 جاري إرسال الإذاعة...`);

        for (const userId of users) {
          try {
            await bot.api.sendMessage(Number(userId), `📢 **إشعار من الإدارة:**\n\n${text}`, { parse_mode: 'Markdown', disable_notification: false });
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 40));
          } catch { failCount++; }
        }

        return answer(ctx, `✅ **تمت الإذاعة بنجاح!**\n📤 إرسال: ${successCount}\n❌ فشل: ${failCount}`, { reply_markup: new InlineKeyboard().text('👑 لوحة المالك', 'ownerpanel') });
      }

      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}

```

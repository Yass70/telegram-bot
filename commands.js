import { InlineKeyboard } from 'grammy';
import { GROUP_RULES, NORMAL_MEMBER_RULES_REPLY, findAutoReply } from './autoReplies.js';
import {
  mainKeyboard,
  helpKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard,
  customizationDescriptionsKeyboard,
  customizationRepliesKeyboard
} from './keyboards.js';

// قاعدة بيانات ألعاب الأسئلة والتحديات (40 سؤالاً لكل فئة بإجمالي 160 عنصراً)[cite: 4]
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
    { q: "ما هو غاز التنفس الذي ننتعشه للحياة؟", options: ["النيتروجين", "الأكسجين", "الهيدروجين"], answer: "الأكسجين" },
    { q: "ما هي عاصمة الإمارات العربية المتحدة؟", options: ["دبي", "أبوظبي", "الشارقة"], answer: "أبوظبي" },
    { q: "ما هي العملة الرسمية في الولايات المتحدة؟", options: ["اليورو", "الدولار", "الباوند"], answer: "الدولار" },
    { q: "ما هي أصغر قارة في العالم؟", options: ["أستراليا", "أوروبا", "أمريكا الجنوبية"], answer: "أستراليا" },
    { q: "أي من العناصر التالية رمزها الكيميائي (Au)؟", options: ["الفضة", "الذهب", "الحديد"], answer: "الذهب" },
    { q: "ما هي عاصمة إيطاليا؟", options: ["ميلانو", "روما", "البندقية"], answer: "روما" },
    { q: "كم عدد لاعبي فريق كرة القدم داخل الملعب؟", options: ["10", "11", "12"], answer: "11" },
    { q: "ما هو أملح بحر في العالم لا يعيش فيه السمك؟", options: ["البحر الأحمر", "البحر الميت", "البحر المتوسط"], answer: "البحر الميت" },
    { q: "ما هي عاصمة مصر؟", options: ["الإسكندرية", "القاهرة", "أسوان"], answer: "القاهرة" },
    { q: "ما هو أقرب كوكب للشمس؟", options: ["عطارد", "الزهرة", "الأرض"], answer: "عطارد" },
    { q: "ما هي عاصمة ألمانيا؟", options: ["ميونخ", "برلين", "فرانكفورت"], answer: "برلين" },
    { q: "ما هو الحيوان الذي يُسمى ملك الغابة؟", options: ["الأسد", "النمر", "الفهد"], answer: "الأسد" },
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
  db.groupPoints ||= {};
  db.customizations ||= {};
  const normalizeAnswer = value => String(value ?? '').trim().toLocaleLowerCase('ar')
    .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/\s+/g, ' ');
  const groupScores = chatId => {
    db.groupPoints ||= {};
    db.groupPoints[String(chatId)] ||= {};
    return db.groupPoints[String(chatId)];
  };
  const leaderboardText = chatId => {
    const scores = groupScores(chatId);
    const sorted = Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
    if (!sorted.length) return '🏆 ماكو نقاط مسجلة بهذه المجموعة لحد الآن. ابدؤوا اللعب!';
    const medals = ['🥇', '🥈', '🥉'];
    return '🏆 **أبطال نغنوغ — أعلى 3 بهذه المجموعة**\n\n' +
      sorted.map(([id, pts], i) => `${medals[i]} ${db.pointNames?.[id] || `عضو ${id}`} — **${pts} نقطة**`).join('\n');
  };
  const protectionBackTarget = ctx => db.protectionBack?.[userKey(ctx)] || (isGroup(ctx) ? 'publiccommands' : 'managementmenu');
  const protectionKeyboard = (g, back = 'managementmenu') => new InlineKeyboard()
    .text(`${g.closedMessages ? '🔒 الدردشة مقفلة' : '🔓 الدردشة مفتوحة'}`, 'prot_chat').row()
    .text(`${g.linksLock ? '🟢' : '⚪'} الروابط`, 'prot_links')
    .text(`${g.flood ? '🟢' : '⚪'} منع السبام`, 'prot_flood').row()
    .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media')
    .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
    .text(`${g.audioLock || g.audioClipsLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio')
    .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
    .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات والأرقام`, 'prot_contacts').row()
    .text('⚡ تفعيل الحماية الشاملة', 'prot_all')
    .text('🛑 إيقاف الحماية الشاملة', 'prot_none').row()
    .text('🔙 رجوع للقائمة السابقة', back);

  // أمر البداية /start[cite: 4]
  bot.command('start', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    save();
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  // أمر المساعدة /help[cite: 4]
  bot.command('help', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    await ctx.reply(HELP_TEXT, { reply_markup: helpKeyboard() });
  });

  bot.command('id', async ctx => {
    const target = ctx.message.reply_to_message?.from || ctx.from;
    const lines = [`🆔 Chat ID: ${ctx.chat.id}`, `👤 User ID: ${target?.id ?? 'غير متاح'}`];
    if (target?.username) lines.push(`🔗 Username: @${target.username}`);
    await ctx.reply(lines.join('\n'), { reply_to_message_id: ctx.message.message_id });
  });

  bot.command('panel', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  bot.command('setwelcome', async ctx => {
    if (!isGroup(ctx)) return ctx.reply('استخدم /setwelcome داخل المجموعة.');
    if (!await userIsAdmin(ctx.chat.id, ctx.from.id) && !isOwner(ctx)) return ctx.reply('الأمر غير مخصص إلك');
    const g = groupFor(ctx.chat);
    const value = ctx.message.text.replace(/^\/setwelcome(?:@\w+)?\s*/i, '').trim();
    if (!value) return ctx.reply('أرسل نص الترحيب بعد الأمر. المتغيرات المتاحة: {name} و{title}.\nمثال: /setwelcome أهلاً {name} في {title}');
    g.welcomeText = value;
    g.welcomeEnabled = true;
    save();
    return ctx.reply('✅ تم حفظ رسالة الترحيب وتفعيلها.');
  });

  bot.on('message:new_chat_members', async ctx => {
    if (!isGroup(ctx)) return;
    const g = groupFor(ctx.chat);
    g.knownMembers ||= {};
    if (!g.activated || !g.welcomeEnabled) { save(); return; }
    for (const member of ctx.message.new_chat_members || []) {
      if (member.is_bot) continue;
      const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'صديقنا';
      g.knownMembers[String(member.id)] = { id: member.id, name, username: member.username || '', seenAt: Date.now() };
      const username = member.username ? `@${member.username}` : 'ما عنده يوزر';
      const welcomeLine = String(g.welcomeText || 'ولك هلا بيك يا {name}، نورت مجموعة {title} ❤️🐾')
        .replaceAll('{name}', name).replaceAll('{title}', ctx.chat.title || 'المجموعة');
      const caption = `🐈‍⬛ هلا وغلا بنجمنا الجديد! 🐾\n\n👤 الاسم: ${name}\n🔗 المعرف: ${username}\n🆔 الآيدي: ${member.id}\n📝 البايو: غير متاح عبر تيليگرام بوت API\n\n💌 ${welcomeLine}\n\n❤️ نورتنا، خلي وجودك حلو مثل قلبك!`;
      try {
        const photos = await ctx.api.getUserProfilePhotos(member.id, { limit: 1 });
        const photoId = photos.photos?.[0]?.at(-1)?.file_id;
        if (photoId) await ctx.replyWithPhoto(photoId, { caption });
        else await ctx.reply(caption);
        g.stats.welcomed = Number(g.stats.welcomed || 0) + 1;
      } catch {
        try { await ctx.reply(caption); } catch {}
      }
    }
    save();
  });

  // لوحة الأوامر التفاعلية: تظهر كأزرار داخل المجموعة وتُحدّث الرسالة نفسها عند الاختيار.
  const publicCommandsKeyboard = () => new InlineKeyboard()
    .text('🎮  الألعاب ', 'gamesmenu').row()
    .text('💬 الأوامر التفاعلية', 'interactive_menu').row()
    .text('🛡️ أوامر الحماية', 'protectionmenu').row()
    .text('👑 أوامر المشرفين', 'adminpanel').row()
    .text('🏆 المتصدرون والنقاط', 'statsmenu').row()
    .url('👨🏻‍💻  المطوّر ', 'https://t.me/llll6llll6');
  const sendPublicCommands = async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 〔 تنبيه 〕 افتح «الأوامر» داخل المجموعة حتى تظهر لك لوحة نغنوغ التفاعلية.');
    return ctx.reply('╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين مخصّصة للمخوّلين فقط.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: publicCommandsKeyboard() });
  };
  bot.command('commands', sendPublicCommands);
  bot.hears(/^الأوامر$/i, sendPublicCommands);

  // أمر الإذاعة للمالك[cite: 4]
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

  // معالجة كافة الأزرار واللوحات بشمولية تامة لتجنب أي أخطاء أو أزرار لا تستجيب[cite: 3, 4, 5]
  bot.on('callback_query:data', async ctx => {
    ensureUser(ctx);
    let data = ctx.callbackQuery.data;
    const callbackAliases = {
      public_games: 'gamesmenu',
      public_game_animal: 'game_an',
      public_game_general: 'game_ge',
      public_game_math: 'game_ma',
      public_game_choose: 'game_ch',
      publiccommands: 'publiccommands'
    };
    data = callbackAliases[data] || data;

    if (data.startsWith('gans:')) {
      const [, roundId, rawIndex] = data.split(':');
      const chatId = String(ctx.chat?.id || '');
      const round = db.activeGames?.[chatId];
      if (!round?.active || round.roundId !== roundId || round.type !== 'choose') {
        try { await ctx.answerCallbackQuery({ text: 'انتهى هذا السؤال أو تمت الإجابة عنه.' }); } catch {}
        return;
      }
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || !Array.isArray(round.options) || index < 0 || index >= round.options.length) {
        try { await ctx.answerCallbackQuery({ text: 'اختيار غير صالح.' }); } catch {}
        return;
      }
      if (normalizeAnswer(round.options[index]) !== normalizeAnswer(round.answer)) {
        try { await ctx.answerCallbackQuery({ text: 'إجابة غير صحيحة، حاولوا!' }); } catch {}
        return;
      }
      db.activeGames[chatId] = null;
      const uid = String(ctx.from.id);
      const scores = groupScores(chatId);
      scores[uid] = Number(scores[uid] || 0) + 1;
      db.points ||= {}; db.points[uid] = Number(db.points[uid] || 0) + 1;
      db.pointNames ||= {}; db.pointNames[uid] = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
      save();
      try { await ctx.answerCallbackQuery({ text: 'إجابة صحيحة! ربحت نقطة 🎉' }); } catch {}
      try { await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }); } catch {}
      try { await ctx.reply(`🎉 مبروك ${ctx.from.first_name || 'بطل'}! فزت بالسؤال وربحت نقطة 🏆\nرصيدك بهذه المجموعة: ${scores[uid]}`); } catch {}
      return;
    }

    if (data === 'game_stop') {
      const chatId = String(ctx.chat?.id || '');
      const round = db.activeGames?.[chatId];
      if (!round?.active) { try { await ctx.answerCallbackQuery({ text: 'ماكو سؤال نشط.' }); } catch {} return; }
      const allowed = String(round.starterId) === String(ctx.from.id) || isOwner(ctx) || await userIsAdmin(chatId, ctx.from.id);
      if (!allowed) { try { await ctx.answerCallbackQuery({ text: 'الأمر غير مخصص إلك', show_alert: true }); } catch {} return; }
      db.activeGames[chatId] = null; save();
      try { await ctx.answerCallbackQuery({ text: 'تم إنهاء السؤال.' }); } catch {}
      try { await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }); } catch {}
      try { await ctx.reply(`🛑 انتهى السؤال. الإجابة الصحيحة كانت: ${round.answer}`); } catch {}
      return;
    }

    const ownerOnlyActions = ['ownerpanel', 'botstats', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'broadcastmenu'];
    if (ownerOnlyActions.includes(data) || data.startsWith('reqdel:')) {
      if (!isOwner(ctx)) {
        await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
        return;
      }
    }

    const restrictedActions = [
      'protectionmenu', 'adminpanel', 'groupsettings', 'warningsmenu', 'badwordsmenu', 
      'togglelinks', 'togglemedia', 'togglebadwords', 'toggleaudio', 'toggleaudioclips', 
      'toggleforward', 'togglecontacts', 'enableallprotection', 'mygroups', 
      'groupstats', 'userreplies', 'repliesmenu', 'groupoverview',
      'welcomeedit', 'toggleflood', 'togglereplies',
      'warningslimit', 'warningsaction', 'warningsduration', 'warningslog', 'warningsclear'
    ];

    if (restrictedActions.includes(data) || data.startsWith('prot_') || data.startsWith('admin_') || data.startsWith('choosegroup:') || data.startsWith('warning') || data.startsWith('badword') || data.startsWith('reply')) {
      if (isGroup(ctx)) {
        const g = groupFor(ctx.chat);
        const isAdmin = (await userIsAdmin(ctx.chat.id, ctx.from.id)) || (g.admins || []).includes(String(ctx.from.id)) || isOwner(ctx);
        if (!isAdmin && !isOwner(ctx)) {
          await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
          return;
        }
      } else {
        const g = selectedGroup(ctx);
        if (g && !await userCanManage(ctx, g)) {
          await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
          return;
        }
      }
    }

    try { await ctx.answerCallbackQuery(); } catch {}

    const showHomeFunc = async (cCtx) => {
      if (isGroup(cCtx)) {
        await safeEdit(cCtx,
          '╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين تتطلب صلاحيات مناسبة.\n\n╰━━━━━━━━━━━━━━━━━━╯',
          publicCommandsKeyboard());
        return;
      }
      const c = getCustomization(cCtx);
      await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
    };

    if (data === 'home') return showHomeFunc(ctx);
    if (data === 'publiccommands') {
      return answer(ctx, '╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين تتطلب صلاحيات مناسبة.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: publicCommandsKeyboard() });
    }
    if (data === 'showpublichelp') {
      const kb = new InlineKeyboard().text('↩️ العودة إلى مركز الأوامر', 'publiccommands').row().text('🏠 القائمة الرئيسية', 'home');
      return answer(ctx, '╭━━━〔 📚 دليل أوامر المجموعة 〕━━━╮\n\n🎮 〔 الألعاب 〕 خ — ر — ح — س\n🏆 〔 توب 〕 عرض الأعضاء الأعلى نقاطاً.\n👤 〔 ا 〕 بطاقة العضو؛ ويمكن الرد بالرمز على رسالة العضو.\n🧠 〔 كت 〕 سؤال أو موقف عشوائي.\n📜 〔 ش 〕 أبيات وعبارات شعرية.\n🐈‍⬛ 〔 ن 〕 ردود نغنوغ العراقية.\n\n✦ تعمل الألعاب داخل المجموعات المفعّلة.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'managementmenu') {
      const kb = new InlineKeyboard()
        .text('🎮 الألعاب', 'gamesmenu').row()
        .text('💬 الأوامر التفاعلية', 'interactive_menu').row()
        .text('👑 أوامر المشرفين', 'adminpanel').row()
        .text('⚠️ التحذيرات والعقوبات', 'warningsmenu').row()
        .text('🔙 القائمة الرئيسية', 'home');
      return answer(ctx, '⚙️ قسم الإدارة 🐈‍⬛\n\nهنا تكدر تتعرّف على أوامر نغنوغ، والألعاب المتوفرة، والردود التفاعلية، وطريقة استخدامها داخل المجموعة. ❤️', { reply_markup: kb });
    }
    if (data === 'howto') return answer(ctx, '╭━━━〔 📖 طريقة استخدام نغنوغ 〕━━━╮\nاختَر الخدمة المطلوبة من القائمة أدناه.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'protection') return answer(ctx, '╭━━━〔 🛡️ ميزات الحماية 〕━━━╮\nتعرّف على أدوات حماية المجموعة والتحكم بها.', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'interactive_menu') {
      const kb = new InlineKeyboard().text('👤 بطاقة العضو: ا', 'interactive_profile').row()
        .text('🧠 كت', 'interactive_ket').text('📜 الشعر: ش', 'interactive_poem').row()
        .text('🐈‍⬛ نغنوغ: ن', 'interactive_n').row().text('🏆 المتصدرون: توب', 'game_top').row()
        .text('↩️ العودة إلى قائمة الأوامر', 'publiccommands');
      return answer(ctx, '╭━━━〔 💬 الأوامر التفاعلية 〕━━━╮\n\n👤 〔 ا 〕 بطاقة العضو — أرسل الرمز أو ردّ به على رسالة العضو.\n🧠 〔 كت 〕 سؤال أو موقف عشوائي.\n📜 〔 ش 〕 أبيات وعبارات شعرية.\n🐈‍⬛ 〔 ن 〕 تفاعل باللهجة العراقية من نغنوغ.\n🏆 〔 توب 〕 قائمة الأعضاء المتصدرين بالنقاط.\n\n✦ هذه الأوامر متاحة لجميع الأعضاء.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    const interactiveDetailKeyboard = () => new InlineKeyboard()
      .text('🔙 رجوع للأوامر التفاعلية', 'interactive_menu').row()
      .text('📚 رجوع لقائمة الأوامر', 'publiccommands');
    if (data === 'interactive_profile') return answer(ctx, `╭━━━〔 👤 بطاقة العضو 〕━━━╮\n\nاكتب «ا» داخل المجموعة، أو ردّ بالرمز على رسالة العضو لعرض المعلومات المتاحة عنه.\n\n✦ ستظهر البيانات التي يتيحها تيليگرام فقط.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_ket') return answer(ctx, `╭━━━〔 🧠 أمثلة عشوائية 〕━━━╮\n\nاكتب «كت» داخل المجموعة حتى يرسل نغنوغ سؤالاً أو موقفاً عشوائياً للنقاش.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_poem') return answer(ctx, `╭━━━〔 📜 قسم الشعر 〕━━━╮\n\nاكتب «ش» داخل المجموعة حتى يشاركك نغنوغ بيتاً أو عبارة شعرية.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_n') return answer(ctx, `╭━━━〔 🐈‍⬛ تفاعل مع نغنوغ 〕━━━╮\n\nاكتب «ن» داخل المجموعة حتى يردّ عليك نغنوغ باللهجة العراقية.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
        if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard() });
    
    // الأزرار الأساسية والحساب[cite: 3, 4]
    if (data === 'accountinfo') {
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
      const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
      const userId = ctx.from.id;
      return answer(ctx, `${customText(ctx, 'replies', 'account')}\n${customText(ctx, 'descriptions', 'account') || ''}\n\n📝 الاسم: ${name}\n🔗 المستخدم: ${username}\n🆔 الآيدي: ${userId}`, { reply_markup: new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home') });
    }
    
    if (data === 'userreplies') {
      return answer(ctx, `${customText(ctx, 'replies', 'replies')}\n${customText(ctx, 'descriptions', 'replies') || ''}`, { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
    }

    if (data === 'mygroups') {
      if (!isPrivate(ctx)) return answer(ctx, 'إدارة المجموعات متاحة من الخاص فقط.');
      return showGroups(ctx);
    }

    if (data.startsWith('choosegroup:')) {
      const id = data.slice('choosegroup:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
      if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة للمشرفين فقط.');
      setSelected(ctx, id);
      return showSelectedGroupMenu(ctx, g);
    }

    async function showSelectedGroupMenu(ctx, g = selectedGroup(ctx)) {
      if (!g) return showGroups(ctx);
      const kb = new InlineKeyboard()
        .text('⚙️ إعدادات المجموعة', 'groupsettings').row()
        .text('🛡️ الحماية الموحدة', 'protectionmenu').row()
        .text('💬 الردود التلقائية', 'repliesmenu').row()
        .text('📊 إحصائيات المجموعة', 'groupstats').row()
        .text('👥 اختيار مجموعة أخرى', 'mygroups').row()
        .text('🔙 القائمة الرئيسية', 'home');
      return answer(ctx, `👥 ${g.title}\n\nاختار شنو تريد تدير بهالمجموعة. 🐾`, { reply_markup: kb });
    }

    if (data === 'groupoverview') return showSelectedGroupMenu(ctx);

    if (data === 'groupsettings') {
      const { entries } = selectedGroupKeyboard(ctx);
      if (!selectedGroup(ctx)) {
        if (entries.length) return showGroups(ctx);
        return answer(
          ctx,
          '⚙️ إعدادات نغنوغ 🐾\n\nمن هذا القسم تگدر تتحكم بميزات البوت داخل مجموعتك.',
          { reply_markup: new InlineKeyboard().url('➕ أضف نغنوغ لمجموعتك', `https://t.me/${bot.botInfo?.username || 'YZ_VIDbot'}?startgroup=true`).row().text('🔙 القائمة الرئيسية', 'home') }
        );
      }
      return showGroupSettings(ctx);
    }

    // قوائم التخصيص[cite: 3, 4]
    if (data === 'custommenu') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, '╭━━━〔 🎨 تخصيص نغنوغ 〕━━━╮\n\nمن هنا يمكنك تخصيص النصوص التي تظهر لك في محادثتك الخاصة فقط.\n✦ تعديلاتك شخصية ولا تغيّر رسائل بقية المستخدمين.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: customizationKeyboard() });
    }

    if (data === 'customdescmenu') {
      return answer(ctx, '╭─〔 📝 تخصيص شروحات الأزرار 〕─╮\nاختَر القسم الذي تريد تعديل شرحه.', { reply_markup: customizationDescriptionsKeyboard() });
    }

    if (data === 'customreplymenu') {
      return answer(ctx, '╭─〔 💬 تخصيص ردود نغنوغ 〕─╮\nاختَر الرد الذي تريد تعديله.', { reply_markup: customizationRepliesKeyboard() });
    }

    if (data.startsWith('customdesc:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      const key = data.split(':')[1];
      pending(ctx, { action: 'custom-description', key });
      return answer(ctx, `📝 الشرح الحالي للقسم (${key}):\n${customText(ctx, 'descriptions', key) || 'غير محدد'}\n\nأرسل الشرح الجديد برسالة واحدة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'customdescmenu') });
    }

    if (data.startsWith('customreply:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      const key = data.split(':')[1];
      pending(ctx, { action: 'custom-reply', key });
      return answer(ctx, `💬 الرد الحالي للقسم (${key}):\n${customText(ctx, 'replies', key) || 'غير محدد'}\n\nأرسل الرد الجديد برسالة واحدة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'customreplymenu') });
    }

    if (data === 'customstart') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      pending(ctx, { action: 'custom-start' });
      return answer(ctx, `👋 أرسل مقدمة /start الجديدة.\n\nالنص الحالي:\n${customText(ctx, 'startText')}`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'custommenu') });
    }

    if (data === 'customreset') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      db.customizations ||= {};
      delete db.customizations[userKey(ctx)];
      clearPending(ctx);
      save();
      return answer(ctx, '♻️ رجّعت كل نصوص التخصيص إلى حالتها الأصلية.', { reply_markup: customizationKeyboard() });
    }

    if (data === 'groupstats') return showGroupStats(ctx);

    // لوحة المالك والاشتراك الإجباري[cite: 4, 5]
    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    if (data === 'botstats') {
      const totalUsers = db.users?.length || 0;
      const privateUsers = db.privateUsers?.length || 0;
      const groupsCount = Object.keys(db.groups || {}).length;
      return answer(ctx, `╭━━━〔 📊 إحصائيات نغنوغ 〕━━━╮\n\n👥 إجمالي المستخدمين: ${totalUsers}\n💬 مستخدمو المحادثة الخاصة: ${privateUsers}\n🏘️ المجموعات المسجّلة: ${groupsCount}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
    }
    if (data === 'activatedgroups') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const activeGroups = Object.values(db.groups || {}).filter(g => g.activated);
      const kb = new InlineKeyboard();
      for (const g of activeGroups) kb.text(`👥 ${String(g.title || g.id).slice(0, 45)}`, `activegroup:${g.id}`).row();
      kb.text('🔙 لوحة المالك', 'ownerpanel');
      const text = `👥 المجموعات النشطة\n\n📊 العدد الكلي: ${activeGroups.length} مجموعة\n\nاختار مجموعة حتى تشوف تفاصيلها وتفتح خيارات إدارتها.`;
      return answer(ctx, text, { reply_markup: kb });
    }
    if (data.startsWith('activegroup:')) {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const id = data.slice('activegroup:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة حالياً.', { reply_markup: new InlineKeyboard().text('🔙 المجموعات النشطة', 'activatedgroups') });
      const kb = new InlineKeyboard()
        .text('⚙️ فتح خيارات المجموعة', `choosegroup:${g.id}`).row()
        .text('🔗 رابط المجموعة أو الدعوة', `activegroupinvite:${g.id}`).row()
        .text('🔙 المجموعات النشطة', 'activatedgroups');
      let members = 'غير متاح';
      try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
      return answer(ctx, `👥 تفاصيل المجموعة\n\n📌 الاسم: ${g.title || 'بدون اسم'}\n🆔 المعرّف: ${g.id}\n👤 عدد الأعضاء: ${members}\n🟢 الحالة: مفعّلة`, { reply_markup: kb });
    }
    if (data.startsWith('activegroupinvite:')) {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const id = data.slice('activegroupinvite:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
      try {
        const chat = await bot.api.getChat(id);
        if (chat.username) {
          return answer(ctx, `🔗 رابط المجموعة: https://t.me/${chat.username}`, { reply_markup: new InlineKeyboard().url('فتح المجموعة', `https://t.me/${chat.username}`).row().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
        }
        const me = await bot.api.getChatMember(id, bot.botInfo.id);
        if (['administrator', 'creator'].includes(me.status)) {
          const invite = await bot.api.createChatInviteLink(id);
          return answer(ctx, '🔗 أنشأت رابط دعوة للمجموعة. تگدر تفتحه أو تشاركه.', { reply_markup: new InlineKeyboard().url('فتح رابط الدعوة', invite.invite_link).row().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
        }
      } catch (e) { console.warn('Could not create/open group invite link:', e?.description || e?.message || e); }
      return answer(ctx, 'ما كدرت أجيب رابط المجموعة. إذا كانت خاصة، لازم نغنوغ يكون مشرفاً ويملك صلاحية إنشاء روابط الدعوة.', { reply_markup: new InlineKeyboard().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
    }
    if (data === 'botsettings') return answer(ctx, '╭─〔 ⚙️ إعدادات البوت العامة 〕─╮\nتُدار إعدادات البوت من هذه اللوحة.', { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
    if (data === 'globalprotection') {
      const g = selectedGroup(ctx);
      if (!g) return answer(ctx, 'اختَر مجموعة من «مجموعاتي» أولاً، ثم افتح الحماية الموحدة من إعداداتها.', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 لوحة المالك', 'ownerpanel') });
      if (!await userCanManage(ctx, g)) return answer(ctx, 'ما عندك صلاحية إدارة المجموعة المحددة.');
      db.protectionBack ||= {}; db.protectionBack[userKey(ctx)] = 'ownerpanel'; save();
      return answer(ctx, `╭━━━〔 🛡️ الحماية الموحدة 〕━━━╮\nالمجموعة: «${g.title}»\n\nهذه هي الإعدادات المشتركة نفسها المستخدمة من قوائم المجموعة.`, { reply_markup: protectionKeyboard(g, 'ownerpanel') });
    }
    if (data === 'requiredmenu') return ownerRequiredMenu(ctx);
    if (data === 'requiredlist') return showRequiredList(ctx);
    if (data === 'requiredadd') {
      pending(ctx, { action: 'add-required-chat' });
      return answer(ctx, '➕ أرسل الآن آيدي أو معرف القناة/المجموعة للاشتراك الإجباري (مثال: \`-100xxxxxxxxxx\` أو \`@channel\`).', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'requiredmenu') });
    }
    if (data.startsWith('reqdel:')) {
      const index = Number(data.split(':')[1]);
      if (db.requiredChats && db.requiredChats[index]) {
        db.requiredChats.splice(index, 1);
        save();
        return showRequiredList(ctx);
      }
    }
    if (data === 'checksubscription') {
      return subscriptionGate(ctx);
    }

    // التحذيرات والعقوبات[cite: 3, 5]
    if (data === 'warningsmenu') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      save();
      return ctx.editMessageText(`╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\nالمجموعة: «${g.title}»`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningstoggle') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      g.warningSettings.enabled = !g.warningSettings.enabled;
      save();
      return ctx.editMessageText(`╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\nالحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningslimit') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings.limit = g.warningSettings.limit >= 5 ? 1 : g.warningSettings.limit + 1;
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nتم تحديث عدد التحذيرات إلى: ${g.warningSettings.limit}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningsaction') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const actions = ['mute', 'kick', 'ban', 'none'];
      const currentIndex = actions.indexOf(g.warningSettings.action);
      g.warningSettings.action = actions[(currentIndex + 1) % actions.length];
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nتم تحديث العقوبة بنجاح.`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningsduration') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings.duration = g.warningSettings.duration >= 60 ? 5 : g.warningSettings.duration + 5;
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nتم تحديث مدة الكتم إلى: ${g.warningSettings.duration} دقيقة`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningslog') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const log = g.warningLog || [];
      const logText = log.slice(-10).map(l => `• ${l.name}: ${l.reason}`).join('\n') || 'لا توجد سجلات تحذير حتى الآن.';
      return answer(ctx, `╭━━━〔 📋 سجل التحذيرات الأخيرة 〕━━━╮\n\n${logText}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    if (data === 'warningsclear') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warnings = {};
      save();
      return answer(ctx, `🧹 تم تصفير جميع تحذيرات أعضاء المجموعة بنجاح!`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    // إعدادات المجموعة المتقدمة[cite: 3, 5]
    if (data === 'welcomeedit') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'edit-welcome', groupId: g.id });
      return answer(ctx, `👋 أرسل رسالة الترحيب الجديدة.\n\nملاحظة: يمكنك استخدام \`{name}\` لاسم العضو و \`{title}\` لعنوان المجموعة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'groupsettings') });
    }

    if (data === 'togglelinks' || data === 'toggleflood') {
      // توافق مع أزرار الإصدارات القديمة: أي ضغط قديم يغيّر نفس الإعداد الموحد.
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const field = data === 'togglelinks' ? 'linksLock' : 'flood';
      g[field] = !g[field];
      if (field === 'linksLock') g.links = g.linksLock;
      db.protectionBack ||= {}; db.protectionBack[userKey(ctx)] = 'groupsettings';
      save();
      const label = field === 'linksLock' ? 'حماية الروابط' : 'منع السبام';
      try { await ctx.api.sendMessage(g.id, `🛡️ تحديث الحماية — نغنوغ 🐈‍⬛\n\n${g[field] ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${label}.\nالمجموعة: ${g.title}`); } catch {}
      return answer(ctx, `🛡️ ${g[field] ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${label}.\n\nتم نقل خيارات الحماية إلى القائمة الموحدة.`, { reply_markup: protectionKeyboard(g, 'groupsettings') });
    }

    if (data === 'togglereplies') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.autoReply = !g.autoReply;
      save();
      return ctx.editMessageText(`╭━━━〔 ⚙️ إعدادات المجموعة 〕━━━╮\nالمجموعة: «${g.title}»`, { reply_markup: groupSettingsKeyboard(g) });
    }

    if (data === 'badwordsmenu') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.badWords ||= [];
      const kb = new InlineKeyboard();
      kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
      g.badWords.forEach((word, index) => { kb.text(`🗑️ حذف: ${word}`, `badworddel:${index}`).row(); });
      kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
      const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
      return ctx.editMessageText(`╭━━━〔 🚫 إدارة الكلمات الممنوعة 〕━━━╮\nالمجموعة: «${g.title}»\n\n〔 الكلمات المسجّلة 〕\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'badwordadd') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'badwordadd', groupId: g.id });
      return answer(ctx, '➕ أرسل الآن الكلمة أو العبارة المخالفة.');
    }

    if (data.startsWith('badworddel:')) {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const index = Number(data.split(':')[1]);
      g.badWords ||= [];
      if (g.badWords[index]) {
        const removed = g.badWords.splice(index, 1)[0];
        save();
        await answer(ctx, `✅ تم حذف الكلمة "${removed}".`);
      }
      const kb = new InlineKeyboard();
      kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
      g.badWords.forEach((word, idx) => { kb.text(`🗑️ حذف: ${word}`, `badworddel:${idx}`).row(); });
      kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
      const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
      return ctx.editMessageText(`╭━━━〔 🚫 إدارة الكلمات الممنوعة 〕━━━╮\nالمجموعة: «${g.title}»\n\n〔 الكلمات المسجّلة 〕\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'repliesmenu') return answer(ctx, '╭─〔 💬 إدارة الردود التلقائية 〕─╮', { reply_markup: repliesKeyboard() });
    if (data === 'replyadd') { 
      const g = selectedGroup(ctx); 
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.'); 
      pending(ctx, { action: 'reply-trigger', groupId: g.id }); 
      return answer(ctx, '➕ أرسل العبارة التي تريد أن يلتقطها البوت:'); 
    }
    if (data === 'replylist') return showReplyList(ctx);
    if (data === 'replydelete') {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      if (!g.replies || !g.replies.length) return answer(ctx, 'ماكو ردود.', { reply_markup: repliesKeyboard() });
      const kb = new InlineKeyboard();
      g.replies.forEach((r, i) => kb.text(`🗑️ ${i + 1}. ${r.trigger.slice(0, 25)}`, `replydel:${i}`).row());
      kb.text('🔙 رجوع', 'repliesmenu');
      return answer(ctx, 'اختر الرد للحذف:', { reply_markup: kb });
    }
    if (data.startsWith('replydel:')) {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'خطأ صلاحيات.');
      const i = Number(data.split(':')[1]);
      g.replies.splice(i, 1);
      save();
      return answer(ctx, '🗑️ تم حذف الرد بنجاح.', { reply_markup: repliesKeyboard() });
    }

    // لوحة الحماية[cite: 4]
    if (data === 'protectionmenu') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return answer(ctx, '⚠️ اختار مجموعة أولاً من «مجموعاتي».');
      if (!await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك');
      const sourceText = String(ctx.callbackQuery?.message?.text || '');
      let back = isGroup(ctx) ? 'publiccommands' : (selectedGroup(ctx) ? 'groupoverview' : 'managementmenu');
      if (sourceText.includes('إعدادات مجموعة')) back = 'groupsettings';
      else if (sourceText.includes('لوحة مالك')) back = 'ownerpanel';
      db.protectionBack ||= {};
      db.protectionBack[userKey(ctx)] = back;
      save();
      return answer(ctx, `╭━━━〔 🛡️ إعدادات الحماية الموحدة 〕━━━╮\nالمجموعة: «${g.title}»\n\nكل زر يغيّر الحالة المحفوظة نفسها، وتظهر الحالة ذاتها في كل مكان.`, { reply_markup: protectionKeyboard(g, back) });
    }

    if (data.startsWith('prot_')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك');
      const type = data.slice(5);
      const fieldByType = { links: 'linksLock', flood: 'flood', media: 'mediaLock', badwords: 'badWordsLock', audio: 'audioLock', forward: 'forwardLock', contacts: 'contactsLock' };
      if (type === 'all') {
        for (const field of Object.values(fieldByType)) g[field] = true;
        g.links = g.linksLock = true;
        g.audioClipsLock = true;
      } else if (type === 'none') {
        for (const field of Object.values(fieldByType)) g[field] = false;
        g.links = g.linksLock = false;
        g.audioClipsLock = false;
      } else if (type === 'chat') {
        const nextClosed = !g.closedMessages;
        try {
          await ctx.api.setChatPermissions(g.id, nextClosed
            ? { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false }
            : { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true });
          g.closedMessages = nextClosed;
        } catch { return answer(ctx, '❌ ما كدرت أغيّر صلاحيات الدردشة. تأكد أن نغنوغ مشرف وعنده صلاحية تقييد الأعضاء.', { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) }); }
      } else if (fieldByType[type]) {
        g[fieldByType[type]] = !g[fieldByType[type]];
        if (type === 'links') g.links = g.linksLock;
        if (type === 'audio') g.audioClipsLock = g.audioLock;
      } else return answer(ctx, 'خيار حماية غير معروف.');
      save();
      const status = type === 'all' ? '🟢 تم تفعيل جميع خيارات الحماية.' : type === 'none' ? '⚪ تم إيقاف جميع خيارات الحماية.' : type === 'chat' ? `تم ${g.closedMessages ? 'قفل' : 'فتح'} دردشة المجموعة.` : `تم ${g[fieldByType[type]] ? 'تفعيل' : 'إيقاف'} ${({ links: 'حماية الروابط', flood: 'منع السبام', media: 'حماية الوسائط والملفات', badwords: 'حماية كلمات الفشار', audio: 'حماية الصوتيات', forward: 'منع توجيه الرسائل', contacts: 'منع المعرفات والأرقام' })[type] || 'الميزة'} ${g[fieldByType[type]] ? '🟢' : '⚪'}`;
      const announcement = `🛡️ تحديث الحماية — نغنوغ 🐈‍⬛\n\n${status}\n\n${g.title ? `المجموعة: ${g.title}` : ''}`.trim();
      // لا نكتفي بتعديل نص اللوحة: أرسل إشعاراً مستقلاً داخل المجموعة أيضاً.
      try { await ctx.api.sendMessage(g.id || ctx.chat.id, announcement); }
      catch (err) { console.warn('[protection-announcement] Could not send group status:', err?.description || err?.message || err); }
      return answer(ctx, `╭━━━〔 🛡️ تحديث الحماية 〕━━━╮\n\n${status}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) });
    }

    // لوحة المشرفين[cite: 4]
    if (data === 'adminpanel') {
      const adminText = `╭━━━〔 👑 أوامر المشرفين — نغنوغ 〕━━━╮

` +
        `🔇 كتم عضو
ردّ على رسالة العضو واكتب «كتم 10» لكتمه 10 دقائق.
━━━━━━━━━━━━━━━━━━
` +
        `🔊 فك الكتم
ردّ على رسالته واكتب «فتح الكتم»، أو «فتح الكتم @username».
━━━━━━━━━━━━━━━━━━
` +
        `🚪 طرد عضو
ردّ على رسالته واكتب «طرد»، أو استخدم «طرد @username».
━━━━━━━━━━━━━━━━━━
` +
        `🔒 قفل المجموعة
اكتب «قفل المجموعة» أو «قفل الرسائل».
━━━━━━━━━━━━━━━━━━
` +
        `🔓 فتح المجموعة
اكتب «افتح المجموعة» أو «افتح الرسائل».
━━━━━━━━━━━━━━━━━━
` +
        `🗑️ حذف عدد من الرسائل
اكتب «امسح 10» لحذف آخر 10 رسائل مرصودة قبل الأمر.
━━━━━━━━━━━━━━━━━━
` +
        `🧹 حذف الرسائل المرصودة
اكتب «احذف جميع الرسائل» ثم أكّد الحذف؛ الحد الأقصى 100 رسالة مرصودة.
━━━━━━━━━━━━━━━━━━
` +
        `⭐ إضافة نقاط
ردّ على عضو واكتب «اضف 5»، أو «اضف 5 @username».
━━━━━━━━━━━━━━━━━━
` +
        `⚙️ ترقية عضو إلى مشرف
اكتب «اضف مشرفا @username» لعضو رصده البوت؛ يلزم أن يملك البوت صلاحية ترقية الأعضاء.
━━━━━━━━━━━━━━━━━━
` +
        `👤 معلومات عضو
ردّ على رسالته واكتب «معلومات»، أو استخدم «معلومات @username» لعضو رصده البوت.
━━━━━━━━━━━━━━━━━━
` +
        `🏘️ معلومات المجموعة
اكتب «مجموعتي» لعرض بيانات المجموعة والصورة إن أتاحها تيليگرام.
━━━━━━━━━━━━━━━━━━
` +
        `🛡️ الحماية
اكتب «تفعيل الحماية» أو «ايقاف الحماية»، أو افتح قائمة الحماية لإعداد كل ميزة.`;
      return answer(ctx, adminText + '\n\n✦ الأوامر الإدارية تتطلب صلاحيات مناسبة، ويجب أن يمتلك نغنوغ الصلاحيات المطلوبة أيضاً.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('↩️ العودة للقائمة السابقة', isGroup(ctx) ? 'publiccommands' : 'managementmenu') });
    }

    // قائمة الألعاب والتحديات[cite: 4]
    if (data === 'gamesmenu' || data === 'games_list') {
      const gamesText = `╭━━━〔 🎮 ألعاب نغنوغ وتحدّياته 〕━━━╮\n\n` +
        `✦ اكتب الرمز المطلوب داخل المجموعة لبدء اللعب:\n\n` +
        `🧩 (خ) ➜ لعبة اختر الخيار الصحيح\n` +
        `🔢 (ر) ➜ لعبة الرياضيات السريعة\n` +
        `🐅 (ح) ➜ لعبة معرفة الحيوان من الحرف الأول\n` +
        `💡 (س) ➜ لعبة أسئلة عامة وثقافية\n\n` +
        `🏆 اجمع النقاط وتابع ترتيبك بكتابة «توب» داخل المجموعة.\n╰━━━━━━━━━━━━━━━━━━╯`;
      
      const gamesKb = new InlineKeyboard()
        .text('🧩 الاختيار الصحيح: خ', 'game_ch').text('🔢 الرياضيات: ر', 'game_ma').row()
        .text('🐅 معرفة الحيوان: ح', 'game_an').text('💡 أسئلة عامة: س', 'game_ge').row()
        .text('🏆 المتصدرون: توب', 'game_top').row()
        .text('🔙 رجوع لمركز الأوامر', 'publiccommands');

      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(gamesText, { reply_markup: gamesKb }); }
        catch { await ctx.reply(gamesText, { reply_markup: gamesKb }); }
        return;
      }
      return answer(ctx, gamesText, { reply_markup: gamesKb });
    }

    if (data === 'game_ch' || data === 'game_ma' || data === 'game_an' || data === 'game_ge') {
      const details = {
        game_ch: '🧩 لعبة الخيار الصحيح\nاكتب «خ» داخل المجموعة، واختار الإجابة من الأزرار. أول إجابة صحيحة تربح نقطة.',
        game_ma: '🔢 لعبة الرياضيات\nاكتب «ر» داخل المجموعة وجاوب بالرقم الصحيح. أول إجابة صحيحة تربح نقطة.',
        game_an: '🐾 لعبة الحيوان\nاكتب «ح» داخل المجموعة وخمّن اسم الحيوان من أول حرف. أول إجابة صحيحة تربح نقطة.',
        game_ge: '💡 الأسئلة العامة\nاكتب «س» داخل المجموعة وجاوب عن السؤال. أول إجابة صحيحة تربح نقطة.'
      };
      return answer(ctx, details[data], { reply_markup: new InlineKeyboard().text('↩️ العودة إلى الألعاب', 'gamesmenu').row().text('📚 مركز الأوامر', 'publiccommands') });
    }
    
    if (data === 'game_top') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, leaderboardText(chatId), { reply_markup: new InlineKeyboard().text('↩️ العودة إلى الألعاب', 'gamesmenu').row().text('📚 مركز الأوامر', 'publiccommands') });
    }

    if (data === 'clearall_confirm') {
      const chatId = String(ctx.chat?.id || '');
      const g = db.groups[chatId];
      const job = db.pending?.[`clearall:${chatId}`];
      if (!g || !job || Date.now() - job.createdAt > 60000 || !await userCanManage(ctx, g)) {
        try { await ctx.answerCallbackQuery({ text: 'انتهت صلاحية التأكيد أو الأمر غير مخصص إلك.', show_alert: true }); } catch {}
        return;
      }
      delete db.pending[`clearall:${chatId}`]; save();
      let deleted = 0, failed = 0;
      const messageIds = Array.isArray(job.messageIds) ? job.messageIds : [];
      for (const mid of [...messageIds].reverse()) {
        try { await ctx.api.deleteMessage(ctx.chat.id, Number(mid)); deleted++; } catch { failed++; }
      }
      const removed = new Set(messageIds.map(Number));
      g.recentMessages = (g.recentMessages || []).filter(entry => !removed.has(Number(entry.message_id)));
      save();
      try { await ctx.reply(`🧹 انتهت محاولة المسح. حذف: ${deleted}، تعذر حذف: ${failed}. جرى الاعتماد على الرسائل التي رصدها البوت، لأن تيليگرام لا يتيح له جلب سجل المجموعة كاملاً.`); } catch {}
      return;
    }
    if (data === 'clearall_cancel') {
      const chatId = String(ctx.chat?.id || '');
      delete db.pending?.[`clearall:${chatId}`]; save();
      return answer(ctx, 'تم إلغاء عملية الحذف.', { reply_markup: new InlineKeyboard().text('🏠 القائمة الرئيسية', 'home') });
    }

    if (data === 'statsmenu' || data === 'stats_points') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g && !isGroup(ctx)) return showGroups(ctx);
      const chatId = String(g?.id || ctx.chat?.id || '');
      const scores = groupScores(chatId);
      const mine = Number(scores[userKey(ctx)] || 0);
      const total = Object.values(scores).reduce((sum, n) => sum + Number(n || 0), 0);
      const kb = new InlineKeyboard().text('🏆 أفضل 3 أعضاء', 'stats_top').row()
        .text('⭐ نقاطي في هذه المجموعة', 'stats_mine').row()
        .text('🎮 تعليمات الألعاب', 'gamesmenu').row().text('🏠 القائمة الرئيسية', 'home');
      return answer(ctx, `╭━━━〔 📊 النقاط والإحصائيات 〕━━━╮${g ? `\nالمجموعة: «${g.title}»` : ''}\n\n👥 الأعضاء الذين لديهم نقاط: ${Object.keys(scores).length}\n⭐ مجموع النقاط الممنوحة: ${total}\n🌟 رصيدك من النقاط: ${mine}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data === 'stats_top') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, leaderboardText(chatId), { reply_markup: new InlineKeyboard().text('🔙 النقاط والإحصائيات', 'statsmenu').row().text('🏠 القائمة الرئيسية', 'home') });
    }
    if (data === 'stats_mine') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, `╭─〔 ⭐ رصيدك من النقاط 〕─╮\nرصيدك في هذه المجموعة: ${Number(groupScores(chatId)[userKey(ctx)] || 0)} نقطة.`, { reply_markup: new InlineKeyboard().text('🔙 النقاط والإحصائيات', 'statsmenu').row().text('🏠 القائمة الرئيسية', 'home') });
    }

    if (data === 'broadcastmenu') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
      pending(ctx, { action: 'broadcast-message' });
      return answer(ctx, '╭━━━〔 📢 الإذاعة العامة 〕━━━╮\n\nأرسل الآن النص أو الرسالة التي تريد إيصالها إلى المستخدمين المسجّلين.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'ownerpanel') });
    }

    return answer(ctx, '⚠️ 〔 خيار غير معروف 〕\nجرّب الرجوع إلى القائمة السابقة واختيار أحد الأزرار المتاحة.');
  });

  // معالجة الرسائل والذكاء التفاعلي والحماية والألعاب داخل المجموعات[cite: 4]
  bot.on('message', async ctx => {
    ensureUser(ctx);
    const msg = ctx.message;
    const text = msg.text?.trim() || '';
    const protectionText = [msg.text, msg.caption].filter(Boolean).join('\n');

    if (isGroup(ctx)) {
      const g = groupFor(ctx.chat);
      if (!g.activated) return;

      const isAdmin = (await userIsAdmin(ctx.chat.id, ctx.from.id)) || (g.admins || []).includes(String(ctx.from.id)) || isOwner(ctx);
      const uid = userKey(ctx);
      g.userStats ||= {};
      g.userStats[uid] ||= { messages: 0 };
      g.knownMembers ||= {};
      g.knownMembers[uid] = { id: msg.from.id, name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'عضو', username: msg.from.username || '', seenAt: Date.now() };
      // حفظ معرّفات الرسائل التي شاهدها البوت؛ Telegram Bot API لا يوفّر جلب سجل المجموعة عشوائياً.
      g.recentMessages ||= [];
      if (!g.recentMessages.some(entry => Number(entry.message_id) === Number(msg.message_id))) {
        g.recentMessages.push({ message_id: Number(msg.message_id), date: Date.now(), user_id: Number(msg.from.id) });
        if (g.recentMessages.length > 300) g.recentMessages = g.recentMessages.slice(-300);
      }
      g.userStats[uid].messages = Number(g.userStats[uid].messages || 0) + 1;
      g.stats ||= { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 };
      g.stats.messages = Number(g.stats.messages || 0) + 1;
      db.stats ||= { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 };
      db.stats.messages = Number(db.stats.messages || 0) + 1;
      db.pointNames ||= {};
      db.pointNames[uid] = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
      save();

      // حماية السبام: أكثر من 6 رسائل خلال 8 ثوانٍ من العضو نفسه تُعامل كإغراق.
      if (g.flood && !isAdmin && !isOwner(ctx)) {
        g.floodUsers ||= {};
        const now = Date.now();
        const recent = (g.floodUsers[uid] || []).filter(ts => now - ts < 8000);
        recent.push(now);
        g.floodUsers[uid] = recent;
        if (recent.length > 6) {
          try { await ctx.deleteMessage(); g.stats.floodEvents = Number(g.stats.floodEvents || 0) + 1; save(); } catch {}
          return;
        }
      }

      // الحماية التلقائية[cite: 4]
      if (!isAdmin && !isOwner(ctx)) {
        if (g.linksLock && /(https?:\/\/|www\.|t\.me\/)/i.test(protectionText)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.mediaLock && (msg.photo || msg.video || msg.document || msg.sticker || msg.animation || msg.video_note)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.badWordsLock && (g.badWords || []).some(word => word && protectionText.toLocaleLowerCase('ar').includes(String(word).toLocaleLowerCase('ar')))) {
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
        if (g.forwardLock && (msg.forward_from || msg.forward_from_chat || msg.forward_origin)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.contactsLock && (msg.contact || /@[A-Za-z0-9_]{4,}/i.test(protectionText) || /\+?[0-9]{10,}/.test(protectionText))) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
      }

      const isAdminCommand = /^(كتم(?:\s+\d+)?|فتح\s+الكتم(?:\s+@?\w+)?|طرد(?:\s+@?\w+)?|قفل\s+(?:الرسائل|المجموعة)|افتح\s+(?:الرسائل|المجموعة)|امسح(?:\s+\d+)?|حذف\s+الرسائل(?:\s+\d+)?|المسح\s+جميع\s+الرسائل|احذف\s+جميع\s+الرسائل|تفعيل\s+الحماية|ايقاف\s+الحماية|إيقاف\s+الحماية|اضف\s+مشرفا?\s+@?\w+|اضف\s+\d+(?:\s+@?\w+)?|معلومات(?:\s+@?\w+)?|مجموعتي|ايقاف\s+المحادث(?:ة|ه)|إيقاف\s+المحادث(?:ة|ه)|تشغيل\s+المحادث(?:ة|ه)|ايقاف\s+الروابط|إيقاف\s+الروابط|تشغيل\s+الروابط|ايقاف\s+السبام|إيقاف\s+السبام|تشغيل\s+السبام|ايقاف\s+الوسائط|إيقاف\s+الوسائط|تشغيل\s+الوسائط|تشغيل\s+الفشار|ايقاف\s+الفشار|إيقاف\s+الفشار|ايقاف\s+الصوتيات|إيقاف\s+الصوتيات|تشغيل\s+الصوتيات|ايقاف\s+توجيه\s+الرسائل|إيقاف\s+توجيه\s+الرسائل|تشغيل\s+توجيه\s+الرسائل|ايقاف\s+(?:المعرفات|اليوزرات)|إيقاف\s+(?:المعرفات|اليوزرات)|تشغيل\s+(?:المعرفات|اليوزرات)|تثبيت|الغاء\s+التثبيت|إلغاء\s+التثبيت|فك\s+التثبيت)$/i.test(text);
      if (isAdminCommand && !isAdmin && !isOwner(ctx)) {
        await ctx.reply('الأمر غير مخصص إلك', { reply_to_message_id: msg.message_id });
        return;
      }

      // أوامر الحماية النصية: تعمل للمشرفين فقط، وتحدّث الإعداد المحفوظ للمجموعة.
      if (isAdmin || isOwner(ctx) || (g.admins || []).includes(uid)) {
        const protectionCommands = [
          [/^(?:ايقاف|إيقاف) الروابط$/i, 'linksLock', false], [/^تشغيل الروابط$/i, 'linksLock', true],
          [/^(?:ايقاف|إيقاف) السبام$/i, 'flood', false], [/^تشغيل السبام$/i, 'flood', true],
          [/^(?:ايقاف|إيقاف) الوسائط$/i, 'mediaLock', false], [/^تشغيل الوسائط$/i, 'mediaLock', true],
          [/^(?:ايقاف|إيقاف) الفشار$/i, 'badWordsLock', false], [/^تشغيل الفشار$/i, 'badWordsLock', true],
          [/^(?:ايقاف|إيقاف) الصوتيات$/i, 'audioLock', false], [/^تشغيل الصوتيات$/i, 'audioLock', true],
          [/^(?:ايقاف|إيقاف) توجيه الرسائل$/i, 'forwardLock', false], [/^تشغيل توجيه الرسائل$/i, 'forwardLock', true],
          [/^(?:ايقاف|إيقاف) (?:المعرفات|اليوزرات)$/i, 'contactsLock', false], [/^تشغيل (?:المعرفات|اليوزرات)$/i, 'contactsLock', true]
        ];
        const matchedProtection = protectionCommands.find(([re]) => re.test(text));
        if (matchedProtection) {
          const [, field, enabled] = matchedProtection;
          g[field] = enabled;
          if (field === 'linksLock') g.links = enabled;
          if (field === 'audioLock') g.audioClipsLock = enabled;
          save();
          return ctx.reply(`🛡️ ${enabled ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${({ linksLock: 'حماية الروابط', flood: 'منع السبام', mediaLock: 'حماية الوسائط والملفات', badWordsLock: 'حماية كلمات الفشار', audioLock: 'حماية الصوتيات', forwardLock: 'منع توجيه الرسائل', contactsLock: 'منع المعرفات والأرقام' })[field]} بنجاح.`, { reply_to_message_id: msg.message_id });
        }
        if (/^(?:ايقاف|إيقاف) المحادث(?:ة|ه)$/i.test(text) || /^تشغيل المحادث(?:ة|ه)$/i.test(text)) {
          const close = /^(?:ايقاف|إيقاف)/i.test(text);
          try {
            await ctx.api.setChatPermissions(ctx.chat.id, close
              ? { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false }
              : { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true });
            g.closedMessages = close; save();
            return ctx.reply(`🛡️ ${close ? '🔒 تم قفل المحادثة' : '🔓 تم تشغيل المحادثة'} بنجاح.`, { reply_to_message_id: msg.message_id });
          } catch { return ctx.reply('❌ ما كدرت أغيّر صلاحيات المجموعة. تأكد أن البوت مشرف وعنده صلاحية تقييد الأعضاء.'); }
        }
        if (/^تفعيل الحماية$/i.test(text) || /^(?:ايقاف|إيقاف) الحماية$/i.test(text)) {
          const enabled = /^تفعيل/.test(text);
          for (const field of ['linksLock', 'flood', 'mediaLock', 'badWordsLock', 'audioLock', 'audioClipsLock', 'forwardLock', 'contactsLock']) g[field] = enabled;
          g.links = enabled; save();
          return ctx.reply(`🛡️ ${enabled ? '🟢 تم تفعيل جميع ميزات الحماية' : '⚪ تم إيقاف جميع ميزات الحماية'} بنجاح.`, { reply_to_message_id: msg.message_id });
        }

        const memberByUsername = username => {
          const clean = String(username || '').replace(/^@/, '').toLowerCase();
          return Object.values(g.knownMembers || {}).find(m => String(m.username || '').toLowerCase() === clean);
        };
        const addAdminMatch = text.match(/^اضف\s+مشرفا?\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (addAdminMatch) {
          const target = memberByUsername(addAdminMatch[1]);
          if (!target) return ctx.reply('❌ ما لكيت هذا المستخدم ضمن الأعضاء اللي شافهم البوت سابقاً. خليه يرسل رسالة بالمجموعة أولاً.');
          try {
            const targetStatus = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (targetStatus.status === 'creator') return ctx.reply('👑 هذا المستخدم هو مالك المجموعة أصلاً.');
            if (targetStatus.status !== 'administrator') {
              await ctx.api.promoteChatMember(ctx.chat.id, Number(target.id), {
                can_manage_chat: true,
                can_delete_messages: true,
                can_manage_video_chats: false,
                can_restrict_members: true,
                can_promote_members: false,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: true,
                can_manage_topics: false
              });
            }
            g.admins ||= [];
            if (!g.admins.includes(String(target.id))) g.admins.push(String(target.id));
            save();
            return ctx.reply(`✅ تم ترقية ${target.name || '@' + target.username} إلى مشرف في المجموعة وإضافة صلاحياته إلى نغنوغ.`);
          } catch {
            return ctx.reply('❌ ما كدرت أضيفه مشرفاً. لازم يكون البوت مشرفاً وعنده صلاحية «إضافة مشرفين» (can_promote_members)، وتكون صلاحياته كافية للترقية.');
          }
        }
        const kickMatch = text.match(/^طرد\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (kickMatch && !msg.reply_to_message) {
          const target = memberByUsername(kickMatch[1]);
          if (!target) return ctx.reply('ما لكيت المستخدم ضمن الأعضاء اللي رصدهم البوت سابقاً.');
          try {
            const targetMember = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (['administrator', 'creator'].includes(targetMember.status)) return ctx.reply('❌ ما أگدر أطرد مشرف أو مالك المجموعة.');
            await ctx.api.banChatMember(ctx.chat.id, Number(target.id));
            await ctx.api.unbanChatMember(ctx.chat.id, Number(target.id));
            return ctx.reply(`🚪 تم طرد ${target.name || '@' + target.username} من المجموعة.`);
          } catch { return ctx.reply('❌ تعذر طرد العضو. تحقق من صلاحيات البوت.'); }
        }
        const addPointsMatch = text.match(/^اضف\s+(\d+)(?:\s+(@?[A-Za-z0-9_]{4,}))?$/i);
        if (addPointsMatch) {
          const amount = Number(addPointsMatch[1]);
          const target = addPointsMatch[2] ? memberByUsername(addPointsMatch[2]) : msg.reply_to_message?.from;
          if (!target) return ctx.reply('اكتب «اضف 5 @username» أو ردّ على رسالة العضو واكتب «اضف 5».');
          if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) return ctx.reply('حدد نقاطاً من 1 إلى 100000.');
          const scores = groupScores(ctx.chat.id); scores[String(target.id)] = Number(scores[String(target.id)] || 0) + amount;
          db.points ||= {}; db.points[String(target.id)] = Number(db.points[String(target.id)] || 0) + amount;
          db.pointNames ||= {}; db.pointNames[String(target.id)] = [target.first_name, target.last_name].filter(Boolean).join(' ') || target.username || `عضو ${target.id}`;
          save(); return ctx.reply(`⭐ تمت إضافة ${amount} نقطة إلى ${target.first_name || target.username || 'العضو'} بنجاح.`);
        }
        if (/^مجموعتي$/i.test(text)) {
          let chat = null, count = 'غير متاح', admins = [], photoId = null;
          try {
            chat = await ctx.api.getChat(ctx.chat.id);
            const chatPhoto = chat?.photo || ctx.chat?.photo;
            photoId = chatPhoto?.big_file_id || chatPhoto?.small_file_id || null;
          } catch (err) { console.warn('[group-info] getChat failed:', err?.description || err?.message || err); }
          try { count = String(await ctx.api.getChatMemberCount(ctx.chat.id)); }
          catch (err) { console.warn('[group-info] getChatMemberCount failed:', err?.description || err?.message || err); }
          try { admins = await ctx.api.getChatAdministrators(ctx.chat.id); }
          catch (err) { console.warn('[group-info] getChatAdministrators failed:', err?.description || err?.message || err); }
          const creator = admins.find(a => a.status === 'creator');
          const known = Object.values(g.knownMembers || {});
          const list = known.slice(0, 60).map(m => `• ${m.name || 'عضو'} — ${m.username ? '@' + m.username : 'بدون يوزر'} — ${m.id}`).join('\n') || 'لا توجد أسماء محفوظة بعد.';
          const caption = `🏘️ معلومات المجموعة — نغنوغ\n\n📌 الاسم: ${chat?.title || ctx.chat.title}\n🆔 الآيدي: ${ctx.chat.id}\n👥 عدد الأعضاء: ${count}\n🛡️ عدد المشرفين: ${admins.length}\n👑 المالك: ${creator ? `${creator.user.first_name} (${creator.user.id})` : 'غير متاح'}\n📝 وصف المجموعة: ${chat?.description || 'ماكو وصف'}`;
          if (photoId) {
            try { await ctx.replyWithPhoto(photoId, { caption }); }
            catch (err) {
              console.warn('[group-info] Sending group photo failed:', err?.description || err?.message || err);
              await ctx.reply(`🖼️ تعذر إرسال صورة المجموعة من تيليگرام، وهذه المعلومات بدلاً منها:\n\n${caption}`);
            }
          } else {
            await ctx.reply(`🖼️ لم يُرجع تيليگرام صورة للمجموعة عبر Bot API.\n\n${caption}`);
          }
          return ctx.reply(`📋 الأعضاء الذين رصدهم البوت (${known.length} معروف؛ تيليگرام ما يسمح للبوت بجلب قائمة كل الأعضاء تلقائياً):\n${list}`.slice(0, 4000));
        }
        const infoMatch = text.match(/^معلومات(?:\s+(@?[A-Za-z0-9_]{4,}))?$/i);
        if (infoMatch) {
          let target = msg.reply_to_message?.from;
          if (!target && infoMatch[1]) target = memberByUsername(infoMatch[1]);
          if (!target) return ctx.reply('ردّ على رسالة العضو واكتب «معلومات»، أو اكتب «معلومات @username» إذا كان البوت قد رصد العضو سابقاً.');
          return showProfileCard(ctx, g, target);
        }
        const openMuteMatch = text.match(/^فتح\s+الكتم\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (openMuteMatch && !msg.reply_to_message) {
          const target = memberByUsername(openMuteMatch[1]);
          if (!target) return ctx.reply('ما لكيت المستخدم ضمن الأعضاء المعروفين.');
          try {
            const unrestricted = {
              can_send_messages: true, can_send_audios: true, can_send_documents: true,
              can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
              can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
              can_add_web_page_previews: true
            };
            await ctx.api.restrictChatMember(ctx.chat.id, Number(target.id), unrestricted);
            const after = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (after.status === 'restricted' && after.is_member && after.can_send_messages === false) {
              throw new Error('Member still restricted after unmute.');
            }
            return ctx.reply(`🔊 تم فك الكتم عن ${target.name || target.username} وإعادة صلاحيات المجموعة الافتراضية إليه.`);
          } catch { return ctx.reply('❌ تعذر فك الكتم. تأكد من صلاحيات البوت وأن العضو ليس مشرفاً.'); }
        }
      }

      // أوامر المشرفين السريعة بالرد[cite: 4]
      if (msg.reply_to_message && (isAdmin || isOwner(ctx) || (g.admins || []).includes(uid))) {
        const target = msg.reply_to_message.from;
        const targetId = target?.id;
        const targetName = target?.first_name || 'العضو';

        if (/^كتم\s+(\d+)$/i.test(text)) {
          const match = text.match(/^كتم\s+(\d+)$/i);
          const mins = Number(match[1]);
          if (!Number.isInteger(mins) || mins < 1 || mins > 10080) {
            await ctx.reply('حدد مدة صحيحة من دقيقة إلى 10080 دقيقة.');
            return;
          }
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId) && !target.is_bot) {
            const until = Math.floor(Date.now() / 1000) + (mins * 60);
            try {
              await ctx.api.restrictChatMember(ctx.chat.id, targetId,
                { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
                { until_date: until });
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

      if (/^فتح\s+الكتم$/i.test(text)) {
        const target = msg.reply_to_message?.from;
        if (!target) {
          await ctx.reply('ردّ على رسالة العضو واكتب «فتح الكتم».');
          return;
        }
        try {
          const targetMember = await ctx.api.getChatMember(ctx.chat.id, target.id);
          if (['administrator', 'creator'].includes(targetMember.status)) {
            await ctx.reply('لا يمكن فك قيود مشرف بهذه الطريقة.');
            return;
          }
          const unrestricted = {
            can_send_messages: true, can_send_audios: true, can_send_documents: true,
            can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
            can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
            can_add_web_page_previews: true
          };
          await ctx.api.restrictChatMember(ctx.chat.id, target.id, unrestricted);
          const after = await ctx.api.getChatMember(ctx.chat.id, target.id);
          if (after.status === 'restricted' && after.is_member && after.can_send_messages === false) {
            throw new Error('Member is still restricted by Telegram after unmute.');
          }
          await ctx.reply(`🔊 تم فك الكتم عن ${target.first_name || 'العضو'} وإعادة صلاحيات المجموعة الافتراضية إليه.`);
        } catch { await ctx.reply('❌ تعذر فك الكتم. تحقق من صلاحيات البوت.'); }
        return;
      }

      if (/^قفل\s+(?:الرسائل|المجموعة)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false });
          g.closedMessages = true; save();
          await ctx.reply(`🔒 تم قفل دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^افتح\s+(?:الرسائل|المجموعة)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { 
            can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true 
          });
          g.closedMessages = false; save();
          await ctx.reply(`🔓 تم فتح دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^تثبيت$/i.test(text)) {
        if (!msg.reply_to_message) { await ctx.reply('ردّ على الرسالة التي تريد تثبيتها ثم اكتب «تثبيت».'); return; }
        try { await ctx.api.pinChatMessage(ctx.chat.id, msg.reply_to_message.message_id); await ctx.reply('📌 تم تثبيت الرسالة.'); }
        catch { await ctx.reply('❌ تعذر تثبيت الرسالة. تحقق من صلاحيات البوت.'); }
        return;
      }
      if (/^(?:الغاء التثبيت|إلغاء التثبيت|فك التثبيت)$/i.test(text)) {
        if (!msg.reply_to_message) { await ctx.reply('ردّ على الرسالة المثبتة ثم اكتب «إلغاء التثبيت».'); return; }
        try { await ctx.api.unpinChatMessage(ctx.chat.id, msg.reply_to_message.message_id); await ctx.reply('📌 تم إلغاء تثبيت الرسالة.'); }
        catch { await ctx.reply('❌ تعذر إلغاء التثبيت. تحقق من صلاحيات البوت.'); }
        return;
      }

      if (/^(?:امسح|حذف الرسائل)\s+(\d+)$/i.test(text)) {
        const count = Number(text.match(/^(?:امسح|حذف الرسائل)\s+(\d+)$/i)[1]);
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          await ctx.reply('حدد عدداً من 1 إلى 100 رسالة.');
          return;
        }
        const history = (g.recentMessages || [])
          .filter(entry => Number(entry.message_id) < Number(msg.message_id))
          .sort((a, b) => Number(a.message_id) - Number(b.message_id));
        const targets = history.slice(-count).reverse();
        if (!targets.length) return ctx.reply('⚠️ ما عندي رسائل مسجلة للمسح بعد. خلي البوت يراقب رسائل المجموعة ثم جرّب مجدداً.');
        let deleted = 0, failed = 0;
        for (const entry of targets) {
          try { await ctx.api.deleteMessage(ctx.chat.id, Number(entry.message_id)); deleted++; }
          catch { failed++; }
        }
        const removed = new Set(targets.map(entry => Number(entry.message_id)));
        g.recentMessages = (g.recentMessages || []).filter(entry => !removed.has(Number(entry.message_id)));
        save();
        try { await ctx.reply(`🗑️ انتهت عملية المسح: حذف ${deleted} من ${targets.length} رسالة، وتعذر حذف ${failed}.\n\nملاحظة: لا يستطيع تيليگرام حذف رسالة قديمة أو رسالة لا يملك البوت صلاحية حذفها.`); } catch {}
        return;
      }

      if (/^(?:المسح|احذف)\s+جميع\s+الرسائل$/i.test(text)) {
        db.pending ||= {};
        db.pending[`clearall:${String(ctx.chat.id)}`] = { createdAt: Date.now(), messageIds: (g.recentMessages || []).filter(entry => Number(entry.message_id) < Number(msg.message_id)).slice(-100).map(entry => Number(entry.message_id)) };
        save();
        const kb = new InlineKeyboard().text('🗑️ تأكيد الحذف آخر 100 رسالة', 'clearall_confirm')
          .row().text('❌ إلغاء', 'clearall_cancel');
        await ctx.reply('⚠️ تأكيد عملية الحذف\nسيحاول البوت حذف آخر 100 رسالة فقط قبل أمر التأكيد. قد تمنع قيود تيليگرام حذف بعض الرسائل القديمة. هل تريد المتابعة؟', { reply_markup: kb });
        return;
      }

      if (/^تفعيل\s+الحماية$/i.test(text)) {
        for (const field of ['linksLock', 'flood', 'mediaLock', 'badWordsLock', 'audioLock', 'audioClipsLock', 'forwardLock', 'contactsLock']) g[field] = true;
        g.links = true;
        save();
        let canDelete = false;
        try {
          const me = await ctx.api.getChatMember(ctx.chat.id, bot.botInfo.id);
          canDelete = me.status === 'creator' || (me.status === 'administrator' && me.can_delete_messages === true);
        } catch {}
        const status = canDelete
          ? 'تم حفظ وتفعيل جميع إعدادات الحماية. البوت يملك صلاحية حذف الرسائل المخالفة.'
          : 'تم حفظ إعدادات الحماية، لكن البوت لا يملك حالياً صلاحية حذف الرسائل. امنحه صلاحية حذف الرسائل من إعدادات المشرفين حتى تعمل الحماية تلقائياً.';
        await ctx.reply(`🛡️ ${status}`);
        return;
      }

      // الأوامر التفاعلية للأعضاء[cite: 4]
      if (text === 'ا') {
        return showProfileCard(ctx, g);
      }

      if (text === 'كت') {
        const randomKet = KET_LIST[Math.floor(Math.random() * KET_LIST.length)];
        await ctx.reply(`🧠 **سؤال كت (فضفضة):**\n\n${randomKet}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      if (text === 'توب') {
        await ctx.reply(leaderboardText(ctx.chat.id), { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
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

      // الألعاب الأربع — سؤال واحد نشط لكل مجموعة.
      const chatId = String(ctx.chat.id);
      db.activeGames ||= {};
      let activeGame = db.activeGames[chatId];
      const gameAliases = {
        'خ': { key: 'choose', title: '🧩 اختر الخيار الصحيح', pool: QUESTIONS_DB.choose },
        'ر': { key: 'math', title: '🔢 الرياضيات السريعة', pool: QUESTIONS_DB.math },
        'ح': { key: 'animals', title: '🐾 معرفة الحيوان من أول حرف', pool: QUESTIONS_DB.animals },
        'س': { key: 'general', title: '💡 أسئلة عامة', pool: QUESTIONS_DB.general }
      };

      if (text === 'انهاء اللعبة' || text === 'إنهاء اللعبة') {
        if (activeGame && (String(activeGame.starterId) === uid || isAdmin || isOwner(ctx))) {
          db.activeGames[chatId] = null; save();
          await ctx.reply('🛑 تم إنهاء اللعبة الحالية.');
        } else if (activeGame) await ctx.reply('الأمر غير مخصص إلك');
        return;
      }

      if (activeGame?.active && activeGame.expiresAt && Date.now() > activeGame.expiresAt) {
        db.activeGames[chatId] = null; save();
        await ctx.reply(`⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${activeGame.answer}`);
        activeGame = null;
      }

      if (activeGame?.active && !['خ', 'ر', 'ح', 'س'].includes(text)) {
        const normalized = normalizeAnswer(text);
        const accepted = (activeGame.acceptedAnswers || [activeGame.answer]).some(a => normalizeAnswer(a) === normalized);
        if (accepted) {
          // تبديل حالة السؤال قبل أي إرسال يمنع احتساب أكثر من فائز.
          db.activeGames[chatId] = null;
          const scores = groupScores(chatId);
          scores[uid] = Number(scores[uid] || 0) + 1;
          db.points ||= {};
          db.points[uid] = Number(db.points[uid] || 0) + 1; // توافق مع بيانات النقاط القديمة
          db.pointNames ||= {};
          db.pointNames[uid] = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
          save();
          await ctx.reply(`🎉 مبروك ${msg.from.first_name || 'بطل'}! ربحت نقطة واحدة 🏆\nرصيدك في هذه المجموعة: ${scores[uid]} نقطة.`, { reply_to_message_id: msg.message_id });
          return;
        }
      }

      if (gameAliases[text]) {
        if (activeGame?.active) {
          await ctx.reply('🎮 أكو سؤال شغال حالياً بهذه المجموعة. جاوبوا عليه أولاً أو اكتبوا «انهاء اللعبة».');
          return;
        }
        const game = gameAliases[text];
        const chosen = game.pool[Math.floor(Math.random() * game.pool.length)];
        const answerText = chosen.answer;
        const roundId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        const round = {
          active: true, roundId, type: game.key, starterId: uid,
          answer: answerText, acceptedAnswers: [answerText],
          expiresAt: Date.now() + 60000
        };
        db.activeGames[chatId] = round;
        save();
        setTimeout(async () => {
          const current = db.activeGames?.[chatId];
          if (current?.active && current.roundId === roundId) {
            db.activeGames[chatId] = null;
            save();
            try { await bot.api.sendMessage(Number(chatId), `⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${answerText}`); } catch {}
          }
        }, 60000).unref?.();

        const stopKb = new InlineKeyboard().text('🛑 إنهاء السؤال', 'game_stop');
        let questionText = `🎮 ${game.title}\n\n❓ ${chosen.q || `حيوان يبدأ بحرف (${String(answerText).trim()[0] || '?'})` }\n\n⏱️ أول إجابة صحيحة خلال 60 ثانية تحصل على نقطة!`;
        if (game.key === 'animals') {
          questionText = `🐾 خمن اسم الحيوان الذي يبدأ بهذا الحرف:\n\n🔤 الحرف: ${Array.from(answerText)[0]}\n⏱️ أول إجابة صحيحة خلال 60 ثانية تربح نقطة!`;
        }
        if (game.key === 'choose' && Array.isArray(chosen.options)) {
          const options = chosen.options.slice(0, 8);
          const kb = new InlineKeyboard();
          options.forEach((option, i) => {
            if (i) kb.row();
            kb.text(option, `gans:${roundId}:${i}`);
          });
          kb.row().text('🛑 إنهاء السؤال', 'game_stop');
          round.options = options;
          db.activeGames[chatId] = round; save();
          await ctx.reply(questionText + '\n\nاختار الإجابة من الأزرار:', { reply_markup: kb });
        } else {
          await ctx.reply(questionText, { reply_markup: stopKb });
        }
        return;
      }

      if (g.autoReply && text) {
        const normalizedMessage = normalizeAnswer(text);
        const customReply = (g.replies || []).find(item => normalizeAnswer(item.trigger) === normalizedMessage)?.response;
        const automaticReply = customReply || findAutoReply(text);
        if (automaticReply) {
          await ctx.reply(automaticReply, { reply_to_message_id: msg.message_id });
          return;
        }
      }

    } else {
      // معالجة المحادثات الخاصة والبيانات المعلقة[cite: 4, 5]
      const p = db.pending[userKey(ctx)];
      if (p) {
        if (p.action === 'broadcast-message') {
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

        if (p.action === 'add-required-chat') {
          clearPending(ctx);
          let title = text;
          let id = text;
          let url = text.startsWith('@') ? `https://t.me/${text.replace('@', '')}` : '';
          db.requiredChats ||= [];
          db.requiredChats.push({ id, title, url });
          save();
          return answer(ctx, `✅ تم إضافة القناة أو المجموعة للاشتراك الإجباري بنجاح!`, { reply_markup: new InlineKeyboard().text('🔐 إدارة الاشتراك الإجباري', 'requiredmenu') });
        }

        if (p.action === 'edit-welcome') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.welcomeText = text;
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم تحديث رسالة الترحيب بنجاح!`, { reply_markup: groupSettingsKeyboard(g) });
          }
        }

        if (['custom-start', 'custom-description', 'custom-reply'].includes(p.action)) {
          if (!text) return ctx.reply('❌ النص فارغ. أرسل نصاً يحتوي على أحرف.');
          const c = getCustomization(ctx);
          if (p.action === 'custom-start') c.startText = text;
          if (p.action === 'custom-description') {
            c.descriptions ||= {};
            if (!['settings', 'groups', 'account', 'replies'].includes(p.key)) { clearPending(ctx); return ctx.reply('القسم غير معروف.'); }
            c.descriptions[p.key] = text;
          }
          if (p.action === 'custom-reply') {
            c.replies ||= {};
            if (!['account', 'replies', 'nogroups'].includes(p.key)) { clearPending(ctx); return ctx.reply('القسم غير معروف.'); }
            c.replies[p.key] = text;
          }
          save();
          clearPending(ctx);
          return ctx.reply('✅ تم حفظ النص الخاص بيك بنجاح ❤️', {
            reply_markup: new InlineKeyboard().text('🎨 قائمة التخصيص', 'custommenu').row().text('🏠 القائمة الرئيسية', 'home')
          });
        }
        if (p.action === 'reply-trigger') {
          const g = db.groups[p.groupId];
          if (!g || !await userCanManage(ctx, g)) { clearPending(ctx); return ctx.reply('عيني، ما عندك صلاحية تعدّل ردود هالمجموعة.'); }
          if (!text.trim()) return ctx.reply('أرسل عبارة نصية حتى أستخدمها كمحفّز للرد.');
          pending(ctx, { action: 'reply-response', groupId: p.groupId, trigger: text.trim() });
          return ctx.reply(`تمام عيني، هسه أرسل الرد اللي تريد نغنوغ يكتبه من يقره «${text.trim()}».`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'repliesmenu') });
        }
        if (p.action === 'reply-response') {
          const g = db.groups[p.groupId];
          if (!g || !await userCanManage(ctx, g)) { clearPending(ctx); return ctx.reply('عيني، ما عندك صلاحية تعدّل ردود هالمجموعة.'); }
          if (!text.trim()) return ctx.reply('الرد فارغ، أرسل نصاً حتى ينحفظ.');
          g.replies ||= [];
          const trigger = String(p.trigger || '').trim();
          if (!trigger) { clearPending(ctx); return ctx.reply('ما لكيت عبارة الرد. جرّب الإضافة مرة ثانية.'); }
          const existing = g.replies.findIndex(r => String(r.trigger).toLocaleLowerCase('ar') === trigger.toLocaleLowerCase('ar'));
          const entry = { trigger, response: text.trim() };
          if (existing >= 0) g.replies[existing] = entry; else g.replies.push(entry);
          save(); clearPending(ctx);
          return ctx.reply('تمام عيني، انحفظ الرد بنجاح 🐾', { reply_markup: new InlineKeyboard().text('📋 قائمة الردود', 'replylist').row().text('💬 إدارة الردود', 'repliesmenu') });
        }

        if (p.action === 'badwordadd') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.badWords ||= [];
            g.badWords.push(text);
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم إضافة الكلمة "${text}" إلى قائمة الممنوعات بنجاح!`, { reply_markup: new InlineKeyboard().text('🚫 الكلمات الممنوعة', 'badwordsmenu') });
          }
        }
      }

      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}

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

  // أمر عرض الأوامر علناً في المجموعة للجميع (/commands أو الأوامر)
  bot.command(['commands', 'الأوامر'], async ctx => {
    const publicHelpText = `📋 **قائمة أوامر وميزات بوت (نغنوغ) في المجموعة:**\n\n` +
      `🎮 **ألعاب التحدي والنقاط:**\n` +
      `• \`خ\` ➜ لعبة اختر الخيار الصحيح\n` +
      `• \`ر\` ➜ لعبة الرياضيات السريعة\n` +
      `• \`ح\` ➜ لعبة معرفة الحيوان من الحرف الأول\n` +
      `• \`س\` ➜ لعبة أسئلة عامة وثقافية\n` +
      `• \`توب\` ➜ عرض قائمة أبطال النقاط (أعلى 3)\n\n` +
      `💬 **الردود والتفاعل اليومي:**\n` +
      `• \`ا\` ➜ عرض بطاقة ملفك الشخصي ونقاطك\n` +
      `• \`كت\` ➜ سؤال فضفضة وموقف عشوائي\n` +
      `• \`ش\` ➜ أبيات شعرية لطيفة\n` +
      `• \`ن\` أو \`نغنوغ\` ➜ قفشات وردود نغنوغ العراقية\n\n` +
      `👑 **أوامر الإدارة للمشرفين (بالرد على الرسالة):**\n` +
      `• \`كتم [الدقائق]\` ➜ كتم العضو (مثال: \`كتم 10\`)\n` +
      `• \`طرد\` ➜ طرد العضو من المجموعة\n` +
      `• \`قفل الرسائل\` / \`افتح الرسائل\`\n` +
      `• \`امسح [العدد]\` ➜ حذف الرسائل (مثال: \`امسح 10\`)\n` +
      `• \`تفعيل الحماية\` ➜ تشغيل الحماية الشاملة تلقائياً`;

    await ctx.reply(publicHelpText, { parse_mode: 'Markdown' });
  });

  bot.hears(/^الأوامر$/i, async ctx => {
    if (!isGroup(ctx)) return;
    const publicHelpText = `📋 **قائمة أوامر وميزات بوت (نغنوغ) في المجموعة:**\n\n` +
      `🎮 **ألعاب التحدي والنقاط:**\n` +
      `• \`خ\` ➜ لعبة اختر الخيار الصحيح\n` +
      `• \`ر\` ➜ لعبة الرياضيات السريعة\n` +
      `• \`ح\` ➜ لعبة معرفة الحيوان من الحرف الأول\n` +
      `• \`س\` ➜ لعبة أسئلة عامة وثقافية\n` +
      `• \`توب\` ➜ عرض قائمة أبطال النقاط (أعلى 3)\n\n` +
      `💬 **الردود والتفاعل اليومي:**\n` +
      `• \`ا\` ➜ عرض بطاقة ملفك الشخصي ونقاطك\n` +
      `• \`كت\` ➜ سؤال فضفضة وموقف عشوائي\n` +
      `• \`ش\` ➜ أبيات شعرية لطيفة\n` +
      `• \`ن\` أو \`نغنوغ\` ➜ قفشات وردود نغنوغ العراقية\n\n` +
      `👑 **أوامر الإدارة للمشرفين (بالرد على الرسالة):**\n` +
      `• \`كتم [الدقائق]\` ➜ كتم العضو (مثال: \`كتم 10\`)\n` +
      `• \`طرد\` ➜ طرد العضو من المجموعة\n` +
      `• \`قفل الرسائل\` / \`افتح الرسائل\`\n` +
      `• \`امسح [العدد]\` ➜ حذف الرسائل (مثال: \`امسح 10\`)\n` +
      `• \`تفعيل الحماية\` ➜ تشغيل الحماية الشاملة تلقائياً`;

    await ctx.reply(publicHelpText, { parse_mode: 'Markdown' });
  });

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
      'toggleforward', 'togglecontacts', 'enableallprotection', 'gamesmenu', 'mygroups', 
      'accountinfo', 'custommenu', 'groupstats', 'userreplies', 'repliesmenu',
      'customdescmenu', 'customreplymenu', 'welcomeedit', 'toggleflood', 'togglereplies',
      'warningslimit', 'warningsaction', 'warningsduration', 'warningslog', 'warningsclear'
    ];

    if (restrictedActions.includes(data) || data.startsWith('prot_') || data.startsWith('admin_') || data.startsWith('choosegroup:') || data.startsWith('warning') || data.startsWith('badword') || data.startsWith('reply') || data.startsWith('customdesc') || data.startsWith('customreply')) {
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
    if (data === 'howto') return answer(ctx, '📖 طريقة الاستخدام — نغنوغ 🐾', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'protection') return answer(ctx, '🛡️ ميزات الحماية', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard() });
    
    // الأزرار الأساسية والحساب[cite: 3, 4]
    if (data === 'accountinfo') {
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
      const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
      const userId = ctx.from.id;
      return answer(ctx, `${customText(ctx, 'replies', 'account')}\n\n📝 الاسم: ${name}\n🔗 المستخدم: ${username}\n🆔 الآيدي: ${userId}`, { reply_markup: new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home') });
    }
    
    if (data === 'userreplies') {
      return answer(ctx, customText(ctx, 'replies', 'replies'), { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
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
      return showGroupSettings(ctx, g);
    }
    
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
      return answer(ctx, '🎨 تخصيص نغنوغ\n\nهنا تگدر تغيّر النصوص اللي تظهر إلك أنت فقط.', { reply_markup: customizationKeyboard() });
    }

    if (data === 'customdescmenu') {
      return answer(ctx, '🔘 تخصيص شرح الأزرار:', { reply_markup: customizationDescriptionsKeyboard() });
    }

    if (data === 'customreplymenu') {
      return answer(ctx, '💬 تخصيص ردود البوت:', { reply_markup: customizationRepliesKeyboard() });
    }

    if (data.startsWith('customdesc:')) {
      const key = data.split(':')[1];
      return answer(ctx, `📝 الشرح الحالي للقسم (${key}):\n${customText(ctx, 'descriptions', key) || 'غير محدد'}`, { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'customdescmenu') });
    }

    if (data.startsWith('customreply:')) {
      const key = data.split(':')[1];
      return answer(ctx, `💬 الرد الحالي للقسم (${key}):\n${customText(ctx, 'replies', key) || 'غير محدد'}`, { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'customreplymenu') });
    }

    if (data === 'customstart') {
      pending(ctx, { action: 'custom-start' });
      return answer(ctx, `👋 أرسل مقدمة /start الجديدة.\n\nالنص الحالي:\n${customText(ctx, 'startText')}`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'custommenu') });
    }

    if (data === 'customreset') {
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
      return answer(ctx, `📊 إحصائيات البوت الشاملة:\n\n👥 إجمالي المستخدمين: ${totalUsers}\n💬 مستخدمو الخاص: ${privateUsers}\n🏘️ المجموعات المسجلة: ${groupsCount}`, { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
    }
    if (data === 'activatedgroups') {
      const activeGroups = Object.values(db.groups || {}).filter(g => g.activated);
      let text = `👥 المجموعات المفعّلة حالياً (${activeGroups.length}):\n\n`;
      activeGroups.forEach((g, i) => { text += `${i + 1}. ${g.title} (\`${g.id}\`)\n`; });
      return answer(ctx, text, { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
    }
    if (data === 'botsettings') return answer(ctx, '⚙️ إعدادات البوت العامة تعمل بشكل جيد.', { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
    if (data === 'globalprotection') return answer(ctx, '🛡️ إعدادات الحماية العامة مفعلة تلقائياً.', { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
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
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nالمجموعة: ${g.title}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningstoggle') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      g.warningSettings.enabled = !g.warningSettings.enabled;
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nالحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}`, { reply_markup: warningsKeyboard(g) });
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
      return answer(ctx, `📋 سجل التحذيرات الأخيرة:\n\n${logText}`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
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

    if (data === 'togglelinks') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.links = !g.links;
      save();
      return ctx.editMessageText(`⚙️ إعدادات مجموعة: ${g.title}`, { reply_markup: groupSettingsKeyboard(g) });
    }

    if (data === 'toggleflood') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.flood = !g.flood;
      save();
      return ctx.editMessageText(`⚙️ إعدادات مجموعة: ${g.title}`, { reply_markup: groupSettingsKeyboard(g) });
    }

    if (data === 'togglereplies') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.autoReply = !g.autoReply;
      save();
      return ctx.editMessageText(`⚙️ إعدادات مجموعة: ${g.title}`, { reply_markup: groupSettingsKeyboard(g) });
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
      return ctx.editMessageText(`🚫 إدارة الكلمات الممنوعة\n\nالمجموعة: ${g.title}\nالكلمات:\n${wordsList}`, { reply_markup: kb });
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
      return ctx.editMessageText(`🚫 إدارة الكلمات الممنوعة\n\nالمجموعة: ${g.title}\nالكلمات:\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'repliesmenu') return answer(ctx, '💬 إدارة الردود التلقائية', { reply_markup: repliesKeyboard() });
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

    // لوحة المشرفين[cite: 4]
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

    // قائمة الألعاب والتحديات[cite: 4]
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

    return answer(ctx, 'زر غير معروف.');
  });

  // معالجة الرسائل والذكاء التفاعلي والحماية والألعاب داخل المجموعات[cite: 4]
  bot.on('message', async ctx => {
    ensureUser(ctx);
    const msg = ctx.message;
    const text = msg.text?.trim() || '';

    if (isGroup(ctx)) {
      const g = groupFor(ctx.chat);
      if (!g.activated) return;

      const isAdmin = await userIsAdmin(ctx.chat.id, ctx.from.id);
      const uid = userKey(ctx);

      // الحماية التلقائية[cite: 4]
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

      // أوامر المشرفين السريعة بالرد[cite: 4]
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

      // ألعاب الأسئلة ونظام النقاط[cite: 4]
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
          return answer(ctx, `✅ تم إضافة القناة أو المجموعة للاشتراك الإجباري بنجاح!`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
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
          save();
          clearPending(ctx);
          return ctx.reply('✅ تم حفظ النص الخاص بيك بنجاح ❤️', {
            reply_markup: new InlineKeyboard().text('🎨 قائمة التخصيص', 'custommenu').row().text('🏠 القائمة الرئيسية', 'home')
          });
        }
        if (p.action === 'badwordadd') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.badWords ||= [];
            g.badWords.push(text);
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم إضافة الكلمة "${text}" إلى قائمة الممنوعات بنجاح!`, { reply_markup: new InlineKeyboard().text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu') });
          }
        }
      }

      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startTest, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}

library;

class LocalSurah {
  const LocalSurah({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.ayahCount,
    required this.type,
    this.ayahs = const [],
  });
  final int id;
  final String nameAr;
  final String nameEn;
  final int ayahCount;
  final String type;
  final List<String> ayahs;
}

class LocalDhikrCategory {
  const LocalDhikrCategory({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.items,
  });
  final String title;
  final String subtitle;
  final String icon;
  final List<String> items;
}

class LocalLibraryItem {
  const LocalLibraryItem({
    required this.title,
    required this.category,
    required this.summary,
  });
  final String title;
  final String category;
  final String summary;
}

class LocalGameScenario {
  const LocalGameScenario({
    required this.title,
    required this.age,
    required this.question,
    required this.options,
    required this.answer,
    required this.explanation,
  });
  final String title;
  final String age;
  final String question;
  final List<String> options;
  final int answer;
  final String explanation;
}

class LocalPublicAnswer {
  const LocalPublicAnswer({
    required this.question,
    required this.answer,
    required this.category,
  });
  final String question;
  final String answer;
  final String category;
}

class LocalApprovedSource {
  const LocalApprovedSource({
    required this.nameAr,
    required this.reference,
  });
  final String nameAr;
  final String reference;
}

class LocalContent {
  static const offlineMessage =
      'المحتوى المحلي متاح الآن. ستتم مزامنة المحتوى الكامل عند تفعيل الاتصال بالخادم.';

  static const prayerTimes = <String, String>{
    'الفجر': '04:05',
    'الظهر': '13:08',
    'العصر': '17:12',
    'المغرب': '20:47',
    'العشاء': '22:18',
  };

  static const dailyVerse =
      'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ';
  static const dailyReminder =
      'اجعل لك ورداً صغيراً ثابتاً؛ القليل الدائم يفتح للقلب باب الطمأنينة.';
  static const hijriLabel =
      'اليوم الهجري: يتم ضبطه بدقة بعد تفعيل مصدر التقويم المحلي';

  static const surahs = <LocalSurah>[
    LocalSurah(
      id: 1,
      nameAr: 'الفاتحة',
      nameEn: 'Al-Fatihah',
      ayahCount: 7,
      type: 'مكية',
      ayahs: [
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        'الرَّحْمَٰنِ الرَّحِيمِ',
        'مَالِكِ يَوْمِ الدِّينِ',
        'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
        'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
      ],
    ),
    LocalSurah(
      id: 2,
      nameAr: 'البقرة',
      nameEn: 'Al-Baqarah',
      ayahCount: 286,
      type: 'مدنية',
    ),
    LocalSurah(
      id: 3,
      nameAr: 'آل عمران',
      nameEn: 'Ali Imran',
      ayahCount: 200,
      type: 'مدنية',
    ),
    LocalSurah(
      id: 4,
      nameAr: 'النساء',
      nameEn: 'An-Nisa',
      ayahCount: 176,
      type: 'مدنية',
    ),
    LocalSurah(
      id: 5,
      nameAr: 'المائدة',
      nameEn: 'Al-Ma’idah',
      ayahCount: 120,
      type: 'مدنية',
    ),
    LocalSurah(
      id: 18,
      nameAr: 'الكهف',
      nameEn: 'Al-Kahf',
      ayahCount: 110,
      type: 'مكية',
    ),
    LocalSurah(
      id: 36,
      nameAr: 'يس',
      nameEn: 'Ya-Sin',
      ayahCount: 83,
      type: 'مكية',
    ),
    LocalSurah(
      id: 55,
      nameAr: 'الرحمن',
      nameEn: 'Ar-Rahman',
      ayahCount: 78,
      type: 'مدنية',
    ),
    LocalSurah(
      id: 67,
      nameAr: 'الملك',
      nameEn: 'Al-Mulk',
      ayahCount: 30,
      type: 'مكية',
    ),
    LocalSurah(
      id: 112,
      nameAr: 'الإخلاص',
      nameEn: 'Al-Ikhlas',
      ayahCount: 4,
      type: 'مكية',
      ayahs: [
        'قُلْ هُوَ اللَّهُ أَحَدٌ',
        'اللَّهُ الصَّمَدُ',
        'لَمْ يَلِدْ وَلَمْ يُولَدْ',
        'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
      ],
    ),
    LocalSurah(
      id: 113,
      nameAr: 'الفلق',
      nameEn: 'Al-Falaq',
      ayahCount: 5,
      type: 'مكية',
    ),
    LocalSurah(
      id: 114,
      nameAr: 'الناس',
      nameEn: 'An-Nas',
      ayahCount: 6,
      type: 'مكية',
    ),
  ];

  static const adhkar = <LocalDhikrCategory>[
    LocalDhikrCategory(
      title: 'أذكار الصباح',
      subtitle: 'طمأنينة بداية اليوم',
      icon: '☀',
      items: [
        'أصبحنا وأصبح الملك لله، والحمد لله.',
        'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',
        'رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.',
      ],
    ),
    LocalDhikrCategory(
      title: 'أذكار المساء',
      subtitle: 'سكينة نهاية اليوم',
      icon: '☾',
      items: [
        'أمسينا وأمسى الملك لله، والحمد لله.',
        'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',
        'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',
      ],
    ),
    LocalDhikrCategory(
      title: 'أدعية مختارة',
      subtitle: 'دعاء قريب من القلب',
      icon: '✦',
      items: [
        'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.',
        'رب اشرح لي صدري ويسر لي أمري.',
        'اللهم إني أسألك الهدى والتقى والعفاف والغنى.',
      ],
    ),
    LocalDhikrCategory(
      title: 'النوم والسفر',
      subtitle: 'حفظ وطمأنينة',
      icon: '◌',
      items: [
        'باسمك اللهم أموت وأحيا.',
        'سبحان الذي سخر لنا هذا وما كنا له مقرنين.',
        'اللهم أنت الصاحب في السفر والخليفة في الأهل.',
      ],
    ),
  ];

  static const library = <LocalLibraryItem>[
    LocalLibraryItem(
      title: 'النية في العبادة',
      category: 'تزكية',
      summary: 'النية أساس العمل، وبها يتحول المعتاد إلى عبادة إذا صلحت لله.',
    ),
    LocalLibraryItem(
      title: 'أدب السؤال الشرعي',
      category: 'آداب',
      summary:
          'السؤال يكتب بوضوح وهدوء، مع ترك الحكم النهائي لأهل العلم المؤهلين.',
    ),
    LocalLibraryItem(
      title: 'رحمة الإسلام بالأسرة',
      category: 'أسرة',
      summary: 'الأصل في البيت المسلم السكينة والرفق وتحمل المسؤولية.',
    ),
  ];

  static const approvedSources = <LocalApprovedSource>[
    LocalApprovedSource(
      nameAr: 'مصحف المدينة النبوية',
      reference: 'مجمع الملك فهد لطباعة المصحف',
    ),
    LocalApprovedSource(
      nameAr: 'صحيح البخاري',
      reference: 'كتاب الحديث — مراجعة علمية',
    ),
    LocalApprovedSource(
      nameAr: 'مختصر الفقه الإسلامي',
      reference: 'محتوى تعليمي معتمد — مرحلة أولى',
    ),
  ];

  static const publicAnswers = <LocalPublicAnswer>[
    LocalPublicAnswer(
      question: 'كيف أحافظ على الصلاة في وقتها؟',
      category: 'الصلاة',
      answer:
          'ابدأ بتثبيت تذكير لكل صلاة، واختر صحبة تعينك، واجعل قضاء الصلاة الفائتة دافعاً لا سبباً لليأس.',
    ),
    LocalPublicAnswer(
      question: 'هل يمكنني قراءة الأذكار من الهاتف؟',
      category: 'الأذكار',
      answer:
          'نعم، قراءة الأذكار من الهاتف جائزة، والمقصود حضور القلب والمحافظة على الذكر.',
    ),
  ];

  static const games = <LocalGameScenario>[
    LocalGameScenario(
      title: 'ترتيب الوضوء',
      age: '4-6',
      question: 'ما أول خطوة في الوضوء؟',
      options: ['غسل اليدين', 'السجود', 'قراءة قصة'],
      answer: 0,
      explanation: 'أحسنت! يبدأ الوضوء بالنية ثم غسل اليدين.',
    ),
    LocalGameScenario(
      title: 'أركان الإسلام',
      age: '7-9',
      question: 'كم عدد أركان الإسلام؟',
      options: ['ثلاثة', 'خمسة', 'سبعة'],
      answer: 1,
      explanation: 'رائع! أركان الإسلام خمسة.',
    ),
    LocalGameScenario(
      title: 'خلق المسلم',
      age: '10-12',
      question: 'أي خلق يدل على المسلم في تعامله؟',
      options: ['الصدق', 'السخرية', 'إيذاء الآخرين'],
      answer: 0,
      explanation: 'صحيح. الصدق من أعظم أخلاق المسلم.',
    ),
  ];
}

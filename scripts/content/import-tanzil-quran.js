#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'data', 'islamic-sources', 'tanzil-uthmani-with-ayah-numbers.txt');
const outputPath = path.join(root, 'data', 'islamic-sources', 'quran-full-tanzil.json');
const expectedCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const names = [
  ['الفاتحة','Al-Fatihah','مكية'],['البقرة','Al-Baqarah','مدنية'],['آل عمران','Ali Imran','مدنية'],['النساء','An-Nisa','مدنية'],['المائدة','Al-Maidah','مدنية'],['الأنعام','Al-Anam','مكية'],['الأعراف','Al-Araf','مكية'],['الأنفال','Al-Anfal','مدنية'],['التوبة','At-Tawbah','مدنية'],['يونس','Yunus','مكية'],['هود','Hud','مكية'],['يوسف','Yusuf','مكية'],['الرعد','Ar-Rad','مدنية'],['إبراهيم','Ibrahim','مكية'],['الحجر','Al-Hijr','مكية'],['النحل','An-Nahl','مكية'],['الإسراء','Al-Isra','مكية'],['الكهف','Al-Kahf','مكية'],['مريم','Maryam','مكية'],['طه','Taha','مكية'],['الأنبياء','Al-Anbiya','مكية'],['الحج','Al-Hajj','مدنية'],['المؤمنون','Al-Muminun','مكية'],['النور','An-Nur','مدنية'],['الفرقان','Al-Furqan','مكية'],['الشعراء','Ash-Shuara','مكية'],['النمل','An-Naml','مكية'],['القصص','Al-Qasas','مكية'],['العنكبوت','Al-Ankabut','مكية'],['الروم','Ar-Rum','مكية'],['لقمان','Luqman','مكية'],['السجدة','As-Sajdah','مكية'],['الأحزاب','Al-Ahzab','مدنية'],['سبأ','Saba','مكية'],['فاطر','Fatir','مكية'],['يس','Ya-Sin','مكية'],['الصافات','As-Saffat','مكية'],['ص','Sad','مكية'],['الزمر','Az-Zumar','مكية'],['غافر','Ghafir','مكية'],['فصلت','Fussilat','مكية'],['الشورى','Ash-Shura','مكية'],['الزخرف','Az-Zukhruf','مكية'],['الدخان','Ad-Dukhan','مكية'],['الجاثية','Al-Jathiyah','مكية'],['الأحقاف','Al-Ahqaf','مكية'],['محمد','Muhammad','مدنية'],['الفتح','Al-Fath','مدنية'],['الحجرات','Al-Hujurat','مدنية'],['ق','Qaf','مكية'],['الذاريات','Adh-Dhariyat','مكية'],['الطور','At-Tur','مكية'],['النجم','An-Najm','مكية'],['القمر','Al-Qamar','مكية'],['الرحمن','Ar-Rahman','مدنية'],['الواقعة','Al-Waqiah','مكية'],['الحديد','Al-Hadid','مدنية'],['المجادلة','Al-Mujadila','مدنية'],['الحشر','Al-Hashr','مدنية'],['الممتحنة','Al-Mumtahanah','مدنية'],['الصف','As-Saff','مدنية'],['الجمعة','Al-Jumuah','مدنية'],['المنافقون','Al-Munafiqun','مدنية'],['التغابن','At-Taghabun','مدنية'],['الطلاق','At-Talaq','مدنية'],['التحريم','At-Tahrim','مدنية'],['الملك','Al-Mulk','مكية'],['القلم','Al-Qalam','مكية'],['الحاقة','Al-Haqqah','مكية'],['المعارج','Al-Maarij','مكية'],['نوح','Nuh','مكية'],['الجن','Al-Jinn','مكية'],['المزمل','Al-Muzzammil','مكية'],['المدثر','Al-Muddaththir','مكية'],['القيامة','Al-Qiyamah','مكية'],['الإنسان','Al-Insan','مدنية'],['المرسلات','Al-Mursalat','مكية'],['النبأ','An-Naba','مكية'],['النازعات','An-Naziat','مكية'],['عبس','Abasa','مكية'],['التكوير','At-Takwir','مكية'],['الانفطار','Al-Infitar','مكية'],['المطففين','Al-Mutaffifin','مكية'],['الانشقاق','Al-Inshiqaq','مكية'],['البروج','Al-Buruj','مكية'],['الطارق','At-Tariq','مكية'],['الأعلى','Al-Ala','مكية'],['الغاشية','Al-Ghashiyah','مكية'],['الفجر','Al-Fajr','مكية'],['البلد','Al-Balad','مكية'],['الشمس','Ash-Shams','مكية'],['الليل','Al-Layl','مكية'],['الضحى','Ad-Duha','مكية'],['الشرح','Ash-Sharh','مكية'],['التين','At-Tin','مكية'],['العلق','Al-Alaq','مكية'],['القدر','Al-Qadr','مكية'],['البينة','Al-Bayyinah','مدنية'],['الزلزلة','Az-Zalzalah','مدنية'],['العاديات','Al-Adiyat','مكية'],['القارعة','Al-Qariah','مكية'],['التكاثر','At-Takathur','مكية'],['العصر','Al-Asr','مكية'],['الهمزة','Al-Humazah','مكية'],['الفيل','Al-Fil','مكية'],['قريش','Quraysh','مكية'],['الماعون','Al-Maun','مكية'],['الكوثر','Al-Kawthar','مكية'],['الكافرون','Al-Kafirun','مكية'],['النصر','An-Nasr','مدنية'],['المسد','Al-Masad','مكية'],['الإخلاص','Al-Ikhlas','مكية'],['الفلق','Al-Falaq','مكية'],['الناس','An-Nas','مكية']
];
function normalizeArabicSearch(text) {
  return text.normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأٱآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .trim();
}
if (!fs.existsSync(inputPath)) throw new Error(`Missing ${inputPath}`);
const lines = fs.readFileSync(inputPath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
const surahs = Array.from({ length: 114 }, (_, i) => ({ id: i + 1, name_ar: names[i][0], name_en: names[i][1], revelation_type: names[i][2], ayah_count: expectedCounts[i], ayahs: [] }));
for (const line of lines) {
  const [sRaw, aRaw, ...textParts] = line.split('|');
  const surahId = Number(sRaw);
  const ayahNumber = Number(aRaw);
  const text = textParts.join('|');
  if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber) || !text) throw new Error(`Invalid line: ${line}`);
  surahs[surahId - 1].ayahs.push({ ayah_number: ayahNumber, text_uthmani: text, text_normalized: normalizeArabicSearch(text), source_id: 'tanzil-quran-text', source_approved: true });
}
const errors = [];
if (surahs.length !== 114) errors.push('surah_count_not_114');
let total = 0;
for (const surah of surahs) {
  total += surah.ayahs.length;
  if (surah.ayahs.length !== surah.ayah_count) errors.push(`surah_${surah.id}_count_${surah.ayahs.length}_expected_${surah.ayah_count}`);
  for (let i = 0; i < surah.ayahs.length; i++) if (surah.ayahs[i].ayah_number !== i + 1) errors.push(`surah_${surah.id}_ayah_sequence_error_at_${i + 1}`);
}
if (total !== 6236) errors.push(`total_ayah_count_${total}_expected_6236`);
if (errors.length) { console.error(JSON.stringify({ ok: false, errors }, null, 2)); process.exit(1); }
const payload = { schema_version: 1, content_version: 'tanzil-uthmani-v1.1-full-2021-02', source_id: 'tanzil-quran-text', attribution: { name: 'Tanzil Project', url: 'https://tanzil.net', license_url: 'https://tanzil.net/docs/Text_License' }, generated_at: new Date().toISOString(), surah_count: 114, ayah_count: total, surahs };
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, output: outputPath, surah_count: 114, ayah_count: total, content_version: payload.content_version }, null, 2));



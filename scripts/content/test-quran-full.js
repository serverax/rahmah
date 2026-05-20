#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const quranPath = path.join(root, 'data', 'islamic-sources', 'quran-full-tanzil.json');
const expectedCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const data = JSON.parse(fs.readFileSync(quranPath, 'utf8'));
const errors = [];
if (data.surah_count !== 114 || data.surahs?.length !== 114) errors.push('surah_count_invalid');
let total = 0;
data.surahs.forEach((surah, i) => {
  if (surah.ayahs.length !== expectedCounts[i]) errors.push(`surah_${i + 1}_invalid_count`);
  total += surah.ayahs.length;
  surah.ayahs.forEach((ayah, j) => {
    if (ayah.ayah_number !== j + 1) errors.push(`surah_${i + 1}_sequence_${j + 1}`);
    if (!ayah.text_uthmani || !ayah.text_normalized) errors.push(`surah_${i + 1}_ayah_${j + 1}_missing_text`);
    if (ayah.source_id !== 'tanzil-quran-text' || ayah.source_approved !== true) errors.push(`surah_${i + 1}_ayah_${j + 1}_source_invalid`);
  });
});
if (total !== 6236 || data.ayah_count !== 6236) errors.push(`total_invalid_${total}`);
if (data.surahs[0].ayahs[0].text_uthmani !== 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ') errors.push('first_ayah_unexpected');
if (errors.length) { console.error(JSON.stringify({ ok: false, errors: errors.slice(0, 20), error_count: errors.length }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, surah_count: data.surahs.length, ayah_count: total, first_ayah_preserved: true }, null, 2));

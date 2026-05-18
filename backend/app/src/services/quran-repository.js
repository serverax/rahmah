/**
 * backend/app/src/services/quran-repository.js
 */

export function createQuranRepository({ pool } = {}) {
  const hasPool = Boolean(pool);

  async function listSurahs() {
    if (!hasPool) return [];
    const sql = `SELECT id, name_ar, name_en, revelation_place, ayah_count FROM quran_surahs ORDER BY id ASC`;
    try {
      const res = await pool.query(sql);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function getSurahDetails(surahId) {
    if (!hasPool) return null;
    const sql = `SELECT id, name_ar, name_en, revelation_place, ayah_count FROM quran_surahs WHERE id = $1`;
    try {
      const res = await pool.query(sql, [surahId]);
      return res.rows[0] || null;
    } catch {
      return null;
    }
  }

  async function getAyahs(surahId) {
    if (!hasPool) return [];
    const sql = `
      SELECT id, ayah_number, text_uthmani, juz, page
      FROM quran_ayahs
      WHERE surah_id = $1
      ORDER BY ayah_number ASC
    `;
    try {
      const res = await pool.query(sql, [surahId]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  async function searchQuran(query) {
    if (!hasPool) return [];
    // Basic search in Uthmani text.
    const sql = `
      SELECT s.name_ar, a.surah_id, a.ayah_number, a.text_uthmani
      FROM quran_ayahs a
      JOIN quran_surahs s ON s.id = a.surah_id
      WHERE a.text_uthmani LIKE $1
      LIMIT 50
    `;
    try {
      const res = await pool.query(sql, [`%${query}%`]);
      return res.rows || [];
    } catch {
      return [];
    }
  }

  return {
    listSurahs,
    getSurahDetails,
    getAyahs,
    searchQuran
  };
}

let _repo = null;
export function configureQuranRepository({ pool }) { _repo = createQuranRepository({ pool }); }
export function getQuranRepository() { return _repo; }
export function isQuranRepositoryConfigured() { return Boolean(_repo); }


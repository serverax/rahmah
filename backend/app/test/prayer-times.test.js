/**
 * backend/app/test/prayer-times.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import { calculatePrayerTimes, getNextPrayer } from '../src/services/prayer-times-service.js';

test('Prayer Times - Makkah (Umm Al-Qura)', async (t) => {
  const date = new Date('2026-05-17T12:00:00Z');
  const result = calculatePrayerTimes({
    lat: 21.4225,
    lng: 39.8262,
    timezone: 3,
    method: 'UMM_AL_QURA',
    date
  });

  assert.strictEqual(result.date, '2026-05-17');
  assert.strictEqual(result.times.Dhuhr, '12:17');
  assert.ok(result.times.Fajr.startsWith('04:'));
  assert.ok(result.times.Maghrib.startsWith('18:'));
  // Isha should be exactly 90 mins after Maghrib
  const [mh, mm] = result.times.Maghrib.split(':').map(Number);
  const [ih, im] = result.times.Isha.split(':').map(Number);
  const diff = (ih * 60 + im) - (mh * 60 + mm);
  assert.strictEqual(diff, 90);
});

test('Prayer Times - London (MWL)', async (t) => {
  const date = new Date('2026-05-17T12:00:00Z');
  const result = calculatePrayerTimes({
    lat: 51.5074,
    lng: -0.1278,
    timezone: 1, // BST
    method: 'MWL',
    date
  });

  assert.strictEqual(result.times.Dhuhr, '12:57');
  assert.ok(result.times.Fajr < result.times.Sunrise);
  assert.ok(result.times.Maghrib > result.times.Asr);
});

test('Next Prayer Logic', async (t) => {
  const times = {
    Fajr: '05:00',
    Dhuhr: '12:00',
    Asr: '15:30',
    Maghrib: '18:45',
    Isha: '20:15'
  };

  // 1. Morning case
  const morning = new Date('2026-05-17T08:00:00');
  morning.setHours(8, 0, 0);
  const next1 = getNextPrayer(times, morning);
  assert.strictEqual(next1.next, 'Dhuhr');
  assert.strictEqual(next1.time, '12:00');

  // 2. Evening case (after Isha)
  const evening = new Date('2026-05-17T22:00:00');
  evening.setHours(22, 0, 0);
  const next2 = getNextPrayer(times, evening);
  assert.strictEqual(next2.next, 'Fajr');
  assert.strictEqual(next2.time, '05:00');
  assert.strictEqual(next2.minutes_remaining, 7 * 60);
});

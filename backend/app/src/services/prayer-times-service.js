/**
 * backend/app/src/services/prayer-times-service.js
 *
 * Deterministic prayer time calculation engine.
 * No external dependencies. Pure trigonometry.
 */

const METHODS = {
  MWL:        { fajr: 18,   isha: 17,   name: 'Muslim World League' },
  ISNA:       { fajr: 15,   isha: 15,   name: 'Islamic Society of North America' },
  EGYPT:      { fajr: 19.5, isha: 17.5, name: 'Egyptian General Authority of Survey' },
  KARACHI:    { fajr: 18,   isha: 18,   name: 'University of Islamic Sciences, Karachi' },
  UMM_AL_QURA: { fajr: 18.5, isha: '90 min', name: 'Umm Al-Qura University, Makkah' }, // Isha is 90 min after Maghrib
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * Normalizes an angle to [0, 360).
 */
function fixAngle(a) {
  a = a - 360 * Math.floor(a / 360);
  return a < 0 ? a + 360 : a;
}

/**
 * Normalizes hours to [0, 24).
 */
function fixHour(h) {
  h = h - 24 * Math.floor(h / 24);
  return h < 0 ? h + 24 : h;
}

/**
 * Standard astronomical calculations.
 */
function calculateSolar(jd, lat, lng, timezone) {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const L = fixAngle(q + 1.915 * Math.sin(g * D2R) + 0.020 * Math.sin(2 * g * D2R));

  const e = 23.439 - 0.00000036 * d;
  const RA = Math.atan2(Math.cos(e * D2R) * Math.sin(L * D2R), Math.cos(L * D2R)) * R2D / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = Math.asin(Math.sin(e * D2R) * Math.sin(L * D2R)) * R2D;

  return { eqt, decl };
}

function computeTime(decl, lat, angle, direction) {
  const h = (direction === 'ccw' ? -1 : 1) * Math.acos(
    (-Math.sin(angle * D2R) - Math.sin(lat * D2R) * Math.sin(decl * D2R)) /
    (Math.cos(lat * D2R) * Math.cos(decl * D2R))
  ) * R2D / 15;
  return h;
}

function computeAsr(decl, lat, shadowFactor) {
  const angle = -Math.atan(1 / (shadowFactor + Math.tan(Math.abs(lat - decl) * D2R))) * R2D;
  return computeTime(decl, lat, angle, 'cw');
}

/**
 * Formats decimal hours to HH:MM.
 */
function formatTime(h) {
  if (isNaN(h)) return '--:--';
  h = fixHour(h + 1 / 120); // round to nearest minute (0.5 / 60)
  const hours = Math.floor(h);
  const minutes = Math.floor((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Core calculation function.
 */
export function calculatePrayerTimes({ lat, lng, date = new Date(), method = 'MWL', asrMethod = 'STANDARD', timezone }) {
  const m = METHODS[method] || METHODS.MWL;
  const shadowFactor = asrMethod === 'HANAFI' ? 2 : 1;

  // Use provided timezone or attempt to guess from lng
  const tz = typeof timezone === 'number' ? timezone : Math.round(lng / 15);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian Date
  let A = Math.floor(year / 100);
  let B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;

  const { eqt, decl } = calculateSolar(jd, lat, lng, tz);

  const base = 12 + tz - lng / 15 - eqt;
  
  const sunriseAngle = 0.833;
  const maghribAngle = 0.833;

  const dhuhr = base;
  const sunrise = base + computeTime(decl, lat, sunriseAngle, 'ccw');
  const maghrib = base + computeTime(decl, lat, maghribAngle, 'cw');
  const asr     = base + computeAsr(decl, lat, shadowFactor);
  const fajr    = base + computeTime(decl, lat, m.fajr, 'ccw');
  
  let isha;
  if (method === 'UMM_AL_QURA') {
    isha = maghrib + 1.5; // 90 minutes
  } else {
    isha = base + computeTime(decl, lat, m.isha, 'cw');
  }

  const times = {
    Fajr:    formatTime(fajr),
    Sunrise: formatTime(sunrise),
    Dhuhr:   formatTime(dhuhr),
    Asr:     formatTime(asr),
    Maghrib: formatTime(maghrib),
    Isha:    formatTime(isha),
  };

  return {
    date: date.toISOString().split('T')[0],
    lat,
    lng,
    method: m.name,
    asr_method: asrMethod,
    timezone: tz,
    times,
  };
}

/**
 * Returns the next prayer and countdown.
 */
export function getNextPrayer(times, now = new Date()) {
  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  
  for (const name of prayerNames) {
    const [h, m] = times[name].split(':').map(Number);
    const prayerHour = h + m / 60;
    if (prayerHour > currentHour) {
      const diffMin = Math.floor((prayerHour - currentHour) * 60);
      return {
        next: name,
        time: times[name],
        countdown: `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`,
        minutes_remaining: diffMin
      };
    }
  }

  // If all prayers passed, next is Fajr tomorrow
  const [h, m] = times.Fajr.split(':').map(Number);
  const prayerHour = h + m / 60 + 24;
  const diffMin = Math.floor((prayerHour - currentHour) * 60);
  return {
    next: 'Fajr',
    time: times.Fajr,
    countdown: `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`,
    minutes_remaining: diffMin
  };
}

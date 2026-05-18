/**
 * backend/app/src/routes/prayer.js
 */
import { calculatePrayerTimes, getNextPrayer } from '../services/prayer-times-service.js';

export default async function prayerRoute(fastify) {
  fastify.get('/prayer-times', {
    schema: {
      query: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          method: { type: 'string', enum: ['MWL', 'ISNA', 'EGYPT', 'KARACHI', 'UMM_AL_QURA'], default: 'MWL' },
          asr_method: { type: 'string', enum: ['STANDARD', 'HANAFI'], default: 'STANDARD' },
          timezone: { type: 'number' }
        }
      }
    }
  }, async (req, reply) => {
    const { lat, lng, method, asr_method, timezone } = req.query;
    
    try {
      const times = calculatePrayerTimes({
        lat,
        lng,
        method,
        asrMethod: asr_method,
        timezone,
        date: new Date()
      });

      const next = getNextPrayer(times.times);

      return reply.send({
        ok: true,
        ...times,
        next_prayer: next
      });
    } catch (err) {
      return reply.code(400).send({ ok: false, error: 'calculation_failed' });
    }
  });
}

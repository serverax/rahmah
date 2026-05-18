/**
 * backend/app/src/routes/azan-audio.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function azanAudioRoute(fastify) {
  fastify.get('/options', async (req, reply) => {
    try {
      const metaPath = path.resolve('../../data/islamic-sources/azan-audio-metadata.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      
      // Strict Check: if no options are approved, configured MUST be false.
      const anyApproved = (meta.options || []).some(o => o.approved === true);
      
      return reply.send({ 
        ok: true, 
        ...meta,
        configured: meta.configured === true && anyApproved
      });
    } catch {
      return reply.send({
        ok: true,
        configured: false,
        status: 'PENDING',
        blocker: 'Metadata file missing or unreadable.'
      });
    }
  });
}

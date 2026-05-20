/**
 * backend/app/src/routes/azan-audio.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAzanOption, getAzanAudioStatus } from '../infra/azan-probe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = process.env.RAHMA_REPO_ROOT
  ? path.resolve(process.env.RAHMA_REPO_ROOT)
  : path.resolve(__dirname, '..', '..', '..', '..');

export default async function azanAudioRoute(fastify) {
  fastify.get('/options', async (req, reply) => {
    try {
      const metaPath = path.join(REPO_ROOT, 'data', 'islamic-sources', 'azan-audio-metadata.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      const status = getAzanAudioStatus();

      const options = (meta.options || []).map((o) => {
        const verdict = evaluateAzanOption(o);
        return {
          ...o,
          playback_allowed: verdict.accepted,
          rejection_reason: verdict.accepted ? null : verdict.reason,
        };
      });

      return reply.send({
        ok: true,
        configured: status.configured,
        production_ready: status.production_ready,
        status: status.production_ready ? 'PASS_PRODUCTION' : meta.status,
        blocker: status.blocker,
        default_azan_id: status.default_azan_id,
        options,
      });
    } catch {
      return reply.send({
        ok: true,
        configured: false,
        production_ready: false,
        status: 'PENDING',
        blocker: 'Metadata file missing or unreadable.',
        options: [],
      });
    }
  });
}

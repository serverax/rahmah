import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  evaluateAzanOption,
  getAzanAudioStatus,
} from '../src/infra/azan-probe.js';
import { evaluateProductionGates } from '../src/infra/production-gates.js';

test('getAzanAudioStatus: invalid local audio asset is not production_ready', () => {
  const status = getAzanAudioStatus();
  assert.equal(status.configured, false);
  assert.equal(status.production_ready, false);
  assert.equal(status.verified_assets, 0);
  assert.equal(status.blocker, 'azan_audio_license_or_hash_incomplete');
});

test('evaluateAzanOption: unapproved asset is rejected', () => {
  const verdict = evaluateAzanOption({
    id: 'madinah_standard',
    approved: false,
    file_path: 'assets/audio/azan/madinah_standard.mp3',
    file_hash_sha256: 'deadbeef',
    source: 'x',
    license: 'pending',
    source_url: '',
  });
  assert.equal(verdict.accepted, false);
});

test('evaluateProductionGates: missing azan keeps production_ready false', () => {
  const gates = evaluateProductionGates({
    database_connected: true,
    pgvector: { ready: true },
    rag: { rag_ready: true, algorithm_ready: true },
    redis: { ready: true },
    wasm: { mode: 'required', ready: true, execution_proven: true, reachable: true },
    auth_ready: true,
    app_store: { approval_status: 'approved', ready: true },
    azan_audio: { production_ready: false },
    notifications: { push_production_ready: true },
  });
  assert.equal(gates.production_ready, false);
  assert.ok(gates.blockers.includes('azan_audio_not_production_ready'));
});

test('GET /api/azan-audio/options: playback_allowed only for verified approved asset', async () => {
  const app = buildApp({ autoInit: false });
  try {
    const res = await app.inject({ method: 'GET', url: '/api/azan-audio/options' });
    const body = res.json();
    assert.equal(body.production_ready, false);
    const makkah = body.options.find((o) => o.id === 'makkah_public_01');
    const madinah = body.options.find((o) => o.id === 'madinah_standard');
    assert.equal(makkah.playback_allowed, false);
    assert.equal(makkah.rejection_reason, 'not_approved');
    assert.equal(madinah.playback_allowed, false);
    assert.ok(madinah.rejection_reason);
  } finally {
    await app.close();
  }
});

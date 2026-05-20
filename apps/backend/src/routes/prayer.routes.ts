import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerPrayerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/prayer/times', async () => foundationResponse('/api/prayer/times'));
  app.get('/api/prayer/settings', async () => foundationResponse('/api/prayer/settings'));
  app.post('/api/prayer/settings', async () => foundationResponse('/api/prayer/settings'));
  app.get('/api/prayer/adhan-audio', async () => foundationResponse('/api/prayer/adhan-audio'));
  app.post('/api/prayer/notifications/test', async () => foundationResponse('/api/prayer/notifications/test'));
}
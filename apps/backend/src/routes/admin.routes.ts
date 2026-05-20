import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/content', async () => foundationResponse('/api/admin/content'));
  app.post('/api/admin/content', async () => foundationResponse('/api/admin/content'));
  app.post('/api/admin/content/approve', async () => foundationResponse('/api/admin/content/approve'));
  app.post('/api/admin/content/reject', async () => foundationResponse('/api/admin/content/reject'));
  app.get('/api/admin/sources', async () => foundationResponse('/api/admin/sources'));
  app.post('/api/admin/sources', async () => foundationResponse('/api/admin/sources'));
  app.get('/api/admin/review', async () => foundationResponse('/api/admin/review'));
  app.post('/api/admin/review/assign', async () => foundationResponse('/api/admin/review/assign'));
  app.post('/api/admin/audio/approve', async () => foundationResponse('/api/admin/audio/approve'));
  app.get('/api/admin/users', async () => foundationResponse('/api/admin/users'));
}
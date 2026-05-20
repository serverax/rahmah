import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerDuaRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dua/categories', async () => foundationResponse('/api/dua/categories'));
  app.get('/api/dua/list', async () => foundationResponse('/api/dua/list'));
  app.post('/api/dua/favourite', async () => foundationResponse('/api/dua/favourite'));
}
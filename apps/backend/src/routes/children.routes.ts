import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerChildrenRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/children/profiles', async () => foundationResponse('/api/children/profiles'));
  app.post('/api/children/profiles', async () => foundationResponse('/api/children/profiles'));
  app.get('/api/children/stories', async () => foundationResponse('/api/children/stories'));
  app.get('/api/children/games', async () => foundationResponse('/api/children/games'));
  app.get('/api/children/progress', async () => foundationResponse('/api/children/progress'));
}
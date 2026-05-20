import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerHadithRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/hadith/search', async () => foundationResponse('/api/hadith/search'));
  app.get('/api/hadith/topics', async () => foundationResponse('/api/hadith/topics'));
  app.get('/api/hadith/daily', async () => foundationResponse('/api/hadith/daily'));
}
import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerQuranRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/quran/surahs', async () => foundationResponse('/api/quran/surahs'));
  app.get('/api/quran/ayah', async () => foundationResponse('/api/quran/ayah'));
  app.get('/api/quran/search', async () => foundationResponse('/api/quran/search'));
  app.post('/api/quran/bookmark', async () => foundationResponse('/api/quran/bookmark'));
}
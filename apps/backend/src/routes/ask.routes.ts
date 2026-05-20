import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerAskRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/ask/question', async () => foundationResponse('/api/ask/question'));
  app.get('/api/ask/history', async () => foundationResponse('/api/ask/history'));
  app.get('/api/ask/review-required', async () => foundationResponse('/api/ask/review-required'));
}
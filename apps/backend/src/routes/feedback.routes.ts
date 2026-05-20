import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerFeedbackRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/feedback', async () => foundationResponse('/api/feedback'));
}
import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerReadyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/ready', async () => foundationResponse('/api/ready'));
}
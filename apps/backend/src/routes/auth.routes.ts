import type { FastifyInstance } from 'fastify';

const FOUNDATION_MESSAGE = 'Endpoint skeleton created. Real implementation pending.';

function foundationResponse(endpoint: string) {
  return {
    status: 'foundation',
    message: FOUNDATION_MESSAGE,
    endpoint,
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async () => foundationResponse('/api/auth/register'));
  app.post('/api/auth/login', async () => foundationResponse('/api/auth/login'));
  app.get('/api/auth/me', async () => foundationResponse('/api/auth/me'));
}
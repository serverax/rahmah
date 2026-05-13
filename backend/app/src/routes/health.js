export default async function healthRoute(fastify) {
  fastify.get('/health', async () => ({
    ok: true,
    service: 'sakina-backend',
    status: 'healthy',
  }));
}

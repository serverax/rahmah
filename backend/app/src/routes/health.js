export default async function healthRoute(fastify) {
  fastify.get('/health', async () => ({
    ok: true,
    service: 'rahma-api',
    legacy_service_name: 'sakina-backend',
    status: 'healthy',
  }));
}

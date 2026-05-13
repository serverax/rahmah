import Fastify from 'fastify';
import healthRoute from './routes/health.js';
import readyRoute from './routes/ready.js';
import ibadatRoute from './routes/ibadat.js';

export function buildApp(opts = {}) {
  const app = Fastify({
    logger: opts.logger ?? false,
    disableRequestLogging: opts.disableRequestLogging ?? true,
    trustProxy: false,
  });

  app.register(healthRoute);
  app.register(readyRoute);
  app.register(ibadatRoute, { prefix: '/api/ibadat' });

  return app;
}

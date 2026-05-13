import Fastify from 'fastify';
import healthRoute from './routes/health.js';
import readyRoute from './routes/ready.js';
import ibadatRoute from './routes/ibadat.js';
import askSheikhHasanRoute from './routes/ask-sheikh-hasan.js';
import publicQARoute from './routes/public-qa.js';
import ragRoute from './routes/rag.js';
import familyRoute from './routes/family.js';
import charityRoute from './routes/charity.js';
import engineRoute from './routes/engine.js';

export function buildApp(opts = {}) {
  const app = Fastify({
    logger: opts.logger ?? false,
    disableRequestLogging: opts.disableRequestLogging ?? true,
    trustProxy: false,
  });

  app.register(healthRoute);
  app.register(readyRoute);
  app.register(ibadatRoute, { prefix: '/api/ibadat' });
  app.register(askSheikhHasanRoute, { prefix: '/api/sheikh-hasan' });
  app.register(publicQARoute, { prefix: '/api/public/sheikh-hasan' });
  app.register(ragRoute, { prefix: '/api/rag' });
  app.register(familyRoute, { prefix: '/api/family' });
  app.register(charityRoute, { prefix: '/api/sadaqah' });
  app.register(engineRoute, { prefix: '/api/engine' });

  return app;
}

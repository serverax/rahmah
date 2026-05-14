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
import libraryRoute from './routes/library.js';
import privacyRoute from './routes/privacy.js';
import authRoute from './routes/auth.js';
import dbRoute from './routes/db.js';
import sheikhWorkflowRoute, { sheikhAdminRoute } from './routes/sheikh-workflow.js';
import mobileRoute from './routes/mobile.js';
import donationsRoute from './routes/donations.js';
import sheikhLoginRoute from './routes/sheikh-login.js';
import contentSourcesRoute from './routes/content-sources.js';
import authSessionRoute, { deviceRegistrationRoute } from './routes/auth-session.js';
import mobileSyncRoute from './routes/mobile-sync.js';

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
  app.register(libraryRoute, { prefix: '/api/library' });
  app.register(privacyRoute, { prefix: '/api' });
  app.register(authRoute, { prefix: '/api/auth' });
  app.register(dbRoute, { prefix: '/api/db' });
  app.register(sheikhWorkflowRoute, { prefix: '/api/sheikh' });
  app.register(sheikhAdminRoute, { prefix: '/api/admin/sheikh' });
  app.register(mobileRoute, { prefix: '/api' });
  app.register(donationsRoute, { prefix: '/api/donations' });
  app.register(sheikhLoginRoute, { prefix: '/api/sheikh' });
  app.register(contentSourcesRoute, { prefix: '/api/content' });
  app.register(authSessionRoute, { prefix: '/api/auth' });
  app.register(deviceRegistrationRoute, { prefix: '/api/device' });
  app.register(mobileSyncRoute, { prefix: '/api/mobile' });

  return app;
}

import 'dotenv/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import pinoHttpModule from 'pino-http';
import { logger } from './logger.js';
import { createLocationsRouter, type WeatherClient } from './routes/locations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;
const FRONTEND_EVENT_PATTERN = /^[a-z][a-z0-9_.:-]{1,63}$/;

// Simple in-memory rate limiter for the API to prevent DoS
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.expiresAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000).unref();

interface AppOptions {
  serveFrontend?: boolean;
  enableRequestLogging?: boolean;
  weatherClient?: WeatherClient;
}

export async function createApp(options: AppOptions = {}) {
  const app = express();
  const serveFrontend = options.serveFrontend ?? process.env.NODE_ENV !== 'test';
  const enableRequestLogging = options.enableRequestLogging ?? process.env.NODE_ENV !== 'test';

  if (enableRequestLogging) {
    app.use(pinoHttp({ logger }));
  }

  // Trust proxy to ensure request.ip correctly resolves behind load balancers/reverse proxies
  app.set('trust proxy', 1);

  // Security enhancements: add basic headers natively
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use((request, response, next) => {
    if (request.path.startsWith('/frontman')) {
      next();
      return;
    }

    // Apply rate limit on all API routes
    if (request.path.startsWith('/api')) {
      const ip = request.ip || request.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const limitData = rateLimitMap.get(ip) || { count: 0, expiresAt: now + 60000 };

      if (now > limitData.expiresAt) {
        limitData.count = 0;
        limitData.expiresAt = now + 60000;
      }

      limitData.count += 1;
      rateLimitMap.set(ip, limitData);

      if (limitData.count > 100) {
        response.status(429).json({ detail: 'Too many requests, please try again later.' });
        return;
      }
    }

    // Security enhancements: add payload size limit to prevent DoS
    express.json({ limit: '10kb' })(request, response, next);
  });

  app.get('/health', (_request, response) => {
    response.json({ status: 'healthy' });
  });

  app.post('/api/logs', (request, response) => {
    const event = request.body?.event;
    const metadata = request.body?.metadata;
    if (typeof event !== 'string' || !FRONTEND_EVENT_PATTERN.test(event)) {
      response.status(422).json({ detail: 'event is required' });
      return;
    }
    logger.info(
      {
        source: 'frontend',
        event,
        metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
        page: typeof request.body?.page === 'string' ? request.body.page : undefined,
      },
      'frontend interaction',
    );
    response.status(204).end();
  });

  app.use('/api', createLocationsRouter({ weatherClient: options.weatherClient }));

  if (serveFrontend) {
    if (process.env.NODE_ENV === 'production') {
      const staticPath = resolve(__dirname, '..', '..', 'frontend', 'dist');
      app.use(express.static(staticPath));
      app.get('*', (_request, response) => {
        response.sendFile(resolve(staticPath, 'index.html'));
      });
    } else {
      const { createServer } = await import('vite');
      const vite = await createServer({
        root: resolve(__dirname, '..', '..', 'frontend'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err: error }, 'request failed');
      response.status(500).json({ detail: 'Internal server error' });
    },
  );

  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const app = await createApp();

  app.listen(port, '127.0.0.1', () => {
    logger.info({ url: `http://127.0.0.1:${port}` }, 'Weather Starter listening');
  });
}

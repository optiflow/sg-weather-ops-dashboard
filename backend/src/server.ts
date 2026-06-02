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

// Native rate limiting state scoped outside createApp to prevent memory leaks during testing
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

interface AppOptions {
  serveFrontend?: boolean;
  enableRequestLogging?: boolean;
  weatherClient?: WeatherClient;
}

export async function createApp(options: AppOptions = {}) {
  const app = express();

  // Trust proxy to correctly resolve IPs behind reverse proxies
  app.set('trust proxy', 1);

  const serveFrontend = options.serveFrontend ?? process.env.NODE_ENV !== 'test';
  const enableRequestLogging = options.enableRequestLogging ?? process.env.NODE_ENV !== 'test';

  if (enableRequestLogging) {
    app.use(pinoHttp({ logger }));
  }

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

    // Security enhancements: add payload size limit to prevent DoS
    express.json({ limit: '10kb' })(request, response, next);
  });

  app.get('/health', (_request, response) => {
    response.json({ status: 'healthy' });
  });

  // Security enhancements: add native rate limiting to /api routes
  app.use('/api', (request, response, next) => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const ip = request.ip || 'unknown';
    const now = Date.now();

    let rateLimitData = rateLimitMap.get(ip);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    }

    rateLimitData.count++;
    rateLimitMap.set(ip, rateLimitData);

    response.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, RATE_LIMIT_MAX_REQUESTS - rateLimitData.count),
    );

    if (rateLimitData.count > RATE_LIMIT_MAX_REQUESTS) {
      logger.warn({ ip }, 'rate limit exceeded');
      response.status(429).json({ detail: 'Too many requests, please try again later.' });
      return;
    }

    next();
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

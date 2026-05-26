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

// Security enhancement: Native rate limiter state
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clear expired rate limits every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000).unref();

const rateLimitMiddleware = (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) => {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const limit = 100; // Max 100 requests per minute

  let clientData = rateLimitMap.get(ip);
  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(ip, clientData);
  }

  clientData.count++;

  response.setHeader('X-RateLimit-Limit', limit);
  response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - clientData.count));

  if (clientData.count > limit) {
    response.status(429).json({ detail: 'Too many requests, please try again later.' });
    return;
  }

  next();
};

interface AppOptions {
  serveFrontend?: boolean;
  enableRequestLogging?: boolean;
  weatherClient?: WeatherClient;
}

export async function createApp(options: AppOptions = {}) {
  const app = express();
  const serveFrontend = options.serveFrontend ?? process.env.NODE_ENV !== 'test';
  const enableRequestLogging = options.enableRequestLogging ?? process.env.NODE_ENV !== 'test';

  app.set('trust proxy', 1);

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

  app.use('/api', rateLimitMiddleware);

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

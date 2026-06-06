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
const FRONTEND_METADATA_KEYS = new Set(['locationId', 'area', 'created', 'hasLabel', 'isFavorite']);

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
    app.use(
      pinoHttp({
        logger,
        serializers: {
          req(request) {
            return {
              id: request.id,
              method: request.method,
              url: request.url?.split('?')[0],
            };
          },
          res(response) {
            return {
              statusCode: response.statusCode,
            };
          },
        },
      }),
    );
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

  app.get('/ready', async (_request, response) => {
    try {
      const { listLocations } = await import('./db.js');
      await listLocations();
      response.json({
        status: 'ready',
        checks: {
          database: 'ready',
          migrations: 'ready',
          weather_provider: 'not_checked',
        },
      });
    } catch {
      response.status(503).json({
        status: 'not_ready',
        checks: {
          database: 'not_ready',
          migrations: 'unknown',
          weather_provider: 'not_checked',
        },
      });
    }
  });

  app.post('/api/logs', (request, response) => {
    const payload = sanitizeFrontendLogPayload(request.body);
    if (!payload) {
      response.status(422).json({ detail: 'event is required' });
      return;
    }
    logger.info(
      {
        source: 'frontend',
        event: payload.event,
        metadata: payload.metadata,
        page: payload.page,
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

export function sanitizeFrontendLogPayload(body: unknown): {
  event: string;
  metadata: Record<string, boolean | number | string>;
  page?: string;
} | null {
  const event = (body as { event?: unknown } | undefined)?.event;
  if (typeof event !== 'string' || !FRONTEND_EVENT_PATTERN.test(event)) return null;

  const rawMetadata = (body as { metadata?: unknown } | undefined)?.metadata;
  const metadata: Record<string, boolean | number | string> = {};
  if (rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
    for (const [key, value] of Object.entries(rawMetadata)) {
      if (!FRONTEND_METADATA_KEYS.has(key)) continue;
      if (typeof value === 'boolean' || typeof value === 'number') metadata[key] = value;
      if (typeof value === 'string' && key === 'area') metadata[key] = value.slice(0, 80);
    }
  }

  const rawPage = (body as { page?: unknown } | undefined)?.page;
  const page = typeof rawPage === 'string' ? rawPage.split(/[?#]/)[0] : undefined;
  return { event, metadata, page };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const app = await createApp();

  app.listen(port, '127.0.0.1', () => {
    logger.info({ url: `http://127.0.0.1:${port}` }, 'SG Weather Ops Dashboard listening');
  });
}

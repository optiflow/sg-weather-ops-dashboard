import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('server API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('./server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sg-weather-ops-dashboard-server-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('./server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
    });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'healthy' });
  });

  it('sets security headers on backend responses', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });

  it('accepts valid frontend interaction logs', async () => {
    await request(app)
      .post('/api/logs')
      .send({
        event: 'location_created',
        metadata: { locationId: 1 },
        page: '/',
      })
      .expect(204);
  });

  it('rejects invalid frontend interaction log events', async () => {
    const invalidBodies = [
      {},
      { event: '' },
      { event: 'LocationCreated' },
      { event: 'x'.repeat(65) },
      { event: 42 },
    ];

    for (const body of invalidBodies) {
      const response = await request(app).post('/api/logs').send(body).expect(422);
      expect(response.body).toEqual({ detail: 'event is required' });
    }
  });
});

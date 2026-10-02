// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServerApp } from '../server';

describe('API Integration Test Suite (Supertest)', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DEV_AUTH_TOKEN = 'test-secret-dev-token-999';
    process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
    app = await createServerApp();
  });

  describe('Health Endpoint', () => {
    it('GET /api/health returns 200 with structured status payload', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptimeSeconds');
      expect(res.body).toHaveProperty('memoryUsageMb');
      expect(typeof res.body.uptimeSeconds).toBe('number');
    });

    it('injects x-request-id correlation header in responses', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.headers).toHaveProperty('x-request-id');
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(5);
    });

    it('preserves client-provided x-request-id correlation header', async () => {
      const customId = 'client-req-uuid-12345';
      const res = await request(app)
        .get('/api/health')
        .set('x-request-id', customId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('Authentication Enforcement', () => {
    it('POST /api/coach/analyze blocks unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/coach/analyze')
        .send({})
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('POST /api/practice/generate blocks unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/practice/generate')
        .send({ chapterId: 'p-1', subject: 'physics' })
        .expect(401);

      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('POST /api/mocktest/generate blocks unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/mocktest/generate')
        .send({ chapterId: 'p-1', subject: 'physics' })
        .expect(401);

      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('POST /api/planner/generate-plan blocks unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/planner/generate-plan')
        .send({ days: 3 })
        .expect(401);

      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('rejects invalid or forged Bearer tokens with 401', async () => {
      const res = await request(app)
        .post('/api/coach/analyze')
        .set('Authorization', 'Bearer invalid_forged_token_abc')
        .send({})
        .expect(401);

      expect(res.body.error).toMatch(/unauthorized/i);
    }, 15000);
  });

  describe('Input Validation & Error Responses', () => {
    it('POST /api/practice/generate returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/practice/generate')
        .set('Authorization', `Bearer ${process.env.DEV_AUTH_TOKEN}`)
        .send({ count: 5 }) // Missing chapterId and subject
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Invalid request payload');
      expect(res.body).toHaveProperty('details');
    });

    it('POST /api/mocktest/generate returns 400 when count exceeds bounds', async () => {
      const res = await request(app)
        .post('/api/mocktest/generate')
        .set('Authorization', `Bearer ${process.env.DEV_AUTH_TOKEN}`)
        .send({ chapterId: 'p-1', subject: 'physics', count: 999 }) // Exceeds max 30
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Invalid request payload');
    });

    it('POST /api/mocktest/parse-scorecard returns 400 when rawText is too short', async () => {
      const res = await request(app)
        .post('/api/mocktest/parse-scorecard')
        .set('Authorization', `Bearer ${process.env.DEV_AUTH_TOKEN}`)
        .send({ rawText: 'short' })
        .expect(400);

      expect(res.body.error).toBe('Invalid request payload');
    });
  });
});

'use strict';

const request = require('supertest');
const { app } = require('../app');
const { connectTestDb, clearTestDb, closeTestDb } = require('./testDB');

describe('logs-service', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(closeTestDb);

  test('POST /api/logs creates a log', async () => {
    const payload = {
      timestamp: new Date().toISOString(),
      service: 'gateway',
      method: 'GET',
      path: '/api/about',
      status: 200,
      duration_ms: 12,
      ip: '127.0.0.1',
      user_agent: 'jest',
      message: 'endpoint accessed'
    };

    const res = await request(app).post('/api/logs').send(payload);

    expect(res.statusCode).toBe(201);
    // Some services return { ok: true }. If yours returns full object, match accordingly:
    expect(res.body).toBeTruthy();
  });

  test('GET /api/logs returns an array', async () => {
    await request(app).post('/api/logs').send({
      timestamp: new Date().toISOString(),
      service: 'users-service',
      method: 'POST',
      path: '/api/add',
      status: 201,
      duration_ms: 50,
      ip: '127.0.0.1',
      user_agent: 'jest',
      message: 'request received'
    });

    const res = await request(app).get('/api/logs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/logs missing fields returns error JSON {id,message}', async () => {
    const res = await request(app).post('/api/logs').send({ service: 'x' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });
});

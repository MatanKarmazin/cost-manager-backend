'use strict';

const request = require('supertest');
const { app } = require('../app');

describe('admin-service', () => {
  test('GET /api/about returns only {first_name,last_name} objects', async () => {
    const res = await request(app).get('/api/about');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < res.body.length; i += 1) {
      expect(Object.keys(res.body[i]).sort()).toEqual(['first_name', 'last_name']);
      expect(typeof res.body[i].first_name).toBe('string');
      expect(typeof res.body[i].last_name).toBe('string');
    }
  });
});

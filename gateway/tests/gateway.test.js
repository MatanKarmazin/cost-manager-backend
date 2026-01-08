'use strict';

const request = require('supertest');
const express = require('express');
const http = require('http');

function startStub(app) {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`
      });
    });
  });
}

describe('gateway (proxy routing)', () => {
  let gatewayApp;
  let usersStub;
  let costsStub;
  let logsStub;
  let adminStub;

  beforeAll(async () => {
    // users stub
    const usersApp = express();
    usersApp.use(express.json());
    usersApp.post('/api/add', (req, res) => res.status(201).json(req.body));
    usersApp.get('/api/users', (req, res) => res.json([{ id: 1 }]));
    usersApp.get('/api/users/:id', (req, res) =>
      res.json({ first_name: 'A', last_name: 'B', id: Number(req.params.id), total: 0 })
    );
    usersStub = await startStub(usersApp);

    // costs stub
    const costsApp = express();
    costsApp.use(express.json());
    costsApp.post('/api/add', (req, res) => res.status(201).json(req.body));
    costsApp.get('/api/report', (req, res) =>
      res.json({ userid: Number(req.query.id), year: Number(req.query.year), month: Number(req.query.month), costs: [] })
    );
    costsStub = await startStub(costsApp);

    // logs stub
    const logsApp = express();
    logsApp.use(express.json());
    logsApp.post('/api/logs', (req, res) => res.status(201).json({ ok: true }));
    logsApp.get('/api/logs', (req, res) => res.json([{ service: 'gateway' }]));
    logsStub = await startStub(logsApp);

    // admin stub
    const adminApp = express();
    adminApp.get('/api/about', (req, res) => res.json([{ first_name: 'Matan', last_name: 'Kar Mazin' }]));
    adminStub = await startStub(adminApp);

    // Set env BEFORE requiring gateway app (because requireEnv runs immediately)
    process.env.USERS_URL = usersStub.baseUrl;
    process.env.COSTS_URL = costsStub.baseUrl;
    process.env.LOGS_URL = logsStub.baseUrl;
    process.env.ADMIN_URL = adminStub.baseUrl;

    // now load gateway app
    // eslint-disable-next-line global-require
    gatewayApp = require('../app').app;
  });

  afterAll(async () => {
    usersStub.server.close();
    costsStub.server.close();
    logsStub.server.close();
    adminStub.server.close();
  });

  test('POST /api/add routes user payload to users-service', async () => {
    const res = await request(gatewayApp).post('/api/add').send({
      id: 5,
      first_name: 'A',
      last_name: 'B',
      birthday: '2000-01-01'
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id', 5);
    expect(res.body).toHaveProperty('first_name', 'A');
  });

  test('POST /api/add routes cost payload to costs-service', async () => {
    const res = await request(gatewayApp).post('/api/add').send({
      userid: 123123,
      description: 'milk',
      category: 'food',
      sum: 8
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('category', 'food');
  });

  test('POST /api/add invalid payload returns {id,message} (4001)', async () => {
    const res = await request(gatewayApp).post('/api/add').send({ hello: 'world' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ id: 4001, message: 'Invalid payload for /api/add' });
  });

  test('GET /api/report proxies query string to costs-service', async () => {
    const res = await request(gatewayApp).get('/api/report?id=9&year=2026&month=1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ userid: 9, year: 2026, month: 1 });
  });

  test('GET /api/about proxies to admin-service', async () => {
    const res = await request(gatewayApp).get('/api/about');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual({ first_name: 'Matan', last_name: 'Kar Mazin' });
  });

  test('GET /api/logs proxies to logs-service', async () => {
    const res = await request(gatewayApp).get('/api/logs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('service', 'gateway');
  });
});

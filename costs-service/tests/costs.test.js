'use strict';

const request = require('supertest');

jest.mock('../src/usersClient', () => ({
  userExistsViaUsersService: jest.fn(),
}));

const { userExistsViaUsersService } = require('../src/usersClient');
const { app } = require('../app');
const { connectTestDb, clearTestDb, closeTestDb } = require('./testDB');

function plusDays(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

describe('costs-service', () => {
  beforeEach(() => {
    userExistsViaUsersService.mockResolvedValue(true);
  });

  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('POST /api/add creates a cost item (201) and returns the created JSON', async () => {
    const createdAt = plusDays(2);
    const payload = {
      userid: 123123,
      description: 'choco',
      category: 'food',
      sum: 12,
      created_at: createdAt.toISOString(),
    };

    const res = await request(app).post('/api/add').send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('description', 'choco');
    expect(res.body).toHaveProperty('category', 'food');
    expect(res.body).toHaveProperty('sum', 12);
    expect(res.body.created_at).toBeTruthy();
  });

  test('POST /api/add rejects past created_at (4006)', async () => {
    const payload = {
      userid: 1,
      description: 'old',
      category: 'food',
      sum: 1,
      created_at: new Date(Date.now() - 60 * 1000).toISOString(),
    };

    const res = await request(app).post('/api/add').send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ id: 4006, message: 'Cannot add costs in the past' });
  });

  test('POST /api/add invalid category returns (4003)', async () => {
    const payload = {
      userid: 1,
      description: 'x',
      category: 'cars',
      sum: 1,
    };

    const res = await request(app).post('/api/add').send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.id).toBe(4003);
    expect(res.body.message).toContain('category must be one of');
  });

  test('GET /api/report returns grouped categories and includes added items', async () => {
    const createdAt = plusDays(2);
    const y = createdAt.getUTCFullYear();
    const m = createdAt.getUTCMonth() + 1;

    await request(app).post('/api/add').send({
      userid: 123123,
      description: 'milk',
      category: 'food',
      sum: 8,
      created_at: createdAt.toISOString(),
    });

    await request(app).post('/api/add').send({
      userid: 123123,
      description: 'book',
      category: 'education',
      sum: 50,
      created_at: createdAt.toISOString(),
    });

    const res = await request(app).get(`/api/report?id=123123&year=${y}&month=${m}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('year', y);
    expect(res.body).toHaveProperty('month', m);
    expect(Array.isArray(res.body.costs)).toBe(true);

    const keys = res.body.costs.map((o) => Object.keys(o)[0]);
    expect(keys).toEqual(
      expect.arrayContaining(['food', 'health', 'housing', 'sports', 'education']),
    );

    const foodObj = res.body.costs.find((o) => Object.keys(o)[0] === 'food');
    const eduObj = res.body.costs.find((o) => Object.keys(o)[0] === 'education');

    expect(foodObj.food.some((i) => i.description === 'milk' && i.sum === 8)).toBe(true);
    expect(eduObj.education.some((i) => i.description === 'book' && i.sum === 50)).toBe(true);
  });

  test('GET /api/report month invalid returns (4003)', async () => {
    const res = await request(app).get('/api/report?id=1&year=2026&month=13');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ id: 4003, message: 'month is invalid' });
  });
});

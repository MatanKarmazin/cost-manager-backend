'use strict';

const request = require('supertest');
const { app } = require('../server'); // <-- change if your entry file name is different

// Unique tag so cleanup deletes ONLY our test docs
const TEST_RUN_ID = `jest-${Date.now()}`;

function makeUser(overrides) {
  return Object.assign(
    {
      id: 900000 + Math.floor(Math.random() * 10000),
      first_name: 'Test',
      last_name: 'User',
      birthday: '2000-01-01',
      __testRunId: TEST_RUN_ID
    },
    overrides || {}
  );
}

describe('users-service', () => {
  test('POST /api/add creates a user and returns the created user JSON', async () => {
    const user = makeUser();

    const res = await request(app).post('/api/add').send(user).expect(201);

    expect(res.body).toMatchObject({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name
    });

    // birthday is Date in DB, so response might be ISO string
    expect(String(res.body.birthday)).toContain('2000-01-01');
  });

  test('POST /api/add missing fields returns error JSON {id,message}', async () => {
    const bad = { id: 123, __testRunId: TEST_RUN_ID };

    const res = await request(app).post('/api/add').send(bad).expect(400);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });

  test('GET /api/users returns an array and includes our created user', async () => {
    const user = makeUser({ first_name: 'Alice' });

    await request(app).post('/api/add').send(user).expect(201);

    const res = await request(app).get('/api/users').expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find((u) => u.id === user.id);
    expect(found).toBeTruthy();
    expect(found).toMatchObject({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name
    });
  });

  test('GET /api/users/:id returns {first_name,last_name,id,total}', async () => {
    const user = makeUser({ first_name: 'Bob' });

    await request(app).post('/api/add').send(user).expect(201);

    const res = await request(app).get(`/api/users/${user.id}`).expect(200);

    expect(res.body).toHaveProperty('first_name');
    expect(res.body).toHaveProperty('last_name');
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('total');

    expect(res.body.id).toBe(user.id);
    expect(res.body.first_name).toBe(user.first_name);
    expect(res.body.last_name).toBe(user.last_name);

    // total should be a number (likely 0 if no costs yet)
    expect(typeof res.body.total).toBe('number');
  });

  test('GET /api/users/:id unknown user returns error JSON {id,message}', async () => {
    const missingId = 999999999;

    const res = await request(app).get(`/api/users/${missingId}`).expect(404);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message');
  });
});

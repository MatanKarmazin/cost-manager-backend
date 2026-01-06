'use strict';

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');

const { Cost } = require('./models/cost.model');
const { logEveryRequest, buildLogPayload, sendLog } = require('./src/logClient');

dotenv.config();

const LOGS_URL = (process.env.LOGS_URL || '').trim();

const app = express(); // ✅ app must be initialized before any app.use

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

/* custom request -> logs-service payload */
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    try {
      const payload = buildLogPayload(
        'costs-service',
        req,
        res,
        durationMs,
        'endpoint accessed'
      );

      if (LOGS_URL) {
        sendLog(LOGS_URL, payload);
      }
    } catch (e) {
      // don't crash if logging fails
    }
  });

  next();
});

/* your middleware (must be after app exists) */
app.use(logEveryRequest('costs-service', LOGS_URL));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper: categories validation
const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

function errorJson(res, status, id, message) {
  return res.status(status).json({ id, message });
}

function isPast(d) {
  return d.getTime() < Date.now();
}

/*
  POST /api/add (cost item)
  body: { userid, description, category, sum, created_at? }
*/
app.post('/api/add', async (req, res) => {
  try {
    const body = req.body || {};

    const userid = Number(body.userid);
    const description = String(body.description || '').trim();
    const category = String(body.category || '').trim().toLowerCase();
    const sum = Number(body.sum);

    // Basic validation
    if (!Number.isFinite(userid)) {
      return errorJson(res, 400, 4001, 'userid must be a number');
    }
    if (!description) {
      return errorJson(res, 400, 4002, 'description is required');
    }
    if (!CATEGORIES.includes(category)) {
      return errorJson(
        res,
        400,
        4003,
        `category must be one of: ${CATEGORIES.join(', ')}`
      );
    }
    if (!Number.isFinite(sum)) {
      return errorJson(res, 400, 4004, 'sum must be a number');
    }

    // Date handling (no past allowed)
    let createdAt = new Date();
    if (body.created_at) {
      createdAt = new Date(body.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return errorJson(res, 400, 4005, 'created_at is invalid');
      }
    }
    if (isPast(createdAt)) {
      return errorJson(res, 400, 4006, 'Cannot add costs in the past');
    }

    const doc = await Cost.create({
      userid,
      description,
      category,
      sum,
      created_at: createdAt
    });

    return res.status(201).json({
      userid: doc.userid,
      description: doc.description,
      category: doc.category,
      sum: doc.sum,
      created_at: doc.created_at
    });
  } catch (e) {
    return errorJson(res, 500, 5001, 'Internal Server Error');
  }
});

// ---- start server ----
const port = Number(process.env.PORT || 3002);

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || 'cost_manager'
  })
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`costs-service listening on port ${port}`);
    });
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('mongo connection failed', e);
    process.exit(1);
  });

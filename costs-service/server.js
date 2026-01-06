'use strict';

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');

const { logEveryRequest, buildLogPayload, sendLog } = require('./src/logClient');

dotenv.config();

const LOGS_URL = (process.env.LOGS_URL || '').trim();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

// request -> logs-service payload
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

app.use(logEveryRequest('costs-service', LOGS_URL));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', require('./src/routes'));

// Mount routes (THIS was missing)
app.use('/', require('./src/routes'));

// Centralized error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    id: err.id || 5001,
    message: err.message || 'Internal Server Error'
  });
});

const port = Number(process.env.PORT || 3002);

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || 'cost_manager'
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`costs-service listening on port ${port}`);
    });
  })
  .catch((e) => {
    console.error('mongo connection failed', e);
    process.exit(1);
  });

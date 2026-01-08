'use strict';

const { logEveryRequest } = require('./src/logClient');
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');

dotenv.config();

const { buildLogPayload, sendLog } = require('./src/logClient');
const LOGS_URL = (process.env.LOGS_URL || '').trim();

const app = express();

app.use(express.json({ limit: '1mb' }));

/*   Request logging middleware (Pino) */
app.use(
  pinoHttp({
    customLogLevel: function customLogLevel(res, err) {
      if (err) {
        return 'error';
      }

      if (res.statusCode >= 500) {
        return 'error';
      }

      if (res.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    }
  })
);

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    const payload = buildLogPayload(
      'users-service',
      req,
      res,
      durationMs,
      'endpoint accessed'
    );

    sendLog(LOGS_URL, payload);
  });

  next();
});


app.use(logEveryRequest('users-service', LOGS_URL));

/*   Health check endpoint */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/*   Main routes */
app.use('/', require('./src/routes'));

/*   Centralized error handler: always returns { id, message } */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorId = err.id || 5001;
  const msg = err.message || 'Internal Server Error';

  req.log.error({ err }, 'request failed');
  res.status(status).json({ id: errorId, message: msg });
});

const port = Number(process.env.PORT || 3001);

async function start() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || 'cost_manager'
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`users-service listening on port ${port}`);
  });
}

module.exports = { app, start };

if (require.main === module) {
  start().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('mongo connection failed', e);
    process.exit(1);
  });
}

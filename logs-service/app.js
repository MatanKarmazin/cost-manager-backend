'use strict';

const express = require('express');
const pinoHttp = require('pino-http');
const { Log } = require('./models/log.model');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

// Save a log document for every request to logs-service
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    Log.create({
      timestamp: new Date(),
      service: 'logs-service',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      message: 'request received'
    }).catch(() => {});
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', require('./src/routes'));

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorId = err.id || 5001;
  const msg = err.message || 'Internal Server Error';

  req.log.error({ errorId, err }, msg);
  res.status(status).json({ id: errorId, message: msg });
});

module.exports = { app };

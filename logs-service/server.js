'use strict';

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const { Log } = require('./models/log.model');

dotenv.config();

console.log('LOGS-SERVICE BOOT:', __dirname);

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
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: durationMs,
      ip: req.ip || '',
      user_agent: String(req.headers['user-agent'] || ''),
      message: 'request received'
    }).catch(() => {});
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// IMPORTANT: mount routes
app.use('/', require('./src/routes'));

console.log('LOGS-SERVICE ROUTES MOUNTED');

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    id: err.id || 5001,
    message: err.message || 'Internal Server Error'
  });
});

const port = Number(process.env.PORT || 3003);

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'cost_manager' })
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`logs-service listening on port ${port}`);
    });
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('mongo connection failed', e);
    process.exit(1);
  });

'use strict';

const express = require('express');
const pinoHttp = require('pino-http');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', require('./src/routes'));

// error handler: { id, message }
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorId = err.id || 5001;
  const msg = err.message || 'Internal Server Error';

  req.log.error({ err }, 'request failed');
  res.status(status).json({ id: errorId, message: msg });
});

module.exports = { app };

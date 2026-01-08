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

app.use((err, req, res, next) => {
  req.log.error({ err }, 'admin error');
  res.status(500).json({ id: 5001, message: 'Internal Server Error' });
});

module.exports = { app };

'use strict';

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const { logEveryRequest } = require('./src/logClient');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

// Cross-service logging to logs-service
app.use(logEveryRequest('admin-service', process.env.LOGS_URL));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/about
app.get('/api/about', (req, res) => {
  // Return only first_name + last_name (per requirement)
  return res.json([
    { first_name: 'Matan', last_name: 'KarMazin' }
    // Add other team members here:
    // { first_name: 'First', last_name: 'Last' }
  ]);
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    id: err.id || 5001,
    message: err.message || 'Internal Server Error'
  });
});

const port = Number(process.env.PORT || 3004);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`admin-service listening on port ${port}`);
});

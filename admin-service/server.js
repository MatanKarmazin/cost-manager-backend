'use strict';

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const mongoose = require('mongoose');

const { logEveryRequest } = require('./src/logClient'); // <-- import

dotenv.config();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return String(v).replace(/^"+|"+$/g, '').trim();
}

const LOGS_URL = requireEnv('LOGS_URL');

const app = express(); // ✅ app must be created BEFORE app.use

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

// ✅ NOW it's safe:
app.use(logEveryRequest('admin-service', LOGS_URL)); // ✅ correct service name

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ... your other routes here ...

// error handler last
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    id: err.id || 5001,
    message: err.message || 'Internal Server Error'
  });
});

const port = Number(process.env.PORT || 3004);

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'cost_manager' })
  .then(() => {
    app.listen(port, () => console.log(`admin-service listening on port ${port}`));
  })
  .catch((e) => {
    console.error('mongo connection failed', e);
    process.exit(1);
  });

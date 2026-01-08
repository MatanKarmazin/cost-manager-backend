'use strict';

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const { createProxyMiddleware } = require('http-proxy-middleware');

dotenv.config();

const { buildLogPayload, sendLog } = require('./src/logClient');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name}`);
  }
  return String(v).replace(/^"+|"+$/g, '').trim();
}

const USERS_URL = requireEnv('USERS_URL');
const COSTS_URL = requireEnv('COSTS_URL');
const LOGS_URL = requireEnv('LOGS_URL');
const ADMIN_URL = requireEnv('ADMIN_URL');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const payload = buildLogPayload('gateway', req, res, durationMs, 'endpoint accessed');
    sendLog(LOGS_URL, payload);
  });

  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/__debug', (req, res) => {
  res.json({
    ok: true,
    service: 'gateway',
    time: new Date().toISOString(),
    users: USERS_URL,
    costs: COSTS_URL,
    logs: LOGS_URL,
    admin: ADMIN_URL
  });
});

function withJsonBodyForwarding(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    logLevel: 'warn',
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        }
      }
    }
  });
}

// users
app.get('/api/users', (req, res, next) => {
  req.url = '/api/users';
  return withJsonBodyForwarding(USERS_URL)(req, res, next);
});
app.get('/api/users/:id', (req, res, next) => {
  req.url = `/api/users/${encodeURIComponent(req.params.id)}`;
  return withJsonBodyForwarding(USERS_URL)(req, res, next);
});

// report
app.get('/api/report', (req, res, next) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = `/api/report${q}`;
  return withJsonBodyForwarding(COSTS_URL)(req, res, next);
});

// add (dispatch)
app.post('/api/add', (req, res, next) => {
  const body = req.body || {};

  const isUserAdd =
    body.id !== undefined &&
    body.first_name !== undefined &&
    body.last_name !== undefined &&
    body.birthday !== undefined;

  const isCostAdd =
    body.userid !== undefined &&
    body.description !== undefined &&
    body.category !== undefined &&
    body.sum !== undefined;

  if (isUserAdd) {
    req.url = '/api/add';
    return withJsonBodyForwarding(USERS_URL)(req, res, next);
  }

  if (isCostAdd) {
    req.url = '/api/add';
    return withJsonBodyForwarding(COSTS_URL)(req, res, next);
  }

  return res.status(400).json({ id: 4001, message: 'Invalid payload for /api/add' });
});

// passthrough
app.get('/api/logs', (req, res, next) => {
  req.url = '/api/logs';
  return withJsonBodyForwarding(LOGS_URL)(req, res, next);
});
app.get('/api/about', (req, res, next) => {
  req.url = '/api/about';
  return withJsonBodyForwarding(ADMIN_URL)(req, res, next);
});

app.use((err, req, res, next) => {
  req.log.error({ err }, 'gateway error');
  res.status(500).json({ id: 5002, message: 'Gateway error' });
});

module.exports = { app };

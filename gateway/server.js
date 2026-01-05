'use strict';

const { logEveryRequest } = require('./src/logClient');

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const { createProxyMiddleware } = require('http-proxy-middleware');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());
app.use(logEveryRequest('gateway', process.env.LOGS_URL));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ensure env exists (clear error message)
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error('Missing env var: ' + name);
  }
  return value;
}

const USERS_URL = requireEnv('USERS_URL');
const COSTS_URL = requireEnv('COSTS_URL');
const LOGS_URL = requireEnv('LOGS_URL');
const ADMIN_URL = requireEnv('ADMIN_URL');

// Create a proxy that only runs for a specific /api/... prefix
function makePrefixProxy(prefix, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'silent',
    proxyTimeout: 10000,

    // Only proxy requests that start with the prefix
    pathFilter: function pathFilter(pathname, req) {
      return typeof pathname === 'string' && pathname.startsWith(prefix);
    }
  });
}

// Forward routes (keeps the full original path, e.g. /api/logs stays /api/logs)
app.use(makePrefixProxy('/api/users', USERS_URL));
app.use(makePrefixProxy('/api/report', COSTS_URL));
app.use(makePrefixProxy('/api/logs', LOGS_URL));
app.use(makePrefixProxy('/api/about', ADMIN_URL));

// /api/add router: decide user vs cost by body fields, then forward to correct service
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
    return createProxyMiddleware({
      target: USERS_URL,
      changeOrigin: true,
      logLevel: 'silent',
      proxyTimeout: 10000
    })(req, res, next);
  }

  if (isCostAdd) {
    return createProxyMiddleware({
      target: COSTS_URL,
      changeOrigin: true,
      logLevel: 'silent',
      proxyTimeout: 10000
    })(req, res, next);
  }

  return res.status(400).json({
    id: 4001,
    message: 'Invalid payload for /api/add'
  });
});

// Error handler
app.use((err, req, res, next) => {
  if (req.log && req.log.error) {
    req.log.error({ err }, 'gateway error');
  }

  res.status(500).json({
    id: 5002,
    message: err && err.message ? err.message : 'Gateway error'
  });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`gateway listening on port ${port}`);
});

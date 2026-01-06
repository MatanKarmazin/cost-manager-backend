'use strict';

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const { createProxyMiddleware } = require('http-proxy-middleware');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

// This is the important part: when proxying, re-send the JSON body
function withJsonBodyForwarding(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (
          req.method === 'POST' ||
          req.method === 'PUT' ||
          req.method === 'PATCH'
        ) {
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

// Normal forwarding routes
app.use('/api/users', withJsonBodyForwarding(USERS_URL));
app.use('/api/report', withJsonBodyForwarding(COSTS_URL));
app.use('/api/logs', withJsonBodyForwarding(LOGS_URL));
app.use('/api/about', withJsonBodyForwarding(ADMIN_URL));

// /api/add router (validate first, then forward to the correct service)
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

  if (!isUserAdd && !isCostAdd) {
    return res.status(400).json({
      id: 4001,
      message: 'Invalid payload for /api/add'
    });
  }

  if (isUserAdd) {
    return withJsonBodyForwarding(USERS_URL)(req, res, next);
  }

  return withJsonBodyForwarding(COSTS_URL)(req, res, next);
});

// Error handler
app.use((err, req, res, next) => {
  req.log.error({ err }, 'gateway error');
  res.status(500).json({ id: 5002, message: 'Gateway error' });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`gateway listening on port ${port}`);
});

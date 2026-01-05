'use strict';

const express = require('express');
const dotenv = require('dotenv');
const pinoHttp = require('pino-http');
const { createProxyMiddleware } = require('http-proxy-middleware');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

/*   Health check */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/*   Helper for proxy creation */
function makeProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: 'silent',
    proxyTimeout: 10000
  });
}

const usersProxy = makeProxy(process.env.USERS_URL);
const costsProxy = makeProxy(process.env.COSTS_URL);
const logsProxy = makeProxy(process.env.LOGS_URL);
const adminProxy = makeProxy(process.env.ADMIN_URL);

/*   Route forwarding */
app.use(
  createProxyMiddleware('/api/users', {
    target: process.env.USERS_URL,
    changeOrigin: true,
    logLevel: 'silent'
  })
);

app.use(
  createProxyMiddleware('/api/report', {
    target: process.env.COSTS_URL,
    changeOrigin: true,
    logLevel: 'silent'
  })
);

app.use(
  createProxyMiddleware('/api/logs', {
    target: process.env.LOGS_URL,
    changeOrigin: true,
    logLevel: 'silent'
  })
);

app.use(
  createProxyMiddleware('/api/about', {
    target: process.env.ADMIN_URL,
    changeOrigin: true,
    logLevel: 'silent'
  })
);

/*   /api/add router */
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
    return usersProxy(req, res, next);
  }

  if (isCostAdd) {
    return costsProxy(req, res, next);
  }

  return res.status(400).json({
    id: 4001,
    message: 'Invalid payload for /api/add'
  });
});

/*   Error handler */
app.use((err, req, res, next) => {
  req.log.error({ err }, 'gateway error');
  res.status(500).json({
    id: 5002,
    message: 'Gateway error'
  });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`gateway listening on port ${port}`);
});

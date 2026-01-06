'use strict';

const axios = require('axios');

function buildLogPayload(serviceName, req, res, durationMs, message) {
  return {
    service: String(serviceName || 'unknown'),
    method: String(req.method || ''),
    path: String(req.originalUrl || req.url || ''),
    status: Number(res.statusCode || 0),
    duration_ms: Number(durationMs || 0),
    ip: String(req.ip || req.connection?.remoteAddress || ''),
    user_agent: String(req.headers?.['user-agent'] || ''),
    message: String(message || 'endpoint accessed')
  };
}

async function sendLog(logsUrl, payload) {
  if (!logsUrl) return;

  try {
    const base = String(logsUrl).replace(/\/+$/, '');
    await axios.post(`${base}/api/logs`, payload, { timeout: 3000 });
  } catch (e) {
    // logging must NEVER crash the service
  }
}

function logEveryRequest(serviceName, logsUrl) {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const payload = buildLogPayload(serviceName, req, res, durationMs, 'endpoint accessed');
      sendLog(logsUrl, payload);
    });

    next();
  };
}

module.exports = {
  logEveryRequest,
  buildLogPayload,
  sendLog
};

'use strict';

const axios = require('axios');

function buildLogPayload(serviceName, req, res, durationMs, message) {
  return {
    timestamp: new Date(),
    service: serviceName,
    method: req.method,
    path: req.originalUrl || req.url,
    status: res.statusCode,
    duration_ms: durationMs,
    ip: req.ip || req.connection?.remoteAddress || '',
    user_agent: String(req.headers['user-agent'] || ''),
    message: message || 'request completed'
  };
}

async function sendLog(logsUrl, payload) {
  if (!logsUrl) return;

  try {
    await axios.post(`${logsUrl.replace(/\/+$/, '')}/api/logs`, payload, {
      timeout: 1500
    });
  } catch (e) {
    // NEVER crash the service because logging failed
  }
}

// Express middleware: logs every request after response finishes
function logEveryRequest(serviceName, logsUrl) {
  return function (req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const payload = buildLogPayload(serviceName, req, res, durationMs);
      sendLog(logsUrl, payload);
    });

    next();
  };
}

module.exports = {
  buildLogPayload,
  sendLog,
  logEveryRequest
};

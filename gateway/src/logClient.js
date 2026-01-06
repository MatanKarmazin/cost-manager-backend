'use strict';

const axios = require('axios');

function buildLogPayload(serviceName, req, res, durationMs, message) {
  return {
    timestamp: new Date().toISOString(),
    service: serviceName,
    method: req.method,
    path: req.originalUrl || req.url,
    status: res.statusCode,
    duration_ms: durationMs,
    ip: req.ip || '',
    user_agent: String(req.headers['user-agent'] || ''),
    message: message || 'request received'
  };
}

async function sendLog(logsUrl, payload) {
  if (!logsUrl) {
    return;
  }

  try {
    await axios.post(`${logsUrl}/api/logs`, payload, { timeout: 2000 });
  } catch (e) {
    // Do nothing - logging should never break the service
  }
}

module.exports = { buildLogPayload, sendLog };

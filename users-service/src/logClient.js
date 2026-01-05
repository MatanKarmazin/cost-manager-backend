'use strict';

function buildLogFromRequest(req, res, startMs, serviceName) {
  const durationMs = Date.now() - startMs;

  return {
    timestamp: new Date().toISOString(),
    service: serviceName,
    method: req.method,
    path: req.originalUrl || req.url,
    status: res.statusCode,
    duration_ms: durationMs,
    ip: req.ip || '',
    user_agent: String(req.headers['user-agent'] || ''),
    message: 'request received'
  };
}

async function sendLog(logsUrl, payload) {
  if (!logsUrl) {
    return;
  }

  try {
    // Node 18+ has fetch built-in (you’re on Node 24, so you’re good)
    await fetch(logsUrl + '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Never break the request because logging failed
  }
}

function logEveryRequest(serviceName, logsBaseUrl) {
  return function logMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
      const payload = buildLogFromRequest(req, res, start, serviceName);
      sendLog(logsBaseUrl, payload);
    });

    next();
  };
}

module.exports = {
  logEveryRequest
};

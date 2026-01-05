import express from "express";

const router = express.Router();

// In-memory store (easy for grading + dev). Replace with file/DB if you want.
const logsStore = [];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

router.post("/", (req, res) => {
  const log = req.body;

  // Minimal validation (keeps it robust without being annoying)
  const ok =
    log &&
    isNonEmptyString(log.timestamp) &&
    isNonEmptyString(log.service) &&
    isNonEmptyString(log.method) &&
    isNonEmptyString(log.path) &&
    Number.isFinite(log.status);

  if (!ok) {
    return res.status(400).json({
      error: "Invalid log object. Required: timestamp, service, method, path, status"
    });
  }

  // Normalize / fill defaults
  const normalized = {
    timestamp: log.timestamp,
    service: log.service,
    level: isNonEmptyString(log.level) ? log.level : "INFO",
    method: log.method,
    path: log.path,
    status: log.status,
    duration_ms: Number.isFinite(log.duration_ms) ? log.duration_ms : null,
    ip: isNonEmptyString(log.ip) ? log.ip : null,
    user_agent: isNonEmptyString(log.user_agent) ? log.user_agent : null,
    message: isNonEmptyString(log.message) ? log.message : "request completed",
    correlation_id: isNonEmptyString(log.correlation_id) ? log.correlation_id : null
  };

  logsStore.push(normalized);

  // Keep memory bounded
  if (logsStore.length > 5000) logsStore.shift();

  return res.status(201).json({ status: "ok" });
});

router.get("/", (req, res) => {
  // Optional filters
  const { service, level, method, status, from, to, limit = "200" } = req.query;

  let result = logsStore;

  if (service) result = result.filter(l => l.service === service);
  if (level) result = result.filter(l => l.level === level);
  if (method) result = result.filter(l => l.method === method);
  if (status) result = result.filter(l => String(l.status) === String(status));

  if (from) {
    const fromT = Date.parse(from);
    if (!Number.isNaN(fromT)) result = result.filter(l => Date.parse(l.timestamp) >= fromT);
  }
  if (to) {
    const toT = Date.parse(to);
    if (!Number.isNaN(toT)) result = result.filter(l => Date.parse(l.timestamp) <= toT);
  }

  // newest first
  result = [...result].reverse();

  const lim = Math.max(1, Math.min(2000, parseInt(limit, 10) || 200));
  return res.json(result.slice(0, lim));
});

export default router;

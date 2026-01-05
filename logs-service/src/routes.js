'use strict';

const express = require('express');
const { Log } = require('../models/log.model');

const router = express.Router();

// GET /api/logs
router.get('/api/logs', async (req, res, next) => {
  try {
    const logs = await Log.find({}, { _id: 0 }).sort({ timestamp: -1 }).lean();
    return res.json(logs);
  } catch (e) {
    return next(e);
  }
});

// POST /api/logs  (used by other services)
router.post('/api/logs', async (req, res, next) => {
  try {
    const body = req.body || {};

    await Log.create({
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      service: String(body.service || 'unknown'),
      method: String(body.method || ''),
      path: String(body.path || ''),
      status: Number(body.status || 0),
      duration_ms: Number(body.duration_ms || 0),

      // Required by your schema: fill from request if missing
      ip: String(body.ip || req.ip || ''),
      user_agent: String(body.user_agent || req.headers['user-agent'] || ''),

      message: String(body.message || '')
    });

    return res.status(201).json({ ok: true });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

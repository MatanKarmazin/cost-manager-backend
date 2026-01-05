'use strict';

const express = require('express');
const { Log } = require('../../models/log.model');

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

module.exports = router;

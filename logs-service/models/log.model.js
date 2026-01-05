'use strict';

const mongoose = require('mongoose');

// Log schema saved in "logs" collection
const logSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    service: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: Number, required: true },
    duration_ms: { type: Number, required: true },
    ip: { type: String, required: true },
    user_agent: { type: String, required: true },
    message: { type: String, required: true }
  },
  { versionKey: false }
);

const Log = mongoose.model('Log', logSchema, 'logs');

module.exports = { Log };
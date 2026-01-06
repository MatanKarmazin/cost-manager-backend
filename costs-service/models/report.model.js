'use strict';

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userid: { type: Number, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },

    // Save the final response JSON shape (so you can return it instantly)
    report_json: { type: Object, required: true },

    created_at: { type: Date, required: true }
  },
  { versionKey: false }
);

// Important: unique cache key for a report
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema, 'reports');

module.exports = { Report };

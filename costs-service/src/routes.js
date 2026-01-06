'use strict';

const express = require('express');
const { Cost } = require('../models/cost.model');
const { Report } = require('../models/report.model');

const router = express.Router();

const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.id = 4001;
  return err;
}

function isMonthInPast(year, month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return true;
  if (year > currentYear) return false;
  return month < currentMonth;
}

function makeMonthRange(year, month) {
  // month is 1-12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // next month start
  return { start, end };
}

function buildEmptyReport(userid, year, month) {
  return {
    userid,
    year,
    month,
    costs: CATEGORIES.map((c) => ({ [c]: [] }))
  };
}

async function computeReport(userid, year, month) {
  const { start, end } = makeMonthRange(year, month);

  // Aggregate costs for that user and month
  const rows = await Cost.aggregate([
    {
      $match: {
        userid: userid,
        created_at: { $gte: start, $lt: end }
      }
    },
    {
      $project: {
        category: 1,
        sum: 1,
        description: 1,
        day: { $dayOfMonth: '$created_at' }
      }
    },
    {
      $group: {
        _id: '$category',
        items: { $push: { sum: '$sum', description: '$description', day: '$day' } }
      }
    }
  ]);

  // Fill the required JSON shape with empty arrays for missing categories
  const report = buildEmptyReport(userid, year, month);

  const byCategory = {};
  for (const r of rows) {
    byCategory[String(r._id || '').toLowerCase()] = r.items || [];
  }

  report.costs = CATEGORIES.map((c) => ({
    [c]: Array.isArray(byCategory[c]) ? byCategory[c] : []
  }));

  return report;
}

// GET /api/report?id=123123&year=2025&month=11
router.get('/api/report', async (req, res, next) => {
  try {
    const id = Number(req.query.id);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!Number.isFinite(id)) throw badRequest('id must be a number');
    if (!Number.isFinite(year) || year < 1970 || year > 3000) throw badRequest('year is invalid');
    if (!Number.isFinite(month) || month < 1 || month > 12) throw badRequest('month is invalid');

    const past = isMonthInPast(year, month);

    // Computed Pattern: if past, try cache first
    if (past) {
      const cached = await Report.findOne({ userid: id, year, month }).lean();
      if (cached && cached.report_json) {
        return res.json(cached.report_json);
      }
    }

    // Compute fresh
    const reportJson = await computeReport(id, year, month);

    // If past month, save it for future requests
    if (past) {
      await Report.updateOne(
        { userid: id, year, month },
        { $set: { report_json: reportJson, created_at: new Date() } },
        { upsert: true }
      );
    }

    return res.json(reportJson);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

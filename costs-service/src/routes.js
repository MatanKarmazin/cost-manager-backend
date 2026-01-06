'use strict';

const express = require('express');
const { Cost } = require('../models/cost.model');
const { Report } = require('../models/report.model');

const router = express.Router();

const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

function httpError(status, id, message) {
  const err = new Error(message);
  err.status = status;
  err.id = id;
  return err;
}

function isPast(d) {
  return d.getTime() < Date.now();
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
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
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

// POST /api/add  (Add cost item)
router.post('/api/add', async (req, res, next) => {
  try {
    const body = req.body || {};

    const userid = Number(body.userid);
    const description = String(body.description || '').trim();
    const category = String(body.category || '').trim().toLowerCase();
    const sum = Number(body.sum);

    if (!Number.isFinite(userid)) {
      throw httpError(400, 4001, 'userid must be a number');
    }
    if (!description) {
      throw httpError(400, 4002, 'description is required');
    }
    if (!CATEGORIES.includes(category)) {
      throw httpError(400, 4003, `category must be one of: ${CATEGORIES.join(', ')}`);
    }
    if (!Number.isFinite(sum)) {
      throw httpError(400, 4004, 'sum must be a number');
    }

    let createdAt = new Date();
    if (body.created_at) {
      createdAt = new Date(body.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        throw httpError(400, 4005, 'created_at is invalid');
      }
    }
    if (isPast(createdAt)) {
      throw httpError(400, 4006, 'Cannot add costs in the past');
    }

    const doc = await Cost.create({
      userid,
      description,
      category,
      sum,
      created_at: createdAt
    });

    return res.status(201).json({
      userid: doc.userid,
      description: doc.description,
      category: doc.category,
      sum: doc.sum,
      created_at: doc.created_at
    });
  } catch (e) {
    return next(e);
  }
});

// GET /api/report?id=123123&year=2025&month=11
router.get('/api/report', async (req, res, next) => {
  try {
    const id = Number(req.query.id);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!Number.isFinite(id)) throw httpError(400, 4001, 'id must be a number');
    if (!Number.isFinite(year) || year < 1970 || year > 3000) {
      throw httpError(400, 4002, 'year is invalid');
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      throw httpError(400, 4003, 'month is invalid');
    }

    const past = isMonthInPast(year, month);

    // computed pattern cache
    if (past) {
      const cached = await Report.findOne({ userid: id, year, month }).lean();
      if (cached && cached.report_json) {
        return res.json(cached.report_json);
      }
    }

    const reportJson = await computeReport(id, year, month);

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

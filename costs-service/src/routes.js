'use strict';

const express = require('express');
const mongoose = require('mongoose');

const { Cost } = require('../models/cost.model');
const { Report } = require('../models/report.model');

const router = express.Router();

const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

/* ============================
   User existence check
============================ */
const USERS_URL = (process.env.USERS_URL || '').replace(/\/+$/, '');
if (!USERS_URL) {
  console.warn('[COSTS] Missing USERS_URL env var. User existence checks will fail.');
}

/* ============================
   Helpers
============================ */

function httpError(status, id, message) {
  const err = new Error(message);
  err.status = status;
  err.id = id;
  return err;
}

function isPast(d) {
  return d.getTime() < Date.now();
}

async function userExistsViaUsersService(userid) {
  if (!USERS_URL) return false;

  const url = `${USERS_URL}/api/users/${encodeURIComponent(userid)}`;

  try {
    const resp = await fetch(url, { method: 'GET' });

    if (resp.status === 200) return true;
    if (resp.status === 404) return false;

    // unexpected: users-service error, auth, etc.
    const text = await resp.text().catch(() => '');
    console.error('[COSTS] users-service unexpected response:', resp.status, text);
    throw httpError(502, 5007, 'users-service check failed');
  } catch (e) {
    console.error('[COSTS] failed calling users-service:', e.message);
    throw httpError(502, 5008, 'users-service unreachable');
  }
}

function isMonthInPast(year, month) {
  const now = new Date();
  if (year < now.getFullYear()) return true;
  if (year > now.getFullYear()) return false;
  return month < now.getMonth() + 1;
}

function makeMonthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month));
  return { start, end };
}

function buildEmptyReport(userid, year, month) {
  return {
    userid,
    year,
    month,
    costs: CATEGORIES.map((c) => ({ [c]: [] })),
  };
}

async function computeReport(userid, year, month) {
  const { start, end } = makeMonthRange(year, month);

  const rows = await Cost.aggregate([
    { $match: { userid, created_at: { $gte: start, $lt: end } } },
    {
      $project: {
        category: 1,
        sum: 1,
        description: 1,
        day: { $dayOfMonth: '$created_at' },
      },
    },
    {
      $group: {
        _id: '$category',
        items: { $push: { sum: '$sum', description: '$description', day: '$day' } },
      },
    },
  ]);

  const report = buildEmptyReport(userid, year, month);
  const byCategory = {};

  for (const r of rows) {
    byCategory[r._id] = r.items || [];
  }

  report.costs = CATEGORIES.map((c) => ({ [c]: byCategory[c] || [] }));
  return report;
}

/* ============================Routes============================ */

// POST /api/add
router.post('/api/add', async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1) Read inputs
    const userid = Number(body.userid);
    const description = String(body.description || '').trim();
    const category = String(body.category || '')
      .trim()
      .toLowerCase();
    const sum = Number(body.sum);

    // 2) Debug + validation + user existence check (PASTE LOGS HERE)
    console.log('[ADD COST] handler hit');

    if (!Number.isFinite(userid)) {
      console.error('[ADD COST] userid not a number:', body.userid);
      throw httpError(400, 4001, 'userid must be a number');
    }

    // Requirement: user must exist
    const exists = await userExistsViaUsersService(userid);
    console.log('[ADD COST] userExistsByNumericId =>', exists, 'for userid=', userid);

    if (!exists) {
      console.error('[ADD COST] USER NOT FOUND, blocking insert. userid=', userid);
      return res.status(404).json({ error: `User ${userid} does not exist` }); // TEMP stop here
    }

    console.log('[ADD COST] about to insert cost...');

    // Continue with your existing validation
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

    // 3) Insert to DB (THIS MUST NOT RUN when user doesn't exist)
    const doc = await Cost.create({
      userid,
      description,
      category,
      sum,
      created_at: createdAt,
    });

    return res.status(201).json({
      userid: doc.userid,
      description: doc.description,
      category: doc.category,
      sum: doc.sum,
      created_at: doc.created_at,
    });
  } catch (e) {
    return next(e);
  }
});

// GET /api/report?id=123123&year=2026&month=1
router.get('/api/report', async (req, res, next) => {
  try {
    const userid = Number(req.query.id);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!Number.isFinite(year) || year < 1970 || year > 3000)
      throw httpError(400, 4002, 'year is invalid');
    if (!Number.isFinite(month) || month < 1 || month > 12)
      throw httpError(400, 4003, 'month is invalid');
    if (!Number.isFinite(userid)) {
      console.error(`[REPORT] Invalid userid (not a number):`, req.query.id);
      throw httpError(400, 4001, 'userid must be a number');
    }

    const exists = await userExistsViaUsersService(userid);
    if (!exists) {
      console.error(`[ADD COST] Invalid userid (user does not exist):`, userid);
      throw httpError(404, 4007, `User ${userid} does not exist`);
    }

    const past = isMonthInPast(year, month);

    if (past) {
      const cached = await Report.findOne({ userid, year, month }).lean();
      if (cached?.report_json) return res.json(cached.report_json);
    }

    const reportJson = await computeReport(userid, year, month);

    if (past) {
      await Report.updateOne(
        { userid, year, month },
        { $set: { report_json: reportJson, created_at: new Date() } },
        { upsert: true },
      );
    }

    return res.json(reportJson);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

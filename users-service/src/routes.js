'use strict';

const express = require('express');
const { User } = require('../models/user.model');
const { Cost } = require('../models/cost.model');

const router = express.Router();

function httpError(status, id, message) {
  const err = new Error(message);
  err.status = status;
  err.id = id;
  return err;
}

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

// GET /api/users  -> list of users
router.get('/api/users', async (req, res, next) => {
  try {
    const users = await User.find({}, { _id: 0 }).sort({ id: 1 }).lean();
    return res.json(users);
  } catch (e) {
    return next(e);
  }
});

// GET /api/users/:id  -> user details + total costs
router.get('/api/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw httpError(400, 4001, 'id must be a number');
    }

    const user = await User.findOne({ id: id }, { _id: 0 }).lean();
    if (!user) {
      throw httpError(404, 4041, 'User not found');
    }

    const totalAgg = await Cost.aggregate([
      { $match: { userid: id } },
      { $group: { _id: '$userid', total: { $sum: '$sum' } } }
    ]);

    const total = totalAgg && totalAgg[0] ? Number(totalAgg[0].total) : 0;

    return res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total: total
    });
  } catch (e) {
    return next(e);
  }
});

// POST /api/add  -> add a new user
router.post('/api/add', async (req, res, next) => {
  try {
    const body = req.body || {};

    const id = Number(body.id);
    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const birthday = parseDate(body.birthday);

    if (!Number.isFinite(id)) {
      throw httpError(400, 4001, 'id must be a number');
    }
    if (!firstName) {
      throw httpError(400, 4002, 'first_name is required');
    }
    if (!lastName) {
      throw httpError(400, 4003, 'last_name is required');
    }
    if (!birthday) {
      throw httpError(400, 4004, 'birthday is invalid');
    }

    const exists = await User.findOne({ id: id }).lean();
    if (exists) {
      throw httpError(409, 4091, 'User with this id already exists');
    }

    const doc = await User.create({
      id: id,
      first_name: firstName,
      last_name: lastName,
      birthday: birthday
    });

    return res.status(201).json({
      id: doc.id,
      first_name: doc.first_name,
      last_name: doc.last_name,
      birthday: doc.birthday
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

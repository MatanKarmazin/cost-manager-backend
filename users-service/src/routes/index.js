'use strict';

const express = require('express');
const { User } = require('../../models/user.model');
const { Cost } = require('../../models/cost.model');
const { httpError } = require('../utils/httpError');
const { isFiniteNumber, parseDate, isNonEmptyString, asTrimmedString } = require('../utils/validate');

const router = express.Router();

/*   POST /api/add  (Add user)
   Required body: id, first_name, last_name, birthday
*/
router.post('/api/add', async (req, res, next) => {
  try {
    req.log.info({ endpoint: '/api/add' }, 'users-service endpoint accessed');

    const body = req.body || {};

    /*   Validate id */
    if (!Object.prototype.hasOwnProperty.call(body, 'id') || !isFiniteNumber(body.id)) {
      throw httpError(400, 4001, 'Invalid or missing id');
    }

    /*   Validate first_name and last_name */
    if (!Object.prototype.hasOwnProperty.call(body, 'first_name') || !isNonEmptyString(body.first_name)) {
      throw httpError(400, 4002, 'Invalid or missing first_name');
    }

    if (!Object.prototype.hasOwnProperty.call(body, 'last_name') || !isNonEmptyString(body.last_name)) {
      throw httpError(400, 4003, 'Invalid or missing last_name');
    }

    /*   Validate birthday */
    if (!Object.prototype.hasOwnProperty.call(body, 'birthday')) {
      throw httpError(400, 4004, 'Missing birthday');
    }

    const birthday = parseDate(body.birthday);
    if (!birthday) {
      throw httpError(400, 4005, 'Invalid birthday');
    }

    /*   Normalize strings */
    const userToInsert = {
      id: body.id,
      first_name: asTrimmedString(body.first_name),
      last_name: asTrimmedString(body.last_name),
      birthday
    };

    /*   Ensure id is unique */
    const existing = await User.findOne({ id: userToInsert.id }).lean();
    if (existing) {
      throw httpError(409, 4091, 'User with this id already exists');
    }

    /*   Insert user */
    const created = await User.create(userToInsert);

    /*   Reply must include the same names as in users collection */
    res.status(201).json({
      id: created.id,
      first_name: created.first_name,
      last_name: created.last_name,
      birthday: created.birthday
    });
  } catch (e) {
    next(e);
  }
});

/*   GET /api/users  (List of users) */
router.get('/api/users', async (req, res, next) => {
  try {
    req.log.info({ endpoint: '/api/users' }, 'users-service endpoint accessed');

    const users = await User.find({}, { _id: 0 }).lean();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

/*   GET /api/users/:id  (User details + total costs)
   Reply props must be: first_name, last_name, id, total
*/
router.get('/api/users/:id', async (req, res, next) => {
  try {
    req.log.info({ endpoint: '/api/users/:id' }, 'users-service endpoint accessed');

    const idRaw = req.params.id;

    /*   Validate path param is a number */
    const idNum = Number(idRaw);
    if (!Number.isFinite(idNum)) {
      throw httpError(400, 4006, 'Invalid user id in path');
    }

    /*   Find user */
    const user = await User.findOne({ id: idNum }, { _id: 0 }).lean();
    if (!user) {
      throw httpError(404, 4041, 'User not found');
    }

    /*   Compute total from costs collection using aggregation */
    const agg = await Cost.aggregate([
      { $match: { userid: idNum } },
      { $group: { _id: '$userid', total: { $sum: '$sum' } } }
    ]);

    const total = agg.length > 0 ? agg[0].total : 0;

    res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total
    });
  } catch (e) {
    next(e);
  }
});

/*   Fallback for unknown routes in this service */
router.use((req, res) => {
  res.status(404).json({ id: 4040, message: 'Route not found' });
});

module.exports = router;

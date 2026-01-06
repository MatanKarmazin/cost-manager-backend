'use strict';

const express = require('express');
const router = express.Router();

// Put your real names here (ONLY first_name + last_name)
const TEAM = [
  { first_name: 'Matan', last_name: '...' },
  { first_name: 'Eric', last_name: '...' }
];

router.get('/api/about', (req, res) => {
  res.json(TEAM.map((m) => ({ first_name: m.first_name, last_name: m.last_name })));
});

module.exports = router;

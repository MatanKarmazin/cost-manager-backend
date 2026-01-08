'use strict';

const express = require('express');
const router = express.Router();

const TEAM = [
  { first_name: 'Matan', last_name: 'Kar Mazin' },
  { first_name: 'Eric', last_name: 'Rosenberg' }
];

router.get('/api/about', (req, res) => {
  res.json(TEAM.map((m) => ({ first_name: m.first_name, last_name: m.last_name })));
});

module.exports = router;

'use strict';

const express = require('express');

const router = express.Router();

/*   Placeholder routes; each service will replace with its own endpoints */
router.get('/not-implemented', (req, res) => {
  res.status(501).json({ id: 5010, message: 'Not implemented in this service yet' });
});

module.exports = router;

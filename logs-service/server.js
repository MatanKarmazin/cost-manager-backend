'use strict';

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { app } = require('./app');

dotenv.config();

const port = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'cost_manager' })
  .then(() => {
    app.listen(port, () => {
      console.log(`logs-service listening on port ${port}`);
    });
  })
  .catch((e) => {
    console.error('mongo connection failed', e);
    process.exit(1);
  });

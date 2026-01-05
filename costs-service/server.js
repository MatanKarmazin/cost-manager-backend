'use strict';

const { logEveryRequest } = require('./src/logClient');

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(
  pinoHttp({
    customLogLevel: function customLogLevel(res, err) {
      if (err) {
        return 'error';
      }

      if (res.statusCode >= 500) {
        return 'error';
      }

      if (res.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    }
  })
);

app.use(logEveryRequest('costs-service', process.env.LOGS_URL));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', require('./src/routes'));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorId = err.id || 5001;
  const msg = err.message || 'Internal Server Error';

  req.log.error({ err }, 'request failed');
  res.status(status).json({ id: errorId, message: msg });
});

const port = Number(process.env.PORT || 3002);

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'cost_manager' })
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`costs-service listening on port ${port}`);
    });
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('mongo connection failed', e);
    process.exit(1);
  });

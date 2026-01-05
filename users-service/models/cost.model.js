'use strict';

const mongoose = require('mongoose');

/*   Minimal Cost schema for computing totals.
   The "costs-service" will be responsible for adding costs.
   Here we only read {userid,sum} from the shared DB.
*/
const costSchema = new mongoose.Schema(
  {
    userid: { type: Number, required: true, index: true },
    sum: { type: Number, required: true }
  },
  {
    versionKey: false
  }
);

/*   Keep collection name exactly "costs" */
const Cost = mongoose.model('Cost', costSchema, 'costs');

module.exports = { Cost };

'use strict';

const mongoose = require('mongoose');

/*   User schema based on project requirements:
   id:Number, first_name:String, last_name:String, birthday:Date
*/
const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    birthday: { type: Date, required: true }
  },
  {
    versionKey: false
  }
);

/*   Keep collection name exactly "users" */
const User = mongoose.model('User', userSchema, 'users');

module.exports = { User };

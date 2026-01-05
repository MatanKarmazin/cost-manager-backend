'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    birthday: { type: Date, required: true }
  },
  { versionKey: false }
);

const User = mongoose.model('User', userSchema, 'users');

module.exports = { User };

'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

async function connectTestDb() {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'test_db' });
}

async function clearTestDb() {
  const collections = mongoose.connection.collections;
  const keys = Object.keys(collections);

  for (let i = 0; i < keys.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await collections[keys[i]].deleteMany({});
  }
}

async function closeTestDb() {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
}

module.exports = { connectTestDb, clearTestDb, closeTestDb };

// db.js
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

// MongoDB connection URL with authentication options
const url = `${process.env.MONGO_URL}`;

let dbInstance = null;
const dbName = `${process.env.MONGO_DB}`;

async function connectToDatabase() {
    if (dbInstance) {
        return dbInstance
    };

    const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });


    // Task 1: Connect to MongoDB
    await client.connect();

    // Task 2: Connect to database giftDB and store in variable dbInstance
    dbInstance =  client.db(dbName);

    // Task 3: Return database instance
    return dbInstance
}

module.exports = connectToDatabase;

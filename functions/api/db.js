const MongoClient = require('mongodb').MongoClient;
const { config } = require('./config');
const client = new MongoClient(config.mongoUri);

module.exports = async function() {
    try {
        await client.connect();
        return client.db("qb");
    } catch (err)
        { console.log(err); throw(err);  }
}

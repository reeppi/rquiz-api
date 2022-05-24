const { config } = require('./config');
const uri = "mongodb+srv://"+config.dbUsername+":"+config.dbPassword+"@cluster0.lej9i.mongodb.net/qb?retryWrites=true&w=majority";
const express =  require('express');
const serverless = require('serverless-http');
global.cors = require('cors');
const { MongoClient } = require('mongodb');
global.client = new MongoClient(uri);
const app = express();
global.router = express.Router();
global.passport = require('passport');
require('./scoreboard')();
require('./quiz')();
require('./admin')();
require('./passport');
require('./auth')();
app.use(cors()); 
app.use(express.json({ limit: '15kb' })); 
app.use(passport.initialize());

checkAccess = (req, res, next) => {
    next();
}

app.use('/list', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/edit', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/delete', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/addscore', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/', router);
module.exports.handler = serverless(app);
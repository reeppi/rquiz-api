const express =  require('express');
const serverless = require('serverless-http');
global.cors = require('cors');
const fileUpload = require('express-fileupload');
global.app = express();
global.router = express.Router();
global.passport = require('passport');
require('./scoreboard')();
require('./quiz')();
require('./admin')();
require('./passport');
require('./auth')();
require('./files')();
app.use(cors()); 
app.use(express.json({ limit: '15kb' })); 
app.use(passport.initialize());

app.use(fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 },
  }));

checkAccess = (req, res, next) => {
    next();
}

app.use('/list', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/edit', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/delete', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/addscore', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/upload', passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }), checkAccess);
app.use('/', router);
module.exports.handler = serverless(app);
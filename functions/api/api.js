const express =  require('express');
const serverless = require('serverless-http');
global.cors = require('cors');
const fileUpload = require('express-fileupload');
global.app = express();
global.router = express.Router();
global.passport = require('passport');
require('./passport');
require('./scoreboard')();
require('./quiz')();
require('./admin')();
require('./auth')();
require('./files')();
require('./user')();
app.use(cors()); 
app.use(express.json({ limit: '15kb' })); 
app.use(passport.initialize());

app.use(fileUpload({
    limits: { fileSize: 4 * 1024 * 1024 },
  }));

checkAccess = (req, res, next) => {
    next();
}

router.get('/', cors(), (req, res) => {
  res.write("tietovisan api");
  res.end();
});

const authOb = { session: false, failureRedirect : '/failureJson' }

app.use('/list', passport.authenticate('jwt', authOb), checkAccess);
app.use('/edit', passport.authenticate('jwt', authOb), checkAccess);
app.use('/delete', passport.authenticate('jwt', authOb), checkAccess);
app.use('/addscore', passport.authenticate('jwt', authOb), checkAccess);
app.use('/upload', passport.authenticate('jwt', authOb), checkAccess);
app.use('/uploadaudio', passport.authenticate('jwt', authOb), checkAccess);
app.use('/rename', passport.authenticate('jwt', authOb), checkAccess);
app.use('/user', passport.authenticate('jwt',authOb), checkAccess);
app.use('/quiza', passport.authenticate('jwt',authOb), checkAccess);
app.use('/', router);
module.exports.handler = serverless(app);
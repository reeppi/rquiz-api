const  jwt = require('jsonwebtoken');
const { config } = require('./config');
const { tokenMap } = require('./token.js');

function removeToken(code)
{
  tokenMap.delete(code);
}

function genAndSendTokenCode(res,load)
{
  var token = jwt.sign(load, config.SessionSecret, { expiresIn: '180m',});
  var code; 
  {
  code = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
  } while (!tokenMap.has(code))
  tokenMap.set(code,token);
  setTimeout(removeToken, 10000, code);
  res.redirect(config.quizUrl+"?code="+code);
}

module.exports = function() {

router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'],}));
router.get('/auth/facebook',passport.authenticate('facebook', { scope: 'email' }));

router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/failureJson' }),(req, res) => {
      var load = { id: req.user._json.sub, name: req.user._json.name, email: req.user._json.email }
      genAndSendTokenCode(res,load);
    }
  ); 

router.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/failureJson' }),
    (req, res) => {
      var load = { id: req.user._json.id, name: req.user._json.name, email: req.user._json.email }
      genAndSendTokenCode(res,load);
    }
);
  
router.get('/getToken', cors(), (req, res) => {
  if ( !req.query.code || req.query.code === undefined ) res.json({error:"Koodi puuttuu"});
  var code = req.query.code;
  var token="";
    if ( tokenMap.has(code) )
    {
      token = tokenMap.get(code);
      tokenMap.delete(code);
      const tokenLoad = jwt.verify(token,config.SessionSecret);
      res.json({token, msg:"Kirjautuminen "+tokenLoad.email });
    } else {
      res.json({error:"Yritä kirjautua uudestaan."});
    }
    console.log("TOKEN: "+ token);
});

router.get(
  '/profile',cors(), passport.authenticate('jwt', { session: false, failureRedirect : '/failureJson' }),
    (req, res) => {
    res.json({error:"Olet kirjautuneena "+req.user.email});
  }
);

router.get('/failureJson', cors(), function(req, res) {
  res.json({error:"Tunnistautuminen epäonnistui. Kirjaudu uudestaan. ",deny:true});
});

}
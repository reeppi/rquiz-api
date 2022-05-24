const  jwt = require('jsonwebtoken');
const { config } = require('./config');
const { tokenMap } = require('./token.js');

function removeToken(code)
{
  console.log("token "+code+" deleted");
  tokenMap.delete(code);
}

const generateJwtToken = (user) => {
  const token = jwt.sign(user, config.SessionSecret, { expiresIn: '60m',});
  return token;
};

module.exports = function() {

router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'],}));
router.get('/auth/facebook',passport.authenticate('facebook', { scope: 'email' }));

router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/failureJson' }),(req, res) => {
      var load = { id: req.user._json.sub, name: req.user._json.name, email: req.user._json.email }
      var token = generateJwtToken(load);
      var code;
      {
        code = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
      } while (!tokenMap.has(code))
      tokenMap.set(code,token);
      let codeLet = code;
      setTimeout(removeToken, 10000, codeLet);
      res.redirect(config.quizUrl+"?code="+code);
    }
  ); 

router.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/failureJson' }),
    (req, res) => {
      let code = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
      var load = { id: req.user._json.id, name: req.user._json.name, email: req.user._json.email }
      var token = generateJwtToken(load);
      tokenMap.set(code,token);
      setTimeout(removeToken, 10000, code);
      res.redirect(config.quizUrl+"?code="+code);
    }
);
  
router.get('/getToken', cors(), (req, res) => {
  if ( !req.query.code || req.query.code === undefined ) res.json({error:"Koodi puutuu"});
  var code = req.query.code;
  var token="";
    if ( tokenMap.has(code) )
    {
      token = tokenMap.get(code);
      tokenMap.delete(code);
      const tokenLoad = jwt.verify(token,config.SessionSecret);
      res.json({token, msg:"Kirjautuminen "+tokenLoad.email });
    } else {
      res.json({error:"Tokenia koodilla "+code+" ei löydy"});
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
  res.json({error:"Tunnistauminen epäonnistui. Yritä kirjautua uudestaan. "});
});

}
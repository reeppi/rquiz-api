const {config} = require('./config');
const GoogleStrategy = require('passport-google-oauth20');
const FacebookStrategy = require('passport-facebook');
const JWTStrategy = require('passport-jwt');

passport.use(
    new GoogleStrategy.Strategy(
      {
        clientID: config.GoogleClientId,
        clientSecret: config.GoogleClientSecret,
        callbackURL: '/auth/google/callback',
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(undefined, profile);
      }
    )
  );

  passport.use(
    new FacebookStrategy.Strategy(
      {
        clientID: config.FacebookClientId,
        clientSecret: config.FacebookClientSecret,
        callbackURL: '/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'email'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(undefined, profile);
      }
    )
  );

  passport.use(
    new JWTStrategy.Strategy(
      {
        jwtFromRequest: (req) => {
          let token = null;
          if (req && req.headers.authorization) {
            token = req.headers.authorization;
          }
          return token;
        },
        secretOrKey: config.SessionSecret,
      },
      (jwtPayload, done) => {
        if (!jwtPayload) {
          return done('No token found...');
        }
  
        return done(null, jwtPayload);
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });
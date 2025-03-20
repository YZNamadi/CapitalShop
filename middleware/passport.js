const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const userModel = require('../models/user');

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
        const email = profile.emails?.[0]?.value; 
        const isVerified = profile.emails?.[0]?.verified ; 

        if (!email) {
            return cb(new Error("Email not provided by Google"), null);
        }

        let user = await userModel.findOne({ email });

        if (!user) {
            user = new userModel({
                name: profile.displayName,
                email,
                password: " ",
                isVerified
            });
            await user.save();
        }
        return cb(null, user);
    } catch (error) {
        return cb(error, null);
    }
  }
));

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const user = await userModel.findById(id);
        if (!user) {
            return cb(new Error('User not found'), null);
        }
        cb(null, user);
    } catch (error) {
        cb(error, null);
    }
});

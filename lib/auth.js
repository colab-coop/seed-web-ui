/**
 * Module that will handle our authentication tasks
 */
'use strict';

const User = require('../models/user');
const Profile = require('../models/profile');
const LocalStrategy = require('passport-local').Strategy;

exports.config = function (settings) {

};

/**
 * A helper method to retrieve a user from a local DB and ensure that the provided password matches.
 * @param req
 * @param res
 * @param next
 */
exports.localStrategy = function () {

  return new LocalStrategy(function (email, password, done) {
    console.log("passport local - email: " + email + ", pass: " + password);

    let foundUser;
    let foundProfile;
    //Retrieve the user from the database by login
    User.findOne({email: email}).populate('defaultProfileRef').exec()
      .then((user) => {
        //If we couldn't find a matching user, flash a message explaining what happened
        if (!user) {
          return done(null, false, {
            message: 'Login not found'
          });
        }

        //Make sure that the provided password matches what's in the DB.
        if (!user.passwordMatches(password)) {
          return done(null, false, {
            message: 'Incorrect Password'
          });
        }
        foundUser = user;
        if (user.defaultProfileRef) {
          return user.defaultProfileRef; //Profile.findOne({_id: user.defaultProfileId});
        } else {
          // couldn't fine default profile, create one of the fly (primarily as migration)
          console.log("automatically creating profile for user: " + user);
          var name = user.name || user.email;
          return Profile.create({name: name, email: email, memberType: 'provisional', membershipPayments: 0});
        }
      })
      .then((profile) => {
        foundUser.profile = profile;
        if (!foundUser.defaultProfileRef) {
          // need to wire up link to new profile object
          foundUser.defaultProfileRef = profile._id;
          return foundUser.save();
        } else {
          return foundUser;
        }
      })
      .then((user) => {
        user.profile = foundProfile;
        console.log('authed user: ' + user);
        //If everything passes, return the retrieved user object.
        done(null, user);
      })
      .catch(function(err) {
        return done(err);
      })
  });
};

/**
 * A helper method to determine if a user has been authenticated, and if they have the right role.
 * If the user is not known, redirect to the login page. If the role doesn't match, show a 403 page.
 * @param role The role that a user should have to pass authentication.
 */
exports.isAuthenticated = function () {

  return function (req, res, next) {
    //access map
    const auth = {
        '/admin': true,
        '/profile': true
      },
      blacklist = {
        'user': {
          '/admin': true
        }
      },
      route = req.url,
      role = (req.user && req.user.role) ? req.user.role : '';
    if (!auth[route]) {
      next();
      return;
    }
    else if (!req.isAuthenticated()) {
      //If the user is not authorized, save the location that was being accessed so we can redirect afterwards.
      req.session.goingTo = req.url;
      req.flash('error', 'Please log in to view this page');
      res.redirect('/login');
    }
    //Check blacklist for this user's role
    else if (blacklist[role] && blacklist[role][route] === true) {
      const model = {url: route};

      //pop the user into the response
      res.locals.user = req.user;
      res.status(401);

      res.render('errors/401', model);
    } else {
      next();
    }

  };
};

/**
 * A helper method to add the user to the response context so we don't have to manually do it.
 * @param req
 * @param res
 * @param next
 */
exports.injectUser = function () {
  return function injectUser(req, res, next) {
    if (req.isAuthenticated()) {
      res.locals.user = req.user;
    }

    next();
  };
};


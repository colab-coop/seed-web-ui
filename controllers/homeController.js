'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const passport = require('passport');
const profileLib = require('../lib/profile');
const userLib = require('../lib/userService');
const helpers = require('../lib/helpers');
const passthrough = helpers.passthrough;
const curriedHandleError = _.curry(helpers.handleError);
const ProfileService = require('../lib/profileService');
const Profile = require('../models/profile');

const contributionController = require('./contributionController');
const proposalController = require('./proposalController');
const voteController = require('./voteController');


function buildMessages(req) {
  // todo: should probably separate out the different flavor of messages
  let messages = [];
  const pending = req.session.pending;
  if ( pending && pending.message && !!pending.message.trim() ) {
    messages.push(pending.message);
  }

  //Include any error messages that come from the login process.
  const flashError = req.flash('error');
  console.log('flashError: [' + flashError + '], const:' + flashError.constructor + ', size: ' + flashError.length);
  if (flashError) {
    messages = messages.concat( flashError );  //todo: better pattern?
  }
  console.log('messages: ' + _.inspect(messages));
  return messages;
}

function home(req, res) {
  //console.trace("home route stack");
  res.render('index', {})
}


/**
 * Display the login page. We also want to display any error messages that result from a failed login attempt.
 */
function showLogin(req, res) {
  //Include any error messages that come from the login process.
  const model =  {messages: buildMessages(req)};
  res.render('login', model);
}

/**
 * Receive the login credentials and authenticate.
 * Successful authentications will go to /profile or if the user was trying to access a secured resource, the URL
 * that was originally requested.
 *
 * Failed authentications will go back to the login page with a helpful error message to be displayed.
 */
function postLogin(req, res) {
  passport.authenticate('local', {
    successRedirect: '/afterAuth' //req.session.goingTo || '/p',
    , failureRedirect: '/login'
    , failureFlash: true
  })(req, res, function (err) {
    console.log("auth err: " + err);
    req.flash('error', ''+err);
    res.redirect('/login');
  });
}


/**
 * handles any needed post login/signup logic
 */
function afterAuth(req, res) {
  //todo: use same methodMap approach as with the payment success
  if (voteController.handlePending(req, res)) {
    return
  }
  if (contributionController.handlePending(req, res)) {
    return
  }
  res.redirect('/p');
}



/**
 * Display the login page. We also want to display any error messages that result from a failed login attempt.
 */
function showSignup(req, res) {
  renderShowSignup(req, res); // needed for clean handling of the optional arg
}

function renderShowSignup(req, res, formDataArg) {
  const messages = buildMessages(req);
  // beware: this pattern doesn't work for methods directly called by the router,
  // somehow a function named 'undefined' is passed in instead of an actual undefined value
  const formData = formDataArg || {};
  console.log(`formData: ${_.inspect(formData)}, arg: ${_.inspect(formDataArg)}, typeof arg: ${typeof formDataArg}, isundef: ${formDataArg == undefined}, args.len: ${arguments.length}`);
  const model =  {messages: messages, formData: formData}; //, formData: formData || {}};
  res.render('signup', model);
}

function postEmail(req, res) {
  const email = req.param('email');
  const name = req.param('name');
  userLib.emailUser(email, name, function (err, status, sent) {
    if (err) {
      // error
    } else if (sent) {
      res.redirect('/signup');
    }
  })
}

/**
 * Receive the login credentials and authenticate.
 * Successful authentications will go to /profile or if the user was trying to access a secured resource, the URL
 * that was originally requested.
 *
 * Failed authentications will go back to the login page with a helpful error message to be displayed.
 */
function postSignup(req, res) {
  const email = req.param('email');
  const password = req.param('password');
  const firstName = req.param('firstName');
  const lastName = req.param('lastName');
  const orgName = req.param('orgName');

  //todo: consider a helper method using the param() method instead of the body obj
  const data = _.pick(req.body, 'firstName','lastName','orgName','email', 'password', 'confirmPassword');
  if (data.password !== data.confirmPassword) {
    req.flash('error', 'Passwords mismatched');
    renderShowSignup(req, res, data);
    return;
  }
  data.memberType = Profile.MEMBERSHIP_TYPES.provisional;
  console.log(`data: ${_.inspect(data)}`);

  userLib.createUser(data)
    .then((newUser) => {
      console.log(`postSignup - newUser: ${_.inspect(newUser)}`);
      return userLib.login(req, newUser);
    })
    .then(() => {
      res.redirect('/afterAuth');
    })
      //req.login(newUser, function (err) {
      //  if (err) {
      //    console.error(err);
      //  }
      //  res.redirect('/afterAuth');
      //});
    .catch((err) => {
      console.log(`postSignup - err: ${err}, inspected: ${_.inspect(err)}`);
      if (err.message === 'emailAddressInUse') {
        console.log(`email addr in use: ${email}`);
        req.flash('error', 'Sorry, that email address is already in use');
        renderShowSignup(req, res, data);
      } else {
        console.error(`unexpected createUser error: ${err}`);
        return helpers.negotiate(req, res, err);
      }
    });
  //userLib.createUser(email, password, firstName, lastName, orgName, Profile.MEMBERSHIP_TYPES.provisional, function (err, status, newUser) {
  //  if (err) {
  //    return helpers.negotiate(req, res, err);
  //  } else {
  //    if ('emailAddressInUse' === status) {
  //      return res.emailAddressInUse()
  //    } else if (newUser) {
  //      req.login(newUser, function (err) {
  //        if (err) {
  //          console.error(err);
  //        }
  //        res.redirect('/afterAuth');
  //      });
  //    } else {
  //      console.error("unexpected createUser status: " + status);
  //      res.redirect('/afterAuth');
  //    }
  //  }
  //})
}

function viewProfile(req, res) {
  const profileId = req.param('profileId');
  ProfileService.fetch(profileId)
    .then((profile) => res.render('profile/view', {profile: profile}) )
    .catch( curriedHandleError(req, res) );
}

function logout(req, res) {
  req.logout();
  res.redirect('/');
}


function dump(req, res) {
  const kraken = req.app.kraken;
  const env = kraken.get('env').env;
  console.log('env: ' + kraken.get('express').env);
//  const krakenDump = _.inspect(kraken);
//  res.render('dump', {kraken: krakenDump});
  res.json(200, {kraken: kraken});

}

function testWelcomeEmail(req, res) {
  userLib.emailUser(req.user.profile.email, req.user.profile.name)
    .then( (status) => res.json(200, {status: status}) )
    .catch(curriedHandleError(req, res));
}


function addRoutes(router) {
//  router.get('/', home);
  passthrough(router, 'how_it_works');
  passthrough(router, 'who_we_are');
  router.get('/login', showLogin);
  router.post('/login', postLogin);
  router.get('/signup', showSignup);
  router.post('/signup', postSignup);
  router.get('/afterAuth', afterAuth);
  router.get('/logout', logout);

  router.get('/dump', dump);
  router.get('/test/welcomeEmail', testWelcomeEmail);
}


module.exports = {
  addRoutes: addRoutes
};

'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const passport = require('passport');
const profileLib = require('../lib/profile');
const userLib = require('../lib/userService');
const mailer = require('../lib/mailer');
const helpers = require('../lib/helpers');
const validation = require('../lib/validation');
const passthrough = helpers.passthrough;
const curriedHandleError = _.curry(helpers.handleError);
const ProfileService = require('../lib/profileService');
const UserService = require('../lib/userService');
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
  console.log(_.inspect(req.body));
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
      if (err.name === 'ValidationError') {
        req.flash('error', validation.validationMessages(err));
        //res.render('signup', {messages: validation.validationMessages(err)});
        renderShowSignup(req, res, data);
      } else if (err.message === 'emailAddressInUse') {
        console.log(`email addr in use: ${email}`);
        req.flash('error', 'Sorry, that email address is already in use');
        renderShowSignup(req, res, data);

  //const email = req.param('email');
  //const password = req.param('password');
  //const firstName = req.param('firstName');
  //const lastName = req.param('lastName');
  //const orgName = req.param('orgName');
  //userLib.createUser(email, password, firstName, lastName, orgName, Profile.MEMBERSHIP_TYPES.provisional, function (err, status, newUser) {
  //  if (err) {
  //    if (err.name === 'ValidationError') {
  //      res.render('signup', { messages: validation.validationMessages(err) });
  //      return;
  //    } else {
  //      return helpers.negotiate(req, res, err);
  //    }
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
      }
    })
}

function postJoin(req, res) {
  const wasAuthenticated = !!req.user;
  const userData = {
    firstName: req.body.name
    , lastName: ''  // todo, better reconcile name vs fisrt/last in different forms on site
    , email: req.body.email
  };
  userData.password = 'xxxxxx';  //tmp hack, should leave password undefined once we have reset flow
  userData.memberType = Profile.MEMBERSHIP_TYPES.provisional;
  console.log(`get involved new user: ${_.inspect(userData)}`);
  UserService.createUser(userData)
    .then((user) => {
      UserService.login(req, user);
    })
    .then(() => {
      UserService.sendWelcomeEmail(userData);
    })
    .then(() => {
      //res.redirect('/afterAuth');  //todo: need something better to do here
      res.redirect('/');
    })
    .catch(curriedHandleError(req, res));
}

function completeSignup(req, res) {
  console.log('completing signup')
  res.redirect('/');
}

function viewMyProfile(req, res) {
  res.render('me/profile', {profile: req.user.profile});
}

function editMyProfile(req, res) {
  res.render('me/profile_edit', { profile: req.user.profile });
}

function updateMyProfile(req, res, next) {
  var profile = req.user.profile;

  profileLib
    .updateProfile(profile, req.body)
    .then(() => res.redirect('/me'))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        res.render('me/profile_edit', {
          profile: profile,
          messages: validation.validationMessages(err)
        });
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


function forgotPassword(req, res) {
  res.render('forgot_password');
}

function sendPasswordResetEmail(req, res, next) {
  const email = req.body.email;

  userLib
    .sendPasswordResetEmail(req.body.email)
    .then(() => res.redirect('/login'))
    .catch(next);
}

function resetPassword(req, res) {
  res.render('reset_password', {
    token: req.query.token
  });
}

function updatePassword(req, res, next) {
  userLib.updatePasswordFromToken(req.body.token, req.body.password)
    .then((user) => {
      if (!user) {
        req.flash('error', 'Invalid token');
      }
      res.redirect('/login');
    })
    .catch(next);
}

function addRoutes(router) {
//  router.get('/', home);
  passthrough(router, 'how_it_works');
  passthrough(router, 'who_we_are');
  router.get('/login', showLogin);
  router.post('/login', postLogin);
  router.get('/completeSignup/:id', completeSignup);
  router.get('/signup', showSignup);
  router.post('/signup', postSignup);
  router.post('/join', postJoin);
  router.get('/afterAuth', afterAuth);
  router.get('/m/:profileId', viewProfile);
  router.get('/logout', logout);

  router.get('/forgotPassword', forgotPassword);
  router.post('/forgotPassword', sendPasswordResetEmail);
  router.get('/resetPassword', resetPassword);
  router.post('/resetPassword', updatePassword);

  router.get('/dump', dump);
  router.get('/scratch', scratch);
  router.get('/test/welcomeEmail', testWelcomeEmail);


}


module.exports = {
  addRoutes: addRoutes
};


//
// debug and scratch code
//

function dump(req, res) {
  const kraken = req.app.kraken;
  const env = kraken.get('env').env;
  console.log('env: ' + kraken.get('express').env);
//  const krakenDump = _.inspect(kraken);
//  res.render('dump', {kraken: krakenDump});
  res.json(200, {kraken: kraken});

}

function scratch(req, res) {
  const date = Date.now();
  const moment = require('moment');
  const formatted = moment(date).format('MM/DD/YYYY');
  console.log(`formatted date: ${formatted}`);
  res.render('debug/scratch', { date: date, formatted: formatted });
}



function testWelcomeEmail(req, res) {
  console.log(`email: ${req.user.profile.email}`);
  userLib.emailUser(req.user.profile.email, req.user.profile.name)
    .then( (status) => res.json(200, {status: status}) )
    .catch(curriedHandleError(req, res));
}

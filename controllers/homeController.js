'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const passport = require('passport');
const profileLib = require('../lib/profile');
const userLib = require('../lib/user');
const helpers = require('../lib/helpers');
const validation = require('../lib/validation');
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
  const messages = buildMessages(req);
  const model =  {messages: messages};
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
  userLib.createUser(email, password, firstName, lastName, orgName, Profile.MEMBERSHIP_TYPES.provisional, function (err, status, newUser) {
    if (err) {
      if (err.name === 'ValidationError') {
        res.render('signup', { messages: validation.validationMessages(err) });
        return;
      } else {
        return helpers.negotiate(req, res, err);
      }
    } else {
      if ('emailAddressInUse' === status) {
        return res.emailAddressInUse()
      } else if (newUser) {
        req.login(newUser, function (err) {
          if (err) {
            console.error(err);
          }
          res.redirect('/afterAuth');
        });
      } else {
        console.error("unexpected createUser status: " + status);
        res.redirect('/afterAuth');
      }
    }
  })
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
        next(err);
      }
    });
}

function viewProfile(req, res) {
  const profileId = req.param('profileId');
  ProfileService.fetch(profileId)
    .then((profile) => res.render('profile/view', {profile: profile}) )
    .catch( curriedHandleError(req, res) );
}

function showMemberPay(req, res) {
  res.render('me/pay', {});
}

function postMemberPay(req, res) {
  const amount = req.body.amount;
  req.session.cart = {
    kind: 'membership'
    , description: 'Membership Share Purchase'
    , amount: amount
    , successMethodName: 'handleMembershipPaymentSuccess'
  };
  res.redirect('/pay');
}

require('./paymentController').mapMethod('handleMembershipPaymentSuccess', handleMembershipPaymentSuccess);

function handleMembershipPaymentSuccess(req, res) {
  console.log('handlemembershipsuccess cart: ' + _.inspect(req.session.cart));
  console.log('old payment total: ' + req.user.profile.membershipPayments);
  const profile = req.user.profile;
  const amount = Number(req.session.cart.amount);
  profile.membershipPayments = Number(profile.membershipPayments); // be damn sure we have a number!
  profile.membershipPayments += amount;
  if (profile.membershipPayments >= 25 && profile.memberType !== Profile.MEMBERSHIP_TYPES.provisional) {
    profile.memberType = Profile.MEMBERSHIP_TYPES.full;
  }
  profile.save()
    .then((saved) => {
      delete req.session.cart;
      res.redirect('/me/thanks');
    })
    .catch(curriedHandleError(req, res));
}

function membershipThanks(req, res) {
  res.render('me/thanks', {});
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


function addRoutes(router) {
//  router.get('/', home);
  passthrough(router, 'how_it_works');
  passthrough(router, 'who_we_are');
  router.get('/login', showLogin);
  router.post('/login', postLogin);
  router.get('/signup', showSignup);
  router.post('/signup', postSignup);
  router.get('/afterAuth', afterAuth);
  router.get('/me', viewMyProfile);
  router.get('/me/edit', editMyProfile);
  router.post('/me/edit', updateMyProfile);
  router.get('/me/pay', showMemberPay);
  router.post('/me/pay', postMemberPay);
  router.get('/me/thanks', membershipThanks);
  router.get('/m/:profileId', viewProfile);
  router.get('/logout', logout);

  router.get('/dump', dump);
}


module.exports = {
  addRoutes: addRoutes
};

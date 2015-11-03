'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var passport = require('passport');
var userLib = require('../lib/user');
var helpers = require('../lib/helpers');
var passthrough = helpers.passthrough;
var curriedHandleError = _.curry(helpers.handleError);
var Profile = require('../models/profile');

var contributionController = require('./contributionController');
var proposalController = require('./proposalController');

//function handleError(err) {
//  console.error(err);
//  return helpers.negotiate(req, res, err);
//}


function buildMessages(req) {
  // todo: should probably separate out the different flavor of messages
  var messages = [];
  var pending = req.session.pending;
  if ( pending && pending.message && !!pending.message.trim() ) {
    messages.push(pending.message);
  }

  //Include any error messages that come from the login process.
  var flashError = req.flash('error');
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
  var model =  {messages: buildMessages(req)};
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
  if (proposalController.handlePending(req, res)) {
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
  var messages = buildMessages(req);
  var model =  {messages: messages};
  res.render('signup', model);
}

function postEmail(req, res) {
  var email = req.param('email');
  var name = req.param('name');
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
  var email = req.param('email');
  var password = req.param('password');
  var name = req.param('name');
  userLib.createUser(email, password, name, function (err, status, newUser) {
    if (err) {
      return helpers.negotiate(req, res, err);
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

function viewProfile(req, res) {
  var profileId = req.param('profileId');
  Profile.findOne({_id: profileId}).exec()
    .then(function(profile) {
      res.render('profile/view', {profile: profile});
    })
    .catch( curriedHandleError(req, res) );
}

function showMemberPay(req, res) {
  res.render('me/pay', {});
}

function postMemberPay(req, res) {
  var amount = req.body.amount;
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
  var profile = req.user.profile; //todo: should probably refresh from db
  var amount = Number(req.session.cart.amount);
  profile.membershipPayments = Number(profile.membershipPayments); // be damn sure we have a number!
  profile.membershipPayments += amount;
  if (profile.membershipPayments >= 25 && profile.memberType === 'provisional') {
    profile.memberType = 'full';
  }
  profile.save()
    .then(function(saved) {
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
  var kraken = req.app.kraken;
  var env = kraken.get('env').env;
  console.log('env: ' + kraken.get('express').env);
  var krakenDump = _.inspect(kraken);
//  res.render('dump', {kraken: krakenDump});
  res.json(200, {kraken: kraken});

}


function addRoutes(router) {
  router.get('/', home);
  passthrough(router, 'how_it_works');
  passthrough(router, 'who_we_are');
  router.get('/login', showLogin);
  router.post('/login', postLogin);
  router.get('/signup', showSignup);
  router.post('/signup', postSignup);
  router.get('/afterAuth', afterAuth);
  router.get('/me', viewMyProfile);
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

'use strict';

const _ = require('lodash');
const helpers = require('../lib/helpers');
const paymentController = require('./paymentController');
const profileLib = require('../lib/profile');
const ProfileService = require('../lib/profileService');
const userLib = require('../lib/userService');

const curriedHandleError = _.curry(helpers.handleError);

function viewMyProfile(req, res) {
  res.render('me/profile', {profile: req.user.profile});
}

function editMyProfile(req, res) {
  res.render('me/profile_edit', { profile: req.user.profile });
}

function updateMyProfile(req, res, next) {
  var profile = req.user.profile;

  const render = (messages) => {
    res.render('me/profile_edit', {
      profile: profile,
      messages: messages
    });
  };

  profileLib
    .updateProfile(profile, req.body)
    .then(() => res.redirect('/me/edit'))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        render(helpers.validationMessages(err));
      } else if (err.type === 'validation') {
        render(err.message);
      } else {
        next(err);
      }
    });
}

function editPassword(req, res) {
  res.render('me/password');
}

function updatePassword(req, res, next) {
  if (!req.user.passwordMatches(req.body.currentPassword)) {
    res.render('me/password', { messages: ['Your current password is incorrect'] });
    return;
  }

  userLib
    .updatePassword(req.user, req.body.password)
    .then(() => res.redirect('/me/edit'))
    .catch(next);
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

  if (req.user.profile.stripeCustomerId) {
    console.log('using existing bill info');
    paymentController.stripeCharge(req, res);
  } else {
    res.redirect('/pay');
  }
}

function resetPaymentInfo(req, res) {
  ProfileService.updateStripeCustomerId(req.user.profile._id, '')
    .then(() => res.redirect('/me/edit'))
    .catch( curriedHandleError(req, res) );
}

require('./paymentController').mapMethod('handleMembershipPaymentSuccess', handleMembershipPaymentSuccess);

function handleMembershipPaymentSuccess(req, res) {
  console.log('handlemembershipsuccess cart: ' + _.inspect(req.session.cart));
  console.log('old payment total: ' + req.user.profile.membershipPayments);
  const profile = req.user.profile;
  const amount = Number(req.session.cart.amount);
  profile.membershipPayments = Number(profile.membershipPayments); // be damn sure we have a number!
  profile.membershipPayments += amount;
  if (profile.membershipPayments >= 25 && (profile.memberType === 'provisional' || profile.memberType === 'visitor')) {
    profile.memberType = 'full';
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

const mailchimp = require('../lib/mailchimp');

function updateMailchimp(req, res) {
  const profile = req.user.profile;
  console.log(`profile: ${profile}`);
  console.log(`subres: ${mailchimp.subscribeToDefaultList(profile)}`);
  mailchimp.subscribeToDefaultList(profile)
    .then((result) => {
      console.log(`mc sub result: ${_.inspect(result)}`);
      res.json(result);
    })
    .catch(curriedHandleError(req, res));
}


function addRoutes(router) {
  router.get('/me', viewMyProfile);
  router.get('/me/edit', editMyProfile);
  router.post('/me/edit', updateMyProfile);
  router.get('/me/pay', showMemberPay);
  router.post('/me/pay', postMemberPay);
  router.get('/me/resetPaymentInfo', resetPaymentInfo);
  router.get('/me/thanks', membershipThanks);
  router.get('/me/password', editPassword);
  router.post('/me/password', updatePassword);
  router.get('/me/mailchimp', updateMailchimp);
}


module.exports = {
  addRoutes: addRoutes
};

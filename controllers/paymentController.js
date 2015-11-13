'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const helpers = require('../lib/helpers');
const userService = require('../lib/userService');
const ProfileService = require('../lib/profileService');
const curriedHandleError = _.curry(helpers.handleError);

const stripe = require('../lib/stripe').instance();
const braintree = require('../lib/braintree').instance();
const authorizeNet = require('../lib/authorizeNet').instance();
const Binbase = require('../models/binbase');


/** checks that the expected session state exists, and passes control on the main handler if so
 * otherwise, redirects to safe home and short curcuits flow
 */
function handleMissingState(req, res, next) {
  if (req.session.cart) {
    next(); // proceed with normal flow
  } else {
    console.error("payment flow - missing pending state");
    res.redirect('/');
  }
}


function showPaymentIndex(req, res) {
  var model = req.session.cart;
  model.pageTitle = model.pageTitle || 'Ways to Pay';
  model.messages = req.flash('error');
  res.render('payment/index', model);
}

function postPayment(req, res) {
  var paymentMethod = req.body.paymentMethod;
  res.redirect('/pay/' + paymentMethod);
}

function showDwolla(req, res) {
  var model = req.session.cart;
  model.messages = req.flash('error');
  res.render('payment/dwolla', model);
}

function showStripe(req, res) {
  var model = req.session.cart;
  model.amountCents = model.amount * 100;
  model.publicKey = stripe.config.publicKey;
  model.messages = req.flash('error');
  res.render('payment/stripe', model);
}

function postStripe(req, res) {
  var amountCents = req.body.amountCents;
  var description = req.body.description;
  var stripeToken = req.body.stripeToken;
  var stripeTokenType = req.body.stripeTokenType;
  var stripeEmail = req.body.stripeEmail;
  console.log('postStripe - token: ' + stripeToken + ', type: ' + stripeTokenType + ', emai: ' + stripeEmail);

  var charge = stripe.charges.create({
    amount: amountCents // amount in cents, again
    , currency: "usd"
    , source: stripeToken
    , description: description
  }, function (err, charge) {
    console.log('stripe response - err: ' + err + ', charge: ' + _.inspect(charge));
    if (err && err.type === 'StripeCardError') {
      // The card has been declined
      req.flash('error', "Sorry, that card has been declined");
      res.redirect('/pay/stripe');
    } else if (charge) {
      handleSuccess(req, res);
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      res.redirect('/pay/stripe');
    }
  });
}


function showStripeInfo(req, res) {
  var model = req.session.cart;
  model.amountCents = model.amount * 100;
  model.publicKey = stripe.config.publicKey;
  model.messages = req.flash('error');
  model.pageTitle = model.pageTitle || 'Payment Information';
  res.render('home/stripeInfoForm', model);
}



function postStripeInfo(req, res) {
  console.log(`poststrip ajax: ${req.query.ajax}`);
  var amountCents = req.body.amountCents;
  var description = req.body.description;
  var stripeToken = req.body.stripeToken;
  var stripeTokenType = req.body.stripeTokenType;
  var stripeEmail = req.body.stripeEmail;
  console.log('postStripe - token: ' + stripeToken + ', type: ' + stripeTokenType + ', emai: ' + stripeEmail);

  //todo, refactor this into promise api on stripe.js
  stripe.customers.create({
    description: 'test customer description'
    , source: stripeToken
  }, function(err, customer) {
    console.log('stripe create customer response - err: ' + err + ', charge: ' + _.inspect(customer));
    if (err && err.type === 'StripeCardError') {
      // The card has been declined
      req.flash('error', "Sorry, that card has been declined");
      res.redirect('/pay/stripeInfo');
    } else if (customer) {
      const customerId = customer.id;
      console.log(`captured stripg customer id: ${customerId}`);
      const profileId = req.user.profile._id;
      ProfileService.updateStripeCustomerId(profileId, customerId)
      .then(() => {
          handleSuccess(req, res);
        })
        .catch(curriedHandleError(req, res));
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      res.redirect('/pay/stripeInfo');
    }
  });
}

// perform charge against existing customer record
function stripeCharge(req, res) {
  const cart = req.session.cart;
  const customerId = req.user.profile.stripeCustomerId;

  const amountCents = cart.amount * 100;
  const description = cart.description;

  console.log(`customerid: ${customerId}, amount: ${amountCents}, desc: ${description}`);

  var charge = stripe.charges.create({
    amount: amountCents // amount in cents, again
    , currency: "usd"
    , customer: customerId
    , description: description
  }, function (err, charge) {
    console.log('stripe response - err: ' + err + ', charge: ' + _.inspect(charge));
    if (err && err.type === 'StripeCardError') {
      // The card has been declined
      req.flash('error', "Sorry, that card has been declined");
      helpers.handleError(req, res, err);
      //res.redirect('/pay/stripe');
    } else if (charge) {
      handleSuccess(req, res);
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      helpers.handleError(req, res, err);
      //res.redirect('/pay/stripe');
    }
  });

}


function showBraintree(req, res) {
  var model = req.session.cart;
  model.messages = req.flash('error');
  var clientToken;

  console.log('braintree: ' + _.inspect(braintree));
  braintree.clientToken.generate({}, function (err, result) {
    model.clientToken = result.clientToken;
    console.log('clientToken: ' + clientToken);
    res.render('payment/braintree', model);
  });

}

function postBraintree(req, res) {
  var amount = req.body.amount;
  var description = req.body.description;
  var paymentMethodNonce = req.body.payment_method_nonce;

  console.log('postBraintree - nonce: ' + paymentMethodNonce);

  braintree.transaction.sale({
    amount: amount
    , paymentMethodNonce: paymentMethodNonce
  }, function (err, result) {
    console.log('braintree response - err: ' + err + ', result: ' + _.inspect(result));
    if (err) { //} && err.type === 'StripeCardError') {
      // The card has been declined
      req.flash('error', "Sorry, that card has been declined");
      res.redirect('/pay/braintree')
    } else if (result) {
      handleSuccess(req, res);
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      res.redirect('/pay/braintree');
    }
  });
}

function showAuthorizeNet(req, res) {
  var model = req.session.cart;
  model.messages = req.flash('error');
  var clientToken;

  res.render('payment/authorizeNet', model);

}

function postAuthorizeNet(req, res) {
  var amount = req.body.amount;
  var cardNumber = req.body.cardNumber;
  var expYear = req.body.expYear;
  var expMonth = req.body.expMonth;

  console.log('postAuthorizeNet');

  authorizeNet.authCaptureTransaction(amount, cardNumber, expYear, expMonth)
    .then(function (transaction) {
      console.log('authorize.net response - transaction: ' + _.inspect(transaction));

      if (transaction.transactionResponse.responseCode == 1) {
        handleSuccess(req, res);
        //handleContributionPaymentSuccess(req, res);
//        res.redirect('/c/thanks');
      } else {
        // not sure if this flow is possible or not
        console.log('authnet failure - tranresp: ' + transaction.transactionResponse);
        req.flash('error', 'Sorry, there was an error processing your transaction');
        res.redirect('/pay/authorizeNet');
      }
    })
    .catch(function(result) {
      // todo: catch and display error page if exception throw in the catch block
      console.log('authnet failure - err: ' + _.inspect(result));
      var message = 'Sorry, there was an error processing your transaction: ' + _.inspect(result);  // extra verbose by default for now unless we extra our expected nested error text

      console.log('tran response: ' + _.inspect(result.transactionResponse));
      // todo: use some sort of jsonpath util here
      if (result.transactionResponse && result.transactionResponse.errors) {
        var errors = result.transactionResponse.errors;
        if (errors.error && errors.error.errorText) {
          message = errors.error.errorText;
        }
      }
      req.flash('error', message);
      res.redirect('/pay/authorizeNet');
    })
}


function showCheck(req, res) {
  var model = req.session.cart;
  console.log('showCheck - model: ' + _.inspect(model));
  model.messages = req.flash('error');
  res.render('payment/check', model);
}

function postCheck(req, res) {
  console.log("postCheck");
  handleSuccess(req, res);
}



function handleSuccess(req, res) {
  console.log('handleSuccess - cart:' + _.inspect(req.session.cart));
  console.log('methodMap: ' + _.inspect(methodMap));
  var methodName = req.session.cart.successMethodName;
  if (methodName) {
    var func = resolveMethod(methodName);
    if (func) {
      func(req, res);
    } else {
      throw new Error('unable to resolve method name: ' + methodName);
    }
  } else if (req.session.cart.successUrl) {
    console.log('handle successUrl:' + req.session.cart.successUrl);
    if (req.query.ajax) {
      res.json({redirect: req.session.cart.successUrl});
    } else {
      res.redirect(req.session.cart.successUrl);
    }
  } else {
    throw new Error('missing success hook - cart');
    //if (req.session.cart.kind == 'contribution') {
    //  console.log('no cart success method or url - using hardwired logic');
    //  require('./contributionController').handleContributionPaymentSuccess(req, res);
    //}
  }
}

function showBitcoin(req, res) {
  var model = req.session.cart;
  model.messages = req.flash('error');
  res.render('payment/bitcoin', model);
}

function fetchBinbase(req, res) {
  var bin = req.params.bin;
  var amount = req.params.amount;
  console.log('bin: ' + bin + ", amount: " + amount);
  Binbase.findOne({bin: bin}).populate('orgRef').exec()//todo: factor out to binbase service
    .then(function (item) {
      console.log('orgRef: ' + item.orgRef);
      if (item.orgRef) {
        item.isRegulated = item.orgRef.isRegulated;
      }
      if (amount) {
        item.estimatedFee = calculateFee(item, amount);  // should clone first or nest result
      }
      res.json(200, item);
    })
    .catch( curriedHandleError(req, res) );
}

function estimateFee(req, res) {
  var bin = req.params.bin || req.query.bin;
  var amount = req.params.amount || req.query.amount;
  console.log('bin: ' + bin + ", amount: " + amount);
  Binbase.findOne({bin: bin}).exec()
    .then(function (item) {
      console.log("found binbase: " + item);
      var result = calculateFee(item, amount);
//      _.merge(result, item);
      //todo, not sure why the merge didn't work. mongoose magic?
      result.cardBrand = item.cardBrand;
      result.issuingOrg = item.issuingOrg;
      result.cardType = item.cardType;
      result.cardCategory = item.cardCategory;
      result.isRegulated = item.isRegulated;
      res.json(200, result);
    })
    .catch( curriedHandleError(req, res) );
}

function calculateFee(binbase, amount) {
  var base = 0.30;
  var percent = 2.9;
  var message = null;
  if (binbase) {
    if (binbase.cardBrand == 'AMEX') {
      base = 0.30;
      percent = 3.5;
      message = "Tip: AMEX has the highest fees!";
    }
    if (binbase.cardBrand == 'VISA' || binbase.cardBrand == 'MASTERCARD') {
      if (binbase.cardType == 'DEBIT') {
        base = 0.22;
        if (binbase.isRegulated) {
          percent = 0.05;
          message = "Good choice, Debit Cards have the lowest fees!"
        } else {
          percent = 0.80;
          message = "Good choice, Debit Cards have lower fees."
        }
      } else {
        base = 0.12;
        message = "Tip: Debit Cards generally have lower fees than Credit Cards";
        if (binbase.cardCategory == 'PLATINUM' || binbase.cardCategory == 'BUSINESS') {
          percent = 2.9;
          message += ", and Rewards Cards have the highest fees."
        } else if (binbase.cardCategory == 'GOLD') {
          percent = 2.2;
          message += ", and Rewards Cards have higher fees."
        } else {
          percent = 1.8;
        }
      }
    }
    if (amount < 20) {
      message = "";
    }

  }
  var fee = base + amount * percent/100;
  fee = Math.ceil(fee * 100) / 100;
  console.log('calcfee - ' + binbase + ', base: ' + base + ', %: ' + percent + ' = ' + fee);
  return {estimatedFee: fee, feeTip: message};
}


// bnding between session serializable names and function objects to be used as success operations
var methodMap = {};

function mapMethod(name, func) {
  methodMap[name] = func;
}

function resolveMethod(name) {
  return methodMap[name];
}

function addRoutes(router) {
//  router.get('/pay', handleMissingState, showPayment);
  router.get('/pay', handleMissingState, showStripe);
  router.get('/pay/info', handleMissingState, showStripeInfo);


  router.post('/pay/by', handleMissingState, postPayment);
  router.get('/pay/dwolla', handleMissingState, showDwolla);
  router.get('/pay/check', handleMissingState, showCheck);
  router.post('/pay/check', handleMissingState, postCheck);

  router.get('/pay/stripe', handleMissingState, showStripe);
  router.post('/pay/stripe', handleMissingState, postStripe);
  router.get('/pay/stripeInfo', handleMissingState, showStripeInfo);
  router.post('/pay/stripeInfo', handleMissingState, postStripeInfo);

  router.get('/pay/braintree', handleMissingState, showBraintree);
  router.post('/pay/braintree', handleMissingState, postBraintree);
  router.get('/pay/authorizeNet', handleMissingState, showAuthorizeNet);
  router.post('/pay/authorizeNet', handleMissingState, postAuthorizeNet);
  router.get('/pay/bitcoin', handleMissingState, showBitcoin);

  router.get('/pay/success', handleMissingState, handleSuccess);

  router.get('/api/binbase/:bin', fetchBinbase);
  router.get('/api/estimateFee', estimateFee);

}


module.exports = {
  addRoutes: addRoutes
  , mapMethod: mapMethod
  , resolveMethod: resolveMethod
  , stripeCharge: stripeCharge
};


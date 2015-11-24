'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const helpers = require('../lib/helpers');
const userService = require('../lib/userService');
const ProfileService = require('../lib/profileService');
const ProposalService = require('../lib/proposalService');
const OfferService = require('../lib/offerService');
const ContributionService = require('../lib/contributionService');
const curriedHandleError = _.curry(helpers.handleError);
const mailer = require('../lib/mailer');
const config = require('../lib/config');

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
  if (model.proposalId) {
    ProposalService.fetch(model.proposalId)  //should make this safe even if missing  proposalid
      .then((proposal) => {
        model.proposal = proposal;
        return OfferService.fetch(model.offerId);
      })
    .then((offer) => {
        model.offer = offer;
        res.render('payment/stripe', model);
      });
  } else {
    res.render('payment/stripe', model);
  }
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


  if (model.proposalId) {
    ProposalService.fetch(model.proposalId)  //should make this safe even if missing  proposalid
      .then((proposal) => {
        model.proposal = proposal;
        return OfferService.fetch(model.offerId);
      })
      .then((offer) => {
        model.offer = offer;
        res.render('home/stripeInfoForm', model);
      });
  } else {
    res.render('home/stripeInfoForm', model);
  }

}



//return (function() {
//  if (bool) {
//    return Promise.resolve('skip');
//  } else {
//    return UserService.createUser(userData);
//  }
//}())

function postStripeInfo(req, res) {
  console.log(`poststrip ajax: ${req.query.ajax}`);
  console.log(`body: ${_.inspect(req.body)}`);
  var stripeToken = req.body.stripeToken;
  //var stripeTokenType = req.body.stripeTokenType;
  //var stripeEmail = req.body.stripeEmail;
  console.log('postStripe - token: ' + stripeToken); // + ', type: ' + stripeTokenType + ', email: ' + stripeEmail);

  // need to make sure we have a stripe customer created corresponding to our profile id
  const profile = req.user.profile;
  const profileId = profile._id;
  (function() {
    if (profile.stripeCustomerId) {
      return Promise.resolve('skip');
    } else {
      return createStripeCustomer(profileId, profile.email, profile.displayName)
      .then((result) => {
          console.log(`stripe create customer result: ${_.inspect(result)}`);
          return ProfileService.updateStripeCustomerId(profileId, profileId);
        })
    }
  }())
    .then((result) => {
      console.log(`update cust id result: ${_.inspect(result)}`);
      // associate our captured payment information as the default payment source for the customer record
      return storeStripPaymentSource(profileId, stripeToken);
    })
    .then((result) => {
      console.log(`stripe store payment result: ${_.inspect(result)}`);
      handleSuccess(req, res);
    })
    .catch(curriedHandleError(req, res));

  ////todo, refactor this into promise api on stripe.js
  //stripe.customers.create({
  //  description: 'test customer description'
  //  , source: stripeToken
  //}, function(err, customer) {
  //  console.log('stripe create customer response - err: ' + err + ', charge: ' + _.inspect(customer));
  //  if (err && err.type === 'StripeCardError') {
  //    // The card has been declined
  //    req.flash('error', "Sorry, that card has been declined");
  //    res.redirect('/pay/stripeInfo');
  //  } else if (customer) {
  //    const customerId = customer.id;
  //    console.log(`captured stripg customer id: ${customerId}`);
  //    const profileId = req.user.profile._id;
  //    ProfileService.updateStripeCustomerId(profileId, customerId)
  //    .then(() => {
  //        handleSuccess(req, res);
  //      })
  //      .catch(curriedHandleError(req, res));
  //  } else {
  //    req.flash('error', 'Sorry, there was an unexpected error: ' + err);
  //    res.redirect('/pay/stripeInfo');
  //  }
  //});
}

function apiPostPaymentInfo(req, res) {
  console.log(`apipayment - params: ${_.inspect(req.params)}, body: ${_.inspect(req.body)}`);
  const contributionId = req.params.contributionId;
  const apiData = {
    apiKey: req.body.apiKey
    , callback: req.body.callback
  };
  const response = {};
  response.result = {paymentId: contributionId, cancelUrl: 'todo'};
  helpers.renderApiResponse(res, apiData, response);
}

const PAYMENT_FIELDS = ['cardNumber','cardExpMonth','cardExpYear','cardCvv','billingZip','description'];
function apiSubmitPaymentInfo(req, res) {
  console.log(`apipayment - params: ${_.inspect(req.params)}, query: ${_.inspect(req.query)}`);
  const contributionId = req.params.contributionId;
  const apiData = {
    apiKey: req.query.apiKey
    , callback: req.query.callback
  };
  const paymentData = {};
  _.assign(paymentData, _.pick(req.query, PAYMENT_FIELDS));
  _.assignNumericParam(paymentData, req.query, 'amount');

  console.log(`paymentData: ${_.inspect(paymentData)}`);
  // todo verify apikey
  const response = {};

  handleSubmitPaymentInfo(contributionId, paymentData)
    .then((result) => {
      console.log(`apiSubmitPayment result: ${_.inspect(result)}`);
      response.result = result;
      helpers.renderApiResponse(res, apiData, response);
    })
    .catch((err) => {
      console.log(`apiSubmitPayment error: ${err}, stack: ${err.stack}`);
      response.error = {message: err.toString(), stack: err.stack};
      helpers.renderApiResponse(res, apiData, response);
    });
}

function handleSubmitPaymentInfo(contributionId, paymentData) {
  let contribution;
  let profile;
  let stripeCustomerId;
  return ContributionService.fetch(contributionId)
    .then((aContribution) => {
      if (!aContribution) {
        throw new Error(`contribution record not found for id: ${contributionId}`);
      }
      contribution = aContribution;
      profile = contribution.profileRef;
      if (!profile) {
        throw new Error(`profileRef missing for contributionId: ${contributionId}`);
      }
      if (profile.stripeCustomerId) {
        stripeCustomerId = profile.stripeCustomerId;
        return Promise.resolve('skip');
      } else {
        stripeCustomerId = profile._id;
        return createStripeCustomer(stripeCustomerId, profile.email, profile.displayName)
          .then((result) => {
            console.log(`stripe create customer result: ${_.inspect(result)}`);
            return ProfileService.updateStripeCustomerId(profile._id, stripeCustomerId);
          }) //todo catch and handle error if strip customer already exists
      }
    })
    .then((result) => {
      console.log(`update cust id result: ${_.inspect(result)}`);
      // associate our captured payment information as the default payment source for the customer record
      return storeStripPaymentSourceData(stripeCustomerId, paymentData);
    })
    .then((result) => {
      console.log(`stripe store payment result: ${_.inspect(result)}`);
      return performStripeCharge(stripeCustomerId, paymentData.amount, `contribution id: ${contributionId}`);
    })
    .then((result) => {
      console.log(`stripe perform charge result: ${_.inspect(result)}`);
      return ContributionService.save(contributionId, {paidCapital: paymentData.amount, status: 'paid'});
    }).then((result) => {
      console.log(`contribution update result: ${_.inspect(result)}`);
      return ContributionService.fetch(contributionId);  // need to refetch to populate relations
    }).then((result) => {
      contribution = result;
      return sendConfirmationEmail(contribution);
    }).then((result) => {
      console.log(`send confirmation email result: ${_.inspect(result)}`);
      return sendLoggingEmail(contribution);
    })
    .then((result) => {
      console.log(`send logging email result: ${_.inspect(result)}`);
      return {status: 'success', statusLink: buildStatusLink(contribution)};
    })

}

const W4L_STATUS_URL = config.get('w4l').statusUrl;

function buildStatusLink(contribution) {
  return `${W4L_STATUS_URL}?c=${contribution._id}`;
}

function sendConfirmationEmail(contribution) {
  const to = contribution.profileRef.email;
  const subject = 'Donation Confirmation';
  const statusLink = buildStatusLink(contribution);
  let t = `Thank you ${contribution.profileRef.firstName} for your generation donation.\n`;
  t += `  amount: \$${contribution.capitalAmount}\n`;
  t += `  recurrence: ${contribution.recurringInterval}\n\n`;
  t += `Your status page is:\n`;
  t += `  ${statusLink}\n`;

  return mailer.sendEmail({
    //from: theConfig.sender,
    to: to
    , subject: subject
    , text: t
  });

}

function sendLoggingEmail(contribution) {
  const to = 'joseph@colab.coop';
  const subject = 'donation made';
  const statusLink = buildStatusLink(contribution);
  let t = `name: ${contribution.profileRef.displayName}\n`;
  t += `amount: \$${contribution.capitalAmount}\n`;
  t += `recurrence: ${contribution.recurringInterval}\n`;
  t += `status page: ${statusLink}\n`;

  return mailer.sendEmail({
    to: to
    , subject: subject
    , text: t
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

// now using profile._id for strip stripe customerId.
// todo: change this api to take a Profile obj
function createStripeCustomer(customerId, email, description) {
  return new Promise(function (resolve, reject) {
    stripe.customers.create({
      id: customerId
      , email: email
      , description: description
    }, function (err, result) {
      console.log('stripe create customer response - err: ' + err + ', charge: ' + _.inspect(result));
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function storeStripPaymentSource(customerId, stripeToken) {
  console.log(`store payment: cusotmerId: ${customerId}, token: ${stripeToken}`);
  return new Promise(function (resolve, reject) {
    stripe.customers.createSource(
      customerId
      , {source: stripeToken}
      , function(err, result) {
        console.log('stripe store payment source - err: ' + err + ', charge: ' + _.inspect(result));
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}

function storeStripPaymentSourceData(customerId, paymentData) {
  console.log(`store payment: cusotmerId: ${customerId}, paymentData: ${_.inspect(paymentData)}`);
  return new Promise(function (resolve, reject) {
    stripe.customers.createSource(
      customerId
      , {source: {
        object: 'card'
        , number: paymentData.cardNumber
        , exp_month: paymentData.cardExpMonth
        , exp_year: paymentData.cardExpYear
        , cvc: paymentData.cardCvv
        , address_zip: paymentData.billingZip
      }}
      , function(err, result) {
        console.log('stripe store payment source - err: ' + err + ', charge: ' + _.inspect(result));
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}


function performStripeCharge(stripeCustomerId, amount, description) {
  return new Promise(function (resolve, reject) {
    const amountCents = amount * 100;
    console.log(`customerid: ${stripeCustomerId}, amount: ${amountCents}, desc: ${description}`);
    stripe.charges.create({
      amount: amountCents // amount in cents, again
      , currency: "usd"
      , customer: stripeCustomerId
      , description: description
    }, function (err, result) {
      console.log('stripe charge response - err: ' + err + ', charge: ' + _.inspect(result));
      if (err) {
//        if (err && err.type === 'StripeCardError') {
//        req.flash('error', "Sorry, that card has been declined");
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

}

function test1(req, res) {
  stripe.customers.create({
    id: 'test1'
    , description: 'newtest1'
    , email: 'test1@pobox.com'
  }, function(err, customer) {
    console.log('stripe create customer response - err: ' + err + ', charge: ' + _.inspect(customer));
    if (err && err.type === 'StripeCardError') {
      // The card has been declined
      res.send('error: ' + err);
    } else if (customer) {
      res.send(`customer id: ${customer.id}`);
    } else {
      res.send('Sorry, there was an unexpected error: ' + err);
    }
  });
}

function showTest(req, res) {
  res.render('payment/test', {amount: 125, publicKey: stripe.config.publicKey});
}

function postTest(req, res) {
  var stripeToken = req.body.stripeToken;
  var stripeTokenType = req.body.stripeTokenType;
  console.log(`token: ${stripeToken}, type: ${stripeTokenType}`);
  stripe.customers.createSource(
    'test1', {source: stripeToken},
    function(err, result) {
    if (err)
      res.send(err);
    else
      res.json(result);
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

  //router.post('/api/v1/contribution/:contributionId/paymentInfo', apiPostPaymentInfo);
  router.get('/api/v1/contribution/:contributionId/paymentInfo.submit', apiSubmitPaymentInfo);

  // todo: need better endpoints
  router.get('/api/binbase/:bin', fetchBinbase);
  router.get('/api/estimateFee', estimateFee);

  router.get('/test1', test1);
  router.get('/pay/test', showTest);
  router.post('/pay/test', postTest);
}


module.exports = {
  addRoutes: addRoutes
  , mapMethod: mapMethod
  , resolveMethod: resolveMethod
  , stripeCharge: stripeCharge
};


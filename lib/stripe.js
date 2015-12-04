'use strict';

var _ = require('lodash');

var theStripe;
var theConfig;

function configure(config) {
  theConfig = config;
  var secretKey = config.secretKey;
  theStripe = require("stripe")(secretKey);
  theStripe.config = theConfig;
  //console.log('theStripe: ' + _.inspect(theStripe));
}

function instance() {
  return theStripe;
}

function config() {
  return theConfig;
}




// now using profile._id for strip stripe customerId.
// todo: change this api to take a Profile obj
function createCustomer(customerId, email, description) {
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

function storePaymentSourceToken(customerId, stripeToken) {
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

function storePaymentSourceData(customerId, paymentData) {
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


function performCharge(stripeCustomerId, amount, description) {
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


module.exports = {
  configure: configure
  , instance: instance
  , config: config
  , createCustomer: createCustomer
  , storePaymentSourceToken: storePaymentSourceToken
  , storePaymentSourceData: storePaymentSourceData
  , performCharge: performCharge
};


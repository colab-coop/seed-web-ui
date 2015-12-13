'use strict';

var _ = require('lodash');

//var theStripe;
//var theConfig;


let theSystemInstance;

class Stripe {

  constructor(config) {
    //this.enabled = Boolean.parse(config.enabled);
    this.enabled = true;

    //theConfig = config;
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.api = require("stripe")(this.secretKey);
    //theStripe.config = theConfig;
  }


  toString() {
    return `Stripe obj - pubKey: ${this.publicKey}, enabled: ${this.enabled}`;
  }


  // now using profile._id for strip stripe customerId.
// todo: change this api to take a Profile obj
  createCustomer(customerId, email, description) {
    return new Promise( (resolve, reject) => { // note fat arrow notation avoid binding of 'this' so that the surrounding instance context is available
      console.log(`createCustomer - this.api.pubKey: ${this.publicKey}`);
      this.api.customers.create({
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

  storePaymentSourceToken(customerId, stripeToken) {
    console.log(`store payment: cusotmerId: ${customerId}, token: ${stripeToken}`);
    return new Promise( (resolve, reject) => {
      this.api.customers.createSource(
        customerId
        , {source: stripeToken}
        , function (err, result) {
          console.log('stripe store payment source - err: ' + err + ', charge: ' + _.inspect(result));
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
    });
  }

  storePaymentSourceData(customerId, paymentData) {
    console.log(`store payment: cusotmerId: ${customerId}, paymentData: ${_.inspect(paymentData)}`);
    return new Promise( (resolve, reject) => {
      this.api.customers.createSource(
        customerId
        , {
          source: {
            object: 'card'
            , number: paymentData.cardNumber
            , exp_month: paymentData.cardExpMonth
            , exp_year: paymentData.cardExpYear
            , cvc: paymentData.cardCvv
            , address_zip: paymentData.billingZip
          }
        }
        , function (err, result) {
          console.log('stripe store payment source - err: ' + err + ', charge: ' + _.inspect(result));
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
    });
  }


  performCharge(stripeCustomerId, amount, description) {
    return new Promise( (resolve, reject) => {
      const amountCents = amount * 100;
      console.log(`customerid: ${stripeCustomerId}, amount: ${amountCents}, desc: ${description}`);
      this.api.charges.create({
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

}


function configure(config) {
  console.log(`stripe config: ${_.inspect(config)}`);
  theSystemInstance = new Stripe(config);
  console.log(`stripe system instance: ${theSystemInstance}`);
}

function systemInstance() {
  return theSystemInstance;
}


function create(merchantConfig) {

}

//function config() {
//  return theConfig;
//}




module.exports = {
  configure: configure
  , systemInstance: systemInstance
  //, config: config
  //, createCustomer: createCustomer
  //, storePaymentSourceToken: storePaymentSourceToken
  //, storePaymentSourceData: storePaymentSourceData
  //, performCharge: performCharge
};


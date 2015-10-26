'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Contribution = require('../models/contribution');
var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var helpers = require('../lib/helpers');
var curriedHandleError = _.curry(helpers.handleError);

var stripe = require('../lib/stripe').instance();
var braintree = require('../lib/braintree').instance();
var authorizeNet = require('../lib/authorizeNet').instance();
//var binbaseService = require('../lib/binbaseService');
var Binbase = require('../models/binbase');



_.mixin({
  'inspect': function(value) {
    return require('circular-json').stringify(value);
  }
});

function list(req, res) {
  Contribution.find().exec()
    .then(function (items) {
      var model = {
        items: items
      };
      res.render('contribution/list', model);
    })
    .catch( curriedHandleError(req, res) );
}

function view(req, res) {
  var id = req.param('id');
  var proposal;
  Contribution.findOne({_id: id}).exec()
    .then(function (item) {
      var model = {
        item: item,
      };
      res.render('contribution/view', model);
    })
    .catch( curriedHandleError(req, res) );
}

function showPledge(req, res) {
  var proposalId = req.param('pid');
  var voteId = req.param('vid');
  var lastAction = req.param('la');
  var model = {item: {}};
  if (lastAction) {
    model.lastAction = lastAction;
  }
  model.messages = req.flash('error');

  Proposal.findOne({_id: proposalId}).exec()
    .then(function (proposal) {
      model.proposal = proposal;
      // todo: validation and error message handling
      if (voteId) {
        return Vote.findOne({_id: voteId});
      } else {
        return null;
      }
    })
    .then(function(vote) {
      if (vote) {
        model.vote = vote;
        model.anticipatedCapital = vote.anticipatedCapital;
        model.anticipatedPatronage = vote.anticipatedPatronage;
      }
      res.render('contribution/pledge', model)
    })
    .catch( curriedHandleError(req, res) );
}

function postPledge(req, res) {
  console.log("postPledge - req: " + req + ", res: " + res);
  var proposalId = req.body.proposalId;
  var pledgedCapital = req.body.pledgedCapital;
  var pledgedPatronage = req.body.pledgedPatronage;

  var contribution = new Contribution({
    proposalId: proposalId
    , pledgedCapital: pledgedCapital
    , pledgedPatronage: pledgedPatronage
  });
  if (req.user) {
    contribution.userId = req.user._id;
    contribution.userName = req.user.name;

    console.log("userid: " + contribution.userId);
  }

  contribution.save()
    .then(function() {
      if (! req.user) {
        console.error("post pledge - need to bind supporter");
        req.session.pending = {
          action: 'pledge'
          , contributionId: contribution._id
          , message: 'please signin or login to complete your pledge'};
        res.redirect('/signup');
      } else {
        handlePledgeSuccess(req, res, contribution);
//        res.redirect('/c/contribute?pid=' + contribution.proposalId + 'cid=' + contribution._id + '&la=p');
      }

    })
    .catch( curriedHandleError(req, res) )
}

function handlePledgeSuccess(req, res, contribution) {
  var path = '/c/contribute?pid=' + contribution.proposalId + '&cid=' + contribution._id + '&la=pledge';
  res.redirect(path)

}


function handlePending(req, res) {

  var pending = req.session.pending;
  if ( ! pending ) {
    return false;
  }

  console.log('pending action: ' + pending.action);

  if ( ! req.user ) {
    throw new Error('unexpected missing user context')
  }

  if (pending.action == 'pledge') {
    delete req.session.pending;
    Contribution.findOne({_id: pending.contributionId}).exec()
      .then(function (contribution) {
        contribution.userId = req.user._id;
        contribution.userName = req.user.name;
        console.log("userid: " + contribution.userId);
        return contribution.save();
      }).then(function (contribution) {
        if (pending.action == 'pledge') {
          handlePledgeSuccess(req, res, contribution);
        }
      })
      .catch(curriedHandleError(req, res));
    return true;
  } else if (pending.action == 'contribute') {
    res.redirect('/c/payment');
    return true;
  } else {
    return false;
  }
}

function showContribute(req, res) {
  var proposalId = req.param('pid');
  var contributionId = req.param('cid');
  var lastAction = req.param('la');
  var proposal;
  console.log("last action: " + lastAction);
  Proposal.findOne({_id: proposalId}).exec()
    .then(function(found) {
      proposal = found;
      return Contribution.findOne({_id: contributionId})
    })
    .then(function(found) {
      var contribution = found;
      var defaultCapital = found ? found.pledgedCapital : "";
      console.log("contribution: " + contribution);
      var model = {contribution: contribution, proposal: proposal, defaultCapital: defaultCapital};
      if (lastAction) {
        model.lastAction = lastAction;
      }
      // todo: validation and error message handling
      model.messages = req.flash('error');
      res.render('contribution/contribute', model);
    })
    .catch( curriedHandleError(req, res) );
}

function postContribute(req, res) {
  var contributionId = req.body.contributionId;
  var proposalId = req.body.proposalId;
  var proposalTitle = req.body.proposalTitle;
  var capital = req.body.capital;
  var patronage = req.body.patronage;
  req.session.pending = {
    action: 'contribute'
    , contributionId: contributionId
    , proposalId: proposalId
    , proposalTitle: proposalTitle
    , capital: capital
    , patronage: patronage
    , message: 'please signin or login to complete your contribution'
  };

  if (! req.user) {
    console.error("post contribution - need to bind supporter");
    res.redirect('/signup');
  } else {
    res.redirect('/c/payment');
  }
}

function showPayment(req, res) {
//  var model = {pending: req.session.pending}
  var model = req.session.pending;
  model.messages = req.flash('error');
  res.render('contribution/payment', model);
}

function postPayment(req, res) {
  var paymentMethod = req.body.paymentMethod;
  res.redirect('/c/payment' + paymentMethod);
}

function showDwolla(req, res) {
//  var model = {pending: req.session.pending}
  var model = req.session.pending;
  model.messages = req.flash('error');
  res.render('contribution/paymentDwolla', model);
}

function showStripe(req, res) {
  // todo: factor this to be shared
  if (!req.session.pending) {
    console.error("showStripe - missing pending state");
    res.redirect('/p');
    return;
  }
//  var model = {pending: req.session.pending}
  //todo validate session state
  var model = req.session.pending;
  model.amount = model.capital;
  model.amountCents = model.capital * 100;
  model.publicKey = stripe.config.publicKey;
  model.messages = req.flash('error');
  res.render('contribution/paymentStripe', model);
}

function postStripe(req, res) {
  var amountCents = req.body.amountCents;
  var description = req.body.description;
  var stripeToken = req.body.stripeToken;
  var stripeTokenType = req.body.stripeTokenType;
  var stripeEmail = req.body.stripeEmail;
  console.log('postStripe - token: ' + stripeToken + ', type: ' + stripeTokenType + ', emai: ' + stripeEmail);

  // Set your secret key: remember to change this to your live secret key in production
  // See your keys here https://dashboard.stripe.com/account/apikeys
//  var stripe = require("stripe")("sk_test_gNnKH2tmH4Fryn8FoJU57iWa");

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
      res.redirect('/c/paymentStripe');
    } else if (charge) {
      res.redirect('/c/thanks');
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      res.redirect('/c/paymentStripe');
    }
  });
}


function showBraintree(req, res) {
  //todo validate session state
  var model = req.session.pending;
  model.amount = model.capital;
//    model.amountCents = model.capital * 100
  model.messages = req.flash('error');
  var clientToken;

  console.log('braintree: ' + _.inspect(braintree));;
  braintree.clientToken.generate({}, function (err, result) {
    model.clientToken = result.clientToken;
    console.log('clientToken: ' + clientToken);
    res.render('contribution/paymentBraintree', model);
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
      res.redirect('/c/paymentBraintree')
    } else if (result) {
      res.redirect('/c/thanks');;
    } else {
      req.flash('error', 'Sorry, there was an unexpected error: ' + err);
      res.redirect('/c/paymentBraintree');
    }
  });
}

function showAuthorizeNet(req, res) {
  //todo validate session state
  var model = req.session.pending;
  model.amount = model.capital;
  model.messages = req.flash('error');
  var clientToken;

  res.render('contribution/paymentAuthorizeNet', model);

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
        //todo store transaction record
        upsertPendingContribution(req, res);
//        res.redirect('/c/thanks');
      } else {
        // not sure if this flow is possible or not
        console.log('authnet failure - tranresp: ' + transaction.transactionResponse);
        req.flash('error', 'Sorry, there was an error processing your transaction');
        res.redirect('/c/paymentAuthorizeNet');
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
      res.redirect('/c/paymentAuthorizeNet');
    })
}


function showCheck(req, res) {
//  var model = {pending: req.session.pending}
  var model = req.session.pending;
  console.log('showCheck - model: ' + _.inspect(model));
  model.messages = req.flash('error');
  res.render('contribution/paymentCheck', model);
}

function postCheck(req, res) {
  console.log("postCheck");
  upsertPendingContribution(req, res);
}

function upsertPendingContribution(req, res) {
  console.log('pending: ' + _.inspect(req.session.pending));
  var contributionId = req.session.pending.contributionId;
  var proposalId = req.session.pending.proposalId;
  var capital = req.session.pending.capital;
  var patronage = req.session.pending.patronage;

  delete req.session.pending;

  if (contributionId) {
    // updated existing pledge record
    Contribution.findOne({_id: contributionId}).exec()
      .then(function (contribution) {
        contribution.paidCapital = capital;
        contribution.paidPatronage = patronage;
        return contribution.save();
      }).then(function (contribution) {
        res.redirect('/c/' + contribution._id + '/thanks');
      })
      .catch(curriedHandleError(req, res));
  } else {
    // no pledge context, create a new contribution record
    var contribution = new Contribution({
      proposalId: proposalId
      , paidCapital: capital
//      , paidPatronage: patronage
      , userId: req.user._id
      , userName: req.user.name
    });
    contribution.save()
      .then(function (saved) {
        res.redirect('/c/' + saved._id + '/thanks');
      })
      .catch(curriedHandleError(req, res))
  }
}

function showBitcoin(req, res) {
//  var model = {pending: req.session.pending}
  var model = req.session.pending;
  model.messages = req.flash('error');
  res.render('contribution/paymentBitcoin', model);
}

function fetchBinbase(req, res) {
  var bin = req.params.bin;
  var amount = req.params.amount;
  console.log('bin: ' + bin + ", amount: " + amount);
  Binbase.findOne({bin: bin}).exec()
    .then(function (item) {
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


function addRoutes(router) {
  router.get('/c', list);
  router.get('/c/view', view);
  router.get('/c/:pid/view', view);
  router.get('/c/pledge', showPledge);
  router.get('/p/:pid/pledge', showPledge);
  router.post('/c/pledge', postPledge);
  router.get('/c/contribute', showContribute);
  router.get('/p/:pid/contribute', showContribute);
  router.post('/c/contribute', postContribute);
  router.get('/c/payment', showPayment);
  router.get('/c/:pid/payment', showPayment);
  router.post('/c/payment', postPayment);
  router.post('/c/contribute', postContribute);
  router.get('/c/paymentDwolla', showDwolla);
  router.get('/c/paymentCheck', showCheck);
  router.post('/c/paymentCheck', postCheck);
  router.get('/c/paymentStripe', showStripe);
  router.post('/c/paymentStripe', postStripe);
  router.get('/c/paymentBraintree', showBraintree);
  router.post('/c/paymentBraintree', postBraintree);
  router.get('/c/paymentAuthorizeNet', showAuthorizeNet);
  router.post('/c/paymentAuthorizeNet', postAuthorizeNet);
  router.get('/c/paymentBitcoin', showBitcoin);

  router.get('/api/binbase/:bin', fetchBinbase);
  router.get('/api/estimateFee', estimateFee);

//  passthrough(router, 'c/thanks');
  router.get('/c/thanks', function (req, res) { res.render('contribution/thanks', {}) });
  router.get('/c/:cid/thanks', function (req, res) { res.render('contribution/thanks', {}) });


}


module.exports = {
  addRoutes: addRoutes
  , handlePending: handlePending
}


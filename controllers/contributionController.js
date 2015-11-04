'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const ContributionService = require('../lib/contributionService');
const ProposalService = require('../lib/proposalService');
const Contribution = require('../models/contribution');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);


const baseTemplatePath = 'contribution';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);
}


function list(req, res) {
  ContributionService.list()
    .then((items) => render(res, 'list', {items: items}) )
    .catch( curriedHandleError(req, res) );
}

function view(req, res) {
  const id = req.param('id');
  Contribution.findOne({_id: id}).exec()
    .then((item) => render(res, 'view', {item: item}) )
    .catch( curriedHandleError(req, res) );
}

function showPledge(req, res) {
  const proposalId = req.param('pid');
  const voteId = req.param('vid');
  const lastAction = req.param('la');
  const model = {item: {}};
  if (lastAction) {
    model.lastAction = lastAction;
  }
  model.messages = req.flash('error');

  ProposalService.fetchLite(proposalId)
    .then((proposal) => {
      model.proposal = proposal;
      // todo: validation and error message handling
      if (voteId) {
        return Vote.findOne({_id: voteId});
      } else {
        return null;
      }
    })
    .then((vote) => {
      if (vote) {
        model.vote = vote;
        model.anticipatedCapital = vote.anticipatedCapital;
        model.anticipatedPatronage = vote.anticipatedPatronage;
      }
      render(res, 'pledge', model)
    })
    .catch( curriedHandleError(req, res) );
}

function postPledge(req, res) {
  console.log("postPledge - req: " + req + ", res: " + res);
  const proposalId = req.body.proposalId;
  const pledgedCapital = req.body.pledgedCapital;
  const pledgedPatronage = req.body.pledgedPatronage;

  const contribution = new Contribution({
    proposalRef: proposalId
    , pledgedCapital: pledgedCapital
    , pledgedPatronage: pledgedPatronage
  });
  if (req.user) {
    //contribution.userId = req.user._id;
    //contribution.userName = req.user.name;
    contribution.profileRef = req.user.profile._id;

    console.log("profileRef: " + contribution.profileRef);
  }

  contribution.save()
    .then(() => {
      if (! req.user) {
        console.error("post pledge - need to bind supporter");
        req.session.pending = {
          action: 'pledge'
          , contributionId: contribution._id
          , message: 'please signin or login to complete your pledge'};
        res.redirect('/signup');
      } else {
        handlePledgeSuccess(req, res, contribution);
      }

    })
    .catch( curriedHandleError(req, res) )
}

function handlePledgeSuccess(req, res, contribution) {
  const path = '/p/' + contribution.proposalRef + '/contribute?cid=' + contribution._id + '&la=pledge';
  res.redirect(path)

}


function handlePending(req, res) {

  const pending = req.session.pending;
  if ( ! pending ) {
    return false;
  }

  console.log('pending action: ' + pending.action);

  // factor state validation into route mappings
  if ( ! req.user ) {
    throw new Error('unexpected missing user context')
  }

  if (pending.action == 'pledge') {
    delete req.session.pending;
    ContributionService.fetch(pending.contributionId)
      .then((contribution) => {
        contribution.profileRef = req.user.profile._id;
        //contribution.userName = req.user.name;
        console.log("supporterRef: " + contribution.profileRef);
        return contribution.save();
      }).then((contribution) => {
        if (pending.action == 'pledge') {
          handlePledgeSuccess(req, res, contribution);
        }
      })
      .catch(curriedHandleError(req, res));
    return true;
  } else if (pending.action == 'contribute') {
    delete req.session.pending;
    res.redirect('/pay');
    return true;
  } else {
    return false;
  }
}


function showContribute(req, res) {
  const proposalId = req.param('pid');
  const contributionId = req.param('cid');
  const lastAction = req.param('la');
  let proposal;
  console.log("last action: " + lastAction);
  ProposalService.fetchLite(proposalId)
    .then((found) => {
      proposal = found;
      return Contribution.findOne({_id: contributionId})
    })
    .then((found) => {
      const contribution = found;
      const defaultCapital = found ? found.pledgedCapital : "";
      console.log("contribution: " + contribution);
      const model = {contribution: contribution, proposal: proposal, defaultCapital: defaultCapital};
      if (lastAction) {
        model.lastAction = lastAction;
      }
      // todo: validation and error message handling
      model.messages = req.flash('error');
      render(res, 'contribute', model);
    })
    .catch( curriedHandleError(req, res) );
}

function postContribute(req, res) {
  const contributionId = req.body.contributionId;
  const proposalId = req.body.proposalId;
  const proposalTitle = req.body.proposalTitle;
  const capital = req.body.capital;
  const patronage = req.body.patronage;
  req.session.cart = {
    kind: 'contribution'
    , description: 'Capital contribution'  // in support of ...'
    , contributionId: contributionId
    , proposalId: proposalId
    , proposalTitle: proposalTitle
    , amount: capital
    , capital: capital  // todo: remove usages
    , successMethodName: 'handleContributionPaymentSuccess'
  };

  if (! req.user) {
    console.info("post contribution - need to bind supporter");
    req.session.pending = {
      //todo: can eliminate some of these fields, need to factor over usage to cart session model
      action: 'contribute'
      , contributionId: contributionId
      , proposalId: proposalId
      , proposalTitle: proposalTitle
      , capital: capital
      , patronage: patronage
      , message: 'please signin or login to complete your contribution'
    };
    res.redirect('/signup');
  } else {
    res.redirect('/pay');
  }
}

require('./paymentController').mapMethod('handleContributionPaymentSuccess', handleContributionPaymentSuccess);



function handleContributionPaymentSuccess(req, res) {
  console.log('handlepaymentsuccess cart: ' + _.inspect(req.session.cart));
  const contributionId = req.session.cart.contributionId;
  const proposalId = req.session.cart.proposalId;
  //todo: switch on cart.kind - for now only capital contribution
  const capital = req.session.cart.amount;

  if (contributionId) {
    // updated existing pledge record
    ContributionService.fetch(contributionId)
      .then((contribution) => {
        contribution.paidCapital = capital;
        return contribution.save();
      }).then((contribution) => {
        gotoThanks(req, res, contribution);
      })
      .catch(curriedHandleError(req, res));
  } else {
    // no pledge context, create a new contribution record
    const contribution = new Contribution({
      proposalRef: proposalId
      , paidCapital: capital
      , profileRef: req.user.profile._id
    });
    contribution.save()
      .then((saved) => gotoThanks(req, res, saved) )
      .catch(curriedHandleError(req, res))
  }
}

function gotoThanks(req, res, contribution) {
  delete req.session.cart;
  res.redirect('/c/' + contribution._id + '/thanks');

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
  router.get('/c/:cid/thanks', function (req, res) { res.render('contribution/thanks', {}) });
}




module.exports = {
  addRoutes: addRoutes
  , handlePending: handlePending
  , handleContributionPaymentSuccess: handleContributionPaymentSuccess
};


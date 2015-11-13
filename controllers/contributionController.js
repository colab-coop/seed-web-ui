'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const ContributionService = require('../lib/contributionService');
const ProposalService = require('../lib/proposalService');
const OfferService = require('../lib/offerService');
const UserService = require('../lib/userService');
const Contribution = require('../models/contribution');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const Profile = require('../models/profile');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);


const baseTemplatePath = 'contribution';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);
}



//
// new flows
//


function postMember(req, res) {
  const proposalId = req.body.pid;
  console.log(`pid: ${proposalId}, body: ${_.inspect(req.body)}`);
  const wasAuthenticated = !!req.user;
  const userData = {
    profileId: wasAuthenticated ? req.user.profile._id : null
    , displayName: req.body.displayName
    , firstName: req.body.firstName
    , lastName:  req.body.lastName
    , orgName: req.body.orgName
    , email: req.body.email
  };
  const pledgeData = {
      amount: req.body.amount  // not currently used
    , pledgedCapital: 0
    , member: true
    , memberships: req.body.memberships
  };
  console.log(`membership offer id: ${pledgeData.memberships}`);
  let resultMap;
  let contribution;
  ContributionService.createPledge(proposalId, userData, pledgeData)
    .then((result) => {
      contribution = result.contribution;
      resultMap = result;
      console.log(`createPledge result: ${_.inspect(result)}`);
      if (!wasAuthenticated) {
        return UserService.login(req, resultMap.user);
      } else {
        return Promise.resolve(null); //nop
      }
    })
    .then(() => {
      return OfferService.fetch(pledgeData.memberships);
    })
    .then((offer) => {
      if (offer && offer.minimumContributionAmount) {
        req.session.cart = {
          kind: 'contribution'
          , pageTitle: 'Payment information'
          , description: `${offer.proposalRef.title} Member Fee`
          , amount: offer.minimumContributionAmount
          , successMethodName: 'handleContributionPaymentSuccess'
        };
        res.redirect('/pay/stripeInfo');
      } else {
        gotoThanks(req, res, contribution);
      }
    })
    .catch(curriedHandleError(req, res));
}

function thanks(req, res) {
  res.render('home/thanks', {});
}


function postPledge(req, res) {
  const proposalId = req.body.pid;
  console.log(`pid: ${proposalId}, body: ${_.inspect(req.body)}`);
  const wasAuthenticated = !!req.user;
  const userData = {
    profileId: wasAuthenticated ? req.user.profile._id : null
    , displayName: req.body.displayName
    , firstName: req.body.firstName
    , lastName:  req.body.lastName
    , orgName: req.body.orgName
    , email: req.body.email
  };
  const pledgeData = {
    pledgedCapital: Number(req.body.amount) || 0
    , patron: Boolean(req.body.patron)
    , member: Boolean(req.body.member)
    , funder: Boolean(req.body.funder)
    , payNow: Boolean(req.body.payNow)
    , pledge: Boolean(req.body.pledge)
    , seedcoopInterest: Boolean(req.body.seedcoop)
    , memberships: req.body.memberships
    , perks: req.body.perks
  };
  let resultMap;
  ContributionService.createPledge(proposalId, userData, pledgeData)
    .then((result) => {
      resultMap = result;
      console.log(`createPledge result: ${_.inspect(result)}`);
      if (!wasAuthenticated) {
        return UserService.login(req, resultMap.user);
      } else {
        return Promise.resolve(null); //nop
      }
    })
    .then(() => {
      req.session.cart = {
        kind: 'contribution'
        , pageTitle: 'Can you contribute now?'
        , description: 'Capital Contribution'  // in support of ...'
        , amount: pledgeData.pledgedCapital
        , successMethodName: 'handleContributionPaymentSuccess'
      };
//      res.redirect(uri(`/${resultMap.contribution._id}/pay`));
      res.redirect('/pay/stripeInfo');
    })
    .catch(curriedHandleError(req, res));
}


//function showPay(req, res) {
////  const amount = amountArg || Number(req.body.amount);
//  const amount = Number(req.body.amount) || 0;
//  req.session.cart = {
//    kind: 'contribution'
//    , pageTitle: 'Can you contribute now?'
//    , description: 'Capital Contribution'  // in support of ...'
//    , amount: amount
//    , successMethodName: 'handleContributionPaymentSuccess'
//  };
//  res.redirect('/pay');
//}


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

require('./paymentController').mapMethod('handleContributionPaymentSuccess', handleContributionPaymentSuccess);


function gotoThanks(req, res, contribution) {
  delete req.session.cart;
  res.redirect('/c/' + contribution._id + '/thanks');
}


const baseUriPath = '/c';

function uri(tail) {
  return baseUriPath + tail;
}

//function gotoBaseView(req, res) {
//  res.redirect(baseUriPath);
//}



function addRoutes(router) {

  //router.post('/p/seed/pledge', postSeedPledge);
  router.post('/p/:proposalId/pledge', postPledge);
  router.post('/p/:proposalId/member', postMember);
  //router.get(uri('/:contributionId/pay'), showPay);
  //router.post(uri('/:contributionId/water'), postWater);

  router.get('/c', list);
  router.get('/c/view', view);
  router.get('/c/:pid/view', view);


  router.get('/p/:pid/seed', showSeed);     // form to indicate support
//  router.post('/p/:pid/seed', postSeed);
  router.get('/c/pledge', old_showPledge);
  router.get('/p/:pid/pledge', old_showPledge);
  router.post('/c/pledge', old_postPledge);
  router.get('/c/contribute', old_showContribute);
  router.get('/p/:pid/contribute', old_showContribute);
  router.post('/c/contribute', old_postContribute);
  router.get('/c/:cid/thanks', thanks);
}




module.exports = {
  addRoutes: addRoutes
  , handlePending: handlePending
  , handleContributionPaymentSuccess: handleContributionPaymentSuccess
};



//
// old stuff
//

function showSeed(req, res) {
  const id = req.param('pid');
  req.session.currentProposalId = id;  //save this for return flows
  const model = {};
  model.profile = req.user ? req.user.profile : {};
  let proposal;
  ProposalService.fetch(id)
    .then((found) => {
      proposal = found;
      model.proposal = proposal;
      render(res, 'seed', model);
    })
    .catch( curriedHandleError(req, res) );
}


function old_postSeed(req, res) {
  const proposalId = req.body.pid;
  console.log(`pid: ${proposalId}, body: ${_.inspect(req.body)}`);
  let profileId = req.user ? req.user.profile._id : null;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const orgName = req.body.orgName;
  //const fullName = `${firstName} ${lastName}`;
  //console.log(`fullname: ${fullName}`);
  const email = req.body.email;
  const data = {
    profileRef: profileId
    , proposalRef: proposalId
    //, name: fullName
    , firstName: firstName
    , lastName: lastName
    , orgName: orgName
    , email: email
    , patron: Boolean(req.body.patron)
    , member: Boolean(req.body.member)
    , funder: Boolean(req.body.funder)
    , payNow: Boolean(req.body.payNow)
    , pledge: Boolean(req.body.pledge)
    , seedcoopInterest: Boolean(req.body.seedcoop)
    , memberships: req.body.memberships
    , perks: req.body.perks
  };
  console.log(`postSeed: pid: ${proposalId}, data: ${_.inspect(data)}`);
  if (!profileId) {
    data.password = 'xxxxxx';  //tmp hack, should leave password undefined once we have reset flow
    data.memberType = data.seedcoopInterest ? Profile.MEMBERSHIP_TYPES.provisional : Profile.MEMBERSHIP_TYPES.visitor;
    UserService.createUser(data)
      .then((user) => {
        console.log(`auto signup - new user: ${user}`);
        data.profileRef = user.defaultProfileRef;
        return UserService.login(req, user);
      })
      .then(() => {
        continueSeedSave(req, res, data);
      })
      //todo: handle email in use error
      .catch(curriedHandleError(req, res));
  } else {  //todo: sort out better way to have optional pipelink operations
    continueSeedSave(req, res, data);
  }
}

function continueSeedSave(req, res, data) {
  Contribution.create(data)
    .then((saved) => { console.log(`saved: ${saved}`);
//      showLastProposal(req, res)
      res.redirect(uri(`/${saved._id}/water`));
    })
    .catch(curriedHandleError(req, res));
}


//function showWater(req, res) {
//  const contributionId = req.param('contributionId');
//  req.session.currentContributionId = contributionId;  //save this for return flows
//  //const model = {};
////  model.profile = req.user ? req.user.profile : {};
//  let proposal;
//  ContributionService.fetch(contributionId)
//    .then((found) => {
//      //model.contribution = found;
//      render(res, 'water', {contribution: found});
//    })
//    .catch( curriedHandleError(req, res) );
//}
//
//function postWater(req, res) {
//  console.log(`postWater - body: ${_.inspect(req.body)}`);
//  const contributionId = req.body.contributionId;
//  const data = {
//    pledgedPatronage: Number(req.body.pledgedPatronage || 0)
//    , pledgedCapital: Number(req.body.pledgedCapital || 0)
//    , payNow: Boolean(req.body.payNow)
//    , pledge: Boolean(req.body.pledge)
//  };
//  console.log(`postWater - data: ${_.inspect(data)}`);
//  ContributionService.save(contributionId, data)
//    .then((contribution) => {
//      //if (data.pledge) {
//      //  showLastProposal(req, res);
//      //} else {
//        showPayment(req, res, data.pledgedCapital);
//      //}
//    })
//    .catch( curriedHandleError(req, res) );
//}

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

function old_showPledge(req, res) {
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

function old_postPledge(req, res) {
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


function old_showContribute(req, res) {
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

function old_postContribute(req, res) {
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






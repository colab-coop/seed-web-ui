'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const ProposalService = require('../lib/proposalService');
const VoteService = require('../lib/voteService');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);

/*
 * Vote handling
 */


function showVote(req, res) {
  const id = req.param('pid');
  ProposalService.fetch(id)
    .then((proposal) => {
      const model = {proposal: proposal, item: {}};
      // todo: validation and error message handling
      model.messages = req.flash('error');
      res.render('proposal/vote', model);
    })
    .catch( curriedHandleError(req, res) );
}

function postVote(req, res) {
  const model = {};
  model.voteRank = req.param('voteRank');
  model.anticipatedCapital = req.param('anticipatedCapital');
  model.anticipatedPatronage = req.param('anticipatedPatronage');
  model.workerInterest = req.param('workerInterest');
  const proposalId = req.param('proposalId');
  model.proposalRef = proposalId;
  if (req.user) {
    console.log("userId: " + req.user._id + ', profile: ' + req.user.profile);
    model.profileRef = req.user.profile._id;
  }

  Vote.create(model)
    .then((item) => {
      console.log("new vote id: " + item._id + ", obj: " + item);
      if (! req.user) {
        req.session.pending = {action: 'vote', voteId: item._id, message: 'please signin or login to register your vote'};
        res.redirect('/signup');
      } else {
        handleVoteSuccess(req, res, item);
      }
    })
    .catch( curriedHandleError(req, res) );
}

function handleVoteSuccess(req, res, vote) {
  const path = '/p/' + vote.proposalRef + '/pledge?la=vote&vid=' + vote._id;
  res.redirect(path);

}

function handlePending(req, res) {

  const pending = req.session.pending;
  if ( ! pending || pending.action != 'vote' ) {
    return false;
  }

  console.log('pending action: ' + pending.action);

  if ( ! req.user ) {
    throw new Error('unexpected missing user context')
  }

  delete req.session.pending;

  VoteService.fetch(pending.voteId)
    .then((item) => {
      item.profileRef = req.user.profile._id;
      console.log("profileRef: " + item.profileRef);
      return item.save();
    }).then((item) => handleVoteSuccess(req, res, item) )
    .catch( curriedHandleError(req, res) );
  return true
}


function voteView(req, res) {
  console.log("root index.js - vote/view");
  const id = req.param('id');
  VoteSevice.fetch(id)
    .then((item) => res.render('vote/view', {item: item}) )
    .catch( curriedHandleError(req, res) );
}

function deleteVote(req, res) {
  const id = req.param('id');
  VoteService(id)
    .then(() => res.redirect('/') )
    .catch( curriedHandleError(req, res) );
}

/*
  Routes
 */

function addRoutes(router) {
  router.get('/p/vote', showVote);
  router.get('/p/:pid/vote', showVote);
  router.post('/p/vote', postVote);

  router.get('/vote/view', voteView);
  router.get('/vote/:id/view', voteView);

  router.get('/vote/:id/delete', deleteVote);
}

module.exports = {
  addRoutes: addRoutes
  , handlePending: handlePending
};

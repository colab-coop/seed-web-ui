'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var helpers = require('../lib/helpers');
var curriedHandleError = _.curry(helpers.handleError);

var ProposalService = require('../lib/proposalService');

/*
 * Proposals
 */

function listProposals(req, res) {
  listProposalsView(req, res, 'proposal/list');
}

function adminListProposals(req, res) {
  listProposalsView(req, res, 'proposal/adminList');
}

function listProposalsView(req, res, view) {
  const parent = req.query.parent;
  let sectorOptions;
  ProposalService.buildSectorOptions(parent, true, 'All')
    .then((options) => {
      sectorOptions = options;
      if (!!parent) {
        //todo: filter by campaign once we have separate proposal admin view
//        return Proposal.find({kind: Proposal.KIND.campaign, parentRef: parent});
        return Proposal.find({parentRef: parent});
      } else {
        return Proposal.find();
      }
    })
    .then(function (items) {
      console.log("inside find callback");
      var model = {
        items: items
        , sectorOptions: sectorOptions
      };
      res.render(view, model);
    })
    .catch( curriedHandleError(req, res) );
}

function showProposal(req, res) {
  const id = req.param('id');
  ProposalService.fetch(id)
    .then(function(proposal) {
      const model = {proposal: proposal};
      res.render('proposal/view', model);
    })
    .catch( curriedHandleError(req, res) );
}

function newProposal(req, res) {
  var model = {item: new Proposal()};
  res.render('proposal/new', model);
}

function editProposal(req, res) {
  let item = null;
  Proposal.findOne({_id: req.params.id}).exec()
    .then((found) => {
      item = found;
      return ProposalService.buildSectorOptions(item.parentRef, true);
    }).then((sectorOptions) => {
      const kindOptions = Proposal.buildKindOptions(item.kind, true);
      const model = {item: item, kindOptions: kindOptions, sectorOptions: sectorOptions};
      res.render('proposal/edit', model);
    })
    .catch(curriedHandleError(req, res));
}

function createProposal(req, res) {

  const proposal = new Proposal({
    ownerRef: req.user.profile._id,
    title: req.body.title && req.body.title.trim(),
    summary: req.body.summary && req.body.summary.trim(),
    location: req.body.location && req.body.location.trim(),
    description: req.body.description
  });

  handleAttachement(req, proposal)
    .then((proposal) => proposal.save())
    .then(() => res.redirect('/p'))
    .catch(curriedHandleError(req, res));
}

function updateProposal(req, res) {
  const kind = req.body.kind;
  const parentRef = req.body.parentRef;
  console.log(`kind: [${kind}]`);
  Proposal.findOne({_id: req.params.id}).exec()
    .then((proposal) => handleAttachement(req, proposal))
    .then((proposal) => proposal.update({
      kind: kind,
      parentRef: parentRef,
      title: req.body.title && req.body.title.trim(),
      summary: req.body.summary && req.body.summary.trim(),
      location: req.body.location && req.body.location.trim(),
      description: req.body.description
    }).exec())
    .then(() => {
      res.redirect('/p')
    })
    .catch(curriedHandleError(req, res));
}

function deleteProposal(req, res) {
  var id = req.param('id');
  Proposal.remove({_id: id}).exec()
    .then(function () {
      res.redirect('/p');
    })
    .catch( curriedHandleError(req, res) );
}

function handleAttachement(req, proposal) {
  if (req.files.image_file.size > 0) {
    return proposal.attachImageAsync(req.files.image_file.path);
  } else if (1 == parseInt(req.body.delete_image)) {
    return proposal.detachImageAsync();
  } else {
    return Promise.resolve(proposal);
  }
}

/*
 * Votes
 */

function showVote(req, res) {
  var id = req.param('pid');
  Proposal.findOne({_id: id}).populate('profileRef').exec()
    .then(function (proposal) {
      var model = {proposal: proposal, item: {}};
      // todo: validation and error message handling
      model.messages = req.flash('error');
      res.render('proposal/vote', model);
    })
    .catch( curriedHandleError(req, res) );
}

function postVote(req, res) {
  var model = {};
  model.voteRank = req.param('voteRank');
  model.anticipatedCapital = req.param('anticipatedCapital');
  model.anticipatedPatronage = req.param('anticipatedPatronage');
  model.workerInterest = req.param('workerInterest');
  var proposalId = req.param('proposalId');
  model.proposalRef = proposalId;
  if (req.user) {
    console.log("userId: " + req.user._id + ', profile: ' + req.user.profile);
    model.profileRef = req.user.profile._id;
  }

  Vote.create(model)
    .then(function(item) {
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
  var path = '/p/' + vote.proposalRef + '/pledge?la=vote&vid=' + vote._id;
  res.redirect(path);

}

function handlePending(req, res) {

  var pending = req.session.pending;
  if ( ! pending || pending.action != 'vote' ) {
    return false;
  }

  console.log('pending action: ' + pending.action);

  if ( ! req.user ) {
    throw new Error('unexpected missing user context')
  }

  delete req.session.pending;

  Vote.findOne({_id: pending.voteId}).exec()
    .then(function (item) {
      item.profileRef = req.user.profile._id;
      console.log("profileRef: " + item.profileRef);
      return item.save();
    }).then(function (item) {
      handleVoteSuccess(req, res, item);
    })
    .catch( curriedHandleError(req, res) );
  return true
}


function voteView(req, res) {
  console.log("root index.js - vote/view");
  var id = req.param('id');
  var model = {};
  Vote.findOne({_id: id}).populate('profileRef proposalRef').exec()
    .then(function(item) {
      model.item = item;
      res.render('vote/view', model);
    })
    .catch( curriedHandleError(req, res) );
}

function deleteVote(req, res) {
  var id = req.param('id');
  Vote.remove({_id: id}).exec()
    .then(function () {
      res.redirect('/p');
    })
    .catch( curriedHandleError(req, res) );
}

/*
  Routes
 */

function addRoutes(router) {
  router.get('/admin/proposal', adminListProposals);
  router.get('/p', listProposals);
  router.get('/p/view', showProposal);
  router.get('/p/:id/view', showProposal);

  router.get('/p/new', newProposal);
  router.post('/p', createProposal);
  router.get('/p/:id/edit', editProposal);
  router.post('/p/:id', updateProposal);

  router.get('/p/vote', showVote);
  router.get('/p/:pid/vote', showVote);
  router.post('/p/vote', postVote);

  router.get('/vote/view', voteView);
  router.get('/vote/:id/view', voteView);

  router.get('/p/:id/delete', deleteProposal);
  router.get('/vote/:id/delete', deleteVote);
}

module.exports = {
  addRoutes: addRoutes
  , handlePending: handlePending
};

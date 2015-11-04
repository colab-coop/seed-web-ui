'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);

const ProposalService = require('../lib/proposalService');

/*
 * Proposals
 */

const baseTemplatePath = 'proposal';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);
}

function home(req, res) {
  listProposalsView(req, res, 'home', Proposal.KIND.campaign);
}

function listProposals(req, res) {
  listProposalsView(req, res, 'list', Proposal.KIND.campaign);
}

function adminListProposals(req, res) {
  listProposalsView(req, res, 'adminList');
}


function listProposalsView(req, res, view, kind) {
  const parent = req.query.parent;
  let sectorOptions;
  ProposalService.buildSectorOptions(parent, true, 'All')
    .then((options) => {
      sectorOptions = options;
      const filter = {};
      if (kind) {
        filter.kind = kind;
      }
      if (!!parent) {
        filter.parentRef = parent;
      }
      return Proposal.find(filter).populate('parentRef');  // should confirm if this cascades and if we need to worry about circular refs
    })
    .then((items) => {
      console.log("inside find callback");
      const model = {
        items: items
        , sectorOptions: sectorOptions
      };
      render(res, view, model);
    })
    .catch( curriedHandleError(req, res) );
}


function showLastProposal(req, res) {
  const id = req.session.currentProposalId;
  if (id) {
    ProposalService.fetch(id)
      .then((proposal) => render(res, 'view', {proposal: proposal}) )
      .catch( curriedHandleError(req, res) );
  } else {
    home(req, res);
  }
}

function showProposal(req, res) {
  const id = req.param('id');
  req.session.currentProposalId = id;  //save this for return flows
  ProposalService.fetch(id)
    .then((proposal) => render(res, 'view', {proposal: proposal}) )
    .catch( curriedHandleError(req, res) );
}

function showSeed(req, res) {
  const id = req.param('id');
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


function newProposal(req, res) {
  render(res, 'new', {item: {}});
}

function editProposal(req, res) {
  const id = req.params.id;
  let item;
  ProposalService.fetchLite(id)
    .then((found) => {
      item = found;
      return ProposalService.buildSectorOptions(item.parentRef, true);
    }).then((sectorOptions) => {
      const kindOptions = Proposal.buildKindOptions(item.kind, true);
      const model = {item: item, kindOptions: kindOptions, sectorOptions: sectorOptions};
      render(res, 'edit', model);
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
    .then(() => gotoBaseView(req, res))
    .catch(curriedHandleError(req, res));
}

function updateProposal(req, res) {
  const id = req.params.id;
  console.log(`updateproposal - id: ${id}`);
  const kind = req.body.kind;
  const parentRef = req.body.parentRef;
  const data = {
    kind: kind,
    parentRef: parentRef,
    title: req.body.title && req.body.title.trim(),
    summary: req.body.summary && req.body.summary.trim(),
    location: req.body.location && req.body.location.trim(),
    description: req.body.description
  };
  console.log(`kind: [${kind}]`);
  ProposalService.fetchLite(id)
    .then((proposal) => handleAttachement(req, proposal))
    .then((proposal) => proposal.update(data).exec())
    .then(() => { gotoBaseView(req, res) })
    .catch(curriedHandleError(req, res));
}

function deleteProposal(req, res) {
  var id = req.param('id');
  ProposalService.remove(id)
    .then(() => gotoBaseView(req, res) )
    .catch( curriedHandleError(req, res) );
}

function handleAttachement(req, proposal) {
  console.log(`handleattach prop: ${proposal}`);
  if (req.files && req.files.image_file.size > 0) {
    return proposal.attachImageAsync(req.files.image_file.path);
  } else if (1 == parseInt(req.body.delete_image)) {
    return proposal.detachImageAsync();
  } else {
    return Promise.resolve(proposal);
  }
}


const baseUriPath = '/p';

function uri(tail) {
  return baseUriPath + tail;
}

function gotoBaseView(req, res) {
  res.redirect(baseUriPath);
}


/*
  Routes
 */

function addRoutes(router) {
  router.get('/', home);

  router.get(uri(''), listProposals);
  router.get(uri('/last'), showLastProposal);
  router.get(uri('/view'), showProposal);
  router.get(uri('/:id/view'), showProposal);
  router.get(uri('/:id/seed'), showSeed);

  router.get(uri('/new'), newProposal);
  router.post(uri(''), createProposal);
  router.get(uri('/:id/edit'), editProposal);
  router.post(uri('/:id'), updateProposal);
  router.get(uri('/:id/delete'), deleteProposal);

  router.get('/admin/proposal', adminListProposals);
}

module.exports = {
  addRoutes: addRoutes
};

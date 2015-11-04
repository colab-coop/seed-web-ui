'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const ContributionService = require('../lib/contributionService');
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

function postSeed(req, res) {
  const proposalId = req.body.pid;
  console.log(`pid: ${proposalId}, body: ${_.inspect(req.body)}`);
  let profileId = req.user ? req.user.profile._id : null;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const fullName = `${firstName} ${lastName}`;
  const seedcoop = Boolean(req.body.seedcoop);
  const data = {
    profileRef: profileId
    , proposalRef : proposalId
    , name: fullName
    , firstName: req.body.firstName
    , lastName: req.body.lastName
    , email: req.body.email
    , patron: Boolean(req.body.patron)
    , member: Boolean(req.body.member)
    , funder: Boolean(req.body.funder)
    , memberships: req.body.memberships
    , perks: req.body.perks
  };
  console.log(`postSeed: pid: ${proposalId}, data: ${_.inspect(data)}`);
//  ContributionService.save(null, data)
  Contribution.create(data)
    .then((saved) => { console.log(`saved: ${saved}`);
      gotoBaseView(req, res)})
    .catch(curriedHandleError(req, res));

}

function newProposal(req, res) {
  ProposalService.buildSectorOptions('', true)
  .then((sectorOptions) => {
      const kindOptions = Proposal.buildKindOptions(Proposal.KIND.campaign, true);
      const model = {item: {}, kindOptions: kindOptions, sectorOptions: sectorOptions};
      render(res, 'new', model);
    })
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

//todo: need to better factor duplicated new/update code
function createProposal(req, res) {

  const proposal = new Proposal({
    ownerRef: req.user.profile._id,
    title: req.body.title && req.body.title.trim(),
    summary: req.body.summary && req.body.summary.trim(),
    location: req.body.location && req.body.location.trim(),
    description: req.body.description,
    kind: req.body.kind,
    parentRef: req.body.parentRef
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
  router.get(uri('/:pid/seed'), showSeed);
  router.post(uri('/:pid/seed'), postSeed);

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

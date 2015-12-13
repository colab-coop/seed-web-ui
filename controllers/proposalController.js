'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const ContributionService = require('../lib/contributionService');
const Profile = require('../models/profile');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);
//const stripe = require('../lib/stripe').instance();
const stripeFactory = require('../lib/stripe');//.instance();


const ProposalService = require('../lib/proposalService');
const UserService = require('../lib/userService');

/*
 * Proposals
 */

const baseTemplatePath = 'proposal';

/** render a few relative to our base template path */
function render(res, view, model) {
  const viewPath = view.indexOf('/') >= 0 ? view : `${baseTemplatePath}/${view}`;
  res.render(viewPath, model);
}



function home(req, res) {
  //listProposalsView(req, res, 'home/landing', Proposal.KIND.campaign);

  const stripe = stripeFactory.systemInstance();

  const model = {};
  ProposalService.fetchOneByFilter({subType: 'seedcoop'}) // the one special seedcoop campaign
    .then((result) => {
      model.seedcoop = result;
      return Proposal.find({subType: 'featured'}).sort({'title': -1});  // the list of campaings to show on the landing page
    })
    .then((results) => {
      model.items = results;
      model.stripePublicKey = stripe.publicKey;
      res.render('home/landing', model);
    })
    .catch(curriedHandleError(req, res));
}

function seedMore(req, res) {
  const model = {};
  ProposalService.fetchOneByFilter({subType: 'seedcoop'}) // the one special seedcoop campaign
    .then((result) => {
      model.seedcoop = result;
      res.render('home/seedMore', model);
    })
    .catch(curriedHandleError(req, res));
}

function seedMoreTmp(req, res) {
  const model = {};
  ProposalService.fetchOneByFilter({subType: 'seedcoop'}) // the one special seedcoop campaign
    .then((result) => {
      model.seedcoop = result;
      res.render('home/seedMoreTmp', model);
    })
    .catch(curriedHandleError(req, res));
}


function listProposals(req, res) {
  listProposalsView(req, res, 'list', Proposal.KIND.campaign);
}

function listProposalItems(req, res) {
  listProposalsView(req, res, 'items', Proposal.KIND.campaign);
}

function adminListProposals(req, res) {
  listProposalsView(req, res, 'adminList');
}


function listProposalsView(req, res, view, kind, sort) {
  console.log("VIEW:" + view);
  const parent = req.query.parent;
  const model={};
  const filter={};
  const skip = parseInt(req.query.skip);
  const count = parseInt(req.query.count) || 10;
  const sortCriteria = sort || {'createdAt': -1};
  console.log(`count: ${count}`);

  ProposalService.buildSectorOptions(parent, true, 'Choose a sector')
    .then((options) => {
      model.visionSectorOptions = options;
      //todo: avoid redundant query and also important to cache
      ProposalService.buildSectorOptions(parent, true, 'All')
    })
    .then((options) => {
      model.sectorOptions = options;
      if (kind) {
        filter.kind = kind;
      }
      if (!!parent) {
        filter.parentRef = parent;
      }
      return count == 0
        ? Promise.resolve([])
        : Proposal.find(filter, null, {skip: skip, limit: count}).sort(sortCriteria).populate('parentRef profileRef');  // TODO: confirm if this cascades and if we need to worry about circular refs
    })
    .then((items) => {
      model.items = items;
      return Proposal.count(filter);
    })
    .then((total_count) => {
      if (total_count > 0 && skip + model.items.length >= total_count) {
        model.items[model.items.length - 1].isLast = true;
      }
      render(res, view, model);
    })
    .catch(curriedHandleError(req, res));
}


function showLastProposal(req, res) {
  const id = req.session.currentProposalId;
  if (id) {
    showProposalForId(req, res, 'proposal/view', id);
  } else {
    home(req, res);
  }
}

function showProposal(req, res) {
  const id = req.param('id');
  showProposalForId(req, res, 'proposal/view', id);
}

function showMore(req, res) {
  const id = req.param('id');
  showProposalForId(req, res, 'home/more', id);
}

function showProposalForId(req, res, viewPath, id) {
  req.session.currentProposalId = id;  //save this for return flows


  const model = {wrap: req.query.wrap};
  model.profile = req.user ? req.user.profile : {};
  let proposal;
  ProposalService.fetch(id)
    .then((proposal) => {
      model.proposal = proposal;
      const template = proposal.viewTemplate ? proposal.viewTemplate : 'default';
      model.template = template;
      model.templatePath = `home/campaign/${template}`;
      res.render(viewPath, model);
    })
    .catch( curriedHandleError(req, res) );
}


function adminShowProposal(req, res) {
  const id = req.param('id');
  showProposalForId(req, res, 'proposal/adminView', id);
  //
  //req.session.currentProposalId = id;  //save this for return flows
  //ProposalService.fetch(id)
  //  .then((proposal) => render(res, 'adminView', {proposal: proposal}) )
  //  .catch( curriedHandleError(req, res) );
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
      item.beforeEdit();
      return ProposalService.buildSectorOptions(item.parentRef, true);
    }).then((sectorOptions) => {
      const kindOptions = Proposal.buildKindOptions(item.kind, true);
      item = Object.assign(item, {imageSrc: item.imageSrc()});
      const model = {item: item, kindOptions: kindOptions, sectorOptions: sectorOptions};
      render(res, 'edit', model);
    })
    .catch(curriedHandleError(req, res));
}

//todo: need to better factor duplicated new/update code
function createProposal(req, res) {

  //const proposal = new Proposal({
  //  ownerRef: req.user.profile._id,
  //  title: req.body.title && req.body.title.trim(),
  //  summary: req.body.summary && req.body.summary.trim(),
  //  location: req.body.location && req.body.location.trim(),
  //  description: req.body.description,
  //  kind: req.body.kind,
  //  patronEnabled: req.body.patronEnabled,
  //  memberEnabled: req.body.memberEnabled,
  //  funderEnabled: req.body.funderEnabled,
  //  parentRef: req.body.parentRef
  //});
  const proposal = new Proposal({ownerRef: req.user.profile._id});
  proposal.assignParams(req.body);
  console.log(`new prop: ${_.inspect(proposal)}`);

  handleAttachement(req, proposal)
    .then((proposal) => proposal.save())
    .then(() => gotoBaseView(req, res))
    .catch(curriedHandleError(req, res));
}

function updateProposal(req, res) {
  const id = req.params.id;
  console.log(`updateproposal - id: ${id}`);
  console.log(`req.body: ${_.inspect(req.body)}`);
  const kind = req.body.kind;
  const parentRef = req.body.parentRef;
  const data = Proposal.copyParams(null, req.body);
  //  kind: kind,
  //  parentRef: parentRef,
  //  title: req.body.title && req.body.title.trim(),
  //  summary: req.body.summary && req.body.summary.trim(),
  //  location: req.body.location && req.body.location.trim(),
  //  description: req.body.description,
  //  patronEnabled: req.body.patronEnabled,
  //  memberEnabled: req.body.memberEnabled,
  //  funderEnabled: req.body.funderEnabled
  //};
  console.log(`proposal data: ${_.inspect(data)}`);
  console.log(`kind: [${kind}]`);
  ProposalService.fetchLite(id)
    .then((proposal) => handleAttachement(req, proposal))
    .then((proposal) => proposal.update(data).exec())
    .then(() => { gotoBaseAdminView(req, res) })
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

function newVision(req, res) {
  const proposal = new Proposal({ownerRef: req.user.profile._id});
  proposal.assignParams(req.body);
  const role = req.body.role;
  proposal.summary = `role: ${role}`;
  console.log(`new prop: ${_.inspect(proposal)}`);

  proposal.save()
    .then(() => gotoBaseView(req, res))
    .catch(curriedHandleError(req, res));
}


function apiProposalStatus(req, res) {
  let apiData;
  try {
    console.log(`apiProposalStatus - params: ${_.inspect(req.params)}, query: ${_.inspect(req.query)}`);
    const proposalId = req.params.proposalId;
    apiData = {
      apiKey: req.query.apiKey
      , callback: req.query.callback
    };
    const response = {};
//    fetchProposalStatus(proposalId)
    ProposalService.campaignStatus(proposalId)
      .then((result) => {
        console.log(`fetched campaignStatus result: ${_.inspect(result)}`);
        response.result = result;
        helpers.renderApiResponse(res, apiData, response);
      })
      .catch((err) => {
        console.log(`campaignStatus error: ${err}, stack: ${err.stack}`);
        response.error = {message: err.toString(), stack: err.stack};
        helpers.renderApiResponse(res, apiData, response);
      });
  } catch (err) {
    console.log(`error: ${err}, stack: ${err.stack}`);
    const error = {message: err.toString(), stack: err.stack};
    helpers.renderApiResponse(res, apiData, {error: error});
  }
}

//Cache = require('promise-cache').create()
//
//function cacheableProposalStatus(proposalId) {
//  return Cache.remember(proposalId, 60, function(store) {
//    console.log(`refreshing cached proposal status`);
//    fetchProposalStatus(proposalId).
//      then((result) => {
//        console.log(`fetched status: ${_.inspect(result)}`);
//        store(result);
//      })
//  });
//}


//const cacheManager = require('cache-manager');
//const memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 60/*seconds*/});
//
//function cacheableProposalStatus(proposalId) {
//
//  const ttl = 60;
//  return new Promise( (resolve, reject) => {
//
//    memoryCache.wrap(proposalId, function(cacheCallback) {
//      console.log(`refreshing cached proposal status`);
//      fetchProposalStatus(proposalId)
//        .then((result) => {
//          cacheCallback(null, result);
//        })
//        .catch((err) => {
//          cacheCallback(err, null);
//        })
//    }, {ttl: 15}, function(err, result) {
//      if (err) {
//        reject(err);
//      } else {
//        resolve(result)
//      }
//    });
//  });
//
//}
//
//function clearProposalStatusCache(proposalId) {
//
//  return new Promise( (resolve, reject) => {
//
//    memoryCache.del(proposalId, function(err, result) {
//      if (err) {
//        reject(err);
//      } else {
//        resolve(result)
//      }
//    });
//  });
//
//}
//
//function fetchProposalStatus(proposalId) {
//  return ProposalService.fetch(proposalId)
//    .then((result) => {
//      console.log(`fetchProposalStatus raw data: ${_.inspect(result)}`);
//      const percent = result.goalAmount ? Math.round(100 * result.supporterCount / result.goalAmount) : -1;
//      const data = {
//        paidTotal: result.paidCapitalTotal
//        , supporterCount: result.supporterCount
//        , goalCount: result.goalAmount
//        , closingDate: result.closingDate
//        , pledgerCount: result.pledgerCount
//        , percent: percent
//      };
//      console.log(`result data: ${_.inspect(data)}`);
//      return data;
//    })
//}

const baseUriPath = '/p';

function uri(tail) {
  return baseUriPath + tail;
}

function gotoBaseView(req, res) {
  res.redirect('/');
}

function gotoBaseAdminView(req, res) {
  res.redirect('/admin/proposal?count=99');  //until admin view is better split apart
}

/*
  Routes
 */

function addRoutes(router) {
  router.get('/', home);

  //router.get(uri(''), listProposals);
  //router.get(uri('/items'), listProposalItems);
  //router.get(uri('/last'), showLastProposal);
  //router.get(uri('/view'), showProposal);

  router.get(uri('/:id/more'), showMore);
  router.get('/seedMore', seedMore);
  router.get('/seedMoreTmp', seedMoreTmp);

  //router.get(uri('/:id/view'), showProposal);

  router.post(uri('/newVision'), newVision);

  router.get(uri('/new'), newProposal);
  router.post(uri(''), createProposal);
  router.get(uri('/:id/edit'), editProposal);
  router.post(uri('/:id'), updateProposal);
  router.get(uri('/:id/delete'), deleteProposal);

  router.get('/admin/proposal', adminListProposals);
  router.get(uri('/:id/adminView'), adminShowProposal);

  router.get('/api/v1/campaign/:proposalId/status', apiProposalStatus);
  router.get('/api/v1/proposal/:proposalId/status', apiProposalStatus);

}

module.exports = {
  addRoutes: addRoutes
};

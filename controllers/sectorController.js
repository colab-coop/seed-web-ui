'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Proposal = require('../models/proposal');
const ProposalService = require('../lib/proposalService');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);




/*
 * management of 'sectors' which are handled internally as a classification of Proposal
 */

const baseTemplatePath = 'sector';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);
}

function list(req, res) {
  ProposalService.listSectors()
    .then((items) => render(res, 'list', {items: items}) )
    .catch( curriedHandleError(req, res) );
}

function show(req, res) {
  const id = req.param('id');
  console.log(`show sector - id: ${id}`);
  ProposalService.fetch(id)
    .then((proposal) => render(res, 'view', {item: proposal}) )
    .catch( curriedHandleError(req, res) );
}


function newItem(req, res) {
  render(res, 'new', {item: {}});
}

function edit(req, res) {
  const id = req.params.id;
  if ('new' === id) {
    render(res, 'edit', {item: {}});
  } else {
    Proposal.findOne({_id: id}).exec()
      .then((item) => render(res, 'edit', {item: item}) )
      .catch(curriedHandleError(req, res));
  }
}

function save(req, res) {
  const id = req.body.id;
  const title = req.body.title && req.body.title.trim();
  const summary = req.body.summary && req.body.summary.trim();
  const description = req.body.description;
  const ownerRef = req.user.profile._id;

  const data = {
    title: title,
    summary: summary,
    description: description
  };

  ProposalService.fetchLite(id)
    .then((proposal) => {
      if (proposal) {
        return proposal.update(data).exec();
      } else {
        if (!!id) {
          throw new Error(`proposal not found for id: [${id}]`);
        } else {
          data.kind = Proposal.KIND.sector;
          data.ownerRef = ownerRef;
          return Proposal.create(data);
        }
      }
    })
    .then(() => gotoBaseView(res) )
    .catch(curriedHandleError(req, res));
}

function deleteItem(req, res) {
  const id = req.param('id');
  ProposalService.remove(id)
    .then(() => gotoBaseView(res) )
    .catch( curriedHandleError(req, res) );
}


/*
  Routes
 */

const baseUriPath = '/admin/sector';

function uri(tail) {
  return baseUriPath + tail;
}

function gotoBaseView(res) {
  res.redirect(baseUriPath);
}

function addRoutes(router) {
  router.get(uri(''), list);
  router.get(uri('/:id/view'), show);

  router.get(uri('/new'), newItem);
  //router.post(uri(''), create);
  router.get(uri('/:id/edit'), edit);
  router.post(uri('/save'), save);
}

module.exports = {
  addRoutes: addRoutes
};

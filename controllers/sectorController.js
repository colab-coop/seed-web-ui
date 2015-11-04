'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Proposal = require('../models/proposal');
var ProposalService = require('../lib/proposalService');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var helpers = require('../lib/helpers');
var curriedHandleError = _.curry(helpers.handleError);




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
    .then(function (items) {
      var model = {
        items: items
      };
      render(res, 'list', model);
    })
    .catch( curriedHandleError(req, res) );
}

function show(req, res) {
  const id = req.param('id');
  console.log(`show sector - id: ${id}`);
  ProposalService.fetch(id)
    .then(function(proposal) {
      const model = {item: proposal};
      render(res, 'view', model);
    })
    .catch( curriedHandleError(req, res) );
}


function newItem(req, res) {
  var model = {item: new Proposal()};
  res.render('sector/new', model);
}

function edit(req, res) {
  const id = req.params.id;
  if ('new' === id) {
    render(res, 'edit', {item: {}});
  } else {
    Proposal.findOne({_id: id}).exec()
      .then((item) => {
        var model = {item: item};
        render(res, 'edit', model);
      })
      .catch(curriedHandleError(req, res));
  }
}

//function create(req, res) {
//  const ownerRef = req.user.profile._id;
//  const title = req.body.title && req.body.title.trim();
//  const summary = req.body.summary && req.body.summary.trim();
//  const description = req.body.description;
//
//  const proposal = new Proposal({
//    type: Proposal.type.Sector
//    , ownerRef: ownerRef
//    , title: title
//    , summary: summary
//    , description: description
//  });
//
//  proposal.proposal.save()
//    .then(() => gotoListView(res))
//    .catch(curriedHandleError(req, res));
//}

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

  Proposal.findOne({_id: id}).exec()
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
    .then(() => {
      gotoListView(res);
    })
    .catch(curriedHandleError(req, res));
}

  //console.log(`id: [${id}], !!id:[${!!id}], ${_.inspect(id)}`);
  //if (!!id) { // update existing record
  //  Proposal.findOne({_id: id}).exec()
  //    .then((proposal) => proposal.update(data).exec() && proposal)
  //    .then((proposal) => {
  //      gotoListView(res);
  //    })
  //    .catch(curriedHandleError(req, res));
  //} else { // create new record
  //  Proposal.findOne({_id: id}).exec()
  //    .then((proposal) => proposal.update({
  //      title: title,
  //      summary: summary,
  //      description: description
  //    }).exec() && proposal)
  //    .then((proposal) => {
  //      gotoListView(res);
  //    })
  //    .catch(curriedHandleError(req, res));

function deleteItem(req, res) {
  const id = req.param('id');
  Proposal.remove({_id: id}).exec()
    .then(function () {
      gotoListView(res);
    })
    .catch( curriedHandleError(req, res) );
}


/*
  Routes
 */

const baseUriPath = '/admin/sector';

function uri(tail) {
  return baseUriPath + tail;
}

function gotoListView(res) {
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

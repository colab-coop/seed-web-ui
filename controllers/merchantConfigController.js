'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Model = require('../models/merchantConfig');
const ModelService = require('../lib/merchantConfigService');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);



/*
 * management of 'sectors' which are handled internally as a classification of Proposal
 */

const baseTemplatePath = 'merchant';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);

}

function list(req, res) {
  //const pid = req.query.pid;
  //ModelService.list({proposalRef: proposalId})
  ModelService.list()
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
  ModelService.fetch(id)
    .then(function(item) {
      const model = {item: item};
      render(res, 'view', model);
    })
    .catch( curriedHandleError(req, res) );
}


function edit(req, res) {
  const id = req.params.id;
  console.log(`offer edit id: ${id} `);
  if (id === 'new') {
    render(res, 'edit', {item: {}});
  } else {
    ModelService.fetch(id)
      .then((item) => {
        const model = {item: item};
        render(res, 'edit', model);
      })
      .catch(curriedHandleError(req, res));
  }
}

function save(req, res) {
  const id = req.body.id;
  const data = Model.copyParams(null, req.body);
  console.log(`save id: ${id}, data: ${_.inspect(data)}`);
  ModelService.save(id, data)
    .then((saved) => {
      console.log(`saved: ${saved}`);
      gotoBaseView(req, res);
    })
    .catch(curriedHandleError(req, res));
}


function deleteItem(req, res) {
  const id = req.param('id');
  Model.remove({_id: id}).exec()
    .then(function () {
      gotoBaseView(req, res);
    })
    .catch( curriedHandleError(req, res) );
}


/*
  Routes
 */

const baseUriPath = '/admin/mc';

function uri(tail) {
  return baseUriPath + tail;
}

/** returns to last viewed proposal, or falls back to proposal index view */
function gotoBaseView(req, res) {
  res.redirect(baseUriPath);
}

function addRoutes(router) {
  router.get(uri(''), list);
  router.get(uri('/index'), list);
  router.get(uri('/:id/view'), show);

  router.get(uri('/:id/edit'), edit);
  router.get(uri('/:id/delete'), deleteItem);
  router.post(uri('/save'), save);
}

module.exports = {
  addRoutes: addRoutes
};

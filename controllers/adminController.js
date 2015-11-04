'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const Proposal = require('../models/proposal');
const Vote = require('../models/vote');
const Contribution = require('../models/contribution');
const helpers = require('../lib/helpers');
const curriedHandleError = _.curry(helpers.handleError);



/*
 *
 */

const baseTemplatePath = 'admin';

/** render a few relative to our base template path */
function render(res, view, model) {
  res.render(`${baseTemplatePath}/${view}`, model);

}


function home(req, res) {
  render(res, 'index', {});
}

/*
  Routes
 */

const baseUriPath = '/admin';

function uri(tail) {
  return baseUriPath + tail;
}

function gotoHome(res) {
  res.redirect(baseUriPath);
}

function addRoutes(router) {
  router.get(uri(''), home);
}

module.exports = {
  addRoutes: addRoutes
};

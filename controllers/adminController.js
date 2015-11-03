'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var helpers = require('../lib/helpers');
var curriedHandleError = _.curry(helpers.handleError);




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

'use strict';

/**
 * proposal.js
 *
 * @description :: represents either produce/service sector proposal, a specific enterprise, other kind of fund raising campaign
 */

var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var baseModel = require('./baseModel');
var crate = require('mongoose-crate');
var LocalFS = require('mongoose-crate-localfs');
var appRoot = require('app-root-path');
var helpers = require('../lib/helpers');

var attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , kind: String // campaign, sector, proposal
  , parentRef: {type: String, ref: 'Proposal'} // used for sector associations or child proposals
  , title: String
  , summary: String
  , location: String
  , description: String
}, baseModel.baseAttributes);

var KIND = {
  campaign: 'campaign'
  , sector: 'sector'
  , proposal: 'proposal'};

//todo figure out best way to handle select rendering
var KIND_OPTIONS = [
  {value:'campaign', display:'Campaign'}
  , {value:'sector', display:'Sector'}
  , {value:'proposal', display:'Proposal'}
];

function buildKindOptions(selectedValue, includeNone, noneDisplayArg) {
  //could probably do some clever currying here
  return helpers.buildOptionsFromList(KIND_OPTIONS, 'value', 'display', selectedValue, includeNone, noneDisplayArg);
}


var modelFactory = function () {

  var schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Proposal[' + this._id + ', title: ' + this.title + ']';
  };

  schema.methods.attachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
      _this.attach('image', {path: path}, (err) => {
        if (err !== undefined) {
          reject(err);
        }
        else {
          _this.save().then(() => resolve(_this));
        }
      });
    });
  };

  schema.methods.detachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
      _this.image = null;
      _this.save().then(() => resolve(_this));
    });
  };



  schema.plugin(crate, {
    storage: new LocalFS({
      // TODO: get the upload folder from config
      directory: appRoot.resolve('/u')
    }),
    fields: {
      image: {}
    }
  });


  var model = mongoose.model('Proposal', schema);
  model.KIND = KIND;
  model.KIND_OPTIONS = KIND_OPTIONS;
  model.buildKindOptions = buildKindOptions;

  return model;

};

module.exports = new modelFactory();

'use strict';

/**
 * proposal.js
 *
 * @description :: represents either produce/service sector proposal, a specific enterprise, other kind of fund raising campaign
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.Promise = Promise;
const baseModel = require('./baseModel');
const crate = require('mongoose-crate');
const LocalFS = require('mongoose-crate-localfs');
const appRoot = require('app-root-path');
const helpers = require('../lib/helpers');

const attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , kind: String // campaign, sector, proposal
  , parentRef: {type: String, ref: 'Proposal'} // used for sector associations or child proposals
  , title: String
  , summary: String
  , location: String
  , description: String
}, baseModel.baseAttributes);

const KIND = {
  campaign: 'campaign'
  , sector: 'sector'
  , proposal: 'proposal'};

//todo figure out best way to handle select rendering
const KIND_OPTIONS = [
  {value:'campaign', display:'Campaign'}
  , {value:'sector', display:'Sector'}
  , {value:'proposal', display:'Proposal'}
];

function buildKindOptions(selectedValue, includeNone, noneDisplayArg) {
  //could probably do some clever currying here
  return helpers.buildOptionsFromList(KIND_OPTIONS, 'value', 'display', selectedValue, includeNone, noneDisplayArg);
}


const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

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

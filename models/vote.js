'use strict';

/**
 * vote.js
 *
 * @description :: votes or pledges of support for a given proposal or campaign
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');

const attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , proposalRef: {type: String, ref: 'Proposal'}
  , voteRank: Number
  , anticipatedCapital: Number
  , anticipatedPatronage: Number
  , workerInterest: String
}, baseModel.baseAttributes);

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toSTring = function () {
    return 'Vote[' + this._id + ', voteRank: ' + this.voteRank + ']';
  };

  return mongoose.model('Vote', schema);

};

module.exports = new modelFactory();

'use strict';

/**
 * contribution.js
 *
 * @description :: includes pledges, monetary and non-monetary support given. owned by Campaign, references Profile.
 * can be one-time or recurring. (should this also capture a supporters membership status?)
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');

const attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , proposalRef: {type: String, ref: 'Proposal'}
  , description: String
  , pledgedCapital: Number
  , pledgedPatronage: Number
  , paidCapital: Number
  , paidPatronage: Number
}, baseModel.baseAttributes);

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Contribution[' + this._id + ', amount: ' + this.amount + ']';
  };

  return mongoose.model('Contribution', schema);

};

module.exports = new modelFactory();

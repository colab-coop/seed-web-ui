'use strict';

/**
 * transaction.js
 *
 * @description :: details specific to financial transactions. owned by Contribution
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');

const attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , contributionRef: {type: String, ref: 'Contribution'}
  , date: Date
  , amount: Number  //better fixed precision data type?
}, baseModel.baseAttributes);

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Transaction[' + this._id + ', amount: ' + this.amount + ']';
  };

  return mongoose.model('Transaction', schema);

};

module.exports = new modelFactory();

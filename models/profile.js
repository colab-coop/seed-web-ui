'use strict';

/**
 * profile.js
 *
 * @description ::  public profile information, could be individual or organization. represents both entities benefiting
 * from the campaign as well as supporters (in fact same entity can be both).  will eventually probably need a
 * UserProfileRelation model capturing role and access levels
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');

const MEMBERSHIP_TYPES = {
  provisional: 'provisional'
  , full: 'full'
};

const attributes = _.merge({
  name: String
  , firstName: String  //todo: migrate to separate first/last names
  , lastName: String
  , email: String
  , phone: String
  , address: String
  , location: String  // publicly shared
  , about: String
  , taxId: String
  , memberType: String  //provisional, paid, other classes?
  , membershipPayments: Number
}, baseModel.baseAttributes);

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Profile[' + this._id + ', name: ' + this.name + ']';
  };

  const model = mongoose.model('Profile', schema);
  model.MEMBERSHIP_TYPES = MEMBERSHIP_TYPES;
  return model;

};

module.exports = new modelFactory();

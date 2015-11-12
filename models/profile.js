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
  visitor: 'visitor'  // automatic user/profile creation when support form submitted
  , provisional: 'provisional'
//  , sustainer: 'sustainer'
  , full: 'full'
};

const attributes = _.merge({
  name: String //todo: deprecated, migrating usage to displayName
  , firstName: String
  , lastName: String
  , orgName: String
  , displayName: { type: String, required: true }  // either org name or 'first last'
  , email: { type: String, required: true }
  , phone: String
  , address: String
  , location: String  // publicly shared
  , about: String
  , imageUrl: String
  , taxId: String
  , memberType: String  //provisional, paid, other classes?
  , membershipPayments: Number
  , stripeCustomerId: String  // represents stored credit card info
}, baseModel.baseAttributes);

const isBlank = (val) => (!val || val === '');

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.pre('validate', function (next) {
    //if ((isBlank(this.firstName) || isBlank(this.lastName)) && isBlank(this.orgName)) {
    // note, for now, we're going back to just needing a display name
    if (false && isBlank(this.firstName) && isBlank(this.orgName)) {
      const err = new Error('First and last name or org name is required');
      err.type = 'validation';
      next(err);
    } else {
      next();
    }
  });

  schema.methods.toString = function () {
    return 'Profile[' + this._id + ', name: ' + this.name + ']';
  };

  const model = mongoose.model('Profile', schema);
  model.MEMBERSHIP_TYPES = MEMBERSHIP_TYPES;
  return model;

};

module.exports = new modelFactory();

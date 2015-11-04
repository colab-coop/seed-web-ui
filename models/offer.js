'use strict';

/**
 * offer.js
 *
 * todo: consider embeddeing this inside the Proposal object
 *
 * @description :: describes memberships or perks offered for a campaign in exchange for financial contributions
 */

var _ = require('lodash');
var mongoose = require('mongoose');
var baseModel = require('./baseModel');

var attributes = _.merge({
  proposalRef: {type: String, ref: 'Proposal'}  // expected to be a campaign
  , kind: String   // the type of offer, i.e. membership, perk
  , title: String
  , description: String
  //better fixed precision data type?
  , minimumContributionAmount: Number
  , limit: Number  // total units offered, (if blank, then unlimited)
  , taken: Number  // number of units taken so far
  , isRegulated: Boolean  // indicated this offer has restrictions
  , supporterCriteria: mongoose.Schema.Types.Mixed  // attributes hash
}, baseModel.baseAttributes);

var KIND = {
  membership: 'membership'
  , perk: 'perk'
};

var modelFactory = function () {

  var schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Offer[' + this._id + ', title: ' + this.title + ']';
  };

  return mongoose.model('Offer', schema);

};

module.exports = new modelFactory();

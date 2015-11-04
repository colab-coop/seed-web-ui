'use strict';

/**
 * offer.js
 *
 * todo: consider embeddeing this inside the Proposal object
 *
 * @description :: describes memberships or perks offered for a campaign in exchange for financial contributions
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');
const helpers = require('../lib/helpers');

var attributes = _.merge({
  proposalRef: {type: String, ref: 'Proposal'}  // expected to be a campaign
  , kind: String   // the type of offer, i.e. membership, perk
  , title: String
  , description: String
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

const KIND_VALUES = [KIND.membership, KIND.perk];

function buildKindOptions(selectedValue, includeNone, noneDisplayArg) {
  //could probably do some clever currying here
  return helpers.buildOptionsFromList(KIND_VALUES, null, null, selectedValue, includeNone, noneDisplayArg);
}

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Offer[' + this._id + ', title: ' + this.title + ']';
  };

  const model = mongoose.model('Offer', schema);
  model.KIND = KIND;
  model.buildKindOptions = buildKindOptions;
  return model;

};

module.exports = new modelFactory();

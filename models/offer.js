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
  , contributionInterval: String  // used for subscription / periodic membership fees, 'monthly', 'yearly'
  , limit: Number  // total units offered, (if blank, then unlimited)
  , taken:  { type: Number, default: 0 }  // number of units taken so far
  , isRegulated: Boolean  // indicated this offer has restrictions
  , supporterCriteria: mongoose.Schema.Types.Mixed  // attributes hash
}, baseModel.baseAttributes);

var KIND = {
  prepay: 'prepay'    // gift cards or other prepayments / discount offers from established businesses
  , membership: 'membership'  // coop membership levels
  , perk: 'perk'      // funding 'perks' offered in exchange for non-redeemable contributions
};

const KIND_VALUES = [KIND.prepay, KIND.membership, KIND.perk];

function buildKindOptions(selectedValue, includeNone, noneDisplayArg) {
  //could probably do some clever currying here
  return helpers.buildOptionsFromList(KIND_VALUES, null, null, selectedValue, includeNone, noneDisplayArg);
}

// fields to directly populate from edit forms
const STRING_PARAM_FIELDS = [
  'kind', 'title', 'description', 'contributionInterval' // 'minimumContributionAmount',
  , 'limit', 'taken', 'isRegulated'
];

function copyParams(target, params) {
  const result = target || {};
  _.assign(result, _.pick(params, STRING_PARAM_FIELDS));
  _.assignNumericParam(result, params, 'minimumContributionAmount');
  //result.isRegulated = Boolean.parse(params.isRegulated);
  return result;
}


const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Offer[' + this._id + ', title: ' + this.title + ']';
  };

  const model = mongoose.model('Offer', schema);
  model.KIND = KIND;
  model.buildKindOptions = buildKindOptions;
  model.copyParams = copyParams;
  return model;

};

module.exports = new modelFactory();

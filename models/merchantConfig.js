'use strict';

/**
 * merchantConfig.js
 *
 * represents ways to receive payments, including gateway credentials.  maybe different per campaign
 *
 * @description :: describes memberships or perks offered for a campaign in exchange for financial contributions
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const baseModel = require('./baseModel');
const helpers = require('../lib/helpers');

var attributes = _.merge({
  name: String // business name for admin display
  , dwollaEnabled: Boolean
  , dwollaDataKey: String
  , paperCheckEnabled: String
  , paperCheckInfo: String
  , stripeEnabled: Boolean
  , stripePublicKey: String
  , stripeSecretKey: String
  , braintreeEnabled: Boolean
  , braintreeMerchantId: String
  , braintreePublicKey: String
  , braintreePrivateKey: String  // keep this secure
  , authorizeNetEnabled: String
  , authorizeNetApiLoginId: String
  , authoirzeNetTransactionKey: String // keep this secure
}, baseModel.baseAttributes);

// fields to directly populate from edit forms
const PARAM_FIELDS = [
  'name', 'dwollaEnabled', 'dwollaDataKey', 'paperCheckEnabled', 'paperCheckInfo',
  'braintreeEnabled', 'braintreeMerchantId', 'braintreePublicKey',
  'authorizeNetEnabled', 'authorizeNetApiLoginId', 'stripeEnabled', 'stripePublicKey', 'stripeSecretKey'
];

function copyParams(target, params) {
  const result = target || {};
  console.log(`params: ${_.inspect(params)}`);
  console.log(`picked: ${_.inspect( _.pick(params, PARAM_FIELDS) )}`);
  _.assign(result, _.pick(params, PARAM_FIELDS));
  // todo: make this generic from xxx_present form fields
  result.dwollaEnabled = Boolean.parse(params.dwollaEnabled);
  result.paperCheckEnabled = Boolean.parse(params.paperCheckEnabled);
  result.braintreeEnabled = Boolean.parse(params.braintreeEnabled);
  result.authorizeNetEnabled = Boolean.parse(params.authorizeNetEnabled);
  return result;
}



const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Offer[' + this._id + ', title: ' + this.title + ']';
  };

  const model = mongoose.model('MerchantConfig', schema);
  model.copyParams = copyParams;
  return model;

};

module.exports = new modelFactory();

'use strict';

/**
 * binbase.js
 *
 * @description :: credit card 6 digit prefix (bin) database
 * licensed from http://binbase.com
 */

const _ = require('lodash');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
//var baseModel = require('./baseModel');
const BinbaseOrg = require('../models/binbaseOrg');  // need to make sure related models have been loaded for populate() fetches to work


var attributes = {
  bin: String  // i.e. 447707
  , cardBrand: String  // i.e. VISA
  , issuingOrg: String  // i.e. ARTISANS' BANK
  , cardType: String    // i.e. DEBIT, CREDIT, CHARGE CARD
  , cardCategory: String  // i.e. CLASSIC, GOLD
  , countryIso: String   // i.e. US
  , orgWebsite: String  // i.e. HTTP://WWW.ARTISANSBANK.COM
  , orgPhone: String   // i.e. 302-658-6881
  , orgRef: {type: String, ref: 'BinbaseOrg'} //todo: migrate this to: type: Schema.Types.ObjectId
  , isRegulated: Boolean  //remove this once ref population fixed
};

const modelFactory = function () {

  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Binbase[' + this.bin + ', org: ' + this.issuingOrg + ', type: ' + this.cardType + ', category: ' + this.cardCategory + ']';
  };

  return mongoose.model('Binbase', schema);

};

module.exports = new modelFactory();

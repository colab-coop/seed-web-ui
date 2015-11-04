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

const attributes = {
  name: String  // i.e. 447707
  , countryIso: String   // i.e. US
  , website: String  // i.e. HTTP://WWW.ARTISANSBANK.COM
  , phone: String   // i.e. 302-658-6881
  , isRegulated: Boolean  // true if bank with > $10b in assets
};

const modelFactory = function () {

  var schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'BinbaseOrg[' + this.name + ']';
  };

  return mongoose.model('BinbaseOrg', schema);

};

module.exports = new modelFactory();

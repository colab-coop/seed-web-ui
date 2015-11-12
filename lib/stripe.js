'use strict';

var _ = require('lodash');

var theStripe;
var theConfig;

function configure(config) {
  theConfig = config;
  var secretKey = config.secretKey;
  theStripe = require("stripe")(secretKey);
  theStripe.config = theConfig;
  //console.log('theStripe: ' + _.inspect(theStripe));
}

function instance() {
  return theStripe;
}

function config() {
  return theConfig;
}

module.exports = {
  configure: configure
  , instance: instance
  , config: config
};


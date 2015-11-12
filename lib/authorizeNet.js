'use strict';

var _ = require('lodash');

var theService;
var theConfig;


function configure(config) {
  theConfig = config;
  console.log('authorizeNet: ' + _.inspect(config));  //todo: remove or redact the sensative keys

  if (config.apiLoginId) {
    theService = require('node-authorize-net')(config.apiLoginId, config.transactionKey);
  }
}

function instance() {
  return theService;
}

function config() {
  return theConfig;
}


module.exports = {
  configure: configure
  , instance: instance
  , config: config
};



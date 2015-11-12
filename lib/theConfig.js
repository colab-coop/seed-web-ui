'use strict';

const _ = require('lodash');

// globally accessible config data

let theConfig;

function configure(config) {
  theConfig = config;
//console.log(`the config: ${theConfig}`);
}

function get(key) {
  if (key) {
    console.log(`key: ${key}, theConfig: ${_.inspect(theConfig)}`);
    return theConfig.get(key);
  } else {
    return theConfig;
  }
}


module.exports = {
  configure: configure
  , get: get
};

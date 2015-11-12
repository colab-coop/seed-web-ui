/***
 * Module to hold the kraken config object
 */

'use strict';

let config = null;
module.exports = {
  init: function (krakenConfig) {
    config = krakenConfig;
  },

  get: function(key) {
    return config.get(key)
  }
};

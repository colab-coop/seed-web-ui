'use strict';

/**
 * proposal.js
 *
 * @description :: represents either produce/sesrvice sector proposal, a specific enterprise, other kind of fund raising campaign
 */

var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var baseModel = require('./baseModel');
var crate = require('mongoose-crate');
var LocalFS = require('mongoose-crate-localfs');
var appRoot = require('app-root-path');

var attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'},
  title: String,
  summary: String,
  location: String,
  description: String
}, baseModel.baseAttributes);

var modelFactory = function () {

  var schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Proposal[' + this._id + ', title: ' + this.title + ']';
  };

  schema.methods.attachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
        _this.attach('image', {path: path}, (err) => {
          if (err !== undefined) {
            reject(err);
          }
          else {
            _this.save().then(() => resolve(_this));
          }
        });
    });
  };

  schema.methods.detachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
        _this.image = null;
        _this.save().then(() => resolve(_this));
    });
  };

  schema.plugin(crate, {
    storage: new LocalFS({
      // TODO: get the upload folder from config
      directory: appRoot.resolve('/u')
    }),
    fields: {
      image: {}
    }
  });


  return mongoose.model('Proposal', schema);

};

module.exports = new modelFactory();

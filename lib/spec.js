'use strict';
var express = require('express');
var db = require('../lib/database');
var passport = require('passport');
var auth = require('../lib/auth');
var userLib = require('./user');
var stripe = require('./stripe');
var braintree = require('./braintree');
var authorizeNet = require('./authorizeNet');
//paypal = require('paypal-rest-sdk'),


var _ = require('lodash');

_.mixin({
  'inspect': function(value) {
    return require('circular-json').stringify(value);
  }
});


// long stack traces, including callbacks.  note, reportedly has performance impact, so should disable for production
//require('longjohn');

module.exports = function spec(app) {
  app.on('middleware:after:session', function configPassport(eventargs) {
    //Tell passport to use our newly created local strategy for authentication
    passport.use(auth.localStrategy());
    //Give passport a way to serialize and deserialize a user. In this case, by the user's id.
    passport.serializeUser(userLib.serialize);
    passport.deserializeUser(userLib.deserialize);
    app.use(passport.initialize());
    app.use(passport.session());
  });

  return {
    onconfig: function (config, next) {
      console.log('env: ' + _.inspect(config.get('env')));
      console.log('dbconfig: ' + _.inspect(config.get('databaseConfig')));

      //configure mongodb
      require('mongoose').Promise = require('bluebird');
      db.config(config.get('databaseConfig'));

      // configure supported credit card gateways
      stripe.configure(config.get('stripe'));
      braintree.configure(config.get('braintree'));
      authorizeNet.configure(config.get('authorizeNet'));
      //paypal.configure(config.get('paypalConfig'));

      next(null, config);
    }
  };

};

'use strict';
const express = require('express');
const db = require('../lib/database');
const passport = require('passport');
const auth = require('../lib/auth');
const userLib = require('./user');
const stripe = require('./stripe');
const braintree = require('./braintree');
const authorizeNet = require('./authorizeNet');
//paypal = require('paypal-rest-sdk'),


const _ = require('lodash');

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
      console.log('os.tmpdir: ' + require('os').tmpdir());
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

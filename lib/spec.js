'use strict';
const express = require('express');
const db = require('../lib/database');
const passport = require('passport');
const auth = require('../lib/auth');
//todo: discuss if xxxLib is a more standard Node naming convention for collections of static model service methods
const userLib = require('./userService');
const mailer = require('./mailer');
const stripe = require('./stripe');
const braintree = require('./braintree');
const authorizeNet = require('./authorizeNet');
//paypal = require('paypal-rest-sdk'),

//todo: is here a better place for these random initializers?

const _ = require('lodash');

_.mixin({
  'inspect': function(value) {
    return require('circular-json').stringify(value);
  }
});

_.assignNumericParam = function(target, source, attributeName) {
  if (source[attributeName]) {
    target[attributeName] = Number(source[attributeName]);
  }
};

// couldn't get this dateformat module to work, so had to implement my own
//require('dustjs-helper-formatdate');

const dust = require('dustjs-linkedin');
const moment = require('moment');

// used for numberid formatting
var DustIntl = require('dust-intl');
DustIntl.registerWith(dust);

dust.helpers.foo = function (chunk, context, bodies, params) {
  return chunk.write("FOOBAR");
};

//override the dust-intl formatDate with ours for now, now sure how to render a mm/dd/yyyy date

dust.helpers.formatDate = function (chunk, context, bodies, params) {
  const date = dust.helpers.tap(params.date, chunk, context);
  let output;
  if (!date) {
    output = '';
  } else {
    let parsedDate = new Date(date);
    if (parsedDate == 'Invalid Date') {  // handle either a text or numeric date value
      parsedDate = new Date(Number(date));
    }
    console.log(`parsedDate: ${_.inspect(parsedDate)}`);
    var format = dust.helpers.tap(params.format, chunk, context);
    var m = moment(parsedDate);
    output = m.format(format);
  }
  return chunk.write(output);

};

Boolean.parse = function (str) {
  if (!str) {
    return false;
  }
  switch (str.toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      return false; //throw new Error ("Boolean.parse: Cannot convert string to boolean.");
  }
};

// long stack traces, including callbacks.  note, reportedly has performance impact, so should disable for production
//require('longjohn');


module.exports = function spec(app) {

  if (app.settings.env === 'development') {
    require('dustjs-linkedin').config.whitespace = true;
  }

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

      require('./theConfig').configure(config);
      //configure mongodb
      require('mongoose').Promise = require('bluebird');
      db.config(config.get('databaseConfig'));

      mailer.configure(config.get('email'));

      // configure supported credit card gateways
      stripe.configure(config.get('stripe'));
      braintree.configure(config.get('braintree'));
      authorizeNet.configure(config.get('authorizeNet'));
      //paypal.configure(config.get('paypalConfig'));

      next(null, config);


    }

  };

};

'use strict';

var _ = require('lodash');
var mongoose = require("mongoose");
var nodemailer = require('nodemailer');
var User = require('../models/user');
var Profile = require('../models/profile');

var theConfig;

function configure(config) {
  theConfig = config;
}

function serialize(user, done) {
  done(null, user._id);
}

function deserialize(id, done) {
  console.log('lib/user.deserialize - id: ' + id);
  //User.findOne({
  //  _id: id
  //}, function (err, user) {
  //  done(null, user);
  //});

  var foundUser;
  User.findOne({ _id: id}).populate('defaultProfileRef').exec()
    .then(function(user) {
      console.log('foundUser: ' + _.inspect(user));
      console.log('u.defprof: ' + user.defaultProfileRef);
      user.profile = user.defaultProfileRef;
      console.log('foundUser: ' + user + ', profile: ' + user.profile);
      done(null, user);
    })
    .catch(function(err) {
      done(err);
    });
}

function emailUser(email, name, done) {
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: theConfig.sender,
      pass: theConfig.senderPassword
    }
  });

  var email = '<h1>hey thanks</h1>';

  var mailOptions = {
    from: theConfig.sender,
    to: email,
    subject: 'Thank You, ' + name + ' for your support!',
    text: email, // plaintext body
    html: '<b>' + email + '</b>', // html body
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      // error
    } else {
      done(null, 'ok', true);
    }
  });
}

function createUser(email, password, name, done) {

      var Passwords = require('machinepack-passwords');

      // Encrypt a string using the BCrypt algorithm.
      Passwords.encryptPassword({
        password: password
        , difficulty: 10
      }).exec({
        // An unexpected error occurred.
        error: function (err) {
          done(err);
        },
        // OK.
        success: function (encryptedPassword) {
          var resultUser;
          require('machinepack-gravatar').getImageUrl({
            emailAddress: email
          }).exec({
            error: function (err) {
              done(err); //return res.negotiate(err);
            },
            success: function (gravatarUrl) {
              var profile = new Profile({
                name: name
                , email: email
                , membershipPayments: 0
                , memberType: 'provisional'   //todo: what is node convention for enums?
              });
              console.log("new profile id: " + profile._id);
              // Create a User with the params sent from
              // the sign-up form --> signup.ejs
              User.create({
                email: email
                , name: name
                , authenticationData: encryptedPassword
                , defaultProfileRef: profile._id
                //, defaultProfile: profile._id
                //lastLoggedIn: new Date(),
                //gravatarUrl: gravatarUrl
              }, function userCreated(err, newUser) {  //todo: refactor this w/ promises and better error handling
                if (err) {
                  console.log("err: ", err);
                  console.log("err.invalidAttributes: ", err.invalidAttributes);
                  // If this is a uniqueness error about the email attribute,
                  // send back an easily parseable status code.
                  if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
                    && err.invalidAttributes.email[0].rule === 'unique') {
                    done(null, 'emailAddressInUse');
                  }

                  // Otherwise, send back something reasonable as our error response.
                  return done(err);
                }
                resultUser = newUser;
//                return done(null, 'ok', newUser);
                profile.save()
                  .then(function (saved) {
                    //res.redirect('/c/' + saved._id + '/thanks');
                    done(null, 'ok', resultUser);
                  })
                  .catch(function(err) {
                    console.log('err saving profile: ' + err + '\nstack: ' + err.stack);
                    done(err);
                  })
              });
            }
          });
        }
      });
}

// todo, figure out a clever way to adapt machinepack contracts with promise flow
function createUserAsync(email, password) {

      return Promise.try(function (email, password) {

        var Passwords = require('machinepack-passwords');

        // Encrypt a string using the BCrypt algorithm.
        Passwords.encryptPassword({
          password: password
          , difficulty: 10
        }).exec({
          // An unexpected error occurred.
          error: function (err) {
            done(err);
          },
          // OK.
          success: function (encryptedPassword) {
            require('machinepack-gravatar').getImageUrl({
              emailAddress: email
            }).exec({
              error: function (err) {
                done(err); //return res.negotiate(err);
              }
              , success: function (gravatarUrl) {
                // Create a User with the params sent from
                // the sign-up form --> signup.ejs
                Promise.promisify(User.create)({
                  email: email
                  , name: name
                  , authenticationData: encryptedPassword
                  //lastLoggedIn: new Date(),
                  //gravatarUrl: gravatarUrl
                }).then(function (newUser) {
                  return newUser;
                }).catch(function (err) {
                  console.log("err: ", err);
                  console.log("err.invalidAttributes: ", err.invalidAttributes);

                  // If this is a uniqueness error about the email attribute,
                  // send back an easily parseable status code.
                  if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
                    && err.invalidAttributes.email[0].rule === 'unique') {
                    throw new Error('emailAddressInUse');
                  } else {
                    throw err;
                  }
                });
              }
            });
          }
        });
      });
}

module.exports = {
  serialize: serialize
  , deserialize: deserialize
  , createUser: createUser
  , createUserAsync: createUserAsync
  , configure: configure
};

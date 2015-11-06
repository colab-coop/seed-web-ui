'use strict';

//todo: rename this to UserService

const _ = require('lodash');
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const Passwords = require('machinepack-passwords');
const User = require('../models/user');
const Profile = require('../models/profile');

let theConfig;

function configure(config) {
  theConfig = config;
}

function serialize(user, done) {
  done(null, user._id);
}

function deserialize(id, done) {
  console.log('lib/user.deserialize - id: ' + id);

  var foundUser;
  User.findOne({ _id: id}).populate('defaultProfileRef').exec()
    .then(function(user) {
      //console.log('foundUser: ' + _.inspect(user));
      //console.log('u.defprof: ' + user.defaultProfileRef);
      user.profile = user.defaultProfileRef;
      //console.log('foundUser: ' + user + ', profile: ' + user.profile);
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

//function createUser(email, password, firstName, lastName, orgName, memberType, done) {
//
//      const Passwords = require('machinepack-passwords');
//      const displayName = !!orgName ? orgName : `${firstName} ${lastName}`;
//
//      // Encrypt a string using the BCrypt algorithm.
//      Passwords.encryptPassword({
//        password: password
//        , difficulty: 10
//      }).exec({
//        // An unexpected error occurred.
//        error: function (err) {
//          done(err);
//        },
//        // OK.
//        success: function (encryptedPassword) {
//          let resultUser;
//          require('machinepack-gravatar').getImageUrl({
//            emailAddress: email
//          }).exec({
//            error: function (err) {
//              done(err); //return res.negotiate(err);
//            },
//            success: function (gravatarUrl) {
//              console.log('before: gurl: ' + gravatarUrl);
//              const profile = new Profile({
//                firstName: firstName
//                , lastName: lastName
//                , orgName: orgName
//                , displayName: displayName
//                , name: displayName  //todo: remove deprecated usages
//                , email: email
//                , membershipPayments: 0
//                , memberType: memberType   //todo: what is node convention for enums?
//              });
//              console.log("cu new profile id: " + profile._id);
//              // Create a User with the params sent from
//              // the sign-up form --> signup.ejs
//              User.create({
//                email: email
//                , displayName: displayName  // probably don't even need name on user since we have the linked profile
//                , authenticationData: encryptedPassword
//                , defaultProfileRef: profile._id
//                //, defaultProfile: profile._id
//                //lastLoggedIn: new Date(),
//                //gravatarUrl: gravatarUrl
//              }, function userCreated(err, newUser) {  //todo: refactor this w/ promises and better error handling
//                if (err) {
//                  console.log("err: ", err);
//                  console.log("err.invalidAttributes: ", err.invalidAttributes);
//                  // If this is a uniqueness error about the email attribute,
//                  // send back an easily parseable status code.
//                  if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
//                    && err.invalidAttributes.email[0].rule === 'unique') {
//                    console.log(`create user success: ${newUser}`);
//                    done(null, 'emailAddressInUse');
//                  }
//
//                  // Otherwise, send back something reasonable as our error response.
//                  return done(err);
//                }
//                resultUser = newUser;
//                profile.save()
//                  .then(function (saved) {
//                    //res.redirect('/c/' + saved._id + '/thanks');
//                    done(null, 'ok', resultUser);
//                  })
//                  .catch(function(err) {
//                    console.log('err saving profile: ' + err + '\nstack: ' + err.stack);
//                    done(err);
//                  })
//              });
//            }
//          });
//        }
//      });
//}


function encryptPassword(password) {
  return new Promise(function (resolve, reject) {
    Passwords.encryptPassword({
      password: password
      , difficulty: 10
    }).exec({
      error: reject, success: resolve
    });
  });
}

function gravatarGetImageUrl(email) {
  return new Promise(function (resolve, reject) {
    require('machinepack-gravatar').getImageUrl({
      emailAddress: email
    }).exec({
      error: reject, success: resolve
    });
  });
}

function buildDisplayName(firstName, lastName, orgName) {
  if (!!orgName && !!firstName) {
    return `${firstName} ${lastName}, ${orgName}`;
  } else {
    if (!!orgName) {
      return orgName;
    } else {
      return `${firstName} ${lastName}`;
    }
  }
}

function createUser(data) { //email, password, firstName, lastName, orgName, memberType) {

  let resultUser;
  let profile;
  let encryptedPassword;

  const displayName = buildDisplayName(data.firstName, data.lastName, data.orgName);

  return encryptPassword(data.password)
    .then((anEncryptedPassword) => {
      encryptedPassword = anEncryptedPassword;
      return gravatarGetImageUrl(data.email);
    })
    .then((imageUrl) => {
      console.log(`gravatar url: ${imageUrl}`);
      profile = new Profile({
        firstName: data.firstName
        , lastName: data.lastName
        , orgName: data.orgName
        , displayName: displayName
        , name: displayName  //todo: remove deprecated usages
        , email: data.email
        , imageUrl: imageUrl
        , membershipPayments: 0
        , memberType: data.memberType   //todo: what is node convention for enums?
      });
      console.log("cu new profile id: " + profile._id);
      return User.create({
        email: data.email
        , displayName: displayName  // probably don't even need name on user since we have the linked profile
        , authenticationData: encryptedPassword
        , defaultProfileRef: profile._id
        //lastLoggedIn: new Date(),
      })
    })
    .then((newUser) => {
      resultUser = newUser;
      return profile.save();
    })
    .then(function (savedProfile) {
      return resultUser;
    })
    .catch((err) => {
      console.log(`err: ${_.inspect(err)}`);
      // If this is a uniqueness error about the email attribute,
      // send back an easily parseable status code.
      // note, this error parsing is specific to mongodb, probably better to query db instead of rely on error resp
      if (err.code == 11000 && err.errmsg && err.errmsg.indexOf('email') >= 0) {
        console.log(`duplicate email error: ${err}`);
        throw new Error('emailAddressInUse');  //todo: how to best use an error code for cleaner handling
      } else {
        throw err;
      }
    })
}



module.exports = {
  serialize: serialize
  , deserialize: deserialize
  , createUser: createUser
  , configure: configure
};

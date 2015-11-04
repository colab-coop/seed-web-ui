'use strict';

const _ = require('lodash');
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const Passwords = require('machinepack-passwords');
const User = require('../models/user');
const Profile = require('../models/profile');

let theConfig;
let emailEnabled;

function configure(config) {
  theConfig = config;
  emailEnabled = Boolean(theConfig.enabled);
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

/** Promise version of the passport login */
function login(req, user) {
  return new Promise(function (resolve, reject) {
    req.login(user, function (err) {
      if (err) {
        console.error(err);
        reject(err);
      }
      resolve(user);
    });
  });
}

function emailUser(email, name) {
  return new Promise(function (resolve, reject) {
    console.log(`email enabled: ${emailEnabled}`);
    if (!emailEnabled) {
      resolve('disabled');
      return;
    }
    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: theConfig.sender,
        pass: theConfig.senderPassword
      }
    });

    var text = '<h1>hey thanks</h1>';

    var mailOptions = {
      from: theConfig.sender,
      to: email,
      subject: 'Welcome to Seed.Coop',
      text: text, // plaintext body
      html: 'Thank You, ' + name + ' for your support!', //<b>' + email + '</b>', // html body
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        reject(error)
      } else {
        resolve('ok');
      }
    });
  });
}



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
    .then((savedProfile) => {
      return emailUser(data.email, displayName);
    })
    .then((status) => {
      console.log(`emailUser status: ${status}`);
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
  , login: login
  , createUser: createUser
  , configure: configure
  , emailUser: emailUser
};
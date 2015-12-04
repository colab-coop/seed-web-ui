'use strict';

const _ = require('lodash');
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const uuid = require('node-uuid');
const Passwords = require('machinepack-passwords');
const User = require('../models/user');
const Model = User;
const Profile = require('../models/profile');
const mailer = require('./mailer');

//let theConfig;
//let emailEnabled;
//
//function configure(config) {
//  theConfig = config;
//  console.log(`theConfig.enabled: ${theConfig.enabled}`);
//  emailEnabled = 'true' == theConfig.enabled;//Boolean(theConfig.enabled);
//  console.log(`emailEnabled: ${emailEnabled}`);
//}

function serialize(user, done) {
  done(null, user._id);
}

function deserialize(id, done) {
  console.log('lib/user.deserialize - id: ' + id);

  var foundUser;
  fetch(id) //User.findOne({ _id: id}).populate('defaultProfileRef').exec()
    .then(function(user) {
      //console.log('foundUser: ' + _.inspect(user));
      //console.log('u.defprof: ' + user.defaultProfileRef);
      if (user) {
        user.profile = user.defaultProfileRef;
      }
      //console.log('foundUser: ' + user + ', profile: ' + user.profile);
      done(null, user);
    })
    .catch(function(err) {
      done(err);
    });
}

function fetch(id) {
  return User.findOne({_id: id}).populate('defaultProfileRef').exec()
}

function fetchByProfile(profileId) {
  return User.findOne({defaultProfileRef: profileId}).populate('defaultProfileRef').exec()
}

function fetchByEmail(email) {
  return User.findOne({email: email}).populate('defaultProfileRef').exec()
}


function list(criteria) {
  return User.find(criteria).sort({'createdAt': -1}).populate('defaultProfileRef').exec();
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

//function sendEmail(mailOptions) {
//  return new Promise(function (resolve, reject) {
//    console.log(`email enabled: ${emailEnabled}`);
//    if (!emailEnabled) {
//      resolve('disabled');
//      return;
//    }
//    var transporter = nodemailer.createTransport({
//      service: 'Gmail',
//      auth: {
//        user: theConfig.sender,
//        pass: theConfig.senderPassword
//      }
//    });
//
//    transporter.sendMail(mailOptions, function (error, info) {
//      if (error) {
//        reject(error);
//      } else {
//        resolve('ok');
//      }
//    });
//  });
//}

////todo rip this out
//function emailUser(email, name) {
//  var text = 'Thank You, ' + name + ' for your support!';
//
//  var mailOptions = {
//    to: email,
//    subject: 'Welcome to Seed.Coop',
//    text: text, // plaintext body
//    html: '<h2>' + text + '</h2>' // html body
//  };
//
//  return mailer.sendEmail(mailOptions);
//}

function sendWelcomeEmail(userId) { //email, name) {
  console.log(`sendwelcome: ${userId}`);
  return fetch(userId)
    .then((user) => {
      if (user) {
        user.passwordResetToken = uuid.v4();
        user
          .save()
          .then((user) => {
            const profile = user.defaultProfileRef;
            const text = 'To complete your account, please visit ';
            const link = `${mailer.rootUrl()}/completeSignup?token=${user.passwordResetToken}`;
            const htmlLink = '<a href="' + link + '">' + link + '</a>';
            const email = text + link;
            const htmlEmail = '<h2>' + text + htmlLink + '</h2>';


            let h = `Thank You, ${profile.displayName}, for your support!<br><br>`;
            h += `To complete your account on the Seed.Coop platform please `;
            h += `<a href="${link}">click here</a>.<br><br>`;
            h += `Once a member you can quickly and easily kickstart innovative coops.<br><br>`;
            h += `We're grateful for your solidarity.<br><br>`;
            h += `Let's build a sustainable and just future for our children together.`;

            let t = `Thank You, ${profile.displayName}, for your support!\n\n`;
            t += `To complete your account on the Seed.Coop platform please visit:\n`;
            t += `  ${link}\n\n`;
            t += `Once a member you can quickly and easily kickstart innovative coops.\n\n`;
            t += `We're grateful for your solidarity.\n\n`;
            t += `Let's build a sustainable and just future for our children together.`;


            return mailer.sendEmail({
              to: user.email,
              subject: 'Welcome to Seed.Coop!',
              text: t,
              html: h
            });
          });
      } else {
        return Promise.resolve();
      }
    });
}

function encryptPassword(password) {
  if (password) {
    return new Promise(function (resolve, reject) {
      Passwords.encryptPassword({
        password: password
        , difficulty: 10
      }).exec({
        error: reject, success: resolve
      });
    });
  } else {
    return Promise.resolve(null);
  }
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

  console.log(`creaetUser: ${_.inspect(data)}`);
  let resultUser;
  let profile;
  let encryptedPassword;

  // note, we keep flipping our name strategy.  for now we'll accept a single 'displayName' and give that preference
  const displayName = data.displayName ? data.displayName : buildDisplayName(data.firstName, data.lastName, data.orgName);

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
      if (data.memberType !== Profile.MEMBERSHIP_TYPES.api) {
        return sendWelcomeEmail(resultUser._id);
      } else {
        return 'skipped';
      }
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



function updatePassword(user, password) {
  return encryptPassword(password)
    .then((encryptedPassword) => {
      user.authenticationData = encryptedPassword;
      return user.save();
    });
}

function sendPasswordResetEmail(email) {
  return User
    .findOne({ email: email })
    .then((user) => {
      if (user) {
        user.passwordResetToken = uuid.v4();
        user
          .save()
          .then((user) => {
            const link = mailer.rootUrl() + '/resetPassword?token=' + user.passwordResetToken;

            return mailer.sendEmail({
              //from: theConfig.sender,
              to: user.email,
              subject: 'Reset your password',
              text: 'To reset your password please visit ' + link
            });
          });
      } else {
        return Promise.resolve();
      }
    });
}

function updatePasswordFromToken(token, password) {
  return User
    .findOne({ passwordResetToken: token })
    .then((user) => {
      if (user) {
        user.passwordResetToken = null;
        return updatePassword(user, password);
      } else {
        Promise.resolve(null);
      }
    });
}


function setAdmin(userId, bool) {
  return User
    .findOne({_id: userId})
    .then((user) => {
      if (user) {
        user.isAdmin = bool;
        return user.save();
      } else {
        Promise.resolve(null);
      }
    });

}

module.exports = {
  serialize: serialize
  , deserialize: deserialize
  , login: login
  , createUser: createUser
  , updatePassword: updatePassword
  //, configure: configure
  //, emailUser: emailUser
  , sendWelcomeEmail: sendWelcomeEmail
  , sendPasswordResetEmail: sendPasswordResetEmail
  , updatePasswordFromToken: updatePasswordFromToken

  , fetch: fetch
  , fetchByProfile: fetchByProfile
  , fetchByEmail: fetchByEmail
  , list: list
  , setAdmin: setAdmin
};

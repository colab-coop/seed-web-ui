'use strict';

const _ = require('lodash');
const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');
const mcapi = require('mailchimp-api');

let transporter;
let senderAddress;

let theConfig;
let enabled;

function configure(config) {
  theConfig = config;
  //console.log(`mailer config: ${_.inspect(theConfig)}`);
  enabled = Boolean.parse(theConfig.enabled);
  senderAddress = theConfig.senderAddress;
  console.log(`emailEnabled: ${enabled}`);
  const accessKey = theConfig.sesAccessKey;

  if (enabled) {
    console.log(`accessKey: ${accessKey}`);
    transporter = nodemailer.createTransport(sesTransport({
      accessKeyId: theConfig.sesAccessKey,
      secretAccessKey: theConfig.sesSecretKey,
      rateLimit: 5
    }));
  }
}

// root domain to use for generated urls
function rootUrl() {
  return theConfig.rootUrl;
}

function sendEmail(mailOptions) {
  return new Promise(function (resolve, reject) {
    console.log(`email enabled: ${enabled}`);
    if (!enabled) {
      resolve('disabled');
      return;
    }
    mailOptions.from = theConfig.sender;

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        reject(error);
      } else {
        resolve('ok');
      }
    });
  });
}




module.exports = {
  configure: configure
  , sendEmail: sendEmail
  , rootUrl: rootUrl
};

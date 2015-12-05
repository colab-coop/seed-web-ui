'use strict';

const _ = require('lodash');
const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');

let transporter;
let senderAddress;
//let systemLogEmail;

let theConfig;
let enabled;

function configure(config) {
  theConfig = config;
  //console.log(`mailer config: ${_.inspect(theConfig)}`);
  enabled = Boolean.parse(theConfig.enabled);
  senderAddress = theConfig.senderAddress;
  //systemLogEmail = theConfig.systemLogEmail;
  console.log(`emailEnabled: ${enabled}, systemLogEmail: ${theConfig.systemLogEmail}`);
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

function systemLogEmail() {
  return theConfig.systemLogEmail;
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
  , systemLogEmail: systemLogEmail
};

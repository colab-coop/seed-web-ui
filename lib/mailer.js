'use strict';

const _ = require('lodash');
const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');

let transporter;
let senderAddress;

let theConfig;
let enabled;

function configure(config) {
  theConfig = config;
  console.log(`mailer config: ${_.inspect(theConfig)}`);
  enabled = Boolean.parse(theConfig.enabled);
  senderAddress = theConfig.senderAddress;
  console.log(`emailEnabled: ${enabled}`);
  const accessKey = theConfig.sesAccessKey;
  console.log(`accessKey: ${accessKey}`);

  if (enabled) {
    console.log(`accesskey: ${theConfig.sesAccessKey}, secret: ${theConfig.sesSecretKey}`);
    transporter = nodemailer.createTransport(sesTransport({
      accessKeyId: theConfig.sesAccessKey,
      secretAccessKey: theConfig.sesSecretKey,
      rateLimit: 5
    }));
  }
}




//var mailOptions = {
//  from: 'FromName <registeredMail@xxx.com>',
//  to: 'registeredMail@xyz.com', // list of receivers
//  subject: 'Amazon SES Template TesT', // Subject line
//  html: <p>Mail message</p> // html body
//};
//
//// send mail with defined transport object
//transporter.sendMail(mailOptions, function(error, info){
//  if(error){
//    console.log(error);
//  }else{
//    console.log('Message sent: ' + info);
//  }
//});
//


function sendEmail(mailOptions) {
  return new Promise(function (resolve, reject) {
    console.log(`email enabled: ${enabled}`);
    if (!enabled) {
      resolve('disabled');
      return;
    }
    //var transporter = nodemailer.createTransport({
    //  service: 'Gmail',
    //  auth: {
    //    user: theConfig.sender,
    //    pass: theConfig.senderPassword
    //  }
    //});

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

//function emailUser(email, name) {
//  var text = '<h1>hey thanks</h1>';
//
//  var mailOptions = {
//    from: theConfig.sender,
//    to: email,
//    subject: 'Welcome to Seed.Coop',
//    text: text, // plaintext body
//    html: 'Thank You, ' + name + ' for your support!', //<b>' + email + '</b>', // html body
//  };
//
//  return sendEmail(mailOptions);
//}




module.exports = {
  configure: configure
  , sendEmail: sendEmail
};

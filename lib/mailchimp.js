'use strict';

const _ = require('lodash');
const MailChimpAPI = require('mailchimp').MailChimpAPI;
let mailchimp;

let theConfig;
let enabled;
let defaultListId;

function configure(config) {





  theConfig = config;
  //console.log(`mailer config: ${_.inspect(theConfig)}`);
  enabled = Boolean.parse(theConfig.enabled);

  if (enabled) {


    var apiKey = config.apiKey;
    try {
      mailchimp = new MailChimpAPI(apiKey, { version : '2.0' });
    } catch (error) {
      console.log(error.message);
    }
    defaultListId = theConfig.defaultListId;

    console.log(`mc: ${apiKey}, listId: ${defaultListId}`);
  } else {
    console.log(`mailchimp - disabled`);
  }
}


function subscribeToDefaultList(profile) {
  //todo: process this in background?
  return new Promise(function (resolve, reject) {
    console.log(`subscribe: ${profile}, listid:${defaultListId}`);
    mailchimp.call(
      'lists'
      , 'subscribe'
      , {id: defaultListId
        , email:{email: profile.email}
        , merge_vars:{FNAME:  profile.firstName, LNAME: profile.lastName}
      }
      , function(error, result) {
        if (error) {
          reject(error);
        } else {
          result.status = 'ok';
          resolve(result);
        }
      });
  });
}




module.exports = {
  configure: configure
  , subscribeToDefaultList: subscribeToDefaultList
};

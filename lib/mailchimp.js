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


function createInstance(config) {
  console.log(`mailchimp createInstance - config: ${_.inspect(config)}`);
  let instance;
  try {
    var apiKey = config.apiKey;
    instance = new MailChimpAPI(apiKey, { version : '2.0' });
    instance.defaultListId = config.defaultListId;
    instance.enabled = config.enabled;

    instance.subscribeToDefaultList = function(profile) {
      if (instance.enabled) {
        console.log(`mc.inst.subtolist1: this: ${this}, listId: ${instance.defaultListId}`);
        return subscribeToList(instance, instance.defaultListId, profile);
      } else {
        return 'skipped (disabled config)';
      }
    };

    instance.toString = function() {
      return `mailchimp instance - deflistid: ${instance.defaultListId}`;
    };
  } catch (error) {
    // beware, ths flow doesn't seem to execute when the api key is invalid.  it instead fails later during the actual api invoke
    console.log(`mailchimp api create error: ${error.message} - using dummy instance`);
    instance = {};
    instance.enabled = false;
    instance.subscribeToDefaultList = function(profile) {
      console.log(`mc.inst-error disable - skipped`);
    };
    instance.toString = function() {
      return `mailchimp instance - error disabled`;
    };
  }

  //instance.subscribeToDefaultList = (profile) => {
  //  subscribeToList(this, this.defaultListId, profile)
  //};
  //instance.subscribeToDefaultList.bind(instance);

  return instance;
}

/** global subscribe */
function subscribeToDefaultList(profile) {
  return subscribeToList(mailchimp, defaultListId, profile);
}

function subscribeToList(mailChimpApi, listId, profile) {
  //todo: process this in background?
  return new Promise(function (resolve, reject) {
    //console.log(`mc.inst.subtolist2: this: ${_.inspect(this)}, this.listId: ${this.defaultListId}`);
    console.log(`subscribe: ${profile}, listid:${listId}`);
    mailChimpApi.call(
      'lists'
      , 'subscribe'
      , {id: listId
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
  , createInstance: createInstance
};

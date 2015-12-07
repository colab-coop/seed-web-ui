'use strict';

const _ = require('lodash');
const MailChimpAPI = require('mailchimp').MailChimpAPI;

let theConfig;

// instance used for seed.coop mailing list subscribes.  (as opposed to campaign specific mailing lists)
let systemInstance;

function configure(config) {
  theConfig = config;
  console.log(`system mailer config: ${_.inspect(theConfig)}`);
  systemInstance = createInstance(config);

  console.log(`mailchimp system instance: ${systemInstance}`);
}


function createInstance(config) {
  console.log(`mailchimp createInstance - config: ${_.inspect(config)}`);
  let instance;
  try {
    var apiKey = config.apiKey;
    instance = new MailChimpAPI(apiKey, { version : '2.0' });
    instance.defaultListId = config.defaultListId;
    instance.enabled = Boolean.parse(config.enabled);

    instance.subscribeToDefaultList = function(profile) {
      return subscribeToList(instance, instance.defaultListId, profile);
    };

    instance.toString = function() {
      return `mailchimp instance - deflistid: ${instance.defaultListId}, enabled: ${instance.enabled}`;
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
  //return subscribeToList(mailchimp, defaultListId, profile);
  return systemInstance.subscribeToDefaultList(profile);
}

function subscribeToList(mailChimpApi, listId, profile) {
  //todo: process this in background?
  return new Promise(function (resolve, reject) {
    console.log(`mailChimpApi: ${mailChimpApi}`);
    //console.log(`mc.inst.subtolist2: this: ${_.inspect(this)}, this.listId: ${this.defaultListId}`);
    if (mailChimpApi.enabled) {
      console.log(`subscribe: ${profile}, listid:${listId}`);
      mailChimpApi.call(
        'lists'
        , 'subscribe'
        , {
          id: listId
          , email: {email: profile.email}
          , merge_vars: {FNAME: profile.firstName, LNAME: profile.lastName}
        }
        , function (error, result) {
          if (error) {
            reject(error);
          } else {
            result.status = 'ok';
            resolve(result);
          }
        });
    } else {
      resolve({status: 'disabled'});
    }
  });
}




module.exports = {
  configure: configure
  , subscribeToDefaultList: subscribeToDefaultList
  , createInstance: createInstance
};

'use strict';

const _ = require('lodash');
const MailChimpAPI = require('mailchimp').MailChimpAPI;

// instance used for seed.coop mailing list subscribes.  (as opposed to campaign specific mailing lists)
let systemInstance;

class MailChimp {
  constructor(config) {
    this.enabled = Boolean.parse(config.enabled);
    this.apiKey = config.apiKey;
    this.api = new MailChimpAPI(config.apiKey, { version : '2.0' });
    this.defaultListId = config.defaultListId;
  }

  subscribeToDefaultList(profile) {
    console.log(`obj subscribe - this: ${this}`);
    if (this.enabled) {
      return subscribeToList(this.api, this.defaultListId, profile);
    } else {
      return Promise.resolve({status: 'disabled'});
    }
  }

  toString() {
    return `MailChimp obj - deflistid: ${this.defaultListId}, enabled: ${this.enabled}`;
  }
}

function configure(config) {
  console.log(`system mailer config: ${_.inspect(config)}`);
  systemInstance = new MailChimp(config);

  console.log(`mailchimp system instance: ${systemInstance}`);
}


function createInstance(config) {
  console.log(`mailchimp createInstance - config: ${_.inspect(config)}`);
  return new MailChimp(config);
}

/** global subscribe */
function subscribeToDefaultList(profile) {
  return systemInstance.subscribeToDefaultList(profile);
}

function subscribeToList(mailChimpApi, listId, profile) {
  //todo: process this in background?
  return new Promise(function (resolve, reject) {
    console.log(`mailChimpApi: ${mailChimpApi}`);
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
  });
}



module.exports = {
  configure: configure
  , subscribeToDefaultList: subscribeToDefaultList
  , createInstance: createInstance
};

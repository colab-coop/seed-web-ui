'use strict';

const Model = require('../models/profile');
const helpers = require('./helpers');


//
//

/** async retrieval of a Proposal object with dependent relations fetched */
function fetch(id) {
  return Model.findOne({_id: id}).exec();
}


/** returns all 'sector' type proposals */
function list(criteria) {
  return Model.find(criteria).exec();
}


function save(id, data) {
  return fetch(id)
    .then((item) => {
      console.log(`save - fetched: ${item}`);
      if (item) {
        item.update(data).exec();
      } else {
        if (!!id) {
          throw new Error(`offer not found for id: [${id}]`);
        } else {
          Model.create(data);
        }
      }
    });
}

function remove(id) {
  return Model.remove({_id: id}).exec();
}

function updateStripeCustomerId(profileId, customerId) {
  return fetch(profileId)
    .then((profile) => {
      if (profile) {
        profile.stripeCustomerId = customerId;
        return profile.save();
      } else {
        throw new Error(`profile not found for id: ${profileId}`);
        //Promise.resolve(null);
      }
    });

}




module.exports = {
  fetch: fetch
  , list: list
  , save: save
  , updateStripeCustomerId: updateStripeCustomerId
//  , buildSectorOptions: buildSectorOptions
};

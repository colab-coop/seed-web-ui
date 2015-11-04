'use strict';

const Model = require('../models/contribution');
const helpers = require('./helpers');


function fetch(id) {
  return Model.findOne({_id: id}).populate('profileRef proposalRef perks memberships').exec();
}


function list(criteria) {
  return Model.find(criteria).populate('profileRef perks memberships').exec();
}

//todo: figure out how to best factor out a base service class

function save(id, data) {
  console.log(`save data: ${data}`);
  return fetch(id)
    .then((item) => {
      console.log(`save - fetched: ${item}`);
      if (item) {
        return item.update(data).exec();
      } else {
        if (!!id) {
          throw new Error(`offer not found for id: [${id}]`);
        } else {
          return Model.create(data);
        }
      }
    });
}

function remove(id) {
  return Model.remove({_id: id}).exec();
}

module.exports = {
  fetch: fetch
  , list: list
  , save: save
//  , buildSectorOptions: buildSectorOptions
};

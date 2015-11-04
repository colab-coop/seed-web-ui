'use strict';

const Model = require('../models/contribution');
const helpers = require('./helpers');


function fetch(id) {
  return Model.findOne({_id: id}).exec();
}


function list(criteria) {
  return Model.find(criteria).exec();
}

//todo: figure out how to best factor out a base service class

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

module.exports = {
  fetch: fetch
  , list: list
  , save: save
//  , buildSectorOptions: buildSectorOptions
};

'use strict';

var Model = require('../models/offer');
var helpers = require('./helpers');


//
// could perhaps attach this method to Proposal singleton instance, but not sure if there will be an issue with
// circular dependencies
//

/** async retrieval of a Proposal object with dependent relations fetched */
function fetch(id) {
  return Model.findOne({_id: id}).exec();
}


/** returns all 'sector' type proposals */
function list(criteria) {
  return Model.find(criteria).exec();
}

//function buildSectorOptions(selectedValue, includeNone, noneDisplayArg) {
//  return listSectors()
//    .then(function (sectors) {
//      return helpers.buildOptionsFromList(sectors, '_id', 'title', selectedValue, includeNone, noneDisplayArg);
//    });
//}

//function create(user, proposal, data, done) {
//}

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

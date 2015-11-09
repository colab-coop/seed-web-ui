'use strict';

const Model = require('../models/merchantConfig');
const helpers = require('./helpers');


// todo: factor out the duplicated code
//

/** async retrieval with dependent relations fetched */
function fetch(id) {
  return Model.findOne({_id: id}).exec();
}


/** returns all  */
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

module.exports = {
  fetch: fetch
  , list: list
  , save: save
};

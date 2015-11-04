'use strict';


const Model = require('../models/vote');


function fetch(id) {
  return Model.findOne({_id: id}).populate('profileRef proposalRef').exec()
}

function remove(id) {
  return Model.remove({_id: id}).exec();
}

//todo
//function create(user, proposal, data, done) {
//}
//
//function update(id, data) {
//}

module.exports = {
  fetch: fetch
  //, create: create
  //, update: update
};

'use strict';

var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');


//
// could perhaps attach this method to Proposal singleton instance, but not sure if there will be an issue with
// circular dependencies
//

/** async retrieval of a Proposal object with dependent relations fetched */
function fetch(id) {
  let proposal;
  return Proposal.findOne({_id: id}).exec()
    .then(function (item) {
      proposal = item;
      return Vote.find({proposalRef: proposal._id}).populate('profileRef');
    })
    .then(function (votes) {
      proposal.votes = votes;
      return Contribution.find({proposalRef: proposal._id}).populate('profileRef');
    })
    .then(function (contributions) {
      proposal.contributions = contributions;
      return proposal;
    });
}


function create(user, proposal, data, done) {
}

function update(id, data) {

}

module.exports = {
  fetch: fetch
  , create: create
  , update: update
};

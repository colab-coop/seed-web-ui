'use strict';

var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var Offer = require('../models/offer');
var helpers = require('./helpers');


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
      return Offer.find({proposalRef: proposal._id}); //.populate('profileRef');
    })
    .then(function (offers) {
      proposal.offers = offers;
      return proposal;
    });
}


/** returns all 'sector' type proposals */
function listSectors() {
  //todo: figure how to best cache this
  return Proposal.find({kind: Proposal.KIND.sector}).exec();
}

function buildSectorOptions(selectedValue, includeNone, noneDisplayArg) {
  return listSectors()
    .then(function (sectors) {
      return helpers.buildOptionsFromList(sectors, '_id', 'title', selectedValue, includeNone, noneDisplayArg);
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
  , listSectors: listSectors
  , buildSectorOptions: buildSectorOptions
};

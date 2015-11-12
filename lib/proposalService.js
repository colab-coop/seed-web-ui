'use strict';

var _ = require('lodash');
var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var Offer = require('../models/offer');
//var OfferService = require('./offerService');
//var ContributionService = require('./contributionService');
var helpers = require('./helpers');

function ContributionService() { return require('./contributionService') }
function OfferService() { return require('./offerService') }


//
// could perhaps attach this method to Proposal singleton instance, but not sure if there will be an issue with
// circular dependencies
//

function fetch(id) {
  return fetchOneByFilter({_id: id});
}

/** async retrieval of a Proposal object with dependent relations fetched */
function fetchOneByFilter(filter) {
  let proposal;
  let id;
  return Proposal.findOne(filter).populate('parentRef profileRef merchantConfigRef').exec()
    .then((item) => {
      if (item) {
        proposal = item;
        id = proposal._id;
      } else {
        proposal = {};
        id = 'foo'; //hack!!
      }
      return Vote.find({proposalRef: id}).populate('profileRef');
    })
    .then((votes) => {
      proposal.votes = votes;
      return ContributionService().list({proposalRef: id});
    })
    .then((contributions) => {
      proposal.contributions = contributions;
      return OfferService().list({proposalRef: id}); //.populate('profileRef');
    })
    .then((offers) => {  //todo: drom the combined offers list
      proposal.offers = offers;
      return OfferService().list({proposalRef: id, kind: Offer.KIND.prepay});
    })
    .then((prepays) => {
      proposal.prepays = prepays;
      return OfferService().list({proposalRef: id, kind: Offer.KIND.membership});
    })
    .then((memberships) => {
      proposal.memberships = memberships;
      return OfferService().list({proposalRef: id, kind: Offer.KIND.perk});
    })
    .then((perks) => {
      proposal.perks = perks;
      return proposal;
    })
}

function fetchLite(id) {
  return Proposal.findOne({_id: id}).exec();
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

//todo
//function create(user, proposal, data, done) {
//}

function update(id, data) {
  return fetchLite(id)
    .then((proposal) => {
      _.assign(proposal, data);
      return proposal.save();
    });
}

function remove(id) {
  return Model.remove({_id: id}).exec();
}


module.exports = {
  fetch: fetch
  , fetchOneByFilter: fetchOneByFilter
  , fetchLite: fetchLite
  //, create: create
  , update: update
  , remove: remove
  , listSectors: listSectors
  , buildSectorOptions: buildSectorOptions
};

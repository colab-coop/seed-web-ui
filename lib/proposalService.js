'use strict';

var _ = require('lodash');
var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
var Offer = require('../models/offer');
//var OfferService = require('./offerService');
//var ContributionService = require('./contributionService');
const mailer = require('./mailer');
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
        console.log(`ps.fetch1 raw - id: ${proposal._id}, tos: ${proposal.toString()}`);
        id = proposal._id;
      } else {
        const errorMessage = `proposal not found for filter: ${JSON.stringify(filter)}`;
        console.log(errorMessage);
        throw new Error(errorMessage);
        //proposal = {};
        //id = 'foo'; //hack!!
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
    .then((perkOffers) => {
      proposal.perkOffers = perkOffers;
      console.log(`ps.fetch1 - id: ${proposal._id}, tos: ${proposal.toString()}`);
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


function sendConfirmationEmail(proposalId, action) {
  fetch(proposalId)
  .then((proposal) => {
      const to = proposal.profileRef.email;
      const subject = 'Project Submission';
//      const statusLink = buildStatusLink(contribution);
      let t = `Thank you ${proposal.profileRef.firstName} for your project submission.\n`;
      t += `You will be contacted by a member of our team within a few days.\n`;
      //t += `Your status page is:\n`;
      //t += `  ${statusLink}\n`;

      return mailer.sendEmail({
        to: to
        , subject: subject
        , text: t
      });
    })
}

function sendSystemNotification(proposalId, action) {
  const to = mailer.systemLogEmail();
  const link = `${mailer.rootUrl()}/p/${proposalId}/adminView`;
  const subject = `seed system log: ${action}`;
  let t = `admin link: ${link}\n`;

  return mailer.sendEmail({
    to: to
    , subject: subject
    , text: t
  });

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
  , sendSystemNotification: sendSystemNotification
  , sendConfirmationEmail: sendConfirmationEmail
};

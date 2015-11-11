'use strict';

const _ = require('lodash');
const Model = require('../models/contribution');
const Profile = require('../models/profile');
//const ProposalService = require('../lib/proposalService');
const ProfileService = require('../lib/profileService');
const UserService = require('../lib/userService');
const helpers = require('./helpers');

// avoid circular deps. note node seems to silently fail if circular deps exist
function ProposalService() {return require('../lib/proposalService') }


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


function createPledge(proposalId, userData, pledgeData) {
  console.log(`createPledge: proposalId ${proposalId}, userData: ${_.inspect(userData)}, pledgeData: ${_.inspect(pledgeData)}`);

//  userData fields: if existing: profileId, otherwise firstName, lastName, orgName, email
//  pledgeData = {
//    patron: Boolean(req.body.patron)
//    , member: Boolean(req.body.member)
//    , funder: Boolean(req.body.funder)
//    , payNow: Boolean(req.body.payNow)
//    , pledge: Boolean(req.body.pledge)
//    , seedcoopInterest: Boolean(req.body.seedcoop)
//    , memberships: req.body.memberships
//    , perks: req.body.perks  // list of offer ids
//  };

  pledgeData.proposalRef = proposalId;  //todo: some validation here
  let authenticatedUser = null;
  let contribution;
  //let resolveUserAction;
  //if (userData.profileId) {
  //  pledgeData.profileRef = userData.profileId;
  //  resolveUserAction = Promise.resolve('skip');
  //} else {
  //  userData.password = 'xxxxxx';  //tmp hack, should leave password undefined once we have reset flow
  //  userData.memberType = pledgeData.seedcoopInterest ? Profile.MEMBERSHIP_TYPES.provisional : Profile.MEMBERSHIP_TYPES.visitor;
  //  console.log(`auto signup of new user: ${_.inspect(userData)}`);
  //  resolveUserAction = UserService.createUser(userData);
  //}
  return (function() {
    if (userData.profileId) {
      pledgeData.profileRef = userData.profileId;
      return Promise.resolve('skip');
    } else {
      userData.password = 'xxxxxx';  //tmp hack, should leave password undefined once we have reset flow
      userData.memberType = pledgeData.seedcoopInterest ? Profile.MEMBERSHIP_TYPES.provisional : Profile.MEMBERSHIP_TYPES.visitor;
      console.log(`auto signup of new user: ${_.inspect(userData)}`);
      return UserService.createUser(userData);
    }
  }())
    .then((user) => {
    console.log(`resolved user: ${user}`);
    if (user && 'skip' !== user) {
      console.log(`created profile: ${user.defaultProfileRef}`);
      pledgeData.profileRef = user.defaultProfileRef;
//        return UserService.login(req, user);
      // pass back to the controller handle the 'login' action
      authenticatedUser = user;
    }
    return Model.create(pledgeData)
  })
    .then((savedContribution) => {
      contribution = savedContribution;
      console.log(`created pledge contribution: ${savedContribution}`);
      return ProposalService().fetch(proposalId);
    })
    .then((proposal) => {
      //todo: factor this.  note '|=' didn't seem to do the right thing
      proposal.pledgedCapitalTotal = proposal.pledgedCapitalTotal ? proposal.pledgedCapitalTotal : 0;
      proposal.pledgedCapitalTotal += contribution.pledgedCapital;
      proposal.supporterCount = proposal.supporterCount ? proposal.supporterCount : 0;
      proposal.supporterCount++;
      return proposal.save();
    })
    .then((savedProposal) => {
      return {
        contribution: contribution
        , proposal: savedProposal
        , user: authenticatedUser
      };
    })
}



module.exports = {
  fetch: fetch
  , list: list
  , list2: list
  , save: save
  , createPledge: createPledge
//  , buildSectorOptions: buildSectorOptions
};

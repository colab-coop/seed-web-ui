'use strict';

var Proposal = require('../models/proposal');
var Vote = require('../models/vote');
var Contribution = require('../models/contribution');
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

//function buildOptionsFromList(list, valueKey, displayKey, selectedValue, includeNone, noneDisplayArg) {
//  const noneDisplay = noneDisplayArg || 'None';
//  let matched = false;
//  const result = _.map(list, function(item) {
//    const value = item[valueKey];
//    const display = item[displayKey];
//    const selected = (value === selectedValue);
//    const option = { value: value, display: display, selected: selected};
//    if (selected) {
//      matched = true;
//    }
//    return option;
//  });
//  if (includeNone) {
//    if (matched) {
//      result.push({value: '', display: noneDisplay});
//    } else {
//      result.push({value: '', display: noneDisplay, selected: true});
//    }
//  }
//  return result;
//}


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

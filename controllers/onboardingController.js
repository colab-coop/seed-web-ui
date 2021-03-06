const _ = require('lodash');
const helpers = require('../lib/helpers');
const offerService = require('../lib/offerService');
const proposalService = require('../lib/proposalService');
const userService = require('../lib/userService');
const Offer = require('../models/offer');
const Proposal = require('../models/proposal');

const curriedHandleError = _.curry(helpers.handleError);

function createProposal(req, res, next) {
  function ensureProfile() {
    if (req.user && req.user.profile) {
      return Promise.resolve(req.user.profile);
    } else {
      return userService.createUser({
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        orgName: req.body.orgName
      });
    }
  }

  function createProposal(profile) {
    console.log(`createprop profile.id: ${profile._id}`);
    const proposal = new Proposal({
      profileRef: profile._id,
      title: req.body.campaignName,
      summary: req.body.summary
    });

    return proposal.save();
  }

  ensureProfile()
    .then(createProposal)
    .then((proposal) => {
      const uri = '/proposals/' + proposal._id;
      if (req.query.ajax) {
        res.json({redirect: uri});
      } else {
        res.redirect(uri);
      }
    })

    // todo: handle the error in an app-level middelware so that this can just become
    // .catch(next)
    .catch(curriedHandleError(req, res));
}

function proposalForm(req, res, next) {
  proposalService
    .fetchLite(req.params.id)
    .then((proposal) => {
      res.render('onboarding/proposal_form', {
        proposal: proposal
      });
    });
}


function updateProposal(req, res, next) {
  var proposal;

  //function offerForProposal(proposalRef) {
  //  return Offer
  //    .findOne({ proposalRef: proposalRef })
  //    .then((offer) => {
  //      if (offer) {
  //        return Promise.resolve(offer);
  //      } else {
  //        return offerService.create({ _id: proposalRef }, {});
  //      }
  //    });
  //}
  //
  //function updateOffer(proposalRef, data) {
  //  return offerForProposal(req.params.id)
  //    .then((offer) => {
  //      return offerService.save(offer.id, data);
  //    });
  //}

  //TODO
  //note: the current ui doesn't sync up with the Offer data model.
  // for now we should just add fields to the Proposal model for the form fields which don't already correspond
  // and forget about building related Offer instances

  Promise.all([
    proposalService.update(req.params.id, req.body.proposal),  // todo: other fields
    //updateOffer(req.params.id, req.body.offer)
  ]).then(() => {
    if (req.query.ajax) {
      res.json({redirect: '/proposalThanks'});
    } else {
      res.redirect('/proposalThanks');
    }
  }).catch(next);
}

function addRoutes(router) {
  router.post('/proposals', createProposal);
  router.get('/proposals/:id', proposalForm);
  router.post('/proposals/:id', updateProposal);
}

module.exports = {
  addRoutes: addRoutes
};

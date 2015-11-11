const _ = require('lodash');
const offerService = require('../lib/offerService');
const proposalService = require('../lib/proposalService');
const userService = require('../lib/userService');
const Offer = require('../models/offer');
const Proposal = require('../models/proposal');

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
    const proposal = new Proposal({
      profileRef: profile._id,
      title: req.body.campaignName,
      summary: req.body.summary
    });

    return proposal.save();
  }

  ensureProfile()
    .then(createProposal)
    .then((proposal) => res.redirect('/proposals/' + proposal._id))
    .catch(next);
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

  function offerForProposal(proposalRef) {
    return Offer
      .findOne({ proposalRef: proposalRef })
      .then((offer) => {
        if (offer) {
          return Promise.resolve(offer);
        } else {
          return offerService.create({ _id: proposalRef }, {});
        }
      });
  }

  function updateOffer(proposalRef, data) {
    return offerForProposal(req.params.id)
      .then((offer) => {
        return offerService.save(offer.id, data);
      });
  }

  Promise.all([
    proposalService.update(req.params.id, req.body.proposal),
    updateOffer(req.params.id, req.body.offer)
  ]).then(() => {
    res.redirect('/FIXME'); // todo: redirect to follow-up form
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

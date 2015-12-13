'use strict';

const _ = require('lodash');
const ContributionService = require('../lib/contributionService');
const ProfileService = require('../lib/profileService');

const mailer = require('../lib/mailer');
const config = require('../lib/config');

const stripeFactory = require('../lib/stripe');//.instance();



function submitPaymentInfo(contributionId, paymentData) {
  let contribution;
  let profile;
  let stripeCustomerId;
  let proposal;
  let amount = paymentData.amount;
  let stripe = stripeFactory.systemInstance();
  return ContributionService.fetch(contributionId)
    .then((aContribution) => {
      if (!aContribution) {
        throw new Error(`contribution record not found for id: ${contributionId}`);
      }
      contribution = aContribution;
      profile = contribution.profileRef;
      if (!profile) {
        throw new Error(`profileRef missing for contributionId: ${contributionId}`);
      }
      if (profile.stripeCustomerId) {
        stripeCustomerId = profile.stripeCustomerId;
        return Promise.resolve('skip');
      } else {
        stripeCustomerId = profile._id;
        return stripe.createCustomer(stripeCustomerId, profile.email, profile.displayName)
          .then((result) => {
            console.log(`stripe create customer result: ${_.inspect(result)}`);
            return ProfileService.updateStripeCustomerId(profile._id, stripeCustomerId);
          }) //todo catch and handle error if strip customer already exists
      }
    })
    .then((result) => {
      console.log(`update cust id result: ${_.inspect(result)}`);
      // associate our captured payment information as the default payment source for the customer record
      return stripe.storePaymentSourceData(stripeCustomerId, paymentData);
    })
    .then((result) => {
      console.log(`stripe store payment result: ${_.inspect(result)}`);
      //todo: handle recurring payment as auto created plan?
      return stripe.performCharge(stripeCustomerId, amount, `contribution id: ${contributionId}`);
    })
    .then((result) => {
      console.log(`stripe perform charge result: ${_.inspect(result)}`);
      const updateData = {paidCapital: amount};
      updateData.status = contribution.isRecurring ? 'recurring' : 'paid';
      return ContributionService.save(contributionId, updateData);
    }).then((result) => {
      console.log(`contribution update result: ${_.inspect(result)}`);
      return ContributionService.fetch(contributionId);  // need to refetch to populate relations
    }).then((result) => {
      contribution = result;
      console.log(`refetched contribution: ${_.inspect(result)}`);
      proposal = contribution.proposalRef;
      proposal.paidCapitalTotal = proposal.paidCapitalTotal ? proposal.paidCapitalTotal : 0;
      proposal.paidCapitalTotal += amount;
      proposal.supporterCount = proposal.supporterCount ? proposal.supporterCount : 0;
      proposal.supporterCount++;
      console.log(`paid total: ${proposal.paidCapitalTotal}, supporter count: ${proposal.supporterCount}`);
      return proposal.save();
    }).then((result) => {
      console.log(`saved campaign: ${_.inspect(result)}`);
      return sendConfirmationEmail(contribution);
    }).then((result) => {
      console.log(`send confirmation email result: ${_.inspect(result)}`);
      return sendLoggingEmail(contribution);
    })
    .then((result) => {
      console.log(`send logging email result: ${_.inspect(result)}`);
      return {status: 'success', statusLink: buildStatusLink(contribution)};
    })

}


//const W4L_STATUS_URL = config.get('w4l').statusUrl;

function buildStatusLink(contribution) {
  const statusUrl = contribution.proposalRef.configAttrs.statusUrl;
  console.log(`statusUrl: ${statusUrl}`);
  return `${statusUrl}?c=${contribution._id}`;
}

function sendConfirmationEmail(contribution) {
  const to = contribution.profileRef.email;
  const subject = 'Donation Confirmation';
  const statusLink = buildStatusLink(contribution);
  let t = `Thank you ${contribution.profileRef.firstName} for your generation donation.\n`;
  t += `  amount: \$ ${contribution.paidCapital}\n`;
  t += `  recurrence: ${contribution.recurringInterval}\n\n`;
  t += `Your status page is:\n`;
  t += `  ${statusLink}\n`;

  return mailer.sendEmail({
    //from: theConfig.sender,
    to: to
    , subject: subject
    , text: t
  });

}

function sendLoggingEmail(contribution) {
  const to = 'w4l@colab.coop';
  const subject = 'donation made';
  const statusLink = buildStatusLink(contribution);
  let t = `name: ${contribution.profileRef.displayName}\n`;
  t += `amount: \$ ${contribution.paidCapital}\n`;
  t += `recurrence: ${contribution.recurringInterval}\n`;
  t += `status page: ${statusLink}\n`;

  return mailer.sendEmail({
    to: to
    , subject: subject
    , text: t
  });

}




module.exports = {
  submitPaymentInfo: submitPaymentInfo
};


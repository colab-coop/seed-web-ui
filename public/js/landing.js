'use strict';

module.exports = {
  onLandingPageLoad: function (stripePublicKey) {
    const ajaxify = require('/public/js/formHelpers').ajaxify;

    const handleGetInvolvedForm = (data, expandedDiv, containerDiv) => {
      const proposalId = data.match(/id=\"getInvolvedForm_(\w+)\"/)[1];
      expandedDiv.replaceWith(data);
      const form = $(`#getInvolvedForm_${proposalId}`);
      form.validator();
      ajaxify(form, null, () =>
        ajaxify($("#payment-form"), (form, done) => {
          form.find('button').prop('disabled', true);
          Stripe.setPublishableKey(stripePublicKey);
          Stripe.card.createToken(form, function (status, response) {
            if (response.error) {
              // Show the errors on the form
              form.find('.payment-errors').text(response.error.message);
              form.find('button').prop('disabled', false);
            } else {
              // response contains id and card, which contains additional card details
              const token = response.id;
              // Insert the token into the form so it gets submitted to the server
              form.append($('<input type="hidden" name="stripeToken" />').val(token));
              // and submit
              done();
            }
          });
        })
      );
      $.scrollTo(containerDiv, 1000);
    };


    const seedMore = $("#seedMore");
    seedMore.click((e) => {
        e.preventDefault();
        $.get("/seedMore", (data) => {
          handleGetInvolvedForm(data, $("#moreInfo"), seedMore);
        });
      }
    );

    const signupLink = $('#toSimpleSignup');

    const scrollToSignup = () => {
      const seedMore = $("#seedMore");
      const signupLink = $('#signupLink');
      $.scrollTo(seedMore, 1000);
    };

    signupLink.click((e) => {
      e.preventDefault();
      scrollToSignup();
    });

    if (window.location.hash === '#join') {
      scrollToSignup();
    }

    $(".learn_more").click((e) => {
        e.preventDefault();
        const target = $(e.target);
        const expandedDiv = $(`#${target.data('expanded-id')}`);
        const containerDiv = $(`#${target.data('container-id')}`);
        $.get(e.target.href, (data) => {
          handleGetInvolvedForm(data, expandedDiv, containerDiv);
        });
      }
    );

    ajaxify($("#startYourProjectForm"), null, () => {

      // turn on validator here... because reasons
      $('#proposalForm').validator();

      ajaxify($("#proposalForm"))
    });
    ajaxify($("#joinForm"));

  }
};

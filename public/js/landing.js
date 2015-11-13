'use strict';

module.exports = {
  onLandingPageLoad: function () {
    const ajaxify = require('/public/js/formHelpers').ajaxify;

    const handleGetInvolvedForm = (data, expandedDiv, containerDiv) => {
      const proposalId = data.match(/id=\"getInvolvedForm_(\w+)\"/)[1];
      expandedDiv.replaceWith(data);
      const form = $(`#getInvolvedForm_${proposalId}`);
      form.validator();
      ajaxify(form, () =>
        ajaxify($("#payment-form"))
      );
      $.scrollTo(containerDiv, 1000);
    }


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

    ajaxify($("#startYourProjectForm"), () => {

      // turn on validator here... because reasons
      $('#proposalForm').validator();

      ajaxify($("#proposalForm"))
    });
    ajaxify($("#joinForm"));

  }
};

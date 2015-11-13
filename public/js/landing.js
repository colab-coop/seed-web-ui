'use strict';

module.exports = {
  onLandingPageLoad: function () {
    const ajaxify = require('/public/js/formHelpers').ajaxify;

    const seedMore = $("#seedMore");
    seedMore.click((e) => {
        e.preventDefault();
        $.get("/seedMore", (data) => {
          $("#moreInfo").replaceWith(data);
          ajaxify($("#getInvolvedForm"));
          $.scrollTo(seedMore, 1000);
        });
      }
    );

    $(".learn_more").click((e) => {
        e.preventDefault();
        const target = $(e.target);
        const expandedDiv = $(`#${target.data('expanded-id')}`);
        const containerDiv = $(`#${target.data('container-id')}`);
        $.get(e.target.href, (data) => {
          expandedDiv.replaceWith(data);
          ajaxify($("#getInvolvedForm"));
          $.scrollTo(containerDiv, 1000);
        });
      }
    );

    ajaxify($("#startYourProjectForm"));
    ajaxify($("#joinForm"));

  }
};

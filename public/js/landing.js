'use strict';

module.exports = {
  onLandingPageLoad: function () {
    const seedMore = $("#seedMore");
    seedMore.click((e) => {
        e.preventDefault();
        $("#moreInfo").load("/seedMore", () => $.scrollTo(seedMore, 1000));
      }
    );

    $(".learn_more").click((e) => {
        e.preventDefault();
        const target = $(e.target);
        const expandedDiv = $(`#${target.data('expanded-id')}`);
        const containerDiv = $(`#${target.data('container-id')}`);
        expandedDiv.load(e.target.href, () => $.scrollTo(containerDiv, 1000));
      }
    );

    const startYourProjectForm = $("#startYourProjectForm");
    startYourProjectForm.submit((e) => {
      e.preventDefault();
      const form = $(e.target).ajaxSubmit();
      form.data('jqxhr').done((data, textStatus, jqXHR) => {
        startYourProjectForm.load(data.redirect);
      }).fail((data, textStatus, jqXHR) => {
        console.log(`Got ${status} from POST to ${e.target.action}`);
      })
    })


  }
};

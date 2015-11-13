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
  }
};

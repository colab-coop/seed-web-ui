'use strict';

module.exports = {
  onLandingPageLoad: function () {
    const seedMore = $("#seedMore");
    seedMore.click((e) => {
        e.preventDefault();
        $("#moreInfo").load("/seedMore", () => $.scrollTo(seedMore, 1000))
      }
    );

    $(".learn_more").click((e) => {
        e.preventDefault();
        $("#existingCoops").load(e.target.href, () => $.scrollTo($("#existingCoopsmoreInfo"), 750))
      }
    );

  }
};



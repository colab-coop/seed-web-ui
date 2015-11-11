'use strict';



module.exports = function (router) {

  require('./homeController').addRoutes(router);
  require('./meController').addRoutes(router);
  require('./voteController').addRoutes(router);  // beware, for now vote needs to come before proposal. todo: clean this up
  require('./proposalController').addRoutes(router);
  require('./sectorController').addRoutes(router);
  require('./contributionController').addRoutes(router);
  require('./offerController').addRoutes(router);
  require('./paymentController').addRoutes(router);
  require('./merchantConfigController').addRoutes(router);
  require('./onboardingController').addRoutes(router);

  require('./adminController').addRoutes(router);

};

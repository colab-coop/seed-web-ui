'use strict';



module.exports = function (router) {

  require('./homeController').addRoutes(router);
  require('./proposalController').addRoutes(router);
  require('./sectorController').addRoutes(router);
  require('./contributionController').addRoutes(router);
  require('./paymentController').addRoutes(router);

  require('./adminController').addRoutes(router);

};

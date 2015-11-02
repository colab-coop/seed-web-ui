'use strict';

var session = require('express-session');
var  RedisStore = require('connect-redis')(session);

module.exports = function (sessionConfig, redisConfig) {
  sessionConfig.store = new RedisStore(redisConfig);
  return session(sessionConfig);
};

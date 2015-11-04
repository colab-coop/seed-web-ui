'use strict';

const mongoose = require('mongoose');


const db = function () {
  return {
    config: function (conf) {
      mongoose.connect('mongodb://' + conf.host + '/' + conf.database);
      var db = mongoose.connection;
      db.on('error', console.error.bind(console, 'connection error:'));
      db.once('open', function callback() {
        console.log('db connection open');
      });
    }
  };
};

module.exports = db();

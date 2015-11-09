'use strict';

module.exports = {
  onVisionFormLoad: function () {
    $('#vision_form').validator();
    $('#description').characterCounter(640);
  }
};



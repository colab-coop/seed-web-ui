'use strict';

module.exports = {

  ajaxify: function(form, done = null) {
    form.submit((e) => {
      e.preventDefault();
      const jqxhr = $(e.target).ajaxSubmit().data('jqxhr');
      jqxhr.done((data, textStatus, jqXHR) => {
        $.get(data.redirect, (data) => {
          form.replaceWith(data);
          if (done) {
            done();
          }
        });
      }).fail((data, textStatus, jqXHR) => {
        console.log(`Got ${status} from POST to ${e.target.action}`);
      })
    })
  }

};

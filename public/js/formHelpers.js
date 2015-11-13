'use strict';

module.exports = {

  ajaxify: function(form, done = null) {
    form.submit((e) => {

      // ugly hack to prevent provisional signup with disabled submit button (by way of validator)
      if ($('#save')[0].classList.contains('disabled')) return;

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
        console.log(`Got ${data.status} from POST to ${e.target.action}`, data);

        const response = data.responseJSON || {};

        if (response.error === 'validation') {
          const messages = response.messages || ['Validation failed'];
          alert(messages.join('\n'));
        } else {
          alert('There was an unexpected error');
        }
      })
    })
  }

};

'use strict';

module.exports = {

  ajaxify: function (form, preprocessor = null, done = null) {
    console.log(`Ajaxifying ${form.selector}`);

    function doSubmit(e) {
      const jqxhr = form.ajaxSubmit().data('jqxhr');
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
    }

    form.validator().on('submit', (e) => {
      if (e.isDefaultPrevented()) return; // invalid
      e.preventDefault();

      if (preprocessor) {
        preprocessor(form, () =>  doSubmit(e))
      } else {
        doSubmit(e);
      }
    });
  }
};

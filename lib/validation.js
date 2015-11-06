const _ = require('lodash');

function validationMessages(err) {
  const messages = [];

  const reasons = {
    required: '% is required',
    // todo: handle other kinds of validation errors
    unknown: '% is invalid'
  };

  for (var attr in err.errors) {
    const error = err.errors[attr];
    const name = _.startCase(attr);
    const reason = reasons[error.kind] || reasons.unknown;

    if (attr === 'email' && /email/.exec(error.message)) {
      // Special case for email uniqueness
      messages.push("There's already an account with that email");
    } else {
      messages.push(reason.replace(/%/, _.startCase(attr)));
    }
  }

  return messages;
}

module.exports = {
  validationMessages: validationMessages
};

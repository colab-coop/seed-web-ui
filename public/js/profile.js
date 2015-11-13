'use strict';

module.exports = {
  onSignupFormLoad: function () {
    $('#signupForm').validator();
  },

  onSigninFormLoad: function () {
    $('#signinForm').validator();
  },

  onEditPasswordFormLoad: function () {
    $('#editPasswordForm').validator();
  },

  onEditProfileFormLoad: function () {
    $('#editProfileForm').validator();

    $('#location').typeahead(null, {
      displayKey: 'description',
      source: (new AddressPicker()).ttAdapter()
    });
  }
};

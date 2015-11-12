const _ = require('lodash');

//todo: move this into ProfileService


function updateProfile(profile, params) {
  _.assign(profile, _.pick(params, 'displayName', 'firstName', 'lastName', 'orgName', 'email', 'location', 'about', 'phone', 'address'));
  return profile.save();
}


module.exports = {
  updateProfile: updateProfile
};

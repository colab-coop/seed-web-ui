/**
 * A model for our user
 */
'use strict';
var _ = require('lodash');
var Promise = require("bluebird");
var mongoose = require("mongoose");
var bcrypt = require('bcrypt');
var crypto = require('../lib/crypto');
var baseModel = require('./baseModel');

var attributes = _.merge({
  email: {type: String, unique: true}  //Ensure logins are unique.
  , authenticationData: String //We'll store bCrypt hashed passwords.
  , role: String  //todo: don't think this is used or needed here
  , isAdmin: Boolean  //does this belong on Profile?
  , defaultProfileRef: {type: String, ref: 'Profile'}
  , name: String  //todo: move to Profile
}, baseModel.baseAttributes);

var modelFactory = function () {

  var schema = mongoose.Schema(attributes);

  /**
   * Helper function that hooks into the 'save' method, and replaces plaintext passwords with a hashed version.
   */
  //userSchema.pre('save', function (next) {
  //    var user = this;
  //
  //    //If the password has not been modified in this save operation, leave it alone (So we don't double hash it)
  //    if (user.isModified('password')) {
  //        //Encrypt it using bCrypt. Using the Sync method instead of Async to keep the code simple.
  //        var hashedPwd = bcrypt.hashSync(user.password, crypto.getCryptLevel());
  //        //Replace the plaintext pw with the Hash+Salted pw;
  //        user.password = hashedPwd;
  //    }
  //    //Continue with the save operation
  //    next();
  //});

  /**
   * Helper function that takes a plaintext password and compares it against the user's hashed password.
   * @param plainText
   * @returns true/false
   */
  schema.methods.passwordMatches = function (plainText) {
    var user = this;
    console.log("plainText: " + plainText + ", user id: " + user._id + ", auth data: " + user.authenticationData);
    return bcrypt.compareSync(plainText, user.authenticationData);
  };

  schema.methods.hasModeratorAccess = function() {
    if (this.isAdmin) {
      return true;
    }
    //if (hasAdminAccess()) {
    //  return true;
    //}
    if ((typeof this.defaultProfileRef) === 'string' || !this.defaultProfileRef) {
      console.warn(`hasModeratorAccess - profile object not fetched`);
      return false;
    } else {
      return this.defaultProfileRef.memberType === Profile.MEMBERSHIP_TYPES.full;
    }
  };

  schema.methods.hasAdminAccess = function() {
    //return isAdmin;
    return this.hasModeratorAccess();  //todo: change this once we have a good way to manage admins, for now treat full members as admins
  };


  schema.methods.toString = function () {
    return 'User[' + this._id + ', email: ' + this.name + ', profile: ' + this.defaultProfileRef + ']';
  };

  return mongoose.model('User', schema);
};

module.exports = new modelFactory();

'use strict';

/**
 * proposal.js
 *
 * @description :: represents either produce/service sector proposal, a specific enterprise, other kind of fund raising campaign
 */

const _ = require('lodash');
const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.Promise = Promise;
const baseModel = require('./baseModel');
const crate = require('mongoose-crate');
const S3 = require('mongoose-crate-s3')
const LocalFS = require('mongoose-crate-localfs');
const appRoot = require('app-root-path');
const helpers = require('../lib/helpers');
const config = require('../lib/config');
const path = require('path');

const attributes = _.merge({
  profileRef: {type: String, ref: 'Profile'}
  , kind: String // campaign, sector, proposal
  , parentRef: {type: String, ref: 'Proposal'} // used for sector associations or child proposals
  , title: String
  , summary: String  // shown in list views, html
  , location: String
  , viewTemplate: String  // custom dust template to use to render the 'learn more' view for this campaign

  , paymentDetails: String // ? not sure what this needs to be... account? stripe?

  , socialMediaLinks: mongoose.Schema.Types.Mixed   // future

  , subType: String  // default, memberdrive
  // engagement flags
  , patronEnabled: Boolean
  , memberEnabled: Boolean
  , funderEnabled: Boolean

  , startingDate: Date  //needed?
  , closingDate: Date
  , needsTip: Boolean  // if true, then campaign succeeds or fails based on pledged vs goal. if false

  , minimumGoal: {type: Number, default: 0}
  , goalAmount: {type: Number, default: 0}

  // from form part 2... proposal_form.dust
  , minimumMembership: {type: Number, default: 1}
  , currentMembership: {type: Number, default: 0}
  , goalMembership: {type: Number, default: 1}
  , closingDate: String // should we use a datepicker here? Date data type? probably yes...
  , description: String   // rename this to 'story'?
  , impact: String
  , teamSummary: String
  , engagement: String
  , perks: String

  , goalUnits: String  //to support campaigns for # of units pre-sold, etc
  , merchantConfigRef: {type: String, ref: 'MerchantConfig'}
  , pledgedCapitalTotal: {type: Number, default: 0}
  , paidCapitalTotal: {type: Number, default: 0}
  , supporterCount: {type: Number, default: 0}  // total number of pledging users
}, baseModel.baseAttributes);


const KIND = {
  seedcoop: 'seedcoop'  // the special seed.coop campaign
  , campaign: 'campaign'
  , memberdrive: 'memberdrive'
  , sector: 'sector'
  , proposal: 'proposal'
  , vision: 'vision'
};

//todo figure out best way to handle select rendering
const KIND_OPTIONS = [
  {value: 'campaign', display: 'Campaign'}
  , {value: 'sector', display: 'Sector'}
  , {value: 'proposal', display: 'Proposal'}
  , {value: 'vision', display: 'Vision'}
];

function buildKindOptions(selectedValue, includeNone, noneDisplayArg) {
  //could probably do some clever currying here
  return helpers.buildOptionsFromList(KIND_OPTIONS, 'value', 'display', selectedValue, includeNone, noneDisplayArg);
}

// fields to directly populate from edit forms
const PARAM_FIELDS = [
  'kind', 'subType', 'parentRef', 'title', 'summary', 'location', 'description', 'viewTemplate'
  , 'patronEnabled', 'memberEnabled', 'funderEnabled', 'merchantConfigRef'
];

function copyParams(target, params) {
  const result = target || {};
  _.assign(result, _.pick(params, PARAM_FIELDS));
  // todo: make this generic from xxx_present form fields
  result.patronEnabled = params.patronEnabled;
  result.memberEnabled = params.memberEnabled;
  result.funderEnabled = params.funderEnabled;
  //if (params.goalAmount) {
  //  result.goalAmount = Number(params.goalAmount)
  //}
  _.assignNumericParam(result, params, 'goalAmount');
  if (params.closingDate) {
    result.closingDate = new Date(params.closingDate); //todo: need a way to remove, this will ignore if blank
  }
  return result;
}

const modelFactory = function () {

  const fileUploadConfig = config.get('fileUpload');
  const schema = mongoose.Schema(attributes);

  schema.methods.toString = function () {
    return 'Proposal[' + this._id + ', title: ' + this.title + ']';
  };

  // populate fields directly from post body
  schema.methods.assignParams = function (params) {
    copyParams(this, params);
  };


  schema.methods.attachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
      _this.attach('image', {path: path}, (err) => {
        if (err !== undefined) {
          reject(err);
        }
        else {
          _this.save().then(() => resolve(_this));
        }
      });
    });
  };

  schema.methods.detachImageAsync = function (path) {
    const _this = this;
    return new Promise(function (resolve, reject) {
      _this.image = null;
      _this.save().then(() => resolve(_this));
    });
  };

  schema.methods.imageUrl = function () {
    return fileUploadConfig.storage === 'S3' ? this.image.url : '/' + this.image.name;
  };

  const storage = fileUploadConfig.storage === 'S3'
    ? new S3({
    key: fileUploadConfig.S3ApiKey,
    secret: fileUploadConfig.S3Secret,
    bucket: fileUploadConfig.S3Bucket,
    region: fileUploadConfig.S3Region,
    path: (attachment) => '/' + path.basename(attachment.path)
  })
    : new LocalFS({
    directory: appRoot.resolve(fileUploadConfig.LocalFSFolder)
  });


  schema.plugin(crate, {
    storage: storage,
    fields: {
      image: {}
    }
  });

  var model = mongoose.model('Proposal', schema);
  model.KIND = KIND;
  model.KIND_OPTIONS = KIND_OPTIONS;
  model.buildKindOptions = buildKindOptions;
  model.copyParams = copyParams;
  return model;

};

module.exports = new modelFactory();

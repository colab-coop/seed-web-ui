
var SeedApi = {

//  var endpoint = 'http://seedbombing.dev.colab.coop';
//  var campaignId = 'NkvHV25Ql';

  endpoint: 'http://localhost:8000',
  campaignId: 'VJ7iA5cQg',

//  var endpoint = 'http://seed.stage.colab.coop';
//  var campaignId = 'N1bm2FjXx';
  apiKey: 'w4l',


  submitPledge: function(data, successHandler) {
    var uri = '/api/v1/campaign/' + data.campaignId + '/pledge.submit';
    invoke(uri, data, successHandler);
  },

  submitPaymentInfo: function(data, successHandler) {
    var uri = '/api/v1/contribution/' + data.contributionId + '/paymentInfo.submit';
    invoke(uri, data, successHandler);
  },

  fetchContributionStatus: function(data, successHandler) {
    var uri = '/api/v1/contribution/' + data.contributionId + '/status';
    invoke(uri, data, successHandler);
  },

  endRecurringContribution: function(data, successHandler) {
    var uri = '/api/v1/contribution/' + data.contributionId + '/endRecurring';
    invoke(uri, data, successHandler);
  },


  copyFormValues: function(data, form, fields) {
    for (i = 0; i < fields.length; i++) {
      data[fields[i]] = formValue(form, fields[i]);
    }
  },


  getParameterByName: function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  },

  invoke: invoke,
  formValue: formValue,

};

function endpoint() {
  return SeedApi.endpoint;
}

function campaignId() {
  return SeedApi.campaignId;
}

function apiKey() {
//  "use strict";
  return SeedApi.apiKey;
}

function invoke(uri, data, successHandler) {
  var url = endpoint() + uri;
  data.apiKey = apiKey();
  $.ajax({
    url: url
    , dataType: 'jsonp'
    , data: data
    , success: successHandler
    , error: function (xhr, status, error) {
      alert(status)
    }
  });
}

function formValue(form, field) {
  return form.elements[field].value;
}



//module.exports = SeedApi;

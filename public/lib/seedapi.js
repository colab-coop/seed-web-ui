
var SeedApiSinglton = (function() {

  var instance;

  function init() {

    //note: assumes a block like this is included subsequent to this library being loaded
    //SeedApi.setEndpoint('http://localhost:8000');
    //SeedApi.setApiKey('w4l');
    //SeedApi.setCampaignId('VJ7iA5cQg');

    var endpoint;
    var apiKey;
    var campaignId;  // the default campaign to use

    function joinMailingList(data, successHandler) {
      var campaignId = data.capaignId ? data.campaignId : getCampaignId();
      var uri = '/api/v1/campaign/' + campaignId + '/mailingList.join';
      invoke(uri, data, successHandler);
    }

    function submitPledge(data, successHandler) {
      var campaignId = data.capaignId ? data.campaignId : getCampaignId();
      var uri = '/api/v1/campaign/' + campaignId + '/pledge.submit';
      invoke(uri, data, successHandler);
    }

    function submitPaymentInfo(data, successHandler) {
      var uri = '/api/v1/contribution/' + data.contributionId + '/paymentInfo.submit';
      invoke(uri, data, successHandler);
    }

    function fetchContributionStatus(data, successHandler) {
      var uri = '/api/v1/contribution/' + data.contributionId + '/status';
      invoke(uri, data, successHandler);
    }

    function endRecurringContribution(data, successHandler) {
      var uri = '/api/v1/contribution/' + data.contributionId + '/endRecurring';
      invoke(uri, data, successHandler);
    }

    function fetchCampaignStatus(data, successHandler) {
      var campaignId = data.capaignId ? data.campaignId : getCampaignId();
      var uri = '/api/v1/campaign/' + campaignId + '/status';
      invoke(uri, data, successHandler);
    }


    function invoke(uri, data, successHandler) {
      var url = endpoint + uri;
      data.apiKey = apiKey;
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

    function copyFormValues(data, form, fields) {
      for (i = 0; i < fields.length; i++) {
        data[fields[i]] = formValue(form, fields[i]);
      }
    }

    function getParameterByName(name) {
      var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }


    function setEndpoint(s) {
      endpoint = s;
    }

    function setApiKey(s) {
      apiKey = s;
    }

    function setCampaignId(s) {
      campaignId = s;
    }

    function getCampaignId() {
      return campaignId;
    }

    return {
      joinMailingList: joinMailingList,
      submitPledge: submitPledge,
      submitPaymentInfo: submitPaymentInfo,
      fetchContributionStatus: fetchContributionStatus,
      endRecurringContribution: endRecurringContribution,
      fetchCampaignStatus: fetchCampaignStatus,
      invoke: invoke,
      copyFormValues: copyFormValues,
      formValue: formValue,
      getParameterByName: getParameterByName,
      setEndpoint: setEndpoint,
      setApiKey: setApiKey,
      setCampaignId: setCampaignId,
      getCampaignId: getCampaignId
    };
  }

  return {
    getInstance: function() {
      "use strict";
      if (!instance) {
        instance = init();
      }
      return instance;
    }
  };

})();

var SeedApi = SeedApiSinglton.getInstance();
window.SeedApi = SeedApi;



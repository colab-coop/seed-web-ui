'use strict';

const _ = require('lodash');


// render appropriate error page for given exception
function negotiate(req, res, err) {  // derived from sails.js lib/hooks//responses/defaults/negotiate.js
  console.log("inside negotiate - err: " + err);// + ", res.se: " + res.serverError);
  // Get access to response object (`res`)

  if (req.query.ajax) {
    if (err.name === 'ValidationError') {
      res.status(422).json({
        error: 'validation',
        messages: validationMessages(err)
      });
    } else {
      res.status(500).json({
        error: 'unknown',
        messages: [err.message]
      });
    }

    return;
  }

  let statusCode = 500;

  try {
    statusCode = err.status || 500;

    // Set the status
    // (should be taken care of by res.* methods, but this sets a default just in case)
    res.status(statusCode);

  } catch (e) {
  }

  const model = {url: req.url, err: err};
  // Respond using the appropriate custom response
  let template = '500';
  if (statusCode === 404) {
    template = '404';
  } else if (statusCode === 503) {
    template = '503';
  } else {
    template = '500';
  }
  res.render('errors/' + template, model);
}

function handleError(req, res, err) {
  console.error(err);
  return negotiate(req, res, err);
}

function passthrough(router, path) {
  router.get('/' + path, function (req, res) {
    res.render(path, {});
  });
}

/**
 * boilerplate handling of api calls.
 * @param req
 * @param res
 * @param logLabel - name of invoking method used for logging
 * @param promiseFunc - function which returns a promise which yields the api result
 */
function apiWrapper(req, res, promiseFunc, logLabel) {
  console.log(`apiWrapper - ${logLabel}`);
  let apiData;
  try {
    console.log(`${logLabel} - params: ${_.inspect(req.params)}, query: ${_.inspect(req.query)}`);
    apiData = {
      apiKey: req.query.apiKey
      , callback: req.query.callback
    };
    const response = {};
    promiseFunc(req, res)
      .then((result) => {
        console.log(`${logLabel} result: ${_.inspect(result)}`);
        response.result = result;
        renderApiResponse(res, apiData, response);
      })
      .catch((err) => {
        console.log(`${logLabel} error: ${err}, stack: ${err.stack}`);
        response.error = {message: err.toString(), stack: err.stack};
        renderApiResponse(res, apiData, response);
      });
  } catch (err) {
    console.log(`${logLabel} error: ${err}, stack: ${err.stack}`);
    const error = {message: err.toString(), stack: err.stack};
    renderApiResponse(res, apiData, {error: error});
  }
}

//example usage:
//function apiContributionStatus(req, res) {
//  helpers.apiWrapper(req, res, function(req) {
//    const contributionId = req.params.contributionId;
//    return fetchContributionStatus(contributionId)
//  }, 'apiContributionStatus');
//}


function renderApiResponse(res, apiData, response) {
  if (apiData && apiData.callback) {
    res.contentType("application/javascript; charset=UTF-8");
    res.send(`${apiData.callback}(${JSON.stringify(response)});`);
  } else {
    res.json(response);
  }
}


function buildOptionsFromList(list, valueKey, displayKey, selectedValue, includeNone, noneDisplayArg) {
  const noneDisplay = noneDisplayArg || 'None';
  let matched = false;
  //console.log(`list: ${list}`);
  const result = _.map(list, function(item) {
    const value = valueKey ? item[valueKey] : item;
    const display = displayKey ? item[displayKey] : value;
    const selected = (value === selectedValue);
    const option = { value: value, display: display, selected: selected};
    if (selected) {
      matched = true;
    }
    //console.log(`option: ${option}`);
    return option;
  });
  if (includeNone) {
    if (matched) {
      result.push({value: '', display: noneDisplay});
    } else {
      result.push({value: '', display: noneDisplay, selected: true});
    }
  }
  return result;
}

function validationMessages(err) {
  const messages = [];

  const reasons = {
    required: '% is required',
    // todo: handle other kinds of validation errors
    unknown: '% is invalid'
  };

  const replacements = [
    [/to be unique/, '% is already in use']
  ];

  for (var attr in err.errors) {
    const error = err.errors[attr];
    const name = _.startCase(attr);

    var reason = reasons[error.kind];

    if (!reason) {
      const match = replacements.filter((replacement) => replacement[0].exec(error.message))[0];

      if (match) {
        reason = match[1];
      }
    }

    reason || (reason = reasons.unknown);
    messages.push(reason.replace(/%/, name));
  }

  return messages;
}


module.exports = {
  negotiate: negotiate
  , handleError: handleError
  , passthrough: passthrough
  , apiWrapper: apiWrapper
  , renderApiResponse: renderApiResponse
  , buildOptionsFromList: buildOptionsFromList
  , validationMessages: validationMessages
}

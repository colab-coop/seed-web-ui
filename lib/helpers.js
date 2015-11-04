'use strict';

const _ = require('lodash');


// render appropriate error page for given exception
function negotiate(req, res, err) {  // derived from sails.js lib/hooks//responses/defaults/negotiate.js
  console.log("inside negotiate - err: " + err);// + ", res.se: " + res.serverError);
  // Get access to response object (`res`)

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


function buildOptionsFromList(list, valueKey, displayKey, selectedValue, includeNone, noneDisplayArg) {
  const noneDisplay = noneDisplayArg || 'None';
  let matched = false;
  console.log(`list: ${list}`);
  const result = _.map(list, function(item) {
    const value = valueKey ? item[valueKey] : item;
    const display = displayKey ? item[displayKey] : value;
    const selected = (value === selectedValue);
    const option = { value: value, display: display, selected: selected};
    if (selected) {
      matched = true;
    }
    console.log(`option: ${option}`);
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



module.exports = {
  negotiate: negotiate
  , handleError: handleError
  , passthrough: passthrough
  , buildOptionsFromList: buildOptionsFromList
}


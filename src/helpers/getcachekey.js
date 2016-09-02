var _ = require("lodash");

var getCacheKey = function(request, prefix, defaults) {
  var cachePrefix = prefix;
  if (cachePrefix) {
    cachePrefix = _.trim(cachePrefix);
    if (!_.isEmpty(cachePrefix) && !_.endsWith(cachePrefix, ":")) {
      cachePrefix += ":";
    }
  } else {
    cachePrefix = "";
  }

  var sortedQueryString = "";
  if (request.query) {
    var query = _.omitBy(request.query, _.isNil);
    query = _.defaults(query, defaults);
    if (!_.isEmpty(query)) {
      sortedQueryString = "?" + _(query).keys().sortBy().map(key => `${key}=${query[key]}`).join("&");
    }
  }

  var cacheKey = `${cachePrefix}${request.method}:${request.path}${sortedQueryString}`;
  return cacheKey;
};

module.exports = getCacheKey;

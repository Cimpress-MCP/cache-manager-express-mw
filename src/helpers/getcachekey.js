const _ = require("lodash");

const getCacheKey = function({ request, options: { prefix, defaults } = {} }) {
  let cachePrefix = prefix;
  if (cachePrefix) {
    cachePrefix = _.trim(cachePrefix);
    if (!_.isEmpty(cachePrefix) && !_.endsWith(cachePrefix, ":")) {
      cachePrefix += ":";
    }
  } else {
    cachePrefix = "";
  }

  let sortedQueryString = "";
  if (request.query) {
    let query = _.omitBy(request.query, _.isNil);
    query = _.defaults(query, defaults);
    if (!_.isEmpty(query)) {
      sortedQueryString = "?" + _(query).keys().sortBy().map(key => `${key}=${query[key]}`).join("&");
    }
  }

  const cacheKey = `${cachePrefix}${request.method}:${request.path}${sortedQueryString}`;
  return cacheKey;
};

module.exports = getCacheKey;

const _ = require("lodash");

const getCacheKey = function({ request, options: { prefix, headers, defaults } = {} }) {
  let cachePrefix = prefix;
  if (cachePrefix) {
    cachePrefix = _.trim(cachePrefix);
    if (!_.isEmpty(cachePrefix) && !_.endsWith(cachePrefix, ":")) {
      cachePrefix += ":";
    }
  } else {
    cachePrefix = "";
  }

  const headerInfix = getHeaderInfix(request, headers);

  let sortedQueryString = "";
  if (request.query) {
    let query = _.omitBy(request.query, _.isNil);
    query = _.defaults(query, defaults);
    if (!_.isEmpty(query)) {
      sortedQueryString = "?" + _(query).keys().sortBy().map(key => `${key}=${query[key]}`).join("&");
    }
  }

  const cacheKey = `${cachePrefix}${request.method}${headerInfix}:${request.path}${sortedQueryString}`;
  return cacheKey;
};

const getHeaderInfix = function(request, headers) {
  if (!headers) {
    return "";
  }

  if (_.isString(headers)) {
    headers = [ headers ];
  }

  let headerInfix = _(headers)
    .sort()
    .map(header => _.toLower(header))
    .map(header => `${header}:${request.get(header)}`)
    .join(":");

  return `:${headerInfix}`;
};

module.exports = getCacheKey;

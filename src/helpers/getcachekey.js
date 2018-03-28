const _defaults = require("lodash.defaults"),
  _endsWith = require("lodash.endswith"),
  _isEmpty = require("lodash.isempty"),
  _isNil = require("lodash.isnil"),
  _isString = require("lodash.isstring"),
  _keys = require("lodash.keys"),
  _map = require("lodash.map"),
  _omitBy = require("lodash.omitby"),
  _toLower = require("lodash.tolower"),
  _trim = require("lodash.trim");

const getCacheKey = ({ request, options: { prefix, headers, defaults } = {} }) => {
  let cachePrefix = prefix;
  if (cachePrefix) {
    cachePrefix = _trim(cachePrefix);
    if (!_isEmpty(cachePrefix) && !_endsWith(cachePrefix, ":")) {
      cachePrefix += ":";
    }
  } else {
    cachePrefix = "";
  }

  const headerInfix = getHeaderInfix(request, headers);

  let sortedQueryString = "";
  if (request.query) {
    let query = _omitBy(request.query, _isNil);
    query = _defaults(query, defaults);
    if (!_isEmpty(query)) {
      sortedQueryString = "?" + _map(_keys(query).sort(), key => `${key}=${query[key]}`).join("&");
    }
  }

  const cacheKey = `${cachePrefix}${request.method}${headerInfix}:${request.path}${sortedQueryString}`;
  return cacheKey;
};

const getHeaderInfix = (request, headers) => {
  if (!headers) {
    return "";
  }

  if (_isString(headers)) {
    headers = [ headers ];
  }

  let headerInfix =
    _map(_map(headers.sort(), header => _toLower(header)), header => `${header}:${request.get(header)}`).join(":");

  return `:${headerInfix}`;
};

module.exports = getCacheKey;

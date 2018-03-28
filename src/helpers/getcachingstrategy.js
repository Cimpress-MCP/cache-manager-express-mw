const _toInteger = require("lodash.tointeger"),
  _toLower = require("lodash.tolower"),
  _trim = require("lodash.trim");

const getCachingStrategy = ({ response }) => {
  const cacheControlHeader = response.get("cache-control");
  if (!cacheControlHeader) {
    return;
  }
  const match = cacheControlHeader.match(/((.*),\s+?)?max-age=(\d+).*/);
  if (!match || match.length !== 4) {
    return;
  }

  const result = { maxAge: _toInteger(match[3]) };

  const accessibility = _toLower(_trim(match[2]));
  if (accessibility === "public" || accessibility === "private") {
    result.accessibility = accessibility;
  }

  return result;
};

module.exports = getCachingStrategy;

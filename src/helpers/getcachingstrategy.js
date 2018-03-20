const _ = require("lodash");

const getCachingStrategy = function({ response }) {
  const cacheControlHeader = response.get("cache-control");
  if (!cacheControlHeader) {
    return;
  }
  const match = cacheControlHeader.match(/((.*),\s+?)?max-age=(\d+).*/);
  if (!match || match.length !== 4) {
    return;
  }

  const result = { maxAge: _.toInteger(match[3]) };

  const accessibility = _.toLower(_.trim(match[2]));
  if (accessibility === "public" || accessibility === "private") {
    result.accessibility = accessibility;
  }

  return result;
};

module.exports = getCachingStrategy;

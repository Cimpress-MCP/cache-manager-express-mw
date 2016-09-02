var _ = require("lodash");

var getCachingStrategy = function(res) {
  var cacheControlHeader = res.get("cache-control");
  if (!cacheControlHeader) {
    return;
  }
  var match = cacheControlHeader.match(/((.*),\s+?)?max-age=(\d+).*/);
  if (!match || match.length !== 4) {
    return;
  }

  var result = { maxAge: _.toInteger(match[3]) };

  var accessibility = _.toLower(_.trim(match[2]));
  if (accessibility === "public" || accessibility === "private") {
    result.accessibility = accessibility;
  }

  return result;
};

module.exports = getCachingStrategy;

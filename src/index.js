var _                  = require("lodash"),
    getCacheKey        = require("./helpers/getcachekey.js"),
    getCachingStrategy = require("./helpers/getcachingstrategy.js"),
    Promise            = require("bluebird");

var caching = function(cache, options) {
  var isProduction = function() {
    return process.env.NODE_ENV === "production";
  };

  var getValue = function(key) {
    if (options.callbacks.onAttempt) {
      options.callbacks.onAttempt(key);
    }
    var cacheGet = Promise.promisify(cache.get);
    return cacheGet(key)
      .catch(err => {
        if (!isProduction()) {
          console.warn("Error retrieving value from cache: " + err);
        }
        if (options.callbacks.onError) {
          options.callbacks.onError(err, key);
        }
      });
  };

  var getTtl = function(key) {
    if (typeof cache.ttl !== "function") {
      return Promise.resolve();
    }
    var cacheTtl = Promise.promisify(cache.ttl);
    return cacheTtl(key)
      .catch(err => {
        if (!isProduction()) {
          console.warn("Error retrieving ttl from cache: " + err);
        }
      });
  };

  var setCacheControlHeader = function(res, accessibility, ttl) {
    if (ttl) {
      if (accessibility) {
        res.set("cache-control", `${accessibility}, max-age=${ttl}`);
      } else {
        res.set("cache-control", `max-age=${ttl}`);
      }
    }
  };

  var handleCacheHit = function(res, key, value) {
    if (!value) {
      return Promise.resolve(false);
    }

    if (options.callbacks.onHit) {
      options.callbacks.onHit(key, value);
    }

    return getTtl(key)
      .then(ttl => setCacheControlHeader(res, value.accessibility, ttl))
      .then(() => {
        // This is dumb, but it results in a prettier JSON format
        try {
          var obj = JSON.parse(value.body);
          res.status(value.statusCode).json(obj);
        } catch (err) {
          res.status(value.statusCode).send(value.body);
        }
      })
      .return(true)
      .catch(err => false);
  };

  var handleCacheMiss = function(res, key) {
    if (options.callbacks.onMiss) {
      options.callbacks.onMiss(key);
    }
    var send = res.send.bind(res);

    res.send = function(body) {
      var ret = send(body);

      if (/^2/.test(res.statusCode)) {
        var cachingStrategy = getCachingStrategy(res);
        if (cachingStrategy) {
          var cacheSet = Promise.promisify(cache.set);
          var cacheValue = {
            statusCode: res.statusCode,
            body: body,
            accessibility: cachingStrategy.accessibility
          };
          cacheSet(key, cacheValue, { ttl: cachingStrategy.maxAge })
            .catch(err => {
              if (!isProduction()) {
                console.warn("Error setting value in cache: " + err);
              }
            });
        }
      }

      return ret;
    };
  };

  var middleware = function(req, res, next) {
    if (!cache) {
      next();
      return;
    }

    var key = getCacheKey(req, _.get(options, "prefix"), _.get(options, "defaults"));
    getValue(key)
      .then(value => handleCacheHit(res, key, value))
      .then(isHit => {
        if (!isHit) {
          handleCacheMiss(res, key);
          next();
        }
      })
      .catch(err => {
        if (!isProduction()) {
          console.warn("Error accessing cache: " + err);
        }
        next();
      });
  };

  return middleware;
};

module.exports = caching;

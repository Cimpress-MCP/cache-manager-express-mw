const _get = require("lodash.get"),
  getCacheKey = require("./helpers/getcachekey.js"),
  getCachingStrategy = require("./helpers/getcachingstrategy.js"),
  P = require("bluebird");

const caching = ({ cache, options }) => {
  const isProduction = () => process.env.NODE_ENV === "production";

  const getValue = key => {
    if (_get(options, "callbacks.onAttempt")) {
      options.callbacks.onAttempt(key);
    }
    const cacheGet = P.promisify(cache.get);
    return cacheGet(key)
      .catch(err => {
        if (!isProduction()) {
          console.warn("Error retrieving value from cache: " + err);
        }
        if (_get(options, "callbacks.onError")) {
          options.callbacks.onError(err, key);
        }
      });
  };

  const getTtl = key => {
    if (typeof cache.ttl !== "function") {
      return P.resolve();
    }
    const cacheTtl = P.promisify(cache.ttl);
    return cacheTtl(key)
      .catch(err => {
        if (!isProduction()) {
          console.warn("Error retrieving ttl from cache: " + err);
        }
        if (_get(options, "callbacks.onError")) {
          options.callbacks.onError(err, key);
        }
      });
  };

  const setCacheControlHeader = (res, accessibility, ttl) => {
    if (ttl) {
      if (accessibility) {
        res.set("cache-control", `${accessibility}, max-age=${ttl}`);
      } else {
        res.set("cache-control", `max-age=${ttl}`);
      }
    }
  };

  const handleCacheHit = (res, key, value) => {
    if (!value) {
      return P.resolve(false);
    }

    if (_get(options, "callbacks.onHit")) {
      options.callbacks.onHit(key, value);
    }

    return getTtl(key)
      .then(ttl => setCacheControlHeader(res, value.accessibility, ttl))
      .then(() => {
        // This is dumb, but it results in a prettier JSON format
        try {
          const obj = JSON.parse(value.body);
          res.status(value.statusCode).json(obj);
        } catch (err) {
          res.status(value.statusCode).send(value.body);
        }
      })
      .return(true);
  };

  const handleCacheMiss = (res, key) => {
    if (_get(options, "callbacks.onMiss")) {
      options.callbacks.onMiss(key);
    }
    const send = res.send.bind(res);

    res.send = body => {
      const ret = send(body);

      if (/^2/.test(res.statusCode) || /^304$/.test(res.statusCode)) {
        const cachingStrategy = getCachingStrategy({ response: res });
        if (cachingStrategy) {
          const cacheSet = P.promisify(cache.set);
          const cacheValue = {
            statusCode: res.statusCode,
            body: body,
            accessibility: cachingStrategy.accessibility
          };
          cacheSet(key, cacheValue, { ttl: cachingStrategy.maxAge })
            .catch(err => {
              if (!isProduction()) {
                console.warn("Error setting value in cache: " + err);
              }
              if (_get(options, "callbacks.onError")) {
                options.callbacks.onError(err, key);
              }
            });
        }
      }

      return ret;
    };
  };

  const middleware = (req, res, next) => {
    if (!cache) {
      next();
      return;
    }

    const key = getCacheKey({ request: req, options });
    getValue(key)
      .then(value => handleCacheHit(res, key, value))
      .then(isHit => {
        if (!isHit) {
          handleCacheMiss(res, key);
          next();
        }
      });
  };

  return middleware;
};

module.exports = caching;

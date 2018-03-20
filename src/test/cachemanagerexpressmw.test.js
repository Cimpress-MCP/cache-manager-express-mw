const _                   = require("lodash"),
      assert              = require("chai").assert,
      chai                = require("chai"),
      cacheManagerExpress = require("../index.js"),
      expect              = require("chai").expect,
      P                   = require("bluebird"),
      spies               = require("chai-spies"),
      uuid                = require("uuid/v4");

chai.use(spies);

describe("CacheManagerExpress", function() {
  let context;

  beforeEach(function() {
    context = { };

    context.cache = { };

    context.ttl = 600;
    context.cacheWrapper = {
      get: chai.spy(function(key, cb) {
        cb(undefined, context.cache[key]);
      }),
      set: chai.spy(function(key, value, options, cb) {
        context.cache[key] = value;
        cb();
      }),
      ttl: chai.spy(function(key, cb) {
        cb(undefined, 600);
      })
    };

    context.options = {
      callbacks: {
        onHit: chai.spy(function() { }),
        onMiss: chai.spy(function() { }),
        onError: chai.spy(function() { }),
        onAttempt: chai.spy(function() { })
      }
    };

    context.cachingMiddleware = cacheManagerExpress({ cache: context.cacheWrapper, options: context.options });

    context.request = { method: "GET", path: "/a/b/c" };

    context.send = chai.spy(function() {
      context.isDone = true;
    });
    context.status = chai.spy(function(statusCode) {
      context.response.statusCode = statusCode;
      return context.response;
    });

    context.accessibility = "private";
    context.maxAge = 12345;
    context.response = {
      get: chai.spy(function() {
        return `${context.accessibility}, max-age=${context.maxAge}`;
      }),
      set: chai.spy(function(header, value) {
        context.cacheControlHeaderValue = value;
      }),
      send: context.send,
      status: context.status
    };

    context.statusCode = 200;
    context.body = JSON.stringify({ id: uuid() });
    context.next = chai.spy(function() {
      context.response.status(context.statusCode).send(context.body);
    });

    context.doneCondition = function() {
      return context.isDone;
    };
  });

  describe("Getting a request when there is no cache", function() {
    it("should result in no interaction with the cache", function() {
      context.cachingMiddleware = cacheManagerExpress({ options: context.options });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.not.have.property("GET:/a/b/c");
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.not.have.been.called();
        });
    });
  });

  describe("Getting a request that has not been cached before", function() {
    it("should cache the response successfully", function() {
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has not been cached before and options is undefined", function() {
    it("should cache the response successfully", function() {
      context.options = undefined;
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has been cached before", function() {
    it("should return the cached response successfully", function() {
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.have.been.called();
          expect(context).to.have.property("cacheControlHeaderValue").and
            .equal(`${context.accessibility}, max-age=${context.ttl}`);
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.not.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has been cached before and options in undefined", function() {
    it("should return the cached response successfully", function() {
      context.options = undefined;
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.have.been.called();
          expect(context).to.have.property("cacheControlHeaderValue").and
            .equal(`${context.accessibility}, max-age=${context.ttl}`);
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.not.have.been.called();
        });
    });
  });

  describe("Handling a response without a cache control header when it has not been cached", function() {
    it("should return but not cache the response", function() {
      context.response.get = chai.spy(function() {
        return null;
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.not.have.property("GET:/a/b/c");
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting an error when accessing the cache on a get", function() {
    it("should return the response successfully", function() {
      context.cacheWrapper.get = chai.spy(function(key, cb) {
        cb("The cache could not be reached.");
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting an error when accessing the cache on retrieving the ttl", function() {
    it("should return the response successfully", function() {
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cacheWrapper.ttl = chai.spy(function(key, cb) {
        cb("The cache could not be reached.");
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.not.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting an error when accessing the cache on a set", function() {
    it("should return the response successfully", function() {
      context.cacheWrapper.set = chai.spy(function(key, value, options, cb) {
        cb("The cache could not be reached.");
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.not.have.property("GET:/a/b/c");
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting an error when accessing the cache on a get and a set", function() {
    it("should return the response successfully", function() {
      context.cacheWrapper.get = chai.spy(function(key, cb) {
        cb("The cache could not be reached.");
      });
      context.cacheWrapper.set = chai.spy(function(key, value, options, cb) {
        cb("The cache could not be reached.");
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.not.have.property("GET:/a/b/c");
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has not been cached before with no accessibility on the response", function() {
    it("should cache the response successfully", function() {
      context.response.get = chai.spy(function() {
        return `max-age=${context.ttl}`;
      });
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.response.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: undefined });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has been cached with no accessibility on the response", function() {
    it("should return the cached response successfully", function() {
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: undefined
      };
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.cacheWrapper.ttl).to.be.a.spy.and.to.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.have.been.called();
          expect(context).to.have.property("cacheControlHeaderValue").and.equal(`max-age=${context.ttl}`);
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: undefined });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.not.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has been cached but the cache does not support retrieving the ttl", function() {
    it("should return the cached response successfully but without a cache control header", function() {
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cacheWrapper.ttl = null;
      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
          expect(context.response.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context).to.not.have.property("cacheControlHeaderValue");
          expect(context.response.get).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cacheWrapper.set).to.be.a.spy.and.to.not.have.been.called();
          expect(context.cache).to.exist.and.be.an("object");
          expect(context.cache).to.have.property("GET:/a/b/c").and.deep
            .equal({ statusCode: context.statusCode, body: context.body, accessibility: context.accessibility });
          expect(context.status).to.be.a.spy.and.to.have.been.called();
          expect(context.send).to.be.a.spy.and.to.have.been.called();
          expect(context.next).to.be.a.spy.and.to.not.have.been.called();

          expect(context.options.callbacks.onHit).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  const checkDone = function(condition, maxCount, delay) {
    const result = condition();
    const _delay = delay || 20;
    const _maxCount = !_.isNil(maxCount) ? maxCount : 5;

    if (!result) {
      if (_maxCount > 0) {
        return P.delay(_delay)
          .then(() => checkDone(condition, _maxCount - 1, _delay));
      }

      throw new Error("Task did not finish before timeout exceeded.");
    }

    return P.resolve(result);
  };
});

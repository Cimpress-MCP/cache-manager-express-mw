const _isNil = require("lodash.isnil"),
  assert = require("chai").assert,
  chai = require("chai"),
  cacheManagerExpress = require("../index.js"),
  expect = require("chai").expect,
  P = require("bluebird"),
  spies = require("chai-spies"),
  uuid = require("uuid/v4");

chai.use(spies);

describe("CacheManagerExpress", () => {
  let context;

  beforeEach(() => {
    context = {};

    context.cache = {};

    context.ttl = 600;
    context.cacheWrapper = {
      get: chai.spy((key, cb) => cb(undefined, context.cache[key])),
      set: chai.spy((key, value, options, cb) => {
        context.cache[key] = value;
        return cb();
      }),
      ttl: chai.spy((key, cb) => cb(undefined, 600))
    };

    context.options = {
      callbacks: {
        onHit: chai.spy(() => { }),
        onMiss: chai.spy(() => { }),
        onError: chai.spy(() => { }),
        onAttempt: chai.spy(() => { })
      }
    };

    context.cachingMiddleware = cacheManagerExpress({ cache: context.cacheWrapper, options: context.options });

    context.request = { method: "GET", path: "/a/b/c" };

    context.send = chai.spy(() => context.isDone = true);
    context.status = chai.spy(statusCode => {
      context.response.statusCode = statusCode;
      return context.response;
    });

    context.accessibility = "private";
    context.maxAge = 12345;
    context.response = {
      get: chai.spy(() => `${context.accessibility}, max-age=${context.maxAge}`),
      set: chai.spy((header, value) => context.cacheControlHeaderValue = value),
      send: context.send,
      status: context.status
    };

    context.statusCode = 200;
    context.body = JSON.stringify({ id: uuid() });
    context.next = chai.spy(() => context.response.status(context.statusCode).send(context.body));

    context.doneCondition = () => context.isDone;
  });

  describe("Getting a request when there is no cache", () => {
    it("should result in no interaction with the cache", () => {
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

  describe("Getting a request that has not been cached before", () => {
    it("should cache the response successfully", () => {
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

  describe("Getting a request that has not been cached before and the service returns a 304", () => {
    it("should cache the response successfully", () => {
      context.statusCode = 304;

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

  describe("Getting a request that has not been cached before and the service returns a 500", () => {
    it("should not cache the response", () => {
      context.statusCode = 500;

      context.cachingMiddleware(context.request, context.response, context.next);
      return checkDone(context.doneCondition)
        .then(() => {
          expect(context.cacheWrapper.get).to.be.a.spy.and.to.have.been.called();
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
          expect(context.options.callbacks.onMiss).to.be.a.spy.and.to.have.been.called();
          expect(context.options.callbacks.onError).to.be.a.spy.and.to.not.have.been.called();
          expect(context.options.callbacks.onAttempt).to.be.a.spy.and.to.have.been.called();
        });
    });
  });

  describe("Getting a request that has not been cached before and no callbacks are defined", () => {
    it("should not cause an error", () => {
      context.options.callbacks = {};

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

  describe("Getting a request that has not been cached before and options is undefined", () => {
    it("should cache the response successfully", () => {
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

  describe("Getting a request that has been cached before and no callbacks are defined", () => {
    it("should not cause an error", () => {
      context.options.callbacks = {};

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

  describe("Getting a request that has been cached before and options in undefined", () => {
    it("should return the cached response successfully", () => {
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

  describe("Handling a response without a cache control header when it has not been cached", () => {
    it("should return but not cache the response", () => {
      context.response.get = chai.spy(() => { });
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

  describe("Getting an error when accessing the cache on a get", () => {
    it("should return the response successfully", () => {
      context.cacheWrapper.get = chai.spy((key, cb) => cb("The cache could not be reached."));
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

  describe("Getting an error when accessing the cache on a get and no callbacks are defined", () => {
    it("should not cause an error", () => {
      context.options.callbacks = {};

      context.cacheWrapper.get = chai.spy((key, cb) => cb("The cache could not be reached."));
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

  describe("Getting an error when accessing the cache on retrieving the ttl", () => {
    it("should return the response successfully", () => {
      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cacheWrapper.ttl = chai.spy((key, cb) => cb("The cache could not be reached."));
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

  describe("Getting an error when accessing the cache on retrieving the ttl and no callbacks are defined", () => {
    it("should not cause an error", () => {
      context.options.callbacks = {};

      context.cache["GET:/a/b/c"] = {
        statusCode: context.statusCode,
        body: context.body,
        accessibility: context.accessibility
      };
      context.cacheWrapper.ttl = chai.spy((key, cb) => cb("The cache could not be reached."));
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
        });
    });
  });

  describe("Getting an error when accessing the cache on a set", () => {
    it("should return the response successfully", () => {
      context.cacheWrapper.set = chai.spy((key, value, options, cb) => cb("The cache could not be reached."));
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

  describe("Getting an error when accessing the cache on a set and no callbacks are defined", () => {
    it("should not cause an error", () => {
      context.options.callbacks = {};

      context.cacheWrapper.set = chai.spy((key, value, options, cb) => cb("The cache could not be reached."));
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
        });
    });
  });

  describe("Getting an error when accessing the cache on a get and a set", () => {
    it("should return the response successfully", () => {
      context.cacheWrapper.get = chai.spy((key, cb) => cb("The cache could not be reached."));
      context.cacheWrapper.set = chai.spy((key, value, options, cb) => cb("The cache could not be reached."));
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

  describe("Getting a request that has not been cached before with no accessibility on the response", () => {
    it("should cache the response successfully", () => {
      context.response.get = chai.spy(() => `max-age=${context.ttl}`);
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

  describe("Getting a request that has been cached with no accessibility on the response", () => {
    it("should return the cached response successfully", () => {
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

  describe("Getting a request that has been cached but the cache does not support retrieving the ttl", () => {
    it("should return the cached response successfully but without a cache control header", () => {
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

  const checkDone = (condition, maxCount, delay) => {
    const result = condition();
    const _delay = delay || 20;
    const _maxCount = !_isNil(maxCount) ? maxCount : 5;

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

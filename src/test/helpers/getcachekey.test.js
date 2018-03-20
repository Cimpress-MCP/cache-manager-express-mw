const getCacheKey = require("../../helpers/getcachekey.js"),
      expect      = require("chai").expect;

describe("GetCacheKey", () => {
  let context;

  beforeEach(() => {
    context = { };

    context.request = {
      method: "GET",
      path: "/a/b/c"
    };
  });

  describe("Getting a cache key for a request", () => {
    it("should return the expected key", () => {
      const key = getCacheKey({ request: context.request });
      expect(key).to.equal("GET:/a/b/c");
    });
  });

  describe("Getting a cache key for a request with a prefix", () => {
    it("should return the expected key", () => {
      const key = getCacheKey({ request: context.request, options: { prefix: "MyPrefix" } });
      expect(key).to.equal("MyPrefix:GET:/a/b/c");
    });
  });

  describe("Getting a cache key for a request with a prefix with a colon suffix", () => {
    it("should return the expected key", () => {
      const key = getCacheKey({ request: context.request, options: { prefix: "MyPrefix:" } });
      expect(key).to.equal("MyPrefix:GET:/a/b/c");
    });
  });

  describe("Getting a cache key for a request with a query string", () => {
    it("should return the expected key", () => {
      context.request.query = { def: 123 };
      const key = getCacheKey({ request: context.request });
      expect(key).to.equal("GET:/a/b/c?def=123");
    });
  });

  describe("Getting a cache key for a request with a query string with no values", () => {
    it("should return the expected key", () => {
      context.request.query = { def: null };
      const key = getCacheKey({ request: context.request });
      expect(key).to.equal("GET:/a/b/c");
    });
  });

  describe("Getting a cache key for a request with a query string and a default value", () => {
    it("should return the expected key", () => {
      context.request.query = { def: 123 };
      const key = getCacheKey({ request: context.request, options: { defaults: { ghi: false } } });
      expect(key).to.equal("GET:/a/b/c?def=123&ghi=false");
    });

    it("should not be overwritten by the default value if present", () => {
      context.request.query = { def: 123 };
      const key = getCacheKey({ request: context.request, options: { defaults: { def: false } } });
      expect(key).to.equal("GET:/a/b/c?def=123");
    });
  });
});

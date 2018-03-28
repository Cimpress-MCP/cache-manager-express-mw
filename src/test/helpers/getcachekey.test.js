const expect = require("chai").expect,
  getCacheKey = require("../../helpers/getcachekey.js");

describe("GetCacheKey", () => {
  let context;

  beforeEach(() => {
    context = {};

    context.request = {
      method: "GET",
      path: "/a/b/c",
      get: (header) => {
        switch (header) {
          case "accept":
            return "application/json";
          case "authorization":
            return "Bearer abc123";
          default:
            return;
        }
      }
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

  describe("Getting a cache key for a request when a single header should be part of the key", () => {
    it("should return the expected key", () => {
      const key = getCacheKey({ request: context.request, options: { headers: "Authorization" } });
      expect(key).to.equal("GET:authorization:Bearer abc123:/a/b/c");
    });
  });

  describe("Getting a cache key for a request when headers should be part of the key", () => {
    it("should return the expected key", () => {
      const key = getCacheKey({ request: context.request, options: { headers: [ "Authorization", "Accept" ] } });
      expect(key).to.equal("GET:accept:application/json:authorization:Bearer abc123:/a/b/c");
    });
  });
});

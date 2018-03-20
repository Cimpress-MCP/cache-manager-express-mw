const getCachingStrategy = require("../../helpers/getcachingstrategy.js"),
      expect             = require("chai").expect;

describe("GetCachingStrategy", function() {
  let context;

  beforeEach(function() {
    context = { };

    context.response = {
      get: function() {
        return "private, max-age=12345";
      }
    };
  });

  describe("Getting the caching strategy from a response", function() {
    it("should return the appropriate strategy", function() {
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.have.property("accessibility").and.equal("private");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });

  describe("Getting the caching strategy from a response without a cache-control header", function() {
    it("should return undefined", function() {
      context.response.get = function() {
        return;
      };
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header missing accessibility", function() {
    it("should return only the max age", function() {
      context.response.get = function() {
        return "max-age=12345";
      };
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.not.have.property("accessibility");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });

  describe("Getting the caching strategy from a cache-control header missing the max age", function() {
    it("should return undefined", function() {
      context.response.get = function() {
        return "public";
      };
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header with invalid accessibility", function() {
    it("should return only the max age", function() {
      context.response.get = function() {
        return "protected, max-age=12345";
      };
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.not.have.property("accessibility");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });
});

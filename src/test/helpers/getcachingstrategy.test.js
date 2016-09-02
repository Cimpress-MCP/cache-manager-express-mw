var getCachingStrategy = require("../../helpers/getcachingstrategy.js"),
    expect             = require("chai").expect;

describe("GetCachingStrategy", function() {
  var context;

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
      var strategy = getCachingStrategy(context.response);
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
      var strategy = getCachingStrategy(context.response);
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header missing accessibility", function() {
    it("should return only the max age", function() {
      context.response.get = function() {
        return "max-age=12345";
      };
      var strategy = getCachingStrategy(context.response);
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
      var strategy = getCachingStrategy(context.response);
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header with invalid accessibility", function() {
    it("should return only the max age", function() {
      context.response.get = function() {
        return "protected, max-age=12345";
      };
      var strategy = getCachingStrategy(context.response);
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.not.have.property("accessibility");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });
});

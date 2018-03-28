const expect = require("chai").expect,
  getCachingStrategy = require("../../helpers/getcachingstrategy.js");

describe("GetCachingStrategy", () => {
  let context;

  beforeEach(() => {
    context = {};

    context.response = {
      get: () => "private, max-age=12345"
    };
  });

  describe("Getting the caching strategy from a response", () => {
    it("should return the appropriate strategy", () => {
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.have.property("accessibility").and.equal("private");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });

  describe("Getting the caching strategy from a response without a cache-control header", () => {
    it("should return undefined", () => {
      context.response.get = () => { };
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header missing accessibility", () => {
    it("should return only the max age", () => {
      context.response.get = () => "max-age=12345";
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.not.have.property("accessibility");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });

  describe("Getting the caching strategy from a cache-control header missing the max age", () => {
    it("should return undefined", () => {
      context.response.get = () => "public";
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.be.undefined;
    });
  });

  describe("Getting the caching strategy from a cache-control header with invalid accessibility", () => {
    it("should return only the max age", () => {
      context.response.get = () => "protected, max-age=12345";
      const strategy = getCachingStrategy({ response: context.response });
      expect(strategy).to.exist.and.be.an("object");
      expect(strategy).to.not.have.property("accessibility");
      expect(strategy).to.have.property("maxAge").and.equal(12345);
    });
  });
});

var _                   = require("lodash"),
    cacheManager        = require("cache-manager"),
    cacheManagerExpress = require("../../src/index.js"),
    express             = require("express"),
    redisStore          = require("cache-manager-redis");

var app = express();
var cacheOptions = {
  store: redisStore,
  retry_strategy: function() { // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
    return;
  }
};
var cache = cacheManager.caching(cacheOptions);

var callbacks = {
  onHit: function(key, value) {
    console.log(`Cache hit! key=${key}, value=${value.body}`);
  },
  onMiss: function(key) {
    console.log(`Cache miss! key=${key}`);
  },
  onError: function(err, key) {
    console.log(`Cache error! err=${err}, key=${key}`);
  },
  onAttempt: function(key) {
    console.log(`Cache attempt! key=${key}`);
  }
};
var options = { defaults: { toUpper: false }, callbacks: callbacks };

app.get("/", cacheManagerExpress(cache, options), function(req, res) {
  res.set("cache-control", `private, max-age=300`);
  return res.send("Hello World!");
});

app.get("/echo", cacheManagerExpress(cache, options), function(req, res) {
  if (req.query.message) {
    var message = req.query.message;
    if (req.query.toUpper) {
      message = _.toUpper(message);
    }
    res.set("cache-control", `private, max-age=300`);
    return res.send(message);
  }
  return res.status(400).send("No message specified.");
});

app.listen(3000, function() {
  console.log("Example app listening on port 3000!");
});

var _                   = require("lodash"),
    cacheManager        = require("cache-manager"),
    cacheManagerExpress = require("../../src/index.js"),
    express             = require("express"),
    redisStore          = require("cache-manager-redis");

var app = express();
var cache = cacheManager.caching({ store: redisStore });

app.get("/", cacheManagerExpress(cache), function(req, res) {
  res.set("cache-control", `private, max-age=300`);
  return res.send("Hello World!");
});

app.get("/echo", cacheManagerExpress(cache, { defaults: { toUpper: false } }), function(req, res) {
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

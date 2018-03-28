const _toUpper = require("lodash.toupper"),
  cacheManager = require("cache-manager"),
  cacheManagerExpress = require("cache-manager-express-mw"),
  express = require("express");

const app = express();
const cacheOptions = {
  store: "memory",
  retry_strategy: () => {} // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
};
const cache = cacheManager.caching(cacheOptions);

const callbacks = {
  onHit: (key, value) => console.log(`Cache hit! key=${key}, value=${value.body}`),
  onMiss: key => console.log(`Cache miss! key=${key}`),
  onError: (err, key) => console.log(`Cache error! err=${err}, key=${key}`),
  onAttempt: key => console.log(`Cache attempt! key=${key}`)
};
const options = { defaults: { toUpper: false }, callbacks: callbacks };

app.get("/", cacheManagerExpress({ cache, options }), (req, res) => {
  res.set("cache-control", `private, max-age=300`);
  return res.send("Hello World!");
});

app.get("/echo", cacheManagerExpress({ cache, options }), (req, res) => {
  if (req.query.message) {
    let message = req.query.message;
    if (req.query.toUpper) {
      message = _toUpper(message);
    }
    res.set("cache-control", `private, max-age=300`);
    return res.send(message);
  }
  return res.status(400).send("No message specified.");
});

app.listen(3000, () => console.log("Example app listening on port 3000!"));

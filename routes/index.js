const auth = require("./auth");
const user = require("./user");

function route(app) {
  app.use("/auth", auth);
  app.use("/user", user);
}

module.exports = route;

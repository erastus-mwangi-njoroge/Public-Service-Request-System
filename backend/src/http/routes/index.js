// Each file adds one area of the API to the router (open for extension: add a file, register it here).
const { Router } = require("../router");
const modules = [require("./catalogRoutes"), require("./authRoutes"), require("./staffRoutes"), require("./requestRoutes"), require("./documentRoutes"), require("./paymentRoutes")];
const buildRouter = (deps) => modules.reduce((router, register) => (register(router, deps), router), new Router());
module.exports = { buildRouter };

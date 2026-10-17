const { json } = require("../router");
const { requireUser } = require("../guards");
module.exports = (router, { paymentService }) => {
  router.post("/api/requests/:ref/pay", async (c) => json(202, await paymentService.pay(await c.user(), c.params.ref)), { guards: [requireUser("citizen")] });
  router.post("/api/mpesa/callback", async ({ body }) => json(200, await paymentService.handleCallback(body))); // called by Safaricom
};

const { json } = require("../router");
const { requireUser } = require("../guards");
module.exports = (router, { requestService }) => {
  router.get("/api/track/:ref", async ({ params }) => json(200, await requestService.track(params.ref))); // public, limited fields
  router.post("/api/requests", async (c) => json(201, await requestService.create(await c.user(), c.body)), { guards: [requireUser("citizen")] });
  router.get("/api/requests", async (c) => json(200, await requestService.listFor(await c.user())), { guards: [requireUser()] });
  router.patch("/api/requests/:ref/status", async (c) => json(200, await requestService.setStatus(await c.user(), c.params.ref, c.body)), { guards: [requireUser("officer", "admin")] });
  router.get("/api/stats", async (c) => json(200, await requestService.stats(await c.user())), { guards: [requireUser("officer", "admin")] });
};

const { json } = require("../router");
const { requireUser } = require("../guards");
module.exports = (router, { staffService }) => {
  const admin = { guards: [requireUser("admin")] };
  router.get("/api/staff", async () => json(200, await staffService.list()), admin);
  router.get("/api/sms", async () => json(200, await staffService.smsLogView()), admin);
  router.post("/api/staff", async ({ body }) => json(201, await staffService.create(body)), admin);
  router.patch("/api/staff/:id", async (c) => json(200, await staffService.update(await c.user(), c.params.id, c.body)), admin);
  router.post("/api/staff/:id/reset-password", async (c) => json(200, await staffService.resetPassword(await c.user(), c.params.id)), admin);
};

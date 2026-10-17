const { json } = require("../router");
const { requireUser, rateLimited } = require("../guards");
module.exports = (router, { authService, rateLimiter }) => {
  const limit = rateLimited(rateLimiter);
  router.post("/api/auth/register", async ({ body }) => json(201, await authService.register(body)), { guards: [limit] });
  router.post("/api/auth/login", async ({ body }) => json(200, await authService.login(body.idNumber, body.password)), { guards: [limit] });
  router.get("/api/me", async (c) => json(200, { user: authService.toPublic(await c.user()) }), { guards: [requireUser()] });
  router.post("/api/auth/forgot", async ({ body }) => json(200, await authService.requestReset(body.idNumber)), { guards: [limit] });
  router.post("/api/auth/reset", async ({ body }) => json(200, await authService.resetPassword(body)), { guards: [limit] });
  router.post("/api/auth/change-password", async (c) => json(200, await authService.changePassword(await c.user(), c.body.current, c.body.password)), { guards: [requireUser(), limit] });
};

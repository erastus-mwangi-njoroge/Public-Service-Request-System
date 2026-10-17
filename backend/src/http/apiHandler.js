// Builds the one function every adapter calls: HttpRequest in, response object out.
const { HttpError } = require("../domain/errors");
const { json } = require("./router");

function createApiHandler({ router, auth }) {
  return async function handle(req) {
    let user; // looked up once, and only if a guard or handler asks
    const ctx = { user: async () => (user === undefined ? (user = await auth.userFromToken((req.headers.authorization || "").replace("Bearer ", ""))) : user) };
    try { return await router.dispatch(req, ctx); }
    catch (e) {
      if (e instanceof HttpError) return json(e.code, { error: e.message });
      console.error(e); return json(500, { error: "Something went wrong on our side" });
    }
  };
}
module.exports = { createApiHandler };

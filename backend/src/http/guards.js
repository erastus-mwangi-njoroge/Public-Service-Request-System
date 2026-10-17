// Guards run before a handler and throw HttpError to stop the request.
const { HttpError } = require("../domain/errors");

const requireUser = (...roles) => async (ctx) => {
  const u = await ctx.user();
  if (!u) throw new HttpError(401, "Sign in first");
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, "Not allowed");
};
const rateLimited = (limiter) => async (ctx) => {
  if (await limiter.hit(ctx.req.ip)) throw new HttpError(429, "Too many attempts. Wait a minute.");
};
module.exports = { requireUser, rateLimited };

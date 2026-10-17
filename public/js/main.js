// Composition root of the front end: build the parts, hand them to each screen, start.
import { ApiClient } from "./core/api.js";
import { Session } from "./core/session.js";
import { Router } from "./core/router.js";
import { Navbar } from "./components/navbar.js";
import { renderFooter } from "./components/footer.js";
import { Documents } from "./components/documents.js";
import { register as services } from "./views/services.js";
import { register as auth } from "./views/auth.js";
import { register as account } from "./views/account.js";
import { register as apply } from "./views/apply.js";
import { register as mine } from "./views/mine.js";
import { register as track } from "./views/track.js";
import { register as staff } from "./views/staff.js";
import { register as officers } from "./views/officers.js";

(async () => {
  const session = new Session(), router = new Router(session);
  const api = new ApiClient({ getToken: () => session.token, onUnauthorized: () => { session.clear(); } });
  const catalog = await api.get("/services");
  if (session.token) try { session.user = (await api.get("/me")).user; } catch {}

  const app = { api, session, router, catalog, main: document.getElementById("main"), docs: new Documents({ api, limits: catalog.limits, refresh: () => {} }) };
  [services, auth, account, apply, mine, track, staff, officers].forEach((register) => register(app));

  new Navbar({ router, session, root: document.getElementById("site-header") });
  renderFooter(document.getElementById("site-footer"), { router, site: catalog.site });
  if (session.user && session.user.mustChange) location.hash = router.hashFor("account");
  router.start();
})();

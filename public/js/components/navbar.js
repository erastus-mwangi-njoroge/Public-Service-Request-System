import { $, esc } from "../core/dom.js";

// Top bar: brand, links (from the router registry), account actions, and a menu button on phones.
export class Navbar {
  constructor({ router, session, root }) {
    Object.assign(this, { router, session, root });
    router.onChange(() => this.render());
    session.onChange(() => this.render());
    root.addEventListener("click", (e) => this.onClick(e));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.setOpen(false); });
  }

  render() {
    const { router, session } = this, u = session.user, cur = router.current;
    this.root.innerHTML = `<div class="wrap bar">
      <a class="brand" href="${router.hashFor("services")}"><span class="crest" aria-hidden="true">M</span><span><b>Murang’a County</b><small>Service Portal</small></span></a>
      <button class="menu-btn" id="menu" aria-expanded="false" aria-controls="site-nav" aria-label="Menu"><span></span><span></span><span></span></button>
      <div class="bar-links" id="site-nav">
        <nav aria-label="Main">${router.navItems().map((r) => `<a href="${router.hashFor(r.name)}" ${r.name === cur ? 'aria-current="page"' : ""}>${esc(r.nav.label)}</a>`).join("")}</nav>
        <div class="who">${u ? `<a class="acct" href="${router.hashFor("account")}" title="My account">${esc(u.name)}</a><button type="button" data-act="out">Sign out</button>` : `<a class="btn-ghost" href="${router.hashFor("auth")}">Sign in</a>`}</div>
      </div></div>`;
  }

  setOpen(open) { const m = $("#menu", this.root); if (!m) return; m.setAttribute("aria-expanded", open); this.root.classList.toggle("open", open); }

  onClick(e) {
    if (e.target.closest("#menu")) return this.setOpen(!this.root.classList.contains("open"));
    if (e.target.closest("a")) this.setOpen(false);
    if (e.target.closest("[data-act=out]")) { this.session.clear(); this.router.go("services"); }
  }
}

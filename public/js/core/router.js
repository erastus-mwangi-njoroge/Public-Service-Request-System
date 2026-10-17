// Hash router with a registry. A screen registers itself once; the navbar and footer read the registry,
// so adding a screen never means editing the router or the navbar.
//   router.register({ name, render, nav: { label, order, visible(session) } })
export class Router {
  constructor(session) { this.session = session; this.routes = new Map(); this.current = null; this.arg = null; this.listeners = []; }
  register(route) { this.routes.set(route.name, route); return this; }
  onChange(fn) { this.listeners.push(fn); }

  navItems() {
    return [...this.routes.values()].filter((r) => r.nav && (!r.nav.visible || r.nav.visible(this.session))).sort((a, b) => a.nav.order - b.nav.order);
  }
  hashFor(name, arg) { return "#/" + name + (arg ? "/" + encodeURIComponent(arg) : ""); }
  parse() {
    const [name, arg] = location.hash.replace(/^#\/?/, "").split("/");
    return [this.routes.has(name) ? name : "services", arg ? decodeURIComponent(arg) : null];
  }
  go(name, arg) { // same address: just draw again (e.g. refresh after an action)
    if (location.hash === this.hashFor(name, arg)) return this.render(name, arg || null);
    location.hash = this.hashFor(name, arg);
  }
  start() { window.addEventListener("hashchange", () => this.render(...this.parse())); this.render(...this.parse()); }
  render(name, arg) {
    this.current = name; this.arg = arg;
    const main = document.getElementById("main"); main.onclick = main.onchange = null;
    this.listeners.forEach((f) => f(this));
    const route = this.routes.get(name);
    document.title = (route.title ? route.title + " · " : "") + "Murang’a County Service Portal";
    route.render(arg); window.scrollTo(0, 0);
  }
}

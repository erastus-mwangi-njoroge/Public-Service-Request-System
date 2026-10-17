import { kes } from "../core/format.js";
export function register(app) {
  app.router.register({ name: "services", title: "Services", nav: { label: "Services", order: 1 }, render() {
    app.main.innerHTML = `<h2>What do you need?</h2><p class="lead">Apply for county services, pay by M-Pesa and track your request.</p><div class="grid">` +
      app.catalog.services.map((s) => `<button class="svc" data-s="${s.id}"><b>${s.name}</b><small>${s.dept} · ${s.days} working days</small><div class="fee">${kes(s.fee)}</div></button>`).join("") + `</div>`;
    app.main.onclick = (e) => { const b = e.target.closest(".svc"); if (b) app.router.go("apply", b.dataset.s); };
  } });
}

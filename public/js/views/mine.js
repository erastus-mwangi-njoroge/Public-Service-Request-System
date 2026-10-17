import { $, esc } from "../core/dom.js";
import { fmt, kes } from "../core/format.js";
import { needLogin } from "../components/needLogin.js";
import { timeline } from "../components/timeline.js";
import { Documents } from "../components/documents.js";

export function register(app) {
  const { api, session, router, main, catalog } = app;
  const docs = new Documents({ api, limits: catalog.limits, refresh: () => render() }); // removing a file redraws this screen
  async function render() {
    if (!session.user) return needLogin(app, "Sign in to see your requests.");
    main.innerHTML = `<h2>My requests</h2><div id="l" class="muted">Loading…</div>`;
    main.onclick = async (e) => {
      if (await docs.onClick(e)) return;
      const b = e.target.closest("[data-pay]"); if (!b) return; b.disabled = true;
      try { const p = await api.post(`/requests/${b.dataset.pay}/pay`); b.insertAdjacentHTML("afterend", `<span class="muted">${esc(p.message)}.</span>`); setTimeout(() => router.current === "mine" && render(), 3000); }
      catch (x) { const m = $(`[data-msg="${b.dataset.pay}"]`); if (m) m.textContent = x.message; b.disabled = false; }
    };
    main.onchange = (e) => docs.onChange(e);
    try {
      const { requests } = await api.get("/requests");
      $("#l").outerHTML = requests.length ? requests.map((r) => `<div class="card"><div class="head"><b>${esc(r.service)}</b> <span class="tag ${r.status}">${r.status}</span></div><div class="muted">${r.ref} · ${fmt(r.createdAt)} · ${kes(r.amount)} ${r.paid ? "paid" : "unpaid"}</div><div class="muted">${esc(r.ward)}, ${esc(r.subCounty)}${r.school ? " · near " + esc(r.school) : ""}</div>${r.status === "Pending payment" ? `<div class="actions"><button class="btn" data-pay="${r.ref}">Pay ${kes(r.amount)} by M-Pesa</button></div>` : ""}${timeline(r)}${docs.html(r, true)}</div>`).join("") : `<div class="info">No requests yet. Pick a service to get started.</div>`;
    } catch (x) { $("#l").textContent = x.message; }
  }
  router.register({ name: "mine", title: "My requests", nav: { label: "My requests", order: 3 }, render });
}

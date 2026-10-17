import { $, esc } from "../core/dom.js";
import { kes } from "../core/format.js";
import { needLogin } from "../components/needLogin.js";
import { td } from "../components/table.js";

const NEXT = { Submitted: "Under review", "Under review": "Approved", Approved: "Completed" };

export function register(app) {
  const { api, session, main, docs } = app;
  async function render() {
    const user = session.user;
    if (!user || user.role === "citizen") return needLogin(app, "This page is for county officers. Sign in with a staff account.");
    main.innerHTML = `<h2>Staff desk${user.dept ? " · " + esc(user.dept) : ""}</h2><div id="l" class="muted">Loading…</div>`;
    try {
      const [{ requests }, s] = await Promise.all([api.get("/requests"), api.get("/stats")]);
      const row = (r) => `<tr>${td("Ref", r.ref)}${td("Service", `${esc(r.service)}<br><span class="muted">${esc(r.details)}</span>`)}` +
        `${td("Applicant", `${esc(r.name)}<br><span class="muted">${esc(r.phone)}</span>`)}` +
        `${td("Location", `${esc(r.ward)}, ${esc(r.subCounty)}<br><span class="muted">Near ${esc(r.school || "n/a")}</span>`)}` +
        `${td("Documents", docs.html(r, false).replace('class="docs"', 'class="docs flat"'))}${td("Status", `<span class="tag ${r.status}">${r.status}</span>`)}` +
        `${td("", NEXT[r.status] ? `<div class="actions" style="margin:0"><button class="btn alt" data-r="${r.ref}" data-to="${NEXT[r.status]}">Move to ${NEXT[r.status].toLowerCase()}</button><button class="btn alt" data-r="${r.ref}" data-to="Rejected">Reject</button></div>` : "")}</tr>`;
      $("#l").outerHTML = `<div class="stats"><div class="stat"><b>${s.total}</b>Requests</div><div class="stat"><b>${s.pending}</b>Pending</div><div class="stat"><b>${s.completed}</b>Completed</div><div class="stat"><b>${kes(s.revenue)}</b>Fees collected</div></div>` +
        (requests.length ? `<div class="tbl stack"><table><thead><tr><th>Ref</th><th>Service</th><th>Applicant</th><th>Location</th><th>Documents</th><th>Status</th><th>Action</th></tr></thead><tbody>${requests.map(row).join("")}</tbody></table></div><div class="err" id="e" role="alert"></div>` : `<div class="info">No paid requests yet.</div>`);
      main.onclick = async (e) => {
        if (await docs.onClick(e)) return;
        const b = e.target.closest("button[data-r]"); if (!b) return; let note = "";
        if (b.dataset.to === "Rejected" && !(note = prompt("Reason for rejection (the applicant will see this)") || "")) return;
        try { await api.patch(`/requests/${b.dataset.r}/status`, { status: b.dataset.to, note }); render(); } catch (x) { $("#e").textContent = x.message; }
      };
    } catch (x) { $("#l").textContent = x.message; }
  }
  app.router.register({ name: "staff", title: "Staff desk", render, nav: { label: "Staff desk", order: 5, visible: (s) => s.isStaff } });
}

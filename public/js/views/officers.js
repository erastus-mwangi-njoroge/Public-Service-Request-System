import { $, esc } from "../core/dom.js";
import { fmtT } from "../core/format.js";
import { onSubmit } from "../core/forms.js";
import { needLogin } from "../components/needLogin.js";
import { td } from "../components/table.js";

export function register(app) {
  const { api, session, main } = app;
  let tab = "staff";

  async function render() {
    if (!session.user || session.user.role !== "admin") return needLogin(app, "This page is for county administrators. Sign in with an admin account.");
    main.innerHTML = `<h2>Officers</h2><div class="seg" role="tablist"><button role="tab" data-t="staff" aria-selected="${tab === "staff"}">Staff accounts</button><button role="tab" data-t="sms" aria-selected="${tab === "sms"}">SMS log</button></div><div id="ot" class="muted">Loading…</div>`;
    document.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
    try { await (tab === "sms" ? smsTab() : staffTab()); } catch (x) { $("#ot").textContent = x.message; }
  }

  async function staffTab(secretHtml = "") {
    const { staff: list, depts } = await api.get("/staff");
    const isMe = (s) => s.username === session.user.idNumber;
    const secretBox = (title, s, pw) => `<div class="info" role="status"><b>${title}</b><p style="margin:6px 0 0">Username: <b>${esc(s.username)}</b><br>Temporary password:</p><div class="secret" id="tp">${esc(pw)}</div><div class="actions" style="margin-top:10px"><button class="btn alt" type="button" data-act="copy">Copy password</button></div><p class="muted" style="margin-bottom:0">Shown once only. Share it securely. They must choose their own password when they first sign in.</p></div>`;
    const form = (s) => `<div class="card"><h3>${s ? "Edit " + esc(s.name) : "Add an officer"}</h3><form id="sf"><label for="sn">Full name</label><input id="sn" autocomplete="off" value="${esc(s && s.name)}">
      ${s ? "" : `<label for="su">Username</label><input id="su" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="e.g. jwanjiru"><p class="muted hint">3 to 20 letters, digits, dot, dash or underscore. Must include a letter.</p>`}
      <div class="row"><div><label for="sr">Role</label><select id="sr" ${s && isMe(s) ? "disabled" : ""}><option value="officer" ${s && s.role === "officer" ? "selected" : ""}>Officer</option><option value="admin" ${s && s.role === "admin" ? "selected" : ""}>Administrator</option></select></div>
      <div id="dw"><label for="sd">Department</label><select id="sd">${depts.map((d) => `<option ${s && s.dept === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></div></div>
      <label for="sp">Phone</label><input id="sp" inputmode="tel" autocomplete="off" placeholder="0712345678" value="${esc(s && s.phone)}"><p class="muted hint">Needed for SMS alerts about new requests and for password reset codes.</p>
      <div class="err" id="se" role="alert"></div><div class="actions"><button class="btn" type="submit">${s ? "Save changes" : "Create account"}</button><button class="btn alt" type="button" id="cx">Cancel</button></div></form></div>`;
    const rows = list.map((s) => `<tr class="${s.active ? "" : "off"}">${td("Name", `<b>${esc(s.name)}</b>${s.mustChange ? `<br><span class="muted">Temporary password</span>` : ""}${isMe(s) ? `<br><span class="muted">You</span>` : ""}`)}${td("Username", esc(s.username))}${td("Role", s.role === "admin" ? "Administrator" : "Officer<br><span class=\"muted\">" + esc(s.dept) + "</span>")}${td("Phone", s.phone ? esc(s.phone) : `<span class="muted">None</span>`)}${td("Status", `<span class="tag ${s.active ? "Completed" : "off"}">${s.active ? "Active" : "Inactive"}</span>`)}${td("", `<div class="actions" style="margin:0"><button class="btn alt" data-act="edit" data-id="${s.id}">Edit</button>${isMe(s) ? "" : `<button class="btn alt" data-act="reset" data-id="${s.id}">Reset password</button><button class="btn alt" data-act="toggle" data-id="${s.id}">${s.active ? "Deactivate" : "Reactivate"}</button>`}</div>`)}</tr>`).join("");
    $("#ot").className = "";
    $("#ot").innerHTML = `${secretHtml}<div id="fm"></div><div class="actions" style="margin:0 0 14px"><button class="btn" data-act="add">Add officer</button></div><div class="tbl stack"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div><div class="err" id="oe" role="alert"></div><p class="muted">Accounts are deactivated rather than deleted so the request history keeps showing who acted on it.</p>`;

    const openForm = (s) => {
      $("#fm").innerHTML = form(s); $("#sn").focus(); $("#fm").scrollIntoView({ block: "nearest" });
      const sync = () => $("#dw").classList.toggle("hide", $("#sr").value === "admin"); $("#sr").onchange = sync; sync();
      $("#cx").onclick = () => ($("#fm").innerHTML = "");
      onSubmit("#sf", "#se", async () => {
        const body = { name: $("#sn").value, phone: $("#sp").value, role: $("#sr").value, dept: $("#sd").value };
        if (s) { await api.patch(`/staff/${s.id}`, body); return staffTab(); }
        body.username = $("#su").value; const j = await api.post("/staff", body);
        return staffTab(secretBox("Account created for " + esc(j.staff.name), j.staff, j.tempPassword));
      });
    };
    main.onclick = async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const s = list.find((x) => x.id === b.dataset.id), act = b.dataset.act; $("#oe").textContent = "";
      try {
        if (act === "add") openForm(null);
        else if (act === "edit") openForm(s);
        else if (act === "copy") { const t = $("#tp").textContent; try { await navigator.clipboard.writeText(t); b.textContent = "Copied"; } catch { const r = document.createRange(); r.selectNodeContents($("#tp")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = "Selected. Press copy."; } }
        else if (act === "reset") {
          if (!confirm(`Reset the password for ${s.name}? Their current password stops working and they are signed out everywhere.`)) return;
          const j = await api.post(`/staff/${s.id}/reset-password`); await staffTab(secretBox("Password reset for " + esc(s.name), s, j.tempPassword));
        } else if (act === "toggle") {
          if (s.active && !confirm(`Deactivate ${s.name}? They are signed out immediately and cannot sign in until reactivated.`)) return;
          await api.patch(`/staff/${s.id}`, { active: !s.active }); await staffTab();
        }
      } catch (x) { $("#oe").textContent = x.message; }
    };
  }

  async function smsTab() {
    const { sms, live } = await api.get("/sms");
    main.onclick = null; $("#ot").className = "";
    $("#ot").innerHTML = (live ? "" : `<div class="info warn" role="status">SMS is in simulation mode. Messages are printed in the server log and not delivered. Set AT_USERNAME and AT_API_KEY to send real SMS.</div>`) +
      (sms.length ? `<div class="tbl stack"><table><thead><tr><th>Time</th><th>To</th><th>Type</th><th>Message</th><th>Status</th></tr></thead><tbody>` + sms.map((m) => `<tr>${td("Time", fmtT(m.at))}${td("To", esc(m.to))}${td("Type", esc(m.kind))}${td("Message", esc(m.text))}${td("Status", `<span class="tag ${/^failed/.test(m.status) ? "Rejected" : m.status === "sent" ? "Completed" : ""}">${esc(m.status)}</span>`)}</tr>`).join("") + `</tbody></table></div><p class="muted">Latest 100 messages. Phone numbers are partly hidden and reset codes are never recorded.</p>` : `<div class="info">No messages sent yet.</div>`);
  }
  app.router.register({ name: "officers", title: "Officers", render, nav: { label: "Officers", order: 6, visible: (s) => s.isAdmin } });
}

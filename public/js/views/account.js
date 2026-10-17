import { $, esc } from "../core/dom.js";
import { onSubmit } from "../core/forms.js";
import { needLogin } from "../components/needLogin.js";

export function register(app) {
  const { api, session, main } = app;
  app.router.register({ name: "account", title: "My account", render() {
    const user = session.user; if (!user) return needLogin(app, "Sign in to see your account.");
    const staff = user.role !== "citizen";
    main.innerHTML = `<h2>My account</h2>${user.mustChange ? `<div class="info warn" id="mc" role="status">Your password was set by an administrator. Please choose your own password now.</div>` : ""}
    <div class="card"><dl class="kv"><dt>Name</dt><dd>${esc(user.name)}</dd><dt>${staff ? "Username" : "National ID"}</dt><dd>${esc(user.idNumber)}</dd>${user.dept ? `<dt>Department</dt><dd>${esc(user.dept)}</dd>` : ""}<dt>Phone</dt><dd>${user.phone ? esc(user.phone) : "Not set"}</dd></dl>
    <p class="muted" style="margin-bottom:0">${user.phone ? "SMS alerts and password reset codes are sent to this number." : "No phone number on file, so you will not get SMS alerts or reset codes. Ask an administrator to add one."}</p></div>
    <h2>Change password</h2><div class="card"><form id="pf"><label for="pc">Current password</label><input id="pc" type="password" autocomplete="current-password"><label for="pn">New password (8+ characters)</label><input id="pn" type="password" autocomplete="new-password"><label for="pn2">Repeat new password</label><input id="pn2" type="password" autocomplete="new-password"><div class="err" id="e" role="alert"></div><div class="ok-msg" id="o" role="status"></div><button class="btn" type="submit">Change password</button></form></div>`;
    onSubmit("#pf", "#e", async () => {
      $("#o").textContent = "";
      if ($("#pn").value !== $("#pn2").value) throw new Error("The two new passwords do not match");
      const j = await api.post("/auth/change-password", { current: $("#pc").value, password: $("#pn").value });
      session.set(j); $("#pf").reset(); const mc = $("#mc"); if (mc) mc.remove(); $("#o").textContent = "Password changed. Other devices have been signed out.";
    });
  } });
}

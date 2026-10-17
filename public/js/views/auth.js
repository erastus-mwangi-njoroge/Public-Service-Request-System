import { $, esc } from "../core/dom.js";
import { onSubmit } from "../core/forms.js";

export function register(app) {
  const { api, session, router, main } = app;
  const signedIn = (j) => { session.set(j); router.go(j.user.mustChange ? "account" : j.user.role === "citizen" ? "apply" : "staff"); };

  router.register({ name: "auth", title: "Sign in", render() {
    main.innerHTML = `<h2>Sign in</h2><div class="card"><form id="lf"><label for="i">National ID number or staff username</label><input id="i" autocomplete="username" autocapitalize="none" spellcheck="false"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password"><div class="err" id="e" role="alert"></div><div class="actions"><button class="btn" type="submit">Sign in</button><button class="link" type="button" id="fp">Forgot password?</button><button class="link" type="button" id="ca">Create an account</button></div></form></div>`;
    onSubmit("#lf", "#e", async () => signedIn(await api.post("/auth/login", { idNumber: $("#i").value, password: $("#p").value })));
    $("#fp").onclick = () => router.go("forgot", $("#i").value.trim() || null);
    $("#ca").onclick = () => router.go("register");
  } });

  router.register({ name: "register", title: "Create an account", render() {
    main.innerHTML = `<h2>Create an account</h2><div class="card"><form id="rf"><label for="rn">Full name</label><input id="rn" autocomplete="name"><div class="row"><div><label for="ri">National ID number</label><input id="ri" inputmode="numeric" autocomplete="off"></div><div><label for="rp">M-Pesa phone</label><input id="rp" inputmode="tel" autocomplete="tel" placeholder="0712345678"></div></div><label for="rw">Password (8+ characters)</label><input id="rw" type="password" autocomplete="new-password"><p class="muted hint">We send SMS updates about your requests, and password reset codes, to this phone.</p><div class="err" id="re" role="alert"></div><div class="actions"><button class="btn" type="submit">Create account</button><button class="link" type="button" id="si">Already have an account? Sign in</button></div></form></div>`;
    onSubmit("#rf", "#re", async () => signedIn(await api.post("/auth/register", { name: $("#rn").value, idNumber: $("#ri").value, phone: $("#rp").value, password: $("#rw").value })));
    $("#si").onclick = () => router.go("auth");
  } });

  router.register({ name: "forgot", title: "Reset password", render(arg) {
    main.innerHTML = `<h2>Reset your password</h2><div class="card">
    <form id="f1"><p class="muted" style="margin-top:0">Enter your National ID number (or staff username). We will text a 6-digit code to the phone number on the account.</p><label for="fi">National ID number or staff username</label><input id="fi" autocomplete="username" autocapitalize="none" value="${esc(arg || "")}"><div class="err" id="e1" role="alert"></div><button class="btn" type="submit">Send code</button></form>
    <form id="f2" class="hide"><div class="info" id="m" role="status"></div><label for="fc">6-digit code</label><input id="fc" inputmode="numeric" autocomplete="one-time-code" maxlength="6"><label for="fw">New password (8+ characters)</label><input id="fw" type="password" autocomplete="new-password"><label for="fw2">Repeat new password</label><input id="fw2" type="password" autocomplete="new-password"><div class="err" id="e2" role="alert"></div><div class="actions"><button class="btn" type="submit">Change password</button><button class="link" type="button" id="rs">Send a new code</button></div></form></div>
    <p><button class="link" id="back">Back to sign in</button></p>`;
    $("#back").onclick = () => router.go("auth");
    const rs = $("#rs"); let timer;
    const cooldown = () => { let t = 60; clearInterval(timer); const tick = () => { if (!document.body.contains(rs)) return clearInterval(timer); rs.disabled = t > 0; rs.textContent = t > 0 ? `Send a new code (${t}s)` : "Send a new code"; if (t-- <= 0) clearInterval(timer); }; tick(); timer = setInterval(tick, 1000); };
    const send = async () => { const j = await api.post("/auth/forgot", { idNumber: $("#fi").value }); $("#m").textContent = j.message; $("#f2").classList.remove("hide"); $("#fc").focus(); cooldown(); };
    onSubmit("#f1", "#e1", send);
    rs.onclick = () => send().catch((x) => ($("#e2").textContent = x.message));
    onSubmit("#f2", "#e2", async () => {
      if ($("#fw").value !== $("#fw2").value) throw new Error("The two passwords do not match");
      const j = await api.post("/auth/reset", { idNumber: $("#fi").value, code: $("#fc").value, password: $("#fw").value });
      clearInterval(timer); main.innerHTML = `<h2>Password changed</h2><div class="card"><div class="info" role="status">${esc(j.message)}</div><button class="btn" id="gl">Sign in</button></div>`; $("#gl").onclick = () => router.go("auth");
    });
  } });
}

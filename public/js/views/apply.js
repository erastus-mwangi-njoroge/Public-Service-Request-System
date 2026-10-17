import { $, esc } from "../core/dom.js";
import { kes, kb } from "../core/format.js";
import { onSubmit } from "../core/forms.js";
import { needLogin } from "../components/needLogin.js";
import { LocationPicker } from "../components/locationPicker.js";
import { ACCEPT } from "../components/documents.js";

export function register(app) {
  const { api, session, router, main, catalog } = app;
  router.register({ name: "apply", title: "Apply", nav: { label: "Apply", order: 2 }, render(pre) {
    const user = session.user;
    if (!user) return needLogin(app, "Sign in with your National ID to apply. Your requests stay linked to your account.");
    if (user.role !== "citizen") return (main.innerHTML = `<h2>Apply</h2><div class="info">Staff accounts cannot apply. Use the Staff desk.</div>`);
    const L = catalog.limits;
    main.innerHTML = `<h2>Apply for a service</h2><div class="card"><form id="af"><label for="s">Service</label><select id="s">${catalog.services.map((s) => `<option value="${s.id}" ${s.id === pre ? "selected" : ""}>${s.name}</option>`).join("")}</select><div class="info" id="inf"></div>
    <div id="loc"></div>
    <label for="d">Details of your request</label><textarea id="d" rows="3" placeholder="Plot number, business name, or what you need"></textarea>
    <label for="f">Supporting documents (optional)</label><input id="f" type="file" multiple accept="${ACCEPT}"><p class="muted hint">PDF, JPG or PNG, up to ${L.maxUploadMB} MB each, ${L.maxDocs} files at most. You can also add them later under My requests.</p><ul class="flist" id="fl"></ul>
    <p class="muted">Applying as ${esc(user.name)}. The fee prompt goes to ${esc(user.phone)}.</p><div class="err" id="e" role="alert"></div><button class="btn" type="submit" id="go">Submit and pay by M-Pesa</button></form></div>`;

    const picker = new LocationPicker({ api, locations: catalog.locations, root: $("#loc") }); picker.render();
    const info = () => { const s = catalog.services.find((x) => x.id === $("#s").value); $("#inf").innerHTML = `Fee: <b>${kes(s.fee)}</b>. Processing: ${s.days} working days.<br>You will need: ${esc(s.docs)}.`; };
    $("#s").onchange = info; info();
    const problems = () => [...$("#f").files].map((f) => ({ f, p: app.docs.problem(f) }));
    $("#f").onchange = () => { $("#fl").innerHTML = problems().map(({ f, p }) => `<li class="${p ? "bad" : ""}">${esc(f.name)} <span class="muted">${p ? "· " + p : "· " + kb(f.size)}</span></li>`).join(""); };

    onSubmit("#af", "#e", async () => {
      const place = picker.value(); // throws a friendly message if something is missing
      const files = [...$("#f").files], bad = problems().filter((x) => x.p);
      if (bad.length) throw new Error(`Fix or remove: ${bad.map((x) => `${x.f.name} ${x.p}`).join("; ")}. Choose your files again.`);
      if (files.length > L.maxDocs) throw new Error(`Please attach at most ${L.maxDocs} files`);
      const b = $("#go"); let ref = "";
      try {
        const { request, amount } = await api.post("/requests", { serviceId: $("#s").value, ...place, details: $("#d").value });
        ref = request.ref;
        const fails = files.length ? await app.docs.uploadAll(ref, files, (i, n) => (b.textContent = `Uploading file ${i} of ${n}…`)) : [];
        const warn = fails.length ? `<div class="info warn" role="status">${fails.length} file${fails.length > 1 ? "s" : ""} could not be uploaded (${esc(fails.map((f) => f.name).join(", "))}). You can add ${fails.length > 1 ? "them" : "it"} under My requests.</div>` : "";
        b.textContent = "Starting payment…";
        const p = await api.post(`/requests/${ref}/pay`);
        main.innerHTML = `<h2>Complete payment</h2><div class="card"><div class="muted">Reference number</div><div class="ref">${ref}</div><p>${esc(p.message)}. Amount: <b>${kes(amount)}</b>.</p>${warn}<div class="info" id="st">Waiting for payment…</div></div>`;
        for (let i = 0; i < 40; i++) {
          if (i) await new Promise((r) => setTimeout(r, 3000)); else await new Promise((r) => setTimeout(r, 800));
          if (router.current !== "apply") return;
          const t = await api.get("/track/" + ref);
          if (t.request.paid) { main.innerHTML = `<h2>Request received</h2><div class="card"><div class="ref">${ref}</div><p>Payment confirmed. We will text you at each step. Keep this number to track your request.</p>${warn}<div class="actions"><button class="btn" id="t">Track this request</button></div></div>`; $("#t").onclick = () => router.go("track", ref); return; }
        }
        $("#st").textContent = "Still waiting. If you paid, it will show under My requests shortly.";
      } catch (x) {
        if (ref) throw new Error(`Your request ${ref} was saved, but: ${x.message}. Open My requests to pay for it.`);
        throw x;
      } finally { const g = $("#go"); if (g) g.textContent = "Submit and pay by M-Pesa"; }
    });
  } });
}

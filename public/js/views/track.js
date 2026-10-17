import { $, esc } from "../core/dom.js";
import { timeline } from "../components/timeline.js";

export function register(app) {
  const { api, router, main } = app;
  router.register({ name: "track", title: "Track a request", nav: { label: "Track", order: 4 }, render(arg) {
    main.innerHTML = `<h2>Track a request</h2><div class="card"><form id="tf"><label for="r">Reference number</label><input id="r" placeholder="MGA-2026-1234" autocapitalize="characters" autocomplete="off" value="${esc(arg || "")}"><div class="actions"><button class="btn" type="submit">Check status</button></div></form><div id="o"></div></div>`;
    const run = async () => {
      try {
        const { request: r } = await api.get("/track/" + encodeURIComponent($("#r").value.trim()));
        $("#o").innerHTML = `<p><b>${esc(r.service)}</b> <span class="tag ${r.status}">${r.status}</span><br><span class="muted">${esc(r.ward ? r.ward + ", " : "")}${esc(r.subCounty)}</span></p>${timeline(r)}`;
      } catch (x) { $("#o").innerHTML = `<div class="err" role="alert">${esc(x.message)}</div>`; }
    };
    $("#tf").onsubmit = (e) => { e.preventDefault(); run(); }; if (arg) run();
  } });
}

import { esc } from "../core/dom.js";
import { fmt } from "../core/format.js";
export const timeline = (r) => `<ul class="steps">` + r.history.map((h) => `<li class="${h.status === "Rejected" ? "bad" : ""}"><b>${h.status}</b> <span class="muted">· ${fmt(h.at)}</span>${h.note ? `<br><span class="muted">${esc(h.note)}</span>` : ""}</li>`).join("") + `</ul>`;

import { $, esc } from "../core/dom.js";
import { kb } from "../core/format.js";
import { CLOSED } from "./status.js";

export const ACCEPT = "application/pdf,image/jpeg,image/png";
const say = (ref, t) => { const m = $(`[data-msg="${ref}"]`); if (m) m.textContent = t; };

export class Documents {
  constructor({ api, limits, refresh }) { Object.assign(this, { api, limits, refresh }); }

  problem(f) {
    return !f.size ? "is empty"
      : f.size > this.limits.maxUploadMB * 1048576 ? `is over ${this.limits.maxUploadMB} MB`
      : !/\.(pdf|jpe?g|png)$/i.test(f.name) && !/^(application\/pdf|image\/(jpeg|png))$/.test(f.type) ? "must be a PDF, JPG or PNG" : "";
  }

  async uploadAll(ref, files, progress) {
    const fails = [];
    for (let i = 0; i < files.length; i++) { progress && progress(i + 1, files.length); try { await this.api.uploadDocument(ref, files[i]); } catch (x) { fails.push({ name: files[i].name, msg: x.message }); } }
    return fails;
  }

  // Documents block for a request. own = the applicant's view (can add or remove); otherwise read-only for staff.
  html(r, own) {
    const open = !CLOSED.includes(r.status), canRemove = own && ["Pending payment", "Submitted"].includes(r.status), n = r.documents.length;
    return `<div class="docs">${own ? `<b>Documents</b> <span class="muted">${n ? "(" + n + ")" : ""}</span>` : ""}` +
      (n ? `<ul>` + r.documents.map((d) => `<li><button type="button" class="link" data-dl="${d.id}" data-ref="${r.ref}" data-n="${esc(d.name)}">${esc(d.name)}</button><span class="muted">${kb(d.size)}</span>${canRemove ? `<button type="button" class="link bad" data-rm="${d.id}" data-ref="${r.ref}">Remove</button>` : ""}</li>`).join("") + `</ul>` : `<div class="muted">${own ? "None attached yet." : "None attached."}</div>`) +
      (own && open && n < this.limits.maxDocs ? `<div class="actions"><label class="btn alt filebtn">Add documents<input type="file" multiple accept="${ACCEPT}" data-up="1" data-ref="${r.ref}"></label><span class="muted">PDF, JPG or PNG, up to ${this.limits.maxUploadMB} MB each</span></div>` : "") +
      `<div class="dmsg" role="alert" data-msg="${r.ref}"></div></div>`;
  }

  async onClick(e) { // download / remove buttons; returns true when the click was one of ours
    const dl = e.target.closest("[data-dl]"), rm = e.target.closest("[data-rm]"); if (!dl && !rm) return false;
    const b = dl || rm;
    try {
      if (dl) await this.api.downloadDocument(b.dataset.ref, b.dataset.dl, b.dataset.n);
      else if (confirm("Remove this document?")) { await this.api.delete(`/requests/${b.dataset.ref}/documents/${b.dataset.rm}`); await this.refresh(); }
    } catch (x) { say(b.dataset.ref, x.message); }
    return true;
  }

  async onChange(e) { // "Add documents" on an existing request
    const inp = e.target.closest("input[data-up]"); if (!inp) return;
    const ref = inp.dataset.ref, files = [...inp.files]; inp.value = ""; if (!files.length) return;
    const bad = files.map((f) => ({ f, p: this.problem(f) })).filter((x) => x.p);
    if (bad.length) return say(ref, bad.map((x) => `${x.f.name} ${x.p}`).join(". ") + ".");
    const fails = await this.uploadAll(ref, files, (i, n) => say(ref, `Uploading ${i} of ${n}…`));
    await this.refresh();
    if (fails.length) say(ref, fails.map((f) => `${f.name}: ${f.msg}`).join(". "));
  }
}

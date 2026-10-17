const crypto = require("crypto");
const { HttpError } = require("../domain/errors");
const { CLOSED } = require("../domain/statusWorkflow");

// Trust the file's own bytes, never the name or declared type.
const sniff = (b) =>
  b.subarray(0, 4).toString("latin1") === "%PDF" ? ["application/pdf", "pdf"]
  : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? ["image/jpeg", "jpg"]
  : b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? ["image/png", "png"] : null;

class DocumentService {
  constructor({ requests, storage, services, maxBytes, maxDocs }) { Object.assign(this, { requests, storage, services, maxBytes, maxDocs }); }

  // Owner of the request, or staff in its department (admins: all).
  async access(user, ref) {
    const r = await this.requests.findByRef(String(ref).toUpperCase());
    const owner = !!r && r.userId === user.id;
    const staffOk = !!r && ["officer", "admin"].includes(user.role) && (user.role === "admin" || r.dept === user.dept);
    if (!r || !(owner || staffOk)) throw new HttpError(404, "Request not found");
    return { r, owner };
  }

  // readBody is called only after the cheap checks pass, so oversized or forbidden uploads are refused early.
  async upload(user, ref, { contentLength, fileName, readBody }) {
    const { r, owner } = await this.access(user, ref);
    if (!owner || user.role !== "citizen") throw new HttpError(403, "Only the applicant can add documents");
    if (CLOSED.includes(r.status)) throw new HttpError(409, "This request is closed");
    const limitMsg = `You can attach up to ${this.maxDocs} documents`;
    if ((r.documents || []).length >= this.maxDocs) throw new HttpError(409, limitMsg);
    if (contentLength > this.maxBytes) throw new HttpError(413, `File is too large (limit ${this.maxBytes / 1048576} MB)`);
    const buf = await readBody(this.maxBytes);
    if (!buf.length) throw new HttpError(400, "The file is empty");
    const kind = sniff(buf); if (!kind) throw new HttpError(415, "Only PDF, JPG or PNG files are accepted");
    let name = ""; try { name = decodeURIComponent(fileName || ""); } catch {}
    name = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(-100) || "document";
    if (!/\.(pdf|jpe?g|png)$/i.test(name)) name += "." + kind[1];
    const d = { id: crypto.randomUUID(), name, type: kind[0], size: buf.length, at: new Date().toISOString(), by: user.idNumber };
    await this.storage.put(d.id, buf, d.type);
    try {
      await this.requests.update(r.ref, (x) => { // re-checked atomically: two parallel uploads cannot exceed the limit
        x.documents ||= []; if (x.documents.length >= this.maxDocs) throw new HttpError(409, limitMsg); x.documents.push(d);
      });
    } catch (e) { await this.storage.remove(d.id); throw e; }
    return { document: d };
  }

  async download(user, ref, id) {
    const { r } = await this.access(user, ref);
    const d = (r.documents || []).find((x) => x.id === id), buf = d && await this.storage.read(d.id);
    if (!d || !buf) throw new HttpError(404, "Document not found");
    return { doc: d, buf };
  }

  async remove(user, ref, id) {
    const { r, owner } = await this.access(user, ref);
    if (!owner || user.role !== "citizen") throw new HttpError(403, "Only the applicant can remove documents");
    const d = (r.documents || []).find((x) => x.id === id); if (!d) throw new HttpError(404, "Document not found");
    if (!["Pending payment", "Submitted"].includes(r.status)) throw new HttpError(409, "Documents can't be removed once review has started");
    await this.requests.update(r.ref, (x) => { x.documents = (x.documents || []).filter((y) => y.id !== id); });
    await this.storage.remove(d.id);
    return { ok: true };
  }
}
module.exports = { DocumentService, sniff };

// The only module that talks to the server. Knows nothing about screens.
export class ApiClient {
  constructor({ getToken, onUnauthorized }) { this.getToken = getToken; this.onUnauthorized = onUnauthorized; }

  auth() { const t = this.getToken(); return t ? { Authorization: "Bearer " + t } : {}; }

  async request(path, { method = "GET", body } = {}) {
    const r = await fetch("/api" + path, { method, headers: { "Content-Type": "application/json", ...this.auth() }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status === 401 && this.getToken()) this.onUnauthorized(); throw new Error(j.error || "Request failed"); }
    return j;
  }
  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: "POST", body }); }
  patch(path, body) { return this.request(path, { method: "PATCH", body }); }
  delete(path) { return this.request(path, { method: "DELETE" }); }

  async uploadDocument(ref, file) { // raw bytes in the body; the server checks the real file type
    const r = await fetch(`/api/requests/${encodeURIComponent(ref)}/documents`, { method: "POST", headers: { ...this.auth(), "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Upload failed");
    return j.document;
  }
  async downloadDocument(ref, id, name) {
    const r = await fetch(`/api/requests/${encodeURIComponent(ref)}/documents/${id}`, { headers: this.auth() });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Download failed");
    const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}
